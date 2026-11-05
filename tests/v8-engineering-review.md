# V8 dense attributes and current-source synchronization

Prepared from public Sites v7, source commit `6c4d2504dbb733634378d224e56caf7403b34293`. This release corrects the Aid layout density issue and removes redundant property disclosures. It changes presentation and tests, not authored rule values or source verification grades.

## Presentation

All spell/equipment properties are static, fully wrapping icon/label/value facts. There are no per-property plus buttons, clipping, or repeated expanded values. Compact and Table are explicit layout alternatives; switching replaces the representation. Equipment's Field sources disclosure adds the field-to-page mapping and does not repeat the property values. Source-header unions, source-reader actions, notes, filters and standard/Alt progression remain available.

The complete Aid attribute area, including layout controls, measures 176/120/120/100/81 CSS pixels at 320/390/491/1024/1440 viewport widths, compared with v7's 406/390/390/305/138. The Table alternative measures 331/331/314/342/342. The new Compact layout is smaller at every measured width while retaining all seven values. The supplied screenshot was available through Library as OCR/description and an unresolved image pointer; the reviewers reproduced Aid in the application and inspected new application screenshots.

## Validation

- 81 Node tests passed; JavaScript syntax and whitespace checks passed.
- Independent review passed 120 behavior/layout assertions, 1,436 actual-renderer record/mode comparisons, and five axe scans with zero violations. Every authored value in all 638 spell and 80 equipment entries was compared in both exclusive layouts.
- General browser workflows passed 24 checks; gear/matrix workflows passed 66 checks with four zero-violation axe scans. These include search aliases, source-specific references, saved notes and official/Alt attack comparisons.
- Additional UI-author review passed 35 focused checks and a separate 340-check keyboard/touch/source/notes/palette review. Root inspected the new Aid layout at 390 and 1440 pixels.
- The old v7-only property-disclosure browser script was replaced by the current generic `attribute-layout-browser.cjs`; its historical source remains in Git history. Other source-browser tests now use the explicit Table selector.

## Transfer and hosting boundaries

The Library crop ZIP is not present in this executor. Direct preparation last returned no `workspace_path`, only a transfer host excluded by the enforced network policy; no byte transfer was attempted on that denied route. The high-level helper previously failed before transfer with a network error. No crop assets, full PDFs, raw OCR, credentials or private browser notes are included in the source update.

Documented supported paths are direct Library workspace placement when the runtime supplies it, an actually mounted readable attachment, or the Library transfer helper after supported environment configuration permits the transfer. There is no documented force-mount flag or Sites endpoint accepting a Library ZIP as source assets. Sites consumes exact pushed source plus a locally prepared deployment archive. A trusted coordinates/provenance manifest could support future browser-local cropping, but the current source reader does not yet consume region coordinates.

The user separately authorized synchronizing current code to `XertroV/adnd1` through a reviewed branch/PR. That source operation preserves the v5 default-branch history and excludes source scan images. It is not a crop-transfer workaround. Sites publication remains public; no Pages configuration or hosting migration is performed by this release.

GitHub Pages is a plausible future static host: routes and asset paths are relative and the bundle is about 7.4 MB. A future reviewed Pages Actions workflow should publish only `dist`, never the repository root. The actual Pages `.mjs`/`.wasm` response types and local-PDF worker require a host smoke test before cutover. Changing origin requires exporting/importing existing local notes. See GitHub's [publishing-source documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site), [HTTPS guidance](https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https), and [Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits).
