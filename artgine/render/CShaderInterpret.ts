import {CDevice} from "./CDevice.js"
import {CJSON} from "../basic/CJSON.js"
import {CObject} from "../basic/CObject.js"
import {CAlert} from "../basic/CAlert.js"
import {CShader,CShaderList, CVertexFormat} from "./CShader.js"
import { SDF } from "../z_file/SDF.js"
import {CFile} from "../system/CFile.js"
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

// ---- 2차 IR 스키마 ----------------------------------------------------------

/**
 * 식 노드. k 종류는 imple 의 BuildExpr 참고
 *
 * vtype 은 InferType 이 채우는 추론 타입이다. DSL 타입 이름을 그대로 쓴다
 * (float/int/bool/CVec2/CVec3/CVec4/CMat/CMat3/...). 모르면 "".
 * GLSL 은 암묵 변환이 있어서 없어도 됐지만 WGSL 은 이 정보 없이 코드 생성이 안 된다.
 */
export interface CShaderIRExpr
{
	k : string;
	name? : string;
	op? : string;
	v? : string;
	/** InferType 이 채우는 추론 타입. 백엔드 중립 이름 */
	vtype? : string;
	l? : CShaderIRExpr;
	r? : CShaderIRExpr;
	e? : CShaderIRExpr;
	i? : CShaderIRExpr;
	c? : CShaderIRExpr;
	t? : CShaderIRExpr;
	f? : CShaderIRExpr;
	args? : Array<CShaderIRExpr>;
	prefix? : boolean;
	code? : string;
}
/** 문장 노드. k 종류는 imple 의 BuildStmtInto 참고 */
export interface CShaderIRStmt
{
	k : string;
	name? : string;
	type? : string;
	/**
	 * InferType 이 채우는 추론 타입(var 문장). type 은 소스에 적힌 어노테이션 그대로 두고
	 * 추론 결과는 여기에만 쓴다. 기존 백엔드(GL)가 type 을 읽고 있어서 덮으면 출력이 바뀐다.
	 */
	vtype? : string;
	init? : CShaderIRExpr;
	expr? : CShaderIRExpr;
	cond? : CShaderIRExpr;
	inc? : CShaderIRExpr;
	forInit? : CShaderIRStmt;
	then? : Array<CShaderIRStmt>;
	else? : Array<CShaderIRStmt>;
	body? : Array<CShaderIRStmt>;
	tag? : string;
	code? : string;
}
/** 글로벌 변수의 초기화식. Null() / Sam2DArrV4(1,SDF.eUni.V4LightDir) / 0.0 등 */
export interface CShaderIRInit
{
	/** 호출식이면 함수명, 리터럴/식별자면 "Value" */
	kind : string;
	/** 인자 텍스트. 문자열 리터럴은 따옴표를 벗겨서 담는다 */
	params : Array<string>;
	/**
	 * 초기화식 원문(공백 정리만 한 DSL 텍스트). 따옴표가 살아있다.
	 * BuildVSUni 가 Attribute(0,"time") 의 태그를 따옴표째 쓰기 때문에 원문이 필요하다.
	 */
	raw : string;
}
export interface CShaderIRGlobal
{
	name : string;
	/** 타입 어노테이션 원문. CMat, CVec4, number, Sam2DArrV4, sampler2D 등 */
	type : string;
	/** 초기화식 없으면 null */
	init : CShaderIRInit;
}
/** const 선언. uniform 이 아니라 컴파일타임 치환용 매크로다 */
export interface CShaderIRConst
{
	name : string;
	value : string;
}
export interface CShaderIRParam
{
	name : string;
	type : string;
}
export interface CShaderIRLocal
{
	name : string;
	type : string;
	/** InferType 이 채우는 추론 타입. 어노테이션이 있으면 그것과 같다 */
	vtype? : string;
}
/** BranchBegin..BranchEnd 한 구간. CShaderBranch 와 1:1 */
export interface CShaderIRBranch
{
	tag : string;
	/** 변종 키에 덧붙는 키워드 */
	keyword : string;
	/** 이 구간이 선택될 때 추가로 필요한 uniform 이름들 */
	attribute : Array<string>;
	/** 빌드 참조 후 "vs" / "ps" 로 채워진다 */
	type : string;

	code : string;
	stmts : Array<CShaderIRStmt>;
	useFun : Array<string>;
	callFun : Array<string>;

	hasDefault : boolean;
	defaultCode : string;
	defaultStmts : Array<CShaderIRStmt>;
	defaultUseFun : Array<string>;
	defaultCallFun : Array<string>;
}
export interface CShaderIRFun
{
	name : string;
	return : string;
	params : Array<CShaderIRParam>;
	/** 병합된 IR에 선언이 존재하는 함수 중 실제로 호출한 것 */
	useFun : Array<string>;
	/** 호출한 모든 이름(빌트인 포함). 병합 후 useFun 을 다시 계산하는 근거 */
	callFun : Array<string>;
	/** 본문 평문. 디버그/비교용이고 Emit 은 stmts 를 쓴다 */
	body : string;
	/** 본문 구조화 트리. Branch 구간은 {k:"branch",tag} 마커로 남는다 */
	stmts : Array<CShaderIRStmt>;
	/** 본문 전체(중첩 블록/브랜치 포함)의 지역 변수 선언 평탄화 */
	locals : Array<CShaderIRLocal>;
	branches : Array<CShaderIRBranch>;
}
export interface CShaderIRBuild
{
	key : string;
	tag : Array<string>;
	tagMain : Array<string>;
	vs : string;
	ps : string;
	vsUni : Array<string>;
	vsOut : Array<string>;
	psOut : Array<string>;
	insCount : number;
	branchUse : Array<string>;
}
export interface CShaderIRImport
{
	from : string;
	names : Array<string>;
	/** 본문을 가져와야 하는 import 인지. Shader/SDF 스텁과 엔진 모듈은 false */
	follow : boolean;
}
export interface CShaderIRDiag
{
	level : string;
	msg : string;
	file : string;
}
export interface CShaderIR
{
	version : number;
	source : string;
	/** 병합된 IR이면 참여한 파일 목록 */
	files : Array<string>;
	imports : Array<CShaderIRImport>;
	consts : Array<CShaderIRConst>;
	globals : Array<CShaderIRGlobal>;
	functions : Array<CShaderIRFun>;
	builds : Array<CShaderIRBuild>;
	diagnostics : Array<CShaderIRDiag>;
}

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
	/**
	 * 본문에서 값을 다시 대입하는 파라미터 이름.
	 * GLSL 은 파라미터가 지역 복사본이라 그냥 되지만 WGSL 은 불변이라
	 * 백엔드가 지역 변수로 한 번 받아줘야 한다.
	 */
	public mAssignPara=new Set<string>();
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

