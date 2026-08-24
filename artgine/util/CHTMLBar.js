import { Bootstrap } from "../basic/Bootstrap.js";
import { CConsol } from "../basic/CConsol.js";
import { CDOM } from "../basic/CDOM.js";
import { CEvent } from "../basic/CEvent.js";
import { CConfirm } from "../basic/CModal.js";
import { CObject } from "../basic/CObject.js";
import { CTree } from "../basic/CTree.js";
import { CUniqueID } from "../basic/CUniqueID.js";
export class CHTMLBarItem extends CObject {
    m_parent;
    m_title;
    m_hidden = false;
    constructor(_title, _parent, _key) {
        super();
        this.m_parent = _parent;
        this.m_title = _title;
        this.SetKey(_key || CUniqueID.Get());
    }
    IsLeaf() {
        return false;
    }
    Icon() {
        return "bi-bookmark-plus-fill";
    }
}
export class CHTMLBarTrunk extends CHTMLBarItem {
    constructor(_content, _parent = "", _key) {
        super(_content, _parent, _key);
    }
    CreateLeaf(_content, _target, _prefab) {
        return _prefab
            ? new CHTMLBarLeaf(_content, this.Key(), _target, _prefab)
            : new CHTMLBarLeaf(_content, this.Key(), _target);
    }
    CreateTrunk(_content) {
        return new CHTMLBarTrunk(_content, this.Key());
    }
    IsLeaf() {
        return false;
    }
    Icon() {
        return "";
    }
}
export class CHTMLBarLeaf extends CHTMLBarItem {
    m_target;
    m_isPrefab;
    constructor(_content, _parent, _target, _prefab = false) {
        super(_content, _parent);
        this.m_target = _target;
        this.m_isPrefab = _prefab;
    }
    IsLeaf() {
        return true;
    }
    Icon() {
        return (this.m_target instanceof Function) ? "bi-bookmark" :
            (this.m_isPrefab) ? "bi-bookmark-check-fill" :
                "bi-bookmark-plus-fill";
    }
}
export class CHTMLBarTree extends CObject {
    m_root = new CTree();
    CreateTrunk(_content, _key, _parent) {
        const parent = _parent || "";
        this.Push(new CHTMLBarTrunk(_content, parent, _key));
    }
    CreateLeaf(_content, _parent, _target, _prefab = false) {
        const isFunction = _target instanceof Function;
        this.Push(new CHTMLBarLeaf(_content, _parent, _target, !isFunction && _prefab));
    }
    ImportCJSON(_json) {
        let items = [];
        let nodes = [this.m_root];
        while (nodes.length > 0) {
            let node = nodes.shift();
            if (node.mChild)
                nodes.push(node.mChild);
            if (node.mColleague)
                nodes.push(node.mColleague);
            if (node.mData)
                items.push(node.mData);
        }
        super.ImportCJSON(_json);
        nodes = [this.m_root];
        while (nodes.length > 0) {
            let node = nodes.shift();
            if (node.mChild)
                nodes.push(node.mChild);
            if (node.mColleague)
                nodes.push(node.mColleague);
            if (node.mData && items.findIndex(n => n.Key() == node.mData.Key())) {
                items.push(node.mData);
            }
        }
        this.m_root = new CTree();
        items.forEach(item => this.Push(item));
        this.Refresh();
        return this;
    }
    ExportCJSON() {
        let items = [];
        let funcItems = [];
        let nodes = [this.m_root];
        while (nodes.length) {
            let node = nodes.shift();
            if (node.mColleague)
                nodes.push(node.mColleague);
            if (node.mChild)
                nodes.push(node.mChild);
            if (node.mData)
                items.push(node.mData);
        }
        funcItems.forEach(leaf => leaf.Destroy());
        let json = super.ExportCJSON();
        this.m_root = new CTree();
        items.forEach(item => this.Push(item));
        this.Refresh();
        return json;
    }
    Push(_item) {
        if (this.m_root.Find(_item.Key()) != null) {
            CConsol.Log("동일한 키의 노드가 이미 등록되어 있습니다.");
            return;
        }
        let p = (_item.m_parent === ""
            ? this.m_root
            : this.m_root.Find(_item.m_parent) || this.m_root).PushChild(_item.Key());
        p.mData = _item;
        if (CDOM.ID(this.RootID())?.innerHTML)
            this.Refresh();
    }
    Hide(_item) {
        const item = (_item instanceof CHTMLBarItem) ? _item : this.m_root.Find(_item).mData;
        item.m_hidden = true;
        this.Refresh();
    }
    Expose(_item) {
        const item = (_item instanceof CHTMLBarItem) ? _item : this.m_root.Find(_item).mData;
        item.m_hidden = false;
        this.Refresh();
    }
    Find(_key) {
        return this.m_root.Find(_key);
    }
    MakeID(_key, _type) {
        _key.split("_").join("^UNDERBAR^");
        return _key + "_" + _type;
    }
    MakeKey(_id) {
        return _id.split("_")[0].split("^UNDERBAR^").join("_");
    }
    Activate(e) {
        let obj = e.target.id ? e.target : e.target.parentElement;
        let node = this.m_root.Find(this.MakeKey(obj.id));
        if (node.mData instanceof CHTMLBarLeaf) {
            if (node.mData.m_target instanceof Function) {
                node.mData.m_target();
            }
        }
    }
    AskDelete(_node) {
        let confirm = new CConfirm();
        confirm.SetBody("삭제하시겠습니까?");
        confirm.SetConfirm(CConfirm.eConfirm.YesNo, [
            () => {
                _node.Destroy();
                this.Refresh();
            },
        ]);
        confirm.Open();
    }
    RootID() {
        return "barRoot";
    }
    GetNavbarTitle() {
        return "Navbar";
    }
    NavbarTitleEvent(e) { }
    Refresh() {
        const navArr = [];
        let root = this.m_root.mChild;
        const createNavItem = (root) => ({
            "<>": "li", "class": "nav-item", "hidden": root.mData.m_hidden ? " " : null, "html": [
                {
                    "<>": "a", "class": "nav-link", "id": this.MakeID(root.mData.Key(), "barNav"),
                    "onclick": (e) => this.Activate(e), "style": "cursor:pointer;", "html": [
                        { "<>": "i", "class": "bi " + root.mData.Icon() },
                        { "<>": "text", "text": root.mData.m_title },
                        { "<>": "i", "class": "bi bi-x float-right", "style": "cursor:pointer;", "onclick": (e) => {
                                e.stopPropagation();
                                this.AskDelete(root);
                            } }
                    ]
                }
            ]
        });
        const createDropdown = (root) => ({
            "<>": "li", "class": "nav-item dropdown", "hidden": root.mData.m_hidden ? " " : null, "html": [
                {
                    "<>": "a", "class": "nav-link dropdown-toggle", "id": this.MakeID(root.mData.Key(), "barNav"),
                    "text": root.mData.m_title, "href": "#", "role": "button", "data-bs-toggle": "dropdown",
                    "aria-expanded": "false"
                },
                {
                    "<>": "div", "class": "dropdown-menu", "aria-labelledby": root.mData.Key() + "_htmlBarRootNav",
                    "html": this.RefreshTrunk(root.mChild)
                }
            ]
        });
        while (root != null) {
            navArr.push(root.mData.IsLeaf() ? createNavItem(root) : createDropdown(root));
            root = root.mColleague;
        }
        const main = this.CreateNavbar(navArr);
        const rootElement = CDOM.ID(this.RootID());
        if (!rootElement) {
            document.body.append(CDOM.DataToDom({ "<>": "div", "id": this.RootID(), "html": [main] }));
        }
        else {
            rootElement.innerHTML = "";
            rootElement.append(CDOM.DataToDom(main));
        }
    }
    NavbarContents() {
        return [];
    }
    CreateNavbar(_navItems) {
        return {
            "<>": "nav", "class": "navbar navbar-expand-lg navbar-light bg-light", "html": [
                { "<>": "a", "class": "navbar-brand", "href": "#", "text": this.GetNavbarTitle(), "onclick": e => this.NavbarTitleEvent(e) },
                { "<>": "button", "class": "navbar-toggler", "type": "button", "data-bs-toggle": "collapse",
                    "data-bs-target": "#htmlbar_navbar", "aria-label": "Toggle navigation", "html": "<span class='navbar-toggler-icon'></span>" },
                { "<>": "div", "class": "collapse navbar-collapse", "id": "htmlbar_navbar", "html": [
                        { "<>": "ul", "class": "navbar-nav me-auto", "html": _navItems },
                        { "<>": "ul", "class": "navbar-nav ms-auto", "html": [
                                ...this.NavbarContents(),
                                { "<>": "li", "class": "nav-item dropdown",
                                    "html": [{ "<>": "i", "class": "nav-link bi bi-x-square", "href": "#", "style": "cursor:pointer;",
                                            "onclick": () => { CDOM.ID(this.RootID()).innerHTML = ""; }
                                        }]
                                }
                            ] }
                    ] }
            ]
        };
    }
    RefreshTrunk(_tree) {
        const createItem = (data, isLeaf, key) => {
            const commonAttrs = {
                "class": isLeaf ? "dropdown-item" : "dropdown dropend",
                "hidden": data.m_hidden ? " " : null
            };
            const itemHTML = isLeaf ? [
                { "<>": "i", "class": "bi" + data.Icon() },
                { "<>": "text", "text": data.m_title },
                {
                    "<>": "i",
                    "class": "bi bi-x float-right",
                    "style": "cursor:pointer;",
                    "onclick": (e) => { e.stopPropagation(); this.AskDelete(_tree); }
                }
            ] : [
                {
                    "<>": "a",
                    "class": "nav-link dropdown-toggle",
                    "href": "#",
                    "id": this.MakeID(key, "barDropdown"),
                    "text": data.m_title,
                    "role": "button",
                    "data-bs-toggle": "dropdown",
                    "aria-expanded": "false"
                },
                {
                    "<>": "ul",
                    "class": "dropdown-menu",
                    "aria-labelledby": this.MakeID(key, "barDropdown"),
                    "id": this.MakeID(key, "barDropdownMenu"),
                    "html": this.RefreshTrunk(_tree.mChild),
                    "style": "margin-left:0px;padding-left:0px;"
                }
            ];
            return {
                "<>": "li",
                ...commonAttrs,
                "html": [
                    {
                        "<>": "a",
                        "class": "nav-link dropend",
                        "id": `${data.Key()}_htmlBarRootNav`,
                        "onclick": (e) => { if (isLeaf)
                            this.Activate(e); },
                        "style": "pointer:cursor;",
                        "html": itemHTML
                    }
                ],
                "onmouseover": (e) => {
                    let menu = CDOM.ID(this.MakeID(key, "barDropdownMenu"));
                    if (menu && window["bootstrap"]) {
                        window["bootstrap"].Dropdown.getOrCreateInstance(menu).show();
                    }
                },
                "onmouseout": (e) => {
                    let menu = CDOM.ID(this.MakeID(key, "barDropdownMenu"));
                    if (menu && window["bootstrap"]) {
                        window["bootstrap"].Dropdown.getOrCreateInstance(menu).hide();
                    }
                }
            };
        };
        let DropdownArr = [];
        while (_tree != null) {
            const isLeaf = _tree.mData.IsLeaf();
            DropdownArr.push(createItem(_tree.mData, isLeaf, _tree.mData.Key()));
            _tree = _tree.mColleague;
        }
        return DropdownArr;
    }
}
export class CHTMLDropdown {
    mParentID;
    mID;
    mText;
    mThema;
    mEvent;
    constructor(_parentID, _id, _text = _id, _thema = Bootstrap.eColor.success, _event = null) {
        this.mParentID = _parentID ?? "";
        this.mID = _id ?? "";
        this.mText = _text ?? "";
        this.mEvent = CEvent.ToCEvent(_event);
        this.mThema = _thema ?? Bootstrap.eColor.success;
    }
    static DirClass(_dir) {
        if (_dir === "left")
            return "dropstart";
        if (_dir === "right")
            return "dropend";
        return "dropup";
    }
    static BtnClass(_theme, _extra = "") {
        if (_theme === Bootstrap.eColor.transparent) {
            return `btn btn-link ${_extra}`.trim();
        }
        return `btn btn-${_theme} ${_extra}`.trim();
    }
    static Attach(_barArr, _dir) {
        const MIN_W = 80;
        const MAX_W = 80;
        const src = _barArr ?? [];
        const dirClass = CHTMLDropdown.DirClass(_dir);
        const nodeIdSet = new Set();
        const parentIdSet = new Set();
        for (const b of src) {
            if (b.mID)
                nodeIdSet.add(b.mID);
            if (b.mParentID && b.mParentID !== "root")
                parentIdSet.add(b.mParentID);
        }
        const arr = src.slice();
        for (const pid of parentIdSet) {
            if (!nodeIdSet.has(pid)) {
                const emptyEvent = new CEvent();
                arr.push(new CHTMLDropdown("root", pid, pid, Bootstrap.eColor.success, emptyEvent));
                nodeIdSet.add(pid);
            }
        }
        const nodesByParent = new Map();
        for (const b of arr) {
            const p = b.mParentID ?? "";
            if (!nodesByParent.has(p))
                nodesByParent.set(p, []);
            nodesByParent.get(p).push(b);
        }
        const hasChildren = (id) => nodesByParent.has(id) && (nodesByParent.get(id).length > 0);
        const wrapper = document.createElement("div");
        wrapper.className = "d-flex flex-column";
        wrapper.style.pointerEvents = "auto";
        const applyMinMax = (el) => {
            el.style.minWidth = `${MIN_W}px`;
            el.style.maxWidth = `${MAX_W}px`;
        };
        const safeCall = (ev) => {
            if (ev && typeof ev.Call === "function")
                ev.Call();
        };
        const buildMenu = (parentID) => {
            const menu = document.createElement("ul");
            menu.className = "dropdown-menu";
            menu.setAttribute("role", "menu");
            const children = nodesByParent.get(parentID) ?? [];
            for (const bar of children) {
                const li = document.createElement("li");
                const childExist = hasChildren(bar.mID);
                if (!childExist) {
                    const a = document.createElement("a");
                    a.className = "dropdown-item";
                    a.href = "#";
                    if (bar.mID)
                        a.id = bar.mID;
                    a.innerHTML = bar.mText;
                    a.addEventListener("click", (e) => {
                        e.preventDefault();
                        document.querySelectorAll('[data-bs-toggle="dropdown"]').forEach(toggle => {
                            window["bootstrap"]?.Dropdown.getInstance(toggle)?.hide();
                        });
                        safeCall(bar.mEvent);
                    });
                    li.appendChild(a);
                }
                else {
                    li.className = dirClass;
                    const a = document.createElement("a");
                    a.className = "dropdown-item dropdown-toggle";
                    a.href = "#";
                    a.setAttribute("data-bs-toggle", "dropdown");
                    a.setAttribute("aria-expanded", "false");
                    if (bar.mID)
                        a.id = bar.mID;
                    a.textContent = bar.mText;
                    li.appendChild(a);
                    li.appendChild(buildMenu(bar.mID));
                }
                menu.appendChild(li);
            }
            return menu;
        };
        const topBars = nodesByParent.get("root") ?? [];
        for (const bar of topBars) {
            const childExist = hasChildren(bar.mID);
            if (!childExist) {
                const btn = document.createElement("button");
                btn.type = "button";
                btn.className = `${CHTMLDropdown.BtnClass(bar.mThema)} p-1`;
                if (bar.mID)
                    btn.id = bar.mID;
                btn.textContent = bar.mText;
                btn.addEventListener("click", (e) => {
                    e.preventDefault();
                    safeCall(bar.mEvent);
                });
                applyMinMax(btn);
                wrapper.appendChild(btn);
            }
            else {
                const dd = document.createElement("div");
                dd.className = `dropdown ${dirClass}`;
                const btn = document.createElement("button");
                btn.type = "button";
                btn.className = `${CHTMLDropdown.BtnClass(bar.mThema)} dropdown-toggle p-1`;
                btn.setAttribute("data-bs-toggle", "dropdown");
                btn.setAttribute("aria-expanded", "false");
                if (bar.mID)
                    btn.id = bar.mID;
                btn.textContent = bar.mText;
                applyMinMax(btn);
                dd.appendChild(btn);
                dd.appendChild(buildMenu(bar.mID));
                wrapper.appendChild(dd);
            }
        }
        return wrapper;
    }
}
