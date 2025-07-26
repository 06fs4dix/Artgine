var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { URLPatterns } from '../network/CServerMain.js';
import { CServerRouter } from '../network/CServerRouter.js';
import { CPool } from '../basic/CPool.js';
import { CORMCondition, CORMField } from '../network/CORM.js';
import { CSQLite } from '../network/CSQLite.js';
import { CUniqueID } from '../basic/CUniqueID.js';
async function postWithHttps(url, data, isHttps = true, headers = {}) {
    const lib = isHttps ? await import('https') : await import('http');
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(url);
        const defaultHeaders = {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(data.toString())
        };
        const allHeaders = Object.assign({}, defaultHeaders, headers);
        const options = {
            hostname: parsedUrl.hostname,
            path: parsedUrl.pathname + parsedUrl.search,
            method: 'POST',
            headers: allHeaders,
        };
        const req = lib.request(options, res => {
            let rawData = '';
            res.on('data', chunk => rawData += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(rawData));
                }
                catch (e) {
                    reject(e);
                }
            });
        });
        req.on('error', reject);
        req.write(data.toString());
        req.end();
    });
}
export class COAuthUser {
    m_id = '';
    m_properties = {};
}
CPool.On("CLocalDB", async () => {
    let CLocalDB = new CSQLite();
    await CLocalDB.Init();
    return CLocalDB;
}, "Product");
export class COAuthAPI {
    static redirectUri = "http://localhost:8050";
    m_clientID = null;
    m_clientSecret = null;
    m_code = null;
    m_state = null;
    m_accessToken = '';
    m_refreshToken = '';
    m_accessTokenExpiresIn = null;
    m_refreshTokenExpiresIn = null;
    constructor(_code, _state) {
        this.m_code = _code;
        this.m_state = _state;
    }
    async ExcuteKakaoUser() {
        try {
            const params = new URLSearchParams({
                grant_type: 'authorization_code',
                client_id: 'ad6b11b2c011ad95aadb7d8ec5658d13',
                code: this.m_code ?? '',
            });
            const tokenJson = await postWithHttps('https://kauth.kakao.com/oauth/token', params, true);
            this.m_accessToken = tokenJson.access_token;
            this.m_refreshToken = tokenJson.refresh_token;
            this.m_accessTokenExpiresIn = tokenJson.expires_in;
            this.m_refreshTokenExpiresIn = tokenJson.refresh_token_expires_in;
            const userParams = new URLSearchParams();
            const userJson = await postWithHttps('https://kapi.kakao.com/v2/user/me', userParams, true, {
                Authorization: `Bearer ${this.m_accessToken}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            });
            const user = new COAuthUser();
            user.m_id = String(userJson.id);
            user.m_properties['connected_at'] = userJson.connected_at;
            if (userJson.properties) {
                for (const key of Object.keys(userJson.properties)) {
                    user.m_properties[key] = userJson.properties[key];
                }
            }
            return user;
        }
        catch (e) {
            console.error(e);
            return null;
        }
    }
    async ExcuteNaverUser() {
        try {
            const params = new URLSearchParams({
                grant_type: 'authorization_code',
                client_id: 'UDp9HJZoGIarIZglhM2T',
                client_secret: 'zZHzfUW8ks',
                code: this.m_code ?? '',
                state: this.m_state ?? '',
            });
            const tokenJson = await postWithHttps('https://nid.naver.com/oauth2.0/token', params, true);
            this.m_accessToken = tokenJson.access_token;
            this.m_refreshToken = tokenJson.refresh_token;
            this.m_accessTokenExpiresIn = Number(tokenJson.expires_in);
            const userJson = await postWithHttps('https://openapi.naver.com/v1/nid/me', new URLSearchParams(), true, {
                Authorization: `Bearer ${this.m_accessToken}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            });
            const user = new COAuthUser();
            const response = userJson.response;
            for (const key of Object.keys(response)) {
                if (key === 'id')
                    user.m_id = response[key];
                else
                    user.m_properties[key] = response[key];
            }
            return user;
        }
        catch (e) {
            console.error(e);
            return null;
        }
    }
    async ExcuteGoogleUser() {
        try {
            const params = new URLSearchParams({
                grant_type: 'authorization_code',
                code: this.m_code ?? '',
                client_id: 'client_id',
                client_secret: 'secret',
                redirect_uri: COAuthAPI.redirectUri,
                state: this.m_state ?? '',
            });
            const tokenJson = await postWithHttps('https://oauth2.googleapis.com/token', params, true);
            this.m_accessToken = tokenJson.access_token;
            this.m_accessTokenExpiresIn = tokenJson.expires_in;
            const userJson = await new Promise((resolve, reject) => {
                import('https').then(https => {
                    const options = {
                        hostname: 'www.googleapis.com',
                        path: '/oauth2/v2/userinfo',
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${this.m_accessToken}`,
                        },
                    };
                    const req = https.request(options, res => {
                        let data = '';
                        res.on('data', chunk => data += chunk);
                        res.on('end', () => {
                            try {
                                resolve(JSON.parse(data));
                            }
                            catch (e) {
                                reject(e);
                            }
                        });
                    });
                    req.on('error', reject);
                    req.end();
                });
            });
            const user = new COAuthUser();
            user.m_id = userJson.id;
            return user;
        }
        catch (e) {
            console.error(e);
            return null;
        }
    }
}
let COAuthServer = class COAuthServer extends CServerRouter {
    constructor() {
        super();
        this.On("/OAuth/Kakao", async (_json, _req, _res) => {
            const code = _json.GetStr("code");
            let state = _json.GetStr("state");
            if (!state)
                state = _req.originalUrl;
            let str = this.Execute(code, state, "/OAuth/Kakao");
            return str;
        });
        this.On("/OAuth/Naver", async (_json, _req, _res) => {
            const code = _json.GetStr("code");
            let state = _json.GetStr("state");
            if (!state)
                state = _req.originalUrl;
            let str = this.Execute(code, state, "/OAuth/Naver");
            return str;
        });
        this.On("/OAuth/Google", async (_json, _req, _res) => {
            const code = _json.GetStr("code");
            let state = _json.GetStr("state");
            if (!state)
                state = _req.originalUrl;
            let str = this.Execute(code, state, "/OAuth/Google");
            return str;
        });
    }
    async Execute(code, state, fun) {
        const api = new COAuthAPI(code, state);
        let user = null;
        if (fun == "/OAuth/Kakao")
            user = await api.ExcuteKakaoUser();
        else if (fun == "/OAuth/Naver")
            user = await api.ExcuteNaverUser();
        else if (fun == "/OAuth/Google")
            user = await api.ExcuteGoogleUser();
        let str = "";
        if (user == null) {
            str += "<script>\n";
            str += "localStorage.setItem('privateKey',null);\n";
            str += "window.location.href =localStorage.getItem('returnURL');\n";
            str += "</script>\n";
            return str;
        }
        let sql = await CPool.Product("CLocalDB");
        var chk = await sql.Select("user_list", [new CORMCondition("_privateKey", "==", user.m_id, "and"),
            new CORMCondition("_lock", "==", 0, "and")], null, null);
        if (chk.length == 0) {
            var publicKey = CUniqueID.Get();
            await sql.Insert("user_list", [new CORMField("_privateKey", user.m_id), new CORMField("_email", ""),
                new CORMField("_publicKey", publicKey), new CORMField("_id", publicKey), new CORMField("_nick", publicKey),
                new CORMField("_loginType", "kakao")]);
        }
        CPool.Recycle(sql);
        str += "<script>\n";
        str += "localStorage.setItem('privateKey','" + user.m_id + "');\n";
        str += "window.location.href =localStorage.getItem('returnURL');\n";
        str += "</script>\n";
        return str;
    }
};
COAuthServer = __decorate([
    URLPatterns(["/OAuth", "/OAuth/Naver", "/OAuth/Google"])
], COAuthServer);
export { COAuthServer };
;
