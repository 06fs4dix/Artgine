import { CUpdate } from "../../artgine/basic/Basic.js";
import { CClass } from "../../artgine/basic/CClass.js";
import { CAlpha, CColor } from "../../artgine/canvas/component/CColor.js";
import { CPaint } from "../../artgine/canvas/component/paint/CPaint.js";
import { CPaint2D } from "../../artgine/canvas/component/paint/CPaint2D.js";
import { CPaint3D } from "../../artgine/canvas/component/paint/CPaint3D.js";
import { CBound } from "../../artgine/geometry/CBound.js";
import { CMat } from "../../artgine/geometry/CMat.js";
import { CMath } from "../../artgine/geometry/CMath.js";
import { CVec1 } from "../../artgine/geometry/CVec1.js";
import { CVec2 } from "../../artgine/geometry/CVec2.js";
import { CVec3 } from "../../artgine/geometry/CVec3.js";
import { CVec4 } from "../../artgine/geometry/CVec4.js";
import { CCamera } from "../../artgine/render/CCamera.js";
import { CRenderPass } from "../../artgine/render/CRenderPass.js";
import { CShaderAttr } from "../../artgine/render/CShaderAttr.js";
import { CTexture, CTextureInfo } from "../../artgine/render/CTexture.js";
import { SDF } from "../../artgine/z_file/SDF.js";
class CProjectedArea {
    m_points = [];
    m_size = new CVec2();
    m_maxDistFromBound = 0;
}
function ProjectPointsOntoPlane(_corners, _planePos, _planeNor) {
    const n = CMath.V3Nor(_planeNor);
    return _corners.map(p => {
        const v = CMath.V3SubV3(p, _planePos);
        const dist = CMath.V3Dot(v, n);
        return CMath.V3SubV3(p, CMath.V3MulFloat(n, dist));
    });
}
function GetUVBasis(_planeNor) {
    const n = CMath.V3Nor(_planeNor);
    const arbitrary = Math.abs(n.y) < 0.99 ? new CVec3(0, 1, 0) : new CVec3(0, 0, 1);
    const uVec = CMath.V3Nor(CMath.V3Cross(arbitrary, n));
    const vVec = CMath.V3Nor(CMath.V3Cross(n, uVec));
    return { uVec, vVec };
}
function Compute2DBounds(_coords) {
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
function Convert2DTo3D(_boundingBox2D, _planePos, _uVec, _vVec) {
    return _boundingBox2D.map(({ u, v }) => CMath.V3AddV3(_planePos, CMath.V3AddV3(CMath.V3MulFloat(_uVec, u), CMath.V3MulFloat(_vVec, v))));
}
function RaycastPointToPlane(p, dir, planePos, planeNor) {
    const denom = CMath.V3Dot(planeNor, dir);
    if (Math.abs(denom) < 1e-6)
        return null;
    const t = CMath.V3Dot(CMath.V3SubV3(planePos, p), planeNor) / denom;
    if (t < 0)
        return null;
    return CMath.V3AddV3(p, CMath.V3MulFloat(dir, t));
}
function ComputeShadowAreaOntoPlane(_bound, _planeNor, _planePos, _ligDir) {
    const corners = [
        new CVec3(_bound.mMin.x, _bound.mMin.y, _bound.mMin.z),
        new CVec3(_bound.mMin.x, _bound.mMin.y, _bound.mMax.z),
        new CVec3(_bound.mMin.x, _bound.mMax.y, _bound.mMin.z),
        new CVec3(_bound.mMin.x, _bound.mMax.y, _bound.mMax.z),
        new CVec3(_bound.mMax.x, _bound.mMin.y, _bound.mMin.z),
        new CVec3(_bound.mMax.x, _bound.mMin.y, _bound.mMax.z),
        new CVec3(_bound.mMax.x, _bound.mMax.y, _bound.mMin.z),
        new CVec3(_bound.mMax.x, _bound.mMax.y, _bound.mMax.z),
    ];
    const ligDir = CMath.V3MulFloat(CMath.V3Nor(_ligDir), -1);
    const { uVec, vVec } = GetUVBasis(_planeNor);
    const hitPoints = [];
    for (const corner of corners) {
        const hit = RaycastPointToPlane(corner, ligDir, _planePos, _planeNor);
        if (hit)
            hitPoints.push(hit);
    }
    if (hitPoints.length === 0) {
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
    let maxDist = 0;
    for (const pCorner of corners) {
        for (const pShadow of boundingBox3D) {
            const dist = CMath.V3Distance(pCorner, pShadow);
            if (dist > maxDist)
                maxDist = dist;
        }
    }
    const area = new CProjectedArea();
    area.m_points = boundingBox3D;
    area.m_size = new CVec2(maxU - minU, maxV - minV);
    area.m_maxDistFromBound = maxDist;
    return area;
}
function ComputeProjectionArea(_bound, _planeNor, _planePos) {
    const corners = [
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
function Smoothstep(_edge0, _edge1, _x) {
    let t = CMath.Clamp((_x - _edge0) / (_edge1 - _edge0), 0.0, 1.0);
    return t * t * (3.0 - 2.0 * t);
}
function LightFalloff(_dist, _inner, _outer) {
    if (_dist <= _inner)
        return 1.0;
    if (_dist >= _outer)
        return 0.0;
    let t = (_dist - _inner) / (_outer - _inner);
    return 1.0 - Smoothstep(0.0, 1.0, t);
}
export class CShadowPlane extends CPaint2D {
    m_shadowLen = 1;
    m_shadowAlpha = 0.75;
    m_updateShadow = false;
    m_ptKey;
    m_ligKeys;
    m_pt;
    m_lig;
    m_ligSet = new Set();
    constructor(_ptKey = null, _ligKeys = []) {
        super();
        this.m_ptKey = _ptKey;
        this.m_ligKeys = _ligKeys;
        this.PushCShaderAttr(new CShaderAttr("alphaCut", 0.001));
        this.SetColorModel(new CColor(0, 0, 0, CColor.eModel.RGBMul));
        this.SetAlphaModel(new CAlpha(0.75, CAlpha.eModel.Mul));
    }
    IsShould(_member, _type) {
        const hide = [
            "m_updateShadow", "m_pt", "m_lig", "m_ligSet"
        ];
        if (hide.includes(_member))
            return false;
        return super.IsShould(_member, _type);
    }
    EditChange(_pointer, _childe) {
        super.EditChange(_pointer, _childe);
        let change = [
            "m_shadowLen", "m_shadowAlpha", "m_ptKey", "m_ligKeys"
        ];
        if (change.includes(_pointer.member)) {
            this.m_updateShadow = true;
        }
    }
    Update(_delay) {
        this.UpdatePaintTarget();
        this.UpdateLightTarget();
        if (this.m_pt?.IsUpdateFMat() || this.m_updateShadow) {
            this.UpdateShadow();
        }
        if (this.m_updateShadow) {
            this.m_updateShadow = false;
        }
        this.UpdateAlpha();
        super.Update(_delay);
    }
    UpdatePaintTarget() {
        if (this.m_ptKey != null && this.m_pt?.Key() == this.m_ptKey)
            return;
        if (this.m_ptKey == null && this.m_pt != null)
            return;
        this.m_pt = null;
        const owner = this.GetOwner();
        if (owner == null)
            return;
        for (const pt of owner.FindComps(CPaint)) {
            if (pt instanceof CShadowPlane)
                continue;
            if (pt.GetBound().GetType() == CBound.eType.Null)
                continue;
            if (pt.IsUpdateFMat())
                continue;
            if (pt instanceof CPaint3D && !pt.mTree)
                continue;
            if (this.m_ptKey && this.m_ptKey != pt.Key())
                continue;
            this.m_pt = pt;
            break;
        }
    }
    UpdateLightTarget() {
        for (let lig of this.m_ligSet) {
            if (!lig.GetOwner() || lig.GetOwner().GetFrame() == null || lig.IsDestroy()) {
                this.m_ligSet.delete(lig);
            }
        }
        if (!this.m_pt)
            return;
        const directs = [];
        const points = [];
        for (let lig of this.m_ligSet) {
            if (this.m_ligKeys.length) {
                if (this.m_ligKeys.includes(lig.Key()) || this.m_ligKeys.includes(lig.GetOwner().Key())) { }
                else
                    continue;
            }
            if (lig.IsPointLight())
                points.push(lig);
            else
                directs.push(lig);
        }
        let pickedLig = null;
        let minDist = Number.MAX_SAFE_INTEGER;
        const center = this.GetPaintCenter();
        for (let point of points) {
            const dist = CMath.V3Distance(point.GetDirectPos(), center);
            if (dist < point.GetOutRadius() && dist < minDist) {
                minDist = dist;
                pickedLig = point;
            }
        }
        if (!pickedLig && directs.length)
            pickedLig = directs[0];
        if (pickedLig != this.m_lig) {
            this.m_lig = pickedLig;
            this.m_updateShadow = true;
        }
        if (this.m_lig?.mUpdate == CUpdate.eType.Updated) {
            this.m_updateShadow = true;
        }
    }
    UpdateShadow() {
        this.ResetTail();
        if (!this.m_pt || !this.m_lig) {
            this.SetPosList([new CVec3(), new CVec3(), new CVec3(), new CVec3()]);
            this.mUpdateLMat = true;
            return;
        }
        if (this.m_pt instanceof CPaint2D) {
            this.UpdateShadow2D();
        }
        else if (this.m_pt instanceof CPaint3D) {
            this.UpdateShadow3D();
        }
    }
    ResetTail() {
        this.SetTexCodi(new CVec4(1, 1, 0, 0));
        this.RemoveTag("wind");
        this.SetYSort(false);
    }
    GetPaintCenter() {
        if (!this.m_pt)
            return;
        if (this.m_pt instanceof CPaint2D) {
            const fBound = this.m_pt.GetBoundFMat();
            const p1 = new CVec3(fBound.mMin.x, fBound.mMin.y);
            const p2 = new CVec3(fBound.mMax.x, fBound.mMin.y);
            return CMath.V3MulFloat(CMath.V3AddV3(p1, p2), 0.5);
        }
        else {
            return this.m_pt.GetBoundFMat().GetCenter();
        }
    }
    GetLightDirection() {
        if (!this.m_lig || !this.m_pt)
            return new CVec3(0, 1, 0);
        const c = this.GetPaintCenter();
        if (this.m_lig.IsPointLight()) {
            return CMath.V3Nor(CMath.V3SubV3(c, this.m_lig.GetDirectPos()));
        }
        else {
            return CMath.V3Nor(this.m_lig.GetDirectPos());
        }
    }
    UpdateAlpha() {
        let reset = false;
        for (let rp of this.GetRenderPass()) {
            if (rp.mSort != CRenderPass.eSort.RPAlphaGroup) {
                rp.mSort = CRenderPass.eSort.RPAlphaGroup;
                reset = true;
                rp.Reset();
            }
        }
        if (reset) {
            this.BatchClear();
        }
    }
    UpdateShadow2D() {
        const pt = this.m_pt;
        const lig = this.m_lig;
        const fBound = pt.GetBoundFMat();
        const p1 = new CVec3(fBound.mMin.x, fBound.mMin.y);
        const p2 = new CVec3(fBound.mMax.x, fBound.mMin.y);
        const dir = this.GetLightDirection();
        const c = this.GetPaintCenter();
        let height;
        let alpha;
        if (lig.IsPointLight()) {
            const inner = lig.GetInRadius();
            const outer = lig.GetOutRadius();
            const dist = CMath.V3Distance(c, lig.GetDirectPos());
            alpha = LightFalloff(dist, inner, outer);
            if (this.m_shadowLen == 0) {
                height = (outer - dist);
            }
            else {
                height = fBound.GetSize().y * this.m_shadowLen;
            }
        }
        else {
            alpha = 1;
            height = fBound.GetSize().y * this.m_shadowLen;
        }
        const p1Far = CMath.V3AddV3(p1, CMath.V3MulFloat(dir, height));
        const p2Far = CMath.V3AddV3(p2, CMath.V3MulFloat(dir, height));
        const ptFMat = CMath.MatMul(pt.GetLMat(), pt.GetOwner().GetWMat());
        const posOffset = new CVec3(ptFMat.x, ptFMat.y);
        CMath.V3SubV3(p1, posOffset, p1);
        CMath.V3SubV3(p2, posOffset, p2);
        CMath.V3SubV3(p1Far, posOffset, p1Far);
        CMath.V3SubV3(p2Far, posOffset, p2Far);
        const lmat = pt.GetLMat().Export();
        lmat.z -= CPaint2D.mYSortZShift * 2.0 / (CPaint2D.mYSortRange.y - CPaint2D.mYSortRange.x);
        this.SetSize(pt.GetSize().Export());
        this.SetTexture(pt.GetTexture());
        this.SetTexCodi(pt.GetTexCodi());
        this.mAutoLoad = pt.mAutoLoad.Export();
        if (pt.GetTag().has("wind") && pt instanceof CPaint2D) {
            this.PushTag("wind");
            this.mWindInfluence.x = pt.mWindInfluence instanceof CVec1 ? pt.mWindInfluence.x : pt.mWindInfluence;
        }
        if (pt.mYSort)
            this.SetYSort(true);
        this.SetPosList([p1Far, p2Far, p1, p2]);
        this.SetLMat(lmat);
        this.SetAlphaModel(new CAlpha(alpha * this.m_shadowAlpha, CAlpha.eModel.Mul));
    }
    UpdateShadow3D() {
        const pt = this.m_pt;
        const lig = this.m_lig;
        const ligDir = CMath.V3Nor(lig.GetDirectPos());
        const fBound = this.m_pt.GetBoundFMat();
        const fCenter = fBound.GetCenter();
        const floorDist = ((5 + this.m_shadowLen) - fCenter.y) / ligDir.y;
        const shadowPlanePos = CMath.V3AddV3(fCenter, CMath.V3MulFloat(ligDir, floorDist));
        const area = ComputeShadowAreaOntoPlane(fBound, new CVec3(0, 1, 0), shadowPlanePos, ligDir);
        const points = area.m_points;
        points.forEach(p => CMath.V3SubV3(p, this.GetOwner().GetPos(), p));
        this.SetPosList(points);
        this.mUpdateLMat = true;
        this.CaptureShadow();
        this.SetAlphaModel(new CAlpha(this.m_shadowAlpha, CAlpha.eModel.Mul));
    }
    CaptureShadow() {
        const pt = this.m_pt;
        const lig = this.m_lig;
        const fw = this.GetOwner().GetFrame();
        const bound = pt.GetBound();
        const center = bound.GetCenter();
        const ligDir = new CVec3(0, 1, 0);
        const eye = CMath.V3AddV3(center, CMath.V3MulFloat(ligDir, bound.GetOutRadius()));
        const shadowPlanePos = CMath.V3AddV3(center, ligDir);
        const area = ComputeShadowAreaOntoPlane(pt.GetBound(), ligDir, shadowPlanePos, ligDir);
        let texKey = pt.Key() + "_Shadow.tex";
        this.SetTexture(texKey);
        if (fw.Res().Find(texKey) != null)
            return;
        fw.Ren().BuildRenderTarget([new CTextureInfo(CTexture.eTarget.Sigle, CTexture.eFormat.RGBA8)], new CVec2(512, 512), texKey);
        let tex = fw.Res().Find(texKey);
        tex.SetAutoResize(false);
        const cam = new CCamera(fw.PF());
        cam.SetSize(area.m_size.x, area.m_size.y);
        cam.Init(eye, CMath.V3SubV3(eye, ligDir));
        cam.ResetOrthographic();
        cam.Update(1);
        const tempRP = new CRenderPass();
        tempRP.mBlend[2] = CRenderPass.eBlend.ONE;
        tempRP.mBlend[3] = CRenderPass.eBlend.ZERO;
        tempRP.mBlend[4] = CRenderPass.eBlend.ONE;
        tempRP.mBlend[5] = CRenderPass.eBlend.ZERO;
        const beforeRP = fw.Dev().ChangeRenderPass(tempRP);
        fw.Dev().SetClearColor(true, new CVec4(0.5, 0.5, 0.5, 0));
        fw.Ren().Begin(tex);
        const vf = fw.Res().Find(fw.Pal().Sl3D().GetShader("Pre3SkinC").mKey);
        fw.Ren().UseShader(vf);
        fw.Ren().SendGPU(vf, new CMat(), "worldMat");
        fw.Ren().SendGPU(vf, cam.GetViewMat(), "viewMat");
        fw.Ren().SendGPU(vf, cam.GetProjMat(), "projectMat");
        if (pt.mMeshRes.skin.length > 0) {
            fw.Ren().SendGPU(vf, pt.mWeightMat, "weightArrMat", 16);
            fw.Ren().SendGPU(vf, pt.mSkinType, "skin");
        }
        else {
            fw.Ren().SendGPU(vf, SDF.eSkin.None, "skin");
        }
        fw.Ren().SendGPU(vf, [fw.Pal().GetBlackTex()]);
        let nodeOff = 0;
        let node = pt.mTreeNode;
        while (node.Size() != nodeOff) {
            const nodemp = node.Find(nodeOff);
            if (nodemp.md.mData != null && nodemp.md.mData.ci != null) {
                fw.Ren().SendGPU(vf, nodemp.mpi.mData.pst, "worldMat");
                const meshDraw = pt.GetDrawMesh(pt.mMesh + nodemp.md.mKey, vf, nodemp.md.mData.ci);
                this.GetOwner().GetFrame().Ren().MeshDrawNodeRender(vf, meshDraw);
            }
            nodeOff++;
        }
        fw.Ren().End(tex);
        fw.Dev().ChangeRenderPass(beforeRP);
    }
    SetLight(_light) {
        this.m_ligSet.add(_light);
    }
}
CClass.Push(CShadowPlane);
