import { IListener } from "../../artgine/basic/Basic.js";
import { CClass } from "../../artgine/basic/CClass.js";
import { CConsol } from "../../artgine/basic/CConsol.js";
import { CDOM } from "../../artgine/basic/CDOM.js";
import { CEvent } from "../../artgine/basic/CEvent.js";
import { CModal } from "../../artgine/basic/CModal.js";
import { CObject } from "../../artgine/basic/CObject.js";
import { CUniqueID } from "../../artgine/basic/CUniqueID.js";
import { CTooltip } from "../../artgine/util/CTooltip.js";

export class CInventory extends CObject
{
    constructor(_itemKey)
    {
        super();
        this.mKey=CUniqueID.Get();
        this.mItemKey=_itemKey;
        this.mDate=new Date().getTime();
    }
    mKey="";
    //mPos=new CVec2();
    mAmount=1;
    mItemKey="";
    mDate : number;
    override Export(_copy: boolean=true, _resetKey: boolean=true): this {
        let data=super.Export();
        if(_resetKey)   data.mKey=CUniqueID.Get();
        return data;
    }
}

export class CItem extends CObject
{
    constructor(_img,_title,_context)
    {
        super();
        this.mImg=_img;
        this.mTitle=_title;
        this.mContext=_context;
    }
    //mKey="";
    mImg="";
    mTitle="";
    mContext="";
    mType="";
}




var gMoveInvenEvent : CEvent=new CEvent();
export function RegisterMoveInvenViewEvent(_event : CEvent){  gMoveInvenEvent=_event;}

export class CInvenMgr extends CObject implements IListener
{
    On(_key: any, _event: any, _target: any=null) {
        this.mEventMap.set(_key,CEvent.ToCEvent(_event));
    }
    Off(_key: any, _target: any) {
        throw new Error("Method not implemented.");
    }
    GetEvent(_key: any, _target: any=null) {
        return this.mEventMap.get(_key);
    }
    mInvenArr = new Array<CInventory>();
    mEventMap=new Map<string,CEvent>();

    GetInvenArr()   {   return this.mInvenArr;  }
    override IsShould(_member: string, _type: CObject.eShould): boolean {
        if(_member=="mEventMap")    return false;

        return super.IsShould(_member,_type);
    }
    Push(_inven: CInventory,_overlap=true)
    {
        if (_inven == null) return null;

        if(_overlap)
        {
            for (let inven of this.mInvenArr)
            {
                if (inven.mItemKey === _inven.mItemKey)
                {
                    inven.mAmount += _inven.mAmount;
                    return inven;
                }
            }
        }
        

        this.mInvenArr.push(_inven);
        
        CEvent.ToCEvent(this.GetEvent("Push")).Call(_inven,this.mInvenArr.length-2);
        return _inven;
    }
   
    // _amount > 0 : 있으면 추가, 없으면 생성 후 추가. 성공 시 "넣어진 인벤" 리턴
    // _amount < 0 : 있으면 차감, 부족하면 null. 성공 시 "빠진 수량"을 담은 새 CInven 리턴
    // _ amount ==0 : 같은 itemKey찾기
    FindItem(_itemKey: string, _amount: number=0)
    {
        if (_amount === 0)
        {
            for (let inven of this.mInvenArr)
                if (inven.mItemKey === _itemKey) return inven;
            return null;
        }

        // 더하기(추가)
        if (_amount > 0)
        {
            for (let inven of this.mInvenArr)
            {
                if (inven.mItemKey === _itemKey)
                {
                    inven.mAmount += _amount;
                    return inven;
                }
            }

            const created = new CInventory(_itemKey);
            created.mAmount = _amount;
            this.mInvenArr.push(created);
            return created;
        }

        // 빼기(차감)
        const need = _amount;
        for (let i = 0; i < this.mInvenArr.length; ++i)
        {
            const inven = this.mInvenArr[i];
            if (inven.mItemKey !== _itemKey) continue;

            if (inven.mAmount < need) return null;

            inven.mAmount += need;

            // 0이 되면 인벤에서 제거
            if (inven.mAmount <= 0) this.mInvenArr.splice(i, 1);

            // 빠진 수량만 담은 "새 인벤" 리턴
            const removed = new CInventory(_itemKey);
            removed.mAmount = need;
            return removed;
        }

        return null;
    }

