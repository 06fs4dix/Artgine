import { CRPAuto } from "../../artgine/app/canvas/CRPMgr.js";
import { CBrushComp } from "../../artgine/app/component/CBrushComp.js";
import { CPaint3D } from "../../artgine/app/component/paint/CPaint3D.js";
import { CSubject } from "../../artgine/app/subject/CSubject.js";
import { CUpdate } from "../../artgine/basic/Basic.js";
import { CEvent } from "../../artgine/basic/CEvent.js";
import { CUniqueID } from "../../artgine/basic/CUniqueID.js";
import { CMath } from "../../artgine/geometry/CMath.js";
import { CVec1 } from "../../artgine/geometry/CVec1.js";
import { CVec2 } from "../../artgine/geometry/CVec2.js";
import { CVec3 } from "../../artgine/geometry/CVec3.js";
import { CVec4 } from "../../artgine/geometry/CVec4.js";
import { CRenderPass } from "../../artgine/render/CRenderPass.js";
import { CShaderAttr } from "../../artgine/render/CShaderAttr.js";
import { CTexture, CTextureInfo } from "../../artgine/render/CTexture.js";
import { CCondition } from "../../artgine/util/CCondition.js";
import { CFrame } from "../../artgine/util/CFrame.js";
import { CPlugin } from "../../artgine/util/CPlugin.js";
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
    [ePreset.Emerald]: new CVec4(10, 50, 2000, 10),
    [ePreset.Green]: new CVec4(10, 30, 2000, 10),
    [ePreset.Caribbean]: new CVec4(10, 100, 2000, 10),
    [ePreset.NorthSea]: new CVec4(10, 35, 2000, 10),
    [ePreset.Muddy]: new CVec4(10, 10, 2000, 10),
};
export class CWater extends CSubject {
    static ePreset = ePreset;
    mPaint;
    mReflector;
    mRefractor;
    mDeepColor = new CVec3();
    mShallowColor = new CVec3();
    mWaterDeep = new CVec4(10, 255, 2000, 10);
    mCausticTexture = null;
    mCausticFlowDir = new CVec2(0, 0);
    mCausticFlowFrequency = new CVec1(1);
    constructor() {
        super();
        this.mPaint = new CPaint3D(CFrame.Main().Pal().GetPlaneMesh());
        this.mPaint.PushRenderPass(new CRenderPass(gWaterShader));
        this.mPaint.PushTag("water");
        this.mPaint.SetTexture([]);
        this.mPaint.PushCShaderAttr(new CShaderAttr("deepColor", this.mDeepColor));
        this.mPaint.PushCShaderAttr(new CShaderAttr("shallowColor", this.mShallowColor));
        this.mPaint.PushCShaderAttr(new CShaderAttr("waterDeep", this.mWaterDeep));
        this.PushComp(this.mPaint);
        this.Preset(ePreset.Emerald);
    }
    GetPT() {
        return this.mPaint;
    }
    Update(_update) {
        super.Update(_update);
        if (this.mUpdateMat == CUpdate.eType.Updated) {
            this.mWaterDeep.x = this.GetPos().y;
        }
    }
    SetWaterDeep(_deepHeight, _farDistance, _deepColor, _shallowColor) {
        if (_deepHeight != null)
            this.mWaterDeep.y = _deepHeight;
        if (_farDistance != null)
            this.mWaterDeep.z = _farDistance;
        if (_deepColor != null)
            this.mDeepColor.Import(_deepColor);
        if (_shallowColor != null)
            this.mShallowColor.Import(_shallowColor);
    }
    NormalFlow(_flow, _normalTex1 = null, _normalTex2 = null) {
        this.mPaint.PushCShaderAttr(new CShaderAttr("normalflowDir", _flow));
        if (_normalTex1 != null && _normalTex2 != null) {
            this.mPaint.PushTag("normalMap");
            this.mPaint.PushCShaderAttr(new CShaderAttr("normal1Map", 3.0));
            this.mPaint.PushCShaderAttr(new CShaderAttr(3.0, _normalTex1));
            this.mPaint.PushCShaderAttr(new CShaderAttr("normal2Map", 4.0));
            this.mPaint.PushCShaderAttr(new CShaderAttr(4.0, _normalTex2));
        }
        else {
            this.mPaint.RemoveTag("normalMap");
        }
    }
    AddRefractor(_texture = undefined, _flow = new CVec2(0, 0)) {
        if (_texture == undefined) {
            if (this.mRefractor != null)
                return;
            this.mRefractor = new CRefractor();
            this.PushComp(this.mRefractor);
            this.mRefractor.AddCaustics(this.mCausticFlowDir, this.mCausticFlowFrequency, this.mCausticTexture);
            this.mRefractor.AddWaterDeep(this.mWaterDeep, this.mShallowColor, this.mDeepColor);
            this.mPaint.PushTag("UseRefractTex");
            this.mPaint.PushCShaderAttr(new CShaderAttr("refractionMap", 2.0));
            this.mPaint.PushCShaderAttr(new CShaderAttr(2.0, this.mRefractor.GetTex()));
            return;
        }
        else {
            this.RemoveRefractor();
            this.mPaint.PushTag("UseWaterTex");
            this.mPaint.PushCShaderAttr(new CShaderAttr("texflowDir", _flow));
            this.mPaint.SetTexture([_texture]);
        }
    }
    RemoveRefractor() {
        if (this.mRefractor == null)
            return;
        this.mPaint.RemoveTag("UseRefractTex");
        this.mRefractor.Destroy();
        this.mRefractor = null;
    }
    AddCaustics(_caustic, _flow = new CVec2(0, 0), _frequency = 1.0) {
        this.mCausticFlowDir.Import(_flow);
        this.mCausticFlowFrequency.x = _frequency;
        this.mCausticTexture = _caustic;
        if (this.mRefractor == null) {
            this.AddRefractor();
        }
        this.mRefractor.SetCausticTexture(this.mCausticTexture);
    }
    AddReflector(_texture = undefined) {
        if (_texture == undefined) {
            if (this.mReflector != null)
                return;
            this.mReflector = new CReflector();
            this.PushComp(this.mReflector);
            this.mReflector.AddWaterDeep(this.mWaterDeep);
            this.mPaint.PushTag("UseWaterReflect");
            this.mPaint.PushCShaderAttr(new CShaderAttr("reflectionMap", 1.0));
            this.mPaint.PushCShaderAttr(new CShaderAttr(1.0, this.mReflector.GetTex()));
            return;
        }
        else {
            this.RemoveReflector();
            this.mPaint.PushTag("UseCubeTex");
            this.mPaint.PushCShaderAttr(new CShaderAttr("reflectionMap", 0.0));
            this.mPaint.PushCShaderAttr(new CShaderAttr(0.0, _texture));
        }
    }
    RemoveReflector() {
        if (this.mReflector == null)
            return;
        this.mPaint.RemoveTag("UseWaterReflect");
        this.mReflector.Destroy();
        this.mReflector = null;
    }
    Preset(_type) {
        this.mShallowColor.Import(PresetShallowColorMap[_type]);
        this.mDeepColor.Import(PresetDeepColorMap[_type]);
        this.mWaterDeep.Import(PresetDeepValMap[_type]);
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
    constructor() {
        super("reflector_" + CUniqueID.Get());
        {
            const rp = new CRPAuto(CFrame.Main().Pal().Sl3D().mKey);
            rp.mCopy = false;
            rp.mPriority = CRenderPass.ePriority.Normal - 2;
            rp.mRenderTarget = this.GetTex();
            rp.mCamera = this.mTexKey;
            rp.PushOr(new CCondition("class", "==", "CPaint3D"));
            rp.PushAnd(new CCondition("mTag[water]", "==", false));
            this.PushRPAuto(rp);
        }
        {
            const rp = new CRPAuto(CFrame.Main().Pal().SlCube().mKey);
            rp.mCopy = false;
            rp.mPriority = CRenderPass.ePriority.Normal - 1;
            rp.mCullFace = CRenderPass.eCull.CW;
            rp.mRenderTarget = this.GetTex();
            rp.mCamera = this.mTexKey;
            rp.PushOr(new CCondition("class", "==", "CPaintCube"));
            rp.PushAnd(new CCondition("mTag[water]", "==", false));
            rp.PushAnd(new CCondition("mTag[sky]"));
            this.PushRPAuto(rp);
            rp.mClearColor = false;
            rp.mClearDepth = false;
        }
    }
    AddWaterDeep(_waterDeep) {
        const rp = this.mWrite[0];
        rp.mTag.add("waterReflect");
        rp.mShaderAttr.push(new CShaderAttr("waterDeep", _waterDeep));
    }
    V3Reflect(_vec, _normal) {
        const dotProduct = CMath.V3Dot(_vec, _normal);
        return new CVec3(_vec.x - _normal.x * 2 * dotProduct, _vec.y - _normal.y * 2 * dotProduct, _vec.z - _normal.z * 2 * dotProduct);
    }
    Update(_update) {
        super.Update(_update);
        if (this.mBruch != null)
            this.UpdateBrush(_update);
    }
    UpdateBrush(_update) {
        const fw = this.GetOwner().GetFrame();
        let tex = fw.Res().Find(this.GetTex());
        if (!tex) {
            fw.Ren().BuildRenderTarget([new CTextureInfo(CTexture.eTarget.Sigle, CTexture.eFormat.RGBA8, 1)], new CVec2(this.mSize, this.mSize), this.GetTex());
            tex = fw.Res().Find(this.GetTex());
            tex.SetAutoResize(false);
        }
        if (tex.GetWidth() != this.mSize) {
            tex.SetSize(this.mSize, this.mSize);
            fw.Ren().BuildTexture(tex);
        }
        for (const rp of this.mWrite) {
            const rpKey = this.mTexKey + rp.mShader;
            if (!this.mBruch.AutoRP().has(rpKey)) {
                this.mBruch.SetAutoRP(rpKey, rp);
            }
            if (rp.mCycle != this.mCycle) {
                rp.mCycle = this.mCycle;
                this.mBruch.mAutoRPUpdate = CUpdate.eType.Updated;
            }
        }
        const mainCam = this.mBruch.GetCam3D();
        const virtualCam = this.mBruch.GetCamera(this.mTexKey);
        const wMat = this.GetOwner().GetMat();
        const pos = wMat.xyz;
        const rot = CMath.QutToMat(CMath.MatDecomposeRot(wMat));
        const normal = CMath.V3Nor(CMath.V3MulMatNormal(new CVec3(0, 0, 1), rot));
        const view = CMath.V3SubV3(pos, mainCam.GetEye());
        const realUp = CMath.V3Cross(mainCam.GetView(), mainCam.GetCross());
        const eye = CMath.V3AddV3(CMath.V3MulFloat(this.V3Reflect(view, normal), -1), pos);
        const look = CMath.V3AddV3(this.V3Reflect(mainCam.GetView(), normal), eye);
        const up = this.V3Reflect(realUp, normal);
        if (virtualCam.Init(eye, look, up)) {
            virtualCam.SetFar(mainCam.GetFar());
            virtualCam.SetFov(mainCam.mFov);
            if (mainCam.mOrthographic)
                virtualCam.ResetOrthographic();
            else
                virtualCam.ResetPerspective();
        }
    }
    Destroy() {
        super.Destroy();
        if (this.mWrite.length > 0) {
            for (const rp of this.mWrite) {
                const rpKey = this.mTexKey + rp.mShader;
                this.mBruch.RemoveAutoRP(rpKey);
            }
            this.mWrite.length = 0;
        }
    }
}
export class CRefractor extends CBrushComp {
    mSize = 512;
    mCycle = 0;
    constructor() {
        super("refractor_" + CUniqueID.Get());
        {
            const rp = new CRPAuto(CFrame.Main().Pal().Sl3D().mKey);
            rp.mCopy = false;
            rp.mPriority = CRenderPass.ePriority.Normal - 2;
            rp.mRenderTarget = this.GetTex();
            rp.mCamera = this.mTexKey;
            rp.PushOr(new CCondition("class", "==", "CPaint3D"));
            rp.PushAnd(new CCondition("mTag[water]", "==", false));
            this.PushRPAuto(rp);
        }
        {
            const rp = new CRPAuto(CFrame.Main().Pal().SlCube().mKey);
            rp.mCopy = false;
            rp.mPriority = CRenderPass.ePriority.Normal - 1;
            rp.mCullFace = CRenderPass.eCull.CW;
            rp.mRenderTarget = this.GetTex();
            rp.mCamera = this.mTexKey;
            rp.PushOr(new CCondition("class", "==", "CPaintCube"));
            rp.PushAnd(new CCondition("mTag[water]", "==", false));
            rp.PushAnd(new CCondition("mTag[sky]"));
            this.PushRPAuto(rp);
            rp.mClearColor = false;
            rp.mClearDepth = false;
        }
    }
    AddWaterDeep(_waterDeep, _shallowColor, _deepColor) {
        const rp = this.mWrite[0];
        rp.mTag.add("waterRefract");
        rp.mShaderAttr.push(new CShaderAttr("waterDeep", _waterDeep));
        rp.mShaderAttr.push(new CShaderAttr("shallowColor", _shallowColor));
        rp.mShaderAttr.push(new CShaderAttr("deepColor", _deepColor));
    }
    AddCaustics(_flow, _freq, _caustic) {
        const rp = this.mWrite[0];
        rp.mTag.add("waterRefract");
        rp.mShaderAttr.push(new CShaderAttr("causticFlowDir", _flow));
        rp.mShaderAttr.push(new CShaderAttr("causticFlowFreq", _freq));
        rp.mShaderAttr.push(new CShaderAttr("causticMap", 5.0));
        this.SetCausticTexture(_caustic);
    }
    SetCausticTexture(_caustic) {
        const rp = this.mWrite[0];
        let shaderAttr = rp.mShaderAttr.find(attr => attr.mEach == 5.0);
        if (shaderAttr)
            shaderAttr.mKey = _caustic;
        else
            rp.mShaderAttr.push(new CShaderAttr(5.0, _caustic));
    }
    Update(_update) {
        super.Update(_update);
        if (this.mBruch != null)
            this.UpdateBrush(_update);
    }
    UpdateBrush(_update) {
        const fw = this.GetOwner().GetFrame();
        let tex = fw.Res().Find(this.GetTex());
        if (!tex) {
            fw.Ren().BuildRenderTarget([new CTextureInfo(CTexture.eTarget.Sigle, CTexture.eFormat.RGBA8, 1)], new CVec2(this.mSize, this.mSize), this.GetTex());
            tex = fw.Res().Find(this.GetTex());
            tex.SetAutoResize(false);
        }
        if (tex.GetWidth() != this.mSize) {
            tex.SetSize(this.mSize, this.mSize);
            fw.Ren().BuildTexture(tex);
        }
        for (const rp of this.mWrite) {
            const rpKey = this.mTexKey + rp.mShader;
            if (!this.mBruch.AutoRP().has(rpKey)) {
                this.mBruch.SetAutoRP(rpKey, rp);
            }
            if (rp.mCycle != this.mCycle) {
                rp.mCycle = this.mCycle;
                this.mBruch.mAutoRPUpdate = CUpdate.eType.Updated;
            }
        }
        const mainCam = this.mBruch.GetCam3D();
        const virtualCam = this.mBruch.GetCamera(this.mTexKey);
        if (virtualCam.Init(mainCam.GetEye(), mainCam.GetLook())) {
            virtualCam.SetFar(mainCam.GetFar());
            virtualCam.SetFov(mainCam.mFov);
            if (mainCam.mOrthographic)
                virtualCam.ResetOrthographic();
            else
                virtualCam.ResetPerspective();
        }
    }
    Destroy() {
        super.Destroy();
        if (this.mWrite.length > 0) {
            for (const rp of this.mWrite) {
                const rpKey = this.mTexKey + rp.mShader;
                this.mBruch.RemoveAutoRP(rpKey);
            }
            this.mWrite.length = 0;
        }
    }
}
