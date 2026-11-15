// Pure, closed-state projection kernel for the proposed S1 -> MM -> H -> V29
// reader. This module does not qualify live/native inputs. Its caller must
// qualify the actual source epoch and freshness pins before invoking it.
import {createHash} from 'node:crypto';
import {types} from 'node:util';

const fail = message => { throw new Error('Invalid class-mapping historical projection: ' + message); };
export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const hash = sha256;
export const objectSha256 = value => sha256(Buffer.from(JSON.stringify(value)));

export function assertPlainJson(value, label, ancestors = new Set()) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || Object.is(value, -0)) fail(label + ': non-JSON number');
    return;
  }
  if (typeof value !== 'object' || types.isProxy(value)) fail(label + ': non-JSON value or proxy');
  if (ancestors.has(value)) fail(label + ': cycle');
  const array = Array.isArray(value);
  if (Object.getPrototypeOf(value) !== (array ? Array.prototype : Object.prototype)
      || Object.getPrototypeOf(Object.prototype) !== null
      || Object.getPrototypeOf(Array.prototype) !== Object.prototype
      || Object.hasOwn(Object.prototype, 'toJSON') || Object.hasOwn(Array.prototype, 'toJSON')) {
    fail(label + ': non-plain prototype or inherited serializer');
  }
  const keys = Reflect.ownKeys(value);
  if (array) {
    const length = Object.getOwnPropertyDescriptor(value, 'length');
    if (!length || !Object.hasOwn(length, 'value') || length.value !== value.length
        || !length.writable || length.enumerable || length.configurable
        || keys.length !== value.length + 1 || !keys.includes('length')) fail(label + ': sparse array or extra property');
  }
  ancestors.add(value);
  for (const key of keys) {
    if (array && key === 'length') continue;
    const descriptor = typeof key === 'string' ? Object.getOwnPropertyDescriptor(value, key) : null;
    if (typeof key !== 'string' || !descriptor?.enumerable || !descriptor.writable || !descriptor.configurable
        || !Object.hasOwn(descriptor, 'value')) fail(label + ': symbol, hidden property, or accessor');
    if (array && (!/^(0|[1-9]\d*)$/.test(key) || Number(key) >= value.length)) fail(label + ': sparse array or extra property');
    assertPlainJson(descriptor.value, label, ancestors);
  }
  ancestors.delete(value);
}

export function copyRawBytes(value, label = 'bytes') {
  if (types.isProxy(value) || !value || typeof value !== 'object') fail(label + ': raw byte input required');
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Buffer.prototype && prototype !== Uint8Array.prototype) fail(label + ': raw byte input must be a Buffer or plain Uint8Array');
  // Use typed-array internal-slot accessors. This keeps large Buffers and
  // offset Uint8Arrays away from Reflect.ownKeys and caller hooks.
  const typedArrayPrototype = Object.getPrototypeOf(Uint8Array.prototype);
  const byteLengthGetter = Object.getOwnPropertyDescriptor(typedArrayPrototype, 'byteLength').get;
  let byteLength;
  try { byteLength = byteLengthGetter.call(value); }
  catch { fail(label + ': detached or invalid typed-array view'); }
  if (!Number.isSafeInteger(byteLength) || byteLength < 0) fail(label + ': invalid typed-array length');
  const copy = new Uint8Array(byteLength);
  try { Uint8Array.prototype.set.call(copy, value); }
  catch { fail(label + ': typed-array bytes could not be copied'); }
  return Buffer.from(copy.buffer, copy.byteOffset, copy.byteLength);
}

function parseJson(bytes, label) {
  try { return JSON.parse(bytes.toString('utf8')); }
  catch { fail(label + ': invalid JSON'); }
}

function assertJsonObject(bytes, expected, label) {
  const value = parseJson(bytes, label);
  assertPlainJson(value, label);
  if (objectSha256(value) !== expected.objectSha256) fail(label + ': parsed-object SHA mismatch');
  return value;
}

function assertHashAndSize(bytes, expected, label) {
  if (!Buffer.isBuffer(bytes) || sha256(bytes) !== expected.sha256 || bytes.length !== expected.sizeBytes) {
    fail(label + ': raw blob SHA/size mismatch');
  }
}

function safeRepoPath(path) {
  if (typeof path !== 'string' || !path || path.startsWith('/') || path.includes('\\')
      || path.split('/').some(part => !part || part === '.' || part === '..')) fail('unsafe repository path');
  return path;
}

/**
 * Build the exact legacy MM -> H -> V29 relation over immutable supplied Git
 * preimages. The four kernel function bodies below are byte-identical copies
 * of the installed ec10 reader. This factory is a projection primitive, not
 * a current-source guard; its installed caller must do per-call qualification.
 */
