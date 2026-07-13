import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const EMSDK_EMSCRIPTEN_DIR = path.join(SCRIPT_DIR, '..', '..', 'big', 'artgine', 'wasm', 'emsdk', 'upstream', 'emscripten');

// ┌─────────────────────┬─────────────────────────┬──────────────────────────┐
// │ Value               │ Compiler                │ Manual path variable     │
// ├─────────────────────┼─────────────────────────┼──────────────────────────┤
// │ window/windows/win  │ MSVC (cl.exe)           │ VCVARSALL_PATH           │
// │ linux               │ gcc/g++                 │ GCC_PATH/GPP_PATH        │
// │ mac/macos/darwin    │ clang/clang++           │ CLANG_PATH/CLANGPP_PATH  │
// │ web/wasm            │ Emscripten (emcc/em++)  │ EMCC_PATH/EMPP_PATH      │
// └─────────────────────┴─────────────────────────┴──────────────────────────┘
const VCVARSALL_PATH = '';
const GCC_PATH = '';
const GPP_PATH = '';
const CLANG_PATH = '';
const CLANGPP_PATH = '';
const EMCC_PATH = path.join(EMSDK_EMSCRIPTEN_DIR, process.platform === 'win32' ? 'emcc.bat' : 'emcc');
const EMPP_PATH = path.join(EMSDK_EMSCRIPTEN_DIR, process.platform === 'win32' ? 'em++.bat' : 'em++');

const rawArgs = process.argv.slice(2).map(t => t.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
if (!rawArgs.length) {
  console.error('usage: node ai/tool/c_cpp_check.js [web|window|linux|mac] <file1.c|.cpp> [file2 ...]');
  process.exit(1);
}

let forcedOS = null;
let targets = rawArgs;
if (!rawArgs[0].includes('.')) {
  forcedOS = rawArgs[0].toLowerCase();
  targets = rawArgs.slice(1);
}

if (!targets.length) {
  console.error('usage: node ai/tool/c_cpp_check.js [web|window|linux|mac] <file1.c|.cpp> [file2 ...]');
  process.exit(1);
}

const normalizedTargets = targets.map(t => t.replace(/\\/g, '/'));
const targetBases = normalizedTargets.map(t => path.basename(t));

function filterOutput(raw) {
  const lines = raw.split(/\r?\n/).map(l => l.trimEnd()).filter(line => {
    if (!line) return false;
    const normalizedLine = line.replace(/\\/g, '/');
    return normalizedTargets.some(t => normalizedLine.includes(t)) ||
           targetBases.some(b => normalizedLine.includes(b));
  });
  return lines;
}

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'c_cpp_check-'));
let allLines = [];
let failed = false;

function findVswhere() {
  const candidates = [
    process.env['ProgramFiles(x86)'] && path.join(process.env['ProgramFiles(x86)'], 'Microsoft Visual Studio', 'Installer', 'vswhere.exe'),
    process.env['ProgramFiles'] && path.join(process.env['ProgramFiles'], 'Microsoft Visual Studio', 'Installer', 'vswhere.exe'),
  ].filter(Boolean);
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  const where = spawnSync('where', ['vswhere.exe'], { encoding: 'utf8', shell: true });
  const found = (where.stdout || '').split(/\r?\n/).map(l => l.trim()).find(Boolean);
  return found || null;
}

function resolveVcvarsallPath() {
  if (VCVARSALL_PATH) {
    if (!fs.existsSync(VCVARSALL_PATH)) {
      console.error(`지정된 VCVARSALL_PATH를 찾을 수 없습니다: ${VCVARSALL_PATH}`);
      process.exit(1);
    }
    return VCVARSALL_PATH;
  }

  const vswherePath = findVswhere();
  if (!vswherePath) {
    console.error('vswhere.exe를 찾을 수 없습니다. Visual Studio Installer가 설치되어 있는지 확인하세요.');
    process.exit(1);
  }

  const vswhereResult = spawnSync(vswherePath, [
    '-latest',
    '-products', '*',
    '-requires', 'Microsoft.VisualStudio.Component.VC.Tools.x86.x64',
    '-property', 'installationPath',
  ], { encoding: 'utf8' });

  const installPath = (vswhereResult.stdout || '').trim();
  if (!installPath) {
    console.error('C++ 빌드 도구(Microsoft.VisualStudio.Component.VC.Tools.x86.x64)가 설치된 Visual Studio를 찾을 수 없습니다.');
    process.exit(1);
  }

  const vcvarsallPath = path.join(installPath, 'VC', 'Auxiliary', 'Build', 'vcvarsall.bat');
  if (!fs.existsSync(vcvarsallPath)) {
    console.error(`vcvarsall.bat를 찾을 수 없습니다: ${vcvarsallPath}`);
    process.exit(1);
  }
  return vcvarsallPath;
}

