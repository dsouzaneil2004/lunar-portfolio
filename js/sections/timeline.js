// ✏️ EDIT THIS — your education, achievements, certifications
const TIMELINE_DATA = [
  {
    year:  '2024 — Present',
    title: 'Master of Computer Applications',
    sub:   'MS Ramaiah University of Applied Sciences · Bangalore · 2nd Semester'
  },
  {
    year:  '2021 — 2024',
    title: 'Bachelor of Computer Applications',
    sub:   'Field Marshal KM Cariappa College · Madikeri · Mangalore University'
  },
  {
    year:  'Always',
    title: 'The Parallel Education',
    sub:   'Forest trails, engine grease, and a camera turned toward everything worth noticing. Everything school didn\'t teach.'
  },
];

function initTimeline() {
  const track = document.getElementById('timelineTrack');
  if (!track) return;

  TIMELINE_DATA.forEach(e => {
    const el = document.createElement('div');
    el.className = 'timeline-entry';
    el.innerHTML = `
      <p class="timeline-entry__year">${e.year}</p>
      <h3 class="timeline-entry__title">${e.title}</h3>
      <p class="timeline-entry__sub">${e.sub}</p>
    `;
    track.appendChild(el);
  });

  gsap.to('#timeline .reveal-title', {
    opacity: 1, y: 0, duration: 1.2, ease: 'power3.out',
    scrollTrigger: { trigger: '#timeline', start: 'top 80%' }
  });

  gsap.to('.timeline-entry', {
    opacity: 1, y: 0, duration: 0.9, stagger: 0.25, ease: 'power3.out',
    scrollTrigger: {
      trigger: '#timeline',
      start: 'top 70%',
      toggleActions: 'play none none reverse',
    }
  });
}

initTimeline();