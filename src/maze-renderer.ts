import * as THREE from 'three';
import { MazeGenerator, Cell } from './maze';
import { ResourceManager } from './resource-manager';
import { ObjectPlacementMode } from './scene';

export interface MazeRenderResult {
  maze: Cell[][];
  farthestDeadEndTile: THREE.Vector3;
  initialPlayerPosition: {
    position: THREE.Vector3;
    rotation: number;
  };
  redTilePositions: { x: number; z: number }[];
  centerX: number;
  centerZ: number;
  redTileCount: number;
}

export class MazeRenderer {
  private scene: THREE.Scene;
  private resourceManager: ResourceManager;
  private mazeSize: number;
  private showRedTiles: boolean;

  constructor(
    scene: THREE.Scene,
    resourceManager: ResourceManager,
    mazeSize: number,
    showRedTiles: boolean = true
  ) {
    this.scene = scene;
    this.resourceManager = resourceManager;
    this.mazeSize = mazeSize;
    this.showRedTiles = showRedTiles;
  }

  public createMaze(): MazeRenderResult {
    const mazeGen = new MazeGenerator(this.mazeSize);
    const { grid: maze, centerDeadEnd, farthestDeadEnd } = mazeGen.generate();

    // Reset red tile count
    let redTileCount = 0;

    // Store the farthest dead end position for win condition checking
    const farthestDeadEndTile = new THREE.Vector3(
      farthestDeadEnd.x * 2 - (this.mazeSize - 1),
      0,
      farthestDeadEnd.y * 2 - (this.mazeSize - 1)
    );

    // Debug log maze initialization
    console.log('Maze initialization:', {
      mazeSize: this.mazeSize,
      centerDeadEnd,
      farthestDeadEnd,
      farthestDeadEndTileWorld: farthestDeadEndTile
    });

    // Create base floor using ResourceManager
    const floorGeometry = this.resourceManager.getFloorGeometry();
    const floorMaterial = this.resourceManager.getFloorMaterial();
    
    if (floorGeometry && floorMaterial) {
      const floor = new THREE.Mesh(floorGeometry, floorMaterial);
      floor.rotation.x = -Math.PI / 2;
      this.scene.add(floor);
    }

    // First pass: Count red tiles
    maze.forEach((row, x) => {
      row.forEach((cell, y) => {
        const wallCount = Object.values(cell.walls).filter(wall => wall).length;
        if (wallCount === 3) {
          const isRedTile = x !== centerDeadEnd.x || y !== centerDeadEnd.y;
          const isFarthestTile = x === farthestDeadEnd.x && y === farthestDeadEnd.y;
          if (isRedTile && !isFarthestTile) {
            redTileCount++;
          }
        }
      });
    });

    // Collect positions of red tiles
    const redTilePositions: { x: number, z: number }[] = [];
    
    maze.forEach((row, x) => {
      row.forEach((cell, y) => {
        // Convert grid coordinates to world coordinates
        const worldX = x * 2 - (this.mazeSize - 1);
        const worldZ = y * 2 - (this.mazeSize - 1);

        // Count number of walls to identify dead ends
        const wallCount = Object.values(cell.walls).filter(wall => wall).length;
        if (wallCount === 3) { // This is a dead end
          let tileMaterial;
          
          // Select appropriate material based on tile type
          if (x === centerDeadEnd.x && y === centerDeadEnd.y) {
            tileMaterial = this.resourceManager.getBlueTileMaterial(); // Blue for center-most dead end
          } else if (x === farthestDeadEnd.x && y === farthestDeadEnd.y) {
            tileMaterial = this.resourceManager.getGreenTileMaterial(); // Green for farthest dead end
          } else {
            tileMaterial = this.resourceManager.getRedTileMaterial(); // Red for other dead ends
          }
          
          // Only create visible tile if it's not a red tile or if red tiles are visible
          if (tileMaterial !== this.resourceManager.getRedTileMaterial() || this.showRedTiles) {
            const tileGeometry = this.resourceManager.getTileGeometry();
            if (tileGeometry && tileMaterial) {
              const deadEndTile = new THREE.Mesh(tileGeometry, tileMaterial);
              deadEndTile.rotation.x = -Math.PI / 2;
              deadEndTile.position.set(worldX, 0.01, worldZ);
              this.scene.add(deadEndTile);
            }
          }

          // Collect red tile positions regardless of visibility
          if (tileMaterial === this.resourceManager.getRedTileMaterial()) {
            redTilePositions.push({ x: worldX, z: worldZ });
          }
        }

        // Create walls
        if (cell.walls.north) {
          this.createWall(worldX, worldZ - 1, true);
        }
        if (cell.walls.south) {
          this.createWall(worldX, worldZ + 1, true);
        }
        if (cell.walls.east) {
          this.createWall(worldX + 1, worldZ, false);
        }
        if (cell.walls.west) {
          this.createWall(worldX - 1, worldZ, false);
        }
      });
    });

    // Get the world coordinates of the blue tile (center dead end)
    const centerX = centerDeadEnd.x * 2 - (this.mazeSize - 1);
    const centerZ = centerDeadEnd.y * 2 - (this.mazeSize - 1);

    // Debug log starting position
    console.log('Starting position:', {
      centerDeadEnd,
      centerX,
      centerZ,
      mazeSize: this.mazeSize
    });

    // Find the direction WITHOUT walls (the open path)
    const cell = maze[centerDeadEnd.x][centerDeadEnd.y];
    const direction = this.getOpenDirection(cell);
    
    // Set the initial player position for the PlayerController
    const initialPlayerPosition = {
      position: new THREE.Vector3(centerX, 0.5, centerZ),
      rotation: direction
    };

    // Return the result
    return {
      maze,
      farthestDeadEndTile,
      initialPlayerPosition,
      redTilePositions,
      centerX,
      centerZ,
      redTileCount
    };
  }

