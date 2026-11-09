# Source-unit coverage checkpoint

This checkpoint classifies **559 overlapping broad named source units**. It is not a count of every clause, table row, field, or continuation, and no book is certified semantically complete. The report joins the supplied source inventories to exact frozen site/render/search evidence and separately records later source reviews.

| Book | Broad units | Missing | Partial | Present in bounded scope | Citation only | Excluded scope | Unassessable |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Players Handbook | 105 | 7 | 88 | 1 | 0 | 9 | 0 |
| Dungeon Masters Guide | 60 | 10 | 33 | 5 | 0 | 11 | 1 |
| Unearthed Arcana | 36 | 1 | 32 | 0 | 2 | 1 | 0 |
| Monster Manual | 317 | 1 | 86 | 0 | 4 | 226 | 0 |
| Monster Manual II | 41 | 10 | 3 | 0 | 0 | 28 | 0 |
| **Total** | **559** | **29** | **242** | **6** | **6** | **275** | **1** |

The physical source denominator is five supplied PDFs containing **776 PDF pages**, plus the separate private DMG printed p.175 image accepted by the user as the correct edition. Printed folios and physical PDF leaves are different identifiers. The complete PDFs, page renders, supplemental JPEG, and full browser snapshot remain private.

“Present” concerns the bounded evidence described by the referenced review. “Excluded” retains the declared product boundary; full monster profiles are outside the searchable reference catalogue. Operative procedures inside profiles remain separately assessable. Horse capacities, Dragon subdual, Elf encounter composition, Golem construction and Men procedures have explicit child dispositions rather than inheriting a profile exclusion.

The MM table queue has 28 assigned scopes recorded. Separately, 57 broad MM reviews remain pending, and 14 table-closed scopes retain broader content unassessed (13 profile-table scopes plus the Men procedure narrative scope). Other books also retain unknown finer clause/row/qualifier denominators. These are outstanding work, not passes.

Eighteen PHB rows have unassessable public-search captures; their source pages are not thereby unreadable. Actual bounded source-reading limits remain explicit for DMG p.11 and UA p.10. The PHB spell review also preserves the rejected Word of Recall false positive: the supplied source and unchanged card say 250 gp-weight per level.

The frozen V19 repair register is a historical input. [The V20 successor](source-completeness-repairs-version20.json) and [current audit status](current-source-audit-status.json) distinguish verified deployment from unpublished repairs and mapping work.

The [full v2 ledger](source-audit-pass8-original-unit-join-review-v2.json) pins 37 public report inputs and exact report pointers. Its two explicit public input locators preserve a historical census and a formerly absolute proposal path; they do not substitute current data or private source files. The [builder](../tools/source-audit-pass8-original-unit-join-v2.py) reproduces the report without private inputs:

```sh
python3 tools/source-audit-pass8-original-unit-join-v2.py --check
node --test tests/source-audit-pass8-original-unit-join-v2.test.mjs
```

An explicit additional `--verify-private-snapshot --snapshot-path <authorized-local-gzip>` check verifies the saved browser snapshot bytes. CI does not read the private snapshot or PDFs and does not repeat the human source review.

Earlier v1 and unpublished draft artifacts remain preserved; corrections use separate artifacts. The executable negative controls reject duplicate or mismatched joins, missing hashes, stale PHB/MM summaries and erased operative child scope.
