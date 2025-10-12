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
import {CDomFactory} from "../../basic/CDOMFactory.js";
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
	public mDigit=1;//커팅할 범위
	protected mShadowOff : boolean = false;


	protected mDirPos : CVec4;//XYZ,TYPE(디렉션 음수-1-2 거리 양수:포인트)
	protected mColor : CVec4;//RGB,User(사용 유무)
	public mUpdate : number = CUpdate.eType.Updated;
	

	// mPCF=new CVec1(1.0);
	// mBias =new CVec1(10);
	// mNormalBias =new CVec1(5);
	// mShadowRate=new CVec1(0.7);
	// mDotCac=new CVec1(0);


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
					CUtil.ID("ligPo_div"+wtKey).hidden=true;
					CUtil.ID("ligCor_div"+wtKey).hidden=false;
				}
				else if(selObj.value=="1")
				{
					//CWebUtil.ID("ligDir_div"+wtKey).hidden=true;
					CUtil.ID("ligPo_div"+wtKey).hidden=false;
					CUtil.ID("ligCor_div"+wtKey).hidden=false;
				}
				else
				{
					//CWebUtil.ID("ligDir_div"+wtKey).hidden=true;
					CUtil.ID("ligPo_div"+wtKey).hidden=true;
					CUtil.ID("ligCor_div"+wtKey).hidden=true;
					
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
					
					let po=CUtil.ID("ligPo_div"+wtKey).hidden;
					let cor=CUtil.ID("ligCor_div"+wtKey).hidden;
					if(po==false)
					{
						let outer=Number(CUtil.IDValue("ligPoOuter_num"+wtKey));
						let inner=Number(CUtil.IDValue("ligPoInner_num"+wtKey));
						this.SetPoint(outer,inner);
					}
					else if(cor==false)
					{
						this.SetDirect();
					}
					let corX=Number(CUtil.IDValue("ligCorX_num"+wtKey));
					let corY=Number(CUtil.IDValue("ligCorY_num"+wtKey));
					let corZ=Number(CUtil.IDValue("ligCorZ_num"+wtKey));
					this.SetColor(new CVec3(corX,corY,corZ));
					this.EditRefresh();
				}
			});
			_body.append(CDomFactory.DataToDom(div));


		}
	}

	GetTex()    {   return this.GetOwner().GetFrame().Pal().GetShadowWriteTex();   }
	Update(_delay) : boolean|any
	{
		if(this.mUpdate == CUpdate.eType.Already) {
			this.mUpdate = CUpdate.eType.Not;
		}
		else if(this.mUpdate == CUpdate.eType.Updated) {			
			this.mUpdate = CUpdate.eType.Already;
		}

		//라이트 메세지
		var cm=this.ProductMsg("SetLight");
		cm.mChild = true;
		cm.mInter="";
		cm.mMsgData[0]=this;

		if(this.GetOwner().mUpdateMat !=0 || this.mUpdate==CUpdate.eType.Updated)
		{
			var pos=this.GetOwner().GetWMat().xyz;
			

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

			// this.m_update = CState.eUpdate.Updated;
		}
		
		
		super.Update(_delay);
		if(this.mBruch!=null)	this.UpdateBaush();

	}
	UpdateBaush()
	{
		//if(this.mBruch==null)	return;
	
		if(this.IsDestroy())
		{
			CAlert.Info("test");
			return;
		}
		//if(this.mBruch.mDoubleChk.has(this))	return;
		//this.mBruch.mDoubleChk.add(this);

		if(this.mWrite.length == 0) {
			let fw = this.mBruch.mFrame;

			let srp=new CRPAuto(fw.Pal().Sl3D().mKey);
			srp.mCopy=false;
			srp.mTag="shadowWrite";
			srp.PushOr(new CCondition("class","==","CPaint3D"));
			srp.PushOr(new CCondition("class","==","CPaintMeshMerge"));
			srp.PushAnd(new CCondition("mTag[shadow]"));
			srp.mPriority=CRenderPass.ePriority.BackGround-2;
			this.PushRPAuto(srp);
	
			srp=new CRPAuto(fw.Pal().SlVoxel().mKey);
			srp.mCopy=false;
			srp.mClearColor = false;
			srp.mClearDepth = false;
			srp.mTag="shadowWrite";
			srp.PushAnd(new CCondition("class","==","CPaintVoxel"));
			srp.PushAnd(new CCondition("mTag[shadow]"));
			srp.mPriority=CRenderPass.ePriority.BackGround-1;
			this.PushRPAuto(srp);


		}

		if (this.mShadowKey!=null)
		{
			if(this.mColor.IsZero())
				this.mShadowOff=false;
			else
				this.mShadowOff=true;


			if(Math.abs(this.mDirPos.w)>0.5)
			{
				if(!this.mShadowOff) {
					let scam0=this.mBruch.GetCamera(this.mShadowKey+0);
					let scam1=this.mBruch.GetCamera(this.mShadowKey+1);
					let scam2=this.mBruch.GetCamera(this.mShadowKey+2);
					
					
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
					const di=100;
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
						this.mUpdate = CUpdate.eType.Updated;
					}
					this.mBruch.mShadowView[0].set(scam0.GetViewMat().F32A(),this.mBruch.mShadowCount*16);
					this.mBruch.mShadowView[1].set(scam0.GetProjMat().F32A(),this.mBruch.mShadowCount*16);
					
					scam0.Update(1);
					
					let digit=this.mDigit*0.5;
					if(digit>100)digit=100;
					if(digit<1)digit=1;
					n=width*4;
					slook=CMath.V3AddV3(eye,CMath.V3MulFloat(viewDir,n));
					slook.x = Math.round(slook.x/digit)*digit;
					slook.y = Math.round(slook.y/digit)*digit;
					slook.z = Math.round(slook.z/digit)*digit;
					seye=CMath.V3AddV3(slook,CMath.V3MulFloat(dir,n*4));
					
					// CConsol.Log("cam1");
					// CConsol.Log(seye);
					// CConsol.Log(slook);
					
					if(scam1.Init(seye,slook,sup))	
					{
						scam1.mWidth=width*8;
						scam1.mHeight=height*8;
						scam1.ResetOrthographic();
					}
					this.mBruch.mShadowView[2].set(scam1.GetViewMat().F32A(),this.mBruch.mShadowCount*16);
					this.mBruch.mShadowView[3].set(scam1.GetProjMat().F32A(),this.mBruch.mShadowCount*16);
					
					scam1.Update(1);
					
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
					}
					this.mBruch.mShadowView[4].set(scam2.GetViewMat().F32A(),this.mBruch.mShadowCount*16);
					this.mBruch.mShadowView[5].set(scam2.GetProjMat().F32A(),this.mBruch.mShadowCount*16);
					
					scam2.Update(1);
						
				} 
				

				for(var i=0;i<this.mCascadeCycle.length;++i)
				{
					if(this.mCascadeCycle[i]==-1)	continue;

					for(let rp of this.mWrite)
					{
						if(rp.mTag!="shadowWrite")	continue;

						var srpKey=this.mShadowKey+rp.mShader+i;
						var srp : CRPAuto=this.mBruch.GetAutoRP(srpKey);
						if(srp==null)
						{
							srp=rp.Export();
							srp.mTag="shadowWrite";
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
						srp.mCamera=this.mShadowKey+i;
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

					
					let maxVal : CVec4=this.mBruch.mShadowRead.get(this.mBruch.mShadowCount);
					if(maxVal==null)
					{
						maxVal=new CVec4(this.mBruch.mLightCount,-1,-1,-1);
					}
					else
					{
						maxVal.x = this.mBruch.mLightCount;
					}
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
					this.mBruch.mShadowRead.set(this.mBruch.mShadowCount,maxVal);
				}
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



		if(this.mBruch.mLightCount>CDevice.GetProperty(CDevice.eProperty.Sam2DWriteX)/4)
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
		this.mShadowKey=_shadowKey;
		this.mCascadeCycle[0]=_CycleTime0;
		this.mCascadeCycle[1]=_CycleTime1;
		this.mCascadeCycle[2]=_CycleTime2;
		this.mUpdate = CUpdate.eType.Updated;
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
	// Destroy(): void {
	// 	super.Destroy();
		
	// 	var cm=this.ProductMsg("SendGetBrush");
    //     cm.mInter="canvas";
    //     cm.mMsgData[0]=this;
	// }
// 	RecvGetBrush(_brush : CBrush)
// {
//     if (this.IsDestroy()) {
//         CAlert.Info("test");
//         return;
//     }
//     if (_brush.mDoubleChk.has(this)) return;
//     _brush.mDoubleChk.add(this);

//     // --- 자동 RPs 세팅 (원본 유지) ---
//     if (this.mWrite.length === 0) {
//         const fw = _brush.mFrame;

//         let srp = new CRPAuto(fw.Pal().Sl3D().mKey);
//         srp.mCopy = false;
//         srp.mTag = "shadowWrite";
//         srp.PushOr(new CCondition("class","==","CPaint3D"));
//         srp.PushOr(new CCondition("class","==","CPaintMeshMerge"));
//         srp.PushAnd(new CCondition("mTag[shadow]"));
//         srp.mPriority = CRenderPass.ePriority.BackGround - 2;
//         this.PushRPAuto(srp);

//         srp = new CRPAuto(fw.Pal().SlVoxel().mKey);
//         srp.mCopy = false;
//         srp.mClearColor = false;
//         srp.mClearDepth = false;
//         srp.mTag = "shadowWrite";
//         srp.PushAnd(new CCondition("class","==","CPaintVoxel"));
//         srp.PushAnd(new CCondition("mTag[shadow]"));
//         srp.mPriority = CRenderPass.ePriority.BackGround - 1;
//         this.PushRPAuto(srp);

//         // shadowRead 자동패스는 원본 정책 유지
//     }

//     if (this.mShadowKey != null) {
//         if (Math.abs(this.mDirPos.w) > 0.5) {
//             if (!this.mShadowOff) {
//                 // ====== 섀도우 캐스케이드 카메라들 ======
//                 const scam0 = _brush.GetCamera(this.mShadowKey + 0);
//                 const scam1 = _brush.GetCamera(this.mShadowKey + 1);
//                 const scam2 = _brush.GetCamera(this.mShadowKey + 2);

//                 // ====== 메인 카메라 상태(정합성 중요) ======
//                 const cam      = _brush.GetCam3D();
//                 const eye      = cam.GetEye().Export();           // CVec3
//                 const viewDir  = cam.GetView(); viewDir.Snap(3);  // 정규화 보장됨(엔진 내부에서)
//                 // handedness(RCS) 등은 CCam 내부에서 처리됨 :contentReference[oaicite:1]{index=1}

//                 // ====== 라이트 좌표계 폴백 업벡터 안정화 ======
//                 const lightDir = this.mDirPos.xyz; lightDir.Snap(3);
//                 const worldUp  = new CVec3(0,1,0);
//                 const altUp    = new CVec3(0,0,1);
//                 const sup = (Math.abs(CMath.V3Dot(lightDir, worldUp)) > 0.95) ? altUp : worldUp;

//                 // ====== 해상도/오소 폭높이 기본 스케일 ======
//                 // 기존 배율 유지하되, 이후 스냅은 '라이트-뷰 텍셀'에 맞춤
//                 const baseW = 2000 * this.mShadowDistance;
//                 const baseH = 2000 * this.mShadowDistance;

//                 const fw = _brush.mFrame;
//                 const shSizeX = fw.PF().mWidth;
//                 const shSizeY = fw.PF().mHeight;

//                 // ====== 라이트-뷰 XY 텍셀 스냅 유틸 ======
//                 const snapCenterByTexel = (
//                     seye: CVec3, slook: CVec3, up: CVec3,
//                     orthoW: number, orthoH: number,
//                     sx: number, sy: number
//                 ) => {
//                     // 임시 라이트뷰 (정합)
// 					const tmpCam = new CCamera(null);
// 					tmpCam.SetFar(100000);
// 					tmpCam.SetNear(0.01);
// 					tmpCam.Init(seye, slook, up);
// 					tmpCam.SetSize(orthoW * 2, orthoH * 2);
// 					tmpCam.ResetOrthographic();
// 					const lightView = tmpCam.GetViewMat();

//                     // 중심(=slook)을 라이트-뷰로 보냄
//                     const cWS = new CVec4(slook.x, slook.y, slook.z, 1.0);
//                     const cLS = CMath.V3MulMatCoordi(cWS,lightView); // (x,y,z,1)

//                     // 라이트-뷰 단위당 텍셀 크기
//                     const wuptX = (2 * orthoW) / Math.max(1, sx);
//   					const wuptY = (2 * orthoH) / Math.max(1, sy);

//                     // XY 스냅
//                     const snapX = Math.round(cLS.x / wuptX) * wuptX;
//   					const snapY = Math.round(cLS.y / wuptY) * wuptY;

//                     // 라이트-뷰 델타를 월드로 역변환 (w=0: 방향)
//                     const invV  = CMath.MatInvert(lightView);
//                     const offWS = CMath.V3MulMatCoordi(new CVec4(snapX - cLS.x, snapY - cLS.y, 0.0, 0.0),invV);
//                     const offV3 = new CVec3(offWS.x, offWS.y, offWS.z);

//                     return {
//                         seye : CMath.V3AddV3(seye,  offV3),
//                         slook: CMath.V3AddV3(slook, offV3),
//                     };
//                 };

//                 // ====== 캐스케이드 1개 세팅 루틴 ======
//                 // ② 캐스케이드 세팅 (근캐스케이드 패딩 & z패딩 유지)
// const setupCascade = (
//   scam: CCamera,
//   nMul: number,
//   eyeToLightMul: number,
//   orthoMul: number
// ) => {
//   const n     = baseW * nMul;
//   let slook   = CMath.V3AddV3(eye, CMath.V3MulFloat(viewDir, n));
//   let seye    = CMath.V3AddV3(slook, CMath.V3MulFloat(lightDir, n * eyeToLightMul));

//   // 기본 오소 크기
//   let oW = baseW * orthoMul;
//   let oH = baseH * orthoMul;

//   // ★ 근캐스케이드만 여유 패딩 (사라짐 방지)
//   if (nMul === 1) {
//     const pad = 1.15;   // 10~20% 권장
//     oW *= pad;
//     oH *= pad;
//   }

//   // 스냅
//   const snapped = snapCenterByTexel(seye, slook, sup, oW, oH, shSizeX, shSizeY);
//   seye  = snapped.seye;
//   slook = snapped.slook;

//   // 카메라 적용
//   if (scam.Init(seye, slook, sup)) {
//     scam.SetFar(100000);
//     scam.SetNear(0.01);
//     scam.SetSize(oW * 2, oH * 2);
//     scam.ResetOrthographic();
//     this.mUpdate = CUpdate.eType.Updated;
//   } else {
//     scam.SetSize(oW * 2, oH * 2);
//     scam.ResetOrthographic();
//   }
//   scam.Update(1);
// };


//                 // ====== 캐스케이드별 세팅 (기존 배율 유지) ======
//                 setupCascade(scam0, /*nMul*/1,  /*eyeToLightMul*/2,  /*orthoMul*/1);
//                 setupCascade(scam1, /*nMul*/4,  /*eyeToLightMul*/4,  /*orthoMul*/4);
//                 setupCascade(scam2, /*nMul*/10, /*eyeToLightMul*/8,  /*orthoMul*/8);

//                 // ====== 행렬 업로드 (원본 스타일 유지) ======
//                 _brush.mShadowView[0].set(scam0.GetViewMat().F32A(), _brush.mShadowCount * 16);
//                 _brush.mShadowView[1].set(scam0.GetProjMat().F32A(), _brush.mShadowCount * 16);
//                 _brush.mShadowView[2].set(scam1.GetViewMat().F32A(), _brush.mShadowCount * 16);
//                 _brush.mShadowView[3].set(scam1.GetProjMat().F32A(), _brush.mShadowCount * 16);
//                 _brush.mShadowView[4].set(scam2.GetViewMat().F32A(), _brush.mShadowCount * 16);
//                 _brush.mShadowView[5].set(scam2.GetProjMat().F32A(), _brush.mShadowCount * 16);
//             }

//             for(var i=0;i<this.mCascadeCycle.length;++i)
// 			{
// 				if(this.mCascadeCycle[i]==-1)	continue;

// 				for(let rp of this.mWrite)
// 				{
// 					if(rp.mTag!="shadowWrite")	continue;

// 					var srpKey=this.mShadowKey+rp.mShader+i;
// 					var srp : CRPAuto=_brush.GetAutoRP(srpKey);
// 					if(srp==null)
// 					{
// 						srp=rp.Export();
// 						srp.mTag="shadowWrite";
// 						_brush.SetAutoRP(srpKey,srp);
// 						var fw=this.GetOwner().GetFrame();
// 						var tex=fw.Res().Find(this.GetTex()) as CTexture;
// 						if(tex.GetInfo()[0].mCount<(_brush.mShadowCount+1)*6)
// 						{
// 							fw.Ren().BuildRenderTarget([new CTextureInfo(CTexture.eTarget.Array,CTexture.eFormat.RGBA32F,
// 								(_brush.mShadowCount+1)*6)],new CVec2(fw.PF().mWidth, fw.PF().mHeight),fw.Pal().GetShadowWriteTex());	
// 						}
// 						srp.mShaderAttr.push(new CShaderAttr("shadowWrite",new CVec3(i,_brush.mShadowCount,_brush.mShadowCount*6+i)));
// 					}
// 					srp.mRenderTarget=this.GetTex();
// 					srp.mRenderTargetUse=new Set<number>([_brush.mShadowCount*6+i]);
// 					srp.mCamera=this.mShadowKey+i;
// 					//"shadowWrite"->[0]
// 					if(srp.mShaderAttr[0].mData.y != _brush.mShadowCount) {
// 						srp.mShaderAttr[0].mData.x=i;
// 						srp.mShaderAttr[0].mData.y=_brush.mShadowCount;
// 						srp.mShaderAttr[0].mData.z=_brush.mShadowCount*6+i;
// 						_brush.mAutoRPUpdate = CUpdate.eType.Updated;
// 					}

// 					//그림자 꺼지면 랜더링 안하고 싶음
// 					//근데 cycle을 길게 잡으면 renPT는 살아있어서 매 프레임 CPaint.UpdateRenPt가 호출됨
// 					//CPaint.UpdateRenPt에서 V3Distance, PlaneSphereInside가 매 프레임 불려서 성능 잡아먹음
// 					//나중에 해결해야 함
// 					if(this.mShadowOff) {
// 						srp.mCycle = 100000000;
// 					}
// 					else {
// 						srp.mCycle=this.mCascadeCycle[i];
// 					}
// 				}

				
// 				let maxVal : CVec4=_brush.mShadowRead.get(_brush.mShadowCount);
// 				if(maxVal==null)
// 				{
// 					maxVal=new CVec4(_brush.mLightCount,-1,-1,-1);
// 				}
// 				else
// 				{
// 					maxVal.x = _brush.mLightCount;
// 				}
// 				//디렉션이다
// 				if(i<3)
// 				{						
// 					//각 케스케이드 영역이 어떤 어레이 사용중인지
// 					if(i<0.5)
// 					{
// 						maxVal.y=_brush.mShadowCount*6+i;
// 						maxVal.z=-1;
// 						maxVal.w=-1;
// 					}
// 					else if(i<1.5)
// 						maxVal.z=_brush.mShadowCount*6+i;
// 					else
// 						maxVal.w=_brush.mShadowCount*6+i;
					
// 				}
// 				_brush.mShadowRead.set(_brush.mShadowCount,maxVal);
// 			}
// 		}
// 		else
// 		{
// 			_brush.mShadowView[0].fill(0,0,16);
// 			_brush.mShadowView[1].fill(0,0,16);
// 			_brush.mShadowView[2].fill(0,0,16);
// 			_brush.mShadowView[3].fill(0,0,16);
// 			_brush.mShadowView[4].fill(0,0,16);
// 			_brush.mShadowView[5].fill(0,0,16);
// 			_brush.mShadowView[6].fill(0,0,16);
// 		}
// 		if(!this.mShadowOff)
// 			_brush.mShadowCount++;
//     } // mShadowKey

//     // 라이트 개수 가드 (원본 유지)
//     if (_brush.mLightCount > CDevice.GetProperty(CDevice.eProperty.Sam2DWriteX) / 4)
//         return;

//     // 라이트 파라미터 업로드 (원본 유지)
//     _brush.mLightDir[_brush.mLightCount * 4 + 0] = this.mDirPos.x;
//     _brush.mLightDir[_brush.mLightCount * 4 + 1] = this.mDirPos.y;
//     _brush.mLightDir[_brush.mLightCount * 4 + 2] = this.mDirPos.z;
//     _brush.mLightDir[_brush.mLightCount * 4 + 3] = this.mDirPos.w;

//     _brush.mLightColor[_brush.mLightCount * 4 + 0] = this.mColor.x;
//     _brush.mLightColor[_brush.mLightCount * 4 + 1] = this.mColor.y;
//     _brush.mLightColor[_brush.mLightCount * 4 + 2] = this.mColor.z;
//     _brush.mLightColor[_brush.mLightCount * 4 + 3] = this.mColor.w;

//     _brush.mLightCount++;
// }

}