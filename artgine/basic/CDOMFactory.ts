import {CJSON} from "./CJSON.js";
import {CLan} from "./CLan.js";


function CLanChk(element)
{
    let clanAttr = element.getAttribute("data-CLan");
    if (clanAttr!=null) 
    {
        if(clanAttr=="default")    clanAttr=element.innerHTML;
        
        const data = CLan.Get(clanAttr);
        if(data!=null)
        {
            if(element instanceof HTMLInputElement)
                element.placeholder=data;
            else
                element.innerHTML = data;
        }
            
        return;
    }
    clanAttr = element.getAttribute("data-"+CLan.GetCode());
    if (clanAttr!=null) 
    {
        element.innerHTML = clanAttr;
    }

}

export class CDomFactory
{
    static DataToDom(_data: HTMLElement | string | object | CJSON): HTMLElement {
        if (_data == null)
            _data = document.createElement("div");

        if (typeof _data === "string")
            _data = CDomFactory.TagToDom(_data);
        else if (_data instanceof HTMLElement) {
            // 그대로 사용
        } else {
            _data = CDomFactory.JSONToDom(_data);
        }

        // 안전하게 HTMLElement로 보장
        if (_data instanceof HTMLElement) {
            
            return _data;
        }
        if (_data instanceof DocumentFragment && _data.firstElementChild instanceof HTMLElement) {
            return _data.firstElementChild;
        }

        throw new Error("지원하지 않는 DOM 타입입니다.");
    }
    
    static TagToDom<K extends keyof HTMLElementTagNameMap | string>(html: K): K extends keyof HTMLElementTagNameMap
        ? HTMLElementTagNameMap[K]
        : HTMLElement 
    {
        
        const str = html.trim();

        // 태그가 없고 태그명으로 추정되면: createElement
        if (!str.includes("<") && /^[a-zA-Z][\w-]*$/.test(str)) {
            return document.createElement(str) as any;
        }

        // 일반 HTML 문자열 처리
        const template = document.createElement("template");
        template.innerHTML = str.includes("<") ? str : `<span>${str}</span>`;

        const children = template.content.childNodes;

        if (children.length === 1 && children[0] instanceof HTMLElement) {
            const element = children[0] as HTMLElement;
            // CLan 치환 처리
            CDomFactory.ProcessCLanInElement(element);
            return element as any;
        }

        const wrapper = document.createElement("div");
        wrapper.append(...children);
        
        // CLan 치환 처리
        CDomFactory.ProcessCLanInElement(wrapper);
        
        return wrapper as any;
    }

    // CLan 치환을 위한 헬퍼 함수
    private static ProcessCLanInElement(element: HTMLElement) {
        CLanChk(element);
        // let clanAttr = element.getAttribute("data-CLan");
        // if (clanAttr) {
        //     if(clanAttr=="default")    clanAttr=element.innerHTML;
            
        //     const data = CLan.Get(clanAttr);
        //     if(data!=null)
        //         element.innerHTML = data;
            
        // }

        // 자식 요소들도 재귀적으로 처리
        const children = element.children;
        for (let i = 0; i < children.length; i++) {
            CDomFactory.ProcessCLanInElement(children[i] as HTMLElement);
        }
    }

    
    
  
    static JSONToDom(_json : object|CJSON) : HTMLElement
    {
        if(_json instanceof CJSON)
            _json=_json.GetDocument();
        
        
        var tag=_json["<>"];
        var html=_json["html"];
        var el : HTMLElement=null;
        

        if(html==null)  html=_json["children"];
        if(tag==null)   tag=_json["tag"];
        if(tag!=null)
            el=document.createElement(tag) as HTMLElement;
        if(_json instanceof Array)
        {
            el=document.createElement("div") as HTMLElement;
            for(var each1 of _json)
            {
                el.append(CDomFactory.JSONToDom(each1));
            }
            return el;
        }
        
        for(var each0 in _json)
        {
            if(each0=="<>" || each0=="html")
                continue;
            
            if(each0=="text" || each0=="content" || each0=="innerText")
            {
                el.innerText=_json[each0];
            }
            else if(each0=="innerHTML")
            {
                el.innerHTML=_json[each0];
            }
            else if(each0=="class")
            {
                var ca=_json[each0].split(" ");
                for(var each2 of ca)
                {
                    if(each2=="")
                        continue;
                    el.classList.add(each2);	
                }
                
            }
            else if(each0=="style")
            {
                el.style.cssText=_json[each0];
                
            }
            else if(each0=="data-CLan")
            {
                el.setAttribute(each0, _json[each0]);

                CLanChk(el);

                // var lg=el.getAttribute("data-CLan");
                // if(lg=="default")    lg=el.innerHTML;
                // var data=CLan.Get(lg);
                
        
                // if(data!=null)
                // {
                 
                //     if(el instanceof HTMLInputElement)
                //         el.placeholder=data;
                //     else
                //         el.innerHTML=data;
                // }

            }
            else if(each0.indexOf("data-")!=-1)
            {
                el.setAttribute(each0, _json[each0]);
            }
            else if(each0=="list")
            {
                el.setAttribute("list", _json[each0]);
            }
            else if (typeof el[each0] != "undefined") 
            {
                el[each0] = _json[each0];
            }
            else
            {
                el.setAttribute(each0, _json[each0]);
            }
            
            /*else if(typeof el.style[each0] != "undefined")
            {
                el.style[each0]=_json[each0];
            }*/
        }
        if(html instanceof Array)
        {
            for(var each1 of html)
            {
                el.append(CDomFactory.DataToDom(each1));
                // if(each1 instanceof HTMLElement)
                //     el.append(each1);
                // else
                //     el.append(CDomFactory.JSONToDom(each1));
            }
        }
        else if(html instanceof HTMLElement)
        {
            el.append(html);
        }
        else if(typeof html=="string")
        {
            if(el==null)
                el=CDomFactory.TagToDom(html) as any;
            else
                el.append(CDomFactory.TagToDom(html));
        }
        else if(html!=null)
        {
            el.append(CDomFactory.JSONToDom(html));
        }
        
        
        
        return el;
        //return json2html.render(obj,template,options);
    }
    static RefreshDataCLan() 
    {
        var inputList = document.querySelectorAll("[data-CLan]");
        for (var each0 of inputList) {
            var lg = each0.getAttribute("data-CLan");
            var data = CLan.Get(lg);
            if (typeof data == "object") {
                each0.append(CDomFactory.DataToDom(data));
            }
            else if (each0['placeholder'] != null)
                each0['placeholder'] = data;
            else
                each0.innerHTML = data;
        }
    }
    
}
