import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export function createThreeDemo(container) {
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x101512, 0.055);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(5.4, 2.8, 7.2);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.setClearColor(0x101512, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  container.appendChild(renderer.domElement);
  renderer.domElement.setAttribute('aria-label', '可拖拽旋转的三维呼吸棱镜');

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.055;
  controls.minDistance = 4;
  controls.maxDistance = 15;
  controls.target.set(0, 0, 0);

  const world = new THREE.Group();
  scene.add(world);

  const prismMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xb9d7c4,
    metalness: 0.08,
    roughness: 0.08,
    transmission: 0.55,
    thickness: 1.6,
    transparent: true,
    opacity: 0.92,
    ior: 1.48,
    emissive: 0x19291a,
    emissiveIntensity: 0.42,
  });
  const prism = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.35, 2.7, 3), prismMaterial);
  prism.rotation.z = 0.12;
  world.add(prism);

  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(prism.geometry),
    new THREE.LineBasicMaterial({ color: 0xd7f86b, transparent: true, opacity: 0.48 }),
  );
  prism.add(edges);

  const core = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.47, 0),
    new THREE.MeshBasicMaterial({ color: 0xd7f86b, transparent: true, opacity: 0.32 }),
  );
  world.add(core);

  const ringMaterial = new THREE.MeshBasicMaterial({ color: 0x8bb9b1, transparent: true, opacity: 0.55 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.15, 0.012, 8, 160), ringMaterial);
  ring.rotation.set(1.15, 0.3, 0.2);
  world.add(ring);

  const secondRing = new THREE.Mesh(
    new THREE.TorusGeometry(2.65, 0.006, 8, 160),
    new THREE.MeshBasicMaterial({ color: 0xd7f86b, transparent: true, opacity: 0.2 }),
  );
  secondRing.rotation.set(0.5, 1.1, 0.4);
  world.add(secondRing);

  const beamMaterial = new THREE.LineBasicMaterial({ color: 0xd7f86b, transparent: true, opacity: 0.35 });
  [
    [[-6, 0.8, 0], [-1.3, 0.15, 0]],
    [[1.1, 0.2, 0], [5.8, 2.3, -1.4]],
    [[1.1, 0.2, 0], [5.8, -1.8, 1.8]],
  ].forEach((points) => {
    const geometry = new THREE.BufferGeometry().setFromPoints(points.map((point) => new THREE.Vector3(...point)));
    scene.add(new THREE.Line(geometry, beamMaterial));
  });

  const particleCount = 420;
  const positions = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i += 1) {
    const angle = i * 2.39996;
    const radius = 2.4 + ((i * 37) % 100) / 22;
    positions[i * 3] = Math.cos(angle) * radius;
    positions[i * 3 + 1] = Math.sin(i * 1.73) * 3.4;
    positions[i * 3 + 2] = Math.sin(angle) * radius;
  }
  const particlesGeometry = new THREE.BufferGeometry();
  particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const particles = new THREE.Points(
    particlesGeometry,
    new THREE.PointsMaterial({ color: 0xb7cbbd, size: 0.022, transparent: true, opacity: 0.58 }),
  );
  scene.add(particles);

  const grid = new THREE.GridHelper(26, 26, 0x354131, 0x202820);
  grid.position.y = -2.25;
  grid.material.transparent = true;
  grid.material.opacity = 0.42;
  scene.add(grid);

  scene.add(new THREE.AmbientLight(0x9fb4a4, 1.4));
  const keyLight = new THREE.DirectionalLight(0xe9f7dc, 5.2);
  keyLight.position.set(4, 5, 6);
  scene.add(keyLight);
  const greenLight = new THREE.PointLight(0xd7f86b, 24, 12);
  greenLight.position.set(-3, 0, 3);
  scene.add(greenLight);
  const cyanLight = new THREE.PointLight(0x8bb9b1, 18, 12);
  cyanLight.position.set(3, -2, -3);
  scene.add(cyanLight);

  let playing = true;
  let frame;
  let previousTime = 0;
  const clock = new THREE.Clock();

  const resize = () => {
    const { width, height } = container.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  resize();

  const animate = (time) => {
    frame = requestAnimationFrame(animate);
    const delta = Math.min((time - previousTime) / 1000, 0.05);
    previousTime = time;
    if (playing) {
      const elapsed = clock.getElapsedTime();
      world.position.y = Math.sin(elapsed * 1.05) * 0.16;
      world.rotation.y += delta * 0.12;
      prism.rotation.x = Math.sin(elapsed * 0.45) * 0.06;
      ring.rotation.z += delta * 0.16;
      secondRing.rotation.y -= delta * 0.1;
      core.rotation.y -= delta * 0.35;
      core.scale.setScalar(0.9 + Math.sin(elapsed * 1.05) * 0.12);
      particles.rotation.y += delta * 0.018;
    }
    controls.update();
    renderer.render(scene, camera);
  };
  frame = requestAnimationFrame(animate);

  return {
    setWireframe(value) {
      prismMaterial.wireframe = value;
      prismMaterial.transmission = value ? 0 : 0.55;
      prismMaterial.needsUpdate = true;
    },
    setPlaying(value) {
      playing = value;
    },
    reset() {
      camera.position.set(5.4, 2.8, 7.2);
      controls.target.set(0, 0, 0);
      controls.update();
    },
    destroy() {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      controls.dispose();
      scene.traverse((object) => {
        object.geometry?.dispose();
        if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose());
        else object.material?.dispose();
      });
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
