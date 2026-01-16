import { CAtelier } from "../app/CAtelier.js";
import { CCollider } from "../app/component/CCollider.js";
import { CPaint } from "../app/component/paint/CPaint.js";
import { CPaint2D } from "../app/component/paint/CPaint2D.js";
import { CDensity } from "../app/subject/CDensity.js";
import { CSubject } from "../app/subject/CSubject.js";
import { CVoxel } from "../app/subject/CVoxel.js";
import { CConsol } from "../basic/CConsol.js";
import { CDOM } from "../basic/CDOM.js";
import { CEvent } from "../basic/CEvent.js";
import { CVec2 } from "../geometry/CVec2.js";
import { CVec3 } from "../geometry/CVec3.js";
import { CVec4 } from "../geometry/CVec4.js";
import { CTexture, CTextureInfo } from "../render/CTexture.js";
import { CCamCon2DFreeMove, CCamCon3DFirstPerson } from "../util/CCamCon.js";
import { CModalFlex } from "../util/CModalUtil.js";

var gModal: CModalFlex;
var gAtl: CAtelier;
var gDensity : CDensity;

var gTexSub : CSubject;
var gTexture : CTexture;
export function DensityTool(_density : CDensity)
{
    gDensity=_density;
    gModal = new CModalFlex([0.7, 0.3], "DensityModal");
    gModal.SetHeader("DensityTool");
    // gModal.SetHelp(CDOM.DataToDom(`
    //     <span>shift : 선택 취소</span><br>
    //     <span>ctrl : 셀렉트 모드시 누르상태 타일선택시 매직봉</span><br>
    //     <span>middle : 모드 변경</span><br>
    // `));
    
    gModal.SetSize(1000, 800);
    gModal.Open();
    const maxHeight = "calc(100vh - 10px)"; // 필요 시 조정
    const leftPanel = gModal.FindFlex(0) as HTMLElement;
    const rightPanel = gModal.FindFlex(1) as HTMLElement;
    [leftPanel, rightPanel].forEach(panel => {
        panel.style.maxHeight = maxHeight;
        panel.style.overflowY = "auto";
    });
    let canvas = CDOM.DataToDom(`
        <div style="position: relative; width: 100%; height: 100%;">
        <canvas id="DensityLeft_can"
                style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: block; z-index: 0;">
        </canvas>
        </div>
    `);
    leftPanel.append(canvas);



    let rightHTML=CDOM.DataToDom(`
<div class="p-3 border rounded-3 bg-light">
  <!-- Width / Height : same row -->
  <div class="row g-3">
    <div class="col-6">
      <label for="inpWidth" class="form-label mb-1">Width</label>
      <input
        type="number"
        class="form-control"
        id="inpWidth"
        value="${gDensity.mBufferSize.x}"
        min="1"
        step="1"
      />
    </div>

    <div class="col-6">
      <label for="inpHeight" class="form-label mb-1">Height</label>
      <input
        type="number"
        class="form-control"
        id="inpHeight"
        value="${gDensity.mBufferSize.y}"
        min="1"
        step="1"
      />
    </div>
  </div>

  <!-- Mode : next row -->
  <div class="row g-3 mt-0">
    <div class="col-12">
      <label for="selMode" class="form-label mb-1">Mode</label>
      <select class="form-select" id="selMode" name="mode">
        <option value="R">R</option>
        <option value="G">G</option>
        <option value="B">B</option>
        <option value="A">A</option>
      </select>
    </div>
  </div>
</div>


    `);
    rightPanel.append(rightHTML);


    
    gAtl = new CAtelier();
    gAtl.mPF.mIAuto = true;
    gAtl.Init([], "DensityLeft_can", false).then(()=>{
        gAtl.Brush().GetCam2D().SetCamCon(new CCamCon2DFreeMove(gAtl.Frame().Input()));
        gAtl.Brush().GetCam3D().SetCamCon(new CCamCon3DFirstPerson(gAtl.Frame().Input()));    

        gAtl.NewCanvas("Density");
        //gAtl.Canvas("Density").PushSub(gDensity);


        ResetTexture();

        
        gTexSub=new CSubject();
        
        //gTexSub.PushComp(new CPaint2D(gDensity.Key()+".tex",new CVec2(64*gDensity.mSize,64*gDensity.mSize)));
        gTexSub.PushComp(new CPaint2D(gAtl.Frame().Pal().GetNoneTex(),new CVec2(64*gDensity.mSize,64*gDensity.mSize)));
        gAtl.Canvas("Density").PushSub(gTexSub);
        gAtl.Frame().Dev().SetClearColor(true,new CVec4(0,0,0,1));

    });
    gAtl.Frame().PushEvent(CEvent.eType.Update,DensityUpdate);
}
function ResetTexture()
{
    if(gTexture==null)
    {
        gTexture=new CTexture();
        gAtl.Frame().Res().Push(gDensity.Key()+".tex",gTexture);
    }
    else
    {
        gAtl.mFrame.Ren().ReleaseTexture(gTexture);
    }
    let inpWidth=Number(CDOM.IDValue("inpWidth"));
    let inpHeight=Number(CDOM.IDValue("inpHeight"));
    gTexture.SetSize(inpWidth,inpHeight);
    gTexture.PushInfo([new CTextureInfo(CTexture.eTarget.Sigle,CTexture.eFormat.RGBA8)]);
    gTexture.CreateBuf();
    let buf=gTexture.GetBuf()[0] as Uint8Array;
    buf.fill(0xff);



    gAtl.mFrame.Ren().BuildTexture(gTexture);

    if(gTexSub!=null)
    {
        //gTexSub.m
    }

}
function PickRay() 
{
    let pt=gTexSub.FindComp(CPaint);
    const mouse=gAtl.Frame().Input().Mouse();
    let ray=gAtl.Brush().GetCam3D().GetRay(mouse.x,mouse.y);
    new CCollider(pt.GetBoundFMat()).PickChk(ray);
    return ray;
}
function DensityUpdate()
{
    let ray=PickRay();
    let pt=gTexSub.FindComp(CPaint);
    pt.AddDecal(new CVec4(1,0,0,1), ray.GetPosition(), new CVec3(50,50,5000), ray.GetDirect());
    //CConsol.Log(ray.GetPosition().ToStr());
    
}