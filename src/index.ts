import { MazeScene, PyramidPlacementMode } from './scene';

let mazeScene: MazeScene | null = null;
let currentPyramidMode: PyramidPlacementMode;
let currentWallTexture: string | undefined;
let currentFloorTexture: string | undefined;
let customWallTexture: string | undefined;
let customFloorTexture: string | undefined;

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
        const currentPyramidModeSelect = document.getElementById('pyramidMode') as HTMLSelectElement;
        const currentMazeSizeSelect = document.getElementById('mazeSize') as HTMLSelectElement;
        const currentPyramidScreenSelect = document.getElementById('pyramidScreenMode') as HTMLSelectElement;
        const currentRedTileVisibilitySelect = document.getElementById('redTileVisibility') as HTMLSelectElement;
        
        const currentMinimapMode = currentMinimapSelect ? currentMinimapSelect.value : 'always';
        const currentPyramidMode = currentPyramidModeSelect ? currentPyramidModeSelect.value : 'closest';
        const currentMazeSize = currentMazeSizeSelect ? currentMazeSizeSelect.value : '8';
        const currentPyramidScreen = currentPyramidScreenSelect ? currentPyramidScreenSelect.value : 'show';
        const currentRedTileVisibility = currentRedTileVisibilitySelect ? currentRedTileVisibilitySelect.value : 'show';

        // Reset texture upload labels
        const wallTextureLabel = document.querySelector('label[for="wallTexture"]');
        const floorTextureLabel = document.querySelector('label[for="floorTexture"]');
        if (wallTextureLabel) wallTextureLabel.textContent = 'Upload Wall Texture (Any Size)';
        if (floorTextureLabel) floorTextureLabel.textContent = 'Upload Floor Texture (Any Size)';

        // Clear custom textures
        customWallTexture = undefined;
        customFloorTexture = undefined;

        // Clear the title screen content and recreate it
        titleScreen.innerHTML = `
            <h1 class="title">3D Maze Game</h1>
            
            <label for="wallTexture" class="texture-label">
                Upload Wall Texture (Any Size)
                <input type="file" id="wallTexture" class="texture-upload" accept="image/*">
            </label>
            
            <label for="floorTexture" class="texture-label">
                Upload Floor Texture (Any Size)
                <input type="file" id="floorTexture" class="texture-upload" accept="image/*">
            </label>

            <select id="pyramidMode" class="menu-button" style="background: #6c757d; text-align: center;">
                <option value="closest">Pyramid on Closest Red Tile</option>
                <option value="random">Pyramid on Random Red Tile</option>
                <option value="all">Pyramids on All Red Tiles</option>
            </select>

            <select id="mazeSize" class="menu-button" style="background: #6c757d; text-align: center;">
                <option value="8">Default Size (8x8)</option>
                <option value="16">Large Size (16x16)</option>
            </select>

            <select id="minimapMode" class="menu-button" style="background: #6c757d; text-align: center;">
                <option value="always">Minimap Always Visible</option>
                <option value="pyramid">Minimap Unlocked by Pyramid</option>
            </select>

            <select id="pyramidScreenMode" class="menu-button" style="background: #6c757d; text-align: center;">
                <option value="show">Show Pyramid Collection Screens</option>
                <option value="hide">Hide Pyramid Collection Screens</option>
            </select>

            <select id="redTileVisibility" class="menu-button" style="background: #6c757d; text-align: center;">
                <option value="show">Show Red Tiles</option>
                <option value="hide">Hide Red Tiles</option>
            </select>
            
            <button id="startTimedLongButton" class="menu-button" style="background: #dc3545;">Start Long Timed Game (120s)</button>
            <button id="startTimedButton" class="menu-button" style="background: #dc3545;">Start Timed Game (60s)</button>
            <button id="startButton" class="menu-button">Start Game</button>
        `;

        // Restore all previous selections
        const newMinimapModeSelect = document.getElementById('minimapMode') as HTMLSelectElement;
        const newPyramidModeSelect = document.getElementById('pyramidMode') as HTMLSelectElement;
        const newMazeSizeSelect = document.getElementById('mazeSize') as HTMLSelectElement;
        const newPyramidScreenSelect = document.getElementById('pyramidScreenMode') as HTMLSelectElement;
        const newRedTileVisibilitySelect = document.getElementById('redTileVisibility') as HTMLSelectElement;
        
        if (newMinimapModeSelect) newMinimapModeSelect.value = currentMinimapMode;
        if (newPyramidModeSelect) newPyramidModeSelect.value = currentPyramidMode;
        if (newMazeSizeSelect) newMazeSizeSelect.value = currentMazeSize;
        if (newPyramidScreenSelect) newPyramidScreenSelect.value = currentPyramidScreen;
        if (newRedTileVisibilitySelect) newRedTileVisibilitySelect.value = currentRedTileVisibility;

        // Reattach all event listeners
        const startButton = document.getElementById('startButton');
        const startTimedButton = document.getElementById('startTimedButton');
        const startTimedLongButton = document.getElementById('startTimedLongButton');
        const wallTextureInput = document.getElementById('wallTexture') as HTMLInputElement;
        const floorTextureInput = document.getElementById('floorTexture') as HTMLInputElement;

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

        // Handle regular start button click
        startButton?.addEventListener('click', () => {
            const selectedMode = newPyramidModeSelect.value as PyramidPlacementMode;
            const selectedSize = parseInt(newMazeSizeSelect.value);
            const selectedMinimapMode = newMinimapModeSelect.value as 'always' | 'pyramid';
            const showPyramidScreens = newPyramidScreenSelect.value === 'show';
            const showRedTiles = newRedTileVisibilitySelect.value === 'show';
            initGame(selectedMode, customWallTexture, customFloorTexture, selectedSize, false, 60, 10, selectedMinimapMode, showPyramidScreens, showRedTiles);
        });

        // Handle 60s timed game button click
        startTimedButton?.addEventListener('click', () => {
            const selectedMode = newPyramidModeSelect.value as PyramidPlacementMode;
            const selectedSize = parseInt(newMazeSizeSelect.value);
            const selectedMinimapMode = newMinimapModeSelect.value as 'always' | 'pyramid';
            const showPyramidScreens = newPyramidScreenSelect.value === 'show';
            const showRedTiles = newRedTileVisibilitySelect.value === 'show';
            initGame(selectedMode, customWallTexture, customFloorTexture, selectedSize, true, 60, 10, selectedMinimapMode, showPyramidScreens, showRedTiles);
        });

        // Handle 120s timed game button click
        startTimedLongButton?.addEventListener('click', () => {
            const selectedMode = newPyramidModeSelect.value as PyramidPlacementMode;
            const selectedSize = parseInt(newMazeSizeSelect.value);
            const selectedMinimapMode = newMinimapModeSelect.value as 'always' | 'pyramid';
            const showPyramidScreens = newPyramidScreenSelect.value === 'show';
            const showRedTiles = newRedTileVisibilitySelect.value === 'show';
            initGame(selectedMode, customWallTexture, customFloorTexture, selectedSize, true, 120, 30, selectedMinimapMode, showPyramidScreens, showRedTiles);
        });
    }
}

