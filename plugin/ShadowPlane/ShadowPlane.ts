import { CUpdate } from "../../artgine/basic/Basic.js";
import { CClass } from "../../artgine/basic/CClass.js";
import { CConsol } from "../../artgine/basic/CConsol.js";
import { CObject, CPointer } from "../../artgine/basic/CObject.js";
import { CUtilObj } from "../../artgine/basic/CUtilObj.js";
import { CAlpha, CColor } from "../../artgine/canvas/component/CColor.js";
import { CLight } from "../../artgine/canvas/component/CLight.js";
import { CPaint } from "../../artgine/canvas/component/paint/CPaint.js";
import { CPaint2D } from "../../artgine/canvas/component/paint/CPaint2D.js";
import { CPaint3D } from "../../artgine/canvas/component/paint/CPaint3D.js";
import { CRPAuto } from "../../artgine/canvas/CRPMgr.js";
import { CBound } from "../../artgine/geometry/CBound.js";
import { CMat } from "../../artgine/geometry/CMat.js";
import { CMath } from "../../artgine/geometry/CMath.js";
import { CPoolGeo } from "../../artgine/geometry/CPoolGeo.js";
import { CVec1 } from "../../artgine/geometry/CVec1.js";
import { CVec2 } from "../../artgine/geometry/CVec2.js";
import { CVec3 } from "../../artgine/geometry/CVec3.js";
import { CVec4 } from "../../artgine/geometry/CVec4.js";
import { CCamera } from "../../artgine/render/CCamera.js";
import { CRenderPass } from "../../artgine/render/CRenderPass.js";
import { CShader } from "../../artgine/render/CShader.js";
import { CShaderAttr } from "../../artgine/render/CShaderAttr.js";
import { CTexture, CTextureInfo } from "../../artgine/render/CTexture.js";
import { SDF } from "../../artgine/z_file/SDF.js";

class CProjectedArea
{
    m_points : CVec3[] = [];
    m_size : CVec2 = new CVec2();
    m_maxDistFromBound : number = 0;
}

function ProjectPointsOntoPlane(_corners : CVec3[], _planePos : CVec3, _planeNor : CVec3) : CVec3[] {
    const n = CMath.V3Nor(_planeNor);
    return _corners.map(p => {
        const v = CMath.V3SubV3(p, _planePos);
        const dist = CMath.V3Dot(v, n);
        return CMath.V3SubV3(p, CMath.V3MulFloat(n, dist));
    });
}

function GetUVBasis(_planeNor : CVec3) : {uVec : CVec3, vVec : CVec3} {
    const n = CMath.V3Nor(_planeNor);
    const arbitrary = Math.abs(n.y) < 0.99 ? new CVec3(0, 1, 0) : new CVec3(0, 0, 1);
    const uVec = CMath.V3Nor(CMath.V3Cross(arbitrary, n));
    const vVec = CMath.V3Nor(CMath.V3Cross(n, uVec));
    return { uVec, vVec };
}

function Compute2DBounds(_coords : {u : number, v : number}[]) : {minU : number, maxU : number, minV : number, maxV : number} {
    let minU = Number.MAX_SAFE_INTEGER, maxU = Number.MIN_SAFE_INTEGER;
    let minV = Number.MAX_SAFE_INTEGER, maxV = Number.MIN_SAFE_INTEGER;
    for (const uv of _coords) {
        minU = Math.min(minU, uv.u);
        maxU = Math.max(maxU, uv.u);
        minV = Math.min(minV, uv.v);
        maxV = Math.max(maxV, uv.v);
    }
    return { minU, maxU, minV, maxV };
}

function Convert2DTo3D(_boundingBox2D : {u : number, v : number}[], _planePos : CVec3, _uVec : CVec3, _vVec : CVec3) : CVec3[] {
    return _boundingBox2D.map(({u, v}) => 
        CMath.V3AddV3(_planePos, CMath.V3AddV3(CMath.V3MulFloat(_uVec, u), CMath.V3MulFloat(_vVec, v)))
    );
}

