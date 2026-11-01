/* YORAI — the scroll-driven 3D journey.
 * Six procedural environments laid out along −z; the camera travels through fog from one to the next.
 * Scroll progress (jt ∈ [0, 6]) comes from GSAP ScrollTrigger with scrub smoothing; time-based motion
 * (mist, steam, tumbling beans, crema) runs only when the stage is on screen, motion is on and the
 * scene is not paused. Under calm motion the camera holds one pose per chapter and crossfades.
 */
import * as THREE from 'three';

const { lerp, smoothstep, clamp } = THREE.MathUtils;
const Z = [0, -70, -140, -210, -280, -350]; // group offsets per chapter

/* Per-chapter lighting and atmosphere */
const PAL = [
  { fog: '#93a7a6', top: '#5a7375', dens: 0.021, sky: '#bcccc8', ground: '#2a3a2e', sun: '#ffd8ad', dir: [-0.35, 0.22, -1], sunI: 1.3, hemiI: 1.1, exp: 1.0 },
  { fog: '#c9c4ab', top: '#8fa08c', dens: 0.07, sky: '#dcd6bb', ground: '#2f3d24', sun: '#fff2d8', dir: [0.6, 1, 0.3], sunI: 2.0, hemiI: 1.2, exp: 1.05 },
  { fog: '#d8c39c', top: '#9c8559', dens: 0.040, sky: '#e8dcbd', ground: '#4b3c29', sun: '#fff8e4', dir: [0.2, 1, 0.45], sunI: 2.6, hemiI: 1.3, exp: 1.1 },
  { fog: '#1a0c08', top: '#070302', dens: 0.075, sky: '#3a2016', ground: '#120806', sun: '#ff9a52', dir: [0.4, 0.6, 0.5], sunI: 0.5, hemiI: 0.45, exp: 1.0 },
  { fog: '#1f130d', top: '#0d0704', dens: 0.085, sky: '#50382a', ground: '#15100c', sun: '#ffd9ae', dir: [-0.5, 1, 0.4], sunI: 1.6, hemiI: 0.8, exp: 1.05 },
  { fog: '#0c0806', top: '#050302', dens: 0.11, sky: '#2a1c12', ground: '#0c0806', sun: '#ffe9ca', dir: [0.1, 1, 0.15], sunI: 1.0, hemiI: 0.5, exp: 1.0 },
];
/* Camera poses in group-local space: a = start, b = end of the environment (reached at p = 1 − cross,
 * 0.72 by default), then the crossing through the fog to the next chapter's a. `v` is an optional
 * via point (local to this chapter) the crossing passes through, used to crane the camera up and
 * over set dressing instead of through it; `cross` shortens the crossing where the fog is dark. */
const CAM = [
  { a: [0, 3.4, 15], al: [0, 1.0, -12], b: [0.3, 1.75, -9], bl: [-0.6, 1.3, -34], v: [-0.1, 2.4, -58] },
  { a: [1.4, 1.25, 3.3], al: [-0.4, 1.6, -0.2], b: [-0.5, 1.25, 2.9], bl: [1.5, 0.85, 0.9], v: [-1.6, 5.6, 2.2] },
  { a: [-7.5, 2.6, 9.5], al: [0, 0.9, 0], b: [4.0, 1.9, 1.6], bl: [6.5, 0.4, -5] },
  { a: [4.6, 2.3, 8.2], al: [0, 1.6, 0], b: [0.9, 1.85, 3.5], bl: [0, 1.45, -1], cross: 0.2 },
  { a: [3.3, 2.1, 3.7], al: [0.2, 1.3, 0], b: [-1.1, 2.0, 2.6], bl: [0.45, 1.3, 0], cross: 0.2 },
  { a: [2.5, 1.85, 2.7], al: [0, 0.95, 0], b: [0.22, 2.75, 0.5], bl: [-0.22, 0.9, 0] },
];

/* ---------------------------------------------------------------- textures */
function softDot(size = 128, inner = 0.0) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(size / 2, size / 2, size * inner, size / 2, size / 2, size / 2);
  grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.5, 'rgba(255,255,255,0.35)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function leafTex() {
  const c = document.createElement('canvas'); c.width = 128; c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#2f5a2c'; g.beginPath(); g.ellipse(64, 32, 60, 22, 0, 0, Math.PI * 2); g.fill();
  g.strokeStyle = 'rgba(190,220,170,0.55)'; g.lineWidth = 2; g.beginPath(); g.moveTo(6, 32); g.lineTo(122, 32); g.stroke();
  for (let i = 1; i < 6; i++) { g.beginPath(); g.moveTo(20 + i * 16, 32); g.lineTo(32 + i * 16, 14); g.moveTo(20 + i * 16, 32); g.lineTo(32 + i * 16, 50); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function beanBedTex() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#2a2622'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2600; i++) {
    const x = rnd() * 256, y = rnd() * 256, a = rnd() * Math.PI;
    const l = 7 + rnd() * 3, w = 4 + rnd() * 1.5;
    g.save(); g.translate(x, y); g.rotate(a);
    const h = 30 + rnd() * 10, lt = 38 + rnd() * 20;
    g.fillStyle = `hsl(${h}, 48%, ${lt}%)`; g.beginPath(); g.ellipse(0, 0, l / 2, w / 2, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(60,40,20,0.5)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(-l / 2 + 1, 0); g.lineTo(l / 2 - 1, 0); g.stroke();
    g.restore();
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 14); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function weaveTex() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#7d5f36'; g.fillRect(0, 0, 64, 64);
  for (let y = 0; y < 64; y += 4) for (let x = 0; x < 64; x += 4) { const over = ((x + y) / 4) % 2 === 0; g.fillStyle = over ? `hsl(34, 40%, ${36 + rnd() * 8}%)` : `hsl(32, 38%, ${27 + rnd() * 6}%)`; g.fillRect(x, y, 4, 4); }
  g.fillStyle = 'rgba(0,0,0,0.25)'; for (let i = 0; i < 64; i += 4) { g.fillRect(i, 0, 1, 64); g.fillRect(0, i, 64, 1); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(10, 4); t.colorSpace = THREE.SRGBColorSpace; return t;
}

/* ------------------------------------------------------------ small helpers */
const rnd = (() => { let s = 20261101; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000; }; })();
const between = (a, b) => a + rnd() * (b - a);
function noise2(x, y) { return Math.sin(x * 1.7 + Math.sin(y * 0.9) * 2) * Math.cos(y * 1.3 + Math.sin(x * 0.7) * 2); }

function ellipsoidGeo(r = 0.5) { const g = new THREE.SphereGeometry(r, 10, 8); g.scale(1, 0.62, 0.52); return g; }
/* Only instances that move every frame (the roasting beans) need a dynamic buffer; the rest are uploaded once. */
function instanced(geo, mat, count, dynamic = false) { const m = new THREE.InstancedMesh(geo, mat, count); if (dynamic) m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); return m; }

/* Wind: a vertex-shader sway for leaf cards, phased by each instance's position so the foliage
 * ripples rather than nodding in unison. One shared uniform; costs nothing on the CPU. */
