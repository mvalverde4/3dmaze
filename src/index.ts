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
                // Create a canvas to resize the image
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Set canvas size to 1024x1024
                canvas.width = 1024;
                canvas.height = 1024;

                if (ctx) {
                    // Use better image smoothing
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';

                    // Clear the canvas
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);

                    // Calculate scaling to maintain aspect ratio
                    const scale = Math.max(canvas.width / img.width, canvas.height / img.height);
                    const x = (canvas.width - img.width * scale) / 2;
                    const y = (canvas.height - img.height * scale) / 2;

                    // Draw the image centered and scaled
                    ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

                    // Convert to data URL
                    const dataUrl = canvas.toDataURL('image/png');
                    resolve(dataUrl);
                } else {
                    reject(new Error('Could not get canvas context'));
                }
            };
            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = e.target?.result as string;
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
    });
}

// Function to show the title screen after game over
function showRestartScreen() {
    const titleScreen = document.getElementById('titleScreen');
    const gameContainer = document.getElementById('game');
    
    if (titleScreen && gameContainer) {
        titleScreen.style.display = 'flex';
        gameContainer.style.display = 'none';

        // Clear the title screen content
        titleScreen.innerHTML = `
            <h1 class="title">3D Maze Game</h1>
            
            <select id="pyramidMode" class="menu-button" style="background: #6c757d; text-align: center;">
                <option value="closest">Pyramid on Closest Red Tile</option>
                <option value="random">Pyramid on Random Red Tile</option>
                <option value="all">Pyramids on All Red Tiles</option>
            </select>

            <select id="mazeSize" class="menu-button" style="background: #6c757d; text-align: center;">
                <option value="8">Default Size (8x8)</option>
                <option value="16">Large Size (16x16)</option>
            </select>
            
            <button id="startButton" class="menu-button">Start New Game</button>
        `;

        // Reattach start button event listener
        const startButton = document.getElementById('startButton');
        const pyramidModeSelect = document.getElementById('pyramidMode') as HTMLSelectElement;
        const mazeSizeSelect = document.getElementById('mazeSize') as HTMLSelectElement;

        startButton?.addEventListener('click', () => {
            const selectedMode = pyramidModeSelect.value as PyramidPlacementMode;
            const selectedSize = parseInt(mazeSizeSelect.value);
            // Use the existing textures for the new game
            initGame(selectedMode, currentWallTexture, currentFloorTexture, selectedSize);
        });
    }
}

// Initialize the game
export function initGame(pyramidMode: PyramidPlacementMode, wallTexture?: string, floorTexture?: string, mazeSize: number = 8) {
    const titleScreen = document.getElementById('titleScreen');
    const gameContainer = document.getElementById('game');
    const loadingScreen = document.getElementById('loadingScreen');
    
    if (titleScreen && gameContainer && loadingScreen) {
        titleScreen.style.display = 'none';
        loadingScreen.style.display = 'flex';
        gameContainer.style.display = 'none';
    }

    // Store current settings
    currentPyramidMode = pyramidMode;
    currentWallTexture = wallTexture;
    currentFloorTexture = floorTexture;

    // Create new maze scene
    mazeScene = new MazeScene(pyramidMode, wallTexture, floorTexture, mazeSize);

    // Wait for textures to load
    mazeScene.onTexturesLoaded(() => {
        if (loadingScreen && gameContainer) {
            loadingScreen.style.display = 'none';
            gameContainer.style.display = 'block';
        }
    });
}

// Function to restart the game
export function restartGame() {
    if (mazeScene) {
        mazeScene.dispose();
        mazeScene = null;
    }
    showRestartScreen();
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
        const mazeSizeSelect = document.getElementById('mazeSize') as HTMLSelectElement;
        const selectedSize = parseInt(mazeSizeSelect.value);
        initGame(selectedMode, customWallTexture, customFloorTexture, selectedSize);
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