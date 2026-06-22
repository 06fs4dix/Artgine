import { CRPAuto } from "../../artgine/app/canvas/CRPMgr.js";
import { CBrushComp } from "../../artgine/app/component/CBrushComp.js";
import { CPaint } from "../../artgine/app/component/paint/CPaint.js";
import { CPaint2D } from "../../artgine/app/component/paint/CPaint2D.js";
import { CPaint3D } from "../../artgine/app/component/paint/CPaint3D.js";
import { CSubject } from "../../artgine/app/subject/CSubject.js";
import { CUpdate } from "../../artgine/basic/Basic.js";
import { CClass } from "../../artgine/basic/CClass.js";
import { CEvent } from "../../artgine/basic/CEvent.js";
import { CUniqueID } from "../../artgine/basic/CUniqueID.js";
import { CMath } from "../../artgine/geometry/CMath.js";
import { CVec1 } from "../../artgine/geometry/CVec1.js";
import { CVec2 } from "../../artgine/geometry/CVec2.js";
import { CVec3 } from "../../artgine/geometry/CVec3.js";
import { CVec4 } from "../../artgine/geometry/CVec4.js";
import { CCamera } from "../../artgine/render/CCamera.js";
import { CMeshCreateInfo } from "../../artgine/render/CMeshCreateInfo.js";
import { CRenderPass } from "../../artgine/render/CRenderPass.js";
import { CVertexFormat } from "../../artgine/render/CShader.js";
import { CShaderAttr } from "../../artgine/render/CShaderAttr.js";
import { CTexture, CTextureInfo } from "../../artgine/render/CTexture.js";
import { CUtilRender } from "../../artgine/render/CUtilRender.js";
import { CCondition } from "../../artgine/util/CCondition.js";
import { CFrame } from "../../artgine/util/CFrame.js";
import { CPlugin } from "../../artgine/util/CPlugin.js";
import { SDF } from "../../artgine/z_file/SDF.js";





let gWaterShader="";
CPlugin.PushEvent(CEvent.eType.Load,()=>{
    gWaterShader=CPlugin.FindPath("Water")+"WaterShader.ts";
    CFrame.Main().Load().Exe(gWaterShader);
});


export class CWater3D extends CSubject
{
    mPaint : CPaint3D;
    mReflector : CReflector3D;   // 반사 텍스쳐 굽는 컴포넌트
    mRefractor : CRefractor3D;   // 굴절 텍스쳐 굽는 컴포넌트

    // 물 높이
    mWaterHeight : CVec1 = new CVec1(1.0);

    // 물 색상
    mDeepColor : CVec3 = new CVec3(0.1,0.2,0.4);
    mShallowColor : CVec3 = new CVec3();
    mWaterDeep : CVec4 = new CVec4(10,255,30); // x : 물 높이, y : 물 속이 보이는 최대 깊이, z : 커품이 생기는 최대 깊이
    mWaterUnderFadeDist : CVec2 = new CVec2(0, 4000); // x : 물 속이 전부 보이는 최대 거리, y : 물 속이 전혀 보이지 않는 최소 거리

    // 코스틱
    mCausticFlowDir : CVec2 = new CVec2(0, 0);
    mCausticFlowFrequency : CVec1 = new CVec1(1);  // x : 코스틱 빈도([0, 1])

    // 노말 플로우
    mNormalFlowDir : CVec2 = new CVec2(0, 0);

    constructor() {
        super();

        this.mPaint = new CPaint3D(CFrame.Main().Pal().GetPlaneMesh());
        this.mPaint.PushRenderPass(new CRenderPass(gWaterShader));
        this.mPaint.PushTag("water");
        this.mPaint.PushTag("3D");
        this.mPaint.SetTexture([]);
        this.mPaint.PushCShaderAttr(new CShaderAttr("deepColor", this.mDeepColor));
        this.mPaint.PushCShaderAttr(new CShaderAttr("shallowColor", this.mShallowColor));
        this.mPaint.PushCShaderAttr(new CShaderAttr("waterDeep", this.mWaterDeep));
        this.mPaint.PushCShaderAttr(new CShaderAttr("waterHeight", this.mWaterHeight));
        this.mPaint.PushCShaderAttr(new CShaderAttr("waterUnderFadeDist", this.mWaterUnderFadeDist));
        this.mPaint.PushCShaderAttr(new CShaderAttr("normalflowDir", this.mNormalFlowDir));
        this.PushComp(this.mPaint);
        
    }

