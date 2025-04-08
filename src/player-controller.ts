import * as THREE from 'three';
import { Cell } from './maze';

export class PlayerController {
  // Position and orientation properties
  private currentPosition: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private currentRotation: number = 0;
  
  // Movement animation properties
  private isMoving: boolean = false;
  private targetPosition: THREE.Vector3 = new THREE.Vector3();
  private moveStartPosition: THREE.Vector3 = new THREE.Vector3();
  private moveProgress: number = 0;
  private readonly MOVE_DURATION: number = 500; // Duration in milliseconds
  private moveStartTime: number = 0;

  // Rotation animation properties
  private isRotating: boolean = false;
  private targetRotation: number = 0;
  private rotationStartTime: number = 0;
  private rotationStartAngle: number = 0;
  private readonly ROTATION_DURATION: number = 300; // Duration in milliseconds

  // Reference to camera and maze
  private camera: THREE.PerspectiveCamera;
  private maze: Cell[][] = [];
  private mazeSize: number;
  
  // UI elements for updates
  private positionIndicator: THREE.Group;
  private updateCompassCallback: (rotation: number) => void;
  
  // Bound event handlers
  private boundHandleKeyDown: (event: KeyboardEvent) => void;
  
  constructor(
    camera: THREE.PerspectiveCamera,
    positionIndicator: THREE.Group,
    maze: Cell[][],
    mazeSize: number,
    updateCompassCallback: (rotation: number) => void
  ) {
    this.camera = camera;
    this.positionIndicator = positionIndicator;
    this.maze = maze;
    this.mazeSize = mazeSize;
    this.updateCompassCallback = updateCompassCallback;
    
    // Pre-bind event handlers for proper cleanup later
    this.boundHandleKeyDown = this.handleKeyDown.bind(this);
    
    // Add keyboard event listener
    window.addEventListener('keydown', this.boundHandleKeyDown);
  }

  // Public methods to get current state
  public getPosition(): THREE.Vector3 {
    return this.currentPosition.clone();
  }
  
  public getRotation(): number {
    return this.currentRotation;
  }
  
  public isPlayerMoving(): boolean {
    return this.isMoving || this.isRotating;
  }
  
  // Set initial position and rotation
  public setInitialPosition(position: THREE.Vector3, rotation: number): void {
    this.currentPosition.copy(position);
    this.currentRotation = rotation;
    
    // Set the camera at the correct height (0.5 units above floor)
    this.camera.position.set(position.x, 0.5, position.z);
    this.camera.rotation.y = rotation;
    
    this.updatePositionIndicator();
    this.updateCompassCallback(rotation);
  }
  
  // Update method to be called in animation loop
  public update(): void {
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
        this.camera.position.copy(this.currentPosition);
        this.updatePositionIndicator();
      } else {
        // Animation complete
        this.isMoving = false;
        this.currentPosition.copy(this.targetPosition);
        this.camera.position.copy(this.targetPosition);
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
        this.camera.rotation.y = this.currentRotation;
        // Only update position indicator during rotation, not compass
        this.updatePositionIndicator();
      } else {
        // Animation complete
        this.isRotating = false;
        this.currentRotation = this.targetRotation;
        this.camera.rotation.y = this.currentRotation;
        // Update both compass and position indicator only when rotation is complete
        this.updateCompassCallback(this.currentRotation);
        this.updatePositionIndicator();
      }
    }
  }
  
  // Movement methods
  public moveForward(): void {
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
      this.startMovement(newPosition);
    }
  }

  public moveBackward(): void {
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
      this.startMovement(newPosition);
    }
  }

  public rotateLeft(): void {
    if (this.isRotating) return; // Don't start new rotation if already rotating
    this.startRotation(Math.PI/2);
  }

  public rotateRight(): void {
    if (this.isRotating) return; // Don't start new rotation if already rotating
    this.startRotation(-Math.PI/2);
  }

  // Clean up resources
  public dispose(): void {
    window.removeEventListener('keydown', this.boundHandleKeyDown);
  }

  // Private helper methods
  private updatePositionIndicator(): void {
    // Update position
    this.positionIndicator.position.x = this.currentPosition.x;
    this.positionIndicator.position.z = this.currentPosition.z;
    
    // Update rotation - preserve the -90 degree X rotation (facing down) 
    // and apply the current rotation to the Z axis to make it point in the correct direction
    this.positionIndicator.rotation.x = -Math.PI / 2; // Keep it flat on the ground
    this.positionIndicator.rotation.z = this.currentRotation;
  }

  private canMove(position: THREE.Vector3, direction: 'north' | 'south' | 'east' | 'west'): boolean {
    // Convert world position to grid coordinates using mazeSize for proper scaling
    const gridX = Math.round((this.currentPosition.x + (this.mazeSize - 1)) / 2);
    const gridZ = Math.round((this.currentPosition.z + (this.mazeSize - 1)) / 2);
    
    // Check if current position is within bounds - early return for performance
    if (gridX < 0 || gridX >= this.mazeSize || gridZ < 0 || gridZ >= this.mazeSize) {
      return false;
    }

    // Get current cell - early return if cell doesn't exist
    const currentCell = this.maze[gridX][gridZ];
    if (!currentCell) {
      return false;
    }

    // Direct lookup for wall in movement direction - more efficient than creating an object
    switch (direction) {
      case 'north': return !currentCell.walls.north;
      case 'south': return !currentCell.walls.south;
      case 'east': return !currentCell.walls.east;
      case 'west': return !currentCell.walls.west;
      default: return false;
    }
  }

  private startMovement(newPosition: THREE.Vector3): void {
    this.isMoving = true;
    this.moveStartTime = performance.now();
    this.moveProgress = 0;
    this.moveStartPosition.copy(this.currentPosition);
    this.targetPosition.copy(newPosition);
  }

  private startRotation(angle: number): void {
    this.isRotating = true;
    this.rotationStartTime = performance.now();
    this.rotationStartAngle = this.currentRotation;
    this.targetRotation = this.currentRotation + angle;
  }

  private handleKeyDown(event: KeyboardEvent): void {
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