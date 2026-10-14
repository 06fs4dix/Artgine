import { CForgeScene, IForgeEntity } from "./CForgeScene.js";

interface IForgeChange { kind : string; id : number; before : IForgeEntity; after : IForgeEntity; }
interface IForgeCommand { label : string; list : IForgeChange[]; }

export class CForgeHistory
{
    mScene : CForgeScene;
    mUndo : IForgeCommand[] = [];
    mRedo : IForgeCommand[] = [];
    mMax = 200;
    mGroup : IForgeCommand = null;
    mDepth = 0;

    constructor(_scene : CForgeScene)
    {
        this.mScene = _scene;
    }

    Begin(_label : string)
    {
        if(this.mDepth++ == 0) this.mGroup = { label : _label, list : [] };
    }
    End()
    {
        if(this.mDepth == 0) return;
        if(--this.mDepth > 0) return;
        const cmd = this.mGroup;
        this.mGroup = null;
        //움직이지 않은 클릭처럼 결과가 처음과 같은 변경은 기록하지 않는다
        cmd.list = cmd.list.filter(_c => JSON.stringify(_c.before) != JSON.stringify(_c.after));
        if(cmd.list.length == 0) return;
        this.mUndo.push(cmd);
        if(this.mUndo.length > this.mMax) this.mUndo.shift();
        this.mRedo = [];
    }

    Push<T extends IForgeEntity>(_kind : string, _ent : T, _label : string = "push") : T
    {
        this.Begin(_label);
        const before = _ent.id > 0 ? CForgeScene.Clone(this.mScene.Find(_kind, _ent.id)) : null;
        const after = this.mScene.Push(_kind, _ent);
        this.Record(_kind, after.id, before, CForgeScene.Clone(after));
        this.End();
        return after;
    }
    Remove(_kind : string, _id : number, _label : string = "remove") : boolean
    {
        const before = CForgeScene.Clone(this.mScene.Find(_kind, _id));
        if(before == null) return false;
        this.Begin(_label);
        this.mScene.Remove(_kind, _id);
        this.Record(_kind, _id, before, null);
        this.End();
        return true;
    }

    IsUndo() : boolean { return this.mUndo.length > 0; }
    IsRedo() : boolean { return this.mRedo.length > 0; }
    Undo() : string
    {
        const cmd = this.mUndo.pop();
        if(cmd == null) return null;
        for(let i = cmd.list.length - 1; i >= 0; i--) this.Apply(cmd.list[i].kind, cmd.list[i].id, cmd.list[i].before);
        this.mRedo.push(cmd);
        return cmd.label;
    }
    Redo() : string
    {
        const cmd = this.mRedo.pop();
        if(cmd == null) return null;
        for(const c of cmd.list) this.Apply(c.kind, c.id, c.after);
        this.mUndo.push(cmd);
        return cmd.label;
    }
    Clear()
    {
        this.mUndo = [];
        this.mRedo = [];
        this.mGroup = null;
        this.mDepth = 0;
    }

    private Record(_kind : string, _id : number, _before : IForgeEntity, _after : IForgeEntity)
    {
        //드래그처럼 한 묶음 안에서 같은 대상을 여러 번 바꾸면 처음 상태와 마지막 상태만 남긴다
        const prev = this.mGroup.list.find(_c => _c.kind == _kind && _c.id == _id);
        if(prev != null) prev.after = _after;
        else this.mGroup.list.push({ kind : _kind, id : _id, before : _before, after : _after });
    }
    private Apply(_kind : string, _id : number, _state : IForgeEntity)
    {
        if(_state == null) this.mScene.Remove(_kind, _id);
        else this.mScene.Push(_kind, _state);
    }
}