    GetPT() {
        return this.mPaint;
    }

    override Update(_update: CUpdate): void {
        super.Update(_update);

        // 물 깊이 자동 변경
        if(this.mUpdateMat == CUpdate.eType.Updated) {
            this.mWaterDeep.x = this.GetPos().y;
        }

        const renPt = this.mPaint.mRenPT[0];
        if(renPt != null)
        {
            // worldSize 5000, near 1, far 100000 기준을 메시 크기 1로 잡고 계산함
            const cam = renPt.mCam;
            const accuracy = (cam.mProjFar ?? 100000) / (cam.mProjNear ?? 1);
            const worldSizeX = Math.abs(this.GetSca().x);
            const worldSizeY = Math.abs(this.GetSca().y);
            const scaleX = CMath.Clamp(Math.floor(accuracy * worldSizeX / 500000000 * 10), 1, 1000);
            const scaleY = CMath.Clamp(Math.floor(accuracy * worldSizeY / 500000000 * 10), 1, 1000);
            const waterMeshKey = `waterMesh${scaleX}:${scaleY}`;
            if(this.GetFrame().Res().Find(waterMeshKey) == null)
            {
                const rVal = new CMeshCreateInfo();
                const size = CUtilRender.Mesh2DSize / 2.0;
                const nor = new CVec3(0, 0, 1);
                
                let dir = new CVec3(1 - CMath.Abs(nor.x), 1 - CMath.Abs(nor.y), 1 - CMath.Abs(nor.z));
                let mdir = CMath.V3MulFloat(dir, -1);
                let cro = CMath.V3Cross(nor, dir);
                let mcro = CMath.V3MulFloat(cro, -1);
        
                mdir = CMath.V3MulFloat(mdir, size);
                cro  = CMath.V3MulFloat(cro,  size);
                mcro = CMath.V3MulFloat(mcro, size);
                dir  = CMath.V3MulFloat(dir,  size);

                
                rVal.bound.InitBound(mdir,true);
                rVal.bound.InitBound(mcro,true);
                rVal.bound.InitBound(dir,true);
                rVal.bound.InitBound(cro,true);

                const GetUV = (x, y) => {
                    return new CVec2(x / scaleX, y / scaleY);
                };

                const GetPoint = (uv) => {
                    const left = CMath.V3Interpolate(mdir, cro, uv.y);
                    const right = CMath.V3Interpolate(mcro, dir, uv.y);
                    return CMath.V3Interpolate(left, right, uv.x);
                };

                const posb = rVal.Create(CVertexFormat.eIdentifier.Position);
                const uvb  = rVal.Create(CVertexFormat.eIdentifier.UV);
                const norb  = rVal.Create(CVertexFormat.eIdentifier.Normal);
                const inb = rVal.Create(CVertexFormat.eIdentifier.Index);

                let vIndex = 0;
                for(let y = 0; y < scaleY; y++)
                for(let x = 0; x < scaleX; x++)
                {
                    const uv0 = GetUV(x + 0, y + 0);
                    const uv1 = GetUV(x + 1, y + 0);
                    const uv2 = GetUV(x + 1, y + 1);
                    const uv3 = GetUV(x + 0, y + 1);

                    posb.bufF.Push(GetPoint(uv0));
                    posb.bufF.Push(GetPoint(uv1));
                    posb.bufF.Push(GetPoint(uv2));
                    posb.bufF.Push(GetPoint(uv3));

                    uvb.bufF.Push(uv0);
                    uvb.bufF.Push(uv1);
                    uvb.bufF.Push(uv2);
                    uvb.bufF.Push(uv3);

                    norb.bufF.Push(nor);
                    norb.bufF.Push(nor);
                    norb.bufF.Push(nor);
                    norb.bufF.Push(nor);

                    inb.bufI.push(vIndex + 0);
                    inb.bufI.push(vIndex + 1);
                    inb.bufI.push(vIndex + 2);
                    inb.bufI.push(vIndex + 2);
                    inb.bufI.push(vIndex + 3);
                    inb.bufI.push(vIndex + 0);

                    vIndex += 4;
                }

                rVal.vertexCount = posb.bufF.Size(3);
                rVal.indexCount = inb.bufI.length;

                const mesh = CUtilRender.CMeshCreateInfoToCMesh(rVal, this.GetFrame().Pal().GetBlackTex());
                this.GetFrame().Res().Push(waterMeshKey, mesh);
                CUtilRender.MeshBoundUpdate(mesh);
            }
            if(this.mPaint.GetMesh() != waterMeshKey) 
            {
                this.mPaint.SetMesh(waterMeshKey);
            }
        }
    }

