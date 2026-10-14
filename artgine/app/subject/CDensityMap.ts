import { CUpdate } from "../../basic/Basic.js";
import { CBlackBoardRef, CObject } from "../../basic/CObject.js";
import { CTree } from "../../basic/CTree.js";
import { CBound } from "../../geometry/CBound.js";
import { CMat } from "../../geometry/CMat.js";
import { CMath } from "../../geometry/CMath.js";
import { CPoolGeo } from "../../geometry/CPoolGeo.js";
import { CVec3 } from "../../geometry/CVec3.js";
import { CVec4 } from "../../geometry/CVec4.js";
import { CCamera } from "../../render/CCamera.js";
import { CColor } from "../../render/CColor.js";
import { CMesh } from "../../render/CMesh.js";
import { CMeshCopyNode } from "../../render/CMeshCopyNode.js";
import { CMeshTreeUpdate } from "../../render/CMeshTreeUpdate.js";
import { CShaderAttr } from "../../render/CShaderAttr.js";
import { CSampler } from "../../util/CSampler.js";
import { CCIndex } from "../canvas/CCIndex.js";
import { CCollider } from "../component/CCollider.js";
import { CComponent } from "../component/CComponent.js";
import { CPaint2D, CPaint2DMerge } from "../component/paint/CPaint2D.js";
import { CPaint3D, CPaint3DMerge } from "../component/paint/CPaint3D.js";
import { CMapBuf, IMapLabel, IMapSchema } from "./CMapBuf.js";
import { CPaint } from "../component/paint/CPaint.js";
import { CUtilRender } from "../../render/CUtilRender.js";
import { CSubject } from "./CSubject.js";
import { CSubjectMap } from "./CSubjectMap.js";
import { CTerrainMap } from "./CTerrainMap.js";

// AddLODLevel에 넘기는 값. 리터럴로 넘겨도 되고, 안에서 CLODInfo로 바꿔 담는다.
export interface ILODInfo
{
    mRes?: string;
    mAmount?: number;
    mDistance?: number;
    mHysteresis?: number;
    mPaintTag?: string[];
    mPaintShaderAttr?: CShaderAttr[];
    //이 레벨만의 바람 세기. 생략(-1)하면 CDensityInfo.mWind. 3D 메시와 2D 빌보드는 같은 값에도 흔들림 크기가 달라 따로 준다
    mWind?: number;
}
// CObject여야 CDensityInfo.mLODInfo가 JSON 저장·로드에 포함된다(아니면 배열이 비어서 저장된다).
export class CLODInfo extends CObject implements ILODInfo
{
    mRes?: string;
    mAmount?: number;
    mDistance?: number;
    mHysteresis?: number;
    mPaintTag?=new Array<string>();
    mPaintShaderAttr?=new Array<CShaderAttr>();
    mWind?=-1;
    constructor(_res:string=null,_amount:number=1,_dist:number=0,_hysteresis:number=0,_paintTag:string[]=[],_paintShaderAttr:CShaderAttr[]=[]) {
        super();
        this.mRes=_res;
        this.mAmount=_amount;
        this.mDistance=_dist;
        this.mHysteresis=_hysteresis;
        this.mPaintTag=_paintTag;
        this.mPaintShaderAttr=_paintShaderAttr;
    }
}
export class CDensityColliderInfo extends CObject
{
    mLayer : string="";
    mBound : CBound=null;

    constructor(_layer : string="",_bound : CBound=null)
    {
        super();
        this.mLayer=_layer;
        this.mBound=_bound;
    }
}
export class CDensityInfo extends CObject implements IMapLabel
{
    // 배치 관련 변수
    mLabel="";
    mSize : CVec3;
    mColor : number;
    mPos : CSampler<CVec3>=null;
    mSca : CSampler<CVec3>=null;
    mRot : CSampler<CVec3>=null;
    mBottomPos : boolean = false;

    // 배치된 페인트 관련 변수
    mWind=0;
    mColorModel: CColor;
    mCodi : CSampler<CVec4>=null; // 2D LOD 레벨 전용: 텍스처 아틀라스 좌표
    mYSort=false;                  // 2D LOD 레벨 전용: Paint Y정렬

    // 배치된 콜라이더 관련 변수
    mCollider=new Array<CDensityColliderInfo>();

    // LOD 정보
    mLODInfo: CLODInfo[] = [];

    constructor(_color : number,_size : CVec3,_lodInfo : ILODInfo[]=null)
    {
        super();
        this.mColor = CDensityInfo.ResolveColor(_color);
        this.mSize=_size;
        if(_lodInfo!=null) this.AddLODLevel(_lodInfo);
    }
    private static ResolveColor(color: number): number
    {
        if (color == null || color <= 0)
        {
            const r = Math.floor(Math.random() * 256);
            const g = Math.floor(Math.random() * 256);
            const b = Math.floor(Math.random() * 256);
            return ((r << 24) | (g << 16) | (b << 8) | 0x00) >>> 0;
        }
        return (color & 0xFFFFFF00) >>> 0;
    }

    Label(): string { return this.mLabel; }
    Color(): number { return this.mColor; }
    Size(): CVec3 { return this.mSize; }

    /** 단일 LOD 레벨을 개별로 추가 */
    AddLODLevel(_res : string, _distance? : number, _hysteresis?: number, _amount?:number);
    /** 여러 LOD 레벨을 한번에 추가 */
    AddLODLevel(_lodInfo : ILODInfo[]);
    AddLODLevel(
        _resOrList : string|ILODInfo[],
        _distance = 0,
        _hysteresis = 0,
        _amount = 1
    ): void
    {
        if(Array.isArray(_resOrList))
        {
            for(const info of _resOrList)
            {
                const lod = new CLODInfo(
                    info.mRes ?? null,
                    info.mAmount ?? 1,
                    info.mDistance ?? 0,
                    info.mHysteresis ?? 0,
                    info.mPaintTag ?? [],
                    info.mPaintShaderAttr ?? []
                );
                lod.mWind = info.mWind ?? -1;
                this.InsertLODInfo(lod);
            }
            return;
        }
        this.InsertLODInfo(new CLODInfo(_resOrList as string, _amount as number, Math.abs(_distance as number), _hysteresis as number));
    }

