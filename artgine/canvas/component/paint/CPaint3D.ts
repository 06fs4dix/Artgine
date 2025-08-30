import { CUpdate } from "../../../basic/Basic.js";
import { CAlert } from "../../../basic/CAlert.js";
import {CArray} from "../../../basic/CArray.js";
import { CObject, CPointer } from "../../../basic/CObject.js";
import {CString} from "../../../basic/CString.js";
import {CTree} from "../../../basic/CTree.js";
import { CBound } from "../../../geometry/CBound.js";
import {CMat} from "../../../geometry/CMat.js";
import {CMath} from "../../../geometry/CMath.js";
import {CVec1} from "../../../geometry/CVec1.js";
import { CBatch } from "../../../render/CBatchMgr.js";
import {CDevice} from "../../../render/CDevice.js";
import {CMesh} from "../../../render/CMesh.js";
import { CMeshCopyNode } from "../../../render/CMeshCopyNode.js";
import {CMeshPaint} from "../../../render/CMeshPaint.js";
import {CMeshTreeUpdate} from "../../../render/CMeshTreeUpdate.js";
import { CRenderPass } from "../../../render/CRenderPass.js";

import {CShader} from "../../../render/CShader.js";
import {CShaderAttr} from "../../../render/CShaderAttr.js";
import { SDF } from "../../../z_file/SDF.js";
import { CRPAuto } from "../../CRPMgr.js";
import {CSubject} from "../../subject/CSubject.js";
import {CCamComp} from "../CCamComp.js";
import {CPaint} from "./CPaint.js";

export class CPaint3D extends CPaint
{
	public mTree : CTree<CMeshCopyNode>;
	public mMesh : string;
	public mMeshRes : CMesh;
	public mWeightMat : Float32Array;
	public mCenterPos=false;
	public mTreeNode=new CArray<CMeshPaint>();
	//public m_shadow=false;
	//public m_autoRP=new Set<string>();
	public mSkinType=SDF.eSkin.Bone;
	public mCamCompSet : Set<CCamComp>=new Set<CCamComp>();
	public mBakedLight : string = null;
	public mWindInfluence : CVec1 = new CVec1(0.0);

	public mCamCompLayer=[];
	public mTexLoad=false;

	constructor();
	constructor(_mesh : string);
	constructor(_mesh : string);
	constructor(_mesh : string);
	constructor(_mesh="",_centerPos=false)
	{
		super();
		

		this.mCenterPos=_centerPos;
		this.mTree=null;
		this.mMesh=_mesh;
		
		this.mWeightMat=new Float32Array(0);
		
		//this.m_texture=new Array();
		
	}
	SetOwner(_obj :CSubject)
	{
		super.SetOwner(_obj);
		this.InitMesh(this.mMesh);
	}
	Bake() {		this.PushTag("bake");	}
	//Shadow()	{		this.PushTag("shadow");	}
	Env()	{		this.PushTag("env");	}
	Wind(_influence : number) {
		this.PushTag("wind");
		this.mWindInfluence.x = _influence;
	}
	ParallaxNormal(_value : number) {
		this.PushTag("parallax");
		this.PushCShaderAttr(new CShaderAttr("parallaxNormal", new CVec1(0.05)));
	}
	EditDrop(_object: CObject): void 
	{
		if(_object instanceof CMesh)
		{
			this.SetMesh(_object.Key());
		}
	}
	CubeMap(_camComp : CCamComp)
	{
		
		if(this.mTag.has(_camComp.mRead)==false)	return;

		var len=CMath.V3Distance(this.mOwner.GetPos(),_camComp.GetOwner().GetPos());
		var play=this.mCamCompLayer[_camComp.mLayer];
		if(play==null)
		{
			
			if(_camComp.mReadLen>len)
			{
				this.PushCShaderAttr(new CShaderAttr(0,_camComp.GetTex()))
				this.mCamCompLayer[_camComp.mLayer]=_camComp;	
			}
		}
		else if(play==_camComp)
		{
			if(_camComp.mReadLen<len)
			{
				this.mShaderAttrMap.delete(_camComp.GetTex());
				this.BatchClear();
				this.mCamCompLayer[_camComp.mLayer]=null;
			}
		}
		else if(_camComp.mReadLen>len)
		{
			var len2=CMath.V3Distance(this.mOwner.GetPos(),play.GetOwner().GetPos());
			if(len2>len)
			{
				this.mCamCompLayer[_camComp.mLayer]=_camComp;	
				this.mShaderAttrMap.get(_camComp.GetTex()).mKey=_camComp.GetTex();
			}
		}
		
	}
	override EditChange(_pointer : CPointer,_child : boolean)
	{
		super.EditChange(_pointer,_child);
		if(_pointer.member=="mMesh")
		{
			this.SetMesh(this.mMesh);
		}
	}
	override IsShould(_member: string, _type: CObject.eShould) 
	{
		if(_member=="mWeightMat" || _member=="mTreeNode" || _member=="mTree" || _member=="mMeshRes")
			return false;
		return super.IsShould(_member,_type);
	}
	InitPaint()
	{
		super.InitPaint();
		this.InitMesh(this.mMesh);
	}
	EmptyRPChk()
	{
		if(this.mTree==null || this.mRenderPass.length==0)
		{
			let sChk=true;
			for(let each0 of this.mRenderPass)
			{
				if(each0.mTag=="shadowWrite")
				{
					continue;
				}
				sChk=false;
			}
			if(sChk)
				this.mRenderPass.push(new CRPAuto(this.mOwner.GetFrame().Pal().Sl3D().mKey));
		}
		if(this.mMesh=="")
		{
			this.mMesh=this.GetOwner().GetFrame().Pal().GetBoxMesh();
		}
			
	}
	//SetPivot(_pivot)	{	this.m_pivot=_pivot;	}
	SetWeightMat(_off,_tar : CMat)
	{
		
		for (var x = 0; x < 16; ++x)
		{
			this.mWeightMat[_off * 16 + x] = _tar.mF32A[x];
		}
		
	}
	
