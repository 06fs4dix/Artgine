import { CEvent } from "../../basic/CEvent.js";
import { CMath } from "../../geometry/CMath.js";
import { CVec2 } from "../../geometry/CVec2.js";
import { CVec3 } from "../../geometry/CVec3.js";
import { CH5Canvas } from "../../render/CH5Canvas.js";
import { CInput } from "../../system/CInput.js";
import { CSubject } from "./CSubject.js";
import { CUI, CUIButtonRGBA, CUIHTML as CUIHTML } from "./CUI.js";
var eStickType;
(function (eStickType) {
    eStickType["Cross"] = "Cross";
    eStickType["Circle"] = "Circle";
    eStickType["Circle4"] = "Circle4";
    eStickType["Circle8"] = "Circle8";
})(eStickType || (eStickType = {}));
;
var eButtonType;
(function (eButtonType) {
    eButtonType["Alphabet_Rectangle"] = "Alphabet_Rectangle";
    eButtonType["Number_Rectangle"] = "Number_Rectangle";
    eButtonType["HTML"] = "HTML";
})(eButtonType || (eButtonType = {}));
;
var ePadType;
(function (ePadType) {
    ePadType["None"] = "None";
    ePadType["NES"] = "NES";
    ePadType["Basic"] = "Basic";
})(ePadType || (ePadType = {}));
;
var eKeyType;
(function (eKeyType) {
    eKeyType["Arrow"] = "Arrow";
    eKeyType["WASD"] = "WASD";
    eKeyType["Both"] = "Both";
})(eKeyType || (eKeyType = {}));
export class CPad extends CSubject {
    static eStickType = eStickType;
    static eButtonType = eButtonType;
    static ePadType = ePadType;
    static eKeyType = eKeyType;
    mStick = new Array();
    mButton = new Array();
    mButtonInput = Array();
    mLockPos = new CVec3();
    mPacketSend = false;
    mDir = new CVec3();
    mPadType = CPad.ePadType.Basic;
    mStickType = null;
    mPressOnStick = true;
    mPadScale = 1;
    mKeyType = CPad.eKeyType.Arrow;
    mRefDot = null;
    constructor() {
        super();
        this.SetKey("pad");
        this.mPMatMul = false;
    }
    SetButtonImg(_off, _img = null) {
        let element = this.mButton[_off].GetPt().GetElement();
        let button = element;
        if (element.tagName !== 'BUTTON') {
            button = element.querySelector('button');
        }
        if (button) {
            if (_img == null || _img == '') {
                button.innerHTML = `${_off}`;
                button.style.backgroundImage = '';
                button.style.backgroundSize = '';
                button.style.backgroundPosition = '';
                button.style.backgroundRepeat = '';
            }
            else {
                button.innerHTML = '';
                button.style.backgroundImage = `url('${_img}')`;
                button.style.backgroundSize = '70% 70%';
                button.style.backgroundPosition = 'center';
                button.style.backgroundRepeat = 'no-repeat';
            }
        }
    }
    SetButtonCoolTime(_off, _time) {
        if (_off >= this.mButton.length)
            return;
        let element = this.mButton[_off].GetPt().GetElement();
        let button = element;
        if (element.tagName !== 'BUTTON') {
            button = element.querySelector('button');
        }
        if (!button)
            return;
        const existingOverlay = button.querySelector('.cooltime-overlay');
        if (existingOverlay) {
            existingOverlay.remove();
        }
        const overlay = document.createElement('div');
        overlay.className = 'cooltime-overlay';
        overlay.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            border-radius: 50%;
            pointer-events: none;
            display: flex;
            align-items: center;
            justify-content: center;
            background: conic-gradient(
                rgba(0, 0, 0, 0.7) 0deg,
                rgba(0, 0, 0, 0.7) 0deg,
                transparent 0deg
            );
            z-index: 10;
        `;
        const timeText = document.createElement('div');
        timeText.className = 'cooltime-text';
        timeText.style.cssText = `
            color: white;
            font-weight: bold;
            font-size: 20px;
            text-shadow: 0 0 4px black;
            z-index: 11;
        `;
        overlay.appendChild(timeText);
        if (getComputedStyle(button).position === 'static') {
            button.style.position = 'relative';
        }
        button.appendChild(overlay);
        button.style.filter = 'brightness(0.6)';
        button.disabled = true;
        const startTime = performance.now();
        const duration = _time * 1000;
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const remaining = Math.max(0, duration - elapsed);
            const progress = remaining / duration;
            if (remaining > 0) {
                timeText.textContent = (remaining / 1000).toFixed(1);
                const degrees = 360 * progress;
                overlay.style.background = `conic-gradient(
                    rgba(0, 0, 0, 0.7) 0deg,
                    rgba(0, 0, 0, 0.7) ${degrees}deg,
                    transparent ${degrees}deg
                )`;
                requestAnimationFrame(animate);
            }
            else {
                overlay.remove();
                button.style.filter = '';
                button.disabled = false;
            }
        };
        requestAnimationFrame(animate);
    }
    SetPadScale(_val) {
        this.mPadScale = _val;
        this.PadReset();
    }
    IsShould(_member, _type) {
        if (_member == "mStick" || _member == "mButton" || _member == "mButtonInput")
            return false;
        return super.IsShould(_member, _type);
    }
    IsOn() {
        for (let each0 of this.mStick) {
            if (each0.GetLastEvent() != CEvent.eType.Null) {
                return true;
            }
        }
        for (let each0 of this.mButton) {
            if (each0.GetLastEvent() != CEvent.eType.Null) {
                return true;
            }
        }
        return false;
    }
    GetDir() { return this.mDir; }
    GetButtonEvent(_off) {
        if (this.mButton.length > _off) {
            if (this.mButton[_off].GetLastEvent() != CEvent.eType.Null)
                return this.mButton[_off].GetLastEvent();
            else
                return this.mButtonInput[_off];
        }
        return CEvent.eType.Null;
    }
    GetButtonPos(_off) {
        let pos = this.mButton[_off].GetPressPos();
        if (pos == null)
            pos = CVec3.Vec3(0, 0, 0);
        return pos;
    }
    Stick(_type, _move) {
        this.mStickType = _type;
        if (_type == eStickType.Cross) {
            CH5Canvas.Init(50, 50, true, false);
            let cmdList = [
                CH5Canvas.FillStyle('#5A86FF'),
                CH5Canvas.FillRect(0, 0, 50, 50),
                CH5Canvas.LineWidth(5),
                CH5Canvas.StrokeRect(0, 0, 50, 50),
                CH5Canvas.FillStyle('black'),
                CH5Canvas.FillText(25, 23, "△", 32),
            ];
            CH5Canvas.Draw(cmdList);
            let tex = CH5Canvas.GetNewTex();
            this.GetFrame().Res().Push("Pad/PadStickCrossUP.tex", tex);
            this.GetFrame().Ren().BuildTexture(tex);
            if (this.FindChilds("PadStickCrossUP").length == 0) {
                let btn = new CUIButtonRGBA();
                btn.SetCamZoomResize(true);
                btn.Init("Pad/PadStickCrossUP.tex");
                btn.SetKey("PadStickCrossUP");
                btn.SetAnchorX(CUI.eAnchor.Min, 30 + 50 * this.mPadScale);
                btn.SetAnchorY(CUI.eAnchor.Min, 30 + 100 * this.mPadScale);
                btn.SetSize(50 * this.mPadScale, 50 * this.mPadScale);
                this.PushChild(btn);
                this.mStick.push(btn);
                btn.GetPt().GetRenderPass()[0].mDepthTest = false;
            }
            cmdList = [
                CH5Canvas.FillStyle('#5A86FF'),
                CH5Canvas.FillRect(0, 0, 50, 50),
                CH5Canvas.LineWidth(5),
                CH5Canvas.StrokeRect(0, 0, 50, 50),
                CH5Canvas.FillStyle('black'),
                CH5Canvas.FillText(25, 27, "▽", 32),
            ];
            CH5Canvas.Draw(cmdList);
            tex = CH5Canvas.GetNewTex();
            this.GetFrame().Res().Push("Pad/PadStickCrossDown.tex", tex);
            this.GetFrame().Ren().BuildTexture(tex);
            if (this.FindChilds("PadStickCrossDown").length == 0) {
                let btn = new CUIButtonRGBA();
                btn.SetCamZoomResize(true);
                btn.Init("Pad/PadStickCrossDown.tex");
                btn.SetKey("PadStickCrossDown");
                btn.SetAnchorX(CUI.eAnchor.Min, 30 + 50 * this.mPadScale);
                btn.SetAnchorY(CUI.eAnchor.Min, 30 + this.mPadScale);
                btn.SetSize(50 * this.mPadScale, 50 * this.mPadScale);
                this.PushChild(btn);
                this.mStick.push(btn);
                btn.GetPt().GetRenderPass()[0].mDepthTest = false;
            }
            cmdList = [
                CH5Canvas.FillStyle('#5A86FF'),
                CH5Canvas.FillRect(0, 0, 50, 50),
                CH5Canvas.LineWidth(5),
                CH5Canvas.StrokeRect(0, 0, 50, 50),
                CH5Canvas.FillStyle('black'),
                CH5Canvas.FillText(23, 25, "◁", 32),
            ];
            CH5Canvas.Draw(cmdList);
            tex = CH5Canvas.GetNewTex();
            this.GetFrame().Res().Push("Pad/PadStickCrossLeft.tex", tex);
            this.GetFrame().Ren().BuildTexture(tex);
            if (this.FindChilds("PadStickCrossLeft").length == 0) {
                let btn = new CUIButtonRGBA();
                btn.SetCamZoomResize(true);
                btn.Init("Pad/PadStickCrossLeft.tex");
                btn.SetKey("PadStickCrossLeft");
                btn.SetAnchorX(CUI.eAnchor.Min, 30);
                btn.SetAnchorY(CUI.eAnchor.Min, 30 + 50 * this.mPadScale);
                btn.SetSize(50 * this.mPadScale, 50 * this.mPadScale);
                this.PushChild(btn);
                this.mStick.push(btn);
                btn.GetPt().GetRenderPass()[0].mDepthTest = false;
            }
            cmdList = [
                CH5Canvas.FillStyle('#5A86FF'),
                CH5Canvas.FillRect(0, 0, 50, 50),
                CH5Canvas.LineWidth(5),
                CH5Canvas.StrokeRect(0, 0, 50, 50),
                CH5Canvas.FillStyle('black'),
                CH5Canvas.FillText(27, 25, "▷", 32),
            ];
            CH5Canvas.Draw(cmdList);
            tex = CH5Canvas.GetNewTex();
            this.GetFrame().Res().Push("Pad/PadStickCrossRight.tex", tex);
            this.GetFrame().Ren().BuildTexture(tex);
            if (this.FindChilds("PadStickCrossRight").length == 0) {
                let btn = new CUIButtonRGBA();
                btn.SetCamZoomResize(true);
                btn.Init("Pad/PadStickCrossRight.tex");
                btn.SetKey("PadStickCrossRight");
                btn.SetAnchorX(CUI.eAnchor.Min, 30 + 100 * this.mPadScale);
                btn.SetAnchorY(CUI.eAnchor.Min, 30 + 50 * this.mPadScale);
                btn.SetSize(50 * this.mPadScale, 50 * this.mPadScale);
                this.PushChild(btn);
                this.mStick.push(btn);
                btn.GetPt().GetRenderPass()[0].mDepthTest = false;
            }
        }
        else if (_type == eStickType.Circle || _type == eStickType.Circle4 || _type == eStickType.Circle8) {
            if (this.FindChilds("PadStickCircle").length == 0) {
                let btn = new CUIHTML();
                btn.SetCamZoomResize(true);
                btn.Init(`  
    <button class="btn btn-secondary rounded-circle">
      <span class="position-absolute top-0 start-50 translate-middle-x fw-bold">↑</span>
      <span class="position-absolute bottom-0 start-50 translate-middle-x fw-bold">↓</span>
      <span class="position-absolute start-0 top-50 translate-middle-y fw-bold">←</span>
      <span class="position-absolute end-0 top-50 translate-middle-y fw-bold">→</span>
    </button>
                `, new CVec2(100 * this.mPadScale, 100 * this.mPadScale));
                btn.SetKey("PadStickCircle");
                btn.SetHover(true);
                btn.SetAnchorX(CUI.eAnchor.Min, 40);
                btn.SetAnchorY(CUI.eAnchor.Min, 40);
                btn.SetPressTraking(1);
                this.PushChild(btn);
                this.mStick.push(btn);
            }
        }
    }
    Button(_type, _count) {
        if (_count > 9)
            _count = 9;
        if (_type == CPad.eButtonType.Alphabet_Rectangle || _type == CPad.eButtonType.Number_Rectangle) {
            for (let i = 0; i < _count; ++i) {
                let ch5key = "PadButton" + i;
                if (this.FindChilds(ch5key).length == 0) {
                    let btn = new CUIHTML();
                    btn.SetCamZoomResize(true);
                    btn.Init(`
                        <button class="btn btn-outline-danger rounded-circle fw-bold p-0">${i}</button>
                        `, new CVec2(50 * this.mPadScale, 50 * this.mPadScale));
                    btn.SetKey(ch5key);
                    btn.SetAnchorX(CUI.eAnchor.Max, 50);
                    btn.SetAnchorY(CUI.eAnchor.Min, 100 + i * 100 * this.mPadScale);
                    btn.SetHover(true);
                    btn.SetPressTraking(1);
                    this.PushChild(btn);
                    this.mButton.push(btn);
                    this.mButtonInput.push(CEvent.eType.Null);
                }
            }
        }
    }
    Icon() {
        return "bi bi-dpad";
    }
    SetPad(_type) {
        this.mPadType = _type;
    }
    SubjectUpdate(_update) {
        super.SubjectUpdate(_update);
        if (this.mStick.length != 0 || this.mButton.length != 0) {
            this.mDir.Zero();
            if (this.mStickType == CPad.eStickType.Cross) {
                if (this.mStick[0].GetLastEvent() == CEvent.eType.Press)
                    CMath.V3AddV3(this.mDir, CVec3.Up(), this.mDir);
                if (this.mStick[1].GetLastEvent() == CEvent.eType.Press)
                    CMath.V3AddV3(this.mDir, CVec3.Down(), this.mDir);
                if (this.mStick[2].GetLastEvent() == CEvent.eType.Press)
                    CMath.V3AddV3(this.mDir, CVec3.Left(), this.mDir);
                if (this.mStick[3].GetLastEvent() == CEvent.eType.Press)
                    CMath.V3AddV3(this.mDir, CVec3.Right(), this.mDir);
            }
            else if ((this.mStickType == CPad.eStickType.Circle || this.mStickType == CPad.eStickType.Circle4 || this.mStickType == CPad.eStickType.Circle8) &&
                this.mStick[0].GetPressPos() != null) {
                let len = CMath.V3Len(this.mStick[0].GetPressPos());
                if (this.mStick[0].GetLastEvent() == CEvent.eType.Press && len > 16) {
                    this.mDir = CMath.V3Nor(this.mStick[0].GetPressPos());
                    const dir = [new CVec3(1, 0, 0), new CVec3(-1, 0, 0), new CVec3(0, 1, 0), new CVec3(0, -1, 0),
                        new CVec3(1, -1, 0), new CVec3(-1, -1, 0), new CVec3(1, 1, 0), new CVec3(-1, -1, 0)];
                    let matchVal = -1;
                    let matchOff = -1;
                    let count = 0;
                    if (this.mStickType == CPad.eStickType.Circle4)
                        count = 4;
                    else if (this.mStickType == CPad.eStickType.Circle8)
                        count = 8;
                    for (let i = 0; i < count; ++i) {
                        if (CMath.V3Dot(dir[i], this.mDir) > matchVal) {
                            matchVal = CMath.V3Dot(dir[i], this.mDir);
                            matchOff = i;
                        }
                    }
                    if (matchOff != -1)
                        this.mDir = dir[matchOff];
                }
            }
            if (this.mStick.length > 0 && (this.mStick[0].mPressTraking == 1 || this.mStick[0].mPressTraking == 2)) {
                if (this.mRefDot == null) {
                    let d = document.createElement('div');
                    d.style.cssText = 'position:fixed;width:12px;height:12px;border-radius:50%;background:rgba(255,220,0,0.85);border:2px solid white;pointer-events:none;transform:translate(-50%,-50%);display:none;z-index:9999;';
                    document.body.appendChild(d);
                    this.mRefDot = d;
                }
                if (this.mStick[0].mPressTraking == 2) {
                    let offset = this.mStick[0].GetTrackDotOffset();
                    if (offset != null) {
                        let rect = this.GetFrame().Win().Handle().getBoundingClientRect();
                        let pf = this.GetFrame().PF();
                        this.mRefDot.style.left = (offset.x + rect.left) + 'px';
                        this.mRefDot.style.top = (pf.mHeight - offset.y + rect.top) + 'px';
                        this.mRefDot.style.display = 'block';
                    }
                    else
                        this.mRefDot.style.display = 'none';
                }
                else {
                    let stick = this.mStick[0];
                    if (stick.GetLastEvent() == CEvent.eType.Press) {
                        let pt = stick.GetPt();
                        if (typeof pt.GetElement === 'function') {
                            let rect = pt.GetElement().getBoundingClientRect();
                            this.mRefDot.style.left = (rect.left + rect.width / 2) + 'px';
                            this.mRefDot.style.top = (rect.top + rect.height / 2) + 'px';
                            this.mRefDot.style.display = 'block';
                        }
                        else if (pt.mRenPT && pt.mRenPT.length > 0) {
                            let cam = pt.mRenPT[0].mCam;
                            let worldPos = stick.GetPos();
                            let ndc = CMath.V3MulMatCoordi(worldPos, cam.GetViewMat());
                            ndc = CMath.V3MulMatCoordi(ndc, cam.GetProjMat());
                            this.mRefDot.style.left = ((ndc.x + 1) * this.GetFrame().PF().mWidth / 2) + 'px';
                            this.mRefDot.style.top = ((ndc.y + 1) * this.GetFrame().PF().mHeight / 2) + 'px';
                            this.mRefDot.style.display = 'block';
                        }
                        else
                            this.mRefDot.style.display = 'none';
                    }
                    else
                        this.mRefDot.style.display = 'none';
                }
            }
            let up = [], down = [], left = [], right = [];
            let space = [CInput.eKey.Space];
            let lctl = [CInput.eKey.LControl];
            if (this.mKeyType == CPad.eKeyType.Arrow || this.mKeyType == CPad.eKeyType.Both) {
                up.push(CInput.eKey.Up), down.push(CInput.eKey.Down);
                left.push(CInput.eKey.Left), right.push(CInput.eKey.Right);
            }
            if (this.mKeyType == CPad.eKeyType.WASD || this.mKeyType == CPad.eKeyType.Both) {
                up.push(CInput.eKey.W), down.push(CInput.eKey.S);
                left.push(CInput.eKey.A), right.push(CInput.eKey.D);
            }
            if (up.some((key => this.GetFrame().Input().KeyDown(key))))
                CMath.V3AddV3(this.mDir, CVec3.Up(), this.mDir);
            if (down.some((key => this.GetFrame().Input().KeyDown(key))))
                CMath.V3AddV3(this.mDir, CVec3.Down(), this.mDir);
            if (left.some((key => this.GetFrame().Input().KeyDown(key))))
                CMath.V3AddV3(this.mDir, CVec3.Left(), this.mDir);
            if (right.some((key => this.GetFrame().Input().KeyDown(key))))
                CMath.V3AddV3(this.mDir, CVec3.Right(), this.mDir);
            if (this.mButton.length > 0) {
                if (space.some((key => this.GetFrame().Input().KeyDown(key)))) {
                    this.mButtonInput[0] = CEvent.eType.Press;
                }
                else if (space.some((key => this.GetFrame().Input().KeyUp(key)))) {
                    this.mButtonInput[0] = CEvent.eType.Click;
                }
                else
                    this.mButtonInput[0] = CEvent.eType.Null;
                if (lctl.some((key => this.GetFrame().Input().KeyDown(key)))) {
                    this.mButtonInput[1] = CEvent.eType.Press;
                }
                else if (lctl.some((key => this.GetFrame().Input().KeyUp(key)))) {
                    this.mButtonInput[1] = CEvent.eType.Click;
                }
                else
                    this.mButtonInput[1] = CEvent.eType.Null;
            }
            if (this.mDir.IsZero() == false)
                CMath.V3Nor(this.mDir, this.mDir);
            return;
        }
        this.PadReset();
    }
    PadReset() {
        this.SetKey("pad");
        for (let c of this.mChild) {
            c.Destroy();
        }
        this.mStick = new Array();
        this.mButton = new Array();
        if (this.mPadType == CPad.ePadType.NES) {
            this.Stick(CPad.eStickType.Cross, false);
            this.Button(CPad.eButtonType.Alphabet_Rectangle, 2);
        }
        else if (this.mPadType == CPad.ePadType.Basic) {
            this.Stick(CPad.eStickType.Circle4, false);
            this.Button(CPad.eButtonType.Alphabet_Rectangle, 2);
        }
    }
    SetFrame(_fw) {
        super.SetFrame(_fw);
        if (_fw != null) {
            this.PadReset();
        }
    }
    ImportCJSON(_json) {
        super.ImportCJSON(_json);
        for (let ui of this.mChild) {
            if (ui.Key().indexOf("PadButton") != -1)
                this.mButton.push(ui);
            else
                this.mStick.push(ui);
        }
        return this;
    }
    EditChange(_pointer, _child) {
        if (_pointer.member == "mPadType") {
            this.PadReset();
        }
        super.EditChange(_pointer, _child);
    }
}
