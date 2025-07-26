
import {CParser} from "./CParser.js";
import {CMesh,  CMeshAniInfo, CMeshSkin } from "../../render/CMesh.js";
import {CMeshDataNode,  CKeyFrame } from "../../render/CMeshDataNode.js";
import {CVec3} from "../../geometry/CVec3.js";
import {CMath} from "../../geometry/CMath.js";
import {CTree} from "../../basic/CTree.js";
import { CVertexFormat } from "../../render/CShader.js";
import {CFloat32Mgr} from "../../geometry/CFloat32Mgr.js";
import { CMeshBuf } from "../../render/CMeshCreateInfo.js";
import { CUtilRender } from "../../render/CUtilRender.js";

export class FBXAnimCurveNode
{
	public tree : CTree<CMeshDataNode>;
	public type;
	constructor(_tree : CTree<CMeshDataNode>,_type)
	{
		this.tree=_tree;
		this.type=_type;
	}
}


export class FBXLine
{
	public endOff=0;//이 라인이 끝나는 지점
	public properties=new Array();
	//public PropertyListLen=0;//프로펄티 읽는 라인수
	//public nameLen=0;//이름 길이
	public object=false;
	public name="";
	constructor()
	{
		
	}

	
};
export class FBXData
{
	
	public type=0;
	public value=null;
	constructor(_type=0,_value=null)
	{
		this.type=_type;
		this.value=_value;
	}
	//public compAddr=null;
	//public compLen=null;
}
export class CFBXSearch
{
	public mFBX;
	constructor(_fbx)
	{
		this.mFBX=_fbx;
	}
	//내부에 어레이에서 같은 항목을 찾는다
	SPV(_key : string,_off=0)
	{
		
		for(var each1 of this.mFBX)
		{
			if(each1[_off]==_key)
			{
				if(each1[3]=="A" || each1[3]=="N" || each1[3]=="A+")
					return new CVec3(each1[4],each1[5],each1[6]);
				//원래는 Vector,A,A+ 등 제대로 처리해야한다! 임시로 나올수 있는 경우에서 앞글자만 확인함!
				else if(each1[2]=="A" || each1[2]=="N" || each1[2]=="A+" || each1[2]=="")
					return new CVec3(each1[3],each1[4],each1[5]);
				else 
					return new CVec3(each1[4],each1[5],each1[6]);
			}
		}
		
		
		return null;
	}
	SPI(_key : string,_tagOff)
	{
		
		for(var each1 of this.mFBX)
		{
			if(each1[_tagOff]==_key)
			{
				return each1[each1.length-1];
			}
		}
		
		
		return null;
	}
	//search
	//같은 키들을 찾는다
	S(_key : any,_off=0)
	{
		var kobj=null;
		if(_key instanceof Array)
		{
			for(var each0 of _key)
			{
				if(this.mFBX[each0]!=null)
					kobj=this.mFBX[each0];	
			}
			
		}
		else
			kobj=this.mFBX[_key];	
		
		
		if(kobj==null)
			return null;
			
		if(_off==null)
			return new CFBXSearch(kobj);
		
			
			
		return new CFBXSearch(kobj[_off]);
	}
	SAA(_key : any)
	{
		var kobj=null;
		kobj=this.mFBX[_key];	
		
		
		if(kobj==null)
			return null;
		var arr=kobj[0];
		//if(arr["a"]!=null)
		//	arr=arr["a"][0];
		return arr;
	}
}
export class CFBXConnect
{
	public mFBX : object;
	public mKey : string;
	public mType : string;
	public mExtra =new Array();
	constructor(_fbx,_key,_type)
	{
		this.mFBX=_fbx;
		this.mKey=_key;
		this.mType=_type;
	}
}
export class CParserFBX extends CParser
{
	public mPath : string;
	public mBin : boolean =true;
	public mFBX : object={};
	public mVersion=0;
	public mLine=new FBXLine();
	public mPstFbx : object=null;
	public mMesh = new CMesh();
	public mConnectMap=new Map<string,CFBXConnect>();
	//public m_axis=1;//0=y 1=z
	public mMaterialMap=new Map<string,Array<string>>();
	public mUpAxis=2;// 2 ZAxis
	public mAniCuvMap=new Map<string,FBXAnimCurveNode>();
	public mDeformerMap=new Map<string,string>();
	public mGeometryMap=new Map<string,string>();

	constructor()
	{
		super();
	}
	GetResult() 	{	return this.mMesh;	}
	PosScaAxis(_vec)
	{
		//var vec=new CVec3(_x,_y,_z);
		// if(this.m_upAxis==1)
		// 	_vec.x=-_vec.x;
		
			
		var dummy=_vec.y;
		_vec.y=_vec.z;
		_vec.z=dummy;
		
		//_vec.x=-_vec.x;
		return _vec;
	}
	RotAxis(_vec)
	{
		//if(this.m_upAxis==1)
		_vec.x=-_vec.x;
		let dummy = _vec.y;
		_vec.y = -_vec.z;
		_vec.z = -dummy;
		
		_vec.x = CMath.DegreeToRadian(_vec.x);
		_vec.y = CMath.DegreeToRadian(_vec.y);
		_vec.z = CMath.DegreeToRadian(_vec.z);
		
		return _vec;
	}
	TextureId(fbxs : CFBXSearch,_tree,off : number)
	{

	}
	Geometry(_fbx : object,_tree : CTree<CMeshDataNode>,_prop : CFBXSearch)
	{
		

		
		
	}
	async Load(pa_fileName)
	{
		

	}
	async Rebuild()
    {
		
	}
	FD(_object,)
	{
		//_object
	}
	TypeChk(_type,_fbx)
	{
		// if(_type=="FBXVersion")
		// {
		// 	this.m_version=_fbx[0];
		// }
		// else 
		if(_type=="Model" || _type=="Texture" || _type=="Geometry" || _type=="Material" ||
			_type=="AnimationCurve" || _type=="AnimationCurveNode" || _type=="Deformer")
		{
			var con=this.mConnectMap.get(_fbx.properties[0]);
			if(con==null)
			{
				con=new CFBXConnect(_fbx,_fbx.properties[0],_type);
				this.mConnectMap.set(_fbx.properties[0],con);
			}
			else
			{
				con.mExtra.push(_fbx);
			}
			
		}
	}
	async ReadObject(_end)
	{
		

	}
	StrChk(s,cut)
	{
		if(s==true)
			return cut
		else if(cut=="T")
			return true;
		else if(cut=="F")
			return false;
		else if(cut=="U")
			return 85;
		else if(cut=="a")
			return 97;
		else if(cut=="n")
			return 110;
		else if(cut=="s")
			return 115;
		else if(cut=="r")
			return 114;
		else if(cut=="p")
			return 112;
		
		return Number(cut);
	}
	ReadStrFBXLine()
	{
		var str="";
		
		while(this.mBuffer.length>this.mPstOff)
		{
			var ch=String.fromCharCode(this.mBuffer[this.mPstOff]);
			this.mPstOff += 1;
			if(ch=='\n')
			{
				//var no=1;
				
					let ch2014=String.fromCharCode(this.mBuffer[this.mPstOff-2]);
					let ch2010=String.fromCharCode(this.mBuffer[this.mPstOff+1]);
					if(ch2014==',' || ch2010==' ')
					{
						continue;
					}
					else
						break;
					
					
						
					
				
			}
			str+=ch;
		}
		
		
		return str;
	}
	ReadLine()
	{
		
		
	}
	ReadData() : FBXData
	{
		return null;
	}
}
import CParserFBX_imple from "../../util_imple/parser/CParserFBX.js";
CParserFBX_imple();