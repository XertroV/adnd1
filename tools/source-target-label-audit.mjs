import {createHash} from 'node:crypto';
import {gzipSync, gunzipSync} from 'node:zlib';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {TextEncoder} from 'node:util';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const rootPath = fileURLToPath(root);
const args = process.argv.slice(2);
const currentMode = args.includes('--current');
const checkMode = args.includes('--check');
const outputOption = args.indexOf('--output-dir');
const currentOutputDir = outputOption >= 0
  ? resolve(args[outputOption + 1] || 'artifacts/citation-target-labels')
  : resolve(rootPath, 'artifacts/citation-target-labels');
const baselinePath = new URL('research/source-audit-batch5-target-label-before.json.gz', root);
const baselineSummaryPath = new URL('research/source-audit-batch5-target-label-before-summary.json', root);
const outputPath = new URL('research/source-audit-batch5-target-label-after.json.gz', root);
const summaryPath = new URL('research/source-audit-batch5-target-label-after-summary.json', root);
const read = async url => new Uint8Array(await readFile(url));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const stable = value => Array.isArray(value)
  ? `[${value.map(stable).join(',')}]`
  : value !== null && typeof value === 'object'
    ? `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`
    : JSON.stringify(value);
const frozenClassifyAfter = (row, afterLabel) => !row.target.fieldPointer
  ? 'page-reference-not-applicable'
  : /\bentry\s+\d+\b/i.test(afterLabel)
    ? 'indexed-pointer-qualified-label'
    : row.category === 'numeric-only-field-label-candidate'
      ? 'explicit-label-retained'
      : 'pre-existing-semantic-unassessed';
const classifyCaption = (target, label) => !target.fieldPointer
  ? 'page-reference-not-applicable'
  : /^\d+$/.test(label)
    ? 'numeric-only-field-label-candidate'
    : 'nonpattern-caption-semantic-unassessed';
const countCategories = rows => rows.reduce((result, row) => (result[row.category] = (result[row.category] || 0) + 1, result), {});

const baselineSummaryBytes = await read(baselineSummaryPath);
const baselineSummary = JSON.parse(Buffer.from(baselineSummaryBytes).toString('utf8'));
const [dataBytes, viewerBytes, citationsBytes] = await Promise.all([
  read(new URL('dist/data.json', root)), read(new URL('dist/source-viewer.js', root)), read(new URL('dist/citations.js', root))
]);
const viewerSource = Buffer.from(viewerBytes).toString('utf8');
const marker = '  root.FirstEditionSourceViewer = Object.freeze({ open, close });';
if (!viewerSource.includes(marker)) throw new Error('Source viewer audit instrumentation marker is absent');
const hooks = `  root.__labelAuditHooks = { setExcerptName(name) { excerptSource = name ? {name} : null; }, fieldTargetLabel };\n`;
const context = vm.createContext({
  document: {currentScript: {src: 'https://audit.invalid/dist/source-viewer.js'}, baseURI: 'https://audit.invalid/dist/'},
  location: {origin: 'https://audit.invalid'}, URL, TextEncoder,
  FirstEditionBooks: {
    books: {PHB: {lastPage: 238}, UA: {lastPage: 160}, DMG: {lastPage: 240}, MM: {lastPage: 112}, MM2: {lastPage: 160}},
    code: value => value, pdfPage: (_book, page) => page + 1, privateEvidence: () => null,
    title: value => value, mapping: () => ''
  }
});
vm.runInContext(viewerSource.replace(marker, hooks + marker), context, {filename: 'dist/source-viewer.js (label audit VM)'});
const label = (target, sourceName) => {
  context.__labelAuditHooks.setExcerptName(sourceName);
  return context.__labelAuditHooks.fieldTargetLabel(target);
};

