import * as THREE from 'three';
import { PlayerController } from '../player-controller';
import { restartGame } from '../index';

export class UIManager {
  // UI elements
  private scoreDisplay: HTMLDivElement | null = null;
  private timerDisplay: HTMLDivElement | null = null;
  private compass: HTMLDivElement | null = null;
  private controlButtons: HTMLDivElement | null = null;
  
  // Game state references
  private isTimedMode: boolean;
  private score: number = 0;
  private timeRemaining: number = 60;
  private timerPaused: boolean = false;
  private timerInterval: NodeJS.Timeout | null = null;

  constructor(
    isTimedMode: boolean = false, 
    initialTime: number = 60,
    timeBonus: number = 10,
    private playerController: PlayerController | null = null
  ) {
    this.isTimedMode = isTimedMode;
    this.timeRemaining = initialTime;
    
    // Create appropriate displays based on game mode
    this.createScoreOrTimerDisplay();
    this.createCompassIndicator();
    
    // Only create control buttons if we have a player controller
    if (this.playerController) {
      this.createControlButtons();
    }
  }

  // Method to set player controller after initialization
  public setPlayerController(playerController: PlayerController): void {
    this.playerController = playerController;
    // Create control buttons now that we have a player controller
    this.createControlButtons();
  }

  // Create score or timer display based on game mode
  private createScoreOrTimerDisplay(): void {
    if (this.isTimedMode) {
      // Create a Windows 98 style timer display
      this.timerDisplay = document.createElement('div');
      this.timerDisplay.classList.add('window', 'timer-display');
      this.timerDisplay.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 1000;
        width: 140px;
      `;
      
      const titleBar = document.createElement('div');
      titleBar.classList.add('title-bar');
      
      const titleBarText = document.createElement('div');
      titleBarText.classList.add('title-bar-text');
      titleBarText.textContent = 'Time Remaining';
      
      titleBar.appendChild(titleBarText);
      
      const windowBody = document.createElement('div');
      windowBody.classList.add('window-body');
      windowBody.style.padding = '8px';
      windowBody.style.textAlign = 'center';
      
      const timeValue = document.createElement('p');
      timeValue.style.margin = '0';
      timeValue.style.fontWeight = 'bold';
      timeValue.id = 'time-value';
      timeValue.textContent = `${this.timeRemaining}s`;
      
      windowBody.appendChild(timeValue);
      
      this.timerDisplay.appendChild(titleBar);
      this.timerDisplay.appendChild(windowBody);
      
      document.body.appendChild(this.timerDisplay);
      this.startTimer();
    } else {
      // Create a Windows 98 style score display
      this.scoreDisplay = document.createElement('div');
      this.scoreDisplay.classList.add('window', 'score-display');
      this.scoreDisplay.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 1000;
        width: 140px;
      `;
      
      const titleBar = document.createElement('div');
      titleBar.classList.add('title-bar');
      
      const titleBarText = document.createElement('div');
      titleBarText.classList.add('title-bar-text');
      titleBarText.textContent = 'Score';
      
      titleBar.appendChild(titleBarText);
      
      const windowBody = document.createElement('div');
      windowBody.classList.add('window-body');
      windowBody.style.padding = '8px';
      windowBody.style.textAlign = 'center';
      
      const scoreValue = document.createElement('p');
      scoreValue.style.margin = '0';
      scoreValue.style.fontWeight = 'bold';
      scoreValue.id = 'score-value';
      scoreValue.textContent = `${this.score}`;
      
      windowBody.appendChild(scoreValue);
      
      this.scoreDisplay.appendChild(titleBar);
      this.scoreDisplay.appendChild(windowBody);
      
      document.body.appendChild(this.scoreDisplay);
    }
  }

  private createCompassIndicator(): void {
    // Create a Windows 98 style compass indicator
    this.compass = document.createElement('div');
    this.compass.classList.add('window', 'compass-display');
    this.compass.style.cssText = `
      position: fixed;
      top: 20px;
      left: 20px;
      z-index: 1000;
      width: 80px;
    `;
    
    const titleBar = document.createElement('div');
    titleBar.classList.add('title-bar');
    
    const titleBarText = document.createElement('div');
    titleBarText.classList.add('title-bar-text');
    titleBarText.textContent = 'Compass';
    
    titleBar.appendChild(titleBarText);
    
    const windowBody = document.createElement('div');
    windowBody.classList.add('window-body');
    windowBody.style.padding = '8px';
    windowBody.style.textAlign = 'center';
    
    const compassValue = document.createElement('p');
    compassValue.style.margin = '0';
    compassValue.style.fontWeight = 'bold';
    compassValue.id = 'compass';
    compassValue.textContent = 'N';
    
    windowBody.appendChild(compassValue);
    
    this.compass.appendChild(titleBar);
    this.compass.appendChild(windowBody);
    
    document.body.appendChild(this.compass);
  }

