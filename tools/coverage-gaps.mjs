import {validateCurrentMonetarySourceQuestionProjection} from './monetary-current-source-questions.mjs';
import {createHash} from 'node:crypto';

const sha256 = value => createHash('sha256').update(value).digest('hex');

function fail(message) {
  throw new Error(`Invalid coverage gaps payload: ${message}`);
}

function readBytes(readFile, path) {
  let value;
  try {
    value = readFile(path);
  } catch (error) {
    fail(`cannot read ${path}: ${error.message}`);
  }
  if (Buffer.isBuffer(value)) return value;
  if (typeof value === 'string') return Buffer.from(value, 'utf8');
  fail(`readFile(${path}) must return a string or Buffer`);
}

function readJson(readFile, path) {
  try {
    return JSON.parse(readBytes(readFile, path).toString('utf8'));
  } catch (error) {
    if (error.message.startsWith('Invalid coverage gaps payload:')) throw error;
    fail(`${path} is not valid JSON`);
  }
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function sameValue(a, b) {
  return stableJson(a) === stableJson(b);
}

function semanticSnapshot(value) {
  if (Array.isArray(value)) return value.map(semanticSnapshot);
  if (value !== null && typeof value === 'object') return Object.fromEntries(Object.entries(value)
    .filter(([key]) => key !== 'evidenceBindings' && key !== 'regionReviews')
    .map(([key, child]) => [key, semanticSnapshot(child)]));
  return value;
}

function pointerValue(root, pointer) {
  if (typeof pointer !== 'string' || !pointer.startsWith('/')) return {found: false};
  let value = root;
  for (const part of pointer.slice(1).split('/').map(token => token.replaceAll('~1', '/').replaceAll('~0', '~'))) {
    if (value === null || typeof value !== 'object' || !Object.hasOwn(value, part)) return {found: false};
    value = value[part];
  }
  return {found: true, value};
}

function itemFor(data, collection, itemId) {
  if (collection === 'progressionExplainer') return data.progressionExplainer || null;
  return data[collection]?.find(item => item.id === itemId) || null;
}

function productHref(collection, itemId) {
  if (!itemId || !['rules', 'spells', 'classes', 'equipment'].includes(collection)) return null;
  return `#${collection}/${encodeURIComponent(itemId)}`;
}

function openEntryLink(data, collection, itemId, label = 'Open entry') {
  const href = productHref(collection, itemId);
  if (!href || !itemFor(data, collection, itemId)) return [];
  return [{label, href}];
}

function humanFieldLabel(pointer) {
  const parts = pointer?.split('/').slice(1).map(part => part.replaceAll('~1', '/').replaceAll('~0', '~')) || [];
  const last = parts.at(-1) || '';
  if (last === 'price') return 'Purchase price';
  if (last === 'suggestedPrice') return 'Editorial price estimate';
  if (last === 'Range') return 'Range';
  if (last === 'Duration') return 'Duration';
  if (last === 'Saving throw') return 'Saving throw';
  if (last === 'Materials') return 'Materials';
  if (last === 'attackTableNote') return 'Attack table note';
  if (last === 'retainedSkillsNote') return 'Retained skills note';
  if (parts[0] === 'effect') return 'Effect';
  if (parts[0] === 'errata') return 'Errata note';
  if (parts[0] === 'fields') return last;
  if (parts[0] === 'exceptions') return 'Recorded exception';
  if (parts[0] === 'bullets') return 'Recorded rule note';
  return last ? last.replace(/([a-z])([A-Z])/g, '$1 $2') : 'Recorded source note';
}

function recordTitle(data, collection, itemId, fallback = '') {
  const item = itemFor(data, collection, itemId);
  if (!item) return fallback || itemId || 'Source note';
  const name = item.name || item.title || item.id;
  if (collection === 'spells' && item.class) return `${item.class} · ${name}`;
  return name;
}

function uniqueLocations(locations = []) {
  const seen = new Set();
  return locations.filter(location => {
    if (!location || typeof location.book !== 'string' || !Number.isInteger(location.printedPage)) return false;
    const key = `${location.book}:${location.printedPage}:${location.pdfPage ?? ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).map(location => ({
    book: location.book,
    printedPage: location.printedPage,
    ...(Number.isInteger(location.pdfPage) ? {pdfPage: location.pdfPage} : {}),
  }));
}

function entry({id, title, status, description, sourceLocations = [], links = [], handoffPointers = [], sourceArtifacts = []}) {
  return {
    id, title, status, description,
    sourceLocations: uniqueLocations(sourceLocations),
    links,
    handoffPointers,
    ...(sourceArtifacts.length ? {sourceArtifacts} : {}),
  };
}

function verifySnapshot({data, handoff, readFile}) {
  if (!data || !handoff || typeof readFile !== 'function') fail('data, handoff and readFile are required');
  const serialized = JSON.stringify(data);
  const dataSha256 = sha256(serialized);
  const rawData = readBytes(readFile, 'dist/data.json');
  const handoffBytes = readBytes(readFile, 'research/gaps-limitations-next-task.json');
  const committedHandoff = JSON.parse(handoffBytes.toString('utf8'));
  if (!sameValue(committedHandoff, handoff)) fail('passed handoff differs from the committed handoff file');
  if (dataSha256 !== handoff.snapshot?.parsedDataSha256) fail('current parsed data hash differs from the handoff snapshot');
  if (sha256(rawData) !== handoff.snapshot?.rawDistDataFileSha256) fail('current dist/data.json bytes differ from the handoff snapshot');
  const recordCount = ['rules', 'spells', 'classes', 'equipment', 'matrices'].reduce((sum, name) => sum + (data[name]?.length || 0), data.progressionExplainer ? 1 : 0);
  if (recordCount !== handoff.scope?.currentExposedRecords || recordCount !== handoff.snapshot?.dataRecordCount) fail('current exposed record count differs from the handoff snapshot');
  return {
    dataSha256,
    rawDataSha256: sha256(rawData),
    handoffSha256: sha256(handoffBytes),
    recordCount,
  };
}

function verifyFormalIssues(data, handoff) {
  const lists = handoff.mechanicsAudit?.formalFieldIssues;
  if (!Array.isArray(lists?.notExtracted) || !Array.isArray(lists?.sourceConflict)) fail('formal mechanics issue lists are missing');
  const issues = [...lists.notExtracted, ...lists.sourceConflict];
  if (lists.notExtracted.length !== handoff.summary.formalMechanicsFieldStatuses.notExtracted || lists.sourceConflict.length !== handoff.summary.formalMechanicsFieldStatuses.sourceConflict) fail('formal mechanics issue counts differ from the handoff summary');
  for (const issue of issues) {
    const item = itemFor(data, issue.collection, issue.itemId);
    if (!item) fail(`formal issue record is missing: ${issue.collection}/${issue.itemId}`);
    const actual = pointerValue(item, issue.fieldPointer);
    const expectedAbsent = issue.status === 'not-extracted' && issue.value === null && !actual.found && issue.fieldPointer === '/price';
    if (!actual.found && !expectedAbsent) fail(`formal issue pointer does not resolve: ${issue.collection}/${issue.itemId}${issue.fieldPointer}`);
    if (actual.found && !sameValue(actual.value, issue.value)) fail(`formal issue current value changed: ${issue.collection}/${issue.itemId}${issue.fieldPointer}`);
  }
  return issues;
}

function verifyReviewNotes(data, handoff, mechanics) {
  const notes = handoff.mechanicsAudit?.specificReviewNoteCandidates?.notes;
  if (!Array.isArray(notes) || notes.length !== handoff.summary.additionalRecordedReviewNoteCandidates) fail('recorded review-note candidate count differs from the handoff summary');
  for (const note of notes) {
    const item = itemFor(data, note.collection, note.itemId);
    if (!item) fail(`review-note record is missing: ${note.collection}/${note.itemId}`);
    if (note.fieldPointer != null && !pointerValue(item, note.fieldPointer).found) fail(`review-note field pointer does not resolve: ${note.collection}/${note.itemId}${note.fieldPointer}`);
    const linkedRecords = (note.reviewRecordIndexes || []).map(index => mechanics.reviewRecords?.[index]).filter(Boolean);
    const matchingRecord = linkedRecords.some(record => record.collection === note.collection && record.id === note.itemId && (record.unresolved || []).some(candidate => {
      if (typeof candidate === 'string') return note.fieldPointer == null && candidate === note.reason;
      return candidate?.reason === note.reason && (note.fieldPointer == null || candidate.path === note.fieldPointer);
    }));
    if (!matchingRecord) fail(`review-note receipt is stale: ${note.collection}/${note.itemId}`);
  }
  return notes;
}

function verifyClassPrecision(data,handoff,readFile){
  const queue=handoff.reviewQueuesNotSourceAbsences.classPrecisionProposals;
  if(queue.breakdown.productBindingsApplied!==true)return;
  const bytes=readBytes(readFile,queue.proof?.path);
  if(sha256(bytes)!==queue.proof?.sha256)fail('class citation integration receipt is stale');
  const proof=JSON.parse(bytes),reviewBytes=readBytes(readFile,proof.independentReview.path);
  if(sha256(reviewBytes)!==proof.independentReview.sha256)fail('independent class citation review is stale');
  const review=JSON.parse(reviewBytes);
  if(proof.promotedSemanticFields!==queue.breakdown.validFieldsApplied||proof.promotedPageBindings!==queue.breakdown.pageBindingsApplied||proof.retiredOrBlockedFields.length!==queue.breakdown.retiredUnsupportedFields)fail('class citation disposition counts changed');
  for(const target of proof.promoted){
    const item=itemFor(data,'classes',target.itemId),actual=pointerValue(item,target.fieldPointer);
    const expected=target.itemId==='assassin'&&target.fieldPointer==='/levelChanges/35'?review.assassinCompoundTarget:review.targetChecks.find(row=>row.itemId===target.itemId&&row.fieldPointer===target.fieldPointer);
    if(!actual.found||!expected||!sameValue(semanticSnapshot(actual.value),semanticSnapshot(expected.authoredField)))fail(`reviewed class fact changed: ${target.itemId}${target.fieldPointer}`);
    const bound=actual.value.evidenceBindings?.some(binding=>binding.book===target.book&&binding.printedPage===target.printedPage&&binding.regionIds?.includes(target.regionId)&&binding.reviewStatus==='field-target-reviewed');
    if(!bound)fail(`reviewed class citation is missing: ${target.itemId}${target.fieldPointer}`);
  }
}

function verifyPriceInventory(data, handoff, readFile) {
  const inventoryPath = 'research/price-source-inventory.json';
  const inventoryBytes = readBytes(readFile, inventoryPath);
  if (sha256(inventoryBytes) !== handoff.snapshot?.canonicalPriceInventoryFileSha256) fail('canonical price inventory hash differs from the handoff snapshot');
  const inventory = JSON.parse(inventoryBytes.toString('utf8'));
  const expected = handoff.summary.currentExplicitUnextractedEquipmentPriceFields;
  if (inventory.counts?.siteEquipmentObjects !== data.equipment?.length) fail('canonical price inventory equipment count differs from current data');
  if (inventory.counts?.sitePriceGaps !== expected || inventory.counts?.sitePrintedPrices + expected !== data.equipment.length) fail('canonical price inventory price denominator differs from the handoff');
  const siteGaps = handoff.currentSitePriceGaps?.records;
  if (!Array.isArray(siteGaps) || siteGaps.length !== expected) fail('site price-gap records differ from the handoff denominator');
  for (const gap of siteGaps) {
    const item = itemFor(data, 'equipment', gap.itemId);
    if (!item) fail(`site price-gap item is missing: ${gap.itemId}`);
    if (item.price != null) fail(`site price-gap item now has a price: ${gap.itemId}`);
    if (gap.fieldPointer !== '/price' || gap.priceState !== 'unextracted' || gap.reviewStatus !== 'unextracted-gap') fail(`site price-gap classification changed: ${gap.itemId}`);
    if (gap.estimate?.classification === 'editorial-estimate') {
      const expectedEstimate = gap.estimate.value;
      const currentEstimate = item.suggestedPrice;
      const fields = ['amount', 'currency', 'unit', 'rationale', 'comparisons'];
      if (!currentEstimate || fields.some(field => !sameValue(semanticSnapshot(currentEstimate[field]), semanticSnapshot(expectedEstimate[field])))) fail(`editorial estimate changed: ${gap.itemId}`);
    }
  }
  return {inventory, inventorySha256: sha256(inventoryBytes), siteGaps};
}

function verifyEquipmentOffers(data, handoff, readFile) {
  const offers = handoff.equipmentOffers;
  if (!Array.isArray(offers?.records) || offers.records.length !== 3) fail('the three named equipment offer rows are incomplete');
  const reconciliationPath = offers.sourceFile;
  const reconciliationBytes = readBytes(readFile, reconciliationPath);
  const reconciliationSha256 = sha256(reconciliationBytes);
  if (reconciliationSha256 !== offers.sourceFileSha256 || reconciliationSha256 !== handoff.snapshot?.sourceOfferReconciliationFileSha256) fail('source-offer reconciliation file hash is stale');
  const reconciliation = JSON.parse(reconciliationBytes.toString('utf8'));
  if (!sameValue(reconciliation.denominator, offers.denominator)) fail('source-offer denominator differs from the reconciliation');
  const nuanceById = new Map((offers.rowReviewStateNuance || []).map(row => [row.sourceRowId, row]));
  const verifyCurrentMapping = offer => {
    const receipt=offer.currentMappingReview;
    if(!receipt?.path||!receipt.sha256||!Number.isInteger(receipt.recordIndex))fail(`current offer mapping lacks a review receipt: ${offer.sourceRowId}`);
    const bytes=readBytes(readFile,receipt.path);
    if(sha256(bytes)!==receipt.sha256)fail(`current offer review is stale: ${offer.sourceRowId}`);
    const reviewed=JSON.parse(bytes.toString('utf8')).records?.[receipt.recordIndex];
    const item=itemFor(data,'equipment',offer.itemId);
    if(!reviewed||reviewed.independent!==true||reviewed.verdict!=='confirmed'||reviewed.sourceRowId!==offer.sourceRowId||reviewed.itemId!==offer.itemId||reviewed.sourceSha256!==offer.source.sourceSha256||offer.fieldPointer!=='/price'||!item?.price)fail(`current offer review identity differs: ${offer.sourceRowId}`);
    const actual={amount:item.price.amount,currency:item.price.currency,unit:item.price.unit??null};
    if(!sameValue(actual,reviewed.expectedPrice)||actual.amount!==offer.price.amount||actual.currency!==offer.price.currency||item.price.book!==offer.source.book||!item.price.pages?.includes(offer.source.page))fail(`current extracted offer differs from its review: ${offer.sourceRowId}`);
    if(offer.sourceRowId==='ua26-equipment-supplies-011'&&(actual.unit!==null||reviewed.quantityStatus!=='not-stated-in-source-table'))fail('Quarrels quantity must remain explicitly unresolved');
  };
  for (const offer of offers.records) {
    const inventoryBytes = readBytes(readFile, offer.sourceInventoryFile);
    if (sha256(inventoryBytes) !== offer.sourceInventorySha256) fail(`source inventory hash is stale for ${offer.sourceRowId}`);
    const inventory = JSON.parse(inventoryBytes.toString('utf8'));
    const row = inventory.records?.[offer.sourceRecordIndex];
    if (!row || row.sourceObject !== offer.sourceObject || row.price?.amount !== offer.price?.amount || row.price?.currency !== offer.price?.currency || row.source?.book !== offer.source?.book || row.source?.page !== offer.source?.page) fail(`source offer row identity/value changed: ${offer.sourceRowId}`);
    const matchingReconciliation = reconciliation.records?.find(record => record.sourceInventoryFile === offer.sourceInventoryFile && record.sourceRecordIndex === offer.sourceRecordIndex && record.sourceObject === offer.sourceObject);
    if (!matchingReconciliation || matchingReconciliation.price?.amount !== offer.price?.amount || matchingReconciliation.price?.currency !== offer.price?.currency || matchingReconciliation.disposition !== offer.disposition || matchingReconciliation.itemId !== offer.itemId || matchingReconciliation.fieldPointer !== offer.fieldPointer) fail(`source offer reconciliation changed: ${offer.sourceRowId}`);
    if (!nuanceById.has(offer.sourceRowId)) fail(`source offer review grade is missing: ${offer.sourceRowId}`);
  }
  for (const offer of offers.records) {
    if (offer.sourceRowId === 'phb35-equipment-purchase-016') {
      const arrow = itemFor(data, 'equipment', 'phb-arrow');
      const field = arrow?.fields?.['Normal arrows, dozen price'];
      if (!arrow || field !== '1 gp per dozen' || arrow.price?.amount !== 2 || arrow.price?.currency !== 'sp' || arrow.price?.unit !== 'single normal arrow') fail('Arrow dozen field or distinct single-arrow item price changed');
      const nuance = nuanceById.get(offer.sourceRowId);
      if (nuance.currentInventoryReviewStatus !== 'previously-confirmed-review-stale' || nuance.inventoryFresh !== false) fail('Arrow dozen source-row review grade changed');
    } else if (offer.sourceRowId === 'phb35-equipment-purchase-056') {
      const nuance = nuanceById.get(offer.sourceRowId);
      const bullets = itemFor(data, 'equipment', 'phb-sling-bullet');
      if (offer.price?.amount !== 15 || offer.price?.currency !== 'sp') fail('Sling & Bullets dozen source amount changed');
      if(offer.disposition==='extracted-canonical-offer')verifyCurrentMapping(offer);
      else if(offer.disposition!=='unrepresented-distinct-package'||offer.itemId!==null||offer.fieldPointer!==null)fail('Sling & Bullets dozen offer mapping changed');
      if (nuance.currentInventoryReviewStatus !== 'previously-confirmed-review-stale' || nuance.inventoryFresh !== false) fail('Sling & Bullets source-row review grade changed');
      if (!bullets || bullets.price?.amount !== 10 || bullets.price?.currency !== 'sp' || bullets.price?.unit !== 'score of sling bullets') fail('existing sling-bullet score price changed');
    } else if (offer.sourceRowId === 'ua26-equipment-supplies-011') {
      const nuance = nuanceById.get(offer.sourceRowId);
      if (offer.price?.amount !== 100 || offer.price?.currency !== 'gp' || offer.price?.unit != null) fail('Quarrels for same source amount/quantity changed');
      if(offer.disposition==='extracted-quantity-unspecified-offer')verifyCurrentMapping(offer);
      else if(offer.disposition!=='unresolved-source-offer'||offer.itemId!==null||offer.fieldPointer!==null)fail('Quarrels for same offer interpretation changed');
      if (nuance.currentInventoryReviewStatus !== 'source-review-pending' || nuance.boundsStatus !== 'provisional') fail('Quarrels for same review grade changed');
    }
  }
  return {offers, reconciliation, reconciliationSha256};
}

function verifyCensuses(handoff, readFile, priceInventory) {
  const section = handoff.sourcePriceDiscoveryCensuses;
  if (!Array.isArray(section?.censuses) || section.censuses.length !== 3) fail('source-price discovery census records are missing');
  const censusPages = [];
  for (const census of section.censuses) {
    const pages = [];
    for (const path of census.sourceFiles || []) {
      const bytes = readBytes(readFile, path);
      const actualSha256 = sha256(bytes);
      const inventorySha256 = priceInventory.integrity?.sourceCensusHashes?.[path];
      const indexedCensus = priceInventory.sourcePageCensuses?.find(record => record.id === census.id);
      if (!inventorySha256 || actualSha256 !== inventorySha256) fail(`source census artifact hash is stale: ${path}`);
      if (!indexedCensus || indexedCensus.sourceFileSha256 !== actualSha256) fail(`canonical price inventory source-census hash differs: ${path}`);
      const artifact = JSON.parse(bytes.toString('utf8'));
      const pageRows = artifact.pageCensus?.pages || artifact.pageCensus || artifact.pages || [];
      const claimRows = artifact.claims || artifact.records || [];
      const tableRows = artifact.tableGroups || [];
      const pageCount = Array.isArray(pageRows) ? pageRows.length : Object.keys(pageRows).length;
      const claimCount = Array.isArray(claimRows) ? claimRows.length : Object.keys(claimRows).length;
      const tableCount = Array.isArray(tableRows) ? tableRows.length : Object.keys(tableRows).length;
      if (pageCount !== census.pageDenominator) fail(`page-census denominator changed: ${census.id}`);
      const expectedClaims = Object.values(census.claimStatuses || {}).reduce((sum, count) => sum + count, 0);
      const expectedTables = Object.values(census.tableStatuses || {}).reduce((sum, count) => sum + count, 0);
      if (claimCount !== expectedClaims || tableCount !== expectedTables) fail(`discovery census claim/table denominator changed: ${census.id}`);
      pages.push({path, sha256: actualSha256, pageCount, claimCount, tableCount});
    }
    censusPages.push({...census, files: pages});
  }
  const summary = section.summary;
  const actualPages = censusPages.reduce((sum, census) => sum + census.pageDenominator, 0);
  const actualClaims = censusPages.reduce((sum, census) => sum + Object.values(census.claimStatuses).reduce((n, count) => n + count, 0), 0);
  const actualTables = censusPages.reduce((sum, census) => sum + Object.values(census.tableStatuses).reduce((n, count) => n + count, 0), 0);
  if (actualPages !== summary.totalPdfPages || actualClaims !== summary.totalClaims || actualTables !== summary.totalTableGroups) fail('combined source-price discovery census totals changed');
  return censusPages;
}

function sourceLocationsFromReferences(references = []) {
  return uniqueLocations(references.map(reference => ({book: reference.book, printedPage: reference.page ?? reference.printedPage, pdfPage: reference.pdfPage})));
}

function formalIssueEntries(data, handoff) {
  const gapByItem = new Map((handoff.currentSitePriceGaps?.records || []).map(gap => [gap.itemId, gap]));
  const gapRecords = handoff.currentSitePriceGaps?.records || [];
  const issues = [...handoff.mechanicsAudit.formalFieldIssues.notExtracted, ...handoff.mechanicsAudit.formalFieldIssues.sourceConflict];
  return issues.map(issue => {
    const fieldLabel = humanFieldLabel(issue.fieldPointer);
    const title = `${recordTitle(data, issue.collection, issue.itemId)} · ${fieldLabel}`;
    const gap = issue.collection === 'equipment' && issue.fieldPointer === '/price' ? gapByItem.get(issue.itemId) : null;
    let description = issue.value == null
      ? 'No source price is extracted for this record. A listed record reference is not evidence for this specific price field.'
      : String(issue.value);
    if (gap) {
      description = `${gap.priceNote} `;
      if (gap.estimate?.classification === 'editorial-estimate' && gap.estimate.value) {
        const estimate = gap.estimate.value;
        description += `A separate editorial estimate is ${estimate.amount} ${estimate.currency}${estimate.unit ? ` for ${estimate.unit}` : ''}; it is not a printed price. ${estimate.rationale}`;
      }
    } else if (issue.status === 'source-conflict') {
      description = `Recorded source conflict for this field; the status does not claim that every reading is a proven book contradiction. ${String(issue.value)}`;
    } else if (issue.status === 'not-extracted') {
      description = `This field is explicitly marked not extracted. ${String(issue.value)}`;
    }
    const issueListName = issue.status === 'not-extracted' ? 'notExtracted' : 'sourceConflict';
    const issueIndex = handoff.mechanicsAudit.formalFieldIssues[issueListName].indexOf(issue);
    const pointers = [`/mechanicsAudit/formalFieldIssues/${issueListName}/${issueIndex}`];
    if (gap) pointers.push(`/currentSitePriceGaps/records/${gapRecords.indexOf(gap)}`);
    return entry({
      id: `${issue.collection}-${issue.itemId}-${issue.fieldPointer.replaceAll('/', '-').replaceAll(' ', '-').replace(/^-/, '')}`,
      title,
      status: issue.status,
      description,
      sourceLocations: sourceLocationsFromReferences(issue.sourceReferences || []),
      links: openEntryLink(data, issue.collection, issue.itemId),
      handoffPointers: pointers,
    });
  });
}

function noteEntries(data, handoff) {
  return handoff.mechanicsAudit.specificReviewNoteCandidates.notes.map((note, index) => entry({
    id: `review-note-${String(index + 1).padStart(2, '0')}-${note.collection}-${note.itemId}`,
    title: `${recordTitle(data, note.collection, note.itemId)} · recorded caution`,
    status: 'recorded-review-note-candidate',
    description: `${note.reason} This is a recorded review note, not a confirmed gap; it may overlap a formal field status.`,
    sourceLocations: sourceLocationsFromReferences(note.sourceReferences || []),
    links: openEntryLink(data, note.collection, note.itemId),
    handoffPointers: [`/mechanicsAudit/specificReviewNoteCandidates/notes/${index}`],
  }));
}

function missingContentEntries(data, handoff) {
  const section = handoff.missingReferencedContent;
  const entries = [];
  for (const missing of section.missingCitedPages || []) {
    entries.push(entry({
      id: `missing-cited-${missing.book}-${missing.printedPage}`,
      title: `${missing.book} p. ${missing.printedPage} · cited page unavailable`,
      status: 'missing-from-supplied-canonical-pdf',
      description: `${missing.status}. ${missing.privateSupplement?.published ? 'A supplement is published.' : 'A separate private image exists, but its printing is unknown and it is not published.'} The entry contains a bounded Appendix C random character-party procedure; it does not transcribe the complete class-limit or magic-item encounter tables.`,
      sourceLocations: [{book: missing.book, printedPage: missing.printedPage}],
      links: openEntryLink(data, missing.currentReference.collection, missing.currentReference.itemId),
      handoffPointers: ['/missingReferencedContent/missingCitedPages/0'],
    }));
  }
  for (const page of section.unverifiedUnreferencedEndMatter || []) {
    entries.push(entry({
      id: `unverified-endmatter-${page.book}-${page.printedPage}`,
      title: page.printedPage === 239 ? 'DMG · unnumbered perforated reference sheet' : 'DMG · illustrated outside back cover',
      status: 'unverified-uncited-page-identity',
      description: `${page.status}. ${page.distinction} These are unverified and uncited, not confirmed missing pages.`,
      handoffPointers: [`/missingReferencedContent/unverifiedUnreferencedEndMatter/${page.printedPage === 239 ? 0 : 1}`],
    }));
  }
  for (const content of section.otherExplicitReferencedButUnresolvedContent || []) {
    for (let targetIndex = 0; targetIndex < (content.targets || []).length; targetIndex++) {
      const target = content.targets[targetIndex];
      const id = `${content.topic.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${target.itemId}`;
      const locations = content.topic.startsWith('PHB special reaction chart')
        ? [{book: 'PHB', printedPage: 46}]
        : content.sourceReference ? [{book: content.sourceReference.book, printedPage: content.sourceReference.printedPage, pdfPage: content.sourceReference.pdfPage}] : [];
      entries.push(entry({
        id,
        title: `${recordTitle(data, target.collection, target.itemId)} · ${content.topic}`,
        status: 'referenced-content-identity-unresolved',
        description: `${content.reference} ${content.status}. This is an unresolved reference, not a confirmed missing page.`,
        sourceLocations: locations,
        links: openEntryLink(data, target.collection, target.itemId, `Open ${recordTitle(data, target.collection, target.itemId)}`),
        handoffPointers: [`/missingReferencedContent/otherExplicitReferencedButUnresolvedContent/${section.otherExplicitReferencedButUnresolvedContent.indexOf(content)}/targets/${targetIndex}`],
      }));
    }
  }
  return entries;
}

function equipmentOfferEntries(data, handoff) {
  const offers = handoff.equipmentOffers;
  const rowById = new Map(offers.records.map(record => [record.sourceRowId, record]));
  const nuanceById = new Map(offers.rowReviewStateNuance.map(record => [record.sourceRowId, record]));
  const arrow = rowById.get('phb35-equipment-purchase-016');
  const sling = rowById.get('phb35-equipment-purchase-056');
  const quarrels = rowById.get('ua26-equipment-supplies-011');
  if (!arrow || !sling || !quarrels) fail('the Arrow, Sling & Bullets, and Quarrels offer records are required');
  const slingBullet = offers.contrastingExistingSlingBulletPrice;
  const slingExtracted=sling.disposition==='extracted-canonical-offer';
  const quarrelsExtracted=quarrels.disposition==='extracted-quantity-unspecified-offer';
  return [
    entry({
      id: 'phb-arrow-dozen-already-extracted',
      title: 'Normal arrows · dozen package',
      status: 'extracted-separate-field',
      description: `The source offers normal arrows by the dozen for 1 gp; the current record stores that as “${data.equipment.find(item => item.id === 'phb-arrow')?.fields?.['Normal arrows, dozen price'] || 'not present'}” on the normal-arrow entry. Its separate item price remains ${data.equipment.find(item => item.id === 'phb-arrow')?.price?.amount} ${data.equipment.find(item => item.id === 'phb-arrow')?.price?.currency} per ${data.equipment.find(item => item.id === 'phb-arrow')?.price?.unit}. This dozen offer is already extracted and is not a missing item price. The prior source-inventory review is stale, so preserve that grade and refresh before promoting it.`,
      sourceLocations: [{book: arrow.source.book, printedPage: arrow.source.page, pdfPage: arrow.source.pdfPage}],
      links: openEntryLink(data, 'equipment', 'phb-arrow'),
      handoffPointers: ['/equipmentOffers/records/0', '/equipmentOffers/rowReviewStateNuance/0'],
    }),
    entry({
      id: 'phb-sling-bullets-dozen',
      title: 'Sling & Bullets · dozen package',
      status: slingExtracted?'extracted-canonical-offer':'previously-confirmed-review-stale',
      description: slingExtracted?'The independently reviewed PHB p. 35 offer “Sling & Bullets, dozen” is now recorded separately at 15 sp per dozen. The existing sling-bullet entry remains 10 sp per score. These are distinct printed offers; the older source-inventory review remains preserved as historical evidence.':`The PHB p. 35 list gives 15 sp for “Sling & Bullets, dozen.” It is a distinct unrepresented package. The existing sling-bullet entry is 10 sp per score, which is not an equivalent quantity. The prior inventory review is marked stale; refresh that review before treating this package as newly confirmed.`,
      sourceLocations: [{book: sling.source.book, printedPage: sling.source.page, pdfPage: sling.source.pdfPage}],
      links: [...(slingExtracted?openEntryLink(data,'equipment',sling.itemId,'Open dozen offer'):[]),...openEntryLink(data, slingBullet.collection, slingBullet.itemId, 'Open existing sling-bullet entry')],
      handoffPointers: ['/equipmentOffers/records/1', '/equipmentOffers/rowReviewStateNuance/1', '/equipmentOffers/contrastingExistingSlingBulletPrice'],
      ...(slingExtracted?{sourceArtifacts:[{path:sling.currentMappingReview.path,pointer:`/records/${sling.currentMappingReview.recordIndex}`,sha256:sling.currentMappingReview.sha256}]}:{}),
    }),
    entry({
      id: 'ua-quarrels-for-same',
      title: 'Quarrels for same · quantity unclear',
      status: quarrelsExtracted?'extracted-quantity-unresolved':'source-review-pending-provisional-bounds',
      description: quarrelsExtracted?'The independently reviewed UA p. 26 amount of 100 gp for “Quarrels for same” is recorded as a separate printed offer. The table states no quantity. Its quantity and equivalence remain unresolved; this is not a per-bolt price and is not substituted for light or heavy bolts.':`The UA p. 26 row reads “Quarrels for same” at 100 gp. Its quantity or equivalence remains unresolved in the current review; do not infer a per-bolt price or map it to the site’s light/heavy bolts. Source review is pending and the current source bounds are provisional.`,
      sourceLocations: [{book: quarrels.source.book, printedPage: quarrels.source.page, pdfPage: quarrels.source.pdfPage}],
      handoffPointers: ['/equipmentOffers/records/2', '/equipmentOffers/rowReviewStateNuance/2'],
      ...(quarrelsExtracted?{links:openEntryLink(data,'equipment',quarrels.itemId,'Open quantity-unspecified offer'),sourceArtifacts:[{path:quarrels.currentMappingReview.path,pointer:`/records/${quarrels.currentMappingReview.recordIndex}`,sha256:quarrels.currentMappingReview.sha256}]}:{}),
    }),
  ];
}

function sourceCensusEntries(handoff) {
  return handoff.sourcePriceDiscoveryCensuses.censuses.map(census => {
    const detail = census.screeningSummary || {};
    const reports=(handoff.reviewQueuesNotSourceAbsences.rowNormalizedMonetaryReview?.reports||[]).filter(report=>census.sourceFiles.includes(report.sourceCensusPath));
    const structured=reports.length?` Structured output exists for ${reports.reduce((sum,report)=>sum+report.groups,0)} declared groups, covering ${reports.reduce((sum,report)=>sum+report.rows,0)} logical records. Transcription, focus/context review and item-citation mapping are separate; the linked review queue records their current status.`:'';
    let description;
    if (census.id === 'phb-dmg-other') {
      description = `A bounded ${census.pageDenominator}-page PHB/DMG discovery census recorded ${Object.values(census.claimStatuses).reduce((a, b) => a + b, 0)} page/group claims and ${Object.values(census.tableStatuses).reduce((a, b) => a + b, 0)} declared source groups.${structured||' None of those new groups has structured row/claim output.'} Text-screened noncandidate and unreviewed pages do not establish that no price exists.`;
    } else if (census.id === 'ua-other') {
      description = `A bounded ${census.pageDenominator}-page UA census recorded ${Object.values(census.claimStatuses).reduce((a, b) => a + b, 0)} discovery claims and ${Object.values(census.tableStatuses).reduce((a, b) => a + b, 0)} declared source groups.${structured||' No new group has structured row/claim output.'} The basic equipment table is covered by a separate scoped inventory.`;
    } else {
      description = `A bounded MM/MMII census screened ${census.pageDenominator} PDF pages and recorded ${Object.values(census.claimStatuses).reduce((a, b) => a + b, 0)} visually reviewed claims plus ${census.unresolved.length} unresolved candidates. This inventory does not define a table-group denominator or claim whole-book completeness.`;
    }
    return entry({
      id: census.id,
      title: census.id === 'phb-dmg-other' ? 'PHB and DMG discovery census' : census.id === 'ua-other' ? 'UA discovery census' : 'Monster book discovery census',
      status: 'bounded-discovery-not-completeness',
      description: `${description} ${census.limitations.join(' ')}`,
      handoffPointers: [`/sourcePriceDiscoveryCensuses/censuses/${handoff.sourcePriceDiscoveryCensuses.censuses.indexOf(census)}`],
      sourceArtifacts:reports.map(report=>({path:report.path,sha256:report.sha256,pointer:report.monetaryRowsOrClaims!=null?'/review/sourceRowsOrClaims':'/rowRecords'})),
    });
  });
}

function openQuestionEntries(data, handoff) {
  return handoff.otherDocumentedOpenQuestions.map((question, index) => {
    const targetList = Array.isArray(question.targets) ? question.targets : question.target ? [question.target] : [];
    const locations = [];
    for (const source of (Array.isArray(question.sources) ? question.sources : question.source ? [question.source] : question.candidateSources || [])) {
      if (source.printedPage != null) locations.push({book: source.book, printedPage: source.printedPage, pdfPage: source.pdfPage});
      for (const printedPage of source.printedPages || []) locations.push({book: source.book, printedPage, pdfPage: null});
    }
    const desc = `${question.status}. ${question.topic}`;
    return entry({
      id: `open-question-${String(index + 1).padStart(2, '0')}`,
      title: question.topic,
      status: 'documented-open-question',
      description: desc,
      sourceLocations: locations,
      links: targetList.flatMap((ref, targetIndex) => openEntryLink(data, ref.collection, ref.itemId, targetList.length > 1 ? `Open ${recordTitle(data, ref.collection, ref.itemId)}` : 'Open entry')),
      handoffPointers: [`/otherDocumentedOpenQuestions/${index}`],
    });
  });
}

export function supplementalMonetaryPresentation(report) {
  const current = report.currentReview;
  if (!current) return {status: report.independentOverlayReviewPending || report.upstreamIndependentOverlayReviewPending ? 'transcribed-independent-review-pending' : 'general-source-review-pending', description: 'General source and field-highlight review remain pending.'};
  const sum = values => Object.values(values || {}).reduce((total, count) => total + count, 0);
  if (current.sourceInput?.path !== report.path || current.sourceInput?.sha256 !== report.sha256 || current.sourceRows !== report.rows || current.exactAuditRows !== report.rows
      || current.semanticPass !== false || current.sourceAbsence !== false || current.generalReviewPending !== true || current.generalSourceReviewStatus !== 'pending' || !Array.isArray(current.retainedUncertainties)
      || sum(current.knownFindingStatuses) !== current.knownFindings || sum(current.explicitReviewStatuses) !== current.explicitReviews
      || !Number.isInteger(current.globalAudit?.retainedUncertainties)
      || !Array.isArray(current.underlyingSourceQuestions)
      || current.underlyingSourceQuestions.length !== (current.knownFindingKinds?.['unresolved-source-scope'] || 0)
      || current.underlyingSourceQuestions.some(question => question.status !== 'unresolved' || question.semanticPass !== false || !Array.isArray(question.affectedAuditUids) || !question.affectedAuditUids.length)
      || current.underlyingSourceQuestionRows !== new Set(current.underlyingSourceQuestions.flatMap(question => question.affectedAuditUids)).size) fail('supplemental monetary current review identity/counts are invalid');
  const repaired = ['explicit-source-reviewed-repair', 'explicit-source-reviewed-provenance-repair'].reduce((total, status) => total + (current.knownFindingStatuses[status] || 0), 0);
  const qualified = current.knownFindingStatuses['explicit-source-reviewed-qualified-representation'] || 0;
  const pending = current.knownFindings - repaired - qualified;
  const stale = current.explicitReviewStatuses['stale-or-incomplete-review'] || 0;
  if (current.status !== (pending || stale ? 'current-scoped-review-queue' : 'current-scoped-finding-reviews-recorded')) fail('supplemental monetary current review status cannot waive pending findings');
  let description = `Source review has corrected ${repaired} known issues; ${pending} still need review.`;
  if (current.underlyingSourceQuestions.length) description += ` ${current.underlyingSourceQuestions.length} source interpretation questions remain unresolved across ${current.underlyingSourceQuestionRows} records, including any values now explicitly qualified in the extraction.`;
  if (stale) description += ` ${stale} earlier assessments need fresh review.`;
  description += current.globalAudit.currentSourceQuestionRegistry ? ` The current question projection retains ${current.retainedUncertainties.length} unresolved questions for these records and ${current.globalAudit.retainedUncertainties} across monetary records. All ${current.globalAudit.legacyRegisteredQuestions} historical registered questions remain visible, including ${current.globalAudit.derivedAdjudications} derived valuation adjudication with a bounded independent source/integration review.` : ` The legacy question register lists ${current.retainedUncertainties.length} registered questions for these records and ${current.globalAudit.retainedUncertainties} across all monetary records; these raw historical flags are not current semantic verdicts.`;
  if (current.contextMeaning) {
    const meaning = current.contextMeaning, dispositions = meaning.dispositions || {};
    if (meaning.sourceInputSha256 !== report.sha256 || meaning.semanticPass !== false || sum(dispositions) !== meaning.rowDefinitionLinks || !Array.isArray(meaning.unresolvedGlyphAssociations)) fail('supplemental monetary note-meaning review is invalid');
    description += ` Of ${meaning.rowDefinitionLinks} row-to-note links reviewed separately, ${dispositions['source-applicable'] || 0} apply directly, ${dispositions.qualified || 0} need qualifications, and ${dispositions.uncertain || 0} remain uncertain. ${meaning.unresolvedGlyphAssociations.length} Scimitar note-marker associations still need source review.`;
    const retainedUids = new Set(current.retainedUncertainties.map(question => question.uid));
    if (meaning.unresolvedGlyphAssociations.length && meaning.unresolvedGlyphAssociations.every(question => retainedUids.has(`ua-supplement-row:${question.recordId}`))) description += ' Those Scimitar cases are also tracked in the uncertainty register.';
  }
  description += ' General source review remains pending. These results do not verify every row or field highlight or establish complete source coverage. Open review questions do not establish that source material is missing.';
  return {status: pending || stale ? 'source-review-pending' : repaired || qualified ? 'known-issues-reviewed-general-review-pending' : 'general-source-review-pending', description};
}

function reviewQueueEntries(data, handoff) {
  const queue = handoff.reviewQueuesNotSourceAbsences;
  const applied=queue.classPrecisionProposals.breakdown.productBindingsApplied===true;
  const entries = [{
    id: 'class-precision-proposals',
    title: 'Class source-link proposals',
    status: applied?'bounded-links-reviewed-other-facts-pending':'proposal-not-applied',
    description: applied?`Precise citations are applied to ${queue.classPrecisionProposals.breakdown.validFieldsApplied} reviewed class facts. ${queue.classPrecisionProposals.breakdown.retiredUnsupportedFields} unsupported advancement event was removed after source review. Other class facts and citations remain under review.`:'Some class abilities and proficiencies have proposed precise source links. The proposals have not been applied to product entries, and none approves a precise highlight or changes a field-value grade.',
    sourceLocations: [],
    links: [],
    handoffPointers: ['/reviewQueuesNotSourceAbsences/classPrecisionProposals'],
  }];
  if(queue.sourceTableCitationReview){
    const table=queue.sourceTableCitationReview;
    entries.push(entry({id:'source-table-citation-review',title:'Source-table rows and item references',status:'bounded-row-reconciliation',description:`The current source-table inventory reconciles ${table.sourceRows} rows. ${table.confirmedMissingReferenceTargets} confirmed item references still need repair; ${table.uncertainTargets} row-to-item mappings remain uncertain and ${table.rowsWithoutItemTargets} rows have no verified item mapping. These are separate review counts and do not establish complete book coverage.`,handoffPointers:['/reviewQueuesNotSourceAbsences/sourceTableCitationReview']}));
  }
  for(const [index,report]of (queue.rowNormalizedMonetaryReview?.reports||[]).entries()){
    const extra=report.referencePriceRows?` A separate ${report.referencePriceRows}-row reference sheet was reconciled, with ${report.additionalQualifierDifferences} qualifier difference${report.additionalQualifierDifferences===1?'':'s'}.`:'';
    const xp=Number.isInteger(report.xpReferenceCells)?` Its ${report.xpReferenceCells} XP cells are recorded separately from money.`:Number.isInteger(report.xpReferenceRows)?' XP references remain separate from monetary values.':'';
    const current = supplementalMonetaryPresentation(report);
    entries.push(entry({id:`supplemental-monetary-review-${index+1}`,title:report.sourceIdentities?'PHB and DMG monetary records':'UA monetary records',status:current.status,description:`The supplemental inventory records ${report.rows} source rows or passages across ${report.groups} identified groups.${extra}${xp} Amounts, formulas, unavailable values and source references remain distinct; transcription does not prove complete book coverage. ${current.description}`,handoffPointers:[`/reviewQueuesNotSourceAbsences/rowNormalizedMonetaryReview/reports/${index}`],sourceArtifacts:[{path:report.path,pointer:report.sourceIdentities?'/review/sourceRowsOrClaims':'/rowRecords',sha256:report.sha256}]}));
  }
  for (const [index, record] of queue.sourceEdgeCropDefects.records.entries()) {
    entries.push(entry({
      id: `source-edge-crop-${record.itemId}`,
      title: `${recordTitle(data, record.collection, record.itemId)} · source-edge crop limit`,
      status: 'confirmed-source-edge-limitation',
      description: 'The original source page image itself clips glyphs at the page edge. The available crop has been corrected to show the full source edge, but cropping cannot restore text absent from the supplied source image.',
      sourceLocations: [{book: record.book, printedPage: record.printedPage, pdfPage: record.pdfPage}],
      links: openEntryLink(data, record.collection, record.itemId),
      handoffPointers: [`/reviewQueuesNotSourceAbsences/sourceEdgeCropDefects/records/${index}`],
    }));
  }
  entries.push({
    id: 'source-link-and-historical-scope-review',
    title: 'Source-link and historical-scope reviews',
    status: 'review-queue-not-missing-content',
    description: 'Some precise source links, highlights and older review scopes remain under review. This does not show that a fact is missing from the source.',
    sourceLocations: [],
    links: [],
    handoffPointers: ['/reviewQueuesNotSourceAbsences/fieldBindingAndHistoricalScopeQueues'],
  });
  return entries;
}

function continuationEntry(manifest, manifestSha256) {
  if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.groups)) fail('citation continuation manifest is invalid');
  const segments = manifest.groups.flatMap(group => group.segments || []);
  const multipageRequiredGroups = manifest.groups.filter(group => new Set((group.segments || []).filter(segment => segment.state === 'present').map(segment => `${segment.book}:${segment.printedPage}`)).size > 1);
  const locations = [];
  for (const group of manifest.groups) {
    for (const page of group.currentCitationPages || []) {
      const pdfPage = group.segments.find(segment => segment.book === page.book && segment.printedPage === page.printedPage)?.pdfPage
        ?? group.sourceComparison?.pages?.find(segment => segment.book === page.book && segment.printedPage === page.printedPage)?.pdfPage;
      locations.push({book: page.book, printedPage: page.printedPage, pdfPage});
    }
  }
  const abjure = manifest.groups.find(group => group.id === 'ua-cleric-abjure-ua-37');
  if (!abjure || abjure.segments.filter(segment => segment.state === 'present').length !== 2) fail('Abjure continuation excerpt links are missing');
  const abjureLinks = [...abjure.segments].sort((a, b) => a.order - b.order).map((segment, index) => ({
    label: `Open Abjure ${segment.role} excerpt`,
    href: `#spells/ua-cleric-abjure?source=UA%3A37&region=${encodeURIComponent(segment.regionId)}`,
  }));
  const pageScope=multipageRequiredGroups.length?`${multipageRequiredGroups.length} declared passage${multipageRequiredGroups.length===1?' crosses':'s cross'} printed pages. Other declared groups link portions on the same page.`:`All ${manifest.groups.length} declared groups currently place required segments on the same printed page. Real cross-page discovery and review remain unresolved.`;
  const description = `This list tracks ${manifest.groups.length} known continuation groups across ${segments.length} required excerpt segments. ${pageScope} Navigation supports the listed parts together, but this list is not an exhaustive check that every cited passage is complete. Unknown continuations remain a source-review queue; generic flow cues are not semantic proof. Segment context does not certify field values or a precise highlight. Abjure has two selectable UA p. 37 excerpts and a separate PHB p. 47 related-mechanics reference; its precise focus and procedure conflict remain unresolved.`;
  return {entry: entry({
    id: 'known-continuation-cases',
    title: 'Known passage continuations and excerpt limits',
    status: 'known-cases-only',
    description,
    sourceLocations: locations,
    links: abjureLinks,
    handoffPointers: [],
    sourceArtifacts: [{path: 'research/citation-continuations.json', pointer: '/groups', sha256: manifestSha256}],
  }), groupCount: manifest.groups.length, segmentCount: segments.length, multipageRequiredGroupCount: multipageRequiredGroups.length};
}

function verifyOutputTraceability(groups, handoff, readFile) {
  for (const group of groups) {
    for (const row of group.entries) {
      for (const pointer of row.handoffPointers) {
        if (!pointerValue(handoff, pointer).found) fail(`generated entry ${row.id} has a dangling handoff pointer: ${pointer}`);
      }
      for (const artifactRef of row.sourceArtifacts || []) {
        const bytes = readBytes(readFile, artifactRef.path);
        if (sha256(bytes) !== artifactRef.sha256) fail(`generated entry ${row.id} has a stale source artifact: ${artifactRef.path}`);
        const artifact = JSON.parse(bytes.toString('utf8'));
        if (!pointerValue(artifact, artifactRef.pointer).found) fail(`generated entry ${row.id} has a dangling source artifact pointer: ${artifactRef.path}#${artifactRef.pointer}`);
      }
    }
  }
}

export function currentMonetarySourceQuestionEntries(projection){
  validateCurrentMonetarySourceQuestionProjection(projection);
  return projection.records.map((record,index)=>entry({
    id:`monetary-source-question-${record.id}`,
    title:record.currentDisposition==='source-backed-derived-valuation'?'Mammoth tusk derived valuation':record.id.replaceAll('-',' '),
    status:record.currentDisposition,
    description:record.currentDisposition==='source-backed-derived-valuation'?'The Elephant value of 100–600 gp per tusk and the explicit proportionate value relation yield 150–900 gp per Mammoth tusk (×1.5). This is derived arithmetic, not a printed range. A bounded independent source and integration review is recorded; this does not approve a printed range or general source completeness. The original question and raw legacy flag remain in the history.':'This registered source question remains unresolved in the current projection. Its original identity and current record hashes are retained; this is not a claim that the source lacks a value.',
    sourceLocations:record.currentDisposition==='source-backed-derived-valuation'?[{book:'MM',printedPage:65,pdfPage:66},{book:'MM',printedPage:38,pdfPage:39}]:[],
    handoffPointers:[`/currentMonetarySourceQuestions/records/${index}`],
    sourceArtifacts:[{...projection.registry,pointer:`/dispositions/${index}`},{...projection.historicalRegister,pointer:`/uncertainties/${index}`}],
  }));
}

function buildGroups({data, handoff, readFile, mechanics, continuationManifest}) {
  const issues = verifyFormalIssues(data, handoff);
  const notes = verifyReviewNotes(data, handoff, mechanics);
  verifyClassPrecision(data,handoff,readFile);
  const price = verifyPriceInventory(data, handoff, readFile);
  const offerData = verifyEquipmentOffers(data, handoff, readFile);
  const censuses = verifyCensuses(handoff, readFile, price.inventory);
  const missing = missingContentEntries(data, handoff);
  const offers = equipmentOfferEntries(data, handoff);
  const formalEntries = formalIssueEntries(data, handoff);
  const noteRows = noteEntries(data, handoff);
  const censusEntries = sourceCensusEntries(handoff);
  const questions = openQuestionEntries(data, handoff);
  if(handoff.currentMonetarySourceQuestions){
    const projection=handoff.currentMonetarySourceQuestions;
    validateCurrentMonetarySourceQuestionProjection(projection);
    for(const ref of projection.inputs)if(sha256(readBytes(readFile,ref.path))!==ref.sha256)fail(`current source-question dependency is stale: ${ref.path}`);
    questions.push(...currentMonetarySourceQuestionEntries(projection));
  }
  const queues = reviewQueueEntries(data, handoff);
  const continuity = continuationEntry(continuationManifest, sha256(readBytes(readFile, 'research/citation-continuations.json')));
  const gapCount = price.siteGaps.length;
  const censusSummary = handoff.summary.sourceCensus;
  const notesMeta = handoff.mechanicsAudit.specificReviewNoteCandidates;
  const queueMeta = handoff.reviewQueuesNotSourceAbsences;
  return {
    groups: [
      {id: 'missing-referenced-content', title: 'Missing or unresolved referenced content', description: 'A cited source page, an unresolved cross-reference, or an unverified page identity. Unverified uncited pages are not counted as missing.', entries: missing},
      {id: 'formal-field-statuses', title: 'Explicit field statuses', description: 'Specific source statuses recorded for individual fields. “Source conflict” is a field-review status, not a count of proven book contradictions.', entries: formalEntries},
      {id: 'recorded-review-notes', title: 'Recorded review notes', description: 'Cautions and interpretation notes retained with records. They can overlap formal field statuses and are not an additive error count.', entries: noteRows},
      {id: 'equipment-offers', title: 'Distinct equipment offers', description: 'Printed package offers keep their stated quantities and per-item prices separate. Editorial estimates are not printed prices.', entries: offers},
      {id: 'source-price-discovery', title: 'Bounded source-price discovery', description: 'Page and table discovery inventories describe their own screened scope only. They do not certify that all prices in the books have been found.', entries: censusEntries},
      {id: 'open-questions', title: 'Other documented open questions', description: 'Recorded source questions retain their history and explicit current dispositions. Unresolved readings and derived arithmetic remain distinct; do not infer missing values or substitute sources.', entries: questions},
      {id: 'review-queues', title: 'Review queues and source limits', description: 'Pending proposals, links and source-image limitations are workflow information, not missing source facts.', entries: queues},
      {id: 'continuation-limits', title: 'Known continuation and excerpt limits', description: 'Continuation data records known segment requirements only. Source-page locations are not assertions that every field is supported by those pages.', entries: [continuity.entry]},
    ],
    internals: {issues, notes, price, offerData, censuses, censusSummary, notesMeta, queueMeta, sourceOfferCount: offerData.reconciliation.denominator},
    counts: {
      explicitMissingCitedSourcePages: handoff.summary.explicitMissingCitedSourcePages,
      citedPagesWithoutPublishedCropPixels: handoff.summary.citedPagesWithoutPublishedCropPixels,
      unverifiedUncitedEndMatterPages: handoff.summary.unverifiedUncitedEndMatterPages,
      notExtractedFields: handoff.summary.formalMechanicsFieldStatuses.notExtracted,
      sourceConflictFieldStatuses: handoff.summary.formalMechanicsFieldStatuses.sourceConflict,
      recordedReviewNoteCandidates: notesMeta.denominator,
      distinctUnrepresentedOrUnresolvedOffers: handoff.equipmentOffers.denominator.distinctUnrepresentedOrUnresolvedOffers,
      additionalExtractedOfferFields: handoff.equipmentOffers.denominator.additionalExtractedOfferFields,
      unextractedSitePriceFields: gapCount,
      sourceCensusPdfPages: censusSummary.totalPdfPages,
      sourceCensusClaims: censusSummary.claims,
      sourceCensusTableGroups: censusSummary.tableGroups,
      newSourceCensusTableGroupsRowTranscribed: censusSummary.newTableGroupsRowTranscribed,
      classPrecisionProposals: queueMeta.classPrecisionProposals.count,
      emptyRegionTargetBindings: queueMeta.fieldBindingAndHistoricalScopeQueues.emptyRegionTargetBindings,
      fieldEvidenceBindingDenominator: queueMeta.fieldBindingAndHistoricalScopeQueues.fieldEvidenceBindingsDenominator,
      pendingFieldTargets: queueMeta.fieldBindingAndHistoricalScopeQueues.fieldTargetsPending,
      ...(Number.isInteger(queueMeta.fieldBindingAndHistoricalScopeQueues.fieldTargetsReviewed) ? {
        reviewedFieldTargets: queueMeta.fieldBindingAndHistoricalScopeQueues.fieldTargetsReviewed,
        regionTargetResolvedBindings: queueMeta.fieldBindingAndHistoricalScopeQueues.regionTargetResolvedBindings,
        regionResolvedPendingFieldTargets: queueMeta.fieldBindingAndHistoricalScopeQueues.regionResolvedFieldTargetsPending,
      } : {}),
      historicalScopesNeedingReview: queueMeta.fieldBindingAndHistoricalScopeQueues.historicalScopesNeedingReview,
      historicalScopeDenominator: queueMeta.fieldBindingAndHistoricalScopeQueues.historicalScopeDenominator,
      sourceEdgeCropDefects: queueMeta.sourceEdgeCropDefects.count,
      knownContinuationGroups: continuity.groupCount,
      knownContinuationSegments: continuity.segmentCount,
      knownRequiredContinuationGroupsWithMultiplePages: continuity.multipageRequiredGroupCount,
      namedSourceEquipmentOffers: handoff.equipmentOffers.denominator.namedSourceOffers,
      canonicalEquipmentPrices: handoff.equipmentOffers.denominator.canonicalEquipmentPrices,
    },
    denominators: {
      exposedProductRecords: handoff.scope.currentExposedRecords,
      equipmentObjects: data.equipment.length,
      namedSourceEquipmentOffers: handoff.equipmentOffers.denominator.namedSourceOffers,
      rowInventoryEquipmentOffersListed: handoff.equipmentOffers.records.length,
      sourceCensusPdfPages: censusSummary.totalPdfPages,
      sourceCensusClaims: censusSummary.claims,
      sourceCensusTableGroups: censusSummary.tableGroups,
      sourceCensusTableGroupScope: censusSummary.tableGroupDenominatorScope,
      sourceCensusBreakdown: handoff.sourcePriceDiscoveryCensuses.censuses.map(census => ({
        id: census.id,
        pageDenominator: census.pageDenominator,
        claimStatuses: census.claimStatuses,
        tableStatuses: census.tableStatuses,
        unresolvedCount: census.unresolved.length,
        limitationCount: census.limitations.length,
        pageStateCounts: census.pageStateCounts,
      })),
      mechanicsFields: handoff.mechanicsAudit.counts.totalFields,
      mechanicsUncheckedFieldsExcluded: handoff.summary.formalMechanicsFieldStatuses.ordinaryUncheckedFieldsExcluded,
      fieldEvidenceBindings: queueMeta.fieldBindingAndHistoricalScopeQueues.fieldEvidenceBindingsDenominator,
      historicalScopes: queueMeta.fieldBindingAndHistoricalScopeQueues.historicalScopeDenominator,
    },
    exclusions: handoff.excludedFromGapCount,
    verification: {
      sourceOfferReconciliationSha256: offerData.reconciliationSha256,
      canonicalPriceInventorySha256: price.inventorySha256,
      censusFiles: censuses.flatMap(census => census.files),
    },
  };
}

export function buildCoverageGaps({data, handoff, readFile}) {
  const snapshot = verifySnapshot({data, handoff, readFile});
  const mechanicsBytes = readBytes(readFile, 'research/mechanics-audit-progress.json');
  const scanBytes = readBytes(readFile, 'tests/fixtures/source-scan-inventory.json');
  const continuationBytes = readBytes(readFile, 'research/citation-continuations.json');
  const mechanics = JSON.parse(mechanicsBytes.toString('utf8'));
  const scan = JSON.parse(scanBytes.toString('utf8'));
  const continuationManifest = JSON.parse(continuationBytes.toString('utf8'));
  const mechanicsAuditFileSha256 = sha256(mechanicsBytes);
  const sourceScanFileSha256 = sha256(scanBytes);
  if (mechanicsAuditFileSha256 !== handoff.snapshot.mechanicsAuditFileSha256) fail('mechanics audit report file hash differs from the handoff snapshot');
  if (sourceScanFileSha256 !== handoff.snapshot.sourceScanFileSha256) fail('source-scan report file hash differs from the handoff snapshot');
  if (mechanics.input?.sha256 !== handoff.snapshot.mechanicsAuditInputSha256 || scan.input?.sha256 !== handoff.snapshot.sourceScanInputSha256) fail('mechanics/source-scan report input hashes differ from the handoff snapshot');
  const built = buildGroups({data, handoff, readFile, mechanics, continuationManifest});
  verifyOutputTraceability(built.groups, handoff, readFile);
  return {
    schemaVersion: 1,
    title: 'Known gaps & limitations',
    intro: 'This page separates missing cited pages, unresolved source readings, distinct package offers, and work still under review. It does not claim complete coverage of the books. A page reference shows where a record points; it does not prove that every field on the record comes from that page.',
    groups: built.groups,
    snapshot: {
      generatedOn: handoff.generatedOn,
      state: handoff.state,
      dataSha256: snapshot.dataSha256,
      rawDataSha256: snapshot.rawDataSha256,
      handoffSha256: snapshot.handoffSha256,
      mechanicsAuditInputSha256: mechanics.input.sha256,
      mechanicsAuditFileSha256,
      sourceScanInputSha256: scan.input.sha256,
      sourceScanFileSha256,
      canonicalPriceInventorySha256: built.verification.canonicalPriceInventorySha256,
      sourceOfferReconciliationSha256: built.verification.sourceOfferReconciliationSha256,
      recordCount: snapshot.recordCount,
    },
    coverage: {
      counts: built.counts,
      denominators: built.denominators,
      exclusions: built.exclusions,
      sourceCensusFiles: built.verification.censusFiles,
    },
  };
}
