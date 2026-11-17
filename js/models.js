// Hand-built models, one per project. Monochrome: ceramic white, gunmetal, steel, one accent.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Models made in Blender (tools/*.py) are loaded once, then cloned per scene.
const gltf = {};
export async function preload() {
  const loader = new GLTFLoader();
  const base = new URL('../models/', import.meta.url);
  await Promise.all(['suyasuya'].map(async (name) => {
    try { gltf[name] = (await loader.loadAsync(new URL(name + '.glb?v=4', base).href)).scene; }
    catch (e) { console.warn('model failed to load:', name, e); }
  }));
}

const M = {
  bone: new THREE.MeshPhysicalMaterial({ color: 0xe8e6e1, roughness: 0.38, clearcoat: 0.5, clearcoatRoughness: 0.35 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x17171a, roughness: 0.34, metalness: 0.85 }),
  steel: new THREE.MeshStandardMaterial({ color: 0x8b8b90, roughness: 0.3, metalness: 1 }),
  chrome: new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.08, metalness: 1 }),
  glass: new THREE.MeshStandardMaterial({ color: 0x050506, roughness: 0.08, metalness: 0.6 }),
  fur: new THREE.MeshPhysicalMaterial({ color: 0xdedbd4, roughness: 1, sheen: 1, sheenRoughness: 0.6, sheenColor: 0xffffff }),
  accent: new THREE.MeshStandardMaterial({ color: 0xff5a1f, roughness: 0.4, emissive: 0xff4a10, emissiveIntensity: 0.9 }),
  glow: new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 1.4 }),
  pla: new THREE.MeshPhysicalMaterial({ color: 0x1e1e22, roughness: 0.32, metalness: 0.1, clearcoat: 0.6, clearcoatRoughness: 0.25 }),
  hole: new THREE.MeshBasicMaterial({ color: 0x000000 }),
};

function shadow(m) { m.castShadow = true; m.receiveShadow = true; return m; }
function rbox(w, h, d, mat, r) {
  const rad = r ?? Math.min(w, h, d) * 0.18;
  return shadow(new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 4, rad), mat));
}
function cyl(r, h, mat, seg = 48) { return shadow(new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), mat)); }
function ball(r, mat) { return shadow(new THREE.Mesh(new THREE.SphereGeometry(r, 48, 32), mat)); }
function at(o, x, y, z) { o.position.set(x, y, z); return o; }
function faceZ(o) { o.rotation.x = Math.PI / 2; return o; }
function pivot(x, y, z, ...kids) { const g = new THREE.Group(); g.position.set(x, y, z); g.add(...kids); return g; }

// Recentre on the bounding box so the physics body and the mesh share an origin.
function finish(inner, update, extra = {}) {
  const box = new THREE.Box3().setFromObject(inner);
  const c = box.getCenter(new THREE.Vector3());
  const s = box.getSize(new THREE.Vector3());
  inner.position.sub(c);
  const group = new THREE.Group();
  group.add(inner);
  return { group, size: [s.x, s.y, s.z], update, shape: 'box', ...extra };
}
function limb(x, y, z, w, l1, l2, m1, m2) {
  const upper = at(rbox(w, l1, w, m1), 0, -l1 / 2, 0);
  const lower = pivot(0, -l1, 0, at(rbox(w * 0.88, l2, w * 0.88, m2), 0, -l2 / 2, 0));
  return { p: pivot(x, y, z, upper, lower), lower };
}

