function initHero() {
  const moon        = document.getElementById('heroMoon');
  const heroContent = document.getElementById('heroContent');
  const scrollCue   = document.getElementById('scrollCue');
  const hero        = document.getElementById('hero');

  // ── ENTRANCE: plays once on load ──────────────────────────
  const entrance = gsap.timeline({ delay: 1.6 });

  entrance
    .fromTo(moon,
      { scale: 1.06, opacity: 0 },
      { scale: 1, opacity: 1, duration: 2.8, ease: 'power2.out' }
    )
    .to('.hero__eyebrow',
      { opacity: 1, y: 0, duration: 1, ease: 'power3.out' }, '-=1.8'
    )
    .to('.hero__name-first',
      { opacity: 1, y: 0, duration: 1.2, ease: 'power3.out' }, '-=0.7'
    )
    .to('.hero__name-last',
      { opacity: 1, y: 0, duration: 1.2, ease: 'power3.out' }, '-=1.0'
    )
    .to('.hero__tagline',
      { opacity: 1, y: 0, duration: 1, ease: 'power3.out' }, '-=0.8'
    )
    .to(scrollCue,
      { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }, '-=0.4'
    );

  // ── SCROLL: moon zooms in as user scrolls ─────────────────
  const scrollTl = gsap.timeline({
    scrollTrigger: {
      trigger: hero,
      start: 'top top',
      end: '+=280%',      // Pinned for 280vh of scrolling
      pin: true,
      scrub: 2,           // 2s lag = cinematic, weighted feel
      anticipatePin: 1,
    }
  });

  scrollTl
    .to(moon,
      { scale: 7, ease: 'none', duration: 1 }, 0
    )
    .to(heroContent,
      { opacity: 0, y: -50, ease: 'power2.in', duration: 0.3 }, 0
    )
    .to(scrollCue,
      { opacity: 0, ease: 'none', duration: 0.12 }, 0
    );
}

initHero();