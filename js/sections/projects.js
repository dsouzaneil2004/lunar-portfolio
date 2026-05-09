// ============================================================
// projects.js — Horizontal scroll + card tilt
// ✏️  Fill in PROJECTS_DATA with your real projects
// ============================================================

// ── YOUR PROJECTS ─────────────────────────────────────────────
const PROJECTS_DATA = [
  {
    title:       'Smart Expense Tracker',
    description: 'A personal finance tool built design-first. Most expense apps feel like spreadsheets — this one was built to feel finished. Glassmorphism UI with a focus on visual polish and real usability.',
    tech:        ['HTML', 'CSS', 'JavaScript', 'GitHub Copilot'],
    link:        '#'
  },
  {
    title:       'LUNAR — Portfolio',
    description: 'A cinematic, scroll-driven portfolio built around a blood moon photograph I captured myself. The site is the project — an experiment in treating the browser like a film set rather than a page.',
    tech:        ['HTML', 'CSS', 'GSAP', 'Canvas API', 'Lenis'],
    link:        '#'
  },
];


// ── INIT ──────────────────────────────────────────────────────
function initProjects() {
  const track   = document.getElementById('projectsTrack');
  const section = document.getElementById('projects');
  const pinWrap = document.getElementById('projectsPinWrap');
  if (!track || !section || !pinWrap) return;

  // ── 1. Build and inject cards ────────────────────────────
  PROJECTS_DATA.forEach((p, i) => {
    const card = document.createElement('div');
    card.className = 'project-card';
    card.innerHTML = `
      <span class="project-card__number">0${i + 1}</span>
      <h3 class="project-card__title">${p.title}</h3>
      <p class="project-card__desc">${p.description}</p>
      <div class="project-card__tech">
        ${p.tech.map(t => `<span class="tech-tag">${t}</span>`).join('')}
      </div>
      <a href="${p.link}" class="project-card__link" target="_blank">
        View Project &nbsp;&rarr;
      </a>
    `;
    track.appendChild(card);

    // ── Card 3D tilt on mouse move ─────────────────────────
    card.addEventListener('mousemove', (e) => {
      const rect  = card.getBoundingClientRect();
      const centX = rect.left + rect.width  / 2;
      const centY = rect.top  + rect.height / 2;
      const rotY  =  (e.clientX - centX) / rect.width  * 10;
      const rotX  = -(e.clientY - centY) / rect.height * 10;
      gsap.to(card, {
        rotateX: rotX,
        rotateY: rotY,
        transformPerspective: 800,
        duration: 0.4,
        ease: 'power2.out',
      });
    });

    card.addEventListener('mouseleave', () => {
      gsap.to(card, {
        rotateX: 0, rotateY: 0,
        duration: 0.7,
        ease: 'elastic.out(1, 0.5)',
      });
    });
  });


  // ── 2. Set up horizontal scroll ──────────────────────────
  // We calculate the total distance the track needs to travel,
  // then set the section's height so that distance maps to
  // the same amount of vertical scroll.

  function buildScroll() {
    // Kill any existing ScrollTrigger on projects to avoid doubles on resize
    ScrollTrigger.getAll()
      .filter(st => st.vars.id === 'projects-scroll')
      .forEach(st => st.kill());

    const trackW = track.scrollWidth;
    const viewW  = window.innerWidth;
    const dist   = trackW - viewW + 200; // 200px padding at the end

    // Section must be tall enough so scrolling through it
    // provides enough "distance" to move the full track
    section.style.height = (dist + window.innerHeight) + 'px';

    gsap.to(track, {
      x: -dist,
      ease: 'none',
      scrollTrigger: {
        id:       'projects-scroll',
        trigger:  section,
        start:    'top top',
        end:      () => '+=' + dist,
        pin:      pinWrap,
        scrub:    1.2,
        invalidateOnRefresh: true,
      }
    });
  }

  buildScroll();

  // Rebuild on window resize (debounced)
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(buildScroll, 300);
  });


  // ── 3. Title reveal ──────────────────────────────────────
  gsap.to('#projects .reveal-title', {
    opacity: 1, y: 0, duration: 1.2, ease: 'power3.out',
    scrollTrigger: {
      trigger: '#projects',
      start:   'top 80%',
    }
  });
}

initProjects();