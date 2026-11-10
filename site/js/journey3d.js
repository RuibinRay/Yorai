/* YORAI — the scroll-driven 3D journey.
 * Six procedural environments laid out along −z; the camera travels through fog from one to the next.
 * Scroll progress (jt ∈ [0, 6]) comes from GSAP ScrollTrigger with scrub smoothing; time-based motion
 * (mist, steam, tumbling beans, crema) runs only when the stage is on screen, motion is on and the
 * scene is not paused. Under calm motion the camera holds one pose per chapter and crossfades.
 *
 * The look is cel-shaded anime: toon materials on one shared ramp with a rim light, a painted sky
 * (gradient, cumulus, a sun disc), and a post pass that draws ink lines from depth, adds bloom and
 * light shafts, tone-maps and grades. Everything is plain three.js core: no add-ons, no extra requests.
 */
import * as THREE from 'three';

const { lerp, smoothstep, clamp } = THREE.MathUtils;
const Z = [0, -70, -140, -210, -280, -350]; // group offsets per chapter

/* Per-chapter lighting, atmosphere and grade. `fog` is also the horizon of the painted sky and `top`
 * its zenith; `cloud` is the cumulus cover with its lit and shaded tones; `disc` puts the sun in the
 * sky where it is in frame; `rays`, `ink`, `bloom` and `sat` drive the post pass. */
const PAL = [
  { fog: '#8db0c6', top: '#27598f', dens: 0.021, sky: '#d6e9f6', ground: '#4a7a50', sun: '#ffd7a2', dir: [-0.35, 0.22, -1], sunI: 1.6, hemiI: 1.6, exp: 1.04, cloud: 0.56, cloudLit: '#fff0dc', cloudShade: '#7896bf', disc: 1, rays: 1, ink: 0.85, bloom: 0.6, sat: 1.18 },
  { fog: '#cfe8d6', top: '#3688d6', dens: 0.05, sky: '#e6f3e2', ground: '#3d5a2a', sun: '#fff3d2', dir: [0.6, 1, 0.3], sunI: 2.0, hemiI: 1.25, exp: 1.05, cloud: 0.5, cloudLit: '#ffffff', cloudShade: '#a6c2e2', disc: 0, rays: 0, ink: 0.9, bloom: 0.5, sat: 1.2 },
  { fog: '#f2e8cc', top: '#4d9bd8', dens: 0.024, sky: '#f6eedb', ground: '#7a6a50', sun: '#fff6dc', dir: [0.2, 1, 0.45], sunI: 1.9, hemiI: 1.3, exp: 1.08, cloud: 0.42, cloudLit: '#fffaf0', cloudShade: '#b4c4da', disc: 0, rays: 0, ink: 0.9, bloom: 0.5, sat: 1.15 },
  { fog: '#1a0c08', top: '#070302', dens: 0.075, sky: '#3a2016', ground: '#120806', sun: '#ff9a52', dir: [0.4, 0.6, 0.5], sunI: 0.5, hemiI: 0.62, exp: 1.0, cloud: 0, cloudLit: '#3a2016', cloudShade: '#1a0c08', disc: 0, rays: 0, ink: 0.6, bloom: 0.55, sat: 1.15 },
  { fog: '#1f130d', top: '#0d0704', dens: 0.085, sky: '#50382a', ground: '#15100c', sun: '#ffd9ae', dir: [-0.5, 1, 0.4], sunI: 1.6, hemiI: 0.8, exp: 1.05, cloud: 0, cloudLit: '#50382a', cloudShade: '#1f130d', disc: 0, rays: 0, ink: 0.7, bloom: 0.85, sat: 1.12 },
  { fog: '#0c0806', top: '#050302', dens: 0.11, sky: '#2a1c12', ground: '#0c0806', sun: '#ffe9ca', dir: [0.1, 1, 0.15], sunI: 1.0, hemiI: 0.5, exp: 1.0, cloud: 0, cloudLit: '#2a1c12', cloudShade: '#0c0806', disc: 0, rays: 0, ink: 0.7, bloom: 0.5, sat: 1.12 },
];
/* Looks the visitor can choose between. Each is a preset over the same scene: the shading ramp, the rim
 * light, how much ink and what colour, colour and contrast in the grade, bloom, grain, a vignette, the
 * tone curve, and (for manga) a screentone that replaces colour with ink on paper while keeping the reds. */
const LOOKS = {
  anime: { ramp: 'cel', rim: 1, ink: 1, inkCol: [0.2, 0.13, 0.12], sat: 1, contrast: 0.16, bloom: 1, lift: 0, vig: 0, grain: 0.024, tone: 0, filmic: false },
  pastel: { ramp: 'pastel', rim: 1.1, ink: 0.6, inkCol: [0.46, 0.33, 0.3], sat: 0.8, contrast: 0, bloom: 1.5, lift: 0.16, vig: 0, grain: 0.02, tone: 0, filmic: false },
  manga: { ramp: 'cel', rim: 1, ink: 1.2, inkCol: [0.06, 0.06, 0.07], sat: 1, contrast: 0.3, bloom: 0.5, lift: 0, vig: 0, grain: 0.03, tone: 1, filmic: false },
  film: { ramp: 'soft', rim: 0.3, ink: 0, inkCol: [0.2, 0.13, 0.12], sat: 0.88, contrast: 0.34, bloom: 0.85, lift: 0, vig: 0.32, grain: 0.05, tone: 0, filmic: true },
};

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
let ANISO = 1;   // anisotropic filtering, set from the renderer in mount()
let A2C = false; // alpha-to-coverage on cut-out cards, when the scene target is multisampled
function finish(t, repeat) {
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = ANISO;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}
/* A drawn leaf: two flat greens split along the midrib, one highlight, ink veins and an ink outline. */
function leafTex() {
  const W = 256, H = 128;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  const shape = () => { g.beginPath(); g.moveTo(5, 64); g.bezierCurveTo(56, 2, 176, 6, 251, 64); g.bezierCurveTo(176, 122, 56, 126, 5, 64); g.closePath(); };
  shape(); g.fillStyle = '#3f9744'; g.fill();
  g.save(); shape(); g.clip();
  g.fillStyle = '#2a7239'; g.fillRect(0, 64, W, 64);
  g.fillStyle = '#74c95c'; g.beginPath(); g.ellipse(118, 35, 76, 12, -0.06, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#1c4f30'; g.lineCap = 'round';
  g.lineWidth = 3.5; g.beginPath(); g.moveTo(8, 64); g.lineTo(248, 64); g.stroke();
  g.lineWidth = 2;
  for (let i = 1; i < 7; i++) { const x = 20 + i * 30; g.beginPath(); g.moveTo(x, 64); g.quadraticCurveTo(x + 14, 46, x + 30, 32 + i * 2); g.moveTo(x, 64); g.quadraticCurveTo(x + 14, 82, x + 30, 96 - i * 2); g.stroke(); }
  g.restore();
  shape(); g.lineWidth = 6; g.strokeStyle = '#143d27'; g.stroke();
  return finish(new THREE.CanvasTexture(c));
}
/* The drying bed from above: flat-toned parchment beans, each with a highlight, an ink edge and its centre cut. */
function beanBedTex() {
  const S = 512;
  const c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d');
  g.fillStyle = '#5a4630'; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 2600; i++) {
    const x = rnd() * S, y = rnd() * S, a = rnd() * Math.PI;
    const l = 15 + rnd() * 6, w = 9 + rnd() * 3;
    g.save(); g.translate(x, y); g.rotate(a);
    const h = 34 + rnd() * 10, lt = 60 + rnd() * 16;
    g.fillStyle = `hsl(${h}, 46%, ${lt}%)`; g.beginPath(); g.ellipse(0, 0, l / 2, w / 2, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = `hsla(${h + 6}, 56%, ${Math.min(92, lt + 12)}%, 0.9)`; g.beginPath(); g.ellipse(-l * 0.1, -w * 0.17, l * 0.26, w * 0.13, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(74,44,18,0.85)'; g.lineWidth = 1.6; g.beginPath(); g.ellipse(0, 0, l / 2, w / 2, 0, 0, Math.PI * 2); g.stroke();
    g.lineWidth = 1.3; g.beginPath(); g.moveTo(-l / 2 + 3, 0); g.quadraticCurveTo(0, 2.2, l / 2 - 3, 0); g.stroke();
    g.restore();
  }
  return finish(new THREE.CanvasTexture(c), [3, 14]);
}
/* Wicker, drawn: rows of rounded strands passing over and under the stakes, each with an ink edge and a light top. */
function weaveTex() {
  const S = 256, row = 32, w = 64;
  const c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d');
  g.fillStyle = '#4a2f14'; g.fillRect(0, 0, S, S);
  for (let r = 0; r < S / row; r++) for (let k = -1; k < S / w + 1; k++) {
    const x = k * w + (r % 2 ? w / 2 : 0), y = r * row, lt = 44 + rnd() * 9;
    g.beginPath(); g.roundRect(x + 3, y + 3, w - 6, row - 6, 11);
    g.fillStyle = `hsl(33, 56%, ${lt}%)`; g.fill();
    g.lineWidth = 3; g.strokeStyle = '#3a220c'; g.stroke();
    g.beginPath(); g.roundRect(x + 10, y + 7, w - 20, 6, 3); g.fillStyle = `hsla(38, 70%, ${lt + 16}%, 0.85)`; g.fill();
  }
  return finish(new THREE.CanvasTexture(c), [20, 6]);
}

/* ------------------------------------------------------------ small helpers */
const rnd = (() => { let s = 20261101; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000; }; })();
const between = (a, b) => a + rnd() * (b - a);
function noise2(x, y) { return Math.sin(x * 1.7 + Math.sin(y * 0.9) * 2) * Math.cos(y * 1.3 + Math.sin(x * 0.7) * 2); }

function ellipsoidGeo(r = 0.5) { const g = new THREE.SphereGeometry(r, 10, 8); g.scale(1, 0.62, 0.52); return g; }
/* Only instances that move every frame (the roasting beans) need a dynamic buffer; the rest are uploaded once. */
function instanced(geo, mat, count, dynamic = false) { const m = new THREE.InstancedMesh(geo, mat, count); if (dynamic) m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); return m; }

