import {CObject} from "../basic/CObject.js";
import {CString} from "../basic/CString.js";
import {CVec2} from "../geometry/CVec2.js";
import {CTexture} from "./CTexture.js";




export class CH5CMDList extends CObject
{
	mCMD : Array<CH5Cmd>;
	mSize : CVec2;
	mKey : string;

	constructor(_name:string="",_size:CVec2=new CVec2(),_cmd=new Array<CH5Cmd>()){
        super();
        this.mKey=_name;
		this.mSize=_size;
		this.mCMD=_cmd;
    }
	CmdToString() : string {
		let str = "";
		for(let cmd of this.mCMD) {
			let cmdStr = "CH5Canvas." + cmd.mName;
			cmdStr += cmd.CmdToString();
			cmdStr += ";\n";
			str += cmdStr;
		}
		return str;
	}
	// Push(_cmd:CH5Cmd){
	// 	this.m_cmd.push(_cmd);
	// }
	// Delete(_num:number){
	// 	this.m_cmd.splice(_num,1);
	// }
}

export class CH5Cmd extends CObject
{
	constructor(_name : string,_para : any);
	constructor(_name : string,_para : Array<any>);
	constructor(_name : string,_para : any)
	{
		super();
		this.mName=_name;
		if(_para instanceof Array) {
			for(let i = 0; i < _para.length; i++) {
				if(_para[i] instanceof Array) {
					_para[i] = JSON.stringify(_para[i]);
				}
			}
		}
		this.mParameter=_para;
	}
	public mName="";
	public mParameter=null;

	CmdToString() {
		let str = "(";
		for(let para of this.mParameter) {
			if(typeof(para) == "string" && para.startsWith("[") == false) {
				str += `"${para}",`;
			}
			else {
				str += para + ",";
			}
		}
		if(this.mParameter.length > 0) {
			str = str.substring(0, str.length - 1);
		}
		str += ")";
		return str;
	}
}

var gCanvas=document.createElement("canvas");
gCanvas.width=32;
gCanvas.height=32;
var gCTX=gCanvas.getContext('2d', { willReadFrequently: true });
var gPara=new Array(9);
var gLinear = true;
var gExp = true;
var gCMDStack=new Array<CH5Cmd>();


export class CH5Canvas
{
	static Cmd(_name : string,_para : any)	{	return new CH5Cmd(_name,_para);	}
	
