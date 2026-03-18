import { CUpdate } from "../../basic/Basic.js";
import { CArray } from "../../basic/CArray.js";
import { CBlackBoard } from "../../basic/CBlackBoard.js";
import { CConsol } from "../../basic/CConsol.js";
import { CDOM } from "../../basic/CDOM.js";
import { CBlackBoardRef, CObject, CPointer } from "../../basic/CObject.js";
import { CTree } from "../../basic/CTree.js";
import { CBound } from "../../geometry/CBound.js";
import { CMat } from "../../geometry/CMat.js";
import { CMath } from "../../geometry/CMath.js";
import { COctree, COctreeData, COctreeMgr } from "../../geometry/COctree.js";
import { CPoolGeo } from "../../geometry/CPoolGeo.js";
import { CUtilMath } from "../../geometry/CUtilMath.js";
import { CVec2 } from "../../geometry/CVec2.js";
import { CVec3 } from "../../geometry/CVec3.js";
import { CVec4 } from "../../geometry/CVec4.js";
import { CMesh } from "../../render/CMesh.js";
import { CMeshCopyNode } from "../../render/CMeshCopyNode.js";
import { CMeshTreeUpdate } from "../../render/CMeshTreeUpdate.js";

import { CSampler, CSamplerMinMax } from "../../util/CSampler.js";

import { CCIndex } from "../canvas/CCIndex.js";
import { CCollider } from "../component/CCollider.js";
import { CPaint } from "../component/paint/CPaint.js";
import { CPaint2DMerge } from "../component/paint/CPaint2D.js";
import { CPaint3DMerge } from "../component/paint/CPaint3D.js";
import { CMapBuf, IMapLabel } from "./CMapBuf.js";
import { CSubject } from "./CSubject.js";

export class CDensityInfo extends CObject implements IMapLabel
{ 
    constructor(_color : number,_size : CVec3)
    {
        super();
        this.mColor=_color;
        this.mSize=_size;
    }
    Label(): string {
        return this.mLabel;
    }
    Color(): number {
        return this.mColor;
    }
    Size(): CVec3 {
        return this.mSize;
    }
    
    mLabel="";
    mSize : CVec3;
    mColor : number;
    mWind=0;
    mPos : CSampler<CVec3>=null;
    mSca : CSampler<CVec3>=null;
    mRot : CSampler<CVec3>=null;
    mColliderLayer : string=null;
    mRes="";
}
export class CDensityInfo2D extends CDensityInfo
{ 
    constructor(_color : number,_size : CVec3,_tex : string,_codi : CSampler<CVec4>=null)
    {
        super(_color,_size);
        this.mRes=_tex;
        this.mCodi=_codi;
    }
    mCodi : CSampler<CVec4>;
    mYSort=false;
}
export class CDensityInfo3D extends CDensityInfo
{ 
    constructor(_color : number,_size : CVec3,_mesh : string)
    {
        super(_color,_size);
        this.mRes=_mesh;
    }
}
export class CDensityMap extends CSubject
{
    mBuf : CMapBuf=new CMapBuf();
    mDensityArr =new Array<CDensityInfo>();
    mDiv : number = 2;  // 청크 분할 수 (1=단일, 2=2×2=4청크, 4=4×4=16청크)

