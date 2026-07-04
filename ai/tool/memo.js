import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createApiClient, login } from './common.js';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = dirname(dirname(SCRIPT_DIR));
const COOKIE_FILE = join(SCRIPT_DIR, 'memo_cookie.txt');

const { call, get } = createApiClient(COOKIE_FILE);

const [, , baseArg, cmd, ...rest] = process.argv;

function usageAndExit() {
    console.error('Usage: node ai/tool/memo.js <base-url> login');
    console.error('       node ai/tool/memo.js <base-url> cats                          (카테고리 목록)');
    console.error('       node ai/tool/memo.js <base-url> addcat <name> [parentId]       (카테고리 추가)');
    console.error('       node ai/tool/memo.js <base-url> delcat <id>                    (카테고리 삭제, cascade)');
    console.error('       node ai/tool/memo.js <base-url> list <categoryId>              (카테고리별 메모 목록)');
    console.error('       node ai/tool/memo.js <base-url> recent [limit]                 (전체 최신 메모, 기본 30)');
    console.error('       node ai/tool/memo.js <base-url> add <categoryId> <text>        (메모 저장)');
    console.error('       node ai/tool/memo.js <base-url> log <text>                     (최상위 "Log" 카테고리에 저장, 없으면 자동 생성)');
    console.error('       node ai/tool/memo.js <base-url> del <id>                       (메모 삭제)');
    console.error('       node ai/tool/memo.js <base-url> find [categoryId|-] <text>     (삭제 후보 검색, 삭제 안 함)');
    console.error('       node ai/tool/memo.js <base-url> search [categoryId|-] <text>   (AI 검색, "-"면 전체)');
    process.exit(1);
}

if (!baseArg || !baseArg.startsWith('http') || !cmd) usageAndExit();

const base = baseArg.replace(/\/$/, '');

function printResult(r, okKey) {
    console.log(r.ok ? JSON.stringify(r[okKey] ?? r) : `fail: ${r.msg ?? 'unknown'}`);
}

if (cmd === 'login') {
    const r = await login(call, base, PROJECT_ROOT);
    console.log(r.ok ? 'ok' : `fail: ${r.msg ?? 'unknown'}`);

} else if (cmd === 'cats') {
    const r = await get(base, 'Memo/Category/List');
    printResult(r, 'categories');

} else if (cmd === 'addcat') {
    const [name, parentId] = rest;
    if (!name) usageAndExit();
    const r = await call(base, 'Memo/Category/Add', { name, parentId: parentId ? Number(parentId) : 0 });
    printResult(r, 'category');

} else if (cmd === 'delcat') {
    const [id] = rest;
    if (!id) usageAndExit();
    const r = await call(base, 'Memo/Category/Delete', { id: Number(id) });
    printResult(r, 'deletedCategoryIds');

} else if (cmd === 'list') {
    const [categoryId] = rest;
    if (!categoryId) usageAndExit();
    const r = await get(base, 'Memo/Data/List', { categoryId });
    printResult(r, 'data');

} else if (cmd === 'recent') {
    const [limit] = rest;
    const r = await get(base, 'Memo/Data/ListRecent', { limit });
    printResult(r, 'data');

} else if (cmd === 'add') {
    const [categoryId, ...textParts] = rest;
    const text = textParts.join(' ').trim();
    if (!categoryId || !text) usageAndExit();
    const r = await call(base, 'Memo/Data/Add', { categoryId: Number(categoryId), text });
    printResult(r, 'data');

} else if (cmd === 'log') {
    const text = rest.join(' ').trim();
    if (!text) usageAndExit();

    const catsRes = await get(base, 'Memo/Category/List');
    if (!catsRes.ok) { console.log(`fail: ${catsRes.msg ?? 'unknown'}`); process.exit(1); }

    let logCat = catsRes.categories.find(c => c.parentId === 0 && c.name === 'Log');
    if (!logCat) {
        const addCatRes = await call(base, 'Memo/Category/Add', { name: 'Log', parentId: 0 });
        if (!addCatRes.ok) { console.log(`fail: ${addCatRes.msg ?? 'unknown'}`); process.exit(1); }
        logCat = addCatRes.category;
    }

    const body = text.startsWith('[Log]') ? text : `[Log] ${text}`;
    const withTag = /#log\b/i.test(body) ? body : `${body} #Log`;
    const r = await call(base, 'Memo/Data/Add', { categoryId: logCat.id, text: withTag });
    printResult(r, 'data');

} else if (cmd === 'del') {
    const [id] = rest;
    if (!id) usageAndExit();
    const r = await call(base, 'Memo/Data/Delete', { id: Number(id) });
    console.log(r.ok ? 'ok' : `fail: ${r.msg ?? 'unknown'}`);

} else if (cmd === 'find' || cmd === 'search') {
    const [catArg, ...textParts] = rest;
    let categoryId = null;
    let text;
    if (catArg === '-' || /^\d+$/.test(catArg ?? '')) {
        categoryId = catArg === '-' ? null : Number(catArg);
        text = textParts.join(' ').trim();
    } else {
        text = [catArg, ...textParts].join(' ').trim();
    }
    if (!text) usageAndExit();
    const path = cmd === 'find' ? 'Memo/Data/FindByDescription' : 'Memo/Search';
    const r = await call(base, path, { text, categoryId });
    printResult(r, cmd === 'find' ? 'data' : 'result');

} else {
    usageAndExit();
}
