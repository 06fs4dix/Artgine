import { spawnSync } from 'node:child_process';
import path from 'node:path';

const target = (process.argv[2] || '').trim().replace(/^["']|["']$/g, '');
if (!target) {
  console.error('usage: node ai/tsc_check.js <modified-file.ts>');
  process.exit(1);
}

const normalizedTarget = target.replace(/\\/g, '/');
const targetBase = path.basename(normalizedTarget);

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
    return normalizedLine.includes(normalizedTarget) || normalizedLine.includes(targetBase);
  });

console.log(lines.length ? lines.join('\n') : 'no errors');
process.exit(typeof result.status === 'number' ? result.status : 1);
