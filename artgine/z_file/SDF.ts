export class SDF {
    
	static eLightStep0=
	{
		None:0,
		Distance:1,
		Lambert:2,
		HafeLambert:3,
	}
	
	static eLightStep1=
	{
		None:0,
		Phong:1,
		BlinnPhong:2,
		CookTorrance:3,
	}
	static eLightStep2=
	{
		None:0,
		Emissive:1,
	}
	static eLightStep3=
	{
		None:0,
		Rim:1,
	}
	static eShadow=
	{
		Cas0:0,
		Cas1:1,
		Cas2:2,
		Near:3,
		Far:4,
		Top:5,
		Bottom:6,
		Left:7,
		Right:8,
	}

	static eGBuf=
	{
		Position : 0,
		Normal : 1,
		Albedo : 2,
		Ambient : 4,
		SpeculerPowEmissive : 5,
	};
	static eSkin=
	{
		None:0,
		Bone:1,
		Grass:2,
		Tree:3,
	};
	static eEnvCube=
	{
		None:-1,
		Texture:0,
	}
	static eSLTag=
	{
		simple:"simple",
		ins:"ins",
		light:"light",
		shadow:"shadow",
		gBuf:"gBuf",
	}
	static eColorModel=
	{
		RGBAdd:0,
		RGBMul:1,
		HSVBaseHSPercent:2,
		HSV:3,
		HSL:4,
		None:5,
	}
	static eAlphaModel=
	{
		Add:0,
		Mul:1,
		None:2,	
	}
	static eColorVFX=
	{
		None:0,
		//UV
		Distort:1,//강도xy
		Aberrate:2,//기본강도x,랜덤추가강도y
		//Color
		Outline:3,//color xyz
		Pixel:4,//픽셀사이즈xy
		//image Process
		Noise:5,//속도x,강도y,픽셀사이즈z
		//BorderLight:6,//강도x,두께y
		Scanline:7,//선 개수 x, 속도 y
		Hologram:8,
	}
	static eBlend=
	{
		LinearDodge :1,//a+b 덧셈
		Multiply:2,//a*b 곱셈
		LerpPer:3,//(a*percent)+(b*percent) 퍼센트 기준 lerp
		LerpAlpha:4,//(a*alpth)+(b*alpth) 알파 비율기준 lerp
		Darken:5,//min(a,b) 두 색 중에서 무조건 어두운 색 선택
		Lighten:6,//max(a,b) 두 색 중에서 무조건 밝은 색 선택
		Org:7,
		Tar:8,
		DarkCut : 9,//0보다 크면 무조건 0
		
	}
}