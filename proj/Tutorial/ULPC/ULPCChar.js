import { CAniFlow } from "https://06fs4dix.github.io/Artgine/artgine/app/component/CAniFlow.js";
import { CForce } from "https://06fs4dix.github.io/Artgine/artgine/app/component/CForce.js";
import { CRigidBody } from "https://06fs4dix.github.io/Artgine/artgine/app/component/CRigidBody.js";
import { CPaint2D } from "https://06fs4dix.github.io/Artgine/artgine/app/component/paint/CPaint2D.js";
import { CPad } from "https://06fs4dix.github.io/Artgine/artgine/app/subject/CPad.js";
import { CSubject } from "https://06fs4dix.github.io/Artgine/artgine/app/subject/CSubject.js";
import { CEvent } from "https://06fs4dix.github.io/Artgine/artgine/basic/CEvent.js";
import { CVec2 } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CVec2.js";
import { CVec3 } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CVec3.js";
import { CParserULPC } from "https://06fs4dix.github.io/Artgine/artgine/util/parser/CParserULPC.js";
export class ULPCChar extends CSubject {
    mState = "idle";
    mDir = CVec3.eDir.Down;
    mLockState = false;
    mJsonPath = "";
    mCulpc = null;
    mFlow = null;
    mRB = null;
    mLoaded = false;
    Setup(_jsonPath) {
        this.mJsonPath = _jsonPath;
    }
    SetupFromData(_jsonStr) {
        this._loadFromData(_jsonStr);
    }
    async _loadFromData(_jsonStr) {
        const bytes = new TextEncoder().encode(_jsonStr);
        const parser = new CParserULPC();
        parser.SetBuffer(bytes, bytes.length);
        await parser.Load('inline.json');
        const culpc = parser.GetResult();
        this.GetFrame().Res().Push('inline.json', culpc);
        this.GetFrame().Res().Push(culpc.mTexture.Key(), culpc.mTexture);
        this._applyULPC(culpc);
    }
    _applyULPC(_culpc) {
        const paintIdx = this.FindComps(CPaint2D).length;
        const paint = this.PushComp(new CPaint2D(null, new CVec2(64, 64)));
        paint.mSave = false;
        paint.SetAutoLoad(false);
        paint.SetYSort(true);
        paint.SetTexture(_culpc.mTexture.Key());
        const flow = this.PushComp(new CAniFlow());
        flow.mSave = false;
        flow.mPaintOff = paintIdx;
        this.mFlow = flow;
        this.mRB = this.PushComp(new CRigidBody());
        this.mRB.mSave = false;
        this.mCulpc = _culpc;
        this.mLoaded = true;
    }
    Start() {
        if (this.mJsonPath)
            this.GetFrame().Load().Exe(this.mJsonPath);
    }
    Update(_update) {
        if (!this.mLoaded) {
            if (!this.mJsonPath)
                return;
            const culpc = this.GetFrame().Res().Find(this.mJsonPath);
            if (!culpc)
                return;
            this._applyULPC(culpc);
            return;
        }
        const pad = this.FindChild(CPad);
        if (pad) {
            const btn0 = pad.GetButtonEvent(0);
            const btn1 = pad.GetButtonEvent(1);
            if (btn0 === CEvent.eType.Press) {
                this.mState = "slash";
                this.mLockState = true;
            }
            else if (btn0 === CEvent.eType.Click && this.mState === "slash") {
                this.mLockState = false;
                this.mState = "idle";
            }
            if (btn1 === CEvent.eType.Press) {
                this.mState = "spellcast";
                this.mLockState = true;
            }
            else if (btn1 === CEvent.eType.Click && this.mState === "spellcast") {
                this.mLockState = false;
                this.mState = "idle";
            }
            const dir = pad.GetDir();
            if (!dir.IsZero()) {
                this.mRB.Push(new CForce("move", dir, 300));
                this.mDir = Math.abs(dir.x) >= Math.abs(dir.y)
                    ? (dir.x < 0 ? CVec3.eDir.Left : CVec3.eDir.Right)
                    : (dir.y > 0 ? CVec3.eDir.Up : CVec3.eDir.Down);
                if (!this.mLockState)
                    this.mState = "walk";
            }
            else {
                this.mRB.Remove("move");
                if (!this.mLockState && this.mState === "walk")
                    this.mState = "idle";
            }
        }
        const ani = this.mCulpc.GetAni(this.mState, this.mDir);
        if (ani)
            this.mFlow.SetAni(ani);
        super.Update(_update);
    }
}
