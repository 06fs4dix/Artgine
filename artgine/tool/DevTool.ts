import { arrayBuffer } from "stream/consumers";
import { CAlert } from "../basic/CAlert.js";
import { CClass } from "../basic/CClass.js";
import { CDOM } from "../basic/CDOM.js";
import { CEvent } from "../basic/CEvent.js";
import { CConfirm, CDrop, CModal, CModalTitleBar } from "../basic/CModal.js";
import { CMDViewer, CModalFlex, CMonacoViewer } from "../util/CModalUtil.js";
import { CObject, CPointer } from "../basic/CObject.js";
import { CUniqueID } from "../basic/CUniqueID.js";
import { CUtil } from "../basic/CUtil.js";
import { CVec3 } from "../geometry/CVec3.js";
import { CCamera } from "../render/CCamera.js";
import { CWebView } from "../system/CWebView.js";
import { CBase64File } from "../util/CBase64File.js";
import { CFrame } from "../util/CFrame.js";
import { CLoaderOption } from "../util/CLoader.js";
import { CMesh } from "../render/CMesh.js";
import { CCamCon2DFreeMove, CCamCon3DFirstPerson } from "../util/CCamCon.js";
import { CShader, CShaderList } from "../render/CShader.js";
import { CTexture } from "../render/CTexture.js";
import { CMeshDrawNode } from "../render/CMeshDrawNode.js";
import { SDF } from "../z_file/SDF.js";
import { CMat } from "../geometry/CMat.js";
import { CInput } from "../system/CInput.js";
import { CPoolGeo } from "../geometry/CPoolGeo.js";
import { CMath } from "../geometry/CMath.js";
import { CUtilMath } from "../geometry/CUtilMath.js";
import { CJSON } from "../basic/CJSON.js";
import { CHash } from "../basic/CHash.js";
import { CBound } from "../geometry/CBound.js";
import { CMouse } from "../system/CMouse.js";
import { CUtilObj } from "../basic/CUtilObj.js";
import { CFile } from "../system/CFile.js";
import { CStorage } from "../system/CStorage.js";
import { CPath } from "../basic/CPath.js";
import { CScript } from "../util/CScript.js";
import { CChecker } from "../util/CChecker.js";
import { CLan } from "../basic/CLan.js";
import { CShaderAttr } from "../render/CShaderAttr.js";
import { CWASM } from "../basic/CWASM.js";
import { CRollBack, CRollBackInfo } from "../util/CRollBack.js";
import { CConsol } from "../basic/CConsol.js";
import { CFont, CFontOption } from "../util/CFont.js";
import { CAtelier } from "../app/CAtelier.js";
import { CCanvas } from "../app/canvas/CCanvas.js";
import { CSubject } from "../app/subject/CSubject.js";
import { CRigidBody } from "../app/component/CRigidBody.js";

import { CPaint } from "../app/component/paint/CPaint.js";
import { CCollider } from "../app/component/CCollider.js";
import { CLight } from "../app/component/CLight.js";
import { CPaint2D } from "../app/component/paint/CPaint2D.js";
import { CLocation } from "../app/subject/CLocation.js";
import { CPaint3D } from "../app/component/paint/CPaint3D.js";
import { CBrush } from "../app/canvas/CBrush.js";
import { CColor } from "../render/CColor.js";
import { CAlpha } from "../render/CAlpha.js";
import { CRenderPass } from "../render/CRenderPass.js";


var gModal : CModalFlex;
var gAtl : CAtelier;
//여기에 쓰레기값이 남는 구조다.
var gLeftItem=new Map<string,CObject>();
var gLeftSelect : CObject=null;
var gUpdateEvent : CEvent;
var gRenderEvent : CEvent;
var gToolUpdate=1;
var gCanvasCam=new Map<CCanvas,string>();
//var gCanvasDev=new CCanvas();

let gBoundXY=new CBound();
let gBoundYZ=new CBound();
let gBoundZX=new CBound();
let gBoundTick=40;
let gDragBound=0;
let gMouse : CMouse=null;
let gBTargetWidth=0;
let gBTargetHeight=0;
let gBWidth=0;
let gBHeight=0;
let gSelectBound=new CBound();
let gAddMove=new CVec3();
let gLastCanvas=null;

interface ICanvasStyle {
    width: string;
    height: string;
    position: string;
    top: string;
    left: string;
    right: string;
    bottom: string;
    margin: string;
    padding: string;
    border: string;
    borderRadius: string;
    boxShadow: string;
    backgroundColor: string;
    overflow: string;
    display: string;
    flex: string;
    flexDirection: string;
    justifyContent: string;
    alignItems: string;
    minWidth: string;
    minHeight: string;
    maxWidth: string;
    maxHeight: string;
    pointerEvents:string;
}

