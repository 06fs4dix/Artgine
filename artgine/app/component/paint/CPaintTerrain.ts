import { CUpdate } from "../../../basic/Basic.js";
import { CAlert } from "../../../basic/CAlert.js";
import {CArray} from "../../../basic/CArray.js";
import { CConsol } from "../../../basic/CConsol.js";
import { CHash } from "../../../basic/CHash.js";
import { CObject, CPointer } from "../../../basic/CObject.js";
import {CString} from "../../../basic/CString.js";
import {CTree} from "../../../basic/CTree.js";
import { CBound } from "../../../geometry/CBound.js";
import {CMat} from "../../../geometry/CMat.js";
import {CMath} from "../../../geometry/CMath.js";
import { CRay } from "../../../geometry/CRay.js";
import { CUtilMath } from "../../../geometry/CUtilMath.js";
import {CVec1} from "../../../geometry/CVec1.js";
import { CVec2 } from "../../../geometry/CVec2.js";
import { CVec3 } from "../../../geometry/CVec3.js";
import { CVec4 } from "../../../geometry/CVec4.js";
import { CBatch } from "../../../render/CBatchMgr.js";
import { CColor } from "../../../render/CColor.js";
import {CDevice} from "../../../render/CDevice.js";
import {CMesh} from "../../../render/CMesh.js";
import { CMeshCopyNode } from "../../../render/CMeshCopyNode.js";
import { CMeshCreateInfo } from "../../../render/CMeshCreateInfo.js";
import { CMeshDataNode } from "../../../render/CMeshDataNode.js";
import { CMeshDrawNode } from "../../../render/CMeshDrawNode.js";
import {CMeshPaint} from "../../../render/CMeshPaint.js";
import {CMeshTreeUpdate} from "../../../render/CMeshTreeUpdate.js";
import { CRenderPass } from "../../../render/CRenderPass.js";

import {CShader, CVertexFormat} from "../../../render/CShader.js";
import {CShaderAttr} from "../../../render/CShaderAttr.js";
import { CTexture } from "../../../render/CTexture.js";
import { CUtilRender } from "../../../render/CUtilRender.js";
import { SDF } from "../../../z_file/SDF.js";
import { CBrush } from "../../canvas/CBrush.js";
import { CRPAuto } from "../../canvas/CRPMgr.js";
import {CSubject} from "../../subject/CSubject.js";
import {CBrushComp} from "../CBrushComp.js";
import {CPaint} from "./CPaint.js";



export class CPaintTerrain extends CPaint
{
    mLevel : number;
    mCellSize : CVec1;
    mCellIndex : CVec3;

    mSplatMapTexCodi : CMat;

    mTerrainOffset : CVec3;
    mTerrainSize : CVec3;

    mLevelRepeatCount : CVec1; // 현재 레벨이 몇회 반복중인지
    
    constructor(_texture : string[], _terrainOffset : CVec3, _terrainSize : CVec3, _level : number, _levelRepeat : number, _cellSize : number, _index : CVec3, _splatTexCodi : CMat)
    {
        super();

        this.mAutoLoad.mWrap=CTexture.eWrap.Repeat;
        this.mAutoLoad.mMipMap=CTexture.eMipmap.GL;

        this.SetTexture(_texture);
        this.mLevel = _level;
        this.mLevelRepeatCount = new CVec1(_levelRepeat);
        this.mCellSize = new CVec1(_cellSize);
        this.mTerrainOffset = _terrainOffset;
        this.mTerrainSize = _terrainSize;
        this.mCellIndex = _index;
        this.mSplatMapTexCodi = _splatTexCodi;

        
        this.PushTag("bilinear");
        // this.PushTag("triplanar");

        this.PushCShaderAttr(new CShaderAttr("terrainOffset", this.mTerrainOffset));
        this.PushCShaderAttr(new CShaderAttr("terrainSize", this.mTerrainSize));
        this.PushCShaderAttr(new CShaderAttr("cellSize", this.mCellSize));
        this.PushCShaderAttr(new CShaderAttr("level", this.mLevel));
        this.PushCShaderAttr(new CShaderAttr("levelRepeat", this.mLevelRepeatCount));
        this.PushCShaderAttr(new CShaderAttr("splatMatTexCodi", this.mSplatMapTexCodi));
    }

    override Start(): void {
        super.Start();

        this.MatUpdate();
    }

    MatUpdate()
    {
        this.mBound.mMin.x = -0.5;
        this.mBound.mMin.y = -0.5;
        this.mBound.mMin.z = -0.5;

        this.mBound.mMax.x = 0.5;
        this.mBound.mMax.y = 0.5;
        this.mBound.mMax.z = 0.5;

        const cellCount = Math.round(Math.sqrt(this.GetOwner().GetFrame().Pal().Terrain().vertexCount)) - 1;

        this.mLMat.mF32A[ 0] = this.mCellSize.x * cellCount;
        this.mLMat.mF32A[ 5] = this.mTerrainSize.y;
        this.mLMat.mF32A[10] = this.mCellSize.x * cellCount;
        this.mLMat.mF32A[12] = this.mCellIndex.x * this.mLMat.mF32A[ 0];
        this.mLMat.mF32A[14] = this.mCellIndex.z * this.mLMat.mF32A[10];
        this.mLMat.UnitCheck();

        this.mBound.MatCoordi(this.mLMat);

        this.mBound.mMin.y = 0.0;
        this.mBound.mMax.y = this.mTerrainSize.y;

        this.mBW.mRadian=0; // 업데이트용인가?

        this.UpdateLMat();
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