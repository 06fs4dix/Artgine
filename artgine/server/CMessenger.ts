import { CORMField, CRDBMS } from '../network/CORM.js';
import { CSQLite } from '../network/CSQLite.js';
import { marked, Renderer } from '../external/esnext/md/marked.esm.js';
import { CMail } from '../network/CMail.js';
import { CMailAccount } from '../network/CMailAccount.js';

// 텔레그램 HTML parse_mode가 아는 태그(b/strong, i/em, u, s/del, a, code, pre, blockquote)만 남기고
// 나머지(h1~h6, ul/ol/li, table, img 등 — 텔레그램이 모르는 태그가 하나라도 섞이면 sendMessage가
// 통째로 400을 낸다)는 굵게/불릿/평문으로 미리 풀어써서 렌더링하는 marked 커스텀 렌더러.
// Object.create(new Renderer())로 프로토타입을 잇는다 — 여기서 오버라이드하지 않는 메서드
// (strong/em/del/codespan/link/br/text/code/blockquote/html)는 기본 Renderer 그대로 두는데,
// 마침 그 기본 출력(<strong> <em> <code> <pre> <a href> 등)이 전부 텔레그램 지원 태그와 일치한다.
const sTelegramRenderer: any = Object.assign(Object.create(new (Renderer as any)()), {
    heading: (text: string) => `<b>${text}</b>\n`,
    hr: () => '\n',
    list: (body: string) => body,
    listitem: (text: string) => `• ${text}\n`,
    checkbox: (checked: boolean) => (checked ? '☑ ' : '☐ '),
    paragraph: (text: string) => `${text}\n\n`,
    table: (header: string, body: string) => `${header}${body}\n`,
    tablerow: (content: string) => `${content}\n`,
    tablecell: (content: string) => `${content} | `,
    image: (_href: string, _title: string, text: string) => text,
});

// 메신저(Telegram / Discord) 봇 하나를 대화 세션 하나에 묶어 텍스트를 주고받는 큐.
//
// ── 왜 큐인가 ───────────────────────────────────────────────────────────────
// 봇은 사람에게 먼저 말을 걸 수 없다. 유저가 봇에게 먼저 말을 걸어야 보낼 곳(chatKey)이 생긴다.
// 그래서 Send는 즉시 발신이 아니라 '발신 대기(pending)'로 큐에 넣고, chatKey가 붙는 순간(=Recv가
// 첫 수신을 처리하는 시점) 밀린 것부터 순서대로 내보낸다. 덕분에 Send는 바인딩 전에도 실패하지 않는다.
//
// ── 왜 Recv가 유저 발신만 돌려주는가 ────────────────────────────────────────
// 호출부(터미널)는 Recv 결과를 그대로 세션 입력으로 주입한다. 봇이 보낸 것까지 돌려주면 CLI가 자기
// 답변을 새 질문으로 다시 받아 무한히 되받는다. 그래서 방향(dir)을 나눠 'in'만 반환한다.
// 봇 발신도 큐에는 남으므로(dir='out') 나중에 전체 대화를 시간순으로 조회하는 건 그대로 가능하다.
//
// ── 봇 하나 = 세션 하나 ─────────────────────────────────────────────────────
// 같은 토큰으로 Create를 다시 부르면 이전 세션은 'dead'가 되고 그 sessionId로는 Send/Recv가 에러다.
// 세션이 하나뿐이라 수신 커서를 세션 레코드에 그냥 둘 수 있다(봇당 커서가 하나뿐이라 여러 세션이
// 서로의 메시지를 훔쳐갈 여지가 없다).
//
// ── 두 플랫폼의 차이(왜 chatKey/cursor가 문자열인가) ────────────────────────
// 텔레그램: getUpdates가 봇 앞으로 온 것만 커서(offset)와 함께 돌려준다. 봇 자신의 발언은 안 온다.
// 디스코드: 수신 전용 API가 없고 '채널 히스토리 읽기'로 흉내낸다. 그래서 (a) 어느 채널을 볼지 직접
//   찾아야 하고 (b) 봇 자신이 보낸 메시지도 같이 읽히므로 반드시 걸러내야 한다(안 그러면 CLI 답변이
//   다시 입력으로 들어가 무한루프다).
// 디스코드 ID(스노플레이크)는 19자리라 Number.MAX_SAFE_INTEGER(2^53)를 넘는다. JS number로 읽으면
// 값이 뭉개져 커서가 영구히 어긋나므로, chatKey/cursor는 플랫폼 공통으로 문자열이다.

export type MessengerSessionRecord = {
    id: number;
    platform: string;   // 'telegram' | 'discord' | 'email'
    token: string;
    botName: string;    // 봇 표시 이름
    chatKey: string;    // 보낼 곳. ''이면 아직 유저가 말을 걸지 않음(미바인딩)
    cursor: string;     // 다음 수신 요청에 넘길 커서(텔레그램 offset / 디스코드 메시지 스노플레이크)
    link: string;       // 유저에게 건네줄 접속 링크(플랫폼마다 형태가 달라 여기서 만들어 둔다)
    state: string;      // 'pending' | 'active' | 'dead'
    createdAt: number;  // YYYYMMDDHHmmss
};

export type MessengerMessage = {
    who: string;
    date: number;       // 유닉스 초
    text: string;
};

export class CMessenger {
    private static sDB: CRDBMS = null;
    private static sSessionTable = 'messenger_session';
    private static sQueueTable = 'messenger_queue';

