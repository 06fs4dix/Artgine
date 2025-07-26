//Version
const version='2025-06-24 11:06:08';
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
gPF.mIAuto = false;
gPF.mWASM = false;

//EntryPoint
import { CCamera } from "../../../artgine/render/CCamera.js";
import { CFrame } from "../../../artgine/util/CFrame.js";
import { CFile } from "../../../artgine/system/CFile.js";
import { CUtil } from "../../../artgine/basic/CUtil.js";
import { CParserIMG } from "../../../artgine/util/parser/CParserIMG.js";
import { CConfirm } from "../../../artgine/basic/CModal.js";
import { CChecker } from "../../../artgine/util/CChecker.js";
import { CMeshDrawNode } from "../../../artgine/render/CMeshDrawNode.js";
import { CConsol } from "../../../artgine/basic/CConsol.js";
import { CVec3 } from "../../../artgine/geometry/CVec3.js";
import { CCamCon3DFirstPerson } from "../../../artgine/util/CCamCon.js";
import { CVec4 } from "../../../artgine/geometry/CVec4.js";
import { CShader, CVertexFormat } from "../../../artgine/render/CShader.js";
import { CMeshCreateInfo } from "../../../artgine/render/CMeshCreateInfo.js";
import { CVec2 } from "../../../artgine/geometry/CVec2.js";
import { CMat } from "../../../artgine/geometry/CMat.js";
import { CEvent } from "../../../artgine/basic/CEvent.js";
var gFrame=new CFrame(gPF);
var gCam=new CCamera(gPF);
var gSelectShader="";
gFrame.PushEvent(CEvent.eType.Load,async ()=>{
    let sInter=gFrame.Ren().SInter().New();
    let str=await CFile.Load("TestShader.ts");
    sInter.Exe("TestShader.ts",CUtil.ArrayToString(str));
    gFrame.Res().Push("TestShader",sInter.GetShaderList().GetShader("TestShader"));
    gFrame.Res().Push("TestShaderUV",sInter.GetShaderList().GetShader("TestShaderUV"));

    let par=new CParserIMG();
    await par.Load("stones.jpg");
    gFrame.Res().Push("stones.jpg",par.GetResult());
    gFrame.Ren().BuildTexture(par.GetResult());

    CConfirm.List("RenderMode Select!",[()=>{gSelectShader="TestShader";},()=>{gSelectShader="TestShaderUV";}],["TestShader","TestShaderUV"]);

    await CChecker.Exe(async ()=>{
        if(gSelectShader!="")   return false;
        
        return true;
    });
});
var g_meshDraw : CMeshDrawNode=null;
gFrame.PushEvent(CEvent.eType.Init,()=>{
   
    CConsol.Log("test","black");
    gCam.Init(new CVec3(0, 1000, 1),new CVec3(0, 0, 0));
    gCam.ResetPerspective();
    gCam.SetCamCon(new CCamCon3DFirstPerson(gFrame.Input()));
    gFrame.Dev().SetClearColor(true,new CVec4(1,0,0,1));

    let shader : CShader;
    let mc=new CMeshCreateInfo();
    g_meshDraw=new CMeshDrawNode();
    if(gSelectShader=="TestShader")
    {
        shader=gFrame.Res().Find(gSelectShader);
        let mb=mc.Create(CVertexFormat.eIdentifier.Position);
        mb.bufF.Push(new CVec3(0,0,0));
        mb.bufF.Push(new CVec3(0,0,500));
        mb.bufF.Push(new CVec3(500,0,0));

        mc.vertexCount=3;
    
    }
    else
    {
        shader=gFrame.Res().Find(gSelectShader);
        let mb=mc.Create(CVertexFormat.eIdentifier.Position);
        mb.bufF.Push(new CVec3(0,0,0));
        mb.bufF.Push(new CVec3(0,0,500));
        mb.bufF.Push(new CVec3(500,0,0));

        mb=mc.Create(CVertexFormat.eIdentifier.UV);
        mb.bufF.Push(new CVec2(0,0));
        mb.bufF.Push(new CVec2(0,1));
        mb.bufF.Push(new CVec2(1,0));
        mc.vertexCount=3;

    }
    gFrame.Ren().BuildMeshDrawNodeAutoFix(g_meshDraw,shader,mc);
    

});
gFrame.PushEvent(CEvent.eType.Render,()=>{
    gFrame.Ren().Begin();

    //이렇게 렌더링하면 배치 최적화를 받을수 없다!
    var shader=gFrame.Res().Find(gSelectShader);
    gFrame.Ren().UseShader(shader);
    //쉐이더 기본정보 설정
    //gFrame.Ren().SendGPU(shader,"RGBA",new CVec4(1,1,1,1));
	gFrame.Ren().SendGPU(shader,new CMat(),"worldMat");
	gFrame.Ren().SendGPU(shader,gCam.GetViewMat(),"viewMat");
	gFrame.Ren().SendGPU(shader,gCam.GetProjMat(),"projectMat");
	//uv값이 없어서 의미없지만 넣음
    gFrame.Ren().SendGPU(shader,["stones.jpg"]);
	
	//만든 메쉬로 렌더링
    gFrame.Ren().MeshDrawNodeRender(shader,g_meshDraw);
	//CFramework.Main().Ren().BMgr().VDrawMeshData(shader,g_meshDraw);


    gFrame.Ren().End();
});

gFrame.PushEvent(CEvent.eType.Update,(_delay : number)=>{
    gCam.Update(_delay);
});



await gFrame.Process();