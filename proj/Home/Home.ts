//Version
const version='mo18uv2t_2';
import "../../artgine/artgine.js"

//Class
import {CClass} from "../../artgine/basic/CClass.js";

//Atelier
import {CPreferences} from "../../artgine/basic/CPreferences.js";
var gPF = new CPreferences();
gPF.mTargetWidth = 0;
gPF.mTargetHeight = 0;
gPF.mRenderer = "Null";
gPF.m32fDepth = false;
gPF.mTexture16f = false;
gPF.mAnti = true;
gPF.mBatchPool = true;
gPF.mXR = false;
gPF.mDeveloper = true;
gPF.mIAuto = true;
gPF.mWASM = false;
gPF.mCanvas = "";
gPF.mServer = 'webServer';
gPF.mGitHub = false;

import {CAtelier} from "../../artgine/app/CAtelier.js";

import {CPlugin} from "../../artgine/util/CPlugin.js";
var gAtl = new CAtelier();
gAtl.mPF = gPF;
await gAtl.Init([],"");
//The content above this line is automatically set by the program. Do not modify.⬆✋🚫⬆☠️💥🔥

//EntryPoint
import {CObject} from "../../artgine/basic/CObject.js"
import { CSing, CSingOption } from "../../artgine/server/CSing.js";
import { CConfirm, CModal } from "../../artgine/basic/CModal.js";
import { CUtil } from "../../artgine/basic/CUtil.js";
import {CBoard} from "../../artgine/server/CBoard.js";
import { CUtilWeb } from "../../artgine/util/CUtilWeb.js";
import { CStorage } from "../../artgine/system/CStorage.js";
import { CAlert } from "../../artgine/basic/CAlert.js";
import { CDOM } from "../../artgine/basic/CDOM.js";
import { CFecth } from "../../artgine/network/CFecth.js";
import { CPath } from "../../artgine/basic/CPath.js";
import { CFileViewer, CMDViewer } from "../../artgine/util/CModalUtil.js";
import { CFile } from "../../artgine/system/CFile.js";
import { CWebSocket } from '../../artgine/network/CWebSocket.js';

// let mdModal=new CModal("test");
// mdModal.SetBody();
// mdModal.SetTitle(CModal.eTitle.TextClose);
// mdModal.Open();



if(gPF.mServer!="webServer")
    CAlert.E("서버 세팅이 잘못되었습니다");

//CStorage.Set("privateKey",null);

CUtilWeb.Parameter("")
let option=new CSingOption();
option.mFindPWBtn="pass";
CSing.On(CSing.eEvent.State,()=>{
    if(CSing.PrivateKey()==null)
        CDOM.ID("login-btn").innerText="Login";
    else
        CDOM.ID("login-btn").innerText="Logout";
});
CSing.On(CSing.eEvent.Init,()=>{
    if(CSing.PrivateKey()==null)
        CDOM.ID("login-btn").innerText="Login";
    else
        CDOM.ID("login-btn").innerText="Logout";
});
CSing.On(CSing.eEvent.JoinInit,()=>{
    loginModal.SetPosition(CModal.ePos.Center);
});

CSing.On(CSing.eEvent.Insert,()=>{
   loginModal.Open();
   CSing.ModifyMode();
});
let html=await CSing.InitForm(option);
let loginModal=new CModal();
loginModal.SetHeader("Sing");
loginModal.SetBody(html);
loginModal.SetTitle(CModal.eTitle.TextClose);
loginModal.SetCloseToHide(true);
loginModal.SetSize(320,640);


CDOM.ID("login-btn").addEventListener("click",()=>{
    loginModal.Open();
});
let bClient=null;
CDOM.ID("board-tab").onclick=()=>{
    if(bClient==null)
    {
        bClient=new CBoard(CDOM.ID("board"),"")
        bClient.List(0,5);
    }
    
};
// CMD 탭
let cmdInited = false;

CDOM.ID("cmd-tab").addEventListener("shown.bs.tab", () => {
    if (cmdInited) return;
    cmdInited = true;

    const panel = CDOM.ID("cmd-panel");
    const iframe = document.createElement('iframe');
    iframe.src = '/cmd';
    iframe.style.cssText = 'width:100%;border:none;display:block;flex:1;min-height:0;';
    panel.style.cssText = 'display:flex;flex-direction:column;overflow:hidden;';
    panel.appendChild(iframe);

});

