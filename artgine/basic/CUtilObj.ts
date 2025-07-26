
import {CUniqueID} from "../basic/CUniqueID.js";

import {CModal} from "../basic/CModal.js";
import {CObject,CPointer } from "./CObject.js";
import {CUtil} from "./CUtil.js";
import { CClass } from "./CClass.js";


var jsummer=null;
var jLastPt : CPointer =null;
var jLastTh : HTMLInputElement =null;

function SummerNote(_pointer : CPointer,_th : HTMLInputElement)
{
	jLastPt=_pointer;
	jLastTh=_th;
	if(jsummer==null)
	{
		alert("서버노트 다시 코딩해라!!");
		// jsummer=new CJBox(CJBox.Df.Modal, {
		// 	attach: '#SummerNote',
		// 	width: 480,
		// 	title: 'TileModal',
		// 	content:"<textarea id='summernote_txt'></textarea>",
		// 	draggable: 'title',
		// 	createOnInit:true,
		// 	overlay: false,
		// 	onOpenComplete : ()=>{
				
		// 		jLastTh.value=$("#summernote_txt").val();
		// 		$("#summernote_txt").val(jLastPt.Get());
		// 		$("#summernote_txt").summernote({placeholder: 'Text...',tabsize: 2,height:64});
		// 	},
		// 	onClose : ()=>{
		// 		jLastTh.value=$("#summernote_txt").val();
		// 		jLastPt.Set($("#summernote_txt").val());
		// 		$("#summernote_txt").summernote('destroy');
		// 	},
		// });

	}
	
	//jsummer.attach=_id;
	jsummer.open();
	
}

export class CUtilObj
{

	static NullEdit(_pointer : CPointer,_body : HTMLElement,_input : HTMLElement,_default : any)
	{
		if(_input==null)
		{
			if(_pointer.Get() instanceof CObject)
			{
				let btn=document.createElement("i");
				btn.style.cursor = "pointer";
				btn.className="bi bi-dash-square-dotted";
				btn.onclick=()=>{
					_pointer.Set(null);
					_pointer.target.EditRefresh(_pointer);
					_pointer.target.EditChange(_pointer,false);
				};
				const titleDiv = _body.querySelector(":scope > .border.p-1.mt-1");
				titleDiv.prepend(btn);
			}
			else
			{
				let btn=document.createElement("i");
				btn.style.cursor = "pointer";
				btn.className="bi bi-plus-square";
				btn.onclick=()=>{
					_pointer.Set(_default);
					_pointer.target.EditRefresh(_pointer);
					_pointer.target.EditChange(_pointer,false);
				};
				_body.prepend(btn);
			}
			
		}
		else
		{
			let btn=document.createElement("i");
			btn.style.cursor = "pointer";
			btn.className="bi bi-dash-square-dotted";
			btn.onclick=()=>{
				_pointer.Set(null);
				_pointer.target.EditRefresh(_pointer);
				_pointer.target.EditChange(_pointer,false);
			};
			_body.prepend(btn);
		}
		
	}
	static Button(_pointer : CPointer,_th : HTMLInputElement,_text : string,_value : any)
	{
		var button=document.createElement("button");
		button.innerText=_text;
		button.onclick=()=>{
			_pointer.Set(_value);
			_th.value=_value+"";
		};
		return button;
	}
	static ArrayAddButton(_pointer : CPointer,_text : string,_value : any)
	{
		var button=document.createElement("button");
		button.innerText=_text;
		button.onclick=()=>{
			if(_pointer.target[_pointer.member] instanceof Set)
				_pointer.target[_pointer.member].add(_value);
			else
				_pointer.target[_pointer.member].push(_value);
			_pointer.key=_pointer.target[_pointer.member].length-1;
			_pointer.state=1;
			
			_pointer.target.EditChange(_pointer,false);
			_pointer.target.EditRefresh();
			_pointer.key=null;
		};
		return button;
	}
	static Range(_pointer : CPointer,_th : HTMLInputElement,_min : number,_max : number,_step : number)
	{
		var slider = document.createElement('input') as HTMLInputElement;
	    slider.id = "volume";
	    slider.type = 'range';
	    slider.min = _min+"";
	    slider.max = _max+"";
	    slider.value = _th.value;
	    slider.step = _step+"";
		document.body.appendChild(slider); 
		slider.onchange=(_event)=>{
			var ct=_event.currentTarget as HTMLInputElement;
			_pointer.Set(ct.value);
			_th.value=ct.value+"";
		};
		return slider;
	}
	static Select(_pointer : CPointer,_input : HTMLElement,_text : Array<string>,_value : Array<any>,_hidden=true,_changeFun : Function=null)
	{
		
		_input.hidden=_hidden;
		var select=document.createElement("select") as HTMLSelectElement;
		select.className="form-select";
		for(var i=0;i<_text.length;++i)
		{
			var opt = document.createElement("option");
			opt.value=_value[i];
			opt.text=_text[i];
			if(_pointer.Get()==_value[i])
				opt.selected=true;
			select.add(opt);
		}
		select.onchange=(_event)=>{
			var ct=_event.currentTarget as HTMLSelectElement;
			_pointer.Set(_value[ct.selectedIndex]);
			(_input as HTMLInputElement).value=_value[ct.selectedIndex]+"";
			if(_changeFun!=null)
				_changeFun();
			if(_pointer.target instanceof CObject)
				_pointer.target.EditChange(_pointer,false);
		};
	
		
		return select;
	}
	// static DataList(_pointer : CPointer,_th : HTMLInputElement,_text : Array<string>,_value : Array<any>,_hidden=true,_changeFun : Function=null)
	// {
	// 	_th.hidden = _hidden;

