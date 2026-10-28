import { CModal } from "../../artgine/basic/CModal.js";
import { CEvent } from "../../artgine/basic/CEvent.js";
import { CAvatarOption } from "./CAvatarOption.js";
export class CAvatarPanel {
    mFactory;
    mTarget = null;
    mModal = null;
    mRoot = null;
    mStatus = null;
    mTimer = 0;
    mRebuild = 0;
    mFaceN = -1;
    constructor(_factory) { this.mFactory = _factory; }
    Open(_target = null) {
        this.mTarget = _target ?? [...this.mFactory.mAvatar][0] ?? null;
        if (this.mModal == null) {
            this.mModal = new CModal("ForgeAvatarPanel");
            this.mModal.SetTitle(CModal.eTitle.TextClose);
            this.mModal.SetHeader("Avatar");
            this.mModal.SetSize(340, 640);
            this.mModal.SetResize(true);
            this.mRoot = document.createElement("div");
            this.mRoot.style.fontSize = "12px";
            this.mModal.SetBody(this.mRoot);
            this.mModal.On(CEvent.eType.Close, () => this.Release());
            this.mModal.Open(CModal.ePos.TopRight);
        }
        this.Build();
        if (this.mTimer == 0)
            this.mTimer = window.setInterval(() => this.Status(), 500);
    }
    Close() { this.mModal?.Close(); this.Release(); }
    Release() {
        if (this.mTimer != 0)
            window.clearInterval(this.mTimer);
        this.mTimer = 0;
        this.mModal = null;
    }
    Row(_label, _el) {
        const row = document.createElement("div");
        row.className = "d-flex align-items-center mb-1 gap-2";
        const lb = document.createElement("div");
        lb.textContent = _label;
        lb.style.width = "70px";
        lb.style.flex = "0 0 70px";
        row.append(lb, _el);
        _el.style.flex = "1 1 auto";
        this.mRoot.append(row);
        return row;
    }
    Head(_text) {
        const h = document.createElement("div");
        h.className = "fw-bold mt-2 mb-1 border-bottom";
        h.textContent = _text;
        this.mRoot.append(h);
    }
    Select(_label, _list, _value, _fn) {
        const s = document.createElement("select");
        s.className = "form-select form-select-sm";
        for (const o of _list) {
            const op = document.createElement("option");
            op.value = o.value;
            op.textContent = o.label;
            s.append(op);
        }
        s.value = _value;
        s.onchange = () => _fn(s.value);
        this.Row(_label, s);
        return s;
    }
    Range(_label, _min, _max, _value, _fn, _live = false) {
        const wrap = document.createElement("div");
        wrap.className = "d-flex align-items-center gap-1";
        const r = document.createElement("input");
        r.type = "range";
        r.className = "form-range";
        r.min = _min + "";
        r.max = _max + "";
        r.step = "0.01";
        r.value = _value + "";
        const v = document.createElement("span");
        v.style.width = "34px";
        v.textContent = _value.toFixed(2);
        r.oninput = () => { v.textContent = Number(r.value).toFixed(2); if (_live)
            _fn(Number(r.value)); };
        r.onchange = () => _fn(Number(r.value));
        wrap.append(r, v);
        this.Row(_label, wrap);
    }
    Color(_label, _rgb, _fn) {
        const c = document.createElement("input");
        c.type = "color";
        c.className = "form-control form-control-sm form-control-color";
        c.value = "#" + _rgb.map(x => Math.round(Math.min(1, x) * 255).toString(16).padStart(2, "0")).join("");
        c.onchange = () => _fn([1, 3, 5].map(i => parseInt(c.value.substring(i, i + 2), 16) / 255));
        this.Row(_label, c);
    }
    Check(_label, _on, _fn) {
        const d = document.createElement("div");
        d.className = "form-check form-check-inline";
        const c = document.createElement("input");
        c.type = "checkbox";
        c.className = "form-check-input";
        c.checked = _on;
        c.onchange = () => _fn(c.checked);
        const l = document.createElement("label");
        l.className = "form-check-label";
        l.textContent = _label;
        d.append(c, l);
        return d;
    }
    Button(_label, _fn, _cls = "btn-outline-secondary") {
        const b = document.createElement("button");
        b.className = "btn btn-sm " + _cls;
        b.textContent = _label;
        b.onclick = _fn;
        return b;
    }
    Patch(_p) {
        const t = this.mTarget;
        if (t == null)
            return;
        Object.assign(t.GetOption(), _p);
        window.clearTimeout(this.mRebuild);
        this.mRebuild = window.setTimeout(() => t.Rebuild(), 150);
    }
    Build() {
        if (this.mRoot == null)
            return;
        this.mRoot.innerHTML = "";
        const f = this.mFactory, list = [...f.mAvatar];
        this.mStatus = document.createElement("div");
        this.mStatus.className = "text-muted mb-1";
        this.mRoot.append(this.mStatus);
        this.Select("대상", list.map((a, i) => ({ label: i + ": " + a.GetOption().mGender + " " + (a.GetOption().mOutfit.Body ?? "-"), value: i + "" })), list.indexOf(this.mTarget) + "", v => { this.mTarget = list[Number(v)]; this.Build(); });
        const t = this.mTarget;
        if (t == null)
            return;
        const o = t.GetOption();
        this.Head("종류");
        this.Select("종류", [{ label: "로블록스", value: CAvatarOption.eKind.Roblox }, { label: "보컬로이드", value: CAvatarOption.eKind.Vocaloid }], o.mKind, v => { this.mFaceN = -1; t.SetKind(v).then(() => this.Build()); });
        this.Select("품질", ["Auto", "High", "Low"].map(q => ({ label: q, value: q })), f.mQuality, v => { f.SetQuality(v); this.Build(); });
        this.Select("텍스처", ["4k", "2k", "1k"].map(s => ({ label: s, value: s })), f.GetTexSize(), v => {
            f.mTexSize = v;
            for (const a of f.mAvatar)
                a.Rebuild();
        });
        if (t.Supports("ani")) {
            this.Head("애니메이션");
            const anis = f.GetAniList(o.mKind);
            const prefer = ["Idle", "Walk", "Run", "Sprint", "Jump", "Fall", "Land", "Sit", "Dance", "Cheer", "Crouch", "Death", "Climb", "Swim", "SwimIdle", "WalkFormal", "Talk", "Greeting", "Pose", "Squat", "Test"];
            const shown = prefer.filter(a => anis.indexOf(a) >= 0);
            this.Select("애니", shown.map(a => ({ label: a, value: a })), shown.indexOf(o.mAni) >= 0 ? o.mAni : (shown[0] ?? ""), v => t.SetAni(v));
        }
        this.Head("조절");
        if (t.Supports("gender"))
            this.Select("성별", [{ label: "여", value: "female" }, { label: "남", value: "male" }], o.mGender, v => t.SetGender(v).then(() => this.Build()));
        if (t.Supports("height"))
            this.Range("키", 0.7, 1.3, o.mHeight, v => t.SetHeight(v), true);
        if (t.Supports("width"))
            this.Range("너비", 0.7, 1.35, o.mWidth, v => t.SetWidth(v), true);
        if (t.Supports("depth"))
            this.Range("두께", 0.7, 1.35, o.mDepth, v => t.SetDepth(v), true);
        if (t.Supports("head"))
            this.Range("머리", 0.7, 1.4, o.mHead, v => t.SetHead(v), true);
        if (t.Supports("bodyType"))
            this.Range("체형", 0, 1, o.mBodyType, v => t.SetBodyType(v), true);
        if (t.Supports("proportion"))
            this.Range("어깨 비율", 0, 1, o.mProportion, v => t.SetProportion(v), true);
        if (t.Supports("bust"))
            this.Range("가슴", -1, 1, o.mBust, v => t.SetBust(v), true);
        if (t.Supports("face")) {
            const faces = t.FaceList().filter(n => /EYE|MTH|BRW|FUN|ANG|SURP|Joy|Angry|Fun|Sorrow/i.test(n)).slice(0, 16);
            const list = faces.length > 0 ? faces : t.FaceList().slice(0, 16);
            this.Select("표정", [{ label: "기본", value: "" }, ...list.map(n => ({ label: n.replace(/^Fcl_/, ""), value: n }))], o.mFace, v => t.SetFace(v));
        }
        if (t.Supports("hair")) {
            this.Select("헤어", [{ label: "없음", value: "" }, ...f.HairList().map(h => ({ label: h, value: h }))], o.mHair, v => t.SetHair(v).then(() => this.Build()));
            this.Color("헤어색", o.mHairColor, c => this.Patch({ mHairColor: c }));
            this.Color("피부색", o.mSkin, c => this.Patch({ mSkin: c }));
        }
        if (t.Supports("outfit")) {
            this.Head("옷");
            const styles = f.Styles(o.mGender, o.mKind);
            this.Select("세트", [{ label: "선택…", value: "" }, { label: "속옷", value: "#none" }, ...styles.map(s => ({ label: s + " 전체", value: s }))], "", v => {
                if (v == "")
                    return;
                for (const slot of Object.values(CAvatarOption.eSlot))
                    t.SetOutfit(slot, v == "#none" || !f.HasSlot(o.mGender, v, slot, o.mKind) ? "" : v, false);
                t.Rebuild().then(() => this.Build());
            });
            for (const slot of Object.values(CAvatarOption.eSlot)) {
                const can = styles.filter(s => f.HasSlot(o.mGender, s, slot, o.mKind));
                if (can.length == 0)
                    continue;
                const cur = o.mOutfit[slot] ?? "";
                const shown = can.indexOf(cur) >= 0 || cur == "" ? cur : can[0];
                this.Select(slot, [{ label: "없음", value: "" }, ...can.map(s => ({ label: s, value: s }))], shown, v => t.SetOutfit(slot, v).then(() => this.Build()));
            }
        }
        this.Head("저장");
        const btns = document.createElement("div");
        btns.className = "d-flex gap-1 mb-1 flex-wrap";
        const area = document.createElement("textarea");
        area.className = "form-control form-control-sm";
        area.rows = 4;
        btns.append(this.Button("무작위", () => { const n = new CAvatarOption({ mRandom: true }); f.Randomize(n); Object.assign(o, n, { mFeature: o.mFeature }); t.Rebuild().then(() => this.Build()); }, "btn-outline-primary"), this.Button("내보내기", () => { area.value = t.ExportJson(); }), this.Button("가져오기", () => {
            try {
                Object.assign(o, CAvatarOption.ImportJson(area.value));
            }
            catch (e) {
                area.value = "JSON 오류: " + e;
                return;
            }
            t.Rebuild().then(() => this.Build());
        }));
        this.mRoot.append(btns, area);
        this.Status();
    }
    Status() {
        if (this.mStatus == null)
            return;
        const f = this.mFactory, t = this.mTarget;
        const kind = t == null ? "" : (t.GetOption().mKind == CAvatarOption.eKind.Vocaloid ? "보컬로이드" : "로블록스");
        this.mStatus.textContent = "FPS " + f.mFps.toFixed(0) + " · 품질 " + f.mQuality + " · 등급 " + f.mTier
            + (t == null ? "" : " · " + kind + " " + t.GetRig() + (t.IsReady() ? "" : " (조립 중)"));
        if (t != null && t.IsReady()) {
            const n = t.FaceList().length;
            if (n != this.mFaceN) {
                this.mFaceN = n;
                this.Build();
            }
        }
    }
}
