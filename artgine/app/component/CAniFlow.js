import { CComponent } from "../component/CComponent.js";
import { CAnimation } from "../component/CAnimation.js";
import { CBlackBoardRef } from "../../basic/CObject.js";
export class CAniFlow extends CComponent {
    mFClip = new Array();
    mTime = 0;
    mOffset = 0;
    mSpeed = 1;
    mPlay = true;
    mBlackBoard = null;
    mAni = null;
    mPaintOff;
    mInterMax = 0;
    mInterTime = 0;
    mLoopCount = 0;
    constructor(_ani = null) {
        super();
        this.mSysc = CComponent.eSysn.AniFlow;
        this.mPaintOff = 0;
        this.SetAni(_ani);
    }
    Icon() { return "bi bi-recycle"; }
    SetInter(_max) {
        this.mInterMax = _max;
        this.mInterTime = 0;
    }
    GetAni() {
        return this.mAni;
    }
    IsEnd() {
        return this.mFClip.length == 0 && this.mOffset >= this.mAni.mClip.length;
    }
    ResetTime() {
        this.mPlay = true;
        this.mTime = 0;
        this.mOffset = 0;
        this.mLoopCount = 0;
        this.mFClip = [];
    }
    Recycle() {
        super.Recycle();
        this.ResetTime();
    }
    Provider(_type, _state) {
        if (this.mAni != null)
            _state.push("/aniFlow/" + this.mAni.Key() + (this.IsEnd() ? "Stop" : "Play"));
    }
    SetAni(_ani = null, _key = null) {
        if (_key != null) {
            if (_key != this.IsKey() || this.Key() != _key)
                return;
        }
        if (typeof _ani == "string") {
            this.mBlackBoard = _ani;
            this.mAni = null;
        }
        else if (_ani instanceof CBlackBoardRef) {
            this.mBlackBoard = _ani.mKey;
            this.mAni = null;
        }
        else if (_ani != null) {
            if (this.mAni == _ani)
                return;
            this.mAni = _ani;
        }
        this.ResetTime();
    }
    SetSpeed(_speed) { this.mSpeed = _speed; }
    Update(_update) {
    }
    IsShould(_member, _type) {
        if (_member == "m_ani" && this.mBlackBoard != null)
            return false;
        return super.IsShould(_member, _type);
    }
    EditForm(_pointer, _div, _input) {
        super.EditForm(_pointer, _div, _input);
        if (_pointer.member == "mAni") {
            let btn = CDOM.TagToDom("button");
            btn.innerText = "생성";
            btn.onclick = () => {
                this.mAni = new CAnimation();
                this.mBlackBoard = null;
                this.EditRefresh();
            };
            _div.append(btn);
        }
    }
    EditHTMLInit(_div) {
        super.EditHTMLInit(_div);
        if (this.mAni == null) {
            var button = CDOM.TagToDom("button");
            button.innerText = "AniCreate";
            button.onclick = () => {
                this.mAni = new CAnimation();
                this.EditRefresh();
            };
            _div.append(button);
        }
    }
}
import CAniFlow_imple from "../../app_imple/component/CAniFlow.js";
import { CDOM } from "../../basic/CDOM.js";
CAniFlow_imple();