export class CShaderInterpret
{
	public mKeyMap=new Map<string,string>();

	mVFDummy=new CVertexFormat();
	mFile="";
	public mSource="";
	public mFunction =new  Map<string,CShaderFun>();

	public mGlobalVar=new Map<string,CShaderIn>();
	public mBuild=new Array<CShaderBuild>();
	public mSam2DCount=0;
	public mSam2DArrCount=0;
	public mSamCubeCount=0;
	public mShaderList=new CShaderList();

	public mAST : any=null;
	public mIR : CShaderIR=null;

	constructor()
	{
	

	}
	GetShaderList()	{	return this.mShaderList;	}
	New()
	{
		var obj=this as any;
		return new obj.constructor() as this;	
	}
	
	async Exe(_fileName : string,_source : string)
	{

	}
	async ExeOne(_fileName : string,_source : string) : Promise<CShaderIR>
	{
		return null;
	}
	async ExeAll(_fileName : string,_source : string,
		_load : (_path : string)=>Promise<string>=null) : Promise<CShaderIR>
	{
		return null;
	}
	async BuildAST(_source : string) : Promise<any>
	{
		return null;
	}
	BuildIR(_ast : any) : CShaderIR
	{
		return null;
	}
	GetAST()	{	return this.mAST;	}
	GetIR()		{	return this.mIR;	}
	ExportASTJSON(_indent=2)	{	return JSON.stringify(this.mAST,null,_indent);	}
	ExportIRJSON(_indent=2)		{	return JSON.stringify(this.mIR,null,_indent);	}

	protected Emit(_ir : CShaderIR)
	{

	}
	protected Build()
	{

	}
	protected DataTypeAddCount(_eachCount){	return "";	};
	
