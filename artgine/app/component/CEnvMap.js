import { CUpdate } from "../../basic/Basic.js";
import { CUniqueID } from "../../basic/CUniqueID.js";
import { CMath } from "../../geometry/CMath.js";
import { CVec2 } from "../../geometry/CVec2.js";
import { CVec3 } from "../../geometry/CVec3.js";
import { CRenderPass } from "../../render/CRenderPass.js";
import { CTexture, CTextureInfo } from "../../render/CTexture.js";
import { CCondition } from "../../util/CCondition.js";
import { CFrame } from "../../util/CFrame.js";
import { CRPAuto } from "../canvas/CRPMgr.js";
import { CBrushComp } from "./CBrushComp.js";
export default class CEnvMap extends CBrushComp {
    mSize = 512;
    mCycle = 0;
    constructor(_cycle) {
        super("envMap_" + CUniqueID.Get());
        this.mCycle = _cycle;
        for (let i = 0; i < 6; i++) {
            {
                const rp = new CRPAuto(CFrame.Main().Pal().Sl3D().mKey);
                rp.mCopy = false;
                rp.mPriority = CRenderPass.ePriority.Normal - i * 2 - 2;
                rp.mCullFace = CRenderPass.eCull.CW;
                rp.mRenderTarget = this.GetTex();
                rp.mRenderTargetUse.add(i);
                rp.mCamera = this.mTexKey + i;
                rp.PushOr(new CCondition("class", "==", "CPaint3D"));
                rp.PushAnd(new CCondition("mTag[water]", "==", false));
                rp.PushAnd(new CCondition("mTag[envRender]", "==", true));
                this.PushRPAuto(rp);
            }
            {
                const rp = new CRPAuto(CFrame.Main().Pal().SlCube().mKey);
                rp.mCopy = false;
                rp.mPriority = CRenderPass.ePriority.Normal - i * 2 - 1;
                rp.mCullFace = CRenderPass.eCull.CCW;
                rp.mRenderTarget = this.GetTex();
                rp.mRenderTargetUse.add(i);
                rp.mCamera = this.mTexKey + i;
                rp.PushOr(new CCondition("class", "==", "CPaintCube"));
                rp.PushAnd(new CCondition("mTag[water]", "==", false));
                rp.PushAnd(new CCondition("mTag[sky]"));
                this.PushRPAuto(rp);
                rp.mClearColor = false;
                rp.mClearDepth = false;
            }
        }
    }
    Update(_update) {
        super.Update(_update);
        if (this.mBrush != null)
            this.UpdateBrush(_update);
    }
    UpdateBrush(_update) {
        const fw = this.GetOwner().GetFrame();
        let tex = fw.Res().Find(this.GetTex());
        if (!tex) {
            fw.Ren().BuildRenderTarget([new CTextureInfo(CTexture.eTarget.Cube, CTexture.eFormat.RGBA8, 1)], new CVec2(this.mSize, this.mSize), this.GetTex());
            tex = fw.Res().Find(this.GetTex());
            tex.SetAutoResize(false);
        }
        const expectedSize = Math.trunc(this.mSize * fw.PF().mRTScaleW);
        if (tex.GetWidth() != expectedSize) {
            fw.Ren().BuildRenderTarget([new CTextureInfo(CTexture.eTarget.Cube, CTexture.eFormat.RGBA8, 1)], new CVec2(this.mSize, this.mSize), this.GetTex());
        }
        for (const rp of this.mWriteRP) {
            const rpKey = this.mTexKey + rp.mShader + rp.mCamera;
            if (!this.mBrush.AutoRP().has(rpKey)) {
                this.mBrush.SetAutoRP(rpKey, rp);
            }
            if (rp.mCycle != this.mCycle) {
                rp.mCycle = this.mCycle;
                this.mBrush.mAutoRPUpdate = CUpdate.eType.Updated;
            }
        }
        const pos = this.GetOwner().GetMat().xyz;
        const camDirList = [
            new CVec3(1, 0, 0), new CVec3(-1, 0, 0), new CVec3(0, -1, 0),
            new CVec3(0, 1, 0), new CVec3(0, 0, 1), new CVec3(0, 0, -1)
        ];
        for (let i = 0; i < 6; i++) {
            const camDir = camDirList[i];
            const virtualCam = this.mBrush.GetCamera(this.mTexKey + i);
            const eye = pos;
            const look = CMath.V3AddV3(pos, camDir);
            if (virtualCam.Init(eye, look)) {
                virtualCam.SetFov(Math.PI * 0.5);
                virtualCam.SetSize(this.mSize, this.mSize);
                virtualCam.mRCS = false;
                virtualCam.ResetPerspective();
            }
        }
    }
    Destroy() {
        super.Destroy();
        if (this.mWriteRP.length > 0) {
            for (const rp of this.mWriteRP) {
                const rpKey = this.mTexKey + rp.mShader + rp.mCamera;
                this.mBrush.RemoveAutoRP(rpKey);
            }
            this.mWriteRP.length = 0;
        }
    }
}
