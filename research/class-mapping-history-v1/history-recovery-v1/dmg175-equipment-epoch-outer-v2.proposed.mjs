// Research-only proposal. This file is not imported by active tests or tools.
// It reverses the exact 987 SOURCE equipment leaf epoch before named historical
// fixtures run; it never edits equipment.json, dist/data.json, or a live record.
import assert from 'node:assert/strict';
import {createHistoricalControlledGit} from '../historical-controlled-git-v1.mjs';
import {createHash} from 'node:crypto';
import {readVersion29HistoricalFile, normalizeVersion29HistoricalBytes, normalizeVersion29HistoricalJson, isVersion29HistoricalPath} from '../closed-version29-reader-class-mapping-v1.mjs';
const readFileSync=readVersion29HistoricalFile;
import {dirname, relative, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {withoutBatch6JoEquipment} from '../../../tests/helpers/ua-source-batch6-jo-fixture.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../../..');
const baselineCommit = '386b08a4678ee033d6daabc0ffa2cc17265a7c1f';
const baselineTree = '2611405f3c8ab151936cb0f83ed57334141e1146';
const sourceCommit = '987a25d3ba2dcac0940569a2afab73f775e38028';
const sourceTree = 'd7ac09ce9abe4ef94ae355a44b8e0c5ca6f74ea3';
const sourceEquipmentSha256 = '714d40b9ed9908a069fddc08525d43437c9e974b984572eb1c505c37ee8cae95';
const baselineEquipmentSha256 = '9c831f319a8d58bd3c943c610a89326975f622015b760073217ecf0f7b55e6f7';
const sourceDataSha256 = 'fd73ee5f535124883e73081cd02c67360b331591cee17ae5278639230b375e0d';
const adjustmentField = 'Hurled or missile weapon AC adjustments at short range (UA p.28)';
const expectedLeaves = [
  {id: 'phb-hammer', value: 'AC 0 through 10: -4, -3, -2, -1, 0, 0, 0, 0, 0, 0, +1'},
  {id: 'phb-javelin', value: 'AC 0 through 10: -7, -6, -5, -4, -3, -2, -1, 0, +1, 0, +1'},
  {id: 'ua-harpoon', value: 'AC 0 through 10: -6, -5, -4, -3, -2, -1, 0, 0, 0, 0, +1'},
];
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

const {git,spawnGit}=createHistoricalControlledGit(root);

function assertPinnedAncestry() {
  assert.equal(git(['rev-parse', baselineCommit + '^{tree}'], {encoding: 'utf8'}).trim(), baselineTree,
    'the exact V28 baseline tree is required');
  assert.equal(git(['rev-parse', sourceCommit + '^{tree}'], {encoding: 'utf8'}).trim(), sourceTree,
    'the exact SOURCE commit tree is required');
  assert.equal(spawnGit(['merge-base', '--is-ancestor', sourceCommit, 'HEAD']).status, 0,
    'the exact SOURCE commit must be an ancestor; metadata-only descendants are allowed');
}

function pinnedEquipment() {
  assertPinnedAncestry();
  const beforeBytes = git(['show', baselineCommit + ':equipment.json']);
  const currentBytes = git(['show', sourceCommit + ':equipment.json']);
  const currentDataBytes = git(['show', sourceCommit + ':dist/data.json']);
  assert.equal(sha(beforeBytes), baselineEquipmentSha256, 'exact complete V28 equipment bytes required');
  assert.equal(sha(currentBytes), sourceEquipmentSha256, 'exact complete SOURCE equipment bytes required');
  assert.equal(sha(currentDataBytes), sourceDataSha256, 'exact SOURCE assembly bytes are a read-only qualification input');

  const before = JSON.parse(beforeBytes);
  const current = JSON.parse(currentBytes);
  const sourceData = JSON.parse(currentDataBytes);
  assert.equal(before.equipment.length, 192, 'V28 equipment denominator');
  assert.equal(current.equipment.length, 192, 'SOURCE equipment denominator');
  assert.deepEqual(before.equipment.map(item => item.id), current.equipment.map(item => item.id),
    'equipment owner identity and order are retained');

  const beforeById = new Map(before.equipment.map(item => [item.id, item]));
  const currentById = new Map(current.equipment.map(item => [item.id, item]));
  const assembledById = new Map(sourceData.equipment.map(item => [item.id, item]));
  const changed = [];
  for (const {id, value} of expectedLeaves) {
    const oldItem = beforeById.get(id);
    const currentItem = currentById.get(id);
    const assembledItem = assembledById.get(id);
    assert.ok(oldItem && currentItem && assembledItem, id + ': exact owner is required');
    assert.equal(Object.hasOwn(oldItem.fields || {}, adjustmentField), false, id + ': V28 field must be absent');
    assert.equal(Object.hasOwn(oldItem.fieldSources || {}, adjustmentField), false, id + ': V28 field source must be absent');
    assert.equal(currentItem.fields?.[adjustmentField], value, id + ': exact current string leaf required');
    assert.equal(assembledItem.fields?.[adjustmentField], value, id + ': exact assembled SOURCE string leaf required');
    assert.deepEqual(assembledItem.fieldSources?.[adjustmentField], sourceData.equipment.find(row => row.id === id).fieldSources[adjustmentField],
      id + ': source field-source record must be present');
    assert.equal(currentItem.fieldSources?.[adjustmentField]?.book, 'UA', id + ': source book');
    assert.deepEqual(currentItem.fieldSources?.[adjustmentField]?.pages, [28], id + ': printed page');
    assert.equal(currentItem.fieldSources?.[adjustmentField]?.status,
      'Candidate source row transcription; target and source-value review pending.', id + ': value remains ungraded');
    changed.push('/equipment/' + id + '/fields/' + adjustmentField);
    changed.push('/equipment/' + id + '/fieldSources/' + adjustmentField);
  }

  // After removing only the six declared leaves, every other equipment value
  // must be exactly equal across the two complete file endpoints.
  const stripLeaves = value => {
    const copy = structuredClone(value);
    for (const {id} of expectedLeaves) {
      const item = copy.equipment.find(row => row.id === id);
      delete item.fields[adjustmentField];
      delete item.fieldSources[adjustmentField];
    }
    return copy;
  };
  assert.deepEqual(stripLeaves(current), before, 'only the six declared UA p.28 leaves differ');
  return {beforeBytes, currentBytes, before, current, sourceData, changed};
}