	protected CutTypeName(_string : string)
	{
		
			
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
	VFPasing(_str : string,_vfCount : Array<number>,vf : CVertexFormat=new CVertexFormat()) : CVertexFormat
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
		this.mKeyMap.set("Array16","float");
		this.mKeyMap.set("CMat43","mat3x4");
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
		this.mKeyMap.set("screenDepth", "gl_FragDepth");
		this.mKeyMap.set("int","int");
		//if(CWASM.IsWASM())
		//this.mKeyMap.set("CMat12","mat4x3");
		//else
		//	this.mKeyMap.set("CMat12","mat4");

		this.mKeyMap.set("V3Dot","dot");
		this.mKeyMap.set("CMath.","");
		this.mKeyMap.set("Math.","");
		this.mKeyMap.set(".uniOff","");
		this.mKeyMap.set(".dummy","");
		//this.mKeyMap.set("TexSizeHalfInt",(CDevice.GetProperty(CDevice.eProperty.Sam2DSize))+"");
		//this.mKeyMap.set("TexSizeHalfFloat",(CDevice.GetProperty(CDevice.eProperty.Sam2DSize))+".0");
		this.mKeyMap.set("export","");
		SDF.TexSizeMax=CDevice.GetProperty(CDevice.eProperty.Sam2DSize);
		SDF.FloatTex16=CDevice.GetProperty(CDevice.eProperty.FloatTex16);
		SDF.ClipControl=CDevice.GetProperty(CDevice.eProperty.ClipControl);
		for(var each0 in SDF)
		{
			if(typeof SDF[each0] =="object")
			{
				for(var each1 in SDF[each0])
				{
					this.mKeyMap.set("SDF"+"."+each0+"."+each1,SDF[each0][each1]+".0");
				}
			}
			else
			{
				this.mKeyMap.set("SDF"+"."+each0,SDF[each0]);
			}
			
			//CConsol.Log(each0);
		}
		
	}
	Init()
	{
		
	}
	override async Exe(_fileName : string,_source : string)
	{
		this.Init();
		await super.Exe(_fileName,_source);
		this.mShaderList.mKey=_fileName;
	}
	
	
	override Emit(_ir : CShaderIR)
	{

	}
	EmitStmts(_arr : Array<CShaderIRStmt>) : string
	{
		return "";
	}
	EmitExpr(_e : CShaderIRExpr) : string
	{
		return "";
	}
	BuildVSUni(_shader : CShader,_in : Array<string>) : string
	{
		return "";
	}

	
	override Build()
	{
		
		

	}
	override DataTypeAddCount(_eachCount)
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
	AttachFun(_useFun : Set<string>, _functionMap : Map<string, CShaderFun>,_addedFun : Array<string> = null)
	{
		if(_addedFun === null) {
			_addedFun = [];
		}

		let funStr="";
		const vfCount=new Array(CVertexFormat.eIdentifier.Count).fill(0);

		for(const funKey of _useFun) {

			if(_addedFun.indexOf(funKey)!=-1)	continue;
			// if(funKey=="BayerFilter")
			// {
			// 	CConsol.Log("BayerFilter");
			// }


			const fun = _functionMap.get(funKey);

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
				var vf=this.VFPasing(fun.mPara[i],vfCount,this.mVFDummy);
				switch(vf.eachCount)
				{
					case 1:
						//지우지 마라. 인테져 대응 임시 코드
						// if(vf.text.indexOf("Integer")!=-1)
						// 	tempStr+="int";
						// else
							tempStr+="float";
					break;
					case 2:tempStr+="vec2";break;
					case 3:tempStr+="vec3";break;
					case 4:tempStr+="vec4";break;
					case 16:tempStr+="mat4";break;
				}
				
				
				tempStr+=" "+vf.text;
			}
			tempStr+="){" + fun.mLine+"}";

			let arrFun = new Set<string>;
			_addedFun.push(funKey);
			for(let usedFun of fun.mUseFun) {
				if(_addedFun.indexOf(usedFun) == -1) {
					arrFun.add(usedFun);
				}
			
			}
			funStr += this.AttachFun(arrFun, _functionMap,_addedFun);
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

		
		str += "mat4 Mat34ToMat(mat3x4 _wmat)\n";
		str += "{\n";
		str += "    mat4 m = mat4(1.0);\n";
		str += "m[0] = vec4(_wmat[0][0], _wmat[1][0], _wmat[2][0],0.0);\n";
		str += "m[1] = vec4(_wmat[0][1], _wmat[1][1], _wmat[2][1],0.0);\n";
		str += "m[2] = vec4(_wmat[0][2], _wmat[1][2], _wmat[2][2],0.0);\n";
		str += "m[3] = vec4(_wmat[0][3], _wmat[1][3], _wmat[2][3],1.0);\n";
		str += "    return m;\n";
		str += "}\n";

		// str += "mat4 MatTypeToMat(float _type,vec4 _mat41,mat4x2 _mat42,mat4x3 _mat43,mat _mat44)\n";
		// str += "{\n";
		// str += "    mat4 m = mat4(1.0);\n";
		// str += "	if(_type>0.5){\n";

		// str += "	}\n";

		// str += "m[0] = vec4(_wmat[0][0], _wmat[1][1], _wmat[2][2],0.0);\n";
		// str += "m[1] = vec4(_wmat[0][1], _wmat[1][2], _wmat[3][0],0.0);\n";
		// str += "m[2] = vec4(_wmat[0][2], _wmat[2][0], _wmat[3][1],0.0);\n";
		// str += "m[3] = vec4(_wmat[1][0], _wmat[2][1], _wmat[3][2],1.0);\n";
		// str += "    return m;\n";
		// str += "}\n";

		str += "mat4 MatTypeToMat(float _type, vec4 _short, mat4 _mat)\n";
		str += "{\n";
		

		str += "    if(_type < 13.5){\n";
		str += "    	mat4 m = mat4(1.0);\n";
		str += "        m[0] = vec4(_short.z,0.0,0.0,0.0);\n";
		str += "        m[1] = vec4(0.0,_short.w,0.0,0.0);\n";
		str += "        m[3] = vec4(_short.xy,1.0,1.0);\n";
		str += "    	return m;\n";
		str += "    }\n";
		str += "    else if(_type < 14.5){\n";
		str += "    	mat4 m = mat4(1.0);\n";
		str += "        m[0] = vec4(_short.w,0.0,0.0,0.0);\n";
		str += "        m[1] = vec4(0.0,_short.w,0.0,0.0);\n";
		str += "        m[2] = vec4(0.0,0.0,_short.w,0.0);\n";
		str += "        m[3] = vec4(_short.xyz, 1.0);\n";
		str += "    	return m;\n";
		str += "    }\n";
		

		str += "    return _mat;\n";
		str += "}\n";

		
		
	
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

		//hash
		str += "float Hash11(float _p)\n";
		str += "{\n";
		str += "	_p = fract(_p * 0.1031);\n";
		str += "	_p *= _p * 33.33;\n";
		str += "	_p *= _p + _p;\n";
		str += "	return fract(_p);\n";
		str += "}\n";
		str += "float Hash12(vec2 _p)\n";
		str += "{\n";
		str += "	vec3 p3 = fract(_p.xyx * 0.1031);\n";
		str += "	p3 += dot(p3, p3.yzx + 33.33);\n";
		str += "	return fract((p3.x + p3.y) * p3.z);\n";
		str += "}\n";
		str += "float Hash13(vec3 _p)\n";
		str += "{\n";
		str += "	_p = fract(_p * 0.1031);\n";
		str += "	_p += dot(_p, _p.zyx + 33.33);\n";
		str += "	return fract((_p.x + _p.y) * _p.z);\n";
		str += "}\n";
		str += "float Hash14(vec4 _p)\n";
		str += "{\n";
		str += "	_p = fract(_p * vec4(0.1031, 0.1030, 0.0973, 0.1099));\n";
		str += "	_p += dot(_p, _p.wzxy + 33.33);\n";
		str += "	return fract((_p.x + _p.y) * (_p.z + _p.w));\n";
		str += "}\n";

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
        str+="mat4 TransposeMat4(mat4 inMatrix)";
        str+="{\n";
		str+="  vec4 i0=inMatrix[0];";
		str+="  vec4 i1=inMatrix[1];";
		str+="  vec4 i2=inMatrix[2];";
        str+="  vec4 i3=inMatrix[3];";
		str+="  mat4 outMat=mat4(vec4(i0.x,i1.x,i2.x,i3.x),vec4(i0.y,i1.y,i2.y,i3.y),vec4(i0.z,i1.z,i2.z,i3.z),vec4(i0.w,i1.w,i2.w,i3.w));";
		str+="	return outMat;\n";
        str+="}\n";

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
		str += "vec2 V2DivFloat(vec2 _a,float _b)\n";
		str += "{\n";
		str += "	return _a/_b;\n";
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
		str += "vec2 V2Fract(vec2 _a)\n";
		str += "{\n";
		str += "	return fract(_a);\n";
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
        str += "vec3 V3Sqrt(vec3 _a)\n";
		str += "{\n";
		str += "	return sqrt(_a);\n";
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
		str += "vec4 V4Exp(vec4 _a)\n";
		str += "{\n";
		str += "	return exp(_a);\n";
		str += "}\n";
		str += "vec4 V4Fract(vec4 _a)\n";
		str += "{\n";
		str += "	return fract(_a);\n";
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
		str += "vec2 V2Mix(vec2 val0,vec2 val1,float fac)\n";
		str += "{\n";
		str += "	val0 = mix(val0, val1, fac);\n";
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
        str += "int FloatBitsToInt(float _a)\n";
		str += "{\n";
		str += "	return floatBitsToInt(_a);\n";
		str += "}\n";
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
		
        
        str += "vec4 Sam2DToV4(vec2 _uni,float _off) {\n";
		str += "	ivec2 ts;\n";
		str += "	vec2 uv;\n";
		str += "	if(_uni.x-0.5<=0.0) {";
		str += "		ts = textureSize(sam2D[0],0);";
		str += "		uv = vec2((float(_off)+0.5)/float(ts.x), (float(_uni.y)+0.5)/float(ts.y));";
		str += "		return texture(sam2D[0],uv);";
		str += "	}\n";
		for (var j = 1; j < CDevice.GetProperty(CDevice.eProperty.Sam2DMax); ++j)
		{
			str += "	else if(_uni.x-0.5<=" + j + ".0) {";
			str += "		ts = textureSize(sam2D["+j+"],0);";
			str += "		uv = vec2((float(_off)+0.5)/float(ts.x), (float(_uni.y)+0.5)/float(ts.y));";
			str += "		return texture(sam2D["+j+"],uv);";
			str += "	}\n";
		}
		str += "	return texture(sam2D[0],vec2(0.0,0.0));";
		str += "}\n";


        str += "mat4 Sam2DToMat(vec2 _uni,float _off) {\n";
		str += "return mat4(\n";
		str += "Sam2DToV4(_uni,_off*4.0+0.0),\n";
		str += "Sam2DToV4(_uni,_off*4.0+1.0),\n";
		str += "Sam2DToV4(_uni,_off*4.0+2.0),\n";
		str += "Sam2DToV4(_uni,_off*4.0+3.0)\n";
		str += ");}\n";


		str += "vec4 Sam2DArrToV4(vec3 _uni,float _off) {\n";
		str += "	ivec3 ts;\n";
		str += "	vec3 uv;\n";
		str += "	if(_uni.x-0.5<=0.0) {";
		str += "		ts = textureSize(sam2DArr[0],0);";
		str += "		uv = vec3((float(_off)+0.5)/float(ts.x), (float(_uni.y)+0.5)/float(ts.y), _uni.z);";
		str += "		return texture(sam2DArr[0],uv);";
		str += "	}\n";
		for (var j = 1; j < CDevice.GetProperty(CDevice.eProperty.Sam2DArrMax); ++j)
		{
			str += "	else if(_uni.x-0.5<=" + j + ".0) {";
			str += "		ts = textureSize(sam2DArr["+j+"],0);";
			str += "		uv = vec3((float(_off)+0.5)/float(ts.x), (float(_uni.y)+0.5)/float(ts.y), _uni.z);";
			str += "		return texture(sam2DArr["+j+"],uv);";
			str += "	}\n";
		}
		str += "	return texture(sam2DArr[0],vec3(0.0,0.0,0.0));";
		str += "}\n";

		str += "mat4 Sam2DArrToMat(vec3 _uni,float _off) {\n";
		str += "return mat4(\n";
		str += "Sam2DArrToV4(_uni,_off*4.0+0.0),\n";
		str += "Sam2DArrToV4(_uni,_off*4.0+1.0),\n";
		str += "Sam2DArrToV4(_uni,_off*4.0+2.0),\n";
		str += "Sam2DArrToV4(_uni,_off*4.0+3.0)\n";
		str += ");}\n";
			

		str += "mat4 MatMix(mat4 _a, mat4 _b, float _t) {\n";
		str += "return mat4(\n";
		str += "mix(_a[0], _b[0], _t),\n";
		str += "mix(_a[1], _b[1], _t),\n";
		str += "mix(_a[2], _b[2], _t),\n";
		str += "mix(_a[3], _b[3], _t)\n";
		str += ");}\n";

		str += "vec4 Sam2DToColor(float _off,vec2 _uv)\n";
		str += "{\n";
		for (var j = 0; j < CDevice.GetProperty(CDevice.eProperty.Sam2DMax); ++j)
		{
			str += "	if(_off-0.5<=" + j + ".0)\n";
			str += "		return texture(sam2D[" + j + "],_uv);\n";
			
		}
		str += "	return vec4(0,0,0,1);\n";
		str += "}\n";

		str += "vec4 Sam2DLodToColor(float _off,vec2 _uv,float _lod)\n";
		str += "{\n";
		for (var j = 0; j < CDevice.GetProperty(CDevice.eProperty.Sam2DMax); ++j)
		{
			str += "	if(_off-0.5<=" + j + ".0)\n";
			str += "		return textureLod(sam2D[" + j + "],_uv,_lod);\n";
			
		}
		str += "	return vec4(0,0,0,1);\n";
		str += "}\n";

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

        str += "vec2 SamCubeSize(float _off)\n";
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
		str += "    return vec2(float(ts.x), float(ts.y));\n";
		str += "}\n";
		
		return str;
	}
	