  private createControlButtons(): void {
    if (!this.playerController) return;

    this.controlButtons = document.createElement('div');
    this.controlButtons.classList.add('window', 'controls-display');
    this.controlButtons.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 20px;
      z-index: 1000;
      width: 200px;
    `;
    
    const titleBar = document.createElement('div');
    titleBar.classList.add('title-bar');
    
    const titleBarText = document.createElement('div');
    titleBarText.classList.add('title-bar-text');
    titleBarText.textContent = 'Controls';
    
    titleBar.appendChild(titleBarText);
    
    const windowBody = document.createElement('div');
    windowBody.classList.add('window-body');
    windowBody.style.padding = '12px';
    
    const controlsGrid = document.createElement('div');
    controlsGrid.style.cssText = `
      display: grid;
      grid-template-columns: repeat(3, 36px);
      grid-template-rows: repeat(3, 36px);
      grid-template-areas:
        ". up ."
        "left . right"
        ". down .";
      gap: 6px;
      justify-content: center;
    `;
    
    const createButton = (text: string, gridArea: string, onClick: () => void) => {
      const button = document.createElement('button');
      button.textContent = text;
      button.style.gridArea = gridArea;
      button.style.width = '36px';
      button.style.height = '36px';
      button.style.display = 'flex';
      button.style.justifyContent = 'center';
      button.style.alignItems = 'center';
      button.style.padding = '0';
      button.style.margin = '0';
      button.style.fontSize = '18px';
      button.addEventListener('click', onClick);
      return button;
    };
    
    // Create the buttons with arrow symbols connected to playerController methods
    controlsGrid.appendChild(createButton('↑', 'up', () => this.playerController!.moveForward()));
    controlsGrid.appendChild(createButton('←', 'left', () => this.playerController!.rotateLeft()));
    controlsGrid.appendChild(createButton('→', 'right', () => this.playerController!.rotateRight()));
    controlsGrid.appendChild(createButton('↓', 'down', () => this.playerController!.moveBackward()));
    
    windowBody.appendChild(controlsGrid);
    
    this.controlButtons.appendChild(titleBar);
    this.controlButtons.appendChild(windowBody);
    
    document.body.appendChild(this.controlButtons);
  }

  // Update methods
  public updateCompassDirection(rotation: number): void {
    const compassElement = document.getElementById('compass');
    if (!compassElement) return;

    // Normalize rotation to 0-2π range
    const normalizedRotation = ((rotation % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    
    // Determine direction based on rotation
    let direction = 'N';
    if (Math.abs(normalizedRotation - 0) < 0.1) direction = 'N';
    else if (Math.abs(normalizedRotation - Math.PI) < 0.1) direction = 'S';
    else if (Math.abs(normalizedRotation - Math.PI/2) < 0.1) direction = 'W';
    else if (Math.abs(normalizedRotation - (3 * Math.PI/2)) < 0.1) direction = 'E';
    
    compassElement.textContent = direction;
  }

  public updateScore(value: number): void {
    this.score = value;
    this.updateScoreDisplay();
  }

  public incrementScore(): void {
    this.score++;
    this.updateScoreDisplay();
  }

  private updateScoreDisplay(): void {
    const scoreElement = document.getElementById('score-value');
    if (scoreElement) {
      scoreElement.textContent = `${this.score}`;
    }
  }

  public updateTimer(value: number): void {
    this.timeRemaining = value;
    this.updateTimerDisplay();
  }

  public addTimeBonus(bonus: number): void {
    this.timeRemaining += bonus;
    this.updateTimerDisplay();
  }

  private updateTimerDisplay(): void {
    const timeElement = document.getElementById('time-value');
    if (timeElement) {
      timeElement.textContent = `${this.timeRemaining}s`;
    }
  }

  private startTimer(): void {
    this.timerInterval = setInterval(() => {
      if (!this.timerPaused) {
        this.timeRemaining--;
        this.updateTimerDisplay();
        
        if (this.timeRemaining <= 0) {
          this.handleTimeUp();
        }
      }
    }, 1000);
  }

  private handleTimeUp(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    
    this.showGameOverScreen(restartGame);
  }

  // Screen display methods
  public showCollectibleScreen(
    collectible: THREE.Mesh, 
    onContinue: () => void
  ): void {
    // Pause timer if in timed mode
    this.timerPaused = true;

    // Get collectible screen elements
    const collectScreen = document.getElementById('collectScreen');
    const titleElement = document.getElementById('collectShapeTitle');
    const messageElement = document.getElementById('collectShapeMessage');
    
    if (collectScreen && titleElement && messageElement) {
      // Get the shape type from the object's userData
      const shapeType = collectible.userData.shapeType || 'pyramid';
      
      // Set title and message based on shape
      switch (shapeType) {
        case 'sphere':
          titleElement.textContent = 'Sphere Collected!';
          messageElement.textContent = 'You found a mystical sphere. Keep exploring to find more!';
          break;
        case 'cylinder':
          titleElement.textContent = 'Cylinder Collected!';
          messageElement.textContent = 'You found a mystical cylinder. Keep exploring to find more!';
          break;
        case 'cube':
          titleElement.textContent = 'Cube Collected!';
          messageElement.textContent = 'You found a mystical cube. Keep exploring to find more!';
          break;
        default: // pyramid
          titleElement.textContent = 'Pyramid Collected!';
          messageElement.textContent = 'You found a mystical pyramid. Keep exploring to find more!';
      }
      
      // Show the screen
      collectScreen.style.display = 'flex';
      
      // Add event listener to continue button
      const continueButton = document.getElementById('continueButton');
      if (continueButton) {
        // Remove any existing event listeners
        const newContinueButton = continueButton.cloneNode(true);
        continueButton.parentNode?.replaceChild(newContinueButton, continueButton);
        
        // Add new event listener
        newContinueButton.addEventListener('click', () => {
          // Hide the screen
          collectScreen.style.display = 'none';
          
          // Resume timer if in timed mode
          this.timerPaused = false;
          
          // Call the continue callback
          onContinue();
        });
      }

      // Add event listener to close button
      const closeButton = collectScreen.querySelector('.title-bar-controls button[aria-label="Close"]');
      if (closeButton) {
        closeButton.addEventListener('click', () => {
          // Hide the screen
          collectScreen.style.display = 'none';
          
          // Resume timer if in timed mode
          this.timerPaused = false;
          
          // Call the continue callback
          onContinue();
        });
      }
    }
  }

  public showGameOverScreen(onRestart?: () => void): void {
    // Get the game over screen (now using 98.css styling)
    const gameOverScreen = document.getElementById('gameOverScreen');
    const gameOverTitle = document.getElementById('gameOverTitle');
    const gameOverMessage = document.getElementById('gameOverMessage');
    
    // Show the screen
    if (gameOverScreen) {
      // Set title and message based on game mode
      if (gameOverTitle) {
        gameOverTitle.textContent = this.isTimedMode ? 'Time\'s Up!' : 'Maze Completed!';
      }
      
      if (gameOverMessage) {
        // Use consistent message format for both modes
        const scoreText = this.isTimedMode ? 
          `You ${this.timeRemaining <= 0 ? 'ran out of time' : 'completed the maze'}. Your score: ${this.score}` :
          `Congratulations! You completed the maze. Your score: ${this.score}`;
        gameOverMessage.textContent = scoreText;
      }
      
      gameOverScreen.style.display = 'flex';
      
      // Add event listener to restart button if callback provided
      if (onRestart) {
        const restartButton = document.getElementById('restartButton');
        if (restartButton) {
          // Remove any existing event listeners
          const newRestartButton = restartButton.cloneNode(true);
          restartButton.parentNode?.replaceChild(newRestartButton, restartButton);
          
          // Add new event listener
          newRestartButton.addEventListener('click', onRestart);
        }

        // Add event listener to close button
        const closeButton = gameOverScreen.querySelector('.title-bar-controls button[aria-label="Close"]');
        if (closeButton) {
          closeButton.addEventListener('click', onRestart);
        }
      }
    }
  }

  // Timer control methods
  public pauseTimer(): void {
    this.timerPaused = true;
  }

  public resumeTimer(): void {
    this.timerPaused = false;
  }

  public getTimeRemaining(): number {
    return this.timeRemaining;
  }

  public getScore(): number {
    return this.score;
  }

  public dispose(): void {
    // Clear timer if it exists
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    
    // Remove UI elements
    if (this.scoreDisplay && this.scoreDisplay.parentNode) {
      document.body.removeChild(this.scoreDisplay);
      this.scoreDisplay = null;
    }
    
    if (this.timerDisplay && this.timerDisplay.parentNode) {
      document.body.removeChild(this.timerDisplay);
      this.timerDisplay = null;
    }
    
    if (this.compass && this.compass.parentNode) {
      document.body.removeChild(this.compass);
      this.compass = null;
    }
    
    if (this.controlButtons && this.controlButtons.parentNode) {
      document.body.removeChild(this.controlButtons);
      this.controlButtons = null;
    }
    
    // Find and remove the collection screen if it exists
    const collectScreen = document.getElementById('collectScreen');
    if (collectScreen && collectScreen.parentNode) {
      document.body.removeChild(collectScreen);
    }
    
    // Find and remove the game over screen if it exists
    const gameOverScreen = document.getElementById('gameOverScreen');
    if (gameOverScreen && gameOverScreen.parentNode) {
      document.body.removeChild(gameOverScreen);
    }
  }
} 