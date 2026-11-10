import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadJoCurrentSuccessor} from '../../tools/dmg175-hired-native-successors-v2.mjs';

const repoRoot=process.cwd();
const readJson=path=>JSON.parse(readFileSync(path,'utf8'));
const data=readJson('dist/data.json');
const inventory=readJson('research/price-source-inventory.json');
const positive=loadJoCurrentSuccessor({repoRoot,data:structuredClone(data),inventory:structuredClone(inventory)});
assert.equal(positive.itemId,'ua-jo-stick');
assert.equal(positive.sourceAbsence,false);
assert.equal(positive.valueReviewed,false);
assert.match(positive.priceNote,/No purchase price is proposed/);
assert.equal(positive.payloadProof.joObjectSha256,'25c8c40eab79b1b1dc44fa701e200bbd63b9594596878a82dd8325479451153b');

const mutant=structuredClone(data);
mutant.rules[0].unapprovedReviewCanary=true;
const mutantInventory=structuredClone(inventory);
const previousArrayParent=Object.getPrototypeOf(Array.prototype);
const insertedParent=Object.create(Object.prototype);
let serializerCalls=0;
Object.defineProperty(insertedParent,'toJSON',{value(){serializerCalls++;return this===mutant.rules?structuredClone(data.rules):this;}});
Object.setPrototypeOf(Array.prototype,insertedParent);
let rejection='';
try {
 loadJoCurrentSuccessor({repoRoot,data:mutant,inventory:mutantInventory});
} catch(error) {
 rejection=error.message;
} finally {
 Object.setPrototypeOf(Array.prototype,previousArrayParent);
}
assert.match(rejection,/supplied current data\/inventory require plain JSON before hashing/);
assert.equal(mutant.rules[0].unapprovedReviewCanary,true);
assert.equal(serializerCalls,0);
console.log(JSON.stringify({
 installedApi:'tools/dmg175-hired-native-successors-v2.mjs -> Jo V3',
 positive:{itemId:positive.itemId,sourceAbsence:positive.sourceAbsence,valueReviewed:positive.valueReviewed,priceNote:positive.priceNote,recordSha256:positive.recordSha256,joObjectSha256:positive.payloadProof.joObjectSha256},
 inheritedHookCanary:{mutant:'data.rules[0].unapprovedReviewCanary=true',rejected:true,rejection,serializerCalls,mutantRetained:true},
 status:'PASS'
}));
