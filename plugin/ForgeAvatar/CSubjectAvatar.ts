import { CUpdate } from "../../artgine/basic/Basic.js";
import { CTree } from "../../artgine/basic/CTree.js";
import { CVec3 } from "../../artgine/geometry/CVec3.js";
import { CMath } from "../../artgine/geometry/CMath.js";
import { IMat } from "../../artgine/geometry/CMat.js";
import { CColor } from "../../artgine/render/CColor.js";
import { CMeshCopyNode } from "../../artgine/render/CMeshCopyNode.js";
import { SDF } from "../../artgine/z_file/SDF.js";
import { CSubject } from "../../artgine/app/subject/CSubject.js";
import { CComponent } from "../../artgine/app/component/CComponent.js";
import { CPaint } from "../../artgine/app/component/paint/CPaint.js";
import { CPaint3D } from "../../artgine/app/component/paint/CPaint3D.js";
import { CAniFlow } from "../../artgine/app/component/CAniFlow.js";
import { CAttacher, CLookAtIK } from "../CResolverComp/CResolverComp.js";
import { CAvatarOption } from "./CAvatarOption.js";
import { CAvatarPoseFix, CAvatarRig } from "./CAvatarRig.js";
import type { CAvatarFactory } from "./ForgeAvatar.js";
import type { IAvatarShape } from "./CAvatarShape.js";
import { CAvatarSkin } from "./CAvatarSkin.js";
import { CAvatarFoot } from "./CAvatarIK.js";
import { CAvatarFat } from "./CAvatarFat.js";
import { CMesh } from "../../artgine/render/CMesh.js";

//IK(801)·스프링(802) 뒤, 페인트(900) 앞에서 본 행렬을 마무리하고 파츠에 복사한다
class CAvatarPose extends CComponent
{
    constructor(public mAvatar : CSubjectAvatar)
    {
        super();
        this.mSysc = CComponent.eSysn.IK + 10;
        this.mSave = false;
    }
    override Update(_update : CUpdate) : void
    {
        super.Update(_update);
        this.mAvatar.UpdatePose(_update.DeltaTime());
    }
}

interface IAvatarPart { pt : CPaint3D; link : [CMeshCopyNode, CMeshCopyNode][]; }

function ShapeOf(_o : CAvatarOption) : IAvatarShape
{
    return { bust : _o.mBust, belly : _o.mBelly, hip : _o.mHip, eye : _o.mEye };
}

//팩토리가 할당하는 아바타. 기본은 몸·옷·머리카락을 한 메시로 합친 페인트 하나(mMerge).
//합치지 않으면 몸 페인트만 애니메이션·IK를 돌리고 파츠는 같은 이름의 본 행렬을 복사해 따라온다.
//모델(페인트·애니·IK)은 자식 서브젝트에 두어 아바타 자체의 위치·회전·크기는 사용자가 그대로 쓴다
export class CSubjectAvatar extends CSubject
{
    static sHeadByHeight = -0.7;
    mFactory : CAvatarFactory;
    mOption : CAvatarOption;
    mModel : CSubject = null;
    mBody : CPaint3D = null;
    mPart : IAvatarPart[] = [];
    mAF : CAniFlow = null;
    mLookIK : CLookAtIK = null;
    mHoldIK : CAttacher = null;
    mLookTarget : IMat = null;
    mHoldTarget : CSubject = null;
    mHoldBone = "hand_r";
    private mFix : CAvatarPoseFix = null;
    private mBuildVer = 0;
    private mReady = false;
    private mRigApplied = "";
    //합친 메시가 어느 리그용으로 만들어졌는지(R6면 구동 본만 남은 경량 메시)
    private mMeshRig = "";
    //R6 고정에 쓰는 전체 본(65) 메시. R6 경량 메시는 구동 본만 남아 바인드 정보가 모자라다
    private mFixMesh : CMesh = null;
    private mFoot = new CAvatarFoot();
    private mFat : CAvatarFat = null;
    private mFaceName : string[] = null;
    private mSoft : { skin : string, norm : string, mask : Float32Array, level : number, cur : string[], wait : boolean } = null;

    constructor(_factory : CAvatarFactory, _option : CAvatarOption)
    {
        super();
        this.mFactory = _factory;
        this.mOption = _option;
        this.mSave = false;
    }

