# Citation images and verification

## Table context and precise highlights

- Show the complete relevant table, including its heading, column labels, row labels, units, and applicable footnotes. A separately labeled section may be used when it is a complete independent table. Preserve enough context to interpret the value.
- Contextual adequacy is a separate manual assessment from relevance, legibility, crop completeness, highlight geometry and default selection. A readable row alone does not prove adequate context.
- Do not replace a table with a screenshot of only the cited row. Keep table context and highlight the relevant row or cells within it. Do not highlight unrelated rows, the whole table, or a price row when the citation supports another mechanic.
- Include every line of a wrapped row. For example, a shared armor-class row can span multiple printed lines; selecting only one continuation loses its meaning.
- Reconcile typographic qualifiers, superscripts, asterisks and footnotes to the exact source row before approving its focus. Inspect ambiguous typography at adequate resolution; an adjacent row's note must not be inherited. Record the complete bounded marker census, including uncertainty, rather than extrapolating from a few rows.
- Review each proposed row highlight as an overlay on its actual source crop. Confirm the exact printed label, monetary cells, units and applicable markers, and check that unrelated adjacent rows are excluded. A box containing the expected value, a plausible row ordinal, an in-bounds rectangle, or a reviewed table image does not establish correct row selection. PDF text blocks can span several physical rows; do not treat a block's bounds as a row without checking the rendered overlay.
- A whole-spell citation may show the complete spell without a highlight. An individual fact within that spell needs a precise highlight and enough surrounding text to interpret it. Record any whole-image exception explicitly.
- For prose, include the complete relevant passage. Preserve and label separate column/page continuations, including bottom-left to top-right on one page and bottom-right to top-left on the next. Include the continuation in the citation list and make every segment legible. Never imply that a page-bound excerpt contains a whole passage when it continues elsewhere.
- Do not clip glyphs at any edge. Compare the rendered image with the original PDF/image, not just OCR, coordinate values, or a thumbnail. Check the current catalog's image filename and SHA: a stable region ID may refer to a replacement image with a different filename.
- If the supplied source itself loses text at a fold or edge, record a source limitation or defect. Do not reconstruct characters or silently claim the crop is complete.

## Highlight and link behavior

- Use precise image-relative rectangles for the cited evidence. Verify the label and value, their currency/units, and any relevant qualifier together. Disjoint cells or passages can use multiple rectangles.
- Treat every exact `[0, 0, 1, 1]` rectangle as suspected over-highlighting by default. Only a documented, independently reviewed exception may clear that suspicion, for example a complete prose passage that fills its image. A table citation supporting one row or value still needs row/cell focus. An exception for an entire lookup table requires evidence that the entry actually cites the whole table, with that scope explicitly recorded.
- Do not reduce suspected counts with a cosmetic inset or by deleting the rectangle. Crop completeness, contextual adequacy, highlight relevance, and default selection are separate assessments.
- Keep heading-only images explicitly marked as context and after evidence-bearing excerpts. An entry citation must open the complete citation list and select the intended page and region. A link supporting a particular field must select that field's evidence, rather than relying on a potentially unrelated page default.
- Choose primary evidence by the fact's meaning. A numeric weapon field selects its row or cells; a shared range-adjustment field selects the actual adjustment passage. A complete table image with a heading highlighted does not establish a row fact. Declared row/passage roles and precise-focus checks are structural guards, not substitutes for source review.
- An explicit reviewed region selection takes precedence over older region hints. Its ordered region IDs, image evidence, crop coordinates and highlight coordinates must describe exactly the same selected regions. Preserve superseded hints in history rather than merging them into the reviewed selection.
- When replacing a crop, revisit its descriptive metadata, including claims that a note or continuation is unavailable. Preserve the old claim and recipe in the regression/history receipt; do not leave an obsolete availability statement attached to new pixels.
- Preserve stable entry and region IDs for existing permalinks. Test direct loads, copy links, Close, Back/Forward, keyboard focus, and mobile layouts when changing viewer behavior.
- Identify citation owners by collection and entry ID together. A rules entry and equipment entry can share an ID. Scope derived overrides to the intended owner and copy reference objects before attaching generated bindings; evidence for one owner must not leak into another owner's citation controls. Treat explicit price-comparator ownership separately and validate its declared target.

## Evidence and coverage

