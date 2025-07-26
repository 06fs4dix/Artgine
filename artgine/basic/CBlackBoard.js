var gBBMap = new Map();
export class CBlackBoard {
    static Get(_key) {
        return gBBMap.get(_key);
    }
    static Set(_key, _val) {
        if (_val["mProxy"] != null)
            console.log("CBlackBoard m_proxy!!!!error");
        if (gBBMap.get(_key) != null)
            console.log("CBlackBoard dup!!!!error : " + _key);
        gBBMap.set(_key, _val);
    }
    static Map() {
        return gBBMap;
    }
    static Delete(_key) {
        gBBMap.delete(_key);
    }
}
