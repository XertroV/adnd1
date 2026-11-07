  function normalizeTargets(input) {
    const normalized = [];
    for (const target of Array.isArray(input) ? input : []) {
      const book = books()?.code(target?.book) || target?.book;
      const page = Number(target?.page);
      if (!Object.hasOwn(books()?.books || {}, book) || !Number.isInteger(page) || page < 1) continue;
      const regionIds = [...new Set((Array.isArray(target.regionIds) ? target.regionIds : []).filter(id => typeof id === 'string' && /^[a-z0-9][a-z0-9-]{0,100}$/.test(id)))];
      normalized.push({ book, page, regionIds, label: typeof target.label === 'string' ? target.label : '', status: typeof target.status === 'string' ? target.status : '', targetStatus: typeof target.targetStatus === 'string' ? target.targetStatus : '', reviewStatus: typeof target.reviewStatus === 'string' ? target.reviewStatus : '', fieldPointer: typeof target.fieldPointer === 'string' ? target.fieldPointer : '', sourceObject: typeof target.sourceObject === 'string' ? target.sourceObject : '', sourceCategory: typeof target.sourceCategory === 'string' ? target.sourceCategory : '', contextStatus: typeof target.contextStatus === 'string' ? target.contextStatus : '', contextLimitations: Array.isArray(target.contextLimitations) ? target.contextLimitations.filter(value => typeof value === 'string') : [], coordinateSpace: typeof target.coordinateSpace === 'string' ? target.coordinateSpace : '', catalog: typeof target.catalog === 'string' ? target.catalog : '', pdfPage: Number.isInteger(target.pdfPage) ? target.pdfPage : null });
    }
    return normalized;
  }
  function normalizeActiveTarget(target) {
    const book = books()?.code(target?.book) || target?.book;
    const page = Number(target?.page);
    if (!target || !Object.hasOwn(books()?.books || {}, book) || !Number.isInteger(page) || page < 1) return null;
    const regionIds = [...new Set((Array.isArray(target.regionIds) ? target.regionIds : []).filter(id => typeof id === 'string' && /^[a-z0-9][a-z0-9-]{0,100}$/.test(id)))];
    return { book, page, regionIds, label: typeof target.label === 'string' ? target.label : '', status: typeof target.status === 'string' ? target.status : '', targetStatus: typeof target.targetStatus === 'string' ? target.targetStatus : '', reviewStatus: typeof target.reviewStatus === 'string' ? target.reviewStatus : '', fieldPointer: typeof target.fieldPointer === 'string' ? target.fieldPointer : '', sourceObject: typeof target.sourceObject === 'string' ? target.sourceObject : '', sourceCategory: typeof target.sourceCategory === 'string' ? target.sourceCategory : '', contextStatus: typeof target.contextStatus === 'string' ? target.contextStatus : '', contextLimitations: Array.isArray(target.contextLimitations) ? target.contextLimitations.filter(value => typeof value === 'string') : [], coordinateSpace: typeof target.coordinateSpace === 'string' ? target.coordinateSpace : '', catalog: typeof target.catalog === 'string' ? target.catalog : '', pdfPage: Number.isInteger(target.pdfPage) ? target.pdfPage : null };
  }
// Exact pending-state guard from open() at capture time:
targetStatus = requestedTargetStatus === 'pending' && activeTarget?.fieldPointer ? 'pending' : '';