	SetMesh(_mesh)
	{
		this.mTree=null;
		this.mTexture.length=0;
		this.mMesh=_mesh;
		this.mWeightMat=new Float32Array(0);
		this.mBound.Reset();
		this.BatchClear();
		//this.m_texture=new Array();
		//this.m_material=new Array();
		//this.m_emissive=new Array();
	}
	Prefab(_owner : CSubject)
	{
		super.Prefab(_owner);
		if(this.mAutoLoad!=null)
		{
			this.mMeshRes=_owner.GetFrame().Res().Find(this.mMesh) as CMesh;
			if(this.mMeshRes==null)
			{
				if(_owner.GetFrame().Load().IsLoad(this.mMesh)==false)
				{
					this.mOwner.GetFrame().Load().Load(this.mMesh,this.mAutoLoad);
				}

			}
			
		}
	}
	private InitMesh(_mesh)
	{
		this.mTexLoad=false;
		if(this.mMesh==_mesh && this.mTree!=null)
			return false;
		
		this.mMesh = _mesh;
		this.mMeshRes=this.mOwner.GetFrame().Res().Find(_mesh) as CMesh;
		if(this.mMeshRes==null)
		{
			if(this.mAutoLoad!=null && this.mOwner.GetFrame().Load().IsLoad(_mesh)==false)
				this.mOwner.GetFrame().Load().Load(_mesh,this.mAutoLoad);
			
			return false;
		}
			
			
		if(_mesh.indexOf(".zip")!=-1)
		{
			var fileList=this.mOwner.GetFrame().Res().Find(_mesh) as Array<string>;
			for(var each2 of fileList)
			{
				let ext=CString.ExtCut(each2);
				if(ext.ext=="fbx" || ext.ext=="gltf" || ext.ext=="glb")
				{
					this.mMesh=each2;
					this.mMeshRes=this.mOwner.GetFrame().Res().Find(this.mMesh) as CMesh;
					if(this.mMeshRes==null)
						return false;
					break;
				}
					
			}
		}	
		
		
		
		if(this.mTexture.length==0)
		{
			this.SetTexture(this.mMeshRes.texture);
			
		}
		

		
		this.mWeightMat=new Float32Array(this.mMeshRes.skin.length*4*4);
		

		for(var i=0;i<this.mMeshRes.skin.length*4*4;++i)
		{
			if(i%16==0 || i%16==5 || i%16==10 || i%16==15)
				this.mWeightMat[i]=1;
			else
				this.mWeightMat[i]=0;
		}
		if(this.mMeshRes.skin.length>CDevice.GetProperty(CDevice.eProperty.Sam2DWriteY)/16)
			CAlert.W(_mesh+"skin bone max!"+CDevice.GetProperty(CDevice.eProperty.Sam2DWriteY)/16+"->"+this.mMeshRes.skin.length);
		
	
		this.mTree = new CTree();
		this.mTree.mData=new CMeshCopyNode();
		CMeshTreeUpdate.TreeCopy(this.mMeshRes.meshTree,this.mTree,new CMat(),this.mBound);
		this.mBound.mType=CBound.eType.Box;

		this.mTreeNode.Clear();

		
		var nodeOff=0;
		var node=this.mTreeNode;
		node.Push(new CMeshPaint(this.mMeshRes.meshTree, this.mTree,null));
		while (node.Size()!=nodeOff)
		{
			let nodemp=node.Find(nodeOff);
			if ( nodemp.md.mChild != null)
			{
				node.Push(new CMeshPaint(nodemp.md.mChild, nodemp.mpi.mChild,null));

			}
				
			if (nodemp.md.mColleague != null)
			{
				node.Push(new CMeshPaint(nodemp.md.mColleague,nodemp.mpi.mColleague,null));
			}
			nodeOff++;
		}
		if(this.mCenterPos)
		{
			this.mLMat.UnitCheck();
			this.mLMat.SetV3(3,CMath.V3MulFloat(this.mBound.GetCenter(),-1))
		}

		this.BatchClear();
			
		this.mUpdateFMat=true;
		this.mBoundFMatR = 0;
	}
	Update(_delay: any): void 
	{
		super.Update(_delay);
		if(this.mTree == null)
		{
			if(this.InitMesh(this.mMesh)==false)
				return;

		}
		
		var skin=this.mMeshRes.skin.length>0;

		var nodePOff=1;
		var nodeOff=0;
		var node=this.mTreeNode;
		
		while (node.Size()!=nodeOff)
		{
			let nodemp=node.Find(nodeOff);
			const mpiData=nodemp.mpi.mData;

			if(this.mUpdateFMat==true || nodemp.mpi.mData.updateMat!=0)
			{
				if(skin && nodemp.md.mData.ci!=null)
				{
					CMath.MatMul(this.mLMat,this.mOwner.GetWMat(),nodemp.sum);
					//nodemp.sum.CopyImport(this.m_owner.GetWMat());
				}
				else if(mpiData.FMatAtt==false && mpiData.pst.IsUnit())
				{
					nodemp.mpi.mData.FMatAtt=true;
					nodemp.sumSA.mData=this.GetFMat();
				}
				else if(mpiData.FMatAtt==true)
				{
					if(mpiData.pst.IsUnit()==false)
					{
						nodemp.sumSA.mData=nodemp.sum;
						nodemp.mpi.mData.FMatAtt=false;
						CMath.MatMul(nodemp.mpi.mData.pst,this.GetFMat(),nodemp.sum);
					}
					else if(this.GetFMat()!=nodemp.sumSA.mData)
					{
						nodemp.sumSA.mData=this.GetFMat();
					}
					
				}
				else
				{
					CMath.MatMul(nodemp.mpi.mData.pst,this.GetFMat(),nodemp.sum);
				}
				
			}
			if(skin)
			{
				for (var i = 0; i < this.mMeshRes.skin.length; ++i)
				{
					if (nodemp.md.mData.IsSkinKey(this.mMeshRes.skin[i].key))
					{
						var all=new CMat();
						all = CMath.MatMul(this.mMeshRes.skin[i].mat, nodemp.mpi.mData.pst);
						this.SetWeightMat(i, all);
					}
				}
			}
				
			

			
			if(nodemp.mpi.mData.updateMat==CUpdate.eType.Updated)
				nodemp.mpi.mData.updateMat=CUpdate.eType.Already;

			if ( nodemp.md.mChild != null)
				nodePOff++;
			
				
			if (nodemp.md.mColleague != null)
				nodePOff++;
			
			nodeOff++;
			
		}
	}
	
