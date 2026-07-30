/**
 * info.js — teaching / framing block. No input, no scoring.
 * Contract: render(section, ctx) -> { el, read }.
 */
import { h, getDoc, paragraphs } from '../dom.js';

export function render(section, ctx) {
  const doc = getDoc(ctx);
  const headingId = `${section.id}-h`;
  const children = [];
  if (section.title) children.push(h(doc, 'h2', { id: headingId, class: 'pi-section__title', text: section.title }));
  for (const para of paragraphs(section.body)) children.push(h(doc, 'p', { text: para }));
  const attrs = { class: 'pi-section pi-info' };
  if (section.title) attrs['aria-labelledby'] = headingId;
  const el = h(doc, 'section', attrs, children);
  return { el, read: () => ({ responses: {} }) };
}
