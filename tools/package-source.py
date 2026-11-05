#!/usr/bin/env python3
"""Static Sites fallback when the shipped site-workflow helper is unavailable.

Read source credential exclusively from hidden stdin. Never persist credentials.
"""
import json, os, subprocess, sys, tarfile
from pathlib import Path

print('Ready for source credential JSON on stdin (input is hidden).', flush=True)
if sys.stdin.isatty():
    import termios
    attrs = termios.tcgetattr(sys.stdin)
    attrs[3] &= ~termios.ECHO
    termios.tcsetattr(sys.stdin, termios.TCSANOW, attrs)
credential = json.loads(sys.stdin.readline())
root = Path(__file__).resolve().parent.parent
env = os.environ.copy()
token = credential.get('token')
if token:
    env.update(GIT_CONFIG_COUNT='1', GIT_CONFIG_KEY_0='http.extraHeader',
               GIT_CONFIG_VALUE_0='Authorization: Bearer ' + token)
env['GIT_TERMINAL_PROMPT'] = '0'
def git(*args):
    result = subprocess.run(['git', *args], cwd=root, env=env, capture_output=True, text=True)
    if result.returncode:
        print(result.stderr.replace(token, '[redacted]') if token else result.stderr, file=sys.stderr)
        raise SystemExit(result.returncode)
    return result.stdout.strip()
remotes = git('remote').splitlines()
if 'origin' in remotes:
    git('remote', 'set-url', 'origin', credential['remote_url'])
else:
    git('remote', 'add', 'origin', credential['remote_url'])
paths = ['dist', '.openai/hosting.json', '.gitignore', 'tools', 'tests', 'README.md', 'classes.json', 'rules.json', 'phb-spell-index.json', 'phb-spells.json', 'phb-magic-user-extra.json', 'ua-spell-index.json', 'ua-spells.json', 'monsters.json', 'attack-matrices.json', 'equipment.json', 'citation-overrides.json', 'progression-overrides.json']
git('add', *[path for path in paths if (root/path).exists()])
if git('status', '--porcelain'):
    git('commit', '-m', 'Publish source-anchored first edition reference')
sha = git('rev-parse', 'HEAD')
git('push', '-u', 'origin', 'HEAD:' + credential.get('branch', 'main'))
archive = Path('/tmp/first-edition-' + sha[:12] + '.tar.gz')
with tarfile.open(archive, 'w:gz') as tar:
    tar.add(root / '.openai/hosting.json', arcname='.openai/hosting.json')
    tar.add(root / 'dist', arcname='dist')
print(json.dumps({'project_id': json.loads((root/'.openai/hosting.json').read_text())['project_id'],
                  'commit_sha': sha, 'archive': str(archive)}), flush=True)
