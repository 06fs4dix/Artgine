import { IListener } from "../basic/Basic.js";
import { CDomFactory } from "../basic/CDOMFactory.js";
import { CEvent } from "../basic/CEvent.js";
import { CLan } from "../basic/CLan.js";
import { CPath } from "../basic/CPath.js";
import { CUniqueID } from "../basic/CUniqueID.js";
import { CUtil } from "../basic/CUtil.js";
import { CFecth } from "../network/CFecth.js";
import { CSing } from "../server/CSing.js";
import { CUtilWeb } from "../util/CUtilWeb.js";


export class CBoard //implements IListener
{
	public mTarget : HTMLElement=null;
	public mCategory="";
	public mListOffset=0;
	public mListCount=0;
	public mAdmin=null;
	public mEditer=null;
	
	
	constructor(_target : HTMLElement,_category : string="basic",_admin : Array<string>=null)
	{
		this.mTarget=_target;
		this.mCategory=_category;
		this.mAdmin=_admin;
	}
	// On(_key: any, _event: any, _target: any=null) {
	// 	this.mEventMap.set(_key,CEvent.ToCEvent(_event));
	// }
	// Off(_key: any, _target: any=null) {
	// 	throw new Error("Method not implemented.");
	// }
	// GetEvent(_key: any, _target: any=null) {

	// 	let event=this.mEventMap.get(_key);
	// 	if(event==null)	event=CEvent.Default();
	// 	return event;
	// }
	async AdminChk()
	{
		if(this.mAdmin==null)
			return false;
		if(CSing.PrivateKey()==null)
			return false;

		var pInfo=await CSing.PrivateInfo(CSing.PrivateKey());
		for(var each0 of this.mAdmin)
		{
			if(pInfo._publicKey==each0)
			{
				return true;
			}
		}
		return false;
	}
	List(_offsetList : number,_listCount : number)
	{
		if (typeof _offsetList == "string")
            _offsetList = Number(_offsetList);

		if (typeof _listCount == "string")
            _listCount = Number(_listCount);

		if(_offsetList<0)
			_offsetList=0;
		this.mListOffset=_offsetList;
		this.mListCount=_listCount;
	
			
			
		let trClick=(_te)=>{
			let off=_te.currentTarget.id.substr(1,_te.currentTarget.id.length-1);
			this.Read(off,this.mListOffset);
			
		};
		let WriteClick=()=>{
			
			this.Write(-1);
		};
		let PageClick=(_pe)=>{
			let off=Number(_pe.currentTarget.id.substr(1,_pe.currentTarget.id.length-1));
			
			this.List(off,_listCount);
		};
		//CJson2Html.
		
		var html={"<>":"div","html":[
			{"<>":"table","class":"table table-hover","html":[
				{"<>":"thead","class":"thead-light","html":[
					{"<>":"tr","html":[
						{"<>":"th","scope":"col","width":"10%","data-CLan":CLan.Set(null,"CBoard.List.Offset","Offset")},
						{"<>":"th","scope":"col","width":"10%","data-CLan":CLan.Set(null,"CBoard.List.Nick","Nick")},
						{"<>":"th","scope":"col","width":"60%","data-CLan":CLan.Set(null,"CBoard.List.Subject","Subject")},
						{"<>":"th","scope":"col","width":"20%","data-CLan":CLan.Set(null,"CBoard.List.Datetime","Datetime")},
					]}
				]},
				{"<>":"tbody","id":"Board_tbody"},
			]},
			{"<>":"div","class":"row","html":[
				{"<>":"div","class":"col-sm"},
				{"<>":"div","class":"col-sm","html":[
					{"<>":"nav","aria-label":"navigation","html":[
						{"<>":"ul","class":"pagination","id":"Pagination_ul"},
					]}
				]},
				{"<>":"div","class":"col-sm","html":[
					{"<>":"button","type":"button","id":"Write_btn","class":"btn btn-primary float-end","hidden":true,
						"onclick":WriteClick,"data-CLan":CLan.Set(null,"CBoard.List.Write","Write")},
				]},
			]}
		]};
			
		
		this.mTarget.innerHTML="";
		this.mTarget.append(CDomFactory.DataToDom(html));
		CFecth.Exe(CPath.PHPC()+"CBoard/List",{category:this.mCategory,limitOffset:_offsetList,limitCount:_listCount},"json").
		then((_result : Array<{"_offset","_nick","_subject","_datetime"}>)=>{
			var colArr=_result;
			//var colHtml=[];
			
			for(var each0 of colArr)
			{
				var rowHtml={"<>":"tr","id":"t"+each0._offset,"onclick":trClick,"html":[
					{"<>":"th","scope":"row","text":each0._offset},
					{"<>":"td","text":each0._nick},
					{"<>":"td","text":each0._subject},
					{"<>":"td","text":each0._datetime},
				],style:"cursor:pointer;"};
				//colHtml.push(rowHtml);
				CUtil.ID("Board_tbody").append(CDomFactory.DataToDom(rowHtml));
				
			}
			//CUtil.ID("Board_tbody").
			
		});
		CFecth.Exe(CPath.PHPC()+"CBoard/ListCount",{category:this.mCategory},"json").then((_result : Array<{"COUNT(*)"}>)=>{
			let allCount=Number(_result[0]["COUNT(*)"]);
			var div=Math.floor((allCount/_listCount)+0.99);
			var minDiv=Math.floor(_offsetList/_listCount)-2;
			var maxDiv=Math.floor(_offsetList/_listCount)+2;
			if(minDiv<0)
				minDiv=0;
			if(maxDiv>=div-1)
				maxDiv=div-1;
			//var paginList="";
			for(var i=minDiv;i<=maxDiv;i++)
			{
				var li={"<>":"li","class":"page-item","html":[
					{"<>":"a","class":"page-link","id":"p"+(i*_listCount),"onclick":PageClick,"text":i}
				]};
				CUtil.ID("Pagination_ul").append(CDomFactory.DataToDom(li));
				//paginList+="<li class='page-item'><a class='page-link' id='p"+i+"' onclick>"+i+"</a></li>";
			}
			//CUtil.ID("Pagination_ul").innerHTML=paginList;
		});
		if(this.mAdmin==null)
		{
			CUtil.ID("Write_btn").hidden=false;
			
		}
		else if(CSing.PrivateKey()!=null)
		{
			this.AdminChk().then((result)=>{
				CUtil.ID("Write_btn").hidden=result;
			});
		}
		
	}

