// ============================================================
// galaxy.js — Cinematic Scroll-Driven Galaxy System
//
// STATE OWNERSHIP — this file exclusively controls:
//   heroMoon opacity, heroContent opacity/transform,
//   eyebrow opacity/transform, canvas opacity, nebula opacity
//
// hero.js feeds scroll progress via window.setGalaxyProgress.
// hero.js must never touch any of the above properties.
//
// Scroll phases (progress 0 → 1):
//   0.00 – 0.06   Stars materialise
//   0.06 – 0.28   Ambient — name + tagline visible over galaxy
//   0.28 – 0.42   Text dissolves, warp energy builds
//   0.42 – 0.90   Warp acceleration (WARP_START → WARP_PEAK)
//   0.90 – 1.00   Exit — galaxy fades, blood moon + content revealed
// ============================================================

(function GalaxySystem() {
  'use strict';

  // ── GUARD ─────────────────────────────────────────────────
  if (typeof THREE === 'undefined') {
    console.warn('[GalaxySystem] Three.js not loaded.');
    return;
  }

  // ── CONFIG ────────────────────────────────────────────────
  const C = {
    STAR_LO:       4000,   // Star count — ≤4 CPU cores
    STAR_HI:       9000,   // Star count — >4 CPU cores
    FOV:           65,
    CAM_Z_START:   420,    // Camera start Z
    CAM_Z_DRIFT:   80,     // Ambient forward drift
    CAM_Z_RUSH:    580,    // Warp camera rush distance
    TEXT_FADE_END: 0.28,   // Scroll % where name/tagline fully gone
    WARP_START:    0.42,   // Scroll % warp begins
    WARP_PEAK:     0.90,   // Scroll % peak warp / exit starts
    EXIT_END:      1.00,   // Scroll % galaxy fully gone
    MOUSE_X:       2.2,
    MOUSE_Y:       1.5,
    MOUSE_LERP:    0.020,
    MAX_DPR:       1.5,
  };

  // ── DEVICE DETECTION ──────────────────────────────────────
  const COUNT = (navigator.hardwareConcurrency || 4) <= 4
    ? C.STAR_LO
    : C.STAR_HI;

  // ── DOM REFS ──────────────────────────────────────────────
  const hero        = document.getElementById('hero');
  const heroMoon    = document.getElementById('heroMoon');
  const heroContent = document.getElementById('heroContent');
  const eyebrow     = document.querySelector('.hero__eyebrow');

  if (!hero) return;

  // ── CANVAS ────────────────────────────────────────────────
  const canvas = document.createElement('canvas');
  canvas.id = 'galaxyCanvas';
  Object.assign(canvas.style, {
    position:      'absolute',
    inset:         '0',
    width:         '100%',
    height:        '100%',
    zIndex:        '5',
    pointerEvents: 'none',
    willChange:    'opacity',
  });
  hero.insertBefore(canvas, hero.firstChild);

  // ── NEBULA LAYER ──────────────────────────────────────────
  // CSS-only approximation of Milky Way nebulosity.
  // Zero GPU cost — composited directly by browser.
  const nebula = document.createElement('div');
  nebula.id = 'galaxyNebula';
  Object.assign(nebula.style, {
    position:      'absolute',
    inset:         '0',
    zIndex:        '4',
    pointerEvents: 'none',
    opacity:       '0',
    willChange:    'opacity',
    background: [
      'radial-gradient(ellipse 32% 78% at 62% 34%, rgba(68,48,178,0.24) 0%, transparent 70%)',
      'radial-gradient(ellipse 24% 58% at 47% 53%, rgba(158,88,48,0.20) 0%, transparent 62%)',
      'radial-gradient(ellipse 48% 98% at 56% 44%, rgba(48,32,128,0.16) 0%, transparent 82%)',
      'radial-gradient(ellipse 20% 38% at 74% 24%, rgba(88,68,198,0.13) 0%, transparent 62%)',
    ].join(','),
  });
  hero.insertBefore(nebula, hero.firstChild);

  // ── RENDERER ──────────────────────────────────────────────
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias:       false,
    powerPreference: 'low-power',
    alpha:           false,
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, C.MAX_DPR));
  renderer.setClearColor(0x03010a, 1);
  renderer.autoClear = false; // Required for trail system

  // ── SCENE + CAMERA ────────────────────────────────────────
  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    C.FOV,
    window.innerWidth / window.innerHeight,
    0.5,
    3000
  );
  camera.position.set(0, 0, C.CAM_Z_START);

  // ── TRAIL SYSTEM ──────────────────────────────────────────
  // Dark semi-transparent quad rendered before each frame.
  // Previous frame partially persists → natural light-streak
  // effect during warp without any post-processing.
  const trailScene = new THREE.Scene();
  const trailCam   = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const trailMat   = new THREE.MeshBasicMaterial({
    color:       0x03010a,
    transparent: true,
    opacity:     0,
    depthTest:   false,
    depthWrite:  false,
  });
  trailScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), trailMat));

  // ── STAR SPRITE ───────────────────────────────────────────
  // Procedural 64×64 radial gradient → round glowing stars.
  // No external assets required.
  function buildSprite() {
    const S = 64, mid = S / 2;
    const c = Object.assign(
      document.createElement('canvas'), { width: S, height: S }
    );
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(mid, mid, 0, mid, mid, mid);
    g.addColorStop(0.00, 'rgba(255,255,255,1.00)');
    g.addColorStop(0.06, 'rgba(255,255,255,0.95)');
    g.addColorStop(0.20, 'rgba(218,210,255,0.55)');
    g.addColorStop(0.50, 'rgba(160,148,255,0.18)');
    g.addColorStop(1.00, 'rgba(0,0,0,0.00)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
    return new THREE.CanvasTexture(c);
  }

  // ── STAR FIELD ────────────────────────────────────────────
  // Four populations simulate Milky Way composition.
  // All in one BufferGeometry = one draw call.
  function buildStarField(count) {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const ANG = 0.52; // ~30° band tilt

    for (let i = 0; i < count; i++) {
      const i3 = i * 3, t = Math.random();
      let x, y, z, r, g, b;

      if (t < 0.30) {
        // Band — dense diagonal strip, blue-violet
        const along = (Math.random() - 0.5) * 1100;
        const perp  = (Math.random() - 0.5) * 95 * Math.pow(Math.random(), 0.7);
        x = along * Math.cos(ANG) - perp * Math.sin(ANG);
        y = along * Math.sin(ANG) + perp * Math.cos(ANG);
        z = (Math.random() - 0.5) * 750;
        r = 0.52 + Math.random() * 0.28;
        g = 0.60 + Math.random() * 0.24;
        b = 0.94 + Math.random() * 0.06;

      } else if (t < 0.48) {
        // Core — warm dense ellipsoid
        const rad = Math.pow(Math.random(), 1.7) * 200;
        const th  = Math.random() * Math.PI * 2;
        x = Math.cos(th) * rad;
        y = Math.sin(th) * rad * 0.20;
        z = (Math.random() - 0.5) * 230;
        r = 1.0;
        g = 0.75 + Math.random() * 0.22;
        b = 0.48 + Math.random() * 0.38;

      } else if (t < 0.66) {
        // Near scatter — mid-distance, mixed colour
        const rad = 80  + Math.random() * 360;
        const th  = Math.random() * Math.PI * 2;
        const ph  = (Math.random() - 0.5) * Math.PI * 0.45;
        x = rad * Math.cos(ph) * Math.cos(th);
        y = rad * Math.cos(ph) * Math.sin(th) * 0.38;
        z = rad * Math.sin(ph);
        const v = 0.70 + Math.random() * 0.30;
        r = v; g = v * 0.88; b = v * 0.78;

      } else {
        // Deep background — sparse, cold blue-white
        x = (Math.random() - 0.5) * 1800;
        y = (Math.random() - 0.5) * 1100;
        z = (Math.random() - 0.5) * 1300;
        const v = 0.55 + Math.random() * 0.45;
        r = v * 0.76; g = v * 0.82; b = v;
      }

      pos[i3] = x; pos[i3+1] = y; pos[i3+2] = z;
      col[i3] = r; col[i3+1] = g; col[i3+2] = b;
    }
    return { pos, col };
  }

  const { pos, col } = buildStarField(COUNT);
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  starGeo.setAttribute('color',    new THREE.BufferAttribute(col, 3));

  const starMat = new THREE.PointsMaterial({
    size:            2.6,
    map:             buildSprite(),
    vertexColors:    true,
    transparent:     true,
    opacity:         0,
    alphaTest:       0.001,
    sizeAttenuation: true,
    blending:        THREE.AdditiveBlending,
    depthWrite:      false,
  });

  const starField = new THREE.Points(starGeo, starMat);
  scene.add(starField);

  // ── RUNTIME STATE ─────────────────────────────────────────
  let scrollP = 0;
  let mTargX  = 0;
  let mTargY  = 0;

  // ── MOUSE PARALLAX ────────────────────────────────────────
  window.addEventListener('mousemove', (e) => {
    mTargX =  (e.clientX / window.innerWidth  - 0.5) * C.MOUSE_X;
    mTargY = -(e.clientY / window.innerHeight - 0.5) * C.MOUSE_Y;
  });

  // ── HELPERS ───────────────────────────────────────────────
  // Smoothstep: removes linear feel from all transitions.
  function ss(t) {
    const c = Math.max(0, Math.min(t, 1));
    return c * c * (3 - 2 * c);
  }

  // Apply opacity + optional translateY to a DOM element.
  function applyStyle(el, opacity, ty) {
    if (!el) return;
    el.style.opacity   = String(Math.max(0, Math.min(opacity, 1)));
    if (ty !== undefined)
      el.style.transform = `translateY(${ty.toFixed(1)}px)`;
  }

  // ── INITIAL VISUAL STATE ──────────────────────────────────
  // Applied SYNCHRONOUSLY — before first RAF tick.
  // Guarantees correct initial render regardless of CSS defaults.
  applyStyle(heroMoon,    0,  0);
  applyStyle(heroContent, 1,  0);
  applyStyle(eyebrow,     0,  0);

  // ── RENDER LOOP ───────────────────────────────────────────
  function tick() {
    requestAnimationFrame(tick);

    const p = scrollP;

    // Warp phase: 0 at WARP_START → 1 at WARP_PEAK
    const warpT = Math.max(0, Math.min(
      (p - C.WARP_START) / (C.WARP_PEAK - C.WARP_START), 1
    ));

    // ── Camera movement
    const targetZ = (C.CAM_Z_START - p * C.CAM_Z_DRIFT)
                  - Math.pow(warpT, 2.6) * C.CAM_Z_RUSH;
    camera.position.z += (targetZ             - camera.position.z) * 0.065;
    camera.position.x += (mTargX              - camera.position.x) * C.MOUSE_LERP;
    camera.position.y += (mTargY              - camera.position.y) * C.MOUSE_LERP;
    camera.lookAt(
      camera.position.x * 0.05,
      camera.position.y * 0.05,
      camera.position.z - 280
    );

    // ── Galaxy slow rotation (ambient depth cue)
    starField.rotation.y = p * 0.09;
    starField.rotation.x = Math.sin(p * Math.PI * 0.45) * 0.035;

    // ── Star + nebula visibility
    const starAlpha = p < 0.06
      ? p / 0.06
      : p > C.WARP_PEAK
        ? 1 - (p - C.WARP_PEAK) / (C.EXIT_END - C.WARP_PEAK)
        : 1;
    starMat.opacity      = Math.max(0, Math.min(starAlpha, 1));
    nebula.style.opacity = String(Math.max(0, Math.min(starAlpha * 1.4, 1)));

    // ── Trail opacity grows with warp
    trailMat.opacity = warpT > 0.04
      ? Math.min(0.04 + Math.pow(warpT, 1.9) * 0.26, 0.32)
      : 0;

    // ── Hero text state
    // Phase A: name + tagline visible, dissolve as scroll begins
    // Phase B: warp — all text hidden
    // Phase C: blood moon — cinematic staggered reveal

    if (p < C.TEXT_FADE_END) {
      // Dissolve into space — drifts slightly upward as opacity drops
      const a = ss(1 - p / C.TEXT_FADE_END);
      applyStyle(heroContent, a,         (1 - a) * -16);
      applyStyle(eyebrow,     0,         0);

    } else if (p < C.WARP_PEAK) {
      // Warp phase — everything hidden, no transforms to reset
      applyStyle(heroContent, 0, 0);
      applyStyle(eyebrow,     0, 0);

    } else {
      // Blood moon reveal — rises into position with stagger
      const raw   = (p - C.WARP_PEAK) / (C.EXIT_END - C.WARP_PEAK);
      const a     = ss(Math.min(raw, 1));
      applyStyle(heroContent, Math.min(a * 1.6, 1), (1 - a) * 20);

      // Eyebrow enters ~15% after name/tagline for layered feel
      const ea = ss(Math.max(0, Math.min((raw - 0.15) / 0.85, 1)));
      applyStyle(eyebrow, Math.min(ea * 1.6, 1), (1 - ea) * 12);
    }

    // ── Galaxy / blood moon transition
    if (p > C.WARP_PEAK) {
      const exit = Math.max(0, Math.min(
        (p - C.WARP_PEAK) / (C.EXIT_END - C.WARP_PEAK), 1
      ));
      canvas.style.opacity = String(Math.max(0, 1 - exit));
      nebula.style.opacity = String(Math.max(0, (1 - exit) * parseFloat(nebula.style.opacity)));
      applyStyle(heroMoon, Math.min(exit * 1.6, 1));
    } else {
      canvas.style.opacity = '1';
      applyStyle(heroMoon, 0);
    }

    // ── Render
    renderer.clear(true, true, true);
    if (trailMat.opacity > 0.005) renderer.render(trailScene, trailCam);
    renderer.render(scene, camera);
  }

  tick();

  // ── PUBLIC API ────────────────────────────────────────────
  window.setGalaxyProgress = (p) => {
    scrollP = Math.max(0, Math.min(p, 1));
  };

  // ── RESIZE ────────────────────────────────────────────────
  window.addEventListener('resize', () => {
    const W = window.innerWidth, H = window.innerHeight;
    renderer.setSize(W, H);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
  });

})();