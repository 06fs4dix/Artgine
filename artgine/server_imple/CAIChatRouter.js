import { CWASM as __cwasmDecode__ } from "../basic/CWASM.js";
import * as path from 'path';
import * as fs from 'fs';
import { WebSocketServer, WebSocket } from 'ws';
import { CServerMain } from '../network/CServerMain.js';
import { CConsol } from '../basic/CConsol.js';
import { isAuthedReq, isAuthedUpgrade, isValidToken } from '../server/CAuthServer.js';
import { CAI } from '../util/CAI.js';
import { CAIChatRouter } from '../server/CAIChatRouter.js';
import { CWASM } from '../basic/CWASM.js';
CWASM.IsSIMD();
function isAuthedOrToken(req) {
    const authToken = req.query?.authToken || '';
    return (authToken !== '' && isValidToken(authToken)) || isAuthedReq(req);
}
let AI_ROOT = '';
let WORKSPACE_ROOT = '';
const WORKSPACE_ROOT_OVERRIDE = '';
let _pathsPromise = null;
function ensurePaths() {
    if (!_pathsPromise) {
        AI_ROOT = CAI.AIDir();
        WORKSPACE_ROOT = WORKSPACE_ROOT_OVERRIDE
            ? path.resolve(WORKSPACE_ROOT_OVERRIDE)
            : path.join(AI_ROOT, 'workspace');
        _pathsPromise = Promise.resolve();
    }
    return _pathsPromise;
}
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
function ensureDir(p) { if (!fs.existsSync(p))
    fs.mkdirSync(p, { recursive: true }); }
