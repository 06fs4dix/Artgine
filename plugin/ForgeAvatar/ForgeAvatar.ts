import { CUpdate } from "../../artgine/basic/Basic.js";
import { CUtil } from "../../artgine/basic/CUtil.js";
import { CTree } from "../../artgine/basic/CTree.js";
import { CCanvas } from "../../artgine/app/canvas/CCanvas.js";
import { CSubject } from "../../artgine/app/subject/CSubject.js";
import { CComponent } from "../../artgine/app/component/CComponent.js";
import { CAnimation, CClipMesh } from "../../artgine/app/component/CAnimation.js";
import { CMesh } from "../../artgine/render/CMesh.js";
import { CLoaderOption } from "../../artgine/util/CLoader.js";
import { CAvatarOption } from "./CAvatarOption.js";
import { CAvatarRig } from "./CAvatarRig.js";
import { CAvatarCloth } from "./CAvatarCloth.js";
import { CSubjectAvatar } from "./CSubjectAvatar.js";
import { CAvatarShape, IAvatarAnchor, IAvatarShape } from "./CAvatarShape.js";

export { CAvatarShape } from "./CAvatarShape.js";
export { CAvatarSkin } from "./CAvatarSkin.js";
export { CAvatarMerge } from "./CAvatarMerge.js";
export { CAvatarIK, CAvatarFoot } from "./CAvatarIK.js";
export { CAvatarPanel } from "./CAvatarPanel.js";
export { CAvatarFat } from "./CAvatarFat.js";
import { CAvatarFat } from "./CAvatarFat.js";
import { CAvatarMerge, IAvatarMergePart } from "./CAvatarMerge.js";
export { CAvatarOption } from "./CAvatarOption.js";
export { CAvatarRig, CAvatarPoseFix } from "./CAvatarRig.js";
export { CAvatarCloth } from "./CAvatarCloth.js";
export { CSubjectAvatar } from "./CSubjectAvatar.js";

interface IAvatarAni { file : string; clip : string; loop : boolean; speed : number; }

class CAvatarFactoryTick extends CComponent
{
    constructor(public mFactory : CAvatarFactory) { super(); this.mSave = false; }
    override Update(_update : CUpdate) : void { super.Update(_update); this.mFactory.Tick(_update.DeltaTime()); }
}

