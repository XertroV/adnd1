import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {dirname, isAbsolute, relative, resolve, sep} from 'node:path';
import {isDeepStrictEqual} from 'node:util';
import books from '../dist/books.js';
import {auditContinuationOrder} from './continuation-order-audit.mjs';
import {sourceVisualRegionHashes} from './price-source-inventory.mjs';

const ASSASSIN_XP_APPEND_TRANSFER_PATH = 'research/source-audit-batch6-assassin-xp-catalog-append-transfer.json';
const ASSASSIN_XP_APPEND_TRANSFER_SHA256 = '610ffa96f6ce3273acb778a0a28fafe31d53f331a00e834909547c5e46ce8e68';
const ASSASSIN_XP_AUTHOR_PROPOSAL_PATH = 'research/source-audit-batch6-phb74-xp-source-target-proposal.json';
const ASSASSIN_XP_AUTHOR_PROPOSAL_SHA256 = '87123a31f1ff10801b28088a47a46ddc88c712bd276f6ed782f307722dd938cb';
const ASSASSIN_XP_INDEPENDENT_REVIEW_PATH = 'research/source-audit-batch6-phb74-xp-independent-review.json';
const ASSASSIN_XP_INDEPENDENT_REVIEW_SHA256 = '5fb0bdb1666d219062372f098f65326b5373ddaf26e627afd43e2310c52aa46f';
const ASSASSIN_XP_PEER_JOIN_PATH = 'research/source-audit-batch6-assassin-xp-peer-pointer-join.json';
const ASSASSIN_XP_PEER_JOIN_SHA256 = 'b334d11f4cbad8e9558aa394242ce1a14c1a2d644b2178bd97b3f3d7cba37acf';
const ASSASSIN_XP_TARGET_REVIEW_PATH = 'research/source-audit-batch6-assassin-xp-target-review-v2.json';
const ASSASSIN_XP_TARGET_REVIEW_SHA256 = 'd1f8bc23dd863b3efebf70e1969d54aa6da2381480c5c2b366e88391ec891e5e';
const ASSASSIN_XP_BASELINE_COMMIT = 'b90d31762611acc96895c66a9e8697360b39182a';
const ASSASSIN_XP_BASELINE_GIT_BLOB = '0e0ba89623493f1d3014bb1fbc00e361033d6cbf';
const ASSASSIN_XP_BASELINE_CATALOG_SHA256 = '65870ea210206565c5a367fb8d54512a95fd38d387ff901843feeb9fda28a9b3';
const ASSASSIN_XP_CURRENT_CATALOG_SHA256 = 'a1af57a383a53117be4ef2cbef0cf1bb4ed06c3017632a9351862f4a817f8291';
const ASSASSIN_XP_COUNT = 15;

function requireValue(condition, message) {
  if (!condition) throw new Error(message);
}

function safePath(root, path, description) {
  requireValue(typeof path === 'string' && path.length > 0, `${description} path is missing`);
  const absoluteRoot = resolve(root);
  const absolutePath = resolve(absoluteRoot, path);
  const rel = relative(absoluteRoot, absolutePath);
  requireValue(rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel), `${description} escapes its root`);
  return absolutePath;
}

function readJson(root, path, description) {
  try {
    return JSON.parse(readFileSync(safePath(root, path, description), 'utf8'));
  } catch (error) {
    if (error instanceof SyntaxError) throw new Error(`${description} is not valid JSON`);
    throw error;
  }
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value !== null && typeof value === 'object') return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}

function gitBlobSha1(bytes) {
  return createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
}

function pointerValue(value, pointer) {
  return pointer.split('/').slice(1).map(part => part.replaceAll('~1', '/').replaceAll('~0', '~'))
    .reduce((current, part) => current?.[Array.isArray(current) ? Number(part) : part], value);
}

function readPinnedJson(repositoryRoot, reference, description) {
  const bytes = readFileSync(safePath(repositoryRoot, reference.path, description));
  requireValue(reference.sha256 === sha256(bytes), `${description} file hash is stale`);
  try {
    return JSON.parse(bytes.toString('utf8'));
  } catch (error) {
    if (error instanceof SyntaxError) throw new Error(`${description} is not valid JSON`);
    throw error;
  }
}

