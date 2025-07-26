import {CJSON} from "./CJSON.js";
var g_langugeMap={};
var g_country="";
/*
[구조]
country.sub.text

*/
export class CLan
{
    //데이터 넣기
    static Set(_json : CJSON) : void;
    static Set(_object : object) : void;
    static Set(_country : string,_sub:string,_text :string|object);
    static Set(_country : any,_sub=null,_text=null): void
    {
        if(typeof _country=="object" )
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
            if(g_langugeMap[_country]==null)
                g_langugeMap[_country]={};
            g_langugeMap[_country][_sub]=_text;
        }
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
    static T(_sub : string,_defaultText="")
	{
		if(g_langugeMap[g_country]==null)
		{
            g_langugeMap[g_country]={};
        }
        if(g_langugeMap[g_country][_sub]==null)
        {
            g_langugeMap[g_country][_sub]=_defaultText;
        }

		return _sub;
	}
    static Get(_text)
    {
        if(g_langugeMap[g_country]==null)
            g_langugeMap[g_country]={};

        if(g_langugeMap[g_country][_text]==null)
            g_langugeMap[g_country][_text]=_text;
        return g_langugeMap[g_country][_text];
    }
    
}