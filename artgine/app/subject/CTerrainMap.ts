import { CUpdate } from "../../basic/Basic.js";
import { CArray } from "../../basic/CArray.js";
import { CClass } from "../../basic/CClass.js";
import { CEvent } from "../../basic/CEvent.js";
import { CObject, CPointer } from "../../basic/CObject.js";
import { CBound } from "../../geometry/CBound.js";
import { CMat } from "../../geometry/CMat.js";
import { CMath } from "../../geometry/CMath.js";
import { CPoolGeo } from "../../geometry/CPoolGeo.js";
import { CVec3 } from "../../geometry/CVec3.js";
import { CVec4 } from "../../geometry/CVec4.js";
import { CColor } from "../../render/CColor.js";
import { CImgPro } from "../../render/CImgPro.js";
import { CRenderPass } from "../../render/CRenderPass.js";
import { CTexture, CTextureInfo } from "../../render/CTexture.js";
import { CCIndex } from "../canvas/CCIndex.js";
import { CCollider } from "../component/CCollider.js";
import { CPhysics } from "../component/CPhysics.js";
import { CPaintTerrain } from "../component/paint/CPaintTerrain.js";
import { CMapBuf } from "./CMapBuf.js";
import { CSubject } from "./CSubject.js";

export class CTerrainMap extends CSubject
{
    mHeightBuf : CMapBuf = new CMapBuf();
    mSplatBuf : CMapBuf = new CMapBuf();
 
    mHeightTexture : string=null;
    mSplatTexture : string=null;
    mLayerTexture : string=null;

    mTerrainHeight : number = 1024;
    mDefaultHeight : number = 1024; // 카메라의 기본 높이, 이 높이보다 2^n배 높아질 때 셀의 크기가 2^n배로 커짐

    mLevel = new Array<number>(0);  // 해당 레벨이 몇번 반복할지
    
    mTexture : (CVec4|string)[] = new Array();
    mTexCodi : CMat = new CMat([
        32, 32, 0, 0,
        32, 32, 0, 0,
        32, 32, 0, 0,
        32, 32, 0, 0
    ]);

    // 페인트 태그
    mTag : Set<string> = new Set();
    
    mTestMode : boolean = false;    // 라인 드로잉과 색상 추가
    mCollider : CColliderTerrain;
    
    constructor() {
        super();
        this.mHeightBuf.Reset(new CVec3(1024,1024,1),10);
        this.mSplatBuf.Reset(new CVec3(1024,1024,1),10);
        this.mCollider = this.PushComp(new CColliderTerrain(this));
    }

    ClearAll() {
        this.mHeightTexture = null;
        this.mSplatTexture = null;
        this.mLayerTexture = null;
        this.RemoveComps(CPaintTerrain);
    }
    SetLevel(_level : Array<number>) {
        this.mLevel = _level;
    }
    //xy : 반복 패턴(음수시 타일링 회전 미적용),zw : 텍스쳐 시작 위치
    SetSplat(_splatTexs : (CVec4|string)[], _splatTexCodi : CMat) {
        this.mTexture = [..._splatTexs];
        this.mTexCodi.Import(_splatTexCodi);
    }

