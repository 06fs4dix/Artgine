import {CDevice} from "./CDevice.js"
import {CJSON} from "../basic/CJSON.js"
import {CObject} from "../basic/CObject.js"
import {CAlert} from "../basic/CAlert.js"
import {CShader,CShaderList, CVertexFormat} from "./CShader.js"
import {CString} from "../basic/CString.js"
import { SDF } from "../z_file/SDF.js"
import {CFile} from "../system/CFile.js"
import {CPath} from "../basic/CPath.js"
//import CRes from "../system/CRes.js"

var gImportFileMap=new Map<string,string>();
export async function GetImportFile(_rpath,_ifile)
{
	var text=gImportFileMap.get(_ifile);
	if(text==null)
	{
		text="";
		var bytes = new Uint8Array( await CFile.Load(_rpath+"/"+_ifile) );
		var len = bytes.byteLength;
		for (let k = 0; k < len; k++) 
		{
			text += String.fromCharCode( bytes[ k ] );
		}
		gImportFileMap.set(_ifile,text);
	}
	return text;
}
export function ExtractImportPaths(text,_addTS=true){
	const regex = /from\s+["']([^"']+)["']/g;
	const matches = [];
	let match;

	while ((match = regex.exec(text)) !== null) {
		if((match[1].indexOf("Shader")!=-1 || match[1].indexOf("SDF")!=-1) && _addTS==true){}
		else	matches.push(match[1]+(_addTS?".ts":""));
	}

	// 중복 제거
	return matches;
}
//var g_map=new Map<string,number>();

export class CShaderBranch
{
	mType="";
	mTag;
	mKeyword;
	mAttribute=new Array<string>();
	mCode;
	mUseFun=new Set<string>();
	mDefault=false;
}
export class CShaderFun
{
	public mPara=[];
	public mLine="";
	public mReturn="";
	public mUseFun=new Set<string>();
	public mBranch=new Array<CShaderBranch>();
}
export class CShaderIn
{
	public mLeft="";
	public mRight="";
}

export class CShaderBuild extends CObject
{
	public mTag =new Array<string>;
	public mTagMain =new Array<string>;
	public mVS ="";
	public mPS ="";
	public mVSUni =new Array<string>;
	public mVSOut =new Array<string>;
	public mPSOut =new Array<string>;
	public mInsCount=1;
	public mKey="";
	public mBranchUse=new Set<CShaderBranch>();
}

var g_allShader={key:[],ps:[],vs:[]};

export class CShaderInterpret 
{
	public mKeyMap=new Map<string,string>();
	public mString : string;
	
	 
	public mFunction =new  Map<string,CShaderFun>();

	public mCallStack=new Array<string>;
	public mKeyword =["var","function","import","Build","{","}","for","const","if","BranchBegin","BranchEnd"];

	//public m_const="";
	public mGlobalFun=new CShaderFun();
	public mPstFun=this.mGlobalFun;
	public mGlobalVar=new Map<string,CShaderIn>();
	public mBuild=new Array<CShaderBuild>();
	public mTexMap=new Map<string,number>();
	public mSam2DCount=0;
	public mSam2DArrCount=0;
	public mSamCubeCount=0;
	public mShaderList=new CShaderList();
	public mImportFile=new Array<string>();
	public mInChk=new Set<string>();
	//public m_shareFun="";
	
	constructor()
	{
	

	}
	GetShaderList()	{	return this.mShaderList;	}
	protected AddTiny(_key,_ps,_vs)
	{
		g_allShader.key.push(_key);
		g_allShader.ps.push(_ps);
		g_allShader.vs.push(_vs);
	}
	protected GetTiny()
	{
		return g_allShader;
	}
	protected BuildTiny(_tiny : {key:Array<string>,ps:Array<string>,vs:Array<string>}){}
	New()
	{
		var obj=this as any;
		return new obj.constructor() as this;	
	}
	
	async Exe(_fileName : string,_source : string)
	{
		this.mString=_source;
		//this.m_pstLine=this.m_line;
		for (var i = 0; i < this.mString.length; ++i)
		{
			// if(this.m_string.length-1==i)
			// {
			// 	CMsg.E(this.m_string.length);	
			// }

			var pass=false;
			while (this.mString[i]=="/" && this.mString[i+1]=="/")
			{
				//this.AddLine();
				i+=2;
				while(this.mString[i]!='\n')
				{
					i++;
				}
				i++;
			}

			for (var j = 0; j < this.mKeyword.length; ++j)
			{
				
				if (this.mString[i] == this.mKeyword[j][0] && this.mString.length-i>= this.mKeyword[j].length)
				{
					let com = true;
					for (let k = 1; k < this.mKeyword[j].length; ++k)
					{
						if (this.mString[i+k] != this.mKeyword[j][k])
						{
							com = false;
						}
					}
					if (com)
					{
						//this.AddLine();
						i += this.Compare(this.mKeyword[j], i);
						pass=true;
						let importStr="";
						
						
						while(this.mImportFile.length>0)
						{
							let ifile=this.mImportFile.splice(0,1)[0];
							if(this.mInChk.has(ifile))	continue;

							var fname=_fileName;
							if(fname.indexOf(":")==-1)
							{
								fname=CPath.PHPCR()+fname;
							}
							var rpath=CString.PathSub(fname);
							var text=await GetImportFile(rpath,ifile);
							this.mImportFile.push(...ExtractImportPaths(text));
							importStr=text+importStr;
							this.mInChk.add(ifile);
							//var b=this.m_string.slice(0,i);
							//var e=this.m_string.slice(i);
							
							
						}
						this.mString=this.mString.slice(0,i) + importStr + this.mString.slice(i);
						
						break;
					}
					
				}
			}
			var comKey=null;
			for (let key of this.mKeyMap.keys())
			{
				if (this.mString[i] == key[0] && this.mString.length-i> key.length)
				{
					let com = true;
					for (var k = 1; k < key.length; ++k)
					{
						if (this.mString[i+k] != key[k])
						{
							com = false;
							break;
						}
					}
					if(com && (comKey==null || key.length >comKey.length))
					{
						comKey=key;
					}
				}

			}
			for (let key of this.mFunction.keys())
			{
				if (this.mString[i] == key[0] && this.mString.length-i> key.length)
				{
					let com = key;
					for (var k = 1; k < key.length; ++k)
					{
						if (this.mString[i+k] != key[k])
						{
							com = "";
							break;
						}
					}
					if(com!="")
					{
						//if(this.m_callStack[this.m_callStack.length-1]!=com)
						this.mPstFun.mUseFun.add(com);
					}
				}

			}
			if(comKey!=null)
			{
				this.mPstFun.mLine+=this.mKeyMap.get(comKey);
				pass=true;
				i += comKey.length-1;
			}
			if(pass==false)
			{
				this.mPstFun.mLine+=this.mString[i];
				
			}
				
								
		}
		this.Build();
	}
	protected Compare(_keyword : string,_off) : number
	{
		//if(_keyword)

		return 0;
	}
	protected Build()
	{

	}
	protected FindS(_off)
	{
		var pos=this.mString.indexOf(";", _off);
		var size = pos - _off+1;
		var sp = this.mString.substr(_off, pos- _off);
		return {"size":size,"str":sp};
	}
	protected DataTypeAddCount(_eachCount){	return "";	};
	
