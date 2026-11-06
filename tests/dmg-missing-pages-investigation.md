# Investigation of DMG pages 175 and 240

The supplied `DMG_1stEd.pdf` has 240 PDF pages including covers; its SHA-256 is `7052949697a009497e5a828d5cf67998df034e30569584110781be46c6de8669`. Its title page says revised edition, December 1979. All PDF indices below are one-based.

## Printed page 175

Printed page 175 is not found in this PDF. At the break, PDF page 174 is visibly printed 173, PDF page 175 is visibly printed 174, and PDF page 176 is visibly printed 176. PDF page 175 contains Appendix C's introduction and a dungeon monster level matrix; its final right-column text ends mid-thought. PDF page 176 begins in the middle of the character-encounter material and continues with magic-item tables. The original PDF therefore does not itself contain the intervening page.

To check for displacement, all 240 page thumbnails were visually reviewed, the extractable text across every PDF page was searched for standalone 175 and 240, and page-footer OCR was inspected. An apparent 175 in PDF page 6 is a contents entry, not a page footer; other 175/240 matches are embedded numerical data. No candidate displaced page bearing printed 175 was found. OCR is imperfect, and thumbnail review cannot independently read every small footer; the consecutive original page images at the gap provide the strongest evidence.

A separately supplied private image, `dmg175.jpg` (Library item `libfile_9be20302c5dc8191a8d6bdf53e3dc0db`, version 0; SHA-256 `e4acdde4a9fed34ae4c60945db53a37e9e7d1b3682f967bc83ccc481e63e5ba7`; 1329 × 1796 pixels), visibly bears printed page 175 and the Appendix C heading. Its opening completes the shadow-example discussion at the bottom of the original PDF’s printed p.174; its character-encounter magic-item sequence is followed by the 13th-level continuation at the top of the original PDF’s printed p.176. These visual and contextual matches identify its content and placement, but do not establish that the separate image comes from the exact same printing as the PDF. The original PDF remains unchanged and still lacks p.175.

The page contains random dungeon-encounter and encountered-character material. The initial structured citation scan found no records citing DMG p.175. A subsequent semantic review identified a bounded addition to the existing `encounter-types` card: the random dungeon character-party size and companion-type procedure. That addition cites the separate private image, retains its unknown printing, and does not implement the full class-limit or magic-item tables. No general equipment mechanics were inferred from the NPC equipment examples. The supplied image is private and is not reproduced in the repository.

## End of the PDF and the claim of page 240

PDF page 238 visibly bears printed page number 238 and contains perforated reference tables. PDF page 239 is an **unnumbered** perforated reference sheet containing equipment encumbrance and hireling tables. PDF page 240 is the illustrated outside back cover, not printed page 240. There is no PDF page 241. No numbered page 240 was located in the thumbnail or text search.

The available scan does **not** establish whether the original physical volume had a numbered printed page 240, a blank or unnumbered reverse, or some other omitted end matter. The previous inference that printed page 240 is definitively missing was too strong. Likewise, the last numbered page observed is 238; assigning the next unnumbered sheet the printed number 239 is an inference, not a visible page number.

## Source needed

The separate page 175 image resolves the page-content gap, while its exact printing remains unestablished without its own imprint and adjacent pages. To resolve the end matter separately, obtain the matching physical copy's final perforated sheet **both sides**, any following interior or blank pages, and inside/outside back cover, preserving their order. Until that comparison, page 240 should be treated as unverified end matter rather than a confirmed missing numbered page.
