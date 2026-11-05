# V8 independent attribute-layout review

Final review completed against the local assembled site at `http://127.0.0.1:8765`. No blocking issue remained in the tested scope. The user's Aid density complaint was reproduced before evaluating the replacement.

## Objective Aid comparison

Used Aid, Cleric level 2, original UA printed p. 34. The fixed v7 baseline is commit `6c4d2504dbb733634378d224e56caf7403b34293`; its static assets were read through a test-only intercepted baseline. The replacement measurements came from the live local interface.

All heights below are CSS pixels, rounded to the nearest pixel. V7 area includes its property grid and collapsed Full attributes control. Both new layouts include their identical Compact/Table controls.

| Viewport width | V7 closed property area | New Compact | New Table |
| --- | ---: | ---: | ---: |
| 320 | 406 | 176 | 331 |
| 390 | 390 | 120 | 331 |
| 491 | 390 | 120 | 314 |
| 1024 | 305 | 100 | 342 |
| 1440 | 138 | 81 | 342 |

The v7 property grid alone was 343/326/326/252/85 px at those widths; its seven-row table alone was 287/287/270/298/298 px. Thus the earlier properties consumed more space than the table at mobile widths, and the complete closed property area was also slightly taller at 1024. The replacement Compact layout is smaller than its Table alternative at every measured width without hiding source values.

Inspected new Compact screenshots at all five widths and the exclusive Table layout at 1024. Aid's seven values remain visible, including the complete duration and Materials text. No per-value plus, redundant expansion or duplicated table remains.

## Regression evidence

`tests/attribute-layout-browser.cjs` completed **120/120 behavior/layout assertions**, **1,436 record/mode fidelity comparisons**, and **five axe scans with zero selected WCAG 2 A/AA or 2.1 A/AA violations**. There were no JavaScript page errors.

- The renderer harness exercised the actual attribute renderer for all 638 spell and 80 equipment records in both modes. Test-only response instrumentation exposes the private function in an isolated browser context; it does not edit the application or authored data. Every authored field/value was compared with the rendered DOM, including Material/Materials, unusual labels, exact damage ranges, purchase prices and price units.
- Each mode exclusively contains its chosen representation. All Compact fields are static, contain no interactive descendants or per-value disclosures, and preserve their original labels. Static text is not assigned artificial 44-pixel hit targets.
- Live tests at 320, 390, 491, 1024 and 1440 verify visible/unclipped values, no document overflow, exclusive mode replacement, pressed state, keyboard Space/Enter, retained button focus, and touch switching where applicable. Actual layout controls are at least 44 pixels high. The longest authored spell field was also checked for clipping and overflow at all five widths.
- Dagger's Compact Field sources disclosure adds field-to-page references without repeating property values. In Compact and Table modes its UA field reference opens only UA p. 28; Escape restores focus. Its footer still opens the complete PHB pp. 35, 37–38 plus UA p. 28 set. Source tools remain accessible alongside the dense values.

The generic regression embeds the fixed baseline measurements, so it does not depend on ignored screenshots or a local baseline file being present. Ignored `test-results/v8-independent-browser.json`, `v8-aid-baseline.json`, and `v8-*.png` contain the run evidence and screenshots.

## Source and transport boundaries

Read actual original UA p. 34/PDF p. 35 through Library. Aid's seven fields and its temporary-HP conditions agree with readable OCR; its material continuation is at the top of the same printed page's right column. The supplied native image and image-enabled Library response still exposed only asset-pointer metadata, not source pixels. Current callable tools supplied no documented native pointer-to-pixels reader. No blocked download was retried and no GitHub image or alternate URL transfer was used.

Application screenshots establish layout behavior, not visual verification of the original source page. The new layout preserves authored data; this review does not newly validate all 638 spells or 80 equipment records against source books. No application/author data, hosting settings, Git commit, GitHub mutation or deployment was changed by this reviewer. Publication and source-pixel access remain root-owned.