if (CDOM.ID("cmd-panel").classList.contains("active")) {
    CDOM.ID("cmd-tab").dispatchEvent(new Event("shown.bs.tab", { bubbles: true }));
}
//==================================================================================================================
var g_contentJBox=new CModal("content_modal");
g_contentJBox.SetCloseToHide(true);
g_contentJBox.SetBody("<img id='ImageModalSrc' style='width:100%;height: auto;max-height: 75vh;object-fit: contain' onclick='NextPhoto()'/>"+
			"<video id='VideoModalSrc' style='width:100%;height: auto;max-height: 75vh;object-fit: contain' controls autoplay onended='NextPhoto()'></video>"+
			"<a id='FileModalSrc' download >Download</a>"+
            "<div id='SourceSrc'/>");
g_contentJBox.Hide();
g_contentJBox.Open(CModal.ePos.Center);


var g_deleteJBox=new CModal("delete_modal");
//g_deleteJBox.SetSize(400,600);
g_deleteJBox.SetCloseToHide(true);
g_deleteJBox.SetBody("<div id='Delete_div'/>");
g_deleteJBox.Hide();
g_deleteJBox.Open(CModal.ePos.Center);



var g_musicJBox=new CModal("music_modal");
g_musicJBox.SetSize(400,600);
g_musicJBox.SetCloseToHide(true);
g_musicJBox.SetBody(`<div id='Music_div'>
        
        <button type='button' class='btn btn-primary' style='margin: 4px;' onclick='SoundEachCopy()'>개별 복사</button>
        <button type='button' class='btn btn-danger' style='margin: 4px;' onclick='SoundAllDelate()'>모두 삭제</button>
        
        <button type='button' class='btn btn-warning' style='margin: 4px;' onclick='SoundPlayListSave()'>리스트 저장</button>
        <audio id='MAudio' onended='SoundEnd()' controls playsinline autoplay></audio>
        <div class='form-check'>
            <input class='form-check-input' type='checkbox' id='SoundRandom_chk' checked>
            <label class='form-check-label' for='SoundRandom_chk'>랜덤 재생</label>
        </div>
     
        <hr><div id='SoundList'></div>
    </div>`);
g_musicJBox.Hide();
g_musicJBox.Open(CModal.ePos.Center);



