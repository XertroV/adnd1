# UA p.26 source context and row reconciliation proposal

Status: proposal only; no equipment, catalog, overrides, central table contracts, or shared ledger were changed. The source evidence is scoped to original 1985 *Unearthed Arcana*, printed p.26 (PDF p.27), with the facing-page notes on printed p.27 (PDF p.28). Original PDF SHA-256: `e06818cbcce7e4605837ad767e9930c126f43b08d3ce358e14746c7b73eed4f4`. The full PDF and full-page renders remain private.

## Census and evidence

The frozen baseline is commit `679b15d1c580172e54314829c1c3c86dc78b65f3` with a complete denominator of **79 physical source rows**: 68 Weight and Damage rows and 11 logical Armor Class lines. The separate 23-row price inventory and 14-row proficiency table are outside this proposal. The baseline contains **48 p.26 equipment fields**: 45 Weight and Damage cells and 3 unshielded Armor Class alternatives. All 48 values joined to one source cell in the frozen source-row manifest after dash/space and gp-weight normalization; this is a value comparison, not an automatic field approval. The three Aklys values match the unqualified source row but remain scope-uncertain for the hurled-only catalog entry.

The source-first mapping has 65 Weight and Damage rows with at least one confirmed item target, one uncertain-only row (unqualified Aklys versus the hurled-only item), and two rows with no equipment target (Jo Stick and hand quarrel). There are two uncertain target edges overall because the combined Blowgun and needle row also has a separate, uncertain generic Blowgun candidate. The 11 Armor Class lines include one conceptual “None” baseline, nine with at least one confirmed named alternative/component, and the “Shield only” line whose shield type is unspecified. Shield candidates on shielded configurations and elfin-chain variants remain uncertain where named; a candidate attached to an unshielded row without a shield label is explicitly excluded below.

I checked all 68 proposed row-focus overlays against the original p.26 page render; every box contains the complete row label, weight and both damage cells. I checked all 11 Armor Class overlays against the original page; wrapped alternatives remain grouped with their own rating. Geometry outcomes: **68/68** weapon rows complete, **11/11** Armor Class rows complete, **0** geometry rows uncertain or unassessable. The focus pixel rectangles and transformed page coordinates are recorded for every row in the JSON.

The original image asset `dist/scans/verified/ua-26-9e9c6750d95af018.png` (SHA-256 `9e9c6750d95af0181d01d52138e1f773f951b46fae6d75a719b7f0caa1cb3162`) is a genuinely complete Weight and Damage table with all 68 rows, headings, unit and facing-page cue. The complete Armor Class crop `dist/scans/verified/ua-26-22786bf0ad0d5086.png` (SHA-256 `22786bf0ad0d5086f4d07f266ab722a6029878839690b84bc0367406d2996325`) includes its heading, all columns, 11 logical lines and wrapped continuations. The proposal adds one limited excerpt, `dist/scans/verified/ua-27-facingside-notes-19783dde2e5c0bb3.png` (SHA-256 `19783dde2e5c0bb3c31c0e5b0417af2444cc8ecc22d3a411bf7df99e8c8f5db4`), containing the full p.27 note block and general note because p.26 explicitly directs the reader to facing-page notes. That excerpt is not yet bound into any citation catalog.

## Existing regions and fields

The frozen 31-catalog inventory has 81 UA p.26 region occurrences, 42 region IDs and 26 images. Sixteen row-strip assets visibly contain their intended row label(s), covering 17 physical weapon rows. Twelve of those assets have a one-row current focus; four current focuses include neighboring text (including the shared staff-sling bullet/stone crop). All require full-table context. The exact candidate region, image/hash and catalog path are recorded per row; the same region ID is not treated as proof because four baseline IDs are reused across catalog files with different images or hashes. Header-only and price-only crops are explicitly classified and excluded as row evidence.

The full table already has a focused Aklys binding in its catalog. In total, 18 weight/damage physical rows have existing label identity evidence (17 from row strips and Aklys from the full table); 13 currently have a precise one-row focus (12 strip rows plus Aklys). The proposal preserves 17 existing region IDs: 15 one-row strip IDs plus the Aklys ID and the shared staff-sling strip ID assigned to the bullet row. The stone row receives its own new ID and precise focus. Across both tables, 17 existing IDs are preservable and 62 rows receive deterministic new IDs. The Armor Class full-table region is context-only; each of its 11 logical rows receives a separate proposed focus.

## Semantic guardrails

- Gold-piece weight is encumbrance, never purchase price.
- Aklys stays scope-uncertain; the Blowgun and needle row remains combined.
- Jo Stick and hand quarrel remain without owners; the separate Bo Stick row does not fill Jo Stick.
- Each lance size keeps its own row and horse qualifier.
- The frozen target list also attached a shield candidate to the unshielded “Leather armor or padded armor” row; this proposal explicitly excludes that row-label mismatch. Other shield-type and elfin-chain relations remain uncertain. A shielded or combined Armor Class configuration never becomes a generic “without shield” value.
- Three ambiguous p.26 row-marker glyphs stay unassigned to facing-page notes. Clear markers point to the complete limited note-block excerpt.

The JSON contains all 79 per-row contracts, each with source label/cells, baseline targets, existing per-catalog candidate regions, per-cell field candidates (including other-book values marked comparison-only), proposed region ID, exact image SHA, local and source-page focus coordinates, and applicable note context. Root can integrate only the subset that passes independent review.
