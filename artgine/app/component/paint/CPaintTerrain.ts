import {CUpdate} from "../../../basic/Basic.js";
import {CMat} from "../../../geometry/CMat.js";
import {CVec1} from "../../../geometry/CVec1.js";
import {CVec3} from "../../../geometry/CVec3.js";
import { CCamera } from "../../../render/CCamera.js";
import {CShader} from "../../../render/CShader.js";
import {CShaderAttr} from "../../../render/CShaderAttr.js";
import {CRPAuto} from "../../canvas/CRPMgr.js";
import {CPaint} from "./CPaint.js";

const gTerrainMat=new CMat();

export class CPaintTerrain extends CPaint
{
    override Icon(){ return "bi bi-tree"; }
    mTerrainOffset : CVec3;
    mTerrainHeight : CVec1;

    mLevel : CVec1;
    mLevelRepeatCount : CVec1; // 현재 레벨이 몇회 반복중인지
    mLevelScale : CVec1;       // 현재 레벨의 사이즈가 최소 셀사이즈보다 몇 배 큰지

    mCellSize : CVec1;
    mCellIndex : CVec3;

    mSplatMapTexCodi : CMat;

    mHeightScale : CVec1;
    mDefaultHeight : CVec1;

    mCameraMain : CCamera;
    
    constructor(
        _texture : string[],
        _terrainOffset : CVec3, _terrainHeight : number, 
        _level : number, _levelRepeat : number, _levelScale : number,
        _cellSize : number, _cellIndex : CVec3, _splatTexCodi : CMat,
        _defaultHeight : number,
    ) {
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

    override Start(): void 
    {
        super.Start();

        // 캔버스에 이벤트로 카메라 가져옴
        var cm = this.ProductMsg("SendGetCamera");
        cm.mInter="canvas";
        cm.mMsgData[0]=this;
    }

    RecvGetCamera(_cam : CCamera)
    {
        this.mCameraMain = _cam;
        this.PushCShaderAttr(new CShaderAttr("camMain", this.mCameraMain.GetEye()));
        this.MatUpdate();
    }

    MatUpdate()
    {
        this.mBound.mMin.x = -0.5;
        this.mBound.mMin.y = 0.0;
        this.mBound.mMin.z = -0.5;

        this.mBound.mMax.x = 0.5;
        this.mBound.mMax.y = 1.0;
        this.mBound.mMax.z = 0.5;

        // 카메라 높이에 따른 스케일 변경
        const r = this.mCameraMain.GetEye().y / this.mDefaultHeight.x;
        this.mHeightScale.x = r < 1 ? 1 : Math.pow(2, Math.floor(Math.log2(r)));

        const cellCount = Math.round(Math.sqrt(this.GetOwner().GetFrame().Pal().Terrain().vertexCount)) - 1;
        const lmat = gTerrainMat;

        lmat.mF32A[ 0] = this.mCellSize.x * this.mLevelScale.x * this.mHeightScale.x * cellCount;
        lmat.mF32A[ 5] = this.mTerrainHeight.x;
        lmat.mF32A[10] = this.mCellSize.x * this.mLevelScale.x * this.mHeightScale.x * cellCount;
        lmat.mF32A[12] = this.mCameraMain.GetEye().x + this.mCellIndex.x * lmat.mF32A[ 0];
        lmat.mF32A[14] = this.mCameraMain.GetEye().z + this.mCellIndex.z * lmat.mF32A[10];
        lmat.UnitCheck();

        this.SetFMat(lmat);
        this.mBound.MatCoordi(lmat);

        this.mBW.mRadian=0; // 업데이트용인가?

        this.UpdateFMat();
    }

    override Update(_update: CUpdate): void {}

    override Render(_vf: CShader): void {}

}
import CPaintTerrain_imple from "../../../app_imple/component/paint/CPaintTerrain.js";
CPaintTerrain_imple();
