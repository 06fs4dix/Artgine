import {CConsol} from "../basic/CConsol.js";
import {CDomFactory} from "../basic/CDOMFactory.js";
import {CJSON} from "../basic/CJSON.js";
import { CConfirm } from "../basic/CModal.js";
import { CObject } from "../basic/CObject.js";
import {CTree} from "../basic/CTree.js";
import {CUniqueID} from "../basic/CUniqueID.js";
import { CUtil } from "../basic/CUtil.js";


export class CHtmlBarItem extends CObject 
{
	public m_parent : string;
	public m_title : string;
	public m_hidden : boolean = false;

	constructor(_title : string, _parent : string, _key? : string) 
	{
		super();

		this.m_parent = _parent;
		this.m_title = _title;
		this.SetKey(_key || CUniqueID.Get());
	}

	IsLeaf() : boolean {
		return false;
	}

	Icon(): string {
		return "bi-bookmark-plus-fill";
	}
}

export class CHtmlBarTrunk extends CHtmlBarItem
{
    constructor(_content : string, _parent : string = "", _key? : string) {
        super(_content, _parent, _key);
    }

    public CreateLeaf(_content : string, _target : Function|string, _prefab? : boolean) {
        return _prefab
            ? new CHtmlBarLeaf(_content, this.Key(), _target as string, _prefab)
            : new CHtmlBarLeaf(_content, this.Key(), _target as Function);
    }

    public CreateTrunk(_content : string) : CHtmlBarTrunk {
		return new CHtmlBarTrunk(_content, this.Key());
	}

	IsLeaf() : boolean {
		return false;
	}

    Icon() : string {
        return "";
    }
}

export class CHtmlBarLeaf extends CHtmlBarItem
{
	public m_target : Function|string;
	public m_isPrefab : boolean;

    constructor(_content: string, _parent: string, _target: Function | string, _prefab: boolean = false) {
        super(_content, _parent);
        this.m_target = _target;
        this.m_isPrefab = _prefab;
    }

    IsLeaf() : boolean {
        return true;
    }

    Icon(): string {
        return (this.m_target instanceof Function) ? "bi-bookmark" :
               (this.m_isPrefab) ? "bi-bookmark-check-fill" :
               "bi-bookmark-plus-fill";
            
    }
}

export class CHtmlBarTree extends CObject
{
	public m_root = new CTree<CHtmlBarItem>();

	public CreateTrunk(_content: string, _key: string, _parent?: string) {
        const parent = _parent || "";  // 기본값 설정
        this.Push(new CHtmlBarTrunk(_content, parent, _key));
    }
    
    public CreateLeaf(_content: string, _parent: string, _target: Function | string, _prefab: boolean = false) {
        const isFunction = _target instanceof Function;
        this.Push(new CHtmlBarLeaf(_content, _parent, _target, !isFunction && _prefab));
    }

    override ImportCJSON(_json: CJSON) 
	{
        let items : CHtmlBarItem[] = [];
        let nodes = [this.m_root];
        while(nodes.length > 0) {
            let node = nodes.shift();
            if (node.mChild) nodes.push(node.mChild);
            if (node.mColleague) nodes.push(node.mColleague);
            if (node.mData) items.push(node.mData);
        }

        super.ImportCJSON(_json);

        nodes = [this.m_root];
        while(nodes.length > 0) {
            let node = nodes.shift();
            if (node.mChild) nodes.push(node.mChild);
            if (node.mColleague) nodes.push(node.mColleague);
            if (node.mData && items.findIndex(n => n.Key() == node.mData.Key())) {
                items.push(node.mData);
            }
        }

        this.m_root = new CTree();
        items.forEach(item => this.Push(item));
        this.Refresh();

        return this;
    }

    override ExportCJSON()
	{
        let items: Array<CHtmlBarItem> = [];
        let funcItems: Array<CTree<CHtmlBarItem>> = [];
        let nodes = [this.m_root];

        while (nodes.length) {
            let node = nodes.shift();
            if (node.mColleague) nodes.push(node.mColleague);
            if (node.mChild) nodes.push(node.mChild);
            if (node.mData) items.push(node.mData);
        }

        funcItems.forEach(leaf => leaf.Destroy());

        let json = super.ExportCJSON();

        this.m_root = new CTree();
        items.forEach(item => this.Push(item));
        this.Refresh();

        return json;
    }

	Push(_item : CHtmlBarItem)
	{
		// 동일한 키가 이미 등록된 경우
		if(this.m_root.Find(_item.Key()) != null) {
			CConsol.Log("동일한 키의 노드가 이미 등록되어 있습니다.");
			return;
		}

		// 부모 키에 따라 노드 추가
		let p = (_item.m_parent === "" 
			? this.m_root 
			: this.m_root.Find(_item.m_parent) || this.m_root).PushChild(_item.Key());

		p.mData = _item;

		// 화면 갱신
		if (CUtil.ID(this.RootID())?.innerHTML) this.Refresh();
	}

	Hide(_item: CHtmlBarItem | string) {
		const item = (_item instanceof CHtmlBarItem) ? _item : this.m_root.Find(_item).mData;
		item.m_hidden = true;
		this.Refresh();
	}