/* Cel shading. Every surface is a toon material on one shared ramp: a shadow tone, a narrow mid band
 * and the lit tone, with soft (antialiased) steps between them. A rim light and, on glossy things, a
 * hard highlight are added in the fragment shader; `rim: 0` is for floors and walls, which would
 * otherwise glow at grazing angles. Shader patches (cel look, wind) compose, so one material can carry both. */
const RAMPS = {
  cel: (d) => 0.24 + 0.34 * smoothstep(d, -0.04, 0.04) + 0.42 * smoothstep(d, 0.3, 0.38),     // shadow, a narrow mid band, light
  pastel: (d) => 0.5 + 0.24 * smoothstep(d, -0.06, 0.06) + 0.26 * smoothstep(d, 0.3, 0.42),   // the same steps, shadows lifted
  soft: (d) => 0.08 + 0.92 * Math.pow(clamp(d * 0.5 + 0.5, 0, 1), 2),                         // no steps: a wrapped diffuse falloff
};
let rampTex = null;
function ramp() {
  if (!rampTex) {
    rampTex = new THREE.DataTexture(new Uint8Array(64), 64, 1, THREE.RedFormat);
    rampTex.minFilter = rampTex.magFilter = THREE.LinearFilter; setRamp('cel');
  }
  return rampTex;
}
/* Every toon material shares the one ramp texture, so rewriting it restyles the whole scene at once. */
function setRamp(kind) {
  const data = ramp().image.data, n = data.length;
  for (let i = 0; i < n; i++) data[i] = Math.round(255 * RAMPS[kind](((i + 0.5) / n) * 2 - 1));
  rampTex.needsUpdate = true;
}
const celU = { uRimK: { value: 1 } }; // scales every material's rim light (a look can soften or strengthen it)
const patches = new WeakMap();
function patch(mat, key, fn) {
  const list = patches.get(mat) || []; patches.set(mat, list); list.push([key, fn]);
  mat.onBeforeCompile = (shader) => list.forEach(([, f]) => f(shader));
  mat.customProgramCacheKey = () => list.map(([k]) => k).join('+');
  return mat;
}
function cel({ roughness = 1, metalness = 0, rim, spec, ...params }) {
  const glossy = metalness > 0.5 || roughness < 0.45;
  const mat = new THREE.MeshToonMaterial({ gradientMap: ramp(), ...params });
  if (A2C && params.alphaTest) mat.alphaToCoverage = true;
  const uRim = { value: rim ?? (glossy ? 0.6 : 0.24) }, uSpec = { value: spec ?? (glossy ? 1 : 0) };
  return patch(mat, 'cel', (shader) => {
    shader.uniforms.uRim = uRim; shader.uniforms.uSpec = uSpec; shader.uniforms.uRimK = celU.uRimK;
    shader.fragmentShader = 'uniform float uRim; uniform float uSpec; uniform float uRimK;\n' + shader.fragmentShader.replace('#include <opaque_fragment>', `
      vec3 celV = normalize(vViewPosition);
      float celF = 1.0 - saturate(dot(celV, normal));
      outgoingLight += uRim * uRimK * smoothstep(0.6, 0.74, celF) * (reflectedLight.indirectDiffuse * 1.3 + reflectedLight.directDiffuse * 0.5);
      #if NUM_DIR_LIGHTS > 0
        vec3 celH = normalize(directionalLights[0].direction + celV);
        outgoingLight += uSpec * smoothstep(0.994, 0.997, dot(celH, normal)) * directionalLights[0].color * 0.3;
      #endif
      #include <opaque_fragment>`);
  });
}

/* A ground that dissolves into the haze before its edges (in its own z), so a floor can stop short of
 * the neighbouring scene's floor without ever showing where it ends. */
function melt(mat, from, to) {
  return patch(mat, 'melt', (shader) => {
    shader.uniforms.uMelt = { value: new THREE.Vector2(from, to) };
    shader.vertexShader = 'varying float vMelt;\n' + shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  vMelt = position.z;');
    shader.fragmentShader = 'varying float vMelt; uniform vec2 uMelt;\n' + shader.fragmentShader.replace('#include <fog_fragment>', '#include <fog_fragment>\n  gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, smoothstep(uMelt.x, uMelt.y, abs(vMelt)));'); // abs per pixel: the plane has only four vertices
  });
}

/* Wind: a vertex-shader sway for leaf cards, phased by each instance's position so the foliage
 * ripples rather than nodding in unison. One shared uniform; costs nothing on the CPU. */