	protected CutTypeName(_string : string)
	{
		_string=CString.ReplaceAll(_string," ","");
		_string=CString.ReplaceAll(_string,"	","");
		
			
		var type="";
		var ed=_string.indexOf(":");
		if(ed!=-1)
		{
		
			type=_string.substr(ed+1,_string.length);

			ed=_string.indexOf(":");
		

			return {"type":type,"name":_string.substr(0,ed)}
		}
		
		return {"type":"","name":_string.substr(0,_string.length)}
	}
	protected KeywordMap(_key : string)
	{
		var key=this.mKeyMap.get(_key);
		if(key!=null)	return key;
		return _key;
	}
	VFPasing(_str : string,_vfCount : Array<number>) : CVertexFormat
	{
		return null;
	}
	async Attach(_fileName : string,_shaderList : CJSON)
	{
		this.mShaderList=new CShaderList();
		this.mShaderList.mKey=_fileName;
		for(let i=0;i<_shaderList.GetDocument().m_shader.length;++i)
		{
			let shader=new CShader();
			shader.ImportJSON(_shaderList.GetDocument().m_shader[i]);
			this.mShaderList.PushShader(shader);


		
			var source = shader.mVS;
			if(source.indexOf(".vs")!=-1)
			{
				var fname = _fileName;
				if (fname.indexOf(":") == -1) {
					fname = CPath.PHPCR() + source;
				}
				var rpath = CString.PathSub(fname);
				source="";
				var bytes = new Uint8Array(await CFile.Load(rpath+"/"+shader.mVS));
				var len = bytes.byteLength;
				for (let k = 0; k < len; k++) {
					source += String.fromCharCode(bytes[k]);
				}
			}
				
			
			
		

			source = shader.mPS;
			if(source.indexOf(".ps")!=-1)
			{
				var fname = _fileName;
				if (fname.indexOf(":") == -1) {
					fname = CPath.PHPCR() + source;
				}
				var rpath = CString.PathSub(fname);
				source="";
				var bytes = new Uint8Array(await CFile.Load(rpath+"/"+shader.mPS));
				var len = bytes.byteLength;
				for (let k = 0; k < len; k++) {
					source += String.fromCharCode(bytes[k]);
				}
			}
		}
	}
};

export class CShaderInterpretGL extends CShaderInterpret
{
	
