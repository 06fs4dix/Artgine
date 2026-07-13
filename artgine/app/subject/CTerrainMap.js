import { CUpdate } from "../../basic/Basic.js";
import { CClass } from "../../basic/CClass.js";
import { CEvent } from "../../basic/CEvent.js";
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
export class CTerrainMap extends CSubject {
    mHeightBuf = new CMapBuf();
    mSplatBuf = new CMapBuf();
    mHeightTexture = null;
    mSplatTexture = null;
    mLayerTexture = null;
    mTerrainHeight = 1024;
    mDefaultHeight = 1024;
    mLevel = [1, 1, 1, 1, 1];
    mTexture = new Array();
    mTexCodi = new CMat([
        32, 32, 0, 0,
        32, 32, 0, 0,
        32, 32, 0, 0,
        32, 32, 0, 0
    ]);
    mTag = new Set();
    mCollider;
    constructor(_collider = true) {
        super();
        this.mHeightBuf.Reset(new CVec3(1024, 1024, 1), 10);
        this.mSplatBuf.Reset(new CVec3(1024, 1024, 1), 10);
        if (_collider)
            this.mCollider = this.PushComp(new CColliderTerrain(this));
    }
    ClearAll() {
        this.mHeightTexture = null;
        this.mSplatTexture = null;
        this.mLayerTexture = null;
        this.RemoveComps(CPaintTerrain);
    }
    SetLevel(_level) {
        this.mLevel = _level;
        this.ClearAll();
    }
    SetSplat(_splatTexs, _splatTexCodi) {
        this.mTexture = [..._splatTexs];
        this.mTexCodi.Import(_splatTexCodi);
    }
    ToggleDebugMode() {
        const TEST_COLORS = [
            new CColor(0.000, 1, 1, CColor.eModel.HSV),
            new CColor(0.083, 1, 1, CColor.eModel.HSV),
            new CColor(0.166, 1, 1, CColor.eModel.HSV),
            new CColor(0.333, 1, 1, CColor.eModel.HSV),
            new CColor(0.500, 1, 1, CColor.eModel.HSV),
            new CColor(0.666, 1, 1, CColor.eModel.HSV),
            new CColor(0.750, 1, 1, CColor.eModel.HSV),
            new CColor(0.833, 1, 1, CColor.eModel.HSV)
        ];
        for (const pt of this.FindComps(CPaintTerrain)) {
            if (pt.GetRenderPass()[0].mLine != 1) {
                pt.SetColorModel(TEST_COLORS[pt.mLevel.x % TEST_COLORS.length]);
                pt.PushRenderPass(new CRenderPass(this.GetFrame().Pal().SlTerrainKey()).Set("mLine", 1));
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
            this.ToggleDebugMode();
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
        if (this.FindComp(CPaintTerrain) != null)
            return;
        if (!this.LoadSplatTextures())
            return;
        this.InitTexture();
        this.InitPaints();
    }
    LoadSplatTextures() {
        let allLoaded = true;
        for (const texKey of this.mTexture) {
            if (texKey == null || texKey === "" || typeof texKey !== "string")
                continue;
            if (this.GetFrame().Res().Find(texKey) == null)
                allLoaded = false;
            if (!this.GetFrame().Load().IsLoad(texKey))
                this.GetFrame().Load().Exe(texKey);
        }
        return allLoaded;
    }
    InitTexture() {
        if (this.mHeightTexture == null) {
            this.mHeightTexture = `height${this.Key()}.tex`;
            if (this.GetFrame().Res().Find(this.mHeightTexture) != null)
                this.GetFrame().Ren().ReleaseTexture(this.GetFrame().Res().Find(this.mHeightTexture));
            const heightTex = this.mHeightBuf.GetTexture().Set("mFilter", CTexture.eFilter.Linear);
            this.GetFrame().Res().Push(this.mHeightTexture, heightTex);
            const BakeNormal = (_tex) => {
                const scale = 0.05;
                const texBuf = _tex.GetBuf()[0];
                const [w, h] = [_tex.GetWidth(), _tex.GetHeight()];
                const H = (_x, _y) => {
                    const idx = (CMath.Clamp(_y, 0, h - 1) * w + CMath.Clamp(_x, 0, w - 1)) * 4;
                    return ((texBuf[idx] << 8) + texBuf[idx + 1]) / 65535;
                };
                for (let y = 0; y < h; y++)
                    for (let x = 0; x < w; x++) {
                        const dx = H(x + 1, y + 0) - H(x - 1, y + 0), dy = H(x + 0, y + 1) - H(x + 0, y - 1);
                        const len = Math.sqrt(dx * dx * scale * scale + dy * dy * scale * scale + scale * scale * scale * scale);
                        const idx = (y * w + x) * 4;
                        texBuf[idx + 2] = (0.5 - dx * scale / len * 0.5) * 255;
                        texBuf[idx + 3] = (0.5 + dy * scale / len * 0.5) * 255;
                    }
            };
            BakeNormal(heightTex);
            heightTex.mModifyEvent = new CEvent(() => {
                CClass.CallAsync(null, "BufferTool", [heightTex.GetBuf()[0], new CVec3(heightTex.GetWidth(), heightTex.GetHeight(), 1), true]).then(() => {
                    this.mHeightBuf.SetTexture(heightTex);
                    BakeNormal(heightTex);
                });
            });
        }
        if (this.mSplatTexture == null) {
            this.mSplatTexture = `splat${this.Key()}.tex`;
            if (this.GetFrame().Res().Find(this.mSplatTexture) != null)
                this.GetFrame().Ren().ReleaseTexture(this.GetFrame().Res().Find(this.mSplatTexture));
            const splatTex = this.mSplatBuf.GetTexture().Set("mFilter", CTexture.eFilter.Linear);
            this.GetFrame().Res().Push(this.mSplatTexture, splatTex);
            splatTex.mModifyEvent = new CEvent(() => {
                CClass.CallAsync(null, "BufferTool", [splatTex.GetBuf()[0], new CVec3(splatTex.GetWidth(), splatTex.GetHeight(), 1), true]).then(() => {
                    this.mSplatBuf.SetTexture(splatTex);
                });
            });
        }
        if (this.mLayerTexture == null) {
            this.mLayerTexture = `layer${this.Key()}.tex`;
            if (this.GetFrame().Res().Find(this.mLayerTexture) != null)
                this.GetFrame().Ren().ReleaseTexture(this.GetFrame().Res().Find(this.mLayerTexture));
            const layerTex = new CTexture().Set("mWidth", 1024).Set("mHeight", 1024).Set("mFilter", CTexture.eFilter.Linear).Set("mMipMap", CTexture.eMipmap.GL).Set("mWrap", CTexture.eWrap.Repeat);
            layerTex.PushInfo([new CTextureInfo(CTexture.eTarget.Array, CTexture.eFormat.RGBA8, 12)]);
            this.GetFrame().Res().Push(this.mLayerTexture, layerTex);
            layerTex.mReadPixelEvent = new CEvent(this.GetFrame().Ren().ReadPixel, this);
            if (layerTex.GetBuf().length == 0)
                layerTex.CreateBuf();
            const layerBuf = layerTex.GetBuf()[0];
            const EnlargeTexture = (_org, _default) => {
                if (_org instanceof CVec4)
                    return CImgPro.Square(layerTex.GetWidth(), layerTex.GetHeight(), _org);
                if (_org == null)
                    return CImgPro.Square(layerTex.GetWidth(), layerTex.GetHeight(), _default);
                const orgTex = this.GetFrame().Res().Find(_org);
                const result = CImgPro.SqurEnlargedReduced(orgTex.GetWidth(), orgTex.GetHeight(), orgTex.GetBuf()[0], layerTex.GetWidth() / orgTex.GetWidth(), layerTex.GetHeight() / orgTex.GetHeight(), 4);
                if (orgTex.GetYFlip()) {
                    const temp = new Uint8Array(result.GetWidth() * 4);
                    for (let y = 0; y < (result.GetHeight() >> 1); y++) {
                        temp.set(result.GetBuf()[0].subarray(y * result.GetWidth() * 4, (y + 1) * result.GetWidth() * 4));
                        result.GetBuf()[0].copyWithin(y * result.GetWidth() * 4, (result.GetHeight() - 1 - y) * result.GetWidth() * 4, (result.GetHeight() - y) * result.GetWidth() * 4);
                        result.GetBuf()[0].set(temp, (result.GetHeight() - 1 - y) * result.GetWidth() * 4);
                    }
                }
                return result;
            };
            for (let i = 0; i < 4; i++) {
                layerBuf.set(EnlargeTexture(this.mTexture[i], new CVec4(0, 0, 0, 1)).GetBuf()[0], layerTex.GetWidth() * layerTex.GetHeight() * 4 * i);
            }
            for (let i = 4; i < 8; i++) {
                layerBuf.set(EnlargeTexture(this.mTexture[i], new CVec4(1, 0.5, 0, 1)).GetBuf()[0], layerTex.GetWidth() * layerTex.GetHeight() * 4 * i);
            }
            for (let i = 8; i < 12; i++) {
                layerBuf.set(EnlargeTexture(this.mTexture[i], new CVec4(0.5, 0.5, 1, 0)).GetBuf()[0], layerTex.GetWidth() * layerTex.GetHeight() * 4 * i);
            }
            this.GetFrame().Ren().BuildTexture(layerTex);
        }
    }
    InitPaints() {
        const textureList = [this.mLayerTexture, this.mSplatTexture, this.mHeightTexture];
        const Spawn = (_level, _repeatCount, _scale, _cellIndex) => {
            const pt = this.PushComp(new CPaintTerrain(textureList, this.GetPos(), this.mTerrainHeight, _level, _repeatCount, _scale, this.mHeightBuf.mSize, _cellIndex, this.mTexCodi, this.mDefaultHeight));
            for (let tag of this.mTag)
                pt.PushTag(tag);
            return pt;
        };
        for (let x = 0; x < 2; x++)
            for (let y = 0; y < 2; y++) {
                Spawn(0, 1, 1, new CVec3(x - 0.5, 0, y - 0.5));
            }
        let levelScale = 1;
        for (const [level, repeatCount] of this.mLevel.entries()) {
            for (let repeat = 0; repeat < repeatCount; repeat++) {
                const size = 4 + repeat * 2;
                const center = 1.5 + repeat;
                const limit = size - 1;
                for (let i = 0; i < size; i++) {
                    Spawn(level, repeatCount, levelScale, new CVec3(0 - center, 0, i - center));
                    Spawn(level, repeatCount, levelScale, new CVec3(limit - center, 0, i - center));
                    if (i > 0 && i < limit) {
                        Spawn(level, repeatCount, levelScale, new CVec3(i - center, 0, 0 - center));
                        Spawn(level, repeatCount, levelScale, new CVec3(i - center, 0, limit - center));
                    }
                }
            }
            levelScale *= repeatCount + 1;
        }
    }
    SampleHeights(_worldX, _worldZ) {
        const pixelX = (_worldX - this.GetPos().x) / this.mHeightBuf.mSize * (this.mHeightBuf.mCount.x - 0.5) / this.mHeightBuf.mCount.x;
        const pixelY = (_worldZ - this.GetPos().z) / this.mHeightBuf.mSize * (this.mHeightBuf.mCount.y - 0.5) / this.mHeightBuf.mCount.y;
        const xi = Math.floor(pixelX), yi = Math.floor(pixelY);
        const xf = pixelX - xi, yf = pixelY - yi;
        const decodeHeight = (_rgb) => {
            const r = (_rgb >> 24) & 0xff, g = (_rgb >> 16) & 0xff;
            return ((r << 8) | g) / 65535;
        };
        const sample = (dx, dy) => decodeHeight(this.mHeightBuf.RGB(new CCIndex(xi + dx, yi + dy)) || 0) * this.mTerrainHeight + this.GetPos().y;
        return { xf, yf, h00: sample(0, 0), h10: sample(1, 0), h01: sample(0, 1), h11: sample(1, 1) };
    }
    GetHeight(_worldX, _worldZ) {
        const { xf, yf, h00, h10, h01, h11 } = this.SampleHeights(_worldX, _worldZ);
        if (xf <= (1 - yf))
            return h00 + xf * (h10 - h00) + yf * (h01 - h00);
        return h10 + h01 - h11 + xf * (h11 - h01) + yf * (h11 - h10);
    }
    GetNormal(_worldX, _worldZ) {
        const { xf, yf, h00, h10, h01, h11 } = this.SampleHeights(_worldX, _worldZ);
        if (xf <= (1 - yf))
            return CMath.V3Nor(CMath.V3Cross(new CVec3(0, h01 - h00, this.mHeightBuf.mSize), new CVec3(this.mHeightBuf.mSize, h10 - h00, 0)));
        else
            return CMath.V3Nor(CMath.V3Cross(new CVec3(0, h10 - h11, -this.mHeightBuf.mSize), new CVec3(-this.mHeightBuf.mSize, h01 - h11, 0)));
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
        if (this.GetOwner().mUpdateMat != CUpdate.eType.Not)
            this.MatUpdate();
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
    ClosestPointOnTriangle(_point, _triVertA, _triVertB, _triVertC) {
        const xp = CPoolGeo.ProductV3();
        const ab = CMath.V3SubV3(_triVertB, _triVertA), ac = CMath.V3SubV3(_triVertC, _triVertA);
        const ap = CMath.V3SubV3(_point, _triVertA, xp);
        const d1 = CMath.V3Dot(ab, ap), d2 = CMath.V3Dot(ac, ap);
        if (d1 <= 0 && d2 <= 0) {
            CPoolGeo.RecycleV3(xp);
            return _triVertA.Export();
        }
        const bp = CMath.V3SubV3(_point, _triVertB, xp);
        const d3 = CMath.V3Dot(ab, bp), d4 = CMath.V3Dot(ac, bp);
        if (d3 >= 0 && d4 <= d3) {
            CPoolGeo.RecycleV3(xp);
            return _triVertB.Export();
        }
        const cp = CMath.V3SubV3(_point, _triVertC, xp);
        const d5 = CMath.V3Dot(ab, cp), d6 = CMath.V3Dot(ac, cp);
        if (d6 >= 0 && d5 <= d6) {
            CPoolGeo.RecycleV3(xp);
            return _triVertC.Export();
        }
        const vc = d1 * d4 - d3 * d2;
        if (vc <= 0 && d1 >= 0 && d3 <= 0) {
            const v = d1 / (d1 - d3);
            const result = CMath.V3AddV3(_triVertA, CMath.V3MulFloat(ab, v, xp));
            CPoolGeo.RecycleV3(xp);
            return result;
        }
        const vb = d5 * d2 - d1 * d6;
        if (vb <= 0 && d2 >= 0 && d6 <= 0) {
            const w = d2 / (d2 - d6);
            const result = CMath.V3AddV3(_triVertA, CMath.V3MulFloat(ac, w, xp));
            CPoolGeo.RecycleV3(xp);
            return result;
        }
        const va = d3 * d6 - d5 * d4;
        if (va <= 0 && (d4 - d3) >= 0 && (d5 - d6) >= 0) {
            const w = (d4 - d3) / ((d4 - d3) + (d5 - d6));
            const result = CMath.V3AddV3(_triVertB, CMath.V3MulFloat(CMath.V3SubV3(_triVertC, _triVertB, xp), w, xp));
            CPoolGeo.RecycleV3(xp);
            return result;
        }
        const denom = 1 / (va + vb + vc);
        const result = CMath.V3MulFloat(ab, vb * denom);
        CMath.V3AddV3(result, CMath.V3MulFloat(ac, vc * denom, xp), result);
        CPoolGeo.RecycleV3(xp);
        return CMath.V3AddV3(_triVertA, result, result);
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
                    const h00 = this.mTerrain.GetHeight(wx0, wz0);
                    const h10 = this.mTerrain.GetHeight(wx1, wz0);
                    const h01 = this.mTerrain.GetHeight(wx0, wz1);
                    const h11 = this.mTerrain.GetHeight(wx1, wz1);
                    const tris = [
                        [new CVec3(wx0, h00, wz0), new CVec3(wx1, h10, wz0), new CVec3(wx1, h11, wz1)],
                        [new CVec3(wx0, h00, wz0), new CVec3(wx1, h11, wz1), new CVec3(wx0, h01, wz1)]
                    ];
                    for (const tri of tris) {
                        const closest = this.ClosestPointOnTriangle(center, tri[0], tri[1], tri[2]);
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
                    const terrainY = this.mTerrain.GetHeight(wx, wz);
                    const penetration = terrainY - bottomY;
                    if (penetration > 0) {
                        if (penetration > maxPenetration) {
                            maxPenetration = penetration;
                            const normal = this.mTerrain.GetNormal(wx, wz);
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
