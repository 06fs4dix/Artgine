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
    CAIChatRouter.prototype["onGetSessions"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CAIChatRouter.js","Cri5CeC3iUp4p6ims5CPCSzCiRp2CoCXsYiQsQpGsNCDCtijCQiLsxpWpIpKsCibippwCJi3CXshplpfpiCIC2igsXiTsHshirseihpmCxsbCKsvzCCbsXpCidsMCFpSiPCCCvsIsCijilpHiOimi1iyiipcsaCMprsyiQiLimsZClsLshCFzCzyifCQi6C5iwipp3sxCeCjiepcijiDsqpoi6psifsMsbs6CFi3iespsuiFscsYiipTp7CKp9iiibCoCdphimzJiDiQiAs5p4s1CdCUCQplpvCApGCHpmC3pDiFCrCopSCXpxpVilsTCip7sdspsKixiApFsQpRp2CAsqs7iSC6sJirpjibC5CRipCTCVs2imsisFpYpGioCrCezismsViVpoCPpziNifpXsxpfsiieC5CysNC9i6ijiSigpvzyCICcp4sTpNsICjCQiHpisNpLpWipsbsCp8pqsQsLp3p3syCRi6pqCzC6iHpgiEp3iGi0Cws6iKCRs5sdivpFCmiPiEicsACJiGpZiSsszpiWsJszCfiVCbinpXCsCoiuiWsXsMCKposaiEi7iuzisLp4C5CIzppTpHpApjCmpGiIiPsJsTsvCNseC1zypZphiVigzDpDizstiNCJpfpQCksvswpqCXsmCyCCiVpFzCCCiPivp5iAC6ixCHCBiApjsmCXp0iYsFpTpEidpJseiqiGs7CwC9CTsgiPiLiqsYioilCkisCPsUsEiXCXs2pEilslsnpaC9scpCpfieCEigzpsks1iliopwiFiqCupysxpgCLCmsbCYCcp2pzCepzi4CIp3sqiYCFpxijpRimpsijszzzplpfsJp7irszsFiIiFpDpBpNpKpWikiMsxpYseCbCZC9pLsrs9s1iPiniiCCs0sqiNpbCmiKCmsJpdp1iviHiCsvC3saCKiuzJCvpqimpdCxixpOCmi2s8Cupli3pzibCFiOp5CxsWCds9smpjsHsEiTidiaCdCRs2CliiC3ikCEiQsDzDCVC0s5igpIsWiEC8zJiRidposUCspssHp4ifiviFiOiApVCWCvi3CDCbsJsnCqCxsQszsciisbiEp1C3pxsTCICBCVifi7iZCliCp0s1iACcCvsFzip4i7ihsipAiwpGpXCiCEiRpii6pdprs8suCrsXCeC5p4iiCspzp9iHiVCys9sUidCmixC6Cwiwimp4pysgphCusDpysgsUipiqsJiQifpACyCIsmiqC8p4iLCKidsdC3zpigC4CgC3pdCSC6pGsisNiOCdsPC9pJsHCditsrs0shiWpPChCAi8sgiwiQs2pLCEs9iQpQCZpOsmsUsPzyiDCcphCEsxsyC1pysdsVCypHi8CXpQC1Chs4zyCXCspsiOC0sbCms5pcC2i8sFiepDsgCzp9pQi8isiXimpgihsWpViDp7CMCHiNpMppC0pFi1i5p9iAsipjsssbs5iiiPi0CSCSpIC1pzsuCupoC7svpqsVigpzpkpCi3iapICep1puCis0sGCPiUCGCACYiQp8pLsXsVsUCMiWpriDpJsjCpi9pAC8peChC8igiFCqCzifi2pbCcpBifCwCMpTiSssChzCpWiEzzpHp0iEpVsOsgCLsZsqC9pdpqC7pjimsZsfCOiCpbCHpSs9pqi0puCXsTpRiZsDiBCUilpOCICOpSpXCcCDp3pNCriGiNCCsDC7iECIids7pApOpaiDp2sXCFpRiIpFzssECIslixCeC9CGiipfsQpei5pYsgCZsasUCsi6CFsipTsYC7sKptCxiwCziMCcCcClzJzzpBs6Cxp7s5i7pOiMCxsSslpTCZiZspsfpECWiuiwsJCtsbpFiPiysxpnCDsniDsSCGpeiHpfsMszsZszp0pvitpbpWp2i8pXpJiFCZs2iliksSiXC2CpCKCws6i5ClptiQiBsyCACTCSp9sisdpXiPsnsJsZCKCSpviPpcsYpqCoCLpJsupEszpUpNpzCmihpgiliiCbsApviJphpVs8p1sMsFiipPi0CritixpwCnizpQs7ifpFs1pUpRpmpKici0pMCoiPCKCos0CKpmCgCgiepGzyiHixCZCYsziICdihp6issDijiMisiliviaiVpBpDsIpapys7CziTpECGCYi2sLios1CipvCfstsTpFsOiyC8ikCJiqCaCfpRszCYiuiyC6sHC0pYCApSsHp6p6p2Ctsns0zspNiTsViFp3pyCfCup9pgCaiBCfC2pDzisGpfpLizC0sDpRimsZCdCfszstpssJpaCRpUp0s7CfpLi4ijpJi9p4pOiFzDs2svpIiepJCbCqiqsai5ikiEsWszsrp8CspPpEsTsai9sRpvpbpUC0CYpICxCzCGsPiQC0ius3p0i3CXpBsnpOidCoCsCmiMsVCOpNCqs2CkiwsBCLsIi3iQijCcpBiKpUskp4soicp8pIiapGpRiupaifCxp1pesCsUpCpxCqCIsJpYsliLsxCNCaCmsuCNsQprijpLCVp0iLsep2pOClsqiNi0p4CSzzCoCwCbsfpOigsfi6pICTCspjsxCWsniLCfpEsYpBCPiRpti5CWpXsqi6pBsLi5iji0sksfpzpzsms6s7C7CusPCXsIiuCvsKiZscsvixiWCjCdCYpapEChiRCUp4sIiRCjiWCKCBCdiMs3pxpeCECXiWs7pWsYs0sUscC4iqCcsWCwCVpPCpCsCnsApCimpgiSCcpUstpfzDCyiFsWzspepDCEpRs7s4zCsesAiPsDsOiipmsDsDC7CpCxC6C4CmsBsus2Cpi3pKCczCsZsVsSCRCCiIiRsjpNppCoiApuplsOCQpoCDiHprstsRsfsoiqCLpeCEp6pIpypas9phiZpgCHC8siiUicCes0s3CtCRpupgCws8i2sbCLijpRi9CusNC1p0CziKpliesNs9pDCCpVssCYpYCjsxCxCgzJzJiQsLiaseCXsEimp1pfsosYCypiiwifswC5CzCqC2iipniPp2pEpCszi3iIpUCgCGsDpAsqsuCWpEiBC8sAsiCQs8iwCNChsMs5C7zJpMiHiJpnppCjsjpTsepvzDsfsRiop9CsspiKCGpjidCNCzCGssihC3i9CdiWi1CWC6ikpKiICpCUilzCi7ius6s4sbp2sMpOiNp9szs9iRCSi7pWiZihsysTsbiQpPpmsViisgzDs2p1CVsBi7sFslsVCSsIC2CupYCxsbiEpwiFCFC7ikC6iUiCsRCEimiPsUs9sNsGCXsviiCK",0));
    CAIChatRouter.prototype["onSession"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CAIChatRouter.js","CdsBpdsWC1sVpMibpXiozyixiAi5CmCEp1pNsnipp8p6iXzyiQCes7pXsQp3p2CqsIsxpLpOzDsbpVpspspOzsiZiKiAs3ispNp0sap0sqsssBieCVscC6ziprCpsyCBpHiQiapxiDirimpMsYiNCbsGCNp7sViBi7ivCgCcpmscCOi9sFCmpRCQC2pPsipTiYi5C6iliKpFs0pWCDski7pxi4i4sNsAs9pEp8itsTsHpVpTpQsus1pKsGizCms2p5iViEpMi7sWsAC9zzpjpKsrs5pNiSCpiFCOplsMiQiCzJiZpmpkzJslsyiksBzisdCAibpyCAikibCLs9iNsIpZp0iNpNpOzCimC1sOicsViiCbsFpmiiCys6zCswswifiiC0CCpAzJsEpXi6C0p1CzsGC9sJCJsnsWpUpCsvpopaieiCsNsBsPivpGivsMCvCspSsDpZsnCwCICgCQszikCysjzpibiFpNzDibCcCTsypkiviDCPCfpgsAipzysvsOCwsEC2CtiOs9iBsyCjpnifClCTsviIsws2CQpgi8ixsNskp0plCAiHCspxsACIp3CRiTiWsfpkiasPiYsfCjiwCAi2iSCMC6sYsBCUiZsHCVCOiUi4pbi3p9CmsrpBiICZpWiri4pDsniZiFpUsGseiziXClpFCMiup1CMsgCfsOC0C0sUpJiWCcsJpdCzCTp2CDizs0p8pnpZCZC1s9zsCVpBsDpnpxC3pepJp9szinpPpPisCSC8pupAC1pLChpRCritsap5siC9CFsLpOpGsCpXphpns8CksVpQC4iSpliiCeCnpWicp9p0p7scpOCzski7iSCjp7CnpqpjsliJsSiDippHCpCtpBCsixsoiwicCipqpLsasxsGCMCWslsGsipXC8iGpRiFpdsJC7iFiKpki0pwpNpICMiZsgsqC8sni0sLpTCZs1iQsYsfsQiMCmsVifi3CHCdseiSsBpnCACRsWpgi2zCCAp1Czpes4srsosbCmplpRCHpNiFsSpjsHs4p1pliDpOC6sYpOi1CBiLsppMpWpJsTsQsFpciAihiuCGCFs7iIiZpDzDpzicpxsLpcsdCgpmsmiWCMsts5pFC4C0CrsxiNCqs5swpnp6iqzDixzip0sOCDpIpPsHiuiVzDpSCIslCuprpEi2ivCZChCoiusMiQiNC8iYCQsKsppuiECFitC2pppGCEsMpoCRpmscpKCVChszsCpNCJzpC1ihC0sAsHsNpUpmCyp4CKiXp0sViXissFCgpXCApuiupUsEpmiKi4pDCECVCzsLp1pOspslphpWsri0iUCEstsGCAp7CHiaC3pcs8CiiViRi9CliQCksosYiHCECMC5iPiHpCCup6pXsMsIiriQsqpwi4iws1sKpAiKpVChCniTzCsKzssrC9pfilCTCWseCHzpzzpeiRsJpUsop1Ctp1Cts3CrsspIiHpaCrCip4CesoC8C6zpzpsuC2pRiZpApIiZi4iestpdp6ibpyCbigCiCqiLs8p8p7iGCVCSpis7sZCLCxp8iZiFsVpzCApjikCYpKi2iSiACapBzsCViiiWpdiSilsQpfsbpCifiJiqsFsCCDibivsYi4snpRCYpXpKCSsDCGihsQsLsECmppizixiIsezysriHsyiTs8iBpQC5iZCHCLiEpWpeCFiVpPC4suCtpSC0ilCxzCiephpcsJCbzCCBpnikCspUshshCeCCs3CiCDsJCysgzistieCMsVsEs1iRCHiXCUp8skixi4pICfiBzJCpp6iKpEC9CrzDCIpOpppNiNsjpksQCSCfplp6iRpMCms7idpiCfCWpYpap1CYsNi8iIs3i4idiasKsJi4sRiTiCpGiDCgiDzCpZslsyC1CLi9Cai1sYiGzJi3s1s3C7sZiiiHiJsvzCCwsRirsPsYCAs5ipsRC5phi9pFihzsCdC9iRsTCkiqpTpCp1pvCOsLpAi4p1ipsyCJsksHCNpXpDshziCqCQiqpKsTCOpHsmCWCFpWiZiCi0seiOpfCGpEphp2i9sps4CLpZpBsksWstslihiTsOiOiyCFpgs7sEpppmspCvijpnCsi2pjsNimp8pEpNi3CjprCtCVpKi0iMCGsVsOsIpMpYsiClsupcs0iBsWCICypzsBi6sksaCAszsOsKsZigiNiQs2zDp7iDpgsMzpsPsMphpfpdpzsii0ixpgsLzCCCpHCqCPCwixzii6sJiWpkpxi5puzspWCOpPpNiypCCTCusBpLsbCyCOsOsziSp5sxprsRiyCQskiXshpvpyptp4pRiiCApSiRiTprzDCtszpfpZpmCUiqphCLs5s4CTpqCSiYpjs8icC7iZpeiepdi9pxpvpFsgicpAiszCp5sVpZsFilCtpriTsbsqssi1sgs8izCeigs3CaCoi6CtsspesjiwpXCIphsGCezCpwpJs0pXikiTC7sjCnp5pxCgCai4pVibCfshCnC2zCicsFiOp2pfsVsXioCcs1prCFCgzysMpHp5iqs7CApTCvpkiuzps5iNsNpRiAs7sfpCCciuCXsVpvsuCeibzDCQCjsApiiCpJsCimiBiTiPiHzDpLirpYCqiXi9CKpvixCGpBCupJsgCeCbstsECXp3iICjCpiQCYsUppszsUpMCbC6pTppiVp0s5iWs9C1p9pjiJixpvCdpdpgzJsICtsji0pNi0pfClCXzzChsspOsLpHsApSpesDiss2iRsXshCtsep2sGiNCJiRpss9s7pwi1CAC8s8sBirCziZsysXirCLpqC9iAinpzpLsNp2CcsDsuCvsasVsHsvpZCtiXs4scs1plidizCNsViesICwslpSiwpFioicCYzJiXCKscsIpNisiSphiHpWs0sfsoizioiXsJp6sQifixiZzyi8pjiJsAiNCyibCwpKsmpmijiIitsdsQCyC1poCNiFs7pRp0ssiYsoCJiuzDsBC8iasgiIsnsVi4iyp9sJpACHiQsFs8sBskzDijCEi6pdpdsnCFiJiXpwsTi0pXi3p5ijpbs0C2zCpoCQi8iXsgsnCishCeC7iKCYpni5sZpciJpUCRC7sNprpiCozyCCplC0zJpCpHpZi4pis6iXsesUsGi1pWCcids6p1sCswCpiipzstieCppgiviBs9ikiOiuCDCrCOsqC9CepLi9sQiFC3pkCRpms8CBsjzysWsppnsRsaifsmsoCFiMiKsAiIsMpwsmshpECgpQp2iepzp2p8sYCLCXpjzspzilCTsDCWscssC8pKsCsFC5p8p6CvsHsxCzC8CgCSpIzJCZsCpBCDi2iVs5pbpksSpTsEzsiLzpiUs4s9C2CXpZCwsiCMsDsPiLimCBCdsTsYsVisiJsCCCC9CvC3ijiyC1iPCSsyzJCRpxCWCkCuCrCJsNsDCZiai2CWsdsLirCJCPipsJCcsCs4CHsBC3iUpNiJpDs9sQp4CSiQirsbposDs2peiTCpCRCLzysXCzCfscp2CBiBCaseC3C2CFp3CJptzCiFspiriZpbpUCFCZpLpqC9pJsliZiHi7plspskiRi3iCsmzJiICWzisRphCGpYCdCqCdCPCzzyiPigpys7poCuinsMiai8pFprCPp5iyswiwp6pWs9iMpACSiwsfCPikCasWCViKpUC1CrCNpuiVphCpsDiZs7ilpes3syC6pSCvCriyChsOpniXpysaizsGiLiGiEpGCmskpiCpsXC9iNCmsjCepmpoiKpPsRpXiPC2CbzJski7pfiBp9pcCoC3iIsWp0pKiECmi0C9sViVsHsEiasBsSiKsvpfskp1pFiFiDC7iGsws2pjp0zJCaphCiCPsCspiQCps8pIpLsipmpqstsBCWiqCszyCMCfifCNCLCXpuCvC9C2sUCvizCTiuiwshpGsACysrpPiJspi0pGixibiBs8peCWsjCCsvCEilp2CtCaiACEClp1zDi6pfpHiIC6sdpBpZpEiMC6CAs0pupnioCVCZzppSpKCssLpWsRinCMszs7s7sfp0sfiPCisdsCsopgCZCJiNpoC6Clp4CtisCpzspDpliKsMCBsrsDzCsSirpbsoCsizCBiJsipZCIzyp2C3sNpbiUsSCopypgCXplCAiCpep6pipQCkpTCxpHpniQCTsNC0iEiisdsICapgsgsECssAimimCHpRiaprC6pPieCUCoiBpkitpCpQsIpLCzpdpdsmCoshCHs6iMi9pdpQCfiCCipwirp8iAC4plCMsSiEp6iDiMiviDsXppC5zJsSpvCTCgpbsfzCCdsUp9p3suiAsUiypBiHpSiUiAp0CZi2CJiwC3iepxs2CqiviPCDpNirpMipiAi0pwsOCmiIpws6plCyi6i2pMpVp9iMsLzsipCkswpapYsRp4iDiRszp2zzCxsOski4CPi7pvCpifChiTsmCgs1ihs9ibpgCNCgsICZCXimpBsyphs7zCCYs7pvsNsWpJinpzC5zypkp3zJixCRsnCriJpJCYCKCHCAsisjispCs9s5pkpNsKCisEpkCfCapBpRCjiRiVpgC1CzpFs8s4sXiysIpACWpcsNsJiQpbsCszpjCICGi2iPiACfCGCei7pXpisJpspHpgpBp0suC8prsSC7s9pNC8svssCTiMCgi8pnCgphi8syp8C5ziiSzDsEissViGCTiAiDpZs4sRinzsiHp8i1s1iaiCiVC0sLCHCisUCysvzCsNinpgpCsysKifpRzypJiQsUC4prpEpfsjC1psCNpSsqsjsGCcpgsYipsbidiXplCciVitibspsRpjstpvsKizC4C0p2s3psikiPCXzpsjiZiKsLpIpxpOiWCop4Cts3CZpDsYp6Cki7pBC5iAiUigpZiFzDsEpZi2iissiOiMsosQpAsMiepNCPCqpYpVp0C8s9pnpcpesWp8syp6C9s1CMp9pTCMCOsxzCiFixiWiRC1CTC3sOCfCWpEidi7CLiKp7iYiSCvslCSCdpOpjiUpZspsFsGp4izpXsjC5iZi0i6sXCeixsapps6iep1CUiq",1646));
    CAIChatRouter.prototype["onSessionUpload"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CAIChatRouter.js","CCC5CZsliviFiusaCWpaifC3shiWivpbCQzCiMiVixi6iQCqCsstp4iupUshpUpjC6zysMCbC4zspNpCitC9pfCVCDsNCSiriECWi0pzsdCYsUzzicimpzs2CUiYpMsFC4pnzDCnipCniJCriECUpOCSivsgsWs6CiiQCQCsCuCWzCC5pRsvp2iOpqiKCgCQCTC0CZCKpqpHizs5spi2C8pNiXzspcp3CHCospCYi0CgCMikiKitCDiQCICxCTiti1sLCqChs9s4sOiriksUpisACCCGi2pFsusYi7pSCAi8CniPiFChp6CyCNphplsczpsds2CkpaCosDsMp1iPCssrCzp4sAsvp7iVpgpBCJCqstsIirsgCopoiuscirCMpoiRpPCus7sAp9CDi4C3sQicsTsssfCSzJpqCwihpFCKzip5CmCDiTC6iPCfCmiZCmC7C8CVCizCsgibp0skszsxp4C1iGp9COs7CIzJpuCKCEiiCupHihsAsCCrpeiPplpKCmCNCEpQizpwiwiLiDi6p4snsBCzsHiuC1ijsFC4pvzppgpopiizpiicCVzpspC4CICTibC1C2sfiKivCTsJCEpms3sZCGCeixi9pGp1iSiBi1pVibigiRCWp6pmp7sop9siiTsCpnCmpssyifsuiIpOC8CUCqCJCqpkp2sHp6pysaiUp9sRCTpGCAsMsWixptsYiAi3sYC3iRsBCgiCiksCsdCECzCiiLCYCYCHsjstspiopHirsoipCdiPiJCnziC3sJC7i1pbCIiOs5sMsBiUC7pTiiszs3ihpiC0sFsVCQCmzDpdicsFi6zypjs0iSiCiWCNCPiAiziVivsKCrCLC9CspbiLs8pBsjCUs8iziiCtsCiYscpYipCoC3sNC3CdpgzDpkzpiOigCapizspqCYCdCOp9iSCWsWpqp0CDpfsBC7iDissMsoizi7s1C5sPpuiwpFsCCup4iaivCYs4CBCYCOihsbs5sQs9iPsQCHpnsQChi0CFsPsai6p8ppiSp1sHpIC4ikieiuprpZi5iasvpyCqiMpSsqpviIpDiMiasJiFpWiipjpBzpCHpGpys0s6iepXCyp6iwiasxCwCOpfszp7iWCJCYzDCapkpvCrplCss0i2sUijzypLi2i3p1CNswsOCZsOCdi1iMpppopqpXpmsaiUidsgzspHzyptsWCsszCMpUpjCHpRsiswiOzJpnpSiKp8ijCZiiCNChpxCts1sqpDCpClilsni1CPiZphCWCszssNimpRsxsHsWidiWptiOCUpSiPC5zsCWsXCmsJCwCBpwC8iWiSzDpWiUsPpWsBCTiDs3zzp8iOpSpUilpNsCpssjitCnCVCGp8sosysbp8pss8poiwCGpjp6zCiVidi8CzicC9C9zpCECMi1iQsui2i4pfsvCWC0sAi7pzswsgCsiLp3iYiypmpZiOpdiCC7CNpqpUzziHsaCSiTsVCisAsfiaiOpcpcihCjpsiziYsLCqCdphiYsdiHsDpPp6iaiMsxipiXpTpXCGsLCGsnsJi4p9CGi3i1iZicCWsKiBi4iBsGigpTpoiNsbC3icCaCOpqitiEsyCkiTiTs6pcCzsZpSi1zCiIpmsjpNidpWCNCEsSplzDpmpgziCrsAiypQpbCgCHsopriaiDsGihi0CHiSsRCniyphCMsHiiiYiIsgpWidpAsdCAi1sBCVCdpQC0piiVpAijCoCczpiziDCriiiBsziSsNszstp2icsGpjiaCUptiaC9sApypPzsCWCzpHpqiKCZCdzisECOshiJi4iGiLpdpJsbCipji3pYijCisHpPCppAsXpmC4pmihifiqimpnphiaswiUiwi4CQifpICAsvi0sipipjpMCLiZpQCKCYCFispBpGi8sJCDCcCWiLCXsGCJCtCHpWsdpzscCvijCgs1i5iLpcCipQpzpVzJCwigiAi8s1C8CPpwiYs5iVCPi6p0iCsTiApfsszDpAsdCLCCiqpgsgpHigpBsKs8zpsip1iXsyi4ixiGpepgphs4sKies9pWCBp3CVs3pui5pPsvpNs2zJifirCDpFzys5pYCezJixpopwCGipivizpbCwp5zDprCHCki3sjCCphiHCWsKpwiCC1s0stsdp9peppCBpdCdiGCdsXCepPsiCvinsxifiGiepZCMpWpXi5CXicpLi9zzppiosMpjCkCCsYCzpxsxpRCFiQsisKCOp9sysFiKp3p6CizyiApnCAiCpwsbicizi9CUiSiTsOzppRCvCOCyiWsFC4CizDi7iJCvp9pkiTiWCvsbpNsGCniSieCbiQi9pepJiWiIsozJiRCfCnptiSpwCCCrpvs4ikisposoi4posupvi6smC3CpsWCTCLiczsCRsRpViDigC5sesNpOiricCtpisliVCopBzzC2CvsDpAsfpDsSpXCfszipp7pMpzsopsCQihipp8pSpbzJsji2C5p9C3pjiqsds9CZiUi1pSzDs9pFppifsVijCnCeprpCCXs7CLiNiFpqi2swpkszscCeiriasWifpgpysKiqCqsoiACWsQpspsC5iJCBpiziCvsTCwCKC4pWCgiVCys7p4iGCXpNiOpuCECACksWCjsUs0syiEsJpGpPCIiXpBCVCezpCppxs8iSC3pxCNiGp7pACWsNisiMpaCOi8pCihseCCsUiiippYC1zJCeshsPiLiesLiipCiNiAitptsvs7p4CaCOClCoCosBiIiEphCUs7sXClikCOCqsFsgsSplitips2sopUsHpEsUiOsqsppRC6pkC0p5iSioswCZiiivsTiWpACKp2iSsasRiwsOzspqiQiXpNsEiozDsdiPpUCesLsApECBs4ihzJirs0sAirsJpkCZiYCCsEpOsJCkijsgCaiUCJihiCCGiRsZsvpasYCxs7pOsdp2pHpai2CrCpsyCCpKCFiipdCBsfpFsxixsLCcsesNsRpBCgiFp5zCzziJC7CKpUiQiBi5pWpTiYiDCnsSpKpvC0sDirCFsSixpTsPCdCGC7iSshsEpBpcCPihiTCCCLCWpfpoChCMCeC7ixsJsxsjC5zzptziicsvs4shsZpIzysSCfpzpQipCwiOiDslp8iQs6zJpEsWigCwCjsWCeCHpQsKswsqpOpmpQsKpqsviAC4p5s5CjsmpDiNi1sqpnsxs4pxsbizCwsEiTpqijiKC2iBiEpkiGswp3sCioC2sMszpbi1CcC8sFpRi1p6CgpVivifpPsGi2sBC4sDi0sNpOsCsVsxiICmstCHsHiwsji7p0shitCdi8CvsaCwptiWsEpgC7smimpBpzicsQsWCKCTCLCZsAstsDCvCCiHiEpcCDiDs8CYprC9poCvsjpwsniQCMCApTClskpCC0CvC4iJp7CvsGsdsYp7sVpKCYs8zyiJiXivCQiBi0CLs2peszsdsOsDzpsvsRiDCTs5sCpyicCtiFzzsrsppkiGsPpoi8ieiRCOCfscCusgiMs6CQCKijCZsos1sDpGsziXiIpGs7i0iAsMssCEChimCTsxCyCBszs0CfsppMiXsZCSsRiQs4CGC4ifiNsjCCiDsDpXiWp4sDCgs6slCdsdstsTiZCMidCyC7pmzCptswiVsgCTpCszigsMpRphiLCJzJpeiIsQCxpFiBpiiZpupup9s2pNCXCCiIsViti4CbsDsMC0srihpGiWi2sVi8iJiMsTsBCQCEpOiEiaszCmsNCMiICJCDsbi7p9CBiDsXpoioCcisimiuCQCAiQprpms2iTzpp1CbiqzCiAiyCEsrsNC2pYCxsBpmigimiMsysMsZpQCNsBiQihC8sbCCstC5CZsOCyijpoiwCDpwpJsRsmpMC9CYCYpozCpkieiaiDpZi7CWpizpCnp1i2ippVCxitshiyCzscpnsgiSCtCBsZCLzipnCxCRi1pQi6iFsXCiixCmpQiRsvCtiaC2CtCFCQiLpoCnp1iJiPCtpvsxskzypUsOpQiHs8CzpqifCgioswpisIi1iYi4s7srigC4CLsizsCqCYi6iXiAiTCJsIpIiRilsPsfpRCUiZiSs1sLimi5iDpnpQpLCki2Cbp6sPpPspi0zCiMsdCwpVCmCps7sui2sOCTiZsSpSsGsVptiBsYpKiDi3ppp4sNCBC1slpVCPphpip6sDiYsepAsaCYpSpOiFC0pWinpgsni7pPzzC9iqiZCUsXpCiPC4poC4iviUpZiUsBs1s4CuihCDC6CuCppwpriysMsSpfiICbC9CQpQpkp5CnpqiTsxsyissfC2CYCxCpsspzzyCisuCYCap6piszCkCrpVirzCshiAsZsQpEzzpfCepMpdiuCiChiCp9pIihC8sNpYspCYsbzCpAzzsiiJCEC9pICPsEimpfC9sxixs2pGpci9iki3pSpjC3CViOiwpcsvsni3zCpOC2i9iQsyp4CYiyiRCtpIsHpqCsCZpipVCSsYpyi8C0i7sup6iNzssSs4iRsjC7smiUCxpqp2p2C9iECACVpminpdpAiepxiuiHpii4spiji9pgzpp5ijsdC8C4sfpKsZCfCVsBiwici1iDsci9CusbpsiTpNstsWiHi7ixCxiGzipkChsFizpnsyCriHiosuC5ilCKiDCwsAiECxiGsmCdzpCWCsCbiQsNCLiVsaCWs8C4siixCRCjiczpsJsWCIpvChpaCRpGC4ssiSitCmCApistCwpiseCBiApmC6s5smCVsMCNsCzpiFC2CACmCXs0iOs2ssphzJpXpLCAsvCdsCsWplsLCyp8CZCJscpSiZpDsOsKpfp1zDiJpfpOCcpaCHiRibCuiFsDCXpmCLswCWpTigCSiRsQCapcCCpvsZCvpiCwpYiipsiPsTibifiAifsDsgscp2iBi0CvirzippsepqiaspsTCdiYi4pUCfpXs5sKi2iJirpwCgCbsIiUipC8iGCypbsHprpOCBiDCUiKCGiKpNiIsis6CcCeCvCkCxswsriPp7iViAs4ioigiUphC7sgC0shiIC2s8sAsosMp6ClCJCsCfpgzCpps9sziWCoswi3sIsJpZscpkiTpkCEptpksEsViGpQsri2CCCysPiXprCBiXsAiLpWC6ssi9C0puCqihiazyphCLsys9pVpeC9C9svzpsNCzi4zDsypzsypkCLiAsFswzypupbp4C3sDiMiUC4pFsbiWp0iysUiviwpQpipkp8pqsds8iLCjsiitiwi5iNCqsFimpapGCzCiiMpLs2p4icsvshCcCMCnpfzzp4CDiUpbs0C1CnsUsgC4Cnprp1iisVpNigp2zDCzCyiyp1suplinivsis6CGzpiLsHs8iGipzssaCQs9Cxs4pnpaitsiCXpqpCpysuiEppp5zisFpRCFi3CRiGiyCIsczyi5iwCZpcs7iZskpysfiPiJpoCMsPijinpfpVs9CisoCEi3swiNsVpspFiCskihpGsWzypDippssKpMpOi9CLi9CoC6CYshs4sHsAC1zDsksyiGsCsssZsIi8puizsbCXCyC7CVpzpPsssRCMCuiBseiBsBpDCGiRCLsqios1iyimCGiksNi6sLCZCJCciBsYpbCupyCFpUsniNzpCtp2sBCGiRpos3sppUpRs8iDpfs7sQs2slptpBptCnskiszCCqzsimpsCVCUCbCRCcsRCSpFiPC3sRp0iSsXCVpEphsupNCNCcsWpZzppys8p1iPpdCFCSpviAiaCKpmiDiWC4sSiYiQpNicsACNpditiTsLCXCCiJiaCkp9sbCDppCYCNCMs9iWp0i2ijsVCgsepqpPsrsBzCiEsmpzCdsfsmsYi4zDpWC9pGsDiOsBiMi7sTiNiFC8Cri7CXsdspCriJpPsFsFpuiQC2itsGzsidpSiasQsSC7ClipzDpDskplCJiKpdpwiIicizphs5CZiCpRCusmiLC8pIpGzDsXpNC6sFswsgpjpVpDCmpZpLstsAinppsZC4pnChpRzJiuiKCKsqC7pDi6CziusCiwsJp1iHCxpRsrsNiqsWCHsIpmpjpliECjiBixzipKidCXpPp6sFi8pUpXCLi0iXCXigzCsqCEC9i4ziiGpiscpXCHsZCiCysjpcCHCeimpNCnpHiviWC4pDscsIpIpvp5iAigsJCvzCpuCophsRiVCmpqshCiiWiLsEsZs8sRpusCCrpmpkiVi1itC7sWsJp6srC4pCsMiri8idCOpdsAsVsaiZiesLCCiUzJp8pWs9igi7sjzzsEzzCUsMCmsaplsXscCFCUs5sMsRpkpwClCGsJiBpGsqiJpMi3ikiAsgC3sXpfCpsHppCupWCNi5pEslpKpYiwpvCNi0zpslifClsmCkCAioC0CKswCsppCgCfpap6iKCRsDsoCBi7zzpuCmCIC6C4C1pYpEsli1pAsjpNCJzpiRsqpPCMCPsTsECuCiCPClCgirsoiasxpnsfCasEiJiACds3C2CZi4CzslsaiwiWikCAzppAsnCWCuCfCMCxpXpps6Chi2iQi8iWsasxCFslsYplsTiyspsLCGsFsTsgp9sasCsQC0pzCLilpnpgsTiepopGpypkirirC9zszJpEi9CQC5CdiniEsGCDiBsGCLs3ptspp8itCYiwiGiWCzp3sPCkpGikCOixsWCSC3CICKirC4CApDpczzzDCqsri3CmiTpmiasKsDs5pri3swpWiCCZCxpnCFiNpksiCRsfibsisopQsDiss6i5iwpisUppiQsWCbpzpvsJpsCGCJCbp3CgpxCmpWsVicpUpfpECLiKCBCgiEsBCVp8iYsOpuzyiypuiFsipEC6iFs2ifsGs1prsppDC2ibp7CasGCSiOCWiri3pRiHisCPzsseifiNsHC3phiPp3iCpYiyiHshpapkpVCishpOsgCXC4sip9CIpUsjCYiBp9pYpUiHCACysnpapRs4C0s5pxzipGzysWi9ixC8pZsqp8s7iiCasBpwsNsSzyCWi1poCjC2p9CKiFsViQpQzJsds4C9zszDiMCfsFC1CosVsUiHposFpxC1pLsNC4CiCwC7icCWC8pai8CDp4C8ibzspGsiiQpupNinsQiFiRs1CXzipOCQsgCUi9i6CxicseslCqpipes5CtiFChptCJs3CtifiVsRiViDiDCXsspMCwpVpasCs8Cfp3pjirstCKpKCYCMiQCdpwpQpoCKCfpGp6sJswibiYCxpBp1sFstsFpEpNs7iKiQpUiVpsCJCCCAiiibsVsGpaC4iMi1COzpiKspCyCXCli4pCCmCjslsUsVCmCEC1pwi5iUCmiDijiCpiCysxiEpnCks5sfClsVCTCSpMsBpFpwpHzJisCuCeiOsipvCDp8zDi7p8pczDivCqpVsTC8Cep7pJ",4185));
    CAIChatRouter.prototype["onWorkspace"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CAIChatRouter.js","zyimzCiqiLsCpkCdCAsVigpaslCKinpgspsfsgioiNpDC1puiqsYsnzJsRi4ibpDsoici1Cxs5CliGsniAsrs6ixp5s9CTpMijCepKp4sdChC7C7pJpZC0i5CcilC0skiEiniPziiMCkCnsDi3ifC8sZzDiesciQsbC4iYi5CgCOijzzsWCosxi0sHCkpdpbCqiasCiUs1pAiDC6skCRizswC2ikixiOCrC6pdsyp1p7ixC2iTpDpizzCcCMC7p4sqiip4sjp9itsuzspUixsAphsqCtp9iBskscioi4CzCMCjiDsQpBiGpeixpHCUsAC1CtCyCdidCzi6sBpDiVCysxs3i9s3pii0CVpQpCCFiqp8CcpWptpRibCnixp3psikpCicCECPiQC1pQi6p4CJiwiOpnC6COzii6stsmphsCsnipsliOp4sJswi7CMpriPissysOpUipp8p6pEpgsfi5pNi3pGiZp4zCsZpYsviZpLsfiIs4pnpIsPicCAioC2ieCaCnspi3zpp9C0s2snpOziCmiIsNpwC7sYsisgpnsxsZssscpAzppWC4shCzssi2izCHsBzpidpXpJpSCSpJsup0popoC6sOC4p0imscCcC5i1C2sfiKsMpxi5sXsYpPzDCZs4postpHszpKsEpoiOCpsupHiJitios4ppiqiUsbCnCCsHCwp5pmiEpssiiNiwpRpJisCvpXsuiRC8pQpLsUiiiNiSp4ssieCjpuCApnpPp6pRigCDpvCbCuCtzssypwCxCGCnCAp5stpxiKCCC1sBCwpYCJCIsZpWi5s9pLi1CyC5Cms0iHsbp1i2i3CwsAstCfzDsazCiqinswiUCHCksQpuipC3sgs5iWibzDsasCCYCCCKsQCcsxiCi6pysgCyCxsgsZiSiNsZixCvizC6sCpAC9i6s0sOpIsVsEiwi8iZpSpICsCSpFCSzCCjCqCnsrsciKiqinslsQpviMCepOs9pDixCuC8CdiwCApDipC4sqCsCnimpRCkpvsRisCXiNC9pHifsmsYzDiOp3iOiECjseivsSpgpFzDsDiAprp6Chp3iEiHs6sgsisGCji7pFiUi1sApss7zzsOCpi0s7sisVi6zyzisUpaCQC5pysPpVp3pjCIidsSiusLsACfpapoCGpMsIpKiMi4iPpfpzixCDiPsls5pfixpVsniOCopNsrCXp0sHphCTC7iIiYCUsjCKCtihCvCQitpRsqzzi3pYsGiZpzppszsiiECLp1pGpuC4CUpyiyCYsIscCuinpeiLpWiDsYifCxpdsVsaiEiFCEpHpEzpp8iSpgs2ixziClpJpkCUCopSCLCPskCksPCvsosPsrsuiriyCHpWiap2pAs4C4piiHCDCViVszs8p3sOpJs7CoC8C7susHCAzzpCsKpssLinpipcsmC5CrpACkpdCliWs1pxpdsdifsLCJiWs4pHpqsaiRseiZCLsoslsOpeCJiRixp4pJsjikpSCUsMCas7suCKCcpEp1sXprpmsfs6COCwp5pozJsLpeipiwsdiApos4CoippbsMpRiTsjp2CZiBsEslseCxCRCrCHsqpnitsRp6iWibCZCpi5igiXCQiBCNsniwsfiSCXiRiapLi0CzCbCjpEigsuswsAiDiVp4CRszprpjsLCNsdpNzziBsviAsUCFikpmphiqs5zpsSpcsGi4ppiIpnsEsjCyCPsQsECTi4C8sTpsCGsvCJCtsKsxsSC0CDCMidpIsNp8sdCWiDiAiICri6pCioCTpli3CDCxiwiDpFiDssCWiHC7pBibpKsRsPpciDsrpRiki7sRp6C7idpXpmsziHiSs5spC4iVisCgpZCYpcpaiFsxshiVpFsICZpqiXpPC3pds5Chi5iGC8sTCPibCfCTsEpysiiXpni2zsiiiRphzyClifiIi7iSCLs8swCjpAC6siiCs9pgiTi0swsTsBiIppiVpFiaiCippYpEpSiDslpViIC0sBsypzsmp6p2pzpKsnCOsgiKp6p3iRCmzzsOiviji4CcikigCfClC6pJsniWiepwsMppCqshiPsusOieixC9CUpRCgCXiMiVpTCFCRC1zDpbsPsbC4C4pqCHimCriwiSCWsuiCi1insqppiHC2sEsSsTCIpkpmsDCVp8CDiUijipCFiSs6CIswC3poCcC2sLCRpxpWC0s6sQimpFCQiqp5CvCTCniYptsFphsvswCEphChCOiksdpdiQCWizCYiYsmsssTiQCOCKzzsEsTibsDi7p7sipWs8sRpTsdi8p7zsCes4iNzpsriFCypupRpmCPC5p7zisvphsVsms2ijibi3CRp1iMsGCnpfilsfsdsyCYp8CqivpfsmCbsZpQs7pIicC3zpp5sCimsrpdigiusJzJsFsHi3i9srpRCDsKpxzJswpuCFpSprsNsMpspKinpsCXsdCmsupZs9iWp1CJsdpczJszpVsOpMpdiysFsrsxpNptsFpbs3zDiiiKsap2CfCpCVpsp0pICNCQsFshpVpbiaC2iKsECjscsIiRi0sJioiZsDp7p8CesWpapzCni2ppiCp8p3saCosxifpwp7zDi4ilCgCisHikp7CBsxiis8iFCFpQiFs0pDpEi6ilptpfiMCppcp3pQCepop0CUC2sys7sUp0iysSCpsKpnsaCwsCsopdpMicshpniEposUCmCEiJzyCzCzpEiSs1sLCqp4iOsFCcsSifp9CXsJpLi4COCxCVpwpRpKspsnCuCvpQCLs7CVi2ioC9sJp8C2ivpkCJp2iRsPC1sns4pnpOCoifzsC5CIsLigsJCSCBpfsMCui7sKiICoiAC3itsupai7C6seCQCri0icsCstClsHiFiLixirp9scp4sjCviXC9COCpiJsusZCFi0Cos1Cbsesvs8s2CoCHChzysMinzJirpLCWplCnixi3pLCEixpUiYpji8spp4pSplzyp2zJp2ieiTifiXizpaCYziCMziiIzsiUitzDCVpZiPCaiKpCiJizCQieCzCZsHzpzyCNiNC0pwpICZsKC7CXsCi1sbsvCmCysrpZigCTp9pVC8CwCcpoziiHsmiBpoCCpmp6izpGpgCHsGsLshCJsXCipssui5C0phs2pLCesXCps1smppi8plCtppsSiaiOpGsjsZCjsupasFClpzC6CppDiYpYpcstiQsepoC1sSi8i3CWp7CoCmsGshiuCUiFiCCHitsNpHiopxCgpVpdCypvpMsjp0sziEpYszs0iFpSpXsksVisiWCoCLspp5spi3CSzpCvpiCmCBiApCCii3pusHCppmiCpcpYCvpRCbCcCJsQpxzps2i2pSizi0iXCmsIi6p8iJpiikC6CJiBsOs4CACIpNCzplC9s2CQsEClpas4s9s2svpZzyipp9pFiriApTC8C6ivpLCOpZsaiNpCzppvChikCZiQC6CjCLpGiICQs0i6CYikphsmppiGpEp7iTiLsAiSsaiXsMsmi9CECZCLpOCisOCVscihpeidpUskC4ijpZiliXCkzCinCmswzzCKipCmpFpQiasbi8CHiupIpvplC7iWiIpnCtCzsuivpGiWixCWi7isp1iNsTsBi5i0ifpkpzimzJi6C1iusasbscphC6CWCECoiPslpks2sYCbsIpfiGiqswitsqicp6pEsaCNsAs2sDpKiviZimCjsMsOsGsgp8phspiksWs2iVpvpSiRCdC3CCC9pUCpsmCzplCQpFCgCaiZsMsKpGCFsmihiiici1CdCjCcCvCHsesWsHpVCpsPzyC5iuCXs5iCCaCQp7p3s8sbi3i4idCupHiKp5iZsXsQpLsZpyzziXieCxCuskiaCSpXC0CHpFsGimixpIiUsGijsVCepZpBiIp7C7soikp3Cvp9pEp9i8iLskpwiICGprixiVpLiSsxChphC9i1pjiWCqiJC8iXptCKsmiQpnsyicpiCiCGiPi3s1saseCrC1sapxCTpVsTiIimsuzssAsWC8paiSplCcsZiJi2CMC3sGpfsAp8CGpssKCpsPiqsCpFsupfsLi7ChsdzCC6C3CapbCmsdinzzsDijshCksyC3ihsrC3irigp4i0sVsupPCZCjiypdsQpSsACDCIiuiZCQiUCkpVpMpyzsiWp8zspOpdphsii9pMC8CKCCsksTpJsICHpsiqCIi8sKs8pQpJi7p9CNCzihsIpmCLp2sQsTpwpDispzscs2i6s0pxC0C0sMC9impjiSids4sNCcpWpUsVs6pqCIsUibioCXiGi4C1pbpDCDsXsDCwCXswsjpgiyCbpFCZCIshitpwCLCFpYpeC4sYCRibpfCcCXpEpEpNs0C9s7iiiMpysOsGijCkibCjp3sJiiseitCEsZiCpRpGs0ibsuiAsZs0sGsni0sligsnpGCRpLsSpnshi2ihs0stikipsJsfsozypsCBCzs6izibivslpYCmpvidpdCmzziapeiNsJiOpMioiHCdp6pbipsfCupBCJCSpyCKslstspCPiQsBsrCbsypCpTiICvixiKiGCnsZitsQpyiwiUsWsqiaiDsypUsIpVphzCsDCUstsWpoiUpYiZiTCApJiiiuzJisiyiwpXppzsiiiXCEiICeCSixzDiQpwiNifCmCdCPiRCXCpCTCOC3iSpkCtsmCniMsSiFsvpFpvp4p8iApYsSCQsSs4CzpaiViTpQCcpwifiyiUCKC9ifs3i4iopAsJC8C1pdpAiWiuigCaifpCs0sUsrpACUsEi8CTCUpqCXpLpNiQsDsEpdpEpFC5CIzCpOiPsZpmsMpYsWispEppsZpfzCCypYiqCMCMCwiXiOCOsBCVCSseiqCXCviCiDiFp9CxCOzyiHpuCtpQiaC2s2pQp0s1pjC2i3i5sjCos4pAiZinpUC3pdsLCXi1ioilsgsGCSiKius0swi5CipLC7pbiTi6pdpCCki5i5iFsjiFCdCPp4i8pTsqzyCnCPCKi1iyiyiCihpkCeCcstCysrpbC8iIpwicC3iHswiepLCQzJiapaCdzJispipHpVizidzzi8sUstsOCSp0pCCKpiiSimslsIsSs0sNsopjzCpzC0zssRiSC4skCMp3Cpi4sCsSiWi6sZpnsri0ias4irCtiviopNC8iwsHskpuimCCiosipGpzCBCmCqi6ChpnCqzpszsypXi3zyzJswskiopqsjscC7pUiWCqipifCwi7CsisCciwCKpFp7pUptswiRihpcpUCDC0sZp8sVCzC2iZsGpRpciJCKC9sKsOiIpFiKCGC2CUpxCOsfp3s0pviJimiXsKCrsgCcpgCTChiqi6snsWCBs6CAs4iDiOpAiaCcsBCbiqpXizpqCTpxpXsWCnCtsxs9pLieC3s7i6ifiRpQicpRpBCBiisrpBCrpRC2pYiNpCsosNp7sms7CnpnCBi4i1pgsHpyCOsCigpDs2CBsspZpOiGiYC4zyiQzszzpTCjC7p2irsPidpgpRpAp7s1pysDCXsfCuCFspiniOiMpyppCtpSsDi1sBi9CYi9CksGstirsDsFCbpNpVsEi5C2sxCmChpypGiEzspXiKiqiVCBijCosRsPC0zpiiCMsopys3s3sdC5CSpqCUsXCQiMiOpdCJsKpSCjzisbsGC7iTiKscitispassiUp6pBia",7910));
    CAIChatRouter.prototype["onChat"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CAIChatRouter.js","CfivsMpkphCRswCYsJiWCDsFCICVsFsliAshiwi1pjs2s7CFsECWCIiCpUCfp1CupSC3zpiqpRpeiZspihCwiHsRiKCdCfskiniLp2plpZCsixs8i5CmpfsWpWiOiipPsZCbiqiDCIp2iZsmCCCwCiCnsLCSpKCCios5i4iFpLsIp4CQsss8CgicpZpqpnCgpPC6pQp7p4iJCJiiCoCeCECdpoi4i3pNiYzCCKiTsDCgCDiOCBsUCUpgpDigpXpoCCiBiNspCEC5prprCLpqiVCViEiriSipClpIzyCAsOiDstCqsHpqsApRCICki1iLp6igCuCmCkC9sQC8Ckpmi0sEC5i1CWiMikCPp4smsvpjs1p3swpFpGp0iCCgCzsOpjCACUsOs8sNssiTpuiSCepXpViQiJiEs7sRCjpisOids1iVpus3i6iqC3pICiCDpjC0CXC1CeiBCpsNsqs1sLs2sXsMC8s8ixCTCOCmifCGCazDClpIszpbC4i7sqsLiss3CICgpZCmsGpGi2CNinpIsMCCsLp6sWshpMCMsCsYCJCBpbCzCusms9sYCUCepFsLCeCZspsMp9pNC1iXpRsqpVpKp2ivsxCyCmCasVs5iepICGpxiIpMpWzCChCtiPspiNiwsApWpapCCICYCPziCgCvsCigpHCGCfpipPsoC8p1iFC8pYCfCUsapRiDzyCciVi8CmsZsXs6C9iciipApRprsmsEibp7p6CCCusGCpsEplpWCnpbCfClpfCrs3szCwzDC3pcs3i7sUp0spsKCGi0CYsGiWiVpFpvsYCPsaiCpdCkCkCfins5sipHpLpAs8pHp2ieC1zzsZpSs7zyiJissjivpHp3s8pEsViks1p3izpmsuiOsXsRssCxC7iqpOCzCMscpQpUCXivC7CSsUCxsnsvzssRi4swiTsvi3swscCLpRCFiUsppmsfC7ixpYpvpSCDpHCksfCVilpUCppJsrpWppiSpapgCrpJpoCwiCpIprpksyCJCTCWi2slsei5pRsLCrpbiapIpOC2sQibC8COzzzCpciZsipspGCHsmCAsbpoCsC8p7zJsSsypMpJsZp8sJitCIipzsCRzDCkipstCSsipCC7CYpECdsfCDCzs7iHihigpZpCpzCfsMpbCUCdCiCUstpeixCpi5Cyi9pazCs1sCpzC0s2iSiCsJi2ims2pkpgioCOCLs2iepECnpTzCsppGCMi5CYsxsoCfiUsLscivimpgzzsviysKp0pUiTiqCEpACypVpRsps3syCaCvs6CJsTiEpWstsrpMsxiJzyiQpNCUi4sqiWpkCJsHzyizCAsrCApDCKzDsViKshsnidstCfpdsMs8iWCqCFCbiKCbiUzDi5inCVspsBiCCNCispiXpvp5pUpus9Crp6iPCApQiSzDCtCWsKpDsSpqsii8iIipCoiiiQpksdsFsECqpwsKiCsUpViGpUi7CBpSiTC4zsCwsYC3C8p3sRCDiOsUiQi0iWiTCTCbiUp1iTCUCtsniaiBiopPizpJCBsSitpKCDsSsxpwiEsIidsupuiWCBsQsjixiEsUpXptpczzsMsBpgpzpJpvssiICuipsVCEikCkzzsDpPihiIsVCniFpnp6CTs1sIi1s6p2iWppi5sciRChiTCMCRCtiCsXsJsYCipApuCyifCmCACssGzyCgCCpdCVsOCCinsbpOsPsoCQitziiapWCQsgCKi6CjC4ifpmC7pPsBpniHp9sApVihpfziCQiyiLzipTpGsliMimCWCyppCLC9CfCni4zCsQpEsxi7sHpCi4iVpCi2p5idpwsyCvCYigsJsPCRpApLCmirCWsTs8pKpVCnp0CaiUi4pkioCCiRpDCfpOzDCUCGicsSplpmpRCxsis9peCDpUposApBiMssCGipiNC8CfCMiHsli2CNs7CjshziiBsDpCsss4pfpspSCHCFpisSs4C6pzpXzzstpGCUpgposDiEiYssiWiiCAiSCwp4pfCUpeiUziCSiSpli8s8sjpGCKpJiupkziCWiLCcirC2ihsyCciSCPpkiTsJC1iusUi0s9pBpTCSCkiPp9sBibzzsMpIziibCgsds0Cys0CDiaCpCYiIpZCNieiUsMiyC1iTpQpesUCiiQplsbplC9pwpAiCsHpVCppWC2C2pSiap6CjpFsQpesUCKpwpTs3pDs0iBsWsTCbsIpVC4sviWiTs4iPiqisCysHivsrsdpICzsXsFpgiGC6sIp2iosDsHCviditpOpwCdsliWpPpKCPsQsjCdpSpBszsNsAikChCQijpKCmCIpRsdihpdswiXixiciFpjpNpzskprsDCzs2pKsBC8Cjs1sPCeslCaiPpSCGs2iHihC1CepQsCC7ibiTpaioC5pesBiAi5CEiOCFpEp0sTslptC4ipCjpui4plitCbs9CDiFiJsvCasLiTCXCPsGzspQpPpasfiUi5ixpaijicikpIpGsXCKswC9zzsdiFsgpvzDs6s4iIsIsFsMpLCksMzyphsmCpCvsMiEp8plsDsoCUCECwsXpcp5CDsQsCstiwsoiuClCai3C1sDpwioi5ibp6p0ifsXpXCQs4CPCfpxsbCfslCfiEpYC5icCMCvzpsDCFiipZinpOC7iJzyzpsPCribpnssilCXs0sxp3sMpaChs7s9iQp0CZCTs8pxihpwsgp1sXptsCikziCciFs0i2igsVpVsOpsplsSsPiUCACFiBstpVzCp7CBsJpnpwigpbs4COiqsJsKpwitiCsysssMsUCHiZibp6sICJiOiepzpNCei3ids4iuCgpEsXstscCsivp0pxids2pGsnpKChseiTijpWpopYsXi5C9p6CsitsTsGiNpUi5zJCui7Cus0zypQs1C2CqsJiasmpKsOC2itpbisC5CCsfCOClpgCssJpLihCDzypHCcCmi8CzCIsLC1pkirpusACyC1ssCzsNswsozCpJsLsvpaCvCCCrpdswsci4ioCpsrs0pwp5ifzJiLiDsEzisIpwCFpYiGstiksFpUiap8C5spsGpYsCsHChsmzJzyspivCcsUiMs3CaCosSsKptipC2CuigCAi6sPi0iCCMCViLp4insopCiSsbCysospsXi5sCpviBiViciKppC7sssLsuCVCsCdpmsdiliSp0sYpqpLp9p0CgC1sqCRC5sppezppisVCbsvprpDiLpUsIplikptsCCRiep6CMiTplCRpSs0syijpCiqCKCJprsRp8iVpLCeiys2sZi2CNsnzCsGCGpMpkCapEpEscp1pyszsCpnsHsgs8ikp6CMCYp4zDCXCds4s2izpIiGsSCRimp5ChCRsJp3snpOswCuiuC3i7pis1sXiipAC5CWpHp3C2ihCgC8iLpYp2COp8spCDiRCMCBsOpiCYCOiusiixpCCoiQCjiBsYCpp7sNpEsUikiYCPCnsZCjzzsFs2zJsPsPCyzDi4iSs2prpKi6iJihp5iiizCYCciUpiCDpTpPpniwCDsCCSsPioijCoCLpBijCSiBCRikixiJpGp2Cxp6zyC4C3pOC9sypzpSpIiGC2sCpLpEpupKpWsfpusRCbi8sWCRpdpPiosXC0iapsChCECRiai0CppNp3C5iYixiNsfiyijijiezCs8CLzzi2s8phiBCep6C4s2pFi2pUiliQCjCbiQspsHiAiQC3CzCECNCEipziseC3ptsSCesus6i9CQpPp6CYs3pnCACis1iazszisHpWClCciRpdpeCisHioC2p1iCCci1sbCiCPCksMC5pxChifs6stpBiTCUsDsyiQCrsNsSshCAsRiYiWimC7COCyiRpniBp1p2sKzCiWsRpoiDCOpwCBppCjplsxpypdpfpDijCRsWplssC5i6iEiopNpIiQzCiKp7CtspC8pliqizC6phsfp7imCJCdsksqC4siCUpYsZids2plCFs0pUsJzpCcpwCNCgCsCLCtzCp7php7ChC8sipwCqiAsmzzsJsxp8sZsNiACniwsVpxs0pssmCrCpCkprsxiKC5sUCmiTCysMsPpXskCcpKpqi5s2ipilCAiNCsCbpypEsMiesns1s4sOiPsnpPiusdphCOiXspC7s4pOpyCKsNpzC9szsKivpSC4pqsBC4sqiWC5pHpgpjpPs7ppCviHs2CAsJs6inCWpesRiNiqiZpoCLsGs4CDpVsgs0pECTsKClsZpRsCCUsnClpopaCRsmpTiUsMsOC0pHpli2sFCgpPitpAsDC5pBCVsgptsRpXiap0paCRsfpkCZsOsrCIpSCVp5CLsWicsoCFiepVpvC7imCksjs3iKpvCOi6iHsfsdCwC7CkzJpYi2snCJpCCUsLpaCes2iSsspuCFC1s9izswC2sTzyiGsOppCKpCiUpIitpHsysQiDiCCppfixiliYC8pmssCjibs8iws1iBi1pQpxs7pDCTsyp2CkiupUpJsxCosLCTiKCNpIp1ChsAsXpVs7poCgCxCGC8iMCDiEpAiYC4CviVpdCesQsDCusBihpSpYC8i5CVsbpCpUidsJpRiPpFCopAiXC4i4Coi1CYs2s9itiMCDiFCZiLiEiNCnCYi7ipp4sMpIsqpWieCTpUp1CAsRpNCipQCbpniNCLp1sLCDC7iVCUsQips0sMp4iriTikCUiwsMsfplsrpBiisOCNsKpeCXsNpLCvCWsRCJp4pop0CKsoshiJsEiECXshCUipCnp2sAzJCEsPCJCtsHseCFCbCpCKs9p4CmCrsjszCqpCpcshsii1pbChs3pIskCCsvsusHsxsTCssaCAC1iQCZsWsLC8sPpki4iYsXpZCnpuCuisCusQCQzCsPCXpXsjCVsTpmCgsapTs4Cas2iupZCJpbsLC2i6CFCQs2CfiZpdsepds6zyClCCzssYpmzziLpSCpCspupJshiJCIiJiaCCpVp5i9soigCMsysKzzC1icswiAppsQCKsSsNCSCrp4ijCHiAsXChsRiYpFCspls7Cds1CGpUCpsvpACap5iFsDCSsVsyCWsTigpvCUs2CnifiaiqsJpmC7pxi0C0iDpHpss1iCCoCJsLzisNzCCPiACRCupvpfsmsdiJpVpMpNCZsYp0sKs0CypoiCCnpGiupZC3iviPiGCopDC2shidpcibsUCSCvCUC9sFsAiWpciZszChiszpiFpgiIs8saCisBi5C0pjiaiepQp6CgslpvpYpECLpgiOzppTispHiKCXiWiLpXiYiKieCQp0poidCSs2p9sdCxpspNpcC3siCGsEpvpfsVC8CmpTCzpXCOp8CHzJprCwi0sbsDC8sPpDCuCNicpjilpVpIi8CrpdsXCJiOsli0pJi9CEptinzsiSpmCOCWpZzpCpCAijiyCTCdpjpECupMCqsQpApXpRpGp0CviesdscCLpciEsFiFsai6pNiICeCciRsVsSi6iTsfi3pGpACqp0iwp1COCaCopZiKsTsHsspVpliPsfCZCZixCPCfifpfCiiAiqpqC4pHCQiIi7iupmpSpcpzpPpBidCWCWsSpRpjpHzDiTCGpVCWzJsGCFi7ziCeCNibC6sbzDiEprimCvslirCoimpwi9i4CMpDsFp9pcCVCqspsts2sKCJpviasjClsTiOzJp2iUsEp0CvCfsiCUsSspihsEsPiLCmiRiqsHididpjipCzCfCcCOpgiGzspXs5CKinimiBsHCOCGpdpOswizCnCHCzssiSsDCUp2iwiTp5i3iFsbpisyCViLpWiwsSsoCcCKiJibpXp7C1C1sbpSs3CRCfpQpKpaCdsCzsiYCEsEsqCOCJzysLi7pCiuiAp9Czi4sPinpQp8pmCSidiriViDCBpNi1pEixpspPisijpli4pdifpys7pRpbCFCBCfsLsJihCcs4sosIC4impcChi8sosAitpmsdCUs6sqpqCcC4pkptidzDspstp6pos8snsOiKiesqCrs0ioidpziGsGsmCipszDp7sssmsMpLCSplpRpPspiNiCpAi8iCppstiFCRCrC4pDiRpUs6p4CKiKCJiWsAiYirCPCOsmshi2sUCDsOpUs7smpQCBCGp6soiXipzzCJs2pcphsOiYsxCHsgiSprs2CAs6pTi7s5iasjsqiisrsnpwptiKphCiiWCbiBs4CGiliepIssiyiciLsFpippCQCXCypZsfpjsvicsXsZiZs6i0C5CosWsAiVpephpAsOCiCgifikpMsFiOsrp1svilCHsXCYpQpLsBCypjpcCspysesQsyi4Cvp0pfpDiXsZzyCFCIsMsWCPicCliZs8pIiJsPippssRixiLsPCgCtCPpSpXC9pGsTpVpoCqsws0swpMiyptiPzspbipCxiQC9i6swiHCVptsoswp0ihiEpzCZCjC0CHpxpri8pEpZCzsYpLsppspVshpmiOpXCCiapgCAs2s1pzslibi4pKpCCIibi7pip1sKssCVpGCTC8pOiLCkp8pPzCsupkikiHCmpLC8pZiyipCFsLCTC0CKpfsusnCQi2ikpQiSpep5pQCkCjiXCyi4sZCTsMsPpfCxsFs5iVpviCCBC7sssnzsCas4ppCLiACfp7CsiUCfiLsLspCTsOsPsPsPi3s3pfphieC2C9ssssiLpYCLCWiCC9pSspifpGs4zpsniIsisUpjs7iwsRCDpHpZpEsPiCC2pjpZswixzpsPsNsnC8COpZibsUzzzzpXpmp5CmCdpKiICtCBpOpTsYs8pNpgpJpzzpCJszpBpbCTipsNiPpRpBpai6pgsgpgs3s7iqiZCdsqsqi2iziLp3i5sGigiUpJsPC4pBpNpaCup6pBiQs3sxsnsZpsCisgCCsLCWp8i3pECvsGpdsLCQCXsXCssECspfp4sGp4sNsOzJCms1sLpZpYi0s0sHCts6zypYsVsasxidCmC5sCi0CGCosCCXCksBsmpjikCXpPpDs1sjCliMpYpYiDsBpUCgCkpoCniIpBp6zJC2ziszsFCgCpicifsVzspRsgCliziWpssupdzypQpFi8pqi5iAC1sRiopvCqsDChscsXCdpKCjCzpfpjzDsCCJCCCRpjpVs8pWpAs8CnzCpQCmpFsSCZCVi7C7peppposNs0iVsdpji7iLCIiWinsxispuiWCLpFsxsQCCi6sDCGpnCwp3CmCSCNi0swsysuCnsmiCCdpAiappsapqs8pDiLCTiGsQC1pasWsZsQsfppiGCxpTpnCmpssEs4pDpkCFsxs9ssiNC4zJsupjs2syiBpYzsp8izsbpWptCyCqpVsKCmCspyswp4pKsEpoiVsPsDCVslpVpHCpCBiHpFsUivpSimi6pvCfpjihsEsECGpgi7iAClCFscC0irpbC4ihCapTCRskiAppzJi1iNipCKimiGpii8p2posxzsC2svs0pGivp6pgC4CzCBs1itCopDCRs0sLprsRCQivzyp4iNCpCEpysJzpsTCViis0iyCYsDpqi2i3C9CczyCoifshpBpkiRsdsFiaiRp3CPipsAp1pOC1CDpVpVCCCAsipLCbisCMsZiZpJCQsFsPpQijsmCyCRs2Cks4pDChsTpKsizJiGC5zipIpzC5ioCVCqCNisiUp4s2iqp1CvpZpUpCC4igpDi3pvsgprCopHi8i5sPp4CiCTs0CxpQsqi6CPslpMCMp3imp9CSiYpsiTsMiGiQCns3C9sWpWCKCOsgsriJCOpwiIi4CesPsUCaCXphsJiwpqiJsGs9pwiJsvsdsBCciGC3ijzys7zziAsiiYpjs3sKzzp9CtsupXC4iZpipjCBsXsXspClpSs2itpFpgCVCcsZsjsIpyCdi3pFCYihCuCJijpLptiMzpCsimCpijCmi8ixi1CdpZs9skpfiWpopziZpKCfsqsppPC4zzidi6sup1i0CLiOCAiIiYCPpLzDpRCQCbslsqsGsPzpiKpQiSsBsGpmsJpOsxpssUzziZiesYpIpIiOs4pbpvivi1CDC9iDsZC9scs6Cti6pzpeppirCEpyzzCSsGsqsPinpHCSsUpAzCpNiopWsWCLCHiAsOiLsKCiiRpSpgiosyCUCqsip7pZpBphC0saseCyslsUiACuioCNiEinskpMp4pZC5iYiGiRsKskpVpMi1pvzppUsniUiWpfsvzsCACNC3sqCTpmpVifCisgpTziphpJilp3pysvCuiLsmC4pBzCzspEippaCZpzpcshiKprCcpICIC5iAsPs6zyClCDp8CPiOsWscC3zzsEsbCPsli2ziCmCVs2pBClCFpxi6Czivs7pcpyCEsJsgCapPCFiepACtChi9s8pciNseC6CXChCipps4s0pOC1sBCXCls3pmpcpdsWsKiBi4i3CYiFp9p4pKpHizi9smiKsYp6CwiZpspys6i3pziFp2COCPsYpNpwsZpnihiEiPCrpJsZiUCvC0sjsapjivzisuCjCfCmCEpyilsQCoiBsEsHCaCTpjsYsyibC0s2iKpXCmixCvCnCAioilscChC3p8pvshpvCPCOCfphCgCosWpEidptiKp2iRiUsfC8phscsKpJiTshCfimibsss2ClsVCusSs7zJp1s0CgpNi5pUCpiLCepupDitspiXsvppssCPi2iriupEpWplC9CLC7pHsVp2ieC9CXC3s0zDiTsCiusGzypUswsSikCHixpxp1pAsTpvski1ikpJpTi6pApeCBpnpnifpUpzpIshs5pPitCfzDs4s0iAspCAp9poi1pcszsTiap8pHp1sepfCoi9sbiisVpNpnsIpwpUihCWi7pnplpdC4CGp6s0sosAp6slpFigi9sgsbp0pFiOzspCpGixsqpnzDsEzzC1CDCHCIiXiMp6CosCprpPCDiHpICYzpifppi6iMCksWpnsPi7iiCnp5sVpCC8p1zzpezziKsDsxp1s5CisjpfpsstC6COpEiEC0pkp1pUpSCgCtiliGpKiTpypGpysiiHC8C3ClClposUs2CWpxsVC6CRisCbs7C5CViKs4ssiypzpvC3pFCypyiisEsbpNsniHsNs6pbpSs0pBpwpCifsKsMiBpos3C3zzsipgpAsqsAijppC5igCLsGsop6sLp2imCyCKCjiPiaC2C4CPiEp3sriPCTsNi2itsWsaiWCPsMCSpUCVpgiLp2psi5p9CZiSpJCiifsUp0CXCaCTzJCcCos7pwi8s6i3sgCICxCICIspsaipsFCACMi2sdpqCSzippCdsGCFpbCTzCp9sZs0ilC3plsYpVsspqsNzzsEskicpLsqiSpGpyCXpos6s7sIsACEpLswiPphC1sNiwCmpAieiKi5pRCHCHiACtiVs1pHiWp5i4pxC2C8sypsiSiJsGChC5pHsliwsai4iXpBpus3pUi7iniWikCli7pYC5sipmpnitCKp1sUsOpWiEseCosgCsivs0pqspsCiICpCusKpZisCUsezipOCdzCpXCKi2s0CesVCvCli0puzpi5pcippssZpnsIsWiopEsxiNifsaCJCEsZsbsEsuCRsqswsGifsLCkCzCOzDs8iFCQpyirCksDpBCpsiiHszihioiksjiypIiqpbilCtsEC1zsprC5pSsmC6CDpHiUsgs9iVsqpjCxCQCVCqs4saidCNCtiniTpSsYpuCVCNptsqiNi1s2sppWiCsBsyCtzJiHscCNCki8CQChsKCzi0CksIpgiiprC0zDpFzDsFsppTpTiaszCbiesCpjsICWs2papcCBpMifpoCbsJCYpiCSsfsviUCqirpipjzsCTpfCpihp4pLiosaCOirpRpuiYiRp3pOinsIiksUp9iKCliwCbpjsOitCMzyC7p5iwiCiiCnC1CiCWCjs4C1s2p9p5C0s7pypDsMCisxi9slCdpUC8prCOiwpDsSs3iXCkiFpBCDiYp9sHiwi9ziCApnCpCeCXssiUCMCaCvpWCICTiKsvCxCkscpEsWpupYimp9iUCnsYCIsipBpipRpkirimivpAiVsjiQC9p2pZsqp1COiFp2CYpoCvsVpzi9srpgsis9pmpTpXieCGp1i2s8sosapApICdzipVCUifiQCesNpzCyCKCBsgiyCRCisNi5CspECQstiCpeibini4C9swpFi3CWC3pbCIpspepYsICaCxp9ici8icinpzpgsoCEsiiMs6s9iKiPC1pisBCCiOpaigsfC6pki6pGCjzCiPCBiECLiqsEiSiisOsgigiRpozysNppCrCFiYi6CTpXpppqsAiKsYibCWpKCLpuspsdCMsHs1iEplCGiRsgCkplCHpcslsKi7sVpYpcstCKpupDslCmiQCECLC1zzpviusriRiFCIpqp1iLijpNimpPsfCpCdCMsCsPsrp0s0iwsOiGstCesWiypbCDivpRpFswCYiYsGpBiep5s2sgiPiYCQCAC7CMCrsnpdiuivCRpPptisiOpwC0idCgpNsbsrilsIsiChiks7i1iiiCiQp1CviosSCQC4zzpbseCHsviCCzi4igpQCksjChsbCqsECmsnp6p9CGsMiIpwsOC4pvCmsQspsGpJsiinCQiusBCAiSpzpEpBscpuiVihs5iBi1p2CvzisvsGCMp7iPC7CRs2ix",10767));
    CAIChatRouter.prototype["_connectImpl"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CAIChatRouter.js","saiPivicppCqC5CLiosOCbsfs6CnpWC5sZstswiOs9pWpgi3ChCAsuCBiYpIsUCApFiwC2ppC5iUCDCuCesLpcpGsSpRpWsrziiUiusEsoi4sICLiqsAiDi3pCiQiuCoids7CpC1pmp8pBpKCQpAitilziCypZzispspCzsPCMpJCHixpUiRioizs9C4pBpGCBiTpVCKCRsOp1p0CypTieicirikCwiAsFzizzijp5sNC3pkiwzJC8i6pLp5CssjpaCei8pEiJi1pUCNimp3i0pzpQpbiIsqsECLpOsBiTsGCNsnigzysosfsjsJiSiLihsqiIpzCKi3i8sLsbsPsCCPijCYCJC0ChssCziVsfsls1s2CIppCaijChsBiOsEiWiqprphseCzCei6zDCbpOpqC9iysiiYpqCFpsC4C2iwpiCaiusqpuC1CEpXCNs5s1p6pSCuplCFihCjpkpSCQigsBiasQC0Cszii3pViXs0CiCmCqpxCOijs9CvpOsjsYpvpZCkshpniWpMpKimsasipwCpijp3sBi2zzCezCixsai0sZilimsOpKpHiEiDp9sJsLsYiSiwiLpBsspuCHsKzsCJC7CCCQsLCOiqC4sepFi2shzsCbiwsApkCNiCiIC9iRsoi6sbCkpwCQi3sriziApBsYp5pgC4Cyp1ClCipZiuidslshpGiVp4s5CFC1C6CuseCasVp0iRsziRiwiTpVCWC5CRskCFCzsWiksVpXigziCwpkCCiisxsdzsicsnpIsyCwCOCQsaCdCjzsstCAiCpQphi1p8idCeiJChCkCysnp8CGpPpoiTp4snpqCzCfsFp2CZijCisDiGsMCasypysnphCHCXCZinCciPCEsVsjsoijsWsSpbpAsLskiOpyzsiiiQCsiNs0izCXCBCmiWC0pCCisKsusupksrCtiUsapgsJiuiOpJilpwzDpxi3pTC5ziCdiZszswCIC9ioiJzpCgCTCViKiVimiMiYiKimpKpmCriOposYCOzJsuidpKCNC9ihptp8pZC2iDCpCxC8pasfCezCpXiOptiZihCYCmp3s1iUpCi7pRieinpbpMiOiGiviYp4iWptp0iBihpWiwsBCNpxpOCvptzzpKpvsOsmsyzysasXCKijs9CBChili6C7Chp3inCOpECQCUC3i1pVp2swsoposhs7CpChptiapxirs9pIsdsRsvsXiPsRiwsCimpqiIpaiGsgswpTimp9CqiZpvpJsJCbCgpDpyCFsXiOpbCLsGCns2iipdimCFzppnseiiCLissdpYCPCRpUsGpYinC7iDiAiwsRi0pwCXC0i1CVCeigpQCyCsinpjitCapBs6ChiyiqsiCspVzCp3p6shpbpIsDsSiMiQiWsbp6iVsFiGsIigClirsciapZpMpZpiiQp6CPCVC7phCtC8igiJi5pliniMiICCCdsrCpsqCLCbCliDiTpgiPsZpBCyifCNiFCSCJzpiZiGCRsrsmiRC8CRiPsgp2i6sOiRpAsAC5CZsNiLC9sSsgi9Cwp7ivpyC7sPsrpQiAC1sKilC7p4CapwiqiQCWsGsmpqCMsHp4s8ppiICICZs9pes4shC2pOiXC7smCYC5CGpQisCqs8iTsYp9p8CksnsHsQsGiiilpvpXCcskC8sjiTiFi1iIiApdpDzpCLCmpKi9sWCIpjC6pTiqCRihCAsLpUzpsiiKi5CqsCi6CopIi0pzpwsBpnplptiVizCIsLCZCGpNiJChCTihzCsziSsnpHitiLissrCCsdsczJCwpiChCJsIsViCp9suCOCgCfpzsaidCrspCasFsppKs2sHsKzCpGiGsbsPiBsHsdCHs9i0psiRsuphsniYs6pusMiQCxs6sUpECDsQpmsUpesosas0sxsfprpHsjiAsNprp3sHiPs0pFiKCDCrieziCJiuCECgpcp0ptswCcprCBp5irCcstpoixsQCAiHsCiZCfstpHzzpQCysJsnsqimsYpxCopSiws1pJCcpyiCpTC3iqiNi6pFsgsDpbpDpNpHprCgCdi8ikp4iIiesCsyp4s6icpIChi1scpNCCses1idpBi2iDp3C8pxiLirCRsCC3pep5CosPpLiPClCwswsvsnsrCdzJziiaCdi1sxiwzppFpjC7phCYiLCDCjiXpnsPs8pRCgCcC9i0zipLpZiVsOpFzsCescCKp8Cvi1iPiPi9zistizpCs3phCwCtC2iTiFiFs8CWifzzpjiBpvzJskiKpgsTpNskCXCqp0C2sOpDpusCspssC0pTCfCzCRCmsrsXCziHCGsrivCniRinCGClp9s6s9pBiXzpCjCWpuiHiipGCgp9iLiMp3CjpFs4pJCJzpp3CVsiiMpPirsICtpgspChi1iapICepziZizs6sYpyCQCaplCcpfpPsBsmCEiGsPCppMsvppCgiqC2ppipshi1pwziikCgCeiSsFi7sOioCas4snCYC1pMzipEsFCvi5i7pgsBsIpYCAs7C1CyiUCfivChibpNzJidp5p1pUC9pJpWsViuiJs9pFs5iwzpshCQsiiQigsSC7sbiWitsEpFsRpQp3iDpbi9C5CvzyispZs0sYCzCKpqiHCeispbpOsyCsp9i0iSshswpOCMs3Cep9pmitiQsFCUCfpYCxpgC4sYiVsUs3p7sGiACcplpGiIstiep8sesxCHCUCTC7iICKCXiEsKs7C0CYiQsYpLCjCLpOsHpmiEsSinCpprsHiesmsSCjC8pfikpKi4CAC5sEpusnp3s4iGCIsFihpNp8i8CeCFiFzCsrs5iHCxp8pliUsEzis5iUi2CrsrspiFiUChCKpbCbsLsDscpHs6zypTsjCrsPskCSzsCTsFpcsEsjCyiXCqi8i2s4piiVCXi5pxpRC8CiCMCLiepNiGpNCcsIiPsXCwpRCgCrpmsosNiasgCFioC0CLstiYsfptsHC4sDsRCcp0sNCsi2sDsYCrpfi1CCsZiBsGpwC0stsVCYpBpHslswCSpCsFsXiFCZphCBCQikilsQsupxCpslpusoiOsnpvpGitirCipCp3CQC0CQsxsVsni7sViQiTiciQiTpSCUshiHsQp0CKCeCQsDpEpaCMpszpCqpfpRsHixsSCnsysXpRiZs9C0sviasapysHC8s5pjsOpVpJsyp2pzpZsYiRspsTCqp0pvpuCHCWsnCzi0pspipQsNCsCZiwius1Cdp7sXC2iksti6pEsUiaCwzis7CwiJsqsos4peziCNpmiwpspwCvi9pViSCWsMihCEiLinirp7pmzCCuCVC9C9zyCFsriYi5CTClsEpGC9C0pCpVCLikzDprpbirpPCis8CHsspkzpieCCpZicprsfzsCesushCdpkitCpCVp0zysfsop0pMsviXpcs6sIiOp4p7CopHiIpbiCseCXpeCyiHirs7i9p9sZi7pzs6iMplstpzCoCQpMs6p6sXpPCviSsjCqiJCVs3CvCOsiCMsNpnp2seiIsBsPCeihiusipNpdilsepSpGsdiqp8CKiVpFpxsoi4pmsUihsesmp9scp8i9pqp3CeCNiWCssCiXCDpsiIsWCUixsMCYCNCZp2iqs7CtCsCMsUpUCdC2pCs2sHCYi9phC1iGsRpyi7sVC6pxp3sCC7zziesyzJsIsTpls5iDiAsoi3s4sjijsxCBsfCspTsTCmijpxsNiqC9CxpFp9C5pcp6pUiaCIzizJsLiXi9pkC0iEpapWiACJsrChC7iPiKCSsIzDsoi1pgsTsoClCKC6p4Cep2sOs1pvC2pHsvi0pCsypSs0sTiWsDsIilp2C6posWpIpSs9ChsQpTs2iZpasVCGCBCMzDsriwiHs1sxsjCcpLsQpqsBi8spp3pdsEizsnC6sKpBphiZpQpMsQClsaijiSiyC8poCviEi4imC8pYixC5p9C6sOCdiws0C5smpsicC7sgskp0iypopWiaiGzyCPiHCfpTiMpgpesaCesxs6pJiNiUCZiXsjCeiApQCViVpIpXpRpIi7sVphibstiOsiCICNsMpnC3sFsbiTsfsxzzpLCjp6pDCsinCuCYC4sJpAp3pqpaCmCdsJprsqiXsTiisOpxsCsqpgCeiviZzppMiGsgi5pJCDC5sWiuCzC4Cxp4C5i9CNscpfp3iWsXCOp5i6iSsHpWCcposKi7iUpEswpYidCJCXsUCVi7CEsBsTsQpaphCbiHChC0CEptprCUpLphsJCapypai9pUsYs3pVpvp3CSCeslCHppinstsSpgCzpzpdixiXsZsMpUs6sWiasJiRseswshp3ibstihszias9CapDs7psiei3ppC1iesbigC2ihsypPipCXC9p5plpcCJiJpPC7iECEpWpqCFs4CDiZiICOpWiFCmijinsUiwiSiRihCSCniTphpXiTs1peCMCCCOscsEs2ziprsesBsgitilC7ivixirpdpvsts4CGpZiBpdiMiRsFC8pCpgphp7ikCKsUpjp1pSpziYsVsiC7sJsJs3C5CkiLstiSCACCCYsvsysLpjpysYsHCfsIpwscC0sgi4iasuCvi3i4saiKs3C9pdsUspici8pfigi8ixpeChprCEptipiXpSivCjiVpKCGzis7CbC7ChCdCsiwsCCai5s8pYzzsPiSpmCziqzCCXsrpFCGCaCEsHp5zpCNCmCvixpUsJidiXsHCqstpNzysAiOsSi4C2i2sji6pTCHpHzpiCilizihCJpLp0CTCrzDzpi1iepsCPpkiGpACislibsjicilpQsLpTCECLC2CXsbiYspCqpUsOi3poCYC2iOsls9iJiBCDsNiOpZslCBsapECjCssVpWiZCtsfCRiHsnCxphpDiCCFpDsbiuiii3posii5C9pVzyiesQixp0sRCli2iOinpqCriUp8C9pNpkidpPzpCAi4idiazziTsdijCZCcpWCECGCyCbsvsLsfsSp8CYsyidp0CHCLpIipi3icies6pNsVpxpZiNi7iNswiQi3ppinpPskCOp5p0iziQpTikCPiYptpAsCiuioCgCvshpRpqissIivsRp6CKikiEzppwCbsrp6sVi4pti2p4sACKCziWsCsBs2pfsmCssDixsspiiBszs9sOirCdp5iFpSpLCUsep2pOszsyp5paiRC6CQCLsfpMp9CeiNpriUigi8iWsfiLCasnCepaCiCLiJiFiLiep3pFstCms1sMp3CcphpCpjCQswsrzzp0itiIsXpHpEiliaCKCXsZpgsgsMsJsPpKp8pkshs3zDissGikiNCDswizpnCKipivzsCqs8supSplpcCCpHpfp9zipaCJpkiYigiesGpMpasMiSitsWpICEi1CNpSp5pzivs3iciVpGCaCOC8pppbiiCOCYphi3CEpCpgspzCiypaisCXp0sssHCKiqCIsACtCpCyiuCQpZphidCZsqs1i6iIpUCEpBCtiki1phCEp8icihsmCGp3zzppsCCeiNCIi8CyCHiti6iiCMiJszpcCPijp3iliisQiVp7pJCnCFsni4idCWCxsbirCGpzilCYsCi6pmidCHC2prCKzDisCppniAiwixCBpKCii7CziQCQCgsupSplsni7Cxp3sup5ChpgCWsoiRippICjswpcCBCXzJsysOpPsUpMpdirCSips0i0sGpuscpRsqsRpLpsCczpsKCBCGCGi4iliNp2CVsLpCsMi5iyiiiTCMiaslilCWC2s0s7syCAzJiDp3CwiLi7C2CssGpmsri5p1zCsEsjiUCepopAzJC1pQC8ziCAC5C5s0slsyids0CksZC8pGCxp5p0iOpUpLCcpZpjsqscidi7s1CqsPpbpvCUpECrCZCipliDsmC8CciosJpLszCkzJszilippcsJivihpFpgCnslixsCCds1s2s3iosSiOpNsTsqp6ssp9CusYp4sYpSpViVpmpeCnC3pUpospzyiaCVs3CwpeiGpGzyC0pVCdpEChCms9zipusSsAiQiisAziiCCLilp8CksopNp8swzDi4iBinpzitCAsUpWirsJiKCBsizyi0CpClpkCip8pXili5C2irs8pxpgpGsuC1pgscp8pqsQiKpVC4sbiSpeCSpqsSi6i4supGCZCss7impYshsKiWijiWsNCyCaihi3iOCipEpMiBs0smiHpWpdCZsTi6iysypWpDsTiOpAsqC3CpstiTitCGs3i5pQsICczipBidCFp7itCnsxpSp1p7iTC1izCOiwibCEiTssiNs2pvCqsrscsrzziusDsBp9sDCnpTpbiksqikpGsEiapDCRpSpECJipsXCts5pqixiqCqpKC3C5sqC5sgCkp0pCp7sTibiwsVpop9C2sQiQzyC6imspsmCZC6spsmp3CgsFpaCZivC7sPsxirClp1ifCKpaidsBsNsDCQCBsBiKCnpPi9pECosMsHihCrCtiYCJCaiAshiNphpaiGCYi6CisgCcp4CMiNisicpGCyiGCKpCsViuCvsHpwpTCLi1iUpusKiBiNp7pXziCXiqp8sUsKsYC2iUzDispjCJiFCtzJiOsDCrs1CCsYi8pCpos1p0sVikpbpgCqp4iRCBp3CHiDpaspinphCcscs3CosGiKiMijiBCmsnpIpSpRCQiRpYi4soC7CNi1sssHs6ilCuCfiKi3CNiAsqCnsdi8Cisgpgs6soiUisssCZieiGpsijsYzzzisJpbCPpfCrsSsdp0p4irCNzJsRpaCys7sNsgpws8CHpsiZies9sUp1smsBC6sTs3pKClzyiFs4pms1svitpgCnCps1pkiFCrC7iusNCyCkpCCriNiAsvsEsBC2i4sHp2p0pRiEippJCiCMCPsWsgiGzzzDilpRsGiciypdCLCniJCxpqsap1CwpFCti7zDsECSCapTiApZsTCLsCCRpipopTi2pMzyi1ikCpsts2pbpxs6C7sCCPpWsdiDpfsOiJinCfpKiTC9sMsEigsLsopuCIpwpLi6p2pjiasTCbC3CQs5p5CQiAizCuiAi7stiVpJpfzDpcCap0p1iHpbsKsVpMzis4CwsmikpGpFsZiiiiCZpBsXsBsIseCYpaiFprCMCuCtCOCAiXCDsVpoC2iGsFCJCDiFiZCRsBiiiBi9pQCzzyiSs8p5s6CIijiQiDsVC1p2pXpdCis8Ctp9iBsyp3i6sbiszCsCpoCTp0srCfixCEpgCjzCpZpUCiiHi6pIs4slikiypfstpdiSstpziYpcs7zpptCbC0CDp3sNCjsjpFsyCuplinsPiCpnsJiosRsPsuiLioC3CysjCZiws8sBi0sKpYCOpfsRCoC6sxCiCwsDC6COCkpop9pfiDiKpiC8iIibCxpmCGsQCzslCUs3iupYi7s0pFCjsrs3zzils0pgpniVi0sCiIpbsosCiVCwCJsxp9itp5zyiepTpbpKsxpkphptpYC4sbCypLsnsBzCsFphinCypTiRC3sUiEs8C7plCUsQCJCICTsfpvCrCzpPidslCrClixiXs6s3pliGsMiACdCkpcioCVsJpgsxs9ioi4ClCgsJp1CVigiMsLpnpSCqpdivsapdsxsppFp5ppinsaC4iJiyCriMiVs5iQCjplsLiAiTihpCCaC7CQiZiZpZpQpQzCCRieiTpLzyCfiEpLiLC1pOCezyiXsGpxsmixsXpIiYstiCiJprzJpyp0iyzyspCCs9sEidCgsJpfpxidiWsIzsiksQs3iFpEpxCfspsDiCp8idCrpJpzpdCHsdsusNiysesDpgpIzii1iwCLCEilsis4pXsHpYsCCZpkiTCusqpusvCGCdCUpusniVpJsmssCSsZp6igC0iwpCsZCkCss5Cpp4CjsLCFi1p4C8CbCFsxiRpVpyshpCCjC5ifiXsTpwsgs0Chi8swsAs0iqpDi4pVsmiPsXiuiFCxilseipimpapViEspCksRiipTiHpKsTsBpts7s6pHCCCIsssApDsjsGi8CTCZsZzCCyC1pRs6CAC7CTpdChp1sVCWCtsICTsBCtijpjpoCniJpdpSCjsVs1CesQscCaphinsfizsWpQpap4iFsNseCcCOisCGCesDiYsbivCOicsOpKijpXs9inzppvC8sxCbpiiKCVpEp2Cti5Ciigi9CnpICxiri0CBikCwCAi7iKiICMsJpJsviXigp6p0iAs0ini4sDCMphpgprCaC7pqitsPiUC7iICKCLpxpgsLC0pciephsepwp1CVCPs9sxpsCFsbiNCXshC2ivzpikCOCBCEzyCtCXp9s5pBCLphsjsap5prCvC7pysKi4s6sKiHpXpoimCIs7sPp2izCupgiAiZiws1p5C3CdCNpmpZCAzyiuptCApZsOpfsFi7pbCDsVp7idsliQsCsSpesZptC2CHiOiZiei5sDitsRsnCVsXpBikClsACyiBssiLs3svsMsGp2phiEizCgi8p2pfC2s6pEpWi5paswCyC8iPstCnpOiYpps0iRCAsVpPividCKpnzDpbpKCBiYpgsXCCsNsDCnprsfsip7pWs1ikCJplsgiwpKs4scsBCKpcpMshCuCAi0skiZirpQpbsLCmitsviBiOpPpuihpNCpikp4CBCFCupNsYs7igiFsVsxptCkzJCOCgCTCZCmsZpKsGsDsKs4pKCEpUpbCIpKC0CXC0sMChiECEihsMsmC2plpkpxiIsECDi8s4CnClpEpFpbiBpUs0pqp0CmizibCFiMsgpepLpHphCYpmC3pnslpHCrsLpjiHC9sEsaiyCrC6i3iMslisC6sdsJCqs9sdiizJp3iop2CdssibC9piCWsbskigivpci6insGsnsVCus8psCZspi4CfCLp4CgpoC1snC0ihpmsqzpi9pQiBpCi9swCzpKiaCKs7pCsxzypIpni4iaCtp9pLCZp3shsLiosdpkieiQszi0iki2iHs4pTsMCTCPiRi0CMzCi5iDiQiDp2ChplsHCRimsWpUsAzpCQi6iSsDiipNCqp9i1iWp1sXsrCZppp8iGpBsYClsxsZpMp3sBiACtCkiHsqiVsqCUi5sNzpipiBsisFzipesIicpkpYCYilCmiSpfC7supQs2CxCHpviaCDp6sep2iAsfCziMpepKCCClCKstsrCPsWsSsUCOs9CQCNC2pls9szphCQsSiKCiCWiUiXCACRC8CppTstsVCpp2CWsvsds9CDClpdCKp3itsksbs7iuzJpWsGpSs3s0pZi3CrpGs7sRCeCeCwpliPs2ibsNp8CIp0sppipnpQijsPsephpKpeC6ikpNzyiZpAsTpZCpC0sEpOp6iyi0CRptiLCRsXsxCSCACisjzssrissGs4iWszpainiCpDCACLsTsJiopSi4izpxi5pGsapKCuslCosXimCjsxswsFCyiuiKphpfsxC1p8p7CSsKCJCbiYpGscsrpksniEsWCjiys7pFp1sHCAC4iNCOp3iysECLsGsliOiYikpTCgsRpVsqitpZCdiciOC8ijszCrCdsSCpiupmizCRsZpJsSiypsCbpDiOsricCPsNpti6zyp6CrpRCnimizpgCIiCi1C6CMsXiBsJCesppOs9syiapaiOCKifpXCFp3Cti2i0pziZs8p1iKiBsnpAivpdzsCBpK",16114));
}
export const _AIChat = {
    get AI_ROOT() { return AI_ROOT; },
    get WORKSPACE_ROOT() { return WORKSPACE_ROOT; },
    ensureDir, safeSessionId, sessionDir, historyPath,
    loadHistory, saveHistory, listSessions, deleteSession, safeAttachmentName,
};