	constructor()
	{
		super();

		this.mKeyMap.set("CVec2","vec2");
		this.mKeyMap.set("CVec3","vec3");
		this.mKeyMap.set("CVec4","vec4");
		this.mKeyMap.set("CMat3","mat3");
		this.mKeyMap.set("CMat","mat4");
		this.mKeyMap.set("CMat34","mat4x3");
		this.mKeyMap.set("CMat42","mat2x4");
		this.mKeyMap.set("number","float");
		this.mKeyMap.set("Instance1","float");
		this.mKeyMap.set("Instance2","vec2");
		this.mKeyMap.set("Instance3","vec3");
		this.mKeyMap.set("Instance4","vec4");
		this.mKeyMap.set("Instance16","mat4");
		this.mKeyMap.set("new","");
		this.mKeyMap.set("out_position","gl_position");
		this.mKeyMap.set("UniToSam2D","float");
		this.mKeyMap.set("screenPos", "gl_FragCoord");
		this.mKeyMap.set("int","int");

		this.mKeyMap.set("V3Dot","dot");
		this.mKeyMap.set("CMath.","");
		this.mKeyMap.set("Math.","");
		this.mKeyMap.set(".uniOff","");
		this.mKeyMap.set(".dummy","");
		this.mKeyMap.set("TexSizeHalfInt",(CDevice.GetProperty(CDevice.eProperty.Sam2DWriteX))+"");
		this.mKeyMap.set("TexSizeHalfFloat",(CDevice.GetProperty(CDevice.eProperty.Sam2DWriteX))+".0");
		this.mKeyMap.set("export","");
		
		for(var each0 in SDF)
		{
			for(var each1 in SDF[each0])
			{
				this.mKeyMap.set("SDF"+"."+each0+"."+each1,SDF[each0][each1]+".0");
			}
			//CConsol.Log(each0);
		}
		
	}
	Init()
	{
		
	}
	async Exe(_fileName : string,_source : string)
	{
		this.Init();
		await super.Exe(_fileName,_source);
		this.mShaderList.mKey=_fileName;
	}
	
	
	Compare(_keyword : string,_off) : number
	{
		return 0;
	}
	BuildVSUni(_shader : CShader,_in : Array<string>) : string
	{
		return "";
	}

	
	Build()
	{
		
		

	}
	DataTypeAddCount(_eachCount)
	{
		
		switch (_eachCount)
		{
		case 16:
			return "mat4";
		case 4:
			return "vec4";
		case 3:
			return "vec3";
		case 2:
			return "vec2";
		case 1:
			return "float";
		}
		
	
		CAlert.E("error!");
		return "Null";
	}
	AttachFun(_useFun : Array<string>, _addedFun : Array<string> = null)
	{
		if(_addedFun === null) {
			_addedFun = [];
		}

		let funStr="";
		const vfCount=new Array(CVertexFormat.eIdentifier.Count).fill(0);

		for(const funKey of _useFun) {
			const fun = this.mFunction.get(funKey);

			let tempStr = "";
			switch(fun.mReturn) {
				case "CVec4":
					tempStr += "vec4";
					break;
				case "CVec3":
					tempStr += "vec3";
					break;
				case "CVec2":
					tempStr += "vec2";
					break;
				case "CMat":
					tempStr += "mat4";
					break;
				case "CMat3":
					tempStr += "mat3";
					break;
				case "number":
					tempStr += "float";
					break;
				default:
					tempStr += "void";
			}
			tempStr += " "+funKey+"(";
			for(var i=0;i<fun.mPara.length;++i)
			{
				if(i!=0)
				tempStr+=",";
				var vf=this.VFPasing(fun.mPara[i],vfCount);
				switch(vf.eachCount)
				{
					case 1:tempStr+="float";break;
					case 2:tempStr+="vec2";break;
					case 3:tempStr+="vec3";break;
					case 4:tempStr+="vec4";break;
					case 16:tempStr+="mat4";break;
				}
				tempStr+=" "+vf.text;
			}
			tempStr+="){" + fun.mLine+"}";

			let arrFun = [];
			_addedFun.push(..._useFun);
			for(let usedFun of fun.mUseFun) {
				if(_addedFun.indexOf(usedFun) == -1) {
					arrFun.push(usedFun);
				}
			}
			funStr += this.AttachFun(arrFun, _addedFun);
			funStr += tempStr;
		}


		return funStr;
	}
	VPFun()
	{
		//glsl func
		var str="";

		str += "vec4 LWVPMul(vec3 pa_local,mat4 world,mat4 view,mat4 proj)\n";
		str += "{\n";
		str += "	return proj*view*world*vec4(pa_local,1.0);\n";
		str += "}\n";
		str += "vec4 VLWVPMul(vec3 _vertex,mat4 _local,mat4 _world,mat4 _view,mat4 _proj)\n";
		str += "{\n";
		str += "	return _proj*_view*_world*_local*vec4(_vertex,1.0);\n";
		str += "}\n";
		str += "vec4 LW34VPMul(vec3 pa_local,mat4 world,mat4 view,mat4 proj)\n";
		str += "{\n";
		str += "	mat4 wMat=mat4(0.0);\n";
		str += "	wMat[0].xyz=world[0].xyz;\n";
		str += "	wMat[1].xyz=world[1].xyz;\n";
		str += "	wMat[2].xyz=world[2].xyz;\n";
		str += "	wMat[3].xyz=world[3].xyz;\n";
		str += "	wMat[3].w=1.0;\n";
		str += "	return proj*view*wMat*vec4(pa_local,1.0);\n";
		str += "}\n";

		//mapping
		str += "vec3 MappingV3ToTex(vec3 vec)\n";
		str += "{\n";
		str += "	return 0.5*vec+0.5;\n";
		str += "}\n";
		str += "vec4 MappingV4ToTex(vec4 vec)\n";
		str += "{\n";
		str += "	return 0.5*vec+0.5;\n";
		str += "}\n";
		str += "vec4 MappingTexToV4(vec4 tex)\n";
		str += "{\n";
		str += "	return 2.0*tex-1.0;\n";
		str += "}\n";
		str += "vec3 MappingTexToV3(vec3 tex)\n";
		str += "{\n";
		str += "	return 2.0*tex-1.0;\n";
		str += "}\n";
		
		str += "vec4 RGBAAdd(vec4 _a,vec4 _b)\n";
		str += "{\n";
		str += "	return clamp(_a+_b, 0.0, 1.0);\n";
		str += "}\n";

		str += "float random (vec2 st) {return fract(sin(dot(st.xy,vec2(12.9898,78.233)))*43758.5453123);}\n";

		//CMath func
		//translation
		str += "vec4 V4MulMatCoordi(vec4 pa_val,mat4 pa_mat)\n";
		str += "{\n";
		str += "	return pa_mat*pa_val;\n";
		str += "}\n";
		// str += "vec4 V4MulMat34Coordi(vec4 pa_val,mat4x3 pa_mat)\n";
		// str += "{\n";
    	// str += "	vec4 result = pa_mat * pa_val.xyz;\n";
		// str += "	result.w = pa_val.w;\n";
		// str += "	return result;\n";
		// str += "}\n";
		str += "vec4 V3MulMatCoordi(vec3 pa_val,mat4 pa_mat)\n";
		str += "{\n";
		str += "	return pa_mat*vec4(pa_val,1.0);\n";
		str += "}\n";
		// str += "vec4 V3MulMat34Coordi(vec3 pa_val,mat3x4 pa_mat)\n";
		// str += "{\n";
		// str += "	return pa_mat*vec4(pa_val,1.0);\n";
		// str += "}\n";
		str += "vec3 V3MulMat3Normal(vec3 pa_val,mat3 pa_mat)\n";
		str += "{\n";
		str += "	return pa_mat*pa_val;\n";
		str += "}\n";
		// str += "vec3 Mat3MulVec3Normal(mat3 pa_mat,vec3 pa_val)\n";
		// str += "{\n";
		// str += "	return pa_val*pa_mat;\n";
		// str += "}\n";

		//mat4
		str += "mat4 FloatMulMat(float pa_val,mat4 pa_mat)\n";
		str += "{\n";
		str += "	return pa_mat*pa_val;\n";
		str += "}\n";
		str += "mat4 MatAdd(mat4 _a,mat4 _b)\n";
		str += "{\n";
		str += "	return _a+_b;\n";
		str += "}\n";
		str += "mat4 MatMul(mat4 pa_mat0,mat4 pa_mat1)\n";
		str += "{\n";
		str += "	return pa_mat1*pa_mat0;\n";
		str += "}\n";

		//mat3
		str+="mat3 TransposeMat3(mat3 inMatrix){";
		str+="vec3 i0=inMatrix[0];";
		str+="vec3 i1=inMatrix[1];";
		str+="vec3 i2=inMatrix[2];";
		str+="mat3 outMat=mat3(vec3(i0.x,i1.x,i2.x),vec3(i0.y,i1.y,i2.y),vec3(i0.z,i1.z,i2.z));";
		str+="	return outMat;	}\n";
		str += "mat3 InverseMat3(mat3 _mat)\n";
		str += "{\n";
		str += "	return inverse(_mat);\n";
		str += "}\n";

		//v2
		str += "vec2 V2SubV2(vec2 _a,vec2 _b)\n";
		str += "{\n";
		str += "	return _a-_b;\n";
		str += "}\n";
		str += "vec2 V2AddV2(vec2 _a,vec2 _b)\n";
		str += "{\n";
		str += "	return _a+_b;\n";
		str += "}\n";
		str += "vec2 V2MulFloat(vec2 _a,float _b)\n";
		str += "{\n";
		str += "	return _a*_b;\n";
		str += "}\n";
		str += "vec2 V2MulV2(vec2 _a,vec2 _b)\n";
		str += "{\n";
		str += "	return _a*_b;\n";
		str += "}\n";
		str += "vec2 V2DivV2(vec2 _a,vec2 _b)\n";
		str += "{\n";
		str += "	return _a/_b;\n";
		str += "}\n";
		str += "float V2Len(vec2 _a)\n";
		str += "{\n";
		str += "	return length(_a);\n";
		str += "}\n";
		str += "float V2Dot(vec2 _a, vec2 _b)\n";
		str += "{\n";
		str += "	return dot(_a, _b);\n";
		str += "}\n";
		str += "vec2 V2Nor(vec2 _a)\n";
		str += "{\n";
		str += "	return normalize(_a);\n";
		str += "}\n";
		str += "vec2 V2Exp(vec2 _a)\n";
		str += "{\n";
		str += "	return exp(_a);\n";
		str += "}\n";

		//v3
		str += "vec3 V3SubV3(vec3 _a,vec3 _b)\n";
		str += "{\n";
		str += "	return _a-_b;\n";
		str += "}\n";
		str += "vec3 V3AddV3(vec3 _a,vec3 _b)\n";
		str += "{\n";
		str += "	return _a+_b;\n";
		str += "}\n";
		str += "vec3 V3MulFloat(vec3 _a,float _b)\n";
		str += "{\n";
		str += "	return _a*_b;\n";
		str += "}\n";
		str += "vec3 V3DivFloat(vec3 _a,float _b)\n";
		str += "{\n";
		str += "	return _a/_b;\n";
		str += "}\n";
		str += "vec3 V3MulV3(vec3 _a,vec3 _b)\n";
		str += "{\n";
		str += "	return _a*_b;\n";
		str += "}\n";
		str += "vec3 V3DivV3(vec3 _a,vec3 _b)\n";
		str += "{\n";
		str += "	return _a/_b;\n";
		str += "}\n";
		str += "float V3Len(vec3 _a)\n";
		str += "{\n";
		str += "	return length(_a);\n";
		str += "}\n";
		str += "vec3 V3Nor(vec3 _a)\n";
		str += "{\n";
		str += "	return normalize(_a);\n";
		str += "}\n";
		str += "float V3Dot(vec3 _a, vec3 _b)\n";
		str += "{\n";
		str += "	return dot(_a, _b);\n";
		str += "}\n";
		str += "vec3 V3Cross(vec3 _a, vec3 _b)\n";
		str += "{\n";
		str += "	return cross(_a, _b);\n";
		str += "}\n";
		str += "vec3 V3Exp(vec3 _a)\n";
		str += "{\n";
		str += "	return exp(_a);\n";
		str += "}\n";
		str += "vec3 V3Fract(vec3 _a)\n";
		str += "{\n";
		str += "	return fract(_a);\n";
		str += "}\n";

		//v4
		str += "vec4 V4SubV4(vec4 _a,vec4 _b)\n";
		str += "{\n";
		str += "	return _a-_b;\n";
		str += "}\n";
		str += "vec4 V4AddV4(vec4 _a,vec4 _b)\n";
		str += "{\n";
		str += "	return _a+_b;\n";
		str += "}\n";
		str += "vec4 V4MulFloat(vec4 _a,float _b)\n";
		str += "{\n";
		str += "	return _a*_b;\n";
		str += "}\n";
		str += "vec4 V4MulV4(vec4 _a,vec4 _b)\n";
		str += "{\n";
		str += "	return _a*_b;\n";
		str += "}\n";
		str += "vec4 V4DivV4(vec4 _a,vec4 _b)\n";
		str += "{\n";
		str += "	return _a/_b;\n";
		str += "}\n";
		str += "float V4Len(vec4 _a)\n";
		str += "{\n";
		str += "	return length(_a);\n";
		str += "}\n";
		str += "float V4Dot(vec4 _a, vec4 _b)\n";
		str += "{\n";
		str += "	return dot(_a, _b);\n";
		str += "}\n";
		str += "vec4 V4Nor(vec4 _a)\n";
		str += "{\n";
		str += "	return normalize(_a);\n";
		str += "}\n";
		str += "vec4 V3Exp(vec4 _a)\n";
		str += "{\n";
		str += "	return exp(_a);\n";
		str += "}\n";

		//js Math func
		//number
		str += "float Max(float a, float b)\n";
		str += "{\n";
		str += "	return max(a,b);\n";
		str += "}\n";
		str += "float Min(float _a, float _b)\n";
		str += "{\n";
		str += "	return min(_a, _b);\n";
		str += "}\n";
		str += "float Abs(float _a)\n";
		str += "{\n";
		str += "	return abs(_a);\n";
		str += "}\n";
		str += "float Floor(float _a)\n";
		str += "{\n";
		str += "	return floor(_a);\n";
		str += "}\n";
		str += "float Ceil(float _a)\n";
		str += "{\n";
		str += "	return ceil(_a);\n";
		str += "}\n";
		str += "float Round(float _x)\n";
		str += "{\n";
		str += "	return round(_x);\n";
		str += "}\n";
		str += "float Sin(float _rad)\n";
		str += "{\n";
		str += "	return sin(_rad);\n";
		str += "}\n";
		str += "float Cos(float _rad)\n";
		str += "{\n";
		str += "	return cos(_rad);\n";
		str += "}\n";
		str += "float Acos(float _rad)\n";
		str += "{\n";
		str += "	return acos(_rad);\n";
		str += "}\n";
		str += "float Sign(float _x)\n";
		str += "{\n";
		str += "	return sign(_x);\n";
		str += "}\n";
		str += "float SmoothStep(float _a, float _b, float _c)\n";
		str += "{\n";
		str += "	return smoothstep(_a, _b, _c);\n";
		str += "}\n";
		str += "vec2 SmoothStep(float _a, float _b, vec2 _c)\n";
		str += "{\n";
		str += "	return smoothstep(_a, _b, _c);\n";
		str += "}\n";
		str += "vec3 SmoothStep(float _a, float _b, vec3 _c)\n";
		str += "{\n";
		str += "	return smoothstep(_a, _b, _c);\n";
		str += "}\n";
		str += "vec4 SmoothStep(float _a, float _b, vec4 _c)\n";
		str += "{\n";
		str += "	return smoothstep(_a, _b, _c);\n";
		str += "}\n";
		str += "float Step(float _a, float _b)\n";
		str += "{\n";
		str += "	return step(_a, _b);\n";
		str += "}\n";
		str += "float Mod(float _a,float _b)\n"
		str += "{\n";
		str += "	return mod(_a, _b);\n"
		str += "}\n";
		str += "float Fract(float _a)\n";
		str += "{\n";
		str += "	return fract(_a);\n";
		str += "}\n";
		str += "float Pow(float val0,float val1)\n";
		str += "{\n";
		str += "	return pow(val0,val1);\n";
		str += "}\n";
		str += "float Exp(float _a)\n";
		str += "{\n";
		str += "	return exp(_a);\n";
		str += "}\n";
		str += "float Log2(float _a)\n";
		str += "{\n";
		str += "	return log2(_a);\n";
		str += "}\n";
		str += "float Radians(float _a)\n";
		str += "{\n";
		str += "	return radians(_a);\n";
		str += "}\n";
		str += "float Mix(float _a, float _b, float _c)\n";
		str += "{\n";
		str += "	return mix(_a, _b, _c);\n";
		str += "}\n";
		str += "float Clamp(float _a, float _b, float _c)\n";
		str += "{\n";
		str += "	return clamp(_a, _b, _c);\n";
		str += "}\n";
		str += "float Exp2(float _a)\n";
		str += "{\n";
		str += "	return exp2(_a);\n";
		str += "}\n";

		//V2
		str += "vec2 V2Max(vec2 a, vec2 b)\n";
		str += "{\n";
		str += "	return max(a,b);\n";
		str += "}\n";
		str += "vec2 V2Min(vec2 _a, vec2 _b)\n";
		str += "{\n";
		str += "	return min(_a, _b);\n";
		str += "}\n";
		str += "vec2 V2Abs(vec2 _a)\n";
		str += "{\n";
		str += "	return abs(_a);\n";
		str += "}\n";
		str += "vec2 V2Floor(vec2 _a)\n";
		str += "{\n";
		str += "	return floor(_a);\n";
		str += "}\n";
		str += "vec2 V2Ceil(vec2 _a)\n";
		str += "{\n";
		str += "	return ceil(_a);\n";
		str += "}\n";
		str += "vec2 V2Round(vec2 _x)\n";
		str += "{\n";
		str += "	return round(_x);\n";
		str += "}\n";
		str += "vec2 V2Sign(vec2 _x)\n";
		str += "{\n";
		str += "	return sign(_x);\n";
		str += "}\n";
		str += "vec2 V2Step(vec2 _a, vec2 _b)\n";
		str += "{\n";
		str += "	return step(_a, _b);\n";
		str += "}\n";
		str += "vec2 V2Mod(vec2 _a,float _b)\n"
		str += "{\n";
		str += "	return mod(_a, _b);\n"
		str += "}\n";
		str += "vec2 V2Pow(vec2 val0,float val1)\n";
		str += "{\n";
		str += "	val0.x = pow(val0.x, val1);\n";
		str += "	val0.y = pow(val0.y, val1);\n";
		str += "	return val0;\n";
		str += "}\n";

		//V3
		str += "vec3 V3Max(vec3 a, vec3 b)\n";
		str += "{\n";
		str += "	return max(a,b);\n";
		str += "}\n";
		str += "vec3 V3Min(vec3 _a, vec3 _b)\n";
		str += "{\n";
		str += "	return min(_a, _b);\n";
		str += "}\n";
		str += "vec3 V3Abs(vec3 _a)\n";
		str += "{\n";
		str += "	return abs(_a);\n";
		str += "}\n";
		str += "vec3 V3Floor(vec3 _a)\n";
		str += "{\n";
		str += "	return floor(_a);\n";
		str += "}\n";
		str += "vec3 V3Ceil(vec3 _a)\n";
		str += "{\n";
		str += "	return ceil(_a);\n";
		str += "}\n";
		str += "vec3 V3Round(vec3 _x)\n";
		str += "{\n";
		str += "	return round(_x);\n";
		str += "}\n";
		str += "vec3 V3Sign(vec3 _x)\n";
		str += "{\n";
		str += "	return sign(_x);\n";
		str += "}\n";
		str += "vec3 V3Step(vec3 _a, vec3 _b)\n";
		str += "{\n";
		str += "	return step(_a, _b);\n";
		str += "}\n";
		str += "vec3 V3Mod(vec3 _a,float _b)\n";
		str += "{\n";
		str += "	return mod(_a, _b);\n";
		str += "}\n";
		str += "vec3 V3Mod(vec3 _a,vec3 _b)\n";
		str += "{\n";
		str += "	return mod(_a, _b);\n";
		str += "}\n";
		str += "vec3 V3Pow(vec3 val0,float val1)\n";
		str += "{\n";
		str += "	val0.x = pow(val0.x, val1);\n";
		str += "	val0.y = pow(val0.y, val1);\n";
		str += "	val0.z = pow(val0.z, val1);\n";
		str += "	return val0;\n";
		str += "}\n";
		str += "vec3 V3PowV3(vec3 val0,vec3 val1)\n";
		str += "{\n";
		str += "	val0.x = pow(val0.x, val1.x);\n";
		str += "	val0.y = pow(val0.y, val1.y);\n";
		str += "	val0.z = pow(val0.z, val1.z);\n";
		str += "	return val0;\n";
		str += "}\n";
		str += "vec3 V3Mix(vec3 val0,vec3 val1,float fac)\n";
		str += "{\n";
		str += "	val0 = mix(val0, val1, fac);\n";
		str += "	return val0;\n";
		str += "}\n";
		str += "vec3 V3Clamp(vec3 val0,float min,float max)\n";
		str += "{\n";
		str += "	return clamp(val0,min, max);\n";
		str += "}\n";
		str += "vec3 V3Clamp(vec3 val0,vec3 min,vec3 max)\n";
		str += "{\n";
		str += "	return clamp(val0, min, max);\n";
		str += "}\n";
		
		//V4
		str += "vec4 V4Max(vec4 a, vec4 b)\n";
		str += "{\n";
		str += "	return max(a,b);\n";
		str += "}\n";
		str += "vec4 V4Min(vec4 _a, vec4 _b)\n";
		str += "{\n";
		str += "	return min(_a, _b);\n";
		str += "}\n";
		str += "vec4 V4Abs(vec4 _a)\n";
		str += "{\n";
		str += "	return abs(_a);\n";
		str += "}\n";
		str += "vec4 V4Floor(vec4 _a)\n";
		str += "{\n";
		str += "	return floor(_a);\n";
		str += "}\n";
		str += "vec4 V4Ceil(vec4 _a)\n";
		str += "{\n";
		str += "	return ceil(_a);\n";
		str += "}\n";
		str += "vec4 V4Round(vec4 _x)\n";
		str += "{\n";
		str += "	return round(_x);\n";
		str += "}\n";
		str += "vec4 V4Sign(vec4 _x)\n";
		str += "{\n";
		str += "	return sign(_x);\n";
		str += "}\n";
		str += "vec4 V4Step(vec4 _a, vec4 _b)\n";
		str += "{\n";
		str += "	return step(_a, _b);\n";
		str += "}\n";
		str += "vec4 V4Mod(vec4 _a,float _b)\n"
		str += "{\n";
		str += "	return mod(_a, _b);\n"
		str += "}\n";
		str += "vec4 V4Pow(vec4 val0,float val1)\n";
		str += "{\n";
		str += "	val0.x = pow(val0.x, val1);\n"
		str += "	val0.y = pow(val0.y, val1);\n"
		str += "	val0.z = pow(val0.z, val1);\n"
		str += "	val0.w = pow(val0.w, val1);\n"
		str += "	return val0;\n";
		str += "}\n";
		str += "vec4 V4Mix(vec4 _a,vec4 _b,float _c)\n"
		str += "{\n";
		str += "	return mix(_a, _b, _c);\n"
		str += "}\n";
		str += "vec4 V4Clamp(vec4 val0,float min,float max)\n";
		str += "{\n";
		str += "	return clamp(val0,min, max);\n";
		str += "}\n";
		str += "vec4 V4Clamp(vec4 val0,vec4 min,vec4 max)\n";
		str += "{\n";
		str += "	return clamp(val0, min, max);\n";
		str += "}\n";

		//type casting
		str += "float IntToFloat(int _a)\n";
		str += "{\n";
		str += "	return float(_a);\n";
		str += "}\n";
		str += "int FloatToInt(float _a)\n";
		str += "{\n";
		str += "	return int(_a);\n";
		str += "}\n";
		str += "mat3 Mat4ToMat3(mat4 val0)\n";
		str += "{\n";
		str += "	mat3 mats;\n";
		str += "	mats[0][0]=val0[0][0];mats[0][1]=val0[0][1];mats[0][2]=val0[0][2];\n";
		str += "	mats[1][0]=val0[1][0];mats[1][1]=val0[1][1];mats[1][2]=val0[1][2];\n";
		str += "	mats[2][0]=val0[2][0];mats[2][1]=val0[2][1];mats[2][2]=val0[2][2];\n";
		str += "	return mats;\n";
		str += "}\n";
		str += "mat4 Mat3ToMat4(mat3 val0)\n";
		str += "{\n";
		str += "	mat4 mats;\n";
		str += "	mats[0][0]=val0[0][0];mats[0][1]=val0[0][1];mats[0][2]=val0[0][2];mats[0][3]=0.0;\n";
		str += "	mats[1][0]=val0[1][0];mats[1][1]=val0[1][1];mats[1][2]=val0[1][2];mats[1][3]=0.0;\n";
		str += "	mats[2][0]=val0[2][0];mats[2][1]=val0[2][1];mats[2][2]=val0[2][2];mats[2][3]=0.0;\n";
		str += "	mats[3][0]=0.0;mats[3][1]=0.0;mats[3][2]=0.0;mats[3][3]=1.0;\n";
		str += "	return mats;\n";
		str += "}\n";
		str += "mat3 V3ToMat3(vec3 v0,vec3 v1,vec3 v2)\n";
		str += "{\n";
		str += "	return mat3(v0,v1,v2);\n";
		str += "}\n";
		str += "vec2 FloatToVec2(float _x)\n";
		str += "{\n";
		str += "	return vec2(_x);\n";
		str += "}\n";
		str += "vec3 FloatToVec3(float _x)\n";
		str += "{\n";
		str += "	return vec3(_x);\n";
		str += "}\n";
		str += "vec4 FloatToVec4(float _x)\n";
		str += "{\n";
		str += "	return vec4(_x);\n";
		str += "}\n";

		//glsl frequently used functions
		str += "float SaturateFloat(float pa_val)\n";
		str += "{\n";
		str += "	return clamp(pa_val, 0.0, 1.0);;\n";
		str += "}\n";
		str += "vec2 SaturateV2(vec2 pa_val)\n";
		str += "{\n";
		str += "	return clamp(pa_val, 0.0, 1.0);\n";
		str += "}\n";
		str += "vec3 SaturateV3(vec3 pa_val)\n";
		str += "{\n";
		str += "	return clamp(pa_val, 0.0, 1.0);\n";
		str += "}\n";
		str += "vec4 SaturateV4(vec4 pa_val)\n";
		str += "{\n";
		str += "	return clamp(pa_val, 0.0, 1.0);\n";
		str += "}\n";
		str += "mat3 MatDecompRot(mat4 _prs)\n";
		str += "{\n";
		str += "	mat3 rmat=Mat4ToMat3(_prs);float w0=length(_prs[0]);float w1=length(_prs[1]);float w2=length(_prs[2]);\n";
		str += "	w1=w0/w1;w2=w0/w2;w0=1.0;\n";
		str += "	rmat[0]*=w0;rmat[1]*=w1;rmat[2]*=w2;\n";
		str += "	return rmat;\n";
		str += "}\n";
		str += "vec2 ShadowPosToUv(vec4 pos)\n";
		str += "{\n";
		str += "	return 0.5 *pos.xy/pos.w  + 0.5;\n";
		str += "}\n";
		str += "vec4 BlendFun(float _type,vec4 _org, vec4 _tar,float _per){\n";
		str += "	if(_type==1.0)\n";
		str += "		return _org+_tar*_per;\n";
		str += "	else if(_type==2.0)\n";
		str += "		return _org*(_tar*_per+1.0-_per);\n";
		str += "	else if(_type==3.0)\n";
		str += "	{\n";
		str += "		float L_r= _org.r + (_tar.r-_org.r)*_per;\n";
		str += "		float L_g= _org.g + (_tar.g-_org.g)*_per;\n";
		str += "		float L_b= _org.b + (_tar.b-_org.b)*_per;\n";
		str += "		float L_a= _org.a + (_tar.a-_org.a)*_per;\n";
		str += "		return vec4(L_r,L_g,L_b,L_a);\n";
		str += "	}\n";
		str += "	else if(_type==4.0)\n";
		str += "		return vec4(_org.rgb*(1.0-_org.a)+_tar.rgb*_tar.a,1.0);\n";
		str += "	else if(_type==5.0)\n";
		str += "		return _org.r+_org.g+_org.b<_tar.r+_tar.g+_tar.b?_org:_tar;\n";
		str += "	else if(_type==6.0)\n";
		str += "		return _org.r+_org.g+_org.b>_tar.r+_tar.g+_tar.b?_org:_tar;\n";
		str += "	else if(_type==7.0)\n";
		str += "		return _org;\n";
		str += "	else if(_type==8.0)\n";
		str += "		return _tar;\n";
		str += "	else if(_type==9.0)\n";
		str += "		return _org.r+_org.g+_org.b<2.5?vec4(0.0,0.0,0.0,0.0):_tar;\n";
		str += "return vec4(1, 1, 1, 1);}\n";
		str += "vec3 Reflect(vec3 _normal, vec3 _lightDir)\n";
		str += "{\n";
		str += "	return reflect(-_lightDir, _normal);\n";
		str += "}\n";
		// str += "vec3 WNormalToTNormal(vec3 vec)\n";
		// str += "{\n";
		// str += "	return 0.5*vec+0.5;\n";
		// str += "}\n";
		// str += "vec4 WNormalToTNormal(vec4 vec)\n";
		// str += "{\n";
		// str += "	return 0.5*vec+0.5;\n";
		// str += "}\n";
		// str += "vec4 TNormalToWNormal(vec4 tex)\n";
		// str += "{\n";
		// str += "	return 2.0*tex-1.0;\n";
		// str += "}\n";
		// str += "vec3 TNormalToWNormal(vec3 tex)\n";
		// str += "{\n";
		// str += "	vec3 N= 2.0*tex-1.0;N.y=-N.y;\n";
		// str += "	return N;\n";
		// str += "}\n";
	
		//color convert
		// str += "vec4 RGBAToHSVA(vec4 c)		{\n";
		// str += "vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);\n";
		// str += "vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));\n";
		// str += "vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));\n";
		// str += "float d = q.x - min(q.w, q.y);\n";
		// str += "float e = 1.0e-10;\n";
		// str += "return vec4(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x,c.a);	}\n";
		// str += "vec4 HSVAToRGBA(vec4 c)		{\n";
		// str += "vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);\n";
		// str += "vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);\n";
		// str += "return vec4(c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y),c.a);		}\n";

		return str;
	}
	