    // Distance 오름차순으로 정렬된 위치에 삽입
    private InsertLODInfo(_info : CLODInfo)
    {
        const insertIndex = this.mLODInfo.findIndex(existing => _info.mDistance < existing.mDistance);
        const index = insertIndex === -1 ? this.mLODInfo.length : insertIndex;
        this.mLODInfo.splice(index, 0, _info);
    }
}

class CLODGroup
{
    mDensity : CDensityInfo = null;
    // undefined : 아직 안 만든 레벨, null : 만들 것이 없는 레벨
    mPtMergeArr = new Array<CPaint2DMerge | CPaint3DMerge | null | undefined>();
    mMatArr : CMat[] = null;
    mCodiArr : CVec4[] = null;
    mCurLODLevel = 0;
    mPrevLODLevel = 0;
}

export class CChunk
{
    // 이 청크의 월드 경계
    mBound : CBound;

    private mOwner : CDensityMap;
    private mInit : boolean = true;
    private mPending : boolean = false;
    private mGroupArr = new Array<CLODGroup>();

    constructor(_owner : CDensityMap, _bound : CBound)
    {
        this.mOwner = _owner;
        this.mBound = _bound;
    }

    IsEmpty() { return this.mGroupArr.length == 0; }

    Update(_camera : CCamera)
    {
        if(_camera == null) return;
        if(this.mBound == null) return;
        if(this.mInit != true && this.mPending != true && _camera.mUpdateMat == CUpdate.eType.Not) return;
        if(this.mInit == true) this.mInit = false;
        this.mPending = false;

        const dist = this.ComputeCameraDistance(_camera);
        for (const group of this.mGroupArr)
        {
            this.UpdateGroupLOD(group, dist);
        }
    }
    private PushComp<T extends CComponent>(_com : T) : T
    {
        return this.mOwner.PushChunkComp(_com);
    }
    private GetFrame() { return this.mOwner.GetFrame(); }
    private ComputeCameraDistance(_camera : CCamera): number
    {
        const eye = _camera.GetEye();
        const center = CPoolGeo.ProductV3();
        center.x = CMath.Clamp(eye.x, this.mBound.mMin.x, this.mBound.mMax.x);
        center.y = CMath.Clamp(eye.y, this.mBound.mMin.y, this.mBound.mMax.y);
        center.z = CMath.Clamp(eye.z, this.mBound.mMin.z, this.mBound.mMax.z);

        const dist = CMath.V3Distance(eye, center);
        CPoolGeo.RecycleV3(center);
        return dist;
    }
    private UpdateGroupLOD(_group: CLODGroup, _dist: number): void
    {
        const lodInfo = _group.mDensity.mLODInfo;
        let level = 0;
        for (let i = lodInfo.length - 1; i >= 0; i--)
        {
            let edge = lodInfo[i].mDistance;
            // 현재 레벨이면 히스테리시스만큼 경계를 당겨서 플리커링 방지
            if (i <= _group.mCurLODLevel)
            {
                edge = Math.max(0, edge - lodInfo[i].mHysteresis);
            }
            if (_dist >= edge)
            {
                level = i;
                break;
            }
        }

        // Enable이 false로 바뀌면 다음 프레임에 랜더링이 꺼지는데
        // Enable이 true로 바뀌면 2프레임 뒤에 랜더링이 되어서 1프레임 지연해서 끔
        const prevMerge = _group.mPtMergeArr[_group.mPrevLODLevel];
        if (_group.mPrevLODLevel != _group.mCurLODLevel && prevMerge != null)
        {
            if (prevMerge.IsEnable() == true) prevMerge.SetEnable(false);
        }

        _group.mPrevLODLevel = _group.mCurLODLevel;

        if (_group.mPtMergeArr[level] === undefined)
        {
            const info = _group.mDensity.mLODInfo[level];
            if (info.mRes != null && this.mOwner.TakeLODBuild() == false)
            {
                this.mPending = true;
                return;
            }
            _group.mPtMergeArr[level] = this.BuildLevelMerge(_group.mDensity, info, _group.mMatArr, _group.mCodiArr);
        }
        _group.mCurLODLevel = level;

        const curMerge = _group.mPtMergeArr[level];
        if (level >= 0 && curMerge != null)
        {
            if (curMerge.IsEnable() == false) curMerge.SetEnable(true);
        }
    }

    // group - lod paints
    Build()
    {
        this.mGroupArr = [];

        if(this.mOwner.mBuf == null || this.mOwner.mDensityArr == null) return;

        for(let density of this.mOwner.mDensityArr)
        {
            const group = this.BuildGroup(density);
            if(group != null) this.mGroupArr.push(group);
        }

        if(this.mOwner.mBoundXZ)
        {
            [this.mBound.mMin.y, this.mBound.mMin.z] = [this.mBound.mMin.z, this.mBound.mMin.y];
            [this.mBound.mMax.y, this.mBound.mMax.z] = [this.mBound.mMax.z, this.mBound.mMax.y];
            //바꾼 y는 0~0이라 지형 높이가 빠진다. LOD 거리를 3D로 재므로 높은 지형에선 카메라 높이만큼 거리가 부풀어
            //바로 옆 배치물도 LOD 경계를 오가며 꺼졌다 켜진다. 배치된 인스턴스 높이(크기 포함)로 y 범위를 채운다
            let y0 = Infinity, y1 = -Infinity;
            for(const group of this.mGroupArr)
            {
                for(const m of group.mMatArr)
                {
                    const a = m.mF32A, half = Math.hypot(a[4], a[5], a[6]) * 0.5;
                    y0 = Math.min(y0, a[13] - half);
                    y1 = Math.max(y1, a[13] + half);
                }
            }
            if(y0 <= y1) { this.mBound.mMin.y = y0; this.mBound.mMax.y = y1; }
        }
    }

