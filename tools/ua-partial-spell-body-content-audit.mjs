// Five source-backed regression probes. Passing these does not establish full
// spell, field, excerpt, page or book completeness; the independent review does
// the source comparison and records its own boundaries.
export const uaPartialSpellBodyProbes=[
 {id:'cleric-ceremony-service-costs',ownerId:'ua-cleric-ceremony',sourcePages:[32],checks:[/investiture 1[–-]100 gp/,/consecrate ground 100[–-]600 gp/]},
 {id:'rainbow-hue-selection',ownerId:'ua-cleric-rainbow',sourcePages:[39,40],checks:[/red—fire-dwellers\/users/,/orange—earth elementals/,/yellow—vegetable targets/,/green—aquatic creatures and water elementals/,/blue—aerial creatures, electricity-using creatures, and air elementals/,/indigo—acid- or poison-using creatures/,/violet—metallic or regenerating creatures/,/previously used hue.*next arrow in spectrum order/]},
 {id:'druid-ceremony-trees-and-ground',ownerId:'ua-druid-ceremony',sourcePages:[41,42],checks:[/ensorcelling its trees against disease and other natural disasters/,/ground remains hallowed.*permanent base/]},
 {id:'bind-command-variants',ownerId:'ua-magic-user-bind',sourcePages:[53],checks:[/Coil & Knot, Loop, Loop & Knot, and Tie & Knot/,/reverse of each/]},
 {id:'chromatic-orb-nine-notes',ownerId:'ua-illusionist-chromatic-orb',sourcePages:[66,67],checks:[/Pearly light persists for 1 round per caster level/,/Ruby heat melts up to 1 cubic yard/,/Flame sets combustibles within 1 foot/,/Amber blinds the target for 5[–-]8 rounds/,/emerald hit.*5-foot radius/,/Turquoise.*3[–-]12 rounds/,/Sapphire.*5[–-]20 rounds/,/Amethyst.*2[–-]8 rounds/,/Ashen.*2[–-]5 rounds/]},
];

export function auditUaPartialSpellBodies(spells){
 if(!Array.isArray(spells))throw new Error('Expected an explicit spell record array.');
 return uaPartialSpellBodyProbes.map(probe=>{
  const matches=spells.filter(spell=>spell.id===probe.ownerId);
  if(matches.length!==1)throw new Error(`${probe.ownerId}: expected exactly one owner.`);
  const spell=matches[0];
  const body=['effect','conditions','exceptions'].flatMap(key=>spell[key]||[]).join('\n');
  return {id:probe.id,ownerId:probe.ownerId,sourcePages:probe.sourcePages,missingProbeIndexes:probe.checks.flatMap((pattern,index)=>pattern.test(body)?[]:[index])};
 });
}
