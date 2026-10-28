import { CSurface } from "../../artgine/app/subject/CSurface.js";
import { CClass } from "../../artgine/basic/CClass.js";
import { CJSON } from "../../artgine/basic/CJSON.js";
import { CObject, CPointer } from "../../artgine/basic/CObject.js";
import { CUtilObj } from "../../artgine/basic/CUtilObj.js";
import { CVec2 } from "../../artgine/geometry/CVec2.js";
import { CRenderPass } from "../../artgine/render/CRenderPass.js";
import { CShaderAttr } from "../../artgine/render/CShaderAttr.js";
import { CTexture, CTextureInfo } from "../../artgine/render/CTexture.js";
import { CFrame } from "../../artgine/util/CFrame.js";
import { CRPMgr } from "../../artgine/app/canvas/CRPMgr.js";
import { CPaint } from "../../artgine/app/component/paint/CPaint.js";
import { CVec1 } from "../../artgine/geometry/CVec1.js";
import { CVec4 } from "../../artgine/geometry/CVec4.js";
import { SDF } from "../../artgine/z_file/SDF.js";
import { CPlugin } from "../../artgine/util/CPlugin.js";
import { CEvent } from "../../artgine/basic/CEvent.js";
import { CMath } from "../../artgine/geometry/CMath.js";
import { CUpdate } from "../../artgine/basic/Basic.js";

let gBloomShader = "";
CPlugin.PushEvent(CEvent.eType.Load, () => {
	gBloomShader = CPlugin.FindPath("Bloom") + "BloomShader.ts";
	CFrame.Main().Load().Exe(gBloomShader);
});

export class CSurfaceBloom extends CSurface
{
	static ePreFilterType = {
		EnergyConserving : 0,
		Additive : 1
	};
	m_preFilterType = CSurfaceBloom.ePreFilterType.Additive;

	// 임계값 방식 : threshold ~ soft threshold 사이의 값은 블룸이 점차 처리되지 않게 됨
	// 즉, soft threshold보다 높은 값은 전체가 블룸처리, threshold보다 낮은 값은 전체가 검은색으로 나옴
	m_threshold : number = 0.0;
	m_softThreshold : number = 0.0;

	//params
	m_intensity : number = 0.15;//업샘플 합성의 기본 강도
	m_lowFrequencyBoostCurvation : number = 0.95;//멀리 퍼지는 긴 꼬리
	m_lowFrequencyBoost : number = 2.0;//값을 올리면 멀리 퍼져 보이는 느낌이 커짐.
	m_highPassFrequency : number = 1.0;

	override IsShould(_member: string, _type: CObject.eShould) 
    {
		let view = [
			"m_preFilterType", "m_threshold", "m_softThreshold", "m_intensity",
			"m_lowFrequencyBoostCurvation", "m_lowFrequencyBoost", "m_highPassFrequency",
		];
		if(view.includes(_member)) {
			return true;
		}
		return super.IsShould(_member,_type);
	}

