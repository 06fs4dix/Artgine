
//
export interface IListener
{
	On(_key,_event,_target);
	Off(_key,_target);
	GetEvent(_key,_target);
}
//보내는용
export interface IMessage
{
	Send(_msg,_target);
}
export interface IAutoUpdate
{
	Update(_delay : number) : void;
	IsPause() : boolean;
}
export interface IAutoRender
{
	Render() : void;
	RenderQue(_push : boolean) : void;
}
export interface IAutoInit
{
	Init() : void;
}
export interface IMember
{
	//Array:
	//[GetComp("test"),mPos] 

	//String
	//mComArr[0].mPos 
	//mPos
	Get(_member : Array<string>|string) : any;//멤버값을 찾을때
	Set(_member : Array<string>|string,_value) : any;//멤버값을 저장할때
	Call(_function : string,_para : Array<any>);//메세지로 보낼때
}
export interface IStream
{
	Serial(_stream)  : any;
	Deserial(_stream) ;
	IsShould(_member : string,_type)	
}
export interface ICJSON
{
	ExportCJSON()  : any;
	ImportCJSON(_cjson) ;
	IsShould(_member : string,_type)	
}

export interface IRecycle
{
    Recycle();
    GetRecycleType() : string;
    SetRecycleType(_type : string);
    IsRecycle();
}
export interface IDrop
{
	GetDropType();
}
export class CDrop
{
	static eType={
		File:0,
		CObject:1,
		Hash:2,
	};
}
export class CUpdate
{
	static eType=
	{
		Not:0,
		Updated:1,
		Already:2,
	}
}
export class CShould
{
	static eType=
	{
		Data:"D",
		Editer:"E",
		Patch:"P",
		Proxy:"X"
	}
}
