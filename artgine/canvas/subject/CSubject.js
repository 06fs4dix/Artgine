import { CUpdate } from "../../basic/Basic.js";
import { CArray } from "../../basic/CArray.js";
import { CClass } from "../../basic/CClass.js";
import { CJSON } from "../../basic/CJSON.js";
import { CConfirm } from "../../basic/CModal.js";
import { CObject } from "../../basic/CObject.js";
import { CUniqueID } from "../../basic/CUniqueID.js";
import { CUtilObj } from "../../basic/CUtilObj.js";
import CSubject_imple from "../../canvas_imple/subject/CSubject.js";
import { CBound } from "../../geometry/CBound.js";
import { CMat } from "../../geometry/CMat.js";
import { CMath } from "../../geometry/CMath.js";
import { CVec3 } from "../../geometry/CVec3.js";
import { CVec4 } from "../../geometry/CVec4.js";
import { CFile } from "../../system/CFile.js";
import { CComponent } from "../component/CComponent.js";
import { CNavigation } from "../component/CNavigation.js";
import { CRouteMsg } from "../CRouteMsg.js";
import { CPaint } from "../component/paint/CPaint.js";
import { CCollider } from "../component/CCollider.js";
var g_offCObjHD = 0;
export class CSubject extends CObject {
    mComArr;
    mPTArr = null;
    mCLArr = null;
    mPushArr = new Array();
    mPushLock = false;
    mChilde;
    mPMat;
    mPos;
    mRot;
    mSca;
    mWMat;
    mPMatMul = true;
    mKey;
    mKeyChange;
    mDestroy;
    mEnable;
    mPEnable;
    mSpeed;
    mFrame = null;
    mBroMsg = new CArray();
    mInMsg = new CArray();
    mOutMsg = new CArray();
    mUpdateMat = CUpdate.eType.Updated;
    constructor(_comArr = new Array()) {
        super();
        this.mComArr = _comArr;
        this.mCLArr = new CArray();
        this.mChilde = new Array();
        this.mPMat = null;
        this.mPos = new CVec3();
        this.mRot = new CVec3();
        this.mSca = new CVec3(1, 1, 1);
        this.mWMat = new CMat(null);
        this.mWMat.NewWASM();
        this.mKey = CUniqueID.GetHash();
        this.mKeyChange = "";
        this.mDestroy = false;
        this.mEnable = true;
        this.mPEnable = true;
        this.mSpeed = 1.0;
        this.mInMsg.Push(new CRouteMsg("dummy"));
        this.mInMsg.Clear();
    }
    IsDestroy() {
        if (this.IsRecycle())
            return true;
        return this.mDestroy;
    }
    Reset() {
        for (let each0 of this.mChilde) {
            each0.Reset();
        }
        for (let each0 of this.mComArr) {
            each0.Reset();
        }
        if (this.mPTArr) {
            for (let pt of this.mPTArr) {
                pt.ClearCRPAuto();
            }
            this.mPTArr.length = 0;
            this.mPTArr = null;
        }
        else {
            let pVec = this.FindComps(CPaint, true);
            for (let pt of pVec) {
                pt.ClearCRPAuto();
            }
        }
        this.mFrame = null;
        this.mDestroy = false;
        this.mInMsg.Clear();
        this.mOutMsg.Clear();
        this.mCLArr.Clear();
        this.mUpdateMat = CUpdate.eType.Updated;
    }
    Icon() { return "bi bi-box"; }
    RegistHeap(_F32A) {
    }
    ImportCJSON(_json) {
        var key = this.mKey;
        var fw = this.mFrame;
        this.Reset();
        super.ImportCJSON(_json);
        if (this.mKey != key)
            this.mKeyChange = "keySwap";
        this.mFrame = null;
        this.SetFrame(fw);
        return this;
    }
    Call(_function, _para) {
        var cm = new CRouteMsg(_function);
        cm.mMsgData = _para;
        this.mInMsg.Push(cm);
    }
    Canvas() {
    }
    IsShould(_member, _type) {
        if (_type == CObject.eShould.Editer) {
            if (_member == "mPEnable" || _member == "mPMat")
                return false;
            if (_member == "mDestroy")
                return true;
        }
        if (_member == "mFrame" || _member == "mKeyChange" || _member == "mInMsg" || _member == "mOutMsg" || _member == "mBroMsg" ||
            _member == "mPushArr" || _member == "mPushLock" ||
            _member == "mDestroy" || _member == "mPTArr" ||
            _member == "mCLArr" || _member == "mUpdateMat")
            return false;
        return super.IsShould(_member, _type);
    }
    EditForm(_pointer, _body, _input) {
        if (_pointer.member == "mComArr")
            CUtilObj.ArrayAddDataList(_pointer, _body, _input, CClass.ExtendsList(CComponent, true), false, true);
        if (_pointer.member == "mChilde")
            CUtilObj.ArrayAddDataList(_pointer, _body, _input, CClass.ExtendsList(CSubject, true), false, true);
    }
    EditChange(_pointer, _childe) {
        super.EditChange(_pointer, _childe);
        if (_pointer.member == "mKey") {
            this.mKeyChange = "keySwap";
        }
        else if (_pointer.member == "mDestroy") {
            this.mDestroy = false;
            this.Destroy();
        }
        else if (_pointer.member == "mComArr") {
            if (_pointer.state == 1) {
                let com = this.mComArr[_pointer.key];
                com.SetOwner(this);
                if (com.constructor.name == "CCollider" && this.mPTArr.length > 0) {
                    com["InitBound"](this.mPTArr[0]);
                }
                this.SortComponent();
            }
            if (_pointer.state == -1) {
                let com = this.mComArr[_pointer.key];
                com.Destroy();
            }
            if (this.mPTArr)
                this.mPTArr.length = 0;
            this.mPTArr = null;
            if (this.mCLArr)
                this.mCLArr.Clear();
            this.mPTArr = null;
        }
        else if (_pointer.member == "mChilde") {
            if (_pointer.state == 1) {
                let ch = this.mChilde[_pointer.key];
                this.mChilde.splice(_pointer.key, 1);
                this.PushChilde(ch);
            }
        }
        else if (_childe) {
            if (_pointer.IsRef(this.mPos) || _pointer.IsRef(this.mRot) || _pointer.IsRef(this.mSca)) {
                this.PRSReset();
            }
            else if (_pointer.member == "mEnable") {
                this.SetEnable(this.mEnable);
            }
        }
    }
    GetFrame() { return this.mFrame; }
    Start() { }
    SetFrame(_frame) {
        if (this.mFrame != null && _frame != null)
            return;
        if (this.mFrame != null)
            this.Reset();
        this.mFrame = _frame;
        this.mCLArr.Clear();
        for (let each0 of this.mComArr) {
            each0.SetOwner(this);
            if (each0 instanceof CCollider || each0 instanceof CNavigation) {
                this.mCLArr.Push(each0);
            }
        }
        for (let each0 of this.mChilde) {
            each0.SetFrame(_frame);
        }
        if (this.mFrame != null)
            this.Start();
    }
    GetRemove() { return this.mDestroy || this.IsRecycle(); }
    KeyChange() { return this.mKeyChange; }
    ClearKeyChange() { this.mKeyChange = ""; }
    SetEnable(_enable) {
        this.mEnable = _enable;
        this.mUpdateMat = CUpdate.eType.Updated;
        this.SetChildeShow(_enable);
    }
    SetChildeShow(_enable) {
        for (let each0 of this.mChilde) {
            each0.mPEnable = _enable;
            each0.SetChildeShow(_enable && this.mEnable);
        }
    }
    IsEnable() {
        return this.mEnable && this.mPEnable;
    }
    SetKey(_key) {
        if (this.mKey == _key)
            return;
        this.mKeyChange = "keySwap";
        this.mKey = _key + "";
    }
    GetSpeed() { return this.mSpeed; }
    ;
    SetSpeed(_speed) { this.mSpeed = _speed; }
    GetBound() {
        var dummy = new CBound();
        dummy.mMin.x = 0;
        dummy.mMin.y = 0;
        dummy.mMin.z = 0;
        dummy.mMax.x = 0;
        dummy.mMax.y = 0;
        dummy.mMax.z = 0;
        return dummy;
    }
    SubjectUpdate(_delay) {
        for (var i = 0; i < this.mChilde.length; ++i) {
            if (this.mChilde[i].GetRemove()) {
                this.mChilde.splice(i, 1);
                if (this.mPTArr)
                    this.mPTArr.length = 0;
                i--;
                continue;
            }
        }
    }
    Update(_delay) { }
    ;
    NewInMsg(_name) {
        let msg = new CRouteMsg(_name);
        this.mInMsg.Push(msg);
        return msg;
    }
    NewOutMsg(_name) {
        let msg = new CRouteMsg(_name);
        this.mOutMsg.Push(msg);
        return msg;
    }
    PushPac(_stream) {
        var msg = this.NewOutMsg("PushPac");
        msg.mMsgData[0] = _stream;
        msg.mInter = "canvas";
    }
    RouteMsg(_msg) {
    }
    RootMsgUpdate(_delay, _ggi) {
    }
    RouteMsgUpdate(_delay, _ggi) {
    }
    GetCPaintVec(_vec = new Array) {
        if (this.mPTArr == null || this.mPTArr.length == 0) {
            if (_vec != null)
                this.mPTArr = _vec;
            if (this.mPTArr == null)
                this.mPTArr = new Array();
            for (let each0 of this.mComArr) {
                if (each0.IsDestroy())
                    continue;
                if (each0.GetSysc() == CComponent.eSysn.Paint)
                    this.mPTArr.push(each0);
            }
            for (let each0 of this.mChilde) {
                each0.GetCPaintVec(this.mPTArr);
            }
        }
        return this.mPTArr;
    }
    SortComponent() {
        this.mComArr.sort((a, b) => {
            return a.mSysc - b.mSysc;
        });
    }
    Destroy() {
        if (this.GetRecycleType() != null) {
            this.Recycle();
            this.Reset();
            return;
        }
        if (this.mDestroy)
            return;
        this.mDestroy = true;
        for (var i = 0; i < this.mComArr.length; ++i) {
            this.mComArr[i].Destroy();
        }
        for (var i = 0; i < this.mChilde.length; ++i) {
            this.mChilde[i].Destroy();
        }
        this.mWMat.ReleaseWASM();
    }
    SetPMat(_mat) { this.mPMat = _mat; }
    PushChilde(_obj) {
        this.mChilde.push(_obj);
        if (this.mPMatMul)
            _obj.SetPMat(this.mWMat);
        _obj.mPEnable = this.IsEnable();
        _obj.PRSReset();
        if (this.mFrame != null)
            _obj.SetFrame(this.mFrame);
        if (this.mPTArr)
            this.mPTArr.length = 0;
        this.mPTArr = null;
        return _obj;
    }
    DetachChild(_key) {
        let child = null;
        for (var i = 0; i < this.mChilde.length; ++i) {
            if (this.mChilde[i].Key() == _key) {
                child = this.mChilde[i];
                this.mChilde.splice(i, 1);
                break;
            }
        }
        if (child == null)
            return null;
        if (this.mPTArr) {
            for (let pt of this.mPTArr) {
                pt.BatchClear();
            }
            this.mPTArr.length = 0;
            this.mPTArr = null;
        }
        child.mPMat = null;
        return child;
    }
    DetachComp(_type) {
        let com = null;
        for (var i = 0; i < this.mComArr.length; ++i) {
            if (typeof _type == "string") {
                if (this.mComArr[i].Key() == _type) {
                    com = this.mComArr[i];
                    this.mComArr.splice(i, 1);
                    break;
                }
            }
            else if (this.mComArr[i] instanceof _type) {
                com = this.mComArr[i];
                this.mComArr.splice(i, 1);
                break;
            }
        }
        if (com == null)
            return null;
        if (this.mPTArr) {
            for (let pt of this.mPTArr) {
                pt.BatchClear();
            }
            this.mPTArr.length = 0;
            this.mPTArr = null;
        }
        return com;
    }
    FindComp(_type, _childe = false, vec = new Array()) {
        let cList = this.FindComps(_type, _childe, vec);
        if (cList.length == 0)
            return null;
        return cList[0];
    }
    FindComps(_type, _childe = false, vec = new Array()) {
        for (let each0 of this.mComArr) {
            if (each0.IsDestroy())
                continue;
            if (typeof _type == "string") {
                if (each0.Key() == _type)
                    vec.push(each0);
            }
            else if (typeof _type == "number") {
                if (each0.GetSysc() == _type)
                    vec.push(each0);
            }
            else if (each0 instanceof _type)
                vec.push(each0);
        }
        if (_childe) {
            for (let each0 of this.mChilde) {
                each0.FindComps(_type, _childe, vec);
            }
        }
        if (this.mPushLock) {
            for (let each0 of this.mPushArr) {
                if (each0.IsDestroy())
                    continue;
                if (typeof _type == "string") {
                    if (each0.Key() == _type)
                        vec.push(each0);
                }
                else if (typeof _type == "number") {
                    if (each0.GetSysc() == _type)
                        vec.push(each0);
                }
                else if (each0 instanceof _type)
                    vec.push(each0);
            }
        }
        return vec;
    }
    FindChild(_key, _childe = false) {
        const cList = this.FindChilds(_key, _childe);
        if (cList.length === 0)
            return null;
        return cList[0];
    }
    FindChilds(_key, _childe = false) {
        var vec = new Array();
        for (let each0 of this.mChilde) {
            if (each0.GetRemove())
                continue;
            if (typeof _key == "string") {
                if (each0.Key() == _key)
                    vec.push(each0);
            }
            else if (each0 instanceof _key)
                vec.push(each0);
            if (_childe) {
                let chvec = each0.FindChilds(_key, true);
                if (chvec.length > 0)
                    vec = vec.concat(chvec);
            }
        }
        return vec;
    }
    PushComp(_com) {
        if (this.mFrame != null && _com.GetOwner() == null) {
            _com.SetOwner(this);
            var cm = new CRouteMsg("PushComp");
            cm.mInter = "canvas";
            cm.mMsgData.push(this);
            cm.mMsgData.push(_com);
            this.mOutMsg.Push(cm);
        }
        if (this.mPushLock) {
            this.mPushArr.push(_com);
            return _com;
        }
        if (this.mPTArr)
            this.mPTArr.length = 0;
        this.mPTArr = null;
        if (_com instanceof CCollider || _com instanceof CNavigation) {
            this.mCLArr.Push(_com);
        }
        for (var i = 0; i < this.mComArr.length; ++i) {
            if (this.mComArr[i].mSysc > _com.mSysc) {
                this.mComArr.splice(i, 0, _com);
                return _com;
            }
        }
        this.mComArr.push(_com);
        return _com;
    }
    GetWMat() { return this.mWMat; }
    GetPos() { return this.mPos; }
    GetRot() { return this.mRot; }
    ;
    GetSca() { return this.mSca; }
    ;
    SetPos(_pos, _reset = true, _patch = true) {
        if (_pos.Equals(this.mPos))
            return;
        this.mPos.Import(_pos);
        if (_reset)
            this.PRSReset(false);
        if (_patch)
            this.PatchExe("mPos");
    }
    SetRot(_rot, _reset = true) {
        if (_rot.Equals(this.mRot))
            return;
        if (_rot instanceof CVec4)
            this.mRot.Import(CMath.QutToEuler(_rot));
        else
            this.mRot.Import(_rot);
        if (_reset)
            this.PRSReset(true);
    }
    SetSca(_sca, _reset = true) {
        if (typeof _sca == "number") {
            this.mSca.mF32A[0] = _sca;
            this.mSca.mF32A[1] = _sca;
            this.mSca.mF32A[2] = _sca;
        }
        else {
            if (_sca.Equals(this.mSca))
                return;
            this.mSca.Import(_sca);
        }
        if (_reset)
            this.PRSReset(true);
    }
    PRSReset(_rsUpdate = true) {
    }
    RemoveComps(_type) {
        var vec = this.FindComps(_type);
        for (var each0 of vec) {
            each0.Destroy();
        }
        if (this.mPTArr)
            this.mPTArr.length = 0;
        this.mPTArr = null;
    }
    async LoadJSON(_file = null) {
        let buf = await CFile.Load(_file);
        if (buf == null)
            return true;
        this.ImportCJSON(new CJSON(buf));
        return false;
    }
    async SaveJSON(_file = null) {
        let confirm = new CConfirm();
        confirm.SetBody("Save Type Click");
        confirm.SetConfirm(CConfirm.eConfirm.YesNo, [
            () => {
                CFile.Save(this.ToStr(), _file);
            },
            async () => {
                var sub = new CSubject();
                sub.Import(this);
                CFile.Save(sub.ToStr(), _file);
            },
        ], ["this", "CSubject"]);
        confirm.Open();
    }
    Export(_copy = true, _resetKey = true) {
        let target = super.Export(_copy, _resetKey);
        target.SetFrame(null);
        if (_resetKey && this.mPMat == null)
            target.SetKey(CUniqueID.GetHash());
        return target;
    }
    Prefab(_fw) {
        this.mFrame = _fw;
        for (var each0 of this.mComArr) {
            each0.Prefab(this);
        }
        this.mFrame = null;
    }
    PatchStreamUpdate(_stream, _path) {
        super.PatchStreamUpdate(_stream, _path);
        for (let i = 0; i < this.mComArr.length; ++i) {
            _path.push("mComArr[" + i + "]");
            this.mComArr[i].PatchStreamUpdate(_stream, _path);
            _path.pop();
        }
        for (let i = 0; i < this.mChilde.length; ++i) {
            _path.push("mChilde[" + i + "]");
            this.mChilde[i].PatchStreamUpdate(_stream, _path);
            _path.pop();
        }
    }
    PatchStreamRead(_stream, _key) {
        super.PatchStreamRead(_stream, _key);
        if (_key == "mPos")
            this.PRSReset();
    }
    PatchTrackDefault() {
        for (let i = 0; i < this.mComArr.length; ++i) {
            this.mComArr[i].PatchTrackDefault();
        }
        for (let i = 0; i < this.mChilde.length; ++i) {
            this.mChilde[i].PatchTrackDefault();
        }
    }
}
;
CSubject_imple();
