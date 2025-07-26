import {CClass} from "./CClass.js";


export class CString
{
	static PathSub(_data : string)
	{
		var pos=_data.lastIndexOf("/");
		if(pos==-1)
			return _data;
		return _data.substr(0,pos);
	}
	static DataConvert(_data : string) : any
	{
		if(_data[0]!="n" && _data[1]!="e"){}

		else if(_data.indexOf(":")!=-1)
		{
			return _data;
		}

		if(_data=="true")
			return true;
		else if(_data=="false")
			return false;
		else if(_data[0]=="\"")
		{
			return CString.ReplaceAll(_data,"\"","");
		}
		else if(_data[0]=="n")
		{
			var rVal=CString.FunctionAnalyze(_data.substr(3,_data.length));
			var cl=CClass.New(rVal.function,rVal.parameter);
			return cl;
		}
		else
		{
			var strChk=false;
			for(var i=0;i<_data.length;++i)
			{
				if(_data[i]=='-' && i==0)
					continue;
				else if(_data[i]=='0' || _data[i]=='1' || _data[i]=='2' || _data[i]=='3' || _data[i]=='4' ||
					_data[i]=='5' || _data[i]=='6' || _data[i]=='7' || _data[i]=='8' || _data[i]=='9' || _data[i]=='.')
					continue;
				
				strChk=true;
				break;
			}
			if(strChk)
			{
				if(window[_data]!=null)
					return window[_data];
				return _data;
			}
				
		}
		
		return Number(_data);
	}
	static LeftRightCut(_str : string,_left,_right)
	{
		let st=_str.indexOf(_left);
		let ed=_str.lastIndexOf(_right);

		return {in:_str.substr(0,st),out:_str.substr(st+1,ed-st-1)};
	}
	static FunctionAnalyze(_str : string)
	{
		var rVal={"function":"","parameter":[],"return":""};
		_str=CString.ReplaceAll(_str," ","");
		_str=CString.ReplaceAll(_str,"	","");
		_str=CString.ReplaceAll(_str,"\r","");
		
		let st=_str.indexOf("(");
		let ed=_str.lastIndexOf(")");

		rVal.return=_str.substr(ed+1,_str.length);
		rVal.return=CString.ReplaceAll(rVal.return,":","");

		rVal.function=_str.substr(0,st);
		
		let para=_str.substr(st+1,ed-st-1);
		
		var p="";
		for(var i=0;i<para.length;++i)
		{
			
			if(para[i]==',')
			{
				rVal.parameter.push(p);
				p="";
			}
			
			else if(para[i]=='(')
			{
				var last=para.indexOf(")",i)+1;
				for(var j=0;j<last-i;++j)
				{
					p+=para[j+i];
				}
				i=last-1;
			}
			else if(para[i]=='[')
			{
				var last=para.indexOf("]",i)+1;
				for(var j=0;j<last-i;++j)
				{
					p+=para[j+i];
				}
				i=last-1;
			}
			else
				p+=para[i];
		}
		if(p!="")
			rVal.parameter.push(p);
		
		//rVal.parameter=para.split(",");
		
		for(var i=0;i<rVal.parameter.length;++i)
		{
			
			rVal.parameter[i]=CString.DataConvert(rVal.parameter[i]);
		}
		
		return rVal;
		
	}
	static ReplaceAll(_str : string,searchStr : string,replaceStr : string)
	{
		return _str.split(searchStr).join(replaceStr);
	}
	static ExtCut(_str : string)
	{
		var pos=_str.lastIndexOf(".");
		var name=_str.substr(0,pos);
		var ext=_str.substr(pos+1,_str.length-pos);
		ext=ext.toLowerCase();

		return {"name":name,"ext":ext};
	}
	static InChk(_str : string,_token : Array<string>)
	{
		for(let i=0;i<_str.length;++i)
		{
			for(let j=0;j<_token.length;++j)
			if(_str[i]==_token[j])
				return true;
		}

		return false;
	}
	static PathArrToFullPath(_path : Array<string>,_backSub=0)
	{
		let str="";
		for(let i=0;i<_path.length+_backSub;++i)
		{
			if(str!="")
				str+=".";
			str+=_path[i];
		}
		return str;
	}
	//a.b.c a는 생략됌  / 마지막 멤버에 넣음
	static FullPathArrToLastTarget(_target,_pathArr : Array<string>,_startOff=1)
	{

		for(let i=_startOff;i<_pathArr.length-1;++i)
		{
			let path=_pathArr[i];
			if(path[path.length-1]=="]")
			{
				let off=path.lastIndexOf("[");
				let index=Number(path.substring(off+1,path.length-1));
				path=path.substring(0,off);
				_target=_target[path][index];
			}
			else 
				_target=_target[path];
		}
		
		return _target;
		
	}
	static ExtractNumber(str) {
		const match = str.match(/[0-9]+/);
		return match ? parseInt(match[0], 10) : null;
	}
	static RemoveNumbers(str) {
		return str.replace(/[0-9]/g, "");
	}
	static InsertAt(str, index, insertStr) : string
	{
		return str.slice(0, index) + insertStr + str.slice(index);
	}
}