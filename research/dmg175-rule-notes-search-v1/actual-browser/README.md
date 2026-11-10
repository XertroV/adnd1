# DMG175 note search: actual-browser verification

This read-only run used Chromium and Playwright against an owned loopback static server rooted at the exact current `dist/` directory. No request interception or response overrides were used. App code, source data, excerpts, and review grades were not edited.

The run passed **124/124 checks** across desktop (1440×1000) and mobile (390×844). All five queries were typed into the live palette on both viewport sizes; each opened its intended owner route and the note text was visible on the card. The two identical Magic Item Table notes each appeared once as two distinct owner cards.

| Owner | Typed phrase | Matching cards (desktop / mobile) | Direct citation tested |
|---|---|---:|---|
| `appendix-c-character-subtable` | “inferred ruling” | 1 / 1 | DMG:175 |
| `appendix-c-henchmen` | “implementation for fractional rounding” | 1 / 1 | DMG:175 |
| `appendix-c-party-magic-distribution` | “several quantities at levels 10–13” | 1 / 1 | DMG:175; page selector also routes to DMG:176 |
| `appendix-c-magic-table-ii` | “dice pair mapping” | 2 / 2 | DMG:176 |
| `appendix-c-magic-table-iii` | “alter the printed row numbers” | 2 / 2 | DMG:176 |

The live `hurled weapons` query ranked the PHB p.38 and UA p.28 table cards first; each card’s source control opened its exact printed-page route. Three frozen production replay queries matched their expected totals and ordered first page: `turn undead` (19), `magic missile` (30), `cure light wounds` (4).

Direct source controls, close-to-card navigation, and reload restoration passed. The Party Magic p.175 source dialog’s cited-page selector changed the route to p.176. No horizontal overflow occurred in the palette, cards, or source viewer at either viewport.

The server delivered **26 distinct requested assets**; each asset fetched from the server matched the file under the exact `dist/` root. Pinned runtime hashes: `search.js` 3a82651aa36e36a0a0697b91f6ce5db31350911ce1aa858e59fb91f2b40c66da, `data.json` fd73ee5f535124883e73081cd02c67360b331591cee17ae5278639230b375e0d, `app.js` 8ae754da261d2b54be9dab3d2f6073ecf8af65516cbf9ba7396453ab99cb8436, and `source-viewer.js` 960507018352998d7b1c7f6633ea40a5c9973cff2ffb17c15a0ab7a6413b8f6f. There were no browser errors and no unexpected HTTP errors. Reloads produced ordinary 304 cache revalidations; the static-server log contains only exact `/favicon.ico` 404s (nine across the verification and probes).

Private screenshots and request/browser logs are in `/workspace/vault-audit-private/pass8/root/dmg175-notes-actual-browser-v1/`; the full machine-readable run details are in its private `browser-result.json`.
