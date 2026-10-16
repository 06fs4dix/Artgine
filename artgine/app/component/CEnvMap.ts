import { CUpdate } from "../../basic/Basic.js";
import { CUniqueID } from "../../basic/CUniqueID.js";
import {CMath} from "../../geometry/CMath.js";
import {CVec2} from "../../geometry/CVec2.js";
import {CVec3} from "../../geometry/CVec3.js";
import {CRenderPass} from "../../render/CRenderPass.js";
import {CTexture,  CTextureInfo } from "../../render/CTexture.js";
import { CCondition } from "../../util/CCondition.js";
import { CFrame } from "../../util/CFrame.js";
import { CRPAuto } from "../canvas/CRPMgr.js";
import {CBrushComp} from "./CBrushComp.js";
import { CPlugin } from "../../util/CPlugin.js";
import { CShaderAttr } from "../../render/CShaderAttr.js";
import { SDF } from "../../z_file/SDF.js";

export default class CEnvMap extends CBrushComp
{
    //구 반사 반지름(월드 단위). 반사 방향을 이 구에 투영한다. 0이면 무한거리
    mRadius : number = 0;
    mSize : number = 128;
    mCycle : number = 100000;

    constructor() {
        super("envMap_" + CUniqueID.Get());
        this.mReadTag = this.mTexKey;
    }

    override Update(_update: CUpdate): boolean|any {
        super.Update(_update);
        if(this.mBrush != null) this.UpdateBrush(_update);
    }

    override GetTex()    {   return this.GetOwner().GetFrame().Pal().GetEnvMapTex();   }

    UpdateBrush(_update : CUpdate) {
        // 1. 기본 envmap RenderPass 등록
        if(this.mWriteRP.length == 0)
        {
            let pal=this.mBrush.mFrame.Pal();

            const rp2D=this.PushRPAuto(new CRPAuto(pal.Sl2DKey()));
            rp2D.mCopy=false;
			rp2D.SetKey("Forward_2D");
			rp2D.mCullFace=CRenderPass.eCull.None;
			rp2D.PushOr([
				new CCondition("class","==","CPaint2D","Paint_OR_Group"), 
				new CCondition("class","==","CPaintHTML","Paint_OR_Group"), 
				new CCondition("class","==","CPaint2DMerge","Paint_OR_Group"),
				new CCondition("class","==","CPaintTrail","Paint_OR_Group")
			]);
            rp2D.mPriority = CRenderPass.ePriority.BackGround + 1;

            const rpCube = this.PushRPAuto(new CRPAuto(CFrame.Main().Pal().SlCube().mKey));
            rpCube.mCopy=false;
            rpCube.mCullFace=CRenderPass.eCull.None;
            rpCube.mCullFrustum=false;
            rpCube.PushOr([
                new CCondition("class","==","CPaintCube","Paint_OR_Group")
            ]);
            rpCube.mPriority = CRenderPass.ePriority.BackGround + 1;

            const rp3D = this.PushRPAuto(new CRPAuto(pal.Sl3DKey()));
            rp3D.mCopy=false;
            rp3D.PushOr([
				new CCondition("class","==","CPaint3D","Paint_OR_Group"),
				new CCondition("class","==","CPaint3DMerge","Paint_OR_Group")
			]);
            rp3D.PushAnd(new CCondition("mTag[water]","==",false));
            rp3D.mPriority = CRenderPass.ePriority.BackGround + 1;
            
            const rpTerrain=this.PushRPAuto(new CRPAuto(pal.SlTerrainKey()));
            rpTerrain.mCopy=false;
            rpTerrain.PushOr([
				new CCondition("class","==","CPaintTerrain","Paint_OR_Group")
			]);
            rpTerrain.mPriority = CRenderPass.ePriority.BackGround + 1;
            
            // 물 있으면 반사되도록, 그런데 reflec/refraction 들어가있으면 결과 이상하게 나옴. 하지만 블러하기 때문에 비슷하게 보임
            if(CPlugin.FindPath("Water"))
            {
                const rpWater=this.PushRPAuto(new CRPAuto(CPlugin.FindPath("Water")+"WaterShader.ts"));
                rpWater.mCopy=false;
                rpWater.PushOr([
                    new CCondition("class","==","CPaint3D","Paint_OR_Group")
                ]);
                rpWater.PushAnd(new CCondition("mTag[water]"));
                rpWater.mPriority = CRenderPass.ePriority.BackGround + 1;
            }
        }

        this.UpdateEnvmap(_update);
    }

