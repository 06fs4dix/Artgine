import { CUpdate } from "../../artgine/basic/Basic.js";
import { CEvent } from "../../artgine/basic/CEvent.js";
import { CPointer } from "../../artgine/basic/CObject.js";
import { CUniqueID } from "../../artgine/basic/CUniqueID.js";
import { CBrushComp } from "../../artgine/canvas/component/CBrushComp.js";
import { CColor } from "../../artgine/canvas/component/CColor.js";
import CEnvMap from "../../artgine/canvas/component/CEnvMap.js";
import { CPaint3D } from "../../artgine/canvas/component/paint/CPaint3D.js";
import { CRPAuto } from "../../artgine/canvas/CRPMgr.js";
import { CSubject } from "../../artgine/canvas/subject/CSubject.js";
import { CMath } from "../../artgine/geometry/CMath.js";
import { CVec1 } from "../../artgine/geometry/CVec1.js";
import { CVec2 } from "../../artgine/geometry/CVec2.js";
import { CVec3 } from "../../artgine/geometry/CVec3.js";
import { CVec4 } from "../../artgine/geometry/CVec4.js";
import { CRenderPass } from "../../artgine/render/CRenderPass.js";
import { CShaderAttr } from "../../artgine/render/CShaderAttr.js";
import { CTexture, CTextureInfo } from "../../artgine/render/CTexture.js";
import { CFrame } from "../../artgine/util/CFrame.js";
import { CLoaderOption } from "../../artgine/util/CLoader.js";
import { CPlugin } from "../../artgine/util/CPlugin.js";
import { CCondition } from "../../artgine/util/CStateMachine.js";





let gWaterShader="";
CPlugin.PushEvent(CEvent.eType.Load,()=>{
    gWaterShader=CPlugin.FindPath("Water")+"WaterShader.ts";
    CFrame.Main().Load().Exe(gWaterShader);
});



enum ePreset {
    Emerald,
    Green,
    Caribbean,
    NorthSea,
    Muddy
};

const PresetShallowColorMap : Record<ePreset, CVec3> = {
    [ePreset.Emerald]:      new CVec3(0.00, 0.55, 0.35),
    [ePreset.Green]:        new CVec3(0.20, 0.60, 0.05),
    [ePreset.Caribbean]:    new CVec3(0.30, 0.85, 0.95),
    [ePreset.NorthSea]:     new CVec3(0.10, 0.40, 0.50),
    [ePreset.Muddy]:        new CVec3(0.40, 0.25, 0.15),
};

const PresetDeepColorMap : Record<ePreset, CVec3> = {
    [ePreset.Emerald]:      new CVec3(0.00, 0.15, 0.25),
    [ePreset.Green]:        new CVec3(0.05, 0.10, 0.08),
    [ePreset.Caribbean]:    new CVec3(0.00, 0.10, 0.40),
    [ePreset.NorthSea]:     new CVec3(0.03, 0.08, 0.15),
    [ePreset.Muddy]:        new CVec3(0.10, 0.05, 0.03),
};

const PresetDeepValMap : Record<ePreset, CVec2> = {
    [ePreset.Emerald]:      new CVec2(0.0, 50.0),
    [ePreset.Green]:        new CVec2(0.00, 30.0),
    [ePreset.Caribbean]:    new CVec2(0.00, 100.0),
    [ePreset.NorthSea]:     new CVec2(0.00, 35.0),
    [ePreset.Muddy]:        new CVec2(0.00, 10.0),
};

export class CWater extends CSubject
{
    static ePreset = ePreset;

    mPaint : CPaint3D;
    
    mReflector : CReflector;   // 반사 텍스쳐 굽는 컴포넌트
    mRefractor : CRefractor;   // 굴절 텍스쳐 굽는 컴포넌트

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

    AddCaustics(_caustic : string, _flow : CVec2 = new CVec2(1, 0)) {
        const loaderOption = new CLoaderOption();
        loaderOption.mWrap = CTexture.eWrap.Repeat;
        CFrame.Main().Load().Exe(_caustic, loaderOption);

        if(this.mRefractor == null) {
            this.AddRefractor();
        }
        this.mRefractor.mCausticTexture = _caustic;
        this.mRefractor.mCausticFlowDir.Import(_flow);
    }

