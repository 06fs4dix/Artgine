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

const usage = 'usage: node ai/tool/c_cpp_check.js [web|window|linux|mac] [--proj=<.vcproj or .vcxproj path>] [--config=<Configuration name>] <file1.c|.cpp> [file2 ...]';

const rawArgsAll = process.argv.slice(2).map(t => t.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
if (!rawArgsAll.length) {
  console.error(usage);
  process.exit(1);
}

let projPath = null;
let projConfigName = null;
const rawArgs = [];
for (const arg of rawArgsAll) {
  if (arg.startsWith('--proj=')) {
    projPath = arg.slice('--proj='.length);
  } else if (arg.startsWith('--config=')) {
    projConfigName = arg.slice('--config='.length);
  } else {
    rawArgs.push(arg);
  }
}

if (!rawArgs.length) {
  console.error(usage);
  process.exit(1);
}

let forcedOS = null;
let targets = rawArgs;
if (!rawArgs[0].includes('.')) {
  forcedOS = rawArgs[0].toLowerCase();
  targets = rawArgs.slice(1);
}

if (!targets.length) {
  console.error(usage);
  process.exit(1);
}

// vcproj(VS2002~2008, XML 속성 방식) 형식에서 지정 Configuration의 VCCLCompilerTool 설정을 읽어
// AdditionalIncludeDirectories -> /I, PreprocessorDefinitions -> /D 로 변환한다.
function loadVcprojFlags(vcprojPath, configName, xml, projDir) {
  const configBlockRe = /<Configuration\b([^>]*)>([\s\S]*?)<\/Configuration>/g;
  const configs = [];
  let m;
  while ((m = configBlockRe.exec(xml))) {
    const attrs = m[1];
    const body = m[2];
    const nameMatch = attrs.match(/Name="([^"]*)"/);
    if (nameMatch) configs.push({ name: nameMatch[1], body });
  }
  if (!configs.length) {
    console.error(`vcproj에서 Configuration을 찾을 수 없습니다: ${vcprojPath}`);
    process.exit(1);
  }

  const chosen = pickConfig(configs, configName);

  const projVersionMatch = xml.match(/<VisualStudioProject\b[^>]*\bVersion="([^"]*)"/);
  const projectVersion = projVersionMatch ? projVersionMatch[1] : null;

  const clToolMatch = chosen.body.match(/<Tool\s+Name="VCCLCompilerTool"([\s\S]*?)\/>/);
  const clToolAttrs = clToolMatch ? clToolMatch[1] : '';

  const includeMatch = clToolAttrs.match(/AdditionalIncludeDirectories="([^"]*)"/);
  const includeDirs = includeMatch
    ? includeMatch[1].split(';').map(s => s.trim()).filter(Boolean).map(dir => path.resolve(projDir, dir))
    : [];

  const defineMatch = clToolAttrs.match(/PreprocessorDefinitions="([^"]*)"/);
  const defines = defineMatch
    ? defineMatch[1].split(';').map(s => s.trim()).filter(Boolean)
    : [];

  return {
    format: 'vcproj',
    configName: chosen.name,
    projectVersion,
    platformToolset: null,
    includeDirs,
    includeFlags: includeDirs.map(dir => `/I"${dir}"`),
    defineFlags: defines.map(def => `/D"${def}"`),
  };
}

