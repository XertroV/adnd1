import {readFileSync, writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const start = '<!-- BUILD DETAILS START -->';
const end = '<!-- BUILD DETAILS END -->';
const mobileStart = '<!-- MOBILE BUILD DETAILS START -->';
const mobileEnd = '<!-- MOBILE BUILD DETAILS END -->';
const metadataPath = fileURLToPath(new URL('./build-metadata.json', import.meta.url));

function fillPlaceholder(html, opening, closing, replacement, {required = false} = {}) {
  const first = html.indexOf(opening), last = html.indexOf(closing);
  if (!required && first < 0 && last < 0) return html;
  if (first < 0 || last < first || html.indexOf(opening, first + opening.length) !== -1 || html.indexOf(closing, last + closing.length) !== -1) {
    throw new Error(`Expected exactly one ${required ? 'build details' : 'mobile build details'} placeholder`);
  }
  return html.slice(0, first + opening.length) + replacement + html.slice(last);
}

export function buildMetadata(sha, now = new Date()) {
  if (!/^[a-f0-9]{40}$/i.test(sha || '') || !Number.isFinite(now.getTime())) throw new Error('Valid commit SHA and build time are required');
  return {sha:sha.toLowerCase(), builtAt:now.toISOString()};
}

export function stampBuild(html, metadata, version) {
  const {sha, builtAt} = metadata || {};
  if (!/^[a-f0-9]{40}$/.test(sha || '') || !/^[1-9]\d*$/.test(version || '') || !Number.isSafeInteger(Number(version)) || typeof builtAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(builtAt) || !Number.isFinite(Date.parse(builtAt)) || new Date(builtAt).toISOString() !== builtAt) {
    throw new Error('Valid build metadata and deployment version are required');
  }
  const displayTime = builtAt.replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC');
  const details = classes => `<div class="build-details${classes ? ` ${classes}` : ''}" aria-label="Build details"><span>Version ${version} · ${sha.slice(0, 7)}</span><time datetime="${builtAt}">Built ${displayTime}</time></div>`;
  const withSidebarDetails = fillPlaceholder(html, start, end, details(''), {required:true});
  return fillPlaceholder(withSidebarDetails, mobileStart, mobileEnd, details('mobile-footer-build'));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  if (process.argv[2] === '--capture') writeFileSync(metadataPath, JSON.stringify(buildMetadata(process.env.GITHUB_SHA)) + '\n');
  else {
    const metadata = JSON.parse(readFileSync(metadataPath, 'utf8'));
    if (metadata.sha !== process.env.GITHUB_SHA?.toLowerCase()) throw new Error('Build artifact commit does not match deployment commit');
    const path = fileURLToPath(new URL('../dist/index.html', import.meta.url));
    writeFileSync(path, stampBuild(readFileSync(path, 'utf8'), metadata, process.env.DEPLOYMENT_VERSION));
  }
}
