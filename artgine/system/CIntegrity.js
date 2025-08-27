import * as fs from 'fs';
import * as path from 'path';
import { CHash } from '../basic/CHash.js';
export default class CIntegrity {
    static Exe(_input) {
        if (_input instanceof ArrayBuffer) {
            const str = Buffer.from(_input).toString('utf-8');
            return CHash.SHA256(str);
        }
        else {
            return CHash.SHA256(String(_input));
        }
    }
    static async ExeList(_fileList, _child = false) {
        const allFileHashes = [];
        for (const filePath of _fileList) {
            if (!fs.existsSync(filePath))
                continue;
            const stats = fs.statSync(filePath);
            if (stats.isFile()) {
                const fileHash = await this.HashFile(filePath);
                allFileHashes.push([filePath, fileHash]);
            }
            else if (stats.isDirectory() && _child) {
                const files = this.RecursiveFileList(filePath);
                for (const f of files) {
                    const fileHash = await this.HashFile(f);
                    allFileHashes.push([f, fileHash]);
                }
            }
        }
        allFileHashes.sort((a, b) => a[0].localeCompare(b[0]));
        const combined = allFileHashes.map(([name, hash]) => `${name}:${hash}`).join('\n');
        return CHash.SHA256(combined);
    }
    static async HashFile(filePath) {
        return new Promise((resolve, reject) => {
            fs.readFile(filePath, (err, data) => {
                if (err)
                    reject(err);
                else
                    resolve(CHash.SHA256(data.toString()));
            });
        });
    }
    static RecursiveFileList(dir) {
        const result = [];
        const walk = (currentPath) => {
            const entries = fs.readdirSync(currentPath);
            for (const entry of entries) {
                const fullPath = path.join(currentPath, entry);
                const stats = fs.statSync(fullPath);
                if (stats.isFile()) {
                    result.push(fullPath);
                }
                else if (stats.isDirectory()) {
                    walk(fullPath);
                }
            }
        };
        walk(dir);
        return result;
    }
}
