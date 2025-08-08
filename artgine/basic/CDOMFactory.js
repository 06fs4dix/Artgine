import { CJSON } from "./CJSON.js";
import { CLan } from "./CLan.js";
function CLanChk(element) {
    let clanAttr = element.getAttribute("data-CLan");
    if (clanAttr != null) {
        if (clanAttr == "default")
            clanAttr = element.innerHTML;
        const data = CLan.Get(clanAttr);
        if (data != null) {
            if (element instanceof HTMLInputElement)
                element.placeholder = data;
            else
                element.innerHTML = data;
        }
        return;
    }
    clanAttr = element.getAttribute("data-" + CLan.GetCode());
    if (clanAttr != null) {
        element.innerHTML = clanAttr;
    }
}
export class CDomFactory {
    static DataToDom(_data) {
        if (_data == null)
            _data = document.createElement("div");
        if (typeof _data === "string")
            _data = CDomFactory.TagToDom(_data);
        else if (_data instanceof HTMLElement) {
        }
        else {
            _data = CDomFactory.JSONToDom(_data);
        }
        if (_data instanceof HTMLElement) {
            return _data;
        }
        if (_data instanceof DocumentFragment && _data.firstElementChild instanceof HTMLElement) {
            return _data.firstElementChild;
        }
        throw new Error("지원하지 않는 DOM 타입입니다.");
    }
    static TagToDom(html) {
        const str = html.trim();
        if (!str.includes("<") && /^[a-zA-Z][\w-]*$/.test(str)) {
            return document.createElement(str);
        }
        const template = document.createElement("template");
        template.innerHTML = str.includes("<") ? str : `<span>${str}</span>`;
        const children = template.content.childNodes;
        if (children.length === 1 && children[0] instanceof HTMLElement) {
            const element = children[0];
            CDomFactory.ProcessCLanInElement(element);
            return element;
        }
        const wrapper = document.createElement("div");
        wrapper.append(...children);
        CDomFactory.ProcessCLanInElement(wrapper);
        return wrapper;
    }
    static ProcessCLanInElement(element) {
        CLanChk(element);
        const children = element.children;
        for (let i = 0; i < children.length; i++) {
            CDomFactory.ProcessCLanInElement(children[i]);
        }
    }
    static JSONToDom(_json) {
        if (_json instanceof CJSON)
            _json = _json.GetDocument();
        var tag = _json["<>"];
        var html = _json["html"];
        var el = null;
        if (tag == null)
            tag = _json["tag"];
        if (tag != null)
            el = document.createElement(tag);
        if (_json instanceof Array) {
            el = document.createElement("div");
            for (var each1 of _json) {
                el.append(CDomFactory.JSONToDom(each1));
            }
            return el;
        }
        for (var each0 in _json) {
            if (each0 == "<>" || each0 == "html")
                continue;
            if (each0 == "text" || each0 == "content" || each0 == "innerText") {
                el.innerText = _json[each0];
            }
            else if (each0 == "innerHTML") {
                el.innerHTML = _json[each0];
            }
            else if (each0 == "class") {
                var ca = _json[each0].split(" ");
                for (var each2 of ca) {
                    if (each2 == "")
                        continue;
                    el.classList.add(each2);
                }
            }
            else if (each0 == "style") {
                el.style.cssText = _json[each0];
            }
            else if (each0 == "data-CLan") {
                el.setAttribute(each0, _json[each0]);
                CLanChk(el);
            }
            else if (each0.indexOf("data-") != -1) {
                el.setAttribute(each0, _json[each0]);
            }
            else if (each0 == "list") {
                el.setAttribute("list", _json[each0]);
            }
            else if (typeof el[each0] != "undefined") {
                el[each0] = _json[each0];
            }
            else {
                el.setAttribute(each0, _json[each0]);
            }
        }
        if (html instanceof Array) {
            for (var each1 of html) {
                el.append(CDomFactory.DataToDom(each1));
            }
        }
        else if (html instanceof HTMLElement) {
            el.append(html);
        }
        else if (typeof html == "string") {
            if (el == null)
                el = CDomFactory.TagToDom(html);
            else
                el.append(CDomFactory.TagToDom(html));
        }
        else if (html != null) {
            el.append(CDomFactory.JSONToDom(html));
        }
        return el;
    }
    static RefreshDataCLan() {
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