//아바타 공장. 베이스 리소스·애니메이션을 한 번만 불러와 공유하고, Push로 아바타를 할당한다.
//리소스: Quaternius Universal Base Characters / Modular Outfits / Universal Animation Library (CC0)
export class CAvatarFactory
{
    //로더는 키에 "://"가 있으면 "a&b&0" 합성 텍스처 키를 파일로 받으려다 실패한다. 그래서 도메인을 뺀 경로를 쓴다
    static sRes = new URL("./Res/", import.meta.url).pathname;
    static eQuality = { Auto : "Auto", High : "High", Low : "Low" } as const;
    static eTexSize = { Auto : "Auto", T4k : "4k", T2k : "2k", T1k : "1k" } as const;
    static sBody : Record<string, string> = { female : "base/Superhero_Female_FullBody.gltf", male : "base/Superhero_Male_FullBody.gltf" };
    //VRoid 공식 샘플 Sendagaya Shino (CC0). 몸(피부·얼굴·머리카락)과 의상을 나눠 둔다. 단위는 미터
    static sVocaloid = new URL("./Res/vocal/Shino.glb", import.meta.url).pathname;
    static sVocalOutfit = new URL("./Res/vocal/Shino_Outfit.glb", import.meta.url).pathname;
    static sHair : Record<string, string> = {
        Long : "hair/Hair_Long.gltf", Buns : "hair/Hair_Buns.gltf", Parted : "hair/Hair_SimpleParted.gltf",
        Buzzed : "hair/Hair_Buzzed.gltf", BuzzedFemale : "hair/Hair_BuzzedFemale.gltf", Beard : "hair/Hair_Beard.gltf",
    };
    static sHairOf : Record<string, string[]> = { female : ["Long", "Buns", "Parted", "BuzzedFemale"], male : ["Parted", "Buzzed", "Beard", "Long"] };
    //성별 → 스타일 → 슬롯 → 파일
    static sOutfit : Record<string, Record<string, Record<string, string>>> = {
        female : {
            Peasant : { Body : "Female_Peasant_Body", Arms : "Female_Peasant_Arms", Legs : "Female_Peasant_Legs", Feet : "Female_Peasant_Feet" },
            Ranger : { Body : "Female_Ranger_Body", Arms : "Female_Ranger_Arms", Legs : "Female_Ranger_Legs", Feet : "Female_Ranger_Feet", Head : "Female_Ranger_Head_Hood", Acc : "Female_Ranger_Acc_Pauldrons" },
        },
        male : {
            Peasant : { Body : "Male_Peasant_Body", Arms : "Male_Peasant_Arms", Legs : "Male_Peasant_Legs", Feet : "Male_Peasant_Feet" },
            Ranger : { Body : "Male_Ranger_Body", Arms : "Male_Ranger_Arms", Legs : "Male_Ranger_Legs", Feet : "Male_Ranger_Feet_Boots", Head : "Male_Ranger_Head_Hood", Acc : "Male_Ranger_Acc_Pauldron" },
        },
    };
    static sDefaultFile = ["anim/UAL1.glb", "anim/UAL2.glb"];
    //보컬로이드 전용 클립. 같은 별칭이 UAL에 있어도 보컬로이드는 이 파일을 재생한다. 출처는 Res/anim/vocal/LICENSE.txt
    static sVocalAni : { file : string, name : string, loop : boolean }[] = [
        { file : "anim/vocal/Idle.glb", name : "Idle", loop : true },
        { file : "anim/vocal/Talk.glb", name : "Talk", loop : true },
        { file : "anim/vocal/Greeting.glb", name : "Greeting", loop : true },
        { file : "anim/vocal/Pose.glb", name : "Pose", loop : true },
        { file : "anim/vocal/Squat.glb", name : "Squat", loop : true },
        { file : "anim/vocal/Test.glb", name : "Test", loop : true },
    ];
    //로블록스 기본 애니메이션 이름 → 리소스 클립
    static sDefaultAni : Record<string, string> = {
        Idle : "Idle_Loop", Walk : "Walk_Loop", Run : "Jog_Fwd_Loop", Sprint : "Sprint_Loop",
        Jump : "Jump_Start", Fall : "Jump_Loop", Land : "Jump_Land", Climb : "ClimbUp_1m",
        Swim : "Swim_Fwd_Loop", SwimIdle : "Swim_Idle_Loop", Sit : "Sitting_Idle_Loop",
        Dance : "Dance_Loop", Cheer : "Yes", Crouch : "Crouch_Idle_Loop", Death : "Death01",
    };
    static sOneShot = new Set(["Jump", "Land", "Death", "Cheer"]);
    static sSkin = [[1, 1, 1], [1, 0.9, 0.82], [0.92, 0.78, 0.66], [0.78, 0.6, 0.46], [0.58, 0.42, 0.32], [0.42, 0.3, 0.24]];
    static sHairColor = [[1, 1, 1], [0.35, 0.25, 0.18], [0.15, 0.12, 0.1], [0.9, 0.75, 0.45], [0.7, 0.3, 0.15], [0.6, 0.6, 0.62]];

