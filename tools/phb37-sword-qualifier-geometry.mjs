import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPORT = path.join(ROOT, 'research/source-audit-batch5-phb37-sword-qualifier-review.json');
const LONG_FILE = path.join(ROOT, 'dist/scans/verified/equipment-phb-long-sword.json');
const SHORT_FILE = path.join(ROOT, 'dist/scans/verified/equipment-phb-short-sword.json');
const LONG_ID = 'phb-37-2b2447ac14bb294c';
const SHORT_ID = 'phb-37-c9406fdb229bfe86';
const EPSILON = 1e-8;

function contains(outer, inner) {
  return outer[0] <= inner[0] + EPSILON &&
    outer[1] <= inner[1] + EPSILON &&
    outer[0] + outer[2] >= inner[0] + inner[2] - EPSILON &&
    outer[1] + outer[3] >= inner[1] + inner[3] - EPSILON;
}

function intersects(a, b) {
  return Math.min(a[0] + a[2], b[0] + b[2]) > Math.max(a[0], b[0]) + EPSILON &&
    Math.min(a[1] + a[3], b[1] + b[3]) > Math.max(a[1], b[1]) + EPSILON;
}

function regionFromFile(file, id) {
  const doc = JSON.parse(fs.readFileSync(file, 'utf8'));
  const region = doc.regions.find((candidate) => candidate.id === id);
  if (!region) throw new Error(`Missing stable region ${id} in ${path.relative(ROOT, file)}`);
  return region;
}

export function evaluateDeclaredGeometry(longRegion, shortRegion, repairPlan) {
  const longRect = repairPlan.long.mustCover;
  const forbiddenShortNote = repairPlan.long.mustNotOverlap;
  const completeShortRow = repairPlan.short.mustCover;
  const longFocuses = longRegion.focusRects ?? [];
  const shortFocuses = shortRegion.focusRects ?? [];
  const findings = [];

  if (!longFocuses.some((focus) => contains(focus, longRect))) {
    findings.push('long-required-row-not-covered');
  }
  if (longFocuses.some((focus) => intersects(focus, forbiddenShortNote))) {
    findings.push('long-focus-overlaps-forbidden-short-qualifier');
  }
  if (!shortFocuses.some((focus) => contains(focus, completeShortRow))) {
    findings.push('short-focus-misses-complete-wrapped-row-and-qualifier');
  }
  return findings;
}

export function loadRepairPlan() {
  return JSON.parse(fs.readFileSync(REPORT, 'utf8')).repairPlan;
}

export function loadCurrentRegions() {
  return {
    long: regionFromFile(LONG_FILE, LONG_ID),
    short: regionFromFile(SHORT_FILE, SHORT_ID),
  };
}

export function loadPreservedBeforeRegions() {
  const report = JSON.parse(fs.readFileSync(REPORT, 'utf8'));
  return {
    long: { id: LONG_ID, focusRects: report.failingFixturesCapturedBeforeRepair.long.focusRects },
    short: { id: SHORT_ID, focusRects: report.failingFixturesCapturedBeforeRepair.short.focusRects },
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const plan = loadRepairPlan();
  const mode = process.argv.includes('--before') ? 'before' : 'current';
  const pair = mode === 'before' ? loadPreservedBeforeRegions() : loadCurrentRegions();
  const findings = evaluateDeclaredGeometry(pair.long, pair.short, plan);
  const result = { mode, pass: findings.length === 0, findings };
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (findings.length) process.exitCode = 1;
}
