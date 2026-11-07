# Pre-fix rendered citation inventory

The complete machine-readable capture is [`citation-browser-inventory-prefx-attach.json.gz`](citation-browser-inventory-prefx-attach.json.gz). Gunzipping it reproduces the original 14,587,716-byte JSON exactly (SHA-256 `6f0a781b47b2bc96105f92f660fb497300edb6ce3c76206699e5f6d05a50e5ab`). The frozen capture was made at HEAD `13783128ca5955ac707ed7ec6994d78d7c9a7cce` from `dist/data.json` SHA-256 `60cc10b9e841f60ca4b4d4a3df6c03f39598aac0e8418d73491f306ff3632b6e`, before the `attachEvidenceBindings` replacement fix.

The browser sweep covered 920 current content records: 918 direct routes plus the fighter matrix and progression explainer rendered through class controls. It captured 2,115 desktop states (including attribute layouts, disclosures, each available class target level, XP outputs and combat details), 3 representative mobile records, 4,991 distinct inline controls and 10,514 control observations. The static producer scanner remained at 9 classes and 14 call sites.

It found 296 stale inline targets across these 18 equipment records. Each target still carried a `scans/dagger/...` catalog binding while the owner selected a `scans/verified/...` catalog, and had no matching binding in the current in-memory inventory. The report records every control identity, target payload projection and raw-target hash, route, visibility state and all 592 diagnostic rows.

| Equipment record | Stale targets |
| --- | ---: |
| `phb-bardiche` | 12 |
| `phb-battle-axe` | 20 |
| `phb-bec-de-corbin` | 12 |
| `phb-bill-guisarme` | 12 |
| `phb-bo-stick` | 16 |
| `phb-club` | 21 |
| `phb-composite-long-bow` | 12 |
| `phb-composite-short-bow` | 12 |
| `phb-dagger` | 21 |
| `phb-hand-axe` | 29 |
| `phb-heavy-crossbow` | 16 |
| `phb-light-crossbow` | 16 |
| `phb-long-bow` | 12 |
| `phb-short-bow` | 12 |
| `ua-aklys-hurled` | 15 |
| `ua-atlatl-javelin` | 21 |
| `ua-blowgun-needle` | 21 |
| `ua-hand-crossbow` | 16 |

The regenerated current report, [`citation-browser-inventory.json`](citation-browser-inventory.json), runs the same sweep after the helper fix and reports zero malformed target or owner/catalog/page/region findings. It retains 181 field-scoped collector targets that were not rendered as inline buttons in the exercised UI states, separately from rendered-but-closed controls.