function validateAssassinXpAppendTransfer(record, catalog, catalogBytes, catalogRoot) {
  const repositoryRoot = resolve(import.meta.dirname, '..');
  const transferBytes = readFileSync(safePath(repositoryRoot, ASSASSIN_XP_APPEND_TRANSFER_PATH, 'Assassin XP catalog transfer'));
  requireValue(sha256(transferBytes) === ASSASSIN_XP_APPEND_TRANSFER_SHA256, 'Assassin XP catalog transfer receipt hash is stale');
  const transfer = JSON.parse(transferBytes.toString('utf8'));
  requireValue(transfer.schemaVersion === 1 && transfer.artifactType === 'assassin-xp-append-only-catalog-transfer', 'Unsupported Assassin XP catalog transfer receipt');
  requireValue(transfer.scope === 'Transfers only exact Assassin XP-row target identities and cell-focus regions. It does not upgrade numeric/source-value grades, historical crop/context/default-selection findings, or any other finding.', 'Assassin XP transfer scope changed');

  const baseline = transfer.baseline;
  const current = transfer.current;
  const expectedCatalogPath = `dist/${record.catalog}`;
  requireValue(baseline?.commit === ASSASSIN_XP_BASELINE_COMMIT && baseline.catalogPath === expectedCatalogPath && baseline.gitBlobSha1 === ASSASSIN_XP_BASELINE_GIT_BLOB && baseline.catalogSha256 === ASSASSIN_XP_BASELINE_CATALOG_SHA256, 'Assassin XP transfer baseline identity changed');
  requireValue(current?.catalogPath === expectedCatalogPath && current.catalogSha256 === ASSASSIN_XP_CURRENT_CATALOG_SHA256 && current.regionCount === catalog.regions.length && current.appendedRegionCount === ASSASSIN_XP_COUNT, 'Assassin XP transfer current catalog identity changed');
  requireValue(sha256(catalogBytes) === current.catalogSha256, 'Assassin current catalog bytes do not match the append-only transfer');

  let baselineBytes;
  try {
    baselineBytes = execFileSync('git', ['show', `${baseline.commit}:${baseline.catalogPath}`], {cwd: repositoryRoot, maxBuffer: 16 * 1024 * 1024});
  } catch {
    throw new Error('Assassin XP baseline Git catalog object is unavailable');
  }
  requireValue(gitBlobSha1(baselineBytes) === baseline.gitBlobSha1 && sha256(baselineBytes) === baseline.catalogSha256, 'Assassin XP baseline Git catalog hashes changed');
  const baselineCatalog = JSON.parse(baselineBytes.toString('utf8'));
  requireValue(baselineCatalog.collection === 'classes' && baselineCatalog.itemId === 'assassin', 'Assassin XP baseline catalog owner changed');
  requireValue(baselineCatalog.regions.length === ASSASSIN_XP_COUNT && Array.isArray(baseline.regionIds) && isDeepStrictEqual(baseline.regionIds, baselineCatalog.regions.map(region => region.id)), 'Assassin XP baseline region inventory changed');
  requireValue(isDeepStrictEqual({...catalog, regions: undefined}, {...baselineCatalog, regions: undefined}), 'Assassin catalog metadata changed outside the append-only region list');
  requireValue(isDeepStrictEqual(catalog.regions.slice(0, baselineCatalog.regions.length), baselineCatalog.regions), 'Assassin catalog no longer preserves every old region and metadata byte-for-byte');
  requireValue(catalog.regions.length === baselineCatalog.regions.length + ASSASSIN_XP_COUNT, 'Assassin catalog must append exactly the reviewed XP regions');
  requireValue(record.catalogSha256 === baseline.catalogSha256, 'Historical Assassin audit must stay bound to its original catalog hash');
  requireValue(record.regions.length === baselineCatalog.regions.length && isDeepStrictEqual(record.regions.map(region => region.regionId), baseline.regionIds), 'Historical Assassin audit must retain its exact original region scope');

  const references = transfer.sourceEvidence;
  requireValue(isDeepStrictEqual(references, {
    authorProposal: {path: ASSASSIN_XP_AUTHOR_PROPOSAL_PATH, sha256: ASSASSIN_XP_AUTHOR_PROPOSAL_SHA256},
    independentReview: {path: ASSASSIN_XP_INDEPENDENT_REVIEW_PATH, sha256: ASSASSIN_XP_INDEPENDENT_REVIEW_SHA256},
    peerPointerJoin: {path: ASSASSIN_XP_PEER_JOIN_PATH, sha256: ASSASSIN_XP_PEER_JOIN_SHA256},
    normalizedTargetReview: {path: ASSASSIN_XP_TARGET_REVIEW_PATH, sha256: ASSASSIN_XP_TARGET_REVIEW_SHA256},
  }), 'Assassin XP source review references changed');
  const authorProposal = readPinnedJson(repositoryRoot, references.authorProposal, 'Assassin XP author proposal');
  const independentReview = readPinnedJson(repositoryRoot, references.independentReview, 'Assassin XP independent review');
  const peerJoin = readPinnedJson(repositoryRoot, references.peerPointerJoin, 'Assassin XP peer-pointer join');
  const targetReview = readPinnedJson(repositoryRoot, references.normalizedTargetReview, 'Assassin XP normalized target review');
  requireValue(authorProposal.artifactType === 'batch6-phb-five-class-xp74-source-target-proposal' && independentReview.artifactType === 'independent-private-PHB74-XP-source-identity-focus-and-conditional-context-review', 'Assassin XP source review types changed');
  requireValue(independentReview.reviewer && independentReview.reviewer !== authorProposal.author && independentReview.result.includes('All74 printed row identities'), 'Assassin XP independent-review identity or denominator changed');
  requireValue(independentReview.sourcePdf?.sha256 === baselineCatalog.sources?.PHB?.sha256 && peerJoin.sourceReviewSha256 === references.independentReview.sha256, 'Assassin XP review source identity changed');
  requireValue(peerJoin.artifactType === 'transparent-XP-independent-peer-pointer-normalization-join' && Array.isArray(peerJoin.records) && peerJoin.records.length === ASSASSIN_XP_COUNT, 'Assassin XP peer-pointer join denominator changed');
  requireValue(targetReview.schemaVersion === 1 && targetReview.artifactType === 'class-xp-row-target-review' && Array.isArray(targetReview.reviewedTargets) && targetReview.reviewedTargets.length === ASSASSIN_XP_COUNT, 'Assassin XP target-review denominator changed');
  requireValue(Array.isArray(transfer.appendedTargets) && transfer.appendedTargets.length === ASSASSIN_XP_COUNT, 'Assassin XP transfer target denominator changed');

  const actualAppendedIds = catalog.regions.slice(baselineCatalog.regions.length).map(region => region.id);
  const receiptIds = transfer.appendedTargets.map(target => target.regionId);
  requireValue(new Set(actualAppendedIds).size === ASSASSIN_XP_COUNT && isDeepStrictEqual(actualAppendedIds, receiptIds), 'Assassin catalog appended region order or identity changed');
  const oldContextIds = new Set(baselineCatalog.regions.map(region => region.id));
  for (const [index, receiptTarget] of transfer.appendedTargets.entries()) {
    const level = index + 1;
    const proposalIndex = 42 + index;
    const independentPointer = `/rowVerdicts/${proposalIndex}`;
    const proposalPointer = `/rows/${proposalIndex}`;
    const peerPointer = `/records/${index}`;
    const authorRow = pointerValue(authorProposal, proposalPointer);
    const peerVerdict = pointerValue(independentReview, independentPointer);
    const peerRecord = pointerValue(peerJoin, peerPointer);
    const reviewedTarget = targetReview.reviewedTargets[index];
    const region = catalog.regions[baselineCatalog.regions.length + index];
    const candidateRegion = authorRow?.candidateRegion;
    const expectedIdentity = {
      kind: 'class-xp-row', collection: 'classes', itemId: 'assassin',
      fieldPointer: `/xpRows/${index}`, sourceObjectPointer: `/xpRows/${index}`,
      value: authorRow?.currentIdentityTuple,
    };
    requireValue(receiptTarget.level === level && receiptTarget.fieldPointer === expectedIdentity.fieldPointer && receiptTarget.sourceObjectPointer === expectedIdentity.sourceObjectPointer, `Assassin XP transfer row ${level} pointer changed`);
    requireValue(isDeepStrictEqual(receiptTarget.value, expectedIdentity.value) && isDeepStrictEqual(reviewedTarget?.expectedTargetIdentity, expectedIdentity), `Assassin XP transfer row ${level} current identity changed`);
    requireValue(authorRow?.collection === 'classes' && authorRow.itemId === 'assassin' && authorRow.fieldPointer === expectedIdentity.fieldPointer && authorRow.sourceObjectPointer === expectedIdentity.sourceObjectPointer && authorRow.sourceCategory === 'class-xp-row', `Assassin XP author row ${level} source identity changed`);
    requireValue(authorRow?.physicalSourceRowId === receiptTarget.sourceRowId && candidateRegion?.id === receiptTarget.regionId, `Assassin XP author row ${level} source region changed`);
    requireValue(peerVerdict?.proposalPointer === proposalPointer && peerVerdict.itemId === 'assassin' && peerVerdict.level === level && peerVerdict.currentIdentity && isDeepStrictEqual(peerVerdict.currentIdentity, expectedIdentity.value), `Assassin XP independent row ${level} source identity changed`);
    requireValue(peerVerdict.independent === true && peerVerdict.geometryVerdict === 'approved-exact-XP-and-level-cell-focus' && peerVerdict.sourceIdentityVerdict === 'approved-exact-printed-row-and-current-tuple' && peerVerdict.contextVerdict === 'complete-single-table-context-approved' && peerVerdict.numericMechanicsGradePromoted === false, `Assassin XP independent row ${level} review scope changed`);
    requireValue(peerRecord?.collection === 'classes' && peerRecord.itemId === 'assassin' && peerRecord.fieldPointer === expectedIdentity.fieldPointer && peerRecord.sourceObjectPointer === expectedIdentity.sourceObjectPointer, `Assassin XP peer join row ${level} identity changed`);
    requireValue(peerRecord.originalAuthorRecord?.path === references.authorProposal.path && peerRecord.originalAuthorRecord.sha256 === references.authorProposal.sha256 && peerRecord.originalAuthorRecord.pointer === proposalPointer, `Assassin XP peer join row ${level} author pointer changed`);
    requireValue(peerRecord.originalIndependentRecord?.path === references.independentReview.path && peerRecord.originalIndependentRecord.sha256 === references.independentReview.sha256 && peerRecord.originalIndependentRecord.pointer === independentPointer, `Assassin XP peer join row ${level} independent pointer changed`);
    requireValue(peerRecord.originalPeerVerdict?.independent === true && peerRecord.originalPeerVerdict.numericMechanicsGradePromoted === false && isDeepStrictEqual(peerRecord.originalPeerVerdict.currentIdentity, expectedIdentity.value), `Assassin XP peer join row ${level} verdict changed`);
    const orderedContextIds = authorRow?.requiredTableContext?.orderedExistingContextRegionIds;
    requireValue(Array.isArray(orderedContextIds) && orderedContextIds.length > 0 && orderedContextIds.every(id => oldContextIds.has(id)) && isDeepStrictEqual(orderedContextIds, peerVerdict.requiredOrderedContextRegionIds) && isDeepStrictEqual(orderedContextIds, receiptTarget.requiredOrderedContextRegionIds), `Assassin XP row ${level} context partner is not an unchanged historical region`);
    requireValue(reviewedTarget?.status === 'confirmed' && reviewedTarget.independent === true && reviewedTarget.sourceValueGrade === 'NOT PROMOTED', `Assassin XP row ${level} value grade or review status changed`);
    requireValue(isDeepStrictEqual(reviewedTarget.sourceEvidence, [
      {path: references.authorProposal.path, sha256: references.authorProposal.sha256, pointer: proposalPointer},
      {path: references.peerPointerJoin.path, sha256: references.peerPointerJoin.sha256, pointer: peerPointer},
    ]), `Assassin XP row ${level} target-review source pointers changed`);
    requireValue(reviewedTarget.regionEvidence?.length === 1 && reviewedTarget.regionEvidence[0].regionId === region.id, `Assassin XP row ${level} target-review region changed`);
    const sourceHashes = sourceVisualRegionHashes(region);
    requireValue(isDeepStrictEqual(reviewedTarget.regionEvidence[0], {regionId: region.id, sourceSha256: independentReview.sourcePdf.sha256, imageSha256: region.sha256, ...sourceHashes}), `Assassin XP row ${level} source/image/focus/content proof changed`);
    const expectedRegion = structuredClone(candidateRegion);
    expectedRegion.verification = 'visually-checked-crop';
    requireValue(isDeepStrictEqual(region, expectedRegion), `Assassin XP row ${level} catalog region differs from its exact author proposal`);
    requireValue(region.id === receiptTarget.regionId && region.book === 'PHB' && region.printedPage === 30 && region.pdfPage === 31 && region.sha256 === receiptTarget.imageSha256 && isDeepStrictEqual(region.focusRects, receiptTarget.focusRects), `Assassin XP row ${level} appended image/focus binding changed`);
    const imagePath = safePath(resolve(catalogRoot, dirname(record.catalog)), region.image, `Assassin XP image ${level}`);
    requireValue(sha256(readFileSync(imagePath)) === region.sha256, `Assassin XP image bytes changed for row ${level}`);
  }
  return {baselineRegions: baselineCatalog.regions.length, currentCatalogRegions: catalog.regions.length, appendedXpTargets: ASSASSIN_XP_COUNT};
}

