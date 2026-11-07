import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';

const inventoryPath='research/price-source-inventory-ua26.json';
const garrot=inventory=>inventory.records.find(row=>row.sourceObject==='Garrot');

test('the preserved source-inventory transcription fails the original-scan Garrot currency requirement',()=>{
  const old=JSON.parse(execFileSync('git',['show',`13783128:${inventoryPath}`],{encoding:'utf8'}));
  assert.equal(garrot(old).source.sourceSha256,'e06818cbcce7e4605837ad767e9930c126f43b08d3ce358e14746c7b73eed4f4');
  assert.deepEqual(garrot(old).price.amount,1);
  assert.equal(garrot(old).price.currency,'gp');
  assert.notEqual(garrot(old).price.currency,'ep','The pinned incorrect transcription must remain a failing currency example.');
});

test('Garrot retains the independently rechecked printed 1 ep in both source inventory and extracted item',()=>{
  const current=JSON.parse(readFileSync(inventoryPath));
  const item=JSON.parse(readFileSync('equipment.json')).equipment.find(item=>item.id==='ua-garrot');
  assert.deepEqual([garrot(current).price.amount,garrot(current).price.currency],[1,'ep']);
  assert.ok(item,'Missing source-priced Garrot');
  assert.deepEqual([item.price.amount,item.price.currency,item.price.book,item.price.pages],[1,'ep','UA',[26]]);
});
