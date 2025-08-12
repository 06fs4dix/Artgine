import {CObject} from "../basic/CObject.js";
import {CTree} from "../basic/CTree.js"

import {CMat} from "../geometry/CMat.js"
//import {CMaterial} from "../render/CMaterial.js"
import {CMeshDataNode} from "../render/CMeshDataNode.js"
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
}
var MeshBoneMat=100;
export class CMesh extends CObject
{
	public vertexNormal : boolean;
	public meshTree : CTree<CMeshDataNode>;
	
	//public material : Array<CMaterial>;
	public texture : Array<string>;
	//public weightName : Array<string>;
	//public weightMat : Array<CWeightMat>;
	
	public skin : Array<CMeshSkin>;
	public aniMap : Map<string,CMeshAniInfo>;
	
	constructor()
	{
		super();
		this.vertexNormal=false;//파싱된 버텍스 노말을 사용함
		
		this.meshTree=new CTree();
	
		//this.material=new Array();//메터리얼 텍스처 한세트이다
		this.texture=new Array();//사용법은 메쉬에서 메터리얼 텍스처 번호를 참조해서 불러오기 때문이다
		//this.weightName=new Array();
		//this.weightMat=new Array();
		this.aniMap=new Map<string,CMeshAniInfo>();
		this.skin=new Array();
		
	}
	Icon(){		return "bi bi-globe";	}
}

