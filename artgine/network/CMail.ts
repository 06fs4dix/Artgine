
import { CAuthInfo } from './CAuthInfo.js';
import { CCMDMgr } from '../system/CCMDMgr.js';

let nodemailerModule: typeof import('nodemailer') | null = null;
let nodemailerLoad: Promise<typeof import('nodemailer')> | null = null;

let imapflowModule: any = null;
let imapflowLoad: Promise<any> | null = null;

let mailparserModule: any = null;
let mailparserLoad: Promise<any> | null = null;

export type CMailMessage = {
    uid: number;     // IMAP UID. 다음 Receive 호출 시 sinceUid로 넘길 커서.
    from: string;
    subject: string;
    date: number;     // 유닉스 초
    text: string;
};

export type CMailReceiveResult = {
    messages: CMailMessage[];
    nextUid: number;   // 다음 호출 때 sinceUid로 넘길 값(새 메일이 없으면 sinceUid 그대로)
};

export type CMailVerifyResult = {
    ok: boolean;
    msg?: string;
};

export class CMail {
    /** nodemailer 설치(NPMInstall) 후 동적 로드 (프로세스당 1회) */
    private static EnsureModule(): Promise<typeof import('nodemailer')> {
        if (nodemailerModule) return Promise.resolve(nodemailerModule);
        if (!nodemailerLoad) {
            nodemailerLoad = (async () => {
                await CCMDMgr.NPMInstall(["nodemailer"]);
                const mod = await import('nodemailer');
                nodemailerModule = mod;
                return mod;
            })();
        }
        return nodemailerLoad;
    }

    /** imapflow 설치(NPMInstall) 후 동적 로드 (프로세스당 1회) */
    private static EnsureImapModule(): Promise<any> {
        if (imapflowModule) return Promise.resolve(imapflowModule);
        if (!imapflowLoad) {
            imapflowLoad = (async () => {
                await CCMDMgr.NPMInstall(["imapflow"]);
                // @ts-ignore optional runtime dep — NPMInstall 후 로드
                const mod: any = await import("imapflow");
                imapflowModule = mod;
                return mod;
            })();
        }
        return imapflowLoad;
    }

    /** mailparser 설치(NPMInstall) 후 동적 로드 (프로세스당 1회) */
    private static EnsureMailparserModule(): Promise<any> {
        if (mailparserModule) return Promise.resolve(mailparserModule);
        if (!mailparserLoad) {
            mailparserLoad = (async () => {
                await CCMDMgr.NPMInstall(["mailparser"]);
                // @ts-ignore optional runtime dep — NPMInstall 후 로드
                const mod: any = await import("mailparser");
                mailparserModule = mod;
                return mod;
            })();
        }
        return mailparserLoad;
    }

    static async Send(_auth: CAuthInfo, _to: string, _subject: string,_html: string): Promise<boolean>
    {
        const nodemailerModule = await CMail.EnsureModule();
        const port = parseInt(_auth.mPort, 10);
        const secure = port === 465; // 포트가 465면 SSL

        const transporter = nodemailerModule.createTransport({
            host: _auth.mAddres,
            port: port,
            secure: secure,
            auth: {
                user: _auth.mID,
                pass: _auth.mPW,
            },
        });

        // From 헤더는 반드시 완전한 이메일 주소(로컬파트@도메인)여야 한다 — mID를 도메인 추측 없이
        // 그대로 쓴다. 그래서 mID 자체가 항상 완전한 주소여야 한다는 게 이 계정 정보의 전제다
        // (도메인 유추는 신뢰할 수 없다 — CMailAccount.Sanitize에서 강제한다).
        const mailOptions = {
            from: _auth.mID,
            to: _to,
            subject: _subject,
            html: _html, // ✅ 텍스트 없이 HTML만
        };

        try {
            const info = await transporter.sendMail(mailOptions);
            console.log('메일 전송 성공:', info.response);
            return true;
        } catch (err) {
            console.error('메일 전송 실패:', err);
            return false;
        }
    }