/* Stack-chan: a small face on a pan/tilt neck that talks */
export function stackchan() {
  const g = new THREE.Group();
  const mouth = at(rbox(0.26, 0.05, 0.02, M.glow, 0.009), 0, -0.2, 0.33);
  const eyes = [-1, 1].map((s) => at(faceZ(cyl(0.065, 0.02, M.glow)), s * 0.24, 0.08, 0.33));
  const head = pivot(0, 0.42, 0,
    at(rbox(1.2, 1.12, 0.62, M.bone, 0.1), 0, 0.5, 0),
    at(rbox(1.0, 0.8, 0.04, M.glass, 0.018), 0, 0.56, 0.305),
  );
  const face = pivot(0, 0.56, 0, mouth, ...eyes);
  head.add(face);
  g.add(
    at(rbox(0.9, 0.3, 0.7, M.dark, 0.06), 0, 0, 0),
    at(cyl(0.2, 0.2, M.steel), 0, 0.26, 0),
    at(rbox(0.1, 0.05, 0.02, M.accent, 0.009), 0.3, 0, 0.36),
    head,
  );
  return finish(g, (t) => {
    head.rotation.y = Math.sin(t * 0.9) * 0.45;
    head.rotation.x = Math.sin(t * 1.4) * 0.1;
    const talk = Math.max(0, Math.sin(t * 0.7)) > 0.3 ? Math.abs(Math.sin(t * 11)) : 0;
    mouth.scale.y = 1 + talk * 3.2;
    const blink = (t % 3.4) < 0.12 ? 0.1 : 1;
    eyes.forEach((e) => (e.scale.z = blink));
  });
}

/* G1 Walking Simulator */
export function humanoid() {
  const g = new THREE.Group();
  g.add(
    at(rbox(0.78, 0.8, 0.44, M.dark), 0, 0.5, 0),
    at(rbox(0.42, 0.38, 0.4, M.bone), 0, 1.16, 0),
    at(rbox(0.34, 0.1, 0.06, M.glass, 0.025), 0, 1.18, 0.19),
    at(rbox(0.2, 0.025, 0.02, M.accent, 0.009), 0, 1.18, 0.225),
    at(rbox(0.6, 0.24, 0.38, M.steel), 0, -0.05, 0),
  );
  const legs = [-1, 1].map((s) => {
    const l = limb(s * 0.2, -0.15, 0, 0.24, 0.55, 0.55, M.bone, M.dark);
    l.lower.add(at(rbox(0.27, 0.12, 0.44, M.bone), 0, -0.6, 0.08));
    g.add(l.p); return l;
  });
  const arms = [-1, 1].map((s) => {
    const l = limb(s * 0.52, 0.84, 0, 0.18, 0.45, 0.42, M.dark, M.bone);
    g.add(l.p); return l;
  });
  return finish(g, (t) => {
    const s = Math.sin(t * 4.6);
    legs.forEach((l, i) => {
      const k = i ? s : -s;
      l.p.rotation.x = k * 0.55;
      l.lower.rotation.x = Math.max(0, k) * 0.95;
    });
    arms.forEach((l, i) => {
      const k = i ? -s : s;
      l.p.rotation.x = k * 0.5;
      l.lower.rotation.x = -0.35 - Math.max(0, -k) * 0.5;
    });
  });
}

/* オモイゾウコ: the door opens slowly, like it weighs something */
export function fridge() {
  const g = new THREE.Group();
  const door = pivot(-0.575, -0.33, 0.535,
    at(rbox(1.15, 1.3, 0.1, M.bone, 0.04), 0.575, 0, 0),
    at(rbox(0.06, 0.5, 0.08, M.dark, 0.028), 1.0, 0.28, 0.09),
  );
  g.add(
    rbox(1.15, 2.0, 0.95, M.bone, 0.07),
    at(rbox(0.95, 1.12, 0.02, M.accent, 0.009), 0, -0.33, 0.478),
    at(rbox(1.15, 0.64, 0.1, M.bone, 0.04), 0, 0.67, 0.535),
    at(rbox(0.06, 0.26, 0.08, M.dark, 0.028), 0.425, 0.56, 0.625),
    door,
  );
  const ease = (x) => x * x * (3 - 2 * x);
  return finish(g, (t) => {
    const k = (t % 7) / 7;
    let a = 0;
    if (k < 0.62) a = ease(k / 0.62);
    else if (k < 0.74) a = 1;
    else if (k < 0.86) a = 1 - Math.pow((k - 0.74) / 0.12, 2);
    door.rotation.y = -1.2 * a;
  });
}