	Render(_vf : CShader)
	{
		
		if(this.mTree == null)
			return;
		
		
		

		var barr=this.RenderBatch(_vf,this.mTreeNode.Size());
		if(barr==null)	return;
		
		
		if(this.mMeshRes.skin.length>0 && this.mSkinType!=SDF.eSkin.None && _vf.mUniform.get("skin")==null)
		{
			CAlert.E("skin mesh인데 vf는 사용안함. m_skinType을 변경하세요!");
		}


		this.mOwner.GetFrame().BMgr().BatchGlobalOn();
		var skin = this.mMeshRes.skin.length>0 && _vf.mUniform.get("weightArrMat")!=null;
		if (skin)
		{
			if(this.mWeightMat.length==0)
			{
				this.mWeightMat=new Float32Array(4*4);
				for(var i=0;i<4*4;++i)
				{
					if(i%16==0 || i%16==5 || i%16==10 || i%16==15)
						this.mWeightMat[i]=1;
					else
						this.mWeightMat[i]=0;
				}
			}

			this.mOwner.GetFrame().BMgr().SetBatchSA(new CShaderAttr("weightArrMat",16,this.mWeightMat));
			this.mOwner.GetFrame().BMgr().SetBatchSA(new CShaderAttr("skin", this.mSkinType));
		}
		else
		{
			this.mOwner.GetFrame().BMgr().SetBatchSA(new CShaderAttr("skin", SDF.eSkin.None));
		}

		this.mOwner.GetFrame().BMgr().SetBatchSA(new CShaderAttr("windInfluence", this.mWindInfluence));

		this.Common(_vf);

		
		
	
		this.mOwner.GetFrame().BMgr().BatchGlobalOff();
	
	
		var nodePOff=1;
		var nodeOff=0;
		var node=this.mTreeNode;
		
		while (node.Size()!=nodeOff)
		{
			let nodemp=node.Find(nodeOff);
			
			this.RenderMesh(_vf, nodemp,barr,nodeOff);

			if(nodemp.mpi.mData.updateMat==CUpdate.eType.Updated)
				nodemp.mpi.mData.updateMat=CUpdate.eType.Already;

			if ( nodemp.md.mChild != null)
				nodePOff++;
			
				
			if (nodemp.md.mColleague != null)
				nodePOff++;
			
			
			
			nodeOff++;
			
		}
		this.mOwner.GetFrame().BMgr().BatchGlobalClear();
		
	}
	
