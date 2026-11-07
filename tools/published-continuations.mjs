import {createHash} from 'node:crypto';
import {validateContinuationManifest} from './continuation-contract.mjs';

const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');

// Publish only the declared excerpt joins. Full source files and review notes
// are not part of this browser projection.
export function buildPublishedContinuations({manifest, data, catalogRoot}) {
  const validation = validateContinuationManifest(manifest, {data, catalogRoot});
  const fields = ['order', 'role', 'book', 'printedPage', 'pdfPage', 'regionId', 'image', 'imageSha256', 'sourceSha256', 'state'];
  return {
    schemaVersion: 1,
    parsedManifestSha256: hash(manifest),
    parsedDataSha256: hash(data),
    scope: 'Only source-reviewed declared passage parts are linked. Unknown continuations remain unassessed. A passage link does not establish field values or precise highlights.',
    counts: {groups: validation.groups, segments: validation.segments, present: validation.presentSegments, blocked: validation.blockedSegments},
    groups: manifest.groups.map(group => ({
      id: group.id, collection: group.collection, itemId: group.itemId, catalog: group.catalog,
      segments: [...group.segments].sort((a, b) => a.order - b.order).map(segment => ({
        ...Object.fromEntries(fields.map(field => [field, segment[field]])),
        ...(segment.state === 'blocked-source-unavailable' ? {reason: segment.reason} : {}),
      })),
    })),
  };
}
