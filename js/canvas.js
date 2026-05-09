function initParticles() {
  const canvas = document.getElementById('particleCanvas');
  const ctx    = canvas.getContext('2d');
  let particles = [];

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  // Fewer particles on weaker devices
  const COUNT = (navigator.hardwareConcurrency || 4) <= 4 ? 70 : 130;

  function makeParticle() {
    return {
      x:            Math.random() * canvas.width,
      y:            Math.random() * canvas.height,
      size:         Math.random() * 1.4 + 0.2,
      speedX:       (Math.random() - 0.5) * 0.12,
      speedY:       (Math.random() - 0.5) * 0.12,
      opacity:      Math.random() * 0.5 + 0.1,
      twinkleSpeed: Math.random() * 0.015 + 0.004,
      twinkleDir:   Math.random() > 0.5 ? 1 : -1,
    };
  }

  resize();
  for (let i = 0; i < COUNT; i++) particles.push(makeParticle());

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach(p => {
      p.opacity += p.twinkleSpeed * p.twinkleDir;
      if (p.opacity >= 0.65 || p.opacity <= 0.05) p.twinkleDir *= -1;

      p.x += p.speedX;
      p.y += p.speedY;

      if (p.x < 0) p.x = canvas.width;
      if (p.x > canvas.width)  p.x = 0;
      if (p.y < 0) p.y = canvas.height;
      if (p.y > canvas.height) p.y = 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(232, 224, 255, ${p.opacity})`;
      ctx.fill();
    });

    requestAnimationFrame(draw);
  }

  draw();

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      resize();
      particles = [];
      for (let i = 0; i < COUNT; i++) particles.push(makeParticle());
    }, 250);
  });
}

initParticles();