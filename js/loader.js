function initLoader() {
  const loader = document.getElementById('loader');

  window.addEventListener('load', () => {
    gsap.to(loader, {
      opacity: 0,
      duration: 1.2,
      delay: 1,
      ease: 'power2.inOut',
      onComplete: () => { loader.style.display = 'none'; }
    });
  });
}

initLoader();