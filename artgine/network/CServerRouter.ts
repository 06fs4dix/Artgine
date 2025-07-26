

import * as getRawBody from 'raw-body';

import express,{ Request, Response } from 'express';


import { CJSON } from '../basic/CJSON.js';
import { CConsol } from '../basic/CConsol.js';
import { CServer } from './CServerMain.js';
import { CEvent } from '../basic/CEvent.js';



export class CServerRouter extends CServer
{
    //JavaScript/TypeScript에서 정적(static) 메서드는 상속 클래스에서도 일반적으로 오버라이딩이 잘 작동하지 않습니다.
    mPath :string = null;
    constructor() 
    {
       super();
        
    }
    override Connect()
    {

        const router = express.Router();
        let info : Array<string>=CServer.FindURLPatterns(this);
        if(info==null)
        {
            return false;
        }
        for (const path of info) 
        {  
            (router as any)["all"](path, async (_req: Request, _res: Response) => {
               
                this.Do(_req,_res);
                
            });
            
            const normalizedPath = path.endsWith("/") ? path + "*" : path + "/*";
            (router as any)["all"](normalizedPath, async (_req: Request, _res: Response) => {
               
                this.Do(_req,_res);
                
            });
        }
       CConsol.Log("["+this.constructor.name+"]"+info+" Start",CConsol.eColor.blue);
            
        
        this.mPath=this.mMainServer.GetPath();
        this.mMainServer.GetApp().use(this.mPath,router);
    }

    
    // async Call(_func: string, _body: any, _req: any, _res: any) : Promise<string>
    // {
    //     return "";
    // }

    async extractBodyFromMultipart(rawBody: string, boundary:string) 
    {
            const result = new CJSON("");
            const parts = rawBody.split('--'+boundary);

    for (const part of parts) {
        if (part.includes("Content-Disposition")) {
            const nameMatch = part.match(/name="(.+?)"/);
            const value = part.split("\r\n\r\n")[1]?.replace(/\r\n--$/, '').trim();

            if (nameMatch && value) {
                Object.assign(result, new CJSON(value));
            }
        }
    }
    return result;
    }

    async Do(_req: Request, _res: Response)
    {
        let event=this.GetEvent(CEvent.eType.Message);
        if(event!=null)
        {
            let val=await event.CallAsync(_req, _res);
            if(val!=null)
            {
                _res.send(val);
                return;
            }
        }
            
        
        let func = _req.originalUrl.substring(this.mPath.length);
        let para=func.indexOf("?");
        if(para!=-1)   func=func.substring(0,para);
        //CConsol.Log(func);
        //console.log(func);
        let jsonData = new CJSON("");
        if(_req.headers['content-type'] != undefined) //get방식으로 접근하면 헤더에 타입이 없음
        {
            if(_req.headers['content-type'].includes('multipart')) //멀티파트인지 아닌지
            {
                const boundaryMatch = _req.headers['content-type'].match(/boundary=(.*)$/);
                const boundary = boundaryMatch?.[1];
                const raw = await getRawBody(_req, { encoding: true });

                jsonData = await this.extractBodyFromMultipart(raw,boundary);
            }
            else
            {
                if (typeof _req.body === 'string') {
                    jsonData = new CJSON(_req);
                }
                else if (typeof _req.body === 'object') {
                    
                    jsonData = new CJSON(_req.body);
                }
                if(para!=-1)
                {
                    var test = Object.fromEntries(Object.entries(_req.query))
                    Object.assign(jsonData, new CJSON(test));
                }   
            }
        }
        else
        {
            // body가 문자열로 들어온 경우
            if (typeof _req.body === 'string') {
                jsonData = new CJSON(_req);
            }
            // 만약 body가 객체면 JSON 요청
            else if (typeof _req.body === 'object') {
                
                jsonData = new CJSON(_req.body);
            }

            if(para!=-1)
            {
                var test = Object.fromEntries(Object.entries(_req.query))
                Object.assign(jsonData, new CJSON(test));
            }   
        }
        event=this.GetEvent(func);
        if(event!=null)
        {
            let rVal=await event.CallAsync(jsonData, _req, _res);
            if(rVal!=null)
            {
                _res.send(rVal);
                return;
            }
            
        }
        // else if(this[func]!=null)
        // {
        //     let rVal=await this[func](jsonData, _req, _res);
        //     if(rVal!=null)
        //     {
        //         _res.send(rVal);
        //         return;
        //     }
        // }
        _res.send("");
        //if(rVal!=null)
        
    }
    // async DoPost(_req: Request, _res: Response)
    // {
    //     this.DoGet(_req, _res);
    // }
}