function sourcePages(item) {
  const pages = new Set(), seen = new WeakSet();
  function visit(value) {
    if (!value || typeof value !== 'object' || seen.has(value)) return;
    seen.add(value);
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (typeof value.book === 'string' && Array.isArray(value.pages)) {
      for (const page of value.pages) if (Number.isInteger(page)) pages.add(`${value.book}:${page}`);
    }
    Object.values(value).forEach(visit);
  }
  visit(item);
  return pages;
}

function loadBoundCatalog(group, catalogRoot) {
  const catalog = readJson(catalogRoot, group.catalog, `Catalog for ${group.id}`);
  requireValue(catalog.itemId === group.itemId, `${group.id} catalog item id changed`);
  requireValue(catalog.collection === group.collection, `${group.id} catalog collection changed`);
  return catalog;
}


const DMG175_SUPPLEMENT = Object.freeze({
  artifactId:'dmg175-user-confirmed-supplement', jpegSha256:'e4acdde4a9fed34ae4c60945db53a37e9e7d1b3682f967bc83ccc481e63e5ba7',
  canonicalPdfSha256:'7052949697a009497e5a828d5cf67998df034e30569584110781be46c6de8669',
  partyGroup:'appendix-c-party-magic-distribution-dmg-175-176', levelGroup:'appendix-c-character-levels-dmg-175-same-page-continuation',
});
const DMG175_PARTY_PHYSICAL=[
  'dmg175-party-magic-items-party-magic-items-complete-introductory-paragraph',
  'dmg176-level13-magic-items-party-magic-items-distribution-13th-level',
];
const DMG175_PARTY_P175=[DMG175_PARTY_PHYSICAL[0],...Array.from({length:12},(_,i)=>'dmg175-party-magic-items-party-magic-items-distribution-'+(i+1)+(['st','nd','rd'][i]||'th')+'-level')];
const DMG175_PARTY_P176=[DMG175_PARTY_PHYSICAL[1],'dmg176-level13-magic-items-level-13-continuation-personal-selection-and-groups-multiples-advice'];
function isTypedDmg175Group(group){return group?.source?.sourceArtifactId===DMG175_SUPPLEMENT.artifactId;}
function checkedDmg175Region(catalog,region,description){
  const identity=region&&books.resolveRegionSourceIdentity(catalog,region);
  requireValue(identity?.valid,description+' does not resolve through the registered source/crop identity');
  return identity;
}
function validateTypedDmg175Group(group,catalog){
  requireValue([DMG175_SUPPLEMENT.partyGroup,DMG175_SUPPLEMENT.levelGroup].includes(group.id),group.id+' uses an unapproved supplemental-page group');
  requireValue(group.collection==='rules'&&group.status==='segments-present-pending-deployment',group.id+' is not the exact pending rules continuation');
  const isParty=group.id===DMG175_SUPPLEMENT.partyGroup;
  requireValue(group.itemId===(isParty?'appendix-c-party-magic-distribution':'appendix-c-character-levels')
    &&group.catalog==='scans/verified/'+(isParty?'rules-appendix-c-party-magic-distribution.json':'rules-appendix-c-character-levels.json'),group.id+' owner/catalog changed');
  const expectedSegments=isParty?2:2;
  requireValue(group.segments.length===expectedSegments,group.id+' physical-segment count changed');
  const ordered=[...group.segments].sort((a,b)=>a.order-b.order);
  const expectedIds=isParty?DMG175_PARTY_PHYSICAL:[
    'dmg175-character-level-left-level-of-characters-paragraph-left-column-portion',
    'dmg175-character-level-right-level-of-characters-paragraph-right-column-continuation',
  ];
  requireValue(ordered.every((segment,index)=>segment.regionId===expectedIds[index]&&segment.order===index+1
    &&segment.role===(index===0?'opening':'continuation')&&segment.state==='present'),group.id+' physical region order/role changed');
  for(const segment of ordered){
    const region=catalog.regions.find(candidate=>candidate.id===segment.regionId);
    const identity=checkedDmg175Region(catalog,region,group.id+' '+segment.regionId);
    requireValue(segment.book===identity.book&&segment.printedPage===identity.printedPage&&segment.pdfPage===identity.pdfPage
      &&segment.sourceSha256===identity.sourceSha256&&segment.image===region.image&&segment.imageSha256===region.sha256
      &&segment.sourceIdentityKind===(identity.sourceKind==='supplemental-image'?'supplemental-image':'canonical-pdf')
      &&segment.sourceArtifactId===(identity.sourceKind==='supplemental-image'?identity.sourceArtifactId:'dmg-canonical-pdf')
      &&segment.canonicalPdfSha256===identity.canonicalPdfSha256,
      group.id+' segment fields differ from its resolved source identity');
  }
  const expectedPages=isParty?[
    {book:'DMG',printedPage:175,pdfPage:null,sourceArtifactId:DMG175_SUPPLEMENT.artifactId,sourceIdentityKind:'supplemental-image',sourceSha256:DMG175_SUPPLEMENT.jpegSha256,canonicalPdfSha256:DMG175_SUPPLEMENT.canonicalPdfSha256},
    {book:'DMG',printedPage:176,pdfPage:176,sourceArtifactId:'dmg-canonical-pdf',sourceIdentityKind:'canonical-pdf',sourceSha256:DMG175_SUPPLEMENT.canonicalPdfSha256,canonicalPdfSha256:DMG175_SUPPLEMENT.canonicalPdfSha256},
  ]:[{book:'DMG',printedPage:175,pdfPage:null,sourceArtifactId:DMG175_SUPPLEMENT.artifactId,sourceIdentityKind:'supplemental-image',sourceSha256:DMG175_SUPPLEMENT.jpegSha256,canonicalPdfSha256:DMG175_SUPPLEMENT.canonicalPdfSha256}];
  requireValue(group.sourceComparison?.status==='compared-to-source-artifacts'
    &&Array.isArray(group.sourceComparison.pages)&&group.sourceComparison.pages.length===expectedPages.length,
    group.id+' source-comparison page set changed');
  for(const expected of expectedPages){
    const review=group.sourceComparison.pages.find(page=>page.book===expected.book&&page.printedPage===expected.printedPage);
    const segment=ordered.find(part=>part.book===expected.book&&part.printedPage===expected.printedPage);
    const region=segment&&catalog.regions.find(candidate=>candidate.id===segment.regionId);
    const identity=checkedDmg175Region(catalog,region,group.id+' comparison page '+expected.printedPage);
    requireValue(review&&Object.entries(expected).every(([key,value])=>review[key]===value)
      &&identity.book===expected.book&&identity.printedPage===expected.printedPage&&identity.pdfPage===expected.pdfPage
      &&identity.sourceSha256===expected.sourceSha256&&identity.canonicalPdfSha256===expected.canonicalPdfSha256,
      group.id+' compared page does not match its exact typed source identity');
  }
  const first=ordered[0], firstIdentity=checkedDmg175Region(catalog,catalog.regions.find(region=>region.id===first.regionId),group.id+' group source');
  const expectedGroupSource={book:firstIdentity.book,printedPage:firstIdentity.printedPage,pdfPage:firstIdentity.pdfPage,
    sourceArtifactId:firstIdentity.sourceArtifactId,sourceIdentityKind:firstIdentity.sourceKind,
    sourceSha256:firstIdentity.sourceSha256,canonicalPdfSha256:firstIdentity.canonicalPdfSha256};
  requireValue(isDeepStrictEqual(group.source,expectedGroupSource),group.id+' group source identity changed');
  requireValue(isDeepStrictEqual(group.sourceComparison.pages.map(page=>[page.book,page.printedPage,page.pdfPage]),
    expectedPages.map(page=>[page.book,page.printedPage,page.pdfPage])),group.id+' source-comparison page order changed');
  if(isParty){
    requireValue(isDeepStrictEqual(ordered[0].focusAliasRegionIds,DMG175_PARTY_P175.slice(1))
      &&isDeepStrictEqual(ordered[1].focusAliasRegionIds,DMG175_PARTY_P176.slice(1))
      &&isDeepStrictEqual(group.requiredRegionIds,[...DMG175_PARTY_P175,...DMG175_PARTY_P176]),group.id+' focus-alias set changed');
    requireValue(group.currentCitationPages?.length===2
      &&isDeepStrictEqual(group.currentCitationPages.map(page=>page.regionIds),[DMG175_PARTY_P175,DMG175_PARTY_P176]),group.id+' cited focus pages changed');
  }else{
    requireValue(ordered.every(segment=>!Object.hasOwn(segment,'focusAliasRegionIds'))
      &&isDeepStrictEqual(group.requiredRegionIds,expectedIds)
      &&group.currentCitationPages?.length===1
      &&isDeepStrictEqual(group.currentCitationPages[0].regionIds,expectedIds),group.id+' character continuation scope changed');
  }
  for(const segment of ordered){
    const primary=catalog.regions.find(region=>region.id===segment.regionId);
    for(const aliasId of segment.focusAliasRegionIds||[]){
      const alias=catalog.regions.find(region=>region.id===aliasId);
      const identity=checkedDmg175Region(catalog,alias,group.id+' alias '+aliasId);
      requireValue(alias.book===primary.book&&alias.printedPage===primary.printedPage&&alias.pdfPage===primary.pdfPage
        &&alias.image===primary.image&&alias.sha256===primary.sha256&&alias.sourceArtifactId===primary.sourceArtifactId
        &&isDeepStrictEqual(alias.sourceCropBoundsPx,primary.sourceCropBoundsPx)
        &&alias.sourceCoordinateSpace===primary.sourceCoordinateSpace
        &&Array.isArray(alias.focusRects)&&alias.focusRects.length>0
        &&identity.sourceSha256===segment.sourceSha256,
        group.id+' alias is not the same exact published crop/source');
    }
  }
}

