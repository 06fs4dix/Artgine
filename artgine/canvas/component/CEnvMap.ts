import { CUpdate } from "../../basic/Basic.js";
import { CUniqueID } from "../../basic/CUniqueID.js";
import {CMath} from "../../geometry/CMath.js";
import {CVec2} from "../../geometry/CVec2.js";
import {CVec3} from "../../geometry/CVec3.js";
import {CRenderPass} from "../../render/CRenderPass.js";

import {CTexture,  CTextureInfo } from "../../render/CTexture.js";
import { CFrame } from "../../util/CFrame.js";
import { CCondition } from "../../util/CStateMachine.js";
import { CRPAuto } from "../CRPMgr.js";
import {CBrushComp} from "./CBrushComp.js";

export default class CEnvMap extends CBrushComp
{
    mSize : number = 512;
    mCycle : number = 0;

    constructor(_cycle : number) {
        super("envMap_" + CUniqueID.Get());

        this.mCycle = _cycle;
        for(let i = 0; i < 6; i++) {
            // 오브젝트용 RP
            {
                const rp = new CRPAuto(CFrame.Main().Pal().Sl3D().mKey);
                rp.mCopy = false;
                rp.mPriority = CRenderPass.ePriority.Normal - i * 2 - 2;
                rp.mCullFace=CRenderPass.eCull.CW;
                rp.mRenderTarget = this.GetTex();
                rp.mRenderTargetUse.add(i);
                rp.mCamera = this.mTexKey+i;
                rp.PushOr(new CCondition("class","==","CPaint3D"));
                rp.PushAnd(new CCondition("mTag[water]","==",false));
                this.PushRPAuto(rp);
            }

            // 스카이박스용 RP
            {
                const rp = new CRPAuto(CFrame.Main().Pal().SlCube().mKey);
                rp.mCopy = false;
                rp.mPriority=CRenderPass.ePriority.Normal - i * 2 - 1;
                rp.mCullFace=CRenderPass.eCull.CCW;
                rp.mRenderTarget = this.GetTex();
                rp.mRenderTargetUse.add(i);
                rp.mCamera = this.mTexKey+i;
                rp.PushOr(new CCondition("class","==","CPaintCube"));
                rp.PushAnd(new CCondition("mTag[water]","==",false));
                rp.PushAnd(new CCondition("mTag[sky]"));
                this.PushRPAuto(rp);

                rp.mClearColor = false;
                rp.mClearDepth = false;
            }
        }
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
                [new CTextureInfo(CTexture.eTarget.Cube, CTexture.eFormat.RGBA8, 1)],
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
            const rpKey = this.mTexKey + rp.mShader + rp.mCamera;
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
        const pos = this.GetOwner().GetMat().xyz;
        const camDirList = [
            new CVec3(1, 0, 0),new CVec3(-1, 0, 0),new CVec3(0, -1, 0),
            new CVec3(0, 1, 0),new CVec3(0, 0, 1),new CVec3(0, 0, -1)
        ];

        for(let i = 0; i < 6; i++) {
            const camDir = camDirList[i];
            const virtualCam = this.mBruch.GetCamera(this.mTexKey+i);

            const eye = pos;
            const look = CMath.V3AddV3(pos, camDir);

            if(virtualCam.Init(eye, look))
            {
                virtualCam.SetFov(Math.PI * 0.5);
                virtualCam.SetSize(this.mSize, this.mSize);
                virtualCam.mRCS = false;
                virtualCam.ResetPerspective();
            }
        }
    }

    Destroy(): void {
        super.Destroy();

        if(this.mWrite.length > 0) {
            for(const rp of this.mWrite) {
                const rpKey = this.mTexKey + rp.mShader + rp.mCamera;
                this.mBruch.RemoveAutoRP(rpKey);
            }
            this.mWrite.length = 0;
        }
    }
}