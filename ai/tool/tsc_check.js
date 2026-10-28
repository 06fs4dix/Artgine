import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

const targets = process.argv.slice(2).map(t => t.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
if (!targets.length) {
  console.error('usage: node ai/tool/tsc_check.js <file1.ts> [file2.ts ...]');
  process.exit(1);
}

const norm = p => path.resolve(p).replace(/\\/g, '/').toLowerCase();
const absTargets = targets.map(t => path.resolve(t));
const pending = new Set(absTargets);
const failures = [];
let exitCode = 0;
const printed = [];

// tsc는 cwd(없으면 위쪽)의 tsconfig.json으로 컴파일한다. 설정이 대상 파일을 포함하지 않으면 진단이 하나도 안 나와
// "에러 없음"으로 보이므로, --listFiles로 대상이 실제 컴파일 대상인지 확인하고 아니면 실패로 알린다
function run(dir, subset) {
  const result = spawnSync('npx', ['tsc', '--noEmit', '--pretty', 'false', '--listFiles'], {
    cwd: dir,
    encoding: 'utf8',
    shell: true,
    // 전체 프로젝트 진단이 기본 버퍼(1MB)를 넘겨 ENOBUFS로 죽는다
    maxBuffer: 256 * 1024 * 1024,
  });
  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }
  const out = `${result.stdout || ''}${result.stderr || ''}`.split(/\r?\n/).map(l => l.trimEnd()).filter(Boolean);
  const isDiag = l => /\)?: (error|warning) TS\d+/.test(l) || /^error TS\d+/.test(l);
  const listed = new Set(out.filter(l => !isDiag(l) && /^[A-Za-z]:[\\/]|^\//.test(l)).map(norm));
  const found = subset.filter(f => listed.has(norm(f)));
  if (!found.length) return [];
  const names = found.map(f => f.replace(/\\/g, '/'));
  const bases = found.map(f => path.basename(f));
  for (const line of out) {
    if (!isDiag(line)) continue;
    const n = line.replace(/\\/g, '/');
    if (names.some(t => n.includes(t)) || bases.some(b => n.includes(b))) printed.push(line);
  }
  if (typeof result.status === 'number' && result.status !== 0 && printed.length) exitCode = 1;
  return found;
}

function nearestConfigDir(file) {
  let dir = path.dirname(file);
  for (;;) {
    if (existsSync(path.join(dir, 'tsconfig.json'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

const cwd = process.cwd();
if (existsSync(path.join(cwd, 'tsconfig.json'))) {
  for (const f of run(cwd, [...pending])) pending.delete(f);
}

const groups = new Map();
for (const f of pending) {
  const dir = nearestConfigDir(f);
  if (dir == null) { failures.push(`${f}: tsconfig.json을 찾지 못했습니다 (검사하지 못함)`); pending.delete(f); continue; }
  if (!groups.has(dir)) groups.set(dir, []);
  groups.get(dir).push(f);
}
for (const [dir, files] of groups) {
  for (const f of run(dir, files)) pending.delete(f);
}
for (const f of pending) {
  if (!failures.some(m => m.startsWith(f))) failures.push(`${f}: tsconfig 컴파일 대상에 포함되지 않아 검사하지 못했습니다`);
}

if (printed.length) console.log(printed.join('\n'));
if (failures.length) {
  console.log(failures.join('\n'));
  process.exit(1);
}
if (!printed.length) console.log('no errors');
process.exit(exitCode);
