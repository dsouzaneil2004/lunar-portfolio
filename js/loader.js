// Minimal fallback — galaxy renders immediately.
// This only hides the brief FOUC before JS executes.
(function() {
  const loader = document.getElementById('loader');
  if (!loader) return;

  const hide = () => {
    gsap.to(loader, {
      opacity: 0, duration: 0.4, ease: 'none',
      onComplete: () => { loader.style.display = 'none'; }
    });
  };

  if (document.readyState === 'complete') {
    hide();
  } else {
    window.addEventListener('load', hide);
    setTimeout(hide, 2500); // Failsafe
  }
})();