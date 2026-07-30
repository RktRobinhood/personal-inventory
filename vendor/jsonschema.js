/**
 * jsonschema.js — a compact, dependency-free JSON Schema (draft-07 subset) validator.
 *
 * Vendored (BUILD.md: "vendor a standalone validator into vendor/ — no install
 * step required at runtime"). We implement exactly the keywords the project's
 * two schemas use, rather than pulling Ajv + its dependency tree over the network.
 * The project stays fully self-contained and no-build.
 *
 * Supported keywords:
 *   $ref (local "#/..." pointers), $defs/definitions,
 *   type, const, enum,
 *   string:  minLength, maxLength, pattern,
 *   number:  minimum, maximum, exclusiveMinimum, exclusiveMaximum, multipleOf,
 *   array:   minItems, maxItems, items (single subschema),
 *   object:  required, properties, additionalProperties (bool|schema),
 *            minProperties, maxProperties,
 *   logic:   allOf, anyOf, oneOf, not, if/then/else.
 *
 * Returns { valid: boolean, errors: [{ path, message }] }.
 *
 * Usage:
 *   import { validate } from '../vendor/jsonschema.js';
 *   const { valid, errors } = validate(schema, data);
 */

function typeOf(v) {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  return typeof v; // 'object' | 'string' | 'number' | 'boolean' | 'undefined'
}

function matchesType(v, t) {
  switch (t) {
    case 'object': return v !== null && typeof v === 'object' && !Array.isArray(v);
    case 'array': return Array.isArray(v);
    case 'string': return typeof v === 'string';
    case 'number': return typeof v === 'number' && !Number.isNaN(v);
    case 'integer': return typeof v === 'number' && Number.isInteger(v);
    case 'boolean': return typeof v === 'boolean';
    case 'null': return v === null;
    default: return false;
  }
}

function deepEqual(a, b) {
  if (a === b) return true;
  const ta = typeOf(a), tb = typeOf(b);
  if (ta !== tb) return false;
  if (ta === 'array') {
    if (a.length !== b.length) return false;
    return a.every((x, i) => deepEqual(x, b[i]));
  }
  if (ta === 'object') {
    const ka = Object.keys(a), kb = Object.keys(b);
    if (ka.length !== kb.length) return false;
    return ka.every((k) => Object.prototype.hasOwnProperty.call(b, k) && deepEqual(a[k], b[k]));
  }
  return false;
}

function resolveRef(ref, root) {
  if (!ref.startsWith('#')) throw new Error(`unsupported $ref (only local pointers): ${ref}`);
  const pointer = ref.slice(1); // e.g. "/$defs/section"
  if (pointer === '' || pointer === '/') return root;
  const parts = pointer.split('/').slice(1).map((p) => p.replace(/~1/g, '/').replace(/~0/g, '~'));
  let node = root;
  for (const p of parts) {
    if (node == null || !Object.prototype.hasOwnProperty.call(node, p)) {
      throw new Error(`$ref not found: ${ref}`);
    }
    node = node[p];
  }
  return node;
}

