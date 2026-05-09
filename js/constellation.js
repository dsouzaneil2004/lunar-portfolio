// ============================================================
// constellation.js — Star Mapping & Line-Drawing System
// The visual spine of the entire experience.
// Stars are mapped to the blood moon photograph (Image 4).
// Each section of the site activates its own constellation.
// ============================================================


// ─── STAR POSITIONS ──────────────────────────────────────────
// x, y = percentage of viewport (0–100)
// r    = dot radius in pixels
// Mapped to match visible stars in Image 4 of the blood moon.
// Fine-tune x/y values if a dot doesn't sit on a star.

const STARS = [
  { id:  0, x:  8.5, y:  8.0, r: 2.2 },   // Top-left cluster A
  { id:  1, x: 13.2, y:  6.4, r: 1.6 },   // Top-left cluster B
  { id:  2, x: 20.5, y: 15.5, r: 1.7 },   // Left arc
  { id:  3, x:  5.8, y: 22.5, r: 1.4 },   // Far left
  { id:  4, x: 16.8, y: 42.5, r: 1.5 },   // Left-mid
  { id:  5, x: 29.0, y: 33.5, r: 1.8 },   // Centre-left
  { id:  6, x: 38.5, y: 10.5, r: 1.9 },   // Upper centre-left
  { id:  7, x: 50.5, y: 12.8, r: 1.5 },   // Upper centre
  { id:  8, x: 50.0, y: 47.0, r: 5.0 },   // ★ THE MOON — anchor star
  { id:  9, x: 33.5, y: 62.5, r: 2.6 },   // Bright star below-left of moon
  { id: 10, x: 60.5, y: 35.5, r: 1.7 },   // Right of centre
  { id: 11, x: 74.5, y: 18.5, r: 1.8 },   // Upper right
  { id: 12, x: 87.5, y:  7.5, r: 2.1 },   // Top right
  { id: 13, x: 91.0, y: 32.5, r: 1.4 },   // Right side
  { id: 14, x: 77.0, y: 55.5, r: 1.5 },   // Lower right
];


// ─── CONSTELLATION GROUPS ────────────────────────────────────
// Each group belongs to a section of the site.
// As the section scrolls into view, its constellation draws itself.
// connections = [starIdA, starIdB] pairs to draw lines between.
// progress    = 0 (nothing drawn) → 1 (fully drawn). Driven by scroll.

const GROUPS = [
  {
    id:          'about',
    label:       'Who I Am',
    color:       '#a78bfa',                          // Violet
    glowColor:   'rgba(167, 139, 250, 0.4)',
    starIds:     [0, 1, 2, 3, 4, 5],
    connections: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,2]],
    progress:    0,
  },
  {
    id:          'skills',
    label:       'What I Know',
    color:       '#7dd3fc',                          // Ice blue
    glowColor:   'rgba(125, 211, 252, 0.35)',
    starIds:     [6, 7, 8, 5, 10],
    connections: [[6,7],[7,8],[8,5],[5,6],[10,7]],
    progress:    0,
  },
  {
    id:          'projects',
    label:       "What I've Built",
    color:       '#86efac',                          // Soft green
    glowColor:   'rgba(134, 239, 172, 0.35)',
    starIds:     [11, 12, 13, 14, 10],
    connections: [[12,11],[11,13],[13,14],[14,10],[10,11]],
    progress:    0,
  },
  {
    id:          'contact',
    label:       'The Signal',
    color:       '#fda4af',                          // Warm rose
    glowColor:   'rgba(253, 164, 175, 0.35)',
    starIds:     [8, 9, 4, 6],
    connections: [[8,9],[9,4],[4,6],[6,8]],
    progress:    0,
  },
];


// ─── CANVAS SETUP ────────────────────────────────────────────
const conCanvas = document.getElementById('constellationCanvas');
const conCtx    = conCanvas.getContext('2d');

function resizeConCanvas() {
  conCanvas.width  = window.innerWidth;
  conCanvas.height = window.innerHeight;
}
resizeConCanvas();

let conResizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(conResizeTimer);
  conResizeTimer = setTimeout(resizeConCanvas, 200);
});


// ─── HELPERS ─────────────────────────────────────────────────
// Convert a star's percentage position to actual canvas pixels
function toPixels(star) {
  return {
    x: (star.x / 100) * conCanvas.width,
    y: (star.y / 100) * conCanvas.height,
  };
}


// ─── DRAW: Single star with glow ─────────────────────────────
function drawStar(star, color, glowColor, opacity) {
  if (opacity <= 0) return;
  const { x, y } = toPixels(star);

  conCtx.save();
  conCtx.globalAlpha = Math.min(opacity, 1);

  // Soft outer glow
  const grad = conCtx.createRadialGradient(x, y, 0, x, y, star.r * 6);
  grad.addColorStop(0, glowColor);
  grad.addColorStop(1, 'transparent');
  conCtx.fillStyle = grad;
  conCtx.beginPath();
  conCtx.arc(x, y, star.r * 6, 0, Math.PI * 2);
  conCtx.fill();

  // Hard core dot
  conCtx.shadowColor = color;
  conCtx.shadowBlur  = 10;
  conCtx.fillStyle   = color;
  conCtx.beginPath();
  conCtx.arc(x, y, star.r, 0, Math.PI * 2);
  conCtx.fill();

  conCtx.restore();
}


// ─── DRAW: Line between two stars (partial, based on progress) ──
function drawLine(starA, starB, color, glowColor, lineProgress) {
  if (lineProgress <= 0) return;

  const a   = toPixels(starA);
  const b   = toPixels(starB);
  const endX = a.x + (b.x - a.x) * lineProgress;
  const endY = a.y + (b.y - a.y) * lineProgress;

  conCtx.save();
  conCtx.strokeStyle   = color;
  conCtx.lineWidth     = 0.7;
  conCtx.globalAlpha   = Math.min(lineProgress * 1.5, 0.65);
  conCtx.shadowColor   = glowColor;
  conCtx.shadowBlur    = 12;

  conCtx.beginPath();
  conCtx.moveTo(a.x, a.y);
  conCtx.lineTo(endX, endY);
  conCtx.stroke();
  conCtx.restore();
}


// ─── MAIN DRAW LOOP ──────────────────────────────────────────
function drawAllConstellations() {
  conCtx.clearRect(0, 0, conCanvas.width, conCanvas.height);

  GROUPS.forEach(group => {
    if (group.progress <= 0) return;

    const totalLines = group.connections.length;
    const drawn      = group.progress * totalLines;

    // Draw lines — they appear one by one as progress increases
    group.connections.forEach((conn, i) => {
      const lineProgress = Math.min(Math.max(drawn - i, 0), 1);
      drawLine(
        STARS[conn[0]],
        STARS[conn[1]],
        group.color,
        group.glowColor,
        lineProgress
      );
    });

    // Draw star dots — fade in with group progress
    group.starIds.forEach(id => {
      drawStar(STARS[id], group.color, group.glowColor, group.progress * 2);
    });
  });

  requestAnimationFrame(drawAllConstellations);
}

drawAllConstellations();


// ─── SCROLL TRIGGERS ─────────────────────────────────────────
// Each section fills its constellation group as it scrolls in.
// 'about' → violet, 'skills' → blue, 'projects' → green, 'contact' → rose

['about', 'skills', 'projects', 'contact'].forEach(sectionId => {
  const group   = GROUPS.find(g => g.id === sectionId);
  const section = document.getElementById(sectionId);
  if (!group || !section) return;

  ScrollTrigger.create({
    trigger:   section,
    start:     'top 75%',
    end:       'top 15%',
    onUpdate:  (self) => { group.progress = self.progress; },
    onLeave:   ()     => { group.progress = 1; },            // Fully drawn when passed
    onLeaveBack: ()   => { group.progress = 0; },            // Resets if scrolled back
  });
});