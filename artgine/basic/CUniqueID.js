import { CHash } from "../basic/CHash.js";
import { CUtil } from "./CUtil.js";
let g_uniId = 0;
let guid = '';
if (CUtil.IsNode() == false) {
    guid = Date.now().toString(36);
}
else {
    guid = Date.now().toString(36);
}
export class CUniqueID {
    static Get() {
        g_uniId++;
        return guid + '_' + g_uniId;
    }
    static GetHash(_sub = 16) {
        return CHash.SHA256(CUniqueID.Get()).substr(0, _sub);
    }
}
