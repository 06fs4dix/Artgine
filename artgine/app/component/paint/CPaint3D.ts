import { CUpdate } from "../../../basic/Basic.js";
import { CAlert } from "../../../basic/CAlert.js";
import {CArray} from "../../../basic/CArray.js";
import { CConsol } from "../../../basic/CConsol.js";
import { CHash } from "../../../basic/CHash.js";
import { CObject, CPointer } from "../../../basic/CObject.js";
import {CString} from "../../../basic/CString.js";
import {CTree} from "../../../basic/CTree.js";
import { CBound } from "../../../geometry/CBound.js";
import {CMat} from "../../../geometry/CMat.js";
import {CMath} from "../../../geometry/CMath.js";
import { CRay } from "../../../geometry/CRay.js";
import { CUtilMath } from "../../../geometry/CUtilMath.js";
import {CVec1} from "../../../geometry/CVec1.js";
import { CVec2 } from "../../../geometry/CVec2.js";
import { CVec3 } from "../../../geometry/CVec3.js";
import { CVec4 } from "../../../geometry/CVec4.js";
import { CBatch } from "../../../render/CBatchMgr.js";
import {CDevice} from "../../../render/CDevice.js";
import {CMesh} from "../../../render/CMesh.js";
import { CMeshCopyNode } from "../../../render/CMeshCopyNode.js";
import { CMeshCreateInfo } from "../../../render/CMeshCreateInfo.js";
import { CMeshDataNode } from "../../../render/CMeshDataNode.js";
import { CMeshDrawNode } from "../../../render/CMeshDrawNode.js";
import {CMeshPaint} from "../../../render/CMeshPaint.js";
import {CMeshTreeUpdate} from "../../../render/CMeshTreeUpdate.js";
import { CRenderPass } from "../../../render/CRenderPass.js";

import {CShader, CVertexFormat} from "../../../render/CShader.js";
import {CShaderAttr} from "../../../render/CShaderAttr.js";
import { SDF } from "../../../z_file/SDF.js";
import { CRPAuto } from "../../canvas/CRPMgr.js";
import {CSubject} from "../../subject/CSubject.js";
import {CBrushComp} from "../CBrushComp.js";
import {CPaint} from "./CPaint.js";

export class CPaint3D extends CPaint
{
	public mTree : CTree<CMeshCopyNode>;
	public mMesh : string;
	public mMeshRes : CMesh;
	public mWeightMat : Float32Array;
	public mCenterPos=false;
	public mTargetScale=0;
	public mTreeNode=new CArray<CMeshPaint>();

	public mSkinType=SDF.eSkin.None;
	public mCamCompSet : Set<CBrushComp>=new Set<CBrushComp>();
	public mBakedLight : string = null;
	public mWindInfluence : CVec1 = new CVec1(0.0);

	public mCamCompLayer=[];
	public mTexLoad=false;
	
	mFMatLink=false;

