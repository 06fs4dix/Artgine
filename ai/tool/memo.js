import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createApiClient, login } from './common.js';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = dirname(dirname(SCRIPT_DIR));
const COOKIE_FILE = join(SCRIPT_DIR, 'memo_cookie.txt');

const { call } = createApiClient(COOKIE_FILE);

const [, , baseArg, cmd, ...rest] = process.argv;

function usageAndExit() {
    console.error('Usage: node ai/tool/memo.js <base-url> login');
    console.error('       node ai/tool/memo.js <base-url> w <text>   (저장)');
    console.error('       node ai/tool/memo.js <base-url> r <text>   (검색)');
    process.exit(1);
}

if (!baseArg || !baseArg.startsWith('http') || !cmd) usageAndExit();

const base = baseArg.replace(/\/$/, '');

if (cmd === 'login') {
    const r = await login(call, base, PROJECT_ROOT);
    console.log(r.ok ? 'ok' : `fail: ${r.msg ?? 'unknown'}`);

} else if (cmd === 'w' || cmd === 'r') {
    const text = rest.join(' ').trim();
    if (!text) usageAndExit();
    const r = await call(base, 'Memo/Chat', { text, mode: cmd === 'w' ? 'write' : 'read' });
    console.log(r.ok ? r.result : `fail: ${r.msg ?? 'unknown'}`);

} else {
    usageAndExit();
}
