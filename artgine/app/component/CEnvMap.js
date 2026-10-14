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
import { CPlugin } from "../../util/CPlugin.js";
import { CShaderAttr } from "../../render/CShaderAttr.js";
import { SDF } from "../../z_file/SDF.js";
export default class CEnvMap extends CBrushComp {
    mRadius = 0;
    constructor(_tag) {
        super("envMap_" + CUniqueID.Get());
        this.mReadTag = _tag;
    }
    Update(_update) {
        super.Update(_update);
        if (this.mBrush != null)
            this.UpdateBrush(_update);
    }
    GetTex() { return this.GetOwner().GetFrame().Pal().GetEnvMapTex(); }
    UpdateBrush(_update) {
        if (this.mWriteRP.length == 0) {
            let pal = this.mBrush.mFrame.Pal();
            const rp2D = this.PushRPAuto(new CRPAuto(pal.Sl2DKey()));
            rp2D.SetKey("Forward_2D");
            rp2D.mCullFace = CRenderPass.eCull.None;
            rp2D.PushOr([
                new CCondition("class", "==", "CPaint2D", "Paint_OR_Group"),
                new CCondition("class", "==", "CPaintHTML", "Paint_OR_Group"),
                new CCondition("class", "==", "CPaint2DMerge", "Paint_OR_Group"),
                new CCondition("class", "==", "CPaintTrail", "Paint_OR_Group")
            ]);
            rp2D.mPriority = CRenderPass.ePriority.BackGround + 1;
            const rpCube = this.PushRPAuto(new CRPAuto(CFrame.Main().Pal().SlCube().mKey));
            rpCube.mCopy = false;
            rpCube.mCullFace = CRenderPass.eCull.None;
            rpCube.mCullFrustum = false;
            rpCube.PushOr([
                new CCondition("class", "==", "CPaintCube", "Paint_OR_Group")
            ]);
            rpCube.mPriority = CRenderPass.ePriority.BackGround + 1;
            const rp3D = this.PushRPAuto(new CRPAuto(pal.Sl3DKey()));
            rp3D.mCopy = false;
            rp3D.PushOr([
                new CCondition("class", "==", "CPaint3D", "Paint_OR_Group"),
                new CCondition("class", "==", "CPaint3DMerge", "Paint_OR_Group")
            ]);
            rp3D.PushAnd(new CCondition("mTag[water]", "==", false));
            rp3D.mPriority = CRenderPass.ePriority.BackGround + 1;
            const rpTerrain = this.PushRPAuto(new CRPAuto(pal.SlTerrainKey()));
            rpTerrain.mCopy = false;
            rpTerrain.PushOr([
                new CCondition("class", "==", "CPaintTerrain", "Paint_OR_Group")
            ]);
            rpTerrain.mPriority = CRenderPass.ePriority.BackGround + 1;
            if (CPlugin.FindPath("Water")) {
                const rpWater = this.PushRPAuto(new CRPAuto(CPlugin.FindPath("Water") + "WaterShader.ts"));
                rpWater.mCopy = false;
                rpWater.PushOr([
                    new CCondition("class", "==", "CPaint3D", "Paint_OR_Group")
                ]);
                rpWater.PushAnd(new CCondition("mTag[water]"));
                rpWater.mPriority = CRenderPass.ePriority.BackGround + 1;
            }
        }
        this.UpdateEnvmap(_update);
    }
    UpdateEnvmap(_update) {
        let envmapTex = this.mBrush.mFrame.Res().Find(this.GetTex());
        if (this.mBrush.mFrame.Res().Find("NoneEnv.tex") == null) {
            this.mBrush.mFrame.Ren().BuildRenderTarget([new CTextureInfo(CTexture.eTarget.Array, CTexture.eFormat.RGBA8, 1)], new CVec2(2, 2), "NoneEnv.tex");
            this.mBrush.mFrame.Res().Find("NoneEnv.tex").SetAutoResize(false);
        }
        if (this.mBrush.mCameraMap.has(this.mTexKey + 0) == false || this.GetOwner().mUpdateMat != 0) {
            const seye = this.GetOwner().GetMat().xyz;
            const cubeDir = [
                new CVec3(1, 0, 0), new CVec3(-1, 0, 0), new CVec3(0, 1, 0),
                new CVec3(0, -1, 0), new CVec3(0, 0, 1), new CVec3(0, 0, -1)
            ];
            const cubeUp = [
                new CVec3(0, 1, 0), new CVec3(0, 1, 0), new CVec3(0, 0, 1),
                new CVec3(0, 0, -1), new CVec3(0, 1, 0), new CVec3(0, 1, 0)
            ];
            for (let i = 0; i < 6; i++) {
                const virtualCam = this.mBrush.GetCamera(this.mTexKey + i);
                const slook = CMath.V3AddV3(seye, cubeDir[i]);
                if (virtualCam.Init(seye, slook, cubeUp[i])) {
                    virtualCam.SetFov(2 * Math.atan(128 / 127));
                    virtualCam.mWidth = 128;
                    virtualCam.mHeight = 128;
                    virtualCam.SetSize(128, 128);
                    virtualCam.ResetPerspective();
                }
            }
        }
        const o = this.mBrush.mEnvmapCount * 4;
        if (o + 4 <= this.mBrush.mEnvmapPos.length) {
            const pos = this.GetOwner().GetMat().xyz;
            this.mBrush.mEnvmapPos[o + 0] = pos.x;
            this.mBrush.mEnvmapPos[o + 1] = pos.y;
            this.mBrush.mEnvmapPos[o + 2] = pos.z;
            this.mBrush.mEnvmapPos[o + 3] = this.mRadius;
        }
        const needLayer = this.mBrush.mEnvmapTexOff + 6;
        if (envmapTex.GetInfo()[0].mCount < needLayer) {
            this.mBrush.mFrame.Ren().BuildRenderTarget([new CTextureInfo(CTexture.eTarget.Array, CTexture.eFormat.RGBA8, needLayer)], new CVec2(envmapTex.GetWidth(), envmapTex.GetHeight()), this.GetOwner().GetFrame().Pal().GetEnvMapTex());
            this.mBrush.mFrame.Res().Find(this.GetTex()).SetAutoResize(false);
            this.mBrush.mUpdateEnv = CUpdate.eType.Updated;
        }
        this.mTexOff = this.mBrush.mEnvmapTexOff;
        for (let i = 0; i < 6; i++) {
            for (const rp of this.mWriteRP) {
                const srpKey = this.mTexKey + rp.Key() + i;
                let srp = this.mBrush.FindAutoRP(srpKey);
                if (srp == null) {
                    srp = this.mBrush.PushAutoRP(srpKey, rp.Export());
                    srp.mPriority += i + this.mBrush.mEnvmapTexOff;
                    srp.PushAnd(new CCondition(`mTag[${this.mReadTag}]`));
                    srp.mRenderTarget = this.GetTex();
                    srp.mCamera = this.mTexKey + i;
                    srp.mShaderAttr.push(new CShaderAttr(SDF.eTexSlot.ArrEnvmap, "NoneEnv.tex"));
                    srp.Reset();
                }
                srp.mRenderTargetUse = new Set([this.mBrush.mEnvmapTexOff + i]);
                srp.mAnd[srp.mAnd.length - 1].mState = `mTag[${this.mReadTag}]`;
                srp.mCycle = 100000000;
            }
        }
        this.mBrush.mEnvmapTexOff += 6;
        this.mBrush.mEnvmapCount++;
    }
    Refresh() {
        if (this.mBrush != null && this.mTexKey != null) {
            for (let i = 0; i < 6; i++) {
                this.mBrush.mCameraMap.delete(this.mTexKey + i);
                for (let rp of this.mWriteRP) {
                    this.mBrush.RemoveAutoRP(this.mTexKey + rp.mShader + i);
                }
            }
        }
    }
    SetEnable(_val) {
        if (this.mEnable != _val && this.mBrush != null)
            this.mBrush.mUpdateEnv = CUpdate.eType.Updated;
        super.SetEnable(_val);
    }
    Destroy() {
        if (this.mBrush != null)
            this.mBrush.mUpdateEnv = CUpdate.eType.Updated;
        super.Destroy();
        this.Refresh();
    }
}
