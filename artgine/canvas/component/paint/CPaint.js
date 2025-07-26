import { CMat } from "../../../geometry/CMat.js";
import { CVec3 } from "../../../geometry/CVec3.js";
import { CVec4 } from "../../../geometry/CVec4.js";
import { CBound } from "../../../geometry/CBound.js";
import { CMath } from "../../../geometry/CMath.js";
import { CMeshDrawNode } from "../../../render/CMeshDrawNode.js";
import { CRenderPass } from "../../../render/CRenderPass.js";
import { CTexture } from "../../../render/CTexture.js";
import { CShaderAttr } from "../../../render/CShaderAttr.js";
import { CWASM } from "../../../basic/CWASM.js";
import { SDF } from "../../../z_file/SDF.js";
import { CComponent } from "../CComponent.js";
import { CColor, CAlpha, CColorVFX } from "../CColor.js";
import { CHash } from "../../../basic/CHash.js";
import { CLoaderOption } from "../../../util/CLoader.js";
import { CObject } from "../../../basic/CObject.js";
import { CUtilObj } from "../../../basic/CUtilObj.js";
import { CPoolGeo } from "../../../geometry/CPoolGeo.js";
import { CUtilMath } from "../../../geometry/CUtilMath.js";
import { CClass } from "../../../basic/CClass.js";
import { CAlert } from "../../../basic/CAlert.js";
import { CRPAuto } from "../../CRPMgr.js";
export class CRenPaint {
    mRenInfoKey = null;
    mCam = null;
    mShow = 0;
    mPaint;
    mTexHash;
    mDistance = null;
    mAlpha = null;
}
export class CPaint extends CComponent {
    mFMat;
    mLMat;
    mShaderAttrMap = new Map();
    mColorModel;
    mAlphaModel;
    mColorVFX;
    mAutoRPUpdate = true;
    mCamCullUpdate = true;
    mBound = new CBound();
    mBoundFMat;
    mBoundFMatC;
    mBoundFMatR = 0;
    mRenderPass = new Array();
    mRenPT = new Array();
    mTexture = new Array();
    mMaterial = new CVec4(0, 0, 0, 1);
    mUpdateLMat = true;
    mUpdateFMat = true;
    mDefaultAttr = new Set();
    mTag = new Set();
    mTagKey = null;
    mBatchMap = new Map();
    mAutoLoad = new CLoaderOption();
    mAlphaTex = false;
    constructor() {
        super();
        this.mSysc = CComponent.eSysn.Paint;
        this.mShaderAttrMap.set("colorModel", new CShaderAttr("colorModel", new CColor(0, 0, 0, SDF.eColorModel.None)));
        this.mShaderAttrMap.set("alphaModel", new CShaderAttr("alphaModel", new CAlpha(0, SDF.eAlphaModel.None)));
        this.mColorModel = this.mShaderAttrMap.get("colorModel").mData;
        this.mAlphaModel = this.mShaderAttrMap.get("alphaModel").mData;
        this.mColorVFX = null;
        this.mBoundFMatC = new CVec3(0, 0, 0);
        this.mBoundFMatC.NewWASM();
        this.mFMat = new CMat(null);
        this.mFMat.NewWASM();
        this.mLMat = new CMat(null);
        this.mLMat.NewWASM();
        this.mBoundFMat = new CBound();
        this.mBoundFMat.NewWASM();
        this.mBound = new CBound();
        this.mBound.NewWASM();
    }
    SetEnable(_val) {
        super.SetEnable(_val);
        this.BatchClear();
    }
    GetColorModel() { return this.mColorModel; }
    GetAlphaModel() { return this.mAlphaModel; }
    Icon() { return "bi bi-paint-bucket"; }
    RegistHeap(_F32A) {
    }
    Destroy() {
        super.Destroy();
        this.mBoundFMatC.ReleaseWASM();
        this.mFMat.ReleaseWASM();
        this.mLMat.ReleaseWASM();
        this.mBoundFMat.DeleteWASM();
        this.mBound.DeleteWASM();
        this.BatchClear();
    }
    IsShould(_member, _type) {
        if (_type == CObject.eShould.Editer) {
            if (_member == "mColorModel" || _member == "mAlphaModel" || _member == "mColorVFX")
                return true;
        }
        if (_member == "mFMat" || _member == "mUpdateLMat" || _member == "mUpdateFMat" ||
            _member == "mRenPT" || _member == "mTagKey" ||
            _member == "mDefaultAttr" || _member == "mBatchMap" || _member == "mBatchLastArr" || _member == "mBatchLastVF" ||
            _member == "mBoundFMat" || _member == "mBoundFMatC" || _member == "mBoundFMatR" ||
            _member == "mAutoRPUpdate" || _member == "mCamCullUpdate" ||
            _member == "mColorModel" || _member == "mAlphaModel" || _member == "mColorVFX")
            return false;
        return super.IsShould(_member, _type);
    }
    BatchClear() {
        for (let ren of this.mRenPT) {
            if (ren != null) {
                ren.mDistance = -0x7f000000;
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
    UpdateFMat() { this.mUpdateFMat = true; }
    EditForm(_pointer, _body, _input) {
        if (_pointer.member == "mColorVFX" && this.mColorVFX == null) {
            let btn = document.createElement("button");
            btn.innerText = "생성";
            btn.onclick = () => {
                this.mShaderAttrMap.set("colorVFX", new CShaderAttr("colorVFX", new CColorVFX([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])));
                this.mColorVFX = this.mShaderAttrMap.get("colorVFX").mData;
                this.PushTag("vfx");
                this.BatchClear();
                this.EditRefresh();
            };
            _body.append(btn);
        }
        else if (_pointer.member == "mTexture" || _pointer.member == "mTag") {
            CUtilObj.ArrayAddSelectList(_pointer, _body, _input, [""], true);
            if (_pointer.member == "mTag") {
                _body.append(CUtilObj.ArrayAddButton(_pointer, "Light", "light"));
            }
        }
    }
    SetOwner(_obj) {
        super.SetOwner(_obj);
        this.ClearCRPAuto();
        this.SetTexture(this.mTexture);
    }
    SetMaterial(emission, roughness = 0, metalric = 0, texuse = 1) {
        this.mMaterial = new CVec4(emission, roughness, metalric, texuse);
        ;
    }
    AlphaState() {
        if (this.mAlphaTex || (this.mAlphaModel.y == 0 && this.mAlphaModel.x != 0) ||
            (this.mAlphaModel.y > 0.5 && this.mAlphaModel.x != 1))
            return true;
        return false;
    }
    UpdateRenPt() {
        for (let i = 0; i < this.mRenPT.length; ++i) {
            let ren = this.mRenPT[i];
            if (ren.mShow == 2)
                ren.mShow = 0;
            if (this.mOwner.IsEnable() == false || this.IsEnable() == false) {
                ren.mShow = 2;
                ren.mDistance = -0x70000000;
            }
            else if (ren.mDistance == 0 || ren.mCam.mUpdateMat != 0 || this.mUpdateFMat || this.mOwner.GetFrame().Win().IsResize()) {
                let cam = ren.mCam;
                let plane = ren.mCam.GetPlane();
                if (ren.mDistance != null) {
                    let eye = ren.mCam.GetEye();
                    let pos = CPoolGeo.ProductV3();
                    if (this.mRenderPass[i].mSort == CRenderPass.eSort.None) {
                        ren.mDistance = null;
                    }
                    else if (cam.GetView().z < -0.98) {
                        ren.mDistance = eye.z - this.mFMat.z;
                    }
                    else {
                        pos.mF32A[0] = this.mFMat.mF32A[12];
                        pos.mF32A[1] = this.mFMat.mF32A[13];
                        pos.mF32A[2] = this.mFMat.mF32A[14];
                        ren.mDistance = CMath.V3DistancePseudo(eye, pos);
                    }
                    CPoolGeo.RecycleV3(pos);
                }
                if (CUtilMath.PlaneSphereInside(plane, this.mBoundFMatC, this.mBoundFMatR, null) || this.mRenderPass[i].mCullFrustum == false)
                    ren.mShow = 0;
                else {
                    ren.mShow = 1;
                    ren.mDistance = -0x70000000;
                }
            }
        }
    }
    Refresh() {
        this.mColorModel = this.mShaderAttrMap.get("colorModel").mData;
        this.mAlphaModel = this.mShaderAttrMap.get("alphaModel").mData;
        if (this.mColorModel.mModel != SDF.eColorModel.None)
            this.PushTag("color");
        if (this.mColorModel.mModel != SDF.eAlphaModel.None)
            this.PushTag("color");
        if (this.mShaderAttrMap.get("colorVFX") != null)
            this.mColorVFX = this.mShaderAttrMap.get("colorVFX").mData;
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
    EditChange(_pointer, _childe) {
        super.EditChange(_pointer, _childe);
        if (_pointer.IsRef(this.mTexture)) {
            this.SetTexture(this.mTexture);
            this.BatchClear();
        }
        else if (_pointer.IsRef(this.mTag)) {
            this.mTagKey = null;
            this.BatchClear();
        }
        else if (_childe) {
            if (_pointer.IsRef(this.mRenderPass)) {
                this.ClearCRPAuto();
                if (_pointer.target instanceof CRenderPass)
                    _pointer.target.Reset();
                else
                    CAlert.E("CRPAuto는 페인트 내에서 수정 불가합니다.");
            }
            else if (_pointer.IsRef(this.mAlphaModel)) {
                this.PushTag("color");
                this.ClearCRPAuto();
            }
            else if (_pointer.IsRef(this.mColorModel)) {
                this.PushTag("color");
                this.ClearCRPAuto();
            }
            else if (_pointer.IsRef(this.mColorVFX)) {
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
        this.BatchClear();
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
        this.mTag.add(_tag);
        this.mTagKey = null;
    }
    RemoveTag(_tag) {
        this.mTag.delete(_tag);
        this.mTagKey = null;
    }
    GetDrawMesh(_meshKey, _shader, _ci) {
        var drawMesh = this.mOwner.GetFrame().Res().Find(_meshKey + _shader.ObjHash());
        if (drawMesh == null) {
            drawMesh = new CMeshDrawNode();
            this.mOwner.GetFrame().Ren().BuildMeshDrawNodeAutoFix(drawMesh, _shader, _ci);
            this.mOwner.GetFrame().Res().Push(_meshKey + _shader.ObjHash(), drawMesh);
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
    Light() {
        this.PushTag("light");
    }
    Shadow() {
        this.PushTag("shadow");
    }
    GetRenderPass() { return this.mRenderPass; }
    SetRenderPass(_rp, _copy = true) {
        this.mDefaultAttr = new Set();
        this.mRenderPass = new Array();
        if (_rp instanceof Array) {
            for (let each0 of _rp) {
                if (_copy)
                    this.mRenderPass.push(each0.Export());
                else
                    this.mRenderPass.push(each0);
            }
        }
        else {
            var rp = null;
            if (_copy)
                rp = _rp.Export(_copy);
            else
                rp = _rp;
            this.mRenderPass.push(rp);
        }
        this.BatchClear();
    }
    PushCShaderAttr(_sa) {
        let attr = this.mShaderAttrMap.get(_sa.mKey);
        if (attr == null) {
            this.BatchClear();
            this.mShaderAttrMap.set(_sa.mKey, _sa);
        }
        else
            attr.Import(_sa);
    }
    FindCShaderAttr(_key) {
        return this.mShaderAttrMap.get(_key);
    }
    SetRGBA(_rgba) {
        this.mColorModel.mF32A[0] = _rgba.mF32A[0];
        this.mColorModel.mF32A[1] = _rgba.mF32A[1];
        this.mColorModel.mF32A[2] = _rgba.mF32A[2];
        this.mColorModel.mF32A[3] = SDF.eColorModel.RGBAdd;
        this.mAlphaModel.mF32A[0] = _rgba.mF32A[3];
        this.mAlphaModel.mF32A[1] = SDF.eAlphaModel.Add;
        if (this.mTag.has("color") == false)
            this.BatchClear();
        this.PushTag("color");
    }
    SetColorModel(_color) {
        this.mColorModel.mF32A[0] = _color.mF32A[0];
        this.mColorModel.mF32A[1] = _color.mF32A[1];
        this.mColorModel.mF32A[2] = _color.mF32A[2];
        this.mColorModel.mF32A[3] = _color.mF32A[3];
        if (this.mTag.has("color") == false)
            this.BatchClear();
        this.PushTag("color");
    }
    SetAlphaModel(_alpha) {
        let as = this.AlphaState();
        this.mAlphaModel.mF32A[0] = _alpha.mF32A[0];
        this.mAlphaModel.mF32A[1] = _alpha.mF32A[1];
        if (as != this.AlphaState())
            this.ClearCRPAuto();
        if (this.mTag.has("color") == false)
            this.BatchClear();
        this.PushTag("color");
    }
    SetColorVFX(_a, _b = null) {
        if (this.mColorVFX == null) {
            this.mShaderAttrMap.set("colorVFX", new CShaderAttr("colorVFX", new CColorVFX([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])));
            this.mColorVFX = this.mShaderAttrMap.get("colorVFX").mData;
            this.PushTag("vfx");
            this.BatchClear();
        }
        if (_a instanceof CColorVFX) {
            this.mColorVFX.Import(_a);
        }
        else {
            let cv = this.mColorVFX;
            cv.SetV4(_a, _b);
        }
        this.PushTag("vfx");
    }
    GetColorVFX(_offset) {
        if (this.mColorVFX == null) {
            this.mShaderAttrMap.set("colorVFX", new CShaderAttr("colorVFX", new CColorVFX([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])));
            this.mColorVFX = this.mShaderAttrMap.get("colorVFX").mData;
            this.PushTag("vfx");
            this.BatchClear();
        }
        let cv = this.mColorVFX;
        return cv.GetV4(_offset);
    }
    GetRGBA() {
        return new CVec4(this.mColorModel.x, this.mColorModel.y, this.mColorModel.z, this.mAlphaModel.x);
    }
    GetLMat() { return this.mLMat; }
    ;
    SetLMat(_mat) { this.mLMat.Import(_mat); this.mUpdateLMat = true; }
    CacBound() {
        if (this.mFMat.Ptr() == null) {
            this.mBoundFMat.mMin.mF32A[0] = this.mBound.mMin.mF32A[0] * this.mFMat.mF32A[0];
            this.mBoundFMat.mMin.mF32A[1] = this.mBound.mMin.mF32A[1] * this.mFMat.mF32A[5];
            this.mBoundFMat.mMin.mF32A[2] = this.mBound.mMin.mF32A[2] * this.mFMat.mF32A[10];
            this.mBoundFMat.mMax.mF32A[0] = this.mBound.mMax.mF32A[0] * this.mFMat.mF32A[0];
            this.mBoundFMat.mMax.mF32A[1] = this.mBound.mMax.mF32A[1] * this.mFMat.mF32A[5];
            this.mBoundFMat.mMax.mF32A[2] = this.mBound.mMax.mF32A[2] * this.mFMat.mF32A[10];
            this.mBoundFMat.mMin.mF32A[0] += this.mFMat.mF32A[12];
            this.mBoundFMat.mMin.mF32A[1] += this.mFMat.mF32A[13];
            this.mBoundFMat.mMin.mF32A[2] += this.mFMat.mF32A[14];
            this.mBoundFMat.mMax.mF32A[0] += this.mFMat.mF32A[12];
            this.mBoundFMat.mMax.mF32A[1] += this.mFMat.mF32A[13];
            this.mBoundFMat.mMax.mF32A[2] += this.mFMat.mF32A[14];
            this.mBoundFMat.GetCenter(this.mBoundFMatC);
            var maxX = Math.abs(this.mBoundFMat.mMax.mF32A[0] - this.mBoundFMatC.mF32A[0]);
            var maxY = Math.abs(this.mBoundFMat.mMax.mF32A[1] - this.mBoundFMatC.mF32A[1]);
            var maxZ = Math.abs(this.mBoundFMat.mMax.mF32A[2] - this.mBoundFMatC.mF32A[2]);
            var maxAll = CMath.Max(CMath.Max(maxX, maxY), maxZ);
            this.mBoundFMatR = maxAll;
        }
        else {
            this.mBoundFMatR = CWASM.BoundMulMat(this.mBoundFMat.mMin.Ptr(), this.mBoundFMat.mMax.Ptr(), this.mBound.mMin.Ptr(), this.mBound.mMax.Ptr(), this.mFMat.Ptr(), this.mBoundFMatC.Ptr());
        }
        this.mBoundFMatR *= 1.5;
    }
    Prefab(_owner) {
        if (this.mAutoLoad != null) {
            for (let texKey of this.mTexture) {
                if (texKey.indexOf(".atl") != -1)
                    continue;
                _owner.GetFrame().Load().Load(texKey, this.mAutoLoad);
            }
        }
    }
    Start() {
        this.InitPaint();
        if (this.mTexture.length > 0)
            this.SetTexture(this.mTexture);
    }
    Update(_delay) {
        if (this.mUpdateFMat)
            this.mUpdateFMat = false;
        if (this.mUpdateLMat || this.mOwner.mUpdateMat != 0 || this.mBoundFMatR == 0) {
            CMath.MatMul(this.mLMat, this.mOwner.GetWMat(), this.mFMat);
            this.CacBound();
            this.mUpdateFMat = true;
        }
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
        return this.mBoundFMat;
    }
    SetBound(_bound) {
        this.mBound = _bound;
        this.mBoundFMatR = 0;
    }
    Render(_vf) { }
    RenderBatch(_vf, _count = 1) {
        let bcm = this.mOwner.GetFrame().BMgr().IsBatchMap();
        var barr = this.mBatchMap.get(_vf.mKey);
        if (barr == null) {
            barr = new Array(_count);
            this.mBatchMap.set(_vf.mKey, barr);
            barr.length = _count;
        }
        else if (bcm == false) { }
        else if (barr.length > 0) {
            return this.mOwner.GetFrame().BMgr().BatchPushArr(barr);
        }
        return barr;
    }
    SetTexture(_a, _b = null, _c = null, _d = null, _e = null) {
        if (_a instanceof Array) {
            if (_a != this.mTexture) {
                this.mTexture.length = 0;
                for (var i = 0; i < _a.length; ++i)
                    this.mTexture.push(_a[i]);
            }
        }
        else {
            this.mTexture.length = 0;
            this.mTexture.push(_a);
            if (_b != null)
                this.mTexture.push(_b);
            if (_c != null)
                this.mTexture.push(_c);
            if (_d != null)
                this.mTexture.push(_d);
            if (_e != null)
                this.mTexture.push(_e);
        }
        for (let each0 of this.mBatchMap.values()) {
            if (each0 != null) {
                for (let i = 0; i < each0.length; ++i) {
                    let bh = each0[i];
                    if (bh != null)
                        bh.CreateKey();
                }
            }
        }
        if (this.mAutoLoad != null && this.mOwner != null && this.mOwner.GetFrame() != null) {
            for (let texKey of this.mTexture) {
                if (texKey.indexOf(".atl") != -1 || texKey.indexOf("base64") != -1 || texKey.indexOf(".tex") != -1)
                    continue;
                let tex = this.mOwner.GetFrame().Res().Find(texKey);
                if (tex != null && tex instanceof CTexture) {
                    if (tex.GetAlpha()) {
                        this.mAlphaTex = true;
                    }
                    continue;
                }
                if (this.mOwner.GetFrame().Load().IsLoad(texKey) == false)
                    this.mOwner.GetFrame().Load().Load(texKey, this.mAutoLoad);
            }
        }
    }
    GetTexture() { return this.mTexture; }
    GetTexHash() {
        let str = "";
        let hash = 0;
        for (let texKey of this.mTexture) {
            str += texKey;
        }
        hash = CHash.HashCode(str);
        hash = 0xffff & hash;
        let floatHash = hash * 0.000000001;
        const precision = 1e9;
        return Math.floor(floatHash * precision) / precision;
    }
    InitPaint() {
        this.mColorModel = this.mShaderAttrMap.get("colorModel").mData;
        this.mAlphaModel = this.mShaderAttrMap.get("alphaModel").mData;
        if (this.mShaderAttrMap.get("colorVFX") != null)
            this.mColorVFX = this.mShaderAttrMap.get("colorVFX").mData;
    }
}