	PSFun()
	{
		var str="";

		//ps
		//if(this.m_device.PF().m_renderer==Df.Render.GL2)
		//{
		str += "vec2 Sam2DSize(float _off)\n";
		str += "{\n";
		str += "	ivec2 ts;\n";
		for (var j = 0; j < CDevice.GetProperty(CDevice.eProperty.Sam2DMax); ++j)
		{
			if(j==0)
				str += "	if(_off-0.5<=" + j + ".0)";
			else
				str += "	else if(_off-0.5<=" + j + ".0)";
			str += "			ts=textureSize(sam2D[" + j + "],0);\n";//lod레벨 0으로 강제로 맟춤
			
		}
		str += "	return vec2(float(ts.x),float(ts.y));\n";
		str += "}\n";

		str += "float SamCubeMaxLod(float _off)\n";
		str += "{\n";
		str += "    ivec2 ts;\n";
		for (var j = 0; j < CDevice.GetProperty(CDevice.eProperty.SamCubeMax); ++j)
		{
			if (j == 0)
				str += "    if(_off-0.5 <= " + j + ".0)";
			else
				str += "    else if(_off-0.5 <= " + j + ".0)";
			str += "        ts = textureSize(samCube[" + j + "], 0);\n"; // lod=0에서 사이즈 구하기
		}
		str += "    int size = max(ts.x, ts.y);\n";
		str += "    return floor(log2(float(size)));\n";
		str += "}\n";
		
		str += "vec3 Sam2DArrSize(float _off)\n";
		str += "{\n";
		str += "	ivec3 ts;\n";
		for (var j = 0; j < CDevice.GetProperty(CDevice.eProperty.Sam2DArrMax); ++j)
		{
			if(j==0)
				str += "	if(_off-0.5<=" + j + ".0)";
			else
				str += "	else if(_off-0.5<=" + j + ".0)";
			str += "			ts=textureSize(sam2DArr[" + j + "],0);\n";//lod레벨 0으로 강제로 맟춤
			
		}
		str += "	return vec3(float(ts.x),float(ts.y),0.0);\n";
		str += "}\n";
		// }
		// else
		// {
		// 	str += "vec2 TexSize(float _off)\n";
		// 	str += "{\n";
		// 	str += "	return vec2("+this.m_device.PF().m_width+","+this.m_device.PF().m_height+");\n";
		// 	str += "}\n";
		// }
		
		
		
		
		str += "vec4 Sam2DToColor(float _off,vec2 _uv)\n";
		str += "{\n";
		for (var j = 0; j < CDevice.GetProperty(CDevice.eProperty.Sam2DMax); ++j)
		{
			str += "	if(_off-0.5<=" + j + ".0)\n";
			str += "		return texture(sam2D[" + j + "],_uv);\n";
			
		}
		str += "	return vec4(0,0,0,1);\n";
		str += "}\n";

		// str += "vec4 Sam2DToColor(int _off,vec2 _uv)\n";
		// str += "{\n";
		// str += "	return Sam2DToColor(float(_off),_uv);\n";
		// str += "}\n";
		str += "vec4 Sam2D0ToColor(vec2 _uv)\n";
		str += "{\n";
		str += "	return texture(sam2D[0],_uv);\n";
		str += "}\n";
		

		str += "vec4 Sam2DArrToColor(float _off,vec3 _uv)\n";
		str += "{\n";
		for (var j = 0; j < CDevice.GetProperty(CDevice.eProperty.Sam2DArrMax); ++j)
		{
			str += "	if(_off-0.5<=" + j + ".0)\n";
			str += "		return texture(sam2DArr[" + j + "],_uv);\n";
			
		}
		str += "	return vec4(0,0,0,1);\n";
		str += "}\n";

		// str += "vec4 Sam2DArrToColor(int _off,vec3 _uv)\n";
		// str += "{\n";
		// str += "	return Sam2DArrToColor(float(_off),_uv);\n";
		// str += "}\n";

		str += "vec4 SamCubeToColor(float _off,vec3 _uv)\n";
		str += "{\n";
		str += "		_uv.y=-_uv.y;\n";
		for (var j = 0; j < CDevice.GetProperty(CDevice.eProperty.SamCubeMax); ++j)
		{
			str += "	if(_off-0.5<=" + j + ".0)\n";
			str += "		return texture(samCube[" + j + "],normalize(_uv));\n";
			
		}
		str += "	return vec4(0,0,0,1);\n";
		str += "}\n";
		// str += "vec4 SamCubeToColor(int _off,vec3 _uv)\n";
		// str += "{\n";
		// str += "	return SamCubeToColor(float(_off),_uv);\n";
		// str += "}\n";

		str += "vec4 SamCubeLodToColor(float _off,vec3 _uv,float _lod)\n";
		str += "{\n";
		str += "		_uv.y=-_uv.y;\n";
		for (var j = 0; j < CDevice.GetProperty(CDevice.eProperty.SamCubeMax); ++j)
		{
			str += "	if(_off-0.5<=" + j + ".0)\n";
			str += "		return textureLod(samCube[" + j + "],normalize(_uv),_lod);\n";
			
		}
		str += "	return vec4(0,0,0,1);\n";
		str += "}\n";
		// str += "vec4 SamCubeLodToColor(int _off,vec3 _uv,float _lod)\n";
		// str += "{\n";
		// str += "	return SamCubeLodToColor(float(_off),_uv,_lod);\n";
		// str += "}\n";
		
		str += "vec2 ParallaxNormal(vec3 TangentViewPos,vec3 TangentFragPos,float _index,vec2 _uv,float height_scale)\n";
		str += "{\n";
		str += "	const float minLayers = 8.0;const float maxLayers = 32.0;\n";
		str += "	vec3 viewDir   = normalize(TangentViewPos - TangentFragPos);\n";
		str += "	float numLayers = mix(maxLayers, minLayers, abs(dot(vec3(0.0, 0.0, 1.0), viewDir)));\n";
		str += "	float layerDepth = 1.0 / numLayers;\n";
		str += "	float currentLayerDepth = 0.0;\n";
		str += "	vec2 P = viewDir.xy / viewDir.z * height_scale;\n";
		str += "	vec2 deltaTexCoords = P / numLayers;\n";
		str += "	vec2  currentTexCoords     = _uv;\n";
		str += "	deltaTexCoords.y=-deltaTexCoords.y;\n";//uv좌표계가 반대라서 이렇게
		str += "	float currentDepthMapValue = 1.0-Sam2DToColor(_index, currentTexCoords).a;\n";
		str += "	for(int i=0;i<128;++i){\n";
		str += "		if(currentLayerDepth < currentDepthMapValue){\n";
		str += "			currentTexCoords -= deltaTexCoords;\n";
		str += "			currentDepthMapValue = 1.0-Sam2DToColor(_index, currentTexCoords).a;\n";
		str += "			currentLayerDepth += layerDepth;\n";
		str += "		}	else	{break;}\n";
		str += "	}\n";
		str += "	vec2 prevTexCoords = currentTexCoords + deltaTexCoords;\n";
		str += "	float afterDepth  = currentDepthMapValue - currentLayerDepth;\n";
		str += "	float beforeDepth = 1.0-Sam2DToColor(_index, prevTexCoords).a - currentLayerDepth + layerDepth;\n";
		str += "	float weight = afterDepth / (afterDepth - beforeDepth);\n";
		str += "	vec2 newUv = prevTexCoords * weight + currentTexCoords * (1.0 - weight);\n";
		str += "	return newUv;\n";
		str += "}\n";
		
		// str += "vec4 Sam2DToV4(vec2 _uni,int _off) {\n";
		// str += "	if(_uni.x-0.5<=0.0)";
		// str += "		return texelFetch(sam2D[0],ivec2(_off,int(_uni.y)),0);\n";
		// for (var j = 1; j < CDevice.GetProperty(CDevice.eProperty.Sam2DMax); ++j)
		// {
		// 	str += "	else if(_uni.x-0.5<=" + j + ".0)";
		// 	str += "		return texelFetch(sam2D["+j+"],ivec2(_off,int(_uni.y)),0);\n";
		// }
		// str += "	return texelFetch(sam2D[0],ivec2(_off,int(_uni.y)),0);\n";
		// str += "}\n";
		// str += "vec4 Sam2DToV4(vec2 _uni,float _off) {\n";
		// str += "	return Sam2DToV4(_uni,int(_off));\n";
		// str += "}\n";
		str += "vec4 Sam2DToV4(vec2 _uni,float _off) {\n";
		str += "	vec2 size = vec2("+CDevice.GetProperty(CDevice.eProperty.Sam2DWriteX)+".0, "+CDevice.GetProperty(CDevice.eProperty.Sam2DWriteX)+".0);\n";
		str += "	if(_uni.x-0.5<=0.0) {";
		str += "		return texture(sam2D[0],vec2(_off+0.5,_uni.y+0.5)/size);\n";
		str += "	}";
		for (var j = 1; j < CDevice.GetProperty(CDevice.eProperty.Sam2DMax); ++j)
		{
			str += "	else if(_uni.x-0.5<=" + j + ".0) {";
			str += "		return texture(sam2D["+j+"],vec2(_off+0.5,_uni.y+0.5)/size);\n";
			str += "	}";
		}
		str += "	return texture(sam2D[0],vec2(_off+0.5,_uni.y+0.5)/size);\n";
		str += "}\n";
		str += "vec4 Sam2DToV4(vec2 _uni,int _off) {\n";
		str += "	return Sam2DToV4(_uni,float(_off));\n";
		str += "}\n";
		
		str += "mat4 Sam2DToMat(vec2 _uni,float _off) {\n";
		str += "return mat4(\n";
		str += "Sam2DToV4(_uni,_off*4.0+0.0),\n";
		str += "Sam2DToV4(_uni,_off*4.0+1.0),\n";
		str += "Sam2DToV4(_uni,_off*4.0+2.0),\n";
		str += "Sam2DToV4(_uni,_off*4.0+3.0)\n";
		str += ");}\n";
		// str += "mat4 Sam2DToMat(vec2 _uni,int _off) {\n";
		// str += "	return Sam2DToMat(_uni,float(_off));\n";
		// str += "}\n";

		return str;
	}
};
// export class CShaderMgrGPU extends CShaderMgr
// {
// 	constructor(_device : CDevice)
// 	{
// 		super(_device);