    private BuildGroup(_density : CDensityInfo) : CLODGroup
    {
        const {matArr, codiArr} = this.PlaceInstances(_density);
        if(matArr.length == 0) return null;

        if(_density.mLODInfo.some(info => info.mRes != null) == false) return null;

        const group = new CLODGroup();
        group.mDensity = _density;
        group.mMatArr = matArr;
        group.mCodiArr = codiArr;
        group.mPtMergeArr = new Array(_density.mLODInfo.length);
        return group;
    }

    private BuildLevelMerge(_density : CDensityInfo, _info : CLODInfo, _matArr : CMat[], _codiArr : CVec4[]) : CPaint2DMerge | CPaint3DMerge
    {
        if(_info.mRes == null) return null;

        const {matArr, codiArr} = this.ReduceByAmount(_matArr, _codiArr, _info.mAmount);
        if(matArr.length == 0) return null;
        
        const isMesh = this.GetFrame().Res().Find(_info.mRes) instanceof CMesh;
        //머지 빌보드는 셰이더(2D.ts)가 꼭짓점에서 회전 없는 오프셋(origin*size)을 빼서 중심을 되돌리므로, 회전이 들어간
        //배치(mRot)를 그대로 구우면 카드가 카메라를 못 보고 납작해진다. 행렬 배열은 LOD끼리 공유하니 복사본에서 회전만 뺀다
        const billboard = isMesh == false && (this.mOwner.mBoundXZ || _info.mPaintTag.includes("billboard"));
        const mergeMat = billboard ? matArr.map(_m => CChunk.StripRotation(_m)) : matArr;
        let ptMerge = isMesh
            ? this.PushComp(new CPaint3DMerge(new Array(matArr.length).fill(_info.mRes), matArr, true, 1))
            : this.PushComp(new CPaint2DMerge(_info.mRes, mergeMat, codiArr));
        if(isMesh == false)
        {
            const pt2 = ptMerge as CPaint2DMerge;
            pt2.SetYSort(_density.mYSort);
            // 2D인데 xz평면에 배치되면(3D씬에 배치되면) 기본적으로 빌보드 켜기
            if(this.mOwner.mBoundXZ) {
                pt2.PushTag("billboard");
                pt2.PushCShaderAttr(new CShaderAttr("billboard", 1.0));
            }
        }

        ptMerge.SetEnable(false);
        const wind = _info.mWind >= 0 ? _info.mWind : _density.mWind;
        if(wind > 0) ptMerge.Wind(wind);
        if(_density.mColorModel != null) ptMerge.SetColorModel(_density.mColorModel);
        for(let tag of _info.mPaintTag) ptMerge.PushTag(tag);
        for(let shaderAttr of _info.mPaintShaderAttr) ptMerge.PushCShaderAttr(shaderAttr);

        if(ptMerge.StartChk()) ptMerge.Start();
        return ptMerge;
    }

    //축별 크기와 위치만 남긴 행렬(회전 제거)
    static StripRotation(_m : CMat) : CMat
    {
        const s = _m.mF32A;
        const out = new CMat();
        const o = out.mF32A;
        o[0] = Math.hypot(s[0], s[1], s[2]);
        o[5] = Math.hypot(s[4], s[5], s[6]);
        o[10] = Math.hypot(s[8], s[9], s[10]);
        o[12] = s[12]; o[13] = s[13]; o[14] = s[14];
        out.UnitCheck();
        return out;
    }

    private ReduceByAmount(_matArr : CMat[], _codiArr : CVec4[], _amount : number) : { matArr: CMat[], codiArr: CVec4[] }
    {
        const ratio = Math.max(0, Math.min(1, _amount));
        if(ratio >= 1) return { matArr: _matArr, codiArr: _codiArr };

        const matArr  = new Array<CMat>();
        const codiArr = new Array<CVec4>();
        const pos  = CPoolGeo.ProductV3();
        const freq = 0.15;

        for(let i = 0; i < _matArr.length; i++)
        {
            _matArr[i].GetV3(3, pos);
            const n = this.PatchNoise(pos.x * freq, pos.z * freq);
            if(n > ratio) continue;

            matArr.push(_matArr[i]);
            if(_codiArr.length > 0) codiArr.push(_codiArr[i]);
        }

        CPoolGeo.RecycleV3(pos);
        return { matArr, codiArr };
    }

    // 부드러운 값 노이즈 (0~1), 격자 해시 보간
    private PatchNoise(_x : number, _y : number) : number
    {
        const x0 = Math.floor(_x), y0 = Math.floor(_y);
        const fx = _x - x0, fy = _y - y0;
        const h = (ix : number, iy : number) => {
            const s = Math.sin(ix*127.1 + iy*311.7) * 43758.5453123;
            return s - Math.floor(s);
        };
        const sx = fx*fx*(3-2*fx), sy = fy*fy*(3-2*fy);
        const a = h(x0,y0), b = h(x0+1,y0), c = h(x0,y0+1), d = h(x0+1,y0+1);
        return a + (b-a)*sx + (c-a)*sy + (a-b-c+d)*sx*sy;
    }

