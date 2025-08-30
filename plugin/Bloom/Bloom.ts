

/* 
	전부 임시로 처리해뒀다.
	아주 무제있다.


	rp는 복사되고 자식,컴포넌트는 새로 만들어서 렌더패스쪽 텍스처 꼬임 문제가 생긴다.
	그리고 프리오리티 순서도 다시 정렬해줘야함.
*/

import { CClass } from "../../artgine/basic/CClass.js";
import { CJSON } from "../../artgine/basic/CJSON.js";
import { CObject } from "../../artgine/basic/CObject.js";
import { CPaint2D } from "../../artgine/canvas/component/paint/CPaint2D.js";
import { CPaintSurface } from "../../artgine/canvas/component/paint/CPaintSurface.js";
import { CSurface } from "../../artgine/canvas/subject/CSurface.js";
import { CVec2 } from "../../artgine/geometry/CVec2.js";
import { CRenderPass } from "../../artgine/render/CRenderPass.js";
import { CShaderAttr } from "../../artgine/render/CShaderAttr.js";
import { CTexture, CTextureInfo } from "../../artgine/render/CTexture.js";
import { CFrame } from "../../artgine/util/CFrame.js";

export class CSurfaceDownSample extends CSurface
{
	m_srcSize : CVec2;
	m_mipLevel : number;
	m_threshold : number;
	m_softThreshold : number;

	constructor()
	{
		super();

		this.GetRP().mShader = "PostDownSample";
		this.GetRP().mClearColor = false;
		this.GetRP().mDepthWrite = false;
		this.GetRP().mDepthTest = false;
	}

	SetFrame(_fw: CFrame): void {
		super.SetFrame(_fw);

		if(_fw != null) {
			this.SetShaderAttr();
		}
	}

	ResetTexture(_srcSize : CVec2, _mipLevel : number, _threshold : number, _softThreshold : number) {
		const texSize = new CVec2(_srcSize.x * 0.5, _srcSize.y * 0.5);
		this.NewRT([new CTextureInfo(CTexture.eTarget.Sigle, CTexture.eFormat.RGBA32F)], texSize, true);

		this.m_srcSize = _srcSize;
		this.m_mipLevel = _mipLevel;
		this.m_threshold = _threshold;
		this.m_softThreshold = _softThreshold;

		this.SetShaderAttr();
	}

	SetShaderAttr() {
		//this.GetRP().mShaderAttr.length = 0;

		if(this.GetRP().FindSA("mipLevel")!=null)
		{
			this.GetRP().DeleteSA("mipLevel");
			this.GetRP().DeleteSA("threshold");
			this.GetRP().DeleteSA("softThreshold");	
		}
		
		this.GetRP().mShaderAttr.push(new CShaderAttr("mipLevel", this.m_mipLevel));
		this.GetRP().mShaderAttr.push(new CShaderAttr("threshold", this.m_threshold));
		this.GetRP().mShaderAttr.push(new CShaderAttr("softThreshold", this.m_softThreshold));
	}
}

export class CSurfaceUpSample extends CSurface
{
	m_blendFactor : number;

	constructor()
	{
		super();

		this.GetRP().mShader = "PostUpSample";
		this.GetRP().mDepthWrite = false;
		this.GetRP().mDepthTest = false;
		this.GetRP().mClearColor = false;
	}

	SetFrame(_fw: CFrame): void {
		super.SetFrame(_fw);

		if(_fw != null) {
			this.SetShaderAttr();
		}
	}

	ResetTexture(_rt : string, _blendFactor : number) {
		this.GetRP().mRenderTarget = _rt;

		// this.NewRT([new CTextureInfo(CTexture.eTarget.Sigle, CTexture.eFormat.RGBA32F)], _rtSize, true);

		this.m_blendFactor = _blendFactor;

		this.SetShaderAttr();
	}

	SetShaderAttr() {
		//this.GetRP().mShaderAttr.length = 0;

		if(this.GetRP().FindSA("blendFactor")!=null)
		{
			this.GetRP().DeleteSA("blendFactor");
		}
		
		this.GetRP().mShaderAttr.push(new CShaderAttr("blendFactor", this.m_blendFactor));

		this.GetRP().mBlend = [CRenderPass.eBlend.FUNC_ADD,CRenderPass.eBlend.FUNC_ADD,CRenderPass.eBlend.ONE,CRenderPass.eBlend.ONE,CRenderPass.eBlend.ZERO,CRenderPass.eBlend.ONE];
	}
}


