import { CForgeScene } from "./CForgeScene.js";
export class CForgeHistory {
    mScene;
    mUndo = [];
    mRedo = [];
    mMax = 200;
    mGroup = null;
    mDepth = 0;
    constructor(_scene) {
        this.mScene = _scene;
    }
    Begin(_label) {
        if (this.mDepth++ == 0)
            this.mGroup = { label: _label, list: [] };
    }
    End() {
        if (this.mDepth == 0)
            return;
        if (--this.mDepth > 0)
            return;
        const cmd = this.mGroup;
        this.mGroup = null;
        cmd.list = cmd.list.filter(_c => JSON.stringify(_c.before) != JSON.stringify(_c.after));
        if (cmd.list.length == 0)
            return;
        this.mUndo.push(cmd);
        if (this.mUndo.length > this.mMax)
            this.mUndo.shift();
        this.mRedo = [];
    }
    Push(_kind, _ent, _label = "push") {
        this.Begin(_label);
        const before = _ent.id > 0 ? CForgeScene.Clone(this.mScene.Find(_kind, _ent.id)) : null;
        const after = this.mScene.Push(_kind, _ent);
        this.Record(_kind, after.id, before, CForgeScene.Clone(after));
        this.End();
        return after;
    }
    Remove(_kind, _id, _label = "remove") {
        const before = CForgeScene.Clone(this.mScene.Find(_kind, _id));
        if (before == null)
            return false;
        this.Begin(_label);
        this.mScene.Remove(_kind, _id);
        this.Record(_kind, _id, before, null);
        this.End();
        return true;
    }
    IsUndo() { return this.mUndo.length > 0; }
    IsRedo() { return this.mRedo.length > 0; }
    Undo() {
        const cmd = this.mUndo.pop();
        if (cmd == null)
            return null;
        for (let i = cmd.list.length - 1; i >= 0; i--)
            this.Apply(cmd.list[i].kind, cmd.list[i].id, cmd.list[i].before);
        this.mRedo.push(cmd);
        return cmd.label;
    }
    Redo() {
        const cmd = this.mRedo.pop();
        if (cmd == null)
            return null;
        for (const c of cmd.list)
            this.Apply(c.kind, c.id, c.after);
        this.mUndo.push(cmd);
        return cmd.label;
    }
    Clear() {
        this.mUndo = [];
        this.mRedo = [];
        this.mGroup = null;
        this.mDepth = 0;
    }
    Record(_kind, _id, _before, _after) {
        const prev = this.mGroup.list.find(_c => _c.kind == _kind && _c.id == _id);
        if (prev != null)
            prev.after = _after;
        else
            this.mGroup.list.push({ kind: _kind, id: _id, before: _before, after: _after });
    }
    Apply(_kind, _id, _state) {
        if (_state == null)
            this.mScene.Remove(_kind, _id);
        else
            this.mScene.Push(_kind, _state);
    }
}
