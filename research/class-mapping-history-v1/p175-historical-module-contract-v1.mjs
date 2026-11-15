import {createHash} from 'node:crypto';

export const P175_HISTORICAL_MODULE = Object.freeze({
  commit:'5c6a57386af372c7c0d89e342003a7edf68ca0dd',
  tree:'391026a96811e7bcf0dfcb61c3753ff708308fe1',
  path:'tools/dmg175-availability-projection.mjs',
  sha256:'4636fba4200aae83353a70e77d31762300244cc1128f956e845b194116eee1cb',
  booksPath:'dist/books.js',
  booksSha256:'99928f8e954ef213a51c70dc97d8f63b16a7b5eea9f1cba10b76b527ec17f811',
  currentSourceCommit:'2d35138027f00c0740975e519dbb3a2b6df76d14',
  currentSourceTree:'40ecb15130b339658522794db6d9e1bc58f43b50',
});

const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const check=(ok,message)=>{if(!ok)throw new Error('Invalid historical p175 module transport: '+message);};
export function assertHistoricalP175ModuleInputs({currentSummary,historicalTree,moduleBytes,historicalBooksBytes,currentBooksBytes}){
  const pin=P175_HISTORICAL_MODULE;
  check(currentSummary?.sourceCommit===pin.currentSourceCommit&&currentSummary?.sourceTree===pin.currentSourceTree,'actual fixed current source commit and tree are required');
  check(historicalTree===pin.tree,'exact historical module commit tree');
  for(const [bytes,expected,label]of [[moduleBytes,pin.sha256,'historical module'],[historicalBooksBytes,pin.booksSha256,'historical Books'],[currentBooksBytes,pin.booksSha256,'physical current Books']])
    check(Buffer.isBuffer(bytes)&&digest(bytes)===expected,label+' raw bytes changed');
  check(currentBooksBytes.equals(historicalBooksBytes),'current and historical Books bytes must be identical');
  const source=moduleBytes.toString('utf8'),specifier=['from', "'../dist/books.js'"].join(' ');
  check(source.split(specifier).length===2,'only one declared Books dependency may be relocated');
  return Object.freeze({historicalCommit:pin.commit,historicalTree:pin.tree,historicalModuleSha256:pin.sha256,booksSha256:pin.booksSha256,currentSourceCommit:pin.currentSourceCommit,currentSourceTree:pin.currentSourceTree});
}
