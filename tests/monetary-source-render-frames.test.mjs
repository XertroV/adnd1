import test from 'node:test';
import assert from 'node:assert/strict';
import {loadMonetarySourceRenderFrames, resolveMonetarySourceRenderFrame} from '../tools/monetary-source-render-frames.mjs';

test('the measured frame registry keeps 21 MediaBox 150 dpi frames and one CropBox 300 dpi frame', () => {
  const registry = loadMonetarySourceRenderFrames();
  assert.equal(registry.frames.length, 22);
  assert.equal(registry.frames.filter(frame => frame.renderDpi === 150).length, 21);
  const frame = registry.frames.find(frame => frame.renderDpi === 300);
  assert.equal(frame.sourceRenderSha256, 'a176aeff2eec447e92ce1a0ea93e34b9b134276e7af3b307528b88869812839b');
  assert.deepEqual(frame.sourceRenderDimensionsPx, [2440, 3194]);
  assert.match(frame.renderMode, /CropBox/);
  assert.equal(resolveMonetarySourceRenderFrame(frame).status, 'matched');
});

test('every identity component is required even when the measured render hash is known', () => {
  const frame = loadMonetarySourceRenderFrames().frames[0];
  for (const key of ['book', 'printedPage', 'pdfPage', 'sourcePdfSha256', 'sourceRenderDimensionsPx']) {
    const changed = {...frame, [key]: undefined};
    const result = resolveMonetarySourceRenderFrame(changed);
    assert.equal(result.status, 'conflicting-render-identity', key);
    assert.ok(result.mismatchedFields.includes(key));
  }
});

test('unknown hashes and arbitrary filenames do not supply a render DPI', () => {
  const frame = loadMonetarySourceRenderFrames().frames[0];
  assert.equal(resolveMonetarySourceRenderFrame({...frame, sourceRender: 'dmg-pdf-137.png'}).frame.renderDpi, 150);
  const result = resolveMonetarySourceRenderFrame({...frame, sourceRenderSha256: '0'.repeat(64), sourceRender: 'invented-pdf-22-300.png'});
  assert.equal(result.status, 'unknown-render');
  assert.equal(result.frame, undefined);
  frame.renderDpi = 17;
  assert.equal(loadMonetarySourceRenderFrames().frames[0].renderDpi, 150, 'caller mutation cannot change the verified registry');
});
