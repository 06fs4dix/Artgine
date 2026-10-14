

/* 
	전부 임시로 처리해뒀다.
	아주 무제있다.


	rp는 복사되고 자식,컴포넌트는 새로 만들어서 렌더패스쪽 텍스처 꼬임 문제가 생긴다.
	그리고 프리오리티 순서도 다시 정렬해줘야함.
*/

import { CSurface } from "../../artgine/app/subject/CSurface.js";
import { CUpdate } from "../../artgine/basic/Basic.js";
import { CClass } from "../../artgine/basic/CClass.js";
import { CJSON } from "../../artgine/basic/CJSON.js";
import { CObject, CPointer } from "../../artgine/basic/CObject.js";

import { CVec2 } from "../../artgine/geometry/CVec2.js";
import { CRenderPass } from "../../artgine/render/CRenderPass.js";
import { CShaderAttr } from "../../artgine/render/CShaderAttr.js";
import { CTexture, CTextureInfo } from "../../artgine/render/CTexture.js";
import { CFrame } from "../../artgine/util/CFrame.js";
import { CRPAuto, CRPMgr } from "../../artgine/app/canvas/CRPMgr.js";
import { CCondition } from "../../artgine/util/CCondition.js";
import { CPaint } from "../../artgine/app/component/paint/CPaint.js";
import { CVec1 } from "../../artgine/geometry/CVec1.js";
import { CVec4 } from "../../artgine/geometry/CVec4.js";
import { SDF } from "../../artgine/z_file/SDF.js";

export class CSurfaceDownSample extends CSurface
{
	m_srcSize : CVec2;
	m_mipLevel : number;
	m_threshold : number;
	m_softThreshold : number;

	constructor()
	{
		super();

		this.GetRP().mShader = "Artgine/Shader/PostDownSample";
		this.GetRP().mClearColor = false;
		this.GetRP().mDepthWrite = false;
		this.GetRP().mDepthTest = false;
	}

