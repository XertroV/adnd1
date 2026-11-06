'use strict';
// Full PDFs stay in the reader's tab. Only explicitly catalogued, verified excerpts are hosted.
((root) => {
  const scriptBase = new URL('.', document.currentScript?.src || document.baseURI);
  const editions = {
    PHB: 'Players Handbook · sixth printing, January 1980',
    UA: 'Unearthed Arcana · original 1985 edition',
    DMG: 'Dungeon Masters Guide · revised December 1979',
    MM: 'Monster Manual · AD&D first edition scan',
    MM2: 'Monster Manual II · AD&D first edition scan; printed p.83 is displaced',
  };
  const files = new Map();
  let dialog, el = {}, refs = [], current = 0, zoom = 1, renderTask, renderVersion = 0;
  let libraryPromise, returnFocus, resizeTimer;
  let excerptCatalog, excerptSource = null, excerptError = '', excerptLoading = false, catalogRequest = 0;
  let requestedMode = 'pdf', regionIndex = 0, showHighlights = true, actualSize = false, session = 0;
  let imageFit = false, privacyDismissed = false;
  const imageCache = new Map(), catalogCache = new Map(), cacheLimit = 64;
  function cacheGet(cache, key) {
    const value = cache.get(key);
    if (value !== undefined) { cache.delete(key); cache.set(key, value); }
    return value;
  }
  function cachePut(cache, key, value) {
    cache.delete(key); cache.set(key, value);
    if (cache.size > cacheLimit) cache.delete(cache.keys().next().value);
  }
  const imageNames = new Set(['phb35-dagger-price.png','phb37-dagger-weight-damage.png','phb38-dagger-melee.png','phb38-dagger-thrown.png','phb38-missile-notes.png','ua28-dagger-thrown.png','ua28-missile-notes.png']);
  const books = () => root.FirstEditionBooks;
  const title = book => books()?.title(book) || book;
  const pageNumber = ref => books()?.pdfPage(ref.book, ref.page) ?? null;
  function resolveExcerptSource(item, contextItemId) {
    const ids = [item?.id, contextItemId, item?.contextItemId].filter(id => id !== undefined && id !== null);
    const itemId = ids[0];
    if (typeof itemId !== 'string' || !/^[a-z0-9][a-z0-9-]{0,100}$/.test(itemId) || ids.some(id => id !== itemId)) return null;
    const verification = item?.sourceExcerpts || item?.scanVerification;
    const legacy = verification == null && itemId === 'phb-dagger';
    const path = legacy ? 'scans/dagger/manifest.json' : ['selected-values-checked','source-excerpt-checked'].includes(verification?.state) ? verification.catalog : null;
    const legacyPath = itemId === 'phb-dagger' ? path === 'scans/dagger/manifest.json' : path === `scans/dagger/${itemId}.json`;
    const collection = verification?.collection;
    const verifiedPath = collection == null ? path === `scans/verified/${itemId}.json` : ['rules','spells','classes','equipment','matrices','progressionExplainer'].includes(collection) && path === `scans/verified/${collection.toLowerCase()}-${itemId}.json`;
    if (!legacyPath && !verifiedPath) return null;
    const url = new URL(path, scriptBase);
    if (url.origin !== location.origin) return null;
    return { itemId, name: item?.name || item?.title || 'this entry', url: url.href, legacy, legacyPath, collection, state: verification?.state, regionCount: verification?.regionCount };
  }
  function normalize(references) {
    const result = [], seen = new Set();
    for (const ref of references || []) {
      const book = books()?.code(ref.book) || ref.book;
      if (!Object.hasOwn(editions, book)) continue;
      for (const page of ref.pages || []) {
        const n = Number(page), key = `${book}:${n}`;
        if (!Number.isInteger(n) || n < 1 || seen.has(key)) continue;
        seen.add(key);
        const contextual = (ref.contexts || []).filter(context => Number(context.page) === n).map(context => context.label);
        result.push({ book, page: n, labels: (contextual.length ? contextual : Array.isArray(ref.labels) ? ref.labels : []).map(String) });
      }
    }
    return result;
  }
  function node(tag, attrs = {}, text = '') {
    const n = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) n.setAttribute(key, value);
    if (text) n.textContent = text;
    return n;
  }
  function button(label, action, attrs = {}) {
    const n = node('button', { type: 'button', ...attrs }, label);
    n.addEventListener('click', action);
    return n;
  }
  function setup() {
    if (dialog) return;
    dialog = node('dialog', { class: 'source-viewer', 'aria-labelledby': 'source-viewer-title', 'aria-describedby': 'source-viewer-privacy' });
    const shell = node('div', { class: 'source-viewer-shell' });
    const header = node('header', { class: 'source-viewer-header' });
    const heading = node('div', { class: 'source-viewer-heading' });
    el.title = node('h2', { id: 'source-viewer-title' });
    el.title.append(document.createTextNode('Original Sources: '));
    el.item = node('span', { class: 'source-viewer-item' });
    el.title.append(el.item);
    heading.append(el.title);
    el.close = button('Close', () => dialog.close(), { class: 'source-viewer-close', 'aria-label': 'Close original sources' });
    el.headerActions = node('div', { class: 'source-viewer-header-actions' });
    header.append(heading, el.headerActions);
    el.privacyNotice = node('div', { class: 'source-viewer-privacy' });
    el.privacy = node('p', { id: 'source-viewer-privacy' });
    el.dismissPrivacy = button('×', () => {
      privacyDismissed = true; el.privacyNotice.hidden = true; dialog.removeAttribute('aria-describedby');
      const target = !el.modes.hidden && !el.excerptMode.disabled ? el.excerptMode : el.close;
      target.focus({ preventScroll: true });
    }, { class: 'source-viewer-privacy-dismiss', 'aria-label': 'Dismiss source notice' });
    el.privacyNotice.append(el.privacy, el.dismissPrivacy);
    const layout = node('div', { class: 'source-viewer-layout' });
    const aside = node('aside', { class: 'source-viewer-sources', 'aria-label': 'Cited source pages' });
    aside.append(node('h3', {}, 'Cited pages'));
    el.referenceList = node('div', { class: 'source-viewer-reference-list' });
    aside.append(el.referenceList);
    const main = node('div', { class: 'source-viewer-main' });
    const sourceHead = node('div', { class: 'source-viewer-source-head' });
    el.edition = node('h3');
    el.mapping = node('p', { class: 'source-viewer-mapping' });
    el.labels = node('p', { class: 'source-viewer-labels' });
    sourceHead.append(el.edition, el.mapping, el.labels);
    el.modes = node('div', { class: 'source-viewer-modes', role: 'group', 'aria-label': 'Source viewing mode' });
    el.excerptMode = button('View excerpts', () => setMode('excerpts'), { 'aria-pressed': 'false' });
    el.pdfMode = button('Your PDF', () => setMode('pdf'), { 'aria-pressed': 'true' });
    el.modes.append(el.excerptMode, el.pdfMode);
    el.headerActions.append(el.modes, el.close);
    el.excerptNotice = node('div', { class: 'source-viewer-excerpt-notice', role: 'status' });
    el.excerptNoticeText = node('p');
    el.retry = button('Retry verified excerpts', () => loadExcerpts(true));
    el.excerptNotice.append(el.excerptNoticeText, el.retry);
    el.fileRow = node('div', { class: 'source-viewer-file-row' });
    const fileLabel = node('label', { class: 'source-viewer-file-label', for: 'source-viewer-file' });
    el.fileAction = node('span', {}, 'Open your copy');
    el.file = node('input', { type: 'file', accept: '.pdf,application/pdf', id: 'source-viewer-file', 'aria-describedby': 'source-viewer-edition-help' });
    el.file.addEventListener('change', () => {
      const file = el.file.files?.[0], ref = refs[current];
      el.file.value = '';
      if (file && ref) loadFile(ref.book, file);
    });
    fileLabel.append(el.fileAction, el.file);
    el.fileName = node('span', { class: 'source-viewer-file-name' });
    el.forget = button('Forget PDF', forget, { class: 'source-viewer-secondary' });
    el.fileRow.append(fileLabel, el.fileName, el.forget);
    el.editionHelp = node('p', { id: 'source-viewer-edition-help', class: 'source-viewer-help' }, 'Choose the edition and page order shown above. A filename or page count cannot confirm that it is the correct book.');
    const controls = node('div', { class: 'source-viewer-controls' });
    el.previous = button('← Previous', () => navigate(-1), { 'aria-label': 'Previous cited page' });
    el.select = node('select', { 'aria-label': 'Select cited page' });
    el.select.addEventListener('change', () => { current = Number(el.select.value); resetZoom(); regionIndex = 0; update(); });
    el.next = button('Next →', () => navigate(1), { 'aria-label': 'Next cited page' });
    const zoomControls = node('div', { class: 'source-viewer-zoom', role: 'group', 'aria-label': 'Page zoom' });
    el.zoomOut = button('−', () => changeZoom(-.25), { 'aria-label': 'Zoom out' });
    el.zoomLabel = node('span', { class: 'source-viewer-zoom-label', 'aria-live': 'polite' }, '100%');
    el.zoomIn = button('+', () => changeZoom(.25), { 'aria-label': 'Zoom in' });
    el.fit = button('Fit page', () => { resetZoom(); imageFit = true; renderPage(); });
    el.actual = button('Actual size', () => { actualSize = true; imageFit = false; zoom = 1; renderPage(); });
    zoomControls.append(el.zoomOut, el.zoomLabel, el.zoomIn, el.fit, el.actual);
    controls.append(el.previous, el.select, el.next, zoomControls);
    el.regions = node('div', { class: 'source-viewer-regions' });
    el.regionLabel = node('label', { for: 'source-viewer-region' }, 'Excerpt on this page');
    el.regionSelect = node('select', { id: 'source-viewer-region' });
    el.regionSelect.addEventListener('change', () => { regionIndex = Number(el.regionSelect.value); resetZoom(); renderPage(); });
    el.highlights = button('Highlights on', () => {
      showHighlights = !showHighlights;
      el.highlights.setAttribute('aria-pressed', String(showHighlights));
      el.highlights.textContent = showHighlights ? 'Highlights on' : 'Highlights off';
      el.overlay.hidden = !showHighlights;
    }, { 'aria-pressed': 'true' });
    el.regions.append(el.regionLabel, el.regionSelect, el.highlights);
    el.pageTitle = node('p', { class: 'source-viewer-page-title' });
    el.status = node('p', { class: 'source-viewer-status', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true' });
    el.stage = node('div', { class: 'source-viewer-stage', tabindex: '0', 'aria-label': 'Original page; scroll to explore when zoomed' });
    el.canvas = node('canvas', { role: 'img' });
    el.placeholder = node('div', { class: 'source-viewer-placeholder' });
    el.imageFrame = node('div', { class: 'source-viewer-image-frame', hidden: '' });
    el.scan = node('img', { class: 'source-viewer-scan', alt: '', decoding: 'async' });
    el.overlay = node('div', { class: 'source-viewer-focus-overlay', 'aria-hidden': 'true' });
    el.imageFrame.append(el.scan, el.overlay);
    el.stage.append(el.placeholder, el.canvas, el.imageFrame);
    el.caption = node('div', { class: 'source-viewer-caption', hidden: '' });
    el.captionTitle = node('h4');
    el.checked = node('p');
    el.checkedValues = node('dl', { class: 'source-viewer-checked-values' });
    el.caption.append(el.captionTitle, el.checked, el.checkedValues);
    el.provenance = node('details', { class: 'source-viewer-provenance', hidden: '' });
    el.provenance.append(node('summary', {}, 'Excerpt provenance'));
    el.provenanceText = node('p');
    el.provenance.append(el.provenanceText);
    el.regionStatus = node('p', { class: 'source-viewer-help source-viewer-region-status' }, 'Focused regions not yet verified. The complete cited page is shown; use zoom to inspect its wording.');
    el.textDetails = node('details', { class: 'source-viewer-text' });
    el.textDetails.append(node('summary', {}, 'Read selectable page text'));
    el.textDetails.append(node('small', { class: 'source-viewer-text-note' }, 'Text comes from your PDF and may contain OCR errors. Check the scan for exact wording.'));
    el.text = node('p');
    el.textDetails.append(el.text);
    main.append(sourceHead, el.excerptNotice, el.fileRow, el.editionHelp, controls, el.regions, el.pageTitle, el.status, el.stage, el.caption, el.regionStatus, el.textDetails, el.provenance);
    layout.append(aside, main);
    shell.append(header, el.privacyNotice, layout);
    dialog.append(shell);
    document.body.append(dialog);
    dialog.addEventListener('close', () => {
      if (dialog.open) return; // An older queued close must not cancel a newly opened item.
      session++;
      catalogRequest++;
      renderVersion++;
      renderTask?.cancel();
      document.body.classList.remove('source-viewer-open');
      if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
    });
    dialog.addEventListener('cancel', event => { event.stopPropagation(); });
    dialog.addEventListener('keydown', event => {
      // Keep modal keystrokes away from application-wide command shortcuts.
      event.stopPropagation();
      if (event.altKey && !event.ctrlKey && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
        event.preventDefault(); event.stopPropagation(); navigate(event.key === 'ArrowLeft' ? -1 : 1);
      }
      else if (event.target === el.stage && viewingExcerpts() && ['ArrowLeft','ArrowRight'].includes(event.key)) {
        event.preventDefault();
        el.stage.scrollBy({ left: (event.key === 'ArrowLeft' ? -1 : 1) * Math.max(80, el.stage.clientWidth * .7) });
      }
      if (event.key === 'Tab') {
        const controls = [...dialog.querySelectorAll('button,select,input,[tabindex="0"],summary')].filter(n => !n.disabled && n.getClientRects().length);
        const first = controls[0], last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    });
    root.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => { if (dialog.open) renderPage(); }, 150); });
  }
  function open({ item, references, contextItemId, initialReference } = {}) {
    setup();
    session++;
    catalogRequest++;
    excerptSource = resolveExcerptSource(item, contextItemId);
    excerptCatalog = null; excerptLoading = false; excerptError = '';
    requestedMode = excerptSource ? 'excerpts' : 'pdf';
    refs = normalize(references);
    const initialBook = books()?.code(initialReference?.book);
    const initialPage = Number(initialReference?.page);
    const initialIndex = refs.findIndex(ref => ref.book === initialBook && ref.page === initialPage);
    current = initialIndex < 0 ? 0 : initialIndex; resetZoom(); regionIndex = 0; showHighlights = true;
    returnFocus = document.activeElement;
    el.privacyNotice.hidden = privacyDismissed;
    if (privacyDismissed) dialog.removeAttribute('aria-describedby');
    else dialog.setAttribute('aria-describedby', 'source-viewer-privacy');
    el.item.textContent = item?.name || item?.title || 'First Edition reference';
    el.referenceList.replaceChildren(); el.select.replaceChildren();
    refs.forEach((ref, i) => {
      const label = `${title(ref.book)} · p. ${ref.page}`;
      const b = button(label, () => { current = i; resetZoom(); regionIndex = 0; update(); }, { class: 'source-viewer-reference', 'data-source-index': i });
      el.referenceList.append(b);
      el.select.append(node('option', { value: i }, `${ref.book} p. ${ref.page}`));
    });
    if (!dialog.open) dialog.showModal();
    document.body.classList.add('source-viewer-open');
    update();
    el.close.focus({ preventScroll: true });
    if (excerptSource) loadExcerpts();
  }
  function resetZoom() { zoom = 1; actualSize = false; imageFit = false; }
  function setMode(mode) {
    requestedMode = mode; resetZoom();
    if (mode === 'excerpts' && excerptError) loadExcerpts(true);
    else update();
  }
  function navigate(delta) {
    const next = current + delta;
    if (next < 0 || next >= refs.length) return;
    current = next; resetZoom(); regionIndex = 0; update();
  }
  function changeZoom(delta) { zoom = Math.min(viewingExcerpts() ? 4 : 3, Math.max(.5, zoom + delta)); renderPage(); }
  function matchingRegions() {
    const ref = refs[current];
    return excerptSource && ref && excerptCatalog?.itemId === excerptSource.itemId ? excerptCatalog.regions.filter(region => region.book === ref.book && region.printedPage === ref.page) : [];
  }
  function viewingExcerpts() {
    return !!excerptSource && requestedMode === 'excerpts' && !excerptError && (!excerptCatalog || matchingRegions().length > 0);
  }
  function validateCatalog(catalog, source) {
    if (catalog?.schemaVersion !== 1 || typeof catalog.itemId !== 'string' || !/^[a-z0-9][a-z0-9-]{0,100}$/.test(catalog.itemId)
        || source && (catalog.itemId !== source.itemId || source.collection != null && catalog.collection !== source.collection) || !Array.isArray(catalog.regions) || catalog.regions.length < 1 || catalog.regions.length > 256
        || source?.legacyPath && catalog.itemId === 'phb-dagger' && catalog.regions.length !== 7 || source?.regionCount != null && catalog.regions.length !== source.regionCount || typeof catalog.scope !== 'string') throw new Error('Unsupported excerpt catalog.');
    const seen = new Set();
    for (const region of catalog.regions) {
      const pageOK = source?.legacyPath ? (region.book === 'PHB' ? [35,37,38].includes(region.printedPage) : region.book === 'UA' && region.printedPage === 28) : Object.hasOwn(books().books, region.book) && Number.isInteger(region.printedPage) && books().pdfPage(region.book, region.printedPage) !== null;
      if (!pageOK || region.pdfPage !== books().pdfPage(region.book, region.printedPage) || (source?.legacyPath ? !imageNames.has(region.image) || !region.image.startsWith(`${region.book.toLowerCase()}${region.printedPage}-`) : !/^[a-z0-9][a-z0-9-]{0,150}\.png$/.test(region.image || ''))
          || typeof region.id !== 'string' || !/^[a-z0-9][a-z0-9-]{0,100}$/.test(region.id) || seen.has(region.id)
          || !Number.isInteger(region.width) || !Number.isInteger(region.height) || region.width < 1 || region.height < 1 || region.width > 8192 || region.height > 8192
          || region.verification !== 'visually-checked-crop' || source?.state === 'source-excerpt-checked' && !['source-excerpt','selected-values'].includes(region.verificationScope) || !/^[a-f0-9]{64}$/.test(region.sha256 || '')
          || !Array.isArray(region.focusRects) || region.focusRects.some(box => !Array.isArray(box) || box.length !== 4 || box.some(n => !Number.isFinite(n)) || box[0] < 0 || box[1] < 0 || box[2] <= 0 || box[3] <= 0 || box[0] + box[2] > 1.001 || box[1] + box[3] > 1.001)
          || typeof region.title !== 'string' || typeof region.alt !== 'string' || typeof region.summary !== 'string'
          || !region.checkedFields || typeof region.checkedFields !== 'object' || Array.isArray(region.checkedFields)) throw new Error('Invalid verified excerpt metadata.');
      seen.add(region.id);
      const provenance = catalog.sources?.[region.book];
      if (!provenance || !/^[a-f0-9]{64}$/.test(provenance.sha256 || '') || !['supplied-handoff','computed-local'].includes(provenance.hashStatus)) throw new Error('Missing excerpt provenance.');
    }
    return catalog;
  }
  async function loadExcerpts(retry = false) {
    if (!excerptSource) return;
    const requestSession = session, request = ++catalogRequest, source = excerptSource;
    excerptError = ''; excerptLoading = true;
    if (retry) { catalogCache.delete(source.url); excerptCatalog = null; requestedMode = 'excerpts'; }
    update();
    let cached = cacheGet(catalogCache, source.url);
    if (!cached) {
      cached = {};
      cached.promise = (async () => {
        const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 12000);
        try {
          const response = await fetch(source.url, { credentials: 'same-origin', cache: 'no-cache', signal: controller.signal });
          if (!response.ok) throw new Error('Excerpt catalog unavailable.');
          const text = await response.text();
          if (text.length > 1000000) throw new Error('Excerpt catalog too large.');
          return JSON.parse(text);
        } finally { clearTimeout(timeout); }
      })().catch(error => { if (catalogCache.get(source.url) === cached) catalogCache.delete(source.url); throw error; });
      cachePut(catalogCache, source.url, cached);
    }
    try {
      const catalog = validateCatalog(await cached.promise, source);
      if (requestSession !== session || request !== catalogRequest || excerptSource !== source || !dialog.open) return;
      excerptCatalog = catalog;
      excerptLoading = false;
      update();
    } catch {
      if (requestSession !== session || request !== catalogRequest || excerptSource !== source || !dialog.open) return;
      excerptLoading = false;
      excerptError = 'Verified excerpts could not be loaded. Open your own PDF below, or retry the excerpts.';
      requestedMode = 'pdf';
      update();
    }
  }
  function update() {
    const ref = refs[current], state = ref && files.get(ref.book);
    el.referenceList.querySelectorAll('button').forEach((b, i) => b.setAttribute('aria-current', i === current ? 'page' : 'false'));
    el.select.value = String(current);
    el.previous.disabled = !ref || current === 0;
    el.next.disabled = !ref || current === refs.length - 1;
    el.select.disabled = !ref;
    el.edition.textContent = ref ? editions[ref.book] : 'No source pages available';
    el.mapping.textContent = ref ? books().mapping(ref.book) : 'This entry does not yet have a supported printed-page citation.';
    el.labels.textContent = ref?.labels.join(' · ') || '';
    const excerpts = viewingExcerpts();
    const regions = matchingRegions();
    el.modes.hidden = !excerptSource;
    el.excerptMode.disabled = excerptLoading || !!excerptCatalog && !regions.length;
    el.excerptMode.setAttribute('aria-pressed', String(excerpts));
    el.pdfMode.setAttribute('aria-pressed', String(!excerpts));
    el.privacy.textContent = excerpts
      ? excerptSource.state === 'source-excerpt-checked' ? `${excerptSource.name}: these limited source excerpts have been checked for the cited passage; the entry's extracted values retain their existing status. Complete source PDFs are not hosted. Your own PDF can be opened privately.` : `${excerptSource.name}: only the selected values and accompanying notes in these limited excerpts have been checked. Complete source PDFs are not hosted. Your own PDF can be opened privately.`
      : 'Open your own PDF to read the cited pages. Your file stays in this tab; it is never uploaded or saved by this site.';
    el.fileRow.hidden = el.editionHelp.hidden = excerpts;
    el.regions.hidden = !excerpts || !regions.length;
    el.regionSelect.replaceChildren(...regions.map((region, i) => node('option', { value: i }, region.title)));
    if (regionIndex >= regions.length) regionIndex = 0;
    el.regionSelect.value = String(regionIndex);
    el.regionSelect.disabled = regions.length < 2;
    el.regionLabel.hidden = el.regionSelect.hidden = regions.length < 2;
    el.highlights.setAttribute('aria-pressed', String(showHighlights));
    el.highlights.textContent = showHighlights ? 'Highlights on' : 'Highlights off';
    el.actual.hidden = !excerpts;
    el.fit.textContent = excerpts ? 'Fit width' : 'Fit page';
    if (!excerpts) { el.fit.removeAttribute('aria-pressed'); el.actual.removeAttribute('aria-pressed'); }
    el.excerptNotice.hidden = !excerptSource || !excerptError;
    el.excerptNoticeText.textContent = excerptError;
    el.retry.disabled = excerptLoading;
    el.stage.setAttribute('aria-label', excerpts ? 'Verified excerpt; use arrow keys or scroll to pan when zoomed' : 'Original page; scroll to explore when zoomed');
    el.file.disabled = !ref || !!state?.loading;
    el.fileAction.textContent = state?.doc ? 'Replace your copy' : 'Open your copy';
    el.fileName.textContent = state?.doc ? `${state.name} · ${state.doc.numPages} PDF pages · in this tab` : state?.loading ? 'Reading your local PDF…' : 'No local PDF selected';
    el.forget.hidden = !state;
    el.pageTitle.textContent = ref ? `${title(ref.book)} · printed p. ${ref.page}${pageNumber(ref) ? ` · PDF page ${pageNumber(ref)}` : ''}` : '';
    el.textDetails.open = false;
    el.provenance.open = false;
    renderPage();
    const focused = document.activeElement;
    if (focused && dialog.contains(focused) && !focused.getClientRects().length) (excerptSource ? el.pdfMode : el.close).focus({ preventScroll: true });
  }
  async function library() {
    if (!libraryPromise) {
      libraryPromise = import(new URL('vendor/pdfjs/pdf.mjs', scriptBase).href).then(pdfjs => {
        pdfjs.GlobalWorkerOptions.workerSrc = new URL('vendor/pdfjs/pdf.worker.mjs', scriptBase).href;
        return pdfjs;
      }).catch(error => { libraryPromise = null; throw error; });
    }
    return libraryPromise;
  }
  async function loadFile(book, file) {
    const previous = files.get(book);
    if (previous?.loading) return;
    dispose(previous);
    const state = { name: file.name, loading: true };
    files.set(book, state); update();
    try {
      const [pdfjs, bytes] = await Promise.all([library(), file.arrayBuffer()]);
      if (files.get(book) !== state) return;
      const header = new TextDecoder('ascii').decode(new Uint8Array(bytes, 0, Math.min(1024, bytes.byteLength)));
      if (!header.includes('%PDF-')) throw new Error('This file is not a readable PDF. Choose a PDF copy of the book.');
      state.task = pdfjs.getDocument({
        data: new Uint8Array(bytes),
        cMapUrl: new URL('vendor/pdfjs/cmaps/', scriptBase).href, cMapPacked: true,
        standardFontDataUrl: new URL('vendor/pdfjs/standard_fonts/', scriptBase).href,
        wasmUrl: new URL('vendor/pdfjs/wasm/', scriptBase).href,
        iccUrl: new URL('vendor/pdfjs/iccs/', scriptBase).href,
        isEvalSupported: false, enableXfa: false, verbosity: 0,
      });
      state.task.onPassword = updatePassword => updatePassword(new Error('Password-protected PDF. Choose an unlocked local copy.'));
      const doc = await state.task.promise;
      if (files.get(book) !== state) { dispose(state); return; }
      const info = books().books[book];
      const minimum = Math.max(...Array.from({ length: info.lastPage }, (_, i) => books().pdfPage(book, i + 1) || 0));
      if (doc.numPages < minimum) {
        const count = doc.numPages;
        dispose(state);
        throw new Error(`This PDF has ${count} pages; the ${book} page mapping needs at least ${minimum}. Choose the matching complete scan.`);
      }
      state.doc = doc;
      state.loading = false;
    } catch (error) {
      if (files.get(book) !== state) return;
      dispose(state);
      state.loading = false;
      state.error = /password|destroyed/i.test(error?.message || '') ? 'This PDF is password protected. Open an unlocked copy to read it here.' : error?.message || 'The PDF could not be opened. Try another local copy.';
    }
    if (dialog.open && refs[current]?.book === book) update();
  }
  function forget() {
    const ref = refs[current];
    if (!ref) return;
    const state = files.get(ref.book);
    files.delete(ref.book);
    renderVersion++; renderTask?.cancel();
    dispose(state);
    update();
  }
  function dispose(state) { state?.task?.destroy().catch(() => {}); }
  function empty(message, status = '') {
    el.canvas.hidden = true;
    el.canvas.width = el.canvas.height = 0;
    el.text.textContent = '';
    el.placeholder.hidden = false;
    el.placeholder.textContent = message;
    el.status.textContent = status;
    el.textDetails.hidden = true;
    el.regionStatus.hidden = true;
    el.imageFrame.hidden = el.caption.hidden = el.provenance.hidden = true;
    el.zoomIn.disabled = el.zoomOut.disabled = el.fit.disabled = el.actual.disabled = true;
  }
  async function renderPage() {
    const version = ++renderVersion;
    renderTask?.cancel(); renderTask = null;
    el.text.textContent = '';
    el.canvas.width = el.canvas.height = 0;
    const ref = refs[current], mapped = ref && pageNumber(ref), state = ref && files.get(ref.book);
    el.imageFrame.hidden = el.caption.hidden = el.provenance.hidden = true;
    const excerpts = viewingExcerpts();
    el.stage.classList.toggle('is-excerpt', excerpts);
    el.zoomLabel.textContent = `${Math.round(zoom * 100)}%`;
    if (!ref) return empty('No supported source pages are listed for this entry.');
    if (excerpts) return renderExcerpt(version, ref);
    if (!mapped) return books().availability(ref.book, ref.page) === 'unverified' ? empty(`Printed p. ${ref.page} cannot be mapped reliably in the provided ${ref.book} scan; its identity is unverified.`, 'Source page unverified — no substitute page is shown.') : empty(`Printed p. ${ref.page} is unavailable in the provided ${ref.book} scan.`, 'Known source gap — no substitute page is shown.');
    if (state?.loading) return empty('Reading your local copy…', 'Loading PDF.');
    if (state?.error) return empty(state.error, 'Could not open this PDF. Choose another copy.');
    if (!state?.doc) return empty(`Open your ${title(ref.book)} PDF to see printed p. ${ref.page}.`, 'Your copy stays on your device.');
    if (mapped > state.doc.numPages) return empty('The cited PDF page is outside this file. Choose the matching scan.', 'Page not available in this PDF.');
    el.status.textContent = `Rendering printed p. ${ref.page}…`;
    el.canvas.hidden = true; el.placeholder.hidden = false; el.placeholder.textContent = 'Rendering original page…';
    el.textDetails.hidden = true; el.regionStatus.hidden = true;
    try {
      const page = await state.doc.getPage(mapped);
      if (version !== renderVersion || !dialog.open) return;
      const base = page.getViewport({ scale: 1 });
      const availableWidth = Math.max(160, el.stage.clientWidth - 24);
      const availableHeight = Math.max(160, el.stage.clientHeight - 24);
      const fit = Math.min(availableWidth / base.width, availableHeight / base.height);
      const viewport = page.getViewport({ scale: fit * zoom });
      const pixelRatio = Math.min(root.devicePixelRatio || 1, 2);
      // A fresh canvas prevents a cancelled render from sharing the next page's surface.
      const canvas = node('canvas', { role: 'img', 'aria-label': `${title(ref.book)}, printed page ${ref.page}. Open selectable page text below for available text.` });
      canvas.width = Math.ceil(viewport.width * pixelRatio); canvas.height = Math.ceil(viewport.height * pixelRatio);
      canvas.style.width = `${Math.ceil(viewport.width)}px`; canvas.style.height = `${Math.ceil(viewport.height)}px`;
      el.canvas.replaceWith(canvas); el.canvas = canvas;
      renderTask = page.render({ canvasContext: canvas.getContext('2d'), viewport, transform: pixelRatio === 1 ? null : [pixelRatio, 0, 0, pixelRatio, 0, 0] });
      await renderTask.promise;
      if (version !== renderVersion || !dialog.open) return;
      el.placeholder.hidden = true; canvas.hidden = false;
      el.stage.scrollTo(0, 0);
      el.status.textContent = `Showing printed p. ${ref.page} from your local PDF (PDF page ${mapped}).`;
      el.regionStatus.hidden = false;
      el.regionStatus.textContent = excerptSource && matchingRegions().length
        ? 'This is the complete page from your own PDF. Switch to View excerpts for the checked regions of this entry.'
        : 'Focused regions not yet verified. The complete cited page is shown; use zoom to inspect its wording.';
      el.zoomOut.disabled = zoom <= .5; el.zoomIn.disabled = zoom >= 3; el.fit.disabled = false;
      const content = await page.getTextContent().catch(() => null);
      if (version !== renderVersion || !dialog.open) return;
      const text = content?.items.map(part => part.str + (part.hasEOL ? '\n' : ' ')).join('').trim();
      el.text.textContent = text || 'This page has no selectable text. Its scan is visible above; use zoom to inspect it.';
      el.textDetails.hidden = false;
    } catch (error) {
      if (version !== renderVersion || error?.name === 'RenderingCancelledException') return;
      empty('This page could not be rendered. Try opening the PDF again.', 'Page rendering failed.');
    }
  }
  async function renderExcerpt(version, ref) {
    const catalog = excerptCatalog, excerptOwner = excerptSource, regions = matchingRegions(), region = regions[regionIndex];
    if (!region) return empty('Loading the verified excerpts…', 'Loading limited scan excerpts.');
    el.canvas.hidden = true; el.textDetails.hidden = el.regionStatus.hidden = true;
    el.actual.disabled = true;
    el.placeholder.hidden = false; el.placeholder.textContent = 'Loading verified excerpt…';
    el.status.textContent = `Loading ${region.title}…`;
    try {
      const imageURL = new URL(region.image, excerptOwner.url).href;
      let promise = cacheGet(imageCache, imageURL);
      if (!promise) {
        promise = new Promise((resolve, reject) => {
          const image = node('img', { class: 'source-viewer-scan', alt: region.alt, decoding: 'async' });
          const timeout = setTimeout(() => {
            image.onload = image.onerror = null;
            image.removeAttribute('src');
            reject(new Error('Excerpt image timed out.'));
          }, 12000);
          image.onload = () => {
            clearTimeout(timeout);
            image.onload = image.onerror = null;
            resolve(image);
          };
          image.onerror = () => { clearTimeout(timeout); image.onload = image.onerror = null; reject(new Error('Excerpt image unavailable.')); };
          image.src = imageURL;
        }).catch(error => { if (imageCache.get(imageURL) === promise) imageCache.delete(imageURL); throw error; });
        cachePut(imageCache, imageURL, promise);
      }
      const image = await promise;
      if (version !== renderVersion || !dialog.open || excerptSource !== excerptOwner || excerptCatalog !== catalog || !viewingExcerpts()) return;
      if (image.naturalWidth !== region.width || image.naturalHeight !== region.height) throw new Error('Excerpt dimensions do not match.');
      image.alt = region.alt;
      el.scan.replaceWith(image); el.scan = image;
      const availableWidth = Math.max(160, el.stage.clientWidth - 24);
      // Preserve readable type on wide tables; Fit width gives an overview, Actual size restores PNG pixels.
      const baseWidth = actualSize ? region.width : imageFit || region.width <= 640 ? Math.min(region.width, availableWidth) : Math.min(region.width, Math.max(availableWidth, 960));
      el.imageFrame.style.width = `${Math.round(baseWidth * zoom)}px`;
      el.overlay.replaceChildren(...region.focusRects.map(([x,y,width,height]) => {
        const box = node('span', { class: 'source-viewer-focus-rect' });
        box.style.left = `${x * 100}%`; box.style.top = `${y * 100}%`; box.style.width = `${width * 100}%`; box.style.height = `${height * 100}%`;
        return box;
      }));
      el.overlay.hidden = !showHighlights;
      el.highlights.disabled = !region.focusRects.length;
      el.actual.setAttribute('aria-pressed', String(actualSize && zoom === 1));
      el.fit.setAttribute('aria-pressed', String(imageFit && zoom === 1));
      el.imageFrame.hidden = false; el.placeholder.hidden = true;
      el.captionTitle.textContent = region.title;
      el.checked.textContent = `${region.verificationScope === 'source-excerpt' ? 'Source excerpt checked. ' : region.verificationScope === 'selected-values' ? 'Selected values checked. ' : ''}${region.summary}`;
      const format = value => Array.isArray(value) ? value.map(format).join(' / ') : value && typeof value === 'object' ? Object.entries(value).map(([key,v]) => `${key}: ${format(v)}`).join('; ') : String(value);
      const label = key => key.replace(/_/g,' ').replace(/\bac\b/gi,'AC').replace(/^./,c => c.toUpperCase());
      el.checkedValues.replaceChildren(...Object.entries(region.checkedFields).flatMap(([key,value]) => [node('dt', {}, label(key)),node('dd', {}, format(value))]));
      el.caption.hidden = false;
      const source = catalog.sources[ref.book];
      el.provenanceText.textContent = `Checked crop: ${region.checkedOn}. PNG SHA-256: ${region.sha256}. Source PDF SHA-256 (${source.hashStatus === 'computed-local' ? 'computed locally' : 'supplied with the handoff'}): ${source.sha256}. ${catalog.scope} This does not verify the whole page or book.`;
      el.provenance.hidden = false;
      el.status.textContent = `${ref.book} printed p. ${ref.page} · PDF page ${region.pdfPage} · excerpt ${regionIndex + 1} of ${regions.length}. ${actualSize ? zoom === 1 ? 'Actual image pixels' : 'Zoom from actual size' : imageFit ? zoom === 1 ? 'Fit width' : 'Zoom from fit width' : 'Readable view'}; scroll or use arrow keys to pan.`;
      const firstFocus = region.focusRects[0];
      const focusBottom = firstFocus ? (firstFocus[1] + firstFocus[3]) * el.imageFrame.offsetHeight + 24 : 0;
      el.stage.scrollTo(0,Math.max(0,focusBottom - el.stage.clientHeight));
      el.zoomOut.disabled = zoom <= .5; el.zoomIn.disabled = zoom >= 4; el.fit.disabled = el.actual.disabled = false;
    } catch {
      if (version !== renderVersion || !dialog.open || excerptSource !== excerptOwner || excerptCatalog !== catalog) return;
      excerptError = 'This verified excerpt could not be loaded. Open your own PDF below, or retry the excerpts.';
      requestedMode = 'pdf'; resetZoom(); update();
    }
  }
  root.FirstEditionSourceViewer = Object.freeze({ open });
})(globalThis);