function RaycastPointToPlane(p: CVec3, dir: CVec3, planePos: CVec3, planeNor: CVec3): CVec3 | null {
    const denom = CMath.V3Dot(planeNor, dir);
    if (Math.abs(denom) < 1e-6) return null; // 평면과 평행
    const t = CMath.V3Dot(CMath.V3SubV3(planePos, p), planeNor) / denom;
    if (t < 0) return null; // 반대 방향
    return CMath.V3AddV3(p, CMath.V3MulFloat(dir, t));
}

function ComputeShadowAreaOntoPlane(_bound: CBound, _planeNor: CVec3, _planePos: CVec3, _ligDir: CVec3): CProjectedArea {
    const corners: CVec3[] = [
        new CVec3(_bound.mMin.x, _bound.mMin.y, _bound.mMin.z),
        new CVec3(_bound.mMin.x, _bound.mMin.y, _bound.mMax.z),
        new CVec3(_bound.mMin.x, _bound.mMax.y, _bound.mMin.z),
        new CVec3(_bound.mMin.x, _bound.mMax.y, _bound.mMax.z),
        new CVec3(_bound.mMax.x, _bound.mMin.y, _bound.mMin.z),
        new CVec3(_bound.mMax.x, _bound.mMin.y, _bound.mMax.z),
        new CVec3(_bound.mMax.x, _bound.mMax.y, _bound.mMin.z),
        new CVec3(_bound.mMax.x, _bound.mMax.y, _bound.mMax.z),
    ];

    const ligDir = CMath.V3MulFloat(CMath.V3Nor(_ligDir), -1); // 빛 방향의 반대 (빛이 닿는 방향으로 ray 쏨)
    const { uVec, vVec } = GetUVBasis(_planeNor);
    const hitPoints: CVec3[] = [];

    for (const corner of corners) {
        const hit = RaycastPointToPlane(corner, ligDir, _planePos, _planeNor);
        if (hit) hitPoints.push(hit);
    }

    if (hitPoints.length === 0) {
        // 그림자가 평면에 닿지 않음
        return new CProjectedArea(); 
    }

    const uvCoords = hitPoints.map(p => {
        const rel = CMath.V3SubV3(p, _planePos);
        return {
            u: CMath.V3Dot(rel, uVec),
            v: CMath.V3Dot(rel, vVec),
        };
    });

    const { minU, maxU, minV, maxV } = Compute2DBounds(uvCoords);

    const boundingBox2D = [
        { u: maxU, v: minV },
        { u: minU, v: minV },
        { u: maxU, v: maxV },
        { u: minU, v: maxV },
    ];

    const boundingBox3D = Convert2DTo3D(boundingBox2D, _planePos, uVec, vVec);

    // 🔹 최대 거리 계산
    let maxDist = 0;
    for (const pCorner of corners) {
        for (const pShadow of boundingBox3D) {
            const dist = CMath.V3Distance(pCorner, pShadow);
            if (dist > maxDist) maxDist = dist;
        }
    }

    const area = new CProjectedArea();
    area.m_points = boundingBox3D;
    area.m_size = new CVec2(maxU - minU, maxV - minV);
    area.m_maxDistFromBound = maxDist;
    return area;
}

