export class CAvatarOption {
    static sVersion = 1;
    static eKind = { Vocaloid: "vocaloid", Roblox: "roblox" };
    static eGender = { Female: "female", Male: "male" };
    static eSlot = { Body: "Body", Arms: "Arms", Legs: "Legs", Feet: "Feet", Head: "Head", Acc: "Acc" };
    static eRoblox = { Height: "height", Width: "width", Depth: "depth", Head: "head", BodyType: "bodyType", Proportion: "proportion" };
    static eVocaloid = { Height: "height", Bust: "bust", Face: "face", Hair: "hair" };
    static eCloth = { Body: "cloth.body", Arms: "cloth.arms", Legs: "cloth.legs", Feet: "cloth.feet", Head: "cloth.head", Acc: "cloth.acc" };
    mVersion = CAvatarOption.sVersion;
    mRandom = false;
    mSeed = 0;
    mKind = CAvatarOption.eKind.Roblox;
    mGender = CAvatarOption.eGender.Female;
    mHeight = 1;
    mWidth = 1;
    mDepth = 1;
    mHead = 1;
    mBodyType = 0;
    mProportion = 0;
    mFat = 0;
    mBust = 0;
    mBelly = 0;
    mHip = 0;
    mEye = 1;
    mFace = "";
    mSkin = [1, 1, 1];
    mHair = "";
    mHairColor = [1, 1, 1];
    mOutfit = {};
    mRig = "Auto";
    mFeature = { look: true, hold: true, foot: true };
    mAni = "Idle";
    mTune = {};
    constructor(_init = null) {
        if (_init != null)
            Object.assign(this, _init);
        this.Pull();
        this.Seed();
    }
    Pull() {
        const t = this.mTune ?? {};
        this.mTune = t;
        const num = (_k, _cur) => typeof t[_k] == "number" ? t[_k] : _cur;
        this.mHeight = num("height", this.mHeight);
        this.mWidth = num("width", this.mWidth);
        this.mDepth = num("depth", this.mDepth);
        this.mHead = num("head", this.mHead);
        this.mBodyType = num("bodyType", this.mBodyType);
        this.mProportion = num("proportion", this.mProportion);
        this.mBust = num("bust", this.mBust);
        if (typeof t["face"] == "string")
            this.mFace = t["face"];
        if (typeof t["hair"] == "string")
            this.mHair = t["hair"];
        for (const [slot, key] of Object.entries(CAvatarOption.eCloth)) {
            if (typeof t[key] != "string")
                continue;
            const v = t[key];
            if (v == "")
                delete this.mOutfit[slot];
            else
                this.mOutfit[slot] = v;
        }
    }
    Seed() {
        const t = this.mTune;
        const set = (_k, _v) => { if (t[_k] === undefined)
            t[_k] = _v; };
        set("height", this.mHeight);
        set("width", this.mWidth);
        set("depth", this.mDepth);
        set("head", this.mHead);
        set("bodyType", this.mBodyType);
        set("proportion", this.mProportion);
        set("bust", this.mBust);
        set("face", this.mFace);
        set("hair", this.mHair);
        for (const [slot, key] of Object.entries(CAvatarOption.eCloth))
            if (this.mOutfit[slot] != null)
                set(key, this.mOutfit[slot]);
    }
    Stamp() {
        const t = this.mTune;
        t["height"] = this.mHeight;
        t["width"] = this.mWidth;
        t["depth"] = this.mDepth;
        t["head"] = this.mHead;
        t["bodyType"] = this.mBodyType;
        t["proportion"] = this.mProportion;
        t["bust"] = this.mBust;
        t["face"] = this.mFace;
        t["hair"] = this.mHair;
        for (const [slot, key] of Object.entries(CAvatarOption.eCloth)) {
            if (this.mOutfit[slot] != null)
                t[key] = this.mOutfit[slot];
            else
                delete t[key];
        }
    }
    static SlotOf(_slot) {
        for (const [name, key] of Object.entries(CAvatarOption.eCloth))
            if (name == _slot || key == _slot)
                return name;
        return null;
    }
    ExportJson() {
        const o = {};
        for (const k of Object.keys(this))
            o[k] = this[k];
        return JSON.stringify(o);
    }
    static ImportJson(_json) {
        const o = typeof _json == "string" ? JSON.parse(_json) : _json;
        const r = new CAvatarOption();
        for (const k of Object.keys(r))
            if (o[k] !== undefined)
                r[k] = o[k];
        r.mVersion = CAvatarOption.sVersion;
        r.Pull();
        r.Seed();
        return r;
    }
    Clone() { return CAvatarOption.ImportJson(this.ExportJson()); }
    static Rand(_seed) {
        let a = _seed >>> 0;
        return () => {
            a = (a + 0x6D2B79F5) >>> 0;
            let t = Math.imul(a ^ (a >>> 15), 1 | a);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }
}