if (currentMode) {
  const data = JSON.parse(Buffer.from(dataBytes).toString('utf8'));
  const require = createRequire(import.meta.url);
  const citations = require('../dist/citations.js');
  const entries = [];
  const collectionCounts = {};
  let contentRecords = 0;
  const recordGroups = ['rules', 'spells', 'equipment', 'classes', 'matrices'].map(collection => {
    if (!Array.isArray(data[collection])) throw new Error(`Current data collection ${collection} is missing or not an array; audit denominator is not assessable`);
    const seen = new Set();
    for (const record of data[collection]) {
      if (!record || typeof record !== 'object' || Array.isArray(record) || typeof record.id !== 'string' || !record.id.trim()) {
        throw new Error(`Current data collection ${collection} has an invalid record shape; audit denominator is not assessable`);
      }
      if (seen.has(record.id)) throw new Error(`Current data collection ${collection} has duplicate owner id ${record.id}; audit denominator is not assessable`);
      seen.add(record.id);
    }
    return [collection, data[collection]];
  });
  if (data.progressionExplainer && typeof data.progressionExplainer === 'object' && !Array.isArray(data.progressionExplainer)) {
    recordGroups.push(['progressionExplainer', [{...data.progressionExplainer, id: 'progression-explainer'}]]);
  } else if (data.progressionExplainer !== null && data.progressionExplainer !== undefined) {
    throw new Error('Current progressionExplainer has an invalid record shape; audit denominator is not assessable');
  }
  for (const [collection, records] of recordGroups) {
    collectionCounts[collection] = records.length;
    for (const record of records) {
      contentRecords++;
      const sourceName = String(record.name || record.title || record.id);
      const targets = citations.targets(record);
      targets.forEach((target, index) => {
        const owner = target.fieldOwner || target.sourceOwner || {collection, itemId: record.id};
        const beforeLabel = (() => {
          const pointerLabel = String(target.fieldPointer || '').split('/').filter(Boolean).at(-1)?.replace(/~1/g, '/').replace(/~0/g, '~') || '';
          const oldLabel = String(target.label || '').trim();
          return target.fieldPointer && (!oldLabel || oldLabel === target.sourceObject || oldLabel === sourceName)
            ? pointerLabel || oldLabel : oldLabel || pointerLabel || 'Citation target';
        })();
        const afterLabel = label(target, sourceName);
        entries.push({
          id: sha(Buffer.from(stable({collection, owner, sourceName, index, target}))),
          owner,
          sourceName,
          targetOrdinal: index,
          book: target.book,
          printedPage: target.page,
          fieldPointer: target.fieldPointer || null,
          sourceCategory: target.sourceCategory || null,
          regionIds: target.regionIds || [],
          reviewStatus: target.reviewStatus || null,
          targetStatus: target.targetStatus || null,
          beforeLabel,
          afterLabel,
          beforeCategory: classifyCaption(target, beforeLabel),
          afterCategory: classifyCaption(target, afterLabel),
          formatterPathLabel: /\bentry\s+\d+\b/i.test(afterLabel)
        });
      });
    }
  }
  const beforeCounts = countCategories(entries.map(row => ({category: row.beforeCategory})));
  const afterCounts = countCategories(entries.map(row => ({category: row.afterCategory})));
  const primaryRouteRecords = ['rules', 'spells', 'equipment', 'classes']
    .reduce((sum, collection) => sum + collectionCounts[collection], 0);
  const auxiliaryRouteRecords = ['matrices', 'progressionExplainer']
    .reduce((sum, collection) => sum + (collectionCounts[collection] || 0), 0);
  const result = {
    schemaVersion: 1,
    artifactType: 'current-data-source-viewer-target-label-audit',
    scope: 'Current data collector targets formatted with the actual current source-viewer fieldTargetLabel function. This is not a browser-rendered route sweep; semantic correctness of nonnumeric labels is not assessed.',
    provenance: {
      sourceDataSha256: sha(dataBytes), viewerSha256: sha(viewerBytes), citationsSha256: sha(citationsBytes),
      frozenCalibrationBaselineDataSha256: baselineSummary.provenance.sourceDataSha256,
      frozenCalibrationBaselineSha256: baselineSummary.fullSnapshot.sha256,
      frozenHistoricalRenderedInventorySha256: baselineSummary.provenance.renderedInventorySha256
    },
    denominator: {
      contentRecords,
      routeRecords: primaryRouteRecords + auxiliaryRouteRecords,
      primaryRouteRecords,
      auxiliaryRouteRecords,
      collections: collectionCounts,
      collectorTargets: entries.length,
      currentBrowserRenderedControls: 'not-run',
      currentDistinctRenderedPayloads: 'not-assessed',
      historicalBrowserSweep: {routeRecords: baselineSummary.denominator.routeRecords, controls: baselineSummary.denominator.renderedControls, distinctPayloads: baselineSummary.denominator.renderedDistinctPayloads}
    },
    categories: {
      beforeCurrentFormatter: beforeCounts,
      afterCurrentFormatter: afterCounts,
      afterFormatterPathLabels: entries.filter(row => row.formatterPathLabel).length,
      afterNumericOnlyCandidates: entries.filter(row => row.afterCategory === 'numeric-only-field-label-candidate').length,
      nonpatternSemanticUnassessed: entries.filter(row => row.afterCategory === 'nonpattern-caption-semantic-unassessed').length,
      pageReferencesNotApplicable: entries.filter(row => row.afterCategory === 'page-reference-not-applicable').length,
      note: 'A nonnumeric or path-qualified caption is not a semantic source review pass.'
    },
    entries
  };
  const jsonBytes = Buffer.from(`${JSON.stringify(result, null, 2)}\n`);
  const compressed = gzipSync(jsonBytes, {level: 9, mtime: 0});
  await mkdir(currentOutputDir, {recursive: true});
  const currentReportPath = resolve(currentOutputDir, 'current.json.gz');
  const currentSummaryPath = resolve(currentOutputDir, 'current-summary.json');
  await writeFile(currentReportPath, compressed);
  const summary = {
    schemaVersion: 1,
    artifactType: result.artifactType,
    scope: result.scope,
    provenance: result.provenance,
    denominator: result.denominator,
    categories: result.categories,
    fullReport: {path: currentReportPath, sha256: sha(compressed), uncompressedSha256: sha(jsonBytes)}
  };
  await writeFile(currentSummaryPath, `${JSON.stringify(summary, null, 2)}\n`);
  console.log(JSON.stringify(summary, null, 2));
  if (checkMode && summary.categories.afterNumericOnlyCandidates > 0) {
    console.error(`--check failed: ${summary.categories.afterNumericOnlyCandidates} current field target captions remain numeric-only`);
    process.exitCode = 1;
  }
  process.exit(process.exitCode || 0);
}