	PSFun()
	{
		var str="";

		//ps
		//if(this.m_device.PF().m_renderer==Df.Render.GL2)
		//{

		str += "float SamCubeMaxLod(float _off)\n";
		str += "{\n";
        str += "    vec2 ts = SamCubeSize(_off);\n";
        str += "    float size = max(ts.x, ts.y);\n";
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
		
		
		
		
	

		
		str += "vec4 Sam2D0ToColor(vec2 _uv)\n";
		str += "{\n";
		str += "	return texture(sam2D[0],_uv);\n";
		str += "}\n";
		
        str += "vec4 Sam2DGradToColor(float _off,vec2 _uv,vec2 _dx,vec2 _dy)\n";
		str += "{\n";
		for (var j = 0; j < CDevice.GetProperty(CDevice.eProperty.Sam2DMax); ++j)
		{
			str += "	if(_off-0.5<=" + j + ".0)\n";
			str += "		return textureGrad(sam2D[" + j + "],_uv,_dx,_dy);\n";
		}
		str += "	return vec4(0,0,0,1);\n";
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

        str += "vec4 Sam2DArrGradToColor(float _off,vec3 _uv,vec2 _dx,vec2 _dy)\n";
		str += "{\n";
		for (var j = 0; j < CDevice.GetProperty(CDevice.eProperty.Sam2DArrMax); ++j)
		{
			str += "	if(_off-0.5<=" + j + ".0)\n";
			str += "		return textureGrad(sam2DArr[" + j + "],_uv,_dx,_dy);\n";
			
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
	
		
		
		str += "vec3 ParallaxNormal(vec3 TangentViewPos,vec3 TangentFragPos,float _index,vec2 _uv,float height_scale)\n";
		str += "{\n";
		str += "	const float minLayers = 8.0;const float maxLayers = 32.0;\n";
		str += "	vec3 viewDir   = normalize(TangentViewPos - TangentFragPos);\n";
		str += "	float numLayers = mix(maxLayers, minLayers, abs(dot(vec3(0.0, 0.0, 1.0), viewDir)));\n";
		str += "	float layerDepth = 1.0 / numLayers;\n";
		str += "	float currentLayerDepth = 0.0;\n";
		str += "	viewDir.z += 0.2;\n";
		str += "	vec2 P = viewDir.xy / viewDir.z * height_scale;\n";
		str += "	vec2 deltaTexCoords = P / numLayers;\n";
		str += "	vec2  currentTexCoords     = _uv;\n";
		//str += "	deltaTexCoords.y=-deltaTexCoords.y;\n";//uv좌표계가 반대라서 이렇게
		str += "	float currentDepthMapValue = 1.0-Sam2DLodToColor(_index, currentTexCoords, 0.0).a;\n";
		str += "	for(int i=0;i<128;++i){\n";
		str += "		if(currentLayerDepth < currentDepthMapValue){\n";
		str += "			currentTexCoords -= deltaTexCoords;\n";
		str += "			currentDepthMapValue = 1.0-Sam2DLodToColor(_index, currentTexCoords, 0.0).a;\n";
		str += "			currentLayerDepth += layerDepth;\n";
		str += "		}	else	{break;}\n";
		str += "	}\n";
		str += "	vec2 prevTexCoords = currentTexCoords + deltaTexCoords;\n";
		str += "	float afterDepth  = currentDepthMapValue - currentLayerDepth;\n";
		str += "	float beforeDepth = 1.0-Sam2DLodToColor(_index, prevTexCoords, 0.0).a - currentLayerDepth + layerDepth;\n";
		str += "	float weight = afterDepth / (afterDepth - beforeDepth);\n";
		str += "	vec2 newUv = prevTexCoords * weight + currentTexCoords * (1.0 - weight);\n";
		str += "	currentLayerDepth += beforeDepth * weight + afterDepth * (1.0 - weight);\n";
		str += "	return vec3(newUv, height_scale * currentLayerDepth / viewDir.z);\n";
		str += "}\n";
		





		// let sammax4=CDevice.GetProperty(CDevice.eProperty.Sam2DWriteY)/4;
		// let sammax16=CDevice.GetProperty(CDevice.eProperty.Sam2DWriteY)/16;
		//textureSize(sam2D[" + j + "],0);

        // str += "vec4 Sam2DTileToColor(float _off,vec2 _uv)\n";
		// str += "{\n";
        // str += "    const float BLEND = 0.1;\n";
        // str += "    const vec2 CS_TABLE[4] = vec2[4](\n";
        // str += "        vec2( 1.0,  0.0),\n";
        // str += "        vec2( 0.0,  1.0),\n";
        // str += "        vec2(-1.0,  0.0),\n";
        // str += "        vec2( 0.0, -1.0) \n";
        // str += "    );\n";
        // str += "    vec2 iUV = floor(_uv);\n";
        // str += "    vec2 fUV = fract(_uv);\n";
        // str += "    vec2 f05 = fUV - 0.5;\n";
        // str += "    vec2 ddx = dFdx(_uv);\n";
        // str += "    vec2 ddy = dFdy(_uv);\n";
        // str += "    vec2 cs = CS_TABLE[int(4.0 * Hash12(iUV))];\n";
        // str += "    mat2 rot = mat2(cs.x,-cs.y,cs.y,cs.x);\n";
        // str += "    vec4 col = Sam2DGradToColor(_off,0.5+rot*f05,rot*ddx,rot*ddy);\n";
        // str += "    vec2 w = smoothstep(0.5 - BLEND, 0.5, abs(f05));\n";
        // str += "    vec2 off = sign(f05);\n";
        // str += "    if(w.x > 0.0) {\n";
        // str += "        cs = CS_TABLE[int(4.0 * Hash12(iUV+vec2(off.x,0.0)))];\n";
        // str += "        rot = mat2(cs.x,-cs.y,cs.y,cs.x);\n";
        // str += "        vec2 d = f05 - vec2(off.x, 0.0);\n";
        // str += `		col = mix(col, Sam2DGradToColor(_off,0.5+rot*d,rot*ddx,rot*ddy), w.x*0.5);\n`;
        // str += "    }\n";
        // str += "    if(w.y > 0.0) {\n";
        // str += "        cs = CS_TABLE[int(4.0 * Hash12(iUV+vec2(0.0,off.y)))];\n";
        // str += "        rot = mat2(cs.x,-cs.y,cs.y,cs.x);\n";
        // str += "        vec2 d = f05 - vec2(0.0, off.y);\n";
        // str += `		col = mix(col, Sam2DGradToColor(_off,0.5+rot*d,rot*ddx,rot*ddy), w.y*0.5);\n`;
        // str += "    }\n";
        // str += "    if(w.x > 0.0 && w.y > 0.0) {\n";
        // str += "        cs = CS_TABLE[int(4.0 * Hash12(iUV+off))];\n";
        // str += "        rot = mat2(cs.x,-cs.y,cs.y,cs.x);\n";
        // str += "        vec2 d = f05 - off;\n";
        // str += `		col = mix(col, Sam2DGradToColor(_off,0.5+rot*d,rot*ddx,rot*ddy), w.x*w.y*0.5);\n`;
        // str += "    }\n";
        // str += "    return col;\n";
		// str += "}\n";

        str += "vec4 Sam2DArrTileToColor(float _off,vec3 _uvw,float _x,float _y)\n";
		str += "{\n";
        str += "    vec2 iUV = floor(_uvw.xy);\n";
        str += "    vec2 fUV = fract(_uvw.xy);\n";
        str += "    float h = Hash12(iUV);\n";
        str += "    float doFlipX = step(1.0-_x, h);\n";
        str += "    float doFlipY = step(1.0-_y, fract(h*7.3+0.3));\n";
        str += "    vec2 flipSign = 1.0 - 2.0*vec2(doFlipX,doFlipY);\n";
        str += "    vec2 tiledUV = mix(fUV, 1.0-fUV, vec2(doFlipX,doFlipY));\n";
        str += "    vec2 ddx = dFdx(_uvw.xy)*flipSign;\n";
        str += "    vec2 ddy = dFdy(_uvw.xy)*flipSign;\n";
        str += "    return Sam2DArrGradToColor(_off,vec3(tiledUV,_uvw.z),ddx,ddy);\n";
		str += "}\n";

        str += "vec4 Sam2DArrTileToNormal(float _off,vec3 _uvw,float _x,float _y)\n";
		str += "{\n";
        str += "    vec2 iUV = floor(_uvw.xy);\n";
        str += "    vec2 fUV = fract(_uvw.xy);\n";
        str += "    float h = Hash12(iUV);\n";
        str += "    float doFlipX = step(1.0-_x, h);\n";
        str += "    float doFlipY = step(1.0-_y, fract(h*7.3+0.3));\n";
        str += "    vec2 flipSign = 1.0 - 2.0*vec2(doFlipX,doFlipY);\n";
        str += "    vec2 tiledUV = mix(fUV, 1.0-fUV, vec2(doFlipX,doFlipY));\n";
        str += "    vec2 ddx = dFdx(_uvw.xy)*flipSign;\n";
        str += "    vec2 ddy = dFdy(_uvw.xy)*flipSign;\n";
        str += "    vec4 s = Sam2DArrGradToColor(_off,vec3(tiledUV,_uvw.z),ddx,ddy);\n";
        str += "    vec2 n = s.xy*2.0-1.0;\n";
        str += "    return vec4(n*0.5+0.5,s.z,s.w);\n";
		str += "}\n";
	
		
		// str += "vec4 Sam2DToV4(vec2 _uni,float _off) {\n";
		// str += "	if(_uni.x-0.5<=0.0) {";
		// str += "		return texelFetch(sam2D[0],ivec2(int(_off),int(_uni.y)),0);";
		// str += "	}\n";
		// for (var j = 1; j < CDevice.GetProperty(CDevice.eProperty.Sam2DMax); ++j)
		// {
		// 	str += "	else if(_uni.x-0.5<=" + j + ".0) {";
		// 	str += "		return texelFetch(sam2D["+j+"],ivec2(int(_off),int(_uni.y)),0);";
		// 	str += "	}\n";
		// }
		// str += "	return texelFetch(sam2D[0],ivec2(0.0,0.0),0);\n";
		// str += "}\n";

		// str += "vec4 Sam2DToV4(vec2 _uni,int _off) {\n";
		// str += "	return Sam2DToV4(_uni,float(_off));\n";
		// str += "}\n";
		
        str += "float RadicalInverse_VdC(uint bits)\n";
		str += "{\n";
        str += "    bits = (bits << 16u) | (bits >> 16u);\n";
        str += "    bits = ((bits & 0x55555555u) << 1u) | ((bits & 0xAAAAAAAAu) >> 1u);\n";
        str += "    bits = ((bits & 0x33333333u) << 2u) | ((bits & 0xCCCCCCCCu) >> 2u);\n";
        str += "    bits = ((bits & 0x0F0F0F0Fu) << 4u) | ((bits & 0xF0F0F0F0u) >> 4u);\n";
        str += "    bits = ((bits & 0x00FF00FFu) << 8u) | ((bits & 0xFF00FF00u) >> 8u);\n";
        str += "    return float(bits) * 2.3283064365386963e-10;\n";
		str += "}\n";

        str += "vec2 Hammersley(int i, int N)\n";
		str += "{\n";
        str += "    return vec2(float(i)/float(N), RadicalInverse_VdC(uint(i)));\n";
		str += "}\n";

		//포인트 그림자 PCF 오프셋. 0번이 (1,1,1) 이라 샘플 1개일 때도 대각으로 한 번은 흩어진다
        str += "vec3 gridSamplingDisk[20] = vec3[]\n";
        str += "(\n";
        str += "    vec3(1, 1, 1), vec3(1, -1, 1), vec3(-1, -1, 1), vec3(-1, 1, 1),\n";
        str += "    vec3(1, 1, -1), vec3(1, -1, -1), vec3(-1, -1, -1), vec3(-1, 1, -1),\n";
        str += "    vec3(1, 1, 0), vec3(1, -1, 0), vec3(-1, -1, 0), vec3(-1, 1, 0),\n";
        str += "    vec3(1, 0, 1), vec3(-1, 0, 1), vec3(1, 0, -1), vec3(-1, 0, -1),\n";
        str += "    vec3(0, 1, 1), vec3(0, -1, 1), vec3(0, -1, -1), vec3(0, 1, -1)\n";
        str += ");\n";
        str += "vec3 GridSamplingDisk(float i)\n";
		str += "{\n";
        str += "    return gridSamplingDisk[clamp(int(i),0,19)];\n";
		str += "}\n";

		// str += "mat4 Sam2DToMat(vec2 _uni,int _off) {\n";
		// str += "	return Sam2DToMat(_uni,float(_off));\n";
		// str += "}\n";

		return str;
	}
};

/**
 * WGSL 백엔드.
 *
 * GLSL 과 다른 점이 코드 생성 전략을 가른다.
 *   - 암묵 변환이 없다. int/float 를 섞으면 에러라 IR 의 vtype 으로 캐스팅을 넣는다
 *   - 다중 성분 스위즐 대입이 금지다. v.xy=a -> v=vec3f(a,v.z) 로 재구성한다
 *   - in/out 선언이 없다. 구조체와 진입점 시그니처를 만들어야 한다
 *   - do-while 이 없다. loop + break 로 바꾼다
 *   - 텍스처 배열 바인딩이 없다. GLSL 과 똑같이 상수 인덱스 if-체인으로 편다
 *
 * 식별자 규약(양쪽 스테이지에서 같은 이름이 같은 곳을 가리키게 만든다)
 *   정점 입력 vsi.*   / 베링 vso.*   / 픽셀 출력 pso.*   / 유니폼 uni.*
 * 프래그먼트 진입점의 입력 파라미터 이름도 vso 라서 베링 참조가 스테이지와 무관해진다.
 */
export class CShaderInterpretGPU extends CShaderInterpret
{
	/** 유니폼 구조체/바인드그룹 이름. 런타임(CRendererGPU)과 맞춰야 한다 */
	static kUniStruct="TUni";
	static kUniName="uni";
	static kVSIn="vsi";
	static kVSOut="vso";
	static kPSOut="pso";
	/** 컴퓨트 진입점 입력 구조체 이름. 렌더의 vsi 와 같은 자리다 */
	static kCSIn="csi";