    Light() {
        this.mPaint.PushTag(CPaint.eTag.Light);
        this.mPaint.PushCShaderAttr(new CShaderAttr("ligStep0", SDF.eLightStep0.HafeLambert));
        this.mPaint.PushCShaderAttr(new CShaderAttr("ligStep1", SDF.eLightStep1.BlinnPhong));
    }

    Shadow(_shadowReadTex : string) {
        this.mPaint.PushTag(CPaint.eTag.Shadow);
        this.mPaint.PushTag(CPaint.eTag.ShadowReadOnly);
        this.mPaint.PushCShaderAttr(new CShaderAttr(SDF.eTexSlot.SingleShadowRead, _shadowReadTex));
        this.mPaint.PushCShaderAttr(new CShaderAttr("shadowOn",new CVec1(1)));
    }

    SetWaterDeep(_deepHeight : number,_nearDistance : number, _farDistance : number, _deepColor : CVec3, _shallowColor : CVec3) {
        if(_deepHeight!=null) this.mWaterDeep.y = _deepHeight;
        if(_nearDistance!=null) this.mWaterUnderFadeDist.x = _nearDistance;
        if(_farDistance!=null) this.mWaterUnderFadeDist.y = _farDistance;
        if(_deepColor!=null)    this.mDeepColor.Import(_deepColor);
        if(_shallowColor!=null)    this.mShallowColor.Import(_shallowColor);
    }

    NormalFlow(_flow : CVec2) {        
        this.mNormalFlowDir.Import(_flow);
    }