    mCanvas : CCanvas;
    mRes : string;
    mUnit = 100;
    //조명·그림자 패스가 있는 씬에서만 켠다(태그가 붙으면 그 패스로만 그려진다)
    mLight = false;
    mAni = new Map<string, IAvatarAni>();
    private mVocal = new Map<string, IAvatarAni>();
    mAvatar = new Set<CSubjectAvatar>();
    //null이 아니면 모든 아바타를 이 리그로 강제한다(성능이 모자랄 때 "R6")
    mForceRig : string = null;
    mQuality : string = CAvatarFactory.eQuality.Auto;
    mTier : string = CAvatarRig.eRig.R15;
    mMinFps = 30;
    mFps = 60;
    //Res/textures(4k)·textures_2k·textures_1k 중 무엇을 쓸지. 첫 메시를 불러오기 전에 정해야 한다
    mTexSize : string = CAvatarFactory.eTexSize.Auto;
    //몸·옷·머리카락을 한 메시·한 페인트로 합친다(꺼면 파츠별 페인트 + 본 복사)
    mMerge = true;
    //지면 높이(월드 x,z → y). 있으면 아바타가 지면에 붙고 발 IK(feature "foot")가 두 발을 각자 지면에 맞춘다
    mGround : (_x : number, _z : number) => number = null;
    private mAniObj = new Map<string, CAnimation>();
    private mUserAni = new Set<string>();
    private mLoad = new Map<string, Promise<boolean>>();
    private mAniFile = new Set<string>();
    private mPruned = new Set<string>();
    private mVariant = new Map<string, string>();
    private mVariantWait = new Map<string, Promise<string>>();
    private mAnchor = new Map<string, IAvatarAnchor>();
    private mFatBone = new Map<string, CAvatarFat["mBone"]>();
    private mFpsTime = 0;
    private mFpsCount = 0;
    private mLowRun = 0;
    private mHighRun = 0;
    private mId : number;
    private static sCount = 0;

    constructor(_canvas : CCanvas, _res : string = CAvatarFactory.sRes)
    {
        this.mCanvas = _canvas;
        this.mRes = _res.endsWith("/") ? _res : _res + "/";
        this.mId = ++CAvatarFactory.sCount;
        for(const f of CAvatarFactory.sDefaultFile) this.mAniFile.add(this.mRes + f);
        for(const a of CAvatarFactory.sVocalAni) this.mAniFile.add(this.mRes + a.file);
        const tick = new CSubject();
        tick.mSave = false;
        tick.PushComp(new CAvatarFactoryTick(this));
        _canvas.PushSub(tick);
    }

