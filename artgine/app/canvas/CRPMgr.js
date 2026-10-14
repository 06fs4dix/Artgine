import { CUpdate } from "../../basic/Basic.js";
import { CDOM } from "../../basic/CDOM.js";
import { CJSON } from "../../basic/CJSON.js";
import { CObject } from "../../basic/CObject.js";
import { CRenderPass } from "../../render/CRenderPass.js";
import { CFile } from "../../system/CFile.js";
export class CRPAuto extends CRenderPass {
    static eState = {
        "class": "class",
        "mTag": "mTag",
    };
    mAnd = new Array();
    mOr = new Array();
    mCopy = false;
    PushAnd(_con) {
        this.mAnd.push(_con);
    }
    PushOr(_con) {
        if (_con instanceof Array)
            this.mOr.push(..._con);
        else
            this.mOr.push(_con);
    }
}
export class CRPMgr extends CObject {
    mRPArr = new Array();
    mSufArr = new Array();
    mTexMap = new Map();
    mUpdate = CUpdate.eType.Not;
    IsShould(_member, _type) {
        if (_member == "mUpdate")
            return false;
        return super.IsShould(_member, _type);
    }
    PushRP(_data) {
        this.mRPArr.push(_data);
        this.mUpdate = CUpdate.eType.Updated;
        return _data;
    }
    PushSuf(_data) {
        this.mSufArr.push(_data);
        this.mUpdate = CUpdate.eType.Updated;
        return _data;
    }
    PushTex(_key, _data) {
        this.mTexMap.set(_key, _data);
        this.mUpdate = CUpdate.eType.Updated;
        return _key;
    }
    RemoveRP(_data) {
        const i = this.mRPArr.indexOf(_data);
        if (i >= 0)
            this.mRPArr.splice(i, 1);
    }
    RemoveSuf(_data) {
        const i = this.mSufArr.indexOf(_data);
        if (i >= 0)
            this.mSufArr.splice(i, 1);
    }
    RemoveTex(_key) {
        this.mTexMap.delete(_key);
    }
    async LoadJSON(_file = null) {
        let buf = await CFile.Load(_file);
        if (buf == null)
            return true;
        this.ImportCJSON(new CJSON(buf));
        return false;
    }
    async SaveJSON(_file = null) {
        CFile.Save(this.ToStr(), _file);
    }
    EditHTMLInit(_div) {
        super.EditHTMLInit(_div);
        var button = CDOM.TagToDom("button");
        button.innerText = "RPMgrTool";
        button.onclick = () => {
            if (window["RPMgrTool"] != null)
                window["RPMgrTool"](this);
        };
        _div.append(button);
    }
}
