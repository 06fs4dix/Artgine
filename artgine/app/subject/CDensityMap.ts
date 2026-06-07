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
import { CColor } from "../../render/CColor.js";
import { CMesh } from "../../render/CMesh.js";
import { CMeshCopyNode } from "../../render/CMeshCopyNode.js";
import { CMeshTreeUpdate } from "../../render/CMeshTreeUpdate.js";

import { CSampler, CSampMinMax } from "../../util/CSampler.js";

import { CCIndex } from "../canvas/CCIndex.js";
import { CCollider } from "../component/CCollider.js";
import { CPaint } from "../component/paint/CPaint.js";
import { CPaint2DMerge } from "../component/paint/CPaint2D.js";
import { CPaint3DMerge } from "../component/paint/CPaint3D.js";
import { CMapBuf, IMapLabel, IMapSchema } from "./CMapBuf.js";
import { CSubject } from "./CSubject.js";

export class CDensityInfo extends CObject implements IMapLabel
{ 
    constructor(_color : number,_size : CVec3)
    {
        super();
        if(_color == null || _color <= 0) {
            const r = Math.floor(Math.random() * 256);
            const g = Math.floor(Math.random() * 256);
            const b = Math.floor(Math.random() * 256);
            this.mColor = ((r << 24) | (g << 16) | (b << 8) | 0x00) >>> 0;
        } else {
            this.mColor = (_color & 0xFFFFFF00) >>> 0;
        }
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
    mBound : CBound=null;
    mPaintTag=new Array<string>();
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
export class CDensityMap extends CSubject implements IMapSchema
{
    
    mBuf : CMapBuf=new CMapBuf();
    mDensityArr =new Array<CDensityInfo>();
    mDiv : number = 100; 
    mUpdate=true;

    override IsShould(_member: string, _type: CObject.eShould): boolean {

        if(_member=="mUpdate")    return false;
        return super.IsShould(_member,_type);
    }
    MapLog(): string {
        let json={};
		json["countX"]=this.mBuf.mCount.x;
		json["countY"]=this.mBuf.mCount.y;
		json["countZ"]=this.mBuf.mCount.z;
		json["size"]=this.mBuf.mSize;

		json["labelArr"]=new Array();

        
		let size=new CVec3(this.mBuf.mSize,this.mBuf.mSize,this.mBuf.mSize);
		for(let tile of this.mDensityArr)
		{
			json["labelArr"].push({"label":tile.Label(),"color":CColor.HexToRGB(tile.Color(),true).ToHex(),"sizeX":size.x,"sizeY":size.y,"sizeZ":size.z});
		}

		return JSON.stringify(json);
    }
    PushDensityInfo<T extends CDensityInfo>(_density : T)
    {
        this.mDensityArr.push(_density);
        return _density;
    }
    override Push<T>(_obj: T): T {
        if(_obj instanceof CDensityInfo)
            this.PushDensityInfo(_obj);
        return super.Push(_obj);
    }

    override Update(_update : CUpdate)
    {
        if(this.mUpdate==false) return;

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

        for(let density of this.mDensityArr)
        {
            const cellW = density.mSize.x;
            const cellH = density.mSize.y;
            if(cellW <= 0 || cellH <= 0) continue;

            const countX = Math.floor(worldW / cellW);
            const countY = Math.floor(worldH / cellH);

            // CVoxelMap 방식: mDiv = 청크당 cell 수
            const div    = Math.max(1, this.mDiv);
            const cntX   = Math.ceil(countX / div);
            const cntY   = Math.ceil(countY / div);
            const chunkCount = cntX * cntY;

            const targetRGB = (density.mColor & 0xFFFFFF00) >>> 0;

            const matLists  : CMat[][]   = Array.from({length: chunkCount}, () => []);
            const codiLists : CVec4[][]  = Array.from({length: chunkCount}, () => []);
            const meshLists : string[][] = Array.from({length: chunkCount}, () => []);

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
                    const worldX = (cx + 0.5) * cellW;
                    const worldY = (cy + 0.5) * cellH;

                                    
                    const eps = 0.01;
                    const checkPoints : [number,number][] = [
                        [worldX,                        worldY                       ], // 중심
                        [cx * cellW + eps,              cy * cellH + eps             ], // 좌상
                        [(cx+1) * cellW - eps,          cy * cellH + eps             ], // 우상
                        [cx * cellW + eps,              (cy+1) * cellH - eps         ], // 좌하
                        [(cx+1) * cellW - eps,          (cy+1) * cellH - eps         ], // 우하
                    ];

                    let anyMatch = false;
                    for(const [wx, wy] of checkPoints)
                    {
                        const bx = Math.floor(wx / this.mBuf.mSize);
                        const by = Math.floor(wy / this.mBuf.mSize);
                        const idx = new CCIndex(bx, by, 0);
                        if(this.mBuf.IndexOut(idx)) continue;
                        if((this.mBuf.RGB(idx) as number) === targetRGB) { anyMatch = true; break; }
                    }
                    if(!anyMatch) continue;

                    // CVoxelMap과 동일: cell 인덱스 기반 청크 결정
                    const chunkX   = Math.min(Math.floor(cx / div), cntX - 1);
                    const chunkY   = Math.min(Math.floor(cy / div), cntY - 1);
                    const chunkIdx = chunkX + chunkY * cntX;

                    let pos = new CVec3();

                    if(density instanceof CDensityInfo2D)
                    {
                        pos.x=worldX;
                        pos.y=worldY;
                        let SamScale = new CVec3(1,1,1);
                        if(density.mSca != null) SamScale = density.mSca.Execute();
                        let rot = new CVec3();
                        if(density.mPos != null) CMath.V3AddV3(pos, density.mPos.Execute(), pos);
                        CMath.V3MulV3(density.mSize, SamScale, scale);
                        if(density.mRot != null) rot = density.mRot.Execute();

                        const scaMat = CMath.MatScale(scale);
                        const rotMat = CMath.MatRotation(rot);
                        const mat    = CMath.MatMul(scaMat, rotMat);
                        mat.SetV3(3, pos);
                        matLists[chunkIdx].push(mat);

                        if(density.mCodi != null) codiLists[chunkIdx].push(density.mCodi.Execute());
                    }
                    else
                    {
                        pos.x=worldX;
                        pos.z=worldY;
                        let rot = new CVec3();
                        if(density.mPos != null) CMath.V3AddV3(pos, density.mPos.Execute(), pos);
                        if(density.mSca != null) scale.Import(density.mSca.Execute());
                        else { scale.x=1; scale.y=1; scale.z=1; }
                        if(density.mRot != null) rot = density.mRot.Execute();

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
                        const mList   = matLists[chunkIdx];
                        const lastMat = mList[mList.length - 1];

                        let cl = new CCollider();
                        cl.SetLayer(density.mColliderLayer);
                        let cbound = new CBound();
                        cbound.SetType(CBound.eType.Box);
                        const srcBound = density.mBound ?? bound;
                        CMath.V3MulMatCoordi(srcBound.mMin, lastMat, cbound.mMin);
                        CMath.V3MulMatCoordi(srcBound.mMax, lastMat, cbound.mMax);
                        cl.InitBound(cbound);
                        cl.SetEvent(CCollider.eEvent.Static);
                        this.PushComp(cl);
                    }
                }
            }

            CPoolGeo.RecycleV3(scale);
            CPoolGeo.RecycleV3(rotation);

            let ptMerge : CPaint;
            for(let ci = 0; ci < chunkCount; ci++)
            {
                if(matLists[ci].length == 0) continue;

                if(density instanceof CDensityInfo2D)
                {
                    const ptMerge2D = new CPaint2DMerge(density.mRes, matLists[ci], codiLists[ci]);
                    ptMerge2D.SetYSort(density.mYSort);
                    if(density.mWind > 0) ptMerge2D.Wind(density.mWind);
                    this.PushComp(ptMerge2D);
                    ptMerge=ptMerge2D;
                }
                else
                {
                    const ptMerge3D = new CPaint3DMerge(meshLists[ci], matLists[ci]);
                    if(density.mWind > 0) ptMerge3D.Wind(density.mWind);
                    this.PushComp(ptMerge3D);
                    ptMerge=ptMerge3D;
                }
                for(let tag of density.mPaintTag)
                    ptMerge.PushTag(tag);
            }
        }//density
        this.mUpdate=false;
    }
    override SetPos(_pos : CVec3,_reset=true)
    {
        super.SetPos(_pos,_reset);
        this.mUpdate=true;
        this.RemoveComps(CPaint2DMerge);
        this.RemoveComps(CPaint3DMerge);
        this.RemoveComps(CCollider);
    }
    override EditHTMLInit(_div: HTMLDivElement): void {
        super.EditHTMLInit(_div);
        var button=document.createElement("button");
        button.innerText="BufferTool";
        button.onclick=()=>{
            window["BufferTool"](this.mBuf.mBuffer,this.mBuf.mCount,this.mDensityArr,this.mBuf.mSize,false,true).then(()=>{
                this.SetPos(this.GetPos());

            });
        };
        _div.append(button);
    }
}