export class CSurfaceBloom extends CSurface
{
	

	/*
		filter type
	*/
	static ePreFilterType = {
		EnergyConserving : 0,
		Additive : 1
	};
	m_preFilterType = CSurfaceBloom.ePreFilterType.EnergyConserving;
	//threshold
	m_threshold : number = 0.0;
	m_softThreshold : number = 0.0;
	
	//params
	m_intensity : number = 0.15;
	m_lowFrequencyBoostCurvation : number = 0.95;
	m_lowFrequencyBoost : number = 0.7;
	m_highPassFrequency : number = 1.0;

	//num of mip
	m_mipMax : number = 6;

	constructor()
	{
		super();
		this.Natural();
		this.Init();
	}

	override IsShould(_member: string, _type: CObject.eShould) 
    {
		let view = [
			"m_threshold", "m_softThreshold", "m_preFilterType", "m_intensity", 
			"m_lowFrequencyBoostCurvation", "m_lowFrequencyBoost", "m_highPassFrequency",
		];
		if(view.includes(_member)) {
			return true;
		}
		return super.IsShould(_member,_type);
	}

	private Init() {		
		const screenSize = new CVec2(1, 1);
		let mipSize : Array<CVec2> = [screenSize];
		let mipTex : Array<string> = [];

		//blit
		// this.GetRP().m_shader = "Pre2Plane";
		this.GetRP().mClearColor = false;
		this.GetRP().mDepthWrite = false;
		this.GetRP().mDepthTest = false;
		this.NewRT([new CTextureInfo(CTexture.eTarget.Sigle, CTexture.eFormat.RGBA32F)], mipSize[0], true);
		mipTex.push(this.mRenderPass.mRenderTarget);

		//downSample
		for(let i = 0; i < this.m_mipMax; i++) {
			mipSize.push(new CVec2(mipSize[i].x * 0.5, mipSize[i].y * 0.5));

			let downSampleSurf = new CSurfaceDownSample();
			downSampleSurf.SetKey("DownSample" + i);
			
			downSampleSurf.ResetTexture(mipSize[i], i, this.m_threshold, this.m_softThreshold);
			downSampleSurf.GetRP().mRenderTarget="DownSample" + i+".tex";
			downSampleSurf.GetRP().mShaderAttr.push(new CShaderAttr(0,mipTex[i]));
			//downSampleSurf.GetPaint().SetTexture(mipTex[i]);
			this.PushChild(downSampleSurf);

			mipTex.push(downSampleSurf.GetTexKey());
		}

		//UpSample
		for(let i = this.m_mipMax; i > 1; i--) {
			let upSampleSurf = new CSurfaceUpSample();
			const texIndex = this.m_mipMax - i;
			upSampleSurf.SetKey("UpSample" + texIndex);
			upSampleSurf.ResetTexture(mipTex[i - 1], this.GetBlendFactor(i, this.m_mipMax));
			//upSampleSurf.mRenderPass.mRenderTarget="UpSample" + i+".tex";
			//upSampleSurf.GetRP().mRenderTarget="UpSample" + i+".tex";
			upSampleSurf.GetRP().mShaderAttr.push(new CShaderAttr(0,mipTex[i]));
			//upSampleSurf.GetPaint().SetTexture(mipTex[i]);
			this.PushChild(upSampleSurf);
		}

		let upSampleSurf = new CSurfaceUpSample();
		upSampleSurf.SetKey("UpSample" + (this.m_mipMax - 1));
		upSampleSurf.ResetTexture(mipTex[0], this.GetBlendFactor(0, this.m_mipMax));
		//upSampleSurf.mRenderPass.mRenderTarget="UpSample.tex";
		upSampleSurf.GetPaint().SetTexture(mipTex[1]);
		this.PushChild(upSampleSurf);
	}
	GetTexKey()
	{
		return (this.mChild[this.mChild.length-1] as CSurface).GetTexKey();
	}

	GetDownSample(_index : number) {
		return this.FindChild("DownSample" + _index) as CSurfaceDownSample;
	}

	GetUpSample(_index : number) {
		const texIndex = this.m_mipMax - _index;
		return this.FindChild("UpSample" + _index) as CSurfaceUpSample;
	}

