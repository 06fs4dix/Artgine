import { CUpdate } from "../../basic/Basic.js";
import { CObject } from "../../basic/CObject.js";
import { CTree } from "../../basic/CTree.js";
import { CBound } from "../../geometry/CBound.js";
import { CMat } from "../../geometry/CMat.js";
import { CMath } from "../../geometry/CMath.js";
import { CPoolGeo } from "../../geometry/CPoolGeo.js";
import { CVec3 } from "../../geometry/CVec3.js";
import { CVec4 } from "../../geometry/CVec4.js";
import { CColor } from "../../render/CColor.js";
import { CMesh } from "../../render/CMesh.js";
import { CMeshCopyNode } from "../../render/CMeshCopyNode.js";
import { CMeshTreeUpdate } from "../../render/CMeshTreeUpdate.js";
import { CShaderAttr } from "../../render/CShaderAttr.js";
import { CSampler } from "../../util/CSampler.js";
import { CCIndex } from "../canvas/CCIndex.js";
import { CCollider } from "../component/CCollider.js";
import { CPaint2DMerge } from "../component/paint/CPaint2D.js";
import { CPaint3DMerge } from "../component/paint/CPaint3D.js";
import { CMapBuf, IMapLabel, IMapSchema } from "./CMapBuf.js";
import { CSubject } from "./CSubject.js";
import { CTerrainMap } from "./CTerrainMap.js";

export class CDensityInfo extends CObject implements IMapLabel
{ 
    constructor(_color : number,_size : CVec3,_res : string)
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
        this.mRes=_res;
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
    
    // 배치 관련 변수
    mLabel="";
    mSize : CVec3;
    mColor : number;
    mPos : CSampler<CVec3>=null;
    mSca : CSampler<CVec3>=null;
    mRot : CSampler<CVec3>=null;

    // 배치된 페인트 관련 변수
    mRes="";
    mWind=0;
    mColorModel: CColor;
    mPaintTag=new Array<string>();
    mPaintShaderAttr=new Array<CShaderAttr>();
    
    // 배치된 콜라이더 관련 변수
    mColliderLayer : string=null;
    mColliderBound : CBound=null;
}
export class CDensityInfo2D extends CDensityInfo
{ 
    constructor(_color : number,_size : CVec3,_tex : string,_codi : CSampler<CVec4>=null)
    {
        super(_color,_size,_tex);
        this.mCodi=_codi;
    }
    mCodi : CSampler<CVec4>;
    mYSort=false;
}
export class CDensityInfo3D extends CDensityInfo
{ 
    constructor(_color : number,_size : CVec3,_mesh : string)
    {
        super(_color,_size,_mesh);
    }
}
export class CDensityMap extends CSubject implements IMapSchema
{
    mBuf : CMapBuf=new CMapBuf();
    mDensityArr =new Array<CDensityInfo>();
    mDiv : number = 100;
    mUpdate=true;
    mTerrain:CTerrainMap=null;

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

            const pos      = CPoolGeo.ProductV3();
            const scale    = CPoolGeo.ProductV3();
            const rotation = CPoolGeo.ProductV3();
            const cbound   = CPoolGeo.ProductBound();
            cbound.SetType(CBound.eType.Box);

            const rMat     = CPoolGeo.ProductMat();
            const sMat     = CPoolGeo.ProductMat();