let index=0;
var folderList={"<>":"ul","class":"list-group","html":[]};
var fileList={"<>":"ul","class":"list-group","html":[]};
function DirListRefresh()
{
    
    CDOM.ID("File_div").innerHTML="";
    CDOM.ID("Delete_div").innerHTML="";
    folderList={"<>":"ul","class":"list-group","html":[]};
    fileList={"<>":"ul","class":"list-group","html":[]};

    if(window["g_path"]!=null && window["g_path"]!="/")
    {
        folderList.html.push({"<>":"li","class":"list-group-item list-group-item-warning list-group-item-action","html":"<i class='bi bi-folder'></i> 최상위 폴더",
            "onclick":()=>{FolderCD("/")},
        });
        let path=(window["g_path"] as string);
        let pos=path.lastIndexOf("/",path.length-2);
        let bpath=path.substr(0,pos);
        bpath+="/";
        folderList.html.push({"<>":"li","class":"list-group-item list-group-item-primary list-group-item-action","html":"<i class='bi bi-folder'></i> 상위 폴더",
            "onclick":()=>{FolderCD(bpath)},
        });
    }

    for(let fl of window["g_dirList"] as Array<{hidden:boolean,file:boolean,name:string,ext:string,open:boolean,index:number}>)
    {
        if(fl.hidden)   continue;
        fl.open=false;
        fl.index=index;
        index++;
        
        let name="";
        let onclick=null;
        if(fl.file==false)
        {
            folderList.html.push({"<>":"li","class":"list-group-item list-group-item-action","id":"fl"+fl.index,
                "html":"<i class='bi bi-folder-fill'>"+fl.name,"onclick":()=>{
                let soundAddType=CDOM.IDValue("soundAddType");
                if(soundAddType=="1")
                {
                    let p2: any = {path:window["g_path"]+fl.name+"/",admin:admin};
                    if(gRootPath) p2.gRootPath = gRootPath;
                    if(gDown)     p2.gDown = gDown;
                    CFecth.Exe("File/List",p2,"json").then((data : {"list","root","path","down"})=>{
                        //CStorage.Set(path==null?"root":path,JSON.stringify(data.list));
                        CAlert.Info(window["g_path"]+fl.name+"추가");
                        

                        for(let fl2 of data.list as Array<{hidden:boolean,file:boolean,name:string,ext:string}>)
                        {
                            if(fl.name==fl2.name)   continue;
                            
                            if(fl2.ext=="mp3" || fl.ext=="ogg")
                            {
                                if(SoundListDupChk(window["g_down"]+window["g_path"]+fl.name+"/"+fl2.name)==false)
                                {
                                    g_soundList.fullPath.push(window["g_down"]+window["g_path"]+fl.name+"/"+fl2.name);
                                    g_soundList.name.push(fl2.name);
                                }
                                
                                
                            }
                        }
                        SoundListRefresh();
                        SoundPlay(0);
                    });
                }
                else
                    FolderCD(window["g_path"]+fl.name+"/");
            }});
        }       
        else if(fl.ext=="png" || fl.ext=="jpg" || fl.ext=="jpeg" || fl.ext=="bmp")
        {
            folderList.html.push({"<>":"li","class":"list-group-item list-group-item-action","id":"fl"+fl.index,
                "html":"<i class='bi bi-folder-image'>"+fl.name,"onclick":(e)=>{
                CDOM.ID("ImageModalSrc").hidden=false;
                (CDOM.ID("ImageModalSrc") as HTMLImageElement).src=window["g_down"]+window["g_path"]+fl.name;
                CDOM.ID("VideoModalSrc").hidden=true;
                CDOM.ID("FileModalSrc").hidden=true;
                //g_openList.add(fl.name);
                fl.open=true;
                RefreshOpen();
                g_contentJBox.Show();
                //e.target.className="list-group-item list-group-item-action list-group-item-secondary";
            
            }});
        }
        // else if(fl.ext=="ts" || fl.ext=="js" || fl.ext=="html" || fl.ext=="json")
        // {
        //     folderList.html.push({"<>":"li","class":"list-group-item list-group-item-action","id":"fl"+fl.index,
        //         "html":"<i class='bi bi-file-earmark'>"+fl.name,"onclick":(e)=>{
                

        //         let modal=new CSourceViewer([window["g_down"]+window["g_path"]+fl.name]);
        //         modal.Open();
                
        //         //e.target.className="list-group-item list-group-item-action list-group-item-secondary";
            
        //     }});
        // }
        else if(fl.ext=="mp3" || fl.ext=="ogg")
        {
            folderList.html.push({"<>":"li","class":"list-group-item list-group-item-action","id":"fl"+fl.index,
                "html":"<i class='bi bi-folder-music'>"+fl.name,"onclick":()=>{
                //g_soundList.fullPath.push();
                let soundAddType=CDOM.IDValue("soundAddType");
                if(soundAddType=="1")
                {
                    if(SoundListDupChk(window["g_down"]+window["g_path"]+fl.name)==false)
                    {
                        g_soundList.fullPath.push(window["g_down"]+window["g_path"]+fl.name);
                        g_soundList.name.push(fl.name);
                    }
                    
                    CAlert.Info(fl.name+" 추가");
                }
                else
                {
                    

                    g_soundList.name.length=0;
                    g_soundList.fullPath.length=0;
                    g_soundList.fullPath.push(window["g_down"]+window["g_path"]+fl.name);
                    g_soundList.name.push(fl.name);

                    for(let fl2 of window["g_dirList"] as Array<{hidden:boolean,file:boolean,name:string,ext:string}>)
                    {
                        if(fl.name==fl2.name)   continue;
                        
                        if(fl2.ext=="mp3" || fl.ext=="ogg")
                        {
                            if(SoundListDupChk(window["g_down"]+window["g_path"]+fl2.name)==false)
                            {
                                g_soundList.fullPath.push(window["g_down"]+window["g_path"]+fl2.name);
                                g_soundList.name.push(fl2.name);
                            }
                            
                            
                        }
                    }
                    SoundListRefresh();
                    SoundPlay(0);
                }
                
                SoundListSave();
                fl.open=true;
                RefreshOpen();
                
            }});
        }
        else if(fl.ext=="mp4" || fl.ext=="mov" || fl.ext=="avi")
        {
            folderList.html.push({"<>":"li","class":"list-group-item list-group-item-action","id":"fl"+fl.index,
                "html":"<i class='bi bi-folder-play'>"+fl.name,"onclick":()=>{
                
                CDOM.ID("ImageModalSrc").hidden=true;
                (CDOM.ID("VideoModalSrc") as HTMLVideoElement).src=window["g_down"]+window["g_path"]+fl.name;
                CDOM.ID("VideoModalSrc").hidden=false;
                CDOM.ID("FileModalSrc").hidden=true;
                fl.open=true;
                RefreshOpen();
                g_contentJBox.Show();
                
            
            }});
        }
        else if(fl.ext=="soundlist")
        {
            folderList.html.push({"<>":"li","class":"list-group-item list-group-item-action","id":"fl"+fl.index,
                "html":"<i class='bi bi-flower1'>"+fl.name,"onclick":()=>{
                var oReq = new XMLHttpRequest();
                oReq.onload = (e)=> 
                {
                    if (oReq.status != 200) 
                    {
                        CAlert.E("XMLHttpRequest error code" + oReq.status);
                    }
                    else
                    {
                        g_soundList=oReq.response;
                        SoundListSave();
                        CAlert.Info("ListUp!");
                    }
                }
                oReq.open("GET", window["g_down"]+window["g_path"]+fl.name);
                oReq.responseType = "json";
                oReq.send();
            }});
        }
        else if(fl.ext=="html")
        {
            folderList.html.push({"<>":"li","class":"list-group-item list-group-item-action","id":"fl"+fl.index,
                "html":"<i class='bi bi-file-earmark-code'>"+fl.name,"onclick":()=>{
                let confirm=new CConfirm();
                confirm.SetBody("HTML 파일을 어떻게 열까요?");
                confirm.SetConfirm(CConfirm.eConfirm.YesNo,[
                    ()=>{ window.open(window["g_down"]+window["g_path"]+fl.name, "_blank"); },
                    ()=>{
                        let viewer = new CFileViewer([window["g_down"]+window["g_path"]+fl.name], async (filePath, bufStr) => {
                            const fileName = filePath.split('/').pop();
                            const dirPath = window["g_root"] + window["g_path"];
                            const base64 = btoa(unescape(encodeURIComponent(bufStr)));
                            CFecth.Exe("File/Upload", { path: dirPath, name: [fileName], data: [base64] }).then(() => {
                                CAlert.Info('저장 완료');
                            }).catch((e) => {
                                CAlert.E('저장 실패: ' + e.message);
                            });
                        });
                        viewer.Open();
                    },
                ],["새 창","파일뷰어"])
                confirm.Open();
            }});
        }
        else if(fl.ext=="ts" || fl.ext=="js" || fl.ext=="txt" || fl.ext=="json")
        {
            folderList.html.push({"<>":"li","class":"list-group-item list-group-item-action","id":"fl"+fl.index,
                "html":"<i class='bi bi-file-code'>"+fl.name,"onclick":()=>{
                                
                
                let viewer = new CFileViewer([window["g_down"]+window["g_path"]+fl.name], async (filePath, bufStr) => {
                    const fileName = filePath.split('/').pop();
                    const dirPath = window["g_root"] + window["g_path"];
                    const base64 = btoa(unescape(encodeURIComponent(bufStr)));
                    console.log('Upload →', { path: dirPath, name: [fileName] }); // ← 확인용
                    CFecth.Exe("File/Upload", { path: dirPath, name: [fileName], data: [base64] }).then(() => {
                        CAlert.Info('저장 완료');
                    }).catch((e) => {
                        CAlert.E('저장 실패: ' + e.message);
                    });
                });
                viewer.Open();
            }});
        }
        else if(fl.ext=="md")
        {
            folderList.html.push({"<>":"li","class":"list-group-item list-group-item-action","id":"fl"+fl.index,
                "html":"<i class='bi bi-file-earmark-text'>"+fl.name,"onclick":(e)=>{
                new CMDViewer(window["g_down"]+window["g_path"]+fl.name);
            }});
        }
        else
        {
            folderList.html.push({"<>":"li","class":"list-group-item list-group-item-action","id":"fl"+fl.index,
                "html":"<i class='bi bi-file'>"+fl.name,"onclick":()=>{
                
                CDOM.ID("ImageModalSrc").hidden=true;
                (CDOM.ID("FileModalSrc") as HTMLLinkElement).href=window["g_down"]+window["g_path"]+fl.name;
                CDOM.ID("VideoModalSrc").hidden=true;
                CDOM.ID("FileModalSrc").hidden=false;

                g_contentJBox.Show();
            
            }});
        }
        
        if(fl.file==true)
        {
            fileList.html.push({"<>":"li","class":"list-group-item list-group-item-action","id":"fl"+fl.index,
                "html":"<i class='bi bi-file'>"+fl.name,"onclick":()=>{
                Delete(fl.name);
            }});
        }

    }

    CDOM.ID("File_div").append(CDOM.DataToDom(folderList));
    CDOM.ID("Delete_div").append(CDOM.DataToDom(fileList));
}

