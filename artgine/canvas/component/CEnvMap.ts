import { CUpdate } from "../../basic/Basic.js";
import {CMath} from "../../geometry/CMath.js";
import {CVec2} from "../../geometry/CVec2.js";
import {CVec3} from "../../geometry/CVec3.js";
import {CRenderPass} from "../../render/CRenderPass.js";

import {CTexture,  CTextureInfo } from "../../render/CTexture.js";
import { CCondition } from "../../util/CStateMachine.js";
import { CRPAuto } from "../CRPMgr.js";
import {CBrushComp} from "./CBrushComp.js";

export default class CEnvMap extends CBrushComp
{
    mSize : number = 512;
    mCycle : number = 0;

    public SetCycle(_cycle : number) {
        this.mCycle = _cycle;
    }

    Update(_update: CUpdate): boolean|any {
        super.Update(_update);
        if(this.mBruch != null) this.UpdateBrush(_update);
    }

    UpdateBrush(_update : CUpdate) {
        const fw = this.GetOwner().GetFrame();
        if(this.mWrite.length == 0) {
            for(let i = 0; i < 6; i++) {
                let rp = new CRPAuto(fw.Pal().Sl3D().mKey);
                rp.mCopy = false;
                rp.mPriority = CRenderPass.ePriority.Normal - i * 2 - 2;
                rp.mBlend = [CRenderPass.eBlend.FUNC_ADD,CRenderPass.eBlend.FUNC_ADD,CRenderPass.eBlend.ONE,CRenderPass.eBlend.ZERO,CRenderPass.eBlend.ONE,CRenderPass.eBlend.ONE_MINUS_SRC_ALPHA];
                rp.mCullFace=CRenderPass.eCull.CW;
                rp.mRenderTarget = this.GetTex();
                rp.mRenderTargetUse.add(i);
                rp.mCamera = this.mShadowKey+i;
                rp.PushOr(new CCondition("class","==","CPaint3D"));
                rp.PushAnd(new CCondition("mTag[water]","==",false));
                // rp.PushAnd(new CCondition("mTag[env]"));
                this.PushRPAuto(rp);

                rp = new CRPAuto(fw.Pal().SlCube().mKey);
                rp.mCopy = false;
                rp.mPriority=CRenderPass.ePriority.Normal - i * 2 - 1;
                rp.mBlend=[CRenderPass.eBlend.FUNC_ADD,CRenderPass.eBlend.FUNC_ADD,CRenderPass.eBlend.ONE,CRenderPass.eBlend.ZERO,CRenderPass.eBlend.ONE,CRenderPass.eBlend.ONE_MINUS_SRC_ALPHA];
                rp.mClearColor = false;
                rp.mClearDepth = false;
                rp.mCullFace=CRenderPass.eCull.CCW;
                rp.mRenderTarget = this.GetTex();
                rp.mRenderTargetUse.add(i);
                rp.mCamera = this.mShadowKey+i;
                rp.PushOr(new CCondition("class","==","CPaintCube"));
                rp.PushAnd(new CCondition("mTag[water]","==",false));
                rp.PushAnd(new CCondition("mTag[sky]"));
                this.PushRPAuto(rp);
            }
            for(const rp of this.mWrite) {
                const rpKey = this.mShadowKey + rp.mShader + rp.mCamera;
                this.mBruch.SetAutoRP(rpKey, rp);
            }
        }

        let tex = fw.Res().Find(this.GetTex()) as CTexture;
        if(tex == null) {
            fw.Ren().BuildRenderTarget(
                [new CTextureInfo(CTexture.eTarget.Cube, CTexture.eFormat.RGBA8, 1)],
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

        const pos = this.GetOwner().GetMat().xyz;
        const camDirList = [
            new CVec3(1, 0, 0),new CVec3(-1, 0, 0),new CVec3(0, -1, 0),
            new CVec3(0, 1, 0),new CVec3(0, 0, 1),new CVec3(0, 0, -1)
        ];
        for(let i = 0; i < 6; i++) {
            const camDir = camDirList[i];
            const cam = this.mBruch.GetCamera(this.mShadowKey+i);
            cam.Init(pos, CMath.V3AddV3(pos, camDir));
            cam.SetFov(Math.PI * 0.5);
            cam.SetSize(this.mSize, this.mSize);
            cam.mRCS = false;
            cam.ResetPerspective();
        }

        for(const rp of this.mWrite) {
            if(rp.mCycle != this.mCycle) rp.mCycle = this.mCycle;
        }
    }
}