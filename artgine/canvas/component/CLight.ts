import {CVec4} from "../../geometry/CVec4.js"
import {CVec3} from "../../geometry/CVec3.js"
import {CComponent} from "../component/CComponent.js"
import {CMath} from "../../geometry/CMath.js";
import {CBrushComp} from "./CBrushComp.js";
import {CRenderPass} from "../../render/CRenderPass.js";
import {CShaderAttr} from "../../render/CShaderAttr.js";
import {CDevice} from "../../render/CDevice.js";

import {CTexture,  CTextureInfo } from "../../render/CTexture.js";
import {CVec2} from "../../geometry/CVec2.js";
import {CBrush} from "../CBrush.js";
import {CDOM} from "../../basic/CDOM.js";
import { CUpdate } from "../../basic/Basic.js";
import { CPointer } from "../../basic/CObject.js";
import { CUtil } from "../../basic/CUtil.js";
import { CRPAuto } from "../CRPMgr.js";
import { CJSON } from "../../basic/CJSON.js";
import { CCondition } from "../../util/CStateMachine.js";
import { CVec1 } from "../../geometry/CVec1.js";
import { CUtilObj } from "../../basic/CUtilObj.js";
import { CAlert } from "../../basic/CAlert.js";
import { CCamera } from "../../render/CCamera.js";
import { CConsol } from "../../basic/CConsol.js";
import { CMat } from "../../geometry/CMat.js";
import { CColor } from "./CColor.js";



/*
https://wiki.ogre3d.org/-Point+Light+Attenuation


float attenuation = 1.0 / (light.constant + light.linear * distance + light.quadratic * (distance * distance));    

*/

//방향과 위치는 상위 오브젝트 위치기반으로 한다
export class CLight extends CBrushComp
{
	public mCascadeCycle=[0,-1,-1];
	public mShadowDistance=1;//얼마나 먼거리서
	public mDigit=500;//커팅할 범위
	protected mShadowOff : boolean = false;


	protected mDirPos : CVec4;//XYZ,TYPE(디렉션 음수-1-2 거리 양수:포인트)
	protected mColor : CVec4;//RGB,User(사용 유무)
	public mUpdate : number = CUpdate.eType.Updated;
	

	// mPCF=new CVec1(1.0);
	// mBias =new CVec1(10);
	// mNormalBias =new CVec1(5);
	// mShadowRate=new CVec1(0.7);


	constructor()
	{
		super(null);

		this.mDirPos=new CVec4();
		this.mColor=new CVec4();
		//this.m_attenuation=new CVec4();
		
		this.mDirPos.w = 1;
		
		this.mColor.x = 1;
		this.mColor.y = 1;
		this.mColor.z = 1;
		this.mColor.w = 1;
		
		this.mSysc=CComponent.eSysn.Light;
		
	}
	Icon(){		return "bi bi-lightbulb";	}

