import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {attachSourceVisualReviewMetadata} from '../../tools/price-source-inventory.mjs';

const root = process.cwd();
const base = 'research/ua-class-guidance-context-proposal-v7-clean';
const candidate = JSON.parse(readFileSync(resolve(root, `${base}/proposal.json`), 'utf8'));
const override = JSON.parse(readFileSync(resolve(root, `${base}/prospective-citation-overrides.json`), 'utf8'));
const current = JSON.parse(readFileSync(resolve(root, 'dist/data.json'), 'utf8'));
const ids = candidate.catalogs.map(item => item.prospectivePath.split('/').at(-1).replace(/^classes-|\.json$/g, ''));
const targetIds = new Set(ids);
const data = {classes: current.classes.filter(item => targetIds.has(item.id)).map(item => structuredClone(item))};
if (data.classes.length !== candidate.catalogs.length) throw new Error('candidate class owner set differs from current data');

const catalogs = new Map();
for (const record of candidate.catalogs) {
  const catalog = JSON.parse(readFileSync(resolve(root, record.prospectivePath), 'utf8'));
  if (createHash('sha256').update(readFileSync(resolve(root, record.prospectivePath))).digest('hex') !== record.afterSha256) {
    throw new Error(`candidate catalog hash changed: ${record.path}`);
  }
  catalogs.set(record.path.replace(/^dist\//, ''), catalog);
}
const oldLinks = new Map();
for (const item of data.classes) {
  const old = structuredClone(item.sourceExcerpts);
  const proposed = structuredClone(override.sourceExcerpts[`classes:${item.id}`]);
  for (const key of Object.keys(old)) {
    if (key !== 'regionCount' && key !== 'regionReviews' && JSON.stringify(old[key]) !== JSON.stringify(proposed[key])) {
      throw new Error(`non-count sourceExcerpts field changed for ${item.id}: ${key}`);
    }
  }
  oldLinks.set(item.id, old);
  item.sourceExcerpts = proposed;
}

attachSourceVisualReviewMetadata(data, {catalogs});

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}
const hash = value => createHash('sha256').update(canonical(value)).digest('hex');
const ownerLinkKeys = ['fighter', 'ranger', 'ua-cavalier', 'ua-paladin', 'ua-barbarian', 'ua-thief-acrobat', 'ua-druid'];
const links = [];
for (const item of data.classes) {
  const old = oldLinks.get(item.id);
  const next = item.sourceExcerpts;
  const oldCatalog = JSON.parse(readFileSync(resolve(root, `dist/${old.catalog}`), 'utf8'));
  const oldById = new Map(oldCatalog.regions.map(region => [region.id, region]));
  const nextCatalog = catalogs.get(next.catalog);
  const oldIds = new Set(oldById.keys());
  const nextIds = new Set(nextCatalog.regions.map(region => region.id));
  if (old.regionCount !== oldById.size || next.regionCount !== nextCatalog.regions.length) throw new Error(`regionCount does not match catalog for ${item.id}`);
  if ([...oldIds].some(id => !nextIds.has(id))) throw new Error(`old catalog regions were removed for ${item.id}`);
  const beforeReviews = new Map((old.regionReviews || []).map(review => [review.regionId, review]));
  const afterReviews = new Map((next.regionReviews || []).map(review => [review.regionId, review]));
  for (const [id, review] of beforeReviews) {
    if (JSON.stringify(review) !== JSON.stringify(afterReviews.get(id))) throw new Error(`old region review changed for ${item.id}#${id}`);
  }
  const addedReviewRows = [...nextIds].filter(id => !oldIds.has(id)).map(id => afterReviews.get(id));
  if (addedReviewRows.some(review => !review || !['unreviewed', 'unreviewed-full-image-sentinel'].includes(review.status))) {
    throw new Error(`new context row received an unexpected review status for ${item.id}`);
  }
  links.push({
    ownerId: item.id,
    catalog: next.catalog,
    oldRegionCount: old.regionCount,
    newRegionCount: next.regionCount,
    oldOwnerSourceLinkSha256: hash(old),
    newOwnerSourceLinkSha256: hash(next),
    oldRegionReviewsPreserved: beforeReviews.size,
    addedRegionReviewIds: addedReviewRows.map(review => review.regionId),
    addedRegionReviewStatuses: [...new Set(addedReviewRows.map(review => review.status))].sort(),
    nonCountMetadataExact: true,
    noOldReviewOrGradeChanged: true,
  });
}
if (links.map(link => link.ownerId).sort().join('|') !== [...ownerLinkKeys].sort().join('|')) throw new Error('owner link census mismatch');

const bridgePath = resolve(root, 'research/source-frame-coordinate-bridge-phb-source-v1.json');
const bridge = JSON.parse(readFileSync(bridgePath, 'utf8'));
const bridgeRows = bridge.frames.flatMap(frame => frame.regions);
for (const row of bridgeRows) {
  const link = links.find(item => item.ownerId === row.owner.itemId);
  if (!link) continue;
  if (hash(oldLinks.get(row.owner.itemId)) !== row.ownerSourceLinkSha256) {
    throw new Error(`current owner source-link hash does not match bridge for ${row.owner.itemId}#${row.regionId}`);
  }
}

const output = {
  schemaVersion: 1,
  artifactType: 'ua-class-guidance-v7-current-owner-link-replay',
  status: 'Research-only exact owner-link replay; no current data or registry changed',
  inputPins: {
    currentDataSha256: createHash('sha256').update(readFileSync(resolve(root, 'dist/data.json'))).digest('hex'),
    sourceVisualReviewsSha256: createHash('sha256').update(readFileSync(resolve(root, 'research/source-visual-reviews.json'))).digest('hex'),
    activeFrameBridgePath: 'research/source-frame-coordinate-bridge-phb-source-v1.json',
    activeFrameBridgeSha256: createHash('sha256').update(readFileSync(bridgePath)).digest('hex'),
  },
  scope: {owners: 7, candidateRegions: 32, candidateRegionCountsOnlyBeforeGeneratedReviewMetadata: true},
  owners: links,
  validation: {
    allExistingBridgeOwnerLinkHashesMatchCurrentData: true,
    allOldRegionReviewsExact: true,
    allNewRegionReviewsUnreviewed: true,
    noFieldGradeOrSemanticStatusPromotion: true,
  },
};
const outPath = resolve(root, `${base}/owner-link-replay.json`);
writeFileSync(outPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify({output: outPath, owners: links.length, changedBridgeOwners: links.filter(link => bridgeRows.some(row => row.owner.itemId === link.ownerId)).length, sha256: createHash('sha256').update(readFileSync(outPath)).digest('hex')}, null, 2));