    IsReady() : boolean { return this.mReady; }
    GetOption() : CAvatarOption { return this.mOption; }
    ExportJson() : string { return this.mOption.ExportJson(); }

    //팩토리 강제 > 아바타 지정 > 팩토리 자동 등급
    GetRig() : string
    {
        //보컬로이드는 손가락·가슴 본이 있는 한 메시라 R6으로 줄이면 스키닝이 무너진다
        if(this.mOption.mKind == CAvatarOption.eKind.Vocaloid) return CAvatarRig.eRig.R15;
        const f = this.mFactory.mForceRig;
        if(f != null) return f;
        if(this.mOption.mRig == CAvatarRig.eRig.R6 || this.mOption.mRig == CAvatarRig.eRig.R15) return this.mOption.mRig;
        return this.mFactory.mTier;
    }
    Supports(_key : string) : boolean
    {
        const key = _key.startsWith("cloth.") ? "outfit" : _key;
        const vocal = this.mOption.mKind == CAvatarOption.eKind.Vocaloid;
        if(vocal)
        {
            if(key == "height") return true;
            if(key == "ani") return this.mFactory.GetAniList(CAvatarOption.eKind.Vocaloid).length > 0;
            if(key == "outfit") return true;
            if(this.mFactory.mQuality == "Low") return false;
            if(key == "bust") return true;
            if(key == "face") return this.FaceList().length > 0;
            return false;
        }
        if(key == "ani") return true;
        if(key == "outfit" || key == "hair" || key == "gender") return true;
        //R6에는 신장·너비·두께·머리·체형·비율 값이 없다
        if(this.GetRig() == CAvatarRig.eRig.R6) return false;
        return key == "height" || key == "width" || key == "depth" || key == "head" || key == "bodyType" || key == "proportion";
    }
    SetKind(_kind : string) : Promise<boolean>
    {
        if(_kind != CAvatarOption.eKind.Vocaloid && _kind != CAvatarOption.eKind.Roblox) return Promise.resolve(false);
        if(this.mOption.mKind == _kind) return Promise.resolve(true);
        this.mOption.mKind = _kind;
        this.mFaceName = null;
        return this.Rebuild();
    }
    SetBust(_v : number) : boolean
    {
        if(!this.Supports("bust")) return false;
        this.mOption.mBust = _v;
        this.mOption.mTune[CAvatarOption.eVocaloid.Bust] = _v;
        return true;
    }
    SetProportion(_v : number) : boolean
    {
        if(!this.Supports("proportion")) return false;
        this.mOption.mProportion = _v;
        this.mOption.mTune[CAvatarOption.eRoblox.Proportion] = _v;
        return true;
    }
    SetBodyType(_v : number) : boolean
    {
        if(!this.Supports("bodyType")) return false;
        this.mOption.mBodyType = Math.max(0, Math.min(1, _v));
        this.mOption.mTune[CAvatarOption.eRoblox.BodyType] = this.mOption.mBodyType;
        this.mModel?.SetSca(this.ModelScale());
        return true;
    }
    SetWidth(_v : number) : boolean
    {
        if(!this.Supports("width")) return false;
        this.mOption.mWidth = _v;
        this.mOption.mTune[CAvatarOption.eRoblox.Width] = _v;
        this.mModel?.SetSca(this.ModelScale());
        return true;
    }
    SetDepth(_v : number) : boolean
    {
        if(!this.Supports("depth")) return false;
        this.mOption.mDepth = _v;
        this.mOption.mTune[CAvatarOption.eRoblox.Depth] = _v;
        this.mModel?.SetSca(this.ModelScale());
        return true;
    }
    SetHead(_v : number) : boolean
    {
        if(!this.Supports("head")) return false;
        this.mOption.mHead = _v;
        this.mOption.mTune[CAvatarOption.eRoblox.Head] = _v;
        return true;
    }
    SetFace(_name : string) : boolean
    {
        if(!this.Supports("face")) return false;
        this.mOption.mFace = _name ?? "";
        this.mOption.mTune[CAvatarOption.eVocaloid.Face] = this.mOption.mFace;
        this.ApplyFace();
        return true;
    }
    SetHair(_name : string) : Promise<boolean>
    {
        if(!this.Supports("hair")) return Promise.resolve(false);
        this.mOption.mHair = _name ?? "";
        this.mOption.mTune[CAvatarOption.eVocaloid.Hair] = this.mOption.mHair;
        return this.Rebuild();
    }
    SetOutfit(_slot : string, _style : string, _rebuild = true) : Promise<boolean>
    {
        if(!this.Supports("outfit")) return Promise.resolve(false);
        const slot = CAvatarOption.SlotOf(_slot);
        if(slot == null) return Promise.resolve(false);
        if(_style == null || _style == "") delete this.mOption.mOutfit[slot];
        else this.mOption.mOutfit[slot] = _style;
        const key = (CAvatarOption.eCloth as Record<string, string>)[slot];
        if(key != null)
        {
            if(_style == null || _style == "") delete this.mOption.mTune[key];
            else this.mOption.mTune[key] = _style;
        }
        return _rebuild ? this.Rebuild() : Promise.resolve(true);
    }
    SetGender(_gender : string) : Promise<boolean>
    {
        if(!this.Supports("gender")) return Promise.resolve(false);
        const styles = this.mFactory.Styles(_gender);
        const out : Record<string, string> = {};
        for(const [slot, style] of Object.entries(this.mOption.mOutfit))
            if(styles.includes(style)) out[slot] = style;
        this.mOption.mGender = _gender;
        this.mOption.mOutfit = out;
        this.mOption.Stamp();
        return this.Rebuild();
    }
    FaceList() : string[]
    {
        if(this.mFaceName != null) return this.mFaceName;
        const mesh = this.mBody?.mMeshRes;
        if(mesh == null) return [];
        const names : string[] = [];
        for(const n of mesh.meshTree.GetArray())
        {
            const morph = n.mData?.morph;
            if(morph == null) continue;
            for(const name of morph.names)
                if(names.indexOf(name) < 0) names.push(name);
        }
        this.mFaceName = names;
        return names;
    }
    SetRig(_rig : string)
    {
        this.mOption.mRig = _rig;
        this.ApplyRig();
    }

