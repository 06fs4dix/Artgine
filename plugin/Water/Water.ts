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

const PresetDeepValMap : Record<ePreset, CVec3> = {
    [ePreset.Emerald]:      new CVec3(0, 50,  2000),
    [ePreset.Green]:        new CVec3(0, 30,  2000),
    [ePreset.Caribbean]:    new CVec3(0, 100, 2000),
    [ePreset.NorthSea]:     new CVec3(0, 35,  2000),
    [ePreset.Muddy]:        new CVec3(0, 10,  2000),
};

export class CWater extends CSubject
{
    static ePreset = ePreset;

    mPaint : CPaint3D;
    mReflector : CReflector;   // 반사 텍스쳐 굽는 컴포넌트
    mRefractor : CRefractor;   // 굴절 텍스쳐 굽는 컴포넌트
    mEnvMap : CEnvMap;

    // 물 색상
    mDeepColor : CVec3 = new CVec3();
    mShallowColor : CVec3 = new CVec3();
    mWaterDeep : CVec3 = new CVec3(0,255,2000); // x : 물 높이, y : 물 속이 보이는 최대 깊이, z : 물 속이 보이는 최대 거리

    // 코스틱
    mCausticTexture : string = null;
    mCausticFlowDir : CVec2 = new CVec2(0, 0);
    mCausticFlowFrequency : CVec1 = new CVec1(1);  // x : 코스틱 빈도([0, 1])

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

    SetWaterDeep(_deepHeight : number,_farDistance : number, _deepColor : CVec3, _shallowColor : CVec3) {
        if(_deepHeight!=null) this.mWaterDeep.y = _deepHeight;
        if(_farDistance!=null) this.mWaterDeep.z = _farDistance;
        if(_deepColor!=null)    this.mDeepColor.Import(_deepColor);
        if(_shallowColor!=null)    this.mShallowColor.Import(_shallowColor);
    }

