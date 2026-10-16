import {CVec4} from "../../geometry/CVec4.js"
import {CVec1} from "../../geometry/CVec1.js"
import {CVec3} from "../../geometry/CVec3.js"
import {CBound} from "../../geometry/CBound.js"
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
import { CJSON } from "../../basic/CJSON.js";

import { CUtilObj } from "../../basic/CUtilObj.js";
import { CClass } from "../../basic/CClass.js";
import { CRPAuto } from "../canvas/CRPMgr.js";
import { CCondition } from "../../util/CCondition.js";
import { CMat } from "../../geometry/CMat.js";
import { SDF } from "../../z_file/SDF.js";
import { CPaint } from "./paint/CPaint.js";
import { CPoolGeo } from "../../geometry/CPoolGeo.js";
import { CUtilMath } from "../../geometry/CUtilMath.js";

//방향과 위치는 상위 오브젝트 위치기반으로 한다
export class CLight extends CBrushComp
{
	//캐스케이드별 그림자맵 다시 그리기 주기(초, 밀리초 아님). 0=매 프레임(텍셀 임계값 판정도 건너뜀), -1=사용 안 함
	public mCascadeCycle=[0,-1,-1,-1,-1,-1];
	public mCascadeDivide=[0.01, 0.02, 0.04, 0.08, 0.16, 0.32];
	public mCascadeTexelThreshold: number = 3.0;

	public mDigit=null;//커팅할 범위
    public mShadowDistance=10000;//얼마나 먼거리까지 보이는지
    public mShadowCasterMargin=20000;//방향광: 캐스케이드 박스 앞면에서 라이트 카메라를 뒤로 뺄 거리. 박스 밖 라이트 쪽 물체를 이 거리까지 그림자맵에 담는다
    public mShadowFade=0.25;//캐스케이드끼리 얼마나 겹칠지(0.2면 20퍼센트 겹침)
	protected mShadowOff : boolean = false;
	//포인트 라이트 한정. 도달범위 구가 어느 카메라에도 안 걸리면 그림자 렌더패스를 건너뛴다
	public mShadowCullFrustum : boolean = true;
	protected mShadowCull : boolean = false;
	//포인트 라이트 한정. 도달범위 구가 어느 카메라에도 안 걸리면 라이트 버퍼에서 뺀다(화면 밖 라이트가 셰이더 비용을 먹지 않게)
	public mLightCullFrustum : boolean = true;
	protected mLightCull : boolean = false;
	private mCullPos=new CVec3();
	public mUpdate : number = CUpdate.eType.Updated;

	protected mDirPos : CVec4;//XYZ,TYPE(디렉션 음수-1-2 거리 양수:포인트)
	protected mColor : CVec4;//RGB,User(사용 유무)
	protected mCullMask : CVec4;//x마스크인덱스 w그림자인덱스(사용하면 안됨)
	