    // IMAP INBOX에서 _sinceUid 이후(UID 기준) 도착한 메일만 가져온다. 첫 호출은 _sinceUid=0으로
    // 넘기면 INBOX 전체를 받는다. 반환된 nextUid를 다음 호출의 _sinceUid로 그대로 넘기면 된다.
    static async Receive(_auth: CAuthInfo, _sinceUid: number): Promise<CMailReceiveResult>
    {
        const { ImapFlow } = await CMail.EnsureImapModule();
        const { simpleParser } = await CMail.EnsureMailparserModule();

        const port = parseInt(_auth.mPort, 10);
        const client = new ImapFlow({
            host: _auth.mAddres,
            port: port,
            secure: port === 993,
            auth: {
                user: _auth.mID,
                pass: _auth.mPW,
            },
            logger: false,
        });

        const messages: CMailMessage[] = [];
        let nextUid = _sinceUid;

        await client.connect();
        try {
            const lock = await client.getMailboxLock('INBOX');
            try {
                // IMAP은 "N:*"에서 N이 실제 최대 UID보다 커도 마지막 메일을 다시 돌려주는 서버가
                // 있어(스펙상 known quirk), sinceUid 이하는 아래에서 한 번 더 걸러낸다.
                const range = `${_sinceUid + 1}:*`;
                for await (const msg of client.fetch(range, { uid: true, envelope: true, source: true }, { uid: true })) {
                    if (msg.uid <= _sinceUid) continue;
                    const parsed = msg.source ? await simpleParser(msg.source) : null;
                    messages.push({
                        uid: msg.uid,
                        from: msg.envelope?.from?.[0]?.address ?? '',
                        subject: msg.envelope?.subject ?? '',
                        date: msg.envelope?.date ? Math.floor(new Date(msg.envelope.date).getTime() / 1000) : Math.floor(Date.now() / 1000),
                        text: parsed?.text ?? '',
                    });
                    if (msg.uid > nextUid) nextUid = msg.uid;
                }
            } finally {
                lock.release();
            }
        } finally {
            await client.logout().catch(() => client.close());
        }

        return { messages, nextUid };
    }

    // SMTP 계정이 실제로 로그인 가능한지 확인한다(메일을 보내지 않고 연결/인증만 확인).
    static async VerifySmtp(_auth: CAuthInfo): Promise<CMailVerifyResult>
    {
        try {
            const nodemailerModule = await CMail.EnsureModule();
            const port = parseInt(_auth.mPort, 10);
            const transporter = nodemailerModule.createTransport({
                host: _auth.mAddres,
                port: port,
                secure: port === 465,
                auth: {
                    user: _auth.mID,
                    pass: _auth.mPW,
                },
                connectionTimeout: 10000,
            });
            await transporter.verify();
            return { ok: true };
        } catch (err: any) {
            return { ok: false, msg: String(err?.message ?? err) };
        }
    }

    // IMAP 계정이 실제로 로그인 가능한지 확인한다(INBOX만 열어보고 바로 로그아웃).
    static async VerifyImap(_auth: CAuthInfo): Promise<CMailVerifyResult>
    {
        let client: any = null;
        try {
            const { ImapFlow } = await CMail.EnsureImapModule();
            const port = parseInt(_auth.mPort, 10);
            client = new ImapFlow({
                host: _auth.mAddres,
                port: port,
                secure: port === 993,
                auth: {
                    user: _auth.mID,
                    pass: _auth.mPW,
                },
                logger: false,
            });
            await client.connect();
            const lock = await client.getMailboxLock('INBOX');
            lock.release();
            return { ok: true };
        } catch (err: any) {
            return { ok: false, msg: String(err?.message ?? err) };
        } finally {
            if (client) await client.logout().catch(() => client.close().catch(() => {}));
        }
    }
}