	constructor();
	constructor(_mesh : string);
	constructor(_mesh : string,_centerPos : boolean,_targetScale : number);
	constructor(_mesh="Artgine/box.mesh",_centerPos=false,_targetScale=0)
	{
		super();
		

		this.mCenterPos=_centerPos;
		this.mTargetScale=_targetScale;
		this.mTree=null;
		this.mMesh=_mesh;
		
		this.mWeightMat=new Float32Array(0);
		
		//this.m_texture=new Array();
		
	}
	override SetOwner(_obj :CSubject)
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
	override EditDrop(_object: CObject): void 
	{
		if(_object instanceof CMesh)
		{
			this.SetMesh(_object.Key());
		}
	}
	CubeMap(_camComp : CBrushComp)
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
				this.ClearBatch();
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
		if(_member=="mWeightMat" || _member=="mTreeNode" || _member=="mTree" || _member=="mMeshRes" ||
			_member=="mCenterPos" || _member=="mTargetScale"
		)
			return false;
		return super.IsShould(_member,_type);
	}
	override InitChk()
	{
		super.InitChk();
		if(this.mTree == null)
		{
			if(this.InitMesh(this.mMesh)==false)
				this.mInit=false;
			
		}
		
			

		
	}
	override EmptyRPChk()
	{
		if(this.mTree==null || this.mRenderPass.length==0)
		{
			let sChk=true;
			for(let each0 of this.mRenderPass)
			{
				if(each0.mTag.has("shadowWrite")==true)
				{
					continue;
				}
				sChk=false;
			}
			if(sChk)
				this.mRenderPass.push(new CRPAuto(this.mOwner.GetFrame().Pal().Sl3D().mKey));
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
		this.mTextureKey.length=0;
		this.mMesh=_mesh;
		this.mWeightMat=new Float32Array(0);
		this.mBound.Reset();
		this.ClearBatch();
		this.mStartChk=true;
		//this.m_texture=new Array();
		//this.m_material=new Array();
		//this.m_emissive=new Array();
	}
	override Prefab(_owner : CSubject)
	{
		super.Prefab(_owner);
		if(this.mAutoLoad!=null)
		{
			this.mMeshRes=_owner.GetFrame().Res().Find(this.mMesh) as CMesh;
			if(this.mMeshRes==null)
			{
				if(_owner.GetFrame().Load().IsLoad(this.mMesh)==false)
				{
					this.mOwner.GetFrame().Load().Exe(this.mMesh,this.mAutoLoad);
				}

			}
			
		}
	}
	private InitMesh(_mesh)
	{
		this.mTexLoad=false;
		if(this.mOwner.GetFrame()==null)	return false;
		if(this.mMesh==_mesh && this.mTree!=null)
			return false;
		
		this.mMesh = _mesh;
		this.mMeshRes=this.mOwner.GetFrame().Res().Find(_mesh) as CMesh;
		if(this.mMeshRes==null)
		{
			if(this.mAutoLoad!=null && this.mOwner.GetFrame().Load().IsLoad(_mesh)==false)
				this.mOwner.GetFrame().Load().Exe(_mesh,this.mAutoLoad);
			
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
		
		
		
		if(this.mTextureKey.length==0)
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
		if(this.mMeshRes.skin.length>CDevice.GetProperty(CDevice.eProperty.Sam2DSize)/4)
		{
			this.mWeightMat=new Float32Array(0);
			CAlert.W(_mesh+"skin bone max!"+CDevice.GetProperty(CDevice.eProperty.Sam2DSize)/4+"->"+this.mMeshRes.skin.length);
		}
		if(this.mMeshRes.skin.length>0)
		{
			this.mSkinType=SDF.eSkin.Bone;
			this.PushTag("weightMat");
		}
		else
			this.mSkinType=SDF.eSkin.None;
		
	
		this.mTree = new CTree();
		this.mTree.mData=new CMeshCopyNode();
		CMeshTreeUpdate.TreeCopy(this.mMeshRes.meshTree,this.mTree,new CMat(),this.mBound);
		this.UpdateLMat();
		this.mBound.mType=CBound.eType.Box;

		this.mTreeNode.Clear();

		
		//var nodeOff=0;
		var node=this.mTreeNode;
		node.Push(new CMeshPaint(this.mMeshRes.meshTree, this.mTree,null));
		//while (node.Size()!=nodeOff)
		for(let nodeOff=0;nodeOff<node.Size();nodeOff++)
		{
			let nodemp=node.Find(nodeOff);
			if (nodemp.md.mColleague != null)
			{
				// node.mArray.splice(nodeOff+1,0,new CMeshPaint(nodemp.md.mColleague,nodemp.mpi.mColleague,null));
				// node.mLength++;
				node.Push(new CMeshPaint(nodemp.md.mColleague,nodemp.mpi.mColleague,null));
			}
				
			
			if ( nodemp.md.mChild != null)
			{
				// node.mArray.splice(nodeOff+1,0,new CMeshPaint(nodemp.md.mChild,nodemp.mpi.mChild,null));
				// node.mLength++;
				node.Push(new CMeshPaint(nodemp.md.mChild, nodemp.mpi.mChild,null));
			}
				

			
				
			
		}
		this.ExeLocalMat(this.mCenterPos,this.mTargetScale);
		

		this.ClearBatch();
			
		this.mUpdateFMat=true;
		this.mBW.mRadian=0;

		if(node.Size()==1)
		{
			let ne=node.Find(0);
			if(ne.sum.IsUnit())
			{
				ne.sumSA.mData=this.GetFMat();
				this.mFMatLink=true;
			}
		}
		// this.mBound.mMin=CMath.V3MulMatCoordi(this.mBound.mMin,this.mLMat);
		// this.mBound.mMax=CMath.V3MulMatCoordi(this.mBound.mMax,this.mLMat);
		this.mBound.MatCoordi(this.mLMat);

		return true;
	}
	
	override Update(_update : CUpdate): void 
	{
		super.Update(_update);
		

		if(this.mUpdateFMat==false)	return;
		// if(CWASM.IsWASM())
		// {
		// 	this.mFMat.mF32A[3]=this.mFMat.mF32A[12];
		// 	this.mFMat.mF32A[7]=this.mFMat.mF32A[13];
		// 	this.mFMat.mF32A[11]=this.mFMat.mF32A[14];
		// }
		if(this.mFMatLink)	return;
		
		//const skin=this.mWeightMat.length!=0;

		//var nodePOff=1;
		//var nodeOff=0;
		const node=this.mTreeNode;
		
		//while (node.Size()!=nodeOff)
		const nSize=node.Size();

		for(let nodeOff=0;nodeOff<nSize;nodeOff++)
		{
			const nodemp=node.mArray[nodeOff];//node.Find(nodeOff);
			const mpiData=nodemp.mpi.mData;

			//FMat로 되어 있으면 유니폼해서 계산 필요 없다. 내부 매트릭스 갱신되면 다시 해야함
			if(mpiData.updateMat!==CUpdate.eType.Not || mpiData.FMatAtt===false)
			{
				if(this.mSkinType!=SDF.eSkin.None && nodemp.md.mData.ci!=null)
				{
					//CMath.MatMul(this.mLMat,this.mOwner.GetMat(),nodemp.sum);
					nodemp.sum.Import(this.GetFMat());
					
					//CMath.MatMul(this.mLMat,this.mOwner.GetMat(),nodemp.sum);
				}
				else if(mpiData.FMatAtt==false && mpiData.pst.IsUnit())
				{
					mpiData.FMatAtt=true;
					nodemp.sumSA.mData=this.GetFMat();
					nodemp.sumSA.mTag=null;
				}
				else if(mpiData.FMatAtt==true)
				{
					if(mpiData.pst.IsUnit()==false)
					{
						nodemp.sumSA.mData=nodemp.sum;
						mpiData.FMatAtt=false;
						nodemp.sumSA.mTag=null;
						CMath.MatMul(mpiData.pst,this.GetFMat(),nodemp.sum,true);

					}
					else if(this.GetFMat()!=nodemp.sumSA.mData)
					{
						nodemp.sumSA.mData=this.GetFMat();
					}
					
				}
				else
				{
					CMath.MatMul(mpiData.pst,this.GetFMat(),nodemp.sum,true);
				}
				if(mpiData.updateMat==CUpdate.eType.Updated)
					mpiData.updateMat=CUpdate.eType.Already;
				else if(mpiData.updateMat==CUpdate.eType.Already)
					mpiData.updateMat=CUpdate.eType.Not;
			}
			if(this.mSkinType==SDF.eSkin.Bone)
			{
				for (var i = 0; i < this.mMeshRes.skin.length; ++i)
				{
					if (nodemp.md.mData.IsSkinKey(this.mMeshRes.skin[i].key))
					{
						var all=new CMat();
						all = CMath.MatMul(this.mMeshRes.skin[i].mat, mpiData.pst);
						this.SetWeightMat(i, all);
					}
				}
			}
				
			

			
			

	
			
			//nodeOff++;
			
		}
	}
	
	override Render(_vf : CShader)
	{
		
		
		
		
		

		var barr=this.RenderBatch(_vf,this.mTreeNode.Size());
		if(barr==null)	return;
		
		if(this.mTree == null)
		{
			this.ClearBatch();
			return;
		}
			
		// if(this.mMeshRes.skin.length>0 && this.mSkinType!=SDF.eSkin.None && _vf.mUniform.get("skin")==null)
		// {
		// 	CAlert.E("skin mesh인데 vf는 사용안함. m_skinType을 변경하세요!");
		// }


		this.mOwner.GetFrame().BMgr().BatchGlobalOn();
		
		//var skin = this.mWeightMat.length!=0 && _vf.mUniform.get("weightArrMat")!=null;
		if (this.mSkinType==SDF.eSkin.Bone)
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
		}
		
		this.mOwner.GetFrame().BMgr().SetBatchSA(new CShaderAttr("skin", this.mSkinType));
		this.mOwner.GetFrame().BMgr().SetBatchSA(new CShaderAttr("windInfluence", this.mWindInfluence));

		this.Common(_vf);

		
		
	
		this.mOwner.GetFrame().BMgr().BatchGlobalOff();
	
	
		
		var node=this.mTreeNode;

		const nSize=node.Size();

		for(let nodeOff=0;nodeOff<nSize;nodeOff++)
		{
			let nodemp=node.Find(nodeOff);
			
			this.RenderMesh(_vf, nodemp,barr,nodeOff);			
		}
		this.mOwner.GetFrame().BMgr().BatchGlobalClear();
		
	}
	
	RenderMesh(_vf : CShader,_node :CMeshPaint,_barr : Array<CBatch>,_off : number)
	{
		// let test=false;
		// if(_node.md.Key().indexOf("mu")!=-1)
		// {
		// 	test=true;
		// }
		
		if (_node.md.mData!=null && _node.md.mData.ci!=null && _node.md.mData.textureOff.length>0)
		{
			this.mOwner.GetFrame().BMgr().BatchOn();
			
			// if(CWASM.IsWASM())
			// {
			// 	_node.sumSA.mKey="worldMat43";
			// 	_node.sumSA.mType=12;
			// }

			//_node.sumSA.mKey="worldMat43";
			switch(this.mWorldMatType)
			{
				case CMat.eType.PRS:	_node.sumSA.mKey="worldMat";	break;
				case CMat.eType.Short3D:	_node.sumSA.mKey="worldMatShort";	break;
			}
			_node.sumSA.mType=this.mWorldMatType;
			this.mOwner.GetFrame().BMgr().SetBatchSA(new CShaderAttr("worldMatType",new CVec1(this.mWorldMatType)));

			//_node.sumSA.mKey="worldMat";
			
			this.mOwner.GetFrame().BMgr().SetBatchSA(_node.sumSA);

			if(_node.mpi.mData.color!=null)
			{
				this.PushTag("CAModel");
				this.mOwner.GetFrame().BMgr().SetBatchSA(new CShaderAttr("colorModel",_node.mpi.mData.color));
				this.mOwner.GetFrame().BMgr().SetBatchSA(new CShaderAttr("alphaModel",_node.mpi.mData.alpha));
			}
			// if(_node.mpi.mData.texture.length==0)
			// 	this.mOwner.GetFrame().BMgr().SetBatchTex(this.GetResTexture(_node.mpi.mData.textureOff));
			// else
			this.mOwner.GetFrame().BMgr().SetBatchTex(this.mTextureKey,_node.mpi.mData.textureOff);
			
			if (_vf.mUniform.get("material") != null)
				this.mOwner.GetFrame().BMgr().SetBatchSA(new CShaderAttr("material", this.mMaterial));
			
			if (_vf.mUniform.get("part") != null)
				this.mOwner.GetFrame().BMgr().SetBatchSA(new CShaderAttr("part", CHash.HashCode(_node.md.mKey)));
			
			var dm=this.GetDrawMesh("Artgine/DM/"+this.mMesh+_node.md.mKey,_vf,_node.md.mData.ci);
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
	
	ExeLocalMat(_centerPos=false,_targetScale=0)
	{
		if(this.mCenterPos)
			this.mLMat.SetV3(3,CMath.V3MulFloat(this.mBound.GetCenter(),-1))
		if(this.mTargetScale!=0)
		{
			let size=this.mBound.GetSize();
			let maxSize=CMath.Max(CMath.Max(size.x,size.y),size.z);
			this.mLMat.mF32A[0]=this.mTargetScale/maxSize;
			this.mLMat.mF32A[5]=this.mTargetScale/maxSize;
			this.mLMat.mF32A[10]=this.mTargetScale/maxSize;
		}
		

		this.mLMat.UnitCheck();
	}
	
	

}

export class CPaintCube extends CPaint3D
{
	constructor(_cubeTex)
	{
		super();
		this.mTextureKey[0]=_cubeTex;
	}
	override InitChk()
	{
		// this.mLMat.mF32A[0]=100;
		// this.mLMat.mF32A[5]=100;
		// this.mLMat.mF32A[10]=100;
		
		this.mMesh=this.GetOwner().GetFrame().Pal().GetBoxMesh();
		this.mRenderPass[0]=new CRenderPass(this.GetOwner().GetFrame().Pal().SlCubeKey());
		if(this.mTag.has("sky") || this.mTag.has("table"))
		{
			this.mRenderPass[0].mPriority=CRenderPass.ePriority.BackGround;
			this.mRenderPass[0].mCullFace=CRenderPass.eCull.None;
			this.mRenderPass[0].mCullFrustum=false;
		}
		super.InitChk();
		
		
		
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
//static mesh only
export class CPaint3DMerge extends CPaint
{
	constructor(_meshList : Array<string>,_matList : Array<CMat>,_centerPos=false,_targetScale=0)
	{
		super();
		this.mMeshList=_meshList;
		this.mMatList=_matList;
		this.mCenterPos=_centerPos;
		this.mTargetScale=_targetScale;
	}
	mMeshList : Array<string>;
	mMatList : Array<CMat>;
	mMeshDataNode=new CMeshDataNode();
    mWeightMat : Float32Array;
    mWeightMatArr : CMat[] = [];
	mHash="";
	public mCenterPos=false;
	public mTargetScale=0;
    mWindInfluence : CVec1 = new CVec1(0.0);
	override IsShould(_member: string, _type: CObject.eShould): boolean {
		if(_member=="mMeshDataNode")	return false;
		return super.IsShould(_member,_type);
	}
	override InitChk(): void 
	{
		super.InitChk();	
		
		for(let i=0;i<this.mMeshList.length;++i)
		{
			let mesh=this.GetOwner().GetFrame().Res().Find(this.mMeshList[i]) as CMesh;
			if(mesh==null)
			{
				this.mInit=false;
				if(this.GetOwner().GetFrame().Load().IsLoad(this.mMeshList[i])==false)
				{
					this.GetOwner().GetFrame().Load().Exe(this.mMeshList[i]);
				}
				

			}

		}
		
	}
	// Update(_delay: any): void {
	// 	super.Update(_delay);
	// }
	override Start(): void {
		this.mMeshDataNode.ci=new CMeshCreateInfo();
		this.mBound.Reset();
		this.mBound.SetType(CBound.eType.Box);
		this.mHash="";
		for(let i=0;i<this.mMeshList.length;++i)
		{
			let mesh=this.GetOwner().GetFrame().Res().Find(this.mMeshList[i]) as CMesh;
			this.mHash+=this.mMeshList[i];
			this.mHash+=this.mMatList[i].ToStr();

            const calcSkinMat = this.SkinCalc(new CMat(), mesh, mesh.meshTree);
            this.Merge(this.mMatList[i], mesh, mesh.meshTree, this.mMeshDataNode.ci, this.mBound, calcSkinMat);

		}
		this.mHash=CHash.HashCode(this.mHash)+"";
	}
	override Render(_vf: CShader): void {
		
		

		var barr=this.RenderBatch(_vf,1);
		if(barr==null)	return;

		
		

		this.mOwner.GetFrame().BMgr().BatchOn();
		this.Common(_vf);

        let wsa=new CShaderAttr("worldMat", this.GetFMat());
		switch(this.mWorldMatType)
		{
			case CMat.eType.Short2D:	wsa.mKey="worldMatShort";	break;
		}
		wsa.mType=this.mWorldMatType;
		this.mOwner.GetFrame().BMgr().SetBatchSA(new CShaderAttr("worldMatType",new CVec1(this.mWorldMatType)));
		this.mOwner.GetFrame().BMgr().SetBatchSA(wsa);
		if (_vf.mUniform.get("material") != null)
		{
			this.mOwner.GetFrame().BMgr().SetBatchSA(new CShaderAttr("material", this.mMaterial));
		}
        this.mOwner.GetFrame().BMgr().SetBatchSA(new CShaderAttr("weightArrMat",16,this.mWeightMat));
        this.mOwner.GetFrame().BMgr().SetBatchSA(new CShaderAttr("skin", SDF.eSkin.None));
        if(_vf.mUniform.get("windInfluence")!=null)
			this.mOwner.GetFrame().BMgr().SetBatchSA(new CShaderAttr("windInfluence", this.mWindInfluence));
		this.mOwner.GetFrame().BMgr().SetBatchTex(this.mTextureKey);
		var dm=this.GetDrawMesh("Artgine/DM/3DM"+this.mHash,_vf,this.mMeshDataNode.ci);
		this.mOwner.GetFrame().BMgr().SetBatchMesh(dm);

		barr[0]=this.mOwner.GetFrame().BMgr().BatchOff();
	}

    Wind(_influence: number) 
	{
		this.PushTag("wind");
		this.mWindInfluence.x = _influence;
	}
    SkinCalc(_PMat : CMat,_tMesh : CMesh,_tNode : CTree<CMeshDataNode>,_skinMatList : CMat[] = new Array(_tMesh.skin.length))
    {
        // 복사할 메시의 로컬 매트릭스 LMat
		let LMat=CMath.MatScale(_tNode.mData.sca);
		if(_tNode.mData.rot.w >= 100000)    // euler
            CMath.MatMul(LMat,CMath.MatRotation(_tNode.mData.rot),LMat);
        else
            CMath.MatMul(LMat,CMath.QutToMat(_tNode.mData.rot),LMat);
		LMat.SetV3(3,_tNode.mData.pos);

        let LPMat=CMath.MatMul(LMat,_PMat);

        for(let i = 0; i < _tMesh.skin.length; i++)
        {
            if(_tNode.mData.IsSkinKey(_tMesh.skin[i].key)) {
                _skinMatList[i] = CMath.MatMul(_tMesh.skin[i].mat, LPMat);
            }
        }
        if(_tNode.mColleague!=null)
			this.SkinCalc(_PMat,_tMesh,_tNode.mColleague,_skinMatList);
		if(_tNode.mChild!=null)
			this.SkinCalc(LPMat,_tMesh,_tNode.mChild,_skinMatList);

        return _skinMatList;
    }
	Merge(_PMat : CMat,_tMesh : CMesh,_tNode : CTree<CMeshDataNode>,_oCI : CMeshCreateInfo,_bound : CBound,_skinMatList : CMat[])
	{
        // 복사할 메시의 로컬 매트릭스 LMat
		let LMat=CMath.MatScale(_tNode.mData.sca);
		if(_tNode.mData.rot.w >= 100000)    // euler
            CMath.MatMul(LMat,CMath.MatRotation(_tNode.mData.rot),LMat);
        else
            CMath.MatMul(LMat,CMath.QutToMat(_tNode.mData.rot),LMat);
		LMat.SetV3(3,_tNode.mData.pos);

        // 월드 매트릭스 PMat을 곱해 FMat처럼 사용
		let LPMat=CMath.MatMul(LMat,_PMat);

        // 메시가 존재함
		if(_tNode.mData.ci!=null)
		{
            // 복사할 메시의 정점 정보
			let tvb=_tNode.mData.ci.GetVFType(CVertexFormat.eIdentifier.Position);
			let tub=_tNode.mData.ci.GetVFType(CVertexFormat.eIdentifier.UV);
			let tnb=_tNode.mData.ci.GetVFType(CVertexFormat.eIdentifier.Normal);
			let ttb=_tNode.mData.ci.GetVFType(CVertexFormat.eIdentifier.TexOff);
            let tweb=_tNode.mData.ci.GetVFType(CVertexFormat.eIdentifier.Weight);
            let twib=_tNode.mData.ci.GetVFType(CVertexFormat.eIdentifier.WeightIndex);

            // 텍스쳐 복사
			let texOff=[];
            for(let ttexOff of _tNode.mData.textureOff)
			{
				let push=true;
				for(let i=0;i<this.mTextureKey.length;++i)
				{
					if(this.mTextureKey[i]==_tMesh.texture[ttexOff])
					{
						push=false;
						texOff.push(i);
						break;
					}
				}
				if(push)
				{
					texOff.push(this.mTextureKey.length);
					this.mTextureKey.push(_tMesh.texture[ttexOff]);
				}
			}
			
            // 복사받을 메시의 정점 정보
			let ovb=_oCI.GetVFType(CVertexFormat.eIdentifier.Position);
			let oub=_oCI.GetVFType(CVertexFormat.eIdentifier.UV);
			let onb=_oCI.GetVFType(CVertexFormat.eIdentifier.Normal);
			let otb=_oCI.GetVFType(CVertexFormat.eIdentifier.TexOff);
            let oweb=_oCI.GetVFType(CVertexFormat.eIdentifier.Weight);
            let owib=_oCI.GetVFType(CVertexFormat.eIdentifier.WeightIndex);
			if(ovb.length==0)
			{
				_oCI.Create(CVertexFormat.eIdentifier.Position);
				ovb=_oCI.GetVFType(CVertexFormat.eIdentifier.Position);
			}
			if(oub.length==0)
			{
				_oCI.Create(CVertexFormat.eIdentifier.UV);
				oub=_oCI.GetVFType(CVertexFormat.eIdentifier.UV);
			}
			if(onb.length==0)
			{
				_oCI.Create(CVertexFormat.eIdentifier.Normal);
				onb=_oCI.GetVFType(CVertexFormat.eIdentifier.Normal);
			}
			if(otb.length==0)
			{
				_oCI.Create(CVertexFormat.eIdentifier.TexOff);
				otb=_oCI.GetVFType(CVertexFormat.eIdentifier.TexOff);
			}
            if(oweb.length==0)
			{
				_oCI.Create(CVertexFormat.eIdentifier.Weight);
				oweb=_oCI.GetVFType(CVertexFormat.eIdentifier.Weight);
			}
            if(owib.length==0)
			{
				_oCI.Create(CVertexFormat.eIdentifier.WeightIndex);
				owib=_oCI.GetVFType(CVertexFormat.eIdentifier.WeightIndex);
			}

            // 버텍스 복사
			for(let i=0;i<tvb[0].bufF.Size(3);++i)
			{
				let v=tvb[0].bufF.V3(i);
				let u=tub[0].bufF.V2(i);
				let n=tnb[0].bufF.V3(i);
				let t=ttb[0].bufF.V3(i);

                // 정점 포지션
				ovb[0].bufF.Push(v);
				oub[0].bufF.Push(u);
				onb[0].bufF.Push(n);

                // 텍스쳐 오프셋
				let toff=new CVec3(-1,-1,-1);
				if(t.x!=-1)	toff.x=texOff[t.x];
				if(t.y!=-1)	toff.y=texOff[t.y];
				if(t.z!=-1)	toff.z=texOff[t.z];
				otb[0].bufF.Push(toff);

                // we 있으면 복사
                if(tweb.length > 0) {
                    let we=tweb[0].bufF.V4(i);
                    let wi=twib[0].bufF.V4(i);

                    oweb[0].bufF.Push(we);
                    owib[0].bufF.Push(wi);
                }

                // we 없으면 새로 생성
                else {
                    oweb[0].bufF.Push(new CVec4(0, 0, 0, 0));
                    owib[0].bufF.Push(new CVec4(0, 0, 0, 0));
                }
			}

            // mTargetScale, mCenterPos 추가된 매트릭스
            let mat=new CMat();
            if(this.mTargetScale!=0)
            {
                let size=_tNode.mData.ci.bound.GetSize();
                let maxSize=CMath.Max(CMath.Max(size.x,size.y),size.z);
                mat.mF32A[0]=this.mTargetScale/maxSize;
                mat.mF32A[5]=this.mTargetScale/maxSize;
                mat.mF32A[10]=this.mTargetScale/maxSize;
            }
            if(this.mCenterPos)
            {
                let center=_tNode.mData.ci.bound.GetCenter();
                mat.mF32A[12]=center.x*mat.mF32A[0];
                mat.mF32A[13]=center.y*mat.mF32A[5];
                mat.mF32A[14]=center.z*mat.mF32A[10];
            }
            mat.UnitCheck();
            LPMat=CMath.MatMul(mat,LPMat);

            // skin mat 적용
            if(tweb.length > 0) {
                let tempv=new CVec3();
                for(let i=0;i<tvb[0].bufF.Size(3);++i)
                {
                    let we=tweb[0].bufF.V4(i);
                    let wi=twib[0].bufF.V4(i);
                    let v=ovb[0].bufF.V3(_oCI.vertexCount + i);

                    if(we.x+we.y+we.z+we.w>0.0)
                    {
                        var SkinMat = CMath.MatMulFloat(_skinMatList[wi.x], we.x);
                        SkinMat = CMath.MatAdd(CMath.MatMulFloat(_skinMatList[wi.y], we.y), SkinMat);
                        SkinMat = CMath.MatAdd(CMath.MatMulFloat(_skinMatList[wi.z], we.z), SkinMat);
                        SkinMat = CMath.MatAdd(CMath.MatMulFloat(_skinMatList[wi.w], we.w), SkinMat);

                        CMath.V3MulMatCoordi(v,SkinMat,tempv);
                        ovb[0].bufF.X3(_oCI.vertexCount + i,tempv.x);
                        ovb[0].bufF.Y3(_oCI.vertexCount + i,tempv.y);
                        ovb[0].bufF.Z3(_oCI.vertexCount + i,tempv.z);
                    }
                }
            }
            
            // 추가된 버텍스에 매트릭스 적용
            let tempv=new CVec3();
            for(let i=_oCI.vertexCount;i<ovb[0].bufF.Size(3);++i)
            {
                let v=ovb[0].bufF.V3(i);
            
                CMath.V3MulMatCoordi(v,LPMat,tempv);
                ovb[0].bufF.X3(i,tempv.x);
                ovb[0].bufF.Y3(i,tempv.y);
                ovb[0].bufF.Z3(i,tempv.z);
            }

			// 인덱스 복사
			let tiv=_tNode.mData.ci.index;
			for(let i=0;i<tiv.length;++i)
			{
                _bound.InitBound(ovb[0].bufF.V3(tiv[i]+_oCI.vertexCount));
				_oCI.index.push(tiv[i]+_oCI.vertexCount);
			}

            // 버텍스 카운트, 인덱스 카운트에 추가된 수량만큼 추가
			_oCI.vertexCount+=_tNode.mData.ci.vertexCount;
			_oCI.indexCount+=_tNode.mData.ci.indexCount;

		}
		if(_tNode.mColleague!=null)
			this.Merge(_PMat,_tMesh,_tNode.mColleague,_oCI,_bound,_skinMatList);
		if(_tNode.mChild!=null)
			this.Merge(LPMat,_tMesh,_tNode.mChild,_oCI,_bound,_skinMatList);
		
	}
    
	override EmptyRPChk()
	{
		if(this.mRenderPass.length==0)
		{
			let sChk=true;
			for(let each0 of this.mRenderPass)
			{
				if(each0.mTag.has("shadowWrite")==true)
				{
					continue;
				}
				sChk=false;
			}
			if(sChk)
				this.mRenderPass.push(new CRPAuto(this.mOwner.GetFrame().Pal().Sl3D().mKey));
		}
	}
	
}
