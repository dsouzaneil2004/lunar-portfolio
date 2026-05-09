gsap.registerPlugin(ScrollTrigger);

// Scroll progress bar
const progressBar = document.getElementById('scrollProgress');
ScrollTrigger.create({
  start: 'top top',
  end: 'max',
  onUpdate: (self) => {
    progressBar.style.width = (self.progress * 100) + '%';
  }
});

console.log('%c🌑 LUNAR — Online', 'color:#c1440e; font-size:16px; font-weight:bold;');