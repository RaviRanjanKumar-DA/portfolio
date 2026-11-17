/* ══════════════════════════════════════════════════════════════════════
   Hero 3D analytics scene (Three.js) — rotating 3D bar chart, donut chart,
   line chart, heatmap, data-flow network and particle field, with mouse
   parallax. Inspired by the earlier React-Three-Fiber portfolio, rebuilt in
   plain JS so the site needs no build step. Pauses when off-screen.
   ══════════════════════════════════════════════════════════════════════ */
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

const canvas = document.getElementById("hero3d");
const hero = document.getElementById("hero");
// Reduced-motion users get a still 3D frame. "?motion=on" forces animation (for testing).
const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches && !/[?&]motion=on/.test(location.search);

function webglOK() {
  try { const c = document.createElement("canvas"); return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl"))); }
  catch { return false; }
}

if (canvas && hero && webglOK()) init();

function init() {
  const mobile = window.innerWidth < 768;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !mobile, alpha: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1 : 1.5));

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x070d1a, 30, 90);
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 200);
  camera.position.set(0, 0, 36);

  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const dir = new THREE.DirectionalLight(0xffffff, 0.8); dir.position.set(10, 14, 12); scene.add(dir);
  [[0x06b6d4, -30, 20, 25], [0x8b5cf6, 30, -18, 25], [0x3b82f6, 0, 28, -10], [0x10b981, -22, -26, 8]].forEach(([c, x, y, z]) => {
    const l = new THREE.PointLight(c, 60, 90, 1.6); l.position.set(x, y, z); scene.add(l);
  });

  const C = { blue: 0x3b82f6, cyan: 0x06b6d4, purple: 0x8b5cf6, gold: 0xf59e0b, green: 0x10b981, red: 0xf43f5e, base: 0x152040 };
  const mat = (color, e = 0.35) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: e, metalness: 0.5, roughness: 0.3 });
  const groups = [];

  // ── 1. 3D bar chart (top-left) ──
  const bars = new THREE.Group();
  const barData = [0.55, 0.8, 0.5, 0.95, 0.7, 0.88, 0.76];
  const base = new THREE.Mesh(new THREE.BoxGeometry(12, 0.25, 2.4), new THREE.MeshStandardMaterial({ color: C.base, metalness: 0.4, roughness: 0.6 }));
  bars.add(base);
  const barMeshes = barData.map((h, i) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(1.15, 1, 1.15), mat(i % 2 ? C.cyan : C.blue));
    m.userData = { h: h * 6, phase: i * 0.7 };
    m.position.set((i - 3) * 1.55, 0.6, 0);
    m.scale.y = 0.01;
    bars.add(m);
    return m;
  });
  bars.position.set(-21, 7, -6); bars.rotation.set(0.25, 0.5, 0);
  scene.add(bars); groups.push(bars);

  // ── 2. Donut chart (top-right) ──
  const donut = new THREE.Group();
  const slices = [[0.38, C.blue], [0.24, C.cyan], [0.18, C.gold], [0.12, C.green], [0.08, C.purple]];
  let start = 0;
  slices.forEach(([v, c], i) => {
    const arc = v * Math.PI * 2 - 0.05;
    const t = new THREE.Mesh(new THREE.TorusGeometry(4, 1.05 + (i === 0 ? 0.25 : 0), 18, 64, arc), mat(c, 0.4));
    t.rotation.z = start; start += v * Math.PI * 2;
    donut.add(t);
  });
  donut.position.set(21, 8, -8); donut.rotation.x = -0.6;
  scene.add(donut); groups.push(donut);

  // ── 3. Line chart ribbon with glowing points (bottom-left) ──
  const line = new THREE.Group();
  const pts = [0.2, 0.45, 0.35, 0.7, 0.55, 0.85, 0.75, 1].map((v, i) => new THREE.Vector3((i - 3.5) * 1.8, v * 6 - 3, 0));
  const curve = new THREE.CatmullRomCurve3(pts);
  const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 120, 0.14, 8, false), mat(C.green, 0.6));
  line.add(tube);
  const dotGeo = new THREE.SphereGeometry(0.32, 16, 16);
  pts.forEach((p) => { const d = new THREE.Mesh(dotGeo, mat(0xffffff, 0.8)); d.position.copy(p); line.add(d); });
  const grid = new THREE.GridHelper(14, 7, 0x1e3a8a, 0x1e293b); grid.rotation.x = Math.PI / 2; grid.position.z = -0.6; line.add(grid);
  const runner = new THREE.Mesh(new THREE.SphereGeometry(0.45, 16, 16), mat(C.gold, 1));
  line.add(runner);
  line.position.set(-24, -11, -6); line.rotation.set(-0.15, 0.45, 0);
  scene.add(line); groups.push(line);

  // ── 4. Heatmap (bottom-right) ──
  const heat = new THREE.Group();
  const cells = [];
  const ramp = [C.base, 0x1d4ed8, C.blue, C.cyan, C.green, C.gold];
  for (let x = 0; x < 7; x++) for (let z = 0; z < 5; z++) {
    const v = (Math.sin(x * 1.3) + Math.cos(z * 1.7) + 2) / 4;
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1, 0.9), mat(ramp[Math.min(5, Math.floor(v * 6))], 0.3));
    m.position.set((x - 3) * 1.05, 0, (z - 2) * 1.05);
    m.userData = { v, phase: x * 0.5 + z * 0.9 };
    heat.add(m); cells.push(m);
  }
  heat.position.set(23, -10, -6); heat.rotation.set(0.6, -0.5, 0);
  scene.add(heat); groups.push(heat);

  // ── 5. Data-flow network (behind the text, subtle) ──
  const N = 14, R = 15, nodePos = [];
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    nodePos.push(new THREE.Vector3(Math.cos(a) * R, Math.sin(a) * R * 0.62, Math.sin(a * 2) * 3 - 14));
  }
  const segs = [];
  for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) if ((i * 7 + j * 3) % 5 === 0 || j === i + 1) segs.push(nodePos[i], nodePos[j]);
  const net = new THREE.Group();
  net.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(segs), new THREE.LineBasicMaterial({ color: C.blue, transparent: true, opacity: 0.22 })));
  net.add(new THREE.Points(new THREE.BufferGeometry().setFromPoints(nodePos), new THREE.PointsMaterial({ color: C.cyan, size: 0.6, transparent: true, opacity: 0.8 })));
  const packets = Array.from({ length: mobile ? 4 : 8 }, (_, i) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), new THREE.MeshBasicMaterial({ color: i % 2 ? C.cyan : C.gold }));
    m.userData = { seg: (i * 5) % (segs.length / 2), t: Math.random() };
    net.add(m); return m;
  });
  scene.add(net);

  // ── 6. Particle field ──
  const PC = mobile ? 250 : 650;
  const pPos = new Float32Array(PC * 3);
  for (let i = 0; i < PC; i++) { pPos[i * 3] = (Math.random() - 0.5) * 110; pPos[i * 3 + 1] = (Math.random() - 0.5) * 70; pPos[i * 3 + 2] = (Math.random() - 0.5) * 60 - 10; }
  const particles = new THREE.Points(new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(pPos, 3)),
    new THREE.PointsMaterial({ color: 0x93c5fd, size: 0.18, transparent: true, opacity: 0.6 }));
  scene.add(particles);

  if (mobile) { line.visible = false; heat.visible = false; bars.position.set(-9, 14, -12); donut.position.set(10, -14, -12); }

  // ── sizing, parallax, visibility ──
  function resize() {
    const w = hero.clientWidth, h = hero.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.position.z = w < 900 ? 44 : 36;
    camera.updateProjectionMatrix();
  }
  resize();
  let rt; window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(resize, 120); });

  const mouse = { x: 0, y: 0 };
  window.addEventListener("pointermove", (e) => { mouse.x = e.clientX / window.innerWidth - 0.5; mouse.y = e.clientY / window.innerHeight - 0.5; }, { passive: true });

  let visible = true, running = false;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible && !document.hidden) start2(); }, { threshold: 0.01 }).observe(hero);
  document.addEventListener("visibilitychange", () => { if (!document.hidden && visible) start2(); });

  const clock = new THREE.Clock();
  function frame() {
    if (!visible || document.hidden) { running = false; return; }
    const t = reduce ? 6 : clock.getElapsedTime();
    const grow = Math.min(1, t / 1.6), ease = 1 - Math.pow(1 - grow, 3);

    barMeshes.forEach((m) => {
      const h = m.userData.h * ease * (0.92 + 0.08 * Math.sin(t * 1.4 + m.userData.phase));
      m.scale.y = Math.max(0.01, h); m.position.y = 0.12 + h / 2;
    });
    bars.rotation.y = 0.5 + Math.sin(t * 0.25) * 0.35;
    donut.rotation.z = t * 0.25; donut.rotation.y = Math.sin(t * 0.3) * 0.3;
    donut.scale.setScalar(0.4 + 0.6 * ease);
    line.rotation.y = 0.45 + Math.sin(t * 0.2) * 0.25;
    runner.position.copy(curve.getPointAt((t * 0.12) % 1));
    cells.forEach((m) => { const h = 0.3 + (m.userData.v * 3.2 + Math.sin(t * 1.2 + m.userData.phase) * 0.5) * ease; m.scale.y = h; m.position.y = h / 2; });
    heat.rotation.y = -0.5 + Math.sin(t * 0.22) * 0.3;
    net.rotation.z = t * 0.03;
    packets.forEach((p) => {
      p.userData.t += 0.012;
      if (p.userData.t > 1) { p.userData.t = 0; p.userData.seg = (p.userData.seg + 3) % (segs.length / 2); }
      const a = segs[p.userData.seg * 2], b = segs[p.userData.seg * 2 + 1];
      p.position.lerpVectors(a, b, p.userData.t);
    });
    particles.rotation.y = t * 0.012;
    groups.forEach((g, i) => { g.position.y += Math.sin(t * 0.6 + i) * 0.004; });

    camera.position.x += (mouse.x * 6 + Math.sin(t * 0.1) * 2 - camera.position.x) * 0.04;
    camera.position.y += (-mouse.y * 4 + Math.cos(t * 0.08) * 1.5 - camera.position.y) * 0.04;
    camera.lookAt(0, 0, -6);
    renderer.render(scene, camera);
    if (reduce) { running = false; return; } // still frame only
    requestAnimationFrame(frame);
  }
  function start2() { if (!running) { running = true; requestAnimationFrame(frame); } }

  hero.classList.add("has-3d");
  start2();
}