function ComputeProjectionArea(_bound : CBound, _planeNor : CVec3, _planePos : CVec3) : CProjectedArea {
    const corners : CVec3[] = [
        new CVec3(_bound.mMin.x, _bound.mMin.y, _bound.mMin.z),
        new CVec3(_bound.mMin.x, _bound.mMin.y, _bound.mMax.z),
        new CVec3(_bound.mMin.x, _bound.mMax.y, _bound.mMin.z),
        new CVec3(_bound.mMin.x, _bound.mMax.y, _bound.mMax.z),
        new CVec3(_bound.mMax.x, _bound.mMin.y, _bound.mMin.z),
        new CVec3(_bound.mMax.x, _bound.mMin.y, _bound.mMax.z),
        new CVec3(_bound.mMax.x, _bound.mMax.y, _bound.mMin.z),
        new CVec3(_bound.mMax.x, _bound.mMax.y, _bound.mMax.z),
    ];

    const { uVec, vVec } = GetUVBasis(_planeNor);
    const projectedPoints = ProjectPointsOntoPlane(corners, _planePos, _planeNor);

    const uvCoords = projectedPoints.map(p => {
        const rel = CMath.V3SubV3(p, _planePos);
        return {
            u: CMath.V3Dot(rel, uVec),
            v: CMath.V3Dot(rel, vVec),
        };
    });

    const { minU, maxU, minV, maxV } = Compute2DBounds(uvCoords);

    const boundingBox2D = [
        { u: maxU, v: minV },
        { u: minU, v: minV },
        { u: maxU, v: maxV },
        { u: minU, v: maxV },
    ];

    const boundingBox3D = Convert2DTo3D(boundingBox2D, _planePos, uVec, vVec);

    const area = new CProjectedArea();
    area.m_points = boundingBox3D;
    area.m_size = new CVec2(maxU - minU, maxV - minV);
    return area;
}

function Smoothstep(_edge0 : number, _edge1 : number, _x : number) {
    let t = CMath.Clamp((_x - _edge0) / (_edge1 - _edge0), 0.0, 1.0);
    return t * t * (3.0 - 2.0 * t);
}

function LightFalloff(_dist : number, _inner : number, _outer : number) {
    if(_dist <= _inner) return 1.0;
    if(_dist >= _outer) return 0.0;

    let t = (_dist - _inner) / (_outer - _inner);
    return 1.0 - Smoothstep(0.0, 1.0, t);
}

export class CShadowPlane extends CPaint2D
{
    //public
    public mShadowLen : number = 1;        // 2d에서는 그림자 길이, 3d에서는 그림자 월드좌표 y값
    public mShadowAlpha : number = 0.5;   // 그림자 투명도
    //public mUpdateShadow : boolean = true;

    //private
    private mPTKey : string;
    private mLIGKeys : string[];

    private mPT : CPaint;
    private mLIG : CLight;
    private mLIGSet : Set<CLight> = new Set();
    mUpdateLight=true;
    mUpdateShadow=true;

    mCenter=new CVec3();

     constructor(_ptKey : string = null, _ligKeys : string[] = []) {
        super();
        this.mPTKey = _ptKey;
        this.mLIGKeys = _ligKeys;

        this.PushCShaderAttr(new CShaderAttr("alphaCut", 0.001));
        this.SetColorModel(new CColor(0,0,0,CColor.eModel.RGBMul));
        this.SetAlphaModel(new CAlpha(this.mShadowAlpha,CAlpha.eModel.Mul));
        this.PushTag("shadowPlane");
        this.SetPosList([new CVec3(), new CVec3(), new CVec3(), new CVec3()]);
        
    }
    override IsShould(_member: string, _type: CObject.eShould) 
    {
        const hide = [
            "mPT", "mLIG", "mLIGSet", "mUpdateLight","mUpdateShadow"
        ];
        if(hide.includes(_member)) return false;
        return super.IsShould(_member, _type);
    }