    AddRefractor() {
        if(this.mRefractor != null) return;

        this.mRefractor = new CRefractor("refractor_" + CUniqueID.Get());
        this.PushComp(this.mRefractor);

        this.mPaint.PushCShaderAttr(new CShaderAttr("refractionMap", 2.0));
        this.mPaint.PushCShaderAttr(new CShaderAttr(2.0, this.mRefractor.GetTex()));
    }
    RemoveRefractor() {
        if(this.mRefractor == null) return;

        this.mRefractor.Destroy();
        this.mRefractor = null;
    }
    UseTexAsRefract(_texture : string, _flow : CVec2 = new CVec2(0, 0)) {
        this.RemoveRefractor();

        this.mPaint.PushTag("UseWaterTex");
        this.mPaint.PushCShaderAttr(new CShaderAttr("texflowDir", _flow));
        this.mPaint.SetTexture([_texture]);
    }

    AddReflector() {
        if(this.mReflector != null) return;

        this.mReflector = new CReflector("reflector_" + CUniqueID.Get());
        this.PushComp(this.mReflector);

        this.mPaint.PushCShaderAttr(new CShaderAttr(1.0, this.mReflector.GetTex()));

        this.mPaint.PushTag("UseWaterReflect");
    }
    RemoveReflector() {
        if(this.mReflector == null) return;

        this.mReflector.Destroy();
        this.mReflector = null;
    }

    NormalFlow(_flow : CVec2, _normalTex0 : string, _normalTex1 : string) {
        this.mPaint.PushTag("normalMap");
        this.mPaint.PushCShaderAttr(new CShaderAttr("normalflowDir", _flow));
        
        const loaderOption = new CLoaderOption();
        loaderOption.mWrap = CTexture.eWrap.Repeat;
        CFrame.Main().Load().Exe(_normalTex0, loaderOption);
        CFrame.Main().Load().Exe(_normalTex1, loaderOption);

        this.mPaint.PushCShaderAttr(new CShaderAttr(3.0, _normalTex0));
        this.mPaint.PushCShaderAttr(new CShaderAttr(4.0, _normalTex1));
    }

    Preset(_type : ePreset) {
        if(this.mRefractor != null) {
            this.mRefractor.mShallowColor.Import(PresetShallowColorMap[_type]);
            this.mRefractor.mDeepColor.Import(PresetDeepColorMap[_type]);
            this.mRefractor.mWaterDeep.Import(PresetDeepValMap[_type]);
        }
    }

    EditHTMLInit(_div: HTMLDivElement, _pointer?: CPointer): void {
        super.EditHTMLInit(_div, _pointer);

        for(const p of Object.keys(ePreset).filter(key=>isNaN(Number(key)))) {
            var button = document.createElement("button");
            button.innerText = p;
            button.onclick=()=>{
                this.Preset(ePreset[p as keyof typeof ePreset]);
            };
            _div.append(button);
        }
    }
}

export class CReflector extends CBrushComp
{
    mSize : number = 512;
    mCycle : number = 0;

    Update(_update: CUpdate): boolean|any {
        super.Update(_update);
        if(this.mBruch != null) this.UpdateBrush(_update);
    }

    private V3Reflect(_vec : CVec3, _normal : CVec3) {
        const dotProduct = CMath.V3Dot(_vec, _normal);
        return new CVec3(
            _vec.x - _normal.x * 2 * dotProduct,
            _vec.y - _normal.y * 2 * dotProduct,
            _vec.z - _normal.z * 2 * dotProduct
        );
    }

    Destroy(): void {
        super.Destroy();

        if(this.mWrite.length == 0) {
            for(const rp of this.mWrite) {
                const rpKey = this.mTexKey + rp.mShader;
                this.mBruch.RemoveAutoRP(rpKey);
            }
        }
    }

