import {CObject} from "../basic/CObject.js";
import {CTree} from "../basic/CTree.js"

import {CMat} from "../geometry/CMat.js"
import { CVec3 } from "../geometry/CVec3.js";
import { CVec4 } from "../geometry/CVec4.js";
//import {CMaterial} from "../render/CMaterial.js"
import {CMeshDataNode} from "../render/CMeshDataNode.js"
import { CAtlas } from "../util/CAtlas.js";
import { CTexture } from "./CTexture.js";
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
		
		this.ik = new Map<string, CMeshIK>;
		this.attacher = new Map<string, CMeshAttacher>;
	}
	Icon(){		return "bi bi-globe";	}
}

