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
import {CDOM} from "../../basic/CDOM.js";
import { CUpdate } from "../../basic/Basic.js";
import { CObject, CPointer } from "../../basic/CObject.js";
import { CUtil } from "../../basic/CUtil.js";
import { CJSON } from "../../basic/CJSON.js";

import { CVec1 } from "../../geometry/CVec1.js";
import { CUtilObj } from "../../basic/CUtilObj.js";
import { CClass } from "../../basic/CClass.js";
import { CRPAuto } from "../canvas/CRPMgr.js";
import { CCondition } from "../../util/CCondition.js";
import { CUtilMath } from "../../geometry/CUtilMath.js";
import { CMat } from "../../geometry/CMat.js";
import { SDF } from "../../z_file/SDF.js";
import { CPaint } from "./paint/CPaint.js";

//방향과 위치는 상위 오브젝트 위치기반으로 한다
export class CLight extends CBrushComp
{
	public mCascadeCycle=[0,-1,-1];
	public mShadowDistance=1;//얼마나 먼거리서
	public mDigit=null;//커팅할 범위
	protected mShadowOff : boolean = false;


	protected mDirPos : CVec4;//XYZ,TYPE(디렉션 음수-1-2 거리 양수:포인트)
	protected mColor : CVec4;//RGB,User(사용 유무)
	protected mCullMask : CVec4;//x마스크인덱스 w그림자인덱스(사용하면 안됨)
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
        this.mCullMask=new CVec4();
		
		this.mDirPos.w = 1;
		
		this.mColor.x = 1;
		this.mColor.y = 1;
		this.mColor.z = 1;
		this.mColor.w = 1;

        this.mCullMask.x = CPaint.eCullMask.All;
		
