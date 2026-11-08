import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const omitGeneratedBindings = value => {
  if (Array.isArray(value)) return value.map(omitGeneratedBindings);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value)
    .filter(([key]) => key !== 'evidenceBindings')
    .map(([key, child]) => [key, omitGeneratedBindings(child)]));
};
const classDomain = item => item.progression?.kind ?? null;
const numberFromLimit = value => Number.isInteger(value) ? value : Number.isInteger(value?.level) ? value.level : null;

function continuationForLevel(item, level, lastXpLevel) {
  const continuation = item.xpContinuation;
  if (!continuation || typeof continuation !== 'object') return false;
  return Number.isInteger(continuation.afterLevel)
    && Number.isInteger(continuation.increment)
    && continuation.increment > 0
    && continuation.afterLevel <= lastXpLevel
    && level > continuation.afterLevel;
}

function xpDisposition(item, level, xpLevels) {
  if (!Number.isInteger(level)) return 'event-level-unavailable';
  if (xpLevels.includes(level)) return 'tabulated-xp-row';
  if (!xpLevels.length) return 'no-tabulated-xp-rows';
  const lastXpLevel = Math.max(...xpLevels);
  if (level > lastXpLevel) {
    return continuationForLevel(item, level, lastXpLevel)
      ? 'declared-xp-continuation'
      : 'outside-tabulated-xp-without-continuation';
  }
  return 'missing-specific-xp-row';
}

function eventDisposition(item, event, xpLevels) {
  const level = event?.level;
  const declaredMaximums = [
    numberFromLimit(item.maxLevel),
    numberFromLimit(item.levelLimit),
  ].filter(Number.isInteger);
  const effectiveDeclaredMaximum = declaredMaximums.length ? Math.min(...declaredMaximums) : null;
  const outsideDeclaredMaximum = Number.isInteger(level)
    && effectiveDeclaredMaximum !== null
    && level > effectiveDeclaredMaximum;
  const xp = xpDisposition(item, level, xpLevels);
  let coverageDisposition = 'otherwise-covered';
  if (outsideDeclaredMaximum) coverageDisposition = 'outside-declared-maximum';
  else if (xp === 'outside-tabulated-xp-without-continuation') coverageDisposition = xp;
  else if (xp === 'missing-specific-xp-row' || xp === 'no-tabulated-xp-rows' || xp === 'event-level-unavailable') coverageDisposition = xp;
  return {
    level: Number.isInteger(level) ? level : null,
    pointer: null,
    xpDisposition: xp,
    declaredMaximumDisposition: effectiveDeclaredMaximum === null
      ? 'no-explicit-maximum'
      : outsideDeclaredMaximum ? 'outside-declared-maximum' : 'within-declared-maximum',
    effectiveDeclaredMaximum,
    coverageDisposition,
    event: omitGeneratedBindings(event),
  };
}

