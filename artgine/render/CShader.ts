
import {CUniform} from "./CUniform.js"
import {CShaderAttr} from "./CShaderAttr.js"
import {CObject} from "../basic/CObject.js"




var g_bufMap=new Map();
export class CVertexFormat extends CObject
{
	static eIdentifier=
	{
		Position:0,//V3
		UV:1,//V2
		Normal:3,//V3
		Weight:4,//V4
		WeightIndex:5,//V4
		Color:6,
		TexOff:7,//V3
		Tangent:8,
		Binormal:9,
		Instance:10,
		Shadow:11,
		Index:12,
		Compress:13,


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
}




//=============================================================================


export class CShader extends CObject
{
	public mInsCount=1;
	public mVP : string=null;
	public mVS : string=null;
	public mPS : string=null;
	mBuildFun : any=null;
	mVSFun : any=null;
	mPSFun : any=null;
	mBranchUse : any=null;
	mFunction : any=null;
	public mKey : string;
	public mProgram : any;
	public mTag : Set<string>;
	public mTagMain : Set<string>;
	
	public mVF : Array<CVertexFormat>;
	public mUniform : Map<string,CUniform>;
	public mDefault : Array<CShaderAttr>;
	public mComplie : number=0;//0컴파일 안됌, -1 대기 1 완료 2 에러
	/**
	 * 유니폼 블록 전체를 담는 CPU 쪽 버퍼(플로트 단위 오프셋 = CUniform.binding).
	 *
	 * 컴파일이 끝나 유니폼 선언이 확정된 뒤 최종 크기로 한 번만 잡는다.
	 * SendGPU 가 값을 받는 그 자리에서 선언 오프셋에 바로 써넣고, 그릴 때는 그대로
	 * 올리기만 한다 - 이름별로 조각을 모아뒀다가 다시 합치면 같은 값을 두 번 복사하게 된다.
	 * GL 은 유니폼이 프로그램에 고착(sticky)되는데, 셰이더가 들고 있으면 그 수명이 같아진다.
	 * WebGPU 전용이라 GL 판에서는 쓰지 않는다
	 */
	public mUniCPU : Float32Array=null;
	/**
	 * WebGPU 전용. 이 셰이더의 유니폼 버퍼 링과 블록 크기.
	 *
	 * 렌더러가 Map 으로 들고 있으면 드로우마다 Map 조회가 든다(그것도 mKey 라 문자열 해싱).
	 * mUniCPU 와 마찬가지로 셰이더에 붙여두면 필드 접근 한 번이면 된다.
	 * 링의 실체는 렌더러가 만들고 프레임 리셋/업로드를 위해 목록으로도 들고 있다
	 */
	public mUniRing : any=null;
	/** UniSize 결과 캐시. -1 이면 아직 안 구했다 */
	public mUniSize : number=-1;
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
	override IsShould(_member: string, _type: CObject.eShould): boolean 
	{
		if(_member=="m_complie" || _member=="m_program" || _member=="mUniCPU"
			|| _member=="mUniRing" || _member=="mUniSize")
			return false;
		return super.IsShould(_member,_type);
	}