    GetHeight(_worldX: number, _worldZ: number) {
        let pixelX = (_worldX - this.GetPos().x) / this.mHeightBuf.mSize;
        let pixelY = (_worldZ - this.GetPos().z) / this.mHeightBuf.mSize;

        // linear를 할 때 외곽의 한 픽셀에 평평한 지형이 생기는 것을 방지하기 위함임
        // 가장 왼쪽 아래를 (0.5, 0.5), 가장 오른쪽 위를 (w-0.5, h-0.5)로 바꿔줌
        pixelX *= (this.mHeightBuf.mCount.x - 0.5) / this.mHeightBuf.mCount.x;
        pixelY *= (this.mHeightBuf.mCount.y - 0.5) / this.mHeightBuf.mCount.y;

        const xi = Math.floor(pixelX);
        const yi = Math.floor(pixelY);
        const xf = pixelX - xi;
        const yf = pixelY - yi;

        const rgb00 = this.mHeightBuf.RGB(new CCIndex(xi + 0, yi + 0)) || 0;
        const rgb10 = this.mHeightBuf.RGB(new CCIndex(xi + 1, yi + 0)) || 0;
        const rgb01 = this.mHeightBuf.RGB(new CCIndex(xi + 0, yi + 1)) || 0;
        const rgb11 = this.mHeightBuf.RGB(new CCIndex(xi + 1, yi + 1)) || 0;

        const decodeHeight = (_rgb: number) => ((((_rgb >> 24) & 0xff) << 8) | ((_rgb >> 16) & 0xff)) / 65535;
        const h00 = decodeHeight(rgb00) * this.mTerrainHeight + this.GetPos().y;
        const h10 = decodeHeight(rgb10) * this.mTerrainHeight + this.GetPos().y;
        const h01 = decodeHeight(rgb01) * this.mTerrainHeight + this.GetPos().y;
        const h11 = decodeHeight(rgb11) * this.mTerrainHeight + this.GetPos().y;

        if(xf <= (1 - yf)) return h00 + xf * (h10 - h00) + yf * (h01 - h00);
        return h10 + h01 - h11 + xf * (h11 - h01) + yf * (h11 - h10);
    }
    GetNormal(_worldX: number, _worldZ: number) {
        let pixelX = (_worldX - this.GetPos().x) / this.mHeightBuf.mSize;
        let pixelY = (_worldZ - this.GetPos().z) / this.mHeightBuf.mSize;

        // linear를 할 때 외곽의 한 픽셀에 평평한 지형이 생기는 것을 방지하기 위함임
        // 가장 왼쪽 아래를 (0.5, 0.5), 가장 오른쪽 위를 (w-0.5, h-0.5)로 바꿔줌
        pixelX *= (this.mHeightBuf.mCount.x - 0.5) / this.mHeightBuf.mCount.x;
        pixelY *= (this.mHeightBuf.mCount.y - 0.5) / this.mHeightBuf.mCount.y;

        const xi = Math.floor(pixelX);
        const yi = Math.floor(pixelY);
        const xf = pixelX - xi;
        const yf = pixelY - yi;

        const rgb00 = this.mHeightBuf.RGB(new CCIndex(xi + 0, yi + 0)) || 0;
        const rgb10 = this.mHeightBuf.RGB(new CCIndex(xi + 1, yi + 0)) || 0;
        const rgb01 = this.mHeightBuf.RGB(new CCIndex(xi + 0, yi + 1)) || 0;
        const rgb11 = this.mHeightBuf.RGB(new CCIndex(xi + 1, yi + 1)) || 0;

        const decodeHeight = (_rgb: number) => ((((_rgb >> 24) & 0xff) << 8) | ((_rgb >> 16) & 0xff)) / 65535;
        const h00 = decodeHeight(rgb00) * this.mTerrainHeight + this.GetPos().y;
        const h10 = decodeHeight(rgb10) * this.mTerrainHeight + this.GetPos().y;
        const h01 = decodeHeight(rgb01) * this.mTerrainHeight + this.GetPos().y;
        const h11 = decodeHeight(rgb11) * this.mTerrainHeight + this.GetPos().y;

        const step = this.mHeightBuf.mSize;
        let e1:CVec3,e2:CVec3;
        if(xf <= (1 - yf)) {
            e1 = new CVec3(step, h10 - h00, 0);
            e2 = new CVec3(0, h01 - h00, step);
        } else {
            e1 = new CVec3(-step, h01 - h11, 0);
            e2 = new CVec3(0, h10 - h11, -step);
        }
        return CMath.V3Nor(CMath.V3Cross(e2, e1));
    }

