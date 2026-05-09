function initHero() {
  const moon    = document.getElementById('heroMoon');
  const content = document.getElementById('heroContent');
  const cue     = document.getElementById('scrollCue');
  const hero    = document.getElementById('hero');

  // Galaxy controls moon + content opacity — start hidden
  if (moon)    moon.style.opacity    = '0';
  if (content) content.style.opacity = '0';

  // Scroll cue fades in after galaxy settles
  gsap.fromTo(cue,
    { opacity: 0, y: 8 },
    { opacity: 1, y: 0, duration: 1.8, delay: 1.4, ease: 'power2.out' }
  );

  // ScrollTrigger drives the entire galaxy experience
  ScrollTrigger.create({
    trigger:       hero,
    start:         'top top',
    end:           '+=380%',
    pin:           true,
    scrub:         2,
    anticipatePin: 1,
    onUpdate(self) {
      if (window.setGalaxyProgress) window.setGalaxyProgress(self.progress);
      // Hide scroll cue once user begins scrolling
      if (self.progress > 0.03 && cue) {
        gsap.to(cue, { opacity: 0, duration: 0.4, overwrite: true });
      }
    },
  });
}

initHero();