import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync, spawnSync} from 'node:child_process';
import {mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {validateCitationEvidenceSeals} from '../tools/citation-evidence-seals.mjs';

const repoRoot = new URL('../', import.meta.url);
const toolPath = new URL('../tools/citation-evidence-seals.mjs', import.meta.url);
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const fixtureManifest = JSON.parse(readFileSync(new URL('./fixtures/citation-evidence-seals-example.json', import.meta.url), 'utf8'));

function writeJson(root, relative, value) {
  const path = join(root, ...relative.split('/'));
  mkdirSync(join(path, '..'), {recursive: true});
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function seal(id, path, bytes) {
  return {id, path, sha256: sha256(bytes), sizeBytes: bytes.length};
}

function initGit(root) {
  execFileSync('git', ['init', '-q'], {cwd: root});
  execFileSync('git', ['config', 'user.name', 'Evidence Seal Test'], {cwd: root});
  execFileSync('git', ['config', 'user.email', 'evidence-seal-test@example.invalid'], {cwd: root});
}

function commitAll(root, message) {
  execFileSync('git', ['add', '--all'], {cwd: root});
  execFileSync('git', ['commit', '-q', '-m', message], {cwd: root});
  return execFileSync('git', ['rev-parse', 'HEAD'], {cwd: root, encoding: 'utf8'}).trim();
}

function tempRepo(t) {
  const root = mkdtempSync(join(tmpdir(), 'citation-evidence-seals-'));
  t.after(() => rmSync(root, {recursive: true, force: true}));
  mkdirSync(join(root, 'research'), {recursive: true});
  mkdirSync(join(root, 'tests', 'fixtures'), {recursive: true});
  initGit(root);
  return root;
}

test('the small checked-in example manifest seals only its exact fixture bytes', () => {
  const schema = JSON.parse(readFileSync(new URL('../research/citation-evidence-seals.schema.json', import.meta.url), 'utf8'));
  assert.equal(schema.properties.schemaVersion.const, 1);
  assert.deepEqual(fixtureManifest.seals.map(({id, path}) => [id, path]), [['small-public-fixture', 'tests/fixtures/citation-evidence-seal-example.txt']]);
  const result = validateCitationEvidenceSeals({manifestPath: 'tests/fixtures/citation-evidence-seals-example.json'});
  assert.equal(result.status, 'validated');
  assert.equal(result.sealCount, 1);
  assert.equal(result.baselineStatus, 'not-requested');
});

test('schema path rules and runtime validation agree on normalized and malformed paths', t => {
  const root = tempRepo(t), schema = JSON.parse(readFileSync(new URL('../research/citation-evidence-seals.schema.json', import.meta.url), 'utf8'));
  const pathPattern = new RegExp(schema.properties.seals.items.properties.path.pattern);
  const bytes = Buffer.from('path matrix evidence\n');
  const manifestPath = 'research/citation-evidence-seals.json';
  const cases = [
    ['research/proof.json', true],
    ['research/nested/evidence v1.json', true],
    ['tests/fixtures/old.txt', true],
    ['tests/fixtures/subdir/.hidden', true],
    ['research/../outside.json', false],
    ['research//proof.json', false],
    ['research/./proof.txt', false],
    ['tests/fixtures/./proof.txt', false],
    ['research/foo\\bar', false],
    ['research/\0proof', false],
    ['research', false],
    ['tests/other/proof.json', false],
    ['/tmp/proof.json', false],
  ];

  for (const [index, [path, expected]] of cases.entries()) {
    if (expected) {
      const evidencePath = join(root, ...path.split('/'));
      mkdirSync(join(evidencePath, '..'), {recursive: true});
      writeFileSync(evidencePath, bytes);
    }
    writeJson(root, manifestPath, {
      schemaVersion: 1,
      artifactType: 'append-only-citation-evidence-seals',
      seals: [seal(`path-${index}`, path, bytes)],
    });
    const schemaAccepts = pathPattern.test(path);
    let runtimeAccepts = true;
    try {
      validateCitationEvidenceSeals({repoRoot: root, manifestPath});
    } catch {
      runtimeAccepts = false;
    }
    assert.equal(schemaAccepts, expected, `schema decision for ${JSON.stringify(path)}`);
    assert.equal(runtimeAccepts, expected, `runtime decision for ${JSON.stringify(path)}`);
  }
});

test('size schema bound matches runtime safe-integer handling', t => {
  const root = tempRepo(t), schema = JSON.parse(readFileSync(new URL('../research/citation-evidence-seals.schema.json', import.meta.url), 'utf8'));
  const sizeSchema = schema.properties.seals.items.properties.sizeBytes;
  const maximum = Number.MAX_SAFE_INTEGER;
  const bytes = Buffer.from('small size-limit evidence\n');
  const evidencePath = 'research/proof.json';
  const manifestPath = 'research/citation-evidence-seals.json';
  writeFileSync(join(root, evidencePath), bytes);
  assert.equal(sizeSchema.type, 'integer');
  assert.equal(sizeSchema.minimum, 0);
  assert.equal(sizeSchema.maximum, maximum);
  assert.ok(Number.isSafeInteger(maximum));
  assert.equal(maximum <= sizeSchema.maximum, true);
  assert.equal(maximum + 1 <= sizeSchema.maximum, false);

  const validSeal = seal('max-safe-size', evidencePath, bytes);
  writeJson(root, manifestPath, {schemaVersion: 1, artifactType: 'append-only-citation-evidence-seals', seals: [{...validSeal, sizeBytes: maximum}]});
  assert.throws(() => validateCitationEvidenceSeals({repoRoot: root, manifestPath}), /size mismatch/);
  writeJson(root, manifestPath, {schemaVersion: 1, artifactType: 'append-only-citation-evidence-seals', seals: [{...validSeal, sizeBytes: maximum + 1}]});
  assert.throws(() => validateCitationEvidenceSeals({repoRoot: root, manifestPath}), /sizeBytes must be a non-negative safe integer/);
});

test('a real Git baseline preserves the exact old ordered prefix and accepts only appended new paths', t => {
  const root = tempRepo(t), oldBytes = Buffer.from('immutable evidence v1\n'), newBytes = Buffer.from('new evidence v2\n');
  writeFileSync(join(root, 'research', 'sealed-proof-v1.json'), oldBytes);
  writeJson(root, 'research/citation-evidence-seals.json', {
    schemaVersion: 1,
    artifactType: 'append-only-citation-evidence-seals',
    seals: [seal('proof-v1', 'research/sealed-proof-v1.json', oldBytes)],
  });
  const baseline = commitAll(root, 'capture initial evidence seal');

  writeFileSync(join(root, 'research', 'sealed-proof-v2.json'), newBytes);
  writeJson(root, 'research/citation-evidence-seals.json', {
    schemaVersion: 1,
    artifactType: 'append-only-citation-evidence-seals',
    seals: [
      seal('proof-v1', 'research/sealed-proof-v1.json', oldBytes),
      seal('proof-v2', 'research/sealed-proof-v2.json', newBytes),
    ],
  });
  const good = spawnSync(process.execPath, [toolPath.pathname, '--check', '--manifest', 'research/citation-evidence-seals.json', '--baseline-ref', baseline, '--repo-root', root], {encoding: 'utf8'});
  assert.equal(good.status, 0, good.stderr);
  const goodResult = JSON.parse(good.stdout);
  assert.equal(goodResult.baselineStatus, 'append-only-prefix-preserved');
  assert.equal(goodResult.appendOnlyPrefixPreserved, true);
  assert.equal(goodResult.priorSealCount, 1);
  assert.equal(goodResult.newSealCount, 1);

  const rewrittenBytes = Buffer.from('rewritten but rehashed evidence v1\n');
  writeFileSync(join(root, 'research', 'sealed-proof-v1.json'), rewrittenBytes);
  writeJson(root, 'research/citation-evidence-seals.json', {
    schemaVersion: 1,
    artifactType: 'append-only-citation-evidence-seals',
    seals: [
      seal('proof-v1', 'research/sealed-proof-v1.json', rewrittenBytes),
      seal('proof-v2', 'research/sealed-proof-v2.json', newBytes),
    ],
  });
  const badRewrite = spawnSync(process.execPath, [toolPath.pathname, '--check', '--manifest', 'research/citation-evidence-seals.json', '--baseline-ref', baseline, '--repo-root', root], {encoding: 'utf8'});
  assert.equal(badRewrite.status, 1);
  assert.match(badRewrite.stderr, /Append-only seal violation at index 0/);
});

test('reordering prior entries is rejected even when every current file hash matches', t => {
  const root = tempRepo(t), a = Buffer.from('a\n'), b = Buffer.from('b\n');
  writeFileSync(join(root, 'research', 'a.json'), a);
  writeFileSync(join(root, 'research', 'b.json'), b);
  const oldSeals = [seal('a', 'research/a.json', a), seal('b', 'research/b.json', b)];
  writeJson(root, 'research/citation-evidence-seals.json', {schemaVersion: 1, artifactType: 'append-only-citation-evidence-seals', seals: oldSeals});
  const baseline = commitAll(root, 'capture ordered seals');
  writeJson(root, 'research/citation-evidence-seals.json', {schemaVersion: 1, artifactType: 'append-only-citation-evidence-seals', seals: [...oldSeals].reverse()});
  assert.throws(() => validateCitationEvidenceSeals({repoRoot: root, manifestPath: 'research/citation-evidence-seals.json', baselineRef: baseline}), /unchanged ordered prefix/);
  writeJson(root, 'research/citation-evidence-seals.json', {schemaVersion: 1, artifactType: 'append-only-citation-evidence-seals', seals: [oldSeals[0]]});
  assert.throws(() => validateCitationEvidenceSeals({repoRoot: root, manifestPath: 'research/citation-evidence-seals.json', baselineRef: baseline}), /current manifest has 1 entries; baseline has 2/);
});

test('an absent baseline manifest is reported as initial capture, while a bad Git SHA fails', t => {
  const root = tempRepo(t), bytes = Buffer.from('first evidence\n');
  writeFileSync(join(root, 'research', 'proof.json'), bytes);
  const baseline = commitAll(root, 'tree before initial seal manifest');
  writeJson(root, 'research/citation-evidence-seals.json', {schemaVersion: 1, artifactType: 'append-only-citation-evidence-seals', seals: [seal('first', 'research/proof.json', bytes)]});
  const initial = validateCitationEvidenceSeals({repoRoot: root, manifestPath: 'research/citation-evidence-seals.json', baselineRef: baseline});
  assert.equal(initial.status, 'initial-capture');
  assert.equal(initial.baselineStatus, 'manifest-absent-at-baseline');
  assert.equal(initial.appendOnlyPrefixPreserved, null);
  assert.throws(() => validateCitationEvidenceSeals({repoRoot: root, manifestPath: 'research/citation-evidence-seals.json', baselineRef: '0'.repeat(40)}), /Unable to resolve baseline Git commit/);
});

test('missing, malformed, traversal, duplicate, stale-hash, and malformed-hash seals are rejected', t => {
  const root = tempRepo(t), bytes = Buffer.from('sealed bytes\n');
  writeFileSync(join(root, 'research', 'proof.json'), bytes);
  const manifestPath = 'research/citation-evidence-seals.json';
  const valid = seals => ({schemaVersion: 1, artifactType: 'append-only-citation-evidence-seals', seals});
  const check = () => validateCitationEvidenceSeals({repoRoot: root, manifestPath});

  assert.throws(() => validateCitationEvidenceSeals({repoRoot: root, manifestPath: 'dist/citation-evidence-seals.json'}), /manifest path must be under/);
  assert.throws(() => validateCitationEvidenceSeals({repoRoot: root, manifestPath: '../research/citation-evidence-seals.json'}), /manifest path must not contain/);
  assert.throws(check, /manifest path is missing or unreadable/);
  writeFileSync(join(root, 'research', 'citation-evidence-seals.json'), '{not-json');
  assert.throws(check, /not valid JSON/);

  for (const invalid of [
    {id: 'missing', path: 'research/absent.json', sha256: sha256(bytes), sizeBytes: bytes.length},
    {id: 'traversal', path: 'research/../tests/fixtures/proof.json', sha256: sha256(bytes), sizeBytes: bytes.length},
    {id: 'bad-sha', path: 'research/proof.json', sha256: 'z'.repeat(64), sizeBytes: bytes.length},
  ]) {
    writeJson(root, manifestPath, valid([invalid]));
    assert.throws(check, invalid.id === 'missing' ? /path is missing or unreadable/ : invalid.id === 'traversal' ? /path must not contain/ : /sha256 must be/);
  }

  const correct = seal('duplicate', 'research/proof.json', bytes);
  writeJson(root, manifestPath, valid([correct, {...correct, id: 'duplicate-path'}]));
  assert.throws(check, /duplicate seal path/);

  writeJson(root, manifestPath, valid([{...correct, sizeBytes: correct.sizeBytes + 1}]));
  assert.throws(check, /size mismatch/);
  writeJson(root, manifestPath, valid([{...correct, sha256: 'a'.repeat(64)}]));
  assert.throws(check, /SHA-256 mismatch/);
});