function validateNode(schema, data, root, path, errors) {
  if (schema === true) return;
  if (schema === false) { errors.push({ path, message: 'schema is false (nothing valid)' }); return; }
  if (typeof schema !== 'object' || schema === null) return;

  if (schema.$ref) {
    validateNode(resolveRef(schema.$ref, root), data, root, path, errors);
    // draft-07: a $ref sibling keywords are ignored; our schemas don't rely on siblings.
    return;
  }

  // type
  if (schema.type !== undefined) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!types.some((t) => matchesType(data, t))) {
      errors.push({ path, message: `expected type ${types.join('|')}, got ${typeOf(data)}` });
      return; // further keyword checks assume the type; bail to avoid noise
    }
  }

  // const / enum
  if (Object.prototype.hasOwnProperty.call(schema, 'const') && !deepEqual(data, schema.const)) {
    errors.push({ path, message: `expected const ${JSON.stringify(schema.const)}` });
  }
  if (schema.enum && !schema.enum.some((e) => deepEqual(data, e))) {
    errors.push({ path, message: `value not in enum ${JSON.stringify(schema.enum)}` });
  }

  // string
  if (typeof data === 'string') {
    if (schema.minLength !== undefined && data.length < schema.minLength) {
      errors.push({ path, message: `string shorter than minLength ${schema.minLength}` });
    }
    if (schema.maxLength !== undefined && data.length > schema.maxLength) {
      errors.push({ path, message: `string longer than maxLength ${schema.maxLength}` });
    }
    if (schema.pattern !== undefined && !new RegExp(schema.pattern).test(data)) {
      errors.push({ path, message: `string does not match pattern ${schema.pattern}` });
    }
  }

  // number
  if (typeof data === 'number') {
    if (schema.minimum !== undefined && data < schema.minimum) {
      errors.push({ path, message: `number < minimum ${schema.minimum}` });
    }
    if (schema.maximum !== undefined && data > schema.maximum) {
      errors.push({ path, message: `number > maximum ${schema.maximum}` });
    }
    if (schema.exclusiveMinimum !== undefined && data <= schema.exclusiveMinimum) {
      errors.push({ path, message: `number <= exclusiveMinimum ${schema.exclusiveMinimum}` });
    }
    if (schema.exclusiveMaximum !== undefined && data >= schema.exclusiveMaximum) {
      errors.push({ path, message: `number >= exclusiveMaximum ${schema.exclusiveMaximum}` });
    }
    if (schema.multipleOf !== undefined && data % schema.multipleOf !== 0) {
      errors.push({ path, message: `number not a multiple of ${schema.multipleOf}` });
    }
  }

  // array
  if (Array.isArray(data)) {
    if (schema.minItems !== undefined && data.length < schema.minItems) {
      errors.push({ path, message: `array shorter than minItems ${schema.minItems}` });
    }
    if (schema.maxItems !== undefined && data.length > schema.maxItems) {
      errors.push({ path, message: `array longer than maxItems ${schema.maxItems}` });
    }
    if (schema.items !== undefined) {
      data.forEach((item, i) => validateNode(schema.items, item, root, `${path}[${i}]`, errors));
    }
  }

  // object
  if (data !== null && typeof data === 'object' && !Array.isArray(data)) {
    const keys = Object.keys(data);
    if (Array.isArray(schema.required)) {
      for (const req of schema.required) {
        if (!Object.prototype.hasOwnProperty.call(data, req)) {
          errors.push({ path, message: `missing required property "${req}"` });
        }
      }
    }
    if (schema.minProperties !== undefined && keys.length < schema.minProperties) {
      errors.push({ path, message: `fewer than minProperties ${schema.minProperties}` });
    }
    if (schema.maxProperties !== undefined && keys.length > schema.maxProperties) {
      errors.push({ path, message: `more than maxProperties ${schema.maxProperties}` });
    }
    const props = schema.properties || {};
    for (const [k, v] of Object.entries(data)) {
      if (Object.prototype.hasOwnProperty.call(props, k)) {
        validateNode(props[k], v, root, `${path}.${k}`, errors);
      } else if (schema.additionalProperties === false) {
        errors.push({ path: `${path}.${k}`, message: 'additional property not allowed' });
      } else if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
        validateNode(schema.additionalProperties, v, root, `${path}.${k}`, errors);
      }
    }
  }

  // combinators
  if (Array.isArray(schema.allOf)) {
    for (const sub of schema.allOf) validateNode(sub, data, root, path, errors);
  }
  if (Array.isArray(schema.anyOf)) {
    const ok = schema.anyOf.some((sub) => countErrors(sub, data, root) === 0);
    if (!ok) errors.push({ path, message: 'value matches none of anyOf' });
  }
  if (Array.isArray(schema.oneOf)) {
    const passing = schema.oneOf.filter((sub) => countErrors(sub, data, root) === 0).length;
    if (passing !== 1) errors.push({ path, message: `value must match exactly one of oneOf (matched ${passing})` });
  }
  if (schema.not !== undefined) {
    if (countErrors(schema.not, data, root) === 0) errors.push({ path, message: 'value must NOT match "not" schema' });
  }

  // if / then / else
  if (schema.if !== undefined) {
    const ifOk = countErrors(schema.if, data, root) === 0;
    if (ifOk && schema.then !== undefined) validateNode(schema.then, data, root, path, errors);
    if (!ifOk && schema.else !== undefined) validateNode(schema.else, data, root, path, errors);
  }
}

/** Count errors for a subschema in isolation (used by combinators). */
function countErrors(schema, data, root) {
  const errs = [];
  validateNode(schema, data, root, '$', errs);
  return errs.length;
}

/** Validate `data` against `schema`. Returns { valid, errors }. */
export function validate(schema, data) {
  const errors = [];
  validateNode(schema, data, schema, '$', errors);
  return { valid: errors.length === 0, errors };
}
