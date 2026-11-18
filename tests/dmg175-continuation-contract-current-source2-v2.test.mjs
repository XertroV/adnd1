// Additive Source2 family successor; original case and historical-role assertions are preserved.
// Current Source2 admission remains a separate genuine zero-argument identity case.
// The continuation contract's H regression now reads exact H preimage inputs.
import "../research/class-mapping-history-v1/dmg175-historical-tests/continuation-contract/continuation-contract-h-source2-v2.test.mjs";
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {validateContinuationManifest} from '../tools/continuation-contract.mjs';

test('typed continuation source identities reject invented PDF ordinals and JPEG/PDF substitutions', () => {
  const manifest = JSON.parse(readFileSync(new URL('../research/citation-continuations.json', import.meta.url)));
  const data = JSON.parse(readFileSync(new URL('../dist/data.json', import.meta.url)));
  const party = manifest.groups.find(group => group.id === 'appendix-c-party-magic-distribution-dmg-175-176');
  const canonicalPdf = '7052949697a009497e5a828d5cf67998df034e30569584110781be46c6de8669';
  const mutations = [
    ['invented p.175 PDF ordinal', group => { group.segments[0].pdfPage = 175; }],
    ['JPEG source replaced by PDF hash', group => { group.segments[0].sourceSha256 = canonicalPdf; }],
    ['wrong canonical PDF identity', group => { group.segments[0].canonicalPdfSha256 = '0'.repeat(64); }],
    ['unknown supplemental artifact', group => { group.segments[0].sourceArtifactId = 'unregistered-source'; }],
    ['canonical continuation loses its PDF ordinal', group => { group.segments[1].pdfPage = null; }],
    ['comparison page invents a PDF ordinal', group => { group.sourceComparison.pages[0].pdfPage = 175; }],
  ];
  for (const [label, mutate] of mutations) {
    const changed = structuredClone(party);
    mutate(changed);
    assert.throws(() => validateContinuationManifest({schemaVersion: 1, groups: [changed]}, {
      data,
      catalogRoot: fileURLToPath(new URL('../dist', import.meta.url)),
    }), undefined, label);
  }
});


// Source2 migration admission: the preserved predecessor assertions below exercise the current runtime.
import { test as source2IdentityTest_20261116 } from 'node:test';
import { strict as source2Assert_20261116 } from 'node:assert';
import { assertClassMappingCurrentSourceIdentity as assertSource2Identity_20261116 } from '../tools/class-mapping-current-source-gate-v2.mjs';
source2IdentityTest_20261116('Source2 current source identity is freshly admitted', () => {
  const identity = assertSource2Identity_20261116();
  source2Assert_20261116.equal(identity.summary.stage, 'source2-body-native');
  source2Assert_20261116.equal(identity.summary.sourceCommit, '400f6e9d123d8a654b9b9af48133a2533506e73d');
  source2Assert_20261116.equal(identity.summary.sourceTree, '664c02504efcece25669d2f9c3fdb26437cd5b09');
});
