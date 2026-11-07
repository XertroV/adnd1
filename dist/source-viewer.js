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
  let libraryPromise, returnFocus, resizeTimer, continuationManifest = null;
  let excerptCatalog, excerptSource = null, excerptError = '', excerptLoading = false, catalogRequest = 0;
  let requestedMode = 'pdf', regionIndex = 0, showHighlights = true, actualSize = false, session = 0;
  let copySourceLink = null, onViewerClose = null, onSourceChange = null, requestedInitialRegion = null;
  let targets = [], targetStatus = '', pendingTargetPage = null, unavailableTarget = null, targetDismissed = false;
  let activeTarget = null;
  let imageFit = false, privacyDismissed = false;
  const imageCache = new Map(), catalogCache = new Map(), continuationCache = new Map(), cacheLimit = 64;
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
    return { itemId, name: item?.name || item?.title || 'this entry', url: url.href, catalog: path, legacy, legacyPath, collection, state: verification?.state, regionCount: verification?.regionCount, regionReviews: Array.isArray(verification?.regionReviews) ? verification.regionReviews : [] };
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
    el.copyLink = button('Copy source link', () => {
      if (!refs[current] || !copySourceLink) return;
      const issue = targetIssue(refs[current]);
      const region = issue?.type === 'stale' ? issue.id : issue?.type === 'pending' ? null : viewingExcerpts() ? matchingRegions()[regionIndex]?.id : null;
      copySourceLink(refs[current], region, sourceChangeMeta(refs[current], region, issue));
    }, { class: 'source-viewer-secondary', 'aria-label': 'Copy link to this source page' });
    el.headerActions.append(el.modes, el.copyLink, el.close);
    el.excerptNotice = node('div', { class: 'source-viewer-excerpt-notice', role: 'status' });
    el.excerptNoticeText = node('p');
    el.retry = button('Retry verified excerpts', () => loadExcerpts(true));
    el.excerptNotice.append(el.excerptNoticeText, el.retry);
    el.targetNotice = node('p', { class: 'source-viewer-target-notice', role: 'status', 'aria-live': 'polite' });
    el.highlightNotice = node('p', { class: 'source-viewer-highlight-notice', role: 'status', 'aria-live': 'polite' });
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
    el.select.addEventListener('change', () => selectReference(Number(el.select.value)));
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
    el.regionSelect.addEventListener('change', () => {
      const selected = Number(el.regionSelect.value);
      if (selected < 0) return;
      const ref = refs[current];
      const previousIssue = targetIssue(ref);
      const selectedRegion = matchingRegions()[selected];
      if (!selectedRegion) return;
      const selectedTarget = targetForPage(ref);
      const targetMatches = selectedTarget && isResolvedTarget(selectedTarget) && selectedTarget.regionIds.includes(selectedRegion?.id);
      if (!targetMatches && (selectedTarget || previousIssue || targetPageMatches(requestedInitialRegion, ref))) targetDismissed = true;
      if (ref && targetPageMatches(unavailableTarget, ref)) unavailableTarget = null;
      if (ref && targetPageMatches(pendingTargetPage, ref)) { pendingTargetPage = null; targetStatus = ''; }
      if (ref && targetPageMatches(requestedInitialRegion, ref)) requestedInitialRegion = null;
      if (!targetMatches) {
        activeTarget = null;
        targetStatus = '';
      }
      regionIndex = matchingRegions(ref).findIndex(region => region.id === selectedRegion.id);
      resetZoom(); update(); notifySourceChange();
    });
    el.highlights = button('Highlights on', () => {
      showHighlights = !showHighlights;
      el.highlights.setAttribute('aria-pressed', String(showHighlights));
      el.highlights.textContent = showHighlights ? 'Highlights on' : 'Highlights off';
      applyHighlightVisibility();
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
    el.linkedParts = node('div', { class: 'source-viewer-linked-parts', hidden: '' });
    el.stage.append(el.placeholder, el.canvas, el.imageFrame, el.linkedParts);
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
    main.append(sourceHead, el.targetNotice, el.excerptNotice, el.fileRow, el.editionHelp, controls, el.regions, el.pageTitle, el.status, el.highlightNotice, el.stage, el.caption, el.regionStatus, el.textDetails, el.provenance);
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
      const callback = onViewerClose; onViewerClose = null; callback?.();
    });
    dialog.addEventListener('cancel', event => { event.stopPropagation(); });
    dialog.addEventListener('keydown', event => {
      // Keep modal keystrokes away from application-wide command shortcuts.
      event.stopPropagation();
      const editable = event.target?.closest?.('input,textarea,select,[contenteditable=""],[contenteditable="true"],[role="textbox"]');
      if (event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey && !editable && !event.target?.closest?.('.source-viewer-stage') && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
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
  function open({ item, references, contextItemId, initialReference, targets: requestedTargets, activeTarget: requestedActiveTarget, targetStatus: requestedTargetStatus, onCopyLink, onClose, onChange } = {}) {
    setup();
    copySourceLink = typeof onCopyLink === 'function' ? onCopyLink : null; onViewerClose = typeof onClose === 'function' ? onClose : null; onSourceChange = typeof onChange === 'function' ? onChange : null;
    el.copyLink.hidden = !copySourceLink;
    session++;
    catalogRequest++;
    excerptSource = resolveExcerptSource(item, contextItemId);
    excerptCatalog = null; excerptLoading = false; excerptError = '';
    continuationManifest = null;
    requestedMode = excerptSource ? 'excerpts' : 'pdf';
    targets = normalizeTargets(requestedTargets);
    activeTarget = normalizeActiveTarget(requestedActiveTarget);
    targetDismissed = false;
    refs = orderReferencesByTargets(normalize(references), targets);
    const initialBook = books()?.code(initialReference?.book);
    const initialPage = Number(initialReference?.page);
    const initialIndex = refs.findIndex(ref => ref.book === initialBook && ref.page === initialPage);
    current = initialIndex < 0 ? 0 : initialIndex; resetZoom(); regionIndex = 0; showHighlights = true;
    requestedInitialRegion = initialIndex >= 0 && typeof initialReference?.region === 'string' ? { book: initialBook, page: initialPage, id: initialReference.region } : null;
    targetStatus = requestedTargetStatus === 'pending' && activeTarget?.fieldPointer ? 'pending' : '';
    pendingTargetPage = targetStatus === 'pending'
      ? (initialIndex >= 0 ? { book: initialBook, page: initialPage } : targets.find(target => !target.regionIds.length) || null)
      : null;
    unavailableTarget = null;
    if (targetPageMatches(pendingTargetPage, refs[current])) { regionIndex = -1; requestedMode = 'pdf'; }
    else if (requestedInitialRegion) regionIndex = -1;
    returnFocus = document.activeElement;
    el.privacyNotice.hidden = privacyDismissed;
    if (privacyDismissed) dialog.removeAttribute('aria-describedby');
    else dialog.setAttribute('aria-describedby', 'source-viewer-privacy');
    el.item.textContent = item?.name || item?.title || 'First Edition reference';
    el.referenceList.replaceChildren(); el.select.replaceChildren();
    refs.forEach((ref, i) => {
      const label = `${title(ref.book)} · p. ${ref.page}`;
      const b = button(label, () => selectReference(i), { class: 'source-viewer-reference', 'data-source-index': i });
      el.referenceList.append(b);
      el.select.append(node('option', { value: i }, `${ref.book} p. ${ref.page}`));
    });
    if (!dialog.open) dialog.showModal();
    document.body.classList.add('source-viewer-open');
    update();
    el.close.focus({ preventScroll: true });
    if (excerptSource) loadExcerpts();
  }
  function setMode(mode) {
    requestedMode = mode; resetZoom();
    if (mode === 'excerpts' && excerptError) loadExcerpts(true);
    else update();
  }
  function navigate(delta) {
    const destination = navigationDestination(delta);
    if (!destination) return;
    const changedPage = destination.referenceIndex !== current;
    const selected = !changedPage && destination.regionIndex >= 0 ? matchingRegions()[destination.regionIndex] : null;
    const oldRef = refs[current];
    if (changedPage) {
      if (targetPageMatches(requestedInitialRegion, oldRef)) requestedInitialRegion = null;
      if (targetPageMatches(unavailableTarget, oldRef)) unavailableTarget = null;
    }
    current = destination.referenceIndex;
    regionIndex = destination.regionIndex;
    if (!changedPage && selected) {
      dismissMismatchedFieldTarget(refs[current], selected);
      regionIndex = matchingRegions(refs[current]).findIndex(region => region.id === selected.id);
      if (targetPageMatches(requestedInitialRegion, refs[current]) && requestedInitialRegion.id !== selected.id) requestedInitialRegion = null;
    }
    if (regionIndex < 0 && targetPageMatches(requestedInitialRegion, refs[current]) && !targetIssue(refs[current])) unavailableTarget = { ...requestedInitialRegion };
    resetZoom(); update(); notifySourceChange();
  }
  function selectReference(index) {
    if (!Number.isInteger(index) || index < 0 || index >= refs.length) return;
    const previous = refs[current];
    current = index;
    const ref = refs[current];
    if (previous !== ref) {
      if (targetPageMatches(requestedInitialRegion, previous)) requestedInitialRegion = null;
      if (targetPageMatches(unavailableTarget, previous)) unavailableTarget = null;
    }
    resetZoom(); regionIndex = defaultRegionIndex(ref); update(); notifySourceChange();
  }
  function changeZoom(delta) { zoom = Math.min(viewingExcerpts() ? 4 : 3, Math.max(.5, zoom + delta)); renderPage(); }
  function notifySourceChange() {
    if (!refs[current] || !onSourceChange) return;
    const issue = targetIssue(refs[current]);
    const regionId = issue?.type === 'stale' ? issue.id : issue?.type === 'pending' ? null : viewingExcerpts() ? matchingRegions()[regionIndex]?.id : null;
    onSourceChange(refs[current], regionId, sourceChangeMeta(refs[current], regionId, issue));
  }
  function specificFocusRects(rects) { return rects.filter(([x,y,w,h]) => !(x === 0 && y === 0 && w === 1 && h === 1)); }
  function fullImageSentinel(rect) { return Array.isArray(rect) && rect.length === 4 && rect[0] === 0 && rect[1] === 0 && rect[2] === 1 && rect[3] === 1; }
  function canonical(value) {
    if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
    if (value !== null && typeof value === 'object') return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
    return JSON.stringify(value);
  }
  async function sha256Hex(value) {
    if (!root.crypto?.subtle || !root.TextEncoder) return '';
    const digest = await root.crypto.subtle.digest('SHA-256', new root.TextEncoder().encode(value));
    return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2,'0')).join('');
  }
  async function reviewedWholeSpell(region) {
    const record = excerptSource?.regionReviews?.find(candidate => candidate.regionId === region.id);
    const catalogSource = excerptCatalog?.sources?.[region.book];
    const review = record?.review;
    if (!record || record.status !== 'current-reviewed' || record.sentinel !== true || review?.status !== 'exception' || review.independent !== true || review.scope !== 'whole-spell' || review.kind !== 'whole-spell-unmarked') return false;
    const sourceHash = catalogSource?.sha256 || '';
    const imageHash = region.sha256 || '';
    const focusHash = await sha256Hex(canonical(region.focusRects || []));
    const {focusRects, ...content} = region;
    const contentHash = await sha256Hex(canonical(content));
    return !!sourceHash && record.sourceSha256 === sourceHash && record.imageSha256 === imageHash && record.focusSha256 === focusHash && record.contentSha256 === contentHash;
  }
  function normalizeSourceOwner(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value) || typeof value.collection !== 'string' || !/^[a-z][A-Za-z0-9-]{0,40}$/.test(value.collection) || typeof value.itemId !== 'string' || !/^[a-z0-9][a-z0-9-]{0,100}$/.test(value.itemId)) return null;
    return { collection: value.collection, itemId: value.itemId };
  }
  function normalizeTargets(input) {
    const normalized = [];
    for (const target of Array.isArray(input) ? input : []) {
      const book = books()?.code(target?.book) || target?.book;
      const page = Number(target?.page);
      if (!Object.hasOwn(books()?.books || {}, book) || !Number.isInteger(page) || page < 1) continue;
      const regionIds = [...new Set((Array.isArray(target.regionIds) ? target.regionIds : []).filter(id => typeof id === 'string' && /^[a-z0-9][a-z0-9-]{0,100}$/.test(id)))];
      normalized.push({ book, page, regionIds, label: typeof target.label === 'string' ? target.label : '', status: typeof target.status === 'string' ? target.status : '', targetStatus: typeof target.targetStatus === 'string' ? target.targetStatus : '', reviewStatus: typeof target.reviewStatus === 'string' ? target.reviewStatus : '', fieldPointer: typeof target.fieldPointer === 'string' ? target.fieldPointer : '', sourceObject: typeof target.sourceObject === 'string' ? target.sourceObject : '', sourceCategory: typeof target.sourceCategory === 'string' ? target.sourceCategory : '', contextStatus: typeof target.contextStatus === 'string' ? target.contextStatus : '', contextLimitations: Array.isArray(target.contextLimitations) ? target.contextLimitations.filter(value => typeof value === 'string') : [], coordinateSpace: typeof target.coordinateSpace === 'string' ? target.coordinateSpace : '', catalog: typeof target.catalog === 'string' ? target.catalog : '', pdfPage: Number.isInteger(target.pdfPage) ? target.pdfPage : null, ...(normalizeSourceOwner(target.fieldOwner) ? { fieldOwner: normalizeSourceOwner(target.fieldOwner) } : {}), ...(normalizeSourceOwner(target.sourceOwner) ? { sourceOwner: normalizeSourceOwner(target.sourceOwner) } : {}) });
    }
    return normalized;
  }
  function normalizeActiveTarget(target) {
    const book = books()?.code(target?.book) || target?.book;
    const page = Number(target?.page);
    if (!target || !Object.hasOwn(books()?.books || {}, book) || !Number.isInteger(page) || page < 1) return null;
    const regionIds = [...new Set((Array.isArray(target.regionIds) ? target.regionIds : []).filter(id => typeof id === 'string' && /^[a-z0-9][a-z0-9-]{0,100}$/.test(id)))];
    return { book, page, regionIds, label: typeof target.label === 'string' ? target.label : '', status: typeof target.status === 'string' ? target.status : '', targetStatus: typeof target.targetStatus === 'string' ? target.targetStatus : '', reviewStatus: typeof target.reviewStatus === 'string' ? target.reviewStatus : '', fieldPointer: typeof target.fieldPointer === 'string' ? target.fieldPointer : '', sourceObject: typeof target.sourceObject === 'string' ? target.sourceObject : '', sourceCategory: typeof target.sourceCategory === 'string' ? target.sourceCategory : '', contextStatus: typeof target.contextStatus === 'string' ? target.contextStatus : '', contextLimitations: Array.isArray(target.contextLimitations) ? target.contextLimitations.filter(value => typeof value === 'string') : [], coordinateSpace: typeof target.coordinateSpace === 'string' ? target.coordinateSpace : '', catalog: typeof target.catalog === 'string' ? target.catalog : '', pdfPage: Number.isInteger(target.pdfPage) ? target.pdfPage : null, ...(normalizeSourceOwner(target.fieldOwner) ? { fieldOwner: normalizeSourceOwner(target.fieldOwner) } : {}), ...(normalizeSourceOwner(target.sourceOwner) ? { sourceOwner: normalizeSourceOwner(target.sourceOwner) } : {}) };
  }
  function targetPageMatches(target, ref) { return !!target && !!ref && target.book === ref.book && target.page === ref.page; }
  function isResolvedTarget(target) { return !!target && (target.targetStatus === 'resolved' || ['field-target-reviewed','region-verified'].includes(target.reviewStatus)); }
  function targetForPage(ref) {
    if (!ref || targetDismissed || !activeTarget?.fieldPointer) return null;
    const target = targets.find(candidate => targetPageMatches(candidate, ref) && candidate.fieldPointer === activeTarget.fieldPointer);
    if (target) return target;
    return targetPageMatches(activeTarget, ref) ? activeTarget : null;
  }
  function fieldTargetLabel(target) {
    if (!target) return '';
    const pointerLabel = String(target.fieldPointer || '').split('/').filter(Boolean).at(-1)?.replace(/~1/g, '/').replace(/~0/g, '~') || '';
    const label = String(target.label || '').trim();
    return target.fieldPointer && (!label || label === target.sourceObject || label === excerptSource?.name) ? pointerLabel || label : label || pointerLabel || 'Citation target';
  }
  function targetRegionIds(ref) {
    if (targetDismissed || !activeTarget?.fieldPointer) return [];
    const ids = targets.filter(target => targetPageMatches(target, ref) && target.fieldPointer === activeTarget.fieldPointer && isResolvedTarget(target)).flatMap(target => target.regionIds);
    return [...new Set(ids)];
  }
  function orderReferencesByTargets(references, orderedTargets) {
    const order = new Map();
    for (const target of orderedTargets) {
      const key = `${target.book}:${target.page}`;
      if (!order.has(key)) order.set(key, order.size);
    }
    return references.map((ref, index) => ({ ref, index, order: order.get(`${ref.book}:${ref.page}`) ?? Number.MAX_SAFE_INTEGER }))
      .sort((a,b) => a.order - b.order || a.index - b.index).map(row => row.ref);
  }
  function targetIssue(ref) {
    if (targetPageMatches(unavailableTarget, ref)) return { type: 'stale', id: unavailableTarget.id };
    const target = targetForPage(ref);
    if (target && !isResolvedTarget(target)) return { type: 'pending' };
    if (targetStatus === 'pending' && targetPageMatches(pendingTargetPage, ref)) return { type: 'pending' };
    return null;
  }
  function sourceChangeMeta(ref, regionId, issue = targetIssue(ref)) {
    if (targetDismissed) return { activeTarget: false };
    const target = targetForPage(ref);
    if (issue?.type === 'pending') return { targetStatus: 'pending', activeTarget: target || activeTarget || false };
    if (issue?.type === 'stale') return { targetStatus: 'resolved', activeTarget: target || activeTarget || false };
    if (regionId && target && isResolvedTarget(target) && target.regionIds.includes(regionId)) return { targetStatus: 'resolved', activeTarget: target };
    if (activeTarget) return { activeTarget: false };
    return undefined;
  }
  function defaultRegionIndex(ref) {
    const issue = targetIssue(ref);
    if (issue) return -1;
    if (!excerptCatalog) return 0;
    const regions = matchingRegions();
    const requested = refs[current] === ref && targetPageMatches(requestedInitialRegion, ref) ? requestedInitialRegion.id : targetRegionIds(ref)[0];
    if (requested) {
      const index = regions.findIndex(region => region.id === requested);
      if (index < 0) { unavailableTarget = { book: ref.book, page: ref.page, id: requested }; return -1; }
      unavailableTarget = null;
      return index;
    }
    return 0;
  }
  function resetZoom() { zoom = 1; actualSize = false; imageFit = false; }
  function matchingRegions(ref = refs[current]) {
    if (!excerptSource || !ref || excerptCatalog?.itemId !== excerptSource.itemId) return [];
    const available = excerptCatalog.regions.filter(region => region.book === ref.book && region.printedPage === ref.page).sort((a,b) => Number(a.role === 'context') - Number(b.role === 'context'));
    const targetIds = targetRegionIds(ref);
    if (!targetIds.length) return available;
    const byId = new Map(available.map(region => [region.id, region]));
    const targeted = targetIds.map(id => byId.get(id)).filter(Boolean);
    const included = new Set(targeted.map(region => region.id));
    return [...targeted, ...available.filter(region => !included.has(region.id))];
  }
  function regionIndexFor(ref) {
    if (!ref || targetIssue(ref)) return -1;
    const regions = matchingRegions(ref);
    if (!regions.length) return -1;
    const requested = refs[current] === ref && targetPageMatches(requestedInitialRegion, ref) ? requestedInitialRegion.id : targetRegionIds(ref)[0];
    if (!requested) return 0;
    return regions.findIndex(region => region.id === requested);
  }
  function navigationDestination(direction) {
    if (direction !== -1 && direction !== 1 || !refs[current]) return null;
    const regions = viewingExcerpts() ? matchingRegions() : [];
    if (viewingExcerpts() && regionIndex >= 0 && regionIndex < regions.length) {
      const nextRegion = regionIndex + direction;
      if (nextRegion >= 0 && nextRegion < regions.length) return { referenceIndex: current, regionIndex: nextRegion };
    }
    const nextReference = current + direction;
    if (nextReference < 0 || nextReference >= refs.length) return null;
    const nextRef = refs[nextReference];
    if (requestedMode !== 'excerpts' || !excerptSource || excerptError) return { referenceIndex: nextReference, regionIndex: -1 };
    const regionsForNext = matchingRegions(nextRef);
    if (!regionsForNext.length || targetIssue(nextRef)) return { referenceIndex: nextReference, regionIndex: -1 };
    const requestedIndex = regionIndexFor(nextRef);
    return { referenceIndex: nextReference, regionIndex: direction > 0 ? Math.max(0, requestedIndex) : regionsForNext.length - 1 };
  }
  function dismissMismatchedFieldTarget(ref, region) {
    const target = targetForPage(ref);
    if (!target || !region) return;
    if (isResolvedTarget(target) && target.regionIds.includes(region.id)) return;
    targetDismissed = true;
    if (targetPageMatches(pendingTargetPage, ref)) { pendingTargetPage = null; targetStatus = ''; }
    if (targetPageMatches(requestedInitialRegion, ref)) requestedInitialRegion = null;
  }
  function viewingExcerpts() {
    const ref = refs[current];
    return !!excerptSource && requestedMode === 'excerpts' && !excerptError && (!excerptCatalog || matchingRegions().length > 0 || !!(ref && books().privateEvidence(ref.book, ref.page)));
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
  async function loadContinuations() {
    if (root.FirstEditionSourceContinuations?.schemaVersion === 1 && Array.isArray(root.FirstEditionSourceContinuations.groups)) return root.FirstEditionSourceContinuations;
    const url = new URL('source-continuations.json', scriptBase).href;
    let cached = cacheGet(continuationCache, url);
    if (!cached) {
      cached = {};
      cached.promise = (async () => {
        const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 12000);
        try {
          const response = await fetch(url, { credentials: 'same-origin', cache: 'no-cache', signal: controller.signal });
          if (!response.ok) throw new Error('Continuation metadata unavailable.');
          const text = await response.text();
          if (text.length > 500000) throw new Error('Continuation metadata too large.');
          const manifest = JSON.parse(text);
          if (manifest?.schemaVersion !== 1 || !Array.isArray(manifest.groups) || manifest.groups.length > 512) throw new Error('Unsupported continuation metadata.');
          return manifest;
        } finally { clearTimeout(timeout); }
      })().catch(error => { if (continuationCache.get(url) === cached) continuationCache.delete(url); throw error; });
      cachePut(continuationCache, url, cached);
    }
    try { return await cached.promise; } catch { return null; }
  }
  function validatedContinuationParts(ref, selectedRegion) {
    const manifest = root.FirstEditionSourceContinuations?.schemaVersion === 1 && Array.isArray(root.FirstEditionSourceContinuations.groups)
      ? root.FirstEditionSourceContinuations : continuationManifest;
    const catalog = excerptCatalog, source = excerptSource;
    if (!manifest || manifest.schemaVersion !== 1 || !Array.isArray(manifest.groups) || !catalog || !source?.catalog || !source.collection
        || catalog.itemId !== source.itemId || catalog.collection !== source.collection || !ref || !selectedRegion
        || selectedRegion.book !== ref.book || selectedRegion.printedPage !== ref.page) return null;
    for (const group of manifest.groups) {
      if (group?.collection !== source.collection || group?.itemId !== source.itemId || group?.catalog !== source.catalog || !Array.isArray(group.segments) || group.segments.length < 2 || group.segments.length > 32) continue;
      const ordered = [...group.segments].sort((a,b) => Number(a?.order) - Number(b?.order));
      const uniqueRegions = new Set(ordered.map(segment => segment?.regionId));
      if (uniqueRegions.size !== ordered.length || ordered.some((segment,index) => !segment || segment.order !== index + 1 || segment.state !== 'present' || segment.role !== (index === 0 ? 'opening' : 'continuation'))) continue;
      const selectedSegment = ordered.find(segment => segment.regionId === selectedRegion.id && segment.book === ref.book && segment.printedPage === ref.page);
      if (!selectedSegment) continue;
      const parts = [];
      let valid = true;
      for (const segment of ordered) {
        const region = catalog.regions.find(candidate => candidate.id === segment.regionId);
        const sourceRecord = catalog.sources?.[segment.book];
        if (!region || !sourceRecord || segment.book !== region.book || segment.printedPage !== region.printedPage || segment.pdfPage !== region.pdfPage
            || segment.image !== region.image || segment.imageSha256 !== region.sha256 || segment.sourceSha256 !== sourceRecord.sha256
            || !/^[a-f0-9]{64}$/.test(segment.imageSha256 || '') || !/^[a-f0-9]{64}$/.test(segment.sourceSha256 || '')
            || typeof segment.role !== 'string' || !segment.role || !/^[a-z0-9][a-z0-9-]{0,150}\.png$/.test(segment.image || '')
            || !Object.hasOwn(books().books, segment.book) || books().pdfPage(segment.book, segment.printedPage) !== segment.pdfPage) { valid = false; break; }
        parts.push({ segment, region, selected: segment === selectedSegment });
      }
      if (valid && parts.some(part => part.selected)) return { group, parts };
    }
    return null;
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
      regionIndex = defaultRegionIndex(refs[current]);
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
    const previousStop = navigationDestination(-1), nextStop = navigationDestination(1);
    el.previous.disabled = !previousStop;
    el.next.disabled = !nextStop;
    const previousLabel = previousStop?.referenceIndex === current ? 'Previous excerpt' : 'Previous cited page';
    const nextLabel = nextStop?.referenceIndex === current ? 'Next excerpt' : 'Next cited page';
    el.previous.setAttribute('aria-label', previousLabel);
    el.previous.textContent = `← ${previousLabel.replace(/^./, character => character.toUpperCase())}`;
    el.next.setAttribute('aria-label', nextLabel);
    el.next.textContent = `${nextLabel.replace(/^./, character => character.toUpperCase())} →`;
    el.select.disabled = !ref;
    el.edition.textContent = ref ? editions[ref.book] : 'No source pages available';
    el.mapping.textContent = ref ? books().mapping(ref.book) : 'This entry does not yet have a supported printed-page citation.';
    const fieldTarget = targetForPage(ref);
    el.labels.textContent = fieldTarget
      ? `Field target: ${fieldTargetLabel(fieldTarget)}${fieldTarget.status ? ` · ${fieldTarget.status}` : ''}`
      : ref?.labels.length ? `Page citations: ${ref.labels.join(' · ')}` : '';
    const excerpts = viewingExcerpts();
    const regions = matchingRegions();
    const privateOnly = !!(ref && excerptCatalog && !regions.length && books().privateEvidence(ref.book, ref.page));
    const issue = targetIssue(ref);
    el.targetNotice.hidden = !issue;
    const fieldLabel = fieldTargetLabel(fieldTarget || activeTarget);
    el.targetNotice.textContent = issue?.type === 'stale'
      ? `The linked excerpt “${issue.id}” is not available for this page in the current catalog. Choose another excerpt or open your PDF.`
      : issue?.type === 'pending' ? `${fieldLabel ? `The field target “${fieldLabel}”` : 'This citation'} has no reviewed excerpt mapping yet. The cited page is open in your PDF view; choose an excerpt only if it supports the field.` : '';
    el.modes.hidden = !excerptSource;
    el.excerptMode.disabled = excerptLoading || !!excerptCatalog && !regions.length && !privateOnly;
    el.excerptMode.setAttribute('aria-pressed', String(excerpts));
    el.pdfMode.setAttribute('aria-pressed', String(!excerpts));
    el.privacy.textContent = excerpts && privateOnly
      ? 'No public excerpt is available for this page. The separately supplied private image is not published, and its printing is unknown.'
      : excerpts ? excerptSource.state === 'source-excerpt-checked' ? `${excerptSource.name}: these limited source excerpts have been checked for the cited passage; the entry's extracted values retain their existing status. Complete source PDFs are not hosted. Your own PDF can be opened privately.` : `${excerptSource.name}: only the selected values and accompanying notes in these limited excerpts have been checked. Complete source PDFs are not hosted. Your own PDF can be opened privately.`
      : 'Open your own PDF to read the cited pages. Your file stays in this tab; it is never uploaded or saved by this site.';
    el.fileRow.hidden = el.editionHelp.hidden = excerpts;
    el.regions.hidden = !excerpts || !regions.length && !issue;
    const regionOptions = [];
    if (issue) regionOptions.push(node('option', { value: -1, disabled: '' }, issue.type === 'stale' ? 'Requested excerpt unavailable' : 'No field excerpt mapped'));
    regionOptions.push(...regions.map((region, i) => node('option', { value: i }, region.title)));
    el.regionSelect.replaceChildren(...regionOptions);
    if (!issue && (regionIndex < 0 || regionIndex >= regions.length)) regionIndex = 0;
    el.regionSelect.value = String(regionIndex);
    el.regionSelect.disabled = regions.length < 2 && !issue;
    el.regionLabel.hidden = el.regionSelect.hidden = regions.length < 2 && !issue;
    el.highlights.setAttribute('aria-pressed', String(showHighlights));
    el.highlights.textContent = showHighlights ? 'Highlights on' : 'Highlights off';
    el.actual.hidden = !excerpts;
    el.fit.textContent = excerpts ? 'Fit width' : 'Fit page';
    if (!excerpts) { el.fit.removeAttribute('aria-pressed'); el.actual.removeAttribute('aria-pressed'); }
    el.excerptNotice.hidden = !excerptSource || !excerptError;
    el.excerptNoticeText.textContent = excerptError;
    el.retry.disabled = excerptLoading;
    el.stage.setAttribute('aria-label', excerpts ? privateOnly ? 'Source page unavailable' : 'Verified excerpt; use arrow keys or scroll to pan when zoomed' : 'Original page; scroll to explore when zoomed');
    el.highlightNotice.hidden = !excerpts;
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
    el.highlightNotice.hidden = true;
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
    clearLinkedParts();
    el.text.textContent = '';
    el.canvas.width = el.canvas.height = 0;
    const ref = refs[current], mapped = ref && pageNumber(ref), state = ref && files.get(ref.book);
    el.imageFrame.hidden = el.caption.hidden = el.provenance.hidden = true;
    const excerpts = viewingExcerpts();
    el.stage.classList.toggle('is-excerpt', excerpts);
    el.zoomLabel.textContent = `${Math.round(zoom * 100)}%`;
    if (!ref) return empty('No supported source pages are listed for this entry.');
    if (excerpts) return renderExcerpt(version, ref);
    if (!mapped) return books().availability(ref.book, ref.page) === 'unverified' ? empty(`Printed p. ${ref.page} cannot be mapped reliably in the provided ${ref.book} scan; its identity is unverified.`, 'Source page unverified — no substitute page is shown.') : empty(books().missingPageNotice(ref.book, ref.page), 'Known source gap — no substitute page is shown.');
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
  function clearLinkedParts() {
    if (!el.stage || !el.linkedParts) return;
    el.stage.classList.remove('is-linked');
    el.linkedParts.hidden = true;
    el.linkedParts.replaceChildren();
    el.stage.insertBefore(el.imageFrame, el.linkedParts);
    const main = el.stage.parentElement;
    if (main) {
      main.insertBefore(el.highlightNotice, el.stage);
      if (el.caption.parentElement !== main) main.insertBefore(el.caption, el.stage.nextSibling);
    }
  }
  function applyHighlightVisibility() {
    if (!el.stage) return;
    el.stage.querySelectorAll('.source-viewer-focus-overlay,.source-viewer-linked-focus-overlay').forEach(overlay => {
      overlay.hidden = !showHighlights || overlay.dataset.hasFocus !== 'true';
    });
  }
  function imageWidth(region, availableWidth) {
    return actualSize ? region.width : imageFit || region.width <= 640 ? Math.min(region.width, availableWidth) : Math.min(region.width, Math.max(availableWidth, 960));
  }
  function regionImagePromise(region, owner) {
    const imageURL = new URL(region.image, owner.url).href;
    let promise = cacheGet(imageCache, imageURL);
    if (!promise) {
      promise = new Promise((resolve, reject) => {
        const image = node('img', { alt: region.alt, decoding: 'async' });
        const timeout = setTimeout(() => { image.onload = image.onerror = null; image.removeAttribute('src'); reject(new Error('Excerpt image timed out.')); }, 12000);
        image.onload = () => { clearTimeout(timeout); image.onload = image.onerror = null; resolve(image); };
        image.onerror = () => { clearTimeout(timeout); image.onload = image.onerror = null; reject(new Error('Excerpt image unavailable.')); };
        image.src = imageURL;
      }).catch(error => { if (imageCache.get(imageURL) === promise) imageCache.delete(imageURL); throw error; });
      cachePut(imageCache, imageURL, promise);
    }
    return promise;
  }
  function displayedImage(cached, region, className) {
    const image = node('img', { class: className, alt: region.alt, decoding: 'async', 'data-region-id': region.id });
    image.width = region.width; image.height = region.height;
    image.src = cached.currentSrc || cached.src;
    return image;
  }
  function focusOverlay(region, className) {
    const focusRects = specificFocusRects(region.focusRects || []);
    const overlay = node('div', { class: className, 'aria-hidden': 'true', 'data-has-focus': String(focusRects.length > 0) });
    overlay.replaceChildren(...focusRects.map(([x,y,width,height]) => {
      const box = node('span', { class: className === 'source-viewer-focus-overlay' ? 'source-viewer-focus-rect' : 'source-viewer-linked-focus-rect' });
      box.style.left = `${x * 100}%`; box.style.top = `${y * 100}%`; box.style.width = `${width * 100}%`; box.style.height = `${height * 100}%`;
      return box;
    }));
    overlay.hidden = !showHighlights || !focusRects.length;
    return overlay;
  }
  async function highlightDisposition(region, ref) {
    const precise = specificFocusRects(region.focusRects || []);
    const sentinels = (region.focusRects || []).filter(fullImageSentinel);
    if (!sentinels.length && precise.length) return { needsWarning: false, reviewed: false, text: '' };
    const factTarget = !!targetForPage(ref);
    const reviewed = !factTarget && sentinels.length === (region.focusRects || []).length && sentinels.length > 0 && await reviewedWholeSpell(region);
    const text = reviewed
      ? 'Unmarked whole-spell view reviewed against its exact source, image, focus and content hashes.'
      : sentinels.length && precise.length
        ? 'A full-image highlight flag is present but suppressed. The excerpt stays unobscured; passage-level precision is unresolved.'
        : 'Precise highlighting is not reviewed or available for this excerpt. The source remains unobscured; no passage-level highlight is inferred.';
    return { needsWarning: !reviewed, reviewed, text };
  }
  async function renderExcerpt(version, ref) {
    const catalog = excerptCatalog, excerptOwner = excerptSource, regions = matchingRegions(), region = regions[regionIndex];
    if (!region) {
      const issue = targetIssue(ref);
      if (issue?.type === 'stale') return empty('This linked excerpt is no longer available. Choose a listed excerpt or open your PDF.', 'Requested excerpt unavailable.');
      if (issue?.type === 'pending') return empty('No field-specific excerpt is linked. Switch to Your PDF to inspect the cited page, or choose a listed excerpt.', 'No exact field excerpt is mapped.');
      if (catalog && books().privateEvidence(ref.book, ref.page)) return empty(books().missingPageNotice(ref.book, ref.page), 'No public excerpt is available for this page.');
      return empty('Loading the verified excerpts…', 'Loading limited scan excerpts.');
    }
    const disposition = await highlightDisposition(region, ref);
    if (version !== renderVersion || !dialog.open || excerptSource !== excerptOwner || excerptCatalog !== catalog) return;
    el.highlightNotice.hidden = !disposition.needsWarning && !disposition.reviewed;
    el.highlightNotice.textContent = disposition.text;
    el.canvas.hidden = true; el.textDetails.hidden = el.regionStatus.hidden = true;
    el.actual.disabled = true;
    el.placeholder.hidden = false; el.placeholder.textContent = 'Loading verified excerpt…';
    el.status.textContent = `Loading ${region.title}…`;
    try {
      const [,manifest] = await Promise.all([regionImagePromise(region, excerptOwner), loadContinuations()]);
      if (version !== renderVersion || !dialog.open || excerptSource !== excerptOwner || excerptCatalog !== catalog) return;
      continuationManifest = manifest;
      const linked = validatedContinuationParts(ref, region);
      const displayParts = linked?.parts || [{ region, selected: true, segment: { role: 'excerpt' } }];
      const loadedParts = await Promise.all(displayParts.map(async part => {
        try {
          const cachedImage = await regionImagePromise(part.region, excerptOwner);
          if (cachedImage.naturalWidth !== part.region.width || cachedImage.naturalHeight !== part.region.height) throw new Error('Linked excerpt dimensions do not match.');
          return { ...part, cachedImage };
        }
        catch { return { ...part, cachedImage: null }; }
      }));
      if (version !== renderVersion || !dialog.open || excerptSource !== excerptOwner || excerptCatalog !== catalog || !viewingExcerpts()) return;
      const selectedPart = loadedParts.find(part => part.selected);
      if (!selectedPart?.cachedImage) throw new Error('Selected excerpt image unavailable.');
      const image = selectedPart.cachedImage;
      if (image.naturalWidth !== region.width || image.naturalHeight !== region.height) throw new Error('Excerpt dimensions do not match.');
      image.className = 'source-viewer-scan';
      image.alt = region.alt;
      image.dataset.regionId = region.id;
      if (el.scan !== image) el.scan.replaceWith(image);
      el.scan = image;
      const availableWidth = Math.max(160, el.stage.clientWidth - 24);
      // Preserve readable type on wide tables; Fit width gives an overview, Actual size restores PNG pixels.
      const baseWidth = imageWidth(region, availableWidth);
      el.imageFrame.style.width = `${Math.round(baseWidth * zoom)}px`;
      el.overlay.replaceWith(focusOverlay(region, 'source-viewer-focus-overlay'));
      el.overlay = el.imageFrame.querySelector('.source-viewer-focus-overlay');
      const focusRects = specificFocusRects(region.focusRects || []);
      el.actual.setAttribute('aria-pressed', String(actualSize && zoom === 1));
      el.fit.setAttribute('aria-pressed', String(imageFit && zoom === 1));
      el.placeholder.hidden = true;
      el.captionTitle.textContent = region.title;
      el.checked.textContent = `${region.verificationScope === 'source-excerpt' ? 'Source excerpt checked. ' : region.verificationScope === 'selected-values' ? 'Selected values checked. ' : ''}${region.summary}${focusRects.length ? '' : ' Excerpt shown without a marked passage.'}`;
      const format = value => Array.isArray(value) ? value.map(format).join(' / ') : value && typeof value === 'object' ? Object.entries(value).map(([key,v]) => `${key}: ${format(v)}`).join('; ') : String(value);
      const label = key => key.replace(/_/g,' ').replace(/\bac\b/gi,'AC').replace(/^./,c => c.toUpperCase());
      el.checkedValues.replaceChildren(...Object.entries(region.checkedFields).flatMap(([key,value]) => [node('dt', {}, label(key)),node('dd', {}, format(value))]));
      el.caption.hidden = false;
      const preciseCount = loadedParts.reduce((count, part) => count + (part.cachedImage ? specificFocusRects(part.region.focusRects || []).length : 0), 0);
      el.highlights.hidden = preciseCount === 0;
      el.highlights.disabled = preciseCount === 0;
      el.highlights.setAttribute('aria-pressed', String(showHighlights));
      el.highlights.textContent = showHighlights ? 'Highlights on' : 'Highlights off';
      if (linked) {
        el.stage.classList.add('is-linked');
        el.linkedParts.hidden = false;
        el.linkedParts.replaceChildren();
        for (const part of loadedParts) {
          const partRegion = part.region, selected = part.selected;
          const figure = node('figure', { class: 'source-viewer-linked-part', 'data-region-id': partRegion.id, 'data-printed-page': partRegion.printedPage, 'data-selected': String(selected), 'data-role': part.segment.role });
          const pageLabel = node('p', { class: 'source-viewer-linked-page' }, `${title(partRegion.book)} printed p. ${partRegion.printedPage} · PDF page ${partRegion.pdfPage} · ${part.segment.role}`);
          figure.append(pageLabel);
          if (selected) {
            el.imageFrame.hidden = false;
            figure.append(el.highlightNotice);
            figure.append(el.imageFrame);
            figure.append(el.caption);
          } else if (part.cachedImage) {
            const partDisposition = await highlightDisposition(partRegion, { book: partRegion.book, page: partRegion.printedPage });
            if (version !== renderVersion || !dialog.open || excerptSource !== excerptOwner || excerptCatalog !== catalog) return;
            const note = node('p', { class: partDisposition.reviewed ? 'source-viewer-linked-reviewed' : 'source-viewer-linked-warning', role: 'status' }, partDisposition.text || 'Precise highlighting is reviewed for this excerpt.');
            note.hidden = !partDisposition.needsWarning && !partDisposition.reviewed;
            figure.append(note);
            const frame = node('div', { class: 'source-viewer-linked-frame' });
            frame.style.width = `${Math.round(imageWidth(partRegion, availableWidth) * zoom)}px`;
            frame.append(displayedImage(part.cachedImage, partRegion, 'source-viewer-linked-scan'), focusOverlay(partRegion, 'source-viewer-linked-focus-overlay'));
            figure.append(frame);
            const caption = node('figcaption', { class: 'source-viewer-linked-caption' });
            caption.append(node('strong', {}, partRegion.title), node('p', {}, partRegion.summary));
            figure.append(caption);
          } else {
            figure.append(node('p', { class: 'source-viewer-linked-unavailable', role: 'status' }, `The declared ${part.segment.role} image is unavailable in this session; no substitute excerpt is shown.`));
          }
          el.linkedParts.append(figure);
        }
      } else {
        el.imageFrame.hidden = false;
      }
      applyHighlightVisibility();
      const source = catalog.sources[ref.book];
      el.provenanceText.textContent = `Checked crop: ${region.checkedOn}. PNG SHA-256: ${region.sha256}. Source PDF SHA-256 (${source.hashStatus === 'computed-local' ? 'computed locally' : 'supplied with the handoff'}): ${source.sha256}. ${catalog.scope} This does not verify the whole page or book.`;
      el.provenance.hidden = false;
      el.status.textContent = `${ref.book} printed p. ${ref.page} · PDF page ${region.pdfPage} · excerpt ${regionIndex + 1} of ${regions.length}${linked ? ` · ${loadedParts.length} linked passage parts` : ''}. ${actualSize ? zoom === 1 ? 'Actual image pixels' : 'Zoom from actual size' : imageFit ? zoom === 1 ? 'Fit width' : 'Zoom from fit width' : 'Readable view'}; scroll or use arrow keys to pan.`;
      if (linked) {
        const selectedFigure = el.linkedParts.querySelector('.source-viewer-linked-part[data-selected="true"]');
        el.stage.scrollTo(0, Math.max(0, (selectedFigure?.offsetTop || 0) - 12));
      } else {
        const firstFocus = focusRects[0];
        if (firstFocus) {
          const focusBottom = (firstFocus[1] + firstFocus[3]) * el.imageFrame.offsetHeight + 24;
          el.stage.scrollTo(0,Math.max(0,focusBottom - el.stage.clientHeight));
        } else el.stage.scrollTo(0,0);
      }
      el.zoomOut.disabled = zoom <= .5; el.zoomIn.disabled = zoom >= 4; el.fit.disabled = el.actual.disabled = false;
    } catch {
      if (version !== renderVersion || !dialog.open || excerptSource !== excerptOwner || excerptCatalog !== catalog) return;
      excerptError = 'This verified excerpt could not be loaded. Open your own PDF below, or retry the excerpts.';
      requestedMode = 'pdf'; resetZoom(); update();
    }
  }
  function close() { if (dialog?.open) dialog.close(); }
  root.FirstEditionSourceViewer = Object.freeze({ open, close });
})(globalThis);
