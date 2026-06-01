import { CArray } from "../../basic/CArray.js";
import { CDOM } from "../../basic/CDOM.js";
import { CEvent } from "../../basic/CEvent.js";
import { CBound } from "../../geometry/CBound.js";
import { CMath } from "../../geometry/CMath.js";
import { CVec2 } from "../../geometry/CVec2.js";
import { CVec3 } from "../../geometry/CVec3.js";
import { CVec4 } from "../../geometry/CVec4.js";
import { CAlpha } from "../../render/CAlpha.js";
import { CColor } from "../../render/CColor.js";
import { CRenderPass } from "../../render/CRenderPass.js";
import { CFont, CFontOption } from "../../util/CFont.js";
import { CFrame } from "../../util/CFrame.js";
import { CCollider } from "../component/CCollider.js";
import { CPaint2D, CPaintHTML } from "../component/paint/CPaint2D.js";
import { CSubject } from "./CSubject.js";
var gToolMode = false;
var gUIPDepth = new Array();
var gMainFrame = null;
var gPickList = new CArray();
var gUIRP = new CRenderPass();
gUIRP.mPriority = CRenderPass.ePriority.Ui;
gUIRP.mDepthTest = false;
gUIRP.mDepthWrite = false;
export class CUI extends CSubject {
    static eAnchor = {
        Min: -1,
        Center: 0,
        Max: 1,
        Null: null,
    };
    mPick = null;
    mLastPickMouse = null;
    mPressPos = new CVec3();
    mFirstRayMs = null;
    mPressTraking = false;
    mBoundScale = 1;
    mDbClick = 0;
    mDbTime = 0;
    mDbOn = false;
    mMove = false;
    mUpdate = true;
    mEvent = CEvent.eType.Null;
    mLastEvent = CEvent.eType.Null;
    mUIPT = null;
    mUICL = null;
    mSize = null;
    mRGBA = null;
    mClickEvent = new CEvent();
    mPressEvent = new CEvent();
    mCamZoomResize = false;
    mAnchorXType = CUI.eAnchor.Null;
    mAnchorYType = CUI.eAnchor.Null;
    mAnchorXLen = 0;
    mAnchorYLen = 0;
    mUpdateAnchor = true;
    mUpdateScale = false;
    mPivot = null;
    mFocusCount = 0;
    mDebugMode = new Array();
    static ToolMode(_enable) { gToolMode = _enable; }
    static SetMainFrame(_frame) { gMainFrame = _frame; }
    IsShould(_member, _type) {
        if (_member == "mPick" || _member == "mLastPickMouse" || _member == "mLastEvent" ||
            _member == "mUpdateAnchor" || _member == "mUpdate" || _member == "mUpdateScale")
            return true;
        return super.IsShould(_member, _type);
    }
    ImportCJSON(_json) {
        var wt = super.ImportCJSON(_json);
        var ptVec = this.FindComps(CPaint2D);
        if (ptVec.length > 0)
            this.mUIPT = ptVec[0];
        var clVec = this.FindComps(CCollider);
        if (clVec.length > 0)
            this.mUICL = clVec[0];
        for (let i = 0; i < this.mComArr.length; ++i) {
            if (this.mDebugMode != null && this.mDebugMode.length > i)
                this.mComArr[i].SetEnable(this.mDebugMode[i]);
        }
        return wt;
    }
    Export(_copy = true, _resetKey = true) {
        var wt = super.Export(_copy, _resetKey);
        var ptVec = wt.FindComps(CPaint2D);
        if (ptVec.length > 0)
            wt.mUIPT = ptVec[0];
        var clVec = wt.FindComps(CCollider);
        if (clVec.length > 0)
            wt.mUICL = clVec[0];
        return wt;
    }
    constructor() {
        super();
    }
    SetCamZoomResize(_enable) {
        this.mCamZoomResize = _enable;
    }
    SetPressTraking(_enable) {
        this.mPressTraking = _enable;
    }
    SetDebugMode(_enable) {
        if (_enable)
            this.mDebugMode = new Array();
        else {
            this.mDebugMode = null;
        }
    }
    SetAnchorX(_type, _len = 0) {
        this.mAnchorXType = _type;
        this.mAnchorXLen = _len;
        this.mUpdateAnchor = true;
    }
    SetAnchorY(_type, _len = 0) {
        this.mAnchorYType = _type;
        this.mAnchorYLen = _len;
        this.mUpdateAnchor = true;
    }
    SetEnable(_show) {
        super.SetEnable(_show);
    }
    GetPt() { return this.mUIPT; }
    GetCl() { return this.mUICL; }
    GetPressPos() { return this.mPressPos; }
    GetPick() { return this.mPick; }
    GetLastEvent() { return this.mLastEvent; }
    SetMove(_enable) {
        this.mMove = _enable;
        this.AddCCollider();
    }
    AddCCollider() {
        if (this.mUIPT == null)
            return;
        var bound = this.mUIPT.GetBound();
        if (bound.GetType() == CBound.eType.Null) {
            return;
        }
        if (this.mUICL != null) {
            this.mUICL.InitBound(this.mUIPT);
            this.mUICL.mBound.mMin.x *= this.mBoundScale;
            this.mUICL.mBound.mMin.y *= this.mBoundScale;
            this.mUICL.mBound.mMax.x *= this.mBoundScale;
            this.mUICL.mBound.mMax.y *= this.mBoundScale;
            this.mUICL.mBound.mMax.z = 0.1;
            this.mUICL.mBound.mMin.z = -0.1;
            return;
        }
        this.mUICL = new CCollider(this.mUIPT);
        this.mUICL.SetPickMouse(true);
        this.mUICL.SetBoundType(CBound.eType.Box);
        this.mUICL.mBound.mMin.x *= this.mBoundScale;
        this.mUICL.mBound.mMin.y *= this.mBoundScale;
        this.mUICL.mBound.mMax.x *= this.mBoundScale;
        this.mUICL.mBound.mMax.y *= this.mBoundScale;
        this.mUICL.mBound.mMax.z = 0.1;
        this.mUICL.mBound.mMin.z = -0.1;
        this.PushComp(this.mUICL);
    }
    GetSize() { return this.mSize; }
    SetSize(_width, _height) {
        if (this.mSize == null)
            this.mSize = new CVec2();
        else if (this.mSize.x == _width && this.mSize.y == _height) {
            return;
        }
        this.mSize.x = _width;
        this.mSize.y = _height;
        if (this.mUIPT != null) {
            this.mUIPT.SetSize(this.mSize);
            this.AddCCollider();
        }
        this.mUpdateAnchor = true;
    }
    GetPivot() {
        return this.mPivot;
    }
    SetPivot(_pivot) {
        this.mPivot = _pivot;
        if (this.mUIPT) {
            if (this.mPivot != null) {
                this.mUIPT.SetPivot(_pivot);
            }
            this.AddCCollider();
        }
    }
    SetClickEvent(_event) {
        if (_event instanceof CEvent)
            this.mClickEvent = _event;
        else
            this.mClickEvent = new CEvent(_event);
        this.AddCCollider();
    }
    SetPressEvent(_event) {
        if (_event instanceof CEvent)
            this.mPressEvent = _event;
        else
            this.mPressEvent = new CEvent(_event);
        this.AddCCollider();
    }
    SetRGBA(_RGBA = new CVec4(0, 0, 0, 1)) {
        if (this.mRGBA != null && this.mRGBA.Equals(_RGBA))
            return;
        this.mRGBA = _RGBA;
        if (this.mUIPT != null) {
            this.mUIPT.SetColorModel(new CColor(_RGBA.x, _RGBA.y, _RGBA.z, CColor.eModel.RGBAdd));
            this.mUIPT.SetAlphaModel(new CAlpha(_RGBA.w));
        }
    }
    RTTexCodi() {
        this.mUIPT.SetTexCodi(new CVec4(1, 1, 0, -1));
    }
    PickMouse(_rayMouse) {
        if (this.mEnable == false)
            return;
        this.mPick = _rayMouse;
    }
    UpdateAnchor() {
        if (this.mUIPT.mRenPT.length == 0 || gToolMode)
            return;
        var cam = this.mUIPT.mRenPT[0].mCam;
        if (this.mUpdateAnchor == false && this.mFrame.Win().IsResize() == false && cam.mUpdateMat == 0)
            return;
        if (this.mAnchorXType == CUI.eAnchor.Null || this.mAnchorYType == CUI.eAnchor.Null || this.mUIPT == null)
            return;
        var pos = new CVec3();
        var bound = this.mUIPT.GetBound().Export();
        if (bound.GetType() == CBound.eType.Null)
            return;
        var width = cam.mWidth;
        var height = cam.mHeight;
        width = this.mFrame.PF().mWidth;
        height = this.mFrame.PF().mHeight;
        let zoom = (1 / cam.mZoom);
        let sizeX = Math.round((bound.mMax.x * this.mSca.x) * zoom);
        let sizeY = Math.round((bound.mMax.y * this.mSca.y) * zoom);
        pos.x = sizeX * -this.mAnchorXType + this.mAnchorXLen * -this.mAnchorXType;
        pos.y = sizeY * -this.mAnchorYType + this.mAnchorYLen * -this.mAnchorYType;
        if (this.mAnchorXType > 0)
            pos.x += width;
        if (this.mAnchorYType > 0)
            pos.y += height;
        pos = cam.ScreenToWorld2DPoint(pos.x, pos.y);
        pos.x = Math.trunc(pos.x);
        pos.y = Math.trunc(pos.y);
        super.SetPos(pos, true);
        this.mUpdateAnchor = false;
    }
    SetPos(_pos, _reset = true) {
        super.SetPos(_pos, _reset);
        this.mUpdateAnchor = true;
    }
    SubjectUpdate(_update) {
        super.SubjectUpdate(_update);
        if (this.mDebugMode != null) {
            if (this.GetFrame().PF().mDebugMode && this.mDebugMode.length == 0) {
                for (let i = 0; i < this.mComArr.length; ++i) {
                    this.mDebugMode[i] = this.mComArr[i].IsEnable();
                    this.mComArr[i].SetEnable(false);
                }
            }
            else if (this.GetFrame().PF().mDebugMode == false && this.mDebugMode.length != 0) {
                for (let i = 0; i < this.mComArr.length; ++i) {
                    if (this.mDebugMode[i] == null)
                        this.mComArr[i].SetEnable(true);
                    else
                        this.mComArr[i].SetEnable(this.mDebugMode[i]);
                }
                this.mUpdateAnchor = true;
                this.mDebugMode.length = 0;
            }
        }
        if (this.mUIPT == null || this.mFrame == null)
            return;
        if (this.mUIPT.mRenPT.length > 0) {
            let cam = this.mUIPT.mRenPT[0].mCam;
            if (this.mCamZoomResize && Math.abs(cam.mZoom - this.mSca.x) > 0.001) {
                this.SetSca(new CVec3(cam.mZoom, cam.mZoom, cam.mZoom));
            }
        }
        this.UpdateAnchor();
        let lastPressPos = this.mPressPos;
        this.mPressPos = null;
        let ev = CEvent.eType.Null;
        if (this.mPick != null) {
            if (this.mPick.mouse.press) {
                ev = CEvent.eType.Press;
                if (this.mFirstRayMs == null) {
                    this.mFirstRayMs = this.mPick.Export();
                    let ctr = CMath.V3SubV3(this.mFirstRayMs.ray.GetPosition(), this.GetPos());
                    this.mFirstRayMs.ray.SetOriginal(ctr);
                }
            }
            else
                ev = CEvent.eType.Pick;
            let push = true;
            let aDepth = this.GetPt().GetRenderPass()[0].mPriority + this.GetPt().GetFMat().z;
            for (let i = 0; i < gUIPDepth.length; ++i) {
                if (gUIPDepth[i] != this && gUIPDepth[i].mLastPickMouse.mouse.key == this.mPick.mouse.key) {
                    push = false;
                    ev = CEvent.eType.Null;
                    this.mPick = null;
                    break;
                }
                if (gUIPDepth[i] == this) {
                    push = false;
                    continue;
                }
                let bDepth = gUIPDepth[i].GetPt().GetRenderPass()[0].mPriority + gUIPDepth[i].GetPt().GetFMat().z;
                if (gUIPDepth[i].mLastPickMouse.mouse.key == this.mPick.mouse.key) {
                    if (aDepth == bDepth) {
                        let aDist = CMath.V3Distance(this.mPick.ray.GetPosition(), this.GetPos());
                        let bDist = CMath.V3Distance(gUIPDepth[i].mLastPickMouse.ray.GetPosition(), gUIPDepth[i].GetPos());
                        if (aDist > bDist) {
                            push = false;
                            ev = CEvent.eType.Null;
                            this.mPick = null;
                            break;
                        }
                    }
                    if (bDepth < aDepth)
                        gUIPDepth[i].mLastEvent = CEvent.eType.Null;
                    else
                        ev = CEvent.eType.Null;
                }
            }
            if (push) {
                gUIPDepth.push(this);
            }
        }
        if (this.mLastPickMouse != null && this.mPick == null) {
            let m = this.mFrame.Input().GetMouseKey(this.mLastPickMouse.mouse.key);
            if (m != null && m.press && this.mPressTraking && this.mFirstRayMs != null) {
                ev = CEvent.eType.Press;
                this.mLastPickMouse.mouse.Import(m);
                this.mPick = this.mLastPickMouse;
            }
            else {
                for (let i = 0; i < gUIPDepth.length; ++i) {
                    if (gUIPDepth[i] == this) {
                        gUIPDepth.splice(i, 1);
                        break;
                    }
                }
            }
        }
        if (this.mDbOn) {
            this.mDbTime -= _update.DeltaTime();
            if (this.mDbTime <= 0) {
                this.mLastEvent = CEvent.eType.Click;
                this.mClickEvent.Call(this);
                this.mDbTime = 0;
                this.mDbOn = false;
                this.mPressPos = lastPressPos;
            }
        }
        if (this.mLastEvent == CEvent.eType.Press) {
            if (ev == CEvent.eType.Pick) {
                if (this.mDbClick != 0) {
                    if (this.mDbOn == false) {
                        this.mDbOn = true;
                        this.mDbTime = this.mDbClick;
                        this.mLastEvent = CEvent.eType.Null;
                    }
                    else {
                        if (this.mDbTime > 0) {
                            this.mLastEvent = CEvent.eType.DoubleClick;
                            this.mClickEvent.Call(this);
                            this.mDbTime = 0;
                            this.mDbOn = false;
                        }
                    }
                }
                else {
                    this.mLastEvent = CEvent.eType.Click;
                    this.mPressPos = lastPressPos;
                    this.mClickEvent.Call(this);
                }
            }
            else if (ev == CEvent.eType.Null && this.mPressTraking) {
                this.mLastEvent = CEvent.eType.Click;
                this.mPressPos = lastPressPos;
                this.mClickEvent.Call(this);
            }
        }
        else
            this.mLastEvent = ev;
        if (this.mFirstRayMs != null && ev == CEvent.eType.Null) {
            this.mFirstRayMs = null;
        }
        if (ev == CEvent.eType.Press) {
            this.GetFrame().Input().SetUI(this);
            this.mPressEvent.Call(this);
            var mx = this.mPick.mouse.x - this.mFirstRayMs.mouse.x;
            var my = this.mPick.mouse.y - this.mFirstRayMs.mouse.y;
            let ctr = this.mFirstRayMs.ray.GetOriginal();
            this.mPressPos = new CVec3(mx + ctr.x, my + ctr.y);
        }
        this.mLastPickMouse = this.mPick;
        this.mPick = null;
    }
}
;
export class CUIText extends CUI {
    mText = null;
    mFontOption;
    mAlignCenter = true;
    constructor() {
        super();
    }
    Init(_text, _fontOption = null) {
        if (_fontOption != null)
            this.mFontOption = _fontOption;
        if (this.mFontOption == null)
            this.mFontOption = new CFontOption(64);
        this.mText = _text + "";
        if (this.mUIPT == null) {
            this.mUIPT = new CPaint2D();
            this.mUIPT.PushRenderPass(gUIRP);
            this.PushComp(this.mUIPT);
        }
        this.mUpdate = true;
    }
    SubjectUpdate(_delay) {
        if (this.mUpdate && this.mText != null) {
            if (this.mDebugMode != null)
                this.mDebugMode.length = 0;
            var fr = CFont.TextToTexName(this.GetFrame().Ren(), this.mText, this.mFontOption);
            this.mUIPT.SetTexture(fr.mKey);
            this.mUIPT.SetSize(null);
            if (this.mAlignCenter) {
                var xrate = fr.mXSize - fr.mRXSize;
                this.mUIPT.SetPos(new CVec3(xrate * 0.5, 0, 0));
            }
            this.SetPivot(this.mPivot);
            if (this.mUICL != null) {
                this.mUICL.SetPickMouse(false);
            }
        }
        if (this.mUICL == null) {
            this.AddCCollider();
            if (this.mUICL != null) {
                this.mUICL.SetPickMouse(false);
            }
        }
        super.SubjectUpdate(_delay);
        if (this.mUpdate)
            this.mUpdate = false;
    }
    Export(_copy = true, _resetKey = true) {
        this.mUIPT.SetTexture("");
        return super.Export(_copy, _resetKey);
    }
    SetFrame(_fw) {
        if (_fw != null && this.mText != null)
            CFont.TextToTexName(_fw.Ren(), this.mText, this.mFontOption);
        super.SetFrame(_fw);
    }
}
;
export class CUIPicture extends CUI {
    mTextureKey = "";
    constructor() {
        super();
    }
    Init(_tex, _color = null) {
        this.mTextureKey = _tex;
        this.mUpdate = true;
        if (this.mUIPT == null) {
            this.mUIPT = new CPaint2D(this.mTextureKey, this.mSize);
            this.mUIPT.PushRenderPass(gUIRP);
            this.PushComp(this.mUIPT);
        }
    }
    SubjectUpdate(_delay) {
        if (this.mUpdate && this.mTextureKey != null) {
            this.mDebugMode.length = 0;
            this.mUIPT.SetTexture(this.mTextureKey);
            this.mUIPT.SetSize(this.mSize);
            if (this.mRGBA != null)
                this.SetRGBA(this.mRGBA);
            this.SetPivot(this.mPivot);
            if (this.mUICL != null) {
                this.mUICL.SetPickMouse(false);
            }
        }
        if (this.mUICL == null) {
            this.AddCCollider();
            if (this.mUICL != null) {
                this.mUICL.SetPickMouse(false);
            }
        }
        super.SubjectUpdate(_delay);
        if (this.mUpdate)
            this.mUpdate = false;
    }
}
;
export class CUIButtonImg extends CUI {
    mNormal = "";
    mOverImg = "";
    mPressImg = "";
    constructor() {
        super();
    }
    Init(_normal, _over, _press) {
        this.mUpdate = true;
        this.mNormal = _normal;
        this.mOverImg = _over;
        this.mPressImg = _press;
        if (this.mFrame != null) {
            this.mFrame.Load().Exe(_over);
            this.mFrame.Load().Exe(_press);
        }
        this.mUpdate = true;
        if (this.mUIPT == null) {
            this.mUIPT = new CPaint2D(this.mNormal, this.mSize);
            this.mUIPT.PushRenderPass(gUIRP);
            this.PushComp(this.mUIPT);
        }
    }
    SubjectUpdate(_delay) {
        if (this.mUpdate) {
            if (this.mNormal != null) {
                this.mDebugMode.length = 0;
                this.mUIPT.SetSize(this.mSize);
                this.mUIPT.SetTexture(this.mNormal);
                if (this.mRGBA != null)
                    this.SetRGBA(this.mRGBA);
                this.SetPivot(this.mPivot);
            }
            this.mUpdate = false;
        }
        if (this.mUICL == null) {
            this.AddCCollider();
        }
        if (this.mLastEvent == CEvent.eType.Press) {
            if (this.mPressImg != this.mUIPT.GetTexture()[0])
                this.mUIPT.SetTexture(this.mPressImg);
            this.GetFrame().SetCurser(CFrame.eCurser.pointer);
        }
        else if (this.mLastEvent == CEvent.eType.Pick) {
            if (this.mOverImg != this.mUIPT.GetTexture()[0])
                this.mUIPT.SetTexture(this.mOverImg);
            this.GetFrame().SetCurser(CFrame.eCurser.pointer);
        }
        else {
            if (this.mNormal != this.mUIPT.GetTexture()[0])
                this.mUIPT.SetTexture(this.mNormal);
        }
        super.SubjectUpdate(_delay);
    }
    SetFrame(_fw) {
        super.SetFrame(_fw);
        if (this.mFrame != null) {
            this.mFrame.Load().Exe(this.mOverImg);
            this.mFrame.Load().Exe(this.mPressImg);
        }
    }
}
;
export class CUIButtonRGBA extends CUI {
    mNormal = "";
    mNormalRGBA = new CVec4(0, 0, 0, 1);
    mOverRGBA = new CVec4(0, 0, 0, 1);
    mPressRGBA = new CVec4(0, 0, 0, 1);
    constructor() {
        super();
    }
    Init(_normal, _over = new CVec4(-0.2, -0.2, -0.2, 1), _press = new CVec4(0.2, 0.2, 0.2, 1)) {
        this.mUpdate = true;
        this.mNormal = _normal;
        this.mOverRGBA = _over;
        this.mPressRGBA = _press;
        if (this.mUIPT == null && this.mNormal != null) {
            this.mUIPT = new CPaint2D(this.mNormal, this.mSize);
            this.mUIPT.PushRenderPass(gUIRP);
            this.PushComp(this.mUIPT);
        }
    }
    SubjectUpdate(_delay) {
        if (this.mUpdate) {
            this.mDebugMode.length = 0;
            this.mUIPT.SetSize(this.mSize);
            this.mUIPT.SetTexture(this.mNormal);
            if (this.mRGBA != null)
                this.SetRGBA(this.mRGBA);
            this.SetPivot(this.mPivot);
            this.mUpdate = false;
        }
        if (this.mUICL == null) {
            this.AddCCollider();
        }
        if (this.mLastEvent == CEvent.eType.Press) {
            this.SetRGBA(this.mPressRGBA);
            this.GetFrame().SetCurser(CFrame.eCurser.pointer);
        }
        else if (this.mLastEvent == CEvent.eType.Pick) {
            this.SetRGBA(this.mOverRGBA);
            this.GetFrame().SetCurser(CFrame.eCurser.pointer);
        }
        else {
            this.SetRGBA(this.mNormalRGBA);
        }
        super.SubjectUpdate(_delay);
    }
}
;
export class CUIProgressBar extends CUI {
    mTexFront;
    mTexBack;
    mMax = 0;
    mVal = 0;
    mPTBack;
    constructor() {
        super();
    }
    ImportCJSON(_json) {
        let result = super.ImportCJSON(_json);
        let ptVec = result.FindComps(CPaint2D);
        if (ptVec.length > 1) {
            this.mPTBack = ptVec[1];
        }
        return result;
    }
    Init(_max, _val, _size = new CVec2(2, 2), _front = null, _back = null) {
        this.mTexFront = _front;
        this.mTexBack = _back;
        this.mMax = _max;
        this.mVal = _val;
        this.mSize = _size;
        this.mUpdate = true;
        if (this.mUIPT == null) {
            var redOn = false;
            if (this.mTexFront == null && this.mRGBA == null) {
                redOn = true;
            }
            this.mUIPT = new CPaint2D("", this.mSize);
            this.mUIPT.PushRenderPass(gUIRP);
            if (redOn)
                this.SetRGBA(new CVec4(1, 0, 0, 0));
            else if (this.mRGBA)
                this.SetRGBA(this.mRGBA);
            this.PushComp(this.mUIPT);
        }
        if (this.mPTBack == null) {
            this.mPTBack = new CPaint2D("", this.mSize);
            this.mPTBack.PushRenderPass(gUIRP);
            this.mPTBack.SetPos(new CVec3(0, 0, -0.1));
            this.PushComp(this.mPTBack);
        }
    }
    SetBarVal(_val) {
        if (_val < 0)
            this.mVal = 0;
        else if (_val > this.mMax)
            this.mVal = this.mMax;
        else
            this.mVal = _val;
        if (this.mUIPT == null)
            return;
        var per = this.mVal / this.mMax * 1.0;
        if (Number.isNaN(per)) {
            per = 0;
        }
        this.mUIPT.SetPos(new CVec3((this.mSize.x * per - this.mSize.x) * 0.5, 0, 0));
        this.mUIPT.SetSize(new CVec2(this.mSize.x * per, this.mSize.y));
    }
    GetBarVal() { return this.mVal; }
    GetBarMax() { return this.mMax; }
    SetBarMax(_val) {
        this.mMax = _val;
        this.SetBarVal(this.GetBarVal());
    }
    SetSizeScreenX(_yLen) {
        if (!this.mFrame)
            return;
        this.SetSize(this.mFrame.PF().mWidth, _yLen);
    }
    SetSizeScreenY(_xLen) {
        if (!this.mFrame)
            return;
        this.SetSize(_xLen, this.mFrame.PF().mHeight);
    }
    SubjectUpdate(_delay) {
        if (this.mUpdate) {
            if (!(this.mUIPT && this.mPTBack)) {
                return;
            }
            if (this.mTexFront == null) {
                this.mTexFront = this.mFrame.Pal().GetBlackTex();
                this.mUIPT.SetTexture(this.mTexFront);
            }
            if (this.mTexBack == null) {
                this.mTexBack = this.mFrame.Pal().GetBlackTex();
                this.mPTBack.SetTexture(this.mTexBack);
            }
            this.mUIPT.SetSize(this.mSize);
            if (this.mRGBA != null)
                this.SetRGBA(this.mRGBA);
            this.SetBarVal(this.mVal);
            if (this.mUICL != null) {
                this.mUICL.SetPickMouse(false);
            }
        }
        if (this.mUICL == null) {
            this.AddCCollider();
            if (this.mUICL != null) {
                this.mUICL.SetPickMouse(false);
            }
        }
        super.SubjectUpdate(_delay);
        if (this.mUpdate)
            this.mUpdate = false;
    }
}
export class CUIHTML extends CUI {
    mHTML;
    mHover = false;
    mCLInit = true;
    Init(_html, _size = null) {
        this.mHTML = _html;
        if (this.mUIPT == null) {
            this.mUIPT = new CPaintHTML(CDOM.DataToDom(this.mHTML), _size);
            this.PushComp(this.mUIPT);
        }
        else {
            this.mUIPT.Destroy();
            this.mUIPT = new CPaintHTML(CDOM.DataToDom(this.mHTML), _size);
            this.PushComp(this.mUIPT);
        }
    }
    Update(_update) {
        super.Update(_update);
        if (this.mUICL == null || this.mCLInit) {
            if (this.mUIPT.mAttach == false) {
                return;
            }
            this.AddCCollider();
            this.mCLInit = false;
        }
        let e = this.mUIPT.GetElement();
        if (e.classList.length > 0 && this.mHover) {
            if (this.mLastEvent == CEvent.eType.Pick || this.mLastEvent == CEvent.eType.Press) {
                this.mUIPT.GetElement().classList.add("active");
            }
            else {
                this.mUIPT.GetElement().classList.remove("active");
            }
        }
    }
    SetHover(_enable) {
        this.mHover = _enable;
    }
}
