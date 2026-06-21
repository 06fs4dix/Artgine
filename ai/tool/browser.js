import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createApiClient, login } from './common.js';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = dirname(dirname(SCRIPT_DIR));
const COOKIE_FILE = join(SCRIPT_DIR, 'browser_cookie.txt');

const { call } = createApiClient(COOKIE_FILE);

const [,, baseArg, cmd, ...args] = process.argv;

if (!baseArg || !baseArg.startsWith('http')) {
    console.error('Usage: node ai/browser.js <base-url> <cmd> [args]');
    console.error('  node ai/browser.js http://localhost:7000 login');
    console.error('  node ai/browser.js http://localhost:7000 push <url> [ttl=600] [logSize=100] [width=1280] [height=720]');
    console.error('  node ai/browser.js http://localhost:7000 reset <sid> [ttl] [logSize] [width] [height]');
    console.error('  node ai/browser.js http://localhost:7000 exec <sid> <fn> [args_json]');
    console.error('  node ai/browser.js http://localhost:7000 screenshot <sid> [options_json]');
    console.error('  node ai/browser.js http://localhost:7000 input <sid> <key|mouseButton> <time_ms> <focus> [x y [x2 y2]]');
    console.error('  node ai/browser.js http://localhost:7000 eval <sid> <js_expression>');
    console.error('  node ai/browser.js http://localhost:7000 eval_stdin <sid>');
    console.error('  node ai/browser.js http://localhost:7000 eval_base64 <sid> <base64_js_expression>');
    console.error('  node ai/browser.js http://localhost:7000 logs <sid> [fromOffset=0]');
    console.error('  node ai/browser.js http://localhost:7000 list');
    console.error('  node ai/browser.js http://localhost:7000 remove <sid>');
    process.exit(1);
}

const base = baseArg.replace(/\/$/, '');

if (cmd === 'login') {
    const r = await login(call, base, PROJECT_ROOT);
    console.log(r.ok ? 'ok' : `fail: ${r.msg ?? 'unknown'}`);

} else if (cmd === 'push') {
    const [url, ttl = '600', logSize = '100', width = '1280', height = '720'] = args;
    if (!url) { console.error('Usage: push <url> [ttl] [logSize] [width] [height]'); process.exit(1); }
    const r = await call(base, 'PlayWright/push', { url, ttl, logSize, width, height });
    console.log(r.ok ? r.sessionId : `fail: ${r.msg ?? 'unknown'}`);

} else if (cmd === 'reset') {
    const [sid, ttl = '600', logSize = '100', width, height] = args;
    if (!sid) { console.error('Usage: reset <sid> [ttl] [logSize] [width] [height]'); process.exit(1); }
    const r = await call(base, 'PlayWright/reset', { sessionId: sid, ttl, logSize, width, height });
    console.log(JSON.stringify(r, null, 2));

} else if (cmd === 'exec') {
    const [sid, fn, argsJson = '[]'] = args;
    if (!sid || !fn) { console.error('Usage: exec <sid> <fn> [args_json]'); process.exit(1); }
    const r = await call(base, 'PlayWright/exec', { sessionId: sid, fn, args: JSON.parse(argsJson) });
    if (fn === 'screenshot' && r.ok && r.result && r.result.data) {
        writeFileSync('screenshot.png', Buffer.from(r.result.data, 'base64'));
        console.log('Screenshot saved to screenshot.png');
    } else {
        console.log(JSON.stringify(r, null, 2));
    }

} else if (cmd === 'screenshot') {
    const [sid, optionsJson] = args;
    if (!sid) { console.error('Usage: screenshot <sid> [options_json]'); process.exit(1); }
    const opts = optionsJson ? JSON.parse(optionsJson) : {};
    const r = await call(base, 'PlayWright/screenshot', { sessionId: sid, args: [opts] });
    if (r.ok && r.result && r.result.data) {
        writeFileSync('screenshot.png', Buffer.from(r.result.data, 'base64'));
        console.log('Screenshot saved to screenshot.png');
    } else {
        console.log(JSON.stringify(r, null, 2));
    }

} else if (cmd === 'input') {
    const [sid, key, timeArg, focus = 'canvas', ...pointArgs] = args;
    if (!sid || !key || !timeArg) {
        console.error('Usage: input <sid> <key|mouseButton> <time_ms> <focus> [x y [x2 y2]]');
        process.exit(1);
    }
    const time = parseInt(timeArg, 10);
    const points = pointArgs.map((v) => Number(v));
    if (!Number.isFinite(time) || time < 0 || points.some((v) => !Number.isFinite(v)) || (points.length !== 0 && points.length !== 2 && points.length !== 4)) {
        console.error('Usage: input <sid> <key|mouseButton> <time_ms> <focus> [x y [x2 y2]]');
        process.exit(1);
    }
    const r = await call(base, 'PlayWright/input', { sessionId: sid, time, key, focus, points });
    console.log(JSON.stringify(r, null, 2));

} else if (cmd === 'list') {
    const r = await call(base, 'PlayWright/list');
    console.log(JSON.stringify(r, null, 2));

} else if (cmd === 'logs') {
    const [sid, fromOffset = '0'] = args;
    if (!sid) { console.error('Usage: logs <sid> [fromOffset]'); process.exit(1); }
    const r = await call(base, 'PlayWright/logs', { sessionId: sid, fromOffset: parseInt(fromOffset, 10) });
    console.log(JSON.stringify(r, null, 2));

} else if (cmd === 'eval') {
    const [sid, ...exprParts] = args;
    if (!sid || exprParts.length === 0) { console.error('Usage: eval <sid> <js_expression>'); process.exit(1); }
    const expr = exprParts.join(' ');
    const r = await call(base, 'PlayWright/eval', { sessionId: sid, expr });
    console.log(JSON.stringify(r, null, 2));

} else if (cmd === 'eval_stdin') {
    const [sid] = args;
    if (!sid) { console.error('Usage: eval_stdin <sid>'); process.exit(1); }
    const expr = readFileSync(0, 'utf8');
    if (expr.length === 0) { console.error('Usage: eval_stdin <sid> < stdin_js_expression'); process.exit(1); }
    const r = await call(base, 'PlayWright/eval', { sessionId: sid, expr });
    console.log(JSON.stringify(r, null, 2));

} else if (cmd === 'eval_base64') {
    const [sid, ...encodedParts] = args;
    if (!sid || encodedParts.length === 0) { console.error('Usage: eval_base64 <sid> <base64_js_expression>'); process.exit(1); }
    const expr = Buffer.from(encodedParts.join(''), 'base64').toString('utf8');
    const r = await call(base, 'PlayWright/eval', { sessionId: sid, expr });
    console.log(JSON.stringify(r, null, 2));

} else if (cmd === 'remove') {
    const [sid] = args;
    if (!sid) { console.error('Usage: remove <sid>'); process.exit(1); }
    const r = await call(base, 'PlayWright/remove', { sessionId: sid });
    console.log(JSON.stringify(r));

} else {
    console.error(`Unknown command: ${cmd}`);
    console.error('Commands: login, push, reset, exec, screenshot, input, eval, eval_stdin, eval_base64, logs, list, remove');
    process.exit(1);
}
