// Preserve independently recorded source-page context; containment is not a visual verdict.
export function sourceRect(value) {
  const raw=Array.isArray(value)?value:value&&[value.x,value.y,value.width??value.w,value.height??value.h];
  const v=Array.isArray(raw)&&raw.length===1&&Array.isArray(raw[0])?raw[0]:raw;
  if (!Array.isArray(v) || v.length !== 4 || !v.every(Number.isFinite) || v[0] < 0 || v[1] < 0 || v[2] <= 0 || v[3] <= 0 || v[0]+v[2] > 1.000002 || v[1]+v[3] > 1.000002) return null;
  return v;
}
export function containsContext(crop, required, tolerance = 0.000002) {
  const a=sourceRect(crop),b=sourceRect(required);
  return !!a && !!b && a[0] <= b[0]+tolerance && a[1] <= b[1]+tolerance && a[0]+a[2]+tolerance >= b[0]+b[2] && a[1]+a[3]+tolerance >= b[1]+b[3];
}
// Coverage of a manually annotated dependency, not a claim about focus precision.
// A full-image rectangle may cover the boxes and still be an unresolved sentinel.
export function focusCoversEvidence(crop, focusRects, requiredRects) {
  const area=sourceRect(crop);
  if (!area || !Array.isArray(focusRects) || !Array.isArray(requiredRects) || !requiredRects.length) return false;
  const projected=focusRects.map(sourceRect).filter(Boolean).map(([x,y,w,h])=>[area[0]+x*area[2],area[1]+y*area[3],w*area[2],h*area[3]]);
  return requiredRects.every(required=>!!sourceRect(required)&&projected.some(rect=>containsContext(rect,required)));
}
export function reportContextContracts(data, loadCatalog, manifest) {
  const checks=[],ids=new Set();
  for (const required of manifest.requirements || []) {
    if (ids.has(required.id)) throw Error(`Duplicate context contract ${required.id}`);
    ids.add(required.id);
    const values=data[required.collection];
    const item=Array.isArray(values)?values.find(x=>x.id===required.itemId):required.collection==='progressionExplainer'&&required.itemId==='progression-explainer'?values:null;
    const result={id:required.id,collection:required.collection,itemId:required.itemId,fieldPointer:required.fieldPointer,catalog:required.catalog,regionId:required.regionId,evidence:required.evidence,status:'unavailable',reason:''};
    const bounds=required.requiredBounds;
    if (bounds?.space!=='rendered-source-page' || bounds.origin!=='top-left' || bounds.units!=='normalized' || bounds.format!=='xywh' || !sourceRect(bounds.values)) throw Error(`Invalid coordinate space for context contract ${required.id}`);
    if (!item || item[required.binding]?.catalog!==required.catalog) result.reason='Missing or rebound item/catalog';
    else {
      const raw=loadCatalog(required.catalog),catalog=raw.catalog||raw;
      const region=catalog.regions.find(x=>x.id===required.regionId);
      if (!region) result.reason='Required region is missing';
      else if (region.book!==required.book || region.printedPage!==required.printedPage || catalog.sources?.[required.book]?.sha256!==required.sourceSha256) result.reason='Source identity or printed page changed';
      else if (!sourceRect(region.normalizedPageRect)) result.reason='No comparable normalized source-page crop bounds';
      else {
        result.cropBounds={space:'rendered-source-page',origin:'top-left',units:'normalized',format:'xywh',values:sourceRect(region.normalizedPageRect)};
        result.requiredBounds=bounds;
        result.status=containsContext(region.normalizedPageRect,bounds.values)?'contains-required-context':'context-clipped';
        result.reason=result.status==='context-clipped'?'Crop excludes part of the recorded required passage or table extent':'Recorded context extent is contained; current pixels and semantic context retain their separate review statuses';
      }
    }
    checks.push(result);
  }
  return {scope:manifest.scope,total:checks.length,violations:checks.filter(x=>x.status!=='contains-required-context'),checks};
}
