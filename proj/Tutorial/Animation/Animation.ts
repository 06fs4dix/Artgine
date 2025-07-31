//Version
const version='2025-07-31 09:43:31';
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
gPF.mServer = 'local';

import {CAtelier} from "../../../artgine/canvas/CAtelier.js";

import {CPlugin} from "../../../artgine/util/CPlugin.js";
var gAtl = new CAtelier();
gAtl.mPF = gPF;
await gAtl.Init([]);

//EntryPoint
import {CObject} from "../../../artgine/basic/CObject.js"
import { CSubject } from "../../../artgine/canvas/subject/CSubject.js";
import { CPaint2D, CPaintHTML } from "../../../artgine/canvas/component/paint/CPaint2D.js";
import { CAnimation, CClipCoodi, CClipImg, CClipMesh } from "../../../artgine/canvas/component/CAnimation.js";
import { CAniFlow } from "../../../artgine/canvas/component/CAniFlow.js";
import { CFrame } from "../../../artgine/util/CFrame.js";
import { CInput } from "../../../artgine/system/CInput.js";
import { CUtilObj } from "../../../artgine/basic/CUtilObj.js";
import { CVec3 } from "../../../artgine/geometry/CVec3.js";
import { CAlert } from "../../../artgine/basic/CAlert.js";
import { CModal } from "../../../artgine/basic/CModal.js";
import { CPaint3D } from "../../../artgine/canvas/component/paint/CPaint3D.js";
import { CPaintTrail } from "../../../artgine/canvas/component/paint/CPaintTrail.js";
import { CDomFactory } from "../../../artgine/basic/CDOMFactory.js";
import { CEvent } from "../../../artgine/basic/CEvent.js";
gAtl.NewCanvas("Main");
gAtl.Canvas("Main").SetCameraKey("2D");
let sub=gAtl.Canvas("Main").Push(new CSubject());
sub.PushComp(new CPaint2D());





//애니 수동 등록
let ani=new CAnimation();
ani.Push(new CClipImg(0,0,"Res/Slime/Slime.png"));
let off=0;
for(let x=0;x<4;++x)
{
    for(let y=0;y<4;++y)
    {
       ani.Push(new CClipCoodi(off*100,100,x*16,y*16,(x+1)*16,(y+1)*16));
       off++;
    }   
}
sub.SetKey("Ani2DSub");
sub.PushComp(new CAniFlow(ani));
let pth=sub.PushComp(new CPaintHTML(CDomFactory.DataToDom(`<div class="text-center border rounded p-2 bg-light shadow-sm"
     style="width: 200px;">
  숫자 1,2로 애니메이션 변경<br>F로 정보보기<br>↓
</div>`),null,null));
pth.SetPos(new CVec3(0,200));


//블랙보드에 등록
ani=new CAnimation();
ani.SetKey("top");
ani.SetBlackBoard(true);
ani.Push(new CClipImg(0,0,"Res/Slime/Slime.png"));
off=0;
for(let y=0;y<4;++y)
{
    ani.Push(new CClipCoodi(off*100,100,0*16,y*16,(0+1)*16,(y+1)*16));
    off++;
}   
//블랙보드에 등록
ani=new CAnimation();
ani.SetKey("bottom");
ani.SetBlackBoard(true);
ani.Push(new CClipImg(0,0,"Res/Slime/Slime.png"));
off=0;
for(let y=0;y<4;++y)
{
    ani.Push(new CClipCoodi(off*100,100,1*16,y*16,(1+1)*16,(y+1)*16));
    off++;
}


gAtl.Frame().PushEvent(CEvent.eType.Update,()=>{
    //등록된 애니 가져오기
    let Ani2DSub=gAtl.Canvas("Main").Find("Ani2DSub");
    if(gAtl.Frame().Input().KeyUp(CInput.eKey.Num1))
    {
        Ani2DSub.FindComp(CAniFlow).ResetAni("top");
    }
    else if(gAtl.Frame().Input().KeyUp(CInput.eKey.Num2))
    {
       Ani2DSub.FindComp(CAniFlow).ResetAni("bottom");
    }
    else if(gAtl.Frame().Input().KeyUp(CInput.eKey.F))
    {
        CUtilObj.ShowModal(Ani2DSub);
    }
})

