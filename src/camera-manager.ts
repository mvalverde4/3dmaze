import * as THREE from 'three';

export class CameraManager {
  private mainCamera!: THREE.PerspectiveCamera;
  private miniMapCamera!: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private isMinimapEnabled: boolean;
  private scene: THREE.Scene;
  private mazeSize: number;
  
  // Store bound handlers for cleanup
  private boundHandleResize: () => void;

  constructor(
    scene: THREE.Scene,
    renderer: THREE.WebGLRenderer,
    mazeSize: number,
    minimapEnabled: boolean = true
  ) {
    this.scene = scene;
    this.renderer = renderer;
    this.mazeSize = mazeSize;
    this.isMinimapEnabled = minimapEnabled;
    
    // Initialize cameras
    this.setupCameras();
    
    // Pre-bind event handlers for proper cleanup
    this.boundHandleResize = this.handleResize.bind(this);
    window.addEventListener('resize', this.boundHandleResize);
  }

  private setupCameras(): void {
    // Main (first-person) camera
    this.mainCamera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
    // Main camera only renders layer 0 (the default layer)
    this.mainCamera.layers.set(0);
    
    // Mini-map camera (overhead view)
    this.miniMapCamera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    this.miniMapCamera.position.set(0, this.mazeSize * 2, 0); // Reduced height and removed z-offset
    this.miniMapCamera.lookAt(0, 0, 0);
    this.miniMapCamera.rotation.z = 0; // Ensure no roll rotation
    // Mini-map camera renders both layer 0 (default) and layer 1 (position indicator)
    this.miniMapCamera.layers.enableAll();
  }

  public getMainCamera(): THREE.PerspectiveCamera {
    return this.mainCamera;
  }

  public getMiniMapCamera(): THREE.PerspectiveCamera {
    return this.miniMapCamera;
  }

  public setMinimapEnabled(enabled: boolean): void {
    this.isMinimapEnabled = enabled;
  }

  public isMinimapActive(): boolean {
    return this.isMinimapEnabled;
  }

  public renderViews(): void {
    // Clear everything
    this.renderer.clear();
    this.renderer.clearDepth();
    
    // Render main view (full screen)
    this.renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
    this.renderer.setScissorTest(false);
    this.renderer.render(this.scene, this.mainCamera);

    // Only render minimap if enabled
    if (this.isMinimapEnabled) {
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
  }

  private handleResize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    this.mainCamera.aspect = width / height;
    this.mainCamera.updateProjectionMatrix();
    
    this.renderer.setSize(width, height);
  }

  public dispose(): void {
    window.removeEventListener('resize', this.boundHandleResize);
  }
} 