import { CUtil } from "./CUtil.js";
export class CFileDB 
{
	constructor(_doc,_key)
	{
		this.mDoc=_doc;
		this.mKey=_key;
	}
	public mDoc : Object;
	public mKey;
}

export class CJSON 
{

	static eType=
	{
		Number:0,
		Boolean:1,
		String:2,
		Array:3,
		Object:4,
		Null:5,
		Undefined:6,
		Map:7,
	};
	public mDocument : any={};
	constructor(_document : string|object|ArrayBuffer)
	{
		
		if(typeof _document=="string")
		{
			if(_document!="")
				this.mDocument=JSON.parse(_document);
		}
		else if(_document instanceof ArrayBuffer)
		{
			this.mDocument=JSON.parse(CUtil.ArrayToString(_document));
		}
		else
			this.mDocument=_document;
	}
	ToJSON<T extends Record<string, any>>(defaults: T): T {
		const result = {} as T;
		for (const key in defaults) {
			result[key] = this.mDocument[key] !== undefined ? this.mDocument[key] : defaults[key];
		}
		return result;
	}
	GetDocument(_doc=null)
	{
		if(_doc!=null)
			this.mDocument=_doc;
		return this.mDocument;	
	}
	GetKeys()
	{
		return this.mDocument;
	}
	Set(_key : string,_val : any)
	{
		if(_val instanceof CJSON)
		{
			this.mDocument[_key]=_val.GetDocument();
		}
		else
			this.mDocument[_key]=_val;
	}
	ToStr()
	{
		//return JSON.stringify(this.m_doc);
		const replacer = (_key: string, value: any) => {
			if (value !=null && typeof value=="object" && value.constructor.name=="CObject") 
			{
				return value.ToStr();
			}
			return value;
		};
		return JSON.stringify(this.mDocument, replacer);
	}
	Get(_key : string) : CJSON
	{
		if(this.mDocument==null || this.mDocument[_key]==null)
			return null;
			
		return new CJSON(this.mDocument[_key]);
	}
	GetType(_key : string)
	{
		var type=CJSON.eType.Undefined;
		if(typeof this.mDocument[_key]=="string")
			type=CJSON.eType.String;
		else if(typeof this.mDocument[_key]=="boolean")
			type=CJSON.eType.Boolean;
		else if(typeof this.mDocument[_key]=="number")
			type=CJSON.eType.Number;
		else if(this.mDocument[_key] instanceof Array)
			type=CJSON.eType.Array;
		else if(this.mDocument[_key] ==null)
			type=CJSON.eType.Null;
		else if(typeof this.mDocument[_key]=="object")
		{
			if(this.mDocument[_key].class!=null && this.mDocument[_key].class=="map")
				type=CJSON.eType.Map;
			else
				type=CJSON.eType.Object;
		}
		
			
		
		return type;
	}
	
	GetStr(_key : string) : string
	{
		return this.mDocument[_key];
	}
	GetVal(_key : string) : object
	{
		return this.mDocument[_key];
	}
	GetInt(_key : string) : number
	{
		return this.mDocument[_key];
	}
	GetDouble(_key : string) : number
	{
		return this.mDocument[_key];
	}
	GetBool(_key : string) : boolean
	{
		return this.mDocument[_key];
	}
	GetArray(_key : string) 
	{
		var atype={"mArray":this.mDocument[_key] as Array<any>,"mType":CJSON.eType.Undefined};
		if(this.mDocument[_key] instanceof Array)
		{
			for(var each0 of this.mDocument[_key])
			{
				if(atype.mType==CJSON.eType.Undefined)
				{
					if(typeof each0=="string")
						atype.mType=CJSON.eType.String;
					else if(typeof each0=="boolean")
						atype.mType=CJSON.eType.Boolean;
					else if(typeof each0=="number")
						atype.mType=CJSON.eType.Number;
					else if(each0 instanceof Array)
						atype.mType=CJSON.eType.Array;
					else if(typeof each0=="object")
					{
						atype.mType=CJSON.eType.Object;
						atype.mArray=new Array();
					}
					else if(each0 ==null)
						atype.mType=CJSON.eType.Null;
				}
				if(typeof each0=="object")
				{
					atype.mArray.push(new CJSON(each0));
				}
			}
		}
		
		return atype;
	}
	public FileDB(_upload : boolean,list = new Array<CFileDB>)
	{
		
		
		let find=new Array<Object>();
		if(this.mDocument!=null)
			find.push(this.mDocument);
		while(find.length!=0)
		{
			let ls=find.splice(find.length-1,1)[0];
			//find.remove(find.size()-1);
			for(let key in ls)
			{
				var value=ls[key];
				if(value instanceof Array)
				{
					var al=value as Array<any>;
					for(var each1 of al)
					{
						if(each1 instanceof Object)
						{
							find.push(each1);
						}
					}
				}
				else if(value instanceof Object)
				{
					find.push(value);
				}
				else if(value instanceof String)
				{
					let str=value;
					if(_upload==true && str.length>0xffff)
					{
						list.push(new CFileDB(ls,key));
					}
					else if(_upload==false && str.indexOf("#GridFS")!=-1)
					{
						list.push(new CFileDB(ls,key));
					}
				}
				
			}
			
			
		}
		
		
		return list;
	}
} 