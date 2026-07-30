/**
 * Progressive motion layer. The product remains fully usable without it, and
 * all effects are disabled when the user requests reduced motion.
 */
export function mountMotion(doc = document) {
  const win = doc.defaultView || window;
  if (win.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  doc.documentElement.classList.add('pi-motion-ready');
  mountAmbientLayer(doc, win);
  mountScrollProgress(doc, win);
  mountRipples(doc);

  const revealTargets = Array.from(doc.querySelectorAll([
    '.pi-assessment-card',
    '.pi-how__step',
    '.pi-portrait-cta',
    '.pi-info',
    '.pi-item',
    '.pi-readout__scale',
    '.pi-reveal',
    '.pi-landing-hero > :not(.pi-landing-hero__spark)',
    '.pi-instrument__hero > *',
    '.pi-exam-welcome__copy > *',
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
    const kineticObserver = new win.IntersectionObserver((entries) => {
      for (const entry of entries) {
        entry.target.classList.toggle('is-motion-active', entry.isIntersecting);
      }
    }, { threshold: 0, rootMargin: '12% 0px 12% 0px' });
    for (const card of doc.querySelectorAll('.pi-assessment-card:not([data-pi-kinetic])')) {
      card.setAttribute('data-pi-kinetic', '');
      kineticObserver.observe(card);
    }
  } else {
    revealTargets.forEach((node) => node.classList.add('is-visible'));
    doc.querySelectorAll('.pi-assessment-card').forEach((card) => card.classList.add('is-motion-active'));
  }

  if (!doc.documentElement.hasAttribute('data-pi-visibility-motion')) {
    doc.documentElement.setAttribute('data-pi-visibility-motion', '');
    doc.addEventListener('visibilitychange', () => {
      doc.documentElement.classList.toggle('pi-motion-paused', doc.hidden);
    });
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

    if (!doc.documentElement.hasAttribute('data-pi-pointer-motion')) {
      doc.documentElement.setAttribute('data-pi-pointer-motion', '');
      let pointerFrame = 0;
      doc.addEventListener('pointermove', (event) => {
        if (pointerFrame) return;
        pointerFrame = win.requestAnimationFrame(() => {
          pointerFrame = 0;
          doc.documentElement.style.setProperty('--pointer-x', `${event.clientX}px`);
          doc.documentElement.style.setProperty('--pointer-y', `${event.clientY}px`);
          doc.documentElement.style.setProperty('--parallax-x', `${(((event.clientX / win.innerWidth) - .5) * 45).toFixed(1)}px`);
          doc.documentElement.style.setProperty('--parallax-y', `${(((event.clientY / win.innerHeight) - .5) * 35).toFixed(1)}px`);
        });
      }, { passive: true });
    }
  }
}

function mountAmbientLayer(doc, win) {
  if (doc.querySelector('.pi-ambient')) return;
  const layer = doc.createElement('div');
  layer.className = 'pi-ambient';
  layer.setAttribute('aria-hidden', 'true');
  for (let index = 0; index < 3; index++) {
    const orb = doc.createElement('span');
    orb.className = `pi-ambient__orb pi-ambient__orb--${index + 1}`;
    layer.appendChild(orb);
  }
  const constellation = doc.createElement('span');
  constellation.className = 'pi-ambient__constellation';
  for (let index = 0; index < 9; index++) constellation.appendChild(doc.createElement('i'));
  layer.appendChild(constellation);
  doc.body.prepend(layer);

  // Mark the layer as ready one frame later so its first drift is visible.
  win.requestAnimationFrame(() => layer.classList.add('is-active'));
}

function mountScrollProgress(doc, win) {
  if (doc.querySelector('.pi-scroll-progress')) return;
  const rail = doc.createElement('div');
  rail.className = 'pi-scroll-progress';
  rail.setAttribute('aria-hidden', 'true');
  rail.appendChild(doc.createElement('span'));
  doc.body.appendChild(rail);
  let frame = 0;
  const update = () => {
    frame = 0;
    const max = Math.max(1, doc.documentElement.scrollHeight - win.innerHeight);
    rail.style.setProperty('--page-progress', String(Math.min(1, win.scrollY / max)));
  };
  win.addEventListener('scroll', () => {
    if (!frame) frame = win.requestAnimationFrame(update);
  }, { passive: true });
  update();
}

function mountRipples(doc) {
  if (doc.documentElement.hasAttribute('data-pi-ripples')) return;
  doc.documentElement.setAttribute('data-pi-ripples', '');
  doc.addEventListener('pointerdown', (event) => {
    const target = event.target.closest?.('.pi-btn, .pi-assessment-card, .pi-exam-element');
    if (!target) return;
    const rect = target.getBoundingClientRect();
    const ripple = doc.createElement('span');
    ripple.className = 'pi-ripple';
    ripple.style.left = `${event.clientX - rect.left}px`;
    ripple.style.top = `${event.clientY - rect.top}px`;
    target.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
  });
}
