import { CEvent } from "../basic/CEvent.js";
import { CObject } from "../basic/CObject.js";
import { CUtil } from "../basic/CUtil.js";
import { CTimer } from "../system/CTimer.js";
import { CUtilWeb } from "./CUtilWeb.js";


var gScriptMap=new Map<string,any>();

export class CScript extends CObject
{
    //key로 구분이 된다.
    static async Build(_key : string,_source : string,_github=false)
    {
        // 기존 모듈이 있는지 확인
        if (!gScriptMap.has(_key)) {
            // 없으면 컴파일해서 맵에 등록
            gScriptMap.set(_key, null);
            try {
                if(CUtil.IsNode())
                {
                    // Node.js 환경에서는 JavaScript로만 실행
                    // TypeScript 컴파일 과정 건너뛰기
                    
                    // 동적으로 fs와 path 모듈 로드
                    const fs = await import('fs');
                    const path = await import('path');
                    
                    // _source가 .js 파일 형태이고 import가 없으면 파일을 직접 import
                    if (_source.endsWith('.js') && !_source.includes('import')) {
                        const filePath = _source;
                        
                        if ((fs as any).default.existsSync(filePath)) {
                            // Windows 절대 경로를 file:// URL로 변환
                            let importPath = filePath;
                            if (filePath.match(/^[A-Za-z]:/)) {
                                // Windows 절대 경로인 경우 file:// URL로 변환
                                importPath = `file:///${filePath.replace(/\\/g, '/')}`;
                            }
                            
                            // 파일을 직접 import
                            //const module = await import(importPath);
                            const module = await import(`${importPath}?update=${Date.now()}`);
                            gScriptMap.set(_key, module);
                           
                           
                        } else {
                            console.error(`파일을 찾을 수 없음: ${filePath}`);
                            return null;
                        }
                    } else {
                        // 소스 코드인 경우 임시 파일 생성
                        _source = "//@sourceURL=" + _key + ".js\n" + _source;
                        
                        // Node.js에서 동적 모듈 생성 - 소스 코드를 그대로 사용
                        const moduleCode = _source;
                            
                        // 임시 파일 생성
                        const tempFile = (path as any).default.join(process.cwd(), `temp_${_key}.js`);
                        (fs as any).default.writeFileSync(tempFile, moduleCode);
                            
                        // Windows 절대 경로를 file:// URL로 변환
                        let importPath = tempFile;
                        if (tempFile.match(/^[A-Za-z]:/)) {
                            importPath = `file:///${tempFile.replace(/\\/g, '/')}`;
                        }
                            
                        // 동적 import
                        const module = await import(importPath);
                        gScriptMap.set(_key, module);
                        
                        
                        // ES6 모듈 캐시 추적
                        if (!(global as any).__importCache) {
                            (global as any).__importCache = new Map();
                        }
                        (global as any).__importCache.set(importPath, module);
                            
                        // 임시 파일 삭제
                        (fs as any).default.unlinkSync(tempFile);
                    }
                    
                    
                    
                }
                else
                {
                    _source=await CUtilWeb.TSImport(_source,false,_github);
                    if(_source.indexOf(":")!=-1)
                        _source=await CUtilWeb.TSToJS(_source);


                    // @sourceURL=dynamicModule.js
                    _source="//@sourceURL="+_key+".js\n"+_source;
                    const blob = new Blob([_source], { type: 'text/javascript' });
                    const url = URL.createObjectURL(blob);
                    const module = await import(url);
                    gScriptMap.set(_key, module);
                    
                    // URL 정리 (메모리 누수 방지)
                    URL.revokeObjectURL(url);
                }
                
            } catch (error) {
                console.error(`CScript.Exe 컴파일 오류 (${_key}):`, error);
                
                // 더 자세한 오류 정보 출력
                if (error instanceof Error) {
                    console.error(`오류 메시지: ${error.message}`);
                    console.error(`오류 스택: ${error.stack}`);
                } else {
                    console.error(`오류 타입: ${typeof error}`);
                    console.error(`오류 내용:`, error);
                }
                
                // 에러가 발생하면 맵에서 제거
                
                return null;
            }
        }
        
        // 기존 모듈 가져오기
        const module = gScriptMap.get(_key);
        if (module) return module;
        
        
        return null;
    }
    static Remove(_key : string)
    {
       
        gScriptMap.delete(_key);

        
    }
    static Clear()
    {
        // 각 모듈을 개별적으로 제거
        const keys = Array.from(gScriptMap.keys());
        for (const key of keys) {
            CScript.Remove(key);
        }
        
    }
    static Action(_data : Array<any>,_event :  ((...args: any[]) => any) | CEvent<(...args: any[]) => any>,count=0,delay=0,start=0,end=0)
    {
        let run=_data[0]["mTemp"]["mRun"];
        let timer : CTimer;
        if(_data[0]["mTemp"]["mTimer"]==null)
        {
            _data[0]["mTemp"]["mTimer"+run]=new CTimer();
            _data[0]["mTemp"]["mCount"+run]=0;
            _data[0]["mTemp"]["mTime"+run]=0;
            _data[0]["mTemp"]["mDelay"+run]=0;
        }
        timer=_data[0]["mTemp"]["mTimer"+run];
        let t=timer.Delay();
        _data[0]["mTemp"]["mDelay"+run]=_data[0]["mTemp"]["mDelay"+run]+t;
        _data[0]["mTemp"]["mTime"+run]=_data[0]["mTemp"]["mTime"+run]+t;

        if(count!=0 && _data[0]["mTemp"]["mCount"+run]>count)   return;
        if(delay!=0 && _data[0]["mTemp"]["mDelay"+run]<delay)   return;
        if(_data[0]["mTemp"]["mTime"+run]<start)   return;
        if(end!=0 && _data[0]["mTemp"]["mTime"+run]>end)   return;
        
        _data[0]["mTemp"]["mDelay"+run]=_data[0]["mTemp"]["mDelay"+run]-delay;
        _data[0]["mTemp"]["mCount"+run]=_data[0]["mTemp"]["mCount"+run]+1;
        
        
        if(_event instanceof CEvent)
            _event.Call();
        else
            _event();
        
    }

