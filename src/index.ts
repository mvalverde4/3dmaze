import { MazeScene, ObjectPlacementMode } from './scene';

let mazeScene: MazeScene | null = null;
let currentObjectMode: ObjectPlacementMode;
let currentWallTexture: string | undefined;
let currentFloorTexture: string | undefined;
let customWallTexture: string | undefined;
let customFloorTexture: string | undefined;
let currentObjectShape: string = 'mixed';

// Helper function to check if storage is available
function isStorageAvailable(type: 'localStorage' | 'sessionStorage'): boolean {
  try {
    const storage = window[type];
    const x = '__storage_test__';
    storage.setItem(x, x);
    storage.removeItem(x);
    return true;
  } catch (e) {
    return false;
  }
}

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

        // Store the current settings before clearing the screen
        const currentMinimapSelect = document.getElementById('minimapMode') as HTMLSelectElement;
        const currentObjectModeSelect = document.getElementById('objectMode') as HTMLSelectElement;
        const currentMazeSizeSelect = document.getElementById('mazeSize') as HTMLSelectElement;
        const currentObjectScreenSelect = document.getElementById('objectScreenMode') as HTMLSelectElement;
        const currentRedTileVisibilitySelect = document.getElementById('redTileVisibility') as HTMLSelectElement;
        const currentObjectShapeSelect = document.getElementById('objectShape') as HTMLSelectElement;
        
        const currentMinimapMode = currentMinimapSelect ? currentMinimapSelect.value : 'always';
        const currentObjectMode = currentObjectModeSelect ? currentObjectModeSelect.value : 'closest';
        const currentMazeSize = currentMazeSizeSelect ? currentMazeSizeSelect.value : '8';
        const currentObjectScreen = currentObjectScreenSelect ? currentObjectScreenSelect.value : 'show';
        const currentRedTileVisibility = currentRedTileVisibilitySelect ? currentRedTileVisibilitySelect.value : 'show';
        const currentShape = currentObjectShapeSelect ? currentObjectShapeSelect.value : 'mixed';

        // Reset texture button labels
        const wallTextureButton = document.getElementById('wallTextureButton');
        const floorTextureButton = document.getElementById('floorTextureButton');
        
        if (wallTextureButton) wallTextureButton.textContent = 'Upload Wall Texture';
        if (floorTextureButton) floorTextureButton.textContent = 'Upload Floor Texture';

        // Clear custom textures
        customWallTexture = undefined;
        customFloorTexture = undefined;

        // Restore all previous selections
        if (currentMinimapSelect) currentMinimapSelect.value = currentMinimapMode;
        if (currentObjectModeSelect) currentObjectModeSelect.value = currentObjectMode;
        if (currentMazeSizeSelect) currentMazeSizeSelect.value = currentMazeSize;
        if (currentObjectScreenSelect) currentObjectScreenSelect.value = currentObjectScreen;
        if (currentRedTileVisibilitySelect) currentRedTileVisibilitySelect.value = currentRedTileVisibility;
        if (currentObjectShapeSelect) currentObjectShapeSelect.value = currentShape;

        // Set up texture upload button event listeners
        const wallTextureInput = document.getElementById('wallTexture') as HTMLInputElement;
        const floorTextureInput = document.getElementById('floorTexture') as HTMLInputElement;
        
        if (wallTextureButton && wallTextureInput) {
            wallTextureButton.addEventListener('click', () => {
                wallTextureInput.click();
            });
        }
        
        if (floorTextureButton && floorTextureInput) {
            floorTextureButton.addEventListener('click', () => {
                floorTextureInput.click();
            });
        }

        // Handle wall texture upload
        wallTextureInput?.addEventListener('change', async (e) => {
            const input = e.target as HTMLInputElement;
            if (input.files && input.files[0]) {
                try {
                    customWallTexture = await handleTextureUpload(input.files[0], 'wall');
                    if (wallTextureButton) {
                        wallTextureButton.textContent = '✓ Wall Texture Ready';
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
                    if (floorTextureButton) {
                        floorTextureButton.textContent = '✓ Floor Texture Ready';
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

        // Get buttons
        const startButton = document.getElementById('startButton');
        const startTimedButton = document.getElementById('startTimedButton');
        const startTimedLongButton = document.getElementById('startTimedLongButton');
        const objectShapeSelect = document.getElementById('objectShape') as HTMLSelectElement;

        // Handle regular start button click
        startButton?.addEventListener('click', () => {
            const selectedMode = currentObjectModeSelect.value as ObjectPlacementMode;
            const selectedSize = parseInt(currentMazeSizeSelect.value);
            const selectedMinimapMode = currentMinimapSelect.value as 'always' | 'object';
            const showObjectScreens = currentObjectScreenSelect.value === 'show';
            const showRedTiles = currentRedTileVisibilitySelect.value === 'show';
            initGame(selectedMode, customWallTexture, customFloorTexture, selectedSize, false, 60, 10, selectedMinimapMode, showObjectScreens, showRedTiles, currentShape);
        });

        // Handle 60s timed game button click
        startTimedButton?.addEventListener('click', () => {
            const selectedMode = currentObjectModeSelect.value as ObjectPlacementMode;
            const selectedSize = parseInt(currentMazeSizeSelect.value);
            const selectedMinimapMode = currentMinimapSelect.value as 'always' | 'object';
            const showObjectScreens = currentObjectScreenSelect.value === 'show';
            const showRedTiles = currentRedTileVisibilitySelect.value === 'show';
            initGame(selectedMode, customWallTexture, customFloorTexture, selectedSize, true, 60, 10, selectedMinimapMode, showObjectScreens, showRedTiles, currentShape);
        });

        // Handle 120s timed game button click
        startTimedLongButton?.addEventListener('click', () => {
            const selectedMode = currentObjectModeSelect.value as ObjectPlacementMode;
            const selectedSize = parseInt(currentMazeSizeSelect.value);
            const selectedMinimapMode = currentMinimapSelect.value as 'always' | 'object';
            const showObjectScreens = currentObjectScreenSelect.value === 'show';
            const showRedTiles = currentRedTileVisibilitySelect.value === 'show';
            initGame(selectedMode, customWallTexture, customFloorTexture, selectedSize, true, 120, 30, selectedMinimapMode, showObjectScreens, showRedTiles, currentShape);
        });

        // Add event listener for object shape selector
        objectShapeSelect?.addEventListener('change', (event) => {
            const target = event.target as HTMLSelectElement;
            currentObjectShape = target.value;
            console.log('Shape selector changed to:', currentObjectShape);
        });
    }
}

// Initialize the game
export function initGame(
    objectMode: ObjectPlacementMode, 
    wallTexture?: string, 
    floorTexture?: string, 
    mazeSize: number = 8, 
    isTimedMode: boolean = false,
    initialTime: number = 60,
    timeBonus: number = 10,
    minimapMode: 'always' | 'object' = 'always',
    showObjectScreens: boolean = true,
    showRedTiles: boolean = true,
    objectShape: string = 'mixed'
) {
    console.log('initGame called with objectShape:', objectShape);
    const titleScreen = document.getElementById('titleScreen');
    const gameContainer = document.getElementById('game');
    const loadingScreen = document.getElementById('loadingScreen');
    
    if (titleScreen && gameContainer && loadingScreen) {
        titleScreen.style.display = 'none';
        loadingScreen.style.display = 'flex';
        gameContainer.style.display = 'none';
    }

    // Store current settings
    currentObjectMode = objectMode;
    currentWallTexture = wallTexture;
    currentFloorTexture = floorTexture;
    currentObjectShape = objectShape;
    console.log('currentObjectShape set to:', currentObjectShape);

    // Create new maze scene
    mazeScene = new MazeScene(
        objectMode,
        wallTexture,
        floorTexture,
        mazeSize,
        isTimedMode,
        initialTime,
        timeBonus,
        minimapMode,
        showObjectScreens,
        showRedTiles,
        objectShape
    );

    // Wait for textures to load
    mazeScene.onTexturesLoadedCallback(() => {
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
    const startTimedButton = document.getElementById('startTimedButton');
    const startTimedLongButton = document.getElementById('startTimedLongButton');
    const objectModeSelect = document.getElementById('objectMode') as HTMLSelectElement;
    const mazeSizeSelect = document.getElementById('mazeSize') as HTMLSelectElement;
    const minimapModeSelect = document.getElementById('minimapMode') as HTMLSelectElement;
    const objectScreenModeSelect = document.getElementById('objectScreenMode') as HTMLSelectElement;
    const wallTextureInput = document.getElementById('wallTexture') as HTMLInputElement;
    const floorTextureInput = document.getElementById('floorTexture') as HTMLInputElement;
    const objectShapeSelect = document.getElementById('objectShape') as HTMLSelectElement;
    
    // Handle wall texture button click
    const wallTextureButton = document.getElementById('wallTextureButton');
    if (wallTextureButton && wallTextureInput) {
        wallTextureButton.addEventListener('click', () => {
            wallTextureInput.click();
        });
    }
    
    // Handle floor texture button click
    const floorTextureButton = document.getElementById('floorTextureButton');
    if (floorTextureButton && floorTextureInput) {
        floorTextureButton.addEventListener('click', () => {
            floorTextureInput.click();
        });
    }

    // Handle wall texture upload
    wallTextureInput?.addEventListener('change', async (e) => {
        const input = e.target as HTMLInputElement;
        if (input.files && input.files[0]) {
            try {
                customWallTexture = await handleTextureUpload(input.files[0], 'wall');
                const wallTextureButton = document.getElementById('wallTextureButton');
                if (wallTextureButton) {
                    wallTextureButton.textContent = '✓ Wall Texture Ready';
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
                const floorTextureButton = document.getElementById('floorTextureButton');
                if (floorTextureButton) {
                    floorTextureButton.textContent = '✓ Floor Texture Ready';
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

    // Handle regular start button click
    startButton?.addEventListener('click', () => {
        const selectedMode = objectModeSelect?.value as ObjectPlacementMode;
        const selectedSize = parseInt(mazeSizeSelect?.value || '8');
        const selectedMinimapMode = minimapModeSelect?.value as 'always' | 'object';
        const showObjectScreens = objectScreenModeSelect?.value === 'show';
        const showRedTiles = (document.getElementById('redTileVisibility') as HTMLSelectElement)?.value === 'show';
        console.log('Start button clicked with currentObjectShape:', currentObjectShape);
        initGame(selectedMode, customWallTexture, customFloorTexture, selectedSize, false, 60, 10, selectedMinimapMode, showObjectScreens, showRedTiles, currentObjectShape);
    });

    // Handle 60s timed game button click
    startTimedButton?.addEventListener('click', () => {
        const selectedMode = objectModeSelect?.value as ObjectPlacementMode;
        const selectedSize = parseInt(mazeSizeSelect?.value || '8');
        const selectedMinimapMode = minimapModeSelect?.value as 'always' | 'object';
        const showObjectScreens = objectScreenModeSelect?.value === 'show';
        const showRedTiles = (document.getElementById('redTileVisibility') as HTMLSelectElement)?.value === 'show';
        initGame(selectedMode, customWallTexture, customFloorTexture, selectedSize, true, 60, 10, selectedMinimapMode, showObjectScreens, showRedTiles, currentObjectShape);
    });

    // Handle 120s timed game button click
    startTimedLongButton?.addEventListener('click', () => {
        const selectedMode = objectModeSelect?.value as ObjectPlacementMode;
        const selectedSize = parseInt(mazeSizeSelect?.value || '8');
        const selectedMinimapMode = minimapModeSelect?.value as 'always' | 'object';
        const showObjectScreens = objectScreenModeSelect?.value === 'show';
        const showRedTiles = (document.getElementById('redTileVisibility') as HTMLSelectElement)?.value === 'show';
        initGame(selectedMode, customWallTexture, customFloorTexture, selectedSize, true, 120, 30, selectedMinimapMode, showObjectScreens, showRedTiles, currentObjectShape);
    });

    // Add event listener for object shape selector
    objectShapeSelect?.addEventListener('change', (event) => {
        const target = event.target as HTMLSelectElement;
        currentObjectShape = target.value;
        console.log('Shape selector changed to:', currentObjectShape);
    });
});

// Optional: Add cleanup on window unload
window.addEventListener('unload', () => {
    if (mazeScene) {
        mazeScene.dispose();
    }
});

console.log("Hello from 3D Maze!"); 