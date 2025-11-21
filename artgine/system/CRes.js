import { CBlackBoard } from "../basic/CBlackBoard.js";
import { CLan } from "../basic/CLan.js";
import { CObject } from "../basic/CObject.js";
import { CPath } from "../basic/CPath.js";
import { CTree } from "../basic/CTree.js";
import { CMesh } from "../render/CMesh.js";
import { CTexture } from "../render/CTexture.js";
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
        const div = super.EditInit();
        const input = document.createElement("input");
        input.type = "search";
        input.className = "form-control";
        input.id = "resSearch";
        input.placeholder = "Search";
        input.onkeyup = (e) => {
            const t = e.target;
            const val = t.value;
            let ch = div.getElementsByClassName("border p-1 mt-1");
            let resMapKey = "";
            let bbMapKey = "";
            for (const each0 of ch) {
                if (each0.id === "mResMap_title") {
                    resMapKey = each0.getAttribute("data-bs-target").substring(1, 99);
                    continue;
                }
                if (each0.id === "blackboard_title") {
                    bbMapKey = each0.getAttribute("data-bs-target").substring(1, 99);
                    ;
                    continue;
                }
                if (each0 === t)
                    continue;
                const hel = each0;
                if (each0.textContent?.toLowerCase().indexOf(val.toLowerCase()) !== -1)
                    hel.style.display = "";
                else
                    hel.style.display = "none";
            }
            if (val == "") {
                CDOM.ID(resMapKey).className = "border border-top-0 ps-2 collapse";
                CDOM.ID(bbMapKey).className = "border border-top-0 ps-2 collapse";
                return;
            }
            CDOM.ID(resMapKey).className = "border border-top-0 ps-2 collapse show";
            CDOM.ID(bbMapKey).className = "border border-top-0 ps-2 collapse show";
            ch = div.getElementsByClassName("border border-top-0 ps-2 collapse show");
            for (const each0 of ch) {
                if (each0.id != resMapKey && each0.id != bbMapKey)
                    each0.className = "border border-top-0 ps-2 collapse";
            }
        };
        div.prepend(input);
        if (!(gTree instanceof CTree))
            gTree = new CTree();
        const findChild = (parent, key) => {
            let n = parent.mChild;
            while (n) {
                if (n.mKey === key)
                    return n;
                n = n.mColleague;
            }
            return null;
        };
        const getOrMakeChild = (parent, key) => {
            const found = findChild(parent, key);
            if (found)
                return found;
            if (!parent.mChild)
                return parent.PushChild(key);
            let tail = parent.mChild;
            while (tail.mColleague)
                tail = tail.mColleague;
            return tail.PushColleague(key);
        };
        for (const [key, value] of this.mResMap) {
            const parts = String(key).split("/").filter(Boolean);
            if (parts.length === 0)
                continue;
            const fileName = parts.pop();
            let cur = gTree;
            for (const seg of parts)
                cur = getOrMakeChild(cur, seg);
            const existed = findChild(cur, fileName);
            if (existed) {
                if (existed.mData == null)
                    existed.mData = value;
            }
            else {
                const leaf = getOrMakeChild(cur, fileName);
                if (leaf.mData == null)
                    leaf.mData = value;
            }
        }
        for (const [key, value] of CBlackBoard.Map()) {
            if (!value)
                continue;
            const parts = String(key).split("/").filter(Boolean);
            if (parts.length === 0)
                continue;
            const fileName = parts.pop();
            let cur = gTree;
            for (const seg of parts)
                cur = getOrMakeChild(cur, seg);
            const existed = findChild(cur, fileName);
            if (existed) {
                if (existed.mData == null)
                    existed.mData = value;
            }
            else {
                const leaf = getOrMakeChild(cur, fileName);
                if (leaf.mData == null)
                    leaf.mData = value;
            }
        }
        const viewer = document.createElement("div");
        viewer.className = "mt-3";
        div.appendChild(viewer);
        const childrenOf = (node) => {
            const arr = [];
            let ch = node.mChild;
            while (ch) {
                arr.push(ch);
                ch = ch.mColleague;
            }
            return arr;
        };
        const pathOf = (node) => {
            const segs = [];
            let p = node;
            while (p && p.mParent) {
                if (p.mKey)
                    segs.push(p.mKey);
                p = p.mParent;
            }
            return segs.reverse().join("/") || "(root)";
        };
        let curNode = gCurNode ?? gTree;
        const render = () => {
            viewer.innerHTML = "";
            const pathBar = document.createElement("div");
            pathBar.className = "mb-2";
            const rootBtn = document.createElement("button");
            rootBtn.type = "button";
            rootBtn.className = "btn btn-sm btn-outline-warning me-1";
            rootBtn.textContent = "/";
            rootBtn.onclick = () => {
                curNode = gTree;
                gCurNode = curNode;
                render();
            };
            pathBar.appendChild(rootBtn);
            const trail = [];
            {
                let p = curNode;
                while (p) {
                    trail.push(p);
                    p = p.mParent;
                }
                trail.reverse();
            }
            for (let i = 1; i < trail.length; i++) {
                const node = trail[i];
                const b = document.createElement("button");
                b.type = "button";
                b.className = "btn btn-sm btn-outline-danger me-1";
                b.textContent = node.mKey;
                b.onclick = () => {
                    curNode = node;
                    gCurNode = curNode;
                    render();
                };
                pathBar.appendChild(b);
            }
            viewer.appendChild(pathBar);
            const list = document.createElement("div");
            list.className = "d-flex flex-wrap gap-2";
            const children = childrenOf(curNode);
            children.sort((a, b) => {
                const aIsFolder = a.mData == null;
                const bIsFolder = b.mData == null;
                if (aIsFolder !== bIsFolder)
                    return aIsFolder ? -1 : 1;
                return a.mKey.localeCompare(b.mKey);
            });
            for (const n of children) {
                const isFolder = n.mData == null;
                const btn = document.createElement("button");
                btn.type = "button";
                const i = document.createElement("i");
                i.setAttribute("aria-hidden", "true");
                i.classList.add("me-1");
                if (isFolder) {
                    i.className = "bi bi-folder me-1";
                    btn.className = "btn btn-sm btn-warning border";
                }
                else {
                    btn.setAttribute("draggable", "true");
                    btn.addEventListener("dragstart", (ev) => {
                        ev.stopPropagation();
                        ev.dataTransfer?.setData("hash", n.mData.Key());
                        CObject.SetDrag("CObject", n.mData);
                    });
                    i.className = (typeof n.mData?.Icon === "function")
                        ? n.mData.Icon()
                        : "bi bi-file-earmark";
                    if (n.mData instanceof CTexture || n.mData instanceof CMesh)
                        btn.className = "btn btn-sm btn-light border";
                    else if (n.mData instanceof CObject && n.mData.IsBlackBoard())
                        btn.className = "btn btn-sm btn-outline-primary border";
                    else
                        btn.className = "btn btn-sm btn-secondary border";
                }
                const nameSpan = document.createElement("span");
                nameSpan.textContent = ` ${n.mKey}`;
                btn.append(i, nameSpan);
                if (isFolder) {
                    btn.title = "Open folder";
                    btn.onclick = () => {
                        curNode = n;
                        gCurNode = curNode;
                        render();
                    };
                }
                else {
                    btn.title = pathOf(n);
                    btn.onclick = () => {
                        if (n.mData.Key == null)
                            return;
                        input.value = n.mData.Key();
                        input.dispatchEvent(new Event('keyup', { bubbles: true }));
                    };
                }
                list.appendChild(btn);
            }
            viewer.appendChild(list);
        };
        gCurNode = curNode;
        render();
        return div;
    }
}
let gTree = null;
let gCurNode = null;
