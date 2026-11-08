import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const root = resolve(import.meta.dirname, '..');
export const monetarySourceRenderFrameRegistry = Object.freeze({
  path: 'research/monetary-source-render-frames.json',
  sha256: '29e0ee3ae3cdaf304b67ca99fe7c51a391e7a1b44b63f12aa9258ce02fed3af7',
});
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
let verified;

export function loadMonetarySourceRenderFrames() {
  if (!verified) {
    const bytes = readFileSync(resolve(root, monetarySourceRenderFrameRegistry.path));
    if (sha(bytes) !== monetarySourceRenderFrameRegistry.sha256) throw Error('Reviewed monetary source-frame registry hash mismatch.');
    const registry = JSON.parse(bytes);
    if (registry.schemaVersion !== 1 || registry.artifactType !== 'independently-reviewed-monetary-source-render-frame-registry'
        || registry.frames?.length !== 22 || registry.sourceEvidence?.length !== 2
        || new Set(registry.frames.map(frame => frame.sourceRenderSha256)).size !== 22) throw Error('Invalid reviewed monetary source-frame registry.');
    for (const reference of registry.sourceEvidence) {
      if (!/^research\/[a-zA-Z0-9._-]+\.json$/.test(reference.path)
          || sha(readFileSync(resolve(root, reference.path))) !== reference.sha256) throw Error('Reviewed monetary source-frame evidence hash mismatch.');
    }
    verified = registry;
  }
  return structuredClone(verified);
}

// A render hash identifies measured pixels. All location and dimension fields
// must match too; a known render with a changed location is a conflict.
export function resolveMonetarySourceRenderFrame(identity) {
  const registry = loadMonetarySourceRenderFrames();
  const frame = registry.frames.find(frame => frame.sourceRenderSha256 === identity?.sourceRenderSha256);
  const provenance = {...monetarySourceRenderFrameRegistry};
  if (!frame) return {status: 'unknown-render', registry: provenance};
  const keys = ['book', 'printedPage', 'pdfPage', 'sourcePdfSha256', 'sourceRenderSha256'];
  const mismatchedFields = keys.filter(key => identity?.[key] !== frame[key]);
  if (JSON.stringify(identity?.sourceRenderDimensionsPx) !== JSON.stringify(frame.sourceRenderDimensionsPx)) mismatchedFields.push('sourceRenderDimensionsPx');
  return mismatchedFields.length
    ? {status: 'conflicting-render-identity', registry: provenance, frame, mismatchedFields}
    : {status: 'matched', registry: provenance, frame};
}
