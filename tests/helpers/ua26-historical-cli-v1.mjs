// Finite test-only command transport; no generic command or root selector.
import {execFileSync as nodeExecFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {types} from 'node:util';
import {controlledGitEnvironment} from '../../tools/class-mapping-raw-git-v1.mjs';

const root = resolve(import.meta.dirname, '../..');
const originalCommand = 'tools/ua26-note-marker-audit-mm-v1.mjs';
const replayCommand = 'research/class-mapping-history-v1/replay-tools/ua26-note-marker-audit-mm-s1-v1.mjs';
const fail = () => { throw new Error('Only the exact historical UA26 CLI call under current S1 is supported'); };

export function validateHistoricalUa26Command(file, args, options) {
  if (arguments.length !== 3 || file !== process.execPath) fail();
  if (!args || types.isProxy(args) || !Array.isArray(args) || Object.getPrototypeOf(args) !== Array.prototype) fail();
  const argumentDescriptors = Object.getOwnPropertyDescriptors(args);
  if (Reflect.ownKeys(argumentDescriptors).sort().join('|') !== '0|length') fail();
  if (!Object.hasOwn(argumentDescriptors[0], 'value') || argumentDescriptors[0].value !== originalCommand
      || argumentDescriptors.length.value !== 1) fail();
  if (!options || types.isProxy(options) || (Object.getPrototypeOf(options) !== Object.prototype && Object.getPrototypeOf(options) !== null)) fail();
  const descriptors = Object.getOwnPropertyDescriptors(options);
  if (Reflect.ownKeys(descriptors).sort().join('|') !== 'cwd|encoding|maxBuffer') fail();
  for (const descriptor of Object.values(descriptors)) if (!Object.hasOwn(descriptor, 'value')) fail();
  if (descriptors.cwd.value !== root || descriptors.encoding.value !== 'utf8' || descriptors.maxBuffer.value !== 16 * 1024 * 1024) fail();
  return Object.freeze({root, replayCommand});
}

export function execFileSync(file, args, options) {
  if (arguments.length !== 3) fail();
  const command = validateHistoricalUa26Command(file, args, options);
  return nodeExecFileSync(process.execPath, [command.replayCommand], {
    cwd: command.root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024,
    env: controlledGitEnvironment(),
  });
}
