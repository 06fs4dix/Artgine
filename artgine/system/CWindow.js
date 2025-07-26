import { CInput } from "./CInput.js";
import { CMouse } from "../system/CMouse.js";
import { CUtil } from "../basic/CUtil.js";
var g_updateHash = 0;
export class CWindow {
    static eFocus = {
        Freeze: 'Freeze',
        Resume: 'Resume',
        Canvas: 'Canvas',
        Other: 'Other',
    };
    mHandle = null;
    mInput;
    mPF = null;
    mResize = false;
    mBW = 0;
    mBH = 0;
    mBY = 0;
    Handle() { return this.mHandle; }
    constructor(_pf, _htmlObj, _input) {
        if (_pf == null)
            return;
        this.mInput = _input;
        this.mHandle = _htmlObj;
        this.mPF = _pf;
        this.WindowResize();
        this.mHandle.tabIndex = 0;
        this.mHandle.addEventListener("keydown", (key) => {
            this.mInput.mKeyPress[key.keyCode] = true;
        });
        this.mHandle.addEventListener("keyup", (key) => {
            this.mInput.mKeyPress[key.keyCode] = false;
        });
        this.mHandle.addEventListener("blur", (key) => {
            this.mInput.mKeyPress.fill(false);
        });
        this.mHandle.addEventListener("mousemove", (e) => {
            if (CUtil.IsMobile())
                return;
            if (this.mInput.mMouseArr.length == 0)
                this.mInput.mMouseArr.push(new CMouse());
            this.mInput.mMouseArr[0].x = e.offsetX;
            this.mInput.mMouseArr[0].y = this.mPF.mHeight - e.offsetY;
            this.mInput.mMouseArr[0].key = this.mInput.mMouseOff;
            this.mInput.mMouseArr[0].press = this.mInput.mKeyPress[CInput.eKey.LButton];
        });
        this.mHandle.addEventListener("mousedown", (e) => {
            if (CUtil.IsMobile())
                return;
            switch (e.button) {
                case 0:
                    this.mInput.mKeyPress[CInput.eKey.LButton] = true;
                    break;
                case 1:
                    this.mInput.mKeyPress[CInput.eKey.MiddleButton] = true;
                    break;
                case 2:
                    this.mInput.mKeyPress[CInput.eKey.RButton] = true;
                    break;
                case 3:
            }
            if (this.mInput.mMouseArr.length == 0)
                this.mInput.mMouseArr.push(new CMouse());
            this.mInput.mMouseArr[0].x = e.offsetX;
            this.mInput.mMouseArr[0].y = this.mPF.mHeight - e.offsetY;
            this.mInput.mMouseArr[0].key = this.mInput.mMouseOff;
            if (e.button == 0)
                this.mInput.mMouseArr[0].press = true;
        });
        this.mHandle.addEventListener("mouseup", (e) => {
            if (CUtil.IsMobile())
                return;
            switch (e.button) {
                case 0:
                    this.mInput.mKeyPress[CInput.eKey.LButton] = false;
                    break;
                case 1:
                    this.mInput.mKeyPress[CInput.eKey.MiddleButton] = false;
                    break;
                case 2:
                    this.mInput.mKeyPress[CInput.eKey.RButton] = false;
                    break;
                case 3:
            }
            this.mInput.mMouseArr[0].x = e.offsetX;
            this.mInput.mMouseArr[0].y = this.mPF.mHeight - e.offsetY;
            this.mInput.mMouseArr[0].key = this.mInput.mMouseOff;
            if (e.button == 0)
                this.mInput.mMouseArr[0].press = false;
            this.mInput.mMouseOff++;
        });
        var OutXChk = (x) => {
            var out = true;
            if (0 > x) {
                x = 0;
            }
            if (x > this.mPF.mWidth) {
                x = this.mPF.mWidth;
            }
            return x;
        };
        var OutYChk = (y) => {
            var out = true;
            if (0 > y) {
                y = 0;
            }
            if (y > this.mPF.mHeight) {
                y = this.mPF.mHeight;
            }
            return y;
        };
        this.mHandle.addEventListener("touchstart", (event) => {
            var touches = event.changedTouches;
            for (var i = 0; i < touches.length; ++i) {
                const target = touches[i].target;
                const offsetX = Math.trunc(touches[i].pageX - target.offsetLeft);
                const offsetY = Math.trunc(this.mPF.mHeight - (touches[i].pageY - target.offsetTop));
                this.mInput.TouchRefrash(OutXChk(offsetX), OutYChk(offsetY), true);
            }
        });
        this.mHandle.addEventListener("touchmove", (event) => {
            event.preventDefault();
            event.stopPropagation();
            var touches = event.changedTouches;
            for (var i = 0; i < touches.length; ++i) {
                const target = touches[i].target;
                const offsetX = Math.trunc(touches[i].pageX - target.offsetLeft);
                const offsetY = Math.trunc(this.mPF.mHeight - (touches[i].pageY - target.offsetTop));
                this.mInput.TouchRefrash(OutXChk(offsetX), OutYChk(offsetY), true);
            }
        });
        this.mHandle.addEventListener("touchend", (event) => {
            event.preventDefault();
            event.stopPropagation();
            var touches = event.changedTouches;
            for (var i = 0; i < touches.length; ++i) {
                const target = touches[i].target;
                const offsetX = Math.trunc(touches[i].pageX - target.offsetLeft);
                const offsetY = Math.trunc(this.mPF.mHeight - (touches[i].pageY - target.offsetTop));
                this.mInput.TouchRefrash(OutXChk(offsetX), OutYChk(offsetY), false);
            }
        });
        this.mHandle.addEventListener('wheel', (e) => {
            var agent = navigator.userAgent.toLowerCase();
            if (agent.indexOf("chrome") != -1)
                this.mInput.SetWheel(e.deltaY * 0.1);
            else
                this.mInput.SetWheel(e.deltaY);
        });
    }
    Update(_delay) {
    }
    WindowResize() {
    }
    IsResize() {
        return this.mResize;
    }
    static IsVR() {
        var filter = "linux aarch64";
        if (navigator.platform) {
            if (0 > filter.indexOf(navigator.platform.toLowerCase())) {
                return false;
            }
        }
        return true;
    }
    static UpdateHash() {
        return g_updateHash;
    }
    static SetUpdateHash(_hash) {
        g_updateHash = _hash;
    }
    static ScreenFull(_full = null) {
        if (window["screenfull"] != null) {
            if (window["screenfull"].isEnabled) {
                window["screenfull"].on('error', event => {
                    console.error('Failed to enable fullscreen', event);
                });
                if (_full == null)
                    window["screenfull"].toggle();
                else if (_full == true && window["screenfull"].isFullscreen == false)
                    window["screenfull"].toggle();
                else if (_full == false && window["screenfull"].isFullscreen == true)
                    window["screenfull"].toggle();
            }
        }
    }
}
import CWindow_imple from "../system_imple/CWindow.js";
CWindow_imple();