    //외부 애니메이션 등록. 같은 이름이면 기본을 대체한다. 파일 경로는 페이지 기준(또는 절대 URL)
    PushAni(_name : string, _file : string, _clip : string = _name, _loop = true, _speed = 1) : Promise<boolean>
    {
        this.mUserAni.add(_name);
        this.mAni.set(_name, { file : _file, clip : _clip, loop : _loop, speed : _speed });
        this.mAniObj.delete("r:" + _name);
        this.mAniObj.delete("v:" + _name);
        this.mAniFile.add(_file);
        return this.LoadAni();
    }
    //애니메이션 파일을 모두 불러온다. 파일 클립 이름이 로블록스 별칭보다 우선이다. 보컬로이드 별칭은 보컬 파일로 따로 둔다
    async LoadAni() : Promise<boolean>
    {
        const pinned = this.mUserAni;
        const files = [...this.mAniFile], res = this.mCanvas.GetFrame().Res();
        const bodies = Object.values(CAvatarFactory.sBody).map(f => this.Res(f));
        const vocal = [CAvatarFactory.sVocaloid, CAvatarFactory.sVocalOutfit];
        if(!await this.Load(bodies) || !await this.Load(vocal) || !await this.Load(files)) return false;
        const sets : Set<string>[] = [];
        const Collect = (_t : CTree<any>, _s : Set<string>) =>
        {
            for(let c = _t; c != null; c = c.mColleague)
            {
                _s.add(c.mKey);
                if(c.mChild != null) Collect(c.mChild, _s);
            }
        };
        for(const b of [...bodies, CAvatarFactory.sVocaloid])
        {
            const mesh = res.Find(b) as CMesh;
            if(mesh?.meshTree == null) continue;
            const s = new Set<string>();
            Collect(mesh.meshTree, s);
            if(s.size > 0) sets.push(s);
        }
        //전환 보간은 몸에 없는 본에서 멈춘다. 공용 클립은 두 몸에 모두 있는 본만 남긴다
        const keep = new Set<string>();
        if(sets.length > 0)
            for(const name of sets[0])
                if(sets.every(s => s.has(name))) keep.add(name);
        const Loop = (_file : string, _clip : string) =>
        {
            for(const spec of CAvatarFactory.sVocalAni)
                if(this.mRes + spec.file == _file) return spec.loop;
            return /_Loop$/.test(_clip);
        };
        const Put = (_name : string, _file : string, _clip : string, _overwrite : boolean) =>
        {
            if(pinned.has(_name)) return;
            if(!_overwrite && this.mAni.has(_name)) return;
            this.mAni.set(_name, { file : _file, clip : _clip, loop : Loop(_file, _clip), speed : 1 });
        };
        for(const b of [...bodies, ...vocal])
        {
            const mesh = res.Find(b) as CMesh;
            if(mesh == null) continue;
            for(const clip of mesh.aniMap.keys()) Put(clip, b, clip, false);
        }
        for(const file of files)
        {
            const mesh = res.Find(file) as CMesh;
            if(mesh == null) continue;
            if(!this.mPruned.has(file) && keep.size > 0)
            {
                CAvatarRig.Prune(mesh, keep);
                this.mPruned.add(file);
            }
            for(const clip of mesh.aniMap.keys()) Put(clip, file, clip, true);
        }
        for(const [name, clip] of Object.entries(CAvatarFactory.sDefaultAni))
        {
            if(pinned.has(name) || this.mAni.has(name)) continue;
            const src = this.mAni.get(clip);
            if(src != null) this.mAni.set(name, { ...src, loop : !CAvatarFactory.sOneShot.has(name) });
        }
        this.mVocal.clear();
        for(const spec of CAvatarFactory.sVocalAni)
        {
            if(pinned.has(spec.name))
            {
                const ext = this.mAni.get(spec.name);
                if(ext != null) this.mVocal.set(spec.name, ext);
                continue;
            }
            const file = this.mRes + spec.file;
            const mesh = res.Find(file) as CMesh;
            const clip = mesh?.aniMap.keys().next().value as string;
            if(clip == null) continue;
            this.mVocal.set(spec.name, { file, clip, loop : spec.loop, speed : 1 });
            if(!this.mAni.has(spec.name)) this.mAni.set(spec.name, { file, clip, loop : spec.loop, speed : 1 });
        }
        this.mAniObj.clear();
        return true;
    }
    Build() : Promise<boolean> { return this.LoadAni(); }
    GetAniList(_kind : string = CAvatarOption.eKind.Roblox) : string[]
    {
        if(_kind == null) return [];
        if(_kind == CAvatarOption.eKind.Vocaloid) return [...this.mVocal.keys()];
        return [...this.mAni.keys()];
    }
    GetAni(_name : string, _kind : string = CAvatarOption.eKind.Roblox) : CAnimation
    {
        if(_kind == null || _name == null) return null;
        const vocal = _kind == CAvatarOption.eKind.Vocaloid;
        const key = (vocal ? "v:" : "r:") + _name;
        let ani = this.mAniObj.get(key);
        if(ani != null) return ani;
        const a = (vocal ? this.mVocal : this.mAni).get(_name);
        if(a == null) return null;
        const mesh = this.mCanvas.GetFrame().Res().Find(a.file) as CMesh;
        const info = mesh?.aniMap.get(a.clip);
        if(info == null) return null;
        const dur = Math.max(0.05, (info.end - info.start) / 1000 / a.speed);
        ani = new CAnimation();
        ani.Push(new CClipMesh(0, dur, a.clip, a.file));
        ani.mLoop = a.loop;
        this.mAniObj.set(key, ani);
        return ani;
    }

    //로더가 메시를 등록하자마자 텍스처를 받기 때문에 불러온 뒤 키를 바꿀 수 없다. 텍스처 경로만 다른 X.1k.gltf·X.2k.gltf를 고른다
    Res(_path : string) : string
    {
        const size = this.GetTexSize();
        if(size == CAvatarFactory.eTexSize.T4k || !_path.endsWith(".gltf")) return this.mRes + _path;
        return this.mRes + _path.substring(0, _path.length - 5) + "." + size + ".gltf";
    }
    GetTexSize() : string
    {
        if(this.mTexSize != CAvatarFactory.eTexSize.Auto) return this.mTexSize;
        return CUtil.IsMobile() ? CAvatarFactory.eTexSize.T1k : CAvatarFactory.eTexSize.T2k;
    }

