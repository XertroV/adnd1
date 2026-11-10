# Prepared viewer-only patch proposal

Status: **not applied**. The viewer input is `dist/source-viewer.js`, SHA-256 `b86628cf03805216e7c3d0927b5fb723088365bdafe19aef8d7f7d764ede2b40`.

The correction is limited to scope-bearing viewer text. It does not change any record, catalog, image, crop, focus rectangle, target binding, extracted value, context grade, route, or selected region. The inventory found exactly three current selected-value regions matching the source-location-only predicate; the other 264 selected-value captions are negative boundaries and retain their present wording.

Introduce one small predicate in the viewer's existing helper scope and reuse it for both captions and privacy text:

```js
const locationOnlySelectedValues = region => region?.verificationScope === 'selected-values'
  && Object.keys(region.checkedFields || {}).length === 1
  && typeof region.checkedFields.sourceLocation === 'string'
  && region.checkedFields.sourceLocation.trim().length > 0;
```

## Caption

Replace the unconditional selected-values prefix in the region-caption assignment with:

```js
el.checked.textContent = `${region.verificationScope === 'source-excerpt' ? 'Source excerpt checked. '
  : region.verificationScope === 'selected-values'
    ? locationOnlySelectedValues(region) ? 'Source location checked. ' : 'Selected values checked. '
    : ''}${region.summary}${focusRects.length ? '' : ' Excerpt shown without a marked passage.'}`;
```

This changes the Hammer, Javelin, and Harpoon prefixes to **“Source location checked.”** Their existing summaries continue to state that printed numeric values and contextual adequacy are unassessed. Other selected-value scopes keep **“Selected values checked.”**

## Privacy text for the active excerpt

Before assigning privacy text, the active matching region can be checked with `locationOnlySelectedValues(regions[regionIndex])`. Add this branch before the generic owner-state copy:

```js
: excerpts && locationOnlySelectedValues(regions[regionIndex])
  ? `${excerptSource.name}: only this excerpt’s source location has been checked. Its printed numeric values and contextual adequacy remain unassessed. Complete source PDFs are not hosted. Your own PDF can be opened privately.`
```

This applies only while the active region has exactly one nonempty `sourceLocation` checked field under `selected-values`. It prevents owner-level state from obscuring the current excerpt’s narrower scope. Other regions keep their current privacy wording.

## Pending DMG p.175 notice

Add a narrowly scoped missing-page predicate:

```js
const suppliedPageMissing = !!ref
  && pageNumber(ref) === null
  && books().privateEvidence(ref.book, ref.page);
```

Keep the existing pending-target lead-in, “has no reviewed excerpt mapping yet.” For `suppliedPageMissing`, replace the current PDF-view sentence with:

> Printed p. 175 is absent from the supplied PDF. Choose an available excerpt only if it supports the field.

Keep the current guidance for ordinary mapped PDF pages. This changes only text: `targetStatus` remains `pending`, the initial reference remains DMG p.175, and the region remains null. In the captured state the image frame stays hidden and the placeholder continues to explain that the supplied PDF has no corresponding page.