	static FillRoundRect(left, top, right, bottom, round=2 * Math.PI)
	{
		var cmdVec=[
			CH5Canvas.Cmd("beginPath",[]),
			CH5Canvas.Cmd("moveTo",[left+round,top]),
			CH5Canvas.Cmd("arcTo",[left+right,top,left+right,top+bottom,round]),
			CH5Canvas.Cmd("arcTo",[left+right,top+bottom,left,top+bottom,round]),
			CH5Canvas.Cmd("arcTo",[left,top+bottom,left,top,round]),
			CH5Canvas.Cmd("arcTo",[left,top,left+right,top,round]),
			CH5Canvas.Cmd("fill",[]),
			
		];
		gCMDStack.push(...cmdVec);

		return cmdVec;		
	}
	static StrokeRect(x, y, width, height)
	{
		var cmdVec=[
			CH5Canvas.Cmd("strokeRect",[x,y,width,height]),	
		];
		gCMDStack.push(...cmdVec);
		return cmdVec;	
	}
	static FillRect(x, y, width, height)
	{
		var cmdVec=[
			CH5Canvas.Cmd("fillRect",[x,y,width,height]),	
		];
		gCMDStack.push(...cmdVec);
		return cmdVec;	
	}
	//시작X,시작Y,끝X,끝Y,라운드할 크기,라인
	static StrokeRoundRect(left, top, right, bottom, round=2*Math.PI,line=2)
	{
		var cmdVec=[
			CH5Canvas.Cmd("beginPath",[]),
			CH5Canvas.Cmd("moveTo",[left+round,top]),
			CH5Canvas.Cmd("arcTo",[left+right,top,left+right,top+bottom,round]),
			CH5Canvas.Cmd("arcTo",[left+right,top+bottom,left,top+bottom,round]),
			CH5Canvas.Cmd("arcTo",[left,top+bottom,left,top,round]),
			CH5Canvas.Cmd("arcTo",[left,top,left+right,top,round]),
			CH5Canvas.Cmd("lineWidth",line),
			CH5Canvas.Cmd("stroke",[]),
			
		];
		gCMDStack.push(...cmdVec);
		return cmdVec;		
	}
	static StrokeStyle(_style : string)
	{
		let cmdVec=[CH5Canvas.Cmd("strokeStyle",_style)];
		gCMDStack.push(...cmdVec);
		return cmdVec;
	}
	static FillStyle(_style : string)
	{
		let cmdVec=[CH5Canvas.Cmd("fillStyle",_style)];
		gCMDStack.push(...cmdVec);
		return cmdVec;
	}
	static LineWidth(size : number)
	{
		let cmdVec=[CH5Canvas.Cmd("lineWidth",size)];
		gCMDStack.push(...cmdVec);
		return cmdVec;

		
	}
	static StrokeText(_x,_y,_text,_size,_lineWidth)
	{
		
		gCTX.font="bold "+_size+"px arial";
		var xSize=gCTX.measureText(_text).width;
		
		let cmdVec=[CH5Canvas.Cmd("font","bold "+_size+"px arial"),CH5Canvas.Cmd("lineWidth",_lineWidth),
			CH5Canvas.Cmd("strokeText",[_text,_x-xSize*0.5,_y+_size*0.32])];
		gCMDStack.push(...cmdVec);
		return cmdVec;

	}
	static FillText(_x,_y,_text,_size)
	{
		gCTX.font="bold "+_size+"px arial";
		var xSize=gCTX.measureText(_text).width;
		let cmdVec=[CH5Canvas.Cmd("font","bold "+_size+"px arial"),CH5Canvas.Cmd("fillText",[_text,_x-xSize*0.5,_y+_size*0.32])];
		gCMDStack.push(...cmdVec);
		return cmdVec;


		return [];
	}
	//선형 그래디언트
	static FillLinearGradient(stx, sty, edx, edy,color : Array<{per,color}>)
	{
		var cmdList=[];
		var gra = gCTX.createLinearGradient(stx,sty,edx,edy);
		for(var each0 of color)
		{
			gra.addColorStop(each0.per,each0.color);
		}
		let cmdVec=[CH5Canvas.Cmd("fillStyle",gra)];
		gCMDStack.push(...cmdVec);
		return cmdVec;
		

	}
	//원형 그래디언트
	static FillRadialGradient(stx, sty, edx, edy,_stRad,_edRad,color : Array<{per,color}>)
	{
		var cmdList=[];
		var gra = gCTX.createRadialGradient(stx,sty,_stRad,edx,edy,_edRad);
		for(var each0 of color)
		{
			gra.addColorStop(each0.per,each0.color);
		}
		let cmdVec=[CH5Canvas.Cmd("fillStyle",gra)];
		gCMDStack.push(...cmdVec);
		return cmdVec;

	}
	static FillCircle(_centerX : number, _centerY : number, _radius : number, _startAngle : number = 0, _endAngle : number = 2 * Math.PI) {
		var cmdVec=[
			CH5Canvas.Cmd("beginPath",[]), 
            CH5Canvas.Cmd("arc",[_centerX,_centerY,_radius,_startAngle,_endAngle]),
            CH5Canvas.Cmd("fill", []),
		];
		gCMDStack.push(...cmdVec);
		return cmdVec;	
	}

