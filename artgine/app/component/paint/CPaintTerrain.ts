import { CUpdate } from "../../../basic/Basic.js";
import {CMat} from "../../../geometry/CMat.js";
import {CVec1} from "../../../geometry/CVec1.js";
import {CVec3} from "../../../geometry/CVec3.js";
import { CVec4 } from "../../../geometry/CVec4.js";
import {CShader} from "../../../render/CShader.js";
import {CShaderAttr} from "../../../render/CShaderAttr.js";
import {CRPAuto} from "../../canvas/CRPMgr.js";
import {CPaint} from "./CPaint.js";

export class CPaintTerrain extends CPaint
{
    mLevel : CVec1;
    mLevelRepeatCount : CVec1; // 현재 레벨이 몇회 반복중인지

    mCellSize : CVec1;
    mCellScale : CVec1;
    mCellIndex : CVec3;
    mCellScaledSize : CVec1;

    mDefaultHeight : CVec1;

    mSplatMapTexCodi : CMat;

    mTerrainOffset : CVec3;
    mTerrainSize : CVec1;
    mTerrainHeight : CVec1;
    
    constructor(_texture : string[], _terrainOffset : CVec3, _terrainSize : number, _terrainHeight : number, _level : number, _levelRepeat : number, _cellSize : number, _cellIndex : CVec3, _cellScale : number, _defaultHeight : number, _splatTexCodi : CMat)
    {
        super();

        this.SetTexture(_texture);
        this.mTerrainOffset = _terrainOffset;
        this.mTerrainSize = new CVec1(_terrainSize);
        this.mTerrainHeight = new CVec1(_terrainHeight);
        this.mLevel = new CVec1(_level);
        this.mLevelRepeatCount = new CVec1(_levelRepeat);
        this.mCellSize = new CVec1(_cellSize);
        this.mCellScale = new CVec1(_cellScale);
        this.mCellScaledSize = new CVec1(_cellSize * _cellScale);

        this.mDefaultHeight = new CVec1(_defaultHeight);

        this.mCellIndex = _cellIndex;
        this.mSplatMapTexCodi = _splatTexCodi;

        this.PushCShaderAttr(new CShaderAttr("terrainOffset", this.mTerrainOffset));
        this.PushCShaderAttr(new CShaderAttr("terrainSize", this.mTerrainSize));
        this.PushCShaderAttr(new CShaderAttr("terrainHeight", this.mTerrainHeight));
        this.PushCShaderAttr(new CShaderAttr("level", this.mLevel));
        this.PushCShaderAttr(new CShaderAttr("levelRepeat", this.mLevelRepeatCount));
        this.PushCShaderAttr(new CShaderAttr("cellSize", this.mCellScaledSize));
        this.PushCShaderAttr(new CShaderAttr("splatMatTexCodi", this.mSplatMapTexCodi));
    }

    override Start(): void 
    {
        super.Start();
        this.MatUpdate();
    }

    MatUpdate(_camPos = new CVec3())
    {
        this.mBound.mMin.x = -0.5;
        this.mBound.mMin.y = 0.0;
        this.mBound.mMin.z = -0.5;

        this.mBound.mMax.x = 0.5;
        this.mBound.mMax.y = 1.0;
        this.mBound.mMax.z = 0.5;

        const cellCount = Math.round(Math.sqrt(this.GetOwner().GetFrame().Pal().Terrain().vertexCount)) - 1;

        this.mLMat.mF32A[ 0] = this.mCellScaledSize.x * cellCount;
        this.mLMat.mF32A[ 5] = this.mTerrainHeight.x;
        this.mLMat.mF32A[10] = this.mCellScaledSize.x * cellCount;
        this.mLMat.mF32A[12] = _camPos.x + this.mCellIndex.x * this.mLMat.mF32A[ 0];
        this.mLMat.mF32A[14] = _camPos.z + this.mCellIndex.z * this.mLMat.mF32A[10];
        this.mLMat.UnitCheck();

        this.mBound.MatCoordi(this.mLMat);

        this.mBW.mRadian=0; // 업데이트용인가?

        this.UpdateLMat();
    }

    Update(_update: CUpdate): void 
    {
        super.Update(_update);

        for(let renPt of this.mRenPT)
        {
            if(renPt.mCam.mShadow == true) continue;
            const cam = renPt.mCam;
            if(cam.mUpdateMat == CUpdate.eType.Updated)
            {
                // 카메라 높이에 따른 스케일 변경
                const heightStep : number = Math.floor(Math.log2(cam.GetEye().y / this.mDefaultHeight.x));
                const curScale : number = this.mCellSize.x * this.mCellScale.x * Math.max(1, Math.pow(2, heightStep)); // 1보다는 작지 않게 설정
                if(this.mCellScaledSize.x != curScale) {   // 스케일 변화 있을 때만 업데이트
                    this.mCellScaledSize.x = curScale;
                }

                // 카메라 이동에 따른 메시 중점 변경
                this.MatUpdate(cam.GetEye());
            }
        }
    }

    override Render(_vf: CShader): void {
        var barr=this.RenderBatch(_vf,1);
		if(barr==null)	return;

        this.mOwner.GetFrame().BMgr().BatchOn();
		this.Common(_vf);

        let wsa=new CShaderAttr("worldMat", this.GetFMat());
        switch(this.mWorldMatType)
        {
            case CMat.eType.Short2D:	wsa.mKey="worldMatShort";	break;
        }
        wsa.mType=this.mWorldMatType;
        this.mOwner.GetFrame().BMgr().SetBatchSA(new CShaderAttr("worldMatType",new CVec1(this.mWorldMatType)));
        this.mOwner.GetFrame().BMgr().SetBatchSA(wsa);

        const cellCount = Math.round(Math.sqrt(this.GetOwner().GetFrame().Pal().Terrain().vertexCount)) - 1;
        this.mOwner.GetFrame().BMgr().SetBatchSA(new CShaderAttr("cellCount",new CVec3(cellCount, 0, cellCount)));

        // 그림자의 renPt가 아니라 현재 카메라 넣어줌
        for(let renPt of this.mRenPT) {
            if(renPt.mCam.mShadow == true) break;
            this.mOwner.GetFrame().BMgr().SetBatchSA(new CShaderAttr("camCanv",renPt.mCam.GetEye()));
            break;
        }

        this.mOwner.GetFrame().BMgr().SetBatchTex(this.mTextureKey);
        var dm=this.GetDrawMesh("Artgine/DM/GeoClipmap",_vf,this.mOwner.GetFrame().Pal().Terrain());
		this.mOwner.GetFrame().BMgr().SetBatchMesh(dm);

        barr[0]=this.mOwner.GetFrame().BMgr().BatchOff();
    }

    override EmptyRPChk(): void {
        if(this.mRenderPass.length==0)
        {
            const rp = new CRPAuto(this.mOwner.GetFrame().Pal().SlTerrainKey());
            //this.PushTag("geoclip");
            this.mRenderPass=[rp];
        }
    }
}