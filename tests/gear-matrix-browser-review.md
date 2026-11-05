# Independent Gear and matrix browser review

Reviewed the current interface in Chromium 154 through Playwright on 2026-11-04. The first pass used the local server on port 8765 with the `data.json` request intercepted to merge the authored equipment and matrix JSON into the existing corpus. This pass checks the new UI against the authored data; it does not confirm the deployment package or hosted release.

The expanded fixture pass completed 33 checks with no JavaScript page errors:

- All 80 equipment entries loaded; price-state filters returned 45 transcribed and 35 unavailable prices.
- `light crossbow`, `lightcrossbow`, `lightxbow`, `light x-bow`, and `crossbow light` found Light Crossbow. `xbow` returned all three crossbow types.
- The Light Crossbow card preserved the unknown purchase price, UA p. 28 rate/range citation, and PHB p. 39 range-scale citation. The UA p. 28 source dialog mapped to supplied PDF p. 29.
- Filtering cited sources to UA retained the PHB crossbow whose statistics are cited to UA.
- Gear annotations saved, returned focus to the annotation control, survived reload, and linked from the notebook back to the equipment card. The command palette found `lightxbow` and Enter opened the equipment route.
- Gear had no document overflow at 390 or 320 pixels. The expanded matrix remained within the 320-pixel viewport with its own internal horizontal scroll.
- Fighter level 3 to 4 showed the unchanged original AC0 target 18 to 18. Alt and matrix disclosures began closed. The original table contained 210 cells, exactly 70 numeric values and 140 explicit extraction gaps.
- The natural-20 amendment was presented as a separate optional amendment. The fighter Alt control did not appear for the paladin.
- With the latest 1,039-group class file also merged into the fixture, cleric level 29 displayed the sourced slot change and identified the selector bound as a display range rather than a level cap. Inherited thief-acrobat groups exposed secondary UA p. 25 source chips. The monk printing conflict was visible, and the removed barbarian assistant-rounding claim did not appear.

The fixture test script is `/tmp/adnd-review-gear-ui.cjs`; passing `--live` disables request interception for a later assembled-data check. No app files were changed by the reviewer. Source tables remain OCR checked with visual verification pending.
