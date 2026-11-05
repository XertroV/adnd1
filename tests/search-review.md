# Independent search review — 4 November 2026

## Confirmed cause

The corpus already contains Cure Light Wounds as a Cleric level-1 detailed card (PHB printed p.43) and a Druid level-2 detailed card (PHB printed pp.43, 56). The earlier query matcher normalized words and required each query token to appear as a substring of an item's searchable prose. It had no name-acronym or abbreviation mapping, so `CLW` could fail despite valid content. Letter-separated queries could also match unrelated text because each individual letter appeared somewhere in long prose.

## Review criteria

- `CLW`, `C.L.W.`, and `c l w` resolve the same intended spell-name abbreviation.
- Full queries such as `cure light` continue to find both class-specific entries.
- Spell class and detail-availability filters continue to restrict matching entries.
- `MM` and `DM` may have multiple legitimate spell-name expansions. Show these distinctly; do not fabricate a single meaning.
- Abbreviations derive from spell names or explicit supported aliases, not arbitrary initials from paragraphs, class labels, source names, or rule text.
- Exact recognized abbreviation matches outrank incidental body substrings. An exact-initial query must not automatically become a prefix match for longer unrelated initials.
- Command-palette and main spell search must use consistent matching semantics.

## Implementation and browser result

The shared `dist/search.js` core now prepares exact spell-name initials and editorial aliases, collapses dotted and separated-letter queries, bounds short-token body matching, and ranks title/alias matches above incidental prose matches. Main search and the command palette use the same scorer. Acronyms are generated from spell names and explicit aliases rather than arbitrary paragraph initials. Class words in spell queries are treated as class criteria so a cross-reference to cleric rules does not make the Druid card satisfy `clw cleric`.

Independently tested the stable patch in Chromium 154 using a separate local static preview:

| Query or workflow | Observed result |
| --- | --- |
| `CLW`, `C.L.W.`, `c l w`, `cure light` | Identical two Cure Light Wounds entries: Cleric level 1 and Druid level 2 |
| `clw cleric` | Cleric entry only |
| CLW with Cleric / Druid / Magic-user filters | Correct single Cleric / single Druid / empty result |
| `MM` | Legitimate Magic Missile, Magic Mouth, and Magic Mirror class-specific entries |
| `DM` | All eight Detect Magic / Dispel Magic class-specific entries rank first; lower-ranked direct `DM` prose references remain allowed by the owner's design |
| `PFE` | Protection from Evil and explicitly related radius variants |
| `C.M.W.`, `no-such-clw` | Empty states; no fabricated expansion |
| Palette CLW variants | Same two entries for all three acronym forms |
| Palette ArrowDown + Enter on CLW | Opens the Druid Cure Light Wounds card |

No JavaScript errors were observed. Direct `DM` body-word matches are intentionally retained below exact abbreviation matches; source code `DMG` alone no longer satisfies `DM` as a substring. These results support the abbreviation bug fix, not a claim that all possible shorthand or misspellings are understood.

## Mobile class and multiple-level toggle follow-up

Independently reviewed the new toggles in Chromium after the interface author's checks. Desktop class-dropdown changes synchronize with the class buttons. Selecting levels 1 and 3 retains both; removing the final selected level restores All while retaining keyboard focus. A Druid + levels 1/3 combination returns only that class and those levels. At 320 pixels, the visible Illusionist + level-0 + UA buttons return all 74 shared/unique cantrip entries, and the desktop dropdown is hidden as intended. The document remains 320 pixels wide. Opening CLW through the command palette clears the class, source, and level filters and opens the correct Cleric card. No JavaScript errors were observed.

## Supported source-image investigation

The documented native Library page-image route was tested on PHB PDF p.44 using `mode: pages`, `include_images: true`, and `include_text: false`. The operation succeeded but returned only an `image_asset_pointer` with a `sediment://…` identifier inside structured metadata; MCP content contained text and no image bytes. No asset-pointer reader is exposed in the active tool set.

The available Pages reference reader requires a literal reference observed in an accessible Page; no such Page or reference exists for these source page images. It is not a documented sediment-pointer retrieval route and returns extracted PDF text rather than rendered pages. The original PDFs also exceed its 10 MiB document limit.

No blocked transfer was retried and no proxy bypass, policy edit, or alternate network route was attempted. Readable local PDFs and visual verification remain blocked by the environment's HTTP-403 denial of the two Library download hosts.
