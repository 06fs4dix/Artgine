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
import { CPoolGeo } from "../../../geometry/CPoolGeo.js";
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

	public mBrushCompArr=[];
	public mTexLoad=false;
	
	//mFMatLink=false;

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
		this.BuildMesh(this.mMesh);
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
		
		if(this.mTag.has(_camComp.mReadTag)==false)	return;

		var len=CMath.V3Distance(this.mOwner.GetPos(),_camComp.GetOwner().GetPos());
		var play=this.mBrushCompArr[_camComp.mTexOff];
		if(play==null)
		{
			
			if(_camComp.mReadLen>len)
			{
				this.PushCShaderAttr(new CShaderAttr(0,_camComp.GetTex()))
				this.PushCShaderAttr(new CShaderAttr("envmapOn", 1));
				this.mBrushCompArr[_camComp.mTexOff]=_camComp;	
			}
		}
		else if(play==_camComp)
		{
			if(_camComp.mReadLen<len)
			{
				this.mShaderAttrMap.delete(_camComp.GetTex());
				this.ClearBatch();
				this.mBrushCompArr[_camComp.mTexOff]=null;
			}
		}
		else if(_camComp.mReadLen>len)
		{
			var len2=CMath.V3Distance(this.mOwner.GetPos(),play.GetOwner().GetPos());
			if(len2>len)
			{
				this.mBrushCompArr[_camComp.mTexOff]=_camComp;	
				this.FindCShaderAttr(0).mKey=_camComp.GetTex();
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
			if(this.BuildMesh(this.mMesh)==false)
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
	private BuildMesh(_mesh)
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

		// if(node.Size()==1)
		// {
		// 	let ne=node.Find(0);
		// 	if(ne.sum.IsUnit())
		// 	{
		// 		ne.sumSA.mData=this.GetFMat();
		// 		this.mFMatLink=true;
		// 	}
		// }
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
		//if(this.mFMatLink)	return;
		
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
				else if(this.mSkinType==SDF.eSkin.Bake)
				{
					//베이크는 행렬이 이미 텍스처에 구워져 있어서 FMat 갱신이 필요 없다.
					//빈 분기로 아래 체인을 막는다. updateMat 소진은 뒤에서 그대로 돈다
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
		if(this.mTargetScale!=0)
		{
			let size=this.mBound.GetSize();
			let maxSize=CMath.Max(CMath.Max(size.x,size.y),size.z);
			this.mLMat.mF32A[0]=this.mTargetScale/maxSize;
			this.mLMat.mF32A[5]=this.mTargetScale/maxSize;
			this.mLMat.mF32A[10]=this.mTargetScale/maxSize;
		}
		if(this.mCenterPos)
			this.mLMat.SetV3(3,CMath.V3MulV3(this.mBound.GetCenter(),new CVec3(-this.mLMat.mF32A[0],-this.mLMat.mF32A[5],-this.mLMat.mF32A[10])));

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
	// Reset 발생 시 다음 Render에서 GetDrawMesh를 modify로 1회 갱신하기 위한 플래그
	mReset = false;
	// SkinCalc(new CMat(), mesh, mesh.meshTree)는 인스턴스 매트릭스와 무관하게
	// 메시 리소스(트리 포즈)에만 의존해 항상 같은 결과를 낸다. 메시 키별로 캐시해 재계산을 없앤다.
	mSkinMatCache : Map<string, CMat[]> = new Map();
	// 메시 키별 "로컬(인스턴스=항등행렬) 위치" 캐시. Merge()의 LPMat=LMat*_PMat 결합 방식상
	// 인스턴스 매트릭스는 항상 맨 마지막에 곱해지므로, 최종위치=로컬위치×인스턴스매트릭스로 분리된다.
	// uv/normal/texOff/weight/weightIndex/index는 인스턴스와 무관해 이 캐시가 필요 없다.
	mLocalPosCache : Map<string, Float32Array> = new Map();
	// 마지막으로 구성에 실제 사용된 mMeshList(참조 스냅샷). 토폴로지 동일 여부 판별에 쓰인다.
	mMeshListPrev : Array<string> = null;
	// 각 mMeshList 엔트리가 병합 버퍼에서 차지하는 정점 시작 오프셋(마지막에 총 정점 수 sentinel).
	// 토폴로지(메시 목록)가 그대로일 때만 유효 — RepositionOnly가 이 오프셋으로 position만 덮어쓴다.
	mMeshVertexStart : number[] = [];
	// 마지막으로 실제 정점을 굽는 데 쓰인 인스턴스 매트릭스 스냅샷(복제, 인덱스 대응).
	// RepositionOnly에서 "이동만 바뀌었는지" 판별하는 기준선으로 쓰인다.
	mMatListPrev : CMat[] = null;
	// 이번 갱신이 position 만 고쳤는가(RepositionOnly 경로). true 면 Render 가 메시를 통째로
	// 다시 올리지 않고 position 의 바뀐 구간만 올린다
	mPosOnly = false;
	override IsShould(_member: string, _type: CObject.eShould): boolean {
		if(_member=="mMeshDataNode" || _member=="mReset" || _member=="mSkinMatCache" ||
			_member=="mLocalPosCache" || _member=="mMeshListPrev" || _member=="mMeshVertexStart" ||
			_member=="mMatListPrev" || _member=="mPosOnly")	return false;
		return super.IsShould(_member,_type);
	}
	// 두 메시 목록이 원소별로 완전히 같은지(개수+순서+키 전부) 비교한다.
	// join("|") 방식은 키에 구분자가 우연히 들어가면 오탐 가능성이 있어 원소 직접 비교로 대체.
	static SameMeshList(_a : Array<string>,_b : Array<string>): boolean
	{
		if(_a==null || _b==null || _a.length!=_b.length)	return false;
		for(let i=0;i<_a.length;++i)
			if(_a[i]!=_b[i])	return false;
		return true;
	}
	// 회전/스케일(0~11, 15번 성분)이 완전히 같고 이동(12~14번)만 다른지 확인한다.
	static MatOnlyTranslationDiff(_a : CMat,_b : CMat): boolean
	{
		for(let i=0;i<12;++i)
			if(_a.mF32A[i]!=_b.mF32A[i])	return false;
		if(_a.mF32A[15]!=_b.mF32A[15])	return false;
		return true;
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
		this.BuildCI();
	}
	// 메시 키의 SkinCalc 결과를 구해 캐시한다(메시 키별 mSkinMatCache). 항등행렬은 매번 new하지 않고
	// CPoolGeo에서 빌려 쓰고 즉시 반납한다(SkinCalc는 결과를 skinMatList에 담을 뿐 _PMat 참조를 보유하지 않는다).
	GetSkinMat(_meshKey : string,_mesh : CMesh): CMat[]
	{
		let calcSkinMat=this.mSkinMatCache.get(_meshKey);
		if(calcSkinMat==null)
		{
			let identMat=CPoolGeo.ProductMat();
			identMat.Unit();
			calcSkinMat=this.SkinCalc(identMat, _mesh, _mesh.meshTree);
			CPoolGeo.RecycleMat(identMat);
			this.mSkinMatCache.set(_meshKey,calcSkinMat);
		}
		return calcSkinMat;
	}
	// 메시 키의 "로컬(인스턴스=항등행렬) 위치"를 구해 캐시한다. 트리 로컬 변환/스킨/스케일-센터
	// 보정까지는 반영되고 인스턴스 매트릭스만 빠진 상태 — 이후 인스턴스 매트릭스만 곱하면 최종위치.
	GetLocalPos(_meshKey : string): Float32Array
	{
		let cached=this.mLocalPosCache.get(_meshKey);
		if(cached!=null)	return cached;

		let mesh=this.GetOwner().GetFrame().Res().Find(_meshKey) as CMesh;
		let calcSkinMat=this.GetSkinMat(_meshKey,mesh);
		let tmp=new CMeshCreateInfo();
		let dummyBound=CPoolGeo.ProductBound();
		dummyBound.SetType(CBound.eType.Box);
		let identMat=CPoolGeo.ProductMat();
		identMat.Unit();
		this.Merge(identMat, mesh, mesh.meshTree, tmp, dummyBound, calcSkinMat);	// _PMat=항등 → 로컬 위치
		CPoolGeo.RecycleMat(identMat);
		CPoolGeo.RecycleBound(dummyBound);
		let posb=tmp.GetVFType(CVertexFormat.eIdentifier.Position)[0];
		let local=posb.bufF.GetArray().slice(0,posb.bufF.mSize);
		this.mLocalPosCache.set(_meshKey,local);
		return local;
	}
	// 현재 mMeshList/mMatList를 새 매트릭스로 병합해 _ci에 채운다(bound/texture 갱신).
	// 토폴로지(메시 구성) 자체가 바뀔 때만 쓰는 전체 재구성 경로.
	MergeAll(_ci : CMeshCreateInfo): void
	{
		this.mBound.Reset();
		this.mBound.SetType(CBound.eType.Box);
		this.mMeshVertexStart=[];
		for(let i=0;i<this.mMeshList.length;++i)
		{
			this.mMeshVertexStart.push(_ci.vertexCount);
			let mesh=this.GetOwner().GetFrame().Res().Find(this.mMeshList[i]) as CMesh;
			let calcSkinMat=this.GetSkinMat(this.mMeshList[i],mesh);
            this.Merge(this.mMatList[i], mesh, mesh.meshTree, _ci, this.mBound, calcSkinMat);
		}
		this.mMeshVertexStart.push(_ci.vertexCount);
	}
	// mMeshList/mMatList로 병합 버퍼(ci)를 처음부터 새로 구성한다.
	BuildCI(): void {
		this.mMeshDataNode.ci=new CMeshCreateInfo();
		this.MergeAll(this.mMeshDataNode.ci);
		// 해시는 버퍼 용량(정점 수) 기반. 커질 때만 바뀌어 새 키가 되고, 같거나 작으면 유지된다.
		this.mHash=""+this.mMeshDataNode.ci.vertexCount;
		this.mMeshListPrev=this.mMeshList.slice();
		this.SnapshotMatList();
		// mBound가 새로 계산됐으므로 컬링용 mBW(스피어)도 다음 FMatUpdate에서 강제 재계산되게 한다.
		// mBW.mRadian=0만으로는 부족 — FMatUpdate() 자체가 mUpdateLMat(또는 owner mat 변경)일 때만
		// 호출되므로(CPaint.Update), UpdateLMat()으로 다음 프레임 FMatUpdate 실행을 강제한다.
		this.mBW.mRadian=0;
		this.UpdateLMat();
	}
	// this.mMatList의 현재 값을 mMatListPrev에 스냅샷으로 저장한다. 매번 new CMat()으로 새로
	// 만들지 않고 CPoolGeo(Mat)로 재사용한다 — 기존 mMatListPrev 항목은 풀에 반납하고,
	// 풀에서 꺼낸 인스턴스에 Import()로 값만 복사한다(새 Float32Array 할당 없음).
	SnapshotMatList(): void
	{
		if(this.mMatListPrev!=null)
		{
			for(let m of this.mMatListPrev)
				CPoolGeo.RecycleMat(m);
		}
		let next=new Array<CMat>(this.mMatList.length);
		for(let i=0;i<this.mMatList.length;++i)
		{
			let m=CPoolGeo.ProductMat();
			m.Import(this.mMatList[i]);
			next[i]=m;
		}
		this.mMatListPrev=next;
	}
	// 토폴로지(메시 목록/순서)가 이전과 완전히 같을 때만 쓸 수 있는 빠른 경로.
	// uv/normal/texOff/weight/weightIndex/index는 인스턴스 매트릭스와 무관해 손대지 않는다.
	// 메시별로 이전 매트릭스와 비교해 회전/스케일까지 같고 이동만 다르면(MatOnlyTranslationDiff)
	// 로컬 위치×행렬곱조차 없이 이미 구워진 정점에 이동량(dx,dy,dz)만 더하는 하드 경로를 쓴다.
	// 회전/스케일이 바뀌었거나 이전 매트릭스가 없으면(최초) 로컬 위치×인스턴스 매트릭스로 계산한다.
	RepositionOnly(): void
	{
		let ci=this.mMeshDataNode.ci;
		let ovb=ci.GetVFType(CVertexFormat.eIdentifier.Position)[0];
		this.mBound.Reset();
		this.mBound.SetType(CBound.eType.Box);
		let v=CPoolGeo.ProductV3();
		let outv=CPoolGeo.ProductV3();
		let prevList=this.mMatListPrev;
		for(let i=0;i<this.mMeshList.length;++i)
		{
			let vStart=this.mMeshVertexStart[i];
			let vCount=this.mMeshVertexStart[i+1]-vStart;
			let instMat=this.mMatList[i];
			let prevMat=(prevList!=null && i<prevList.length)?prevList[i]:null;

			if(prevMat!=null && CPaint3DMerge.MatOnlyTranslationDiff(prevMat,instMat))
			{
				// 이동만 변경 → 캐시된 로컬 위치/행렬곱 없이 기존 baked 정점에 델타만 더한다.
				let dx=instMat.mF32A[12]-prevMat.mF32A[12];
				let dy=instMat.mF32A[13]-prevMat.mF32A[13];
				let dz=instMat.mF32A[14]-prevMat.mF32A[14];
				let moved=(dx!=0 || dy!=0 || dz!=0);
				// mBound.Reset()이 매 호출 위에서 일어나므로, 이동이 없어도(moved=false)
				// 바운드 갱신을 위해 정점은 순회해야 한다 — 좌표 덧셈만 건너뛴다.
				for(let j=0;j<vCount;++j)
				{
					let off=(vStart+j)*3;
					if(moved)
					{
						ovb.bufF.mF32A[off+0]+=dx;
						ovb.bufF.mF32A[off+1]+=dy;
						ovb.bufF.mF32A[off+2]+=dz;
					}
					outv.x=ovb.bufF.mF32A[off+0];
					outv.y=ovb.bufF.mF32A[off+1];
					outv.z=ovb.bufF.mF32A[off+2];
					this.mBound.InitBound(outv);
				}
			}
			else
			{
				// 회전/스케일까지 바뀜(또는 최초) → 로컬 위치 × 인스턴스 매트릭스 풀 계산
				let local=this.GetLocalPos(this.mMeshList[i]);
				for(let j=0;j<vCount;++j)
				{
					v.x=local[j*3+0];
					v.y=local[j*3+1];
					v.z=local[j*3+2];
					CMath.V3MulMatCoordi(v,instMat,outv);
					ovb.bufF.X3(vStart+j,outv.x);
					ovb.bufF.Y3(vStart+j,outv.y);
					ovb.bufF.Z3(vStart+j,outv.z);
					this.mBound.InitBound(outv);
				}
			}
		}
		CPoolGeo.RecycleV3(v);
		CPoolGeo.RecycleV3(outv);
		// 다음 비교를 위해 이번에 실제로 구운 매트릭스를 스냅샷으로 저장.
		this.SnapshotMatList();
	}
	/**
	 * position 만 바뀌었을 때(RepositionOnly) 그 채널의 바뀐 구간만 GPU 에 올린다.
	 *
	 * GetDrawMesh(modify) 는 셰이더의 mVF 전체를 다시 올린다 - position 만 고쳤는데
	 * uv/normal/texOff/weight 까지 따라 올라간다. CPaintVoxel 이 쓰는 방식대로
	 * (CPaintVoxel.ts:121) 바뀐 채널의 바뀐 구간만 올린다.
	 *
	 * @returns 올렸으면 true. false 면 호출자가 GetDrawMesh(modify) 로 통째로 올려야 한다
	 */
	PosUpload(_dm : CMeshDrawNode,_vf : CShader): boolean
	{
		let ci=this.mMeshDataNode.ci;
		//버퍼가 아직 없거나 정점 수가 어긋나면 부분 갱신이 성립하지 않는다
		if(_dm.vGBufEx==null || _dm.vNum!=ci.vertexCount)	return false;

		//Position 이 mVF 의 몇 번째 버퍼인지(RebuildMeshDrawNode 의 _gBufOff)
		let slot=-1;
		for(let j=0;j<_vf.mVF.length;++j)
		{
			let vf=_vf.mVF[j];
			if(vf.identifier==CVertexFormat.eIdentifier.Position && vf.identifierCount==0)
			{	slot=j;	break;	}
		}
		if(slot<0)	return false;

		let pb=ci.GetVFType(CVertexFormat.eIdentifier.Position)[0];
		if(pb==null || pb.bufF==null)	return false;
		let arr=pb.bufF.mF32A as Float32Array;
		if(arr==null)					return false;

		//Position 은 정점당 3 플로트. CFloat32Mgr 는 용량을 2배씩 잡아두고 줄이지 않으므로
		//실제 쓰는 만큼으로 잘라서 넘긴다. subarray 는 뷰라 복사가 아니다
		let n=Math.min(ci.vertexCount*3,arr.length);
		if(n<=0)	return true;

		this.mOwner.GetFrame().Ren().RebuildMeshDrawNode(_dm,slot,0,arr.subarray(0,n));
		return true;
	}
	// 메시 목록을 통째로 교체한다.
	// - 토폴로지(메시 목록/순서)가 이전과 완전히 같으면(=매트릭스만 바뀜, 예: shake) → RepositionOnly로
	//   position만 재계산(uv/normal/texOff/weight/weightIndex/index/SkinCalc/텍스처 매칭 전부 스킵).
	// - 토폴로지가 바뀌면(개수/구성 변경) → 전체 재구성.
	//   - 정점 총량이 기존 버퍼(용량)보다 커지면 → 버퍼를 새로 구성하고 해시를 바꾼다(새 키 → 새로 빌드).
	//   - 같거나 작아지면 → 기존 버퍼 용량을 유지한 채 앞쪽만 새로 굽고, 남는 뒤쪽 정점은 0으로 세팅해 숨긴다.
	//     해시는 유지되어 같은 키로 GetDrawMesh가 modify 1회 갱신된다.
	ResetMesh(_meshList : Array<string>,_matList : Array<CMat>): void {
		let oldCI=this.mMeshDataNode.ci;
		// 개수뿐 아니라 순서/키까지 원소 단위로 완전히 같아야 빠른 경로를 쓴다.
		// 예: [꽃,꽃,나무,나무] → [나무,꽃,나무,나무]처럼 개수는 같아도 0번 종류가 바뀌면 false → 전체 재구성.
		let sameTopology=(oldCI!=null && CPaint3DMerge.SameMeshList(this.mMeshListPrev,_meshList));

		this.mMeshList=_meshList;
		this.mMatList=_matList;
		this.mMeshListPrev=this.mMeshList.slice();

		//position 만 고쳤는지 표시한다. Render 가 이걸 보고 부분 갱신으로 간다
		this.mPosOnly=sameTopology;
		if(sameTopology)
		{
			this.RepositionOnly();
		}
		else
		{
			let capVC=(oldCI!=null)?oldCI.vertexCount:0;	// 기존 버퍼 용량(정점 수, high-water)

			// 새 매트릭스로 병합을 다시 굽는다(임시 버퍼).
			let newCI=new CMeshCreateInfo();
			this.MergeAll(newCI);
			let newVC=newCI.vertexCount;

			if(oldCI==null || newVC>capVC)
			{
				// 커짐 → 새로 구성, 해시 변경 → 새 키 → 새로 빌드
				this.mMeshDataNode.ci=newCI;
				this.mHash=""+newVC;
			}
			else
			{
				// 같거나 작아짐 → 기존 용량 유지, 앞쪽만 새 데이터로 덮고 뒤쪽은 0으로
				for(let ob of oldCI.vertex)
				{
					if(ob.vfType==CVertexFormat.eIdentifier.Index)	continue;	// 인덱스는 그대로 두어 뒤쪽 삼각형이 0정점을 참조(붕괴)하게 한다.
					let capF=ob.bufF.mSize;										// 기존 용량(float 수) 유지
					let nb=newCI.GetVFType(ob.vfType);
					if(nb.length>0)
					{
						let nSize=nb[0].bufF.mSize;
						ob.bufF.mF32A.set(nb[0].bufF.mF32A.subarray(0,nSize),0);	// 앞쪽 복사
						ob.bufF.mF32A.fill(0,nSize,capF);							// 뒤쪽 0
					}
					else
					{
						ob.bufF.mF32A.fill(0,0,capF);	// 새 구성에 없는 포맷 → 전부 0
					}
				}
				// vertexCount(용량)/indexCount 및 mHash 유지 → 같은 키 → modify
			}
			// 다음 RepositionOnly 호출을 위한 기준선(이번에 실제로 구운 매트릭스) 스냅샷.
			this.SnapshotMatList();
		}
		this.mReset=true;
		// mBound가 새로 계산됐으므로 컬링용 mBW(스피어)도 다음 FMatUpdate에서 강제 재계산되게 한다.
		// mBW.mRadian=0만으로는 부족 — FMatUpdate() 자체가 mUpdateLMat(또는 owner mat 변경)일 때만
		// 호출되므로(CPaint.Update), UpdateLMat()으로 다음 프레임 FMatUpdate 실행을 강제한다.
		this.mBW.mRadian=0;
		this.UpdateLMat();
		// 배치는 한 번 만들면 캐시되어(mBatchMap) 다음 프레임에 Render()가 재실행되지 않고
		// 캐시된 배치를 그대로 재사용한다(BatchPool). 그러면 GetDrawMesh(modify)가 다시는 안 불려
		// 정점 갱신이 GPU에 반영되지 않는다. 이걸 막기 위해 배치 캐시만 무효화한다.
		// ClearBatch()는 mRenPT/mCamCullUpdate까지 건드려 캔버스의 렌더패스 재계산을 매번 유발하므로
		// (렌더패스 자체는 안 바뀌었으니 불필요) 여기서는 mBatchMap만 직접 비운다.
		for(let key of this.mBatchMap.keys())
			this.mBatchMap.set(key,null);
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
		// if(this.mMeshDataNode==null)
		// {

		// }
		// 키에 인스턴스 고유값(Key)을 포함해 다른 인스턴스와 drawMesh를 공유하지 않게 한다.
		// (shrink 시 in-place modify로 지오메트리를 변형하므로 콘텐츠 해시 공유는 충돌을 일으킨다.)
		// mHash는 유지 → grow 시 해시가 바뀌어 새 키로 새로 빌드, shrink 시 해시 유지로 같은 키 modify.
		//position 만 바뀐 프레임은 GetDrawMesh 로 통째로 올리지 않는다(mVF 전 채널이 따라 올라간다).
		//대신 아래에서 그 채널의 바뀐 구간만 올린다
		let posOnly=this.mReset && this.mPosOnly;
		var dm=this.GetDrawMesh("Artgine/DM/3DM"+this.Key()+this.mHash,_vf,this.mMeshDataNode.ci,
			this.mReset && posOnly==false);
		//부분 갱신이 성립하지 않으면(버퍼 미생성/정점 수 불일치) 통째로 되돌린다
		if(posOnly && this.PosUpload(dm,_vf)==false)
			this.mOwner.GetFrame().Ren().BuildMeshDrawNode(dm,this.mMeshDataNode.ci,_vf);
		this.mReset=false;
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
		let LPMat:CMat;

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
			let tinb=_tNode.mData.ci.GetVFType(CVertexFormat.eIdentifier.Index);

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
			let oinb=_oCI.GetVFType(CVertexFormat.eIdentifier.Index);
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
			if(oinb.length==0)
			{
				_oCI.Create(CVertexFormat.eIdentifier.Index);
				oinb=_oCI.GetVFType(CVertexFormat.eIdentifier.Index);
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
                mat.mF32A[12]=-center.x*mat.mF32A[0];
                mat.mF32A[13]=-center.y*mat.mF32A[5];
                mat.mF32A[14]=-center.z*mat.mF32A[10];
            }
            mat.UnitCheck();
            LPMat=CMath.MatMul(LMat,mat);
            LPMat=CMath.MatMul(LPMat,_PMat);

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
			//let tiv=_tNode.mData.ci.GetVFType(CVertexFormat.eIdentifier.Index)[0];
			for(let i=0;i<tinb[0].bufI.length;++i)
			{
                _bound.InitBound(ovb[0].bufF.V3(tinb[0].bufI[i]+_oCI.vertexCount));
				oinb[0].bufI.push(tinb[0].bufI[i]+_oCI.vertexCount);
			}

            // 버텍스 카운트, 인덱스 카운트에 추가된 수량만큼 추가
			_oCI.vertexCount+=_tNode.mData.ci.vertexCount;
			_oCI.indexCount+=_tNode.mData.ci.indexCount;

		}
        else {
            LPMat=CMath.MatMul(LMat,_PMat);
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