function safeSessionId(id) {
    if (!id || !/^[A-Za-z0-9_-]{8,64}$/.test(id))
        return null;
    return id;
}
function sessionDir(id) {
    const sid = safeSessionId(id);
    return sid ? path.join(WORKSPACE_ROOT, sid) : null;
}
function historyPath(id) {
    const dir = sessionDir(id);
    return dir ? path.join(dir, 'history.json') : null;
}
function loadHistory(id) {
    const p = historyPath(id);
    if (!p || !fs.existsSync(p))
        return null;
    try {
        return JSON.parse(fs.readFileSync(p, 'utf8'));
    }
    catch {
        return null;
    }
}
function saveHistory(h) {
    const dir = sessionDir(h.meta.sessionId);
    if (!dir)
        return;
    ensureDir(dir);
    fs.writeFileSync(historyPath(h.meta.sessionId), JSON.stringify(h, null, 2), 'utf8');
}
function configPath(id) {
    const dir = sessionDir(id);
    return dir ? path.join(dir, 'config.json') : null;
}
function loadConfig(id) {
    const p = configPath(id);
    if (!p || !fs.existsSync(p))
        return {};
    try {
        return JSON.parse(fs.readFileSync(p, 'utf8'));
    }
    catch {
        return {};
    }
}
function saveConfig(id, cfg) {
    const dir = sessionDir(id);
    if (!dir)
        return;
    ensureDir(dir);
    fs.writeFileSync(configPath(id), JSON.stringify(cfg, null, 2), 'utf8');
}
const _legacyProviderMap = {
    0: CAI.eProvider.claude, 2: CAI.eProvider.codex,
    3: CAI.eProvider.claude, 4: CAI.eProvider.gpt, 5: CAI.eProvider.antigravity,
};
function normalizeHistory(h) {
    const p = h.meta.provider;
    if (typeof p === 'number')
        h.meta.provider = _legacyProviderMap[p] ?? CAI.eProvider.claude;
    return h;
}
function listSessions(limit) {
    if (!fs.existsSync(WORKSPACE_ROOT))
        return [];
    const out = [];
    for (const name of fs.readdirSync(WORKSPACE_ROOT)) {
        if (!safeSessionId(name))
            continue;
        const h = loadHistory(name);
        if (!h?.meta)
            continue;
        const normalized = normalizeHistory(h);
        const lastMsg = gLastUserMsg.get(name) ?? (() => {
            const last = [...normalized.messages].reverse().find(m => m.role === 'user');
            return last ? last.content.slice(0, 80).replace(/\n+/g, ' ') : undefined;
        })();
        const cfg = loadConfig(name);
        out.push({ ...normalized.meta, lastMsg, workingDir: cfg.workingDir });
    }
    out.sort((a, b) => b.updatedAt - a.updatedAt);
    const sliced = limit ? out.slice(0, limit) : out;
    return sliced.map(s => ({ ...s, busy: gRoomLock.get(s.sessionId) === true }));
}
function deleteSession(id) {
    const dir = sessionDir(id);
    if (!dir || !fs.existsSync(dir))
        return false;
    const cfg = loadConfig(id);
    if (cfg.tempMd && fs.existsSync(cfg.tempMd))
        fs.unlinkSync(cfg.tempMd);
    fs.rmSync(dir, { recursive: true, force: true });
    return true;
}
function snapshotWorkspace(dir) {
    const out = new Map();
    if (!fs.existsSync(dir))
        return out;
    const walk = (cur, rel) => {
        let entries;
        try {
            entries = fs.readdirSync(cur, { withFileTypes: true });
        }
        catch {
            return;
        }
        for (const e of entries) {
            const childRel = rel ? `${rel}/${e.name}` : e.name;
            const childAbs = path.join(cur, e.name);
            if (e.isDirectory()) {
                walk(childAbs, childRel);
            }
            else if (e.isFile()) {
                if (rel === '' && e.name === 'history.json')
                    continue;
                try {
                    const st = fs.statSync(childAbs);
                    out.set(childRel, `${st.mtimeMs}|${st.size}`);
                }
                catch { }
            }
        }
    };
    walk(dir, '');
    return out;
}
function diffWorkspace(before, after) {
    const changed = [];
    for (const [rel, key] of after) {
        if (before.get(rel) !== key) {
            changed.push({ name: path.basename(rel), path: rel });
        }
    }
    return changed;
}
function safeAttachmentName(name) {
    const base = path.basename(name).replace(/[^A-Za-z0-9._-]/g, '_');
    return `${Date.now()}_${base}`;
}
function randomUuid() {
    const c = (n) => Math.floor(Math.random() * n);
    const hex = (n) => c(16).toString(16);
    let s = '';
    for (let i = 0; i < 32; i++)
        s += hex(0);
    return `${s.slice(0, 8)}-${s.slice(8, 12)}-4${s.slice(13, 16)}-${(8 + c(4)).toString(16)}${s.slice(17, 20)}-${s.slice(20, 32)}`;
}
function attachmentBlock(sid, atts) {
    if (!atts || !atts.length)
        return '';
    const dir = sessionDir(sid);
    const lines = ['', '[첨부 파일 — 반드시 Read 도구로 읽어서 내용을 확인하세요]'];
    for (const a of atts) {
        const abs = dir ? path.resolve(dir, a.path) : a.path;
        lines.push(`- 절대경로: ${abs}  (원본 파일명: ${a.name})`);
    }
    lines.push('위 파일들의 절대경로를 그대로 Read 도구의 file_path 인자로 전달해서 읽으세요. 이미지면 비전으로 분석하세요.');
    return lines.join('\n');
}
function serializeHistoryForPrompt(sid, h, newUserMsg) {
    const lines = [];
    lines.push('이전 대화 기록입니다. 이어서 답변해주세요.\n');
    for (const m of h.messages) {
        const role = m.role === 'user' ? 'User' : 'Assistant';
        lines.push(`### ${role}`);
        lines.push(m.content);
        if (m.attachments?.length)
            lines.push(attachmentBlock(sid, m.attachments));
        lines.push('');
    }
    lines.push('### User (현재 질문)');
    lines.push(newUserMsg.content);
    if (newUserMsg.attachments?.length)
        lines.push(attachmentBlock(sid, newUserMsg.attachments));
    return lines.join('\n');
}
function buildUserPromptOneShot(sid, msg) {
    const parts = [msg.content];
    if (msg.attachments?.length)
        parts.push(attachmentBlock(sid, msg.attachments));
    return parts.join('\n');
}
const gRooms = new Map();
const gRoomLock = new Map();
const gLastUserMsg = new Map();
function broadcastToRoom(sid, msg) {
    const room = gRooms.get(sid);
    if (!room)
        return;
    const data = JSON.stringify(msg);
    for (const client of room) {
        if (client.readyState === WebSocket.OPEN)
            client.send(data);
    }
}
function joinRoom(sid, ws) {
    if (!gRooms.has(sid))
        gRooms.set(sid, new Set());
    gRooms.get(sid).add(ws);
}
function leaveRoom(sid, ws) {
    const room = gRooms.get(sid);
    if (!room)
        return;
    room.delete(ws);
    if (room.size === 0) {
        gRooms.delete(sid);
        gRoomLock.delete(sid);
    }
}
async function handleSend(sid, msg, ctx) {
    const isCmd = msg.provider === 'cmd';
    const dir = sessionDir(sid);
    ensureDir(dir);
    ensureDir(path.join(dir, 'uploads'));
    const cfgFile = configPath(sid);
    const cfg = loadConfig(sid);
    if (!fs.existsSync(cfgFile)) {
        const newCfg = {};
        if (msg.workingDir)
            newCfg.workingDir = msg.workingDir;
        if (typeof msg.mcp === 'boolean')
            newCfg.mcp = msg.mcp;
        if (typeof msg.write === 'boolean')
            newCfg.write = msg.write;
        if (msg.mdcopy && msg.workingDir && !isCmd) {
            const copied = CAI.CreateRole(msg.provider, msg.workingDir);
            if (typeof copied === 'string') {
                newCfg.tempMd = copied;
                CConsol.Log(`[AIChat] Copied MD to ${copied}`);
            }
        }
        saveConfig(sid, newCfg);
        if (msg.workingDir)
            cfg.workingDir = msg.workingDir;
    }
    const resolvedCwd = cfg.workingDir || msg.workingDir;
    const cwd = (resolvedCwd && fs.existsSync(resolvedCwd)) ? resolvedCwd : dir;
    let history = loadHistory(sid);
    const now = Date.now();
    const isNewSession = !history;
    const providerChanged = history && history.meta.provider !== msg.provider;
    const modelChanged = history && history.meta.model !== msg.model;
    const needNewCliSession = isNewSession || providerChanged || modelChanged;
    if (!history) {
        history = {
            meta: {
                sessionId: sid,
                title: (msg.title || msg.content.slice(0, 30) || 'New chat'),
                provider: msg.provider, model: msg.model,
                createdAt: now, updatedAt: now,
            },
            messages: [],
        };
    }
    const userMsg = {
        role: 'user', content: msg.content,
        provider: msg.provider, model: msg.model,
        attachments: msg.attachments, timestamp: now,
        senderIp: ctx.ip || undefined,
        senderUa: (msg.ua || '').slice(0, 300) || undefined,
    };
    let prompt;
    let cliSessionId = history.meta.cliSessionId;
    let isFirstCall = false;
    if (isCmd) {
        prompt = msg.content;
        cliSessionId = undefined;
    }
    else if (msg.provider === CAI.eProvider.claude || msg.provider === CAI.eProvider.grok) {
        if (needNewCliSession) {
            cliSessionId = randomUuid();
            isFirstCall = true;
            prompt = history.messages.length > 0
                ? serializeHistoryForPrompt(sid, history, userMsg)
                : buildUserPromptOneShot(sid, userMsg);
        }
        else {
            prompt = buildUserPromptOneShot(sid, userMsg);
        }
    }
    else if (msg.provider === CAI.eProvider.antigravity) {
        isFirstCall = needNewCliSession;
        prompt = history.messages.length > 0 && needNewCliSession
            ? serializeHistoryForPrompt(sid, history, userMsg)
            : buildUserPromptOneShot(sid, userMsg);
        if (needNewCliSession)
            cliSessionId = undefined;
    }
    else if (msg.provider === CAI.eProvider.opencode) {
        const savedSid = history.meta.cliSessionId;
        if (savedSid && !needNewCliSession) {
            isFirstCall = false;
            cliSessionId = savedSid;
            prompt = buildUserPromptOneShot(sid, userMsg);
        }
        else {
            isFirstCall = true;
            cliSessionId = undefined;
            prompt = history.messages.length > 0
                ? serializeHistoryForPrompt(sid, history, userMsg)
                : buildUserPromptOneShot(sid, userMsg);
        }
    }
    else if (msg.provider === CAI.eProvider.codex) {
        isFirstCall = needNewCliSession;
        prompt = history.messages.length > 0 && needNewCliSession
            ? serializeHistoryForPrompt(sid, history, userMsg)
            : buildUserPromptOneShot(sid, userMsg);
        if (needNewCliSession)
            cliSessionId = undefined;
    }
    else {
        isFirstCall = needNewCliSession;
        prompt = history.messages.length > 0 && needNewCliSession
            ? serializeHistoryForPrompt(sid, history, userMsg)
            : buildUserPromptOneShot(sid, userMsg);
        cliSessionId = needNewCliSession ? randomUuid() : cliSessionId;
    }
    history.meta.provider = msg.provider;
    history.meta.model = msg.model;
    history.meta.cliSessionId = cliSessionId;
    history.meta.updatedAt = now;
    history.messages.push(userMsg);
    saveHistory(history);
    gLastUserMsg.set(sid, userMsg.content.slice(0, 80).replace(/\n+/g, ' '));
    broadcastToRoom(sid, { type: 'message', message: userMsg });
    broadcastToRoom(sid, { type: 'start', sessionId: sid });
    gRoomLock.set(sid, true);
    const snapBefore = snapshotWorkspace(dir);
    let result;
    try {
        const _svrAddr = CServerMain.Main().GetServer()?.address();
        const _svrPort = typeof _svrAddr === 'object' && _svrAddr ? _svrAddr.port : 8050;
        const _svrPath = CServerMain.Main().GetPath();
        const _svrHost = await CServerMain.GetAccessibleHost(_svrPort);
        if (!isCmd)
            CAI.CreateRole(msg.provider, undefined, _svrHost, _svrPort, _svrPath);
        result = isCmd
            ? await CAI.Cmd(cwd, prompt)
            : await Promise.race([
                CAI.Chat(msg.provider, msg.model, cwd, prompt, !!msg.mcp, cliSessionId, isFirstCall, !!msg.write),
                new Promise((_, reject) => setTimeout(() => reject(new Error('timeout: no response for 120s')), 120_000))
            ]);
        CConsol.Log(`[handleSend] OK provider=${msg.provider} model=${msg.model} textLen=${result.text.length} sessionId=${result.sessionId || '-'}`, CConsol.eColor.blue);
    }
    catch (e) {
        CConsol.Log(`[handleSend] FAILED: ${e.message}`, CConsol.eColor.red);
        gRoomLock.delete(sid);
        broadcastToRoom(sid, { type: 'error', msg: e.message.slice(0, 1000) });
        broadcastToRoom(sid, { type: 'done', code: 1, errored: true });
        const failH = loadHistory(sid);
        return {
            ok: false,
            msg: String(e?.message || e).slice(0, 1000),
            session: sid,
            messages: failH?.messages ?? history.messages,
        };
    }
    broadcastToRoom(sid, { type: 'chunk', text: result.text });
    const snapAfter = snapshotWorkspace(dir);
    const changedFiles = diffWorkspace(snapBefore, snapAfter);
    const cur = loadHistory(sid);
    if (cur) {
        cur.messages.push({
            role: 'assistant', content: result.text,
            provider: msg.provider, model: msg.model,
            attachments: changedFiles.length ? changedFiles : undefined,
            timestamp: Date.now(),
        });
        cur.meta.updatedAt = Date.now();
        cur.meta.cliSessionId = result.sessionId || cliSessionId;
        saveHistory(cur);
    }
    if (changedFiles.length)
        broadcastToRoom(sid, { type: 'files', changed: changedFiles });
    gRoomLock.delete(sid);
    broadcastToRoom(sid, { type: 'done', code: 0, errored: false });
    const doneH = loadHistory(sid);
    return {
        ok: true,
        session: sid,
        messages: doneH?.messages ?? cur?.messages ?? history.messages,
    };
}
export default function CAIChatRouter_imple() {
    CAIChatRouter.prototype["onGetSessions"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CAIChatRouter.js","Cri5CeC3iUp4p6ims5CZCSpQiRpfCoCXshiQiCpGsNC6sbpdsviys0pLpoi5s3imipzDsjzzs7sfptpLp8C2CKiGC0pYiishpwsyizizCYshCcsHiKsWCfp2p0sSC5i4ieCjs8Cts8pDiNpAitzzpkiRsgprsqCeirC7zCpDpZCtCpsZs6CApuzpixs7pcstpZCFi5s1CcClizp5pYp7CaizzJpcpVCmCrsRC5zDiDsis2iMC5shiiiQpgsDius7iOCgCTpUiRzDiAiGpjCkihCzspC0C4pApeCnpZsHpwC3iVp5CcCHi5CKptpLijskskpKCzsDsKixiApFsGpTpMC5CAs8p9Cxspiopbp0C4sPCNspCjsspmCxCKpkpzpRsgC4iQsACtpbp1sWiKp8pOpesliXsmiPsuCtCvCHiPikp3pvi8ioC8sviRs0zJs9CLsHi5iNsAidphsgsZiipSigC8sUiUi9CECYiriwsVClpopLpJigiapOCws6iKCOsgCOpgpqCspLi1zyCcCtiqimpzCAp5iYspC1C0iBCUp9pWCDswpSixCmC2sUi8C2iziEpzpaCzpEsusnzJikiki1i0Cpijp9pPsWCkissHCZCjpIpkiyiXirpri0pTsepMsYpfpQCksBs5p2CGsRCmsbp1iMi3CZpmpJzDiUspiQsustidifCfsIpdiDC4php4p1pYspi9zDsaCFs8sjC3iRiOiaCVi9pfCjCNsPsLsipfCSCriWplCkCni6C4iip5p3phsvpspzCEstiji7iGicpCs9pFs0pMCxsjCDCtsvppppsIiSi4CIp3s7iYCFpxilpeimiMiPCjpnidieCmiap5sMisigpgpKpppCprpXiDp9sLi0spCDCCCBiOsasMs1iPinsSCEsjCAiuimCEiHCiChiPpXiHpiCcsMC8suCuiGpNCAiopOiECliTp2CppsCfCLiRi2i3iUsHpHzCCpsYC0sBC1pPsBCZilihigChsjCosXissMi6CszpCTzCCfC1s5igp5smiDCFpniBpXi7ChseiYsriJpEpbiwiEiWpXCdsBzDslsZsPC2sKCPCAsLCNsYspiTiysKi0sECLCGsTpqpqpTsLsIihstpAs1C5sqiviWiHiDsDp5irpFpXCOCtpAiazyiLi5CIC7scsxsxsCpEClsDi7i9pNpPCWs2CoiZsji6sVCKp2pfpXp2C9pZCgC0pSsKCts8zJsYi3iTieCECGsdicCRptpmCnpzskCciQpNs7CqCrpBCHCOp8CVCei6CUsOsrplCnsZpVsACsCjibi0sbsBpaCgp9phC5ijCtCGpnpsCxpHCzChC1priDsGpisaCyCPCmpmC1sOC3pkinCAi7CLC8sHpfsgCRiWpBshszsDC4i3Chp7saiGidCSCtpdzDp7sriMiJzpijsbpnpTi4s9ssiIpFzyCTiSpdiyp5pLCypDsvsiCTsvpkpws4iii2sjp2svssplissSpqC5pMiApjinpip1i4sKpkifsLsJCXsgp4sCsCCUpLpMpdsLs9CysIpOiZptpdsbCEppieCLp5ClsspJiFC8s1zDiQiOswpFiOsss2iYpqC8s0i4pRpdp7pypWivpdC1CnCzsms8sKp6p8sFpjpOCoCUCmsuilsazisEpfidzsC9CCitpusbiwCTiPpVsAspijiJsvCDprp9ClirpiCVsPC7iECIids7pAilzsiDp2CcCAp3pnpGi2iisnsdiDslsNsCsHi4CvpDiIzyC5syC4s6saifsaC1iECOsgsWphC6pNCvpnC8Crspibp7pLsOCfppCwpFpOiMCxiiC8iTCiirC9sVphs3iVpkCdsns7i4ikpFsQiKCJs3pNC4sZikpUiWClCWCGCTiKiHpGieicpSpeimiIigipCepcpescpWCmCfs3susPpysbieiLidC6s4sMCciFsssGpqiTCBCKCks8scpYidi9skpHCvsRiBsJi1CdpbiPirsmpfpepZC8C1CDzJpJixzyipiYCesiC5iJits6impepzCRiTiQs5i4iICHpei7pAp3i9pCzisvpxsOCACUsNp7CMCBpxpDpSprpZCrCQClp2CaitpTC3CAiRpwCvivi7iHpcpppUCGiFiks2s9pbzDsNsKp1CDi3sXC5iICjseCGpjsspYsppmsUi7CpCWpkCrsrpNpDsUs0CsiEiCiUsrppiliXsbCnsliOigiRispLpaiKCnCTpspsCJpCsmsSpOiXCIpmiKziC0sDpRimsOCDCfszs6i9sJpaC6itp0s7ClpJi4ijpDp8p4pOiQi4s2svp2pTpCsyCBpJCni7pZigsUCsCdpECLi6ifiisApasDpRpXi8sRCdiMs3CmCXCTziCFpCCeiXizCMiTsvp4pms3CPsKi7CCsWpRs7CBCUpViisUC7ijpypPs8pFpoihC6i2sMzDpNpepziFpWitiopnCdp1peCosJpJitC5sisAihsjpKsQsACGsMsTsAsSpeicixC1i7i5CkpIpiCFC9i2iFzpsazysxsGCVsjpOigsPpdpICTCDpxsxCWsAiJCfpEsEpOCPiRphirCWpXs3iAiuCEiop2iKCmsbp6imCxs6CmCbs5shsTs1pICwCDiaC4snpui4sesesGiKpxCyiRCUpXsviRCjizCgCBCdpisFpxpeCPCHiWs7p0sOs0sUsKsSiqCcsJsSCVpPCzCDCnsApsikpgiSC2pjstpfzJCJiFsWzipBpssLp1CksWiQs6CTiFCTskCbzzCTsJstsmC0C1C4CmsBsus2CpiapcCczCsPCxsSCRCziciRsjpwpyCoiApniYsOCQpGCVpei3sdC3s3CQirsAzJsZpRiLiYppipp7iainC4sxs5p1iIsLCZsgCWsAi8zJspsOpvsZswiciAi9sjsUsip1sAi0i1iEC0sYijCii7C6skiTsQsQsXC7i6pezDCEpesMsgseiliaibClsVsrpSpxihCVsnsKiiCosBitiFiwpOi1snzziqiuCZs3sVpcshCvCLp8pJCcs3siCQsaiusxszsgC0CbiGp9pxiuicpzsosciDs6ifpXC6sXp4pbs0sJp0CEiziTsyCXs8C9zpCfzpCLp7ivsWCbzDpkpcsZCFiriGiIpVCDsosyp2sMpPp9ifChsuzJCPpviRzCioCdsyC9i6iXiTCACeCzzzsOizs6CeprCMCts8CuCKCgsXpXshCziFpFp9sIsjiYChpkC6sksTiUppsVCAipsTsqs9sFsrsWCqp9smsUCEpLiWpTpLidiNizpascCYiup5scCNpopEiSiQpNCXCDixsqppi1C2s2C6irpOzpsWiQpapop6iOiliQpDCKsCigpIsMp6CKsXipiLCxC0CTiKinipsdCriYiGiXiviyiLi1i9CYi0CssAsIiUsypZpniZCNs2i0sRCTivCvsriWsoCnimCiieiQzisviziIi8Ceifs2sjp1izpjpyCpCuCfimiVpmsRiiiMp7pysus3pkCGpbs7sLi7i1i5pOpvCksRs5prpmiZsCsqidiXsTpCsQpFC8puCfpepHpAiNpeCCspzJsDiGC6sLi9pQCwzii9sDsSpTs1iWpViYpDiep9iHCICOics6CUsLCRp0CjsJC7iQs8CLpIsuCDsZpopICdi6i5C6iACZCpCGCpCJsls0ilpnCOpFzzpbsBC3CBiiiqiQzzCJCKCRpcCApl",0));
    CAIChatRouter.prototype["onSession"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CAIChatRouter.js","C7s2CtCNsqCmivCxstiypcikzzpBprC2sHsVplpSiBCOC3i4svipiPCQsZsnsUCwCbzss9iAspsoi5iRClCuCriHswCOs3pspKpps4Cli1prsnzssjiSCBsQpQCqpOp5sRpniRCGivCQC6pSC3zCprs3swsQsNsJpuiCslsViaigiTpFpdslCspTi8sDiTzsihpEC5p6pfpEipCvp3iPCRiDs1pSpjs9stCpCdsRsoCZp6pcCrCki0sVsEppsEpysYi3iHpcsTsNsQi0CCifCipxphs0izpIiwCjpspzpPsMCKCLiGpWCxiFsXiEC5pQsrp5stCrsBsXiSiQsriki4i2CSCks9pzsQpMpiC2swCriRpSi9pOzpCnpUsCCiirpoiCigsopopzCOiXiiiNCFpWCDCaihCyiTs3inpzC5ivp0svCMsGssCiCaCAsyimsxzziWi7i3ChCcpMiZpLpkpcpQzJisifsbCXC7CupuCVp1s6CSpNsyshsxpaCssppbi2swsHC0pyCwp4susUs6impnioCvi2CYi0soCECnsjsOiliUsqpAiyCAiLChispXpUiNimCksZiNpECoiXCKpyijp0sXsKiiiTiAihpFshCFs8pvzypDzDpgp0iXshzyCoCaijC6pbs3C8sPpnsCsZsRCOp7CFCCCuzCpfpAiqiZzipnCRCYp3pzsHiuiJiZiwCusbChi2i1iQpPsYsEsNitC9i8pFsypjs8susgpFpjs1phsGi3pUsUipppsaiEsCpSisspsYCopDslpoCpirsXswCICyiYpHCPpsiCpUpYCQpRC7s9smi6CXzJpPiYCEi0iDi2ihsACoCVsPimiuCWCCi1iNCAi6p0sgC1s3sci1sgicCwiTs8CJptzipNCbzisMCasXpiscC8s7p4ixiusbidpGCuCMiap4sqpNiKiFsUsBiqzzpBClC0p1zsC9ifssCGiJpvCkCWspsLzpzziTiqCbpjC7iIsUpACpsRC8soiIitpVsasliIsss5sBssi3pos2stiWi0ibiEpYp7iEsPp0pVi9p9CfigCMsAiEsGpji4pyCLsdpIsFC6s5sEppiYp0CUpQs8pzpVCCpMiLi4pXsMpupUsxscpQpYiNpAsxiWstpsiziLiNCDscCip4pkCTiSs4p3skp4pzsdCjCSp4C6CiCLCOplp6iTprsipcswpbC1pDs7zpiHCSixCVCxpYi0pnCypHiPsxsaCpinCnp1Cmzpp2iyzystsniFs2pnzisZpZsTsps2C0Cys0sTCYs8CozsCxpasQsysDC4iRCeiVipiuCti1iEinCdpEiTsPiZiIzCCKispOsniTi3pHpSs1pPCPiCCfpEiHpJp2CJCtidpss1svihpFifs8sNpuigsvptiDi2sACkpcCppJCeiHiVCaiDiyidCsC6CasPiuC4pVsQpNiMpqsOsHCBCDiCiOiVsFiws8C1pGCACxC5sxC9seCvpEpyi3pNi0sWC9pLCZCDivpepCiLpWC0iipmiIi0sQsUsXCEsnCNiPpQCOi5sLCgiLp4CdCzpHCWCcswidptCwiLsPpUiPsrptikpQpQCLCQC5iZiJs0sQsJsTiTiUsEiRiEs4pGsrCTpiiOChCFiWzDCRzDiEs7iJpspbpazsshirCdChi2i1p8snCYsiCQpSiIsDC5CHpuClizsIC2CYpusXiAC3CqCTsdCbCeshinpnp3sbpCiQpXpSCriWCbCzixp4ikpvsYzJilp8CLpusJizsqCUsrpxibpIsYpxiWp6iQzyiHzJsyiZzszsioCYCqCspJsbCysTsPCTi4pNshprsRidC3sLiWsaiVinpPilpUsascpFziibirpGs7szpUiJicsVp5iLslsIscippJs7pkpNsKpECaiMiTp5pBpepxiQp7sApCp6CWigpNCTi5CXiTsfiJplCzsgsZi1sNsApqCei2sasbs8iUsLC6iOs0pMiKsSpECQsjiczDiDsaphp6p4C5s6sczzpesAssp5ziijCdC6stiizDiGCYpYpIiACgC1i8swCeigC8C2ilC7iZprpYCHCHiVsLi1paziCjposaiRi5sMCZpKCGi8sHsEilCSCGpdp9sFshCHirC8iYsgiTpeiYpWzJiNiyi5pHCDpLp2sNpKibC4iDsAi1CNipCxCRsosKpriJCOCfpUCKCbzDsZsViKsasPpkpOpGi5CFphCKsRprpkpPp5ifCRiKiSpNs5CaCDiTiaimpssmCHiOs5CqiuCtiECapmphCbCCC4pyseC4smCWiSC7ibCJpxpQC4Cwi4iZCqsgCyCzzCCyixszCziFCxpTCeiYpNi8iTsKpssMC1sqsKCeCksMs4iBCyiXs4Cusfidphp6C6C6p4sFs0CMihp9pCzsi8CTp5iesis8sKpGsypGi1p7i3CiCmCupLpIidC8iSCeimpgpmzzzzpppOC5poCuiEsSiPCZiRpQpTiyCpCSsRsepoiiiosQiUpjsApJsFsRpKprsXsEiSCmpwCnCbpkpZp2sizssuprC4CyC8shpzpnsTi0iUiosKs4p1pUpeCapeibpppSpAp6CDChiopICupVpfscissgCEC4swpes0pcpFsCiai1iWCTCws7pipQCBpbCOpTChziiIpPixziicCkp9s0sps2iAitsNp1CjpHsXsPsWCMivs0p6sNpuifpWs7p4pFiDCPC9CmCIiiCuiUpgsvpGCJiJsWiPC6Cosep8sEsTpNsRs8ifsECXshzpiFswppsNiusKCfpRCmpSpRpUiEiNpGsZs2sAiVzCinpzstsdsDsosnsazzCrC2slidpxCSCQsfsDsCCqsUpQi2CfsqifCzp5pliiiVpxswplCfpviAi7pXCvCFCesNpVipsTsBCdCfi6pfCcC0sWC4C0sAiUC5szsNsACypEifC0pCs9Cgi5CIpOCbsOsvsvswsVsIsxpMihsCCTsoiYCks0CBCgCQCeiss7ssChptiNiOpbCgCtiVsui2zzsXiaCssYpUpqCXs6swioszsLiiscpFCop8s7CjsAChsQpas1pAiOp5CVpqzDikpRips9pLpgsqppCDiEi8ilpGsXsmi6pnCgsyzJiICWiwsRphCai0sGsqC6saCyiciWi6iYssiusJizCFi8pRi8pKsUp8poCSp3pfizsBpQiZCczJCOCdilC7CpswpuixCfs3sniHpUiAsTC0i9CSpqpVCgCxCWpMCvs2iyChsOpniXpysLizsui0iQitpICfskpsCysyCrpdCNslsopKp5iKpWsgi6ptsHsCpbCJieiPpmi6p8srCKpcsxiviwpxCfzpCgCNiVs4shpWCnCFiKsMpCsdiLpypwihCapoC3CIpfizp2sHpusGspsbsdi2CLC9iwigspzDpwCNCnsWzDsgprCesipbC4CCsdpDCoissVCyCopRCupIiHCyi1szspsQp1pJCppcivpNpHiMCri8CbC4CmCUsfprpGCVC7pnsssMp4iWiQiDifibssCzpHiHpGpMsLsLCZpIiniMsJsDiQzzioClCdpRsViUsGsFCqC2sOi3s0zCsysssGC3pICusPpxiKCssqiWslsrCvpupkiWpYsoissKsdpuCJpQppCxs7p4s0pkCNixsJiQiDsaCspUpvCgsfi4zpC8iIsnCGiOiMpii5CkpisziEizprCtC3C6ixCXCpsmsopKCcslClCHi0icC2iYzJifCVpjpbs6CBixpdiMpCi5s2pUCYpBieszC7sgsPsJiziviJiusKsGsfiviypupdCFpoCmssiViMiDpgi5pMsMi5CGp2sezDCVCgpbsZzzCdsepFiws2pEsLiYpDiriwikiVifsXzysdpys4imiDC7CqivpcsFiKpriuCRptiRijCACtpCpYisiVsbiqp9iXi0icinC8pXCksXCEpti6C0iXpNpZC2iLilsUCMCtiFsViui8Czp1sMpjsRCICxiyCvp6iqsCCaC8spCIpEiVsRpts8iGs0s9p2sNCTpYpSpqC5iHpPpspsiBCjC9C4pxpRC1CasgiCsPsRCoiQsCCwpki8CRs0CZiXissNiapUC3pTpFpGsACRi1C7CWsDikC8iqCdiGCtsiicpYCJsPiTiiCYi8pUpUCMCFCqp7psirCOp2prpeiypRspCBivCFsWs7zisCsfCeCji4COp5iusHzCpiCJiMCeiupLphCLiiC1ijsyiWpFpsC3stpgiRpCpyiPCGzyCQiDsMCtCvsdsQCOsAprCOpqiupCCICBiZi9pOiZioCsCEigpTivC9CVi2siicsrCUsGCcpFCDCzCbiep3pjs9iRzyi9CTCVivipiqsrpFCsszpIsHpAimiTCBinCJp6pYsTpophpvi0sBi1sSissoiUCwiesRzCiQsapopJpQpLpjpXCkimpLsEs7pDi7CmCrpUCfiXiFC1smzyilpUsesYiKp2i8s4iHsDpps5skC2p9pTCMCmsxzCiFifiWiRCLsfsTCZs0CpiJpUpICoppinpfiKC3CUipsCpYiyiPpcClCSsIiSiWiPCzCYiepkpBs2s9pPC7ijsTikidsMp7sfsACvsbpwp5iPsACEifziCYsTpHpEpPskpopZiWizprzps9CdC7ijiMpTsqiypJCWiZsMCZs3iOicivizsOpfCLCkCzCSi2plsnpXpsCJsMCtpazsicirCnsUpczDs9saiRi7CHCACjixC9pmCkifsiiqs0s0slC9pys3CZCOsxpyCwp9C8piphpHi9s8sNCSCRC1CJiXpLiBCNiippsIpGiGi4inzssWCoCbiii4CNCBpMivpVseiJCqCVCmpNinC5CcCgsQCBCbixiTClpuslC0CupKixCSCPi7pmCnpws6iNpiCWihs7sHieplCii2sbsGsBiNssC1CapAiEsqCBs0ptCbCKpgitiLiZsbCQCrC4prsssxpKpsC4pLCMp3iLiwiiCQCFpeCdpSsjsWiwsZs8CHs3i8p5sCi6p5syi2zDCYCBikCEifs4sPpACECds9CbCCpBCBiZiZCvClsji6C3pziQsUs5CapizisHCPsuCTiAiRs9sdsMpLiZpFivCpC2CGpKptpFpPpkpfiPp5CvissUCUiuCdiUCPsszDpgiXzzpgpJibiGsainsusQsICxzJC1CXsEpYpGChC1sqpms8CTsbsNiRi2iBp1piiYp2ikiOp5pasEpPiZiVsniusmzzscinsViOsLpBCfitp4CuslsVsjiCpWzDswpepfCvikpSiCsVinC4ClCkidiBs4pRiQszsEiRCqsHChpJCAsfChsRsDirCks1sXissOsEpoi2p5C7sFsup1iBC7ifiiC1s4pQiVCup6CLCQswpBsDiyCKCZCipdpCCZs2sZC4suiIpDp5CEp1pcpksKpGsSiLsls1iyitirpCCusnsLsXsLzspEC8p1CACUsoiDC1sUCBiUCRiZCFCaskCXC7Cfi1zDpfzCzppNCXiwiOpqCtCmsNppp9CWCgiMpDCRiNiCsBplCLs8C2pVizshsRC0pxp9i7CICSiTi2iXslisssscsxpBCyCWsgippXCOCHpNscswpDsSshsSiTiFpEpSiksoiWC4i6pZpUi9pEpCitiCzDs3izpdCcinp4pxi5iFsAp3pVsgpziTprCMiBpyslsEiHiYCPiziyzsskCwsgitsDpaibCCCVpXs8pTiFsWiYC6sOpesDpXiMpgi9pZibCiCQCkCUC9CdiWpzpUiwpMi6icssp1pXCuifpUi5ihszChCJsKpLikCciDsyiiiRpiigi7pIpupbCCs3CAszpBsWCss3pRCpCdpTsipJsJiDpm",1875));
    CAIChatRouter.prototype["onSessionUpload"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CAIChatRouter.js","sWsDp8C7ixiPCbCAsjp7iepMifsHpGp4CDzyCKsRCDCdsBC5iSsAiWiwioiUpLCtpYC8CdpUCAigp7iliaiPpDpviizDsJihC2CVsAzDsFsUsTiHzDsgpCi7CKibiaiQiZi0pnCSiQChsLpPCRCeiLpzs3iMiuiWCPs7CmC8piiws7sBChiZpQpBpspYpqpUpXsFCGCSp3pkiridipCFp7CnsYs9CziTpTpIiypxsfzpptiJCtsKCzpqpKskivCsiUiXiopgsECBpLijiDsXCxC4C5CtzCiIsIiJpBphiIsisCiEp5iZsCiriyirpMChsvpQsKstp5iBpdCJsdiepVCBprsPCJioiYi8pwi1s6pSp1iDsbCLCxiypSpfiFpzC0iCiGiKpBs7s7s5iBzDzJCKpEp1swiHszCapjiYsFC5s8pepFsHiDi2ppCJCapPsNspClplCTi4pfiPifCqs9ziieplC8Cwp6syiSCnstC6iFzzsWiPivChi6iGsfsCpRiXprspsaifpSi7CgsVprCjsQshpRpSiup3p4pVsdCMiJi7ixicCmsHiJCUplsjzpsdpAiAzizppBpczDpzC8p3i6igCwpDprCwsdiEsDp7pXpiC1pBiHCNsVscCepUzpioCOs0s3Cypds8iCsesJsnpHCAp2CvsnptCqsTpIiVziCYpciJilzpCSiupEpcshsfs0iMpJCBpWstpFpXsvisiwidsLioibsyiCsLp5p7sSpsiQpfCNC4iIsPpbiDCPpFpOpqpYpNiDsAsfpasdpZCMpCiCCSi2i4p2CFzpsFiTpei7s0iVi9sApdsfi9pDpSpFsbCIi4pkp6CFp5pypoCgsppwsOCCijpQCps9i9CsslCxsys0pqijp8CGiRsmiKsisJCGpQC4ssi4CpiPpipfiNsCiOpxiLsIzDp0pJiGpap5sapJsTsuCqsdilCHiLCNzis2sasmiasSsypoiQpXspiJi1i2s2C5pasbzpiyiosfiapEsEivpbs4sWCUpDsAstCTptp1i8sCpFiLpjpRsgsci3CvssiXpRCViKpDifi1pAiWs8iKpiCXCHpTpopqCECXpNCBpmCqpzCjzCiFsqiGiBC6iisYsdsqsXp8i8Cis3pXpZpSisCDCXikivpQs6zJCoiOsqpHpiipCnCkpbCLiACXihC5s0ipiopniRsHiusDppipp8pSpbiIsjpHCeiGCNiPpdsfCnC1zppZiMzzCkivpsp0CNijCIC4iDiHsssuisiqpci2iWsSiFCYCGCXzCiNCkitppzJC7iusKsIp4ClCKzsphs9prsNpiiFsPCyswsvsZiTippeC9CBpLpvipiTi6pisLsVCdszsisxCzCRp6syirilCki6pBsbCNppCxpeCezissiGsapaigiVCiscsni6puCbi3pCptCEsysisIC5pEsGpoC8CiCbilpTCdippGpMiViLpdCSsgiRsyCksbCFslsqpnpdiWCbCusjsJiVsRC3CgCICRifiLs5s2s5pZshpWswibs2sfpcsbpoCCpQiJpVC3CLCXzss8pfpWsMiFp2CqCxpMC1p5pSzyihposYzJphCbpLpKC9sxCqpesgCNpMzszssdsopgCCpEsppFshCYiWCZspiysWs0zCsNpyCRsDpGssCjpRC2isCliHCNpQifi7pJCcCRs6sbpnissnzsCMCiiwsOi6sliCshCXCJpACoprp7iviIpLsqsFiRpwpoiwirp6ibieCqCeiKpRsRs2p3shC5imiUCVsRsUsrpcspsWpbiwCZphi3swCpsSzJpcsJC8sbCdikCUCzCls8pPzCiSiqs1siCFCYiWzysMsJpjpRsAC2plids6iJi7sDzppGCdiFipC8CUCBsQpUCMsosqpMibpaCMi1CFpGC7p5s5ClCTpDiNiLs3pnsxs4iBC2iWC3CxpkpKpBzJCapCpmpfzpsniHCezCsJsuCdzJiosIC9CZpHpRp1CPpUziiLpasvpdsqsXCDpIsqpysCsVCCpHC6sJC9sfirCZzppXsNp0C2pQsNCNsviOiPs3pzCLs3pxpkiUi5scC1CrCgsTCjCoCYCEsjCLzip6ics0pqCnCbpSCMp9CosFiuCdpEC0sszzCUsUinC0CvCvixiRCisNsisNpasRpGCxCBpspPiGiqs8pUixsWCLiFsTCvsOsJirClisiXsDCVsCpzzps7pwzpCNCIiVpvCDzCiriRzzC9CLCas9sQpKCVstCgimsgCFCBipp7sppxpZpICApGpgsNCXsZsniHsHCkiisBsbsqCxCZpcpasasFCLidsWsaCXi9zsCHCYpHs6php6pYsEstsysxCfsJsTCip1CLiSCfsapgpFihCBzCsvCypEsJpGCliEpCiYsIioi8pnCYsRiViDpEpbixirpNsbpLCHsBioCNiti4CjCgCIs3s4p0iciEp2stpppJppsFsqs2sLpviPpxsWCIsQCApqCWClsGpzi4C6idCRigiWC9CTpVidswsDiqiyp1CFpDicijCgpVi4iOiZCUCBCQCFzJs1CZiYzDi6iRsXC3smpjsSCvpbpICjC6sZsDCvsJCVCEi1inivsji0iTsWspiDsos0sJp0paijixiTpdi0zyCeiKiOsTi8pnCgpJCwpUsspfCgssiJs8i7CGCSCRsgzDpWsjsTitpppmi9s1CPpXCizipXCGCaiaCGC1CFCBpjiAsOpUp1pmsWiuCmCEiGiICMzzifipsxiHpOs4iFC2zsswpei0pQCtsnpBsIsJsziXCrCEi0p7ptp1CyCCiHiTi0sFC6pmsRi5iqCdCTiei6i6idpRpksnpLsZi5CmiXChpvi2i5CmsGzzshsrs3sui2sYCVilipp2s2CHpRpjsZpmidpQiqpVCcsPsPs7iZCxp3pDi7CKiEslpnsZsxiNpCiPszi6prijsspViSils5p1pAs5szphpRC8imszi3pXphpks5sWCLsyiascCIslCgiTifiFsUsjpop6CeiisspNiapds8i1iFsjCbCrCosvC6iisZisiSixCTC3CRsIilpts9CWC2iJpszpCypMsfC7pZigiWsnpligpRs8sVsMiapMzzCFslpEsnsisspri9pnCNitCds4p8CpCXiXppCKCNiICBp9p4ibp4i8itp8s9CLzDzipgCZCfziioptsJprzCski7CepqiQsui4CrpFsCsDptixs1CWp4igsJp5iiiBpOpCsCs4pzszsaCpp7Chi3ptp9sciBsKCbpOpYiopPiViXiIp7pTp9CgpcpfpZiGpni9sgsMCuCfpMsTCfsSCKigiQitieC3priisbpppUzzs6smigiGpOs9pQpizysGsRpkzisdsjiopWsUCGitsmiDiisniHsii3CZsBiGsmCzsBprsKsWpCsKCUsNCBsMikCOC8prpSsesVipiKCzpaCRpGC5ssiSiEsLCApesZCWiostsciopfspCwC9CiCwsICbpQp2CBs9sfCPsNigCcsuizi2pDpACDC2CECrCJpssYsUp0CssmsaiZiPiUslCmpEicpqiJpfpOiipaCHiRpdCupLCbC0pmshsrskpJigCuiNCcs8pICjp5CDCwigsvphC5pQpTsOiqpliRpZswCcs8pQpsi6CHigpupvsLpbi2C6C5skzJp2ptiCiqCgsNiGp7priFiisMsIijswsDzzsdpPCVziiyCMiOCuioCqi8zyiqscsosuCasgstCEisCmpvpzpmpNsWzCzyiFpoisC9s1s1iFshCTChCiC1iUsSC6scstiziQpEC8CnplCNsuiKslCWpECJpkiVpZsupGiWsdCeizp8sBiJCkses0zppwCMpVsiptpZskCgioCji9CCidpMpQpwCEsbCIioiUsGCSsPp7CcsJiNiDC0pTsypkCLiBCAswzypNpOp4C3sJpgiUC4pFCViWphplCGpgp2p3pYiApQi6srsGiECPsAiDpGpnitCBsIpfzyiws0CGpIp6CVzppuCQCMCWs7ipi4pmikCypnp9CDCyspsNCXCuCMi1izs3COikpuiwziCMshiBiTsmpRpCiJsWsTCvzJpYs9s2pJsEprCGCrCwsdCvpPpci1sjCUpQzCzpCSpXi4pJpSCQimCxiFsGpKp9swC4zzpkpoipzpsEp1CvpbsBpLi1pCsOsdihpDiSpksnsLCVCWp4sCpPCUpSpKCxCpzCpwsBi5i2sHpbsqieiEiNsDi9smszCVCosHC3s7svpXCEsJpXCRsqsxsOiOi2iJC9ipCYC4CVpzpPsIsRCMCupDseiBsBieCGiRCLCXpxCtikivCEp4srzJCbCPsUsPpCCxiVCfiYsSiEC1iDiaCRphsDsGiPieCusUicp4sozsp2sCsGCysritpHppC0CtsSiXChi9iZinsKsxsoshsVCZsPpMzJiiCqiUpPsJsAimpCsaixscsWCUiwprp6ssiKpXptCusWp1p6pNCHi7ivpZs2CTpmzCioiPsIiiiYp7iusPsKCMiHiwsMi2slCfppCYC2Cgs9iWpWi7ijsVC8sRpqpPsKsIzCiEsRppsGsQsWsbiWiQpWsuiWC0peswiyp5sfiwiPiCsozpsPCmsJCgpIiJCtCIpKi7s7pGCMpwpuiDiosACYCbsXCNimpNCEiYCkpliBiTpWpYp4pyC2ipsBpsswCQpxsmiuiEi8sTiSCxsxCMiiiupVpJCEpCpvCfCcpWiSCcCGiIsjiApZpSi4s9s1CviWpdsoi7skziCgijp8CjpqC9CiiGCuCHsrixppiAiAsfpep1pSiYpJscphp7CXi3i0pyCkikieCzprzJs9sGsrpTi7pDpoCXpmsdCisuCOsNiSslC9p3zisyihpTiACFpZChsliyziiYpspnsis5i0pCsxiYCQpxs3ivsiCUpyiwCys0CYsRpvCMs6zyizimp5iXsfstsapmCKs7pZCGp5i4zsCviIiisVsaikpjsLCCiTiIp8i3sGpEiTCszJC7pmsiCwsqsZiVsYiisDsxCUsvCQiWi0sECrsei1i9sopDpUiwpUpmsWsKCdihCtCep5sMi9s8priSsQpCpApqpQsCiLziCYpUsFswsDC4iIsnCrs9srpTs9smpaivzsCEseChsczJpMihsdCwsOsLCjpHizCapPpeCUidsbp5ihCIpxiCsqCCsispCasLCxsopWC7i2CFiRsZCuCFiupbsXCRCLstpMCkCnC2pjpKp5iCikihsaspsfC3sFCbiQitCbChppp6ilp2s8C4iCCCC0iNCEpKCdCMsMCxsxsYzCCrsACCsjpQsJikiQpuCNiEpFzDiWpWp9ziCxp2iviUpjCXCosWiJiJCIs6i8sSCYsXiosHzDiuC9pgpupqCXpzsbiCigiTCdixsWssCFCICKicCeCApDprzJzDCqsrpysvp4pTpBs0CTs5p4iRCrp1CkCgsRpusxiDiWsJsQs3pmsVCZp6CLsoCgiLpgiSCwitzJsLCcimiqs0iDCEs0ChiXCZiJCRpEC3pSi5iyppsWpdscsEphC1sJiWizCMini6iAifziCNiAs7zyCDpVCECypSsXpDsXpfi1CBCEC4zJsDpWzspzppCbCDibClpNpssFC2iIiFpzsFpjpQzJsCpFinp4sNCPpVsFstCsCUi5s0pqCsCOiliWiLiupFsUsLCWiQpsCNs4CwiwiGieiQCczppcsMiNCGiWCKChCBC1iqCCs5i6CfpFpsCiCgifCkzDChiNiyiHCHCBshiQiZzCisCMs5s3CrCipZpiCRphsAi0CssIsNsBsEpusHs3itzpsIi6smpmp2pyC9i6ici3i9Cyp8zzsOs0priMCwCysypYp4sopnC8sbs6pMi8CcsazsisiesIC9sapJpFCZiOiYiDsfsBiesHiriQshsIsoppi4iaCgs9izshsOzJswi2iYiMstsXpnpjsCsypBiYiizCi0sFCgsPiEpnCOi0zyiBp2iAsLCJCSCUpfCwCQiXs2pEpZsGpspdCdsrsNs9pKp6sXs9shCACJsasOs5i7pliRs7pfpuCMiqsrC3i1pgsVsTsVsVCLCoCuigCriYp5iYivsbC5swpTsWiTCRpkpppFpppZpapus5pzskCwssiUpLi7ilpliap0C3zyC6C3CjpYi5CisApqicCZsoCQpfivpdshiUp5CqCuikCxpkpei7CKp0pdiCCwipzpCWpECyCxp5i2ChsyiApJsli2iGCCiis9s6iziuCjpjsHpusVCapYpfpAihiwCzCKssiRpWC7siifpVCszDsssNp3pIsEs6priFCcsMCopVCWseigpZs6zssbpjs6pVzsssCYCtp7sysAiBpri8sHs1i7swiTp2iksXpRi2pQiOsvsOC2i9srCZibCHiMpaCnibpEpuCNpsssC0p2pusGCHi8pLCXs8C6pgsxihpNiaiIiksYCLCIsOCCsBigsdiZC1pNplCyCFsfzCs7iDptCxpwpCCFi7prCcpWpEptibCnifpQpsikpCiwCECPiQC1pQiOiUCJiwi6p8C6COzpp1stsmpPsssnipsliOinCjsGiRCOigiRCZswCEpUCRpjiBp6iVs3pIpKp4pEpXp4iksaihsApop5CEins6p0iuskikCJzCsSpQCtswsVpBp4pCstCysziBzsCVpeCQi0iiC3CTCyivCoCOshCei9pCicsNsssLsbpriZCMC6p4p1p4iKpPsFpjCdpnpCins7s8scpDpSsjsBC5pqCLCYiNCxpIpqCVC3pSiFCfsFiVCzi9stiyCfiXpXsNCHioimpGzyCLpGpLplsDCKCCCfsGixiZpMpSCIp8pliPiqCFsLiYCDpmsEpsigsbCjpKpbiOshpRsSinsLzppCpfpzios2zCiiscsQp5skpSsNCEs5s7pSCuihpWsisBCusViRs2s4CGpXpUCKi7pUsKsrsGsZpjCPigp5pYsHs7spsupXCGpGiSpRCGpus2sMsCiUCFs6C5C1pZzzi9CPsqsqsdsesCszCECxpAphC4sIsECys0pPpsCGpWslpTs7sFiaCXzysOCSi5CICfpfzJiJpFpIs7s4iVsFihsYsRC3CCCBpdpNpZCiCYiIpOsNpVs2psiIsvCqsBiysIpdChCssCCiCZpzimsWiuCnCBs0pishi6puCbCqiazzpzzipPsoCki9sAikpliasDp3pViBCjitpipgsmCDs5C9CbiOplp1izCWpNsup8sOCpiUsFsisViPzCzisUpGC8sYpgsWzCpRizCIpNsXpqsUCWC3iSpSsOpOC5pKiJzDiTpBpzixCDiOsls5pfi1pVsnihC9pNsrC4iZsHphCVsniIiYC1CRCKCtihs3CQitp6soi1prpjCtiap3p7Cns5pECDzCpEi2CBC7p5imC1sIscCuinpeiLpWiDsYifCfp0sVsaiXi8CEpHptirp8iSpgs5ixziCjpJpkCUsCzDs7sUsys7sFsusMsCC8s8pKiyCHpWi9p2pAsHCIpiiHCysmiVszs8zzCriOsAskCjiCs2CDiCpcicsKpssLp3pipcsYs3CrpACkp0CliWsUpkpiCYiACBCApjsnpNpUCapdC3iasDCusas8iOCizDphp1ptsjikpMsXCCsIsBCdCks4iJirsSiriUC9issOC5ixiIpuCLiHsEicClzDpKCAsvsipACHpYiMCYp9seiFsWC0CPsVsRCuC7C7ici6sGpUpdiJC9CZiGpSibCqiDC1",4821));
    CAIChatRouter.prototype["onWorkspace"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CAIChatRouter.js","sopNCWi1CrpTp8pSphsmC1s5p6zpC8sbsrpJikptseC2paiFCEsCCepDiQiAC0psCiCqzCzziAiqCsp4CFi3CfiWpazpiUiiCCCzs8sxCkCUiFsJCfpPs7CUsUsaCXC9CQsvsWsPpJzisap8C9sPpIpRpJCgzypMpBCjiHi7sIsepZpkizplsOsWplisiopPizsVCSzzpICvpzpApzCjiqCbpdpApfCqzJptCrCuCapgCKstifsqiKiEzpsCC6p8iwCisYiLpAppiiigs9iCiMpHsSCHsbzysEsnChpRCVpoirpDiFCki0psi8sSpDpCplinspsusYCEiVsdsNsICei8zJpYCNCUs6iuzJpLpBp7CisqzCiOiQpRsnpZpqsbCEsmiHsUi3p7p8iIshCiCczyiei3iZCDiKC8i9iQp3svzspfC9CUCyigsniWiWihC7pas4sspHsGszpQixsCsYpssHC5zCpIiYCKCssnpNiLsPstCqsAp4CqpAsgpYi8CiC9CVpEirCniViKC9COC6sDsyiIpYCJsTiSsbpOpmsTs2zDstCUCQsnpNCYC8C1sJzDp6CfCaCyizpQCIiZpMipsJCCpWivsMpUCgCHCjpAsVCDihsBptpqsxpVC6ieCeCEC5i7sCCSiSsVsri0Ctp9iMCPpLseCtifCOiApriIsmsxi2puCOpLsTi2pbpcsOCopMidC8ptCJCqsCiRp0iRsxpLp8sSCFibpvCYsjChsuiuisiNpsCks6sEiACGpoiFsEzppuCBp7sHiZpqpaC0iZsisKiqpWCmiXs0swpGpzsMigsWiNzDsuseiNpNioi8CSCksaCopTCGp2ifCVCtiki2sVilCoi9pDiyCJCaCbprzss9iDCVi9C5ivsuiSCjs0sviuiRpQsesBsusbpriYiFCNpLCWCVs4s1pApXsEpXiZsipCiEsuCWi4pbsSiQpqsRiNpQC4CFsPpYpHpcpCpMitCvsiipifppC4COsNC9paspiHiKsPi8iBpBixpiiWiHCipWiFpICvphpmCzC3CIs7sLpYp7sSsZCGpXC5C3CvshpHi8pIsIpOpDiaCGCHCsiDpYsTshijpxCPsZCupUpJs5CfC8pmp8sUsJpViusFsYCkpcp3p3CjCSsYsFpMsWCOs6iazCs0sTiMsNilpOsopypzCDipisCTpnpRsgpcirCGCFCSzCsyissjp6iiiCpmC5pusIiuiiiysuptprCJsYCxswiPiKCRCksDCQp1p6iOp7pUsAimCxCqiUsoCpCtpOsgCms6ibsIshCOsmsrCYs2CGsGCui9s4igpepvpWCpi7sMiZpsp5sOiliepaimicsbpap8ilp2pbpki3iUzJiGiyiLptsPicCMixzipwiZp9zDCTiXp6s7iHpjpjpjCFpMCPCbisi6zyCcpQC7i3pvsUshs4snC8prClCgsbC9sBiAp9CGioiZsrCDCKpvi3iuCppmiSshiXp6iyi5iKs1CdsyCLCVs5CUiICDpEsYpZsvpuCoCWslsGsUivpbpyCmziCZpkiei8CWswslCipzCHswpzCFCximpfpQiSC8i5CNiwCpssiki9Ckpis0sdsqCZpWsWpNsQCtpjsgiZpmiBCwpDpws1pri5CLpAsjpopYsisbpBpSpmsXCrCSitC9C2CVpcsipdsNiqCKitCVsQpeizCTpKpws0CfizCep2inCrpKsyscCmskpEi5C7iWzii6pSzyCBsBp0iqi1pCiwClsQpBips8sQippMCUigsAstCNCJCdpxCqs5sGsfpbpvsrp9pFiIpTpTC8COpMpLCOpxsFiNpCziiGsIpLCypmsDCpCyibitCrsTiQsPpdpYCwpqpMppzppeiDsop6sciXsAsYpciiCUiiiDCLsXCMC9pUiEiMpBsjsCiZiLpdiQCWpgpwCvscpCsqsTsViKiEivCyi3s2plpGpNpOCqp6i3ioCasTsKp9pjpEidszpjC8pDpzCesBiNibzJiLpGpfpvpXCyiHsJs0sNposkstCOsji8sfpvCPCZs6sNpoiqiQsopIsnpKizprCFsAs4sWsYiapniRpOsRshsECqsspwpTCpiesNCSiYpFpTiyshsGCns4ijCWs8CtimscpvCrispEsls9i2sJCYpcCkiep3syshC9sQCFCJCssxpVCds7pMsQpKCWsKCHCcsDzJins8sli8zypACwitzDpKpxCiCSptCZizpCpZiZsdCvs6pishpZsuszizsgitpri9i9sFimsXC9p9iwi3pMsns9iTpMC4iWpkppi7pECsicirscpciRpRiRiwCWsXihsvililiXsapAsqiViLCoCOijpBsdpTzssyCJzzp0CICcCtCzCDC7iOs8pKsiiFpFsapsCMsoCaiKpuzCisCMiRiFs2sMCezJsai2sopdiiCVCNpHC3pushpWsLiSCTsPzyC6sSCupmslsdiQzyCTiyCbCUCUiCiHCrsQinpiiwiEstsAptsksxpZpzs4i9s4sXipinp4sriRCdibpKiwpviApCzCiyp0iyCwiXpFC2svCsslsDpBsxCviKiUC8pnCFCDi5pXpCpUCXsipJsopksLpQspCtpupesWp3s3iCpNCRpjsisAsnsNiYppp7ixCBCyiipmpfCOCkpKs7sppkiMCMinp8shpdizsWsWCvsCiiCqsDicpJskirCeCvshpVpSsrsGpYpkCEC2sBpWitCQCGiYpUpuCoCAsysviFp7sPsrpAs6iZCJicstsAshpDCys6CcpLiKCViWispes2sDCpC8ihCdiks2iosdpbs2iHsTiBpVsTCbi2C8stsUC1igi4CestC8iDibivslp4sTi8pLpBsdi2iIpXpgCLixi5iFiMCLptiuCyCCCNikCssFpysACBsDCBC6pas9CwCJsDpXifpasAihp2p2scsbibCqpuzDiDCpispppPsPp1CJivpUiFCdCZCfsJiwpup1iNiBiCpmCNpcinsLpip0pmiwpQC2ijC0pcC8sSiTi9i7ivpxpisZCys1ifscCPC1s3swioi7syCBC2zss4p9sgiBiYixpFphp4CvCIiiCUsWiciyi6i2C4pMiEzCpBsasNiPs0pZiVpbsEsKipixihpRiAzzC5ikpkCiCpscpNsmsiiaCuspppCGirpNiQsdCQiOpxpcCisnpNptiFCOpXsaiAC7ipijpNC6pfpFCkpui3CvC8CKp8p8s1C8syCHCZi9CesOs5pti8pFsUsdp8iNzCsbiSiqsSCvi4ixsOphsnzpiusTC9sqpXiZinpjC3iaCwC4pdi7pZsoCAsmiAzpCnCvpCs0ijC8i0iTi6pLzzsUzDioppsJp8CTCkidpCiNCjpusBsxC3pbiyiJCjpVpVCBiCCbsmssiYs6iwiOzsCrpwsEi6izsnpKivi8CkpjCcpsihzpiBiOprpVCEsmChski1iNsviEpGi1sfsSsesfs4s4psp8imsVzsCCpksICtssiWskpzsosWixpPCTpMiCplzDsOzCC6pFpoilCFiws5CViFiRsDp9CYpwpNs1CrCuiBsmzCsAiaCUCFp4i3zyi7C3sbiGpcsXsuiiiIibCBsFiFCgzispCNsviOCrptzsiji1C6iBzJiwpNC1s1CTp8sVCzCkpnsAp4pzidCqsnsBC5p7i3pIsgsNCYpTCOsVpKC0iQpLiViYCZstsICQp9CUsziRi6sFCeC9sxCnsviUihifpUsas3s3iqpkiYiMsbiUp0CfCwCDCDC3pjpLCSCwihifiRpQpviAp1s8CSC6iBiCp6s5phpMp8sSCyppCDsvC7paiCiapOpsCMpws6C7pMikCaCHs8pXpWziiUCFp5icpupCi8seC2iop3sjiUiMpmiWi9sBi9CrCcsACesCsVpziAzyzziVsmioCmpTCFizsepbsUC4CbieCmCECUiaiystprsFiisRCjibpbpgiGioiKzypPsOirC4spCoC0zpsMsxCQi5sgCPsdCesui1sVszCqiepXp1sZCPpzsepSstCzsEpxpIipibipiusditp7pApzC0iQCAiVijsesnCzCWigCZszs3C1CqsppFC0impYiRC2s2sbCjsTsssCphCUpZs4iGsNp3p2pLpFiECPpWCQpoCXzsCDsfCLzsiji0iOiVC3pCsJzDCUp1CEibiPCLpJCPC2i5iPsnidiECgsvsZCls8ChCezssEzsCkzCzspBipp4CuCqCvCnieiLikzyC2pUCSpKiaiWiKC1sNsrsissCtiXiWzzpgpGpBiiidCusKsIilslsUC1pFiwzDpJpQCHiJpssyCGscpnzDCtiSiks5pbi3ptsnsipKi9COChiECFsVsepMsup3CgCYiXpaiyp3sIC2CCC7C5CDCiiApZC5CrifCYiziYseizsgs8psCbpHCQiUpIiosdCosvCui5CrsHsOC5s2s0iqzDpxsbihili3pipTsIsZCHi5s1pTsEp6ivsQpyivsFioiiCUiwiCCICbiiiusdsFCkCMCtsuCjChswsQp0sHsbslp0shCazpslphCdpxCgpWsqsjips4C9sspUCAsNiNifCFiIp9sSsfCopTCushiuCgsdC0CtCNzCCls7sZCMCmsWCUpnseiCs3s1CrpcphCnifpsshijp8izi1CYCJsqCtCWsAzCpxsGieihpOijigisszixsfiNiwsAihi0iACgC1sNpxC2ssCCp2imsPC1pqpRs4CTiliIsRigCRsRCgp5i4ifCKp2i8sUsPCuiCC4ivsfiAikposqsyphi9pPCMC8s8CvsWpUpHskp0smCNiXsGs5CAs2pyCHieCcp9CAp4CjsIsoi3sks2p8p3pozpsiC3srC9iUCoCiCzprs4ispJpLzssKpmiuiXstzsCEitCaiqiYC0CJp7ilpFsKpWCgpmCDpQpgitswijs6svCXCbCbiFpBCZsWsgibpisNpqsvs6CtC0CwsOpoCipoCCimC8icCRsQsjpCCFziCmi3CtsEpdi3i4iBCPiGsbCasypciJsrijsSpep0iXpip8sypuiMCrCZpxicpDCrCAspstp1srCjiupls1iCifzipTptCasGpiChsNp7iPpcpJCZiaiJCususFCGiDsQisi5igCkCfiXpAsYpKCliHCACMiSCniNskCjCXCPCUp2smC9iECUsysGstC6pIzsprinpSpRseCliXsvsVsusJsdiazpsPinsDidp2igCzskpzCVCMpBCKsmi9pSs2pTpFpmsbCkCiiViLCIiDpVCCpqs6igsGsXCkCfpXCYCmpGizi8p6s7pesnp2p6pTppCqpjCfiXp7sls4CNs2s5CxCqsVpkpXsfCIziCtpipKpFi4C5zsC4ilptsDCGiIpoiCCysHiriiiZCVpLCkC0pUCqC1i7C9CRpfstsoiCpqCzihiApcpoCbCcsBCrCuC0sDpTpmpqiTinsds3iwicCOi4pzpwCHspsqicCUinCUiopACQs3CBpeizsOsGiiCIpNCGC1Cziji9i4iQsCpFpcC4zJCICnCZs5p7CFCDp1sUp0igimp4sMsepLiRpwseCiiizzpdzypnpWibs9sbiVzysDissjzyiZs1i6sKzCiVsFCNsPiziesPiSzCzpivsks3i3iuiGi5sGpssUsSsYCb",8723));
    CAIChatRouter.prototype["onChat"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CAIChatRouter.js","i2COinCkziiJpGClshiyzzpiipsas8pUC5zszipfpGs2pAsMiZC7CPsrCFCjCZC7szpJprCepVCiCQsIsGpGsBsCiRCysxsLprCszpCUsCCMi2i2i2pxCJsFs8iJsnCFpYp4CxiSsNpfppioCXpqiVpXiYsfiVitirp5pNCRzCi7CmsmiNsQC9s8sYi5igiipNsEp7sGi4pNzsiwiLiwpcigC3s5sep9sqszsLpfpVCxpRCVCEC9icpqCwifsriMi9ifzpiCpzpkCWzJpcsjs8iksdi6iXiHCrsmsSzJsjimzDCkijivC4shipi5CMipsgiwCpiPs9s3sXszpniUCnpIC5CQp2p3pSC5CWp7s5CvC5iGiXirslpNsliwiPsiixpysGpECrsPpICKpZppsViOiUilsupyiLp4CqslpIsmpJiHiBihCZimCrilswixs0CWiNCzizpcsJCTiNCBpYs5iEixsHsiigpLCMpbi0sDpGzii9soCECtsqC6CRigsgCYicptstp6pJCrpKsDibpazJC0sOi4iNsbpZsKiPi0sMCBi7sLpJCwstiwiqi6CrpNC7idCBsFiFppsdpesUpCCUCtsDCPibCasSpIiTsnpdpmCnCDC2plsqsZpvCXCksQpzpVsZCApgpJCjsvsupcpmiWzDiCCDpUpBiAs0scsmsdiri0sMs6CSphsHCViRpwCosniJsDpciRsMi1zDpvzppjiTiuCpziC8sUCvpnCdiiCxsxCoCesdCFigpCC5sqptimsYsrpHCAsTiXivivpdCSpfCFidimskiUC2iwiRsPCRpasgsSsip3iNpDp9Cbs3CUixpbsACvC5pmC4sZCOiGpopEiLCiikpyivpKpTpiicpmi2sjsDsRC4i7sgzsCMpqp3smscp4C4CMiszzs6snpnpismsOC8CLphi4iXsbs5CisqCwsepciVC6sgC4CrigCNpnssCHpTCCs2iQpVpCzJp6p1i0swiTCciCs2sEi1sxCnCCC1itiLCGiwsUsgi9sDsmCgpOpipyC7iWzyiBs0C7iyiRsrpls3s5sEivsOpJCRsKCLpdifstCJsdpbijzsCEiOsRiBsZpHirCrpdCYiKpqsoiksxiwi5Cwsfi6sUsniystpri9pwCXCKiQzDp2pqsusYzisfsoiHiVswCxCaCoCeCGpdi0iHCoCOijpQpziQssiwpAC4iAsHpfsXipCuCEpii2pxifsgiAC8p3ClsMpji0itiyimCsp3sjzyCLiZCrsLiSiEilpnsoposUsOiNiFsqsGs3CupkshirCZCRp0pssBCLCAspsZCHzisfCppyi9CPpviIsKsbprszsaC0ssiBp7zDsVCdsnCcCnsvCBs3iJpNsPs8pososDsqpGs9CwiQi9sZsaskiVpup1iopGiOsipwCspwC9pepbCfiZs2iniapqCAC2CSptC5sQszs0ihpisWzpCkCtivsqChC9CAC9iIsAsIs3ihCIpUsEpCCrsZCtiXiTpnsvieivCVstsOsTs1pgsephibpmibzziIsuCls7CusjC8CliUCMi5iPiAsfp6pPpgpussCUC4CACNCipUpTpNCsipsyiop0iEiwsqp1pBigCoClpQp6CoiyiqsLp7CEswpViuprsmCJpIs6iDptp4CHiwC4sxzssesJp2Cmswp7i0CapEpEsIp1pysyscpnsHsgCApgp3CBsPinpXsrses6sLpkpFiUC4ChilpcC7CCsOp3snpOsnCuiuC3irpdCtsjCZiDCNCbi2iSsBiRCWiCiEi6iesTioCJC3iDCKsSsIpqsgsQiyClidpMsOiqCmiVCvCUpMCWidCvp4pGsfszsTs9pnCOC5iRCtCSCYi6p7iciCpUpMp6ibpipSsNpdCPsFpnp3sIiDiSivpks0sbsGsWiIpSCmsJpHiaCPpbCOi2iIpfpMzpCfiWprCXCfitssCPzipQpwpmC2CGpkpqigpMi0CSpuseCUpDCTshiRpgzJs6Cli3iMCWCPsJirpls2iaiYsrpiphpfCtpgibprpEihsuCRp9ptsfpsiJsEpQscsIpEifiLifiuClshpnsdCAphiuissiCds3CbsAzis6sIiBsBCesastiKCQiBpTsTsFiuCqCOsLiqiIzCCRiTseCGpxidi1sOsHigCwpYsnC4iLsDC7sJCts7CvpLsTi5CBsopTzJsECzCRiVCcCEiiCEs2ChpHpspUCoCVC5ziiqpPiEpdssi2plsJiui5COi8C9pFCDiJsMi6pmigiBiyCpisiVC5CppTibiSpKp8pDi3zzpFsjsiCniAi3pSCmpTCziki6s2CtC1CFsMseCYi3CBpHs3iDipsliWstzJCCppswCRsss5CIpopap7itsXsMCbpes4iysii0CdCmpKC4CXpbCXpTCZpjCypECkCACyCPiRsXpgCKsRsxpvsPsoChpWCjC9iSiliZCKiipFsHp3sxshpmpECXptCoCjCespiWCIp8pMslphCOpTCTCvsSpSi7CaCoiHsCsesqiwpgsIiwsSCBC9izsCi6i5ikiBC7ioCeiUs5iiC3sSinCWpeCVpaiGiZiLCLCMCSsNiks3CEpGChs2sVsepWCICcCLCWpupks1sEp6pNCoCDCWiIitpqCHs5iYiLpiCRCNp1CqC5pksYiZi4iyi7s6Ckp1CzCCsSscizCLpysesdpgsCCSi6iDpViCitCksjCvirp8COp5iHsTsyCcscsOpnpQiNCaCipOsXsTp8s7s7piC5i3CcsiiipPsviCsUiKiTsjiKCup8iTpoiEpdCcCapPscCvi1pei0pGs5pdsGsVpUCXijs7zppkpYieCmils4sypzCfpPitpmslCKszCdioCupaiOsXsQsWpdsupgswCpipsuzismpjpJigCcCgpTiyCTiiCbsxskiBp2pNsppKsVCCiqpdiLsdifikiKCvikpesKpuCQpdCSCvsSiVpQsjpNCDiDp9pSCQCRi8ispViCpoCGidpUsWpOijsrstp5sTpgCkpypMCCiDCksSsgpYisC1C1CiC8pBpxpXifCfpbC7CmpUCDiXs4CisQCipdsNsviasgsWCTCoilpGpBC5sNsJiHC3i1s5sKsesBsapAipp5seCQszChCQsxs2CYslsAsrp6CmC4CZsEC9pcpPCDsmiBitCtCSpXCWCyCmCvCrsrsfCZsrsrCgiQs5C8shCksTiEprinslpbs1ikCnC9syCUsspCChCkiWCHCOsBzpCXsHzysFsuisiupZClpdCaslpxCZCqs8sVpvixCjpWCgp5szC1iRCUpVzJi5pyCDCTixizsxpksyiJp5shiNicp5sNpACHCDCAiaC8iosCpxpossCYsuCIsHiCpypLs7imsFCbCLpWp7CLpxC4sjCbs2pKClsvihsri5ios6CUsWCbCyCZpCpZCRsYCkiziviQCzp6s3igiBspiAiDpGslCos4iss1zpCNpusbixspCPpIilipsRp2pHpKzis9sYpWs7C9sTpCs9sWi3pspEsEivihiIsdi0sACipxidihCosusaCTsusCCFpRiTifCVCVCLiqiop9p0sIsFCzs2irsbiciUiWzJpPC7sfiazyiAsRpgp5pHptCgpHplCMiYphzDiDzppEsIp6zspiCkCrpzCrCipgirpYCZCfCAC3pviEClC9s9ihCjptCzpSsai3iKs5i0sfsRC4slpYsHC5iGpHpqpXinp7CviYC6sUp9CkpLiAiIsziJpVpCziiZCssRiRpoCsCXpXiIskshp1i5sIpZCSCDi6iUiWp8pHCYizCOCjiizyi1CMi6s2pkp2zJsgCriuC5Cop4iosUpfzJpGsCiBpNp5s1sICHpOpNsTsCsSpUp1iJCWC7sViTsVCYpOp1CCptiViwiCpPC5ziivi8i1iGzip4iEiWpbCiCls9pViEpTpapjsMpTshpGsYsaiMinsvispWiiCviDpzioiesgCAiasCiypnpcpqiCpDsFpoi9CVCqspCCCbCrClifiGC6CsCHi8i8pspNCyiKCus7CYCYs5CMpxsbCoiLsLiepesWi6iOpssZCUsFCyCxiapIpViUCpskiepliEiCCvs8pmpgCzpdCMC7s7CEpgsXsHp2paiLiOi6i7sjpfsjCipqikzpCFs0CqCIpviPpdpaCUCIsUiusKC6sbzsi0poClCXp3pyCDs6ssCPsipoCLi7iciBiPifCXpFshiXp6iHpBsbigpriUp7CDi2pRpVifpgpxsaiSpRpypbi5pFC8iVzsCaswsjsjCUivsasvCxsgCFpZiosSziiiCKpSp6sDiiCwCMppC8soiZiTiep3sRCxiUpnCgCGsWiJiZCYCkCJi9pnivigCBsps0iJp2ixsjiCC5iFs3iViJpKCWiMsyp1iGCyppCepDsJsWsIi2iUi5CliGsMpdsdp8C2iUi2sEs2sisjpSsEsPsEiVCqshinCOsupOCrizipp7C1s3pSptCLpUCyCtCkiQiOCas8sRpRi4CnpJCos7s7sJCTzziXi9iEsdpbCxp6CWC9i0i6pNs5pZzziECIpvp8sSsOC4pXspihCriPCrs3iZCfptsdCvspC2iWiXpYpcCuCYsUigzppyCWi8CHpdsYirsNsEsqp6iUCKsKiPpKshpjCbCoCOi8sZihpTiUpZiiplCBCSCBs6CspCskiWCxi8iRstsFiGCLpWp0COiiCrsbzCpWCbpBsJiVpNC9CdsUCrpFinpOpfp7pnCBskp8iCiys2pEsviOsNCAzJpniximsmCZseskiEpvzppsiXCYshp5sRiapZCezpp0pdCbikiNCfsoC8i9sIp8i1pCpiCgzDiGpzifCkCwsWiPsSsei7zyCKi4iyi6sTiyiOimCoiUCFpepcsHCNCRCuChsvphsLCQCrp3pVpDpgpkpmpNskskikCkiKsPsQsksRpYsECqsvifiesJsFCFs8CppnC5sRpHsTzpsSpRsxijsXiMCssesBCFCjsWsLpdsOiAiepQC2s2CKCgiLpYCLCWiCC9pSspiupos5p0suiBCjCCimsziQCtsWi5pmpBCZspCKiEzJsXiVpzCUstsqs0slpsiDsZpGi3pvpmpFCICmi5irCTCgpdieskC2iEpgiGzyiwskC3zDpeCDCmsriUp6zCpCpLp7CRpCCOs9i0pJCLC9sniPiAiAiQp3C7paiyiVCZsPpli7iKsVi1pezJs0sdsusppls0CXCpsFCxpai9idC2C4iGseCxsuCdsxCIsbpBiFskiksKsIpesxsTs7iki3p0sICMsGCbi6pdCrC3C9ibCTCnsyiIsZCAsJCzsts5CYigiSC9p0pDs1sjsypViYiUpfC0pUsnsDiyCciGp1pcpGs3p9sXC9iisiiai7stiviPsPsLp1pHiOsqiAzzpVzppOigi6iJCZsDpbp3sHCWCcspCDsPiHswCHiJi1zsCACPCzsCiUiks4pVijCQC8ijpGsppgCUs0sHpnCXiWiqptCvsZp2sdpZzJpFiip7ppCMisp5pXCEiKsWsvsbpdsJCAiasMpGCJC8CHpxipsVipissLsCsziTpri2Cui7C7pOzJCYp2sHsRiNCMseCcCki2pasipbpICziaCssSpUpJsKCTCeipiECAzDsQiPCWsXiyp5ijiupksfi7imCLCNiqsKC6CDpbCFp1pKiippiys6sxC6sfiTpbsgCBpSpiCaiLpIpOpqp1smpLiriiCZCop6p3ibCzsLC0sVivi2CspBscpQsCCtimpPpepTiNsNCcp1pUiHpFptiSsjpnsbspCzivpfpQinCesICDCJpfsbpNshsDCvpVChs5p0pYiZiuCaCGpasWpVCfCzCFCopHs3CUzypoijsgCSiPCmpJsPiQpKpmsTsnpOppi3sts0saiPpfCjC4ifp4s2CAsVihCisKCqCQp1i3sHCBsOpqiTsDs7C9CIC0CYiGCKCmpFCmpGpIC2p9ppiBsIposPCasrsspqpZCdijiZsIpRiep2sgppi9ppiNCDiTs3pei8i5CJpXCssHCdCtiOCJpVsLsUiMsniHiEiWCXi1pyiYCQp8zpsasrCNsupdCaCdC8CdixsmiciliFsqs0srsuCvimCniMpIibC1CSp2iXCjCpC2CupMs8iDiEsxzipmCmikpHs2ssiXpisyCQzJCLpRzzimCFstCLCdCmpsCupdiQpcsiCiCOsYCHiLCjirpiiipjCMCYzpiwp2pqpnsziysIiJCYpSiLiFCLpPswCCibpvigpci6iMChCiCzi3C6i2i0ziCapAi6ipiFCnp3ziCZiXzCiRscseCsslsjCDiHi4pPpKsMCRpmClpHCHiBsVpGp3iTCYiopYpPs3pTpriLiTspsViIsCC9s5sZCti7i4iqiEiQsvpHiwCuCfsaCWpZiOsPsfioiQifzyicCDsAs2ifs2pSs5CWpeiQp7zJsUsHCqCkpppCzspYCbsqszCRsTsNiLipiKCuiXpFsDilifi5s3p8zzpmCas2ibieiXp8zipBsRpYzszysKp8CHsQsmCMs5ihicp1sNCBi5i8psidpriMp6iisppTC3s2ioiaibieCkiSCzpEppCXpziMCnicCMsqiyCssEzDChsap5CTpLsTCnispNscsYCZsWiNiTsPsyCoi9CLCriXiQCOius8pIpxCIsfCosupOCwpZpxsuCyi7C9p6igCtsYCQsZsjzCCPCVp1s5sAs3CCCjzziciPCus0pbinpesipiiuphp5pHiSzDsYiFCiiSCqiOi5pzsYzspSpLiHsOsjsHinzys1itiopEimsypuCti0slCnCssQini1ias2Cys3ChCDi4ilsQCoiXsEsHCaC0iFCYCdzzsasLpnpms7iIsuisCgphiHsqCiC3p8p5shpvCPCOsTphCgCosDpEidpEzyibiQikszC8phscsgpJiTsbCxpvpbiCs8scsHs5iiCOpeiTsTshpDpqpUsci5sgprzJppCUitsaiHisCQiTpupyiBiUpjscCLC7iTszpwiEs2sMsgCYiNiXsrzCC2pypHsqCWzzsQi6iWixp6CjppsOpKpDpDizp1ihpHsqpwiFi0iYpii5sZsnpxilCWioCwC6iJsECopQpspXiIstsKpSiwpdiZs1p9s7irs2CLsJp9iUs1igiEzyCcpvioiTi4iCshiSCoCvCLiPseiFimpwipCopni4iPihpuzJpdCzi2iFskpWs0CPsIsEpUpviOs7sNiAiJsziepus0pMziiji0pQCGs5i7sliSCSsZicsRpZClpXzpzJiozCCVCMp1svsPCGiVp9CVC5sRiJiUisiLiTiOpjsqCsiTikiuiRphpRp8sVpvsRCuCkC1ifsXs8CiiosHsbsdCkC7sssFCmi8soCQirp5i7CzpQC6iMs9sWs0pcszpCsNsWiIi6iCizi4iIiDCasSiTi9C5s0i4spizpDsuCFi6pSCtzCCuChiCpzs0pSpksjCNsJpmiqszCoCtpjpGsGp1CUsQpnpOslsGiBCzC2sIiYsWpFpRpopipiivC0pzpBs0pdsDiUCHsrCxiICFCSssi9zysWpwsGCQsJCascsdsNC3sFsniipIsWzCs8pgzpC5sgsriRs8p2i5CVsFiEs5i2s5pRs2pMsWirCvsWifiYCRiNiEzDs0pIs1sMCnC5iCiDC7pApOCHCoiTCVpjiOiWioifisiipgCOibswp6pkiniFpWC4CSs7pspKp4s1CsiipjsnzyC3zDp5pJiECciwiRpRpXzisYpLihsTC1i3i7pGsMiqCJCMiUpaCksfCXscpnCXi4sfs3phCvsvsspYC6ClCgp7pOCdzpphCKi2slCHsVCvCji0puzpivpqippssZpKsIsWi9iVCNpGiAslsRsGs0C2iiC5CYsLsyCGijCeCKsdCEiZsOzis5philsEsyi8CvCUi4CwiozCibC5iwiuzzpzpOClCVsaiFpIs0pSCVsls8zppJCXCYijCtpmCxCQCWCFs4sai0isCtinixpMsYpuCVCrptsqiui1s2sppWiiC6snCipcpfscCusdifs5CjCHsrp0CVsNpZs4pICxpopGi4CYCsiBiYpDsAsJiLskpjCostsHiDp2CyirpNp2isstsQpMsPs0sQizCFp4p0psiNsvijsuifiapYpACSsFprpzi2iUieplp3iaskiGCiiupTCFpKCfivs8ptCGpKCqpNpFCNCLsBsJsPswsisoCYs2p9p5C0s7pypDsaCisxioC6CdpUCFiFsHpQpbCYsfpPsViUzCsLiEpfCMirpnzysCzyCCCysAsrihCSsIC3irC1spzDC0CQsEsuiMCPzDpximp9ifCNsYCIsJp4pipRpjirimivpYpRsjiQsspgiGCqiZCvidiSCEpiCOCTiwixsdpCsLC8iXiVidi5CnpepRCDsMCKpzihCwiGpLsAi2zzCBCCimsjC3sjsdpZC6srsUpqCJpyCxCZsFiGpfpZpKsOswpsioips4pts4i7pLp6CsCaCkp9p0p3iap8pPpgipskCriMsYsopXpBsJiSCUsLiUpxiPCCCEiDi2p8CLiOp5Cei0s5iUCkp2Cbs8CezCizihinCzp6smscpQpEsvp0pEiNCLpcCQpHs4iwC6pgC8CxsNsOsepUpPCwpbsGisi8CCicCmsPiTCWpYifipiipgi7srsfiFs8C2sJzJiliJC4ihpeC1iNpWp8pPifpRpGsvCEs4CzsKsxCAzCshpssspDCxsgsWp7iJCEi4p3p9sSCRpysspDiVpMCGs9iKiLs5C9seCMCNsoiIiuiNCEp8pjswiyixC0ifCQilsLsaiRsSCkCCprCapUsoCOzypdsCpdCqs9CciUiVsRsNCLCMC1pSivpQCksjChsxCFsECms4pEp9CGipiHpwsOC5puCmsQspsopJsiiNsviusBCApip1iPimCvikpdpmC4pBp4pCCWpqsGCwCkzspjCoC9CMi1CwppiazsziCJCgsOi5sjsWCqspChihsrC8CoslijsHi3ivzyCkC6sFCXiDiECzsgpcpOsMpCssiXs1srCYC6pvpFCkimiRC4ieiZzDCCsOigsMslpZiiiXzCiNpapuCfpbCQCdC5zpidioijCMifpYpHinsUiQpGslCdsCsts5i6C0iBikpfpliAswCFzppIsMphp7CSC0sWinpuCZi4iMpciNp9CdphsqiOpmpVpnCyCfiyi5i6CjpBibiWC4CyivC6iOiXpOpzpqs5pjiXiKp3iHpyixsCses4pMC2ijC6CUCnzsiPsmCmspCXiXpUpWCmixpQC8peiOCJsOsJC8CxpSC9sUCdCuC6sjiysIsrCisIszpnC5iYChsBibs6iWiqpnphseCzCHibzDCbpEpKC9iysyiPi6sBi2s0CLpKpsCJiJsCi3sKCGiPCvstsIiYpQsliOC2izsrimpnseidC2iaCOCnsji7pBprpPCEsICoispls7icCQCeppscCxi9iuCKC6pnpLi1iapGsCCIi2suiPiACNpJias0pvpcsrpnsLpNpOsJpoiwpipfiuCes2CjpypUi5ihCMiushCgibsdsmsTsYsZsGpNsjCfiypvCMiGsopKCLiLsJCgpJs3zyCFzzCYipivsYzpCiitp9ikC8iciysNCZpHscC5iDiriYsCC1impZiGC2sXCZs7snC8CBCrpXzzsmzzpsp5i0COsCsAsGsSCJCwiGCLpApDpHswpfsNsECYsTiOijCwp7iiCdsOC8CPCwsXzzsACJC7poihilpNpGCypUCfC2CeCcpFCipSpyiliFsziuCDCcsPivCRp5C5CTi9CmCtCViFsXposcCHiCizsHi6s3COsOC9ijsWs9pbpAsLsZp1pyzsipp5sSpGstiMCzsuC6pyCnpQCJCysTCBpZsZCapJsqi1sApqibicirirzsiriRiDCwiRCwpXsDCUsqCBp3iJzpCgCsCViKiLiYiMiYigi6pKpmCcihposYCPiIsuidpKCNC9iRpbp8pZCNiUCpCxCKpMsfCezzpAiOptiPiZCYCmp9s1iUpCi2pYprp3pDimi8zpiNpSzppjpticpCpBp1pTsDsvpli9CpitzsiWpzsTsysyzysasmCKijsMCuChiliPC3Chp3iNCRpECQC0sBzziRzCCVCvpgsps7CpCxiziapxigC2pIsdsEsvsXiPsEp9sJpkzzpWptzJsgsEp7pRpasPiai7pJCcsLCnpEpyCFsYi6pbCLs3ips2iip0iAsji7pasAsEsJsoC2zysOCPpQskiRiHsRiNpbirCKiKigs8suivsVCepWiqCYCYinpjiEsspBs6ChiUp6CkClzCpBpsphsCp9iwCbCYiezDpPCMpQpTsQpAs1p5Cbp0CFiqpepMpZpppNiqsUCOstposPCqpViupIpfiBiep5CssAslsLs3sgsLCTibiTpgiksxpBCyiTCciFCSCiiuiZiGCPsNCvpVCvsQiFCeprpGs8pmpBC0Cists2p2CYCFsgpBsGpMi8pyC7sPs2pQiAC1s5pMswpZsbpdp5pNsBCwsWzCCMsHpXCvppiICNsiCiixsaCGCLiEiBstsoshC4sOp6C3CaCOi7ChzDiTCKCcs5CjskC8iTixzDsnsbstscpdpnpFixphpWirp4sWCPifp2sYCKpjC6plzCCRihCBCRiQi7sxp0iLiCCopasvpaimpzpwsApwi8iJiOiSC1CyCxsYpDpZsWswpxpvsPiSsnpBiAiLissKCysdsczDippiChCJscsViCp9C9COCgCxiGC0pACMCnsnsuskpKs2snsIzCpGi8sYsPiBswCmseCciXpti3Cvi1CipyCbpwChi6smsXCBpGsLsMiosNiOCNsLsKCYsfpoiqClpMCwijpsCLifCei5p0s0CMiziyCAp2CYsepWidpRCUCWicCvivpmsFCgpKp5CosLpqsxpAsoChi8iaitsUCNC2CRpECqijsfpCpZski2swptCMivsMp1pFzziwCyCVpCiTpMpDieCZszpipOpHp2pLCqs9pPCspapJCJpHsBpgCyCpswiPiBpFiKprCBixpvigChsoCTptivsqs5iXpkC0smCHC2",11576));
    CAIChatRouter.prototype["_connectImpl"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CAIChatRouter.js","CnsfCCiuzpieCEpHCLpbpepop2CMi1stiaClshiliBsysMigspC4CKpvifiOpWpds4zJiviCs5CMpICXi5iUpBiAp3CkpkiWs4i0ssC8sGp7iMpCCIsjiHpMitpwpOpasUzsiACyi2sPs1ippYsHsepLpGCRsmCeCOiwCfCpC6suCBCxCsiEs7s3ivC0p4pisKCFpzsmsAiIiPirCDC5zCpXCepXsAi2iBp6p3CxpFs6ikCtpNiVsYsyp3pqzisFCtpZC1Cfi1pVi4sgpCpcp6seCkiys5CApZCWiWpOs4CQsTicCmsCzyCXpzCHiSsIiuslCziyi5i6pBCQsupxC4i8sjpXCasnsosKsypyirp8CGCSpaiTi4swC9ppsqsrsYCepJCUpSCqpXp5zDpqi8pYp6Cbpmi1CDiBi3CXiqCliFpusYCxCWi8zsCTsHsUpUp2CfiwC1iYppiLplpeC5CXpNC0i1CzCdscsqpQpSCyCQp4pYCcsfpKiRpTsmC3p1CfsusRzip3pTpFsCsHCfpmsDi7CXsZpMCEs7inCPpPippxiVpwCbpliECbCts3sosWisi7s7sgiPCYCasWCtpHsyp1CLiCiJiCiAiwsqpuCppas3pXsDsdspCQpbzyiNiNCosZCdzJC7pRCNi8CICgiOpFiJi8CHC8pBiasGCqiVsEpQpTiqsWirC8zJzpCKsQsIicpksmCWp5sjs6CKiipDsXi5pRsXsiCJsjCeijsWsspnC7CyCppEsyzspNCGiWpjsCiSpXizCXsQsQsWpkiUzsziC7CsiPsRCNi4s4CKpfshs7paCICdi1shsVCIifslpEsVs2sVCWsRi6sFC6p0sDsEsBiHi1CDCpivC4pNsiC3CUsdpYicC6sBsGptCGskprsBiyC9CNpiiOC7CwpoCqChpMC0izsoiGpEphiICzpZi4C2CjsVCOCVswpDCLpviOpmzppJzJs9Csi5CFiJC4C7siC0iEpoCyzppcs9iHpRswihCdisCsCTziimCNCHsOiMsuiGChisCNpWCMiJpHCTiYpFpRsRi3sRsjCrpfzypCsdsJsMCpiKpSiSzyCms1sEi5iIsLCRpTCZCwpDC3p0plCiitCKpzCgCli3CnsKCbpkpNCIzzpqiSiQCwi3plpfspCgp1s7pkpai3iypmzJCGs5C9Coi2s6Caizi2CusEsepIsOC0pgiOippJpMpIpgzCiaCVCfsAslpRpzpWszpGpCpIsPpTCNCoCfCep7i0sDsEiti3CusYpAiQsHpWiuCysRiTiEpGC9ifi8pTC6sEsqiJCcpspasKitinC6pKiMCDzJiUs3iqCwsRiJsxpssTzyCQpcCjCRpBsBs5sksLsjC4CqiQpcs2zJsns0sdilpasUpBiPiTCkitpICOigizs4iDiuirsvi7idCopXCjsXzpsciqiBziinsvCYihs6CvpICyp8pSsQCypfsNCjsgsrprplCmsbC7C3CZiRCLCziwsusVsPiopEiiiZsWi4pRCfCWpapRsqCqibiMC0zsCCsuiWsHpcpsC3p5C0scpVsbCMCXsXivCzs3pfiNCHpLC5sSiniBsNijpji5zzsDi9iOsZpMzpinsTpGpzicpOs2CXsosMzyiFsOC5ikCKp7iNC4C7sMsMs7pJs0ivCMshiTsgiGsopninCwpsCXsfp8CTCypxiJsOiBC1zzpnCiCqsspWsFpvpUCgsHClC3iNC8i5iUsbskscs5p1s7itsJpHsQiVixChp6s3CysBpAiyifiNp1iisPC7iGikpOsapDCriJiMieCYpViLCipiCEsOsoizsxsCCwzDi4sgsYs6i1iRpxzJp2iuidCQpYCHpHihiji5sNCECosCiciGpusti0CfCQiBzzCTitiNpqpJiGpisYp0piiCpZCmsasKs3iuCHsYCEiMCPsTpMibsPi2ilsRiUs2CRC9slplptp5pFCDsisnpnsuihsrsvCUp0CjiCzyCkpVigpniap6sVpipAsACwCPzzCFCGC0pUstiPspsapgzzpDCZsJiMpYpMs0pKsqigsNpLi4iks1pPpXCnCfsiChitCxCdCtChpCiysViSCTClCPpjios2pBpDsECIiKiSiKiRCCCqiXpqits9szCzsiigpisxCvpQsGpxpdihiPCpCSiUCZsZpNCYpusbswshp3ibCTi6szpJCNsIplsnpKp3pOpMCjp6CEigC8iRC2iDC7CgswzyilpasJifpusYpGCmpWpqC7Cqs0iZpACEiXixsPpLius4igi2iVpFCGsspRpUiDpbCDpXsMCZCkC2s1CRi7pusVCLs7iYp0seivificiVpQCPsKswi5pxpYiSi3ssCQpCiBiJpaptCdsViUp1pwirpBsXsjs4sWsRCOCMCjiAC2p8CasbC9CwsDsip0icCUsQsLC8iuC7seC7pqi5CmsgzziKCfi9suC5phCUCRzyi4phici9pBpIsHprCtibsiixiRizCJpCpQCviaCisWCnsysksKpzsxCniSC9ikzisUpipLCYi5iHsHsgi2snCqsms7ivi5s6CZC7peiOsliZp0s5C7sWpEzpCnpMsSp0sfids6i7iyCopdi0CriUpTi7s0pJpHs4CrzCpwpgiepyCYphpmpHsUC4pfC5zpiTppCrptCxsJsRsqsTpmiCCGilCDiupnsmCFimCmippVpaCYsrpYpCCOCSsIpJCFCYCzpJiZCtsbChiSsHCLiypUsHisilCjpiCXzCioChpGiCilzspZs3pWiOsRCzpiiWiuiwsKiypssViMibi0zipCsQpQplzyiWiUC1ifseCwpUCOCSsRslCcCpsoClzsCEsXpJixC5sRpMCWi9pOios8iXsMi6pfpsiupSCXi4zDicpnpAsYChiFpJpfpHpPiOCVpFizpVCApjioC7CNs6pWi7CcsKiMszpkC3pJp6p2idsDs2pTCrp7pYiQiqCwiiCiiTC2C9suilsJszCsiTsei7pWsyCjCdzyCsini4igpEsECdiciEsEsZiUiQixCsipsyCip8pQsUpwpnpOp9icpxCliLssCwCGi5sdsip1puiXixzCzCstsfCZippiCEpdiKpYC8C7sApYpbpRpws3pSpYpfiSsFiiCjiACRCAC4CPzJi7iLshCwi5sqCyiBpOsJCcphp4CSCNzDijCms2sapepIpSsDilpniai6zysBpQiYzsp0C2prinCozDp7Cqp2sliYC1pai2i5iECXiQijpEsqCYCQiDiXCNCDCZpXiMCyi4ivCVzJiVpzsnCqics2s5CrpJC8sBsjsKsOpiCKikpBpOCjC5sDpUzDpHsmpksEiZiOpYCRpoi3ibsVCApliriACcC8pWsni0sOsGpUi2Cls9pEstiHCYppiopzC9CRzppQpICKsICJiapWsnCosbi7C4iJixCuCki6ifpAsJs5pus5p0s0sOpeiXzipesPzisgpysqzpsoC8Cpppp6CUias8pNC3igsLp5sTCSi6CDi4CmsnpGCBCnpaCcCzi3sgpvzsp5CBCjsCpmsup7CWpTCnslp7i8iiiTCXCdCGC4ppiZivp5CuCepTsVpfprsfp7CFiGCEikC3CaCxC3scsMitiLpmCapmpqCwsCsNpAC8icptiasysri6sQzJimiostijCRicC4CwCgCmChsSiWCIsVCDs9pNs1zCp1iJiHiWCqptpzCesnieiRsJsFCbpwi5sJiUChsJski2i8sdsgsOiWsXitCrC9i7sJp0supFCiiIiPiYpJCnsmiRC8s7snCSsFirCbpeioCsCLiHsYiyCGsci3CtiDiUplixi3CgCwp3izszpqilCrC9Cui3ikpppGs4prszpbiiCoCQzszpCEsCpYsBC1iFChCbiXpSsBsqzJi0CfpsirpBp5iKpHs9CpiZivC0iBiCsEzppACesiidCMi4impAiGsMiNCIi9pOivCAsopPsgi9iSC5pNiYs7sIirpRiipgCXpNzJCapastCsCoixpxCFC8iViLiZCSsDC2pPiFi8CipjpMiBs0smpMiBpdCZsTpGilC3i9zysRpeiTCqCnCRCtiWp7CusnpwiWiCCvpapppEseiKpSCgCopzi2popvsViPCfpQihsJpksBiSsriFCICICzC9pQiHsasGi8CpshpVpXpBsqpSigCKpoiIsOieiBChCXscCPsupnioi5CHpWsOCKC7CrsesOiypEiRsupApSiCphpyCnsUpqi6CJirCjstshsGstCTpIspsKzCCmzJCcClChpvCFpmiIsPpFimCSsQCsCBissFiWsFpNi6pkCICss1pqsOsGpusFCepDCapiiDp8iasjpLsIs5ispYs8pjswiqpwipiaslicC1i5ssCIiVpsCzpGpTiqscivi2iSptiNCdpApvsUsKsYC2pAi7ispCCJpOs8ifiHsGsICMCIsypFiJp7CVi6sLi1idiGsVp3ilsdiWswpTpyC5i4pZCeshs4sHCSiVpvpjiOCssTpsppiWCTpfp8pcsTC4sVpvsdCNChiVszC0i3p4sXpkCtsjsDpsCcsGp8sisBiGsvssCiplpkpupjsHi1pHCLpRCBp2sHsMCWpep6irCMpeCjiuCWCzsIs7ziCkC2p2pPiGs8CZpfiss7sdshsypTCsiOiPCrpXCXCoiDiQCJCiCliepLCzCwp5s4CbCCpCCIiUpRCosUCBCapcCNzzp8iYiBCrpBCxsrsSCIsliti3pjiVphCcpKikitsxCppksniIsTplsJpFC6iri6C1CACQzziyphCbCdCvCypyphizici2i0i5i1sRCosUpfixs6C7CGsWpWsdizpTCriNiMClp4iOCvsusDzzCyCKpnCCzyp1iQi4iepcCGCqCrC6scptslpazpCTphiIsjpQpjiBpzpkC7iApfiAp0C3C0p4i5CQs7suiQiwpQssiis9COiSCTC1CCsHsjpopQp3sZsvsjs4sOiWCOszphswias9sFsOzppAsAsss8pVpSpwsFzypKCFiSs1s1p1papfiiCvi8p6zDCks2sUizpBCkiFpbCDsXp3swzJipphCIsZi6sxi6sEp7pmpACxi9pbiDCQCUp4pPpGC5izpBs0zpi6iZsKpzp8sXC6sdihipsjCkzDC5C2iRzJC3sxpMCQpnCpCTsnpJiMs7syCOsjiDCusvpOC9iACsprsqsCsLCVCECKCPsqswsApqpApbiZiapXsDpJibClpos8CNCfC0C6CqzppxiaCPzyCjsMsipNpVCpiti0iZiWsAp0pUCNs8iWs9soC3pri7ifp2iepTpOpKsxpkpbiLi5sHCHs2p7C3sniMCYiXpQs1pUp0sQsZpos8CFp1snCHCtslipsozJCIs8pRpRCtC9CFp0iACUCsp8iICQpgsJstprpBsDsEpGCzsgiqiHC6CFsYiesJigiqCfi6iasHpEiZs2iVC1sFzCpSpWiICZsXp7iECIphpeC1i9sDpksxpBpUpAzDCFs8sciYixijpCpIpcsSpdiDiAimsTiJiYpNsupjCGpzpksMiYCDiNsPp6ixCtCIpXiLpLpGiDpYiXCtChC1sezzsis5prpMiuphsei4pMissbiqiPi6CcsTCRCepApbsQphpjpLs7spsts4pWsLsAiqiVpNi1iwCLCYilsis4pbCOzzCesmiai7svCeijspsaCVCliOCap8idC3s3sPCmpLpoCJp9pisTs9C6C8COzDsisOCopPiRsnsCsCC1iOpwi8CUpcCwiipOpTipzJC3CYCOiKC9s4sCimp4zpi3sOixCCiLigsUpksnCvpmiEpTpUszsRC8swiXiMpgCtCOiasHsgi9CbCIsss4p0sjsGiFsXCZsZzsCDC1pRsRCIC7CTp0sWp1sVCWCfsICTsBszijpjp9CriJpdpMCjCMs2sCsgClCtiBiNCGinCWpGiRzpzCC9C7CWsxCNsxiis0zJCepgsOzDsNi5ihibCiiziai3CdsQs6pzpWCriEp7sGzyCTpkpWsBiuC6i6ihCMiTsmsFi5iGiUs2sEphsHpWpWieiKiyCXp8pjs6CrpFiAiMsZCciLpPCMpJs6iFsEsWiup9CHClilpEpisVidi0CYsfCdCCioscCWpwsACXCRiMivicCCsws1paCLs9i2Clp2Cfp0CoCFiczzsiC3iHsAiBslCFpKpGiKpAsaCZCwi2iqC4iSp4izpiChpyCgCqCFpBpgsriqpoi5CDpbCYpjCcpLimsKCWi1i6CHzDshswpjsdiKCLsuikpoiMpqsWiHiCCwCdCFzCp4ClC0CephCSiMsfCNipsNpIizi1ixCEp8zzijCwCDppi0pUp7CdsLseidsdsViuini5s1i3srCxixpEpAswpMpepdpysgi9pysCCZsiCZCApqC0CTiwpQszptChpfCNpbprsPsQsMsEibpyCYCcCtpVsLiBpTiGiSsbsFits4pjzziJzsphpwCeijpBCDisiCiaCnshiFpQsps8pTspiHCzsFsHsDs3sLpxCwC2CACViNsGp6pCsKizsiCKClCCCqpECmiLCtCpsDi1inizpDCjsIzpCVs4sMiXiVikpopECXpGigshiZpXsjieCApRzzziiBCEpfsVppCHiZCMsViFiVsQsRCmiws4CmiTieCsipC4sgCLC3sisgCKi7plihiuCpCIpws5pECkssCfpWpgijpHpZCoC0stsiCqpbs6CNpIsoCjiaiCpusyCxsYiXi0sip3pupCi4igp8CACri3pQsssyiuClpqp5pUpeicCgpEp6iCi7sjsEiosdpZpjiQszi0p0pbiWsoiHCTsWsOiPi9s7pcpCpui5pPpMCapIs8s8p1smp4sAzpC3iPiSsDippuCqp9iLijp1sXsrCxppp8iGpBsYClsxCzpMp3sBiACtsviNCjpJCbCfinCGzyCqpasECHpcp6C7pgprpRsEpEs9iPi4sxCtiMCBCbC6zCi2sCpZskpFiEsQC0pgp2zzsisxsUsgsBsmsisRskCRsYiiipiCpysmCrpysyCqpvCzCQpliJsLCZsyC0iwstsDsZphsRipCzs6s6CzpjCypFiDsyCesJiIiHpqsRinCXippOp6s8p1s2CpCSCgsop0ibsWiUCQivsZptCziBpjzyphCzswzyigiTslpAiupLpJimsZpCsksyC9pRpMiXiysCiBpOsiCus3CXs0CdsZiNCJsws3sop3ChiPpjCJpNsNCLC4sAzCp9pUiniDiHiesZinsSC5CmCfiOipsQCwCvssiJpwp6pPsEs7iYpiCgCHsCC6pYiGs6CwiVCKiAsvCUiysbiuiOCFsPCCpiCTizigsDCPCDskiBp0i9pPsNsfp7iCixi3s2iTiEsniUs3CqsXsXs0p3pmp9sssTizsSiypCCbpDiOsczps4CSp0iqpYimCcp7C0p6iViDC1Cqi0s3COCjieCcCyCTphswC7pKitiTsEpWiFCwpwCiihpBzCpHCkpDiQp0sWpmpiimpms8prpACfsopypli2iRpGibsMi8iECap0CAiOCSixidisppsMsQsDs4C9C0Czs5sIiUiFpupLpMiwi3snirsRitCdCXiMsopfs9s3C5iGpTpTiGsyCtiXsXi4sOCZCcsus9iDiKilipiwCcp8piCnCxiZCaiOp6ptp6sMpYp4CAsNshsMCzsYpnimp6pWCRpPsViapap6iHiPCXCkijCYikpMpgClpspMiiiusfpki2snimiOpcifCvpbCipjpdpspFpaiTiTC1iqilpJpfCXsBsBpnC9iesvsli1iZiesNsnpustiYCIsQpACACPzspRsACes0pnpzpHiIspsvCusQpssDp1poCqi3CqC0iQClCJCPCcCOs5CJiapTC3pPiZCviXsVspzpsZiWs7pvCGsosMiospCcpGstirsfsepEpVs9pcsupksfCpC2iYC2i3sGilCWilsJCFi8CTsbs0pbi9iSCIiOpFsAsWCBpwiGpEpPsaiEC3C2sKCTiCiHsisdsvpNpRsxpWs9i2CWicCnCcshpksqsUCEpQC3CozzsJCIiAC9iJsRpDs4ivptiBp4pAp9p6zCiMsMpusdCKsGpPs0iUpzCDioppizCspVC6puCbsSsDCusxskClpaCGi2C4ilijirpNpJiCijzJs8iPizziiwCriwsNp7sAsXicpUsqpjioCfCqsqCsixp7sdsJiEpxpUpOixiDstiesBC0pOCbpYiipeiyCPiHzypmsDskscsfsSiQsksciBiyCuipiypdCXCWinCuCfsnpspoiRCvpOi8iyzDsjCrptCiziiTifCACIskCcCIiLsni2iQpQsrpPC9C7ClstizpQsqsACciKsOp6CmiYsIs0CgsWs9pXCqs7p3CZiAiZCliNiLs2ibiQpaCPpkC5pVsKCvsPpXiQCUzsiLpgiji2iPs1iPiUsVpZCuCQsOpxiTpOpMiIi3pBCtCYCNpZC9sds3CnisiligsYsVCTCjsLCGCmsvsEipiKsSp0CdC3CdsVsRC3iXzDpViRCjiVi4shCtsCsXiYi3ixsJCHizzJsDi8sIiLsrsVCSiRpPp9sRiCpLstClCqp3poiusqpyzJC2psCziGiBi5CfCPCVCqsnpCsjs8sOssp1pLpIpppbsIiGsesxpRpliWp7ptCBCHpMsspFs5iBp8Czpdptims8slCHphCHzsi1CVCPiLihCQCpCtpfs0CvsPp5CtzyiZptpUCYp4Cis1pQC3pQpCsEiDscsJiszJpzCQppipsviyiCirsWsCptC9CFCiiUs4CksipCpkCuCQsGiYCYiIiSszC4p0pcp1sApEi1iQs3sECasfijCQiriliLiOiisfpMpoiViFCMzpics3sjphsoC4izpmiliNs2i0Cop1CMsBshitsRiip6sui0itsQsfCIiWsliMpfCQiAsBsJsdCYiciJphC6sspbi3pbi3sVCdCgpHiziKpQCXiNCYi6iOpeCdpfCKCxskCOpvCOC1ispipjCUpAsFp2p5sCs0pBCiCgCXCJi2COilsgCRCusvscsRitCApPirpcCnCpCqiQi8Clias7CLsrClsSCpphsQixs8CmiwpiioCdzzpepqzpiopVpkilphCKipC0sxp8CtpIpgs3pPp2CFiiizitpICesipZplieCfi4iUp5iliip9iXiOCsiACIsZCLpSsdsgCRsBpjiipnsJsliXCJs9i4CwiPsgsCiiCUiopSiHizsaCIiyilpTirsVivsjpvp9iqpDskpoC9sdpRpJCZp4pEilpZivs9CJsApeikptzisCCEpDCEpdiCzspIszseiVsosdsss5ppsKpCpZiGpxsDsIiNzJC0pzsAi5s0COpustCeCGCys4s9iNskiACDiAzsCHsDCDCcsqiXihpzigs8iIi1C1CKi5s9snstp4pxpditiLswp6sws1imiVsppwigsYposTiAi2iCixpNCti8paC9ihCAslC8sNsNi0shpypNzyCgCRpFp3s2pMpJsui5ziiVshpmCBsuCpsEi4CqCvsxsnCUiLsDsUifsUsO",17186));
}
export const _AIChat = {
    get AI_ROOT() { return AI_ROOT; },
    get WORKSPACE_ROOT() { return WORKSPACE_ROOT; },
    ensureDir, safeSessionId, sessionDir, historyPath,
    loadHistory, saveHistory, listSessions, deleteSession, safeAttachmentName,
};
