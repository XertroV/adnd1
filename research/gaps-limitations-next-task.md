# Gaps and limitations handoff

This hash-bound working inventory separates missing cited source pages, unresolved field readings, distinct equipment offers, incomplete monetary discovery, and review queues. It is not a whole-book completeness report.

The JSON companion, [gaps-limitations-next-task.json](gaps-limitations-next-task.json), contains source hashes, exact item pointers, page/claim inventories, review states, and scope limits. It is keyed to `dist/data.json` parsed-data SHA `b617db17b85a468b36ceda4e570bc5c8b4d85557c2b67f42e567ba1780e4bae6` (993 records). Refresh counts from final regenerated reports before publication.

The page scan identifies one missing cited page: DMG printed p.175 at `rules:encounter-types` `/references/0`. The supplied canonical PDF lacks it; a private supplemental image exists, but its printing is unknown and it is not published. DMG pp.239–240 are separate: unverified, uncited end matter, not confirmed missing pages.

The mechanics audit explicitly flags 11 `not-extracted` fields and 22 `source-conflict` fields. These are open source-review statuses, not proof that every current value is wrong. Another 78 exact review-note candidates preserve record cautions and may overlap those field statuses; they are not counted as gaps. Ordinary unchecked fields are excluded.

The PHB p.35 “Sling & Bullets, dozen” (15 sp) and UA p.26 “Quarrels for same” (100 gp) remain distinct unrepresented offers. The existing sling-bullet price is 10 sp per score; Arrow at 1 gp/dozen is already extracted separately. The Quarrels quantity/equivalence is unknown, so no per-bolt price is inferred. Four `/price` fields remain unextracted, with editorial estimates separate. The two unresolved offer amounts are recorded transcriptions: the PHB row has a stale prior review against the current inventory; the UA row remains source-review-pending with provisional bounds. Preserve these per-row grades when surfacing them, rather than presenting them as newly verified prices.

The monetary discovery inventories cover 776 PDF pages across PHB/DMG, UA, and MM/MMII, with 180 discovery claims. PHB/DMG names 18 table groups and UA names 15; both report zero new groups transcribed row by row. The MM/MMII inventory reports claims and unresolved candidates but does not define a table-group denominator. These bounded inventories do not mean all book prices have been found.

The 50 class precision proposals, two DMG p.11 source-edge crop defects, 3,977 bindings without a region target, and 152 historical scopes needing review are evidence/review queues, not missing source facts. Exact hash-bound definitions are in the companion JSON and linked reports.

Validation: JSON parses, and its data hash matches the assembled distribution plus both systemic and source-visual reports. No product data, citation catalogs, or site files were changed.
