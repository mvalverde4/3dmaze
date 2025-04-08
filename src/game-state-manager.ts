import * as THREE from 'three';
import { UIManager } from './managers/ui-manager';
import { restartGame } from './index';

export interface WinConditionConfig {
  farthestDeadEndTile: THREE.Vector3;
  mazeSize: number;
}

export interface GameStateConfig {
  isTimedMode: boolean;
  initialTime: number;
  timeBonus: number;
}

export class GameStateManager {
  private isTimedMode: boolean;
  private timeRemaining: number;
  private timeBonus: number;
  private score: number = 0;
  private isGameOver: boolean = false;
  private uiManager: UIManager;
  private farthestDeadEndTile: THREE.Vector3;
  private mazeSize: number;
  private animationFrameId: number | null = null;
  
  constructor(
    uiManager: UIManager, 
    winConditionConfig: WinConditionConfig,
    gameStateConfig: GameStateConfig
  ) {
    this.uiManager = uiManager;
    this.farthestDeadEndTile = winConditionConfig.farthestDeadEndTile;
    this.mazeSize = winConditionConfig.mazeSize;
    this.isTimedMode = gameStateConfig.isTimedMode;
    this.timeRemaining = gameStateConfig.initialTime;
    this.timeBonus = gameStateConfig.timeBonus;
  }
  
  public handleCollectibleCollected(collectible: any, resumeCallback: () => void): void {
    // Pause the game
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    // Show collectible screen through UIManager
    this.uiManager.showCollectibleScreen(collectible, resumeCallback);
  }
  
  public updateScoreOrTime(): void {
    if (this.isTimedMode) {
      // Add time bonus in timed mode
      this.uiManager.addTimeBonus(this.timeBonus);
      // Update our local timeRemaining value
      this.timeRemaining = this.uiManager.getTimeRemaining();
    } else {
      // Increment score in regular mode
      this.uiManager.incrementScore();
      this.score++;
    }
  }
  
  public checkWinCondition(playerPosition: THREE.Vector3): boolean {
    if (!this.farthestDeadEndTile) return false;
    
    // Convert current position to grid coordinates
    const currentGridX = Math.round((playerPosition.x + (this.mazeSize - 1)) / 2);
    const currentGridZ = Math.round((playerPosition.z + (this.mazeSize - 1)) / 2);

    // Convert farthest dead end to grid coordinates
    const targetGridX = Math.round((this.farthestDeadEndTile.x + (this.mazeSize - 1)) / 2);
    const targetGridZ = Math.round((this.farthestDeadEndTile.z + (this.mazeSize - 1)) / 2);

    // Check if player has reached the green tile
    const hasWon = currentGridX === targetGridX && currentGridZ === targetGridZ;
    
    if (hasWon && !this.isGameOver) {
      this.isGameOver = true;
      
      // In timed mode, add any remaining time to the score
      if (this.isTimedMode) {
        // Update the score based on remaining time if desired
        this.score += Math.max(0, this.timeRemaining);
        // Stop the timer
        this.uiManager.pauseTimer();
      }
      
      // Show game over screen through UIManager with restartGame callback
      this.uiManager.showGameOverScreen(restartGame);
    }
    
    return hasWon;
  }
  
  public setAnimationFrameId(id: number | null): void {
    this.animationFrameId = id;
  }
  
  public getAnimationFrameId(): number | null {
    return this.animationFrameId;
  }
  
  public isGameCompleted(): boolean {
    return this.isGameOver;
  }
  
  public getScore(): number {
    return this.score;
  }
  
  public resetGameState(): void {
    this.isGameOver = false;
    this.score = 0;
    if (this.isTimedMode) {
      this.timeRemaining = this.timeRemaining; // Reset to initial time
    }
  }
} 