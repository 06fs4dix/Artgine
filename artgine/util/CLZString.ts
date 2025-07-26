import { CAlert } from "../basic/CAlert.js";

export class CLZString
{
	constructor()
	{
		
	}
	static CompressBase64(_str : string) 
	{
		if(typeof window["LZString"] == 'undefined')
			CAlert.E("압축 헤더를 선업하세요!");
		return window["LZString"].compressToBase64(_str);
	}
	static DecompressBase64(_str  : string)
	{
		if(typeof window["LZString"] == 'undefined')
			CAlert.E("압축 헤더를 선업하세요!");
		return window["LZString"].decompressFromBase64(_str);
	}
}

