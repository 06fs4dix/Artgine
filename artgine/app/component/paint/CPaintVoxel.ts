import { CObject } from "../../../basic/CObject.js";
import {CVec2} from "../../../geometry/CVec2.js";
import {CVec3} from "../../../geometry/CVec3.js";
import {CVec4} from "../../../geometry/CVec4.js";
import { CMeshBuf } from "../../../render/CMeshCreateInfo.js";
import {CShader,  CVertexFormat } from "../../../render/CShader.js";
import { CShaderAttr } from "../../../render/CShaderAttr.js";
import { CPaintMerge } from "./CPaintMerge.js";

export class CVoxPlane extends CObject
{
	static eDir=
	{
		"Up":0,
		"Down":10,
		"Left":20,
		"Right":30,
		"Front":40,
		"Back":50,
		"Count":60,
		"Null":70,
	};
	constructor(_off : number,_pos=new CVec3(),_dir=CVoxPlane.eDir.Null)
	{
		super();
		this.mDir=_dir;
		this.mPos=_pos;
		//this.m_half=_half;
		this.mOff=_off;
	}
	mPos : CVec3=new CVec3();
	mDir : number=CVoxPlane.eDir.Null;
	mUV : CVec4=new CVec4(0,0,1,1);
	mLight : CVec2=new CVec2(1,1);
	//m_half : number=100;
	//m_color : CVec3=new CVec3();
	mOff : number;
}

//면 하나가 슬롯 하나다(정점 6개). 이웃에 가려지지 않은 면에만 슬롯을 주고, 슬롯 관리는 CPaintMerge가 한다
export class CPaintVoxel extends CPaintMerge
{
	public mSize=100;

	static readonly sFaceKey="f";
	static readonly sFaceVertex=6;

	constructor()
	{
		super();
		this.PushTag("alphaCut");
	}
	//슬롯을 쓸 수 있게 준비한다. PushComp 직후, 면을 넣기 전에 한 번 부른다
	Init()
	{
		this.BuildSlot();
	}
	//면이 _count개 더 들어갈 용량을 미리 잡는다
	ReserveFace(_count : number)
	{
		this.ReserveSlot(CPaintVoxel.sFaceKey,_count);
	}
	PushFace(_plane : CVoxPlane) : number
	{
		const slot=this.NewSlot(CPaintVoxel.sFaceKey);
		this.ModifyFace(slot,_plane);
		return slot;
	}
	ModifyFace(_slot : number,_plane : CVoxPlane)
	{
		const I=CVertexFormat.eIdentifier;
		const p=this.F32(I.Position), uv=this.F32(I.UV), c=this.F32(I.Color);
		const vs=this.mSlotVS[_slot];
		const pos=_plane.mPos.mF32A, tex=_plane.mUV.mF32A, light=_plane.mLight.mF32A;
		for(let j=0;j<CPaintVoxel.sFaceVertex;++j)
		{
			const v=vs+j, p4=v*4, c2=v*2;
			p[p4]=pos[0];
			p[p4+1]=pos[1];
			p[p4+2]=pos[2];
			p[p4+3]=_plane.mDir+j;
			uv[p4]=tex[0];
			uv[p4+1]=tex[1];
			uv[p4+2]=tex[2];
			uv[p4+3]=tex[3];
			c[c2]=light[0];
			c[c2+1]=light[1];
		}
		this.Dirty(_slot);
	}

	protected override CreateChannel(): void
	{
		const ci=this.mMeshDataNode.ci;
		ci.Create(CVertexFormat.eIdentifier.Position);
		ci.Create(CVertexFormat.eIdentifier.UV);
		ci.Create(CVertexFormat.eIdentifier.Color);
	}
	protected override Stride(_buf : CMeshBuf) : number
	{
		const I=CVertexFormat.eIdentifier;
		switch(_buf.vfType)
		{
			case I.Position:	case I.UV:	return 4;
			case I.Color:	return 2;
		}
		return super.Stride(_buf);
	}
	protected override SlotVertex(_key : string) : number	{	return CPaintVoxel.sFaceVertex;	}
	protected override SlotIndex(_key : string) : number	{	return CPaintVoxel.sFaceVertex;	}
	protected override WriteIndex(_key : string,_iStart : number,_vStart : number) : void
	{
		const ib=this.Buf(CVertexFormat.eIdentifier.Index).bufI;
		for(let j=0;j<CPaintVoxel.sFaceVertex;++j)
			ib[_iStart+j]=_vStart+j;
	}
	//위치 채널의 w가 방향이라, Null 방향이면 셰이더가 정점을 접어 그리지 않는다
	protected override ZeroPos(_vs : number,_vc : number) : void
	{
		if(_vc<=0)	return;
		const p=this.F32(CVertexFormat.eIdentifier.Position);
		if(p==null)	return;
		for(let i=_vs*4+3,e=(_vs+_vc)*4;i<e;i+=4)
			p[i]=CVoxPlane.eDir.Null;
	}
	protected override RenderAttr(_vf : CShader) : void
	{
		const bmgr=this.mOwner.GetFrame().BMgr();
		bmgr.SetBatchSA(new CShaderAttr("worldMat", this.GetFMat()));
		bmgr.SetBatchSA(new CShaderAttr("size", this.mSize));
		if(_vf.mUniform.get("material")!=null)
			bmgr.SetBatchSA(new CShaderAttr("material", this.mMaterial));
	}
}