/* suyasuya: modelled in Blender from the printed parts (tools/suyasuya.py) */
const SUYA = {
  shell: new THREE.MeshPhysicalMaterial({ color: 0x34343a, roughness: 0.82, sheen: 0.6, sheenRoughness: 0.8, sheenColor: 0x9a9aa8 }),
  eye: new THREE.MeshPhysicalMaterial({ color: 0x020203, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05 }),
};
export function sleeper() {
  const src = gltf.suyasuya;
  if (!src) {                                       // fallback while offline: a plain egg and ball
    const g = new THREE.Group();
    g.add(at(ball(0.7, M.pla), 0, 0.7, 0), at(ball(0.62, M.pla), 0, 1.8, 0));
    return finish(g, null);
  }
  const g = src.clone(true);
  g.scale.setScalar(0.17);
  let head = null;
  const eyes = [];
  g.traverse((o) => {
    if (o.name === 'Head') head = o;
    if (!o.isMesh) return;
    o.castShadow = o.receiveShadow = true;
    o.material = o.name.startsWith('Eye') ? SUYA.eye : SUYA.shell;
    if (o.name.startsWith('Eye')) eyes.push(o);
  });
  const eyeZ = eyes.map((e) => e.scale.z);
  return finish(g, (t) => {
    const k = (t % 9) / 9;                         // nod off slowly, jolt awake, look round
    let nod = 0, pan = 0;
    if (k < 0.62) nod = (k / 0.62) ** 2 * 0.42;
    else if (k < 0.66) nod = 0.42 * (1 - (k - 0.62) / 0.04);
    else pan = Math.sin((k - 0.66) / 0.34 * Math.PI * 2) * 0.5;
    if (head) { head.rotation.x = nod; head.rotation.y = pan; }
    const open = k > 0.4 && k < 0.62 ? 0.18 : (t % 3.7 < 0.12 ? 0.15 : 1);   // eyes get heavy as it dozes
    eyes.forEach((e, i) => (e.scale.y = e.scale.x = 1, e.scale.z = eyeZ[i], e.scale.y = open));
  });
}

