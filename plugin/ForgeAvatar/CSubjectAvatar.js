import { CVec3 } from "../../artgine/geometry/CVec3.js";
import { CMath } from "../../artgine/geometry/CMath.js";
import { CColor } from "../../artgine/render/CColor.js";
import { SDF } from "../../artgine/z_file/SDF.js";
import { CSubject } from "../../artgine/app/subject/CSubject.js";
import { CComponent } from "../../artgine/app/component/CComponent.js";
import { CPaint } from "../../artgine/app/component/paint/CPaint.js";
import { CPaint3D } from "../../artgine/app/component/paint/CPaint3D.js";
import { CAniFlow } from "../../artgine/app/component/CAniFlow.js";
import { CAttacher, CLookAtIK } from "../CResolverComp/CResolverComp.js";
import { CAvatarOption } from "./CAvatarOption.js";
import { CAvatarPoseFix, CAvatarRig } from "./CAvatarRig.js";
import { CAvatarSkin } from "./CAvatarSkin.js";
import { CAvatarFoot } from "./CAvatarIK.js";
class CAvatarPose extends CComponent {
    mAvatar;
    constructor(mAvatar) {
        super();
        this.mAvatar = mAvatar;
        this.mSysc = CComponent.eSysn.IK + 10;
        this.mSave = false;
    }
    Update(_update) {
        super.Update(_update);
        this.mAvatar.UpdatePose(_update.DeltaTime());
    }
}
function ShapeOf(_o) {
    return { bust: _o.mBust, belly: _o.mBelly, hip: _o.mHip, eye: _o.mEye };
}
export class CSubjectAvatar extends CSubject {
    static sHeadByHeight = -0.7;
    mFactory;
    mOption;
    mModel = null;
    mBody = null;
    mPart = [];
    mAF = null;
    mLookIK = null;
    mHoldIK = null;
    mLookTarget = null;
    mHoldTarget = null;
    mHoldBone = "hand_r";
    mFix = null;
    mBuildVer = 0;
    mReady = false;
    mRigApplied = "";
    mMeshRig = "";
    mFixMesh = null;
    mFoot = new CAvatarFoot();
    mFat = null;
    mFaceName = null;
    mSoft = null;
    constructor(_factory, _option) {
        super();
        this.mFactory = _factory;
        this.mOption = _option;
        this.mSave = false;
    }
    IsReady() { return this.mReady; }
    GetOption() { return this.mOption; }
    ExportJson() { return this.mOption.ExportJson(); }
    GetRig() {
        if (this.mOption.mKind == CAvatarOption.eKind.Vocaloid)
            return CAvatarRig.eRig.R15;
        const f = this.mFactory.mForceRig;
        if (f != null)
            return f;
        if (this.mOption.mRig == CAvatarRig.eRig.R6 || this.mOption.mRig == CAvatarRig.eRig.R15)
            return this.mOption.mRig;
        return this.mFactory.mTier;
    }
    Supports(_key) {
        const key = _key.startsWith("cloth.") ? "outfit" : _key;
        const vocal = this.mOption.mKind == CAvatarOption.eKind.Vocaloid;
        if (vocal) {
            if (key == "height")
                return true;
            if (key == "ani")
                return this.mFactory.GetAniList(CAvatarOption.eKind.Vocaloid).length > 0;
            if (key == "outfit")
                return true;
            if (this.mFactory.mQuality == "Low")
                return false;
            if (key == "bust")
                return true;
            if (key == "face")
                return this.FaceList().length > 0;
            return false;
        }
        if (key == "ani")
            return true;
        if (key == "outfit" || key == "hair" || key == "gender")
            return true;
        if (this.GetRig() == CAvatarRig.eRig.R6)
            return false;
        return key == "height" || key == "width" || key == "depth" || key == "head" || key == "bodyType" || key == "proportion";
    }
    SetKind(_kind) {
        if (_kind != CAvatarOption.eKind.Vocaloid && _kind != CAvatarOption.eKind.Roblox)
            return Promise.resolve(false);
        if (this.mOption.mKind == _kind)
            return Promise.resolve(true);
        this.mOption.mKind = _kind;
        this.mFaceName = null;
        return this.Rebuild();
    }
    SetBust(_v) {
        if (!this.Supports("bust"))
            return false;
        this.mOption.mBust = _v;
        this.mOption.mTune[CAvatarOption.eVocaloid.Bust] = _v;
        return true;
    }
    SetProportion(_v) {
        if (!this.Supports("proportion"))
            return false;
        this.mOption.mProportion = _v;
        this.mOption.mTune[CAvatarOption.eRoblox.Proportion] = _v;
        return true;
    }
    SetBodyType(_v) {
        if (!this.Supports("bodyType"))
            return false;
        this.mOption.mBodyType = Math.max(0, Math.min(1, _v));
        this.mOption.mTune[CAvatarOption.eRoblox.BodyType] = this.mOption.mBodyType;
        this.mModel?.SetSca(this.ModelScale());
        return true;
    }
    SetWidth(_v) {
        if (!this.Supports("width"))
            return false;
        this.mOption.mWidth = _v;
        this.mOption.mTune[CAvatarOption.eRoblox.Width] = _v;
        this.mModel?.SetSca(this.ModelScale());
        return true;
    }
    SetDepth(_v) {
        if (!this.Supports("depth"))
            return false;
        this.mOption.mDepth = _v;
        this.mOption.mTune[CAvatarOption.eRoblox.Depth] = _v;
        this.mModel?.SetSca(this.ModelScale());
        return true;
    }
    SetHead(_v) {
        if (!this.Supports("head"))
            return false;
        this.mOption.mHead = _v;
        this.mOption.mTune[CAvatarOption.eRoblox.Head] = _v;
        return true;
    }
    SetFace(_name) {
        if (!this.Supports("face"))
            return false;
        this.mOption.mFace = _name ?? "";
        this.mOption.mTune[CAvatarOption.eVocaloid.Face] = this.mOption.mFace;
        this.ApplyFace();
        return true;
    }
    SetHair(_name) {
        if (!this.Supports("hair"))
            return Promise.resolve(false);
        this.mOption.mHair = _name ?? "";
        this.mOption.mTune[CAvatarOption.eVocaloid.Hair] = this.mOption.mHair;
        return this.Rebuild();
    }
    SetOutfit(_slot, _style, _rebuild = true) {
        if (!this.Supports("outfit"))
            return Promise.resolve(false);
        const slot = CAvatarOption.SlotOf(_slot);
        if (slot == null)
            return Promise.resolve(false);
        if (_style == null || _style == "")
            delete this.mOption.mOutfit[slot];
        else
            this.mOption.mOutfit[slot] = _style;
        const key = CAvatarOption.eCloth[slot];
        if (key != null) {
            if (_style == null || _style == "")
                delete this.mOption.mTune[key];
            else
                this.mOption.mTune[key] = _style;
        }
        return _rebuild ? this.Rebuild() : Promise.resolve(true);
    }
    SetGender(_gender) {
        if (!this.Supports("gender"))
            return Promise.resolve(false);
        const styles = this.mFactory.Styles(_gender);
        const out = {};
        for (const [slot, style] of Object.entries(this.mOption.mOutfit))
            if (styles.includes(style))
                out[slot] = style;
        this.mOption.mGender = _gender;
        this.mOption.mOutfit = out;
        this.mOption.Stamp();
        return this.Rebuild();
    }
    FaceList() {
        if (this.mFaceName != null)
            return this.mFaceName;
        const mesh = this.mBody?.mMeshRes;
        if (mesh == null)
            return [];
        const names = [];
        for (const n of mesh.meshTree.GetArray()) {
            const morph = n.mData?.morph;
            if (morph == null)
                continue;
            for (const name of morph.names)
                if (names.indexOf(name) < 0)
                    names.push(name);
        }
        this.mFaceName = names;
        return names;
    }
    SetRig(_rig) {
        this.mOption.mRig = _rig;
        this.ApplyRig();
    }
    SetAni(_name, _inter = 0.2) {
        if (!this.Supports("ani"))
            return false;
        const ani = this.mFactory.GetAni(_name, this.mOption.mKind);
        if (ani == null)
            return false;
        this.mOption.mAni = _name;
        if (this.mAF == null)
            return true;
        if (this.mAF.GetAni() == ani)
            return true;
        this.mAF.SetInter(_inter);
        this.mAF.SetAni(ani);
        return true;
    }
    GetAni() { return this.mOption.mAni; }
    SetFeature(_key, _on) {
        this.mOption.mFeature[_key] = _on;
        this.ApplyRig();
    }
    IsFeature(_key) {
        if (this.mOption.mFeature[_key] != true)
            return false;
        return !((_key == "look" || _key == "foot") && this.GetRig() == CAvatarRig.eRig.R6);
    }
    SetLook(_target) {
        this.mLookTarget = _target;
        if (this.mLookIK != null) {
            this.mLookIK.Destroy();
            this.mLookIK = null;
        }
        this.BuildIK();
    }
    SetHold(_target, _bone = "hand_r") {
        this.mHoldTarget = _target;
        this.mHoldBone = _bone;
        if (this.mHoldIK != null) {
            this.mHoldIK.Destroy();
            this.mHoldIK = null;
        }
        this.BuildIK();
    }
    SetHeight(_height, _head = null) {
        if (!this.Supports("height"))
            return false;
        this.mOption.mHeight = _height;
        this.mOption.mTune["height"] = _height;
        if (_head != null)
            this.SetHead(_head);
        this.mModel?.SetSca(this.ModelScale());
        return true;
    }
    ModelScale() {
        const o = this.mOption, unit = this.mFactory.mUnit / 39.37;
        let h = o.mHeight, w = o.mWidth, d = o.mDepth;
        if (o.mKind == CAvatarOption.eKind.Roblox && this.Supports("bodyType")) {
            h *= 1 + 0.12 * o.mBodyType;
            w *= 1 - 0.15 * o.mBodyType;
            d *= 1 - 0.1 * o.mBodyType;
        }
        if (o.mKind == CAvatarOption.eKind.Vocaloid)
            return new CVec3(unit * h, unit * h, unit * h);
        return new CVec3(unit * h * w, unit * h, unit * h * d);
    }
    Rebuild(_patch = null) {
        if (_patch != null)
            Object.assign(this.mOption, _patch);
        return this.Build();
    }
    async Build() {
        const ver = ++this.mBuildVer, f = this.mFactory, o = this.mOption;
        const vocal = o.mKind == CAvatarOption.eKind.Vocaloid;
        let body = f.BodyFile(o.mGender, o.mKind), parts = f.PartFiles(o), hair = vocal ? null : f.HairFile(o.mHair);
        const files = [body, ...parts];
        if (hair != null)
            files.push(hair);
        if (!await f.Load(files) || !await f.LoadAni())
            return false;
        if (ver != this.mBuildVer || this.IsDestroy())
            return false;
        body = f.BodyFile(o.mGender, o.mKind);
        let bodyKey = body;
        if (!vocal) {
            const shape = ShapeOf(o);
            shape.bust = 0;
            body = f.Shape(body, o.mGender, shape);
            parts = parts.map(p => f.Shape(p, o.mGender, shape));
            hair = f.Shape(hair, o.mGender, shape);
            bodyKey = await f.BodyVariant(body, parts);
        }
        if (ver != this.mBuildVer || this.IsDestroy())
            return false;
        const frame = f.mCanvas.GetFrame(), bodyMesh = frame.Res().Find(bodyKey);
        const skinBase = CAvatarSkin.BaseKey(bodyMesh), normBase = CAvatarSkin.BaseKey(bodyMesh, 1);
        const mask = CAvatarSkin.AbsMask(bodyMesh), level = CAvatarSkin.SoftLevel(o.mFat);
        const [skinTex, normTex] = skinBase == null || vocal ? [null, null] : await Promise.all([
            CAvatarSkin.Body(frame, skinBase, o.mSkin, mask, level), CAvatarSkin.Normal(frame, normBase, mask, level)
        ]);
        const hairMesh = hair == null ? null : frame.Res().Find(hair);
        const hairBase = hairMesh == null ? null : CAvatarSkin.BaseKey(hairMesh);
        const hairTint = hairBase != null && (o.mHairColor[0] != 1 || o.mHairColor[1] != 1 || o.mHairColor[2] != 1);
        const hairTex = f.mMerge && hairTint ? await CAvatarSkin.Tint(frame, hairBase, o.mHairColor, true) : null;
        if (ver != this.mBuildVer || this.IsDestroy())
            return false;
        if (this.mModel != null)
            this.mModel.Destroy();
        this.mFix = null;
        this.mFixMesh = null;
        this.mFaceName = null;
        this.mFat = vocal ? null : f.Fat(o.mGender);
        this.mSoft = skinBase == null || vocal ? null : { skin: skinBase, norm: normBase, mask, level, cur: [skinTex, normTex], wait: false };
        this.mPart = [];
        this.mLookIK = null;
        this.mHoldIK = null;
        const model = new CSubject();
        model.mSave = false;
        model.SetSca(this.ModelScale());
        if (f.mMerge) {
            const bodyTex = new Map(), hairMap = new Map();
            if (skinTex != null)
                bodyTex.set(skinBase, skinTex);
            if (normTex != null)
                bodyTex.set(normBase, normTex);
            if (hairTex != null)
                hairMap.set(hairBase, hairTex);
            const merged = f.Merge(bodyKey, bodyTex, parts, hair, hairMap);
            this.mMeshRig = this.GetRig();
            this.mFixMesh = frame.Res().Find(merged);
            this.mBody = this.Shade(model.PushComp(new CPaint3D(this.mMeshRig == CAvatarRig.eRig.R6 ? f.R6(merged) : merged)), null);
        }
        else {
            this.mBody = model.PushComp(new CPaint3D(bodyKey));
            if (skinTex != null)
                this.mBody.SetTexture(bodyMesh.texture.map(t => t == skinBase ? skinTex : t == normBase ? normTex : t));
            this.Shade(this.mBody, null);
            for (const p of parts)
                this.mPart.push({ pt: this.Shade(model.PushComp(new CPaint3D(p)), null), link: null });
            if (hair != null)
                this.mPart.push({ pt: this.Shade(model.PushComp(new CPaint3D(hair)), o.mHairColor), link: null });
        }
        const ani = f.GetAni(o.mAni, o.mKind) ?? f.GetAni("Idle", o.mKind);
        if (ani != null)
            this.mAF = model.PushComp(new CAniFlow(ani));
        model.PushComp(new CAvatarPose(this));
        this.mModel = model;
        this.PushChild(model);
        this.mRigApplied = "";
        this.ApplyFace();
        this.BuildIK();
        this.mReady = true;
        return true;
    }
    Shade(_pt, _rgb) {
        _pt.mSave = false;
        if (_rgb != null && (_rgb[0] != 1 || _rgb[1] != 1 || _rgb[2] != 1))
            _pt.SetColorModel(new CColor(_rgb[0], _rgb[1], _rgb[2], CColor.eModel.RGBMul));
        if (this.mFactory.mLight) {
            _pt.PushTag(CPaint.eTag.Light);
            _pt.PushTag(CPaint.eTag.Shadow);
        }
        return _pt;
    }
    BuildIK() {
        if (this.mModel == null)
            return;
        if (this.mLookTarget != null && this.mLookIK == null) {
            this.mLookIK = this.mModel.PushComp(new CLookAtIK("neck_01", this.mLookTarget));
            this.mLookIK.mSave = false;
        }
        if (this.mHoldTarget != null && this.mHoldIK == null) {
            this.mHoldIK = this.mModel.PushComp(new CAttacher(this.mHoldBone, this.mHoldTarget));
            this.mHoldIK.mSave = false;
        }
        this.mRigApplied = "";
        this.ApplyRig();
    }
    ApplyRig() {
        const rig = this.GetRig();
        if (this.mFactory.mMerge && this.mModel != null && this.mMeshRig != "" && this.mMeshRig != rig) {
            this.mMeshRig = "";
            this.Build();
        }
        if (this.mLookIK != null)
            this.mLookIK.SetEnable(this.IsFeature("look"));
        if (this.mHoldIK != null)
            this.mHoldIK.SetEnable(this.IsFeature("hold"));
        this.mRigApplied = rig;
    }
    UpdatePose(_dt = 1 / 60) {
        const body = this.mBody, tree = body?.GetTree();
        if (tree == null || body.mMeshRes == null)
            return;
        if (this.mRigApplied != this.GetRig())
            this.ApplyRig();
        if (this.mFix == null)
            this.mFix = new CAvatarPoseFix(tree, this.mFixMesh ?? body.mMeshRes);
        const clip = this.mAF?.mFClip?.[0];
        const anim = clip?.mMesh == null ? null : this.mFactory.mCanvas.GetFrame().Res().Find(clip.mMesh);
        if (anim != null)
            CAvatarRig.ApplyClip(tree, this.mFixMesh ?? body.mMeshRes, anim);
        this.UpdateGround(tree, _dt);
        if (this.mRigApplied == CAvatarRig.eRig.R6)
            this.mFix.ApplyR6();
        if (this.mOption.mKind != CAvatarOption.eKind.Vocaloid)
            this.mFix.ApplyHead(this.mOption.mHead * Math.pow(this.mOption.mHeight, CSubjectAvatar.sHeadByHeight));
        this.mFat?.Apply(tree, this.mOption.mFat);
        this.ApplyBust(tree);
        this.ApplyProportion(tree);
        this.UpdateSoft();
        for (const p of this.mPart) {
            if (p.link == null && !this.Link(p, tree))
                continue;
            for (const [dst, src] of p.link)
                dst.pst.Import(src.pst);
            p.pt.UpdateFMat();
        }
    }
    ApplyFace() {
        const body = this.mBody;
        if (body == null || !this.Supports("face"))
            return;
        const cur = this.mOption.mFace;
        for (const name of this.FaceList())
            body.SetMorph(name, name == cur ? 1 : 0);
    }
    ApplyBust(_tree) {
        if (!this.Supports("bust"))
            return;
        const s = Math.max(0.25, 1 + this.mOption.mBust * 0.6);
        for (const name of ["J_Sec_L_Bust1", "J_Sec_R_Bust1", "bust_l", "bust_r"]) {
            const n = _tree.Find(name);
            if (n == null)
                continue;
            n.mData.sca.x = s;
            n.mData.sca.y = s;
            n.mData.sca.z = s;
            this.RefreshBone(n);
        }
    }
    ApplyProportion(_tree) {
        if (!this.Supports("proportion") || this.mOption.mBodyType <= 0)
            return;
        const s = 1.25 - 0.5 * this.mOption.mProportion;
        for (const name of ["clavicle_l", "clavicle_r"]) {
            const n = _tree.Find(name);
            if (n == null)
                continue;
            const p = n.mData.pst.mF32A;
            p[0] *= s;
            p[1] *= s;
            p[2] *= s;
        }
    }
    RefreshBone(_n) {
        const d = _n.mData;
        d.MatUpdate();
        if (_n.mParent != null)
            d.pst = CMath.MatMul(d.pst, _n.mParent.mData.pst);
        for (let c = _n.mChild; c != null; c = c.mColleague)
            this.RefreshBone(c);
    }
    UpdateSoft() {
        const s = this.mSoft, level = CAvatarSkin.SoftLevel(this.mOption.mFat);
        if (s == null || s.wait || s.level == level)
            return;
        s.wait = true;
        const frame = this.mFactory.mCanvas.GetFrame(), body = this.mBody;
        Promise.all([CAvatarSkin.Body(frame, s.skin, this.mOption.mSkin, s.mask, level), CAvatarSkin.Normal(frame, s.norm, s.mask, level)]).then(([c, n]) => {
            s.wait = false;
            if (this.mSoft != s || this.mBody != body || this.IsDestroy())
                return;
            const [oc, on] = s.cur;
            body.SetTexture(body.GetTexture().map(t => t == oc ? c : t == on ? n : t));
            s.cur = [c, n];
            s.level = level;
        });
    }
    UpdateGround(_tree, _dt) {
        const ground = this.mFactory.mGround;
        if (ground == null || this.mModel == null)
            return;
        const p = this.GetPos(), sy = this.GetSca().y || 1;
        const base = ground(p.x, p.z);
        let drop = 0;
        if (this.IsFeature("foot"))
            drop = this.mFoot.Apply(_tree, this.mBody.GetFMat(), ground, base, _dt);
        else
            this.mFoot.mDrop = 0;
        const y = (base - p.y - drop) / sy;
        const mp = this.mModel.GetPos();
        if (Math.abs(mp.y - y) > 1e-3)
            this.mModel.SetPos(new CVec3(0, y, 0));
    }
    Link(_p, _body) {
        const pt = _p.pt, tree = pt.GetTree();
        if (tree == null || pt.mMeshRes == null || pt.mWeightMat.length == 0)
            return false;
        if (pt.mSkinType != SDF.eSkin.Bone) {
            pt.mSkinType = SDF.eSkin.Bone;
            pt.ClearBatch();
        }
        _p.link = [];
        for (const n of tree.GetArray()) {
            if (!CAvatarRig.IsBone(n, pt.mMeshRes))
                continue;
            const b = _body.Find(n.mKey);
            if (b != null)
                _p.link.push([n.mData, b.mData]);
        }
        return true;
    }
    Destroy() {
        this.mFactory?.Remove(this, false);
        super.Destroy();
    }
}
