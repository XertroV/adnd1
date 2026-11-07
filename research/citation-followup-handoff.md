# Citation follow-up handoff

The implementation starts from `13783128ca5955ac707ed7ec6994d78d7c9a7cce` (PR #22), preserving its fixes and review history. The branch is `codex/citation-field-evidence`; it integrates PR #23 at `a36884141cd28fcb86564a60fef20859c71adec9`, retaining the sidebar and deployment-version workflow. PR, CI, merge and normal Pages deployment results are supplied in the final job handoff; local verification alone is not a deployment claim.

Fact citations now preserve semantic field identity, source owner, source page and exact region. Unreviewed targets remain explicit instead of selecting the first excerpt on a page. Copy, reload, Back/Forward, filtered direct routes and search selection preserve coherent URL state. Aklys’s 2 gp purchase price is separate from 35 gp-weight statistics. Arrow’s 2 sp single price and 1 gp/dozen offer remain distinct.

Reviewed equipment evidence uses complete named-table context with row/cell highlights and required qualifiers. Arrow, Long Sword and Aklys preserve stable region IDs; UA28 includes the entire missile table, its asterisk qualifier and shared notes. Charging continues between columns on DMG p.66, not onto p.67. Assassin/shared class context restores scroll/proficiency notes, the complete thief table, and both columns of the two-class worked example. Abjure and Animate Object were rechecked. Whole-spell Fireball/Sleep images have exact independent unmarked-spell exceptions; individual facts do not inherit those exceptions. The spell filters and dismissed-source-notice separator are also corrected.

## Verified scope

| Unit | Current scope |
|---|---:|
| Exposed content records |993|
| Equipment objects / printed prices |189 /185|
| Added price-only objects |73|
| Named equipment source offers |188|
| Canonical prices / additional extracted offer field / unresolved offers |185 /1 /2|
| Bounded source rows, across 8 named inventories |710|
| Original PDF pages in discovery census |776|
| Structured page-specific evidence bindings |4,260|
| Bindings with region targets / pending region targets |283 /3,977|
| Catalog-region usages / unique images |2,742 /1,383|
| Annotated context extents / known ordered segments |35 /28|

The four site price-gap objects also have four editorial estimates; these overlap and must not be added as disjoint populations. Monetary-property occurrences are not distinct prices. Source rows, rate cells, site objects, offers, PDF pages, images and bindings are different denominators.

The machine-readable price/value/geometry inventory is [price-source-inventory.json](price-source-inventory.json). Exact current source-row mappings are [equipment-source-row-bindings.json](equipment-source-row-bindings.json); all 185 validate. [equipment-source-offer-reconciliation.json](equipment-source-offer-reconciliation.json) distinguishes Arrow’s already extracted dozen field from the two unresolved offers. Only price is extracted for the 73 additions; their other mechanics remain incomplete.

## Detection and calibration

[systemic-detector-scope.json](systemic-detector-scope.json) documents each systemic class, its complete exposed-data baseline and limits. [citation-systemic-baseline.json](citation-systemic-baseline.json) preserves the original920-record/46,618-node baseline. Known failing crops, omitted notes/continuations, range parsing, stale prices and link identities were preserved as Git-backed or immutable regression fixtures before fixes. The earlier example-first procedure was insufficient because it removed useful failures; the recovered fixtures now keep those failures testable.

CI always attempts the systemic and source-visual reports and uploads full JSON/Markdown artifacts, including price inventory and disposition queues. Generator/structural failures remain failures. Hash-bound current context/value assertions are separate from historical review snapshots. One historical unmatched-semantic artifact retains two stale input-hash checks after the equipment additions and Garrot correction; it is preserved, not refreshed without review.

Local verification passed 317 Node tests before sidebar integration and 326 after the rebase, both report structural gates, the 185-price actual UI click matrix, the 993-record rendered-control sweep (5,212 controls),146 contextual field-link probes, desktop/mobile source permalinks, copy/reload/history and filtered routes. Independent Sol review verified the snapshot, pointer, stale-value and mixed-sentinel fixes. Source geometry was regenerated from the authorized original PDFs with no input warnings;916 usages remain word-box edge candidates. Candidates are not confirmed clipping defects.

## Remaining work and next task

The current raw sentinel denominator is2,245 bindings: 2,243 warnings remain actionable, including 152 historical exceptions without explicit scope; only 2 pure, exact-hash whole-spell exceptions qualify. All 50 class fact-focus proposals remain pending. The other 107 UA28 occurrences outside the reviewed Aklys batch remain unresolved. Two DMG11 source-edge crop defects require better source pixels; interpretation conflicts and referenced-but-unextracted content are not silently resolved.

The two equipment offers are PHB35 **Sling & Bullets, dozen — 15 sp** and UA26 **Quarrels for same — 100 gp**, whose quantity/equivalence remains unresolved. Neither is equivalent to the existing 10 sp per score of sling bullets or a known single-quarrel price. The next task should surface these on the site’s gaps/limitations page alongside the provenance/status inventory in `gaps-limitations-next-task.json`; this job does not implement that page change.

The full finding list is [source-viewer-dogfood-findings.json](source-viewer-dogfood-findings.json). Earlier unspecified pre-Assassin comments cannot be reconstructed precisely from repository evidence; no forgotten finding is invented. Current full-route checks, source-first price reconciliation and shared-image inventories provide reproducible scope for follow-up.

Whole-book price/extraction completeness, unknown continuations, qualifier relevance and most field-source semantics remain unproved. The complete unresolved property/source-census universe is inventoried; a negative heuristic or structural pass never certifies those semantics. Private PDFs/full-page renders are not published.

Six explicit GPT-6 Luna xHigh worker routes and a GPT-6.1 Sol Ultra final review were used. The runtime does not expose orchestrator/tier introspection or a standard-tier selector; no fast/ultrafast override was requested.