    UpdateBrush(_update : CUpdate) {
        const fw = this.GetOwner().GetFrame();
        if(this.mWrite.length == 0) {
            let rp = new CRPAuto(fw.Pal().Sl3D().mKey);
            rp.mCopy = false;
            rp.mPriority=CRenderPass.ePriority.Normal - 2;
            rp.mRenderTarget = this.GetTex();
            rp.mCamera = this.mTexKey;
            rp.PushOr(new CCondition("class","==","CPaint3D"));
            rp.PushAnd(new CCondition("mTag[water]","==",false));
            this.PushRPAuto(rp);

            rp = new CRPAuto(fw.Pal().SlCube().mKey);
            rp.mCopy = false;
            rp.mPriority=CRenderPass.ePriority.Normal - 1;
            rp.mClearColor = false;
            rp.mClearDepth = false;
            rp.mCullFace=CRenderPass.eCull.CW;
            rp.mRenderTarget = this.GetTex();
            rp.mCamera = this.mTexKey;
            rp.PushOr(new CCondition("class","==","CPaintCube"));
            rp.PushAnd(new CCondition("mTag[water]","==",false));
            rp.PushAnd(new CCondition("mTag[sky]"));
            this.PushRPAuto(rp);

            for(const rp of this.mWrite) {
                const rpKey = this.mTexKey + rp.mShader;
                this.mBruch.SetAutoRP(rpKey, rp);
            }
        }

        let tex = fw.Res().Find(this.GetTex()) as CTexture;
        if(tex == null) {
            fw.Ren().BuildRenderTarget(
                [new CTextureInfo(CTexture.eTarget.Sigle, CTexture.eFormat.RGBA8, 1)],
                new CVec2(this.mSize, this.mSize), 
                this.GetTex()
            );
            tex = fw.Res().Find(this.GetTex()) as CTexture;
            tex.SetAutoResize(false);
        }
        // 중간에 mSize가 변경됨
        if(tex.GetWidth() != this.mSize) {
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
        if(cam.mOrthographic)
            virtualCam.ResetOrthographic();
        else 
            virtualCam.ResetPerspective();

        for(const rp of this.mWrite) {
            if(rp.mCycle != this.mCycle) {
                rp.mCycle = this.mCycle;
                this.mBruch.mAutoRPUpdate = CUpdate.eType.Updated;
            }
        }
    }
}

export class CRefractor extends CBrushComp
{
    mSize : number = 512;
    mCycle : number = 0;
    mWaterDeep : CVec2 = new CVec2(0,1000);
    mDeepColor : CVec3 = new CVec3(0,0.01,0.1);
    mShallowColor : CVec3 = new CVec3(0.00, 0.55, 0.35);
    mCausticTexture : string = null;
    mCausticFlowDir : CVec2 = new CVec2(0.0, 0.0);

    Update(_update: CUpdate): boolean|any {
        super.Update(_update);
        if(this.mBruch != null) this.UpdateBrush(_update);
    }

    Destroy(): void {
        super.Destroy();

        if(this.mWrite.length == 0) {
            for(const rp of this.mWrite) {
                const rpKey = this.mTexKey + rp.mShader;
                this.mBruch.RemoveAutoRP(rpKey);
            }
        }
    }