	override Start(): void {
		super.Start();
		this.GetRP().mEnable.v = false;
		this.GetRP().mClearColor = false;
		this.GetRP().mClearDepth = false;
		this.GetRP().mDepthWrite = false;
		this.GetRP().mDepthTest = false;
		this.GetRP().mBlend = [CRenderPass.eBlend.FUNC_ADD,CRenderPass.eBlend.FUNC_ADD,CRenderPass.eBlend.ONE,CRenderPass.eBlend.ONE,CRenderPass.eBlend.ONE,CRenderPass.eBlend.ONE];

		const mipSize : Array<CVec2> = [
			new CVec2(1/2, 1/2), new CVec2(1/4, 1/4), new CVec2(1/8, 1/8), 
			new CVec2(1/16, 1/16), new CVec2(1/32, 1/32), new CVec2(1/64, 1/64)
		];
		const mipTex : Array<string> = [
			`Bloom/${this.ObjHash()}/DownSample0.tex`, `Bloom/${this.ObjHash()}/DownSample1.tex`, `Bloom/${this.ObjHash()}/DownSample2.tex`,
			`Bloom/${this.ObjHash()}/DownSample3.tex`, `Bloom/${this.ObjHash()}/DownSample4.tex`, `Bloom/${this.ObjHash()}/DownSample5.tex`
		];

		//텍스처 어트리뷰트는 mType==-2, mEach==슬롯 번호, mKey==텍스처 키
		const inputTex = this.GetRP().mShaderAttr.find(_sa => _sa.mType == -2 && _sa.mEach == 0)?.mKey ?? this.GetTexKey();

		//downSample
		for(let i = 0; i < 6; i++) {
			const downSampleSurf = this.PushChild(new CSurface());
			downSampleSurf.SetKey("DownSample" + i);
			downSampleSurf.mTexKey=mipTex[i];
			downSampleSurf.NewRT([new CTextureInfo(CTexture.eTarget.Sigle, CTexture.eFormat.RGBA8)], mipSize[i], true);

			downSampleSurf.GetRP().mShader = gBloomShader;
			downSampleSurf.GetRP().mClearColor = false;
			downSampleSurf.GetRP().mClearDepth = false;
			downSampleSurf.GetRP().mDepthWrite = false;
			downSampleSurf.GetRP().mDepthTest = false;

			downSampleSurf.GetPaint().PushTag("down");
			downSampleSurf.GetPaint().PushCShaderAttr(new CShaderAttr("mipLevel", i));
			downSampleSurf.GetPaint().PushCShaderAttr(new CShaderAttr("threshold", this.m_threshold));
			downSampleSurf.GetPaint().PushCShaderAttr(new CShaderAttr("softThreshold", this.m_softThreshold));

			if(i >= 1) downSampleSurf.GetPaint().PushCShaderAttr(new CShaderAttr(0, mipTex[i - 1]));
			else downSampleSurf.GetPaint().PushCShaderAttr(new CShaderAttr(0, inputTex));
			downSampleSurf.Start();
		}

		//UpSample
		for(let i = 5; i >= 0; i--) {
			const upSampleSurf = this.PushChild(new CSurface());
			upSampleSurf.SetKey("UpSample" + i);
			if(i >= 1) upSampleSurf.mTexKey=mipTex[i - 1];
			else upSampleSurf.mTexKey=this.GetTexKey();

			upSampleSurf.GetRP().mShader = gBloomShader;
			upSampleSurf.GetRP().mClearColor = false;
			upSampleSurf.GetRP().mClearDepth = false;
			upSampleSurf.GetRP().mDepthWrite = false;
			upSampleSurf.GetRP().mDepthTest = false;
			upSampleSurf.GetRP().mBlend = [CRenderPass.eBlend.FUNC_ADD,CRenderPass.eBlend.FUNC_ADD,CRenderPass.eBlend.ONE,CRenderPass.eBlend.ONE,CRenderPass.eBlend.ONE,CRenderPass.eBlend.ONE];

			upSampleSurf.GetPaint().PushTag("up");
			upSampleSurf.GetPaint().PushCShaderAttr(new CShaderAttr("blendFactor", this.GetBlendFactor(i)));
			upSampleSurf.GetPaint().PushCShaderAttr(new CShaderAttr(0, mipTex[i]));
			upSampleSurf.Start();
		}

		this.Refresh();
	}

	override Destroy(): void {
		const mipTex : Array<string> = [
			`Bloom/${this.ObjHash()}/DownSample0.tex`, `Bloom/${this.ObjHash()}/DownSample1.tex`, `Bloom/${this.ObjHash()}/DownSample2.tex`,
			`Bloom/${this.ObjHash()}/DownSample3.tex`, `Bloom/${this.ObjHash()}/DownSample4.tex`, `Bloom/${this.ObjHash()}/DownSample5.tex`
		];
		for(let i = 0; i < 6; i++) {
			const tex = this.GetFrame().Res().Find(mipTex[i]);
			this.GetFrame().Ren().ReleaseTexture(tex);
			this.GetFrame().Res().Remove(mipTex[i]);
		}
		super.Destroy();
	}

	GetDownSample(_index : number) {
		return this.FindChild("DownSample" + _index) as CSurface;
	}
	GetUpSample(_index : number) {
		return this.FindChild("UpSample" + _index) as CSurface;
	}

