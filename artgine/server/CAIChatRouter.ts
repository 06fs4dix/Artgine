import { URLPatterns } from '../network/CServerMain.js';
import { CJSON } from '../basic/CJSON.js';
import { Request, Response } from 'express';
import { CAuthServer } from './CAuthServer.js';
import { CAI } from '../util/CAI.js';

/*
AI Chat Router
- /ai/chat                            GET    AI.html serve
- /ai/chat/sessions                   GET    session list
- /ai/chat/sessions/:id               GET    history.json
- /ai/chat/sessions/:id               DELETE remove session + workspace
- /ai/chat/session/config?id=         GET    세션 config 조회
- /ai/chat/session/config?id=         POST   세션 config 저장 (workingDir, mcp, allow)
- /ai/chat/sessions/:id/upload?name=  POST   raw body -> uploads/<safe>
- /ai/chat/ws                         WS     streaming chat

Workspace layout:
  proj/Home/AI/workspace/<sessionId>/
    ├── uploads/
    └── history.json
*/

type Role = 'user' | 'assistant';
type Provider = CAI.eProvider;

interface IAttachment { name: string; path: string; }
interface IMessage {
    role: Role; content: string;
    provider?: Provider; model?: string;
    attachments?: IAttachment[]; timestamp: number;
    senderIp?: string; senderUa?: string;
}
interface ISessionMeta {
    sessionId: string; title: string;
    provider: Provider; model: string;
    cliSessionId?: string;
    createdAt: number; updatedAt: number;
}
interface IHistory { meta: ISessionMeta; messages: IMessage[]; }

@URLPatterns(["/ai/chat/providers", "/ai/chat/sessions", "/ai/chat/session", "/ai/chat/session/config", "/ai/chat/session/upload", "/ai/chat/share", "/ai/chat/share/file", "/ai/chat/workspace"])
export class CAIChatRouter extends CAuthServer {
    constructor() {
        super();
        this.On("/ai/chat/providers",       this.onGetProviders.bind(this));
        this.On("/ai/chat/sessions",        this.onGetSessions.bind(this));
        this.On("/ai/chat/session",         this.onSession.bind(this));
        this.On("/ai/chat/session/config",  this.onSessionConfig.bind(this));
        this.On("/ai/chat/session/upload",  this.onSessionUpload.bind(this));
        this.On("/ai/chat/share",           this.onShare.bind(this));
        this.On("/ai/chat/share/file",      this.onShareFile.bind(this));
        this.On("/ai/chat/workspace",       this.onWorkspace.bind(this));
    }

    override Connect() { super.Connect(); this._connectImpl(); }
    _connectImpl() {}

    onGetProviders(_json: CJSON, _req: Request, _res: Response): null { return null; }
    async onGetSessions(_json: CJSON, _req: Request, _res: Response): Promise<null> { return null; }
    async onSession(_json: CJSON, _req: Request, _res: Response): Promise<null> { return null; }
    async onSessionConfig(_json: CJSON, _req: Request, _res: Response): Promise<null> { return null; }
    async onSessionUpload(_json: CJSON, _req: Request, _res: Response): Promise<null> { return null; }
    async onShare(_json: CJSON, _req: Request, _res: Response): Promise<null> { return null; }
    async onShareFile(_json: CJSON, _req: Request, _res: Response): Promise<null> { return null; }
    async onWorkspace(_json: CJSON, _req: Request, _res: Response): Promise<null> { return null; }
}

export type { IMessage, ISessionMeta, IHistory, IAttachment, Provider, Role };

import CAIChatRouter_imple from '../server_imple/CAIChatRouter.js';
CAIChatRouter_imple();