	constructor()
	{
		super(null);

		this.mDirPos=new CVec4();
		this.mColor=new CVec4();
        this.mCullMask=new CVec4();
		
		this.mDirPos.w = -1;
		
		this.mColor.x = 1;
		this.mColor.y = 1;
		this.mColor.z = 1;
		this.mColor.w = 1;

        this.mCullMask.x = CPaint.eCullMask.Default;
		
		this.mSysc=CComponent.eSysn.Light;
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

		// 1. 기본 그림자 RenderPass 등록
		if(this.mWriteRP.length == 0)
        {
			let srp=new CRPAuto(this.mBrush.mFrame.Pal().Sl3D().mKey);
			srp.mCopy=false;
            srp.mAlpha=false;
			srp.mTag.add("shadowWrite");
			srp.PushOr(new CCondition("class","==","CPaint3D"));
			srp.PushOr(new CCondition("class","==","CPaint3DMerge"));
			srp.PushAnd(new CCondition("mTag[shadow]"));
			srp.PushAnd(new CCondition("mTag[shadowReadOnly]",CCondition.eOperator["!="]));
			srp.mPriority=CRenderPass.ePriority.BackGround - 1;
			this.PushRPAuto(srp);
	
			srp=new CRPAuto(this.mBrush.mFrame.Pal().SlVoxel().mKey);
			srp.mCopy=false;
            srp.mAlpha=false;
			srp.mTag.add("shadowWrite");
			srp.PushAnd(new CCondition("class","==","CPaintVoxel"));
			srp.PushAnd(new CCondition("mTag[shadow]"));
			srp.PushAnd(new CCondition("mTag[shadowReadOnly]",CCondition.eOperator["!="]));
			srp.mPriority=CRenderPass.ePriority.BackGround - 1;
			this.PushRPAuto(srp);

            srp=new CRPAuto(this.mBrush.mFrame.Pal().SlTerrain().mKey);
			srp.mCopy=false;
            srp.mAlpha=false;
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

		const frustumCull = (this.mShadowCullFrustum || this.mLightCullFrustum) && this.IsPointLight() && this.IsFrustumCull();
		this.mLightCull = this.mLightCullFrustum && frustumCull;

		// 2. 그림자 업데이트 (shadowOff가 false일 때만 실행)
		if (this.mTexKey!=null)
		{
			this.mShadowOff = this.mColor.IsZero();

			if(!this.mShadowOff)
			{
				//컬링돼도 UpdateShadow 는 그대로 부른다. 건너뛰면 mShadowCount 가 밀려서
				//뒤 라이트들의 shadowWrite 가 바뀌고 mAutoRPUpdate 가 서서 전체 재매칭이 돈다
				this.mShadowCull = this.mShadowCullFrustum && frustumCull;
				this.UpdateShadow(_update);
			}
		}

		// 3. 브러시 기본 Light 버퍼 입력 (mLightDir, mLightColor, mLightMask)
		if(this.mLightCull)
			return;
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

	//이번 프레임에 화면 밖이라 라이트 버퍼에서 빠졌는가
	IsLightCull()	{	return this.mLightCull;	}
	//도달범위 구가 그림자용이 아닌 카메라 어디에도 안 걸리면 true. 쓸 수 있는 카메라가 없으면 컬링하지 않는다
	protected IsFrustumCull() : boolean
	{
		if(this.mBrush==null)	return false;

		this.mCullPos.mF32A[0]=this.mDirPos.mF32A[0];
		this.mCullPos.mF32A[1]=this.mDirPos.mF32A[1];
		this.mCullPos.mF32A[2]=this.mDirPos.mF32A[2];
		const radius=this.GetOutRadius();

		let chk=false;
		for(const cam of this.mBrush.mCameraMap.values())
		{
			if(cam.mShadow==true)	continue;
			if(cam.GetView().IsZero())	continue;
			chk=true;
			if(CUtilMath.PlaneSphereInside(cam.GetPlane(),this.mCullPos,radius,null))	return false;
		}
		return chk;
	}
	protected UpdateShadow(_update : CUpdate)
	{
		const shadowTex = this.mBrush.mFrame.Res().Find(this.GetTex()) as CTexture;
		const ShadowView = this.mBrush.GetShadowView();
		const ShadowInfo = ShadowView[6];
		const shadowBaseIdx = this.mBrush.mShadowCount * 16;

		// =========================================================================
		// 1. 3D 그림자 처리
		// =========================================================================
		if (this.IsPointLight())
		{
			// =====================================================================
			// [Point Light]
			// =====================================================================
			if (this.mCascadeCycle[0] != -1)
			{
				const seye = this.mDirPos.xyz;
				const outRadius = this.GetOutRadius();
				const cubeDir = [
					new CVec3(1, 0, 0), new CVec3(-1, 0, 0), new CVec3(0, 1, 0),
					new CVec3(0, -1, 0), new CVec3(0, 0, 1), new CVec3(0, 0, -1)
				];
				const cubeUp = [
					new CVec3(0, 1, 0), new CVec3(0, 1, 0), new CVec3(0, 0, 1),
					new CVec3(0, 0, -1), new CVec3(0, 1, 0), new CVec3(0, 1, 0)
				];
				const cams: any[] = [];

				// -----------------------------------------------------------------
				// 1) CPU: 6방향 큐브 카메라 세팅 & 업데이트
				// -----------------------------------------------------------------
				for (let i = 0; i < 6; i++)
				{
					const scam = this.mBrush.GetCamera(this.mTexKey + i);
					scam.mShadow = true;
					scam.SetNear(1);
					scam.SetFov(CMath.DegreeToRadian(90));

					const slook = CMath.V3AddV3(seye, cubeDir[i]);
					if (scam.Init(seye, slook, cubeUp[i]) || scam.mProjFar != outRadius)
					{
						scam.SetFar(outRadius);
						scam.mWidth = shadowTex.GetWidth();
						scam.mHeight = shadowTex.GetHeight();
						scam.ResetPerspective();
						this.mBrush.mUpdateShadow = CUpdate.eType.Updated;
					}
					scam.Update(_update);
					cams.push(scam);
				}

				// -----------------------------------------------------------------
				// 2) GPU 버퍼 입력: ShadowView & ShadowInfo 일괄 작성
				// -----------------------------------------------------------------
				const PVMat: CMat = CPoolGeo.ProductMat();
				for (let i = 0; i < 6; i++)
				{
					ShadowView[i].set(CMath.MatMul(cams[i].GetViewMat(), cams[i].GetProjMat(), PVMat).F32A(), shadowBaseIdx);
				}
				CPoolGeo.RecycleMat(PVMat);

				ShadowInfo[shadowBaseIdx + 0] = this.mBrush.mLightCount;
				ShadowInfo[shadowBaseIdx + 1] = this.mBrush.mShadowTexOff;
				ShadowInfo[shadowBaseIdx + 2] = outRadius;
				ShadowInfo[shadowBaseIdx + 3] = 2 / shadowTex.GetWidth() * 1.4142136;

				// -----------------------------------------------------------------
				// 3) RenderPass (RP) 등록
				// -----------------------------------------------------------------
				for (let i = 0; i < 6; ++i)
				{
					for (const rp of this.mWriteRP)
					{
						if (!rp.mTag.has("shadowWrite")) continue;

						const srpKey = this.mTexKey + rp.mShader + i;
						let srp: CRPAuto = this.mBrush.FindAutoRP(srpKey);
						if (srp == null) {
							srp = rp.Export();
							srp.mPriority -= i + this.mBrush.mShadowTexOff;
							srp.mShaderAttr.push(new CShaderAttr("shadowWrite", new CVec3(SDF.eShadow.Near + i, this.mBrush.mShadowCount, 1)));
							srp.mTag.add("PointLightShadowV");
							srp.mTag.add("PointLightShadowF");
							srp.PushAnd(new CCondition("mCullMask.x", "&", this.mCullMask.x));
							this.mBrush.PushAutoRP(srpKey, srp);
						}
						srp.mRenderTarget = this.GetTex();
						srp.mRenderTargetUse = new Set<number>([this.mBrush.mShadowTexOff + i]);
						srp.mCamera = this.mTexKey + i;

						const shadowWriteAttr = srp.mShaderAttr[0];
						if (shadowWriteAttr.mData.y != this.mBrush.mShadowCount) {
							shadowWriteAttr.mData.x = i;
							shadowWriteAttr.mData.y = this.mBrush.mShadowCount;
							shadowWriteAttr.mData.z = 1;
							srp.Reset();
							this.mBrush.mAutoRPUpdate = CUpdate.eType.Updated;
						}
						srp.mAnd[srp.mAnd.length - 1].mValue = this.mCullMask.x;
						srp.mCycle = this.mCascadeCycle[0];
					}
				}
				this.mBrush.mShadowTexOff += 6;
			}
		}
		else
		{
			// =====================================================================
			// [Directional Light]
			// =====================================================================
			const ligDir = CMath.V3Nor(this.mDirPos.xyz);
			const cam3D = this.mBrush.GetCam3D();
			const camNear = (cam3D && cam3D.mProjNear > 0) ? cam3D.mProjNear : 1.0;
			const camFar = (cam3D && cam3D.mProjFar > 0) ? cam3D.mProjFar : 100000.0;
			const far = Math.max(Math.min(camFar, this.mShadowDistance), camNear + 1.0);
			const span = Math.max(far - camNear, 1.0);
			const frustumDivide = far / Math.max(camFar, 1.0);

			const lightOrientationMat = CMath.LookAt(new CVec3(), ligDir, new CVec3(0, 1, 0));
			const lightOrientationMatInv = CMath.MatInvert(lightOrientationMat);

			// ---------------------------------------------------------------------
			// [알고리즘 함수] 1) 캐스케이드 바운드 계산
			// ---------------------------------------------------------------------
			const ComputeCascadeBounds = (_nearDepth: number, _farDepth: number) => {
				const sliceVerts: CVec3[] = [];
				for (let j = 0; j < 4; ++j) sliceVerts.push(CMath.V3Interpolate(cam3D.mFrustum[j], cam3D.mFrustum[j + 4], _nearDepth * frustumDivide));
				for (let j = 0; j < 4; ++j) sliceVerts.push(CMath.V3Interpolate(cam3D.mFrustum[j], cam3D.mFrustum[j + 4], _farDepth * frustumDivide));

				const p1 = sliceVerts[6];
				const p2 = CMath.V3Distance(p1, sliceVerts[4]) > CMath.V3Distance(p1, sliceVerts[0]) ? sliceVerts[4] : sliceVerts[0];
				const bbWidth = CMath.V3Distance(p1, p2) + this.mShadowFade * _farDepth * span;

				const bound = new CBound();
				const first = CMath.V3MulMatNormal(sliceVerts[0], lightOrientationMatInv);
				bound.mMin.Import(first);
				bound.mMax.Import(first);
				for (const v of sliceVerts) bound.InitBound(CMath.V3MulMatNormal(v, lightOrientationMatInv));
				return { bbWidth, bound };
			};

			// ---------------------------------------------------------------------
			// [알고리즘 함수] 2) 캐스케이드 분할 비율 계산 (거리/비율)
			// ---------------------------------------------------------------------
			const ComputeDivides = () => {
				const count = this.mCascadeCycle.filter(c => c != -1).length;
				if (count <= 1) return [1.0];

				const isDistanceMode = this.mCascadeDivide.some(v => v > 1.0);
				const rawValues: number[] = [];

				if (isDistanceMode) {
					const maxDist = Math.max(far, 1.0);
					let accDist = 0;
					for (const dist of this.mCascadeDivide) {
						if (rawValues.length >= count || accDist >= maxDist) break;
						const slice = Math.min(dist, maxDist - accDist);
						rawValues.push(slice);
						accDist += slice;
					}
					if (rawValues.length < count && accDist < maxDist) {
						const perSlice = (maxDist - accDist) / (count - rawValues.length);
						while (rawValues.length < count) rawValues.push(perSlice);
					}
				} else {
					for (const r of this.mCascadeDivide) {
						if (rawValues.length >= count) break;
						rawValues.push(r);
					}
					if (rawValues.length < count) {
						const sum = rawValues.reduce((a, b) => a + b, 0);
						const fillVal = (sum >= 1.0) ? 0.1 : (1.0 - sum) / (count - rawValues.length);
						while (rawValues.length < count) rawValues.push(fillVal);
					}
				}

				const total = rawValues.reduce((a, b) => a + b, 0);
				return total > 0 ? rawValues.map(v => v / total) : [1.0];
			};

			const divides = ComputeDivides();

			// ---------------------------------------------------------------------
			// 1) CPU: 캐스케이드별 카메라 위치 & 투영 계산 및 scam.Update
			// ---------------------------------------------------------------------
			const texWidth = shadowTex.GetWidth();
			const texHeight = shadowTex.GetHeight();
			const activeCascades: { slot: number; scam: any; cullingSphere: number; zOffset: number }[] = [];
			const marginSet = Number.isFinite(this.mShadowCasterMargin) ? this.mShadowCasterMargin : 20000;

			let cascadeNear = 0;
			let casIdx = 0;

			for (let i = 0; i < this.mCascadeCycle.length; ++i) {
				if (this.mCascadeCycle[i] == -1) continue;
				if (casIdx >= divides.length) break;

				const scam = this.mBrush.GetCamera(this.mTexKey + i);
				scam.mShadow = true;

				const cascadeFar = cascadeNear + divides[casIdx];
				const { bbWidth, bound } = ComputeCascadeBounds(cascadeNear, cascadeFar);
				const center = bound.GetCenter();
				const cullingSphere = bound.GetOutRadius();
				// 1 미만이면 박스 앞면이 카메라 근평면에 걸리고, 원평면-박스두께를 넘으면 박스 뒤쪽이 잘려 그림자가 사라진다
				const projFar = scam.mProjFar > 0 ? scam.mProjFar : 100000;
				const casterMargin = Math.max(1, Math.min(marginSet, projFar - (bound.mMax.z - bound.mMin.z) - 1));
				center.z = bound.mMin.z - casterMargin;
				//직교 깊이 범위를 이 캐스케이드(앞 여유 + 박스)에 맞춘다. 박스 두께는 갱신 사이(텍셀 임계값)에 조금 변하므로 10% 여유를 둔다
				const shadowFar = casterMargin + (bound.mMax.z - bound.mMin.z) * 1.1 + 1;

				// 텍셀 스내핑
				if (this.mDigit == null) {
					const texelW = bbWidth / texWidth;
					const texelH = bbWidth / texHeight;
					center.x = Math.floor(center.x / texelW) * texelW;
					center.y = Math.floor(center.y / texelH) * texelH;
				} else {
					center.x = Math.floor(center.x / this.mDigit) * this.mDigit;
					center.y = Math.floor(center.y / this.mDigit) * this.mDigit;
				}

				// 텍셀 임계값(mCascadeTexelThreshold) 기반 지터링 방지 판정
				const seye = CMath.V3MulMatNormal(center, lightOrientationMat);
				const prevView = scam.GetView();
				let needUpdate = false;

				if (prevView.IsZero() || this.mCascadeCycle[i] == 0) {
					needUpdate = true;
				} else {
					const texelW = bbWidth / texWidth;
					const posDiff = CMath.V3Distance(seye, scam.GetEye()) / texelW;
					const sizeDiff = Math.abs(bbWidth - scam.mWidth) / texelW;
					const prevLigDir = new CVec3(-prevView.x, -prevView.y, -prevView.z);
					const rotDiff = (texWidth * 0.5) * CMath.V3Distance(ligDir, prevLigDir);

					if (Math.max(posDiff, sizeDiff, rotDiff) >= this.mCascadeTexelThreshold) {
						needUpdate = true;
					}
				}

				if (needUpdate) {
					const slook = CMath.V3SubV3(seye, ligDir);
					if (scam.Init(seye, slook, new CVec3(0, 1, 0)) || scam.mWidth != bbWidth || scam.mHeight != bbWidth || scam.mProjFar != shadowFar) {
						scam.mWidth = bbWidth;
						scam.mHeight = bbWidth;
						scam.SetNear(1);
						scam.SetFar(shadowFar);
						scam.ResetOrthographic();
						this.mBrush.mUpdateShadow = CUpdate.eType.Updated;
					}
				}

				scam.Update(_update);
				// 박스 앞면(카메라 앞 casterMargin 지점)의 뷰 z를 0으로 옮기는 값. 부호를 뷰행렬로 구하므로 RH/LH 모두 맞다
				const vm = scam.GetViewMat().F32A();
				const front = CMath.V3SubV3(scam.GetEye(), CMath.V3MulFloat(ligDir, casterMargin));
				const zOffset = -(vm[2] * front.x + vm[6] * front.y + vm[10] * front.z + vm[14]);
				activeCascades.push({ slot: i, scam, cullingSphere, zOffset });

				cascadeNear = cascadeFar;
				casIdx++;
			}

			// ---------------------------------------------------------------------
			// 2) GPU 버퍼 입력: ShadowView & ShadowInfo 일괄 작성
			// ---------------------------------------------------------------------
			const eye = cam3D.GetEye();
			const PVMat: CMat = CPoolGeo.ProductMat();
			for (let i = 0; i < activeCascades.length; ++i) {
				const { slot, scam, zOffset } = activeCascades[i];
				const vp = CMath.MatTranspose(scam.mVPMat, PVMat).F32A();
				for (let r = 0; r < 3; ++r) {
					const o = r * 4;
					ShadowView[slot][shadowBaseIdx + o + 0] = vp[o + 0];
					ShadowView[slot][shadowBaseIdx + o + 1] = vp[o + 1];
					ShadowView[slot][shadowBaseIdx + o + 2] = vp[o + 2];
					const t = Math.fround(vp[o + 3] + vp[o + 0] * eye.x + vp[o + 1] * eye.y + vp[o + 2] * eye.z);
					if (ShadowView[slot][shadowBaseIdx + o + 3] !== t) {
						ShadowView[slot][shadowBaseIdx + o + 3] = t;
						this.mBrush.mUpdateShadow = CUpdate.eType.Updated;
					}
				}
				const vMat = scam.GetViewMat().F32A();
				ShadowView[slot][shadowBaseIdx + 12] = vMat[2];
				ShadowView[slot][shadowBaseIdx + 13] = vMat[6];
				ShadowView[slot][shadowBaseIdx + 14] = vMat[10];
				const tz = Math.fround(vMat[14] + zOffset + vMat[2] * eye.x + vMat[6] * eye.y + vMat[10] * eye.z);
				if (ShadowView[slot][shadowBaseIdx + 15] != tz) {
					ShadowView[slot][shadowBaseIdx + 15] = tz;
					this.mBrush.mUpdateShadow = CUpdate.eType.Updated;
				}
			}
			CPoolGeo.RecycleMat(PVMat);

			// 2-2) ShadowInfo (메타데이터 16 floats 일괄 기록)
			ShadowInfo[shadowBaseIdx + 0] = this.mBrush.mLightCount;
			ShadowInfo[shadowBaseIdx + 1] = this.mBrush.mShadowTexOff;
			ShadowInfo[shadowBaseIdx + 2] = span;
			ShadowInfo[shadowBaseIdx + 3] = this.mShadowFade;
			for (let i = 0; i < 5; i++) {
				ShadowInfo[shadowBaseIdx + 4 + i] = (i < divides.length) ? divides[i] : -1;
			}
			ShadowInfo[shadowBaseIdx + 9] = divides.length - 1;
			//캐스케이드 텍셀 폭(월드 단위). Shadow.ts가 노말 오프셋·깊이 바이어스를 이 값에 비례시킨다
			for (let i = 0; i < 6; i++) {
				ShadowInfo[shadowBaseIdx + 10 + i] = (i < activeCascades.length)
					? Math.max(activeCascades[i].scam.mWidth / texWidth, 3)
					: 0;
			}

			// ---------------------------------------------------------------------
			// 3) RenderPass (RP) 등록
			// ---------------------------------------------------------------------
			for (let i = 0; i < activeCascades.length; ++i) {
				const slot = activeCascades[i].slot;
				for (const rp of this.mWriteRP) {
					if (!rp.mTag.has("shadowWrite")) continue;

					const srpKey = this.mTexKey + rp.mShader + slot;
					let srp: CRPAuto = this.mBrush.FindAutoRP(srpKey);
					if (srp == null) {
						srp = rp.Export();
						srp.mPriority -= this.mBrush.mShadowTexOff;
						srp.mShaderAttr.push(new CShaderAttr("shadowWrite", new CVec3(slot, this.mBrush.mShadowCount, 0)));
						srp.PushAnd(new CCondition("mCullMask.x", "&", this.mCullMask.x));
						this.mBrush.PushAutoRP(srpKey, srp);
					}
					srp.mRenderTarget = this.GetTex();
					srp.mRenderTargetUse = new Set<number>([this.mBrush.mShadowTexOff]);
					srp.mCamera = this.mTexKey + slot;

					const shadowWriteAttr = srp.mShaderAttr[0];
					if (shadowWriteAttr.mData.y != this.mBrush.mShadowCount) {
						shadowWriteAttr.mData.x = slot;
						shadowWriteAttr.mData.y = this.mBrush.mShadowCount;
						shadowWriteAttr.mData.z = 0;
						srp.Reset();
						this.mBrush.mAutoRPUpdate = CUpdate.eType.Updated;
					}
					srp.mAnd[srp.mAnd.length - 1].mValue = this.mCullMask.x;
					srp.mEnable.v = !this.mShadowCull;
					srp.mCycle = this.mCascadeCycle[slot];

					let zOffsetAttr = srp.FindSA("shadowZOffset");
					if (zOffsetAttr == null) {
						zOffsetAttr = new CShaderAttr("shadowZOffset", new CVec1(0));
						srp.mShaderAttr.push(zOffsetAttr);
					}
					zOffsetAttr.mData.x = activeCascades[i].zOffset;
				}
				this.mBrush.mShadowTexOff += 1;
			}
		}

		// =========================================================================
		// 2. 2D 그림자 처리
		// =========================================================================
		if (this.mCascadeCycle[0] == -1 && this.mCascadeCycle[1] == -1 && this.mCascadeCycle[2] == -1 && this.mCascadeCycle[3] == -1 && this.mCascadeCycle[4] == -1 && this.mCascadeCycle[5] == -1)
		{
			for (let rp of this.mWriteRP)
			{
				if (rp.mTag.has("shadowPlane"))
				{
					var srpKey = this.mTexKey + rp.mShader;
					var srp: CRPAuto = this.mBrush.FindAutoRP(srpKey);
					if (srp == null)
					{
						srp = rp.Export();
						this.mBrush.PushAutoRP(srpKey, srp);
						srp.mShaderAttr.push(new CShaderAttr("shadowWrite", new CVec3(this.mBrush.mLightCount, this.mBrush.mShadowCount, 2)));
						srp.PushAnd(new CCondition("mCullMask.x", "&", this.mCullMask.x));
					}
					// x(라이트 버퍼 번호)는 앞 라이트가 컬링되면 밀린다. 렌더 정보가 mShaderAttr를 포인터로 공유해 값만 바꿔도
					// 셰이더에 가므로 키(Reset)는 다시 만들지 않는다 — 다시 만들면 브러시 전체 재매칭이 돈다. 키 구분은 고유한 y로 된다.
					srp.mShaderAttr[0].mData.x = this.mBrush.mLightCount;
					if (srp.mShaderAttr[0].mData.y != this.mBrush.mShadowCount) {
						srp.mShaderAttr[0].mData.y = this.mBrush.mShadowCount;
						srp.mShaderAttr[0].mData.z = 2;
						srp.Reset();
						this.mBrush.mAutoRPUpdate = CUpdate.eType.Updated;
					}
					srp.mAnd[srp.mAnd.length - 1].mValue = this.mCullMask.x;
					srp.mEnable.v = !this.mShadowCull;
					srp.mCycle = 0;
				}
			}
		}

		// =========================================================================
		// 3. 렌더타깃 크기 검사 및 그림자 카운트 증가
		// =========================================================================
		if (shadowTex.GetInfo()[0].mCount < this.mBrush.mShadowTexOff)
		{
			this.GetOwner().GetFrame().Ren().BuildRenderTarget(
				[new CTextureInfo(CTexture.eTarget.Array, CTexture.eFormat.RGBA32F, this.mBrush.mShadowTexOff)],
				new CVec2(shadowTex.GetWidth(), shadowTex.GetHeight()),
				this.GetOwner().GetFrame().Pal().GetShadowWriteTex()
			);
		}

		this.mCullMask.w = this.mBrush.mShadowCount;
		this.mBrush.mShadowCount++;
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
	//_cycleSecN: 캐스케이드별 다시 그리기 주기(초, 밀리초 아님). 0=매 프레임, -1=사용 안 함. 예) 0.03이면 초당 약 33번
	SetShadow3D(_shadowKey,_cycleSec0=0,_cycleSec1=-1,_cycleSec2=-1,_cycleSec3=-1,_cycleSec4=-1,_cycleSec5=-1)
	{
		this.mTexKey=_shadowKey;
		this.mCascadeCycle[0]=_cycleSec0;
		this.mCascadeCycle[1]=_cycleSec1;
		this.mCascadeCycle[2]=_cycleSec2;
        this.mCascadeCycle[3]=_cycleSec3;
        this.mCascadeCycle[4]=_cycleSec4;
        this.mCascadeCycle[5]=_cycleSec5;
		this.mUpdate = CUpdate.eType.Updated;
	}
	SetShadow2D(_shadowKey)
	{
		this.mTexKey=_shadowKey;
		this.mCascadeCycle[0]=-1;
		this.mCascadeCycle[1]=-1;
		this.mCascadeCycle[2]=-1;
        this.mCascadeCycle[3]=-1;
        this.mCascadeCycle[4]=-1;
        this.mCascadeCycle[5]=-1;
		this.mUpdate = CUpdate.eType.Updated;
	}
    Refresh() {
        if(this.mBrush!=null && this.mTexKey!=null)
		{
			this.mBrush.mUpdateLight=CUpdate.eType.Updated;
			this.mBrush.mUpdateShadow=CUpdate.eType.Updated;

			if(this.mCascadeCycle[0]==-1&&this.mCascadeCycle[1]==-1&&this.mCascadeCycle[2]==-1&&this.mCascadeCycle[3]==-1&&this.mCascadeCycle[4]==-1&&this.mCascadeCycle[5]==-1)
			{
				for(let rp of this.mWriteRP)
				{
					if(rp.mTag.has("shadowPlane")==false) continue;
					this.mBrush.RemoveAutoRP(this.mTexKey+rp.mShader);
				}
			}

			if(this.IsPointLight())
			{
				for(let i=0;i<6;i++)
				{
					this.mBrush.mCameraMap.delete(this.mTexKey+i);
					for(let rp of this.mWriteRP)
					{
						if(rp.mTag.has("shadowWrite")==false) continue;
						this.mBrush.RemoveAutoRP(this.mTexKey+rp.mShader+i);
					}
				}
			}
			else
			{
				for(let i=0;i<this.mCascadeCycle.length;++i)
				{
					if(this.mCascadeCycle[i]==-1) continue;
					this.mBrush.mCameraMap.delete(this.mTexKey+i);
					for(let rp of this.mWriteRP)
					{
						if(rp.mTag.has("shadowWrite")==false) continue;
						this.mBrush.RemoveAutoRP(this.mTexKey+rp.mShader+i);
					}
				}
			}
			this.mBrush.ClearRen();
		}
    }
	RemoveShadow()
	{
		this.Refresh();
		this.mCascadeCycle=[0,-1,-1,-1,-1,-1];
		this.mTexKey=null;
		this.mUpdate=CUpdate.eType.Updated;
	}
	SetCascadeTexelThreshold(_threshold : number)
	{
		this.mCascadeTexelThreshold = _threshold >= 0 ? _threshold : 1.0;
	}
	GetCascadeTexelThreshold() : number
	{
		return this.mCascadeTexelThreshold;
	}
	SetShadowDistance(_dist : number)
	{
		this.mShadowDistance=_dist;
	}
	SetShadowCasterMargin(_dist : number)
	{
		this.mShadowCasterMargin=_dist;
		this.mUpdate = CUpdate.eType.Updated;
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
    SetUniformDivide()
    {
        this.mCascadeDivide = [0.1,0.1,0.1,0.1,0.1,0.1];
    }
    SetGeometric()
    {
        this.mCascadeDivide = [0.01,0.02,0.04,0.08,0.16,0.32];
    }
	override ImportCJSON(_json: CJSON): this {
		return super.ImportCJSON(_json);
	}
    override SetEnable(_val: boolean): void {
        super.SetEnable(_val);
        this.Refresh();
    }
	override Destroy(): void {
		super.Destroy();
        this.Refresh();
	}

	// =========================================================================
	// UI & Editor Form
	// =========================================================================
	override Icon(){ return "bi bi-lightbulb"; }
    override IsShould(_member: string, _type: CObject.eShould): boolean {
        if(_member == "mWrite") {
            return false;
        }
        if(_member == "mShadowCull")	return false;
        if(_member == "mLightCull")		return false;
        if(_member == "mCullPos")		return false;
        return super.IsShould(_member, _type);
    }
	override EditChange(_pointer : CPointer,_child : boolean)
	{
		super.EditChange(_pointer,_child);
		if(_pointer.member=="mCullMask" || _pointer.member=="mShadowCasterMargin")
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
			let isPoint=this.IsPointLight();
			let is2D=(this.mTexKey!=null && this.mCascadeCycle[0]==-1 && this.mCascadeCycle[1]==-1 && this.mCascadeCycle[2]==-1 && this.mCascadeCycle[3]==-1 && this.mCascadeCycle[4]==-1 && this.mCascadeCycle[5]==-1);
			let curType=is2D?(isPoint?"2dpoint":"2ddirect"):(isPoint?"point":"direct");

			let applyDirColor=()=>{
				let cx=Number(CDOM.IDValue("ligDirCX_num"+wtKey));
				let cy=Number(CDOM.IDValue("ligDirCY_num"+wtKey));
				let cz=Number(CDOM.IDValue("ligDirCZ_num"+wtKey));
				this.SetColor(new CVec3(cx,cy,cz));
			};
			let applyPtColor=()=>{
				let cx=Number(CDOM.IDValue("ligPtCX_num"+wtKey));
				let cy=Number(CDOM.IDValue("ligPtCY_num"+wtKey));
				let cz=Number(CDOM.IDValue("ligPtCZ_num"+wtKey));
				this.SetColor(new CVec3(cx,cy,cz));
			};
			let applyPtRadius=()=>{
				let outer=Number(CDOM.IDValue("ligPtOuter_num"+wtKey));
				let inner=Number(CDOM.IDValue("ligPtInner_num"+wtKey));
				if(!(outer>0)) outer=1;
				if(!(inner>0)) inner=1;
				this.SetPoint(outer,inner);
			};
			let applyCascade=()=>{
				if(this.mTexKey==null) return;
				let c0=Number(CDOM.IDValue("ligCas0_num"+wtKey));
				let c1=Number(CDOM.IDValue("ligCas1_num"+wtKey));
				let c2=Number(CDOM.IDValue("ligCas2_num"+wtKey));
                let c3=Number(CDOM.IDValue("ligCas3_num"+wtKey));
                let c4=Number(CDOM.IDValue("ligCas4_num"+wtKey));
                let c5=Number(CDOM.IDValue("ligCas5_num"+wtKey));
				this.mCascadeCycle[0]=c0;
				this.mCascadeCycle[1]=c1;
				this.mCascadeCycle[2]=c2;
                this.mCascadeCycle[3]=c3;
                this.mCascadeCycle[4]=c4;
                this.mCascadeCycle[5]=c5;
				this.mUpdate=CUpdate.eType.Updated;
			};

			// Light Type 토글
			div.html.push({"<>":"span","text":"Light Type:"});
			div.html.push({"<>":"select","class":"form-select","id":"ligType_sel"+wtKey,"html":[
				{"<>":"option","value":"direct","text":"Directional","selected":curType=="direct"},
				{"<>":"option","value":"point","text":"Point","selected":curType=="point"},
				{"<>":"option","value":"2ddirect","text":"2D Directional","selected":curType=="2ddirect"},
				{"<>":"option","value":"2dpoint","text":"2D Point","selected":curType=="2dpoint"},
			],"onchange":(e)=>{
				let v=(e.target as HTMLSelectElement).value;
				if(v=="point"||v=="2dpoint")
				{
					CDOM.ID("ligDir_div"+wtKey).hidden=true;
					CDOM.ID("ligPt_div"+wtKey).hidden=false;
					applyPtRadius();
				}
				else
				{
					CDOM.ID("ligDir_div"+wtKey).hidden=false;
					CDOM.ID("ligPt_div"+wtKey).hidden=true;
					this.SetDirect();
				}
			}});

			// Directional 전용 패널
			div.html.push({"<>":"div","id":"ligDir_div"+wtKey,"hidden":isPoint,"html":[
				{"<>":"span","text":"Color:"},
				{"<>":"input","type":"number","id":"ligDirCX_num"+wtKey,"class":"form-control","placeholder":"x","value":this.mColor.x,"onchange":()=>applyDirColor()},
				{"<>":"input","type":"number","id":"ligDirCY_num"+wtKey,"class":"form-control","placeholder":"y","value":this.mColor.y,"onchange":()=>applyDirColor()},
				{"<>":"input","type":"number","id":"ligDirCZ_num"+wtKey,"class":"form-control","placeholder":"z","value":this.mColor.z,"onchange":()=>applyDirColor()},
			]});
			if(curType=="direct" && this.mTexKey!=null)
			{
				div.html.push({"<>":"div","id":"ligCas_div"+wtKey,"html":[
					{"<>":"span","text":"Shadow Cascade Cycle (sec, 0=every frame, -1=off):"},
					{"<>":"input","type":"number","id":"ligCas0_num"+wtKey,"class":"form-control","placeholder":"cas0 sec","value":this.mCascadeCycle[0],"onchange":()=>applyCascade()},
					{"<>":"input","type":"number","id":"ligCas1_num"+wtKey,"class":"form-control","placeholder":"cas1 sec","value":this.mCascadeCycle[1],"onchange":()=>applyCascade()},
					{"<>":"input","type":"number","id":"ligCas2_num"+wtKey,"class":"form-control","placeholder":"cas2 sec","value":this.mCascadeCycle[2],"onchange":()=>applyCascade()},
                    {"<>":"input","type":"number","id":"ligCas3_num"+wtKey,"class":"form-control","placeholder":"cas3 sec","value":this.mCascadeCycle[3],"onchange":()=>applyCascade()},
                    {"<>":"input","type":"number","id":"ligCas4_num"+wtKey,"class":"form-control","placeholder":"cas4 sec","value":this.mCascadeCycle[4],"onchange":()=>applyCascade()},
                    {"<>":"input","type":"number","id":"ligCas5_num"+wtKey,"class":"form-control","placeholder":"cas5 sec","value":this.mCascadeCycle[5],"onchange":()=>applyCascade()},
					{"<>":"span","text":"Texel Threshold:"},
					{"<>":"input","type":"number","id":"ligCasThresh_num"+wtKey,"class":"form-control","placeholder":"threshold","value":this.mCascadeTexelThreshold,"onchange":()=>{
						let th=Number(CDOM.IDValue("ligCasThresh_num"+wtKey));
						this.mCascadeTexelThreshold = (th>=0) ? th : 1.0;
					}},
				]});
			}

			// Point 전용 패널
			div.html.push({"<>":"div","id":"ligPt_div"+wtKey,"hidden":!isPoint,"html":[
				{"<>":"span","text":"Outer:"},
				{"<>":"input","type":"number","id":"ligPtOuter_num"+wtKey,"class":"form-control","placeholder":"outer","value":(isPoint?this.mDirPos.w:1),"onchange":()=>applyPtRadius()},
				{"<>":"span","text":"Inner:"},
				{"<>":"input","type":"number","id":"ligPtInner_num"+wtKey,"class":"form-control","placeholder":"inner","value":this.mColor.w,"onchange":()=>applyPtRadius()},
				{"<>":"span","text":"Color:"},
				{"<>":"input","type":"number","id":"ligPtCX_num"+wtKey,"class":"form-control","placeholder":"x","value":this.mColor.x,"onchange":()=>applyPtColor()},
				{"<>":"input","type":"number","id":"ligPtCY_num"+wtKey,"class":"form-control","placeholder":"y","value":this.mColor.y,"onchange":()=>applyPtColor()},
				{"<>":"input","type":"number","id":"ligPtCZ_num"+wtKey,"class":"form-control","placeholder":"z","value":this.mColor.z,"onchange":()=>applyPtColor()},
			]});

			// Shadow 섹션
			div.html.push({"<>":"hr"});
			div.html.push({"<>":"span","text":"Shadow: "});
			div.html.push({"<>":"button","type":"button","class":"btn btn-primary btn-sm","text":"그림자 적용","onclick":()=>{
				let v=(CDOM.ID("ligType_sel"+wtKey) as HTMLSelectElement).value;
				if(v=="2ddirect"||v=="2dpoint") this.SetShadow2D(this.ObjHash());
				else this.SetShadow3D(this.ObjHash(),0,-1,-1);
				this.EditRefresh();
			}});
			div.html.push({"<>":"button","type":"button","class":"btn btn-danger btn-sm","text":"그림자 제거","onclick":()=>{
				this.RemoveShadow();
				let casDiv=CDOM.ID("ligCas_div"+wtKey);
				if(casDiv!=null) casDiv.hidden=true;
                this.EditRefresh();
			}});

			_body.append(CDOM.DataToDom(div));


		}
		else if(_pointer.member=="mCullMask")
		{
			let ukey=this.ObjHash();
			let maskKeys=CClass.EnumName(CPaint.eCullMask);
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

}