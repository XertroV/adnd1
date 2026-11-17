test('all original report commands and pinned actions remain in the gated workflow',()=>{
 const workflow=readFileSync(resolve(root,'.github/workflows/pages.yml'),'utf8'),baseline=JSON.parse(readFileSync(resolve(root,R5_ROSTER_PATH),'utf8'));
 const beforeCommand="node tools/verify-class-mapping-current-reports-v1.mjs --kind all --output artifacts/source-domain-audits/gaps-handoff-check.json",afterCommand="node tools/verify-class-mapping-current-reports-v2.mjs --kind all --output artifacts/source-domain-audits/gaps-handoff-check.json";
 assert.equal(baseline.preservedNonMonolithicBuildRunBlocks.filter(block=>block.includes(beforeCommand)).length,1,'one preserved report command has a reviewed successor');
 for(const block of baseline.preservedNonMonolithicBuildRunBlocks){const expected=block.includes(beforeCommand)?block.replace(beforeCommand,afterCommand):block;assert(workflow.includes(expected),`lost original report block: ${block.split('\n')[0]}`);}
 assert(!workflow.includes(beforeCommand),'the nondeterministic all-report invocation was replaced');
 for(const job of ['class-mapping-test-shards','historical-mm-replay','test-shard-reducer'])assert.match(workflow,new RegExp(`^  ${job}:\\s*$`,'m'));
 assert(workflow.includes('needs: [class-mapping-test-shards, historical-mm-replay, test-shard-reducer]'));assert(workflow.includes('needs: build'));assert(workflow.includes('fail-fast: false'));
 assert(!/^\s*continue-on-error\s*:/m.test(workflow));assert(!/--test-(?:name|skip)-pattern/.test(workflow));assert(!workflow.includes('node tools/run-class-mapping-tests-v1.mjs'));
 for(const key of ['CM_SHARDS_RESULT','CM_MM_RESULT','CM_REDUCER_RESULT'])assert(workflow.includes(key));
 assert(workflow.indexOf('- name: Require complete current test suite')<workflow.indexOf('- name: Capture build metadata'));
 assert.match(workflow,/actions\/checkout@d23441a48e516b6c34aea4fa41551a30e30af803/);assert.match(workflow,/actions\/setup-node@249970729cb0ef3589644e2896645e5dc5ba9c38/);
});
