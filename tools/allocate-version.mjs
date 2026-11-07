import {appendFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

// A dedicated ref is initialized separately. If it disappears, fail closed rather
// than resetting the sequence. Each commit is a reservation, not a deployment.
export const branch = 'pages-deployment-version';
export const statePath = 'deployment-version.json';

export async function allocateVersion(request, metadata, limit = 5) {
  const refPath = `/git/ref/heads/${branch}`;
  for (let attempt = 0; attempt < limit; attempt++) {
    const ref = await request('GET', refPath);
    if (ref.status !== 200 || !ref.data?.object?.sha) throw new Error('Version state branch is unavailable');
    const parent = ref.data.object.sha;
    const commit = await request('GET', `/git/commits/${parent}`);
    if (commit.status !== 200 || !commit.data?.tree?.sha) throw new Error('Could not read version state commit');
    const file = await request('GET', `/contents/${statePath}?ref=${encodeURIComponent(parent)}`);
    if (file.status !== 200 || file.data?.encoding !== 'base64') throw new Error('Could not read version state');
    let state;
    try { state = JSON.parse(Buffer.from(file.data.content, 'base64').toString('utf8')); }
    catch { throw new Error('Invalid version state'); }
    if (!Number.isSafeInteger(state.version) || state.version < 0 || state.version >= Number.MAX_SAFE_INTEGER) throw new Error('Invalid version counter');
    const version = state.version + 1;
    const next = {version, ...metadata};
    const tree = await request('POST', '/git/trees', {base_tree: commit.data.tree.sha, tree: [{path: statePath, mode: '100644', type: 'blob', content: JSON.stringify(next, null, 2) + '\n'}]});
    if (tree.status !== 201 || !tree.data?.sha) throw new Error('Could not create version state tree');
    const created = await request('POST', '/git/commits', {message: `Reserve deployment version ${version}`, tree: tree.data.sha, parents: [parent]});
    if (created.status !== 201 || !created.data?.sha) throw new Error('Could not create version reservation');
    const updated = await request('PATCH', `/git/refs/heads/${branch}`, {sha: created.data.sha, force: false});
    if (updated.status === 200) return version;
    // Retry only if another writer actually moved the branch. Do not mask a
    // permissions or branch-protection failure as a concurrency conflict.
    const current = await request('GET', refPath);
    if (current.status !== 200 || !current.data?.object?.sha || current.data.object.sha === parent) throw new Error(`Could not update version branch (HTTP ${updated.status})`);
    if (current.data.object.sha === created.data.sha) return version;
  }
  throw new Error('Version reservation contention exceeded retry limit');
}

async function main() {
  const {GITHUB_REPOSITORY: repo, GITHUB_TOKEN: token, GITHUB_RUN_ID: runId, GITHUB_RUN_ATTEMPT: attempt, GITHUB_SHA: sha, GITHUB_OUTPUT: output} = process.env;
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo || '') || !token || !/^[1-9]\d*$/.test(runId || '') || !/^[1-9]\d*$/.test(attempt || '') || !/^[a-f0-9]{40}$/i.test(sha || '') || !output) throw new Error('Missing or invalid GitHub deployment context');
  const request = async (method, path, body) => {
    const response = await fetch(`https://api.github.com/repos/${repo}${path}`, {method, headers: {'Accept':'application/vnd.github+json','Authorization':`Bearer ${token}`,'X-GitHub-Api-Version':'2022-11-28', ...(body ? {'Content-Type':'application/json'} : {})}, ...(body ? {body:JSON.stringify(body)} : {})});
    let data; try { data = await response.json(); } catch { data = {}; }
    return {status:response.status, data};
  };
  const version = await allocateVersion(request, {runId, attempt, sha:sha.toLowerCase()});
  appendFileSync(output, `version=${version}\n`);
  console.log(`Reserved deployment version ${version}`);
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();
