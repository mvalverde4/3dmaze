import * as THREE from 'three';
import { ResourceManager } from '../resource-manager';

export class CollectibleManager {
  private collectibles: THREE.Mesh[] = [];
  private resourceManager: ResourceManager;
  private objectShape: string;
  private readonly SHAPE_TYPES = ['pyramid', 'sphere', 'cylinder', 'cube'];
  private shapeDistribution: Map<string, number> = new Map();
  private showCollectibleScreens: boolean;
  private redTileCount: number = 0;

  constructor(
    resourceManager: ResourceManager,
    objectShape: string = 'pyramid',
    showCollectibleScreens: boolean = true
  ) {
    this.resourceManager = resourceManager;
    this.objectShape = objectShape;
    this.showCollectibleScreens = showCollectibleScreens;
  }

  public setRedTileCount(count: number): void {
    this.redTileCount = count;
    this.initializeShapeDistribution();
  }

  private initializeShapeDistribution(): void {
    if (this.objectShape !== 'mixed') return;

    console.log('Initializing mixed shapes distribution. Red tile count:', this.redTileCount);
    
    const shapesPerType = Math.floor(this.redTileCount / this.SHAPE_TYPES.length);
    const remainder = this.redTileCount % this.SHAPE_TYPES.length;
    
    console.log('Shapes per type:', shapesPerType, 'Remainder:', remainder);
    
    this.shapeDistribution.clear();
    this.SHAPE_TYPES.forEach(type => {
      this.shapeDistribution.set(type, shapesPerType);
    });
    
    // Distribute remainder evenly starting from first shape
    for (let i = 0; i < remainder; i++) {
      const type = this.SHAPE_TYPES[i];
      this.shapeDistribution.set(type, (this.shapeDistribution.get(type) || 0) + 1);
    }

    console.log('Initial shape distribution:', Object.fromEntries(this.shapeDistribution));
  }

  public createCollectible(x: number, z: number, scene: THREE.Scene): void {
    let geometry: THREE.BufferGeometry | null = null;
    let shapeType = this.objectShape;
    
    // Handle mixed shapes
    if (this.objectShape === 'mixed') {
      shapeType = this.getNextShapeType();
    }
    
    // Get the appropriate geometry based on shape type
    switch (shapeType) {
      case 'sphere':
        geometry = this.resourceManager.getSphereGeometry();
        break;
      case 'cylinder':
        geometry = this.resourceManager.getCylinderGeometry();
        break;
      case 'cube':
        geometry = this.resourceManager.getCubeGeometry();
        break;
      default: // pyramid
        geometry = this.resourceManager.getPyramidGeometry();
        break;
    }

    // Make sure geometry and material are available
    const collectibleMaterial = this.resourceManager.getCollectibleMaterial();
    if (!geometry || !collectibleMaterial) {
      console.error('Collectible geometry or material not initialized');
      return;
    }

    const object = new THREE.Mesh(geometry, collectibleMaterial);
    
    // Store the shape type with the object for collection messages
    object.userData.shapeType = shapeType;
    
    // Position the object
    object.position.set(x, 0.8, z); // Float 0.8 units above the floor
    
    // Only rotate collectibles and cylinders by 45 degrees
    if (shapeType === 'pyramid' || shapeType === 'cylinder') {
      object.rotation.y = Math.PI / 4;
    }
    
    scene.add(object);
    this.collectibles.push(object);
  }

  public createCollectiblesOnRedTiles(
    scene: THREE.Scene,
    placementMode: string,
    redTilePositions: { x: number, z: number }[],
    centerX: number,
    centerZ: number,
    findClosestRedTile: (positions: { x: number, z: number }[], x: number, z: number) => { x: number, z: number } | null
  ): void {
    // Reset collectibles array
    this.collectibles = [];
    
    switch (placementMode) {
      case 'all':
        // Shuffle red tile positions if using mixed shapes to ensure random distribution
        if (this.objectShape === 'mixed') {
          for (let i = redTilePositions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [redTilePositions[i], redTilePositions[j]] = [redTilePositions[j], redTilePositions[i]];
          }
        }
        // Create objects on all red tiles
        redTilePositions.forEach(pos => {
          this.createCollectible(pos.x, pos.z, scene);
        });
        break;

      case 'random':
        // Create object on a random red tile
        if (redTilePositions.length > 0) {
          const randomIndex = Math.floor(Math.random() * redTilePositions.length);
          const randomPosition = redTilePositions[randomIndex];
          this.createCollectible(randomPosition.x, randomPosition.z, scene);
        }
        break;

      case 'closest':
        // Create object on the closest red tile
        const closestRedTile = findClosestRedTile(redTilePositions, centerX, centerZ);
        if (closestRedTile) {
          this.createCollectible(closestRedTile.x, closestRedTile.z, scene);
        }
        break;
    }
  }

