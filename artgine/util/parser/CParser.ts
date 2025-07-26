
import {CAlert} from "../../basic/CAlert.js";
import {CFile} from "../../system/CFile.js";

function Memcpy(_tar,_tarO,_org,_orgO,_size)
{
	for(var i=0;i<_size;++i)
	{
		 if( typeof _org[_orgO+i] =="string")
			 _tar[_tarO+i]=_org.charCodeAt(_orgO+i);
		 else
			 _tar[_tarO+i]=_org[_orgO+i];
	}
}
function GetArrayBuffer(_org,_orgO,_size)
{
	var dummy=new ArrayBuffer(_size);
	var buf=new Uint8Array(dummy);
	Memcpy(buf,0,_org,_orgO,_size);
	
	return buf;
}
function BufRev(_org,_size)
{
	for(var i=0;i<_size/2;++i)
	{
		var dummy=_org[i];
		_org[i]=_org[_size-1-i];
		_org[_size-1-i]=dummy;
		
	}
}
export class CParser
{
	public mPstOff=0;
	public mBuffer : Uint8Array=null;
	public mBufferSize=0;
	public mFileName="";
	public mResult : any=null;
	constructor()
	{

	}
	async Load(pa_fileName){}
	async Open(pa_fileName,pa_mode=null)
	{
		this.mFileName = pa_fileName;
		this.mFileName= this.mFileName.split("\\").join("/");;
	
		if(this.mBuffer==null)
		{
			this.mBuffer=new Uint8Array(await CFile.Load(this.mFileName));
			if(this.mBuffer==null)
			{
				CAlert.E("file empty!");
				return true;
			}
				
			return false;
		}
		return false;
	}
	SetBuffer(pa_buffer:Uint8Array|string,pa_size : number)
	{
		var dummy=new ArrayBuffer(pa_size);
		this.mBuffer=new Uint8Array(dummy);
		
		Memcpy(this.mBuffer,0, pa_buffer,0, pa_size);
	}

	ParFread(pa_buffer,pa_size)
	{
		//CMsg.E("error 제대로 되나 확인안함");
		Memcpy(pa_buffer,0,this.mBuffer,this.mPstOff , pa_size);
		this.mPstOff += pa_size;
	}
	ParFreadFrom(pa_buffer,pa_origin,pa_size)
	{
		//CMsg.E("error 제대로 되나 확인안함");
		Memcpy(pa_buffer,pa_origin,this.mBuffer,this.mPstOff , pa_size);
		this.mPstOff += pa_size;
	}
	ReadByte()
	{

		var view=new DataView(this.mBuffer.buffer,this.mPstOff)
		this.mPstOff += 1;
		return view.getInt8(0);
	}
	ReadUByte()
	{
		
		var view=new DataView(this.mBuffer.buffer,this.mPstOff)
		this.mPstOff += 1;
		return view.getUint8(0);
	}
	ReadShort()
	{
	
		var view=new DataView(this.mBuffer.buffer,this.mPstOff)
		this.mPstOff += 2;
		return view.getInt16(0,true);
	}
	ReadUShort()
	{

		var view=new DataView(this.mBuffer.buffer,this.mPstOff)
		this.mPstOff += 2;
		return view.getUint16(0,true);
	}
	ReadInt32()
	{

		var view=new DataView(this.mBuffer.buffer,this.mPstOff)
		this.mPstOff += 4;
		return view.getInt32(0,true);
	}
	ReadUInt32()
	{
		
		var view=new DataView(this.mBuffer.buffer,this.mPstOff)
		this.mPstOff += 4;
		return view.getUint32(0,true);
	}
	ReadInt64()
	{
		
		var view=new DataView(this.mBuffer.buffer,this.mPstOff,4);
		var low = view.getUint32(0, true);  // 4294967295
		
		var view=new DataView(this.mBuffer.buffer,this.mPstOff+4,4);
		var high = view.getUint32(0, true);  // 4294967295
		
		this.mPstOff += 8;
		//calculate negative value
		if ( high & 0x80000000 ) {

			high = ~ high & 0xFFFFFFFF;
			low = ~ low & 0xFFFFFFFF;

			if ( low === 0xFFFFFFFF ) high = ( high + 1 ) & 0xFFFFFFFF;

			low = ( low + 1 ) & 0xFFFFFFFF;

			return - ( high * 0x100000000 + low );

		}
		
		return high * 0x100000000 + low;
	}
	ReadFloat()
	{
		
		var view=new DataView(this.mBuffer.buffer,this.mPstOff)
		this.mPstOff += 4;
		return view.getFloat32(0,true);
	}
	ReadDouble()
	{
		
		var view=new DataView(this.mBuffer.buffer,this.mPstOff)
		this.mPstOff += 8;
		return view.getFloat64(0,true);
	}
	ReadChar()
	{
		this.mPstOff += 1;
		
		return this.mBuffer[this.mPstOff-1];
	}
	ReadString(_size)
	{
		
		var view="";
		for(var i=0;i<_size;++i)
		{
			if(this.mBuffer[this.mPstOff+i]==0)
			{
				break;
			}
			view+=String.fromCharCode(this.mBuffer[this.mPstOff+i]);
		}
		this.mPstOff += _size;
		
		return view;
	}
	ReadStrLine()
	{
		var str="";
		
		while(this.mBuffer.length>this.mPstOff)
		{
			var ch=String.fromCharCode(this.mBuffer[this.mPstOff]);
			this.mPstOff += 1;
			if(ch=='\n')
				break;
			str+=ch;
		}
		
		
		return str;
	}
	GetOffset() { return this.mPstOff;	 }
	SetOffset(_size)
	{
		this.mPstOff = _size;
	}
	Par_NotEof()
	{
		if (this.mBufferSize != 0 && this.mBufferSize - 1 >= this.mPstOff)
		{

			return true;
		}

		return false;
	}
	GetResult()	{	return this.mResult;}

};