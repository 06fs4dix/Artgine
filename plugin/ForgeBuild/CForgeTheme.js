export class CForgeTheme {
    mLabel = "";
    mCulture = 0;
    mEra = 0;
    mRegion = "";
    mWallBody = [0.93, 0.88, 0.78];
    mWallStone = [0.66, 0.62, 0.56];
    mWallCap = [0.8, 0.76, 0.69];
    mTowerBody = [0.88, 0.84, 0.76];
    mDark = [0.17, 0.15, 0.14];
    mPlaster = [[0.96, 0.94, 0.88], [0.95, 0.9, 0.78], [0.93, 0.89, 0.84], [0.97, 0.93, 0.86]];
    mRoof = [[0.74, 0.34, 0.24], [0.62, 0.3, 0.22], [0.47, 0.36, 0.3], [0.42, 0.45, 0.56]];
    mShutter = [[0.36, 0.55, 0.38], [0.33, 0.47, 0.66], [0.66, 0.3, 0.24], [0.5, 0.38, 0.24]];
    mStone = [0.66, 0.62, 0.56];
    mWood = [0.38, 0.26, 0.17];
    mBrick = [0.6, 0.33, 0.25];
    mFlower = [[0.92, 0.42, 0.55], [0.95, 0.78, 0.3], [0.85, 0.3, 0.3], [0.7, 0.5, 0.9]];
    mGreen = [0.36, 0.55, 0.25];
    mMetal = [0.36, 0.34, 0.33];
    mIron = [0.12, 0.12, 0.13];
    mFenceWood = [0.5, 0.36, 0.23];
    mDirt = [0.7, 0.6, 0.45];
    mPebble = [[0.74, 0.71, 0.66], [0.66, 0.63, 0.58], [0.8, 0.77, 0.71]];
    mGlaze = [0.82, 0.6, 0.16];
    mTempleSign = "大雄殿";
    mBoard = [0.2, 0.18, 0.17];
    mBamboo = [0.72, 0.64, 0.44];
    mCloth = [[0.2, 0.26, 0.45], [0.36, 0.22, 0.18], [0.22, 0.22, 0.24]];
    mMud = [[0.72, 0.6, 0.44], [0.66, 0.55, 0.4], [0.76, 0.65, 0.5]];
    mPaper = [0.95, 0.91, 0.8];
    mPillar = [0.55, 0.2, 0.14];
    mBeam = [0.28, 0.5, 0.43];
    mThatch = [[0.8, 0.68, 0.44], [0.74, 0.62, 0.4], [0.68, 0.58, 0.38]];
    mShingle = [[0.46, 0.37, 0.29], [0.52, 0.44, 0.35], [0.4, 0.37, 0.34]];
    mTurf = [[0.42, 0.5, 0.26], [0.38, 0.46, 0.24], [0.46, 0.52, 0.3]];
    mLogWood = [[0.52, 0.4, 0.28], [0.44, 0.33, 0.23]];
    mPlankWall = [[0.62, 0.48, 0.34], [0.55, 0.41, 0.29], [0.7, 0.57, 0.42], [0.52, 0.44, 0.36]];
    mLogWall = [[0.6, 0.43, 0.28], [0.52, 0.37, 0.25], [0.66, 0.5, 0.34]];
    mClapboard = [[0.94, 0.93, 0.89], [0.9, 0.9, 0.86], [0.88, 0.9, 0.92]];
    mAdobe = [[0.78, 0.62, 0.44], [0.74, 0.58, 0.41], [0.82, 0.67, 0.48]];
    mFelt = [[0.93, 0.91, 0.86], [0.9, 0.88, 0.83]];
    mGold = [0.86, 0.66, 0.26];
    mGround = [[0.45, 0.66, 0.27], [0.33, 0.55, 0.22]];
    mArid = false;
    mPaint = [[0.12, 0.12, 0.13], [0.86, 0.22, 0.16], [0.18, 0.36, 0.7], [0.95, 0.76, 0.16], [0.22, 0.56, 0.36]];
    mHouseWall = [0];
    mRoofKind = [0];
    mWallKind = 0;
    mTowerKind = 0;
    mTimber = true;
    mPitch = 1;
    mDormer = true;
    mIvy = true;
    mStepGable = false;
    mSash = false;
    mGlazed = true;
    mArchWin = false;
    mMansard = false;
    mChimney = true;
    mClassical = false;
    mBalcony = false;
    mFlowerBox = false;
    mItabuki = false;
    mBrickHouse = true;
    mChurch = 0;
    mMosque = 0;
    mHut = 0;
    mParapet = 0;
    mArch = 0;
    mToron = false;
    mLattice = false;
    mRoofDeck = false;
    mChurchMat = 0;
    mSpire = 0;
    mTemple = 0;
    mRoofLift = 1;
    mWallStyle = 0;
    mTowerStyle = 0;
    mTowerShape = -1;
    mMonument = 0;
    mFence = 0;
    mBridge = 0;
    static eCulture = { Europe: 0, Korea: 1, Japan: 2, China: 3, Arab: 4, Egypt: 5, Andes: 6, Africa: 7, Mongol: 8 };
    static eEra = { Ancient: -1, Medieval: 0, EarlyModern: 1, Modern: 2 };
    static eMonument = { Cross: 0, StonePagoda: 1, WoodPagoda: 2, BrickPagoda: 3, Runestone: 4, Obelisk: 5, Arch: 6, Column: 7, OctaPagoda: 8, Gorinto: 9, DenseEave: 10,
        Pyramid: 11, Sphinx: 12, Fountain: 13, Intihuatana: 14, Ovoo: 15, Stupa: 16, BirdPillar: 17, MudTomb: 18, Cairn: 19, PlazaFountain: 20, Lamp: 21, Shop: 22 };
    static eFence = { Rail: 0, Doldam: 1, Bamboo: 2, FlowerWall: 3, DryStone: 4, Balustrade: 5, Railing: 6, BrickWall: 7, MudWall: 8, Brush: 9 };
    static eBridge = { Europe: 0, Korea: 1, Japan: 2, China: 3, Slab: 4, Rope: 5 };
    static sList = new Map();
    static sDefault = "europe_medieval_northwest";
    East() { const E = CForgeTheme.eCulture; return this.mCulture == E.Korea || this.mCulture == E.Japan || this.mCulture == E.China; }
    Temple() { return (this.East() || this.mCulture == CForgeTheme.eCulture.Mongol) && this.mChurch < 0; }
    World() { return this.mCulture >= CForgeTheme.eCulture.Arab; }
    LowWall() {
        const E = CForgeTheme.eCulture;
        if (this.mWallKind == 1)
            return Infinity;
        if (this.mCulture == E.Andes && this.mWallStyle == 1)
            return 2.4;
        if (this.mCulture == E.Africa && this.mWallStyle == 2)
            return 1.9;
        if (this.mCulture == E.Mongol && this.mWallStyle == 2)
            return 2.0;
        return Infinity;
    }
    static Get(_name) {
        return CForgeTheme.sList.get(_name ?? CForgeTheme.sDefault) ?? CForgeTheme.sList.get(CForgeTheme.sDefault);
    }
    static Of(_r) {
        const t = CForgeTheme.Get(_r.theme);
        if (_r.over == null)
            return t;
        return Object.assign(new CForgeTheme(), t, _r.over);
    }
    static Push(_name, _over, _base = null) {
        const t = Object.assign(new CForgeTheme(), _base != null ? CForgeTheme.sList.get(_base) : {}, _over);
        CForgeTheme.sList.set(_name, t);
        return t;
    }
}
const E = CForgeTheme.eCulture, ER = CForgeTheme.eEra, M = CForgeTheme.eMonument, F = CForgeTheme.eFence, BR = CForgeTheme.eBridge;
CForgeTheme.Push("europe_medieval_northwest", { mLabel: "유럽_중세_북서", mEra: ER.Medieval, mRegion: "northwest" });
CForgeTheme.Push("europe_medieval_north", {
    mLabel: "유럽_중세_북유럽", mEra: ER.Medieval, mRegion: "north",
    mHouseWall: [1, 2, 2, 1], mRoofKind: [3, 3, 2], mWallKind: 1, mTowerKind: 1, mChurch: 1, mMonument: M.Runestone, mIvy: false, mGlazed: false, mChimney: false,
    mShutter: [[0.5, 0.22, 0.16], [0.36, 0.3, 0.22]], mWood: [0.3, 0.21, 0.14], mPlankWall: [[0.56, 0.22, 0.16], [0.5, 0.2, 0.15], [0.42, 0.3, 0.2]],
    mShingle: [[0.32, 0.26, 0.2], [0.38, 0.3, 0.22]],
});
CForgeTheme.Push("europe_medieval_mediterranean", {
    mLabel: "유럽_중세_지중해", mEra: ER.Medieval, mRegion: "mediterranean",
    mTimber: false, mPitch: 0.42, mRoofKind: [4], mDormer: false, mChurch: 2, mWallStyle: 1, mTowerShape: 1, mMonument: M.Column, mFence: F.DryStone,
    mPlaster: [[0.93, 0.84, 0.66], [0.9, 0.76, 0.6], [0.95, 0.9, 0.78], [0.88, 0.8, 0.68]], mRoof: [[0.76, 0.42, 0.26], [0.7, 0.36, 0.22], [0.8, 0.5, 0.32]],
    mShutter: [[0.3, 0.42, 0.3], [0.42, 0.3, 0.22], [0.28, 0.36, 0.4]], mWallBody: [0.86, 0.78, 0.64], mWallStone: [0.74, 0.66, 0.54], mWallCap: [0.8, 0.72, 0.6], mTowerBody: [0.84, 0.76, 0.62],
    mStone: [0.78, 0.7, 0.58], mMetal: [0.5, 0.45, 0.38],
});
CForgeTheme.Push("europe_earlymodern_italy", {
    mLabel: "유럽_근세_이탈리아", mEra: ER.EarlyModern, mRegion: "italy",
    mHouseWall: [0, 0, 3], mTimber: false, mPitch: 0.38, mRoofKind: [4], mDormer: false, mIvy: false, mClassical: true, mSash: true, mArchWin: true,
    mChurch: 3, mWallStyle: 2, mTowerStyle: 1, mMonument: M.Obelisk, mFence: F.Balustrade,
    mPlaster: [[0.92, 0.82, 0.62], [0.88, 0.7, 0.54], [0.94, 0.88, 0.74], [0.86, 0.62, 0.48]], mRoof: [[0.74, 0.4, 0.26], [0.68, 0.36, 0.22]],
    mShutter: [[0.3, 0.4, 0.3], [0.36, 0.3, 0.24]], mStone: [0.86, 0.82, 0.72], mWallBody: [0.82, 0.74, 0.6], mWallStone: [0.76, 0.7, 0.58], mWallCap: [0.86, 0.8, 0.68], mTowerBody: [0.84, 0.76, 0.62],
});
CForgeTheme.Push("europe_earlymodern_northwest", {
    mLabel: "유럽_근세_북서", mEra: ER.EarlyModern, mRegion: "northwest",
    mHouseWall: [10], mTimber: false, mPitch: 1.35, mStepGable: true, mIvy: false, mDormer: false, mSash: true,
    mChurch: 0, mChurchMat: 2, mSpire: 1, mWallStyle: 2, mTowerStyle: 1, mMonument: M.Column, mFence: F.Railing,
    mBrick: [0.58, 0.28, 0.2], mRoof: [[0.6, 0.28, 0.2], [0.34, 0.36, 0.4]], mShutter: [[0.24, 0.36, 0.28], [0.56, 0.2, 0.16]], mMetal: [0.78, 0.62, 0.26],
    mStone: [0.8, 0.78, 0.72], mWallBody: [0.6, 0.34, 0.26], mWallStone: [0.72, 0.68, 0.6], mWallCap: [0.74, 0.7, 0.62], mTowerBody: [0.6, 0.34, 0.26],
});
CForgeTheme.Push("europe_modern_britain", {
    mLabel: "유럽_근대_영국", mEra: ER.Modern, mRegion: "britain",
    mHouseWall: [10], mTimber: false, mPitch: 0.7, mSash: true, mClassical: true, mDormer: false, mIvy: true,
    mChurch: 0, mChurchMat: 2, mWallStyle: 3, mTowerStyle: 2, mMonument: M.Obelisk, mFence: F.Railing,
    mBrick: [0.6, 0.3, 0.22], mRoof: [[0.32, 0.34, 0.38], [0.28, 0.3, 0.34]], mShutter: [[0.2, 0.22, 0.24]], mStone: [0.84, 0.82, 0.76],
    mWallBody: [0.6, 0.3, 0.22], mWallStone: [0.8, 0.78, 0.72], mWallCap: [0.82, 0.8, 0.74], mTowerBody: [0.6, 0.3, 0.22],
});
CForgeTheme.Push("europe_modern_continental", {
    mLabel: "유럽_근대_대륙", mEra: ER.Modern, mRegion: "continental",
    mHouseWall: [3], mTimber: false, mPitch: 1.7, mRoofKind: [5], mSash: true, mClassical: true, mBalcony: true, mIvy: false, mMansard: true,
    mChurch: 3, mChurchMat: 0, mWallStyle: 3, mTowerStyle: 2, mMonument: M.Arch, mFence: F.Railing,
    mStone: [0.88, 0.84, 0.74], mRoof: [[0.42, 0.46, 0.52], [0.38, 0.42, 0.48]], mShutter: [[0.3, 0.32, 0.34]],
    mWallBody: [0.86, 0.82, 0.72], mWallStone: [0.8, 0.76, 0.66], mWallCap: [0.9, 0.86, 0.76], mTowerBody: [0.88, 0.84, 0.74],
});
CForgeTheme.Push("korea_earlymodern", {
    mLabel: "한국_근세(조선)", mCulture: E.Korea, mEra: ER.EarlyModern, mHouseWall: [4, 5], mChurch: -1, mMonument: M.StonePagoda, mFence: F.Doldam, mBridge: BR.Korea,
    mPlaster: [[0.95, 0.94, 0.9], [0.93, 0.92, 0.88], [0.96, 0.95, 0.92]],
    mRoof: [[0.36, 0.37, 0.39], [0.31, 0.32, 0.34], [0.41, 0.41, 0.42]],
    mThatch: [[0.74, 0.65, 0.47], [0.69, 0.6, 0.44], [0.78, 0.69, 0.52]],
    mWood: [0.46, 0.33, 0.22], mStone: [0.72, 0.71, 0.68],
    mWallBody: [0.8, 0.78, 0.74], mWallStone: [0.74, 0.72, 0.68], mWallCap: [0.36, 0.37, 0.39], mTowerBody: [0.8, 0.78, 0.74],
    mFenceWood: [0.55, 0.45, 0.32],
});
CForgeTheme.Push("korea_medieval", {
    mLabel: "한국_중세(고려)", mEra: ER.Medieval, mTemple: 1, mMonument: M.OctaPagoda, mWallStyle: 1, mBridge: BR.Slab, mHouseWall: [5, 5, 5, 4],
    mPillar: [0.5, 0.36, 0.25], mBeam: [0.4, 0.33, 0.25], mPlaster: [[0.86, 0.7, 0.44], [0.84, 0.67, 0.4], [0.88, 0.73, 0.48]],
    mWallBody: [0.68, 0.57, 0.42], mTowerBody: [0.68, 0.57, 0.42], mWallStone: [0.62, 0.6, 0.56],
}, "korea_earlymodern");
CForgeTheme.Push("korea_modern", {
    mLabel: "한국_근대(개화기)", mEra: ER.Modern, mHouseWall: [4, 4, 5, 10], mTimber: false, mSash: true, mClassical: true, mDormer: false, mPitch: 0.8,
    mChurch: 0, mChurchMat: 2, mMonument: M.Arch, mBrick: [0.58, 0.3, 0.24], mShutter: [[0.3, 0.32, 0.3]],
}, "korea_earlymodern");
CForgeTheme.Push("japan_earlymodern", {
    mLabel: "일본_근세(에도)", mCulture: E.Japan, mEra: ER.EarlyModern, mHouseWall: [6, 7], mTempleSign: "本堂", mChurch: -1, mMonument: M.WoodPagoda, mFence: F.Bamboo, mBridge: BR.Japan,
    mPlaster: [[0.95, 0.94, 0.91], [0.92, 0.91, 0.88], [0.86, 0.77, 0.58], [0.82, 0.72, 0.54]],
    mMud: [[0.76, 0.66, 0.52], [0.7, 0.61, 0.48], [0.8, 0.71, 0.57]],
    mRoof: [[0.27, 0.29, 0.33], [0.23, 0.25, 0.29], [0.32, 0.33, 0.36]],
    mThatch: [[0.62, 0.55, 0.4], [0.56, 0.5, 0.37], [0.67, 0.6, 0.45]],
    mWood: [0.3, 0.22, 0.16], mStone: [0.68, 0.67, 0.64], mPillar: [0.78, 0.26, 0.15], mBeam: [0.64, 0.22, 0.13],
    mWallBody: [0.7, 0.69, 0.66], mWallStone: [0.64, 0.63, 0.6], mWallCap: [0.27, 0.29, 0.33], mTowerBody: [0.94, 0.93, 0.9],
    mFenceWood: [0.42, 0.32, 0.22], mBoard: [0.16, 0.15, 0.15], mMetal: [0.42, 0.36, 0.26],
});
CForgeTheme.Push("japan_medieval", {
    mLabel: "일본_중세(무로마치)", mEra: ER.Medieval, mItabuki: true, mWallStyle: 1, mTowerKind: 1, mRoofKind: [2], mTemple: 1, mMonument: M.Gorinto,
    mTempleSign: "佛殿", mShingle: [[0.42, 0.36, 0.3], [0.38, 0.33, 0.28]],
}, "japan_earlymodern");
CForgeTheme.Push("japan_modern", {
    mLabel: "일본_근대(메이지)", mEra: ER.Modern, mHouseWall: [6, 6, 7, 11], mTimber: false, mSash: true, mClassical: true, mDormer: false, mPitch: 0.75,
    mChurch: 0, mChurchMat: 3, mTowerStyle: 2, mMonument: M.Obelisk, mShutter: [[0.3, 0.42, 0.36]], mRoofKind: [0],
}, "japan_earlymodern");
CForgeTheme.Push("china_earlymodern_north", {
    mLabel: "중국_근세_북방(명청)", mCulture: E.China, mEra: ER.EarlyModern, mRegion: "north", mHouseWall: [8], mTempleSign: "大雄寶殿", mChurch: -1,
    mMonument: M.BrickPagoda, mFence: F.BrickWall, mBridge: BR.China,
    mPlaster: [[0.95, 0.95, 0.93], [0.93, 0.93, 0.91], [0.96, 0.95, 0.92]],
    mRoof: [[0.34, 0.35, 0.37], [0.3, 0.31, 0.33], [0.38, 0.38, 0.39]],
    mGlaze: [0.27, 0.5, 0.36], mWood: [0.36, 0.2, 0.14], mStone: [0.86, 0.85, 0.82], mPillar: [0.64, 0.13, 0.1], mBeam: [0.2, 0.44, 0.46],
    mWallBody: [0.58, 0.59, 0.6], mWallStone: [0.66, 0.65, 0.62], mWallCap: [0.5, 0.51, 0.52], mTowerBody: [0.58, 0.59, 0.6],
    mBrick: [0.56, 0.57, 0.58], mMetal: [0.72, 0.56, 0.22], mFenceWood: [0.4, 0.24, 0.16],
});
CForgeTheme.Push("china_earlymodern_south", {
    mLabel: "중국_근세_남방(명청)", mRegion: "south", mHouseWall: [9], mFence: F.FlowerWall, mRoofLift: 1.5, mGlaze: [0.33, 0.34, 0.36],
}, "china_earlymodern_north");
CForgeTheme.Push("china_medieval", {
    mLabel: "중국_중세(송)", mEra: ER.Medieval, mRegion: "", mBrickHouse: false, mWallStyle: 1, mTemple: 1, mRoofLift: 0.55, mGlaze: [0.33, 0.34, 0.36],
    mMonument: M.DenseEave, mFence: F.Rail, mWallBody: [0.66, 0.56, 0.42], mTowerBody: [0.66, 0.56, 0.42], mWallCap: [0.62, 0.52, 0.4], mWallStone: [0.6, 0.5, 0.38],
}, "china_earlymodern_north");
CForgeTheme.Push("china_modern", {
    mLabel: "중국_근대(청말·민국)", mEra: ER.Modern, mRegion: "", mHouseWall: [10, 10, 9], mTimber: false, mSash: true, mClassical: true, mDormer: false, mPitch: 0.75,
    mChurch: 0, mChurchMat: 2, mTowerStyle: 2, mMonument: M.Obelisk, mFence: F.Railing, mShutter: [[0.24, 0.26, 0.28]],
}, "china_earlymodern_north");
CForgeTheme.Push("arab_medieval", {
    mLabel: "아랍_중세(맘루크)", mCulture: E.Arab, mEra: ER.Medieval, mHouseWall: [12], mParapet: 1, mArch: 2, mLattice: true, mChurch: 4, mMosque: 0, mGround: [[0.8, 0.68, 0.5], [0.72, 0.6, 0.42]], mArid: true,
    mMonument: M.Fountain, mFence: F.MudWall, mBridge: BR.Europe, mWallStyle: 0, mTowerShape: 0,
    mPlaster: [[0.9, 0.84, 0.72], [0.86, 0.78, 0.64], [0.93, 0.9, 0.83], [0.84, 0.74, 0.6]], mAdobe: [[0.84, 0.74, 0.58], [0.8, 0.7, 0.55]],
    mStone: [0.86, 0.78, 0.62], mWallBody: [0.84, 0.76, 0.6], mWallStone: [0.56, 0.4, 0.31], mWallCap: [0.88, 0.8, 0.66], mTowerBody: [0.84, 0.76, 0.6],
    mWood: [0.32, 0.21, 0.13], mShutter: [[0.3, 0.2, 0.13], [0.24, 0.32, 0.3]], mRoof: [[0.84, 0.76, 0.6]], mMetal: [0.62, 0.52, 0.3], mDirt: [0.78, 0.68, 0.52], mGlaze: [0.18, 0.44, 0.5],
});
CForgeTheme.Push("arab_earlymodern_ottoman", {
    mLabel: "아랍_근세_오스만", mEra: ER.EarlyModern, mRegion: "ottoman", mHouseWall: [16, 16, 16, 12], mParapet: 0, mArch: 1, mLattice: false, mMosque: 1, mWallStyle: 2, mFence: F.DryStone, mGround: [[0.45, 0.62, 0.28], [0.36, 0.52, 0.24]], mArid: false,
    mPlankWall: [[0.6, 0.26, 0.2], [0.86, 0.72, 0.5], [0.8, 0.8, 0.76], [0.56, 0.6, 0.62]], mRoof: [[0.72, 0.38, 0.24], [0.66, 0.34, 0.22], [0.76, 0.44, 0.28]],
    mStone: [0.84, 0.8, 0.72], mWallBody: [0.8, 0.76, 0.68], mWallStone: [0.62, 0.58, 0.52], mWallCap: [0.84, 0.8, 0.72], mTowerBody: [0.8, 0.76, 0.68],
    mMetal: [0.5, 0.52, 0.54], mPlaster: [[0.94, 0.92, 0.86], [0.92, 0.86, 0.74]],
}, "arab_medieval");
CForgeTheme.Push("arab_earlymodern_maghreb", {
    mLabel: "아랍_근세_마그레브", mEra: ER.EarlyModern, mRegion: "maghreb", mHouseWall: [12], mParapet: 3, mArch: 4, mLattice: false, mMosque: 2, mWallStyle: 1, mTowerShape: 1, mGround: [[0.78, 0.6, 0.44], [0.7, 0.52, 0.38]],
    mPlaster: [[0.82, 0.56, 0.42], [0.86, 0.64, 0.48], [0.92, 0.84, 0.72], [0.78, 0.52, 0.4]], mAdobe: [[0.78, 0.5, 0.38], [0.74, 0.47, 0.35]],
    mStone: [0.8, 0.62, 0.5], mWallBody: [0.76, 0.5, 0.38], mWallStone: [0.7, 0.46, 0.35], mWallCap: [0.78, 0.52, 0.4], mTowerBody: [0.76, 0.5, 0.38],
    mGlaze: [0.16, 0.44, 0.3], mShutter: [[0.16, 0.36, 0.3], [0.2, 0.3, 0.52], [0.44, 0.24, 0.14]], mDirt: [0.76, 0.56, 0.42],
}, "arab_medieval");
CForgeTheme.Push("egypt_ancient_old", {
    mLabel: "이집트_고대_고왕국", mCulture: E.Egypt, mEra: ER.Ancient, mHouseWall: [12], mParapet: 2, mArch: 0, mChurch: 5, mTemple: 1, mWallStyle: 1,
    mMonument: M.Sphinx, mFence: F.MudWall, mBridge: BR.Slab,
    mPlaster: [[0.66, 0.5, 0.34], [0.6, 0.46, 0.32], [0.7, 0.55, 0.38], [0.9, 0.82, 0.66]], mAdobe: [[0.56, 0.42, 0.29], [0.52, 0.39, 0.27], [0.6, 0.46, 0.32]],
    mStone: [0.9, 0.85, 0.74], mWallBody: [0.6, 0.47, 0.33], mWallStone: [0.82, 0.76, 0.64], mWallCap: [0.66, 0.52, 0.37], mTowerBody: [0.6, 0.47, 0.33],
    mGround: [[0.86, 0.72, 0.5], [0.76, 0.62, 0.42]], mArid: true,
    mWood: [0.42, 0.3, 0.18], mShutter: [[0.36, 0.26, 0.16]], mMetal: [0.86, 0.66, 0.26], mDirt: [0.82, 0.72, 0.54], mThatch: [[0.62, 0.56, 0.36], [0.58, 0.52, 0.33]],
    mPebble: [[0.86, 0.8, 0.66], [0.8, 0.74, 0.6], [0.9, 0.84, 0.72]],
});
CForgeTheme.Push("egypt_ancient_new", {
    mLabel: "이집트_고대_신왕국", mTemple: 0, mWallStyle: 0, mRoofDeck: true, mMonument: M.Obelisk,
    mStone: [0.84, 0.68, 0.46], mWallBody: [0.56, 0.43, 0.3], mWallStone: [0.82, 0.66, 0.45], mWallCap: [0.6, 0.46, 0.32], mTowerBody: [0.84, 0.68, 0.46],
}, "egypt_ancient_old");
CForgeTheme.Push("andes_medieval", {
    mLabel: "남미_중세(잉카)", mCulture: E.Andes, mEra: ER.Medieval, mHouseWall: [14], mArch: 3, mChurch: 7, mWallStyle: 0, mGround: [[0.6, 0.6, 0.38], [0.5, 0.52, 0.32]],
    mMonument: M.Intihuatana, mFence: F.DryStone, mBridge: BR.Rope,
    mStone: [0.7, 0.68, 0.63], mWallBody: [0.56, 0.55, 0.52], mWallStone: [0.62, 0.6, 0.55], mWallCap: [0.7, 0.68, 0.63], mTowerBody: [0.68, 0.66, 0.61],
    mThatch: [[0.74, 0.62, 0.38], [0.7, 0.58, 0.36], [0.78, 0.66, 0.42]], mWood: [0.4, 0.3, 0.2], mDirt: [0.62, 0.5, 0.38], mGreen: [0.38, 0.52, 0.26],
    mAdobe: [[0.66, 0.5, 0.38], [0.62, 0.47, 0.35]], mGold: [0.9, 0.72, 0.3],
});
CForgeTheme.Push("andes_earlymodern", {
    mLabel: "남미_근세(식민 쿠스코)", mEra: ER.EarlyModern, mHouseWall: [15, 15, 14], mArch: 1, mChurch: 3, mChurchMat: 0, mMonument: M.Cross, mBridge: BR.Europe, mWallStyle: 1,
    mPlaster: [[0.95, 0.94, 0.9], [0.94, 0.9, 0.8], [0.92, 0.92, 0.88]], mShutter: [[0.16, 0.34, 0.5], [0.2, 0.4, 0.3], [0.42, 0.26, 0.16]],
    mRoof: [[0.7, 0.38, 0.25], [0.64, 0.34, 0.22]], mMetal: [0.42, 0.4, 0.38], mTowerBody: [0.66, 0.6, 0.54],
}, "andes_medieval");
CForgeTheme.Push("africa_medieval_sahel", {
    mLabel: "아프리카_중세_사헬(말리)", mCulture: E.Africa, mEra: ER.Medieval, mRegion: "sahel", mHouseWall: [12], mParapet: 2, mToron: true, mArch: 0, mChurch: 6, mWallStyle: 0, mGround: [[0.82, 0.62, 0.42], [0.74, 0.54, 0.36]], mArid: true,
    mMonument: M.MudTomb, mFence: F.MudWall, mBridge: BR.Slab,
    mPlaster: [[0.7, 0.52, 0.36], [0.66, 0.49, 0.34], [0.74, 0.56, 0.39]], mAdobe: [[0.68, 0.5, 0.34], [0.64, 0.47, 0.32], [0.72, 0.54, 0.37]],
    mStone: [0.6, 0.48, 0.36], mWallBody: [0.68, 0.5, 0.34], mWallStone: [0.6, 0.45, 0.32], mWallCap: [0.7, 0.52, 0.36], mTowerBody: [0.68, 0.5, 0.34],
    mWood: [0.58, 0.48, 0.34], mShutter: [[0.36, 0.26, 0.18], [0.44, 0.32, 0.2]], mDirt: [0.74, 0.58, 0.42], mGreen: [0.44, 0.5, 0.24],
    mPebble: [[0.7, 0.58, 0.44], [0.64, 0.52, 0.4], [0.76, 0.64, 0.5]],
});
CForgeTheme.Push("africa_medieval_south", {
    mLabel: "아프리카_중세_남부(짐바브웨)", mRegion: "south", mHouseWall: [13], mHut: 1, mParapet: 0, mToron: false, mChurch: 8, mWallStyle: 1, mGround: [[0.66, 0.62, 0.36], [0.56, 0.54, 0.3]], mArid: false,
    mMonument: M.BirdPillar, mFence: F.DryStone,
    mStone: [0.68, 0.64, 0.57], mWallBody: [0.66, 0.62, 0.55], mWallStone: [0.6, 0.56, 0.5], mWallCap: [0.7, 0.66, 0.58], mTowerBody: [0.66, 0.62, 0.55],
    mAdobe: [[0.66, 0.46, 0.32], [0.7, 0.5, 0.35], [0.62, 0.44, 0.3]], mThatch: [[0.7, 0.6, 0.4], [0.66, 0.56, 0.37], [0.74, 0.64, 0.44]],
}, "africa_medieval_sahel");
CForgeTheme.Push("africa_earlymodern_south", {
    mLabel: "아프리카_근세_남부(줄루)", mEra: ER.EarlyModern, mHut: 2, mChurch: 9, mWallKind: 1, mTowerKind: 1, mRoofKind: [1], mMonument: M.Cairn, mFence: F.Brush, mGround: [[0.5, 0.6, 0.3], [0.42, 0.52, 0.26]],
    mThatch: [[0.72, 0.62, 0.42], [0.68, 0.58, 0.38], [0.76, 0.66, 0.46]], mLogWood: [[0.5, 0.4, 0.28], [0.44, 0.35, 0.24]], mWood: [0.44, 0.34, 0.22],
}, "africa_medieval_south");
CForgeTheme.Push("africa_modern_south", {
    mLabel: "아프리카_근대_남부(은데벨레)", mEra: ER.Modern, mHouseWall: [17], mChurch: 2, mMonument: M.Cross, mFence: F.MudWall, mWallKind: 0, mWallStyle: 2, mTowerKind: 0,
    mPlaster: [[0.95, 0.94, 0.9], [0.93, 0.92, 0.88]], mTowerBody: [0.94, 0.93, 0.89], mWallStone: [0.62, 0.5, 0.38], mRoof: [[0.72, 0.62, 0.42]],
}, "africa_earlymodern_south");
CForgeTheme.Push("mongol_medieval", {
    mLabel: "몽골_중세(제국)", mCulture: E.Mongol, mEra: ER.Medieval, mHouseWall: [13], mHut: 0, mChurch: 9, mWallStyle: 2, mTowerKind: 0, mRoofKind: [2], mGround: [[0.56, 0.62, 0.32], [0.48, 0.54, 0.28]],
    mMonument: M.Ovoo, mFence: F.Rail, mBridge: BR.Slab,
    mShutter: [[0.8, 0.36, 0.14], [0.72, 0.22, 0.16], [0.84, 0.5, 0.16]], mWood: [0.5, 0.34, 0.2], mFenceWood: [0.52, 0.4, 0.28],
    mWallBody: [0.68, 0.58, 0.44], mWallStone: [0.62, 0.54, 0.42], mWallCap: [0.66, 0.56, 0.42], mTowerBody: [0.68, 0.58, 0.44],
    mStone: [0.62, 0.6, 0.56], mDirt: [0.62, 0.56, 0.42], mGreen: [0.44, 0.52, 0.28], mCloth: [[0.24, 0.44, 0.76], [0.92, 0.92, 0.9], [0.86, 0.72, 0.2]],
});
CForgeTheme.Push("mongol_earlymodern", {
    mLabel: "몽골_근세(에르데니 조)", mEra: ER.EarlyModern, mChurch: -1, mTemple: 0, mWallStyle: 1, mTowerKind: 0, mMonument: M.Stupa, mTempleSign: "三寶殿",
    mWallBody: [0.95, 0.94, 0.9], mWallStone: [0.72, 0.7, 0.66], mWallCap: [0.3, 0.52, 0.38], mTowerBody: [0.95, 0.94, 0.9],
    mRoof: [[0.3, 0.52, 0.38], [0.34, 0.35, 0.37]], mGlaze: [0.3, 0.52, 0.38], mPillar: [0.66, 0.18, 0.12], mBeam: [0.2, 0.44, 0.46], mBrick: [0.56, 0.57, 0.58],
    mPlaster: [[0.95, 0.94, 0.9], [0.93, 0.92, 0.88]],
}, "mongol_medieval");
