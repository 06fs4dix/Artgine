import { CEvent } from "../basic/CEvent.js";
export class CPlugin {
    static sEventVec = new Array();
    static sPathMap = new Map();
    static PushEvent(_type, _event) {
        CPlugin.sEventVec.push(CEvent.ToCEvent(_event, _type));
    }
    static FindPath(_plugin) {
        return CPlugin.sPathMap.get(_plugin);
    }
    static PushPath(_plugin, _path) {
        return CPlugin.sPathMap.set(_plugin, _path);
    }
}
