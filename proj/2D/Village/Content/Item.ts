import { CAniFlow } from "https://06fs4dix.github.io/Artgine/artgine/app/component/CAniFlow.js";
import { CAnimation, CClipColorAlpha } from "https://06fs4dix.github.io/Artgine/artgine/app/component/CAnimation.js";
import CBehavior from "https://06fs4dix.github.io/Artgine/artgine/app/component/CBehavior.js";
import { CCollider } from "https://06fs4dix.github.io/Artgine/artgine/app/component/CCollider.js";
import { CPaint2D } from "https://06fs4dix.github.io/Artgine/artgine/app/component/paint/CPaint2D.js";
import { CSubject } from "https://06fs4dix.github.io/Artgine/artgine/app/subject/CSubject.js";
import { CVec2 } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CVec2.js";
import { CColor } from "https://06fs4dix.github.io/Artgine/artgine/render/CColor.js";
import { CInventory, CItem, CItemMgr } from "https://06fs4dix.github.io/Artgine/plugin/Inventory/Inventory.js";



export class CAbilityVillager
{
    mH=0;
    mS=0;
}

export class CItemVillager extends CItem
{
    mValue=0;
    mWeight=0;
    mAbility : CAbilityVillager=null;

}
export function VillagerContentHTMLFun(_inven : CInventory,_item : CItemVillager)
{
    let str="";
    if(_item instanceof CItemVillager)
    {
        if(_item.mValue!=0) str+="<b>Value : </b>"+_item.mValue;
        if(_item.mAbility!=null)
        {
            if(_item.mAbility.mH!=0) str+="<b>H : </b>"+_item.mAbility.mH;
            if(_item.mAbility.mS!=0) str+="<b>S : </b>"+_item.mAbility.mS;
        }
        str+="<hr>";
    }
    
    str+="<span>"+_item.mContext+"</span>";
    return str;
}

export var gItemMgr=new CItemMgr();
gItemMgr.Push("test0",new CItem("Res/item/book/bronze.png","test0","test"));
gItemMgr.Push("test1",new CItem("Res/item/book/cloth.png","test1","tes"));
gItemMgr.Push("test2",new CItem("Res/item/book/copper.png","test2000000000000000000000","test"));

let itemV=new CItemVillager("Res/item/armour/animal_skin2.png","아머","아머당");
itemV.mAbility=new CAbilityVillager();
itemV.mAbility.mH=100;
gItemMgr.Push("test3",itemV);

export class CSubjectInven extends CSubject
{
    mInven : CInventory;
    constructor(_inven : CInventory)
    {
        super();
        this.mInven=_inven;
    }
    override Start(): void {

        let item=gItemMgr.Find(this.mInven.mItemKey)
        let pt=this.PushComp(new CPaint2D(item.mImg,new CVec2(32,32)));

        let ani=new CAnimation();
        ani.Push(new CClipColorAlpha(0,1,new CColor(0,0,0,CColor.eModel.RGBAdd),new CColor(1,1,1,CColor.eModel.RGBAdd)));
        this.PushComp(new CAniFlow(ani));

        let cl=this.PushComp(new CCollider(pt));
        //cl.SetEvent(CCollider.eEvent.Trigger);
        cl.SetLayer("item");
    }
}


