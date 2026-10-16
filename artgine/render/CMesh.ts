import {CObject} from "../basic/CObject.js";
import {CTree} from "../basic/CTree.js"

import {CMat} from "../geometry/CMat.js"
import { CVec3 } from "../geometry/CVec3.js";
import { CVec4 } from "../geometry/CVec4.js";
import { CFloat32Mgr } from "../geometry/CFloat32Mgr.js";
//import {CMaterial} from "../render/CMaterial.js"
import {CMeshDataNode} from "../render/CMeshDataNode.js"
import { CAtlas } from "../util/CAtlas.js";
import { CTexture } from "./CTexture.js";
import { CHash } from "../basic/CHash.js";
export class CWeightMat
{
	public mat : CMat;
	public target : Array<number>;
	constructor()
	{
		this.mat=new CMat();
		this.target=new Array();
	}
}
export class CMeshAniInfo
{
	public start=0;
	public end=0;
}
export class CMeshSkin extends CObject
{
	public key ="";
	public mat =new CMat();
	//public link =new CMat();//임시
}
export class CMeshMorph extends CObject
{
	public names=new Array<string>();
	//[타깃][정점][x,y,z] 순서의 위치 이동량
	public delta=new CFloat32Mgr();

	//같은 메시 안에서 내용이 같은 모프(프리미티브가 공유하는 것)가 같은 텍스처 키를 갖게 한다
	GetTexKey(_meshKey : string) : string
	{
		let a=this.delta.GetArray();
		let n=this.names.length*this.GetVertexCount()*3;
		let h=2166136261;
		let u=new Uint32Array(a.buffer,a.byteOffset,Math.min(n,a.length));
		for(let i=0;i<u.length;++i)
			h=Math.imul(h^u[i],16777619);
		return _meshKey+".morph/"+this.names.length+"x"+this.GetVertexCount()+"/"+(h>>>0)+".tex";
	}
	GetVertexCount() : number
	{
		if(this.names.length==0)	return 0;
		return this.delta.mSize/(this.names.length*3);
	}
	Remap(_map : Array<number>,_count : number) : CMeshMorph
	{
		let r=new CMeshMorph();
		r.names=this.names.slice();
		let T=this.names.length;
		let n=this.GetVertexCount();
		r.delta.Resize(T*_count*3);
		let src=this.delta.GetArray();
		let dst=r.delta.GetArray();
		for(let t=0;t<T;++t)
		{
			for(let i=0;i<n;++i)
			{
				let s=(t*n+i)*3;
				let d=(t*_count+_map[i])*3;
				dst[d]=src[s];
				dst[d+1]=src[s+1];
				dst[d+2]=src[s+2];
			}
		}
		return r;
	}
}
export class CMeshIK
{
	public bones : Array<string> = new Array<string>();
	public target : string;
	
	public pole : string;
	public mix : number = 1;

	public aniInfo : Array<CMeshAniInfo> = new Array();
}
export class CMeshAttacher
{
	public bones : Array<string> = new Array<string>();
	public target : string;

	public offsetPos : CVec3 = new CVec3();
	public offsetRot : CVec4 = new CVec4(0,0,0,1);
	public offsetSca : CVec3 = new CVec3(1,1,1);

	public mixPos : CVec3 = new CVec3(1, 1, 1);
	public mixRot : number = 1;
	public mixSca : CVec3 = new CVec3(1, 1, 1);

	public aniInfo : Array<CMeshAniInfo> = new Array();
}
var MeshBoneMat=100;
export class CMesh extends CObject
{
	public vertexNormal : boolean;
	public clamp=true;
	public meshTree : CTree<CMeshDataNode>;
	
	
	public texture : Array<string>;
	

	
	public skin : Array<CMeshSkin>;
	public aniMap : Map<string,CMeshAniInfo>;

	public ik : Map<string, CMeshIK>;
	public attacher : Map<string, CMeshAttacher>;

	public hash : number = null;

	constructor()
	{
		super();
		this.vertexNormal=false;//파싱된 버텍스 노말을 사용함
		
		this.meshTree=new CTree();
	
		//this.material=new Array();//메터리얼 텍스처 한세트이다
		this.texture=new Array();//사용법은 메쉬에서 메터리얼 텍스처 번호를 참조해서 불러오기 때문이다
		//this.textureBuf=null;
		//this.weightName=new Array();
		//this.weightMat=new Array();
		this.aniMap=new Map<string,CMeshAniInfo>();
		this.skin=new Array();
		
		this.ik = new Map<string, CMeshIK>;
		this.attacher = new Map<string, CMeshAttacher>;
	}
	override Icon(){		return "bi bi-globe";	}

	HashBoneStruct() : number
	{
		if (this.hash != null)
			return this.hash;
		this.hash = CHash.HashCode(this.HashBoneStructNode(this.meshTree));
		return this.hash;
	}
	private HashBoneStructNode(_node : CTree<CMeshDataNode>) : string
	{
		if (_node == null)
			return "";
		let isBone = _node.mData != null && _node.mData.ci == null;
		let childArr : Array<CTree<CMeshDataNode>> = [];
		let child = _node.mChild;
		while (child != null) {
			childArr.push(child);
			child = child.mColleague;
		}
		childArr.sort((a, b) => (a.mKey < b.mKey ? -1 : (a.mKey > b.mKey ? 1 : 0)));
		let childStr = "";
		for (let c of childArr) {
			childStr += this.HashBoneStructNode(c);
		}
		// 폴리곤 등 본이 아닌 노드는 계층에서 제외하고, 그 자식(더 깊은 본)만 이어붙여 건너뜀
		if (!isBone)
			return childStr;
		let pos = _node.mData.pos;
		// float 오차로 같은 값이 다르게 잡히지 않도록 소수점 2자리로 반올림
		let posStr = pos.x.toFixed(2) + "," + pos.y.toFixed(2) + "," + pos.z.toFixed(2);
		return _node.mKey + ":" + posStr + "(" + childStr + ")";
	}
}

