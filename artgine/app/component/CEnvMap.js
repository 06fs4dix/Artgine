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
    Icon() { return "bi bi-globe2"; }
    mRadius = 0;
    mSize = 128;
    mCycle = 100000;
    mCubeKey = null;
    mCubeKeyUpdated = CUpdate.eType.Updated;
    constructor() {
        super("envMap_" + CUniqueID.Get());
        this.mReadTag = this.mTexKey;
    }
    Update(_update) {
        super.Update(_update);
        if (this.mBrush != null)
            this.UpdateBrush(_update);
    }
    SetCubeKey(_key) {
        this.mCubeKey = _key;
        if (this.mBrush == null)
            return;
        if (_key != null) {
            this.Refresh();
            this.mBrush.ClearRen();
            this.mCubeKeyUpdated = CUpdate.eType.Updated;
        }
    }
    GetTex() { return this.GetOwner().GetFrame().Pal().GetEnvMapTex(); }
    UpdateBrush(_update) {
        if (this.mWriteRP.length == 0 && this.mCubeKey == null) {
            let pal = this.mBrush.mFrame.Pal();
            const rp2D = this.PushRPAuto(new CRPAuto(pal.Sl2DKey()));
            rp2D.mCopy = false;
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
        if (this.mCubeKeyUpdated == CUpdate.eType.Updated)
            this.mCubeKeyUpdated = CUpdate.eType.Already;
        else if (this.mCubeKeyUpdated == CUpdate.eType.Already)
            this.mCubeKeyUpdated = CUpdate.eType.Not;
        this.UpdateEnvmap(_update);
    }
    UpdateEnvmap(_update) {
        let envmapTex = this.mBrush.mFrame.Res().Find(this.GetTex());
        if (this.mBrush.mFrame.Res().Find("NoneEnv.tex") == null) {
            this.mBrush.mFrame.Ren().BuildRenderTarget([new CTextureInfo(CTexture.eTarget.Array, CTexture.eFormat.RGBA8, 1)], new CVec2(2, 2), "NoneEnv.tex");
            this.mBrush.mFrame.Res().Find("NoneEnv.tex").SetAutoResize(false);
        }
        this.mTexOff = this.mBrush.mEnvmapTexOff;
        const useCube = this.mCubeKey != null;
        for (let i = 0; i < 6 && !useCube; i++) {
            for (const rp of this.mWriteRP) {
                const srpKey = this.mTexKey + rp.Key() + i;
                let srp = this.mBrush.FindAutoRP(srpKey);
                if (srp == null) {
                    srp = this.mBrush.PushAutoRP(srpKey, rp.Export());
                    srp.mPriority += i + this.mBrush.mEnvmapTexOff;
                    srp.PushOr(new CCondition("GetTagKey().indexOf(envMap_)", "==", -1, "envmapChk"));
                    srp.PushOr(new CCondition(`mTag[${this.mReadTag}]`, "envmapChk"));
                    srp.mRenderTarget = this.GetTex();
                    srp.mCamera = this.mTexKey + i;
                    srp.mShaderAttr.push(new CShaderAttr(SDF.eTexSlot.ArrEnvmap, "NoneEnv.tex"));
                    srp.Reset();
                }
                if (srp.mOr[srp.mOr.length - 1].mState != `mTag[${this.mReadTag}]`) {
                    this.mBrush.ClearRen();
                }
                if (srp.mRenderTargetUse.has(this.mBrush.mEnvmapTexOff + i) == false || srp.mCycle != this.mCycle) {
                    srp.mRenderTargetUse = new Set([this.mBrush.mEnvmapTexOff + i]);
                    srp.mCycle = this.mCycle;
                    this.UpdateThisEnvMap(i);
                }
            }
        }
        if (!useCube && (this.mBrush.mCameraMap.has(this.mTexKey + 0) == false || this.GetOwner().mUpdateMat != 0)) {
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
            for (let i = 0; i < 6; i++) {
                const virtualCam = this.mBrush.GetCamera(this.mTexKey + i);
                const slook = CMath.V3AddV3(seye, cubeDir[i]);
                if (virtualCam.Init(seye, slook, cubeUp[i]) || far != virtualCam.GetFar()) {
                    virtualCam.SetFov(2 * Math.atan(this.mSize / (this.mSize - 1)));
                    virtualCam.SetFar(far);
                    virtualCam.mWidth = this.mSize;
                    virtualCam.mHeight = this.mSize;
                    virtualCam.SetSize(this.mSize, this.mSize);
                    virtualCam.ResetPerspective();
                    this.UpdateThisEnvMap(i);
                    this.mBrush.mUpdateEnv = CUpdate.eType.Updated;
                }
            }
        }
        this.mBrush.mEnvmapPos[this.mBrush.mEnvmapCount * 4 + 0] = this.GetOwner().GetMat().F32A()[12];
        this.mBrush.mEnvmapPos[this.mBrush.mEnvmapCount * 4 + 1] = this.GetOwner().GetMat().F32A()[13];
        this.mBrush.mEnvmapPos[this.mBrush.mEnvmapCount * 4 + 2] = this.GetOwner().GetMat().F32A()[14];
        this.mBrush.mEnvmapPos[this.mBrush.mEnvmapCount * 4 + 3] = this.mRadius;
        this.mBrush.mUpdateEnv = CUpdate.eType.Updated;
        this.mBrush.mEnvmapTexOff += 6;
        this.mBrush.mEnvmapCount++;
        if (envmapTex.GetInfo()[0].mCount < this.mBrush.mEnvmapTexOff) {
            this.mBrush.mFrame.Ren().BuildRenderTarget([new CTextureInfo(CTexture.eTarget.Array, CTexture.eFormat.RGBA8, this.mBrush.mEnvmapTexOff)], new CVec2(envmapTex.GetWidth(), envmapTex.GetHeight()), this.GetOwner().GetFrame().Pal().GetEnvMapTex());
            this.UpdateAllEnvMap();
        }
        if (this.mBrush.mEnvmapRebuild == CUpdate.eType.Already || this.mCubeKeyUpdated == CUpdate.eType.Already)
            this.CopyCube();
    }
    CopyCube() {
        const cube = this.mBrush.mFrame.Res().Find(this.mCubeKey);
        if (cube == null)
            return false;
        if (cube.GetBuf().length < 6) {
            if (cube.mReadPixelEvent != null)
                cube.mReadPixelEvent.Call(cube);
            return false;
        }
        const layers = new Set();
        for (let face = 0; face < 6; face++)
            layers.add(this.mTexOff + face);
        this.mBrush.mFrame.Ren().BlurEnvmap(this.GetTex(), layers, cube);
        return true;
    }
    UpdateAllEnvMap() {
        if (this.mBrush == null)
            return;
        for (const ri of this.mBrush.mRenInfoMap.values()) {
            if (ri.mRP != null && ri.mRP.mRenderTarget == this.GetTex())
                ri.mSleepReset = true;
        }
        this.mBrush.mEnvmapRebuild = CUpdate.eType.Updated;
    }
    UpdateThisEnvMap(_faceIdx = -1) {
        if (this.mBrush == null)
            return;
        for (const rp of this.mWriteRP) {
            const srpKey = this.mTexKey + rp.Key() + _faceIdx;
            const srp = this.mBrush.FindAutoRP(srpKey);
            if (srp == null)
                continue;
            for (const ri of this.mBrush.mRenInfoMap.values()) {
                if (ri.mRP != null && ri.mRP.Key() == srp.Key() && ri.mRP.mRenderTarget == this.GetTex()) {
                    ri.mSleepReset = true;
                    break;
                }
            }
        }
    }
    Refresh() {
        if (this.mBrush != null && this.mTexKey != null) {
            for (let i = 0; i < 6; i++) {
                this.mBrush.mCameraMap.delete(this.mTexKey + i);
                for (let rp of this.mWriteRP) {
                    this.mBrush.RemoveAutoRP(this.mTexKey + rp.mShader + i);
                }
            }
            this.mWriteRP.length = 0;
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
