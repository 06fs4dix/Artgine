

var gBBMap=new Map<string,any>();
export class CBlackBoard
{
    static Get(_key : string) : any;
    static Get<T>(_key : string) : T;
    static Get<T>(_key : string) : T
    {
        return gBBMap.get(_key);
    }
    static Set(_key : string,_val : any)
    {
        
        if(_val["mProxy"]!=null)
            console.log("CBlackBoard m_proxy!!!!error" );

        if(gBBMap.get(_key)!=null)
            console.log("CBlackBoard dup!!!!error : "+_key );
        gBBMap.set(_key,_val);
    }
    static Map()
    {
        return gBBMap;
    }
    static Delete(_key)
    {
        gBBMap.delete(_key);
    }
}
