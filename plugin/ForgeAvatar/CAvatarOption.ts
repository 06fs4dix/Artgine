//아바타 설정. 저장은 이 값만 하고 불러오면 같은 설정으로 다시 조립한다.
//무작위 생성은 결정된 값을 그대로 남겨, 생성 규칙이 바뀌어도 저장한 아바타가 달라지지 않는다
export class CAvatarOption
{
    static sVersion = 1;
    static eKind = { Vocaloid : "vocaloid", Roblox : "roblox" } as const;
    static eGender = { Female : "female", Male : "male" } as const;
    static eSlot = { Body : "Body", Arms : "Arms", Legs : "Legs", Feet : "Feet", Head : "Head", Acc : "Acc" } as const;
    //종류마다 읽는 키가 다르다. 다른 종류의 키는 저장만 되고 그 종류에서는 쓰이지 않는다
    static eRoblox = { Height : "height", Width : "width", Depth : "depth", Head : "head", BodyType : "bodyType", Proportion : "proportion" } as const;
    static eVocaloid = { Height : "height", Bust : "bust", Face : "face", Hair : "hair" } as const;
    static eCloth = { Body : "cloth.body", Arms : "cloth.arms", Legs : "cloth.legs", Feet : "cloth.feet", Head : "cloth.head", Acc : "cloth.acc" } as const;

    mVersion = CAvatarOption.sVersion;
    mRandom = false;            //true면 Push 때 비어 있는 값을 시드로 채우고 false로 바꾼다
    mSeed = 0;
    mKind : string = CAvatarOption.eKind.Roblox;
    mGender : string = CAvatarOption.eGender.Female;
    //키는 전체 배율(상하좌우 같은 비율). 너비·두께는 예전 저장값 호환용으로 남겨 두고 키에 곱한다
    //체중(mFat) : -1 마름 ~ 0 기본 ~ 1 뚱뚱
    mHeight = 1;
    mWidth = 1;
    mDepth = 1;
    mHead = 1;
    //로블록스 R15. 체형 0은 기본 R15, 1은 더 길고 가늘다. 비율은 체형이 0이면 적용되지 않는다
    mBodyType = 0;
    mProportion = 0;
    mFat = 0;
    //세부 체형(0 기본, -1~1). 눈은 배율(0.6~1.6). 가슴·표정은 보컬로이드만 쓴다
    mBust = 0;
    mBelly = 0;
    mHip = 0;
    mEye = 1;
    mFace = "";
    mSkin : number[] = [1, 1, 1];
    mHair = "";
    mHairColor : number[] = [1, 1, 1];
    mOutfit : Record<string, string> = {};
    mRig : string = "Auto";
    mFeature : Record<string, boolean> = { look : true, hold : true, foot : true };
    mAni = "Idle";
    mTune : Record<string, number | string> = {};

    constructor(_init : Partial<CAvatarOption> = null)
    {
        if(_init != null) Object.assign(this, _init);
        this.Pull();
        this.Seed();
    }

    //mTune에 있는 키만 필드에 덮어쓴다. 예전 저장본은 mTune이 없어서 필드가 그대로다
    Pull()
    {
        const t = this.mTune ?? {};
        this.mTune = t;
        const num = (_k : string, _cur : number) => typeof t[_k] == "number" ? t[_k] as number : _cur;
        this.mHeight = num("height", this.mHeight);
        this.mWidth = num("width", this.mWidth);
        this.mDepth = num("depth", this.mDepth);
        this.mHead = num("head", this.mHead);
        this.mBodyType = num("bodyType", this.mBodyType);
        this.mProportion = num("proportion", this.mProportion);
        this.mBust = num("bust", this.mBust);
        if(typeof t["face"] == "string") this.mFace = t["face"] as string;
        if(typeof t["hair"] == "string") this.mHair = t["hair"] as string;
        for(const [slot, key] of Object.entries(CAvatarOption.eCloth))
        {
            if(typeof t[key] != "string") continue;
            const v = t[key] as string;
            if(v == "") delete this.mOutfit[slot];
            else this.mOutfit[slot] = v;
        }
    }
    //비어 있는 조절 키만 현재 필드로 채운다
    Seed()
    {
        const t = this.mTune;
        const set = (_k : string, _v : number | string) => { if(t[_k] === undefined) t[_k] = _v; };
        set("height", this.mHeight);
        set("width", this.mWidth);
        set("depth", this.mDepth);
        set("head", this.mHead);
        set("bodyType", this.mBodyType);
        set("proportion", this.mProportion);
        set("bust", this.mBust);
        set("face", this.mFace);
        set("hair", this.mHair);
        for(const [slot, key] of Object.entries(CAvatarOption.eCloth))
            if(this.mOutfit[slot] != null) set(key, this.mOutfit[slot]);
    }
    //필드를 조절 키에 다시 적는다. 무작위로 필드를 채운 뒤에 쓴다
    Stamp()
    {
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
        for(const [slot, key] of Object.entries(CAvatarOption.eCloth))
        {
            if(this.mOutfit[slot] != null) t[key] = this.mOutfit[slot];
            else delete t[key];
        }
    }
    static SlotOf(_slot : string) : string
    {
        for(const [name, key] of Object.entries(CAvatarOption.eCloth))
            if(name == _slot || key == _slot) return name;
        return null;
    }

    ExportJson() : string
    {
        const o : any = {};
        for(const k of Object.keys(this)) o[k] = (this as any)[k];
        return JSON.stringify(o);
    }
    static ImportJson(_json : string | object) : CAvatarOption
    {
        const o = typeof _json == "string" ? JSON.parse(_json) : _json;
        const r = new CAvatarOption();
        for(const k of Object.keys(r)) if(o[k] !== undefined) (r as any)[k] = o[k];
        r.mVersion = CAvatarOption.sVersion;
        r.Pull();
        r.Seed();
        return r;
    }
    Clone() : CAvatarOption { return CAvatarOption.ImportJson(this.ExportJson()); }

    static Rand(_seed : number) : () => number
    {
        let a = _seed >>> 0;
        return () =>
        {
            a = (a + 0x6D2B79F5) >>> 0;
            let t = Math.imul(a ^ (a >>> 15), 1 | a);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }
}
