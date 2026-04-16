
import {CObject} from "../basic/CObject.js";
import { CLZ4 } from "../basic/LZ.js";
import { CBound } from "../geometry/CBound.js";
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
	//public index =new Array<number>();
	bound : CBound;

	
	constructor()
	{
		super();	
		this.name="";
		this.vertexCount = 0;
		this.indexCount = 0;
		this.vertex=new Array<CMeshBuf>();
		this.bound=new CBound();

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

	Compress(_level: number = 6)
	{
		// 1. 전체 바이트 크기 계산: 버퍼마다 [vfType:4][floatCount:4][floats:N*4]
		let totalBytes = 0;
		for (const buf of this.vertex)
			totalBytes += 4 + 4 + buf.bufF.mSize * 4;

		const raw = new Uint8Array(totalBytes);
		const dv  = new DataView(raw.buffer);
		let off = 0;

		for (const buf of this.vertex)
		{
			dv.setInt32(off, buf.vfType, true);   off += 4;
			dv.setInt32(off, buf.bufF.mSize, true); off += 4;

			const fa = buf.bufF.GetArray();
			for (let i = 0; i < buf.bufF.mSize; i++)
			{
				dv.setFloat32(off, fa[i], true);
				off += 4;
			}
		}

		// 2. LZ4 압축
		const lz4        = new CLZ4();
		const compressed = lz4.compress(raw, _level);

		// 3. 기존 vertex 전부 제거 후 Compress 버퍼 하나로 교체
		this.vertex = [];
		const compBuf = this.Create(CVertexFormat.eIdentifier.Compress);
		for (let i = 0; i < compressed.length; i++)
			compBuf.bufI.push(compressed[i]);
	}
}