import { CEvent } from "../basic/CEvent.js";
export class CPluging {
    static sEventVec = new Array();
    static sPathMap = new Map();
    static PushEvent(_type, _event) {
        CPluging.sEventVec.push(CEvent.ToCEvent(_event, _type));
    }
    static FindPath(_plugin) {
        return CPluging.sPathMap.get(_plugin);
    }
    static PushPath(_plugin, _path) {
        return CPluging.sPathMap.set(_plugin, _path);
    }
}
