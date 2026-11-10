# Location-scope viewer review

This is a read-only UI review and bounded repair proposal for the selected-values caption on three new source-location targets. No app, source record, catalog, image, route, or Git file was changed.

The checked-out input is commit `987a25d3ba2dcac0940569a2afab73f775e38028`, serving `/workspace/adnd1-next-source-native/dist`. The data hash is `fd73ee5f535124883e73081cd02c67360b331591cee17ae5278639230b375e0d`; `dist/app.js` is `8ae754da261d2b54be9dab3d2f6073ecf8af65516cbf9ba7396453ab99cb8436`; `dist/source-viewer.js` is `b86628cf03805216e7c3d0927b5fb723088365bdafe19aef8d7f7d764ede2b40`. Full input hashes are in `universe-before.json` and `ui-before.json`.

The programmatic inventory separates the active viewer attachment set from the broader attachment history. The runtime set contains 1,014 catalogs and 3,546 region rows. The union of `sourceExcerpts` and `scanVerification` contains 1,034 catalogs and 3,622 rows, including 20 legacy-only dagger catalogs with 76 rows. All referenced catalogs were readable. Across both sets there are 267 `verificationScope: "selected-values"` rows; exactly three have one nonempty `checkedFields.sourceLocation` and no other checked fields. The other 264 selected-value rows are preserved as negative boundaries. The three current records are:

| Owner | Region | Current checked field | Shared image SHA-256 |
|---|---|---|---|
| `phb-hammer` | `ua28-ac-field-phb-hammer-v2` | UA p.28 Hammer row location | `f9e1d616b1cec48a76d66507bc7e05e2877b6cf4df520dbdb905a69e9aa17e6b` |
| `phb-javelin` | `ua28-ac-field-phb-javelin-v2` | UA p.28 Javelin row location | `f9e1d616b1cec48a76d66507bc7e05e2877b6cf4df520dbdb905a69e9aa17e6b` |
| `ua-harpoon` | `ua28-ac-field-ua-harpoon-v2` | UA p.28 Harpoon row location | `f9e1d616b1cec48a76d66507bc7e05e2877b6cf4df520dbdb905a69e9aa17e6b` |

For all three, the rendered caption begins **“Selected values checked.”** Their appended summary says the review confirms target location only and that printed numeric values and contextual adequacy remain unassessed. The field-target header also limits the review to target location and disclaims source-value and contextual-adequacy approval. This makes the caption prefix an actual UI grade overclaim.

The viewer privacy sentence for these records is inherited from the owner-level `source-excerpt-checked` state: “these limited source excerpts have been checked for the cited passage; the entry's extracted values retain their existing status.” It does not promote the entry’s mechanics values, but it does not state that the currently selected excerpt received a location-only review. The proposal adds a narrow conditional for that active region; all other excerpt privacy text remains unchanged.

I also opened the actual pending DMG p.175 target for `encounter-types`. Its target remains `pending`, has `pdfPage: null`, and opens with no selected region (`regionId: null`, `imageFrameHidden: true`). The PDF placeholder says no corresponding page exists in the supplied PDF, while the pending notice says “The cited page is open in your PDF view.” The page-notice wording is therefore misleading for this pending target. The proposed conditional changes only the notice text; it does not assign a region or resolve the target.

The screenshots and private browser logs are under `/workspace/vault-audit-private/pass8/location-scope-ui-review/`. The UI and DOM records are `ui-before.json` and `dmg175-pending-before.json`. The assigned `127.0.0.1:8875` probe produced an empty HTTP reply (curl exit 52), preserved in `assigned-8875-probe.txt`; the screenshots were captured in a separate Playwright context from a byte-for-byte static server over the same `dist` directory. Chromium reported no page errors or failed requests. The only HTTP 404 was the exact `/favicon.ico` request.

## Deliverables

- `universe-before.json`: catalog hashes, denominators, all selected-value rows, positive findings, and the 264 negative boundary rows.
- `ui-before.json`: actual viewer DOM for all three targets, asset hashes, and screenshot hashes/paths.
- `dmg175-pending-before.json`: actual pending-target DOM, null page mapping/region selection, and screenshot hash/path.
- `patch-proposal.md`: bounded viewer-only correction. It is a proposal, not an applied patch.

`integrity-check.json` confirms that all 1,034 attachment catalog hashes, the captured source assets, and the four private screenshots still match the pre-capture records. I did not inspect source pixels for numeric values or context; the screenshots preserve the actual rendered state only.