    SetAni(_name : string, _inter = 0.2) : boolean
    {
        if(!this.Supports("ani")) return false;
        const ani = this.mFactory.GetAni(_name, this.mOption.mKind);
        if(ani == null) return false;
        this.mOption.mAni = _name;
        if(this.mAF == null) return true;
        if(this.mAF.GetAni() == ani) return true;
        this.mAF.SetInter(_inter);
        this.mAF.SetAni(ani);
        return true;
    }
    GetAni() : string { return this.mOption.mAni; }

    SetFeature(_key : string, _on : boolean)
    {
        this.mOption.mFeature[_key] = _on;
        this.ApplyRig();
    }
    IsFeature(_key : string) : boolean
    {
        if(this.mOption.mFeature[_key] != true) return false;
        return !((_key == "look" || _key == "foot") && this.GetRig() == CAvatarRig.eRig.R6);
    }
    SetLook(_target : IMat)
    {
        this.mLookTarget = _target;
        if(this.mLookIK != null) { this.mLookIK.Destroy(); this.mLookIK = null; }
        this.BuildIK();
    }
    SetHold(_target : CSubject, _bone = "hand_r")
    {
        this.mHoldTarget = _target;
        this.mHoldBone = _bone;
        if(this.mHoldIK != null) { this.mHoldIK.Destroy(); this.mHoldIK = null; }
        this.BuildIK();
    }

    //키는 상하좌우 같은 비율의 모델 스케일이라 다시 조립하지 않고 바로 바꾼다. 머리는 매 프레임 옵션을 읽는다
    SetHeight(_height : number, _head : number = null) : boolean
    {
        if(!this.Supports("height")) return false;
        this.mOption.mHeight = _height;
        this.mOption.mTune["height"] = _height;
        if(_head != null) this.SetHead(_head);
        this.mModel?.SetSca(this.ModelScale());
        return true;
    }
    private ModelScale() : CVec3
    {
        const o = this.mOption, unit = this.mFactory.mUnit / 39.37;
        let h = o.mHeight, w = o.mWidth, d = o.mDepth;
        if(o.mKind == CAvatarOption.eKind.Roblox && this.Supports("bodyType"))
        {
            h *= 1 + 0.12 * o.mBodyType;
            w *= 1 - 0.15 * o.mBodyType;
            d *= 1 - 0.1 * o.mBodyType;
        }
        if(o.mKind == CAvatarOption.eKind.Vocaloid) return new CVec3(unit * h, unit * h, unit * h);
        return new CVec3(unit * h * w, unit * h, unit * h * d);
    }