export function auditClassProgressions(data, input = {}) {
  const classes = Array.isArray(data?.classes) ? data.classes : [];
  const records = classes.map(item => {
    const xpRows = Array.isArray(item.xpRows) ? item.xpRows : [];
    const xpLevels = xpRows.map(row => row.level).filter(Number.isInteger);
    const sourceMaximums = {
      maxLevel: Number.isInteger(item.maxLevel) ? item.maxLevel : null,
      levelLimit: numberFromLimit(item.levelLimit),
    };
    const events = (Array.isArray(item.levelChanges) ? item.levelChanges : []).map((event, index) => {
      const result = eventDisposition(item, event, xpLevels);
      result.pointer = `/levelChanges/${index}`;
      return result;
    });
    return {
      id: item.id,
      name: item.name ?? null,
      progression: item.progression ? {
        kind: classDomain(item),
        label: item.progression.label ?? null,
        description: item.progression.description ?? null,
        references: omitGeneratedBindings(item.progression.references ?? []),
      } : null,
      xp: Array.isArray(item.xp) ? [...item.xp] : null,
      xpRows: omitGeneratedBindings(xpRows),
      xpContinuation: omitGeneratedBindings(item.xpContinuation ?? null),
      maxLevel: sourceMaximums.maxLevel,
      levelLimit: omitGeneratedBindings(item.levelLimit ?? null),
      declaredMaximums: sourceMaximums,
      eventCount: events.length,
      events,
    };
  });
  const events = records.flatMap(record => record.events.map(event => ({classId: record.id, ...event})));
  const coverageCategories = ['outside-declared-maximum', 'outside-tabulated-xp-without-continuation', 'otherwise-covered', 'unclassified'];
  const counts = {
    exposedCollections: Object.fromEntries(Object.entries(data ?? {}).filter(([, value]) => Array.isArray(value)).map(([key, value]) => [key, value.length])),
    classRecords: records.length,
    progressionDomainCounts: Object.fromEntries([...new Set(records.map(record => record.progression?.kind ?? '(none)'))].sort().map(kind => [kind, records.filter(record => (record.progression?.kind ?? '(none)') === kind).length])),
    levelChangeEvents: events.length,
    xpRows: records.reduce((sum, record) => sum + record.xpRows.length, 0),
    recordsWithXpContinuation: records.filter(record => record.xpContinuation !== null).length,
    recordsWithExplicitMaxLevel: records.filter(record => record.maxLevel !== null).length,
    recordsWithExplicitLevelLimit: records.filter(record => record.levelLimit !== null).length,
    eventCoverageDisposition: Object.fromEntries(coverageCategories.map(category => [category, events.filter(event => event.coverageDisposition === category).length])),
    eventXpDisposition: Object.fromEntries([...new Set(events.map(event => event.xpDisposition))].sort().map(status => [status, events.filter(event => event.xpDisposition === status).length])),
  };
  const findings = events.filter(event => event.coverageDisposition !== 'otherwise-covered').map(event => ({
    classId: event.classId,
    pointer: event.pointer,
    level: event.level,
    code: event.coverageDisposition,
    xpDisposition: event.xpDisposition,
    declaredMaximumDisposition: event.declaredMaximumDisposition,
    evidence: event.event,
    interpretation: 'Structural comparison of exposed event levels, explicit maximums, XP rows and declared continuation only. This does not independently establish the printed source meaning or completeness.',
  }));
  return {
    schemaVersion: 1,
    generatedBy: 'tools/class-progression-audit.mjs',
    scope: 'All exposed class progression records in the supplied assembled data, including progression domain, every level-change event, explicit maximum fields, XP rows and declared XP continuation. Findings are structural candidates, not source-verification verdicts.',
    input: {
      path: input.path ?? 'dist/data.json',
      sha256: input.sha256 ?? null,
      commit: input.commit ?? null,
      hashFormat: 'SHA-256 of the exact input file bytes.',
    },
    counts,
    validation: {
      valid: findings.length === 0,
      findingCount: findings.length,
      findings,
      policy: 'Events beyond any explicit declared maximum and events beyond the last tabulated XP row without a structurally usable continuation are reported independently. Last XP rows are not treated as hard caps when a continuation is declared. Source truth remains subject to human review.',
    },
    classes: records,
  };
}

export function renderSummary(report) {
  const lines = [
    '# Class progression audit',
    '',
    `Input: ${report.input.commit ?? 'commit unavailable'} · SHA-256 ${report.input.sha256 ?? 'unavailable'}.`,
    '',
    `The exposed denominator contains ${report.counts.classRecords} class records, ${report.counts.levelChangeEvents} level-change events and ${report.counts.xpRows} XP rows. This is a structural inventory, not proof of whole-book source accuracy.`,
    '',
    '| Event disposition | Count |',
    '| --- | ---: |',
    ...Object.entries(report.counts.eventCoverageDisposition).map(([status, count]) => `| ${status} | ${count} |`),
    '',
    ...report.validation.findings.map(finding => `- **${finding.classId}${finding.pointer} level ${finding.level}:** ${finding.code}; XP disposition ${finding.xpDisposition}. Source meaning remains subject to review.`),
    '',
  ];
  return lines.join('\n');
}

function parseArgs(args) {
  const options = {input: 'dist/data.json', output: null, commit: null, check: false};
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === '--check') options.check = true;
    else if (arg === '--input' || arg === '--output' || arg === '--commit') options[arg.slice(2)] = args[++index];
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const inputPath = path.resolve(root, options.input);
  const inputBytes = fs.readFileSync(inputPath);
  const report = auditClassProgressions(JSON.parse(inputBytes), {
    path: path.relative(root, inputPath),
    sha256: sha256(inputBytes),
    commit: options.commit,
  });
  if (options.output) fs.writeFileSync(path.resolve(root, options.output), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({input: report.input, counts: report.counts, valid: report.validation.valid, findings: report.validation.findings.map(({classId, pointer, level, code, xpDisposition}) => ({classId, pointer, level, code, xpDisposition}))}, null, 2));
  if (options.check && !report.validation.valid) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
