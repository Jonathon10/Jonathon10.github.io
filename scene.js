// "The Jonathon Line" — 3D transit scene (Three.js)
// A clay-toy world of colored track lines; a train rides the main line as you scroll.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export function initScene(canvas) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const BG = new THREE.Color('#f3efe6');

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = BG;
  scene.fog = new THREE.Fog(BG, 16, 52);

  const camera = new THREE.PerspectiveCamera(34, window.innerWidth / window.innerHeight, 0.1, 200);

  // ---------- Lights ----------
  scene.add(new THREE.HemisphereLight(0xffffff, 0xe9dcc4, 1.7));
  const sun = new THREE.DirectionalLight(0xfff6e8, 2.4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 60 });
  sun.shadow.bias = -0.0004;
  scene.add(sun, sun.target);

  // ---------- Ground: soft shadows + map grid ----------
  const GROUND_Y = -1.7;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(800, 800), new THREE.ShadowMaterial({ opacity: 0.14, color: 0x4a3a20 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = GROUND_Y;
  ground.receiveShadow = true;
  scene.add(ground);
  const grid = new THREE.GridHelper(800, 200, 0xddd5c3, 0xe3dccc);
  grid.position.set(0, GROUND_Y + 0.01, -80);
  grid.material.transparent = true;
  grid.material.opacity = 0.7;
  scene.add(grid);

  // ---------- Track lines ----------
  const SEG = 28, STEP = 7;
  const LINES = [
    { color: '#ff5a36', main: true },
    { color: '#2f5bff', amp: 3.4, freq: 0.52, phase: 0.4, x0: 0.5, y0: 0.55, ya: 0.5 },
    { color: '#12a150', amp: 4.6, freq: 0.41, phase: 2.2, x0: 1.2, y0: -0.45, ya: 0.45 },
    { color: '#8b5cf6', amp: 3.9, freq: 0.47, phase: 4.1, x0: -1.4, y0: 1.05, ya: 0.6 },
    { color: '#ffbe0b', amp: 5.6, freq: 0.33, phase: 1.3, x0: 2.2, y0: -0.9, ya: 0.35 },
  ];
  let mainCurve;
  LINES.forEach((L) => {
    const pts = [];
    for (let i = 0; i <= SEG; i++) {
      const z = 14 - i * STEP;
      if (L.main) pts.push(new THREE.Vector3(Math.sin(i * 0.38) * 2.0, Math.sin(i * 0.55) * 0.35, z));
      else pts.push(new THREE.Vector3(L.x0 + Math.sin(i * L.freq + L.phase) * L.amp, L.y0 + Math.sin(i * 0.6 + L.phase) * L.ya, z));
    }
    const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
    const tube = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 900, L.main ? 0.24 : 0.15, 18, false),
      new THREE.MeshStandardMaterial({ color: L.color, roughness: 0.32, metalness: 0.05 })
    );
    tube.castShadow = true;
    scene.add(tube);
    if (L.main) mainCurve = curve;

    // little support pillars down to the ground
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });
    for (let k = 0.02; k < 1; k += L.main ? 0.025 : 0.04) {
      const p = curve.getPointAt(k);
      const h = p.y - GROUND_Y;
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, h, 8), pillarMat);
      pillar.position.set(p.x, GROUND_Y + h / 2, p.z);
      pillar.castShadow = true;
      scene.add(pillar);
    }
  });

  // ---------- Stations (one per page section) ----------
  const stationGroup = new THREE.Group();
  scene.add(stationGroup);
  const stationMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
  const ringMat = new THREE.MeshStandardMaterial({ color: 0x15140f, roughness: 0.4 });
  function buildStations(ts) {
    stationGroup.clear();
    ts.forEach((t) => {
      const p = mainCurve.getPointAt(t);
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.42, 32, 32), stationMat);
      const r = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.075, 16, 48), ringMat);
      const tan = mainCurve.getTangentAt(t);
      r.lookAt(tan);
      s.position.copy(p);
      r.position.copy(p);
      s.castShadow = r.castShadow = true;
      stationGroup.add(s, r);
    });
  }

  // ---------- Train ----------
  const train = new THREE.Group();
  const bodyGeo = new THREE.CapsuleGeometry(0.34, 1.5, 8, 24);
  bodyGeo.rotateX(Math.PI / 2);
  const body = new THREE.Mesh(bodyGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25 }));
  const bandGeo = new THREE.CapsuleGeometry(0.35, 1.22, 8, 24);
  bandGeo.rotateX(Math.PI / 2);
  const band = new THREE.Mesh(bandGeo, new THREE.MeshStandardMaterial({ color: 0x1c1b22, roughness: 0.15 }));
  band.scale.y = 0.32;
  band.position.y = 0.09;
  const stripeGeo = new THREE.CapsuleGeometry(0.352, 1.5, 8, 24);
  stripeGeo.rotateX(Math.PI / 2);
  const stripe = new THREE.Mesh(stripeGeo, new THREE.MeshStandardMaterial({ color: 0xff5a36, roughness: 0.3 }));
  stripe.scale.y = 0.12;
  stripe.position.y = -0.14;
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 16), new THREE.MeshStandardMaterial({ color: 0xffe08a, emissive: 0xffc94d, emissiveIntensity: 1.5 }));
  lamp.position.set(0, -0.02, 1.08);
  [body, band, stripe].forEach((m) => { m.castShadow = true; });
  train.add(body, band, stripe, lamp);
  scene.add(train);

  // ---------- Clay toys floating along the route ----------
  const pastel = ['#ffd2c4', '#c9d6ff', '#bfeed3', '#ffe7a3', '#ddd0ff', '#ffffff', '#ffb8a6'];
  const geos = [
    new RoundedBoxGeometry(1, 1, 1, 4, 0.2),
    new THREE.SphereGeometry(0.6, 32, 32),
    new THREE.TorusGeometry(0.5, 0.2, 24, 64),
    new THREE.ConeGeometry(0.55, 1.1, 32),
    new THREE.CylinderGeometry(0.45, 0.45, 0.9, 32),
    new THREE.TorusKnotGeometry(0.4, 0.14, 120, 16),
  ];
  const toys = [];
  for (let i = 0; i < 46; i++) {
    const m = new THREE.Mesh(geos[i % geos.length], new THREE.MeshStandardMaterial({ color: pastel[i % pastel.length], roughness: 0.45 }));
    const side = i % 2 ? 1 : -1;
    m.position.set(side * (6 + Math.random() * 8), 0.4 + Math.random() * 3.6, 14 - Math.random() * 190);
    m.rotation.set(Math.random() * 6, Math.random() * 6, 0);
    m.scale.setScalar(0.6 + Math.random() * 0.9);
    m.castShadow = true;
    m.userData = { by: m.position.y, ph: Math.random() * 6.28, rs: 0.1 + Math.random() * 0.3 };
    scene.add(m);
    toys.push(m);
  }

  // ---------- Scroll → route position ----------
  const T0 = 0.03, T1 = 0.9;
  const scrollToT = (y) => {
    const max = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
    return THREE.MathUtils.lerp(T0, T1, Math.min(Math.max(y / max, 0), 1));
  };
  function placeStations() {
    const ts = [...document.querySelectorAll('[data-station]')].map((s) => scrollToT(s.offsetTop) + 0.012);
    buildStations(ts);
  }

  // ---------- Layout ----------
  let mobile = false;
  function layout() {
    const w = window.innerWidth, h = window.innerHeight;
    mobile = w <= 900;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    if (mobile) camera.setViewOffset(w, h, 0, h * 0.2, w, h);
    else camera.setViewOffset(w, h, -w * 0.24, h * 0.04, w, h);
    camera.updateProjectionMatrix();
    placeStations();
  }
  layout();
  window.addEventListener('resize', layout);
  window.addEventListener('load', placeStations);
  setTimeout(placeStations, 1200);

  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  window.addEventListener('pointermove', (e) => {
    mouse.tx = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.ty = -((e.clientY / window.innerHeight) * 2 - 1);
  }, { passive: true });

  // ---------- Loop ----------
  const clock = new THREE.Clock();
  let tSmooth = scrollToT(window.scrollY);
  const tmp = new THREE.Vector3(), ahead = new THREE.Vector3(), up = new THREE.Vector3(0, 0.55, 0);

  function tick() {
    const t = clock.getElapsedTime();
    const intro = reduced ? 1 : Math.min(t / 2.6, 1);
    const ease = 1 - Math.pow(1 - intro, 3);

    mouse.x += (mouse.tx - mouse.x) * 0.05;
    mouse.y += (mouse.ty - mouse.y) * 0.05;
    tSmooth += (scrollToT(window.scrollY) - tSmooth) * 0.07;

    // train rides slightly ahead of the camera focus
    const trainT = Math.min(tSmooth + 0.012, 0.999);
    mainCurve.getPointAt(trainT, tmp);
    train.position.copy(tmp).add(up);
    train.position.y += Math.sin(t * 6) * 0.012;
    mainCurve.getPointAt(Math.min(trainT + 0.004, 1), ahead);
    train.lookAt(ahead.add(up));

    // camera: side-front three-quarter view; flies in on load
    const dist = 1 + (1 - ease) * 1.4;
    const off = mobile ? new THREE.Vector3(8, 7, 14) : new THREE.Vector3(10, 7.5, 13.5);
    camera.position.set(
      tmp.x + (off.x + mouse.x * 1.4) * dist,
      tmp.y + (off.y + mouse.y * 0.9) * dist + (1 - ease) * 4,
      tmp.z + off.z * dist
    );
    camera.lookAt(tmp.x, tmp.y + 0.3, tmp.z - 1.5);

    sun.position.set(tmp.x + 7, tmp.y + 14, tmp.z + 8);
    sun.target.position.copy(tmp);

    toys.forEach((m) => {
      m.rotation.x += m.userData.rs * 0.01;
      m.rotation.y += m.userData.rs * 0.013;
      m.position.y = m.userData.by + Math.sin(t * 0.8 + m.userData.ph) * 0.25;
    });

    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
