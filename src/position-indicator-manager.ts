import * as THREE from 'three';

export class PositionIndicatorManager {
  private positionIndicator: THREE.Group;
  private scene: THREE.Scene;
  
  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.positionIndicator = this.createPositionIndicator();
  }
  
  private createPositionIndicator(): THREE.Group {
    // Create a triangle shape
    const shape = new THREE.Shape();
    shape.moveTo(0, 0.4);       // Point forward
    shape.lineTo(-0.25, -0.25); // Back left
    shape.lineTo(0.25, -0.25);  // Back right
    shape.lineTo(0, 0.4);       // Back to front

    const geometry = new THREE.ShapeGeometry(shape);
    const material = new THREE.MeshBasicMaterial({ 
        color: 0xffff00,  // Yellow
        side: THREE.DoubleSide 
    });

    // Create the mesh
    const triangleMesh = new THREE.Mesh(geometry, material);

    // Create edges for the black border
    const edges = new THREE.EdgesGeometry(geometry);
    const borderMaterial = new THREE.LineBasicMaterial({ 
        color: 0x000000,  // Black
        linewidth: 2      // Note: linewidth only works in Firefox
    });
    const borderMesh = new THREE.LineSegments(edges, borderMaterial);

    // Group them together
    const indicator = new THREE.Group();
    indicator.add(triangleMesh);
    indicator.add(borderMesh);

    // Position slightly above the floor to prevent z-fighting
    triangleMesh.position.y = 0.001;
    borderMesh.position.y = 0.002;

    // Set rotation order and initial rotation
    indicator.rotation.order = 'XYZ';
    indicator.rotation.x = -Math.PI / 2;
    indicator.position.y = 0.01;

    // Set the position indicator to be on layer 1 (minimap only)
    // THREE.js uses bit masks for layers
    indicator.layers.set(1);
    
    // Make all children also use layer 1
    indicator.traverse((object) => {
      object.layers.set(1);
    });

    this.scene.add(indicator);
    
    return indicator;
  }
  
  public getPositionIndicator(): THREE.Group {
    return this.positionIndicator;
  }
  
  public updatePosition(position: THREE.Vector3): void {
    this.positionIndicator.position.x = position.x;
    this.positionIndicator.position.z = position.z;
  }
  
  public updateRotation(rotationY: number): void {
    // Only update Y rotation (around vertical axis)
    this.positionIndicator.rotation.z = rotationY;
  }
  
  public dispose(): void {
    // Remove indicator from scene
    this.scene.remove(this.positionIndicator);
    
    // Dispose geometries and materials
    this.positionIndicator.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        if (object.geometry) {
          object.geometry.dispose();
        }
        if (object.material instanceof THREE.Material) {
          object.material.dispose();
        }
      }
    });
  }
} 