	//글 오프셋 //  // 페이지 오프셋 추가됨 // 댓글기능 열고 닫기 추가
	Read(_offset : number, _listOffset : number, _reply : boolean = false)//수정,삭제 지원
	{
		if(typeof _offset=="string")
			_offset=Number(_offset);

		if(typeof _listOffset=="string")
			_listOffset=Number(_listOffset);
			
		let WriteClick=()=>{
			
			this.Write(Number(CUtil.IDValue("Offset_num")));
			
			
			
		};
		let DeleteClick=()=>{
			
				CFecth.Exe(CPath.PHPC()+"CBoard/Delete",{offset:CUtil.IDValue("Offset_num")}).then(()=>{
					
					this.List(-1,this.mListCount);
				});
			
		};
		let BackClick=()=>{
			
			this.List(this.mListOffset,this.mListCount);
			
		};
		
		var html={"<>":"div","class":"card","html":[
			{"<>":"div","class":"card-header","html":[
				{"<>":"input","id":"Offset_num","value":-1,"hidden":true},
				{"<>":"span","id":"Subject_span","text":"test"},
				{"<>":"button","type":"button","class":"btn btn-primary float-end","hidden":true,
					"id":"Delete_btn","data-CLan":CLan.Set(null,"CBoard.Read.Delete","Delete"),"onclick":DeleteClick},
				{"<>":"button","type":"button","class":"btn btn-danger float-end","hidden":true,
					"id":"Modify_btn","data-CLan":CLan.Set(null,"CBoard.Read.Modify","Modify"),"onclick":WriteClick},
				{"<>":"button","type":"button","class":"btn btn-secondary float-end",
					"id":"Modify_btn","data-CLan":CLan.Set(null,"CBoard.Read.Back","Back"),"onclick":BackClick},
			]},
			{"<>":"div","class":"card-body","id":"Content_div","text":"test"},
		]};
		this.mTarget.innerHTML="";
		this.mTarget.append(CDomFactory.DataToDom(html));
		
		CFecth.Exe(CPath.PHPC()+"CBoard/Read",{offset:_offset},"json").
		then(async(_result : Array<{"_subject","_content","_publicKey","_offset"}>)=>{
			
			CUtil.ID("Subject_span").innerHTML=_result[0]._subject;
			CUtil.ID("Content_div").innerHTML=_result[0]._content;
			CUtil.IDValue("Offset_num",_result[0]._offset);

			if(_reply == true)
			{
				CUtil.ID("Reply_div").hidden=false;
			}
			
			if(CSing.PrivateKey()!=null)
			{
				CSing.PrivateInfo(CSing.PrivateKey()).then((_info)=>{
					if(_info._publicKey==_result[0]._publicKey)
					{
						CUtil.ID("Delete_btn").hidden=false;
						CUtil.ID("Modify_btn").hidden=false;
					}
				});

				if(_reply == true)
				{
					CUtil.ID("ReplyAdd").hidden=false;
				}
			}
			
			
			this.AdminChk().then((result)=>{
				if(result)
				{
					CUtil.ID("Delete_btn").hidden=false;
					CUtil.ID("Modify_btn").hidden=false;	
				}
				
			});	
		});
		
	}
	//수정할 오프셋 -1은 새글쓰기 // 페이지 오프셋 추가됨
	Write(_offset : number=-1, _listOffset : number=-1)
	{
		if(typeof _offset=="string")
			_offset=Number(_offset);

		if(typeof _listOffset=="string")
			_listOffset=Number(_listOffset);
		
		let btnClick=()=>{
			//카테고리,익명,Offset,Subject,Nick,Content
			if(CSing.PrivateKey()==null)
			{
				
				let publicKey=CUniqueID.Get();
				

				let content=CUtil.IDValue("Content_txt");
				if(this.mEditer!=null)	content=this.mEditer.getHTML();


				CFecth.Exe(CPath.PHPC()+"CBoard/Write",{category:this.mCategory,publicKey:publicKey,
					offset:CUtil.IDValue("Offset_num"),subject:CUtil.IDValue("Subject_txt"),
					nick:CUtil.IDValue("Nick_txt"),content:content}).then(()=>{
				
					this.List(-1,this.mListCount);
				});
					
			
				
				
			}
			else
			{
				CSing.PrivateInfo(CSing.PrivateKey()).then((_info)=>{
					if(_offset==-1 && _info!=null)
					{
						CUtil.IDValue("Nick_txt",_info._nick);
					}
					let publicKey="";
					if(_info!=null)
						publicKey=_info._publicKey;
	
					let content=CUtil.IDValue("Content_txt");
					if(this.mEditer!=null)	content=this.mEditer.getHTML();
	
	
					return CFecth.Exe(CPath.PHPC()+"CBoard/Write",{category:this.mCategory,publicKey:publicKey,
						offset:CUtil.IDValue("Offset_num"),subject:CUtil.IDValue("Subject_txt"),
						nick:CUtil.IDValue("Nick_txt"),content:content});
						
				}).then(()=>{
					
					this.List(-1,this.mListCount);
				});
			}
			

			
			
		};
		let backClick=()=>{
			
			this.List(this.mListOffset,this.mListCount);
			
		};
		
		
		var html={"<>":"div","html":[
			{"<>":"input","class":"form-control","type":"number","id":"Offset_num","hidden":true,"value":-1},
			{"<>":"label","for":"Subject_txt","text":"Subject"},
			{"<>":"input","class":"form-control","type":"text","id":"Subject_txt"},
			{"<>":"label","for":"Nick_txt","text":"Nick"},
			{"<>":"input","class":"form-control","type":"text","id":"Nick_txt","value":"Anonymous","disabled":"disabled"},
			{"<>":"label","for":"Content_txt","text":"Content"},
			{"<>":"textarea","class":"form-control","id":"Content_txt"},
			{"<>":"div","id":"ContentW_div"},
			{"<>":"button","type":"button","class":"btn btn-primary btn-block","data-CLan":CLan.Set(null,"CBoard.Write.Submit","Submit"),
				"onclick":btnClick},
			{"<>":"button","type":"button","class":"btn btn-secondary btn-block","data-CLan":CLan.Set(null,"CBoard.Write.Back","Back"),
				"onclick":backClick},
		]};
		this.mTarget.innerHTML="";
		this.mTarget.append(CDomFactory.DataToDom(html));
		if(_offset!=-1)
		{
			CFecth.Exe(CPath.PHPC()+"CBoard/Modify",{offset:_offset},"json").
			then((_result : Array<{"_subject","_content","_nick","_offset"}>)=>{
				
				CUtil.IDValue("Subject_txt",_result[0]._subject);
				CUtil.IDValue("Content_txt",_result[0]._content);
				CUtil.IDValue("Nick_txt",_result[0]._nick);
				CUtil.IDValue("Offset_num",_result[0]._offset);
				this.mEditer=CUtilWeb.ToastUI(CUtil.ID("ContentW_div"));
				if(this.mEditer!=null)	CUtil.ID("Content_txt").hidden=true;
			});
		}
		else
		{
			this.mEditer=CUtilWeb.ToastUI(CUtil.ID("ContentW_div"));
			if(this.mEditer!=null)	CUtil.ID("Content_txt").hidden=true;
			

		}

		if(CSing.PrivateKey()!=null)
		{
			CSing.PrivateInfo(CSing.PrivateKey()).then((_data)=>{
				CUtil.IDValue("Nick_txt",_data._nick);
			});
		}

	}
}
