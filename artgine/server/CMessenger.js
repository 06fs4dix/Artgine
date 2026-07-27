import { CORMField } from '../network/CORM.js';
import { CSQLite } from '../network/CSQLite.js';
import { marked, Renderer } from '../external/esnext/md/marked.esm.js';
const sTelegramRenderer = Object.assign(Object.create(new Renderer()), {
    heading: (text) => `<b>${text}</b>\n`,
    hr: () => '\n',
    list: (body) => body,
    listitem: (text) => `• ${text}\n`,
    checkbox: (checked) => (checked ? '☑ ' : '☐ '),
    paragraph: (text) => `${text}\n\n`,
    table: (header, body) => `${header}${body}\n`,
    tablerow: (content) => `${content}\n`,
    tablecell: (content) => `${content} | `,
    image: (_href, _title, text) => text,
});
export class CMessenger {
    static sDB = null;
    static sSessionTable = 'messenger_session';
    static sQueueTable = 'messenger_queue';
    static ePlatform = { Telegram: 'telegram', Discord: 'discord' };
    static sTextLimit = { telegram: 3800, discord: 1900 };
    static sFailMax = 5;
    static sDiscordAPI = 'https://discord.com/api/v10';
    static sDiscordEpoch = 1420070400000;
    static sDiscordPerm = 68608;
    static sDiscordScanGuild = 5;
    static sDiscordScanChannel = 20;
    static sDiscordScanTerm = 60000;
    static sScan = new Map();
    static sFlushing = new Set();
    static async Init() {
        if (CMessenger.sDB != null)
            return CMessenger.sDB;
        const db = new CSQLite();
        await db.Init();
        const tables = await db.GetCollection();
        if (Array.isArray(tables) && tables.includes(CMessenger.sSessionTable)) {
            const cols = await db.GetProjection(CMessenger.sSessionTable);
            if (!Array.isArray(cols) || !cols.includes('chatKey') || !cols.includes('platform')) {
                await db.Send(`DROP TABLE IF EXISTS ${CMessenger.sSessionTable}`);
                await db.Send(`DROP TABLE IF EXISTS ${CMessenger.sQueueTable}`);
            }
        }
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
            new CORMField('dir', ''),
            new CORMField('who', ''),
            new CORMField('date', 0),
            new CORMField('msgKey', ''),
            new CORMField('text', ''),
            new CORMField('state', ''),
            new CORMField('fail', 0),
        ]);
        CMessenger.sDB = db;
        return db;
    }
    static Detect(_token) {
        const token = (_token ?? '').trim();
        if (/^\d{5,}:[\w-]{20,}$/.test(token))
            return CMessenger.ePlatform.Telegram;
        if (/^[\w-]{20,}\.[\w-]{4,}\.[\w-]{20,}$/.test(token))
            return CMessenger.ePlatform.Discord;
        return '';
    }
    static async Create(_platform, _token) {
        const token = (_token ?? '').trim();
        if (token === '')
            throw new Error('CMessenger: token is empty');
        let platform = (_platform ?? '').trim().toLowerCase();
        if (platform === '' || platform === 'auto') {
            platform = CMessenger.Detect(token);
            if (platform === '')
                throw new Error('CMessenger: cannot tell the platform from this token (expected a Telegram or Discord bot token)');
        }
        if (platform !== CMessenger.ePlatform.Telegram && platform !== CMessenger.ePlatform.Discord) {
            throw new Error(`CMessenger: unsupported platform '${_platform}'`);
        }
        const me = await CMessenger.GetMe(platform, token);
        const db = await CMessenger.Init();
        await db.Send(`UPDATE ${CMessenger.sSessionTable} SET state = 'dead' WHERE token = ?`, [token]);
        const cursor = platform === CMessenger.ePlatform.Discord ? CMessenger.DiscordNowKey() : '0';
        const createdAt = CMessenger.Now();
        await db.Send(`INSERT INTO ${CMessenger.sSessionTable} (platform, token, botName, chatKey, cursor, link, state, createdAt) VALUES (?, ?, ?, '', ?, ?, 'pending', ?)`, [platform, token, me.name, cursor, me.link, createdAt]);
        const rows = await db.Recv(`SELECT id FROM ${CMessenger.sSessionTable} WHERE token = ? AND state != 'dead' ORDER BY id DESC LIMIT 1`, [token]);
        if (rows == null || rows.length === 0)
            throw new Error('CMessenger: failed to create session');
        const id = Number(rows[0][0]);
        if (platform === CMessenger.ePlatform.Telegram) {
            const ses = await CMessenger.GetSession(id);
            try {
                await CMessenger.Poll(ses, false);
            }
            catch { }
        }
        return id;
    }
    static async Send(_sessionId, _from, _message) {
        const ses = await CMessenger.GetSession(_sessionId);
        const db = await CMessenger.Init();
        const date = Math.floor(Date.now() / 1000);
        for (const part of CMessenger.SplitText(_message ?? '', CMessenger.sTextLimit[ses.platform] ?? 1900)) {
            await db.Send(`INSERT INTO ${CMessenger.sQueueTable} (sessionId, dir, who, date, msgKey, text, state, fail) VALUES (?, 'out', ?, ?, '', ?, 'pending', 0)`, [ses.id, _from ?? '', date, part]);
        }
        await CMessenger.Flush(ses);
    }
    static async Recv(_sessionId) {
        const ses = await CMessenger.GetSession(_sessionId);
        const db = await CMessenger.Init();
        await CMessenger.Poll(ses);
        await CMessenger.Flush(ses);
        const rows = await db.Recv(`SELECT id, who, date, text FROM ${CMessenger.sQueueTable} WHERE sessionId = ? AND dir = 'in' AND state = 'recv' ORDER BY id ASC`, [ses.id]);
        if (rows == null || rows.length === 0)
            return [];
        const out = [];
        for (const row of rows) {
            await db.Send(`UPDATE ${CMessenger.sQueueTable} SET state = 'read' WHERE id = ?`, [Number(row[0])]);
            out.push({ who: String(row[1]), date: Number(row[2]), text: String(row[3]) });
        }
        return out;
    }
    static async GetAllSessions() {
        const db = await CMessenger.Init();
        const rows = await db.Recv(`SELECT id, platform, token, botName, chatKey, cursor, link, state, createdAt FROM ${CMessenger.sSessionTable} WHERE state != 'dead' ORDER BY id DESC`, []);
        if (rows == null || rows.length === 0)
            return [];
        return rows.map(r => {
            const s = CMessenger.RowToSession(r);
            return { id: s.id, platform: s.platform, botName: s.botName, chatKey: s.chatKey, cursor: s.cursor, link: s.link, state: s.state, createdAt: s.createdAt };
        });
    }
    static async GetLog(_sessionId, _limit = 50) {
        const db = await CMessenger.Init();
        const rows = await db.Recv(`SELECT dir, who, date, text FROM ${CMessenger.sQueueTable} WHERE sessionId = ? ORDER BY id DESC LIMIT ?`, [_sessionId, Math.min(_limit, 200)]);
        if (rows == null || rows.length === 0)
            return [];
        return rows.reverse().map(r => ({
            dir: String(r[0]),
            who: String(r[1]),
            date: Number(r[2]),
            text: String(r[3]),
        }));
    }
    static async GetInfo(_sessionId) {
        const ses = await CMessenger.GetSession(_sessionId);
        return {
            id: ses.id, platform: ses.platform, botName: ses.botName, chatKey: ses.chatKey,
            cursor: ses.cursor, link: ses.link, state: ses.state, createdAt: ses.createdAt,
        };
    }
    static async GetSession(_sessionId) {
        const db = await CMessenger.Init();
        const rows = await db.Recv(`SELECT id, platform, token, botName, chatKey, cursor, link, state, createdAt FROM ${CMessenger.sSessionTable} WHERE id = ?`, [_sessionId]);
        if (rows == null || rows.length === 0)
            throw new Error(`CMessenger: session ${_sessionId} not found`);
        const ses = CMessenger.RowToSession(rows[0]);
        if (ses.state === 'dead')
            throw new Error(`CMessenger: session ${_sessionId} is dead`);
        return ses;
    }
    static async GetMe(_platform, _token) {
        if (_platform === CMessenger.ePlatform.Telegram) {
            const res = await CMessenger.CallTelegram(_token, 'getMe', null);
            const name = res?.result?.username;
            if (typeof name !== 'string' || name === '')
                throw new Error('CMessenger: getMe returned no username');
            return { name, link: `https://t.me/${encodeURIComponent(name)}` };
        }
        const me = await CMessenger.CallDiscord(_token, '/users/@me');
        const name = me?.username;
        const appId = me?.id;
        if (typeof name !== 'string' || name === '')
            throw new Error('CMessenger: /users/@me returned no username');
        return {
            name,
            link: `https://discord.com/oauth2/authorize?client_id=${encodeURIComponent(String(appId))}`
                + `&scope=bot&permissions=${CMessenger.sDiscordPerm}&integration_type=0`,
        };
    }
    static async Poll(_ses, _store = true) {
        if (_ses.platform === CMessenger.ePlatform.Discord)
            return await CMessenger.PollDiscord(_ses, _store);
        return await CMessenger.PollTelegram(_ses, _store);
    }
    static async Flush(_ses) {
        if (_ses.chatKey === '')
            return;
        if (CMessenger.sFlushing.has(_ses.id))
            return;
        CMessenger.sFlushing.add(_ses.id);
        try {
            const db = await CMessenger.Init();
            const rows = await db.Recv(`SELECT id, text, fail FROM ${CMessenger.sQueueTable} WHERE sessionId = ? AND dir = 'out' AND state = 'pending' ORDER BY id ASC`, [_ses.id]);
            if (rows == null || rows.length === 0)
                return;
            for (const row of rows) {
                const id = Number(row[0]);
                const text = String(row[1]);
                const fail = Number(row[2]);
                try {
                    await CMessenger.Post(_ses, text);
                    await db.Send(`UPDATE ${CMessenger.sQueueTable} SET state = 'sent' WHERE id = ?`, [id]);
                }
                catch (e) {
                    const next = fail + 1;
                    const state = next >= CMessenger.sFailMax ? 'failed' : 'pending';
                    await db.Send(`UPDATE ${CMessenger.sQueueTable} SET fail = ?, state = ? WHERE id = ?`, [next, state, id]);
                    break;
                }
            }
        }
        finally {
            CMessenger.sFlushing.delete(_ses.id);
        }
    }
    static async Post(_ses, _text) {
        if (_ses.platform === CMessenger.ePlatform.Discord) {
            await CMessenger.CallDiscord(_ses.token, `/channels/${_ses.chatKey}/messages`, 'POST', { content: _text });
            return;
        }
        const html = CMessenger.ToTelegramHtml(_text);
        await CMessenger.CallTelegram(_ses.token, 'sendMessage', {
            chat_id: Number(_ses.chatKey), text: html, parse_mode: 'HTML',
        });
    }
    static ToTelegramHtml(_raw) {
        const escaped = _raw
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        const html = marked.parse(escaped, { renderer: sTelegramRenderer });
        return html.trim();
    }
    static async Bind(_ses, _chatKey) {
        const db = await CMessenger.Init();
        _ses.chatKey = _chatKey;
        await db.Send(`UPDATE ${CMessenger.sSessionTable} SET chatKey = ?, state = 'active' WHERE id = ?`, [_chatKey, _ses.id]);
    }
    static async SetCursor(_ses, _cursor) {
        const db = await CMessenger.Init();
        _ses.cursor = _cursor;
        await db.Send(`UPDATE ${CMessenger.sSessionTable} SET cursor = ? WHERE id = ?`, [_cursor, _ses.id]);
    }
    static async Store(_ses, _who, _date, _key, _text) {
        const db = await CMessenger.Init();
        await db.Send(`INSERT INTO ${CMessenger.sQueueTable} (sessionId, dir, who, date, msgKey, text, state, fail) VALUES (?, 'in', ?, ?, ?, ?, 'recv', 0)`, [_ses.id, _who, _date, _key, _text]);
    }
    static async PollTelegram(_ses, _store) {
        const offset = Number(_ses.cursor) || 0;
        const res = await CMessenger.CallTelegram(_ses.token, 'getUpdates', { offset, timeout: 0 });
        const updates = Array.isArray(res?.result) ? res.result : [];
        if (updates.length === 0)
            return;
        let maxId = offset - 1;
        for (const up of updates) {
            const updateId = Number(up?.update_id ?? 0);
            if (updateId > maxId)
                maxId = updateId;
            const msg = up?.message ?? up?.channel_post;
            const chatId = String(msg?.chat?.id ?? '');
            const text = typeof msg?.text === 'string' ? msg.text : '';
            if (chatId === '' || text === '')
                continue;
            if (_ses.chatKey === '')
                await CMessenger.Bind(_ses, chatId);
            else if (_ses.chatKey !== chatId)
                continue;
            if (text === '/start' || text.startsWith('/start '))
                continue;
            if (!_store)
                continue;
            const who = String(msg?.from?.username ?? msg?.from?.first_name ?? chatId);
            const date = Number(msg?.date ?? Math.floor(Date.now() / 1000));
            await CMessenger.Store(_ses, who, date, String(updateId), text);
        }
        const next = maxId + 1;
        if (next > offset)
            await CMessenger.SetCursor(_ses, String(next));
    }
    static async CallTelegram(_token, _method, _body) {
        const url = `https://api.telegram.org/bot${_token}/${_method}`;
        const init = { signal: AbortSignal.timeout(20000) };
        if (_body != null) {
            init.method = 'POST';
            init.headers = { 'Content-Type': 'application/json' };
            init.body = JSON.stringify(_body);
        }
        const res = await fetch(url, init);
        const json = await res.json().catch(() => null);
        if (!res.ok || json?.ok !== true) {
            const desc = json?.description ?? `HTTP ${res.status}`;
            throw new Error(`CMessenger: ${_method} failed - ${desc}`);
        }
        return json;
    }
    static async PollDiscord(_ses, _store) {
        if (_ses.chatKey === '') {
            await CMessenger.DiscoverDiscord(_ses);
            if (_ses.chatKey === '')
                return;
        }
        const res = await CMessenger.CallDiscord(_ses.token, `/channels/${_ses.chatKey}/messages?after=${encodeURIComponent(_ses.cursor)}&limit=100`);
        const list = Array.isArray(res) ? res : [];
        if (list.length === 0)
            return;
        list.sort((a, b) => (BigInt(a?.id ?? 0) < BigInt(b?.id ?? 0) ? -1 : 1));
        let maxId = _ses.cursor;
        for (const m of list) {
            const id = String(m?.id ?? '');
            if (id !== '' && BigInt(id) > BigInt(maxId))
                maxId = id;
            if (m?.author?.bot === true)
                continue;
            const text = typeof m?.content === 'string' ? m.content : '';
            if (text === '')
                continue;
            if (!_store)
                continue;
            const who = String(m?.author?.username ?? m?.author?.id ?? '');
            const date = m?.timestamp ? Math.floor(new Date(m.timestamp).getTime() / 1000) : Math.floor(Date.now() / 1000);
            await CMessenger.Store(_ses, who, date, id, text);
        }
        if (BigInt(maxId) > BigInt(_ses.cursor))
            await CMessenger.SetCursor(_ses, maxId);
    }
    static async DiscoverDiscord(_ses) {
        const now = Date.now();
        let hit = CMessenger.sScan.get(_ses.id);
        if (hit == null || now - hit.at > CMessenger.sDiscordScanTerm) {
            const chans = [];
            const guilds = await CMessenger.CallDiscord(_ses.token, '/users/@me/guilds').catch(() => []);
            for (const g of (Array.isArray(guilds) ? guilds : []).slice(0, CMessenger.sDiscordScanGuild)) {
                if (chans.length >= CMessenger.sDiscordScanChannel)
                    break;
                const list = await CMessenger.CallDiscord(_ses.token, `/guilds/${g?.id}/channels`).catch(() => []);
                for (const c of (Array.isArray(list) ? list : [])) {
                    if (Number(c?.type) !== 0)
                        continue;
                    chans.push(String(c.id));
                    if (chans.length >= CMessenger.sDiscordScanChannel)
                        break;
                }
            }
            hit = { at: now, chans };
            CMessenger.sScan.set(_ses.id, hit);
        }
        for (const cid of hit.chans) {
            const res = await CMessenger.CallDiscord(_ses.token, `/channels/${cid}/messages?after=${encodeURIComponent(_ses.cursor)}&limit=5`).catch(() => null);
            const list = Array.isArray(res) ? res : [];
            if (!list.some(m => m?.author?.bot !== true && typeof m?.content === 'string' && m.content !== ''))
                continue;
            await CMessenger.Bind(_ses, cid);
            CMessenger.sScan.delete(_ses.id);
            return;
        }
    }
    static DiscordNowKey() {
        return String(BigInt(Date.now() - CMessenger.sDiscordEpoch) << 22n);
    }
    static async CallDiscord(_token, _path, _method = 'GET', _body = null) {
        const init = {
            method: _method,
            headers: { 'Authorization': `Bot ${_token}`, 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(20000),
        };
        if (_body != null)
            init.body = JSON.stringify(_body);
        let res = await fetch(`${CMessenger.sDiscordAPI}${_path}`, init);
        if (res.status === 429) {
            const info = await res.json().catch(() => null);
            const wait = Math.min(Number(info?.retry_after ?? 1) * 1000, 5000);
            await new Promise(r => setTimeout(r, wait));
            res = await fetch(`${CMessenger.sDiscordAPI}${_path}`, init);
        }
        if (!res.ok) {
            const err = await res.json().catch(() => null);
            throw new Error(`CMessenger: ${_method} ${_path} failed - ${err?.message ?? `HTTP ${res.status}`}`);
        }
        if (res.status === 204)
            return null;
        return await res.json().catch(() => null);
    }
    static SplitText(_text, _limit) {
        const text = _text === '' ? '(empty)' : _text;
        const chars = Array.from(text);
        if (chars.length <= _limit)
            return [text];
        const out = [];
        for (let i = 0; i < chars.length; i += _limit) {
            out.push(chars.slice(i, i + _limit).join(''));
        }
        return out;
    }
    static RowToSession(_row) {
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
    static Now() {
        const d = new Date();
        const pad2 = (v) => (v < 10 ? `0${v}` : `${v}`);
        return Number(`${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}${pad2(d.getHours())}${pad2(d.getMinutes())}${pad2(d.getSeconds())}`);
    }
}
