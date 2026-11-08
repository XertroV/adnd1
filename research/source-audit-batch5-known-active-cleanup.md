# Batch 5 known-active equipment cleanup

Four source-reviewed leftovers from the equipment table-context baseline now have bounded catalog updates. The report records source/catalog/image/focus/content hashes and the 1,015-catalog / 2,859-region pre-repair universe. It contains no page OCR or image pixels.

Input defect-list SHA-256: `dfe59e548af80bac3f1a7342483af5f5d26541b632b01e4d6e962102d890fcd4`.
Before-state summary SHA-256: `011a5c85f148384604b80d6862316a90959db0564ece3ca9f4c455a7f3e740bc`; full gzip SHA-256: `df4894758af167e0d18b10fa57ec8ee21b4c26d5e5540a0d066eb548d1664aa5`.

| Record | Disposition | Scope retained |
|---|---|---|
| Battle Axe, PHB 37 | Stable ID now uses the approved full-table crop and the precise Axe, Battle row focus from `battle-axe-phb37-weight`. The prior strip PNG remains hash-pinned. | Source-excerpt only; original sourceLocation checked field retained, no numeric field added. |
| Battle Axe, PHB 38 | Stable ID now uses the approved full Hand Held table crop and the row focus from `battle-axe-phb38-speed`, including its approved qualifier geometry. The prior strip PNG remains hash-pinned. | Source-excerpt only; original sourceLocation checked field retained, no numeric field added. |
| Spear, PHB 38 | Heading-only image is named as context and follows both evidence-bearing rows. | Context-only; no Spear row value assertion. Prior image retained. |
| Aklys (hurled), UA 28 | Replaced the stale “unavailable in the supplied crop” sentence with the source-supported availability statement. | Historical 679 scope remains in the fixture; numeric checked fields, image hashes, and verification grades remain pinned. |

`node --test tests/equipment-known-active-cleanup.test.mjs` passes 4/4 tests, including the historical Aklys 679 object/blob assertion and exact Battle Axe focus equality with the independently approved canonical rows. `git diff --check` also passed for the bounded owned files.

The Spear heading image keeps its prior full-image focus sentinel; this bounded caption/order correction does not resolve that separate highlight review. Other source-review queues remain open.

Full numeric receipt: [source-audit-batch5-known-active-cleanup.json](source-audit-batch5-known-active-cleanup.json).
