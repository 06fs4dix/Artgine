export class SDF {
    static WriteDataTex = 11;
    static TexSizeMax = 2048;
    static FloatTex16 = 0;
    static ClipControl = 0;
    static eLightStep0 = {
        None: 0,
        Distance: 1,
        Lambert: 2,
        HafeLambert: 3,
    };
    static eLightStep1 = {
        None: 0,
        Phong: 1,
        BlinnPhong: 2,
        CookTorrance: 3,
    };
    static eLightStep2 = {
        None: 0,
        Emissive: 1,
    };
    static eLightStep3 = {
        None: 0,
        Rim: 1,
        Anisotropy: 2,
        SubsurfaceScattering: 3,
        Sheen: 4,
        Iridescence: 5,
        Clearcoat: 6,
    };
    static eShadow = {
        Cas0: 0,
        Cas1: 1,
        Cas2: 2,
        Cas3: 3,
        Near: 0,
        Far: 1,
        Top: 2,
        Bottom: 3,
        Left: 4,
        Right: 5,
    };
    static eGBuf = {
        Albedo: 0,
        Position: 1,
        Normal: 2,
        Ambient: 3,
        SpeculerPowEmissive: 5,
    };
    static eSkin = {
        None: 0,
        Bone: 1,
        Bake: 2,
    };
    static eSLTag = {
        simple: "simple",
        ins: "ins",
        light: "light",
        shadow: "shadow",
        gBuf: "gBuf",
    };
    static eColorModel = {
        RGBAdd: 0,
        RGBMul: 1,
        HSVBaseHSPercent: 2,
        HSV: 3,
        HSL: 4,
        None: 5,
        Unpack: 6,
    };
    static eTonemap = {
        None: 0,
        Neutral: 1,
        ACES: 2,
        Reinhard: 3,
    };
    static eVFX = {
        None: 0,
        Distort: 1,
        Aberrate: 2,
        Outline: 3,
        Pixel: 4,
        Noise: 5,
        Scanline: 7,
        LookUpTable: 8,
        Blur: 9,
        Decal: 10,
        DecalTexture: 11,
    };
    static eNoise = {
        PerlinBillow: 10,
        PerlinRidged: 11,
        PerlinDomainWarp: 12,
        PerlinFBM: 13,
        Gaussian: 20,
        Simplex: 21,
        Perlin: 1,
        PerlinNormal: 2,
        PerlinFBM3: 3,
        Blue: 4,
    };
    static eBlend = {
        Null: 0,
        LinearDodge: 1,
        Multiply: 2,
        LerpPer: 3,
        LerpAlpha: 4,
        Darken: 5,
        Lighten: 6,
        Org: 7,
        Tar: 8,
        DarkCut: 9,
        Texture: 10,
        Tonemap: 11,
        GammaCorrect: 12,
    };
    static eUni = {
        MatSkin: 10,
        V4LookUpTable0: 14,
        V4LookUpTable1: 15,
        V4LookUpTable2: 16,
        V4LookUpTable3: 17,
        V4LookUpTable4: 18,
        V4LookUpTable5: 19,
        V4WindDir: 30,
        V4WindPos: 31,
        V4WindInfo: 32,
        V4LightColor: 33,
        V4LightDir: 34,
        MatShadowNear: 40,
        MatShadowFar: 44,
        MatShadowTop: 48,
        MatShadowBottom: 52,
        MatShadowLeft: 56,
        MatShadowRight: 60,
        MatShadowCas0VPWithZRow: 40,
        MatShadowCas1VPWithZRow: 44,
        MatShadowCas2VPWithZRow: 48,
        MatShadowCas3VPWithZRow: 52,
        V4ShadowReadList: 64,
        V4ShadowInfoList: 65,
        V4ShadowCascadeDataList: 66,
        V4ShadowDivideList: 67,
        V4LightMask: 68,
        SlotShadow: 2,
        SlotUni: 2,
    };
    static eTexSlot = {
        ArrShadowWrite: 2.0,
        ArrUni: 1.0,
        SingleShadowRead: 10.0,
    };
}
