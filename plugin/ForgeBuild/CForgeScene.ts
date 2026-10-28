import { CForgeRand } from "./CForgeRand.js";

export type ForgeV2 = [number, number];

//theme·style : 옵션(테마 이름, 종류별 형태 변형 번호)
export interface IForgeEntity { id : number; seed : number; theme? : string; style? : number; over? : Record<string, any>; }
//pts : [x, z, 높이, 바닥 높이(선택)]. gy : 점마다 바닥 높이(m, 선택) — 호출자가 넣은 지면 정보
export interface IForgeWall extends IForgeEntity { pts : number[][]; thick : number; style : number; }
//enable : 실내 생성 여부. concept : modern · hanok · machiya · medieval(없으면 건축 양식에서 고른다). kitchen·bath : true · false · "auto"(넓이로 정한다). density : 가구 밀도 0~1.
//anim : ForgeAction으로 움직이는 부품(문·창·의자)별 켜기·끄기(기본 모두 켬). 끄면 그 부품은 움직이지 않는다(의자는 정적 메시, 창은 유리가 벽에 붙은 채 그대로, 문은 문짝 없는 열린 문틀)
export interface IForgeInterior { enable : boolean; concept? : string; kitchen? : boolean | "auto"; bath? : boolean | "auto"; density? : number; anim? : { door? : boolean; window? : boolean; chair? : boolean }; }
export interface IForgeBuilding extends IForgeEntity { poly : ForgeV2[]; height : number; roof : number; roofH : number; glue : number[]; gy? : number[]; interior? : IForgeInterior; }
//shape : 0 원형, 1 사각형
export interface IForgeTower extends IForgeEntity { c : ForgeV2; r : number; height : number; roof : number; roofH : number; shape? : number; gy? : number; }
export interface IForgePath extends IForgeEntity { pts : ForgeV2[]; width : number; gy? : number[]; }
export interface IForgeFence extends IForgeEntity { pts : ForgeV2[]; style : number; gy? : number[]; height? : number; }
//다리 : 양 끝 강둑(pts 처음·끝)의 지면 높이에 상판이 닿는다
export interface IForgeBridge extends IForgeEntity { pts : ForgeV2[]; width : number; gy? : number[]; }
//계단 : pts[0] 아래 끝 → pts[1] 위 끝. top : 위 끝이 그 지면보다 높은 양(m, 성벽 위 등)
export interface IForgeStair extends IForgeEntity { pts : ForgeV2[]; width : number; top? : number; gy? : number[]; hy? : number[]; }
//교회 : 바닥 외곽선(최소 외접 사각형의 긴 축이 본당 방향). 정문(종탑)은 길에 가까운 끝
export interface IForgeChurch extends IForgeEntity { poly : ForgeV2[]; gy? : number[]; }
//선착장 : pts 처음 = 물가(뭍), 끝 = 물 쪽 끝. deck : 갑판 높이(m, 없으면 물가 지면 높이). hy는 공장이 넣는 같은 값
export interface IForgeDock extends IForgeEntity { pts : ForgeV2[]; width : number; deck? : number; gy? : number[]; hy? : number[]; }
//조형물(탑) : 중심 c, 바닥 폭 size(m). style 1 = 낮은 탑(삼층), 2 = 높은 탑(오층). 교회·사찰 부지 안에 두면 앞마당·마당 중심으로 붙는다
export interface IForgeMonument extends IForgeEntity { c : ForgeV2; size : number; gy? : number; ang? : number; }

export class CForgeScene
{
    static sVersion = 1;
    static sUnit = 100;
    static sSize = 128;

    static eKind = { Wall : "wall", Building : "building", Tower : "tower", Path : "path", Fence : "fence", Bridge : "bridge", Stair : "stair", Church : "church", Dock : "dock", Monument : "monument" } as const;
    static sKindList : string[] = Object.values(CForgeScene.eKind);
    static eRoof = { Auto : 0, Gable : 1, Hip : 2, Cone : 3, Flat : 4 } as const;

    //개체가 차지하는 수평 범위 [x0, z0, x1, z1](m). 이웃끼리 맞물리는 처리(벽-탑 접합 등)에서 다시 만들 대상을 고를 때 쓴다
    static Bounds(_kind : string, _e : any) : number[]
    {
        const K = CForgeScene.eKind;
        let pts : number[][] = [], pad = 0;
        if(_kind == K.Wall) { pts = _e.pts; pad = _e.thick; }
        else if(_kind == K.Building) { pts = _e.poly; pad = 1; }
        else if(_kind == K.Tower) { pts = [_e.c]; pad = _e.r * 1.3; }
        else if(_kind == K.Path) { pts = _e.pts; pad = _e.width * 0.5; }
        else if(_kind == K.Fence) { pts = _e.pts; pad = 0.5; }
        else if(_kind == K.Bridge || _kind == K.Stair || _kind == K.Dock) { pts = _e.pts; pad = _e.width * 0.5 + 1.5; }
        else if(_kind == K.Church) { pts = _e.poly; pad = 2; }
        else if(_kind == K.Monument) { pts = [_e.c]; pad = _e.size + 1; }
        let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
        for(const p of pts) { x0 = Math.min(x0, p[0]); z0 = Math.min(z0, p[1]); x1 = Math.max(x1, p[0]); z1 = Math.max(z1, p[1]); }
        return [x0 - pad, z0 - pad, x1 + pad, z1 + pad];
    }
    static Overlap(_a : number[], _b : number[]) : boolean
    {
        return _a[0] <= _b[2] && _b[0] <= _a[2] && _a[1] <= _b[3] && _b[1] <= _a[3];
    }
    //내용은 그대로 두고 생성기만 다시 돌게 표시(이웃이 바뀌어 맞물림을 다시 계산할 때)
    Touch(_kind : string, _id : number) { if(this.mMap.get(_kind).has(_id)) this.mDirty.get(_kind).add(_id); }

