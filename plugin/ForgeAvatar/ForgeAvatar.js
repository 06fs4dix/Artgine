import { CUtil } from "../../artgine/basic/CUtil.js";
import { CSubject } from "../../artgine/app/subject/CSubject.js";
import { CComponent } from "../../artgine/app/component/CComponent.js";
import { CAnimation, CClipMesh } from "../../artgine/app/component/CAnimation.js";
import { CLoaderOption } from "../../artgine/util/CLoader.js";
import { CAvatarOption } from "./CAvatarOption.js";
import { CAvatarRig } from "./CAvatarRig.js";
import { CAvatarCloth } from "./CAvatarCloth.js";
import { CSubjectAvatar } from "./CSubjectAvatar.js";
import { CAvatarShape } from "./CAvatarShape.js";
export { CAvatarShape } from "./CAvatarShape.js";
export { CAvatarSkin } from "./CAvatarSkin.js";
export { CAvatarMerge } from "./CAvatarMerge.js";
export { CAvatarIK, CAvatarFoot } from "./CAvatarIK.js";
export { CAvatarPanel } from "./CAvatarPanel.js";
export { CAvatarFat } from "./CAvatarFat.js";
import { CAvatarFat } from "./CAvatarFat.js";
import { CAvatarMerge } from "./CAvatarMerge.js";
export { CAvatarOption } from "./CAvatarOption.js";
export { CAvatarRig, CAvatarPoseFix } from "./CAvatarRig.js";
export { CAvatarCloth } from "./CAvatarCloth.js";
export { CSubjectAvatar } from "./CSubjectAvatar.js";
class CAvatarFactoryTick extends CComponent {
    mFactory;
    constructor(mFactory) {
        super();
        this.mFactory = mFactory;
        this.mSave = false;
    }
    Update(_update) { super.Update(_update); this.mFactory.Tick(_update.DeltaTime()); }
}
export class CAvatarFactory {
    static sRes = new URL("./Res/", import.meta.url).pathname;
    static eQuality = { Auto: "Auto", High: "High", Low: "Low" };
    static eTexSize = { Auto: "Auto", T4k: "4k", T2k: "2k", T1k: "1k" };
    static sBody = { female: "base/Superhero_Female_FullBody.gltf", male: "base/Superhero_Male_FullBody.gltf" };
    static sVocaloid = new URL("./Res/vocal/Shino.glb", import.meta.url).pathname;
    static sVocalOutfit = new URL("./Res/vocal/Shino_Outfit.glb", import.meta.url).pathname;
    static sHair = {
        Long: "hair/Hair_Long.gltf", Buns: "hair/Hair_Buns.gltf", Parted: "hair/Hair_SimpleParted.gltf",
        Buzzed: "hair/Hair_Buzzed.gltf", BuzzedFemale: "hair/Hair_BuzzedFemale.gltf", Beard: "hair/Hair_Beard.gltf",
    };
    static sHairOf = { female: ["Long", "Buns", "Parted", "BuzzedFemale"], male: ["Parted", "Buzzed", "Beard", "Long"] };
    static sOutfit = {
        female: {
            Peasant: { Body: "Female_Peasant_Body", Arms: "Female_Peasant_Arms", Legs: "Female_Peasant_Legs", Feet: "Female_Peasant_Feet" },
            Ranger: { Body: "Female_Ranger_Body", Arms: "Female_Ranger_Arms", Legs: "Female_Ranger_Legs", Feet: "Female_Ranger_Feet", Head: "Female_Ranger_Head_Hood", Acc: "Female_Ranger_Acc_Pauldrons" },
        },
        male: {
            Peasant: { Body: "Male_Peasant_Body", Arms: "Male_Peasant_Arms", Legs: "Male_Peasant_Legs", Feet: "Male_Peasant_Feet" },
            Ranger: { Body: "Male_Ranger_Body", Arms: "Male_Ranger_Arms", Legs: "Male_Ranger_Legs", Feet: "Male_Ranger_Feet_Boots", Head: "Male_Ranger_Head_Hood", Acc: "Male_Ranger_Acc_Pauldron" },
        },
    };
    static sDefaultFile = ["anim/UAL1.glb", "anim/UAL2.glb"];
    static sVocalAni = [
        { file: "anim/vocal/Idle.glb", name: "Idle", loop: true },
        { file: "anim/vocal/Talk.glb", name: "Talk", loop: true },
        { file: "anim/vocal/Greeting.glb", name: "Greeting", loop: true },
        { file: "anim/vocal/Pose.glb", name: "Pose", loop: true },
        { file: "anim/vocal/Squat.glb", name: "Squat", loop: true },
        { file: "anim/vocal/Test.glb", name: "Test", loop: true },
    ];
    static sDefaultAni = {
        Idle: "Idle_Loop", Walk: "Walk_Loop", Run: "Jog_Fwd_Loop", Sprint: "Sprint_Loop",
        Jump: "Jump_Start", Fall: "Jump_Loop", Land: "Jump_Land", Climb: "ClimbUp_1m",
        Swim: "Swim_Fwd_Loop", SwimIdle: "Swim_Idle_Loop", Sit: "Sitting_Idle_Loop",
        Dance: "Dance_Loop", Cheer: "Yes", Crouch: "Crouch_Idle_Loop", Death: "Death01",
    };
    static sOneShot = new Set(["Jump", "Land", "Death", "Cheer"]);
    static sSkin = [[1, 1, 1], [1, 0.9, 0.82], [0.92, 0.78, 0.66], [0.78, 0.6, 0.46], [0.58, 0.42, 0.32], [0.42, 0.3, 0.24]];
    static sHairColor = [[1, 1, 1], [0.35, 0.25, 0.18], [0.15, 0.12, 0.1], [0.9, 0.75, 0.45], [0.7, 0.3, 0.15], [0.6, 0.6, 0.62]];
    mCanvas;
    mRes;
    mUnit = 100;
    mLight = false;
    mAni = new Map();
    mVocal = new Map();
    mAvatar = new Set();
    mForceRig = null;
    mQuality = CAvatarFactory.eQuality.Auto;
    mTier = CAvatarRig.eRig.R15;
    mMinFps = 30;
    mFps = 60;
    mTexSize = CAvatarFactory.eTexSize.Auto;
    mMerge = true;
    mGround = null;
    mAniObj = new Map();
    mUserAni = new Set();
    mLoad = new Map();
    mAniFile = new Set();
    mPruned = new Set();
    mVariant = new Map();
    mVariantWait = new Map();
    mAnchor = new Map();
    mFatBone = new Map();
    mFpsTime = 0;
    mFpsCount = 0;
    mLowRun = 0;
    mHighRun = 0;
    mId;
    static sCount = 0;
    constructor(_canvas, _res = CAvatarFactory.sRes) {
        this.mCanvas = _canvas;
        this.mRes = _res.endsWith("/") ? _res : _res + "/";
        this.mId = ++CAvatarFactory.sCount;
        for (const f of CAvatarFactory.sDefaultFile)
            this.mAniFile.add(this.mRes + f);
        for (const a of CAvatarFactory.sVocalAni)
            this.mAniFile.add(this.mRes + a.file);
        const tick = new CSubject();
        tick.mSave = false;
        tick.PushComp(new CAvatarFactoryTick(this));
        _canvas.PushSub(tick);
    }
    PushAni(_name, _file, _clip = _name, _loop = true, _speed = 1) {
        this.mUserAni.add(_name);
        this.mAni.set(_name, { file: _file, clip: _clip, loop: _loop, speed: _speed });
        this.mAniObj.delete("r:" + _name);
        this.mAniObj.delete("v:" + _name);
        this.mAniFile.add(_file);
        return this.LoadAni();
    }
    async LoadAni() {
        const pinned = this.mUserAni;
        const files = [...this.mAniFile], res = this.mCanvas.GetFrame().Res();
        const bodies = Object.values(CAvatarFactory.sBody).map(f => this.Res(f));
        const vocal = [CAvatarFactory.sVocaloid, CAvatarFactory.sVocalOutfit];
        if (!await this.Load(bodies) || !await this.Load(vocal) || !await this.Load(files))
            return false;
        const sets = [];
        const Collect = (_t, _s) => {
            for (let c = _t; c != null; c = c.mColleague) {
                _s.add(c.mKey);
                if (c.mChild != null)
                    Collect(c.mChild, _s);
            }
        };
        for (const b of [...bodies, CAvatarFactory.sVocaloid]) {
            const mesh = res.Find(b);
            if (mesh?.meshTree == null)
                continue;
            const s = new Set();
            Collect(mesh.meshTree, s);
            if (s.size > 0)
                sets.push(s);
        }
        const keep = new Set();
        if (sets.length > 0)
            for (const name of sets[0])
                if (sets.every(s => s.has(name)))
                    keep.add(name);
        const Loop = (_file, _clip) => {
            for (const spec of CAvatarFactory.sVocalAni)
                if (this.mRes + spec.file == _file)
                    return spec.loop;
            return /_Loop$/.test(_clip);
        };
        const Put = (_name, _file, _clip, _overwrite) => {
            if (pinned.has(_name))
                return;
            if (!_overwrite && this.mAni.has(_name))
                return;
            this.mAni.set(_name, { file: _file, clip: _clip, loop: Loop(_file, _clip), speed: 1 });
        };
        for (const b of [...bodies, ...vocal]) {
            const mesh = res.Find(b);
            if (mesh == null)
                continue;
            for (const clip of mesh.aniMap.keys())
                Put(clip, b, clip, false);
        }
        for (const file of files) {
            const mesh = res.Find(file);
            if (mesh == null)
                continue;
            if (!this.mPruned.has(file) && keep.size > 0) {
                CAvatarRig.Prune(mesh, keep);
                this.mPruned.add(file);
            }
            for (const clip of mesh.aniMap.keys())
                Put(clip, file, clip, true);
        }
        for (const [name, clip] of Object.entries(CAvatarFactory.sDefaultAni)) {
            if (pinned.has(name) || this.mAni.has(name))
                continue;
            const src = this.mAni.get(clip);
            if (src != null)
                this.mAni.set(name, { ...src, loop: !CAvatarFactory.sOneShot.has(name) });
        }
        this.mVocal.clear();
        for (const spec of CAvatarFactory.sVocalAni) {
            if (pinned.has(spec.name)) {
                const ext = this.mAni.get(spec.name);
                if (ext != null)
                    this.mVocal.set(spec.name, ext);
                continue;
            }
            const file = this.mRes + spec.file;
            const mesh = res.Find(file);
            const clip = mesh?.aniMap.keys().next().value;
            if (clip == null)
                continue;
            this.mVocal.set(spec.name, { file, clip, loop: spec.loop, speed: 1 });
            if (!this.mAni.has(spec.name))
                this.mAni.set(spec.name, { file, clip, loop: spec.loop, speed: 1 });
        }
        this.mAniObj.clear();
        return true;
    }
    Build() { return this.LoadAni(); }
    GetAniList(_kind = CAvatarOption.eKind.Roblox) {
        if (_kind == null)
            return [];
        if (_kind == CAvatarOption.eKind.Vocaloid)
            return [...this.mVocal.keys()];
        return [...this.mAni.keys()];
    }
    GetAni(_name, _kind = CAvatarOption.eKind.Roblox) {
        if (_kind == null || _name == null)
            return null;
        const vocal = _kind == CAvatarOption.eKind.Vocaloid;
        const key = (vocal ? "v:" : "r:") + _name;
        let ani = this.mAniObj.get(key);
        if (ani != null)
            return ani;
        const a = (vocal ? this.mVocal : this.mAni).get(_name);
        if (a == null)
            return null;
        const mesh = this.mCanvas.GetFrame().Res().Find(a.file);
        const info = mesh?.aniMap.get(a.clip);
        if (info == null)
            return null;
        const dur = Math.max(0.05, (info.end - info.start) / 1000 / a.speed);
        ani = new CAnimation();
        ani.Push(new CClipMesh(0, dur, a.clip, a.file));
        ani.mLoop = a.loop;
        this.mAniObj.set(key, ani);
        return ani;
    }
    Res(_path) {
        const size = this.GetTexSize();
        if (size == CAvatarFactory.eTexSize.T4k || !_path.endsWith(".gltf"))
            return this.mRes + _path;
        return this.mRes + _path.substring(0, _path.length - 5) + "." + size + ".gltf";
    }
    GetTexSize() {
        if (this.mTexSize != CAvatarFactory.eTexSize.Auto)
            return this.mTexSize;
        return CUtil.IsMobile() ? CAvatarFactory.eTexSize.T1k : CAvatarFactory.eTexSize.T2k;
    }
    Load(_files) {
        return Promise.all(_files.map(f => this.LoadOne(f))).then(r => r.every(v => v));
    }
    LoadOne(_file) {
        let p = this.mLoad.get(_file);
        if (p != null)
            return p;
        const frame = this.mCanvas.GetFrame();
        const vocal = _file == CAvatarFactory.sVocaloid || _file == CAvatarFactory.sVocalOutfit;
        const opt = vocal ? new CLoaderOption().Set("mColorTex", true) : null;
        p = Promise.resolve(frame.Res().Find(_file) != null ? null : frame.Load().Exe(_file, opt)).then(() => {
            const mesh = frame.Res().Find(_file);
            if (mesh == null)
                return false;
            if (vocal)
                CAvatarRig.Adapt(mesh);
            if (this.mAniFile.has(_file))
                CAvatarRig.Retarget(mesh);
            return true;
        });
        this.mLoad.set(_file, p);
        return p;
    }
    Styles(_gender, _kind = CAvatarOption.eKind.Roblox) {
        if (_kind == CAvatarOption.eKind.Vocaloid)
            return ["Shino"];
        return Object.keys(CAvatarFactory.sOutfit[_gender] ?? {});
    }
    HasSlot(_gender, _style, _slot, _kind = CAvatarOption.eKind.Roblox) {
        if (_kind == CAvatarOption.eKind.Vocaloid)
            return _style == "Shino" && _slot == CAvatarOption.eSlot.Body;
        return CAvatarFactory.sOutfit[_gender]?.[_style]?.[_slot] != null;
    }
    HairList() { return Object.keys(CAvatarFactory.sHair); }
    BodyFile(_gender, _kind = CAvatarOption.eKind.Roblox) {
        if (_kind == CAvatarOption.eKind.Vocaloid)
            return CAvatarFactory.sVocaloid;
        return this.Res(CAvatarFactory.sBody[_gender] ?? CAvatarFactory.sBody.female);
    }
    HairFile(_hair) { const h = CAvatarFactory.sHair[_hair]; return h == null ? null : this.Res(h); }
    PartFiles(_o) {
        if (_o.mKind == CAvatarOption.eKind.Vocaloid)
            return _o.mOutfit[CAvatarOption.eSlot.Body] == "" ? [] : [CAvatarFactory.sVocalOutfit];
        const set = CAvatarFactory.sOutfit[_o.mGender] ?? CAvatarFactory.sOutfit.female, out = [];
        for (const slot of Object.values(CAvatarOption.eSlot)) {
            const f = set[_o.mOutfit[slot]]?.[slot];
            if (f != null)
                out.push(this.Res("parts/" + f + ".gltf"));
        }
        return out;
    }
    Shape(_file, _gender, _s) {
        if (_file == null || _file == CAvatarFactory.sVocaloid || _file == CAvatarFactory.sVocalOutfit)
            return _file;
        const base = this.BodyFile(_gender);
        const res0 = this.mCanvas.GetFrame().Res();
        const bodyMesh0 = res0.Find(base);
        const cpuKey = _file == base ? { bust: 0, belly: _s.belly, hip: _s.hip, eye: _s.eye } : _s;
        if (CAvatarShape.IsNone(cpuKey) && _file != base)
            return _file;
        const sig = _file + "|" + CAvatarShape.Key(cpuKey);
        let key = this.mVariant.get(sig);
        if (key != null)
            return key;
        const res = res0;
        const mesh = res.Find(_file), bodyMesh = bodyMesh0;
        if (mesh == null || bodyMesh == null)
            return _file;
        let anchor = this.mAnchor.get(base);
        if (anchor == null)
            this.mAnchor.set(base, anchor = CAvatarShape.Anchor(bodyMesh));
        const cpu = cpuKey;
        if (CAvatarShape.IsNone(cpu)) {
            this.mVariant.set(sig, _file);
            return _file;
        }
        key = "forgeavatar" + this.mId + "_shape" + this.mVariant.size + ".mesh";
        res.Push(key, CAvatarCloth.Variant(mesh, null, CAvatarShape.Positions(mesh, anchor, cpu)));
        this.mVariant.set(sig, key);
        return key;
    }
    BodyVariant(_body, _parts) {
        if (_parts.length == 0)
            return Promise.resolve(_body);
        const sig = _body + "|" + [..._parts].sort().join("|");
        let p = this.mVariantWait.get(sig);
        if (p != null)
            return p;
        const res = this.mCanvas.GetFrame().Res();
        const body = res.Find(_body);
        const cloth = _parts.map(p => res.Find(p)).filter(m => m != null);
        const key = "forgeavatar" + this.mId + "_body" + this.mVariantWait.size + ".mesh";
        p = CAvatarCloth.Hidden(body, cloth).then(hid => {
            res.Push(key, CAvatarCloth.Variant(body, hid));
            return key;
        });
        this.mVariantWait.set(sig, p);
        return p;
    }
    Fat(_gender) {
        const base = this.BodyFile(_gender);
        let bone = this.mFatBone.get(base);
        if (bone == null) {
            const mesh = this.mCanvas.GetFrame().Res().Find(base);
            if (mesh == null)
                return null;
            this.mFatBone.set(base, bone = CAvatarFat.Build(mesh).mBone);
        }
        const fat = new CAvatarFat();
        fat.mBone = bone;
        return fat;
    }
    R6(_key) {
        const sig = "r6|" + _key;
        let key = this.mVariant.get(sig);
        if (key != null)
            return key;
        const res = this.mCanvas.GetFrame().Res();
        key = "forgeavatar" + this.mId + "_r6_" + this.mVariant.size + ".mesh";
        res.Push(key, CAvatarMerge.Compact(res.Find(_key), CAvatarRig.sR6Driver));
        this.mVariant.set(sig, key);
        return key;
    }
    Merge(_body, _bodyTex, _parts, _hair, _hairTex) {
        const list = _hair == null ? _parts : [..._parts, _hair];
        const sig = "merge|" + _body + "|" + [..._bodyTex].join(",") + "|" + list.join("|") + "|" + [..._hairTex].join(",");
        let key = this.mVariant.get(sig);
        if (key != null)
            return key;
        const res = this.mCanvas.GetFrame().Res();
        const part = list.map(f => ({ mesh: res.Find(f), tex: f == _hair ? _hairTex : null })).filter(p => p.mesh != null);
        key = "forgeavatar" + this.mId + "_merge" + this.mVariant.size + ".mesh";
        res.Push(key, CAvatarMerge.Merge(res.Find(_body), _bodyTex, part));
        this.mVariant.set(sig, key);
        return key;
    }
    Randomize(_o) {
        if (!(_o.mSeed > 0))
            _o.mSeed = 1 + Math.floor(Math.random() * 2147483646);
        const r = CAvatarOption.Rand(_o.mSeed), Pick = (_a) => _a[Math.floor(r() * _a.length) % _a.length];
        const Range = (_a, _b) => Math.round((_a + (_b - _a) * r()) * 100) / 100;
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
        for (const slot of Object.values(CAvatarOption.eSlot)) {
            if ((slot == "Head" || slot == "Acc") && r() < 0.6)
                continue;
            const s = Pick(styles);
            if (CAvatarFactory.sOutfit[_o.mGender][s][slot] != null)
                _o.mOutfit[slot] = s;
        }
        _o.mKind = _o.mKind || CAvatarOption.eKind.Roblox;
        _o.mRandom = false;
        _o.Stamp();
        return _o;
    }
    Push(_option = new CAvatarOption({ mRandom: true })) {
        if (_option.mRandom)
            this.Randomize(_option);
        const av = new CSubjectAvatar(this, _option);
        this.mAvatar.add(av);
        this.mCanvas.PushSub(av);
        av.Build();
        return av;
    }
    Remove(_av, _destroy = true) {
        if (!this.mAvatar.delete(_av))
            return;
        if (_destroy)
            _av.Destroy();
    }
    SetForceRig(_rig) {
        this.mForceRig = _rig;
        for (const av of this.mAvatar)
            av.ApplyRig();
    }
    SetQuality(_q) {
        this.mQuality = _q;
        this.SetTier(_q == CAvatarFactory.eQuality.Low ? CAvatarRig.eRig.R6 : CAvatarRig.eRig.R15);
    }
    SetTier(_rig) {
        if (this.mTier == _rig)
            return;
        this.mTier = _rig;
        for (const av of this.mAvatar)
            av.ApplyRig();
    }
    Tick(_dt) {
        this.mFpsTime += _dt;
        this.mFpsCount++;
        if (this.mFpsTime < 2)
            return;
        this.mFps = this.mFpsCount / this.mFpsTime;
        this.mFpsTime = 0;
        this.mFpsCount = 0;
        if (this.mQuality != CAvatarFactory.eQuality.Auto)
            return;
        if (this.mFps < this.mMinFps) {
            this.mLowRun++;
            this.mHighRun = 0;
        }
        else if (this.mFps > this.mMinFps * 1.5) {
            this.mHighRun++;
            this.mLowRun = 0;
        }
        else {
            this.mLowRun = 0;
            this.mHighRun = 0;
        }
        if (this.mLowRun >= 2)
            this.SetTier(CAvatarRig.eRig.R6);
        else if (this.mHighRun >= 5)
            this.SetTier(CAvatarRig.eRig.R15);
    }
}
