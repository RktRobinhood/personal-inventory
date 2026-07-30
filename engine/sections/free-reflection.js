/**
 * free-reflection.js — an open writing prompt. The student authors the meaning;
 * if `is_snapshot` is set, this text becomes the record's student_snapshot
 * (DESIGN.md read-out model C — no machine-generated prose about the person).
 * Contract: render(section, ctx) -> { el, read }.
 *   read() -> { responses: {sectionId: text}, snapshot?: text }
 */
import { h, getDoc } from '../dom.js';

export function render(section, ctx) {
  const doc = getDoc(ctx);
  const textareaId = `${section.id}-ta`;
  const children = [];
  if (section.title) children.push(h(doc, 'h2', { class: 'pi-section__title', text: section.title }));
  children.push(h(doc, 'label', { for: textareaId, class: 'pi-prompt', text: section.prompt }));
  const textarea = h(doc, 'textarea', {
    id: textareaId,
    name: section.id,
    rows: 8,
    class: 'pi-textarea',
    ...(section.placeholder ? { placeholder: section.placeholder } : {}),
  });
  children.push(textarea);

  const el = h(doc, 'section', { class: 'pi-section pi-free-reflection' }, children);

  const read = () => {
    const text = textarea.value || '';
    const out = { responses: { [section.id]: text } };
    if (section.is_snapshot) out.snapshot = text;
    return out;
  };

  return { el, read };
}