    protected UpdateEnvmap(_update : CUpdate)
    {
        let envmapTex = this.mBrush.mFrame.Res().Find(this.GetTex()) as CTexture;

        // envmap이 들어가서 루프되지 않도록 최소사이즈의 temp텍스쳐 넣어줌
        if(this.mBrush.mFrame.Res().Find("NoneEnv.tex") == null)
        {
            this.mBrush.mFrame.Ren().BuildRenderTarget([new CTextureInfo(CTexture.eTarget.Array,CTexture.eFormat.RGBA8,1)],new CVec2(2, 2), "NoneEnv.tex");
            (this.mBrush.mFrame.Res().Find("NoneEnv.tex") as CTexture).SetAutoResize(false);
        }

        // -----------------------------------------------
        // 1. RP 세팅
        // -----------------------------------------------
        this.mTexOff =this.mBrush.mEnvmapTexOff;
        for(let i = 0; i < 6; i++)
        {
            for(const rp of this.mWriteRP)
            {
                const srpKey = this.mTexKey + rp.Key() + i;
                let srp: CRPAuto = this.mBrush.FindAutoRP(srpKey);
                if (srp == null) {
                    srp = this.mBrush.PushAutoRP(srpKey, rp.Export());
                    srp.mPriority += i + this.mBrush.mEnvmapTexOff;
                    srp.PushOr(new CCondition("GetTagKey().indexOf(envMap_)","==",-1,"envmapChk"));
                    srp.PushOr(new CCondition(`mTag[${this.mReadTag}]`,"envmapChk"));
                    srp.mRenderTarget = this.GetTex();
                    srp.mCamera = this.mTexKey + i;
                    srp.mShaderAttr.push(new CShaderAttr(SDF.eTexSlot.ArrEnvmap, "NoneEnv.tex"));
                    srp.Reset();
                }
                if(srp.mOr[srp.mOr.length - 1].mState != `mTag[${this.mReadTag}]`) {
                    this.mBrush.ClearRen(); // clearRen 대신 이 RP의 ren정보만 날려야 함, 하지만 일단 임시로 이렇게 둠
                }
                if(srp.mRenderTargetUse.has(this.mBrush.mEnvmapTexOff + i) == false || srp.mCycle != this.mCycle) {
                    srp.mRenderTargetUse = new Set<number>([this.mBrush.mEnvmapTexOff + i]);
                    srp.mCycle = this.mCycle;
                    this.UpdateThisEnvMap(i);
                }
            }
        }

        // -----------------------------------------------
        // 2. 카메라
        // -----------------------------------------------
        if(this.mBrush.mCameraMap.has(this.mTexKey+0) == false || this.GetOwner().mUpdateMat != 0)
        {
            const seye = this.GetOwner().GetMat().xyz;
            const cubeDir = [
                new CVec3(1, 0, 0), new CVec3(-1, 0, 0), new CVec3(0, 1, 0),
                new CVec3(0, -1, 0), new CVec3(0, 0, 1), new CVec3(0, 0, -1)
            ];
            const cubeUp = [
                new CVec3(0, 1, 0), new CVec3(0, 1, 0), new CVec3(0, 0, 1),
                new CVec3(0, 0, -1), new CVec3(0, 1, 0), new CVec3(0, 1, 0)
            ];
            const far = this.mRadius == 0 ? 100000 : this.mRadius;

            for(let i = 0; i < 6; i++) {
                const virtualCam = this.mBrush.GetCamera(this.mTexKey+i);

                const slook = CMath.V3AddV3(seye, cubeDir[i]);
                if(virtualCam.Init(seye, slook, cubeUp[i]) || far != virtualCam.GetFar())
                {
                    //가장자리 텍셀 중심이 큐브 모서리에 오도록 90도보다 살짝 넓힌다(Sam2DArrToCubeColor의 uv 축소와 짝)
                    virtualCam.SetFov(2 * Math.atan(this.mSize / (this.mSize - 1)));
                    virtualCam.SetFar(far); // 프러스텀 컬링을 위해서 추가
                    virtualCam.mWidth=this.mSize;
                    virtualCam.mHeight=this.mSize;
                    virtualCam.SetSize(this.mSize, this.mSize);
                    virtualCam.ResetPerspective();
                    this.UpdateThisEnvMap(i);
                    this.mBrush.mUpdateEnv = CUpdate.eType.Updated;
                }
            }
        }

        // -----------------------------------------------
        // 3. 브러시 envmap 버퍼 입력. 셰이더가 픽셀마다 가장 가까운 하나를 고르고, 레이어는 인덱스*6이다(Light.ts)
        // -----------------------------------------------
        this.mBrush.mEnvmapPos[this.mBrush.mEnvmapCount * 4 + 0] = this.GetOwner().GetMat().F32A()[12];
        this.mBrush.mEnvmapPos[this.mBrush.mEnvmapCount * 4 + 1] = this.GetOwner().GetMat().F32A()[13];
        this.mBrush.mEnvmapPos[this.mBrush.mEnvmapCount * 4 + 2] = this.GetOwner().GetMat().F32A()[14];
        this.mBrush.mEnvmapPos[this.mBrush.mEnvmapCount * 4 + 3] = this.mRadius;
        this.mBrush.mUpdateEnv = CUpdate.eType.Updated;

        this.mBrush.mEnvmapTexOff += 6;
        this.mBrush.mEnvmapCount++;

        // -----------------------------------------------
        // 4. 랜더타겟 크기 검사. 새로 만들면 기존 내용이 사라지므로 mUpdateEnv로 전체 envmap을 다시 그린다(CBrush.Update)
        // -----------------------------------------------
        if(envmapTex.GetInfo()[0].mCount < this.mBrush.mEnvmapTexOff) {
            this.mBrush.mFrame.Ren().BuildRenderTarget(
                [new CTextureInfo(CTexture.eTarget.Array, CTexture.eFormat.RGBA8, this.mBrush.mEnvmapTexOff)],
                new CVec2(envmapTex.GetWidth(), envmapTex.GetHeight()),
                this.GetOwner().GetFrame().Pal().GetEnvMapTex()
            );
            this.UpdateAllEnvMap();
        }
    }

