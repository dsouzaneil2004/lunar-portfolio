// ============================================================
// hero.js — Hero section scroll infrastructure only.
//
// Responsibilities (strictly limited to):
//   1. Pin the hero section via GSAP ScrollTrigger
//   2. Feed scroll progress into galaxy.js
//   3. Manage scroll cue entrance + exit
//
// Explicitly NOT responsible for:
//   - heroMoon opacity          → galaxy.js owns this
//   - heroContent opacity       → galaxy.js owns this
//   - eyebrow opacity           → galaxy.js owns this
//   - Any DOM visual state      → galaxy.js owns all of this
//
// Data flow:
//   ScrollTrigger progress (0→1)
//     └── window.setGalaxyProgress(p)
//           └── galaxy.js render loop reads scrollP each frame
// ============================================================

function initHero() {
  const hero = document.getElementById('hero');
  const cue  = document.getElementById('scrollCue');

  if (!hero) return;

  // ── SCROLL CUE ENTRANCE ───────────────────────────────────
  // Fades in after galaxy has had time to settle.
  // GSAP set() ensures it starts invisible even if CSS
  // has a different default.
  gsap.set(cue, { opacity: 0, y: 8 });
  gsap.to(cue, {
    opacity:  1,
    y:        0,
    duration: 1.8,
    delay:    1.4,
    ease:     'power2.out',
  });

  // ── SCROLL TRIGGER ────────────────────────────────────────
  // Pins the hero section for 380vh of scroll distance.
  // The entire visual experience during this pin is driven
  // by galaxy.js via the setGalaxyProgress callback.
  ScrollTrigger.create({
    trigger:       hero,
    start:         'top top',
    end:           '+=380%',
    pin:           true,
    scrub:         2,
    anticipatePin: 1,
    onUpdate(self) {
      // Single source of scroll truth fed into galaxy.js
      if (window.setGalaxyProgress) {
        window.setGalaxyProgress(self.progress);
      }

      // Hide scroll cue once the journey has begun
      if (self.progress > 0.03) {
        gsap.to(cue, {
          opacity:   0,
          duration:  0.5,
          overwrite: true,
        });
      }
    },
  });
}

initHero();