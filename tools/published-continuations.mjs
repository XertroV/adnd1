import {createHash} from 'node:crypto';
import {validateContinuationManifest} from './continuation-contract.mjs';

const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const relationshipKinds = new Set(['cross-reference', 'editorial-comparison', 'similarity', 'related-source-rules']);

function validatedRelationship(value, groupId) {
  if (value === undefined) return undefined;
  if (!value || typeof value !== 'object' || Array.isArray(value)
      || !relationshipKinds.has(value.kind)
      || typeof value.label !== 'string' || !value.label.trim() || value.label.length > 160
      || typeof value.reason !== 'string' || !value.reason.trim() || value.reason.length > 600
      || !value.ownerPage || typeof value.ownerPage !== 'object' || Array.isArray(value.ownerPage)
      || !['PHB', 'UA', 'DMG'].includes(value.ownerPage.book)
      || !Number.isInteger(value.ownerPage.printedPage) || value.ownerPage.printedPage < 1) {
    throw new Error(`${groupId} has an invalid owner-passage relationship`);
  }
  return {
    kind: value.kind,
    label: value.label.trim(),
    reason: value.reason.trim(),
    ownerPage: {book: value.ownerPage.book, printedPage: value.ownerPage.printedPage},
  };
}

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
    groups: manifest.groups.map(group => {
      const relationship = validatedRelationship(group.relationship, group.id);
      return {
        id: group.id, collection: group.collection, itemId: group.itemId, catalog: group.catalog,
        ...(relationship ? {relationship} : {}),
        segments: [...group.segments].sort((a, b) => a.order - b.order).map(segment => ({
          ...Object.fromEntries(fields.map(field => [field, segment[field]])),
          ...(segment.sourceArtifactId === 'dmg175-user-confirmed-supplement' ? {sourceArtifactId:segment.sourceArtifactId,sourceIdentityKind:segment.sourceIdentityKind,canonicalPdfSha256:segment.canonicalPdfSha256} : {}),
          ...(Array.isArray(segment.focusAliasRegionIds) ? {focusAliasRegionIds:[...segment.focusAliasRegionIds]} : {}),
          ...(segment.state === 'blocked-source-unavailable' ? {reason: segment.reason} : {}),
        })),
      };
    }),
  };
}