    Load(_files : string[]) : Promise<boolean>
    {
        return Promise.all(_files.map(f => this.LoadOne(f))).then(r => r.every(v => v));
    }
    private LoadOne(_file : string) : Promise<boolean>
    {
        let p = this.mLoad.get(_file);
        if(p != null) return p;
        const frame = this.mCanvas.GetFrame();
        const vocal = _file == CAvatarFactory.sVocaloid || _file == CAvatarFactory.sVocalOutfit;
        const opt = vocal ? new CLoaderOption().Set("mColorTex", true) : null;
        p = Promise.resolve(frame.Res().Find(_file) != null ? null : frame.Load().Exe(_file, opt)).then(() =>
        {
            const mesh = frame.Res().Find(_file) as CMesh;
            if(mesh == null) return false;
            if(vocal) CAvatarRig.Adapt(mesh);
            if(this.mAniFile.has(_file)) CAvatarRig.Retarget(mesh);
            return true;
        });
        this.mLoad.set(_file, p);
        return p;
    }

    Styles(_gender : string, _kind : string = CAvatarOption.eKind.Roblox) : string[]
    {
        if(_kind == CAvatarOption.eKind.Vocaloid) return ["Shino"];
        return Object.keys(CAvatarFactory.sOutfit[_gender] ?? {});
    }
    HasSlot(_gender : string, _style : string, _slot : string, _kind : string = CAvatarOption.eKind.Roblox) : boolean
    {
        if(_kind == CAvatarOption.eKind.Vocaloid) return _style == "Shino" && _slot == CAvatarOption.eSlot.Body;
        return CAvatarFactory.sOutfit[_gender]?.[_style]?.[_slot] != null;
    }
    HairList() : string[] { return Object.keys(CAvatarFactory.sHair); }
    BodyFile(_gender : string, _kind : string = CAvatarOption.eKind.Roblox) : string
    {
        if(_kind == CAvatarOption.eKind.Vocaloid) return CAvatarFactory.sVocaloid;
        return this.Res(CAvatarFactory.sBody[_gender] ?? CAvatarFactory.sBody.female);
    }
    HairFile(_hair : string) : string { const h = CAvatarFactory.sHair[_hair]; return h == null ? null : this.Res(h); }
    PartFiles(_o : CAvatarOption) : string[]
    {
        if(_o.mKind == CAvatarOption.eKind.Vocaloid)
            return _o.mOutfit[CAvatarOption.eSlot.Body] == "" ? [] : [CAvatarFactory.sVocalOutfit];
        const set = CAvatarFactory.sOutfit[_o.mGender] ?? CAvatarFactory.sOutfit.female, out : string[] = [];
        for(const slot of Object.values(CAvatarOption.eSlot))
        {
            const f = set[_o.mOutfit[slot]]?.[slot];
            if(f != null) out.push(this.Res("parts/" + f + ".gltf"));
        }
        return out;
    }
    //체형 값(0.05 단위)마다 변형한 메시를 한 번만 만든다. 기준점은 그 성별의 베이스 몸에서 구한다
    Shape(_file : string, _gender : string, _s : IAvatarShape) : string
    {
        if(_file == null || _file == CAvatarFactory.sVocaloid || _file == CAvatarFactory.sVocalOutfit) return _file;
        const base = this.BodyFile(_gender);
        const res0 = this.mCanvas.GetFrame().Res();
        const bodyMesh0 = res0.Find(base) as CMesh;
        const cpuKey = _file == base ? { bust : 0, belly : _s.belly, hip : _s.hip, eye : _s.eye } : _s;
        if(CAvatarShape.IsNone(cpuKey) && _file != base) return _file;
        const sig = _file + "|" + CAvatarShape.Key(cpuKey);
        let key = this.mVariant.get(sig);
        if(key != null) return key;
        const res = res0;
        const mesh = res.Find(_file) as CMesh, bodyMesh = bodyMesh0;
        if(mesh == null || bodyMesh == null) return _file;
        let anchor = this.mAnchor.get(base);
        if(anchor == null) this.mAnchor.set(base, anchor = CAvatarShape.Anchor(bodyMesh));
        const cpu = cpuKey;
        if(CAvatarShape.IsNone(cpu)) { this.mVariant.set(sig, _file); return _file; }
        key = "forgeavatar" + this.mId + "_shape" + this.mVariant.size + ".mesh";
        res.Push(key, CAvatarCloth.Variant(mesh, null, CAvatarShape.Positions(mesh, anchor, cpu)));
        this.mVariant.set(sig, key);
        return key;
    }
    //옷 조합마다 가려진 몸 면을 뺀 몸 메시를 한 번만 만든다. 계산은 여러 프레임에 나눠 하고, 같은 조합을 동시에 요청하면 한 번만 계산한다
    BodyVariant(_body : string, _parts : string[]) : Promise<string>
    {
        if(_parts.length == 0) return Promise.resolve(_body);
        const sig = _body + "|" + [..._parts].sort().join("|");
        let p = this.mVariantWait.get(sig);
        if(p != null) return p;
        const res = this.mCanvas.GetFrame().Res();
        const body = res.Find(_body) as CMesh;
        const cloth = _parts.map(p => res.Find(p) as CMesh).filter(m => m != null);
        const key = "forgeavatar" + this.mId + "_body" + this.mVariantWait.size + ".mesh";
        p = CAvatarCloth.Hidden(body, cloth).then(hid =>
        {
            res.Push(key, CAvatarCloth.Variant(body, hid));
            return key;
        });
        this.mVariantWait.set(sig, p);
        return p;
    }
    //합친 메시의 R6 경량본(구동 본 7개)
    //성별 베이스 몸에서 본별 체중 기준을 한 번만 구하고, 아바타마다 노드 캐시만 따로 갖는 사본을 준다
    Fat(_gender : string) : CAvatarFat
    {
        const base = this.BodyFile(_gender);
        let bone = this.mFatBone.get(base);
        if(bone == null)
        {
            const mesh = this.mCanvas.GetFrame().Res().Find(base) as CMesh;
            if(mesh == null) return null;
            this.mFatBone.set(base, bone = CAvatarFat.Build(mesh).mBone);
        }
        const fat = new CAvatarFat();
        fat.mBone = bone;
        return fat;
    }
    R6(_key : string) : string
    {
        const sig = "r6|" + _key;
        let key = this.mVariant.get(sig);
        if(key != null) return key;
        const res = this.mCanvas.GetFrame().Res();
        key = "forgeavatar" + this.mId + "_r6_" + this.mVariant.size + ".mesh";
        res.Push(key, CAvatarMerge.Compact(res.Find(_key) as CMesh, CAvatarRig.sR6Driver));
        this.mVariant.set(sig, key);
        return key;
    }
    //몸(HSR 적용본)·옷·머리카락을 한 메시로. 같은 조합·같은 색이면 다시 쓴다
    Merge(_body : string, _bodyTex : Map<string, string>, _parts : string[], _hair : string, _hairTex : Map<string, string>) : string
    {
        const list = _hair == null ? _parts : [..._parts, _hair];
        const sig = "merge|" + _body + "|" + [..._bodyTex].join(",") + "|" + list.join("|") + "|" + [..._hairTex].join(",");
        let key = this.mVariant.get(sig);
        if(key != null) return key;
        const res = this.mCanvas.GetFrame().Res();
        const part : IAvatarMergePart[] = list.map(f => ({ mesh : res.Find(f) as CMesh, tex : f == _hair ? _hairTex : null })).filter(p => p.mesh != null);
        key = "forgeavatar" + this.mId + "_merge" + this.mVariant.size + ".mesh";
        res.Push(key, CAvatarMerge.Merge(res.Find(_body) as CMesh, _bodyTex, part));
        this.mVariant.set(sig, key);
        return key;
    }

