# 3D Maze Game

A browser-based 3D maze game built with Three.js and TypeScript. Navigate through procedurally generated mazes in first-person view with an overhead mini-map for assistance. Find the collectible objects to win!

## Technologies Used

- **TypeScript** - Main programming language
- **Three.js** - 3D graphics library
- **Webpack** - Module bundler
- **HTML5/CSS3** - Frontend structure and styling

## Prerequisites

- Node.js (Latest LTS version recommended)
- npm (Comes with Node.js)

## Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

## Running the Application

### Development Mode
```bash
npm run dev
```
This will start a development server at `http://localhost:9001` with hot reloading enabled.

### Production Build
```bash
npm run build
```
This will create an optimized production build in the `dist` directory.

## Controls

### Keyboard Controls
- **Arrow Keys** - Move and rotate the camera
  - Up Arrow - Move forward
  - Down Arrow - Move backward
  - Left Arrow - Rotate left
  - Right Arrow - Rotate right

### Mouse Controls
- Click the game window to enable mouse look
- Move the mouse to look around
- Mouse movement is locked when in game mode (click to enable)
- Press ESC to exit mouse look mode

### Touch Controls (Mobile)
- Directional pad buttons for movement
- Rotation buttons for turning left/right

## Game Modes

1. **Classic Mode**
   - Find the collectible object(s) to win
   - No time limit
   - Explore at your own pace

2. **Timed Mode (60s)**
   - Race against time to find collectibles
   - Initial time: 60 seconds
   - Time bonus: +10 seconds per collectible found

3. **Long Timed Mode (120s)**
   - Extended timed challenge
   - Initial time: 120 seconds
   - Time bonus: +30 seconds per collectible found

4. **Minimap Visibility**
   - Always Visible: Traditional gameplay with constant minimap
   - Unlocked by Collection: Minimap is hidden until collecting first object
   - Compatible with all other game modes and object placement options

## Features

1. **First-Person Navigation**
   - Smooth movement and rotation animations
   - Collision detection with maze walls
   - Mouse-look camera control

2. **Mini-Map**
   - Overhead view of the maze
   - Player position indicator
   - Real-time position tracking
   - Two visibility modes:
     - Always visible
     - Hidden until first collectible is found

3. **Object Placement Options**
   - Closest Red Tile: Object appears on the nearest red tile
   - Random Red Tile: Object appears on a random red tile
   - All Red Tiles: Objects appear on all red tiles

4. **Object Shape Options**
   - Mixed Shapes: Random selection of all available shapes
   - Pyramid: Only pyramid-shaped collectibles
   - Sphere: Only sphere-shaped collectibles
   - Cylinder: Only cylinder-shaped collectibles
   - Cube: Only cube-shaped collectibles

5. **Maze Size Options**
   - Default Size: 8x8 maze
   - Large Size: 16x16 maze

6. **Custom Textures**
   - Upload custom wall textures
   - Upload custom floor textures
   - Automatic texture resizing and optimization
   - Supports any image size (automatically converted to 1024x1024)

7. **Responsive Design**
   - Adapts to different screen sizes
   - Touch controls for mobile devices
   - Fullscreen gameplay

## Customization and Code Modification

### Camera Settings

The camera settings can be modified in `src/scene.ts`. Look for the `setupCamera` method:

```typescript
private setupCamera(): void {
    this.mainCamera = new THREE.PerspectiveCamera(
        75,                                    // Field of view (FOV) in degrees
        window.innerWidth/window.innerHeight,  // Aspect ratio
        0.1,                                   // Near clipping plane
        1000                                   // Far clipping plane
    );
    
    // Camera height from the ground
    this.mainCamera.position.y = 0.5;
}
```

- **Field of View (FOV)**: Increase for a wider view angle, decrease for a narrower, more zoomed-in view
- **Camera Height**: Modify `this.mainCamera.position.y` to change the player's eye level
- **Near/Far Clipping Planes**: Adjust these values to change what's visible in the scene

### Wall Height and Appearance

Wall height and appearance can be modified in the `createWalls` method in `src/scene.ts`:

