// Validate catalog paths before reading them. Each catalog is scoped to one record.
export function validScanCatalogPath(itemId, path, verification = {}) {
 if (typeof itemId !== 'string' || !/^[a-z0-9][a-z0-9-]{0,100}$/.test(itemId)) return false;
 const collection=verification.collection;
 if(collection != null) return ['rules','spells','classes','equipment','matrices','progressionExplainer'].includes(collection) && path === `scans/verified/${collection.toLowerCase()}-${itemId}.json`;
 return path === `scans/verified/${itemId}.json` || (itemId === 'phb-dagger' ? path === 'scans/dagger/manifest.json' : path === `scans/dagger/${itemId}.json`);
}
export const scanStates = new Set(['selected-values-checked','source-excerpt-checked']);

export function validateScanCatalog(catalog, item, books, verification = item.scanVerification) {
 const fail=()=>{throw Error(`Invalid scan catalog contents for ${item.id}`);};
 if(catalog?.schemaVersion!==1 || catalog.itemId!==item.id || (verification.collection != null && catalog.collection!==verification.collection) || typeof catalog.scope!=='string' || !Array.isArray(catalog.regions) || !Number.isInteger(verification.regionCount) || catalog.regions.length!==verification.regionCount || catalog.regions.length<1 || catalog.regions.length>256)fail();
 const legacy=verification.catalog.startsWith('scans/dagger/');
 const legacyImages=new Set(['phb35-dagger-price.png','phb37-dagger-weight-damage.png','phb38-dagger-melee.png','phb38-dagger-thrown.png','phb38-missile-notes.png','ua28-dagger-thrown.png','ua28-missile-notes.png']);
 const fullUa28Table={image:'ua28-full-table-f9e1d616b1cec48a.png',sha256:'f9e1d616b1cec48a76d66507bc7e05e2877b6cf4df520dbdb905a69e9aa17e6b',width:1130,height:726};
 legacyImages.add(fullUa28Table.image);
 if(legacy && item.id==='phb-dagger' && catalog.regions.length!==7)fail();
 const ids=new Set();
 for(const r of catalog.regions){
  const src=catalog.sources?.[r.book];
  const invalidFullUa28Table=legacy && r.image===fullUa28Table.image && (r.sha256!==fullUa28Table.sha256 || r.width!==fullUa28Table.width || r.height!==fullUa28Table.height);
  if(invalidFullUa28Table || !Object.hasOwn(books.books,r.book) || !Number.isInteger(r.printedPage) || books.pdfPage(r.book,r.printedPage)===null || books.pdfPage(r.book,r.printedPage)!==r.pdfPage || (legacy && !(r.book==='PHB'?[35,37,38].includes(r.printedPage):r.book==='UA'&&r.printedPage===28)) || (legacy ? !legacyImages.has(r.image) || !r.image.startsWith(`${r.book.toLowerCase()}${r.printedPage}-`) : !/^[a-z0-9][a-z0-9-]{0,150}\.png$/.test(r.image||'')) || !/^[a-z0-9][a-z0-9-]{0,100}$/.test(r.id||'') || ids.has(r.id) || !Number.isInteger(r.width) || !Number.isInteger(r.height) || r.width<1 || r.height<1 || r.width>8192 || r.height>8192 || r.verification!=='visually-checked-crop' || (verification.state==='source-excerpt-checked' && !['source-excerpt','selected-values'].includes(r.verificationScope)) || !/^[a-f0-9]{64}$/.test(r.sha256||'') || !Array.isArray(r.focusRects) || r.focusRects.some(b=>!Array.isArray(b)||b.length!==4||b.some(n=>!Number.isFinite(n))||b[0]<0||b[1]<0||b[2]<=0||b[3]<=0||b[0]+b[2]>1.001||b[1]+b[3]>1.001) || ['title','alt','summary'].some(k=>typeof r[k]!=='string') || !r.checkedFields || typeof r.checkedFields!=='object' || Array.isArray(r.checkedFields) || !src || !/^[a-f0-9]{64}$/.test(src.sha256||'') || !['supplied-handoff','computed-local'].includes(src.hashStatus))fail();
  ids.add(r.id);
 }
 return catalog;
}