const windU = { uTime: { value: 0 }, uWind: { value: 0.045 } };
function windy(mat) {
  return patch(mat, 'wind', (shader) => {
    Object.assign(shader.uniforms, windU);
    shader.vertexShader = 'uniform float uTime; uniform float uWind;\n' + shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      float wph = 0.0;
      #ifdef USE_INSTANCING
        wph = instanceMatrix[3].x * 1.9 + instanceMatrix[3].z * 1.3 + instanceMatrix[3].y * 0.7;
      #endif
      float wsw = sin(uTime * 1.35 + wph) * 0.6 + sin(uTime * 2.4 + wph * 2.3) * 0.4;
      transformed.x += wsw * uWind * (0.35 + uv.y);
      transformed.y += sin(uTime * 1.9 + wph * 1.7) * uWind * 0.35 * uv.y;`);
  });
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
  g.add(new THREE.Mesh(gg, cel({ color: '#3d6f43', rim: 0 })));
  // volcano silhouette, soft-edged by fog
  const vg = new THREE.ConeGeometry(34, 22, 40, 6, true);
  const vp = vg.attributes.position;
  for (let i = 0; i < vp.count; i++) { const x = vp.getX(i), z = vp.getZ(i), y = vp.getY(i); const n = noise2(x * 0.15, z * 0.15) * (1 - Math.abs(y) / 13) * 1.6; vp.setX(i, x + n); vp.setZ(i, z + n); }
  vg.computeVertexNormals();
  const vol = new THREE.Mesh(vg, cel({ color: '#3b5863', rim: 0 })); vol.position.set(-16, 8.5, -56); g.add(vol);
  const vol2 = vol.clone(); vol2.scale.set(0.7, 0.55, 0.7); vol2.position.set(30, 4, -60); g.add(vol2);
  // coffee shrubs in rows (aisle at x = 0 for the camera)
  // an indexed sphere keeps smooth shading after the jitter (a polyhedron would shade flat)
  const sg = new THREE.SphereGeometry(0.7, tier === 'lite' ? 14 : 22, tier === 'lite' ? 10 : 15);
  const sp = sg.attributes.position; for (let i = 0; i < sp.count; i++) { const j = 1 + noise2(sp.getX(i) * 4, sp.getZ(i) * 4 + sp.getY(i) * 3) * 0.16; sp.setXYZ(i, sp.getX(i) * j, sp.getY(i) * j * 0.9, sp.getZ(i) * j); } sg.computeVertexNormals();
  const n = tier === 'lite' ? 520 : 1100;
  const shrubs = instanced(sg, cel({ color: '#ffffff', rim: 0.55 }), n);
  let k = 0;
  for (let row = -8; row < 8 && k < n; row++) {
    const x = (row + 0.5) * 3.6;
    for (let z = 14; z > -50 && k < n; z -= 1.4) {
      const s = between(0.75, 1.3);
      dummy.position.set(x + between(-0.35, 0.35), noise2(x * 0.05, z * 0.05) * 1.6 - 0.6 + s * 0.55, z + between(-0.3, 0.3));
      dummy.scale.set(s, s * between(0.9, 1.25), s); dummy.rotation.y = rnd() * 6.28; dummy.updateMatrix();
      shrubs.setMatrixAt(k, dummy.matrix);
      shrubs.setColorAt(k, col.set('#3c8a48').offsetHSL(between(-0.03, 0.04), between(-0.1, 0.1), between(-0.08, 0.08)));
      k++;
    }
  }
  shrubs.count = k; g.add(shrubs);
  // leaf cards on the shrubs nearest the aisle, so the near foliage reads as leaves rather than blobs
  const nearRows = [];
  for (let i = 0; i < k; i++) { shrubs.getMatrixAt(i, dummy.matrix); dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale); if (Math.abs(dummy.position.x) < 6.5 && dummy.position.z > -34) nearRows.push([dummy.position.x, dummy.position.y, dummy.position.z, dummy.scale.x]); }
  const perShrub = tier === 'lite' ? 18 : 48;
  const leafCards = instanced(new THREE.PlaneGeometry(0.46, 0.22), windy(cel({ map: leafTex(), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.85 })), nearRows.length * perShrub);
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
  const cg = new THREE.SphereGeometry(0.06, 8, 6);
  const cherries = instanced(cg, cel({ color: '#c4322c', roughness: 0.4 }), tier === 'lite' ? 500 : 1400);
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
  g.add(new THREE.Mesh(gg, cel({ color: '#938668', rim: 0 })));
  // the branch
  const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(-4.5, 1.15, 0.9), new THREE.Vector3(-1.6, 1.5, 0.1), new THREE.Vector3(1.4, 1.78, -0.4), new THREE.Vector3(4.2, 1.55, -1.3)]);
  g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 0.07, 8, false), cel({ color: '#4a3524', roughness: 0.9 })));
  const twig = new THREE.CatmullRomCurve3([new THREE.Vector3(0.4, 1.7, -0.3), new THREE.Vector3(0.9, 2.3, 0.3), new THREE.Vector3(1.6, 2.9, 0.8)]);
  g.add(new THREE.Mesh(new THREE.TubeGeometry(twig, 16, 0.035, 6, false), cel({ color: '#4a3524', roughness: 0.9 })));
  // cherries clustered at nodes
  const nodes = 9, per = tier === 'lite' ? 10 : 16;
  const cherries = instanced(new THREE.SphereGeometry(0.09, 14, 10), cel({ color: '#c62e2a', roughness: 0.35 }), nodes * per);
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
  const leaves = instanced(new THREE.PlaneGeometry(0.62, 0.3), windy(cel({ map: lt, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.8 })), 70);
  for (let i = 0; i < 70; i++) {
    const p = curve.getPointAt(rnd());
    dummy.position.set(p.x + between(-0.2, 0.2), p.y + between(-0.15, 0.3), p.z + between(-0.3, 0.3));
    dummy.rotation.set(between(-0.6, 0.6), rnd() * 6.28, between(-0.9, 0.9)); dummy.scale.setScalar(between(0.8, 1.3)); dummy.updateMatrix(); leaves.setMatrixAt(i, dummy.matrix);
  }
  g.add(leaves);
  // the tree the branch belongs to: trunk, two more branches and a leaf canopy
  const bark = cel({ color: '#4a3524', roughness: 0.9 });
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
  const basket = new THREE.Mesh(new THREE.LatheGeometry(prof, 72), cel({ map: weaveTex(), roughness: 0.95, side: THREE.DoubleSide }));
  basket.position.set(1.7, 0.02, 0.9); g.add(basket);
  const inBasket = instanced(new THREE.SphereGeometry(0.085, 8, 7), cel({ color: '#b8231f', roughness: 0.35 }), 170);
  for (let i = 0; i < 170; i++) {
    const a = rnd() * 6.28, r = Math.sqrt(rnd()) * 0.62;
    dummy.position.set(1.7 + Math.cos(a) * r, 0.78 + between(0, 0.18) + (0.62 - r) * 0.12, 0.9 + Math.sin(a) * r);
    dummy.scale.setScalar(1); dummy.updateMatrix(); inBasket.setMatrixAt(i, dummy.matrix);
    inBasket.setColorAt(i, col.set(rnd() < 0.85 ? '#b8231f' : '#d9542c').offsetHSL(0, 0, between(-0.08, 0.06)));
  }
  g.add(inBasket);
  // background shrubs
  const sg = new THREE.SphereGeometry(0.9, 20, 14);
  const sgp = sg.attributes.position; for (let i = 0; i < sgp.count; i++) { const j = 1 + noise2(sgp.getX(i) * 3, sgp.getZ(i) * 3) * 0.14; sgp.setXYZ(i, sgp.getX(i) * j, sgp.getY(i) * j * 0.85, sgp.getZ(i) * j); } sg.computeVertexNormals();
  const shrubs = instanced(sg, cel({ color: '#ffffff', rim: 0.4 }), 160);
  for (let i = 0; i < 160; i++) {
    const a = rnd() * 3.14, r = between(6, 18);
    dummy.position.set(Math.cos(a) * r * 1.5, 0.55, -4 - Math.sin(a) * r); dummy.scale.set(between(0.8, 1.6), between(0.7, 1.3), between(0.8, 1.6)); dummy.rotation.y = rnd() * 6; dummy.updateMatrix(); shrubs.setMatrixAt(i, dummy.matrix);
    shrubs.setColorAt(i, col.set('#3a8443').offsetHSL(between(-0.03, 0.03), between(-0.12, 0.05), between(-0.14, 0.04)));
  }
  g.add(shrubs);
  // motes drifting through the light under the canopy
  const motes = points(tier === 'lite' ? 30 : 70, 0.075, '#fff3c2', 0.85, softDot(64, 0.05), THREE.AdditiveBlending);
  const mo = motes.geometry.attributes.position; for (let i = 0; i < mo.count; i++) mo.setXYZ(i, between(-4, 4), between(0.4, 3.4), between(-2.5, 4));
  g.add(motes); g.userData.motes = motes;
  return g;
}

function buildMill(tier) {
  const g = new THREE.Group();
  // the yard is wide but keeps to its own stretch of the journey: the harvest's and the roastery's floors lie just beyond it
  const yard = new THREE.Mesh(new THREE.PlaneGeometry(320, 67).rotateX(-Math.PI / 2), melt(cel({ color: '#b9a17a', rim: 0 }), 23, 33));
  yard.position.z = -5.5; g.add(yard);
  // green hills beyond the yard, off to the sides of the camera's way out
  const hill = new THREE.ConeGeometry(1, 1, 28, 3);
  const hillMat = cel({ color: '#5f9a5c', rim: 0 });
  [[46, -32, 22, 9], [72, -8, 28, 12], [-46, -34, 22, 10], [-70, -6, 30, 13]].forEach(([x, z, r, h]) => { const m = new THREE.Mesh(hill, hillMat); m.scale.set(r, h, r); m.position.set(x, h / 2 - 0.4, z); g.add(m); });
  const wood = cel({ color: '#6b5236', roughness: 0.9 });
  const mesh = cel({ map: beanBedTex(), rim: 0, side: THREE.DoubleSide });
  const beans = instanced(ellipsoidGeo(0.03), cel({ color: '#ffffff', rim: 0 }), tier === 'lite' ? 3000 : 7000);
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
      beans.setColorAt(k, col.set('#d9b987').offsetHSL(between(-0.02, 0.02), between(-0.1, 0.05), between(-0.12, 0.06)));
      k++;
    }
  });
  g.add(beans);
  // shade cloth roof
  const roof = new THREE.Mesh(new THREE.PlaneGeometry(24, 18, 12, 12), cel({ color: '#f4efe4', emissive: '#e9e0cc', emissiveIntensity: 0.35, rim: 0, transparent: true, opacity: 0.66, side: THREE.DoubleSide }));
  const rp = roof.geometry.attributes.position; for (let i = 0; i < rp.count; i++) rp.setZ(i, Math.sin(rp.getX(i) * 0.9) * 0.25);
  roof.geometry.computeVertexNormals(); roof.rotation.x = -Math.PI / 2; roof.position.set(0, 3.6, -1); g.add(roof);
  [[-11, -9.5], [-11, 7.5], [11, -9.5], [11, 7.5], [0, -9.5], [0, 7.5]].forEach(([x, z]) => { const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 3.6, 0.12), wood); post.position.set(x, 1.8, z); g.add(post); });
  // water channel with a simple ripple shader
  const water = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 40, 1, 60).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } }, transparent: true,
    vertexShader: 'uniform float uTime; varying vec2 vUv; void main(){ vUv = uv; vec3 p = position; p.y += sin(uv.y*60.0 + uTime*1.5)*0.012; gl_Position = projectionMatrix*modelViewMatrix*vec4(p,1.0); }',
    // two flat tones and a white glint, like water painted on a cel (colours authored in sRGB, written out linear)
    fragmentShader: `uniform float uTime; varying vec2 vUv;
      void main(){ float r = 0.5+0.5*sin(vUv.y*80.0 - uTime*2.2 + sin(vUv.x*12.0)*2.0);
        vec3 c = mix(vec3(0.20,0.47,0.56), vec3(0.40,0.67,0.74), smoothstep(0.42, 0.48, r));
        c = mix(c, vec3(0.93,0.99,1.0), smoothstep(0.92, 0.95, r));
        gl_FragColor = vec4(pow(c, vec3(2.2)), 0.9);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  }));
  water.position.set(10.5, 0.02, -1); g.add(water); g.userData.water = water;
  const edge = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.2, 40), cel({ color: '#8d867a' })); edge.position.set(9.7, 0.1, -1); g.add(edge); const edge2 = edge.clone(); edge2.position.x = 11.3; g.add(edge2);
  return g;
}

