import {types} from 'node:util';

const fail = (label, pointer, reason) => {
  throw new TypeError(`Invalid current-MM JSON input ${label}${pointer}: ${reason}`);
};

/** Validate ordinary JSON data through property descriptors before any value access or hashing. */
export function assertCurrentMmPlainJson(value, label = 'value') {
  const active = new Set();
  const visit = (node, pointer) => {
    if (node === null || typeof node === 'string' || typeof node === 'boolean') return;
    if (typeof node === 'number') {
      if (Number.isFinite(node) && !Object.is(node, -0)) return;
      fail(label, pointer, 'non-JSON number');
    }
    if (typeof node !== 'object') fail(label, pointer, 'non-JSON scalar');
    if (types.isProxy(node)) fail(label, pointer, 'proxy');
    if (active.has(node)) fail(label, pointer, 'cycle');
    const array = Array.isArray(node);
    if (Object.getPrototypeOf(node) !== (array ? Array.prototype : Object.prototype)
        || Object.getPrototypeOf(Object.prototype) !== null
        || Object.getPrototypeOf(Array.prototype) !== Object.prototype
        || Object.hasOwn(Object.prototype, 'toJSON')
        || Object.hasOwn(Array.prototype, 'toJSON')) fail(label, pointer, 'non-plain prototype or JSON hook');
    const keys = Reflect.ownKeys(node);
    if (array) {
      const length = Object.getOwnPropertyDescriptor(node, 'length');
      if (!length || !Object.hasOwn(length, 'value') || length.value !== node.length
          || !length.writable || length.enumerable || length.configurable
          || keys.length !== node.length + 1 || !keys.includes('length')) fail(label, pointer, 'sparse array or extra property');
    }
    active.add(node);
    for (const key of keys) {
      if (array && key === 'length') continue;
      const descriptor = typeof key === 'string' ? Object.getOwnPropertyDescriptor(node, key) : null;
      if (typeof key !== 'string' || !descriptor?.enumerable || !descriptor.writable || !descriptor.configurable
          || !Object.hasOwn(descriptor, 'value')) fail(label, pointer, 'symbol, hidden property, or accessor');
      if (array && (!/^(0|[1-9]\d*)$/.test(key) || Number(key) >= node.length)) fail(label, pointer, 'sparse array or extra property');
      visit(descriptor.value, `${pointer}/${key.replaceAll('~', '~0').replaceAll('/', '~1')}`);
    }
    active.delete(node);
  };
  visit(value, '');
  return true;
}