	override EditChange(_pointer : CPointer,_child : boolean)
	{
		super.EditChange(_pointer,_child);
		if(_child==false)	return;
		for(let ref of _pointer.refArr) 
		{
			if(ref == this.mDirPos || ref == this.mColor) {
				this.mUpdate = CUpdate.eType.Updated;
				break;
			}
		}
	}
	EditForm(_pointer : CPointer,_body : HTMLDivElement,_input : HTMLInputElement)
	{
		super.EditForm(_pointer,_body,_input);
		if(_pointer.member=="mShadowKey")
			CUtilObj.NullEdit(_pointer,_body,_input,"test");
		else if(_pointer.member=="mColor")
		{
			var div={"tag":"div","html":[]};
	

			div.html.push({"<>":"br"});
			
			let wtKey=this.ObjHash();
			let sel={"<>":"select","class":"form-select","html":[
				{"<>":"option","value":0,"text":"None","selected":true},
				{"<>":"option","value":-1,"text":"Direct"},
				{"<>":"option","value":1,"text":"Point"},
			],"onchange":(e)=>{
				let selObj=e.target as HTMLSelectElement;
				if(selObj.value=="-1")
				{
					//CWebUtil.ID("ligDir_div"+wtKey).hidden=false;
					CDOM.ID("ligPo_div"+wtKey).hidden=true;
					CDOM.ID("ligCor_div"+wtKey).hidden=false;
				}
				else if(selObj.value=="1")
				{
					//CWebUtil.ID("ligDir_div"+wtKey).hidden=true;
					CDOM.ID("ligPo_div"+wtKey).hidden=false;
					CDOM.ID("ligCor_div"+wtKey).hidden=false;
				}
				else
				{
					//CWebUtil.ID("ligDir_div"+wtKey).hidden=true;
					CDOM.ID("ligPo_div"+wtKey).hidden=true;
					CDOM.ID("ligCor_div"+wtKey).hidden=true;
					
				}

			}};
			div.html.push(sel);
			// div.html.push({"<>":"div","id":"ligDir_div"+wtKey,"hidden":true,"html":[
			// 	{"<>":"span","text":"Dir:"},
			// 	{"<>":"input","type":"number","id":"ligDirX_num","class":"form-control","placeholder":"x"},
			// 	{"<>":"input","type":"number","id":"ligDirY_num","class":"form-control","placeholder":"y"},
			// 	{"<>":"input","type":"number","id":"ligDirZ_num","class":"form-control","placeholder":"z"},
			// ]});
			div.html.push({"<>":"div","id":"ligPo_div"+wtKey,"hidden":true,"html":[
				{"<>":"span","text":"Point:"},
				{"<>":"input","type":"number","id":"ligPoOuter_num"+wtKey,"class":"form-control","placeholder":"outer"},
				{"<>":"input","type":"number","id":"ligPoInner_num"+wtKey,"class":"form-control","placeholder":"inner"},
			]});
			div.html.push({"<>":"div","id":"ligCor_div"+wtKey,"hidden":true,"html":[
				{"<>":"span","text":"Color:"},
				{"<>":"input","type":"number","id":"ligCorX_num"+wtKey,"class":"form-control","placeholder":"x"},
				{"<>":"input","type":"number","id":"ligCorY_num"+wtKey,"class":"form-control","placeholder":"y"},
				{"<>":"input","type":"number","id":"ligCorZ_num"+wtKey,"class":"form-control","placeholder":"z"},
			]});
			div.html.push({"<>":"button","type":"button","class":"btn btn-primary btn-lg btn-block btn-sm","text":"적용",
				"onclick":()=>{
					
					let po=CDOM.ID("ligPo_div"+wtKey).hidden;
					let cor=CDOM.ID("ligCor_div"+wtKey).hidden;
					if(po==false)
					{
						let outer=Number(CDOM.IDValue("ligPoOuter_num"+wtKey));
						let inner=Number(CDOM.IDValue("ligPoInner_num"+wtKey));
						this.SetPoint(outer,inner);
					}
					else if(cor==false)
					{
						this.SetDirect();
					}
					let corX=Number(CDOM.IDValue("ligCorX_num"+wtKey));
					let corY=Number(CDOM.IDValue("ligCorY_num"+wtKey));
					let corZ=Number(CDOM.IDValue("ligCorZ_num"+wtKey));
					this.SetColor(new CVec3(corX,corY,corZ));
					this.EditRefresh();
				}
			});
			_body.append(CDOM.DataToDom(div));


		}
	}
	DirPosV4()	{	return this.mDirPos;	}
	GetTex()    {   return this.GetOwner().GetFrame().Pal().GetShadowWriteTex();   }
	Update(_update : CUpdate) : boolean|any
	{
		if(this.mUpdate == CUpdate.eType.Already) {
			this.mUpdate = CUpdate.eType.Not;
			this.mBruch.mUpdateLight=true;
		}
		else if(this.mUpdate == CUpdate.eType.Updated) {			
			this.mUpdate = CUpdate.eType.Already;
			this.mBruch.mUpdateLight=true;
		}

		//라이트 메세지
		var cm=this.ProductMsg("SetLight");
		cm.mChild = true;
		cm.mInter="";
		cm.mMsgData[0]=this;

		if(this.GetOwner().mUpdateMat !=0 || this.mUpdate==CUpdate.eType.Updated)
		{
			this.mBruch.mUpdateLight=true;
			var pos=this.GetOwner().GetMat().xyz;
			

			if(this.mDirPos.w<=-1)
			{
				CMath.V3Nor(pos,pos);
				if(pos.IsZero())
				{
					pos.y=1;
				}
			}
				
			
			// this.m_dirPos.x=pos.x;
			// this.m_dirPos.y=pos.y;
			// this.m_dirPos.z=pos.z;
			this.SetDirectPos(pos);
			// this.mDirPos.mF32A[0]=pos.mF32A[0];
			// this.mDirPos.mF32A[1]=pos.mF32A[1];
			// this.mDirPos.mF32A[2]=pos.mF32A[2];

			// this.m_update = CState.eUpdate.Updated;
		}
		
		
		super.Update(_update);
		if(this.mBruch!=null)	this.UpdateBaush(_update);

	}
	UpdateBaush(_update : CUpdate)
	{
		//if(this.mBruch==null)	return;
	
		
		//if(this.mBruch.mDoubleChk.has(this))	return;
		//this.mBruch.mDoubleChk.add(this);

		if(this.mWrite.length == 0) {
			let fw = this.mBruch.mFrame;

			let srp=new CRPAuto(fw.Pal().Sl3D().mKey);
			srp.mCopy=false;
			srp.mTag.add("shadowWrite");
			srp.PushOr(new CCondition("class","==","CPaint3D"));
			srp.PushOr(new CCondition("class","==","CPaintMeshMerge"));
			srp.PushAnd(new CCondition("mTag[shadow]"));
			srp.PushAnd(new CCondition("mTag[shadowReadOnly]",CCondition.eOperator["!="]));
			srp.mPriority=CRenderPass.ePriority.BackGround-2;
			this.PushRPAuto(srp);
	
			srp=new CRPAuto(fw.Pal().SlVoxel().mKey);
			srp.mCopy=false;
			srp.mClearColor = false;
			srp.mClearDepth = false;
			srp.mTag.add("shadowWrite");
			srp.PushAnd(new CCondition("class","==","CPaintVoxel"));
			srp.PushAnd(new CCondition("mTag[shadow]"));
			srp.PushAnd(new CCondition("mTag[shadowReadOnly]",CCondition.eOperator["!="]));
			srp.mPriority=CRenderPass.ePriority.BackGround-1;
			this.PushRPAuto(srp);


		}
		let ShadowUpdate=false;
		if (this.mTexKey!=null)
		{
			if(this.mColor.IsZero())
				this.mShadowOff=true;
			else
				this.mShadowOff=false;


			if(Math.abs(this.mDirPos.w)>0.5)
			{
				if(!this.mShadowOff) 
				{
					let scam0=this.mBruch.GetCamera(this.mTexKey+0);
					let scam1=this.mBruch.GetCamera(this.mTexKey+1);
					let scam2=this.mBruch.GetCamera(this.mTexKey+2);
					
					
					let cam=this.mBruch.GetCam3D();
					var width=2000*this.mShadowDistance;
					var height=2000*this.mShadowDistance;
					let eye=cam.GetEye().Export();
					let viewDir=cam.GetView();
					//viewDir.Snap(3);
					//width가 작아지면 버그
					
					let dir : CVec3 = this.mDirPos.xyz;
					//dir.Snap(3);
					let slook : CVec3;
					let seye : CVec3;
					//let sup : CVec3=CMath.V3Cross(viewDir, dir);
					// sup.x = Math.round(sup.x/0.01)*0.01;
					// sup.y = Math.round(sup.y/0.01)*0.01;
					// sup.z = Math.round(sup.z/0.01)*0.01;
					let sup=new CVec3(0,1,0);
					//CMath.V3Cross(viewDir, dir);

					
					

					let n=width;
					//카메라가 바라보는 방향으로 n만큼 쉐도우가 생성될 위치를 지정한다
					//그 위치에서 라이트 방향으로 2배만큼 올리면 가시영역만큼만 그림자가 생성된다.
					slook=CMath.V3AddV3(eye,CMath.V3MulFloat(viewDir,n));
					slook.x = Math.round(slook.x/this.mDigit)*this.mDigit;
					slook.y = Math.round(slook.y/this.mDigit)*this.mDigit;
					slook.z = Math.round(slook.z/this.mDigit)*this.mDigit;
					seye=CMath.V3AddV3(slook,CMath.V3MulFloat(dir,n*2));
					// CConsol.Log("cam0");
					// CConsol.Log(seye);
					// CConsol.Log(slook);
					
					
					if(scam0.Init(seye,slook,sup))	
					{
						scam0.mWidth=width*2;
						scam0.mHeight=height*2;
						//scam0.Set2DZoom(1.5);
						scam0.ResetOrthographic();
						//this.mUpdate = CUpdate.eType.Updated;
						ShadowUpdate=true;
						this.mBruch.mUpdateShadow=true;
					}
					this.mBruch.mShadowView[0].set(scam0.GetViewMat().F32A(),this.mBruch.mShadowCount*16);
					this.mBruch.mShadowView[1].set(scam0.GetProjMat().F32A(),this.mBruch.mShadowCount*16);
					
					scam0.Update(_update);
					
					
					n=width*4;
					slook=CMath.V3AddV3(eye,CMath.V3MulFloat(viewDir,n));
					slook.x = Math.round(slook.x/this.mDigit)*this.mDigit;
					slook.y = Math.round(slook.y/this.mDigit)*this.mDigit;
					slook.z = Math.round(slook.z/this.mDigit)*this.mDigit;
					seye=CMath.V3AddV3(slook,CMath.V3MulFloat(dir,n*4));
					
					// CConsol.Log("cam1");
					// CConsol.Log(seye);
					// CConsol.Log(slook);
					
					if(scam1.Init(seye,slook,sup))	
					{
						scam1.mWidth=width*8;
						scam1.mHeight=height*8;
						scam1.ResetOrthographic();
						ShadowUpdate=true;
						this.mBruch.mUpdateShadow=true;
					}
					this.mBruch.mShadowView[2].set(scam1.GetViewMat().F32A(),this.mBruch.mShadowCount*16);
					this.mBruch.mShadowView[3].set(scam1.GetProjMat().F32A(),this.mBruch.mShadowCount*16);
					
					scam1.Update(_update);
					
					n=width*10;
					slook=CMath.V3AddV3(eye,CMath.V3MulFloat(viewDir,n));
					slook.x = Math.round(slook.x/this.mDigit)*this.mDigit;
					slook.y = Math.round(slook.y/this.mDigit)*this.mDigit;
					slook.z = Math.round(slook.z/this.mDigit)*this.mDigit;
					seye=CMath.V3AddV3(slook,CMath.V3MulFloat(dir,n*8));
					

					
					if(scam2.Init(seye,slook,sup))	
					{
						scam2.mWidth=width*16;
						scam2.mHeight=height*16;
						scam2.ResetOrthographic();
						ShadowUpdate=true;
						this.mBruch.mUpdateShadow=true;
					}
					this.mBruch.mShadowView[4].set(scam2.GetViewMat().F32A(),this.mBruch.mShadowCount*16);
					this.mBruch.mShadowView[5].set(scam2.GetProjMat().F32A(),this.mBruch.mShadowCount*16);
					
					scam2.Update(_update);
						
				} 
				
				let maxVal : CVec4=this.mBruch.mShadowRead.get(this.mBruch.mShadowCount);
				if(maxVal==null)
				{
					maxVal=new CVec4(this.mBruch.mLightCount,-1,-1,-1);
				}
				else
				{
					maxVal.x = this.mBruch.mLightCount;
				}
				for(var i=0;i<this.mCascadeCycle.length;++i)
				{
					if(this.mCascadeCycle[i]==-1)	continue;

					for(let rp of this.mWrite)
					{
						if(rp.mTag.has("shadowWrite")==false)	continue;

						var srpKey=this.mTexKey+rp.mShader+i;
						var srp : CRPAuto=this.mBruch.GetAutoRP(srpKey);
						if(srp==null)
						{
							srp=rp.Export();
							srp.mTag.add("shadowWrite");
							this.mBruch.SetAutoRP(srpKey,srp);
							var fw=this.GetOwner().GetFrame();
							var tex=fw.Res().Find(this.GetTex()) as CTexture;
							if(tex.GetInfo()[0].mCount<(this.mBruch.mShadowCount+1)*6)
							{
								fw.Ren().BuildRenderTarget([new CTextureInfo(CTexture.eTarget.Array,CTexture.eFormat.RGBA32F,
									(this.mBruch.mShadowCount+1)*6)],new CVec2(fw.PF().mWidth, fw.PF().mHeight),fw.Pal().GetShadowWriteTex());	
							}
							srp.mShaderAttr.push(new CShaderAttr("shadowWrite",new CVec3(i,this.mBruch.mShadowCount,this.mBruch.mShadowCount*6+i)));
						}
						srp.mRenderTarget=this.GetTex();
						srp.mRenderTargetUse=new Set<number>([this.mBruch.mShadowCount*6+i]);
						srp.mCamera=this.mTexKey+i;
						//"shadowWrite"->[0]
						if(srp.mShaderAttr[0].mData.y != this.mBruch.mShadowCount) {
							srp.mShaderAttr[0].mData.x=i;
							srp.mShaderAttr[0].mData.y=this.mBruch.mShadowCount;
							srp.mShaderAttr[0].mData.z=this.mBruch.mShadowCount*6+i;
							this.mBruch.mAutoRPUpdate = CUpdate.eType.Updated;
						}

						//그림자 꺼지면 랜더링 안하고 싶음
						//근데 cycle을 길게 잡으면 renPT는 살아있어서 매 프레임 CPaint.UpdateRenPt가 호출됨
						//CPaint.UpdateRenPt에서 V3Distance, PlaneSphereInside가 매 프레임 불려서 성능 잡아먹음
						//나중에 해결해야 함
						if(this.mShadowOff) {
							srp.mCycle = 100000000;
						}
						else {
							srp.mCycle=this.mCascadeCycle[i];
						}
					}

					
					//let maxVal : CVec4=this.mBruch.mShadowRead.get(this.mBruch.mShadowCount);
					
					//디렉션이다
					if(i<3)
					{						
						//각 케스케이드 영역이 어떤 어레이 사용중인지
						if(i<0.5)
						{
							maxVal.y=this.mBruch.mShadowCount*6+i;
							maxVal.z=-1;
							maxVal.w=-1;
						}
						else if(i<1.5)
							maxVal.z=this.mBruch.mShadowCount*6+i;
						else
							maxVal.w=this.mBruch.mShadowCount*6+i;
						
					}
					//this.mBruch.mShadowRead.set(this.mBruch.mShadowCount,maxVal);

					
				}
				this.mBruch.mShadowView[7][this.mBruch.mShadowCount*4+0]=maxVal.x;
				this.mBruch.mShadowView[7][this.mBruch.mShadowCount*4+1]=maxVal.y;
				this.mBruch.mShadowView[7][this.mBruch.mShadowCount*4+2]=maxVal.z;
				this.mBruch.mShadowView[7][this.mBruch.mShadowCount*4+3]=maxVal.w;
			}
			else
			{
				this.mBruch.mShadowView[0].fill(0,0,16);
				this.mBruch.mShadowView[1].fill(0,0,16);
				this.mBruch.mShadowView[2].fill(0,0,16);
				this.mBruch.mShadowView[3].fill(0,0,16);
				this.mBruch.mShadowView[4].fill(0,0,16);
				this.mBruch.mShadowView[5].fill(0,0,16);
				this.mBruch.mShadowView[6].fill(0,0,16);
			}

			

			if(!this.mShadowOff)
				this.mBruch.mShadowCount++;

			
		}//m_key



		if(this.mBruch.mLightCount>CDevice.GetProperty(CDevice.eProperty.Sam2DSize)/4)
			return;
		
		this.mBruch.mLightDir[this.mBruch.mLightCount * 4 + 0] = this.mDirPos.x;
		this.mBruch.mLightDir[this.mBruch.mLightCount * 4 + 1] = this.mDirPos.y;
		this.mBruch.mLightDir[this.mBruch.mLightCount * 4 + 2] = this.mDirPos.z;
		this.mBruch.mLightDir[this.mBruch.mLightCount * 4 + 3] = this.mDirPos.w;

		this.mBruch.mLightColor[this.mBruch.mLightCount * 4 + 0] = this.mColor.x;
		this.mBruch.mLightColor[this.mBruch.mLightCount * 4 + 1] = this.mColor.y;
		this.mBruch.mLightColor[this.mBruch.mLightCount * 4 + 2] = this.mColor.z;
		this.mBruch.mLightColor[this.mBruch.mLightCount * 4 + 3] = this.mColor.w;
		this.mBruch.mLightCount++;
	}
	SetDirectPos(_dir : CVec3)
	{
		// _dir.Snap();
		
		this.mDirPos.mF32A[0]=_dir.mF32A[0];
		this.mDirPos.mF32A[1]=_dir.mF32A[1];
		this.mDirPos.mF32A[2]=_dir.mF32A[2];
		
		//CMath.V3Nor(this.m_dirPos,this.m_dirPos);
		
		this.mUpdate = CUpdate.eType.Updated;
	}
	SetDirect(_sun=-1)
	{
		this.mDirPos.w = _sun;
		this.mUpdate = CUpdate.eType.Updated;
	}
	//최대 반경,감소 시작 반경
	SetPoint(_outer : number,_inner : number=1)
	{
		if(_inner>_outer)
			_inner=_outer;
		this.mColor.w = _inner;
		this.mDirPos.w = _outer;
		this.mUpdate = CUpdate.eType.Updated;
	}
	SetColor(_col : CVec3)
	{
		this.mColor.x = _col.x;
		this.mColor.y = _col.y;
		this.mColor.z = _col.z;
		this.mUpdate = CUpdate.eType.Updated;
	}
	SetShadow(_shadowKey,_CycleTime0=0,_CycleTime1=-1,_CycleTime2=-1)
	{
		this.mTexKey=_shadowKey;
		this.mCascadeCycle[0]=_CycleTime0;
		this.mCascadeCycle[1]=_CycleTime1;
		this.mCascadeCycle[2]=_CycleTime2;
		this.mUpdate = CUpdate.eType.Updated;
	}
	SetShadowDistance(_dist : number)
	{
		this.mShadowDistance=_dist;
	}
	SetInRadius(_rad : number) {
		return this.mColor.w = _rad;
	}
	SetOutRadius(_rad : number) {
		return this.mDirPos.w = _rad;
	}
	GetDirectPos() : CVec3 {
		return this.mDirPos.xyz;
	}
	GetColor() : CVec3 {
		return this.mColor.xyz;
	}
	IsColorZero()
	{
		return this.mColor.mF32A[0]==0 && this.mColor.mF32A[0]==0 && this.mColor.mF32A[0]==0;
	}
	GetInRadius() {
		return this.mColor.w;
	}
	GetOutRadius()  {
		return this.mDirPos.w;
	}
	IsPointLight() 
	{
		return this.mDirPos.w > 0.5;
	}
	// override RecvGetBrush(_brush : CBrush)
    // {
	// 	this.mBruch=_brush;
    // }
	ImportCJSON(_json: CJSON): this {
		return super.ImportCJSON(_json);
	}
	Destroy(): void {
		super.Destroy();
		
		if(Math.abs(this.mDirPos.w)>0.5 && this.mBruch!=null)
		{
			this.mBruch.mUpdateLight=true;
			this.mBruch.mUpdateShadow=true;
			this.mBruch.mCameraMap.delete(this.mTexKey+0);
			this.mBruch.mCameraMap.delete(this.mTexKey+1);
			this.mBruch.mCameraMap.delete(this.mTexKey+2);
			this.mBruch.ClearRen();
			
			
			for(var i=0;i<this.mCascadeCycle.length;++i)
			{
				if(this.mCascadeCycle[i]==-1)	continue;
				for(let rp of this.mWrite)
				{
					if(rp.mTag.has("shadowWrite")==false)	continue;
					var srpKey=this.mTexKey+rp.mShader+i;
					this.mBruch.RemoveAutoRP(srpKey);

				}
				
			}
		}
	}

}