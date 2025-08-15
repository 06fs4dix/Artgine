import { CEvent } from "../../basic/CEvent.js";
import { CMath } from "../../geometry/CMath.js";
import { CVec3 } from "../../geometry/CVec3.js";
import { CH5Canvas } from "../../render/CH5Canvas.js";
import { CInput } from "../../system/CInput.js";
import { CSubject } from "./CSubject.js";
import { CUI, CUIButtonRGBA } from "./CUI.js";
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
    mDir = new CVec3();
    mPadType = CPad.ePadType.Basic;
    mStickType = null;
    mPressOnStick = true;
    mPadScale = 1;
    mKeyType = CPad.eKeyType.Arrow;
    constructor() {
        super();
        this.SetKey("pad");
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
    SetPMat(_mat) {
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
            this.GetFrame().Res().Push("PadStickCrossUP.tex", tex);
            this.GetFrame().Ren().BuildTexture(tex);
            if (this.FindChilds("PadStickCrossUP").length == 0) {
                let btn = new CUIButtonRGBA();
                btn.SetCamResize(true);
                btn.Init("PadStickCrossUP.tex");
                btn.SetKey("PadStickCrossUP");
                btn.SetAnchorX(CUI.eAnchor.Min, 30 + 50 * this.mPadScale);
                btn.SetAnchorY(CUI.eAnchor.Min, 30 + 100 * this.mPadScale);
                btn.SetSize(50 * this.mPadScale, 50 * this.mPadScale);
                this.PushChilde(btn);
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
            this.GetFrame().Res().Push("PadStickCrossDown.tex", tex);
            this.GetFrame().Ren().BuildTexture(tex);
            if (this.FindChilds("PadStickCrossDown").length == 0) {
                let btn = new CUIButtonRGBA();
                btn.SetCamResize(true);
                btn.Init("PadStickCrossDown.tex");
                btn.SetKey("PadStickCrossDown");
                btn.SetAnchorX(CUI.eAnchor.Min, 30 + 50 * this.mPadScale);
                btn.SetAnchorY(CUI.eAnchor.Min, 30 + this.mPadScale);
                btn.SetSize(50 * this.mPadScale, 50 * this.mPadScale);
                this.PushChilde(btn);
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
            this.GetFrame().Res().Push("PadStickCrossLeft.tex", tex);
            this.GetFrame().Ren().BuildTexture(tex);
            if (this.FindChilds("PadStickCrossLeft").length == 0) {
                let btn = new CUIButtonRGBA();
                btn.SetCamResize(true);
                btn.Init("PadStickCrossLeft.tex");
                btn.SetKey("PadStickCrossLeft");
                btn.SetAnchorX(CUI.eAnchor.Min, 30);
                btn.SetAnchorY(CUI.eAnchor.Min, 30 + 50 * this.mPadScale);
                btn.SetSize(50 * this.mPadScale, 50 * this.mPadScale);
                this.PushChilde(btn);
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
            this.GetFrame().Res().Push("PadStickCrossRight.tex", tex);
            this.GetFrame().Ren().BuildTexture(tex);
            if (this.FindChilds("PadStickCrossRight").length == 0) {
                let btn = new CUIButtonRGBA();
                btn.SetCamResize(true);
                btn.Init("PadStickCrossRight.tex");
                btn.SetKey("PadStickCrossRight");
                btn.SetAnchorX(CUI.eAnchor.Min, 30 + 100 * this.mPadScale);
                btn.SetAnchorY(CUI.eAnchor.Min, 30 + 50 * this.mPadScale);
                btn.SetSize(50 * this.mPadScale, 50 * this.mPadScale);
                this.PushChilde(btn);
                this.mStick.push(btn);
                btn.GetPt().GetRenderPass()[0].mDepthTest = false;
            }
        }
        else if (_type == eStickType.Circle || _type == eStickType.Circle4 || _type == eStickType.Circle8) {
            CH5Canvas.Init(128, 128, true, false);
            let cmdList = [
                CH5Canvas.FillLinearGradient(4, 4, 4, 128 - 8, [{ per: 0, color: "gray" }, { per: 1, color: "red" }]),
                CH5Canvas.FillCircle(64, 64, 60),
                CH5Canvas.StrokeCircle(64, 64, 60, 4),
                CH5Canvas.FillStyle("black"),
                CH5Canvas.FillText(20, 62, "◁", 32),
                CH5Canvas.FillText(108, 62, "▷", 32),
                CH5Canvas.FillText(66, 22, "△", 32),
                CH5Canvas.FillText(66, 108, "▽", 32),
            ];
            CH5Canvas.Draw(cmdList);
            let tex = CH5Canvas.GetNewTex();
            this.GetFrame().Res().Push("PadStickCircle.tex", tex);
            this.GetFrame().Ren().BuildTexture(tex);
            if (this.FindChilds("PadStickCircle").length == 0) {
                let btn = new CUIButtonRGBA();
                btn.SetCamResize(true);
                btn.Init("PadStickCircle.tex");
                btn.SetKey("PadStickCircle");
                {
                    btn.SetAnchorX(CUI.eAnchor.Min, 40);
                    btn.SetAnchorY(CUI.eAnchor.Min, 40);
                }
                btn.SetSize(100 * this.mPadScale, 100 * this.mPadScale);
                btn.SetPressTraking(true);
                this.PushChilde(btn);
                this.mStick.push(btn);
                btn.GetPt().GetRenderPass()[0].mDepthTest = false;
            }
        }
    }
    Button(_type, _count) {
        if (_count > 9)
            _count = 9;
        if (_type == CPad.eButtonType.Alphabet_Rectangle || _type == CPad.eButtonType.Number_Rectangle) {
            for (let i = 0; i < _count; ++i) {
                CH5Canvas.Init(50, 50, true, false);
                let cmdList = [
                    CH5Canvas.FillStyle('#5A86FF'),
                    CH5Canvas.FillRect(0, 0, 50, 50),
                    CH5Canvas.LineWidth(5),
                    CH5Canvas.StrokeRect(0, 0, 50, 50),
                    CH5Canvas.FillStyle('black'),
                ];
                if (_type == CPad.eButtonType.Alphabet_Rectangle)
                    cmdList.push(CH5Canvas.FillText(25, 25, String.fromCharCode(65 + i), 32));
                else
                    cmdList.push(CH5Canvas.FillText(25, 25, String.fromCharCode(49 + i), 32));
                let ch5key = "PadButton" + i;
                CH5Canvas.Draw(cmdList);
                let tex = CH5Canvas.GetNewTex();
                this.GetFrame().Res().Push(ch5key + ".tex", tex);
                this.GetFrame().Ren().BuildTexture(tex);
                if (this.FindChilds(ch5key).length == 0) {
                    let btn = new CUIButtonRGBA();
                    btn.SetCamResize(true);
                    btn.Init(ch5key + ".tex");
                    btn.SetKey(ch5key);
                    btn.SetAnchorX(CUI.eAnchor.Max, 20);
                    btn.SetAnchorY(CUI.eAnchor.Min, 40 + i * 60 * this.mPadScale);
                    btn.SetSize(50 * this.mPadScale, 50 * this.mPadScale);
                    this.PushChilde(btn);
                    this.mButton.push(btn);
                    btn.GetPt().GetRenderPass()[0].mDepthTest = false;
                }
            }
        }
    }
    SetPad(_type) {
        this.mPadType = _type;
    }
    SubjectUpdate(_delay) {
        super.SubjectUpdate(_delay);
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
        for (let c of this.mChilde) {
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
        for (let ui of this.mChilde) {
            if (ui.Key().indexOf("PadButton") != -1)
                this.mButton.push(ui);
            else
                this.mStick.push(ui);
        }
        return this;
    }
    EditChange(_pointer, _childe) {
        if (_pointer.member == "mPadType") {
            this.PadReset();
        }
        super.EditChange(_pointer, _childe);
    }
}