    FindInven(_key: string)
    {
        for (let i = 0; i < this.mInvenArr.length; ++i)
        {
            if (this.mInvenArr[i].mKey === _key)
            {
                return this.mInvenArr[i];
            }
        }
        return null;
    }

    // inven key가 같으면 제거하고 리턴, 없으면 null
    Remove(_key: string)
    {
        for (let i = 0; i < this.mInvenArr.length; ++i)
        {
            if (this.mInvenArr[i].mKey === _key)
            {
                const removed = this.mInvenArr[i];
                this.mInvenArr.splice(i, 1);
                CEvent.ToCEvent(this.GetEvent("Remove")).Call(removed);
                return removed;
            }
        }
        return null;
    }
    Swap(_DragKey : string,_DropKey : string)
    {
        let Drag=this.FindInven(_DragKey);
        let Drop=this.FindInven(_DropKey);
        if(Drag==null || Drop==null)  return;

        if (Drag.mItemKey == Drop.mItemKey)
        {
            Drop.mAmount+=Drag.mAmount;
            this.Remove(_DragKey);
        }
        else
        {
            let DragIndex=0;
            let DropIndex=0;
            for (let i = 0; i < this.mInvenArr.length; ++i)
            {
                if (this.mInvenArr[i].mKey === Drag.mKey)       DragIndex=i;
            }
            for (let i = 0; i < this.mInvenArr.length; ++i)
            {
                if (this.mInvenArr[i].mKey === Drop.mKey)       DropIndex=i;
            }
            this.mInvenArr[DragIndex]=Drop;
            this.mInvenArr[DropIndex]=Drag;
        }
        
    }
    Event
}
export class CItemMgr
{
    mItemMap=new Map<string,CItem>();
    Push<T extends CItem>(_key : string,_item : T): T;
    Push<T extends CItem>(_item : T): T
    Push<T extends CItem>(_a : any,_b : any=null) : T
    {
        if(_b==null)
        {
            this.mItemMap.set(CUniqueID.Get(),_a);
            return _a;
        }
            
        else
            this.mItemMap.set(_a,_b);
        return _b;
    }
    Find(_key : string)
    {
        return this.mItemMap.get(_key);
    }
}

export class CInvenViewer extends CModal
{
    mToolTipArr=new Array<CTooltip>();
    //mInvenArr : Array<CInventory>=[];
    //mItemArr : Array<CItem>=[];

    
    mBagInvenMgr : CInvenMgr=null;
    //mWearInvenMgr : CInvenMgr=null;
    mItemMgr : CItemMgr=null;
    mGrid=false;
    mInvenSortType=0;
    
    //mItemMap = new Map<string, CItem>();
    mTitleHTMLFun=(_inven : CInventory,_item : CItem,_viewer : CInvenViewer)=>{

        return _item.mTitle+" ["+_inven.mAmount+"]";
    };
    mContentHTMLFun : any=(_inven : CInventory,_item : CItem,_viewer : CInvenViewer)=>{

        return "<span>"+_item.mContext+"</span>";
    };
    
    mSortFun = (_a: CInventory, _b: CInventory) => {
        // sortType:
        //  ±1 : 시간(mDate)
        //  ±2 : 이름(아이템 타이틀)
        //  음수는 반대(내림차순)
        const type = this.mInvenSortType | 0;
        const dir = type < 0 ? -1 : 1;
        const abs = Math.abs(type);

        const keyA = _a.mKey ?? "";
        const keyB = _b.mKey ?? "";

        const dateA = _a.mDate ?? 0;
        const dateB = _b.mDate ?? 0;

        // 시간 정렬
        if (abs === 1) {
            const d = dateA - dateB;
            if (d !== 0) return (d < 0 ? -1 : 1) * dir;

            // tie: 이름 -> 키
            const ta = this.mItemMgr.Find(_a.mItemKey)?.mTitle ?? "";
            const tb = this.mItemMgr.Find(_b.mItemKey)?.mTitle ?? "";
            let c = ta.localeCompare(tb, "ko", { numeric: true, sensitivity: "base" });
            if (c !== 0) return c * dir;
            return keyA.localeCompare(keyB) * dir;
        }

        // 이름 정렬
        if (abs === 2) {
            const ta = this.mItemMgr.Find(_a.mItemKey)?.mTitle ?? "";
            const tb = this.mItemMgr.Find(_b.mItemKey)?.mTitle ?? "";

            let c = ta.localeCompare(tb, "ko", { numeric: true, sensitivity: "base" });
            if (c !== 0) return c * dir;

            // tie: 시간 -> 키
            const d = dateA - dateB;
            if (d !== 0) return (d < 0 ? -1 : 1) * dir;
            return keyA.localeCompare(keyB) * dir;
        }

        // 알 수 없는 타입이면 기존 동작(이름 기준)
        const ta = this.mItemMgr.Find(_a.mItemKey)?.mTitle ?? "";
        const tb = this.mItemMgr.Find(_b.mItemKey)?.mTitle ?? "";
        let c = ta.localeCompare(tb, "ko", { numeric: true, sensitivity: "base" });
        if (c !== 0) return c * dir;
        return keyA.localeCompare(keyB) * dir;
    };
   
