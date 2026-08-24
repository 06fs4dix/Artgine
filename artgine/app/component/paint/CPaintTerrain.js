import { CUpdate } from "../../../basic/Basic.js";
import { CMat } from "../../../geometry/CMat.js";
import { CVec1 } from "../../../geometry/CVec1.js";
import { CShaderAttr } from "../../../render/CShaderAttr.js";
import { CRPAuto } from "../../canvas/CRPMgr.js";
import { CPaint } from "./CPaint.js";
export class CPaintTerrain extends CPaint {
    mTerrainOffset;
    mTerrainHeight;
    mLevel;
    mLevelRepeatCount;
    mLevelScale;
    mCellSize;
    mCellIndex;
    mSplatMapTexCodi;
    mHeightScale;
    mDefaultHeight;
    mCameraMain;
    constructor(_texture, _terrainOffset, _terrainHeight, _level, _levelRepeat, _levelScale, _cellSize, _cellIndex, _splatTexCodi, _defaultHeight) {
        super();
        this.SetTexture(_texture);
        this.mTerrainOffset = _terrainOffset;
        this.mTerrainHeight = new CVec1(_terrainHeight);
        this.mLevel = new CVec1(_level);
        this.mLevelRepeatCount = new CVec1(_levelRepeat);
        this.mLevelScale = new CVec1(_levelScale);
        this.mCellSize = new CVec1(_cellSize);
        this.mCellIndex = _cellIndex;
        this.mSplatMapTexCodi = _splatTexCodi;
        this.mHeightScale = new CVec1(1);
        this.mDefaultHeight = new CVec1(_defaultHeight);
        this.PushCShaderAttr(new CShaderAttr("terrainOffset", this.mTerrainOffset));
        this.PushCShaderAttr(new CShaderAttr("terrainHeight", this.mTerrainHeight));
        this.PushCShaderAttr(new CShaderAttr("level", this.mLevel));
        this.PushCShaderAttr(new CShaderAttr("levelRepeat", this.mLevelRepeatCount));
        this.PushCShaderAttr(new CShaderAttr("levelScale", this.mLevelScale));
        this.PushCShaderAttr(new CShaderAttr("cellSize", this.mCellSize));
        this.PushCShaderAttr(new CShaderAttr("splatMatTexCodi", this.mSplatMapTexCodi));
        this.PushCShaderAttr(new CShaderAttr("heightScale", this.mHeightScale));
    }
    Start() {
        super.Start();
        var cm = this.ProductMsg("SendGetCamera");
        cm.mInter = "canvas";
        cm.mMsgData[0] = this;
    }
    RecvGetCamera(_cam) {
        this.mCameraMain = _cam;
        this.PushCShaderAttr(new CShaderAttr("camMain", this.mCameraMain.GetEye()));
        this.MatUpdate();
    }
    MatUpdate() {
        this.mBound.mMin.x = -0.5;
        this.mBound.mMin.y = 0.0;
        this.mBound.mMin.z = -0.5;
        this.mBound.mMax.x = 0.5;
        this.mBound.mMax.y = 1.0;
        this.mBound.mMax.z = 0.5;
        const r = this.mCameraMain.GetEye().y / this.mDefaultHeight.x;
        this.mHeightScale.x = r < 1 ? 1 : Math.pow(2, Math.floor(Math.log2(r)));
        const cellCount = Math.round(Math.sqrt(this.GetOwner().GetFrame().Pal().Terrain().vertexCount)) - 1;
        this.mLMat.mF32A[0] = this.mCellSize.x * this.mLevelScale.x * this.mHeightScale.x * cellCount;
        this.mLMat.mF32A[5] = this.mTerrainHeight.x;
        this.mLMat.mF32A[10] = this.mCellSize.x * this.mLevelScale.x * this.mHeightScale.x * cellCount;
        this.mLMat.mF32A[12] = this.mCameraMain.GetEye().x + this.mCellIndex.x * this.mLMat.mF32A[0];
        this.mLMat.mF32A[14] = this.mCameraMain.GetEye().z + this.mCellIndex.z * this.mLMat.mF32A[10];
        this.mLMat.UnitCheck();
        this.mBound.MatCoordi(this.mLMat);
        this.mBW.mRadian = 0;
        this.UpdateLMat();
    }
    Update(_update) {
        if (this.mCameraMain != null) {
            if (this.mCameraMain.mUpdateMat == CUpdate.eType.Updated) {
                this.MatUpdate();
            }
        }
        super.Update(_update);
    }
    Render(_vf) {
        var barr = this.RenderBatch(_vf, 1);
        if (barr == null)
            return;
        this.mOwner.GetFrame().BMgr().BatchOn();
        this.Common(_vf);
        let wsa = new CShaderAttr("worldMat", this.GetFMat());
        switch (this.mWorldMatType) {
            case CMat.eType.Short2D:
                wsa.mKey = "worldMatShort";
                break;
        }
        wsa.mType = this.mWorldMatType;
        this.mOwner.GetFrame().BMgr().SetBatchSA(new CShaderAttr("worldMatType", new CVec1(this.mWorldMatType)));
        this.mOwner.GetFrame().BMgr().SetBatchSA(wsa);
        const cellCount = Math.round(Math.sqrt(this.GetOwner().GetFrame().Pal().Terrain().vertexCount)) - 1;
        this.mOwner.GetFrame().BMgr().SetBatchSA(new CShaderAttr("cellCount", new CVec1(cellCount)));
        this.mOwner.GetFrame().BMgr().SetBatchTex(this.mTextureKey);
        var dm = this.GetDrawMesh("Artgine/DM/GeoClipmap" + cellCount, _vf, this.mOwner.GetFrame().Pal().Terrain());
        this.mOwner.GetFrame().BMgr().SetBatchMesh(dm);
        barr[0] = this.mOwner.GetFrame().BMgr().BatchOff();
    }
    EmptyRPChk() {
        if (this.mRenderPass.length == 0) {
            this.mRenderPass = [new CRPAuto(this.mOwner.GetFrame().Pal().SlTerrainKey())];
        }
    }
}