    PushDensityInfo<T extends CDensityInfo>(_density : T)
    {
        this.mDensityArr.push(_density);
        return _density;
    }
    override Update(_update : CUpdate)
    {
        if(this.FindComp(CPaint) != null) return;

        // 리소스 로드 체크
        for(let density of this.mDensityArr)
        {
            if(this.GetFrame().Res().Find(density.mRes)==null)
            {
                this.GetFrame().Load().Exe(density.mRes);
                return;
            }
        }

        const worldW = this.mBuf.mCount.x * this.mBuf.mSize;
        const worldH = this.mBuf.mCount.y * this.mBuf.mSize;

        const div       = Math.max(1, this.mDiv);
        const chunkW    = worldW / div;
        const chunkH    = worldH / div;
        const chunkCount = div * div;

        for(let density of this.mDensityArr)
        {
            const cellW = density.mSize.x;
            const cellH = density.mSize.y;
            if(cellW <= 0 || cellH <= 0) continue;

            const countX = Math.floor(worldW / cellW);
            const countY = Math.floor(worldH / cellH);

            const targetRGB = (density.mColor & 0xFFFFFF00) >>> 0;

            // 청크별 배열
            const matLists  : CMat[][]    = Array.from({length: chunkCount}, () => []);
            const codiLists : CVec4[][]   = Array.from({length: chunkCount}, () => []);
            const meshLists : string[][]  = Array.from({length: chunkCount}, () => []);

            let scale    = CPoolGeo.ProductV3();
            let rotation = CPoolGeo.ProductV3();
            let bound    = new CBound();
            bound.SetType(CBound.eType.Box);
            if(density instanceof CDensityInfo2D)
            {
                bound.InitBound(0.5);
            }
            else
            {
                let mesh  = this.GetFrame().Res().Find(density.mRes) as CMesh;
                let dummy = new CTree<CMeshCopyNode>();
                dummy.mData = new CMeshCopyNode();
                CMeshTreeUpdate.TreeCopy(mesh.meshTree, dummy, new CMat(), bound);
            }

            for(let cx = 0; cx < countX; cx++)
            {
                for(let cy = 0; cy < countY; cy++)
                {
                    // 셀 중심 월드 좌표
                    const worldX = (cx + 0.5) * cellW;
                    const worldY = (cy + 0.5) * cellH;

                    // 버퍼 인덱스 변환
                    const bx = Math.floor(worldX / this.mBuf.mSize);
                    const by = Math.floor(worldY / this.mBuf.mSize);

                    const idx = new CCIndex(bx, by, 0);
                    if(this.mBuf.IndexOut(idx)) continue;

                    const rgb = this.mBuf.RGB(idx) as number;
                    if(rgb !== targetRGB) continue;

                    // 청크 인덱스 결정
                    const chunkX   = Math.min(Math.floor(worldX / chunkW), div - 1);
                    const chunkY   = Math.min(Math.floor(worldY / chunkH), div - 1);
                    const chunkIdx = chunkX + chunkY * div;

                    let pos = new CVec3(worldX, worldY, 0);

                    if(density instanceof CDensityInfo2D)
                    {
                        let SamScale = new CVec3(1,1,1);
                        if(density.mSca != null) SamScale = density.mSca.Excute();
                        let rot = new CVec3();
                        if(density.mPos != null) CMath.V3AddV3(pos, density.mPos.Excute(), pos);
                        CMath.V3MulV3(density.mSize, SamScale, scale);
                        if(density.mRot != null) rot = density.mRot.Excute();

                        const scaMat = CMath.MatScale(scale);
                        const rotMat = CMath.MatRotation(rot);
                        const mat    = CMath.MatMul(scaMat, rotMat);
                        mat.SetV3(3, pos);
                        matLists[chunkIdx].push(mat);

                        if(density.mCodi != null) codiLists[chunkIdx].push(density.mCodi.Excute());
                    }
                    else
                    {
                        let rot = new CVec3();
                        if(density.mPos != null) CMath.V3AddV3(pos, density.mPos.Excute(), pos);
                        if(density.mSca != null) scale.Import(density.mSca.Excute());
                        else { scale.x=1; scale.y=1; scale.z=1; }
                        if(density.mRot != null) rot = density.mRot.Excute();

                        CMath.V3AddV3(pos, CMath.V3MulFloat(bound.GetCenter(), -1), pos);

                        let size    = bound.GetSize();
                        let maxSize = CMath.Max(CMath.Max(size.x, size.y), size.z);
                        scale.x *= density.mSize.x / maxSize;
                        scale.y *= density.mSize.y / maxSize;
                        scale.z *= density.mSize.z / maxSize;

                        const scaMat = CMath.MatScale(scale);
                        const rotMat = CMath.MatRotation(rot);
                        const mat    = CMath.MatMul(scaMat, rotMat);
                        mat.SetV3(3, pos);
                        matLists[chunkIdx].push(mat);
                        meshLists[chunkIdx].push(density.mRes);
                    }

                    if(density.mColliderLayer != null)
                    {
                        const mList  = matLists[chunkIdx];
                        const lastMat = mList[mList.length - 1];

                        let cl = new CCollider();
                        cl.SetLayer(density.mColliderLayer);
                        let cbound = new CBound();
                        cbound.SetType(CBound.eType.Box);
                        CMath.V3MulMatCoordi(bound.mMin, lastMat, cbound.mMin);
                        CMath.V3MulMatCoordi(bound.mMax, lastMat, cbound.mMax);
                        cl.InitBound(cbound);
                        cl.SetEvent(CCollider.eEvent.Static);
                        this.PushComp(cl);
                    }
                }
            }

            CPoolGeo.RecycleV3(scale);
            CPoolGeo.RecycleV3(rotation);

            // 청크별 컴포넌트 생성
            for(let ci = 0; ci < chunkCount; ci++)
            {
                if(matLists[ci].length == 0) continue;

                if(density instanceof CDensityInfo2D)
                {
                    const ptMerge = new CPaint2DMerge(density.mRes, matLists[ci], codiLists[ci]);
                    ptMerge.SetYSort(density.mYSort);
                    if(density.mWind > 0) ptMerge.Wind(density.mWind);
                    this.PushComp(ptMerge);
                }
                else
                {
                    const ptMerge = new CPaint3DMerge(meshLists[ci], matLists[ci]);
                    this.PushComp(ptMerge);
                }
            }
        }
    }
    override SetPos(_pos : CVec3,_reset=true)
    {
        super.SetPos(_pos,_reset);
        this.RemoveComps(CPaint2DMerge);
        this.RemoveComps(CPaint3DMerge);
        this.RemoveComps(CCollider);
    }
    override EditHTMLInit(_div: HTMLDivElement): void {
        super.EditHTMLInit(_div);
        var button=document.createElement("button");
        button.innerText="BufferTool";
        button.onclick=()=>{
            window["BufferTool"](this.mBuf.mBuffer,this.mBuf.mCount).then(()=>{
                this.RemoveComps(CPaint2DMerge);
            });
        };
        _div.append(button);
    }
}