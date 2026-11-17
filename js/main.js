import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { builders, propBall, propNut, preload } from './models.js?v=4';

/* ───────── content: edit here ───────── */
const WORKS = [
  {
    key: 'stackchan', title: 'Stack-chan', sub: '手元の GPU だけで喋る、ラウンジの会話ロボット', meta: 'Keio Robotics — 2026',
    desc: '矢上イノベーションラボのラウンジにいるスタックチャン。音声認識・LLM・音声合成をすべて手元の RTX 4090 で動かし、クラウドには一切つながずに日本語で会話します。顔と声で「前にも会った人」を見分けて、その人との会話を覚えています。聞かれたときだけ大学の資料を検索して答える仕組みも入れました。',
    tags: ['Local LLM', 'Ollama', 'VOICEVOX', 'InsightFace', 'RAG', 'M5Stack Core2'],
  },
  {
    key: 'g1', title: 'G1 Walking Simulator', sub: 'ブラウザの中で歩くヒューマノイド', meta: 'Simulation — 2026',
    desc: 'G1 級の小型ヒューマノイドをブラウザで歩かせる 3D シミュレーター。LIPM による歩行生成とキャプチャポイントによるバランス制御を TypeScript と Python の両方で実装し、MuJoCo + PPO で学習したポリシーも ONNX でそのまま持ち込めます。軽く押せば踏みとどまり、強く押せばちゃんと転びます。',
    tags: ['TypeScript', 'Rapier', 'LIPM', 'MuJoCo', 'PPO', 'ONNX'],
  },
  {
    key: 'omoi', title: 'オモイゾウコ', jp: true, sub: 'やることが残っている夜ほど、冷蔵庫の扉が重くなる', meta: 'JPHACKS 2026',
    desc: 'その日の達成度が、冷蔵庫の扉の「重さ」になって返ってくるハードウェア。通知は無視できても、手を伸ばしたその瞬間の重さは無視できない。JPHACKS 2026 で Hack Day Audience Award と三菱重工賞を受賞しました。',
    tags: ['Hardware', 'Firmware', 'Motor control'],
    link: ['Watch the demo', 'https://youtu.be/DcB4BT7XZRE'],
  },
  {
    key: 'suyasuya', title: 'suyasuya', sub: 'まわりの音に合わせて、うとうとするロボット', meta: 'Keio Robotics — In progress',
    desc: '周りの音を聞いて、寝る・見渡す・うとうとする、ふわふわのロボット。サーボ 2 個と ESP32 だけで、首ふりとうなずきの 5 つの動きをつくります。速度と加速度の両方に上限をかけて、眠そうな動きに見えるようにしています。',
    tags: ['ESP32', 'Servo', 'HRI', '3D print'],
  },
  {
    key: 'mocopi', title: 'mocopi Conductor', sub: '体の動きで、オーケストラを指揮する', meta: 'Unity — 2026',
    desc: 'モーションキャプチャ mocopi を着けて、腕の振りと視線でオーケストラを指揮する展示作品。見た楽器が選ばれ、振りの大きさが音になり、止めのポーズで演奏が止まります。Unity で制作しました。',
    tags: ['Unity', 'C#', 'mocopi', 'Motion capture'],
    poster: ['assets/mocopi-poster.jpg', 'assets/mocopi-poster-thumb.jpg', 'mocopi Conductor の展示ポスター'],
  },
  {
    key: 'kr', title: 'Keio Robotics', sub: 'ロボティクスチームの Web サイト', meta: 'Website — 2026',
    desc: 'Keio Robotics の公式サイト。構成の設計からデザインシステム、実装、お知らせを更新する仕組みまで。トップではロボットの 3D モデルが動きます。',
    tags: ['HTML / CSS', 'three.js', 'CMS'],
  },
  {
    key: 'skip', title: 'SKIP', sub: 'Stanford × Keio 交流プログラムの Web サイト', meta: 'Website — 2026',
    desc: '運営に関わっている Stanford 大学との交流プログラム SKIP のサイト。ロゴや文字の形をサテンステッチの列に変換して、一針ずつ canvas に刺繍していく表現をつくりました。日本語と英語の併記です。',
    tags: ['HTML / CSS', 'Canvas', 'Bilingual'],
  },
  {
    key: 'bucket', title: 'Bucket', sub: '「やりたいこと」を、一緒にやる人と持つ', meta: 'iOS app — 2026',
    desc: '友達や恋人とやりたいことを共有して、実際にやって、あとで振り返る iPhone アプリ。インスタやマップの共有からそのまま追加でき、候補日の投票から当日のリマインドまでを 1 本でつなぎます。',
    tags: ['Swift', 'SwiftUI', 'Firebase', 'MapKit'],
  },
];
const LABEL = Object.fromEntries(WORKS.map((w, i) => [w.key, [String(i + 1).padStart(2, '0'), w.title]]));

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s) => document.querySelector(s);

