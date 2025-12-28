import { CMat } from "../../../geometry/CMat.js";
import { CVec3 } from "../../../geometry/CVec3.js";
import { CVec4 } from "../../../geometry/CVec4.js";
import { CBound } from "../../../geometry/CBound.js";
import { CMath } from "../../../geometry/CMath.js";
import { CMeshDrawNode } from "../../../render/CMeshDrawNode.js";
import { CRenderPass } from "../../../render/CRenderPass.js";
import { CShaderAttr } from "../../../render/CShaderAttr.js";
import { CTexture } from "../../../render/CTexture.js";
import { CUpdate } from "../../../basic/Basic.js";
import { CAlert } from "../../../basic/CAlert.js";
import { CClass } from "../../../basic/CClass.js";
import { CDOM } from "../../../basic/CDOM.js";
import { CHash } from "../../../basic/CHash.js";
import { CObject } from "../../../basic/CObject.js";
import { CUniqueID } from "../../../basic/CUniqueID.js";
import { CUtilObj } from "../../../basic/CUtilObj.js";
import { CUtilMath } from "../../../geometry/CUtilMath.js";
import { CLoaderOption } from "../../../util/CLoader.js";
import { SDF } from "../../../z_file/SDF.js";
import { CComponent } from "../CComponent.js";
import { CBoundWorldPaint } from "../CBoundWorld.js";
import { CH5Canvas } from "../../../render/CH5Canvas.js";
import { CRPAuto } from "../../canvas/CRPMgr.js";
import { CColor } from "../../../render/CColor.js";
import { CAlpha } from "../../../render/CAlpha.js";
import { CVFX } from "../../../render/CVFX.js";
import { CUtil } from "../../../basic/CUtil.js";
export class CRenPaint {
    mRenInfoKey = null;
    mCam = null;
    mShow = 0;
    mPaint;
    mTexHash;
    mDistance = null;
    mAlpha = null;
}
var gBoundDummy = new CBound();
var gPosDummy = new CVec3();
gPosDummy.NewWASM();
export class CPaint extends CComponent {
    static eTag = {
        Light: "light",
        ShadowReadOnly: "shadowReadOnly",
        Shadow: "shadow",
        Wind: "Wind",
        Parallax: "parallax",
    };
    mBW = new CBoundWorldPaint();
    mFMat;
    mLMat;
    mShaderAttrMap = new Map();
    mColorModel;
    mAlphaModel;
    mVFX;
    mTexCodi;
    mAutoRPUpdate = true;
    mCamCullUpdate = true;
    mBound = new CBound();
    mRenderPass = new Array();
    mRenPT = new Array();
    mTextureKey = new Array();
    mMaterial = new CVec4(1, -1, -1, 1);
    mUpdateLMat = true;
    mUpdateFMat = true;
    mDefaultAttr = new Set();
    mTag = new Set();
    mTagKey = null;
    mBatchMap = new Map();
    mAutoLoad = new CLoaderOption();
    mInit = false;
    mAlphaTex = false;
    mWorldMatType = CMat.eType.PRS;
    constructor() {
        super();
        this.mSysc = CComponent.eSysn.Paint;
        this.mTexCodi = new CVec4(1, 1, 0, 0);
        this.mShaderAttrMap.set("texCodi", new CShaderAttr("texCodi", this.mTexCodi));
        this.mShaderAttrMap.set("colorModel", new CShaderAttr("colorModel", new CColor(0, 0, 0, SDF.eColorModel.None)));
        this.mShaderAttrMap.set("alphaModel", new CShaderAttr("alphaModel", new CAlpha(0, SDF.eAlphaModel.None)));
        this.mColorModel = this.mShaderAttrMap.get("colorModel").mData;
        this.mAlphaModel = this.mShaderAttrMap.get("alphaModel").mData;
        this.mVFX = null;
        this.mFMat = new CMat(null);
        this.mFMat.NewWASM();
        this.mLMat = new CMat(null);
        this.mLMat.NewWASM();
        this.mBW.mPos.NewWASM();
        this.mBound = new CBound();
        this.mBound.NewWASM();
        this.PushTag("alphaCut");
        if (gPosDummy.Ptr() == null)
            gPosDummy.NewWASM();
    }
    SetWorldType(_type) {
        this.mWorldMatType = _type;
        this.PushTag("worldType");
    }
    SetEnable(_val) {
        super.SetEnable(_val);
        this.ClearCRPAuto();
    }
    GetColorModel() { return this.mColorModel; }
    GetAlphaModel() { return this.mAlphaModel; }
    Icon() { return "bi bi-paint-bucket"; }
    RegistHeap(_F32A) {
    }
    SetTexCodi(_codi) {
        if (this.PushTag("codi"))
            this.ClearBatch();
        this.mTexCodi.Import(_codi);
    }
    Destroy() {
        if (this.GetRecycleType() != null) {
            this.Recycle();
            this.Reset();
            return;
        }
        super.Destroy();
        this.mBW.mPos.ReleaseWASM();
        this.mFMat.ReleaseWASM();
        this.mLMat.ReleaseWASM();
        this.mBound.DeleteWASM();
        this.ClearBatch();
    }
    Reset() {
        super.Reset();
        this.mFMat.Unit();
        this.mLMat.Unit();
        this.ClearBatch();
        this.mTextureKey.length = 0;
        this.mBound.Reset();
        this.mBound.SetType(CBound.eType.Box);
        this.mBW.mBound.Reset();
        this.mBW.mRadian = 0;
        this.mShaderAttrMap.delete("mVFX");
        this.mVFX = null;
        this.mTag.clear();
        this.mInit = false;
        this.PushTag("alphaCut");
        this.mBatchMap.clear();
    }
    IsShould(_member, _type) {
        if (_type == CObject.eShould.Editer && this.IsProxy() == false) {
            if (_member == "mColorModel" || _member == "mAlphaModel" || _member == "mVFX")
                return true;
        }
        if (_member == "mFMat" || _member == "mUpdateLMat" || _member == "mUpdateFMat" ||
            _member == "mRenPT" || _member == "mTagKey" ||
            _member == "mDefaultAttr" || _member == "mBatchMap" || _member == "mBatchLastArr" || _member == "mBatchLastVF" ||
            _member == "mBoundFMat" || _member == "mBoundFMatC" || _member == "mBoundFMatR" || _member == "mBound" ||
            _member == "mAutoRPUpdate" || _member == "mCamCullUpdate" || _member == "mBW" ||
            _member == "mColorModel" || _member == "mAlphaModel" || _member == "mVFX")
            return false;
        return super.IsShould(_member, _type);
    }
    ClearBatch() {
        for (let ren of this.mRenPT) {
            if (ren != null) {
                ren.mDistance = 0x7FFFFF00;
                ren.mShow = null;
            }
        }
        this.mRenPT = [];
        for (let key of this.mBatchMap.keys()) {
            this.mBatchMap.set(key, null);
        }
        this.mCamCullUpdate = true;
    }
    IsUpdateFMat() { return this.mUpdateFMat; }
    UpdateLMat() { this.mUpdateLMat = true; }
    EditHTMLInit(_div, _pointer) {
        super.EditHTMLInit(_div, _pointer);
        var button = CDOM.TagToDom("button");
        button.className = "btn btn-primary btn-sm";
        button.innerText = "Refresh";
        button.onclick = () => {
            this.ClearCRPAuto();
        };
        _div.append(button);
    }
    EditForm(_pointer, _body, _input) {
        if (_pointer.member == "mVFX" && this.mVFX == null) {
            let btn = CDOM.TagToDom("button");
            btn.innerText = "생성";
            btn.onclick = () => {
                this.mShaderAttrMap.set("VFX", new CShaderAttr("VFX", new CVFX([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])));
                this.mVFX = this.mShaderAttrMap.get("VFX").mData;
                this.PushTag("vfx");
                this.ClearBatch();
                this.EditRefresh();
            };
            _body.append(btn);
        }
        else if (_pointer.member == "mTextureKey" || _pointer.member == "mTag") {
            CUtilObj.ArrayAddSelectList(_pointer, _body, _input, [""], true);
        }
        else if (_pointer.member == "mShaderAttrMap") {
            var subList = new Array();
            subList.push({ "<>": "option", "text": "CVec1", "value": "CVec1" });
            subList.push({ "<>": "option", "text": "CVec2", "value": "CVec2" });
            subList.push({ "<>": "option", "text": "CVec3", "value": "CVec3" });
            subList.push({ "<>": "option", "text": "CVec4", "value": "CVec4" });
            subList.push({ "<>": "option", "text": "CMat", "value": "CMat" });
            let ukey = CUniqueID.GetHash();
            var pushDiv = { "<>": "div", "html": [
                    { "<>": "input", "id": ukey + "_txt", "class": "form-control" },
                    { "<>": "div", "class": "row", "html": [
                            { "<>": "div", "class": "col-8", "html": [
                                    { "<>": "select", "class": "form-select", "id": ukey + "subPush", "html": subList },
                                ] },
                            { "<>": "div", "class": "col-4", "html": [
                                    { "<>": "button", "type": "button", "class": "btn btn-primary", "text": "Add",
                                        "onclick": () => {
                                            let sel = CDOM.IDValue(ukey + "subPush");
                                            let key = CDOM.IDValue(ukey + "_txt");
                                            if (key == "") {
                                                CAlert.E("key 설정");
                                                return;
                                            }
                                            let newObj = new CShaderAttr(key, CClass.New(sel));
                                            this.PushCShaderAttr(newObj);
                                            this.EditRefresh();
                                        }
                                    }
                                ] },
                        ] }
                ] };
            ;
            _input.prepend(CDOM.DataToDom(pushDiv));
        }
    }
    SetOwner(_obj) {
        super.SetOwner(_obj);
        this.ClearCRPAuto();
        this.SetTexture(this.mTextureKey);
    }
    SetMaterial(roughness = -1, metalric = -1, emissive = 1, ambientOcclusion = 1) {
        this.mMaterial.x = ambientOcclusion;
        this.mMaterial.y = roughness;
        this.mMaterial.z = metalric;
        this.mMaterial.w = emissive;
    }
    AlphaState() {
        if (this.mAlphaTex || (this.mAlphaModel.y == CAlpha.eModel.Add && this.mAlphaModel.x != 0) ||
            (this.mAlphaModel.y == CAlpha.eModel.Mul && this.mAlphaModel.x != 1))
            return true;
        return false;
    }
    UpdateRenPt() {
        for (let i = 0; i < this.mRenPT.length; ++i) {
            let ren = this.mRenPT[i];
            if (ren.mDistance == null || ren.mCam.mUpdateMat != 0 || this.mUpdateFMat || this.mOwner.GetFrame().Win().IsResize()) {
                let cam = ren.mCam;
                let plane = ren.mCam.GetPlane();
                if (this.mRenderPass[i].mZEarly) {
                    let eye = ren.mCam.GetEye();
                    if (cam.GetView().z < -0.98) {
                        if (this.mAutoLoad.mFilter == CTexture.eFilter.Linear)
                            ren.mDistance = -(eye.z - this.mFMat.z);
                        else
                            ren.mDistance = eye.z - this.mFMat.z;
                    }
                    else {
                        ren.mDistance = CMath.V3Distance(eye, this.mBW.mPos);
                    }
                    ren.mDistance = Math.trunc(ren.mDistance * 128) << 9;
                }
                else
                    ren.mDistance = 0;
                if (CUtilMath.PlaneSphereInside(plane, this.mBW.mPos, this.mBW.mRadian, null) || this.mRenderPass[i].mCullFrustum == false)
                    ren.mShow = 0;
                else {
                    ren.mShow = 1;
                    ren.mDistance = 0x7FFFFE00;
                }
            }
        }
    }
    Refresh() {
        if (this.mShaderAttrMap.get("texCodi") == null)
            this.mShaderAttrMap.set("texCodi", new CShaderAttr("texCodi", this.mTexCodi));
        this.mColorModel = this.mShaderAttrMap.get("colorModel").mData;
        this.mAlphaModel = this.mShaderAttrMap.get("alphaModel").mData;
        if (this.mColorModel.mModel != SDF.eColorModel.None)
            this.PushTag("CAModel");
        if (this.mColorModel.mModel != SDF.eAlphaModel.None)
            this.PushTag("CAModel");
        if (this.mShaderAttrMap.get("VFX") != null)
            this.mVFX = this.mShaderAttrMap.get("VFX").mData;
    }
    Export(_copy = true, _resetKey = true) {
        let dummy = CClass.New(this);
        dummy.Import(this);
        if (_copy == false) {
            for (let key of dummy.mShaderAttrMap.keys()) {
                dummy.mShaderAttrMap.get(key).mData = this.mShaderAttrMap.get(key).mData;
            }
            for (let i = 0; i < this.mRenderPass.length; ++i) {
                for (let j = 0; j < this.mRenderPass[i].mShaderAttr.length; ++j) {
                    dummy.mRenderPass[i].mShaderAttr[j].mData = this.mRenderPass[i].mShaderAttr[j].mData;
                }
            }
        }
        dummy.Refresh();
        return dummy;
    }
    SetAutoLoad(_option) {
        if (typeof _option == "boolean") {
            if (_option)
                this.mAutoLoad = new CLoaderOption();
            else
                this.mAutoLoad = null;
        }
        else
            this.mAutoLoad = _option;
    }
    Import(_target) {
        super.Import(_target);
        this.Refresh();
    }
    EditChange(_pointer, _child) {
        super.EditChange(_pointer, _child);
        if (_pointer.IsRef(this.mTextureKey)) {
            this.SetTexture(this.mTextureKey);
            this.ClearBatch();
        }
        else if (_pointer.IsRef(this.mTag)) {
            this.mTagKey = null;
            this.ClearCRPAuto();
        }
        else if (_pointer.member == "mColorModel" || _pointer.member == "mAlphaModel") {
            this.PushTag("CAModel");
            this.ClearCRPAuto();
        }
        else if (_child) {
            if (_pointer.IsRef(this.mRenderPass)) {
                this.ClearCRPAuto();
                if (_pointer.target instanceof CRenderPass)
                    _pointer.target.Reset();
                else
                    CAlert.E("CRPAuto는 페인트 내에서 수정 불가합니다.");
            }
            else if (_pointer.IsRef(this.mAlphaModel)) {
                this.PushTag("CAModel");
                this.ClearCRPAuto();
            }
            else if (_pointer.IsRef(this.mColorModel)) {
                this.PushTag("CAModel");
                this.ClearCRPAuto();
            }
            else if (_pointer.IsRef(this.mVFX)) {
                this.PushTag("vfx");
            }
        }
    }
    PushCRPAuto(_rpc) {
        var pChk = true;
        for (var rp of this.mRenderPass) {
            if (rp.Key() == _rpc.Key())
                pChk = false;
        }
        if (pChk) {
            if (_rpc.mCopy == false)
                this.mRenderPass.push(_rpc);
            else {
                this.mRenderPass.push(_rpc.Export());
            }
            this.mRenPT.push(null);
        }
    }
    ClearCRPAuto() {
        this.ClearBatch();
        for (var i = 0; i < this.mRenderPass.length; ++i) {
            if (this.mRenderPass[i] instanceof CRPAuto) {
                this.mRenderPass.splice(i, 1);
                i--;
            }
        }
        this.mAutoRPUpdate = true;
    }
    EmptyRPChk() {
    }
    ClassEqual(_type) { return _type == CPaint; }
    GetTag() { return this.mTag; }
    PushTag(_tag) {
        if (this.mTag.has(_tag))
            return false;
        this.mTag.add(_tag);
        this.mTagKey = null;
        this.ClearCRPAuto();
        return true;
    }
    RemoveTag(_tag) {
        this.mTag.delete(_tag);
        this.mTagKey = null;
        this.ClearCRPAuto();
    }
    GetDrawMesh(_meshKey, _shader, _ci) {
        var drawMesh = this.mOwner.GetFrame().Res().Find(_meshKey + _shader.ObjHash());
        if (drawMesh == null) {
            drawMesh = new CMeshDrawNode();
            this.mOwner.GetFrame().Ren().BuildMeshDrawNodeAutoFix(drawMesh, _shader, _ci);
            this.mOwner.GetFrame().Res().Push(_meshKey + _shader.ObjHash(), drawMesh);
            drawMesh.SetKey(_meshKey + _shader.ObjHash());
        }
        return drawMesh;
    }
    GetTagKey() {
        if (this.mTagKey == null) {
            let key = "";
            let sortedArr = Array.from(this.mTag);
            sortedArr.sort();
            this.mTag = new Set(sortedArr);
            for (var each0 of this.mTag) {
                if (each0 == "")
                    continue;
                key += each0 + "/";
            }
            this.mTagKey = key;
        }
        return this.mTagKey;
    }
    GetRenderPass() { return this.mRenderPass; }
    PushRenderPass(_rp, _copy = true) {
        this.mDefaultAttr = new Set();
        this.mRenderPass = new Array();
        this.ClearBatch();
        if (_rp instanceof Array) {
            for (let each0 of _rp) {
                if (_copy)
                    this.mRenderPass.push(each0.Export());
                else
                    this.mRenderPass.push(each0);
            }
            return this.mRenderPass;
        }
        else {
            var rp = null;
            if (_copy)
                rp = _rp.Export(_copy);
            else
                rp = _rp;
            this.mRenderPass.push(rp);
            return this.mRenderPass[this.mRenderPass.length - 1];
        }
        return null;
    }
    PushCShaderAttr(_sa) {
        let attr = this.mShaderAttrMap.get(_sa.mKey);
        if (attr == null) {
            this.ClearBatch();
            this.mShaderAttrMap.set(_sa.mKey, _sa);
        }
        else
            attr.Import(_sa);
    }
    FindCShaderAttr(_key) {
        if (typeof _key == "string")
            return this.mShaderAttrMap.get(_key);
        for (let sa of this.mShaderAttrMap.values()) {
            if (sa.mEach == _key)
                return sa;
        }
        return null;
    }
    SetRGBA(_rgba) {
        this.mColorModel.mF32A[0] = _rgba.mF32A[0];
        this.mColorModel.mF32A[1] = _rgba.mF32A[1];
        this.mColorModel.mF32A[2] = _rgba.mF32A[2];
        this.mColorModel.mF32A[3] = SDF.eColorModel.RGBAdd;
        this.mAlphaModel.mF32A[0] = _rgba.mF32A[3];
        this.mAlphaModel.mF32A[1] = SDF.eAlphaModel.Add;
        if (this.mTag.has("CAModel") == false)
            this.ClearBatch();
        this.PushTag("CAModel");
    }
    SetColorModel(_color) {
        this.mColorModel.mF32A[0] = _color.mF32A[0];
        this.mColorModel.mF32A[1] = _color.mF32A[1];
        this.mColorModel.mF32A[2] = _color.mF32A[2];
        this.mColorModel.mF32A[3] = _color.mF32A[3];
        if (this.mTag.has("CAModel") == false)
            this.ClearBatch();
        this.PushTag("CAModel");
    }
    SetAlphaModel(_alpha) {
        let as = this.AlphaState();
        this.mAlphaModel.mF32A[0] = _alpha.mF32A[0];
        this.mAlphaModel.mF32A[1] = _alpha.mF32A[1];
        if (as != this.AlphaState())
            this.ClearCRPAuto();
        if (this.mTag.has("CAModel") == false)
            this.ClearBatch();
        this.PushTag("CAModel");
    }
    SetVFX(_a, _b = null, _c = null) {
        if (this.mVFX == null) {
            this.mShaderAttrMap.set("VFX", new CShaderAttr("VFX", new CVFX([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])));
            this.mVFX = this.mShaderAttrMap.get("VFX").mData;
            this.PushTag("vfx");
            this.ClearBatch();
        }
        if (_a instanceof CVFX) {
            this.mVFX.Import(_a);
        }
        else {
            let cv = this.mVFX;
            if (_a != 0)
                _a = 2;
            for (let i = 0; i < _b.length; ++i)
                cv.mF32A[_a * 8 + i] = _b[i];
            cv.mF32A[_a * 8 + 7] = _c;
        }
        this.PushTag("vfx");
    }
    GetRGBA() {
        return new CVec4(this.mColorModel.x, this.mColorModel.y, this.mColorModel.z, this.mAlphaModel.x);
    }
    SetMat(_mat) {
    }
    GetMat() { return this.mLMat; }
    ;
    SetLMat(_mat) { this.mLMat.Import(_mat); this.mUpdateLMat = true; }
    CacBound() {
        if (this.GetOwner().mUpdateRS != CUpdate.eType.Not || this.mBW.mRadian == 0) {
            if (this.mTag.has("tail"))
                this.mBW.Init(this.mBound, null);
            else
                this.mBW.Init(this.mBound, this.mOwner.GetMat());
        }
    }
    Prefab(_owner) {
        if (this.mAutoLoad != null) {
            for (let texKey of this.mTextureKey) {
                if (texKey.indexOf(".atl") != -1)
                    continue;
                _owner.GetFrame().Load().Exe(texKey, this.mAutoLoad);
            }
        }
    }
    Start() {
        this.ClearCRPAuto();
    }
    StartChk() {
        this.InitChk();
        if (this.mStartChk == true && this.mInit == true) {
            this.mStartChk = false;
            return true;
        }
        return false;
    }
    Update(_update) {
        if (this.mUpdateFMat)
            this.mUpdateFMat = false;
        if (this.mUpdateLMat || this.mOwner.mUpdateMat != 0) {
            CMath.MatMul(this.mLMat, this.mOwner.GetMat(), this.mFMat, true);
            this.CacBound();
            this.mBW.UpdateMat(this.mOwner.GetMat());
            this.mUpdateFMat = true;
        }
        this.UpdateRenPt();
        this.mUpdateLMat = false;
    }
    SetFMat(_fmat) {
        this.mFMat.Import(_fmat);
    }
    GetFMat() { return this.mFMat; }
    SetToolCPaint(_input, _type) {
    }
    Common(_vf) {
        if (this.mDefaultAttr.has(_vf.mKey) == false) {
            for (let each0 of _vf.mDefault) {
                var type = _vf.mUniform.get(each0.mKey).type;
                if (each0.mTag == null || each0.mTag != "paint")
                    continue;
                if (this.mShaderAttrMap.get(each0.mKey) == null)
                    this.mOwner.GetFrame().BMgr().SetBatchSA(each0);
            }
            this.mDefaultAttr.add(_vf.mKey);
        }
        for (let each0 of this.mShaderAttrMap.values()) {
            this.mOwner.GetFrame().BMgr().SetBatchSA(each0);
        }
    }
    GetBound() {
        return this.mBound;
    }
    GetBoundFMat() {
        gBoundDummy.Import(this.mBW.mBound);
        gBoundDummy.mMax = CMath.V3AddV3(gBoundDummy.mMax, this.GetFMat().xyz, gBoundDummy.mMax);
        gBoundDummy.mMin = CMath.V3AddV3(gBoundDummy.mMin, this.GetFMat().xyz, gBoundDummy.mMin);
        return gBoundDummy;
    }
    Render(_shader) { }
    RenderBatch(_shader, _count = 1) {
        let bcm = this.mOwner.GetFrame().BMgr().IsBatchMap();
        let barr = this.mBatchMap.get(_shader);
        if (barr == null) {
            barr = new Array(_count);
            this.mBatchMap.set(_shader, barr);
            barr.length = _count;
        }
        else if (bcm == false) { }
        else if (barr.length > 0) {
            return this.mOwner.GetFrame().BMgr().BatchPushArr(barr);
        }
        return barr;
    }
    BatchKeySet(_nodeOff, _key = null) {
        for (let batchArr of this.mBatchMap.values()) {
            if (batchArr == null)
                continue;
            if (_key == null)
                batchArr[_nodeOff].CreateKey();
            else
                batchArr[_nodeOff].mKey = _key;
        }
    }
    SetTexture(_a, _b = null, _c = null, _d = null, _e = null) {
        let change = false;
        if (_a instanceof Array) {
            if (_a != this.mTextureKey) {
                for (var i = 0; i < _a.length; ++i) {
                    if (_a[i] != this.mTextureKey[i]) {
                        change = true;
                        this.mTextureKey[i] = _a[i];
                    }
                }
            }
        }
        else {
            if (_a != this.mTextureKey[0]) {
                change = true;
                this.mTextureKey[0] = _a;
            }
            if (_b != this.mTextureKey[1]) {
                change = true;
                this.mTextureKey[1] = _b;
            }
            if (_c != this.mTextureKey[2]) {
                change = true;
                this.mTextureKey[2] = _c;
            }
            if (_d != this.mTextureKey[3]) {
                change = true;
                this.mTextureKey[3] = _d;
            }
            if (_e != this.mTextureKey[4]) {
                change = true;
                this.mTextureKey[4] = _e;
            }
        }
        if (this.mAutoLoad != null && this.mOwner != null && this.mOwner.GetFrame() != null && CUtil.IsNode() == false) {
            for (let i = 0; i < this.mTextureKey.length; ++i) {
                let texKey = this.mTextureKey[i];
                if (texKey.indexOf(".atl") != -1 || texKey.indexOf("base64") != -1 || texKey.indexOf(".tex") != -1 ||
                    texKey == "" || texKey == null)
                    continue;
                let tex = this.mOwner.GetFrame().Res().Find(texKey);
                if (tex != null && tex instanceof CTexture && i == 0) {
                    if (tex.GetAlpha())
                        this.mAlphaTex = true;
                    continue;
                }
                if (tex == null)
                    this.mInit = false;
                if (this.mOwner.GetFrame().Load().IsLoad(texKey) == false) {
                    this.mOwner.GetFrame().Load().Exe(texKey, this.mAutoLoad);
                }
            }
        }
        if (change) {
            for (let each0 of this.mBatchMap.values()) {
                if (each0 != null) {
                    for (let i = 0; i < each0.length; ++i) {
                        let bh = each0[i];
                        if (bh != null)
                            bh.CreateKey();
                    }
                }
            }
        }
    }
    GetTexture() { return this.mTextureKey; }
    GetTexHash() {
        let str = "";
        let hash = 0;
        for (let texKey of this.mTextureKey) {
            str += texKey;
        }
        hash = CHash.HashCode(str);
        hash = 0xff & hash;
        return hash;
    }
    InitChk() {
        this.mInit = true;
        if (this.mShaderAttrMap.get("texCodi") == null)
            this.mShaderAttrMap.set("texCodi", new CShaderAttr("texCodi", this.mTexCodi));
        this.mColorModel = this.mShaderAttrMap.get("colorModel").mData;
        this.mAlphaModel = this.mShaderAttrMap.get("alphaModel").mData;
        if (this.mShaderAttrMap.get("VFX") != null)
            this.mVFX = this.mShaderAttrMap.get("VFX").mData;
        if (this.mTextureKey.length > 0)
            this.SetTexture(this.mTextureKey);
    }
    CaptureTextureToDataURL() {
        if (this.mTextureKey.length == 0 || this.GetOwner().GetFrame() == null)
            return "";
        let tex = this.GetOwner().GetFrame().Res().Find(this.mTextureKey[0]);
        let codi = this.GetLeftTopRightBottom(this.GetOwner().GetFrame());
        CH5Canvas.Init(codi.z - codi.x, codi.w - codi.y);
        let cmd = CH5Canvas.DrawBuf(tex.GetBuf()[0], 0, 0, tex.GetWidth(), tex.GetHeight(), codi);
        CH5Canvas.Draw(cmd);
        let durl = CH5Canvas.GetDataURL();
        return durl;
    }
    GetLeftTopRightBottom(_frame) {
        const tex = _frame.Res().Find(this.mTextureKey[0]);
        if (tex == null || (tex.GetWidth() == 1 && tex.GetHeight() == 1))
            return null;
        const imgW = tex.GetWidth();
        const imgH = tex.GetHeight();
        const uv = this.mTexCodi;
        const gMargin = 1;
        const startX = Math.round((this.mTexCodi.z) * imgW);
        const startY = Math.round((1 - this.mTexCodi.w - this.mTexCodi.y) * imgH);
        const endX = Math.round((this.mTexCodi.z + this.mTexCodi.x) * imgW);
        const endY = Math.round((1 - this.mTexCodi.w) * imgH);
        return new CVec4(startX, startY, endX, endY);
    }
    AddDecal(_decal, _pos, _size, _dir = new CVec3(0, 1, 0), _imageRot = 0) {
        let DecalMat = this.FindCShaderAttr("decalInvWorldMat");
        let DecalParam = this.FindCShaderAttr("decalParam");
        if (DecalMat == null) {
            DecalMat = new CShaderAttr("decalInvWorldMat", new CMat());
            this.PushCShaderAttr(DecalMat);
        }
        if (DecalParam == null) {
            DecalParam = new CShaderAttr("decalParam", new CVec4());
            this.PushCShaderAttr(DecalParam);
        }
        const zAxis = CMath.V3Nor(_dir);
        let up = new CVec3(0, 1, 0);
        if (Math.abs(CMath.V3Dot(zAxis, up)) > 1 - 1e-8) {
            up = new CVec3(0, 0, -1);
        }
        const xAxis = CMath.V3Nor(CMath.V3Cross(up, zAxis));
        const yAxis = CMath.V3Nor(CMath.V3Cross(zAxis, xAxis));
        const cosT = Math.cos(_imageRot);
        const sinT = Math.sin(_imageRot);
        const rx = CMath.V3Nor(new CVec3(xAxis.x * cosT + yAxis.x * sinT, xAxis.y * cosT + yAxis.y * sinT, xAxis.z * cosT + yAxis.z * sinT));
        const ry = CMath.V3Nor(new CVec3(yAxis.x * cosT - xAxis.x * sinT, yAxis.y * cosT - xAxis.y * sinT, yAxis.z * cosT - xAxis.z * sinT));
        DecalMat.mData.mF32A[0] = rx.x * _size.x;
        DecalMat.mData.mF32A[4] = ry.x * _size.y;
        DecalMat.mData.mF32A[8] = zAxis.x * _size.z;
        DecalMat.mData.mF32A[1] = rx.y * _size.x;
        DecalMat.mData.mF32A[5] = ry.y * _size.y;
        DecalMat.mData.mF32A[9] = zAxis.y * _size.z;
        DecalMat.mData.mF32A[2] = rx.z * _size.x;
        DecalMat.mData.mF32A[6] = ry.z * _size.y;
        DecalMat.mData.mF32A[10] = zAxis.z * _size.z;
        DecalMat.mData.mF32A[3] = 0;
        DecalMat.mData.mF32A[7] = 0;
        DecalMat.mData.mF32A[11] = 0;
        DecalMat.mData.mF32A[12] = _pos.x;
        DecalMat.mData.mF32A[13] = _pos.y;
        DecalMat.mData.mF32A[14] = _pos.z;
        DecalMat.mData.mF32A[15] = 1.0;
        CMath.MatInvert(DecalMat.mData, DecalMat.mData);
        if (typeof _decal == "string") {
            DecalParam.mData.x = 4;
            DecalParam.mData.w = 10;
            let DecalTex = this.FindCShaderAttr(4);
            if (DecalTex == null) {
                DecalTex = new CShaderAttr(4, _decal);
                this.PushCShaderAttr(DecalTex);
            }
            DecalTex.mKey = _decal;
        }
        else {
            DecalParam.mData.Import(_decal);
        }
        this.PushTag("decal");
    }
    RemoveDecal() {
        if (this.GetTag().has("decal"))
            this.RemoveTag("decal");
    }
}
