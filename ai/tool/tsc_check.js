import { spawnSync } from 'node:child_process';
import path from 'node:path';

const targets = process.argv.slice(2).map(t => t.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
if (!targets.length) {
  console.error('usage: node ai/tsc_check.js <file1.ts> [file2.ts ...]');
  process.exit(1);
}

const normalizedTargets = targets.map(t => t.replace(/\\/g, '/'));
const targetBases = normalizedTargets.map(t => path.basename(t));

const result = spawnSync('npx', ['tsc', '--noEmit', '--pretty', 'false'], {
  encoding: 'utf8',
  shell: true,
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

console.log(lines.length ? lines.join('\n') : 'no errors');
process.exit(typeof result.status === 'number' ? result.status : 1);