    override EditChange(_pointer: CPointer, _child: boolean): void {
        super.EditChange(_pointer, _child);
        if(_pointer.member == "mTestMode") {
            this.SetTestMode();
        }
        else if(_pointer.IsRef(this.mLevel)) {
            this.RemoveComps(CPaintTerrain);
        }
        else {
            for(const pt of this.FindComps(CPaintTerrain)) {
                pt.mTerrainHeight.x = this.mTerrainHeight;
                pt.mCellSize.x = this.mHeightBuf.mSize;
                pt.mDefaultHeight.x = this.mDefaultHeight;
                pt.MatUpdate();
            }
            this.mUpdateMat = CUpdate.eType.Already;
        }
    }
    override Update(_update: CUpdate): void {
        super.Update(_update);

        if(this.FindComp(CPaintTerrain) != null) return;
        if(!this.LoadSplatTextures()) return;

        this.InitTexture();
        this.SetTestMode();
        
        const textureList = [this.mLayerTexture, this.mSplatTexture, this.mHeightTexture];
        const Spawn = (_level: number, _repeatCount: number, _scale: number, _cellIndex: CVec3) => {
            const pt = this.PushComp(new CPaintTerrain(
                textureList, 
                this.GetPos(), this.mTerrainHeight, 
                _level, _repeatCount, _scale,
                this.mHeightBuf.mSize, _cellIndex, this.mTexCodi,
                this.mDefaultHeight
            ));
            for(let tag of this.mTag) pt.PushTag(tag);
            return pt;
        }

        // 중앙부 생성
        for(let x = 0; x < 2; x++)
        for(let y = 0; y < 2; y++) {
            Spawn(0, 1, 1, new CVec3(x-0.5, 0, y-0.5));
        }

        // 외곽 생성
        let levelScale = 1;
        for (const [level, repeatCount] of this.mLevel.entries()) {
            for(let repeat = 0; repeat < repeatCount; repeat++) {
                const size = 4 + repeat * 2;
                const center = 1.5 + repeat;
                const limit = size - 1;
                for(let i = 0; i < size; i++) {
                    Spawn(level, repeatCount, levelScale, new CVec3(0 - center, 0, i - center));
                    Spawn(level, repeatCount, levelScale, new CVec3(limit - center, 0, i - center));
                    if(i > 0 && i < limit) {
                        Spawn(level, repeatCount, levelScale, new CVec3(i - center, 0, 0 - center));
                        Spawn(level, repeatCount, levelScale, new CVec3(i - center, 0, limit - center));
                    }
                }
            }
            levelScale *= repeatCount + 1;
        }
    }