    //바뀐 값만 넘긴다. 외형이 바뀌므로 모델을 다시 조립한다
    Rebuild(_patch : Partial<CAvatarOption> = null) : Promise<boolean>
    {
        if(_patch != null) Object.assign(this.mOption, _patch);
        return this.Build();
    }

    async Build() : Promise<boolean>
    {
        const ver = ++this.mBuildVer, f = this.mFactory, o = this.mOption;
        const vocal = o.mKind == CAvatarOption.eKind.Vocaloid;
        let body = f.BodyFile(o.mGender, o.mKind), parts = f.PartFiles(o), hair = vocal ? null : f.HairFile(o.mHair);
        const files = [body, ...parts];
        if(hair != null) files.push(hair);
        if(!await f.Load(files) || !await f.LoadAni()) return false;
        if(ver != this.mBuildVer || this.IsDestroy()) return false;
        body = f.BodyFile(o.mGender, o.mKind);
        let bodyKey = body;
        if(!vocal)
        {
            const shape = ShapeOf(o);
            shape.bust = 0;
            body = f.Shape(body, o.mGender, shape);
            parts = parts.map(p => f.Shape(p, o.mGender, shape));
            hair = f.Shape(hair, o.mGender, shape);
            bodyKey = await f.BodyVariant(body, parts);
        }
        if(ver != this.mBuildVer || this.IsDestroy()) return false;
        const frame = f.mCanvas.GetFrame(), bodyMesh = frame.Res().Find(bodyKey) as CMesh;
        const skinBase = CAvatarSkin.BaseKey(bodyMesh), normBase = CAvatarSkin.BaseKey(bodyMesh, 1);
        const mask = CAvatarSkin.AbsMask(bodyMesh), level = CAvatarSkin.SoftLevel(o.mFat);
        const [skinTex, normTex] = skinBase == null || vocal ? [null, null] : await Promise.all([
            CAvatarSkin.Body(frame, skinBase, o.mSkin, mask, level), CAvatarSkin.Normal(frame, normBase, mask, level)]);
        const hairMesh = hair == null ? null : frame.Res().Find(hair) as CMesh;
        const hairBase = hairMesh == null ? null : CAvatarSkin.BaseKey(hairMesh);
        const hairTint = hairBase != null && (o.mHairColor[0] != 1 || o.mHairColor[1] != 1 || o.mHairColor[2] != 1);
        const hairTex = f.mMerge && hairTint ? await CAvatarSkin.Tint(frame, hairBase, o.mHairColor, true) : null;
        if(ver != this.mBuildVer || this.IsDestroy()) return false;

        if(this.mModel != null) this.mModel.Destroy();
        this.mFix = null;
        this.mFixMesh = null;
        this.mFaceName = null;
        this.mFat = vocal ? null : f.Fat(o.mGender);
        this.mSoft = skinBase == null || vocal ? null : { skin : skinBase, norm : normBase, mask, level, cur : [skinTex, normTex], wait : false };
        this.mPart = [];
        this.mLookIK = null;
        this.mHoldIK = null;
        const model = new CSubject();
        model.mSave = false;
        model.SetSca(this.ModelScale());
        if(f.mMerge)
        {
            const bodyTex = new Map<string, string>(), hairMap = new Map<string, string>();
            if(skinTex != null) bodyTex.set(skinBase, skinTex);
            if(normTex != null) bodyTex.set(normBase, normTex);
            if(hairTex != null) hairMap.set(hairBase, hairTex);
            const merged = f.Merge(bodyKey, bodyTex, parts, hair, hairMap);
            this.mMeshRig = this.GetRig();
            this.mFixMesh = frame.Res().Find(merged) as CMesh;
            this.mBody = this.Shade(model.PushComp(new CPaint3D(this.mMeshRig == CAvatarRig.eRig.R6 ? f.R6(merged) : merged)), null);
        }
        else
        {
            this.mBody = model.PushComp(new CPaint3D(bodyKey));
            if(skinTex != null) this.mBody.SetTexture(bodyMesh.texture.map(t => t == skinBase ? skinTex : t == normBase ? normTex : t));
            this.Shade(this.mBody, null);
            for(const p of parts) this.mPart.push({ pt : this.Shade(model.PushComp(new CPaint3D(p)), null), link : null });
            if(hair != null) this.mPart.push({ pt : this.Shade(model.PushComp(new CPaint3D(hair)), o.mHairColor), link : null });
        }
        const ani = f.GetAni(o.mAni, o.mKind) ?? f.GetAni("Idle", o.mKind);
        if(ani != null) this.mAF = model.PushComp(new CAniFlow(ani));
        model.PushComp(new CAvatarPose(this));
        this.mModel = model;
        this.PushChild(model);
        this.mRigApplied = "";
        this.ApplyFace();
        this.BuildIK();
        this.mReady = true;
        return true;
    }

