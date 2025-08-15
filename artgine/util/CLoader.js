import { CTexture } from "../render/CTexture.js";
import { CJSON } from "../basic/CJSON.js";
import { CH5Canvas } from "../render/CH5Canvas.js";
import { CString } from "../basic/CString.js";
import { CHash } from "../basic/CHash.js";
import { CPath } from "../basic/CPath.js";
import { CParserTGA } from "./parser/CParserTGA.js";
import { CParserFBX } from "./parser/CParserFBX.js";
import { CObject } from "../basic/CObject.js";
import { CUtilObj } from "../basic/CUtilObj.js";
import { CAlert } from "../basic/CAlert.js";
import { CUtil } from "../basic/CUtil.js";
import CParserGLTF from "./parser/CParserGLTF.js";
import { CParserIMG } from "./parser/CParserIMG.js";
import { CChecker } from "./CChecker.js";
import { CFile } from "../system/CFile.js";
export class CLoaderOption extends CObject {
    mAutoLoad = true;
    mFilter = CTexture.eFilter.Linear;
    mWrap = CTexture.eWrap.Repeat;
    mMipMap = CTexture.eMipmap.GL;
    mAlphaCut = 0x09;
    mCache = null;
    mInch = false;
    EditForm(_pointer, _div, _input) {
        if (_pointer.member == "mMipMap") {
            let textArr = [], valArr = [];
            for (let [text, val] of Object.entries(CTexture.eMipmap)) {
                if (typeof val === "number") {
                    textArr.push(text);
                    valArr.push(val);
                }
            }
            _div.append(CUtilObj.Select(_pointer, _input, textArr, valArr));
        }
        else if (_pointer.member == "mWrap") {
            let textArr = [], valArr = [];
            for (let [text, val] of Object.entries(CTexture.eWrap)) {
                if (typeof val === "number") {
                    textArr.push(text);
                    valArr.push(val);
                }
            }
            _div.append(CUtilObj.Select(_pointer, _input, textArr, valArr));
        }
        else if (_pointer.member == "mFilter") {
            let textArr = [], valArr = [];
            for (let [text, val] of Object.entries(CTexture.eFilter)) {
                if (typeof val === "number") {
                    textArr.push(text);
                    valArr.push(val);
                }
            }
            _div.append(CUtilObj.Select(_pointer, _input, textArr, valArr));
        }
    }
}
export class CLoader {
    mLoadSet = new Set();
    mRender = null;
    mRes = null;
    constructor(_renderer, _res) {
        this.mRender = _renderer;
        this.mRes = _res;
    }
    IsLoad(_key) {
        if (this.mRes.Find(_key) != null)
            return true;
        return this.mLoadSet.has(_key);
    }
    LoadSet() { return this.mLoadSet; }
    LoadCompleteChk() {
        return this.mLoadSet.size == 0;
    }
    async LoadSwitch(_file, _buffer, _option) {
        if (_option != null && _option.mCache != null)
            CFile.PushCache(_option.mCache, _buffer);
        var pos = _file.lastIndexOf(".") + 1;
        var ext = _file.substr(pos, _file.length - pos).toLowerCase();
        if (ext == "png" || ext == "jpg" || ext == "jpeg" || ext == "tga" || ext == "gif") {
            return await this.TextureLoad(_file, _buffer, _option);
        }
        else if (ext == "ts") {
            await this.ShaderLoad(_file, _buffer);
            this.mLoadSet.delete(_file);
        }
        else if (ext == "mp3" || ext == "ogg") {
            this.SoundLoad(_file, _buffer);
            this.mLoadSet.delete(_file);
        }
        else if (ext == "mp4" || ext == "webm") {
            this.VideoLoad(_file, _buffer);
        }
        else if (ext == "fbx" || ext == "gltf" || ext == "glb") {
            await this.MeshLoad(_file, _buffer, _option);
            this.mLoadSet.delete(_file);
        }
        else if (ext == "json") {
            await this.JSONLoad(_file, _buffer, _option);
            this.mLoadSet.delete(_file);
        }
        else if (ext == "js") {
            await this.JSLoad(_file);
        }
        else if (ext == "zip") {
            if (window["JSZip"] == null) {
                CAlert.E("JSZip not define!");
                return;
            }
            var rootPath = "";
            var spos = _file.lastIndexOf("/");
            var fileName = _file;
            if (spos != -1) {
                rootPath = _file.substr(0, spos) + "/";
            }
            let zip = await window["JSZip"].loadAsync(_buffer);
            let flieList = new Array();
            zip.loader = this;
            let readPromises = [];
            zip.forEach((relativePath, entry) => {
                if (entry.dir == false) {
                    let ext = CString.ExtCut(entry.name);
                    if (ext.ext == "bin") {
                        readPromises.push(zip.file(entry.name).async("arraybuffer").then(data => {
                            this.mRes.Push(rootPath + entry.name, data);
                        }));
                    }
                }
            });
            await Promise.all(readPromises);
            zip.forEach((relativePath, entry) => {
                flieList.push(rootPath + entry.name);
                if (entry.dir == false) {
                    zip.file(entry.name).async("arraybuffer").then((data) => {
                        this.mLoadSet.add(rootPath + entry.name);
                        let ext = CString.ExtCut(entry.name);
                        if (ext.ext == "fbx" || ext.ext == "gltf" || ext.ext == "glb") {
                            let opcopy;
                            if (_option)
                                opcopy = _option.Export();
                            else
                                opcopy = new CLoaderOption();
                            opcopy.textureLoad = false;
                            zip.loader.LoadSwitch(rootPath + entry.name, data, opcopy);
                        }
                        else
                            zip.loader.LoadSwitch(rootPath + entry.name, data, _option);
                    });
                }
            });
            this.mRes.Push(fileName, flieList);
            this.mLoadSet.delete(_file);
        }
        else if (ext == "bin") {
            return new Promise((resolve, reject) => {
                this.mRes.Push(_file, _buffer);
                this.mLoadSet.delete(_file);
                resolve("");
            });
        }
        else
            CAlert.E(_file + "미지원");
    }
    async Load(_file, _option = null) {
        if (_file == "")
            return true;
        if (_file instanceof Array) {
            var parr = new Array();
            for (var eahc0 of _file) {
                parr.push(this.Load(eahc0, _option));
            }
            parr = await Promise.all(parr);
            return parr.includes(true);
        }
        if (null != this.mRes.Find(_file))
            return false;
        if (this.mLoadSet.has(_file)) {
            await CChecker.Exe(async () => {
                if (null != this.mRes.Find(_file))
                    return false;
                return true;
            });
        }
        this.mLoadSet.add(_file);
        var pos = _file.lastIndexOf(".") + 1;
        var ext = _file.substr(pos, _file.length - pos).toLowerCase();
        if (ext == "png" || ext == "jpg" || ext == "jpeg") {
            await this.TextureLoad(_file, _file, _option);
        }
        else if (ext == "mp4") {
            this.VideoLoad(_file, null);
        }
        else if (ext == "tex" || ext == "rgba" || ext == "mesh") {
            this.mLoadSet.delete(_file);
            return false;
        }
        else if (ext == "js" || ext == "jsm") {
            await this.JSLoad(_file);
        }
        let buf = await CFile.Load(_file);
        if (buf == null) {
            this.mLoadSet.delete(_file);
            return true;
        }
        await this.LoadSwitch(_file, buf, _option);
        return false;
    }
    async TextureLoad(_file, _buffer, _option) {
        if (_option == null)
            _option = new CLoaderOption();
        let tex = new CTexture();
        tex.SetFilter(_option.mFilter);
        tex.SetWrap(_option.mWrap);
        tex.SetMipMap(_option.mMipMap);
        tex.SetSize(1, 1);
        tex.CreateBuf();
        if (this.mRender != null)
            this.mRender.BuildTexture(tex);
        var pos = _file.lastIndexOf(".") + 1;
        var ext = _file.substr(pos, _file.length - pos).toLowerCase();
        var par = null;
        if (ext != "tga")
            par = new CParserIMG();
        else
            par = new CParserTGA();
        par.mAlphaCut = _option.mAlphaCut;
        if (typeof _buffer != "string")
            par.SetBuffer(new Uint8Array(_buffer), _buffer.byteLength);
        await par.Load(_file);
        if (par.GetResult() != null) {
            par.GetResult().SetFilter(_option.mFilter);
            par.GetResult().SetWrap(_option.mWrap);
            par.GetResult().SetMipMap(_option.mMipMap);
            if (this.mRender != null) {
                this.mRender.BuildTexture(par.GetResult());
                this.mRender.ReleaseTexture(tex);
            }
        }
        this.mLoadSet.delete(_file);
        this.mRes.Push(_file, par.GetResult());
    }
    async ShaderLoad(_file, _buffer) {
        if (this.mRender == null)
            return;
        var text = '';
        var bytes = new Uint8Array(_buffer);
        var len = bytes.byteLength;
        for (var i = 0; i < len; i++) {
            text += String.fromCharCode(bytes[i]);
        }
        let shaMgr = this.mRender.SInter().New();
        await shaMgr.Exe(_file, text);
        let sl = shaMgr.GetShaderList();
        this.mRes.Push(_file, sl);
        for (var each01 of sl.mShader) {
            this.mRes.Push(each01.mKey, each01);
        }
    }
    async MeshLoad(_file, _buffer, _option) {
        _option = _option ?? new CLoaderOption();
        var pos = _file.lastIndexOf(".") + 1;
        var ext = _file.substr(pos, _file.length - pos).toLowerCase();
        var par = null;
        if (ext == "fbx")
            par = new CParserFBX();
        else
            par = new CParserGLTF(_option.mInch);
        par.SetBuffer(new Uint8Array(_buffer), _buffer.byteLength);
        await par.Load(_file);
        var mesh = par.GetResult();
        this.mRes.Push(_file, mesh);
        let texMap = new Map();
        for (let i = 0; i < mesh.texture.length; i++) {
            if (mesh.texture[i].indexOf("base64:") != -1) {
                let tex = mesh.texture[i];
                let base64Header = "base64:";
                var base64data = tex.substring(base64Header.length);
                let newName = CHash.SHA256(base64data) + ".png";
                mesh.texture[i] = newName;
                this.mLoadSet.add(newName);
                texMap.set(newName, CUtil.Base64ToArray(base64data));
            }
            else if (mesh.texture[i].indexOf(".rgba") != -1) {
                let ne = CString.ExtCut(mesh.texture[i]);
                CH5Canvas.Init(1, 1);
                var para = [CH5Canvas.Cmd("fillStyle", ne.name), CH5Canvas.Cmd("fillRect", [0, 0, 1, 1])];
                CH5Canvas.Draw(para);
                var tex = CH5Canvas.GetNewTex();
                this.mRender.BuildTexture(tex);
                this.mRes.Push(mesh.texture[i], tex);
            }
            else
                await this.Load(mesh.texture[i], _option);
        }
        for (let [key, value] of texMap) {
            await this.LoadSwitch(key, value, _option);
        }
    }
    VideoLoad(_file, _buffer) {
        this.mLoadSet.delete(_file);
        var video = document.createElement('video');
        video.autoplay = true;
        video.muted = true;
        video.loop = true;
        video.playsInline = true;
        video.crossOrigin = "anonymous";
        var pos = _file.lastIndexOf(".") + 1;
        var ext = _file.substr(pos, _file.length - pos);
        var url = null;
        if (_buffer == null) {
            url = _file;
        }
        else {
            let blob = new Blob([_buffer], { type: "video/" + ext });
            url = window.URL.createObjectURL(blob);
        }
        video.src = url;
        video.load();
        this.mRender.BuildVideo(video, _file);
    }
    SoundLoad(_file, _buffer) {
        this.mRes.Push(_file, _buffer);
    }
    async JSONLoad(_file, _buffer, _op) {
        var str = CUtil.ArrayToString(_buffer);
        var jData = new CJSON(str);
        this.mRes.Push(_file, jData);
    }
    async JSLoad(_file) {
        this.mLoadSet.delete(_file);
        let _classic = false;
        return new Promise(async (resolve, reject) => {
            let loadFun = () => {
                resolve("");
            };
            if (_file.indexOf("css") != -1) {
                var link = document.createElement('link');
                link.href = _file;
                link.crossOrigin = "anonymous";
                link.onload = loadFun;
                var head = document.getElementsByTagName('head')[0];
                head.appendChild(link);
            }
            else {
                if (_classic) {
                    var head = document.getElementsByTagName('head')[0];
                    var script = document.createElement('script');
                    if (_file.indexOf("jsm") != -1)
                        script.type = 'module';
                    else
                        script.type = 'text/javascript';
                    script.src = _file;
                    script.defer = true;
                    script.async = false;
                    script.crossOrigin = "anonymous";
                    script.onload = loadFun;
                    head.appendChild(script);
                }
                else {
                    import(CPath.PHPCR() + _file).then((_im) => {
                        for (var each0 in _im) {
                            window[each0] = _im[each0];
                        }
                        loadFun();
                    });
                }
            }
        });
    }
}
