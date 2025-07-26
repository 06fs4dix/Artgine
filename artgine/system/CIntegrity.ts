import * as fs from 'fs';
import * as path from 'path';
import {CHash} from '../basic/CHash.js';


export default class CIntegrity {
    /** 단일 해시 */
    static Exe(_input: ArrayBuffer | string | number): string {
        if (_input instanceof ArrayBuffer) {
            const str = Buffer.from(_input).toString('utf-8');
            return CHash.SHA256(str);
        } else {
            return CHash.SHA256(String(_input));
        }
    }

    /** 무결성 검사 - 파일/폴더 목록 */
    static async ExeList(_fileList: Array<string>, _childe = false): Promise<string> {
        const allFileHashes: [string, string][] = [];

        for (const filePath of _fileList) {
            if (!fs.existsSync(filePath)) continue;

            const stats = fs.statSync(filePath);
            if (stats.isFile()) {
                const fileHash = await this.HashFile(filePath);
                allFileHashes.push([filePath, fileHash]);
            } else if (stats.isDirectory() && _childe) {
                const files = this.RecursiveFileList(filePath);
                for (const f of files) {
                    const fileHash = await this.HashFile(f);
                    allFileHashes.push([f, fileHash]);
                }
            }
        }

        // 정렬 후 전체 파일이름+해시 문자열 병합
        allFileHashes.sort((a, b) => a[0].localeCompare(b[0]));
        const combined = allFileHashes.map(([name, hash]) => `${name}:${hash}`).join('\n');

        return CHash.SHA256(combined);
    }

    /** 파일 내용 해시 */
    private static async HashFile(filePath: string): Promise<string> {
        return new Promise((resolve, reject) => {
            fs.readFile(filePath, (err, data) => {
                if (err) reject(err);
                else resolve(CHash.SHA256(data.toString()));
            });
        });
    }

    /** 폴더 내부 파일 목록 재귀 탐색 */
    private static RecursiveFileList(dir: string): string[] {
        const result: string[] = [];

        const walk = (currentPath: string) => {
            const entries = fs.readdirSync(currentPath);
            for (const entry of entries) {
                const fullPath = path.join(currentPath, entry);
                const stats = fs.statSync(fullPath);
                if (stats.isFile()) {
                    result.push(fullPath);
                } else if (stats.isDirectory()) {
                    walk(fullPath);
                }
            }
        };

        walk(dir);
        return result;
    }
}