    constructor(_bagInvenMgr : CInvenMgr, _itemMgr : CItemMgr, _grid=false,_sort=1)
    {
        super();
        this.mGrid=_grid;
        this.mBagInvenMgr=_bagInvenMgr;
        this.mItemMgr=_itemMgr;
        this.mInvenSortType=_sort;

        this.SetTitle(CModal.eTitle.TextFullClose);
        this.SetCloseToHide(true);

        const key=this.Key();
        this.SetHeader(`
        <div class="">
        <div class="dropdown">
            <button class="btn btn-sm btn-outline-secondary dropdown-toggle"
                    type="button"
                    data-bs-toggle="dropdown"
                    data-bs-auto-close="outside"
                    aria-expanded="false">
            옵션
            </button>

            <div class="dropdown-menu p-2" style="min-width:280px;">
            <!-- 보기 -->
            <div class="mb-2">
                <div class="small text-muted mb-1">보기</div>
                <div class="btn-group w-100" role="group" aria-label="view">
                <button type="button" class="btn btn-sm btn-outline-secondary" id="${key}_viewer_list">리스트</button>
                <button type="button" class="btn btn-sm btn-outline-secondary" id="${key}_viewer_grid">그리드</button>
                </div>
            </div>

            <!-- 정렬 -->
            <div class="mb-2">
                <div class="small text-muted mb-1">정렬</div>
                <div class="btn-group w-100" role="group" aria-label="sort">
                <button type="button" class="btn btn-sm btn-outline-secondary" id="${key}_sort_acq">입수순서</button>
                <button type="button" class="btn btn-sm btn-outline-secondary" id="${key}_sort_title">글자</button>
                </div>
            </div>

            <!-- 검색 -->
            <div class="mb-0">
                <div class="small text-muted mb-1">검색</div>
                <input type="text"
                    class="form-control form-control-sm"
                    id="${key}_search"
                    placeholder="아이템 검색..." />
            </div>
            </div>
        </div>
        </div>`);
        this.SetSize(480,640);
        this.mBodyStyle="card-body p-0 overflow-auto";
        this.Hide();
        
        this.Open();
        
        CDOM.ID(`${key}_viewer_list`).addEventListener("click",()=>{
            this.mGrid=false;
            this.Reset();
        });
        CDOM.ID(`${key}_viewer_grid`).addEventListener("click",()=>{
            this.mGrid=true;
            this.Reset();
        });

        CDOM.ID(`${key}_sort_acq`).addEventListener("click",()=>{
            let sortType = 1;
            if (Math.abs(this.mInvenSortType) === 1) sortType = -this.mInvenSortType;
            this.mInvenSortType=sortType;
            this.Reset();
        });
        CDOM.ID(`${key}_sort_title`).addEventListener("click",()=>{

            let sortType = 2;
            if (Math.abs(this.mInvenSortType) === 2) sortType = -this.mInvenSortType;

            this.mInvenSortType=sortType;
            this.Reset();
        });
        CDOM.ID(`${key}_search`).addEventListener("keyup",()=>{
            let value=CDOM.IDValue(`${key}_search`);
            var ch = this.mBody.getElementsByClassName("viewer_search");
            for (var each0 of ch) 
            {
                var hel = each0 as HTMLElement;
                if(each0.textContent.indexOf(value)==-1)
                {
                    hel.style.display = "none";
                }
                else
                {
                    hel.style.display = "";
                }
            }
        });
    }

