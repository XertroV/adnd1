// Pure lineage and simultaneous proof checks for the current R8 source ledger.
// Synthetic callers are protocol tests; production pins both raw ledger files.
import {createHash} from 'node:crypto';

const fail = (ok, message) => { if (!ok) throw new Error(`Sharding lineage: ${message}`); };
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const canonical = value => {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort(compare).map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
};
const same = (a, b) => canonical(a) === canonical(b);
const rowHash = row => sha(Buffer.from(canonical(row), 'utf8'));
const pinEqual = (a, b) => a?.sha256 === b?.sha256 && a?.sizeBytes === b?.sizeBytes;
const rowMap = (rows, label) => {
  fail(Array.isArray(rows), `${label} transition array`);
  const result = new Map();
  for (const row of rows) {
    fail(row && typeof row.id === 'string' && !result.has(row.id), `${label} unique transition identifiers`);
    result.set(row.id, row);
  }
  return result;
};

export function validateR8TransitionLineage({document, parentDocument, readFixture, readEvidence, readCode}) {
  fail(document?.schemaVersion === 1 && document.artifactType === 'finite R8 test-source transitions for immutable R5 roster', 'current R8 ledger schema');
  fail(parentDocument?.schemaVersion === 1 && parentDocument.artifactType === 'finite R7 test-source transitions for immutable R5 roster', 'immutable R7 parent schema');
  fail(parentDocument.accepted === true && parentDocument.status === 'ACCEPTED_BOUNDED_TEST_SOURCE_TRANSITIONS', 'accepted historical R7 parent');
  fail(same(document.baseline, parentDocument.baseline), 'exact immutable parent R5 baseline');
  fail(document.ancestry?.parent && typeof document.ancestry.parent.path === 'string', 'explicit immutable parent');
  fail(document.ancestry?.parent?.path !== document.ledgerPath, 'migration parent cycle rejected');
  const parent = rowMap(parentDocument.transitions, 'parent');
  const current = rowMap(document.transitions, 'current');
  fail(parentDocument.transitionCount === parent.size && document.transitionCount === current.size, 'derived parent/current transition counts');
  fail(document.ancestry.parentTransitionCount === parent.size, 'exact parent transition tally');
  fail(Array.isArray(document.revisions), 'explicit finite revision records');
  fail(Array.isArray(document.ancestry.proofPreimages), 'finite genuine R7 proof preimages');
  const originalPins = new Map();
  for (const row of parent.values()) for (const pin of row.codeProof) {
    fail(!originalPins.has(pin.path) || pinEqual(originalPins.get(pin.path), pin), `consistent immutable parent proof ${pin.path}`);
    originalPins.set(pin.path, pin);
  }
  const proofPreimages = new Map();
  for (const preimage of document.ancestry.proofPreimages) {
    fail(preimage && !proofPreimages.has(preimage.path) && pinEqual(originalPins.get(preimage.path), preimage), `unique exact parent proof preimage ${preimage?.path}`);
    const bytes = readFixture(preimage.fixturePath);
    fail(bytes.length === preimage.sizeBytes && sha(bytes) === preimage.sha256, `genuine R7 proof fixture bytes ${preimage.path}`);
    const currentBytes = readCode(preimage.path);
    fail(currentBytes.length !== preimage.sizeBytes || sha(currentBytes) !== preimage.sha256, `proof preimage belongs to a changed current path ${preimage.path}`);
    proofPreimages.set(preimage.path, bytes);
  }
  validateGlobalCodeProof({transitions:parentDocument.transitions,readCode:path=>proofPreimages.get(path)??readCode(path)});
  const revisions = new Map();
  for (const revision of document.revisions) {
    fail(revision && typeof revision.transitionId === 'string' && !revisions.has(revision.transitionId), 'unique explicit revision');
    fail(current.has(revision.transitionId), 'revision names an effective current row');
    revisions.set(revision.transitionId, revision);
  }
  let inherited = 0;
  for (const [id, old] of parent) {
    validateHistoricalPeer(old, readEvidence);
    const row = current.get(id);
    fail(row && row.path === old.path && same(row.before, old.before), `preserved original R7 row and R5 before identity ${id}`);
    if (same(row, old)) {
      fail(!revisions.has(id), `unchanged row has no fabricated revision ${id}`);
      inherited++;
      continue;
    }
    const revision = revisions.get(id);
    fail(revision, `changed parent row requires explicit revision ${id}`);
    fail(revision.parentTransitionId === id && revision.parentRowSha256 === rowHash(old), `exact original R7 row predecessor ${id}`);
    fail(revision.effectiveRowSha256 === rowHash(row), `exact effective revised row ${id}`);
    fail(pinEqual(revision.previousAfter, old.after), `exact R7 after predecessor ${id}`);
    fail(['code-proof-rebind', 'source-revision'].includes(revision.kind), `known revision kind ${id}`);
    if (revision.kind === 'code-proof-rebind') {
      fail(pinEqual(row.after, old.after), `proof-only rebind preserves test bytes ${id}`);
      const omitProof = item => Object.fromEntries(Object.entries(item).filter(([key]) => !['codeProof', 'acceptedPeer', 'acceptedProofClosureRebind'].includes(key)));
      fail(same(omitProof(row), omitProof(old)), `proof-only rebind preserves source subject and semantic scope ${id}`);
    } else {
      fail(!pinEqual(row.after, old.after), `source revision actually changes source bytes ${id}`);
      validatePredecessorFixture(revision, old.after, readFixture, id);
    }
    validateRevisionReviewer(revision, row, readEvidence);
  }
  for (const [id, row] of current) {
    if (parent.has(id)) continue;
    const revision = revisions.get(id);
    fail(revision?.kind === 'new-original-source-transition' && revision.parentTransitionId === null && revision.parentRowSha256 === null, `new original source row is explicitly admitted ${id}`);
    fail(revision.effectiveRowSha256 === rowHash(row), `exact effective new row ${id}`);
    fail(pinEqual(revision.previousAfter, row.before), `new original row predecessor equals unchanged R5 source ${id}`);
    validatePredecessorFixture(revision, revision.previousAfter, readFixture, id);
    validateRevisionReviewer(revision, row, readEvidence);
  }
  return {parentTransitions: parent.size, effectiveTransitions: current.size, unchangedInheritedTransitions: inherited, revisedTransitions: revisions.size};
}