    UpdateAllEnvMap() {
        if(this.mBrush == null) return;
        for(const ri of this.mBrush.mRenInfoMap.values()) {
            if(ri.mRP != null && ri.mRP.mRenderTarget==this.GetTex())
                ri.mSleepReset=true;
        }
    }

    UpdateThisEnvMap(_faceIdx : number = -1) {
        if(this.mBrush == null) return;
        for(const rp of this.mWriteRP) {
            const srpKey = this.mTexKey + rp.Key() + _faceIdx;
            const srp: CRPAuto = this.mBrush.FindAutoRP(srpKey);
            if(srp == null) continue;
            for(const ri of this.mBrush.mRenInfoMap.values()) {
                if(ri.mRP != null && ri.mRP.Key() == srp.Key() && ri.mRP.mRenderTarget==this.GetTex()) {
                    ri.mSleepReset=true;
                    break;
                }
            }
        }
    }

    Refresh() {
        if(this.mBrush!=null && this.mTexKey!=null)
        {
            for(let i=0;i<6;i++)
            {
                this.mBrush.mCameraMap.delete(this.mTexKey+i);
                for(let rp of this.mWriteRP)
                {
                    this.mBrush.RemoveAutoRP(this.mTexKey+rp.mShader+i);
                }
            }
        }
    }

    override SetEnable(_val: boolean): void {
        if(this.mEnable != _val && this.mBrush != null)
            this.mBrush.mUpdateEnv = CUpdate.eType.Updated;
        super.SetEnable(_val);
    }

    override Destroy(): void {
        if(this.mBrush != null)
            this.mBrush.mUpdateEnv = CUpdate.eType.Updated;
        super.Destroy();
        this.Refresh();
    }
}