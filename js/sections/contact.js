function initContact() {
  const btn    = document.getElementById('contactBtn');
  const fields = document.querySelectorAll('.contact__field');
  if (!btn) return;

  // Set initial hidden state for fields and button
  gsap.set([fields, btn], { opacity: 0, y: 30 });

  // ── Magnetic pull on button ──────────────────────────────
  btn.addEventListener('mousemove', (e) => {
    const r = btn.getBoundingClientRect();
    const x = e.clientX - r.left - r.width  / 2;
    const y = e.clientY - r.top  - r.height / 2;
    gsap.to(btn, { x: x * 0.38, y: y * 0.38, duration: 0.4, ease: 'power2.out' });
  });

  btn.addEventListener('mouseleave', () => {
    gsap.to(btn, { x: 0, y: 0, duration: 0.7, ease: 'elastic.out(1, 0.4)' });
  });

  // ── Section reveal ───────────────────────────────────────
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: '#contact',
      start: 'top 75%',
      toggleActions: 'play none none reverse',
    }
  });

  tl.to('#contact .reveal-title', { opacity: 1, y: 0, duration: 1.2, ease: 'power3.out'         })
    .to('#contact .reveal-text',  { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out'         }, '-=0.8')
    .to(fields,                   { opacity: 1, y: 0, duration: 0.7, stagger: 0.12, ease: 'power3.out' }, '-=0.5')
    .to(btn,                      { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out'         }, '-=0.3');
}

initContact();