function runWindows() {
  const vcvarsallPath = resolveVcvarsallPath();

  const quotedFiles = targets.map(t => `"${t}"`).join(' ');
  const objDirForCl = tmpDir.replace(/\\+$/, '') + '\\\\';
  const cmd = `chcp 65001 >nul && call "${vcvarsallPath}" x64 >nul && cl.exe /nologo /EHsc /W3 /c ${quotedFiles} /Fo"${objDirForCl}"`;

  const result = spawnSync('cmd.exe', ['/d', '/s', '/c', cmd], { encoding: 'utf8', windowsVerbatimArguments: true });
  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }

  const output = `${result.stdout || ''}${result.stderr || ''}`;
  allLines = filterOutput(output);
  failed = result.status !== 0;
}

function needsShell(compilerPath) {
  const ext = path.extname(compilerPath).toLowerCase();
  return process.platform === 'win32' && (ext === '.bat' || ext === '.cmd');
}

function findCompiler(name) {
  const check = spawnSync(name, ['--version'], { encoding: 'utf8', shell: needsShell(name) });
  return !check.error;
}

function runWithCompilers(resolveCompiler, label) {
  const groups = new Map();
  for (const t of targets) {
    const ext = path.extname(t).toLowerCase();
    const isCpp = ['.cpp', '.cc', '.cxx', '.c++'].includes(ext);
    const compilerPath = resolveCompiler(isCpp);
    if (!groups.has(compilerPath)) groups.set(compilerPath, []);
    groups.get(compilerPath).push(t);
  }

  for (const [compilerPath, files] of groups) {
    if (!findCompiler(compilerPath)) {
      console.error(`${compilerPath}를 찾을 수 없습니다 (${label}). 설치되어 있는지, 경로가 올바른지 확인하세요.`);
      failed = true;
      continue;
    }
    for (const file of files) {
      const objPath = path.join(tmpDir, `${path.basename(file)}.o`);
      const result = spawnSync(compilerPath, ['-c', file, '-o', objPath, '-Wall'], { encoding: 'utf8', shell: needsShell(compilerPath) });
      if (result.error) {
        console.error(result.error.message);
        failed = true;
        continue;
      }
      const output = `${result.stdout || ''}${result.stderr || ''}`;
      allLines.push(...filterOutput(output));
      if (result.status !== 0) failed = true;
    }
  }
}

function runLinux() {
  runWithCompilers(isCpp => isCpp ? (GPP_PATH || 'g++') : (GCC_PATH || 'gcc'), 'linux');
}

function runMac() {
  runWithCompilers(isCpp => isCpp ? (CLANGPP_PATH || 'clang++') : (CLANG_PATH || 'clang'), 'mac');
}

function runWeb() {
  runWithCompilers(isCpp => isCpp ? (EMPP_PATH || 'em++') : (EMCC_PATH || 'emcc'), 'web(emscripten)');
}

try {
  if (forcedOS) {
    switch (forcedOS) {
      case 'window':
      case 'windows':
      case 'win':
        runWindows();
        break;
      case 'linux':
        runLinux();
        break;
      case 'mac':
      case 'macos':
      case 'darwin':
        runMac();
        break;
      case 'web':
      case 'wasm':
        runWeb();
        break;
      default:
        console.error(`알 수 없는 OS 지정입니다: '${forcedOS}' (web / window / linux / mac 중 하나)`);
        process.exit(1);
    }
  } else if (process.platform === 'win32') {
    runWindows();
  } else if (process.platform === 'darwin') {
    runMac();
  } else {
    runLinux();
  }
} finally {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

if (!failed) {
  console.log('no errors');
} else if (allLines.length) {
  console.log(allLines.join('\n'));
}
process.exit(failed ? 1 : 0);
