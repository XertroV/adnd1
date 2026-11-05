# V7 engineering review

This review describes the local source prepared for publication after v6 (`6ff7830b3bb5ab881c5345efb513f9dcfa0ae413`). Publication identity and version are verified separately through Sites. The approved GitHub branch remains the exact v5 snapshot at `e1b5041961b33c3de81a1c0a37933ae953d9767f`; v7 is not authorized for an additional GitHub push by that snapshot-specific approval.

## Result

- Compact spell and equipment icon/value summaries with keyboard/tap/hover access, collapsed complete attribute tables, editorial weapon/class icons and five distinct polearm drawings.
- Canonical reference union includes primary, field, price, XP, progression and secondary sources. Dagger includes PHB pp.35,37,38 and UA p.28. A reviewed 20-item citation batch supplied six missing structured cross-book references; no inferred citations or visual verification claims were added.
- All 35 unavailable prices are extraction gaps. The 45 recorded prices remain source coin amounts; gp-weight stays separate. No price estimate, damage-dice conversion or unverified damage-type mechanic was introduced.
- Class path labels and a closed terminology explainer distinguish concurrent multiclass, sequential class changes, Bard special sequence, thief-acrobat specialization and druid XP reset. A conservative single-line Bard guidance correction avoids overstating the thief transition boundary.
- Local-only source reader: matching reader-supplied PDFs, exact printed/PDF mapping, zoom, selectable text, explicit missing DMG pages, accessible modal and Forget cleanup. PDF.js 6.5.438 is pinned, licensed and lazy loaded from same-origin files.
- Explicit mobile bookmark links now reveal and focus the selected reference; ordinary and invalid routes do not force focus. Palette selection remains correct across views and reduced motion.

## Validation

Final Node suite: 81 tests passed. Existing browser workflows: 24 general, 21 advancement, 18 spell-toggle and 66 gear/matrix checks passed with no uncaught JavaScript errors. The latter includes narrow palette navigation, source references, notes, price gaps and original/Alt matrix behavior. Nine general and four gear axe scans reported zero violations. Independent compact and integrated-source reviews are recorded in `v7-independent-review.md`, including every spell/equipment attribute, four viewport widths and additional axe scans. The source-reader fixture suite passed 32 checks using original generated test pages, never source-book content.

Inspected desktop weapon and narrow reader screenshots. `git diff --check` and JavaScript syntax checks passed. Public-tree audit: 218 files, no PDFs, raw OCR, Library file identifiers, credential files or private browser notes. The 208 vendored PDF.js files total about 5.8 MB and are fetched only when a local PDF is selected.

## Remaining limitations

The authoritative PHB, UA and DMG still do not materialize as readable local PDFs under the current enforced transfer policy. Fresh Library preparations supplied signed transfer URLs, not workspace paths; those hosts remain outside the allowlist. Native image reads supplied unresolved image pointers. Prior denied transfers were not repeated without a changed supported setup. Source-region extraction, bounding boxes and visual table verification are blocked. A supported direct workspace materialization, readable native page pixels, or authorized transfer-host access is needed to resume that work. No source crops/highlights are claimed; the reader shows full cited pages from the reader's own matching copy.

Coverage remains partial: 638 class-specific spell cards, 148 curated rules, 16 class/variant guides and 80 gear entries; missing XP, spell attributes and matrix cells stay explicit. Character generation remains phase 2; monster stats are not active in this release.