```typescript
private createWalls(): void {
    // Wall dimensions
    const wallHeight = 1.0;  // Height of the walls
    const wallThickness = 0.1;  // Thickness of the walls
    
    // Wall material
    const wallMaterial = new THREE.MeshStandardMaterial({
        map: this.wallTexture,
        roughness: 0.7,  // Surface roughness
        metalness: 0.2   // Metallic look
    });
    
    // ... rest of the method
}
```

- **Wall Height**: Modify `wallHeight` to make walls taller or shorter
- **Wall Thickness**: Adjust `wallThickness` to change wall width
- **Material Properties**: Change `roughness` and `metalness` to alter the wall's appearance

### Maze Generation and Configuration

The maze generation logic is in `src/maze.ts`. Key parameters to modify:

```typescript
// In the Maze class constructor
constructor(size: number = 8) {
    this.size = size;
    this.grid = this.initializeGrid(size);
    this.generateMaze();
}

// To modify the maze generation algorithm
private generateMaze(): void {
    // ... maze generation code
    
    // Adjust these values to change maze complexity
    const branchingProbability = 0.3;  // Probability of creating branches
    const loopProbability = 0.1;       // Probability of creating loops
    
    // ... rest of the method
}
```

- **Maze Size**: Change the default size in the constructor
- **Branching Probability**: Higher values create more complex mazes with more branches
- **Loop Probability**: Higher values create more loops in the maze (multiple paths to the same location)

### Lighting Configuration

Lighting can be adjusted in the `setupLights` method in `src/scene.ts`:

```typescript
private setupLights(): void {
    // Ambient light for general scene illumination
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);
    
    // Directional light to simulate sunlight
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7);
    directionalLight.castShadow = true;
    this.scene.add(directionalLight);
    
    // ... additional lights
}
```

- **Ambient Light Intensity**: The second parameter (0.5) controls overall scene brightness
- **Directional Light Intensity**: The second parameter (0.8) controls the intensity of the main light
- **Light Position**: Change `directionalLight.position.set(x, y, z)` to alter shadow directions

### Collectible Objects Configuration

Collectible objects can be customized in the `createCollectible` method in `src/scene.ts`:

```typescript
private createCollectible(position: THREE.Vector3): THREE.Object3D {
    let collectible: THREE.Object3D;
    
    // Object size
    const objectSize = 0.2;
    
    // Object material
    const objectMaterial = new THREE.MeshStandardMaterial({
        color: 0xffff00,  // Yellow color
        roughness: 0.3,
        metalness: 0.7,
        emissive: 0xffff00,
        emissiveIntensity: 0.2
    });
    
    // Create different shapes based on the selected shape option
    switch(this.objectShape) {
        // ... shape creation code
    }
    
    // ... rest of the method
}
```

- **Object Size**: Modify `objectSize` to change the collectible size
- **Object Material**: Adjust color, roughness, metalness, and emissive properties
- **Object Shapes**: Add new shapes by extending the switch statement

### Movement and Collision Detection

Player movement and collision detection can be modified in `src/scene.ts`:

```typescript
// Movement speed
private readonly MOVEMENT_SPEED = 0.05;
private readonly ROTATION_SPEED = 0.03;

// Collision detection in the canMove method
private canMove(direction: THREE.Vector3): boolean {
    // ... collision detection logic
    
    // Grid cell size for collision detection
    const cellSize = 1.0;
    
    // Player collision radius
    const playerRadius = 0.2;
    
    // ... rest of the method
}
```

- **Movement Speed**: Adjust `MOVEMENT_SPEED` to change how fast the player moves
- **Rotation Speed**: Modify `ROTATION_SPEED` to change how fast the player turns
- **Player Collision Radius**: Change `playerRadius` to adjust how close the player can get to walls

## Performance Optimization

If you need to optimize the game for better performance:

1. **Reduce Texture Sizes**: Lower the resolution of textures in the `handleTextureUpload` function in `src/index.ts`
2. **Simplify Geometry**: Use lower polygon counts for objects in the scene
3. **Adjust Render Quality**: Modify the renderer settings in the `setupRenderer` method in `src/scene.ts`
4. **Limit Visible Objects**: Implement frustum culling to only render objects in the camera's view

## Contributing

Feel free to submit issues and enhancement requests!

## License

This project is open source and available under the MIT License. 