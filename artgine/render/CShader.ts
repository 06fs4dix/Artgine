
import {CUniform} from "./CUniform.js"
import {CShaderAttr} from "./CShaderAttr.js"
import {CObject} from "../basic/CObject.js"




var g_bufMap=new Map();
export class CVertexFormat extends CObject
{
	static eIdentifier=
	{
		Vertex:0,
		Position:0,
		UV:1,
		Normal:3,
		Weight:4,
		WeightIndex:5,
		Color:6,
		TexOff:7,
		Tangent:8,
		Binormal:9,
		Instance:10,
		Shadow:11,

		VertexIndex:20,
		UVIndex:21,
		OutPosition:30,
		OutColor:31,
		Count:12,
		Null:13,
	}
	static eDataType=
	{
		Byte:0,
		Float:1,
		Int:2,
		Count:3,
		Null:4,
	}
	public text : string;
	public eachSize : number;
	public eachCount : number;
	
	public dataType : number;
	
	public identifier : number;
	public identifierCount : number;
	//public instance : string;
	public location : number;
	constructor()
	{
		super();
		this.text=null;
		this.eachSize=0;//각각에 사이즈
		this.eachCount=0;//몇개 있는지
	
		this.dataType= CVertexFormat.eDataType.Float;//데이터 타임
		
		this.identifier = CVertexFormat.eIdentifier.Null;
		this.identifierCount = 0;//그래픽 타입 곗수
		//this.instance=null;
		this.location=-1;
	}
	// SysDataType(_device : CDevice)
	// {
	// 	if (this.dataType != Df.DataType.Float)
	// 		return _device.GL1().UNSIGNED_BYTE;
	// 	return _device.GL1().FLOAT;
	// }

	// DataTypeAddCount()
	// {
	// 	if (this.dataType == Df.DataType.Float)
	// 	{
	// 		switch (this.eachCount)
	// 		{
	// 		case 16:
	// 			return "mat4";
	// 		case 4:
	// 			return "vec4";
	// 		case 3:
	// 			return "vec3";
	// 		case 2:
	// 			return "vec2";
	// 		case 1:
	// 			return "float";
	// 		}
	// 	}
	
	// 	CMsg.E("error!");
	// 	return "Null";
	// }
	
	
}




//=============================================================================
export class CShader extends CObject
{
	public mInsCount=1;
	public mVS : string=null;
	public mPS : string=null;
	public mKey : string;
	public mProgram : any;
	public mTag : Set<string>;
	public mTagMain : Set<string>;
	
	public mVF : Array<CVertexFormat>;
	public mUniform : Map<string,CUniform>;
	public mDefault : Array<CShaderAttr>;
	public mComplie : boolean=false;
	//public m_uniData : Function=null;

	constructor()
	{
		super();
		this.mKey="";
		
		this.mVF=new Array<CVertexFormat>();
		this.mUniform=new Map<string,CUniform>();
		this.mDefault=new Array<CShaderAttr>();
		this.mTag=new Set<string>();
		this.mTagMain=new Set<string>();
		//this.m_instance=null;
	}
	IsShould(_member: string, _type: CObject.eShould): boolean 
	{
		if(_member=="m_complie" || _member=="m_program")
			return false;
		return super.IsShould(_member,_type);
	}

	Icon(){		return "bi bi-filetype-sh";	}
	PushProgram(_program : any)
	{
		this.mProgram=_program;
	}
	PushTag(_tag : Array<string>)
	{
		for(var each0 of _tag)
		{
			if(each0!="")
				this.mTag.add(each0);
		}
	}
	PushTagMain(_tag : Array<string>)
	{
		for(var each0 of _tag)
		{
			if(each0!="")
				this.mTagMain.add(each0);
		}
	}
	
	PushUniform(_uni : CUniform)
	{
		this.mUniform.set(_uni.name,_uni);
	}
	GetDefault(_key : string)
	{
		for (var i = 0; i < this.mDefault.length; ++i)
		{
			if (this.mDefault[i].mKey==_key)
			{
				return this.mDefault[i];
			}
		}
		return null;
		
	}
	GetVFAllSize()
	{
		let size=0;
		for(let vf of this.mVF)
		{
			size+=vf.eachCount*4;
		}
		return size;
	}

	
}
export class CShaderList
{
	public mKey ="";
	public mShader = new Array<CShader>();
	PushShader(_shader : CShader)
	{
		this.mShader.push(_shader);
		// this.m_shader.push(_shader);
		// for(var each0 of _tag)
		// {
		// 	//this.m_tag.add(each0);
		// }
	}
	
	GetShader(_tag : Array<string>|string|Set<string>)
	{
		if(_tag instanceof Array || _tag instanceof Set)
		{
			var maxMainTagCount=-1;
			var maxCount=-1000;
			var maxOff=0;
			var minFCount=1000;

			var tagSet = Array.isArray(_tag)? new Set(_tag) : _tag;
			
			for(var i=0;i<this.mShader.length;++i)
			{
				var shader = this.mShader[i];

				var allMainTagsMatch = true;
				var mainTagCount = 0;
				for(let mainTag of shader.mTagMain) {
					if(!tagSet.has(mainTag)) {
						allMainTagsMatch = false;
						break;
					}
					mainTagCount++;
				}
				if(!allMainTagsMatch) continue;

				var scount=0;
				var fcount=0;

				for(var tag of shader.mTag)
				{
					if(tagSet.has(tag))
						scount++;
					else
						fcount++;
				}
				if(
					mainTagCount > maxMainTagCount ||
					(mainTagCount == maxMainTagCount && scount > maxCount) ||
					(mainTagCount == maxMainTagCount && scount == maxCount && fcount < minFCount)
				)
				{
					maxMainTagCount = mainTagCount;
					maxCount = scount;
					minFCount = fcount;
					maxOff=i;
				}
				
				
			}

			// if(tcount!=maxCount)
			// 	CMsg.W("Not Match tag GetShader");
			return this.mShader[maxOff];
		}
	
		else
		{
			for(var i=0;i<this.mShader.length;++i)
			{
				if(this.mShader[i].mKey==_tag)
					return this.mShader[i];
			}
		}
		return null;
	}
}