    private Shade(_pt : CPaint3D, _rgb : number[]) : CPaint3D
    {
        _pt.mSave = false;
        if(_rgb != null && (_rgb[0] != 1 || _rgb[1] != 1 || _rgb[2] != 1))
            _pt.SetColorModel(new CColor(_rgb[0], _rgb[1], _rgb[2], CColor.eModel.RGBMul));
        if(this.mFactory.mLight)
        {
            _pt.PushTag(CPaint.eTag.Light);
            _pt.PushTag(CPaint.eTag.Shadow);
        }
        return _pt;
    }

    private BuildIK()
    {
        if(this.mModel == null) return;
        if(this.mLookTarget != null && this.mLookIK == null)
        {
            this.mLookIK = this.mModel.PushComp(new CLookAtIK("neck_01", this.mLookTarget));
            this.mLookIK.mSave = false;
        }
        if(this.mHoldTarget != null && this.mHoldIK == null)
        {
            this.mHoldIK = this.mModel.PushComp(new CAttacher(this.mHoldBone, this.mHoldTarget));
            this.mHoldIK.mSave = false;
        }
        this.mRigApplied = "";
        this.ApplyRig();
    }

    ApplyRig()
    {
        const rig = this.GetRig();
        if(this.mFactory.mMerge && this.mModel != null && this.mMeshRig != "" && this.mMeshRig != rig)
        {
            this.mMeshRig = "";
            this.Build();
        }
        if(this.mLookIK != null) this.mLookIK.SetEnable(this.IsFeature("look"));
        if(this.mHoldIK != null) this.mHoldIK.SetEnable(this.IsFeature("hold"));
        this.mRigApplied = rig;
    }

    UpdatePose(_dt = 1 / 60)
    {
        const body = this.mBody, tree = body?.GetTree();
        if(tree == null || body.mMeshRes == null) return;
        if(this.mRigApplied != this.GetRig()) this.ApplyRig();
        if(this.mFix == null) this.mFix = new CAvatarPoseFix(tree, this.mFixMesh ?? body.mMeshRes);
        const clip = this.mAF?.mFClip?.[0] as { mMesh? : string };
        const anim = clip?.mMesh == null ? null : this.mFactory.mCanvas.GetFrame().Res().Find(clip.mMesh) as CMesh;
        if(anim != null) CAvatarRig.ApplyClip(tree, this.mFixMesh ?? body.mMeshRes, anim);
        this.UpdateGround(tree, _dt);
        if(this.mRigApplied == CAvatarRig.eRig.R6) this.mFix.ApplyR6();
        //실제 머리 크기는 키에 거의 비례하지 않는다(머리 ∝ 키^0.3). 모델 전체를 키로 키우므로 머리는 키^-0.7만큼 되돌린다
        if(this.mOption.mKind != CAvatarOption.eKind.Vocaloid)
            this.mFix.ApplyHead(this.mOption.mHead * Math.pow(this.mOption.mHeight, CSubjectAvatar.sHeadByHeight));
        this.mFat?.Apply(tree, this.mOption.mFat);
        this.ApplyBust(tree);
        this.ApplyProportion(tree);
        this.UpdateSoft();
        for(const p of this.mPart)
        {
            if(p.link == null && !this.Link(p, tree)) continue;
            for(const [dst, src] of p.link) dst.pst.Import(src.pst);
            p.pt.UpdateFMat();
        }
    }

