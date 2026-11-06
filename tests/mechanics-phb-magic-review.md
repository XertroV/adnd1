# PHB magic-user mechanics review

All 194 PHB magic-user cards were compared against visually inspected printed spell passages and relevant inherited cleric and druid descriptions. The JSON lists 2,222 checked paths and 15 unresolved paths across 14 records. Unresolved entries identify printed conflicts, ambiguous interpretation, or special-familiar rules that require a separately referenced source. An empty unresolved list means the extracted paths were reconciled with the inspected sources; it does not assert that every possible rule from the books is present in the card.

The 99 applied changes preserve the exact old values and identify the printed book, page and source SHA-256. They include source tables, readable numeric fields, and removal or revision of stale OCR-gap notices. Each applied value passed independent review against its exact proposed snapshot. Source PDF SHA-256: `e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095`. Printed PHB page N maps to PDF page N+1.

Separate from the printed PHB: the Acaeum transcription of Dragon 35 errata lists correction 73A for Explosive Runes saving throw as “None or ½” ([errata transcription](https://www.acaeum.com/library/errata_phb.html)). This is a separately attributed erratum and was not silently substituted for the source printing.

## Applied review checkpoint

The reviewed proposals were applied after exact-value independent approval and authored-data preimage checks. Accepted old/new values and independent review snapshots are preserved in `fixtures/mechanics-batch-two-corrections.json`; the durable field log records the resulting values. This records application and review scope; merge status is recorded by the pull request.
