import { MazeScene, PyramidPlacementMode } from './scene';

let mazeScene: MazeScene | null = null;
let currentPyramidMode: PyramidPlacementMode;
let currentWallTexture: string | undefined;
let currentFloorTexture: string | undefined;

// Function to handle custom texture uploads
function handleTextureUpload(file: File, textureType: 'wall' | 'floor'): Promise<string> {
    return new Promise((resolve, reject) => {
        if (!file.type.startsWith('image/')) {
            reject(new Error('Please upload an image file'));
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                if (img.width !== 1024 || img.height !== 1024) {
                    reject(new Error('Please upload a 1024x1024 image'));
                    return;
                }
                resolve(e.target?.result as string);
            };
            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = e.target?.result as string;
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
    });
}

// Function to show the title screen
function showTitleScreen() {
    const titleScreen = document.getElementById('titleScreen');
    const gameContainer = document.getElementById('game');
    
    if (titleScreen && gameContainer) {
        titleScreen.style.display = 'flex';
        gameContainer.style.display = 'none';
    }

    // Reset texture upload labels
    const wallTextureLabel = document.querySelector('label[for="wallTexture"]');
    const floorTextureLabel = document.querySelector('label[for="floorTexture"]');
    
    if (wallTextureLabel) {
        wallTextureLabel.textContent = 'Upload Wall Texture';
    }
    if (floorTextureLabel) {
        floorTextureLabel.textContent = 'Upload Floor Texture';
    }
}

// Initialize the game
export function initGame(pyramidMode: PyramidPlacementMode, wallTexture?: string, floorTexture?: string) {
    const titleScreen = document.getElementById('titleScreen');
    const gameContainer = document.getElementById('game');
    
    if (titleScreen && gameContainer) {
        titleScreen.style.display = 'none';
        gameContainer.style.display = 'block';
    }

    // Store current settings
    currentPyramidMode = pyramidMode;
    currentWallTexture = wallTexture;
    currentFloorTexture = floorTexture;

    mazeScene = new MazeScene(pyramidMode, wallTexture, floorTexture);
}

// Function to restart the game
export function restartGame() {
    if (mazeScene) {
        mazeScene.dispose();
        mazeScene = null;
    }
    showTitleScreen();
}

// Set up event listeners
document.addEventListener('DOMContentLoaded', () => {
    const startButton = document.getElementById('startButton');
    const wallTextureInput = document.getElementById('wallTexture') as HTMLInputElement;
    const floorTextureInput = document.getElementById('floorTexture') as HTMLInputElement;
    const pyramidModeSelect = document.getElementById('pyramidMode') as HTMLSelectElement;

    let customWallTexture: string | undefined;
    let customFloorTexture: string | undefined;

    // Handle wall texture upload
    wallTextureInput?.addEventListener('change', async (e) => {
        const input = e.target as HTMLInputElement;
        if (input.files && input.files[0]) {
            try {
                customWallTexture = await handleTextureUpload(input.files[0], 'wall');
                const label = input.parentElement;
                if (label) {
                    label.textContent = '✓ Wall Texture Ready';
                }
            } catch (err) {
                if (err instanceof Error) {
                    alert(err.message);
                } else {
                    alert('An error occurred while uploading the wall texture');
                }
            }
        }
    });

    // Handle floor texture upload
    floorTextureInput?.addEventListener('change', async (e) => {
        const input = e.target as HTMLInputElement;
        if (input.files && input.files[0]) {
            try {
                customFloorTexture = await handleTextureUpload(input.files[0], 'floor');
                const label = input.parentElement;
                if (label) {
                    label.textContent = '✓ Floor Texture Ready';
                }
            } catch (err) {
                if (err instanceof Error) {
                    alert(err.message);
                } else {
                    alert('An error occurred while uploading the floor texture');
                }
            }
        }
    });

    // Handle start button click
    startButton?.addEventListener('click', () => {
        const selectedMode = pyramidModeSelect.value as PyramidPlacementMode;
        initGame(selectedMode, customWallTexture, customFloorTexture);
    });

    // Add restart button event listener
    const restartButton = document.getElementById('restartButton');
    if (restartButton) {
        restartButton.addEventListener('click', () => {
            const gameOverScreen = document.getElementById('gameOverScreen');
            if (gameOverScreen) {
                gameOverScreen.style.display = 'none';
            }
            restartGame();
        });
    }
});

// Optional: Add cleanup on window unload
window.addEventListener('unload', () => {
    if (mazeScene) {
        mazeScene.dispose();
    }
});

console.log("Hello from 3D Maze!"); 