	private GetBlendFactor(_mip : number) {
		const mipDepth = Math.max(1, _mip) / 6;	// 0이 되면 밝기 전송이 안됨

		const tailCurve = 1.0 - Math.pow(1.0 - mipDepth, 1.0 / (1.0 - this.m_lowFrequencyBoostCurvation));
		const energyScale = this.m_preFilterType == CSurfaceBloom.ePreFilterType.EnergyConserving ? 1.0 - this.m_intensity : 1.0;
		const depthScale = Math.pow(mipDepth, 0.5);
		const tailStrength = tailCurve * this.m_lowFrequencyBoost * energyScale * depthScale;

		const highPassFade = 1.0 - CMath.Clamp((mipDepth - this.m_highPassFrequency) / this.m_highPassFrequency, 0.0, 1.0);

		return (this.m_intensity + tailStrength) * highPassFade;
	}

	Natural() {
		this.m_intensity = 1.0;
		this.m_threshold = 0.0;
		this.m_softThreshold = 0.0;
		this.m_lowFrequencyBoost = 1.1;
		this.m_lowFrequencyBoostCurvation = 0.6;
		this.m_highPassFrequency = 0.55;
		this.EnergyConserving();
	}
	OldSchool() {
		this.m_intensity = 2.2;
		this.m_threshold = 0.08;
		this.m_softThreshold = 0.5;
		this.m_lowFrequencyBoost = 0.0;
		this.m_lowFrequencyBoostCurvation = 0.95;
		this.m_highPassFrequency = 0.2;
		this.Additive();
	}
	ScreenBlur() {
		this.m_intensity = 0.05;
		this.m_threshold = 0.0;
		this.m_softThreshold = 0.0;
		this.m_lowFrequencyBoost = 3.3;
		this.m_lowFrequencyBoostCurvation = 0.95;
		this.m_highPassFrequency = 0.55;
		this.EnergyConserving();
	}
	// 발광 텍스처에는 발광 오브젝트만 있으므로 임계값 없이 전부 받고, 이 값보다 강하면 작은 발광체도 화면 절반이 하얗게 날아간다
	Glow() {
		this.m_intensity = 0.85;
		this.m_threshold = 0;
		this.m_softThreshold = 0;
		this.m_lowFrequencyBoost = 1.5;
		this.m_lowFrequencyBoostCurvation = 0.95;
		this.m_highPassFrequency = 0.4;
		this.Additive();
	}

	EnergyConserving() {
		this.m_preFilterType = CSurfaceBloom.ePreFilterType.EnergyConserving;
		this.Refresh();
	}
	Additive() {
		this.m_preFilterType = CSurfaceBloom.ePreFilterType.Additive;
		this.Refresh();
	}

	Refresh() {
		if(this.mChild.length == 0) return;
		for(let i = 0; i < 6; i++) {
			const paint = this.GetDownSample(i).GetPaint();
			paint.PushCShaderAttr(new CShaderAttr("mipLevel", i));
			paint.PushCShaderAttr(new CShaderAttr("threshold", this.m_threshold));
			paint.PushCShaderAttr(new CShaderAttr("softThreshold", this.m_softThreshold));
			this.GetUpSample(i).GetPaint().PushCShaderAttr(new CShaderAttr("blendFactor", this.GetBlendFactor(i)));
		}
	}

	override EditForm(_pointer: CPointer, _body: HTMLDivElement, _input: HTMLElement): void {
		super.EditForm(_pointer, _body, _input);
		if(_pointer.member != "m_preFilterType" || _input == null)	return;

		_body.append(CUtilObj.Select(_pointer, _input, ["EnergyConserving", "Additive"],
			[CSurfaceBloom.ePreFilterType.EnergyConserving, CSurfaceBloom.ePreFilterType.Additive], true));

		const presets : Array<[string, () => void]> = [
			["Natural", () => this.Natural()], ["OldSchool", () => this.OldSchool()],
			["ScreenBlur", () => this.ScreenBlur()], ["Glow", () => this.Glow()],
		];
		const row = document.createElement("div");
		row.className = "mt-1";
		for(const [name, apply] of presets) {
			const btn = document.createElement("button");
			btn.className = "btn btn-sm btn-outline-secondary me-1";
			btn.innerText = name;
			btn.onclick = () => {
				apply();
				this.EditRefresh();
				this.EditChange(_pointer, false);
			};
			row.append(btn);
		}
		_body.append(row);
	}
	override EditChange(_pointer: CPointer, _child: boolean): void {
		super.EditChange(_pointer,_child);
		if(_child==true)	return;
		this.Refresh();
		const msg=this.NewOutMsg("ClearBatch");
		msg.mInter="canvas";
	}
	override Export(_copy?: boolean, _resetKey?: boolean): this {
		const watch = super.Export(_copy, _resetKey);
		for(const child of watch.mChild) child.Destroy();
		watch.mChild.length = 0;
		return watch;
	}
	override ImportCJSON(_json: CJSON) {
		const watch = super.ImportCJSON(_json);
		watch.Refresh();
		return watch as this;
	}
}