    private PlaceInstances(_density : CDensityInfo) : { matArr: CMat[], codiArr: CVec4[] }
    {
        const matArr  = new Array<CMat>();
        const codiArr = new Array<CVec4>();
        if(_density.mLODInfo.length == 0) return { matArr, codiArr };
        const refIsMesh = this.GetFrame().Res().Find(_density.mLODInfo[0].mRes) instanceof CMesh;

        const cellW = _density.mSize.x;
        const cellH = _density.mSize.y;
        if(cellW <= 0 || cellH <= 0) return { matArr, codiArr };

        const buf = this.mOwner.mBuf;
        const worldW = buf.mCount.x * buf.mSize;
        const worldH = buf.mCount.y * buf.mSize;
        const countX = Math.floor(worldW / cellW);
        const countY = Math.floor(worldH / cellH);

        // 경계 근처 셀도 놓치지 않도록 여유 1칸을 두고 순회하고, 실제 소속 여부는 worldX/worldY 범위로 정확히 가른다
        const cxStart = Math.max(0, Math.floor(this.mBound.mMin.x / cellW) - 1);
        const cxEnd   = Math.min(countX, Math.ceil(this.mBound.mMax.x / cellW) + 1);
        const cyStart = Math.max(0, Math.floor(this.mBound.mMin.y / cellH) - 1);
        const cyEnd   = Math.min(countY, Math.ceil(this.mBound.mMax.y / cellH) + 1);
        if(cxStart >= cxEnd || cyStart >= cyEnd) return { matArr, codiArr };

        const targetRGB = (_density.mColor & 0xFFFFFF00) >>> 0;

        const pos      = CPoolGeo.ProductV3();
        const scale    = CPoolGeo.ProductV3();
        const rotation = CPoolGeo.ProductV3();
        const cbound   = CPoolGeo.ProductBound();
        cbound.SetType(CBound.eType.Box);
        const rMat     = CPoolGeo.ProductMat();
        const sMat     = CPoolGeo.ProductMat();

        const defaultBound = new CBound();
        defaultBound.SetType(CBound.eType.Box);
        if(refIsMesh)
        {
            const mesh  = this.GetFrame().Res().Find(_density.mLODInfo[0].mRes) as CMesh;
            const dummy = new CTree<CMeshCopyNode>();
            dummy.mData = new CMeshCopyNode();
            CMeshTreeUpdate.TreeCopy(mesh.meshTree, dummy, new CMat(), defaultBound);

            // 사이즈 1로 변경
            const size=defaultBound.GetSize();
            const maxSize=CMath.Max(CMath.Max(size.x,size.y),size.z);
            defaultBound.mMin.x /= maxSize; defaultBound.mMin.y /= maxSize; defaultBound.mMin.z /= maxSize;
            defaultBound.mMax.x /= maxSize; defaultBound.mMax.y /= maxSize; defaultBound.mMax.z /= maxSize;
            
            // 원점으로 이동
            const center=defaultBound.GetCenter();
            defaultBound.mMin.x -= center.x; defaultBound.mMin.y -= center.y; defaultBound.mMin.z -= center.z;
            defaultBound.mMax.x -= center.x; defaultBound.mMax.y -= center.y; defaultBound.mMax.z -= center.z;
        }
        else
        {
            defaultBound.InitBound(0.5);
        }

        const stride = countY + 1;
        for(const packed of this.mOwner.GetPlaceCell(_density))
        {
            const cx = Math.floor(packed / stride);
            const cy = packed - cx * stride;
            if(cx < cxStart || cx >= cxEnd || cy < cyStart || cy >= cyEnd) continue;
            {
                const worldX = (cx + 0.5) * cellW;
                const worldY = (cy + 0.5) * cellH;
                if(worldX < this.mBound.mMin.x || worldX >= this.mBound.mMax.x) continue;
                if(worldY < this.mBound.mMin.y || worldY >= this.mBound.mMax.y) continue;

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
                    const bx = Math.floor(wx / buf.mSize);
                    const by = Math.floor(wy / buf.mSize);
                    const idx = new CCIndex(bx, by, 0);
                    if(buf.IndexOut(idx)) continue;
                    if((buf.RGB(idx) as number) === targetRGB) { anyMatch = true; break; }
                }
                if(!anyMatch) continue;

                // TRS 생성
                pos.Zero();
                if(_density.mPos != null) CMath.V3AddV3(pos, _density.mPos.Execute(), pos);
                if(_density.mSca != null) scale.Import(_density.mSca.Execute());
                else { scale.Import(_density.mSize); }
                if(_density.mBottomPos != false) pos.y += scale.y * 0.5;
                if(_density.mRot != null) rotation.Import(_density.mRot.Execute());
                else rotation.Zero();

                if(this.mOwner.mBoundXZ)
                {
                    pos.x += worldX;
                    pos.z += worldY;
                    const terrain = this.mOwner.mTerrain.Ref();
                    if(terrain != null) pos.y += terrain.GetHeight(pos.x, pos.z);
                }
                else
                {
                    pos.x += worldX;
                    pos.y += worldY;
                }

                const trsMat = CMath.MatMul(CMath.MatScale(scale, sMat), CMath.MatRotation(rotation, rMat));
                trsMat.SetV3(3, pos);
                matArr.push(trsMat);

                if(!refIsMesh)
                {
                    if(_density.mCodi != null) codiArr.push(_density.mCodi.Execute());
                }

                // 콜라이더는 LOD와 무관하게 매칭되는 즉시 바로 만든다
                for(const colInfo of _density.mCollider)
                {
                    if(colInfo.mLayer == null || colInfo.mLayer == "") continue;
                    const srcBound = colInfo.mBound ?? defaultBound;
                    CMath.V3MulMatCoordi(srcBound.mMin, trsMat, cbound.mMin);
                    CMath.V3MulMatCoordi(srcBound.mMax, trsMat, cbound.mMax);

                    if(!refIsMesh)
                    {
                        const xHalf = (cbound.mMax.x - cbound.mMin.x) * 0.5;
                        const yHalf = (cbound.mMax.y - cbound.mMin.y) * 0.5;
                        const zHalf = Math.max(xHalf, Math.abs(yHalf));
                        const zCenter = (cbound.mMin.z + cbound.mMax.z) * 0.5;
                        cbound.mMin.z = zCenter - zHalf;
                        cbound.mMax.z = zCenter + zHalf;
                    }
                    const cl = this.PushComp(new CCollider());
                    cl.SetLayer(colInfo.mLayer);
                    cl.SetEvent(CCollider.eEvent.Static);   // density는 안움직임
                    cl.InitBound(cbound);
                }
            }
        }

        CPoolGeo.RecycleV3(pos);
        CPoolGeo.RecycleV3(scale);
        CPoolGeo.RecycleV3(rotation);
        CPoolGeo.RecycleBound(cbound);
        CPoolGeo.RecycleMat(sMat);
        CPoolGeo.RecycleMat(rMat);

        return { matArr, codiArr };
    }
}

