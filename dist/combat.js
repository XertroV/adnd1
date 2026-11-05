'use strict';
((root)=>{
 function rowForLevel(matrix,level){
  if(!Number.isInteger(level)||level<0||!Array.isArray(matrix?.rows))return null;
  return matrix.rows.find(row=>Number.isInteger(row.levelMin)&&level>=row.levelMin&&(row.levelMax===undefined||row.levelMax===null||level<=row.levelMax))||null;
 }
 function matrixTarget(matrix,level,armorClass){
  if(!Number.isInteger(armorClass)||!Array.isArray(matrix?.armorClasses))return null;
  const column=matrix.armorClasses.indexOf(armorClass);const row=rowForLevel(matrix,level);
  if(column<0||!row||!Array.isArray(row.targets))return null;
  const target=row.targets[column];return typeof target==='number'&&Number.isFinite(target)?target:null;
 }
 function standardTransition(matrix,fromLevel,toLevel,armorClass=0){
  return {fromLevel,toLevel,armorClass,from:matrixTarget(matrix,fromLevel,armorClass),to:matrixTarget(matrix,toLevel,armorClass),fromBand:rowForLevel(matrix,fromLevel)?.label||null,toBand:rowForLevel(matrix,toLevel)?.label||null,book:matrix?.book,pages:matrix?.pages||[]};
 }
 function fighterAltTarget(matrix,level){
  if(!Number.isInteger(level)||level<1)return null;
  const anchor=matrixTarget(matrix,1,0);return anchor===null?null:anchor-(level-1);
 }
 function fighterAltTransition(matrix,fromLevel,toLevel){
  return {fromLevel,toLevel,from:fighterAltTarget(matrix,fromLevel),to:fighterAltTarget(matrix,toLevel),anchorLevel:1,anchorArmorClass:0,anchorTarget:matrixTarget(matrix,1,0),houseRule:true,book:matrix?.book,pages:matrix?.pages||[]};
 }
 function coverage(matrix){
  const columns=Array.isArray(matrix?.armorClasses)?matrix.armorClasses.length:0;const rows=Array.isArray(matrix?.rows)?matrix.rows:[];let known=0;
  rows.forEach(row=>{for(let i=0;i<columns;i++){const value=row.targets?.[i];if(typeof value==='number'&&Number.isFinite(value))known++;}});
  return {known,total:rows.length*columns,missing:rows.length*columns-known};
 }
 const api=Object.freeze({rowForLevel,matrixTarget,standardTransition,fighterAltTarget,fighterAltTransition,coverage});
 root.FirstEditionCombat=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(globalThis);