let gCanStyle: ICanvasStyle | null = null;
function ResetBoxXYZ(_subject : CSubject)
{
    let cam=gAtl.Brush().GetCamDev();
    let pos=_subject.GetMat().xyz;

    
    // let len=CMath.V3Distance(cam.GetEye(),pos);
    // if(cam.IsOrthographic())
    //     len=cam.GetZoom();
    // else
    //     len*=0.002;
    // gBoundTick=40*len;
  

    
    let t=gBoundTick/100*100;
    let o=gBoundTick/1000*100;

    if(cam.IsOrthographic())
    {
        gBoundXY.mMin.Import(pos);
        gBoundXY.mMax.Import(pos);

        gBoundXY.mMax.x+=t;
        gBoundXY.mMax.y+=t;
        gBoundXY.mMax.z+=o;

        gBoundXY.mMin.x-=t;
        gBoundXY.mMin.y-=t;
        gBoundXY.mMin.z-=o;
        gBoundYZ.mMin.Zero();
        gBoundYZ.mMax.Zero();
        gBoundZX.mMin.Zero();
        gBoundZX.mMax.Zero();
    }
    else
    {
        gBoundXY.mMin.Import(pos);
        gBoundXY.mMax.Import(pos);

        gBoundXY.mMax.x+=t;
        gBoundXY.mMax.y+=o;
        gBoundXY.mMax.z+=o;

        gBoundXY.mMin.x-=t;
        gBoundXY.mMin.y-=o;
        gBoundXY.mMin.z-=o;

        gBoundYZ.mMin.Import(pos);
        gBoundYZ.mMax.Import(pos);

        gBoundYZ.mMax.x+=o;
        gBoundYZ.mMax.y+=t;
        gBoundYZ.mMax.z+=o;

        gBoundYZ.mMin.x-=o;
        gBoundYZ.mMin.y-=t;
        gBoundYZ.mMin.z-=o;

        gBoundZX.mMin.Import(pos);
        gBoundZX.mMax.Import(pos);

        gBoundZX.mMax.x+=o;
        gBoundZX.mMax.y+=o;
        gBoundZX.mMax.z+=t;

        gBoundZX.mMin.x-=o;
        gBoundZX.mMin.y-=o;
        gBoundZX.mMin.z-=t;
    }

    
}
function SubjectRigidBodyClear(_subject : CSubject)
{
    let rArr=_subject.FindComps(CRigidBody);
    for(let rb of rArr)
    {
        rb.Clear();
    }
}
let gScriptViewer : CMonacoViewer=null;
export async function InitDevToolScriptViewer(_github)
{
    let json={brash:"",canvas:[],script:""};
    let data=CStorage.Get(CPath.WebPageUrl()+"Save.json");
    if(data!=null)  json=JSON.parse(data);

    if(json.script=="")
    {
        let buf=await CFile.Load(CPath.WebRootUrl()+"desktop/Template/RuntimeScript.ts")
        json.script=CUtil.ArrayToString(buf);
    }
    
    gScriptViewer=new CMonacoViewer(json.script,"Runtime.ts",_github);
    gScriptViewer.SetCloseEsc(false);


    gScriptViewer.mHeader.prepend(CDOM.DataToDom(
        "<button type='button' class='btn btn-success' id='mvExcute_btn'>Excute</button>"+
        "<button type='button' class='btn btn-primary' id='mvSave_btn'>Save</button>"+
        //"<button type='button' class='btn btn-info' id='mvGPT_btn'>GPT</button>"
        "<button type='button' class='btn btn-info' id='mvSample_btn'>Sample</button>"
    
    
    ));
    CDOM.ID("mvSample_btn").addEventListener("click",async ()=>{
        new CMDViewer(CPath.WebRootUrl()+"artgine/tool/RunTimeSample.md");
    });
       
    
    // CDOM.ID("mvGPT_btn").addEventListener("click",async ()=>{

       

    //     const URL_ARTGINE="https://chatgpt.com/g/g-68ad603d9b3081918273f3d352f995fc-artgine-bot";
    //     const modal = new CModal("mvGPT_link_modal");
    //     modal.SetOverlay(true); // 배경 오버레이
    //     modal.SetHeader("GPT Artgine bot Link");
    //     modal.SetZIndex(CModal.eSort.Manual, CModal.eSort.Auto + 2);
    //     // 본문: 클릭 가능한 앵커 + 복사용 input
    //     modal.SetBody(`
    //         <div style="padding:12px;">
    //             <p>Get help from GPT</p>
    //             <a href="${URL_ARTGINE}" target="_blank" rel="noopener noreferrer">
    //                 ${URL_ARTGINE}
    //             </a>
    //             <div style="margin-top:10px;">
    //                 <input id="mvGPT_link_copy" type="text" value="${URL_ARTGINE}" readonly style="width:100%;"/>
    //             </div>
    //         </div>
    //     `);

    //     modal.Open();
    //     modal.Show();

       
    // });
   

    CDOM.ID("mvExcute_btn").addEventListener("click",async ()=>{
        let source=gScriptViewer.GetSource();
        //let moudle=await CScript.Build(CHash.SHA256(source).substr(0, 32)+".ts",source);
        let moudle=await CScript.Build(CUniqueID.GetHash()+".ts",source);
    });
    CDOM.ID("mvSave_btn").addEventListener("click",async ()=>{
        
        data=CStorage.Get(CPath.WebPageUrl()+"Save.json");
        if(data!=null)  json=JSON.parse(data);

        json.script=gScriptViewer.GetSource();
        CStorage.Set(CPath.WebPageUrl()+"Save.json",JSON.stringify(json));
        CAlert.Info(CLan.Get("Script0","Script Save! Executed at program startup!"));
        //let moudle=await CScript.Build("Test.ts",mv.GetSource());
    });
    await CChecker.Exe(async ()=>{
        if(gScriptViewer.mEditor!=null)
            return false;

        return true;
    });
    return gScriptViewer;
}
export function GetDevToolScriptViewer()
{
    return gScriptViewer;
}
export function DevTool(_atl: CAtelier) 
{
    CModal.PushTitleBar(new CModalTitleBar("DevToolModal","RunTime",async ()=>{
        InitDevToolScriptViewer(_atl.PF().mGitHub);
        
    }));
    CRollBack.On("DevTool",(_data : {type:string,sub:CSubject,pos:CVec3})=>{
        if(_data.type=="Pos")
        {
            _data.sub.SetPos(_data.pos);
        }
    });
    gAtl=_atl;
    const _frame = _atl.Frame();
    const canvas = _frame.Win().Handle();
    const parent = canvas.parentElement;
    
        
    gBTargetWidth=_frame.PF().mTargetWidth;
    gBTargetHeight=_frame.PF().mTargetHeight;
    
    // 기존 캔버스 스타일 복사
    gCanStyle = {
        width: canvas.style.width,
        height: canvas.style.height,
        position: canvas.style.position,
        top: canvas.style.top,
        left: canvas.style.left,
        right: canvas.style.right,
        bottom: canvas.style.bottom,
        margin: canvas.style.margin,
        padding: canvas.style.padding,
        border: canvas.style.border,
        borderRadius: canvas.style.borderRadius,
        boxShadow: canvas.style.boxShadow,
        backgroundColor: canvas.style.backgroundColor,
        overflow: canvas.style.overflow,
        display: canvas.style.display,
        flex: canvas.style.flex,
        flexDirection: canvas.style.flexDirection,
        justifyContent: canvas.style.justifyContent,
        alignItems: canvas.style.alignItems,
        minWidth: canvas.style.minWidth,
        minHeight: canvas.style.minHeight,
        maxWidth: canvas.style.maxWidth,
        maxHeight: canvas.style.maxHeight,
        pointerEvents: canvas.style.pointerEvents
    };

    // 캔버스 스타일 초기화 및 전체 사이즈 적용
    canvas.style.width = '';
    canvas.style.height = '';
    canvas.style.position = '';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.right = '0';
    canvas.style.bottom = '0';
    canvas.style.margin = '0';
    canvas.style.padding = '0';
    canvas.style.border = 'none';
    canvas.style.borderRadius = '0';
    canvas.style.boxShadow = 'none';
    
    canvas.style.overflow = 'hidden';
    canvas.style.display = 'block';
    canvas.style.flex = 'none';
    canvas.style.flexDirection = 'initial';
    canvas.style.justifyContent = 'initial';
    canvas.style.alignItems = 'initial';
    canvas.style.minWidth = '';
    canvas.style.minHeight = '';
    canvas.style.maxWidth = '';
    canvas.style.maxHeight = '';
    canvas.style.pointerEvents='auto';



    _frame.PF().mTargetWidth=0;
    _frame.PF().mTargetHeight=0;
    // _frame.PF().mLeft=0;
    // _frame.PF().mTop=0;
    if (!parent) {
        CAlert.W("캔버스의 부모 요소가 없습니다.");
        return;
    }
    let devCamInit=false;
    for (let canvas of gAtl.mCanvasMap.values()) 
    {
        gCanvasCam.set(canvas,canvas.GetCameraKey());
        if(devCamInit==false)
        {
            devCamInit=true;
            let cam=gAtl.Brush().GetCamera(canvas.GetCameraKey());
            if(cam.GetCamCon()!=null)   cam.GetCamCon().SetInput(null);
            gAtl.Brush().GetCamDev().Import(cam);
            gAtl.Brush().GetCamDev().SetKey("Dev");
            gAtl.Brush().GetCamDev().SetSize(0,0);
            gAtl.Brush().GetCamDev().mReset=true;
            

            if(gAtl.Brush().GetCamDev().mOrthographic)
                gAtl.Brush().GetCamDev().SetCamCon(new CCamCon2DFreeMove(gAtl.Frame().Input()));
            else
                gAtl.Brush().GetCamDev().SetCamCon(new CCamCon3DFirstPerson(gAtl.Frame().Input()));

            
        }
        
    }
    DevToolCamKeyChange("Dev");
    

    const devToolTempDiv = document.createElement("div");
    devToolTempDiv.innerText = "🛠 DevTool";
    devToolTempDiv.className = "w-100 h-100 d-flex justify-content-center align-items-center border border-2 border-secondary text-muted bg-light";
    const syncSize = () => {
        const w = document.documentElement.clientWidth;
        const h = document.documentElement.clientHeight;
        devToolTempDiv.style.minWidth = w + "px";
        devToolTempDiv.style.minHeight = h + "px";
    };
    syncSize();
   
    parent.replaceChild(devToolTempDiv, canvas);

    gModal = new CModalFlex([0.2, 0.6, 0.2], "DevToolModal");
    gModal.SetCloseEsc(false);
    gModal.SetHeader("DevTool");
    gModal.SetSize(800, 600);
    gModal.Open();
    gModal.On(CEvent.eType.Drop,DevToolDrop);
    gModal.FullSwitch();

    _frame.PF().mDebugMode = true;
    CDOM.PaintDiv().hidden=true;


    // else
    //     gModal.SetZIndex(CModal.eSort.Manual,800);

    const maxHeight = "calc(100vh - 10px)"; // 필요 시 조정
    const leftPanel = gModal.FindFlex(0) as HTMLElement;
    const rightPanel = gModal.FindFlex(2) as HTMLElement;
    [leftPanel, rightPanel].forEach(panel => {
        panel.style.maxHeight = maxHeight;
        panel.style.overflowY = "auto";
    });

    const middle = gModal.FindFlex(1) as HTMLElement;
    middle.innerHTML = "";
    middle.appendChild(canvas);

    //DevTool_AddHierarchyListUI(_atl); // 좌측 탭 추가
    DevToolLeft();

    gModal.On(CEvent.eType.Close,() => {
        CRollBack.Off("DevTool");
        gScriptViewer=null;
        _frame.PF().mDebugMode = false;
        CDOM.PaintDiv().hidden=false;
        _frame.PF().mTargetWidth=gBTargetWidth;
        _frame.PF().mTargetHeight=gBTargetHeight;

        // 원래 캔버스 스타일 복원
        if (gCanStyle) {
            // canvas.style.width = gCanStyle.width;
            // canvas.style.height = gCanStyle.height;
            canvas.style.position = gCanStyle.position;
            canvas.style.top = gCanStyle.top;
            canvas.style.left = gCanStyle.left;
            canvas.style.right = gCanStyle.right;
            canvas.style.bottom = gCanStyle.bottom;
            canvas.style.margin = gCanStyle.margin;
            canvas.style.padding = gCanStyle.padding;
            canvas.style.border = gCanStyle.border;
            canvas.style.borderRadius = gCanStyle.borderRadius;
            canvas.style.boxShadow = gCanStyle.boxShadow;
            canvas.style.backgroundColor = gCanStyle.backgroundColor;
            canvas.style.overflow = gCanStyle.overflow;
            canvas.style.display = gCanStyle.display;
            canvas.style.flex = gCanStyle.flex;
            canvas.style.flexDirection = gCanStyle.flexDirection;
            canvas.style.justifyContent = gCanStyle.justifyContent;
            canvas.style.alignItems = gCanStyle.alignItems;
            canvas.style.minWidth = gCanStyle.minWidth;
            canvas.style.minHeight = gCanStyle.minHeight;
            canvas.style.maxWidth = gCanStyle.maxWidth;
            canvas.style.maxHeight = gCanStyle.maxHeight;
            canvas.style.pointerEvents=gCanStyle.pointerEvents;
        }

        if (canvas.parentElement === middle) {
            middle.removeChild(canvas);
        }
        if (devToolTempDiv.parentElement === parent) {
            parent.replaceChild(canvas, devToolTempDiv);
        }
        gAtl.Frame().RemoveEvent(gUpdateEvent);
        gAtl.Frame().RemoveEvent(gRenderEvent);
        for(let [key,value] of gCanvasCam)
        {
            if(key.GetCameraKey()=="Dev")
                key.SetCameraKey(value);
            let cam=gAtl.Brush().GetCamera(value);
            if(cam.GetCamCon()!=null)
                cam.GetCamCon().SetInput(key.GetFrame().Input());
            key.ClearBatch();
        }
        gLeftItem.clear();
        gLeftSelect=null;
    });

    gUpdateEvent=new CEvent(DevToolUpdate);
    gRenderEvent=new CEvent(DevToolRender);
    gAtl.Frame().PushEvent(CEvent.eType.Update,gUpdateEvent);
    gAtl.Frame().PushEvent(CEvent.eType.Render,gRenderEvent);



    let ctrlPressed = false;
    gModal.mBody.tabIndex = 0;
    const IsFocusInput=(): boolean =>{
        const el = document.activeElement;
        if (!el) return false;
        
        const tag = el.tagName.toUpperCase();
        
        return (
            tag === "INPUT" ||
            tag === "TEXTAREA" ||
            tag === "SELECT" ||
            (el as HTMLElement).isContentEditable === true
        );
    }

    gModal.mBody.addEventListener("keydown", (e) => {

        
        if(IsFocusInput())  return;
       

        if(e.key=="Delete")
        {
            DevToolLeftRemove();
        }
        

        // ✅ Ctrl + C → Subject 복사
        if (e.ctrlKey && e.key.toLowerCase() === "c") 
        {
            if (gLeftSelect instanceof CSubject) {
                navigator.clipboard.writeText(gLeftSelect.ToStr());
                CAlert.Info("Copy!");
                e.preventDefault();
            }
        }

        // ✅ Ctrl + V → Subject 붙여넣기
        if (e.ctrlKey && e.key.toLowerCase() === "v") 
        {
            if (!(gLeftSelect instanceof CCanvas)) {
                //CAlert.Info("Paste Target Canvas Select!");
                e.preventDefault();
                return;
            }

            navigator.clipboard.readText().then((_str) => {
                try {
                    let json = new CJSON(_str);
                    if(json.mDocument["class"]==null)
                    {
                        CAlert.E("Paste Failed: str unknow!");
                        return;
                    }

                    let wa = CClass.New(json.mDocument["class"]) as CSubject;
                    wa.ImportCJSON(json);
                    wa.SetKey(CUniqueID.GetHash());

                    (gLeftSelect as CCanvas).PushSub(wa);
                    CAlert.Info("Paste!");
                } catch (err) {
                    CAlert.E("Paste Failed: " + err);
                }
            });
            e.preventDefault();
        }
    });

    // window.addEventListener("keydown", (e) => {
    //     if (e.key === "Control")    ctrlPressed = true;
    // });
    window.addEventListener("keyup", (e) => {
        //if (e.key === "Control")    ctrlPressed = false;

        if (e.key === "F6")
        {
            gAtl.Brush().SetPause(!gAtl.Brush().IsPause());
        }
        if(e.key === "l" && e.ctrlKey)
        {
            DevToolLeftPush();
            //alert("test");
        }
    });


}

