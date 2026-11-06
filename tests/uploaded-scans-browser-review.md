# Final imported excerpt browser sweep

The dynamic browser sweep ran against the 892-record imported catalog snapshot after the viewer cache limit was added. At 390px and 1440px, it passed 1,784 item-and-viewport checks and 4,268 region-and-viewport checks with no failures or uncaught browser errors. It exercised each catalog's cited pages, image identity and dimensions, caption, fit-width layout, and highlight geometry. Its local server refuses PDF requests.

The separate browser fixtures also passed catalog/item/collection mismatch fallback, fighter matrix and progression explainer context, five-book and mixed legacy samples, and cache eviction and reuse. The legacy dagger and batch-two viewer suites passed with 71 and 303 checks respectively. These checks establish viewer behavior; they do not independently verify source transcriptions or full pages.
