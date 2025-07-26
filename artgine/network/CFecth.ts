import {CObject} from "../basic/CObject.js";

// export class CRestAPIOption extends CObject
// {
// 	mMulti=false;
// 	mEdit=false;
// 	mReturnType="text";
// }
export class CFecth
{
	

	static Exe(_url : string,_data : object,_returnType : "text" | "json"="text",_multi=false)
	{
		if(_url[0]=="/")	_url=_url.substring(1,_url.length-1);
		return new Promise(function(resolve, reject){});
	}
}

import CFecth_imple from "../network_imple/CFecth.js";
CFecth_imple();