import { CVec4 } from "../../geometry/CVec4.js";
import { CVec3 } from "../../geometry/CVec3.js";
import { CBound } from "../../geometry/CBound.js";
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
import { CClass } from "../../basic/CClass.js";
import { CRPAuto } from "../canvas/CRPMgr.js";
import { CCondition } from "../../util/CCondition.js";
import { SDF } from "../../z_file/SDF.js";
import { CPaint } from "./paint/CPaint.js";
import { CPoolGeo } from "../../geometry/CPoolGeo.js";
export class CLight extends CBrushComp {
    mCascadeCycle = [0, -1, -1, -1];
    mDigit = null;
    mShadowOff = false;
    mShadowDistance = 10000;
    mShadowFade = 0.25;
    mShadowDivide = [1, 1, 1, 1];
    mDirPos;
    mColor;
    mCullMask;
    mUpdate = CUpdate.eType.Updated;
    constructor() {
        super(null);
        this.mDirPos = new CVec4();
        this.mColor = new CVec4();
        this.mCullMask = new CVec4();
        this.mDirPos.w = -1;
        this.mColor.x = 1;
        this.mColor.y = 1;
        this.mColor.z = 1;
        this.mColor.w = 1;
        this.mCullMask.x = CPaint.eCullMask.Default;
        this.mSysc = CComponent.eSysn.Light;
    }
    Icon() { return "bi bi-lightbulb"; }
    IsShould(_member, _type) {
        if (_member == "mWrite") {
            return false;
        }
        return super.IsShould(_member, _type);
    }
    EditChange(_pointer, _child) {
        super.EditChange(_pointer, _child);
        if (_pointer.member == "mCullMask") {
            this.mUpdate = CUpdate.eType.Updated;
        }
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
            let isPoint = this.IsPointLight();
            let is2D = (this.mTexKey != null && this.mCascadeCycle[0] == -1 && this.mCascadeCycle[1] == -1 && this.mCascadeCycle[2] == -1 && this.mCascadeCycle[3] == -1);
            let curType = is2D ? (isPoint ? "2dpoint" : "2ddirect") : (isPoint ? "point" : "direct");
            let applyDirColor = () => {
                let cx = Number(CDOM.IDValue("ligDirCX_num" + wtKey));
                let cy = Number(CDOM.IDValue("ligDirCY_num" + wtKey));
                let cz = Number(CDOM.IDValue("ligDirCZ_num" + wtKey));
                this.SetColor(new CVec3(cx, cy, cz));
            };
            let applyPtColor = () => {
                let cx = Number(CDOM.IDValue("ligPtCX_num" + wtKey));
                let cy = Number(CDOM.IDValue("ligPtCY_num" + wtKey));
                let cz = Number(CDOM.IDValue("ligPtCZ_num" + wtKey));
                this.SetColor(new CVec3(cx, cy, cz));
            };
            let applyPtRadius = () => {
                let outer = Number(CDOM.IDValue("ligPtOuter_num" + wtKey));
                let inner = Number(CDOM.IDValue("ligPtInner_num" + wtKey));
                if (!(outer > 0))
                    outer = 1;
                if (!(inner > 0))
                    inner = 1;
                this.SetPoint(outer, inner);
            };
            let applyCascade = () => {
                if (this.mTexKey == null)
                    return;
                let c0 = Number(CDOM.IDValue("ligCas0_num" + wtKey));
                let c1 = Number(CDOM.IDValue("ligCas1_num" + wtKey));
                let c2 = Number(CDOM.IDValue("ligCas2_num" + wtKey));
                let c3 = Number(CDOM.IDValue("ligCas3_num" + wtKey));
                this.mCascadeCycle[0] = c0;
                this.mCascadeCycle[1] = c1;
                this.mCascadeCycle[2] = c2;
                this.mCascadeCycle[3] = c3;
                this.mUpdate = CUpdate.eType.Updated;
            };
            div.html.push({ "<>": "span", "text": "Light Type:" });
            div.html.push({ "<>": "select", "class": "form-select", "id": "ligType_sel" + wtKey, "html": [
                    { "<>": "option", "value": "direct", "text": "Directional", "selected": curType == "direct" },
                    { "<>": "option", "value": "point", "text": "Point", "selected": curType == "point" },
                    { "<>": "option", "value": "2ddirect", "text": "2D Directional", "selected": curType == "2ddirect" },
                    { "<>": "option", "value": "2dpoint", "text": "2D Point", "selected": curType == "2dpoint" },
                ], "onchange": (e) => {
                    let v = e.target.value;
                    if (v == "point" || v == "2dpoint") {
                        CDOM.ID("ligDir_div" + wtKey).hidden = true;
                        CDOM.ID("ligPt_div" + wtKey).hidden = false;
                        applyPtRadius();
                    }
                    else {
                        CDOM.ID("ligDir_div" + wtKey).hidden = false;
                        CDOM.ID("ligPt_div" + wtKey).hidden = true;
                        this.SetDirect();
                    }
                } });
            div.html.push({ "<>": "div", "id": "ligDir_div" + wtKey, "hidden": isPoint, "html": [
                    { "<>": "span", "text": "Color:" },
                    { "<>": "input", "type": "number", "id": "ligDirCX_num" + wtKey, "class": "form-control", "placeholder": "x", "value": this.mColor.x, "onchange": () => applyDirColor() },
                    { "<>": "input", "type": "number", "id": "ligDirCY_num" + wtKey, "class": "form-control", "placeholder": "y", "value": this.mColor.y, "onchange": () => applyDirColor() },
                    { "<>": "input", "type": "number", "id": "ligDirCZ_num" + wtKey, "class": "form-control", "placeholder": "z", "value": this.mColor.z, "onchange": () => applyDirColor() },
                ] });
            if (curType == "direct" && this.mTexKey != null) {
                div.html.push({ "<>": "div", "id": "ligCas_div" + wtKey, "html": [
                        { "<>": "span", "text": "Shadow Cascade:" },
                        { "<>": "input", "type": "number", "id": "ligCas0_num" + wtKey, "class": "form-control", "placeholder": "cas0", "value": this.mCascadeCycle[0], "onchange": () => applyCascade() },
                        { "<>": "input", "type": "number", "id": "ligCas1_num" + wtKey, "class": "form-control", "placeholder": "cas1", "value": this.mCascadeCycle[1], "onchange": () => applyCascade() },
                        { "<>": "input", "type": "number", "id": "ligCas2_num" + wtKey, "class": "form-control", "placeholder": "cas2", "value": this.mCascadeCycle[2], "onchange": () => applyCascade() },
                        { "<>": "input", "type": "number", "id": "ligCas3_num" + wtKey, "class": "form-control", "placeholder": "cas3", "value": this.mCascadeCycle[3], "onchange": () => applyCascade() },
                    ] });
            }
            div.html.push({ "<>": "div", "id": "ligPt_div" + wtKey, "hidden": !isPoint, "html": [
                    { "<>": "span", "text": "Outer:" },
                    { "<>": "input", "type": "number", "id": "ligPtOuter_num" + wtKey, "class": "form-control", "placeholder": "outer", "value": (isPoint ? this.mDirPos.w : 1), "onchange": () => applyPtRadius() },
                    { "<>": "span", "text": "Inner:" },
                    { "<>": "input", "type": "number", "id": "ligPtInner_num" + wtKey, "class": "form-control", "placeholder": "inner", "value": this.mColor.w, "onchange": () => applyPtRadius() },
                    { "<>": "span", "text": "Color:" },
                    { "<>": "input", "type": "number", "id": "ligPtCX_num" + wtKey, "class": "form-control", "placeholder": "x", "value": this.mColor.x, "onchange": () => applyPtColor() },
                    { "<>": "input", "type": "number", "id": "ligPtCY_num" + wtKey, "class": "form-control", "placeholder": "y", "value": this.mColor.y, "onchange": () => applyPtColor() },
                    { "<>": "input", "type": "number", "id": "ligPtCZ_num" + wtKey, "class": "form-control", "placeholder": "z", "value": this.mColor.z, "onchange": () => applyPtColor() },
                ] });
            div.html.push({ "<>": "hr" });
            div.html.push({ "<>": "span", "text": "Shadow: " });
            div.html.push({ "<>": "button", "type": "button", "class": "btn btn-primary btn-sm", "text": "그림자 적용", "onclick": () => {
                    let v = CDOM.ID("ligType_sel" + wtKey).value;
                    if (v == "2ddirect" || v == "2dpoint")
                        this.SetShadow2D(this.ObjHash());
                    else
                        this.SetShadow3D(this.ObjHash(), 0, -1, -1);
                    this.EditRefresh();
                } });
            div.html.push({ "<>": "button", "type": "button", "class": "btn btn-danger btn-sm", "text": "그림자 제거", "onclick": () => {
                    this.RemoveShadow();
                    let casDiv = CDOM.ID("ligCas_div" + wtKey);
                    if (casDiv != null)
                        casDiv.hidden = true;
                    this.EditRefresh();
                } });
            _body.append(CDOM.DataToDom(div));
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
                    this.SetMask(newMask);
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
    DirPosV4() { return this.mDirPos; }
    GetTex() { return this.GetOwner().GetFrame().Pal().GetShadowWriteTex(); }
    Update(_update) {
        if (this.mUpdate == CUpdate.eType.Already) {
            this.mUpdate = CUpdate.eType.Not;
            this.mBrush.mUpdateLight = CUpdate.eType.Updated;
        }
        else if (this.mUpdate == CUpdate.eType.Updated) {
            this.mUpdate = CUpdate.eType.Already;
            this.mBrush.mUpdateLight = CUpdate.eType.Updated;
        }
        if (this.GetOwner().mUpdateMat != 0 || this.mUpdate == CUpdate.eType.Updated) {
            this.mBrush.mUpdateLight = CUpdate.eType.Updated;
            var pos = this.GetOwner().GetMat().xyz;
            if (!this.IsPointLight()) {
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
        this.mCullMask.w = -1;
        if (this.mWriteRP.length == 0) {
            let srp = new CRPAuto(this.mBrush.mFrame.Pal().Sl3D().mKey);
            srp.mCopy = false;
            srp.mAlpha = false;
            srp.mTag.add("shadowWrite");
            srp.PushOr(new CCondition("class", "==", "CPaint3D"));
            srp.PushOr(new CCondition("class", "==", "CPaint3DMerge"));
            srp.PushAnd(new CCondition("mTag[shadow]"));
            srp.PushAnd(new CCondition("mTag[shadowReadOnly]", CCondition.eOperator["!="]));
            srp.mPriority = CRenderPass.ePriority.BackGround - 1;
            this.PushRPAuto(srp);
            srp = new CRPAuto(this.mBrush.mFrame.Pal().SlVoxel().mKey);
            srp.mCopy = false;
            srp.mAlpha = false;
            srp.mTag.add("shadowWrite");
            srp.PushAnd(new CCondition("class", "==", "CPaintVoxel"));
            srp.PushAnd(new CCondition("mTag[shadow]"));
            srp.PushAnd(new CCondition("mTag[shadowReadOnly]", CCondition.eOperator["!="]));
            srp.mPriority = CRenderPass.ePriority.BackGround - 1;
            this.PushRPAuto(srp);
            srp = new CRPAuto(this.mBrush.mFrame.Pal().SlTerrain().mKey);
            srp.mCopy = false;
            srp.mAlpha = false;
            srp.mTag.add("shadowWrite");
            srp.PushAnd(new CCondition("class", "==", "CPaintTerrain"));
            srp.PushAnd(new CCondition("mTag[shadow]"));
            srp.PushAnd(new CCondition("mTag[shadowReadOnly]", CCondition.eOperator["!="]));
            srp.mPriority = CRenderPass.ePriority.BackGround - 1;
            this.PushRPAuto(srp);
            srp = new CRPAuto(this.mBrush.mFrame.Pal().Sl2D().mKey);
            srp.mCopy = false;
            srp.mTag.add("shadowPlane");
            srp.PushOr(new CCondition("class", "==", "CPaint2D"));
            srp.PushOr(new CCondition("class", "==", "CPaint2DMerge"));
            srp.PushAnd(new CCondition("mTag[shadow]"));
            srp.PushAnd(new CCondition("mTag[shadowReadOnly]", CCondition.eOperator["!="]));
            srp.mTag.add("shadowPlaneV");
            srp.mTag.add("shadowPlaneF");
            srp.mPriority = CRenderPass.ePriority.AlphaAuto;
            srp.mCullFace = CRenderPass.eCull.None;
            srp.mPaintSort = CRenderPass.ePaintSort.Revers;
            srp.mAlpha = true;
            this.PushRPAuto(srp);
        }
        let ShadowUpdate = false;
        if (this.mTexKey != null) {
            if (this.mColor.IsZero())
                this.mShadowOff = true;
            else
                this.mShadowOff = false;
            const shadowTex = this.mBrush.mFrame.Res().Find(this.GetTex());
            const ShadowView = this.mBrush.GetShadowView();
            const ShadowRead = ShadowView[6];
            const ShadowInfo = ShadowView[7];
            const ShadowCascadeData = ShadowView[8];
            const ShadowDivide = ShadowView[9];
            ShadowInfo[this.mBrush.mShadowCount * 4 + 0] = this.mBrush.mLightCount;
            if (this.mShadowOff == false) {
                if (!this.IsPointLight()) {
                    const ligDir = CMath.V3Nor(this.mDirPos.xyz);
                    const near = this.mBrush.GetCam3D().mProjNear;
                    const far = Math.min(this.mBrush.GetCam3D().mProjFar, this.mShadowDistance);
                    const span = far - near;
                    const frustumDivide = far / this.mBrush.GetCam3D().mProjFar;
                    const camFrustum = this.mBrush.GetCam3D().mFrustum;
                    let slook;
                    let seye;
                    let sup = new CVec3(0, 1, 0);
                    let PVMat = CPoolGeo.ProductMat();
                    const lightOrientationMat = CMath.LookAt(new CVec3(), ligDir, sup);
                    const lightOrientationMatInverse = CMath.MatInvert(lightOrientationMat);
                    const ComputeCascadeBounds = (_nearDepth, _farDepth, _shadowFade) => {
                        const sliceVerts = [];
                        for (let j = 0; j < 4; ++j)
                            sliceVerts.push(CMath.V3Interpolate(camFrustum[j], camFrustum[j + 4], _nearDepth * frustumDivide));
                        for (let j = 0; j < 4; ++j)
                            sliceVerts.push(CMath.V3Interpolate(camFrustum[j], camFrustum[j + 4], _farDepth * frustumDivide));
                        const point1 = sliceVerts[6];
                        const point2 = CMath.V3Distance(point1, sliceVerts[4]) > CMath.V3Distance(point1, sliceVerts[0])
                            ? sliceVerts[4]
                            : sliceVerts[0];
                        const bbWidth = CMath.V3Distance(point1, point2);
                        const margin = _shadowFade * Math.pow(_farDepth, 2.0) * span;
                        const bound = new CBound();
                        for (const v of sliceVerts) {
                            bound.InitBound(CMath.V3MulMatNormal(v, lightOrientationMatInverse));
                        }
                        return { bbWidth: bbWidth + margin, bound: bound };
                    };
                    const ComputeDivideDenum = () => {
                        let denom = 0;
                        for (let i = 0; i < this.mCascadeCycle.length; ++i) {
                            if (this.mCascadeCycle[i] == -1)
                                continue;
                            denom += this.mShadowDivide[i];
                        }
                        return denom;
                    };
                    const denom = ComputeDivideDenum();
                    const ComputeDivides = (_denom) => {
                        const result = [];
                        for (let i = 0; i < this.mCascadeCycle.length; ++i) {
                            if (this.mCascadeCycle[i] == -1)
                                continue;
                            result.push(this.mShadowDivide[i]);
                        }
                        for (let i = 0; i < result.length; ++i) {
                            result[i] = result[i] / _denom;
                        }
                        return result;
                    };
                    const divides = ComputeDivides(denom);
                    ShadowInfo[this.mBrush.mShadowCount * 4 + 2] = far - near;
                    ShadowInfo[this.mBrush.mShadowCount * 4 + 3] = this.mShadowFade;
                    for (let i = 0; i < divides.length; i++) {
                        ShadowDivide[this.mBrush.mShadowCount * 4 + i] = divides[i];
                    }
                    let cascadeNear = 0;
                    for (let i = 0; i < this.mCascadeCycle.length; ++i) {
                        if (this.mCascadeCycle[i] == -1)
                            continue;
                        const scam = this.mBrush.GetCamera(this.mTexKey + i);
                        scam.mShadow = true;
                        const cascadeFar = cascadeNear + divides[i];
                        const { bbWidth, bound } = ComputeCascadeBounds(cascadeNear, cascadeFar, this.mShadowFade);
                        const center = bound.GetCenter();
                        center.z = bound.mMin.z - 20000;
                        if (this.mDigit == null) {
                            const texelWidth = bbWidth / shadowTex.GetWidth();
                            const texelHeight = bbWidth / shadowTex.GetHeight();
                            center.x = Math.floor(center.x / texelWidth) * texelWidth;
                            center.y = Math.floor(center.y / texelHeight) * texelHeight;
                        }
                        else {
                            center.x = Math.floor(center.x / this.mDigit) * this.mDigit;
                            center.y = Math.floor(center.y / this.mDigit) * this.mDigit;
                        }
                        seye = CMath.V3MulMatNormal(center, lightOrientationMat);
                        slook = CMath.V3SubV3(seye, ligDir);
                        if (scam.Init(seye, slook, sup)) {
                            scam.mWidth = bbWidth;
                            scam.mHeight = bbWidth;
                            scam.ResetOrthographic();
                            ShadowUpdate = true;
                            this.mBrush.mUpdateShadow = CUpdate.eType.Updated;
                        }
                        ShadowView[i].set(CMath.MatTranspose(scam.mVPMat, PVMat).F32A().subarray(0, 12), this.mBrush.mShadowCount * 16);
                        const vMat = scam.GetViewMat().F32A();
                        ShadowView[i][this.mBrush.mShadowCount * 16 + 12] = vMat[2];
                        ShadowView[i][this.mBrush.mShadowCount * 16 + 13] = vMat[6];
                        ShadowView[i][this.mBrush.mShadowCount * 16 + 14] = vMat[10];
                        ShadowView[i][this.mBrush.mShadowCount * 16 + 15] = vMat[14];
                        ShadowCascadeData[this.mBrush.mShadowCount * 4 + i] = Math.min(bbWidth / shadowTex.GetWidth() * 1.4142136, 10.0);
                        scam.Update(_update);
                        cascadeNear = cascadeFar;
                    }
                    CPoolGeo.RecycleMat(PVMat);
                }
                else {
                    let seye = this.mDirPos.xyz;
                    let slook;
                    let sup;
                    let PVMat = CPoolGeo.ProductMat();
                    const cubeDir = [
                        new CVec3(1, 0, 0), new CVec3(-1, 0, 0), new CVec3(0, 1, 0),
                        new CVec3(0, -1, 0), new CVec3(0, 0, 1), new CVec3(0, 0, -1)
                    ];
                    const cubeUp = [
                        new CVec3(0, 1, 0), new CVec3(0, 1, 0), new CVec3(0, 0, 1),
                        new CVec3(0, 0, -1), new CVec3(0, 1, 0), new CVec3(0, 1, 0)
                    ];
                    if (this.mCascadeCycle[0] != -1) {
                        for (let i = 0; i < 6; i++) {
                            let scam = this.mBrush.GetCamera(this.mTexKey + i);
                            scam.mShadow = true;
                            scam.SetNear(1);
                            scam.SetFov(CMath.DegreeToRadian(90));
                            slook = CMath.V3AddV3(seye, cubeDir[i]);
                            sup = cubeUp[i];
                            if (scam.Init(seye, slook, sup) || scam.mProjFar != this.GetOutRadius()) {
                                scam.SetFar(this.GetOutRadius());
                                scam.mWidth = shadowTex.GetWidth();
                                scam.mHeight = shadowTex.GetHeight();
                                scam.ResetPerspective();
                                ShadowUpdate = true;
                                this.mBrush.mUpdateShadow = CUpdate.eType.Updated;
                            }
                            ShadowView[i].set(CMath.MatMul(scam.GetViewMat(), scam.GetProjMat(), PVMat).F32A(), this.mBrush.mShadowCount * 16);
                            scam.Update(_update);
                        }
                        ShadowCascadeData[this.mBrush.mShadowCount * 4 + 0] = 2 / shadowTex.GetWidth() * 1.4142136;
                    }
                    CPoolGeo.RecycleMat(PVMat);
                }
            }
            if (!this.IsPointLight()) {
                for (let i = 0; i < this.mCascadeCycle.length; ++i) {
                    if (this.mCascadeCycle[i] == -1) {
                        ShadowRead[this.mBrush.mShadowCount * 4 + i] = -1;
                        continue;
                    }
                    for (const rp of this.mWriteRP) {
                        if (!rp.mTag.has("shadowWrite"))
                            continue;
                        const srpKey = this.mTexKey + rp.mShader + i;
                        let srp = this.mBrush.GetAutoRP(srpKey);
                        if (srp == null) {
                            srp = rp.Export();
                            srp.mPriority -= i + this.mBrush.mShadowTexOff;
                            srp.mShaderAttr.push(new CShaderAttr("shadowWrite", new CVec3(i, this.mBrush.mShadowCount, 0)));
                            srp.PushAnd(new CCondition("mCullMask.x", "&", this.mCullMask.x));
                            this.mBrush.SetAutoRP(srpKey, srp);
                        }
                        srp.mRenderTarget = this.GetTex();
                        srp.mRenderTargetUse = new Set([this.mBrush.mShadowTexOff + i]);
                        srp.mCamera = this.mTexKey + i;
                        const shadowWriteAttr = srp.mShaderAttr[0];
                        if (shadowWriteAttr.mData.y != this.mBrush.mShadowCount) {
                            shadowWriteAttr.mData.x = i;
                            shadowWriteAttr.mData.y = this.mBrush.mShadowCount;
                            shadowWriteAttr.mData.z = 0;
                            srp.Reset();
                            this.mBrush.mAutoRPUpdate = CUpdate.eType.Updated;
                        }
                        srp.mAnd[srp.mAnd.length - 1].mValue = this.mCullMask.x;
                        if (this.mShadowOff)
                            srp.mCycle = 100000000;
                        else
                            srp.mCycle = this.mCascadeCycle[i];
                    }
                    ShadowRead[this.mBrush.mShadowCount * 4 + i] = this.mBrush.mShadowTexOff + i;
                }
                if (ShadowRead[this.mBrush.mShadowCount * 4 + 0] >= 0)
                    this.mBrush.mShadowTexOff += 1;
                if (ShadowRead[this.mBrush.mShadowCount * 4 + 1] >= 0)
                    this.mBrush.mShadowTexOff += 1;
                if (ShadowRead[this.mBrush.mShadowCount * 4 + 2] >= 0)
                    this.mBrush.mShadowTexOff += 1;
                if (ShadowRead[this.mBrush.mShadowCount * 4 + 3] >= 0)
                    this.mBrush.mShadowTexOff += 1;
            }
            else {
                if (this.mCascadeCycle[0] != -1) {
                    for (let i = 0; i < 6; ++i) {
                        for (const rp of this.mWriteRP) {
                            if (!rp.mTag.has("shadowWrite"))
                                continue;
                            const srpKey = this.mTexKey + rp.mShader + i;
                            let srp = this.mBrush.GetAutoRP(srpKey);
                            if (srp == null) {
                                srp = rp.Export();
                                srp.mPriority -= i + this.mBrush.mShadowTexOff;
                                srp.mShaderAttr.push(new CShaderAttr("shadowWrite", new CVec3(SDF.eShadow.Near + i, this.mBrush.mShadowCount, 1)));
                                srp.mTag.add("PointLightShadowV");
                                srp.mTag.add("PointLightShadowF");
                                srp.PushAnd(new CCondition("mCullMask.x", "&", this.mCullMask.x));
                                this.mBrush.SetAutoRP(srpKey, srp);
                            }
                            srp.mRenderTarget = this.GetTex();
                            srp.mRenderTargetUse = new Set([this.mBrush.mShadowTexOff + i]);
                            srp.mCamera = this.mTexKey + i;
                            const shadowWriteAttr = srp.mShaderAttr[0];
                            if (shadowWriteAttr.mData.y != this.mBrush.mShadowCount) {
                                shadowWriteAttr.mData.x = i;
                                shadowWriteAttr.mData.y = this.mBrush.mShadowCount;
                                shadowWriteAttr.mData.z = 1;
                                srp.Reset();
                                this.mBrush.mAutoRPUpdate = CUpdate.eType.Updated;
                            }
                            srp.mAnd[srp.mAnd.length - 1].mValue = this.mCullMask.x;
                            if (this.mShadowOff)
                                srp.mCycle = 100000000;
                            else
                                srp.mCycle = this.mCascadeCycle[0];
                        }
                    }
                    ShadowRead[this.mBrush.mShadowCount * 4 + 0] = this.mBrush.mShadowTexOff;
                    ShadowRead[this.mBrush.mShadowCount * 4 + 1] = this.mBrush.mShadowTexOff;
                    ShadowRead[this.mBrush.mShadowCount * 4 + 2] = this.mBrush.mShadowTexOff;
                }
                ShadowInfo[this.mBrush.mShadowCount * 4 + 1] = this.mBrush.mShadowTexOff;
                ShadowInfo[this.mBrush.mShadowCount * 4 + 2] = 1;
                ShadowInfo[this.mBrush.mShadowCount * 4 + 3] = this.GetOutRadius();
                this.mBrush.mShadowTexOff += 6;
            }
            if (this.mCascadeCycle[0] == -1 && this.mCascadeCycle[1] == -1 && this.mCascadeCycle[2] == -1 && this.mCascadeCycle[3] == -1) {
                for (let rp of this.mWriteRP) {
                    if (rp.mTag.has("shadowPlane")) {
                        var srpKey = this.mTexKey + rp.mShader;
                        var srp = this.mBrush.GetAutoRP(srpKey);
                        if (srp == null) {
                            srp = rp.Export();
                            this.mBrush.SetAutoRP(srpKey, srp);
                            srp.mShaderAttr.push(new CShaderAttr("shadowWrite", new CVec3(this.mBrush.mLightCount, this.mBrush.mShadowCount, 2)));
                            srp.PushAnd(new CCondition("mCullMask.x", "&", this.mCullMask.x));
                        }
                        if (srp.mShaderAttr[0].mData.x != this.mBrush.mLightCount || srp.mShaderAttr[0].mData.y != this.mBrush.mShadowCount) {
                            srp.mShaderAttr[0].mData.x = this.mBrush.mLightCount;
                            srp.mShaderAttr[0].mData.y = this.mBrush.mShadowCount;
                            srp.mShaderAttr[0].mData.z = 2;
                            srp.Reset();
                            this.mBrush.mAutoRPUpdate = CUpdate.eType.Updated;
                        }
                        srp.mAnd[srp.mAnd.length - 1].mValue = this.mCullMask.x;
                        if (this.mShadowOff)
                            srp.mCycle = 100000000;
                        else
                            srp.mCycle = 0;
                    }
                }
            }
            if (shadowTex.GetInfo()[0].mCount < this.mBrush.mShadowTexOff) {
                this.GetOwner().GetFrame().Ren().BuildRenderTarget([new CTextureInfo(CTexture.eTarget.Array, CTexture.eFormat.RGBA32F, this.mBrush.mShadowTexOff)], new CVec2(shadowTex.GetWidth(), shadowTex.GetHeight()), this.GetOwner().GetFrame().Pal().GetShadowWriteTex());
            }
            if (!this.mShadowOff) {
                this.mCullMask.w = this.mBrush.mShadowCount;
                this.mBrush.mShadowCount++;
            }
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
        this.mBrush.mLightMask[this.mBrush.mLightCount * 4 + 0] = this.mCullMask.x;
        this.mBrush.mLightMask[this.mBrush.mLightCount * 4 + 1] = this.mCullMask.y;
        this.mBrush.mLightMask[this.mBrush.mLightCount * 4 + 2] = this.mCullMask.z;
        this.mBrush.mLightMask[this.mBrush.mLightCount * 4 + 3] = this.mCullMask.w;
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
    SetShadow3D(_shadowKey, _CycleTime0 = 0, _CycleTime1 = -1, _CycleTime2 = -1, _CycleTime3 = -1) {
        this.mTexKey = _shadowKey;
        this.mCascadeCycle[0] = _CycleTime0;
        this.mCascadeCycle[1] = _CycleTime1;
        this.mCascadeCycle[2] = _CycleTime2;
        this.mCascadeCycle[3] = _CycleTime3;
        this.mUpdate = CUpdate.eType.Updated;
    }
    SetShadow2D(_shadowKey) {
        this.mTexKey = _shadowKey;
        this.mCascadeCycle[0] = -1;
        this.mCascadeCycle[1] = -1;
        this.mCascadeCycle[2] = -1;
        this.mCascadeCycle[3] = -1;
        this.mUpdate = CUpdate.eType.Updated;
    }
    Refresh() {
        if (this.mBrush != null && this.mTexKey != null) {
            this.mBrush.mUpdateLight = CUpdate.eType.Updated;
            this.mBrush.mUpdateShadow = CUpdate.eType.Updated;
            if (this.mCascadeCycle[0] == -1 && this.mCascadeCycle[1] == -1 && this.mCascadeCycle[2] == -1 && this.mCascadeCycle[3] == -1) {
                for (let rp of this.mWriteRP) {
                    if (rp.mTag.has("shadowPlane") == false)
                        continue;
                    this.mBrush.RemoveAutoRP(this.mTexKey + rp.mShader);
                }
            }
            if (this.IsPointLight()) {
                for (let i = 0; i < 6; i++) {
                    this.mBrush.mCameraMap.delete(this.mTexKey + i);
                    for (let rp of this.mWriteRP) {
                        if (rp.mTag.has("shadowWrite") == false)
                            continue;
                        this.mBrush.RemoveAutoRP(this.mTexKey + rp.mShader + i);
                    }
                }
            }
            else {
                for (let i = 0; i < this.mCascadeCycle.length; ++i) {
                    if (this.mCascadeCycle[i] == -1)
                        continue;
                    this.mBrush.mCameraMap.delete(this.mTexKey + i);
                    for (let rp of this.mWriteRP) {
                        if (rp.mTag.has("shadowWrite") == false)
                            continue;
                        this.mBrush.RemoveAutoRP(this.mTexKey + rp.mShader + i);
                    }
                }
            }
            this.mBrush.ClearRen();
        }
    }
    RemoveShadow() {
        this.Refresh();
        this.mCascadeCycle = [0, -1, -1, -1];
        this.mTexKey = null;
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
    SetMask(_mask) {
        this.mCullMask.x = _mask;
    }
    GetDirectPos() {
        return this.mDirPos.xyz;
    }
    GetColor() {
        return this.mColor.xyz;
    }
    GetMask() {
        return this.mCullMask.x;
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
    SetUniformDivide() {
        this.mShadowDivide = [1, 1, 1, 1];
    }
    SetLogarithmicDivide() {
        this.mShadowDivide = [1, 13, 154, 1832];
    }
    SetPracticalDivide() {
        this.mShadowDivide = [250.6, 256.5, 326.9, 1166];
    }
    SetGeometric() {
        this.mShadowDivide = [1, 2, 4, 8];
    }
    SetGeometricSq() {
        this.mShadowDivide = [1, 4, 16, 64];
    }
    ImportCJSON(_json) {
        return super.ImportCJSON(_json);
    }
    SetEnable(_val) {
        super.SetEnable(_val);
        this.Refresh();
    }
    Destroy() {
        super.Destroy();
        this.Refresh();
    }
}