let path=CUtilWeb.Parameter("path");
let admin=CUtilWeb.Parameter("admin");
let gRootPath=CUtilWeb.Parameter("gRootPath");
let gDown=CUtilWeb.Parameter("gDown");

if(admin!="admin") admin="admin";

window["g_dirList"]=CStorage.Get(path==null?"root":path);
if(window["g_dirList"]!=null)   
{
    window["g_dirList"]=JSON.parse(window["g_dirList"]);
    DirListRefresh();
}

let fetchParam: any = {path:path,admin:admin};
if(gRootPath) fetchParam.gRootPath = gRootPath;
if(gDown)     fetchParam.gDown = gDown;

CFecth.Exe("File/List",fetchParam,"json").then((data : {"list","root","path","down"})=>{
    CStorage.Set(path==null?"root":path,JSON.stringify(data.list));
    window["g_dirList"]=data.list;
    window["g_root"]=data.root;
    window["g_path"]=data.path;
    window["g_down"]=data.down;
    DirListRefresh();
});



let g_soundList={"fullPath":[],"name":[]};
let SoundListStr=CStorage.Get("SoundList");
if(SoundListStr!=null)
    g_soundList=JSON.parse(SoundListStr);

function FolderCD(_path)
{
    window["g_path"]=_path;
    Redirection(false);
}
window["FolderCD"]=FolderCD;