	// 	// datalist 요소 생성
	// 	const dataListId = "datalist_" + Math.random().toString(36).substr(2, 9);
	// 	const dataList = document.createElement("datalist");
	// 	dataList.id = dataListId;

	// 	for (let i = 0; i < _text.length; ++i) {
	// 		const option = document.createElement("option");
	// 		option.value = _text[i];
	// 		dataList.appendChild(option);
	// 	}

	// 	// input 설정
	// 	_th.setAttribute("list", dataListId);
	// 	_th.className = "form-control";
	// 	_th.value = _pointer.Get() + "";

	// 	// [input + button] wrapper
	// 	const wrapper = document.createElement("div");
	// 	wrapper.className = "input-group";

	// 	// Add 버튼 생성
	// 	const addBtn = document.createElement("button");
	// 	addBtn.className = "btn btn-outline-primary";
	// 	addBtn.type = "button";
	// 	addBtn.innerText = "+";

	// 	// 이벤트 함수
	// 	const applyValue = () => {
	// 		const value = _th.value;
	// 		_pointer.Set(value);
	// 		if (_changeFun) _changeFun();
	// 		if (_pointer.target instanceof CObject)
	// 			_pointer.target.EditChange(_pointer);
	// 	};

	// 	// 버튼 클릭 시
	// 	addBtn.addEventListener("click", applyValue);

	// 	// 엔터 입력 시
	// 	_th.addEventListener("keydown", (e) => {
	// 		if (e.key === "Enter") {
	// 			e.preventDefault();
	// 			applyValue();
	// 		}
	// 	});

	// 	// 조립
	// 	wrapper.appendChild(_th);
	// 	wrapper.appendChild(addBtn);

	// 	// 리턴용 fragment
	// 	const container = document.createElement("div");
	// 	container.appendChild(wrapper);
	// 	container.appendChild(dataList);

