import * as fs from 'fs';
import * as path from 'path';
const gPacketJSON = "proj/2D/Shooting/CPacShooting.ts";
const gArtgineClass = "artgine/artgine.ts";
const gGetSet = false;
const fileContent = fs.readFileSync(gPacketJSON, 'utf8');
const entryIndex = fileContent.indexOf("//EntryPoint");
if (entryIndex === -1)
    throw new Error("EntryPoint 주석을 찾을 수 없습니다.");
const entryCode = fileContent.slice(entryIndex);
const staticFuncs = [];
const funcRegex = /function\s+([a-zA-Z0-9_]+)\s*\(([^\)]*)\)\s*:\s*([^{\n]+)\s*\{([\s\S]*?)^\}/gm;
let match;
while ((match = funcRegex.exec(entryCode)) !== null) {
    const [, name, params, returnType, body] = match;
    staticFuncs.push(`\n    static ${name}(${params}): ${returnType} {\n${body}\n    }`);
}
const jsonMatch = entryCode.match(/var\s+json\s*=\s*(\{[\s\S]*?\});/);
if (!jsonMatch)
    throw new Error("var json 정의를 찾을 수 없습니다.");
const packetData = JSON.parse(jsonMatch[1].replace(/,\s*([}\]])/g, '$1'));
const className = path.basename(gPacketJSON, '.ts');
const outputDir = path.dirname(gPacketJSON);
const artgineContent = fs.readFileSync(gArtgineClass, 'utf8');
const importMatches = artgineContent.matchAll(/import\s+\{([^}]+)\}\s+from\s+['"](.+?)\.js['"]/g);
const classToPath = {};
for (const match of importMatches) {
    const classes = match[1].split(',').map(c => c.trim());
    for (const cls of classes) {
        classToPath[cls] = match[2];
    }
}
const usedTypes = new Set();
Object.values(packetData).forEach((params) => {
    Object.values(params).forEach((type) => usedTypes.add(type));
});
usedTypes.add("CStream");
const importSet = new Set();
importSet.add(`import { CStream } from "../../../artgine/basic/CStream.js";`);
for (const type of usedTypes) {
    if (type === "CStream")
        continue;
    const relPath = classToPath[type];
    if (!relPath)
        continue;
    const fullPath = path.relative(outputDir, path.resolve(path.dirname(gArtgineClass), relPath)).replace(/\\/g, '/');
    const fixedPath = (fullPath.startsWith('.') ? fullPath : './' + fullPath) + `.js`;
    importSet.add(`import { ${type} } from "${fixedPath}";`);
}
function Create(className, methods) {
    let output = '';
    output += Array.from(importSet).join('\n') + '\n\n';
    output += `export class ${className} {\n`;
    const headerLines = Object.keys(methods)
        .map(key => `        "${key}": "${key}"`)
        .join(',\n');
    output += `    static eHeader = {\n${headerLines}\n    };\n`;
    for (const [funcName, paramMap] of Object.entries(methods)) {
        const paramNames = Object.keys(paramMap);
        const paramTypes = Object.values(paramMap);
        const args = paramNames.map((k, i) => `${k}: ${paramTypes[i]}`).join(', ');
        const returnObj = paramNames.map((k, i) => `${k}: ${paramTypes[i]}`).join(', ');
        const overloadArgs = [`${paramNames[0]}: ${paramTypes[0]} | CStream`]
            .concat(paramNames.slice(1).map((k, i) => `${k}: ${paramTypes[i + 1]} | null = null`))
            .join(', ');
        const pushArgs = paramNames.map(p => `.Push(${p})`).join('');
        output += `
    static ${funcName}(${args}): CStream;
    static ${funcName}(_stream: CStream): {${returnObj}};
    static ${funcName}(${overloadArgs}): any {
        if (${paramNames[0]} instanceof CStream) {
            return ${paramNames[0]}.GetPacket(${paramNames.map(k => `"${k}"`).join(', ')});
        }
        return new CStream().Push("${funcName}")${pushArgs};
    }\n`;
    }
    for (const staticFunc of staticFuncs) {
        output += staticFunc + '\n';
    }
    output += `}\n`;
    output += entryCode;
    const filePath = path.resolve(outputDir, `${className}.ts`);
    fs.writeFileSync(filePath, output, 'utf8');
    console.log(`✅ Created: ${filePath}`);
}
Create(className, packetData);