const windU = { uTime: { value: 0 }, uWind: { value: 0.045 } };
function windy(mat) {
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, windU);
    shader.vertexShader = 'uniform float uTime; uniform float uWind;\n' + shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      float wph = 0.0;
      #ifdef USE_INSTANCING
        wph = instanceMatrix[3].x * 1.9 + instanceMatrix[3].z * 1.3 + instanceMatrix[3].y * 0.7;
      #endif
      float wsw = sin(uTime * 1.35 + wph) * 0.6 + sin(uTime * 2.4 + wph * 2.3) * 0.4;
      transformed.x += wsw * uWind * (0.35 + uv.y);
      transformed.y += sin(uTime * 1.9 + wph * 1.7) * uWind * 0.35 * uv.y;`);
  };
  mat.customProgramCacheKey = () => 'yorai-wind';
  return mat;
}
const dummy = new THREE.Object3D();
const col = new THREE.Color();
const ROASTED = new THREE.Color('#3a1c0e');

function points(count, size, color, opacity, tex, blending = THREE.NormalBlending) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  const mat = new THREE.PointsMaterial({ size, map: tex, color, transparent: true, opacity, depthWrite: false, blending, sizeAttenuation: true });
  const p = new THREE.Points(geo, mat); p.frustumCulled = false; return p;
}

/* ------------------------------------------------------------ environments */
function buildPlantation(tier) {
  const g = new THREE.Group();
  // rolling ground
  const gg = new THREE.PlaneGeometry(180, 180, 70, 70); gg.rotateX(-Math.PI / 2);
  const pos = gg.attributes.position;
  for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), z = pos.getZ(i); pos.setY(i, noise2(x * 0.05, z * 0.05) * 1.6 + noise2(x * 0.2, z * 0.2) * 0.25 - 0.6); }
  gg.computeVertexNormals();
  g.add(new THREE.Mesh(gg, new THREE.MeshStandardMaterial({ color: '#2b3b2a', roughness: 1 })));
  // volcano silhouette, soft-edged by fog
  const vg = new THREE.ConeGeometry(34, 22, 40, 6, true);
  const vp = vg.attributes.position;
  for (let i = 0; i < vp.count; i++) { const x = vp.getX(i), z = vp.getZ(i), y = vp.getY(i); const n = noise2(x * 0.15, z * 0.15) * (1 - Math.abs(y) / 13) * 1.6; vp.setX(i, x + n); vp.setZ(i, z + n); }
  vg.computeVertexNormals();
  const vol = new THREE.Mesh(vg, new THREE.MeshStandardMaterial({ color: '#24322f', roughness: 1 })); vol.position.set(-16, 8.5, -56); g.add(vol);
  const vol2 = vol.clone(); vol2.scale.set(0.7, 0.55, 0.7); vol2.position.set(30, 4, -60); g.add(vol2);
  // coffee shrubs in rows (aisle at x = 0 for the camera)
  // an indexed sphere keeps smooth shading after the jitter (a polyhedron would shade flat)
  const sg = new THREE.SphereGeometry(0.7, 14, 10);
  const sp = sg.attributes.position; for (let i = 0; i < sp.count; i++) { const j = 1 + noise2(sp.getX(i) * 4, sp.getZ(i) * 4 + sp.getY(i) * 3) * 0.16; sp.setXYZ(i, sp.getX(i) * j, sp.getY(i) * j * 0.9, sp.getZ(i) * j); } sg.computeVertexNormals();
  const n = tier === 'lite' ? 520 : 1100;
  const shrubs = instanced(sg, new THREE.MeshStandardMaterial({ color: '#2f5a2c', roughness: 0.95 }), n);
  let k = 0;
  for (let row = -8; row < 8 && k < n; row++) {
    const x = (row + 0.5) * 3.6;
    for (let z = 14; z > -50 && k < n; z -= 1.4) {
      const s = between(0.75, 1.3);
      dummy.position.set(x + between(-0.35, 0.35), noise2(x * 0.05, z * 0.05) * 1.6 - 0.6 + s * 0.55, z + between(-0.3, 0.3));
      dummy.scale.set(s, s * between(0.9, 1.25), s); dummy.rotation.y = rnd() * 6.28; dummy.updateMatrix();
      shrubs.setMatrixAt(k, dummy.matrix);
      shrubs.setColorAt(k, col.set('#2f5a2c').offsetHSL(between(-0.03, 0.04), between(-0.1, 0.1), between(-0.08, 0.08)));
      k++;
    }
  }
  shrubs.count = k; g.add(shrubs);
  // leaf cards on the shrubs nearest the aisle, so the near foliage reads as leaves rather than blobs
  const nearRows = [];
  for (let i = 0; i < k; i++) { shrubs.getMatrixAt(i, dummy.matrix); dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale); if (Math.abs(dummy.position.x) < 6.5 && dummy.position.z > -34) nearRows.push([dummy.position.x, dummy.position.y, dummy.position.z, dummy.scale.x]); }
  const perShrub = tier === 'lite' ? 18 : 34;
  const leafCards = instanced(new THREE.PlaneGeometry(0.46, 0.22), windy(new THREE.MeshStandardMaterial({ map: leafTex(), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.85 })), nearRows.length * perShrub);
  let lc = 0;
  nearRows.forEach(([x, y, z, sc]) => {
    for (let j = 0; j < perShrub; j++) {
      const th = rnd() * 6.28, ph = Math.acos(between(-0.6, 1)); const r = 0.7 * sc * 0.98;
      dummy.position.set(x + Math.sin(ph) * Math.cos(th) * r, y + Math.cos(ph) * r * 0.9, z + Math.sin(ph) * Math.sin(th) * r);
      dummy.rotation.set(between(-0.8, 0.8), th + between(-0.6, 0.6), between(-0.8, 0.8)); dummy.scale.setScalar(between(0.8, 1.3) * sc); dummy.updateMatrix(); leafCards.setMatrixAt(lc++, dummy.matrix);
    }
  });
  leafCards.count = lc; g.add(leafCards);
  // ripe cherries on the shrubs nearest the aisle
  const cg = new THREE.SphereGeometry(0.06, 6, 5);
  const cherries = instanced(cg, new THREE.MeshStandardMaterial({ color: '#c4322c', roughness: 0.4 }), tier === 'lite' ? 500 : 1400);
  for (let i = 0; i < cherries.count; i++) {
    const side = rnd() < 0.5 ? -1.8 : 1.8; const z = between(-30, 14);
    const a = rnd() * 6.28, r = between(0.5, 0.95);
    dummy.position.set(side + Math.cos(a) * r * 0.9, noise2(side * 0.05, z * 0.05) * 1.6 - 0.6 + 0.6 + Math.sin(a) * r * 0.6 + 0.2, z + between(-0.2, 0.2));
    dummy.scale.setScalar(1); dummy.rotation.set(0, 0, 0); dummy.updateMatrix(); cherries.setMatrixAt(i, dummy.matrix);
    cherries.setColorAt(i, col.set(rnd() < 0.8 ? '#c4322c' : '#d9a23a'));
  }
  g.add(cherries);
  // mist
  const mist = points(tier === 'lite' ? 90 : 220, 9, '#dfe9e6', 0.16, softDot(), THREE.NormalBlending);
  const mp = mist.geometry.attributes.position;
  for (let i = 0; i < mp.count; i++) mp.setXYZ(i, between(-40, 40), between(0.2, 5), between(-60, 18));
  g.add(mist);
  g.userData.mist = mist;
  // low cloud drifting across the volcanoes; fog softens the far ones into the sky
  const clouds = points(tier === 'lite' ? 8 : 14, 30, '#e9f0ee', 0.2, softDot(128, 0.15));
  const cp = clouds.geometry.attributes.position;
  for (let i = 0; i < cp.count; i++) cp.setXYZ(i, between(-55, 55), between(9, 17), between(-70, -14));
  g.add(clouds); g.userData.clouds = clouds;
  return g;
}

function buildHarvest(tier) {
  const g = new THREE.Group();
  const gg = new THREE.PlaneGeometry(80, 80, 20, 20); gg.rotateX(-Math.PI / 2);
  const pos = gg.attributes.position; for (let i = 0; i < pos.count; i++) pos.setY(i, noise2(pos.getX(i) * 0.3, pos.getZ(i) * 0.3) * 0.12);
  gg.computeVertexNormals();
  g.add(new THREE.Mesh(gg, new THREE.MeshStandardMaterial({ color: '#3a3324', roughness: 1 })));
  // the branch
  const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(-4.5, 1.15, 0.9), new THREE.Vector3(-1.6, 1.5, 0.1), new THREE.Vector3(1.4, 1.78, -0.4), new THREE.Vector3(4.2, 1.55, -1.3)]);
  g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 0.07, 8, false), new THREE.MeshStandardMaterial({ color: '#4a3524', roughness: 0.9 })));
  const twig = new THREE.CatmullRomCurve3([new THREE.Vector3(0.4, 1.7, -0.3), new THREE.Vector3(0.9, 2.3, 0.3), new THREE.Vector3(1.6, 2.9, 0.8)]);
  g.add(new THREE.Mesh(new THREE.TubeGeometry(twig, 16, 0.035, 6, false), new THREE.MeshStandardMaterial({ color: '#4a3524', roughness: 0.9 })));
  // cherries clustered at nodes
  const nodes = 9, per = tier === 'lite' ? 10 : 16;
  const cherries = instanced(new THREE.SphereGeometry(0.09, 10, 8), new THREE.MeshStandardMaterial({ color: '#c62e2a', roughness: 0.35 }), nodes * per);
  let k = 0;
  for (let nIdx = 0; nIdx < nodes; nIdx++) {
    const p = curve.getPointAt(0.08 + nIdx * 0.105);
    for (let j = 0; j < per; j++) {
      const a = rnd() * 6.28, b = between(-1, 1), r = between(0.1, 0.26);
      dummy.position.set(p.x + Math.cos(a) * r * 0.6 + between(-0.08, 0.08), p.y + b * r, p.z + Math.sin(a) * r);
      dummy.scale.setScalar(between(0.85, 1.15)); dummy.updateMatrix(); cherries.setMatrixAt(k, dummy.matrix);
      const t = rnd(); cherries.setColorAt(k, col.set(t < 0.72 ? '#b8231f' : t < 0.88 ? '#d9542c' : t < 0.95 ? '#d5a42a' : '#6f9a3a').offsetHSL(0, 0, between(-0.08, 0.06)));
      k++;
    }
  }
  g.add(cherries);
  // leaves
  const lt = leafTex();
  const leaves = instanced(new THREE.PlaneGeometry(0.62, 0.3), windy(new THREE.MeshStandardMaterial({ map: lt, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.8 })), 70);
  for (let i = 0; i < 70; i++) {
    const p = curve.getPointAt(rnd());
    dummy.position.set(p.x + between(-0.2, 0.2), p.y + between(-0.15, 0.3), p.z + between(-0.3, 0.3));
    dummy.rotation.set(between(-0.6, 0.6), rnd() * 6.28, between(-0.9, 0.9)); dummy.scale.setScalar(between(0.8, 1.3)); dummy.updateMatrix(); leaves.setMatrixAt(i, dummy.matrix);
  }
  g.add(leaves);
  // the tree the branch belongs to: trunk, two more branches and a leaf canopy
  const bark = new THREE.MeshStandardMaterial({ color: '#4a3524', roughness: 0.9 });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.14, 2.6, 10), bark); trunk.position.set(-0.6, 1.3, -1.6); trunk.rotation.z = 0.08; g.add(trunk);
  [[new THREE.Vector3(-0.6, 2.2, -1.6), new THREE.Vector3(0.6, 2.6, -1.0), new THREE.Vector3(2.0, 2.7, -0.4)], [new THREE.Vector3(-0.6, 1.9, -1.6), new THREE.Vector3(-1.8, 2.3, -1.2), new THREE.Vector3(-3.2, 2.2, -0.9)], [new THREE.Vector3(-0.6, 1.55, -1.6), new THREE.Vector3(-1.5, 1.5, -0.5), new THREE.Vector3(-1.6, 1.5, 0.1)]]
    .forEach((pts) => g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.045, 7, false), bark)));
  const canopy = instanced(new THREE.PlaneGeometry(0.62, 0.3), leaves.material, 420);
  for (let i = 0; i < 420; i++) {
    const a = rnd() * 6.28, r = Math.sqrt(rnd()) * 2.4;
    dummy.position.set(-0.6 + Math.cos(a) * r, 1.6 + between(0.3, 1.9) - r * 0.15, -1.6 + Math.sin(a) * r * 0.8);
    dummy.rotation.set(between(-0.7, 0.7), rnd() * 6.28, between(-0.9, 0.9)); dummy.scale.setScalar(between(0.8, 1.3)); dummy.updateMatrix(); canopy.setMatrixAt(i, dummy.matrix);
  }
  g.add(canopy);
  // basket with cherries
  const prof = [[0, 0], [0.52, 0], [0.64, 0.35], [0.74, 0.8], [0.78, 0.96], [0.7, 0.98], [0.62, 0.82], [0.52, 0.3], [0.0, 0.26]].map(([x, y]) => new THREE.Vector2(x, y));
  const basket = new THREE.Mesh(new THREE.LatheGeometry(prof, 36), new THREE.MeshStandardMaterial({ map: weaveTex(), roughness: 0.95, side: THREE.DoubleSide }));
  basket.position.set(1.7, 0.02, 0.9); g.add(basket);
  const inBasket = instanced(new THREE.SphereGeometry(0.085, 8, 7), new THREE.MeshStandardMaterial({ color: '#b8231f', roughness: 0.35 }), 170);
  for (let i = 0; i < 170; i++) {
    const a = rnd() * 6.28, r = Math.sqrt(rnd()) * 0.62;
    dummy.position.set(1.7 + Math.cos(a) * r, 0.78 + between(0, 0.18) + (0.62 - r) * 0.12, 0.9 + Math.sin(a) * r);
    dummy.scale.setScalar(1); dummy.updateMatrix(); inBasket.setMatrixAt(i, dummy.matrix);
    inBasket.setColorAt(i, col.set(rnd() < 0.85 ? '#b8231f' : '#d9542c').offsetHSL(0, 0, between(-0.08, 0.06)));
  }
  g.add(inBasket);
  // background shrubs
  const sg = new THREE.SphereGeometry(0.9, 12, 9);
  const sgp = sg.attributes.position; for (let i = 0; i < sgp.count; i++) { const j = 1 + noise2(sgp.getX(i) * 3, sgp.getZ(i) * 3) * 0.14; sgp.setXYZ(i, sgp.getX(i) * j, sgp.getY(i) * j * 0.85, sgp.getZ(i) * j); } sg.computeVertexNormals();
  const shrubs = instanced(sg, new THREE.MeshStandardMaterial({ color: '#2a4f28', roughness: 1 }), 160);
  for (let i = 0; i < 160; i++) {
    const a = rnd() * 3.14, r = between(6, 18);
    dummy.position.set(Math.cos(a) * r * 1.5, 0.55, -4 - Math.sin(a) * r); dummy.scale.set(between(0.8, 1.6), between(0.7, 1.3), between(0.8, 1.6)); dummy.rotation.y = rnd() * 6; dummy.updateMatrix(); shrubs.setMatrixAt(i, dummy.matrix);
    shrubs.setColorAt(i, col.set('#2a4f28').offsetHSL(between(-0.03, 0.03), between(-0.12, 0.05), between(-0.14, 0.04)));
  }
  g.add(shrubs);
  return g;
}

function buildMill(tier) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.PlaneGeometry(90, 90).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#5a4a34', roughness: 1 })));
  const wood = new THREE.MeshStandardMaterial({ color: '#6b5236', roughness: 0.9 });
  const mesh = new THREE.MeshStandardMaterial({ map: beanBedTex(), roughness: 0.85, side: THREE.DoubleSide });
  const beans = instanced(ellipsoidGeo(0.03), new THREE.MeshStandardMaterial({ color: '#c89a52', roughness: 0.75 }), tier === 'lite' ? 3000 : 7000);
  let k = 0;
  const beds = [-6.5, -3.25, 0, 3.25, 6.5];
  beds.forEach((x) => {
    const bed = new THREE.Group(); bed.position.set(x, 0, -1);
    [[-1.1, 0, -5], [-1.1, 0, 5], [1.1, 0, -5], [1.1, 0, 5]].forEach(([lx, ly, lz]) => { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.9, 0.08), wood); leg.position.set(lx, 0.45, lz); bed.add(leg); });
    const rails = [[0, 0.9, -5.05, 2.3, 0.08, 0.1], [0, 0.9, 5.05, 2.3, 0.08, 0.1], [-1.15, 0.9, 0, 0.1, 0.08, 10.2], [1.15, 0.9, 0, 0.1, 0.08, 10.2]];
    rails.forEach(([rx, ry, rz, w, h, d]) => { const r = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wood); r.position.set(rx, ry, rz); bed.add(r); });
    const top = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 10).rotateX(-Math.PI / 2), mesh); top.position.y = 0.88; bed.add(top);
    g.add(bed);
    const per = Math.floor(beans.count / beds.length);
    for (let i = 0; i < per && k < beans.count; i++) {
      dummy.position.set(x + between(-1.05, 1.05), 0.905 + between(0, 0.012), -1 + between(-4.95, 4.95));
      dummy.rotation.set(between(-0.3, 0.3), rnd() * 6.28, between(-0.3, 0.3)); dummy.scale.setScalar(between(0.9, 1.15)); dummy.updateMatrix(); beans.setMatrixAt(k, dummy.matrix);
      beans.setColorAt(k, col.set('#c89a52').offsetHSL(between(-0.02, 0.02), between(-0.1, 0.05), between(-0.14, 0.06)));
      k++;
    }
  });
  g.add(beans);
  // shade cloth roof
  const roof = new THREE.Mesh(new THREE.PlaneGeometry(24, 18, 12, 12), new THREE.MeshStandardMaterial({ color: '#f4efe4', emissive: '#e9e0cc', emissiveIntensity: 0.35, roughness: 1, transparent: true, opacity: 0.66, side: THREE.DoubleSide }));
  const rp = roof.geometry.attributes.position; for (let i = 0; i < rp.count; i++) rp.setZ(i, Math.sin(rp.getX(i) * 0.9) * 0.25);
  roof.geometry.computeVertexNormals(); roof.rotation.x = -Math.PI / 2; roof.position.set(0, 3.6, -1); g.add(roof);
  [[-11, -9.5], [-11, 7.5], [11, -9.5], [11, 7.5], [0, -9.5], [0, 7.5]].forEach(([x, z]) => { const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 3.6, 0.12), wood); post.position.set(x, 1.8, z); g.add(post); });
  // water channel with a simple ripple shader
  const water = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 40, 1, 60).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } }, transparent: true,
    vertexShader: 'uniform float uTime; varying vec2 vUv; void main(){ vUv = uv; vec3 p = position; p.y += sin(uv.y*60.0 + uTime*1.5)*0.012; gl_Position = projectionMatrix*modelViewMatrix*vec4(p,1.0); }',
    fragmentShader: 'uniform float uTime; varying vec2 vUv; void main(){ float r = 0.5+0.5*sin(vUv.y*80.0 - uTime*2.2 + sin(vUv.x*12.0)*2.0); vec3 c = mix(vec3(0.18,0.26,0.27), vec3(0.58,0.72,0.72), r*0.45); gl_FragColor = vec4(c, 0.85); }',
  }));
  water.position.set(10.5, 0.02, -1); g.add(water); g.userData.water = water;
  const edge = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.2, 40), new THREE.MeshStandardMaterial({ color: '#8d867a' })); edge.position.set(9.7, 0.1, -1); g.add(edge); const edge2 = edge.clone(); edge2.position.x = 11.3; g.add(edge2);
  return g;
}

function buildRoast(tier) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.PlaneGeometry(60, 60).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#17110d', roughness: 0.9 })));
  // a wall wide and tall enough to fill the view on the approach, so the roastery reads as an interior and not a glowing slab in the fog
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(120, 44), new THREE.MeshStandardMaterial({ color: '#1e1512', roughness: 1 })); wall.position.set(0, 18, -12); g.add(wall);
  const metal = new THREE.MeshStandardMaterial({ color: '#2a2420', metalness: 0.78, roughness: 0.38 });
  const brass = new THREE.MeshStandardMaterial({ color: '#b8894a', metalness: 0.9, roughness: 0.28 });
  // drum, open towards +z
  const drum = new THREE.Group(); drum.position.set(0, 1.6, 0);
  const shell = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, 3.2, 40, 1, true), new THREE.MeshStandardMaterial({ color: '#2a2420', metalness: 0.78, roughness: 0.38, side: THREE.DoubleSide }));
  shell.rotation.x = Math.PI / 2; drum.add(shell);
  const back = new THREE.Mesh(new THREE.CircleGeometry(1.25, 40), metal); back.position.z = -1.6; drum.add(back);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.27, 0.06, 10, 48), brass); ring.position.z = 1.6; drum.add(ring);
  const ring2 = ring.clone(); ring2.position.z = -1.6; drum.add(ring2);
  for (let i = 0; i < 8; i++) { const rib = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 3.1), new THREE.MeshStandardMaterial({ color: '#3a322c', metalness: 0.7, roughness: 0.5 })); const a = i / 8 * Math.PI * 2; rib.position.set(Math.cos(a) * 1.17, Math.sin(a) * 1.17, 0); rib.rotation.z = a; drum.add(rib); }
  g.add(drum); g.userData.drum = drum;
  // stand and hopper
  const stand = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.9, 3.6), metal); stand.position.set(0, 0.45, 0); g.add(stand);
  const hopper = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.7, 24, 1, true), new THREE.MeshStandardMaterial({ color: '#2a2420', metalness: 0.78, roughness: 0.38, side: THREE.DoubleSide })); hopper.rotation.x = Math.PI; hopper.position.set(0, 3.3, -0.4); g.add(hopper);
  const chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 4, 16), metal); chimney.position.set(-0.6, 4.6, -1.2); g.add(chimney);
  // burner glow
  const burner = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 2.8).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ff5a1a', transparent: true, opacity: 0.0 }));
  burner.position.set(0, 0.92, 0); g.add(burner); g.userData.burner = burner;
  const fire = new THREE.PointLight('#ff7a2f', 0, 9, 1.6); fire.position.set(0, 1.0, 0.9); g.add(fire); g.userData.fire = fire;
  const glow = new THREE.PointLight('#ff9a4a', 0, 6, 2); glow.position.set(0, 1.6, 1.4); g.add(glow); g.userData.glow = glow;
  // beans inside
  const n = tier === 'lite' ? 260 : 520;
  const beans = instanced(ellipsoidGeo(0.1), new THREE.MeshStandardMaterial({ color: '#8c6a3c', roughness: 0.7 }), n, true);
  const seeds = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { seeds[i * 3] = between(Math.PI * 0.62, Math.PI * 1.38); seeds[i * 3 + 1] = between(0.25, 0.95); seeds[i * 3 + 2] = between(-1.35, 1.35); }
  for (let i = 0; i < n; i++) { dummy.position.set(0, 1.2, 0); dummy.updateMatrix(); beans.setMatrixAt(i, dummy.matrix); beans.setColorAt(i, col.set('#b89a68')); }
  g.add(beans); g.userData.beans = beans; g.userData.seeds = seeds;
  // smoke
  const smoke = points(tier === 'lite' ? 40 : 90, 1.6, '#c9b8a8', 0.12, softDot());
  const sp = smoke.geometry.attributes.position; for (let i = 0; i < sp.count; i++) sp.setXYZ(i, between(-0.6, 0.6), between(2, 6), between(-1.4, 0.4));
  g.add(smoke); g.userData.smoke = smoke;
  // sacks in the corner
  const sack = new THREE.Mesh(new THREE.SphereGeometry(0.6, 16, 12).scale(1, 1.25, 0.8), new THREE.MeshStandardMaterial({ color: '#9a8766', roughness: 1 }));
  [[-4, 0.7, -3], [-3.2, 0.7, -4.2], [-4.6, 1.9, -3.6]].forEach(([x, y, z]) => { const s = sack.clone(); s.position.set(x, y, z); s.rotation.y = rnd() * 2; g.add(s); });
  return g;
}

function buildBrew(tier) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.PlaneGeometry(40, 40).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#17100b', roughness: 1 })));
  const table = new THREE.Mesh(new THREE.BoxGeometry(4, 0.08, 2.2), new THREE.MeshStandardMaterial({ color: '#3b2a1f', roughness: 0.65 })); table.position.y = 0.76; g.add(table);
  const ceramic = new THREE.MeshStandardMaterial({ color: '#f0e7da', roughness: 0.35 });
  const glass = new THREE.MeshPhysicalMaterial({ color: '#dfe8ea', roughness: 0.05, metalness: 0, transparent: true, opacity: 0.26, side: THREE.DoubleSide });
  const carafe = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.44, 0], [0.5, 0.25], [0.46, 0.42], [0.3, 0.5], [0.3, 0.56], [0.0, 0.56]].map(([x, y]) => new THREE.Vector2(x, y)), 40), glass);
  carafe.position.y = 0.8; g.add(carafe);
  const coffee = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.34, 32), new THREE.MeshStandardMaterial({ color: '#2a140a', roughness: 0.3 })); coffee.position.y = 0.8 + 0.17; coffee.scale.y = 0.001; g.add(coffee); g.userData.coffee = coffee;
  const dripper = new THREE.Mesh(new THREE.LatheGeometry([[0.08, 0], [0.12, 0.06], [0.42, 0.36], [0.46, 0.38], [0.4, 0.38], [0.1, 0.1], [0.06, 0.1]].map(([x, y]) => new THREE.Vector2(x, y)), 40), new THREE.MeshStandardMaterial({ color: '#f0e7da', roughness: 0.35, side: THREE.DoubleSide }));
  dripper.position.y = 1.36; g.add(dripper);
  const bed = new THREE.Mesh(new THREE.CircleGeometry(0.3, 32).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#3b2314', roughness: 0.95 })); bed.position.y = 1.36 + 0.24; g.add(bed); g.userData.bed = bed;
  // kettle
  const kettle = new THREE.Group(); kettle.position.set(1.35, 0.8, 0.35);
  const body = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.5, 0], [0.52, 0.3], [0.4, 0.55], [0.14, 0.62], [0.14, 0.7], [0, 0.7]].map(([x, y]) => new THREE.Vector2(x, y)), 40), new THREE.MeshStandardMaterial({ color: '#1b1b1d', metalness: 0.6, roughness: 0.45 }));
  kettle.add(body);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.035, 8, 24, Math.PI), new THREE.MeshStandardMaterial({ color: '#3b2a1f', roughness: 0.7 })); handle.position.set(0, 0.62, 0); handle.rotation.y = Math.PI / 2; kettle.add(handle);
  g.add(kettle);
  const neck = new THREE.CatmullRomCurve3([new THREE.Vector3(0.95, 1.15, 0.35), new THREE.Vector3(0.7, 1.55, 0.2), new THREE.Vector3(0.4, 1.92, 0.08), new THREE.Vector3(0.16, 1.9, 0.02)]);
  g.add(new THREE.Mesh(new THREE.TubeGeometry(neck, 24, 0.035, 8, false), new THREE.MeshStandardMaterial({ color: '#1b1b1d', metalness: 0.6, roughness: 0.45 })));
  const stream = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.016, 0.3, 8), new THREE.MeshPhysicalMaterial({ color: '#cfe3e8', transparent: true, opacity: 0.55, roughness: 0.05 }));
  stream.position.set(0.12, 1.9 - 0.15, 0.02); stream.scale.y = 0.001; g.add(stream); g.userData.stream = stream;
  const steam = points(tier === 'lite' ? 30 : 60, 0.3, '#ffffff', 0.06, softDot());
  const sp = steam.geometry.attributes.position; for (let i = 0; i < sp.count; i++) sp.setXYZ(i, between(-0.3, 0.3), between(1.75, 2.6), between(-0.3, 0.3));
  g.add(steam); g.userData.steam = steam;
  // a scale and a jar
  const scale = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.05, 0.6), new THREE.MeshStandardMaterial({ color: '#222', roughness: 0.6 })); scale.position.set(0, 0.805, 0); g.add(scale);
  const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.5, 24), glass); jar.position.set(-1.3, 1.05, -0.4); g.add(jar);
  const jarBeans = instanced(ellipsoidGeo(0.05), new THREE.MeshStandardMaterial({ color: '#3a2112', roughness: 0.7 }), 120);
  for (let i = 0; i < 120; i++) { const a = rnd() * 6.28, r = Math.sqrt(rnd()) * 0.19; dummy.position.set(-1.3 + Math.cos(a) * r, 0.84 + rnd() * 0.36, -0.4 + Math.sin(a) * r); dummy.rotation.set(rnd() * 3, rnd() * 3, 0); dummy.scale.setScalar(1); dummy.updateMatrix(); jarBeans.setMatrixAt(i, dummy.matrix); }
  g.add(jarBeans);
  const lamp = new THREE.PointLight('#ffd9ae', 6, 8, 1.8); lamp.position.set(-0.6, 2.8, 1.2); g.add(lamp);
  const fill = new THREE.PointLight('#ffe6cc', 2.2, 5, 1.8); fill.position.set(0.8, 1.2, 2.2); g.add(fill);
  g.add(practical(-0.6, 2.8, 1.2, '#ffd9ae', 2.6));
  return g;
}

/* A visible lamp: a warm bulb with a soft halo, so the dark approach to a scene has a light to travel toward. */
function practical(x, y, z, color, haloSize) {
  const lamp = new THREE.Group(); lamp.position.set(x, y, z);
  lamp.add(new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8), new THREE.MeshBasicMaterial({ color: '#fff3dc' })));
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDot(128), color, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.scale.setScalar(haloSize); lamp.add(halo);
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.2, 24, 1, true), new THREE.MeshStandardMaterial({ color: '#1b1512', roughness: 0.6, metalness: 0.4, side: THREE.DoubleSide }));
  shade.position.y = 0.12; lamp.add(shade);
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 2.6, 6), new THREE.MeshStandardMaterial({ color: '#111' })); cord.position.y = 1.5; lamp.add(cord);
  return lamp;
}

function buildCup(tier) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.PlaneGeometry(30, 30).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#0c0806', roughness: 1 })));
  const table = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 0.06, 48), new THREE.MeshStandardMaterial({ color: '#2b1c13', roughness: 0.55 })); table.position.y = 0.77; g.add(table);
  const ceramic = new THREE.MeshStandardMaterial({ color: '#f3ece2', roughness: 0.3, side: THREE.DoubleSide });
  const saucer = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.26, 0], [0.5, 0.04], [0.55, 0.07], [0.53, 0.08], [0.26, 0.025], [0, 0.025]].map(([x, y]) => new THREE.Vector2(x, y)), 48), ceramic); saucer.position.y = 0.8; g.add(saucer);
  const cup = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.24, 0], [0.27, 0.03], [0.33, 0.2], [0.36, 0.32], [0.34, 0.32], [0.31, 0.2], [0.25, 0.04], [0, 0.04]].map(([x, y]) => new THREE.Vector2(x, y)), 48), ceramic); cup.position.y = 0.84; g.add(cup);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.026, 10, 24, Math.PI), ceramic); handle.position.set(0.31, 1.0, 0); handle.rotation.set(0, 0, -Math.PI / 2); g.add(handle);
  // crema surface
  const crema = new THREE.Mesh(new THREE.CircleGeometry(0.315, 48).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uP: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv - 0.5; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: `uniform float uTime; uniform float uP; varying vec2 vUv;
      void main(){ float r = length(vUv)*2.0; float a = atan(vUv.y, vUv.x);
        float sw = sin(r*34.0 - a*1.5 + uTime*0.2 + sin(a*4.0 + r*9.0 + uTime*0.08)*1.1)*0.5+0.5;
        float fine = sin(r*90.0 + a*7.0 - uTime*0.15)*0.5+0.5;
        float rim = smoothstep(0.84, 1.0, r);
        vec3 crema = vec3(0.80,0.60,0.34); vec3 dark = vec3(0.30,0.16,0.07); vec3 edge = vec3(0.62,0.42,0.22);
        vec3 c = mix(dark, crema, 0.35 + sw*0.3 + fine*0.12); c = mix(c, edge, rim);
        float spec = pow(max(0.0, 1.0 - length(vUv - vec2(0.18,-0.22))*4.0), 6.0)*0.35;
        gl_FragColor = vec4(c + spec, 1.0); }`,
  }));
  crema.position.y = 0.84 + 0.29; g.add(crema); g.userData.crema = crema;
  const steam = points(tier === 'lite' ? 26 : 50, 0.3, '#ffffff', 0.07, softDot());
  const sp = steam.geometry.attributes.position; for (let i = 0; i < sp.count; i++) sp.setXYZ(i, between(-0.15, 0.15), between(1.2, 2.0), between(-0.15, 0.15));
  g.add(steam); g.userData.steam = steam;
  const spot = new THREE.SpotLight('#ffe3bd', 60, 9, 0.55, 0.7, 1.6); spot.position.set(0.4, 4.2, 0.8); spot.target.position.set(0, 0.9, 0); g.add(spot); g.add(spot.target);
  g.add(practical(0.4, 3.3, 0.8, '#ffe3bd', 3.2));
  // a few beans on the table
  const beans = instanced(ellipsoidGeo(0.022), new THREE.MeshStandardMaterial({ color: '#3a2112', roughness: 0.7 }), 14);
  for (let i = 0; i < 14; i++) { const a = rnd() * 6.28, r = between(0.75, 1.3); dummy.position.set(Math.cos(a) * r, 0.83, Math.sin(a) * r); dummy.rotation.set(0, rnd() * 6, 0); dummy.scale.setScalar(1); dummy.updateMatrix(); beans.setMatrixAt(i, dummy.matrix); }
  g.add(beans);
  return g;
}

/* ------------------------------------------------------------------ mount */
export function mount({ host, jr, stage, state, onState, explicit, jtFromY }) {
  const tier = state.tier === 'lite' ? 'lite' : 'full';
  const renderer = new THREE.WebGLRenderer({ antialias: tier === 'full', powerPreference: 'high-performance', alpha: false });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  // Full tier renders at up to 2× on ordinary viewports, 1.5× on very large ones (the fog and the
  // tone mapping hide the difference; the fill rate does not).
  const bigCanvas = host.clientWidth * host.clientHeight > 1.7e6;
  let dpr = tier === 'full' ? Math.min(devicePixelRatio || 1, bigCanvas ? 1.5 : 2) : 1;
  renderer.setPixelRatio(dpr);
  renderer.setSize(host.clientWidth, host.clientHeight);
  host.appendChild(renderer.domElement);
  const canvas = renderer.domElement;
  canvas.style.transition = 'opacity 420ms ease';

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2('#93a7a6', 0.03);
  scene.background = new THREE.Color('#93a7a6');
  const camera = new THREE.PerspectiveCamera(52, host.clientWidth / host.clientHeight, 0.1, 160);
  const sky = new THREE.Mesh(new THREE.SphereGeometry(140, 24, 12), new THREE.ShaderMaterial({
    uniforms: { uTop: { value: new THREE.Color('#5a7375') }, uBottom: { value: new THREE.Color('#93a7a6') } }, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: 'varying float vY; void main(){ vY = normalize(position).y; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 uTop; uniform vec3 uBottom; varying float vY; void main(){ float t = smoothstep(-0.05, 0.55, vY); gl_FragColor = vec4(mix(uBottom, uTop, t), 1.0); }',
  }));
  sky.renderOrder = -1; scene.add(sky);
  const hemi = new THREE.HemisphereLight('#bcccc8', '#2a3a2e', 1); scene.add(hemi);
  const sun = new THREE.DirectionalLight('#ffd8ad', 1.3); scene.add(sun);
  const sunTarget = new THREE.Object3D(); scene.add(sunTarget); sun.target = sunTarget;

  /* Environments are built lazily: the plantation now, the rest in idle time (or on approach), so the
   * main thread is not blocked by six scene builds at once. Until built, a group is an empty placeholder. */
  const builders = [buildPlantation, buildHarvest, buildMill, buildRoast, buildBrew, buildCup];
  const groups = builders.map((b, i) => { const g = new THREE.Group(); g.position.z = Z[i]; g.visible = i === 0; g.userData.built = false; scene.add(g); return g; });
  function build(i) {
    const g = groups[i]; if (g.userData.built) return; g.userData.built = true;
    const built = builders[i](tier); built.position.set(0, 0, 0);
    while (built.children.length) g.add(built.children[0]);
    Object.assign(g.userData, built.userData);
  }
  build(0);
  let next = 1;
  const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 120));
  const buildNext = () => { while (next < groups.length && groups[next].userData.built) next++; if (next < groups.length) { build(next++); idle(buildNext, { timeout: 2500 }); } };
  idle(buildNext, { timeout: 2500 });

  /* progress: smoothed by ScrollTrigger scrub when motion is on, raw when calm */
  let smoothJt = 0;
  if (window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
    // The tween is what ScrollTrigger scrubs (smooths); proxy.p is scroll distance through the journey.
    const proxy = { p: 0 };
    const total = () => jr.offsetHeight - stage.offsetHeight;
    gsap.to(proxy, { p: 1, ease: 'none', scrollTrigger: { trigger: jr, start: 'top top', end: 'bottom bottom', scrub: 1.1 } });
    Object.defineProperty(state, 'smoothJt', { get: () => jtFromY(proxy.p * total()), configurable: true });
  }

  const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3(), look = new THREE.Vector3(), camPos = new THREE.Vector3();
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  stage.addEventListener('pointermove', (e) => { if (e.pointerType !== 'mouse') return; const r = stage.getBoundingClientRect(); pointer.tx = (e.clientX - r.left) / r.width - 0.5; pointer.ty = (e.clientY - r.top) / r.height - 0.5; });
  stage.addEventListener('pointerleave', () => { pointer.tx = 0; pointer.ty = 0; });

  /* The camera path. Each chapter is a dolly from pose a to pose b (reached at p = 0.72), then a fast
   * crossing through the fog to the next chapter's a. Within a chapter the dolly keeps a gentle
   * ease (speed varies ±35 %, never stops); the knots between segments are rounded by sampling the
   * polyline a little ahead and behind and blending, so the camera never halts and re-accelerates
   * at a pose and never kinks into a new direction. The rounding stays within a few units of the
   * authored path, so no prop is clipped that the straight path would not have clipped. */
  const dolly = (t) => t - 0.35 * Math.sin(Math.PI * 2 * t) / (Math.PI * 2);
  function polyline(jt, outPos, outLook) {
    jt = clamp(jt, 0, 6);
    const i = Math.min(5, Math.floor(jt)); const p = jt - i;
    const c = CAM[i]; const cross = c.cross ?? 0.28, s = 1 - cross;
    if (p < s || i === 5) {
      const t = i === 5 ? dolly(clamp(p, 0, 1)) : dolly(p / s);
      outPos.set(lerp(c.a[0], c.b[0], t), lerp(c.a[1], c.b[1], t), lerp(c.a[2], c.b[2], t) + Z[i]);
      outLook.set(lerp(c.al[0], c.bl[0], t), lerp(c.al[1], c.bl[1], t), lerp(c.al[2], c.bl[2], t) + Z[i]);
    } else {
      const n = CAM[i + 1]; const t = (p - s) / cross;
      if (c.v && t < 0.5) {
        const u = t * 2;
        outPos.set(lerp(c.b[0], c.v[0], u), lerp(c.b[1], c.v[1], u), lerp(c.b[2], c.v[2], u) + Z[i]);
      } else if (c.v) {
        const u = (t - 0.5) * 2;
        outPos.set(lerp(c.v[0], n.a[0], u), lerp(c.v[1], n.a[1], u), lerp(c.v[2] + Z[i], n.a[2] + Z[i + 1], u));
      } else {
        outPos.set(lerp(c.b[0], n.a[0], t), lerp(c.b[1], n.a[1], t), lerp(c.b[2] + Z[i], n.a[2] + Z[i + 1], t));
      }
      outLook.set(lerp(c.bl[0], n.al[0], t), lerp(c.bl[1], n.al[1], t), lerp(c.bl[2] + Z[i], n.al[2] + Z[i + 1], t));
    }
  }
  const KERNEL = [[-0.05, 1], [-0.025, 2], [0, 3], [0.025, 2], [0.05, 1]]; // offsets in chapter units, weights
  const kp = new THREE.Vector3(), kl = new THREE.Vector3();
  function pose(jt, calm) {
    if (calm) jt = Math.min(5, Math.floor(jt)) + 0.62; // one held pose per chapter
    camPos.set(0, 0, 0); look.set(0, 0, 0);
    for (const [o, w] of KERNEL) { polyline(jt + o, kp, kl); camPos.addScaledVector(kp, w / 9); look.addScaledVector(kl, w / 9); }
  }
  const fogA = new THREE.Color(), skyA = new THREE.Color(), gndA = new THREE.Color(), sunA = new THREE.Color();
  function atmosphere(jt) {
    const i = Math.min(5, Math.floor(jt)); const p = jt - i;
    const j = Math.min(5, i + 1);
    const t = i === 5 ? 0 : smoothstep(p, 0.6, 1.0); // blend towards the next chapter in the fog
    const A = PAL[i], B = PAL[j];
    // the light changes within a chapter too: the plantation's morning burns off (fog thins, sun
    // strengthens); the roast's fire is lit; the pour's lamp warms as the coffee rises
    let densK = 1, sunK = 1, expK = 1;
    if (i === 0) { const d = smoothstep(p, 0.05, 0.65); densK = lerp(1.3, 0.8, d); sunK = lerp(0.7, 1.3, d); expK = lerp(0.92, 1.06, d); }
    if (i === 3) { const f = smoothstep(p, 0.05, 0.4); expK = lerp(0.9, 1.08, f); }
    if (i === 4) { const w = smoothstep(p, 0.2, 0.9); expK = lerp(0.96, 1.08, w); }
    fogA.set(A.fog).lerp(col.set(B.fog), t); scene.fog.color.copy(fogA); scene.background.copy(fogA);
    sky.material.uniforms.uBottom.value.copy(fogA); sky.material.uniforms.uTop.value.set(A.top).lerp(col.set(B.top), t); sky.position.copy(camPos);
    scene.fog.density = lerp(A.dens * densK, B.dens, t);
    hemi.color.copy(skyA.set(A.sky).lerp(col.set(B.sky), t)); hemi.groundColor.copy(gndA.set(A.ground).lerp(col.set(B.ground), t)); hemi.intensity = lerp(A.hemiI, B.hemiI, t);
    sun.color.copy(sunA.set(A.sun).lerp(col.set(B.sun), t)); sun.intensity = lerp(A.sunI * sunK, B.sunI, t);
    tmpA.fromArray(A.dir); tmpB.fromArray(B.dir); tmpA.lerp(tmpB, t).normalize().multiplyScalar(30);
    sun.position.copy(camPos).add(tmpA); sunTarget.position.copy(camPos);
    renderer.toneMappingExposure = lerp(A.exp * expK, B.exp, t);
  }

  /* per-chapter time animation */
  let time = 0;
  let lastRoastColor = -1;
  function animate(jt, dt) {
    const i = Math.min(5, Math.floor(jt)); const p = clamp(jt - i, 0, 1);
    // the next environment is switched on well before the crossing (the fog hides it until then,
    // so nothing pops), the previous one stays on for the first tenth of a chapter
    groups.forEach((g, k) => { g.visible = k === i || (k === i + 1 && p > 0.45) || (k === i - 1 && p < 0.12); if (g.visible && !g.userData.built) build(k); });
    if (!groups[Math.min(5, i + 1)].userData.built && p > 0.3) build(Math.min(5, i + 1));
    windU.uTime.value = time;
    // mist and low cloud drift
    if (groups[0].visible && groups[0].userData.mist) {
      const pos = groups[0].userData.mist.geometry.attributes.position;
      for (let k = 0; k < pos.count; k++) { let x = pos.getX(k) + dt * (0.35 + (k % 5) * 0.05); if (x > 42) x = -42; pos.setX(k, x); pos.setY(k, pos.getY(k) + Math.sin(time * 0.4 + k) * dt * 0.08); }
      pos.needsUpdate = true;
      const cl = groups[0].userData.clouds;
      if (cl) {
        const cp = cl.geometry.attributes.position;
        for (let k = 0; k < cp.count; k++) { let x = cp.getX(k) + dt * (0.22 + (k % 3) * 0.06); if (x > 60) x = -60; cp.setX(k, x); }
        cp.needsUpdate = true;
        cl.material.opacity = 0.2 * lerp(1.15, 0.7, smoothstep(p, 0.05, 0.65)); // the morning thins them with the fog
      }
    }
    if (groups[2].visible && groups[2].userData.water) groups[2].userData.water.material.uniforms.uTime.value = time;
    if (groups[3].visible && groups[3].userData.drum) {
      const u = groups[3].userData; const roastP = i === 3 ? p : i > 3 ? 1 : 0;
      u.drum.rotation.z += dt * 1.4;
      // the burner is lit as the visitor arrives (an ember glow is already there, so the drum is never lost in the dark)
      const heat = i === 3 ? smoothstep(p, 0.0, 0.28) : i > 3 ? 1 : 0;
      u.burner.material.opacity = heat * (0.45 + Math.sin(time * 17) * 0.08 + Math.sin(time * 5.3) * 0.06);
      u.fire.intensity = 2.5 + heat * (14 + Math.sin(time * 13) * 2.5); u.glow.intensity = 1.2 + heat * 4;
      const seeds = u.seeds; const b = u.beans; const n = b.count;
      // the beans darken with the chapter's progress; the colour buffer is only rewritten when the shade moves
      const shade = Math.round(smoothstep(roastP, 0.25, 0.95) * 60) / 60;
      const recolor = shade !== lastRoastColor; if (recolor) { lastRoastColor = shade; col.set('#b89a68').lerp(ROASTED, shade); }
      for (let k = 0; k < n; k++) {
        const a = seeds[k * 3] + Math.sin(time * 1.9 + k * 0.37) * 0.28;
        const r = seeds[k * 3 + 1] * 1.08 + Math.sin(time * 2.6 + k) * 0.06;
        dummy.position.set(Math.cos(a) * r, 1.6 + Math.sin(a) * r, seeds[k * 3 + 2]);
        dummy.rotation.set(time * 1.3 + k, time * 0.9 + k * 2, 0); dummy.scale.setScalar(1); dummy.updateMatrix(); b.setMatrixAt(k, dummy.matrix);
        if (recolor) b.setColorAt(k, col);
      }
      b.instanceMatrix.needsUpdate = true; if (recolor && b.instanceColor) b.instanceColor.needsUpdate = true;
      const sm = u.smoke.geometry.attributes.position;
      for (let k = 0; k < sm.count; k++) { let y = sm.getY(k) + dt * (0.5 + (k % 3) * 0.2); let x = sm.getX(k) + Math.sin(time + k) * dt * 0.15; if (y > 7) { y = 2.2; x = between(-0.5, 0.5); } sm.setY(k, y); sm.setX(k, x); }
      sm.needsUpdate = true; u.smoke.material.opacity = 0.12 * heat;
    }
    if (groups[4].visible && groups[4].userData.stream) {
      const u = groups[4].userData; const bp = i === 4 ? p : i > 4 ? 1 : 0;
      const pouring = smoothstep(bp, 0.12, 0.2) * (1 - smoothstep(bp, 0.72, 0.8));
      u.stream.scale.y = Math.max(0.001, pouring); u.stream.position.y = 1.9 - 0.15 * pouring;
      u.coffee.scale.y = Math.max(0.001, smoothstep(bp, 0.18, 0.85)); u.coffee.position.y = 0.8 + 0.17 * u.coffee.scale.y;
      u.bed.position.y = 1.6 + 0.04 * Math.sin(Math.min(1, bp / 0.3) * Math.PI);
      const st = u.steam.geometry.attributes.position;
      for (let k = 0; k < st.count; k++) { let y = st.getY(k) + dt * 0.35; if (y > 2.7) y = 1.7; st.setY(k, y); st.setX(k, st.getX(k) + Math.sin(time * 1.3 + k) * dt * 0.08); }
      st.needsUpdate = true; u.steam.material.opacity = 0.09 * pouring + 0.03;
    }
    if (groups[5].visible && groups[5].userData.crema) {
      const u = groups[5].userData; u.crema.material.uniforms.uTime.value = time;
      const st = u.steam.geometry.attributes.position;
      for (let k = 0; k < st.count; k++) { let y = st.getY(k) + dt * 0.28; if (y > 2.1) y = 1.15; st.setY(k, y); st.setX(k, st.getX(k) + Math.sin(time * 1.1 + k) * dt * 0.05); }
      st.needsUpdate = true;
    }
  }

  /* render loop */
  let lastT = performance.now(), running = false, needs = true, frames = 0, fpsAcc = 0, fpsT = 0;
  let calmChapter = -1;
  function frame(now) {
    if (!running) return;
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
    const calm = state.calm;
    const target = calm ? state.jt : (state.smoothJt ?? state.jt);
    if (calm) {
      const ch = Math.min(5, Math.floor(state.jt));
      if (ch !== calmChapter) {
        // crossfade to the held pose
        canvas.style.opacity = '0';
        setTimeout(() => { calmChapter = ch; smoothJt = ch + 0.62; needs = true; canvas.style.opacity = '1'; }, 220);
        if (calmChapter < 0) { calmChapter = ch; smoothJt = ch + 0.62; canvas.style.opacity = '1'; }
      }
    } else {
      smoothJt = target;
    }
    const moving = !calm && !state.paused;
    if (moving) { time += dt; needs = true; }
    if (!needs) return;
    needs = false;
    pose(smoothJt, calm);
    if (!calm) { pointer.x += (pointer.tx - pointer.x) * 0.06; pointer.y += (pointer.ty - pointer.y) * 0.06; camPos.x += pointer.x * 0.35; camPos.y -= pointer.y * 0.22; }
    if (moving) {
      // a breath of hand-held drift so a held frame is never dead still (a centimetre or two)
      camPos.y += Math.sin(time * 0.62) * 0.014 + Math.sin(time * 1.37) * 0.006;
      look.x += Math.sin(time * 0.48) * 0.012; look.y += Math.cos(time * 0.71) * 0.008;
    }
    camera.position.copy(camPos); camera.lookAt(look);
    atmosphere(smoothJt);
    animate(smoothJt, moving ? dt : 0);
    renderer.render(scene, camera);
    // watchdog
    if (!explicit && tier === 'full' && moving) {
      frames++; fpsAcc += dt; if (fpsAcc >= 1) { state.fps = frames / fpsAcc; frames = 0; fpsAcc = 0; fpsT += 1; if (state.fps < 24 && fpsT >= 4) demote(); if (state.fps >= 24) fpsT = 0; }
    }
  }
  function demote() {
    if (dpr <= 1) return;
    dpr = 1; renderer.setPixelRatio(1); state.tier = 'lite'; state.tierReason = `watchdog (${state.fps.toFixed(0)} fps)`;
    groups[0].userData.mist?.geometry.setDrawRange(0, 90); groups[2].children.forEach((c) => { if (c.isInstancedMesh) c.count = Math.min(c.count, 3000); });
  }
  function start() { if (running) return; running = true; lastT = performance.now(); needs = true; requestAnimationFrame(frame); }
  function stop() { running = false; }

  function resize() {
    const w = host.clientWidth, h = host.clientHeight;
    renderer.setSize(w, h); camera.aspect = w / h; camera.fov = h > w ? 74 : 52; camera.updateProjectionMatrix(); needs = true;
  }
  window.addEventListener('resize', resize);
  resize();

  onState((s) => { needs = true; if (s.live && !document.hidden) start(); else stop(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else if (state.live) start(); });

  // first frame, then reveal
  pose(0, state.calm); camera.position.copy(camPos); camera.lookAt(look); atmosphere(0); animate(0, 0); renderer.render(scene, camera);
  jr.classList.add('jr--webgl');
  requestAnimationFrame(() => { jr.classList.add('jr--ready'); state.sceneReady = true; if (state.live) start(); });
  // test hook: render the scene at an exact progress, bypassing the scrub smoothing
  const renderAt = (jt) => { pose(jt, false); camera.position.copy(camPos); camera.lookAt(look); atmosphere(jt); animate(jt, 0); renderer.render(scene, camera); };
  window.__yorai = { renderer, scene, camera, state, groups, renderAt };
  return { renderer, scene, camera };
}