function DevToolRender()
{
    let color=new CColor();
    color.w=SDF.eColorModel.RGBAdd;
    let alpha=new CAlpha();
    let FunRenSub=(_sub : CSubject,_font=false)=>{

        if(_font)
        {
            gAtl.Frame().Dev().SetDepthTest(true);
            gAtl.Frame().Dev().SetLine(CRenderPass.eLine.TRIANGLES);

            var fr = CFont.TextToTexName(gAtl.Frame().Ren(),_sub.Key(),new CFontOption(32,"white","black",2));
            color.x=1;
            color.y=1;
            color.z=1;
            color.w=SDF.eColorModel.None;
            
            
            wmat.mF32A[0]=fr.mRXSize/100;
            wmat.mF32A[5]=fr.mRYSize/100;
            // wmat.mF32A[0]=1;
            // wmat.mF32A[5]=1;
            wmat.mF32A[10]=1;

            wmat.xyz=CMath.V3AddV3(_sub.GetPos(),new CVec3(fr.mRXSize*0.5,fr.mRYSize*0.5));
            //wmat.xyz=_sub.GetPos();

            render.SendGPU(shader,color,"colorModel");
            render.SendGPU(shader,alpha,"alphaModel");
            MatToMat12Fun(wmat);
            render.SendGPU(shader,[fr.mKey]);
            render.SendGPU(shader,wMatSA);
            render.MeshDrawNodeRender(shader,meshDrawBox);


            gAtl.Frame().Dev().SetDepthTest(false);
            gAtl.Frame().Dev().SetLine(CRenderPass.eLine.LINE_STRIP);
            render.SendGPU(shader,[gAtl.Frame().Pal().GetBlackTex()]);
        }
        

        let ptArr=_sub.FindComps(CPaint);
        let clArr=_sub.FindComps(CCollider);
        
        for(let pt of ptArr)
        {
            if(pt.GetOwner()==null || pt.GetOwner().IsEnable()==false) continue;
            color.x=1;
            color.y=0;
            color.z=0;
            let bound=pt.GetBoundFMat();
            let LMatPos=pt.GetMat().xyz;
            
            let min = CMath.V3SubV3(bound.mMin,LMatPos);
            let max = CMath.V3SubV3(bound.mMax,LMatPos);
            

            // 중심 위치 = (min + max) * 0.5
            const center = new CVec3(
                (min.x + max.x) * 0.5,
                (min.y + max.y) * 0.5,
                (min.z + max.z) * 0.5
            );
            const boxSize = 1; // 기준 박스 사이즈 (-0.5~0.5)
            // 스케일 = (max - min) * 0.5
            const scale = new CVec3(
                (max.x - min.x) /boxSize,
                (max.y - min.y) /boxSize,
                (max.z - min.z) /boxSize
            );
            wmat.xyz=center;
            wmat.mF32A[0]=scale.x;
            wmat.mF32A[5]=scale.y;
            wmat.mF32A[10]=scale.z;



            

            render.SendGPU(shader,color,"colorModel");
            render.SendGPU(shader,alpha,"alphaModel");
            MatToMat12Fun(wmat);
            render.SendGPU(shader,wMatSA);
            render.MeshDrawNodeRender(shader,meshDrawBox);

            if(pt instanceof CPaint2D)
            {


                if(pt.mYSort)
                {
                    color.x=0;
                    color.y=1;
                    color.z=0;
                    wmat.xyz=CMath.V3AddV3(pt.GetHalf(),subject.GetPos());
                    wmat.y+=pt.mYSortOrigin;
                    wmat.mF32A[0]=4;
                    wmat.mF32A[5]=4;
                    wmat.mF32A[10]=4;

                    render.SendGPU(shader,color,"colorModel");
                    render.SendGPU(shader,alpha,"alphaModel");
                    MatToMat12Fun(wmat);
                    render.SendGPU(shader,wMatSA);
                    render.MeshDrawNodeRender(shader,meshDrawBox);
                }
                

            }
        }


        color.x=0;
        color.y=0;
        color.z=1;
        color.w=SDF.eColorModel.RGBAdd;


        for(let cl of clArr)
        {
            if(cl.GetOwner()==null || cl.IsEnable()==false || cl.GetLayer()=="") continue;
            let bound=cl.GetBW();



        
            const min = bound.mWBound.mMin;
            const max = bound.mWBound.mMax;

            // 중심 위치 = (min + max) * 0.5
            const center = new CVec3(
                (min.x + max.x) * 0.5,
                (min.y + max.y) * 0.5,
                (min.z + max.z) * 0.5
            );
            const boxSize = 1; // 기준 박스 사이즈 (-0.5~0.5)
            // 스케일 = (max - min) * 0.5
            const scale = new CVec3(
                (max.x - min.x) /boxSize,
                (max.y - min.y) /boxSize,
                (max.z - min.z) /boxSize
            );
            wmat.xyz=center;
            wmat.mF32A[0]=scale.x;
            wmat.mF32A[5]=scale.y;
            wmat.mF32A[10]=scale.z;


            
            render.SendGPU(shader,color,"colorModel");
            render.SendGPU(shader,alpha,"alphaModel");
            MatToMat12Fun(wmat);
            render.SendGPU(shader,wMatSA);
            render.SendGPU(shader,[gAtl.Frame().Pal().GetBlackTex()]);

            if(cl.GetBound().GetType()==CBound.eType.Sphere)
                render.MeshDrawNodeRender(shader,meshDrawSphere);
            else
                render.MeshDrawNodeRender(shader,meshDrawBox);
        }

        let ltArr=_sub.FindComps(CLight);
        for(let lt of ltArr)
        {
            if(lt.GetOwner()==null || lt.GetOwner().IsEnable()==false || lt.IsPointLight()==false) continue;

            let ltColor=lt.GetColor();
            color.x=ltColor.x;
            color.y=ltColor.y;
            color.z=ltColor.z;
            color.w=SDF.eColorModel.RGBAdd;
            wmat.xyz=lt.GetDirectPos();

            // 아웃바운드 (반투명)
            alpha.x=0.35;
            wmat.mF32A[0]=lt.GetOutRadius()*2;
            wmat.mF32A[5]=lt.GetOutRadius()*2;
            wmat.mF32A[10]=lt.GetOutRadius()*2;
            render.SendGPU(shader,color,"colorModel");
            render.SendGPU(shader,alpha,"alphaModel");
            MatToMat12Fun(wmat);
            render.SendGPU(shader,wMatSA);
            render.SendGPU(shader,[gAtl.Frame().Pal().GetBlackTex()]);
            render.MeshDrawNodeRender(shader,meshDrawSphere);

            // 인바운드 (불투명)
            alpha.x=1;
            wmat.mF32A[0]=lt.GetInRadius()*2;
            wmat.mF32A[5]=lt.GetInRadius()*2;
            wmat.mF32A[10]=lt.GetInRadius()*2;
            render.SendGPU(shader,color,"colorModel");
            render.SendGPU(shader,alpha,"alphaModel");
            MatToMat12Fun(wmat);
            render.SendGPU(shader,wMatSA);
            render.SendGPU(shader,[gAtl.Frame().Pal().GetBlackTex()]);
            render.MeshDrawNodeRender(shader,meshDrawSphere);
        }
    };
    

    let subject=gLeftSelect as CSubject;
    const render=gAtl.Frame().Ren();
    let shader=gAtl.Frame().Pal().Sl3D().GetShader("Artgine/Shader/3DSimpleCMAM"); //;gAtl.Frame().Res().Find("Artgine/Shader/3DSimpleCMAM") as CShader;
    
    let meshDrawBox=gAtl.Frame().Res().Find(gAtl.Frame().Pal().GetDevBoxMesh()+"Dev") as CMeshDrawNode;
    if(meshDrawBox==null)
    {
        let mesh=gAtl.Frame().Res().Find(gAtl.Frame().Pal().GetDevBoxMesh()) as CMesh;
        meshDrawBox=new CMeshDrawNode();
		gAtl.Frame().Ren().BuildMeshDrawNodeAutoFix(meshDrawBox, shader,mesh.meshTree.mData.ci);
        gAtl.Frame().Res().Push(gAtl.Frame().Pal().GetDevBoxMesh()+"Dev",meshDrawBox);
    }
    let meshDrawSphere=gAtl.Frame().Res().Find(gAtl.Frame().Pal().GetSphereMesh()+"Dev") as CMeshDrawNode;
    if(meshDrawSphere==null)
    {
        let mesh=gAtl.Frame().Res().Find(gAtl.Frame().Pal().GetSphereMesh()) as CMesh;
        meshDrawSphere=new CMeshDrawNode();
		gAtl.Frame().Ren().BuildMeshDrawNodeAutoFix(meshDrawSphere, shader,mesh.meshTree.mData.ci);
        gAtl.Frame().Res().Push(gAtl.Frame().Pal().GetSphereMesh()+"Dev",meshDrawSphere);
    }

    render.UseShader(shader);
    
    render.SendGPU(shader,gAtl.Brush().GetCamDev().GetViewMat(),"viewMat");
    render.SendGPU(shader,gAtl.Brush().GetCamDev().GetProjMat(),"projectMat");
    render.SendGPU(shader,[gAtl.Frame().Pal().GetBlackTex()]);
    

    
    let wmat=new CMat();
    let wMatSA=new CShaderAttr("worldMat",wmat);
    //if(CWASM.IsWASM())wMatSA.mType=12;
    let MatToMat12Fun=(_mat : CMat)=>{
        //_mat.mF32A[3]=_mat.mF32A[12];
        //_mat.mF32A[7]=_mat.mF32A[13];
        //_mat.mF32A[11]=_mat.mF32A[14];
    };


    if(gLastCanvas!=null)
    {
        gAtl.Frame().Dev().SetDepthTest(false);
        gAtl.Frame().Dev().SetLine(CRenderPass.eLine.LINE_STRIP);
        let canvas=gLastCanvas as CCanvas;
        for(let [key,value] of canvas.GetSubMap())
        {
            if(value instanceof CLocation)   
            {

                
                FunRenSub(value,true);
                
            }
        }
        gAtl.Frame().Dev().SetLine(CRenderPass.eLine.TRIANGLES);
        gAtl.Frame().Dev().SetDepthTest(true);
    }

    if(gLeftSelect==null || gLeftSelect instanceof CSubject==false)   return;





    let pos=subject.GetMat().xyz;
    gAtl.Frame().Dev().SetDepthTest(false);
    gAtl.Frame().Dev().SetLine(CRenderPass.eLine.LINE_STRIP);
    {

        if(gAtl.Brush().GetCamDev().IsOrthographic())
        {
            color.x=1;
            color.y=1;
            color.z=0;
            alpha.x=0.5;
            
            wmat.xyz=pos;
                    
            
            wmat.mF32A[0]=gBoundTick*2;
            wmat.mF32A[5]=gBoundTick*2;
            wmat.mF32A[10]=gBoundTick/5;
            
            if(gDragBound==1)gAtl.Frame().Dev().SetLine(CRenderPass.eLine.TRIANGLES);
            render.SendGPU(shader,color,"colorModel");
            render.SendGPU(shader,alpha,"alphaModel");
            MatToMat12Fun(wmat);
            render.SendGPU(shader,wMatSA);
            render.MeshDrawNodeRender(shader,meshDrawBox);
            gAtl.Frame().Dev().SetLine(CRenderPass.eLine.LINE_STRIP);
            alpha.x=0.5;
        }
        else
        {

            color.x=1;
            color.y=0;
            color.z=0;
            wmat.xyz=pos;
                    
            
            wmat.mF32A[0]=gBoundTick*2;
            wmat.mF32A[5]=gBoundTick/5;
            wmat.mF32A[10]=gBoundTick/5;
            
            if(gDragBound==1)gAtl.Frame().Dev().SetLine(CRenderPass.eLine.TRIANGLES);
            render.SendGPU(shader,color,"colorModel");
            render.SendGPU(shader,alpha,"alphaModel");
            MatToMat12Fun(wmat);
            render.SendGPU(shader,wMatSA);
            render.MeshDrawNodeRender(shader,meshDrawBox);
            gAtl.Frame().Dev().SetLine(CRenderPass.eLine.LINE_STRIP);
            
            color.x=0;
            color.y=1;
            color.z=0;
            wmat.xyz=pos;

            wmat.mF32A[0]=gBoundTick/5;
            wmat.mF32A[5]=gBoundTick*2;
            wmat.mF32A[10]=gBoundTick/5;

            if(gDragBound==2)gAtl.Frame().Dev().SetLine(CRenderPass.eLine.TRIANGLES);
            render.SendGPU(shader,color,"colorModel");
            render.SendGPU(shader,alpha,"alphaModel");
            MatToMat12Fun(wmat);
            render.SendGPU(shader,wMatSA);
            render.MeshDrawNodeRender(shader,meshDrawBox);
            gAtl.Frame().Dev().SetLine(CRenderPass.eLine.LINE_STRIP);

            color.x=0;
            color.y=0;
            color.z=1;
            wmat.xyz=pos;
            //wmat.mF32A[12]+=gBoundTick*0.5;
            //wmat.mF32A[14]+=gBoundTick*0.5;
            
            wmat.mF32A[0]=gBoundTick/5;
            wmat.mF32A[5]=gBoundTick/5;
            wmat.mF32A[10]=gBoundTick*2;

            if(gDragBound==3)gAtl.Frame().Dev().SetLine(CRenderPass.eLine.TRIANGLES);
            render.SendGPU(shader,color,"colorModel");
            render.SendGPU(shader,alpha,"alphaModel");
            MatToMat12Fun(wmat);
            render.SendGPU(shader,wMatSA);
            render.MeshDrawNodeRender(shader,meshDrawBox);
            gAtl.Frame().Dev().SetLine(CRenderPass.eLine.LINE_STRIP);
        }
        
    }
    
    gAtl.Frame().Dev().SetLine(CRenderPass.eLine.LINE_STRIP);
    //gAtl.Frame().Dev().SetDepthTest(true);
    
    
    FunRenSub(subject);



    gAtl.Frame().Dev().SetLine(CRenderPass.eLine.TRIANGLES);
    gAtl.Frame().Dev().SetDepthTest(true);


    


}
function DevToolDrop(_drop : CDrop)
{
    if(_drop.mFiles!=null)
    {
        let fileDrop=_drop;
        let pathLoad=true;
        for(let i=0;i<fileDrop.mPaths.length;++i)
        {
            if(fileDrop.mPaths[i]==null)
            {
                pathLoad=false;
                //gAtl.
            }
        }

        if((gLeftSelect==null || gLeftSelect instanceof CCanvas==false) && pathLoad==false)
        {
            
            
            if(gAtl.mCanvasMap.size==0)
            {
                CAlert.E("Canvas Empyt!");
                return;
            }
            //CAlert.Info("Empty Path! First Canvas Select!");
            LeftSelect(gAtl.mCanvasMap.values().next().value);
            
            
        }
        const canvas = gLeftSelect as CCanvas;
        
        const GetIconClass=(path: string | null): string =>{
            if (!path) return "bi bi-question-circle";

            const ext = path.split('.').pop()?.toLowerCase();
            switch (ext) {
                case "tga":
                case "jpg":
                case "jpeg":
                case "png":
                    return "bi bi-image";
                case "fbx":
                case "gltf":
                case "obj":
                    return "bi bi-globe";
                case "ts":
                    return "bi bi-filetype-sh";
                default:
                    return "bi bi-file-earmark";
            }
        }
        const listGroup = CDOM.DataToDom("ul");
        listGroup.className = "list-group";
        fileDrop.mObject=[];
        let uk=CUniqueID.GetHash(8);
        for (let i = 0; i < fileDrop.mFiles.length; ++i) {
            const path = fileDrop.mPaths[i];
            const file = fileDrop.mFiles[i];

            const li = CDOM.DataToDom("li");
            li.className = "list-group-item d-flex align-items-center";

            const icon = CDOM.DataToDom("i");

            // ✅ 항상 file.name 기준으로 확장자 판단
            icon.className = GetIconClass(file.name);
            icon.style.marginRight = "0.5rem";

            // const span = document.createElement("span");
            // span.textContent = path ?? `${file.name}(base64)`;
            // li.append(icon, span);

            const pathText = path ?? `${canvas.Key()+"/"+uk+"/"+file.name}`;
            fileDrop.mObject.push(pathText);
            // 복사 가능 pre
            const pre = document.createElement("pre");
            pre.className = "form-control user-select-all mb-0 me-2";
            pre.style.width = "auto";
            pre.style.display = "inline-block";
            pre.textContent = pathText;

        

            // 묶는 div
            const labelDiv = document.createElement("div");
            labelDiv.className = "d-flex align-items-center";
            labelDiv.append(pre);

            // li에 추가
            li.append(icon, labelDiv);


            listGroup.appendChild(li);
        }
        let option=new CLoaderOption();
        listGroup.append(option.EditInit());
        let confirm = CConfirm.List(listGroup, [async () => {
            let loadName=[];
            if(pathLoad)
            {
                
                for (let i = 0; i < fileDrop.mPaths.length; ++i) {
                    gAtl.Frame().Load().Exe(fileDrop.mPaths[i],option);
                }
            }
            else 
            {
                

                const textureMap = new Map<string, string>(); // file name → base64 name
                const meshFiles: File[] = [];

                // 1. 파일 분류
                for (let i = 0; i < fileDrop.mFiles.length; ++i) {
                    const file = fileDrop.mFiles[i];
                    const ext = file.name.split('.').pop()?.toLowerCase() ?? "";
                    loadName.push(file.name);
                    if (ext === "gltf" || ext === "fbx" || ext === "glb" || ext === "obj") 
                    {
                        //meshFiles.push(file);
                    } 
                    else 
                    {
                        // 텍스처 처리
                        const arrayBuffer = await file.arrayBuffer();
                        const base64 = new CBase64File();
                        base64.mExt = ext;
                        base64.mData = arrayBuffer;
                        base64.RefreshHash();
                        base64.mOption = option.Export();

                        canvas.GetResMap().set(base64.mHash, base64);
                        textureMap.set(file.name.toLowerCase(), fileDrop.mObject[i]); // ✅ 파일명 → 해시이름

                        base64.mOption.mCache=fileDrop.mObject[i];
                        await gAtl.Frame().Load().LoadSwitch(fileDrop.mObject[i], base64.mData, base64.mOption);
                        
                        //CFile.PushCache(base64.mOption.mCache,base64.mData);
                    }
                }

                // 2. 메시 처리
                for (let i = 0; i < fileDrop.mFiles.length; ++i) 
                {
                    const file = fileDrop.mFiles[i];
                    const ext = file.name.split('.').pop()?.toLowerCase() ?? "";
                    if (ext === "gltf" || ext === "fbx" || ext === "glb" || ext === "obj") {}
                    else continue;
                    
                    const arrayBuffer = await file.arrayBuffer();
                    const base64 = new CBase64File();
                    base64.mExt = file.name.split('.').pop()?.toLowerCase() ?? "bin";
                    base64.mData = arrayBuffer;
                    base64.RefreshHash();
                    base64.mOption = option.Export();

                    canvas.GetResMap().set(base64.mHash, base64);
                    base64.mOption.mAutoLoad=false;
                    await gAtl.Frame().Load().LoadSwitch(fileDrop.mObject[i], base64.mData, base64.mOption);

                    // 메시 후처리
                    const mesh = gAtl.Frame().Res().Find(fileDrop.mObject[i]) as CMesh;
                    if (mesh?.texture instanceof Array) {
                        for (let ti = 0; ti < mesh.texture.length; ++ti) {
                            const texPath = mesh.texture[ti];
                            const texName = texPath.split("/").pop()?.toLowerCase() ?? "";

                            if (textureMap.has(texName)) {
                                mesh.texture[ti] = textureMap.get(texName)!; // base64 이름으로 치환
                            }
                        }
                    }
                }
            }//else
            
            CAlert.Info(loadName+" load!");
        }, () => {}], ["OK", "Cancel"]);
    }
    else
    {
        if(gLastCanvas==null)
        {
            CAlert.Info("캔버스를 선택해주세요");
            return;
        }

        let dropPos : CVec3;
        let camDev=gAtl.Brush().GetCamDev();
        if(camDev.IsOrthographic())
            dropPos=camDev.ScreenToWorld2DPoint(_drop.mX,_drop.mY);
        else
            dropPos=gAtl.Brush().GetCamDev().ScreenToWorld3DPoint(_drop.mX,_drop.mY,CMath.V3Distance(camDev.GetEye(),camDev.GetLook()));

        let can=gLastCanvas as CCanvas;
        let newSub : CSubject=null;
        if(_drop.mObject instanceof CSubject)
        {
            
            if(CInput.Key(CInput.eKey.LControl))
                newSub=(_drop.mObject as CObject).ExportProxy() as CSubject;
            else
                newSub=(_drop.mObject as CObject).Export() as CSubject;
            newSub.SetBlackBoard(false);
            

            dropPos.z=newSub.GetPos().z;

            
            //LeftSelect(cobject);
        }
        else if(_drop.mObject instanceof CMesh)
        {
            newSub=new CSubject();
            newSub.PushComp(new CPaint3D(_drop.mObject.Key(),true,100));
        }
        else if(_drop.mObject instanceof CTexture)
        {
            newSub=new CSubject();
            newSub.PushComp(new CPaint2D(_drop.mObject.Key()));
        }
        newSub.SetPos(dropPos);
        can.PushSub(newSub);

        
    }

    
}
let gUpdateTime=0;
function DevToolUpdate(_delay)
{
    
    if(gLeftSelect instanceof CSubject)
    {
        let cam=gAtl.Brush().GetCamDev();

        let pos=gLeftSelect.GetMat().xyz;
        let len=CMath.V3Distance(cam.GetEye(),pos);
        if(cam.IsOrthographic())
            len=cam.GetZoom();
        else
            len*=0.002;
        gBoundTick=40*len;
    }
    


    


    if(gDragBound!=0 && gDragBound!=4)
    {
       
        let mouse=gAtl.Frame().Input().Mouse().Export();;
        let x=(mouse.x-gMouse.x);
        let y=(mouse.y-gMouse.y);
        let subject=gLeftSelect as CSubject;
        
        let pos=subject.GetPos().Export();
        if(gAtl.Brush().GetCamDev().IsOrthographic()==true)
        {
            x*=gAtl.Brush().GetCamDev().GetZoom();
            y*=gAtl.Brush().GetCamDev().GetZoom();
            // const zoom = gAtl.Brush().GetCamDev().GetZoom();
            // x = Number((x * zoom).toFixed(2));
            // y = Number((y * zoom).toFixed(2));

            if(gDragBound==1)
            {
                
                
                if(gAtl.Frame().Input().KeyDown(CInput.eKey.Shift))
                {
                    gAddMove=CMath.V3AddV3(gAddMove,new CVec3(x,y));
                    let size=gSelectBound.GetSize();

                    if(Math.abs(gAddMove.x)>size.x)
                    {
                        pos.x += Math.round(gAddMove.x / size.x) * size.x;
                        gAddMove.x=0;
                    }
                        
                    if(Math.abs(gAddMove.y)>size.y)
                    {
                        pos.y += Math.round(gAddMove.y / size.y) * size.y;
                        gAddMove.y=0;
                    }

                }
                else
                    pos=CMath.V3AddV3(pos,new CVec3(x,y));
                    
            }   
            else if(gDragBound==2)   pos=CMath.V3AddV3(pos,new CVec3(0,x,y));
            else if(gDragBound==3)   pos=CMath.V3AddV3(pos,new CVec3(y,0,x));

            
        }
        else
        {
            if(gAtl.Brush().GetCamDev().GetCamCon()!=null)
                gAtl.Brush().GetCamDev().GetCamCon().SetInput(null);
            let cross=gAtl.Brush().GetCamDev().GetCross();
            let up=gAtl.Brush().GetCamDev().GetUp();
            let front=gAtl.Brush().GetCamDev().GetFront();
            let len=CMath.V3Distance(gAtl.Brush().GetCamDev().GetEye(),pos);
            len*=0.0007;
            x*=len;
            y*=len;

         
            let moveVec = new CVec3(0, 0, 0);

            if (gDragBound == 1) {

                if(CMath.V3Dot(cross,CVec3.Left())>0)
                    moveVec=CMath.V3MulFloat(CVec3.Left(),-x);
                else
                    moveVec=CMath.V3MulFloat(CVec3.Left(),x);
                // moveVec = CMath.V3AddV3(
                //     CMath.V3MulFloat(cross, -x),
                //     CMath.V3MulFloat(up, y)
                // );
            } else if (gDragBound == 2) {
                moveVec=CMath.V3MulFloat(CVec3.Up(),y);
                // moveVec = CMath.V3AddV3(
                //     CMath.V3MulFloat(up, y),
                //     CMath.V3MulFloat(cross, -x)
                // );
            } else if (gDragBound == 3) {
                if(CMath.V3Dot(cross,CVec3.Back())>0)
                    moveVec=CMath.V3MulFloat(CVec3.Back(),-x);
                else
                    moveVec=CMath.V3MulFloat(CVec3.Back(),x);
                // moveVec = CMath.V3AddV3(
                //     CMath.V3MulFloat(front, y),
                //     CMath.V3MulFloat(cross, -x)
                // );
            }

            pos = CMath.V3AddV3(pos, moveVec);
        }
        CDOM.IDValue("PosX", Number(pos.x.toFixed(2)));
        CDOM.IDValue("PosY", Number(pos.y.toFixed(2)));
        CDOM.IDValue("PosZ", Number(pos.z.toFixed(2)));
        subject.SetPos(pos);
        SubjectRigidBodyClear(subject);
        

        gMouse=mouse;
    }
    if(gAtl.Frame().Input().KeyDown(CInput.eKey.LButton) && gDragBound==0 && gLeftSelect instanceof CSubject && 
        CInput.eDragState.None==gAtl.Frame().Input().DragState())
    {

        let ray=gAtl.Brush().GetCamDev().GetRay(gAtl.Frame().Input().Mouse().x,gAtl.Frame().Input().Mouse().y);
        if(gAtl.Brush().GetCamDev().IsOrthographic() && ray.GetDirect().z<-0.9)//2D는 가림 문제로 하드코딩
            ray.GetOriginal().z+=1000;
        ResetBoxXYZ(gLeftSelect);
        //gDragBound=4;
        let lenMin=1000000;
        
        if(CUtilMath.RayBoxIS(gBoundXY.mMin,gBoundXY.mMax, ray))
        {
            lenMin=CMath.V3Distance(ray.GetOriginal(),ray.GetPosition());
            gDragBound=1;
        }
            
        
        
        if(CUtilMath.RayBoxIS(gBoundYZ.mMin,gBoundYZ.mMax, ray))
        {
            let len=CMath.V3Distance(ray.GetOriginal(),ray.GetPosition());
            if(len<lenMin)  
            {
                gDragBound=2;
                lenMin=len;
            }
        }
        if(CUtilMath.RayBoxIS(gBoundZX.mMin,gBoundZX.mMax, ray))
        {
            let len=CMath.V3Distance(ray.GetOriginal(),ray.GetPosition());
            if(len<lenMin)  
            {
                gDragBound=3;
            }
        }
        gMouse=gAtl.Frame().Input().Mouse().Export();
       
        if(gDragBound!=0)
        {
            
            CRollBack.Push(new CRollBackInfo("DevTool",{type:"Pos",sub:gLeftSelect,pos:gLeftSelect.GetPos().Export()}));
        }
    }
    if(gAtl.Frame().Input().DragState()==CInput.eDragState.Move && gLeftSelect==null)
        gDragBound=4;

    if(gAtl.Frame().Input().KeyUp(CInput.eKey.LButton))
    {
        gAddMove.Zero();
        if(gAtl.Brush().GetCamDev().GetCamCon()!=null)
            gAtl.Brush().GetCamDev().GetCamCon().SetInput(gAtl.Frame().Input());
        if(gDragBound==4)
        {
            gDragBound=0;
            return;
        }
        if(gDragBound!=0 || gAtl.Frame().Input().DragState()!=CInput.eDragState.None)
        {
            gDragBound=0;
            //LeftSelect(gLeftSelect);
            return;
        }
        
        
        let selectLen=1000000000;
        let selectSub=null;
        let bselectSub=null;
        //let t1=CPoolGeo.ProductRay();
        let ray=gAtl.Brush().GetCamDev().GetRay(gAtl.Frame().Input().Mouse().x,gAtl.Frame().Input().Mouse().y);
        if(gAtl.Brush().GetCamDev().IsOrthographic() && ray.GetDirect().z<-0.9)//2D는 가림 문제로 하드코딩
            ray.GetOriginal().z+=1000;
        for (let canvas of gAtl.mCanvasMap.values()) 
        {
            for(let subject of canvas.GetSubMap().values())
            {
                if(subject.mSelect==false)  continue;
                
                let ptArr=subject.FindComps(CPaint);
                let clArr=subject.FindComps(CCollider);

                ///ResetBoxXYZ(subject);

                
                
                for(let pt of ptArr)
                {
                    if(selectSub==subject)  continue;
                    let bound=pt.GetBoundFMat();

                    if(CUtilMath.RayBoxIS(bound.mMin,bound.mMax, ray))
                    {
                        //CMath.V3MulMatCoordi(t1.GetPosition(), pt.GetFMat(),ray.mVec3List[1]);

                        let len=CMath.V3Distance(ray.GetOriginal(),ray.GetPosition());
                        if(len<selectLen)
                        {
                            bselectSub=selectSub;
                            selectLen=len;
                            selectSub=subject;
                            gSelectBound=bound;
                            break;
                        }
                        else if(bselectSub==null)
                            bselectSub=subject;
                    }
                }
                for(let cl of clArr)
                {
                    if(selectSub==subject)  continue;
                    let bound=cl.GetBW();

                    if(bound.mWBound.GetType()!= CBound.eType.Null && CUtilMath.RayBoxIS(bound.mWBound.mMin,bound.mWBound.mMax, ray))
                    {
                        //CMath.V3MulMatCoordi(t1.GetPosition(), cl.mGJKShape.GetMatrix(),ray.mVec3List[1]);

                        let len=CMath.V3Distance(ray.GetOriginal(),ray.GetPosition());
                        if(len<selectLen)
                        {
                            bselectSub=selectSub;
                            selectLen=len;
                            selectSub=subject;
                            gSelectBound=bound.mWBound;
                            
                            break;
                        }
                        else if(bselectSub==null)
                            bselectSub=subject;
                    }
                }

                

            }
        }
        //CPoolGeo.RecycleRay(t1);
        if(selectSub!=null)
        {
            if(gLeftSelect==selectSub && bselectSub!=null)
                selectSub=bselectSub;
            
            LeftSelect(selectSub);
        }
        else
            LeftSelect(null);
    }//if LButton
 
    if(gAtl.Frame().Input().KeyUp(CInput.eKey.Esc))
    {
        LeftSelect(null);
    }
    //=====================================================================================================
    
    if(gUpdateTime>0)
    {
        gUpdateTime-=_delay;
        return;
    }
    gUpdateTime=500;
    //브러시쪽 삭제는 처리안했다. 삭제될일이 거의 없어서 안함..
    let collapse=CDOM.ID(gAtl.Brush().ObjHash()+"_collapse");
    if(collapse==null)  return;
    if(collapse.className.indexOf("show")!=-1)
    {
        const bdiv = CDOM.ID(gAtl.Brush().ObjHash() + "_ul");
        for(let obj0 of gAtl.Brush().mCameraMap.values())
        {
            let item=gLeftItem.get(obj0.ObjHash());
            if(item!=null)
            {
                const li = CDOM.ID(obj0.ObjHash() + "_li");
                
                
                
                const nameDiv = li.querySelector(".card-body .d-flex.align-items-center > div:nth-child(2)");
                if (nameDiv && nameDiv.textContent !== obj0.Key()) {
                    nameDiv.textContent = obj0.Key();
                }

                
                
            }
            else//추가
            {
                const newItem = CDOM.DataToDom(LeftNewItem(obj0));
                bdiv.append(newItem);
                gLeftItem.set(obj0.ObjHash(), obj0);
                LeftModifyItem(gAtl.Brush().ObjHash());
            }
        }
    }

    //추가,삭제 둘다 제외함
    for (let canvas of gAtl.mCanvasMap.values()) 
    {
        //const bdiv = CDOM.ID(canvas.ObjHash() + "_ul");
        let item = gLeftItem.get(canvas.ObjHash());
        if (item != null) 
        {
            const li = CDOM.ID(canvas.ObjHash() + "_li");
            const nameDiv = li.querySelector(".card-body .d-flex.align-items-center > div:nth-child(2)");
            if (nameDiv && nameDiv.textContent !== canvas.Key()) 
            {
                nameDiv.textContent = canvas.Key();
            }
            const iconEl = li.querySelector(".card-body .d-flex.align-items-center > i");
            if (iconEl) {
                const targetClass = canvas.IsPause() ? "bi bi-aspect-ratio-fill" : "bi bi-aspect-ratio";
                if (iconEl.className !== targetClass) {
                    iconEl.className = targetClass;
                }
            }
        }

        for(let subject of canvas.GetSubMap().values())
        {
            SyncSubjectTreeRecursive(canvas,subject,false);
        }
        for(let subject of canvas.GetResMap().values())
        {
            if(subject instanceof CSubject)
                SyncSubjectTreeRecursive(canvas,subject,true);
        }
    }
    
    for (let [objHash, obj] of gLeftItem.entries()) 
    {
        if (obj instanceof CSubject && obj.IsDestroy()) 
        {
            const li = CDOM.ID(obj.ObjHash() + "_li");
            const parentUl = li?.parentElement;
            li?.remove();

            // 선택 해제
            if (gLeftSelect === obj) {
                const rightPanel = gModal.FindFlex(2) as HTMLElement;
                rightPanel.innerHTML = "";
                gLeftSelect = null;
            }

            // 💡 부모 DOM의 ID에서 _ul 제거하고 LeftModifyItem 호출
            if (parentUl && parentUl.id.endsWith("_ul")) {
                const parentHash = parentUl.id.replace(/_ul$/, "");
                LeftModifyItem(parentHash);
            }

            gLeftItem.delete(objHash);
        }
    }

}
function DevToolCamKeyChange(_key : string)
{
    for (let canvas of gAtl.mCanvasMap.values()) 
    {
        canvas.SetCameraKey(_key);   
        canvas.ClearBatch();
    }
}
function SyncSubjectTreeRecursive(_parent: CObject, _target: CSubject,_gift : boolean) 
{
    if(_target.IsDestroy()) return;

    const parentUl = CDOM.ID(_parent.ObjHash() + "_ul");
    if (!parentUl) return;

    // 1. DOM 없으면 추가
    let li = CDOM.ID(_target.ObjHash() + "_li");
    if (!li) 
    {
        const newItem = CDOM.DataToDom(LeftNewItem(_target));
        parentUl.append(newItem);
        const hash=_target.ObjHash();
        gLeftItem.set(_target.ObjHash(), _target);


        newItem.setAttribute('draggable', 'true');
        newItem.addEventListener('dragstart', (ev) => {
            
            ev.stopPropagation();
            ev.dataTransfer?.setData('hash', hash); // 오른쪽 카드의 key/hash
            CObject.SetDrag("CObject",_target);
        });
        newItem.addEventListener('dragover', (ev) => ev.preventDefault());
        newItem.addEventListener('drop', (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            const sourceKey = ev.dataTransfer?.getData('hash');
            if(sourceKey==hash || sourceKey=="") return;

            let cutObj=gLeftItem.get(sourceKey);
            for(let can of gAtl.mCanvasMap.values())
            {
                let parent=can.FindParent(cutObj as CSubject);
                if(parent instanceof CCanvas)
                {
                    let obj=can.Find(cutObj.Key(),true);
                    if(obj!=null)
                        can.Detach(cutObj.Key());
                    else
                        can.DetachRes(cutObj.Key());
                }
                else if(parent instanceof CSubject)
                {
                    if(_target!=parent)
                        parent.DetachChild(cutObj.Key());
                    
                }
            }
            _target.PushChild(cutObj as CSubject);

            

            DevToolLeft();
        });
    } 
    else 
    {
        // 2. Key 변경 감지
        const nameDiv = li.querySelector(".card-body .d-flex.align-items-center > div:nth-child(2)");
        if (nameDiv && nameDiv.textContent !== _target.Key()) {
            nameDiv.textContent = _target.Key();
        }

        // Enable 상태에 따라 아이콘 변경 (필요한 경우에만)
        const iconEl = li.querySelector(".card-body .d-flex.align-items-center > i");
        if (iconEl) 
        {
            let icon=_target.Icon();
            if(_gift)   icon="bi bi-gift";

            const targetClass = _target.IsEnable()==false ? icon + "-fill" : icon;
            if (iconEl.className !== targetClass) {
                iconEl.className = targetClass;
            }
        }
    }
    if(_gift)   _target.Prefab(gAtl.Frame());

    
    LeftModifyItem(_parent.ObjHash()); 

    // 3. 자식 확인 (콜랩스 열려 있을 때만)
    const collapseDiv = CDOM.ID(_parent.ObjHash() + "_collapse");
    const childUl = CDOM.ID(_target.ObjHash() + "_ul");
    const isOpen = collapseDiv && collapseDiv.className.indexOf("show") !== -1;
    
    if (isOpen) 
    {
        const currentHashes = new Set<string>();
        for (let child of _target.mChild) 
        {
            currentHashes.add(child.ObjHash());
        }

        // 4. 삭제된 자식 제거
        for (let child of Array.from(childUl.children)) {
            const id = child.id;
            if (id.endsWith("_li")) 
            {
                const objHash = id.replace(/_li$/, "");
                if (!currentHashes.has(objHash)) 
                {
                    child.remove();
                    if(gLeftSelect==gLeftItem.get(objHash))
                    {
                        const rightPanel = gModal.FindFlex(2) as HTMLElement;
                        rightPanel.innerHTML = "";
                        gLeftSelect=null;
                    }
                    gLeftItem.delete(objHash);
                    
                }
            }
        }
        
        
        
    }
    else    return;

    for(let ch of _target.mChild)
        SyncSubjectTreeRecursive(_target, ch,_gift);


    
    
    
}

