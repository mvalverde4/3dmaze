import * as THREE from 'three';
import { MazeGenerator, Cell } from './maze';
import { ResourceManager } from './resource-manager';
import { PlayerController } from './player-controller';
import { CollectibleManager } from './managers/collectible-manager';
import { UIManager } from './managers/ui-manager';
import { MazeRenderer } from './maze-renderer';
import { CameraManager } from './camera-manager';
import { GameStateManager, WinConditionConfig, GameStateConfig } from './game-state-manager';
import { PositionIndicatorManager } from './position-indicator-manager';
import { ObjectPlacementManager } from './object-placement-manager';

export enum ObjectPlacementMode {
  ALL_RED_TILES = 'all',
  RANDOM_RED_TILE = 'random',
  CLOSEST_RED_TILE = 'closest'
}

export class MazeScene {
  private scene: THREE.Scene;
  private renderer: THREE.WebGLRenderer;
  private animationFrameId: number | null = null;
  private resourceManager: ResourceManager;
  private mazeRenderer: MazeRenderer;
  private cameraManager: CameraManager;
  private gameStateManager: GameStateManager;
  private positionIndicatorManager: PositionIndicatorManager;
  private objectPlacementManager: ObjectPlacementManager;
  private playerController!: PlayerController; // Use definite assignment assertion
  private collectibleManager!: CollectibleManager; // Use definite assignment assertion
  private uiManager!: UIManager; // Use definite assignment assertion
  private customWallTexture: string | undefined;
  private customFloorTexture: string | undefined;
  private objectPlacementMode: ObjectPlacementMode; // Renamed from pyramidPlacementMode
  private objectShape: string;
  private farthestDeadEndTile: THREE.Vector3 | null = null;
  private mazeSize: number;
  private minimapMode: 'always' | 'object';
  private showCollectibleScreens: boolean; // Renamed from showPyramidScreens
  private showRedTiles: boolean;

  // Initialize properties with default values
  private maze: Cell[][] = [];

  // Store initial position for player controller
  private initialPlayerPosition: { position: THREE.Vector3, rotation: number } | null = null;
  
  private redTileCount: number = 0;

  constructor(
    objectMode: ObjectPlacementMode = ObjectPlacementMode.CLOSEST_RED_TILE, 
    wallTexture?: string, 
    floorTexture?: string, 
    mazeSize: number = 8, 
    isTimedMode: boolean = false, 
    initialTime: number = 60, 
    timeBonus: number = 10,
    minimapMode: 'always' | 'object' = 'always',
    showCollectibleScreens: boolean = true,
    showRedTiles: boolean = true,
    objectShape: string = 'pyramid'
  ) {
    this.objectPlacementMode = objectMode;
    this.customWallTexture = wallTexture;
    this.customFloorTexture = floorTexture;
    this.mazeSize = mazeSize;
    this.minimapMode = minimapMode;
    this.showCollectibleScreens = showCollectibleScreens;
    this.showRedTiles = showRedTiles;
    this.objectShape = objectShape;
    
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);
    
    // Initialize renderer first for ResourceManager
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.autoClear = false;
    this.renderer.setPixelRatio(window.devicePixelRatio);
    document.body.appendChild(this.renderer.domElement);
    
    // Initialize the ResourceManager
    this.resourceManager = new ResourceManager(
      this.renderer, 
      this.mazeSize, 
      this.customWallTexture, 
      this.customFloorTexture
    );
    
    // Set up callback for when textures are loaded
    this.resourceManager.onTexturesLoadedCallback(() => {
      this.resourceManager.updateSceneTextures(this.scene);
    });
    
    // Initialize the CameraManager
    const isMinimapEnabled = minimapMode === 'always';
    this.cameraManager = new CameraManager(
      this.scene,
      this.renderer,
      this.mazeSize,
      isMinimapEnabled
    );
    