var g_fun="";
var g_data="";
var g_option="";
// 변경 후
function Redirection(_multi : boolean)
{
    var form = CDOM.ID("ThisPage") as HTMLFormElement;
    form.setAttribute("charset", "UTF-8");
    form.setAttribute("method", "Post");
    form.setAttribute("action", CPath.PHPC()+"File/Redirection");

    CDOM.IDValue("fun",g_fun);
    CDOM.IDValue("data",g_data);
    CDOM.IDValue("option",g_option);
    CDOM.IDValue("admin",admin);
    CDOM.IDValue("path",encodeURIComponent(window["g_path"]));
    CDOM.IDValue("gRootPath", gRootPath ?? "");
    CDOM.IDValue("gDown", gDown ?? "");
    
    form.submit();
}
window["Redirection"]=Redirection;

//var pageAction=CWebUtil.Parameter("pageAction","");




//==========================================================


var g_menuList={"<>":"div","html":[
    
    {"<>":"form","action":"FilePage.jsp","id":"ThisPage","name":"ThisPage","method":"post","accept-charset":"UTF-8","html":[
        {"<>":"button","type":"button","class":"btn btn-primary","style":"margin: 4px;","text":"음악","onclick":()=>{
            g_musicJBox.Show();
            g_musicJBox.SetPosition(CModal.ePos.Center);
        }},
        
        
        {"<>":"button","type":"button","class":"btn btn-warning","style":"margin: 4px;","text":"폴더 생성","onclick":()=>{CreateFolder();}},
        {"<>":"button","type":"button","class":"btn btn-danger","style":"margin: 4px;","text":"삭제","onclick":()=>{g_deleteJBox.Show();}},
        {"<>":"button","type":"button","class":"btn btn-secondary","style":"margin: 4px;","text":"권한","onclick":()=>{AuthRequest();}},
        {"<>":"input","type":"file","multiple":"multiple","id":"uploadBtn","name":"uploadBtn","text":"업로드"},
        {"<>":"select","class":"form-select form-select-sm d-inline-block","id":"soundAddType","style":"width:128px;","html":[
            {"<>":"option","value":"0","text":"전체 추가"},
            {"<>":"option","value":"1","text":"개별 추가(폴더 가능)"},
        ]},
        
        {"<>":"input","type":"hidden","id":"fun","name":"fun"},
        {"<>":"input","type":"hidden","id":"data","name":"data"},
        {"<>":"input","type":"hidden","id":"option","name":"option"},
        {"<>":"input","type":"hidden","id":"path","name":"path"},
        {"<>":"input","type":"hidden","id":"admin","name":"admin"},
        {"<>":"input","type":"hidden","id":"gRootPath","name":"gRootPath"},
        {"<>":"input","type":"hidden","id":"gDown","name":"gDown"},
        
        //{"<>":"label","class":"custom-file-label","for":"uploadBtn","text":"업로드"}
    ]},
]};

CDOM.ID("Menu_div").append(CDOM.DataToDom(g_menuList));

