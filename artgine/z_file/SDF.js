export class SDF {
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
        LambertPhongPBR: 4,
    };
    static eLightStep2 = {
        None: 0,
        Emissive: 1,
    };
    static eLightStep3 = {
        None: 0,
        Rim: 1,
    };
    static eShadow = {
        Cas0: 0,
        Cas1: 1,
        Cas2: 2,
        Near: 3,
        Far: 4,
        Top: 5,
        Bottom: 6,
        Left: 7,
        Right: 8,
    };
    static eGBuf = {
        Position: 0,
        Normal: 1,
        Albedo: 2,
        Ambient: 4,
        SpeculerPowEmissive: 5,
    };
    static eSkin = {
        None: 0,
        Bone: 1,
        Grass: 2,
        Tree: 3,
    };
    static eEnvCube = {
        None: -1,
        Texture: 0,
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
    };
    static eAlphaModel = {
        Add: 0,
        Mul: 1,
        None: 2,
    };
    static eColorVFX = {
        None: 0,
        Distort: 1,
        Aberrate: 2,
        Outline: 3,
        Pixel: 4,
        Noise: 5,
        Scanline: 7,
        Hologram: 8,
    };
    static eBlend = {
        LinearDodge: 1,
        Multiply: 2,
        LerpPer: 3,
        LerpAlpha: 4,
        Darken: 5,
        Lighten: 6,
        Org: 7,
        Tar: 8,
        DarkCut: 9,
    };
}