    //비어 있는 값을 시드로 채운다. 결과는 옵션에 그대로 남는다
    Randomize(_o : CAvatarOption) : CAvatarOption
    {
        if(!(_o.mSeed > 0)) _o.mSeed = 1 + Math.floor(Math.random() * 2147483646);
        const r = CAvatarOption.Rand(_o.mSeed), Pick = <T>(_a : T[]) : T => _a[Math.floor(r() * _a.length) % _a.length];
        const Range = (_a : number, _b : number) => Math.round((_a + (_b - _a) * r()) * 100) / 100;
        _o.mGender = r() < 0.5 ? CAvatarOption.eGender.Female : CAvatarOption.eGender.Male;
        _o.mHeight = Range(0.9, 1.1);
        _o.mWidth = 1;
        _o.mDepth = 1;
        _o.mFat = Range(-0.4, 0.6);
        _o.mHead = Range(0.95, 1);
        const female = _o.mGender == CAvatarOption.eGender.Female;
        _o.mBust = female ? Range(-0.3, 0.7) : 0;
        _o.mBelly = Range(-0.2, 0.4);
        _o.mHip = female ? Range(-0.2, 0.5) : Range(-0.2, 0.2);
        _o.mEye = Range(0.9, 1.15);
        _o.mSkin = [...Pick(CAvatarFactory.sSkin)];
        _o.mHair = Pick(CAvatarFactory.sHairOf[_o.mGender]);
        _o.mHairColor = [...Pick(CAvatarFactory.sHairColor)];
        const styles = Object.keys(CAvatarFactory.sOutfit[_o.mGender]);
        _o.mOutfit = {};
        for(const slot of Object.values(CAvatarOption.eSlot))
        {
            if((slot == "Head" || slot == "Acc") && r() < 0.6) continue;
            const s = Pick(styles);
            if(CAvatarFactory.sOutfit[_o.mGender][s][slot] != null) _o.mOutfit[slot] = s;
        }
        _o.mKind = _o.mKind || CAvatarOption.eKind.Roblox;
        _o.mRandom = false;
        _o.Stamp();
        return _o;
    }