    mSeed : number;
    mNextID = 1;
    mMap = new Map<string, Map<number, IForgeEntity>>();
    mDirty = new Map<string, Set<number>>();

    constructor(_seed : number = 1)
    {
        this.mSeed = _seed >>> 0;
        for(const k of CForgeScene.sKindList)
        {
            this.mMap.set(k, new Map());
            this.mDirty.set(k, new Set());
        }
    }

    static Clone<T>(_v : T) : T { return _v == null ? null : JSON.parse(JSON.stringify(_v)); }

    NewID() : number { return this.mNextID++; }

    Push<T extends IForgeEntity>(_kind : string, _ent : T) : T
    {
        const ent = CForgeScene.Clone(_ent);
        if(!(ent.id > 0)) ent.id = this.NewID();
        else if(ent.id >= this.mNextID) this.mNextID = ent.id + 1;
        if(!(ent.seed > 0)) ent.seed = CForgeRand.Hash(this.mSeed, ent.id) || 1;
        this.mMap.get(_kind).set(ent.id, ent);
        this.mDirty.get(_kind).add(ent.id);
        return ent;
    }
    Find<T extends IForgeEntity>(_kind : string, _id : number) : T
    {
        return (this.mMap.get(_kind).get(_id) as T) ?? null;
    }
    List<T extends IForgeEntity>(_kind : string) : T[]
    {
        return ([...this.mMap.get(_kind).values()] as T[]).sort((_a, _b) => _a.id - _b.id);
    }
    Remove(_kind : string, _id : number) : boolean
    {
        if(!this.mMap.get(_kind).delete(_id)) return false;
        this.mDirty.get(_kind).add(_id);
        return true;
    }
    Count(_kind : string) : number { return this.mMap.get(_kind).size; }
    Clear()
    {
        for(const k of CForgeScene.sKindList)
        {
            for(const id of this.mMap.get(k).keys()) this.mDirty.get(k).add(id);
            this.mMap.get(k).clear();
        }
        this.mNextID = 1;
    }

    //생성기가 가져갈 변경분. 지워진 id도 포함되므로 받는 쪽은 Find가 null이면 해제한다
    PopDirty() : Array<[string, number]>
    {
        const out : Array<[string, number]> = [];
        for(const k of CForgeScene.sKindList)
        {
            const set = this.mDirty.get(k);
            for(const id of [...set].sort((_a, _b) => _a - _b)) out.push([k, id]);
            set.clear();
        }
        return out;
    }

    Export() : object
    {
        const ent : Record<string, IForgeEntity[]> = {};
        for(const k of CForgeScene.sKindList) ent[k] = this.List(k).map(_e => CForgeScene.Round(CForgeScene.Clone(_e)));
        return { version : CForgeScene.sVersion, seed : this.mSeed, nextID : this.mNextID, ent };
    }
    Import(_data : any)
    {
        this.Clear();
        this.mSeed = (_data.seed ?? 1) >>> 0;
        for(const k of CForgeScene.sKindList)
            for(const e of (_data.ent?.[k] ?? [])) this.Push(k, e);
        this.mNextID = Math.max(this.mNextID, _data.nextID ?? 1);
    }
    ExportJson() : string { return JSON.stringify(this.Export()); }
    ImportJson(_json : string) { this.Import(JSON.parse(_json)); }

    //nextID는 실행 취소로 되돌리지 않으므로(번호 재사용 방지) 내용 비교용 해시에서 뺀다
    Hash() : number
    {
        const d = this.Export() as any;
        const s = JSON.stringify({ seed : d.seed, ent : d.ent });
        let h = 0x811C9DC5;
        for(let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
        return h >>> 0;
    }

    //부동소수 오차로 같은 장면의 해시가 달라지지 않게 저장 정밀도를 0.1mm로 고정한다
    private static Round(_v : any) : any
    {
        if(typeof _v == "number") return Math.round(_v * 10000) / 10000;
        if(Array.isArray(_v)) return _v.map(CForgeScene.Round);
        if(_v != null && typeof _v == "object")
        {
            for(const k of Object.keys(_v)) _v[k] = CForgeScene.Round(_v[k]);
        }
        return _v;
    }
}