/* ───────── small UI ───────── */
function tick() {
  $('#clock').textContent = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(new Date());
}
tick(); setInterval(tick, 20000);

function fitName() {
  const h = $('.name');
  const stacked = innerWidth < 720;
  h.classList.toggle('stacked', stacked);
  const targets = stacked ? [...h.children] : [h];
  h.style.fontSize = ''; [...h.children].forEach((c) => (c.style.fontSize = ''));
  const w = h.clientWidth;
  for (const el of targets) {
    const r = document.createRange(); r.selectNodeContents(el);
    const cur = r.getBoundingClientRect().width;
    const fs = parseFloat(getComputedStyle(el).fontSize);
    if (cur > 0) el.style.fontSize = (fs * w / cur) * 0.985 + 'px';
  }
}
fitName();
document.fonts?.ready.then(fitName);
addEventListener('resize', fitName);

/* ───────── work list ───────── */
const list = $('#list');
list.innerHTML = WORKS.map((w, i) => `
  <li class="w" data-key="${w.key}">
    <div class="w-head">
      <span class="w-no">${String(i + 1).padStart(2, '0')}</span>
      <h3 class="w-title${w.jp ? ' jp' : ''}">${w.title}</h3>
      <span class="w-meta">${w.meta}</span>
      <p class="w-sub">${w.sub}</p>
    </div>
    <div class="w-pad">
      <p class="w-desc">${w.desc}</p>
      <ul class="w-tags">${w.tags.map((t) => `<li>${t}</li>`).join('')}</ul>
      ${w.link ? `<a class="btn ghost w-link" href="${w.link[1]}" target="_blank" rel="noopener">${w.link[0]} <i>↗</i></a>` : ''}
      ${w.poster ? `<button class="poster" type="button" data-full="${w.poster[0]}" aria-label="${w.poster[2]}を全画面で見る">
        <img src="${w.poster[1]}" alt="${w.poster[2]}" width="320" height="453" loading="lazy">
        <span class="poster-cta">Poster <i>↗</i></span>
      </button>` : ''}
    </div>
  </li>`).join('');
const rows = [...list.children];

/* full-screen poster */
const lb = document.createElement('dialog');
lb.className = 'lightbox';
lb.innerHTML = `<img alt=""><button class="lb-close" type="button" aria-label="閉じる">Close</button>`;
document.body.append(lb);
const lbImg = lb.querySelector('img');
function closeLb() {
  lb.classList.remove('on');
  setTimeout(() => { lb.close(); lb.classList.remove('zoom'); }, reduced ? 0 : 200);
}
list.addEventListener('click', (e) => {
  const b = e.target.closest('.poster');
  if (!b) return;
  lbImg.src = b.dataset.full; lbImg.alt = b.querySelector('img').alt;
  lb.showModal();
  requestAnimationFrame(() => lb.classList.add('on'));
});
lbImg.addEventListener('click', (e) => {                 // tap to read at full width, tap again to fit
  e.stopPropagation();
  lb.classList.toggle('zoom');
  if (lb.classList.contains('zoom')) {
    const r = lbImg.getBoundingClientRect();
    lb.scrollTop = ((e.clientY - r.top) / r.height) * lb.scrollHeight - innerHeight / 2;
  }
});
lb.querySelector('.lb-close').addEventListener('click', closeLb);
lb.addEventListener('click', (e) => { if (e.target === lb) closeLb(); });
lb.addEventListener('cancel', (e) => { e.preventDefault(); closeLb(); });
let activeKey = null;
let viewer = null;

