// Bounded source-content regression guard for the reviewed PHB43–54 batch.
// These checks do not certify every clause of these spells or the source book.
const text = owner => ['effect','conditions','exceptions'].flatMap(key => owner?.[key] || []).join('\n');
const clauses = [
 ['phb-cleric-bless',43,'casting-point area and melee duration', x => x?.fields?.Duration === '6 melee rounds' && /5″ square centered/.test(text(x))],
 ['phb-cleric-cure-light-wounds',43,'separate healed and reverse-caused wound outcomes', x => /healed.*permanent.*further damage/s.test(text(x)) && /reverse.*heal or can be cured.*normal injury/s.test(text(x))],
 ['phb-cleric-protection-from-evil',44,'summoned-being scope and separate material-circle distance', x => ['aerial servants','demons','devils','djinn','efreet','elementals','imps','invisible stalkers','night hags','quasits','salamanders','water weirds','wind walkers','xorn'].every(label => text(x).includes(label)) && /one foot/.test(text(x)) && /3′-diameter/.test(x?.fields?.Material || '')],
 ['phb-cleric-sanctuary',44,'successful-save normal attack branch', x => /makes its saving throw.*normal attack process.*hit roll, saving throws and damage/s.test(text(x))],
 ['phb-cleric-spiritual-hammer',46,'concentration and rear defensive benefits', x => /ceases concentrating/.test(text(x)) && /negating defensive protections such as shield and Dexterity/.test(text(x))],
 ['phb-cleric-animate-dead',48,'follow and stay/attack orders', x => /follow.*remain in an area and attack.*specified type/s.test(text(x))],
 ['phb-cleric-speak-with-the-dead',48,'six literal source rows and retained range/band ambiguity', x => x?.fields?.Range === '1' && JSON.stringify(x?.effect?.slice(1)) === JSON.stringify([
  'Level up to 7th | maximum time dead: 1 week | time questioned: 1 round | questions: 2',
  'Level 7th—8th | maximum time dead: 1 month | time questioned: 3 rounds | questions: 3',
  'Level 9th—12th | maximum time dead: 1 year | time questioned: 1 turn | questions: 4',
  'Level 13th—15th | maximum time dead: 10 years | time questioned: 2 turns | questions: 5',
  'Level 16th—20th | maximum time dead: 100 years | time questioned: 3 turns | questions: 6',
  'Level 21st and up | maximum time dead: 1,000 years | time questioned: 6 turns | questions: 7'
 ]) && /both.*up to 7th.*7th–8th.*without a visible unit/s.test(text(x))],
 ['phb-cleric-exorcise',48,'unitless range and signed level adjustment', x => x?.fields?.Range === '1' && /subtract 1 percentage point.*lower; add 1 percentage point.*higher/s.test(text(x)) && /without a visible unit/.test(text(x))],
 ['phb-cleric-aerial-servant',50,'six surprise outcomes, hit-dice comparison and separate weight capacity', x => /1 = 1 free round, 2 = 2, 3 = 3, 4 = 4, and 5 or 6 = 0/.test(text(x)) && /appropriate number and type of hit dice/.test(text(x)) && /in excess of 10,000 gold pieces.*weight capacity/s.test(text(x))],
 ['phb-cleric-animate-object',51,'movement/damage examples and damage suffered distinction', x => ['1″ per round','4″ per round','8″ per round','12″ per round','1″–2″ per round','3″–6″ per round','1–2 hit points','2–8 hit points','3–12, 4–16 or 5–20','once every five melee rounds to once per melee round','Damage suffered by the animated object'].every(part => text(x).includes(part))],
];
export const reviewedPhbSpellGuidanceIds = clauses.map(([id]) => id);
export const druidComponentCells = [
 ['100%','75%*','100%'], ['75%*','50%**','100%'], ['75%*','50%**','75%*'], ['50%**','50%**','50%**'],
];
export function auditPhbSpellGuidanceContent({spells = [],rules = []}) {
 const findings = clauses.map(([id,printedPage,scope,check]) => {
  const matches = spells.filter(owner => owner.id === id);
  return {collection:'spells',itemId:id,printedPage,pdfPage:printedPage+1,scope,status:matches.length === 1 && check(matches[0]) ? 'present' : 'missing-reviewed-content'};
 });
 const owners = rules.filter(owner => owner.id === 'phb-druid-mistletoe-spell-components');
 const rule = owners[0], rows = rule?.table?.rows || [];
 const cells = rows.map(row => row.cells?.map(cell => cell.raw));
 const tableComplete = owners.length === 1 && JSON.stringify(cells) === JSON.stringify(druidComponentCells)
  && JSON.stringify(rows.map(row => row.label)) === JSON.stringify(['Lesser mistletoe','Borrowed mistletoe','Holly','Oak leaves'])
  && JSON.stringify(rule.table.columns.map(column => column.id)) === JSON.stringify(['spell-range','spell-duration','area-of-effect'])
  && rule.table.footnotes?.length === 2
  && rule.table.footnotes[0].marker === '*' && /\+1 on saving throw.*category is not applicable/.test(rule.table.footnotes[0].text)
  && rule.table.footnotes[1].marker === '**' && /\+2 on saving throw.*category is not applicable/.test(rule.table.footnotes[1].text)
  && /Midsummer’s Eve.*gold or silver sickle.*bowl before it touches the ground/s.test(rule.bullets?.join('\n') || '')
  && /not personally harvested/.test(rule.bullets?.join('\n') || '')
  && /not harvested on the eve of Midsummer.*picking it by hand/s.test(rule.bullets?.join('\n') || '')
  && /Holly and oak leaves must be gathered by the druid.*any manner/s.test(rule.bullets?.join('\n') || '');
 findings.push({collection:'rules',itemId:'phb-druid-mistletoe-spell-components',printedPage:54,pdfPage:55,scope:'four-by-three raw lookup, both marker notes and bounded gathering definitions',status:tableComplete?'present':'missing-reviewed-content'});
 return {scope:'Eleven finite reviewed source-content regressions; not whole-spell or whole-book completeness.',denominator:11,findings,missing:findings.filter(finding => finding.status !== 'present')};
}
