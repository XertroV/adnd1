# UA28 legacy dagger catalog application

Applied 26 complete-context recipes across 13 legacy catalogs against frozen commit `679b15d1c580172e54314829c1c3c86dc78b65f3`. The added source asset is copied byte-for-byte from the verified full table and has SHA-256 `f9e1d616b1cec48a76d66507bc7e05e2877b6cf4df520dbdb905a69e9aa17e6b` (1130 × 726). The seven original PNGs and all 13 frozen catalog byte streams remain pinned in the regression fixture.

The 26 recipe tests preserve all stable region IDs and non-geometric metadata while checking the full-table image, exact focus rectangles, dimensions, hash, and `source-excerpt` scope. The 14 unique IDs are 13 per-item rows plus the shared notes region. No equipment values, citations/references, central contracts, or review ledgers were changed.

Changed catalog hashes:

- `dist/scans/dagger/manifest.json`: 679 SHA `4b611a22490f8dcf3c99944872db51f6a7368774b82aa5c0bb909c5c9db21250` → current SHA `3fe5a83142cbaccef6efa330fb1dc99bc6de9892ae71118f4ed2038caf4361ad` (2 recipes)
- `dist/scans/dagger/phb-club.json`: 679 SHA `21d24e752fa2f924bf641f4e8ee0cc2ded02744a2c7ebcd14a1390d861280cb6` → current SHA `33672db8ed518c6ecf0e2d56a9a1cf8eefc49a2be2b176358d3a9ba7a562d8b8` (2 recipes)
- `dist/scans/dagger/phb-composite-long-bow.json`: 679 SHA `1ebe54bfcbcb682d0fef41dce7b030bc19c56e466b0dd613ec53f639a6a32360` → current SHA `5127dcfd57e81d97b96cffcb8e6ba0b684d49f1513f01a740ec740120a4c01bd` (2 recipes)
- `dist/scans/dagger/phb-composite-short-bow.json`: 679 SHA `3dffa3b15f894548a054b89c4f4d2c714f99d4508220e9dfbb0fe1c0a6f40962` → current SHA `583b32763c2deb2a50c27080b84725697f7c9d9f1d0fd5c64e771d1592d82f4a` (2 recipes)
- `dist/scans/dagger/phb-hand-axe.json`: 679 SHA `8e650fc0b02369097cf166d1a597ca1a51b889118d8179ee0583dce9767eb4b9` → current SHA `bf91840fad3e1781b55554ed58e900b2dba5b41e419f7a6718b1e06baebe944b` (2 recipes)
- `dist/scans/dagger/phb-heavy-crossbow.json`: 679 SHA `f2213c6db9516e4d8f121ce5f6689f7bf22e6dd4164a6615b79f794aa4946e7d` → current SHA `b28e9bcc400923bc0a562f9d570c6ae7084618d4393ca55f9f506768bd989357` (2 recipes)
- `dist/scans/dagger/phb-light-crossbow.json`: 679 SHA `e0b87f3f08eacb54be8316b68d250463137a87d9732cd61064f25a5d5cf2dc2d` → current SHA `72b54267aabc4c048e1145984b3a311a87c946752d712e50673eef085d8876ce` (2 recipes)
- `dist/scans/dagger/phb-long-bow.json`: 679 SHA `49edb83b6e653382382ef53f269104812828a6488dd363690f57e171e46ca379` → current SHA `cd93b4a3043afbe8a68d574ce3d45ce466d27c8b9279354d0b0cbf404d3b3cf6` (2 recipes)
- `dist/scans/dagger/phb-short-bow.json`: 679 SHA `2dc410bab5beba66dffc5670a7e03f0d4f2ee3020b37af090ccf9a5893e2094f` → current SHA `3797ef8d5eb259a4396131233d6f847c0cbf4aba12e3e8b9247c67c16b1e2d1d` (2 recipes)
- `dist/scans/dagger/ua-aklys-hurled.json`: 679 SHA `cf8fb4be4dd05d736a4068e5839a996b9f29093c321f9f1b10c357c8be0cf37a` → current SHA `2fb36bd0b96a3af19d473444d930571e31c936a20b928a8e03a7187c2878cb00` (2 recipes)
- `dist/scans/dagger/ua-atlatl-javelin.json`: 679 SHA `035bc68b08c3d6ea1a0c4a91307e018b6517170c78be6c79cacd99fb51cf8383` → current SHA `5f1cc201022df81030f4375b5a17aeaa9bf34e1b09e047be45d8d8432f0e81ac` (2 recipes)
- `dist/scans/dagger/ua-blowgun-needle.json`: 679 SHA `c02be11ab35e680bd1d3c499c0d9a03e547198f77406e15fa8f71a992de91eec` → current SHA `64afeb811a506fe85a632caa2400643ffcb7b2107b75f6aab6bdf0132eed8e4b` (2 recipes)
- `dist/scans/dagger/ua-hand-crossbow.json`: 679 SHA `d898d66284405a2c4a0008b00018d7b0212c9f0afcc2fbde053a505192eafb61` → current SHA `7beeb1a5528b0bcf0a558f0506365d82b240f24c6d9c9a9c81829631cab5da1e` (2 recipes)

Regression assets and code hashes are recorded in the JSON report. Focused tests passed: `node --test tests/dagger-independent.test.mjs tests/scan-catalog.test.mjs` (7/7) and the seven relevant batch-2 subtests (7/7). The full batch-2 file still reports a class-catalog baseline mismatch in shared worktree changes, and the source-scan inventory stops on `ua-staff-sling`; both are outside these legacy dagger edits and have been reported to root. Root’s independent semantic review of all 26 crop focuses and ledger integration remain pending.
