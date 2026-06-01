export class CFecth {
    static Exe(_url, _data, _returnType = "text", _multi = false) {
        if (_url[0] == "/")
            _url = _url.substring(1, _url.length - 1);
        return new Promise(function (resolve, reject) { });
    }
    static GetOSMData(_query, _bbox = "") {
        return new Promise(function (resolve, reject) { });
    }
    static GetNaturalEarthData(_category, _scale = "110m") {
        return new Promise(function (resolve, reject) { });
    }
    static GetGADMData(_countryCode, _level = 0) {
        return new Promise(function (resolve, reject) { });
    }
}
import CFecth_imple from "../network_imple/CFecth.js";
CFecth_imple();
