import { CObject } from "../basic/CObject.js";
import { CString } from "../basic/CString.js";
import { CUtil } from "../basic/CUtil.js";
import { CVec2 } from "../geometry/CVec2.js";
import { CTexture } from "./CTexture.js";
export class CH5CMDList extends CObject {
    mCMD;
    mSize;
    mKey;
    constructor(_name = "", _size = new CVec2(), _cmd = new Array()) {
        super();
        this.mKey = _name;
        this.mSize = _size;
        this.mCMD = _cmd;
    }
    CmdToString() {
        let str = "";
        for (let cmd of this.mCMD) {
            let cmdStr = "CH5Canvas." + cmd.mName;
            cmdStr += cmd.CmdToString();
            cmdStr += ";\n";
            str += cmdStr;
        }
        return str;
    }
}
export class CH5Cmd extends CObject {
    constructor(_name, _para) {
        super();
        this.mName = _name;
        if (_para instanceof Array) {
            for (let i = 0; i < _para.length; i++) {
                if (_para[i] instanceof Array) {
                    _para[i] = JSON.stringify(_para[i]);
                }
            }
        }
        this.mParameter = _para;
    }
    mName = "";
    mParameter = null;
    CmdToString() {
        let str = "(";
        for (let para of this.mParameter) {
            if (typeof (para) == "string" && para.startsWith("[") == false) {
                str += `"${para}",`;
            }
            else {
                str += para + ",";
            }
        }
        if (this.mParameter.length > 0) {
            str = str.substring(0, str.length - 1);
        }
        str += ")";
        return str;
    }
}
export class CH5CanvasInst {
    mCanvas = null;
    mCTX = null;
    mPara = new Array(9);
    mLinear = true;
    mExp = true;
    mCMDStack = new Array();
    constructor() {
        if (CUtil.IsNode() == false) {
            this.mCanvas = document.createElement("canvas");
            this.mCanvas.width = 32;
            this.mCanvas.height = 32;
            this.mCTX = this.mCanvas.getContext('2d', { willReadFrequently: true });
        }
    }
    Cmd(_name, _para) { return new CH5Cmd(_name, _para); }
    AddCmd(_cmdVec) {
        if (_cmdVec instanceof Array) {
            this.mCMDStack.push(..._cmdVec);
        }
        else {
            this.mCMDStack.push(_cmdVec);
        }
        return _cmdVec;
    }
    FillRoundRect(left, top, right, bottom, round = 2 * Math.PI) {
        var cmdVec = [
            this.Cmd("beginPath", []),
            this.Cmd("moveTo", [left + round, top]),
            this.Cmd("arcTo", [left + right, top, left + right, top + bottom, round]),
            this.Cmd("arcTo", [left + right, top + bottom, left, top + bottom, round]),
            this.Cmd("arcTo", [left, top + bottom, left, top, round]),
            this.Cmd("arcTo", [left, top, left + right, top, round]),
            this.Cmd("fill", []),
        ];
        this.mCMDStack.push(...cmdVec);
        return cmdVec;
    }
    StrokeRect(x, y, width, height) {
        var cmdVec = [
            this.Cmd("strokeRect", [x, y, width, height]),
        ];
        this.mCMDStack.push(...cmdVec);
        return cmdVec;
    }
    FillRect(x, y, width, height) {
        var cmdVec = [
            this.Cmd("fillRect", [x, y, width, height]),
        ];
        this.mCMDStack.push(...cmdVec);
        return cmdVec;
    }
    StrokeRoundRect(left, top, right, bottom, round = 2 * Math.PI, line = 2) {
        var cmdVec = [
            this.Cmd("beginPath", []),
            this.Cmd("moveTo", [left + round, top]),
            this.Cmd("arcTo", [left + right, top, left + right, top + bottom, round]),
            this.Cmd("arcTo", [left + right, top + bottom, left, top + bottom, round]),
            this.Cmd("arcTo", [left, top + bottom, left, top, round]),
            this.Cmd("arcTo", [left, top, left + right, top, round]),
            this.Cmd("lineWidth", line),
            this.Cmd("stroke", []),
        ];
        this.mCMDStack.push(...cmdVec);
        return cmdVec;
    }
    StrokeStyle(_style) {
        let cmdVec = [this.Cmd("strokeStyle", _style)];
        this.mCMDStack.push(...cmdVec);
        return cmdVec;
    }
    FillStyle(_style) {
        let cmdVec = [this.Cmd("fillStyle", _style)];
        this.mCMDStack.push(...cmdVec);
        return cmdVec;
    }
    LineWidth(size) {
        let cmdVec = [this.Cmd("lineWidth", size)];
        this.mCMDStack.push(...cmdVec);
        return cmdVec;
    }
    StrokeText(_x, _y, _text, _size, _lineWidth) {
        this.mCTX.font = "bold " + _size + "px arial";
        var xSize = this.mCTX.measureText(_text).width;
        let cmdVec = [this.Cmd("font", "bold " + _size + "px arial"), this.Cmd("lineWidth", _lineWidth),
            this.Cmd("strokeText", [_text, _x - xSize * 0.5, _y + _size * 0.32])];
        this.mCMDStack.push(...cmdVec);
        return cmdVec;
    }
    FillText(_x, _y, _text, _size) {
        this.mCTX.font = "bold " + _size + "px arial";
        var xSize = this.mCTX.measureText(_text).width;
        let cmdVec = [this.Cmd("font", "bold " + _size + "px arial"), this.Cmd("fillText", [_text, _x - xSize * 0.5, _y + _size * 0.32])];
        this.mCMDStack.push(...cmdVec);
        return cmdVec;
        return [];
    }
    FillLinearGradient(stx, sty, edx, edy, color) {
        var cmdList = [];
        var gra = this.mCTX.createLinearGradient(stx, sty, edx, edy);
        for (var each0 of color) {
            gra.addColorStop(each0.per, each0.color);
        }
        let cmdVec = [this.Cmd("fillStyle", gra)];
        this.mCMDStack.push(...cmdVec);
        return cmdVec;
    }
    FillRadialGradient(stx, sty, edx, edy, _stRad, _edRad, color) {
        var cmdList = [];
        var gra = this.mCTX.createRadialGradient(stx, sty, _stRad, edx, edy, _edRad);
        for (var each0 of color) {
            gra.addColorStop(each0.per, each0.color);
        }
        let cmdVec = [this.Cmd("fillStyle", gra)];
        this.mCMDStack.push(...cmdVec);
        return cmdVec;
    }
    FillCircle(_centerX, _centerY, _radius, _startAngle = 0, _endAngle = 2 * Math.PI) {
        var cmdVec = [
            this.Cmd("beginPath", []),
            this.Cmd("arc", [_centerX, _centerY, _radius, _startAngle, _endAngle]),
            this.Cmd("fill", []),
        ];
        this.mCMDStack.push(...cmdVec);
        return cmdVec;
    }
    StrokeCircle(_centerX, _centerY, _radius, _lineLength, _startAngle = 0, _endAngle = 2 * Math.PI) {
        var cmdVec = [
            this.Cmd("beginPath", []),
            this.Cmd("arc", [_centerX, _centerY, _radius, _startAngle, _endAngle]),
            this.Cmd("lineWidth", _lineLength),
            this.Cmd("stroke", []),
        ];
        this.mCMDStack.push(...cmdVec);
        return cmdVec;
    }
    FillTriangle(_x1, _y1, _x2, _y2, _x3, _y3) {
        var cmdVec = [
            this.Cmd("beginPath", []),
            this.Cmd("moveTo", [_x1, _y1]),
            this.Cmd("lineTo", [_x2, _y2]),
            this.Cmd("lineTo", [_x3, _y3]),
            this.Cmd("closePath", []),
            this.Cmd("fill", []),
        ];
        this.mCMDStack.push(...cmdVec);
        return cmdVec;
    }
    StrokeTriangle(_x1, _y1, _x2, _y2, _x3, _y3, _lineWidth = 1) {
        var cmdVec = [
            this.Cmd("beginPath", []),
            this.Cmd("moveTo", [_x1, _y1]),
            this.Cmd("lineTo", [_x2, _y2]),
            this.Cmd("lineTo", [_x3, _y3]),
            this.Cmd("closePath", []),
            this.Cmd("lineWidth", _lineWidth),
            this.Cmd("stroke", []),
        ];
        this.mCMDStack.push(...cmdVec);
        return cmdVec;
    }
    FillArc(_centerX, _centerY, _radius, _startAngle, _endAngle) {
        var cmdVec = [
            this.Cmd("beginPath", []),
            this.Cmd("moveTo", [_centerX, _centerY]),
            this.Cmd("arc", [_centerX, _centerY, _radius, _startAngle, _endAngle]),
            this.Cmd("closePath", []),
            this.Cmd("fill", []),
        ];
        this.mCMDStack.push(...cmdVec);
        return cmdVec;
    }
    StrokeArc(_centerX, _centerY, _radius, _startAngle, _endAngle, _lineWidth = 1) {
        var cmdVec = [
            this.Cmd("beginPath", []),
            this.Cmd("moveTo", [_centerX, _centerY]),
            this.Cmd("arc", [_centerX, _centerY, _radius, _startAngle, _endAngle]),
            this.Cmd("closePath", []),
            this.Cmd("lineWidth", _lineWidth),
            this.Cmd("stroke", []),
        ];
        this.mCMDStack.push(...cmdVec);
        return cmdVec;
    }
    DrawBuf(_buf, _posX, _posY, _width, _height, _codi = null) {
        const cmdVec = [];
        if (!_buf || _buf.length === 0)
            return cmdVec;
        if (_width <= 0 || _height <= 0)
            return cmdVec;
        if (_codi == null) {
            const data = new Uint8ClampedArray(_buf);
            const imgData = new ImageData(data, _width, _height);
            cmdVec.push(this.Cmd("putImageData", [imgData, _posX, _posY]));
            this.mCMDStack.push(...cmdVec);
            return cmdVec;
        }
        let left = _codi.x | 0;
        let top = _codi.y | 0;
        let right = _codi.z | 0;
        let bottom = _codi.w | 0;
        if (right < left) {
            const t = left;
            left = right;
            right = t;
        }
        if (bottom < top) {
            const t = top;
            top = bottom;
            bottom = t;
        }
        left = Math.max(0, Math.min(left, _width));
        right = Math.max(0, Math.min(right, _width));
        top = Math.max(0, Math.min(top, _height));
        bottom = Math.max(0, Math.min(bottom, _height));
        const sw = right - left;
        const sh = bottom - top;
        if (sw <= 0 || sh <= 0)
            return cmdVec;
        const slice = new Uint8ClampedArray(sw * sh * 4);
        for (let y = 0; y < sh; ++y) {
            const srcOffset = ((top + y) * _width + left) * 4;
            const dstOffset = (y * sw) * 4;
            slice.set(_buf.subarray(srcOffset, srcOffset + sw * 4), dstOffset);
        }
        const imgData = new ImageData(slice, sw, sh);
        cmdVec.push(this.Cmd("putImageData", [imgData, _posX, _posY]));
        this.mCMDStack.push(...cmdVec);
        return cmdVec;
    }
    DrawImage(_img, _posX, _posY, _width = 0, _height = 0) {
        var cmdVec = new Array();
        if (_width != 0 && _height != 0)
            cmdVec.push(this.Cmd("drawImage", [_img, _posX, _posY, _width, _height]));
        else
            cmdVec.push(this.Cmd("drawImage", [_img, _posX, _posY]));
        this.mCMDStack.push(...cmdVec);
        return cmdVec;
    }
    Init(w, h, _linear = true, _exp = true) {
        this.mCanvas.width = w;
        this.mCanvas.height = h;
        this.mCTX.clearRect(0, 0, w, h);
        this.mLinear = _linear;
        this.mExp = _exp;
    }
    async Draw(_pVec = null) {
        if (_pVec == null)
            _pVec = this.mCMDStack;
        let pDummy = new Array();
        for (let i = 0; i < _pVec.length; ++i) {
            if (_pVec[i] instanceof CH5Cmd)
                pDummy.push(_pVec[i]);
            else
                pDummy.push(..._pVec[i]);
        }
        _pVec = pDummy;
        let errorcount = 0;
        for (let i = 0; i < _pVec.length; ++i) {
            if (_pVec[i].mParameter instanceof Array) {
                for (var j = 0; j < _pVec[i].mParameter.length; ++j) {
                    this.mPara[j] = _pVec[i].mParameter[j];
                    if (typeof this.mPara[j] === "string" && this.mPara[j].match(/\.(png|jpg|jpeg|gif|webp)/i)) {
                        try {
                            const loadedImage = await new Promise((resolve, reject) => {
                                const img = new Image();
                                img.crossOrigin = "Anonymous";
                                img.onload = () => resolve(img);
                                img.onerror = () => reject(new Error(`Image load failed: ${this.mPara[j]}`));
                                img.src = this.mPara[j];
                            });
                            this.mPara[j] = loadedImage;
                        }
                        catch (e) {
                            console.error(e);
                            errorcount++;
                            continue;
                        }
                    }
                }
                let func = Object.getOwnPropertyNames(Object.getPrototypeOf(this));
                let funcA = null;
                let funcDr = null;
                let ftype = true;
                let fcount = 1;
                if ((typeof this.mCTX[_pVec[i].mName] == 'function') == false) {
                    ftype = false;
                    fcount = func.length;
                }
                for (let j = 0; j < fcount; j++) {
                    if (ftype) {
                        funcA = this.mCTX[_pVec[i].mName].bind(this.mCTX);
                    }
                    else {
                        funcA = this[func[j]];
                        if ((_pVec[i].mName == func[j]) == false)
                            continue;
                    }
                    try {
                        switch (_pVec[i].mParameter.length) {
                            case 0:
                                funcDr = funcA();
                                break;
                            case 1:
                                funcDr = funcA(this.mPara[0]);
                                break;
                            case 2:
                                funcDr = funcA(this.mPara[0], this.mPara[1]);
                                break;
                            case 3:
                                funcDr = funcA(this.mPara[0], this.mPara[1], this.mPara[2]);
                                break;
                            case 4:
                                funcDr = funcA(this.mPara[0], this.mPara[1], this.mPara[2], this.mPara[3]);
                                break;
                            case 5:
                                funcDr = funcA(this.mPara[0], this.mPara[1], this.mPara[2], this.mPara[3], this.mPara[4]);
                                break;
                            case 6:
                                funcDr = funcA(this.mPara[0], this.mPara[1], this.mPara[2], this.mPara[3], this.mPara[4], this.mPara[5]);
                                break;
                            case 7:
                                funcDr = funcA(this.mPara[0], this.mPara[1], this.mPara[2], this.mPara[3], this.mPara[4], this.mPara[5], this.mPara[6]);
                                break;
                            case 8:
                                funcDr = funcA(this.mPara[0], this.mPara[1], this.mPara[2], this.mPara[3], this.mPara[4], this.mPara[5], this.mPara[6], this.mPara[7]);
                                break;
                            case 9:
                                funcDr = funcA(this.mPara[0], this.mPara[1], this.mPara[2], this.mPara[3], this.mPara[4], this.mPara[5], this.mPara[6], this.mPara[7], this.mPara[8]);
                                break;
                        }
                        if (ftype == false && funcDr instanceof Array) {
                            let CH = [];
                            CH.push(...funcDr);
                            let e = await this.Draw(CH);
                            errorcount += e;
                        }
                    }
                    catch {
                        errorcount++;
                    }
                }
            }
            else
                this.mCTX[_pVec[i].mName] = _pVec[i].mParameter;
        }
        this.mCMDStack = new Array();
        return errorcount;
    }
    GetDataURL() {
        return this.mCanvas.toDataURL();
    }
    GetNewTex() {
        var tex = new CTexture();
        tex.SetFilter(this.mLinear ? CTexture.eFilter.Linear : CTexture.eFilter.Neaest);
        tex.SetWrap(CTexture.eWrap.Clamp);
        if (this.mCanvas.width == 0 || this.mCanvas.height == 0)
            return null;
        const imageData = this.mCTX.getImageData(0, 0, this.mCanvas.width, this.mCanvas.height);
        if (this.mExp)
            tex.SetMipMap(CTexture.eMipmap.GL);
        tex.SetSize(this.mCanvas.width, this.mCanvas.height);
        tex.CreateBuf();
        var buf = tex.GetBuf()[0];
        var size = tex.GetWidth() * tex.GetHeight() * 4;
        for (var i = 0; i < size; ++i) {
            buf[i] = imageData.data[i];
        }
        return tex;
    }
    PushImgData(_buf, _posX, _posY, _bufWidth = 0, _bufHeight = 0) {
        if (_bufWidth == 0)
            _bufWidth = this.mCanvas.width;
        if (_bufHeight == 0)
            _bufHeight = this.mCanvas.height;
        const imageData = this.mCTX.getImageData(0, 0, _bufWidth, _bufHeight);
        for (var i = 0; i < _buf.length; ++i) {
            imageData.data[i] = _buf[i];
        }
        this.mCTX.putImageData(imageData, _posX, _posY);
    }
    PushSlicedImgData(_buf, _bufW, _bufX, _bufY, _w, _h) {
        if (_w == 0)
            _w = this.mCanvas.width;
        if (_h == 0)
            _h = this.mCanvas.height;
        const imageData = this.mCTX.getImageData(0, 0, _w, _h);
        for (var y = 0; y < _h; ++y) {
            for (var x = 0; x < _w; x++) {
                for (let i = 0; i < 4; i++) {
                    imageData.data[(x + y * _w) * 4 + i] = _buf[(_bufX + x + (_bufY + y) * _bufW) * 4 + i];
                }
            }
        }
        this.mCTX.putImageData(imageData, 0, 0);
    }
    DrawWithCH5File(_cmdList) {
        let cmdVec = [];
        for (let cmd of _cmdList.mCMD) {
            const params = [...cmd.mParameter];
            for (let i = 0; i < params.length; i++) {
                const param = params[i];
                if (typeof (param) == "string" && param.startsWith("[")) {
                    params[i] = JSON.parse(param);
                }
            }
            let funcCmdVec = this[cmd.mName](...params);
            if (funcCmdVec == null) {
                continue;
            }
            else if (funcCmdVec instanceof Array) {
                cmdVec.push(...funcCmdVec);
            }
            else {
                cmdVec.push(funcCmdVec);
            }
        }
        this.Draw(cmdVec);
    }
    DrawWithString(_str) {
        let funcArr = new Array();
        let nowPos = -1;
        while (true) {
            nowPos = _str.indexOf('CH5Canvas.', nowPos + 1);
            if (nowPos == -1)
                break;
            nowPos += 10;
            let funcNameEndPos = _str.indexOf('(', nowPos);
            let funcName = _str.slice(nowPos, funcNameEndPos);
            if (this[funcName]) {
                funcNameEndPos = _str.indexOf(')', nowPos) + 1;
                funcArr.push(_str.slice(nowPos, funcNameEndPos));
            }
        }
        let analyzedFuncArr = new Array();
        for (let i = 0; i < funcArr.length; i++) {
            analyzedFuncArr.push(CString.FunctionAnalyze(funcArr[i]));
        }
        let CountParamCount = (_func) => {
            const openParamIndex = _func.indexOf('(');
            const closeParamIndex = _func.indexOf(')');
            if (openParamIndex != -1 && closeParamIndex != -1) {
                const paramStr = _func.slice(openParamIndex + 1, closeParamIndex);
                const param = paramStr.split(',');
                let nonDefaultParamCount = 0;
                let defaultParamsCount = 0;
                for (let p of param) {
                    if (p.indexOf('=') != -1) {
                        defaultParamsCount++;
                    }
                    else {
                        nonDefaultParamCount++;
                    }
                }
                return [nonDefaultParamCount, defaultParamsCount];
            }
            return [0, 0];
        };
        for (let analyzedFunc of analyzedFuncArr) {
            let params = analyzedFunc.parameter;
            let [nonDefaultParamCount, defaultParamCount] = CountParamCount(this[analyzedFunc.function].toString());
            if (params.length < nonDefaultParamCount) {
                console.error(analyzedFunc.function + "의 파라미터 수가 " + (nonDefaultParamCount - params.length) + "개 모자랍니다.");
                return;
            }
            if (params.length > nonDefaultParamCount + defaultParamCount) {
                console.error(analyzedFunc.function + "의 파라미터 수가 " + (params.length - nonDefaultParamCount - defaultParamCount) + "개 많습니다.");
                return;
            }
        }
        for (let analyzedFunc of analyzedFuncArr) {
            for (let i = 0; i < analyzedFunc.parameter.length; i++) {
                let param = analyzedFunc.parameter[i];
                if (typeof (param) == 'string') {
                    try {
                        let evaledParam = eval(param);
                        if (evaledParam == "object") {
                            analyzedFunc.parameter[i] = evaledParam;
                        }
                        else {
                            analyzedFunc.parameter[i] = evaledParam;
                        }
                    }
                    catch {
                    }
                }
            }
        }
        let cmdVec = [];
        for (let analyzedFunc of analyzedFuncArr) {
            let params = [];
            for (let param of analyzedFunc.parameter) {
                params.push(param);
            }
            let funcCmdVec = this[analyzedFunc.function](...params);
            if (funcCmdVec == null) {
                continue;
            }
            else if (funcCmdVec instanceof Array) {
                cmdVec.push(...funcCmdVec);
            }
            else {
                cmdVec.push(funcCmdVec);
            }
        }
        this.Draw(cmdVec);
    }
    StringToCmdList(_str) {
        let size = new CVec2(256, 128);
        let arr = [];
        let funcArr = new Array();
        let nowPos = -1;
        while (true) {
            nowPos = _str.indexOf('CH5Canvas.', nowPos + 1);
            if (nowPos == -1)
                break;
            nowPos += 10;
            let funcNameEndPos = _str.indexOf('(', nowPos);
            let funcName = _str.slice(nowPos, funcNameEndPos);
            if (this[funcName]) {
                funcNameEndPos = _str.indexOf(')', nowPos) + 1;
                funcArr.push(_str.slice(nowPos, funcNameEndPos));
            }
        }
        let analyzedFuncArr = new Array();
        for (let i = 0; i < funcArr.length; i++) {
            analyzedFuncArr.push(CString.FunctionAnalyze(funcArr[i]));
        }
        let CountParamCount = (_func) => {
            const openParamIndex = _func.indexOf('(');
            const closeParamIndex = _func.indexOf(')');
            if (openParamIndex != -1 && closeParamIndex != -1) {
                const paramStr = _func.slice(openParamIndex + 1, closeParamIndex);
                const param = paramStr.split(',');
                let nonDefaultParamCount = 0;
                let defaultParamsCount = 0;
                for (let p of param) {
                    if (p.indexOf('=') != -1) {
                        defaultParamsCount++;
                    }
                    else {
                        nonDefaultParamCount++;
                    }
                }
                return [nonDefaultParamCount, defaultParamsCount];
            }
            return [0, 0];
        };
        for (let analyzedFunc of analyzedFuncArr) {
            let params = analyzedFunc.parameter;
            let [nonDefaultParamCount, defaultParamCount] = CountParamCount(this[analyzedFunc.function].toString());
            if (params.length < nonDefaultParamCount) {
                console.error(analyzedFunc.function + "의 파라미터 수가 " + (nonDefaultParamCount - params.length) + "개 모자랍니다.");
                while (params.length != nonDefaultParamCount) {
                    params.push(0);
                }
            }
            if (params.length > nonDefaultParamCount + defaultParamCount) {
                console.error(analyzedFunc.function + "의 파라미터 수가 " + (params.length - nonDefaultParamCount - defaultParamCount) + "개 많습니다.");
                while (params.length != nonDefaultParamCount) {
                    params.splice(params.length - 1, 1);
                }
            }
        }
        for (let analyzedFunc of analyzedFuncArr) {
            for (let i = 0; i < analyzedFunc.parameter.length; i++) {
                let param = analyzedFunc.parameter[i];
                if (typeof (param) == 'string') {
                    try {
                        let evaledParam = eval(param);
                        if (evaledParam == "object") {
                            analyzedFunc.parameter[i] = evaledParam;
                        }
                        else {
                            analyzedFunc.parameter[i] = evaledParam;
                        }
                    }
                    catch {
                    }
                }
            }
        }
        for (let analyzedFunc of analyzedFuncArr) {
            arr.push(new CH5Cmd(analyzedFunc.function, analyzedFunc.parameter));
        }
        return new CH5CMDList("", size, arr);
    }
    GetContext() { return this.mCTX; }
    GetCanvas() { return this.mCanvas; }
}
export const CH5Canvas = new CH5CanvasInst();
