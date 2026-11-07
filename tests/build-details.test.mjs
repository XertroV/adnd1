import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stampBuild, buildMetadata} from '../tools/stamp-build.mjs';

const html = readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
const sha = 'ABCDEF0123456789abcdef0123456789abcdef01';
const time = new Date('2026-11-07T19:00:30.456Z');
const metadata = buildMetadata(sha,time);

test('stamps reserved version, build commit and UTC build time', () => {
  const result = stampBuild(html, metadata, '123');
  assert.match(result, /Version 123 · abcdef0/);
  assert.match(result, /<time datetime="2026-11-07T19:00:30\.456Z">Built 2026-11-07 19:00:30 UTC<\/time>/);
  assert.doesNotMatch(result, /Build details unavailable/);
  assert.match(html, /Build details unavailable/);
  assert.notEqual(stampBuild(html, metadata, '124'), result);
});
test('rejects invalid metadata, version and placeholders', () => {
  assert.throws(() => buildMetadata('<script>',time));
  assert.throws(() => buildMetadata(sha,new Date('invalid')));
  for (const version of ['0','1"','9007199254740992']) assert.throws(() => stampBuild(html,metadata,version));
  for (const value of [{...metadata,sha:'<script>'},{...metadata,builtAt:'2026-02-30T19:00:30.456Z'}]) assert.throws(() => stampBuild(html,value,'1'));
  assert.throws(() => stampBuild('no placeholder',metadata,'1'));
  assert.throws(() => stampBuild('<!-- BUILD DETAILS END --><!-- BUILD DETAILS START -->',metadata,'1'));
  assert.throws(() => stampBuild(html + '<!-- BUILD DETAILS END -->',metadata,'1'));
});
test('restamping changes version but keeps the original build time', () => {
  const once = stampBuild(html,metadata,'123');
  const twice = stampBuild(once,metadata,'124');
  assert.match(twice,/Version 124/);assert.doesNotMatch(twice,/Version 123/);
  assert.match(twice,/Built 2026-11-07 19:00:30 UTC/);
});
