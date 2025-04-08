import * as THREE from 'three';

export class ResourceManager {
  private textureLoader: THREE.TextureLoader;
  private loadingManager: THREE.LoadingManager;
  private wallTexture: THREE.Texture | null = null;
  private floorTexture: THREE.Texture | null = null;
  private customWallTexture: string | undefined;
  private customFloorTexture: string | undefined;
  private wallTextureLoaded: boolean = false;
  private floorTextureLoaded: boolean = false;
  private texturesLoadedCallback: (() => void) | null = null;
  private renderer: THREE.WebGLRenderer;
  private mazeSize: number;
  
  // Shared geometries
  private floorGeometry: THREE.PlaneGeometry | null = null;
  private tileGeometry: THREE.PlaneGeometry | null = null;
  private mainWallGeometryNS: THREE.BoxGeometry | null = null; // North-South walls
  private mainWallGeometryEW: THREE.BoxGeometry | null = null; // East-West walls
  private topWallGeometryNS: THREE.BoxGeometry | null = null;  // North-South top walls
  private topWallGeometryEW: THREE.BoxGeometry | null = null;  // East-West top walls
  private sphereGeometry: THREE.SphereGeometry | null = null;
  private cylinderGeometry: THREE.CylinderGeometry | null = null;
  private cubeGeometry: THREE.BoxGeometry | null = null;
  private pyramidGeometry: THREE.ConeGeometry | null = null;
  
  // Shared materials
  private floorMaterial: THREE.MeshPhongMaterial | null = null;
  private wallMaterial: THREE.MeshPhongMaterial | null = null;
  private wallMaterialNS: THREE.MeshPhongMaterial | null = null; // North-South walls
  private wallMaterialEW: THREE.MeshPhongMaterial | null = null; // East-West walls
  private topWallMaterial: THREE.MeshPhongMaterial | null = null;
  private blueTileMaterial: THREE.MeshPhongMaterial | null = null;
  private greenTileMaterial: THREE.MeshPhongMaterial | null = null;
  private redTileMaterial: THREE.MeshPhongMaterial | null = null;
  private collectibleMaterial: THREE.MeshPhongMaterial | null = null;

  constructor(
    renderer: THREE.WebGLRenderer,
    mazeSize: number = 8,
    wallTexture?: string,
    floorTexture?: string
  ) {
    this.renderer = renderer;
    this.mazeSize = mazeSize;
    this.customWallTexture = wallTexture;
    this.customFloorTexture = floorTexture;
    
    // Initialize loading manager with callbacks
    this.loadingManager = new THREE.LoadingManager();
    this.loadingManager.onLoad = this.onTexturesLoaded.bind(this);
    this.loadingManager.onError = (url) => {
      console.error(`Error loading texture: ${url}`);
    };
    
    // Initialize texture loader with the loading manager
    this.textureLoader = new THREE.TextureLoader(this.loadingManager);
    
    // Initialize shared geometries and materials
    this.initSharedObjects();
    
    // Load textures
    this.loadTextures();
  }

  private initSharedObjects() {
    // Initialize shared geometries
    this.floorGeometry = new THREE.PlaneGeometry(this.mazeSize * 2, this.mazeSize * 2);
    this.tileGeometry = new THREE.PlaneGeometry(2, 2);
    
    // Wall geometries for different orientations
    // Standard box geometry for North-South walls (wider in X direction)
    this.mainWallGeometryNS = new THREE.BoxGeometry(2, 0.8, 0.1);
    
    // For East-West walls, we'll create a rotated version of the NS geometry
    // This ensures that the UV mapping is consistent between both orientations
    this.mainWallGeometryEW = this.mainWallGeometryNS.clone();
    // Rotate the geometry 90 degrees around Y axis to make it face East-West
    this.mainWallGeometryEW.rotateY(Math.PI / 2);
    
    // Do the same for top walls
    this.topWallGeometryNS = new THREE.BoxGeometry(2, 0.2, 0.1);
    this.topWallGeometryEW = this.topWallGeometryNS.clone();
    this.topWallGeometryEW.rotateY(Math.PI / 2);
    
    // Collectible geometries
    this.sphereGeometry = new THREE.SphereGeometry(0.3, 32, 32);
    this.cylinderGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.6, 32);
    this.cubeGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    this.pyramidGeometry = new THREE.ConeGeometry(0.3, 0.6, 4);
    
