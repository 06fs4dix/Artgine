export class SDF {
    
	static WriteDataTex=11;
	static TexSizeMax=2048;

	static FloatTex16=0;
	static ClipControl=0;

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
        Anisotropy:2,
        SubsurfaceScattering:3,
        Sheen:4,
        Iridescence:5,
        Clearcoat:6,
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
        Albedo : 0,
		Position : 1,
		Normal : 2,
		Ambient : 3,
		SpeculerPowEmissive : 5,
	};
	static eSkin=
	{
		None:0,
		Bone:1,
		Bake:2,
	};
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
		Unpack:6,
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

		Decal:10,//rgba : 색상
		DecalTexture:11,//r : 텍스쳐 인덱스, g : 블렌드 비율

	}
	
	static eNoise=
	{
		
		

		// 텍스쳐 샘플링 후처리
		PerlinBillow:10,
		PerlinRidged:11,
		PerlinDomainWarp:12,
		PerlinFBM:13,


		Gaussian:20,//랜덤 
		Simplex:21,//펄린 대체

		// 텍스쳐 샘플링
		//(128*128)xy*32frame=2048*256
		Perlin:1,//구름 느낌,연기 연속적인 부드러운 느낌
		PerlinNormal:2,//가뭄에 땅갈라짐.거북이 등
		PerlinFBM3:3,
		Blue:4,

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
	//Arr하나에 크기는 
	//2048*256
	//몇번 샘플 슬롯,yoff 시작(max256),몇번 어레이
	static eUni=
	{
		MatSkin:10,//512계 사용함2048
		V4LookUpTable0:14,//6개 사용함 여유 30개
		V4LookUpTable1:15,
		V4LookUpTable2:16,
		V4LookUpTable3:17,
		V4LookUpTable4:18,
		V4LookUpTable5:19,
		V4WindDir:30,
		V4WindPos:31,
		V4WindInfo:32,
		V4LightColor:33,
		V4LightDir:34,
		MatShadowNearCasV0:40,
		MatShadowFarCasP0:44,
		MatShadowTopCasV1:48,
		MatShadowBottomCasP1:52,
		MatShadowLeftCasV2:56,
		MatShadowRightCasP2:60,
		MatShadowPointProj:64,
		V4ShadowReadList:68,


		SlotShadow:2,//512계 사용함2048
		SlotUni:2,//512계 사용함2048

	}
	static eTexSlot=
	{
		

		ArrShadowWrite:2.0,
		ArrUni:1.0,
		SingleShadowRead:10.0,
		

	}
}