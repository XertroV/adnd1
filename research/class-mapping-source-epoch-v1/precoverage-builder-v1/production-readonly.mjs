// Explicit filesystem adapter for unchanged production library functions.
// No write or child-process APIs are imported or invoked by this adapter.
import {readFileSync, readdirSync, statSync, realpathSync, existsSync} from 'node:fs';
import {dirname, isAbsolute, relative, resolve, sep} from 'node:path';
import {pathToFileURL} from 'node:url';
import {SOURCE_PARTS, RELEASE_SEED, assertProductionDeclarations, sha256} from './source-body.mjs';

export function inside(root, path) {
  if (typeof path !== 'string' || !path || isAbsolute(path) || path.includes('\\')) throw new Error('Expected a relative repository path');
  const absolute = resolve(root, path), rel = relative(root, absolute);
  if (rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) throw new Error('Path escapes repository root');
  return absolute;
}

function localImportClosure(root, seeds) {
  const queue = [...seeds], rows = new Map();
  while (queue.length) {
    const rel = queue.shift();
    if (rows.has(rel)) continue;
    const bytes = readFileSync(inside(root, rel)), text = bytes.toString('utf8');
    rows.set(rel, {path:rel,sha256:sha256(bytes),sizeBytes:bytes.length});
    for (const match of text.matchAll(/(?:from\s*|import\s*\(\s*|require\s*\(\s*)['"](\.{1,2}\/[^'"]+)['"]/g)) {
      const absolute = resolve(dirname(inside(root, rel)), match[1]);
      const child = relative(root, absolute).split(sep).join('/');
      if (!child.startsWith('../') && existsSync(absolute) && /\.(?:mjs|js)$/.test(child)) queue.push(child);
    }
  }
  return [...rows.values()].sort((a,b) => a.path.localeCompare(b.path));
}

export async function loadProductionReadOnly(repoRoot) {
  const root = realpathSync(resolve(repoRoot));
  // Production buildSourcePageCensuses() calls existsSync on relative census
  // paths. Preserve its real invocation context rather than silently omitting
  // three source censuses when a caller launches from another directory.
  if (realpathSync(process.cwd()) !== root) {
    throw new Error('Production pre-coverage calls require cwd to equal the physical repo root (relative source-census existence checks)');
  }
  const directReads = new Map();
  const readBytes = path => {
    const absolute = inside(root, path), bytes = readFileSync(absolute), stat = statSync(absolute);
    directReads.set(path, {path,sha256:sha256(bytes),sizeBytes:bytes.length,device:stat.dev,inode:stat.ino});
    return bytes;
  };
  // Match production's optional authored part loader exactly, including {}.
  const readJson = path => existsSync(inside(root, path)) ? JSON.parse(readBytes(path).toString('utf8')) : {};
  const assembleSource = readBytes('tools/assemble.mjs').toString('utf8');
  const alignment = assertProductionDeclarations(assembleSource);
  const modulePaths = ['tools/scan-catalog.mjs','tools/price-source-inventory.mjs','tools/published-continuations.mjs','tools/citation-override-identity.mjs','dist/books.js'];
  const moduleClosure = localImportClosure(root, modulePaths);
  const forbidden = /(?:mm-current-source-gate|closed-version29-reader|source-postmetadata-facade|coverage-gaps|refresh-gaps-handoff)/;
  if (moduleClosure.some(row => forbidden.test(row.path))) throw new Error('Production pre-coverage import closure reaches an eager or coverage/handoff dependency');
  const [scan, inventory, publisher, overrides, booksModule] = await Promise.all(
    modulePaths.map(path => import(pathToFileURL(inside(root, path)).href)),
  );
  const books = booksModule.default;
  const catalogs = new Map();
  const scanCatalogs = (directory, prefix = 'scans') => {
    if (!existsSync(directory)) return;
    // Preserve production readdir order; source catalog resolution uses its map.
    for (const entry of readdirSync(directory, {withFileTypes:true})) {
      const full = resolve(directory, entry.name);
      if (entry.isDirectory()) scanCatalogs(full, `${prefix}/${entry.name}`);
      else if (entry.isFile() && entry.name.endsWith('.json')) {
        const path = `dist/${prefix}/${entry.name}`;
        try { catalogs.set(`${prefix}/${entry.name}`, JSON.parse(readBytes(path).toString('utf8'))); }
        catch (error) { if (!(error instanceof SyntaxError)) throw error; }
      }
    }
  };
  scanCatalogs(inside(root, 'dist/scans'));
  const inputs = {
    parts:SOURCE_PARTS.map(readJson), citations:readJson('citation-overrides.json'),
    progression:readJson('progression-overrides.json'), release:structuredClone(RELEASE_SEED),
    manualBindings:readJson('research/field-evidence-bindings.json'),
    sourceVisualReviews:readJson('research/source-visual-reviews.json'),
    continuationManifest:readJson('research/citation-continuations.json'),
  };
  const runtime = {
    scan, inventory, publisher, overrides, books, catalogs,
    catalogRoot:inside(root, 'dist'),
    catalogFor:path => {
      const catalog = catalogs.get(path);
      if (!catalog) throw new Error(`Missing current catalog ${path}`);
      return catalog;
    },
    readImage:(catalogPath, image) => readBytes(relative(root, resolve(inside(root, 'dist'), dirname(catalogPath), image)).split(sep).join('/')),
  };
  return {
    root, inputs, runtime,
    provenance: {
      assembler:{path:'tools/assemble.mjs',sha256:sha256(Buffer.from(assembleSource)),...alignment},
      moduleClosure,
      moduleClosureScope:'Static relative imports and literal require/import references, plus books.js; not a full trace of production filesystem reads',
      eagerMmOrCoverageImportsFound:false,
      directProductionImports:modulePaths,
      productionReadBoundary:'Price inventory and continuation validation retain module-relative filesystem/evidence reads. Injected parts/manual/catalog snapshots alone do not virtualize those reads or qualify an unmaterialized next candidate.',
    },
    snapshotDirectReads:() => [...directReads.values()].sort((a,b) => a.path.localeCompare(b.path)),
    assertDirectReadsUnchanged:() => {
      for (const row of directReads.values()) {
        const absolute = inside(root,row.path), bytes = readFileSync(absolute), stat = statSync(absolute);
        if (bytes.length !== row.sizeBytes || sha256(bytes) !== row.sha256 || stat.dev !== row.device || stat.ino !== row.inode) throw new Error(`Direct production input changed during verification: ${row.path}`);
      }
      for (const row of moduleClosure) {
        const bytes = readFileSync(inside(root,row.path));
        if (bytes.length !== row.sizeBytes || sha256(bytes) !== row.sha256) throw new Error(`Production module changed during verification: ${row.path}`);
      }
      return true;
    },
  };
}
