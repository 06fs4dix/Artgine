import * as path from "path";
import * as fs from "fs";
import { CAI } from "../artgine/util/CAI.js";
import { fileURLToPath } from 'url';
import { CConsol } from "../artgine/basic/CConsol.js";
import { CFile } from "../artgine/system/CFile.js";
import { CPath } from "../artgine/basic/CPath.js";
import { CAlert } from "../artgine/basic/CAlert.js";
import { CUtil } from "../artgine/basic/CUtil.js";
import { CJSON } from "../artgine/basic/CJSON.js";

export type AIRole = CAI.eProvider;

function _toProvider(model: CAI.eProvider | string): CAI.eProvider | undefined {
    const valid = Object.values(CAI.eProvider) as string[];
    return valid.includes(model as string) ? model as CAI.eProvider : undefined;
}

// CAI로 이전됨 — 기존 import 호환을 위해 re-export
export function CreateRole(model: CAI.eProvider | string): boolean {
    const p = _toProvider(model);
    return p !== undefined ? CAI.CreateRole(p) as boolean : false;
}
export function DeleteRole(model: CAI.eProvider | string, targetDir: string): boolean {
    const p = _toProvider(model);
    return p !== undefined ? CAI.DeleteRole(p, targetDir) : false;
}

export function GetNowString(): string {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');  // 0부터 시작
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const mi = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');

    return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
}
const gMainConfig: Record<string, any> = {};
let gPluginsLoaded = false;
// 마지막으로 로드에 성공한 settings 파일명. 파일명 없이 GetAppJSON()이 호출되면
// 하드코딩된 기본값("settings.json") 대신 이 값을 재사용해, 커스텀 settings 파일로
// 기동한 프로세스에서 무인자 호출이 gMainConfig를 다른 파일 내용으로 덮어쓰는 것을 막는다.
let gLoadedSettingsFileName: string | null = null;

export async function GetAppJSON(_settingsFileName?: string)
{
    const settingsFileName = _settingsFileName ?? gLoadedSettingsFileName ?? "settings.json";
    // 이미 같은 파일로 로드된 상태면 재읽기 없이 캐시된 설정을 그대로 반환한다.
    // 이전과 다른 파일명이 명시적으로 들어오면 그때만 다시 읽어 반영한다.
    if(gLoadedSettingsFileName !== null && settingsFileName === gLoadedSettingsFileName)
        return gMainConfig;

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    let initBuf=await CFile.Load(CPath.WorkingPath()+settingsFileName);
    if(initBuf==null)
        initBuf=await CFile.Load(path.join(__dirname, settingsFileName));
    if(initBuf==null)
    {
        CAlert.E("error");
        return null;
    }

    if(!gPluginsLoaded)
    {
        gPluginsLoaded = true;
        CConsol.Log(`${settingsFileName} Load!`);
        LoadPluginMap([CPath.ArtgineRootPath()+"plugin/", CPath.ArtgineRootPath()+"artgine"]);
    }

    const parsed = new CJSON(CUtil.ArrayToString(initBuf)).ToJSON(
        {"width":1024,"height":768,"fullScreen":false,"program":"client","url":"","projectPath":"","page":"html",
            "server":"","github":false,"tsc":true,"password":"artgine","rootPath":["./"]}
    );
    Object.assign(gMainConfig, parsed);
    gLoadedSettingsFileName = settingsFileName;
    return gMainConfig;
}
// rootPath는 string(구버전) 또는 string[](신버전) 모두 허용 → 항상 비어있지 않은 배열로 정규화
export function GetRootPaths(cfg): string[]
{
    const r = cfg?.rootPath;
    if (Array.isArray(r)) return r.length ? r : ["./"];
    return [r ?? "./"];
}
export function GetProjName(projectPath)
{

    const parts = projectPath.split(/[\\/]/); // 슬래시 또는 역슬래시 모두 대응
    let projectName = parts[parts.length - 1]; // 마지막 항목
    
    return projectName;
}
export function GetFolderCanvasFileName(folderPath: string): string[] {
    if (!fs.existsSync(folderPath)) return [];

    const files = fs.readdirSync(folderPath);
    return files.filter(file =>
        path.extname(file).toLowerCase() === '.json' &&
        file.toLowerCase() !== 'camera.json'
    );
}
export async function WaitForBuild(tsFilePath: string): Promise<boolean> {
    const jsFilePath = tsFilePath.replace(/\.ts$/, '.js');
    const maxWaitTime = 1000*10;
    const interval = 200;
    const startTime = Date.now();

    if (!fs.existsSync(tsFilePath)) {
        console.warn(`TS 파일이 존재하지 않습니다: ${tsFilePath}`);
        return true; // 실패
    }

    const tsStat = fs.statSync(tsFilePath);
    const tsTime = tsStat.mtimeMs;  // ✅ 밀리초 단위

    while (Date.now() - startTime < maxWaitTime) {
        if (fs.existsSync(jsFilePath)) {
            const jsStat = fs.statSync(jsFilePath);
            const jsTime = jsStat.mtimeMs;

            if (jsTime >= tsTime) {
                return false; // 성공
            }
        }
        await new Promise(resolve => setTimeout(resolve, interval));
    }

    return true; // 실패
}