	// 	return container;
	// }
	static Summernote(_pointer : CPointer,_th : HTMLInputElement)
	{
		_th.onclick=()=>{
			SummerNote(_pointer,_th);
		};
		
	}
	static ShowModal(_watch : CObject|Array<CObject>|IterableIterator<CObject>, _showInNewJBox : boolean = false)
	{		
		let title="Modal";
		if(_showInNewJBox) {
			let htmlString : HTMLElement=null;
			if(_watch instanceof CObject)
			{
				title=_watch.Key()+"-"+_watch.constructor.name;
				htmlString = _watch.EditInit();
			}
				
			else		
				htmlString = CObject.EditArrayInit(_watch);
			var id=CUniqueID.Get();
			let jbox = new CModal();
			jbox.SetTitle(CModal.eTitle.TextFullClose);
			jbox.SetHeader(title);
			jbox.SetBody("<div id='"+id+"'></div>");
			jbox.SetSize(480, 640);
			jbox.Open();
			CUtil.ID(id).append(htmlString);
			// jbox.position();
			return jbox;
		}

		var g_wjbox : CModal = new CModal("basicModal");
		g_wjbox.SetTitle(CModal.eTitle.TextFullClose);
		g_wjbox.SetResize(true);
		g_wjbox.SetHeader("Modal");
		g_wjbox.SetBody("<div id='basicModal_div' />");
		g_wjbox.SetSize(480, 640);
		g_wjbox.Open();

		CUtil.ID("basicModal_div").innerHTML="";
		
		if(_watch instanceof CObject)
			CUtil.ID("basicModal_div").append(_watch.EditInit());
		else		
			CUtil.ID("basicModal_div").append(CObject.EditArrayInit(_watch));
		
		return g_wjbox;
		
	}
	