// Initialize the game
export function initGame(
    pyramidMode: PyramidPlacementMode, 
    wallTexture?: string, 
    floorTexture?: string, 
    mazeSize: number = 8, 
    isTimedMode: boolean = false,
    initialTime: number = 60,
    timeBonus: number = 10,
    minimapMode: 'always' | 'pyramid' = 'always',
    showPyramidScreens: boolean = true,
    showRedTiles: boolean = true
) {
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
    mazeScene = new MazeScene(
        pyramidMode,
        wallTexture,
        floorTexture,
        mazeSize,
        isTimedMode,
        initialTime,
        timeBonus,
        minimapMode,
        showPyramidScreens,
        showRedTiles
    );

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
    const startTimedButton = document.getElementById('startTimedButton');
    const startTimedLongButton = document.getElementById('startTimedLongButton');
    const pyramidModeSelect = document.getElementById('pyramidMode') as HTMLSelectElement;
    const mazeSizeSelect = document.getElementById('mazeSize') as HTMLSelectElement;
    const minimapModeSelect = document.getElementById('minimapMode') as HTMLSelectElement;
    const pyramidScreenModeSelect = document.getElementById('pyramidScreenMode') as HTMLSelectElement;
    const wallTextureInput = document.getElementById('wallTexture') as HTMLInputElement;
    const floorTextureInput = document.getElementById('floorTexture') as HTMLInputElement;

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

    // Handle regular start button click
    startButton?.addEventListener('click', () => {
        const selectedMode = pyramidModeSelect.value as PyramidPlacementMode;
        const selectedSize = parseInt(mazeSizeSelect.value);
        const selectedMinimapMode = minimapModeSelect.value as 'always' | 'pyramid';
        const showPyramidScreens = pyramidScreenModeSelect.value === 'show';
        const showRedTiles = (document.getElementById('redTileVisibility') as HTMLSelectElement).value === 'show';
        initGame(selectedMode, customWallTexture, customFloorTexture, selectedSize, false, 60, 10, selectedMinimapMode, showPyramidScreens, showRedTiles);
    });

    // Handle 60s timed game button click
    startTimedButton?.addEventListener('click', () => {
        const selectedMode = pyramidModeSelect.value as PyramidPlacementMode;
        const selectedSize = parseInt(mazeSizeSelect.value);
        const selectedMinimapMode = minimapModeSelect.value as 'always' | 'pyramid';
        const showPyramidScreens = pyramidScreenModeSelect.value === 'show';
        const showRedTiles = (document.getElementById('redTileVisibility') as HTMLSelectElement).value === 'show';
        initGame(selectedMode, customWallTexture, customFloorTexture, selectedSize, true, 60, 10, selectedMinimapMode, showPyramidScreens, showRedTiles);
    });

    // Handle 120s timed game button click
    startTimedLongButton?.addEventListener('click', () => {
        const selectedMode = pyramidModeSelect.value as PyramidPlacementMode;
        const selectedSize = parseInt(mazeSizeSelect.value);
        const selectedMinimapMode = minimapModeSelect.value as 'always' | 'pyramid';
        const showPyramidScreens = pyramidScreenModeSelect.value === 'show';
        const showRedTiles = (document.getElementById('redTileVisibility') as HTMLSelectElement).value === 'show';
        initGame(selectedMode, customWallTexture, customFloorTexture, selectedSize, true, 120, 30, selectedMinimapMode, showPyramidScreens, showRedTiles);
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