	static StrokeCircle(_centerX : number, _centerY : number, _radius : number, _lineLength : number, _startAngle : number = 0, _endAngle : number = 2 * Math.PI) {
		var cmdVec=[
			CH5Canvas.Cmd("beginPath",[]), 
            CH5Canvas.Cmd("arc",[_centerX,_centerY,_radius,_startAngle,_endAngle]),
            CH5Canvas.Cmd("lineWidth",_lineLength),
            CH5Canvas.Cmd("stroke",[]),
		];
		gCMDStack.push(...cmdVec);
		return cmdVec;	
	}
	static DrawImage(_img:string|HTMLImageElement,_posX:number,_posY:number,_width:number=0,_height:number=0){
		var cmdVec=new Array<CH5Cmd>();
		if(_width!=0 && _height!=0)
			cmdVec.push(CH5Canvas.Cmd("drawImage",[_img,_posX,_posY,_width,_height]));
		else
			cmdVec.push(CH5Canvas.Cmd("drawImage",[_img,_posX,_posY]));
		gCMDStack.push(...cmdVec);
		return cmdVec;
	}

	
	static Init(w,h,_linear:boolean=true,_exp:boolean=true)
	{
		gCanvas.width=w;
		gCanvas.height=h;
		gCTX.clearRect(0,0,w,h);
		gLinear=_linear;
		gExp=_exp;
	}


	
	static async Draw(_pVec : Array<CH5Cmd>| Array<Array<CH5Cmd>>=null)
	{
		if(_pVec==null)
			_pVec=gCMDStack;


		let pDummy : Array<CH5Cmd>=new Array<CH5Cmd>();

		for(let i=0;i<_pVec.length;++i)
		{
			if(_pVec[i] instanceof CH5Cmd)
				pDummy.push(_pVec[i] as CH5Cmd);
			else
				pDummy.push(...(_pVec[i] as Array<CH5Cmd>));
		}
		 _pVec=pDummy;
		let errorcount=0;
		for(let i=0;i<_pVec.length;++i)
    	{
			if(_pVec[i].mParameter instanceof Array)
			{
				for(var j=0;j<_pVec[i].mParameter.length;++j)
				{
					gPara[j]=_pVec[i].mParameter[j];
					// if(_fr!=null && j==0 && typeof _pVec[i].m_parameter[j] =="string" && (_pVec[i].m_parameter[j].indexOf("png")!=-1 || _pVec[i].m_parameter[j].indexOf("jpg")!=-1))
					// {
					// 	var tex=_fr.Res().Find(_pVec[i].m_parameter[j]) as CTexture;
					// 	if(tex==null)
					// 	{
					// 		await _fr.Load().Load(_pVec[i].m_parameter[j]);
					// 		tex=_fr.Res().Find(_pVec[i].m_parameter[j]) as CTexture;
					// 	}
					// 	g_para[j]=tex.GetBuf()[0];
					// }
				}

				let func = Object.getOwnPropertyNames(CH5Canvas);
				let funcA = null;
				let funcDr=null;
				let ftype = true;
				let fcount = 1;

				if((typeof gCTX[_pVec[i].mName] == 'function') == false) {
					ftype = false;
					fcount=func.length;
				}
				for(let j=0;j<fcount;j++){

					if(ftype){
						funcA = gCTX[_pVec[i].mName].bind(gCTX);
					}
					else{
						funcA = CH5Canvas[func[j]];
						if((_pVec[i].mName == func[j]) == false)
							continue;
					}
					try{
						switch(_pVec[i].mParameter.length)
						{
							case 0: funcDr = funcA(); break;
							case 1: funcDr = funcA(gPara[0]); break;
							case 2: funcDr = funcA(gPara[0],gPara[1]); break;
							case 3:	funcDr = funcA(gPara[0],gPara[1],gPara[2]); break;
							case 4: funcDr = funcA(gPara[0],gPara[1],gPara[2],gPara[3]); break;
							case 5: funcDr = funcA(gPara[0],gPara[1],gPara[2],gPara[3],gPara[4]); break;
							case 6: funcDr = funcA(gPara[0],gPara[1],gPara[2],gPara[3],gPara[4],gPara[5]); break;
							case 7: funcDr = funcA(gPara[0],gPara[1],gPara[2],gPara[3],gPara[4],gPara[5],gPara[6]); break;
							case 8: funcDr = funcA(gPara[0],gPara[1],gPara[2],gPara[3],gPara[4],gPara[5],gPara[6],gPara[7]); break;
							case 9: funcDr = funcA(gPara[0],gPara[1],gPara[2],gPara[3],gPara[4],gPara[5],gPara[6],gPara[7],gPara[8]); break;
						}
						if(ftype == false){
							let CH=[];
							CH.push(...funcDr);
							let e = CH5Canvas.Draw(CH);
							errorcount += await e;
						}
					}catch{
						errorcount++;
					}
				}
			}
			else
				gCTX[_pVec[i].mName]=_pVec[i].mParameter;	
		}
		gCMDStack=new Array();
		return errorcount;
	}
	static GetDataURL()
	{
		return gCanvas.toDataURL();
	}
	