	static ArrayAddSelectList(_pointer : CPointer,_body : HTMLElement,_iHtml : HTMLElement,_valueList : Array<any>,_textArea=false)
	{
		var cadiv=document.createElement("div");
		
		
		var select=document.createElement("select") as HTMLSelectElement;
		var opt = document.createElement("option");
		opt.value="-1";
		opt.text="";
		select.add(opt);
		select.className="form-select";
		for(var i=0;i<_valueList.length;++i)
		{
			opt = document.createElement("option");
			opt.value=i+"";
			if(typeof _valueList[i] == "number" ||typeof _valueList[i] == "string" ||typeof _valueList[i] == "boolean")
			{
				if(_valueList.length<=1)
					opt.text = typeof _valueList[i];
				else
					opt.text = _valueList[i];
			}
			else
			{
				opt.text = _valueList[i].constructor.name;
			}
			select.add(opt);
		}
		select.onchange=(_event)=>{
			var ct=_event.currentTarget as HTMLSelectElement;
			if(ct.selectedIndex==-1)
				return;
			
			cadiv.innerHTML="";
			var obj={"dummy":_valueList[ct.selectedIndex-1]};
			let pointer=new CPointer(obj,"dummy");
			for(let each0 of _pointer.refArr)
			{
				pointer.refArr.push(each0);
			}
			pointer.refArr.push(obj);


			let wtd=CObject.EditValue(pointer);
			wtd.hidden=true;
			cadiv.append(wtd);
			
			var button=document.createElement("button");
			button.innerText="Add";
			button.onclick=(_event2)=>{
				//var ct2=_event2.currentTarget;
				
				if(_pointer.target[_pointer.member] instanceof Set)
					_pointer.target[_pointer.member].add(CObject.Export(obj.dummy,true,true));
				else
					_pointer.target[_pointer.member].push(CObject.Export(obj.dummy,true,true));
				_pointer.key=_pointer.target[_pointer.member].length-1;
				_pointer.state=1;
				_pointer.target.EditChange(_pointer,false);
				_pointer.key=null;

				CObject.EditArrayItem(_iHtml,_pointer);
			};
			cadiv.append(button);
			
		};
		_body.append(select);
		_body.append(cadiv);
		
		if(_textArea && (typeof _valueList[0] == "number" ||typeof _valueList[0] == "string" ||typeof _valueList[0] == "boolean"))
		{
			var textarea=document.createElement("textarea");
			
			var aStr="";
			let firstTok=true;
			for(var data of _pointer.Get())
			{
				if(firstTok==false)
					aStr+=",";	
				else
					firstTok=false;
				if(data instanceof CObject)
					aStr+=data.ToStr();
				else
					aStr+=data;
			}
			textarea.innerText=aStr;
			//textarea.cols=36;
			textarea.rows=1;
			textarea.className="form-control";
			textarea.placeholder="ex:1,2,.....";
			_body.append(textarea);
			textarea.onchange=(e)=>{
				_pointer.Get().length=0;

				let str=(e.target as HTMLTextAreaElement) .value as string;
				let strArr=str.split(",");
				for(let dataStr of strArr)
				{
					var data=null;
					if(typeof _valueList[0] == "number")
						data=Number(dataStr);
					else if(typeof _valueList[0] == "string")
						data=dataStr;
					else if(dataStr=="true")
						data=true;
					else
						data=false;
					if(_pointer.target[_pointer.member] instanceof Set)
						_pointer.target[_pointer.member].add(data);
					else
						_pointer.target[_pointer.member].push(data);
				}

				
				_pointer.target.EditRefresh();
			};
		}
	}
	static ArrayAddDataList(_pointer : CPointer,_aHtml : HTMLElement,_iHtml : HTMLElement,_valueList : Array<any>,_textArea=false,_class=false)
	{
		const container = document.createElement("div");
		const inputGroup = document.createElement("div");
		inputGroup.className = "input-group";

		const input = document.createElement("input");
		input.className = "form-control";
		input.setAttribute("list", "arrayadd_datalist_" + Math.random().toString(36).substr(2, 9));

		const datalist = document.createElement("datalist");
		datalist.id = input.getAttribute("list");

		for (let val of _valueList) {
			const opt = document.createElement("option");
			if(_class)
				opt.value = val;
			else if ((typeof val === "number" || typeof val === "string" || typeof val === "boolean")) 
				opt.value = val.toString();
			else 
				opt.value = val.constructor.name;
			
			datalist.appendChild(opt);
		}

		const addButton = document.createElement("button");
		addButton.className = "btn btn-outline-primary";
		addButton.innerText = "+";
		addButton.type = "button";

		// Add 처리 함수
		const handleAdd = () => {
			const valueStr = input.value.trim();
			let match = null;

			for (let val of _valueList) 
			{
				if (val === valueStr) 
				{
					match = val;
					break;
				}
			}

			if (match != null) {
				//let obj = { dummy: match };
				let obj=CClass.New(match);
				if (_pointer.target[_pointer.member] instanceof Set)
					_pointer.target[_pointer.member].add(CObject.Export(obj, true, true));
				else
					_pointer.target[_pointer.member].push(CObject.Export(obj, true, true));

				_pointer.key = _pointer.target[_pointer.member].length - 1;
				_pointer.state = 1;
				_pointer.target.EditChange(_pointer,false);
				_pointer.key = null;

				CObject.EditArrayItem(_iHtml, _pointer);
				input.value = ""; // clear
			}
		};

		addButton.addEventListener("click", handleAdd);
		input.addEventListener("keydown", (e) => {
			if (e.key === "Enter") {
				e.preventDefault();
				handleAdd();
			}
		});

		inputGroup.appendChild(input);
		inputGroup.appendChild(addButton);

		container.appendChild(inputGroup);
		container.appendChild(datalist);

		_aHtml.append(container);

		// 텍스트 에어리어 추가
		if (
			_textArea &&
			(typeof _valueList[0] == "number" || typeof _valueList[0] == "string" || typeof _valueList[0] == "boolean")
		) {
			const textarea = document.createElement("textarea");
			let aStr = "";
			let firstTok = true;
			for (let data of _pointer.Get()) {
				if (!firstTok) aStr += ",";
				else firstTok = false;
				if (data instanceof CObject) aStr += data.ToStr();
				else aStr += data;
			}
			textarea.innerText = aStr;
			textarea.rows = 1;
			textarea.className = "form-control mt-2";
			textarea.placeholder = "ex:1,2,true,...";
			_aHtml.append(textarea);

			textarea.addEventListener("change", (e) => {
				_pointer.Get().length = 0;
				let str = (e.target as HTMLTextAreaElement).value;
				let strArr = str.split(",");
				for (let dataStr of strArr) {
					let data: any = null;
					if (typeof _valueList[0] == "number") data = Number(dataStr);
					else if (typeof _valueList[0] == "string") data = dataStr;
					else data = dataStr === "true";
					if (_pointer.target[_pointer.member] instanceof Set)
						_pointer.target[_pointer.member].add(data);
					else _pointer.target[_pointer.member].push(data);
				}
				_pointer.target.EditRefresh();
			});
		}
	}

}