    NormalFlow(_flow : CVec2, _normalTex1 : string = null, _normalTex2 : string = null) {        
        this.mPaint.PushCShaderAttr(new CShaderAttr("normalflowDir", _flow));

        if(_normalTex1 != null && _normalTex2 != null) {
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

    AddRefractor(_texture : string = undefined, _flow : CVec2 = new CVec2(0, 0)) {
        // reflector 사용
        if(_texture == undefined) {
            if(this.mRefractor != null) return;

            this.mRefractor = new CRefractor();
            this.PushComp(this.mRefractor);

            // shaderAttr 포인터로 생성
            this.mRefractor.AddCaustics(this.mCausticFlowDir, this.mCausticFlowFrequency, this.mCausticTexture);
            this.mRefractor.AddWaterDeep(this.mWaterDeep, this.mShallowColor, this.mDeepColor);

            this.mPaint.PushTag("UseRefractTex");
            this.mPaint.PushCShaderAttr(new CShaderAttr("refractionMap", 2.0));
            this.mPaint.PushCShaderAttr(new CShaderAttr(2.0, this.mRefractor.GetTex()));
            return;
        }

        // texture 사용
        else {
            this.RemoveRefractor();

            this.mPaint.PushTag("UseWaterTex");
            this.mPaint.PushCShaderAttr(new CShaderAttr("texflowDir", _flow));
            this.mPaint.SetTexture([_texture]);
        }
    }
    RemoveRefractor() {
        if(this.mRefractor == null) return;

        this.mPaint.RemoveTag("UseRefractTex");
        this.mRefractor.Destroy();
        this.mRefractor = null;
    }

    AddCaustics(_caustic : string, _flow : CVec2 = new CVec2(0, 0), _frequency : number = 1.0) {
        this.mCausticFlowDir.Import(_flow);
        this.mCausticFlowFrequency.x = _frequency;
        this.mCausticTexture = _caustic;

        if(this.mRefractor == null) {
            this.AddRefractor();
        }
        this.mRefractor.SetCausticTexture(this.mCausticTexture);    // string을 포인터로 넘길 방법이 없음
    }

    AddReflector(_texture : string = undefined) {
        // reflector 사용
        if(_texture == undefined) {
            if(this.mReflector != null) return;

            this.mReflector = new CReflector();
            this.PushComp(this.mReflector);

            this.mPaint.PushTag("UseWaterReflect");
            this.mPaint.PushCShaderAttr(new CShaderAttr("reflectionMap", 1.0));
            this.mPaint.PushCShaderAttr(new CShaderAttr(1.0, this.mReflector.GetTex()));
            return;
        }

        // cubemap 사용
        else {
            this.RemoveReflector();

            this.mPaint.PushTag("UseCubeTex");
            this.mPaint.PushCShaderAttr(new CShaderAttr("reflectionMap", 0.0));
            this.mPaint.PushCShaderAttr(new CShaderAttr(0.0, _texture));
        }
    }
    RemoveReflector() {
        if(this.mReflector == null) return;

        this.mPaint.RemoveTag("UseWaterReflect");
        this.mReflector.Destroy();
        this.mReflector = null;
    }

    Preset(_type : ePreset) {
        this.mShallowColor.Import(PresetShallowColorMap[_type]);
        this.mDeepColor.Import(PresetDeepColorMap[_type]);
        this.mWaterDeep.Import(PresetDeepValMap[_type]);
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

    constructor() {
        super("reflector_" + CUniqueID.Get());

        // 오브젝트용 RP
        {
            const rp = new CRPAuto(CFrame.Main().Pal().Sl3D().mKey);
            rp.mCopy = false;
            rp.mPriority = CRenderPass.ePriority.Normal - 2;
            rp.mRenderTarget = this.GetTex();
            rp.mCamera = this.mTexKey;
            rp.PushOr(new CCondition("class","==","CPaint3D"));
            rp.PushAnd(new CCondition("mTag[water]","==",false));
            this.PushRPAuto(rp);
        }

        // 스카이박스용 RP
        {
            const rp = new CRPAuto(CFrame.Main().Pal().SlCube().mKey);
            rp.mCopy = false;
            rp.mPriority=CRenderPass.ePriority.Normal - 1;
            rp.mCullFace=CRenderPass.eCull.CW;
            rp.mRenderTarget = this.GetTex();
            rp.mCamera = this.mTexKey;
            rp.PushOr(new CCondition("class","==","CPaintCube"));
            rp.PushAnd(new CCondition("mTag[water]","==",false));
            rp.PushAnd(new CCondition("mTag[sky]"));
            this.PushRPAuto(rp);

            rp.mClearColor = false;
            rp.mClearDepth = false;
        }
    }

    private V3Reflect(_vec : CVec3, _normal : CVec3) {
        const dotProduct = CMath.V3Dot(_vec, _normal);
        return new CVec3(
            _vec.x - _normal.x * 2 * dotProduct,
            _vec.y - _normal.y * 2 * dotProduct,
            _vec.z - _normal.z * 2 * dotProduct
        );
    }

    Update(_update: CUpdate): boolean|any {
        super.Update(_update);
        if(this.mBruch != null) this.UpdateBrush(_update);
    }

    UpdateBrush(_update : CUpdate) {
        const fw = this.GetOwner().GetFrame();

        // ---------------------------------------------------------
        // 1. 텍스처 생성
        // ---------------------------------------------------------
        let tex = fw.Res().Find(this.GetTex()) as CTexture;

        // 텍스쳐 없으면 생성
        if(!tex) {
            fw.Ren().BuildRenderTarget(
                [new CTextureInfo(CTexture.eTarget.Sigle, CTexture.eFormat.RGBA8, 1)],
                new CVec2(this.mSize, this.mSize), 
                this.GetTex()
            );
            tex = fw.Res().Find(this.GetTex()) as CTexture;
            tex.SetAutoResize(false);
        }

        // 사이즈 변경 시 재생성
        if(tex.GetWidth() != this.mSize) {
            tex.SetSize(this.mSize, this.mSize);
            fw.Ren().BuildTexture(tex);
        }

        // ---------------------------------------------------------
        // 2. 렌더 패스 설정
        // ---------------------------------------------------------
        for(const rp of this.mWrite) {
            const rpKey = this.mTexKey + rp.mShader;
            // 등록된 RP가 없다면 등록
            if(!this.mBruch.AutoRP().has(rpKey)) {
                this.mBruch.SetAutoRP(rpKey, rp);
            }
            // 사이클 변경 시 업데이트
            if(rp.mCycle != this.mCycle) {
                rp.mCycle = this.mCycle;
                this.mBruch.mAutoRPUpdate = CUpdate.eType.Updated;
            }
        }

        // ---------------------------------------------------------
        // 3. 가상 카메라 동기화
        // ---------------------------------------------------------
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

        if(virtualCam.Init(eye, look, up))
        {
            virtualCam.SetFar(mainCam.GetFar());
            virtualCam.SetFov(mainCam.mFov);
            if(mainCam.mOrthographic)
                virtualCam.ResetOrthographic();
            else 
                virtualCam.ResetPerspective();
        }
    }

    Destroy(): void {
        super.Destroy();

        if(this.mWrite.length > 0) {
            for(const rp of this.mWrite) {
                const rpKey = this.mTexKey + rp.mShader;
                this.mBruch.RemoveAutoRP(rpKey);
            }
            this.mWrite.length = 0;
        }
    }
}

export class CRefractor extends CBrushComp
{
    mSize : number = 512;
    mCycle : number = 0;

    constructor() {
        super("refractor_" + CUniqueID.Get());

        // 오브젝트용 RP
        {
            const rp = new CRPAuto(CFrame.Main().Pal().Sl3D().mKey);
            rp.mCopy = false;
            rp.mPriority = CRenderPass.ePriority.Normal - 2;
            rp.mRenderTarget = this.GetTex();
            rp.mCamera = this.mTexKey;
            rp.PushOr(new CCondition("class","==","CPaint3D"));
            rp.PushAnd(new CCondition("mTag[water]","==",false));
            this.PushRPAuto(rp);
        }

        // 스카이박스용 RP
        {
            const rp = new CRPAuto(CFrame.Main().Pal().SlCube().mKey);
            rp.mCopy = false;
            rp.mPriority=CRenderPass.ePriority.Normal - 1;
            rp.mCullFace=CRenderPass.eCull.CW;
            rp.mRenderTarget = this.GetTex();
            rp.mCamera = this.mTexKey;
            rp.PushOr(new CCondition("class","==","CPaintCube"));
            rp.PushAnd(new CCondition("mTag[water]","==",false));
            rp.PushAnd(new CCondition("mTag[sky]"));
            this.PushRPAuto(rp);

            rp.mClearColor = false;
            rp.mClearDepth = false;
        }
    }

    AddWaterDeep(_waterDeep : CVec3, _shallowColor : CVec3, _deepColor : CVec3)
    {
        const rp = this.mWrite[0];
        rp.mTag.add("waterRefract");
        rp.mShaderAttr.push(new CShaderAttr("waterDeep", _waterDeep));
        rp.mShaderAttr.push(new CShaderAttr("shallowColor", _shallowColor));
        rp.mShaderAttr.push(new CShaderAttr("deepColor", _deepColor));
    }
    AddCaustics(_flow : CVec2, _freq : CVec1, _caustic : string)
    {
        const rp = this.mWrite[0];
        rp.mTag.add("waterRefract");
        rp.mShaderAttr.push(new CShaderAttr("causticFlowDir", _flow));
        rp.mShaderAttr.push(new CShaderAttr("causticFlowFreq", _freq));
        rp.mShaderAttr.push(new CShaderAttr("causticMap", 5.0));
        this.SetCausticTexture(_caustic);
    }
    SetCausticTexture(_caustic : string)
    {
        const rp = this.mWrite[0];
        let shaderAttr = rp.mShaderAttr.find(attr => attr.mEach == 5.0);
        if(shaderAttr)
            shaderAttr.mKey = _caustic;
        else
            rp.mShaderAttr.push(new CShaderAttr(5.0, _caustic));
    }

    Update(_update: CUpdate): boolean|any {
        super.Update(_update);
        if(this.mBruch != null) this.UpdateBrush(_update);
    }

    UpdateBrush(_update : CUpdate) {
        const fw = this.GetOwner().GetFrame();

        // ---------------------------------------------------------
        // 1. 텍스처 생성
        // ---------------------------------------------------------
        let tex = fw.Res().Find(this.GetTex()) as CTexture;

        // 텍스쳐 없으면 생성
        if(!tex) {
            fw.Ren().BuildRenderTarget(
                [new CTextureInfo(CTexture.eTarget.Sigle, CTexture.eFormat.RGBA8, 1)],
                new CVec2(this.mSize, this.mSize), 
                this.GetTex()
            );
            tex = fw.Res().Find(this.GetTex()) as CTexture;
            tex.SetAutoResize(false);
        }

        // 사이즈 변경 시 재생성
        if(tex.GetWidth() != this.mSize) {
            tex.SetSize(this.mSize, this.mSize);
            fw.Ren().BuildTexture(tex);
        }

        // ---------------------------------------------------------
        // 2. 렌더 패스 설정
        // ---------------------------------------------------------
        for(const rp of this.mWrite) {
            const rpKey = this.mTexKey + rp.mShader;
            // 등록된 RP가 없다면 등록
            if(!this.mBruch.AutoRP().has(rpKey)) {
                this.mBruch.SetAutoRP(rpKey, rp);
            }
            // 사이클 변경 시 업데이트
            if(rp.mCycle != this.mCycle) {
                rp.mCycle = this.mCycle;
                this.mBruch.mAutoRPUpdate = CUpdate.eType.Updated;
            }
        }

        // ---------------------------------------------------------
        // 3. 가상 카메라 동기화
        // ---------------------------------------------------------
        const mainCam = this.mBruch.GetCam3D();
        const virtualCam = this.mBruch.GetCamera(this.mTexKey);
        if(virtualCam.Init(mainCam.GetEye(), mainCam.GetLook()))
        {
            virtualCam.SetFar(mainCam.GetFar());
            virtualCam.SetFov(mainCam.mFov);
            if(mainCam.mOrthographic)
                virtualCam.ResetOrthographic();
            else
                virtualCam.ResetPerspective();
        }
    }
    
    Destroy(): void {
        super.Destroy();

        if(this.mWrite.length > 0) {
            for(const rp of this.mWrite) {
                const rpKey = this.mTexKey + rp.mShader;
                this.mBruch.RemoveAutoRP(rpKey);
            }
            this.mWrite.length = 0;
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