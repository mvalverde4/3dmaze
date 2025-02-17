# 3D Maze Game

A browser-based 3D maze game built with Three.js and TypeScript. Navigate through procedurally generated mazes in first-person view with an overhead mini-map for assistance.

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
This will start a development server at `http://localhost:8080` with hot reloading enabled.

### Production Build
```bash
npm run build
```
This will create an optimized production build in the `dist` directory.

## Controls

### Keyboard Controls
- **Arrow Up / W** - Move forward
- **Arrow Down / S** - Move backward
- **Arrow Left / A** - Rotate left
- **Arrow Right / D** - Rotate right

### Mouse Controls
- Click the game window to enable mouse look
- Move the mouse to look around
- Mouse movement is locked when in game mode (click to enable)

### Touch Controls (Mobile)
- Directional pad buttons for movement
- Rotation buttons for turning left/right

## Features

1. **First-Person Navigation**
   - Smooth movement and rotation animations
   - Collision detection with maze walls
   - Mouse-look camera control

2. **Mini-Map**
   - Overhead view of the maze
   - Player position indicator
   - Real-time position tracking

3. **Compass**
   - Direction indicator (N/S/E/W)
   - Updates in real-time with player rotation

4. **Responsive Design**
   - Adapts to different screen sizes
   - Touch controls for mobile devices
   - Fullscreen gameplay

## Customization

### Movement and Rotation Speed
To modify the movement and rotation speeds, edit the following values in `src/player.ts`:

```typescript
private moveSpeed = 0.2;      // Adjust for faster/slower movement
private rotationSpeed = 0.02;  // Adjust for faster/slower rotation
```

### Maze Size
The maze size can be modified in `src/scene.ts`. Look for:
```typescript
const mazeGen = new MazeGenerator(8);  // Change 8 to desired size
```

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