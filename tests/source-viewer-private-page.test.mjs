import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
const require=createRequire(import.meta.url),books=require('../dist/books.js');
const source=readFileSync(new URL('../dist/source-viewer.js',import.meta.url),'utf8');
const segment=(a,b)=>source.slice(source.indexOf(a),source.indexOf(b,source.indexOf(a)));
test('a private-only page stays selected in excerpt mode with a truthful notice',async()=>{
 const ctx=vm.createContext({refs:[{book:'PHB',page:103},{book:'DMG',page:175}],current:1,regionIndex:0,requestedMode:'excerpts',excerptError:'',excerptSource:{itemId:'encounter-types'},excerptCatalog:{itemId:'encounter-types',regions:[{book:'PHB',printedPage:103}]},books:()=>books,empty:(message,status)=>({message,status})});
 vm.runInContext(segment('  function matchingRegions()', '  function validateCatalog('),ctx);
 vm.runInContext(segment('  async function renderExcerpt(', '\n  root.FirstEditionSourceViewer'),ctx);
 assert.equal(ctx.viewingExcerpts(),true);
 const result=await ctx.renderExcerpt(1,ctx.refs[ctx.current]);
 assert.equal(ctx.current,1);assert.match(result.message,/private image.*printing is unknown.*not published/i);
 assert.match(result.status,/no public excerpt/i);assert.doesNotMatch(result.message,/loading/i);
 ctx.current=0;assert.equal(ctx.matchingRegions().length,1);
 ctx.refs.push({book:'DMG',page:239});ctx.current=2;assert.equal(ctx.viewingExcerpts(),false);
});
