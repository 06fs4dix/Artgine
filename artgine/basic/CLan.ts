import {CJSON} from "./CJSON.js";
import {CHash} from "./CHash.js";
import { CUtil } from "./CUtil.js";
var gLangugeMap={};
var gLanCode = (() => {
    // Node.js 환경 체크
    if (CUtil.IsNode()) 
    {
        // Node.js 환경에서 환경변수로 언어 코드 가져오기
        return process.env.LANG?.split('_')[0]?.toLowerCase() || 
               process.env.LC_ALL?.split('_')[0]?.toLowerCase() || 
               'en';
    }
    
    // 웹 브라우저 환경
    if (CUtil.IsWeb()) 
    {
        // navigator.language에서 언어 코드 추출
        const language = navigator.language || navigator.languages?.[0] || 'en';
        return language.split('-')[0].toLowerCase();
    }
    
    // 기본값
    return 'en';
})();



/*
[구조]
country.sub.text

*/
export class CLan
{
    static eType ={
        "ko" : "ko",
        "en" : "en",
        "ja" : "ja",
        "zh" : "zh",
        "es" : "es",
        "fr" : "fr",
        "de" : "de",
        "it" : "it",
        "pt" : "pt",
        "ru" : "ru"
    }
    
    //데이터 넣기
    static Set(_json : CJSON) : void;
    static Set(_object : object) : void;
    static Set(_country : string|number,_sub:string,_text :string|object);
    static Set(_country : any,_sub=null,_text=null): void
    {
        if(_country!=null && typeof _country=="object" )
        {
            if(_country instanceof CJSON)
                _country=_country.GetDocument();
            for(var countryEach in _country)
            {
                for(var subEach in _country[countryEach])    
                    CLan.Set(countryEach,subEach,_country[countryEach][subEach]);
            }
        }
        else
        {
            if(_country==null || _country=="")  _country=gLanCode;
            if(typeof _sub=="number")   _sub=_sub+"";
            if(gLangugeMap[_country]==null)
                gLangugeMap[_country]={};
            gLangugeMap[_country][_sub]=_text;
        }
        return _sub;
    }
    //Get가져오는건 서브가 먼저다. 설정된 컨트리에서 가져옴
    // static G(_sub : string,_defaultText="",_country : string=null)
	// {
    //     if(_country==null) _country=g_country;

	// 	if(g_langugeMap[_country]!=null && g_langugeMap[_country][_sub]!=null)
	// 	{
    //         return g_langugeMap[_country][_sub];
    //     }

	// 	return _defaultText;
	// }
    //Tag
    static Get(_sub : string,_defaultText=null)
	{
		if(gLangugeMap[gLanCode]==null)
		{
            gLangugeMap[gLanCode]={};
        }
        if(_sub==null || _sub=="")
            _sub=CHash.HashCode(_defaultText)+"";
        if(gLangugeMap[gLanCode][_sub]==null)
            gLangugeMap[gLanCode][_sub]=_defaultText;
        

		return gLangugeMap[gLanCode][_sub];
	}
    // static Get(_text) : string
    // {
    //     if(g_langugeMap[g_country]==null)
    //         g_langugeMap[g_country]={};

    //     let sub=CHash.HashCode(_text);
    //     if(g_langugeMap[g_country][sub]==null)
    //         g_langugeMap[g_country][sub]=_text;
    //     return g_langugeMap[g_country][sub];
    // }
    static Map()
    {
        return gLangugeMap;
    }
    static SetCode(_code)
    {
        if(_code==null) return;
        
        gLanCode=_code;
    }
    static GetCode()
    {
        return gLanCode;
    }
}


// function CurrentLocationHash() {
//     const e = new Error();
//     const stack = e.stack?.split("\n");
  
//     // 전체 콜스택을 문자열로 결합
//     if (stack && stack.length > 3) {
//         // 0,1,2 인덱스 제외 (Error, CurrentLocationHash, CLan.Get 호출 라인)
//         const actualStack = stack.slice(3);
//         const fullStack = actualStack.join("\n");
//         // CHash를 사용하여 해시화
//         return CHash.HashCode(fullStack);
//     }
  
//     return "Unknown location";
//   }
  