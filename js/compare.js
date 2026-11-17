import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// Same material, lights and camera for both, so only the geometry differs.
const shell = new THREE.MeshPhysicalMaterial({ color: 0x34343a, roughness: 0.82, sheen: 0.6, sheenRoughness: 0.8, sheenColor: 0x9a9aa8, side: THREE.DoubleSide });
const eye = new THREE.MeshPhysicalMaterial({ color: 0x020203, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05 });
const loader = new GLTFLoader();
const state = { move: true, yaw: 0, t: 0 };
const panes = [];

for (const canvas of document.querySelectorAll('canvas[data-model]')) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const scene = new THREE.Scene();
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(renderer), 0.04).texture;
  const key = new THREE.DirectionalLight(0xffffff, 2.6); key.position.set(-6, 12, 7); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4 }); key.shadow.radius = 5;
  const rim = new THREE.DirectionalLight(0xffb89a, 1.6); rim.position.set(8, 5, -8);
  scene.add(key, rim);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: 0.6 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
  const turn = new THREE.Group(); scene.add(turn);
  const pane = { canvas, renderer, scene, camera, turn, head: null };
  panes.push(pane);

  loader.load(canvas.dataset.model, ({ scene: m }) => {
    m.traverse((o) => {
      if (o.name === 'Head') pane.head = o;
      if (o.isMesh) { o.castShadow = o.receiveShadow = true; o.material = o.name.startsWith('Eye') ? eye : shell; }
    });
    const box = new THREE.Box3().setFromObject(m);
    const s = 2.2 / (box.max.y - box.min.y);
    m.scale.setScalar(s);
    const b2 = new THREE.Box3().setFromObject(m);
    const c = b2.getCenter(new THREE.Vector3());
    m.position.set(-c.x, -b2.min.y, -c.z);
    turn.add(m);
  });

  let drag = false, lx = 0;
  canvas.addEventListener('pointerdown', (e) => { drag = true; lx = e.clientX; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', (e) => { if (drag) { state.yaw += (e.clientX - lx) * 0.01; lx = e.clientX; } });
  canvas.addEventListener('pointerup', () => (drag = false));
  canvas.addEventListener('pointercancel', () => (drag = false));
}

function resize() {
  for (const p of panes) {
    const w = p.canvas.clientWidth, h = p.canvas.clientHeight;
    p.renderer.setSize(w, h, false);
    p.camera.aspect = w / h;
    p.camera.position.set(0, 1.9, (w / h < 0.8 ? 9.5 : 7.4));
    p.camera.lookAt(0, 1.45, 0);
    p.camera.updateProjectionMatrix();
  }
}
resize(); addEventListener('resize', resize);

document.getElementById('move').addEventListener('click', (e) => {
  state.move = !state.move; e.currentTarget.setAttribute('aria-pressed', state.move);
});
document.getElementById('front').addEventListener('click', () => { state.yaw = 0; });

let last = performance.now();
(function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (state.move) state.t += dt;
  const k = (state.t % 9) / 9;                       // the same doze cycle for both
  let nod = 0, pan = 0;
  if (k < 0.62) nod = (k / 0.62) ** 2 * 0.42;
  else if (k < 0.66) nod = 0.42 * (1 - (k - 0.62) / 0.04);
  else pan = Math.sin((k - 0.66) / 0.34 * Math.PI * 2) * 0.5;
  for (const p of panes) {
    p.turn.rotation.y = state.yaw;
    if (p.head) { p.head.rotation.x = state.move ? nod : 0; p.head.rotation.y = state.move ? pan : 0; }
    p.renderer.render(p.scene, p.camera);
  }
})(last);