    public static readonly ePlatform = { Telegram: 'telegram', Discord: 'discord', Email: 'email' };

    // 메시지 1건 상한: 텔레그램 4096, 디스코드 2000. 이모지·한글이 UTF-16 서로게이트로 쪼개지면
    // 400이 나므로 여유를 두고 자른다. 자르기는 Send 시점에 하고 큐에는 '조각 1개 = 행 1개'로 넣는다 —
    // 그래야 Flush가 행 하나당 API 한 번이라 부분 실패 처리가 단순해진다.
    // 이메일은 사실상 길이 제한이 없어(수백 KB도 통과) 자를 필요가 없는 큰 값을 둔다.
    private static readonly sTextLimit: { [k: string]: number } = { telegram: 3800, discord: 1900, email: 1000000 };
    // Flush 재시도 상한. 넘으면 'failed'로 떨궈 무한 재시도를 막는다.
    private static readonly sFailMax = 5;

    private static readonly sDiscordAPI = 'https://discord.com/api/v10';
    // 디스코드 스노플레이크의 기준시각(2015-01-01). id >> 22 + 이 값 = 생성시각(ms).
    private static readonly sDiscordEpoch = 1420070400000;
    // 초대 링크에 요구할 권한: VIEW_CHANNEL(1024) + SEND_MESSAGES(2048) + READ_MESSAGE_HISTORY(65536).
    private static readonly sDiscordPerm = 68608;
    // 미바인딩 상태에서 후보 채널을 훑는 비용을 제한한다(탐색은 붙기 전까지만 반복된다).
    private static readonly sDiscordScanGuild = 5;
    private static readonly sDiscordScanChannel = 20;
    private static readonly sDiscordScanTerm = 60000;   // 후보 채널 목록 캐시 수명
    // 세션별 채널 탐색 캐시. DB에 남길 이유가 없는 순수 비용 절감용이라 메모리에 둔다.
    private static sScan = new Map<number, { at: number; chans: string[] }>();
    // 발신 중인 세션. Flush 중복 진입을 막는다(아래 Flush 주석 참조).
    private static sFlushing = new Set<number>();

    private static async Init(): Promise<CRDBMS> {
        if (CMessenger.sDB != null) return CMessenger.sDB;

        const db = new CSQLite();
        await db.Init();

        // 구 스키마 정리. CREATE TABLE IF NOT EXISTS는 테이블이 이미 있으면 새 컬럼을 추가해주지
        // 않으므로, 코드의 필드 목록이 늘어나도(예: platform 추가) 예전에 만들어진 실 테이블에는
        // 그 컬럼이 그냥 없다 — GetAllSessions() 등이 undefined를 돌려주는 형태로 조용히 깨진다.
        // chatKey(멀티플랫폼 이전엔 chatId/offset이 INTEGER였다 — 디스코드 스노플레이크는 2^53을
        // 넘어 그대로 두면 JS에서 값이 뭉개진다)와 platform 둘 다 있어야 최신 스키마로 본다.
        // SQLite는 ALTER로 컬럼을 붙일 수는 있지만 타입까지 바꾸지는 못해 어차피 재생성이 필요하고,
        // 이 표는 서버가 살아있는 동안만 의미가 있으므로(연결 정보는 PtyEntry 메모리에만 있어
        // 재시작하면 어차피 전부 끊긴다) 버리고 다시 만든다.
        const tables = await db.GetCollection();
        if (Array.isArray(tables) && tables.includes(CMessenger.sSessionTable)) {
            const cols = await db.GetProjection(CMessenger.sSessionTable);
            if (!Array.isArray(cols) || !cols.includes('chatKey') || !cols.includes('platform')) {
                await db.Send(`DROP TABLE IF EXISTS ${CMessenger.sSessionTable}`);
                await db.Send(`DROP TABLE IF EXISTS ${CMessenger.sQueueTable}`);
            }
        }

        // CreateCollection은 '양의 정수 값을 가진 첫 필드'를 AUTOINCREMENT PK로 잡는다.
        // 그래서 id만 1이고 나머지 숫자 필드는 반드시 0이어야 한다(CWorkOrder와 같은 규칙).
        await db.CreateCollection(CMessenger.sSessionTable, [
            new CORMField('id', 1),
            new CORMField('platform', ''),
            new CORMField('token', ''),
            new CORMField('botName', ''),
            new CORMField('chatKey', ''),
            new CORMField('cursor', ''),
            new CORMField('link', ''),
            new CORMField('state', 'pending'),
            new CORMField('createdAt', 0),
        ]);

        await db.CreateCollection(CMessenger.sQueueTable, [
            new CORMField('id', 1),
            new CORMField('sessionId', 0),
            new CORMField('dir', ''),        // 'in'(유저→서버) | 'out'(서버→유저)
            new CORMField('who', ''),
            new CORMField('date', 0),
            new CORMField('msgKey', ''),     // 원본 메시지 식별자(추적용)
            new CORMField('text', ''),
            new CORMField('state', ''),      // in: 'recv'|'read'  out: 'pending'|'sent'|'failed'
            new CORMField('fail', 0),
        ]);

        CMessenger.sDB = db;
        return db;
    }

    // ---------------- 공개 API ----------------

