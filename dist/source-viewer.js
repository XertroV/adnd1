'use strict';
// Source pages are read from a file chosen by the reader. No source PDFs ship with the site.
((root) => {
  const scriptBase = new URL('.', document.currentScript?.src || document.baseURI);
  const editions = {
    PHB: 'Players Handbook · sixth printing, January 1980',
    UA: 'Unearthed Arcana · original 1985 edition',
    DMG: 'Dungeon Masters Guide · revised December 1979',
  };
  const files = new Map();
  let dialog, el = {}, refs = [], current = 0, zoom = 1, renderTask, renderVersion = 0;
  let libraryPromise, returnFocus, resizeTimer;
  const books = () => root.FirstEditionBooks;
  const title = book => books()?.title(book) || book;
  const pageNumber = ref => books()?.pdfPage(ref.book, ref.page) ?? null;
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
    const heading = node('div');
    heading.append(node('span', { class: 'source-viewer-eyebrow' }, 'AT THE SOURCE'));
    el.title = node('h2', { id: 'source-viewer-title' }, 'Original sources');
    el.item = node('p', { class: 'source-viewer-item' });
    heading.append(el.title, el.item);
    el.close = button('Close', () => dialog.close(), { class: 'source-viewer-close', 'aria-label': 'Close original sources' });
    header.append(heading, el.close);
    const privacy = node('p', { id: 'source-viewer-privacy', class: 'source-viewer-privacy' }, 'Open your own PDF to read the cited pages. Your file stays in this tab; it is never uploaded or saved by this site.');
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
    const fileRow = node('div', { class: 'source-viewer-file-row' });
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
    fileRow.append(fileLabel, el.fileName, el.forget);
    const editionHelp = node('p', { id: 'source-viewer-edition-help', class: 'source-viewer-help' }, 'Choose the edition and page order shown above. A filename or page count cannot confirm that it is the correct book.');
    const controls = node('div', { class: 'source-viewer-controls' });
    el.previous = button('← Previous', () => navigate(-1), { 'aria-label': 'Previous cited page' });
    el.select = node('select', { 'aria-label': 'Select cited page' });
    el.select.addEventListener('change', () => { current = Number(el.select.value); zoom = 1; update(); });
    el.next = button('Next →', () => navigate(1), { 'aria-label': 'Next cited page' });
    const zoomControls = node('div', { class: 'source-viewer-zoom', role: 'group', 'aria-label': 'Page zoom' });
    el.zoomOut = button('−', () => changeZoom(-.25), { 'aria-label': 'Zoom out' });
    el.zoomLabel = node('span', { class: 'source-viewer-zoom-label', 'aria-live': 'polite' }, '100%');
    el.zoomIn = button('+', () => changeZoom(.25), { 'aria-label': 'Zoom in' });
    el.fit = button('Fit page', () => { zoom = 1; renderPage(); });
    zoomControls.append(el.zoomOut, el.zoomLabel, el.zoomIn, el.fit);
    controls.append(el.previous, el.select, el.next, zoomControls);
    el.pageTitle = node('p', { class: 'source-viewer-page-title' });
    el.status = node('p', { class: 'source-viewer-status', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true' });
    el.stage = node('div', { class: 'source-viewer-stage', tabindex: '0', 'aria-label': 'Original page; scroll to explore when zoomed' });
    el.canvas = node('canvas', { role: 'img' });
    el.placeholder = node('div', { class: 'source-viewer-placeholder' });
    el.stage.append(el.placeholder, el.canvas);
    el.regionStatus = node('p', { class: 'source-viewer-help source-viewer-region-status' }, 'Focused regions not yet verified. The complete cited page is shown; use zoom to inspect its wording.');
    el.textDetails = node('details', { class: 'source-viewer-text' });
    el.textDetails.append(node('summary', {}, 'Read selectable page text'));
    el.textDetails.append(node('small', { class: 'source-viewer-text-note' }, 'Text comes from your PDF and may contain OCR errors. Check the scan for exact wording.'));
    el.text = node('p');
    el.textDetails.append(el.text);
    main.append(sourceHead, fileRow, editionHelp, controls, el.pageTitle, el.status, el.stage, el.regionStatus, el.textDetails);
    layout.append(aside, main);
    shell.append(header, privacy, layout);
    dialog.append(shell);
    document.body.append(dialog);
    dialog.addEventListener('close', () => {
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
      if (event.key === 'Tab') {
        const controls = [...dialog.querySelectorAll('button,select,input,[tabindex="0"],summary')].filter(n => !n.disabled && n.getClientRects().length);
        const first = controls[0], last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    });
    root.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => { if (dialog.open) renderPage(); }, 150); });
  }
  function open({ item, references } = {}) {
    setup();
    refs = normalize(references);
    current = 0; zoom = 1;
    returnFocus = document.activeElement;
    el.item.textContent = item?.name || item?.title || 'First Edition reference';
    el.referenceList.replaceChildren(); el.select.replaceChildren();
    refs.forEach((ref, i) => {
      const label = `${title(ref.book)} · p. ${ref.page}`;
      const b = button(label, () => { current = i; zoom = 1; update(); }, { class: 'source-viewer-reference', 'data-source-index': i });
      el.referenceList.append(b);
      el.select.append(node('option', { value: i }, `${ref.book} p. ${ref.page}`));
    });
    if (!dialog.open) dialog.showModal();
    document.body.classList.add('source-viewer-open');
    update();
    el.close.focus({ preventScroll: true });
  }
  function navigate(delta) {
    const next = current + delta;
    if (next < 0 || next >= refs.length) return;
    current = next; zoom = 1; update();
  }
  function changeZoom(delta) { zoom = Math.min(3, Math.max(.5, zoom + delta)); renderPage(); }
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
    el.file.disabled = !ref || !!state?.loading;
    el.fileAction.textContent = state?.doc ? 'Replace your copy' : 'Open your copy';
    el.fileName.textContent = state?.doc ? `${state.name} · ${state.doc.numPages} PDF pages · in this tab` : state?.loading ? 'Reading your local PDF…' : 'No local PDF selected';
    el.forget.hidden = !state;
    el.pageTitle.textContent = ref ? `${title(ref.book)} · printed p. ${ref.page}${pageNumber(ref) ? ` · PDF page ${pageNumber(ref)}` : ''}` : '';
    el.textDetails.open = false;
    renderPage();
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
    el.zoomIn.disabled = el.zoomOut.disabled = el.fit.disabled = true;
  }
  async function renderPage() {
    const version = ++renderVersion;
    renderTask?.cancel(); renderTask = null;
    el.text.textContent = '';
    el.canvas.width = el.canvas.height = 0;
    const ref = refs[current], mapped = ref && pageNumber(ref), state = ref && files.get(ref.book);
    el.zoomLabel.textContent = `${Math.round(zoom * 100)}%`;
    if (!ref) return empty('No supported source pages are listed for this entry.');
    if (!mapped) return empty(`Printed p. ${ref.page} is unavailable in the provided ${ref.book} scan.`, 'Known source gap — no substitute page is shown.');
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
  root.FirstEditionSourceViewer = Object.freeze({ open });
})(globalThis);
