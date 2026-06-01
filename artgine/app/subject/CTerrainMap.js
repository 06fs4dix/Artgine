import { CUpdate } from "../../basic/Basic.js";
import { CClass } from "../../basic/CClass.js";
import { CEvent } from "../../basic/CEvent.js";
import { CBound } from "../../geometry/CBound.js";
import { CMat } from "../../geometry/CMat.js";
import { CMath } from "../../geometry/CMath.js";
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
export class CTerrainMap extends CSubject {
    mHeightBuf = new CMapBuf();
    mSplatBuf = new CMapBuf();
    mHeightTexture = null;
    mSplatTexture = null;
    mSplatArrayTexture = null;
    mTerrainHeight = 1024;
    mDefaultHeight = 1024;
    mLevel = new Array(0);
    mTexture = new Array();
    mTexCodi = new CMat([
        32, 32, 0, 0,
        32, 32, 0, 0,
        32, 32, 0, 0,
        32, 32, 0, 0
    ]);
    mTag = new Set();
    mTestMode = false;
    mCollider;
    constructor() {
        super();
        this.mHeightBuf.Reset(new CVec3(1024, 1024, 1), 10);
        this.mSplatBuf.Reset(new CVec3(1024, 1024, 1), 10);
        this.mSplatBuf.mBuffer.fill(0x000000FF);
        this.mCollider = this.PushComp(new CColliderTerrain(this));
    }
    ClearAll() {
        this.mHeightTexture = null;
        this.mSplatTexture = null;
        this.mSplatArrayTexture = null;
        this.RemoveComps(CPaintTerrain);
    }
    SetLevel(_level) {
        this.mLevel = _level;
    }
    SetSplat(_splatTexs, _splatTexCodi) {
        this.mTexture = [..._splatTexs];
        this.mTexCodi.Import(_splatTexCodi);
    }
    SetTestMode() {
        const colorArr = [
            new CColor(0, 1, 1, CColor.eModel.HSV),
            new CColor(0.083, 1, 1, CColor.eModel.HSV),
            new CColor(0.166, 1, 1, CColor.eModel.HSV),
            new CColor(0.333, 1, 1, CColor.eModel.HSV),
            new CColor(0.5, 1, 1, CColor.eModel.HSV),
            new CColor(0.666, 1, 1, CColor.eModel.HSV),
            new CColor(0.75, 1, 1, CColor.eModel.HSV),
            new CColor(0.833, 1, 1, CColor.eModel.HSV)
        ];
        const paints = this.FindComps(CPaintTerrain);
        for (const pt of paints) {
            if (this.mTestMode) {
                pt.SetColorModel(colorArr[pt.mLevel.x % colorArr.length]);
                const rp = new CRenderPass(this.GetFrame().Pal().SlTerrainKey());
                rp.mLine = 1;
                pt.PushRenderPass(rp);
            }
            else {
                pt.RemoveTag("colorModel");
                pt.PushRenderPass([]);
            }
        }
    }
    EditChange(_pointer, _child) {
        super.EditChange(_pointer, _child);
        if (_pointer.member == "mTestMode") {
            this.SetTestMode();
        }
        else if (_pointer.IsRef(this.mLevel)) {
            this.RemoveComps(CPaintTerrain);
        }
        else {
            for (const pt of this.FindComps(CPaintTerrain)) {
                pt.mTerrainHeight.x = this.mTerrainHeight;
                pt.mCellSize.x = this.mHeightBuf.mSize;
                pt.mDefaultHeight.x = this.mDefaultHeight;
                pt.MatUpdate();
            }
            this.mUpdateMat = CUpdate.eType.Already;
        }
    }
    Update(_update) {
        super.Update(_update);
        if (this.mHeightTexture == null) {
            this.mHeightTexture = "height.tex";
            var CreateNormal = (_tex) => {
                const texBuf = _tex.GetBuf()[0];
                const [w, h] = [_tex.GetWidth(), _tex.GetHeight()];
                const GetHeight = (_x, _y) => {
                    const idx = (CMath.Clamp(_y, 0, h - 1) * w + CMath.Clamp(_x, 0, w - 1)) * 4;
                    return (texBuf[idx] / 255) + (texBuf[idx + 1] / 65535);
                };
                let scale = 0.05;
                for (let i = 0; i < w * h; i++) {
                    const x = i % w, y = Math.floor(i / w);
                    const n = new CVec3(-(GetHeight(x + 1, y) - GetHeight(x - 1, y)) * scale, -(GetHeight(x, y + 1) - GetHeight(x, y - 1)) * scale, scale * scale);
                    CMath.V3Nor(n, n);
                    texBuf[i * 4 + 2] = (n.x * 0.5 + 0.5) * 255;
                    texBuf[i * 4 + 3] = (0.5 - n.y * 0.5) * 255;
                }
            };
            const tex = this.mHeightBuf.GetTexture();
            tex.SetFilter(CTexture.eFilter.Linear);
            tex.mModifyEvent = new CEvent(async () => {
                await CClass.CallAsync(null, "BufferTool", [tex.GetBuf()[0], new CVec3(tex.GetWidth(), tex.GetHeight(), 1), true]);
                CreateNormal(tex);
                this.mHeightBuf.SetTexture(tex);
            });
            this.GetFrame().Res().Push(this.mHeightTexture, tex);
            CreateNormal(tex);
        }
        if (this.mSplatTexture == null) {
            this.mSplatTexture = "splat.tex";
            const tex = this.mSplatBuf.GetTexture();
            tex.mModifyEvent = new CEvent(async () => {
                await CClass.CallAsync(null, "BufferTool", [tex.GetBuf()[0], new CVec3(tex.GetWidth(), tex.GetHeight(), 1), true]);
                this.mSplatBuf.SetTexture(tex);
            });
            this.GetFrame().Res().Push(this.mSplatTexture, tex);
        }
        if (this.mSplatArrayTexture == null) {
            this.mSplatArrayTexture = "splatArray.tex";
            const tex = new CTexture();
            tex.SetSize(this.mSplatBuf.mCount.x, this.mSplatBuf.mCount.y);
            tex.PushInfo([new CTextureInfo(CTexture.eTarget.Array, CTexture.eFormat.RGBA8, 12)]);
            tex.SetFilter(CTexture.eFilter.Linear);
            tex.SetMipMap(CTexture.eMipmap.GL);
            tex.SetWrap(CTexture.eWrap.Repeat);
            tex.mReadPixelEvent = new CEvent(this.GetFrame().Ren().ReadPixel, this);
            this.GetFrame().Res().Push(this.mSplatArrayTexture, tex);
        }
        if (this.FindComp(CPaintTerrain) == null) {
            let texAllLoaded = true;
            for (let i = 0; i < this.mTexture.length; i++) {
                const texKey = this.mTexture[i];
                if (texKey != null && texKey != "" && typeof (texKey) == "string") {
                    if (this.GetFrame().Res().Find(texKey) == null)
                        texAllLoaded = false;
                    if (this.GetFrame().Load().IsLoad(texKey) == false)
                        this.GetFrame().Load().Exe(texKey);
                }
            }
            if (texAllLoaded == false)
                return;
            const splatArrayTex = this.GetFrame().Res().Find(this.mSplatArrayTexture);
            splatArrayTex.CreateBuf();
            const splatArrayTexBuf = splatArrayTex.GetBuf()[0];
            for (let i = 0; i < 12; i++) {
                let defaultCol = new CVec4();
                if (0 <= i && i < 4) {
                    defaultCol.w = 1;
                }
                else if (4 <= i && i < 8) {
                    defaultCol.x = 1;
                    defaultCol.w = 1;
                }
                else {
                    defaultCol.x = 0.5;
                    defaultCol.y = 0.5;
                    defaultCol.z = 1;
                }
                let texKeyOrCol = this.mTexture[i];
                let tex = null;
                if (texKeyOrCol instanceof CVec4) {
                    defaultCol = texKeyOrCol;
                }
                else {
                    tex = this.GetFrame().Res().Find(texKeyOrCol);
                }
                let reducedTex = tex != null ?
                    CImgPro.SqurEnlargedReduced(tex.GetWidth(), tex.GetHeight(), tex.GetBuf()[0], splatArrayTex.GetWidth() / tex.GetWidth(), splatArrayTex.GetHeight() / tex.GetHeight(), 4) :
                    CImgPro.Square(splatArrayTex.GetWidth(), splatArrayTex.GetHeight(), defaultCol);
                if (tex != null && tex.GetYFlip() == true) {
                    const off = splatArrayTex.GetWidth() * splatArrayTex.GetHeight() * 4 * i;
                    for (let y = 0; y < reducedTex.GetHeight(); y++)
                        for (let x = 0; x < reducedTex.GetWidth(); x++) {
                            const flippedY = (reducedTex.GetHeight() - 1) - y;
                            const flippedIdx = (flippedY * splatArrayTex.GetWidth() + x) * 4;
                            const idx = (y * splatArrayTex.GetWidth() + x) * 4;
                            splatArrayTexBuf[off + idx + 0] = reducedTex.GetBuf()[0][flippedIdx + 0];
                            splatArrayTexBuf[off + idx + 1] = reducedTex.GetBuf()[0][flippedIdx + 1];
                            splatArrayTexBuf[off + idx + 2] = reducedTex.GetBuf()[0][flippedIdx + 2];
                            splatArrayTexBuf[off + idx + 3] = reducedTex.GetBuf()[0][flippedIdx + 3];
                        }
                }
                else {
                    splatArrayTexBuf.set(reducedTex.GetBuf()[0], splatArrayTex.GetWidth() * splatArrayTex.GetHeight() * 4 * i);
                }
            }
            this.GetFrame().Ren().BuildTexture(splatArrayTex);
            this.SetTestMode();
            const textureList = [];
            textureList.push(this.mSplatArrayTexture);
            textureList.push(this.mSplatTexture);
            textureList.push(this.mHeightTexture);
            const PushPaintTerrain = (_level, _levelRepeatCount, _levelScale, _cellIndex) => {
                const pt = this.PushComp(new CPaintTerrain(textureList, this.GetPos(), this.mTerrainHeight, _level, _levelRepeatCount, _levelScale, this.mHeightBuf.mSize, _cellIndex, this.mTexCodi, this.mDefaultHeight));
                for (let tag of this.mTag) {
                    pt.PushTag(tag);
                }
                return pt;
            };
            for (let row = 0; row < 2; row++)
                for (let col = 0; col < 2; col++) {
                    PushPaintTerrain(0, 1, 1, new CVec3(row - 0.5, 0, col - 0.5));
                }
            let levelScale = 1;
            for (let level = 0; level < this.mLevel.length; level++) {
                const levelRepeatCount = this.mLevel[level];
                for (let repeat = 0; repeat < levelRepeatCount; repeat++) {
                    const max = 4 + repeat * 2;
                    const center = 1.5 + repeat;
                    const limit = max - 1;
                    for (let i = 0; i < max; i++) {
                        PushPaintTerrain(level, levelRepeatCount, levelScale, new CVec3(0 - center, 0, i - center));
                        PushPaintTerrain(level, levelRepeatCount, levelScale, new CVec3(limit - center, 0, i - center));
                        if (i > 0 && i < limit) {
                            PushPaintTerrain(level, levelRepeatCount, levelScale, new CVec3(i - center, 0, 0 - center));
                            PushPaintTerrain(level, levelRepeatCount, levelScale, new CVec3(i - center, 0, limit - center));
                        }
                    }
                }
                levelScale *= levelRepeatCount + 1;
            }
        }
    }
}
export class CColliderTerrain extends CCollider {
    mTerrain;
    constructor(_terrain) {
        super();
        this.mTerrain = _terrain;
        this.MatUpdate();
        this.SetEvent(CCollider.eEvent.Static);
    }
    IsShould(_member, _type) {
        if (_member == "mTerrain")
            return false;
        return super.IsShould(_member, _type);
    }
    Update(_update) {
        if (this.GetOwner().mUpdateMat != CUpdate.eType.Not) {
            this.MatUpdate();
        }
        super.Update(_update);
    }
    MatUpdate() {
        this.mBound.Reset();
        this.mBound.mMin.x = 0;
        this.mBound.mMin.y = 0;
        this.mBound.mMin.z = 0;
        this.mBound.mMax.x = this.mTerrain.mHeightBuf.mCount.x * this.mTerrain.mHeightBuf.mSize;
        this.mBound.mMax.y = this.mTerrain.mTerrainHeight;
        this.mBound.mMax.z = this.mTerrain.mHeightBuf.mCount.y * this.mTerrain.mHeightBuf.mSize;
        this.mBound.SetType(CBound.eType.Box);
    }
    GetHeightTerrain(_x, _z) {
        const terrainSize = this.mTerrain.mHeightBuf.mCount.x * this.mTerrain.mHeightBuf.mSize;
        const halfTexX = 1.0 / this.mTerrain.mHeightBuf.mCount.x;
        const halfTexZ = 1.0 / this.mTerrain.mHeightBuf.mCount.y;
        const w2tX = (this.mTerrain.mHeightBuf.mCount.x - 1) * halfTexX;
        const w2tZ = (this.mTerrain.mHeightBuf.mCount.y - 1) * halfTexZ;
        const uvX = (_x - this.mTerrain.GetPos().x) / terrainSize * w2tX + halfTexX * 0.5;
        const uvZ = (_z - this.mTerrain.GetPos().z) / terrainSize * w2tZ + halfTexZ * 0.5;
        const x0 = Math.floor(uvX * this.mTerrain.mHeightBuf.mCount.x);
        const z0 = Math.floor(uvZ * this.mTerrain.mHeightBuf.mCount.y);
        const coordX = (_x % terrainSize) / terrainSize;
        const coordZ = (_z % terrainSize) / terrainSize;
        const rgb00 = this.mTerrain.mHeightBuf.RGB(new CCIndex(x0 + 0, z0 + 0)) || 0;
        const rgb10 = this.mTerrain.mHeightBuf.RGB(new CCIndex(x0 + 1, z0 + 0)) || 0;
        const rgb01 = this.mTerrain.mHeightBuf.RGB(new CCIndex(x0 + 0, z0 + 1)) || 0;
        const rgb11 = this.mTerrain.mHeightBuf.RGB(new CCIndex(x0 + 1, z0 + 1)) || 0;
        const h00 = ((((rgb00 >> 24) & 0xff) << 8) | ((rgb00 >> 16) & 0xff)) / (256 * 256 - 1) * this.mTerrain.mTerrainHeight + this.mTerrain.GetPos().y;
        const h10 = ((((rgb10 >> 24) & 0xff) << 8) | ((rgb10 >> 16) & 0xff)) / (256 * 256 - 1) * this.mTerrain.mTerrainHeight + this.mTerrain.GetPos().y;
        const h01 = ((((rgb01 >> 24) & 0xff) << 8) | ((rgb01 >> 16) & 0xff)) / (256 * 256 - 1) * this.mTerrain.mTerrainHeight + this.mTerrain.GetPos().y;
        const h11 = ((((rgb11 >> 24) & 0xff) << 8) | ((rgb11 >> 16) & 0xff)) / (256 * 256 - 1) * this.mTerrain.mTerrainHeight + this.mTerrain.GetPos().y;
        if (coordX <= (1 - coordZ)) {
            return h00 + coordX * (h10 - h00) + coordZ * (h01 - h00);
        }
        else {
            return h11 + (1 - coordX) * (h01 - h11) + (1 - coordZ) * (h10 - h11);
        }
    }
    GetNormalTerrain(_x, _z) {
        const terrainSize = this.mTerrain.mHeightBuf.mCount.x * this.mTerrain.mHeightBuf.mSize;
        const halfTexX = 1.0 / this.mTerrain.mHeightBuf.mCount.x;
        const halfTexZ = 1.0 / this.mTerrain.mHeightBuf.mCount.y;
        const w2tX = (this.mTerrain.mHeightBuf.mCount.x - 1) * halfTexX;
        const w2tZ = (this.mTerrain.mHeightBuf.mCount.y - 1) * halfTexZ;
        const uvX = (_x - this.mTerrain.GetPos().x) / terrainSize * w2tX + halfTexX * 0.5;
        const uvZ = (_z - this.mTerrain.GetPos().z) / terrainSize * w2tZ + halfTexZ * 0.5;
        const x0 = Math.floor(uvX * this.mTerrain.mHeightBuf.mCount.x);
        const z0 = Math.floor(uvZ * this.mTerrain.mHeightBuf.mCount.y);
        const coordX = (_x % terrainSize) / terrainSize;
        const coordZ = (_z % terrainSize) / terrainSize;
        const rgb00 = this.mTerrain.mHeightBuf.RGB(new CCIndex(x0 + 0, z0 + 0)) || 0;
        const rgb10 = this.mTerrain.mHeightBuf.RGB(new CCIndex(x0 + 1, z0 + 0)) || 0;
        const rgb01 = this.mTerrain.mHeightBuf.RGB(new CCIndex(x0 + 0, z0 + 1)) || 0;
        const rgb11 = this.mTerrain.mHeightBuf.RGB(new CCIndex(x0 + 1, z0 + 1)) || 0;
        const h00 = ((((rgb00 >> 24) & 0xff) << 8) | ((rgb00 >> 16) & 0xff)) / (256 * 256 - 1) * this.mTerrain.mTerrainHeight + this.mTerrain.GetPos().y;
        const h10 = ((((rgb10 >> 24) & 0xff) << 8) | ((rgb10 >> 16) & 0xff)) / (256 * 256 - 1) * this.mTerrain.mTerrainHeight + this.mTerrain.GetPos().y;
        const h01 = ((((rgb01 >> 24) & 0xff) << 8) | ((rgb01 >> 16) & 0xff)) / (256 * 256 - 1) * this.mTerrain.mTerrainHeight + this.mTerrain.GetPos().y;
        const h11 = ((((rgb11 >> 24) & 0xff) << 8) | ((rgb11 >> 16) & 0xff)) / (256 * 256 - 1) * this.mTerrain.mTerrainHeight + this.mTerrain.GetPos().y;
        const step = this.mTerrain.mHeightBuf.mSize;
        const normal = new CVec3(0, 1, 0);
        if (coordX <= (1 - coordZ)) {
            const e1 = new CVec3(step, h10 - h00, 0);
            const e2 = new CVec3(0, h01 - h00, step);
            normal.x = e2.y * e1.z - e2.z * e1.y;
            normal.y = e2.z * e1.x - e2.x * e1.z;
            normal.z = e2.x * e1.y - e2.y * e1.x;
        }
        else {
            const e1 = new CVec3(-step, h01 - h11, 0);
            const e2 = new CVec3(0, h10 - h11, -step);
            normal.x = e2.y * e1.z - e2.z * e1.y;
            normal.y = e2.z * e1.x - e2.x * e1.z;
            normal.z = e2.x * e1.y - e2.y * e1.x;
        }
        CMath.V3Nor(normal, normal);
        return normal;
    }
    ClosestPointOnTriangle(p, tri) {
        const [a, b, c] = tri;
        const ab = CMath.V3SubV3(b, a), ac = CMath.V3SubV3(c, a), ap = CMath.V3SubV3(p, a);
        const d1 = CMath.V3Dot(ab, ap), d2 = CMath.V3Dot(ac, ap);
        if (d1 <= 0 && d2 <= 0)
            return a;
        const bp = CMath.V3SubV3(p, b);
        const d3 = CMath.V3Dot(ab, bp), d4 = CMath.V3Dot(ac, bp);
        if (d3 >= 0 && d4 <= d3)
            return b;
        const cp = CMath.V3SubV3(p, c);
        const d5 = CMath.V3Dot(ab, cp), d6 = CMath.V3Dot(ac, cp);
        if (d6 >= 0 && d5 <= d6)
            return c;
        const vc = d1 * d4 - d3 * d2;
        if (vc <= 0 && d1 >= 0 && d3 <= 0) {
            const v = d1 / (d1 - d3);
            return CMath.V3AddV3(a, CMath.V3MulFloat(ab, v));
        }
        const vb = d5 * d2 - d1 * d6;
        if (vb <= 0 && d2 >= 0 && d6 <= 0) {
            const w = d2 / (d2 - d6);
            return CMath.V3AddV3(a, CMath.V3MulFloat(ac, w));
        }
        const va = d3 * d6 - d5 * d4;
        if (va <= 0 && (d4 - d3) >= 0 && (d5 - d6) >= 0) {
            const w = (d4 - d3) / ((d4 - d3) + (d5 - d6));
            return CMath.V3AddV3(b, CMath.V3MulFloat(CMath.V3SubV3(c, b), w));
        }
        const denom = 1 / (va + vb + vc);
        return CMath.V3AddV3(a, CMath.V3AddV3(CMath.V3MulFloat(ab, vb * denom), CMath.V3MulFloat(ac, vc * denom)));
    }
    CollisionChk(_co, _colTarget, _colPush) {
        let push = null;
        if (_co.GetBound().GetType() == CBound.eType.Sphere) {
            const radius = _co.mBW.mRadian;
            const center = _co.mBW.mCenter;
            const N = this.mTerrain.mHeightBuf.mCount.x;
            const cellSize = this.mTerrain.mHeightBuf.mSize;
            const half = N * cellSize * 0.5;
            const minI = Math.max(0, Math.floor((center.x - radius + half) / cellSize));
            const maxI = Math.min(N - 2, Math.ceil((center.x + radius + half) / cellSize));
            const minJ = Math.max(0, Math.floor((center.z - radius + half) / cellSize));
            const maxJ = Math.min(N - 2, Math.ceil((center.z + radius + half) / cellSize));
            for (let i = minI; i <= maxI; i++) {
                for (let j = minJ; j <= maxJ; j++) {
                    const wx0 = -half + i * cellSize;
                    const wz0 = -half + j * cellSize;
                    const wx1 = wx0 + cellSize, wz1 = wz0 + cellSize;
                    const h00 = this.GetHeightTerrain(wx0, wz0);
                    const h10 = this.GetHeightTerrain(wx1, wz0);
                    const h01 = this.GetHeightTerrain(wx0, wz1);
                    const h11 = this.GetHeightTerrain(wx1, wz1);
                    const tris = [
                        [new CVec3(wx0, h00, wz0), new CVec3(wx1, h10, wz0), new CVec3(wx1, h11, wz1)],
                        [new CVec3(wx0, h00, wz0), new CVec3(wx1, h11, wz1), new CVec3(wx0, h01, wz1)]
                    ];
                    for (const tri of tris) {
                        const closest = this.ClosestPointOnTriangle(center, tri);
                        const diff = CMath.V3SubV3(center, closest);
                        const dist = CMath.V3Len(diff);
                        if (dist < radius && dist > 1e-9) {
                            if (push == null)
                                push = new CVec3(0, 0, 0);
                            CMath.V3AddV3(push, CMath.V3MulFloat(diff, radius - dist), push);
                        }
                    }
                }
            }
        }
        else if (_co.GetBound().GetType() == CBound.eType.Box) {
            const steps = 5;
            const x = _co.mBW.mWBound.mMin.x;
            const z = _co.mBW.mWBound.mMin.z;
            const hx = _co.mBW.mWBound.mMax.x - _co.mBW.mWBound.mMin.x;
            const hz = _co.mBW.mWBound.mMax.z - _co.mBW.mWBound.mMin.z;
            const bottomY = _co.mBW.mWBound.mMin.y;
            let maxPenetration = 0;
            for (let i = 0; i <= steps; i++)
                for (let k = 0; k <= steps; k++) {
                    const wx = x + hx * (i / steps);
                    const wz = z + hz * (i / steps);
                    const terrainY = this.GetHeightTerrain(wx, wz);
                    const penetration = terrainY - bottomY;
                    if (penetration > 0) {
                        if (penetration > maxPenetration) {
                            maxPenetration = penetration;
                            const normal = this.GetNormalTerrain(wx, wz);
                            push = CMath.V3MulFloat(normal, penetration);
                        }
                    }
                }
        }
        if (push != null) {
            if (Math.abs(push.x) < CPhysics.CutMinPushValue)
                push.x = 0;
            if (Math.abs(push.y) < CPhysics.CutMinPushValue)
                push.y = 0;
            if (Math.abs(push.z) < CPhysics.CutMinPushValue)
                push.z = 0;
            if (push.IsZero())
                return false;
            _co.mColPair.set(this, push);
            if (_colTarget != null)
                _colTarget.Push(_co);
            if (_colPush != null)
                _colPush.Push(push);
            return true;
        }
        return false;
    }
}
