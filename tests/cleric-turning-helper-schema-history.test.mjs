import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import vm from 'node:vm';
const root=new URL('../',import.meta.url),read=p=>readFileSync(new URL(p,root)),sha=b=>createHash('sha256').update(b).digest('hex');
const fixtureBytes=read('tests/fixtures/cleric-turning-helper-schema-history.json.gz'),fixture=JSON.parse(gunzipSync(fixtureBytes));
const schemaBytes=read(fixture.schemaFixture.path),schema=JSON.parse(schemaBytes);
const data=JSON.parse(read('dist/data.json')),item=data.rules.find(r=>r.id==='cleric-turning-table');
const facts=[...item.table.rows,...item.table.symbols,...item.table.procedure,...item.table.footnotes,item.table.progressionNote];
function extract(source){const start=source.indexOf('function exactTableFactSourceReference(');assert.ok(start>=0);const end=source.indexOf('function tableFactSourceChip(',start);assert.ok(end>start);return source.slice(start,end);}
function helper(source){const context={};vm.createContext(context);vm.runInContext(read('dist/books.js').toString(),context);vm.runInContext(read('dist/citations.js').toString(),context);vm.runInContext(fixture.sharedProductionHelpers+'\n'+source+'\nthis.resolveFact=exactTableFactSourceReference;',context);return context.resolveFact;}
test('saved pre-fix production helper rejects all32 real facts while current helper resolves them',()=>{
 assert.equal(sha(fixtureBytes),'337ff946827c9a9e3563e7911c4b0443d2083c8587bd80ec17bb927f712043a5');
 assert.equal(fixture.preFixAppSha256,'1867b91b4a208e5360ced7e1914862a3874ceccf110073fdf9e057d19afe5abf');
 assert.equal(sha(fixture.preFixHelper),fixture.helperSha256);assert.equal(sha(fixture.sharedProductionHelpers),fixture.sharedHelpersSha256);
 assert.equal(facts.length,32);const old=helper(fixture.preFixHelper),current=helper(extract(read('dist/app.js').toString()));
 assert.ok(facts.every(fact=>!Object.hasOwn(fact.sourceReference.evidenceBindings[0],'pages')));
 assert.equal(facts.filter(fact=>old(item,fact)===null).length,32);
 assert.equal(facts.filter(fact=>current(item,fact)===fact.sourceReference).length,32);
});
test('the retrospective real-schema capture remains bound to its actual ff4cf9 input',()=>{
 assert.equal(sha(schemaBytes),fixture.schemaFixture.sha256);assert.equal(schema.capturedFrom.dataSha256,fixture.schemaFixture.capturedActualDataSha256);
 assert.equal(schema.capturedFrom.dataSha256,'ff4cf9b944f6584f2b3ea219068c552fd554a586e449ffc6999e93bf01343470');
 assert.equal(schema.preFixHelper.appSha256,fixture.preFixAppSha256);assert.equal(schema.actualBinding.pages,undefined);
});
