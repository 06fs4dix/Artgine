import { CArray } from "../../basic/CArray.js";
import { COctreeMgr } from "../../geometry/COctree.js";
import { CComponent } from "./CComponent.js";
export class CGeometryInfo {
    mRay = new Map();
    mPlane = new Map();
    mOctree = new COctreeMgr();
    mFixedComp = new CArray();
    constructor(_frame) {
        if (_frame != null && _frame.PF().mIAuto)
            _frame.PushIAuto(this);
    }
    Fixed(_update) {
        this.mFixedComp.Sort((a, b) => { return a.mSysc - b.mSysc; });
        const count = _update.FixedCount();
        for (let i = 0; i < count; ++i) {
            for (let j = 0; j < this.mFixedComp.Size(); ++j) {
                let comp = this.mFixedComp.Find(j);
                if (comp.IsDestroy())
                    continue;
                comp.Fixed(_update);
            }
            for (let j = 0; j < this.mFixedComp.Size(); ++j) {
                let comp = this.mFixedComp.Find(j);
                if (comp.IsDestroy())
                    continue;
                comp.BuildGI();
            }
            const su = this.mOctree.mStaticUpdate;
            if (i < count - 1)
                this.mOctree.mStaticUpdate = false;
            this.mOctree.Build();
            if (i < count - 1)
                this.mOctree.mStaticUpdate = su || this.mOctree.mStaticUpdate;
        }
        this.mFixedComp.Clear();
    }
}
export class CGeometryComp extends CComponent {
    Icon() { return "bi bi-bounding-box"; }
    constructor() {
        super();
        this.mSysc = CComponent.eSysn.CamComp;
    }
    mCanKey = "";
    mGI = null;
    GetGI() { return this.mGI; }
    IsShould(_member, _type) {
        if (_member == "mGI")
            return false;
        return super.IsShould(_member, _type);
    }
    StartChk() {
        if (this.mStartChk == true && this.mGI != null) {
            this.mStartChk = false;
            return true;
        }
        else {
            var cm = this.ProductMsg("SendGetGeometryInfo");
            cm.mInter = "canvas";
            cm.mMsgData[0] = this;
        }
        return false;
    }
    RecvGetGeometryInfo(_GI, _key) {
        this.mGI = _GI;
        this.mCanKey = _key;
    }
}
