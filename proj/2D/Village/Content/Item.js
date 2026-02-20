import { CAniFlow } from "../../../../artgine/app/component/CAniFlow.js";
import { CAnimation, CClipColorAlpha } from "../../../../artgine/app/component/CAnimation.js";
import { CCollider } from "../../../../artgine/app/component/CCollider.js";
import { CPaint2D } from "../../../../artgine/app/component/paint/CPaint2D.js";
import { CSubject } from "../../../../artgine/app/subject/CSubject.js";
import { CVec2 } from "../../../../artgine/geometry/CVec2.js";
import { CColor } from "../../../../artgine/render/CColor.js";
import { CItem, CItemMgr } from "../../../../plugin/Inventory/Inventory.js";
export class CAbilityVillager {
    mH = 0;
    mS = 0;
}
export class CItemVillager extends CItem {
    mValue = 0;
    mWeight = 0;
    mAbility = null;
}
export function VillagerContentHTMLFun(_inven, _item) {
    let str = "";
    if (_item instanceof CItemVillager) {
        if (_item.mValue != 0)
            str += "<b>Value : </b>" + _item.mValue;
        if (_item.mAbility != null) {
            if (_item.mAbility.mH != 0)
                str += "<b>H : </b>" + _item.mAbility.mH;
            if (_item.mAbility.mS != 0)
                str += "<b>S : </b>" + _item.mAbility.mS;
        }
        str += "<hr>";
    }
    str += "<span>" + _item.mContext + "</span>";
    return str;
}
export var gItemMgr = new CItemMgr();
gItemMgr.Push("test0", new CItem("Res/item/book/bronze.png", "test0", "test"));
gItemMgr.Push("test1", new CItem("Res/item/book/cloth.png", "test1", "tes"));
gItemMgr.Push("test2", new CItem("Res/item/book/copper.png", "test2000000000000000000000", "test"));
let itemV = new CItemVillager("Res/item/armour/animal_skin2.png", "아머", "아머당");
itemV.mAbility = new CAbilityVillager();
itemV.mAbility.mH = 100;
gItemMgr.Push("test3", itemV);
export class CSubjectInven extends CSubject {
    mInven;
    constructor(_inven) {
        super();
        this.mInven = _inven;
    }
    Start() {
        let item = gItemMgr.Find(this.mInven.mItemKey);
        let pt = this.PushComp(new CPaint2D(item.mImg, new CVec2(32, 32)));
        let ani = new CAnimation();
        ani.Push(new CClipColorAlpha(0, 1, new CColor(0, 0, 0, CColor.eModel.RGBAdd), new CColor(1, 1, 1, CColor.eModel.RGBAdd)));
        this.PushComp(new CAniFlow(ani));
        let cl = this.PushComp(new CCollider(pt));
        cl.SetLayer("item");
    }
}