	static GetNewTex()
	{
		var tex=new CTexture();
		tex.SetFilter(gLinear?CTexture.eFilter.Linear:CTexture.eFilter.Neaest);
		tex.SetWrap(CTexture.eWrap.Clamp);
		
		//생길수 없는 버그다!!
		if(gCanvas.width==0 || gCanvas.height==0)
			return null;
		const imageData = gCTX.getImageData(0, 0, gCanvas.width, gCanvas.height);
    	
		
		if(gExp)
    		tex.SetMipMap(CTexture.eMipmap.GL);

    	tex.SetSize(gCanvas.width,gCanvas.height);
		tex.CreateBuf();
    	var buf = tex.GetBuf()[0];
    	var size=tex.GetWidth() * tex.GetHeight() * 4

    	for(var i=0;i<size;++i)
    	{
    		buf[i]=imageData.data[i];
    	}
    	return tex;
	}
	static PushImgData(_buf: Uint8Array,_posX:number,_posY:number,_bufWidth:number=0,_bufHeight:number=0)
	{
		if(_bufWidth == 0) _bufWidth = gCanvas.width;
		if(_bufHeight == 0) _bufHeight = gCanvas.height;
		//const imageData = g_ctx.getImageData(0, 0, g_canvas.width, g_canvas.height);
		const imageData = gCTX.getImageData(0, 0, _bufWidth, _bufHeight);
		for(var i=0;i<_buf.length;++i)
    	{
    		imageData.data[i]=_buf[i];
    	}
		gCTX.putImageData(imageData,_posX,_posY);

	}
	static PushSlicedImgData(_buf : Uint8Array, _bufW : number, _bufX : number, _bufY : number, _w : number, _h : number)
	{
		if(_w == 0) _w = gCanvas.width;
		if(_h == 0) _h = gCanvas.height;
		const imageData = gCTX.getImageData(0, 0, _w, _h);
		for(var y=0;y<_h;++y)
    	{
			for(var x = 0; x < _w; x++) 
			{
				for(let i = 0; i < 4; i++) {
					imageData.data[(x + y * _w)*4+i]=_buf[(_bufX + x + (_bufY + y) * _bufW)*4+i];
				}
			}
    	}
		gCTX.putImageData(imageData,0,0);
	}
	// static CreateTex(_ch5json:CCH5CMDList)
	// {
	// 	CH5Canvas.CreateCanvas(_ch5json.m_size.x,_ch5json.m_size.y);
	// 	CH5Canvas.Draw(_ch5json.m_cmd);
	// 	//_fr.Res().Set(_ch5json.m_key+".tex",CH5Canvas.GetTex());
		