/* mocopi Conductor: the exhibit screen with five instruments, and a baton keeping four */
export function conductor() {
  const g = new THREE.Group();
  // rolling stand
  g.add(
    at(rbox(1.5, 0.08, 0.6, M.dark, 0.03), 0, -1.05, 0),
    at(rbox(0.08, 1.15, 0.08, M.steel, 0.02), -0.45, -0.5, -0.05),
    at(rbox(0.08, 1.15, 0.08, M.steel, 0.02), 0.45, -0.5, -0.05),
    at(rbox(1.0, 0.05, 0.4, M.dark, 0.02), 0, -0.45, 0),
  );
  [-0.62, 0.62].forEach((x) => [-0.22, 0.22].forEach((z) => g.add(at(ball(0.07, M.dark), x, -1.13, z))));
  // display
  g.add(
    at(rbox(2.6, 1.5, 0.1, M.dark, 0.04), 0, 0.55, -0.08),
    at(rbox(2.48, 1.38, 0.02, M.glass, 0.01), 0, 0.55, -0.02),
  );
  // the orchestra: flute, oboe, clarinet, horn, trumpet
  const inst = [];
  const add = (x, grp) => { grp.position.set(x, 0.42, 0.04); g.add(grp); inst.push(grp); };
  const pipe = (len, r, bell) => {
    const p = new THREE.Group();
    p.add(cyl(r, len, M.bone, 20));
    for (let i = 0; i < 4; i++) p.add(at(cyl(r * 1.5, 0.02, M.steel, 16), 0, -len * 0.3 + i * len * 0.18, 0));
    if (bell) { const c = shadow(new THREE.Mesh(new THREE.CylinderGeometry(r, r * 2.6, 0.12, 24, 1, true), M.bone)); c.position.y = -len / 2 - 0.05; p.add(c); }
    return p;
  };
  add(-0.96, pipe(0.95, 0.03, false));
  add(-0.5, pipe(0.8, 0.034, true));
  add(-0.05, pipe(0.85, 0.036, true));
  const horn = new THREE.Group();
  horn.add(shadow(new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.035, 12, 48), M.steel)));
  const hb = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.17, 0.22, 32, 1, true), M.steel));
  hb.rotation.z = -Math.PI / 2; hb.position.set(0.24, -0.14, 0); horn.add(hb);
  add(0.45, horn);
  const trumpet = new THREE.Group();
  trumpet.add(cyl(0.028, 0.6, M.steel, 16));
  const tb = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.14, 0.2, 32, 1, true), M.steel));
  tb.position.y = 0.38; trumpet.add(tb);
  [-0.07, 0, 0.07].forEach((y) => trumpet.add(at(cyl(0.022, 0.12, M.bone, 12), 0.06, y, 0)));
  trumpet.rotation.z = -0.25;
  add(0.95, trumpet);
  // the soloist's spotlight
  const spot = at(rbox(0.36, 1.16, 0.012, M.accent, 0.01), 0, 0.55, -0.005);
  spot.material = M.accent;
  g.add(spot);
  // baton and the conductor's hand-held sensor
  const baton = new THREE.Group();
  baton.add(
    at(cyl(0.016, 1.0, M.bone, 12), 0, 0.5, 0),
    at(ball(0.035, M.accent), 0, 1.0, 0),
    at(rbox(0.12, 0.2, 0.12, M.dark, 0.04), 0, -0.05, 0),
    at(faceZ(cyl(0.05, 0.03, M.steel)), 0, 0.0, 0.07),
  );
  baton.position.set(0.4, -0.6, 0.85);
  g.add(baton);

  const xs = [-0.96, -0.5, -0.05, 0.45, 0.95];
  return finish(g, (t) => {
    // four-beat pattern: down, left, right, up
    const beat = (t * 1.6) % 4, b = Math.floor(beat), f = beat - b;
    const ease = f * f * (3 - 2 * f);
    const pose = [[0.15, -0.55], [-0.6, -0.1], [0.65, -0.05], [0, 0.45]];
    const a = pose[b], c = pose[(b + 1) % 4];
    baton.rotation.z = -(a[0] + (c[0] - a[0]) * ease);
    baton.rotation.x = -(a[1] + (c[1] - a[1]) * ease) * 0.6 - 0.25;
    // the soloist changes every two bars
    const solo = Math.floor(t / 5) % 5;
    spot.position.x += (xs[solo] - spot.position.x) * 0.08;
    inst.forEach((p, i) => {
      const on = i === solo;
      const s = p.scale.x + ((on ? 1.12 : 1) - p.scale.x) * 0.1;
      p.scale.setScalar(s);
      p.position.y = 0.42 + (on ? Math.abs(Math.sin(t * Math.PI * 1.6)) * 0.05 : 0);
    });
  });
}

/* Keio Robotics website */
export function browser() {
  const g = new THREE.Group();
  g.add(
    rbox(1.8, 1.3, 0.14, M.dark, 0.05),
    at(rbox(1.66, 0.94, 0.02, M.glass, 0.009), 0, -0.1, 0.07),
    at(rbox(0.72, 0.1, 0.02, M.bone, 0.009), -0.34, 0.14, 0.085),
    at(rbox(0.48, 0.05, 0.02, M.steel, 0.009), -0.46, -0.02, 0.085),
    at(rbox(0.36, 0.05, 0.02, M.steel, 0.009), -0.52, -0.13, 0.085),
  );
  [M.accent, M.steel, M.steel].forEach((m, i) => g.add(at(faceZ(cyl(0.04, 0.03, m)), -0.76 + i * 0.13, 0.53, 0.07)));
  const cube = at(rbox(0.36, 0.36, 0.36, M.chrome, 0.05), 0.46, -0.14, 0.34);
  g.add(cube);
  return finish(g, (t) => {
    cube.rotation.set(t * 0.9, t * 1.3, 0);
    cube.position.z = 0.34 + Math.sin(t * 1.6) * 0.05;
  });
}