	override SetFrame(_fw: CFrame): void {
		super.SetFrame(_fw);

		if(_fw != null) {
            if(this.mRenderPass.mShader=="Artgine/Shader/PostDownSample") {
				this.mRenderPass.mShader=_fw.Pal().SlPost().Key();
                this.mRenderPass.mTag.clear();
                this.mRenderPass.mTag.add("sample");
                this.mRenderPass.mTag.add("down");
            }
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

		this.GetRP().mShader = "Artgine/Shader/PostUpSample";
		this.GetRP().mDepthWrite = false;
		this.GetRP().mDepthTest = false;
		this.GetRP().mClearColor = false;
	}

	override SetFrame(_fw: CFrame): void {
		super.SetFrame(_fw);

		if(_fw != null) {
            if(this.mRenderPass.mShader=="Artgine/Shader/PostUpSample") {
				this.mRenderPass.mShader=_fw.Pal().SlPost().Key();
                this.mRenderPass.mTag.clear();
                this.mRenderPass.mTag.add("sample");
                this.mRenderPass.mTag.add("up");
            }
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

		this.GetRP().mBlend = [CRenderPass.eBlend.FUNC_ADD,CRenderPass.eBlend.FUNC_ADD,CRenderPass.eBlend.ONE,CRenderPass.eBlend.ONE,CRenderPass.eBlend.ONE,CRenderPass.eBlend.ONE];
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
	m_threshold : number = 0.0;//이 값보다 어두운 픽셀은 블룸 입력에서 배제
	m_softThreshold : number = 0.0;//임계 부근이 점진적으로 섞여 더 자연스러운 하이라이트 선택
	
	//params
	m_intensity : number = 0.15;//업샘플 합성의 기본 강도
	m_lowFrequencyBoostCurvation : number = 0.95;//멀리 퍼지는 긴 꼬리
	m_lowFrequencyBoost : number = 0.7;//값을 올리면 멀리 퍼져 보이는 느낌이 커짐.
	m_highPassFrequency : number = 1.0;

	//num of mip
	m_mipMax : number = 6;//클수록 이론상 더 멀리 퍼지는 블러 반경

	constructor()
	{
		super();
		this.Natural();
		this.Init();
		this.mSave=false;
		//this.mTexCreate=false;
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
		const mipSize : Array<CVec2> = [screenSize];
		const mipTex : Array<string> = [];

		//blit
		this.GetRP().mClearColor = false;
		this.GetRP().mDepthWrite = false;
		this.GetRP().mDepthTest = false;
		this.mTexKey="Bloom/Main.tex";
		this.NewRT([new CTextureInfo(CTexture.eTarget.Sigle, CTexture.eFormat.RGBA32F)], mipSize[0], true);
		mipTex.push(this.mRenderPass.mRenderTarget);

		//downSample
		for(let i = 0; i < this.m_mipMax; i++) {
			mipSize.push(new CVec2(mipSize[i].x * 0.5, mipSize[i].y * 0.5));

			const downSampleSurf = this.PushChild(new CSurfaceDownSample());
			downSampleSurf.mTexKey="Bloom/"+"DownSample" + i+".tex";
			downSampleSurf.SetKey("DownSample" + i);
			downSampleSurf.ResetTexture(mipSize[i], i, this.m_threshold, this.m_softThreshold);
			downSampleSurf.GetRP().mRenderTarget=downSampleSurf.GetTexKey();
			downSampleSurf.GetRP().mShaderAttr.push(new CShaderAttr(0,mipTex[i]));
			
			mipTex.push(downSampleSurf.GetTexKey());
		}

		//UpSample
		for(let i = this.m_mipMax; i > 1; i--) {
			const upSampleSurf = this.PushChild(new CSurfaceUpSample());
			upSampleSurf.SetKey("UpSample" + (this.m_mipMax - i));
			upSampleSurf.mTexKey="Bloom/"+"UpSample" + i + ".tex";
			upSampleSurf.ResetTexture(mipTex[i - 1], this.GetBlendFactor(i, this.m_mipMax));
			upSampleSurf.GetRP().mShaderAttr.push(new CShaderAttr(0, mipTex[i]));
		}

		const upSampleSurf = this.PushChild(new CSurfaceUpSample());
		upSampleSurf.SetKey("UpSample" + (this.m_mipMax - 1));
		upSampleSurf.mTexKey="Bloom/"+"UpSample1.tex";
		upSampleSurf.ResetTexture(mipTex[0], this.GetBlendFactor(1, this.m_mipMax));
		upSampleSurf.mTexCreate=false;
        upSampleSurf.GetRP().mShaderAttr.push(new CShaderAttr(0, mipTex[1]));
		
	}
	override GetTexKey()
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
			upSample.m_blendFactor = this.GetBlendFactor(this.m_mipMax - i, this.m_mipMax);
			upSample.SetShaderAttr();
		}

		(this.mChild[this.mChild.length-1] as CSurfaceUpSample).GetPaint().SetTexture(mipTex[1]);
		(this.mChild[this.mChild.length-1] as CSurfaceUpSample).GetRP().mRenderTarget=mipTex[0];
	}
	override EditChange(_pointer: CPointer, _child: boolean): void {
		super.EditChange(_pointer,_child);
		if(_child==true)	return;
		
		// let ptArr=this.FindComps(CPaint,true);
		// for(let pt of ptArr)
		// {
		// 	pt.ClearCRPAuto();
		// }
		this.Refresh();
		let msg=this.NewOutMsg("ClearBatch");
		msg.mInter="canvas";

		
	}
	override Export(_copy?: boolean, _resetKey?: boolean): this {
		const watch = super.Export(_copy, _resetKey);
		watch.Refresh();
		return watch;
	}
	override ImportCJSON(_json: CJSON)
    {
		const watch = super.ImportCJSON(_json);
		watch.Refresh();
		return watch as this;
	}
}

export type BloomOption = {
	classes? : Array<string>,
	tag? : string,
	preset? : "Glow" | "Natural" | "OldSchool" | "ScreenBlur",
	intensity? : number,
	threshold? : number,
	softThreshold? : number,
	lowFrequencyBoost? : number,
	lowFrequencyBoostCurvation? : number,
	highPassFrequency? : number,
};

export class CRPMgrBloom extends CRPMgr
{
	static Tag(_pt : CPaint, _mask : number = 1, _tag : string = "bloom")
	{
		_pt.PushTag(_tag);
		_pt.PushCShaderAttr(new CShaderAttr("mask", new CVec1(_mask)));
	}

	// 합성이 MainFrameTex를 읽어 기본 프레임버퍼로 내보내므로 이후 Ui 우선순위 패스는 화면에 나오지 않는다
	static Append(_rpm : CRPMgr, _opt : BloomOption & { emissiveTo? : CRPMgr } = {})
	{
		const pal = CFrame.Main().Pal();
		const emissiveKey = CRPMgrBloom.PushEmissive(_opt.emissiveTo ?? _rpm, _opt);
		const bloom = CRPMgrBloom.PushBloom(_rpm, emissiveKey, _opt);

		const last = _rpm.PushSuf(new CSurface());
		const lrp = last.GetRP();
		lrp.mRenderTarget = pal.GetDefaultFrameBuffer();
		CRPMgrBloom.SetBlend(lrp, pal.GetMainFrameTex(), bloom.GetTexKey());
		return bloom;
	}

