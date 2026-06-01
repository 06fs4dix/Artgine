import { CVec4 } from "../../geometry/CVec4.js";
import { CVec3 } from "../../geometry/CVec3.js";
import { CComponent } from "../component/CComponent.js";
import { CMath } from "../../geometry/CMath.js";
import { CBrushComp } from "./CBrushComp.js";
import { CRenderPass } from "../../render/CRenderPass.js";
import { CShaderAttr } from "../../render/CShaderAttr.js";
import { CDevice } from "../../render/CDevice.js";
import { CTexture, CTextureInfo } from "../../render/CTexture.js";
import { CVec2 } from "../../geometry/CVec2.js";
import { CDOM } from "../../basic/CDOM.js";
import { CUpdate } from "../../basic/Basic.js";
import { CUtilObj } from "../../basic/CUtilObj.js";
import { CRPAuto } from "../canvas/CRPMgr.js";
import { CCondition } from "../../util/CCondition.js";
export class CLight extends CBrushComp {
    mCascadeCycle = [0, -1, -1];
    mShadowDistance = 1;
    mDigit = null;
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
    EditForm(_pointer, _body, _input) {
        super.EditForm(_pointer, _body, _input);
        if (_pointer.member == "mShadowKey")
            CUtilObj.NullEdit(_pointer, _body, _input, "test");
        else if (_pointer.member == "mColor") {
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
                        CDOM.ID("ligPo_div" + wtKey).hidden = true;
                        CDOM.ID("ligCor_div" + wtKey).hidden = false;
                    }
                    else if (selObj.value == "1") {
                        CDOM.ID("ligPo_div" + wtKey).hidden = false;
                        CDOM.ID("ligCor_div" + wtKey).hidden = false;
                    }
                    else {
                        CDOM.ID("ligPo_div" + wtKey).hidden = true;
                        CDOM.ID("ligCor_div" + wtKey).hidden = true;
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
                    let po = CDOM.ID("ligPo_div" + wtKey).hidden;
                    let cor = CDOM.ID("ligCor_div" + wtKey).hidden;
                    if (po == false) {
                        let outer = Number(CDOM.IDValue("ligPoOuter_num" + wtKey));
                        let inner = Number(CDOM.IDValue("ligPoInner_num" + wtKey));
                        this.SetPoint(outer, inner);
                    }
                    else if (cor == false) {
                        this.SetDirect();
                    }
                    let corX = Number(CDOM.IDValue("ligCorX_num" + wtKey));
                    let corY = Number(CDOM.IDValue("ligCorY_num" + wtKey));
                    let corZ = Number(CDOM.IDValue("ligCorZ_num" + wtKey));
                    this.SetColor(new CVec3(corX, corY, corZ));
                    this.EditRefresh();
                }
            });
            _body.append(CDOM.DataToDom(div));
        }
    }
    DirPosV4() { return this.mDirPos; }
    GetTex() { return this.GetOwner().GetFrame().Pal().GetShadowWriteTex(); }
    Update(_update) {
        if (this.mUpdate == CUpdate.eType.Already) {
            this.mUpdate = CUpdate.eType.Not;
            this.mBrush.mUpdateLight = true;
        }
        else if (this.mUpdate == CUpdate.eType.Updated) {
            this.mUpdate = CUpdate.eType.Already;
            this.mBrush.mUpdateLight = true;
        }
        if (this.GetOwner().mUpdateMat != 0 || this.mUpdate == CUpdate.eType.Updated) {
            this.mBrush.mUpdateLight = true;
            var pos = this.GetOwner().GetMat().xyz;
            if (this.mDirPos.w <= -1) {
                CMath.V3Nor(pos, pos);
                if (pos.IsZero()) {
                    pos.y = 1;
                }
            }
            this.SetDirectPos(pos);
        }
        super.Update(_update);
        if (this.mBrush != null)
            this.UpdateBaush(_update);
    }
    UpdateBaush(_update) {
        if (this.mWrite.length == 0) {
            let fw = this.mBrush.mFrame;
            let srp = new CRPAuto(fw.Pal().Sl3D().mKey);
            srp.mCopy = false;
            srp.mTag.add("shadowWrite");
            srp.PushOr(new CCondition("class", "==", "CPaint3D"));
            srp.PushOr(new CCondition("class", "==", "CPaintMeshMerge"));
            srp.PushAnd(new CCondition("mTag[shadow]"));
            srp.PushAnd(new CCondition("mTag[shadowReadOnly]", CCondition.eOperator["!="]));
            srp.mPriority = CRenderPass.ePriority.BackGround - 1;
            this.PushRPAuto(srp);
            srp = new CRPAuto(fw.Pal().SlVoxel().mKey);
            srp.mCopy = false;
            srp.mTag.add("shadowWrite");
            srp.PushAnd(new CCondition("class", "==", "CPaintVoxel"));
            srp.PushAnd(new CCondition("mTag[shadow]"));
            srp.PushAnd(new CCondition("mTag[shadowReadOnly]", CCondition.eOperator["!="]));
            srp.mPriority = CRenderPass.ePriority.BackGround - 1;
            this.PushRPAuto(srp);
            srp = new CRPAuto(fw.Pal().SlTerrain().mKey);
            srp.mCopy = false;
            srp.mTag.add("shadowWrite");
            srp.PushAnd(new CCondition("class", "==", "CPaintTerrain"));
            srp.PushAnd(new CCondition("mTag[shadow]"));
            srp.PushAnd(new CCondition("mTag[shadowReadOnly]", CCondition.eOperator["!="]));
            srp.mPriority = CRenderPass.ePriority.BackGround - 1;
            this.PushRPAuto(srp);
        }
        let ShadowUpdate = false;
        if (this.mTexKey != null) {
            let ShadowView = this.mBrush.GetShadowView();
            if (this.mColor.IsZero())
                this.mShadowOff = true;
            else
                this.mShadowOff = false;
            if (Math.abs(this.mDirPos.w) > 0.5) {
                if (!this.mShadowOff) {
                    let scam0 = this.mBrush.GetCamera(this.mTexKey + 0);
                    let scam1 = this.mBrush.GetCamera(this.mTexKey + 1);
                    let scam2 = this.mBrush.GetCamera(this.mTexKey + 2);
                    scam0.mShadow = true;
                    scam1.mShadow = true;
                    scam2.mShadow = true;
                    scam0.SetNear(1);
                    scam1.SetNear(1);
                    scam2.SetNear(1);
                    scam0.SetFar(4 * 2000 * 2);
                    scam1.SetFar(16 * 2000 * 2);
                    scam2.SetFar(64 * 2000 * 2);
                    let cam = this.mBrush.GetCam3D();
                    var width = 2000 * this.mShadowDistance;
                    var height = 2000 * this.mShadowDistance;
                    let eye = cam.GetEye().Export();
                    let viewDir = cam.GetView();
                    let dir = CMath.V3Nor(this.mDirPos.xyz);
                    let slook;
                    let seye;
                    let sup = new CVec3(0, 1, 0);
                    const AutoDigitSnapping = (_slook, _orthoHalfWidth) => {
                        let Zaxis = dir;
                        let upVec = Math.abs(CMath.V3Dot(sup, Zaxis)) > 0.99 ? new CVec3(0, 0, 1) : sup;
                        let Xaxis = CMath.V3Nor(CMath.V3Cross(upVec, Zaxis));
                        let Yaxis = CMath.V3Cross(Zaxis, Xaxis);
                        if (this.GetOwner() == null)
                            return;
                        const fw = this.GetOwner().GetFrame();
                        const tex = fw.Res().Find(this.GetTex());
                        const shadowResolution = tex.GetWidth();
                        const texelSize = (_orthoHalfWidth * 2) / shadowResolution;
                        const originLS_x = _slook.x * Xaxis.x + _slook.y * Xaxis.y + _slook.z * Xaxis.z;
                        const originLS_y = _slook.x * Yaxis.x + _slook.y * Yaxis.y + _slook.z * Yaxis.z;
                        const dx = Math.floor(originLS_x / texelSize) * texelSize - originLS_x;
                        const dy = Math.floor(originLS_y / texelSize) * texelSize - originLS_y;
                        const diffX = Xaxis.x * dx + Yaxis.x * dy;
                        const diffY = Xaxis.y * dx + Yaxis.y * dy;
                        const diffZ = Xaxis.z * dx + Yaxis.z * dy;
                        _slook.x += diffX;
                        _slook.y += diffY;
                        _slook.z += diffZ;
                    };
                    let n = width;
                    slook = CMath.V3AddV3(eye, CMath.V3MulFloat(viewDir, n));
                    if (this.mDigit == null) {
                        AutoDigitSnapping(slook, n);
                    }
                    else {
                        slook.x = Math.round(slook.x / this.mDigit) * this.mDigit;
                        slook.y = Math.round(slook.y / this.mDigit) * this.mDigit;
                        slook.z = Math.round(slook.z / this.mDigit) * this.mDigit;
                    }
                    seye = CMath.V3AddV3(slook, CMath.V3MulFloat(dir, width * 4));
                    let ShadowView = this.mBrush.GetShadowView();
                    if (scam0.Init(seye, slook, sup)) {
                        scam0.mWidth = width * 2;
                        scam0.mHeight = height * 2;
                        scam0.ResetOrthographic();
                        ShadowUpdate = true;
                        this.mBrush.mUpdateShadow = true;
                    }
                    ShadowView[0].set(scam0.GetViewMat().F32A(), this.mBrush.mShadowCount * 16);
                    ShadowView[1].set(scam0.GetProjMat().F32A(), this.mBrush.mShadowCount * 16);
                    scam0.Update(_update);
                    n = width * 4;
                    slook = CMath.V3AddV3(eye, CMath.V3MulFloat(viewDir, n));
                    if (this.mDigit == null) {
                        AutoDigitSnapping(slook, n);
                    }
                    else {
                        slook.x = Math.round(slook.x / this.mDigit) * this.mDigit;
                        slook.y = Math.round(slook.y / this.mDigit) * this.mDigit;
                        slook.z = Math.round(slook.z / this.mDigit) * this.mDigit;
                    }
                    seye = CMath.V3AddV3(slook, CMath.V3MulFloat(dir, width * 16));
                    if (scam1.Init(seye, slook, sup)) {
                        scam1.mWidth = width * 8;
                        scam1.mHeight = height * 8;
                        scam1.ResetOrthographic();
                        ShadowUpdate = true;
                        this.mBrush.mUpdateShadow = true;
                    }
                    ShadowView[2].set(scam1.GetViewMat().F32A(), this.mBrush.mShadowCount * 16);
                    ShadowView[3].set(scam1.GetProjMat().F32A(), this.mBrush.mShadowCount * 16);
                    scam1.Update(_update);
                    n = width * 16;
                    slook = CMath.V3AddV3(eye, CMath.V3MulFloat(viewDir, n));
                    if (this.mDigit == null) {
                        AutoDigitSnapping(slook, n);
                    }
                    else {
                        slook.x = Math.round(slook.x / this.mDigit) * this.mDigit;
                        slook.y = Math.round(slook.y / this.mDigit) * this.mDigit;
                        slook.z = Math.round(slook.z / this.mDigit) * this.mDigit;
                    }
                    seye = CMath.V3AddV3(slook, CMath.V3MulFloat(dir, width * 64));
                    if (scam2.Init(seye, slook, sup)) {
                        scam2.mWidth = width * 32;
                        scam2.mHeight = height * 32;
                        scam2.ResetOrthographic();
                        ShadowUpdate = true;
                        this.mBrush.mUpdateShadow = true;
                    }
                    ShadowView[4].set(scam2.GetViewMat().F32A(), this.mBrush.mShadowCount * 16);
                    ShadowView[5].set(scam2.GetProjMat().F32A(), this.mBrush.mShadowCount * 16);
                    scam2.Update(_update);
                }
                let maxVal = this.mBrush.mShadowRead.get(this.mBrush.mShadowCount);
                if (maxVal == null)
                    maxVal = new CVec4(this.mBrush.mLightCount, -1, -1, -1);
                else
                    maxVal.x = this.mBrush.mLightCount;
                for (var i = 0; i < this.mCascadeCycle.length; ++i) {
                    if (this.mCascadeCycle[i] == -1)
                        continue;
                    for (let rp of this.mWrite) {
                        if (rp.mTag.has("shadowWrite") == false)
                            continue;
                        var srpKey = this.mTexKey + rp.mShader + i;
                        var srp = this.mBrush.GetAutoRP(srpKey);
                        if (srp == null) {
                            srp = rp.Export();
                            srp.mTag.add("shadowWrite");
                            this.mBrush.SetAutoRP(srpKey, srp);
                            var fw = this.GetOwner().GetFrame();
                            var tex = fw.Res().Find(this.GetTex());
                            if (tex.GetInfo()[0].mCount < (this.mBrush.mShadowCount + 1) * 6) {
                                fw.Ren().BuildRenderTarget([new CTextureInfo(CTexture.eTarget.Array, CTexture.eFormat.RGBA32F, (this.mBrush.mShadowCount + 1) * 6)], new CVec2(tex.GetWidth(), tex.GetHeight()), fw.Pal().GetShadowWriteTex());
                            }
                            srp.mShaderAttr.push(new CShaderAttr("shadowWrite", new CVec3(i, this.mBrush.mShadowCount, this.mBrush.mShadowCount * 6 + i)));
                            srp.mPriority -= (this.mCascadeCycle.length - i);
                        }
                        srp.mRenderTarget = this.GetTex();
                        srp.mRenderTargetUse = new Set([this.mBrush.mShadowCount * 6 + i]);
                        srp.mCamera = this.mTexKey + i;
                        if (srp.mShaderAttr[0].mData.y != this.mBrush.mShadowCount) {
                            srp.mShaderAttr[0].mData.x = i;
                            srp.mShaderAttr[0].mData.y = this.mBrush.mShadowCount;
                            srp.mShaderAttr[0].mData.z = this.mBrush.mShadowCount * 6 + i;
                            this.mBrush.mAutoRPUpdate = CUpdate.eType.Updated;
                        }
                        if (this.mShadowOff)
                            srp.mCycle = 100000000;
                        else
                            srp.mCycle = this.mCascadeCycle[i];
                    }
                    if (i < 3) {
                        if (i < 0.5) {
                            maxVal.y = this.mBrush.mShadowCount * 6 + i;
                            maxVal.z = -1;
                            maxVal.w = -1;
                        }
                        else if (i < 1.5)
                            maxVal.z = this.mBrush.mShadowCount * 6 + i;
                        else
                            maxVal.w = this.mBrush.mShadowCount * 6 + i;
                    }
                }
                ShadowView[7][this.mBrush.mShadowCount * 4 + 0] = maxVal.x;
                ShadowView[7][this.mBrush.mShadowCount * 4 + 1] = maxVal.y;
                ShadowView[7][this.mBrush.mShadowCount * 4 + 2] = maxVal.z;
                ShadowView[7][this.mBrush.mShadowCount * 4 + 3] = maxVal.w;
            }
            else {
                ShadowView[0].fill(0, 0, 16);
                ShadowView[1].fill(0, 0, 16);
                ShadowView[2].fill(0, 0, 16);
                ShadowView[3].fill(0, 0, 16);
                ShadowView[4].fill(0, 0, 16);
                ShadowView[5].fill(0, 0, 16);
                ShadowView[6].fill(0, 0, 16);
            }
            if (!this.mShadowOff)
                this.mBrush.mShadowCount++;
        }
        if (this.mBrush.mLightCount > CDevice.GetProperty(CDevice.eProperty.Sam2DSize) / 4)
            return;
        this.mBrush.mLightDir[this.mBrush.mLightCount * 4 + 0] = this.mDirPos.x;
        this.mBrush.mLightDir[this.mBrush.mLightCount * 4 + 1] = this.mDirPos.y;
        this.mBrush.mLightDir[this.mBrush.mLightCount * 4 + 2] = this.mDirPos.z;
        this.mBrush.mLightDir[this.mBrush.mLightCount * 4 + 3] = this.mDirPos.w;
        this.mBrush.mLightColor[this.mBrush.mLightCount * 4 + 0] = this.mColor.x;
        this.mBrush.mLightColor[this.mBrush.mLightCount * 4 + 1] = this.mColor.y;
        this.mBrush.mLightColor[this.mBrush.mLightCount * 4 + 2] = this.mColor.z;
        this.mBrush.mLightColor[this.mBrush.mLightCount * 4 + 3] = this.mColor.w;
        this.mBrush.mLightCount++;
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
        this.mTexKey = _shadowKey;
        this.mCascadeCycle[0] = _CycleTime0;
        this.mCascadeCycle[1] = _CycleTime1;
        this.mCascadeCycle[2] = _CycleTime2;
        this.mUpdate = CUpdate.eType.Updated;
    }
    SetShadowDistance(_dist) {
        this.mShadowDistance = _dist;
    }
    SetInRadius(_rad) {
        return this.mColor.w = _rad;
    }
    SetOutRadius(_rad) {
        return this.mDirPos.w = _rad;
    }
    SetDigit(_digit) {
        this.mDigit = _digit;
    }
    GetDirectPos() {
        return this.mDirPos.xyz;
    }
    GetColor() {
        return this.mColor.xyz;
    }
    IsColorZero() {
        return this.mColor.mF32A[0] == 0 && this.mColor.mF32A[1] == 0 && this.mColor.mF32A[2] == 0;
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
    ImportCJSON(_json) {
        return super.ImportCJSON(_json);
    }
    Destroy() {
        super.Destroy();
        if (Math.abs(this.mDirPos.w) > 0.5 && this.mBrush != null) {
            this.mBrush.mUpdateLight = true;
            this.mBrush.mUpdateShadow = true;
            this.mBrush.mCameraMap.delete(this.mTexKey + 0);
            this.mBrush.mCameraMap.delete(this.mTexKey + 1);
            this.mBrush.mCameraMap.delete(this.mTexKey + 2);
            this.mBrush.ClearRen();
            for (var i = 0; i < this.mCascadeCycle.length; ++i) {
                if (this.mCascadeCycle[i] == -1)
                    continue;
                for (let rp of this.mWrite) {
                    if (rp.mTag.has("shadowWrite") == false)
                        continue;
                    var srpKey = this.mTexKey + rp.mShader + i;
                    this.mBrush.RemoveAutoRP(srpKey);
                }
            }
        }
    }
}
