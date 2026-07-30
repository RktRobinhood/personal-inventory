import { formatBytes, loadLibrary } from '../engine/local-store.js';
import { mountMotion } from '../engine/motion.js';

export function mountLanding(doc = document) {
  const library = loadLibrary();
  const counts = {};
  for (const record of library.state.records) {
    counts[record.instrument_id] = (counts[record.instrument_id] || 0) + 1;
  }

  for (const [index, card] of Array.from(doc.querySelectorAll('[data-instrument]')).entries()) {
    const count = counts[card.dataset.instrument] || 0;
    const badge = doc.createElement('span');
    badge.className = 'pi-card__state';
    if (count) {
      card.classList.add('is-complete');
      badge.classList.add('is-complete');
      badge.textContent = count > 1 ? `✓ Completed ${count}× · retake` : '✓ Completed · retake';
    } else {
      badge.textContent = '○ Not started';
    }
    card.appendChild(badge);
    card.appendChild(buildCardVisual(doc, index));
  }

  const instrumentCards = Array.from(doc.querySelectorAll('[data-instrument]'));
  const completed = instrumentCards
    .filter((card) => Boolean(counts[card.dataset.instrument])).length;
  for (const count of doc.querySelectorAll('[data-portrait-count]')) {
    count.textContent = completed
      ? `${completed} of ${instrumentCards.length} lenses complete`
      : 'No results yet';
  }
  const status = doc.querySelector('[data-library-status]');
  if (status) {
    const count = library.state.records.length;
    status.textContent = library.available
      ? `${count} sitting${count === 1 ? '' : 's'} saved locally · ${formatBytes(library.bytes)}`
      : 'Local library unavailable — download results after each test';
  }
  mountMotion(doc);
}

function buildCardVisual(doc, index) {
  const visual = doc.createElement('span');
  visual.className = `pi-card-kinetic pi-card-kinetic--${(index % 7) + 1}`;
  visual.setAttribute('aria-hidden', 'true');
  for (let ring = 0; ring < 3; ring++) {
    const shape = doc.createElement('i');
    shape.style.setProperty('--shape-index', String(ring));
    visual.appendChild(shape);
  }
  const core = doc.createElement('b');
  visual.appendChild(core);
  return visual;
}
