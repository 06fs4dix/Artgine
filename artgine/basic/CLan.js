import { CJSON } from "./CJSON.js";
var g_langugeMap = {};
var g_country = "";
export class CLan {
    static Set(_country, _sub = null, _text = null) {
        if (typeof _country == "object") {
            if (_country instanceof CJSON)
                _country = _country.GetDocument();
            for (var countryEach in _country) {
                for (var subEach in _country[countryEach])
                    CLan.Set(countryEach, subEach, _country[countryEach][subEach]);
            }
        }
        else {
            if (g_langugeMap[_country] == null)
                g_langugeMap[_country] = {};
            g_langugeMap[_country][_sub] = _text;
        }
    }
    static T(_sub, _defaultText = "") {
        if (g_langugeMap[g_country] == null) {
            g_langugeMap[g_country] = {};
        }
        if (g_langugeMap[g_country][_sub] == null) {
            g_langugeMap[g_country][_sub] = _defaultText;
        }
        return _sub;
    }
    static Get(_text) {
        if (g_langugeMap[g_country] == null)
            g_langugeMap[g_country] = {};
        if (g_langugeMap[g_country][_text] == null)
            g_langugeMap[g_country][_text] = _text;
        return g_langugeMap[g_country][_text];
    }
}
