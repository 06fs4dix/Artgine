import { CMath } from "../../geometry/CMath.js";
import { CVec2 } from "../../geometry/CVec2.js";
import { CVec3 } from "../../geometry/CVec3.js";
import { CRenderPass } from "../../render/CRenderPass.js";
import { CRPAuto } from "../../render/CRPMgr.js";
import { CShaderAttr } from "../../render/CShaderAttr.js";
import { CTexture, CTextureInfo } from "../../render/CTexture.js";
import { CCamComp } from "./CCamComp.js";
export default class CEnvMap extends CCamComp {
    mSize;
    mCycle = 0;
    constructor(_key, _size, _skyTex) {
        super(_key);
        for (let i = 0; i < 6; i++) {
            var rp = new CRPAuto("Pre3Light");
            rp.mAutoTag = "env";
            rp.mAutoPaint.add("CPaint3D");
            rp.mCullFrustum = false;
            rp.mCullFace = CRenderPass.eCull.CW;
            rp.mRenderTarget = this.GetTex();
            rp.mRenderTargetUse = new Set([i]);
            rp.mPriority = CRenderPass.ePriority.BackGround - i * 2 - 2;
            rp.mCamera = this.mShadowKey + i;
            this.PushRPAuto(rp);
            var rp = new CRPAuto("PreSkybox");
            rp.mAutoTag = "skybox";
            rp.mAutoPaint.add("CPaint3D");
            rp.mClearColor = false;
            rp.mClearDepth = false;
            rp.mCullFrustum = false;
            rp.mCullFace = CRenderPass.eCull.CCW;
            rp.mRenderTarget = this.GetTex();
            rp.mRenderTargetUse = new Set([i]);
            rp.mCamera = this.mShadowKey + i;
            rp.mPriority = CRenderPass.ePriority.BackGround - i * 2 - 1;
            rp.mShaderAttr.push(new CShaderAttr(0, _skyTex));
            this.PushRPAuto(rp);
        }
        this.mSize = _size;
    }
    SetCycle(_cycle) {
        this.mCycle = _cycle;
    }
    CCamCompReq(_brush) {
        var pos = this.GetOwner().GetPos();
        var camList = [
            new CVec3(1, 0, 0), new CVec3(-1, 0, 0), new CVec3(0, -1, 0),
            new CVec3(0, 1, 0), new CVec3(0, 0, 1), new CVec3(0, 0, -1)
        ];
        var texKey = this.mShadowKey + ".tex";
        if (this.GetOwner().GetFrame().Res().Find(texKey) == null) {
            let texInfo = new CTextureInfo(CTexture.eTarget.Cube, CTexture.eFormat.RGBA8);
            this.GetOwner().GetFrame().Ren().BuildRenderTarget([texInfo], new CVec2(this.mSize, this.mSize), texKey);
            let tex = this.GetOwner().GetFrame().Res().Find(texKey);
            tex.SetMipMap(CTexture.eMipmap.GL);
            tex.SetWrap(CTexture.eWrap.Clamp);
            this.GetOwner().GetFrame().Ren().BuildTexture(tex);
        }
        for (var i = 0; i < camList.length; ++i) {
            var cam = _brush.GetCamera(this.mShadowKey + i);
            cam.Init(pos, CMath.V3AddV3(pos, camList[i]));
            cam.SetFov(Math.PI * 0.495);
            cam.SetScreenWidthBase(true);
            cam.mWidth = this.mSize;
            cam.mHeight = this.mSize;
            cam.mRCS = false;
            cam.ResetPerspective();
            cam.Update(1);
        }
        for (let i = 0; i < this.mWrite.length; i++) {
            var rp = this.mWrite[i];
            var srpKey = this.mShadowKey + rp.mShader + i;
            var srp = _brush.GetAutoRP(srpKey);
            if (srp == null) {
                srp = rp.Export();
                _brush.SetAutoRP(srpKey, srp);
            }
            srp.mCycle = this.mCycle;
        }
    }
}