		this.mSysc=CComponent.eSysn.Light;
	}
	override Icon(){ return "bi bi-lightbulb"; }
    override IsShould(_member: string, _type: CObject.eShould): boolean {
        if(_member == "mWrite") {
            return false;
        }
        return super.IsShould(_member, _type);
    }
	override EditChange(_pointer : CPointer,_child : boolean)
	{
		super.EditChange(_pointer,_child);
		if(_pointer.member=="mCullMask")
		{
			this.mUpdate = CUpdate.eType.Updated;
		}
		if(_child==false) return;
		for(let ref of _pointer.refArr) 
		{
			if(ref == this.mDirPos || ref == this.mColor) {
				this.mUpdate = CUpdate.eType.Updated;
				break;
			}
		}
	}
	override EditForm(_pointer : CPointer,_body : HTMLDivElement,_input : HTMLInputElement)
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
					CDOM.ID("ligPo_div"+wtKey).hidden=true;
					CDOM.ID("ligCor_div"+wtKey).hidden=false;
				}
				else if(selObj.value=="1")
				{
					CDOM.ID("ligPo_div"+wtKey).hidden=false;
					CDOM.ID("ligCor_div"+wtKey).hidden=false;
				}
				else
				{
					CDOM.ID("ligPo_div"+wtKey).hidden=true;
					CDOM.ID("ligCor_div"+wtKey).hidden=true;
				}
			}};
			div.html.push(sel);
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

            // shadow
			div.html.push({"<>":"div","id":"ligSh_div"+wtKey,"html":[
				{"<>":"span","text":"Cascade:"},
				{"<>":"input","type":"number","id":"ligSh0_num"+wtKey,"class":"form-control","placeholder":"cas0"},
				{"<>":"input","type":"number","id":"ligSh1_num"+wtKey,"class":"form-control","placeholder":"cas1"},
                {"<>":"input","type":"number","id":"ligSh2_num"+wtKey,"class":"form-control","placeholder":"cas2"},
			]});
			div.html.push({"<>":"button","type":"button","class":"btn btn-primary btn-lg btn-block btn-sm","text":"그림자 적용",
				"onclick":()=>{
					let sh0=Number(CDOM.IDValue("ligSh0_num"+wtKey) == "" ? -1 : CDOM.IDValue("ligSh0_num"+wtKey));
					let sh1=Number(CDOM.IDValue("ligSh1_num"+wtKey) == "" ? -1 : CDOM.IDValue("ligSh1_num"+wtKey));
					let sh2=Number(CDOM.IDValue("ligSh2_num"+wtKey) == "" ? -1 : CDOM.IDValue("ligSh2_num"+wtKey));
                    this.SetShadow3D(wtKey, sh0, sh1, sh2);
					this.EditRefresh();
				}
			});

			_body.append(CDOM.DataToDom(div));


		}
		else if(_pointer.member=="mCullMask")
		{
			let ukey=this.ObjHash();
			let maskKeys=CClass.EnumName(CPaint.eCullMask).filter(_k=>_k!="All");
			let curMask=this.mCullMask.x;

			let wrap=document.createElement("div");
			wrap.className="border p-1 mt-1";

			let title=document.createElement("span");
			title.className="text-primary";
			title.innerText="CullMask";
			wrap.append(title);

			let valSpan=document.createElement("span");
			valSpan.className="text-secondary ms-2";
			valSpan.id="cm_val_"+ukey;
			valSpan.innerText="0b"+curMask.toString(2);
			wrap.append(valSpan);
			wrap.append(document.createElement("br"));

			let grid=document.createElement("div");
			grid.className="row";
			for(let key of maskKeys)
			{
				let cell=document.createElement("div");
				cell.className="col-6";
				let chk=document.createElement("input");
				chk.type="checkbox";
				chk.id="cm_"+ukey+"_"+key;
				chk.className="form-check-input";
				chk.checked=(curMask & CPaint.eCullMask[key])!==0;
				chk.onchange=()=>{
					let newMask=0;
					for(let k of maskKeys)
					{
						let c=document.getElementById("cm_"+ukey+"_"+k) as HTMLInputElement;
						if(c && c.checked)
							newMask|=CPaint.eCullMask[k];
					}
					this.SetMask(newMask);
					(document.getElementById("cm_val_"+ukey) as HTMLElement).innerText="0b"+newMask.toString(2);
					this.EditChange(_pointer,false);
				};
				let lbl=document.createElement("label");
				lbl.className="form-check-label ms-1";
				lbl.setAttribute("for","cm_"+ukey+"_"+key);
				lbl.innerText=key;
				cell.append(chk);
				cell.append(lbl);
				grid.append(cell);
			}
			wrap.append(grid);
			_body.append(wrap);
		}
	}
	DirPosV4()	{	return this.mDirPos;	}
	override GetTex()    {   return this.GetOwner().GetFrame().Pal().GetShadowWriteTex();   }
	override Update(_update : CUpdate) : boolean|any
	{
		if(this.mUpdate == CUpdate.eType.Already) {
			this.mUpdate = CUpdate.eType.Not;
			this.mBrush.mUpdateLight=CUpdate.eType.Updated;
		}
		else if(this.mUpdate == CUpdate.eType.Updated) {			
			this.mUpdate = CUpdate.eType.Already;
			this.mBrush.mUpdateLight=CUpdate.eType.Updated;
		}

		if(this.GetOwner().mUpdateMat !=0 || this.mUpdate==CUpdate.eType.Updated)
		{
			this.mBrush.mUpdateLight=CUpdate.eType.Updated;
			var pos=this.GetOwner().GetMat().xyz;
			

			if(!this.IsPointLight())
			{
				CMath.V3Nor(pos,pos);
				if(pos.IsZero())
				{
					pos.y=1;
				}
			}
			
			this.SetDirectPos(pos);
		}
		
		
		super.Update(_update);
		if(this.mBrush!=null)	this.UpdateBaush(_update);

	}

	UpdateBaush(_update : CUpdate)
	{
        this.mCullMask.w = -1;

		if(this.mWriteRP.length == 0)
        {
			let srp=new CRPAuto(this.mBrush.mFrame.Pal().Sl3D().mKey);
			srp.mCopy=false;
			srp.mTag.add("shadowWrite");
			srp.PushOr(new CCondition("class","==","CPaint3D"));
			srp.PushOr(new CCondition("class","==","CPaint3DMerge"));
			srp.PushAnd(new CCondition("mTag[shadow]"));
			srp.PushAnd(new CCondition("mTag[shadowReadOnly]",CCondition.eOperator["!="]));
			srp.mPriority=CRenderPass.ePriority.BackGround - 1;
			this.PushRPAuto(srp);
	
			srp=new CRPAuto(this.mBrush.mFrame.Pal().SlVoxel().mKey);
			srp.mCopy=false;
			srp.mTag.add("shadowWrite");
			srp.PushAnd(new CCondition("class","==","CPaintVoxel"));
			srp.PushAnd(new CCondition("mTag[shadow]"));
			srp.PushAnd(new CCondition("mTag[shadowReadOnly]",CCondition.eOperator["!="]));
			srp.mPriority=CRenderPass.ePriority.BackGround - 1;
			this.PushRPAuto(srp);

            srp=new CRPAuto(this.mBrush.mFrame.Pal().SlTerrain().mKey);
			srp.mCopy=false;
			srp.mTag.add("shadowWrite");
			srp.PushAnd(new CCondition("class","==","CPaintTerrain"));
			srp.PushAnd(new CCondition("mTag[shadow]"));
			srp.PushAnd(new CCondition("mTag[shadowReadOnly]",CCondition.eOperator["!="]));
			srp.mPriority=CRenderPass.ePriority.BackGround - 1;
			this.PushRPAuto(srp);

            // 2d plane
            srp=new CRPAuto(this.mBrush.mFrame.Pal().Sl2D().mKey);
            srp.mCopy=false;
			srp.mTag.add("shadowPlane");
			srp.PushOr(new CCondition("class","==","CPaint2D"));
            srp.PushOr(new CCondition("class","==","CPaint2DMerge"));
			srp.PushAnd(new CCondition("mTag[shadow]"));
            srp.PushAnd(new CCondition("mTag[shadowReadOnly]",CCondition.eOperator["!="]));
            srp.mTag.add("shadowPlaneV");
            srp.mTag.add("shadowPlaneF");
			srp.mPriority=CRenderPass.ePriority.AlphaAuto;
            srp.mCullFace=CRenderPass.eCull.None;
            srp.mPaintSort=CRenderPass.ePaintSort.Revers;
            srp.mAlpha=true;
			this.PushRPAuto(srp);
		}

		let ShadowUpdate=false;
		if (this.mTexKey!=null)
		{
			if(this.mColor.IsZero())
				this.mShadowOff=true;
			else
				this.mShadowOff=false;

            const shadowTex=this.mBrush.mFrame.Res().Find(this.GetTex()) as CTexture;
			const ShadowView=this.mBrush.GetShadowView();

            let maxVal : CVec4=this.mBrush.mShadowRead.get(this.mBrush.mShadowCount);
            if(maxVal == null) {
                maxVal = new CVec4(this.mBrush.mLightCount,-1,-1,-1);
                this.mBrush.mShadowRead.set(this.mBrush.mShadowCount, maxVal);
            }

            // 카메라 이동
            if(this.mShadowOff == false) 
            {
                if(!this.IsPointLight())
                {                
                    const eye = this.mBrush.GetCam3D().GetEye();
                    const view = this.mBrush.GetCam3D().GetView();
                    const ligDir : CVec3 = CMath.V3Nor(this.mDirPos.xyz);

                    let slook : CVec3;
                    let seye : CVec3;
                    let sup : CVec3 = new CVec3(0,1,0);

                    const AutoDigitSnapping = (_slook : CVec3, _halfSize : number) => {
                        let Zaxis = ligDir;
                        let upVec = Math.abs(CMath.V3Dot(sup, Zaxis)) > 0.99 ? new CVec3(0,0,1) : sup;
                        let Xaxis = CMath.V3Nor(CMath.V3Cross(upVec, Zaxis));
                        let Yaxis = CMath.V3Cross(Zaxis, Xaxis);

                        const texelSize = (_halfSize * 2) / shadowTex.GetWidth();

                        const originLS_x = _slook.x * Xaxis.x + _slook.y * Xaxis.y + _slook.z * Xaxis.z;
                        const originLS_y = _slook.x * Yaxis.x + _slook.y * Yaxis.y + _slook.z * Yaxis.z;

                        const dx = Math.floor(originLS_x / texelSize) * texelSize - originLS_x;
                        const dy = Math.floor(originLS_y / texelSize) * texelSize - originLS_y;

                        const diffX = Xaxis.x * dx + Yaxis.x * dy;
                        const diffY = Xaxis.y * dx + Yaxis.y * dy;
                        const diffZ = Xaxis.z * dx + Yaxis.z * dy;

                        _slook.x += diffX;
                        _slook.y += diffY;
                        _slook.z += diffZ;
                    }

                    let size = 2000 * this.mShadowDistance;
                    for(let i=0;i<this.mCascadeCycle.length;++i)
                    {
                        if(this.mCascadeCycle[i]==-1) continue;
                        const scam=this.mBrush.GetCamera(this.mTexKey+i);
                        scam.mShadow=true;
                        scam.SetNear(100);
                        scam.SetFar(2*size);    // 2 * size, 화면 밖의 오브젝트도 생각해서 더 크게 잡음

                        slook=CMath.V3AddV3(eye,CMath.V3MulFloat(view, size*0.5));
                        if(this.mDigit == null) {   // digit없으면 자동으로 계산
                            AutoDigitSnapping(slook, size*0.5);
                        }
                        else {
                            slook.x = Math.round(slook.x/this.mDigit)*this.mDigit;
                            slook.y = Math.round(slook.y/this.mDigit)*this.mDigit;
                            slook.z = Math.round(slook.z/this.mDigit)*this.mDigit;
                        }
                        seye=CMath.V3AddV3(slook,CMath.V3MulFloat(ligDir, 3/2*size)); // 빛 방향과 반대되는 방향의 물체는 영향을 못 주기 때문에 프러스텀을 빛 방향으로만 확장시킴
                        if(scam.Init(seye,slook,sup))
                        {
                            scam.mWidth=size;
                            scam.mHeight=size;
                            scam.ResetOrthographic();
                            ShadowUpdate=true;
                            this.mBrush.mUpdateShadow=CUpdate.eType.Updated;
                        }
                        ShadowView[i * 2 + 0].set(scam.GetViewMat().F32A(),this.mBrush.mShadowCount*16);
                        ShadowView[i * 2 + 1].set(scam.GetProjMat().F32A(),this.mBrush.mShadowCount*16);
                        scam.Update(_update);

                        size *= 4;  // 다음 cascade는 4배 커짐
                    }
                }
                else
                {
                    let seye = this.mDirPos.xyz;
                    let slook : CVec3;
                    let sup : CVec3;
                    let PVMat : CMat = new CMat();

                    const cubeDir : CVec3[] = [
                        new CVec3( 1,  0,  0 ), new CVec3( -1,  0,  0 ), new CVec3( 0, 1, 0 ),
                        new CVec3( 0,  -1, 0 ), new CVec3( 0,  0,  1 ), new CVec3( 0, 0, -1 )
                    ];
                    const cubeUp : CVec3[] = [
                        new CVec3( 0, 1, 0 ), new CVec3( 0, 1, 0 ), new CVec3( 0, 0, 1 ),
                        new CVec3( 0, 0, -1 ), new CVec3( 0, 1, 0 ),	new CVec3( 0, 1, 0 )
                    ];
                    if(this.mCascadeCycle[0]!=-1)
                    {
                        for(let i = 0; i < 6; i++)
                        {
                            let scam=this.mBrush.GetCamera(this.mTexKey+i);
                            scam.mShadow=true;
                            scam.SetNear(1);
                            scam.SetFov(CMath.DegreeToRadian(90));

                            slook = CMath.V3AddV3(seye, cubeDir[i]);
                            sup = cubeUp[i];
                            if(scam.Init(seye,slook,sup) || scam.mProjFar != this.GetOutRadius())
                            {
                                scam.SetFar(this.GetOutRadius());
                                scam.mWidth = shadowTex.GetWidth();
                                scam.mHeight = shadowTex.GetHeight();
                                scam.ResetPerspective();
                                ShadowUpdate=true;
                                this.mBrush.mUpdateShadow=CUpdate.eType.Updated;
                            }
                            ShadowView[i].set(CMath.MatMul(scam.GetViewMat(), scam.GetProjMat(), PVMat).F32A(), this.mBrush.mShadowCount*16);
                            scam.Update(_update);
                        }
                    }
                }
            }

            // RP 세팅
            // 프레임버퍼의 뎁스 컴포넌트가 하나밖에 없기 때문에 순서에 주의해야 함
            if(!this.IsPointLight())
            {
                for(let i=0;i<this.mCascadeCycle.length;++i)
                {
                    if(this.mCascadeCycle[i]==-1) continue;
                    for(const rp of this.mWriteRP)
                    {
                        if(!rp.mTag.has("shadowWrite")) continue;

                        const srpKey=this.mTexKey+rp.mShader+i;
                        let srp : CRPAuto=this.mBrush.GetAutoRP(srpKey);
                        if(srp == null) {
                            srp=rp.Export();
                            srp.mPriority -= i + this.mBrush.mShadowTexOff;
                            srp.mShaderAttr.push(new CShaderAttr("shadowWrite", new CVec3(i, this.mBrush.mShadowCount, 0)));
                            srp.PushAnd(new CCondition("mCullMask.x","&",this.mCullMask.x)); 
                            this.mBrush.SetAutoRP(srpKey, srp);
                        }
                        srp.mRenderTarget=this.GetTex();
                        srp.mRenderTargetUse=new Set<number>([this.mBrush.mShadowTexOff+i]);
                        srp.mCamera=this.mTexKey+i;
                        if(srp.mShaderAttr[0].mData.y != this.mBrush.mShadowCount) {
                            srp.mShaderAttr[0].mData.x = i; // 몇번째 캐스케이드인지
                            srp.mShaderAttr[0].mData.y = this.mBrush.mShadowCount;  // 현재 그림자의 인덱스
                            srp.mShaderAttr[0].mData.z = 0; // 디렉셔널 라이팅은 0, 포인트 라이팅은 1
                            srp.Reset();
                            this.mBrush.mAutoRPUpdate = CUpdate.eType.Updated;
                        }
                        srp.mAnd[srp.mAnd.length - 1].mValue=this.mCullMask.x;
                        if(this.mShadowOff) srp.mCycle = 100000000;
                        else srp.mCycle=this.mCascadeCycle[i];
                    }
                    maxVal.mF32A[i+1]=this.mBrush.mShadowTexOff+i;
                }

                // 캐스케이드 사용할 때마다 + 1
                if(maxVal.mF32A[1] >= 0) this.mBrush.mShadowTexOff += 1;
                if(maxVal.mF32A[2] >= 0) this.mBrush.mShadowTexOff += 1;
                if(maxVal.mF32A[3] >= 0) this.mBrush.mShadowTexOff += 1;
            }
            else
            {
                if(this.mCascadeCycle[0]!=-1)
                {
                    for(let i=0;i<6;++i)
                    {
                        for(const rp of this.mWriteRP)
                        {
                            if(!rp.mTag.has("shadowWrite")) continue;

                            const srpKey=this.mTexKey+rp.mShader+i;
                            let srp : CRPAuto=this.mBrush.GetAutoRP(srpKey);
                            if(srp == null) {
                                srp=rp.Export();
                                srp.mPriority -= i + this.mBrush.mShadowTexOff;
                                srp.mShaderAttr.push(new CShaderAttr("shadowWrite", new CVec3(SDF.eShadow.Near + i, this.mBrush.mShadowCount, 1)));
                                srp.mTag.add("PointLightShadowV");
                                srp.mTag.add("PointLightShadowF");
                                srp.PushAnd(new CCondition("mCullMask.x","&",this.mCullMask.x));
                                this.mBrush.SetAutoRP(srpKey, srp);
                            }
                            srp.mRenderTarget=this.GetTex();
                            srp.mRenderTargetUse=new Set<number>([this.mBrush.mShadowTexOff+i]);
                            srp.mCamera=this.mTexKey+i;
                            if(srp.mShaderAttr[0].mData.y != this.mBrush.mShadowCount) {
                                srp.mShaderAttr[0].mData.x = i; // 현재 그림자의 방향
                                srp.mShaderAttr[0].mData.y = this.mBrush.mShadowCount;  // 현재 그림자의 인덱스
                                srp.mShaderAttr[0].mData.z = 1; // 디렉셔널 라이팅은 0, 포인트 라이팅은 1
                                srp.Reset();
                                this.mBrush.mAutoRPUpdate = CUpdate.eType.Updated;
                            }
                            srp.mAnd[srp.mAnd.length - 1].mValue=this.mCullMask.x;
                            if(this.mShadowOff) srp.mCycle = 100000000;
                            else srp.mCycle=this.mCascadeCycle[0];
                        }
                    }
                }
                maxVal.mF32A[1]=this.mBrush.mShadowTexOff;
                maxVal.mF32A[2]=1;
                maxVal.mF32A[3]=this.GetOutRadius();

                // 포인트 라이팅이라 텍스쳐 6장 사용
                this.mBrush.mShadowTexOff += 6;
            }
            ShadowView[7][this.mBrush.mShadowCount*4+0]=maxVal.x;
            ShadowView[7][this.mBrush.mShadowCount*4+1]=maxVal.y;
            ShadowView[7][this.mBrush.mShadowCount*4+2]=maxVal.z;
            ShadowView[7][this.mBrush.mShadowCount*4+3]=maxVal.w;

            // 2d
            if(this.mCascadeCycle[0]==-1&&this.mCascadeCycle[1]==-1&&this.mCascadeCycle[2]==-1)
            {
                for(let rp of this.mWriteRP)
                {
                    // shadowPlane
                    if(rp.mTag.has("shadowPlane"))
                    {
                        var srpKey=this.mTexKey+rp.mShader;
                        var srp : CRPAuto=this.mBrush.GetAutoRP(srpKey);
                        if(srp==null)
                        {
                            srp=rp.Export();
                            this.mBrush.SetAutoRP(srpKey,srp);
                            srp.mShaderAttr.push(new CShaderAttr("shadowWrite", new CVec3(this.mBrush.mLightCount, this.mBrush.mShadowCount, 2)));
                            srp.PushAnd(new CCondition("mCullMask.x","&",this.mCullMask.x));
                        }
                        if(srp.mShaderAttr[0].mData.x != this.mBrush.mLightCount || srp.mShaderAttr[0].mData.y != this.mBrush.mShadowCount) {
                            srp.mShaderAttr[0].mData.x = this.mBrush.mLightCount;
                            srp.mShaderAttr[0].mData.y = this.mBrush.mShadowCount;
                            srp.mShaderAttr[0].mData.z = 2;
                            srp.Reset();
                            this.mBrush.mAutoRPUpdate = CUpdate.eType.Updated;
                        }
                        srp.mAnd[srp.mAnd.length - 1].mValue=this.mCullMask.x;
                        if(this.mShadowOff) srp.mCycle = 100000000;
                        else srp.mCycle=0;
                    }
                }
            }

            if(shadowTex.GetInfo()[0].mCount<this.mBrush.mShadowTexOff)
            {
                this.GetOwner().GetFrame().Ren().BuildRenderTarget(
                    [new CTextureInfo(CTexture.eTarget.Array,CTexture.eFormat.RGBA32F,this.mBrush.mShadowTexOff)],
                    new CVec2(shadowTex.GetWidth(), shadowTex.GetHeight()),
                    this.GetOwner().GetFrame().Pal().GetShadowWriteTex()
                );
            }

			if(!this.mShadowOff) {
                this.mCullMask.w = this.mBrush.mShadowCount;
				this.mBrush.mShadowCount++;
            }
		}

		if(this.mBrush.mLightCount>CDevice.GetProperty(CDevice.eProperty.Sam2DSize)/4)
			return;
		
		this.mBrush.mLightDir[this.mBrush.mLightCount * 4 + 0] = this.mDirPos.x;
		this.mBrush.mLightDir[this.mBrush.mLightCount * 4 + 1] = this.mDirPos.y;
		this.mBrush.mLightDir[this.mBrush.mLightCount * 4 + 2] = this.mDirPos.z;
		this.mBrush.mLightDir[this.mBrush.mLightCount * 4 + 3] = this.mDirPos.w;

		this.mBrush.mLightColor[this.mBrush.mLightCount * 4 + 0] = this.mColor.x;
		this.mBrush.mLightColor[this.mBrush.mLightCount * 4 + 1] = this.mColor.y;
		this.mBrush.mLightColor[this.mBrush.mLightCount * 4 + 2] = this.mColor.z;
		this.mBrush.mLightColor[this.mBrush.mLightCount * 4 + 3] = this.mColor.w;
		
		this.mBrush.mLightMask[this.mBrush.mLightCount * 4 + 0] = this.mCullMask.x;
		this.mBrush.mLightMask[this.mBrush.mLightCount * 4 + 1] = this.mCullMask.y;
		this.mBrush.mLightMask[this.mBrush.mLightCount * 4 + 2] = this.mCullMask.z;
		this.mBrush.mLightMask[this.mBrush.mLightCount * 4 + 3] = this.mCullMask.w;
		this.mBrush.mLightCount++;
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
	SetShadow3D(_shadowKey,_CycleTime0=0,_CycleTime1=-1,_CycleTime2=-1)
	{
		this.mTexKey=_shadowKey;
		this.mCascadeCycle[0]=_CycleTime0;
		this.mCascadeCycle[1]=_CycleTime1;
		this.mCascadeCycle[2]=_CycleTime2;
		this.mUpdate = CUpdate.eType.Updated;
	}
    SetShadow2D(_shadowKey)
	{
		this.mTexKey=_shadowKey;
		this.mCascadeCycle[0]=-1;
		this.mCascadeCycle[1]=-1;
		this.mCascadeCycle[2]=-1;
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
    SetDigit(_digit : number) {
        this.mDigit = _digit;
    }
    SetMask(_mask : number) {
        this.mCullMask.x = _mask;
    }
	GetDirectPos() : CVec3 {
		return this.mDirPos.xyz;
	}
	GetColor() : CVec3 {
		return this.mColor.xyz;
	}
    GetMask() : number {
        return this.mCullMask.x;
    }
	IsColorZero()
	{
		return this.mColor.mF32A[0]==0 && this.mColor.mF32A[1]==0 && this.mColor.mF32A[2]==0;
	}
	GetInRadius() {
		return this.mColor.w;
	}
	GetOutRadius() {
		return this.mDirPos.w;
	}
	IsPointLight() 
	{
		return this.mDirPos.w > 0.5;
	}
	override ImportCJSON(_json: CJSON): this {
		return super.ImportCJSON(_json);
	}
    override SetEnable(_val: boolean): void {
        super.SetEnable(_val);

        if(this.mCascadeCycle[0]==-1&&this.mCascadeCycle[1]==-1&&this.mCascadeCycle[2]==-1)
        {
            for(let rp of this.mWriteRP)
            {
                if(rp.mTag.has("shadowPlane")==false) continue;
                const srpKey=this.mTexKey+rp.mShader;
                this.mBrush.RemoveAutoRP(srpKey);
            }
        }

        if(this.mBrush!=null)
        {
            this.mBrush.mUpdateLight=CUpdate.eType.Updated;
            this.mBrush.mUpdateShadow=CUpdate.eType.Updated;
            if(this.IsPointLight()) {
                for(let i=0;i<6;i++) {
                    this.mBrush.mCameraMap.delete(this.mTexKey+i);
                    for(let rp of this.mWriteRP) {
                        if(rp.mTag.has("shadowWrite")==false) continue;
                        const srpKey=this.mTexKey+rp.mShader+i;
                        this.mBrush.RemoveAutoRP(srpKey);
                    }
                }
            } else {
                for(let i=0;i<this.mCascadeCycle.length;++i) {
                    if(this.mCascadeCycle[i]==-1) continue;
                    this.mBrush.mCameraMap.delete(this.mTexKey+i);
                    for(let rp of this.mWriteRP) {
                        if(rp.mTag.has("shadowWrite")==false) continue;
                        const srpKey=this.mTexKey+rp.mShader+i;
                        this.mBrush.RemoveAutoRP(srpKey);
                    }
                }
            }
            this.mBrush.ClearRen();
        }
    }
	override Destroy(): void {
		super.Destroy();

        if(this.mCascadeCycle[0]==-1&&this.mCascadeCycle[1]==-1&&this.mCascadeCycle[2]==-1)
        {
            for(let rp of this.mWriteRP) {
                if(rp.mTag.has("shadowPlane")==false) continue;
                const srpKey=this.mTexKey+rp.mShader;
                this.mBrush.RemoveAutoRP(srpKey);
            }
        }
		
		if(this.mBrush!=null)
        {
            this.mBrush.mUpdateLight=CUpdate.eType.Updated;
            this.mBrush.mUpdateShadow=CUpdate.eType.Updated;
            if(this.IsPointLight()) {
                for(let i=0;i<6;i++) {
                    this.mBrush.mCameraMap.delete(this.mTexKey+i);
                    for(let rp of this.mWriteRP) {
                        if(rp.mTag.has("shadowWrite")==false) continue;
                        const srpKey=this.mTexKey+rp.mShader+i;
                        this.mBrush.RemoveAutoRP(srpKey);
                    }
                }
            } else {
                for(let i=0;i<this.mCascadeCycle.length;++i) {
                    if(this.mCascadeCycle[i]==-1) continue;
                    this.mBrush.mCameraMap.delete(this.mTexKey+i);
                    for(let rp of this.mWriteRP) {
                        if(rp.mTag.has("shadowWrite")==false) continue;
                        const srpKey=this.mTexKey+rp.mShader+i;
                        this.mBrush.RemoveAutoRP(srpKey);
                    }
                }
            }
            this.mBrush.ClearRen();
        }
	}

}