function AuthRequest()
{
    let confirm = new CConfirm();
    confirm.SetBody('관리자 암호를 입력하세요!<br><input type="password" id="AuthPassword" class="form-control form-control-sm">');
    confirm.SetConfirm(CConfirm.eConfirm.YesNo, [
        () => {
            const pw = CDOM.IDValue("AuthPassword");
            CFecth.Exe("File/Auth", { password: pw }, "json").then((res: { ok: boolean, msg?: string }) => {
                if (res.ok)
                    CAlert.Info("권한 획득 성공");
                else
                    CAlert.E("암호가 틀렸습니다: " + (res.msg ?? ""));
            }).catch(() => {
                CAlert.E("서버 오류");
            });
        },
        () => {},
    ], ["확인", "취소"]);
    confirm.Open();
}
window["AuthRequest"] = AuthRequest;
function CreateFolder()
{
  
    let confirm=new CConfirm();
    confirm.SetBody('생성할 폴더명을 입력하세요!<br><input type="text" id="CreateFolder" class="form-control form-control-sm" value="새 폴더">');
    confirm.SetConfirm(CConfirm.eConfirm.YesNo,[
    ()=> {
        g_fun="CreateFolder";
			g_data=window["g_path"]+CDOM.IDValue("CreateFolder");
			Redirection(false);
        
    },
    ()=> {
        
    },
    ],["Yes","No"])
    confirm.Open();

	// new CJBox(CJBox.Df.Confirm, {
	// 	content:'생성할 폴더명을 입력하세요!<br><input type="text" id="CreateFolder" class="form-control form-control-sm" value="새 폴더">',
	// 	confirmButton: '예',
	// 	cancelButton: '아니오',
	// 	confirm : function () 
	// 	{
	// 		g_fun="CreateFolder";
	// 		g_data=window["g_path"]+CDOM.IDValue("CreateFolder");
	// 		Redirection(false);
	// 	},
	// 	cancel : function () {
			
	// 	}
	// }).open();
}
window["CreateFolder"]=CreateFolder;
function Delete(_file)
{
    g_fun="Delete";
    g_data=window["g_path"]+_file;
    Redirection(false);
}
window["Delete"]=Delete;
// async function Upload()
// {
//     CAlert.E("막아둠");return;
//     var input=document.createElement('input');
//     input.type="file";
//     input.accept=".json";
//     input.click();

//     await new Promise<void>((resolve) => {
//         input.onchange=async(e)=>{
//             var fi=e.target as HTMLInputElement;
//             let _str = await CUtil.FileToStr(fi.files[0]) as string|object;
           
//             resolve();
//         };
//         //파일 선택 취소
//         input.addEventListener('cancel', () => {
//             resolve();
//         });
//     });
// }

// window["Upload"]=Upload;


CDOM.ID("uploadBtn").onchange=async (e)=>{

    var fi=e.target as HTMLInputElement;
    let json={data:[],name:[],path:window["g_root"]+window["g_path"]};
    for(let i=0;i<fi.files.length;++i)
    {
        //fi.files[i].arrayBuffer
        json.name.push(fi.files[i].name);
        json.data.push(CUtil.ArrayToBase64(await fi.files[i].arrayBuffer()));
    }
	CFecth.Exe("File/Upload",json).then(()=>{
        Redirection(true);
    });
    
};
// function SoundAllAdd()
// {
//     for(let fl of window["g_dirList"] as Array<{hidden:boolean,file:boolean,name:string,ext:string}>)
//     {
//         if(fl.ext=="mp3" || fl.ext=="ogg")
//         {
//             g_soundList.fullPath.push(window["g_down"]+window["g_path"]+fl.name);
//             g_soundList.name.push(fl.name);
            
//         }
//     }
//     CAlert.Info("전곡 추가");
//     SoundListSave();
// }
// window["SoundAllAdd"]=SoundAllAdd;
let gRamdomList=[];
function SoundListRefresh()
{
    gRamdomList=[];
    if(g_soundList==null)   return;

    var musicStr="";
    CDOM.ID("SoundList").innerHTML="";

    


    for(let i=0;i<g_soundList.fullPath.length;++i)
    {
        //let full=window["g_down"]+g_soundList.fullPath[i];
        

        musicStr+="<ul class='list-group'>";
		musicStr+="<li class='list-group-item list-group-item-action' id='Sound"+i+"' onclick='SoundPlay("+i+")'>"+
			"<i class='bi bi-file-music'></i> <font color='red'>"+g_soundList.name[i]+
            "</font><i class='bi bi-file-earmark-x float-right' onclick='SoundDelete("+i+")'></i></li>";
		musicStr+="</ul>";
    }
    CDOM.ID("SoundList").innerHTML=musicStr;
}
window["SoundListRefresh"]=SoundListRefresh;
SoundListRefresh();

