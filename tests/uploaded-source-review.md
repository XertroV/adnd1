# Uploaded source excerpt review

The user supplied the five source PDFs in one ZIP. They were materialized through the supported attachment route, then retained privately. Terra agents rendered the actual scans, located cited passages, extracted focused PNGs and reviewed the crop pixels. OCR was used to find candidates, not as a substitute for inspecting pixels. The [provenance record](uploaded-source-provenance.md) records locally recomputed source hashes, page counts and imprint evidence.

## Coverage

All 892 reference-bearing records and all 1,702 current record/page pairs have checked source excerpts, covering 216 distinct cited printed pages. The distribution contains 1,246 distinct PNG images supporting 1,295 unique regions and 2,134 item-specific region entries. Shared crops are reused with exact item/page binding. These totals include the original selected-value regions; they count passage coverage, not complete mechanics verification.

## What the checked state establishes

New catalogs use `source-excerpt-checked`: the cited passage or contextual section is located and legible in the supplied scan. It does **not** establish complete spell transcription, every card mechanic, or verification of an entire page. Some excerpts are continuation fragments, inherited-spell comparisons, general cantrip guidance, or tables. Their captions state that scope. The earlier twenty equipment catalogs retain their separate selected-value grades and original crop bytes.

Catalogs are scoped by collection and item ID. Rules and equipment sometimes share IDs, so collection identity is essential: an armor rule cannot inherit the equipment price-table crop merely because their IDs match. Build validation checks each crop's PNG signature, dimensions, SHA-256 and printed-to-PDF mapping. The viewer checks catalog ownership, keeps passage and selected-value labels separate, and rejects mismatched catalogs. The progression explainer now opens its own cited passages rather than inheriting the currently selected class.

Private PDFs, raw OCR, page contact sheets and pending proposals are excluded from the distribution. New public files are limited source crops and sanitized metadata. Full PDFs are never hosted by the application. This repository update does not deploy the public site.

## Independently confirmed corrections

- PHB p.37 gives Partisan damage against Large targets as **2–7**, not 1–6. Its PHB p.35 purchase price is **10 gp**; the Ranseur price is **4 gp**. Encumbrance values remain separate from prices.
- UA p.33 gives Endure Cold / Endure Heat limits of **−30°F and 130°F**. The OCR ambiguity note was removed; unrelated spell limits remain unchanged.
- UA p.71 gives Mirage Arcane an area of **1 inch per level radius** and explicitly compares it with the Mirage cantrip on UA p.66 and Vacancy on UA p.69. The two related source links were added.
- Dusty finishes on UA p.47, across its two columns. The unrelated p.48 citation was removed.
- Eyebite’s Charm Person comparison ends on PHB p.65; the unrelated p.66 citation was removed.
- The druid Pyrotechnics passage is on PHB p.58. The unrelated p.57 citation on the magic-user card was removed; its PHB p.71 link remains.

These changes have focused tests and independent source review. Other card content retains its previous grades; attaching an excerpt never automatically promotes it to fully verified.

## Questions and source limits

Two of the five earlier source questions are resolved: the Endure temperature limits and Mirage Arcane's named comparisons. Three remain genuinely uncertain:

1. Speak With Animals refers to a special reaction chart without identifying it in that passage.
2. The illusionist's first-level magic-user spell entry on PHB p.100 lists twenty spells, whereas the general magic-user index on p.41 lists thirty. The broader list cannot be substituted for the restricted list.
3. Emotion names a hopelessness symbol without specifying the cleric or magic-user version; those versions differ.

DMG printed pages 175 and 240 are absent from the supplied PDF. They remain blocked, not fabricated or replaced with another edition. MM2 printed page 83 is at PDF page 92; its displaced-page mapping was visually checked.

## Reproducible checks

Run `node tools/assemble.mjs`, `node tools/source-scan-inventory.mjs`, and `node --test tests/*.test.mjs`. The dynamic `tests/uploaded-scans.browser.mjs` sweep opens every current source catalog, cited page and region at 390 px and 1440 px. It checks image identity and dimensions, captions, highlight geometry, fitted viewport width and uncaught browser errors. Synthetic PDF and source-viewer tests exercise private-PDF fallback and malformed catalog handling. These checks establish the tested rendering and provenance contracts, not full rules accuracy.