function DevToolLeftPush()
{
    
    if(gLeftSelect instanceof CCanvas || gLeftSelect instanceof CSubject)
    {
        let list=CClass.ExtendsList(CSubject);
         // datalist ID
        const datalistId = "DevToolLeftAdd_List";

        // datalist HTML
        let datalistHtml = `<datalist id="${datalistId}">`;
        for (let item of list) {
            datalistHtml += `<option value="${item.constructor.name}"></option>`;
        }
        datalistHtml += `</datalist>`;

        // input + datalist 포함한 div 생성
        const div = CDOM.DataToDom(`
            <div>
                <label class="form-label">${gLeftSelect.Key()}-Enter or choose a type to add:</label>
                <input class="form-control" list="${datalistId}" id="DevToolLeftAdd_Input" placeholder="Type name...">
                ${datalistHtml}
            </div>
        `);

         // ✅ Push 동작 함수 따로 정의
        const onPush = () => {
            let value = CDOM.IDValue("DevToolLeftAdd_Input");
            let cls = CClass.New(value);
            if (cls == null) {
                CAlert.E("class not def");
            } else {
                let item = LeftNewItem(cls);
                let bdiv = CDOM.ID(gLeftSelect.ObjHash() + "_ul");
                let lhtml=CDOM.DataToDom(item);
                
                // lhtml.setAttribute('draggable', 'true');
                // lhtml.addEventListener('dragstart', (ev) => {
                //     ev.dataTransfer?.setData('hash', gLeftSelect.ObjHash()); // 오른쪽 카드의 key/hash
                // });
                // bdiv.append(lhtml);
                // lhtml.addEventListener('dragover', (ev) => ev.preventDefault());
                // lhtml.addEventListener('drop', (ev) => {
                //     ev.preventDefault();
                //     const sourceKey = ev.dataTransfer?.getData('hash');

                // });
                LeftModifyItem(gLeftSelect.ObjHash());
                
                if (gLeftSelect instanceof CCanvas)
                    gLeftSelect.PushSub(cls);
                else if (gLeftSelect instanceof CSubject)
                    gLeftSelect.PushChild(cls);

                setTimeout(() => {
                    LeftSelect(cls);
                }, 500);
                //
            }
            confirm.Close(); // ✅ 닫기 추가
  
        };

        const confirm = CConfirm.List(div, [onPush, () => {}], ["Push", "Cancel"]);

        // ✅ Enter 키 이벤트 추가
        const input = div.querySelector("#DevToolLeftAdd_Input") as HTMLInputElement;
        input.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                onPush(); // ✅ Push 함수 호출
            }
        });
        CDOM.ID("DevToolLeftAdd_Input").focus();


        
    }
    else if(gLeftSelect instanceof CBrush)
    {
      
        CConfirm.List("Camere Push?",[()=>{
            let cam=new CCamera(gAtl.PF());
            
            
            let item=LeftNewItem(cam);
            let bdiv=CDOM.ID(gLeftSelect.ObjHash()+"_ul");
            bdiv.append(CDOM.DataToDom(item));
            LeftModifyItem(gLeftSelect.ObjHash());
            (gLeftSelect as CBrush).mCameraMap.set(cam.Key(),cam);
           

            
        },()=>{}],["Push","Cancel"])
    }
    else
    {
        CConfirm.List("CCanvas Push?",[()=>{
            let can=gAtl.NewCanvas(CUniqueID.GetHash());//new CCanvas(gAtl.Frame(),gAtl.Brush());
            
            
            let item=LeftNewItem(can);
            let bdiv=CDOM.ID("DevToolLeft");
            bdiv.append(CDOM.DataToDom(item));
          
            
           DevToolLeft();

            
        },()=>{}],["Push","Cancel"])
    }
}
if(CUtil.IsNode()==false)   window["DevToolLeftPush"]=DevToolLeftPush;
function DevToolLeftRemove(_destry=true)
{
    if(_destry==false){}
    else if(gLeftSelect instanceof CSubject)
        gLeftSelect.Destroy();
    else if(gLeftSelect instanceof CCanvas)
    {
        gAtl.Frame().RemoveIAuto(gLeftSelect);
        gAtl.mCanvasMap.delete(gLeftSelect.Key());
    }
    else if(gLeftSelect instanceof CCamera)
        gAtl.mBrush.mCameraMap.delete(gLeftSelect.Key());
    else    return;
        
    
    let li=CDOM.ID(gLeftSelect.ObjHash()+"_li");
    const parentUl = li.parentElement as HTMLElement;
    li.remove(); // 자신을 DOM에서 제거
    gLeftItem.delete(gLeftSelect.ObjHash());
    
    if (parentUl.id.endsWith("_ul"))
    {
        const parentObjHash = parentUl.id.replace(/_ul$/, "");
        LeftModifyItem(parentObjHash);
        
    }
    const rightPanel = gModal.FindFlex(2) as HTMLElement;
    rightPanel.innerHTML = "";
    gLeftSelect=null;
}
if(CUtil.IsNode()==false)   window["DevToolLeftRemove"]=DevToolLeftRemove;