    static Value(_data : Array<any>,_key : string,_val=0,_off=0)
    {
        if(_data[_off][_key]==null) return 0;
        _data[_off][_key]=_val;
        return _data[_off][_key];
    }
    //import {CModal} from "artgine/basic/CModal.js"
    mSource=`
import {CScript} from "artgine/util/CScript.js"
export function main(_data : Array<any>)
{   
    return null;
}
`;
    mActiveFun="main";
    mKey="";
    mData=[{}];
    //mMoudle=null;
    async Exe()
    {
        if(this.mSource=="")    return;


        let moudle=await CScript.Build(this.mKey,this.mSource)
        if(moudle==null)    return;
        if(moudle[this.mActiveFun]==null)
        {
            for(let first in moudle)
            {
                this.mActiveFun=first;
                break;
            }
            if(moudle[this.mActiveFun]==null)   return;

        }
        if(this.mData[0]["mTemp"]==null)    this.mData[0]["mTemp"]={};
            
        
        this.mData[0]["mTemp"]["mRun"]=0;
        try {
            let next=moudle[this.mActiveFun](this.mData);
            if(next!=null)
                this.mActiveFun=next;
        } catch (error) {
            console.error(`CScript.Exe 런타임 오류 (${this.mKey}.${this.mActiveFun}):`, error);
            gScriptMap.set(this.mKey, null);//강제로 널해서 작동안되게
        }
    }
    EditHTMLInit(_div : HTMLDivElement)
	{
		super.EditHTMLInit(_div);
		var button=document.createElement("button");
		button.innerText="ScriptTool";
		button.onclick=()=>{
			if(window["ScriptTool"]!=null)
				window["ScriptTool"](this);
		};
		
		_div.append(button);

	}
    override IsShould(_member: string, _type: CObject.eShould): boolean 
    {
        if(_member=="mKey" || _member=="mData")
            return false;
        return super.IsShould(_member,_type);
    }
}
