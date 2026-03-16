import { CUpdate } from "../../basic/Basic.js";
import { CBlackBoard } from "../../basic/CBlackBoard.js";
import { CDOM } from "../../basic/CDOM.js";
import { CBlackBoardRef, CObject, CPointer } from "../../basic/CObject.js";
import { CBound } from "../../geometry/CBound.js";
import { CMath } from "../../geometry/CMath.js";
import { CPoolGeo } from "../../geometry/CPoolGeo.js";
import { CVec2 } from "../../geometry/CVec2.js";
import { CVec3 } from "../../geometry/CVec3.js";
import { CVec4 } from "../../geometry/CVec4.js";

import { CSampler, CSamplerMinMax } from "../../util/CSampler.js";
import { CCIndex } from "../canvas/CCIndex.js";
import { CCollider } from "../component/CCollider.js";
import { CPaint } from "../component/paint/CPaint.js";
import { CPaint2DMerge } from "../component/paint/CPaint2D.js";
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
    mCollider : CCollider=null;
}
export class CDensityInfo2D extends CDensityInfo
{ 
    constructor(_color : number,_size : CVec3,_tex : string,_codi : CSampler<CVec4>=null)
    {
        super(_color,_size);
        

        this.mTexture=_tex;
        this.mCodi=_codi;
    }
    mTexture : string;
    
    mCodi : CSampler<CVec4>;
    mYSort=false;
    
}
export class CDensityMap extends CSubject
{
    mBuf : CMapBuf=new CMapBuf();
    mDensityArr =new Array<CDensityInfo>();
    PushDensityInfo<T extends CDensityInfo>(_density : T)
    {
        this.mDensityArr.push(_density);
        return _density;
    }
        override Update(_update : CUpdate)
    {
        if(this.FindComp(CPaint) != null) return;
 
        const worldW = this.mBuf.mCount.x * this.mBuf.mSize;
        const worldH = this.mBuf.mCount.y * this.mBuf.mSize;
 
        for(let density of this.mDensityArr)
        {
            const cellW = density.mSize.x;
            const cellH = density.mSize.y;
            if(cellW <= 0 || cellH <= 0) continue;
 
            const countX = Math.floor(worldW / cellW);
            const countY = Math.floor(worldH / cellH);
 
            // 상위 24비트 RGB 비교
            const targetRGB = (density.mColor & 0xFFFFFF00) >>> 0;
 
            const positions : CVec3[] = [];
            const codis     : CVec4[] = [];
 
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
 
                    positions.push(new CVec3(worldX, worldY, 0));
                    if(density instanceof CDensityInfo2D)
                    {
                        if(density.mCodi != null) codis.push(density.mCodi.Excute());
                    }
                }
            }
 
            if(positions.length == 0) continue;
 
            const matList = [];
            let scale = CPoolGeo.ProductV3();
            let rotation=CPoolGeo.ProductV3();
            for(let i = 0; i < positions.length; i++)
            {
                if(density instanceof CDensityInfo2D)
                {
                    
                    let SamScale = density.mSca.Excute();
                    let rotation=new CVec3();
                    if(density.mPos!=null)  CMath.V3AddV3(positions[i],density.mPos.Excute(),positions[i]);
                    if(density.mSca!=null)  CMath.V3MulV3(density.mSize,SamScale,scale);
                    if(density.mRot!=null)  rotation=density.mRot.Excute();

                    const scaMat = CMath.MatScale(scale);
                    const rotMat = CMath.MatRotation(rotation);
                    const mat    = CMath.MatMul(scaMat, rotMat);
                    mat.SetV3(3, positions[i]);
                    matList.push(mat);

                    if(density.mCollider!=null)
                    {
                        let cl=density.mCollider.Export();
                        let bound=cl.GetBound();
                        
                        CMath.V3MulV3(bound.mMin,SamScale,bound.mMin);
                        CMath.V3MulV3(bound.mMax,SamScale,bound.mMax);
                        bound.AddPos(positions[i]);
                        this.PushComp(cl);
                    }
                    
                }
            }
            CPoolGeo.RecycleV3(scale);
            CPoolGeo.RecycleV3(rotation);
 
            if(density instanceof CDensityInfo2D)
            {
                const ptMerge = new CPaint2DMerge(density.mTexture, matList, codis);
                ptMerge.SetYSort(density.mYSort);
                if(density.mWind > 0) ptMerge.Wind(density.mWind);
                this.PushComp(ptMerge);
            }
        }
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

