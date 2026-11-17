// Hand-built models, one per project. Monochrome: ceramic white, gunmetal, steel, one accent.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const M = {
  bone: new THREE.MeshPhysicalMaterial({ color: 0xe8e6e1, roughness: 0.38, clearcoat: 0.5, clearcoatRoughness: 0.35 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x17171a, roughness: 0.34, metalness: 0.85 }),
  steel: new THREE.MeshStandardMaterial({ color: 0x8b8b90, roughness: 0.3, metalness: 1 }),
  chrome: new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.08, metalness: 1 }),
  glass: new THREE.MeshStandardMaterial({ color: 0x050506, roughness: 0.08, metalness: 0.6 }),
  fur: new THREE.MeshPhysicalMaterial({ color: 0xdedbd4, roughness: 1, sheen: 1, sheenRoughness: 0.6, sheenColor: 0xffffff }),
  accent: new THREE.MeshStandardMaterial({ color: 0xff5a1f, roughness: 0.4, emissive: 0xff4a10, emissiveIntensity: 0.9 }),
  glow: new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 1.4 }),
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

/* suyasuya: a soft thing that dozes */
export function sleeper() {
  const g = new THREE.Group();
  const body = ball(0.8, M.fur); body.scale.set(1.2, 0.78, 1);
  const lid = (s) => {
    const m = shadow(new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.016, 8, 24, Math.PI), M.dark));
    m.rotation.z = Math.PI; return at(m, s * 0.17, 0.02, 0.47);
  };
  const head = pivot(0.62, 0.34, 0.1,
    ball(0.5, M.fur), lid(-1), lid(1),
    at(ball(0.16, M.fur), -0.3, 0.38, 0), at(ball(0.16, M.fur), 0.3, 0.38, 0),
  );
  head.rotation.y = 0.5;
  g.add(body, head, at(rbox(0.5, 0.12, 0.5, M.dark, 0.05), -0.1, -0.64, 0));
  return finish(g, (t) => {
    const b = Math.sin(t * 1.3);
    body.scale.y = 0.78 + b * 0.03;
    const k = (t % 9) / 9;                       // nod off, then jolt awake
    const nod = k < 0.7 ? (k / 0.7) ** 2 * 0.5 : 0.5 * Math.max(0, 1 - (k - 0.7) / 0.06);
    head.rotation.x = nod;
    head.position.y = 0.34 + b * 0.02;
  });
}

/* mocopi: a sensor puck and a baton keeping time */
export function conductor() {
  const g = new THREE.Group();
  const baton = pivot(0, 0.14, 0,
    at(cyl(0.022, 1.9, M.bone, 16), 0, 0.95, 0),
    at(ball(0.07, M.accent), 0, 1.9, 0),
    ball(0.13, M.steel),
  );
  g.add(
    cyl(0.62, 0.24, M.dark, 64),
    at(cyl(0.5, 0.02, M.glass, 64), 0, 0.125, 0),
    at(cyl(0.63, 0.03, M.steel, 64), 0, -0.06, 0),
    baton,
  );
  return finish(g, (t) => {
    baton.rotation.z = Math.sin(t * 3.2) * 0.55;
    baton.rotation.x = Math.sin(t * 6.4) * 0.16;
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