const baselineBytes = await read(baselinePath);
const baselineCompressedSha = sha(baselineBytes);
const baselineRaw = gunzipSync(baselineBytes);
const baselineRawSha = sha(baselineRaw);
const baseline = JSON.parse(baselineRaw.toString('utf8'));
if (baselineCompressedSha !== baselineSummary.fullSnapshot.sha256 || baselineRawSha !== baselineSummary.fullSnapshot.uncompressedSha256) {
  throw new Error('Frozen label-audit baseline hash mismatch');
}

const counts = rows => rows.reduce((result, row) => (result[row.category] = (result[row.category] || 0) + 1, result), {});
const describe = (row, collection) => {
  const afterLabel = label(row.target, row.sourceName);
  return {
    id: sha(Buffer.from(stable({collection, owner: row.owner || null, target: row.target}))),
    collection,
    ...(row.owner ? {owner: row.owner} : {}),
    fieldPointer: row.target.fieldPointer || null,
    beforeLabel: row.predictedLabel,
    afterLabel,
    beforeCategory: row.category,
    afterCategory: frozenClassifyAfter(row, afterLabel)
  };
};
const collected = baseline.collected.map(row => describe(row, 'collected'));
const rendered = baseline.rendered.map(row => describe(row, 'rendered'));
const combined = [...collected, ...rendered];
const changedLabels = combined.filter(row => row.beforeLabel !== row.afterLabel);
const frozenResult = {
  schemaVersion: 1,
  scope: 'The exact frozen 995-record collector and 993-route rendered-label payload inventories captured before the fieldTargetLabel fix. This audit evaluates labels only; it does not verify source meaning or citation geometry.',
  provenance: {
    baselinePath: 'research/source-audit-batch5-target-label-before.json.gz',
    baselineCompressedSha256: baselineCompressedSha,
    baselineUncompressedSha256: baselineRawSha,
    baselineSummarySha256: sha(baselineSummaryBytes),
    sourceDataSha256: baselineSummary.provenance.sourceDataSha256,
    viewerSha256: sha(viewerBytes),
    citationsSha256: sha(citationsBytes),
    baselineRenderedInventorySha256: baselineSummary.provenance.renderedInventorySha256
  },
  denominator: {
    contentRecords: baseline.denominator.contentRecords,
    routeRecords: baseline.denominator.routeRecords,
    renderedControls: baseline.denominator.renderedControls,
    collectedTargets: collected.length,
    renderedDistinctPayloads: rendered.length
  },
  counts: {
    beforeCollected: baselineSummary.categories.collected,
    beforeRendered: baselineSummary.categories.rendered,
    afterCollected: counts(collected.map(row => ({category: row.afterCategory}))),
    afterRendered: counts(rendered.map(row => ({category: row.afterCategory}))),
    labelsChanged: changedLabels.length,
    changedNumericCandidates: changedLabels.filter(row => row.beforeCategory === 'numeric-only-field-label-candidate').length,
    semanticLabelsUnassessed: {
      collected: 717,
      renderedDistinctPayloads: 717,
      note: 'Preserved as a separate unassessed universe; nonnumeric appearance is not a semantic pass.'
    }
  },
  entries: {collected, rendered}
};
const jsonBytes = Buffer.from(`${JSON.stringify(frozenResult, null, 2)}\n`);
const compressed = gzipSync(jsonBytes, {level: 9, mtime: 0});
const summary = {
  schemaVersion: 1,
  scope: frozenResult.scope,
  provenance: frozenResult.provenance,
  denominator: frozenResult.denominator,
  counts: frozenResult.counts,
  fullReport: {path: 'research/source-audit-batch5-target-label-after.json.gz', sha256: sha(compressed), uncompressedSha256: sha(jsonBytes)}
};
const existing = await read(outputPath).catch(() => null);
if (existing && sha(existing) !== sha(compressed)) throw new Error('Frozen after report exists with a different digest; refusing to overwrite calibration evidence');
if (!existing) await writeFile(outputPath, compressed);
const oldSummaryBytes = await read(summaryPath).catch(() => null);
const summaryBytes = Buffer.from(`${JSON.stringify(summary, null, 2)}\n`);
if (oldSummaryBytes && sha(oldSummaryBytes) !== sha(summaryBytes)) throw new Error('Frozen after summary exists with a different digest; refusing to overwrite calibration evidence');
if (!oldSummaryBytes) await writeFile(summaryPath, summaryBytes);
console.log(JSON.stringify(summary, null, 2));