function buildRoast(tier) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.PlaneGeometry(60, 60).rotateX(-Math.PI / 2), cel({ color: '#17110d', roughness: 0.9, rim: 0 })));
  // a wall wide and tall enough to fill the view on the approach, so the roastery reads as an interior and not a glowing slab in the fog
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(120, 44), cel({ color: '#1e1512', roughness: 1, rim: 0 })); wall.position.set(0, 18, -12); g.add(wall);
  const metal = cel({ color: '#2a2420', metalness: 0.78, roughness: 0.38 });
  const brass = cel({ color: '#b8894a', metalness: 0.9, roughness: 0.28 });
  // drum, open towards +z
  const drum = new THREE.Group(); drum.position.set(0, 1.6, 0);
  const shell = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, 3.2, 80, 1, true), cel({ color: '#2a2420', metalness: 0.78, roughness: 0.38, side: THREE.DoubleSide }));
  shell.rotation.x = Math.PI / 2; drum.add(shell);
  const back = new THREE.Mesh(new THREE.CircleGeometry(1.25, 80), metal); back.position.z = -1.6; drum.add(back);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.27, 0.06, 12, 96), brass); ring.position.z = 1.6; drum.add(ring);
  const ring2 = ring.clone(); ring2.position.z = -1.6; drum.add(ring2);
  for (let i = 0; i < 8; i++) { const rib = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 3.1), cel({ color: '#3a322c', metalness: 0.7, roughness: 0.5 })); const a = i / 8 * Math.PI * 2; rib.position.set(Math.cos(a) * 1.17, Math.sin(a) * 1.17, 0); rib.rotation.z = a; drum.add(rib); }
  g.add(drum); g.userData.drum = drum;
  // stand and hopper
  const stand = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.9, 3.6), metal); stand.position.set(0, 0.45, 0); g.add(stand);
  const hopper = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.7, 24, 1, true), cel({ color: '#2a2420', metalness: 0.78, roughness: 0.38, side: THREE.DoubleSide })); hopper.rotation.x = Math.PI; hopper.position.set(0, 3.3, -0.4); g.add(hopper);
  const chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 4, 16), metal); chimney.position.set(-0.6, 4.6, -1.2); g.add(chimney);
  // burner glow
  const burner = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 2.8).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ff5a1a', transparent: true, opacity: 0.0 }));
  burner.material.color.multiplyScalar(2.4); // brighter than white, so the bloom catches it
  burner.position.set(0, 0.92, 0); g.add(burner); g.userData.burner = burner;
  const fire = new THREE.PointLight('#ff7a2f', 0, 9, 1.6); fire.position.set(0, 1.0, 0.9); g.add(fire); g.userData.fire = fire;
  const glow = new THREE.PointLight('#ff9a4a', 0, 6, 2); glow.position.set(0, 1.6, 1.4); g.add(glow); g.userData.glow = glow;
  // beans inside
  const n = tier === 'lite' ? 260 : 520;
  const beans = instanced(ellipsoidGeo(0.1), cel({ color: '#8c6a3c', roughness: 0.7 }), n, true);
  const seeds = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { seeds[i * 3] = between(Math.PI * 0.62, Math.PI * 1.38); seeds[i * 3 + 1] = between(0.25, 0.95); seeds[i * 3 + 2] = between(-1.35, 1.35); }
  for (let i = 0; i < n; i++) { dummy.position.set(0, 1.2, 0); dummy.updateMatrix(); beans.setMatrixAt(i, dummy.matrix); beans.setColorAt(i, col.set('#b89a68')); }
  g.add(beans); g.userData.beans = beans; g.userData.seeds = seeds;
  // smoke
  const smoke = points(tier === 'lite' ? 40 : 90, 1.6, '#c9b8a8', 0.12, softDot());
  const sp = smoke.geometry.attributes.position; for (let i = 0; i < sp.count; i++) sp.setXYZ(i, between(-0.6, 0.6), between(2, 6), between(-1.4, 0.4));
  g.add(smoke); g.userData.smoke = smoke;
  // a window high on the back wall, the shaft of late light it throws across the room, and the pool where it lands
  // (unfogged, and faded in by animate() on arrival, so it reads as light through the roastery's own smoke)
  const wc = document.createElement('canvas'); wc.width = 128; wc.height = 176;
  const wg = wc.getContext('2d');
  const wgr = wg.createLinearGradient(0, 0, 0, 176); wgr.addColorStop(0, '#ffe6b8'); wgr.addColorStop(1, '#ffb25c'); wg.fillStyle = wgr; wg.fillRect(0, 0, 128, 176);
  wg.fillStyle = '#1c100a'; [[0, 0, 128, 8], [0, 168, 128, 8], [0, 0, 8, 176], [120, 0, 8, 176], [60, 0, 8, 176], [0, 84, 128, 8]].forEach((r) => wg.fillRect(...r));
  const pane = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 3.5), new THREE.MeshBasicMaterial({ map: finish(new THREE.CanvasTexture(wc)), transparent: true, opacity: 0, fog: false }));
  pane.material.color.multiplyScalar(1.7); pane.position.set(-13.5, 4.4, -11.95); g.add(pane);
  // the shaft is a stack of soft-edged sheets running from the window down to the floor; added together they read as a volume
  const sc = document.createElement('canvas'); sc.width = sc.height = 64;
  const sg2 = sc.getContext('2d');
  const across = sg2.createLinearGradient(0, 0, 64, 0); across.addColorStop(0, 'rgba(255,255,255,0)'); across.addColorStop(0.3, 'rgba(255,255,255,1)'); across.addColorStop(0.7, 'rgba(255,255,255,1)'); across.addColorStop(1, 'rgba(255,255,255,0)');
  sg2.fillStyle = across; sg2.fillRect(0, 0, 64, 64);
  const along = sg2.createLinearGradient(0, 0, 0, 64); along.addColorStop(0, 'rgba(0,0,0,1)'); along.addColorStop(0.75, 'rgba(0,0,0,0.25)'); along.addColorStop(1, 'rgba(0,0,0,0)');
  sg2.globalCompositeOperation = 'destination-in'; sg2.fillStyle = along; sg2.fillRect(0, 0, 64, 64);
  const lightDir = new THREE.Vector3(0.6, -0.66, 0.45).normalize();
  const shaftPos = [], shaftUv = [], sheets = 7;
  for (let k = 0; k < sheets; k++) {
    const y = 2.7 + (k / (sheets - 1)) * 3.4, reach = y / -lightDir.y;
    const a = new THREE.Vector3(-15, y, -11.9), b = new THREE.Vector3(-12, y, -11.9);
    const c2 = b.clone().addScaledVector(lightDir, reach), d2 = a.clone().addScaledVector(lightDir, reach);
    [[a, 0, 1], [b, 1, 1], [c2, 1, 0], [a, 0, 1], [c2, 1, 0], [d2, 0, 0]].forEach(([v, u, w]) => { shaftPos.push(v.x, v.y, v.z); shaftUv.push(u, w); });
  }
  const shaftGeo = new THREE.BufferGeometry();
  shaftGeo.setAttribute('position', new THREE.Float32BufferAttribute(shaftPos, 3)); shaftGeo.setAttribute('uv', new THREE.Float32BufferAttribute(shaftUv, 2));
  const shaft = new THREE.Mesh(shaftGeo, new THREE.MeshBasicMaterial({ map: finish(new THREE.CanvasTexture(sc)), color: '#ffb46a', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
  g.add(shaft);
  const pool = new THREE.Mesh(new THREE.CircleGeometry(1, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: softDot(128, 0.1), color: '#ffb46a', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  pool.scale.set(3.6, 1, 2.8); pool.position.set(-13.5 + lightDir.x * (4.4 / -lightDir.y), 0.02, -11.9 + lightDir.z * (4.4 / -lightDir.y)); g.add(pool);
  g.userData.daylight = [[pane.material, 1], [shaft.material, 0.12], [pool.material, 0.45]];
  // embers lifting off the burner
  const embers = points(tier === 'lite' ? 20 : 46, 0.06, '#ff9a3c', 0.9, softDot(64, 0.05), THREE.AdditiveBlending);
  embers.material.color.multiplyScalar(2.5);
  const ep = embers.geometry.attributes.position; for (let i = 0; i < ep.count; i++) ep.setXYZ(i, between(-0.9, 0.9), between(0.95, 3.4), between(0.5, 2.1));
  g.add(embers); g.userData.embers = embers;
  // sacks in the corner
  const sack = new THREE.Mesh(new THREE.SphereGeometry(0.6, 16, 12).scale(1, 1.25, 0.8), cel({ color: '#9a8766', roughness: 1 }));
  [[-4, 0.7, -3], [-3.2, 0.7, -4.2], [-4.6, 1.9, -3.6]].forEach(([x, y, z]) => { const s = sack.clone(); s.position.set(x, y, z); s.rotation.y = rnd() * 2; g.add(s); });
  return g;
}

function buildBrew(tier) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.PlaneGeometry(40, 40).rotateX(-Math.PI / 2), cel({ color: '#17100b', roughness: 1, rim: 0 })));
  const table = new THREE.Mesh(new THREE.BoxGeometry(4, 0.08, 2.2), cel({ color: '#3b2a1f', roughness: 0.65, rim: 0 })); table.position.y = 0.76; g.add(table);
  const ceramic = cel({ color: '#f0e7da', roughness: 0.35 });
  const glass = new THREE.MeshPhysicalMaterial({ color: '#dfe8ea', roughness: 0.05, metalness: 0, transparent: true, opacity: 0.26, side: THREE.DoubleSide });
  const carafe = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.44, 0], [0.5, 0.25], [0.46, 0.42], [0.3, 0.5], [0.3, 0.56], [0.0, 0.56]].map(([x, y]) => new THREE.Vector2(x, y)), 72), glass);
  carafe.position.y = 0.8; g.add(carafe);
  const coffee = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.34, 32), cel({ color: '#2a140a', roughness: 0.3 })); coffee.position.y = 0.8 + 0.17; coffee.scale.y = 0.001; g.add(coffee); g.userData.coffee = coffee;
  const dripper = new THREE.Mesh(new THREE.LatheGeometry([[0.08, 0], [0.12, 0.06], [0.42, 0.36], [0.46, 0.38], [0.4, 0.38], [0.1, 0.1], [0.06, 0.1]].map(([x, y]) => new THREE.Vector2(x, y)), 72), cel({ color: '#f0e7da', roughness: 0.35, side: THREE.DoubleSide }));
  dripper.position.y = 1.36; g.add(dripper);
  const bed = new THREE.Mesh(new THREE.CircleGeometry(0.3, 32).rotateX(-Math.PI / 2), cel({ color: '#3b2314', roughness: 0.95 })); bed.position.y = 1.36 + 0.24; g.add(bed); g.userData.bed = bed;
  // kettle
  const kettle = new THREE.Group(); kettle.position.set(1.35, 0.8, 0.35);
  const body = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.5, 0], [0.52, 0.3], [0.4, 0.55], [0.14, 0.62], [0.14, 0.7], [0, 0.7]].map(([x, y]) => new THREE.Vector2(x, y)), 72), cel({ color: '#1b1b1d', metalness: 0.6, roughness: 0.45 }));
  kettle.add(body);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.035, 8, 24, Math.PI), cel({ color: '#3b2a1f', roughness: 0.7 })); handle.position.set(0, 0.62, 0); handle.rotation.y = Math.PI / 2; kettle.add(handle);
  g.add(kettle);
  const neck = new THREE.CatmullRomCurve3([new THREE.Vector3(0.95, 1.15, 0.35), new THREE.Vector3(0.7, 1.55, 0.2), new THREE.Vector3(0.4, 1.92, 0.08), new THREE.Vector3(0.16, 1.9, 0.02)]);
  g.add(new THREE.Mesh(new THREE.TubeGeometry(neck, 24, 0.035, 8, false), cel({ color: '#1b1b1d', metalness: 0.6, roughness: 0.45 })));
  const stream = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.016, 0.3, 8), new THREE.MeshPhysicalMaterial({ color: '#cfe3e8', transparent: true, opacity: 0.55, roughness: 0.05 }));
  stream.position.set(0.12, 1.9 - 0.15, 0.02); stream.scale.y = 0.001; g.add(stream); g.userData.stream = stream;
  const steam = points(tier === 'lite' ? 30 : 60, 0.3, '#ffffff', 0.06, softDot());
  const sp = steam.geometry.attributes.position; for (let i = 0; i < sp.count; i++) sp.setXYZ(i, between(-0.3, 0.3), between(1.75, 2.6), between(-0.3, 0.3));
  g.add(steam); g.userData.steam = steam;
  // a scale and a jar
  const scale = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.05, 0.6), cel({ color: '#222', roughness: 0.6, rim: 0 })); scale.position.set(0, 0.805, 0); g.add(scale);
  const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.5, 24), glass); jar.position.set(-1.3, 1.05, -0.4); g.add(jar);
  const jarBeans = instanced(ellipsoidGeo(0.05), cel({ color: '#3a2112', roughness: 0.7 }), 120);
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
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 12), new THREE.MeshBasicMaterial({ color: '#fff3dc' }));
  bulb.material.color.multiplyScalar(6); lamp.add(bulb);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDot(128), color, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.scale.setScalar(haloSize); lamp.add(halo);
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.2, 24, 1, true), cel({ color: '#1b1512', roughness: 0.6, metalness: 0.4, side: THREE.DoubleSide }));
  shade.position.y = 0.12; lamp.add(shade);
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 2.6, 6), cel({ color: '#111' })); cord.position.y = 1.5; lamp.add(cord);
  return lamp;
}

