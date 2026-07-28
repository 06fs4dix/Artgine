import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { createApiClient, resolveLocalBase } from './common.js';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = dirname(dirname(SCRIPT_DIR));

const { call, get, login } = createApiClient(PROJECT_ROOT);

const [baseArg, cmd, ...rest] = process.argv.slice(2);

function usageAndExit() {
    console.error('Usage: node ai/tool/messenger.js <base-url> login');
    console.error('       node ai/tool/messenger.js <base-url> list                                   (등록된 메신저 세션 목록, 연결된 termToken/termKey 포함)');
    console.error('       node ai/tool/messenger.js <base-url> log <sessionId> [limit]                 (대화 로그, 기본 50)');
    console.error('       node ai/tool/messenger.js <base-url> send <sessionId> <from> <message...>    (메시지 발송)');
    console.error('       node ai/tool/messenger.js <base-url> link <termToken> <sessionId>            (터미널에 메신저 연결)');
    console.error('       node ai/tool/messenger.js <base-url> unlink <termToken>                      (터미널-메신저 연결 해제)');
    console.error('       node ai/tool/messenger.js <base-url> whoami <key>                             (해당 key 세션의 termToken 조회, 자기 자신을 link할 때 사용)');
    process.exit(1);
}

if (!baseArg || !baseArg.startsWith('http') || !cmd) usageAndExit();

const base = await resolveLocalBase(baseArg.replace(/\/$/, ''));

function printResult(r, okKey) {
    console.log(r.ok ? JSON.stringify(okKey ? (r[okKey] ?? r) : r) : `fail: ${r.msg ?? 'unknown'}`);
}

if (cmd === 'login') {
    const r = await login(base);
    console.log(r.ok ? (r.reused ? 'ok (reused)' : 'ok') : `fail: ${r.msg ?? 'unknown'}`);

} else if (cmd === 'list') {
    const r = await get(base, 'messenger/list');
    printResult(r, 'sessions');

} else if (cmd === 'log') {
    const [sessionId, limit] = rest;
    if (!sessionId) usageAndExit();
    const r = await get(base, 'messenger/log', { sessionId, limit });
    printResult(r, 'log');

} else if (cmd === 'send') {
    const [sessionId, from, ...msgParts] = rest;
    const message = msgParts.join(' ').trim();
    if (!sessionId || !from || !message) usageAndExit();
    const r = await call(base, 'messenger/send', { sessionId, from, message });
    printResult(r);

} else if (cmd === 'link') {
    const [termToken, sessionId] = rest;
    if (!termToken || !sessionId) usageAndExit();
    const r = await call(base, `messenger/link?termToken=${encodeURIComponent(termToken)}&sessionId=${encodeURIComponent(sessionId)}`, {});
    printResult(r);

} else if (cmd === 'unlink') {
    const [termToken] = rest;
    if (!termToken) usageAndExit();
    const r = await call(base, `messenger/unlink?termToken=${encodeURIComponent(termToken)}`, {});
    printResult(r);

} else if (cmd === 'whoami') {
    const [key] = rest;
    if (!key) usageAndExit();
    const r = await get(base, 'cmd/sessions');
    if (!r.ok) { console.log(`fail: ${r.msg ?? 'unknown'}`); }
    else {
        const matches = (r.sessions ?? []).filter((s) => s.key === key);
        const found = matches.sort((a, b) => b.createdAt - a.createdAt)[0];
        console.log(found ? found.token : 'fail: session not found');
    }

} else {
    usageAndExit();
}