    //할당. 조립은 리소스가 준비되는 대로 비동기로 끝난다(IsReady). 캔버스에 넣은 아바타를 돌려준다
    Push(_option : CAvatarOption = new CAvatarOption({ mRandom : true })) : CSubjectAvatar
    {
        if(_option.mRandom) this.Randomize(_option);
        const av = new CSubjectAvatar(this, _option);
        this.mAvatar.add(av);
        this.mCanvas.PushSub(av);
        av.Build();
        return av;
    }
    Remove(_av : CSubjectAvatar, _destroy = true)
    {
        if(!this.mAvatar.delete(_av)) return;
        if(_destroy) _av.Destroy();
    }

    SetForceRig(_rig : string)
    {
        this.mForceRig = _rig;
        for(const av of this.mAvatar) av.ApplyRig();
    }
    SetQuality(_q : string)
    {
        this.mQuality = _q;
        this.SetTier(_q == CAvatarFactory.eQuality.Low ? CAvatarRig.eRig.R6 : CAvatarRig.eRig.R15);
    }
    private SetTier(_rig : string)
    {
        if(this.mTier == _rig) return;
        this.mTier = _rig;
        for(const av of this.mAvatar) av.ApplyRig();
    }

    //Auto일 때 2초 평균 FPS가 연속 두 번 기준 아래면 R6로 낮추고, 기준의 1.5배 위로 다섯 번 연속이면 되돌린다
    Tick(_dt : number)
    {
        this.mFpsTime += _dt;
        this.mFpsCount++;
        if(this.mFpsTime < 2) return;
        this.mFps = this.mFpsCount / this.mFpsTime;
        this.mFpsTime = 0;
        this.mFpsCount = 0;
        if(this.mQuality != CAvatarFactory.eQuality.Auto) return;
        if(this.mFps < this.mMinFps) { this.mLowRun++; this.mHighRun = 0; }
        else if(this.mFps > this.mMinFps * 1.5) { this.mHighRun++; this.mLowRun = 0; }
        else { this.mLowRun = 0; this.mHighRun = 0; }
        if(this.mLowRun >= 2) this.SetTier(CAvatarRig.eRig.R6);
        else if(this.mHighRun >= 5) this.SetTier(CAvatarRig.eRig.R15);
    }
}