    // 토큰 생김새로 플랫폼을 알아낸다. 모르면 ''.
    // 세 형식은 겹치지 않는다 — 텔레그램은 '<봇id>:<시크릿>'이라 콜론이 있고 점이 없으며,
    // 디스코드는 '<봇id를 base64한 것>.<타임스탬프>.<HMAC>'이라 점이 둘이고 콜론이 없다.
    // 이메일은 '<로컬파트>@<도메인>' 형태라 앞 둘과 겹칠 일이 없다.
    // 덕분에 호출부가 플랫폼을 따로 물어보지 않아도 된다.
    public static Detect(_token: string): string {
        const token = (_token ?? '').trim();
        if (/^\d{5,}:[\w-]{20,}$/.test(token)) return CMessenger.ePlatform.Telegram;
        if (/^[\w-]{20,}\.[\w-]{4,}\.[\w-]{20,}$/.test(token)) return CMessenger.ePlatform.Discord;
        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(token)) return CMessenger.ePlatform.Email;
        return '';
    }

    // 봇 토큰(텔레그램/디스코드) 또는 상대 이메일 주소(이메일)로 세션을 연다. 같은 token의 기존
    // 세션은 전부 'dead'로 내린다. 반환값이 이후 Send/Recv에 쓰는 세션 번호다.
    // _platform을 비우거나 'auto'로 주면 형식으로 판별한다.
    public static async Create(_platform: string, _token: string): Promise<number> {
        const token = (_token ?? '').trim();
        if (token === '') throw new Error('CMessenger: token is empty');

        let platform = (_platform ?? '').trim().toLowerCase();
        if (platform === '' || platform === 'auto') {
            platform = CMessenger.Detect(token);
            if (platform === '') throw new Error('CMessenger: cannot tell the platform from this token (expected a Telegram/Discord bot token or an email address)');
        }
        if (platform !== CMessenger.ePlatform.Telegram && platform !== CMessenger.ePlatform.Discord && platform !== CMessenger.ePlatform.Email) {
            throw new Error(`CMessenger: unsupported platform '${_platform}'`);
        }

        // 이메일은 '봇'이 아니라 상대방 주소다 — 발신/수신은 별도로 설정해둔 계정(SMTP/IMAP) 하나를
        // 공유해서 쓴다. 그 계정이 아직 설정 안 돼 있으면 세션을 만들기 전에 여기서 막는다.
        if (platform === CMessenger.ePlatform.Email) {
            const account = CMailAccount.Load();
            if (!CMailAccount.IsConfigured(account)) {
                throw new Error('CMessenger: mail account is not configured yet — set it up first (Email button)');
            }
        }

        // 토큰이 살아있는지 여기서 확인해 둔다. 잘못된 토큰이면 세션을 만들기 전에 실패하는 게 낫다.
        // 이메일은 '봇 신원 조회' 개념이 없어(상대 주소를 그대로 표시 이름으로 쓴다) 건너뛴다.
        const me = platform === CMessenger.ePlatform.Email
            ? { name: token, link: '' }
            : await CMessenger.GetMe(platform, token);

        const db = await CMessenger.Init();
        await db.Send(`UPDATE ${CMessenger.sSessionTable} SET state = 'dead' WHERE token = ?`, [token]);

        // 등록 시점을 기준선으로 삼는다 — 밀려 있던 과거 메시지는 버리고 이후 것만 받는다.
        // (CConversationReader가 "등록 시 커서를 현재 끝에 둔다"고 한 것과 같은 원칙.)
        // 디스코드는 '지금'에 해당하는 가짜 스노플레이크를 만들어 커서 초기값으로 쓴다. 텔레그램/이메일은
        // 커서를 미리 알 수 없어 0으로 두고, 아래에서 한 번 드레인해 끝으로 옮긴다.
        const cursor = platform === CMessenger.ePlatform.Discord ? CMessenger.DiscordNowKey() : '0';

        // 텔레그램/디스코드는 상대가 먼저 말을 걸어야 chatKey가 붙지만(pending), 이메일은 주소를
        // 이미 알고 있으므로 등록 즉시 그 주소로 바인딩하고 active로 시작한다.
        const initialChatKey = platform === CMessenger.ePlatform.Email ? token : '';
        const initialState = platform === CMessenger.ePlatform.Email ? 'active' : 'pending';

        const createdAt = CMessenger.Now();
        await db.Send(
            `INSERT INTO ${CMessenger.sSessionTable} (platform, token, botName, chatKey, cursor, link, state, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [platform, token, me.name, initialChatKey, cursor, me.link, initialState, createdAt]
        );
        const rows = await db.Recv(
            `SELECT id FROM ${CMessenger.sSessionTable} WHERE token = ? AND state != 'dead' ORDER BY id DESC LIMIT 1`,
            [token]
        );
        if (rows == null || rows.length === 0) throw new Error('CMessenger: failed to create session');
        const id = Number(rows[0][0]);

        // 텔레그램/이메일 기준선 드레인.
        // 텔레그램은 그 offset으로 getUpdates를 '실제 호출'해야 이전 업데이트를 지운다. 커서를 로컬에만
        // 적어두고 다음 호출 전에 세션이 바뀌면(같은 봇 재등록 등) 새 세션이 offset=0부터 시작해 옛
        // 메시지를 다시 읽고, 그게 터미널에 그대로 주입된다.
        // 이메일은 계정 받은편지함에 이미 쌓여 있던 과거 메일을 전부 새 메시지로 읽어버리는 걸 막으려고
        // 커서만 지금 시점(최신 UID)까지 전진시킨다(본문은 버린다).
        //
        // 단 chatKey 바인딩은 살린다(텔레그램: 유저가 등록 전에 이미 /start를 눌러둔 경우). 이메일은
        // 어차피 위에서 바로 바인딩했으므로 영향 없다.
        if (platform === CMessenger.ePlatform.Telegram || platform === CMessenger.ePlatform.Email) {
            const ses = await CMessenger.GetSession(id);
            try { await CMessenger.Poll(ses, false); } catch { /* 첫 드레인 실패는 치명적이지 않다 — 다음 Recv가 이어받는다 */ }
        }
        return id;
    }

    // 서버 → 유저. 큐에 넣고 chatKey가 이미 붙어 있으면 그 자리에서 내보낸다.
    // 아직 유저가 말을 걸지 않았으면 pending으로 남아 다음 Recv 때 함께 나간다(에러 아님).
    public static async Send(_sessionId: number, _from: string, _message: string): Promise<void> {
        const ses = await CMessenger.GetSession(_sessionId);
        const db = await CMessenger.Init();

        const date = Math.floor(Date.now() / 1000);
        for (const part of CMessenger.SplitText(_message ?? '', CMessenger.sTextLimit[ses.platform] ?? 1900)) {
            await db.Send(
                `INSERT INTO ${CMessenger.sQueueTable} (sessionId, dir, who, date, msgKey, text, state, fail) VALUES (?, 'out', ?, ?, '', ?, 'pending', 0)`,
                [ses.id, _from ?? '', date, part]
            );
        }
        await CMessenger.Flush(ses);
    }

    // 유저 → 서버. 수신을 한 번 드레인해 큐를 채우고, 아직 안 돌려준 유저 메시지를 전부 반환한다.
    // 반환한 건 'read'로 마킹하므로 다음 호출에 다시 나오지 않는다. 없으면 빈 배열.
    //
    // 주의: 여기서 곧바로 read 처리하므로, 호출부가 결과를 세션에 주입하지 못할 상황(작업 중,
    // 권한 승인 화면 등)이면 Recv를 부르기 전에 걸러야 한다. Recv 안에서 세션 상태를 보지 않는 것은
    // 메신저가 터미널을 알지 않게 하기 위해서다.
    public static async Recv(_sessionId: number): Promise<MessengerMessage[]> {
        const ses = await CMessenger.GetSession(_sessionId);
        const db = await CMessenger.Init();

        await CMessenger.Poll(ses);
        await CMessenger.Flush(ses);

        const rows = await db.Recv(
            `SELECT id, who, date, text FROM ${CMessenger.sQueueTable} WHERE sessionId = ? AND dir = 'in' AND state = 'recv' ORDER BY id ASC`,
            [ses.id]
        );
        if (rows == null || rows.length === 0) return [];

        const out: MessengerMessage[] = [];
        for (const row of rows) {
            await db.Send(`UPDATE ${CMessenger.sQueueTable} SET state = 'read' WHERE id = ?`, [Number(row[0])]);
            out.push({ who: String(row[1]), date: Number(row[2]), text: String(row[3]) });
        }
        return out;
    }

    // 죽지 않은(non-dead) 메신저 세션 전체 목록. 토큰은 뺀다.
    public static async GetAllSessions(): Promise<Omit<MessengerSessionRecord, 'token'>[]> {
        const db = await CMessenger.Init();
        const rows = await db.Recv(
            `SELECT id, platform, token, botName, chatKey, cursor, link, state, createdAt FROM ${CMessenger.sSessionTable} WHERE state != 'dead' ORDER BY id DESC`,
            []
        );
        if (rows == null || rows.length === 0) return [];
        return rows.map(r => {
            const s = CMessenger.RowToSession(r);
            return { id: s.id, platform: s.platform, botName: s.botName, chatKey: s.chatKey, cursor: s.cursor, link: s.link, state: s.state, createdAt: s.createdAt };
        });
    }

    // 특정 세션의 in/out 메시지 로그. 최신 limit건을 시간순으로 반환한다.
    public static async GetLog(_sessionId: number, _limit = 50): Promise<{ dir: string; who: string; date: number; text: string }[]> {
        const db = await CMessenger.Init();
        const rows = await db.Recv(
            `SELECT dir, who, date, text FROM ${CMessenger.sQueueTable} WHERE sessionId = ? ORDER BY id DESC LIMIT ?`,
            [_sessionId, Math.min(_limit, 200)]
        );
        if (rows == null || rows.length === 0) return [];
        return rows.reverse().map(r => ({
            dir: String(r[0]),
            who: String(r[1]),
            date: Number(r[2]),
            text: String(r[3]),
        }));
    }

    // 커서를 '지금'으로 다시 당긴다(본문은 버림) — 링크할 때 부른다. 등록(Create) 시점 이후 링크
    // 전까지 쌓인 밀린 메시지를 무시하고, 그 시점부터 새로 오는 것만 받고 싶을 때 쓴다.
    // 텔레그램/이메일은 실제로 한 번 드레인해야 커서가 전진하고(Poll 참조), 디스코드는 '지금'에
    // 해당하는 스노플레이크를 계산해 바로 대입할 수 있어 API 호출이 필요 없다.
    public static async ResetCursor(_sessionId: number): Promise<void> {
        const ses = await CMessenger.GetSession(_sessionId);
        if (ses.platform === CMessenger.ePlatform.Discord) {
            await CMessenger.SetCursor(ses, CMessenger.DiscordNowKey());
            return;
        }
        try { await CMessenger.Poll(ses, false); } catch { /* 실패해도 링크 자체는 막지 않는다 — 다음 Recv가 이어받는다 */ }
    }

    // 세션 상태 조회(UI 표시용). 토큰은 그 봇으로 무엇이든 할 수 있는 자격증명이라 일부러 뺀다.
    // 죽은 세션이면 Send/Recv와 마찬가지로 에러다 — 호출부가 연결을 정리할 계기가 된다.
    public static async GetInfo(_sessionId: number): Promise<Omit<MessengerSessionRecord, 'token'>> {
        const ses = await CMessenger.GetSession(_sessionId);
        return {
            id: ses.id, platform: ses.platform, botName: ses.botName, chatKey: ses.chatKey,
            cursor: ses.cursor, link: ses.link, state: ses.state, createdAt: ses.createdAt,
        };
    }

    // ---------------- 내부: 공통 ----------------

    private static async GetSession(_sessionId: number): Promise<MessengerSessionRecord> {
        const db = await CMessenger.Init();
        const rows = await db.Recv(
            `SELECT id, platform, token, botName, chatKey, cursor, link, state, createdAt FROM ${CMessenger.sSessionTable} WHERE id = ?`,
            [_sessionId]
        );
        if (rows == null || rows.length === 0) throw new Error(`CMessenger: session ${_sessionId} not found`);
        const ses = CMessenger.RowToSession(rows[0]);
        if (ses.state === 'dead') throw new Error(`CMessenger: session ${_sessionId} is dead`);
        return ses;
    }

    private static async GetMe(_platform: string, _token: string): Promise<{ name: string; link: string }> {
        if (_platform === CMessenger.ePlatform.Telegram) {
            const res: any = await CMessenger.CallTelegram(_token, 'getMe', null);
            const name = res?.result?.username;
            if (typeof name !== 'string' || name === '') throw new Error('CMessenger: getMe returned no username');
            // 텔레그램은 봇 username만 알면 누구나 DM을 열 수 있다.
            return { name, link: `https://t.me/${encodeURIComponent(name)}` };
        }
        const me: any = await CMessenger.CallDiscord(_token, '/users/@me');
        const name = me?.username;
        const appId = me?.id;
        if (typeof name !== 'string' || name === '') throw new Error('CMessenger: /users/@me returned no username');
        // 디스코드 봇에는 DM 링크가 없다. 유저가 자기 서버에 봇을 초대해야 대화가 가능하므로
        // 건네줄 링크는 초대 URL이다.
        //
        // integration_type=0(길드 설치)을 반드시 붙인다. 디스코드가 유저 설치(=1) 앱을 도입한 뒤로
        // 이걸 생략하면 앱의 기본 설치 컨텍스트를 따라가는데, 그게 유저 설치면 서버·권한 개념이 없어
        // 권한 목록에 자리표시자 문구가 뜨고 "필드 누락"으로 끝난다.
        return {
            name,
            link: `https://discord.com/oauth2/authorize?client_id=${encodeURIComponent(String(appId))}`
                + `&scope=bot&permissions=${CMessenger.sDiscordPerm}&integration_type=0`,
        };
    }

    // 수신 드레인. _store=false면 바인딩과 커서 전진만 하고 본문은 큐에 넣지 않는다(기준선 드레인).
    private static async Poll(_ses: MessengerSessionRecord, _store = true): Promise<void> {
        if (_ses.platform === CMessenger.ePlatform.Discord) return await CMessenger.PollDiscord(_ses, _store);
        if (_ses.platform === CMessenger.ePlatform.Email) return await CMessenger.PollEmail(_ses, _store);
        return await CMessenger.PollTelegram(_ses, _store);
    }

    // 발신 대기 중인 것을 id 순으로 내보낸다. 한 건이라도 실패하면 순서를 지키려고 거기서 멈춘다
    // (뒤엣것을 먼저 보내면 유저 화면에서 대화가 뒤집힌다).
    //
    // 세션당 하나만 돌게 잠근다. Flush로 들어오는 길이 Send와 Recv 둘이고 호출부(터미널)에서는 서로
    // 다른 타이머라, 겹치면 같은 pending 행을 양쪽이 각각 SELECT해서 두 번 보낸다. 실제로 밀린 큐가
    // 한꺼번에 나가는 순간에 중복 발신이 관측됐다. 건너뛴 쪽은 다음 Recv가 이어받으므로 유실은 없다.
    private static async Flush(_ses: MessengerSessionRecord): Promise<void> {
        if (_ses.chatKey === '') return;   // 아직 상대가 없다 — 다음 기회에
        if (CMessenger.sFlushing.has(_ses.id)) return;
        CMessenger.sFlushing.add(_ses.id);
        try {
            const db = await CMessenger.Init();

            const rows = await db.Recv(
                `SELECT id, text, fail FROM ${CMessenger.sQueueTable} WHERE sessionId = ? AND dir = 'out' AND state = 'pending' ORDER BY id ASC`,
                [_ses.id]
            );
            if (rows == null || rows.length === 0) return;

            for (const row of rows) {
                const id = Number(row[0]);
                const text = String(row[1]);
                const fail = Number(row[2]);
                try {
                    await CMessenger.Post(_ses, text);
                    await db.Send(`UPDATE ${CMessenger.sQueueTable} SET state = 'sent' WHERE id = ?`, [id]);
                } catch (e) {
                    const next = fail + 1;
                    const state = next >= CMessenger.sFailMax ? 'failed' : 'pending';
                    await db.Send(`UPDATE ${CMessenger.sQueueTable} SET fail = ?, state = ? WHERE id = ?`, [next, state, id]);
                    break;
                }
            }
        } finally {
            CMessenger.sFlushing.delete(_ses.id);
        }
    }

    private static async Post(_ses: MessengerSessionRecord, _text: string): Promise<void> {
        if (_ses.platform === CMessenger.ePlatform.Discord) {
            // 디스코드는 클라이언트가 마크다운을 알아서 렌더링하므로 원문을 그대로 보낸다.
            await CMessenger.CallDiscord(_ses.token, `/channels/${_ses.chatKey}/messages`, 'POST', { content: _text });
            return;
        }
        if (_ses.platform === CMessenger.ePlatform.Email) {
            // 발신은 계정 설정에서 검증해둔 SMTP를 그대로 쓴다(세션에는 자격증명이 없다 — token은
            // 상대 이메일 주소일 뿐이다). 이메일 클라이언트는 HTML을 온전히 렌더링하므로 텔레그램처럼
            // 태그를 제한할 필요 없이 marked 기본 렌더러를 쓴다.
            const account = CMailAccount.Load();
            const html = CMessenger.ToEmailHtml(_text);
            const ok = await CMail.Send(CMailAccount.ToAuthInfo(account.smtp), _ses.chatKey, 'Messenger', html);
            if (!ok) throw new Error('CMessenger: email send failed');
            return;
        }
        // 텔레그램은 parse_mode:'HTML'로 보내 마크다운(굵게·기울임·코드블록·링크 등)을 그대로 렌더링한다.
        // MarkdownV2 대신 HTML을 쓰는 이유: MarkdownV2는 '.', '-', '!' 같은 예약 문자를 전부
        // 이스케이프해야 하는데 CLI 응답엔 그런 문자가 자유롭게 섞여 있어 이스케이프 누락 시 400이 난다.
        // HTML은 이스케이프 대상이 <,>,& 셋뿐이라 훨씬 안전하다(ToTelegramHtml 참조).
        const html = CMessenger.ToTelegramHtml(_text);
        await CMessenger.CallTelegram(_ses.token, 'sendMessage', {
            chat_id: Number(_ses.chatKey), text: html, parse_mode: 'HTML',
        });
    }

    // 원문(마크다운) → 텔레그램이 렌더링 가능한 HTML. 먼저 <,>,&,"를 전부 엔티티로 이스케이프해 원문에
    // 섞인 실제 태그·따옴표가 파싱에 관여하지 않게 한 뒤, marked로 마크다운 문법만 태그로 바꾼다
    // (Control.ts logRenderMarkdown / MessengerTab.ts renderMd와 동일한 "escape 먼저, parse 나중" 패턴).
    private static ToTelegramHtml(_raw: string): string {
        const escaped = _raw
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        const html = marked.parse(escaped, { renderer: sTelegramRenderer }) as string;
        return html.trim();
    }

    // 원문(마크다운) → 일반 HTML. 이메일 클라이언트는 임의의 태그를 다 받아주므로 텔레그램처럼
    // 렌더러를 제한할 필요 없이 marked 기본 렌더러를 쓴다("escape 먼저, parse 나중" 패턴은 동일).
    private static ToEmailHtml(_raw: string): string {
        const escaped = _raw
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        const html = marked.parse(escaped) as string;
        return html.trim();
    }

    private static async Bind(_ses: MessengerSessionRecord, _chatKey: string): Promise<void> {
        const db = await CMessenger.Init();
        _ses.chatKey = _chatKey;
        await db.Send(`UPDATE ${CMessenger.sSessionTable} SET chatKey = ?, state = 'active' WHERE id = ?`, [_chatKey, _ses.id]);
    }

    private static async SetCursor(_ses: MessengerSessionRecord, _cursor: string): Promise<void> {
        const db = await CMessenger.Init();
        _ses.cursor = _cursor;
        await db.Send(`UPDATE ${CMessenger.sSessionTable} SET cursor = ? WHERE id = ?`, [_cursor, _ses.id]);
    }

    private static async Store(_ses: MessengerSessionRecord, _who: string, _date: number, _key: string, _text: string): Promise<void> {
        const db = await CMessenger.Init();
        await db.Send(
            `INSERT INTO ${CMessenger.sQueueTable} (sessionId, dir, who, date, msgKey, text, state, fail) VALUES (?, 'in', ?, ?, ?, ?, 'recv', 0)`,
            [_ses.id, _who, _date, _key, _text]
        );
    }

    // ---------------- 내부: 텔레그램 ----------------

    // getUpdates를 offset부터 즉시반환(timeout=0)으로 한 번 긁는다.
    // 첫 유저 메시지에서 chatKey를 바인딩하고, 바인딩 뒤에는 그 채팅의 텍스트만 큐에 넣는다.
    //
    // offset은 반드시 '읽은 것 중 최대 update_id + 1'로 전진시켜야 한다. 텔레그램은 offset을 넘긴
    // 순간 그 이전 업데이트를 서버에서 지우므로, 전진에 실패하면 같은 메시지를 영원히 다시 읽는다.
    private static async PollTelegram(_ses: MessengerSessionRecord, _store: boolean): Promise<void> {
        const offset = Number(_ses.cursor) || 0;
        const res: any = await CMessenger.CallTelegram(_ses.token, 'getUpdates', { offset, timeout: 0 });
        const updates: any[] = Array.isArray(res?.result) ? res.result : [];
        if (updates.length === 0) return;

        let maxId = offset - 1;
        for (const up of updates) {
            const updateId = Number(up?.update_id ?? 0);
            if (updateId > maxId) maxId = updateId;

            const msg = up?.message ?? up?.channel_post;
            const chatId = String(msg?.chat?.id ?? '');
            const text: string = typeof msg?.text === 'string' ? msg.text : '';
            if (chatId === '' || text === '') continue;   // 사진·스티커 등 텍스트 없는 건 버린다

            if (_ses.chatKey === '') await CMessenger.Bind(_ses, chatId);
            else if (_ses.chatKey !== chatId) continue;   // 봇당 세션 하나 — 바인딩된 상대가 아니면 무시

            // 접속용 /start 는 대화 내용이 아니라 페어링 신호라 큐에 넣지 않는다.
            if (text === '/start' || text.startsWith('/start ')) continue;
            if (!_store) continue;   // 기준선 드레인 — 바인딩만 하고 본문은 버린다

            const who = String(msg?.from?.username ?? msg?.from?.first_name ?? chatId);
            const date = Number(msg?.date ?? Math.floor(Date.now() / 1000));
            await CMessenger.Store(_ses, who, date, String(updateId), text);
        }

        const next = maxId + 1;
        if (next > offset) await CMessenger.SetCursor(_ses, String(next));
    }

    private static async CallTelegram(_token: string, _method: string, _body: object | null): Promise<any> {
        const url = `https://api.telegram.org/bot${_token}/${_method}`;
        const init: any = { signal: AbortSignal.timeout(20000) };
        if (_body != null) {
            init.method = 'POST';
            init.headers = { 'Content-Type': 'application/json' };
            init.body = JSON.stringify(_body);
        }
        const res = await fetch(url, init);
        const json: any = await res.json().catch(() => null);
        if (!res.ok || json?.ok !== true) {
            const desc = json?.description ?? `HTTP ${res.status}`;
            throw new Error(`CMessenger: ${_method} failed - ${desc}`);
        }
        return json;
    }

    // ---------------- 내부: 디스코드 ----------------

    // 디스코드에는 '봇 앞으로 온 것만 주는' API가 없다. 채널 히스토리를 커서(after)로 읽어 흉내낸다.
    //
    // 주의 1: 히스토리에는 봇 자신이 보낸 메시지도 들어온다. 거르지 않으면 CLI 답변이 다시 입력으로
    //   주입돼 무한루프다(텔레그램에는 없던 위험이다).
    // 주의 2: 그래도 커서는 봇 자기 메시지까지 포함한 최대 id로 전진시켜야 한다. 안 그러면 봇이 말을
    //   많이 한 구간에서 limit이 자기 메시지로만 차서 유저 메시지가 영영 안 보인다.
    private static async PollDiscord(_ses: MessengerSessionRecord, _store: boolean): Promise<void> {
        if (_ses.chatKey === '') {
            await CMessenger.DiscoverDiscord(_ses);
            if (_ses.chatKey === '') return;
        }

        const res: any = await CMessenger.CallDiscord(
            _ses.token, `/channels/${_ses.chatKey}/messages?after=${encodeURIComponent(_ses.cursor)}&limit=100`);
        const list: any[] = Array.isArray(res) ? res : [];
        if (list.length === 0) return;

        // 응답은 최신순이라 시간순으로 뒤집는다. id 비교는 2^53을 넘으므로 BigInt로 한다.
        list.sort((a, b) => (BigInt(a?.id ?? 0) < BigInt(b?.id ?? 0) ? -1 : 1));

        let maxId = _ses.cursor;
        for (const m of list) {
            const id = String(m?.id ?? '');
            if (id !== '' && BigInt(id) > BigInt(maxId)) maxId = id;

            if (m?.author?.bot === true) continue;               // 봇 발언(자기 답변 포함)은 입력이 아니다
            const text: string = typeof m?.content === 'string' ? m.content : '';
            if (text === '') continue;                           // 첨부만 있는 메시지 등
            if (!_store) continue;

            const who = String(m?.author?.username ?? m?.author?.id ?? '');
            const date = m?.timestamp ? Math.floor(new Date(m.timestamp).getTime() / 1000) : Math.floor(Date.now() / 1000);
            await CMessenger.Store(_ses, who, date, id, text);
        }

        if (BigInt(maxId) > BigInt(_ses.cursor)) await CMessenger.SetCursor(_ses, maxId);
    }

    // 봇이 들어가 있는 서버의 텍스트 채널을 훑어, 등록 이후 사람이 말을 건 첫 채널에 붙는다.
    // 텔레그램의 "먼저 말을 건 사람에게 바인딩"과 같은 UX를 유지하려는 것이다(유저는 토큰만 넣으면 된다).
    // 후보 목록은 캐시한다 — 붙기 전까지 계속 도는 경로라 매번 서버/채널 목록을 다시 받으면 낭비다.
    private static async DiscoverDiscord(_ses: MessengerSessionRecord): Promise<void> {
        const now = Date.now();
        let hit = CMessenger.sScan.get(_ses.id);
        if (hit == null || now - hit.at > CMessenger.sDiscordScanTerm) {
            const chans: string[] = [];
            const guilds: any[] = await CMessenger.CallDiscord(_ses.token, '/users/@me/guilds').catch(() => []);
            for (const g of (Array.isArray(guilds) ? guilds : []).slice(0, CMessenger.sDiscordScanGuild)) {
                if (chans.length >= CMessenger.sDiscordScanChannel) break;
                const list: any[] = await CMessenger.CallDiscord(_ses.token, `/guilds/${g?.id}/channels`).catch(() => []);
                for (const c of (Array.isArray(list) ? list : [])) {
                    if (Number(c?.type) !== 0) continue;   // 0 = GUILD_TEXT
                    chans.push(String(c.id));
                    if (chans.length >= CMessenger.sDiscordScanChannel) break;
                }
            }
            hit = { at: now, chans };
            CMessenger.sScan.set(_ses.id, hit);
        }

        for (const cid of hit.chans) {
            // 커서(=등록 시각) 이후에 사람이 말한 게 있는 채널을 찾는다. 권한이 없는 채널은 403이 나는데
            // 흔한 일이라(봇이 못 보는 채널) 조용히 건너뛴다.
            const res: any = await CMessenger.CallDiscord(
                _ses.token, `/channels/${cid}/messages?after=${encodeURIComponent(_ses.cursor)}&limit=5`).catch(() => null);
            const list: any[] = Array.isArray(res) ? res : [];
            if (!list.some(m => m?.author?.bot !== true && typeof m?.content === 'string' && m.content !== '')) continue;
            await CMessenger.Bind(_ses, cid);
            CMessenger.sScan.delete(_ses.id);
            return;
        }
    }

    // '지금'에 해당하는 가짜 스노플레이크. 등록 이전 메시지를 걸러내는 기준선으로 쓴다.
    private static DiscordNowKey(): string {
        return String(BigInt(Date.now() - CMessenger.sDiscordEpoch) << 22n);
    }

    private static async CallDiscord(_token: string, _path: string, _method = 'GET', _body: object | null = null): Promise<any> {
        const init: any = {
            method: _method,
            headers: { 'Authorization': `Bot ${_token}`, 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(20000),
        };
        if (_body != null) init.body = JSON.stringify(_body);

        let res = await fetch(`${CMessenger.sDiscordAPI}${_path}`, init);
        if (res.status === 429) {
            // 디스코드는 초과분을 429 + retry_after(초)로 알려준다. 한 번만 기다렸다 다시 친다 —
            // 계속 재시도하면 호출부(3초 틱)를 오래 붙잡아 다른 세션까지 밀린다.
            const info: any = await res.json().catch(() => null);
            const wait = Math.min(Number(info?.retry_after ?? 1) * 1000, 5000);
            await new Promise(r => setTimeout(r, wait));
            res = await fetch(`${CMessenger.sDiscordAPI}${_path}`, init);
        }
        if (!res.ok) {
            const err: any = await res.json().catch(() => null);
            throw new Error(`CMessenger: ${_method} ${_path} failed - ${err?.message ?? `HTTP ${res.status}`}`);
        }
        if (res.status === 204) return null;
        return await res.json().catch(() => null);
    }

    // ---------------- 내부: 이메일 ----------------

    // 계정(IMAP) 받은편지함을 커서(UID) 기준으로 드레인한다. 계정 하나를 여러 이메일 세션이 공유하므로
    // (세션마다 자기 상대 주소만 필터링), 전체 메일함을 훑되 이 세션의 상대(chatKey) 주소가 보낸
    // 것만 골라 큐에 넣는다. 필터링 여부와 무관하게 커서는 항상 스캔한 만큼 전진시킨다 — 안 그러면
    // 다른 사람이 보낸 메일 때문에 커서가 멈춰서 매번 같은 메일함 구간을 다시 훑게 된다.
    private static async PollEmail(_ses: MessengerSessionRecord, _store: boolean): Promise<void> {
        const account = CMailAccount.Load();
        const sinceUid = Number(_ses.cursor) || 0;
        const result = await CMail.Receive(CMailAccount.ToAuthInfo(account.imap), sinceUid);
        if (result.messages.length === 0) return;

        const peer = _ses.chatKey.toLowerCase();
        for (const msg of result.messages) {
            if (_store && msg.from.toLowerCase() === peer) {
                const text = msg.subject ? `[${msg.subject}]\n${msg.text}` : msg.text;
                await CMessenger.Store(_ses, msg.from, msg.date, String(msg.uid), text);
            }
        }

        if (result.nextUid > sinceUid) await CMessenger.SetCursor(_ses, String(result.nextUid));
    }

    // ---------------- 내부: 유틸 ----------------

    // 플랫폼별 길이 상한에 맞춰 자른다. 서로게이트 페어가 쪼개지지 않게 배열 단위로 센다.
    private static SplitText(_text: string, _limit: number): string[] {
        const text = _text === '' ? '(empty)' : _text;   // 빈 문자열은 양쪽 다 400을 낸다
        const chars = Array.from(text);
        if (chars.length <= _limit) return [text];

        const out: string[] = [];
        for (let i = 0; i < chars.length; i += _limit) {
            out.push(chars.slice(i, i + _limit).join(''));
        }
        return out;
    }

    private static RowToSession(_row: any[]): MessengerSessionRecord {
        return {
            id: Number(_row[0]),
            platform: String(_row[1]),
            token: String(_row[2]),
            botName: String(_row[3]),
            chatKey: String(_row[4] ?? ''),
            cursor: String(_row[5] ?? '0'),
            link: String(_row[6] ?? ''),
            state: String(_row[7]),
            createdAt: Number(_row[8]),
        };
    }

    private static Now(): number {
        const d = new Date();
        const pad2 = (v: number) => (v < 10 ? `0${v}` : `${v}`);
        return Number(`${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}${pad2(d.getHours())}${pad2(d.getMinutes())}${pad2(d.getSeconds())}`);
    }
}