function SoundListSave()
{
    CStorage.Set("SoundList",JSON.stringify(g_soundList));
    SoundListRefresh();
}
window["SoundListSave"]=SoundListSave;


var g_lastPlay=0;
function SoundPlay(_off)
{
    if(g_soundList.fullPath.length==0)  return;
    var MAudio=document.getElementById('MAudio') as HTMLAudioElement;
    if(_off==-1)
    {
        CDOM.ID("Sound"+g_lastPlay).className="list-group-item list-group-item-action";
		g_lastPlay=0;
		
        
    }
	else
	{
        CDOM.ID("Sound"+g_lastPlay).className="list-group-item list-group-item-action";
		g_lastPlay=_off;
		MAudio.src=g_soundList.fullPath[_off];
        MAudio.load();
        CDOM.ID("Sound"+_off).className="list-group-item list-group-item-action list-group-item-dark";
	}
    if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
            title: g_soundList.name[_off],
            artwork: [
                { src: "512x512.png", sizes: "512x512", type: "image/png" }
            ]
        });

        navigator.mediaSession.setActionHandler("play", () => MAudio.play());
        navigator.mediaSession.setActionHandler("pause", () => MAudio.pause());
        navigator.mediaSession.setActionHandler("nexttrack", () => SoundEnd());
        navigator.mediaSession.setActionHandler("previoustrack", () => SoundEnd());
    }
    MAudio.play().catch(e => console.warn("SoundPlay failed:", e));
}
window["SoundPlay"]=SoundPlay;
function SoundDelete(_off)
{
    //if (event.preventDefault) event.preventDefault();

    var MAudio=document.getElementById('MAudio') as HTMLAudioElement;
    g_soundList.fullPath.splice(_off,1);
    g_soundList.name.splice(_off,1);
    SoundListSave();
	MAudio.pause();
}
window["SoundDelete"]=SoundDelete;


function SoundEnd()
{
    if((CDOM.ID("SoundRandom_chk") as HTMLInputElement).checked)
    {
        while(g_soundList.fullPath.length>0)
        {
            if(gRamdomList.length==0)
            {
                gRamdomList=[...g_soundList.fullPath];
            }

            let sel=Math.trunc(Math.random()*gRamdomList.length);

            let selKey=gRamdomList.splice(sel,1)[0];
            for(let i=0;i<g_soundList.fullPath.length;++i)
            {
                if(g_soundList.fullPath[i]==selKey)
                {
                    SoundPlay(i);
                    return;
                }
            }
        }
        

        //SoundPlay(Math.trunc(Math.random()*g_soundList.fullPath.length));
    }
    else
    {
        ;
        if(g_soundList.fullPath.length<=g_lastPlay+1)
            SoundPlay(0);
        else
            SoundPlay(g_lastPlay+1);
        
    }
}
window["SoundEnd"]=SoundEnd;
function SoundAllDelate()
{
    gRamdomList=[];
    g_soundList.fullPath=[];
    g_soundList.name=[];
    SoundListSave();
}
window["SoundAllDelate"]=SoundAllDelate;


// function SoundShuffle()
// {
// 	//g_soundList.fullPath.sort(() => Math.random() - 0.5); 
//     var fArr=[];
//     var nArr=[];
//     while(g_soundList.fullPath.length>0)
//     {
//         let off=Math.trunc(g_soundList.fullPath.length*Math.random());
//         fArr.push(g_soundList.fullPath.splice(off,1)[0]);
//         nArr.push(g_soundList.name.splice(off,1)[0]);
//     }
//     g_soundList.fullPath=fArr;
//     g_soundList.name=nArr;

