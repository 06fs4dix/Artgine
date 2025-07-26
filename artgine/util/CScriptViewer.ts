import { CAlert } from "../basic/CAlert.js";
import { CClass } from "../basic/CClass.js";
import {CDomFactory} from "../basic/CDOMFactory.js";
import { CJSON } from "../basic/CJSON.js";
import { CObject } from "../basic/CObject.js";
import { CUtil } from "../basic/CUtil.js";
import { CFile } from "../system/CFile.js";



export default class CScriptViewer extends CObject
{
    vArray : Array<CObject>=null;
    vMap : Map<any,CObject>=null;

    static Init(_div : HTMLElement,_newClass : CObject,_data : Array<CObject>|Map<any,CObject>,_leftTextFun : Function,_keyNumber=false)
    {
        let left={"<>":"div","class":"col","html":[{"<>":"ul","html":[]}]};
        let right={"<>":"div","class":"col","id":"ViewerRight"};

        if(_data instanceof Array)
        {
            for(let i=0;i<_data.length;++i)
            {
                left.html[0].html.push({"<>":"li","class":"list-group-item","html":i+" : "+_leftTextFun(i,_data[i]),
                    "onclick":(e)=>{
                        
                            
                        let off=Number(e.target.title==""?e.target.parentElement.title:e.target.title);
                        CUtil.ID("ViewerRight").innerHTML="";
                        CUtil.ID("ViewerRight").append(_data[off].EditInit());
                    },"title":i,
                });
                
            }
        }
        else
        {
            
            for(let key of _data.keys())
            {
            
                left.html[0].html.push({"<>":"li","class":"list-group-item","html":key+" : "+_leftTextFun(key,_data.get(key)),
                    "onclick":(e)=>{
                        let title=e.target.title==""?e.target.parentElement.title:e.target.title;
                        let dk=_keyNumber?Number(title):title;
                        CUtil.ID("ViewerRight").innerHTML="";
                        CUtil.ID("ViewerRight").append(_data.get(dk).EditInit());
                    },"title":key,
                });
                
            }
        }
       
        let up={"<>":"div","html":[
            {"<>":"input","type":"text","class":"","id":"viewer_txt","style":"width:320px;margin-right:8px;","onkeyup":(e)=>{
                var t=e.target as HTMLInputElement;
                var val=t.value;
                var ch=_div.getElementsByClassName("list-group-item");
                for(var each0 of ch)
                {
                    

                    var hel=each0 as HTMLElement;
                    
                    if(each0.textContent.indexOf(val)!=-1)
                        hel.style.display="";
                    else
                        hel.style.display="none";
                    
                }
            }},
            {"<>":"button","type":"button","class":"btn btn-primary","text":"Add","onclick":()=>{
                if(_data instanceof Array)
                {
                    _data.push(_newClass.Export());
                    CScriptViewer.Init(_div,_newClass,_data,_leftTextFun,_keyNumber);
                }
                else
                {
                    let key=_keyNumber?Number(CUtil.IDValue("viewer_txt")):CUtil.IDValue("viewer_txt");
                    if(_data.get(key)!=null)
                    {
                        CAlert.E("이미 키가 존재 합니다.");
                        return;
                    }
                    _data.set(key,_newClass.Export());
                    CScriptViewer.Init(_div,_newClass,_data,_leftTextFun,_keyNumber);
                }
                
            }},
            {"<>":"button","type":"button","class":"btn btn-danger","text":"Delete","onclick":()=>{
                if(_data instanceof Array)
                {
                    let key=Number(CUtil.IDValue("viewer_txt"));
                    _data.splice(key,1);
                    CScriptViewer.Init(_div,_newClass,_data,_leftTextFun,_keyNumber);
                }
                else
                {
                    let key=_keyNumber?Number(CUtil.IDValue("viewer_txt")):CUtil.IDValue("viewer_txt");
                    if(_data.get(key)!=null)
                    {
                        _data.delete(key);
                        CScriptViewer.Init(_div,_newClass,_data,_leftTextFun,_keyNumber);    
                    }
                    //_data.set(key,_newClass.CopyExport());
                    
                }
            }},
            {"<>":"button","type":"button","class":"btn btn-success","text":"Save","onclick":()=>{
                if(_data instanceof Array)
                {
                    let dummy=new CScriptViewer();
                    dummy.vArray=_data;
                    CFile.Save(dummy.ToStr());
                    //ToolInterFace.JSONSave(dummy);
                }
                else
                {
                    
                    let dummy=new CScriptViewer();
                    dummy.vMap=_data;
                    CFile.Save(dummy.ToStr());
                    //ToolInterFace.JSONSave(dummy);
                }
            }},
            {"<>":"button","type":"button","class":"btn btn-secondary","text":"Load","onclick":()=>{
                CClass.Push(_newClass.constructor.name,_newClass.constructor);
                //ClassFinder.Set(_newClass.constructor.name,_newClass.constructor);
                if(_data instanceof Array)
                {
                    let dummy=new CScriptViewer();
                    _data.length=0;
                    dummy.vArray=_data;
                    CFile.Load().then((_buf : ArrayBuffer)=>{
                        dummy.ImportCJSON(new CJSON(_buf));
                        CScriptViewer.Init(_div,_newClass,_data,_leftTextFun,_keyNumber);    
                    });
                    // ToolInterFace.JSONLoad(dummy).then(()=>{
                        
                    // });
                }
                else
                {
                    
                    let dummy=new CScriptViewer();
                    _data.clear();
                    dummy.vMap=_data;

                    CFile.Load().then((_buf : ArrayBuffer)=>{
                        dummy.ImportCJSON(new CJSON(_buf));
                        CScriptViewer.Init(_div,_newClass,_data,_leftTextFun,_keyNumber);    
                    });

                    // ToolInterFace.JSONLoad(dummy).then(()=>{
                    //     //(_data as Map<any,CObject>).clear();
                    //     // for(let key of dummy.vMap.keys())
                    //     // {
                    //     //     (_data as Map<any,CObject>).set(key,dummy.vMap.get(key));
                    //     // }
                        
                    //     CScriptViewer.Init(_div,_newClass,_data,_leftTextFun,_keyNumber);    
                    // });
                }
            }},
            {"<>":"button","type":"button","class":"btn btn-dark","text":"Refresh","onclick":()=>{
                CScriptViewer.Init(_div,_newClass,_data,_leftTextFun,_keyNumber);    
            }},
        ]};
        _div.innerHTML="";
        _div.append(CDomFactory.DataToDom({"<>":"div","html":[
                up,{"<>":"div","class":"row","style":"margin-left:-50px;","html":[left,right]}
            ]}
        ));
        
    }

}