// vcxproj(VS2010+, MSBuild XML) 형식에서 지정 Configuration의 ClCompile 설정을 읽는다.
// AdditionalIncludeDirectories/PreprocessorDefinitions는 "값;%(상속토큰)" 형태라 %(...) 토큰은 제거한다.
function loadVcxprojFlags(vcxprojPath, configName, xml, projDir) {
  const configEntryRe = /<ProjectConfiguration\s+Include="([^"]*)"/g;
  const configNames = [];
  let cm;
  while ((cm = configEntryRe.exec(xml))) configNames.push({ name: cm[1] });
  if (!configNames.length) {
    console.error(`vcxproj에서 ProjectConfiguration을 찾을 수 없습니다: ${vcxprojPath}`);
    process.exit(1);
  }

  const chosen = pickConfig(configNames, configName);
  const condition = `'$(Configuration)|$(Platform)'=='${chosen.name}'`;

  // 같은 Condition을 가진 <Tag>는 vcxproj 안에 여러 번(예: Configuration 라벨용, IncludePath용) 나올 수 있으므로
  // 첫 매치만 보지 말고 전부 이어붙인다.
  function findBlockByCondition(tag) {
    const re = new RegExp(`<${tag}\\b[^>]*Condition="${condition.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'g');
    let bodies = '';
    let m;
    while ((m = re.exec(xml))) bodies += `${m[1]}\n`;
    return bodies;
  }

  const propertyGroupBody = findBlockByCondition('PropertyGroup');
  const toolsetMatch = propertyGroupBody.match(/<PlatformToolset>([^<]*)<\/PlatformToolset>/);
  const platformToolset = toolsetMatch ? toolsetMatch[1].trim() : null;

  // <IncludePath>는 ClCompile의 AdditionalIncludeDirectories와 별개로 PropertyGroup에 프로젝트 전역
  // include 경로(예: DirectX SDK)를 지정하는 데 쓰인다. $(...)로 시작하는 미해석 매크로 토큰은 제외한다.
  const includePathMatch = propertyGroupBody.match(/<IncludePath>([^<]*)<\/IncludePath>/);
  const includePathDirs = includePathMatch
    ? includePathMatch[1].split(';').map(s => s.trim()).filter(s => s && !s.startsWith('$('))
    : [];

  const itemDefGroupBody = findBlockByCondition('ItemDefinitionGroup');
  const clCompileMatch = itemDefGroupBody.match(/<ClCompile>([\s\S]*?)<\/ClCompile>/);
  const clCompileBody = clCompileMatch ? clCompileMatch[1] : '';

  function readSemicolonList(tag) {
    const found = clCompileBody.match(new RegExp(`<${tag}>([^<]*)<\\/${tag}>`));
    if (!found) return [];
    return found[1].split(';').map(s => s.trim()).filter(s => s && !s.startsWith('%('));
  }

  const includeDirs = [
    ...readSemicolonList('AdditionalIncludeDirectories').map(dir => path.resolve(projDir, dir)),
    ...includePathDirs.map(dir => path.isAbsolute(dir) ? dir : path.resolve(projDir, dir)),
  ];
  const defines = readSemicolonList('PreprocessorDefinitions');

  const projVersionMatch = xml.match(/<Project\b[^>]*\bToolsVersion="([^"]*)"/);
  const projectVersion = projVersionMatch ? `vcxproj-tv${projVersionMatch[1]}` : 'vcxproj';

  const platform = chosen.name.includes('|') ? chosen.name.split('|')[1] : 'Win32';

  return {
    format: 'vcxproj',
    configName: chosen.name,
    platform,
    projectVersion,
    platformToolset,
    includeDirs,
    includeFlags: includeDirs.map(dir => `/I"${dir}"`),
    defineFlags: defines.map(def => `/D"${def}"`),
  };
}

function pickConfig(configs, configName) {
  if (configName) {
    const found = configs.find(c => c.name === configName || c.name.startsWith(`${configName}|`));
    if (!found) {
      console.error(`--config="${configName}"에 해당하는 Configuration을 찾을 수 없습니다. 가능한 값: ${configs.map(c => c.name).join(', ')}`);
      process.exit(1);
    }
    return found;
  }
  return configs.find(c => c.name.startsWith('Release|'))
    || configs.find(c => c.name.startsWith('Debug|'))
    || configs[0];
}

function loadProjectFlags(projFilePath, configName) {
  if (!fs.existsSync(projFilePath)) {
    console.error(`--proj 경로를 찾을 수 없습니다: ${projFilePath}`);
    process.exit(1);
  }
  const xml = fs.readFileSync(projFilePath, 'utf8');
  const projDir = path.dirname(path.resolve(projFilePath));
  const ext = path.extname(projFilePath).toLowerCase();

  if (ext === '.vcxproj') return loadVcxprojFlags(projFilePath, configName, xml, projDir);
  if (ext === '.vcproj') return loadVcprojFlags(projFilePath, configName, xml, projDir);
  console.error(`--proj는 .vcproj 또는 .vcxproj만 지원합니다: ${projFilePath}`);
  process.exit(1);
}

const projectFlags = projPath ? loadProjectFlags(projPath, projConfigName) : null;

// .vcproj(XML 속성 방식) Version 속성은 VC++ 도구 버전을 그대로 나타낸다 (VS 제품명이 아님).
// 7.00=VS2002, 7.10=VS2003, 8.00=VS2005, 9.00=VS2008.
// 이 구버전 프로젝트들의 실제 빌드는 최신 VS/Windows SDK가 아니라 당시 VC 툴체인으로 이뤄지므로,
// 최신 SDK로 체크하면 dbghelp.h 등에서 실제 빌드에 없는 거짓 에러가 날 수 있다 -> 버전에 맞는
// 구버전 툴체인의 vcvars32.bat을 찾아서 쓴다.
const LEGACY_VCPROJ_TOOLCHAINS = {
  '7.00': { label: 'VS2002', dirNames: ['Microsoft Visual Studio .NET 2002'], vcvars32RelPath: ['Vc7', 'bin', 'vcvars32.bat'] },
  '7.10': { label: 'VS2003', dirNames: ['Microsoft Visual Studio .NET 2003'], vcvars32RelPath: ['Vc7', 'bin', 'vcvars32.bat'] },
  '8.00': { label: 'VS2005', dirNames: ['Microsoft Visual Studio 8'], vcvars32RelPath: ['VC', 'bin', 'vcvars32.bat'] },
  '9.00': { label: 'VS2008', dirNames: ['Microsoft Visual Studio 9.0'], vcvars32RelPath: ['VC', 'bin', 'vcvars32.bat'] },
};

// .vcxproj(VS2010+)의 PlatformToolset -> VS 제품명 / vcvarsall.bat -vcvars_ver 값.
// VS2010+는 별도 설치 경로를 찾을 필요 없이, 최신 VS(vswhere로 탐색)에 해당 툴셋이
// 나란히 설치돼 있으면 -vcvars_ver로 지정해서 같은 vcvarsall.bat이 그 버전을 골라 쓴다.
// 설치 안 된 툴셋이면 cl.exe/vcvarsall이 "툴셋을 찾을 수 없다"는 명확한 에러를 낸다.
const PLATFORM_TOOLSET_MAP = {
  v100: { label: 'VS2010', vcvarsVer: '10.0' },
  v110: { label: 'VS2012', vcvarsVer: '11.0' },
  v110_xp: { label: 'VS2012(XP)', vcvarsVer: '11.0' },
  v120: { label: 'VS2013', vcvarsVer: '12.0' },
  v120_xp: { label: 'VS2013(XP)', vcvarsVer: '12.0' },
  v140: { label: 'VS2015', vcvarsVer: '14.0' },
  v140_xp: { label: 'VS2015(XP)', vcvarsVer: '14.0' },
  v141: { label: 'VS2017', vcvarsVer: '14.1' },
  v141_xp: { label: 'VS2017(XP)', vcvarsVer: '14.1' },
  v142: { label: 'VS2019', vcvarsVer: '14.2' },
  v143: { label: 'VS2022', vcvarsVer: '14.3' },
};

const legacyToolchain = projectFlags && projectFlags.format === 'vcproj'
  ? LEGACY_VCPROJ_TOOLCHAINS[projectFlags.projectVersion] || null
  : null;
const modernToolset = projectFlags && projectFlags.format === 'vcxproj' && projectFlags.platformToolset
  ? PLATFORM_TOOLSET_MAP[projectFlags.platformToolset] || null
  : null;

if (projectFlags) {
  let toolchainNote = '';
  if (legacyToolchain) toolchainNote = ` -> ${legacyToolchain.label} 툴체인 사용`;
  else if (modernToolset) toolchainNote = ` -> ${modernToolset.label}(${projectFlags.platformToolset}, -vcvars_ver=${modernToolset.vcvarsVer}) 툴셋 사용`;
  else if (projectFlags.format === 'vcxproj' && projectFlags.platformToolset) toolchainNote = ` -> 알 수 없는 PlatformToolset(${projectFlags.platformToolset}), 최신 VS 기본 툴셋 사용`;
  console.error(`[proj] ${projPath} (${projectFlags.configName}, ${projectFlags.format} format ${projectFlags.projectVersion}${toolchainNote})`);
}

const normalizedTargets = targets.map(t => t.replace(/\\/g, '/'));
const targetBases = normalizedTargets.map(t => path.basename(t));
// --proj가 지정되면 프로젝트 include 경로 아래에서 발생한 에러(예: 헤더 파일 재정의 충돌)도
// 체크 대상 파일과 무관하게 보여줘야 하므로 필터 범위에 포함시킨다.
const projectIncludePrefixes = projectFlags ? projectFlags.includeDirs.map(d => d.replace(/\\/g, '/')) : [];

// Windows 경로는 대소문자를 구분하지 않는데, vcxproj에 적힌 include 경로 표기와 컴파일러가
// 실제로 출력하는 경로의 대소문자가 다른 경우(예: vcxproj의 "zalla3d base class" vs 실제 폴더
// "Zalla3D Base Class")가 흔하다. 여기서 대소문자를 구분해버리면 그 경로에서 난 진짜 에러가
// (타깃 파일과 무관해 보여) 조용히 필터링되어 사라지므로, 비교는 항상 소문자로 정규화해서 한다.
const normalizedTargetsLower = normalizedTargets.map(t => t.toLowerCase());
const targetBasesLower = targetBases.map(b => b.toLowerCase());
const projectIncludePrefixesLower = projectIncludePrefixes.map(p => p.toLowerCase());

function filterOutput(raw) {
  const lines = raw.split(/\r?\n/).map(l => l.trimEnd()).filter(line => {
    if (!line) return false;
    const normalizedLine = line.replace(/\\/g, '/').toLowerCase();
    return normalizedTargetsLower.some(t => normalizedLine.includes(t)) ||
           targetBasesLower.some(b => normalizedLine.includes(b)) ||
           projectIncludePrefixesLower.some(p => normalizedLine.includes(p));
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

function resolveLegacyVcvars32Path(toolchain) {
  const roots = [
    process.env['ProgramFiles(x86)'],
    process.env['ProgramFiles'],
    'C:\\Program Files (x86)',
    'C:\\Program Files',
    'D:\\Program Files (x86)',
    'D:\\Program Files',
  ].filter(Boolean);
  for (const dirName of toolchain.dirNames) {
    for (const root of roots) {
      const candidate = path.join(root, dirName, ...toolchain.vcvars32RelPath);
      if (fs.existsSync(candidate)) return candidate;
    }
  }
  return null;
}

function runWindows() {
  const quotedFiles = targets.map(t => `"${t}"`).join(' ');
  const objDirForCl = tmpDir.replace(/\\+$/, '') + '\\\\';
  const projArgs = projectFlags
    ? [...projectFlags.includeFlags, ...projectFlags.defineFlags].join(' ') + ' '
    : '';

  let cmd;
  if (legacyToolchain) {
    const vcvars32Path = resolveLegacyVcvars32Path(legacyToolchain);
    if (!vcvars32Path) {
      const exampleDir = legacyToolchain.dirNames[0];
      const exampleRel = legacyToolchain.vcvars32RelPath.join('\\');
      console.error(`${legacyToolchain.label} 설치를 찾을 수 없습니다. "...\\${exampleDir}\\${exampleRel}" 경로를 확인하세요.`);
      process.exit(1);
    }
    // 구버전 프로젝트 소스는 대개 CP949(ks_c_5601-1987)로 저장되어 있으므로 콘솔 코드페이지를 맞춘다.
    cmd = `chcp 949 >nul && call "${vcvars32Path}" >nul && cl.exe /nologo /EHsc /W3 /c ${projArgs}${quotedFiles} /Fo"${objDirForCl}"`;
  } else {
    const vcvarsallPath = resolveVcvarsallPath();
    const vcvarsVerArg = modernToolset ? ` -vcvars_ver=${modernToolset.vcvarsVer}` : '';
    // vcxproj의 Platform(Win32/x64)에 맞춰 아키텍처를 골라야 한다. Win32(x86) 프로젝트를 x64로 컴파일하면
    // 그 프로젝트에는 없는 아키텍처 불일치 에러(예: x86 전용 인라인 어셈블리)가 나서 진단이 무의미해진다.
    // --proj 없이 낱개 파일만 체크할 때는 기존 동작대로 x64를 기본값으로 둔다.
    const targetArch = projectFlags && projectFlags.platform && projectFlags.platform.toLowerCase() !== 'x64'
      ? 'x86'
      : 'x64';
    cmd = `chcp 65001 >nul && call "${vcvarsallPath}" ${targetArch}${vcvarsVerArg} >nul && cl.exe /nologo /EHsc /W3 /c ${projArgs}${quotedFiles} /Fo"${objDirForCl}"`;
  }

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