function validateSegment(group, segment, catalog, catalogRoot) {
  requireValue(Number.isInteger(segment.order) && segment.order > 0, `${group.id} segment order must be a positive integer`);
  requireValue(['opening', 'continuation', 'context'].includes(segment.role), `${group.id} has an unsupported segment role`);
  requireValue(typeof segment.book === 'string' && Number.isInteger(segment.printedPage) && segment.printedPage > 0, `${group.id} segment source location is invalid`);
  const typedDmg175Group=isTypedDmg175Group(group);
  requireValue(typedDmg175Group ? (segment.pdfPage===null || (Number.isInteger(segment.pdfPage)&&segment.pdfPage>0)) : (Number.isInteger(segment.pdfPage)&&segment.pdfPage>0), `${group.id} segment PDF page is invalid`);
  requireValue(typeof segment.relevance === 'string' && segment.relevance.trim(), `${group.id} segment relevance is required`);
  requireValue(['present', 'blocked-source-unavailable'].includes(segment.state), `${group.id} segment state is invalid`);
  const matches = catalog.regions.filter(region => region.book === segment.book && region.printedPage === segment.printedPage);

  if (segment.state === 'blocked-source-unavailable') {
    requireValue(group.status === 'blocked-source-unavailable', `${group.id} cannot be complete while a required segment is blocked`);
    requireValue(segment.regionId === null && segment.image === null && segment.imageSha256 === null, `${group.id} blocked segment must not claim an image or region`);
    requireValue(typeof segment.reason === 'string' && segment.reason.trim(), `${group.id} blocked segment needs a reason`);
    requireValue(matches.length === 0, `${group.id} marks an existing page region as blocked`);
    requireValue(catalog.sources?.[segment.book]?.sha256 === segment.sourceSha256, `${group.id} blocked segment source hash changed`);
    return 'blocked';
  }

  requireValue(['segments-present-pending-deployment', 'blocked-source-unavailable'].includes(group.status), `${group.id} present segment has an invalid group status`);
  requireValue(typeof segment.regionId === 'string' && typeof segment.image === 'string', `${group.id} present segment region/image is missing`);
  requireValue(/^[a-f0-9]{64}$/.test(segment.imageSha256 || ''), `${group.id} present segment image hash is invalid`);
  const region = catalog.regions.find(candidate => candidate.id === segment.regionId);
  requireValue(region, `${group.id} segment region ${segment.regionId} is missing`);
  if(typedDmg175Group){
    const identity=checkedDmg175Region(catalog,region,`${group.id} segment source`);
    requireValue(identity.book===segment.book&&identity.printedPage===segment.printedPage&&identity.pdfPage===segment.pdfPage
      &&identity.sourceSha256===segment.sourceSha256&&region.image===segment.image&&region.sha256===segment.imageSha256,
      `${group.id} segment source/image identity changed`);
  }else{
    requireValue(region.book === segment.book && region.printedPage === segment.printedPage && region.pdfPage === segment.pdfPage, `${group.id} segment source location changed`);
    requireValue(region.image === segment.image && region.sha256 === segment.imageSha256, `${group.id} segment image binding changed`);
    requireValue(catalog.sources?.[segment.book]?.sha256 === segment.sourceSha256, `${group.id} segment source hash changed`);
  }
  const imagePath = safePath(resolve(catalogRoot, dirname(group.catalog)), segment.image, `Image for ${group.id}`);
  requireValue(sha256(readFileSync(imagePath)) === segment.imageSha256, `${group.id} image bytes do not match the manifest`);
  return 'present';
}