  private getNextShapeType(): string {
    if (this.objectShape !== 'mixed') return this.objectShape;

    // Debug log current distribution
    console.log('Current shape distribution:', Object.fromEntries(this.shapeDistribution));

    // Find a shape that still has remaining allocations
    for (const type of this.SHAPE_TYPES) {
      const count = this.shapeDistribution.get(type) || 0;
      if (count > 0) {
        this.shapeDistribution.set(type, count - 1);
        console.log(`Selected shape: ${type}, Remaining:`, Object.fromEntries(this.shapeDistribution));
        return type;
      }
    }

    // If we somehow run out (shouldn't happen), log error and return pyramid
    console.error('No shapes left in distribution!', Object.fromEntries(this.shapeDistribution));
    return 'pyramid';
  }

  public updateCollectibles(): void {
    // Rotate collectibles
    this.collectibles.forEach(collectible => {
      collectible.rotation.y += 0.02; // Rotate 0.02 radians per frame
    });
  }

  public checkCollectibleCollisions(
    playerPosition: THREE.Vector3,
    scene: THREE.Scene,
    callbacks: {
      onCollectibleCollected: (collectible: THREE.Mesh, animateFunc: () => void) => void,
      updateScoreOrTimer: () => void,
      enableMinimap?: () => void
    }
  ): void {
    const collisionDistance = 0.8; // Distance threshold for collision
    const collectiblesToRemove: THREE.Mesh[] = [];

    // Check each collectible for collision with the player
    this.collectibles.forEach(collectible => {
      const distance = playerPosition.distanceTo(collectible.position);
      if (distance < collisionDistance) {
        collectiblesToRemove.push(collectible);
      }
    });

    // Remove collided collectibles and call appropriate callbacks
    collectiblesToRemove.forEach(collectible => {
      const index = this.collectibles.indexOf(collectible);
      if (index > -1) {
        this.collectibles.splice(index, 1);
        scene.remove(collectible);
        
        // Enable minimap if callback is provided
        if (callbacks.enableMinimap) {
          callbacks.enableMinimap();
        }

        // Update score or timer
        callbacks.updateScoreOrTimer();

        if (this.showCollectibleScreens) {
          // Show collection screen
          callbacks.onCollectibleCollected(collectible, () => {
            // This function will be called when the player continues
            // No need to do anything special here as the scene's animate function will be called by the callback
          });
        }
      }
    });
  }

  public getCollectibles(): THREE.Mesh[] {
    return this.collectibles;
  }

  public clearCollectibles(scene: THREE.Scene): void {
    this.collectibles.forEach(collectible => {
      scene.remove(collectible);
    });
    this.collectibles = [];
  }

  public dispose(scene: THREE.Scene): void {
    this.clearCollectibles(scene);
    this.shapeDistribution.clear();
  }

  /**
   * Create collectibles at the specified positions
   * This method is used with the ObjectPlacementManager
   */
  public createCollectiblesAtPositions(
    scene: THREE.Scene,
    positions: { x: number, z: number }[]
  ): void {
    // Reset collectibles array
    this.collectibles = [];
    
    // Shuffle positions if using mixed shapes to ensure random distribution
    if (this.objectShape === 'mixed' && positions.length > 1) {
      const shuffledPositions = [...positions];
      for (let i = shuffledPositions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledPositions[i], shuffledPositions[j]] = [shuffledPositions[j], shuffledPositions[i]];
      }
      positions = shuffledPositions;
    }
    
    // Create collectibles at all provided positions
    positions.forEach(pos => {
      this.createCollectible(pos.x, pos.z, scene);
    });
  }
} 