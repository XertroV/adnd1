import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stampBuild} from '../tools/stamp-build.mjs';

const html = readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
const env = {GITHUB_SHA: 'ABCDEF0123456789abcdef0123456789abcdef01', GITHUB_RUN_NUMBER: '123', GITHUB_RUN_ATTEMPT: '2'};
const time = new Date('2026-11-07T19:00:30.456Z');

test('stamps the current artifact identity and UTC build time', () => {
  const result = stampBuild(html, env, time);
  assert.match(result, /Version 123\.2 · abcdef0/);
  assert.match(result, /<time datetime="2026-11-07T19:00:30\.456Z">Built 2026-11-07 19:00:30 UTC<\/time>/);
  assert.doesNotMatch(result, /Build details unavailable/);
  assert.match(html, /Build details unavailable/); // source/local build stays honest
  assert.notEqual(stampBuild(html, {...env, GITHUB_RUN_ATTEMPT:'3'}, time), result);
});

test('rejects invalid metadata and missing or duplicated placeholders', () => {
  for (const bad of [{...env,GITHUB_SHA:'<script>'}, {...env,GITHUB_RUN_NUMBER:'0'}, {...env,GITHUB_RUN_ATTEMPT:'1"'}]) {
    assert.throws(() => stampBuild(html,bad,time));
  }
  assert.throws(() => stampBuild(html,env,new Date('invalid')));
  assert.throws(() => stampBuild('no placeholder',env,time));
  assert.throws(() => stampBuild(html + '<!-- BUILD DETAILS START -->',env,time));
});

test('restamping replaces exactly one placeholder without changing other content', () => {
  const once = stampBuild(html, env, time);
  const twice = stampBuild(once, {...env, GITHUB_RUN_ATTEMPT:'3'}, time);
  assert.match(twice, /Version 123\.3/);
  assert.doesNotMatch(twice, /Version 123\.2/);
  assert.equal((twice.match(/BUILD DETAILS START/g) || []).length, 1);
  assert.throws(() => stampBuild('<!-- BUILD DETAILS END --><!-- BUILD DETAILS START -->',env,time));
  assert.throws(() => stampBuild(html + '<!-- BUILD DETAILS END -->',env,time));
});