  private createWall(x: number, z: number, isNorthSouth: boolean) {
    // Use the appropriate shared geometry based on wall orientation
    const mainWallGeometry = isNorthSouth 
      ? this.resourceManager.getMainWallGeometryNS() 
      : this.resourceManager.getMainWallGeometryEW();
    const topWallGeometry = isNorthSouth 
      ? this.resourceManager.getTopWallGeometryNS() 
      : this.resourceManager.getTopWallGeometryEW();
    const wallMaterial = isNorthSouth 
      ? this.resourceManager.getWallMaterialNS() 
      : this.resourceManager.getWallMaterialEW();
    const topWallMaterial = this.resourceManager.getTopWallMaterial();
    
    if (!mainWallGeometry || !topWallGeometry || !wallMaterial || !topWallMaterial) {
      console.error('Wall geometries or materials not initialized');
      return;
    }
    
    // Create the main wall with the appropriate shared material
    const mainWall = new THREE.Mesh(mainWallGeometry, wallMaterial);
    mainWall.position.set(x, 0.4, z); // Position lower to accommodate top portion
    this.scene.add(mainWall);

    // Create the top portion with shared solid black material
    const topWall = new THREE.Mesh(topWallGeometry, topWallMaterial);
    topWall.position.set(x, 0.9, z); // Position at the top
    this.scene.add(topWall);
  }

  private getOpenDirection(cell: Cell): number {
    // Return the direction of the open path (the side WITHOUT a wall)
    if (cell.walls.north === false) return 0;          // Face north when north is open
    if (cell.walls.south === false) return Math.PI;    // Face south when south is open
    if (cell.walls.east === false) return -Math.PI/2;  // Face east when east is open
    if (cell.walls.west === false) return Math.PI/2;   // Face west when west is open
    return 0; // Fallback, shouldn't happen in a dead end
  }

  public findClosestRedTile(
    redTilePositions: { x: number, z: number }[], 
    centerX: number, 
    centerZ: number, 
    maze: Cell[][]
  ): { x: number, z: number } | null {
    // Convert world coordinates to grid coordinates using mazeSize
    const startGridX = Math.round((centerX + (this.mazeSize - 1)) / 2);
    const startGridZ = Math.round((centerZ + (this.mazeSize - 1)) / 2);
    
    // Convert red tile positions to grid coordinates
    const redTileGridPositions = redTilePositions.map(pos => ({
      x: Math.round((pos.x + (this.mazeSize - 1)) / 2),
      z: Math.round((pos.z + (this.mazeSize - 1)) / 2)
    }));

    // Debug log coordinate conversions
    console.log('Finding closest red tile:', {
      centerWorld: { x: centerX, z: centerZ },
      centerGrid: { x: startGridX, z: startGridZ },
      redTilePositions,
      redTileGridPositions,
      mazeSize: this.mazeSize
    });

    // Queue for BFS: [x, z, distance]
    const queue: [number, number, number][] = [[startGridX, startGridZ, 0]];
    const visited = new Set<string>();
    visited.add(`${startGridX},${startGridZ}`);

    let closestRedTile: { x: number, z: number } | null = null;
    let shortestDistance = Infinity;

    while (queue.length > 0) {
      const [currentX, currentZ, distance] = queue.shift()!;
      
      // Check if current position is a red tile
      const isRedTile = redTileGridPositions.some(pos => pos.x === currentX && pos.z === currentZ);
      if (isRedTile && distance < shortestDistance) {
        shortestDistance = distance;
        // Convert back to world coordinates using mazeSize
        closestRedTile = {
          x: currentX * 2 - (this.mazeSize - 1),
          z: currentZ * 2 - (this.mazeSize - 1)
        };

        // Debug log when red tile found
        console.log('Found red tile:', {
          gridPosition: { x: currentX, z: currentZ },
          worldPosition: closestRedTile,
          distance,
          mazeSize: this.mazeSize
        });
      }

      // Get current cell
      const cell = maze[currentX][currentZ];

      // Check each direction
      const directions = [
        { dx: 0, dz: -1, wall: 'north' },
        { dx: 0, dz: 1, wall: 'south' },
        { dx: 1, dz: 0, wall: 'east' },
        { dx: -1, dz: 0, wall: 'west' }
      ];

      for (const { dx, dz, wall } of directions) {
        const nextX = currentX + dx;
        const nextZ = currentZ + dz;
        const key = `${nextX},${nextZ}`;

        // Check if the next position is valid and not visited
        if (nextX >= 0 && nextX < this.mazeSize && nextZ >= 0 && nextZ < this.mazeSize &&
            !visited.has(key) && !cell.walls[wall as keyof Cell['walls']]) {
          queue.push([nextX, nextZ, distance + 1]);
          visited.add(key);
        }
      }
    }

    return closestRedTile;
  }
} 