//====================================================================

//YSort
sub=gAtl.Canvas("Main").Push(new CSubject());
sub.SetPos(new CVec3(200,0,0));
let pt=sub.PushComp(new CPaint2D(gAtl.Frame().Pal().GetNoneTex()));
pt.SetYSort(true);

pth=sub.PushComp(new CPaintHTML(CDomFactory.DataToDom(`<div class="text-center border rounded p-2 bg-light shadow-sm"
     style="width: 200px;">
  YSort 테스트<br>↓
</div>`),null,null));
pth.SetPos(new CVec3(0,200));

sub=gAtl.Canvas("Main").Push(new CSubject());
sub.SetPos(new CVec3(220,40,0));
pt=sub.PushComp(new CPaint2D(gAtl.Frame().Pal().GetNoneTex()));
pt.SetYSort(true);

sub=gAtl.Canvas("Main").Push(new CSubject());
sub.SetPos(new CVec3(240,80,0));
pt=sub.PushComp(new CPaint2D(gAtl.Frame().Pal().GetNoneTex()));
pt.SetYSort(true);

//피벗 변경
sub=gAtl.Canvas("Main").Push(new CSubject());
sub.SetPos(new CVec3(400,0,0));
pt=sub.PushComp(new CPaint2D(gAtl.Frame().Pal().GetNoneTex()));
pt.SetPivot(new CVec3(1,1,1));

pth=sub.PushComp(new CPaintHTML(CDomFactory.DataToDom(`<div class="text-center border rounded p-2 bg-light shadow-sm"
     style="width: 200px;">
  피벗 변경<br>↓
</div>`),null,null));
pth.SetPos(new CVec3(0,200));


// let modal=new CModal();
// modal.SetHeader("Info")
// modal.SetTitle(CModal.eTitle.Text);
// modal.SetBody(`애니메이션 사용법과 YSort,Pivot확인할수 있습니다.<br>
// 숫자키1,2로 애니메이션 변경<br>
// F키로 현재 서브젝트 확인가능<br>
// `);
// modal.SetZIndex(CModal.eSort.Top);
// //modal.SetBG(CModal.eBG.danger);
// modal.SetBodyClose(true);
// modal.Open(CModal.ePos.Center);
// modal.Close(1000*31);


//=============================================
// let line=gAtl.Canvas("Main").Push(new CSubject());
// let trail=line.PushComp(new CPaintTrail(gAtl.Frame().Pal().GetNoneTex()));
// trail.mLastHide=false;
// trail.mLastSmall=false;
// trail.SetStaticPosList([new CVec3(),new CVec3(1000,1000)]);

// // let rp=new CRenderPass(gAtl.Frame().Pal().Sl2DKey());
// // rp.mCullFace=CRenderPass.eCull.None;
// // trail.SetRenderPass(rp);

sub=gAtl.Canvas("Main").Push(new CSubject());
sub.SetPos(new CVec3(-200,0,0));
let pt3d=sub.PushComp(new CPaint3D("Res/teapot/teapot.gltf"));
//gAtl.Frame().Load().Load("Res/teapot/teapot.FBX");
ani=new CAnimation();
ani.Push(new CClipMesh(0,1000,"Res/teapot/teapot.gltf","left"));
sub.PushComp(new CAniFlow(ani));

pth=sub.PushComp(new CPaintHTML(CDomFactory.DataToDom(`<div class="text-center border rounded p-2 bg-light shadow-sm"
     style="width: 200px;">
  3D 애니메이션<br>↓
</div>`),null,null));
pth.SetPos(new CVec3(0,200));