import { CUpdate } from "../../../basic/Basic.js";
import { CAlert } from "../../../basic/CAlert.js";
import {CArray} from "../../../basic/CArray.js";
import { CHash } from "../../../basic/CHash.js";
import { CObject, CPointer } from "../../../basic/CObject.js";
import {CString} from "../../../basic/CString.js";
import {CTree} from "../../../basic/CTree.js";
import { CBound } from "../../../geometry/CBound.js";
import {CMat} from "../../../geometry/CMat.js";
import {CMath} from "../../../geometry/CMath.js";
import { CPoolGeo } from "../../../geometry/CPoolGeo.js";
import {CVec1} from "../../../geometry/CVec1.js";
import {CVec2} from "../../../geometry/CVec2.js";
import { CVec3 } from "../../../geometry/CVec3.js";
import { CVec4 } from "../../../geometry/CVec4.js";
import { CFloat32Mgr } from "../../../geometry/CFloat32Mgr.js";
import { CBatch } from "../../../render/CBatchMgr.js";
import {CDevice} from "../../../render/CDevice.js";
import {CMesh} from "../../../render/CMesh.js";
import { CMeshCopyNode } from "../../../render/CMeshCopyNode.js";
import { CMeshCreateInfo } from "../../../render/CMeshCreateInfo.js";
import { CMeshDataNode } from "../../../render/CMeshDataNode.js";
import { CMeshDrawNode } from "../../../render/CMeshDrawNode.js";
import {CMeshPaint} from "../../../render/CMeshPaint.js";
import {CMeshTreeUpdate} from "../../../render/CMeshTreeUpdate.js";
import {CShader, CVertexFormat} from "../../../render/CShader.js";
import {CShaderAttr} from "../../../render/CShaderAttr.js";
import { CTexture } from "../../../render/CTexture.js";
import { CUtilRender } from "../../../render/CUtilRender.js";
import { SDF } from "../../../z_file/SDF.js";
import {CSubject} from "../../subject/CSubject.js";
import {CBrushComp} from "../CBrushComp.js";
import {CPaint} from "./CPaint.js";
import { CPaintMerge } from "./CPaintMerge.js";

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
	//_near 이내 전체 깊이, _far 밖은 시차 반복을 건너뛴다(엔진 단위). 생략 시 셰이더 기본값(1500, 3000)
	//_depth: 시차만큼 깊이를 뒤로 미는 배율(1 기본, 0이면 안 밈). 생략 시 셰이더 기본값 1
	ParallaxNormal(_value : number, _near : number = null, _far : number = null, _depth : number = null) {
		this.PushTag("parallax");
		this.PushCShaderAttr(new CShaderAttr("parallaxNormal", new CVec1(_value)));
		if(_near != null && _far != null) this.PushCShaderAttr(new CShaderAttr("parallaxDist", new CVec2(_near, _far)));
		if(_depth != null) this.PushCShaderAttr(new CShaderAttr("parallaxDepth", new CVec1(_depth)));
	}
	override EditDrop(_object: CObject): void 
	{
		if(_object instanceof CMesh)
		{
			this.SetMesh(_object.Key());
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
		this.mMesh=this.GetOwner().GetFrame().Pal().GetBoxMesh();
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
export class CPaint3DMerge extends CPaintMerge
{
	constructor(_meshList : Array<string>=[],_matList : Array<CMat>=[],_centerPos=false,_targetScale=0)
	{
		super();
		this.mMeshList=_meshList;
		this.mMatList=_matList;
		this.mCenterPos=_centerPos;
		this.mTargetScale=_targetScale;
	}
	mMeshList : Array<string>;
	mMatList : Array<CMat>;
    mWeightMat : Float32Array;
    mWeightMatArr : CMat[] = [];
	public mCenterPos=false;
	public mTargetScale=0;
    mWindInfluence : CVec1 = new CVec1(0.0);
	// SkinCalc(new CMat(), mesh, mesh.meshTree)는 인스턴스 매트릭스와 무관하게
	// 메시 리소스(트리 포즈)에만 의존해 항상 같은 결과를 낸다. 메시 키별로 캐시해 재계산을 없앤다.
	mSkinMatCache : Map<string, CMat[]> = new Map();
	// null이 아니면 메시 텍스처 대신 이 목록을 번호대로 쓴다(CPaint3D.SetTexture와 같은 규칙)
	mTexOverride : Array<string>=null;
	// 메시 키별로 인스턴스=항등행렬로 구운 결과. Merge()의 LPMat=LMat*_PMat 결합 방식상 인스턴스 매트릭스는
	// 항상 맨 마지막에 곱해지므로, 슬롯은 이 템플릿에 인스턴스 매트릭스만 곱해 쓰면 된다.
	mTemplate : Map<string, CMeshCreateInfo> = new Map();
	private mTemplateBuf=new Map<string,{mPos:Float32Array,mUV:Float32Array,mNor:Float32Array,mTex:Float32Array,
		mWe:Float32Array,mWi:Float32Array,mTan:Float32Array,mIdx:Array<number>,mCount:number}>();
	override IsShould(_member: string, _type: CObject.eShould): boolean {
		if(_member=="mSkinMatCache" || _member=="mTemplate" || _member=="mTemplateBuf")	return false;
		return super.IsShould(_member,_type);
	}
	// 두 메시 목록이 원소별로 완전히 같은지(개수+순서+키 전부) 비교한다.
	static SameMeshList(_a : Array<string>,_b : Array<string>): boolean
	{
		if(_a==null || _b==null || _a.length!=_b.length)	return false;
		for(let i=0;i<_a.length;++i)
			if(_a[i]!=_b[i])	return false;
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
	override Start(): void {
		this.BuildSlot();
		for(let i=0;i<this.mMeshList.length;++i)
			this.PushSlot(this.mMeshList[i],this.mMatList[i]);
	}
	// 메시가 아직 로드되지 않았으면 로드를 걸고 -1을 돌려준다
	Push(_mesh : string,_mat : CMat) : number
	{
		if(this.mSlotReady==false)
		{
			this.mMeshList.push(_mesh);
			this.mMatList.push(_mat);
			return this.mMeshList.length-1;
		}
		return this.PushSlot(_mesh,_mat);
	}
	// 메시 목록을 통째로 교체한다.
	// - 메시 구성(개수/순서/키)이 슬롯과 같으면 슬롯별 Modify로 바뀐 슬롯만 다시 쓴다.
	// - 구성이 바뀌면 Clear 후 다시 Push한다(같은 메시는 빈 슬롯을 재사용한다).
	ResetMesh(_meshList : Array<string>,_matList : Array<CMat>): void {
		this.mMeshList=_meshList;
		this.mMatList=_matList;
		if(this.mSlotReady==false)	return;

		let same=(this.mSlotSize==_meshList.length && this.Size()==_meshList.length);
		for(let i=0;same && i<_meshList.length;++i)
			if(this.mSlotKey[i]!=_meshList[i])	same=false;

		if(same)
		{
			for(let i=0;i<_meshList.length;++i)
				this.Modify(i,_matList[i]);
			return;
		}
		this.Clear();
		for(let i=0;i<_meshList.length;++i)
			this.PushSlot(_meshList[i],_matList[i]);
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
	GetTemplate(_meshKey : string): CMeshCreateInfo
	{
		let tmp=this.mTemplate.get(_meshKey);
		if(tmp!=null)	return tmp;

		let frame=this.GetOwner().GetFrame();
		let mesh=frame.Res().Find(_meshKey) as CMesh;
		if(mesh==null)
		{
			if(frame.Load().IsLoad(_meshKey)==false)
				frame.Load().Exe(_meshKey);
			return null;
		}
		tmp=new CMeshCreateInfo();
		let dummyBound=CPoolGeo.ProductBound();
		dummyBound.SetType(CBound.eType.Box);
		//mTargetScale/mCenterPos는 메시 전체(모든 노드) 경계 기준으로 한 번만 건다. 노드마다 따로 걸면 재질별로 나뉜
		//노드(나무의 줄기/잎)가 각자 원점·크기 1로 맞춰져 잎이 줄기 중심으로 내려가고 비율도 틀어진다
		let identMat=CPoolGeo.ProductMat();
		identMat.Unit();
		if(this.mTargetScale!=0 || this.mCenterPos)
		{
			const whole=new CBound();
			whole.SetType(CBound.eType.Box);
			const dummy=new CTree<CMeshCopyNode>();
			dummy.mData=new CMeshCopyNode();
			CMeshTreeUpdate.TreeCopy(mesh.meshTree, dummy, new CMat(), whole);
			const size=whole.GetSize();
			const s=this.mTargetScale!=0 ? this.mTargetScale/CMath.Max(CMath.Max(size.x,size.y),size.z) : 1;
			identMat.mF32A[0]=s; identMat.mF32A[5]=s; identMat.mF32A[10]=s;
			if(this.mCenterPos)
			{
				const center=whole.GetCenter();
				identMat.mF32A[12]=-center.x*s; identMat.mF32A[13]=-center.y*s; identMat.mF32A[14]=-center.z*s;
			}
			//mF32A를 직접 고치면 단위행렬 플래그가 남아 MatMul이 이 행렬을 무시한다
			identMat.UnitCheck();
		}
		this.Merge(identMat, mesh, mesh.meshTree, tmp, dummyBound, this.GetSkinMat(_meshKey,mesh));
		identMat.Unit();
		CPoolGeo.RecycleMat(identMat);
		CPoolGeo.RecycleBound(dummyBound);
		this.mTemplate.set(_meshKey,tmp);
		return tmp;
	}
	private PushSlot(_mesh : string,_mat : CMat) : number
	{
		const t=this.GetTemplate(_mesh);
		if(t==null || t.vertexCount==0)	return -1;
		const slot=this.NewSlot(_mesh);
		this.SetSlotMat(slot,_mat);
		this.WriteSlot(slot,true);
		this.Dirty(slot);
		return slot;
	}
	protected override CreateChannel(): void {
		const ci=this.mMeshDataNode.ci;
		const I=CVertexFormat.eIdentifier;
		ci.Create(I.Position);
		ci.Create(I.UV);
		ci.Create(I.Normal);
		ci.Create(I.TexOff);
		ci.Create(I.Weight);
		ci.Create(I.WeightIndex);
		ci.Create(I.Tangent);
	}
	protected override SlotVertex(_key: string): number	{	return this.GetTemplate(_key).vertexCount;	}
	protected override SlotIndex(_key: string): number	{	return this.GetTemplate(_key).indexCount;	}
	protected override WriteIndex(_key: string, _iStart: number, _vStart: number): void {
		const src=this.GetTemplateBuf(_key).mIdx;
		const ib=this.Buf(CVertexFormat.eIdentifier.Index).bufI;
		for(let i=0;i<src.length;++i)
			ib[_iStart+i]=src[i]+_vStart;
	}
	private GetTemplateBuf(_key : string)
	{
		let tb=this.mTemplateBuf.get(_key);
		if(tb!=null)	return tb;
		const t=this.GetTemplate(_key);
		const I=CVertexFormat.eIdentifier;
		const pos=t.GetVFType(I.Position)[0].bufF.mF32A;
		let we=t.GetVFType(I.Weight)[0].bufF.mF32A;
		if(this.mWindInfluence.x>0)	we=CPaint3DMerge.WindWeight(pos,we,t.vertexCount);
		tb={
			mPos:pos, mUV:t.GetVFType(I.UV)[0].bufF.mF32A,
			mNor:t.GetVFType(I.Normal)[0].bufF.mF32A, mTex:t.GetVFType(I.TexOff)[0].bufF.mF32A,
			mWe:we, mWi:t.GetVFType(I.WeightIndex)[0].bufF.mF32A,
			mTan:t.GetVFType(I.Tangent)[0].bufF.mF32A, mIdx:t.GetVFType(I.Index)[0].bufI,
			mCount:t.vertexCount,
		};
		this.mTemplateBuf.set(_key,tb);
		return tb;
	}
	protected override WriteSlot(_slot: number,_static: boolean): void {
		const tb=this.GetTemplateBuf(this.mSlotKey[_slot]);
		const I=CVertexFormat.eIdentifier;
		const n=tb.mCount;
		const vs=this.mSlotVS[_slot];

		const sPos=tb.mPos, sNor=tb.mNor, sTan=tb.mTan;
		const oPos=this.F32(I.Position), oNor=this.F32(I.Normal), oTan=this.F32(I.Tangent);

		const m=this.mSlotMat, mo=_slot*16;
		const m0=m[mo], m1=m[mo+1], m2=m[mo+2], m3=m[mo+3];
		const m4=m[mo+4], m5=m[mo+5], m6=m[mo+6], m7=m[mo+7];
		const m8=m[mo+8], m9=m[mo+9], m10=m[mo+10], m11=m[mo+11];
		const m12=m[mo+12], m13=m[mo+13], m14=m[mo+14], m15=m[mo+15];
		//노말은 역행렬의 전치(=여인수 행렬/행렬식)로 변환한다. 4x4 MatInvert 대신 3x3만 직접 계산한다
		const c00=m5*m10-m9*m6, c01=m9*m2-m1*m10, c02=m1*m6-m5*m2;
		const c10=m8*m6-m4*m10, c11=m0*m10-m8*m2, c12=m4*m2-m0*m6;
		const c20=m4*m9-m8*m5, c21=m8*m1-m0*m9, c22=m0*m5-m4*m1;
		const det=m0*c00+m4*c01+m8*c02;
		const inv=det!=0?1/det:0;
		const f=Math.fround;
		for(let i=0;i<n;++i)
		{
			const i3=i*3, i4=i*4;
			const o3=(vs+i)*3, o4=(vs+i)*4;

			const vx=sPos[i3], vy=sPos[i3+1], vz=sPos[i3+2];
			const w=(m3*vx)+(m7*vy)+(m11*vz)+m15;
			const px=((m0*vx)+(m4*vy)+(m8*vz)+m12)/w;
			const py=((m1*vx)+(m5*vy)+(m9*vz)+m13)/w;
			const pz=((m2*vx)+(m6*vy)+(m10*vz)+m14)/w;
			oPos[o3]=px; oPos[o3+1]=py; oPos[o3+2]=pz;
			this.BoundPush(px,py,pz);

			const nx=sNor[i3], ny=sNor[i3+1], nz=sNor[i3+2];
			let ax=f((c00*nx+c01*ny+c02*nz)*inv);
			let ay=f((c10*nx+c11*ny+c12*nz)*inv);
			let az=f((c20*nx+c21*ny+c22*nz)*inv);
			if(ax!=0 || ay!=0 || az!=0)
			{
				const len=Math.sqrt(ax*ax+ay*ay+az*az);
				ax=ax/len; ay=ay/len; az=az/len;
			}
			oNor[o3]=ax; oNor[o3+1]=ay; oNor[o3+2]=az;

			const tx=sTan[i4], ty=sTan[i4+1], tz=sTan[i4+2];
			let bx=f((m0*tx)+(m4*ty)+(m8*tz));
			let by=f((m1*tx)+(m5*ty)+(m9*tz));
			let bz=f((m2*tx)+(m6*ty)+(m10*tz));
			if(bx!=0 || by!=0 || bz!=0)
			{
				const len=Math.sqrt(bx*bx+by*by+bz*bz);
				bx=bx/len; by=by/len; bz=bz/len;
			}
			oTan[o4]=bx; oTan[o4+1]=by; oTan[o4+2]=bz; oTan[o4+3]=sTan[i4+3];
		}
		if(_static)
		{
			const o2=vs*2, o3=vs*3, o4=vs*4;
			this.F32(I.UV).set(tb.mUV.subarray(0,n*2),o2);
			this.F32(I.TexOff).set(tb.mTex.subarray(0,n*3),o3);
			this.F32(I.Weight).set(tb.mWe.subarray(0,n*4),o4);
			this.F32(I.WeightIndex).set(tb.mWi.subarray(0,n*4),o4);
		}
		this.WriteBinormal(vs,n);
	}
	protected override RenderAttr(_vf: CShader): void {
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
	}

    Wind(_influence: number)
	{
		this.PushTag("wind");
		this.mWindInfluence.x = _influence;
	}
	//셰이더 ApplyWind 는 가중치 0.5 초과 정점만 (2w-1)만큼 흔든다. 본/가중치가 없는 정적 메시(풀·나무 gltf)는
	//전부 0이라 바람 태그가 있어도 안 움직이므로, 높이로 가중치를 만들어 밑동은 고정하고 위로 갈수록 흔들리게 한다
	static WindWeight(_pos : Float32Array,_we : Float32Array,_count : number) : Float32Array
	{
		for(let i=0;i<_count*4;++i)
			if(_we[i]>0.5)	return _we;
		let minY=Infinity,maxY=-Infinity;
		for(let i=0;i<_count;++i)
		{
			const y=_pos[i*3+1];
			if(y<minY)	minY=y;
			if(y>maxY)	maxY=y;
		}
		const out=new Float32Array(_count*4);
		const h=maxY-minY;
		if(h<=0)	return out;
		for(let i=0;i<_count;++i)
		{
			const r=(_pos[i*3+1]-minY)/h;
			out[i*4]=0.5+0.5*r*Math.sqrt(r);
		}
		return out;
	}
	//노드가 쓰는 메시 텍스처 번호를 이 페인트의 텍스처 목록 번호로 바꾼다. mTexOverride가 있으면 CPaint3D에
	//SetTexture한 것처럼 그 목록을 번호 그대로 쓰고, 목록에 없는 번호는 텍스처 없음(-1)이다
	private TexOffMap(_tMesh : CMesh,_tNode : CTree<CMeshDataNode>) : number[]
	{
		const texOff=new Array<number>();
		for(const ttexOff of _tNode.mData.textureOff)
		{
			const key=this.mTexOverride!=null ? this.mTexOverride[ttexOff] : _tMesh.texture[ttexOff];
			if(this.mTexOverride!=null && key==null)
			{
				texOff.push(-1);
				continue;
			}
			let i=this.mTextureKey.indexOf(key);
			if(i<0)
			{
				i=this.mTextureKey.length;
				this.mTextureKey.push(key);
				//SetTexture를 거치지 않아 CPaint의 알파 텍스처 검사가 안 걸리므로 여기서 한다. 이미 불투명 목록에 들어갔으면 다시 만든다
				const tex=this.GetOwner().GetFrame().Res().Find(key);
				if(this.mAlphaTex==false && tex instanceof CTexture && tex.GetAlpha())
				{
					this.mAlphaTex=true;
					this.ClearBatch();
				}
			}
			texOff.push(i);
		}
		return texOff;
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
	SourceTangent(_ci : CMeshCreateInfo)
	{
		let tanb=_ci.GetVFType(CVertexFormat.eIdentifier.Tangent);
		if(tanb.length>0 && tanb[0].bufF.IsEmpty()==false)	return tanb[0].bufF;

		let posb=_ci.GetVFType(CVertexFormat.eIdentifier.Position)[0];
		let norb=_ci.GetVFType(CVertexFormat.eIdentifier.Normal)[0];
		let uvb=_ci.GetVFType(CVertexFormat.eIdentifier.UV)[0];
		let inb=_ci.GetVFType(CVertexFormat.eIdentifier.Index)[0];
		if(posb==null || norb==null || uvb==null || inb==null)	return null;

		let out=tanb.length>0 ? tanb[0] : _ci.Create(CVertexFormat.eIdentifier.Tangent);
		out.bufF.Resize(posb.bufF.Size(3)*4);
		CUtilRender.TangentCalculate(posb.bufF, norb.bufF, uvb.bufF, inb.bufI, out.bufF);
		return out.bufF;
	}
	//빠른 경로를 쓸 수 있는 표준 버퍼 구성인지. 아니면 MergeSlow(원래 구현)로 처리한다
	private CanFastMerge(_src : CMeshCreateInfo,_oCI : CMeshCreateInfo) : boolean
	{
		const I=CVertexFormat.eIdentifier;
		const pos=_src.GetVFType(I.Position)[0], uv=_src.GetVFType(I.UV)[0], nor=_src.GetVFType(I.Normal)[0];
		const tex=_src.GetVFType(I.TexOff)[0], ind=_src.GetVFType(I.Index)[0];
		if(pos==null || uv==null || nor==null || tex==null || ind==null)	return false;
		const n=pos.bufF.mSize/3;
		if(n!=Math.floor(n) || uv.bufF.mSize<n*2 || nor.bufF.mSize<n*3 || tex.bufF.mSize<n*3)	return false;
		const we=_src.GetVFType(I.Weight)[0], wi=_src.GetVFType(I.WeightIndex)[0];
		if(we!=null && (wi==null || we.bufF.mSize<n*4 || wi.bufF.mSize<n*4))	return false;
		const vc=_oCI.vertexCount;
		const outs : Array<[number,number]>=[[I.Position,3],[I.UV,2],[I.Normal,3],[I.TexOff,3],[I.Weight,4],[I.WeightIndex,4],[I.Tangent,4]];
		for(const [id,k] of outs)
		{
			const b=_oCI.GetVFType(id)[0];
			if(b!=null && b.bufF.mSize!=vc*k)	return false;
		}
		return true;
	}
	private static GrowF32(_buf : CFloat32Mgr,_add : number) : Float32Array
	{
		const need=_buf.mSize+_add;
		if(need>_buf.mF32A.length)
		{
			const arr=new Float32Array(Math.max(need,_buf.mF32A.length*2));
			arr.set(_buf.mF32A.subarray(0,_buf.mSize));
			_buf.mF32A=arr;
		}
		return _buf.mF32A;
	}
	//MergeSlow와 같은 결과(값 단위)를 내되, 정점마다 객체를 만들지 않고 Float32Array에 직접 쓴다.
	//중간 벡터를 float32에 저장하던 원래 계산과 같아지도록 같은 지점에서 Math.fround로 반올림한다
	Merge(_PMat : CMat,_tMesh : CMesh,_tNode : CTree<CMeshDataNode>,_oCI : CMeshCreateInfo,_bound : CBound,_skinMatList : CMat[])
	{
		const src=_tNode.mData.ci;
		if(src!=null && this.CanFastMerge(src,_oCI)==false)
		{
			this.MergeSlow(_PMat,_tMesh,_tNode,_oCI,_bound,_skinMatList);
			return;
		}

		let LMat=CMath.MatScale(_tNode.mData.sca);
		if(_tNode.mData.rot.w >= 100000)
			CMath.MatMul(LMat,CMath.MatRotation(_tNode.mData.rot),LMat);
		else
			CMath.MatMul(LMat,CMath.QutToMat(_tNode.mData.rot),LMat);
		LMat.SetV3(3,_tNode.mData.pos);

		let LPMat:CMat;
		if(src!=null)
		{
			const I=CVertexFormat.eIdentifier;
			const sPos=src.GetVFType(I.Position)[0].bufF.mF32A;
			const sUV=src.GetVFType(I.UV)[0].bufF.mF32A;
			const sNor=src.GetVFType(I.Normal)[0].bufF.mF32A;
			const sTex=src.GetVFType(I.TexOff)[0].bufF.mF32A;
			const sIdx=src.GetVFType(I.Index)[0].bufI;
			const sWeB=src.GetVFType(I.Weight)[0], sWiB=src.GetVFType(I.WeightIndex)[0];
			const sWe=sWeB!=null ? sWeB.bufF.mF32A : null, sWi=sWiB!=null ? sWiB.bufF.mF32A : null;
			const sTanB=this.SourceTangent(src);
			const sTan=sTanB!=null ? sTanB.mF32A : null;
			const n=src.GetVFType(I.Position)[0].bufF.mSize/3;

			const texOff=this.TexOffMap(_tMesh,_tNode);

			const Out=(_id : number)=>{
				let b=_oCI.GetVFType(_id)[0];
				if(b==null)	b=_oCI.Create(_id);
				return b;
			};
			const ovb=Out(I.Position), oub=Out(I.UV), onb=Out(I.Normal), otb=Out(I.TexOff);
			const oweb=Out(I.Weight), owib=Out(I.WeightIndex), oinb=Out(I.Index), otanb=Out(I.Tangent);

			//크기/중심 정규화는 GetTemplate이 메시 전체 기준으로 _PMat에 넣어 준다
			LPMat=CMath.MatMul(LMat,_PMat);
			const nMat=CMath.MatTranspose(CMath.MatInvert(LPMat));
			const m=LPMat.mF32A, nm=nMat.mF32A;

			const base=_oCI.vertexCount;
			const oPos=CPaint3DMerge.GrowF32(ovb.bufF,n*3), oUV=CPaint3DMerge.GrowF32(oub.bufF,n*2);
			const oNor=CPaint3DMerge.GrowF32(onb.bufF,n*3), oTex=CPaint3DMerge.GrowF32(otb.bufF,n*3);
			const oWe=CPaint3DMerge.GrowF32(oweb.bufF,n*4), oWi=CPaint3DMerge.GrowF32(owib.bufF,n*4);
			const oTan=CPaint3DMerge.GrowF32(otanb.bufF,n*4);

			const f=Math.fround;
			const skinV=new CVec3(), skinOut=new CVec3();
			for(let i=0;i<n;++i)
			{
				const i2=i*2, i3=i*3, i4=i*4;
				const o2=(base+i)*2, o3=(base+i)*3, o4=(base+i)*4;

				let vx=sPos[i3], vy=sPos[i3+1], vz=sPos[i3+2];
				//본 없는 메시의 가중치는 바람 가중치(ApplyWind)로만 쓴다. 스킨 행렬 목록이 비어 있어 스키닝하면 깨진다
				if(sWe!=null && _skinMatList.length>0 && sWe[i4]+sWe[i4+1]+sWe[i4+2]+sWe[i4+3]>0.0)
				{
					var SkinMat = CMath.MatMulFloat(_skinMatList[sWi[i4]], sWe[i4]);
					SkinMat = CMath.MatAdd(CMath.MatMulFloat(_skinMatList[sWi[i4+1]], sWe[i4+1]), SkinMat);
					SkinMat = CMath.MatAdd(CMath.MatMulFloat(_skinMatList[sWi[i4+2]], sWe[i4+2]), SkinMat);
					SkinMat = CMath.MatAdd(CMath.MatMulFloat(_skinMatList[sWi[i4+3]], sWe[i4+3]), SkinMat);
					skinV.mF32A[0]=vx; skinV.mF32A[1]=vy; skinV.mF32A[2]=vz;
					CMath.V3MulMatCoordi(skinV,SkinMat,skinOut);
					vx=skinOut.mF32A[0]; vy=skinOut.mF32A[1]; vz=skinOut.mF32A[2];
				}
				const w=(m[3]*vx)+(m[7]*vy)+(m[11]*vz)+m[15];
				oPos[o3  ]=((m[0]*vx)+(m[4]*vy)+(m[8]*vz)+m[12])/w;
				oPos[o3+1]=((m[1]*vx)+(m[5]*vy)+(m[9]*vz)+m[13])/w;
				oPos[o3+2]=((m[2]*vx)+(m[6]*vy)+(m[10]*vz)+m[14])/w;

				oUV[o2]=sUV[i2]; oUV[o2+1]=sUV[i2+1];

				const nx=sNor[i3], ny=sNor[i3+1], nz=sNor[i3+2];
				let ax=f((nm[0]*nx)+(nm[4]*ny)+(nm[8]*nz));
				let ay=f((nm[1]*nx)+(nm[5]*ny)+(nm[9]*nz));
				let az=f((nm[2]*nx)+(nm[6]*ny)+(nm[10]*nz));
				if(ax!=0 || ay!=0 || az!=0)
				{
					const len=Math.sqrt(ax*ax+ay*ay+az*az);
					ax=ax/len; ay=ay/len; az=az/len;
				}
				oNor[o3]=ax; oNor[o3+1]=ay; oNor[o3+2]=az;

				const tx=sTan!=null ? sTan[i4] : 1, ty=sTan!=null ? sTan[i4+1] : 0, tz=sTan!=null ? sTan[i4+2] : 0, tw=sTan!=null ? sTan[i4+3] : 1;
				let bx=f((m[0]*tx)+(m[4]*ty)+(m[8]*tz));
				let by=f((m[1]*tx)+(m[5]*ty)+(m[9]*tz));
				let bz=f((m[2]*tx)+(m[6]*ty)+(m[10]*tz));
				if(bx!=0 || by!=0 || bz!=0)
				{
					const len=Math.sqrt(bx*bx+by*by+bz*bz);
					bx=bx/len; by=by/len; bz=bz/len;
				}
				oTan[o4]=bx; oTan[o4+1]=by; oTan[o4+2]=bz; oTan[o4+3]=tw;

				const t0=sTex[i3], t1=sTex[i3+1], t2=sTex[i3+2];
				oTex[o3  ]=t0!=-1 ? texOff[t0] : -1;
				oTex[o3+1]=t1!=-1 ? texOff[t1] : -1;
				oTex[o3+2]=t2!=-1 ? texOff[t2] : -1;

				if(sWe!=null)
				{
					oWe[o4]=sWe[i4]; oWe[o4+1]=sWe[i4+1]; oWe[o4+2]=sWe[i4+2]; oWe[o4+3]=sWe[i4+3];
					oWi[o4]=sWi[i4]; oWi[o4+1]=sWi[i4+1]; oWi[o4+2]=sWi[i4+2]; oWi[o4+3]=sWi[i4+3];
				}
				else
				{
					oWe[o4]=0; oWe[o4+1]=0; oWe[o4+2]=0; oWe[o4+3]=0;
					oWi[o4]=0; oWi[o4+1]=0; oWi[o4+2]=0; oWi[o4+3]=0;
				}
			}
			ovb.bufF.mSize+=n*3; oub.bufF.mSize+=n*2; onb.bufF.mSize+=n*3; otb.bufF.mSize+=n*3;
			oweb.bufF.mSize+=n*4; owib.bufF.mSize+=n*4; otanb.bufF.mSize+=n*4;

			const oIdx=oinb.bufI;
			const bMin=_bound.mMin.mF32A, bMax=_bound.mMax.mF32A;
			for(let k=0;k<sIdx.length;++k)
			{
				const idx=sIdx[k]+base;
				oIdx.push(idx);
				const p=idx*3;
				const px=oPos[p], py=oPos[p+1], pz=oPos[p+2];
				if(px<bMin[0]) bMin[0]=px;	if(px>bMax[0]) bMax[0]=px;
				if(py<bMin[1]) bMin[1]=py;	if(py>bMax[1]) bMax[1]=py;
				if(pz<bMin[2]) bMin[2]=pz;	if(pz>bMax[2]) bMax[2]=pz;
			}
			if(sIdx.length>0 && _bound.GetType()==CBound.eType.Null)	_bound.SetType(CBound.eType.Box);

			_oCI.vertexCount+=src.vertexCount;
			_oCI.indexCount+=src.indexCount;
		}
		else
		{
			LPMat=CMath.MatMul(LMat,_PMat);
		}
		if(_tNode.mColleague!=null)
			this.Merge(_PMat,_tMesh,_tNode.mColleague,_oCI,_bound,_skinMatList);
		if(_tNode.mChild!=null)
			this.Merge(LPMat,_tMesh,_tNode.mChild,_oCI,_bound,_skinMatList);
	}
	MergeSlow(_PMat : CMat,_tMesh : CMesh,_tNode : CTree<CMeshDataNode>,_oCI : CMeshCreateInfo,_bound : CBound,_skinMatList : CMat[])
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
			//병합 메시에 탄젠트가 없으면 탄젠트를 쓰는 셰이더(그림자 리드 등)가 빌드 때 병합 정점 전체로
			//TangentCalculate를 돌려 수백 ms씩 멈춘다. 원본에서 한 번만 구해 두고 회전만 적용해 복사한다
			let ttanb=this.SourceTangent(_tNode.mData.ci);

            // 텍스쳐 복사
			const texOff=this.TexOffMap(_tMesh,_tNode);
			
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
			let otanb=_oCI.GetVFType(CVertexFormat.eIdentifier.Tangent);
			if(otanb.length==0)
			{
				_oCI.Create(CVertexFormat.eIdentifier.Tangent);
				otanb=_oCI.GetVFType(CVertexFormat.eIdentifier.Tangent);
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
				otanb[0].bufF.Push(ttanb!=null ? ttanb.V4(i) : new CVec4(1,0,0,1));

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

            //크기/중심 정규화는 GetTemplate이 메시 전체 기준으로 _PMat에 넣어 준다
            LPMat=CMath.MatMul(LMat,_PMat);

            // skin mat 적용
            if(tweb.length > 0) {
                let tempv=new CVec3();
                for(let i=0;i<tvb[0].bufF.Size(3);++i)
                {
                    let we=tweb[0].bufF.V4(i);
                    let wi=twib[0].bufF.V4(i);
                    let v=ovb[0].bufF.V3(_oCI.vertexCount + i);

                    if(_skinMatList.length>0 && we.x+we.y+we.z+we.w>0.0)
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

            // 노말도 같이 굽는다(안 하면 로컬 회전이 있는 인스턴스는 병합 후 노말이 틀어져
            // 조명이 어긋난다). 비균등 스케일에서도 맞도록 역-전치 행렬을 쓴다 - 셰이더의
            // 기본 노말 변환(z_file/3D.ts의 nMat3 = TransposeMat3(InverseMat3(...)))과 같은 방식
            let nMat=CMath.MatTranspose(CMath.MatInvert(LPMat));
            let tempn=new CVec3();
            for(let i=_oCI.vertexCount;i<onb[0].bufF.Size(3);++i)
            {
                let n=onb[0].bufF.V3(i);
                CMath.V3MulMatNormal(n,nMat,tempn);
                CMath.V3Nor(tempn,tempn);
                onb[0].bufF.X3(i,tempn.x);
                onb[0].bufF.Y3(i,tempn.y);
                onb[0].bufF.Z3(i,tempn.z);
            }
            for(let i=_oCI.vertexCount;i<otanb[0].bufF.Size(4);++i)
            {
                let t=otanb[0].bufF.V4(i);
                CMath.V3MulMatNormal(t.xyz,LPMat,tempn);
                CMath.V3Nor(tempn,tempn);
                otanb[0].bufF.V4(i,tempn.x,tempn.y,tempn.z,t.w);
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
    
}