// 		this.m_keyMap.set("CVec2","vec2f");
// 		this.m_keyMap.set("CVec3","vec3f");
// 		this.m_keyMap.set("CVec4","vec4f");
// 		this.m_keyMap.set("CMat3","mat3x3f");
// 		this.m_keyMap.set("CMat","mat4x4f");
// 		this.m_keyMap.set("number","let");
// 		this.m_keyMap.set("new","");
// 		//this.m_keyMap.set("out_position","gl_position");
// 		this.m_keyMap.set("UniToSam2D","let");
// 		//this.m_keyMap.set("screenPos", "gl_FragCoord");

// 		this.m_keyMap.set("V3Dot","dot");
// 		this.m_keyMap.set("CMath.","");
// 		this.m_keyMap.set("Math.","");
// 		this.m_keyMap.set(".uniOff","");
// 		this.m_keyMap.set(".dummy","");
// 		this.m_keyMap.set("TexSizeHalfInt",(CDevice.GetProperty(CDevice.eProperty.Sam2DWriteX))+"");
// 		this.m_keyMap.set("TexSizeHalfFloat",(CDevice.GetProperty(CDevice.eProperty.Sam2DWriteX))+".0");
// 		this.m_keyMap.set("export","");
		
// 		for(var each0 in SDF)
// 		{
// 			for(var each1 in SDF[each0])
// 			{
// 				this.m_keyMap.set("SDF"+"."+each0+"."+each1,SDF[each0][each1]+".0");
// 			}
// 			//CConsol.Log(each0);
// 		}
		
