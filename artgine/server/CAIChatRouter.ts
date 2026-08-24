import { URLPatterns } from '../network/CServerMain.js';
import { CJSON } from '../basic/CJSON.js';
import { Request, Response } from 'express';
import { CAuthServer } from './CAuthServer.js';
import { CAI } from '../util/CAI.js';

/*
AI Chat Router
- /AIChat/sessions                   GET    session list
  (provider 목록은 /AIInfo/setting으로 이전됨 — CAIInfoRouter 참고)
- /AIChat/session?id=                GET    history.json
- /AIChat/session?id=                DELETE remove session + workspace
- /AIChat/session/upload?id=&name=   POST   raw body -> uploads/<safe>
- /AIChat/workspace?id=&path=        GET    session workspace file
- /AIChat/chat                       POST   1:1 동기 대화
- /AIChat/ws                         WS     streaming chat

POST /AIChat/chat body (JSON):
  provider    string   claude|codex|grok|…|cmd
  model       string   (cmd면 무시)
  content     string   유저 메시지(대화)
  session     string?  세션 id — 없으면 신규 생성, 있으면 이어서 대화
  workingDir  string?  실행 경로(cwd) — CLI/도구가 돌아가는 디렉터리 (별칭: cwd, path)
  mdcopy      boolean? 실행 경로에 ROLE.md 복사 (workingDir 있을 때만, 기본 false)
  write       boolean? CLI write 권한 (기본 true)
  mcp         boolean? MCP 사용 (기본 false)

응답: { ok, session, messages: IMessage[] }  또는 { ok:false, msg, session?, messages? }

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

@URLPatterns(["/AIChat/sessions", "/AIChat/session", "/AIChat/session/upload", "/AIChat/workspace", "/AIChat/chat"])
export class CAIChatRouter extends CAuthServer {
    constructor() {
        super();
        this.On("/AIChat/sessions",        this.onGetSessions.bind(this));
        this.On("/AIChat/session",         this.onSession.bind(this));
        this.On("/AIChat/session/upload",  this.onSessionUpload.bind(this));
        this.On("/AIChat/workspace",       this.onWorkspace.bind(this));
        this.On("/AIChat/chat",            this.onChat.bind(this));
    }

    override Connect() { super.Connect(); this._connectImpl(); }
    _connectImpl() {}

    async onGetSessions(_json: CJSON, _req: Request, _res: Response): Promise<null> { return null; }
    async onSession(_json: CJSON, _req: Request, _res: Response): Promise<null> { return null; }
    async onSessionUpload(_json: CJSON, _req: Request, _res: Response): Promise<null> { return null; }
    async onWorkspace(_json: CJSON, _req: Request, _res: Response): Promise<null> { return null; }
    async onChat(_json: CJSON, _req: Request, _res: Response): Promise<null> { return null; }
}

export type { IMessage, ISessionMeta, IHistory, IAttachment, Provider, Role };

import CAIChatRouter_imple from '../server_imple/CAIChatRouter.js';
CAIChatRouter_imple();
