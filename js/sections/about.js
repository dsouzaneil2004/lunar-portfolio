function initAbout() {
  gsap.to('#about .reveal-title', {
    opacity: 1, y: 0, duration: 1.2, ease: 'power3.out',
    scrollTrigger: {
      trigger: '#about',
      start: 'top 78%',
      toggleActions: 'play none none reverse',
    }
  });

  gsap.to('#about .reveal-text', {
    opacity: 1, y: 0, duration: 1, stagger: 0.2, ease: 'power3.out',
    scrollTrigger: {
      trigger: '#about',
      start: 'top 72%',
      toggleActions: 'play none none reverse',
    }
  });
}

initAbout();