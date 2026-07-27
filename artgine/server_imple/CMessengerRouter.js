import { CMessengerRouter } from '../server/CMessengerRouter.js';
import { CMessenger } from '../server/CMessenger.js';
import { isAuthedReq, isValidToken } from '../server/CAuthServer.js';
import { setMsgSession, listTermsWithMsg } from './CTerminalRouter.js';
import { CWASM } from '../basic/CWASM.js';
CWASM.IsWASM();
function isAuthed(req) {
    const authToken = req.query?.authToken || '';
    return authToken ? isValidToken(authToken) : isAuthedReq(req);
}
export default function CMessengerRouter_imple() {
    CMessengerRouter.prototype.onList = async function (_json, _req, _res) {
        if (!isAuthed(_req)) {
            _res.status(401).json({ ok: false, msg: 'Authentication required' });
            return null;
        }
        try {
            const sessions = await CMessenger.GetAllSessions();
            const termLinks = listTermsWithMsg();
            const linked = new Map();
            for (const t of termLinks)
                linked.set(t.msgSession, { termToken: t.token, termKey: t.key });
            const result = sessions.map(s => ({
                ...s,
                termToken: linked.get(s.id)?.termToken ?? null,
                termKey: linked.get(s.id)?.termKey ?? null,
            }));
            _res.json({ ok: true, sessions: result });
        }
        catch (err) {
            _res.json({ ok: false, msg: String(err?.message ?? err) });
        }
        return null;
    };
    CMessengerRouter.prototype.onCreate = async function (_json, _req, _res) {
        if (!isAuthed(_req)) {
            _res.status(401).json({ ok: false, msg: 'Authentication required' });
            return null;
        }
        const bot = (_req.query.bot || '').trim();
        const platform = (_req.query.platform || 'auto').trim();
        if (!bot) {
            _res.json({ ok: false, msg: 'bot token required' });
            return null;
        }
        try {
            const msgSessionId = await CMessenger.Create(platform, bot);
            const info = await CMessenger.GetInfo(msgSessionId);
            _res.json({ ok: true, session: msgSessionId, platform: info.platform, botName: info.botName, chatKey: info.chatKey, link: info.link });
        }
        catch (err) {
            _res.json({ ok: false, msg: String(err?.message ?? err) });
        }
        return null;
    };
    CMessengerRouter.prototype.onLink = async function (_json, _req, _res) {
        if (!isAuthed(_req)) {
            _res.status(401).json({ ok: false, msg: 'Authentication required' });
            return null;
        }
        const termToken = (_req.query.termToken || '').trim();
        const sessionStr = (_req.query.sessionId || '').trim();
        if (!termToken) {
            _res.json({ ok: false, msg: 'termToken required' });
            return null;
        }
        if (!sessionStr) {
            _res.json({ ok: false, msg: 'sessionId required' });
            return null;
        }
        const msgSessionId = Number(sessionStr);
        if (!Number.isFinite(msgSessionId) || msgSessionId <= 0) {
            _res.json({ ok: false, msg: 'Invalid sessionId' });
            return null;
        }
        try {
            const info = await CMessenger.GetInfo(msgSessionId);
            if (!setMsgSession(termToken, msgSessionId)) {
                _res.json({ ok: false, msg: 'Terminal session not found' });
                return null;
            }
            _res.json({ ok: true, session: msgSessionId, platform: info.platform, botName: info.botName, chatKey: info.chatKey, link: info.link });
        }
        catch (err) {
            _res.json({ ok: false, msg: String(err?.message ?? err) });
        }
        return null;
    };
    CMessengerRouter.prototype.onUnlink = async function (_json, _req, _res) {
        if (!isAuthed(_req)) {
            _res.status(401).json({ ok: false, msg: 'Authentication required' });
            return null;
        }
        const termToken = (_req.query.termToken || '').trim();
        if (!termToken) {
            _res.json({ ok: false, msg: 'termToken required' });
            return null;
        }
        setMsgSession(termToken, undefined);
        _res.json({ ok: true });
        return null;
    };
    CMessengerRouter.prototype.onSend = async function (_json, _req, _res) {
        if (!isAuthed(_req)) {
            _res.status(401).json({ ok: false, msg: 'Authentication required' });
            return null;
        }
        const sessionId = Number(_json.GetStr('sessionId') || '0');
        const from = _json.GetStr('from') || 'control';
        const message = _json.GetStr('message') || '';
        if (!sessionId || !message) {
            _res.json({ ok: false, msg: 'sessionId and message required' });
            return null;
        }
        try {
            await CMessenger.Send(sessionId, from, message);
            _res.json({ ok: true });
        }
        catch (err) {
            _res.json({ ok: false, msg: String(err?.message ?? err) });
        }
        return null;
    };
    CMessengerRouter.prototype.onLog = async function (_json, _req, _res) {
        if (!isAuthed(_req)) {
            _res.status(401).json({ ok: false, msg: 'Authentication required' });
            return null;
        }
        const sessionId = Number(_req.query.sessionId ?? 0);
        const limit = Math.min(Number(_req.query.limit ?? 50), 200);
        if (!sessionId) {
            _res.json({ ok: false, msg: 'sessionId required' });
            return null;
        }
        try {
            const log = await CMessenger.GetLog(sessionId, limit);
            _res.json({ ok: true, log });
        }
        catch (err) {
            _res.json({ ok: false, msg: String(err?.message ?? err) });
        }
        return null;
    };
}
