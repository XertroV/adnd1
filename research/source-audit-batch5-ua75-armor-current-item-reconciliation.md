# UA p.75 armor offers to current equipment

This reconciliation covers all 17 typed rows in the UA “Expanded armor & encumbrance” table (printed p.75 / PDF p.76) and the 191-record `equipment.json` target inventory pinned in the JSON. It records candidate identity/amount matches and leaves the current catalog unchanged.

Sixteen rows have numeric GP purchase offers. Each has a current item whose currency and amount match the p.75 row; the current item cites PHB p.35 or UA p.26. No row-specific current binding to the separate UA p.75 occurrence is recorded yet. The row-level location and label pointers below resolve exactly to the 583-row supplement; the existing row-highlight identity review remains pending.

| UA row | Amount | Current item | Existing cited page | Disposition |
|---|---:|---|---|---|
| Banded | 90 gp | `phb-banded-mail` | PHB p.35 | Same amount; p.75 binding absent |
| Bronze Plate Mail | 100 gp | `ua-bronze-plate` | UA p.26 | Same amount; p.75 binding absent |
| Chain Mail | 75 gp | `phb-chain-mail` | PHB p.35 | Same amount; p.75 binding absent |
| Elfin Chain Mail | — | — | — | Printed value unavailable; footnote says never available on open market |
| Field Plate | 2,000 gp | `ua-field-plate` | UA p.26 | Same amount; p.75 binding absent |
| Full Plate | 4,000 gp | `ua-full-plate` | UA p.26 | Same amount; p.75 binding absent |
| Leather | 5 gp | `phb-leather-armor` | PHB p.35 | Same amount; p.75 binding absent |
| Padded | 4 gp | `phb-padded-armor` | PHB p.35 | Same amount; p.75 binding absent |
| Plate Mail | 400 gp | `phb-plate-mail` | PHB p.35 | Same amount; p.75 binding absent |
| Ring Mail | 30 gp | `phb-ring-mail` | PHB p.35 | Same amount; p.75 binding absent |
| Scale Mail | 45 gp | `phb-scale-mail` | PHB p.35 | Same amount; p.75 binding absent |
| Shield, Buckler | 5 gp | `ua-buckler` (candidate) | UA p.26 | Same-name/amount candidate; p.75 binding absent |
| Shield, Large | 15 gp | `phb-large-shield` | PHB p.35 | Same amount; p.75 binding absent |
| Shield, Small | 10 gp | `phb-small-shield` | PHB p.35 | Same amount; p.75 binding absent |
| Shield, Small, Wood | 1 gp | `phb-small-wooden-shield` | PHB p.35 | Same amount; p.75 binding absent |
| Splint Mail | 80 gp | `phb-splint-mail` | PHB p.35 | Same amount; p.75 binding absent |
| Studded Leather | 15 gp | `phb-studded-leather` | PHB p.35 | Same amount; p.75 binding absent |

The current 191-item `equipment.json` contains `ua-buckler` (“Buckler”) at 5 gp, cited to UA p.26 / PDF p.27, and separately contains `ua-spiked-buckler`. The p.75 ordinary buckler is retained as a candidate source-row binding to `ua-buckler`; it is not merged with the spiked buckler, and the earlier p.26 citation is not treated as proof of a p.75 binding.

The JSON records all 17 stable supplement row IDs and exact `/rowRecords/N` pointers, p.75/PDF p.76 source identity and SHA-256, current item IDs/prices/source pages, comparison dispositions, and denominator/input hashes. It does not copy the 583-row geometry into this reconciliation or promote existing row highlights; row-identity detector and independent review remain pending. No equipment item, price, citation or shared catalog was changed.