            const bound    = new CBound();
            bound.SetType(CBound.eType.Box);
            if(density instanceof CDensityInfo2D)
            {
                bound.InitBound(0.5);
            }
            else
            {
                const mesh  = this.GetFrame().Res().Find(density.mRes) as CMesh;
                const dummy = new CTree<CMeshCopyNode>();
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

                    // TRS 생성
                    pos.Zero();
                    if(density.mPos != null) CMath.V3AddV3(pos, density.mPos.Execute(), pos);
                    if(density.mSca != null) scale.Import(density.mSca.Execute());
                    else { scale.x=1; scale.y=1; scale.z=1; }
                    if(density.mRot != null) rotation.Import(density.mRot.Execute());
                    else rotation.Zero();
                    if(density instanceof CDensityInfo2D)
                    {
                        if(this.mTerrain != null) {
                            pos.x += worldX; pos.z += worldY;
                            pos.y += this.mTerrain.GetHeight(pos.x, pos.z);
                        }
                        else {
                            pos.x += worldX;
                            pos.y += worldY;
                        }
                    }
                    else
                    {
                        const size    = bound.GetSize();
                        scale.x *= density.mSize.x / size.x;
                        scale.y *= density.mSize.y / size.y;
                        scale.z *= density.mSize.z / size.z;

                        pos.x += worldX; pos.z += worldY;
                        CMath.V3SubV3(pos, bound.GetCenter(), pos); // 오브젝트 중심이 포지션으로 가도록 이동
                        if(this.mTerrain != null) {
                            pos.y += this.mTerrain.GetHeight(pos.x, pos.z);
                        }
                    }
                    const trsMat = CMath.MatMul(CMath.MatScale(scale, sMat), CMath.MatRotation(rotation, rMat));
                    trsMat.SetV3(3, pos);
                    matLists[chunkIdx].push(trsMat);

                    // 콜라이더 생성
                    if(density.mColliderLayer != null)
                    {
                        const cl = this.PushComp(new CCollider());
                        cl.SetLayer(density.mColliderLayer);
                        cl.SetEvent(CCollider.eEvent.Static);   // density는 안움직임

                        const srcBound = density.mColliderBound ?? bound;
                        CMath.V3MulMatCoordi(srcBound.mMin, trsMat, cbound.mMin);
                        CMath.V3MulMatCoordi(srcBound.mMax, trsMat, cbound.mMax);

                        if(density instanceof CDensityInfo2D)
                        {
                            const xHalf = (cbound.mMax.x - cbound.mMin.x) * 0.5;
                            const yHalf = (cbound.mMax.y - cbound.mMin.y) * 0.5;
                            const zHalf = Math.max(xHalf, Math.abs(yHalf));
                            const zCenter = (cbound.mMin.z + cbound.mMax.z) * 0.5;
                            cbound.mMin.z = zCenter - zHalf;
                            cbound.mMax.z = zCenter + zHalf;
                        }
                        cl.InitBound(cbound);
                    }

                    // 이외 리스트 생성
                    if(density instanceof CDensityInfo2D)
                    {
                        if(density.mCodi != null) codiLists[chunkIdx].push(density.mCodi.Execute());
                    }
                    else
                    {
                        meshLists[chunkIdx].push(density.mRes);
                    }
                }
            }

            CPoolGeo.RecycleV3(pos);
            CPoolGeo.RecycleV3(scale);
            CPoolGeo.RecycleV3(rotation);
            CPoolGeo.RecycleBound(cbound);
            CPoolGeo.RecycleMat(sMat);
            CPoolGeo.RecycleMat(rMat);

            // 페인트 생성
            let ptMerge : CPaint2DMerge|CPaint3DMerge;
            for(let ci = 0; ci < chunkCount; ci++)
            {
                if(matLists[ci].length == 0) continue;

                if(density instanceof CDensityInfo2D)
                {
                    ptMerge = this.PushComp(new CPaint2DMerge(density.mRes, matLists[ci], codiLists[ci]));
                    ptMerge.SetYSort(density.mYSort);
                }
                else
                {
                    ptMerge = this.PushComp(new CPaint3DMerge(meshLists[ci], matLists[ci]));
                }

                if(density.mWind > 0) ptMerge.Wind(density.mWind);
                if(density.mColorModel!=null) ptMerge.SetColorModel(density.mColorModel);
                for(let tag of density.mPaintTag)
                    ptMerge.PushTag(tag);
                for(let shaderAttr of density.mPaintShaderAttr)
                    ptMerge.PushCShaderAttr(shaderAttr);
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