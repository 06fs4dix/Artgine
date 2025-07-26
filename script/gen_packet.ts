import * as fs from 'fs';
import * as path from 'path';

const gPacketJSON = "proj/2D/Shooting/CPacShooting.ts";
const gArtgineClass = "artgine/artgine.ts";
const gGetSet = false;

// 1. EntryPoint 이후 코드 추출
const fileContent = fs.readFileSync(gPacketJSON, 'utf8');
const entryIndex = fileContent.indexOf("//EntryPoint");
if (entryIndex === -1) throw new Error("EntryPoint 주석을 찾을 수 없습니다.");
const entryCode = fileContent.slice(entryIndex);

// 1-2. function 코드 추출 → static으로 변환
const staticFuncs: string[] = [];
const funcRegex = /function\s+([a-zA-Z0-9_]+)\s*\(([^\)]*)\)\s*:\s*([^{\n]+)\s*\{([\s\S]*?)^\}/gm;
let match;
while ((match = funcRegex.exec(entryCode)) !== null) {
    const [, name, params, returnType, body] = match;
    staticFuncs.push(`\n    static ${name}(${params}): ${returnType} {\n${body}\n    }`);
}

// 2. var json = {...}; 추출 (세미콜론 포함 전제)
const jsonMatch = entryCode.match(/var\s+json\s*=\s*(\{[\s\S]*?\});/);
if (!jsonMatch) throw new Error("var json 정의를 찾을 수 없습니다.");

const packetData: Record<string, Record<string, string>> = JSON.parse(
    jsonMatch[1].replace(/,\s*([}\]])/g, '$1') // 끝 쉼표 제거
);

// 3. 클래스 이름 및 경로
const className = path.basename(gPacketJSON, '.ts');
const outputDir = path.dirname(gPacketJSON);

// 4. artgine.ts에서 타입별 경로 추출
const artgineContent = fs.readFileSync(gArtgineClass, 'utf8');
const importMatches = artgineContent.matchAll(/import\s+\{([^}]+)\}\s+from\s+['"](.+?)\.js['"]/g);

const classToPath: Record<string, string> = {};
for (const match of importMatches) {
    const classes = match[1].split(',').map(c => c.trim());
    for (const cls of classes) {
        classToPath[cls] = match[2];
    }
}

// 5. 타입 수집
const usedTypes = new Set<string>();
Object.values(packetData).forEach((params) => {
    Object.values(params).forEach((type) => usedTypes.add(type));
});
usedTypes.add("CStream");

// 6. import 구문 생성
const importSet = new Set<string>();
importSet.add(`import { CStream } from "../../../artgine/basic/CStream.js";`);
for (const type of usedTypes) {
    if (type === "CStream") continue;
    const relPath = classToPath[type];
    if (!relPath) continue;

    const fullPath = path.relative(outputDir, path.resolve(path.dirname(gArtgineClass), relPath)).replace(/\\/g, '/');
    const fixedPath = (fullPath.startsWith('.') ? fullPath : './' + fullPath) + `.js`;
    importSet.add(`import { ${type} } from "${fixedPath}";`);
}

// 7. 클래스 코드 생성
function Create(className: string, methods: Record<string, Record<string, string>>) {
    let output = '';

    // import 추가
    output += Array.from(importSet).join('\n') + '\n\n';
    output += `export class ${className} {\n`;

    // static eHeader 생성
    const headerLines = Object.keys(methods)
        .map(key => `        "${key}": "${key}"`)
        .join(',\n');

    output += `    static eHeader = {\n${headerLines}\n    };\n`;

    // 함수 생성
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

    // 추출된 static 함수 삽입
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