function validateCitationPages(group, catalog, item) {
  const recordPages = sourcePages(item);
  const coveredRegionIds = new Set();
  for (const citation of group.currentCitationPages || []) {
    requireValue(typeof citation.book === 'string' && Number.isInteger(citation.printedPage), `${group.id} citation page is invalid`);
    requireValue(recordPages.has(`${citation.book}:${citation.printedPage}`), `${group.id} citation page is absent from the source record`);
    requireValue(typeof citation.role === 'string' && citation.role.trim(), `${group.id} citation role is required`);
    if (citation.regionIds) {
      requireValue(Array.isArray(citation.regionIds) && citation.regionIds.length > 0, `${group.id} citation region list is empty`);
      for (const regionId of citation.regionIds) {
        const region = catalog.regions.find(candidate => candidate.id === regionId);
        requireValue(region && region.book === citation.book && region.printedPage === citation.printedPage, `${group.id} citation region ${regionId} does not bind to its cited page`);
        coveredRegionIds.add(regionId);
      }
    }
  }
  const requiredRegionIds = group.requiredRegionIds || catalog.regions.map(region => region.id);
  requireValue(Array.isArray(requiredRegionIds) && requiredRegionIds.length > 0, `${group.id} required catalog region list is empty`);
  requireValue(new Set(requiredRegionIds).size === requiredRegionIds.length, `${group.id} required catalog region list contains duplicates`);
  for (const regionId of requiredRegionIds) {
    requireValue(catalog.regions.some(region => region.id === regionId), `${group.id} required catalog region ${regionId} is missing`);
    requireValue(coveredRegionIds.has(regionId), `${group.id} required catalog region ${regionId} is absent from its explicit citation page mapping`);
  }
}

function validateCheckedCandidates(group, candidateRoot) {
  for (const candidate of group.checkedAlternativeRegions || []) {
    requireValue(candidate.decision === 'not-relevant-to-required-passage', `${group.id} alternative region disposition is missing`);
    const catalog = readJson(candidateRoot, candidate.catalog, `Alternative catalog for ${group.id}`);
    requireValue(catalog.itemId === candidate.itemId && catalog.collection === candidate.collection, `${group.id} alternative catalog owner changed`);
    const region = catalog.regions.find(entry => entry.id === candidate.regionId);
    requireValue(region && region.book === candidate.book && region.printedPage === candidate.printedPage, `${group.id} checked alternative region ${candidate.regionId} changed`);
    requireValue(region.image === candidate.image && region.sha256 === candidate.imageSha256, `${group.id} checked alternative image ${candidate.regionId} changed`);
    requireValue(catalog.sources?.[candidate.book]?.sha256 === candidate.sourceSha256, `${group.id} checked alternative source hash changed`);
  }
}

function validateRegression(regression, data, catalogRoot) {
  requireValue(typeof regression.id === 'string' && regression.id, 'Regression id is required');
  requireValue(Array.isArray(regression.bindings) && regression.bindings.length >= 2, `${regression.id} needs at least two bindings`);
  requireValue(regression.sourceComparison?.status === 'compared-to-verified-original' && regression.sourceComparison.sourceSha256 === regression.source.sourceSha256 && regression.sourceComparison.pdfPage === regression.source.pdfPage, `${regression.id} needs source-bound comparison evidence`);
  const hashes = new Set();
  for (const binding of regression.bindings) {
    const item = data[binding.collection]?.find(entry => entry.id === binding.itemId);
    requireValue(item, `${regression.id} item ${binding.itemId} is missing`);
    const catalog = readJson(catalogRoot, binding.catalog, `Regression catalog ${binding.itemId}`);
    requireValue(catalog.itemId === binding.itemId && catalog.collection === binding.collection, `${regression.id} catalog owner changed`);
    const region = catalog.regions.find(entry => entry.id === binding.regionId);
    requireValue(region && region.book === regression.source.book && region.printedPage === regression.source.printedPage, `${regression.id} binding ${binding.itemId} moved from the reviewed source page`);
    requireValue(region.image === binding.image && region.sha256 === binding.imageSha256, `${regression.id} binding ${binding.itemId} image changed`);
    requireValue(regression.sourceComparison.currentImageSha256 === binding.imageSha256, `${regression.id} source comparison does not bind the current image`);
    requireValue(catalog.sources?.[regression.source.book]?.sha256 === regression.source.sourceSha256, `${regression.id} source identity changed`);
    const imagePath = safePath(resolve(catalogRoot, dirname(binding.catalog)), region.image, `Regression image ${binding.itemId}`);
    requireValue(sha256(readFileSync(imagePath)) === binding.imageSha256, `${regression.id} image bytes changed for ${binding.itemId}`);
    hashes.add(binding.imageSha256);
  }
  requireValue(hashes.size === 1, `${regression.id} shared bindings no longer use the same corrected image`);
  requireValue(regression.priorIncorrectImageSha256 && !hashes.has(regression.priorIncorrectImageSha256), `${regression.id} old clipped image is still current`);
  return regression.bindings.length;
}

// A metadata-only check shared by the live manifest validator and the
// history fixtures. This deliberately checks required segment identity and
// order without opening image files; the full validator below still verifies
// catalog hashes and image bytes. Historical fixtures therefore need only
// retain source/catalog/image identities, not republish old scan images.
export function auditRequiredSegmentPresence(group, catalog) {
  const required = [...(group.segments || [])]
    .filter(segment => segment.state === 'present')
    .sort((a, b) => a.order - b.order);
  const missing = [];
  const mismatches = [];
  const present = [];
  for (const segment of required) {
    const region = catalog?.regions?.find(candidate => candidate.id === segment.regionId);
    if (!region) {
      missing.push({order: segment.order, role: segment.role, regionId: segment.regionId, book: segment.book, printedPage: segment.printedPage});
      continue;
    }
    const fields = ['book', 'printedPage', 'pdfPage', 'image'];
    const changedFields = fields.filter(field => region[field] !== segment[field]);
    if (region.sha256 !== segment.imageSha256) changedFields.push('sha256');
    if (changedFields.length) mismatches.push({order: segment.order, regionId: segment.regionId, changedFields});
    present.push({order: segment.order, role: segment.role, regionId: segment.regionId});
  }
  return {
    expectedOrder: required.map(segment => ({order: segment.order, role: segment.role, regionId: segment.regionId})),
    present,
    missing,
    mismatches,
    ...auditContinuationOrder(group, catalog),
  };
}

