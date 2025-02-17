import * as THREE from 'three';

export class PlayerController {
  private moveSpeed = 0.2;
  private rotationSpeed = 0.02;
  private collisionRadius = 0.3;
  private pointerLocked = false;

  constructor(
    private camera: THREE.PerspectiveCamera,
    private grid: number[][]
  ) {
    this.setupControls();
  }

  private setupControls() {
    const keys: {[key: string]: boolean} = {};
    
    window.addEventListener('keydown', e => {
      keys[e.key] = true;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }
    });
    
    window.addEventListener('keyup', e => {
      keys[e.key] = false;
    });

    document.addEventListener('click', () => {
      if (!this.pointerLocked) {
        document.body.requestPointerLock();
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.pointerLocked = document.pointerLockElement !== null;
    });

    document.addEventListener('mousemove', (e) => {
      if (this.pointerLocked) {
        this.camera.rotation.y -= e.movementX * this.rotationSpeed;
        this.camera.rotation.x = THREE.MathUtils.clamp(
          this.camera.rotation.x - e.movementY * this.rotationSpeed,
          -Math.PI/3, 
          Math.PI/3
        );
      }
    });

    const touchControls = document.createElement('div');
    touchControls.className = 'touch-controls';
    touchControls.innerHTML = `
      <div class="dpad">
        <button id="up">↑</button>
        <button id="left">←</button>
        <button id="right">→</button>
        <button id="down">↓</button>
      </div>
      <div class="rotation-controls">
        <button id="rotateLeft">↺</button>
        <button id="rotateRight">↻</button>
      </div>
    `;
    document.body.appendChild(touchControls);

    const handleTouch = (e: TouchEvent, id: string, pressed: boolean) => {
      e.preventDefault();
      keys[id] = pressed;
    };

    document.querySelectorAll('.dpad button, .rotation-controls button').forEach(btn => {
      btn.addEventListener('touchstart', e => handleTouch(e as TouchEvent, btn.id, true));
      btn.addEventListener('touchend', e => handleTouch(e as TouchEvent, btn.id, false));
    });

    const updateLoop = () => {
      this.updatePosition(keys);
      requestAnimationFrame(updateLoop);
    };
    updateLoop();
  }

  private updatePosition(keys: {[key: string]: boolean}) {
    const moveDirection = new THREE.Vector3();
    
    if (keys['w'] || keys['ArrowUp'] || keys['up']) moveDirection.z -= 1;
    if (keys['s'] || keys['ArrowDown'] || keys['down']) moveDirection.z += 1;
    if (keys['a'] || keys['ArrowLeft'] || keys['left']) moveDirection.x -= 1;
    if (keys['d'] || keys['ArrowRight'] || keys['right']) moveDirection.x += 1;
    
    if (keys['rotateLeft']) this.camera.rotation.y += this.rotationSpeed * 2;
    if (keys['rotateRight']) this.camera.rotation.y -= this.rotationSpeed * 2;
    
    moveDirection.normalize();
    moveDirection.applyQuaternion(this.camera.quaternion);
    
    const potentialPosition = new THREE.Vector3(
      this.camera.position.x + moveDirection.x * this.moveSpeed,
      this.camera.position.y,
      this.camera.position.z + moveDirection.z * this.moveSpeed
    );
    
    if (!this.checkCollision(potentialPosition)) {
      this.camera.position.copy(potentialPosition);
    }
  }

  private checkCollision(position: THREE.Vector3): boolean {
    const gridX = Math.floor(position.x + this.collisionRadius);
    const gridZ = Math.floor(position.z + this.collisionRadius);
    
    for (let z = -1; z <= 1; z++) {
      for (let x = -1; x <= 1; x++) {
        const checkX = Math.floor(position.x + x * this.collisionRadius);
        const checkZ = Math.floor(position.z + z * this.collisionRadius);
        
        if (this.grid[checkZ]?.[checkX] === 1) {
          return true;
        }
      }
    }
    return false;
  }
} 