import * as THREE from 'three';
import { MazeGenerator, Cell } from './maze';

// Declare the initGame function from index.ts
declare function initGame(pyramidMode: PyramidPlacementMode, wallTexture?: string, floorTexture?: string): void;

export enum PyramidPlacementMode {
  ALL_RED_TILES = 'all',
  RANDOM_RED_TILE = 'random',
  CLOSEST_RED_TILE = 'closest'
}

export class MazeScene {
  private scene: THREE.Scene;
  private mainCamera: THREE.PerspectiveCamera;
  private miniMapCamera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private animationFrameId: number | null = null;
  private textureLoader: THREE.TextureLoader;
  private wallTexture: THREE.Texture | null = null;
  private floorTexture: THREE.Texture | null = null;
  private customWallTexture: string | undefined;
  private customFloorTexture: string | undefined;
  private pyramids: THREE.Mesh[] = []; // Store all pyramid meshes
  private pyramidPlacementMode: PyramidPlacementMode;
  private farthestDeadEndTile: THREE.Vector3 | null = null;
  private mazeSize: number;
  private texturesLoadedCallback: (() => void) | null = null;
  private wallTextureLoaded: boolean = false;
  private floorTextureLoaded: boolean = false;
  private isTimedMode: boolean = false;
  private timeRemaining: number = 60;
  private timeBonus: number = 10;
  private timerDisplay!: HTMLDivElement;
  private timerInterval: NodeJS.Timeout | null = null;
  private scoreDisplay!: HTMLDivElement;

  // Initialize properties with default values
  private currentPosition: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private currentRotation: number = 0;
  private maze: Cell[][] = [];

  // Initialize position indicator with non-null assertion
  private positionIndicator!: THREE.Group;

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
  private score: number = 0;

  constructor(pyramidMode: PyramidPlacementMode = PyramidPlacementMode.CLOSEST_RED_TILE, wallTexture?: string, floorTexture?: string, mazeSize: number = 8, isTimedMode: boolean = false, initialTime: number = 60, timeBonus: number = 10) {
    this.pyramidPlacementMode = pyramidMode;
    this.customWallTexture = wallTexture;
    this.customFloorTexture = floorTexture;
    this.mazeSize = mazeSize;
    this.isTimedMode = isTimedMode;
    this.timeRemaining = initialTime;
    this.timeBonus = timeBonus;
    
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);
    this.textureLoader = new THREE.TextureLoader();
    
    // Create score display or timer display
    if (this.isTimedMode) {
      this.timerDisplay = document.createElement('div');
      this.timerDisplay.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 10px 20px;
        background-color: rgba(255, 255, 255, 0.7);
        border-radius: 10px;
        font-size: 24px;
        font-weight: bold;
        z-index: 1000;
      `;
      this.updateTimerDisplay();
      document.body.appendChild(this.timerDisplay);
      this.startTimer();
    } else {
      this.scoreDisplay = document.createElement('div');
      this.scoreDisplay.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 10px 20px;
        background-color: rgba(255, 255, 255, 0.7);
        border-radius: 10px;
        font-size: 24px;
        font-weight: bold;
        z-index: 1000;
      `;
      this.updateScoreDisplay();
      document.body.appendChild(this.scoreDisplay);
    }
    
    // Load textures
    this.loadTextures();
    
    // Main (first-person) camera
    this.mainCamera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
    
    // Mini-map camera (overhead view)
    this.miniMapCamera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    this.miniMapCamera.position.set(0, this.mazeSize * 2, 0); // Reduced height and removed z-offset
    this.miniMapCamera.lookAt(0, 0, 0);
    this.miniMapCamera.rotation.z = 0; // Ensure no roll rotation
    
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.autoClear = false;
    this.renderer.setPixelRatio(window.devicePixelRatio);
    document.body.appendChild(this.renderer.domElement);
    
