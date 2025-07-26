import {CHash} from "../basic/CHash.js";
import {CUtil} from "./CUtil.js";


let g_uniId = 0;

// 전역 guid
let guid = '';

if (CUtil.IsNode()==false) {
    guid=Date.now().toString(36);
} 
else 
{
    guid=Date.now().toString(36);
}


export class CUniqueID {
  static Get(): string {
    g_uniId++;
    return guid + '_' + g_uniId;
  }

  static GetHash(_sub = 16): string {
    return CHash.SHA256(CUniqueID.Get()).substr(0, _sub);
  }
}