// Related rules can cite two books (for example UA explicitly retaining a PHB
// advancement rule). They are not a literal continuation of one source file.
// Each part still needs its own catalog identity and exact compared page.
function validateCrossBookRelationship(group,catalog,item){
  const segmentBooks=new Set(group.segments.map(segment=>segment.book));
  if(segmentBooks.size<2)return false;
  const relationship=group.relationship;
  requireValue(relationship?.kind==='related-source-rules'
    &&typeof relationship.label==='string'&&!!relationship.label.trim()
    &&typeof relationship.reason==='string'&&!!relationship.reason.trim()
    &&relationship.ownerPage&&typeof relationship.ownerPage.book==='string'
    &&Number.isInteger(relationship.ownerPage.printedPage)&&relationship.ownerPage.printedPage>0
    &&sourcePages(item).has(`${relationship.ownerPage.book}:${relationship.ownerPage.printedPage}`), `${group.id} cross-book parts require an explicit related-source-rules relationship to a cited owner page`);
  requireValue(Number.isInteger(group.source.printedPage)&&group.source.printedPage>0
    &&group.segments.some(segment=>segment.book===group.source.book&&segment.printedPage===group.source.printedPage
      &&segment.sourceSha256===group.source.sourceSha256),`${group.id} cross-book group lacks its exact declared primary source page`);
  for(const segment of group.segments){
    requireValue(catalog.sources?.[segment.book]?.sha256===segment.sourceSha256,`${group.id} cross-book segment source identity changed`);
    requireValue(group.sourceComparison.pages.some(page=>page.book===segment.book&&page.printedPage===segment.printedPage
      &&page.pdfPage===segment.pdfPage&&page.sourceSha256===segment.sourceSha256),`${group.id} cross-book segment lacks its exact source comparison page`);
  }
  return true;
}

export function validateContinuationManifest(manifest, {data, catalogRoot}) {
  requireValue(manifest?.schemaVersion === 1 && Array.isArray(manifest.groups), 'Unsupported citation continuation manifest');
  requireValue(data && typeof data === 'object' && catalogRoot, 'Continuation validation needs assembled data and a catalog root');
  const ids = new Set();
  let segments = 0, presentSegments = 0, blockedSegments = 0;
  const statusCounts = {};
  for (const group of manifest.groups) {
    requireValue(typeof group.id === 'string' && group.id, 'Continuation group id is required');
    requireValue(!ids.has(group.id), `Duplicate continuation group ${group.id}`);
    ids.add(group.id);
    requireValue(['rules', 'spells', 'classes', 'equipment', 'matrices', 'progressionExplainer'].includes(group.collection), `${group.id} collection is unsupported`);
    requireValue(['segments-present-pending-deployment', 'blocked-source-unavailable'].includes(group.status), `${group.id} group status is invalid`);
    requireValue(Array.isArray(group.segments) && group.segments.length > 0, `${group.id} has no required segments`);
    const item = group.collection === 'progressionExplainer'
      ? data.progressionExplainer
      : data[group.collection]?.find(entry => entry.id === group.itemId);
    requireValue(item, `${group.id} source record is missing`);
    requireValue(item.sourceExcerpts?.catalog === group.catalog, `${group.id} record is rebound to another excerpt catalog`);
    const catalog = loadBoundCatalog(group, catalogRoot);
    const presence = auditRequiredSegmentPresence(group, catalog);
    requireValue(presence.missing.length === 0, `${group.id} required segment ${presence.missing[0]?.regionId} is absent from catalog`);
    requireValue(presence.mismatches.length === 0, `${group.id} required segment ${presence.mismatches[0]?.regionId} does not match the catalog binding`);
    requireValue(presence.duplicateRegionIds.length === 0, `${group.id} duplicate required segment ${presence.duplicateRegionIds[0]}`);
    requireValue(presence.orderMismatches.length === 0, `${group.id} required segment order disagrees with the catalog/viewer order`);
    const typedDmg175Group=isTypedDmg175Group(group);
    if(typedDmg175Group)validateTypedDmg175Group(group,catalog);
    else {
      requireValue(group.segments.every(segment=>!Object.hasOwn(segment,'focusAliasRegionIds')), `${group.id} focusAliasRegionIds are reserved for the exact reviewed D175 Party Magic group`);
      requireValue(catalog.sources?.[group.source.book]?.sha256 === group.source.sourceSha256, `${group.id} group source identity changed`);
    }
    requireValue(group.sourceComparison?.status === (typedDmg175Group?'compared-to-source-artifacts':'compared-to-verified-original') && Array.isArray(group.sourceComparison.pages) && group.sourceComparison.pages.length > 0, `${group.id} needs source-bound page comparison evidence`);
    for (const review of group.sourceComparison.pages) {
      if(typedDmg175Group){
        const segment=group.segments.find(part=>part.book===review.book&&part.printedPage===review.printedPage&&part.pdfPage===review.pdfPage);
        const region=segment&&catalog.regions.find(candidate=>candidate.id===segment.regionId);
        const identity=checkedDmg175Region(catalog,region,`${group.id} source-comparison page`);
        requireValue(review.sourceSha256===identity.sourceSha256&&review.canonicalPdfSha256===identity.canonicalPdfSha256
          &&review.sourceIdentityKind===(identity.sourceKind==='supplemental-image'?'supplemental-image':'canonical-pdf'),`${group.id} comparison source identity changed`);
      }else{
        requireValue(typeof review.book === 'string' && Number.isInteger(review.printedPage) && Number.isInteger(review.pdfPage), `${group.id} source comparison page is invalid`);
        requireValue(catalog.sources?.[review.book]?.sha256 === review.sourceSha256, `${group.id} comparison source identity changed for ${review.book}`);
      }
      requireValue(catalog.regions.some(region => region.book === review.book && region.printedPage === review.printedPage && region.pdfPage === review.pdfPage), `${group.id} compared page ${review.book} ${review.printedPage} has no catalog region`);
    }
    validateCitationPages(group, catalog, item);
    const ordered = [...group.segments].sort((a, b) => a.order - b.order);
    const relatedCrossBook=validateCrossBookRelationship(group,catalog,item);
    requireValue(ordered.every((segment, i) => segment.order === i + 1), `${group.id} segment order must be contiguous from 1`);
    const regionIds = new Set();
    for (const segment of ordered) {
      if(isTypedDmg175Group(group)){
        const comparisonPage=group.sourceComparison.pages.find(page=>page.book===segment.book&&page.printedPage===segment.printedPage&&page.pdfPage===segment.pdfPage&&page.sourceSha256===segment.sourceSha256);
        requireValue(Boolean(comparisonPage),`${group.id} segment lacks its exact typed source comparison`);
      }else requireValue(segment.sourceSha256 === group.source.sourceSha256||(relatedCrossBook&&segment.book!==group.source.book), `${group.id} segment source hash disagrees with its group`);
      if (segment.regionId) {
        requireValue(!regionIds.has(segment.regionId), `${group.id} repeats segment region ${segment.regionId}`);
        regionIds.add(segment.regionId);
      }
      const result = validateSegment(group, segment, catalog, catalogRoot);
      segments++;
      if (result === 'present') presentSegments++;
      else blockedSegments++;
    }
    const isBlocked = ordered.some(segment => segment.state === 'blocked-source-unavailable');
    requireValue(isBlocked === (group.status === 'blocked-source-unavailable'), `${group.id} status disagrees with its required segments`);
    validateCheckedCandidates(group, catalogRoot);
    statusCounts[group.status] = (statusCounts[group.status] || 0) + 1;
  }
  let regressionBindings = 0;
  for (const regression of manifest.regressions || []) regressionBindings += validateRegression(regression, data, catalogRoot);
  return {groups: manifest.groups.length, segments, presentSegments, blockedSegments, regressionBindings, statusCounts};
}

