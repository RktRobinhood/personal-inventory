/**
 * Progressive motion layer. The product remains fully usable without it, and
 * all effects are disabled when the user requests reduced motion.
 */
export function mountMotion(doc = document) {
  const win = doc.defaultView || window;
  if (win.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  doc.documentElement.classList.add('pi-motion-ready');

  const revealTargets = Array.from(doc.querySelectorAll([
    '.pi-assessment-card',
    '.pi-how__step',
    '.pi-portrait-cta',
    '.pi-info',
    '.pi-item',
    '.pi-readout__scale',
    '.pi-reveal',
  ].join(','))).filter((node) => !node.hasAttribute('data-pi-motion'));
  revealTargets.forEach((node, index) => {
    node.setAttribute('data-pi-motion', '');
    node.classList.add('pi-reveal');
    node.style.setProperty('--reveal-delay', `${Math.min(index % 8, 5) * 45}ms`);
  });

  if ('IntersectionObserver' in win) {
    const observer = new win.IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    }, { threshold: .08, rootMargin: '0px 0px -4% 0px' });
    revealTargets.forEach((node) => observer.observe(node));
  } else {
    revealTargets.forEach((node) => node.classList.add('is-visible'));
  }

  if (win.matchMedia?.('(pointer: fine)').matches) {
    for (const card of revealTargets.filter((node) => node.matches('.pi-assessment-card'))) {
      card.addEventListener('pointermove', (event) => {
        const rect = card.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - .5;
        const y = (event.clientY - rect.top) / rect.height - .5;
        card.style.setProperty('--tilt-x', `${(-y * 4).toFixed(2)}deg`);
        card.style.setProperty('--tilt-y', `${(x * 5).toFixed(2)}deg`);
        card.style.setProperty('--glow-x', `${((x + .5) * 100).toFixed(0)}%`);
        card.style.setProperty('--glow-y', `${((y + .5) * 100).toFixed(0)}%`);
      });
      card.addEventListener('pointerleave', () => {
        card.style.removeProperty('--tilt-x');
        card.style.removeProperty('--tilt-y');
        card.style.removeProperty('--glow-x');
        card.style.removeProperty('--glow-y');
      });
    }
  }
}