function buildCup(tier) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.PlaneGeometry(30, 30).rotateX(-Math.PI / 2), cel({ color: '#0c0806', roughness: 1, rim: 0 })));
  const table = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 0.06, 96), cel({ color: '#2b1c13', roughness: 0.55, rim: 0 })); table.position.y = 0.77; g.add(table);
  const ceramic = cel({ color: '#f3ece2', roughness: 0.3, side: THREE.DoubleSide });
  const saucer = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.26, 0], [0.5, 0.04], [0.55, 0.07], [0.53, 0.08], [0.26, 0.025], [0, 0.025]].map(([x, y]) => new THREE.Vector2(x, y)), 96), ceramic); saucer.position.y = 0.8; g.add(saucer);
  const cup = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.24, 0], [0.27, 0.03], [0.33, 0.2], [0.36, 0.32], [0.34, 0.32], [0.31, 0.2], [0.25, 0.04], [0, 0.04]].map(([x, y]) => new THREE.Vector2(x, y)), 96), ceramic); cup.position.y = 0.84; g.add(cup);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.026, 14, 40, Math.PI), ceramic); handle.position.set(0.31, 1.0, 0); handle.rotation.set(0, 0, -Math.PI / 2); g.add(handle);
  // crema surface
  const crema = new THREE.Mesh(new THREE.CircleGeometry(0.315, 96).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uP: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv - 0.5; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: `uniform float uTime; uniform float uP; varying vec2 vUv;
      void main(){ float r = length(vUv)*2.0; float a = atan(vUv.y, vUv.x);
        float sw = sin(r*34.0 - a*1.5 + uTime*0.2 + sin(a*4.0 + r*9.0 + uTime*0.08)*1.1)*0.5+0.5;
        float fine = sin(r*90.0 + a*7.0 - uTime*0.15)*0.5+0.5;
        float rim = smoothstep(0.84, 1.0, r);
        vec3 crema = vec3(0.80,0.60,0.34); vec3 dark = vec3(0.30,0.16,0.07); vec3 edge = vec3(0.62,0.42,0.22);
        float v = (0.35 + sw*0.3 + fine*0.12) * 5.0; v = (floor(v) + smoothstep(0.42, 0.58, fract(v))) / 5.0;
        vec3 c = mix(dark, crema, v); c = mix(c, edge, rim);
        float spec = pow(max(0.0, 1.0 - length(vUv - vec2(0.18,-0.22))*4.0), 6.0)*0.35;
        gl_FragColor = vec4(pow(c + spec, vec3(2.2)), 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  }));
  crema.position.y = 0.84 + 0.29; g.add(crema); g.userData.crema = crema;
  const steam = points(tier === 'lite' ? 26 : 50, 0.3, '#ffffff', 0.07, softDot());
  const sp = steam.geometry.attributes.position; for (let i = 0; i < sp.count; i++) sp.setXYZ(i, between(-0.15, 0.15), between(1.2, 2.0), between(-0.15, 0.15));
  g.add(steam); g.userData.steam = steam;
  const spot = new THREE.SpotLight('#ffe3bd', 24, 9, 0.55, 0.7, 1.6); spot.position.set(0.4, 4.2, 0.8); spot.target.position.set(0, 0.9, 0); g.add(spot); g.add(spot.target);
  g.add(practical(0.4, 3.3, 0.8, '#ffe3bd', 3.2));
  // a few beans on the table
  const beans = instanced(ellipsoidGeo(0.022), cel({ color: '#3a2112', roughness: 0.7 }), 14);
  for (let i = 0; i < 14; i++) { const a = rnd() * 6.28, r = between(0.75, 1.3); dummy.position.set(Math.cos(a) * r, 0.83, Math.sin(a) * r); dummy.rotation.set(0, rnd() * 6, 0); dummy.scale.setScalar(1); dummy.updateMatrix(); beans.setMatrixAt(i, dummy.matrix); }
  g.add(beans);
  return g;
}

/* ------------------------------------------------------------------- sky
 * A painted sky: horizon-to-zenith gradient, a sun with its glow where the sun is in frame, and
 * cumulus drawn from warped noise with a crisp edge, a lit side and a shaded side. */
const SKY_FRAG = `
uniform vec3 uTop; uniform vec3 uBottom; uniform vec3 uSunDir; uniform vec3 uSunCol; uniform vec3 uCloudLit; uniform vec3 uCloudShade;
uniform float uCloud; uniform float uDisc; uniform float uTime; uniform float uHaze;
varying vec3 vDir;
float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise(vec2 p){ vec2 i = floor(p); vec2 f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y); }
float fbm(vec2 p){ float a = 0.5; float s = 0.0; for (int i = 0; i < OCT; i++) { s += a * vnoise(p); p = p * 2.03 + vec2(17.1, 9.2); a *= 0.5; } return s; }
void main(){
  vec3 d = normalize(vDir);
  float up = clamp(d.y, 0.0, 1.0);
  vec3 col = mix(uBottom, uTop, pow(smoothstep(0.0, 0.62, up), 0.75));
  float sd = max(dot(d, normalize(uSunDir)), 0.0);
  // the sun's glow on the haze, then the disc itself (brighter than white: the bloom and the shafts feed on it)
  col += uSunCol * (pow(sd, 6.0) * 0.22 + pow(sd, 48.0) * 0.5) * uDisc;
  col += uSunCol * smoothstep(0.99925, 0.9996, sd) * 9.0 * uDisc;
  if (uCloud > 0.01 && d.y > 0.0) {
    vec2 uv = d.xz / (d.y + 0.16) * 0.62 + vec2(uTime * 0.004, uTime * 0.0015);
    vec2 warp = (vec2(fbm(uv * 0.7 + 3.1), fbm(uv * 0.7 + 11.7)) - 0.5) * 0.9;
    float n = fbm(uv + warp);
    float th = mix(0.78, 0.5, uCloud);
    float m = smoothstep(th, th + 0.035, n);
    vec2 L = normalize(uSunDir.xz + vec2(0.0001)) * 0.16;
    float lit = smoothstep(-0.015, 0.035, n - fbm(uv + L + warp));
    float core = smoothstep(th + 0.07, th + 0.16, n);
    vec3 cc = mix(uCloudShade, uCloudLit, lit);
    cc = mix(cc, mix(uCloudShade, uCloudLit, 0.55), core * (1.0 - lit) * 0.6);
    cc += uSunCol * pow(sd, 12.0) * 0.6 * uDisc;
    col = mix(col, cc, m * smoothstep(0.1, 0.34, d.y));
    // cumulus standing on the horizon: where they stand, how tall, and a knobbly outline
    vec2 hp = normalize(d.xz + vec2(0.00001)) * 2.2;
    float tower = fbm(hp + vec2(2.3, 7.7));
    float billow = fbm(hp * 4.0 + vec2(d.y * 7.0, -d.y * 5.0) + 1.7);
    float topEl = (smoothstep(0.36, 0.7, tower) * 0.36 + 0.03) * uCloud + (billow - 0.5) * 0.09;
    float hm = smoothstep(0.0, 0.012, topEl - d.y) * smoothstep(-0.01, 0.03, d.y);
    float hl = smoothstep(0.3, 0.8, d.y / max(topEl, 0.001) + (billow - 0.5) * 1.1);
    vec3 hc = mix(mix(uBottom, uCloudShade, 0.6), uCloudLit, hl) + uSunCol * pow(sd, 12.0) * 0.5 * uDisc;
    col = mix(col, hc, hm * 0.94);
  }
  gl_FragColor = vec4(mix(col, uBottom, uHaze), 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

/* ------------------------------------------------------------- post pass
 * The scene is drawn into a half-float target (multisampled on the full tier) with a depth texture and
 * then composited on one triangle: ink lines where depth breaks, a soft bloom built on a small mip
 * chain, light shafts marched toward the sun over the sky's bright pixels, then tone mapping, a gentle
 * grade and a little grain. */
const POST_VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
const PRE_FRAG = `uniform sampler2D t; uniform vec2 uTexel; varying vec2 vUv;
void main(){
  vec3 c = texture2D(t, vUv + uTexel * vec2(-1.0, -1.0)).rgb + texture2D(t, vUv + uTexel * vec2(1.0, -1.0)).rgb
         + texture2D(t, vUv + uTexel * vec2(-1.0, 1.0)).rgb + texture2D(t, vUv + uTexel * vec2(1.0, 1.0)).rgb;
  c = min(c * 0.25, vec3(10.0));
  float br = max(c.r, max(c.g, c.b));
  gl_FragColor = vec4(c * smoothstep(0.55, 1.25, br), 1.0);
}`;
const DOWN_FRAG = `uniform sampler2D t; uniform vec2 uTexel; varying vec2 vUv;
void main(){
  vec3 c = texture2D(t, vUv).rgb * 4.0;
  c += texture2D(t, vUv + uTexel * vec2(-1.0, -1.0)).rgb + texture2D(t, vUv + uTexel * vec2(1.0, -1.0)).rgb
     + texture2D(t, vUv + uTexel * vec2(-1.0, 1.0)).rgb + texture2D(t, vUv + uTexel * vec2(1.0, 1.0)).rgb;
  gl_FragColor = vec4(c / 8.0, 1.0);
}`;
/* the upsample is a little wider than tall, which gives highlights a faint anamorphic stretch */
const UP_FRAG = `uniform sampler2D t; uniform vec2 uTexel; varying vec2 vUv;
void main(){
  vec2 o = uTexel * vec2(1.5, 1.0);
  vec3 c = texture2D(t, vUv + o * vec2(-2.0, 0.0)).rgb + texture2D(t, vUv + o * vec2(2.0, 0.0)).rgb
         + texture2D(t, vUv + o * vec2(0.0, -2.0)).rgb + texture2D(t, vUv + o * vec2(0.0, 2.0)).rgb;
  c += (texture2D(t, vUv + o * vec2(-1.0, 1.0)).rgb + texture2D(t, vUv + o * vec2(1.0, 1.0)).rgb
      + texture2D(t, vUv + o * vec2(-1.0, -1.0)).rgb + texture2D(t, vUv + o * vec2(1.0, -1.0)).rgb) * 2.0;
  gl_FragColor = vec4(c / 12.0, 1.0);
}`;
const RAYS_FRAG = `uniform sampler2D tScene; uniform sampler2D tDepth; uniform vec2 uSun; uniform float uAmt; varying vec2 vUv;
float ign(vec2 p){ return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }
void main(){
  vec2 delta = uSun - vUv;
  vec2 stp = delta * (0.92 / 24.0);
  vec2 uv = vUv + stp * ign(gl_FragCoord.xy);
  vec3 acc = vec3(0.0); float w = 1.0;
  for (int i = 0; i < 24; i++) {
    vec3 c = min(texture2D(tScene, uv).rgb, vec3(10.0));
    float open = step(0.999995, texture2D(tDepth, uv).x);       // only the sky lets light through
    acc += c * open * smoothstep(1.1, 2.6, max(c.r, max(c.g, c.b))) * w;
    w *= 0.955; uv += stp;
  }
  gl_FragColor = vec4(acc / 24.0 * smoothstep(1.0, 0.05, length(delta)) * uAmt * 0.6, 1.0);
}`;
const COMP_FRAG = `uniform sampler2D tScene; uniform sampler2D tDepth; uniform sampler2D tBloom; uniform sampler2D tRays;
uniform vec2 uTexel; uniform vec3 uInkCol;
uniform float uNear; uniform float uFar; uniform float uFogDens; uniform float uInk; uniform float uLine;
uniform float uBloom; uniform float uSat; uniform float uExposure; uniform float uTime; uniform float uGrain;
uniform float uContrast; uniform float uLift; uniform float uVig; uniform float uTone; uniform float uDot;
varying vec2 vUv;
float lin(float d){ return uNear * uFar / (uFar - d * (uFar - uNear)); }
void main(){
  vec3 c = texture2D(tScene, vUv).rgb;
  // ink: the second difference of the depth buffer is zero across any flat surface and jumps at a
  // silhouette; scaled by distance it reads as "how far, relatively, does depth break here"
  vec2 o = uTexel * uLine;
  float d0 = texture2D(tDepth, vUv).x;
  float dl = texture2D(tDepth, vUv - vec2(o.x, 0.0)).x; float dr = texture2D(tDepth, vUv + vec2(o.x, 0.0)).x;
  float dd = texture2D(tDepth, vUv - vec2(0.0, o.y)).x; float du = texture2D(tDepth, vUv + vec2(0.0, o.y)).x;
  float z = lin(min(d0, min(min(dl, dr), min(dd, du))));
  float brk = (abs(dl + dr - 2.0 * d0) + abs(dd + du - 2.0 * d0)) * z / uNear;
  float fogv = exp(-uFogDens * uFogDens * z * z * 3.2);         // lines dissolve into the haze with distance
  float ink = min(smoothstep(0.016, 0.045, brk) * fogv * uInk, 1.0);
  c = mix(c, c * uInkCol, ink);
  c += texture2D(tBloom, vUv).rgb * uBloom + texture2D(tRays, vUv).rgb;
  c *= uExposure;
  #ifdef TONE_MAPPING
    c = toneMapping(c);
  #endif
  // grade: colour, shoulder (a negative uContrast flattens instead), warm lights and cool shadows by
  // multiplying so black stays black, an optional lift toward warm paper, an optional vignette
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c = mix(vec3(l), c, uSat);
  c = mix(c, c * c * (3.0 - 2.0 * c), uContrast);
  c *= mix(vec3(0.95, 1.0, 1.07), vec3(1.0), smoothstep(0.0, 0.4, l));
  c *= mix(vec3(1.0), vec3(1.03, 1.0, 0.95), smoothstep(0.5, 1.0, l));
  c = mix(c, vec3(1.0, 0.97, 0.91), uLift * smoothstep(0.02, 0.45, l));
  c *= 1.0 - uVig * smoothstep(0.35, 1.0, length(vUv - 0.5) * 1.25);
  c = clamp(c, 0.0, 1.0);
  if (uTone > 0.0) {
    // screentone: dots on a 45° grid that grow with darkness until they close into solid ink; the
    // drawn lines go on top, and anything strongly red (cherries, fire, embers) keeps its colour
    float lum = pow(dot(c, vec3(0.2126, 0.7152, 0.0722)), 0.4545);   // perceived brightness
    vec2 cell = mat2(0.7071, -0.7071, 0.7071, 0.7071) * gl_FragCoord.xy / uDot;
    float r = 0.8 * sqrt(clamp((0.72 - lum) / 0.8, 0.0, 1.0));
    float dots = (1.0 - smoothstep(r - 0.07, r + 0.07, length(fract(cell) - 0.5))) * smoothstep(0.0, 0.1, r);
    vec3 page = mix(vec3(0.9, 0.87, 0.79), vec3(0.011, 0.009, 0.013), max(dots, ink));   // paper and ink, in linear light
    float red = smoothstep(0.16, 0.42, c.r - max(c.g, c.b));
    c = mix(c, page, uTone * (1.0 - red * 0.9));
  }
  vec4 outc = linearToOutputTexel(vec4(c, 1.0));
  outc.rgb += (fract(sin(dot(gl_FragCoord.xy + uTime * 61.0, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) * uGrain;
  gl_FragColor = outc;
}`;

function createPost(renderer, opts) {
  let samples = opts.samples, lean = false, raysOn = opts.rays;
  const canFloat = renderer.extensions.has('EXT_color_buffer_float') || renderer.extensions.has('EXT_color_buffer_half_float');
  const type = canFloat ? THREE.HalfFloatType : THREE.UnsignedByteType;
  const target = (depth, n) => {
    const rt = new THREE.WebGLRenderTarget(2, 2, { type, samples: n || 0, depthBuffer: depth, depthTexture: depth ? new THREE.DepthTexture(2, 2) : null });
    rt.texture.minFilter = rt.texture.magFilter = THREE.LinearFilter; return rt;
  };
  const main = target(true, samples);
  const blooms = Array.from({ length: opts.bloomLevels }, () => target(false));
  const raysRT = target(false), raysSoft = target(false); // light shafts: marched at a quarter, then softened at an eighth
  const black = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1); black.needsUpdate = true;

  const tri = new THREE.BufferGeometry();
  tri.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
  tri.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([0, 0, 2, 0, 0, 2]), 2));
  const quad = new THREE.Mesh(tri); quad.frustumCulled = false;
  const qScene = new THREE.Scene(); qScene.add(quad);
  const qCam = new THREE.Camera();
  const pass = (frag, uniforms, extra) => new THREE.ShaderMaterial({ vertexShader: POST_VERT, fragmentShader: frag, uniforms, depthTest: false, depthWrite: false, toneMapped: false, ...extra });
  const V2 = () => ({ value: new THREE.Vector2() });
  const pre = pass(PRE_FRAG, { t: { value: main.texture }, uTexel: V2() });
  const down = pass(DOWN_FRAG, { t: { value: null }, uTexel: V2() });
  const up = pass(UP_FRAG, { t: { value: null }, uTexel: V2() }, { blending: THREE.AdditiveBlending, transparent: true });
  const raysM = pass(RAYS_FRAG, { tScene: { value: main.texture }, tDepth: { value: main.depthTexture }, uSun: V2(), uAmt: { value: 0 } });
  const comp = pass(COMP_FRAG, {
    tScene: { value: main.texture }, tDepth: { value: main.depthTexture }, tBloom: { value: black }, tRays: { value: black },
    uTexel: V2(), uInkCol: { value: new THREE.Color(0.2, 0.13, 0.12) }, uNear: { value: 0.1 }, uFar: { value: 160 }, uFogDens: { value: 0.02 },
    uInk: { value: 0.8 }, uLine: { value: 1 }, uBloom: { value: 0 }, uSat: { value: 1 }, uExposure: { value: 1 }, uTime: { value: 0 }, uGrain: { value: 0.024 },
    uContrast: { value: 0.16 }, uLift: { value: 0 }, uVig: { value: 0 }, uTone: { value: 0 }, uDot: { value: 5.5 },
  }, { toneMapped: true });

  const run = (mat, rt) => { quad.material = mat; renderer.setRenderTarget(rt); renderer.render(qScene, qCam); };
  function setSize(w, h, dpr) {
    w = Math.max(2, w); h = Math.max(2, h);
    main.setSize(w, h);
    blooms.forEach((b, i) => b.setSize(Math.max(2, w >> (i + 1)), Math.max(2, h >> (i + 1))));
    raysRT.setSize(Math.max(2, w >> 2), Math.max(2, h >> 2)); raysSoft.setSize(Math.max(2, w >> 3), Math.max(2, h >> 3));
    pre.uniforms.uTexel.value.set(1 / w, 1 / h); comp.uniforms.uTexel.value.set(1 / w, 1 / h);
    comp.uniforms.uLine.value = dpr >= 1.5 ? 1.5 : 1; comp.uniforms.uDot.value = 5.5 * Math.max(1, dpr * 0.8);
  }
  function render(scene, camera, p) {
    renderer.setRenderTarget(main); renderer.render(scene, camera);
    const bloom = !lean && p.bloom > 0.01;
    if (bloom) {
      run(pre, blooms[0]);
      for (let i = 1; i < blooms.length; i++) { down.uniforms.t.value = blooms[i - 1].texture; down.uniforms.uTexel.value.set(1 / blooms[i - 1].width, 1 / blooms[i - 1].height); run(down, blooms[i]); }
      renderer.autoClear = false;   // each level is added onto the sharper one above it
      for (let i = blooms.length - 1; i > 0; i--) { up.uniforms.t.value = blooms[i].texture; up.uniforms.uTexel.value.set(0.5 / blooms[i].width, 0.5 / blooms[i].height); run(up, blooms[i - 1]); }
      renderer.autoClear = true;
    }
    const shafts = raysOn && !lean && p.rays > 0.01;
    if (shafts) {
      raysM.uniforms.uSun.value.set(p.sunX, p.sunY); raysM.uniforms.uAmt.value = p.rays; run(raysM, raysRT);
      down.uniforms.t.value = raysRT.texture; down.uniforms.uTexel.value.set(1 / raysRT.width, 1 / raysRT.height); run(down, raysSoft);
    }
    const u = comp.uniforms;
    u.tBloom.value = bloom ? blooms[0].texture : black; u.uBloom.value = bloom ? p.bloom / blooms.length : 0;
    u.tRays.value = shafts ? raysSoft.texture : black;
    u.uInk.value = p.ink; u.uSat.value = p.sat; u.uExposure.value = p.exposure; u.uFogDens.value = p.fogDens; u.uTime.value = p.time;
    u.uNear.value = camera.near; u.uFar.value = camera.far;
    run(comp, null);
  }
  return {
    render, setSize,
    get samples() { return samples; },
    setSamples(n) { if (n === samples) return; samples = n; main.samples = n; main.dispose(); },
    setLean(v) { lean = v; },
    setRays(v) { raysOn = v; },
    setLook(k) { const u = comp.uniforms; u.uInkCol.value.setRGB(k.inkCol[0], k.inkCol[1], k.inkCol[2]); u.uContrast.value = k.contrast; u.uLift.value = k.lift; u.uVig.value = k.vig; u.uTone.value = k.tone; u.uGrain.value = k.grain; },
  };
}

