import { readFileSync } from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { createApiClient, resolveLocalBase, shotFormat, saveScreenshot } from './common.js';
import { wantsAnalysis, finishShot, finishFrames } from './image_tools.js';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = dirname(dirname(SCRIPT_DIR));

const { call, login } = createApiClient(PROJECT_ROOT);

const [,, baseArg, cmd, ...args] = process.argv;

if (!baseArg || !baseArg.startsWith('http')) {
    console.error('Usage: node ai/tool/browser.js <base-url> <cmd> [args]');
    console.error('  node ai/tool/browser.js http://localhost:7000 login');
    console.error('  node ai/tool/browser.js http://localhost:7000 push <url> [ttl=600] [logSize=100] [width=1280] [height=720] [captureConsole=1]');
    console.error('  node ai/tool/browser.js http://localhost:7000 reset <sid> [ttl] [logSize] [width] [height]');
    console.error('  node ai/tool/browser.js http://localhost:7000 screenshot <sid> [options_json] [name]   # {"format":"png|jpeg","quality","clip":{x,y,width,height},"fullPage","avg":true,"diff":"<ref>"} → temp/<name>.png|jpg + JSON');
    console.error('  node ai/tool/browser.js http://localhost:7000 record <sid> [options_json] [name]   # {"duration","frames","interval","times":[ms..],"inputs":[{at,key,time,focus,points}],"clip","format","mode":"auto|screencast|shot","avg","diff":"prev|<ref>"} → temp/<name>_NNN.png|jpg + JSON');
    console.error('  node ai/tool/browser.js http://localhost:7000 input <sid> <key|mouseButton> <time_ms> <focus> [x y [x2 y2]]   # focus = canvas | page | none | -');
    console.error('  node ai/tool/browser.js http://localhost:7000 exec <sid> <fn> [args_json]');
    console.error('  node ai/tool/browser.js http://localhost:7000 eval <sid> <js_expression>');
    console.error('  node ai/tool/browser.js http://localhost:7000 eval_stdin <sid>');
    console.error('  node ai/tool/browser.js http://localhost:7000 eval_base64 <sid> <base64_js_expression>');
    console.error('  node ai/tool/browser.js http://localhost:7000 logs <sid> [fromOffset=0]');
    console.error('  node ai/tool/browser.js http://localhost:7000 list');
    console.error('  node ai/tool/browser.js http://localhost:7000 remove <sid>');
    process.exit(1);
}

const base = await resolveLocalBase(baseArg.replace(/\/$/, ''));

if (cmd === 'login') {
    // 비밀번호를 인자로 줄 수 있다. 생략하면 settings.json 값을 쓴다
    const r = args[0] ? await login(base, args[0]) : await login(base);
    console.log(r.ok ? (r.reused ? 'ok (reused)' : 'ok') : `fail: ${r.msg ?? 'unknown'}`);

} else if (cmd === 'push') {
    const [url, ttl = '600', logSize = '100', width = '1280', height = '720', captureConsole = '1'] = args;
    if (!url) { console.error('Usage: push <url> [ttl] [logSize] [width] [height] [captureConsole]'); process.exit(1); }
    const r = await call(base, 'PlayWright/push', { url, ttl, logSize, width, height, captureConsole: captureConsole !== '0' });
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
        const pwArgs = JSON.parse(argsJson);
        console.log(`Screenshot saved to ${saveScreenshot(r.result.data, shotFormat(pwArgs[0]?.type))}`);
    } else {
        console.log(JSON.stringify(r, null, 2));
    }

} else if (cmd === 'screenshot') {
    const [sid, ...rest] = args;
    if (!sid) { console.error('Usage: screenshot <sid> [options_json] [name]'); process.exit(1); }
    const hasOpts = rest[0]?.trim().startsWith('{');
    const { format: fmtArg, type, monitor, avg, diff, ...pwOpts } = hasOpts ? JSON.parse(rest[0]) : {};
    const name = (hasOpts ? rest[1] : rest[0]) || 'screenshot';
    const analysis = { avg, diff };
    // 분석은 무손실로만 한다 — jpeg 압축 노이즈가 diff 영역/avg 값을 오염시킨다.
    const format = wantsAnalysis(analysis) ? 'png' : shotFormat(fmtArg ?? type);
    pwOpts.type = format;
    if (format === 'png') delete pwOpts.quality;
    const r = await call(base, 'PlayWright/screenshot', { sessionId: sid, args: [pwOpts] });
    if (r.ok && r.result && r.result.data) {
        console.log(JSON.stringify(finishShot(r.result.data, format, name, analysis, pwOpts.clip)));
    } else {
        console.log(JSON.stringify(r, null, 2));
    }

} else if (cmd === 'record') {
    const [sid, ...rest] = args;
    if (!sid) { console.error('Usage: record <sid> [options_json] [name]'); process.exit(1); }
    const hasOpts = rest[0]?.trim().startsWith('{');
    const { avg, diff, format: fmtArg, type, inputs = [], ...opts } = hasOpts ? JSON.parse(rest[0]) : {};
    const name = (hasOpts ? rest[1] : rest[0]) || 'record';
    const analysis = { avg, diff };
    const format = wantsAnalysis(analysis) ? 'png' : shotFormat(fmtArg ?? type);
    const normInputs = inputs.map((inp) => ({ ...inp, focus: !inp.focus || inp.focus === '-' ? 'canvas' : inp.focus }));
    const r = await call(base, 'PlayWright/record', { ...opts, sessionId: sid, format, inputs: normInputs });
    console.log(JSON.stringify(r.ok && r.frames ? finishFrames(r, name, analysis, opts.clip) : r));

} else if (cmd === 'input') {
    const [sid, key, timeArg, focusArg = '-', ...pointArgs] = args;
    const focus = focusArg === '-' ? 'canvas' : focusArg;
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
    console.error('Commands: login, push, reset, exec, screenshot, record, input, eval, eval_stdin, eval_base64, logs, list, remove');
    process.exit(1);
}
