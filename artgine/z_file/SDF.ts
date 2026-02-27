export class SDF {
    
	static WriteDataTex=11;
	static TexSizeMax=2048;
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
		Bake:2,
		// Grass:2,
		// Tree:3,
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
	
	static eVFX=
	{
		None:0,
		//UV
		Distort:1,//강도xy  %울렁거림
		Aberrate:2,//기본강도x,랜덤추가강도y  % RGB 분리되서 보여짐
		//Color
		Outline:3,//color xyz   %외각선
		Pixel:4,//픽셀사이즈xy   %픽셀화
		//image Process
		Noise:5,//타입x,속도y,강도z,반복횟수w   %노이즈
		//BorderLight:6,//강도x,두께y
		Scanline:7,//선 개수 x, 속도 y %줄내려옴
		LookUpTable:8,//x팔레트텍스쳐인덱스, 컬러 팔레트에서 색상 양자화
		Blur:9,//x블러타입(0만 지원함) y블러횟수

	}
	static eLookUpTable=
	{
		LUT0:159,
		LUT1:160,
		LUT2:161,
		LUT3:162,
		LUT4:163,
		LUT5:164,
	}
	static eNoise=
	{
		// 절차적 생성
		Gaussian:0,//랜덤 
		Simplex:1,//펄린 대체

		// 텍스쳐 샘플링 후처리
		PerlinBillow:10,
		PerlinRidged:11,
		PerlinDomainWarp:12,
		PerlinFBM:13,

		// 텍스쳐 샘플링
		//(128*128)xy*32frame=2048*256
		Perlin:768,//구름 느낌,연기 연속적인 부드러운 느낌
		PerlinNormal:512,//가뭄에 땅갈라짐.거북이 등
		PerlinFBM3:256,
		Blue:255,

	}
	static eBlend=
	{
		Null :0,
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