/* SKIP website: the pages are drawn stitch by stitch */
export function hoop() {
  const g = new THREE.Group();
  const ring = shadow(new THREE.Mesh(new THREE.TorusGeometry(0.86, 0.07, 16, 96), M.steel));
  g.add(ring, faceZ(cyl(0.84, 0.03, M.bone, 96)), at(rbox(0.2, 0.16, 0.12, M.dark), 0, 0.96, 0));
  const stitches = [];
  const N = 22;
  for (let i = 0; i < N; i++) {
    const a = (i / (N - 1)) * Math.PI * 1.55 - 0.3;      // an S-curve, sampled
    const up = i < N / 2;
    const cx = up ? 0.0 : 0.0, cy = up ? 0.3 : -0.3, r = 0.3;
    const ang = up ? Math.PI * 0.1 + (i / (N / 2)) * Math.PI * 1.35 : -Math.PI * 0.9 + ((i - N / 2) / (N / 2)) * -Math.PI * 1.35;
    const s = at(rbox(0.15, 0.05, 0.03, M.accent, 0.012), cx + Math.cos(ang) * r, cy + Math.sin(ang) * r, 0.03);
    s.rotation.z = ang + Math.PI / 2 + (i % 2 ? 0.5 : -0.5);
    stitches.push(s); g.add(s);
    void a;
  }
  return finish(g, (t) => {
    const k = ((t * 0.22) % 1.25) * N;
    stitches.forEach((s, i) => s.scale.setScalar(THREE.MathUtils.clamp(k - i, 0.001, 1)));
  });
}

/* Bucket */
export function phone() {
  const g = new THREE.Group();
  g.add(
    rbox(0.95, 1.9, 0.12, M.steel, 0.055),
    at(rbox(0.86, 1.8, 0.02, M.glass, 0.009), 0, 0, 0.06),
    at(rbox(0.4, 0.09, 0.02, M.bone, 0.009), -0.16, 0.64, 0.075),
  );
  const checks = [0, 1, 2].map((i) => {
    const y = 0.26 - i * 0.32;
    const c = at(faceZ(cyl(0.075, 0.03, i === 2 ? M.steel : M.accent)), -0.28, y, 0.085);
    g.add(c, at(rbox(0.42 - i * 0.07, 0.05, 0.02, M.bone, 0.009), 0.07 - i * 0.035, y, 0.075));
    return c;
  });
  const cone = shadow(new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.22, 32), M.bone));
  cone.rotation.x = Math.PI;
  const pin = pivot(0.2, -0.56, 0.3, at(ball(0.13, M.bone), 0, 0.13, 0), cone);
  g.add(pin);
  return finish(g, (t) => {
    checks.forEach((c, i) => c.scale.setScalar(1 + 0.35 * Math.max(0, Math.sin(t * 2.2 - i * 1.1)) ** 4));
    pin.position.y = -0.56 + Math.sin(t * 2.4) * 0.05;
  });
}

/* loose props, no project attached */
export function propBall() {
  const g = new THREE.Group();
  g.add(ball(0.34, M.chrome));
  return finish(g, null, { shape: 'sphere', radius: 0.34 });
}
export function propNut() {
  const g = new THREE.Group();
  g.add(cyl(0.38, 0.3, M.steel, 6), cyl(0.17, 0.31, M.glass, 32));
  return finish(g, null);
}

export const builders = {
  stackchan, g1: humanoid, omoi: fridge, suyasuya: sleeper,
  mocopi: conductor, kr: browser, skip: hoop, bucket: phone,
};
