import {CEvent} from "../basic/CEvent.js";
import {CJSON} from "../basic/CJSON.js";
import {CPath} from "../basic/CPath.js";
import {CStream} from "../basic/CStream.js";


export class CWebSocket
{
	
	public mAddrPortPath : string;
	public mPath : string;
	public mSocket : WebSocket;
	public mError : CEvent;
	public mMessage : CEvent;
	public mSsl : boolean;
	

	//_AddrPortPath : local/relay면 자신한테 간다
	constructor(_AddrPortPath : string,_path : string,_message : ((...args: any[]) => any) | CEvent<(...args: any[]) => any>,
		_error : ((...args: any[]) => any) | CEvent<(...args: any[]) => any>)
	{
		if(_AddrPortPath==null)
			_AddrPortPath=CPath.Join(CPath.eUrl.Host+CPath.eUrl.Port);
		this.mAddrPortPath=_AddrPortPath;
		this.mPath=_path;
		if(this.mAddrPortPath[this.mAddrPortPath.length-1]=='/')
		{
			this.mAddrPortPath=this.mAddrPortPath.substr(0,this.mAddrPortPath.length-1);
		}
		
		if(_AddrPortPath.indexOf("http")!=-1)
		{
			var h=_AddrPortPath.indexOf("http://");
			var s=_AddrPortPath.indexOf("https://");
			if(s!=-1)
			{
				this.mSsl=true;
				this.mAddrPortPath=_AddrPortPath.substr(8,_AddrPortPath.length-8);
			}
			else
				this.mAddrPortPath=_AddrPortPath.substr(7,_AddrPortPath.length-7);
		}
		else
		{
			this.mAddrPortPath=_AddrPortPath;
		}
			
		
		
		this.mSocket=null;

		this.mError=CEvent.ToCEvent(_error);
		this.mMessage=CEvent.ToCEvent(_message);
	}
	Connect()
	{
		return new Promise<boolean>((resolve, reject)=>
		{
			if(this.mAddrPortPath=="local" || this.mAddrPortPath=="relay")
			{
				resolve(true);
				return;
			}
			if(this.mSsl)
				this.mSocket=new WebSocket('wss://'+this.mAddrPortPath+"/"+this.mPath);
			else
				this.mSocket=new WebSocket('ws://'+this.mAddrPortPath+"/"+this.mPath);
	
			this.mSocket.onerror = (event : any)=> 
			{
				this.mError.Call(event.data);
				resolve(false);
			};
			this.mSocket.onopen = (event)=> 
			{
				resolve(true); 
				
			};
			this.mSocket.onmessage = (event)=> 
			{
				this.Message(event.data);
				
				
			};
		});
		
	}
	IsConnect()
	{
		if(this.mAddrPortPath=="local" || this.mAddrPortPath=="relay")	
			return true;
		
		if(this.mSocket!=null && this.mSocket.readyState==1)
			return true;
			
		return false;
	}
	Send(_str : string);
	Send(_str : CStream);
	Send(_str : any)
	{
		if(typeof _str=="object")
			_str=_str.Data();
		if(this.mAddrPortPath=="local" || this.mAddrPortPath=="relay")	
		{
			this.Message(_str);
			return;
		}
		if(this.mSocket && this.mSocket.readyState==1)
			this.mSocket.send(_str);
		else
		{
			this.mError.Call("error");
		}
	}
	Message(_str : any)
	{
		this.mMessage.Call(_str);
	}
	DisConnect()
	{
		this.mSocket.close();
		this.mSocket=null;
	}
	
}



