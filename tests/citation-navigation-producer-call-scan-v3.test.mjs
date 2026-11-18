import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {auditInlineProducerCallExpressions,SOURCE2_APP_PATH,SOURCE2_APP_SHA256} from '../tools/citation-navigation-producer-call-scan-v3.mjs';

const repoRoot=process.env.NATIVE2_SOURCE_REPO_ROOT
  ? resolve(process.env.NATIVE2_SOURCE_REPO_ROOT)
  : resolve(dirname(fileURLToPath(import.meta.url)),'..');
const appBytes=readFileSync(resolve(repoRoot,SOURCE2_APP_PATH));
const app=appBytes.toString('utf8');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');

test('classifies the exact 400f sourceCell to inlineSourceChip call once',()=>{
  assert.equal(sha(appBytes),SOURCE2_APP_SHA256,'must audit the actual pinned Source2 dist/app.js');
  const scan=auditInlineProducerCallExpressions(app);
  const rows=scan.calls.filter(row=>row.function==='sourceCell');
  assert.equal(rows.length,1);
  assert.equal(rows[0].line,94);
  assert.equal(rows[0].firstArgument,'reference');
  assert.equal(rows[0].producerClass,'field-attribute-table-source-cell');
  assert.equal(rows[0].scope,'equipment and reference-bearing attribute-table rows');
  assert.equal(rows[0].sourceContainer,'attributeLayoutHTML.sourceCell(reference)');
});

test('rejects a changed or unclassified sourceCell producer call',()=>{
  const changed=app.replace('inlineSourceChip(reference,`${item.name} · ${label}`)','inlineSourceChip(item,`${item.name} · ${label}`)');
  assert.notEqual(changed,app,'fixture must mutate the exact Source2 call');
  assert.throws(()=>auditInlineProducerCallExpressions(changed),/Unclassified or changed Source2 sourceCell inline chip/);
});
