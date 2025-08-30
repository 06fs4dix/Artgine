import {CHash} from "../basic/CHash.js";
import {CJSON} from "../basic/CJSON.js";
import {CObject,  CPointer } from "../basic/CObject.js";
import {CUtil} from "../basic/CUtil.js";
import { CLoaderOption } from "./CLoader.js";


export class CBase64File extends CObject
{
	public mExt : string="";//ext
	public mHash : string="";//sha256
	public mOption=new CLoaderOption;
	public mData : ArrayBuffer=null;

	RefreshHash() {
		this.mHash = CHash.SHA256(CUtil.ArrayToString(this.mData));
	}
	FileName()
	{
		return this.mHash+"."+this.mExt;
	}
	
	EditForm(_pointer: CPointer, _div: HTMLDivElement, _input: HTMLInputElement): void {
		if(_pointer.member == "mData" && _input!=null) 
		{
			//m_data는 안보여줌
			_div.removeChild(_input);
		}
	}

	public ExportJSON(): { class: string; } {
		let result = super.ExportJSON();
		result["mData"] = CUtil.ArrayToBase64(this.mData);
		return result;
	}

	override ImportCJSON(_json: CJSON) 
	{
		
		let data = CUtil.Base64ToArray(_json.GetStr("mData"));
		let result = super.ImportCJSON(_json);
		if(data)
			result["mData"] = data;
		return result;
	}
	
};