    // Update lighting for better visibility
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 8, 5);
    directionalLight.target.position.set(0, 0, 0);
    this.scene.add(directionalLight);
    this.scene.add(directionalLight.target);

    // Create position indicator for minimap
    this.positionIndicatorManager = new PositionIndicatorManager(this.scene);
    
    // Initialize the MazeRenderer
    this.mazeRenderer = new MazeRenderer(
      this.scene,
      this.resourceManager,
      this.mazeSize,
      this.showRedTiles
    );
    
    // Initialize the ObjectPlacementManager
    this.objectPlacementManager = new ObjectPlacementManager(this.mazeSize);

    // Initialize the CollectibleManager before creating the maze
    this.collectibleManager = new CollectibleManager(
      this.resourceManager,
      this.objectShape,
      this.showCollectibleScreens
    );

    // Create and render the maze
    this.createMaze();
    
    // Initialize the UIManager first
    this.uiManager = new UIManager(
      isTimedMode,
      initialTime,
      timeBonus,
      null // We'll set the player controller later
    );
    
    // Initialize the GameStateManager after maze is created and UI Manager is initialized
    const gameStateConfig: GameStateConfig = {
      isTimedMode,
      initialTime,
      timeBonus
    };
    
    const winConditionConfig: WinConditionConfig = {
      farthestDeadEndTile: this.farthestDeadEndTile!,
      mazeSize: this.mazeSize
    };
    
    this.gameStateManager = new GameStateManager(
      this.uiManager,
      winConditionConfig,
      gameStateConfig
    );
    
    // Create PlayerController after maze is created and UIManager is initialized
    this.playerController = new PlayerController(
      this.cameraManager.getMainCamera(),
      this.positionIndicatorManager.getPositionIndicator(),
      this.maze,
      this.mazeSize,
      this.updateCompassDirection.bind(this)
    );
    
    // Update UIManager with player controller reference
    this.uiManager.setPlayerController(this.playerController);
    
    // Initialize player's position
    this.initializePlayerPosition();

    this.animate();
  }

  private updateCompassDirection(rotation: number): void {
    if (this.uiManager) {
      this.uiManager.updateCompassDirection(rotation);
    }
  }

  private createMaze() {
    // Use the MazeRenderer to create the maze
    const mazeResult = this.mazeRenderer.createMaze();
    
    // Store the results
    this.maze = mazeResult.maze;
    this.farthestDeadEndTile = mazeResult.farthestDeadEndTile;
    this.initialPlayerPosition = mazeResult.initialPlayerPosition;
    this.redTileCount = mazeResult.redTileCount;
    
    // Update the CollectibleManager with the red tile count
    this.collectibleManager.setRedTileCount(this.redTileCount);
    
    // Use ObjectPlacementManager to determine object positions
    const objectPositions = this.objectPlacementManager.getObjectPositions(
      this.objectPlacementMode,
      mazeResult.redTilePositions,
      mazeResult.centerX,
      mazeResult.centerZ,
      this.maze,
      (redTilePositions, centerX, centerZ, maze) => 
        this.mazeRenderer.findClosestRedTile(redTilePositions, centerX, centerZ, maze)
    );

    // Create collectibles using the CollectibleManager
    this.collectibleManager.createCollectiblesAtPositions(
      this.scene,
      objectPositions
    );
  }

  // This will be called after PlayerController is created to set initial position
  private initializePlayerPosition() {
    if (this.initialPlayerPosition) {
      this.playerController.setInitialPosition(
        this.initialPlayerPosition.position,
        this.initialPlayerPosition.rotation
      );
      // We can clear this after use
      this.initialPlayerPosition = null;
    }
  }

  private animate() {
    this.animationFrameId = requestAnimationFrame(this.animate.bind(this));
    
    // Update the GameStateManager with the current animation frame ID
    this.gameStateManager.setAnimationFrameId(this.animationFrameId);
    
    // Update player movement and rotation animations via PlayerController
    this.playerController.update();
    
    // Check for collectible collisions
    this.checkCollectibleCollisions();
    
    // Check win condition after movement is complete
    this.checkWinCondition();
    
    // Update collectibles (rotation, etc.)
    this.collectibleManager.updateCollectibles();
    
    // Render the scene using the CameraManager
    this.cameraManager.renderViews();
  }

  private checkCollectibleCollisions() {
    // Use CollectibleManager to check for collisions
    this.collectibleManager.checkCollectibleCollisions(
      this.playerController.getPosition(),
      this.scene,
      {
        onCollectibleCollected: (collectible, animateFunc) => {
          // Use GameStateManager to handle collectible collected event
          this.gameStateManager.handleCollectibleCollected(collectible, () => {
            // Resume animation when player continues
            this.animate();
          });
        },
        updateScoreOrTimer: () => {
          // Use GameStateManager to update score or timer
          this.gameStateManager.updateScoreOrTime();
        },
        enableMinimap: () => {
          // Enable minimap if in object mode and not already enabled
          if (this.minimapMode === 'object' && !this.cameraManager.isMinimapActive()) {
            this.cameraManager.setMinimapEnabled(true);
          }
        }
      }
    );
  }

  private checkWinCondition() {
    // Use GameStateManager to check win condition
    this.gameStateManager.checkWinCondition(this.playerController.getPosition());
  }

  public dispose() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    // Dispose the PlayerController to remove event listeners
    this.playerController.dispose();

    // Dispose the CollectibleManager
    this.collectibleManager.dispose(this.scene);
    
    // Dispose the UIManager
    this.uiManager.dispose();
    
    // Dispose the CameraManager
    this.cameraManager.dispose();
    
    // Dispose the PositionIndicatorManager
    this.positionIndicatorManager.dispose();
    
    // Dispose of scene objects
    this.scene.traverse((object: THREE.Object3D) => {
      if (object instanceof THREE.Mesh) {
        if (object.geometry) object.geometry.dispose();
        if (object.material instanceof THREE.Material) {
          object.material.dispose();
        } else if (Array.isArray(object.material)) {
          // Handle array of materials
          object.material.forEach((material) => material.dispose());
        }
      }
    });
    
    // Use ResourceManager to dispose of shared resources
    this.resourceManager.dispose();
    
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode) {
      document.body.removeChild(this.renderer.domElement);
    }
  }

  public getScene() { return this.scene; }
  public getMainCamera() { return this.cameraManager.getMainCamera(); }
  public getMiniMapCamera() { return this.cameraManager.getMiniMapCamera(); }

  // Proxy method to delegate to ResourceManager
  public onTexturesLoadedCallback(callback: () => void) {
    this.resourceManager.onTexturesLoadedCallback(callback);
  }
} 