    override EditChange(_pointer : CPointer,_childe : boolean)
    {
        super.EditChange(_pointer,_childe);
        let change = [
            "mShadowLen", "mShadowAlpha", "mPTKey", "mLIGKeys"
        ];
        if(change.includes(_pointer.member)) {
			this.mUpdateLight=true;
            this.mUpdateShadow=true;
		}
    }
    Update(_delay: any): void 
    {
        if(this.mPT==null || this.mPT.Key()!=this.mPTKey)
        {
            
            const owner = this.GetOwner();
            if(owner == null) return;

            for(const pt of owner.FindComps(CPaint)) {
                if(pt instanceof CShadowPlane) continue;
                if(pt.GetBound().GetType() == CBound.eType.Null) continue;
                if(pt.IsUpdateFMat()) continue;
                if(pt instanceof CPaint3D && !pt.mTree) continue;



                
                this.mPT = pt;
                this.BatchClear();
                this.mUpdateShadow=true;

                if(this.mPT instanceof CPaint2D)
                    this.SetSize(this.mPT.GetSize());
                
                break;
            }
            if(this.mPT!=null)  this.mPTKey=this.mPT.Key();
        }  
        if(this.mPT==null) return;

        //light
        for(let lig of this.mLIGSet) {
            if(!lig.GetOwner() || lig.GetOwner().GetFrame() == null || lig.IsDestroy() || lig.IsEnable()==false || lig.IsColorZero()) 
            {
                if(this.mLIG==lig)  this.mLIG=null;
                this.mLIGSet.delete(lig);
                this.mUpdateLight=true;
            }
        }
        
        if(this.mUpdateLight)
        {
            this.mUpdateLight=false;
            

            const center = this.GetPaintCenter();
            //let pick: Array<{ light: CLight; dist: number }>=[];

            let minLen=Number.MAX_SAFE_INTEGER;

            if(this.mLIG!=null)
            {
                if(this.mLIG.IsPointLight())
                    minLen = CMath.V3Distance(this.mLIG.GetDirectPos(), center);
                else
                    minLen=0;
                    
            }
            


            for(let lig of this.mLIGSet) 
            {
                //if(lig.IsEnable()==false || lig.IsColorZero())    continue;
                if(this.mLIGKeys.length>0)
                {
                     if(this.mLIGKeys.includes(lig.Key()) || this.mLIGKeys.includes(lig.GetOwner().Key())){}
                     else   continue;
                }
                let len=0;
                if(lig.IsPointLight())
                {
                    len = CMath.V3Distance(lig.GetDirectPos(), center);
                }
                if(minLen>len)
                {
                    if(this.mLIG!=lig)  
                    {
                        this.BatchClear();
                        this.mUpdateShadow=true;
                    }
                        
                    
                    this.mLIG=lig;
                    minLen=len;
                }
                

            }
        }
        if(this.mLIG==null) return;

        this.UpdateShadow();
        super.Update(_delay);

    }
    private UpdateShadow() 
    {
        if(this.mPT instanceof CPaint2D) 
        {
            const pt = this.mPT as CPaint2D;
            const lig = this.mLIG;

            
            this.SetTexture(pt.GetTexture());
            this.SetTexCodi(pt.GetTexCodi());

            if(this.mUpdateShadow==false && pt.IsUpdateFMat()==false && lig.mUpdate==0)   return;
            

            
            this.mUpdateShadow=false;

            const fBound = pt.GetBoundFMat();
            

            const p1 = new CVec3(fBound.mMin.x, fBound.mMin.y);
            const p2 = new CVec3(fBound.mMax.x, fBound.mMin.y);

            let dir=new CVec3(0, 1, 0);

            const c = this.GetPaintCenter();

            let height : number;
            let alpha : number;
            if(lig.IsPointLight()) 
            {
                if(this.mLIG!=null)
                    dir=CMath.V3Nor(CMath.V3SubV3(c, this.mLIG.GetDirectPos()));
                const inner = lig.GetInRadius();
                const outer = lig.GetOutRadius();
                const dist = CMath.V3Distance(c, lig.GetDirectPos());
                
                alpha = LightFalloff(dist, inner, outer);

                if(this.mShadowLen == 0) {
                    height = (outer - dist);
                }
                else {
                    height = fBound.GetSize().y * this.mShadowLen;
                }
            }
            else {
                if(this.mLIG!=null)
                    dir=CMath.V3Nor(this.mLIG.GetDirectPos());
                alpha = 1;
                height = fBound.GetSize().y * this.mShadowLen;
            }

            //alpha
            if(lig.IsColorZero()) alpha=0;
            
            let dot=CMath.V3Dot(new CVec3(0,1,0),dir);
            dot*=0.1;
            if(dot>0)
                dir=CMath.V3MulFloat(dir,1+dot);
            const p1Far = CMath.V3AddV3(p1, CMath.V3MulFloat(dir, height));
            const p2Far = CMath.V3AddV3(p2, CMath.V3MulFloat(dir, height));

            const ptFMat = CMath.MatMul(pt.GetLMat(), pt.GetOwner().GetWMat());
            const posOffset = new CVec3(ptFMat.x, ptFMat.y);
            CMath.V3SubV3(p1, posOffset, p1);
            CMath.V3SubV3(p2, posOffset, p2);
            CMath.V3SubV3(p1Far, posOffset, p1Far); 
            CMath.V3SubV3(p2Far, posOffset, p2Far);

            const lmat = pt.GetLMat().Export();
            lmat.z -= CPaint2D.mYSortZShift * 2.0 / (CPaint2D.mYSortRange.y - CPaint2D.mYSortRange.x);   // z fighting 막기 위해 조금 뒤로 보냄

            
           
            this.mAutoLoad.Import(pt.mAutoLoad);
            if(pt.GetTag().has("wind") && pt instanceof CPaint2D) {
                if(this.mTag.has("wind")==false)
                    this.BatchClear();
                
                this.PushTag("wind");
                this.mWindInfluence.x = pt.mWindInfluence instanceof CVec1 ? pt.mWindInfluence.x : pt.mWindInfluence;
            }
            if(pt.mYSort)
            {
                this.SetYSort(true);
                this.SetYSortOrigin(this.mYSortOrigin+1);
            }
                

            this.SetPosList([p1Far,p2Far,p1,p2]);
            this.SetLMat(lmat);
            this.SetAlphaModel(new CAlpha(alpha * this.mShadowAlpha, CAlpha.eModel.Mul));
            
        }
        else if(this.mPT instanceof CPaint3D) 
        {
            const pt = this.mPT as CPaint3D;
            const lig = this.mLIG;

            const ligDir = CMath.V3Nor(lig.GetDirectPos());
            
            const fBound = this.mPT.GetBoundFMat();
            const fCenter = fBound.GetCenter();

            const floorDist = ((5 + this.mShadowLen) - fCenter.y) / ligDir.y;
            const shadowPlanePos : CVec3 = CMath.V3AddV3(fCenter, CMath.V3MulFloat(ligDir, floorDist));
            const area = ComputeShadowAreaOntoPlane(fBound, new CVec3(0, 1, 0), shadowPlanePos, ligDir);

            if(this.mUpdateShadow==false && pt.IsUpdateFMat()==false && lig.mUpdate==0)   return;
            this.mUpdateShadow = false;

            const points = area.m_points;
            points.forEach(p => CMath.V3SubV3(p, this.GetOwner().GetPos(), p));

            this.SetPosList(points);
            this.mUpdateLMat = true;

            this.CaptureShadow();

            this.SetAlphaModel(new CAlpha(this.mShadowAlpha, CAlpha.eModel.Mul));
        }
    }
    private CaptureShadow() {
        const pt = this.mPT as CPaint3D;
        const lig = this.mLIG;

        const fw = this.GetOwner().GetFrame();

        const bound = pt.GetBound();
        const center = bound.GetCenter();

        const ligDir = new CVec3(0, 1, 0);//CMath.V3Nor(lig.GetDirectPos());
        const eye = CMath.V3AddV3(center, CMath.V3MulFloat(ligDir, bound.GetOutRadius()));

        const shadowPlanePos : CVec3 = CMath.V3AddV3(center, ligDir);
        const area = ComputeShadowAreaOntoPlane(pt.GetBound(), ligDir, shadowPlanePos, ligDir);

        let texKey = pt.Key() + "_Shadow.tex";
        this.SetTexture(texKey);
        if(fw.Res().Find(texKey) != null) return;

        fw.Ren().BuildRenderTarget(
            [new CTextureInfo(CTexture.eTarget.Sigle,CTexture.eFormat.RGBA8)], 
            // new CVec2(Math.floor(area.m_size.x), Math.floor(area.m_size.y)), 
            new CVec2(512, 512),
            texKey
        );
        let tex = fw.Res().Find(texKey) as CTexture;
        tex.SetAutoResize(false);

        const cam = new CCamera(fw.PF());
        cam.SetSize(area.m_size.x, area.m_size.y);
        cam.Init(eye, CMath.V3SubV3(eye, ligDir));
        cam.ResetOrthographic();
        cam.Update(1);

        const tempRP = new CRenderPass();
        // tempRP.m_cullFace = CRenderPass.eCull.None;
        tempRP.mBlend[2] = CRenderPass.eBlend.ONE;
        tempRP.mBlend[3] = CRenderPass.eBlend.ZERO;
        tempRP.mBlend[4] = CRenderPass.eBlend.ONE;
        tempRP.mBlend[5] = CRenderPass.eBlend.ZERO;

        // 위에서 만든 텍스쳐에 위의 카메라로 랜더링
        const beforeRP = fw.Dev().ChangeRenderPass(tempRP);
        fw.Dev().SetClearColor(true, new CVec4(0.5,0.5,0.5,0));
        fw.Ren().Begin(tex);
        
        const vf = fw.Res().Find(fw.Pal().Sl3D().GetShader("3DSkinC").mKey) as CShader;

        fw.Ren().UseShader(vf);

        // fw.Ren().BMgr().SetValue(vf,"colorModel",this.GetColorModel());
        // fw.Ren().BMgr().SetValue(vf,"alphaModel",this.GetAlphaModel());
        fw.Ren().SendGPU(vf,new CMat(),"worldMat");
        fw.Ren().SendGPU(vf,cam.GetViewMat(),"viewMat");
        fw.Ren().SendGPU(vf,cam.GetProjMat(),"projectMat");

        if(pt.mMeshRes.skin.length > 0) {
            fw.Ren().SendGPU(vf,  pt.mWeightMat,"weightArrMat", 16);
            fw.Ren().SendGPU(vf,  pt.mSkinType,"skin");
        }
        else {
            fw.Ren().SendGPU(vf,  SDF.eSkin.None,"skin");
        }

        fw.Ren().SendGPU(vf,[fw.Pal().GetBlackTex()]);

        let nodeOff = 0;
        let node = pt.mTreeNode;
        while(node.Size()!=nodeOff) {
            const nodemp = node.Find(nodeOff);
            if (nodemp.md.mData != null && nodemp.md.mData.ci != null) {
                fw.Ren().SendGPU(vf,nodemp.mpi.mData.pst,"worldMat");
                const meshDraw = pt.GetDrawMesh(pt.mMesh + nodemp.md.mKey, vf, nodemp.md.mData.ci);
                this.GetOwner().GetFrame().Ren().MeshDrawNodeRender(vf, meshDraw);
            }
            nodeOff++;
        }

        fw.Ren().End(tex);
        fw.Dev().ChangeRenderPass(beforeRP);
    }
    private GetPaintCenter() {
        if(!this.mPT) return;
        if(this.mPT instanceof CPaint2D) {
            const fBound = this.mPT.GetBoundFMat();
            let p1=CPoolGeo.ProductV3();
            let p2=CPoolGeo.ProductV3();
            p1.mF32A[0]=fBound.mMin.mF32A[0];
            p1.mF32A[1]=fBound.mMin.mF32A[1];
            p1.mF32A[2]=0;
            p2.mF32A[0]=fBound.mMax.mF32A[0];
            p2.mF32A[1]=fBound.mMax.mF32A[1];
            p2.mF32A[2]=0;
            CMath.V3AddV3(p1, p2,this.mCenter);
            CPoolGeo.RecycleV3(p1);
            CPoolGeo.RecycleV3(p2);
            CMath.V3MulFloat(this.mCenter, 0.5,this.mCenter);
            return this.mCenter;
        }
        else {
            return this.mPT.GetBoundFMat().GetCenter();
        }
    }
    SetLight(_light: CLight): void {
        if(this.mLIGSet.has(_light)==false)
        {
            this.mLIGSet.add(_light);
            this.mUpdateLight=true;
        }   
    }
    
}
CClass.Push(CShadowPlane);