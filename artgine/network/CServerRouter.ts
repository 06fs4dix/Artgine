


import { Request, Response } from 'express';
import { CJSON } from '../basic/CJSON.js';
import { CServer } from './CServerMain.js';



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

        
    }

    

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
        
     
        
    }

}
import CServerRouter_imple from "../network_imple/CServerRouter.js";
CServerRouter_imple();