    private LoadSplatTextures(): boolean {
        let allLoaded = true;
        for (const texKey of this.mTexture) {
            if (texKey == null || texKey === "" || typeof texKey !== "string") continue;
            if (this.GetFrame().Res().Find(texKey) == null) allLoaded = false;
            if (!this.GetFrame().Load().IsLoad(texKey)) this.GetFrame().Load().Exe(texKey);
        }
        return allLoaded;
    }
    private BakeNormal(_tex: CTexture): void {
        const scale = 0.05;
        const texBuf = _tex.GetBuf()[0];
        const [w, h] = [_tex.GetWidth(), _tex.GetHeight()];
        const H = (_x : number, _y : number) : number => {
            const idx = (CMath.Clamp(_y, 0, h - 1) * w + CMath.Clamp(_x, 0, w - 1)) * 4;
            return (texBuf[idx] / 255) + (texBuf[idx + 1] / 65535);
        };
        for(let y=0;y<h;y++)
        for(let x=0;x<w;x++) {
            const dx = H(x+1,y+0)-H(x-1,y+0), dy = H(x+0,y+1)-H(x+0,y-1);
            const len = Math.sqrt(dx*dx*scale*scale+dy*dy*scale*scale+scale*scale*scale*scale);
            const idx = (y*w+x)*4;
            texBuf[idx + 2] = (0.5-dx*scale/len*0.5)*255;
            texBuf[idx + 3] = (0.5+dy*scale/len*0.5)*255;
        }
    }
    private InitTexture(): void {
        if(this.mHeightTexture==null) {
            // xy높이 zw노말 텍스쳐 생성
            this.mHeightTexture=`height${this.Key()}.tex`;
            if(this.GetFrame().Res().Find(this.mHeightTexture) != null) {
                // 이미 생성되어 있는 텍스쳐면 삭제
                this.GetFrame().Ren().ReleaseTexture(this.GetFrame().Res().Find(this.mHeightTexture));
            }

            const tex=this.mHeightBuf.GetTexture();
            tex.SetFilter(CTexture.eFilter.Linear);
            this.BakeNormal(tex);
            this.GetFrame().Res().Push(this.mHeightTexture,tex);

            // 디버그 용도 : 런타임에 텍스쳐 변경하면 버퍼에도 적용
            tex.mModifyEvent=new CEvent(async ()=>{
                await CClass.CallAsync(null,"BufferTool",[tex.GetBuf()[0],new CVec3(tex.GetWidth(),tex.GetHeight(),1),true]);
                this.BakeNormal(tex);
                this.mHeightBuf.SetTexture(tex);
            });
        }

        if(this.mSplatTexture==null) {
            // 스플랫 맵 생성
            this.mSplatTexture=`splat${this.Key()}.tex`;
            if(this.GetFrame().Res().Find(this.mSplatTexture) != null) {
                // 이미 생성되어 있는 텍스쳐면 삭제
                this.GetFrame().Ren().ReleaseTexture(this.GetFrame().Res().Find(this.mSplatTexture));
            }

            const tex=this.mSplatBuf.GetTexture();
            tex.SetFilter(CTexture.eFilter.Linear);
            this.GetFrame().Res().Push(this.mSplatTexture,tex);

            // 디버그 용도 : 런타임에 텍스쳐 변경하면 버퍼에도 적용
            tex.mModifyEvent=new CEvent(async ()=>{
                await CClass.CallAsync(null,"BufferTool",[tex.GetBuf()[0],new CVec3(tex.GetWidth(),tex.GetHeight(),1),true]);
                this.mSplatBuf.SetTexture(tex);
            });
        }

        if(this.mLayerTexture==null) {
            // 레이어 텍스쳐 생성
            this.mLayerTexture=`layer${this.Key()}.tex`;
            if(this.GetFrame().Res().Find(this.mLayerTexture) != null) {
                // 이미 생성되어 있는 텍스쳐면 삭제
                this.GetFrame().Ren().ReleaseTexture(this.GetFrame().Res().Find(this.mLayerTexture));
            }

            const tex=new CTexture();
            tex.SetSize(1024, 1024);
            tex.PushInfo([new CTextureInfo(CTexture.eTarget.Array,CTexture.eFormat.RGBA8,12)]);
            tex.SetFilter(CTexture.eFilter.Linear);
            tex.SetMipMap(CTexture.eMipmap.GL);
            tex.SetWrap(CTexture.eWrap.Repeat);
            this.GetFrame().Res().Push(this.mLayerTexture, tex);
            
            // 디버그 용도 : 런타임에 어떤 텍스쳐 들어있는지 확인
            tex.mReadPixelEvent=new CEvent(this.GetFrame().Ren().ReadPixel,this);
        }

        const splatArrayTex : CTexture = this.GetFrame().Res().Find(this.mLayerTexture);
        splatArrayTex.CreateBuf();
        const buf = splatArrayTex.GetBuf()[0] as Uint8Array;
        const [w, h] = [splatArrayTex.GetWidth(), splatArrayTex.GetHeight()];
        for(let i = 0; i < 12; i++) {
            let layerTex: CTexture;
            if(this.mTexture[i] instanceof CVec4) {
                layerTex = CImgPro.Square(w, h, this.mTexture[i] as CVec4);
            }
            else if(typeof this.mTexture[i] == "string") {
                const tex = this.GetFrame().Res().Find(this.mTexture[i] as string) as CTexture;
                const [tw, th] = [tex.GetWidth(), tex.GetHeight()];
                layerTex = CImgPro.SqurEnlargedReduced(tw, th, tex.GetBuf()[0], w / tw, h / th, 4);
                if(tex.GetYFlip()) {
                    const flipped = new Uint8Array(layerTex.GetBuf()[0].length);
                    const rowLength = layerTex.GetWidth()*4;
                    for(let y=0;y<layerTex.GetHeight();y++) {
                        const srcRowStart = y*rowLength;
                        const destRowStart = (layerTex.GetHeight()-1-y)*rowLength;
                        const rowView = layerTex.GetBuf()[0].subarray(srcRowStart, srcRowStart + rowLength);
                        flipped.set(rowView, destRowStart);
                    }
                    layerTex.GetBuf()[0] = flipped;
                }
            }
            else {
                const layerDefaultColor: CVec4[] = [
                    new CVec4(0,0,0,1),
                    new CVec4(1,0.5,0,1),
                    new CVec4(0.5,0.5,1,0)
                ];
                const defaultCol = i < 4 ? layerDefaultColor[0] : i < 8 ? layerDefaultColor[1] : layerDefaultColor[2];
                layerTex = CImgPro.Square(w, h, defaultCol);
            }
            buf.set(layerTex.GetBuf()[0], w * h * 4 * i);
        }
        this.GetFrame().Ren().BuildTexture(splatArrayTex);  // RebuildTexture쓰면 밉맵 생성 안됨
    }

    SetTestMode() {
        const TEST_COLORS : CColor[] = [
            new CColor(0.000, 1, 1, CColor.eModel.HSV),
            new CColor(0.083, 1, 1, CColor.eModel.HSV),
            new CColor(0.166, 1, 1, CColor.eModel.HSV),
            new CColor(0.333, 1, 1, CColor.eModel.HSV),
            new CColor(0.500, 1, 1, CColor.eModel.HSV),
            new CColor(0.666, 1, 1, CColor.eModel.HSV),
            new CColor(0.750, 1, 1, CColor.eModel.HSV),
            new CColor(0.833, 1, 1, CColor.eModel.HSV)
        ];
        for(const pt of this.FindComps(CPaintTerrain)) {
            if(this.mTestMode) {
                pt.SetColorModel(TEST_COLORS[pt.mLevel.x % TEST_COLORS.length]);
                const rp = new CRenderPass(this.GetFrame().Pal().SlTerrainKey());
                rp.mLine = 1;
                pt.PushRenderPass(rp);
            } else {
                pt.RemoveTag("colorModel");
                pt.PushRenderPass([]);
            }
        }
    }
}

