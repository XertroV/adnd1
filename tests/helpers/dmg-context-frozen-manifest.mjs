import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
// Exact Git b90d317 manifest. These historical checks remain190-group checks.
export const dmgContextBefore = JSON.parse(gunzipSync(readFileSync(new URL('../fixtures/dmg-context-three-chains-b90d317-before.json.gz',import.meta.url))));
export const frozenDmgBeforeManifest = JSON.parse(dmgContextBefore.files['research/citation-continuations.json'].utf8);