function setActive(key) {
  if (key === activeKey) return;
  activeKey = key;
  rows.forEach((r) => r.classList.toggle('active', r.dataset.key === key));
  $('#fig-no').textContent = LABEL[key][0];
  viewer?.show(key);
}
function openWork(key) {
  const row = rows.find((r) => r.dataset.key === key);
  row.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
}
// the work whose block crosses the reading line drives the viewer
function pickByScroll() {
  const line = innerHeight * (innerWidth <= 860 ? 0.68 : 0.5);
  let best = null, bd = Infinity;
  for (const r of rows) {
    const b = r.getBoundingClientRect();
    const d = b.top <= line && b.bottom >= line ? 0 : Math.min(Math.abs(b.top - line), Math.abs(b.bottom - line));
    if (d < bd) { bd = d; best = r; }
  }
  if (best) setActive(best.dataset.key);
}
let queued = false;
addEventListener('scroll', () => {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => { queued = false; pickByScroll(); });
}, { passive: true });
addEventListener('resize', pickByScroll);

/* ───────── shared scene bits ───────── */
function makeRenderer(canvas) {
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  r.setPixelRatio(Math.min(devicePixelRatio, 2));
  r.shadowMap.enabled = true;
  r.shadowMap.type = THREE.PCFSoftShadowMap;
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.toneMappingExposure = 1.05;
  return r;
}
function addLights(scene, span, renderer) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
  pmrem.dispose();
  const d = new THREE.DirectionalLight(0xffffff, 2.6);
  d.position.set(-6, 12, 7);
  const rim = new THREE.DirectionalLight(0xffb89a, 1.6);
  rim.position.set(8, 5, -8);
  scene.add(rim);
  d.castShadow = true;
  d.shadow.mapSize.set(2048, 2048);
  Object.assign(d.shadow.camera, { left: -span, right: span, top: span, bottom: -span, near: 1, far: 40 });
  d.shadow.radius = 5; d.shadow.bias = -0.0005; d.shadow.normalBias = 0.02;
  scene.add(d);
}
function shadowFloor(scene, y, opacity = 0.55) {
  const f = new THREE.Mesh(new THREE.PlaneGeometry(120, 60), new THREE.ShadowMaterial({ opacity }));
  f.rotation.x = -Math.PI / 2; f.position.y = y; f.receiveShadow = true;
  scene.add(f);
}
function whenVisible(el, cb) {
  let vis = false;
  new IntersectionObserver(([e]) => { vis = e.isIntersecting; cb(vis); }, { threshold: 0.01 }).observe(el);
}