- Before repairing an instance of a systemic problem, capture a programmatic baseline over the entire exposed database, collections and properties for that problem. Preserve known failures from Git as regression fixtures. Record the exact input commit and hashes, denominator, candidates, confirmed findings, uncertainty and cases that cannot be assessed. Then repair the bounded reviewed cases and rerun the same detector. Do not fix away the examples before proving detection.
- Where semantic context, continuation, qualifier relevance or extraction completeness cannot be proved automatically, inventory the entire unresolved universe and route every case to explicit source review. A heuristic's negative result is not a pass. Keep structural detector outcomes separate from human judgments; do not mask an issue by removing a highlight, changing a status or silently waiving a case.
- Preserve historical full-image exceptions, but do not infer their scope. The viewer must disclose an unresolved full-image sentinel without covering the source. An intentionally unmarked complete spell needs an explicit current, independently reviewed `scope: "whole-spell"` and `kind: "whole-spell-unmarked"`, bound to the source, image, focus and content hashes; an individual fact still needs precise evidence. A mixed full-image sentinel and partial focus remains unresolved.

- Record the original source identity/hash, edition or printing when established, printed page, PDF page, crop bounds, image SHA and dimensions, image-relative highlights, and exact entry/catalog/region binding.
- Review against authorized original source files. OCR and automated edge/geometry checks identify candidates; they do not prove correctness or completeness. A full-image rectangle is a suspected highlight issue, not automatically a confirmed semantic error.
- Record independent review with its exact scope. Bind accepted assessments to source/image/content/focus hashes; default-selection reviews additionally bind the entire ordered page group. Re-review changed evidence instead of copying approvals onto new hashes.
- Preserve historical findings and superseding corrections. If a previous valid review was wrong, identify that error and the replacement evidence explicitly.
- Once an evidence artifact is sealed, keep its exact bytes and add a new file for later adjudication or correction. `research/citation-evidence-seals.json` records preserved artifact hashes and sizes; CI checks them against an append-only prefix from the prior base commit. A corrected current dataset may change while its before fixtures remain sealed.
- Keep `research/source-visual-reviews.json` and the relevant triage logs current. Record confirmed but unapplied defects as `pending-defect` or `confirmed-defect`, with current hashes, bindings, and a reason; keep workflow details separate. Do not label ordinary unreviewed candidates as confirmed defects.
- Generate JSON and Markdown coverage using `node tools/source-visual-coverage.mjs`. CI publishes the `source-visual-coverage` artifact. Include reviewed/unreviewed counts, suspects, exceptions, defects, stale/orphaned evidence, and links to individual citations. State whether counts concern images, bindings, page groups, or extracted fields; these denominators are not interchangeable.
- Source-image coverage and extracted-field percentages are not whole-book verification. Source-first inventories must name their book/page/table scope, count source rows before comparison with site records, preserve package quantities and variants, and distinguish printed values, estimates, unresolved readings, and unavailable evidence.
- Reconcile source rows to items independently of current item citations. Page matches, aliases and image presence alone do not prove the correct table or row. Use reviewed table-image identities and explicit region/row contracts where available; keep unmapped, variant, excluded and uncertain rows traceable. Physical rows, target bindings, fields and monetary cells are different denominators.
- Monetary inventories must distinguish purchase costs, service fees, wages, sale/treasure values, quantities, XP and encumbrance measured in gold pieces. Preserve description pointers and money-bearing footnotes until linked to exact typed source records; a transcribed pointer is not an extracted amount. An unknown package quantity never authorizes a per-item price.
- Keep private PDFs and private full-page uploads out of the public repository and distribution. Publish only the authorized limited excerpts and provenance required by this project.

## Integration checks

See [Deterministic citation checks](citation-checks.md) for the implemented boundary detector, calibrated CI fixtures, false-positive handling, and explicit follow-up plans.

After catalog or citation changes, regenerate the assembled distribution and its audit metadata:

```sh
node tools/assemble.mjs
node tools/mechanics-audit.mjs --from-log
node tools/source-scan-inventory.mjs
node tools/source-visual-coverage.mjs
node --test tests/*.test.mjs
git diff --check
```

Re-run assembly after the final catalog edits and verify that committed static output reproduces in CI. Use exact reversible fixtures for historical checks when adding records; do not erase earlier assertions by broadly replacing baselines. Inspect representative final desktop/mobile renders as well as testing file integrity. Existing excerpts that fail these rules remain tracked audit work; the presence of this document does not certify them.
