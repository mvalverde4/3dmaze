import { MazeScene } from './scene';

// Create and initialize the maze scene
const mazeScene = new MazeScene();

// Optional: Add cleanup on window unload
window.addEventListener('unload', () => {
    mazeScene.dispose();
});

console.log("Hello from 3D Maze!"); 