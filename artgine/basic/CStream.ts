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
	public GetIStream<T>(_stream : T)
	{
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
	//header,data,data....
	// public GetPacket<K extends readonly string[]>(_member: K): { [P in K[number]]: any } 
	// {
	// 	let packet = {} as { [P in K[number]]: any };
	// 	for(let m of _member)
	// 	{
	// 		if(this.m_data.charAt(this.m_off) == 'o')
	// 		{
				
	// 			var off=this.m_off;
	// 			var className=this.GetName();
	// 			this.m_off=off;
	// 			//var stream=_object.NewMember(className);
	// 			//if(stream==null)
	// 			let stream=ClassFinder.Find(className);
	// 			stream.Deserial(this);
	// 			packet[m]=stream;
	// 		}
	// 		else if(this.m_data.charAt(this.m_off) == 'n')
	// 		{
	// 			packet[m]=this.GetFloat();
	// 		}
	// 		else if(this.m_data.charAt(this.m_off) == 's')
	// 		{
	// 			packet[m]=this.GetString();
	// 		}
	// 		else if(this.m_data.charAt(this.m_off) == 'e')
	// 		{
	// 			packet[m]=this.GetString();
	// 		}
	// 		else if(this.m_data.charAt(this.m_off) == 'a')
	// 		{
	// 			var darr=new Array();
	// 			this.GetArray(darr);
	// 			packet[m]=(darr);
	// 		}	
	// 	}

	// 	return packet;
	// }
	public GetPacketParser<K extends readonly string[]>(_member: K): { [P in K[number]]: any } {
		let packet = {} as { [P in K[number]]: any };
		return packet;
	}
	GetPacket<const K extends readonly string[]>(keys: readonly [...K]): { [P in K[number]]: any };
	GetPacket<const K extends readonly string[]>(...keys: [...K]): { [P in K[number]]: any };
	GetPacket(...args: any[]): any {
		const keys = Array.isArray(args[0]) ? args[0] : args;
		return this.GetPacketParser(keys);
	}
	
};


import CStream_imple from "../basic_impl/CStream.js";
CStream_imple();