import { CRPAuto } from "../../artgine/app/canvas/CRPMgr.js";
import { CBrushComp } from "../../artgine/app/component/CBrushComp.js";
import { CPaint } from "../../artgine/app/component/paint/CPaint.js";
import { CPaint2D } from "../../artgine/app/component/paint/CPaint2D.js";
import { CPaint3D } from "../../artgine/app/component/paint/CPaint3D.js";
import { CPaintTrail } from "../../artgine/app/component/paint/CPaintTrail.js";
import { CAlert } from "../../artgine/basic/CAlert.js";
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

    //CPaint3D.SetMesh가 텍스처 목록을 비우므로, 텍스처 방식 굴절은 키를 들고 있다가 다시 올린다
    mWaterTex : string = null;

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
            // reverse-z 이후 z파이팅이 크게 줄어서 크기를 매우 줄임
            // worldSize 50000, near 1, far 100000 기준을 메시 크기 1로 잡고 계산함
            const cam = renPt.mCam;
            const accuracy = (cam.mProjFar ?? 100000) / (cam.mProjNear ?? 1);
            const worldSizeX = Math.abs(this.GetSca().x);
            const worldSizeY = Math.abs(this.GetSca().y);
            const scaleX = CMath.Clamp(Math.floor(accuracy * worldSizeX / (50000*100000)), 1, 1000);
            const scaleY = CMath.Clamp(Math.floor(accuracy * worldSizeY / (50000*100000)), 1, 1000);
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
                if(this.mWaterTex != null)	this.mPaint.SetTexture([this.mWaterTex]);
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
            //셰이더가 uv를 time만큼 계속 밀어내므로 Clamp면 몇 초 만에 가장자리 텍셀만 찍힌다
            if(this.mPaint.mAutoLoad != null)	this.mPaint.mAutoLoad.mWrap = CTexture.eWrap.Repeat;
            this.mWaterTex = _texture;
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
    mSize : number = 256;
    //다시 그리는 주기(초, 밀리초 아님). 0이면 매 프레임
    mCycle : number = 0;

    constructor() {
        super("reflector_" + CUniqueID.Get());

        //메인 포워드 RP처럼 프로브 envmap으로 간접광을 받는다. 없으면 ambientColor 기본값(0.2)이 들어가 밤에도 반사 속 물체만 밝다.
        //CEnvMap은 첫 업데이트 때 있던 브러시 RP에만 env 태그를 달아서, 나중에 등록되는 이 RP는 직접 단다(프로브가 없으면 ambientColor로 돌아간다)
        // 오브젝트용 RP
        {
            const rp = new CRPAuto(CFrame.Main().Pal().Sl3D().mKey);
            rp.mCopy = false;
            rp.mPriority = CRenderPass.ePriority.Normal - 1;
            rp.mRenderTarget = this.GetTex();
            rp.mCamera = this.mTexKey;
            rp.PushOr(new CCondition("class","==","CPaint3D"));
            rp.PushAnd(new CCondition("mTag[water]","==",false));
            rp.mShaderAttr.push(new CShaderAttr(SDF.eTexSlot.ArrEnvmap, CFrame.Main().Pal().GetEnvMapTex()));
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
            rp.mShaderAttr.push(new CShaderAttr(SDF.eTexSlot.ArrEnvmap, CFrame.Main().Pal().GetEnvMapTex()));
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
                this.mBrush.PushAutoRP(rpKey, rp);
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
        //Updated 프레임에만 맞추면 그 프레임을 놓쳤을 때(로드 직후 등) 반사 카메라가 옛 상태로 남는다. Init이 같은 값이면 아무것도 안 하므로 매 프레임 맞춘다
        const mainCam = this.mBrush.GetCam3D();
        {
            const virtualCam = this.mBrush.GetCamera(this.mTexKey);

            const wMat = this.GetOwner().GetMat();
            const pos = wMat.xyz;
            const rot = CMath.QutToMat(CMath.MatDecomposeRot(wMat));
            const normal = new CVec3(0, 1, 0);//CMath.V3Nor(CMath.V3MulMatNormal(new CVec3(0, 1, 0), rot));
            const view = CMath.V3SubV3(pos, mainCam.GetEye());
            const realUp = CMath.V3Cross(mainCam.GetView(), mainCam.GetCross());

            const eye = CMath.V3AddV3(CMath.V3MulFloat(this.V3Reflect(view, normal), -1), pos);
            //eye+반사(view)처럼 1유닛 앞 점을 쓰면 좌표가 큰 맵에서 float32 간격에 반올림돼 시선이 계단식으로 끊긴다(천천히 돌리면 반사가 점프).
            //eye와 같은 방식으로 메인 카메라의 먼 시선점을 수면에 대칭시킨다
            const look = CMath.V3AddV3(CMath.V3MulFloat(this.V3Reflect(CMath.V3SubV3(pos, mainCam.GetLook()), normal), -1), pos);
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
    //다시 그리는 주기(초, 밀리초 아님). 0이면 매 프레임
    mCycle : number = 0;

    constructor() {
        super("refractor_" + CUniqueID.Get());

        //알파 채널에 수면 아래 깊이를 인코딩하므로 블렌딩을 끈다. 켜두면 색이 알파만큼 어두워지고 깊이값도 섞인다
        //envmap·env 태그는 CReflector3D와 같은 이유로 직접 단다
        // 오브젝트용 RP
        {
            const rp = new CRPAuto(CFrame.Main().Pal().Sl3D().mKey);
            rp.mCopy = false;
            rp.mAlpha = false;
            rp.mPriority = CRenderPass.ePriority.Normal - 1;
            rp.mRenderTarget = this.GetTex();
            rp.mCamera = this.mTexKey;
            rp.PushOr(new CCondition("class","==","CPaint3D"));
            rp.PushAnd(new CCondition("mTag[water]","==",false));
            rp.mShaderAttr.push(new CShaderAttr(SDF.eTexSlot.ArrEnvmap, CFrame.Main().Pal().GetEnvMapTex()));
            this.PushRPAuto(rp);
        }

        // 터레인 RP
        {
            const rp = new CRPAuto(CFrame.Main().Pal().SlTerrain().mKey);
            rp.mCopy = false;
            rp.mAlpha = false;
            rp.mPriority = CRenderPass.ePriority.Normal - 1;
            rp.mRenderTarget = this.GetTex();
            rp.mCamera = this.mTexKey;
            rp.PushOr(new CCondition("class","==","CPaintTerrain"));
            rp.PushAnd(new CCondition("mTag[water]","==",false));
            rp.mShaderAttr.push(new CShaderAttr(SDF.eTexSlot.ArrEnvmap, CFrame.Main().Pal().GetEnvMapTex()));
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
            rp.mTag.add("waterProcessing");
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
            rp.mTag.add("waterProcessing");
            rp.mShaderAttr.push(new CShaderAttr("causticFlowDir", _flow));
            rp.mShaderAttr.push(new CShaderAttr("causticFlowFreq", _freq));
        }
    }
    AddNormalFlow(_flow : CVec2)
    {
        for(let rp of this.mWriteRP) {
            rp.mTag.add("waterRefract");
            rp.mTag.add("waterProcessing");
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
                this.mBrush.PushAutoRP(rpKey, rp);
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
        //반사 카메라와 같은 이유로 매 프레임 맞춘다(Init이 같은 값이면 아무것도 안 함)
        const mainCam = this.mBrush.GetCam3D();
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
export class  CPaint2DWater extends CPaintTrail
{
    //윗변/아랫변 정점을 직접 지정한다. 좌표는 로컬 공간이라 SetPos/SetSca가 그대로 먹는다.
    //z는 좌표가 아니라 미러/깊이 기준선이다. 외곽을 타일 경계로 계단지게 만들 때
    //z에 매끄러운 수면선을 넣으면 단차에서 반사가 잘리지 않는다. 보통은 z=y로 둔다
    SetSurface(_up : Array<CVec3>, _down : Array<CVec3>)
    {
        if(_up.length < 2 || _up.length != _down.length)
        {
            CAlert.E("CPaint2DWater.SetSurface : up/down 길이가 같아야 하고 2개 이상이어야 함");
            return;
        }
        this.UpdateBuffer(_up, _down);
    }
    SetColor(_shallow : CVec3, _deep : CVec3, _tint : number = 0.35)
    {
        this.PushCShaderAttr(new CShaderAttr("shallowColor", _shallow));
        this.PushCShaderAttr(new CShaderAttr("deepColor", _deep));
        this.PushCShaderAttr(new CShaderAttr("waterTint", _tint));
    }
    SetTint(_val : number)
    {
        this.PushCShaderAttr(new CShaderAttr("waterTint", _val));
    }
    SetWobble(_val : number)
    {
        this.PushCShaderAttr(new CShaderAttr("wobble", _val));
    }
    SetReflectivity(_val : number)
    {
        this.PushCShaderAttr(new CShaderAttr("reflectivity", _val));
    }
    //1이면 1:1 미러, 낮출수록 반사가 눌려 가까운 것만 비친다
    SetReflectScale(_val : number)
    {
        this.PushCShaderAttr(new CShaderAttr("reflectScale", _val));
    }
    //_anchorY : 물에서 가장 높은 수면(로컬 좌표)
    //_blend : 0 = 전부 기준선 기준(기울어짐 없음), 1 = 그 열의 수면 기준(물가에 정렬)
    SetReflectAnchor(_anchorY : number, _blend : number)
    {
        this.PushCShaderAttr(new CShaderAttr("anchorY", _anchorY));
        this.PushCShaderAttr(new CShaderAttr("reflectAnchor", _blend));
    }
    SetReflectRange(_start : number, _end : number)
    {
        this.PushCShaderAttr(new CShaderAttr("reflectRange", new CVec2(_start, _end)));
    }
    SetTopSide(_top : boolean)
    {
        this.PushCShaderAttr(new CShaderAttr("waterTop", _top ? 1.0 : -1.0));
    }
}
export class CWater2D extends CSubject
{

    mPaint : CPaint2DWater;
    mReflector : CReflector2D;   // 반사 텍스쳐 굽는 컴포넌트. 공유받으면 null
    mShare : CWater2D = null;    // 반사 렌더타겟을 빌려주는 물
    //탑다운처럼 캐릭터가 물 위에 올라서는 씬은 Normal로 낮추고 z정렬에 맡긴다.
    //_share를 주면 반사 렌더타겟과 WaterCam을 공유한다. 구간별로 물을 쪼갤 때
    //각자 RT를 구우면 씬을 구간 수만큼 다시 그리게 되므로 반드시 공유해야 한다
    constructor(_priority : number = CRenderPass.ePriority.AlphaAuto, _share : CWater2D = null)
    {
        super();

        if(_share==null)
        {
            this.mReflector=new CReflector2D();
            this.PushComp(this.mReflector);
        }
        else this.mShare=_share;

        this.mPaint = new CPaint2DWater(this.Reflector().GetTex());
        //CPaintTrail 생성자가 붙이는 태그. 다른 trail용 RPAuto에 물이 걸려들지 않게 뗀다
        this.mPaint.RemoveTag("trail");
        //반사 렌더타겟을 굽는 RPAuto들이 Normal 버킷을 쓰므로, 같은 버킷이면 배경이 물 위에 덧칠된다
        const rp=new CRenderPass(gWaterShader,_priority);
        //CPaintTrail.UpdateBuffer가 바운드를 2배로 부풀린다. 원점에서 먼 곳에 놓인 물은
        //그 박스가 엉뚱한 자리로 늘어나 프러스텀 컬링에 걸려 통째로 사라진다
        rp.mCullFrustum=false;
        this.mPaint.PushRenderPass(rp);
        this.mPaint.PushTag("water");
        this.mPaint.PushTag("2D");
        this.PushComp(this.mPaint);

        //CPaintTrail은 월드 좌표를 전제해서 worldMat을 올려주지 않는다.
        //물은 로컬 좌표 + SetPos/SetSca를 쓰므로 FMat을 직접 물려준다
        this.mPaint.PushCShaderAttr(new CShaderAttr("worldMat", this.mPaint.GetFMat()));

        this.mPaint.SetColor(new CVec3(0.25, 0.45, 0.55), new CVec3(0.02, 0.12, 0.25), 0.35);
        this.mPaint.SetWobble(0.005);
        this.mPaint.SetReflectivity(1.0);
        this.mPaint.SetReflectRange(0.25, 0.85);

        //구간 분할 시 축은 오브젝트 원점(로컬 0) 하나로 고정한다
        this.mPaint.SetReflectAnchor(0.0, 1.0);

        //기본값은 유닛 사각형. SetSca/SetPos만으로 기존과 동일하게 동작한다
        this.SetRect();
    }
    //자기 반사기, 없으면 공유받은 쪽
    Reflector() : CReflector2D
    {
        return this.mReflector!=null ? this.mReflector : this.mShare.Reflector();
    }
    //윗변을 평평하게 둔 기본 사각형으로 되돌린다
    SetRect()
    {
        this.mPaint.SetSurface(
            [new CVec3(-0.5, 0.5, 0.5), new CVec3(0.5, 0.5, 0.5)],
            [new CVec3(-0.5,-0.5,-0.5), new CVec3(0.5,-0.5,-0.5)]);
    }
    SetSurface(_up : Array<CVec3>, _down : Array<CVec3>)
    {
        this.mPaint.SetSurface(_up, _down);
    }
    //윗변 높이만 배열로 준다. x는 -0.5~0.5 균등분할, 아랫변은 -0.5 고정
    SetSurfaceHeight(_height : Array<number>)
    {
        const up : Array<CVec3> = new Array();
        const down : Array<CVec3> = new Array();
        for(let i=0;i<_height.length;++i)
        {
            const x = -0.5 + i/(_height.length-1);
            up.push(new CVec3(x, _height[i], _height[i]));
            down.push(new CVec3(x, -0.5, -0.5));
        }
        this.mPaint.SetSurface(up, down);
    }
    SetColor(_shallow : CVec3, _deep : CVec3, _tint : number = 0.35)
    {
        this.mPaint.SetColor(_shallow, _deep, _tint);
    }
    SetTint(_val : number)
    {
        this.mPaint.SetTint(_val);
    }
    SetWobble(_val : number)
    {
        this.mPaint.SetWobble(_val);
    }
    SetReflectivity(_val : number)
    {
        this.mPaint.SetReflectivity(_val);
    }
    SetReflectScale(_val : number)
    {
        this.mPaint.SetReflectScale(_val);
    }
    SetReflectAnchor(_anchorY : number, _blend : number)
    {
        this.mPaint.SetReflectAnchor(_anchorY, _blend);
    }
    SetReflectRange(_start : number, _end : number)
    {
        this.mPaint.SetReflectRange(_start, _end);
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

        const refl=this.Reflector();
        if(this.mPaint.FindCShaderAttr("waterViewMat")==null && refl.mWaterCam!=null)
        {
            this.mPaint.PushCShaderAttr(new CShaderAttr("waterViewMat", refl.mWaterCam.GetViewMat()));
            this.mPaint.PushCShaderAttr(new CShaderAttr("waterProjectMat", refl.mWaterCam.GetProjMat()));
        }
    }
}
export class CReflector2D extends CBrushComp
{
    mSize : number = 512;
    //다시 그리는 주기(초, 밀리초 아님). 0이면 매 프레임
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
            //렌더타겟에 쓰는 패스는 물마다 타깃이 달라서 키가 인스턴스별로 고유해야 한다
            rp.SetKey("water2dCPaint2D_"+this.GetTex());
            this.PushRPAuto(rp);

            rp = new CRPAuto(CFrame.Main().Pal().Sl2D().mKey);
            rp.mCamera="WaterCam";
            rp.mPriority = CRenderPass.ePriority.Normal - 2;
            rp.mRenderTarget = this.GetTex();
            rp.PushOr(new CCondition("class","==","CPaintVoxel"));
            rp.PushAnd(new CCondition("mTag[water]","==",false));
            rp.mShader="Artgine/Voxel.sl";
            rp.SetKey("water2dCPaintVoxel_"+this.GetTex());
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
            rp.SetKey("rp2_"+this.GetTex());
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
                this.mBrush.PushAutoRP(rp.Key(), rp);
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