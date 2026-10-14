import { CForgeRand } from "./CForgeRand.js";
export class CForgeScene {
    static sVersion = 1;
    static sUnit = 100;
    static sSize = 128;
    static eKind = { Wall: "wall", Building: "building", Tower: "tower", Path: "path", Fence: "fence", Bridge: "bridge", Stair: "stair", Church: "church", Dock: "dock", Monument: "monument" };
    static sKindList = Object.values(CForgeScene.eKind);
    static eRoof = { Auto: 0, Gable: 1, Hip: 2, Cone: 3, Flat: 4 };
    static Bounds(_kind, _e) {
        const K = CForgeScene.eKind;
        let pts = [], pad = 0;
        if (_kind == K.Wall) {
            pts = _e.pts;
            pad = _e.thick;
        }
        else if (_kind == K.Building) {
            pts = _e.poly;
            pad = 1;
        }
        else if (_kind == K.Tower) {
            pts = [_e.c];
            pad = _e.r * 1.3;
        }
        else if (_kind == K.Path) {
            pts = _e.pts;
            pad = _e.width * 0.5;
        }
        else if (_kind == K.Fence) {
            pts = _e.pts;
            pad = 0.5;
        }
        else if (_kind == K.Bridge || _kind == K.Stair || _kind == K.Dock) {
            pts = _e.pts;
            pad = _e.width * 0.5 + 1.5;
        }
        else if (_kind == K.Church) {
            pts = _e.poly;
            pad = 2;
        }
        else if (_kind == K.Monument) {
            pts = [_e.c];
            pad = _e.size + 1;
        }
        let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
        for (const p of pts) {
            x0 = Math.min(x0, p[0]);
            z0 = Math.min(z0, p[1]);
            x1 = Math.max(x1, p[0]);
            z1 = Math.max(z1, p[1]);
        }
        return [x0 - pad, z0 - pad, x1 + pad, z1 + pad];
    }
    static Overlap(_a, _b) {
        return _a[0] <= _b[2] && _b[0] <= _a[2] && _a[1] <= _b[3] && _b[1] <= _a[3];
    }
    Touch(_kind, _id) { if (this.mMap.get(_kind).has(_id))
        this.mDirty.get(_kind).add(_id); }
    mSeed;
    mNextID = 1;
    mMap = new Map();
    mDirty = new Map();
    constructor(_seed = 1) {
        this.mSeed = _seed >>> 0;
        for (const k of CForgeScene.sKindList) {
            this.mMap.set(k, new Map());
            this.mDirty.set(k, new Set());
        }
    }
    static Clone(_v) { return _v == null ? null : JSON.parse(JSON.stringify(_v)); }
    NewID() { return this.mNextID++; }
    Push(_kind, _ent) {
        const ent = CForgeScene.Clone(_ent);
        if (!(ent.id > 0))
            ent.id = this.NewID();
        else if (ent.id >= this.mNextID)
            this.mNextID = ent.id + 1;
        if (!(ent.seed > 0))
            ent.seed = CForgeRand.Hash(this.mSeed, ent.id) || 1;
        this.mMap.get(_kind).set(ent.id, ent);
        this.mDirty.get(_kind).add(ent.id);
        return ent;
    }
    Find(_kind, _id) {
        return this.mMap.get(_kind).get(_id) ?? null;
    }
    List(_kind) {
        return [...this.mMap.get(_kind).values()].sort((_a, _b) => _a.id - _b.id);
    }
    Remove(_kind, _id) {
        if (!this.mMap.get(_kind).delete(_id))
            return false;
        this.mDirty.get(_kind).add(_id);
        return true;
    }
    Count(_kind) { return this.mMap.get(_kind).size; }
    Clear() {
        for (const k of CForgeScene.sKindList) {
            for (const id of this.mMap.get(k).keys())
                this.mDirty.get(k).add(id);
            this.mMap.get(k).clear();
        }
        this.mNextID = 1;
    }
    PopDirty() {
        const out = [];
        for (const k of CForgeScene.sKindList) {
            const set = this.mDirty.get(k);
            for (const id of [...set].sort((_a, _b) => _a - _b))
                out.push([k, id]);
            set.clear();
        }
        return out;
    }
    Export() {
        const ent = {};
        for (const k of CForgeScene.sKindList)
            ent[k] = this.List(k).map(_e => CForgeScene.Round(CForgeScene.Clone(_e)));
        return { version: CForgeScene.sVersion, seed: this.mSeed, nextID: this.mNextID, ent };
    }
    Import(_data) {
        this.Clear();
        this.mSeed = (_data.seed ?? 1) >>> 0;
        for (const k of CForgeScene.sKindList)
            for (const e of (_data.ent?.[k] ?? []))
                this.Push(k, e);
        this.mNextID = Math.max(this.mNextID, _data.nextID ?? 1);
    }
    ExportJson() { return JSON.stringify(this.Export()); }
    ImportJson(_json) { this.Import(JSON.parse(_json)); }
    Hash() {
        const d = this.Export();
        const s = JSON.stringify({ seed: d.seed, ent: d.ent });
        let h = 0x811C9DC5;
        for (let i = 0; i < s.length; i++)
            h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
        return h >>> 0;
    }
    static Round(_v) {
        if (typeof _v == "number")
            return Math.round(_v * 10000) / 10000;
        if (Array.isArray(_v))
            return _v.map(CForgeScene.Round);
        if (_v != null && typeof _v == "object") {
            for (const k of Object.keys(_v))
                _v[k] = CForgeScene.Round(_v[k]);
        }
        return _v;
    }
}