    UpdateBrush(_update : CUpdate) {
        const fw = this.GetOwner().GetFrame();
        if(this.mWrite.length == 0) {
            let rp = new CRPAuto(fw.Pal().Sl3D().mKey);
            rp.mCopy = false;
            rp.mTag.add("waterRefract");
            rp.mBlend = [CRenderPass.eBlend.FUNC_ADD,CRenderPass.eBlend.FUNC_ADD,CRenderPass.eBlend.ONE,CRenderPass.eBlend.ONE_MINUS_SRC_ALPHA,CRenderPass.eBlend.ONE,CRenderPass.eBlend.ONE_MINUS_SRC_ALPHA];
            rp.mPriority = CRenderPass.ePriority.Normal - 2;
            rp.mRenderTarget = this.GetTex();
            rp.mCamera = this.mTexKey;
            rp.PushOr(new CCondition("class","==","CPaint3D"));
            rp.PushAnd(new CCondition("mTag[water]","==",false));
            rp.mShaderAttr.push(new CShaderAttr("waterDeep", this.mWaterDeep));
            rp.mShaderAttr.push(new CShaderAttr("shallowColor", this.mShallowColor));
            rp.mShaderAttr.push(new CShaderAttr("deepColor", this.mDeepColor));
            rp.mShaderAttr.push(new CShaderAttr("causticFlowDir", this.mCausticFlowDir));
            rp.mShaderAttr.push(new CShaderAttr("causticMap", 5.0));
            this.PushRPAuto(rp);

            rp = new CRPAuto(fw.Pal().SlCube().mKey);
            rp.mCopy = false;
            rp.mPriority=CRenderPass.ePriority.Normal - 1;
            rp.mClearColor = false;
            rp.mClearDepth = false;
            rp.mCullFace=CRenderPass.eCull.CW;
            rp.mRenderTarget = this.GetTex();
            rp.mCamera = this.mTexKey;
            rp.PushOr(new CCondition("class","==","CPaintCube"));
            rp.PushAnd(new CCondition("mTag[water]","==",false));
            rp.PushAnd(new CCondition("mTag[sky]"));
            this.PushRPAuto(rp);

            for(const rp of this.mWrite) {
                const rpKey = this.mTexKey + rp.mShader;
                this.mBruch.SetAutoRP(rpKey, rp);
            }
        }
        if(this.mCausticTexture != null) {
            if(this.mWrite[0].mShaderAttr.length <= 5) {
                this.mWrite[0].mShaderAttr.push(new CShaderAttr(5.0, this.mCausticTexture));
            }
            if(this.mWrite[0].mShaderAttr[5].mKey != this.mCausticTexture) {
                this.mWrite[0].mShaderAttr[5].mKey = this.mCausticTexture;
                this.mBruch.mAutoRPUpdate = CUpdate.eType.Updated;
            }
        }

        let tex = fw.Res().Find(this.GetTex()) as CTexture;
        if(tex == null) {
            fw.Ren().BuildRenderTarget(
                [new CTextureInfo(CTexture.eTarget.Sigle, CTexture.eFormat.RGBA8, 1)],
                new CVec2(this.mSize, this.mSize), 
                this.GetTex()
            );
            tex = fw.Res().Find(this.GetTex()) as CTexture;
            tex.SetAutoResize(false);
        }
        // 중간에 mSize가 변경됨
        if(tex.GetWidth() != this.mSize) {
            tex.SetSize(this.mSize, this.mSize);
            fw.Ren().BuildTexture(tex);
        }
        
        const cam = this.mBruch.GetCam3D();
        

        const virtualCam = this.mBruch.GetCamera(this.mTexKey);
        virtualCam.SetFar(cam.GetFar());
        if(virtualCam.Init(cam.GetEye(), cam.GetLook()))
        {
            if(cam.mOrthographic)
                virtualCam.ResetOrthographic();
            else 
                virtualCam.ResetPerspective();
        }

        for(const rp of this.mWrite) {
            if(rp.mCycle != this.mCycle) {
                rp.mCycle = this.mCycle;
                this.mBruch.mAutoRPUpdate = CUpdate.eType.Updated;
            }
            if(rp.mShaderAttr.length > 0 && rp.mShaderAttr[0].mData.x != this.mWaterDeep.x) {
                rp.mShaderAttr[0].mData.x = this.mWaterDeep.x;
                rp.mShaderAttr[0].mData.y = this.mWaterDeep.y;
                this.mBruch.mAutoRPUpdate = CUpdate.eType.Updated;
            }
        }
    }
}


/*
    rendering / lighting
        shading mode - general / advanced
        enable lighting - 라이팅 기능 on/off
        diffuse lighting - 수면의 디퓨즈 라이팅
        sparkles - specular 대신 사용
            intensity
            size
        flat/low-poly shading - 버텍스 셰이더로 계산 이전, plane 사용
        receive shadows - 수면에 그림자(필요한가?)
            strength

    color
        deep
        shallow
        fog/density
            distance depth
            vertical depth
                exponential
            color absorption
            vertex color depth
            edge fading
        horizon
            horizon distance
            wave tint
    
    normals
        enable
        normal map 0
        tiling
        speed multiplier

        distance normals
        normal map 1
        tiling multiplier
        blend distance range

    underwater
        caustics
        texture(additive blended)
        brightness
        distortion
        tiling
        speed multiplier
        refraction
            strength
        chromatic aberration
        underwater surface rendering
            surface smoothness
            refraction offset
    
    surface foam
        enable
        texture(r = mask)
        color
        vertex color painting
        cutoff
        wave mask
            exponent
        tiling
        speed multiplier

    intersection foam
        style
        gradient source
        texture
        color
        distance
        falloff
        noise tiling
        speed multiplier
        cutoff
        ripple distance
        ripple strength

    reflection
        light reflection
            enable
            directional light
                strength
                size
                distortion
            point/spot light
                strength
                size
                distortion
        environment reflection
            enable
            strength
            lighting influence
            curvature mask
            distortion
            blur
    
    waves
        enable
        speed multiplier
        vertex color flattening
        height
        count
        direction
            sub layer 1
            sub layer 2
        distance
        steepness
        normal strength
        fade distance
*/