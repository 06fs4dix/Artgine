
import {CJSON} from "./CJSON.js";
import {CObject} from "./CObject.js";
import {CStream} from "./CStream.js";

export class CTree<Type> extends CObject
{
	public mKey : string;
	public mData : Type;
	public mChild : CTree<Type>;
	public mColleague : CTree<Type>;
	public mParent : CTree<Type>;
	public mValueArr : Array<CTree<Type>>;
		
	constructor()
	{
		super();
		this.mKey="";
		this.mData=null;
		this.mChild = null;
		this.mColleague = null;
		this.mParent=null;
		this.mValueArr=null;
	}
	public ImportCJSON(_json : CJSON)
	{
		var obj=super.ImportCJSON(_json);
		if(this.mChild!=null)
		{
			this.mChild.mParent=this;
			var node=this.mChild.mColleague;
			while(node!=null)
			{
				node.mParent=this;
				node=node.mColleague;
			}
		}

		return obj;
	}
	public Deserial(_stream  : CStream) 
	{
		super.Deserial(_stream);
		if(this.mChild!=null)
		{
			this.mChild.mParent=this;
			var node=this.mChild.mColleague;
			while(node!=null)
			{
				node.mParent=this;
				node=node.mColleague;
			}
		}
	}
	override IsShould(_member: string, _type: CObject.eShould)
	{
		if(_member=="mParent" || _member=="mValueArr")
			return false;
			
			
		return super.IsShould(_member,_type);
	}
	PushColleague(_key : string|CTree<Type>) : CTree<Type>
	{
		this.mValueArr=null;
		if (this.mColleague == null)
		{
			if(typeof(_key) == "string" || typeof(_key) == "number") 
			{
				this.mColleague = new CTree();
				this.mColleague.mKey = _key+"";
				this.mColleague.mParent=this.mParent;
			}
			else {
				this.mColleague = _key;
				this.mColleague.mParent = this.mParent;
			}
		}
		else
		{
			return this.mColleague.PushColleague(_key);
		}
		return this.mColleague;
	}
	PushChild(_key : string|CTree<Type>) : CTree<Type>
	{
		this.mValueArr=null;
		if (this.mChild == null)
		{
			if(typeof(_key) == "string" || typeof(_key) == "number") 
			{
				this.mChild = new CTree();
				this.mChild.mKey = _key+"";
				this.mChild.mParent = this;
			}
			else {
				this.mChild = _key;
				this.mChild.mParent = this;
			}
		}
		else
		{
			return this.mChild.PushColleague(_key);
		}
		return this.mChild;
	}
	Find(_key : string|number) : CTree<Type>
	{
		if(typeof _key == "number")
			_key=_key+"";
		if (_key == this.mKey)
			return this;
	
		var dum=null;
		if (this.mChild != null)
		{
			dum=this.mChild.Find(_key);
			if (dum != null)
				return dum;
		}
		if (this.mColleague != null)
		{
			dum = this.mColleague.Find(_key);
			if (dum != null)
				return dum;
		}
		return null;
	}
	Destroy()
	{
		if(this.mParent!=null)
			this.mParent.mValueArr=null;
		
		if (this.mParent.mChild == this)
		{
			this.mParent.mChild = this.mColleague;
			
		}
		else if (this.mParent.mChild != null)
		{

			var pct = this.mParent.mChild;
			var pctb = pct;
			while (pct != this)
			{
				pct.mValueArr=null;
				pctb = pct;
				pct = pct.mColleague;
			}
			pctb.mColleague = this.mColleague;
		}
		this.mParent = null;
		this.mColleague = null;

		return this;
	}
	//GetThis() : CTree<Type>	{	return this;	}
	GetArray()
	{
		if(this.mValueArr!=null)
			return this.mValueArr;
		this.mValueArr=new Array<CTree<Type>>();
		var que=new Array<CTree<Type>>();
		que.push(this);
		
		
		for (let off=0;off<que.length;++off)
		{
			let node=que[off];
			if(node.mData!=null)
				this.mValueArr.push(node);
			if ( node.mChild != null)
				que.push(node.mChild);

			if ( node.mColleague != null)
				que.push(node.mColleague);
				
			
		}
		return this.mValueArr;
	}
	Keys(_child=true)
	{
	
		var keyArr=new Array<string>();
		var que=new Array();
		que.push(this);
		
		
		for (let off=0;off<que.length;++off)
		{
			let node=que[off] as CTree<Type>;
			if(node.mData!=null)
				keyArr.push(node.mKey);
			if ( node.mChild != null && _child)
				que.push(node.mChild);

			if ( node.mColleague != null)
				que.push(node.mColleague);
				
			
		}
		return keyArr;
	}
}


