import { URLPatterns } from '../network/CServerMain.js';
import { CJSON } from '../basic/CJSON.js';
import { Request, Response } from 'express';
import { CAuthServer } from './CAuthServer.js';
import { CAI } from '../util/CAI.js';

/*
AI Chat Router
- /AIChat                            GET    AI.html serve
- /AIChat/sessions                   GET    session list
  (provider 목록은 /AIInfo/setting으로 이전됨 — CAIInfoRouter 참고)
- /AIChat/sessions/:id               GET    history.json
- /AIChat/sessions/:id               DELETE remove session + workspace
- /AIChat/session/config?id=         GET    세션 config 조회
- /AIChat/session/config?id=         POST   세션 config 저장 (workingDir, mcp, write)
- /AIChat/sessions/:id/upload?name=  POST   raw body -> uploads/<safe>
- /AIChat/ws                         WS     streaming chat

주의: CServerMain.ts의 정적 파일 차단 미들웨어가 '/ai/*' 경로를 전부 403으로 막기 때문에
(ai/ 디렉토리의 가이드·툴 소스 보호 목적), 이 라우터의 실제 경로는 반드시 '/ai/chat'이
아닌 '/AIChat'을 써야 한다. CAIInfoRouter가 '/AIInfo'를 쓰는 것과 같은 이유.

Workspace layout:
  proj/Home/AI/workspace/<sessionId>/
    ├── uploads/
    └── history.json
*/

type Role = 'user' | 'assistant';
// 'cmd'는 CAI.eProvider가 아니라 채팅 전용 의사 프로바이더다 — CLI를 거치지 않고 셸 명령을 그대로
// 실행해 그 출력을 답변으로 돌려준다(CAI.Cmd). eProvider에 넣지 않는 이유: CAIInfoRouter가
// Object.values(CAI.eProvider)로 설치/인증/사용량 조회 대상을 만들기 때문에, 셸이 그 목록에 끼면 안 된다.
// (터미널 라우터가 'cmd' | CAI.eProvider를 쓰는 것과 같은 패턴.)
type Provider = CAI.eProvider | 'cmd';

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

@URLPatterns(["/AIChat/sessions", "/AIChat/session", "/AIChat/session/config", "/AIChat/session/upload", "/AIChat/share", "/AIChat/share/file", "/AIChat/workspace"])
export class CAIChatRouter extends CAuthServer {
    constructor() {
        super();
        this.On("/AIChat/sessions",        this.onGetSessions.bind(this));
        this.On("/AIChat/session",         this.onSession.bind(this));
        this.On("/AIChat/session/config",  this.onSessionConfig.bind(this));
        this.On("/AIChat/session/upload",  this.onSessionUpload.bind(this));
        this.On("/AIChat/share",           this.onShare.bind(this));
        this.On("/AIChat/share/file",      this.onShareFile.bind(this));
        this.On("/AIChat/workspace",       this.onWorkspace.bind(this));
    }

    override Connect() { super.Connect(); this._connectImpl(); }
    _connectImpl() {}

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
