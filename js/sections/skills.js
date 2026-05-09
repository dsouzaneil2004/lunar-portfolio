// ============================================================
// skills.js — Neil's actual skills
// ============================================================

const SKILLS_DATA = [
  {
    category: 'Web',
    skills: ['HTML5', 'CSS3', 'JavaScript']
  },
  {
    category: 'Languages',
    skills: ['C', 'Python', 'Java']
  },
  {
    category: 'Database',
    skills: ['MySQL']
  },
  {
    category: 'Tools & AI',
    skills: ['VS Code', 'Claude AI', 'GitHub Copilot']
  }
];

function initSkills() {
  const grid = document.getElementById('skillsGrid');
  if (!grid) return;

  SKILLS_DATA.forEach(cat => {
    const card = document.createElement('div');
    card.className = 'skill-category';
    card.innerHTML = `
      <p class="skill-category__title">${cat.category}</p>
      <div class="skill-list">
        ${cat.skills.map(s => `<span class="skill-tag">${s}</span>`).join('')}
      </div>
    `;
    grid.appendChild(card);
  });

  gsap.to('#skills .reveal-title', {
    opacity: 1, y: 0, duration: 1.2, ease: 'power3.out',
    scrollTrigger: { trigger: '#skills', start: 'top 80%' }
  });

  gsap.to('.skill-category', {
    opacity: 1, y: 0, duration: 0.9, stagger: 0.15, ease: 'power3.out',
    scrollTrigger: { trigger: '#skills', start: 'top 70%' }
  });
}

initSkills();