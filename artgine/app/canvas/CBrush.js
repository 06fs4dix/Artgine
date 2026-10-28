import { CUpdate } from "../../basic/Basic.js";
import { CArray } from "../../basic/CArray.js";
import { CJSON } from "../../basic/CJSON.js";
import { CObject } from "../../basic/CObject.js";
import { CMat } from "../../geometry/CMat.js";
import { CVec3 } from "../../geometry/CVec3.js";
import { CCamera } from "../../render/CCamera.js";
import { CDevice } from "../../render/CDevice.js";
import { CRenderPass } from "../../render/CRenderPass.js";
import { CFile } from "../../system/CFile.js";
import { CTimer } from "../../system/CTimer.js";
import { CRPAuto } from "./CRPMgr.js";
import { CCondition } from "../../util/CCondition.js";
import { CShaderAttr } from "../../render/CShaderAttr.js";
import { SDF } from "../../z_file/SDF.js";
export class CRenInfo {
    mRP = null;
    mCam = null;
    mSleep = null;
    mSleepReset = true;
    mTag = new Set();
    mShow = true;
    mShader = null;
}
export class CRenPriority {
    mAlphaList = new CArray();
    mDistanceList = new CArray();
    mRAlphaList = new CArray();
    mPriority = 0;
    static CompareNormal(a, b) {
        return (a.mDistance + a.mTexHash) - (b.mDistance + b.mTexHash);
    }
    static CompareReverse(a, b) {
        return (b.mDistance + b.mTexHash) - (a.mDistance + a.mTexHash);
    }
}
export class CBrush extends CObject {
    constructor(_frame) {
        super();
        this.SetKey("Brush");
        this.mFrame = _frame;
        var size = CDevice.GetProperty(CDevice.eProperty.Sam2DSize);
        this.mLightDir = new Float32Array(4 * size);
        this.mLightColor = new Float32Array(4 * size);
        this.mLightMask = new Float32Array(4 * size);
        this.mLightCount = 0;
        this.mWindDir = new Float32Array(4 * size);
        this.mWindPos = new Float32Array(4 * size);
        this.mWindInfo = new Float32Array(4 * size);
        this.mWindCount = 0;
        this.mEnvmapPos = new Float32Array(4 * size);
        if (_frame.PF().mIAuto)
            _frame.PushIAuto(this);
    }
    async SaveJSON(_file = null) {
        CFile.Save(this.ToStr(), _file);
    }
    async LoadJSON(_file = null) {
        let buf = await CFile.Load(_file);
        if (buf == null)
            return true;
        this.mCameraMap.clear();
        this.ImportCJSON(new CJSON(buf));
        for (let cam of this.mCameraMap.values()) {
            cam.mPF = this.mFrame.PF();
            if (cam.mCamCon != null)
                cam.mCamCon.SetInput(this.mFrame.Input());
        }
        this.mCam3d = this.GetCamera("3D");
        this.mCam2d = this.GetCamera("2D");
        this.mCamDev = this.GetCamera("Dev");
        return false;
    }
    IsPause() {
        return this.mPause;
    }
    SetPause(_pause) {
        this.mPause = _pause;
    }
    mFrame = null;
    mTimer = new CTimer();
    mDelay = 0;
    mCam2d = null;
    mCam3d = null;
    mCamDev = null;
    mDoubleChk = new Set();
    mLightDir = null;
    mLightColor = null;
    mLightMask = null;
    mLightCount;
    mSkyTable = [
        new CMat([0.24, 0.27, 0.30, 0.34, 0.38, 0.43, 0.50, 0.58, 0.56, 0.53, 0.50, 0.48, 0.47, 0.47, 0.47, 0.47]),
        new CMat([0.47, 0.52, 0.56, 0.60, 0.64, 0.68, 0.73, 0.78, 0.75, 0.71, 0.67, 0.64, 0.63, 0.63, 0.63, 0.63]),
        new CMat([0.84, 0.87, 0.90, 0.92, 0.94, 0.95, 0.96, 0.96, 0.92, 0.87, 0.82, 0.78, 0.76, 0.76, 0.76, 0.76]),
    ];
    mSunTable = [
        new CMat([1.00, 0.76, 0.62, 0.54, 0.50, 0.46, 0.44, 0.42, 0.42, 0.44, 0.47, 0.49, 0.50, 0.50, 0.50, 0.50]),
        new CMat([0.68, 0.74, 0.66, 0.61, 0.58, 0.55, 0.53, 0.51, 0.50, 0.49, 0.49, 0.48, 0.48, 0.48, 0.48, 0.48]),
        new CMat([0.36, 0.72, 0.72, 0.71, 0.70, 0.68, 0.67, 0.66, 0.66, 0.64, 0.62, 0.59, 0.57, 0.56, 0.55, 0.55]),
    ];
    mShadowView = new Array();
    mShadowCount = 0;
    mShadowTexOff = 0;
    mEnvmapCount = 0;
    mEnvmapTexOff = 0;
    mEnvmapPos = null;
    mWindDir = null;
    mWindPos = null;
    mWindInfo = null;
    mWindCount = 0;
    mAutoRPMap = new Map();
    mAutoRPUpdate = CUpdate.eType.Not;
    mDefaultRPInit = false;
    mCameraMap = new Map();
    mPause = false;
    mRenPriMap = new Map();
    mRenInfoMap = new Map();
    mUpdateRenInfo = false;
    mUpdateShadow = CUpdate.eType.Updated;
    mUpdateLight = CUpdate.eType.Updated;
    mUpdateEnv = CUpdate.eType.Updated;
    mEnvmapRebuild = CUpdate.eType.Not;
    mUpdateLUT = false;
    mLUT = [new Float32Array(32 * 32), new Float32Array(32 * 32), new Float32Array(32 * 32),
        new Float32Array(32 * 32), new Float32Array(32 * 32), new Float32Array(32 * 32)];
    GetShadowView() {
        if (this.mShadowView.length == 0) {
            var size = CDevice.GetProperty(CDevice.eProperty.Sam2DSize);
            for (var i = 0; i < 7; ++i)
                this.mShadowView.push(new Float32Array(4 * size));
        }
        return this.mShadowView;
    }
    IsShould(_member, _type) {
        if (_member == "mCameraMap" || _member == "mAutoRPMap")
            return true;
        else
            return false;
        return super.IsShould(_member, _type);
    }
    ClearRen() {
        for (let value of this.mRenPriMap.values()) {
            for (let i = 0; i < value.mAlphaList.Size(); ++i) {
                value.mAlphaList.Find(i).mPaint.ClearBatch(false);
            }
            for (let i = 0; i < value.mDistanceList.Size(); ++i) {
                value.mDistanceList.Find(i).mPaint.ClearBatch(false);
            }
            for (let i = 0; i < value.mRAlphaList.Size(); ++i) {
                value.mRAlphaList.Find(i).mPaint.ClearBatch(false);
            }
        }
        this.mRenInfoMap.clear();
        this.mRenPriMap.clear();
    }
    RemoveAutoRP(_key) {
        this.mAutoRPMap.delete(_key);
        this.mAutoRPUpdate = CUpdate.eType.Updated;
    }
    PushAutoRP(_key, _val) {
        this.mAutoRPMap.set(_key, _val);
        this.mAutoRPUpdate = CUpdate.eType.Updated;
        return _val;
    }
    FindAutoRP(_key) {
        return this.mAutoRPMap.get(_key);
    }
    AutoRP() { return this.mAutoRPMap; }
    EnsureDefaultRP() {
        if (this.mDefaultRPInit)
            return;
        this.mDefaultRPInit = true;
        let pal = this.mFrame.Pal();
        {
            const rpSurface = this.PushAutoRP("Forward_Surface", new CRPAuto(pal.Sl2DKey()));
            rpSurface.SetKey("Forward_Surface");
            rpSurface.mPriority = CRenderPass.ePriority.Surface;
            rpSurface.mTag.add("blit");
            rpSurface.PushOr([
                new CCondition("class", "==", "CPaintSurface", "Paint_OR_Group")
            ]);
            rpSurface.PushAnd(new CCondition("mRenderPass.length", "==", 0));
            const rp2D = this.PushAutoRP("Forward_2D", new CRPAuto(pal.Sl2DKey()));
            rp2D.SetKey("Forward_2D");
            rp2D.mCullFace = CRenderPass.eCull.None;
            rp2D.PushOr([
                new CCondition("class", "==", "CPaint2D", "Paint_OR_Group"),
                new CCondition("class", "==", "CPaintHTML", "Paint_OR_Group"),
                new CCondition("class", "==", "CPaint2DMerge", "Paint_OR_Group"),
                new CCondition("class", "==", "CPaintTrail", "Paint_OR_Group")
            ]);
            rp2D.PushAnd(new CCondition("mRenderPass.length", "==", 0));
            rp2D.PushAnd(new CCondition("mTag[shadowOnly]", "!=", true));
            rp2D.mShaderAttr.push(new CShaderAttr(SDF.eTexSlot.SingleShadowRead, pal.GetShadowReadTex()));
            const rp3D = this.PushAutoRP("Forward_3D", new CRPAuto(pal.Sl3DKey()));
            rp3D.SetKey("Forward_3D");
            rp3D.PushOr([
                new CCondition("class", "==", "CPaint3D", "Paint_OR_Group"),
                new CCondition("class", "==", "CPaint3DMerge", "Paint_OR_Group")
            ]);
            rp3D.PushAnd(new CCondition("mRenderPass.length", "==", 0));
            rp3D.PushAnd(new CCondition("mTag[shadow]", "==", false));
            rp3D.mShaderAttr.push(new CShaderAttr(SDF.eTexSlot.SingleShadowRead, pal.GetShadowReadTex()));
            rp3D.mShaderAttr.push(new CShaderAttr(SDF.eTexSlot.ArrEnvmap, pal.GetEnvMapTex()));
            const rpVoxel = this.PushAutoRP("Forward_Voxel", new CRPAuto(pal.SlVoxelKey()));
            rpVoxel.SetKey("Forward_Voxel");
            rpVoxel.mPriority = CRenderPass.ePriority.BackGround;
            rpVoxel.PushOr([
                new CCondition("class", "==", "CPaintVoxel", "Paint_OR_Group")
            ]);
            rpVoxel.PushAnd(new CCondition("mRenderPass.length", "==", 0));
            rpVoxel.PushOr([
                new CCondition("mTag[shadow]", "==", false),
                new CCondition("FindCShaderAttr(voxelCount).mData.z", "==", 1)
            ]);
            rpVoxel.mShaderAttr.push(new CShaderAttr(SDF.eTexSlot.SingleShadowRead, pal.GetShadowReadTex()));
            rpVoxel.mShaderAttr.push(new CShaderAttr(SDF.eTexSlot.ArrEnvmap, pal.GetEnvMapTex()));
            const rpTerrain = this.PushAutoRP("Forward_Terrain", new CRPAuto(pal.SlTerrainKey()));
            rpTerrain.SetKey("Forward_Terrain");
            rpTerrain.PushOr([
                new CCondition("class", "==", "CPaintTerrain", "Paint_OR_Group")
            ]);
            rpTerrain.PushAnd(new CCondition("mRenderPass.length", "==", 0));
            rpTerrain.PushAnd(new CCondition("mTag[shadow]", "==", false));
            rpTerrain.mShaderAttr.push(new CShaderAttr(SDF.eTexSlot.SingleShadowRead, pal.GetShadowReadTex()));
            rpTerrain.mShaderAttr.push(new CShaderAttr(SDF.eTexSlot.ArrEnvmap, pal.GetEnvMapTex()));
            const rpShadow_3D = this.PushAutoRP("Forward_Shadow_3D", new CRPAuto(pal.Sl3DKey()));
            rpShadow_3D.SetKey("Forward_Shadow_3D");
            rpShadow_3D.PushOr([
                new CCondition("class", "==", "CPaint3D", "Paint_OR_Group"),
                new CCondition("class", "==", "CPaint3DMerge", "Paint_OR_Group")
            ]);
            rpShadow_3D.PushAnd(new CCondition("mRenderPass.length", "==", 0));
            rpShadow_3D.PushAnd(new CCondition("mTag[shadow]"));
            rpShadow_3D.PushAnd(new CCondition("mTag[shadowOnly]", "!=", true));
            rpShadow_3D.mShaderAttr.push(new CShaderAttr("shadowOn", 1));
            rpShadow_3D.mShaderAttr.push(new CShaderAttr(SDF.eTexSlot.SingleShadowRead, pal.GetShadowReadTex()));
            rpShadow_3D.mShaderAttr.push(new CShaderAttr(SDF.eTexSlot.ArrEnvmap, pal.GetEnvMapTex()));
            const rpShadow_Voxel = this.PushAutoRP("Forward_Shadow_Voxel", new CRPAuto(pal.SlVoxelKey()));
            rpShadow_Voxel.SetKey("Forward_Shadow_Voxel");
            rpShadow_Voxel.PushOr([
                new CCondition("class", "==", "CPaintVoxel", "Paint_OR_Group")
            ]);
            rpShadow_Voxel.PushAnd(new CCondition("mRenderPass.length", "==", 0));
            rpShadow_Voxel.PushAnd(new CCondition("mTag[shadow]"));
            rpShadow_Voxel.mShaderAttr.push(new CShaderAttr("shadowOn", 1));
            rpShadow_Voxel.mShaderAttr.push(new CShaderAttr(SDF.eTexSlot.SingleShadowRead, pal.GetShadowReadTex()));
            rpShadow_Voxel.mShaderAttr.push(new CShaderAttr(SDF.eTexSlot.ArrEnvmap, pal.GetEnvMapTex()));
            const rpShadow_Terrain = this.PushAutoRP("Forward_Shadow_Terrain", new CRPAuto(pal.SlTerrainKey()));
            rpShadow_Terrain.SetKey("Forward_Shadow_Terrain");
            rpShadow_Terrain.PushOr([
                new CCondition("class", "==", "CPaintTerrain", "Paint_OR_Group")
            ]);
            rpShadow_Terrain.PushAnd(new CCondition("mRenderPass.length", "==", 0));
            rpShadow_Terrain.PushAnd(new CCondition("FindCShaderAttr(voxelCount).mData.z", "!=", 1));
            rpShadow_Terrain.PushAnd(new CCondition("mTag[shadow]"));
            rpShadow_Terrain.mShaderAttr.push(new CShaderAttr("shadowOn", 1));
            rpShadow_Terrain.mShaderAttr.push(new CShaderAttr(SDF.eTexSlot.SingleShadowRead, pal.GetShadowReadTex()));
            rpShadow_Terrain.mShaderAttr.push(new CShaderAttr(SDF.eTexSlot.ArrEnvmap, pal.GetEnvMapTex()));
            const rpCube = this.PushAutoRP("Forward_Cube", new CRPAuto(pal.SlCubeKey()));
            rpCube.SetKey("Forward_Cube");
            rpCube.mPriority = CRenderPass.ePriority.BackGround - 100;
            rpCube.mCullFace = CRenderPass.eCull.None;
            rpCube.mCullFrustum = false;
            rpCube.PushOr([
                new CCondition("class", "==", "CPaintCube", "Paint_OR_Group")
            ]);
            rpCube.PushAnd(new CCondition("mRenderPass.length", "==", 0));
            const rpShadowRead3D = this.PushAutoRP("ShadowRead_3D", new CRPAuto(pal.Sl3DKey()));
            rpShadowRead3D.SetKey("ShadowRead_3D");
            rpShadowRead3D.mRenderTarget = pal.GetShadowReadTex();
            rpShadowRead3D.mAlpha = false;
            rpShadowRead3D.mTag.add("shadowRead");
            rpShadowRead3D.mPriority = CRenderPass.ePriority.BackGround;
            rpShadowRead3D.PushOr([
                new CCondition("class", "==", "CPaint3D", "Paint_OR_Group"),
                new CCondition("class", "==", "CPaint3DMerge", "Paint_OR_Group")
            ]);
            rpShadowRead3D.PushAnd(new CCondition("mRenderPass.length", "==", 1));
            rpShadowRead3D.PushAnd(new CCondition("mTag[shadow]"));
            rpShadowRead3D.PushAnd(new CCondition("mTag[shadowOnly]", "!=", true));
            rpShadowRead3D.mShaderAttr.push(new CShaderAttr(SDF.eTexSlot.ArrShadowWrite, pal.GetShadowWriteTex()));
            const rpShadowReadVoxel = this.PushAutoRP("ShadowRead_Voxel", new CRPAuto(pal.SlVoxelKey()));
            rpShadowReadVoxel.SetKey("ShadowRead_Voxel");
            rpShadowReadVoxel.mRenderTarget = pal.GetShadowReadTex();
            rpShadowReadVoxel.mAlpha = false;
            rpShadowReadVoxel.mTag.add("shadowRead");
            rpShadowReadVoxel.mPriority = CRenderPass.ePriority.BackGround;
            rpShadowReadVoxel.PushOr([
                new CCondition("class", "==", "CPaintVoxel", "Paint_OR_Group")
            ]);
            rpShadowReadVoxel.PushAnd(new CCondition("FindCShaderAttr(voxelCount).mData.z", "!=", 1));
            rpShadowReadVoxel.PushAnd(new CCondition("mRenderPass.length", "==", 1));
            rpShadowReadVoxel.PushAnd(new CCondition("mTag[shadow]"));
            rpShadowReadVoxel.mShaderAttr.push(new CShaderAttr(SDF.eTexSlot.ArrShadowWrite, pal.GetShadowWriteTex()));
            const rpShadowReadTerrain = this.PushAutoRP("ShadowRead_Terrain", new CRPAuto(pal.SlTerrainKey()));
            rpShadowReadTerrain.SetKey("ShadowRead_Terrain");
            rpShadowReadTerrain.mRenderTarget = pal.GetShadowReadTex();
            rpShadowReadTerrain.mAlpha = false;
            rpShadowReadTerrain.mTag.add("shadowRead");
            rpShadowReadTerrain.mPriority = CRenderPass.ePriority.BackGround + 10;
            rpShadowReadTerrain.PushOr([
                new CCondition("class", "==", "CPaintTerrain", "Paint_OR_Group")
            ]);
            rpShadowReadTerrain.PushAnd(new CCondition("mRenderPass.length", "==", 1));
            rpShadowReadTerrain.PushAnd(new CCondition("mTag[shadow]"));
            rpShadowReadTerrain.mShaderAttr.push(new CShaderAttr(SDF.eTexSlot.ArrShadowWrite, pal.GetShadowWriteTex()));
            const rpEmission_3D = this.PushAutoRP("Forward_Emission_3D", new CRPAuto(pal.Sl3DKey()));
            rpEmission_3D.SetKey("Forward_Emission_3D");
            rpEmission_3D.PushOr([
                new CCondition("class", "==", "CPaint3D", "Paint_OR_Group"),
                new CCondition("class", "==", "CPaint3DMerge", "Paint_OR_Group")
            ]);
            rpEmission_3D.mRenderTarget = pal.GetEmissionTex();
            rpEmission_3D.mBlitType = 1;
            rpEmission_3D.mBlitRead = pal.GetMainFrameTex();
            rpEmission_3D.mPriority = CRenderPass.ePriority.Normal + 10;
            rpEmission_3D.PushAnd(new CCondition("mShaderAttrMap[emission]", "!=", 0));
            rpEmission_3D.PushOr(new CCondition("mRenderPass.length", "==", 1, "renderPassCount"));
            rpEmission_3D.PushOr(new CCondition("mRenderPass.length", "==", 2, "renderPassCount"));
            rpEmission_3D.mShaderAttr.push(new CShaderAttr("ligStep0", SDF.eLightStep0.None));
            rpEmission_3D.mShaderAttr.push(new CShaderAttr("ligStep1", SDF.eLightStep1.None));
            rpEmission_3D.mShaderAttr.push(new CShaderAttr("ligStep2", SDF.eLightStep2.Emissive));
            rpEmission_3D.mShaderAttr.push(new CShaderAttr("ligStep3", SDF.eLightStep3.None));
            rpEmission_3D.mShaderAttr.push(new CShaderAttr("envmapOn", 0.0));
            rpEmission_3D.mShaderAttr.push(new CShaderAttr("emissiveIntensity", 1.0));
            const rpEmission_Voxel = this.PushAutoRP("Forward_Emission_Voxel", new CRPAuto(pal.SlVoxelKey()));
            rpEmission_Voxel.SetKey("Forward_Emission_Voxel");
            rpEmission_Voxel.PushOr([
                new CCondition("class", "==", "CPaintVoxel", "Paint_OR_Group")
            ]);
            rpEmission_Voxel.mRenderTarget = pal.GetEmissionTex();
            rpEmission_Voxel.mBlitType = 1;
            rpEmission_Voxel.mBlitRead = pal.GetMainFrameTex();
            rpEmission_Voxel.mPriority = CRenderPass.ePriority.Normal + 10;
            rpEmission_Voxel.PushAnd(new CCondition("mShaderAttrMap[emission]", "!=", 0));
            rpEmission_Voxel.PushOr(new CCondition("mRenderPass.length", "==", 1, "renderPassCount"));
            rpEmission_Voxel.PushOr(new CCondition("mRenderPass.length", "==", 2, "renderPassCount"));
            rpEmission_Voxel.mShaderAttr.push(new CShaderAttr("ligStep0", SDF.eLightStep0.None));
            rpEmission_Voxel.mShaderAttr.push(new CShaderAttr("ligStep1", SDF.eLightStep1.None));
            rpEmission_Voxel.mShaderAttr.push(new CShaderAttr("ligStep2", SDF.eLightStep2.Emissive));
            rpEmission_Voxel.mShaderAttr.push(new CShaderAttr("ligStep3", SDF.eLightStep3.None));
            rpEmission_Voxel.mShaderAttr.push(new CShaderAttr("envmapOn", 0.0));
            rpEmission_Voxel.mShaderAttr.push(new CShaderAttr("emissiveIntensity", 1.0));
            const rpEmission_Terrain = this.PushAutoRP("Forward_Emission_Terrain", new CRPAuto(pal.SlTerrainKey()));
            rpEmission_Terrain.SetKey("Forward_Emission_Terrain");
            rpEmission_Terrain.PushOr([
                new CCondition("class", "==", "CPaintTerrain", "Paint_OR_Group")
            ]);
            rpEmission_Terrain.mRenderTarget = pal.GetEmissionTex();
            rpEmission_Terrain.mBlitType = 1;
            rpEmission_Terrain.mBlitRead = pal.GetMainFrameTex();
            rpEmission_Terrain.mPriority = CRenderPass.ePriority.Normal + 10;
            rpEmission_Terrain.PushAnd(new CCondition("mShaderAttrMap[emission]", "!=", 0));
            rpEmission_Terrain.PushOr(new CCondition("mRenderPass.length", "==", 1, "renderPassCount"));
            rpEmission_Terrain.PushOr(new CCondition("mRenderPass.length", "==", 2, "renderPassCount"));
            rpEmission_Terrain.PushAnd(new CCondition("FindCShaderAttr(voxelCount).mData.z", "!=", 1));
            rpEmission_Terrain.mShaderAttr.push(new CShaderAttr("ligStep0", SDF.eLightStep0.None));
            rpEmission_Terrain.mShaderAttr.push(new CShaderAttr("ligStep1", SDF.eLightStep1.None));
            rpEmission_Terrain.mShaderAttr.push(new CShaderAttr("ligStep2", SDF.eLightStep2.Emissive));
            rpEmission_Terrain.mShaderAttr.push(new CShaderAttr("ligStep3", SDF.eLightStep3.None));
            rpEmission_Terrain.mShaderAttr.push(new CShaderAttr("envmapOn", 0.0));
            rpEmission_Terrain.mShaderAttr.push(new CShaderAttr("emissiveIntensity", 1.0));
            const rpEmission_Cube = this.PushAutoRP("Forward_Emission_Cube", new CRPAuto(pal.SlCubeKey()));
            rpEmission_Cube.SetKey("Forward_Emission_Cube");
            rpEmission_Cube.PushOr([
                new CCondition("class", "==", "CPaintCube", "Paint_OR_Group")
            ]);
            rpEmission_Cube.mRenderTarget = pal.GetEmissionTex();
            rpEmission_Cube.mBlitType = 1;
            rpEmission_Cube.mBlitRead = pal.GetMainFrameTex();
            rpEmission_Cube.mPriority = CRenderPass.ePriority.Normal + 11;
            rpEmission_Cube.mCullFace = CRenderPass.eCull.None;
            rpEmission_Cube.mCullFrustum = false;
            rpEmission_Cube.PushAnd(new CCondition("mTag[sky]"));
            rpEmission_Cube.PushOr(new CCondition("mRenderPass.length", "==", 1, "renderPassCount"));
            rpEmission_Cube.PushOr(new CCondition("mRenderPass.length", "==", 2, "renderPassCount"));
            rpEmission_Cube.mTag.add("skyEmission");
            rpEmission_Cube.mShaderAttr.push(new CShaderAttr("skyEmission", 1.0));
            rpEmission_Cube.mShaderAttr.push(new CShaderAttr("emissiveIntensity", 1.0));
            const rpEmission_2D = this.PushAutoRP("Forward_Emission_2D", new CRPAuto(pal.Sl2DKey()));
            rpEmission_2D.SetKey("Forward_Emission_2D");
            rpEmission_2D.PushOr([
                new CCondition("class", "==", "CPaint2D", "Paint_OR_Group")
            ]);
            rpEmission_2D.mCullFace = CRenderPass.eCull.None;
            rpEmission_2D.mRenderTarget = pal.GetEmissionTex();
            rpEmission_2D.mPriority = CRenderPass.ePriority.Normal + 10;
            rpEmission_2D.PushAnd(new CCondition("mShaderAttrMap[emission]", "!=", 0));
            rpEmission_2D.PushAnd(new CCondition("mRenderPass.length", "==", 1));
            rpEmission_2D.mTag.add("light");
            rpEmission_2D.mShaderAttr.push(new CShaderAttr("ligStep0", SDF.eLightStep0.None));
            rpEmission_2D.mShaderAttr.push(new CShaderAttr("ligStep1", SDF.eLightStep1.None));
            rpEmission_2D.mShaderAttr.push(new CShaderAttr("ligStep2", SDF.eLightStep2.Emissive));
            rpEmission_2D.mShaderAttr.push(new CShaderAttr("ligStep3", SDF.eLightStep3.None));
            rpEmission_2D.mShaderAttr.push(new CShaderAttr("envmapOn", 0.0));
            rpEmission_2D.mShaderAttr.push(new CShaderAttr("emissiveIntensity", 1.0));
        }
    }
    GetCamera(_key) {
        let cam = this.mCameraMap.get(_key);
        if (cam == null) {
            cam = new CCamera(this.mFrame.PF());
            this.mCameraMap.set(_key, cam);
            cam.SetKey(_key);
        }
        return cam;
    }
    m_2DCamDisplayReset = false;
    GetCam3D() { return this.mCam3d; }
    GetCam2D() { return this.mCam2d; }
    GetCamDev() { return this.mCamDev; }
    InitCamera(_displayReset = false) {
        if (this.mCam3d == null) {
            this.mCam3d = this.GetCamera("3D");
            this.mCam3d.SetKey("3D");
        }
        if (this.mCam2d == null) {
            this.mCam2d = this.GetCamera("2D");
            this.mCam2d.SetKey("2D");
        }
        if (this.mCamDev == null) {
            this.mCamDev = this.GetCamera("Dev");
            this.mCamDev.SetKey("Dev");
        }
        this.m_2DCamDisplayReset = _displayReset;
        if (this.mCam3d != null) {
            this.mCam3d.Init(new CVec3(0, 1000, 1), new CVec3(0, 0, 0));
            this.mCam3d.ResetPerspective();
        }
        if (this.mCam2d != null) {
            if (this.m_2DCamDisplayReset) {
                var stx = this.mCam2d.mWidth * 0.5;
                var sty = this.mCam2d.mHeight * 0.5;
                this.mCam2d.Init(new CVec3(stx, sty, 100), new CVec3(stx, sty, 0));
            }
            else {
                this.mCam2d.Init(new CVec3(0, 0.1, 100), new CVec3(0, 0.1, 0));
            }
            this.mCam2d.ResetOrthographic();
        }
    }
    Update(_update) {
        this.mDelay = this.mTimer.Delay();
        if (this.mPause != true) {
            if (this.mAutoRPUpdate == CUpdate.eType.Updated)
                this.mAutoRPUpdate = CUpdate.eType.Already;
            else if (this.mAutoRPUpdate == CUpdate.eType.Already)
                this.mAutoRPUpdate = CUpdate.eType.Not;
            if (this.mEnvmapRebuild == CUpdate.eType.Updated)
                this.mEnvmapRebuild = CUpdate.eType.Already;
            else if (this.mEnvmapRebuild == CUpdate.eType.Already)
                this.mEnvmapRebuild = CUpdate.eType.Not;
            this.mLightCount = 0;
            this.mShadowCount = 0;
            this.mShadowTexOff = 0;
            this.mEnvmapCount = 0;
            this.mEnvmapTexOff = 0;
            this.mWindCount = 0;
            this.mDoubleChk.clear();
        }
        for (var cam of this.mCameraMap.values()) {
            if (this.mFrame.Win().IsResize()) {
                cam.mReset = true;
            }
            cam.Update(_update);
        }
        if (this.mCam2d != null) {
            if (this.mFrame.Win().IsResize()) {
                if (this.m_2DCamDisplayReset) {
                    var stx = this.mCam2d.mWidth * 0.5;
                    var sty = this.mCam2d.mHeight * 0.5;
                    this.mCam2d.Init(new CVec3(stx, sty, 200), new CVec3(stx, sty, 0));
                    this.mCam2d.ResetOrthographic();
                }
            }
        }
    }
    Icon() {
        return "bi-brush";
    }
}
