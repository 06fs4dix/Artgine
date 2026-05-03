import { CAniFlow } from "https://06fs4dix.github.io/Artgine/artgine/app/component/CAniFlow.js";
import { CAnimation, CClipAlpha, CClipCoodi, CClipDestroy } from "https://06fs4dix.github.io/Artgine/artgine/app/component/CAnimation.js";
import { CCollider } from "https://06fs4dix.github.io/Artgine/artgine/app/component/CCollider.js";
import { CForce } from "https://06fs4dix.github.io/Artgine/artgine/app/component/CForce.js";
import { CRigidBody } from "https://06fs4dix.github.io/Artgine/artgine/app/component/CRigidBody.js";
import { CSMComp } from "https://06fs4dix.github.io/Artgine/artgine/app/component/CSMComp.js";
import { CPaint2D } from "https://06fs4dix.github.io/Artgine/artgine/app/component/paint/CPaint2D.js";
import { CPad } from "https://06fs4dix.github.io/Artgine/artgine/app/subject/CPad.js";
import { CSubject } from "https://06fs4dix.github.io/Artgine/artgine/app/subject/CSubject.js";
import { CBlackBoardRef } from "https://06fs4dix.github.io/Artgine/artgine/basic/CObject.js";
import { CMath } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CMath.js";
import { CVec2 } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CVec2.js";
import { CVec3 } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CVec3.js";
import { CAlpha } from "https://06fs4dix.github.io/Artgine/artgine/render/CAlpha.js";
import { CColor } from "https://06fs4dix.github.io/Artgine/artgine/render/CColor.js";
import { CTexture } from "https://06fs4dix.github.io/Artgine/artgine/render/CTexture.js";
import { CAudioBuf } from "https://06fs4dix.github.io/Artgine/artgine/system/audio/CAudio.js";
import { CAction } from "https://06fs4dix.github.io/Artgine/artgine/util/CAction.js";
import { CRandom } from "https://06fs4dix.github.io/Artgine/artgine/util/CRandom.js";
import { CShadowPlane } from "https://06fs4dix.github.io/Artgine/plugin/ShadowPlane/ShadowPlane.js";
export class CUser extends CSubject {
    mRB;
    mAF;
    mPT;
    mCL;
    mBDir = new CVec3();
    m2DCam = new CBlackBoardRef("2D");
    mAniMap = new Map();
    constructor() {
        super();
    }
    Start() {
        this.mPT = this.PushComp(new CPaint2D("Res/Actor/Villager5/SeparateAnim/Walk.png", new CVec2(100, 100)));
        this.mPT.mSave = false;
        this.mPT.mAutoLoad.mFilter = CTexture.eFilter.Neaest;
        this.mPT.SetYSort(true);
        this.mPT.SetYSortOrigin(-50);
        this.mRB = this.PushComp(new CRigidBody());
        this.mRB.mSave = false;
        this.mSave = false;
        this.mCL = this.PushComp(new CCollider(this.mPT));
        this.mCL.mSave = false;
        this.mCL.SetLayer("player");
        this.mCL.PushCollisionLayer("object");
        this.mCL.PushCollisionLayer("player");
        this.mCL.SetRestitution(1);
        let itemCL = this.PushComp(new CCollider(this.mPT));
        itemCL.SetLayer("player");
        itemCL.PushCollisionLayer("item");
        itemCL.SetEvent(CCollider.eEvent.Trigger);
        this.PushComp(new CShadowPlane());
        let sm = this.PushComp(new CSMComp());
        sm.GetSM().PushRole([
            {
                "and": [{ "s": CVec3.eDir.Null, "o": "==", "v": 1 }],
                "exe": [{ "t": "Message", "a": "ResetAnimation", "p": ["StandLeft"] }]
            },
            {
                "and": [{ "s": "move" + CVec3.eDir.Left, "o": "==", "v": 1 }],
                "exe": [{ "t": "Message", "a": "MoveLeft" }]
            },
            {
                "and": [{ "s": "move" + CVec3.eDir.Right, "o": "==", "v": 1 }],
                "exe": [{ "t": "Message", "a": "MoveRight" }]
            },
            {
                "and": [{ "s": "move" + CVec3.eDir.Up, "o": "==", "v": 1 }],
                "exe": [{ "t": "Message", "a": "MoveUp" }]
            },
            {
                "and": [{ "s": "move" + CVec3.eDir.Down, "o": "==", "v": 1 }],
                "exe": [{ "t": "Message", "a": "MoveDown" }]
            },
            {
                "and": [{ "s": CVec3.eDir.Left, "o": "==", "v": 1 }, { "s": "move", "o": "!=", "v": 1 }],
                "exe": [{ "t": "Message", "a": "StandLeft" }]
            },
            {
                "and": [{ "s": CVec3.eDir.Right, "o": "==", "v": 1 }, { "s": "move", "o": "!=", "v": 1 }],
                "exe": [{ "t": "Message", "a": "StandRight" }]
            },
            {
                "and": [{ "s": CVec3.eDir.Up, "o": "==", "v": 1 }, { "s": "move", "o": "!=", "v": 1 }],
                "exe": [{ "t": "Message", "a": "StandUp" }]
            },
            {
                "and": [{ "s": CVec3.eDir.Down, "o": "==", "v": 1 }, { "s": "move", "o": "!=", "v": 1 }],
                "exe": [{ "t": "Message", "a": "StandDown" }]
            },
        ]);
        let ani = new CAnimation();
        ani.Push(new CClipCoodi(0, 0, 0, 0, 16, 16));
        this.mAniMap.set("StandDown", ani);
        ani = new CAnimation();
        ani.Push(new CClipCoodi(0, 0, 1 * 16, 0, 2 * 16, 16));
        this.mAniMap.set("StandUp", ani);
        ani = new CAnimation();
        ani.Push(new CClipCoodi(0, 0, 2 * 16, 0, 3 * 16, 16));
        this.mAniMap.set("StandLeft", ani);
        ani = new CAnimation();
        ani.Push(new CClipCoodi(0, 0, 3 * 16, 0, 4 * 16, 16));
        this.mAniMap.set("StandRight", ani);
        let tick = 0.1;
        ani = new CAnimation();
        for (let i = 0; i < 4; ++i)
            ani.Push(new CClipCoodi(i * tick, tick, 0, i * 16, 16, (1 + i) * 16));
        this.mAniMap.set("MoveDown", ani);
        ani = new CAnimation();
        for (let i = 0; i < 4; ++i)
            ani.Push(new CClipCoodi(i * tick, tick, 1 * 16, i * 16, 2 * 16, (1 + i) * 16));
        this.mAniMap.set("MoveUp", ani);
        ani = new CAnimation();
        for (let i = 0; i < 4; ++i)
            ani.Push(new CClipCoodi(i * tick, tick, 2 * 16, i * 16, 3 * 16, (1 + i) * 16));
        this.mAniMap.set("MoveLeft", ani);
        ani = new CAnimation();
        for (let i = 0; i < 4; ++i)
            ani.Push(new CClipCoodi(i * tick, tick, 3 * 16, i * 16, 4 * 16, (1 + i) * 16));
        this.mAniMap.set("MoveRight", ani);
        this.mAF = this.PushComp(new CAniFlow(ani));
        this.mAF.mSave = false;
    }
    ResetAnimation(_key) {
        this.mAF.SetAni(this.mAniMap.get(_key));
    }
    StandLeft() {
        this.mAF.SetAni(this.mAniMap.get("StandLeft"));
    }
    StandRight() {
        this.mAF.SetAni(this.mAniMap.get("StandRight"));
    }
    StandUp() {
        this.mAF.SetAni(this.mAniMap.get("StandUp"));
    }
    StandDown() {
        this.mAF.SetAni(this.mAniMap.get("StandDown"));
    }
    MoveLeft() {
        this.mAF.SetAni(this.mAniMap.get("MoveLeft"));
    }
    MoveRight() {
        this.mAF.SetAni(this.mAniMap.get("MoveRight"));
    }
    MoveUp() {
        this.mAF.SetAni(this.mAniMap.get("MoveUp"));
    }
    MoveDown() {
        this.mAF.SetAni(this.mAniMap.get("MoveDown"));
    }
    Update(_update) {
        super.Update(_update);
        if (this.FindChild(CPad) == null)
            return;
        let dir = this.FindChild(CPad).GetDir();
        if (dir.IsZero() == false) {
            if (this.mBDir.Equals(dir) == false)
                this.mRB.Push(new CForce("move", dir, 400));
            CAction.Excute(this, () => {
                let audio = new CAudioBuf("Res/sound/jute-dh-steps/stepdirt_2.wav");
                audio.Volume(0.5);
                audio.Play();
                let smoke = new CSubject();
                let pt = smoke.PushComp(new CPaint2D("Res/smoke.png", new CVec2(100, 100)));
                pt.SetColorModel(new CColor(1, 1, 1, CColor.eModel.RGBAdd));
                smoke.SetPMatMul(false);
                smoke.SetPos(CMath.V3AddV3(this.GetPos(), new CVec3(CRandom.MinMax(-30, 30), -50, 0)));
                let ani = new CAnimation();
                ani.Push(new CClipAlpha(0, 1, new CAlpha(0.4), new CAlpha(0)));
                ani.Push(new CClipDestroy(1));
                smoke.PushComp(new CAniFlow(ani));
                this.PushChild(smoke);
            }, 0, 0.3);
        }
        else {
            this.mRB.Remove("move");
            this.mBDir.Zero();
        }
        let camcon = this.m2DCam.Ref().GetCamCon();
        camcon.SetPos(this.GetPos());
    }
}
