import { CClass } from "../basic/CClass.js";
import { CJSON } from "../basic/CJSON.js";
import { CObject } from "../basic/CObject.js";
import { CUtilObj } from "../basic/CUtilObj.js";
import { CVec2 } from "../geometry/CVec2.js";
import { CRenderPass } from "../render/CRenderPass.js";
import { CTexture } from "../render/CTexture.js";
import { CFile } from "../system/CFile.js";
import { CPaint } from "./component/paint/CPaint.js";
export class CRPAuto extends CRenderPass {
    mAutoTag = null;
    mAutoPaint = new Set();
    mCopy = true;
    PushAutoPaint(_name) {
        if (typeof _name == "string")
            this.mAutoPaint.add(_name);
        else
            this.mAutoPaint.add(_name.name);
    }
    PushAutoTag(_tag) {
        this.mAutoTag = _tag;
    }
    EditForm(_pointer, _body, _input) {
        super.EditForm(_pointer, _body, _input);
        if (_pointer.member == "mAutoTag")
            CUtilObj.NullEdit(_pointer, _body, _input, "");
        else if (_pointer.member == "mAutoPaint") {
            const paintList = CClass.ExtendsList(CPaint, true);
            const classNames = paintList;
            CUtilObj.ArrayAddSelectList(_pointer, _body, _input, classNames);
        }
    }
}
export class CRPMgr extends CObject {
    mCanvas = null;
    mRPArr = new Array();
    mSufArr = new Array();
    mTexMap = new Map();
    IsShould(_member, _type) {
        if (_member == "mCanvas") {
            return false;
        }
        return super.IsShould(_member, _type);
    }
    SetCanvas(_can) {
        this.mCanvas = _can;
        this.ReLoadTexture();
    }
    GetCanvas() { return this.mCanvas; }
    PushRP(_data) {
        this.mRPArr.push(_data);
        return _data;
    }
    PushSuf(_data) {
        this.mSufArr.push(_data);
        if (this.mCanvas != null) {
            let tex = new CTexture();
            this.mCanvas.GetFrame().Res().Push(_data.GetTexKey(), tex);
            tex.mFrameBuf.push(null);
        }
        return _data;
    }
    PushTex(_key, _data) {
        this.mTexMap.set(_key, _data);
        if (this.mCanvas != null) {
            this.mCanvas.GetFrame().Res().Push(_key, _data);
            _data.mFrameBuf.push(null);
        }
        return _key;
    }
    RemoveTex(_key) {
        this.mTexMap.delete(_key);
        if (this.mCanvas != null) {
            this.mCanvas.GetFrame().Res().Remove(_key);
        }
    }
    RemoveRP(_data) {
        for (let i = 0; i < this.mRPArr.length; ++i) {
            if (this.mRPArr[i] == _data) {
                this.mRPArr.splice(i, 1);
                return;
            }
        }
    }
    RemoveSuf(_data) {
        for (let i = 0; i < this.mSufArr.length; ++i) {
            if (this.mSufArr[i] == _data) {
                this.mSufArr.splice(i, 1);
                return;
            }
        }
    }
    SaveTexture() {
        for (let rp of this.mRPArr) {
            const texKey = rp.mRenderTarget;
            if (texKey == "" || this.mTexMap.has(texKey))
                continue;
            const tex = this.mCanvas.GetFrame().Res().Find(texKey);
            if (tex == null)
                continue;
            const newTex = new CTexture();
            newTex.SetSize(tex.GetWidth(), tex.GetHeight());
            newTex.SetResize(tex.GetRWidth(), tex.GetRHeight());
            newTex.SetAlpha(tex.GetAlpha());
            newTex.SetAnti(tex.GetAnti());
            newTex.SetFilter(tex.GetFilter());
            newTex.PushInfo(tex.GetInfo());
            if (tex.IsKey()) {
                newTex.SetKey(tex.Key());
            }
            newTex.SetMipMap(tex.GetMipMap());
            newTex.SetWrap(tex.GetWrap());
            this.mTexMap.set(texKey, newTex);
        }
    }
    ReLoadTexture() {
        if (this.mCanvas == null)
            return;
        for (let [key, tex] of this.mTexMap) {
            let size = null;
            if (tex.GetWidth() != 0 && tex.GetHeight() != 0) {
                size = new CVec2();
                size.x = tex.GetWidth();
                size.y = tex.GetHeight();
            }
            this.mCanvas.GetFrame().Ren().BuildRenderTarget(tex.GetInfo(), size, key);
        }
    }
    ExportCJSON() {
        this.SaveTexture();
        return super.ExportCJSON();
    }
    async LoadJSON(_file = null) {
        let buf = await CFile.Load(_file);
        if (buf == null)
            return true;
        this.ImportCJSON(new CJSON(buf));
        this.mCanvas.SetRPMgr(this);
        this.mCanvas.ClearBatch();
        this.SetCanvas(this.mCanvas);
        return false;
    }
    async SaveJSON(_file = null) {
        CFile.Save(this.ToStr(), _file);
    }
    EditHTMLInit(_div) {
        super.EditHTMLInit(_div);
        var button = document.createElement("button");
        button.innerText = "RPMgrTool";
        button.onclick = () => {
            if (window["RPMgrTool"] != null)
                window["RPMgrTool"](this);
        };
        _div.append(button);
    }
}