/* ───────── hero playground ───────── */
function playground() {
  const canvas = $('#play'), hero = $('.hero'), tag = $('#tag');
  const renderer = makeRenderer(canvas);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 120);
  addLights(scene, 14, renderer);
  shadowFloor(scene, 0);

  const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -24, 0) });
  world.allowSleep = true;
  world.defaultContactMaterial.friction = 0.45;
  world.defaultContactMaterial.restitution = 0.3;

  const wall = (rx, ry) => {
    const b = new CANNON.Body({ mass: 0, shape: new CANNON.Plane() });
    b.quaternion.setFromEuler(rx, ry, 0);
    world.addBody(b); return b;
  };
  wall(-Math.PI / 2, 0);                         // floor
  const wL = wall(0, Math.PI / 2), wR = wall(0, -Math.PI / 2);
  const wB = wall(0, 0), wF = wall(0, Math.PI), wT = wall(Math.PI / 2, 0);
  const DEPTH = 2.2;
  let W = 8, H = 8;

  const narrow = hero.clientWidth / hero.clientHeight < 0.8;
  const S = narrow ? 0.7 : 1.15;
  const defs = [...Object.entries(builders).map(([key, fn]) => [key, fn]), [null, propBall], [null, propNut]];
  const items = defs.map(([key, fn]) => {
    const m = fn();
    m.group.scale.setScalar(S);
    scene.add(m.group);
    const shape = m.shape === 'sphere'
      ? new CANNON.Sphere(m.radius * S)
      : new CANNON.Box(new CANNON.Vec3(m.size[0] * S / 2, m.size[1] * S / 2, m.size[2] * S / 2));
    const vol = m.shape === 'sphere' ? 4 * m.radius ** 3 : m.size[0] * m.size[1] * m.size[2];
    const body = new CANNON.Body({ mass: Math.max(0.6, vol * 1.4), shape, linearDamping: 0.08, angularDamping: 0.35 });
    body.allowSleep = !key;
    body.sleepSpeedLimit = 0.25; body.sleepTimeLimit = 0.8;
    world.addBody(body);
    const item = { key, body, ...m };
    m.group.traverse((o) => (o.userData.item = item));
    return item;
  });

  function drop() {
    const order = items.map((_, i) => i).sort(() => Math.random() - 0.5);
    order.forEach((idx, n) => {
      const b = items[idx].body;
      const x = (((n + 0.5) / items.length) * 2 - 1) * W * 0.78;
      b.position.set(x, H + 2 + n * 1.9, (Math.random() - 0.5) * 1.2);
      b.quaternion.setFromEuler((Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.7, (Math.random() - 0.5) * 0.4);
      b.velocity.set(0, -4, 0);
      b.angularVelocity.set((Math.random() - 0.5), (Math.random() - 0.5), (Math.random() - 0.5));
      b.wakeUp();
    });
  }

  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const tmp = new THREE.Vector3();
  function resize() {
    const w = hero.clientWidth, h = hero.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = camera.aspect < 0.8 ? 46 : 35;
    camera.position.set(0, 5.2, 15);
    camera.lookAt(0, 3.0, 0);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    // where do the screen edges meet the z = 0 plane?
    const z0 = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const zF = new THREE.Plane(new THREE.Vector3(0, 0, 1), -DEPTH);
    const o = new THREE.Vector3(0, 0, DEPTH).project(camera);
    ray.setFromCamera(ndc.set(1, o.y), camera);
    W = ray.ray.intersectPlane(zF, tmp) ? tmp.x : 8;
    ray.setFromCamera(ndc.set(0, 1), camera);
    H = ray.ray.intersectPlane(z0, tmp) ? tmp.y : 8;
    wL.position.set(-W, 0, 0); wR.position.set(W, 0, 0);
    wB.position.set(0, 0, -DEPTH); wF.position.set(0, 0, DEPTH);
    wT.position.set(0, H + 14, 0);
    items.forEach((i) => i.body.wakeUp());
  }
  resize();
  new ResizeObserver(resize).observe(hero);
  drop();

  /* grab & throw */
  const joint = new CANNON.Body({ mass: 0, type: CANNON.Body.KINEMATIC });
  joint.collisionFilterGroup = 0; joint.collisionFilterMask = 0;
  world.addBody(joint);
  const dragPlane = new THREE.Plane();
  let held = null, constraint = null, downAt = 0, downXY = [0, 0], moved = 0;

  function pick(e) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(items.map((i) => i.group), true)[0];
    return hit ? { item: hit.object.userData.item, point: hit.point } : null;
  }
  function showTag(item, e) {
    if (!item?.key || e.pointerType !== 'mouse') { tag.classList.remove('on'); return; }
    const [no, name] = LABEL[item.key];
    tag.innerHTML = `<b>${no}</b>${name}`;
    const r = hero.getBoundingClientRect();
    tag.style.transform = `translate(${e.clientX - r.left + 16}px, ${e.clientY - r.top + 18}px)`;
    tag.classList.add('on');
  }
  function release() {
    if (!held) return;
    world.removeConstraint(constraint);
    held.body.angularDamping = 0.35;
    held = constraint = null;
    canvas.classList.remove('grabbing');
  }

  canvas.addEventListener('pointerdown', (e) => {
    const hit = pick(e);
    if (!hit) return;
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
    held = hit.item;
    downAt = performance.now(); downXY = [e.clientX, e.clientY]; moved = 0;
    camera.getWorldDirection(tmp);
    dragPlane.setFromNormalAndCoplanarPoint(tmp, hit.point);
    joint.position.set(hit.point.x, hit.point.y, hit.point.z);
    const local = held.body.pointToLocalFrame(new CANNON.Vec3(hit.point.x, hit.point.y, hit.point.z));
    constraint = new CANNON.PointToPointConstraint(held.body, local, joint, new CANNON.Vec3(0, 0, 0));
    world.addConstraint(constraint);
    held.body.wakeUp();
    held.body.angularDamping = 0.7;
    canvas.classList.add('grabbing');
    tag.classList.remove('on');
  });
  canvas.addEventListener('pointermove', (e) => {
    if (held) {
      moved = Math.max(moved, Math.hypot(e.clientX - downXY[0], e.clientY - downXY[1]));
      const r = canvas.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      if (ray.ray.intersectPlane(dragPlane, tmp)) {
        joint.position.set(
          THREE.MathUtils.clamp(tmp.x, -W, W),
          Math.max(0.3, tmp.y),
          THREE.MathUtils.clamp(tmp.z, -DEPTH, DEPTH));
        held.body.wakeUp();
      }
      return;
    }
    const hit = pick(e);
    canvas.classList.toggle('can-grab', !!hit);
    showTag(hit?.item, e);
  });
  const up = () => {
    const item = held;
    const click = item && moved < 6 && performance.now() - downAt < 400;
    release();
    if (click && item.key) openWork(item.key);
    else if (click) item.body.applyImpulse(new CANNON.Vec3(0, item.body.mass * 9, 0));
  };
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('pointerleave', () => { tag.classList.remove('on'); });

  /* controls */
  $('#respawn').addEventListener('click', drop);
  const zero = $('#zero');
  zero.addEventListener('click', () => {
    const on = zero.getAttribute('aria-pressed') !== 'true';
    zero.setAttribute('aria-pressed', on);
    world.gravity.set(0, on ? 0 : -24, 0);
    wT.position.y = on ? H - 1.2 : H + 14;
    for (const { body } of items) {
      body.wakeUp();
      body.allowSleep = !on && !items.find((i) => i.body === body).key;
      body.linearDamping = on ? 0.02 : 0.08;
      if (on) {
        body.velocity.set((Math.random() - 0.5) * 3, 2 + Math.random() * 3, (Math.random() - 0.5));
        body.angularVelocity.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5);
      }
    }
  });

  /* every model keeps turning back to face the camera, like a weighted toy */
  function faceFront(it, dt) {
    if (!it.key) return;                               // loose props may tumble freely
    const b = it.body, q = b.quaternion;
    const sgn = q.w < 0 ? -1 : 1;
    const sinHalf = Math.hypot(q.x, q.y, q.z);
    if (sinHalf > 1e-4) {
      const angle = 2 * Math.atan2(sinHalf, Math.abs(q.w));
      const k = (it === held ? 30 : 16) * angle * dt / sinHalf * -sgn;
      b.angularVelocity.x += q.x * k; b.angularVelocity.y += q.y * k; b.angularVelocity.z += q.z * k;
    }
    const damp = Math.max(0, 1 - 3.2 * dt);
    b.angularVelocity.x *= damp; b.angularVelocity.y *= damp; b.angularVelocity.z *= damp;
  }

  /* loop */
  let running = true, last = performance.now();
  const clock = { t: 0 };
  function frame(now) {
    if (!running) return;
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    for (const it of items) faceFront(it, dt);
    world.step(1 / 60, dt, 3);
    if (!reduced) clock.t += dt;
    for (const it of items) {
      it.group.position.copy(it.body.position);
      it.group.quaternion.copy(it.body.quaternion);
      it.update?.(clock.t + it.body.id);
    }
    renderer.render(scene, camera);
  }
  whenVisible(hero, (v) => {
    if (v && !running) { running = true; last = performance.now(); requestAnimationFrame(frame); }
    else if (!v) running = false;
  });
  requestAnimationFrame(frame);
}

