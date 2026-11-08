import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateCitationEvidenceSeals} from './citation-evidence-seals.mjs';

const root = resolve(import.meta.dirname, '..');
const sameReference = (a, b) => a?.path === b?.path && a?.sha256 === b?.sha256;

// Sealing a finding preserves its obligation as well as its bytes. Removing a
// reference from the active manifest must not remove that finding from CI.
export function validateMonetaryFindingRegister({repoRoot = root, findingsPath = 'research/monetary-row-identity-findings.json', sealsPath = 'research/citation-evidence-seals.json'} = {}) {
  validateCitationEvidenceSeals({repoRoot, manifestPath: sealsPath});
  const seals = JSON.parse(readFileSync(resolve(repoRoot, sealsPath)));
  const manifest = JSON.parse(readFileSync(resolve(repoRoot, findingsPath)));
  if (manifest.schemaVersion !== 1 || !manifest.baseline || !Array.isArray(manifest.extensions)) throw Error('Invalid monetary finding register.');
  const documents = new Map(seals.seals.filter(seal => seal.path.startsWith('research/') && seal.path.endsWith('.json'))
    .map(seal => {
      let document;
      try { document = JSON.parse(readFileSync(resolve(repoRoot, seal.path))); } catch { document = null; }
      return [seal.path, {seal, document}];
    }));
  const baselines = [...documents.values()].filter(({document}) => document?.generatedBy === 'tools/monetary-row-identity-audit.mjs'
    && Array.isArray(document.reviewDispositions?.knownFindings) && document.reviewDispositions.knownFindings.length);
  if (baselines.length !== 1) throw Error('The monetary register requires exactly one sealed finding baseline; multiple baselines need an explicit migration.');
  const baseline = baselines[0];
  if (!sameReference(manifest.baseline, baseline.seal)) throw Error('The active monetary baseline omits or replaces the sealed finding baseline.');
  const matching = [...documents.values()].filter(({document}) => sameReference(document?.baseline, baseline.seal));
  const requiredExtensions = matching.filter(({document}) => Array.isArray(document.knownFindings));
  const requiredUncertainties = matching.filter(({document}) => Array.isArray(document.uncertainties));
  const refs = new Map();
  for (const ref of manifest.extensions) {
    if (refs.has(ref.path)) throw Error(`Duplicate active monetary finding extension: ${ref.path}`);
    refs.set(ref.path, ref);
    const registered = requiredExtensions.find(({seal}) => sameReference(seal, ref));
    if (!registered) throw Error(`Monetary finding extension is unsealed or differs from its sealed source finding: ${ref.path}`);
  }
  for (const {seal} of requiredExtensions) {
    if (!sameReference(refs.get(seal.path), seal)) throw Error(`Active monetary register omits sealed source findings: ${seal.path}`);
  }
  if (requiredUncertainties.length > 1) throw Error('Multiple sealed uncertainty registers need an explicit migration.');
  for (const {seal} of requiredUncertainties) {
    if (!sameReference(manifest.retainedUncertainties, seal)) throw Error(`Active monetary register omits sealed source uncertainties: ${seal.path}`);
  }
  if (manifest.retainedUncertainties && !requiredUncertainties.some(({seal}) => sameReference(seal, manifest.retainedUncertainties))) throw Error('Active monetary uncertainties are not sealed.');
  const findings = [...baseline.document.reviewDispositions.knownFindings, ...requiredExtensions.flatMap(({document}) => document.knownFindings)];
  const ids = findings.map(finding => finding.id);
  if (ids.some(id => typeof id !== 'string' || !id) || new Set(ids).size !== ids.length) throw Error('Sealed monetary findings contain missing or duplicate IDs.');
  return {status: 'pass', scope: 'Sealed finding-register membership and identity only; source repairs and semantic review remain separate.', baseline: manifest.baseline, sealedEvidenceFiles: seals.seals.length, sourceFindingExtensions: requiredExtensions.length, knownFindings: findings.length, retainedUncertainties: requiredUncertainties.reduce((n, {document}) => n + document.uncertainties.length, 0), sourceSemanticsCertified: false};
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.slice(2).join(' ') !== '--check') throw Error('Usage: node tools/monetary-findings-register.mjs --check');
    console.log(JSON.stringify(validateMonetaryFindingRegister()));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