export class CColliderTerrain extends CCollider
{
    mTerrain : CTerrainMap;

    constructor(_terrain : CTerrainMap)
    {
        super();

        this.mTerrain = _terrain;
        this.MatUpdate();
        this.SetEvent(CCollider.eEvent.Static);
    }
    override IsShould(_member: string, _type: CObject.eShould): boolean {
        if(_member == "mTerrain")
            return false;
        return super.IsShould(_member, _type);
    }
    override Update(_update: CUpdate): void {
        if(this.GetOwner().mUpdateMat!=CUpdate.eType.Not)
            this.MatUpdate();
        super.Update(_update);
    }
    MatUpdate()
    {
        this.mBound.Reset();
        this.mBound.mMin.x = 0;
        this.mBound.mMin.y = 0;
        this.mBound.mMin.z = 0;

        this.mBound.mMax.x = this.mTerrain.mHeightBuf.mCount.x * this.mTerrain.mHeightBuf.mSize;
        this.mBound.mMax.y = this.mTerrain.mTerrainHeight;
        this.mBound.mMax.z = this.mTerrain.mHeightBuf.mCount.y * this.mTerrain.mHeightBuf.mSize;
        
        this.mBound.SetType(CBound.eType.Box);
    }
    ClosestPointOnTriangle(_point: CVec3, _triVertA: CVec3, _triVertB: CVec3, _triVertC: CVec3) 
    {
        const xp = CPoolGeo.ProductV3();

        const ab = CMath.V3SubV3(_triVertB, _triVertA), ac = CMath.V3SubV3(_triVertC, _triVertA);

        const ap = CMath.V3SubV3(_point, _triVertA, xp);
        const d1 = CMath.V3Dot(ab, ap), d2 = CMath.V3Dot(ac, ap);
        if (d1 <= 0 && d2 <= 0) {
            CPoolGeo.RecycleV3(xp);
            return _triVertA.Export(); // vertex A
        }

        const bp = CMath.V3SubV3(_point, _triVertB, xp);
        const d3 = CMath.V3Dot(ab, bp), d4 = CMath.V3Dot(ac, bp);
        if (d3 >= 0 && d4 <= d3) {
            CPoolGeo.RecycleV3(xp);
            return _triVertB.Export(); // vertex B
        }

        const cp = CMath.V3SubV3(_point, _triVertC, xp);
        const d5 = CMath.V3Dot(ab, cp), d6 = CMath.V3Dot(ac, cp);
        if (d6 >= 0 && d5 <= d6) {
            CPoolGeo.RecycleV3(xp);
            return _triVertC.Export(); // vertex C
        }

        // edge & face 처리
        const vc = d1*d4 - d3*d2;
        if (vc <= 0 && d1 >= 0 && d3 <= 0) {
            const v = d1 / (d1 - d3);
            const result = CMath.V3AddV3(_triVertA, CMath.V3MulFloat(ab, v, xp));
            CPoolGeo.RecycleV3(xp);
            return result; // edge AB
        }
        const vb = d5*d2 - d1*d6;
        if (vb <= 0 && d2 >= 0 && d6 <= 0) {
            const w = d2 / (d2 - d6);
            const result = CMath.V3AddV3(_triVertA, CMath.V3MulFloat(ac, w, xp));
            CPoolGeo.RecycleV3(xp);
            return result; // edge AC
        }
        const va = d3*d6 - d5*d4;
        if (va <= 0 && (d4-d3) >= 0 && (d5-d6) >= 0) {
            const w = (d4-d3) / ((d4-d3) + (d5-d6));
            const result = CMath.V3AddV3(_triVertB, CMath.V3MulFloat(CMath.V3SubV3(_triVertC, _triVertB, xp), w, xp));
            CPoolGeo.RecycleV3(xp);
            return result; // edge BC
        }

        // interior
        const denom = 1 / (va + vb + vc);
        const result = CMath.V3MulFloat(ab, vb * denom);
        CMath.V3AddV3(result, CMath.V3MulFloat(ac, vc * denom, xp), result);
        CPoolGeo.RecycleV3(xp);
        return CMath.V3AddV3(_triVertA, result, result);
    }
    override CollisionChk(_co: CCollider, _colTarget: CArray<CCollider>, _colPush: CArray<CVec3>): boolean 
    {
        let push : CVec3=null;

        if(_co.GetBound().GetType() == CBound.eType.Sphere)
        {
            // 삼각형 메시 기반 충돌
            const radius = _co.mBW.mRadian;
            const center = _co.mBW.mCenter;

            const N = this.mTerrain.mHeightBuf.mCount.x;
            const cellSize = this.mTerrain.mHeightBuf.mSize;
            const half = N * cellSize * 0.5;

            // 구 주변 셀만 순회
            const minI = Math.max(0, Math.floor((center.x - radius + half) / cellSize));
            const maxI = Math.min(N-2, Math.ceil((center.x + radius + half) / cellSize));
            const minJ = Math.max(0, Math.floor((center.z - radius + half) / cellSize));
            const maxJ = Math.min(N-2, Math.ceil((center.z + radius + half) / cellSize));

            for (let i = minI; i <= maxI; i++) {
                for (let j = minJ; j <= maxJ; j++) {
                    const wx0 = -half + i * cellSize;
                    const wz0 = -half + j * cellSize;
                    const wx1 = wx0 + cellSize, wz1 = wz0 + cellSize;

                    const h00 = this.mTerrain.GetHeight(wx0, wz0);
                    const h10 = this.mTerrain.GetHeight(wx1, wz0);
                    const h01 = this.mTerrain.GetHeight(wx0, wz1);
                    const h11 = this.mTerrain.GetHeight(wx1, wz1);

                    // 셀을 삼각형 2개로 분해
                    const tris = [
                        [new CVec3(wx0, h00, wz0), new CVec3(wx1, h10, wz0), new CVec3(wx1, h11, wz1)],
                        [new CVec3(wx0, h00, wz0), new CVec3(wx1, h11, wz1), new CVec3(wx0, h01, wz1)]
                    ];

                    for (const tri of tris) {
                        const closest = this.ClosestPointOnTriangle(center, tri[0], tri[1], tri[2]);
                        const diff = CMath.V3SubV3(center, closest);
                        const dist = CMath.V3Len(diff);

                        if (dist < radius && dist > 1e-9) {
                            if(push == null) push = new CVec3(0, 0, 0);
                            CMath.V3AddV3(push, CMath.V3MulFloat(diff, radius - dist), push);
                        }
                    }
                }
            }
        }
        else if(_co.GetBound().GetType() == CBound.eType.Box)
        {
            // 1. 샘플링 방식 / 2. 삼각형 메시 방식
            // 삼각형 메시 기반 충돌은 정확하지만 매우 느려서 샘플링 방식 사용
            // 샘플링 방식은 steps(샘플링 횟수) 클수록 정확하지만 느려짐
            const steps = 5;

            const x = _co.mBW.mWBound.mMin.x;
            const z = _co.mBW.mWBound.mMin.z;

            const hx = _co.mBW.mWBound.mMax.x - _co.mBW.mWBound.mMin.x;
            const hz = _co.mBW.mWBound.mMax.z - _co.mBW.mWBound.mMin.z;
            const bottomY = _co.mBW.mWBound.mMin.y;

            let maxPenetration = 0;
            for(let i = 0; i <= steps; i++)
            for(let k = 0; k <= steps; k++)
            {
                const wx = x + hx * (i / steps);
                const wz = z + hz * (i / steps);
                
                const terrainY = this.mTerrain.GetHeight(wx, wz);
                const penetration = terrainY - bottomY;
                if(penetration > 0) {
                    if(penetration > maxPenetration) {
                        maxPenetration = penetration;
                        const normal = this.mTerrain.GetNormal(wx, wz);
                        push = CMath.V3MulFloat(normal, penetration);
                    }
                }
            }
        }

        if(push!=null)
        {
            if(Math.abs(push.x)<CPhysics.CutMinPushValue) push.x=0;
            if(Math.abs(push.y)<CPhysics.CutMinPushValue) push.y=0;
            if(Math.abs(push.z)<CPhysics.CutMinPushValue) push.z=0;
            if(push.IsZero())
                return false;
            _co.mColPair.set(this,push);

            if(_colTarget!=null) _colTarget.Push(_co);
			if(_colPush!=null) _colPush.Push(push);

            return true;
        }

        return false;

    }
}