	override Icon(){		return "bi bi-filetype-sh";	}
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
export class CShaderList extends CObject
{
	public mKey ="";
	public mShader = new Array<CShader>();
	public mShaderMap = new Map<string,CShader>();
	//지연 생성용. 인터프리터가 심어준다. null 이면 기존 전체 열거 방식으로 동작한다
	mBase : any=null;		//Array<{key,tag,tagMain,branch}> base build 별 정보
	mMakeFun : any=null;	//(baseOff,선택브랜치)=>CShader
	PushShader(_shader : CShader)
	{
		this.mShader.push(_shader);
		this.mShaderMap.set(_shader.mKey,_shader);
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
			if(this.mBase!=null)
				return this.GetShaderLazy(Array.isArray(_tag)? new Set(_tag) : _tag);

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
			let sh=this.mShaderMap.get(_tag);
			if(sh==null && this.mBase!=null && this.mMakeFun!=null)
				sh=this.KeyToShader(_tag);
			return sh;
		}
		return null;
	}
	//기존 전체 열거와 같은 답을 계산으로 구한다.
	//브랜치를 켜면 요청태그와 맞을때 scount+1, 아닐때 fcount+1 이므로
	//"요청태그에 있는 브랜치만 켠 조합"이 항상 최고점이다.
	private GetShaderLazy(_tagSet : Set<string>)
	{
		var maxMainTagCount=-1;
		var maxCount=-1000;
		var minFCount=1000;
		var bestOff=-1;
		var bestSel : Array<any>=null;
		var bestKey="";

		for(var i=0;i<this.mBase.length;++i)
		{
			var base=this.mBase[i];

			var allMainTagsMatch=true;
			var mainTagCount=0;
			for(let mainTag of base.tagMain)
			{
				if(!_tagSet.has(mainTag))
				{
					allMainTagsMatch=false;
					break;
				}
				mainTagCount++;
			}
			if(!allMainTagsMatch)	continue;

			var scount=0;
			var fcount=0;
			for(var tag of base.tag)
			{
				if(_tagSet.has(tag))	scount++;
				else					fcount++;
			}
			//켠 브랜치의 태그는 전부 요청에 있으므로 fcount 에는 기여하지 않는다
			var sel=new Array<any>();
			for(var br of base.branch)
			{
				if(_tagSet.has(br.mTag))
				{
					sel.push(br);
					scount++;
				}
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
				bestOff=i;
				bestSel=sel;
				bestKey=base.key;
				for(var br of sel)
					bestKey+=br.mKeyword;
			}
		}

		//어느 base 도 mTagMain 을 못 맞추면 기존과 동일하게 0번을 준다
		if(bestOff==-1)	return this.mShader[0];

		var sh=this.mShaderMap.get(bestKey);
		if(sh!=null)	return sh;
		sh=this.mMakeFun(bestOff,bestSel);
		if(sh==null)	return this.mShader[0];
		return sh;
	}
	//키 문자열에서 조합을 역산한다. base 는 이미 만들어져 있으므로 변종만 대상이다
	private KeyToShader(_key : string)
	{
		for(var i=0;i<this.mBase.length;++i)
		{
			let base=this.mBase[i];
			if(_key.indexOf(base.key)!=0)	continue;
			let sel=new Array<any>();
			if(this.KeyMatch(base.branch,0,_key,base.key.length,sel)==false)	continue;
			if(sel.length==0)	continue;
			return this.mMakeFun(i,sel);
		}
		return null;
	}
	private KeyMatch(_branch : Array<any>,_off : number,_key : string,_pos : number,_sel : Array<any>)
	{
		if(_pos==_key.length)	return true;
		for(var i=_off;i<_branch.length;++i)
		{
			let kw=_branch[i].mKeyword;
			if(kw==null || kw=="")	continue;
			if(_key.startsWith(kw,_pos)==false)	continue;
			_sel.push(_branch[i]);
			if(this.KeyMatch(_branch,i+1,_key,_pos+kw.length,_sel))	return true;
			_sel.pop();
		}
		return false;
	}
	//지연 생성분을 전부 만든다. 목록을 통째로 훑어야 하는 도구용
	MaterializeAll()
	{
		if(this.mBase==null || this.mMakeFun==null)	return;
		for(let i=0;i<this.mBase.length;++i)
		{
			let branch=this.mBase[i].branch;
			let Combine=(_start : number,_path : Array<any>)=>
			{
				if(_path.length>0)
					this.mMakeFun(i,_path);
				for(let j=_start;j<branch.length;++j)
				{
					_path.push(branch[j]);
					Combine(j+1,[..._path]);
					_path.pop();
				}
			};
			Combine(0,[]);
		}
	}
}