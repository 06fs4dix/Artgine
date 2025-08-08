import { CJSON } from "./CJSON.js";
import { CHash } from "./CHash.js";
import { CUtil } from "./CUtil.js";
var gLangugeMap = {};
var gLanCode = (() => {
    if (CUtil.IsNode()) {
        return process.env.LANG?.split('_')[0]?.toLowerCase() ||
            process.env.LC_ALL?.split('_')[0]?.toLowerCase() ||
            'en';
    }
    if (CUtil.IsWeb()) {
        const language = navigator.language || navigator.languages?.[0] || 'en';
        return language.split('-')[0].toLowerCase();
    }
    return 'en';
})();
export class CLan {
    static eType = {
        "ko": "ko",
        "en": "en",
        "ja": "ja",
        "zh": "zh",
        "es": "es",
        "fr": "fr",
        "de": "de",
        "it": "it",
        "pt": "pt",
        "ru": "ru"
    };
    static Set(_country, _sub = null, _text = null) {
        if (_country != null && typeof _country == "object") {
            if (_country instanceof CJSON)
                _country = _country.GetDocument();
            for (var countryEach in _country) {
                for (var subEach in _country[countryEach])
                    CLan.Set(countryEach, subEach, _country[countryEach][subEach]);
            }
        }
        else {
            if (_country == null || _country == "")
                _country = gLanCode;
            if (typeof _sub == "number")
                _sub = _sub + "";
            if (gLangugeMap[_country] == null)
                gLangugeMap[_country] = {};
            gLangugeMap[_country][_sub] = _text;
        }
        return _sub;
    }
    static Get(_sub, _defaultText = null) {
        if (gLangugeMap[gLanCode] == null) {
            gLangugeMap[gLanCode] = {};
        }
        if (_sub == null || _sub == "")
            _sub = CHash.HashCode(_defaultText) + "";
        if (gLangugeMap[gLanCode][_sub] == null)
            gLangugeMap[gLanCode][_sub] = _defaultText;
        return gLangugeMap[gLanCode][_sub];
    }
    static Map() {
        return gLangugeMap;
    }
    static SetCode(_code) {
        if (_code == null)
            return;
        gLanCode = _code;
    }
    static GetCode() {
        return gLanCode;
    }
}
