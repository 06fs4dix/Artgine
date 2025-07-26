import {CAlert} from "../basic/CAlert.js";


export class CZLib
{
	static DeCompress(pa_org : Uint8Array,pa_tar : Uint8Array=null)
	{
		if(window["pako"]==null)
		{
			CAlert.Error("pako zlib not define!");
			return;
		}
		var rval=window["pako"].inflate(pa_org);
		if(pa_tar!=null)
		{
			pa_tar.fill(rval,0,rval.length);
		}

		
		return rval;
	}

}