function DevToolGiftSwap(_obj: CSubject)
{

    for(let can of gAtl.mCanvasMap.values())
    {
        let parent=can.FindParent(_obj);
        if(parent instanceof CCanvas)
        {
            let obj=can.Find(_obj.Key(),true);
            
            if(obj!=null)
            {
                can.Detach(_obj.Key());
                _obj.mPTArr=null;
                //_obj.SetFrame(null);
                can.GetResMap().set(_obj.Key(),_obj);
                DevToolLeftRemove(false);
            }
            else
            {
                can.DetachRes(_obj.Key());
                _obj.SetFrame(null);
                can.PushSub(_obj);
                _obj.mPTArr=null;
                
                //can.mSubMap.set(_obj.Key(),_obj);
                DevToolLeftRemove(false);
                
            }
        }
        else if(parent instanceof CSubject)
        {
            CAlert.E("자식만 따로 프리팹 불가능");
        }

        
    }
   
    
    
}

function DevToolRight(_obj: CObject) 
{
    const rightPanel = gModal.FindFlex(2) as HTMLElement;
    rightPanel.innerHTML = "";

    if (_obj instanceof CSubject) 
    {
        const pos = _obj.GetPos();
        const rot = _obj.GetRot();
        const sca = _obj.GetSca();
        const enabled = _obj.IsEnable();

        // 1. 카드 상단 (Enable + 클래스명)
        const headerCard = CDOM.DataToDom(`
            <div class="card m-2">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <div class="d-flex align-items-center gap-2">
                        <input type="checkbox" id="SubjectEnable" ${enabled ? "checked" : ""}>
                        <span class="fw-bold">${_obj.constructor.name}-${_obj.Key()}</span>
                    </div>
                    <div class="d-flex gap-2">
                        <i class="bi ${_obj.IsBlackBoard() ? "bi-bookmark-fill" : "bi-bookmark"}" 
                        style="cursor: pointer;" title="Blackboard" id="DevToolBB"></i>
                        <i class="bi bi-clipboard-plus" style="cursor: pointer;" title="Copy" id="DevToolCopy"></i>
                        <i class="bi bi-gift" style="cursor: pointer;" title="Gift" id="DevToolGift"></i>
                        <i class="bi bi-trash" style="cursor: pointer;" title="Delete" id="DevToolDelete"></i>
                    </div>
                </div>
            </div>
        `);

        // 2. 하단 Pos/Rot/Sca
        const transformDiv = CDOM.DataToDom(`
            <div class="d-flex flex-column gap-2 m-2">
                <div class="d-flex align-items-center gap-2">
                    <label class="form-label mb-0" style="width: 3rem;">Pos:</label>
                    <input type="number" class="form-control form-control-sm" id="PosX" value="${pos.x}">
                    <input type="number" class="form-control form-control-sm" id="PosY" value="${pos.y}">
                    <input type="number" class="form-control form-control-sm" id="PosZ" value="${pos.z}">
                </div>
                <div class="d-flex align-items-center gap-2">
                    <label class="form-label mb-0" style="width: 3rem;">Rot:</label>
                    <input type="number" class="form-control form-control-sm" id="RotX" value="${rot.x}">
                    <input type="number" class="form-control form-control-sm" id="RotY" value="${rot.y}">
                    <input type="number" class="form-control form-control-sm" id="RotZ" value="${rot.z}">
                </div>
                <div class="d-flex align-items-center gap-2">
                    <label class="form-label mb-0" style="width: 3rem;">Sca:</label>
                    <input type="number" class="form-control form-control-sm" id="ScaX" value="${sca.x}">
                    <input type="number" class="form-control form-control-sm" id="ScaY" value="${sca.y}">
                    <input type="number" class="form-control form-control-sm" id="ScaZ" value="${sca.z}">
                </div>
            </div>
        `);

        // append 순서대로
        rightPanel.append(headerCard);
        rightPanel.append(transformDiv);

        // Enable 체크박스 이벤트
        const enableCheckbox = CDOM.ID("SubjectEnable") as HTMLInputElement;
        enableCheckbox.onchange = () => {
            _obj.SetEnable(enableCheckbox.checked);
        };

        // 공통 벡터 입력 바인딩
        const setVec3 = (prefix: string, setter: (v: any) => void) => {
            const x = CDOM.ID(prefix + "X") as HTMLInputElement;
            const y = CDOM.ID(prefix + "Y") as HTMLInputElement;
            const z = CDOM.ID(prefix + "Z") as HTMLInputElement;
            const ChangeFun = () => {
                const vec = new CVec3(parseFloat(x.value), parseFloat(y.value), parseFloat(z.value));
                setter(vec);
            };
            x.onchange = y.onchange = z.onchange = ChangeFun;
            const MounsDownFun=(_event)=>{
                if (_event.button === 1)
                {
                    _event.preventDefault();
                    var ct=_event.currentTarget as HTMLInputElement;
                    CObject.FocusInputNumberChange(ct,(_value)=>{
                        const vec = new CVec3(parseFloat(x.value), parseFloat(y.value), parseFloat(z.value));
                        setter(vec);
                    });
                }
                
            };
            x.onmousedown=y.onmousedown=z.onmousedown=MounsDownFun;
        };

        setVec3("Pos", v => {_obj.SetPos(v);SubjectRigidBodyClear(_obj);});
        setVec3("Rot", v => _obj.SetRot(v));
        setVec3("Sca", v => _obj.SetSca(v));



        // 블랙보드 토글
        const bbIcon = CDOM.ID("DevToolBB");
        if (bbIcon) {
            bbIcon.onclick = () => {
                const newState = !_obj.IsBlackBoard();
                _obj.SetBlackBoard(newState);
                if (newState) {
                    bbIcon.classList.remove("bi-bookmark");
                    bbIcon.classList.add("bi-bookmark-fill");
                } else {
                    bbIcon.classList.remove("bi-bookmark-fill");
                    bbIcon.classList.add("bi-bookmark");
                }
            };
        }

        // 클립보드 복사
        const copyIcon = CDOM.ID("DevToolCopy");
        if (copyIcon) {
            copyIcon.onclick = () => {
                navigator.clipboard.writeText(_obj.ToStr());
                CAlert.Info("Copy!");
            };
        }

        // 기프트
        const giftIcon = CDOM.ID("DevToolGift");
        if (giftIcon) {
            giftIcon.onclick = () => 
            {
                DevToolGiftSwap(_obj);
                
                //CAlert.Info("Gift!");
            };
        }

        // 삭제
        const deleteIcon = CDOM.ID("DevToolDelete");
        if (deleteIcon) {
            deleteIcon.onclick = () => {
                _obj.Destroy();
                DevToolLeftRemove();
            };
        }

    }
    else if (_obj instanceof CCamera) 
    {
        const eye = _obj.GetEye();
        const look = _obj.GetLook();

        
        const cameraDiv = CDOM.DataToDom(`

            <div class="card m-2">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <div class="d-flex align-items-center gap-2">
                        <span class="fw-bold">${_obj.constructor.name}-${_obj.Key()}</span>
                    </div>
                    <div class="d-flex gap-2">
                        <i class="bi ${_obj.IsBlackBoard() ? "bi-bookmark-fill" : "bi-bookmark"}" 
                            style="cursor: pointer;" title="Blackboard" id="DevToolBB"></i>
                        <i class="bi bi-trash" style="cursor: pointer;" title="Delete" id="DevToolDelete"></i>
                    </div>
                </div>
            </div>

            <div class="d-flex flex-column gap-2 m-2">
                <div class="d-flex align-items-center gap-2">
                    <label class="form-label mb-0" style="width: 3rem;">Eye:</label>
                    <input type="number" class="form-control form-control-sm" id="EyeX" value="${eye.x}">
                    <input type="number" class="form-control form-control-sm" id="EyeY" value="${eye.y}">
                    <input type="number" class="form-control form-control-sm" id="EyeZ" value="${eye.z}">
                </div>
                <div class="d-flex align-items-center gap-2">
                    <label class="form-label mb-0" style="width: 3rem;">Look:</label>
                    <input type="number" class="form-control form-control-sm" id="LookX" value="${look.x}">
                    <input type="number" class="form-control form-control-sm" id="LookY" value="${look.y}">
                    <input type="number" class="form-control form-control-sm" id="LookZ" value="${look.z}">
                </div>
            </div>
        `);

        rightPanel.append(cameraDiv);

        const setVec3 = (prefix: string, setter: (v: any) => void) => {
            const x = CDOM.ID(prefix + "X") as HTMLInputElement;
            const y = CDOM.ID(prefix + "Y") as HTMLInputElement;
            const z = CDOM.ID(prefix + "Z") as HTMLInputElement;
            const update = () => {
                const vec = new CVec3(parseFloat(x.value), parseFloat(y.value), parseFloat(z.value));
                setter(vec);
            };
            x.onchange = y.onchange = z.onchange = update;
            
        };

        setVec3("Eye", v => {_obj.SetEye(v);_obj.mReset=true;});
        setVec3("Look", v => {_obj.SetLook(v);_obj.mReset=true;});

        // 블랙보드 토글
        const bbIcon = CDOM.ID("DevToolBB");
        if (bbIcon) {
            bbIcon.onclick = () => {
                const newState = !_obj.IsBlackBoard();
                _obj.SetBlackBoard(newState);
                if (newState) {
                    bbIcon.classList.remove("bi-bookmark");
                    bbIcon.classList.add("bi-bookmark-fill");
                } else {
                    bbIcon.classList.remove("bi-bookmark-fill");
                    bbIcon.classList.add("bi-bookmark");
                }
            };
        }
        // 삭제
        const deleteIcon = CDOM.ID("DevToolDelete");
        if (deleteIcon) {
            deleteIcon.onclick = () => {
                DevToolLeftRemove();
            };
        }
    }
    else if (_obj instanceof CCanvas) 
    {
        const paused = _obj.IsPause();

        const canvasCard = CDOM.DataToDom(`
            <div class="card m-2">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <div class="d-flex align-items-center gap-2">
                        <input type="checkbox" id="CanvasPause" ${paused ? "checked" : ""}>
                        <span class="fw-bold">${_obj.constructor.name}-${_obj.Key()}</span>
                    </div>
                    <div class="d-flex gap-2">
                        <i class="bi ${_obj.IsBlackBoard() ? "bi-bookmark-fill" : "bi-bookmark"}" 
                            style="cursor: pointer;" title="Blackboard" id="DevToolBB"></i>
                        <i class="bi bi-save" style="cursor: pointer;" title="Save" id="DevToolSave"></i>
                        <i class="bi bi-clipboard-plus" style="cursor: pointer;" title="Copy" id="DevToolCopy"></i>
                        <i class="bi bi-trash" style="cursor: pointer;" title="Delete" id="DevToolDelete"></i>
                    </div>
                </div>
            </div>
        `);

        rightPanel.append(canvasCard);

        // 블랙보드 토글
        const bbIcon = CDOM.ID("DevToolBB");
        if (bbIcon) {
            bbIcon.onclick = () => {
                const newState = !_obj.IsBlackBoard();
                _obj.SetBlackBoard(newState);
                if (newState) {
                    bbIcon.classList.remove("bi-bookmark");
                    bbIcon.classList.add("bi-bookmark-fill");
                } else {
                    bbIcon.classList.remove("bi-bookmark-fill");
                    bbIcon.classList.add("bi-bookmark");
                }
            };
        }

        // Pause 체크박스 이벤트
        const pauseCheckbox = CDOM.ID("CanvasPause") as HTMLInputElement;
        pauseCheckbox.onchange = () => {
            _obj.SetPause(pauseCheckbox.checked);
        };

        // 저장
        const saveIcon = CDOM.ID("DevToolSave");
        if (saveIcon) {
            saveIcon.onclick = async () => {

                if(_obj.GetCameraKey()=="Dev")
                    _obj.SetCameraKey(gCanvasCam.get(_obj));
                if(_obj.GetCameraKey()==null)   _obj.SetCameraKey("2D");
                await CWebView.JToWFileSave("CCanvas",_obj.Key()+".json",_obj.ToStr());
                _obj.SetCameraKey("Dev");

                
                CAlert.Info(_obj.Key()+" Saved!");
            };
        }

        // 클립보드 복사
        const copyIcon = CDOM.ID("DevToolCopy");
        if (copyIcon) {
            copyIcon.onclick = () => {
                navigator.clipboard.writeText(_obj.ToStr());
                CAlert.Info("Copy!");
            };
        }

        // 삭제
        const deleteIcon = CDOM.ID("DevToolDelete");
        if (deleteIcon) {
            deleteIcon.onclick = () => {
                DevToolLeftRemove();
            };
        }
    }
    else if (_obj instanceof CBrush) 
    {
        const paused = _obj.IsPause();

        const brushCard = CDOM.DataToDom(`
            <div class="card m-2">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <div class="d-flex align-items-center gap-2">
                        <input type="checkbox" id="BrushPause" ${paused ? "checked" : ""}>
                        <span class="fw-bold">${_obj.constructor.name}</span>
                    </div>
                    <div class="d-flex gap-2">
                        <i class="bi bi-save" style="cursor: pointer;" title="Save" id="DevToolSave"></i>
                    </div>
                </div>
            </div>
            
            <label for="BrushCameraSelect" class="form-label ps-1">카메라 선택:</label>
            <select id="BrushCameraSelect" class="form-select form-select-sm"></select>

            <button id='ModalView_btn'>ModalView</button>
            
        `);

        rightPanel.append(brushCard);

        CDOM.ID("ModalView_btn").onclick=()=>{
            CModal.ListShow();
        };

        // Pause 체크박스 이벤트
        const pauseCheckbox = CDOM.ID("BrushPause") as HTMLInputElement;
        pauseCheckbox.onchange = () => {
            _obj.SetPause(pauseCheckbox.checked);
        };

        // 저장 아이콘
        const saveIcon = CDOM.ID("DevToolSave");
        if (saveIcon) {
            saveIcon.onclick = async () => {
                CAlert.Info("Brush Saved!");
                await CWebView.JToWFileSave("CBrush","Brush.json",_obj.ToStr());
            };
        }


        // <select> DOM 찾기
        const camSelect = brushCard.querySelector("#BrushCameraSelect") as HTMLSelectElement;

        // 카메라 리스트 채우기
        for (let [key, cam] of _obj.mCameraMap) {
            const option = document.createElement("option");
            option.value = key;
            option.textContent = key;

            if (key === gAtl.Brush().GetCamDev().Key()) {
                option.selected = true;
            }

            camSelect.appendChild(option);
        }

        // 카메라 선택 이벤트
        camSelect.onchange = () => {
            const selectedKey = camSelect.value;
            const devCam = gAtl.Brush().GetCamDev();


            if (selectedKey=="Dev") 
            {
                const firstCanvas = gCanvasCam.keys().next().value as CCanvas;
                const firstCamKey = gCanvasCam.get(firstCanvas);

                if (firstCamKey) {
                    const firstCam = gAtl.Brush().GetCamera(firstCamKey);
                    if (firstCam) {
                        devCam.Import(firstCam);
                        devCam.SetKey("Dev");
                        devCam.mReset = true;

                        if (devCam.mOrthographic)
                            devCam.SetCamCon(new CCamCon2DFreeMove(gAtl.Frame().Input()));
                        else
                            devCam.SetCamCon(new CCamCon3DFirstPerson(gAtl.Frame().Input()));
                    }
                }
            }

            DevToolCamKeyChange(selectedKey);
        };
    }

}

