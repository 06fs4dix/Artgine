import { CAniFlow } from "https://06fs4dix.github.io/Artgine/artgine/app/component/CAniFlow.js";
import { CAnimation, CClipAlpha, CClipDestroy } from "https://06fs4dix.github.io/Artgine/artgine/app/component/CAnimation.js";
import { CCollider } from "https://06fs4dix.github.io/Artgine/artgine/app/component/CCollider.js";
import { CForce } from "https://06fs4dix.github.io/Artgine/artgine/app/component/CForce.js";
import { CRigidBody } from "https://06fs4dix.github.io/Artgine/artgine/app/component/CRigidBody.js";
import { CRoleComp } from "https://06fs4dix.github.io/Artgine/artgine/app/component/CRoleComp.js";
import { CPaint2D } from "https://06fs4dix.github.io/Artgine/artgine/app/component/paint/CPaint2D.js";
import { CPad } from "https://06fs4dix.github.io/Artgine/artgine/app/subject/CPad.js";
import { CSubject } from "https://06fs4dix.github.io/Artgine/artgine/app/subject/CSubject.js";
import { CBlackBoardRef } from "https://06fs4dix.github.io/Artgine/artgine/basic/CObject.js";
import { CMath } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CMath.js";
import { CVec2 } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CVec2.js";
import { CVec3 } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CVec3.js";
import { CAlpha } from "https://06fs4dix.github.io/Artgine/artgine/render/CAlpha.js";
import { CColor } from "https://06fs4dix.github.io/Artgine/artgine/render/CColor.js";
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
    mUlpc = null;
    mLoaded = false;
    mState = "idle";
    mDir = CVec3.eDir.Down;
    constructor() {
        super();
    }
    Start() {
        this.GetFrame().Load().Exe("Res/ulpc/User.json");
        this.mPT = this.PushComp(new CPaint2D(null, new CVec2(128, 128)));
        this.mPT.mSave = false;
        this.mPT.SetAutoLoad(false);
        this.mPT.SetYSort(true);
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
        this.mAF = this.PushComp(new CAniFlow());
        this.mAF.mSave = false;
        let sm = this.PushComp(new CRoleComp());
        sm.GetRoleMgr().PushRole([
            {
                "and": [{ "s": "/rigidBody/force/" + CVec3.eDir.Null, "o": "==", "v": 1 }],
                "exe": [{ "t": "Message", "a": "ResetAnimation", "p": ["StandLeft"] }]
            },
            {
                "and": [{ "s": "/rigidBody/force/move" + CVec3.eDir.Left, "o": "==", "v": 1 }],
                "exe": [{ "t": "Message", "a": "ResetAnimation", "p": ["MoveLeft"] }]
            },
            {
                "and": [{ "s": "/rigidBody/force/move" + CVec3.eDir.Right, "o": "==", "v": 1 }],
                "exe": [{ "t": "Message", "a": "ResetAnimation", "p": ["MoveRight"] }]
            },
            {
                "and": [{ "s": "/rigidBody/force/move" + CVec3.eDir.Up, "o": "==", "v": 1 }],
                "exe": [{ "t": "Message", "a": "ResetAnimation", "p": ["MoveUp"] }]
            },
            {
                "and": [{ "s": "/rigidBody/force/move" + CVec3.eDir.Down, "o": "==", "v": 1 }],
                "exe": [{ "t": "Message", "a": "ResetAnimation", "p": ["MoveDown"] }]
            },
            {
                "and": [{ "s": "/rigidBody/force/" + CVec3.eDir.Left, "o": "==", "v": 1 }, { "s": "/rigidBody/force/move", "o": "!=", "v": 1 }],
                "exe": [{ "t": "Message", "a": "ResetAnimation", "p": ["StandLeft"] }]
            },
            {
                "and": [{ "s": "/rigidBody/force/" + CVec3.eDir.Right, "o": "==", "v": 1 }, { "s": "/rigidBody/force/move", "o": "!=", "v": 1 }],
                "exe": [{ "t": "Message", "a": "ResetAnimation", "p": ["StandRight"] }]
            },
            {
                "and": [{ "s": "/rigidBody/force/" + CVec3.eDir.Up, "o": "==", "v": 1 }, { "s": "/rigidBody/force/move", "o": "!=", "v": 1 }],
                "exe": [{ "t": "Message", "a": "ResetAnimation", "p": ["StandUp"] }]
            },
            {
                "and": [{ "s": "/rigidBody/force/" + CVec3.eDir.Down, "o": "==", "v": 1 }, { "s": "/rigidBody/force/move", "o": "!=", "v": 1 }],
                "exe": [{ "t": "Message", "a": "ResetAnimation", "p": ["StandDown"] }]
            },
        ]);
    }
    ResetAnimation(_key) {
        const isMove = _key.startsWith("Move");
        this.mState = isMove ? "walk" : "idle";
        if (_key.endsWith("Down"))
            this.mDir = CVec3.eDir.Down;
        else if (_key.endsWith("Up"))
            this.mDir = CVec3.eDir.Up;
        else if (_key.endsWith("Left"))
            this.mDir = CVec3.eDir.Left;
        else if (_key.endsWith("Right"))
            this.mDir = CVec3.eDir.Right;
    }
    Update(_update) {
        if (!this.mLoaded) {
            const culpc = this.GetFrame().Res().Find("Res/ulpc/User.json");
            if (culpc) {
                this.mPT.SetTexture(culpc.mTexture.Key());
                this.mUlpc = culpc;
                this.mLoaded = true;
            }
        }
        if (this.mLoaded) {
            const ani = this.mUlpc.GetAni(this.mState, this.mDir);
            if (ani)
                this.mAF.SetAni(ani);
        }
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
