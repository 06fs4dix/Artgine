//Version
const version='mf2jnnjd_2';
import "../../../artgine/artgine.js"

//Class
import {CClass} from "../../../artgine/basic/CClass.js";

//Atelier
import {CPreferences} from "../../../artgine/basic/CPreferences.js";
var gPF = new CPreferences();
gPF.mTargetWidth = 0;
gPF.mTargetHeight = 0;
gPF.mRenderer = "GL";
gPF.m32fDepth = false;
gPF.mTexture16f = false;
gPF.mAnti = true;
gPF.mBatchPool = true;
gPF.mXR = false;
gPF.mDeveloper = true;
gPF.mIAuto = true;
gPF.mWASM = false;
gPF.mCanvas = "";
gPF.mServer = 'local';
gPF.mGitHub = false;

import {CAtelier} from "../../../artgine/canvas/CAtelier.js";

import {CPlugin} from "../../../artgine/util/CPlugin.js";
var gAtl = new CAtelier();
gAtl.mPF = gPF;
await gAtl.Init([],"");
//The content above this line is automatically set by the program. Do not modify.⬆✋🚫⬆☠️💥🔥

//EntryPoint
import {CObject} from "../../../artgine/basic/CObject.js"
import { CSubject } from "../../../artgine/canvas/subject/CSubject.js";
import { CPaint2D } from "../../../artgine/canvas/component/paint/CPaint2D.js";
import { CVec2 } from "../../../artgine/geometry/CVec2.js";
import { CVec3 } from "../../../artgine/geometry/CVec3.js";

import { CConfirm, CModal, CModalTitleBar } from "../../../artgine/basic/CModal.js";
import { CWind } from "../../../artgine/canvas/component/CWind.js";
import { CBGAttachButton } from "../../../artgine/util/CModalUtil.js";
import { CPaint3D } from "../../../artgine/canvas/component/paint/CPaint3D.js";
import { CColor } from "../../../artgine/canvas/component/CColor.js";
import { CShaderAttr } from "../../../artgine/render/CShaderAttr.js";
import { CVec1 } from "../../../artgine/geometry/CVec1.js";
import { CLoader, CLoaderOption } from "../../../artgine/util/CLoader.js";
import { CTexture } from "../../../artgine/render/CTexture.js";
import { CVec4 } from "../../../artgine/geometry/CVec4.js";




let Main=gAtl.NewCanvas("Main");

function Init2D()
{
    Main.SetCameraKey("2D");
    let gXSize=10;
    let gYSize=10;
    for(let y=-gYSize;y<=gYSize;++y)
    {
        for(let x=-gXSize;x<=gXSize;++x)
        {
            let sub=Main.PushSub(new CSubject());
            let pt=sub.PushComp(new CPaint2D("Res/grass.png",new CVec2(50,50)));
            sub.SetPos(new CVec3(x*50,y*50));
            pt.SetWindInfluence(100);
            //pt.SetWindInfluence(1);
        }
    }

    let sub=Main.PushSub(new CSubject());
    let pt=sub.PushComp(new CPaint2D(gAtl.Frame().Pal().GetNoneTex()));
    let wind=sub.PushComp(new CWind());

    CModal.PushTitleBar(new CModalTitleBar("DevToolModal","Global",()=>{
        wind.SetDirect(new CVec3(1,0,0));
        wind.SetInnerOuter(0,0);
        wind.SetFrequency(1);
    }));

    CModal.PushTitleBar(new CModalTitleBar("DevToolModal","Pos",()=>{
        wind.SetDirect(new CVec3(0,0,0));
        wind.SetInnerOuter(100,500);
        wind.SetFrequency(10);
    }));
    //3D 오브젝트는 본이 있으면 윈드로 작동함

    let Help=new CBGAttachButton("DevToolModal",101,new CVec2(320,240));
    //gAtl.Frame().Win().HtmlPush(Option_btn);
    Help.SetTitleText("Help");
    Help.SetContent(`
    <div>
    [Global] Global Wind, [Pos]Local Wind
    </div>`);

}


function Init3D()
{
    //gAtl.Frame().Load().Load("Res/grass.png",new CLoaderOption().Set("mMipMap",CTexture.eMipmap.None).Set("mAlphaCut",128));
    //gAtl.Frame().Load().Load("Res/grass.png",new CLoaderOption().Set("mAlphaCut",250));
    Main.SetCameraKey("3D");
    let gXSize=20;
    let gZSize=20;
    for(let z=-gZSize;z<=gZSize;++z)
    {
        for(let x=-gXSize;x<=gXSize;++x)
        {
            let sub=Main.PushSub(new CSubject());
            let pt=sub.PushComp(new CPaint2D("Res/grass.png",new CVec2(50,50)));
            
            sub.SetPos(new CVec3(x*50,0,z*50));
            pt.SetWindInfluence(100);
            pt.SetBillBoard(true);
            pt.SetTexCodi(null,0.02);
            pt.AlphaCut();
            pt.PushCShaderAttr(new CShaderAttr("alphaCut",new CVec1(0.7)));
            //pt.SetWindInfluence(1);
        }
    }

    let sub=Main.PushSub(new CSubject());
    sub.SetSca(0.1);
    let pt=sub.PushComp(new CPaint3D());
    pt.SetColorModel(new CColor(1,0.5,0.5,CColor.eModel.RGBAdd));
    let wind=sub.PushComp(new CWind());

   
    for(let i=0;i<10;++i)
    {
        sub=Main.PushSub(new CSubject());
        sub.SetPos(new CVec3(Math.random()*1000-500,0,Math.random()*1000-500));
        pt=sub.PushComp(new CPaint3D("Res/tree.fbx"));
        pt.Wind(100);
    }
    
    

    CModal.PushTitleBar(new CModalTitleBar("DevToolModal","Global",()=>{
        wind.SetDirect(new CVec3(1,0,0));
        wind.SetInnerOuter(0,0);
        wind.SetFrequency(1);
    }));

    CModal.PushTitleBar(new CModalTitleBar("DevToolModal","Pos",()=>{
        wind.SetDirect(new CVec3(0,0,0));
        wind.SetInnerOuter(100,500);
        wind.SetFrequency(10);
    }));
    

    let Help=new CBGAttachButton("DevToolModal",101,new CVec2(320,240));
    //gAtl.Frame().Win().HtmlPush(Option_btn);
    Help.SetTitleText("Help");
    Help.SetContent(`
    <div>
    [Global] Global Wind, [Pos]Local Wind
    </div>`);
}






CConfirm.List("Select Init!", [
    // 웹 데이터 옵션
    async () => {
       Init2D();
    },
    // 로컬 파일 옵션
    async () => {
        Init3D();
    }
], ["2D", "3D"]);













