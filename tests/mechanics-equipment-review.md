# Equipment mechanics review

Reviewed all 88 assembled equipment records against the supplied PHB pp.35–39 and Unearthed Arcana pp.26–28 scans. The durable `research/mechanics-audit-progress.json` log and `tests/fixtures/equipment-mechanics-corrections.json` fixture list the checked numeric/price field paths, actual source book and page, exact PDF hash, proposed changes with old/new values, and unresolved prices. Excerpt locations were used as navigation, and the actual page images and weapon-table notes were visually inspected. This is not an assertion that unextracted equipment mechanics have been fully captured.

The scans directly supply 23 previously unextracted matching purchase prices. Their price entries preserve printed package units: a single light bolt, a score of heavy bolts, a score of sling bullets, and sword-and-scabbard prices where stated. UA's atlatl row prices the launcher and does not specify a javelin in that listing. No price row was found in PHB p.35 for bo stick, club, quarterstaff, or sling stone; their prices remain unextracted and absence on that page is not a claim about every possible source.

Corrections: PHB p.36 lists oil at **1 gp per flask**, not 1 sp. PHB p.37 gives the heavy quarrel **2–5** damage against S/M targets, matching UA p.26; the existing 2–3 value and claim of a source disagreement are incorrect. UA p.28 explains the aklys range asterisk: **10 feet only, not 10 yards**. Its printed 2 gp price is on UA p.26. Other extracted numeric fields and the shield coverage and price-quantity qualifiers were compared to their indicated printed rows and notes; reviewed fields are listed per record.

Reviewed 118 imported narrow PHB equipment row crops via contact sheets. The PHB p.37 heavy-bolt region `phb-37-2b48e8334c573a67` shows lance rows and needs replacement. `cropCorrections` in the proposal provides the correct private source crop, SHA-256, dimensions, normalized coordinates, and old catalog/region identifiers. No other wrong item rows were identified in those 118 narrow crops; that check does not cover every crop shape or every catalog region. No application data was changed in this review.

## Applied batch and independent check

The batch owner independently viewed PHB pp.35–37 and UA pp.26/28, confirmed the price quantities and three corrections, and inspected the replacement heavy-bolt crop. The incorrect crop was replaced and removed from public assets. New UA price and aklys-footnote excerpts provide visible evidence for the additional citations. The 23 prices and corrections are applied; four prices remain unset. The original 20 selected-value catalog grades remain limited to their stated fields.

Validation: 137 Node tests pass, including exact sourced correction fixtures, preservation of unaffected semantic baselines, crop hashes, complete citation coverage, and durable-log validation. Browser checks were not run because the managed Sites browser interface is unavailable.