//PushSubject로 넣은 서브젝트 하나. 서브젝트는 Update되지 않고 호출 대상·수정 내역을 담는 용도로만 남는다
class CMapSubject
{
    mSubject : CSubject = null;
    mPaint : CPaint = null;
    mCollider = new Array<CCollider>();
    mGroup : CSubjectGroup = null;
    mSlot = -1;
    //월드 기준 슬롯 행렬. 캔버스 Detach의 Reset이 페인트 로컬 행렬을 초기화하므로 넣을 때 한 번 구워 둔다
    mWMat = new CMat();
    mDistance = 0;
    //캔버스에서 떼어 왔으면 꺼낼 때 Start 없이 돌려보낸다
    mDetach = false;
}
class CSubjectGroup
{
    mKey = "";
    mMerge : CPaint2DMerge | CPaint3DMerge = null;
    mDistance = 0;
    mBuildID = -1;
    mPending = false;
    mItem = new Array<CMapSubject>();
}
class CSubjectChunk
{
    mMin = new CVec3(Infinity, Infinity, Infinity);
    mMax = new CVec3(-Infinity, -Infinity, -Infinity);
    mGroup = new Map<string, CSubjectGroup>();
    mDirty = true;
}

export class CDensityMap extends CSubjectMap implements IMapSchema
{
    mBuf : CMapBuf=new CMapBuf();
    mDensityArr =new Array<CDensityInfo>();
    mDiv : number = 100;
    mBoundXZ : boolean; // true : 3D 씬, false : 2D 씬

    mTerrain:CBlackBoardRef<CTerrainMap>=new CBlackBoardRef(CTerrainMap);
    mUpdate=true;
    // 한 프레임에 LOD 머지 생성에 쓰는 시간(ms). 넘으면 다음 프레임으로 미룬다. 최소 1개는 만든다
    mLODBuildMs : number = 8;
    private mLODBuildStart = 0;
    private mLODBuildCount = 0;
    private mLODPending = false;
    private mCamera : CCamera = null;
    private mChunkArr = new Array<CChunk>();
    private mColorCell = new Map<number, number[]>();
    private mPlaceCell = new Map<CDensityInfo, number[]>();
    private mChunkComp = new Array<CComponent>();

    private mSubject = new Map<CSubject, CMapSubject>();
    private mSubjectWait = new Array<CMapSubject>();
    private mSubjectChunk = new Map<string, CSubjectChunk>();
    private mSubjectGroup = new Array<CSubjectGroup>();
    private mSubjectMove = false;
    private mSlotMat = new CMat();
    private mMapInv = new CMat();
    private mCodi = new CVec4();

    constructor(_boundXZ : boolean = false)
    {
        super();
        this.mBoundXZ=_boundXZ;
    }

    RecvGetCamera(_cam : CCamera) {
        this.mCamera=_cam;
    }

    override IsShould(_member: string, _type: CObject.eShould): boolean {

        if(_member=="mUpdate"||_member=="mCamera"||_member=="mChunkArr"||
            _member=="mColorCell"||_member=="mPlaceCell"||_member=="mLODBuildStart"||_member=="mLODBuildCount"||_member=="mLODPending"||
            _member=="mChunkComp"||_member.startsWith("mSubject")||_member=="mSlotMat"||_member=="mMapInv"||_member=="mCodi")    return false;
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
        if(_obj instanceof CDensityInfo) {
            this.PushDensityInfo(_obj);
            return;
        }
        return super.Push(_obj);
    }
    SetTerrain(_terrain: CTerrainMap)
    {
        if(!_terrain.IsBlackBoard()) _terrain.SetBlackBoard(true);
        this.mTerrain.Ref(_terrain.Key());
    }

    override LoadJSON(_file?: any): Promise<boolean> {
        return super.LoadJSON(_file).finally(() => {
            this.mUpdate=true;
        });
    }

