# 3D Maze Game

A browser-based 3D maze game built with Three.js and TypeScript. Navigate through procedurally generated mazes in first-person view with an overhead mini-map for assistance. Find the pyramid(s) to win!

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
   - Find the pyramid(s) to win
   - No time limit
   - Explore at your own pace

2. **Timed Mode (60s)**
   - Race against time to find pyramids
   - Initial time: 60 seconds
   - Time bonus: +10 seconds per pyramid found

3. **Long Timed Mode (120s)**
   - Extended timed challenge
   - Initial time: 120 seconds
   - Time bonus: +30 seconds per pyramid found

4. **Minimap Visibility**
   - Always Visible: Traditional gameplay with constant minimap
   - Unlocked by Pyramid: Minimap is hidden until collecting first pyramid
   - Compatible with all other game modes and pyramid placement options

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
     - Hidden until first pyramid is collected

3. **Pyramid Placement Options**
   - Closest Red Tile: Pyramid appears on the nearest red tile
   - Random Red Tile: Pyramid appears on a random red tile
   - All Red Tiles: Pyramids appear on all red tiles

4. **Maze Size Options**
   - Default Size: 8x8 maze
   - Large Size: 16x16 maze

5. **Custom Textures**
   - Upload custom wall textures
   - Upload custom floor textures
   - Automatic texture resizing and optimization
   - Supports any image size (automatically converted to 1024x1024)

6. **Responsive Design**
   - Adapts to different screen sizes
   - Touch controls for mobile devices
   - Fullscreen gameplay

## Customization

### Custom Textures
The game supports custom texture uploads for both walls and floors. Images will be automatically:
- Resized to 1024x1024
- Centered and scaled to maintain aspect ratio
- Optimized for game performance

### Maze Size
Two preset sizes are available:
- Default: 8x8 maze
- Large: 16x16 maze

### Camera Settings
Camera field of view and other properties can be adjusted in `src/scene.ts`:
```typescript
this.mainCamera = new THREE.PerspectiveCamera(
    75,                         // Field of view
    window.innerWidth/window.innerHeight,  // Aspect ratio
    0.1,                       // Near plane
    1000                       // Far plane
);
```

## Contributing

Feel free to submit issues and enhancement requests!

## License

This project is open source and available under the MIT License. 