    override Open(_startPos?: CModal.ePos): void {
        super.Open(_startPos);
        // const key=this.Key();
        // CDOM.IDValue(`${key}_search`,"");
    }
    Reset()
    {
        
        let InvetArr=[...this.mBagInvenMgr.GetInvenArr()];
        

        

        
        InvetArr.sort(this.mSortFun);
        

        for(let tooltip of this.mToolTipArr)
        {
            tooltip.Close();
        }
        this.mToolTipArr.length=0;
      
        let DropEvent=(e: DragEvent)=>{
            e.preventDefault();
            const dropKey = (e.currentTarget as HTMLElement).id;
            const pickKey = e.dataTransfer?.getData("text/plain") ?? "";
            gMoveInvenEvent.Call(this.mBagInvenMgr.FindInven(pickKey),this.mBagInvenMgr.FindInven(dropKey));
        };
        let DragStartEvent=(e: DragEvent)=>{
            const key = (e.currentTarget as HTMLElement).id;
            e.dataTransfer.setData("text/plain", key);
        };
        
        if(this.mGrid)
        {
            // ✅ 컨테이너에만 grid 적용 (칸 수는 폭에 따라 자동 증가/감소)
            // 셀 크기만 줄이고 싶으면 80px만 바꾸면 됨 (예: 64/72/96)
            const cell = 79.5;

            let body = {
                "tag": "div",
                "class": "p-0",
                "style": `display:grid;grid-template-columns:repeat(auto-fill, ${cell}px);justify-content:start;`,
                "id":this.mKey+"_inven",
                "html": []
            };
            

            for (let inven of InvetArr)
            {
                const item = this.mItemMgr.Find(inven.mItemKey);
                if (!item) continue;

                // ✅ 각 셀(정사각형): ratio 안에 내용을 넣어야 정상 동작
                const invenDiv = {
                    "tag": "button",
                    "type": "button",
                    "id": inven.mKey,
                    "class": "btn p-0 border bg-body rounded-2 overflow-hidden viewer_search",
                    "draggable":true,
                    "ondrop":DropEvent,
                    "ondragstart":DragStartEvent,
                    "html": [
                        {
                            "tag": "div",
                            "class": "ratio ratio-1x1",
                            "html": [
                                {
                                    "tag": "div",
                                    "class": "d-flex flex-column justify-content-center align-items-center text-center p-1",
                                    "html": [
                                        {
                                            "tag": "img",
                                            "src": item.mImg,
                                            "class": "img-fluid mb-1",
                                            "style": "max-width:60%;max-height:60%;object-fit:contain;"
                                        },
                                        {
                                            "tag": "div",
                                            "class": "small text-truncate w-100",
                                            "style": "font-size:.75rem;",
                                            "text": " " + this.mTitleHTMLFun(inven, item,this)
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                };

                body.html.push(invenDiv);
            }

            //this.mBodyStyle = "card-body p-0 overflow-auto";
            this.SetBody(body);
        }
        else
        {
            let body = {"tag":"ul","class":"list-group","id":this.mKey+"_inven","html":[]};

            for(let inven of InvetArr)
            {
                let item=this.mItemMgr.Find(inven.mItemKey);
                let invenDiv={"tag":"li","class":"list-group-item viewer_search","draggable":true,"id":inven.mKey,
                "ondrop":DropEvent,"ondragstart":DragStartEvent,
                "html":[
                    {"tag":"img","src":item.mImg},
                    {"tag":"span","html":" "+this.mTitleHTMLFun(inven,item,this)}
                ]};
                body.html.push(invenDiv);

                
            }
            

            //
            
            this.SetBody(body);
        }
    
        const CARD_MIN_W = 160;
        const CARD_MAX_W = 240;
        for(let inven of InvetArr)
        {
            let item=this.mItemMgr.Find(inven.mItemKey);
            let card={"tag":"div","class":"card","style":`min-width:${CARD_MIN_W}px;max-width:${CARD_MAX_W}px;`,
            "html":[
                {"tag":"img","src":item.mImg,"class":"card-img-top d-block mx-auto pt-2","style": "width:32px;height:32px;object-fit:contain;"},
                {"tag":"div","class":"card-body","html":[
                    {"tag":"h5","class":"card-title","html":this.mTitleHTMLFun(inven,item,this)},
                    {"tag":"p","class":"card-text","html":this.mContentHTMLFun(inven,item,this)}
                ]}
            ]};

            this.mToolTipArr.push(new CTooltip(CDOM.DataToDom(card),CDOM.ID(inven.mKey),CTooltip.eTrigger.Click,CTooltip.ePlacement.Bottom));
        }
    }
}

CClass.Push(CInventory);
CClass.Push(CItem);
CClass.Push(CItemMgr);
CClass.Push(CInvenMgr);
