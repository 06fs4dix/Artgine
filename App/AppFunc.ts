import * as path from "path";
import * as fs from "fs";
import { CConsol } from "../artgine/basic/CConsol.js";

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
    const maxWaitTime = 5000;
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
function ExtractExportedClassNames(fileContent: string): { defaultExport?: string; namedExports: string[] } {
    let defaultExport: string | undefined;
    const namedExports: string[] = [];

    const defaultMatch = fileContent.match(/export\s+default\s+class\s+(\w+)/);
    if (defaultMatch) defaultExport = defaultMatch[1];

    const exportMatches = [...fileContent.matchAll(/export\s+class\s+(\w+)/g)];
    for (const match of exportMatches) {
        // default로 이미 추출된 것은 중복 방지
        if (!defaultExport || match[1] !== defaultExport) {
            namedExports.push(match[1]);
        }
    }

    return { defaultExport, namedExports };
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
        if (lowerPath.includes("/shader") || lowerPath.includes("/sdf")) continue;

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