    override Update(_update : CUpdate)
    {
        super.Update(_update);
        this.UpdateSubjectSlot();
        this.UpdateChunkLOD();
        this.FlushComp();
    }
    private UpdateChunkLOD()
    {
        if(this.mCamera == null) {
            var cm = this.NewOutMsg("SendGetCamera");
            cm.mInter="canvas";
            cm.mMsgData[0]=this;
            return;
        }
        if(this.mUpdate == true) {
            if(this.UpdateChunks() == false) return;
            this.mUpdate=false;
        }
        this.mLODBuildStart = performance.now();
        this.mLODBuildCount = 0;
        this.mLODPending = false;
        for(const chunk of this.mChunkArr)
            chunk.Update(this.mCamera);
    }
    TakeLODBuild() : boolean
    {
        if(this.mLODBuildCount > 0 && performance.now() - this.mLODBuildStart >= this.mLODBuildMs)
        {
            this.mLODPending = true;
            return false;
        }
        this.mLODBuildCount++;
        return true;
    }
    IsLODPending() { return this.mUpdate || this.mLODPending; }
    UpdateChunks()
    {
        for(let density of this.mDensityArr)
        {
            for(let info of density.mLODInfo)
            {
                if(info.mRes == null) continue;
                if(this.GetFrame().Res().Find(info.mRes)==null)
                {
                    this.GetFrame().Load().Exe(info.mRes);
                    return false;
                }
            }
        }

        // 기존 청크를 전부 지우고 새로 만든다. PushSubject로 넣은 것은 그대로 둔다
        for(const com of this.mChunkComp) com.Destroy();
        this.mChunkComp = [];
        this.ReleaseMapComp();
        this.mChunkArr = [];
        this.BuildColorCell();

        // 모든 density가 공유하는 청크 그리드. 버퍼 셀 mDiv개당 청크 1개.
        const div       = Math.max(1, this.mDiv);
        const cntX      = Math.ceil(this.mBuf.mCount.x / div);
        const cntY      = Math.ceil(this.mBuf.mCount.y / div);
        const chunkWorldSize = this.mBuf.mSize * div;

        for(let cy = 0; cy < cntY; cy++)
        {
            for(let cx = 0; cx < cntX; cx++)
            {
                const bound = new CBound();
                bound.SetType(CBound.eType.Box);
                bound.mMin.Import(new CVec3(cx * chunkWorldSize, cy * chunkWorldSize, 0));
                bound.mMax.Import(new CVec3((cx + 1) * chunkWorldSize, (cy + 1) * chunkWorldSize, 0));

                // 위치 계산과 페인트/콜라이더 빌드는 청크가 자기 경계 안에서 직접 하고, 결과는 이 맵에 붙인다 (CChunk.Build())
                const chunk = new CChunk(this, bound);
                chunk.Build();

                if(chunk.IsEmpty() == false)
                    this.mChunkArr.push(chunk);
            }
        }


        return true;
    }
    private BuildColorCell()
    {
        this.mColorCell.clear();
        this.mPlaceCell.clear();
        const buf = this.mBuf.GetBuf();
        if(buf == null) return;
        const len = this.mBuf.mCount.x * this.mBuf.mCount.y;
        for(let i = 0; i < len; i++)
        {
            const rgb = (buf[i] & 0xFFFFFF00) >>> 0;
            if(rgb == 0) continue;
            let arr = this.mColorCell.get(rgb);
            if(arr == null) { arr = []; this.mColorCell.set(rgb, arr); }
            arr.push(i);
        }
    }
    //배치 칸마다 5점 검사를 돌면 density 수 × 맵 칸 수만큼 돈다. 그 색 버퍼 칸에 걸치는 배치 칸만 후보로 뽑아
    //cx 우선 정렬해 둔다(기존 순회 순서와 같아야 샘플러 난수 소비 순서가 같다).
    GetPlaceCell(_density : CDensityInfo) : number[]
    {
        let arr = this.mPlaceCell.get(_density);
        if(arr != null) return arr;

        const cellW = _density.mSize.x;
        const cellH = _density.mSize.y;
        const size = this.mBuf.mSize;
        const cntX = this.mBuf.mCount.x;
        const stride = Math.floor(this.mBuf.mCount.y * size / cellH) + 1;
        const set = new Set<number>();
        for(const i of this.mColorCell.get((_density.mColor & 0xFFFFFF00) >>> 0) ?? [])
        {
            const bx = i % cntX, by = Math.floor(i / cntX);
            const x0 = Math.floor(bx * size / cellW), x1 = Math.floor(((bx + 1) * size - 0.01) / cellW);
            const y0 = Math.floor(by * size / cellH), y1 = Math.floor(((by + 1) * size - 0.01) / cellH);
            for(let cx = x0; cx <= x1; cx++)
                for(let cy = y0; cy <= y1 && cy < stride; cy++)
                    set.add(cx * stride + cy);
        }
        arr = Array.from(set).sort((a, b) => a - b);
        this.mPlaceCell.set(_density, arr);
        return arr;
    }
    override SetPos(_pos : CVec3,_reset=true)
    {
        super.SetPos(_pos,_reset);
        this.mUpdate=true;
        this.mSubjectMove=true;
    }
    override Destroy()
    {
        for(const sub of this.mSubject.keys()) sub.Destroy();
        this.mSubject.clear();
        this.mSubjectWait.length = 0;
        super.Destroy();
    }
    PushChunkComp<T extends CComponent>(_com : T) : T
    {
        this.mChunkComp.push(_com);
        return this.PushComp(_com);
    }

    HasSubject(_sub : CSubject) { return this.mSubject.has(_sub); }
    //스태틱 서브젝트를 맵에 넣는다. 페인트(CPaint2D/CPaint3D 1개)는 위치에 해당하는 청크 머지의 슬롯으로,
    //콜라이더는 오너를 서브젝트로 둔 Static 복사본으로 들어가서 충돌·옥트리 조회의 GetOwner()가 서브젝트를 돌려준다.
    //캔버스에 있던 서브젝트는 캔버스에서 떼어 내므로 Update가 돌지 않는다. 넣은 뒤 서브젝트를 움직이려면 PopSubject로 꺼낸다.
    //_distance : 카메라와 청크 거리가 이 값을 넘으면 그리지 않는다. 0이면 거리 제한 없음
    PushSubject(_sub : CSubject, _distance = 0) : boolean
    {
        if(_sub == null || _sub === this || this.mSubject.has(_sub)) return false;

        const item = new CMapSubject();
        item.mSubject = _sub;
        item.mDistance = _distance;
        item.mPaint = this.SubjectPaint(_sub);
        if(_sub.GetFrame() != null)
        {
            item.mDetach = true;
            const cm = this.NewOutMsg("Detach");
            cm.mInter = "canvas";
            cm.mMsgData[0] = _sub.Key();
        }
        //서브젝트는 더 이상 Update되지 않아 행렬 갱신 플래그가 내려가지 않는다. 남아 있으면 스태틱 콜라이더가 매번 정적 트리 재빌드를 건다
        _sub.mUpdateMat = CUpdate.eType.Not;
        _sub.mUpdateRS = CUpdate.eType.Not;

        //콜라이더는 복사하지 않고 서브젝트에서 빼서 그대로 옮긴다. 오너는 서브젝트로 남고, 꺼낼 때 같은 객체를 돌려줘서 옥트리 등록이 끊기지 않는다
        for(const cl of _sub.FindComps(CCollider))
        {
            if(cl.IsEnable() == false) continue;
            const ci = _sub.mComArr.indexOf(cl);
            if(ci >= 0) _sub.mComArr.splice(ci, 1);
            _sub.UpdateComp();
            cl.SetEvent(CCollider.eEvent.Static);
            item.mCollider.push(this.PushComp(cl));
        }

        this.mSubject.set(_sub, item);
        if(item.mPaint != null && this.AttachSubject(item) == false)
            this.mSubjectWait.push(item);
        return true;
    }
    //맵에서 빼서 일반 서브젝트로 캔버스에 돌려보낸다
    PopSubject(_sub : CSubject) : boolean
    {
        const item = this.mSubject.get(_sub);
        if(item == null) return false;
        this.ReleaseSubject(item, true);

        //캔버스 Detach의 Reset으로 프레임이 비어 있다. 꺼낸 직후 같은 호출 안에서 GetFrame()을 쓰는 처리가 있어 바로 되돌린다
        if(_sub.GetFrame() == null) _sub.SetFrame(this.GetFrame());
        _sub.mUpdateMat = CUpdate.eType.Updated;
        _sub.mUpdateRS = CUpdate.eType.Updated;
        const cm = this.NewOutMsg("PushSub");
        cm.mInter = "canvas";
        cm.mMsgData[0] = _sub;
        if(item.mDetach) cm.mMsgData[1] = false;
        return true;
    }

