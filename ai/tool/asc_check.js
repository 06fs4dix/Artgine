import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const WASM_DIR = path.join(SCRIPT_DIR, '..', '..', 'big', 'artgine', 'wasm');

// big/artgine/wasm/build_ASM.bat이 실제로 빌드하는 두 엔트리(재조립 전용 파일).
// 이 폴더의 .ts는 대부분 이 두 엔트리 중 하나(또는 둘 다)의 그래프에 포함되므로,
// 어느 파일을 고쳤는지와 무관하게 항상 둘 다 --noEmit으로 전체 재컴파일해서 체크한다
// (asc는 tsc와 달리 단일 파일 단위 타입체크를 지원하지 않고 엔트리 기준 모듈 전체를 분석함).
const ENTRIES = [
  { file: 'ASM.ts', extraArgs: [] },
  { file: 'ASM_SIMD.ts', extraArgs: ['--enable', 'simd'] },
];

const targets = process.argv.slice(2).map(t => t.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
if (!targets.length) {
  console.error('usage: node ai/tool/asc_check.js <file1.ts> [file2.ts ...]');
  process.exit(1);
}

const normalizedTargets = targets.map(t => t.replace(/\\/g, '/'));
const targetBases = normalizedTargets.map(t => path.basename(t));

let allLines = [];
let failed = false;

for (const entry of ENTRIES) {
  const entryPath = path.join(WASM_DIR, entry.file);
  const result = spawnSync('npx', [
    'asc', entryPath,
    '--noEmit',
    '--noColors',
    '--enable', 'reference-types',
    ...entry.extraArgs,
  ], {
    encoding: 'utf8',
    shell: true,
    // 전체 모듈 그래프 진단이 기본 버퍼(1MB)를 넘겨 ENOBUFS로 죽는다
    maxBuffer: 256 * 1024 * 1024,
  });

  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }

  const output = `${result.stdout || ''}${result.stderr || ''}`;
  const lines = output
    .split(/\r?\n/)
    .map(line => line.trimEnd())
    .filter(line => {
      if (!line) return false;
      const normalizedLine = line.replace(/\\/g, '/');
      return normalizedTargets.some(t => normalizedLine.includes(t)) ||
             targetBases.some(b => normalizedLine.includes(b));
    });

  if (lines.length) allLines.push(`[${entry.file}]`, ...lines);
  if (result.status !== 0) failed = true;
}

console.log(allLines.length ? allLines.join('\n') : 'no errors');
process.exit(failed ? 1 : 0);