// 	SoundListSave();
// }
// window["SoundShuffle"]=SoundShuffle;
function SoundListDupChk(_soundKey : string)
{
    for(let each0 of g_soundList.fullPath)
    {
        if(each0==_soundKey)    return true;
    }

    return false;
   
}
window["SoundListPush"]=SoundListDupChk;
function SoundPlayListSave()
{
    let confirm=new CConfirm();
    confirm.SetBody('저장할 파일명을 입력하세요!<br><input type="text" id="soundListSave" class="form-control form-control-sm" value="basic">');
    confirm.SetConfirm(CConfirm.eConfirm.YesNo,[
    ()=> {
        g_fun="SoundPlayListSave";
			g_data=JSON.stringify(g_soundList);
            g_option=CDOM.IDValue("soundListSave");
			Redirection(false);
        
    },
    ()=> {
        
    },
    ],["Yes","No"])
    confirm.Open();

    // new CJBox(CJBox.Df.Confirm, {
	// 	content:'저장할 파일명을 입력하세요!<br><input type="text" id="soundListSave" class="form-control form-control-sm" value="basic">',
	// 	confirmButton: '예',
	// 	cancelButton: '아니오',
	// 	confirm : function () 
	// 	{
	// 		//Sound("SoundListSave"+g_path+"/"+$("#soundListSave").val());
			
	// 		g_fun="SoundPlayListSave";
	// 		g_data=JSON.stringify(g_soundList);
    //         g_option=CDOM.IDValue("soundListSave");
	// 		Redirection(false);
	// 	},
	// 	cancel : function () {
			
	// 	},
	// 	onOpen : function(){
	// 		g_musicJBox.close();
	// 	}
	// }).open();
}
window["SoundPlayListSave"]=SoundPlayListSave;




function SoundEachCopy()
{
    let confirm=new CConfirm();
    confirm.SetBody('리스트를 복사하겠습니까?">');
    confirm.SetConfirm(CConfirm.eConfirm.YesNo,[
    ()=> {
        g_fun="SoundEachCopy";
            g_data=JSON.stringify(g_soundList);
            Redirection(false);
        
    },
    ()=> {
        g_musicJBox.Hide();
    },
    ],["Yes","No"])
    confirm.Open();

    // new CJBox(CJBox.Df.Confirm, {
	// 	content:'리스트를 복사하겠습니까?">',
	// 	confirmButton: '예',
	// 	cancelButton: '아니오',
	// 	confirm : function () 
	// 	{
	// 		g_fun="SoundEachCopy";
    //         g_data=JSON.stringify(g_soundList);
    //         Redirection(false);
	// 	},

	// 	onOpen : function(){
	// 		g_musicJBox.Hide();
	// 	}
	// }).open();

    
}
window["SoundEachCopy"]=SoundEachCopy;
function RefreshOpen()
{
    
    for(let fl of window["g_dirList"] as Array<{hidden:boolean,file:boolean,name:string,ext:string,open:boolean,index:number}>)
    {
        if(fl.index==null)  continue;
        if(fl.open==false)
        {
            CDOM.ID("fl"+fl.index).className="list-group-item list-group-item-action";
        }
        else
        {
            CDOM.ID("fl"+fl.index).className="list-group-item list-group-item-action list-group-item-secondary";
        }
    }
}
window["RefreshOpen"]=RefreshOpen;
function NextPhoto()
{
    for(let fl of window["g_dirList"] as Array<{hidden:boolean,file:boolean,name:string,ext:string,open:boolean,index:number}>)
    {
        if(fl.open==false)
        {
            CDOM.ID("fl"+fl.index).className="list-group-item list-group-item-action list-group-item-secondary";
            fl.open=true;
            if(fl.ext=="png" || fl.ext=="jpg" || fl.ext=="jpeg" || fl.ext=="bmp")
            {
                CDOM.ID("ImageModalSrc").hidden=false;
                (CDOM.ID("ImageModalSrc") as HTMLImageElement).src=window["g_down"]+window["g_path"]+fl.name;
                CDOM.ID("VideoModalSrc").hidden=true;
                CDOM.ID("FileModalSrc").hidden=true;
            }
            else if(fl.ext=="mp4" || fl.ext=="mov" || fl.ext=="avi")
            {
                CDOM.ID("ImageModalSrc").hidden=true;
                (CDOM.ID("VideoModalSrc") as HTMLVideoElement).src=window["g_down"]+window["g_path"]+fl.name;
                CDOM.ID("VideoModalSrc").hidden=false;
                CDOM.ID("FileModalSrc").hidden=true;
            }
            return;
        }
      
        
    }
    CAlert.Info("더 이상 없습니다.");
}
window["NextPhoto"]=NextPhoto;




let lan=CUtil.Language();
let buf=CFile.Load("../../README-"+lan+".md").then(async ()=>{
    if(buf==null || lan=="en")  lan="";
    else lan="-"+lan;
    CDOM.ID("main").innerHTML="";
    CDOM.ID("main").append(await CUtilWeb.MDReader("../../README"+lan+".md"));
});

// CDOM.ID("main").innerHTML="";
//     CDOM.ID("main").append(await CUtilWeb.MDReader("../../README.md"));















































































