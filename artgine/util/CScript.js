import { CEvent } from "../basic/CEvent.js";
import { CObject } from "../basic/CObject.js";
import { CUtil } from "../basic/CUtil.js";
import { CTimer } from "../system/CTimer.js";
import { CUtilWeb } from "./CUtilWeb.js";
var gScriptMap = new Map();
export class CScript extends CObject {
    static async Build(_key, _source) {
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
                    _source = await CUtilWeb.TSImport(_source, false);
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
                console.error(`CScript.Exe 컴파일 오류 (${_key}):`, error);
                if (error instanceof Error) {
                    console.error(`오류 메시지: ${error.message}`);
                    console.error(`오류 스택: ${error.stack}`);
                }
                else {
                    console.error(`오류 타입: ${typeof error}`);
                    console.error(`오류 내용:`, error);
                }
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
    static Action(_data, _event, count = 0, delay = 0, start = 0, end = 0) {
        let run = _data[0]["mTemp"]["mRun"];
        let timer;
        if (_data[0]["mTemp"]["mTimer"] == null) {
            _data[0]["mTemp"]["mTimer" + run] = new CTimer();
            _data[0]["mTemp"]["mCount" + run] = 0;
            _data[0]["mTemp"]["mTime" + run] = 0;
            _data[0]["mTemp"]["mDelay" + run] = 0;
        }
        timer = _data[0]["mTemp"]["mTimer" + run];
        let t = timer.Delay();
        _data[0]["mTemp"]["mDelay" + run] = _data[0]["mTemp"]["mDelay" + run] + t;
        _data[0]["mTemp"]["mTime" + run] = _data[0]["mTemp"]["mTime" + run] + t;
        if (count != 0 && _data[0]["mTemp"]["mCount" + run] > count)
            return;
        if (delay != 0 && _data[0]["mTemp"]["mDelay" + run] < delay)
            return;
        if (_data[0]["mTemp"]["mTime" + run] < start)
            return;
        if (end != 0 && _data[0]["mTemp"]["mTime" + run] > end)
            return;
        _data[0]["mTemp"]["mDelay" + run] = _data[0]["mTemp"]["mDelay" + run] - delay;
        _data[0]["mTemp"]["mCount" + run] = _data[0]["mTemp"]["mCount" + run] + 1;
        if (_event instanceof CEvent)
            _event.Call();
        else
            _event();
    }
    static Value(_data, _key, _val = 0, _off = 0) {
        if (_data[_off][_key] == null)
            return 0;
        _data[_off][_key] = _val;
        return _data[_off][_key];
    }
    mSource = `
import {CScript} from "artgine/util/CScript.js"
export function main(_data : Array<any>)
{   
    return null;
}
`;
    mActiveFun = "main";
    mKey = "";
    mData = [{}];
    async Exe() {
        if (this.mSource == "")
            return;
        let moudle = await CScript.Build(this.mKey, this.mSource);
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
        if (this.mData[0]["mTemp"] == null)
            this.mData[0]["mTemp"] = {};
        this.mData[0]["mTemp"]["mRun"] = 0;
        try {
            let next = moudle[this.mActiveFun](this.mData);
            if (next != null)
                this.mActiveFun = next;
        }
        catch (error) {
            console.error(`CScript.Exe 런타임 오류 (${this.mKey}.${this.mActiveFun}):`, error);
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