// 	}
// 	Init()
// 	{
		
// 	}
// 	async Compile(_fileName : string,_string : string)
// 	{
// 		this.Init();
// 		await super.Compile(_fileName,_string);
// 		this.m_shaderList.m_key=_fileName;
// 	}
	
// 	Compare(_keyword : string,_off) : number
// 	{
// 		return 0;
// 	}
// 	BuildVSUni(_shader : CShader,_in : Array<string>,_vsLine : string,_psLine : string) : string
// 	{
// 		return "";
// 	}
	
	
// 	Build()
// 	{
		
		

// 	}
// 	DataTypeAddCount(_eachCount)
// 	{
		
// 		switch (_eachCount)
// 		{
// 		case 16:
// 			return "mat4x4f";
// 		case 4:
// 			return "vec4f";
// 		case 3:
// 			return "vec3f";
// 		case 2:
// 			return "vec2f";
// 		case 1:
// 			return "f32";
// 		}
		
	
// 		CAlert.E("error!");
// 		return "Null";
// 	}
// 	AttachFun(_useFun : Array<string>, _addedFun : Array<string> = null)
// 	{
// 		if(_addedFun === null) {
// 			_addedFun = [];
// 		}

// 		let funStr="";
// 		const vfCount=new Array(CVertexFormat.eIdentifier.Count).fill(0);