    AddRefractor(_texture : string = undefined, _flow : CVec2 = new CVec2(0, 0)) {
        // reflector 사용
        if(_texture == undefined) {
            if(this.mRefractor != null) return;

            this.mRefractor = new CRefractor3D();
            this.PushComp(this.mRefractor);

            // shaderAttr 포인터로 생성
            this.mRefractor.AddCaustics(this.mCausticFlowDir, this.mCausticFlowFrequency);
            this.mRefractor.AddNormalFlow(this.mNormalFlowDir);
            this.mRefractor.AddWaterDeep(this.mWaterDeep, this.mWaterUnderFadeDist, this.mShallowColor, this.mDeepColor, this.mWaterHeight);

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

    AddCaustics(_flow : CVec2 = new CVec2(0, 0), _frequency : number = 1.0) {
        this.mCausticFlowDir.Import(_flow);
        this.mCausticFlowFrequency.x = _frequency;

        if(this.mRefractor == null) {
            this.AddRefractor();
        }
    }

    AddReflector(_texture : string = undefined) {
        // reflector 사용
        if(_texture == undefined) {
            if(this.mReflector != null) return;

            this.mReflector = new CReflector3D();
            this.PushComp(this.mReflector);

            this.mReflector.AddWaterDeep(this.mWaterDeep);

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

    
}

export class CReflector3D extends CBrushComp
{
    mSize : number = 512;
    mCycle : number = 0;

    constructor() {
        super("reflector_" + CUniqueID.Get());

        // 오브젝트용 RP
        {
            const rp = new CRPAuto(CFrame.Main().Pal().Sl3D().mKey);
            rp.mCopy = false;
            rp.mPriority = CRenderPass.ePriority.Normal - 1;
            rp.mRenderTarget = this.GetTex();
            rp.mCamera = this.mTexKey;
            rp.PushOr(new CCondition("class","==","CPaint3D"));
            rp.PushAnd(new CCondition("mTag[water]","==",false));
            this.PushRPAuto(rp);
        }

        // 터레인 RP
        {
            const rp = new CRPAuto(CFrame.Main().Pal().SlTerrain().mKey);
            rp.mCopy = false;
            rp.mPriority = CRenderPass.ePriority.Normal - 1;
            rp.mRenderTarget = this.GetTex();
            rp.mCamera = this.mTexKey;
            rp.PushOr(new CCondition("class","==","CPaintTerrain"));
            rp.PushAnd(new CCondition("mTag[water]","==",false));
            this.PushRPAuto(rp);
        }

        // 스카이박스용 RP
        {
            const rp = new CRPAuto(CFrame.Main().Pal().SlCube().mKey);
            rp.mCopy = false;
            rp.mPriority=CRenderPass.ePriority.Normal - 1;
            rp.mRenderTarget = this.GetTex();
            rp.mCamera = this.mTexKey;
            rp.mCullFace=CRenderPass.eCull.None;
            rp.mCullFrustum=false;
            rp.PushOr(new CCondition("class","==","CPaintCube"));
            rp.PushAnd(new CCondition("mTag[water]","==",false));
            rp.PushAnd(new CCondition("mTag[sky]"));
            this.PushRPAuto(rp);
        }
    }

    AddWaterDeep(_waterDeep : CVec4)
    {
        for(let rp of this.mWriteRP) {
            rp.mTag.add("waterReflect");
            rp.mShaderAttr.push(new CShaderAttr("waterDeep", _waterDeep));
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

    override Update(_update: CUpdate): boolean|any {
        super.Update(_update);
        if(this.mBrush != null) this.UpdateBrush(_update);
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
            tex.SetFilter(CTexture.eFilter.Linear);
            tex.SetMipMap(CTexture.eMipmap.GL);
        }

        // 사이즈 변경 시 재생성
        const expectedSize = Math.trunc(this.mSize * fw.PF().mRTScaleW);
        if(tex.GetWidth() != expectedSize) {
            fw.Ren().BuildRenderTarget(
                [new CTextureInfo(CTexture.eTarget.Sigle, CTexture.eFormat.RGBA8, 1)],
                new CVec2(this.mSize, this.mSize),
                this.GetTex()
            );
        }

        // ---------------------------------------------------------
        // 2. 렌더 패스 설정
        // ---------------------------------------------------------
        for(const rp of this.mWriteRP) {
            const rpKey = this.mTexKey + rp.mShader;
            // 등록된 RP가 없다면 등록
            if(!this.mBrush.AutoRP().has(rpKey)) {
                this.mBrush.SetAutoRP(rpKey, rp);
            }
            // 사이클 변경 시 업데이트
            if(rp.mCycle != this.mCycle) {
                rp.mCycle = this.mCycle;
                this.mBrush.mAutoRPUpdate = CUpdate.eType.Updated;
            }
        }

        // ---------------------------------------------------------
        // 3. 가상 카메라 동기화
        // ---------------------------------------------------------
        const mainCam = this.mBrush.GetCam3D();
        if(mainCam.mUpdateMat == CUpdate.eType.Updated) {
            const virtualCam = this.mBrush.GetCamera(this.mTexKey);

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
    }

    override Destroy(): void {
        super.Destroy();

        if(this.mWriteRP.length > 0) {
            for(const rp of this.mWriteRP) {
                const rpKey = this.mTexKey + rp.mShader;
                this.mBrush.RemoveAutoRP(rpKey);
            }
            this.mWriteRP.length = 0;
        }
    }
}

export class CRefractor3D extends CBrushComp
{
    mSize : number = 512;
    mCycle : number = 0;

    constructor() {
        super("refractor_" + CUniqueID.Get());

        // 오브젝트용 RP
        {
            const rp = new CRPAuto(CFrame.Main().Pal().Sl3D().mKey);
            rp.mCopy = false;
            rp.mPriority = CRenderPass.ePriority.Normal - 1;
            rp.mRenderTarget = this.GetTex();
            rp.mCamera = this.mTexKey;
            rp.PushOr(new CCondition("class","==","CPaint3D"));
            rp.PushAnd(new CCondition("mTag[water]","==",false));
            this.PushRPAuto(rp);
        }

        // 터레인 RP
        {
            const rp = new CRPAuto(CFrame.Main().Pal().SlTerrain().mKey);
            rp.mCopy = false;
            rp.mPriority = CRenderPass.ePriority.Normal - 1;
            rp.mRenderTarget = this.GetTex();
            rp.mCamera = this.mTexKey;
            rp.PushOr(new CCondition("class","==","CPaintTerrain"));
            rp.PushAnd(new CCondition("mTag[water]","==",false));
            this.PushRPAuto(rp);
        }

        // 스카이박스용 RP
        // {
        //     const rp = new CRPAuto(CFrame.Main().Pal().SlCube().mKey);
        //     rp.mCopy = false;
        //     rp.mPriority=CRenderPass.ePriority.Normal - 1;
        //     rp.mRenderTarget = this.GetTex();
        //     rp.mCamera = this.mTexKey;
        //     rp.mCullFace=CRenderPass.eCull.CW;
        //     rp.mCullFrustum=false;
        //     rp.PushOr(new CCondition("class","==","CPaintCube"));
        //     rp.PushAnd(new CCondition("mTag[water]","==",false));
        //     rp.PushAnd(new CCondition("mTag[sky]"));
        //     this.PushRPAuto(rp);
        // }
    }

    AddWaterDeep(_waterDeep : CVec4, _waterDist : CVec2, _shallowColor : CVec3, _deepColor : CVec3, _waterHeight : CVec1)
    {
        for(let rp of this.mWriteRP) {
            rp.mTag.add("waterRefract");
            rp.mShaderAttr.push(new CShaderAttr("waterDeep", _waterDeep));
            rp.mShaderAttr.push(new CShaderAttr("waterUnderFadeDist", _waterDist));
            rp.mShaderAttr.push(new CShaderAttr("shallowColor", _shallowColor));
            rp.mShaderAttr.push(new CShaderAttr("deepColor", _deepColor));
            rp.mShaderAttr.push(new CShaderAttr("waterHeight", _waterHeight));
        }
    }
    AddCaustics(_flow : CVec2, _freq : CVec1)
    {
        for(let rp of this.mWriteRP) {
            rp.mTag.add("waterRefract");
            rp.mShaderAttr.push(new CShaderAttr("causticFlowDir", _flow));
            rp.mShaderAttr.push(new CShaderAttr("causticFlowFreq", _freq));
        }
    }
    AddNormalFlow(_flow : CVec2)
    {
        for(let rp of this.mWriteRP) {
            rp.mTag.add("waterRefract");
            rp.mShaderAttr.push(new CShaderAttr("normalflowDir", _flow));
        }
    }

    override Update(_update: CUpdate): boolean|any {
        super.Update(_update);
        if(this.mBrush != null) this.UpdateBrush(_update);
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
            tex.SetFilter(CTexture.eFilter.Linear);
            tex.SetMipMap(CTexture.eMipmap.GL);
        }

        // 사이즈 변경 시 재생성
        const expectedSize = Math.trunc(this.mSize * fw.PF().mRTScaleW);
        if(tex.GetWidth() != expectedSize) {
            fw.Ren().BuildRenderTarget(
                [new CTextureInfo(CTexture.eTarget.Sigle, CTexture.eFormat.RGBA8, 1)],
                new CVec2(this.mSize, this.mSize),
                this.GetTex()
            );
        }

        // ---------------------------------------------------------
        // 2. 렌더 패스 설정
        // ---------------------------------------------------------
        for(const rp of this.mWriteRP) {
            const rpKey = this.mTexKey + rp.mShader;
            // 등록된 RP가 없다면 등록
            if(!this.mBrush.AutoRP().has(rpKey)) {
                this.mBrush.SetAutoRP(rpKey, rp);
            }
            // 사이클 변경 시 업데이트
            if(rp.mCycle != this.mCycle) {
                rp.mCycle = this.mCycle;
                this.mBrush.mAutoRPUpdate = CUpdate.eType.Updated;
            }
        }

        // ---------------------------------------------------------
        // 3. 가상 카메라 동기화
        // ---------------------------------------------------------
        const mainCam = this.mBrush.GetCam3D();
        if(mainCam.mUpdateMat == CUpdate.eType.Updated) 
        {
            const virtualCam = this.mBrush.GetCamera(this.mTexKey);
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
    }
    
    override Destroy(): void {
        super.Destroy();

        if(this.mWriteRP.length > 0) {
            for(const rp of this.mWriteRP) {
                const rpKey = this.mTexKey + rp.mShader;
                this.mBrush.RemoveAutoRP(rpKey);
            }
            this.mWriteRP.length = 0;
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
export class  CPaint2DWater extends CPaint2D
{

}
export class CWater2D extends CSubject
{

    mPaint : CPaint2DWater;
    mReflector : CReflector2D;   // 반사 텍스쳐 굽는 컴포넌트
    constructor()
    {
        super();
        


        this.mReflector=new CReflector2D();
        this.PushComp(this.mReflector);


        //this.mPaint = new CPaint2D(CFrame.Main().Pal().GetBlackTex());
        this.mPaint = new CPaint2DWater(this.mReflector.GetTex(),new CVec2(1,1));
        this.mPaint.PushRenderPass(new CRenderPass(gWaterShader));
        this.mPaint.PushTag("water");
        this.mPaint.PushTag("2D");
        this.PushComp(this.mPaint);

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
    override Update(_update: CUpdate): void {
        super.Update(_update);

        if(this.mPaint.FindCShaderAttr("waterViewMat")==null && this.mReflector.mWaterCam!=null)
        {
            this.mPaint.PushCShaderAttr(new CShaderAttr("waterViewMat", this.mReflector.mWaterCam.GetViewMat()));
            this.mPaint.PushCShaderAttr(new CShaderAttr("waterProjectMat", this.mReflector.mWaterCam.GetProjMat()));
        }
        
    }
}
export class CReflector2D extends CBrushComp
{
    mSize : number = 512;
    mCycle : number = 0;
    mWaterCam : CCamera;

    constructor() {
        super("reflector_" + CUniqueID.Get());

        // 오브젝트용 RP
        {
            let rp = new CRPAuto(CFrame.Main().Pal().Sl2D().mKey);
            rp.mCamera="WaterCam";
            rp.mPriority = CRenderPass.ePriority.Normal - 2;
            rp.mRenderTarget = this.GetTex();
            rp.PushOr(new CCondition("class","==","CPaint2D"));
            rp.PushAnd(new CCondition("mTag[water]","==",false));
            rp.SetKey("water2dCPaint2D");
            this.PushRPAuto(rp);

            rp = new CRPAuto(CFrame.Main().Pal().Sl2D().mKey);
            rp.mCamera="WaterCam";
            rp.mPriority = CRenderPass.ePriority.Normal - 2;
            rp.mRenderTarget = this.GetTex();
            rp.PushOr(new CCondition("class","==","CPaintVoxel"));
            rp.PushAnd(new CCondition("mTag[water]","==",false));
            rp.mShader="Artgine/Voxel.sl";
            rp.SetKey("water2dCPaintVoxel");
            this.PushRPAuto(rp);

            rp = new CRPAuto(CFrame.Main().Pal().Sl2D().mKey);
            rp.mPriority = CRenderPass.ePriority.Normal;
            //rp.mCopy = false;
            //rp.mCamera="WaterCam";
            rp.SetKey("rp1");
            rp.PushOr(new CCondition("class","==","CPaint2D"));
            //rp.PushOr(new CCondition("class","==","CPaintVoxel"));
            //rp.PushOr(new CCondition("class","==","CShadowPlane"));
            rp.PushAnd(new CCondition("mTag[water]","==",false));
            this.PushRPAuto(rp);

            rp = new CRPAuto(CFrame.Main().Pal().Sl2D().mKey);
            //rp.mCopy = false;
            rp.mCamera="WaterCam";
            // rp.mShaderAttr.push(new CShaderAttr("waterViewMat", new CMat()));
            // rp.mShaderAttr.push(new CShaderAttr("waterProjectMat", new CMat()));
            rp.mPriority = CRenderPass.ePriority.Normal - 1;
            rp.mRenderTarget = this.GetTex();
            //rp.mSortRevers=true;
            rp.mCullFace = CRenderPass.eCull.None;
            //rp.PushOr(new CCondition("class","==","CPaint2D"));
            rp.PushOr(new CCondition("class","==","CShadowPlane"));
            rp.PushAnd(new CCondition("mTag[water]","==",false));
            rp.SetKey("rp2");
            this.PushRPAuto(rp);

            //rp.mSort=CRenderPass.eSort.ReversAlphaGroup;
            
            

            rp = new CRPAuto(CFrame.Main().Pal().Sl2D().mKey);
            rp.mPriority = CRenderPass.ePriority.AlphaAuto;
            //rp.mCopy = false;
            //rp.mCamera="WaterCam";
            rp.SetKey("rp3");
            //rp.mSortRevers=true;
            rp.mCullFace = CRenderPass.eCull.None;
            //rp.PushOr(new CCondition("class","==","CPaint2D"));
            rp.PushOr(new CCondition("class","==","CShadowPlane"));
            rp.PushAnd(new CCondition("mTag[water]","==",false));
            this.PushRPAuto(rp);
        }
    }
    override Update(_update: CUpdate): boolean|any {
        super.Update(_update);
        if(this.mBrush != null) this.UpdateBrush(_update);
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
                null, 
                this.GetTex()
            );
            tex = fw.Res().Find(this.GetTex()) as CTexture;
            //tex.SetAutoResize(true);
        }
        // // 사이즈 변경 시 재생성
        // if(tex.GetWidth() != this.mSize) {
        //     tex.SetSize(this.mSize, this.mSize);
        //     fw.Ren().BuildTexture(tex);
        // }
      
    
        const mainCam = this.mBrush.GetCam2D();
        this.mWaterCam = this.mBrush.GetCamera("WaterCam");
        if(this.mWaterCam.Init(mainCam.GetEye(), mainCam.GetLook()))
        {
            this.mWaterCam.SetFar(mainCam.GetFar());
            this.mWaterCam.SetFov(mainCam.mFov);
            //this.mWaterCam.SetSize(1920,1017);
            //virtualCam.SetViewPort(mainCam.GetViewPort());
            this.mWaterCam.Set2DZoom(2.0*mainCam.GetZoom());
           
            this.mWaterCam.ResetOrthographic();
           
        }

        for(const rp of this.mWriteRP) {
            
            // if(rp.mShaderAttr.length>0)
            // {
            //     rp.mShaderAttr[0].mData=mainCam.GetViewMat();
            //     rp.mShaderAttr[1].mData=mainCam.GetProjMat();
            // }
            
            // 등록된 RP가 없다면 등록
            if(!this.mBrush.AutoRP().has(rp.Key())) {
                this.mBrush.SetAutoRP(rp.Key(), rp);
            }
            // // 사이클 변경 시 업데이트
            // if(rp.mCycle != this.mCycle) {
            //     rp.mCycle = this.mCycle;
            //     this.mBruch.mAutoRPUpdate = CUpdate.eType.Updated;
            // }
        }


    }

    override Destroy(): void {
        super.Destroy();

        if(this.mWriteRP.length > 0) {
            for(const rp of this.mWriteRP) {
                this.mBrush.RemoveAutoRP(rp.Key());
            }
            this.mWriteRP.length = 0;
            this.mBrush.ClearRen();
        }
    }
}

CClass.Push(CWater3D);
CClass.Push(CWater2D);