/* ------------------------------------------------------------------ mount */
export function mount({ host, jr, stage, state, onState, emit, explicit, jtFromY }) {
  const tier = state.tier === 'lite' ? 'lite' : 'full';
  const usePost = !new URLSearchParams(location.search).has('nopost'); // ?nopost draws the cel scene straight to the canvas (for comparison and debugging)
  const renderer = new THREE.WebGLRenderer({ antialias: !usePost && tier === 'full', powerPreference: 'high-performance', alpha: false });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping; // keeps the painted hues; a filmic curve would grey them
  renderer.toneMappingExposure = 1;
  // Resolution: the full tier renders at the display's pixel ratio up to 2×, within a budget of about
  // 8.5 million pixels so a very large window stays smooth; the lite tier at up to 1.5× (1× on a software GPU).
  const cssPx = Math.max(1, host.clientWidth * host.clientHeight);
  const software = /software/i.test(state.tierReason || '');
  let dpr = tier === 'full' ? Math.min(devicePixelRatio || 1, 2, Math.sqrt(8.5e6 / cssPx)) : software ? 1 : Math.min(devicePixelRatio || 1, 1.5);
  dpr = Math.max(1, dpr);
  renderer.setPixelRatio(dpr);
  renderer.setSize(host.clientWidth, host.clientHeight);
  host.appendChild(renderer.domElement);
  const canvas = renderer.domElement;
  canvas.style.transition = 'opacity 420ms ease';
  ANISO = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  // multisampling where the pixels are large; at 2× the display's own density does most of that work
  const post = usePost ? createPost(renderer, { samples: tier === 'full' ? (dpr >= 1.75 ? 2 : 4) : 0, bloomLevels: tier === 'full' ? 4 : 3, rays: tier === 'full' }) : null;
  A2C = !!post && post.samples > 0;
  const base = { dpr, samples: post ? post.samples : 0, rays: tier === 'full' }; // what the Auto detail setting means on this device

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(PAL[0].fog, 0.03);
  scene.background = new THREE.Color(PAL[0].fog);
  const camera = new THREE.PerspectiveCamera(52, host.clientWidth / host.clientHeight, 0.1, 160);
  const skyU = {
    uTop: { value: new THREE.Color(PAL[0].top) }, uBottom: { value: new THREE.Color(PAL[0].fog) },
    uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uSunCol: { value: new THREE.Color(PAL[0].sun) },
    uCloudLit: { value: new THREE.Color(PAL[0].cloudLit) }, uCloudShade: { value: new THREE.Color(PAL[0].cloudShade) },
    uCloud: { value: 0 }, uDisc: { value: 0 }, uTime: { value: 0 }, uHaze: { value: 0 },
  };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(140, 32, 16), new THREE.ShaderMaterial({
    uniforms: skyU, defines: { OCT: tier === 'full' ? 5 : 4 }, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: 'varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: SKY_FRAG,
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
  const grade = { exp: 1, ink: 0.8, bloom: 0.5, sat: 1.1, rays: 0 }; // what the post pass is given this frame
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
    skyU.uBottom.value.copy(fogA); skyU.uTop.value.set(A.top).lerp(col.set(B.top), t); sky.position.copy(camPos);
    skyU.uCloud.value = lerp(A.cloud, B.cloud, t); skyU.uDisc.value = lerp(A.disc, B.disc, t);
    // the mist closes over the sky as a crossing begins and opens again as the next place arrives
    skyU.uHaze.value = Math.max(i < 5 ? smoothstep(p, 0.62, 0.8) : 0, i > 0 ? 1 - smoothstep(p, 0.0, 0.14) : 0);
    skyU.uCloudLit.value.set(A.cloudLit).lerp(col.set(B.cloudLit), t); skyU.uCloudShade.value.set(A.cloudShade).lerp(col.set(B.cloudShade), t);
    scene.fog.density = lerp(A.dens * densK, B.dens, t);
    hemi.color.copy(skyA.set(A.sky).lerp(col.set(B.sky), t)); hemi.groundColor.copy(gndA.set(A.ground).lerp(col.set(B.ground), t)); hemi.intensity = lerp(A.hemiI, B.hemiI, t);
    sun.color.copy(sunA.set(A.sun).lerp(col.set(B.sun), t)); sun.intensity = lerp(A.sunI * sunK, B.sunI, t);
    tmpA.fromArray(A.dir); tmpB.fromArray(B.dir); tmpA.lerp(tmpB, t).normalize();
    skyU.uSunDir.value.copy(tmpA); skyU.uSunCol.value.copy(sunA);
    sun.position.copy(camPos).addScaledVector(tmpA, 30); sunTarget.position.copy(camPos);
    grade.exp = lerp(A.exp * expK, B.exp, t); grade.ink = lerp(A.ink, B.ink, t); grade.bloom = lerp(A.bloom, B.bloom, t);
    grade.sat = lerp(A.sat, B.sat, t); grade.rays = lerp(A.rays, B.rays, t);
    renderer.toneMappingExposure = post ? 1 : grade.exp; // with the post pass, exposure is applied in the composite
  }

  /* per-chapter time animation */
  let time = 0;
  let lastRoastColor = -1;
  function animate(jt, dt) {
    const i = Math.min(5, Math.floor(jt)); const p = clamp(jt - i, 0, 1);
    // the next environment is switched on well before the crossing (the fog hides it until then,
    // so nothing pops), the previous one stays on for the first tenth of a chapter
    const ahead = i === 2 ? 0.8 : 0.45; // the roastery's wall stands tall, so it waits until the mist has closed
    groups.forEach((g, k) => { g.visible = k === i || (k === i + 1 && p > ahead) || (k === i - 1 && p < 0.12); if (g.visible && !g.userData.built) build(k); });
    if (!groups[Math.min(5, i + 1)].userData.built && p > 0.3) build(Math.min(5, i + 1));
    windU.uTime.value = time; skyU.uTime.value = time;
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
    if (groups[1].visible && groups[1].userData.motes) {
      const mp = groups[1].userData.motes.geometry.attributes.position;
      for (let k = 0; k < mp.count; k++) { let y = mp.getY(k) + dt * (0.04 + (k % 4) * 0.012); if (y > 3.5) y = 0.4; mp.setY(k, y); mp.setX(k, mp.getX(k) + Math.sin(time * 0.6 + k * 1.7) * dt * 0.06); }
      mp.needsUpdate = true;
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
      const em = u.embers.geometry.attributes.position;
      for (let k = 0; k < em.count; k++) { let y = em.getY(k) + dt * (0.35 + (k % 5) * 0.07); let x = em.getX(k) + Math.sin(time * 2.1 + k * 1.3) * dt * 0.12; if (y > 3.6) { y = 0.95; x = between(-0.8, 0.8); } em.setY(k, y); em.setX(k, x); }
      em.needsUpdate = true; u.embers.material.opacity = 0.9 * heat;
      // the window's light comes up as the visitor arrives and is gone before the crossing begins
      const day = i === 3 ? smoothstep(p, 0.0, 0.16) * (1 - smoothstep(p, 0.72, 0.88)) : 0;
      u.daylight.forEach(([m, o]) => { m.opacity = o * day; });
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
    draw();
    // watchdog: four seconds under 24 fps steps the quality down (never when the tier was asked for by name)
    if (!explicit && detail === 'auto' && moving) {
      frames++; fpsAcc += dt; if (fpsAcc >= 1) { state.fps = frames / fpsAcc; frames = 0; fpsAcc = 0; fpsT += 1; if (state.fps < 24 && fpsT >= 4) { demote(); fpsT = 0; } if (state.fps >= 24) fpsT = 0; }
    }
  }
  /* One draw: the scene into the post pass, with the sun's place on screen for the light shafts. */
  const sunView = new THREE.Vector3(), sunNdc = new THREE.Vector3();
  function draw() {
    if (!post) { renderer.render(scene, camera); return; }
    camera.updateMatrixWorld();
    sunView.copy(skyU.uSunDir.value).transformDirection(camera.matrixWorldInverse);
    sunNdc.copy(camera.position).addScaledVector(skyU.uSunDir.value, 100).project(camera);
    const inFrame = smoothstep(-sunView.z, 0.15, 0.5) * (1 - smoothstep(Math.max(Math.abs(sunNdc.x), Math.abs(sunNdc.y)), 1.1, 1.9));
    post.render(scene, camera, {
      exposure: grade.exp, ink: grade.ink * style.ink, bloom: grade.bloom * style.bloom, sat: grade.sat * style.sat, fogDens: scene.fog.density, time,
      rays: grade.rays * skyU.uDisc.value * inFrame, sunX: sunNdc.x * 0.5 + 0.5, sunY: sunNdc.y * 0.5 + 0.5,
    });
  }
  let level = 0; // 0 as mounted · 1 pixel ratio 1, no multisampling, fewer instances · 2 no bloom or light shafts either
  function demote() {
    if (level >= 2) return;
    level++;
    if (level === 1) {
      dpr = 1; renderer.setPixelRatio(1); post?.setSamples(0);
      if (state.tier === 'full') {
        state.tier = 'lite';
        groups[0].userData.mist?.geometry.setDrawRange(0, 90); groups[2].children.forEach((c) => { if (c.isInstancedMesh) c.count = Math.min(c.count, 3000); });
      }
    } else post?.setLean(true);
    state.tierReason = `watchdog, step ${level} (${state.fps.toFixed(0)} fps)`;
    resize();
  }
  function start() { if (running) return; running = true; lastT = performance.now(); needs = true; requestAnimationFrame(frame); }
  function stop() { running = false; }

  const bufSize = new THREE.Vector2();
  function resize() {
    const w = host.clientWidth, h = host.clientHeight;
    renderer.setSize(w, h); renderer.getDrawingBufferSize(bufSize); post?.setSize(bufSize.x, bufSize.y, dpr);
    camera.aspect = w / h; camera.fov = h > w ? 74 : 52; camera.updateProjectionMatrix(); needs = true;
  }
  window.addEventListener('resize', resize);
  resize();

  /* The visitor's choices (state.look, state.detail, set from the panel in look.js), applied live. */
  let style = LOOKS.anime, lookId = '', detail = 'auto';
  function applyLook(id) {
    lookId = LOOKS[id] ? id : 'anime'; style = LOOKS[lookId];
    setRamp(style.ramp); celU.uRimK.value = style.rim;
    renderer.toneMapping = style.filmic ? THREE.ACESFilmicToneMapping : THREE.NeutralToneMapping;
    post?.setLook(style); needs = true;
  }
  function applyDetail(id) {
    detail = ['high', 'balanced', 'light'].includes(id) ? id : 'auto';
    level = 0; post?.setLean(detail === 'light');
    const native = devicePixelRatio || 1, budget = Math.sqrt(8.5e6 / Math.max(1, host.clientWidth * host.clientHeight));
    if (detail === 'high') { dpr = Math.max(1, Math.min(native, 2, budget)); post?.setSamples(dpr >= 1.75 ? 2 : 4); post?.setRays(true); }
    else if (detail === 'balanced') { dpr = Math.max(1, Math.min(native, 1.25)); post?.setSamples(0); post?.setRays(false); }
    else if (detail === 'light') { dpr = 1; post?.setSamples(0); post?.setRays(false); }
    else { dpr = base.dpr; post?.setSamples(base.samples); post?.setRays(base.rays); }
    renderer.setPixelRatio(dpr); resize();
  }
  applyLook(state.look);
  if (state.detail && state.detail !== 'auto') applyDetail(state.detail);

  onState((s) => {
    if ((s.look || 'anime') !== lookId) applyLook(s.look);
    if ((s.detail || 'auto') !== detail) applyDetail(s.detail);
    needs = true; if (s.live && !document.hidden) start(); else stop();
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else if (state.live) start(); });

  // first frame, then reveal
  pose(0, state.calm); camera.position.copy(camPos); camera.lookAt(look); atmosphere(0); animate(0, 0); draw();
  jr.classList.add('jr--webgl');
  // announce that the scene is ready, so the stage's controls (look, pause) appear without waiting for a scroll
  requestAnimationFrame(() => { jr.classList.add('jr--ready'); state.sceneReady = true; emit?.(); if (state.live) start(); });
  // test hook: render the scene at an exact progress, bypassing the scrub smoothing
  const renderAt = (jt) => { pose(jt, false); camera.position.copy(camPos); camera.lookAt(look); atmosphere(jt); animate(jt, 0); draw(); };
  window.__yorai = { renderer, scene, camera, state, groups, renderAt, post, applyLook, applyDetail };
  return { renderer, scene, camera };
}
