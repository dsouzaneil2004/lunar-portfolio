// ============================================================
// galaxy.js — Cinematic scroll-driven galaxy system
// v2.0 — Production quality
//
// Architecture:
//   GalaxySystem (IIFE) contains:
//   ├── DOM setup      (canvas + CSS nebula layer)
//   ├── Three.js setup (renderer, scene, camera)
//   ├── Star sprite    (procedural — round glowing stars)
//   ├── Galaxy geo     (4 star populations: band/core/near/deep)
//   ├── Trail system   (motion blur without post-processing)
//   ├── Mouse parallax (subtle camera drift)
//   ├── Render loop    (RAF — scroll-driven)
//   └── Public API     (window.setGalaxyProgress)
//
// Scroll phases (0→1):
//   0.00–0.06   Stars fade in
//   0.06–0.42   Ambient galaxy — gentle drift
//   0.42–0.90   Warp builds — trail grows, camera rushes
//   0.90–1.00   Exit — galaxy fades, blood moon revealed
// ============================================================

(function GalaxySystem() {
  'use strict';

  if (typeof THREE === 'undefined') {
    console.warn('[Galaxy] Three.js not loaded — skipping galaxy system.');
    return;
  }

  // ── CONFIG ─────────────────────────────────────────────────
  // All tuning values in one place. Adjust freely.
  const C = {
    STAR_COUNT_LO:   5500,   // Weak devices  (≤4 CPU cores)
    STAR_COUNT_HI:  11000,   // Strong devices

    CAMERA_FOV:        65,
    CAMERA_Z_START:   420,   // Starting distance
    CAMERA_Z_AMBIENT:  80,   // How far camera drifts in ambient
    CAMERA_Z_WARP:    580,   // Total rush distance during warp

    GALAXY_RADIUS:    550,
    BAND_ANGLE:      0.52,   // ~30° diagonal tilt for the MW band

    MOUSE_X:         2.2,    // Parallax strength
    MOUSE_Y:         1.5,
    MOUSE_LERP:     0.020,   // Lower = smoother/slower follow

    WARP_START:     0.42,    // Scroll % where warp begins
    WARP_PEAK:      0.90,    // Scroll % at peak warp
    EXIT_END:       1.00,    // Scroll % when galaxy fully gone

    PIXEL_RATIO:    1.5,     // Cap — performance guard
  };

  // ── DEVICE DETECT ─────────────────────────────────────────
  const CORES = navigator.hardwareConcurrency || 4;
  const COUNT = CORES <= 4 ? C.STAR_COUNT_LO : C.STAR_COUNT_HI;

  // ── DOM REFS ──────────────────────────────────────────────
  const hero        = document.getElementById('hero');
  const heroMoon    = document.getElementById('heroMoon');
  const heroContent = document.getElementById('heroContent');
  const scrollCue   = document.getElementById('scrollCue');

  if (!hero) return;

  // ── GALAXY CANVAS ─────────────────────────────────────────
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

  // ── NEBULA CSS LAYER ──────────────────────────────────────
  // Approximates Milky Way nebulosity: purple band + warm core.
  // Zero GPU cost — pure CSS composited by the browser.
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
      // Purple-blue arm band (diagonal)
      'radial-gradient(ellipse 32% 78% at 62% 34%, rgba(68,48,178,0.24) 0%, transparent 70%)',
      // Warm galactic core glow
      'radial-gradient(ellipse 24% 58% at 47% 53%, rgba(158,88,48,0.20) 0%, transparent 62%)',
      // Secondary diffuse band
      'radial-gradient(ellipse 48% 98% at 56% 44%, rgba(48,32,128,0.16) 0%, transparent 82%)',
      // Far upper arm
      'radial-gradient(ellipse 20% 38% at 74% 24%, rgba(88,68,198,0.13) 0%, transparent 62%)',
    ].join(','),
  });
  hero.insertBefore(nebula, hero.firstChild);


  // ── THREE.JS RENDERER ─────────────────────────────────────
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias:       false,        // Off — biggest perf win
    powerPreference: 'low-power',  // Tells GPU driver to go easy
    alpha:           false,
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, C.PIXEL_RATIO));
  renderer.setClearColor(0x03010a, 1);
  renderer.autoClear = false;      // Needed for trail system


  // ── SCENE + CAMERA ────────────────────────────────────────
  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    C.CAMERA_FOV,
    window.innerWidth / window.innerHeight,
    0.5,
    3000
  );
  camera.position.set(0, 0, C.CAMERA_Z_START);


  // ── STAR SPRITE TEXTURE ───────────────────────────────────
  // Procedural — no external asset required.
  // Creates a 64×64 radial gradient on a 2D canvas,
  // then converts it to a Three.js texture.
  // Result: round, glowing stars with soft halos.
  function buildStarSprite() {
    const S = 64;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const ctx = c.getContext('2d');
    const mid = S / 2;

    const g = ctx.createRadialGradient(mid, mid, 0, mid, mid, mid);
    g.addColorStop(0.00, 'rgba(255, 255, 255, 1.00)');  // Hard bright centre
    g.addColorStop(0.06, 'rgba(255, 255, 255, 0.95)');
    g.addColorStop(0.20, 'rgba(218, 210, 255, 0.55)');  // Blue-white halo
    g.addColorStop(0.50, 'rgba(160, 148, 255, 0.18)');
    g.addColorStop(1.00, 'rgba(0,   0,   0,   0.00)');  // Transparent edge

    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);

    return new THREE.CanvasTexture(c);
  }

  const starSprite = buildStarSprite();


  // ── GALAXY GEOMETRY ───────────────────────────────────────
  // Four star populations combined into one BufferGeometry.
  // Single draw call = maximum performance.
  //
  // Population breakdown:
  //   30%  Milky Way band   — diagonal strip, blue-violet
  //   18%  Galactic core    — dense elliptical, warm orange-white
  //   18%  Near scatter     — mid-distance, varied colour
  //   34%  Deep background  — sparse, cold blue-white, wide spread

  function buildStarField(count) {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const i3  = i * 3;
      const rng = Math.random();
      let x, y, z, r, g, b;

      if (rng < 0.30) {
        // ── Milky Way band
        const along = (Math.random() - 0.5) * 1100;
        const perp  = (Math.random() - 0.5) * 95 * Math.pow(Math.random(), 0.7);
        const depth = (Math.random() - 0.5) * 750;
        const ang   = C.BAND_ANGLE;
        x = along * Math.cos(ang) - perp * Math.sin(ang);
        y = along * Math.sin(ang) + perp * Math.cos(ang);
        z = depth;
        r = 0.52 + Math.random() * 0.28;
        g = 0.60 + Math.random() * 0.24;
        b = 0.94 + Math.random() * 0.06;

      } else if (rng < 0.48) {
        // ── Galactic core
        const rad   = Math.pow(Math.random(), 1.7) * 200;
        const theta = Math.random() * Math.PI * 2;
        x = Math.cos(theta) * rad;
        y = Math.sin(theta) * rad * 0.20;   // Flatten to disc shape
        z = (Math.random() - 0.5) * 230;
        r = 1.0;
        g = 0.75 + Math.random() * 0.22;
        b = 0.48 + Math.random() * 0.38;

      } else if (rng < 0.66) {
        // ── Near scatter
        const rad   = 80 + Math.random() * 360;
        const theta = Math.random() * Math.PI * 2;
        const phi   = (Math.random() - 0.5) * Math.PI * 0.45;
        x = rad * Math.cos(phi) * Math.cos(theta);
        y = rad * Math.cos(phi) * Math.sin(theta) * 0.38;
        z = rad * Math.sin(phi);
        const v = 0.70 + Math.random() * 0.30;
        r = v; g = v * 0.88; b = v * 0.78;

      } else {
        // ── Deep background
        x = (Math.random() - 0.5) * 1800;
        y = (Math.random() - 0.5) * 1100;
        z = (Math.random() - 0.5) * 1300;
        const v = 0.55 + Math.random() * 0.45;
        r = v * 0.76;
        g = v * 0.82;
        b = v;
      }

      pos[i3] = x;  pos[i3+1] = y;  pos[i3+2] = z;
      col[i3] = r;  col[i3+1] = g;  col[i3+2] = b;
    }

    return { pos, col };
  }

  const { pos, col } = buildStarField(COUNT);

  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  starGeo.setAttribute('color',    new THREE.BufferAttribute(col, 3));

  const starMat = new THREE.PointsMaterial({
    size:            2.8,
    map:             starSprite,         // Round glowing sprite
    vertexColors:    true,
    transparent:     true,
    opacity:         0,
    alphaTest:       0.001,
    sizeAttenuation: true,
    blending:        THREE.AdditiveBlending,  // Stars glow, no dark fringe
    depthWrite:      false,
  });

  const stars = new THREE.Points(starGeo, starMat);
  scene.add(stars);


  // ── TRAIL SYSTEM ──────────────────────────────────────────
  // Renders a semi-transparent dark quad BEFORE the star scene.
  // Previous frame fades out partially → creates light streaks.
  // No EffectComposer, no post-processing, no performance hit.
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


  // ── STATE ─────────────────────────────────────────────────
  let scrollP    = 0;    // 0→1, set by window.setGalaxyProgress
  let mouseTargX = 0;
  let mouseTargY = 0;
  let raf;


  // ── MOUSE PARALLAX ────────────────────────────────────────
  window.addEventListener('mousemove', (e) => {
    mouseTargX =  (e.clientX / window.innerWidth  - 0.5) * C.MOUSE_X;
    mouseTargY = -(e.clientY / window.innerHeight - 0.5) * C.MOUSE_Y;
  });


  // ── RENDER LOOP ───────────────────────────────────────────
  function tick() {
    raf = requestAnimationFrame(tick);

    const p = scrollP;

    // ── Warp phase: 0 at WARP_START → 1 at WARP_PEAK
    const warpT = Math.max(0, Math.min(
      (p - C.WARP_START) / (C.WARP_PEAK - C.WARP_START), 1
    ));

    // ── Camera Z: ambient drift + exponential warp rush
    const baseZ   = C.CAMERA_Z_START - p * C.CAMERA_Z_AMBIENT;
    const rushZ   = Math.pow(warpT, 2.6) * C.CAMERA_Z_WARP;
    const targetZ = baseZ - rushZ;
    camera.position.z += (targetZ - camera.position.z) * 0.065;

    // ── Mouse parallax
    camera.position.x += (mouseTargX - camera.position.x) * C.MOUSE_LERP;
    camera.position.y += (mouseTargY - camera.position.y) * C.MOUSE_LERP;

    // ── Camera always looks slightly ahead (depth illusion)
    camera.lookAt(
      camera.position.x * 0.05,
      camera.position.y * 0.05,
      camera.position.z - 280
    );

    // ── Slow galaxy rotation during ambient — subtle spatial presence
    stars.rotation.y = p * 0.09;
    stars.rotation.x = Math.sin(p * Math.PI * 0.45) * 0.035;

    // ── Star opacity
    const alpha = p < 0.06
      ? p / 0.06                                            // 0→1 fade in
      : p > C.WARP_PEAK
        ? 1 - (p - C.WARP_PEAK) / (C.EXIT_END - C.WARP_PEAK)  // 1→0 fade out
        : 1;
    starMat.opacity      = Math.max(0, Math.min(alpha, 1));
    nebula.style.opacity = String(Math.max(0, Math.min(alpha * 1.4, 1)));

    // ── Trail: grows with warp intensity
    trailMat.opacity = warpT > 0.04
      ? Math.min(0.04 + Math.pow(warpT, 1.9) * 0.26, 0.32)
      : 0;

    // ── Exit transition: galaxy out → blood moon in
    if (p > C.WARP_PEAK) {
      const exitT = (p - C.WARP_PEAK) / (C.EXIT_END - C.WARP_PEAK);
      const exit  = Math.max(0, Math.min(exitT, 1));

      canvas.style.opacity = String(Math.max(0, 1 - exit));
      nebula.style.opacity = String(Math.max(0, (1 - exit) * 0.85));

      if (heroMoon)
        heroMoon.style.opacity = String(Math.min(exit * 1.6, 1));

    } else {
      canvas.style.opacity = '1';
      if (heroMoon)    heroMoon.style.opacity    = '0';
      if (heroContent) heroContent.style.opacity = '0';
    }

    // ── Render
    renderer.clear(true, true, true);
    if (trailMat.opacity > 0.005) renderer.render(trailScene, trailCam);
    renderer.render(scene, camera);
  }

  tick();


  // ── PUBLIC API ────────────────────────────────────────────
  // hero.js calls this from its ScrollTrigger onUpdate
  window.setGalaxyProgress = (p) => {
    scrollP = Math.max(0, Math.min(p, 1));
  };


  // ── RESIZE ────────────────────────────────────────────────
  window.addEventListener('resize', () => {
    const W = window.innerWidth;
    const H = window.innerHeight;
    renderer.setSize(W, H);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
  });

})();