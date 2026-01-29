console.log("Avatar JS loaded");

const container = document.getElementById("avatar-container");
let scene, camera, renderer, avatarMesh, controls;

function initAvatar() {
  scene = new THREE.Scene();
  
  camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
  camera.position.z = 3;
  
  renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setSize(400, 400);
  container.appendChild(renderer.domElement);
  
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  
  const light = new THREE.DirectionalLight(0xffffff, 0.8);
  light.position.set(5, 5, 5);
  scene.add(light);
  
  loadOrbitControls();
}

function loadOrbitControls() {
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js';
  script.onload = function() {
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = true;
    controls.autoRotate = false; // Disabled auto-rotation
    controls.autoRotateSpeed = 2.0;
    console.log("OrbitControls loaded");
  };
  document.head.appendChild(script);
}

// Generate unique colors from wallet address and seed
function generateColorsFromAddress(address, seed = 0) {
  const colors = [];
  for (let i = 0; i < 16; i++) {
    const index = (2 + i * 2 + seed) % (address.length - 2);
    const hash = address.slice(index, index + 2);
    const colorValue = (parseInt(hash, 16) * 16 + seed * 17) % 256;
    colors.push(colorValue);
  }
  return colors;
}

// Create pixel art avatar based on wallet address with seed variation
function createPixelAvatar(walletAddress, seed = 0) {
  if (!walletAddress || walletAddress === "Not connected") {
    return;
  }
  
  if (avatarMesh) {
    scene.remove(avatarMesh);
  }
  
  const gridSize = 8;
  const pixelSize = 0.2;
  const spacing = 0.02;
  
  const group = new THREE.Group();
  const colors = generateColorsFromAddress(walletAddress, seed);
  
  for (let x = 0; x < gridSize; x++) {
    for (let y = 0; y < gridSize; y++) {
      const mirrorX = x < gridSize / 2 ? x : gridSize - 1 - x;
      const index = mirrorX * gridSize + y;
      const addressChar = walletAddress.charCodeAt(2 + ((index + seed) % (walletAddress.length - 2)));
      
      // Vary the pattern based on seed
      const threshold = (seed % 3) + 2;
      if (addressChar % threshold !== 0) {
        const geometry = new THREE.BoxGeometry(pixelSize, pixelSize, pixelSize);
        
        const colorIndex = (x + y * gridSize + seed) % 16;
        const r = colors[colorIndex] / 255;
        const g = colors[(colorIndex + 5) % 16] / 255;
        const b = colors[(colorIndex + 10) % 16] / 255;
        
        const material = new THREE.MeshStandardMaterial({ 
          color: new THREE.Color(r, g, b),
          metalness: 0.3,
          roughness: 0.7
        });
        
        const cube = new THREE.Mesh(geometry, material);
        
        const posX = (x - gridSize / 2) * (pixelSize + spacing);
        const posY = (y - gridSize / 2) * (pixelSize + spacing);
        
        cube.position.set(posX, posY, 0);
        group.add(cube);
      }
    }
  }
  
  avatarMesh = group;
  scene.add(avatarMesh);
  
  // Removed autoRotate setting here
  
  animate();
}

function animate() {
  requestAnimationFrame(animate);
  
  if (controls) {
    controls.update();
  }
  
  renderer.render(scene, camera);
}

initAvatar();

window.updateAvatar = createPixelAvatar;