/* ───────── work viewer ───────── */
function makeViewer() {
  const canvas = $('#view');
  const renderer = makeRenderer(canvas);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 60);
  camera.position.set(0, 1.5, 8.2);
  camera.lookAt(0, 0, 0);
  addLights(scene, 4, renderer);
  shadowFloor(scene, -1.45, 0.6);

  const table = new THREE.Group();
  scene.add(table);
  const cache = {};
  let cur = null, prev = null;
  let yaw = -0.35, pitch = 0.12, vy = 0, dragging = false, lx = 0, ly = 0, idle = 0;

  function show(key) {
    if (cur?.key === key) return;
    if (prev) table.remove(prev.group);
    prev = cur;
    if (!cache[key]) {
      const m = builders[key]();
      const fit = 2.7 / Math.max(m.size[0], m.size[1], m.shape === 'sphere' ? 2.1 : 0);
      cache[key] = { key, fit, ...m };
    }
    cur = cache[key];
    cur.s = reduced ? 1 : 0;
    cur.group.position.y = -1.45 + (cur.size[1] * cur.fit) / 2 + (cur.shape === 'sphere' ? 0.25 : 0);
    table.add(cur.group);
  }

  canvas.addEventListener('pointerdown', (e) => {
    dragging = true; lx = e.clientX; ly = e.clientY; vy = 0;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY;
    yaw += dx * 0.011; vy = dx * 0.011;
    pitch = THREE.MathUtils.clamp(pitch + dy * 0.006, -0.35, 0.7);
    idle = 0;
  });
  const end = () => (dragging = false);
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.position.z = camera.aspect < 0.9 ? 8.2 / Math.max(0.55, camera.aspect) * 0.9 : 8.2;
    camera.updateProjectionMatrix();
  }
  resize();
  new ResizeObserver(resize).observe(canvas);

  let running = false, last = 0, t = 0;
  function frame(now) {
    if (!running) return;
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!reduced) t += dt;
    if (!dragging) {
      yaw += vy; vy *= 0.94; idle += dt;
      if (idle > 1.4) {                              // drift back to the front, then sway
        yaw = Math.atan2(Math.sin(yaw), Math.cos(yaw));
        const target = reduced ? -0.35 : Math.sin(t * 0.55) * 0.6;
        yaw += (target - yaw) * Math.min(1, dt * 2.2);
        vy = 0;
      }
    }
    table.rotation.set(pitch, yaw, 0);
    if (cur) {
      cur.s += (1 - cur.s) * Math.min(1, dt * 9);
      cur.group.scale.setScalar(cur.fit * cur.s);
      cur.update?.(t);
    }
    if (prev) {
      prev.s += (0 - prev.s) * Math.min(1, dt * 14);
      prev.group.scale.setScalar(Math.max(0.0001, prev.fit * prev.s));
      if (prev.s < 0.02) { table.remove(prev.group); prev = null; }
    }
    renderer.render(scene, camera);
  }
  whenVisible(canvas, (v) => {
    if (v && !running) { running = true; last = performance.now(); requestAnimationFrame(frame); }
    else if (!v) running = false;
  });
  return { show };
}

try {
  await preload();
  viewer = makeViewer();
  playground();
} catch (err) {
  console.error(err);
  document.documentElement.classList.add('no-3d');
}
activeKey = null;
setActive(WORKS[0].key);
pickByScroll();