export function validateAssassinContextAudit(audit, {data, catalogRoot}) {
  requireValue(audit?.schemaVersion === 1 && Array.isArray(audit.records), 'Unsupported Assassin context audit');
  requireValue(audit.records.length === 1, 'Assassin context audit must contain exactly one scoped record');
  const record = audit.records[0];
  requireValue(record.collection === 'classes' && record.itemId === 'assassin', 'Context audit is not scoped to the Assassin entry');
  const item = data?.classes?.find(entry => entry.id === record.itemId);
  requireValue(item?.sourceExcerpts?.catalog === record.catalog, 'Assassin context record is rebound to another catalog');
  const catalog = readJson(catalogRoot, record.catalog, 'Assassin context catalog');
  requireValue(catalog.itemId === record.itemId && catalog.collection === record.collection, 'Assassin context catalog owner changed');
  requireValue(Array.isArray(record.regions), 'Assassin context audit region list is missing');
  const catalogBytes = readFileSync(safePath(catalogRoot, record.catalog, 'Assassin context catalog'));
  const appendTransfer = validateAssassinXpAppendTransfer(record, catalog, catalogBytes, catalogRoot);
  const hasIndependentFocusReview = record.regions.some(entry => entry.independentFocusReview);
  let independentClassProof = null;
  if (hasIndependentFocusReview) {
    const proofRef = record.independentClassReview;
    requireValue(proofRef?.path === 'research/source-audit-batch5-class-independent-review.json', 'Assassin independent class review path changed');
    const repositoryRoot = resolve(import.meta.dirname, '..');
    const proofBytes = readFileSync(safePath(repositoryRoot, proofRef.path, 'Assassin independent class review'));
    requireValue(proofRef.sha256 === sha256(proofBytes), 'Assassin independent class review file hash is stale');
    independentClassProof = JSON.parse(proofBytes);
    requireValue(independentClassProof?.source?.sha256 === catalog.sources?.PHB?.sha256, 'Assassin independent class review source identity changed');
  }
  requireValue(record.regions.length === appendTransfer.baselineRegions, 'Historical Assassin audit must enumerate every original region');
  const currentIds = new Set(catalog.regions.map(region => region.id));
  const auditedIds = new Set();
  let priorContextConfirmed = 0, sourceComparedPendingIndependent = 0, repairedPendingIndependent = 0, contextAdequateFocusPending = 0, repairContextAdequateFocusPending = 0, independentlyReviewedContextAndFocus = 0, followupPendingCalibration = 0, followupPendingContinuation = 0, priorCropConfirmed = 0;
  for (const entry of record.regions) {
    requireValue(!auditedIds.has(entry.regionId), `Assassin region ${entry.regionId} is duplicated in the audit`);
    auditedIds.add(entry.regionId);
    requireValue(currentIds.has(entry.regionId), `Assassin region ${entry.regionId} is no longer current`);
    const region = catalog.regions.find(candidate => candidate.id === entry.regionId);
    requireValue(entry.book === region.book && entry.printedPage === region.printedPage && entry.pdfPage === region.pdfPage, `Assassin region ${entry.regionId} source page changed`);
    requireValue(entry.image === region.image && entry.imageSha256 === region.sha256 && entry.width === region.width && entry.height === region.height, `Assassin region ${entry.regionId} image binding changed`);
    requireValue(catalog.sources?.[entry.book]?.sha256 === entry.sourceSha256, `Assassin region ${entry.regionId} source identity changed`);
    requireValue(entry.sourceComparison?.status === 'compared-to-original-page' && typeof entry.sourceComparison.finding === 'string', `Assassin region ${entry.regionId} needs a source comparison finding`);
    if (entry.independentFocusReview) {
      const review = entry.independentFocusReview;
      requireValue(independentClassProof, `Assassin region ${entry.regionId} has a focus review without its verified review receipt`);
      requireValue(entry.contextStatus === 'source-reviewed-context-and-focus-confirmed-independent' && entry.highlightStatus === 'source-reviewed-precise-focus-confirmed', `Assassin region ${entry.regionId} independent focus status changed`);
      requireValue(review.status === 'confirmed' && review.independent === true && review.scope === 'source-image-crop-context-and-highlight-location-only', `Assassin region ${entry.regionId} review scope is unsupported`);
      requireValue(review.evidence === record.independentClassReview.path && review.evidenceSha256 === record.independentClassReview.sha256, `Assassin region ${entry.regionId} independent review evidence hash changed`);
      const proofBinding = independentClassProof.bindings?.find(binding => binding.collection === 'classes' && binding.itemId === 'assassin' && binding.catalog === `dist/${record.catalog}` && binding.regionId === entry.regionId);
      requireValue(proofBinding, `Assassin region ${entry.regionId} is absent from the independent class review`);
      const hashes = sourceVisualRegionHashes(region);
      requireValue(proofBinding.catalogSha256 === record.catalogSha256 && proofBinding.sourceSha256 === entry.sourceSha256, `Assassin region ${entry.regionId} independent review source/catalog binding changed`);
      requireValue(proofBinding.image === region.image && proofBinding.imageSha256 === region.sha256 && proofBinding.focusSha256 === hashes.focusSha256 && proofBinding.contentSha256 === hashes.contentSha256, `Assassin region ${entry.regionId} independent review image/focus/content hashes changed`);
      requireValue(review.sourceSha256 === proofBinding.sourceSha256 && review.imageSha256 === proofBinding.imageSha256 && review.focusSha256 === proofBinding.focusSha256 && review.contentSha256 === proofBinding.contentSha256, `Assassin region ${entry.regionId} audit review hashes differ from the independent proof`);
      requireValue(JSON.stringify(entry.focusRects) === JSON.stringify(region.focusRects) && JSON.stringify(region.focusRects) !== JSON.stringify([[0, 0, 1, 1]]), `Assassin region ${entry.regionId} precise focus is absent or stale`);
      for (const assessmentName of ['crop', 'context', 'highlight']) {
        const assessment = proofBinding.assessments?.[assessmentName];
        requireValue(assessment?.status === 'confirmed' && assessment.independent === true && typeof assessment.reason === 'string' && assessment.reason.length > 0, `Assassin region ${entry.regionId} lacks independently confirmed ${assessmentName} evidence`);
      }
      requireValue(proofBinding.defaultSelection === 'unassessed', `Assassin region ${entry.regionId} review must not imply default-selection approval`);
      independentlyReviewedContextAndFocus++;
    } else {
      requireValue(entry.highlightStatus === 'unreviewed-full-image-sentinel' && JSON.stringify(region.focusRects) === JSON.stringify([[0, 0, 1, 1]]), `Assassin region ${entry.regionId} highlight status changed`);
    }
    requireValue(entry.citationPurpose !== 'price' && entry.priceEvidence === false, `Assassin region ${entry.regionId} is incorrectly treated as price evidence`);
    const imagePath = safePath(resolve(catalogRoot, dirname(record.catalog)), region.image, `Assassin image ${entry.regionId}`);
    requireValue(sha256(readFileSync(imagePath)) === region.sha256, `Assassin image bytes changed for ${entry.regionId}`);
    if (entry.contextStatus === 'prior-context-confirmed') {
      requireValue(entry.regionId === 'phb-37-911fe149fbfab8dd' && entry.evidenceRefs?.includes('research/contextual-adequacy-first-review.json'), 'A prior context confirmation lacks matching evidence');
      priorContextConfirmed++;
    } else if (entry.contextStatus === 'source-reviewed-adequate-pending-independent-signoff') {
      requireValue(entry.sourceComparison.disposition === 'adequate', `Assassin region ${entry.regionId} has no adequate source-context disposition`);
      sourceComparedPendingIndependent++;
    } else if (entry.contextStatus === 'source-reviewed-repair-pending-independent-signoff') {
      requireValue(entry.sourceComparison.disposition === 'repair-applied' && entry.previousImageSha256 && entry.previousNormalizedPageRect, `Assassin region ${entry.regionId} repair history is incomplete`);
      repairedPendingIndependent++;
    } else if (entry.contextStatus === 'source-reviewed-context-adequate-focus-pending') {
      requireValue(['adequate', 'ordered-context-complete'].includes(entry.sourceComparison.disposition), `Assassin region ${entry.regionId} has no context-complete disposition`);
      requireValue(entry.evidenceRefs?.includes('research/assassin-context-recipe-review.json') && entry.independentContextReview?.status === 'approved-source-image-content-and-bounds', `Assassin region ${entry.regionId} lacks independent crop/context review evidence`);
      const boundaryReview = entry.sourceComparison.sourcePixelBoundaryReview;
      if (boundaryReview) {
        requireValue(boundaryReview.sourceSha256 === entry.sourceSha256, `Assassin region ${entry.regionId} pixel review source identity changed`);
        const candidates = boundaryReview.candidateOrderedSegmentBoundsPoints;
        const applied = boundaryReview.appliedSegments;
        requireValue(Array.isArray(candidates) && candidates.length === 2 && Array.isArray(applied) && applied.length === 2, `Assassin region ${entry.regionId} continuation candidates/application are incomplete`);
        for (let index = 0; index < 2; index++) {
          requireValue(candidates[index].order === index + 1 && applied[index].order === index + 1, `Assassin region ${entry.regionId} candidate continuation order changed`);
          requireValue(Array.isArray(candidates[index].rect) && candidates[index].rect.length === 4 && JSON.stringify(candidates[index].rect) === JSON.stringify(applied[index].rectPoints), `Assassin region ${entry.regionId} applied continuation geometry changed from its reviewed candidate`);
          const appliedRegion = catalog.regions.find(candidate => candidate.id === applied[index].regionId);
          requireValue(appliedRegion && appliedRegion.sha256 === applied[index].imageSha256 && appliedRegion.printedPage === entry.printedPage, `Assassin region ${entry.regionId} applied continuation binding changed`);
        }
      }
      contextAdequateFocusPending++;
    } else if (entry.contextStatus === 'source-reviewed-repair-context-adequate-focus-pending') {
      requireValue(entry.sourceComparison.disposition === 'repair-applied' && entry.previousImageSha256 && entry.previousNormalizedPageRect, `Assassin region ${entry.regionId} repair history is incomplete`);
      requireValue(entry.evidenceRefs?.includes('research/assassin-context-recipe-review.json') && entry.independentContextReview?.status === 'approved-source-image-content-and-bounds', `Assassin region ${entry.regionId} lacks independent crop/context review evidence`);
      repairContextAdequateFocusPending++;
    } else if (entry.contextStatus === 'source-reviewed-followup-pending-calibration') {
      requireValue(entry.sourceComparison.disposition === 'follow-up-required' && Array.isArray(entry.sourceComparison.followupReasons) && entry.sourceComparison.followupReasons.length > 0, `Assassin region ${entry.regionId} has no calibrated follow-up reason`);
      followupPendingCalibration++;
    } else if (entry.contextStatus === 'source-reviewed-followup-pending-continuation') {
      requireValue(entry.sourceComparison.disposition === 'follow-up-required' && Array.isArray(entry.sourceComparison.followupReasons) && entry.sourceComparison.followupReasons.length > 0, `Assassin region ${entry.regionId} has no continuation follow-up reason`);
      const review = entry.sourceComparison.sourcePixelBoundaryReview;
      requireValue(review?.sourceSha256 === entry.sourceSha256, `Assassin region ${entry.regionId} pixel review source identity changed`);
      requireValue(Array.isArray(review.candidateOrderedSegmentBoundsPoints) && review.candidateOrderedSegmentBoundsPoints.length === 2, `Assassin region ${entry.regionId} continuation candidates are incomplete`);
      const [opening, continuation] = review.candidateOrderedSegmentBoundsPoints;
      requireValue(opening.order === 1 && continuation.order === 2 && opening.role.includes('left-column opening') && continuation.role.includes('same-page upper-right continuation'), `Assassin region ${entry.regionId} candidate continuation order changed`);
      requireValue(Array.isArray(opening.rect) && opening.rect.length === 4 && Array.isArray(continuation.rect) && continuation.rect.length === 4, `Assassin region ${entry.regionId} candidate segment geometry is incomplete`);
      requireValue(Array.isArray(review.headingDarkPixelBoundsPoints) && review.headingDarkPixelBoundsPoints.length === 4 && Number.isFinite(review.existingTopWordBoxOverlapPoints) && review.existingTopToDarkGlyphClearancePoints > 0, `Assassin region ${entry.regionId} word-box and pixel findings are not distinguished`);
      followupPendingContinuation++;
    } else if (entry.contextStatus === 'source-reviewed-context-and-focus-confirmed-independent') {
      requireValue(Boolean(entry.independentFocusReview), `Assassin region ${entry.regionId} has no independent focus review`);
      requireValue(['adequate', 'repair-applied'].includes(entry.sourceComparison.disposition), `Assassin region ${entry.regionId} lacks a complete reviewed source crop`);
    } else throw new Error(`Assassin region ${entry.regionId} has an unsupported context status`);
    if (entry.priorCropReview === 'confirmed') priorCropConfirmed++;
  }
  requireValue(auditedIds.size === record.regions.length && [...auditedIds].every(id => currentIds.has(id)), 'Assassin context audit does not cover its exact historical region set');
  requireValue(record.summary?.regions === record.regions.length && record.summary?.sourceCompared === record.regions.length && record.summary?.priorContextConfirmed === priorContextConfirmed && record.summary?.sourceComparedPendingIndependent === sourceComparedPendingIndependent && record.summary?.repairedPendingIndependent === repairedPendingIndependent && record.summary?.contextAdequateFocusPending === contextAdequateFocusPending && record.summary?.repairContextAdequateFocusPending === repairContextAdequateFocusPending && record.summary?.independentlyReviewedContextAndFocus === independentlyReviewedContextAndFocus && record.summary?.followupPendingCalibration === followupPendingCalibration && record.summary?.followupPendingContinuation === followupPendingContinuation && record.summary?.priorCropConfirmed === priorCropConfirmed, 'Assassin context summary does not match its bindings');
  const findingIds = new Set();
  for (const finding of record.coverageFindings || []) {
    requireValue(typeof finding.id === 'string' && finding.id && !findingIds.has(finding.id), 'Assassin coverage finding id is missing or duplicated');
    findingIds.add(finding.id);
    requireValue(finding.collection === 'classes' && finding.itemId === 'assassin', `${finding.id} is outside the Assassin record`);
    const region = catalog.regions.find(candidate => candidate.id === finding.regionId);
    requireValue(region && region.book === finding.book && region.printedPage === finding.printedPage && region.pdfPage === finding.pdfPage, `${finding.id} source region changed`);
    requireValue(catalog.sources?.[finding.book]?.sha256 === finding.sourceSha256, `${finding.id} source identity changed`);
    requireValue(Array.isArray(finding.fieldPointers) && finding.fieldPointers.length > 0, `${finding.id} needs a scoped field pointer`);
  }
  requireValue(record.summary?.priceEvidence === record.regions.filter(entry => entry.priceEvidence).length, 'Assassin price-evidence count does not match its regions');
  requireValue(record.sourceAccess?.status === 'verified' && record.sourceAccess?.sourceHashes?.PHB === catalog.sources?.PHB?.sha256 && record.sourceAccess?.sourceHashes?.DMG === catalog.sources?.DMG?.sha256, 'Assassin audit must bind verified source identities');
  return {regions: record.regions.length, sourceCompared: record.regions.filter(entry => entry.sourceComparison.status === 'compared-to-original-page').length, priorContextConfirmed, sourceComparedPendingIndependent, repairedPendingIndependent, contextAdequateFocusPending, repairContextAdequateFocusPending, independentlyReviewedContextAndFocus, followupPendingCalibration, followupPendingContinuation, priorCropConfirmed, priceRegions: record.regions.filter(entry => entry.priceEvidence).length, currentCatalogRegions: appendTransfer.currentCatalogRegions, appendedXpTargets: appendTransfer.appendedXpTargets};
}
