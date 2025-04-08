import * as THREE from 'three';
import { Cell } from './maze';
import { ObjectPlacementMode } from './scene';

export type FindClosestRedTileFunction = (
  redTilePositions: { x: number; z: number }[], 
  centerX: number, 
  centerZ: number, 
  maze: Cell[][]
) => { x: number; z: number } | null;

export class ObjectPlacementManager {
  private mazeSize: number;
  
  constructor(mazeSize: number) {
    this.mazeSize = mazeSize;
  }
  
  /**
   * Get positions for collectible objects based on the specified placement mode
   */
  public getObjectPositions(
    placementMode: ObjectPlacementMode,
    redTilePositions: { x: number; z: number }[],
    centerX: number,
    centerZ: number,
    maze: Cell[][],
    findClosestRedTileFn: FindClosestRedTileFunction
  ): { x: number; z: number }[] {
    // Return positions based on the placement mode
    switch (placementMode) {
      case ObjectPlacementMode.ALL_RED_TILES:
        return this.getAllRedTilePositions(redTilePositions);
      
      case ObjectPlacementMode.RANDOM_RED_TILE:
        return this.getRandomRedTilePosition(redTilePositions);
      
      case ObjectPlacementMode.CLOSEST_RED_TILE:
        return this.getClosestRedTilePosition(
          redTilePositions,
          centerX,
          centerZ,
          maze,
          findClosestRedTileFn
        );
      
      default:
        console.error('Unknown placement mode:', placementMode);
        return [];
    }
  }
  
  /**
   * Return all red tile positions for the ALL_RED_TILES mode
   */
  private getAllRedTilePositions(redTilePositions: { x: number; z: number }[]): { x: number; z: number }[] {
    return [...redTilePositions]; // Return a copy to avoid modifying the original array
  }
  
  /**
   * Select a random red tile position for the RANDOM_RED_TILE mode
   */
  private getRandomRedTilePosition(redTilePositions: { x: number; z: number }[]): { x: number; z: number }[] {
    if (redTilePositions.length === 0) {
      return [];
    }
    
    // Select a random index
    const randomIndex = Math.floor(Math.random() * redTilePositions.length);
    
    // Return the randomly selected position
    return [redTilePositions[randomIndex]];
  }
  
  /**
   * Find the closest red tile for the CLOSEST_RED_TILE mode
   */
  private getClosestRedTilePosition(
    redTilePositions: { x: number; z: number }[],
    centerX: number,
    centerZ: number,
    maze: Cell[][],
    findClosestRedTileFn: FindClosestRedTileFunction
  ): { x: number; z: number }[] {
    if (redTilePositions.length === 0) {
      return [];
    }
    
    // Use the provided function to find the closest red tile
    const closestRedTile = findClosestRedTileFn(redTilePositions, centerX, centerZ, maze);
    
    if (closestRedTile) {
      return [closestRedTile];
    }
    
    return [];
  }
  
  /**
   * Calculate the distance between two points
   */
  private calculateDistance(x1: number, z1: number, x2: number, z2: number): number {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(z2 - z1, 2));
  }
} 