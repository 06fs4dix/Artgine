import * as path from "path";
import * as fs from "fs";
import { CConsol } from "../artgine/basic/CConsol.js";
export function GetNowString() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const mi = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
}
export function GetProjName(projectPath) {
    const parts = projectPath.split(/[\\/]/);
    let projectName = parts[parts.length - 1];
    return projectName;
}
export function GetFolderCanvasFileName(folderPath) {
    if (!fs.existsSync(folderPath))
        return [];
    const files = fs.readdirSync(folderPath);
    return files.filter(file => path.extname(file).toLowerCase() === '.json' &&
        file.toLowerCase() !== 'camera.json');
}
export async function WaitForBuild(tsFilePath) {
    const jsFilePath = tsFilePath.replace(/\.ts$/, '.js');
    const maxWaitTime = 5000;
    const interval = 200;
    const startTime = Date.now();
    if (!fs.existsSync(tsFilePath)) {
        console.warn(`TS 파일이 존재하지 않습니다: ${tsFilePath}`);
        return true;
    }
    const tsStat = fs.statSync(tsFilePath);
    const tsTime = tsStat.mtimeMs;
    while (Date.now() - startTime < maxWaitTime) {
        if (fs.existsSync(jsFilePath)) {
            const jsStat = fs.statSync(jsFilePath);
            const jsTime = jsStat.mtimeMs;
            if (jsTime >= tsTime) {
                return false;
            }
        }
        await new Promise(resolve => setTimeout(resolve, interval));
    }
    return true;
}
function GetAllTSFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const PHPC = path.join(dir, file);
        if (fs.statSync(PHPC).isDirectory()) {
            GetAllTSFiles(PHPC, fileList);
        }
        else if (file.endsWith('.ts')) {
            fileList.push(PHPC);
        }
    }
    return fileList;
}
function ExtractExportedClassNames(fileContent) {
    let defaultExport;
    const namedExports = [];
    const defaultMatch = fileContent.match(/export\s+default\s+class\s+(\w+)/);
    if (defaultMatch)
        defaultExport = defaultMatch[1];
    const exportMatches = [...fileContent.matchAll(/export\s+class\s+(\w+)/g)];
    for (const match of exportMatches) {
        if (!defaultExport || match[1] !== defaultExport) {
            namedExports.push(match[1]);
        }
    }
    return { defaultExport, namedExports };
}
export function GenerateCClassPushes(rootDir, _pass = "") {
    const tsFiles = GetAllTSFiles(rootDir);
    const lines = [];
    const normalizedPass = path.resolve(_pass);
    const baseDir = path.dirname(normalizedPass);
    for (const file of tsFiles) {
        if (path.resolve(file) === normalizedPass)
            continue;
        const lowerPath = file.toLowerCase();
        if (lowerPath.includes("/shader") || lowerPath.includes("/sdf"))
            continue;
        const content = fs.readFileSync(file, 'utf-8');
        const { defaultExport, namedExports } = ExtractExportedClassNames(content);
        if (!defaultExport && namedExports.length === 0)
            continue;
        let importPath = path.relative(baseDir, file).replace(/\\/g, '/');
        importPath = importPath.replace(/\.ts$/, '.js');
        if (!importPath.startsWith('.'))
            importPath = './' + importPath;
        const imports = [];
        if (defaultExport)
            imports.push(defaultExport);
        if (namedExports.length > 0)
            imports.push(`{ ${namedExports.join(', ')} }`);
        lines.push(`import ${imports.join(', ')} from "${importPath}";`);
        if (defaultExport)
            lines.push(`CClass.Push(${defaultExport});`);
        namedExports.forEach(cls => lines.push(`CClass.Push(${cls});`));
    }
    return lines.join('\n');
}
export function ExtractServiceWorkerConfig(source) {
    const config = {};
    const regex = /const\s+(CACHE_NAME|MAX_CACHE_SIZE|LOG|API_CACHE)\s*=\s*(.+?);/g;
    let match;
    while ((match = regex.exec(source)) !== null) {
        const key = match[1];
        let value = match[2].trim();
        try {
            if (value.includes('*')) {
                config[key] = eval(value);
            }
            else if (value === 'true' || value === 'false') {
                config[key] = value === 'true';
            }
            else if (!isNaN(Number(value))) {
                config[key] = Number(value);
            }
            else {
                config[key] = value.replace(/^["']|["']$/g, '');
            }
        }
        catch {
            config[key] = value;
        }
    }
    return config;
}
export function LoadPluginFolder(folderPath) {
    const folderName = path.basename(folderPath);
    const jsonPath = path.join(folderPath, `${folderName}.json`);
    const htmlPath = path.join(folderPath, `${folderName}.html`);
    if (fs.existsSync(jsonPath) == false) {
        console.warn(`File Not: ${jsonPath}`);
        return null;
    }
    let json = {};
    try {
        const content = fs.readFileSync(jsonPath, 'utf8');
        json = JSON.parse(content);
    }
    catch (err) {
        console.error(`JSON 파싱 오류: ${jsonPath}`, err);
        return null;
    }
    if (fs.existsSync(htmlPath) == true) {
        const content = fs.readFileSync(htmlPath, 'utf8');
        json["html"] = content;
    }
    return json;
}
export function GetSubFolderPaths(parentFolder) {
    if (!fs.existsSync(parentFolder))
        return [];
    const entries = fs.readdirSync(parentFolder, { withFileTypes: true });
    const folderPaths = entries
        .filter(entry => entry.isDirectory())
        .map(entry => path.join(parentFolder, entry.name));
    return folderPaths;
}
var gPluginMap = new Map();
export function GetPluginArr() {
    const arr = [];
    for (const [name, data] of gPluginMap.entries()) {
        if (name === "artgine")
            continue;
        arr.push({
            version: data.version || 1,
            dependencies: data.dependencies || {},
            name: name,
            html: data.html || ""
        });
    }
    return arr;
}
export function GetPluginMap() { return gPluginMap; }
export function LoadPluginMap(pluginRoots) {
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
        }
        else {
            const info = LoadPluginFolder(root);
            if (info) {
                const pluginName = path.basename(root);
                gPluginMap.set(pluginName, info);
            }
        }
    }
}
export function DependenciesChk(_def) {
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
export function PluginMapDependenciesChk() {
    for (const [pluginName, info] of gPluginMap.entries()) {
        const deps = info.dependencies || {};
        for (const depName of Object.keys(deps)) {
            if (!gPluginMap.has(depName)) {
                return `[err] '${pluginName}' Plugin '${depName}' dependencies.`;
            }
        }
    }
    const visited = new Set();
    const stack = new Set();
    function hasCycle(current) {
        if (stack.has(current))
            return true;
        if (visited.has(current))
            return false;
        visited.add(current);
        stack.add(current);
        const deps = gPluginMap.get(current)?.dependencies || {};
        for (const dep of Object.keys(deps)) {
            if (gPluginMap.has(dep)) {
                if (hasCycle(dep))
                    return true;
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
export function BackUp(_bFolder, _nFolder) {
    if (!fs.existsSync(_bFolder)) {
        fs.mkdirSync(_bFolder, { recursive: true });
    }
    else {
        const oldFiles = fs.readdirSync(_bFolder);
        for (const file of oldFiles) {
            const filePath = path.join(_bFolder, file);
            const stat = fs.statSync(filePath);
            if (stat.isFile()) {
                fs.unlinkSync(filePath);
            }
            else if (stat.isDirectory()) {
                fs.rmSync(filePath, { recursive: true, force: true });
            }
        }
    }
    if (!fs.existsSync(_nFolder))
        return;
    const newFiles = fs.readdirSync(_nFolder);
    for (const file of newFiles) {
        const srcPath = path.join(_nFolder, file);
        const destPath = path.join(_bFolder, file);
        const stat = fs.statSync(srcPath);
        if (stat.isFile()) {
            fs.copyFileSync(srcPath, destPath);
        }
        else if (stat.isDirectory()) {
            copyFolderRecursive(srcPath, destPath);
        }
    }
}
function copyFolderRecursive(src, dest) {
    fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src);
    for (const entry of entries) {
        const srcPath = path.join(src, entry);
        const destPath = path.join(dest, entry);
        const stat = fs.statSync(srcPath);
        if (stat.isDirectory()) {
            copyFolderRecursive(srcPath, destPath);
        }
        else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}
export async function ReplaceArtginePathsInFolder(workFolder, upFolder, projPath) {
    try {
        if (!fs.existsSync(workFolder)) {
            console.error(`폴더가 존재하지 않습니다: ${workFolder}`);
            return;
        }
        const tsFiles = FindTSFiles(workFolder);
        if (tsFiles.length === 0) {
            console.log('처리할 TypeScript 파일이 없습니다.');
            return;
        }
        let processedCount = 0;
        let modifiedCount = 0;
        for (const filePath of tsFiles) {
            try {
                const modified = await ReplaceArtginePathsInFile(filePath, upFolder, projPath);
                processedCount++;
                if (modified) {
                    modifiedCount++;
                }
            }
            catch (error) {
                console.error(`❌ 파일 처리 실패 ${filePath}:`, error);
            }
        }
    }
    catch (error) {
        console.error('ReplaceArtginePathsInFolder 실행 중 오류:', error);
    }
}
function FindTSFiles(folderPath) {
    const tsFiles = [];
    const searchRecursive = (currentPath) => {
        const items = fs.readdirSync(currentPath);
        for (const item of items) {
            const fullPath = path.join(currentPath, item);
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
                if (!['node_modules', '.git', 'dist', 'build'].includes(item)) {
                    searchRecursive(fullPath);
                }
            }
            else if (stat.isFile() && item.endsWith('.ts')) {
                tsFiles.push(fullPath);
            }
        }
    };
    searchRecursive(folderPath);
    return tsFiles;
}
async function ReplaceArtginePathsInFile(filePath, upFolder, projPath) {
    try {
        let additionalLevels = 0;
        const originalContent = fs.readFileSync(filePath, 'utf8');
        if (upFolder.indexOf("http") == -1) {
            const normalizedFilePath = filePath.replace(/\\/g, '/');
            const normalizedProjPath = projPath.replace(/\\/g, '/');
            const filePathParts = normalizedFilePath.split('/');
            const projPathParts = normalizedProjPath.split('/');
            if (filePathParts.length > projPathParts.length) {
                additionalLevels = filePathParts.length - projPathParts.length - 1;
            }
        }
        const modifiedContent = originalContent.replace(/(["'])[^"']*?((?:artgine|plugin)\/[^"']+)/g, (match, quote, path) => {
            const cleanUpFolder = upFolder.replace(/\/+$/, '');
            const cleanPath = path.replace(/^\/+/, '');
            const upPath = '../'.repeat(additionalLevels);
            return `${quote}${upPath}${cleanUpFolder}/${cleanPath}`;
        });
        if (originalContent !== modifiedContent) {
            fs.writeFileSync(filePath, modifiedContent, 'utf8');
            return true;
        }
        return false;
    }
    catch (error) {
        console.error(`파일 처리 중 오류 ${filePath}:`, error);
        return false;
    }
}
