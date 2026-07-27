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
import { CChecker } from "../../../util/CChecker.js";
var gMargin = 1.0;
;
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
    static eCullMask = {
        Default: 0b100000000000000,
        Mask01: 0b010000000000000,
        Mask02: 0b001000000000000,
        Mask03: 0b000100000000000,
        Mask04: 0b000010000000000,
        Mask05: 0b000001000000000,
        Mask06: 0b000000100000000,
        Mask07: 0b000000010000000,
        Mask08: 0b000000001000000,
        Mask09: 0b000000000100000,
        Mask10: 0b000000000010000,
        Mask11: 0b000000000001000,
        Mask12: 0b000000000000100,
        Mask13: 0b000000000000010,
        Mask14: 0b000000000000001
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
    mCullMask;
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
        this.mShaderAttrMap.set("alphaModel", new CShaderAttr("alphaModel", new CAlpha(1)));
        this.mShaderAttrMap.set("cullMask", new CShaderAttr("cullMask", new CVec4(CPaint.eCullMask.Default)));
        this.mColorModel = this.mShaderAttrMap.get("colorModel").mData;
        this.mAlphaModel = this.mShaderAttrMap.get("alphaModel").mData;
        this.mCullMask = this.mShaderAttrMap.get("cullMask").mData;
        this.mVFX = null;
        this.mFMat = new CMat(null);
        this.mFMat.NewWASM();
        this.mLMat = new CMat(null);
        this.mLMat.NewWASM();
        this.mBW.mPos.NewWASM();
        this.mBound = new CBound();
        this.mBound.NewWASM();
        if (gPosDummy.Ptr() == null)
            gPosDummy.NewWASM();
    }
    SetWorldType(_type) {
        this.mWorldMatType = _type;
        this.PushTag("worldType");
    }
    SetEnable(_val) {
        if (this.mEnable != _val)
            this.ClearCRPAuto();
        super.SetEnable(_val);
    }
    GetColorModel() { return this.mColorModel; }
    GetAlphaModel() { return this.mAlphaModel; }
    Icon() { return "bi bi-paint-bucket"; }
    RegistHeap(_F32A) {
    }
    SetTexCodi(_stX, _stY = null, _edX = null, _edY = null, _imgW = null, _imgH = null, _margin = gMargin) {
        if (this.PushTag("codi"))
            this.ClearBatch();
        if (_stX == null) {
            this.mTexCodi.x = 1 - _stY;
            this.mTexCodi.y = 1 - _stY;
            this.mTexCodi.z = _stY * 0.5;
            this.mTexCodi.w = _stY * 0.5;
        }
        else if (_stX instanceof CVec4) {
            if (_stY == null)
                _stY = 0;
            this.mTexCodi.x = _stX.x - _stY;
            this.mTexCodi.y = _stX.y - _stY;
            this.mTexCodi.z = _stX.z + _stY * 0.5;
            this.mTexCodi.w = _stX.w + _stY * 0.5;
        }
        else {
            this.mTexCodi.x = (_edX - _stX) / _imgW - _margin / _imgW;
            this.mTexCodi.y = (_edY - _stY) / _imgH - _margin / _imgH;
            this.mTexCodi.z = (_stX) / _imgW + (_margin * 0.5) / _imgW;
            this.mTexCodi.w = 1 - (_stY / _imgH) - this.mTexCodi.y - (_margin * 0.5) / _imgH;
        }
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
        this.mBatchMap.clear();
    }
    IsShould(_member, _type) {
        if (_type == CObject.eShould.Editer && this.IsProxy() == false) {
            if (_member == "mColorModel" || _member == "mAlphaModel" || _member == "mVFX" || _member == "mBound")
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
        else if (_pointer.member == "mCullMask") {
            let ukey = this.ObjHash();
            let maskKeys = CClass.EnumName(CPaint.eCullMask);
            let curMask = this.mCullMask.x;
            let wrap = document.createElement("div");
            wrap.className = "border p-1 mt-1";
            let title = document.createElement("span");
            title.className = "text-primary";
            title.innerText = "CullMask";
            wrap.append(title);
            let valSpan = document.createElement("span");
            valSpan.className = "text-secondary ms-2";
            valSpan.id = "cm_val_" + ukey;
            valSpan.innerText = "0b" + curMask.toString(2);
            wrap.append(valSpan);
            wrap.append(document.createElement("br"));
            let grid = document.createElement("div");
            grid.className = "row";
            for (let key of maskKeys) {
                let cell = document.createElement("div");
                cell.className = "col-6";
                let chk = document.createElement("input");
                chk.type = "checkbox";
                chk.id = "cm_" + ukey + "_" + key;
                chk.className = "form-check-input";
                chk.checked = (curMask & CPaint.eCullMask[key]) !== 0;
                chk.onchange = () => {
                    let newMask = 0;
                    for (let k of maskKeys) {
                        let c = document.getElementById("cm_" + ukey + "_" + k);
                        if (c && c.checked)
                            newMask |= CPaint.eCullMask[k];
                    }
                    this.SetCullMask(newMask);
                    document.getElementById("cm_val_" + ukey).innerText = "0b" + newMask.toString(2);
                    this.EditChange(_pointer, false);
                };
                let lbl = document.createElement("label");
                lbl.className = "form-check-label ms-1";
                lbl.setAttribute("for", "cm_" + ukey + "_" + key);
                lbl.innerText = key;
                cell.append(chk);
                cell.append(lbl);
                grid.append(cell);
            }
            wrap.append(grid);
            _body.append(wrap);
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
    SetCullMask(_cullmask) {
        this.mCullMask.x = _cullmask;
    }
    IsAlphaState() {
        if (this.mAlphaTex || (this.GetTag().has("alphaModel") && this.mAlphaModel.x != 1))
            return true;
        return false;
    }
    UpdateRenPt() {
        for (let i = 0; i < this.mRenPT.length; ++i) {
            let ren = this.mRenPT[i];
            if (ren.mDistance == null || ren.mCam.mUpdateMat != 0 || this.mUpdateFMat || this.mOwner.GetFrame().Win().IsResize()) {
                let cam = ren.mCam;
                let plane = ren.mCam.GetPlane();
                if (this.mRenderPass[i].mPaintSort != CRenderPass.ePaintSort.None) {
                    let eye = ren.mCam.GetEye();
                    let view = ren.mCam.GetView();
                    gPosDummy.x = this.mBW.mPos.x - eye.x;
                    gPosDummy.y = this.mBW.mPos.y - eye.y;
                    gPosDummy.z = this.mBW.mPos.z - eye.z;
                    ren.mDistance = CMath.V3Dot(gPosDummy, view);
                    ren.mDistance = Math.trunc(ren.mDistance * 128) << 9;
                }
                else
                    ren.mDistance = 0;
            }
        }
    }
    Refresh() {
        if (this.mShaderAttrMap.get("texCodi") == null)
            this.mShaderAttrMap.set("texCodi", new CShaderAttr("texCodi", this.mTexCodi));
        this.mColorModel = this.mShaderAttrMap.get("colorModel").mData;
        this.mAlphaModel = this.mShaderAttrMap.get("alphaModel").mData;
        this.mCullMask = this.mShaderAttrMap.get("cullMask").mData;
        if (this.mColorModel.mModel != SDF.eColorModel.None)
            this.PushTag("colorModel");
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
        else if (_pointer.member == "mColorModel") {
            this.PushTag("colorModel");
            this.ClearCRPAuto();
        }
        else if (_pointer.member == "mAlphaModel") {
            this.PushTag("alphaModel");
            this.ClearCRPAuto();
        }
        else if (_pointer.member == "mCullMask") {
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
                this.PushTag("alphaModel");
                this.ClearCRPAuto();
            }
            else if (_pointer.IsRef(this.mColorModel)) {
                this.PushTag("colorModel");
                this.ClearCRPAuto();
            }
            else if (_pointer.IsRef(this.mVFX)) {
                this.PushTag("vfx");
                let NeedVFXMat0 = (this.mVFX.mF32A[0] == SDF.eVFX.Decal || this.mVFX.mF32A[0] == SDF.eVFX.DecalTexture || this.mVFX.mF32A[5] == SDF.eVFX.Decal || this.mVFX.mF32A[5] == SDF.eVFX.DecalTexture);
                let NeedVFXMat1 = (this.mVFX.mF32A[5] == SDF.eVFX.Decal || this.mVFX.mF32A[5] == SDF.eVFX.DecalTexture || this.mVFX.mF32A[10] == SDF.eVFX.Decal || this.mVFX.mF32A[10] == SDF.eVFX.DecalTexture);
                let vfxMat0 = NeedVFXMat0
                    ? (this.FindCShaderAttr("vfxMat0") || (this.PushCShaderAttr(new CShaderAttr("vfxMat0", new CMat())), this.FindCShaderAttr("vfxMat0").mData.mF32A.fill(0), this.FindCShaderAttr("vfxMat0")))
                    : (this.mShaderAttrMap.delete("vfxMat0"), null);
                let vfxMat1 = NeedVFXMat1
                    ? (this.FindCShaderAttr("vfxMat1") || (this.PushCShaderAttr(new CShaderAttr("vfxMat1", new CMat())), this.FindCShaderAttr("vfxMat1").mData.mF32A.fill(0), this.FindCShaderAttr("vfxMat1")))
                    : (this.mShaderAttrMap.delete("vfxMat1"), null);
                if ((this.mVFX.mF32A[0] == SDF.eVFX.Decal || this.mVFX.mF32A[0] == SDF.eVFX.DecalTexture) && vfxMat0?.mData.mF32A.subarray(0, 10).every(v => v === 0)) {
                    this.ResetDecal(0);
                }
                if ((this.mVFX.mF32A[5] == SDF.eVFX.Decal || this.mVFX.mF32A[5] == SDF.eVFX.DecalTexture) &&
                    vfxMat0?.mData.mF32A.subarray(10, 16).every(v => v === 0) &&
                    vfxMat1?.mData.mF32A.subarray(0, 4).every(v => v === 0)) {
                    this.ResetDecal(1);
                }
                if ((this.mVFX.mF32A[10] == SDF.eVFX.Decal || this.mVFX.mF32A[10] == SDF.eVFX.DecalTexture) && vfxMat1?.mData.mF32A.subarray(4, 14).every(v => v === 0)) {
                    this.ResetDecal(2);
                }
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
    GetDrawMesh(_meshKey, _shader, _ci, _modify = false) {
        var drawMesh = this.mOwner.GetFrame().Res().Find(_meshKey + _shader.ObjHash());
        if (drawMesh == null) {
            drawMesh = new CMeshDrawNode();
            this.mOwner.GetFrame().Ren().BuildMeshDrawNodeAutoFix(drawMesh, _shader, _ci);
            this.mOwner.GetFrame().Res().Push(_meshKey + _shader.ObjHash(), drawMesh);
            drawMesh.SetKey(_meshKey + _shader.ObjHash());
        }
        else if (_modify)
            this.mOwner.GetFrame().Ren().BuildMeshDrawNode(drawMesh, _ci, _shader);
        return drawMesh;
    }
    GetTagKey() {
        if (this.mTagKey == null) {
            let key = "";
            let sortedArr = Array.from(this.mTag);
            sortedArr.sort();
            for (var each0 of sortedArr) {
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
    SetColorModel(_color) {
        this.mColorModel.mF32A[0] = _color.mF32A[0];
        this.mColorModel.mF32A[1] = _color.mF32A[1];
        this.mColorModel.mF32A[2] = _color.mF32A[2];
        this.mColorModel.mF32A[3] = _color.mF32A[3];
        if (this.mTag.has("colorModel") == false)
            this.ClearBatch();
        this.PushTag("colorModel");
    }
    SetAlphaModel(_alpha) {
        let as = this.IsAlphaState();
        this.mAlphaModel.mF32A[0] = _alpha.mF32A[0];
        this.mAlphaModel.mF32A[1] = _alpha.mF32A[1];
        if (as != this.IsAlphaState())
            this.ClearCRPAuto();
        if (this.mTag.has("alphaModel") == false)
            this.ClearBatch();
        this.PushTag("alphaModel");
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
            for (let i = 0; i < _c.length; ++i)
                cv.mF32A[_a * 5 + i + 1] = _c[i];
            cv.mF32A[_a * 5] = _b;
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
    FMatUpdate() {
        CMath.MatMul(this.mLMat, this.mOwner.GetMat(), this.mFMat, true);
        if (this.GetOwner().mUpdateRS != CUpdate.eType.Not || this.mBW.mRadian == 0) {
            if (this.mTag.has("tail"))
                this.mBW.Init(this.mBound, null);
            else
                this.mBW.Init(this.mBound, this.mOwner.GetMat());
        }
        this.mBW.UpdateMat(this.mOwner.GetMat());
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
            this.FMatUpdate();
            this.mUpdateFMat = true;
            this.mUpdateLMat = false;
        }
        this.UpdateRenPt();
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
                if (this.mOwner.GetFrame().Load().LoadSet().has(texKey) == true) {
                    CChecker.Exe(async () => {
                        if (this.mOwner.GetFrame().Load().LoadSet().has(texKey) == false) {
                            this.UpdateLMat();
                            return false;
                        }
                        return true;
                    });
                }
                else if (this.mOwner.GetFrame().Load().IsLoad(texKey) == false) {
                    this.mOwner.GetFrame().Load().Exe(texKey, this.mAutoLoad).then(() => {
                        this.UpdateLMat();
                    });
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
        if (this.mShaderAttrMap.get("cullMask") == null) {
            this.mShaderAttrMap.set("cullMask", new CShaderAttr("cullMask", new CVec4(CPaint.eCullMask.Default)));
        }
        this.mColorModel = this.mShaderAttrMap.get("colorModel").mData;
        this.mAlphaModel = this.mShaderAttrMap.get("alphaModel").mData;
        this.mCullMask = this.mShaderAttrMap.get("cullMask").mData;
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
        const startX = Math.round((this.mTexCodi.z - (gMargin * 0.5) / imgW) * imgW);
        const startY = Math.round((1 - this.mTexCodi.w - this.mTexCodi.y - (gMargin * 0.5) / imgH) * imgH);
        const endX = Math.round((this.mTexCodi.z + this.mTexCodi.x + gMargin / imgW) * imgW);
        const endY = Math.round((1 - this.mTexCodi.w + gMargin / imgH) * imgH);
        return new CVec4(startX, startY, endX, endY);
    }
    ResetDecal(_slot, _pos = null, _size = null, _dir = new CVec3(0, 0, -1), _imageRot = 0) {
        if (this.mInit == false) {
            CChecker.Exe(async () => {
                if (this.mInit)
                    return false;
                return true;
            }).then(() => {
                this.ResetDecal(_slot, _pos, _size, _dir, _imageRot);
            });
            return;
        }
        if (_pos == null) {
            _pos = this.mBW.mBound.GetCenter();
            CMath.V3AddV3(_pos, this.GetFMat().xyz, _pos);
        }
        if (_size == null) {
            _size = this.mBW.mBound.GetSize();
            _size.x = Math.max(_size.x, 1);
            _size.y = Math.max(_size.y, 1);
            _size.z = Math.max(_size.z, 1);
        }
        if (this.mVFX == null) {
            this.mShaderAttrMap.set("VFX", new CShaderAttr("VFX", new CVFX([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])));
            this.mVFX = this.mShaderAttrMap.get("VFX").mData;
            this.PushTag("vfx");
            this.ClearBatch();
        }
        if (_slot == 0) {
            let vfxMat0 = this.FindCShaderAttr("vfxMat0");
            if (vfxMat0 == null)
                this.PushCShaderAttr(vfxMat0 = new CShaderAttr("vfxMat0", new CMat()));
            if (vfxMat0) {
                vfxMat0.mData.mF32A[0] = _dir.x;
                vfxMat0.mData.mF32A[4] = _size.x;
                vfxMat0.mData.mF32A[7] = _pos.x;
                vfxMat0.mData.mF32A[1] = _dir.y;
                vfxMat0.mData.mF32A[5] = _size.y;
                vfxMat0.mData.mF32A[8] = _pos.y;
                vfxMat0.mData.mF32A[2] = _dir.z;
                vfxMat0.mData.mF32A[6] = _size.z;
                vfxMat0.mData.mF32A[9] = _pos.z;
                vfxMat0.mData.mF32A[3] = _imageRot;
            }
        }
        else if (_slot == 1) {
            let vfxMat0 = this.FindCShaderAttr("vfxMat0");
            if (vfxMat0 == null)
                this.PushCShaderAttr(vfxMat0 = new CShaderAttr("vfxMat0", new CMat()));
            let vfxMat1 = this.FindCShaderAttr("vfxMat1");
            if (vfxMat1 == null)
                this.PushCShaderAttr(vfxMat1 = new CShaderAttr("vfxMat1", new CMat()));
            if (vfxMat0 && vfxMat1) {
                vfxMat0.mData.mF32A[10] = _dir.x;
                vfxMat0.mData.mF32A[14] = _size.x;
                vfxMat1.mData.mF32A[1] = _pos.x;
                vfxMat0.mData.mF32A[11] = _dir.y;
                vfxMat0.mData.mF32A[15] = _size.y;
                vfxMat1.mData.mF32A[2] = _pos.y;
                vfxMat0.mData.mF32A[12] = _dir.z;
                vfxMat1.mData.mF32A[0] = _size.z;
                vfxMat1.mData.mF32A[3] = _pos.z;
                vfxMat0.mData.mF32A[13] = _imageRot;
            }
        }
        else {
            let vfxMat1 = this.FindCShaderAttr("vfxMat1");
            if (vfxMat1 == null)
                this.PushCShaderAttr(vfxMat1 = new CShaderAttr("vfxMat1", new CMat()));
            if (vfxMat1) {
                vfxMat1.mData.mF32A[4] = _dir.x;
                vfxMat1.mData.mF32A[8] = _size.x;
                vfxMat1.mData.mF32A[11] = _pos.x;
                vfxMat1.mData.mF32A[5] = _dir.y;
                vfxMat1.mData.mF32A[9] = _size.y;
                vfxMat1.mData.mF32A[12] = _pos.y;
                vfxMat1.mData.mF32A[6] = _dir.z;
                vfxMat1.mData.mF32A[10] = _size.z;
                vfxMat1.mData.mF32A[13] = _pos.z;
                vfxMat1.mData.mF32A[7] = _imageRot;
            }
        }
    }
}