function DevToolLeft()
{
    let listDiv={"tag":"ul","class":"list-group w-100 h-100","id": "DevToolLeft","html":[]};


    listDiv.html.push(`
        <div class="card bg-warning p-0">
            <div class="card-body p-1 d-flex justify-content-between align-items-center">
                <div class="text-start ms-1 me-1 fw-bold">Hierarchy</div>
                <input type='search' class='form-control' id='DevToolHSearch' />
                <div class="d-flex gap-2 ms-1 me-1">
                    <i class="bi bi-save" style="cursor: pointer;" title="Save" id="DevToolAllSave"></i>
                    <i class="bi bi-file-earmark-plus" style="cursor: pointer;" title="Push" onclick='DevToolLeftPush()'></i>
                    <i class="bi bi-trash" style="cursor: pointer;" title="Remove" onclick='DevToolLeftRemove()'></i>
                </div>
            </div>
        </div>
    `);

    

    listDiv.html.push(LeftNewItem(gAtl.Brush()));

    for(let can of gAtl.mCanvasMap.values())
    {
        listDiv.html.push(LeftNewItem(can));
    }
    
    const leftPanel = gModal.FindFlex(0) as HTMLElement;
    leftPanel.innerHTML = "";
    leftPanel.append(CDOM.DataToDom(listDiv));

    const saveIcon = CDOM.ID("DevToolAllSave");
    if (saveIcon) {
        saveIcon.onclick = async () => {
            let SaveFun=async ()=>{
                await CWebView.JToWFileSave("CBrush","Brush.json",gAtl.Brush().ToStr());
                for(let [key,value] of gAtl.mCanvasMap)
                {
                    if(value.GetCameraKey()=="Dev")
                        value.SetCameraKey(gCanvasCam.get(value));
                    if(value.GetCameraKey()==null)   value.SetCameraKey("2D");
                    if(value.mSave)
                        await CWebView.JToWFileSave("CCanvas",value.Key()+".json",value.ToStr());
                    value.SetCameraKey("Dev");
                }
                
                CAlert.Info("All Saved!");
            };
            if(CWebView.IsWebView()!=CWebView.eType.None)
            {
                SaveFun();
            }
            else
            {
                CConfirm.List("Save Type Select!",[
                    ()=>{
                        let json={brash:"",canvas:[],script:""};
                        let data=CStorage.Get(CPath.WebPageUrl()+"Save.json");
                        if(data!=null)  json=JSON.parse(data);

                        json.brash=gAtl.Brush().ToStr();
                        for(let [key,value] of gAtl.mCanvasMap)
                        {
                            if(value.GetCameraKey()=="Dev")
                                value.SetCameraKey(gCanvasCam.get(value));
                            if(value.GetCameraKey()==null)   value.SetCameraKey("2D");
                            if(value.mSave)
                                json.canvas.push(value.ToStr());
                            value.SetCameraKey("Dev");
                        }
                        CStorage.Set(CPath.WebPageUrl()+"Save.json",JSON.stringify(json));
                        
                        CAlert.Info("All Saved!");
                    },
                    async ()=>{
                        await SaveFun();
                    }
                ],["Web","File"]);
            }//else
            

            
        };
    }
    CDOM.ID("DevToolHSearch").addEventListener("keyup",(e)=>{
        const t = e.target as HTMLInputElement;
		const val = t.value;

        for(let [key,value] of gLeftItem)
        {
            const li = CDOM.ID(key + "_li");    
            if(li.innerText.includes(val) || val=="")
                li.style.display = "";
            else
                li.style.display = "none";
        }
        
        


    });

    // 이벤트 위임: 클릭한 대상이 어떤 _obj 인지 확인
    const ulRoot = CDOM.ID("DevToolLeft");
    ulRoot?.addEventListener("click", (e: MouseEvent) => {

        
        
        const target = e.target as HTMLElement;
        if(target.className=="bi bi-file-earmark-plus" || target.className=="bi bi-trash") return;
        
        // // 이전 선택 카드 배경 제거
        // if (gLeftSelect) {
        //     const prevCard = CDOM.ID(gLeftSelect.ObjHash() + "_li")?.querySelector(".card") as HTMLElement;
        //     if (prevCard) prevCard.classList.remove("bg-secondary-subtle");
        // }
        const li = target.closest("li[id$='_li']") as HTMLElement;
        if (!li) 
        {
            LeftSelect(null);
            return;
        }

        const objHash = li.id.replace(/_li$/, "");
        //console.log(`Clicked object hash: ${objHash}`);
        const obj = gLeftItem.get(objHash);
        if (!obj) return;

        LeftSelect(obj);

    
    });
    ulRoot?.addEventListener("dblclick", (e: MouseEvent) => {

        let cam=gAtl.Brush().GetCamDev();
        
       

        const target = e.target as HTMLElement;
        if (target.tagName == "I") return;

        const li = target.closest("li[id$='_li']") as HTMLElement;
        if (!li) return;
        const objHash = li.id.replace(/_li$/, "");

        let obj=gLeftItem.get(objHash);
        if(obj instanceof CSubject)
        {
            if(cam.IsOrthographic())
            {
                let eye=cam.GetEye().Export();
                eye.x=obj.GetPos().x;
                eye.y=obj.GetPos().y;
                cam.EyeMoveAndViewCac(eye);
            }
            else
            {
                let eye=obj.GetPos().Export();;
                cam.CharacterByRotation(eye,0,0,1000);
            }
        }
        


        // 콜백 정의
        const onRename = () => {
            const key = CDOM.IDValue("DevToolLeftRename");
            const textDiv = li.querySelector(".card-body .d-flex.align-items-center > div:nth-child(2)");
            if (textDiv instanceof HTMLElement) {
                textDiv.textContent = key;
            }

            let obj=gLeftItem.get(objHash);
            let bb=obj.IsBlackBoard();
            if(bb)  obj.SetBlackBoard(false);
            gLeftItem.get(objHash).SetKey(key);
            if(bb)  obj.SetBlackBoard(true);

        };

        // 입력창 HTML 생성
        const renameHtml = `
            Rename?<br>
            <input type='text' id='DevToolLeftRename' value='${gLeftItem.get(objHash).Key()}' class="form-control"/>
        `;

        const confirm = CConfirm.List(renameHtml, [onRename, () => {}], ["OK", "Cancel"]);

        // 엔터 입력 시 자동으로 Rename 실행
        setTimeout(() => {
            const input = document.getElementById("DevToolLeftRename") as HTMLInputElement;
            if (input) {
                input.focus();
                input.addEventListener("keydown", (e) => {
                    if (e.key === "Enter") {
                        e.preventDefault();
                        onRename();
                        confirm.Close(); // 확인 후 닫기
                    }
                });
            }
        }, 0);
    });

    for(let [key,value] of gAtl.Brush().mCameraMap)
    {
        let item=LeftNewItem(value);
        let bdiv=CDOM.ID(gAtl.Brush().ObjHash()+"_ul");
        bdiv.append(CDOM.DataToDom(item));
        
    }
    LeftModifyItem(gAtl.Brush().ObjHash());

    
    

    for(let can of gAtl.mCanvasMap.values())
    {
        listDiv.html.push(LeftNewItem(can));
        let canDiv=CDOM.ID(can.ObjHash()+"_li");

        
        canDiv.addEventListener('dragover', (ev) => ev.preventDefault());
        canDiv.addEventListener('drop', (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            const sourceKey = ev.dataTransfer?.getData('hash');
            let cutObj=gLeftItem.get(sourceKey);
            for(let can of gAtl.mCanvasMap.values())
            {
                let parent=can.FindParent(cutObj as CSubject);
                if(parent instanceof CCanvas)
                {
                    let obj=can.Find(cutObj.Key(),true);
                    if(obj!=null)
                        can.Detach(cutObj.Key());
                    else
                        can.DetachRes(cutObj.Key());
                }
                else if(parent instanceof CSubject)
                {
                    parent.DetachChild(cutObj.Key());
                }
            }
            can.PushSub(cutObj as CSubject);
            

            

            DevToolLeft();
        });

        // 2. 해당 상위 caret 아이콘 찾기
        const parentCaret = CDOM.ID(can.ObjHash() + "_caret");
        if (parentCaret instanceof HTMLElement && parentCaret.hasAttribute("hidden")) {
            parentCaret.removeAttribute("hidden");
        }

        // 3. count 갱신 (자식 개수 기준)
        const countSpan = CDOM.ID(can.ObjHash() + "_count");
        if (countSpan) {
            countSpan.textContent = `(${can.GetSubMap().size})`;
        }
    }

   


}
function LeftSelect(_obj : CObject)
{
    
        
    
    
    // 이전 선택 카드 배경 제거
    if (gLeftSelect) {
        const prevCard = CDOM.ID(gLeftSelect.ObjHash() + "_li")?.querySelector(".card") as HTMLElement;
        if (prevCard) prevCard.classList.remove("bg-info-subtle");

    }
    if(_obj==null)  
    {
        gLeftSelect=null;
        const rightPanel = gModal.FindFlex(2) as HTMLElement;
        rightPanel.innerHTML = "";
        // if(gAtl.Brush().GetCamDev().GetCamCon()!=null)
        // {
        //     gAtl.Brush().GetCamDev().GetCamCon().SetRotXLock(false);
        //     gAtl.Brush().GetCamDev().GetCamCon().SetRotYLock(false);
        // }
        
        return;
    }

    
        
    let li=CDOM.ID(_obj.ObjHash() + "_li");

 
    // 현재 선택 카드 배경 회색 적용
    const curCard = li.querySelector(".card") as HTMLElement;
    if (curCard) curCard.classList.add("bg-info-subtle");

    // 우측 패널 갱신
    const rightPanel = gModal.FindFlex(2) as HTMLElement;
    rightPanel.innerHTML = "";
    DevToolRight(_obj);
    rightPanel.append(_obj.EditInit());

    gLeftSelect = _obj;
    

    if (_obj instanceof CCanvas) 
    {
        if(gLastCanvas!=null)
        {
            let bli=CDOM.ID(gLastCanvas.ObjHash() + "_li");
            let bcard=bli.querySelector(".card") as HTMLElement;
            bcard.classList.remove("fw-bold");
        }
        gLastCanvas=_obj;
        if (curCard) curCard.classList.add("fw-bold");
        

        const bdiv = CDOM.ID(_obj.ObjHash() + "_ul");
        if (bdiv.children.length === 0) {
            for (let [key, value] of _obj.GetSubMap()) {
                const item = LeftNewItem(value);
                bdiv.append(CDOM.DataToDom(item));
            }
        }
    }
}
function LeftNewItem(_obj : CObject)
{
    gLeftItem.set(_obj.ObjHash(),_obj);
    const collapseId = `${_obj.ObjHash()}_collapse`;
    let str=`<li id='${_obj.ObjHash()}_li'>
        <div class="card p-0">
            <div class="card-body p-0 d-flex overflow-hidden white-space-nowrap cursor-pointer">
                <div style="width: 0rem; opacity: 0;"></div>
                <i class="bi bi-caret-down-fill me-1" data-bs-toggle="collapse" 
                    href="#${collapseId}" aria-expanded="true" hidden id='${_obj.ObjHash()}_caret'></i>
                <div class="d-flex align-items-center">
                <i class="bi ${_obj.Icon()} me-1"></i>
                <div>${_obj.Key()}</div>
                <div class="ms-1" id='${_obj.ObjHash()}_count'></div>
                </div>
            </div>
        </div>
        <div class="collapse ms-3" id="${collapseId}">
            <ul id="${_obj.ObjHash()}_ul" class='list-group w-100 h-100' style="list-style-type: none;"></ul>
        </div>
    </li>`;
    return str;
}
function LeftModifyItem(_key : string) {

    const myUl = CDOM.ID(_key + "_ul") as HTMLElement;
    if (!myUl) return;

    const count = myUl.children.length;

    // 1. caret 처리
    const caret = CDOM.ID(_key + "_caret") as HTMLElement;
    if (caret) {
        if (count === 0) {
            caret.setAttribute("hidden", "true");
        } else {
            caret.removeAttribute("hidden");
        }
    }

    // 2. count 텍스트 처리
    const countSpan = CDOM.ID(_key + "_count") as HTMLElement;
    if (countSpan) {
        countSpan.textContent = count > 0 ? `(${count})` : "";
    }
}




