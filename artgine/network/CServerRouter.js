import * as getRawBody from 'raw-body';
import express from 'express';
import { CJSON } from '../basic/CJSON.js';
import { CConsol } from '../basic/CConsol.js';
import { CServer } from './CServerMain.js';
import { CEvent } from '../basic/CEvent.js';
export class CServerRouter extends CServer {
    mPath = null;
    constructor() {
        super();
    }
    Connect() {
        const router = express.Router();
        let info = CServer.FindURLPatterns(this);
        if (info == null) {
            return false;
        }
        for (const path of info) {
            router["all"](path, async (_req, _res) => {
                this.Do(_req, _res);
            });
            const normalizedPath = path.endsWith("/") ? path + "*" : path + "/*";
            router["all"](normalizedPath, async (_req, _res) => {
                this.Do(_req, _res);
            });
        }
        CConsol.Log("[" + this.constructor.name + "]" + info + " Start", CConsol.eColor.blue);
        this.mPath = this.mMainServer.GetPath();
        this.mMainServer.GetApp().use(this.mPath, router);
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
        let event = this.GetEvent(CEvent.eType.Message);
        if (event != null) {
            let val = await event.CallAsync(_req, _res);
            if (val != null) {
                _res.send(val);
                return;
            }
        }
        let func = _req.originalUrl.substring(this.mPath.length);
        let para = func.indexOf("?");
        if (para != -1)
            func = func.substring(0, para);
        let jsonData = new CJSON("");
        if (_req.headers['content-type'] != undefined) {
            if (_req.headers['content-type'].includes('multipart')) {
                const boundaryMatch = _req.headers['content-type'].match(/boundary=(.*)$/);
                const boundary = boundaryMatch?.[1];
                const raw = await getRawBody(_req, { encoding: true });
                jsonData = await this.extractBodyFromMultipart(raw, boundary);
            }
            else {
                if (typeof _req.body === 'string') {
                    jsonData = new CJSON(_req);
                }
                else if (typeof _req.body === 'object') {
                    jsonData = new CJSON(_req.body);
                }
                if (para != -1) {
                    var test = Object.fromEntries(Object.entries(_req.query));
                    Object.assign(jsonData, new CJSON(test));
                }
            }
        }
        else {
            if (typeof _req.body === 'string') {
                jsonData = new CJSON(_req);
            }
            else if (typeof _req.body === 'object') {
                jsonData = new CJSON(_req.body);
            }
            if (para != -1) {
                var test = Object.fromEntries(Object.entries(_req.query));
                Object.assign(jsonData, new CJSON(test));
            }
        }
        event = this.GetEvent(func);
        if (event != null) {
            let rVal = await event.CallAsync(jsonData, _req, _res);
            if (rVal != null) {
                _res.send(rVal);
                return;
            }
        }
        if (!_res.headersSent) {
            _res.send("");
        }
    }
}
