import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';

// Exercise the production calculation functions without a browser or copied logic.
const app = fs.readFileSync(new URL('../dist/app.js', import.meta.url), 'utf8');
const require=createRequire(import.meta.url);
const citations=require('../dist/citations.js');
const start = app.indexOf('function xpThresholds(x) {');
const end = app.indexOf('function inlineSourceChip(', start);
assert.ok(start >= 0 && end > start, 'Production advancement functions are available');
const context = vm.createContext({});
vm.runInContext(app.slice(start, end), context);
const {xpThresholds, continuationFor, thresholdForLevel} = context;

test('sparse rows retain their actual level labels and do not fill missing levels', () => {
  const guide = {xpRows:[{level:5,xp:18001},{level:6,xp:35001},{level:10,xp:500001}]};
  assert.equal(thresholdForLevel(guide,5).xp,18001);
  assert.equal(thresholdForLevel(guide,7),null);
  assert.equal(thresholdForLevel(guide,2),null);
  assert.equal(xpThresholds(guide)[2].level,10);
});

test('missing and empty XP values cannot become a zero-XP threshold', () => {
  const rows = xpThresholds({xpRows:[{level:1,xp:0},{level:2,xp:null},{level:3,xp:''},{level:4},{level:5,xp:-1}]});
  assert.equal(rows.length,1);
  assert.equal(rows[0].xp,0);
});

test('source xpRows supersede legacy positional arrays even when empty', () => {
  assert.equal(xpThresholds({xpRows:[],xp:[0,1501]}).length,0);
});

test('continuation derives only from an explicit author-supplied anchor', () => {
  const guide = {xpRows:[{level:11,xp:675001}],xpContinuation:{afterLevel:11,anchorLevel:11,anchorXp:675001,increment:225000,book:'PHB',pages:[20]}};
  const next = thresholdForLevel(guide,12);
  assert.equal(next.xp,900001);
  assert.equal(next.derived,true);
  assert.equal(next.book,'PHB');
  assert.equal(next.pages[0],20);
  assert.equal(thresholdForLevel(guide,11).derived,false);
  assert.equal(thresholdForLevel({...guide,xpContinuation:{...guide.xpContinuation,anchorXp:null}},12),null);
});

test('a continuation cannot backfill gaps at or before its stated start', () => {
  const guide = {xpRows:[{level:11,xp:750001}],xpContinuation:{afterLevel:11,anchorLevel:11,anchorXp:750001,increment:250000}};
  assert.equal(thresholdForLevel(guide,10),null);
  assert.equal(thresholdForLevel(guide,12).xp,1000001);
});

test('inconsistent anchors and nonpositive increments remain unavailable', () => {
  assert.equal(continuationFor({xpContinuation:{afterLevel:11,anchorLevel:10,anchorXp:750001,increment:250000}}),null);
  assert.equal(continuationFor({xpContinuation:{afterLevel:11,anchorXp:750001,increment:0}}),null);
});

test('reset XP tracks never borrow a continuation from another scale', () => {
  const guide = {xpContinuation:{afterLevel:11,anchorLevel:11,anchorXp:750001,increment:250000,track:'main'}};
  assert.equal(continuationFor(guide,'hierophant'),null);
  assert.equal(continuationFor(guide,'main').anchorXp,750001);
});

test('a source-backed level limit prevents calculating a higher threshold', () => {
  const guide = {maxLevel:23,xpRows:[{level:23,xp:3000001}],xpContinuation:{afterLevel:23,anchorLevel:23,anchorXp:3000001,increment:500000}};
  assert.equal(thresholdForLevel(guide,23).xp,3000001);
  assert.equal(thresholdForLevel(guide,24),null);
});

const classes = JSON.parse(fs.readFileSync(new URL('../classes.json',import.meta.url),'utf8')).classes;
const renderContext=vm.createContext({
  esc:value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),
  bookCode:value=>String(value||''), pagesFor:value=>Array.isArray(value.pages)?value.pages:[],
  noteButton:()=>'', classTargets:new Map(),data:{classes},FirstEditionCitations:citations
});
vm.runInContext(app.slice(start,app.indexOf('function renderSources()',start)),renderContext);
const fighter=classes.find(c=>c.id==='fighter');
const uaDruid=classes.find(c=>c.id==='ua-druid');

test('Fighter level7 includes HP, ordinary attacks and separately labeled UA options', () => {
  const html=renderContext.advancementSummaryHTML(fighter,7);
  assert.match(html,/Add one d10 hit die/);
  assert.match(html,/3-attacks-per-2-rounds/);
  assert.match(html,/Optional rule · UA weapon specialization/);
  assert.match(html,/Optional rule · UA double specialization/);
  assert.match(html,/Incomplete level-up guide/);
  assert.match(html,/data-ref-pages="25"/);
});

test('Fighter level10 shows fixed HP instead of repeating the early hit-die gain', () => {
  const html=renderContext.advancementSummaryHTML(fighter,10);
  assert.match(html,/Add 3 hit points/);
  assert.doesNotMatch(html,/Add one d10 hit die/);
});

test('Fighter adjacent XP difference and anchored level12 requirement remain accurate', () => {
  const html=renderContext.advancementSummaryHTML(fighter,6);
  assert.match(html,/17,000 XP/);
  assert.equal(renderContext.thresholdForLevel(fighter,12).xp,1000001);
  if(!fighter.xpRows.some(row=>row.level===12))assert.equal(renderContext.thresholdForLevel(fighter,12).derived,true);
});

test('Grand Druid to Hierophant transition displays both scales without subtracting them', () => {
  const html=renderContext.advancementSummaryHTML(uaDruid,16);
  assert.match(html,/Comparison unavailable/);
  assert.match(html,/different XP tracks/);
  assert.match(html,/Hierophant after XP reset/);
  assert.doesNotMatch(html,/-3,000,000 XP/);
});