export function createHistoricalProjectionKernel(input) {
  if (!input || types.isProxy(input) || Object.getPrototypeOf(input) !== Object.prototype) fail('plain constructor data record required');
  const keys = Reflect.ownKeys(input);
  if (keys.length !== 5 || keys.some(key => typeof key !== 'string' || !['rows','hRows','mmBlobFor','hBlobFor','v29BlobFor'].includes(key))) fail('exact constructor keys required');
  for (const key of keys) { const descriptor = Object.getOwnPropertyDescriptor(input,key); if (!descriptor || !Object.hasOwn(descriptor,'value') || !descriptor.enumerable || !descriptor.writable || !descriptor.configurable) fail('constructor accessor/hidden/frozen property'); }
  const {rows: suppliedRows, hRows: suppliedHRows, mmBlobFor, hBlobFor, v29BlobFor} = input;
  assertPlainJson(suppliedRows, 'complete ordered historical rows');
  if (!types.isMap(suppliedHRows) || types.isProxy(suppliedHRows) || Object.getPrototypeOf(suppliedHRows) !== Map.prototype || Reflect.ownKeys(suppliedHRows).length) fail('plain undecorated H row Map required');
  if ([mmBlobFor,hBlobFor,v29BlobFor].some(value => typeof value !== 'function')) fail('fixed immutable preimage readers required');
  const rows = structuredClone(suppliedRows), hRows = new Map();
  Map.prototype.forEach.call(suppliedHRows, (value,key) => { if (typeof key !== 'string') fail('H row path must be a string'); assertPlainJson(value, 'H row'); hRows.set(key, structuredClone(value)); });
  const bridgeRows = new Map(rows.map(row => [safeRepoPath(row.path), row]));
  if (bridgeRows.size !== rows.length || bridgeRows.size !== 22) fail('exact ordered 22-path bridge required');
  if (hRows.size !== 22 || [...hRows.keys()].some(path => !bridgeRows.has(path))) fail('exact same 22 H row paths required');
  for (const [path,row] of bridgeRows) {
    const h = hRows.get(path);
    if (!h || h.path !== path || h.json !== row.json || h.current?.sha256 !== row.historicalH?.sha256 || h.current?.sizeBytes !== row.historicalH?.sizeBytes || h.baseline?.sha256 !== row.version29Baseline?.sha256 || h.baseline?.sizeBytes !== row.version29Baseline?.sizeBytes || (row.json && (h.currentObjectSha256 !== row.historicalH.objectSha256 || h.baselineObjectSha256 !== row.version29Baseline.objectSha256))) fail(path + ': H/V29 whole-state pins disagree');
  }
  const historicalHBlob = row => hBlobFor(row);
  const version29Blob = row => v29BlobFor(row);

  function mmToHBytes(row, bytes) {
    const supplied = copyRawBytes(bytes, row.path);
    if (hash(supplied) === row.currentMm.sha256 && supplied.length === row.currentMm.sizeBytes) return historicalHBlob(row);
    if (hash(supplied) === row.historicalH.sha256 && supplied.length === row.historicalH.sizeBytes) return supplied;
    if (hash(supplied) === row.version29Baseline.sha256 && supplied.length === row.version29Baseline.sizeBytes) return supplied;
    fail(row.path + ': unknown MM/H/Version29 byte state');
  }

  function mmToHJson(row, value) {
    assertPlainJson(value, row.path + ' caller JSON');
    const suppliedSha = hash(Buffer.from(JSON.stringify(value)));
    if (suppliedSha === row.currentMm.objectSha256) return assertJsonObject(historicalHBlob(row), row.historicalH, row.path + ' H JSON');
    if (suppliedSha === row.historicalH.objectSha256 || suppliedSha === row.version29Baseline.objectSha256) return value;
    fail(row.path + ': unknown MM/H/Version29 object state');
  }

  // Frozen Version29 inverse kernel relation: its input is an exact H
  // preimage or Version29 baseline, never unrecognized MM data.
  function version29KernelBytes(path, bytes) {
    const hRow = hRows.get(path);
    if (!hRow) return bytes;
    return hash(bytes) === hRow.current.sha256 ? version29Blob(bridgeRows.get(path)) : bytes;
  }

  function version29KernelJson(path, value) {
    const hRow = hRows.get(path);
    if (!hRow) return value;
    assertPlainJson(value, path + ' frozen inverse input');
    return hRow.json && hash(Buffer.from(JSON.stringify(value))) === hRow.currentObjectSha256
      ? parseJson(version29Blob(bridgeRows.get(path)), path + ' Version29 JSON') : value;
  }

  function rowFor(path) {
    const row = bridgeRows.get(safeRepoPath(path));
    if (!row) fail('path is outside the closed 22-path H bridge');
    return row;
  }

  function normalizeMmBytes(path, bytes, nextCurrent = null) {
    const row = rowFor(path), supplied = copyRawBytes(bytes, row.path);
    if (nextCurrent && hash(supplied) === nextCurrent.sha256 && supplied.length === nextCurrent.sizeBytes) {
      const oldMm = mmBlobFor(row);
      assertHashAndSize(oldMm, row.currentMm, row.path + ' immutable MM snapshot');
      return Buffer.from(oldMm);
    }
    if (hash(supplied) === row.currentMm.sha256 && supplied.length === row.currentMm.sizeBytes) return supplied;
    fail(row.path + ': unknown next/MM byte state');
  }

  function normalizeMmJson(path, value, nextCurrent = null) {
    const row = rowFor(path);
    assertPlainJson(value, row.path + ' caller JSON');
    const suppliedSha = hash(Buffer.from(JSON.stringify(value)));
    if (nextCurrent && suppliedSha === nextCurrent.objectSha256) {
      const oldMm = mmBlobFor(row);
      assertHashAndSize(oldMm, row.currentMm, row.path + ' immutable MM snapshot');
      return assertJsonObject(oldMm, row.currentMm, row.path + ' immutable MM object');
    }
    if (suppliedSha === row.currentMm.objectSha256) return value;
    fail(row.path + ': unknown next/MM object state');
  }

  function normalizeBytes(path, bytes, nextCurrent = null) {
    const row = rowFor(path), supplied = copyRawBytes(bytes, row.path);
    let oldMmInput = supplied;
    if (nextCurrent && sha256(supplied) === nextCurrent.sha256 && supplied.length === nextCurrent.sizeBytes) {
      oldMmInput = mmBlobFor(row);
      assertHashAndSize(oldMmInput, row.currentMm, row.path + ' immutable MM snapshot');
    }
    const historicalH = mmToHBytes(row, oldMmInput);
    return Buffer.from(version29KernelBytes(row.path, historicalH));
  }

  function normalizeJson(path, value, nextCurrent = null) {
    const row = rowFor(path);
    assertPlainJson(value, row.path + ' caller JSON');
    let oldMmInput = value;
    if (nextCurrent && objectSha256(value) === nextCurrent.objectSha256) {
      const bytes = mmBlobFor(row);
      assertHashAndSize(bytes, row.currentMm, row.path + ' immutable MM snapshot');
      oldMmInput = assertJsonObject(bytes, row.currentMm, row.path + ' immutable MM object');
    }
    const historicalH = mmToHJson(row, oldMmInput);
    return version29KernelJson(row.path, historicalH);
  }

  function exactStageBytes(path, stage) {
    const row = rowFor(path);
    if (stage === 'mm') return Buffer.from(mmBlobFor(row));
    if (stage === 'h') return Buffer.from(historicalHBlob(row));
    if (stage === 'v29') return Buffer.from(version29Blob(row));
    fail('historical stage must be mm, h, or v29');
  }

  function exactStageJson(path, stage) {
    const row = rowFor(path), state = stage === 'mm' ? row.currentMm
      : stage === 'h' ? row.historicalH : stage === 'v29' ? row.version29Baseline : null;
    if (!state) fail('historical stage must be mm, h, or v29');
    const bytes = exactStageBytes(path, stage);
    assertHashAndSize(bytes, state, row.path + ' immutable ' + stage + ' preimage');
    return assertJsonObject(bytes, state, row.path + ' immutable ' + stage + ' object');
  }

  return Object.freeze({normalizeMmBytes, normalizeMmJson, normalizeBytes, normalizeJson,
    exactStageBytes, exactStageJson, isMappedPath: path => typeof path === 'string' && bridgeRows.has(path)});
}

// These are the only legacy facade literal states carried forward. Callers
// must use the separate helper only after the normal qualified bridge rejected
// an exact unsupported state; this helper never widens another path/digest.
export const LEGACY_FACADE_LITERAL_STATES = Object.freeze([
  Object.freeze({path: 'dist/data.json', objectSha256: '00c7794cc7a8e888cfdc524291da7269226d98bfc216c4d9c8bcd5ac0c7e3250', meaning: 'DMG175 predecessor'}),
  Object.freeze({path: 'dist/data.json', objectSha256: 'fac1edee2865650e938833bf1c30a6b456bb8122fe3ae0a79fe6c9ff8d4840d9', meaning: 'A65 released-state no-op'}),
]);