	RenderMesh(_vf : CShader,_node :CMeshPaint,_barr : Array<CBatch>,_off : number)
	{
		
		
		if (_node.md.mData!=null && _node.md.mData.ci!=null)
		{
			this.mOwner.GetFrame().BMgr().BatchOn();
			
			this.mOwner.GetFrame().BMgr().SetBatchSA(_node.sumSA);

			this.mOwner.GetFrame().BMgr().SetBatchTex(this.mTexture, _node.mpi.mData.textureOff);
			
			if (_vf.mUniform.get("material") != null)
			{
				this.mOwner.GetFrame().BMgr().SetBatchSA(new CShaderAttr("material", this.mMaterial));
			}
			var dm=this.GetDrawMesh(this.mMesh+_node.md.mKey,_vf,_node.md.mData.ci);
			this.mOwner.GetFrame().BMgr().SetBatchMesh(dm);
			//this.m_owner.GetFW().Ren().BMgr().SetAlpha(this.AlphaState());
			_barr[_off]=this.mOwner.GetFrame().BMgr().BatchOff();
		}
		else
		{
			_barr[_off]=null;
		}
	}
	
	GetMesh() { return this.mMesh; }
	GetTree() { return this.mTree; }
	
	
	
	

}

export class CPaintCube extends CPaint3D
{
	constructor(_cubeTex)
	{
		super();
		this.mTexture[0]=_cubeTex;
	}
	InitPaint()
	{
		this.mMesh=this.GetOwner().GetFrame().Pal().GetBoxMesh();
		this.mRenderPass[0]=new CRenderPass(this.GetOwner().GetFrame().Pal().SlCubeKey());
		if(this.mTag.has("sky") || this.mTag.has("table"))
		{
			this.mRenderPass[0].mPriority=CRenderPass.ePriority.BackGround;
			this.mRenderPass[0].mCullFace=CRenderPass.eCull.None;
			this.mRenderPass[0].mCullFrustum=false;
		}
		super.InitPaint();

		
	}
	Sky(_table : boolean=false,_cloud : boolean=false,_light : boolean=false,_star : boolean=false,_aurora : boolean=false)
	{
		
		this.PushTag("sky");

		if(_table)		this.PushTag("table");
		if(_cloud)		this.PushTag("cloud");
		if(_aurora)		this.PushTag("aurora");
		if(_star)		this.PushTag("star");
		if(_light)		this.PushTag("light");

	}
}