    private ApplyFace()
    {
        const body = this.mBody;
        if(body == null || !this.Supports("face")) return;
        const cur = this.mOption.mFace;
        for(const name of this.FaceList()) body.SetMorph(name, name == cur ? 1 : 0);
    }
    //가슴 본만 균일 스케일. 애니메이션 클립에 이 본이 없어도 부모를 따라가게 자식을 다시 붙인다
    private ApplyBust(_tree : CTree<CMeshCopyNode>)
    {
        if(!this.Supports("bust")) return;
        const s = Math.max(0.25, 1 + this.mOption.mBust * 0.6);
        for(const name of ["J_Sec_L_Bust1", "J_Sec_R_Bust1", "bust_l", "bust_r"])
        {
            const n = _tree.Find(name);
            if(n == null) continue;
            n.mData.sca.x = s;
            n.mData.sca.y = s;
            n.mData.sca.z = s;
            this.RefreshBone(n);
        }
    }
    //체형(BodyType)이 0이면 비율은 적용하지 않는다. 쇄골 축을 늘여 어깨 너비만 바꾼다
    private ApplyProportion(_tree : CTree<CMeshCopyNode>)
    {
        if(!this.Supports("proportion") || this.mOption.mBodyType <= 0) return;
        const s = 1.25 - 0.5 * this.mOption.mProportion;
        for(const name of ["clavicle_l", "clavicle_r"])
        {
            const n = _tree.Find(name);
            if(n == null) continue;
            const p = n.mData.pst.mF32A;
            p[0] *= s; p[1] *= s; p[2] *= s;
        }
    }
    private RefreshBone(_n : CTree<CMeshCopyNode>)
    {
        const d = _n.mData;
        d.MatUpdate();
        if(_n.mParent != null) d.pst = CMath.MatMul(d.pst, _n.mParent.mData.pst);
        for(let c = _n.mChild; c != null; c = c.mColleague) this.RefreshBone(c);
    }

    //체중 단계가 바뀌면 복근을 흐린 몸 텍스처로 바꾼다. 만드는 동안은 이전 텍스처를 그대로 쓴다
    private UpdateSoft()
    {
        const s = this.mSoft, level = CAvatarSkin.SoftLevel(this.mOption.mFat);
        if(s == null || s.wait || s.level == level) return;
        s.wait = true;
        const frame = this.mFactory.mCanvas.GetFrame(), body = this.mBody;
        Promise.all([CAvatarSkin.Body(frame, s.skin, this.mOption.mSkin, s.mask, level), CAvatarSkin.Normal(frame, s.norm, s.mask, level)]).then(([c, n]) =>
        {
            s.wait = false;
            if(this.mSoft != s || this.mBody != body || this.IsDestroy()) return;
            const [oc, on] = s.cur;
            body.SetTexture(body.GetTexture().map(t => t == oc ? c : t == on ? n : t));
            s.cur = [c, n];
            s.level = level;
        });
    }

    //팩토리에 지면 함수가 있으면 모델을 발밑 지면에 붙이고, 발 IK가 켜져 있으면 두 발을 각자 지면에 맞춘다
    private UpdateGround(_tree : CTree<CMeshCopyNode>, _dt : number)
    {
        const ground = this.mFactory.mGround;
        if(ground == null || this.mModel == null) return;
        const p = this.GetPos(), sy = this.GetSca().y || 1;
        const base = ground(p.x, p.z);
        let drop = 0;
        if(this.IsFeature("foot")) drop = this.mFoot.Apply(_tree, this.mBody.GetFMat(), ground, base, _dt);
        else this.mFoot.mDrop = 0;
        const y = (base - p.y - drop) / sy;
        const mp = this.mModel.GetPos();
        if(Math.abs(mp.y - y) > 1e-3) this.mModel.SetPos(new CVec3(0, y, 0));
    }

    //파츠 메시가 준비되면 본 스킨을 켜고 같은 이름의 몸 본과 짝을 짓는다
    private Link(_p : IAvatarPart, _body : CTree<CMeshCopyNode>) : boolean
    {
        const pt = _p.pt, tree = pt.GetTree();
        if(tree == null || pt.mMeshRes == null || pt.mWeightMat.length == 0) return false;
        if(pt.mSkinType != SDF.eSkin.Bone)
        {
            pt.mSkinType = SDF.eSkin.Bone;
            pt.ClearBatch();
        }
        _p.link = [];
        for(const n of tree.GetArray() as CTree<CMeshCopyNode>[])
        {
            if(!CAvatarRig.IsBone(n, pt.mMeshRes)) continue;
            const b = _body.Find(n.mKey);
            if(b != null) _p.link.push([n.mData, b.mData]);
        }
        return true;
    }

    override Destroy()
    {
        this.mFactory?.Remove(this, false);
        super.Destroy();
    }
}
