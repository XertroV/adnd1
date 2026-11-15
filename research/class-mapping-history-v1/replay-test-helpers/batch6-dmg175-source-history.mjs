import {historicalMmTestRoot} from '../mm-replay-fs-v1.mjs';
import {pathToFileURL as historicalSourceUrl} from 'node:url';
const historicalOriginalUrl=historicalSourceUrl(historicalMmTestRoot+'/'+"tests/helpers/batch6-dmg175-source-history.mjs").href;
import assert from 'node:assert/strict';
import {readFileSync} from '../mm-replay-fs-v1.mjs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
let captured;
export function decodeDmg175HistoryContract(bytes){
 assert.equal(sha(bytes),'31f3410033b3a2a362cf51e556be55d7d8d6bf7bea66fd47c2b0c5561e6b9d42','exact current175/released853 literal fixture');
 const raw=gunzipSync(bytes);assert.equal(sha(raw),'1b9099b242be3fa70b7de8c347644172fe3c00f89bae74fb51ad7882e0d36376');
 const value=JSON.parse(raw);assert.equal(value.releasedMaster,'853f2fb931c7e18d50caf06f43c73df848ff5ab2');assert.equal(value.sourceValueGradePromotion,false);
 for(const ref of [...value.sourceProofs,value.activatedAfterFirstFullFailure])assert.equal(sha(readFileSync(new URL('../../'+ref.path,historicalOriginalUrl))),ref.sha256,'exact original source approval and actual first failure evidence');
 return value;
}
export function dmg175HistoryContract(){
 if(!captured)captured=decodeDmg175HistoryContract(readFileSync(new URL('../fixtures/dmg175-853-history-projection-contract-v1.json.gz',historicalOriginalUrl)));
 return captured;
}
export function projectDmg175Json(path,value){
 const fixture=dmg175HistoryContract();assert.ok(Object.hasOwn(fixture.files,path),'only the five declared complete inputs may project');
 const pair=fixture.files[path];if(isDeepStrictEqual(value,pair.before))return value;
 assert.ok(isDeepStrictEqual(value,pair.current),'only the exact full current175 object may project to its literal released853 object');
 return structuredClone(pair.before);
}
export function projectDmg175Books(source){
 const fixture=dmg175HistoryContract(),text=Buffer.isBuffer(source)?source.toString('utf8'):source;
 if(text===fixture.books.beforeUtf8)return text;
 assert.equal(sha(text),fixture.books.currentSha256,'only the exact approved supplemental books.js implementation may precede the historical input pin');
 assert.equal(text,fixture.books.currentUtf8);return fixture.books.beforeUtf8;
}