function equipmentPath(path) {
  assert.ok(typeof path === 'string' || path instanceof URL, 'an equipment.json path is required');
  const absolute = path instanceof URL ? fileURLToPath(path) : resolve(String(path));
  const local = relative(root, absolute).replaceAll('\\', '/');
  assert.equal(local, 'equipment.json', 'the equipment epoch accepts only the exact equipment.json path');
  return absolute;
}

function withEncoding(bytes, options) {
  const encoding = typeof options === 'string' ? options : options?.encoding;
  return encoding ? bytes.toString(encoding) : bytes;
}

// Complete raw-file SOURCE -> V28 inverse. Any unknown path, hash, mixed state,
// ancestry, or payload difference rejects. Before-state idempotence is not implicit.
export function readV28Dmg175EquipmentFile(path, options) {
  const absolute = equipmentPath(path);
  const {beforeBytes, currentBytes} = pinnedEquipment();
  const liveBytes = readFileSync(absolute);
  assert.equal(sha(liveBytes), sha(currentBytes), 'live equipment.json must match the complete pinned SOURCE blob');
  return withEncoding(Buffer.from(beforeBytes), options);
}

// Scoped composition for the existing Jo historical fixture. The unchanged Jo
// adapter receives V28 bytes, and its exact expected output is hash-pinned.
export function readBeforeJoEquipmentFileThroughDmg175Epoch(path, options) {
  const bytes = Buffer.from(readV28Dmg175EquipmentFile(path));
  const parsed = JSON.parse(bytes);
  const joProjected = {...parsed, equipment: withoutBatch6JoEquipment(parsed.equipment)};
  const result = Buffer.from(JSON.stringify(joProjected, null, 2) + '\n');
  assert.equal(sha(result), '469c3d6643a209473e1ee5d052ad9e9320d00e69172130b151ada877e3846edf',
    'the exact V28-plus-existing-Jo historical fixture bytes are required');
  return withEncoding(result, options);
}

// Historical object comparisons may need the same six-leaf context when their
// input is a copied SOURCE assembled equipment array. Only those three exact
// owners are changed in the returned copy; the live array is never mutated.
export function projectDmg175EquipmentLeavesForHistoricalFixture(records) {
  assert.ok(Array.isArray(records), 'a copied equipment record array is required');
  const {sourceData} = pinnedEquipment();
  assert.equal(records.length, sourceData.equipment.length, 'the SOURCE equipment array denominator is exact');
  assert.deepEqual(records, sourceData.equipment,
    'only the complete pinned SOURCE assembled equipment array may enter this historical comparison');
  const expectedById = new Map(sourceData.equipment.map(item => [item.id, item]));
  const copy = structuredClone(records);
  for (const {id, value} of expectedLeaves) {
    const matches = copy.filter(item => item?.id === id);
    assert.equal(matches.length, 1, id + ': exact unique owner required');
    const item = matches[0];
    const expected = expectedById.get(id);
    assert.equal(item.fields?.[adjustmentField], value, id + ': exact SOURCE string leaf required');
    assert.deepEqual(item.fieldSources?.[adjustmentField], expected.fieldSources?.[adjustmentField],
      id + ': exact SOURCE field-source and generated binding object required');
    delete item.fields[adjustmentField];
    delete item.fieldSources[adjustmentField];
  }
  return copy;
}
