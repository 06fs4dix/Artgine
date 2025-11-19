import { CAlert } from "../../../basic/CAlert.js";
import { CClass } from "../../../basic/CClass.js";
import { CBound } from "../../../geometry/CBound.js";
import { CMat } from "../../../geometry/CMat.js";
import { CMath } from "../../../geometry/CMath.js";
import { CPoolGeo } from "../../../geometry/CPoolGeo.js";
import { CVec1 } from "../../../geometry/CVec1.js";
import { CVec2 } from "../../../geometry/CVec2.js";
import { CVec3 } from "../../../geometry/CVec3.js";
import { CVec4 } from "../../../geometry/CVec4.js";
import { CRenderPass } from "../../../render/CRenderPass.js";
import { CShaderAttr } from "../../../render/CShaderAttr.js";
import { CTexture } from "../../../render/CTexture.js";
import { CUtilRender } from "../../../render/CUtilRender.js";
import { CAtlas } from "../../../util/CAtlas.js";
import { CFontRef } from "../../../util/CFont.js";
import { CRPAuto } from "../../CRPMgr.js";
import { CClipCoodi } from "../CAnimation.js";
import { CPaint } from "./CPaint.js";
var gMargin = 1.0;
;
export class CPaint2D extends CPaint {
    mSize;
    mPos;
    mPivot;
    mYSort = false;
    mYSortOrigin = 0;
    static mYSortRange = new CVec2(-10000, 10000);
    static mYSortZShift = 100;
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
        this.mTMat = new CMat();
        this.mBound.mMin.x = -CUtilRender.Mesh2DSize * 0.5;
        this.mBound.mMin.y = -CUtilRender.Mesh2DSize * 0.5;
        this.mBound.mMin.z = -0.5;
        this.mBound.mMax.x = CUtilRender.Mesh2DSize * 0.5;
        this.mBound.mMax.y = CUtilRender.Mesh2DSize * 0.5;
        this.mBound.mMax.z = 0.5;
        this.mBoundFMatR = 0;
        this.mBound.mType = CBound.eType.Box;
        this.PRSReset();
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
        this.mBoundFMatR = 0;
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
            let btn = document.createElement("button");
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
        var button = document.createElement("button");
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
    Update(_update) {
        super.Update(_update);
        if (this.mUpdateFMat == true) {
            if (this.mYSort == true) {
                const yVal = this.mFMat.mF32A[13] + this.mYSortOrigin;
                let yRatio = (CPaint2D.mYSortRange.y - yVal) / (CPaint2D.mYSortRange.y - CPaint2D.mYSortRange.x);
                this.mFMat.mF32A[14] += yRatio * CPaint2D.mYSortZShift;
            }
        }
        else
            return;
        if (this.mTag.has("tail") == false || _update.DeltaTime() > 1)
            return;
        if (this.mTag.has("billboard")) {
            let pos = CPoolGeo.ProductV3();
            let nor = CPoolGeo.ProductV3();
            let st = CPoolGeo.ProductV3();
            let ed = CPoolGeo.ProductV3();
            pos.mF32A[0] = this.GetFMat().mF32A[12];
            pos.mF32A[1] = this.GetFMat().mF32A[13];
            pos.mF32A[2] = this.GetFMat().mF32A[14];
            CMath.V3SubV3(pos, this.mBeforePos, st);
            if (pos.IsZero()) {
                CPoolGeo.RecycleV3(pos);
                CPoolGeo.RecycleV3(nor);
                CPoolGeo.RecycleV3(st);
                CPoolGeo.RecycleV3(ed);
                return;
            }
            var len = CMath.V3Len(st);
            if (len > this.mSize.y) {
                CMath.V3Nor(st, nor);
                CMath.V3AddV3(pos, CMath.V3MulFloat(nor, -this.mSize.y), this.mBeforePos);
            }
            if (len < 0.001) {
                this.mBeforePos.Import(pos);
            }
            else if (this.mStopPos.Equals(pos)) {
                CMath.V3AddV3(CMath.V3MulFloat(pos, _update.DeltaTime() * this.mRemoveSpeed), CMath.V3MulFloat(this.mBeforePos, 1 - _update.DeltaMil() * this.mRemoveSpeed), this.mBeforePos);
            }
            this.mStopPos.Import(pos);
            st.Import(pos);
            CMath.V3AddV3(this.mPos, st, st);
            ed.Import(this.mBeforePos);
            CMath.V3AddV3(this.mPos, ed, ed);
            let v = new CVec3();
            CMath.V3Cross(this.mRenPT[0].mCam.GetView(), CMath.V3Nor(CMath.V3SubV3(st, this.mBeforePos)), nor);
            CMath.V3SubV3(st, CMath.V3MulFloat(nor, (this.mSize.x / 2)), v);
            this.mTMat.SetV3(0, v);
            CMath.V3AddV3(st, CMath.V3MulFloat(nor, (this.mSize.x / 2)), v);
            this.mTMat.SetV3(1, v);
            CMath.V3SubV3(ed, CMath.V3MulFloat(nor, (this.mSize.x / 2)), v);
            this.mTMat.SetV3(2, v);
            CMath.V3AddV3(ed, CMath.V3MulFloat(nor, (this.mSize.x / 2)), v);
            this.mTMat.SetV3(3, v);
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
            CPoolGeo.RecycleV3(nor);
            CPoolGeo.RecycleV3(st);
            CPoolGeo.RecycleV3(ed);
        }
        else {
            let pos = this.GetFMat().xyz;
            let v = new CVec3();
            for (let i = 0; i < 4; ++i) {
                CMath.V3AddV3(this.mPosList[i], pos, v);
                this.mTMat.SetV3(i, v);
            }
            this.mTMat.mF32A[3] = 1;
            this.mTMat.mF32A[7] = 1;
            this.mTMat.mF32A[11] = 1;
            this.mTMat.mF32A[15] = 1;
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
                this.PRSReset();
                this.EditRefresh();
            }
            else if (tex instanceof CAtlas) {
                if (this.mTexCodi.x != 1 || this.mTexCodi.y != 1 || this.mTexCodi.z != 0 || this.mTexCodi.w != 0) {
                    let width = Math.round(tex.mWidth * this.mTexCodi.x);
                    let height = Math.round(tex.mHeight * this.mTexCodi.y);
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
            this.PRSReset();
        }
        else if (_pointer.IsRef(this.mWindInfluence)) {
            this.Wind(this.mWindInfluence.x);
        }
        else if (_child) {
            if (_pointer.IsRef(this.mPos) ||
                _pointer.IsRef(this.mSize) || _pointer.IsRef(this.mPivot)) {
                this.PRSReset();
            }
        }
    }
    PRSReset() {
        if (this.mSize == null)
            return;
        var bSca = this.GetScale();
        var lpos = this.mPos.Export();
        lpos.x += this.mBound.mMax.x * bSca.x * this.mPivot.x;
        lpos.y += this.mBound.mMax.y * bSca.y * this.mPivot.y;
        CMath.MatScale(bSca, this.mLMat);
        this.mLMat.mF32A[12] = lpos.x;
        this.mLMat.mF32A[13] = lpos.y;
        this.mLMat.mF32A[14] = lpos.z;
        this.mLMat.UnitCheck();
        this.mUpdateLMat = true;
    }
    GetHalf() {
        var pos = new CVec3((this.mSize.x * 0.5) * this.mPivot.x, (this.mSize.y * 0.5) * this.mPivot.y, 0);
        pos = CMath.V3MulMatNormal(pos, this.mOwner.GetMat());
        return pos;
    }
    GetScale() {
        return new CVec3(this.mSize.x / CUtilRender.Mesh2DSize * this.mRevers.x, this.mSize.y / CUtilRender.Mesh2DSize * this.mRevers.y, 1);
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
    GetLeftTopRightBottom(_frame) {
        const tex = _frame.Res().Find(this.mTextureKey[0]);
        if (tex == null || (tex.GetWidth() == 1 && tex.GetHeight() == 1))
            return null;
        const imgW = tex.GetWidth();
        const imgH = tex.GetHeight();
        const uv = this.mTexCodi;
        const startX = Math.round((this.mTexCodi.z - (gMargin * 0.5) / imgW) * imgW);
        const startY = Math.round((1 - this.mTexCodi.w - this.mTexCodi.y - (gMargin * 0.5) / imgH) * imgH);
        const endX = Math.round((this.mTexCodi.z + this.mTexCodi.x + gMargin / imgW) * imgW);
        const endY = Math.round((1 - this.mTexCodi.w + gMargin / imgH) * imgH);
        return new CVec4(startX, startY, endX, endY);
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
    SetTexCodi(_stX, _stY = null, _edX = null, _edY = null, _imgW = null, _imgH = null, _margin = gMargin) {
        if (this.PushTag("codi"))
            this.ClearBatch();
        if (_stX == null) {
            this.mTexCodi.x = 1 - _stY;
            this.mTexCodi.y = 1 - _stY;
            this.mTexCodi.z = _stY * 0.5;
            this.mTexCodi.w = _stY * 0.5;
        }
        else if (_stX instanceof CVec4) {
            if (_stY == null)
                _stY = 0;
            this.mTexCodi.x = _stX.x - _stY;
            this.mTexCodi.y = _stX.y - _stY;
            this.mTexCodi.z = _stX.z + _stY * 0.5;
            this.mTexCodi.w = _stX.w + _stY * 0.5;
        }
        else {
            this.mTexCodi.x = (_edX - _stX) / _imgW - _margin / _imgW;
            this.mTexCodi.y = (_edY - _stY) / _imgH - _margin / _imgH;
            this.mTexCodi.z = (_stX) / _imgW + (_margin * 0.5) / _imgW;
            this.mTexCodi.w = 1 - (_stY / _imgH) - this.mTexCodi.y - (_margin * 0.5) / _imgH;
        }
    }
    SetPivot(_pivot) {
        this.mPivot = _pivot;
        this.PRSReset();
    }
    SetSize(_size) {
        this.mBoundFMatR = 0;
        if (_size != null && _size.IsZero())
            this.mSize = null;
        else if (this.mSize == null) {
            this.mSize = new CVec2();
            this.mSize.Import(_size);
        }
        else
            this.mSize.Import(_size);
        this.PRSReset();
    }
    SetPos(_pos) {
        this.mPos = _pos;
        this.PRSReset();
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
        this.PRSReset();
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
            this.mBoundFMatR = 0;
        }
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
            this.mParent = document.body;
        else {
            this.mParent = _parent;
            this.mParent.style.position = "relative";
            this.mParent.style.overflow = "hidden";
        }
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
    ClearCRPAuto() {
        if (this.GetOwner() == null)
            return;
        this.mElement.hidden = !this.GetOwner().IsEnable();
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
        if (this.mRenPT[0].mCam.mUpdateMat != 0 || this.mOwner.mUpdateMat != 0 || this.mOwner.GetFrame().Win().IsResize() || this.mUpdateFMat == true) { }
        else
            return;
        this.mUpdateFMat = false;
        if (this.mAttach == false) {
            this.mParent.appendChild(this.mElement);
            if (this.mParent == document.body)
                this.mElement.style.zIndex = 1010 + "";
            this.mElement.style.position = "absolute";
            if (this.mElement.style.pointerEvents == '')
                this.mElement.style.pointerEvents = "none";
            this.mAttach = true;
        }
        let zoom = 1 / this.mRenPT[0].mCam.mZoom;
        let pos = this.GetOwner().GetMat().xyz;
        this.mBound.SetType(CBound.eType.Box);
        if (this.mElement.offsetWidth != 0) {
            this.mOrgSize.x = this.mElement.clientWidth;
            this.mOrgSize.y = this.mElement.clientHeight;
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
            this.mElement.style.transform = "scale(" + zoom + "," + zoom + ")";
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