    private SubjectPaint(_sub : CSubject) : CPaint
    {
        for(const pt of _sub.FindComps(CPaint))
        {
            const ctor : Function = pt.constructor;
            if(ctor !== CPaint2D && ctor !== CPaint3D) continue;
            if(pt.IsEnable() == false) continue;
            //Wind()도 tail을 붙이지만 바람은 머지가 따로 그린다. 그 밖의 tail은 정점을 직접 움직여 머지로 못 그린다
            if(pt.GetTag().has("tail") && (pt as CPaint2D | CPaint3D).mWindInfluence.x <= 0) continue;
            return pt;
        }
        return null;
    }
    private ReleaseSubject(_item : CMapSubject, _giveBack = false)
    {
        this.mSubject.delete(_item.mSubject);
        const wi = this.mSubjectWait.indexOf(_item);
        if(wi >= 0) this.mSubjectWait.splice(wi, 1);

        const group = _item.mGroup;
        if(group != null)
        {
            if(_item.mSlot >= 0) group.mMerge.Remove(_item.mSlot);
            const gi = group.mItem.indexOf(_item);
            if(gi >= 0)
            {
                group.mItem[gi] = group.mItem[group.mItem.length - 1];
                group.mItem.pop();
            }
        }
        _item.mGroup = null;
        _item.mSlot = -1;

        if(_item.mCollider.length > 0)
        {
            for(const cl of _item.mCollider)
            {
                this.DetachMapCollider(cl);
                if(_giveBack) _item.mSubject.PushComp(cl);
                else cl.Destroy();
            }
            _item.mCollider.length = 0;
            if(_giveBack == false) this.ReleaseMapComp();
        }
    }
    //2D는 텍스처가 로드돼 크기가 정해져야 슬롯 행렬이 나온다. 아직이면 false를 돌려주고 다음 프레임에 다시 본다
    private AttachSubject(_item : CMapSubject) : boolean
    {
        const pt = _item.mPaint;
        //캔버스에서 떼면 Reset으로 오너·프레임이 비어 텍스처 로드를 못 하므로 맵을 오너로 둔다(캔버스로 돌아가면 SetFrame이 되돌린다)
        if(pt.GetOwner() == null || pt.GetOwner().GetFrame() == null) pt.SetOwner(this);
        if(pt instanceof CPaint2D)
        {
            if(pt.mInit == false)
            {
                pt.InitChk();
                if(pt.mInit == false) return false;
            }
            pt.MatUpdate();
        }
        else if(pt.GetTexture().length > 0)
            pt.SetTexture(pt.GetTexture());

        this.BakeSubjectMat(_item);
        const mat = this.SubjectSlotMat(_item);
        const chunk = this.SubjectChunk(mat);
        const key = this.SubjectGroupKey(pt) + "|" + _item.mDistance;
        let group = chunk.mGroup.get(key);
        if(group == null)
        {
            group = new CSubjectGroup();
            group.mKey = key;
            group.mDistance = _item.mDistance;
            group.mMerge = this.NewSubjectMerge(pt);
            chunk.mGroup.set(key, group);
            this.mSubjectGroup.push(group);
        }
        _item.mGroup = group;
        _item.mSlot = -1;
        group.mItem.push(_item);
        group.mPending = true;

        const a = mat.mF32A;
        const half = Math.max(Math.hypot(a[0], a[1], a[2]), Math.hypot(a[4], a[5], a[6]), Math.hypot(a[8], a[9], a[10])) * 0.5;
        chunk.mMin.x = Math.min(chunk.mMin.x, a[12] - half); chunk.mMax.x = Math.max(chunk.mMax.x, a[12] + half);
        chunk.mMin.y = Math.min(chunk.mMin.y, a[13] - half); chunk.mMax.y = Math.max(chunk.mMax.y, a[13] + half);
        chunk.mMin.z = Math.min(chunk.mMin.z, a[14] - half); chunk.mMax.z = Math.max(chunk.mMax.z, a[14] + half);
        chunk.mDirty = true;
        return true;
    }
    //2D 머지 슬롯은 크기 1 사각형(±0.5)이고 CPaint2D 메시는 Mesh2DSize 기준이라 그만큼 키운다
    private BakeSubjectMat(_item : CMapSubject)
    {
        const pt = _item.mPaint;
        const m = this.mSlotMat.mF32A;
        m.set(pt.GetMat().mF32A);
        if(pt instanceof CPaint2D)
        {
            const s = CUtilRender.Mesh2DSize;
            m[0] *= s; m[1] *= s; m[2] *= s;
            m[4] *= s; m[5] *= s; m[6] *= s;
        }
        this.mSlotMat.UnitCheck();
        CMath.MatMul(this.mSlotMat, _item.mSubject.GetMat(), _item.mWMat);
    }
    //맵 로컬 기준 슬롯 행렬
    private SubjectSlotMat(_item : CMapSubject) : CMat
    {
        if(this.GetMat().IsUnit()) return _item.mWMat;
        CMath.MatInvert(this.GetMat(), this.mMapInv);
        return CMath.MatMul(_item.mWMat, this.mMapInv, this.mSlotMat);
    }
    private SubjectChunk(_mat : CMat) : CSubjectChunk
    {
        const size = this.mBuf.mSize * Math.max(1, this.mDiv);
        const a = _mat.mF32A;
        let key = "0";
        if(size > 0)
            key = Math.floor(a[12] / size) + "_" + Math.floor((this.mBoundXZ ? a[14] : a[13]) / size);
        let chunk = this.mSubjectChunk.get(key);
        if(chunk == null)
        {
            chunk = new CSubjectChunk();
            this.mSubjectChunk.set(key, chunk);
        }
        return chunk;
    }
    private SubjectGroupKey(_pt : CPaint) : string
    {
        const tag = [..._pt.GetTag()].filter(_t => CDensityMap.IsMergeTag(_t)).sort().join(",");
        let key = tag + "|" + _pt.GetTexture().join(",") + "|" + _pt.GetColorModel().mF32A.join(",") + "|" + _pt.GetAlphaModel().mF32A.join(",");
        if(_pt instanceof CPaint2D)
            key = "2D|" + key + "|" + _pt.mYSort + "|" + _pt.mWindInfluence.x;
        else
        {
            const pt3D = _pt as CPaint3D;
            key = "3D|" + key + "|" + pt3D.mMesh + "|" + pt3D.mCenterPos + "|" + pt3D.mTargetScale + "|" + pt3D.mWindInfluence.x;
        }
        return key;
    }
    private NewSubjectMerge(_pt : CPaint) : CPaint2DMerge | CPaint3DMerge
    {
        let merge : CPaint2DMerge | CPaint3DMerge;
        if(_pt instanceof CPaint2D)
        {
            const m2D = new CPaint2DMerge(null);
            m2D.SetYSort(_pt.mYSort);
            if(_pt.mWindInfluence.x > 0) m2D.Wind(_pt.mWindInfluence.x);
            m2D.SetTexture([..._pt.GetTexture()]);
            merge = m2D;
        }
        else
        {
            const pt3D = _pt as CPaint3D;
            const m3D = new CPaint3DMerge([], [], pt3D.mCenterPos, pt3D.mTargetScale);
            if(pt3D.mWindInfluence.x > 0) m3D.Wind(pt3D.mWindInfluence.x);
            if(pt3D.GetTexture().length > 0) m3D.mTexOverride = [...pt3D.GetTexture()];
            merge = m3D;
        }
        for(const tag of _pt.GetTag())
            if(CDensityMap.IsMergeTag(tag)) merge.PushTag(tag);
        if(_pt.GetTag().has("colorModel")) merge.SetColorModel(_pt.GetColorModel());
        if(_pt.GetTag().has("alphaModel")) merge.SetAlphaModel(_pt.GetAlphaModel());
        this.PushComp(merge);
        return merge;
    }
    //개별 페인트의 그리기 방식 태그는 머지에 옮기지 않는다(바람은 Wind로 따로 켠다)
    private static IsMergeTag(_tag : string) { return _tag != "codi" && _tag != "tail" && _tag != "wind"; }
    private PushSubjectSlot(_merge : CPaint2DMerge | CPaint3DMerge, _item : CMapSubject)
    {
        const mat = this.SubjectSlotMat(_item);
        if(_merge instanceof CPaint3DMerge)
            _item.mSlot = _merge.Push((_item.mPaint as CPaint3D).mMesh, mat);
        else
        {
            this.mCodi.mF32A.set((_item.mPaint as CPaint2D).GetTexCodi().mF32A);
            _item.mSlot = _merge.Push(mat, this.mCodi);
        }
    }
    //넣은 서브젝트는 프레임마다 보지 않는다. 대기 중인 것, 머지가 새로 만들어진 그룹, 카메라가 움직였을 때의 청크 표시만 처리한다
    private UpdateSubjectSlot()
    {
        if(this.mSubject.size == 0) return;

        //캔버스 Detach의 Reset이 행렬 플래그를 Updated로 되돌리므로 여기서 다시 내린다
        for(const item of this.mSubject.values())
        {
            const sub = item.mSubject;
            if(sub.IsDestroy()) this.ReleaseSubject(item);
            else if(sub.mUpdateMat != CUpdate.eType.Not || sub.mUpdateRS != CUpdate.eType.Not)
            {
                sub.mUpdateMat = CUpdate.eType.Not;
                sub.mUpdateRS = CUpdate.eType.Not;
            }
        }

        for(let i = 0; i < this.mSubjectWait.length; ++i)
        {
            if(this.AttachSubject(this.mSubjectWait[i]) == false) continue;
            this.mSubjectWait.splice(i, 1);
            --i;
        }

        const move = this.mSubjectMove;
        this.mSubjectMove = false;
        for(const group of this.mSubjectGroup)
        {
            const merge = group.mMerge;
            if(merge.IsReady() == false) continue;
            if(group.mBuildID != merge.GetBuildID())
            {
                group.mBuildID = merge.GetBuildID();
                for(const item of group.mItem) item.mSlot = -1;
                group.mPending = true;
            }
            if(group.mPending)
            {
                for(const item of group.mItem)
                    if(item.mSlot < 0) this.PushSubjectSlot(merge, item);
                group.mPending = false;
            }
            else if(move)
            {
                for(const item of group.mItem)
                    if(item.mSlot >= 0) merge.Modify(item.mSlot, this.SubjectSlotMat(item));
            }
        }

        const cam = this.mCamera;
        if(cam == null) return;
        for(const chunk of this.mSubjectChunk.values())
        {
            if(chunk.mDirty == false && cam.mUpdateMat == CUpdate.eType.Not) continue;
            chunk.mDirty = false;
            const eye = cam.GetEye();
            //2D 카메라는 z로 물려 있어 깊이 축을 넣으면 거리가 항상 그만큼 커진다
            const dist = Math.hypot(
                eye.x - CMath.Clamp(eye.x, chunk.mMin.x, chunk.mMax.x),
                eye.y - CMath.Clamp(eye.y, chunk.mMin.y, chunk.mMax.y),
                this.mBoundXZ ? eye.z - CMath.Clamp(eye.z, chunk.mMin.z, chunk.mMax.z) : 0);
            for(const group of chunk.mGroup.values())
            {
                const show = group.mDistance <= 0 || dist <= group.mDistance;
                if(group.mMerge.IsEnable() != show) group.mMerge.SetEnable(show);
            }
        }
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
