import * as THREE from 'three';
import { MazeGenerator, Cell } from './maze';

export class MazeScene {
  private scene: THREE.Scene;
  private mainCamera: THREE.PerspectiveCamera;
  private miniMapCamera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private animationFrameId: number | null = null;

  // Initialize properties with default values
  private currentPosition: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private currentRotation: number = 0;
  private maze: Cell[][] = [];

  // Initialize position indicator with non-null assertion
  private positionIndicator!: THREE.Mesh;

  // Add new properties for animation
  private isMoving: boolean = false;
  private targetPosition: THREE.Vector3 = new THREE.Vector3();
  private moveStartPosition: THREE.Vector3 = new THREE.Vector3();
  private moveProgress: number = 0;
  private readonly MOVE_DURATION: number = 500; // Duration in milliseconds
  private moveStartTime: number = 0;

  // Add new properties for rotation animation
  private isRotating: boolean = false;
  private targetRotation: number = 0;
  private rotationStartTime: number = 0;
  private rotationStartAngle: number = 0;
  private readonly ROTATION_DURATION: number = 300; // Duration in milliseconds

  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000); // Add black background
    
    // Main (first-person) camera
    this.mainCamera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
    
    // Mini-map camera (overhead view)
    this.miniMapCamera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    this.miniMapCamera.position.set(0, 16, 16);
    this.miniMapCamera.lookAt(0, 0, 0);
    
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.autoClear = false;
    this.renderer.setPixelRatio(window.devicePixelRatio);
    document.body.appendChild(this.renderer.domElement);
    
    const ambientLight = new THREE.AmbientLight(0x404040);
    this.scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(0, 50, 0);
    this.scene.add(directionalLight);

    // Create control buttons
    this.createControlButtons();
    
    // Create compass indicator
    this.createCompassIndicator();

    // Create position indicator for minimap
    this.createPositionIndicator();

    // Create and render the maze
    this.createMaze();

    // Add keyboard event listener
    window.addEventListener('keydown', this.handleKeyDown.bind(this));
    
    window.addEventListener('resize', this.handleResize.bind(this));
    this.animate();
  }

  private createControlButtons() {
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 20px;
      display: grid;
      grid-template-areas:
        ". up ."
        "left . right"
        ". down .";
      gap: 10px;
      z-index: 1000;
    `;

    const createButton = (text: string, gridArea: string, onClick: () => void) => {
      const button = document.createElement('button');
      button.textContent = text;
      button.style.cssText = `
        grid-area: ${gridArea};
        width: 50px;
        height: 50px;
        border: none;
        border-radius: 25px;
        background-color: rgba(255, 255, 255, 0.7);
        cursor: pointer;
        font-size: 20px;
        font-weight: bold;
        &:hover {
          background-color: rgba(255, 255, 255, 0.9);
        }
      `;
      button.addEventListener('click', onClick);
      return button;
    };

    // Create the buttons with arrow symbols
    buttonContainer.appendChild(createButton('↑', 'up', () => this.moveForward()));
    buttonContainer.appendChild(createButton('←', 'left', () => this.rotateLeft()));
    buttonContainer.appendChild(createButton('→', 'right', () => this.rotateRight()));
    buttonContainer.appendChild(createButton('↓', 'down', () => this.moveBackward()));

    document.body.appendChild(buttonContainer);
  }

  private createCompassIndicator() {
    const compass = document.createElement('div');
    compass.style.cssText = `
        position: fixed;
        top: 20px;
        left: 20px;
        width: 40px;
        height: 40px;
        background-color: rgba(255, 255, 255, 0.7);
        border-radius: 20px;
        display: flex;
        justify-content: center;
        align-items: center;
        font-size: 24px;
        font-weight: bold;
        z-index: 1000;
    `;
    compass.id = 'compass';
    document.body.appendChild(compass);
    this.updateCompassDirection(this.currentRotation);
  }

  private updateCompassDirection(rotation: number) {
    const compass = document.getElementById('compass');
    if (!compass) return;

    // Normalize rotation to 0-2π range
    const normalizedRotation = ((rotation % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    
    // Determine direction based on rotation
    let direction = 'N';
    if (Math.abs(normalizedRotation - 0) < 0.1) direction = 'N';
    else if (Math.abs(normalizedRotation - Math.PI) < 0.1) direction = 'S';
    else if (Math.abs(normalizedRotation - Math.PI/2) < 0.1) direction = 'W';
    else if (Math.abs(normalizedRotation - (3 * Math.PI/2)) < 0.1) direction = 'E';
    
    compass.textContent = direction;
  }

  private createPositionIndicator() {
    // Create a triangle shape
    const shape = new THREE.Shape();
    shape.moveTo(0, 0.25);      // Point forward (along Z axis)
    shape.lineTo(-0.15, -0.15); // Back left
    shape.lineTo(0.15, -0.15);  // Back right
    shape.lineTo(0, 0.25);      // Back to front

    const geometry = new THREE.ShapeGeometry(shape);
    const material = new THREE.MeshBasicMaterial({ 
        color: 0xffff00,  // Changed to yellow
        side: THREE.DoubleSide 
    });

    this.positionIndicator = new THREE.Mesh(geometry, material);
    this.positionIndicator.rotation.x = -Math.PI / 2;  // Lay flat on floor
    this.positionIndicator.position.y = 0.02;  // Slightly above floor
    this.scene.add(this.positionIndicator);
  }

  private updatePositionIndicator() {
    // Update position
    this.positionIndicator.position.x = this.currentPosition.x;
    this.positionIndicator.position.z = this.currentPosition.z;
    
    // Update rotation (remove the 90-degree offset)
    this.positionIndicator.rotation.y = -this.currentRotation;
  }

  private createMaze() {
    const mazeGen = new MazeGenerator(8);
    const { grid: maze, centerDeadEnd, farthestDeadEnd } = mazeGen.generate();
    this.maze = maze;

    // Create base floor
    const floorGeometry = new THREE.PlaneGeometry(16, 16);
    const floorMaterial = new THREE.MeshPhongMaterial({ color: 0xCCCCCC }); // Lighter grey
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    this.scene.add(floor);

    // Create individual floor tiles
    const tileGeometry = new THREE.PlaneGeometry(2, 2);
    
    maze.forEach((row, x) => {
      row.forEach((cell, y) => {
        const worldX = x * 2 - 7;
        const worldZ = y * 2 - 7;

        // Count number of walls to identify dead ends
        const wallCount = Object.values(cell.walls).filter(wall => wall).length;
        if (wallCount === 3) { // This is a dead end
          let tileColor = 0xff0000; // Default red for normal dead ends
          
          // Special dead end colors
          if (x === centerDeadEnd.x && y === centerDeadEnd.y) {
            tileColor = 0x0000ff; // Blue for center-most dead end
          } else if (x === farthestDeadEnd.x && y === farthestDeadEnd.y) {
            tileColor = 0x00ff00; // Green for farthest dead end
          }
          
          const deadEndMaterial = new THREE.MeshPhongMaterial({ color: tileColor });
          const deadEndTile = new THREE.Mesh(tileGeometry, deadEndMaterial);
          deadEndTile.rotation.x = -Math.PI / 2;
          deadEndTile.position.set(worldX, 0.01, worldZ);
          this.scene.add(deadEndTile);
        }

        // Create walls
        if (cell.walls.north) {
          this.createWall(worldX, worldZ - 1, true);
        }
        if (cell.walls.south) {
          this.createWall(worldX, worldZ + 1, true);
        }
        if (cell.walls.east) {
          this.createWall(worldX + 1, worldZ, false);
        }
        if (cell.walls.west) {
          this.createWall(worldX - 1, worldZ, false);
        }
      });
    });

    // Position main camera at the blue tile (center-most dead end)
    const worldX = centerDeadEnd.x * 2 - 7;
    const worldZ = centerDeadEnd.y * 2 - 7;
    this.mainCamera.position.set(worldX, 0.5, worldZ);

    // Find the direction WITHOUT walls (the open path)
    const cell = maze[centerDeadEnd.x][centerDeadEnd.y];
    const direction = this.getOpenDirection(cell);
    
    // Set initial rotation
    this.currentRotation = direction;
    this.mainCamera.rotation.y = direction;
    
    // Store initial position
    this.currentPosition = new THREE.Vector3(worldX, 0.5, worldZ);
    
    // Update both indicators with initial direction
    this.updateCompassDirection(direction);
    this.updatePositionIndicator();
  }

  private createWall(x: number, z: number, isNorthSouth: boolean) {
    const wallGeometry = new THREE.BoxGeometry(
      isNorthSouth ? 2 : 0.1,
      1,
      isNorthSouth ? 0.1 : 2
    );
    const wallMaterial = new THREE.MeshPhongMaterial({ color: 0x808080 }); // Keep walls the same grey
    const wall = new THREE.Mesh(wallGeometry, wallMaterial);
    wall.position.set(x, 0.5, z);
    this.scene.add(wall);
  }

  private getOpenDirection(cell: Cell): number {
    // Return the direction of the open path (the side WITHOUT a wall)
    if (cell.walls.north === false) return 0;          // Face north when north is open
    if (cell.walls.south === false) return Math.PI;    // Face south when south is open
    if (cell.walls.east === false) return -Math.PI/2;  // Face east when east is open
    if (cell.walls.west === false) return Math.PI/2;   // Face west when west is open
    return 0; // Fallback, shouldn't happen in a dead end
  }

  private handleResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    this.mainCamera.aspect = width / height;
    this.mainCamera.updateProjectionMatrix();
    
    this.renderer.setSize(width, height);
  }

  private animate() {
    this.animationFrameId = requestAnimationFrame(this.animate.bind(this));
    
    // Update movement animation
    if (this.isMoving) {
      const currentTime = performance.now();
      const elapsed = currentTime - this.moveStartTime;
      this.moveProgress = Math.min(elapsed / this.MOVE_DURATION, 1);

      if (this.moveProgress < 1) {
        // Interpolate position
        this.currentPosition.lerpVectors(
          this.moveStartPosition,
          this.targetPosition,
          this.moveProgress
        );
        this.mainCamera.position.copy(this.currentPosition);
        this.updatePositionIndicator();
      } else {
        // Animation complete
        this.isMoving = false;
        this.currentPosition.copy(this.targetPosition);
        this.mainCamera.position.copy(this.targetPosition);
        this.updatePositionIndicator();
      }
    }

    // Update rotation animation
    if (this.isRotating) {
      const currentTime = performance.now();
      const elapsed = currentTime - this.rotationStartTime;
      const progress = Math.min(elapsed / this.ROTATION_DURATION, 1);

      if (progress < 1) {
        // Interpolate rotation
        this.currentRotation = this.rotationStartAngle + 
          (this.targetRotation - this.rotationStartAngle) * progress;
        this.mainCamera.rotation.y = this.currentRotation;
        this.updateCompassDirection(this.currentRotation);
        this.updatePositionIndicator();
      } else {
        // Animation complete
        this.isRotating = false;
        this.currentRotation = this.targetRotation;
        this.mainCamera.rotation.y = this.currentRotation;
        this.updateCompassDirection(this.currentRotation);
        this.updatePositionIndicator();
      }
    }
    
    // Clear everything
    this.renderer.clear();
    this.renderer.clearDepth();
    
    // Render main view (full screen)
    this.renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
    this.renderer.setScissorTest(false);
    this.renderer.render(this.scene, this.mainCamera);

    // Render mini-map view (bottom-right corner)
    const minimapSize = Math.min(window.innerWidth, window.innerHeight) * 0.3;
    const padding = 10;
    
    // Set viewport and scissor for minimap
    const vpX = window.innerWidth - minimapSize - padding;
    const vpY = padding;
    
    this.renderer.setViewport(vpX, vpY, minimapSize, minimapSize);
    this.renderer.setScissor(vpX, vpY, minimapSize, minimapSize);
    this.renderer.setScissorTest(true);
    
    this.renderer.render(this.scene, this.miniMapCamera);
  }

  public dispose() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    
    // Remove both event listeners
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('keydown', this.handleKeyDown);
    
    this.scene.traverse((object: THREE.Object3D) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        if (object.material instanceof THREE.Material) {
          object.material.dispose();
        }
      }
    });
    
    this.renderer.dispose();
    document.body.removeChild(this.renderer.domElement);
  }

  public getScene() { return this.scene; }
  public getMainCamera() { return this.mainCamera; }
  public getMiniMapCamera() { return this.miniMapCamera; }

  private startRotation(angle: number) {
    if (this.isRotating) return; // Don't start new rotation if already rotating
    
    this.isRotating = true;
    this.rotationStartTime = performance.now();
    this.rotationStartAngle = this.currentRotation;
    this.targetRotation = this.currentRotation + angle;
  }

  private rotateLeft() {
    if (this.isRotating) return; // Don't start new rotation if already rotating
    this.startRotation(Math.PI/2);
  }

  private rotateRight() {
    if (this.isRotating) return; // Don't start new rotation if already rotating
    this.startRotation(-Math.PI/2);
  }

  private canMove(newPosition: THREE.Vector3, direction: 'north' | 'south' | 'east' | 'west'): boolean {
    // Convert world position to grid coordinates
    const gridX = Math.round((this.currentPosition.x + 7) / 2);
    const gridZ = Math.round((this.currentPosition.z + 7) / 2);
    
    // Check if current position is within bounds
    if (gridX < 0 || gridX >= 8 || gridZ < 0 || gridZ >= 8) {
        return false;
    }

    // Get current cell
    const currentCell = this.maze[gridX][gridZ];

    // Check if there's a wall in the movement direction
    switch (direction) {
        case 'north': return !currentCell.walls.north;
        case 'south': return !currentCell.walls.south;
        case 'east': return !currentCell.walls.east;
        case 'west': return !currentCell.walls.west;
    }
  }

  private startMovement(newPosition: THREE.Vector3) {
    if (this.isMoving) return; // Don't start new movement if already moving
    
    this.isMoving = true;
    this.moveStartTime = performance.now();
    this.moveProgress = 0;
    this.moveStartPosition.copy(this.currentPosition);
    this.targetPosition.copy(newPosition);
  }

  private moveForward() {
    if (this.isMoving) return; // Don't start new movement if already moving

    const normalizedRotation = ((this.currentRotation % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const newPosition = this.currentPosition.clone();
    const moveDistance = 2;

    let direction: 'north' | 'south' | 'east' | 'west';
    let canMove = false;
    
    if (Math.abs(normalizedRotation - 0) < 0.1) {
        direction = 'north';
        if (this.canMove(newPosition, direction)) {
            newPosition.z -= moveDistance;
            canMove = true;
        }
    } else if (Math.abs(normalizedRotation - Math.PI) < 0.1) {
        direction = 'south';
        if (this.canMove(newPosition, direction)) {
            newPosition.z += moveDistance;
            canMove = true;
        }
    } else if (Math.abs(normalizedRotation - Math.PI/2) < 0.1) {
        direction = 'west';
        if (this.canMove(newPosition, direction)) {
            newPosition.x -= moveDistance;
            canMove = true;
        }
    } else if (Math.abs(normalizedRotation - (3 * Math.PI/2)) < 0.1) {
        direction = 'east';
        if (this.canMove(newPosition, direction)) {
            newPosition.x += moveDistance;
            canMove = true;
        }
    }

    if (canMove) {
        this.startMovement(newPosition);
    }
  }

  private moveBackward() {
    if (this.isMoving) return; // Don't start new movement if already moving

    const normalizedRotation = ((this.currentRotation % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const newPosition = this.currentPosition.clone();
    const moveDistance = 2;

    let direction: 'north' | 'south' | 'east' | 'west';
    let canMove = false;
    
    if (Math.abs(normalizedRotation - 0) < 0.1) {
        direction = 'south';
        if (this.canMove(newPosition, direction)) {
            newPosition.z += moveDistance;
            canMove = true;
        }
    } else if (Math.abs(normalizedRotation - Math.PI) < 0.1) {
        direction = 'north';
        if (this.canMove(newPosition, direction)) {
            newPosition.z -= moveDistance;
            canMove = true;
        }
    } else if (Math.abs(normalizedRotation - Math.PI/2) < 0.1) {
        direction = 'east';
        if (this.canMove(newPosition, direction)) {
            newPosition.x += moveDistance;
            canMove = true;
        }
    } else if (Math.abs(normalizedRotation - (3 * Math.PI/2)) < 0.1) {
        direction = 'west';
        if (this.canMove(newPosition, direction)) {
            newPosition.x -= moveDistance;
            canMove = true;
        }
    }

    if (canMove) {
        this.startMovement(newPosition);
    }
  }

  private handleKeyDown(event: KeyboardEvent) {
    // Prevent default behavior (like scrolling with arrow keys)
    event.preventDefault();

    // Only process key events if we're not currently moving or rotating
    if (this.isMoving || this.isRotating) return;

    switch (event.key) {
        case 'ArrowUp':
            this.moveForward();
            break;
        case 'ArrowDown':
            this.moveBackward();
            break;
        case 'ArrowLeft':
            this.rotateLeft();
            break;
        case 'ArrowRight':
            this.rotateRight();
            break;
    }
  }
} 