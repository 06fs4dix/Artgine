import { CBlackBoard } from "../basic/CBlackBoard.js";
import { CLan } from "../basic/CLan.js";
import { CObject } from "../basic/CObject.js";
import { CPath } from "../basic/CPath.js";
export class CRes extends CObject {
    mResMap = new Map();
    HttpPathChange(_key) {
        let url = new URL(_key);
        url.host = location.host;
        let myProjName = "";
        let splitPathName = location.pathname.split("/");
        if (splitPathName.length > 1) {
            myProjName = splitPathName[1];
        }
        if (myProjName != "") {
            let resProjName = "";
            splitPathName = url.pathname.split("/");
            if (splitPathName.length > 1) {
                resProjName = url.pathname.split("/")[1];
            }
            if (resProjName != "") {
                url.pathname = "";
                for (let split of splitPathName) {
                    if (split == resProjName) {
                        split = myProjName;
                    }
                    if (split != "") {
                        url.pathname += split;
                        if (splitPathName[splitPathName.length - 1] != split) {
                            url.pathname += "/";
                        }
                    }
                }
            }
        }
        return url.toString();
    }
    Keys() {
        return this.mResMap.keys();
    }
    Values() {
        return this.mResMap.values();
    }
    Find(_key) {
        if (_key == null)
            return null;
        if (this.mResMap.has(_key)) {
            return this.mResMap.get(_key);
        }
        let key = _key;
        if (_key.startsWith("http") && (_key.indexOf(CPath.Join("root")) != -1 || _key.indexOf("localhost") != -1)) {
            key = this.HttpPathChange(_key);
            if (this.mResMap.has(key)) {
                this.mResMap.set(_key, this.mResMap.get(key));
            }
        }
        return this.mResMap.get(key);
    }
    Push(_key, _value) {
        this.mResMap.set(_key, _value);
        return this;
    }
    Remove(_key) {
        this.mResMap.delete(_key);
    }
    EditInit() {
        this["blackboard"] = CBlackBoard.Map();
        this["languge"] = CLan.Map();
        var div = super.EditInit();
        var input = document.createElement("input");
        input.type = "search";
        input.className = "form-control";
        input.id = "resSearch";
        input.placeholder = "Search";
        input.onkeyup = (e) => {
            var t = e.target;
            var val = t.value;
            var ch = div.getElementsByClassName("border p-1 mt-1");
            for (var each0 of ch) {
                if (each0.id == "mResMap_title" || each0.id == "blackboard_title")
                    continue;
                if (each0 == t)
                    continue;
                var hel = each0;
                if (each0.textContent.indexOf("mRes : map") != -1) { }
                else if (each0.textContent.toLowerCase().indexOf(val.toLowerCase()) != -1)
                    hel.style.display = "";
                else
                    hel.style.display = "none";
            }
        };
        div.prepend(input);
        return div;
    }
}