	/** 스테이지별 코드 생성 중 표시. 텍스처 샘플링 함수 선택에 쓴다 */
	mStage="";
	/** WGSL 라이브러리에 아직 없는 내장 함수. 이식 진행도를 재는 용도 */
	mMissFun=new Set<string>();
	/**
	 * 베링을 참조하는 함수. 호출 그래프를 타고 전파한다.
	 * 이 함수들은 진입점 구조체(vso)를 인자로 받아야 한다.
	 * 베링을 var<private> 로 두면 WGSL 균일성 분석이 "비균일"로 보고
	 * 그 값으로 분기한 안쪽의 밉맵 샘플링을 전부 막아버린다.
	 */
	mVsoFun=new Set<string>();

	/**
	 * 균일 제어흐름 안전 모드.
	 *
	 * WGSL 은 밉맵 자동 선택 샘플링(textureSample)을 비균일 분기 안에서 금지한다.
	 * 밉맵 레벨은 옆 픽셀과의 UV 차이로 정하는데, 옆 픽셀이 다른 가지로 갔으면
	 * 그 차이를 구할 수 없기 때문이다. GLSL 은 그냥 통과시켰다.
	 *
	 * 셰이더 소스를 고치지 않고 자동으로 넘기려면 명시적 LOD 로 떨어뜨리는 수밖에 없다.
	 * 기본은 false(화질 우선)이고, 컴파일이 균일성 위반으로 실패한 셰이더만
	 * 이 값을 켜서 다시 생성한다.
	 *
	 * static 인 이유: 셰이더 정의 .ts 파일마다(CLoader.ShaderLoad) 별도 인터프리터
	 * 인스턴스로 파싱되므로, 인스턴스 필드로 두면 한 파일에서 위반이 나도 다른 파일의
	 * 인터프리터는 여전히 false 라 그쪽 셰이더는 계속 실패한다. 위반은 앱 전역에서
	 * 드물게만 나므로, 한 번이라도 걸리면 이후 전부 안전판으로 통일해도 손해가 적다
	 */
	static mUniformSafe=false;

