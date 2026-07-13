import { CAlert } from "../../../basic/CAlert.js";
import { CClass } from "../../../basic/CClass.js";
import { CDOM } from "../../../basic/CDOM.js";
import { CHash } from "../../../basic/CHash.js";
import { CBound } from "../../../geometry/CBound.js";
import { CMat } from "../../../geometry/CMat.js";
import { CMath } from "../../../geometry/CMath.js";
import { CPoolGeo } from "../../../geometry/CPoolGeo.js";
import { CVec1 } from "../../../geometry/CVec1.js";
import { CVec2 } from "../../../geometry/CVec2.js";
import { CVec3 } from "../../../geometry/CVec3.js";
import { CVec4 } from "../../../geometry/CVec4.js";
import { CMeshCreateInfo } from "../../../render/CMeshCreateInfo.js";
import { CMeshDataNode } from "../../../render/CMeshDataNode.js";
import { CRenderPass } from "../../../render/CRenderPass.js";
import { CVertexFormat } from "../../../render/CShader.js";
import { CShaderAttr } from "../../../render/CShaderAttr.js";
import { CTexture } from "../../../render/CTexture.js";
import { CUtilRender } from "../../../render/CUtilRender.js";
import { CAtlas } from "../../../util/CAtlas.js";
import { CFontRef } from "../../../util/CFont.js";
import { CRPAuto } from "../../canvas/CRPMgr.js";
import { CClipCoodi } from "../CAnimation.js";
import { CPaint } from "./CPaint.js";
export class CPaint2D extends CPaint {
    mSize;
    mPos;
    mSca;
    mPivot;
    mYSort = false;
    mYSortOrigin = 0;
    static YSortRange = new CVec2(-10000, 10000);
    static YSortZShift = 100;
    mBeforePos = new CVec3;
    mStopPos = new CVec3();
    mRemoveSpeed = 1;
    mRevers = new CVec2(1, 1);
    mPosList = null;
    mTMat;
    mLastHide = true;
    mWindInfluence = new CVec1(0.0);
    IsShould(_member, _type) {
        return super.IsShould(_member, _type);
    }
    constructor(_texture = null, _size = null) {
        super();
        if (_size != null && (_size instanceof CVec2) == false)
            CAlert.E("CPaint2D 인자 잘못 넣음");
        else {
            this.mSize = _size;
            if (_texture != null) {
                if (_texture instanceof CFontRef) {
                    this.SetTexture(_texture.mKey);
                }
                else
                    this.SetTexture(_texture);
            }
        }
        this.mPivot = new CVec3();
        this.mPos = new CVec3();
        this.mSca = new CVec2(1, 1);
        this.mTMat = new CMat();
        this.mBound.mMin.x = -CUtilRender.Mesh2DSize * 0.5;
        this.mBound.mMin.y = -CUtilRender.Mesh2DSize * 0.5;
        this.mBound.mMin.z = -0.5;
        this.mBound.mMax.x = CUtilRender.Mesh2DSize * 0.5;
        this.mBound.mMax.y = CUtilRender.Mesh2DSize * 0.5;
        this.mBound.mMax.z = 0.5;
        this.mBound.mType = CBound.eType.Box;
        this.MatUpdate();
        this.mShaderAttrMap.set("billboard", new CShaderAttr("billboard", new CVec1(0)));
        this.PushTag("codi");
    }
    Reset() {
        super.Reset();
        this.mPivot.Zero();
        this.mPos.Zero();
        this.mShaderAttrMap.set("billboard", new CShaderAttr("billboard", new CVec1(0)));
        this.mBound.mMin.x = -CUtilRender.Mesh2DSize * 0.5;
        this.mBound.mMin.y = -CUtilRender.Mesh2DSize * 0.5;
        this.mBound.mMin.z = -0.5;
        this.mBound.mMax.x = CUtilRender.Mesh2DSize * 0.5;
        this.mBound.mMax.y = CUtilRender.Mesh2DSize * 0.5;
        this.mBound.mMax.z = 0.5;
        this.mBound.mType = CBound.eType.Box;
    }
    PushNormalMap(_tex) {
        if (this.mTextureKey.length == 1)
            this.mTextureKey.push(_tex);
        else if (this.mTextureKey.length == 2) {
            this.mTextureKey[1] = _tex;
        }
        this.ClearBatch();
        this.PushTag("normalMap");
    }
    EditDrop(_object) {
        if (_object instanceof CTexture) {
            this.SetTexture(_object.Key());
        }
    }
    EditForm(_pointer, _body, _input) {
        super.EditForm(_pointer, _body, _input);
        if (_pointer.member == "mSize" && this.mSize == null) {
            let btn = CDOM.TagToDom("button");
            btn.innerText = "생성";
            btn.onclick = () => {
                this.mSize = new CVec2();
                this.EditRefresh();
            };
            _body.append(btn);
        }
    }
    EditHTMLInit(_div, _pointer) {
        super.EditHTMLInit(_div, _pointer);
        var button = CDOM.TagToDom("button");
        button.className = "btn btn-primary btn-sm";
        button.innerText = "TexcodiModif";
        button.onclick = () => {
            if (this.mTextureKey.length > 0) {
                let ani = CClass.New("CAnimation");
                if (this.mTexCodi.Equals(new CVec4(1, 1, 0, 0)) == false) {
                    const absCoords = this.GetLeftTopRightBottom(this.mOwner.GetFrame());
                    if (absCoords == null)
                        return;
                    ani.Push(new CClipCoodi(0, 0, absCoords.x, absCoords.y, absCoords.z, absCoords.w));
                }
                window["AniTool"](ani, this.mTextureKey[0]);
                window["AniToolTexcodiEvent"](this, () => {
                    this.EditRefresh();
                    this.ClearBatch();
                });
            }
        };
        _div.append(button);
    }
    SetBillBoard(_enabel) {
        this.mShaderAttrMap.get("billboard").mData.mF32A[0] = _enabel ? 1.0 : 0.0;
        this.PushTag("billboard");
        this.ClearCRPAuto();
    }
    SetYSort(_enable) {
        this.mYSort = _enable;
        if (this.mYSort && this.GetSize() != null) {
            this.mYSortOrigin = -0.5 * this.GetSize().y + 1;
        }
    }
    SetYSortOrigin(_origin) {
        this.mYSortOrigin = _origin;
    }
    InitChk() {
        super.InitChk();
        this.SizeCac();
        if (this.mSize == null)
            this.mInit = false;
    }
    FMatUpdate() {
        super.FMatUpdate();
        if (this.mYSort == true) {
            const yVal = this.mFMat.mF32A[13] + this.mYSortOrigin;
            let yRatio = (CPaint2D.YSortRange.y - yVal) / (CPaint2D.YSortRange.y - CPaint2D.YSortRange.x);
            this.mFMat.mF32A[14] += yRatio * CPaint2D.YSortZShift;
            this.mBW.mPos.mF32A[2] += yRatio * CPaint2D.YSortZShift;
        }
    }
    Update(_update) {
        super.Update(_update);
        if (this.mUpdateFMat == false) {
            return;
        }
        if (this.mTag.has("tail") == false || _update.DeltaTime() > 1)
            return;
        if (this.mTag.has("billboard") && this.mPosList == null) {
            if (this.mRenPT.length == 0)
                return;
            let pos = CPoolGeo.ProductV3();
            let vec = CPoolGeo.ProductV3();
            pos.mF32A[0] = this.GetFMat().mF32A[12];
            pos.mF32A[1] = this.GetFMat().mF32A[13];
            pos.mF32A[2] = this.GetFMat().mF32A[14];
            if (pos.IsZero()) {
                CPoolGeo.RecycleV3(pos);
                CPoolGeo.RecycleV3(vec);
                return;
            }
            if (this.mBeforePos.IsZero())
                this.mBeforePos.Import(pos);
            CMath.V3SubV3(pos, this.mBeforePos, vec);
            var len = CMath.V3Len(vec);
            if (len > this.mSize.y) {
                CMath.V3AddV3(pos, CMath.V3MulFloat(vec, -this.mSize.y / len, vec), this.mBeforePos);
            }
            else if (len < 0.001) {
                this.mBeforePos.Import(pos);
            }
            else if (this.mStopPos.Equals(pos)) {
                CMath.V3AddV3(CMath.V3MulFloat(pos, _update.DeltaTime() * this.mRemoveSpeed), CMath.V3MulFloat(this.mBeforePos, 1 - _update.DeltaTime() * this.mRemoveSpeed), this.mBeforePos);
            }
            this.mStopPos.Import(pos);
            this.mTMat.SetV3(0, pos);
            this.mTMat.SetV3(1, this.mBeforePos);
            this.mTMat.mF32A[8] = this.mSize.x;
            this.mTMat.mF32A[9] = this.mSize.y;
            this.mTMat.SetV3(3, this.mPos);
            if (this.mLastHide) {
                this.mTMat.mF32A[3] = 1;
                this.mTMat.mF32A[7] = 1;
                this.mTMat.mF32A[11] = 0;
                this.mTMat.mF32A[15] = 0;
            }
            else {
                this.mTMat.mF32A[3] = 1;
                this.mTMat.mF32A[7] = 1;
                this.mTMat.mF32A[11] = 1;
                this.mTMat.mF32A[15] = 1;
            }
            CPoolGeo.RecycleV3(pos);
            CPoolGeo.RecycleV3(vec);
        }
        else {
            if (this.mTag.has("billboard") && this.mShaderAttrMap.get("billboard").mData.mF32A[0] != 2.0) {
                this.mShaderAttrMap.get("billboard").mData.mF32A[0] = 2.0;
                this.ClearCRPAuto();
            }
            let pos = CPoolGeo.ProductV3();
            pos.mF32A[0] = this.GetFMat().mF32A[12];
            pos.mF32A[1] = this.GetFMat().mF32A[13];
            pos.mF32A[2] = this.GetFMat().mF32A[14];
            let v = CPoolGeo.ProductV3();
            for (let i = 0; i < 4; ++i) {
                CMath.V3AddV3(this.mPosList[i], pos, v);
                this.mTMat.SetV3(i, v);
            }
            this.mTMat.mF32A[3] = 1;
            this.mTMat.mF32A[7] = 1;
            this.mTMat.mF32A[11] = 1;
            this.mTMat.mF32A[15] = 1;
            CPoolGeo.RecycleV3(pos);
            CPoolGeo.RecycleV3(v);
        }
    }
    Prefab(_owner) {
        super.Prefab(_owner);
        this.SizeCac();
    }
    SizeCac() {
        if ((this.mSize == null || this.mSize.IsZero()) && this.mOwner != null && this.mTextureKey.length > 0) {
            var tex = this.mOwner.GetFrame().Res().Find(this.mTextureKey[0]);
            if (tex instanceof CTexture) {
                if (tex == null || (tex.GetWidth() == 1 && tex.GetHeight() == 1))
                    return;
                this.SetSize(new CVec2(tex.GetWidth(), tex.GetHeight()));
                this.MatUpdate();
                this.EditRefresh();
            }
            else if (tex instanceof CAtlas) {
                if (this.mTexCodi.x != 1 || this.mTexCodi.y != 1 || this.mTexCodi.z != 0 || this.mTexCodi.w != 0) {
                    let width = Math.round(tex.GetWidth() * this.mTexCodi.x);
                    let height = Math.round(tex.GetHeight() * this.mTexCodi.y);
                    this.SetSize(new CVec2(width, height));
                    this.EditRefresh();
                }
            }
        }
    }
    EmptyRPChk() {
        if (this.mRenderPass.length == 0) {
            var rp = new CRPAuto(this.mOwner.GetFrame().Pal().Sl2D().mKey);
            rp.mCullFace = CRenderPass.eCull.None;
            this.mRenderPass = [rp];
        }
        else if (this.mRenderPass[0].mShader == "") {
            this.mRenderPass[0].mShader = this.mOwner.GetFrame().Pal().Sl2D().mKey;
        }
        if (this.mTextureKey.length == 0) {
            this.SetTexture(this.GetOwner().GetFrame().Pal().GetBlackTex());
        }
    }
    EditChange(_pointer, _child) {
        super.EditChange(_pointer, _child);
        if (_pointer.member == "mYSort" || _pointer.member == "mYSortOrigin") {
            if (_pointer.member == "mYSort") {
                this.SetYSort(this.mYSort);
            }
            this.MatUpdate();
        }
        else if (_pointer.IsRef(this.mWindInfluence)) {
            this.Wind(this.mWindInfluence.x);
        }
        else if (_child) {
            if (_pointer.IsRef(this.mPos) ||
                _pointer.IsRef(this.mSize) || _pointer.IsRef(this.mPivot)) {
                this.MatUpdate();
            }
        }
    }
    MatUpdate() {
        if (this.mSize == null)
            return;
        this.mBound.mMin.x = -CUtilRender.Mesh2DSize * 0.5;
        this.mBound.mMin.y = -CUtilRender.Mesh2DSize * 0.5;
        this.mBound.mMin.z = -0.5;
        this.mBound.mMax.x = CUtilRender.Mesh2DSize * 0.5;
        this.mBound.mMax.y = CUtilRender.Mesh2DSize * 0.5;
        this.mBound.mMax.z = 0.5;
        let bSca = this.GetScale();
        let lpos = this.mPos.Export();
        lpos.x += this.mBound.mMax.x * bSca.x * this.mPivot.x;
        lpos.y += this.mBound.mMax.y * bSca.y * this.mPivot.y;
        CMath.MatScale(bSca, this.mLMat);
        this.mLMat.mF32A[12] = lpos.x;
        this.mLMat.mF32A[13] = lpos.y;
        this.mLMat.mF32A[14] = lpos.z;
        this.mLMat.UnitCheck();
        this.mBound.MatCoordi(this.mLMat);
        this.mBound.mMax.z = this.mBound.GetOutRadius();
        this.mBound.mMin.z = -this.mBound.mMax.z;
        this.mBW.mRadian = 0;
        this.mUpdateLMat = true;
    }
    GetHalf() {
        var pos = new CVec3((this.mSize.x * 0.5) * this.mPivot.x, (this.mSize.y * 0.5) * this.mPivot.y, 0);
        pos = CMath.V3MulMatNormal(pos, this.mOwner.GetMat());
        return pos;
    }
    GetScale() {
        return new CVec3(this.mSize.x / CUtilRender.Mesh2DSize * this.mRevers.x * this.mSca.x, this.mSize.y / CUtilRender.Mesh2DSize * this.mRevers.y * this.mSca.y, 1);
    }
    GetSize() {
        return this.mSize;
    }
    ;
    GetPos() {
        return this.mPos;
    }
    GetPivot() { return this.mPivot; }
    GetTexCodi() {
        return this.mTexCodi;
    }
    GetMesh() {
        return null;
    }
    Start() {
        super.Start();
        this.MatUpdate();
        if (this.mPosList != null) {
            this.mBound.Reset();
            this.mBound.InitBound(this.mPosList);
            this.mBound.SetType(CBound.eType.Box);
        }
        else if (this.mTag.has("tail")) {
            this.mBound.Reset();
            this.mBound.InitBound(this.mSize.y);
            this.mBound.SetType(CBound.eType.Box);
        }
    }
    Render(_vf) {
        var barr = this.RenderBatch(_vf, 1);
        if (barr == null)
            return;
        if (this.mSize == null || this.mTextureKey.length == 0) {
            this.mBatchMap.clear();
            return;
        }
        this.mOwner.GetFrame().BMgr().BatchOn();
        this.Common(_vf);
        if (this.mTag.has("tail")) {
            let wsa = new CShaderAttr("worldMat", this.mTMat);
            this.mOwner.GetFrame().BMgr().SetBatchSA(wsa);
        }
        else {
            let wsa = new CShaderAttr("worldMat", this.GetFMat());
            switch (this.mWorldMatType) {
                case CMat.eType.Short2D:
                    wsa.mKey = "worldMatShort";
                    break;
            }
            wsa.mType = this.mWorldMatType;
            this.mOwner.GetFrame().BMgr().SetBatchSA(new CShaderAttr("worldMatType", new CVec1(this.mWorldMatType)));
            this.mOwner.GetFrame().BMgr().SetBatchSA(wsa);
        }
        if (_vf.mUniform.get("windInfluence") != null)
            this.mOwner.GetFrame().BMgr().SetBatchSA(new CShaderAttr("windInfluence", this.mWindInfluence));
        this.mOwner.GetFrame().BMgr().SetBatchTex(this.mTextureKey);
        var dm = this.GetDrawMesh("Artgine/DM/2D", _vf, this.mOwner.GetFrame().Pal().MCI2D());
        this.mOwner.GetFrame().BMgr().SetBatchMesh(dm);
        barr[0] = this.mOwner.GetFrame().BMgr().BatchOff();
    }
    SetPivot(_pivot) {
        this.mPivot = _pivot;
        this.MatUpdate();
    }
    SetSize(_size) {
        if (_size != null && _size.IsZero())
            this.mSize = null;
        else if (this.mSize == null) {
            this.mSize = new CVec2();
            this.mSize.Import(_size);
        }
        else
            this.mSize.Import(_size);
        this.MatUpdate();
    }
    SetPos(_pos) {
        this.mPos = _pos;
        this.MatUpdate();
    }
    SetSca(_sca) {
        if (this.mSca.Equals(_sca))
            return;
        this.mSca = _sca;
        this.MatUpdate();
    }
    SetReverse(_x, _y) {
        if (_x)
            this.mRevers.x = -1;
        else
            this.mRevers.x = 1;
        if (_y)
            this.mRevers.y = -1;
        else
            this.mRevers.y = 1;
        this.MatUpdate();
    }
    Tail() {
        if (this.mTag.has("tail") == false) {
            this.PushTag("tail");
            this.ClearBatch();
            this.mUpdateLMat = true;
        }
    }
    Wind(_influence) {
        this.Tail();
        this.PushTag("wind");
        this.mLastHide = false;
        this.mWindInfluence.x = _influence;
        this.mPosList = [
            new CVec3(-this.mSize.x * 0.5, this.mSize.y * 0.5, 0),
            new CVec3(this.mSize.x * 0.5, this.mSize.y * 0.5, 0),
            new CVec3(-this.mSize.x * 0.5, -this.mSize.y * 0.5, 0),
            new CVec3(this.mSize.x * 0.5, -this.mSize.y * 0.5, 0)
        ];
    }
    SetPosList(_array) {
        if (_array.length >= 4) {
            if (this.mTMat == null)
                this.mTMat = new CMat();
            this.Tail();
            this.mPosList = _array;
            this.mBound.Reset();
            this.mBound.InitBound(this.mPosList);
            this.mBound.SetType(CBound.eType.Box);
            this.mBW.mRadian = 0;
            this.mLMat.Unit();
        }
    }
    ResetDecal(_slot, _pos = null, _size = null, _dir = new CVec3(0, 0, -1), _imageRot = 0) {
        super.ResetDecal(_slot, _pos, _size, _dir, _imageRot);
    }
}
export class CPaintHTML extends CPaint2D {
    mElement = null;
    mOrgSize = new CVec2();
    mParent = null;
    mAttach = false;
    mZoomScale = false;
    constructor(_html, _size = null, _parent = null) {
        super(null, _size);
        this.mElement = _html;
        if (_parent == null)
            this.mParent = CDOM.PaintDiv();
        else {
            this.mParent = _parent;
            this.mParent.style.position = "relative";
            this.mParent.style.overflow = "hidden";
        }
    }
    StartChk() {
        super.StartChk();
        this.mStartChk = false;
        return true;
    }
    SetEnable(_val) {
        super.SetEnable(_val);
        this.mElement.hidden = !_val;
    }
    SetPos(_pos) {
        this.mPos = _pos.Export();
        this.mUpdateFMat = true;
    }
    UpdateRenPt() {
        for (let i = 0; i < this.mRenPT.length; ++i) {
            let ren = this.mRenPT[i];
            ren.mShow = 2;
            ren.mDistance = 0x7FFFFE00;
        }
    }
    SetSize(_size) {
        this.mSize = _size;
        this.mUpdateFMat = true;
        this.mAttach = false;
    }
    GetElement() {
        return this.mElement;
    }
    EmptyRPChk() {
        if (this.mRenderPass.length == 0) {
            var rp = new CRPAuto(this.mOwner.GetFrame().Pal().Sl2D().mKey);
            rp.mCullFace = CRenderPass.eCull.None;
            this.mRenderPass = [rp];
        }
        else if (this.mRenderPass[0].mShader == "") {
            this.mRenderPass[0].mShader = this.mOwner.GetFrame().Pal().Sl2D().mKey;
        }
    }
    Update(_delay) {
        if (this.mRenPT.length == 0 || this.mElement == null)
            return;
        if (this.mRenPT[0].mCam.mUpdateMat != 0 || this.mOwner.mUpdateMat != 0 || this.mOwner.GetFrame().Win().IsResize() || this.mUpdateFMat == true || this.mElement.clientWidth != this.mOrgSize.x) { }
        else
            return;
        this.mUpdateFMat = false;
        if (this.mAttach == false) {
            this.mParent.appendChild(this.mElement);
            this.mElement.style.position = "absolute";
            this.mAttach = true;
        }
        let zoom = 1 / this.mRenPT[0].mCam.mZoom;
        let pos = this.GetOwner().GetMat().xyz;
        if (this.mElement.offsetWidth != 0) {
            if (this.mOrgSize.x != this.mElement.clientWidth || this.mOrgSize.y != this.mElement.clientHeight) {
                this.mOrgSize.x = this.mElement.clientWidth;
                this.mOrgSize.y = this.mElement.clientHeight;
                if (this.mSize == null) {
                    this.mBound.mMin.x = -this.mOrgSize.x * 0.5;
                    this.mBound.mMin.y = -this.mOrgSize.y * 0.5;
                    this.mBound.mMax.x = this.mOrgSize.x * 0.5;
                    this.mBound.mMax.y = this.mOrgSize.y * 0.5;
                    if (this.mOwner && this.mOwner.mUpdateAnchor !== undefined) {
                        this.mOwner.mUpdateAnchor = true;
                    }
                }
            }
        }
        let pivotX = 0;
        let pivotY = 0;
        if (this.mSize != null) {
            pos.x += this.mPivot.x * this.mSize.x * 0.5;
            pos.y += this.mPivot.y * this.mSize.y * 0.5;
            if (this.mSize.x != 0)
                this.mElement.style.width = this.mSize.x + "px";
            if (this.mSize.y != 0)
                this.mElement.style.height = this.mSize.y + "px";
            this.mElement.style.transform = "scale(" + (zoom * this.GetOwner().GetMat().mF32A[0]) + "," + (zoom * this.GetOwner().GetMat().mF32A[5]) + ")";
            pivotX = this.mOrgSize.x * 0.5;
            pivotY = this.mOrgSize.y * 0.5;
        }
        else {
            pivotX = this.mOrgSize.x * (this.mPivot.x * 0.5 + 0.5);
            pivotY = this.mOrgSize.y * (this.mPivot.y * 0.5 + 0.5);
        }
        pos = CMath.V3MulMatCoordi(pos, this.mRenPT[0].mCam.GetViewMat());
        pos = CMath.V3MulMatCoordi(pos, this.mRenPT[0].mCam.GetProjMat());
        var x = (pos.x + 1) / 2.0;
        var y = (-pos.y + 1) / 2.0;
        var left = this.GetOwner().GetFrame().PF().mLeft;
        var top = this.GetOwner().GetFrame().PF().mTop;
        left += x * this.mOwner.GetFrame().PF().mWidth - pivotX + this.mPos.x;
        top += y * this.mOwner.GetFrame().PF().mHeight - pivotY - this.mPos.y;
        left = Math.trunc(left);
        top = Math.trunc(top);
        this.mElement.style.left = left + "px";
        this.mElement.style.top = top + "px";
    }
    Destroy() {
        super.Destroy();
        if (this.mElement != null)
            this.mElement.remove();
    }
}
export class CPaint2DMerge extends CPaint {
    mMatList;
    mCodiList;
    mTexSize = null;
    mMeshDataNode;
    mHash;
    mYSort = false;
    mWindInfluence = new CVec1(0.0);
    constructor(_texture, _matList, _codiList = []) {
        super();
        this.mMatList = _matList;
        this.mCodiList = _codiList;
        if (_texture != null) {
            if (_texture instanceof CFontRef)
                this.SetTexture(_texture.mKey);
            else
                this.SetTexture(_texture);
        }
        this.PushTag("merge");
    }
    InitChk() {
        super.InitChk();
        if (this.mTexSize == null) {
            if (this.mOwner != null && this.mTextureKey.length > 0) {
                var tex = this.mOwner.GetFrame().Res().Find(this.mTextureKey[0]);
                if (tex == null) {
                    this.mInit = false;
                    return;
                }
                else if (tex instanceof CTexture) {
                    if (tex == null || (tex.GetWidth() == 1 && tex.GetHeight() == 1))
                        return;
                    this.mTexSize = new CVec2(tex.GetWidth(), tex.GetHeight());
                }
                else if (tex instanceof CAtlas) {
                    this.mTexSize = new CVec2(tex.GetWidth(), tex.GetHeight());
                }
                else {
                    CAlert.E("나올수 없다!");
                }
            }
        }
    }
    Start() {
        this.mMeshDataNode = new CMeshDataNode();
        this.mMeshDataNode.ci = new CMeshCreateInfo();
        this.mBound.Reset();
        this.mBound.SetType(CBound.eType.Box);
        this.mHash = "";
        this.Merge();
    }
    Render(_vf) {
        var barr = this.RenderBatch(_vf, 1);
        if (barr == null)
            return;
        this.mOwner.GetFrame().BMgr().BatchOn();
        this.Common(_vf);
        let wsa = new CShaderAttr("worldMat", this.GetFMat());
        switch (this.mWorldMatType) {
            case CMat.eType.Short2D:
                wsa.mKey = "worldMatShort";
                break;
        }
        wsa.mType = this.mWorldMatType;
        this.mOwner.GetFrame().BMgr().SetBatchSA(new CShaderAttr("worldMatType", new CVec1(this.mWorldMatType)));
        this.mOwner.GetFrame().BMgr().SetBatchSA(wsa);
        if (_vf.mUniform.get("windInfluence") != null)
            this.mOwner.GetFrame().BMgr().SetBatchSA(new CShaderAttr("windInfluence", this.mWindInfluence));
        this.mOwner.GetFrame().BMgr().SetBatchTex(this.mTextureKey);
        var dm = this.GetDrawMesh("Artgine/DM/2DM" + this.mHash, _vf, this.mMeshDataNode.ci);
        this.mOwner.GetFrame().BMgr().SetBatchMesh(dm);
        barr[0] = this.mOwner.GetFrame().BMgr().BatchOff();
    }
    Wind(_influence) {
        this.PushTag("wind");
        this.mWindInfluence.x = _influence;
    }
    SetYSort(_enable) {
        this.mYSort = _enable;
    }
    Merge() {
        let GetTexCodiedUV = (_uv, _texCodi) => {
            let result = new CVec2(0.0, 0.0);
            result.x = _uv.x * _texCodi.x + _texCodi.z;
            result.y = _uv.y * _texCodi.y + _texCodi.w;
            result.x = Math.abs(result.x);
            result.y = Math.abs(result.y);
            return result;
        };
        let posb = this.mMeshDataNode.ci.GetVFType(CVertexFormat.eIdentifier.Position);
        let uvb = this.mMeshDataNode.ci.GetVFType(CVertexFormat.eIdentifier.UV);
        let norb = this.mMeshDataNode.ci.GetVFType(CVertexFormat.eIdentifier.Normal);
        let inb = this.mMeshDataNode.ci.GetVFType(CVertexFormat.eIdentifier.Index);
        if (posb.length == 0) {
            this.mMeshDataNode.ci.Create(CVertexFormat.eIdentifier.Position);
            this.mMeshDataNode.ci.Create(CVertexFormat.eIdentifier.Position);
            posb = this.mMeshDataNode.ci.GetVFType(CVertexFormat.eIdentifier.Position);
        }
        if (uvb.length == 0) {
            this.mMeshDataNode.ci.Create(CVertexFormat.eIdentifier.UV);
            uvb = this.mMeshDataNode.ci.GetVFType(CVertexFormat.eIdentifier.UV);
        }
        if (norb.length == 0) {
            this.mMeshDataNode.ci.Create(CVertexFormat.eIdentifier.Normal);
            norb = this.mMeshDataNode.ci.GetVFType(CVertexFormat.eIdentifier.Normal);
        }
        if (inb.length == 0) {
            this.mMeshDataNode.ci.Create(CVertexFormat.eIdentifier.Index);
            inb = this.mMeshDataNode.ci.GetVFType(CVertexFormat.eIdentifier.Index);
        }
        const rtDir = new CVec3(0.5, 0.5, 0);
        const lbDir = new CVec3(-0.5, -0.5, 0);
        const ltDir = new CVec3(-0.5, 0.5, 0);
        const rbDir = new CVec3(0.5, -0.5, 0);
        const uv0 = new CVec2(0, 0);
        const uv1 = new CVec2(1, 0);
        const uv2 = new CVec2(1, 1);
        const uv3 = new CVec2(0, 1);
        const nor = new CVec3(0, 0, 1);
        const scaB = new CVec3();
        const scaT = new CVec3();
        for (let i = posb[0].bufF.Size(3); i < this.mMatList.length; i++) {
            const pMat = this.mMatList[i];
            scaB.x = CMath.V3Len(pMat.GetV3(0));
            scaB.y = CMath.V3Len(pMat.GetV3(1));
            scaB.z = CMath.V3Len(pMat.GetV3(2));
            scaT.x = -scaB.x;
            scaT.y = -scaB.y;
            scaT.z = -scaB.z;
            if (this.mYSort) {
                const ySortOrigin = -0.5 * scaB.y + 1;
                const yVal = pMat.mF32A[13] + ySortOrigin;
                const yRatio = (CPaint2D.YSortRange.y - yVal) / (CPaint2D.YSortRange.y - CPaint2D.YSortRange.x);
                pMat.mF32A[14] += yRatio * CPaint2D.YSortZShift;
            }
            this.mHash += pMat.ToStr();
            const lb = CMath.V3MulMatCoordi(lbDir, pMat);
            const rb = CMath.V3MulMatCoordi(rbDir, pMat);
            const rt = CMath.V3MulMatCoordi(rtDir, pMat);
            const lt = CMath.V3MulMatCoordi(ltDir, pMat);
            posb[0].bufF.Push(lb);
            posb[0].bufF.Push(rb);
            posb[0].bufF.Push(rt);
            posb[0].bufF.Push(lt);
            posb[1].bufF.Push(scaB);
            posb[1].bufF.Push(scaB);
            posb[1].bufF.Push(scaT);
            posb[1].bufF.Push(scaT);
            this.mBound.InitBound(lb);
            this.mBound.InitBound(rb);
            this.mBound.InitBound(rt);
            this.mBound.InitBound(lt);
            let codi = new CVec4(1, 1, 0, 0);
            ;
            ;
            if (this.mCodiList[i] != null) {
                const v = this.mCodiList[i];
                if (v.x <= 1 && v.y <= 1 && v.z <= 1 && v.w <= 1) {
                    codi.Import(v);
                }
                else {
                    codi.x = (v.z - v.x) / this.mTexSize.x;
                    codi.y = (v.w - v.y) / this.mTexSize.y;
                    codi.z = v.x / this.mTexSize.x;
                    codi.w = 1 - (v.y / this.mTexSize.x) - codi.y;
                }
            }
            let uvLB = GetTexCodiedUV(uv0, codi);
            let uvRB = GetTexCodiedUV(uv1, codi);
            let uvRT = GetTexCodiedUV(uv2, codi);
            let uvLT = GetTexCodiedUV(uv3, codi);
            uvLB.x = -uvLB.x;
            uvLB.y = -uvLB.y;
            uvRB.x = uvRB.x;
            uvRB.y = -uvRB.y;
            uvRT.x = uvRT.x;
            uvRT.y = uvRT.y;
            uvLT.x = -uvLT.x;
            uvLT.y = uvLT.y;
            uvb[0].bufF.Push(uvLB);
            uvb[0].bufF.Push(uvRB);
            uvb[0].bufF.Push(uvRT);
            uvb[0].bufF.Push(uvLT);
            const rotatedNor = CMath.V3MulMatNormal(nor, pMat);
            norb[0].bufF.Push(rotatedNor);
            norb[0].bufF.Push(rotatedNor);
            norb[0].bufF.Push(rotatedNor);
            norb[0].bufF.Push(rotatedNor);
            inb[0].bufI.push(this.mMeshDataNode.ci.vertexCount + 0);
            inb[0].bufI.push(this.mMeshDataNode.ci.vertexCount + 1);
            inb[0].bufI.push(this.mMeshDataNode.ci.vertexCount + 2);
            inb[0].bufI.push(this.mMeshDataNode.ci.vertexCount + 2);
            inb[0].bufI.push(this.mMeshDataNode.ci.vertexCount + 3);
            inb[0].bufI.push(this.mMeshDataNode.ci.vertexCount + 0);
            this.mMeshDataNode.ci.vertexCount += 4;
            this.mMeshDataNode.ci.indexCount += 6;
        }
        this.mBound.mMin.z -= 0.5;
        this.mBound.mMax.z += 0.5;
        this.mHash = CHash.HashCode(this.mHash) + "";
    }
    EmptyRPChk() {
        if (this.mRenderPass.length == 0) {
            var rp = new CRPAuto(this.mOwner.GetFrame().Pal().Sl2D().mKey);
            rp.mCullFace = CRenderPass.eCull.None;
            this.mRenderPass = [rp];
        }
        else if (this.mRenderPass[0].mShader == "") {
            this.mRenderPass[0].mShader = this.mOwner.GetFrame().Pal().Sl2D().mKey;
        }
        if (this.mTextureKey.length == 0) {
            this.SetTexture(this.GetOwner().GetFrame().Pal().GetBlackTex());
        }
    }
}
