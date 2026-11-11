import {accessSync,constants,lstatSync,realpathSync} from 'node:fs';
import path from 'node:path';
import {controlledGitEnvironment} from './class-mapping-raw-git-v1.mjs';

const INLINE_SCRIPT_DECLARATION=/^[ \t]*script[ \t]*=[ \t]*"""([\s\S]*?)"""[ \t]*$/gm;
const INLINE_NODE_INVOCATION=/subprocess\.run\s*\(\s*\[\s*"node"\s*,\s*"--input-type=module"\s*,\s*"-e"\s*,\s*script\s*\]\s*,\s*cwd\s*=\s*root\s*,\s*capture_output\s*=\s*True\s*,\s*text\s*=\s*True\s*\)/g;
const NODE_COMMAND_PREFIX=/subprocess\.run\s*\(\s*\[\s*["']node["']/g;
const MECHANICS_IMPORT=/^[ \t]*import\s*\{\s*fieldsFor\s*\}\s*from\s*['"]\.\/tools\/mechanics-audit\.mjs['"][ \t]*;[ \t]*$/m;
const REPORT_SUBPROCESS_ENV_KEYS=Object.freeze([
  'GIT_CONFIG_GLOBAL','GIT_CONFIG_NOSYSTEM','GIT_CONFIG_SYSTEM','GIT_NO_LAZY_FETCH',
  'GIT_NO_REPLACE_OBJECTS','GIT_OPTIONAL_LOCKS','GIT_TERMINAL_PROMPT','LANG','LC_ALL','PATH',
]);

// Admit only the actual typed Python edge: a triple-quoted inline Node module,
// imported with the exact argv vector used by continuation-candidates.
export function matchesTypedInlineNodeMechanicsEdge(source) {
  if(typeof source!=='string')return false;
  const declarations=[...source.matchAll(INLINE_SCRIPT_DECLARATION)];
  const assignments=[...source.matchAll(/^[ \t]*script[ \t]*(?:\+=|=(?!=))/gm)];
  const nodeCommands=[...source.matchAll(NODE_COMMAND_PREFIX)];
  const invocations=[...source.matchAll(INLINE_NODE_INVOCATION)];
  if(declarations.length!==1||assignments.length!==1||nodeCommands.length!==1||invocations.length!==1)return false;
  return MECHANICS_IMPORT.test(declarations[0][1]);
}

export function validateReportPythonExecutable(value) {
  if(typeof value!=='string'||!path.isAbsolute(value)||path.resolve(value)!==value) {
    throw new TypeError('report Python executable must be an absolute normalized path');
  }
  let physicalPath,stat;
  try { physicalPath=realpathSync(value);stat=lstatSync(physicalPath); }
  catch { throw new TypeError('report Python executable must resolve to an existing regular executable file'); }
  if(!stat.isFile()||stat.isSymbolicLink()||realpathSync(physicalPath)!==physicalPath) {
    throw new TypeError('report Python executable must resolve to a physical regular file');
  }
  try { accessSync(physicalPath,constants.X_OK); }
  catch { throw new TypeError('report Python executable is not executable'); }
  return physicalPath;
}

export function buildReportSubprocessEnvironment(pythonExecutable) {
  const python=validateReportPythonExecutable(pythonExecutable);
  const controlled=controlledGitEnvironment();
  const keys=Object.keys(controlled).sort();
  if(JSON.stringify(keys)!==JSON.stringify(REPORT_SUBPROCESS_ENV_KEYS.filter(key=>key!=='PATH').sort().concat('PATH').sort())) {
    throw new Error('controlled Git environment keys differ from the fixed report subprocess whitelist');
  }
  const nodeDirectory=path.dirname(process.execPath),nodeCommand=path.join(nodeDirectory,'node');
  let parentNodeTarget,childNodeTarget;
  try { parentNodeTarget=realpathSync(process.execPath);childNodeTarget=realpathSync(nodeCommand);accessSync(childNodeTarget,constants.X_OK); }
  catch { throw new Error('continuation child Node command is unavailable beside the parent Node runtime'); }
  if(parentNodeTarget!==childNodeTarget)throw new Error('continuation child `node` would not resolve to the parent Node runtime');
  const searchPath=[...new Set([
    nodeDirectory,
    path.dirname(python),
    '/usr/bin',
    '/bin',
  ])].join(path.delimiter);
  return {...controlled,PATH:searchPath};
}