function GetAllTSFiles(dir: string, fileList: string[] = []): string[] {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const PHPC = path.join(dir, file);
        if (fs.statSync(PHPC).isDirectory()) {
            GetAllTSFiles(PHPC, fileList);
        } else if (file.endsWith('.ts')) {
            fileList.push(PHPC);
        }
    }
    return fileList;
}
//==============================================================
// function ExtractExportedClassNames(fileContent: string): { defaultExport?: string; namedExports: string[] } {
//     let defaultExport: string | undefined;
//     const namedExports: string[] = [];

//     const defaultMatch = fileContent.match(/export\s+default\s+class\s+(\w+)/);
//     if (defaultMatch) defaultExport = defaultMatch[1];

//     const exportMatches = [...fileContent.matchAll(/export\s+class\s+(\w+)/g)];
//     for (const match of exportMatches) {
//         // default로 이미 추출된 것은 중복 방지
//         if (!defaultExport || match[1] !== defaultExport) {
//             namedExports.push(match[1]);
//         }
//     }

//     return { defaultExport, namedExports };
// }

//==============================================================
// export class 뿐 아니라 export function / export const|let|var / export { ... } 도 추출
function ExtractExportedClassNames(fileContent: string): { defaultExport?: string; namedExports: string[] } {
    let defaultExport: string | undefined;
    const namedSet = new Set<string>();

    const add = (name?: string) => {
        if (!name) return;
        if (name === "default") return;
        if (defaultExport && name === defaultExport) return;
        namedSet.add(name);
    };

    // 1) export default class Name
    {
        const m = fileContent.match(/export\s+default\s+class\s+([A-Za-z_$][\w$]*)/);
        if (m) defaultExport = m[1];
    }

    // 2) export default function Name  (이름 있는 경우만)
    {
        const m = fileContent.match(/export\s+default\s+(?:async\s+)?function(?:\s*\*)?\s+([A-Za-z_$][\w$]*)/);
        if (m) defaultExport = m[1];
    }

    // 3) export class Name
    for (const m of fileContent.matchAll(/export\s+(?:abstract\s+)?class\s+([A-Za-z_$][\w$]*)/g)) {
        add(m[1]);
    }

    // 4) export function Name / export async function Name / export function* Name
    //    (declare는 런타임에 없어질 수 있으니 제외)
    for (const m of fileContent.matchAll(/export\s+(?!declare\b)(?:async\s+)?function(?:\s*\*)?\s+([A-Za-z_$][\w$]*)/g)) {
        add(m[1]);
    }

    // 5) export const/let/var ...
    //    (declare는 제외, 여러 변수 선언/디스트럭처링도 대충 커버)
    for (const m of fileContent.matchAll(/export\s+(?!declare\b)(?:const|let|var)\s+([^;]+);/g)) {
        const decl = m[1];

        // decl 안에서 식별자 후보들을 뽑음 (타입 어노테이션(:), 할당(=), 구분자(,), 닫힘(} ]) 등을 기준)
        for (const id of decl.matchAll(/([A-Za-z_$][\w$]*)\s*(?=\s*[:=,}\]]|$)/g)) {
            add(id[1]);
        }
    }

    // 6) export { a, b as c } (type export는 제외)
    for (const m of fileContent.matchAll(/export\s+(type\s+)?{\s*([^}]+)\s*}(?:\s*from\s*["'][^"']+["'])?/g)) {
        if (m[1]) continue; // export type { ... } 는 런타임 export 아님

        const body = m[2];
        const parts = body.split(",").map(s => s.trim()).filter(Boolean);

        for (const p of parts) {
            // 예: "foo as bar", "default as Foo"
            const asM = p.match(/^(.+?)\s+as\s+(.+)$/);
            const exportedName = asM ? asM[2].trim() : p.trim();

            // export { type Foo } 같은 케이스 방어
            if (exportedName.startsWith("type ")) continue;

            add(exportedName);
        }
    }

    return { defaultExport, namedExports: [...namedSet] };
}

