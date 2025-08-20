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

	// OpenStreetMap Overpass API를 사용하여 GeoJSON 데이터 가져오기
	static GetOSMData(_query : string, _bbox : string = "") : Promise<any> {
		return new Promise(function(resolve, reject){});
	}

	// Natural Earth 데이터 가져오기 (국가 경계, 도시 등)
	static GetNaturalEarthData(_category : string, _scale : string = "110m") : Promise<any> {
		return new Promise(function(resolve, reject){});
	}

	// GADM 행정구역 데이터 가져오기
	static GetGADMData(_countryCode : string, _level : number = 0) : Promise<any> {
		return new Promise(function(resolve, reject){});
	}
}

import CFecth_imple from "../network_imple/CFecth.js";
CFecth_imple();