    // Initialize shared materials
    // Floor material depends on texture, initialize in updateFloorTexture
    this.floorMaterial = new THREE.MeshPhongMaterial({
      color: 0xffffff,
      shininess: 0
    });
    
    // Base wall material (used as template for NS and EW materials)
    this.wallMaterial = new THREE.MeshPhongMaterial({
      color: 0xffffff,
      shininess: 0
    });
    
    // Since we've rotated the geometry, we can use the same material for both orientations
    this.wallMaterialNS = this.wallMaterial.clone();
    this.wallMaterialEW = this.wallMaterial.clone();
    
    // Top wall material is always black
    this.topWallMaterial = new THREE.MeshPhongMaterial({
      color: 0x000000,
      shininess: 0
    });
    
    // Tile materials
    this.blueTileMaterial = new THREE.MeshPhongMaterial({ color: 0x0000ff });
    this.greenTileMaterial = new THREE.MeshPhongMaterial({ color: 0x00ff00 });
    this.redTileMaterial = new THREE.MeshPhongMaterial({ color: 0xff0000 });
    
    // Collectible material (orange)
    this.collectibleMaterial = new THREE.MeshPhongMaterial({ color: 0xFFA500 });
  }

  private loadTextures() {
    console.log('Starting texture loading...');
    
    // Reset texture loaded flags
    this.wallTextureLoaded = false;
    this.floorTextureLoaded = false;
    
    // Load wall texture - only load default if no custom texture is provided
    const wallTexturePath = this.customWallTexture || '/textures/wall.png';
    const floorTexturePath = this.customFloorTexture || '/textures/floor.png';
    
    // Configure loading manager for these specific textures
    let texturesToLoad = 2;
    let texturesLoaded = 0;
    
    const checkAllTexturesLoaded = () => {
      texturesLoaded++;
      if (texturesLoaded === texturesToLoad) {
        this.wallTextureLoaded = true;
        this.floorTextureLoaded = true;
        this.checkTexturesLoaded();
      }
    };
    
    // Load wall texture
    this.textureLoader.load(
      wallTexturePath,
      // Success handler
      (texture) => {
        console.log('Wall texture loaded successfully');
        this.wallTexture = texture;
        this.updateWallTextures(); // Configure and apply texture in a separate method
        checkAllTexturesLoaded();
      },
      // Progress handler
      undefined,
      // Error handler
      (error) => {
        console.error('Error loading wall texture:', error);
        // Try loading default if custom failed
        if (this.customWallTexture) {
          console.log('Attempting to load default wall texture as fallback');
          this.textureLoader.load(
            '/textures/wall.png',
            (texture) => {
              this.wallTexture = texture;
              this.updateWallTextures(); // Configure and apply texture in a separate method
              checkAllTexturesLoaded();
            },
            undefined,
            (fallbackError) => {
              console.error('Error loading fallback wall texture:', fallbackError);
              checkAllTexturesLoaded();
            }
          );
        } else {
          checkAllTexturesLoaded();
        }
      }
    );
    
    // Load floor texture
    this.textureLoader.load(
      floorTexturePath,
      // Success handler
      (texture) => {
        console.log('Floor texture loaded successfully');
        this.floorTexture = texture;
        this.updateFloorTexture(); // Configure and apply texture in a separate method
        checkAllTexturesLoaded();
      },
      // Progress handler
      undefined,
      // Error handler
      (error) => {
        console.error('Error loading floor texture:', error);
        // Try loading default if custom failed
        if (this.customFloorTexture) {
          console.log('Attempting to load default floor texture as fallback');
          this.textureLoader.load(
            '/textures/floor.png',
            (texture) => {
              this.floorTexture = texture;
              this.updateFloorTexture(); // Configure and apply texture in a separate method
              checkAllTexturesLoaded();
            },
            undefined,
            (fallbackError) => {
              console.error('Error loading fallback floor texture:', fallbackError);
              checkAllTexturesLoaded();
            }
          );
        } else {
          checkAllTexturesLoaded();
        }
      }
    );
  }

  private updateWallTextures() {
    if (!this.wallTexture) {
      console.log('No wall texture available for update');
      return;
    }
    
    console.log('Updating wall textures...');
    
    // Configure base texture settings
    this.wallTexture.wrapS = THREE.RepeatWrapping;
    this.wallTexture.wrapT = THREE.RepeatWrapping;
    this.wallTexture.magFilter = THREE.LinearFilter;
    this.wallTexture.minFilter = THREE.LinearMipmapLinearFilter;
    const maxAnisotropy = this.renderer.capabilities.getMaxAnisotropy();
    this.wallTexture.anisotropy = maxAnisotropy;
    
    // Update the base wall material with the texture
    if (this.wallMaterial) {
      this.wallMaterial.map = this.wallTexture;
      this.wallMaterial.needsUpdate = true;
    }
    
    // Since we're using rotated geometries for wall orientations,
    // we can use the exact same texture configuration for both
    if (this.wallMaterialNS) {
      // Clone texture to avoid shared repeat values
      const nsTexture = this.wallTexture.clone();
      nsTexture.wrapS = THREE.RepeatWrapping;
      nsTexture.wrapT = THREE.RepeatWrapping;
      nsTexture.repeat.set(1, 0.8);
      nsTexture.anisotropy = maxAnisotropy;
      
      this.wallMaterialNS.map = nsTexture;
      this.wallMaterialNS.needsUpdate = true;
    }
    
    if (this.wallMaterialEW) {
      // Clone texture to avoid shared properties
      const ewTexture = this.wallTexture.clone();
      ewTexture.wrapS = THREE.RepeatWrapping;
      ewTexture.wrapT = THREE.RepeatWrapping;
      ewTexture.repeat.set(1, 0.8); // Same settings as NS
      ewTexture.anisotropy = maxAnisotropy;
      
      this.wallMaterialEW.map = ewTexture;
      this.wallMaterialEW.needsUpdate = true;
    }
    
    console.log('Updated shared wall materials with texture');
  }

  private updateFloorTexture() {
    if (!this.floorTexture) {
      console.log('No floor texture available for update');
      return;
    }
    
    console.log('Updating floor texture...');
    
    // Configure texture settings once
    this.floorTexture.wrapS = THREE.RepeatWrapping;
    this.floorTexture.wrapT = THREE.RepeatWrapping;
    this.floorTexture.magFilter = THREE.LinearFilter;
    this.floorTexture.minFilter = THREE.LinearMipmapLinearFilter;
    const maxAnisotropy = this.renderer.capabilities.getMaxAnisotropy();
    this.floorTexture.anisotropy = maxAnisotropy;
    this.floorTexture.repeat.set(this.mazeSize, this.mazeSize);
    
    // Update the shared floor material with the texture
    if (this.floorMaterial) {
      this.floorMaterial.map = this.floorTexture;
      this.floorMaterial.needsUpdate = true;
      console.log('Updated shared floor material with texture');
    }
  }

  public onTexturesLoaded() {
    console.log('All textures loaded');
    if (this.texturesLoadedCallback) {
      this.texturesLoadedCallback();
    }
  }

  private checkTexturesLoaded() {
    if (this.wallTextureLoaded && this.floorTextureLoaded && this.texturesLoadedCallback) {
      this.texturesLoadedCallback();
    }
  }

  public onTexturesLoadedCallback(callback: () => void) {
    this.texturesLoadedCallback = callback;
    // Check if textures are already loaded
    if (this.wallTextureLoaded && this.floorTextureLoaded) {
      callback();
    }
  }

  public updateSceneTextures(scene: THREE.Scene) {
    // Update any existing walls and floors in the scene for immediate visual update
    let wallCount = 0;
    let floorCount = 0;
    
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        const material = object.material as THREE.MeshPhongMaterial;
        
        // Update walls
        if (material.color && material.color.getHex() === 0xffffff && object.geometry instanceof THREE.BoxGeometry) {
          wallCount++;
          
          // Check if this is one of our shared materials, if not replace it
          if (material !== this.wallMaterialNS && material !== this.wallMaterialEW) {
            // Determine orientation by checking the object's rotation
            // If it's rotated by PI/2 or 3*PI/2 around Y axis, it's an East-West wall
            const yRotation = object.rotation.y % (2 * Math.PI);
            const isEastWest = Math.abs(yRotation - Math.PI/2) < 0.1 || 
                              Math.abs(yRotation - 3*Math.PI/2) < 0.1;
            
            // Replace with the appropriate material
            object.material = isEastWest ? this.wallMaterialEW! : this.wallMaterialNS!;
          }
        }
        
        // Update floors
        if (material.color && material.color.getHex() === 0xffffff && object.geometry instanceof THREE.PlaneGeometry) {
          floorCount++;
          if (!material.map && this.floorTexture) {
            material.map = this.floorTexture;
            material.needsUpdate = true;
          }
        }
      }
    });
    
    console.log(`Updated ${wallCount} existing wall textures and ${floorCount} existing floor textures`);
  }

  public dispose() {
    // Dispose of shared geometries
    if (this.floorGeometry) this.floorGeometry.dispose();
    if (this.tileGeometry) this.tileGeometry.dispose();
    if (this.mainWallGeometryNS) this.mainWallGeometryNS.dispose();
    if (this.mainWallGeometryEW) this.mainWallGeometryEW.dispose();
    if (this.topWallGeometryNS) this.topWallGeometryNS.dispose();
    if (this.topWallGeometryEW) this.topWallGeometryEW.dispose();
    if (this.sphereGeometry) this.sphereGeometry.dispose();
    if (this.cylinderGeometry) this.cylinderGeometry.dispose();
    if (this.cubeGeometry) this.cubeGeometry.dispose();
    if (this.pyramidGeometry) this.pyramidGeometry.dispose();
    
    // Dispose of shared materials
    if (this.floorMaterial) this.floorMaterial.dispose();
    if (this.wallMaterial) this.wallMaterial.dispose();
    if (this.wallMaterialNS) this.wallMaterialNS.dispose();
    if (this.wallMaterialEW) this.wallMaterialEW.dispose();
    if (this.topWallMaterial) this.topWallMaterial.dispose();
    if (this.blueTileMaterial) this.blueTileMaterial.dispose();
    if (this.greenTileMaterial) this.greenTileMaterial.dispose();
    if (this.redTileMaterial) this.redTileMaterial.dispose();
    if (this.collectibleMaterial) this.collectibleMaterial.dispose();
    
    // Dispose of textures
    if (this.wallTexture && this.wallTexture.dispose) {
      this.wallTexture.dispose();
    }
    
    if (this.floorTexture && this.floorTexture.dispose) {
      this.floorTexture.dispose();
    }
  }

  // Getter methods for resources
  public getFloorGeometry(): THREE.PlaneGeometry | null { return this.floorGeometry; }
  public getTileGeometry(): THREE.PlaneGeometry | null { return this.tileGeometry; }
  public getMainWallGeometryNS(): THREE.BoxGeometry | null { return this.mainWallGeometryNS; }
  public getMainWallGeometryEW(): THREE.BoxGeometry | null { return this.mainWallGeometryEW; }
  public getTopWallGeometryNS(): THREE.BoxGeometry | null { return this.topWallGeometryNS; }
  public getTopWallGeometryEW(): THREE.BoxGeometry | null { return this.topWallGeometryEW; }
  public getSphereGeometry(): THREE.SphereGeometry | null { return this.sphereGeometry; }
  public getCylinderGeometry(): THREE.CylinderGeometry | null { return this.cylinderGeometry; }
  public getCubeGeometry(): THREE.BoxGeometry | null { return this.cubeGeometry; }
  public getPyramidGeometry(): THREE.ConeGeometry | null { return this.pyramidGeometry; }

  public getFloorMaterial(): THREE.MeshPhongMaterial | null { return this.floorMaterial; }
  public getWallMaterial(): THREE.MeshPhongMaterial | null { return this.wallMaterial; }
  public getWallMaterialNS(): THREE.MeshPhongMaterial | null { return this.wallMaterialNS; }
  public getWallMaterialEW(): THREE.MeshPhongMaterial | null { return this.wallMaterialEW; }
  public getTopWallMaterial(): THREE.MeshPhongMaterial | null { return this.topWallMaterial; }
  public getBlueTileMaterial(): THREE.MeshPhongMaterial | null { return this.blueTileMaterial; }
  public getGreenTileMaterial(): THREE.MeshPhongMaterial | null { return this.greenTileMaterial; }
  public getRedTileMaterial(): THREE.MeshPhongMaterial | null { return this.redTileMaterial; }
  public getCollectibleMaterial(): THREE.MeshPhongMaterial | null { return this.collectibleMaterial; }
} 