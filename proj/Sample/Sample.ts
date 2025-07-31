//Import
//Class
import CTest2, { CTest3 } from "./test/CTest2.js";
CClass.Push(CTest2);
CClass.Push(CTest3);
//Atelier
import CPreferences from "../../lib/artgine/core/basic/CPreferences.js";
var gPF = new CPreferences();
gPF.mTargetWidth = 0;
gPF.mTargetHeight = 0;
gPF.mRenderer = "GL";
gPF.m32fDepth = false;
gPF.mTexture16f = false;
gPF.mAnti = false;
gPF.mBatchPool = true;
gPF.mXR = false;
gPF.mDevTool = true;
gPF.mIAuto = true;
gPF.mWASM = false;

//EntryPoint
import "../../lib/artgine/core/Core.js"
import CObject from "../../lib/artgine/core/basic/CObject.js"
import CClass from "../../lib/artgine/core/basic/CClass.js";
import CPool from "../../lib/artgine/core/basic/CPool.js";
import CConsol from "../../lib/artgine/core/basic/CConsol.js";
import CAlert from "../../lib/artgine/core/basic/CAlert.js";
import CWebView from "../../lib/artgine/core/system/CWebView.js";

import CFile from "../../lib/artgine/core/system/CFile.js";
import { IFile } from "../../lib/artgine/core/system/System.js";
import CUtil from "../../lib/artgine/core/basic/CUtil.js";
import CJSON from "../../lib/artgine/core/basic/CJSON.js";
import CFrame from "../../lib/artgine/core/util/CFrame.js";
import CPWA, { CACHE_INFO } from "../../lib/artgine/core/system/CPWA.js";
import CEvent from "../../lib/artgine/core/basic/CEvent.js";
import { CModalBackGround } from "../../lib/artgine/core/util/CModalUtil.js";
import { CTooltip, CTooltipList, CTooltipListAuto } from "../../lib/artgine/core/util/CTooltip.js";
import CUtilWeb from "../../lib/artgine/core/util/CUtilWeb.js";
import CSocketIO from "../../lib/artgine/core/network/CSocketIO.js";
import CStream from "../../lib/artgine/core/basic/CStream.js";



class CTest extends CObject implements IFile
{
    async SaveCJSON(_file: any=null) {
        await CFile.Save(this);
    }
    async LoadCJSON(_file: any=null) {
        let buf=await CFile.Load();
        this.ImportCJSON(new CJSON(CUtil.ArrayToString(buf)));
    }
    
    m_text="text";
    m_num=0;
}
//alert("test");
CClass.Push(CTest);


document.addEventListener("keydown", (e) => 
{
	if (e.key === "f" || e.key === "F") 
    {
		let test=CPool.Product(CTest);

        //CAlert.Info(test.ToStr());
        CUtilWeb.CObjectEditerShow(test);
	}
});
var gFrame=new CFrame(gPF,null);
gFrame.Process();

let mbg=new CModalBackGround();
mbg.SetBody(`
    <div class="card" style="width: 18rem;">
  <div class="card-body">
    <h5 class="card-title">Card title</h5>
    <h6 class="card-subtitle mb-2 text-muted">Card subtitle</h6>
    <p class="card-text">Some quick example text to build on the card title and make up the bulk of the card's content.</p>
    <a href="#" class="card-link" style='pointer-events:auto;' id='cardLink'>Card link</a>
    <input type='text' value='' id='input_txt' style='pointer-events:auto;'/>
    
  </div>
</div>
    `);


let toolti=new CTooltip("test",CUtilWeb.ID("cardLink"),CTooltip.eTrigger.Click);

// let iTool=new CTooltipList([
//   ["Apple", "사과"],
//   ["Banana", "바나나"],
//   ["Cherry", "체리"]
// ],CWebUtil.IDInput("input_txt"),CTooltip.eTrigger.Click);



// CWebUtil.ID("input_txt").onclick=()=>{
//     let iTool=new CTooltipListAuto([
//     ["Apple", "사과"],
//     ["Banana", "바나나"],
//     ["Cherry", "체리"]
//     ],CWebUtil.IDInput("input_txt"),CTooltip.eTrigger.Manual);
//     // iTool.SetMaxHeight(600);
//     // iTool.SetMaxWidth(400);
//     iTool.Show();
// };

 let iTool=new CTooltipListAuto([
    ["Apple", "사과"],
    ["Banana", "바나나"],
    ["Cherry", "체리"]
    ],CUtilWeb.IDInput("input_txt"),CTooltip.eTrigger.Click);


var socketIO=new CSocketIO(true,"test");
socketIO.On("test",new CEvent((_stream : CStream)=>{}));