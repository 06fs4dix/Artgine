import {CClass} from "./CClass.js";

export class CEvent<T extends (...args: any[]) => any = (...args: any[]) => any> 
{
	public mKey: string | null = null;
	public mStop: boolean = false;
	public mEvent: T | string | null = null;
	public mClass: object | null = null;

	constructor();
	constructor(func: T);
	constructor(func: T, key: string);
	constructor(func: T, cls: object);
	constructor(func: T, cls: object, key: string);
	constructor(funcKey: string);
	constructor(funcKey: string, key: string);
	constructor(funcKey: string, cls: object);
	constructor(funcKey: string, cls: object, key: string);
	constructor(a: any = null, b: any = null, c: any = null) {
		if (typeof a === "function" || typeof a === "string") {
			this.mEvent = a;
		}
		if (typeof b === "object") {
			this.mClass = b;
			this.mKey = c;
		} else {
			this.mKey = b;
		}
	}
	static Default(){	return gEvent;	};
	static ToCEvent<T extends (...args: any[]) => any>(_e: T | CEvent<T>, _type: string | null = null): CEvent<T> {
		if(_e==null)	return new CEvent();
		if (_e instanceof CEvent) {
			if (_type != null) _e.mKey = _type;
			return _e;
		}
		return new CEvent<T>(_e, _type!);
	}

	GetKey() {
		return this.mKey;
	}
	Stop() {
		this.mStop = true;
	}
	Play() {
		this.mStop = false;
	}
	SetClass(_class: object) {
		this.mClass = _class;
	}

	Call(..._args: Parameters<T>): ReturnType<T> | null {
		if (this.mEvent == null) return null;

		const argArray = _args.length === 1 && Array.isArray(_args[0]) ? _args[0] : _args;

		if (typeof this.mEvent === "string") {
			return CClass.Call(this.mClass, this.mEvent, argArray);
		} else {
			if (this.mClass != null) {
				return this.mEvent.call(this.mClass, ...argArray);
			} else {
				return this.mEvent(...argArray);
			}
		}
	}

	async CallAsync(..._args: Parameters<T>): Promise<ReturnType<T> | undefined> {
		if (this.mEvent == null) return;

		const argArray = _args.length === 1 && Array.isArray(_args[0]) ? _args[0] : _args;

		if (typeof this.mEvent === "string") {
			return CClass.Call(this.mClass, this.mEvent, argArray);
		} else {
			if (this.mClass != null) {
				return await this.mEvent.call(this.mClass, ...argArray);
			} else {
				return await this.mEvent(...argArray);
			}
		}
	}

	IsCall() {
		return (this.mClass != null || this.mEvent != null)==true && this.mStop==false;
	}

	// static readonly eUiEvent = {
	// 	Null: -1,
	// 	Click: 0,
	// 	HotKey: 1,
	// 	Press: 2,
	// 	Pick: 3,
	// 	LongPress: 4,
	// 	DoubleClick: 5,
	// };
}

export namespace CEvent
{
	export enum eType
	{
		Load="Load",
		Init="Init",
		Update="Update",
		Render="Render",
		Resize="Resize",
		SubUpdate="SubUpdate",
		LoadUpdate="LoadUpdate",
		RenderXR="RenderXR",

		//PWA
		Freeze="Freeze",
		Resume="Resume",

		Null ="null",
		Click = "click",
		Press = "press",
		Pick = "pick",
		LongPress = "lpress",
		DoubleClick = "dbclick",


		//Modal
		Open="Open",
		Close="Close",
		Drop="Drop",
		Chat="Chat",

		Connect="Connect",
		Message="Message",
		
	};
}
(CEvent as any).eType = CEvent.eType;
var gEvent=new CEvent();