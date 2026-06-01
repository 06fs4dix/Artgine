import { CAlert } from "../basic/CAlert.js";
import { CObject } from "../basic/CObject.js";
import { CUtil } from "../basic/CUtil.js";
import { CUtilWeb } from "./CUtilWeb.js";
var gScriptMap = new Map();
export class CScript extends CObject {
    static async Build(_key, _source, _github = false) {
        if (!gScriptMap.has(_key)) {
            gScriptMap.set(_key, null);
            try {
                if (CUtil.IsNode()) {
                    const fs = await import('fs');
                    const path = await import('path');
                    if (_source.endsWith('.js') && !_source.includes('import')) {
                        const filePath = _source;
                        if (fs.default.existsSync(filePath)) {
                            let importPath = filePath;
                            if (filePath.match(/^[A-Za-z]:/)) {
                                importPath = `file:///${filePath.replace(/\\/g, '/')}`;
                            }
                            const module = await import(`${importPath}?update=${Date.now()}`);
                            gScriptMap.set(_key, module);
                        }
                        else {
                            console.error(`파일을 찾을 수 없음: ${filePath}`);
                            return null;
                        }
                    }
                    else {
                        if (_source.indexOf(":") != -1)
                            _source = await CUtilWeb.TSToJS(_source);
                        _source = "//@sourceURL=" + _key + ".js\n" + _source;
                        const moduleCode = _source;
                        const tempFile = path.default.join(process.cwd(), `temp_${_key}.js`);
                        fs.default.writeFileSync(tempFile, moduleCode);
                        let importPath = tempFile;
                        if (tempFile.match(/^[A-Za-z]:/)) {
                            importPath = `file:///${tempFile.replace(/\\/g, '/')}`;
                        }
                        const module = await import(importPath);
                        gScriptMap.set(_key, module);
                        if (!global.__importCache) {
                            global.__importCache = new Map();
                        }
                        global.__importCache.set(importPath, module);
                        fs.default.unlinkSync(tempFile);
                    }
                }
                else {
                    _source = await CUtilWeb.TSImport(_source, false, _github);
                    if (_source.indexOf(":") != -1)
                        _source = await CUtilWeb.TSToJS(_source);
                    _source = "//@sourceURL=" + _key + ".js\n" + _source;
                    const blob = new Blob([_source], { type: 'text/javascript' });
                    const url = URL.createObjectURL(blob);
                    const module = await import(url);
                    gScriptMap.set(_key, module);
                    URL.revokeObjectURL(url);
                }
            }
            catch (error) {
                CAlert.E(`
                    오류 메시지 : ${error.message}<br>
                    오류 스택: ${error.stack}<br>
                    오류 타입: ${typeof error}<br>
                    오류 내용: ${error}<br>
                `);
                return null;
            }
        }
        const module = gScriptMap.get(_key);
        if (module)
            return module;
        return null;
    }
    static Remove(_key) {
        gScriptMap.delete(_key);
    }
    static Clear() {
        const keys = Array.from(gScriptMap.keys());
        for (const key of keys) {
            CScript.Remove(key);
        }
    }
    mSource = `
import {CObject} from "artgine/basic/CObject.js"
import {CConsol} from "artgine/basic/CConsol.js"
import {CSubject} from "artgine/app/subject/CSubject.js"



export function main(_data : any)
{   
    return null;
}
`;
    mActiveFun = "main";
    mKey = "";
    mGitHub = false;
    async Exe(_parameter = null) {
        if (this.mSource == "")
            return;
        let moudle = await CScript.Build(this.mKey, this.mSource, this.mGitHub);
        if (moudle == null)
            return;
        if (moudle[this.mActiveFun] == null) {
            for (let first in moudle) {
                this.mActiveFun = first;
                break;
            }
            if (moudle[this.mActiveFun] == null)
                return;
        }
        try {
            let next = moudle[this.mActiveFun](_parameter == null ? this : _parameter);
            if (next != null)
                this.mActiveFun = next;
        }
        catch (error) {
            CAlert.E(`
                오류 메시지 : ${error.message}<br>
                오류 스택: ${error.stack}<br>
                오류 타입: ${typeof error}<br>
                오류 내용: ${error}<br>
            `);
            gScriptMap.set(this.mKey, null);
        }
    }
    EditHTMLInit(_div) {
        super.EditHTMLInit(_div);
        var button = document.createElement("button");
        button.innerText = "ScriptTool";
        button.onclick = () => {
            if (window["ScriptTool"] != null)
                window["ScriptTool"](this);
        };
        _div.append(button);
    }
    IsShould(_member, _type) {
        if (_member == "mKey" || _member == "mData")
            return false;
        return super.IsShould(_member, _type);
    }
}
