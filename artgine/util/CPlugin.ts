import { CEvent } from "../basic/CEvent.js";
import { CPath } from "../basic/CPath.js";
import { CLoaderOption } from "./CLoader.js";



export class CPlugin
{
    //Init,Load,Update,Render
    static sEventVec=new Array<CEvent>();
    static sPathMap=new Map<string,string>();
    
    static PushEvent(_type: CEvent.eType, _event: any): void
	{
		CPlugin.sEventVec.push(CEvent.ToCEvent(_event,_type));
	}
    static FindPath(_plugin : string)
    {
        return CPlugin.sPathMap.get(_plugin);
    }
    static PushPath(_plugin : string,_path : string)
    {
        return CPlugin.sPathMap.set(_plugin,_path);
    }
}