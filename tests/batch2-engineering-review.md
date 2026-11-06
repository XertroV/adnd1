# Local source and citation research: batch 2

Prepared on 2026-11-06 in `research/scan-batch-2`, based on v9 source commit `6c646a6ccb35da7b4739ad30ef8eaaeae39f6d02`. This batch is local only under the publication hold. No push, merge, hosting change, or deployment was performed.

## Evidence and data changes

The supported user attachment supplied seven focused PNG excerpts, a manifest, supplied source-PDF fingerprints, page mappings and rendering coordinates. This build recomputed the PNG hashes and checked their pixels. The original full PDF fingerprints are handoff provenance, not independently recomputed source hashes. No new source images or original PDFs were added.

Twenty additional equipment row regions were checked within those existing images:

| Entry | Newly checked rows | Applied scope |
| --- | ---: | --- |
| Battle Axe | 3 | PHB price, weight and speed; PHB damage appears only in the excerpt caption |
| Hand or Throwing Axe | 4 | PHB price, weight and speed; UA p.28 fire rate and numeric range bands |
| Bardiche | 3 | PHB price, weight, damage and speed |
| Bec de Corbin | 3 | PHB price, weight, damage and speed |
| Bill-Guisarme | 3 | PHB price, weight, damage and speed |
| Bo Stick | 2 | PHB weight, damage and speed; price remains unextracted |
| Club | 2 | PHB weight, damage and speed; price remains unextracted |

The five new prices are 5 gp, 1 gp, 7 gp, 6 gp and 6 gp respectively. Local catalogue totals are 80 equipment entries, 51 extracted prices and 29 price extraction gaps. No estimates were introduced. Purchase currency and gp-weight encumbrance remain separate.

Battle Axe and Hand or Throwing Axe retain their displayed UA p.26 damage references as OCR checked with visual review pending. A matching PHB row does not verify that different source page. The Hand Axe's UA range evidence covers only the numeric bands and the supplied rate note; distance conversions are not inferred. Every checked item remains a partial reference.

Together with Dagger, local coverage is eight checked entries, 27 unique regions, 28 item-scoped region entries and seven physical PNG images. One previously checked UA missile note is reused by Hand Axe and Dagger. The assembler deduplicates that region rather than inflating global coverage. Per-item catalogs bind the precise image, focus rectangles, page mapping and selected values to the actual entry.

Twenty UA spell cards gain 22 additional book/page citation pairs. These are OCR-context checks only. No spell mechanics, spell level, class assignment or source-conflict resolution changed. Editorial review added both PHB pp.47 and 73 for the Disjunction context and both pp.69 and 72 for Secure Shelter. Existing same-page UA references are retained without duplicate additions. No spell page has gained a visual-verification claim.

## Reader and interface

The reader accepts checked per-item catalogs, enforces exact item identity and safe same-origin catalog paths, and keeps catalog and image caches separate. Shared image bytes never share row verification. Request/session guards prevent stale item-A success or failure from changing item B, a reopened viewer, or the selected private-PDF mode. Missing or invalid catalogs and images retain the local-PDF fallback and explicit retry.

The global banner and Sources screen use assembled unique counts and state the limits of per-field verification. Unchecked pages remain OCR-only. Compact and Table layouts retain all extracted values and their exact field citations. The old dense-layout regression now selects the named page dropdown specifically; the viewer also has a separate excerpt dropdown, so querying all options incorrectly mixed page names and excerpt names.

## Validation

Completed validation:

- Node suite: 91 passed, zero failed, including seven new independent data/citation tests.
- Independent actual-app browser suite: 153 assertions passed; four axe scans at 320, 390, 491 and 1440 pixels found zero violations and no page errors.
- Dense-layout browser regression: 120 assertions passed, with all 1,436 renderer-fidelity cases passing and five axe scans finding zero violations.
- General browser workflows: 24 passed. Equipment/matrix workflows: 66 passed, with four axe scans finding zero violations.
- Viewer-owner regression runs: 117 batch-specific checks, 71 existing Dagger checks and 32 generated local-PDF fixture checks passed. These are supporting team runs, not additional independent-review executions.
- Root visually inspected the actual Hand Axe card at 390 and 1440 pixels and its highlighted PHB p.35 source at 390 pixels. The highlighted row is the 1 gp Hand Axe row, independent from Dagger's row in the shared PNG.
- `git diff --check` passed; the production checkout remained clean at the v9 base commit.

Independent review covers actual image rows and overlays, all eight catalogs, source-grade separation, unchanged content outside this batch, exact citation additions and browser routing. Renderer fidelity checks compare all 638 spell cards and 80 equipment cards in both Compact and Table modes (1,436 cases). Generated PDF fixtures test reader behavior only, never original-book content. Accessibility scans cover the tested states and viewports; they are not a claim of exhaustive accessibility certification. Ignored local browser JSON reports and screenshots are in `test-results/`.

## Remaining limits

Full original PHB, UA and DMG PDFs are still unavailable in this executor through the supported source-access path. This batch could expand image verification only to rows already present in the seven supplied excerpts. Broader spell images, other equipment tables, classes and full attack matrices still require supported source attachments or materialization. DMG printed pages 175 and 240 remain missing. Existing coverage gaps have not been silently resolved.

Original PDFs, raw OCR, private audit locations and credentials are excluded from the site and repository changes. This batch neither changes public access nor enables GitHub Pages. Browser annotations stay local to the existing origin.
