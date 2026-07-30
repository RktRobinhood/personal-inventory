/**
 * select-and-commit.js — student selects from offered options and commits.
 * Used by the aspirational learner-profile module. NO scoring. Each option may
 * carry an `ib_attribute` (kept in the DOM via data-ib-attribute so the mapping
 * stays auditable) and a `reframe` blurb.
 * Contract: render(section, ctx) -> { el, read }.
 *   read() -> { responses: {sectionId: [optionId,...]}, missing: [sectionId] | [] }
 *
 * If max_select is set, selecting that many disables the remaining unchecked
 * boxes (and re-enables them when one is cleared).
 */
import { h, getDoc } from '../dom.js';

export function render(section, ctx) {
  const doc = getDoc(ctx);
  const single = section.max_select === 1;
  const inputType = single ? 'radio' : 'checkbox';

  const boxes = [];
  const optionEls = section.options.map((opt) => {
    const id = `${section.id}-${opt.id}`;
    const attrs = { type: inputType, name: section.id, id, value: opt.id };
    const input = h(doc, 'input', attrs);
    if (opt.ib_attribute) input.setAttribute('data-ib-attribute', opt.ib_attribute);
    boxes.push(input);
    const labelChildren = [opt.label];
    const block = [h(doc, 'div', { class: 'pi-choice' }, [input, h(doc, 'label', { for: id, text: opt.label })])];
    if (opt.reframe) block.push(h(doc, 'p', { class: 'pi-reframe', text: opt.reframe }));
    return h(doc, 'div', { class: 'pi-option' }, block);
  });

  const enforceMax = () => {
    if (single || section.max_select == null) return;
    const checkedCount = boxes.filter((b) => b.checked).length;
    const atMax = checkedCount >= section.max_select;
    for (const b of boxes) b.disabled = atMax && !b.checked;
  };
  if (!single && section.max_select != null) {
    for (const b of boxes) b.addEventListener('change', enforceMax);
  }

  const children = [];
  if (section.title) children.push(h(doc, 'h2', { class: 'pi-section__title', text: section.title }));
  const fieldset = h(doc, 'fieldset', { class: 'pi-commit' }, [
    h(doc, 'legend', { text: section.prompt }),
    ...optionEls,
  ]);
  children.push(fieldset);
  const el = h(doc, 'section', { class: 'pi-section pi-select-and-commit' }, children);

  const read = () => {
    const selected = boxes.filter((b) => b.checked).map((b) => b.value);
    const min = section.min_select != null ? section.min_select : 0;
    const missing = selected.length < min ? [section.id] : [];
    return { responses: { [section.id]: selected }, missing };
  };

  return { el, read };
}
