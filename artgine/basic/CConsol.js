import { CQueue } from "./CQueue.js";
import { CUtil } from "./CUtil.js";
var gLogEvent = null;
var gConsolLog = new CQueue();
export class CConsol {
    static eColor = {
        red: "red",
        green: "green",
        yellow: "yellow",
        blue: "blue",
        magenta: "magenta",
        cyan: "cyan",
        white: "white",
        gray: "gray",
    };
    static SetLogEvent(_event) {
        gLogEvent = _event;
    }
    static GetLogQue() {
        return gConsolLog;
    }
    static Log(_text, _color = null) {
        if (_text instanceof Array || _text instanceof Set) {
            let text = "";
            for (let data of _text) {
                if (typeof data == "object")
                    text += JSON.stringify(data);
                else
                    text += data;
            }
            _text = text;
        }
        else if (typeof _text == "object")
            _text = JSON.stringify(_text);
        if (CUtil.IsNode()) {
            if (_color == null) {
                console.log("\x1b[37m" + _text + "\x1b[0m");
            }
            else {
                const colorCode = CConsol.NodeColor(_color);
                console.log(colorCode + _text + "\x1b[0m");
            }
        }
        else {
            const cssColor = CConsol.WebColor(_color);
            const bgColor = cssColor == "yellow" ? 'background-color: #222;' : '';
            if (_color)
                console.log(`%c${_text}`, `color: ${cssColor};${bgColor}`);
            else
                console.log(_text);
        }
        if (gLogEvent != null && gLogEvent(_text, _color) == false) {
        }
        else {
            gConsolLog.Enqueue(_text);
            if (gConsolLog.Size() > 30)
                gConsolLog.Dequeue();
        }
    }
    static NodeColor(_color = '') {
        switch (_color?.toLowerCase()) {
            case "red": return "\x1b[31m";
            case "green": return "\x1b[32m";
            case "yellow": return "\x1b[33m";
            case "blue": return "\x1b[34m";
            case "magenta": return "\x1b[35m";
            case "cyan": return "\x1b[36m";
            case "white": return "\x1b[37m";
            case "gray": return "\x1b[90m";
            default: return "";
        }
    }
    static WebColor(_color = '') {
        if (!(_color && typeof _color === 'string'))
            return "";
        if (_color.startsWith('#'))
            return _color;
        if (/^[0-9a-fA-F]{6,8}$/.test(_color)) {
            if (_color.length === 8)
                _color = _color.substring(2);
            return `#${_color}`;
        }
        return _color;
    }
}
