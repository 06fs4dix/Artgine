import { CUpdate } from "../../artgine/basic/Basic.js";
import { CEvent } from "../../artgine/basic/CEvent.js";
import { CUniqueID } from "../../artgine/basic/CUniqueID.js";
import { CBrushComp } from "../../artgine/canvas/component/CBrushComp.js";
import { CPaint3D } from "../../artgine/canvas/component/paint/CPaint3D.js";
import { CRPAuto } from "../../artgine/canvas/CRPMgr.js";
import { CSubject } from "../../artgine/canvas/subject/CSubject.js";
import { CMath } from "../../artgine/geometry/CMath.js";
import { CVec2 } from "../../artgine/geometry/CVec2.js";
import { CVec3 } from "../../artgine/geometry/CVec3.js";
import { CRenderPass } from "../../artgine/render/CRenderPass.js";
import { CShaderAttr } from "../../artgine/render/CShaderAttr.js";
import { CTexture, CTextureInfo } from "../../artgine/render/CTexture.js";
import { CFrame } from "../../artgine/util/CFrame.js";
import { CLoaderOption } from "../../artgine/util/CLoader.js";
import { CPlugin } from "../../artgine/util/CPlugin.js";
import { CCondition } from "../../artgine/util/CStateMachine.js";
let gWaterShader = "";
CPlugin.PushEvent(CEvent.eType.Load, () => {
    gWaterShader = CPlugin.FindPath("Water") + "WaterShader.ts";
    CFrame.Main().Load().Exe(gWaterShader);
});
var ePreset;
(function (ePreset) {
    ePreset[ePreset["Emerald"] = 0] = "Emerald";
    ePreset[ePreset["Green"] = 1] = "Green";
    ePreset[ePreset["Caribbean"] = 2] = "Caribbean";
    ePreset[ePreset["NorthSea"] = 3] = "NorthSea";
    ePreset[ePreset["Muddy"] = 4] = "Muddy";
})(ePreset || (ePreset = {}));
;
const PresetShallowColorMap = {
    [ePreset.Emerald]: new CVec3(0.00, 0.55, 0.35),
    [ePreset.Green]: new CVec3(0.20, 0.60, 0.05),
    [ePreset.Caribbean]: new CVec3(0.30, 0.85, 0.95),
    [ePreset.NorthSea]: new CVec3(0.10, 0.40, 0.50),
    [ePreset.Muddy]: new CVec3(0.40, 0.25, 0.15),
};
const PresetDeepColorMap = {
    [ePreset.Emerald]: new CVec3(0.00, 0.15, 0.25),
    [ePreset.Green]: new CVec3(0.05, 0.10, 0.08),
    [ePreset.Caribbean]: new CVec3(0.00, 0.10, 0.40),
    [ePreset.NorthSea]: new CVec3(0.03, 0.08, 0.15),
    [ePreset.Muddy]: new CVec3(0.10, 0.05, 0.03),
};
const PresetDeepValMap = {
    [ePreset.Emerald]: new CVec2(0.0, 50.0),
    [ePreset.Green]: new CVec2(0.00, 30.0),
    [ePreset.Caribbean]: new CVec2(0.00, 100.0),
    [ePreset.NorthSea]: new CVec2(0.00, 35.0),
    [ePreset.Muddy]: new CVec2(0.00, 10.0),
};
export class CWater extends CSubject {
    static ePreset = ePreset;
    mPaint;
    mReflector;
    mRefractor;
    constructor() {
        super();
        this.mPaint = new CPaint3D(CFrame.Main().Pal().GetPlaneMesh());
        this.mPaint.PushRenderPass(new CRenderPass(gWaterShader));
        this.mPaint.PushTag("water");
        this.mPaint.SetTexture([]);
        this.PushComp(this.mPaint);
        this.AddRefractor();
        this.Preset(ePreset.Emerald);
    }
    GetPT() {
        return this.mPaint;
    }
    AddCaustics(_caustic, _flow = new CVec2(1, 0)) {
        const loaderOption = new CLoaderOption();
        loaderOption.mWrap = CTexture.eWrap.Repeat;
        CFrame.Main().Load().Exe(_caustic, loaderOption);
        if (this.mRefractor == null) {
            this.AddRefractor();
        }
        this.mRefractor.mCausticTexture = _caustic;
        this.mRefractor.mCausticFlowDir.Import(_flow);
    }
    AddRefractor() {
        if (this.mRefractor != null)
            return;
        this.mRefractor = new CRefractor("refractor_" + CUniqueID.Get());
        this.PushComp(this.mRefractor);
        this.mPaint.PushCShaderAttr(new CShaderAttr("refractionMap", 2.0));
        this.mPaint.PushCShaderAttr(new CShaderAttr(2.0, this.mRefractor.GetTex()));
    }
    RemoveRefractor() {
        if (this.mRefractor == null)
            return;
        this.mRefractor.Destroy();
        this.mRefractor = null;
    }
    UseTexAsRefract(_texture, _flow = new CVec2(0, 0)) {
        this.RemoveRefractor();
        this.mPaint.PushTag("UseWaterTex");
        this.mPaint.PushCShaderAttr(new CShaderAttr("texflowDir", _flow));
        this.mPaint.SetTexture([_texture]);
    }
    AddReflector() {
        if (this.mReflector != null)
            return;
        this.mReflector = new CReflector("reflector_" + CUniqueID.Get());
        this.PushComp(this.mReflector);
        this.mPaint.PushCShaderAttr(new CShaderAttr(1.0, this.mReflector.GetTex()));
        this.mPaint.PushTag("UseWaterReflect");
    }
    RemoveReflector() {
        if (this.mReflector == null)
            return;
        this.mReflector.Destroy();
        this.mReflector = null;
    }
    NormalFlow(_flow, _normalTex0, _normalTex1) {
        this.mPaint.PushTag("normalMap");
        this.mPaint.PushCShaderAttr(new CShaderAttr("normalflowDir", _flow));
        const loaderOption = new CLoaderOption();
        loaderOption.mWrap = CTexture.eWrap.Repeat;
        CFrame.Main().Load().Exe(_normalTex0, loaderOption);
        CFrame.Main().Load().Exe(_normalTex1, loaderOption);
        this.mPaint.PushCShaderAttr(new CShaderAttr(3.0, _normalTex0));
        this.mPaint.PushCShaderAttr(new CShaderAttr(4.0, _normalTex1));
    }
    Preset(_type) {
        if (this.mRefractor != null) {
            this.mRefractor.mShallowColor.Import(PresetShallowColorMap[_type]);
            this.mRefractor.mDeepColor.Import(PresetDeepColorMap[_type]);
            this.mRefractor.mWaterDeep.Import(PresetDeepValMap[_type]);
        }
    }
    EditHTMLInit(_div, _pointer) {
        super.EditHTMLInit(_div, _pointer);
        for (const p of Object.keys(ePreset).filter(key => isNaN(Number(key)))) {
            var button = document.createElement("button");
            button.innerText = p;
            button.onclick = () => {
                this.Preset(ePreset[p]);
            };
            _div.append(button);
        }
    }
}
export class CReflector extends CBrushComp {
    mSize = 512;
    mCycle = 0;
    Update(_update) {
        super.Update(_update);
        if (this.mBruch != null)
            this.UpdateBrush(_update);
    }
    V3Reflect(_vec, _normal) {
        const dotProduct = CMath.V3Dot(_vec, _normal);
        return new CVec3(_vec.x - _normal.x * 2 * dotProduct, _vec.y - _normal.y * 2 * dotProduct, _vec.z - _normal.z * 2 * dotProduct);
    }
    Destroy() {
        super.Destroy();
        if (this.mWrite.length == 0) {
            for (const rp of this.mWrite) {
                const rpKey = this.mTexKey + rp.mShader;
                this.mBruch.RemoveAutoRP(rpKey);
            }
        }
    }
    UpdateBrush(_update) {
        const fw = this.GetOwner().GetFrame();
        if (this.mWrite.length == 0) {
            let rp = new CRPAuto(fw.Pal().Sl3D().mKey);
            rp.mCopy = false;
            rp.mPriority = CRenderPass.ePriority.Normal - 2;
            rp.mRenderTarget = this.GetTex();
            rp.mCamera = this.mTexKey;
            rp.PushOr(new CCondition("class", "==", "CPaint3D"));
            rp.PushAnd(new CCondition("mTag[water]", "==", false));
            this.PushRPAuto(rp);
            rp = new CRPAuto(fw.Pal().SlCube().mKey);
            rp.mCopy = false;
            rp.mPriority = CRenderPass.ePriority.Normal - 1;
            rp.mClearColor = false;
            rp.mClearDepth = false;
            rp.mCullFace = CRenderPass.eCull.CW;
            rp.mRenderTarget = this.GetTex();
            rp.mCamera = this.mTexKey;
            rp.PushOr(new CCondition("class", "==", "CPaintCube"));
            rp.PushAnd(new CCondition("mTag[water]", "==", false));
            rp.PushAnd(new CCondition("mTag[sky]"));
            this.PushRPAuto(rp);
            for (const rp of this.mWrite) {
                const rpKey = this.mTexKey + rp.mShader;
                this.mBruch.SetAutoRP(rpKey, rp);
            }
        }
        let tex = fw.Res().Find(this.GetTex());
        if (tex == null) {
            fw.Ren().BuildRenderTarget([new CTextureInfo(CTexture.eTarget.Sigle, CTexture.eFormat.RGBA8, 1)], new CVec2(this.mSize, this.mSize), this.GetTex());
            tex = fw.Res().Find(this.GetTex());
            tex.SetAutoResize(false);
        }
        if (tex.GetWidth() != this.mSize) {
            tex.SetSize(this.mSize, this.mSize);
            fw.Ren().BuildTexture(tex);
        }
        const cam = this.mBruch.GetCam3D();
        const pos = this.GetOwner().GetMat().xyz;
        const normal = CMath.V3Nor(CMath.V3MulMatNormal(new CVec3(0, 0, 1), CMath.QutToMat(CMath.MatDecomposeRot(this.GetOwner().GetMat()))));
        const view = CMath.V3SubV3(pos, cam.GetEye());
        const realUp = CMath.V3Cross(cam.GetView(), cam.GetCross());
        const virtualCamEye = CMath.V3AddV3(CMath.V3MulFloat(this.V3Reflect(view, normal), -1), pos);
        const virtualCamLook = CMath.V3AddV3(this.V3Reflect(cam.GetView(), normal), virtualCamEye);
        const virtualCamUp = this.V3Reflect(realUp, normal);
        const virtualCam = this.mBruch.GetCamera(this.mTexKey);
        virtualCam.SetFar(cam.GetFar());
        virtualCam.Init(virtualCamEye, virtualCamLook, virtualCamUp);
        if (cam.mOrthographic)
            virtualCam.ResetOrthographic();
        else
            virtualCam.ResetPerspective();
        for (const rp of this.mWrite) {
            if (rp.mCycle != this.mCycle) {
                rp.mCycle = this.mCycle;
                this.mBruch.mAutoRPUpdate = CUpdate.eType.Updated;
            }
        }
    }
}
export class CRefractor extends CBrushComp {
    mSize = 512;
    mCycle = 0;
    mWaterDeep = new CVec2(0, 1000);
    mDeepColor = new CVec3(0, 0.01, 0.1);
    mShallowColor = new CVec3(0.00, 0.55, 0.35);
    mCausticTexture = null;
    mCausticFlowDir = new CVec2(0.0, 0.0);
    Update(_update) {
        super.Update(_update);
        if (this.mBruch != null)
            this.UpdateBrush(_update);
    }
    Destroy() {
        super.Destroy();
        if (this.mWrite.length == 0) {
            for (const rp of this.mWrite) {
                const rpKey = this.mTexKey + rp.mShader;
                this.mBruch.RemoveAutoRP(rpKey);
            }
        }
    }
    UpdateBrush(_update) {
        const fw = this.GetOwner().GetFrame();
        if (this.mWrite.length == 0) {
            let rp = new CRPAuto(fw.Pal().Sl3D().mKey);
            rp.mCopy = false;
            rp.mTag.add("waterRefract");
            rp.mBlend = [CRenderPass.eBlend.FUNC_ADD, CRenderPass.eBlend.FUNC_ADD, CRenderPass.eBlend.ONE, CRenderPass.eBlend.ONE_MINUS_SRC_ALPHA, CRenderPass.eBlend.ONE, CRenderPass.eBlend.ONE_MINUS_SRC_ALPHA];
            rp.mPriority = CRenderPass.ePriority.Normal - 2;
            rp.mRenderTarget = this.GetTex();
            rp.mCamera = this.mTexKey;
            rp.PushOr(new CCondition("class", "==", "CPaint3D"));
            rp.PushAnd(new CCondition("mTag[water]", "==", false));
            rp.mShaderAttr.push(new CShaderAttr("waterDeep", this.mWaterDeep));
            rp.mShaderAttr.push(new CShaderAttr("shallowColor", this.mShallowColor));
            rp.mShaderAttr.push(new CShaderAttr("deepColor", this.mDeepColor));
            rp.mShaderAttr.push(new CShaderAttr("causticFlowDir", this.mCausticFlowDir));
            rp.mShaderAttr.push(new CShaderAttr("causticMap", 5.0));
            this.PushRPAuto(rp);
            rp = new CRPAuto(fw.Pal().SlCube().mKey);
            rp.mCopy = false;
            rp.mPriority = CRenderPass.ePriority.Normal - 1;
            rp.mClearColor = false;
            rp.mClearDepth = false;
            rp.mCullFace = CRenderPass.eCull.CW;
            rp.mRenderTarget = this.GetTex();
            rp.mCamera = this.mTexKey;
            rp.PushOr(new CCondition("class", "==", "CPaintCube"));
            rp.PushAnd(new CCondition("mTag[water]", "==", false));
            rp.PushAnd(new CCondition("mTag[sky]"));
            this.PushRPAuto(rp);
            for (const rp of this.mWrite) {
                const rpKey = this.mTexKey + rp.mShader;
                this.mBruch.SetAutoRP(rpKey, rp);
            }
        }
        if (this.mCausticTexture != null) {
            if (this.mWrite[0].mShaderAttr.length <= 5) {
                this.mWrite[0].mShaderAttr.push(new CShaderAttr(5.0, this.mCausticTexture));
            }
            if (this.mWrite[0].mShaderAttr[5].mKey != this.mCausticTexture) {
                this.mWrite[0].mShaderAttr[5].mKey = this.mCausticTexture;
                this.mBruch.mAutoRPUpdate = CUpdate.eType.Updated;
            }
        }
        let tex = fw.Res().Find(this.GetTex());
        if (tex == null) {
            fw.Ren().BuildRenderTarget([new CTextureInfo(CTexture.eTarget.Sigle, CTexture.eFormat.RGBA8, 1)], new CVec2(this.mSize, this.mSize), this.GetTex());
            tex = fw.Res().Find(this.GetTex());
            tex.SetAutoResize(false);
        }
        if (tex.GetWidth() != this.mSize) {
            tex.SetSize(this.mSize, this.mSize);
            fw.Ren().BuildTexture(tex);
        }
        const cam = this.mBruch.GetCam3D();
        const virtualCam = this.mBruch.GetCamera(this.mTexKey);
        virtualCam.SetFar(cam.GetFar());
        if (virtualCam.Init(cam.GetEye(), cam.GetLook())) {
            if (cam.mOrthographic)
                virtualCam.ResetOrthographic();
            else
                virtualCam.ResetPerspective();
        }
        for (const rp of this.mWrite) {
            if (rp.mCycle != this.mCycle) {
                rp.mCycle = this.mCycle;
                this.mBruch.mAutoRPUpdate = CUpdate.eType.Updated;
            }
            if (rp.mShaderAttr.length > 0 && rp.mShaderAttr[0].mData.x != this.mWaterDeep.x) {
                rp.mShaderAttr[0].mData.x = this.mWaterDeep.x;
                rp.mShaderAttr[0].mData.y = this.mWaterDeep.y;
                this.mBruch.mAutoRPUpdate = CUpdate.eType.Updated;
            }
        }
    }
}
