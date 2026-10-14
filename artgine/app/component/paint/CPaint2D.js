import { CAlert } from "../../../basic/CAlert.js";
import { CClass } from "../../../basic/CClass.js";
import { CDOM } from "../../../basic/CDOM.js";
import { CBound } from "../../../geometry/CBound.js";
import { CMat } from "../../../geometry/CMat.js";
import { CMath } from "../../../geometry/CMath.js";
import { CPoolGeo } from "../../../geometry/CPoolGeo.js";
import { CVec1 } from "../../../geometry/CVec1.js";
import { CVec2 } from "../../../geometry/CVec2.js";
import { CVec3 } from "../../../geometry/CVec3.js";
import { CVec4 } from "../../../geometry/CVec4.js";
import { CVertexFormat } from "../../../render/CShader.js";
import { CShaderAttr } from "../../../render/CShaderAttr.js";
import { CTexture } from "../../../render/CTexture.js";
import { CUtilRender } from "../../../render/CUtilRender.js";
import { CAtlas } from "../../../util/CAtlas.js";
import { CFontRef } from "../../../util/CFont.js";
import { CClipCoodi } from "../CAnimation.js";
import { CPaint } from "./CPaint.js";
import { CPaintMerge } from "./CPaintMerge.js";
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
        this.ClearBatch();
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
                this.ClearBatch();
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
export class CPaint2DMerge extends CPaintMerge {
    mMatList;
    mCodiList;
    mTexSize = null;
    mYSort = false;
    mWindInfluence = new CVec1(0.0);
    mSlotCodi = new Float32Array(0);
    mSlotCodiUse = new Uint8Array(0);
    constructor(_texture, _matList = [], _codiList = []) {
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
        this.BuildSlot();
        for (let i = 0; i < this.mMatList.length; ++i)
            this.PushSlot(this.mMatList[i], this.mCodiList[i]);
    }
    Push(_mat, _codi = null) {
        if (this.mSlotReady == false) {
            this.mMatList.push(_mat);
            this.mCodiList[this.mMatList.length - 1] = _codi;
            return this.mMatList.length - 1;
        }
        return this.PushSlot(_mat, _codi);
    }
    Modify(_slot, _mat, _codi = undefined) {
        if (_codi === undefined) {
            super.Modify(_slot, _mat);
            return;
        }
        if (this.IsUse(_slot) == false)
            return;
        this.SetSlotMat(_slot, _mat);
        this.SetSlotCodi(_slot, _codi);
        this.WriteSlot(_slot, true);
        this.Dirty(_slot);
    }
    RebuildYSort() {
        if (this.mYSort == false)
            return;
        for (let i = 0; i < this.mSlotSize; ++i) {
            if (this.mSlotUse[i] == 0)
                continue;
            this.WriteSlot(i, false);
            this.DirtyPos(i);
        }
    }
    RenderAttr(_vf) {
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
    }
    Wind(_influence) {
        this.PushTag("wind");
        this.mWindInfluence.x = _influence;
    }
    SetYSort(_enable) {
        this.mYSort = _enable;
    }
    PushSlot(_mat, _codi) {
        const slot = this.NewSlot("");
        this.SetSlotMat(slot, _mat);
        this.SetSlotCodi(slot, _codi);
        this.WriteSlot(slot, true);
        this.Dirty(slot);
        return slot;
    }
    SetSlotCodi(_slot, _codi) {
        if (_codi == null) {
            this.mSlotCodiUse[_slot] = 0;
            return;
        }
        this.mSlotCodiUse[_slot] = 1;
        this.mSlotCodi.set(_codi.mF32A, _slot * 4);
    }
    GrowSlotData(_cap) {
        const codi = new Float32Array(_cap * 4);
        codi.set(this.mSlotCodi);
        this.mSlotCodi = codi;
        const use = new Uint8Array(_cap);
        use.set(this.mSlotCodiUse);
        this.mSlotCodiUse = use;
    }
    CreateChannel() {
        const ci = this.mMeshDataNode.ci;
        ci.Create(CVertexFormat.eIdentifier.Position);
        ci.Create(CVertexFormat.eIdentifier.Position);
        ci.Create(CVertexFormat.eIdentifier.UV);
        ci.Create(CVertexFormat.eIdentifier.Normal);
    }
    SlotVertex(_key) { return 4; }
    SlotIndex(_key) { return 6; }
    WriteIndex(_key, _iStart, _vStart) {
        const ib = this.Buf(CVertexFormat.eIdentifier.Index).bufI;
        ib[_iStart + 0] = _vStart + 0;
        ib[_iStart + 1] = _vStart + 1;
        ib[_iStart + 2] = _vStart + 2;
        ib[_iStart + 3] = _vStart + 2;
        ib[_iStart + 4] = _vStart + 3;
        ib[_iStart + 5] = _vStart + 0;
    }
    TranslateSlot(_slot, _dx, _dy, _dz) {
        let dz = _dz;
        if (this.mYSort)
            dz -= _dy / (CPaint2D.YSortRange.y - CPaint2D.YSortRange.x) * CPaint2D.YSortZShift;
        const p = this.F32(CVertexFormat.eIdentifier.Position);
        const vs = this.mSlotVS[_slot];
        for (let i = vs * 3, e = (vs + 4) * 3; i < e; i += 3) {
            p[i] += _dx;
            p[i + 1] += _dy;
            p[i + 2] += dz;
            this.BoundPush(p[i], p[i + 1], p[i + 2] - 0.5);
            this.BoundPush(p[i], p[i + 1], p[i + 2] + 0.5);
        }
    }
    WriteSlot(_slot, _static) {
        const I = CVertexFormat.eIdentifier;
        const p = this.F32(I.Position), s = this.F32(I.Position, 1);
        const uv = this.F32(I.UV);
        const nor = this.F32(I.Normal);
        const m = this.mSlotMat, o = _slot * 16;
        const vs = this.mSlotVS[_slot];
        const sx = Math.sqrt(m[o] * m[o] + m[o + 1] * m[o + 1] + m[o + 2] * m[o + 2]);
        const sy = Math.sqrt(m[o + 4] * m[o + 4] + m[o + 5] * m[o + 5] + m[o + 6] * m[o + 6]);
        const sz = Math.sqrt(m[o + 8] * m[o + 8] + m[o + 9] * m[o + 9] + m[o + 10] * m[o + 10]);
        let dz = 0;
        if (this.mYSort) {
            const ySortOrigin = -0.5 * sy + 1;
            const yVal = m[o + 13] + ySortOrigin;
            const yRatio = (CPaint2D.YSortRange.y - yVal) / (CPaint2D.YSortRange.y - CPaint2D.YSortRange.x);
            dz = yRatio * CPaint2D.YSortZShift;
        }
        let cx = 1, cy = 1, cz = 0, cw = 0;
        if (this.mSlotCodiUse[_slot] == 1) {
            const c = this.mSlotCodi, co = _slot * 4;
            if (c[co] <= 1 && c[co + 1] <= 1 && c[co + 2] <= 1 && c[co + 3] <= 1) {
                cx = c[co];
                cy = c[co + 1];
                cz = c[co + 2];
                cw = c[co + 3];
            }
            else if (this.mTexSize != null) {
                cx = (c[co + 2] - c[co]) / this.mTexSize.x;
                cy = (c[co + 3] - c[co + 1]) / this.mTexSize.y;
                cz = c[co] / this.mTexSize.x;
                cw = 1 - (c[co + 1] / this.mTexSize.x) - cy;
            }
        }
        const u0 = Math.abs(cz), u1 = Math.abs(cx + cz);
        const v0 = Math.abs(cw), v1 = Math.abs(cy + cw);
        const dirX = CPaint2DMerge.sDirX, dirY = CPaint2DMerge.sDirY;
        for (let k = 0; k < 4; ++k) {
            const x = dirX[k], y = dirY[k];
            const w = m[o + 3] * x + m[o + 7] * y + m[o + 15];
            const px = (m[o] * x + m[o + 4] * y + m[o + 12]) / w;
            const py = (m[o + 1] * x + m[o + 5] * y + m[o + 13]) / w;
            const pz = (m[o + 2] * x + m[o + 6] * y + m[o + 14] + dz) / w;
            const v3 = (vs + k) * 3, v2 = (vs + k) * 2;
            p[v3] = px;
            p[v3 + 1] = py;
            p[v3 + 2] = pz;
            s[v3] = x < 0 ? -sx : sx;
            s[v3 + 1] = y < 0 ? -sy : sy;
            s[v3 + 2] = sz;
            if (_static) {
                uv[v2] = x < 0 ? -u0 : u1;
                uv[v2 + 1] = y < 0 ? -v0 : v1;
            }
            nor[v3] = m[o + 8];
            nor[v3 + 1] = m[o + 9];
            nor[v3 + 2] = m[o + 10];
            this.BoundPush(px, py, pz - 0.5);
            this.BoundPush(px, py, pz + 0.5);
        }
        const t = this.F32(I.Tangent);
        if (t != null) {
            let tx = m[o], ty = m[o + 1], tz = m[o + 2];
            const len = Math.sqrt(tx * tx + ty * ty + tz * tz);
            if (len > 0) {
                tx /= len;
                ty /= len;
                tz /= len;
            }
            for (let k = 0; k < 4; ++k) {
                const v4 = (vs + k) * 4;
                t[v4] = tx;
                t[v4 + 1] = ty;
                t[v4 + 2] = tz;
                t[v4 + 3] = 1;
            }
            this.WriteBinormal(vs, 4);
        }
    }
    static sDirX = [-0.5, 0.5, 0.5, -0.5];
    static sDirY = [-0.5, -0.5, 0.5, 0.5];
}