	// }
	// static Register(_fw : CFramework,_key : string)
	// {
	// 	var tex=CH5Canvas.GetTex();
	// 	_fw.Ren().TMgr().Create(tex);
    // 	_fw.Res().Set(_key,tex);
	// }
	static DrawWithCH5File(_cmdList : CH5CMDList) {
		let cmdVec = [];
		for(let cmd of _cmdList.mCMD) {
			const params = [...cmd.mParameter];
			for(let i = 0; i < params.length; i++) {
				const param = params[i];
				if(typeof(param) == "string" && param.startsWith("[")) {
					params[i] = JSON.parse(param);
				}
			}
			let funcCmdVec = CH5Canvas[cmd.mName](...params);
			if(funcCmdVec == null) {
				continue;
			}
			else if(funcCmdVec instanceof Array) {
				cmdVec.push(...funcCmdVec);
			}
			else {
				cmdVec.push(funcCmdVec);
			}
		}
		CH5Canvas.Draw(cmdVec);
	}

	static DrawWithString(_str : string) {
		let funcArr : Array<string> = new Array<string>();
		let nowPos=-1;
		while(true){
			nowPos = _str.indexOf('CH5Canvas.',nowPos+1);
			if(nowPos == -1) break;
			nowPos += 10;
			let funcNameEndPos = _str.indexOf('(', nowPos);
			let funcName = _str.slice(nowPos, funcNameEndPos);
	
			if(CH5Canvas[funcName]) {
				funcNameEndPos = _str.indexOf(')', nowPos) + 1;
				funcArr.push(_str.slice(nowPos, funcNameEndPos));
			}
		}
		let analyzedFuncArr : Array<{"function":string,"parameter":Array<any>,"return":string}> = new Array();
		
		for(let i = 0; i < funcArr.length; i++) {
			analyzedFuncArr.push(CString.FunctionAnalyze(funcArr[i]));
		}

		let CountParamCount = (_func : string) : [number, number] => {
			const openParamIndex = _func.indexOf('(');
			const closeParamIndex = _func.indexOf(')');

			if(openParamIndex != -1 && closeParamIndex != -1) {
				const paramStr = _func.slice(openParamIndex + 1, closeParamIndex);
				const param = paramStr.split(',');

				let nonDefaultParamCount = 0;
				let defaultParamsCount = 0;
				for(let p of param) {
					if(p.indexOf('=') != -1) {
						defaultParamsCount++;
					} else {
						nonDefaultParamCount++;
					}
				}
				return [nonDefaultParamCount, defaultParamsCount];
			}
			return [0, 0];
		}

		//변수 개수 다르면 알려줌
		for(let analyzedFunc of analyzedFuncArr) {
			let params = analyzedFunc.parameter;
			let [nonDefaultParamCount, defaultParamCount] = CountParamCount(CH5Canvas[analyzedFunc.function].toString());
	
			if(params.length < nonDefaultParamCount) {
				console.error(analyzedFunc.function + "의 파라미터 수가 " + (nonDefaultParamCount - params.length) + "개 모자랍니다.");
				return;
			}
			if(params.length > nonDefaultParamCount + defaultParamCount) {
				console.error(analyzedFunc.function + "의 파라미터 수가 " + (params.length - nonDefaultParamCount - defaultParamCount) + "개 많습니다.");
				return;
			}
		}
	
		//변수 중에 계산해야 하는 것(0 + 1 등)이나 오브젝트 있으면 계산해줌
		for(let analyzedFunc of analyzedFuncArr) {
			for(let i = 0; i < analyzedFunc.parameter.length; i++) {
				let param = analyzedFunc.parameter[i];
				if(typeof(param)=='string') {
					try{
						let evaledParam = eval(param);
						if(evaledParam == "object") {
							analyzedFunc.parameter[i] = evaledParam;
						}
						else {
							analyzedFunc.parameter[i] = evaledParam;
						}
					} catch {
						//eval 불가능
					}
				}
			}
		}
	
		//함수 작동
		let cmdVec = [];
		for(let analyzedFunc of analyzedFuncArr) {
			let params = [];
			for(let param of analyzedFunc.parameter) {
				params.push(param);
			}
			let funcCmdVec = CH5Canvas[analyzedFunc.function](...params);
			if(funcCmdVec == null) {
				continue;
			}
			else if(funcCmdVec instanceof Array) {
				cmdVec.push(...funcCmdVec);
			}
			else {
				cmdVec.push(funcCmdVec);
			}
		}

		CH5Canvas.Draw(cmdVec);
	}
	static StringToCmdList(_str : string) {
		let size = new CVec2(256, 128);
		let arr = [];
	
		let funcArr : Array<string> = new Array<string>();
		let nowPos=-1;
		while(true){
			nowPos = _str.indexOf('CH5Canvas.',nowPos+1);
			if(nowPos == -1) break;
			nowPos += 10;
			let funcNameEndPos = _str.indexOf('(', nowPos);
			let funcName = _str.slice(nowPos, funcNameEndPos);
	
			if(CH5Canvas[funcName]) {
				funcNameEndPos = _str.indexOf(')', nowPos) + 1;
				funcArr.push(_str.slice(nowPos, funcNameEndPos));
			}
		}
		let analyzedFuncArr : Array<{"function":string,"parameter":Array<any>,"return":string}> = new Array();
		
		for(let i = 0; i < funcArr.length; i++) {
			analyzedFuncArr.push(CString.FunctionAnalyze(funcArr[i]));
		}
	
		let CountParamCount = (_func : string) : [number, number] => {
			const openParamIndex = _func.indexOf('(');
			const closeParamIndex = _func.indexOf(')');
	
			if(openParamIndex != -1 && closeParamIndex != -1) {
				const paramStr = _func.slice(openParamIndex + 1, closeParamIndex);
				const param = paramStr.split(',');
	
				let nonDefaultParamCount = 0;
				let defaultParamsCount = 0;
				for(let p of param) {
					if(p.indexOf('=') != -1) {
						defaultParamsCount++;
					} else {
						nonDefaultParamCount++;
					}
				}
				return [nonDefaultParamCount, defaultParamsCount];
			}
			return [0, 0];
		}
	
		//변수 개수 다르면 알려줌
		for(let analyzedFunc of analyzedFuncArr) {
			let params = analyzedFunc.parameter;
			let [nonDefaultParamCount, defaultParamCount] = CountParamCount(CH5Canvas[analyzedFunc.function].toString());
	
			if(params.length < nonDefaultParamCount) {
				console.error(analyzedFunc.function + "의 파라미터 수가 " + (nonDefaultParamCount - params.length) + "개 모자랍니다.");
				while(params.length != nonDefaultParamCount) {
					params.push(0);
				}
			}
			if(params.length > nonDefaultParamCount + defaultParamCount) {
				console.error(analyzedFunc.function + "의 파라미터 수가 " + (params.length - nonDefaultParamCount - defaultParamCount) + "개 많습니다.");
				while(params.length != nonDefaultParamCount) {
					params.splice(params.length - 1, 1);
				}
			}
		}
	
		for(let analyzedFunc of analyzedFuncArr) {
			for(let i = 0; i < analyzedFunc.parameter.length; i++) {
				let param = analyzedFunc.parameter[i];
				if(typeof(param)=='string') {
					try{
						let evaledParam = eval(param);
						if(evaledParam == "object") {
							analyzedFunc.parameter[i] = evaledParam;
						}
						else {
							analyzedFunc.parameter[i] = evaledParam;
						}
					} catch {
						//eval 불가능
					}
				}
			}
		}
	
		for(let analyzedFunc of analyzedFuncArr) {
			arr.push(new CH5Cmd(analyzedFunc.function, analyzedFunc.parameter));
		}
	
		return new CH5CMDList("", size, arr);
	}
	

	static GetContext()	{	return gCTX;	}
	static GetCanvas()	{	return gCanvas;	}

}