import { CHash } from "../basic/CHash.js";
import { CObject } from "../basic/CObject.js";
import { CUtil } from "../basic/CUtil.js";
import { CLoaderOption } from "./CLoader.js";
export class CBase64File extends CObject {
    mExt = "";
    mHash = "";
    mOption = new CLoaderOption;
    mData = null;
    RefreshHash() {
        this.mHash = CHash.SHA256(CUtil.ArrayToString(this.mData));
    }
    FileName() {
        return this.mHash + "." + this.mExt;
    }
    EditForm(_pointer, _div, _input) {
        if (_pointer.member == "mData" && _input != null) {
            _div.removeChild(_input);
        }
    }
    ExportJSON() {
        let result = super.ExportJSON();
        result["mData"] = CUtil.ArrayToBase64(this.mData);
        return result;
    }
    ImportCJSON(_json) {
        let data = CUtil.Base64ToArray(_json.GetStr("mData"));
        let result = super.ImportCJSON(_json);
        if (data)
            result["mData"] = data;
        return result;
    }
}
;
