import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const baseFolder = path.resolve(__dirname, "../artgine");
const outputFile = path.join(baseFolder, "artgine.ts");
const targetDirs = ['basic', 'canvas', 'geometry', 'render', 'system', 'util', 'tool'];
const entries = [];
const excludeClasses = ['CClass', 'CFrame', 'CBrush'];
const excludeFiles = ['CTooltip.ts', 'CModalUtil.ts'];
function collectTSFiles(dir) {
    let tsFiles = [];
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
        const fullPath = path.join(dir, item.name);
        if (item.isDirectory()) {
            tsFiles = tsFiles.concat(collectTSFiles(fullPath));
        }
        else if (item.isFile() && fullPath.endsWith('.ts')) {
            tsFiles.push(fullPath);
        }
    }
    return tsFiles;
}
for (const subDir of targetDirs) {
    const fullPath = path.join(baseFolder, subDir);
    if (!fs.existsSync(fullPath))
        continue;
    const tsFiles = collectTSFiles(fullPath);
    for (const filePath of tsFiles) {
        const fileName = path.basename(filePath);
        if (excludeFiles.includes(fileName)) {
            console.log(`❌ 제외 파일: ${fileName}`);
            continue;
        }
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split(/\r?\n/).filter(line => !line.trim().startsWith('//'));
        const validContent = lines.join('\n');
        const matches = [
            ...validContent.matchAll(/export\s+class\s+(\w+)/g),
            ...validContent.matchAll(/export\s+function\s+(\w+)/g),
        ];
        for (const match of matches) {
            const className = match[1];
            if (excludeClasses.includes(className) || entries.some(e => e.className === className))
                continue;
            const relativePath = path.relative(baseFolder, filePath).replace(/\.ts$/, '.js').replace(/\\/g, '/');
            entries.push({ importPath: `./${relativePath}`, className });
        }
    }
}
let output = '';
output += `import { CClass } from "./basic/CClass.js";\n`;
for (const entry of entries) {
    output += `import { ${entry.className} } from "${entry.importPath}";\n`;
}
output += `\n`;
for (const entry of entries) {
    output += `CClass.Push(${entry.className});\n`;
}
fs.writeFileSync(outputFile, output, 'utf-8');
console.log(`✅ 클래스 등록 파일 생성 완료: ${outputFile}`);