function validateHistoricalPeer(row, readEvidence) {
  const peer = row.acceptedPeer;
  fail(row.candidateStatus === 'ACCEPTED' && peer && peer.reviewerId !== row.authorId, `independent historical source acceptance ${row.id}`);
  const bytes = readEvidence(peer.receiptPath);
  fail(bytes.length === peer.receiptSizeBytes && sha(bytes) === peer.receiptSha256, `historical peer receipt bytes ${row.id}`);
  const receipt = JSON.parse(bytes.toString('utf8'));
  fail(receipt.schemaVersion === 1 && receipt.status === 'ACCEPTED_BOUNDED_TEST_SOURCE_TRANSITION', `accepted historical peer status ${row.id}`);
  fail(receipt.reviewer?.id === peer.reviewerId && receipt.reviewer.role === 'independent' && receipt.authorId === row.authorId, `historical reviewer identity ${row.id}`);
  fail(same(receipt.subject, {path:row.path,before:row.before,after:row.after}) && same(receipt.proposal,row.proposal) && same(receipt.proofScope,row.proofScope) && same(receipt.codeProof,row.codeProof), `historical peer binds unchanged R7 subject and proof ${row.id}`);
  fail(same(receipt.beforeFixture,{path:row.before.fixturePath,sha256:row.before.fixtureSha256,sizeBytes:row.before.fixtureSizeBytes}), `historical peer binds R5 fixture ${row.id}`);
}

function validatePredecessorFixture(revision, expected, readFixture, id) {
  const fixture = revision.beforeFixture;
  fail(fixture && typeof fixture.path === 'string' && pinEqual(fixture, expected), `genuine R7 predecessor fixture pin ${id}`);
  const bytes = readFixture(fixture.path);
  fail(bytes.length === expected.sizeBytes && sha(bytes) === expected.sha256, `exact R7 predecessor fixture bytes ${id}`);
}

function validateRevisionReviewer(revision, row, readEvidence) {
  fail(typeof revision.authorId === 'string' && revision.authorId.length > 0, `explicit revision author ${row.id}`);
  fail(row.acceptedPeer && row.acceptedPeer.reviewerId !== revision.authorId, `independent revision reviewer ${row.id}`);
  const bytes = readEvidence(row.acceptedPeer.receiptPath);
  fail(bytes.length === row.acceptedPeer.receiptSizeBytes && sha(bytes) === row.acceptedPeer.receiptSha256, `revision peer receipt bytes ${row.id}`);
  const receipt = JSON.parse(bytes.toString('utf8'));
  fail(same(receipt.revision, Object.fromEntries(Object.entries(revision).filter(([key]) => key !== 'effectiveRowSha256'))), `peer binds exact revision lineage ${row.id}`);
}

export function validateGlobalCodeProof({transitions, readCode}) {
  const paths = new Map();
  for (const row of transitions) {
    const local = new Set();
    fail(Array.isArray(row.codeProof) && row.codeProof.length > 0, `nonempty current proof ${row.id}`);
    for (const pin of row.codeProof) {
      fail(!local.has(pin.path), `duplicate proof path in row ${row.id}: ${pin.path}`);
      local.add(pin.path);
      const previous = paths.get(pin.path);
      fail(!previous || pinEqual(previous.pin, pin), `conflicting simultaneous proof pin ${pin.path}`);
      if (previous) previous.consumerIds.push(row.id);
      else paths.set(pin.path, {pin, consumerIds: [row.id]});
    }
  }
  for (const [path, {pin}] of paths) {
    const bytes = readCode(path);
    fail(bytes.length === pin.sizeBytes && sha(bytes) === pin.sha256, `current global proof bytes ${path}`);
  }
  return {transitionCount: transitions.length, distinctPhysicalProofPaths: paths.size, consumers: Object.fromEntries([...paths].map(([path, value]) => [path, value.consumerIds]))};
}