export function GenerateCClassPushes(rootDir: string, _pass: string = ""): string {
    const tsFiles = GetAllTSFiles(rootDir);
    const lines: string[] = [];

    const normalizedPass = path.resolve(_pass);
    const baseDir = path.dirname(normalizedPass);

    for (const file of tsFiles) {
        if (path.resolve(file) === normalizedPass) continue;

        // ⛔ /shader 또는 /SDF 포함한 파일 경로는 스킵
        const lowerPath = file.toLowerCase();
        if (lowerPath.includes("/shader") || lowerPath.includes("/sdf") || lowerPath.includes("server")) continue;

        const content = fs.readFileSync(file, 'utf-8');
        const { defaultExport, namedExports } = ExtractExportedClassNames(content);

        // ✅ export된 클래스가 하나도 없으면 건너뜀
        if (!defaultExport && namedExports.length === 0) continue;

        let importPath = path.relative(baseDir, file).replace(/\\/g, '/');
        importPath = importPath.replace(/\.ts$/, '.js');
        if (!importPath.startsWith('.')) importPath = './' + importPath;

        const imports: string[] = [];
        if (defaultExport) imports.push(defaultExport);
        if (namedExports.length > 0) imports.push(`{ ${namedExports.join(', ')} }`);

        lines.push(`import ${imports.join(', ')} from "${importPath}";`);

        if (defaultExport) lines.push(`CClass.Push(${defaultExport});`);
        namedExports.forEach(cls => lines.push(`CClass.Push(${cls});`));
    }

    return lines.join('\n');
}


