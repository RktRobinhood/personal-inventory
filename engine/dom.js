/**
 * dom.js — tiny hyperscript + DOM helpers shared by the section renderers.
 * No DOM access at module load (importable in Node); all helpers take or
 * resolve a `doc` only when called.
 */

// Keys set as element PROPERTIES (not attributes) — matters for form controls.
const PROPS = new Set(['value', 'checked', 'type', 'name', 'id', 'disabled', 'htmlFor', 'textContent', 'className']);

/** Resolve the document: explicit ctx.doc, else global document, else throw. */
export function getDoc(ctx) {
  if (ctx && ctx.doc) return ctx.doc;
  if (typeof document !== 'undefined') return document;
  throw new Error('no document available — pass ctx.doc when rendering outside a browser');
}

/**
 * h(doc, tag, attrs, children) — create an element.
 *  - `class` -> className, `for` -> htmlFor, `text` -> textContent
 *  - `onX` function -> addEventListener('x', fn)
 *  - known form keys (value/checked/type/name/id/disabled) -> set as property
 *  - everything else -> setAttribute (boolean true -> empty attr; false/null -> skip)
 * children: a node, a string, or an array thereof.
 */
export function h(doc, tag, attrs = {}, children = []) {
  const node = doc.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'for') node.htmlFor = v;
    else if (k === 'text') node.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (PROPS.has(k)) node[k] = v;
    else if (v === true) node.setAttribute(k, '');
    else node.setAttribute(k, v);
  }
  const kids = Array.isArray(children) ? children : [children];
  for (const c of kids) {
    if (c == null) continue;
    node.appendChild(typeof c === 'string' ? doc.createTextNode(c) : c);
  }
  return node;
}

/** Split a body string into paragraphs on blank lines. */
export function paragraphs(text) {
  return String(text).split(/\n{2,}/).map((s) => s.trim()).filter(Boolean);
}
