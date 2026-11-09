# Citation systemic inventory

Pinned baseline: 13783128ca5955ac707ed7ec6994d78d7c9a7cce. The report inventories all content-record JSON pointers and keeps source-value review, field-target review, geometry, context, continuation, qualifier, and extraction completeness separate.

| Measure | Pinned baseline | Current data |
|---|---:|---:|
| Exposed records | 920 | 1003 |
| JSON nodes (all data) | 46618 | 311273 |
| Scalar/null leaves | 34280 | 231108 |
| Citation-like objects | 4252 | 15831 |
| Page-reference targets | 3182 | 1465 |
| Evidence bindings | 0 | 4681 |
| Selected owner catalogs | 920 | 1003 |
| Selected catalog regions | 2564 | 3398 |
| Money-like candidates | 275 | 773 |
| Context contracts (known only) | 0 | 182 |
| Continuation groups (known only) | 0 | 261 |
| Qualifier cases (known only) | 0 | 1 |

- Baseline node classifications: {"confirmed":0,"candidate":6604,"uncertain":4772,"not-assessable":35242} (inventory classes only; not semantic verification).
- Current node classifications: {"confirmed":0,"candidate":7076,"uncertain":5627,"not-assessable":298570} (inventory classes only; not semantic verification).
- Baseline evidence-binding classes: {"confirmed":0,"candidate":0,"uncertain":0,"not-assessable":0}; current: {"confirmed":1045,"candidate":3636,"uncertain":0,"not-assessable":0}.
- Baseline money-candidate classes: {"confirmed":0,"candidate":259,"uncertain":16,"not-assessable":0}; current: {"confirmed":187,"candidate":195,"uncertain":391,"not-assessable":0}. A reviewed target does not confirm a price; only explicit independent source-value status does.
- Context requirements remain bounded to annotations: current outcomes {"contains-required-context":182}; region-level annotated and unassessable counts are separate from containment passes.
- Declared continuation ordering: {"declared-order-consistent":143,"confirmed-order-defect":0,"missing-segment":0,"duplicate-segment":0,"not-assessable":118} across 261 groups. These checks compare catalog and untargeted same-page viewer relative order; unknown continuations, cross-page viewer sequencing and unrelated-region defaults are not certified.
- Structural join gate: **PASS** (0 confirmed issues; 0 ambiguous joins). Pending semantic review is non-failing.
- Current sentinel policy: 2183 / 2185 raw sentinels still warn; 152 / 154 historical exceptions need scope review; 2 explicit whole-spell exceptions. Field targets: 757 / 4681 reviewed, 3924 pending; whole-spell exceptions do not clear field-focus work.
- Current bounded price inventory: 710 source rows / 8 named inventories; 192 / 192 site objects; 187 target bindings; 187 printed-price value bindings; 776 PDF pages / 3 censuses. Target statuses {"field-target-reviewed":187}; source-value statuses {"source-value-independently-confirmed":187}. 4 estimates overlap 4 price-gap objects; counts are not additive. Units are distinct and the inventory is bounded, not exhaustive. Validation: passed.
- Pinned-baseline price inventory: unavailable; research/price-source-inventory.json is absent from the pinned Git commit.
- Every content-record pointer defaults to not-assessable for source support, context, continuation, qualifier, and extraction completeness unless an exact scoped obligation is listed in `semanticReviewUniverse.scopedOverrides`.
- `/fields/*` and `/price` are a narrow UI-target subset, not the full mechanics-audit fact universe or all scalar/null leaves. Unannotated context/continuation/qualifier/completeness cases are not-assessable, not passed.

Full JSON reports:
- /workspace/adnd1-missile-table-discoverability/research/weapon-source-audit-v1/systemic/citation-systemic-baseline.json
- /workspace/adnd1-missile-table-discoverability/research/weapon-source-audit-v1/systemic/citation-systemic-current.json
- /workspace/adnd1-missile-table-discoverability/research/weapon-source-audit-v1/systemic/validation.json
