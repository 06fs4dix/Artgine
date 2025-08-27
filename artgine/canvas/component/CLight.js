import { CVec4 } from "../../geometry/CVec4.js";
import { CVec3 } from "../../geometry/CVec3.js";
import { CComponent } from "../component/CComponent.js";
import { CMath } from "../../geometry/CMath.js";
import { CCamComp } from "./CCamComp.js";
import { CRenderPass } from "../../render/CRenderPass.js";
import { CShaderAttr } from "../../render/CShaderAttr.js";
import { CDevice } from "../../render/CDevice.js";
import { CTexture, CTextureInfo } from "../../render/CTexture.js";
import { CVec2 } from "../../geometry/CVec2.js";
import { CDomFactory } from "../../basic/CDOMFactory.js";
import { CUpdate } from "../../basic/Basic.js";
import { CUtil } from "../../basic/CUtil.js";
import { CRPAuto } from "../CRPMgr.js";
export class CLight extends CCamComp {
    mCascadeCycle = [0, -1, -1];
    mShadowDistance = 1;
    mDigit = 1;
    mShadowOff = false;
    mDirPos;
    mColor;
    mUpdate = CUpdate.eType.Updated;
    constructor() {
        super(null);
        this.mDirPos = new CVec4();
        this.mColor = new CVec4();
        this.mDirPos.w = 1;
        this.mColor.x = 1;
        this.mColor.y = 1;
        this.mColor.z = 1;
        this.mColor.w = 1;
        this.mSysc = CComponent.eSysn.Light;
    }
    Icon() { return "bi bi-lightbulb"; }
    EditChange(_pointer, _child) {
        super.EditChange(_pointer, _child);
        if (_child == false)
            return;
        for (let ref of _pointer.refArr) {
            if (ref == this.mDirPos || ref == this.mColor) {
                this.mUpdate = CUpdate.eType.Updated;
                break;
            }
        }
    }
    EditForm(_pointer, _div, _input) {
        if (_pointer.member == "mColor") {
            var div = { "tag": "div", "html": [] };
            div.html.push({ "<>": "br" });
            let wtKey = this.ObjHash();
            let sel = { "<>": "select", "class": "form-select", "html": [
                    { "<>": "option", "value": 0, "text": "None", "selected": true },
                    { "<>": "option", "value": -1, "text": "Direct" },
                    { "<>": "option", "value": 1, "text": "Point" },
                ], "onchange": (e) => {
                    let selObj = e.target;
                    if (selObj.value == "-1") {
                        CUtil.ID("ligPo_div" + wtKey).hidden = true;
                        CUtil.ID("ligCor_div" + wtKey).hidden = false;
                    }
                    else if (selObj.value == "1") {
                        CUtil.ID("ligPo_div" + wtKey).hidden = false;
                        CUtil.ID("ligCor_div" + wtKey).hidden = false;
                    }
                    else {
                        CUtil.ID("ligPo_div" + wtKey).hidden = true;
                        CUtil.ID("ligCor_div" + wtKey).hidden = true;
                    }
                } };
            div.html.push(sel);
            div.html.push({ "<>": "div", "id": "ligPo_div" + wtKey, "hidden": true, "html": [
                    { "<>": "span", "text": "Point:" },
                    { "<>": "input", "type": "number", "id": "ligPoOuter_num" + wtKey, "class": "form-control", "placeholder": "outer" },
                    { "<>": "input", "type": "number", "id": "ligPoInner_num" + wtKey, "class": "form-control", "placeholder": "inner" },
                ] });
            div.html.push({ "<>": "div", "id": "ligCor_div" + wtKey, "hidden": true, "html": [
                    { "<>": "span", "text": "Color:" },
                    { "<>": "input", "type": "number", "id": "ligCorX_num" + wtKey, "class": "form-control", "placeholder": "x" },
                    { "<>": "input", "type": "number", "id": "ligCorY_num" + wtKey, "class": "form-control", "placeholder": "y" },
                    { "<>": "input", "type": "number", "id": "ligCorZ_num" + wtKey, "class": "form-control", "placeholder": "z" },
                ] });
            div.html.push({ "<>": "button", "type": "button", "class": "btn btn-primary btn-lg btn-block btn-sm", "text": "적용",
                "onclick": () => {
                    let po = CUtil.ID("ligPo_div" + wtKey).hidden;
                    let cor = CUtil.ID("ligCor_div" + wtKey).hidden;
                    if (po == false) {
                        let outer = Number(CUtil.IDValue("ligPoOuter_num" + wtKey));
                        let inner = Number(CUtil.IDValue("ligPoInner_num" + wtKey));
                        this.SetPoint(outer, inner);
                    }
                    else if (cor == false) {
                        this.SetDirect();
                    }
                    let corX = Number(CUtil.IDValue("ligCorX_num" + wtKey));
                    let corY = Number(CUtil.IDValue("ligCorY_num" + wtKey));
                    let corZ = Number(CUtil.IDValue("ligCorZ_num" + wtKey));
                    this.SetColor(new CVec3(corX, corY, corZ));
                    this.EditRefresh();
                }
            });
            _div.append(CDomFactory.DataToDom(div));
        }
    }
    GetTex() { return this.GetOwner().GetFrame().Pal().GetShadowArrTex(); }
    Update(_delay) {
        if (this.mUpdate == CUpdate.eType.Already) {
            this.mUpdate = CUpdate.eType.Not;
        }
        else if (this.mUpdate == CUpdate.eType.Updated) {
            this.mUpdate = CUpdate.eType.Already;
        }
        var cm = this.ProductMsg("SetLight");
        cm.mChild = true;
        cm.mInter = "";
        cm.mMsgData[0] = this;
        if (this.GetOwner().mUpdateMat != 0 || this.mUpdate == CUpdate.eType.Updated) {
            var pos = this.GetOwner().GetWMat().xyz;
            if (this.mDirPos.w <= -1) {
                CMath.V3Nor(pos, pos);
                if (pos.IsZero()) {
                    pos.y = 1;
                }
            }
            this.SetDirectPos(pos);
        }
        super.Update(_delay);
    }
    SetDirectPos(_dir) {
        this.mDirPos.mF32A[0] = _dir.mF32A[0];
        this.mDirPos.mF32A[1] = _dir.mF32A[1];
        this.mDirPos.mF32A[2] = _dir.mF32A[2];
        this.mUpdate = CUpdate.eType.Updated;
    }
    SetDirect(_sun = -1) {
        this.mDirPos.w = _sun;
        this.mUpdate = CUpdate.eType.Updated;
    }
    SetPoint(_outer, _inner = 1) {
        if (_inner > _outer)
            _inner = _outer;
        this.mColor.w = _inner;
        this.mDirPos.w = _outer;
        this.mUpdate = CUpdate.eType.Updated;
    }
    SetColor(_col) {
        this.mColor.x = _col.x;
        this.mColor.y = _col.y;
        this.mColor.z = _col.z;
        this.mUpdate = CUpdate.eType.Updated;
    }
    SetShadow(_shadowKey, _CycleTime0 = 0, _CycleTime1 = -1, _CycleTime2 = -1) {
        this.mShadowKey = _shadowKey;
        this.mCascadeCycle[0] = _CycleTime0;
        this.mCascadeCycle[1] = _CycleTime1;
        this.mCascadeCycle[2] = _CycleTime2;
        this.mUpdate = CUpdate.eType.Updated;
    }
    SetInRadius(_rad) {
        return this.mColor.w = _rad;
    }
    SetOutRadius(_rad) {
        return this.mDirPos.w = _rad;
    }
    GetDirectPos() {
        return this.mDirPos.xyz;
    }
    GetColor() {
        return this.mColor.xyz;
    }
    IsColorZero() {
        return this.mColor.mF32A[0] == 0 && this.mColor.mF32A[0] == 0 && this.mColor.mF32A[0] == 0;
    }
    GetInRadius() {
        return this.mColor.w;
    }
    GetOutRadius() {
        return this.mDirPos.w;
    }
    IsPointLight() {
        return this.mDirPos.w > 0.5;
    }
    CCamCompReq(_brush) {
        if (_brush.mDoubleChk.has(this))
            return;
        _brush.mDoubleChk.add(this);
        if (this.mWrite.length == 0) {
            let fw = _brush.mFrame;
            let srp = new CRPAuto(fw.Pal().Sl3D().mKey);
            srp.mCopy = false;
            srp.mTag = "shadowWrite";
            srp.mInTag = "shadow";
            srp.mInPaint.add("CPaint3D");
            srp.mPriority = CRenderPass.ePriority.BackGround - 2;
            this.PushRPAuto(srp);
            srp = new CRPAuto(fw.Pal().SlVoxel().mKey);
            srp.mCopy = false;
            srp.mClearColor = false;
            srp.mClearDepth = false;
            srp.mTag = "shadowWrite";
            srp.mInTag = "shadow";
            srp.mInPaint.add("CPaintVoxel");
            srp.mPriority = CRenderPass.ePriority.BackGround - 1;
            this.PushRPAuto(srp);
        }
        if (this.mShadowKey != null) {
            if (Math.abs(this.mDirPos.w) > 0.5) {
                if (!this.mShadowOff) {
                    let scam0 = _brush.GetCamera(this.mShadowKey + 0);
                    let scam1 = _brush.GetCamera(this.mShadowKey + 1);
                    let scam2 = _brush.GetCamera(this.mShadowKey + 2);
                    let cam = _brush.GetCam3D();
                    var width = 2000 * this.mShadowDistance;
                    var height = 2000 * this.mShadowDistance;
                    let eye = cam.GetEye().Export();
                    let viewDir = cam.GetView();
                    viewDir.Snap(100);
                    let safeWidth = Math.max(1e-6, width);
                    let exp = Math.floor(Math.log10(safeWidth)) - 2;
                    let floorDigit = Math.pow(10, exp) * this.mDigit;
                    let dir = this.mDirPos.xyz;
                    dir.Snap(100);
                    let slook;
                    let seye;
                    let sup = new CVec3(0, 1, 0);
                    let n = width;
                    slook = CMath.V3AddV3(eye, CMath.V3MulFloat(viewDir, n));
                    seye = CMath.V3AddV3(slook, CMath.V3MulFloat(dir, n * 2));
                    slook.x = Math.round(slook.x / floorDigit) * floorDigit;
                    slook.y = Math.round(slook.y / floorDigit) * floorDigit;
                    slook.z = Math.round(slook.z / floorDigit) * floorDigit;
                    seye.x = Math.round(seye.x / floorDigit) * floorDigit;
                    seye.y = Math.round(seye.y / floorDigit) * floorDigit;
                    seye.z = Math.round(seye.z / floorDigit) * floorDigit;
                    if (scam0.Init(seye, slook, sup)) {
                        scam0.mWidth = width * 2;
                        scam0.mHeight = height * 2;
                        scam0.ResetOrthographic();
                        this.mUpdate = CUpdate.eType.Updated;
                    }
                    _brush.mShadowView[0].set(scam0.GetViewMat().F32A(), _brush.mShadowCount * 16);
                    _brush.mShadowView[1].set(scam0.GetProjMat().F32A(), _brush.mShadowCount * 16);
                    scam0.Update(1);
                    n = width * 4;
                    slook = CMath.V3AddV3(eye, CMath.V3MulFloat(viewDir, n));
                    seye = CMath.V3AddV3(slook, CMath.V3MulFloat(dir, n * 4));
                    slook.x = Math.round(slook.x / floorDigit) * floorDigit;
                    slook.y = Math.round(slook.y / floorDigit) * floorDigit;
                    slook.z = Math.round(slook.z / floorDigit) * floorDigit;
                    seye.x = Math.round(seye.x / floorDigit) * floorDigit;
                    seye.y = Math.round(seye.y / floorDigit) * floorDigit;
                    seye.z = Math.round(seye.z / floorDigit) * floorDigit;
                    if (scam1.Init(seye, slook, sup)) {
                        scam1.mWidth = width * 8;
                        scam1.mHeight = height * 8;
                        scam1.ResetOrthographic();
                    }
                    _brush.mShadowView[2].set(scam1.GetViewMat().F32A(), _brush.mShadowCount * 16);
                    _brush.mShadowView[3].set(scam1.GetProjMat().F32A(), _brush.mShadowCount * 16);
                    scam1.Update(1);
                    n = width * 10;
                    slook = CMath.V3AddV3(eye, CMath.V3MulFloat(viewDir, n));
                    seye = CMath.V3AddV3(slook, CMath.V3MulFloat(dir, n * 8));
                    slook.x = Math.round(slook.x / floorDigit) * floorDigit;
                    slook.y = Math.round(slook.y / floorDigit) * floorDigit;
                    slook.z = Math.round(slook.z / floorDigit) * floorDigit;
                    seye.x = Math.round(seye.x / floorDigit) * floorDigit;
                    seye.y = Math.round(seye.y / floorDigit) * floorDigit;
                    seye.z = Math.round(seye.z / floorDigit) * floorDigit;
                    if (scam2.Init(seye, slook, sup)) {
                        scam2.mWidth = width * 16;
                        scam2.mHeight = height * 16;
                        scam2.ResetOrthographic();
                    }
                    _brush.mShadowView[4].set(scam2.GetViewMat().F32A(), _brush.mShadowCount * 16);
                    _brush.mShadowView[5].set(scam2.GetProjMat().F32A(), _brush.mShadowCount * 16);
                    scam2.Update(1);
                }
                for (var i = 0; i < this.mCascadeCycle.length; ++i) {
                    if (this.mCascadeCycle[i] == -1)
                        continue;
                    for (let rp of this.mWrite) {
                        var srpKey = this.mShadowKey + rp.mShader + i;
                        var srp = _brush.GetAutoRP(srpKey);
                        if (srp == null) {
                            srp = rp.Export();
                            srp.mTag = "shadowWrite";
                            _brush.SetAutoRP(srpKey, srp);
                            var fw = this.GetOwner().GetFrame();
                            var tex = fw.Res().Find(this.GetTex());
                            if (tex.GetInfo()[0].mCount < (_brush.mShadowCount + 1) * 6) {
                                fw.Ren().BuildRenderTarget([new CTextureInfo(CTexture.eTarget.Array, CTexture.eFormat.RGBA32F, (_brush.mShadowCount + 1) * 6)], new CVec2(fw.PF().mWidth, fw.PF().mHeight), "shadowArr.tex");
                            }
                            srp.mShaderAttr.push(new CShaderAttr("shadowWrite", new CVec3(i, _brush.mShadowCount, _brush.mShadowCount * 6 + i)));
                        }
                        srp.mRenderTarget = this.GetTex();
                        srp.mRenderTargetUse = new Set([_brush.mShadowCount * 6 + i]);
                        srp.mCamera = this.mShadowKey + i;
                        if (srp.mShaderAttr[0].mData.y != _brush.mShadowCount) {
                            srp.mShaderAttr[0].mData.x = i;
                            srp.mShaderAttr[0].mData.y = _brush.mShadowCount;
                            srp.mShaderAttr[0].mData.z = _brush.mShadowCount * 6 + i;
                            _brush.mAutoRPUpdate = CUpdate.eType.Updated;
                        }
                        if (this.mShadowOff) {
                            srp.mCycle = 100000000;
                        }
                        else {
                            srp.mCycle = this.mCascadeCycle[i];
                        }
                    }
                    let maxVal = _brush.mShadowRead.get(_brush.mShadowCount);
                    if (maxVal == null) {
                        maxVal = new CVec4(_brush.mLightCount, -1, -1, -1);
                    }
                    else {
                        maxVal.x = _brush.mLightCount;
                    }
                    if (i < 3) {
                        if (i < 0.5) {
                            maxVal.y = _brush.mShadowCount * 6 + i;
                            maxVal.z = -1;
                            maxVal.w = -1;
                        }
                        else if (i < 1.5)
                            maxVal.z = _brush.mShadowCount * 6 + i;
                        else
                            maxVal.w = _brush.mShadowCount * 6 + i;
                    }
                    _brush.mShadowRead.set(_brush.mShadowCount, maxVal);
                }
            }
            else {
                _brush.mShadowView[0].fill(0, 0, 16);
                _brush.mShadowView[1].fill(0, 0, 16);
                _brush.mShadowView[2].fill(0, 0, 16);
                _brush.mShadowView[3].fill(0, 0, 16);
                _brush.mShadowView[4].fill(0, 0, 16);
                _brush.mShadowView[5].fill(0, 0, 16);
                _brush.mShadowView[6].fill(0, 0, 16);
            }
            if (!this.mShadowOff)
                _brush.mShadowCount++;
        }
        if (_brush.mLightCount > CDevice.GetProperty(CDevice.eProperty.Sam2DWriteX) / 4)
            return;
        _brush.mLightDir[_brush.mLightCount * 4 + 0] = this.mDirPos.x;
        _brush.mLightDir[_brush.mLightCount * 4 + 1] = this.mDirPos.y;
        _brush.mLightDir[_brush.mLightCount * 4 + 2] = this.mDirPos.z;
        _brush.mLightDir[_brush.mLightCount * 4 + 3] = this.mDirPos.w;
        _brush.mLightColor[_brush.mLightCount * 4 + 0] = this.mColor.x;
        _brush.mLightColor[_brush.mLightCount * 4 + 1] = this.mColor.y;
        _brush.mLightColor[_brush.mLightCount * 4 + 2] = this.mColor.z;
        _brush.mLightColor[_brush.mLightCount * 4 + 3] = this.mColor.w;
        _brush.mLightCount++;
    }
}
