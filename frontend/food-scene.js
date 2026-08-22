/* Decorative Three.js food background shared by every signed-in view. */
(async function createAppFoodScene() {
  const container = document.getElementById("appFoodScene");
  if (!container) return;

  let THREE;
  try {
    THREE = await import(
      "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js"
    );
  } catch (error) {
    console.warn("3D background unavailable:", error);
    return;
  }

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: false,
      powerPreference: "low-power",
    });
  } catch (error) {
    console.warn("WebGL background unavailable:", error);
    return;
  }

  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  const isMobile = window.matchMedia("(max-width: 700px)").matches;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    43,
    window.innerWidth / window.innerHeight,
    0.1,
    100,
  );
  camera.position.set(0, 0, isMobile ? 16 : 14);

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1 : 1.25));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x86a789, 2.4));
  const keyLight = new THREE.DirectionalLight(0xffffff, 2.8);
  keyLight.position.set(5, 7, 9);
  scene.add(keyLight);
  const accentLight = new THREE.PointLight(0x60a5fa, 22, 22);
  accentLight.position.set(-6, -2, 5);
  scene.add(accentLight);

  function makeMaterial(color, roughness = 0.65) {
    return new THREE.MeshStandardMaterial({
      color,
      roughness,
      metalness: 0.02,
      flatShading: true,
    });
  }

  function makeMesh(geometry, color, roughness) {
    return new THREE.Mesh(geometry, makeMaterial(color, roughness));
  }

  function makeApple(color = 0xef4444) {
    const group = new THREE.Group();
    const fruit = makeMesh(new THREE.IcosahedronGeometry(0.7, 2), color, 0.55);
    fruit.scale.y = 0.94;
    group.add(fruit);
    const stem = makeMesh(
      new THREE.CylinderGeometry(0.05, 0.07, 0.4, 7),
      0x6b4423,
    );
    stem.position.y = 0.77;
    stem.rotation.z = -0.14;
    group.add(stem);
    const leaf = makeMesh(new THREE.SphereGeometry(0.19, 9, 6), 0x16a34a);
    leaf.scale.set(1.4, 0.2, 0.65);
    leaf.position.set(0.22, 0.82, 0);
    group.add(leaf);
    return group;
  }

  function makeOrange() {
    const group = new THREE.Group();
    group.add(makeMesh(new THREE.IcosahedronGeometry(0.68, 3), 0xf97316, 0.8));
    const leaf = makeMesh(new THREE.SphereGeometry(0.18, 9, 6), 0x15803d);
    leaf.scale.set(1.4, 0.18, 0.7);
    leaf.position.set(0.18, 0.68, 0);
    group.add(leaf);
    return group;
  }

  function makeAvocado() {
    const group = new THREE.Group();
    const flesh = makeMesh(new THREE.SphereGeometry(0.7, 14, 10), 0x84cc16);
    flesh.scale.set(0.8, 1.18, 0.32);
    group.add(flesh);
    const pit = makeMesh(new THREE.SphereGeometry(0.27, 12, 9), 0x92400e);
    pit.position.set(0, -0.17, 0.26);
    pit.scale.z = 0.55;
    group.add(pit);
    return group;
  }

  function makeCarrot() {
    const group = new THREE.Group();
    const root = makeMesh(new THREE.ConeGeometry(0.4, 1.45, 9), 0xf97316);
    root.rotation.z = Math.PI;
    root.position.y = -0.2;
    group.add(root);
    for (let index = -1; index <= 1; index += 1) {
      const leaf = makeMesh(new THREE.ConeGeometry(0.09, 0.65, 6), 0x16a34a);
      leaf.position.set(index * 0.12, 0.68, 0);
      leaf.rotation.z = index * 0.27;
      group.add(leaf);
    }
    return group;
  }

  function makeEgg() {
    const group = new THREE.Group();
    const white = makeMesh(new THREE.SphereGeometry(0.76, 15, 10), 0xfffbeb, 0.85);
    white.scale.set(1.25, 0.82, 0.14);
    group.add(white);
    const yolk = makeMesh(new THREE.SphereGeometry(0.32, 14, 9), 0xfbbf24, 0.6);
    yolk.position.z = 0.16;
    yolk.scale.z = 0.54;
    group.add(yolk);
    return group;
  }

  function makeBanana() {
    const banana = makeMesh(
      new THREE.TorusGeometry(0.7, 0.19, 9, 22, Math.PI * 1.35),
      0xfacc15,
      0.68,
    );
    banana.rotation.z = -0.62;
    return banana;
  }

  const factories = [
    makeApple,
    makeOrange,
    makeAvocado,
    makeCarrot,
    makeEgg,
    makeBanana,
    () => makeApple(0x22c55e),
  ];
  const foodCount = isMobile ? 5 : 8;
  const foods = [];
  for (let index = 0; index < foodCount; index += 1) {
    const food = factories[index % factories.length]();
    const angle = (index / foodCount) * Math.PI * 2;
    food.scale.setScalar(0.66 + (index % 3) * 0.1);
    food.userData = {
      angle,
      radius: isMobile ? 4.8 : 6.2 + (index % 2) * 0.9,
      height: Math.sin(angle * 2) * (isMobile ? 3.4 : 2.8),
      speed: 0.025 + (index % 3) * 0.006,
      phase: index * 0.9,
    };
    scene.add(food);
    foods.push(food);
  }

  const dustGeometry = new THREE.BufferGeometry();
  const dustPositions = new Float32Array((isMobile ? 24 : 48) * 3);
  for (let index = 0; index < dustPositions.length; index += 3) {
    dustPositions[index] = (Math.random() - 0.5) * 19;
    dustPositions[index + 1] = (Math.random() - 0.5) * 12;
    dustPositions[index + 2] = (Math.random() - 0.5) * 5;
  }
  dustGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(dustPositions, 3),
  );
  const dust = new THREE.Points(
    dustGeometry,
    new THREE.PointsMaterial({
      color: 0x60a5fa,
      size: 0.045,
      transparent: true,
      opacity: 0.42,
    }),
  );
  scene.add(dust);

  const pointer = { x: 0, y: 0 };
  if (!reducedMotion) {
    window.addEventListener(
      "pointermove",
      (event) => {
        pointer.x = (event.clientX / window.innerWidth - 0.5) * 0.55;
        pointer.y = (event.clientY / window.innerHeight - 0.5) * 0.35;
      },
      { passive: true },
    );
  }

  function positionFoods(time) {
    foods.forEach((food, index) => {
      const data = food.userData;
      const angle = data.angle + time * data.speed;
      food.position.set(
        Math.cos(angle) * data.radius,
        data.height + Math.sin(time * 0.65 + data.phase) * 0.3,
        Math.sin(angle) * 1.7 - 1.4,
      );
      food.rotation.x = time * (0.07 + index * 0.003);
      food.rotation.y = time * (0.1 + index * 0.004);
    });
  }

  const clock = new THREE.Clock();
  let animationFrame = null;
  function renderFrame() {
    const time = clock.getElapsedTime();
    positionFoods(time);
    camera.position.x += (pointer.x - camera.position.x) * 0.02;
    camera.position.y += (-pointer.y - camera.position.y) * 0.02;
    camera.lookAt(0, 0, 0);
    dust.rotation.z = time * 0.012;
    renderer.render(scene, camera);
  }

  function animate() {
    renderFrame();
    animationFrame = requestAnimationFrame(animate);
  }

  function pause() {
    if (animationFrame !== null) cancelAnimationFrame(animationFrame);
    animationFrame = null;
  }

  function resumeIfAllowed() {
    const cameraModal = document.getElementById("cameraModal");
    const cameraOpen = cameraModal && !cameraModal.classList.contains("hidden");
    if (document.hidden || cameraOpen || reducedMotion) {
      pause();
      return;
    }
    if (animationFrame === null) {
      clock.getDelta();
      animate();
    }
  }

  function resize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(
      Math.min(window.devicePixelRatio, isMobile ? 1 : 1.25),
    );
    if (reducedMotion) renderFrame();
  }
  window.addEventListener("resize", resize, { passive: true });
  document.addEventListener("visibilitychange", resumeIfAllowed);

  const cameraModal = document.getElementById("cameraModal");
  if (cameraModal) {
    new MutationObserver(resumeIfAllowed).observe(cameraModal, {
      attributes: true,
      attributeFilter: ["class"],
    });
  }

  if (reducedMotion) {
    renderFrame();
  } else {
    animate();
  }
})();
