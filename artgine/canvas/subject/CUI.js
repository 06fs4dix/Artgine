import { CEvent } from "../../basic/CEvent.js";
import { CBound } from "../../geometry/CBound.js";
import { CMath } from "../../geometry/CMath.js";
import { CVec2 } from "../../geometry/CVec2.js";
import { CVec3 } from "../../geometry/CVec3.js";
import { CVec4 } from "../../geometry/CVec4.js";
import { CRenderPass } from "../../render/CRenderPass.js";
import { CFont, CFontOption } from "../../util/CFont.js";
import { CFrame } from "../../util/CFrame.js";
import { CCollider } from "../component/CCollider.js";
import { CPaint2D } from "../component/paint/CPaint2D.js";
import { CSubject } from "./CSubject.js";
var g_toolMode = false;
var g_moveMode = false;
var g_uiPDepth = new Array();
var gUIRP = new CRenderPass();
gUIRP.mPriority = CRenderPass.ePriority.Ui;
gUIRP.mDepthTest = true;
gUIRP.mDepthWrite = true;
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
    mSkipZTest = false;
    mMove = false;
    mUpdate = true;
    mLastEvent = CEvent.eType.Null;
    mUIPT = null;
    mUICL = null;
    mSize = null;
    mRGBA = null;
    mClickEvent = new CEvent();
    mPressEvent = new CEvent();
    m_camResize = false;
    mAnchorXType = CUI.eAnchor.Null;
    mAnchorYType = CUI.eAnchor.Null;
    mAnchorXLen = 0;
    mAnchorYLen = 0;
    mUpdateAnchor = true;
    mUpdateScale = false;
    mPivot = null;
    mFocusCount = 0;
    mDebugMode = new Array();
    static ToolMode(_enable) { g_toolMode = _enable; }
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
    SetCamResize(_enable) {
        this.m_camResize = _enable;
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
            this.mUICL.mBound.mMax.z = 0.1;
            this.mUICL.mBound.mMin.z = -0.1;
            return;
        }
        this.mUICL = new CCollider(this.mUIPT);
        this.mUICL.SetPickMouse(true);
        this.mUICL.SetBoundType(CBound.eType.Box);
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
        if (this.mUIPT != null)
            this.mUIPT.SetRGBA(_RGBA);
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
        if (this.mUIPT.mRenPT.length == 0 || g_toolMode)
            return;
        var cam = this.mUIPT.mRenPT[0].mCam;
        if (this.mUpdateAnchor == false && this.mFrame.Win().IsResize() == false && cam.mUpdateMat == 0)
            return;
        if (this.mAnchorXType == CUI.eAnchor.Null || this.mAnchorYType == CUI.eAnchor.Null || this.mUIPT == null)
            return;
        var pos = this.GetPos().Export();
        var bound = this.mUIPT.GetBound().Export();
        if (bound.GetType() == CBound.eType.Null)
            return;
        bound.InitBound(CMath.V3MulMatCoordi(bound.mMin, this.mUIPT.GetLMat()));
        bound.InitBound(CMath.V3MulMatCoordi(bound.mMax, this.mUIPT.GetLMat()));
        var width = cam.mWidth;
        var height = cam.mHeight;
        if (width == 0) {
            width = this.mFrame.PF().mWidth;
        }
        if (height == 0) {
            height = this.mFrame.PF().mHeight;
        }
        var ww = width * 0.5 * this.mAnchorXType * cam.mZoom;
        var wh = height * 0.5 * this.mAnchorYType * cam.mZoom;
        pos.x = ww - this.mAnchorXLen * this.mAnchorXType * this.mSca.x + (bound.mMax.x * this.mSca.x) * (-this.mAnchorXType) + cam.GetEye().x;
        pos.y = wh - this.mAnchorYLen * this.mAnchorYType * this.mSca.y + (bound.mMax.y * this.mSca.y) * (-this.mAnchorYType) + cam.GetEye().y;
        if (this.mAnchorXType == CUI.eAnchor.Center)
            pos.x += this.mAnchorXLen;
        if (this.mAnchorYType == CUI.eAnchor.Center)
            pos.y += this.mAnchorYLen;
        this.SetPos(pos);
        this.mUpdateAnchor = false;
    }
    SetPos(_pos, _reset = true) {
        super.SetPos(_pos, _reset);
        this.mUpdateAnchor = true;
    }
    SubjectUpdate(_delay) {
        super.SubjectUpdate(_delay);
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
            if (this.m_camResize && (this.mFrame.Win().IsResize() || this.mUpdate || cam.mUpdateMat != 0)) {
                {
                    this.SetSca(new CVec3(cam.mZoom, cam.mZoom, cam.mZoom));
                }
            }
        }
        this.UpdateAnchor();
        var pressChk = false;
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
            for (let i = 0; i < g_uiPDepth.length; ++i) {
                if (g_uiPDepth[i] == this) {
                    push = false;
                    continue;
                }
                let bDepth = g_uiPDepth[i].GetPt().GetRenderPass()[0].mPriority + g_uiPDepth[i].GetPt().GetFMat().z;
                if (g_uiPDepth[i].mLastPickMouse.mouse.key == this.mPick.mouse.key) {
                    if (aDepth == bDepth) {
                        push = false;
                        ev = CEvent.eType.Null;
                        this.mPick = null;
                        break;
                    }
                    if (bDepth < aDepth)
                        g_uiPDepth[i].mLastEvent = CEvent.eType.Null;
                    else
                        ev = CEvent.eType.Null;
                }
            }
            if (push) {
                g_uiPDepth.push(this);
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
                for (let i = 0; i < g_uiPDepth.length; ++i) {
                    if (g_uiPDepth[i] == this) {
                        g_uiPDepth.splice(i, 1);
                        break;
                    }
                }
            }
            if (this.mSkipZTest) {
                for (let i = 0; i < g_uiPDepth.length; ++i) {
                    if (g_uiPDepth[i] == this) {
                        g_uiPDepth.splice(i, 1);
                        break;
                    }
                }
            }
        }
        if (this.mLastEvent == CEvent.eType.Press && ev == CEvent.eType.Pick) {
            this.mLastEvent = CEvent.eType.Click;
            this.mClickEvent.Call(this);
        }
        else
            this.mLastEvent = ev;
        if (this.mFirstRayMs != null && ev == CEvent.eType.Null) {
            this.mFirstRayMs = null;
        }
        if (ev == CEvent.eType.Press) {
            this.mPressEvent.Call(this);
            var mx = this.mPick.mouse.x - this.mFirstRayMs.mouse.x;
            var my = this.mPick.mouse.y - this.mFirstRayMs.mouse.y;
            let ctr = this.mFirstRayMs.ray.GetOriginal();
            this.mPressPos = new CVec3(mx + ctr.x, my + ctr.y);
        }
        this.mLastPickMouse = this.mPick;
        this.mPick = null;
        return;
    }
}
;
export class CUIText extends CUI {
    m_text = null;
    m_fo;
    m_alignCenter = true;
    constructor() {
        super();
    }
    Init(_text, _fontOption = null) {
        if (_fontOption != null)
            this.m_fo = _fontOption;
        if (this.m_fo == null)
            this.m_fo = new CFontOption(64);
        this.m_text = _text + "";
        if (this.mUIPT == null) {
            this.mUIPT = new CPaint2D();
            this.mUIPT.SetRenderPass(gUIRP);
            this.PushComp(this.mUIPT);
        }
        this.mUpdate = true;
    }
    SubjectUpdate(_delay) {
        if (this.mUpdate && this.m_text != null) {
            if (this.mDebugMode != null)
                this.mDebugMode.length = 0;
            var fr = CFont.TextToTexName(this.GetFrame().Ren(), this.m_text, this.m_fo);
            this.mUIPT.SetTexture(fr.mKey);
            this.mUIPT.SetSize(null);
            if (this.m_alignCenter) {
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
        if (_fw != null && this.m_text != null)
            CFont.TextToTexName(_fw.Ren(), this.m_text, this.m_fo);
        super.SetFrame(_fw);
    }
}
;
export class CUIPicture extends CUI {
    m_tex = "";
    constructor() {
        super();
    }
    Init(_tex, _color = null) {
        this.m_tex = _tex;
        this.mUpdate = true;
        if (this.mUIPT == null) {
            this.mUIPT = new CPaint2D(this.m_tex, this.mSize);
            this.mUIPT.SetRenderPass(gUIRP);
            this.PushComp(this.mUIPT);
        }
    }
    SubjectUpdate(_delay) {
        if (this.mUpdate && this.m_tex != null) {
            this.mDebugMode.length = 0;
            this.mUIPT.SetTexture(this.m_tex);
            this.mUIPT.SetSize(this.mSize);
            if (this.mRGBA != null)
                this.mUIPT.SetRGBA(this.mRGBA);
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
    m_normal = "";
    m_overImg = "";
    m_pressImg = "";
    constructor() {
        super();
    }
    Init(_normal, _over, _press) {
        this.mUpdate = true;
        this.m_normal = _normal;
        this.m_overImg = _over;
        this.m_pressImg = _press;
        if (this.mFrame != null) {
            this.mFrame.Load().Load(_over);
            this.mFrame.Load().Load(_press);
        }
        this.mUpdate = true;
        if (this.mUIPT == null) {
            this.mUIPT = new CPaint2D(this.m_normal, this.mSize);
            this.mUIPT.SetRenderPass(gUIRP);
            this.PushComp(this.mUIPT);
        }
    }
    SubjectUpdate(_delay) {
        if (this.mUpdate) {
            if (this.m_normal != null) {
                this.mDebugMode.length = 0;
                this.mUIPT.SetSize(this.mSize);
                this.mUIPT.SetTexture(this.m_normal);
                if (this.mRGBA != null)
                    this.mUIPT.SetRGBA(this.mRGBA);
                this.SetPivot(this.mPivot);
            }
            this.mUpdate = false;
        }
        if (this.mUICL == null) {
            this.AddCCollider();
        }
        if (this.mLastEvent == CEvent.eType.Press) {
            if (this.m_pressImg != this.mUIPT.GetTexture()[0])
                this.mUIPT.SetTexture(this.m_pressImg);
            this.GetFrame().SetCurser(CFrame.eCurser.pointer);
        }
        else if (this.mLastEvent == CEvent.eType.Pick) {
            if (this.m_overImg != this.mUIPT.GetTexture()[0])
                this.mUIPT.SetTexture(this.m_overImg);
            this.GetFrame().SetCurser(CFrame.eCurser.pointer);
        }
        else {
            if (this.m_normal != this.mUIPT.GetTexture()[0])
                this.mUIPT.SetTexture(this.m_normal);
        }
        super.SubjectUpdate(_delay);
    }
    SetFrame(_fw) {
        super.SetFrame(_fw);
        if (this.mFrame != null) {
            this.mFrame.Load().Load(this.m_overImg);
            this.mFrame.Load().Load(this.m_pressImg);
        }
    }
}
;
export class CUIButtonRGBA extends CUI {
    m_normal = "";
    m_normalRGBA = new CVec4();
    m_overRGBA = new CVec4();
    m_pressRGBA = new CVec4();
    constructor() {
        super();
    }
    Init(_normal, _over = new CVec4(-0.2, -0.2, -0.2, 0), _press = new CVec4(0.2, 0.2, 0.2, 0)) {
        this.mUpdate = true;
        this.m_normal = _normal;
        this.m_overRGBA = _over;
        this.m_pressRGBA = _press;
        if (this.mUIPT == null && this.m_normal != null) {
            this.mUIPT = new CPaint2D(this.m_normal, this.mSize);
            this.mUIPT.SetRenderPass(gUIRP);
            this.PushComp(this.mUIPT);
        }
    }
    SubjectUpdate(_delay) {
        if (this.mUpdate) {
            this.mDebugMode.length = 0;
            this.mUIPT.SetSize(this.mSize);
            this.mUIPT.SetTexture(this.m_normal);
            if (this.mRGBA != null)
                this.mUIPT.SetRGBA(this.mRGBA);
            this.SetPivot(this.mPivot);
            this.mUpdate = false;
        }
        if (this.mUICL == null) {
            this.AddCCollider();
        }
        if (this.mLastEvent == CEvent.eType.Press) {
            this.SetRGBA(this.m_pressRGBA);
            this.GetFrame().SetCurser(CFrame.eCurser.pointer);
        }
        else if (this.mLastEvent == CEvent.eType.Pick) {
            this.SetRGBA(this.m_overRGBA);
            this.GetFrame().SetCurser(CFrame.eCurser.pointer);
        }
        else {
            this.SetRGBA(this.m_normalRGBA);
        }
        super.SubjectUpdate(_delay);
    }
}
;
export class CUIProgressBar extends CUI {
    m_texFront;
    m_texBack;
    m_max = 0;
    m_val = 0;
    m_ptBack;
    constructor() {
        super();
    }
    ImportCJSON(_json) {
        let result = super.ImportCJSON(_json);
        let ptVec = result.FindComps(CPaint2D);
        if (ptVec.length > 1) {
            this.m_ptBack = ptVec[1];
        }
        return result;
    }
    Init(_max, _val, _size = new CVec2(2, 2), _front = null, _back = null) {
        this.m_texFront = _front;
        this.m_texBack = _back;
        this.m_max = _max;
        this.m_val = _val;
        this.mSize = _size;
        this.mUpdate = true;
        if (this.mUIPT == null) {
            var redOn = false;
            if (this.m_texFront == null && this.mRGBA == null) {
                redOn = true;
            }
            this.mUIPT = new CPaint2D("", this.mSize);
            this.mUIPT.SetRenderPass(gUIRP);
            if (redOn)
                this.mUIPT.SetRGBA(new CVec4(1, 0, 0, 0));
            else if (this.mRGBA)
                this.mUIPT.SetRGBA(this.mRGBA);
            this.PushComp(this.mUIPT);
        }
        if (this.m_ptBack == null) {
            this.m_ptBack = new CPaint2D("", this.mSize);
            this.m_ptBack.SetRenderPass(gUIRP);
            this.m_ptBack.SetPos(new CVec3(0, 0, -0.1));
            this.PushComp(this.m_ptBack);
        }
    }
    SetBarVal(_val) {
        if (_val < 0)
            this.m_val = 0;
        else if (_val > this.m_max)
            this.m_val = this.m_max;
        else
            this.m_val = _val;
        if (this.mUIPT == null)
            return;
        var per = this.m_val / this.m_max * 1.0;
        if (Number.isNaN(per)) {
            per = 0;
        }
        this.mUIPT.SetPos(new CVec3((this.mSize.x * per - this.mSize.x) * 0.5, 0, 0));
        this.mUIPT.SetSize(new CVec2(this.mSize.x * per, this.mSize.y));
    }
    GetBarVal() { return this.m_val; }
    GetBarMax() { return this.m_max; }
    SetBarMax(_val) {
        this.m_max = _val;
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
            if (!(this.mUIPT && this.m_ptBack)) {
                return;
            }
            if (this.m_texFront == null) {
                this.m_texFront = this.mFrame.Pal().GetBlackTex();
                this.mUIPT.SetTexture(this.m_texFront);
            }
            if (this.m_texBack == null) {
                this.m_texBack = this.mFrame.Pal().GetBlackTex();
                this.m_ptBack.SetTexture(this.m_texBack);
            }
            this.mUIPT.SetSize(this.mSize);
            if (this.mRGBA != null)
                this.mUIPT.SetRGBA(this.mRGBA);
            this.SetBarVal(this.m_val);
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
