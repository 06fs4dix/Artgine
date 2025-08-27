import { CJSON } from '../basic/CJSON.js';
import { CServer } from './CServerMain.js';
export class CServerRouter extends CServer {
    mPath = null;
    constructor() {
        super();
    }
    Connect() {
    }
    async extractBodyFromMultipart(rawBody, boundary) {
        const result = new CJSON("");
        const parts = rawBody.split('--' + boundary);
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
    async Do(_req, _res) {
    }
}
import CServerRouter_imple from "../network_imple/CServerRouter.js";
CServerRouter_imple();
