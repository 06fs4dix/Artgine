import { CConsol } from "../basic/CConsol.js";
import { CDomFactory } from "../basic/CDOMFactory.js";
import { CConfirm } from "../basic/CModal.js";
import { CObject } from "../basic/CObject.js";
import { CTree } from "../basic/CTree.js";
import { CUniqueID } from "../basic/CUniqueID.js";
import { CUtil } from "../basic/CUtil.js";
export class CHtmlBarItem extends CObject {
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
export class CHtmlBarTrunk extends CHtmlBarItem {
    constructor(_content, _parent = "", _key) {
        super(_content, _parent, _key);
    }
    CreateLeaf(_content, _target, _prefab) {
        return _prefab
            ? new CHtmlBarLeaf(_content, this.Key(), _target, _prefab)
            : new CHtmlBarLeaf(_content, this.Key(), _target);
    }
    CreateTrunk(_content) {
        return new CHtmlBarTrunk(_content, this.Key());
    }
    IsLeaf() {
        return false;
    }
    Icon() {
        return "";
    }
}
export class CHtmlBarLeaf extends CHtmlBarItem {
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
export class CHtmlBarTree extends CObject {
    m_root = new CTree();
    CreateTrunk(_content, _key, _parent) {
        const parent = _parent || "";
        this.Push(new CHtmlBarTrunk(_content, parent, _key));
    }
    CreateLeaf(_content, _parent, _target, _prefab = false) {
        const isFunction = _target instanceof Function;
        this.Push(new CHtmlBarLeaf(_content, _parent, _target, !isFunction && _prefab));
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
        if (CUtil.ID(this.RootID())?.innerHTML)
            this.Refresh();
    }
    Hide(_item) {
        const item = (_item instanceof CHtmlBarItem) ? _item : this.m_root.Find(_item).mData;
        item.m_hidden = true;
        this.Refresh();
    }
    Expose(_item) {
        const item = (_item instanceof CHtmlBarItem) ? _item : this.m_root.Find(_item).mData;
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
        if (node.mData instanceof CHtmlBarLeaf) {
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
        const rootElement = CUtil.ID(this.RootID());
        if (!rootElement) {
            document.body.append(CDomFactory.DataToDom({ "<>": "div", "id": this.RootID(), "html": [main] }));
        }
        else {
            rootElement.innerHTML = "";
            rootElement.append(CDomFactory.DataToDom(main));
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
                                            "onclick": () => { CUtil.ID(this.RootID()).innerHTML = ""; }
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
                    let menu = CUtil.ID(this.MakeID(key, "barDropdownMenu"));
                    if (menu && window["bootstrap"]) {
                        window["bootstrap"].Dropdown.getOrCreateInstance(menu).show();
                    }
                },
                "onmouseout": (e) => {
                    let menu = CUtil.ID(this.MakeID(key, "barDropdownMenu"));
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
