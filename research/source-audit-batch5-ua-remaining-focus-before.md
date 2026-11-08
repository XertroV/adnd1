# UA remaining monetary-row focus QA: sanitized before receipt

This metadata-only receipt preserves the exact 341-row before state for groups 002–004 and 006–015. It contains source/crop/overlay hashes and geometry, typed numeric snapshots, source row identities and short marker tokens. It contains no source images, private paths, full OCR, note prose or item-description text. The source images and detailed reviewer workpaper remain private.

Frozen input SHA-256: `8ec8fcb1c937f1e5fdc86af87029a8defd1a4e9ee27c44ef9d0d84eef7e4577a`  
Private before manifest SHA-256: `db24b79f1f8ca2609f1a01d2198db7140e06099622728a6fba89c0f7401c40c7`  
Private full review SHA-256: `1cc60fe6987f94eb9ba00adc6e9771b32eb822da234088f6b2b085855fb9c165`  
Source PDF SHA-256: `e06818cbcce7e4605837ad767e9930c126f43b08d3ce358e14746c7b73eed4f4`  
300 dpi segment overlay manifest SHA-256: `73eb9a220ae2bf9325a4586329f3e6badf20f411ffc7f57faf75395b213ee021`  
600 dpi candidate manifest SHA-256: `8526d10f3261269ab2b952437240b6204f901853f194b90ee9df658b778b87c9`

Before-focus assessment: 306 isolated/complete; 35 confirmed focus failures. The `records` array retains one row per source record, including page/crop identity, source and overlay hashes, source bounds, numeric snapshot, marker tokens and focus status. No before-state values or image bounds are silently normalized.

## Explicit review supersession

The earlier private QA file is preserved byte-for-byte at SHA-256 `62c11966831adf3f25a8b5880b0bea70469673d83bc6f96d44417e57b77155cf`. Its expected marker array for Poison (`ua-other-002-potion-a1-cont-r029`) is superseded: source pixels show two marker glyphs, so the expected token is `['**']`, replacing the current input `['*']`. The correction is a replacement, not an appended marker. Source page image SHA-256 is `81d29b37…f19f`; context-crop SHA-256 is `83d14760…86136`; 600 dpi crop SHA-256 is `2421ecfe…3f111`. Full reconciliation metadata is in `reviewSupersessions` in the JSON receipt.

The numeric marker census remains unit-specific: six other potion records have empty marker arrays; together with Poison’s replacement, seven potion records are affected. Those six records add six semantic array entries, while the printed glyph count rises by nine (eight glyphs on the six empty rows, plus one glyph from Poison’s `*` to `**`). Rings and Staff-Spear remain separate source-marker findings. The 53 full-charge conditions in the rods/staves/wands group are table-header inheritance, not 53 literal row markers.