	// CCanvasPluginRPMgr는 서피스를 Export 복사해서 캔버스에 넣으므로 블룸 파라미터는 부착 전에 확정해야 한다
	constructor(_opt : BloomOption = {})
	{
		super();
		// CClass.New 역직렬화 경로에서는 프레임이 없을 수 있다
		if(CFrame.Main() == null)	return;

		const pal = CFrame.Main().Pal();
		const emissiveKey = CRPMgrBloom.PushEmissive(this, _opt);

		// 캔버스 RP가 하나라도 붙으면 기본 Forward_2D(mRenderPass.length==0)에서 빠지므로 일반 패스를 대신 넣는다
		const basicTex = new CTexture();
		basicTex.PushInfo([new CTextureInfo(CTexture.eTarget.Sigle, CTexture.eFormat.RGBA8, 1)]);
		const basicKey = this.PushTex("Bloom/basicTex.tex", basicTex);
		const rp = this.PushRP(new CRPAuto());
		for(const cls of _opt.classes ?? ["CPaint2D"])	rp.PushOr(new CCondition("class", "==", cls));
		rp.mShader = pal.Sl2DKey();
		rp.mCullFace = CRenderPass.eCull.None;
		rp.mRenderTarget = basicKey;
		rp.mShaderAttr.push(new CShaderAttr(SDF.eTexSlot.SingleShadowRead, pal.GetShadowReadTex()));

		const bloom = CRPMgrBloom.PushBloom(this, emissiveKey, _opt);

		// 기본 프레임버퍼가 아닌 MainFrameTex에 써야 이후 Ui 우선순위 패스가 위에 그려지고 자동 블릿이 유지된다
		const last = this.PushSuf(new CSurface());
		last.SetUseRT(false);
		CRPMgrBloom.SetBlend(last.GetRP(), basicKey, bloom.GetTexKey());
	}

	private static PushEmissive(_rpm : CRPMgr, _opt : BloomOption)
	{
		const emissiveTex = new CTexture();
		emissiveTex.PushInfo([new CTextureInfo(CTexture.eTarget.Sigle, CTexture.eFormat.RGBA8, 1)]);
		const emissiveKey = _rpm.PushTex("Bloom/emissiveTex.tex", emissiveTex);
		const rp = _rpm.PushRP(new CRPAuto());
		for(const cls of _opt.classes ?? ["CPaint2D"])	rp.PushOr(new CCondition("class", "==", cls));
		rp.PushAnd(new CCondition("mTag[" + (_opt.tag ?? "bloom") + "]"));
		rp.mShader = CFrame.Main().Pal().Sl2DKey();
		rp.mCullFace = CRenderPass.eCull.None;
		rp.mRenderTarget = emissiveKey;
		rp.mTag.add("mask");
		return emissiveKey;
	}

	private static PushBloom(_rpm : CRPMgr, _emissiveKey : string, _opt : BloomOption)
	{
		const bloom = _rpm.PushSuf(new CSurfaceBloom()) as CSurfaceBloom;
		const brp = bloom.GetRP();
		brp.mShader = CFrame.Main().Pal().Sl2DKey();
		brp.mTag.add("blit");
		brp.mShaderAttr.push(new CShaderAttr(0, _emissiveKey));
		const preset = _opt.preset ?? "Glow";
		if(preset == "OldSchool")	bloom.OldSchool();
		else if(preset == "ScreenBlur")	bloom.ScreenBlur();
		else if(preset == "Glow")
		{
			// 발광 텍스처에는 태그된 페인트만 있으므로 임계값 없이 전부 받고, 이 값보다 강하면 작은 발광체도 화면 절반이 하얗게 날아간다
			bloom.OldSchool();
			bloom.m_threshold = 0;
			bloom.m_softThreshold = 0;
			bloom.m_intensity = 0.2;
			bloom.m_lowFrequencyBoost = 1.6;
		}
		if(_opt.intensity != null)	bloom.m_intensity = _opt.intensity;
		if(_opt.threshold != null)	bloom.m_threshold = _opt.threshold;
		if(_opt.softThreshold != null)	bloom.m_softThreshold = _opt.softThreshold;
		if(_opt.lowFrequencyBoost != null)	bloom.m_lowFrequencyBoost = _opt.lowFrequencyBoost;
		if(_opt.lowFrequencyBoostCurvation != null)	bloom.m_lowFrequencyBoostCurvation = _opt.lowFrequencyBoostCurvation;
		if(_opt.highPassFrequency != null)	bloom.m_highPassFrequency = _opt.highPassFrequency;
		bloom.Refresh();
		return bloom;
	}

	private static SetBlend(_rp : CRenderPass, _baseKey : string, _bloomKey : string)
	{
		_rp.mShader = CFrame.Main().Pal().SlPostKey();
		_rp.mTag.add("blend");
		_rp.mShaderAttr.push(new CShaderAttr(0, _baseKey));
		_rp.mShaderAttr.push(new CShaderAttr(1, _bloomKey));
		_rp.mShaderAttr.push(new CShaderAttr("BlendColor0", new CVec4(SDF.eBlend.Texture, 0)));
		_rp.mShaderAttr.push(new CShaderAttr("BlendColor1", new CVec4(SDF.eBlend.Texture, 1)));
		_rp.mShaderAttr.push(new CShaderAttr("BlendColor2", new CVec4(SDF.eBlend.LinearDodge, 0, 1, 1)));
	}
}

CClass.Push(CSurfaceDownSample);
CClass.Push(CSurfaceUpSample);
CClass.Push(CSurfaceBloom);
CClass.Push(CRPMgrBloom);