export function ExtractServiceWorkerConfig(source: string): Record<string, any> {
    const config: Record<string, any> = {};
    const regex = /const\s+(CACHE_NAME|MAX_CACHE_SIZE|LOG|API_CACHE)\s*=\s*(.+?);/g;

    let match;
    while ((match = regex.exec(source)) !== null) {
        const key = match[1];
        let value = match[2].trim();

        // 숫자 계산 처리 (e.g., 50 * 1024 * 1024)
        try {
            if (value.includes('*')) {
                // eslint-disable-next-line no-eval
                config[key] = eval(value);
            } else if (value === 'true' || value === 'false') {
                config[key] = value === 'true';
            } else if (!isNaN(Number(value))) {
                config[key] = Number(value);
            } else {
                config[key] = value.replace(/^["']|["']$/g, ''); // 문자열
            }
        } catch {
            config[key] = value;
        }
    }

    return config;
}







//==============================================================

export function LoadPluginFolder(folderPath: string): any | null 
{
    const folderName = path.basename(folderPath);
    const jsonPath = path.join(folderPath, `${folderName}.json`);
    const htmlPath = path.join(folderPath, `${folderName}.html`);

    if (fs.existsSync(jsonPath)==false) 
    {
        console.warn(`File Not: ${jsonPath}`);
        return null;
    }
    let json={};
    try {
        const content = fs.readFileSync(jsonPath, 'utf8');
        json=JSON.parse(content);
    } catch (err) {
        console.error(`JSON 파싱 오류: ${jsonPath}`, err);
        return null;
    }
    //console.log(htmlPath);
    if (fs.existsSync(htmlPath)==true) 
    {
        //console.log("on");
        const content = fs.readFileSync(htmlPath, 'utf8');
        json["html"]=content;
    }

   
    return json;
}
export function GetSubFolderPaths(parentFolder: string): string[] {
    if (!fs.existsSync(parentFolder)) return [];

    const entries = fs.readdirSync(parentFolder, { withFileTypes: true });

    const folderPaths = entries
        .filter(entry => entry.isDirectory())
        .map(entry => path.join(parentFolder, entry.name));

    return folderPaths;
}
var gPluginMap = new Map<string, {version:number,dependencies:object,html:string}>();
export function GetPluginArr(): any[] 
{
    const arr: any[] = [];

    for (const [name, data] of gPluginMap.entries()) {
        if (name === "artgine") continue; // ← 제외 조건 추가

        arr.push({
            version: data.version || 1,
            dependencies: data.dependencies || {},
            name: name,
            html: data.html || ""
        });
    }

    return arr;
}
export function GetPluginMap()  {   return gPluginMap;  }


export function LoadPluginMap(pluginRoots: string[])
{
    for (let root of pluginRoots) {
        const isFolderScan = root.endsWith('/') || root.endsWith('\\');

        if (isFolderScan) {
            const pluginFolders = GetSubFolderPaths(root);
            for (const folderPath of pluginFolders) {
                const info = LoadPluginFolder(folderPath);
                if (info) {
                    const pluginName = path.basename(folderPath);
                    gPluginMap.set(pluginName, info);
                }
            }
        } else {
            const info = LoadPluginFolder(root);
            if (info) {
                const pluginName = path.basename(root);
                gPluginMap.set(pluginName, info);
            }
        }
    }
}

export function DependenciesChk(_def: Record<string, number>): boolean {
    const pluginMap = GetPluginMap();

    for (const key in _def) {
        const requiredVer = _def[key];
        const pluginInfo = pluginMap.get(key);

        if (!pluginInfo) {
            console.warn(`[dependencies] '${key}' plugin not`);
            return true;
        }

     

        if (requiredVer > pluginInfo.version) {
            console.warn(`[dependencies] '${key}' version(${requiredVer})`);
            return true;
        }
    }

    return false;
}
export function PluginMapDependenciesChk(): string 
{
    
    // 종속성 확인
    for (const [pluginName, info] of gPluginMap.entries()) {
        const deps = info.dependencies || {};
        for (const depName of Object.keys(deps)) {
            if (!gPluginMap.has(depName)) {
                return `[err] '${pluginName}' Plugin '${depName}' dependencies.`;
            }
        }
    }

    // 순환 참조 확인
    const visited = new Set<string>();
    const stack = new Set<string>();

    function hasCycle(current: string): boolean {
        if (stack.has(current)) return true;
        if (visited.has(current)) return false;

        visited.add(current);
        stack.add(current);

        const deps = gPluginMap.get(current)?.dependencies || {};
        for (const dep of Object.keys(deps)) {
            if (gPluginMap.has(dep)) {
                if (hasCycle(dep)) return true;
            }
        }

        stack.delete(current);
        return false;
    }

    for (const pluginName of gPluginMap.keys()) {
        stack.clear();
        if (hasCycle(pluginName)) {
            return `[Err] Cycle: '${pluginName}'`;
        }
    }

    CConsol.Log(`[success] All ${gPluginMap.size} Plugin.`);
    return null;
}


export function BackUp(_bFolder: string, _nFolder: string): void {
	// 1. 백업 폴더 초기화 (파일 삭제)
	if (!fs.existsSync(_bFolder)) {
		fs.mkdirSync(_bFolder, { recursive: true });
	} else {
		const oldFiles = fs.readdirSync(_bFolder);
		for (const file of oldFiles) {
			const filePath = path.join(_bFolder, file);
			const stat = fs.statSync(filePath);
			if (stat.isFile()) {
				fs.unlinkSync(filePath);
			} else if (stat.isDirectory()) {
				fs.rmSync(filePath, { recursive: true, force: true });
			}
		}
	}

	// 2. 원본 폴더 → 백업 폴더로 복사
	if (!fs.existsSync(_nFolder)) return;
	const newFiles = fs.readdirSync(_nFolder);
	for (const file of newFiles) {
		const srcPath = path.join(_nFolder, file);
		const destPath = path.join(_bFolder, file);
		const stat = fs.statSync(srcPath);

		if (stat.isFile()) {
			fs.copyFileSync(srcPath, destPath);
		} else if (stat.isDirectory()) {
			copyFolderRecursive(srcPath, destPath);
		}
	}
}

// 보조 함수: 하위 디렉토리 복사
function copyFolderRecursive(src: string, dest: string) {
	fs.mkdirSync(dest, { recursive: true });
	const entries = fs.readdirSync(src);

	for (const entry of entries) {
		const srcPath = path.join(src, entry);
		const destPath = path.join(dest, entry);
		const stat = fs.statSync(srcPath);

		if (stat.isDirectory()) {
			copyFolderRecursive(srcPath, destPath);
		} else {
			fs.copyFileSync(srcPath, destPath);
		}
	}
}

/**
 * 지정된 폴더의 모든 TypeScript 파일에서 artgine/ 경로를 상위 폴더 경로로 변경
 * @param workFolder 작업할 폴더 경로
 * @param upFolder 상위 폴더명 (예: "../artgine")
 */
export async function ReplaceArtginePathsInFolder(workFolder: string, upFolder: string,projPath : string): Promise<void> {
    try {
        // console.log(`작업 폴더: ${workFolder}`);
        // console.log(`상위 폴더: ${upFolder}`);
        
        // 폴더가 존재하는지 확인
        if (!fs.existsSync(workFolder)) {
            console.error(`폴더가 존재하지 않습니다: ${workFolder}`);
            return;
        }

        // 모든 .ts 파일 찾기
        const tsFiles = FindTSFiles(workFolder);
        //console.log(`찾은 TypeScript 파일: ${tsFiles.length}개`);

        if (tsFiles.length === 0) {
            console.log('처리할 TypeScript 파일이 없습니다.');
            return;
        }

        // 각 파일 처리
        let processedCount = 0;
        let modifiedCount = 0;

        for (const filePath of tsFiles) {
            try {
                const modified = await ReplaceArtginePathsInFile(filePath, upFolder,projPath);
                processedCount++;
                if (modified) {
                    modifiedCount++;
                    //console.log(`✅ 수정됨: ${path.relative(workFolder, filePath)}`);
                }
            } catch (error) {
                console.error(`❌ 파일 처리 실패 ${filePath}:`, error);
            }
        }

        

    } catch (error) {
        console.error('ReplaceArtginePathsInFolder 실행 중 오류:', error);
    }
}


function FindTSFiles(folderPath: string): string[] {
    const tsFiles: string[] = [];

    const searchRecursive = (currentPath: string) => {
        const items = fs.readdirSync(currentPath);

        for (const item of items) {
            const fullPath = path.join(currentPath, item);
            const stat = fs.statSync(fullPath);

            if (stat.isDirectory()) {
                // 특정 폴더는 제외 (node_modules, .git 등)
                if (!['node_modules', '.git', 'dist', 'build'].includes(item)) {
                    searchRecursive(fullPath);
                }
            } else if (stat.isFile() && item.endsWith('.ts')) {
                tsFiles.push(fullPath);
            }
        }
    };

    searchRecursive(folderPath);
    return tsFiles;
}

async function ReplaceArtginePathsInFile(filePath: string, upFolder: string,projPath : string): Promise<boolean> {
    try {
        let additionalLevels = 0;

        // 파일 읽기
        const originalContent = fs.readFileSync(filePath, 'utf8');
        if(upFolder.indexOf("http")==-1)
        {
            // 경로 구분자를 /로 통일
            const normalizedFilePath = filePath.replace(/\\/g, '/');
            const normalizedProjPath = projPath.replace(/\\/g, '/');
            
            // 추가 경로 횟수 계산
            const filePathParts = normalizedFilePath.split('/');
            const projPathParts = normalizedProjPath.split('/');
            
            // projPath 이후의 추가 디렉토리 개수 계산
            if (filePathParts.length > projPathParts.length) {
                additionalLevels = filePathParts.length - projPathParts.length-1;
            }
        }
        
        
        // artgine/ 또는 plugin/ 경로 치환 — import 구문이 있는 줄에서만 적용 (런타임 URL 문자열 등 오탐 방지)
        const modifiedContent = originalContent.replace(
            /^.*$/gm,
            (line) => {
                if (!/\bimport\b/.test(line)) return line;
                return line.replace(
                    /(["'])[^"'\n]*?((?:artgine|plugin)\/[^"'\n]+)/g,
                    (match, quote, path) => {
                        // upFolder 끝 / 제거, path 앞 / 제거 후 결합
                        const cleanUpFolder = upFolder.replace(/\/+$/, '');
                        const cleanPath = path.replace(/^\/+/, '');

                        // 추가 경로 횟수만큼 ../ 추가
                        const upPath = '../'.repeat(additionalLevels);

                        return `${quote}${upPath}${cleanUpFolder}/${cleanPath}`;
                    }
                );
            }
        );

        // 내용이 변경되었는지 확인
        if (originalContent !== modifiedContent) {
            // 수정된 내용 저장
            fs.writeFileSync(filePath, modifiedContent, 'utf8');
            return true;
        }

        return false;
    } catch (error) {
        console.error(`파일 처리 중 오류 ${filePath}:`, error);
        return false;
    }
}