// 		for(const funKey of _useFun) {
// 			const fun = this.m_function.get(funKey);

// 			let tempStr = "";
// 			switch(fun.m_return) {
// 				case "CVec4":
// 					tempStr += "vec4f";
// 					break;
// 				case "CVec3":
// 					tempStr += "vec3f";
// 					break;
// 				case "CVec2":
// 					tempStr += "vec2f";
// 					break;
// 				case "CMat":
// 					tempStr += "mat4x4f";
// 					break;
// 				case "CMat3":
// 					tempStr += "mat3x3f";
// 					break;
// 				case "number":
// 					tempStr += "f32";
// 					break;
// 				default:
// 					tempStr += "void";
// 			}
// 			tempStr += " "+funKey+"(";
// 			for(var i=0;i<fun.m_para.length;++i)
// 			{
// 				if(i!=0)
// 				tempStr+=",";
// 				var vf=this.VFPasing(fun.m_para[i],vfCount);
// 				switch(vf.eachCount)
// 				{
// 					case 1:tempStr+="f32";break;
// 					case 2:tempStr+="vec2f";break;
// 					case 3:tempStr+="vec3f";break;
// 					case 4:tempStr+="vec4f";break;
// 					case 16:tempStr+="mat4x4f";break;
// 				}
// 				tempStr+=" "+vf.text;
// 			}
// 			tempStr+="){" + fun.m_line;