	/**
	 * WGSL 내장 라이브러리의 시그니처 표. 라이브러리 텍스트를 스캔해서 만든다.
	 *   키   : DSL 이름(V3Clamp)
	 *   값   : 후보 목록. 오버로딩은 이름 뒤에 __ 를 붙여 구분한다(V3Clamp__v)
	 * 표를 코드에 박지 않고 라이브러리에서 뽑기 때문에, 함수를 추가하면 호출 해석과
	 * 미이식 검사가 저절로 따라온다.
	 */
	mLibSig : Map<string,Array<{name:string,para:Array<string>,ret:string}>>=null;

	/**
	 * 비균일 제어흐름 안에서 호출되는 함수(전이 포함).
	 * 본문이 한 번만 만들어지므로, 한 곳이라도 분기 안에서 불리면 그 함수 전체를
	 * 비균일로 본다. 이 안의 샘플링은 밉맵 자동 선택을 못 쓴다.
	 */
	mUnsafeFun=new Set<string>();
	/** 코드 생성 중의 비균일 깊이. 0보다 크면 샘플러를 Safe 판으로 바꾼다 */
	mNonUni=0;
	/** 브랜치 마커가 놓인 자리의 비균일 깊이. 브랜치 본문을 같은 깊이로 만들기 위한 것 */
	mTagDepth : Map<string,number>=null;
	/**
	 * 본문에서 대입이 일어나는 스토리지 버퍼 이름.
	 * 여기 있으면 read_write, 없으면 read 로 선언한다 - DSL 에 안 적어도 되게 하려는 것이다.
	 */
	mBufWrite=new Set<string>();

