import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../dist/source-viewer.js',import.meta.url),'utf8');
const start=source.indexOf('  function specificFocusRects('),end=source.indexOf('\n  function matchingRegions(',start);
const ctx=vm.createContext({});vm.runInContext(source.slice(start,end),ctx);
test('whole-image sentinels are not displayed as marked passages',()=>{
 const full=[0,0,1,1],tight=[.12,.32,.7,.04];
 assert.equal(ctx.specificFocusRects([full]).length,0);
 assert.deepEqual(JSON.parse(JSON.stringify(ctx.specificFocusRects([full,tight]))),[tight]);
 assert.deepEqual(JSON.parse(JSON.stringify(ctx.specificFocusRects([tight]))),[tight]);
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