	//이거 사용하려면 blend 패스 추가하거나 gl.BlendColor 사용할 수 있게 변경해야 함
	private GetBlendFactor(_mip : number, _maxMip : number) {
		const clamp = (_val : number, _min : number, _max : number) => {
			return Math.min(Math.max(_val, _min), _max);
		};
		const mipRatio = _mip / _maxMip;		
		let lf_boost = (1.0 
			- Math.pow(1.0 - mipRatio, 1.0 / (1.0 - this.m_lowFrequencyBoostCurvation))) * this.m_lowFrequencyBoost;
		let hp_lq = 1.0 
			- clamp((mipRatio - this.m_highPassFrequency) / this.m_highPassFrequency, 0.0, 1.0);
		lf_boost *= this.m_preFilterType == CSurfaceBloom.ePreFilterType.EnergyConserving? 1.0 - this.m_intensity : 1.0;
		
		// 블룸이 더 멀리 퍼지도록 추가 부스트 적용
		const distanceBoost = Math.pow(mipRatio, 0.5); // 거리에 따른 추가 부스트
		return (this.m_intensity + lf_boost * distanceBoost) * hp_lq;
	}

	Natural()
	{
		this.m_intensity = 0.15;
		this.m_threshold = 0.0;
		this.m_softThreshold = 0.0;
		this.m_lowFrequencyBoost = 0.7;
		this.m_lowFrequencyBoostCurvation = 0.95;
		this.m_highPassFrequency = 1.0;
		this.EnergyConserving();
	}

	OldSchool()
	{
		this.m_intensity = 0.05;
		this.m_threshold = 0.6;
		this.m_softThreshold = 0.2;
		this.m_lowFrequencyBoost = 0.7;
		this.m_lowFrequencyBoostCurvation = 0.95;
		this.m_highPassFrequency = 1.0;
		this.Additive();
	}

	ScreenBlur()
	{
		this.m_intensity = 1.0;
		this.m_threshold = 0.0;
		this.m_softThreshold = 0.0;
		this.m_lowFrequencyBoost = 0.0;
		this.m_lowFrequencyBoostCurvation = 0.0;
		this.m_highPassFrequency = 1.0 / 3.0;
		this.EnergyConserving();
	}

	EnergyConserving()
	{
		this.m_preFilterType = CSurfaceBloom.ePreFilterType.EnergyConserving;
		this.Refresh();
	}

	Additive()
	{
		this.m_preFilterType = CSurfaceBloom.ePreFilterType.Additive;
		this.Refresh();
	}

	Refresh()
	{
		if(this.mChild.length == 0) {
			return;
		}
		let mipTex : Array<string> = [];
		mipTex.push(this.mRenderPass.mRenderTarget);
		
		//downSample
		let pri=this.mRenderPass.mPriority;
		pri++;
		for(let i = 0; i < this.m_mipMax; i++) {
			const downSample = this.GetDownSample(i);
			downSample.m_threshold = this.m_threshold;
			downSample.m_softThreshold = this.m_softThreshold;
			downSample.GetRP().mShaderAttr.length=0;
			downSample.GetRP().mShaderAttr.push(new CShaderAttr(0,mipTex[i]));
			downSample.SetShaderAttr();
			downSample.GetRP().mPriority=pri;
			pri++;
			mipTex.push(downSample.GetTexKey());
			
		}

		//upSample
		for(let i = 0; i < this.m_mipMax; i++) {
			const upSample = this.GetUpSample(i);
			//const texIndex = this.m_mipMax - i;
			upSample.GetRP().mPriority=pri;
			pri++;
			upSample.m_blendFactor = this.GetBlendFactor(i, this.m_mipMax);
			upSample.SetShaderAttr();
		}

		(this.mChild[this.mChild.length-1] as CSurfaceUpSample).GetPaint().SetTexture(mipTex[1]);
		(this.mChild[this.mChild.length-1] as CSurfaceUpSample).GetRP().mRenderTarget=mipTex[0];
	}
	Update(_delay: number): void {
		// srcResolution과 aspect는 더 이상 필요하지 않음
		// Sam2DSize(0.0)를 사용하여 쉐이더 내에서 동적으로 텍스처 크기를 가져옴
	}
	public Export(_copy?: boolean, _resetKey?: boolean): this {
		const watch = super.Export(_copy, _resetKey);
		watch.Refresh();
		return watch;
	}
	ImportCJSON(_json: CJSON)
    {
		const watch = super.ImportCJSON(_json);
		watch.Refresh();
		return watch as this;
	}
}

CClass.Push(CSurfaceDownSample);
CClass.Push(CSurfaceUpSample);
CClass.Push(CSurfaceBloom);