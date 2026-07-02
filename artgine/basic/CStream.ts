import {CJSON} from "./CJSON.js";
import { IStream } from "./Basic.js";
export class CStreamValue
{
	public mData="";
	public mType='0';
};
export class CStream
{
	private mData : string;
	private mOff : number;
	constructor(_buffer="",_off=0)
	{
		this.mData=_buffer;
		this.mOff=_off;
	}
	
	public ResetOffset() : void
	{
		this.mOff=0;
	}
	
	public Push(_val : any): CStream{	return this;	}
	//PushName(_name : any) : void;
	public PushName(_name : any) : void
	{
		if(typeof _name =="string")
			this.mData += "o"+_name;
		else
			this.mData += "o"+_name.constructor.name;
	}
	public PushStart() : void
	{
		this.mData += "{";
	}
	public PushEnd() : void
	{
		this.mData += "}";
	}
	public PushMember(_val : any) : void
	{
		this.PushStart();
		for (var each0 in _val) 
		{
			if(_val["Serial"] && _val.IsShould(each0)==false)
				continue;
			this.Push(_val[each0]);
		}
		this.PushEnd();
	}
	public CutData(_off)
	{
		this.mData = this.mData.slice(0, _off);
	}
	public IsEnd()	{	return this.mData.length<=this.mOff;}
	public Data(_offEnd=false) {	return this.mData;	}
	public SubOffData()	{	return this.mData.substr(this.mOff,this.mData.length-this.mOff);	}
	public GetName(_back=false) : string{	return "";	}
	public NextValue(_value : CStreamValue)	{	}
	public GetStart()
	{
		if (this.mData.charAt(this.mOff) == '{')
			this.mOff++;
		else
		{
			//error
		}
	}
	public GetEnd()
	{
		var count = 1;
		if (this.mData.charAt(this.mOff) == '}')
		{
			this.mOff++;
		}
			
		else
		{
			for (var i = 0; i < count; ++i)
			{
				while (true)
				{
					if (this.mOff == this.mData.length)
						break;
					if (this.mData.charAt(this.mOff) == '{')
						count++;
					if (this.mData.charAt(this.mOff) == '}')
					{
						this.mOff++;
						break;
					}
					this.mOff++;
				}
			}
			
		}
	}
	public GetType()
	{
		return this.mData.charAt(this.mOff);
	}
	public GetInt32()
	{
		var value=new CStreamValue();
		this.NextValue(value);
		if (value.mType == '0')
			return 0;
		return Number(value.mData);
	}
	public GetFloat()
	{
		var value=new CStreamValue();
		this.NextValue(value);
		if (value.mType == '0')
			return 0;
		return Number(value.mData);
	}
	public GetValue()
	{

		
	}
	public GetBool()
	{
		var value=new CStreamValue();
		this.NextValue(value);
		if (value.mType == 't')
			return true;
			
		return false;
	}
	public GetString()
	{
		var value=new CStreamValue();
		this.NextValue(value);
		if (value.mType == '0')
			return "";
		return value.mData;
	}
	public GetIStream<T extends IStream>(_stream : T=null)
	{
		if(_stream==null)
			_stream=CClass.New(this.GetName(true));
		
		(_stream as IStream).Deserial(this);
		return _stream;
	}

	GetCJSON()
	{
		var value=new CStreamValue();
		this.NextValue(value);
		if (value.mType == '0')
			return null;
		return new CJSON(value.mData);
	}
	GetAMLen(_type ='a')
	{
		this.mOff++;
		var last=this.mData.indexOf(_type,this.mOff);
		var len=this.mData.substring(this.mOff, last);
		
		this.mOff=last+1;
		var count=Number(len);
		return count;
	}
	public GetArray(_array : Array<any>)
	{
		
	}
	public GetSet(_set : Set<any>)
	{
		
	}
	public GetMap(_map : Map<any,any>)
	{
		
	}
	
	public GetMember(_val : IStream){	}
	
	public GetPacketParser<K extends readonly string[]>(_member: K): { [P in K[number]]: any } {
		let packet = {} as { [P in K[number]]: any };
		return packet;
	}
	// GetPacket<const K extends readonly string[]>(keys: readonly [...K]): { [P in K[number]]: any };
	// GetPacket<const K extends readonly string[]>(...keys: [...K]): { [P in K[number]]: any };
	// GetPacket(...args: any[]): any {
	// 	const keys = Array.isArray(args[0]) ? args[0] : args;
	// 	return this.GetPacketParser(keys);
	// }

	// sample(JSON 예시 객체)만 넘기면 CStream <-> JSON 변환 함수를 만들어주는 팩토리.
	// 패킷 이름은 함수 안에 직접 안 적고, RegisterPacketNames()가 static 프로퍼티 이름을 보고 채워준다.
	static DefinePacket<S extends Record<string, any>>(sample: S) {
		let name = "";
		const keys = Object.keys(sample);
		function fn<T extends S | CStream = S>(_data: T, _stream: CStream = new CStream()): T extends CStream ? S : CStream {
			if (_data instanceof CStream) {
				return _data.GetPacketParser(keys) as any;
			}
			_stream.Push(name);
			for (const k of keys) _stream.Push((_data as any)[k]);
			return _stream as any;
		}
		(fn as any).__setName = (n: string) => {
			name = n;
			Object.defineProperty(fn, "name", { value: n, configurable: true });
		};
		return fn;
	}

	// 클래스 정의 마지막에 static { CStream.RegisterPacketNames(this); } 로 한 번만 호출한다.
	// 등록 후에는 각 패킷 함수의 실제 .name 프로퍼티도 패킷 이름과 같아진다 (예: CPacShooting.Dead.name === "Dead").
	static RegisterPacketNames(cls: any): void {
		for (const key of Object.getOwnPropertyNames(cls)) {
			const val = cls[key];
			if (typeof val === "function" && val.__setName) {
				val.__setName(key);
			}
		}
	}
};


import CStream_imple from "../basic_impl/CStream.js";
import { CClass } from "./CClass.js";
CStream_imple();