	Expose(_item: CHtmlBarItem | string) {
		const item = (_item instanceof CHtmlBarItem) ? _item : this.m_root.Find(_item).mData;
		item.m_hidden = false;
		this.Refresh();
	}

	Find(_key : string) : CTree<CHtmlBarItem> 
	{
		return this.m_root.Find(_key);
	}

	protected MakeID(_key : string, _type : string) : string
	{
		_key.split("_").join("^UNDERBAR^");
		return _key + "_" + _type;
	}

	protected MakeKey(_id : string) : string
	{
		return _id.split("_")[0].split("^UNDERBAR^").join("_");
	}

	Activate(e) {
		let obj = e.target.id ? e.target : e.target.parentElement;
		let node = this.m_root.Find(this.MakeKey(obj.id));
		if(node.mData instanceof CHtmlBarLeaf) {
			if (node.mData.m_target instanceof Function) {
				node.mData.m_target();
			}
		}
	}

	private AskDelete(_node : CTree<CHtmlBarItem>) 
	{
		let confirm=new CConfirm();
		confirm.SetBody("삭제하시겠습니까?");
		confirm.SetConfirm(CConfirm.eConfirm.YesNo,[
		()=> {
			_node.Destroy();
			this.Refresh();
		},
		])
		confirm.Open();
		
		// let jbox = new CJBox(CJBox.Df.Confirm,{
		// 	content: "삭제하시겠습니까?",
		// 	draggable: 'title',
		// 	overlay: false,
		// 	confirm: (e) => {
		// 		_node.remove();
		// 		this.Refresh();
		// 	},
		// 	onCloseComplete:(e) => {
		// 		jbox.destroy();
		// 	}
		// });
		// jbox.open();
	}

	RootID() : string
	{
		return "barRoot";
	}

	GetNavbarTitle() {
		return "Navbar";
	}

	NavbarTitleEvent(e) {}

	Refresh() {
		const navArr: any[] = [];
		let root = this.m_root.mChild;
	
		const createNavItem = (root: CTree<CHtmlBarItem>) => ({
			"<>": "li", "class": "nav-item", "hidden": root.mData.m_hidden ? " " : null, "html": [
				{
					"<>": "a", "class": "nav-link", "id": this.MakeID(root.mData.Key(), "barNav"),
					"onclick": (e) => this.Activate(e), "style": "cursor:pointer;", "html": [
						{ "<>": "i", "class": "bi " + root.mData.Icon() },
						{ "<>": "text", "text": root.mData.m_title },
						{ "<>": "i", "class": "bi bi-x float-right", "style": "cursor:pointer;", "onclick": (e) => {
							e.stopPropagation();
							this.AskDelete(root);
						}}
					]
				}
			]
		});
	
		const createDropdown = (root: CTree<CHtmlBarItem>) => ({
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
	
		const main: any = this.CreateNavbar(navArr);
	
		const rootElement = CUtil.ID(this.RootID());
		if (!rootElement) {
			document.body.append(CDomFactory.DataToDom({ "<>": "div", "id": this.RootID(), "html": [main] }));
		} else {
			rootElement.innerHTML = "";
			rootElement.append(CDomFactory.DataToDom(main));
		}
	}

	protected NavbarContents() : any[] {
		return [];
	}

	protected CreateNavbar(_navItems) : any {
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
							"html": [{ "<>": "i", "class": "nav-link bi bi-x-square", "href": "#", "style":"cursor:pointer;", 
								"onclick": () => { CUtil.ID(this.RootID()).innerHTML = ""; } 
							}] 
						}
					]}
				]}
			]
		};
	}

	private RefreshTrunk(_tree: CTree<CHtmlBarItem>): Array<any> {
		const createItem = (data: CHtmlBarItem, isLeaf: boolean, key: string) => {			
			const commonAttrs = {
				"class": isLeaf ? "dropdown-item" : "dropdown dropend",
				"hidden": data.m_hidden ? " " : null
			};
	
			const itemHTML = isLeaf ? [
				{ "<>": "i", "class": "bi" + data.Icon()},
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
						"onclick": (e) => {if(isLeaf) this.Activate(e)}, 
						"style": "pointer:cursor;", 
						"html": itemHTML 
					}
				],
				"onmouseover": (e) => {
					let menu = CUtil.ID(this.MakeID(key, "barDropdownMenu")) as HTMLDivElement;
					if(menu && window["bootstrap"]) {
						window["bootstrap"].Dropdown.getOrCreateInstance(menu).show();
						// menu.style.display = "block";
					}
				},
				"onmouseout": (e) => {
					let menu = CUtil.ID(this.MakeID(key, "barDropdownMenu")) as HTMLDivElement;
					if(menu && window["bootstrap"]) {
						window["bootstrap"].Dropdown.getOrCreateInstance(menu).hide();
						// menu.style.display = "none";
					}
				}
			};
		};
	
		let DropdownArr: Array<any> = [];
	
		while (_tree != null) {
			const isLeaf = _tree.mData.IsLeaf();
			DropdownArr.push(createItem(_tree.mData, isLeaf, _tree.mData.Key()));
			_tree = _tree.mColleague;
		}
	
		return DropdownArr;
	}
}