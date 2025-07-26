
import {CObject} from "../basic/CObject.js";
import {CFloat32Mgr} from "../geometry/CFloat32Mgr.js"
import { CVertexFormat } from "./CShader.js";


export class  CUVChannel
{
	public uvIndex=new Array<number>();
	public uv =new CFloat32Mgr();
}
export class CMeshBuf extends CObject
{
	constructor(_type)
	{
		super();
		this.vfType=_type;
	}
	public bufF =new CFloat32Mgr();
	public bufI =new Array<number>();
	public vfType=CVertexFormat.eIdentifier.Null;
}

export class CMeshCreateInfo extends CObject
{
	public name : string;
	public vertexCount : number;
	public indexCount : number;
	public vertex : Array<CMeshBuf>;
	public index =new Array<number>();


	
	constructor()
	{
		super();	
		this.name="";
		this.vertexCount = 0;
		this.indexCount = 0;
		this.vertex=new Array<CMeshBuf>();


	}
	GetVFType(_type)
	{
		var rVal=new Array<CMeshBuf>();
		for(var each0 of this.vertex)
		{
			if(each0.vfType==_type)
				rVal.push(each0);
		}
		return rVal;
	}
	RemoveVFType(_type)
	{
		for(var i=0;i<this.vertex.length;++i)
		{
			if(this.vertex[i].vfType==_type)
			{
				this.vertex.splice(i,1);
				i--;
			}
				
		}
	}
	Create(_type)
	{
		var buf=new CMeshBuf(_type);
		this.vertex.push(buf);
		return buf;
	}
}