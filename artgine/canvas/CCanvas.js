import { CSubject } from "./subject/CSubject.js";
import { CMath } from "../geometry/CMath.js";
import { CJSON } from "../basic/CJSON.js";
import { CArray } from "../basic/CArray.js";
import { CString } from "../basic/CString.js";
import { CUniqueID } from "../basic/CUniqueID.js";
import { CBase64File } from "../util/CBase64File.js";
import { CGlobalGeometryInfo } from "./component/CGlobalGeometryInfo.js";
import { CCollider } from "./component/CCollider.js";
import { CAtlas } from "../util/CAtlas.js";
import { CUpdate } from "../basic/Basic.js";
import { CDomFactory } from "../basic/CDOMFactory.js";
import { CRoomClient } from "../server/CRoomClient.js";
import { CBlackBoardRef, CObject } from "../basic/CObject.js";
import { CClass } from "../basic/CClass.js";
import { CUtil } from "../basic/CUtil.js";
import { CAlert } from "../basic/CAlert.js";
import { CUtilObj } from "../basic/CUtilObj.js";
import { CFile } from "../system/CFile.js";
import { RenderQueTool } from "../tool/RenderQueTool.js";
import { CConsol } from "../basic/CConsol.js";
import { CPaint } from "./component/paint/CPaint.js";
import { CRPMgr } from "./CRPMgr.js";
var gRenderQue = new Array();
var gCanvas = new Array();
export class CPairStrStr {
    first;
    second;
    constructor(t, r) { this.first = t, this.second = r; }
}
export class CCanvas extends CObject {
    mRemoveList = new Array();
    mKeyChangeList = new Array();
    mGGI = new CGlobalGeometryInfo();
    mWebSocket = null;
    mPacArr = new CArray();
    mBrush;
    mSubMap = new Map();
    mAttachCanvas = new Array();
    mFrame = null;
    mBroMsg = new Array();
    mBroLen = 0;
    mRPMgr = null;
    mResMap = new Map();
    mCameraKey = "2D";
    mPause = false;
    mPushObj = new CArray();
    mSave = true;
    constructor(_fw, _brash) {
        super();
        if (_fw == null)
            return;
        this.mFrame = _fw;
        this.mBrush = _brash;
        if (_fw.PF().mIAuto)
            _fw.PushIAuto(this);
        gCanvas.push(this);
    }
    IsShould(_member, _type) {
        if (_member == "mBrush" || _member == "mRemoveList" || _member == "mFrame" || _member == "mPushObj" ||
            _member == "mBroMsg" || _member == "mBroLen" || _member == "mWebSocket" || _member == "mPacArr" ||
            _member == "mKeyChangeList" || _member == "mGGI")
            return false;
        return super.IsShould(_member, _type);
    }
    SetPause(_pause) {
        this.mPause = _pause;
    }
    IsPause() {
        return this.mPause;
    }
    Icon() { return "bi bi-aspect-ratio"; }
    static GetCanvasList() {
        return gCanvas;
    }
    GetGGI() {
        return this.mGGI;
    }
    SetRPMgr(_rpMgr) {
        if (this.mRPMgr != null) {
            for (let i = 0; i < this.mRPMgr.mRPArr.length; ++i) {
                this.mBrush.RemoveAutoRP(this.mRPMgr.Key() + "_" + i);
            }
            this.mBrush.mAutoRPUpdate = CUpdate.eType.Not;
            for (let i = 0; i < this.mRPMgr.mSufArr.length; ++i) {
                const obj = this.Find(this.mRPMgr.mSufArr[i].Key());
                if (obj)
                    obj.Destroy();
                this.Detach(this.mRPMgr.mSufArr[i].Key());
            }
            this.mBrush.ClearRen();
        }
        for (let [key, obj] of this.mSubMap) {
            let ptVec = obj.FindComps(CPaint, true);
            for (let pt of ptVec) {
                pt.ClearCRPAuto();
            }
        }
        if (_rpMgr != null) {
            for (let i = 0; i < _rpMgr.mRPArr.length; ++i) {
                this.mBrush.SetAutoRP(_rpMgr.Key() + "_" + i, _rpMgr.mRPArr[i]);
            }
            for (let i = 0; i < _rpMgr.mSufArr.length; ++i) {
                let c = _rpMgr.mSufArr[i].Export(true, false);
                this.Push(c);
            }
            _rpMgr.SetCanvas(this);
        }
        this.mRPMgr = _rpMgr;
    }
    ClearBatch() {
        this.mBrush.ClearRen();
    }
    GetRPMgr() {
        return this.mRPMgr;
    }
    PushPac(_pac) {
        if (this.mWebSocket != null) {
            if (this.mWebSocket.IsConnect()) {
                if (this.mPacArr.Size() > 0) {
                    for (let i = 0; i < this.mPacArr.Size(); ++i) {
                        this.mWebSocket.Send(this.mPacArr.Find(i).Data());
                    }
                    this.mPacArr.Clear();
                }
                this.mWebSocket.Send(_pac.Data());
                return;
            }
        }
        this.mPacArr.Push(_pac);
    }
    SetWebSocket(_sc) {
        this.mWebSocket = _sc;
        if (this.mWebSocket instanceof CRoomClient) {
            this.mWebSocket.On("Patch", (stream) => {
                this.Patch(stream);
            });
            this.PatchTrackDefault();
        }
    }
    GetPac(_swap = null) {
        return this.mPacArr;
    }
    RenderOrder() { return new CArray(); }
    EditHTMLInit(_div) {
        super.EditHTMLInit(_div);
        var div = _div;
        if (window["CH5HelperTool"] != null) {
            var button = document.createElement("button");
            button.innerText = "CreateCH5";
            button.onclick = () => {
                window["CH5HelperTool"](this, this.mFrame);
            };
            _div.append(button);
        }
        var button = document.createElement("button");
        button.innerText = "RenderQueTool";
        button.onclick = () => {
            RenderQueTool(this.mBrush);
        };
        _div.append(button);
        var input = document.createElement("input");
        input.type = "search";
        input.className = "form-control";
        input.id = "canvasSearch";
        input.placeholder = "Search";
        input.onkeyup = (e) => {
            var t = e.target;
            var val = t.value;
            var ch = div.getElementsByClassName("border p-1 mt-1");
            for (var each0 of ch) {
                if (each0 == t)
                    continue;
                var hel = each0;
                if (each0.textContent.indexOf("mSubMap : map") != -1) { }
                else if (each0.textContent.indexOf(val) != -1)
                    hel.style.display = "";
                else
                    hel.style.display = "none";
            }
        };
        div.prepend(input);
    }
    EditForm(_pointer, _body, _input) {
        super.EditForm(_pointer, _body, _input);
        if (_pointer.member == "mRPMgr")
            CUtilObj.NullEdit(_pointer, _body, _input, new CRPMgr());
        else if (_pointer.member == "mAttachCanvas") {
            CUtilObj.ArrayAddSelectList(_pointer, _body, _input, [new CBlackBoardRef]);
        }
        else if (_pointer.refArr[_pointer.refArr.length - 1] == this.mSubMap) {
            var subList = new Array();
            for (let subName of CClass.ExtendsList(CSubject, true)) {
                subList.push({
                    "<>": "option",
                    "text": subName,
                    "value": subName
                });
            }
            let ukey = CUniqueID.GetHash();
            var pushDiv = { "<>": "div", "class": "row", "html": [
                    { "<>": "div", "class": "col-8", "html": [
                            { "<>": "input", "type": "text", "class": "form-control", "id": ukey + "subPush", "placeholder": "CSubject",
                                "list": this.ObjHash() + "CSubjcet_list", "onkeydown": (e) => {
                                    if (e.key === "Enter") {
                                        e.preventDefault();
                                        let sel = e.target.value;
                                        let newObj = CClass.New(sel);
                                        this.Push(newObj);
                                        this.EditRefresh();
                                        e.target.value = "";
                                    }
                                }
                            },
                            { "<>": "datalist", "id": this.ObjHash() + "CSubjcet_list", "html": subList }
                        ] },
                    { "<>": "div", "class": "col-4", "html": [
                            { "<>": "button", "type": "button", "class": "btn btn-primary", "text": "Add",
                                "onclick": () => {
                                    let sel = CUtil.IDValue(ukey + "subPush");
                                    let newObj = CClass.New(sel);
                                    this.Push(newObj);
                                    this.EditRefresh();
                                }
                            }
                        ] },
                ] };
            _input.prepend(CDomFactory.DataToDom(pushDiv));
        }
        if (_pointer.refArr[_pointer.refArr.length - 1] == this.mResMap) {
            let ukey = CUniqueID.GetHash();
            var watchList = new Array();
            for (let wName of CClass.ExtendsList(CObject, true)) {
                watchList.push({
                    "<>": "option",
                    "value": wName
                });
            }
            var res = { "<>": "div", "class": "row", "html": [
                    { "<>": "div", "class": "col-8", "html": [
                            { "<>": "input", "type": "text", "class": "form-control", "id": ukey + "resClass", "placeholder": "Class",
                                "list": this.ObjHash() + "Class_list", "onkeydown": (e) => {
                                    if (e.key === "Enter") {
                                        e.preventDefault();
                                        let sel = e.target.value;
                                        let newObj = CClass.New(sel);
                                        this.mResMap.set(newObj.Key(), newObj);
                                        this.EditRefresh();
                                        this["mObjectDiv"].querySelectorAll('span.text-warning').forEach(span => {
                                            if (span.textContent?.trim().startsWith("mResMap")) {
                                                const parentDiv = span.closest('div.border');
                                                if (parentDiv) {
                                                    parentDiv.click();
                                                }
                                            }
                                        });
                                        e.target.value = "";
                                    }
                                }
                            },
                            { "<>": "datalist", "id": this.ObjHash() + "Class_list", "html": watchList }
                        ] },
                    { "<>": "div", "class": "col-4", "html": [
                            { "<>": "button", "type": "button", "class": "btn btn-primary btn-block", "text": "Add",
                                "onclick": () => {
                                    let sel = CUtil.IDValue(ukey + "resClass");
                                    let newObj = CClass.New(sel);
                                    if (newObj == null) {
                                        CAlert.E("unknow class");
                                    }
                                    else {
                                        this.mResMap.set(newObj.Key(), newObj);
                                        this.EditRefresh();
                                        this["mObjectDiv"].querySelectorAll('span.text-warning').forEach(span => {
                                            if (span.textContent?.trim().startsWith("mResMap")) {
                                                const parentDiv = span.closest('div.border');
                                                if (parentDiv) {
                                                    parentDiv.click();
                                                }
                                            }
                                        });
                                    }
                                }
                            }
                        ] },
                ] };
            _input.prepend(CDomFactory.DataToDom(res));
        }
    }
    EditChange(_pointer, _childe) {
        super.EditChange(_pointer, _childe);
        if (_childe == false)
            return;
        if (_pointer.IsRef(this.mResMap) && _pointer.member == "mKey") {
            for (var key of this.mResMap.keys()) {
                if (this.mResMap.get(key) == _pointer.target) {
                    this.mResMap.delete(key);
                    this.mResMap.set(_pointer.target.mKey, _pointer.target);
                    this.mFrame.Res().Set(_pointer.target.mKey, _pointer.target);
                    break;
                }
            }
            this.EditRefresh();
        }
        else if (_pointer.IsRef(this.mSubMap) && _pointer.member == "mKey" && _pointer.refArr.length == 4) {
            _pointer.target.SetKey();
            for (var key of this.mSubMap.keys()) {
                if (this.mSubMap.get(key) == _pointer.target) {
                    this.mSubMap.delete(key);
                    this.mSubMap.set(_pointer.target.mKey, _pointer.target);
                    break;
                }
            }
            this.EditRefresh();
        }
        else if (_pointer.member == "mSubMap") {
            _pointer.target.Destroy();
        }
        else if (_pointer.member == "mRPMgr") {
            this.mRPMgr.SetCanvas(this);
        }
    }
    GetFrame() { return this.mFrame; }
    async LoadRes() {
        const promises = [];
        for (let [fileName, res] of this.mResMap) {
            if (res instanceof CBase64File) {
                promises.push(this.mFrame.Load().LoadSwitch(res.FileName(), res.mData, res.mOption));
            }
            else if (res instanceof CAtlas) {
                this.mFrame.Res().Set(fileName, res);
            }
        }
        await Promise.all(promises);
    }
    CopyResMap(_canv) {
        for (let [fileName, clip] of _canv.mResMap) {
            this.mResMap.set(fileName, clip.CopyExport());
        }
        this.LoadRes();
    }
    ImportCJSON(_json) {
        super.ImportCJSON(_json);
        this.LoadRes();
        for (var eachKey of this.mSubMap) {
            var each0 = eachKey[1];
            each0.SetFrame(this.mFrame);
        }
        const rpMgr = this.mRPMgr;
        this.mRPMgr = null;
        this.mBrush.AutoRP().clear();
        this.ClearBatch();
        this.SetRPMgr(rpMgr);
        return this;
    }
    GetBrush() { return this.mBrush; }
    PushBroMsg(_msg) {
        if (this.mBroLen < this.mBroMsg.length) {
            this.mBroMsg[this.mBroLen] = _msg;
        }
        else
            this.mBroMsg.push(_msg);
        this.mBroLen++;
    }
    ResetBroMsg() {
        this.mBroLen = 0;
    }
    Clear() {
        for (var eachKey of this.mSubMap) {
            var each0 = eachKey[1];
            each0.Destroy();
        }
        this.ClearBatch();
    }
    Detach(_key) {
        if (this.mSubMap.get(_key) == null)
            return;
        let obj = this.mSubMap.get(_key);
        obj.Reset();
        this.mSubMap.delete(_key);
        return obj;
    }
    DetachRes(_key) {
        if (this.mResMap.get(_key) == null)
            return;
        let obj = this.mResMap.get(_key);
        obj.Reset();
        this.mResMap.delete(_key);
        return obj;
    }
    DestroyLight(_light) {
    }
    PushColCan(_blackboard) { this.mAttachCanvas.push(_blackboard); }
    GetCam() {
        return this.mBrush.GetCamera(this.mCameraKey);
    }
    GetCameraKey() { return this.mCameraKey; }
    SetCameraKey(_key) {
        this.mCameraKey = _key;
    }
    async LoadJSON(_file = null) {
        let buf = await CFile.Load(_file);
        if (buf == null)
            return true;
        this.ImportCJSON(new CJSON(buf));
        return false;
    }
    async SaveJSON(_file = null) {
        let keyArr = [];
        for (let [key, clip] of this.mResMap) {
            if (clip["mKey"] != null && clip["mKey"] != key) {
                this.mResMap.delete(key);
                keyArr.push(clip);
            }
        }
        for (let each0 of keyArr) {
            this.mResMap.set(each0.Key(), each0);
        }
        if (this.mSave)
            CFile.Save(this, _file + ".json");
    }
    ToJSON() {
        let rpMgr = this.mRPMgr;
        this.SetRPMgr(null);
        this.mRPMgr = rpMgr;
        const json = super.ToJSON();
        this.mRPMgr = null;
        this.SetRPMgr(rpMgr);
        return json;
    }
    Update(_delay) {
    }
    CComMsg(_delay) {
    }
    static RenderCanvas(_brush, _canArr) {
    }
    RenderQue(_push) {
        if (_push) {
            if (gRenderQue.length != 0 && gRenderQue[0].mBrush != this.mBrush) {
                CAlert.E("brush different!");
            }
            gRenderQue.push(this);
        }
        else {
            CCanvas.RenderCanvas(this.mBrush, gRenderQue);
            gRenderQue.length = 0;
        }
        return true;
    }
    Render() {
    }
    static GlobalVF(_brush, _vf, _cam) {
    }
    static RenderFinish(_brush) {
    }
    CSubjectDestroy(_subject) {
    }
    GetSubMap() { return this.mSubMap; }
    GetResMap() { return this.mResMap; }
    Find(_key, _childe = false) {
        let data = this.mSubMap.get(_key);
        if (data == null || data.IsDestroy()) {
            if (_childe == true) {
                for (var each0 of this.mSubMap.values()) {
                    var chArr = each0.FindChilds(_key, true);
                    if (chArr.length > 0) {
                        return chArr[0];
                    }
                }
            }
            for (let i = 0; i < this.mPushObj.Size(); ++i) {
                if (this.mPushObj.Find(i).mKey == _key)
                    return this.mPushObj.Find(i);
            }
            return null;
        }
        return data;
    }
    FindRes(_key) {
        return this.mResMap.get(_key);
    }
    FindParent(_obj) {
        for (const subject of this.mSubMap.values()) {
            if (_obj == subject)
                return this;
            const parent = this.FindParentIn(subject, _obj);
            if (parent)
                return parent;
        }
        for (const subject of this.mResMap.values()) {
            if (_obj == subject)
                return this;
            const parent = this.FindParentIn(subject, _obj);
            if (parent)
                return parent;
        }
        return null;
    }
    FindParentIn(_parent, _target) {
        for (const child of _parent.mChilde) {
            if (child === _target) {
                return _parent;
            }
            let r = this.FindParentIn(child, _target);
            if (r != null)
                return r;
        }
        return null;
    }
    New(_obj) {
        this.Push(_obj);
        return _obj;
    }
    Push(_obj) {
        let key = _obj.Key();
        let obj = this.Find(key);
        if (obj != null) {
            if (obj.GetRemove()) {
                this.mSubMap.delete(obj.Key());
                obj.SetKey("pass");
            }
            else {
                this.mSubMap.set(key, _obj);
                CAlert.W(key + "already key");
            }
        }
        obj = _obj;
        obj.ClearKeyChange();
        if (obj.GetFrame() == null)
            obj.SetFrame(this.mFrame);
        this.mPushObj.Push(obj);
        return _obj;
    }
    KeyChange(_org, _tar) {
        var obj = this.mSubMap.get(_org);
        if (obj == null)
            return;
        if (_org == _tar) {
            obj.ClearKeyChange();
            return;
        }
        obj.ClearKeyChange();
        this.mSubMap.set(_tar, obj);
        this.mSubMap.delete(_org);
    }
    FindNearLength(_pos, _len) {
        var rVal = new Array();
        for (var eachKey of this.mSubMap) {
            var obj = eachKey[1];
            if (obj != null) {
                var len = CMath.V3Len(CMath.V3SubV3(_pos, obj.GetPos()));
                if (len < _len) {
                    rVal.push(obj);
                }
            }
        }
        return rVal;
    }
    Pick(_ray) {
        let rVal = new Array();
        for (var eachKey of this.mSubMap) {
            var obj = eachKey[1];
            let clList = obj.FindComps(CCollider, true);
            for (let cl of clList) {
                if (cl.PickChk(_ray)) {
                    rVal.push(cl);
                }
            }
        }
        return rVal;
    }
    CCamCompAck(_light) {
        _light.CCamCompReq(this.mBrush);
    }
    Patch(_stream, _sukPass = true) {
        let sendSUK = _stream.GetString();
        let readSUK = null;
        if (this.mWebSocket instanceof CRoomClient)
            readSUK = this.mWebSocket.GetSuk();
        if (_sukPass && sendSUK == readSUK)
            return;
        while (_stream.IsEnd() == false) {
            let pathArr = _stream.GetString().split(".");
            let target = this.Find(pathArr[0]);
            if (target != null) {
                target = CString.FullPathArrToLastTarget(target, pathArr);
                target.PatchStreamRead(_stream, pathArr[pathArr.length - 1]);
            }
            else {
                CConsol.Log("잘못된 파싱");
                break;
            }
        }
    }
    PatchTrackDefault() {
        this.PatchTrack("mSubMap");
    }
}
import CCanvas_imple from "../canvas_imple/CCanvas.js";
CCanvas_imple();