    // Update lighting for better visibility
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 8, 5);
    directionalLight.target.position.set(0, 0, 0);
    this.scene.add(directionalLight);
    this.scene.add(directionalLight.target);

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
    shape.moveTo(0, 0.4);       // Point forward
    shape.lineTo(-0.25, -0.25); // Back left
    shape.lineTo(0.25, -0.25);  // Back right
    shape.lineTo(0, 0.4);       // Back to front

    const geometry = new THREE.ShapeGeometry(shape);
    const material = new THREE.MeshBasicMaterial({ 
        color: 0xffff00,  // Yellow
        side: THREE.DoubleSide 
    });

    // Create the mesh
    const triangleMesh = new THREE.Mesh(geometry, material);

    // Create edges for the black border
    const edges = new THREE.EdgesGeometry(geometry);
    const borderMaterial = new THREE.LineBasicMaterial({ 
        color: 0x000000,  // Black
        linewidth: 2      // Note: linewidth only works in Firefox
    });
    const borderMesh = new THREE.LineSegments(edges, borderMaterial);

    // Group them together
    this.positionIndicator = new THREE.Group();
    this.positionIndicator.add(triangleMesh);
    this.positionIndicator.add(borderMesh);

    // Position slightly above the floor to prevent z-fighting
    triangleMesh.position.y = 0.001;
    borderMesh.position.y = 0.002;

    // Set rotation order and initial rotation
    this.positionIndicator.rotation.order = 'XYZ';
    this.positionIndicator.rotation.x = -Math.PI / 2;
    this.positionIndicator.position.y = 0.01;

    this.scene.add(this.positionIndicator);
  }

  private updatePositionIndicator() {
    // Update position
    this.positionIndicator.position.x = this.currentPosition.x;
    this.positionIndicator.position.z = this.currentPosition.z;
    
    // Update rotation - apply the negative rotation to make it point in the correct direction
    this.positionIndicator.rotation.z = this.currentRotation;
  }

  private loadTextures() {
    console.log('Starting texture loading...');
    
    // Reset texture loaded flags
    this.wallTextureLoaded = false;
    this.floorTextureLoaded = false;
    
    // Load wall texture
    const loadWallTexture = this.customWallTexture
      ? this.textureLoader.loadAsync(this.customWallTexture)
      : this.textureLoader.loadAsync('/textures/wall.png');
    
    loadWallTexture.then(
      (texture) => {
        console.log('Wall texture loaded successfully');
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.magFilter = THREE.LinearFilter;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
        this.wallTexture = texture;
        this.updateWallTextures();
        this.wallTextureLoaded = true;
        this.checkTexturesLoaded();
      }
    ).catch((error) => {
      console.error('Error loading wall texture:', error);
      this.wallTextureLoaded = true; // Mark as loaded even on error to prevent hanging
      this.checkTexturesLoaded();
    });

    // Load floor texture
    const loadFloorTexture = this.customFloorTexture
      ? this.textureLoader.loadAsync(this.customFloorTexture)
      : this.textureLoader.loadAsync('/textures/floor.png');
    
    loadFloorTexture.then(
      (texture) => {
        console.log('Floor texture loaded successfully');
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.magFilter = THREE.LinearFilter;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
        // Scale the texture repeat based on maze size
        texture.repeat.set(this.mazeSize, this.mazeSize);
        this.floorTexture = texture;
        this.updateFloorTexture();
        this.floorTextureLoaded = true;
        this.checkTexturesLoaded();
      }
    ).catch((error) => {
      console.error('Error loading floor texture:', error);
      this.floorTextureLoaded = true; // Mark as loaded even on error to prevent hanging
      this.checkTexturesLoaded();
    });
  }

  private updateWallTextures() {
    if (!this.wallTexture) {
      console.log('No wall texture available for update');
      return;
    }
    console.log('Updating wall textures...');
    let wallCount = 0;
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        const material = object.material as THREE.MeshPhongMaterial;
        if (material.color.getHex() === 0xffffff && object.geometry instanceof THREE.BoxGeometry) {
          wallCount++;
          material.map = this.wallTexture;
          material.needsUpdate = true;
        }
      }
    });
    console.log(`Updated ${wallCount} wall textures`);
  }

  private updateFloorTexture() {
    if (!this.floorTexture) {
      console.log('No floor texture available for update');
      return;
    }
    console.log('Updating floor texture...');
    let floorCount = 0;
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        const material = object.material as THREE.MeshPhongMaterial;
        if (material.color.getHex() === 0xffffff && object.geometry instanceof THREE.PlaneGeometry) {
          floorCount++;
          material.map = this.floorTexture;
          material.needsUpdate = true;
        }
      }
    });
    console.log(`Updated ${floorCount} floor textures`);
  }

  private findClosestRedTile(redTilePositions: { x: number, z: number }[], centerX: number, centerZ: number): { x: number, z: number } | null {
    // Convert world coordinates to grid coordinates
    const startGridX = Math.round((centerX + 7) / 2);
    const startGridZ = Math.round((centerZ + 7) / 2);
    
    // Convert red tile positions to grid coordinates
    const redTileGridPositions = redTilePositions.map(pos => ({
      x: Math.round((pos.x + 7) / 2),
      z: Math.round((pos.z + 7) / 2)
    }));

    // Queue for BFS: [x, z, distance]
    const queue: [number, number, number][] = [[startGridX, startGridZ, 0]];
    const visited = new Set<string>();
    visited.add(`${startGridX},${startGridZ}`);

    let closestRedTile: { x: number, z: number } | null = null;
    let shortestDistance = Infinity;

    while (queue.length > 0) {
      const [currentX, currentZ, distance] = queue.shift()!;
      
      // Check if current position is a red tile
      const isRedTile = redTileGridPositions.some(pos => pos.x === currentX && pos.z === currentZ);
      if (isRedTile && distance < shortestDistance) {
        shortestDistance = distance;
        closestRedTile = {
          x: currentX * 2 - 7, // Convert back to world coordinates
          z: currentZ * 2 - 7
        };
      }

      // Get current cell
      const cell = this.maze[currentX][currentZ];

      // Check each direction
      const directions = [
        { dx: 0, dz: -1, wall: 'north' },
        { dx: 0, dz: 1, wall: 'south' },
        { dx: 1, dz: 0, wall: 'east' },
        { dx: -1, dz: 0, wall: 'west' }
      ];

      for (const { dx, dz, wall } of directions) {
        const nextX = currentX + dx;
        const nextZ = currentZ + dz;
        const key = `${nextX},${nextZ}`;

        // Check if the next position is valid and not visited
        if (nextX >= 0 && nextX < 8 && nextZ >= 0 && nextZ < 8 &&
            !visited.has(key) && !cell.walls[wall as keyof Cell['walls']]) {
          queue.push([nextX, nextZ, distance + 1]);
          visited.add(key);
        }
      }
    }

    return closestRedTile;
  }

  private createMaze() {
    const mazeGen = new MazeGenerator(this.mazeSize);
    const { grid: maze, centerDeadEnd, farthestDeadEnd } = mazeGen.generate();
    this.maze = maze;

    // Store the farthest dead end position for win condition checking
    this.farthestDeadEndTile = new THREE.Vector3(
      farthestDeadEnd.x * 2 - (this.mazeSize - 1),
      0,
      farthestDeadEnd.y * 2 - (this.mazeSize - 1)
    );

    // Create base floor
    const floorGeometry = new THREE.PlaneGeometry(this.mazeSize * 2, this.mazeSize * 2);
    const floorMaterial = new THREE.MeshPhongMaterial({ 
      color: 0xffffff,
      map: this.floorTexture,
      shininess: 0
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    this.scene.add(floor);

    // Create individual floor tiles
    const tileGeometry = new THREE.PlaneGeometry(2, 2);
    
    // Collect positions of red tiles
    const redTilePositions: { x: number, z: number }[] = [];
    
    maze.forEach((row, x) => {
      row.forEach((cell, y) => {
        const worldX = x * 2 - (this.mazeSize - 1);
        const worldZ = y * 2 - (this.mazeSize - 1);

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

          // Collect red tile positions
          if (tileColor === 0xff0000) {
            redTilePositions.push({ x: worldX, z: worldZ });
          }
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

    // Get the world coordinates of the blue tile (center dead end)
    const centerX = centerDeadEnd.x * 2 - (this.mazeSize - 1);
    const centerZ = centerDeadEnd.y * 2 - (this.mazeSize - 1);

    // Create pyramids based on selected mode
    switch (this.pyramidPlacementMode) {
      case PyramidPlacementMode.ALL_RED_TILES:
        // Create pyramids on all red tiles
        redTilePositions.forEach(pos => {
          this.createPyramid(pos.x, pos.z);
        });
        break;

      case PyramidPlacementMode.RANDOM_RED_TILE:
        // Create pyramid on a random red tile
        if (redTilePositions.length > 0) {
          const randomIndex = Math.floor(Math.random() * redTilePositions.length);
          const randomPosition = redTilePositions[randomIndex];
          this.createPyramid(randomPosition.x, randomPosition.z);
        }
        break;

      case PyramidPlacementMode.CLOSEST_RED_TILE:
        // Create pyramid on the closest red tile
        const closestRedTile = this.findClosestRedTile(redTilePositions, centerX, centerZ);
        if (closestRedTile) {
          this.createPyramid(closestRedTile.x, closestRedTile.z);
        }
        break;
    }

    // Position main camera at the blue tile (center-most dead end)
    this.mainCamera.position.set(centerX, 0.5, centerZ);

    // Find the direction WITHOUT walls (the open path)
    const cell = maze[centerDeadEnd.x][centerDeadEnd.y];
    const direction = this.getOpenDirection(cell);
    
    // Set initial rotation
    this.currentRotation = direction;
    this.mainCamera.rotation.y = direction;
    
    // Store initial position
    this.currentPosition = new THREE.Vector3(centerX, 0.5, centerZ);
    
    // Update both indicators with initial direction
    this.updateCompassDirection(direction);
    this.updatePositionIndicator();
  }

  private createWall(x: number, z: number, isNorthSouth: boolean) {
    // Create the main wall geometry for the wide portion
    const mainWallGeometry = new THREE.BoxGeometry(
      isNorthSouth ? 2 : 0.1,
      0.8, // Slightly shorter to leave room for the top
      isNorthSouth ? 0.1 : 2
    );
    const mainWallMaterial = new THREE.MeshPhongMaterial({ 
      color: 0xffffff,
      map: this.wallTexture ? this.wallTexture.clone() : null,
      shininess: 0
    });
    
    // Set texture repeat based on wall orientation
    if (mainWallMaterial.map) {
      mainWallMaterial.map.wrapS = THREE.RepeatWrapping;
      mainWallMaterial.map.wrapT = THREE.RepeatWrapping;
      mainWallMaterial.map.repeat.set(
        isNorthSouth ? 1 : 0.05,
        0.4 // Adjusted for the shorter height
      );
      mainWallMaterial.map.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
      mainWallMaterial.needsUpdate = true;
    }
    
    const mainWall = new THREE.Mesh(mainWallGeometry, mainWallMaterial);
    mainWall.position.set(x, 0.4, z); // Position lower to accommodate top portion
    this.scene.add(mainWall);

    // Create the top portion with solid black material
    const topWallGeometry = new THREE.BoxGeometry(
      isNorthSouth ? 2 : 0.1,
      0.2, // Top portion height
      isNorthSouth ? 0.1 : 2
    );
    const topWallMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x000000,
      shininess: 0
    });
    
    const topWall = new THREE.Mesh(topWallGeometry, topWallMaterial);
    topWall.position.set(x, 0.9, z); // Position at the top
    this.scene.add(topWall);
  }

  private createPyramid(x: number, z: number) {
    // Create pyramid geometry
    const geometry = new THREE.ConeGeometry(0.3, 0.6, 4);
    const material = new THREE.MeshPhongMaterial({ color: 0xFFA500 }); // Orange color
    const pyramid = new THREE.Mesh(geometry, material);
    
    // Position the pyramid
    pyramid.position.set(x, 0.8, z); // Float 0.8 units above the floor
    pyramid.rotation.y = Math.PI / 4; // Initial 45-degree rotation for better orientation
    
    this.scene.add(pyramid);
    this.pyramids.push(pyramid);
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

        // Check for pyramid collisions
        this.checkPyramidCollisions();
      } else {
        // Animation complete
        this.isMoving = false;
        this.currentPosition.copy(this.targetPosition);
        this.mainCamera.position.copy(this.targetPosition);
        this.updatePositionIndicator();
        
        // Check for pyramid collisions
        this.checkPyramidCollisions();
        
        // Check win condition after movement is complete
        this.checkWinCondition();
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
        // Only update position indicator during rotation, not compass
        this.updatePositionIndicator();
      } else {
        // Animation complete
        this.isRotating = false;
        this.currentRotation = this.targetRotation;
        this.mainCamera.rotation.y = this.currentRotation;
        // Update both compass and position indicator only when rotation is complete
        this.updateCompassDirection(this.currentRotation);
        this.updatePositionIndicator();
      }
    }

    // Rotate pyramids
    this.pyramids.forEach(pyramid => {
      pyramid.rotation.y += 0.02; // Rotate 0.02 radians per frame
    });
    
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

  private checkPyramidCollisions() {
    const collisionDistance = 0.8; // Distance threshold for collision
    const pyramidsToRemove: THREE.Mesh[] = [];

    // Check each pyramid for collision with the camera
    this.pyramids.forEach(pyramid => {
      const distance = this.currentPosition.distanceTo(pyramid.position);
      if (distance < collisionDistance) {
        pyramidsToRemove.push(pyramid);
      }
    });

    // Remove collided pyramids and update score or timer
    pyramidsToRemove.forEach(pyramid => {
      const index = this.pyramids.indexOf(pyramid);
      if (index > -1) {
        this.pyramids.splice(index, 1);
        this.scene.remove(pyramid);
        
        if (this.isTimedMode) {
          // Add time bonus to the timer
          this.timeRemaining += this.timeBonus;
          this.updateTimerDisplay();
        } else {
          this.score++;
          this.updateScoreDisplay();
        }
      }
    });
  }

  public dispose() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    
    // Remove both event listeners
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('keydown', this.handleKeyDown);
    
    // Clear timer interval if it exists
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    
    if (this.isTimedMode) {
      document.body.removeChild(this.timerDisplay);
    } else {
      document.body.removeChild(this.scoreDisplay);
    }
    
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
    // Use mazeSize to properly scale the conversion
    const gridX = Math.round((this.currentPosition.x + (this.mazeSize - 1)) / 2);
    const gridZ = Math.round((this.currentPosition.z + (this.mazeSize - 1)) / 2);
    
    // Check if current position is within bounds
    if (gridX < 0 || gridX >= this.mazeSize || gridZ < 0 || gridZ >= this.mazeSize) {
        console.log('Out of bounds:', { gridX, gridZ, mazeSize: this.mazeSize });
        return false;
    }

    // Get current cell
    const currentCell = this.maze[gridX][gridZ];
    if (!currentCell) {
        console.log('No cell found at:', { gridX, gridZ });
        return false;
    }

    // Check if there's a wall in the movement direction
    const result = {
        north: !currentCell.walls.north,
        south: !currentCell.walls.south,
        east: !currentCell.walls.east,
        west: !currentCell.walls.west
    }[direction];

    // Debug log the movement attempt
    console.log('Movement check:', {
        direction,
        gridX,
        gridZ,
        walls: currentCell.walls,
        canMove: result
    });

    return result;
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
    const moveDistance = 2; // Distance between cells in world coordinates

    let direction: 'north' | 'south' | 'east' | 'west' = 'north'; // Initialize with default
    let canMove = false;
    
    // Determine direction based on camera rotation
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
        // Debug log the movement
        console.log('Moving forward:', {
            from: this.currentPosition.clone(),
            to: newPosition.clone(),
            direction
        });
        this.startMovement(newPosition);
    }
  }

  private moveBackward() {
    if (this.isMoving) return; // Don't start new movement if already moving

    const normalizedRotation = ((this.currentRotation % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const newPosition = this.currentPosition.clone();
    const moveDistance = 2; // Distance between cells in world coordinates

    let direction: 'north' | 'south' | 'east' | 'west' = 'south'; // Initialize with default
    let canMove = false;
    
    // Determine direction based on camera rotation (opposite of forward movement)
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
        // Debug log the movement
        console.log('Moving backward:', {
            from: this.currentPosition.clone(),
            to: newPosition.clone(),
            direction
        });
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

  private checkWinCondition() {
    if (!this.farthestDeadEndTile) return;

    // Convert current position to grid coordinates
    const currentGridX = Math.round((this.currentPosition.x + (this.mazeSize - 1)) / 2);
    const currentGridZ = Math.round((this.currentPosition.z + (this.mazeSize - 1)) / 2);

    // Convert farthest dead end to grid coordinates
    const targetGridX = Math.round((this.farthestDeadEndTile.x + (this.mazeSize - 1)) / 2);
    const targetGridZ = Math.round((this.farthestDeadEndTile.z + (this.mazeSize - 1)) / 2);

    // Check if player has reached the green tile
    if (currentGridX === targetGridX && currentGridZ === targetGridZ) {
      // Stop the timer if in timed mode
      if (this.isTimedMode && this.timerInterval) {
        clearInterval(this.timerInterval);
      }
      
      // Show game over screen
      const gameOverScreen = document.getElementById('gameOverScreen');
      if (gameOverScreen) {
        gameOverScreen.style.display = 'flex';
      }
      
      // Stop the animation loop
      if (this.animationFrameId !== null) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
      }
    }
  }

  private updateScoreDisplay() {
    this.scoreDisplay.textContent = `Score: ${this.score}`;
  }

  public onTexturesLoaded(callback: () => void) {
    this.texturesLoadedCallback = callback;
    // Check if textures are already loaded
    if (this.wallTextureLoaded && this.floorTextureLoaded) {
      callback();
    }
  }

  private checkTexturesLoaded() {
    if (this.wallTextureLoaded && this.floorTextureLoaded && this.texturesLoadedCallback) {
      this.texturesLoadedCallback();
    }
  }

  private startTimer() {
    this.timerInterval = setInterval(() => {
      this.timeRemaining--;
      this.updateTimerDisplay();
      
      if (this.timeRemaining <= 0) {
        this.handleTimeUp();
      }
    }, 1000);
  }

  private updateTimerDisplay() {
    this.timerDisplay.textContent = `Time: ${this.timeRemaining}s`;
  }

  private handleTimeUp() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    
    // Show game over screen
    const gameOverScreen = document.getElementById('gameOverScreen');
    if (gameOverScreen) {
      gameOverScreen.style.display = 'flex';
    }
    
    // Stop the animation loop
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }
} 