	/**
	 * 비균일 분기 안의 샘플링에 넘길 기울기를, 함수 본문 맨 앞에서 미리 잡아 두는 선언들.
	 *
	 * WGSL 은 비균일 흐름에서 dpdx/암시적 LOD 샘플링을 금지하지만 textureSampleGrad 는
	 * 허용한다. 그래서 기울기 계산만 균일 스코프로 끌어올리면 GL 과 같은 밉을 쓸 수 있다.
	 */
	mGradPre : Array<string>=null;
	/** 끌어올린 식이 써도 되는지 판정용. 여기 있는 이름(지역 변수)을 쓰면 못 끌어올린다 */
	mGradLocal : Set<string>=null;
	/** 지금 자리에서 기울기를 끌어올려도 되는가(브랜치 본문에서는 불가) */
	mGradOn=false;
	/** 끌어올린 기울기 이름의 일련번호 */
	mGradIdx=0;
	/** 스테이지마다 다르게 정의되는 기울기 헬퍼 이름(ps 는 dpdx, vs 는 0) */
	static kDdx="artDdx";
	static kDdy="artDdy";

	/**
	 * screenPos(=GL 의 gl_FragCoord)를 쓰는 셰이더인가.
	 *
	 * WebGPU 의 @builtin(position) 은 Y 가 아래로 가고 GL 은 위로 간다.
	 * 그대로 두면 화면 좌표로 텍스처를 읽는 코드(그림자 등)가 위아래로 뒤집힌다.
	 * 그래서 뷰포트 높이를 받아 Y 를 되돌린 값을 따로 만들어 쓴다.
	 */
	mUseScreenPos=false;
	/** 뷰포트 크기를 넘겨받는 예약 유니폼 이름 */
	static kViewPort="viewPort";
	/** 되돌린 화면 좌표를 담는 지역 이름 */
	static kScreenPos="artScreenPos";
	/**
	 * invocationID(컴퓨트 스레드 번호)를 담는 이름.
	 *
	 * screenPos 와 같은 이유로 var<private> 다 - 진입점의 지역으로 두면 헬퍼 함수가 못 본다.
	 * DSL 이 number 로 선언하므로 f32 로 받는다(u32 그대로면 본문의 float 연산과 안 맞는다).
	 */
	static kInvID="artInvID";
	/**
	 * 이번 디스패치의 스레드 수를 받는 예약 유니폼 이름.
	 *
	 * viewPort/renderTarget 과 같은 부류다 - 셰이더가 선언하지 않아도 컴퓨트 빌드에 항상
	 * 들어가고 런타임(ComputeDispatch)이 채운다. 진입점의 자동 경계 검사가 이걸 본다.
	 */
	static kInvCount="invocationCount";
	/**
	 * 컴퓨트 스토리지 버퍼의 바인드그룹 번호.
	 *
	 * group(1) 은 렌더와 같이 텍스처 자리로 비워둔다 - 컴퓨트에서도 텍스처를 읽게 될 때
	 * 배치가 렌더와 어긋나지 않게 하려는 것이다(WGSL 은 컴퓨트에서 textureSampleLevel 을
	 * 허용하고, 라이브러리의 vs 판이 이미 그걸 쓴다).
	 * 인터프리터와 런타임이 같은 값을 봐야 해서 여기 둔다.
	 */
	static kStorageGroup=2;
	/**
	 * 워크그룹 크기를 정하는 예약 전역 이름. 셰이더에 `var wgSize : number = 128;` 처럼
	 * 적으면 그 값이 쓰이고, 없으면 kWGSize 다.
	 *
	 * 유니폼으로는 못 받는다 - WGSL 의 @workgroup_size 는 컴파일 타임 상수라서,
	 * Array<T> 의 크기를 초기값에서 읽는 것과 같은 방식으로 선언에서 가져온다.
	 */
	static kWGName="wgSize";
	/**
	 * 워크그룹 크기 기본값. 정점 하나에 스레드 하나인 커널에서는 알고리즘과 무관한
	 * 튜닝값이고, 32(NVIDIA)/64(AMD) 양쪽으로 나누어떨어져 낭비가 없다.
	 */
	static kWGSize=64;
	/**
	 * 클립 Y 부호를 받는 예약 유니폼 이름.
	 *
	 * 엔진은 GL 규약(텍스처 v=0 이 그림의 아래)으로 쓰여 있다. GL 은 렌더타겟을
	 * 아래에서 위로 채우지만 WebGPU 는 위에서 아래로 채우므로, 그대로 두면
	 * 렌더타겟을 샘플링하는 셰이더가 전부 상하 반전으로 읽는다.
	 * 오프스크린 RT 에 그릴 때만 -1 을 넣어 클립 Y 를 뒤집어서, RT 메모리 배치를
	 * GL 과 동일하게 맞춘다. 화면(캔버스)에 직접 그릴 때는 +1 이다.
	 */
	static kRenderTarget="renderTarget";
	/** OutPosition 전역의 이름. 화면 좌표 보정에 쓴다 */
	mPosName="";
	/** 이 셰이더가 선언한 텍스처 개수. 바인드그룹 레이아웃과 맞춰야 한다 */
	mTexCount=0;
	mTexArrCount=0;
	mTexCubeCount=0;