// 			let arrFun = [];
// 			_addedFun.push(..._useFun);
// 			for(let usedFun of fun.m_useFun) {
// 				if(_addedFun.indexOf(usedFun) == -1) {
// 					arrFun.push(usedFun);
// 				}
// 			}
// 			funStr += this.AttachFun(arrFun, _addedFun);
// 			funStr += tempStr;
// 		}


// 		return funStr;
// 	}
// 	VPFun()
// 	{
// 		var str="";

// 		str += "fn LWVPMul(pa_local : vec3f,world : mat4x4f,view  : mat4x4f,proj  : mat4x4f)->vec4f\n";
// 		str += "{\n";
// 		str += "	return proj*view*world*vec4f(pa_local,1.0);\n";
// 		str += "}\n";
// 		str += "fn LSWVPMul(_vertex : vec3f,_local : mat4x4f,_world : mat4x4f,_view  : mat4x4f,_proj  : mat4x4f)->vec4f\n";
// 		str += "{\n";
// 		str += "	return _proj*_view*_world*_local*vec4f(_vertex,1.0);\n";
// 		str += "}\n";
// 		str += "fn Sam2D0ToColor(_uv : vec2f)->vec4f\n";
// 		str += "{\n";
// 		str += "	return textureSample(sam2DTex0, sam2DSam0, _uv);\n";
// 		str += "}\n";
// 		str += "fn RGBAAdd(_a : vec4f,_b : vec4f)->vec4f\n";
// 		str += "{\n";
// 		str += "	return clamp(_a+_b, vec4f(0.0,0.0,0.0,0.0), vec4f(1.0,1.0,1.0,1.0));\n";
// 		str += "}\n";

// 		return str; 
// 	}
// 	PSFun()
// 	{
// 		return "";
// 	}
// }

import CShaderInterpret_imple from "../render_imple/CShaderInterpret.js";
import { CConsol } from "../basic/CConsol.js"
CShaderInterpret_imple();


