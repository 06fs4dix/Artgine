import { CObject } from "../../../basic/CObject.js";
import {CBound} from "../../../geometry/CBound.js";
import {CVec2} from "../../../geometry/CVec2.js";
import {CVec3} from "../../../geometry/CVec3.js";
import {CVec4} from "../../../geometry/CVec4.js";
import { CMeshCopyNode } from "../../../render/CMeshCopyNode.js";
import { CMeshCreateInfo } from "../../../render/CMeshCreateInfo.js";
import { CMeshDrawNode } from "../../../render/CMeshDrawNode.js";
import {CRenderPass} from "../../../render/CRenderPass.js";
import {CShader,  CVertexFormat } from "../../../render/CShader.js";
import { CShaderAttr } from "../../../render/CShaderAttr.js";
import {CPaint} from "./CPaint.js";

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

export class CPaintVoxel extends CPaint
{
	public mMCI=new CMeshCreateInfo();
	public mMD=new CMeshDrawNode();
	public mSize=100;
	
	constructor()
	{
		super();
		this.mMCI.Create(CVertexFormat.eIdentifier.Position);
		this.mMCI.Create(CVertexFormat.eIdentifier.UV);
		this.mMCI.Create(CVertexFormat.eIdentifier.Color);

	}
	override IsShould(_member: string, _type: CObject.eShould) 
	{
		if(_member=="mMCI" || _member=="mMD")	return false;

		return super.IsShould(_member,_type);
	}
	InitPaint()
	{
		super.InitPaint();

		if(this.mRenderPass.length==0)
		{
			var rp=new CRenderPass(this.mOwner.GetFrame().Pal().SlVoxel().mKey);
			rp.mPriority = CRenderPass.ePriority.BackGround;
			this.mRenderPass=[rp];
		}

		

		this.mOwner.GetFrame().Ren().BuildMeshDrawNodeAutoFix(this.mMD,this.mOwner.GetFrame().Pal().SlVoxel().mShader[0],this.mMCI);
	}
	//6면이 한세트로 들어있어야 한다.
	Rebuild(_arr : Array<CVoxPlane>)
	{	
		var pbuf=new Float32Array(4*6);
		var ubuf=new Float32Array(4*6);
		var cbuf=new Float32Array(2*6);

		for(var i=0;i<_arr.length;++i)
		{
			for(var j=0;j<6;++j)
			{
				pbuf[j*4+0]=_arr[i].mPos.mF32A[0];
				pbuf[j*4+1]=_arr[i].mPos.mF32A[1];
				pbuf[j*4+2]=_arr[i].mPos.mF32A[2];
				pbuf[j*4+3]=_arr[i].mDir+j;

				ubuf[j*4+0]=_arr[i].mUV.mF32A[0];
				ubuf[j*4+1]=_arr[i].mUV.mF32A[1];
				ubuf[j*4+2]=_arr[i].mUV.mF32A[2];
				ubuf[j*4+3]=_arr[i].mUV.mF32A[3];

				cbuf[j*2+0]=_arr[i].mLight.mF32A[0];
				cbuf[j*2+1]=_arr[i].mLight.mF32A[1];
			}
			
			this.mOwner.GetFrame().Ren().RebuildMeshDrawNode(this.mMD,0,_arr[i].mOff*4*6*4,pbuf);
			this.mOwner.GetFrame().Ren().RebuildMeshDrawNode(this.mMD,1,_arr[i].mOff*4*6*4,ubuf);
			this.mOwner.GetFrame().Ren().RebuildMeshDrawNode(this.mMD,2,_arr[i].mOff*2*6*4,cbuf);
		}
	}
	Build(_arr : Array<CVoxPlane>)
	{
		var pbuf=this.mMCI.GetVFType(CVertexFormat.eIdentifier.Position)[0].bufF;
		var ubuf=this.mMCI.GetVFType(CVertexFormat.eIdentifier.UV)[0].bufF;
		var cbuf=this.mMCI.GetVFType(CVertexFormat.eIdentifier.Color)[0].bufF;

		pbuf.Resize(_arr.length*6*4);
		ubuf.Resize(_arr.length*6*4);
		cbuf.Resize(_arr.length*6*2);
		this.mBound.SetType(CBound.eType.Voxel);



		this.mBound.Reset();
		this.mMCI.vertexCount=_arr.length*6;
		var i=0;
		for(var each0 of _arr)
		{
			this.mBound.InitBound(each0.mPos);
			pbuf.V4(0+i*6,each0.mPos.mF32A[0],each0.mPos.mF32A[1],each0.mPos.mF32A[2],each0.mDir+0);
			pbuf.V4(1+i*6,each0.mPos.mF32A[0],each0.mPos.mF32A[1],each0.mPos.mF32A[2],each0.mDir+1);
			pbuf.V4(2+i*6,each0.mPos.mF32A[0],each0.mPos.mF32A[1],each0.mPos.mF32A[2],each0.mDir+2);
			pbuf.V4(3+i*6,each0.mPos.mF32A[0],each0.mPos.mF32A[1],each0.mPos.mF32A[2],each0.mDir+3);
			pbuf.V4(4+i*6,each0.mPos.mF32A[0],each0.mPos.mF32A[1],each0.mPos.mF32A[2],each0.mDir+4);
			pbuf.V4(5+i*6,each0.mPos.mF32A[0],each0.mPos.mF32A[1],each0.mPos.mF32A[2],each0.mDir+5);
		

			ubuf.V4(0+i*6,each0.mUV.mF32A[0],each0.mUV.mF32A[1],each0.mUV.mF32A[2],each0.mUV.mF32A[3]);
			ubuf.V4(1+i*6,each0.mUV.mF32A[0],each0.mUV.mF32A[1],each0.mUV.mF32A[2],each0.mUV.mF32A[3]);
			ubuf.V4(2+i*6,each0.mUV.mF32A[0],each0.mUV.mF32A[1],each0.mUV.mF32A[2],each0.mUV.mF32A[3]);
			ubuf.V4(3+i*6,each0.mUV.mF32A[0],each0.mUV.mF32A[1],each0.mUV.mF32A[2],each0.mUV.mF32A[3]);
			ubuf.V4(4+i*6,each0.mUV.mF32A[0],each0.mUV.mF32A[1],each0.mUV.mF32A[2],each0.mUV.mF32A[3]);
			ubuf.V4(5+i*6,each0.mUV.mF32A[0],each0.mUV.mF32A[1],each0.mUV.mF32A[2],each0.mUV.mF32A[3]);

			cbuf.V2(0+i*6,each0.mLight.mF32A[0],each0.mLight.mF32A[1]);
			cbuf.V2(1+i*6,each0.mLight.mF32A[0],each0.mLight.mF32A[1]);
			cbuf.V2(2+i*6,each0.mLight.mF32A[0],each0.mLight.mF32A[1]);
			cbuf.V2(3+i*6,each0.mLight.mF32A[0],each0.mLight.mF32A[1]);
			cbuf.V2(4+i*6,each0.mLight.mF32A[0],each0.mLight.mF32A[1]);
			cbuf.V2(5+i*6,each0.mLight.mF32A[0],each0.mLight.mF32A[1]);

	
			i++;
			
		
			
		}//for
		this.mBound.mMax.x+=this.mSize;
		this.mBound.mMax.y+=this.mSize;
		this.mBound.mMax.z+=this.mSize;

		if(this.mOwner==null)
			return;
		this.mOwner.GetFrame().Ren().BuildMeshDrawNodeAutoFix(this.mMD,this.mOwner.GetFrame().Pal().SlVoxel().mShader[0],
			this.mMCI);
		
	}
	Render(_vf : CShader)
	{
		this.mOwner.GetFrame().BMgr().BatchOn();
		this.Common(_vf);
		
		this.mOwner.GetFrame().BMgr().SetBatchSA(new CShaderAttr("worldMat", this.GetFMat()));
		this.mOwner.GetFrame().BMgr().SetBatchSA(new CShaderAttr("size", this.mSize));
		this.mOwner.GetFrame().BMgr().SetBatchTex(this.mTexture);
		this.mOwner.GetFrame().BMgr().SetBatchMesh(this.mMD);
		this.mOwner.GetFrame().BMgr().BatchOff();
	}
	
}