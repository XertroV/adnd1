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
