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
        this.ResetAni(_ani);
    }
    Icon() { return "bi bi-recycle"; }
    SetInter(_max) {
        this.mInterMax = _max;
        this.mInterTime = 0;
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
    ResetAni(_ani = null, _key = null) {
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
            this.mAni = _ani;
        }
        this.ResetTime();
        this.mFClip = new Array();
    }
    SetSpeed(_speed) { this.mSpeed = _speed; }
    Update(_delay) {
    }
    IsShould(_member, _type) {
        if (_member == "m_ani" && this.mBlackBoard != null)
            return false;
        return super.IsShould(_member, _type);
    }
    EditForm(_pointer, _div, _input) {
        super.EditForm(_pointer, _div, _input);
        if (_pointer.member == "m_ani") {
            let btn = document.createElement("button");
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
            var button = document.createElement("button");
            button.innerText = "AniCreate";
            button.onclick = () => {
                this.mAni = new CAnimation();
                this.EditRefresh();
            };
            _div.append(button);
        }
    }
}
import CAniFlow_imple from "../../canvas_imple/component/CAniFlow.js";
CAniFlow_imple();
