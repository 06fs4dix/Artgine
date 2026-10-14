import { CRPAuto } from "../../artgine/app/canvas/CRPMgr.js";
import { CBrushComp } from "../../artgine/app/component/CBrushComp.js";
import { CPaint } from "../../artgine/app/component/paint/CPaint.js";
import { CPaint3D } from "../../artgine/app/component/paint/CPaint3D.js";
import { CPaintTrail } from "../../artgine/app/component/paint/CPaintTrail.js";
import { CAlert } from "../../artgine/basic/CAlert.js";
import { CSubject } from "../../artgine/app/subject/CSubject.js";
import { CUpdate } from "../../artgine/basic/Basic.js";
import { CClass } from "../../artgine/basic/CClass.js";
import { CEvent } from "../../artgine/basic/CEvent.js";
import { CUniqueID } from "../../artgine/basic/CUniqueID.js";
import { CMath } from "../../artgine/geometry/CMath.js";
import { CVec1 } from "../../artgine/geometry/CVec1.js";
import { CVec2 } from "../../artgine/geometry/CVec2.js";
import { CVec3 } from "../../artgine/geometry/CVec3.js";
import { CVec4 } from "../../artgine/geometry/CVec4.js";
import { CMeshCreateInfo } from "../../artgine/render/CMeshCreateInfo.js";
import { CRenderPass } from "../../artgine/render/CRenderPass.js";
import { CVertexFormat } from "../../artgine/render/CShader.js";
import { CShaderAttr } from "../../artgine/render/CShaderAttr.js";
import { CTexture, CTextureInfo } from "../../artgine/render/CTexture.js";
import { CUtilRender } from "../../artgine/render/CUtilRender.js";
import { CCondition } from "../../artgine/util/CCondition.js";
import { CFrame } from "../../artgine/util/CFrame.js";
import { CPlugin } from "../../artgine/util/CPlugin.js";
import { SDF } from "../../artgine/z_file/SDF.js";
let gWaterShader = "";
CPlugin.PushEvent(CEvent.eType.Load, () => {
    gWaterShader = CPlugin.FindPath("Water") + "WaterShader.ts";
    CFrame.Main().Load().Exe(gWaterShader);
});
export class CWater3D extends CSubject {
    mPaint;
    mReflector;
    mRefractor;
    mWaterHeight = new CVec1(1.0);
    mDeepColor = new CVec3(0.1, 0.2, 0.4);
    mShallowColor = new CVec3();
    mWaterDeep = new CVec4(10, 255, 30);
    mWaterUnderFadeDist = new CVec2(0, 4000);
    mCausticFlowDir = new CVec2(0, 0);
    mCausticFlowFrequency = new CVec1(1);
    mNormalFlowDir = new CVec2(0, 0);
    mWaterTex = null;
    constructor() {
        super();
        this.mPaint = new CPaint3D(CFrame.Main().Pal().GetPlaneMesh());
        this.mPaint.PushRenderPass(new CRenderPass(gWaterShader));
        this.mPaint.PushTag("water");
        this.mPaint.PushTag("3D");
        this.mPaint.SetTexture([]);
        this.mPaint.PushCShaderAttr(new CShaderAttr("deepColor", this.mDeepColor));
        this.mPaint.PushCShaderAttr(new CShaderAttr("shallowColor", this.mShallowColor));
        this.mPaint.PushCShaderAttr(new CShaderAttr("waterDeep", this.mWaterDeep));
        this.mPaint.PushCShaderAttr(new CShaderAttr("waterHeight", this.mWaterHeight));
        this.mPaint.PushCShaderAttr(new CShaderAttr("waterUnderFadeDist", this.mWaterUnderFadeDist));
        this.mPaint.PushCShaderAttr(new CShaderAttr("normalflowDir", this.mNormalFlowDir));
        this.PushComp(this.mPaint);
    }
    GetPT() {
        return this.mPaint;
    }
    Update(_update) {
        super.Update(_update);
        if (this.mUpdateMat == CUpdate.eType.Updated) {
            this.mWaterDeep.x = this.GetPos().y;
        }
        const renPt = this.mPaint.mRenPT[0];
        if (renPt != null) {
            const cam = renPt.mCam;
            const accuracy = (cam.mProjFar ?? 100000) / (cam.mProjNear ?? 1);
            const worldSizeX = Math.abs(this.GetSca().x);
            const worldSizeY = Math.abs(this.GetSca().y);
            const scaleX = CMath.Clamp(Math.floor(accuracy * worldSizeX / (50000 * 100000)), 1, 1000);
            const scaleY = CMath.Clamp(Math.floor(accuracy * worldSizeY / (50000 * 100000)), 1, 1000);
            const waterMeshKey = `waterMesh${scaleX}:${scaleY}`;
            if (this.GetFrame().Res().Find(waterMeshKey) == null) {
                const rVal = new CMeshCreateInfo();
                const size = CUtilRender.Mesh2DSize / 2.0;
                const nor = new CVec3(0, 0, 1);
                let dir = new CVec3(1 - CMath.Abs(nor.x), 1 - CMath.Abs(nor.y), 1 - CMath.Abs(nor.z));
                let mdir = CMath.V3MulFloat(dir, -1);
                let cro = CMath.V3Cross(nor, dir);
                let mcro = CMath.V3MulFloat(cro, -1);
                mdir = CMath.V3MulFloat(mdir, size);
                cro = CMath.V3MulFloat(cro, size);
                mcro = CMath.V3MulFloat(mcro, size);
                dir = CMath.V3MulFloat(dir, size);
                rVal.bound.InitBound(mdir, true);
                rVal.bound.InitBound(mcro, true);
                rVal.bound.InitBound(dir, true);
                rVal.bound.InitBound(cro, true);
                const GetUV = (x, y) => {
                    return new CVec2(x / scaleX, y / scaleY);
                };
                const GetPoint = (uv) => {
                    const left = CMath.V3Interpolate(mdir, cro, uv.y);
                    const right = CMath.V3Interpolate(mcro, dir, uv.y);
                    return CMath.V3Interpolate(left, right, uv.x);
                };
                const posb = rVal.Create(CVertexFormat.eIdentifier.Position);
                const uvb = rVal.Create(CVertexFormat.eIdentifier.UV);
                const norb = rVal.Create(CVertexFormat.eIdentifier.Normal);
                const inb = rVal.Create(CVertexFormat.eIdentifier.Index);
                let vIndex = 0;
                for (let y = 0; y < scaleY; y++)
                    for (let x = 0; x < scaleX; x++) {
                        const uv0 = GetUV(x + 0, y + 0);
                        const uv1 = GetUV(x + 1, y + 0);
                        const uv2 = GetUV(x + 1, y + 1);
                        const uv3 = GetUV(x + 0, y + 1);
                        posb.bufF.Push(GetPoint(uv0));
                        posb.bufF.Push(GetPoint(uv1));
                        posb.bufF.Push(GetPoint(uv2));
                        posb.bufF.Push(GetPoint(uv3));
                        uvb.bufF.Push(uv0);
                        uvb.bufF.Push(uv1);
                        uvb.bufF.Push(uv2);
                        uvb.bufF.Push(uv3);
                        norb.bufF.Push(nor);
                        norb.bufF.Push(nor);
                        norb.bufF.Push(nor);
                        norb.bufF.Push(nor);
                        inb.bufI.push(vIndex + 0);
                        inb.bufI.push(vIndex + 1);
                        inb.bufI.push(vIndex + 2);
                        inb.bufI.push(vIndex + 2);
                        inb.bufI.push(vIndex + 3);
                        inb.bufI.push(vIndex + 0);
                        vIndex += 4;
                    }
                rVal.vertexCount = posb.bufF.Size(3);
                rVal.indexCount = inb.bufI.length;
                const mesh = CUtilRender.CMeshCreateInfoToCMesh(rVal, this.GetFrame().Pal().GetBlackTex());
                this.GetFrame().Res().Push(waterMeshKey, mesh);
                CUtilRender.MeshBoundUpdate(mesh);
            }
            if (this.mPaint.GetMesh() != waterMeshKey) {
                this.mPaint.SetMesh(waterMeshKey);
                if (this.mWaterTex != null)
                    this.mPaint.SetTexture([this.mWaterTex]);
            }
        }
    }
    Light() {
        this.mPaint.PushTag(CPaint.eTag.Light);
        this.mPaint.PushCShaderAttr(new CShaderAttr("ligStep0", SDF.eLightStep0.HafeLambert));
        this.mPaint.PushCShaderAttr(new CShaderAttr("ligStep1", SDF.eLightStep1.BlinnPhong));
    }
    Shadow(_shadowReadTex) {
        this.mPaint.PushTag(CPaint.eTag.Shadow);
        this.mPaint.PushTag(CPaint.eTag.ShadowReadOnly);
        this.mPaint.PushCShaderAttr(new CShaderAttr(SDF.eTexSlot.SingleShadowRead, _shadowReadTex));
        this.mPaint.PushCShaderAttr(new CShaderAttr("shadowOn", new CVec1(1)));
    }
    SetWaterDeep(_deepHeight, _nearDistance, _farDistance, _deepColor, _shallowColor) {
        if (_deepHeight != null)
            this.mWaterDeep.y = _deepHeight;
        if (_nearDistance != null)
            this.mWaterUnderFadeDist.x = _nearDistance;
        if (_farDistance != null)
            this.mWaterUnderFadeDist.y = _farDistance;
        if (_deepColor != null)
            this.mDeepColor.Import(_deepColor);
        if (_shallowColor != null)
            this.mShallowColor.Import(_shallowColor);
    }
    NormalFlow(_flow) {
        this.mNormalFlowDir.Import(_flow);
    }
    AddRefractor(_texture = undefined, _flow = new CVec2(0, 0)) {
        if (_texture == undefined) {
            if (this.mRefractor != null)
                return;
            this.mRefractor = new CRefractor3D();
            this.PushComp(this.mRefractor);
            this.mRefractor.AddCaustics(this.mCausticFlowDir, this.mCausticFlowFrequency);
            this.mRefractor.AddNormalFlow(this.mNormalFlowDir);
            this.mRefractor.AddWaterDeep(this.mWaterDeep, this.mWaterUnderFadeDist, this.mShallowColor, this.mDeepColor, this.mWaterHeight);
            this.mPaint.PushTag("UseRefractTex");
            this.mPaint.PushCShaderAttr(new CShaderAttr("refractionMap", 2.0));
            this.mPaint.PushCShaderAttr(new CShaderAttr(2.0, this.mRefractor.GetTex()));
            return;
        }
        else {
            this.RemoveRefractor();
            this.mPaint.PushTag("UseWaterTex");
            this.mPaint.PushCShaderAttr(new CShaderAttr("texflowDir", _flow));
            if (this.mPaint.mAutoLoad != null)
                this.mPaint.mAutoLoad.mWrap = CTexture.eWrap.Repeat;
            this.mWaterTex = _texture;
            this.mPaint.SetTexture([_texture]);
        }
    }
    RemoveRefractor() {
        if (this.mRefractor == null)
            return;
        this.mPaint.RemoveTag("UseRefractTex");
        this.mRefractor.Destroy();
        this.mRefractor = null;
    }
    AddCaustics(_flow = new CVec2(0, 0), _frequency = 1.0) {
        this.mCausticFlowDir.Import(_flow);
        this.mCausticFlowFrequency.x = _frequency;
        if (this.mRefractor == null) {
            this.AddRefractor();
        }
    }
    AddReflector(_texture = undefined) {
        if (_texture == undefined) {
            if (this.mReflector != null)
                return;
            this.mReflector = new CReflector3D();
            this.PushComp(this.mReflector);
            this.mReflector.AddWaterDeep(this.mWaterDeep);
            this.mPaint.PushTag("UseWaterReflect");
            this.mPaint.PushCShaderAttr(new CShaderAttr("reflectionMap", 1.0));
            this.mPaint.PushCShaderAttr(new CShaderAttr(1.0, this.mReflector.GetTex()));
            return;
        }
        else {
            this.RemoveReflector();
            this.mPaint.PushTag("UseCubeTex");
            this.mPaint.PushCShaderAttr(new CShaderAttr("reflectionMap", 0.0));
            this.mPaint.PushCShaderAttr(new CShaderAttr(0.0, _texture));
        }
    }
    RemoveReflector() {
        if (this.mReflector == null)
            return;
        this.mPaint.RemoveTag("UseWaterReflect");
        this.mReflector.Destroy();
        this.mReflector = null;
    }
}
export class CReflector3D extends CBrushComp {
    mSize = 256;
    mCycle = 0;
    constructor() {
        super("reflector_" + CUniqueID.Get());
        {
            const rp = new CRPAuto(CFrame.Main().Pal().Sl3D().mKey);
            rp.mCopy = false;
            rp.mPriority = CRenderPass.ePriority.Normal - 1;
            rp.mRenderTarget = this.GetTex();
            rp.mCamera = this.mTexKey;
            rp.PushOr(new CCondition("class", "==", "CPaint3D"));
            rp.PushAnd(new CCondition("mTag[water]", "==", false));
            rp.mShaderAttr.push(new CShaderAttr(SDF.eTexSlot.ArrEnvmap, CFrame.Main().Pal().GetEnvMapTex()));
            this.PushRPAuto(rp);
        }
        {
            const rp = new CRPAuto(CFrame.Main().Pal().SlTerrain().mKey);
            rp.mCopy = false;
            rp.mPriority = CRenderPass.ePriority.Normal - 1;
            rp.mRenderTarget = this.GetTex();
            rp.mCamera = this.mTexKey;
            rp.PushOr(new CCondition("class", "==", "CPaintTerrain"));
            rp.PushAnd(new CCondition("mTag[water]", "==", false));
            rp.mShaderAttr.push(new CShaderAttr(SDF.eTexSlot.ArrEnvmap, CFrame.Main().Pal().GetEnvMapTex()));
            this.PushRPAuto(rp);
        }
        {
            const rp = new CRPAuto(CFrame.Main().Pal().SlCube().mKey);
            rp.mCopy = false;
            rp.mPriority = CRenderPass.ePriority.Normal - 1;
            rp.mRenderTarget = this.GetTex();
            rp.mCamera = this.mTexKey;
            rp.mCullFace = CRenderPass.eCull.None;
            rp.mCullFrustum = false;
            rp.PushOr(new CCondition("class", "==", "CPaintCube"));
            rp.PushAnd(new CCondition("mTag[water]", "==", false));
            rp.PushAnd(new CCondition("mTag[sky]"));
            this.PushRPAuto(rp);
        }
    }
    AddWaterDeep(_waterDeep) {
        for (let rp of this.mWriteRP) {
            rp.mTag.add("waterReflect");
            rp.mShaderAttr.push(new CShaderAttr("waterDeep", _waterDeep));
        }
    }
    V3Reflect(_vec, _normal) {
        const dotProduct = CMath.V3Dot(_vec, _normal);
        return new CVec3(_vec.x - _normal.x * 2 * dotProduct, _vec.y - _normal.y * 2 * dotProduct, _vec.z - _normal.z * 2 * dotProduct);
    }
    Update(_update) {
        super.Update(_update);
        if (this.mBrush != null)
            this.UpdateBrush(_update);
    }
    UpdateBrush(_update) {
        const fw = this.GetOwner().GetFrame();
        let tex = fw.Res().Find(this.GetTex());
        if (!tex) {
            fw.Ren().BuildRenderTarget([new CTextureInfo(CTexture.eTarget.Sigle, CTexture.eFormat.RGBA8, 1)], new CVec2(this.mSize, this.mSize), this.GetTex());
            tex = fw.Res().Find(this.GetTex());
            tex.SetAutoResize(false);
            tex.SetFilter(CTexture.eFilter.Linear);
            tex.SetMipMap(CTexture.eMipmap.GL);
        }
        const expectedSize = Math.trunc(this.mSize * fw.PF().mRTScaleW);
        if (tex.GetWidth() != expectedSize) {
            fw.Ren().BuildRenderTarget([new CTextureInfo(CTexture.eTarget.Sigle, CTexture.eFormat.RGBA8, 1)], new CVec2(this.mSize, this.mSize), this.GetTex());
        }
        for (const rp of this.mWriteRP) {
            const rpKey = this.mTexKey + rp.mShader;
            if (!this.mBrush.AutoRP().has(rpKey)) {
                this.mBrush.PushAutoRP(rpKey, rp);
            }
            if (rp.mCycle != this.mCycle) {
                rp.mCycle = this.mCycle;
                this.mBrush.mAutoRPUpdate = CUpdate.eType.Updated;
            }
        }
        const mainCam = this.mBrush.GetCam3D();
        {
            const virtualCam = this.mBrush.GetCamera(this.mTexKey);
            const wMat = this.GetOwner().GetMat();
            const pos = wMat.xyz;
            const rot = CMath.QutToMat(CMath.MatDecomposeRot(wMat));
            const normal = new CVec3(0, 1, 0);
            const view = CMath.V3SubV3(pos, mainCam.GetEye());
            const realUp = CMath.V3Cross(mainCam.GetView(), mainCam.GetCross());
            const eye = CMath.V3AddV3(CMath.V3MulFloat(this.V3Reflect(view, normal), -1), pos);
            const look = CMath.V3AddV3(CMath.V3MulFloat(this.V3Reflect(CMath.V3SubV3(pos, mainCam.GetLook()), normal), -1), pos);
            const up = this.V3Reflect(realUp, normal);
            if (virtualCam.Init(eye, look, up)) {
                virtualCam.SetFar(mainCam.GetFar());
                virtualCam.SetFov(mainCam.mFov);
                if (mainCam.mOrthographic)
                    virtualCam.ResetOrthographic();
                else
                    virtualCam.ResetPerspective();
            }
        }
    }
    Destroy() {
        super.Destroy();
        if (this.mWriteRP.length > 0) {
            for (const rp of this.mWriteRP) {
                const rpKey = this.mTexKey + rp.mShader;
                this.mBrush.RemoveAutoRP(rpKey);
            }
            this.mWriteRP.length = 0;
        }
    }
}
export class CRefractor3D extends CBrushComp {
    mSize = 512;
    mCycle = 0;
    constructor() {
        super("refractor_" + CUniqueID.Get());
        {
            const rp = new CRPAuto(CFrame.Main().Pal().Sl3D().mKey);
            rp.mCopy = false;
            rp.mAlpha = false;
            rp.mPriority = CRenderPass.ePriority.Normal - 1;
            rp.mRenderTarget = this.GetTex();
            rp.mCamera = this.mTexKey;
            rp.PushOr(new CCondition("class", "==", "CPaint3D"));
            rp.PushAnd(new CCondition("mTag[water]", "==", false));
            rp.mShaderAttr.push(new CShaderAttr(SDF.eTexSlot.ArrEnvmap, CFrame.Main().Pal().GetEnvMapTex()));
            this.PushRPAuto(rp);
        }
        {
            const rp = new CRPAuto(CFrame.Main().Pal().SlTerrain().mKey);
            rp.mCopy = false;
            rp.mAlpha = false;
            rp.mPriority = CRenderPass.ePriority.Normal - 1;
            rp.mRenderTarget = this.GetTex();
            rp.mCamera = this.mTexKey;
            rp.PushOr(new CCondition("class", "==", "CPaintTerrain"));
            rp.PushAnd(new CCondition("mTag[water]", "==", false));
            rp.mShaderAttr.push(new CShaderAttr(SDF.eTexSlot.ArrEnvmap, CFrame.Main().Pal().GetEnvMapTex()));
            this.PushRPAuto(rp);
        }
    }
    AddWaterDeep(_waterDeep, _waterDist, _shallowColor, _deepColor, _waterHeight) {
        for (let rp of this.mWriteRP) {
            rp.mTag.add("waterRefract");
            rp.mTag.add("waterProcessing");
            rp.mShaderAttr.push(new CShaderAttr("waterDeep", _waterDeep));
            rp.mShaderAttr.push(new CShaderAttr("waterUnderFadeDist", _waterDist));
            rp.mShaderAttr.push(new CShaderAttr("shallowColor", _shallowColor));
            rp.mShaderAttr.push(new CShaderAttr("deepColor", _deepColor));
            rp.mShaderAttr.push(new CShaderAttr("waterHeight", _waterHeight));
        }
    }
    AddCaustics(_flow, _freq) {
        for (let rp of this.mWriteRP) {
            rp.mTag.add("waterRefract");
            rp.mTag.add("waterProcessing");
            rp.mShaderAttr.push(new CShaderAttr("causticFlowDir", _flow));
            rp.mShaderAttr.push(new CShaderAttr("causticFlowFreq", _freq));
        }
    }
    AddNormalFlow(_flow) {
        for (let rp of this.mWriteRP) {
            rp.mTag.add("waterRefract");
            rp.mTag.add("waterProcessing");
            rp.mShaderAttr.push(new CShaderAttr("normalflowDir", _flow));
        }
    }
    Update(_update) {
        super.Update(_update);
        if (this.mBrush != null)
            this.UpdateBrush(_update);
    }
    UpdateBrush(_update) {
        const fw = this.GetOwner().GetFrame();
        let tex = fw.Res().Find(this.GetTex());
        if (!tex) {
            fw.Ren().BuildRenderTarget([new CTextureInfo(CTexture.eTarget.Sigle, CTexture.eFormat.RGBA8, 1)], new CVec2(this.mSize, this.mSize), this.GetTex());
            tex = fw.Res().Find(this.GetTex());
            tex.SetAutoResize(false);
            tex.SetFilter(CTexture.eFilter.Linear);
            tex.SetMipMap(CTexture.eMipmap.GL);
        }
        const expectedSize = Math.trunc(this.mSize * fw.PF().mRTScaleW);
        if (tex.GetWidth() != expectedSize) {
            fw.Ren().BuildRenderTarget([new CTextureInfo(CTexture.eTarget.Sigle, CTexture.eFormat.RGBA8, 1)], new CVec2(this.mSize, this.mSize), this.GetTex());
        }
        for (const rp of this.mWriteRP) {
            const rpKey = this.mTexKey + rp.mShader;
            if (!this.mBrush.AutoRP().has(rpKey)) {
                this.mBrush.PushAutoRP(rpKey, rp);
            }
            if (rp.mCycle != this.mCycle) {
                rp.mCycle = this.mCycle;
                this.mBrush.mAutoRPUpdate = CUpdate.eType.Updated;
            }
        }
        const mainCam = this.mBrush.GetCam3D();
        {
            const virtualCam = this.mBrush.GetCamera(this.mTexKey);
            if (virtualCam.Init(mainCam.GetEye(), mainCam.GetLook())) {
                virtualCam.SetFar(mainCam.GetFar());
                virtualCam.SetFov(mainCam.mFov);
                if (mainCam.mOrthographic)
                    virtualCam.ResetOrthographic();
                else
                    virtualCam.ResetPerspective();
            }
        }
    }
    Destroy() {
        super.Destroy();
        if (this.mWriteRP.length > 0) {
            for (const rp of this.mWriteRP) {
                const rpKey = this.mTexKey + rp.mShader;
                this.mBrush.RemoveAutoRP(rpKey);
            }
            this.mWriteRP.length = 0;
        }
    }
}
export class CPaint2DWater extends CPaintTrail {
    SetSurface(_up, _down) {
        if (_up.length < 2 || _up.length != _down.length) {
            CAlert.E("CPaint2DWater.SetSurface : up/down 길이가 같아야 하고 2개 이상이어야 함");
            return;
        }
        this.UpdateBuffer(_up, _down);
    }
    SetColor(_shallow, _deep, _tint = 0.35) {
        this.PushCShaderAttr(new CShaderAttr("shallowColor", _shallow));
        this.PushCShaderAttr(new CShaderAttr("deepColor", _deep));
        this.PushCShaderAttr(new CShaderAttr("waterTint", _tint));
    }
    SetTint(_val) {
        this.PushCShaderAttr(new CShaderAttr("waterTint", _val));
    }
    SetWobble(_val) {
        this.PushCShaderAttr(new CShaderAttr("wobble", _val));
    }
    SetReflectivity(_val) {
        this.PushCShaderAttr(new CShaderAttr("reflectivity", _val));
    }
    SetReflectScale(_val) {
        this.PushCShaderAttr(new CShaderAttr("reflectScale", _val));
    }
    SetReflectAnchor(_anchorY, _blend) {
        this.PushCShaderAttr(new CShaderAttr("anchorY", _anchorY));
        this.PushCShaderAttr(new CShaderAttr("reflectAnchor", _blend));
    }
    SetReflectRange(_start, _end) {
        this.PushCShaderAttr(new CShaderAttr("reflectRange", new CVec2(_start, _end)));
    }
    SetTopSide(_top) {
        this.PushCShaderAttr(new CShaderAttr("waterTop", _top ? 1.0 : -1.0));
    }
}
export class CWater2D extends CSubject {
    mPaint;
    mReflector;
    mShare = null;
    constructor(_priority = CRenderPass.ePriority.AlphaAuto, _share = null) {
        super();
        if (_share == null) {
            this.mReflector = new CReflector2D();
            this.PushComp(this.mReflector);
        }
        else
            this.mShare = _share;
        this.mPaint = new CPaint2DWater(this.Reflector().GetTex());
        this.mPaint.RemoveTag("trail");
        const rp = new CRenderPass(gWaterShader, _priority);
        rp.mCullFrustum = false;
        this.mPaint.PushRenderPass(rp);
        this.mPaint.PushTag("water");
        this.mPaint.PushTag("2D");
        this.PushComp(this.mPaint);
        this.mPaint.PushCShaderAttr(new CShaderAttr("worldMat", this.mPaint.GetFMat()));
        this.mPaint.SetColor(new CVec3(0.25, 0.45, 0.55), new CVec3(0.02, 0.12, 0.25), 0.35);
        this.mPaint.SetWobble(0.005);
        this.mPaint.SetReflectivity(1.0);
        this.mPaint.SetReflectRange(0.25, 0.85);
        this.mPaint.SetReflectAnchor(0.0, 1.0);
        this.SetRect();
    }
    Reflector() {
        return this.mReflector != null ? this.mReflector : this.mShare.Reflector();
    }
    SetRect() {
        this.mPaint.SetSurface([new CVec3(-0.5, 0.5, 0.5), new CVec3(0.5, 0.5, 0.5)], [new CVec3(-0.5, -0.5, -0.5), new CVec3(0.5, -0.5, -0.5)]);
    }
    SetSurface(_up, _down) {
        this.mPaint.SetSurface(_up, _down);
    }
    SetSurfaceHeight(_height) {
        const up = new Array();
        const down = new Array();
        for (let i = 0; i < _height.length; ++i) {
            const x = -0.5 + i / (_height.length - 1);
            up.push(new CVec3(x, _height[i], _height[i]));
            down.push(new CVec3(x, -0.5, -0.5));
        }
        this.mPaint.SetSurface(up, down);
    }
    SetColor(_shallow, _deep, _tint = 0.35) {
        this.mPaint.SetColor(_shallow, _deep, _tint);
    }
    SetTint(_val) {
        this.mPaint.SetTint(_val);
    }
    SetWobble(_val) {
        this.mPaint.SetWobble(_val);
    }
    SetReflectivity(_val) {
        this.mPaint.SetReflectivity(_val);
    }
    SetReflectScale(_val) {
        this.mPaint.SetReflectScale(_val);
    }
    SetReflectAnchor(_anchorY, _blend) {
        this.mPaint.SetReflectAnchor(_anchorY, _blend);
    }
    SetReflectRange(_start, _end) {
        this.mPaint.SetReflectRange(_start, _end);
    }
    NormalFlow(_flow, _normalTex1 = null, _normalTex2 = null) {
        this.mPaint.PushCShaderAttr(new CShaderAttr("normalflowDir", _flow));
        if (_normalTex1 != null && _normalTex2 != null) {
            this.mPaint.PushTag("normalMap");
            this.mPaint.PushCShaderAttr(new CShaderAttr("normal1Map", 3.0));
            this.mPaint.PushCShaderAttr(new CShaderAttr(3.0, _normalTex1));
            this.mPaint.PushCShaderAttr(new CShaderAttr("normal2Map", 4.0));
            this.mPaint.PushCShaderAttr(new CShaderAttr(4.0, _normalTex2));
        }
        else {
            this.mPaint.RemoveTag("normalMap");
        }
    }
    Update(_update) {
        super.Update(_update);
        const refl = this.Reflector();
        if (this.mPaint.FindCShaderAttr("waterViewMat") == null && refl.mWaterCam != null) {
            this.mPaint.PushCShaderAttr(new CShaderAttr("waterViewMat", refl.mWaterCam.GetViewMat()));
            this.mPaint.PushCShaderAttr(new CShaderAttr("waterProjectMat", refl.mWaterCam.GetProjMat()));
        }
    }
}
export class CReflector2D extends CBrushComp {
    mSize = 512;
    mCycle = 0;
    mWaterCam;
    constructor() {
        super("reflector_" + CUniqueID.Get());
        {
            let rp = new CRPAuto(CFrame.Main().Pal().Sl2D().mKey);
            rp.mCamera = "WaterCam";
            rp.mPriority = CRenderPass.ePriority.Normal - 2;
            rp.mRenderTarget = this.GetTex();
            rp.PushOr(new CCondition("class", "==", "CPaint2D"));
            rp.PushAnd(new CCondition("mTag[water]", "==", false));
            rp.SetKey("water2dCPaint2D_" + this.GetTex());
            this.PushRPAuto(rp);
            rp = new CRPAuto(CFrame.Main().Pal().Sl2D().mKey);
            rp.mCamera = "WaterCam";
            rp.mPriority = CRenderPass.ePriority.Normal - 2;
            rp.mRenderTarget = this.GetTex();
            rp.PushOr(new CCondition("class", "==", "CPaintVoxel"));
            rp.PushAnd(new CCondition("mTag[water]", "==", false));
            rp.mShader = "Artgine/Voxel.sl";
            rp.SetKey("water2dCPaintVoxel_" + this.GetTex());
            this.PushRPAuto(rp);
            rp = new CRPAuto(CFrame.Main().Pal().Sl2D().mKey);
            rp.mPriority = CRenderPass.ePriority.Normal;
            rp.SetKey("rp1");
            rp.PushOr(new CCondition("class", "==", "CPaint2D"));
            rp.PushAnd(new CCondition("mTag[water]", "==", false));
            this.PushRPAuto(rp);
            rp = new CRPAuto(CFrame.Main().Pal().Sl2D().mKey);
            rp.mCamera = "WaterCam";
            rp.mPriority = CRenderPass.ePriority.Normal - 1;
            rp.mRenderTarget = this.GetTex();
            rp.mCullFace = CRenderPass.eCull.None;
            rp.PushOr(new CCondition("class", "==", "CShadowPlane"));
            rp.PushAnd(new CCondition("mTag[water]", "==", false));
            rp.SetKey("rp2_" + this.GetTex());
            this.PushRPAuto(rp);
            rp = new CRPAuto(CFrame.Main().Pal().Sl2D().mKey);
            rp.mPriority = CRenderPass.ePriority.AlphaAuto;
            rp.SetKey("rp3");
            rp.mCullFace = CRenderPass.eCull.None;
            rp.PushOr(new CCondition("class", "==", "CShadowPlane"));
            rp.PushAnd(new CCondition("mTag[water]", "==", false));
            this.PushRPAuto(rp);
        }
    }
    Update(_update) {
        super.Update(_update);
        if (this.mBrush != null)
            this.UpdateBrush(_update);
    }
    UpdateBrush(_update) {
        const fw = this.GetOwner().GetFrame();
        let tex = fw.Res().Find(this.GetTex());
        if (!tex) {
            fw.Ren().BuildRenderTarget([new CTextureInfo(CTexture.eTarget.Sigle, CTexture.eFormat.RGBA8, 1)], null, this.GetTex());
            tex = fw.Res().Find(this.GetTex());
        }
        const mainCam = this.mBrush.GetCam2D();
        this.mWaterCam = this.mBrush.GetCamera("WaterCam");
        if (this.mWaterCam.Init(mainCam.GetEye(), mainCam.GetLook())) {
            this.mWaterCam.SetFar(mainCam.GetFar());
            this.mWaterCam.SetFov(mainCam.mFov);
            this.mWaterCam.Set2DZoom(2.0 * mainCam.GetZoom());
            this.mWaterCam.ResetOrthographic();
        }
        for (const rp of this.mWriteRP) {
            if (!this.mBrush.AutoRP().has(rp.Key())) {
                this.mBrush.PushAutoRP(rp.Key(), rp);
            }
        }
    }
    Destroy() {
        super.Destroy();
        if (this.mWriteRP.length > 0) {
            for (const rp of this.mWriteRP) {
                this.mBrush.RemoveAutoRP(rp.Key());
            }
            this.mWriteRP.length = 0;
            this.mBrush.ClearRen();
        }
    }
}
CClass.Push(CWater3D);
CClass.Push(CWater2D);