	/**
	 * group(1) 텍스처 바인딩 번호. 런타임(CRendererGPU)이 같은 식으로 계산해야 한다.
	 *   2D   : [0,        2*tex)                  텍스처 2j, 샘플러 2j+1
	 *   Array: [2*tex,    2*tex+2*arr)
	 *   Cube : [2*tex+2*arr, ...)
	 */
	static TexBinding(_kind : string,_index : number,_texMax : number,_arrMax : number)
	{
		if(_kind=="2d")		return _index*2;
		if(_kind=="arr")	return _texMax*2+_index*2;
		return _texMax*2+_arrMax*2+_index*2;
	}

	constructor()
	{
		super();

		this.mKeyMap.set("CVec2","vec2f");
		this.mKeyMap.set("CVec3","vec3f");
		this.mKeyMap.set("CVec4","vec4f");
		this.mKeyMap.set("CMat3","mat3x3f");
		this.mKeyMap.set("CMat","mat4x4f");
		this.mKeyMap.set("CMat12","mat4x3f");
		this.mKeyMap.set("CMat42","mat2x4f");
		this.mKeyMap.set("CMat43","mat3x4f");
		this.mKeyMap.set("number","f32");
		this.mKeyMap.set("float","f32");
		this.mKeyMap.set("int","i32");
		this.mKeyMap.set("bool","bool");
		this.mKeyMap.set("Instance1","f32");
		this.mKeyMap.set("Instance2","vec2f");
		this.mKeyMap.set("Instance3","vec3f");
		this.mKeyMap.set("Instance4","vec4f");
		this.mKeyMap.set("Instance16","mat4x4f");
		this.mKeyMap.set("new","");
		this.mKeyMap.set("export","");

		this.mKeyMap.set("V3Dot","dot");
		this.mKeyMap.set("CMath.","");
		this.mKeyMap.set("Math.","");
		this.mKeyMap.set(".uniOff","");
		this.mKeyMap.set(".dummy","");
		//mod 는 WGSL 예약어라 함수 이름으로 못 쓴다. 라이브러리에서 ModF 로 정의한다
		this.mKeyMap.set("mod","ModF");
		//화면 미분 내장 함수는 이름만 다르다
		this.mKeyMap.set("dFdx","dpdx");
		this.mKeyMap.set("dFdy","dpdy");

		//WGSL 은 클립 공간이 원래 0..1 이라 reverse-Z 가 공짜다. GL 의 EXT_clip_control 대응값
		SDF.TexSizeMax=CDevice.GetProperty(CDevice.eProperty.Sam2DSize);
		SDF.FloatTex16=CDevice.GetProperty(CDevice.eProperty.FloatTex16);
		SDF.ClipControl=1;
		for(var each0 in SDF)
		{
			if(typeof SDF[each0] =="object")
			{
				for(var each1 in SDF[each0])
					this.mKeyMap.set("SDF"+"."+each0+"."+each1,SDF[each0][each1]+".0");
			}
			else
				this.mKeyMap.set("SDF"+"."+each0,SDF[each0]);
		}
	}
	Init()
	{

	}
	override async Exe(_fileName : string,_source : string)
	{
		this.Init();
		await super.Exe(_fileName,_source);
		this.mShaderList.mKey=_fileName;
	}
	override Emit(_ir : CShaderIR)
	{

	}
	EmitStmts(_arr : Array<CShaderIRStmt>) : string
	{
		return "";
	}
	EmitExpr(_e : CShaderIRExpr) : string
	{
		return "";
	}
	/** 식을 _want 타입으로 맞춰서 낸다. WGSL 은 암묵 변환이 없어서 이게 필수다 */
	EmitCast(_e : CShaderIRExpr,_want : string) : string
	{
		return "";
	}
	/**
	 * wasm(EmitExprGPU)이 "call" 케이스를 위임할 때 쓰는 브리지. mNonUni/mGradPre 등 상태와
	 * RegExp를 쓰는 EmitCallGPU(모듈 전역 함수)를 그대로 부른다. JSMode 토글과 무관하게 항상
	 * 존재한다(render_imple/CShaderInterpret.ts에서 채워짐).
	 */
	_emitCallGPU_JS(_e : CShaderIRExpr) : string
	{
		return "";
	}
	/**
	 * wasm(EmitCastGPU/EmitExprGPU)이 NormType을 위임할 때 쓰는 브리지. gTypeAlias(모듈 전역,
	 * ParseTypeStub이 채움)에 의존해서 wasm에 복제하지 않고 항상 JS로 왕복한다.
	 */
	_normType_JS(_t : string) : string
	{
		return "";
	}
	/** @param _compute 컴퓨트 빌드인가. 예약 유니폼이 렌더와 다르다 */
	BuildVSUni(_shader : CShader,_in : Array<string>,_compute=false) : string
	{
		return "";
	}
	override Build()
	{

	}
	override DataTypeAddCount(_eachCount)
	{
		switch (_eachCount)
		{
		case 16:	return "mat4x4f";
		case 4:		return "vec4f";
		case 3:		return "vec3f";
		case 2:		return "vec2f";
		case 1:		return "f32";
		}
		CAlert.E("error!");
		return "Null";
	}
	AttachFun(_useFun : Set<string>, _functionMap : Map<string, CShaderFun>,_addedFun : Array<string> = null)
	{
		return "";
	}
	/** 스테이지 공용 내장 함수(WGSL). _stage 는 "vs" 또는 "ps" */
	WGSLFun(_stage : string)
	{
		return "";
	}
	/** 내장 라이브러리 시그니처 표. 라이브러리 텍스트를 한 번 스캔해서 캐시한다 */
	LibSig() : Map<string,Array<{name:string,para:Array<string>,ret:string}>>
	{
		return null;
	}
};
import CShaderInterpret_imple from "../render_imple/CShaderInterpret.js";
import { CConsol } from "../basic/CConsol.js"
CShaderInterpret_imple();