export type BloomOption = {
	preset? : "Glow" | "Natural" | "OldSchool" | "ScreenBlur",
	intensity? : number,
	threshold? : number,
	softThreshold? : number,
	lowFrequencyBoost? : number,
	lowFrequencyBoostCurvation? : number,
	highPassFrequency? : number,
	input? : string,
	output? : string,
};

// 생성만 하면 Emission 텍스처(3D CBrush Emission 패스, 2D "bloom" 태그 페인트)를 번지게 해 MainFrameTex에 가산한다
export class CRPMgrBloom extends CRPMgr
{
	// CCanvasPluginRPMgr는 서피스를 Export 복사해서 캔버스에 넣으므로 블룸 파라미터는 부착 전에 확정해야 한다
	constructor(_opt : BloomOption = {})
	{
		super();
		// CClass.New 역직렬화 경로에서는 프레임이 없을 수 있다
		if(CFrame.Main() == null)	return;

		const pal = CFrame.Main().Pal();
		const outKey = _opt.output ?? pal.GetMainFrameTex();
		const bloom = this.PushSuf(new CSurfaceBloom());
		bloom.mTexKey = outKey;
		bloom.mTexInfo = [new CTextureInfo(CTexture.eTarget.Sigle, CTexture.eFormat.RGBA8)];
		const brp = bloom.GetRP();
		brp.mRenderTarget = outKey;
		brp.mShader = pal.Sl2DKey();
		brp.mTag.add("blit");
		brp.mShaderAttr.push(new CShaderAttr(0, _opt.input ?? pal.GetEmissionTex()));
		const preset = _opt.preset ?? "Glow";
		if(preset == "OldSchool")	bloom.OldSchool();
		else if(preset == "ScreenBlur")	bloom.ScreenBlur();
		else if(preset == "Natural")	bloom.Natural();
		else if(preset == "Glow")	bloom.Glow();
		if(_opt.intensity != null)	bloom.m_intensity = _opt.intensity;
		if(_opt.threshold != null)	bloom.m_threshold = _opt.threshold;
		if(_opt.softThreshold != null)	bloom.m_softThreshold = _opt.softThreshold;
		if(_opt.lowFrequencyBoost != null)	bloom.m_lowFrequencyBoost = _opt.lowFrequencyBoost;
		if(_opt.lowFrequencyBoostCurvation != null)	bloom.m_lowFrequencyBoostCurvation = _opt.lowFrequencyBoostCurvation;
		if(_opt.highPassFrequency != null)	bloom.m_highPassFrequency = _opt.highPassFrequency;
		bloom.Refresh();
	}

	GetBloom()
	{
		return this.mSufArr.find(_suf => _suf instanceof CSurfaceBloom) as CSurfaceBloom;
	}

	// 블룸 입력 텍스처를 바꾼다
	SetInput(_key : string)
	{
		const attr = this.GetBloom().GetRP().mShaderAttr.find(_sa => _sa.mType == -2 && _sa.mEach == 0);
		attr.mKey = _key;
		this.mUpdate = CUpdate.eType.Updated;
	}
	// 블룸 출력을 MainFrameTex 대신 다른 텍스처로 바꾼다 (""이면 화면에 바로 그린다)
	SetOutput(_key : string)
	{
		const bloom = this.GetBloom();
		bloom.mTexKey = _key;
		bloom.GetRP().mRenderTarget = _key;
		this.mUpdate = CUpdate.eType.Updated;
	}
}

CClass.Push(CSurfaceBloom);
CClass.Push(CRPMgrBloom);