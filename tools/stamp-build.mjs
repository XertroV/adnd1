import {readFileSync, writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const start = '<!-- BUILD DETAILS START -->';
const end = '<!-- BUILD DETAILS END -->';

// A workflow run/attempt identifies an artifact, not a count of successful deployments.
export function stampBuild(html, env, now = new Date()) {
  const {GITHUB_SHA: sha, GITHUB_RUN_NUMBER: run, GITHUB_RUN_ATTEMPT: attempt} = env;
  if (!/^[a-f0-9]{40}$/i.test(sha || '') || !/^[1-9]\d*$/.test(run || '') || !/^[1-9]\d*$/.test(attempt || '') || !Number.isFinite(now.getTime())) {
    throw new Error('Valid GitHub SHA, run number, run attempt and build time are required');
  }
  const first = html.indexOf(start), last = html.indexOf(end);
  if (first < 0 || last < first || html.indexOf(start, first + start.length) !== -1 || html.indexOf(end, last + end.length) !== -1) {
    throw new Error('Expected exactly one build details placeholder');
  }
  const iso = now.toISOString();
  const displayTime = iso.replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC');
  const details = `<div class="build-details" aria-label="Build details"><span>Version ${run}.${attempt} · ${sha.slice(0, 7).toLowerCase()}</span><time datetime="${iso}">Built ${displayTime}</time></div>`;
  return html.slice(0, first + start.length) + details + html.slice(last);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const path = fileURLToPath(new URL('../dist/index.html', import.meta.url));
  writeFileSync(path, stampBuild(readFileSync(path, 'utf8'), process.env));
}
