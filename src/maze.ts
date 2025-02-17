export type Cell = {
  x: number;
  y: number;
  walls: {
    north: boolean;
    south: boolean;
    east: boolean;
    west: boolean;
  };
  visited: boolean;
  isDeadEnd: boolean;
  distanceFromCenter: number;
};

export class MazeGenerator {
  private size: number;
  private grid: Cell[][];
  private centerDeadEnd: Cell | null = null;
  private farthestDeadEnd: Cell | null = null;
  
  constructor(size: number) {
    this.size = size;
    this.grid = [];
    
    // Initialize grid with all walls up
    for (let x = 0; x < size; x++) {
      this.grid[x] = [];
      for (let y = 0; y < size; y++) {
        this.grid[x][y] = {
          x,
          y,
          walls: {
            north: true,
            south: true,
            east: true,
            west: true
          },
          visited: false,
          isDeadEnd: false,
          distanceFromCenter: Infinity
        };
      }
    }
  }

  generate(): { grid: Cell[][], centerDeadEnd: Cell, farthestDeadEnd: Cell } {
    const startX = Math.floor(this.size / 2);
    const startY = Math.floor(this.size / 2);
    this.carvePathFrom(startX, startY);
    
    // Calculate distances from center and identify dead ends
    this.calculateDistances(startX, startY);
    
    // Find center-most and farthest dead ends
    this.findSpecialDeadEnds();
    
    return {
      grid: this.grid,
      centerDeadEnd: this.centerDeadEnd!,
      farthestDeadEnd: this.farthestDeadEnd!
    };
  }

  private carvePathFrom(x: number, y: number) {
    this.grid[x][y].visited = true;

    // Get all possible directions
    const directions = this.getUnvisitedNeighbors(x, y);
    
    // Randomize directions
    for (let i = directions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [directions[i], directions[j]] = [directions[j], directions[i]];
    }

    // Try each direction
    directions.forEach(dir => {
      const [nextX, nextY, wall] = dir;
      if (!this.grid[nextX][nextY].visited) {
        // Remove walls between current and next cell
        this.removeWall(x, y, wall);
        this.removeWall(nextX, nextY, this.getOppositeWall(wall));
        
        // Continue carving from the next cell
        this.carvePathFrom(nextX, nextY);
      }
    });
  }

  private getUnvisitedNeighbors(x: number, y: number): [number, number, keyof Cell['walls']][] {
    const neighbors: [number, number, keyof Cell['walls']][] = [];

    if (x > 0) neighbors.push([x - 1, y, 'west']);
    if (x < this.size - 1) neighbors.push([x + 1, y, 'east']);
    if (y > 0) neighbors.push([x, y - 1, 'north']);
    if (y < this.size - 1) neighbors.push([x, y + 1, 'south']);

    return neighbors.filter(([nx, ny]) => !this.grid[nx][ny].visited);
  }

  private removeWall(x: number, y: number, wall: keyof Cell['walls']) {
    this.grid[x][y].walls[wall] = false;
  }

  private getOppositeWall(wall: keyof Cell['walls']): keyof Cell['walls'] {
    switch (wall) {
      case 'north': return 'south';
      case 'south': return 'north';
      case 'east': return 'west';
      case 'west': return 'east';
    }
  }

  private calculateDistances(startX: number, startY: number) {
    // Reset distances
    this.grid.forEach(row => row.forEach(cell => {
      cell.distanceFromCenter = Infinity;
    }));
    
    // Use BFS to calculate distances
    const queue: [number, number, number][] = [[startX, startY, 0]];
    this.grid[startX][startY].distanceFromCenter = 0;
    
    while (queue.length > 0) {
      const [x, y, distance] = queue.shift()!;
      
      // Check each direction
      const directions = [
        { dx: 0, dy: -1, wall: 'north' },
        { dx: 0, dy: 1, wall: 'south' },
        { dx: 1, dy: 0, wall: 'east' },
        { dx: -1, dy: 0, wall: 'west' }
      ];
      
      directions.forEach(({ dx, dy, wall }) => {
        const nextX = x + dx;
        const nextY = y + dy;
        
        if (nextX >= 0 && nextX < this.size && 
            nextY >= 0 && nextY < this.size && 
            !this.grid[x][y].walls[wall as keyof Cell['walls']]) {
          if (this.grid[nextX][nextY].distanceFromCenter > distance + 1) {
            this.grid[nextX][nextY].distanceFromCenter = distance + 1;
            queue.push([nextX, nextY, distance + 1]);
          }
        }
      });
    }
  }

  private findSpecialDeadEnds() {
    let deadEnds: Cell[] = [];
    
    // Find all dead ends
    this.grid.forEach(row => row.forEach(cell => {
      const wallCount = Object.values(cell.walls).filter(wall => wall).length;
      if (wallCount === 3) {
        cell.isDeadEnd = true;
        deadEnds.push(cell);
      }
    }));
    
    // Find center-most dead end (smallest distance from center)
    this.centerDeadEnd = deadEnds.reduce((closest, current) => {
      return current.distanceFromCenter < closest.distanceFromCenter ? current : closest;
    }, deadEnds[0]);
    
    // Find farthest dead end (largest distance from center)
    this.farthestDeadEnd = deadEnds.reduce((farthest, current) => {
      return current.distanceFromCenter > farthest.distanceFromCenter ? current : farthest;
    }, deadEnds[0]);
  }
} 