import { CCMDMgr } from '../system/CCMDMgr.js';
let nodemailerModule = null;
let nodemailerLoad = null;
let imapflowModule = null;
let imapflowLoad = null;
let mailparserModule = null;
let mailparserLoad = null;
export class CMail {
    static EnsureModule() {
        if (nodemailerModule)
            return Promise.resolve(nodemailerModule);
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
    static EnsureImapModule() {
        if (imapflowModule)
            return Promise.resolve(imapflowModule);
        if (!imapflowLoad) {
            imapflowLoad = (async () => {
                await CCMDMgr.NPMInstall(["imapflow"]);
                const mod = await import("imapflow");
                imapflowModule = mod;
                return mod;
            })();
        }
        return imapflowLoad;
    }
    static EnsureMailparserModule() {
        if (mailparserModule)
            return Promise.resolve(mailparserModule);
        if (!mailparserLoad) {
            mailparserLoad = (async () => {
                await CCMDMgr.NPMInstall(["mailparser"]);
                const mod = await import("mailparser");
                mailparserModule = mod;
                return mod;
            })();
        }
        return mailparserLoad;
    }
    static async Send(_auth, _to, _subject, _html) {
        const nodemailerModule = await CMail.EnsureModule();
        const port = parseInt(_auth.mPort, 10);
        const secure = port === 465;
        const transporter = nodemailerModule.createTransport({
            host: _auth.mAddres,
            port: port,
            secure: secure,
            auth: {
                user: _auth.mID,
                pass: _auth.mPW,
            },
        });
        const mailOptions = {
            from: _auth.mID,
            to: _to,
            subject: _subject,
            html: _html,
        };
        try {
            const info = await transporter.sendMail(mailOptions);
            console.log('메일 전송 성공:', info.response);
            return true;
        }
        catch (err) {
            console.error('메일 전송 실패:', err);
            return false;
        }
    }
    static async Receive(_auth, _sinceUid) {
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
        const messages = [];
        let nextUid = _sinceUid;
        await client.connect();
        try {
            const lock = await client.getMailboxLock('INBOX');
            try {
                const range = `${_sinceUid + 1}:*`;
                for await (const msg of client.fetch(range, { uid: true, envelope: true, source: true }, { uid: true })) {
                    if (msg.uid <= _sinceUid)
                        continue;
                    const parsed = msg.source ? await simpleParser(msg.source) : null;
                    const attachments = Array.isArray(parsed?.attachments)
                        ? parsed.attachments.map((a) => ({
                            filename: String(a?.filename ?? ''),
                            contentType: String(a?.contentType ?? ''),
                            content: a?.content,
                        }))
                        : [];
                    messages.push({
                        uid: msg.uid,
                        from: msg.envelope?.from?.[0]?.address ?? '',
                        subject: msg.envelope?.subject ?? '',
                        date: msg.envelope?.date ? Math.floor(new Date(msg.envelope.date).getTime() / 1000) : Math.floor(Date.now() / 1000),
                        text: parsed?.text ?? '',
                        attachments,
                    });
                    if (msg.uid > nextUid)
                        nextUid = msg.uid;
                }
            }
            finally {
                lock.release();
            }
        }
        finally {
            await client.logout().catch(() => client.close());
        }
        return { messages, nextUid };
    }
    static async VerifySmtp(_auth) {
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
        }
        catch (err) {
            return { ok: false, msg: String(err?.message ?? err) };
        }
    }
    static async VerifyImap(_auth) {
        let client = null;
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
        }
        catch (err) {
            return { ok: false, msg: String(err?.message ?? err) };
        }
        finally {
            if (client)
                await client.logout().catch(() => client.close().catch(() => { }));
        }
    }
}
