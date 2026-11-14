// Declared metadata roles are structural evidence only. Source pixels, qualifiers
// and the field-to-row association still require independent review.
export function citationRegionRole(region){
 if(!region)return 'missing-region';
 const title=region.title||'';
 if(['heading','heading-only'].includes(region.role)||['heading','heading-only'].includes(region.kind)||/\b(?:table|section) headings?\b|\bheading[- ]only\b/i.test(title))return 'heading-context';
 if(region.role==='row'||region.kind==='row')return 'declared-row';
 if(['note','passage'].includes(region.role)||['note','passage'].includes(region.kind))return 'declared-passage';
 if(region.role==='context')return 'declared-context';
 if(/\brow\b/i.test(title))return 'declared-row';
 if(/\btable notes\b/i.test(title))return 'declared-context';
 return 'role-unassessed';
}
export function assertPrimaryRowEvidence(binding,catalog){
 if(binding.reviewStatus!=='field-target-reviewed')return;
 if(binding.requiresRowEvidence!==true&&binding.requiresPassageEvidence!==true)return;
 if(binding.requiresRowEvidence===true&&binding.requiresPassageEvidence===true)throw Error('Conflicting primary evidence roles');
 const first=catalog?.regions?.find(r=>r.id===binding.regionIds?.[0]),role=citationRegionRole(first);
 if(binding.requiresRowEvidence===true&&role!=='declared-row')throw Error(`Row fact ${binding.itemId}${binding.fieldPointer} selects ${role} as primary evidence; a declared row target is required`);
 if(binding.requiresPassageEvidence===true&&!['declared-passage','declared-context'].includes(role))throw Error(`Passage fact ${binding.itemId}${binding.fieldPointer} selects ${role} as primary evidence; a declared passage target is required`);
 const focus=first?.focusRects||[];
 if(!focus.length||focus.some(rect=>JSON.stringify(rect)==='[0,0,1,1]'))throw Error(`Fact ${binding.itemId}${binding.fieldPointer} has an unresolved primary highlight; declared fact targets require a precise focus`);
}
