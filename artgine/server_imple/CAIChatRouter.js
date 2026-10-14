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
    CAIChatRouter.prototype["onGetSessions"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CAIChatRouter.js","sHi8CoC9iepVpOiYCNs3sFiWp2ivsNCGs4p5sOiIsBsSCli4ispesVi0pQpsCQpBCSiusti7CosVpAi7plC3CcpKslpmCFCJpyCzpUi6sfs0s4C9zzsPsYpoiTCRs8iMphCFsMisC3idpliKp7p2iPpWs4i4CnsHiSC6iui0pbsfsVsJCpsApKpypbCeifsVpCsop3CCsrsZiJp9iTpbsAizpppwptCbCrspsviFpPCCCwpaC5sRsgikiDsmpzCIplsoC0impPpppBiSpXs8iECfC1slC2idi4sqijs4iWC8itp2isCKiGiCi9iWpbs0sMp9CpCVC4iZiLpyscplpKsKCGsqpSCss6igitiUC2CCCQCWCVs2iXs6sgijiviKs5sHzyCJCYpTpxCbiSzyiApsCTpDs6p9CaCECaCciUidi4zizCziCICcp4sxpNCrCdC2i4p8s3ikiDsGsjC3i4posGsxpGpvC1sbpxppCUs6pqiTpApozyifsFC0iesJCwCipep8CspLiliHCKCYi8pliSsszppRCfClCfiVCbinpYCPCepGpEsisMispFsqiEi7iqpSsJpkC4CrzppTpHpApjCmpGiIiPsJsNsvCNseCpiHptphiDi2pri0iXCzi5CkplpQCks4s9pzs8sJCCCtiBp9p3CmixpipGpRs6iVsQszpmiPCzC8iXpmsgi8iypTpDCviciKCHCXCBCmiiijiWiQCZzJiLseC3CpCOsRptCAsapRpDCzs3p7sBCoiFifpPsopapMsdCdpVioi3i2pcCnpNC1i4scsis6CysUi4pqs8pGiHiip2s3iJiCiVpep0iLiHp1C1zypfpfsWpSzyCCCHpFpIi0iwpGi7pDpTi4COiksDCpCtsrp4sFsBCiijpSs5sEC6sSpNi1s5pSspsYpFp4iHpiC5CcCIC5CciozzsGpMiLpAsZp1iZCZzssesQiOi9zipWC8ixpuCtstCdsMCpiDCXsxi0p3pFskCYCdsiiCCniJsZi2CZprC1C0s5igp5CxpZC2pNpHpWpgsfCTzsCFixpZiuiaiBpRpDsVC4ioCZCTC6s0CKCkCGC7CqCZCLpbpEs2ilsJsECoCspNpCpOC6sCijCdpDsyC4sciIpbp5pUCLiVpSpnpDsgCppLpcpNpxprswsNCQCEC8sBpXCdsapuigi8iJsysaCGifCYiTClCrpIpbpLpisuphCusDpys3CysSpnsJiKiYpYsPswCViGsHpmpUCwpmsps3igzyswCaCGpUs6CPiHs0CSpdsjspsspHsNCDpXCAsaCDiYpLCjCBzssmiwiTC6iysysBpapqCiiYsgCbC1pophsIpMsVsUsVsdiosTCEsspViBsgpNCRCNs9ifCfszi9iHCpsDseCHpasspnsEpdi1snslpOpupNsviGi1zJiPChziizp7CMCHpoivpzCbp2i1i5p3iLspiUscsUipisp0ifs3sKp3CYiuCMs9pNCrCMiNCMpqi6pmp8iuizzDsopHp4sPC2CSCcpesQC4sOiziGpjs6isCWsepmpOiXp4C0sTzDppC6pGsksaiOi1sGCFppiMiJsqirinC3CAiXpcCBsdpCp6idiKpii0pxpeCpCGCRChspCniRpws4ihpmCbCmsWsaiZC8iMCzppiViMsBslphimsep1s0pPi6sastzJpZsvCIpNicsbi5pgCmCTC8pYiCiBsbiPpBiupMpxC7s7i7pIzspJstsMsepKCysQsrsVp2CopHpdzyCeCZs5sxsMpnsaCDiesQsCCuilsgiKsNpNs6svsXpSitpdsVsMitswpzpKiesYCuC5p7stp1seC3ixCmpZinCjC0CGplpeiWCap0sLsvpcsXsapHimp2CFsWsrsni0pKp9p9ijiMp4zDixpwiCsLpWiPs2ziCosYsGCssFpQsEzCi5p0CYC0ses4iQskski5i0CgCjsJsuCSp3iep7CTpwCnCTihsIp4sEixpsiwCOiYptpEsasPCwi7p4iWpVsNpVswsNiip1iesQiJiBzJCApCpgC4p6iys1i0iHiki4zipNiNshzisdCmCssspcCZsSiBi6pYpgiTCcC9CWi2sNioitCnCrpPpbsBpgicpupWp9plCQpniUsksOi6pCCGCjirsVpdsVC4pzisCbCvp3CGpUseiUCxinsDsdpiCrsgzCpFsxCWsWiosriXCIpCieiJsPC0Czihi7pwsRpXi8ptC0sppgiyCApoCTsDiliZCMpHpxpjs1Clzzi8CysVCMsZCCpqsrivsJpYpRsNsupXijpBpTivp7pZp5i4s6s8pspUpBsdCSixC5iMpxi8sZCOsvpksfp4iys5sApwCPpRp0iZCOCbiMszC6sTsZp8C3pnCepmp0sQp4Cvpzp1CoCWsupqsJsZiUsSsNCdpRCnspCap1priTs5iapqiECRiSs4pGpup0iMpNiUp0peiZCpi5pZs2CVppiZCnCRsnilCepvstiCsoCQs4sasIplpkiUs6p8ikCTicprCJCcpziVixC5iFCysCs0C6zpp9CMpjpFsfsuiysCsVCUpZisieC8ihsapmpyp2snibC6pEpUsfpYicp0sbCMimpGsXCKsbiiissCCzCXiHsys0pAs2C0iIpTszsjsgiKppsEzssWiaCrzss6p8sMsTsDpOCMi5iZsas2pKsCicCEC4CJCsC9pJsvCcCFs4iXsIs1spCnpbphizpSsWiWC7ptiOsUpYCVihiRiIsPp1s5CPpBClsBzysBCOsoiGsBCLCFCks4sDs0sbCTCBCpsjpAiuszioCSCWCZsksgpNzDskiTpGsxpOiUiLCSiiiYsWpUirCKCfCosHpdsJiQsmpdpSpLptC3iDzCpZsusCCuiqprCvsbCzszsQiciVsvCEpNCosypniOpmscCJsyicsJpLiypGCnCxpXsgiTsbCiiosxC9smsRiQiPzCCezJC8srs1i1pzp2CFCdsciEpIpYC0Cis0CqscCUppzDiwpiivCuzppDiJs6s8C2pWCPs8s4pjilCIsACKsNCEp2sJsmCkCnsmiQiEpIpgzJpPsmC4idCKi2iRslCQzpiACEC2pnsfizpvsws2sQCriTsTibspiLp2CcsOiOiDixsTsXpvpBpvics0CxCLiJC3iSp8iBCWsuixsWiTiji6zJswCishpHpSi6s1sssKppCMiXCqsIpMs8snsOsvCQsEsSiOsOs2iPi4p3issspLiCixsqC6C4iRpEC1sdCKCvCMClCMsSs6s1pbCxsVCViGpXiNiUprpIp8iSCzsOpUi4CzsciYieptpGijsgsupDCOp3p2sBCDCipVpZibCJpepCiAitzypJpYpBCAC4pEpxCFpOsYsSCKijCDiCsfpWpKClCCsyptpepRpfpJpIpUp4sfpcspCLCBpuCpini5zDsnCypTCgChpjsICipTClC8idCtpri6iasAp7ixzJCvpcsLCspJihpsp5sNsAispbp8itsUs5pVpTpGsws1pKsapOCms2pwidiEpMiqCxsAC9zDiXiZsCsaixpcCOiqCOpliipciCzJiOpBpkzJsdsziksBzJClCAibpCC2ikibCTs9iNsIpUpDiNpNpbinimC1shiqCMCNCDC6zzC8CLCKpBCrsBpcCeCbCfpAzJsRiDi6C0p0CUsGC9sWCzsnsWpUpICmiHp5p3CAsas3sPivp9i2sMCvCDigsDpZsBCeCICgC7sJikCysjzsibiFpNi5p2CVCsCui7pppWsWCcpcCMC4pZC8s0svCTswslpis8pWsfCZi4pDC6CesopqCvszCezCp6zpCasepX",0));
    CAIChatRouter.prototype["onSession"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CAIChatRouter.js","p3C2zCCzpusqsGzisniviEsUpIiqCTikipCtiQC5iFpZCMC6sYs5C1iZsHC0CEiUi4pRiFp9CmsKpbiICZpdi7i4pDsHihpjiXsvCqinpPsziLCOpIiRsksdsYsbsACnCDpLp5CWC1p1sKsfpGsWizs0pgprpZCZCUCczsCVpYsDititCHi3pupzsVpZpSitsFshCjicp4sBp5sEptsLppC9p5Crs5CrstpOpGCSifphpnsFsDCMiwCFiDpFC8C4CjiXiopNp0p7sgpOCzskiIiMCjp7Ccpqpjsli1saiDipp4skCtpBCiixCppQpsswpUixsMsNsksGCUs7skC1ptsEpgpji4pdsJC7iGiKpkifiopNpICoihsgsqCKsni0sLpksVs1iQsRsPsQiMCYsDp9prC8snsMpMsviUCJsbsDpOifioCXiHCXiPswshCvslCCi8izCKiliPC8pdCJsWiUpkpKpMshsXpiivsIiJCupOijpdstCyCcijiLiJp2syClsszzicpNiFpFpDpICypvCACZiPseimsTCzCUp3s0sTsVCti3CwCYsyicpOpjpXpLzzzJs8sTpKiSsVpqiDibpPs4C6CkpViYiqp0CgsEsgpZsezDp9s6pysMsCCHpJpEC3iUC4ioidCGCQpSsazzCHpqsnCqCdCaidCAiaCCpMCnCIs5CCpqiRsPpcCkpOpLCwiSC7ipsmzDsIpvpTpqCkpAibiWixCmsvstskpepOspsUi1pWsridpXCEsts8Cvp7CHiGCSpcs8CiiViRi9CjpcCksosYi4CECMC5iPiHpCCNpRpXsMsIiKiQsqpni4pHCtipiSi0idChCfi7iQscpDslsqpTp5CuszsYs0p4i9pezJsAiJiCirCaifCOCtCVsFpFp1ptsACdi8CyCFsnsFp4iGsCsViTiTiXpIiZiNimCXibp1zyiYsmicCMChpxs7iLpTzJCUCziECosbCQCQiniXpRCOiwsvpjikCmpwi2iSiXsspBzsC1C5iWpdiMpmsQpfsbiSifiJiqsFsCCDibivsYi4snpRCYpXpKCSsDCGihsQsLsECmppizixiIsezysriHsyiTsqiBpQC5ibCHCLiEpxpeCFiJpEC4suCPinC0ilCkp9iephpvsyCbzCCepuikCspTCiCIsQClCOC5sTs1sBsdi8sepSCOCLstCrpTCSidCUp8sPiji4pICbpkzJCppPzDpEC9CciKshi1iKiziDCsiBsdCPsmpliMi3iSCmCmigpGCtsHiLpIiVCYsNi8zDCTiViWpvCTstpnsfiGsqigi0soiLpSp2sDCZsLCApps5iksLpMi8i8swsus3ChsfioikC7ilsosfpuCBsysBC7sishsopHiWpzpMiFC7srpeCbCviSifzziMpOCfC8pEzzp4sFCxCOsRs1CoiVitsIi2C4CAicpZsZsfpSsPsWsGi1pPC8iusZiLixs6iJibpyits0C8s3zyphs1C9CICDpYpECqpLiYCriACaChpsi8CLCGiUp0sLzspYCOpPi5iDpBzCCdpGs7CVpKpBiIsCsxs8Cep7pJCFCPC9iKsviJCMsoCcpFCOixsCsasQszCBsssji8ptzpCezJiYpliNiiiRCts5iWp2ijiMsVpupAp3CRpBs1pWs4sWCbiLiEizCxi0ibi1zJiuprpfsyi0zipCi8CTsGsRiDsJCOsWC6sfpwi2CdivskpHCeCniVCypgpQiViyi6CcCIiqpUp6paiyCysmpPi9pBsJiFpYCTsSsHCkpNC9peiyCMphC4pRpliapEiKiEiai5s3i9pVs5zzpgsYiZC3pZCjzJpeCUC1CvpEsvC8p6CcpiCqCFsHpcsdCRpECTiNiVsaihsBC7i4papfCppkiRizCOsbC8iupICgsgp9popBsiCmsNsNpsiws4pnprzpspCRpsC7sbzzCGs2iSCBpli3igisCqpKs1pEpzi9ssp9C9pdiZsIsfiIsDiMsuCmplC7sHifpPsusUsBphiCpBsGpOpliUixiSzipBzyiTC2iXi2s5i3iRCSpJsBpeCeC5s0CLsfsApzpZsjCTzJsvCsinCjCzi3sesiiOp3p5iEsNpUC1sppFiJplpmpcCkpYp8zisICtsTpBiIikpEsRsKprCTsIiesxpZCuiciEs6CyCnpPCUsSsfC0iMCGpgCppZp9CACIioioiCscsGCxzCCyixszs6psCxppC5iJi8iMi6supGiisJsNCossstsBC3pfCzpZipCKCyi0iDpRs1CypYCMCCCpinpoivi2p3sOi5pdsoCfsMi4CQpTitpsiRsdsTsSplzii1sVpUCMp1iLiPpGigpliLCepysViyCIiPCOiXpApOptslCMsLsip9C2p8CGiRpxsNpNCvsJinijCKCgpcs8zDsMsEpsiEpSsJpACXpICHs8sBskzDpXCmifiPpmCHsvpVp1iICFiBiAi8i1iOitCssMpNp3C2priWsKCvCRsTCoippMsZiHicCJiVpApLCCsyCBpup8C9p5skphsWpNpsp6pHpSpzCOpYsZCksFieiUsgiPCWpUs5C3sDCXpgCpp4CMp9pnpVCXphiAiUsjCICgCqCsCvpYzsszpystiBCiiPiisGCyiQC6CTpCCVCjiksDCAsziqinsFpaCApiCKsPiUsEiqi2pxpvpgiFsOswsqiyiQpwpmstCfC0iCsFsapvsuCTsMicpxsjswsxCzCSisCXp3iqCdCXihsbzsiYiiiVpxswpUCWzCiVzipesNCGCACepLipsTsAsDsip0p4s5CVs2ClsPCBi6sXCZCrsBC6pEp1sZptswC7p7sEiVCWCyCosnsQiiC6sTirzJiisYCrpqspsTsuseisCvs9ipCrsupPprilihsMsdpNsSpMzCs8p2sYs1pVpHCOsOCfpvsmCzCfscpgCGiDCMC0CNsSsQiHCEphzCiFsip5ihikphCNsWpYpoCai9sUpmpninplC9CZpyi3sDsZibiICUziCFiyCviPCiCGshsFCSiGiDpXpMssi4sYpqCFi9pYpGpuCzpKiTsIpzpEpXipiwpZCnpKshCDpmsNChsApNpACPCXssiqpXpeCEsziLCFiapvCvstCtigsnCKpysxsfplpZpqsgpRs4ibp9iHidskCVpoCbskCFiYCOCTscpqi7zJiTsMitp6sFCapfskiqiXpJi6iXCgsNpSCDp8i8iMswziC8CeiyCwCmpJsLsBiasFpIs0pxiap5pjCapIiisniXpEpsippmCWs6CtCyicCssriSpYsJpNi9CTsCCfiSsbpgs9spiDsGsliiiasqsGsLsxsvitC0pGzCsRirslsOC0p4i7CYpPppziimilCvp0CzCdCUsmCCp9zCsKs2p6CBCApJiTpnieimi2C7sVitihi2irsGsEsJp8p2i7sXseiopZpgsxsxi6CCprsMCpsSsBCypeCOzJCVskCQCQinsWsPpkpwC1Ctp6Css9sliGivigigCKC7CMCWpsCTijpkC8sSinsKizsSpgsAzypEsuswiZijseCXzDiks9pJsSskiTpPpMpTsXpECdi0iJixCTsNC0pfCnsbCOs2iMs5sNC0C9ikzyCMiOioirsbiRieC0CriApYi7ixpwsrp1CPiyp0CbsqsVs4CjirzppLicspsgCspGifzCiDsGpJCWsnzsiypPifpfpuCuiws8zDswiFC0smpGsViOsUsxzzpRCHiEsTiliKpqpGpep8pbCgpNC6iKCfpPpfsACSiwimsAp9zCpzCii6iRi5sKCfp2pMscihsEicpWiDpXpSi7sFiQsBCICxiNp4szpliTpOsSiBzyCzs8Cti5sLpYicsUi0sApWCfCqCTitC9ihizCEissCsDs2pEiPCzzCC8p8CpsfzzCqskzCiupvCBpGiLzsiPi2sksFs6pXplsVCms3CHC1saC3iwswC7i7pmsKCisEimsDC4iriysyieioprsxCUidsHC7CkpoC0pdCWivCaCWzJpHsFs8iWsaiii1pOpJCOiss5pCpkzssxiQpBiTihpIsvsKi4ses4ssiqsks3sgChpLCMiqpQCVpBpGCViNC9iopHpVsEissVp5sXixpSpkCSCdirpyiFpnijC3pHCApFseskCvC5sxsPsAixCMi5i5phC1sIibpOpMpHiosNCGpnpfioCosRi8sVpSsqsjslipp3CTCXsXiJpMp8CKp0zyixsmCjiustpNsKpCs5CxiVs3pAimiUs7p4sZp1iosuiSptpeiKC2iWsyCBCximCUpVCKi3pYsuiBpXp5iUpjpisTpGiICNC2iIprs3CKiHsRpMzps4Chi6pWpYsZsjzzpFzJCUppsWiHsCsOC4pdpLswCxC3pupgpkpipksbsIsesJsUCmiOiyi2sjiEpyiWptCfsJiiCzzypliPpYsjC8C9iyiZpVs1C5ioiEiRsysNifs2zssJixp1CUiqC6C3CbsXi3i5iIsGsWpLpPsWCwpXprp1CJi4iHpDpRpkpqCGsisWiWivpWsJiApXCjiXCNshCBppinpnpXCupAsHs4sqs3pvpxsmikiusKCTsLpMi3pdziCqs0pWi9issQi7zzCAscsoihC9pVCppXskpYCYsUsZsZpMCvCjsgCOp3CrizChicpizizsCHCiCPsbCUCMiSiUpZsysEpasCiFiapQpIpKCSsKCDsDiWsACBpTzzpjsliVCbCbCWpNinCAipCgsQC5CtixiTCZpuC8slsPpGpwCSCEiri9s9icsLpEi2sdpfspCepJicClziskC9CdpssKCZsypYpLC1CDCzpmCcCkiwpliSpksRCXsxCDijCBCNpkp9sqiHCOpzidpDsEs9CQiGCwpisLCIiyCtiCCmsfzJpwCupcpyCnpgpKCkCli1sYpPsXszizsfCFs1s0sppoC8pEpHsZCasfpPsyzyzpCUsYC8zDpyCuCkCXC5iTpks8srCNpU",1928));
    CAIChatRouter.prototype["onSessionUpload"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CAIChatRouter.js","ilpRiqsEs9ClzpifiSiNphpEpaiOCHCnsVCSiKsliBCnsSiXzDiciMpspXprpMC3zysmsAssCTiDsksTsCiKpQshCYsbpeC5Cysws4phpCi3izzppUp0iYp0iXpJsPpxpfp3C2p2sRiRsapssPprCPp0ClppiOCQsPCNsjsMibpGsMiVi4CopViuC1CxivsuisCLijiYChiLiKstsGixsaCHCIp3sSCbCOCPsdpLCksdsECkCDsipqpHirsos7shi6i1CQi2CQCdCwieiVCnpBiCsHsBikCNpfCcspC5ifpCCfiCsPCuCmiviRivC7pmitiOsVi5CXiYCBs1i1iei6pgC8sqsWszCbi6iBsvihshsVC7iTisCzsuiDs8peCrC5sCCXCqsJpCpwpEp5ixpqsFpwpCpQswsLsip7iKCbsYiMpdsLpTCciiiViiC9sApWpSCECbCLiviGzJCMCup4pii5sOCnC5CJsxpeCiswC4sAibsQCHpvsaCfibsACZCSp6pNp8pdpxCMpQCgilpfpqzDpPiSpqCcpnsupQixsni5pupOpCirCdp3pLsgiVplzCCapCp9sLCTiEplCzpxigp5CbsgsPirCEpviXsiCJios8pji8CrplCssli7C0iPpziepnpjpOsgCwsVsRsUsRizpSpGpii4pYp1sspDpACFiapXpNiVCWCxCVippWiXC1iDCYipiyprzCivigiHiTCWC7CQCbptsTCysviksEsZiZCOpbCVihi0Cjs1iFsApxplsxsnszpRpRpApbspihplCNp2CzsYCmsJCws7ioipi1iuiqpVpmCOplCXChieCBiQpMpHzzitpJpviizDsJpdiiC1saigsvClCbzJiqiip9iQispap5iIpBikpKsmpSsOCHiQsKC7pepaCKiGpcpYstsyCUsvinpsCKCHsRp6p5iUpvi6iApTiKCAsasNzsp1pGpEsFCMi8CxCis2sqppiOp2pEihCVpKiUpbshsnC0iEiAsdiHsDplpAzJivCyCFiLpkimsICyCGC2sTiHp9CGi3izp1iQCdssiDiFiUCIp5pXpopCsFC9zysaCCi2pliPC6sUp6iUCepNslski9pEi3iciWCxpiphpOCzsisRp0piifpspIsqCXpoiqiOCesqC8izzzpyippbiesaigCJsZiypDCNs8sriDzDCNpHi4pFsysSinips1sxp4sUiopIijpts6CGivpmibCus2peC8pps7CxskpzzisgifiGsPp0pas1CMiUpQp2CPCcp6iQiSCksYiwswsHsepAigp9i7pUpcsEsaimpypViKCJiCp5CVplsjzpsppLiVpwp8i1iopoiKsBifpkpFCNiPzDsACsp1sVi5pYpzCxiPpIsSsRsIsqpWiFpzsxsWCBCVpUC5s2CtCJCGifispasTs4i6CKC6ziiUprCYpSpKigi3sipui6i8CzsWCkpwicsoiACmpsp0C6sKikiVCVpwiWsECzsxi8igCcpMpQiOsuC8pCCoziieCspiplpMikiKigCoCPiUsYpHCcpIs5s3pwpGiwCci2s2iZiOiqCOiDzyCKpHsOi9pDinp7sCCPpspUiYC2pri4pushC0i8s6saiWiNCbsPi2iiszsisxCfiAp5psCniICdiQC1CgsqpzC4sZpqCYifiIifias1pDpTpZCzpciOpHpmpapwsNigsTsICGs3ihC9itsXi7CNs8sFpzCnsCp0pypLCspMpZpNsNCPi5s0pup9pwsOzspssypSifCkCTsii6CUCWCWplirigCMp9pKpjpRCSshp5CSCoiSieChiGi9pepDidiIsozJpfCfCnpEpyiEshsKpIsUidCciwCmiricCHpqiUsYsssPskC3CLigp2CfsuiWpAi8sus1sYpJi7irCsziCApECuiYpns3sNCspWCmp0supYC7sosNiopoios4ppC4iHipiMp6pJp0CmpJCQpDsHpXp0CkCxCWp7iRiuprCzpri5iAipiyscC8pRpnipC6COpSioiHpdCwpDsRCjCXi8pSCZpbp5ziCgpzCaC5ijsYCupwiECqposapCpwsUCDC8snCsilCKiPCisVpJpvipi0iTpKCOCnCkC0slCvshsmpPsIivp4sspHihsmCVpUCTiVs0i9CXzsCzivi9i1C5sQs4pVpICtp7iWiWCJs0s5C5CAiyCspisSCJiipHpZsDCfpCpGpkpaiVs4CKpnscCYsmsbsqsciFpIiEsis9CnsRpHCYs3s2sGsIpdiJiss8CQiTsniWs5piscsUi3sEpTC9zDpFihC2CkCnigsTpbpjssiViSsGC0phCpijp2pbiAi8sPiVp9CWiyiRCKs8swpJsNCGiapuiwChCKiQCZp0s6irsjispRCCCZiYsTsxzDssziseCji2sAsLpWs7CUsUpNCKi8iliMiPC9sRCDCLi9spsCp2CBClpMCkpECaskCTsuCjixCci8i8ikp5ptC8CoiniQiYpii3iypRiVCZCop9pYsasBprs5sWiIi1sfsHCEispCsKiiibpnsEiXzJCxCfspzDzJshsMC4sGpTsVCiCtsmp2i5prpSCVCrsZCmp2igCNCdigi4s9sniJifsYimpcsspni8sTzDC9CGsTs9sHpWs8CBsBp4pPirsBpYsKpfCSpZCeCPCZzJi8p4CFplCWCGp1CMp0s2Cxiei6iyiMC7pEpmpji9CLiHC4i2CzCQCJidpeCaCcs4iTpPpYisi1i7iBiAsvpDsqspCUiVC9p5CnCiClptCcsxsUs4prCupfp0sbpTs9zDsisFC3iBpDsmpNCiC0iXpVpOprsQC1C9CACYspCqCVsZs7sDzyiPiOCfpPsGCjiqsupgCTsApgCZpSsnC2iOseCviNCaCaCapkixCfCCCAsXpDCXiAC0s0ijp2iDiDsbpwzzCmCNixsCsTCJsyiGCVChijsisvsKinzCCazDirsvCQiYi3CEpriQpHiasNCUCGsrs8pMsiCfCrpoCWsSC9smzyC2iXiniHCzigizCAs0sTC0pzCVCUsgsssZsGsnszpcpasasFCVidsWsGs7pfpsC7s8insji4i4iZCkCWisCCsRseCMCkiLsxpaCxsliKiFitswpFsQCjpaCQzsCmpsiIi5s1zCiQixC9Chi1pCpGiBiUpJpsssilCzslicCnppp8sDiisesysuilp8iviwC7pup0poipsIsIspiNpepQsyC3svs9p3C6spshpmi0sPplCjp9pBCKsHpSpOsCCMpipdidsGpvi1pmCVzDzDiypuCDsQC5sMzssVsKpyiFpDzJsSsoC0pGsXsupHiyslCsCms0sWsZCRsZpzpnp5syiApZsZCyikCNsjCipJpeixi1pYiDpTi2sIp7ibCqpni4sAitCoijCUpxs4sAiFCIpKCqsvCxC9iNzDCYCdijiIpMpuswCUpxstpWp6CIstiYCIsfs5CdpEizCFiciJiOCjiPCVstpSptCJpMpvCPsJpapLCYiIC4zzsyiZifp3sGC8p0s5sAC1ibCIs3pepSpRimscCOpTijziipsliWsXpyiYCVsZiji1iYpupzpBisi9ssptsjiLCOprinpisdCwiks0slsQCzziCmCRzsCuiYCQsVptiBsXiZpDini7pmsTCGs0slpVCPiVpdp3stpRCHzsCGCtpfpMzDC1zyzppcs3irpMprCHiqiZCUsXpCiPCHpGC4iviUiepQCBCMipCSphsJsRsXCDzzi7iQsGCXiZpfCLsACXpUiRiFsKikpGChseCBC9C8CsiisaCFinifCusaslsNzpiACQCzC9izioi6Cyp9slszi1pnphC0pRi3pqsKChisiIiXi9CuCBi5svsxsOpVzsiQsJppsyC7iqCmCNiRiesACHpfCviHpXpspLpFiDpVCnsWiHiLiuiCCLi3zJpEsdprpmsZiqsOpZiZsqpss5i4s2C1i4iUsfsYiMi8COpSCapViDiQCnCgiKCmsXC6zDsti5ppiDC4i1sdCJitpti9iDpMpOpfp2pEpssfiLplpUiZzCpSsgsMCuCxilsNCdC1sDpuzyitifC4psCdstpBifi8sXsgpspQihCypuioilCjs1iApvsws2iuiqsNsGi6CQiNCKsvpTCYpYs6CZpMCbsyCkp3CcCmiUssCiCvsOCIp9s7slpVpssEiCstpnCJplsJitscCUp2iACzC8i8szstpxCiCGzypeslsgsKCpCGCaCQpzpgCBsIszszCKpyCYCnpopzpHp6CBsBCfCKsnzDsPsEp0CssYsGiZiPiTsdCmpEicpgiJpfpPsopaCHiOp1sfiOsEipiKszCwstpQzzCvp5sgsEiaCLp6CRCViFsCikCYiciEClicpHi0pksysIs3pqpCpds7iGzppqCOiVp2CFsbsRibp2phipiPs7sQzJiypri9iiCYsqiZs9CnzzsUpUs5zipRsNizsmiQsrp5puiIsisGCcCeCvCfCtCnCmpvpzpmpNsWzCzyiFpoisC9s1s1iFshsQCls8CCpQsXsbCaC3inzzpPsYC0iVCNsSplsWs5i3s8iLplpxCppgimC2CCpbpnsapMCiCECxpji3CKpXC8iPiWsjCcpQsyiICoiVi7pMpjCdC0sqpliNsNsCC5pdCqC1pciWCPpUsUpyszpbCHCWpwzCpZiQC3sipozpsIiHskibifijCMpgp2pMiVpOpapws3s5p4sfsNpJziiIi2sHs2iZiSpssOiii8pZCMpmi9CUsECpCXsri0pPpTClpkiosjstsNiis3sns8p6pOsuC4ikzziNiqCQCxpLiVCZpYi7ieC9issazspVCfCrpHCqibC9sYs5s9CNi0pipGC0sdiHphpSsoilppikiwCOiYstzss7zDpFswCspipxpKiiiICmpXCGpGsspHpgpCskC6pcpuivilCxCOCjsxpmCNpfsmpPiwCksdzsiQCIpii2sHpOs8ieiEiwCZi9s0sDsQCOC0CwCLspiZCRCnzDshiiCas8pYiwpgCYC7s0sLCrp3pACiiCs7CrinsMpPCFpHsLpTsBsIiusYzipzsGihCsiQCDCxscCWphsepFCTpQCQpGszpIzJsqpfCICMzDphCasJiuiTsuikpfs7sqCSslptpmp6sZCDsuiXChioimp4CrspClsqCWChC9pOiFs9sEiqiXCjCVpzpoC5p5CFsYCPiwprp6sgiKpXpECcsWp1phi8sezzpxiysTsXp6iGidijCICNi7ppp1s0CqsqpBpHsepusTisitsxips6sYpjibpVicC0CqCKpUiXCoCzpBpEsXpPCwCYsYCaiWiFpVCzpECLiRsGpTp3Cvp7p4ipsViasjCzCwCgp2ibCRC9poiKsbppCazCpNpPzis3CYCbsXCwimpNCmpxCkpBiEilprp0pTpyC2sSC8psswC7pjsmiuieioC3zis3CaCdC2iHiji2shiNiVC7iCpkpGCasNpGCUi7pepgzCsRshiCpJiWs3zCsbpFC2ijpjsepyCvCppNCrsgCJp0i4iUi0CziBzJiwiziksjiYpzCapHi0iFCkpcp6s0iFpqsIswCYpKp3pXiECXpBs1sasUCiC5pWsrsqpGpDswpYpTi4scp0CDs1inpuilpspnsJCQi0pCskpTCQpxsQp9C9sUp8iAC8CRC6sViUsQsWiOi4pjp8iDCXsesCpQCHCui1sepupziQCMi0sgCAsZpHiYs7seiZpIiPi6sIpLiTCsziCqpmsiCcsMsZiVs6iCsDsxC1C9CQiWilsYsOC1popzCRpWiBpazipOCDsaC3ptscCcp6svicsApliYCviNpliSpvsEptiZsZpNsxC3sYs1iIsnCrC0sjptiCCppFiqi0shCkClCDpvpSixCosACEsiCIibp6CAivibsJi0CAiaiZsHi5sHsaCyC8sHsusZipsopJCQp4CjiUCRsfClp2pbs5sCsWshpTsdC4CQi9iYpgCJiGpYs9s9s3issasoi6ptCxispnpei7p8s2CasoCHsyiHsPpgCVCXC4CPCsCziaswCeCUCnposEiAihiGCvpRiYpppRiDpdpvsxiFpgpUpfCxsrsRpjpiCGCsinsksWCApFsvi4pxsqiyzsiLsupRCPCbpviYCfpos4sqCgsVCkpcCvsTpNirzJikChCHpiCHi7iRi9CCC6iiini3swpdiCCZCxpcssiNpksJCOsfibsJiipQsDs9sei5iwiMsTppiQszsJpzpvsJpgCGCJCxpoCgpxCYi6sVicpTpkpECLiqCXCgiEsBC1iPpZsVizpYplpwpHs5ieCtpYsLpDCeCeiMstp6C2ibp7CGsGCSiPCUiri3pEpSisCPzssfp9pGsFsXpop4p9CPiLiBiFshpapjihCishpEsrCXC4sJi4CIpUslCxpui4pjiviVsNCyC1ptiAsvsHsiiyziimpYCWiapusrpEswp8s7issgsBpwscCrzyCWiViHsrsSpNCLiPCdi9iXpeCCs2sZpAiai9isCcsvCQs0CWp9i8sipEs1itstC7CECgCkivstsopXpssepZCiphi3irsKiqiwp3pQCQi9imCOssiwpG",4440));
    CAIChatRouter.prototype["onWorkspace"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CAIChatRouter.js","CwCrsbi0iYsTp9sIChsxiupvCKs9irCgpTC0C4s2pHiAsYpeiXi6sjCepKCNpriMCosasGivpxiaCgippSCECOziCfpIpkpwsusbi4pYC1CDpsizC1pspbCHCOCUpHpKCriIigiNixiOCRsWsKsfiWsbssiPCXi5pbCKp7zCCsCKCQsdpCizs0saCyscsYsDspCHp8ioiYipiqiOCriNsCszpEpNCys9sOCYsOslsFiSCximi8ptpFsMCvCniECTpTslprpuigi9pzzpiFC2iZsjshsni5iPpFpdiNiaiPsAi0s0CrCWiai5sfscpvirCismsSpRioiIshiTpcsEsridCdi5peigCui9ixCQCcCxicCLiAsNCViFi8sAChpeiPsBi4prsSsUsQsWpfpOs6iLC7ijCbCvpZiSi0iRiMCfipCui7ikC8C0pwiUCypvsZsNpSp8CcCjiciQsiC8CHpesosOzipesGpNCuiXCLp0iIsdsOsxiMCcCKizzzp1CQslpwCdp1iSiJCqpRicp3iIC3sUsMibCAClikskpqp9suzDi1zsCgi6C5sLi2pBsWispQiFCcsICfpZsUikiIpDzzifCZsnCIsfCDC0zJsxibCIicptCCClCEpusIpFptCli3iJswiGp8CWilptpbprs9ibpIi6idzDpnsXisziCAi4pEp0sciwpLpnsKsLpniTCQsmptCrCbCQCCiZiQs6s5pvsUiqpeCusSCOp6sGpjiXiJpsCSpazCiIpHi0impysrp2CMpBiFsYiaC8p0posZpusPpvCFieCtsHCli9ijppszsICjiYiaCtpJC5puCcCrCVCep2ssCPsssqirirpmsBsuCUsSzppFsnC7ixiVpJpDpPCepLsoiQivp8Cts8s2pLiECyiiC4pUsyCYzyCwpCpMsYCfpipzsJCFiyCVp0sZptsfiQpdChipiBpliFprsnpGiPpls0C8CVsnCAilpmiBpgCupopspBpuCFsspOsTp4CFpMi3COispKp6ikCAiXC8zssCiQpSiXpezJs8iQCLs4CXpaCDpyCDC2sNsri3sepXi0CtsesSsmifCPCusaiUpQCuzDpRCYCBCoCppoCii3pnzyCus2sECypXsCirzsimC3ikssCGs2inssCTsXCapWpcpas2CGC9CtsnsgsRCDswi0pOsgskC6sPCCivpasaiPsqiys2sGiZsupvCiCPpgCACbiriqijiQirsQCFpuCQitC9CcCrsDsGzipMpWsZCIiHizs9ilC6psi1sNsFCazisLpBs0CDsAsWCEiTiVCypvCwsFsbpMC7ihi8sJCRiqi4iHpTiJC3slpjsrpdpwpzCPpNpWpksjpMpdp5CssEsXCQCDiqpziPiACDpzCGiaCACuiZsas5stimzsiksPp8sMCgpgsiiNpFiYCNp7CwinCiC0skivpoCypKsapoiVi2pHiOiyptsZpOiCipiTp4pQsqidsgiPsiCopxCbpOsRCGitiksUCLCvsRpGCcCii1plsui3p7pyseiep5pisSsapBswpSpvi9sosSiOiACysysGsup2p9ikp6ifsEppCdpDsHsrpjicCtifpbiQiLpKp7C4p5pwsJpHpysVs3zzC6sbsys4CpCeC8CGCNsQp5p7CHpxpniezDCYsCphiHsPCUpQswsIiDCAidsCscsxsHsGsGsriwpQsXzCCYioiypSCmsBCZpjsfiLsCiECuiXp8stpjsPsFp0C3ptpHiCp6s0ppsjCMs0sIp0sHpdpeizixiCiLidCUCTCvCECRsDsvimihCKi9i8sjCBCMswpupKixCbi8C7iasPpKi9sssIC1i0CMiAiwskirsxiFsUsRCzsgisCAsLsqi8pxCcp3iYp0Cgs1iuigidCKiPsVsniHCzpPsNiTigiri0CDChipi1pWCjCxCwpxp6i3sdCnzziusUCMsgzsi7iWClpjCks3iHpfpBzDsOp7ssp9CLioiopspesxC1sECus4CnsZpoCgCRpks2CpCWCvsTsiCxCns0CMpuiosFzysdCWiDiEiICriPpiioCTpjpwCDCxiniViOiuCAs3pRsMihpfiWCWs1pyi9s3pliVpYsYizCLiWiXitsqzCpnCTsPsQi1CKCVpECyidi1zCCRsxpCpGs3CZpUiyplC3pwCuCZpGpWsBsLsbzyCWC1sOpls4ixilifi9isiKpoiQsypNpopLi9s0CxCwsyp8CCCis7s0zyiOiEsisWCqpqiPifi9iNsuCSihpRpmiAC0pPiWCRsGCxplCdpBiwiVpcsss0sWppili7pKCBpwCqpOi6pzsKpriMsgsZsViesFijpRi4C4ios7sypJipCLpfiJsBCQiKCqCXiMpOpRCcssCfpaiBsAsbCqCmpzC4i3CxigzssUsNsvi1pVCFiriasSszCEC6Cnpci3sUC5pGsDplivsuCAzCsJCTsnsgpFs9CBCbCppWpYsUsZCfphpMCFirpIsBCeswpPpaswpasNCuCEpFCPChiUstpoiZsTp6sjp4sDsTsTi3CosIiusxsZiVsXiQp3CkiUsRC2iZCRpszpzyspsfzipwsficsPiciyikCYsai4zJsBphsVsesGpLi0pcCOiUpysICrieprCrsfCZsTpCsMpspCsDCHsypaCGiNiQCIi2zDs9pLsGplpNppsViBCMsqpIiqCWpfslCvpjinswiZC7iMpnCHipzJiazypxCQsgsZsQpfsYpfpJC1sFiGpNsyprCmzCpVpNCAs3CfpYpAC3ijsAp2CSpvsuiSCksLCmiDijiuCNsyCjsUiUiYpuCni8CrCksFCSpti0C6paiYCPirigs0s3pKppsSpnpqCciJpFCescsypUpNiGiHpoppsKsjCupNpFssCOCQCBzDCKp2pcsxp6izp0pupdi4pgCyi2iPi5CvpIzzsjCqsWC2C5p1ziCNsfs3pwscCNssCHpUp3iosYikiVpuClCwsVpAiwstCyiEi8CKCZsQiDiVCKCusviApwC2sViRzysisPsOpapAias2sssNsxiFsEsQs6prigsssNiNC9zziJswpspBCdsACXC5pSifsaihpgsFCwstzysmipsQpmC5s9p3CQpisnpesPiYsqp3zyseCsCSsciDpXsMCQshsEpviBiPiVpqCciBsGChp1C2sICaiAsAsaisp4ssCSsVsWsoCYs2sCipsfpwsapUzJi2pVsniTCKibpHpLCEiTp3ptpbi7CKptinixpPp9iWi9iapezJizpqpaCOi2sOiIiGpvzDpbiQC1i5iUsupNpjpjpxCFpMCPClCcpqicCaiBCbzspvCXsqCnsnsepVstCqscCYCuieikCEzyiOCyCBsMp7ptiJsLpBpAC1iLpDiyi5iqCtCdsyC1s6s5CUi2sOpEsYpfsvpuCoC1slCdCPi3iMiYsficispKpOpvsBsyCsCCi1sMs9icCFCxiApjpQiSCKzyCNiwCJCqiki9Cbp8s0sdsqCPiSCxpoCPCaizsuzizzp6CIiqpdCipvplsbpVsxpopYsisZpBpSpmstCrCSiXCoC2CVpvs0pdsNiKsIitCVsQijizCTpgios0CfiDCHibp3sCiJswCHCPsNidiSC4iWziiRpozyCBsBiEp6pOi2pjCFsCpACjsOsCisihCNprsHC7CUsUCUiwChCnCeCap9igsKpfi8i8i0pTC8C6p3pLCOpZsGiNpCziiQChikCkpisBsLCszippswsUiUsFilp4sppUpipsiBzJpkCIpCsjphs5CKpWCKCUChiNsWsesRCYiViEiJzCCpCopOpSiEpAspiViqsUCep6CoCvC1pWpPpUsUpACHi4pyiTiYsRiPpXi2skCJCzpyi4iYpwCWi4s9pbiHsEsDpIiPiki5pzitpGi2sEplC0CeCAiACPCgshCHzyCozzs8sXC7CHiepvpeC3iJCvizpJijsoC1soCcCtinzpiRivCJssCjsRsFi0iWsuizCisQpQi5i5pxssCMsyC2pNsVCPsPiTiiimCVCqpRCvsYpNs0CCprsOpLpos9s6sHC4CEChs6C1iosmCMiosUprs1CIChsQCvzyiWCKCLi8p6phsIpLzsicpVsaipitsDiciKiApAiiCKCzicspiACis6imsCpbi1pEi6suiWCqC9i5pop4iwiCCni7pzCGpji5ppzJpPCGzii7C4pQpeiZiKpoCzCzi4s8pTiep5ipptCwp3ptCQsDiGphsYziiEsdsriepds2susUCrC1s8pjCTpVsTpoimsuzCswCSsApnpEpFsnskprifsGCaCmp2CNp2sfiAC4CissiUsQpKsfibskiaCHsViusJsysMplsesUiRp5sTicCtsysTsyi9saswilpNpJpDCNsuiyCOiipPpJscpNswCjC1pqikCSzysmilp3pbiGiEpGpFi1pbiws4pjprs6CKCDCyCeikCzCopDiUsApzC1sOpyiPiRpbs5CDiJCti1sBi4CYCCidpeCbivCsCczyCDiusiswCKsbpPi5pMpwCBCis2iciVsPsDiXCaCTpdzyC4iriBCEiTiVC2CDC5CeCTsSC1iKiGCCiasHCRsXiLiuipsBimpRsZCNsapciVsHCepFiAzpC5sjsysAppiYCmCHpRCRiRCdp1stsvs1i8sTCfCezzzJC1pfCZiRC9shsGsnilsligsnpSCPpLsSpvsOi2ihsLsYikipsWsmsozypCs3ipiCieidpZslpYCtiHifphCopnp5pHpbCliRpCpBiMC0pZpEsTsUiizCslsIpFsJscsWsrs2zpC2CoCns6iwiWiHsvpAiXiHCXCsi2s4zJprpSsPiipopysjibCspRizzpCLs4sWsVpNiTidpSibC1iksnpviBsxpqpEiqp9iaiCivCJiGsLsLi1iIpGptiWpasOCRsUizCPsLCjsGsyzJiKCfshsMzDCniEsQiJpxiIiupbiTsziCs5CVs4pnpRiRpyCXzsp8igiAC2sViACEpziopAsWssC1pdpAi1iuigCaiUpCs0sjsApACUsEioCTCUpqCepyiFi4CIiii0pOiTCisAzipsiFCtiTCYiLCrsAzspqsli0pJCWimpuCTsvsKiniJs1snsJCNClpysbCisHimpBp9sysdiEpazDCOiqpYs7CTi7iTCjiOC8pMzzCfsBsApYpXiqiAscpIsqsni6ijiLsGisswiPzpsQCMzzsEiwsopDitpW",7766));
    CAIChatRouter.prototype["onChat"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CAIChatRouter.js","iji4CTigpCpns1iSCysIiZinpzsNzzs4CDCSiWiYizC0iUp4CosHCxCZCvixsXpoifpnC8p9Clp6iTCKiPpozzCZiEsnpNiVp7iliXiNphs5sDsWstpPpICepDiFiZCkCjspssCoCAp9iIi6CDi4spiPsnCPsNpYCZpSiCsjihpZs0pFCoi6igsmpysJpupuitsgi8ClCJpBiRsypMsFi2zsspCVsHiZseixCwzisesziUiFiapVsMsOiIizsjCaswiupECwsGi2sBiqsfCxiCpUCBpFp7pUpECEpViJpHpqs0sXC9iFCICtCGpJsFpTiUiEsHsGC6Cppai2pcsoCqCXphsXChpHsmpGpAivibissDspCoiasPCaiQilCFC5s5CjsQsfiPp6iEpTCvsuCapTpjpbzzCeiepBCVsJCDCisniwpmCSCKpwp0pXpMp7iBpPsOsaCDiesRiXsBpAiBpSsnCDitsTsrC7i6swicpXiAs3zzCxCUzzp4CqC6CuifiLpUiZsGpsimpaiwpBCICligiQCoidp7ifpfp2C7pjCjCvC6sVCICbi5pnpqiMposQpCspiEC0i9CRiFipC3sJpDCjsGCCpDiTCVpSsts3CCCzpypGiti7pXiKi7pbCBijC9sYsPC0zJs9CMsopysaCTCYCQCDpUsiCVsXiepXpVsCs0iSspihCLsusSpVp9CXicsCiSsFp7phpWpsCniqCBitzCC1sCs1CaiMCPsJseCfsICspIsJpOpSiYscCSs6CVCUs5CjizCjpJsmivCgi8pDiXilpJCQpXswiHCIpNsyCksspFp6poigpRsRiVsmiqCWidsYi0imC1iZC0s0iLpXs2pnpiipsHsTsvCBCms9pWCLpgisijpaiUCSpSCescssCzpzi6zipYsApfsbpkzii1pUCIC5sgC4C6skiep8ivp3p5pBiiidCuCZsLihCtsNsipIiwidiPpMsgpCpIsJsQs9zypGs7iSiOCKpipwpCCbCFi5zssUs8pTseCVsViusKiSC1seiDpwiUi3ssCmCksss7C8CkpeidsEC5iWsbiMikCRijCvCgpmCBpRCrpniXpnCQCqsACVpRCqCUsOs8s2ssiTpupiCepXpdpniJiEsasXCjpisbp4s1iVpus3i6iqCFp7CiCDplCTstseC7ziCvCAipsGCbsQslsMC8s8idCTCOCmpmCGCazyCEihChpJsiiTsssTsWCuC8CApZCmsaiwi2CNiwp8sMCCs1pmsWshpMs4sCsYCJCei2sfCoCFC5sDCOCepFsds8CZspsoiHpNC1iXpOsqpVp8pqivsxCzs0CasVs5pJpICGpxigpMpWzsCPCtiPspiNiws5ihpapCCNspCPziCFCusCigpeCFCfpiptCwC8p1iaC7pYCfCUiCpRiDzDCciVi8CtCzsXs6CaiKiipAp6p7CvCUiJiJpQslC4CYCvCkpTiIsapjCzClpfCws7szCwzpCQpcs3iIs0p0spsrC7pasdsHpFiHivpnC8CSC9CwivCKs6CbplsiCdpApOigCriGpSp9CliOCEiXCoiRpUCZCzpTp1pnsKigsHpBsLpcp3i1CppBC8ClshsesRpNiMsDCrCeiUpqsgi5smCPCiCEs6spi9sEpLsyp1snpAsyCHCUp0ssiyCozzCECQpwzyiKpGCSzisRsmswiriDCDicC8pYiciSpapKCvpJpoCwsopIprpksDiCstCOp1srCkiui8s2swp4ixpxiECwsUi9iiCtitpBiKi6CnpNp7C9smCAsfpGCsC8pIzisSsyp9pWCnpsshp3C1CKzJippXsEisCKCPCUpgstC9iEC0siCdCTCLiVpAirpMiBp3ClCkp9spCVsusxsipZixCpiusYi9pazyslsCpzCWCGpWCnsfp0pzCBiXiWihsOCWCyiMimCriNpBCTivsRzyCzsVsoCfiTCZClpMiTiJpmCNiWCspniLi0iPCGihCiiqp3CTCXC5snCMsjCJsTiepJstsrpGsZzCiciuifCNpFs3p7pKsLs4iZinsIsBsVpNipzsCri0CRsvi6CusTi7C9CPpxstsoispuippjiOpFpksWCuCXsKC3CiCgpWiUiKi5iqCxCqpyiUs0pCpPpwsGsJCyilCjiNCNzzpJsCsfs4pYpOCXsCCKispSsFCJsNijiFp3iTs2p9i8CsioC2C8CfsSpaCgCBpesyilptiBiBCTCbixp1iTCUCPsvpkplinpzinifCXCbppiwCCCbsQigiPCsigC5pNpvCDC9sTpTibsWi4paiIzDCfsDiNppinp1s8i4spstC0CYp9CKi3sDpziopusTsJiPiKptsvsICBiWCtiEpXp6psCCpAiipdsOsOsaCgC8CUCQsLioiqsKp0CTC3sSskiQs5sIpwsVCsCZpRCLpCCYCfsopQi9p4ifsXCXstpeCpsNp9zzipiJCTp0p8pGsFi3pxiNiQsmpTp7ioi5iSC4pop3CbsKpSCRCesuC0p8pMsTpGCYigCLiBp8iWp6ifi7ijpYswsICPpJsACOCYiSiYCzpCCWsTsapqpVCnpVCSiUi4pjioCCiRpLChpOzDC1C8icsSpZpBi7sWsZChzJs1pTiYsJihpKsxCECKivsxC3s8pMCvifs5issSC1p5pBsDpCCMCKpfpspMCeCFpis9sKC6pzpmzJCXiNCtpbiIseiliYssiWsoCAiSCnpRpfCUpXi0ziCSiMpdi8s8sdinCKpJiuieziCWiVC4irC2ihslsPpqCWpQi7CLCUpksNp0sSiGiRC5sPiPp9sviZi1CIzyiRi9sSsdCACeCsCppYCvshi4i4CUpEiUCkiwsiifiAzJCJCiptpFCmpTsxpdiksSCDprsjpVsyCLiMpspsC8i5CBiFCxCniupTs3p1s0puCxs6iCs1ilsFCUi4p1s4zsiUCqCDs7pOC8CHicsKszCPp3pHsPCJinpACTCWsupnpPpsiKswCJpqieizsOCYshCEp8iusnCvsAiJsnsNpniIsQsvpsC1zCiUCVptpuiap4iyifiHCMicCIsLCpiICLsosMCisCsNCHsozDpCsZCeplpHsBsBims3sRiUpvpzpBs2pjippNiLsZikCXiNitCvskpisKCZsYp9iMi8ppsRiisriPpxsNCps2p1sqsaski9papJiJCTpNpKpcpCpci9zpiniEsystCusxpcCep3CziHp8siCPixCACXCxp5stsoibpoCfC0szsepEpKpGC6sHCPCECwsEpnp5CDsqC8stiwispSClCaioC1sDpwi9i5ibp6pWpYsXpXCqsnCPCfpUCsCfslChiXi5sFiSsRCpi9szsEsEiziupCCbpfzJibCWC3ilpnssilC5s0sxp3sopaChsqCniQp0CkCis8pxihpusgp1sXiJsCikziCciFs0iqinsVpVsPp8plsSsPpXCACFiYsEpVzCp7C4sJpnpwi4pbs4COigsJsKpnitiCsysssGCQsqiyzypQCACVzziMpaprs1p7iZs8iuCgpRCTstscCsiHppitiEsPpECniMiCsMp1pAiNphi6smplCYiYCip3suCGpGiNiLiaCwpWCTCyzCiAsIsBCgCriZCxpqCoCLpEpOCkCislseiCCFinCzCup5pBCyiPzis4CEi5iiCGsssrphpKiMsXCWshsvC3CGsoswpEpBCLsGpACgCbsriHsHsnprixCTCuCWpbiSp2pwpapJCjprsOpFsIi0iXs0pTCwpiiIposWCFsQijsHCus1CTiJpPs0pksYsYi3sasTscsGCIpwsKs3ippYsSizsKidCcsqsJirpHpICIidiqCkspCzs1shpiCfzCpXpVikiepNs3sdswsGC1C4sDp4spzspIp4CxizpLpGp0CHCZiCsGC5sJiliZp9sECWCWprpVpRiKCvp6pHpAsHsmiQpHsKpQzCChp2sMCQp1pozisYCtzCsJiXpRpVs2pKCBCzpNsVsnzDsMCupFpVsbpEpOsKzCivseCXifsHsNsgpriWsSsUpQp9saCXsxsBiBixpDCqshiXifCTCys6iJC3pUCqCTpcC7i5iFsLs1sEihCwstiriwCnp4smsniyihijsOpQsts7pWsMsFs9i9sUswiOsUiZpmslzpsXiXsLsTpwCtiysZiUpMCPCcCYsBiGCMsIiOCysfCYibpCpsipiUpKikpxzDp5CriesKsvp0pCCSiEpZpSidCYsMisCkpOpLCfsEpppJsfiBCtp1pnpPp7paswieiQCBsEiAscC1ici5zzpAsAsrpBiuiginiZCazDsRCdp0sjsTptzyiICesOiepgsGCCCdpviBsIzJp8scp2p4ppsbiwpLiDi6ieCXCdi9pLCepEptsUiXCHsCitpniLi0pzsACEiKCtCgifpoipsRsRC8CxC4iHspCdpBsSiCsUCYiuC2pmiEsWCIiqsoseChpgi4iKsBpdC6CnpepDiXsWCgpCsGizCBispcsLCyCDsDC8s9pesOplspCKpUprCWsJCYiksaCHCVsTssCOiHpUiDsrCWsgzzpnpfiBi3CvzpizCTi5pXsYpsCQi8s6izCUzzpXiGplpDCLCQpTipssiVp4ziiVirp8p5iJpSCJCWiCimi2iDCYpZCCpGimsWC1sUCSsCCZCJihsdiOCapRCrsjitsmi3sNiFs7s9CdC4stzzzCiGzCs3s5sip9iiptCPp8ClsJi2CEsoifs0i3Cti0sppnsdsLCPsPiksViuipChCmpkC1CdCUihCWsvpGp0igs2CFppCAzssfCUpvinsQpVC9CbC9CVzCsapApEspibCWiZC0srs3pSi7CXscirsGsWCviHiTCainCwsGsaiJC4pmpSpWiDCnpwsFiZC8Cgshs4pyCxibspiuiKi0ivCxs2CusUpYs7szpZsts4CdshiEisCTCasVpnposDCipPpfCusXshp4i1pSspsgpUp6p8s1CMimCBC7pdsGiWpYpRiQsZsfp4CzCZCxsspssdirsXsqpqCPCMpBi6pMC2pwCdCms5iri5sJpZprsYsIsBs7CYiIivzzC9CfpHC6C2ivsFCBiHC5irC8COsAi2CUsksbiairCziGiipzpciMiYiRszC9iViCCppkpApAplCQpJs2sfi6Cqp8CDpciZiGpkCPikC0sepsCVp6i9p0s1sgs1sViqCqpEilsVscCqpVsGi4sbCUC4swprCTili3iHCXCuirpHsvsHisCRCap6iDzCCuiwsOCUp4pTikCfpxiUp2sciti1CKpusHpeC1s3sNiXp5C4ptCbiYphp8CNsjp5CZpBsMpIsqpWplCbitiRsss6iqCOpIC0inpqsLpkCOsoC9pJCTsasqC5sMiTp3zDpJChpzCbsfiECSiSCcsxCQsoi3C9CapksdCWseCCirpii0s4sQsXpXCKpSsgCZsMC2C4pusti7stsRsnsRC3sps7sespCdsrphs0CEsDClCvi6pLsDCziqpXsLscp2CisWC1CfsuCTspC9sMC7sHpdsDsRs0CksTitprinslpbsTikCnC9sDCUsspsCECkiWCHsVsBzpCXsAzysFsICnpBpKCPplCMsIpBiCChCSsziliIsepJsRpLCdCUpaCNijzppfiYsLCCprinCYiBCupBiICPpEpyi4CMp7sQC1iiposipesEpizpC5CSCBC3s4CcpOizsMifs9CbCxiziFsXpACrCzsXsBzCsTiip6Cgi6pQCJCyCiCDCzCsp2ibspCYC6ieprzCCgpVCrpOiNCjpWiYiOsesNsFCCsbpusNiuCmpPsECciApRCkCJiWiRiSp5soCdpYsQCYsfiGsHCui3pCpTC3iviPirC4iPisCEpXiKpBC4sAC5svCZC9CFpRiTi0CWCPiCiIzyi2iIs8saCDC6p5C6pGpZiTpMpPCkshi5pYpEC1piiOzppUs9iwpFs8imiZiEiKpuiVCqpHpIiLsBisiFsmCkiriHpIsDCYCGCGpVzCCTCrC9pYCWiDsbimCSi9zyCepDslCtisCfpxs2sKiniUi7ihzsiSippOC1sPzysUiOidzssdpApziPiGicsxsWpfpJCYssifiwsJCdpki3sSimCqsSiFiUpkiFiQCiiJsPClC2icpfC7pEC2zipeiHCSsfiaCcCqpqi7CYi9plzsiCp0i8ivCQCvCMikiuCRC2C5pdiDixCbCtsfpZsesmiJptsRi6igigCwpLs5psiQi8zypupSiLpDizpUspszCSiypep1iFi0s7i8CdiFsUC2pCpsCwChp7sHsCi4p9i7pjsCsjp8CqixiEprpfCdiGCopCp5sviCsXssCPssCtpCpRs5skCLiHpIiSikC6pDslCysOsxsHCnpkstC9pJsiidiHChzipSpZC6spsqsNsYiIi1iopeCOCozzpvpXsNCfsvidiNsCpNCnsesbskpFCKsViNi5p8i8pYzyCXp2CCCsidpZpvC5s0CqC2i9iPpdpGCTshsui7sHCesGiEibiEClCvzsiWsOCqsnsMCYpusVpOp1pRi0pbsTiushpbpRp3pWstiEzCiOzJCNzpiZiPiNpridCnpLp1pPiFpEiNsMiziOCHs9CesiCzi8CcCIs7sCCgpZiosSiICNiCiypdsdsYsJsciMCwsKptp4i6pvCZCVpBiwCOCRsjpNpRsGiisTioixpapcsAsoC6p2i8pqsgCjsCpyiipApIpOCZi9sziDppCapCiiiICUCrC4pDp1iQC6pzCupDCJiDs5pmpsCCCPsiszpzszsyCji0C9CRiwCYisiXs3ifCBi7CtsvzzpFsQp0CxCqiizspmCXsPspiXiNs9igCusFs4CBCriaiziKpxs0pfCfitsHCGiZp6i5CSitiFiwCliupCsns0sxpts1pFCri9sfskpJCkpTC5CosWsvzJitpdpNCcCkCQidiap7CgiOsrpLCqilCHseC6iUiLCCCRpBiwsbinsRCHsYpyCBp6ikiziBCtzCsCCSsHCCCdpNChp3C3pCiECoippqCLzipmsVCHsKCbi5iBCXiqsTpTiHC3slspsgiqi5iSpYp5posnCUprsrzysviHCVptsMsAijiPiEpzCxCxsysCiEiGigpPpZCzsYpLCjirpjCyi3iPikCspNpbClsICHpFCziWpxpspbsAiGp3pEp4ips4sQpbs5sMpOp5sTiDpgi0C3iwpeplCiiqsSp4i0sVs5slsis1suiQCSips4p9p6inzyiei2i3CkCbiVs1paCdC7sAsOpbsYsFs7iLpkscs4sICXsazzsdsNi2CyiosoiMClibCQpXsVCUCWsCspspCWi2CtpZpbp3susvCXCgpGi2sQCRCXC5iQsfpjp5sOiaswzsCyskpBsCibClC6iEi0ilC0snCupJpGs7i0irsaCosMCtC6iDicCCiGprp6iAi7CGsiiFicsis2pUpJsbCApMpup8iviSsps2plp0sksosViUp6zCpCikpCCRpkscsupViZC0susSpdphiWpIpQsaigiUpJCyCwp1zJpssHpkp0prC5sds2sUp9CDsCsNsosyp9ziiAC4sgiaCqsyCAsjCSiisjieiFskiZCSChitsWCHsqpLivzzs1s8C4isiQi0CwsZCYpACUC9C4poCasKCIsJCKC2CUpGiGsgpEi2sICsCji7pypLiXC7pqCnsVpNCWzip0ixpECoins1sYs3sti4i7stivihsPsLpLiTiOsqiBi2pVzppPiHi6iJCZCbpbp3sHCWsPsDCPslpICnCJpWiYzysnswC1CYi6plCwzpp6sRCSivpgCOpqCMseCsi5sKpepTiwsnCfpzC6itpTiaCGpApYsHsnpCiSsMpcsmCKshifsUsupHCKiyCms5s2iYCXCzCeCaCls0sbpliMiQisptsKibiHsYi2s4szpZC5Css3spiNiQCPixi8sXpeiiC2iVpWsaCTCSswiHsNzisupjC3ClpOiqpviuplsjpHpPsDCupdC5CYs0ppCFpWpQCfppiWCDspCkCSzzpbsgCBpMpKCaiLpIpPpqp1smiYiriiCksciqp6ijs0sLsrsRiMpgCspBscpMsJseijpCpXieioCzsFpTzCphi8pipaCHigssCUCZzJp0i4ivscCCslsbi1C4pssCCysUidiCs9iKiPzpp2sks8iYC1ics6sKsQsfiACYsDpqiri3C9CcigsppfC9pWiai3Czsaiji3pzCYChsJiTpOs5CBilpDsgCJCTpJCsC6CbsEi0p0CNs2sZp6i6sECYsBsusKCJiQCKCqpFCmpGpIs9pGppiBsSprCMCECAs3pKilsLitpfCFiDpOi9s9pMpIigigCppeCziHicpKsTpBCOCQsms7iACkiPscs6pOCvivizposNpUi8ivsSpGpnsBsjCHCFiEsPsFsBCDiJCYpnpDp3sdslsviCs4iYsuiSiapBCLsFp2peCzsviiCNpgCeiEiVCppyiZCpiSzzs5sapYpqCysBpyCApBpppLCws5CKsiisiNs3ihigiKCgsBCECEsGiGCdzppwsdpAsgsdp3pRixiFpKsxiAsIpGscpzpUpcswiAsossiTiJpopfimpgCUs0sTi8s0iFzzifCMptijsJibsLpziRCZiYiri1soCACtCnCIsepIitpZpsCeCnp1szi6CzizCNprp3iTCYi3pYpPsQpVpriLiTCmsViIsssrCYCjsZpJi4i7pAiMscpqirs7sdCksfpYzysOCfiHi4iGpHiSs4sJCAixsPpPCuCdpnpqiLpKCQsVisChiWiBi9pXCys7ChsKsyCZp4C2pLCepfp2Cdpvp1iNsrpFiriHCgCPiMpQi0iPiSibCKi5pAiQsCptCCC9s6shsipBzzi2sUs2iHpHiAp0pNi7pRCas6iwCSCSiFzCzDpECbi5iipMpiC2ivp5CniWCMsqiyCsCdzJChsap5Chi1ClswCHposasbscCnpeifsPsyCSi3sYC2pQpwsZpksSzip3C7Cms2CupxsBpepWCtChppsSi4i8ChCDsPissxi2sWCppEC0CZs7sysqivpWi0sDCppCp8iGCLpEp2pLp7ziiYioClpBCipCsAzipapbsDpYpop4iHs8CDC7zsi0CtijpeidiRCxpEC1pxCTshC9ippqzziZCACsCECqsLi7pIsxs3pxC3sVsasei5CisjpQsoCHpnpHs7pdCGswCAphiHsqCsC3p8p5sbpvCPCOCfphCgC9CkpEidpEi4p2iRiUsxC8phscsCpJiTshCkimibC9s2ClsVCusMCezJp1s0sKpNi5pTCpiLCepuiRitspiXC7ppssCppApKpOiBijiYCsstsRikCQiHpOs2sds5sTi3i3sapCsKiZpUsnCNzpsai0iyphpHC4irs6pgikpdpfi2ifpAs4ixiFidiVphi5shsniwpfCkiQsGsDzCCrsmi4iSimzDsyCsiwphp4pLsLp2sQpuCRCfsViQprCyiFpOiZCcpFpqiYi9sIsapEs3C7iCpJs6iKpMiFsvCap0p2pdiPpQp8ijshiIpwsZpmspCCsQsWpxpaiXsdCriPiLClpki4CCiQp9itpYpiCrs4igsfpiCPCRziskpCC8pLigpezzigCfsxp1s5CWCFifp0CZsBCMiEiRswpKiTimiECZsZijpbpkpdpiimiYCUi7smsuCtsZzJsxshsYpBiisssbiisosbsNCUpsiisPiop5i7CzpQCRpKs9sWsdi3szpCsuszphp6COiRixpCpXswCUpspzsIsTivsei1pNCXsvpJiJCGi3sKCiCcpPCizspLszCQCDiFzJCnCvs7pjpSCAizCYChpFibChiCpOCECzsOprszpFpRpopCiMpFispUpCCRp0CypACes8Cbp0CKs7ispop5C3iWC5C3ChC4srCJCvs6CaiCCup2s6igs4pqpQs0sgs2ixCiiHpqC0sUiDswi3CZiXCAzzCri3C9sli2pRCCp3pii3sPi4sXCasosNs4ihiiptpPsSsHpTCmpHpfpepKimCAC8inCVp1sriUiVigpnpmCasvsvp3iKpls6CRCKpvCIpiC3i5pPihpNCMpGiXpqpkicC9zyiVCmCliozpi1s5idsRsOpWitsbCosgCCi2CgiqCxC4pHsisDsfpZC6ClCqpspOCdzsiTsdixsyisspCWCTiTpJi3inpNCLiBsTiHChs4zCiLsciDpDCHszsnsJsZCvs0s7CGCEskpDs0sMCXsPzpCRiPsopspdCKCLpXs2s5pFsypMihpHsUpspxpvpRpkCCCDCWpdiEsCpzsVC6CmpCpHC6sgpPsaiPs9Cus4s9CWCopnsnsGp8pvpyC3iqs4snppCapxplCDCUirCQs7Cusui2iuCXCosLiTsWCss0sli0sECspgCcpKsMiIpIiaCYCsiApfpDsAsDiVskpjCostCOpEzss2ili2psCfCzCmiMCACVCupgCFi7itphp7CTpfCipVp4pLi9sQCOirp6prp5pRi4ppp4s1p4s1ioigsipyCkp8CmpTscpQsXpNppCXC8C7sXsZsyCsC2s1COpEiyCbCtpypdipsKCCpAsbCNi6sXigs8psi2C9CmiLCypqi4C4p3pisHpWici6CBiRsdsKCNCCpesPCBCviwCUsHiBCjstsEsgiSCdzpi9pCpQpgC7CgCIsWpAiyiWpRiSimivpBiDsjiQCopFiGCqiPs7idiSCPpyCOCTi4pOsdpCsTsHpcphiEiYsaptpzCssbC2ioiosBiQpfCkixpcCgCCimsdsHsjsdpZCPsrsUp7CypyCxCksoiGpfpZiSsOswpsiGips4ptsHpRikp1sKsnCPiApJpHiIiMpSi5sSCzs6iXCbsvpppYClpqC5sZpRizifsxsfp4igpJCliOpLsNixC7zJCgpSCfsOsNzCiJigpMCpiECgsqpGpXCfibpbpqsviqCaixChiLCLiJsrCWC2sOsepUpbCwpbsaCwi8CCicCtCciqChiPp9stCKpNiOslCmi3sTs7s1pgiTiNsCi1peC1i5i6p8pPifp6pGsvCEsAipCrC8snpEsJpnsIiGCcsnsfpKpBsapgimpIClsOp6sFi2pUpcCvCii0pTsBshsMs8CrClixpIiNsFpjiWs5iAifCVpLCkzsscCbidsIsiChiTsQpECfsIirpDs3ics8CwsspriVCUsIsvsKClpazzpFsxsFsDsks9CFs0sBiEiYsQCniKiPCiCBi2s7CMslsviFCVpKsuphCnsIpNiKp0iDC5iGidpessptpRpJCcivsGsDCKi9pxshCYsFi1sTitzizsiOCAipsYplscCWswCwCqpBCGC4smsKp1sop6iNiSszC7ips5pHpNCfC2iQpwCGp3saiz",10405));
    CAIChatRouter.prototype["_connectImpl"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CAIChatRouter.js","CpCGCcCCivpwCvilizCbpIixpNsnCBiqCusVp9CuiDiIzspFpMispZCNCUCipciPiKpvCMiUpmpPiSCxpHiSC6C1sLCUs4pXsApZiXiYzsidCBsoi1zCsqiaitsICssliepICipupmpSpji2C0ibCFpWp3pZiNsEsKidiqpHCupbpjp4CdCkziCxpIiGpxpGpjipiRpViJzzi9pvpFCtslCLpOsvilsGCNs4zJzysosbsJsJiSiJpdsqiIpCCKi3i8sUs6CcsrC1iFC9sUCVs8C6sjiWsIsrCisNsJitsFids8sDpHsEpFpQzspVseCzCviOzDCbpEpCC9iyspiApqCFiSC5C2iwpzCapBCHpSsKCGiZCrstsIiBp3sliOCuijCjpkpSC7igsBi3s3C0CszJiapViXsjCpCmCqplsUijs9CXpYsjsYpNpUsgCCpQpypOi4iACRs5irCziFpRCuiKiZCyiQiJsliKCPidpMCVp9pZiEiDpMCYsLsYiSi4iLpBCMiaCHsKziCLC7CCCQCECOiqC5stiOzDsVikC7pFsKi5CUCQi7sfi3C7ibC9CKirCgp4slpjiYiGs9iIp8sUsEpXCJCipZiupYslshpQiLp4s5CQseC6CusesusVp0iPspiRiwi0iOCWC5CRskCFCssiiksVp4iKziCwpjCziisxs0p3icsnpqCRCwCOC7s3CdCjzzCVCAiCpQizzzpsimsJiustsJsuszi5sNpiphp1pmCUpUs0sJChi9CTiYCisDiGsQCasypyCQphCHCeCkp4s9iWs3COsfswijsWsMizpAsLskp1pyzsipp2CsiNs0pECXCBCEp6C0pCCisICfCMp4sZCap1sGi1sApIpLicirigziiriRi1s8iRCwp4spCUsqCXiwzCi7Ces5Crpwizpoiep6i7zJpkiRiizyphCxC6p7sHiDiZCUs3iRpzpjiyCrpFCvsYCqiEs3sKzyiGi8itiPzJC9sfzDCeiqpMicpppVpzpdpMiOiGi5iYp4iWpOp0iBihiRiwsBCNpfirs8p0ibpkiKsZCGswi3sFCqCkpWCwsjCqpWiRsYCqpiiwCTiNsNs5CNpqi0iJCrsup7CIsbsUClpKiZiJzysypxCyseCCsSpXsYiXsAizzDphiuiHCysyi1ieimChpHpniIsAsRCKigiYsSskzzp9sWsGsJsLCKi6pQscpviuseiiC1sMsdpYCOsdiQCBpTplCbpTpUpDiCpWiGCOCnpfCTCgpAiqsgsipkiLpasaiGCfispDpyCLsSprioiHpssqiApsissXpSiGpWC4iUp7C9pHCvpLsRpVCBpHiVieiJptzCpDCzs8CbiBsjsRidpfi5iNizpMzDsrCwCHsbs5sSsLippfpvi2zpCRioCPpvsBpesFsNpCzpzysFCHC3ijsmsxzDC2iDpECMpXiaCnsLsYCspfsfCgCJzCCGpopmiYiCskCip6phCTC1irispbsbpdp5pwsBCwsViqCMsHpmsoppiICNCjCiixsaCGCLiEiBstsoshCesOp6C3C8COi7ChzDiTCKCcsACjskCqiDixzDsACzstscpLiFpFixpbpLirp4sDCOifp2sXCoiFsjpYpdsCpHsaCXpqiaClp0iLiCCoi0CgpnpaimiKsniTpFitiJiSC1CJCbsYpDpxCOswpxpnCCiSsnp4imiLissrsxsdsczDCrpdszChsksHC7ziCzCMiiCtpbsZp1soCnsnscsfpKs2snsniJiNiHCGsFpbsvC5CCCQpApti3CHphCipyChpnChi6smsRCBpGsLsSiosNiOCwsLsKCYsZpoiqClpMCwidiMCLifC4inp0s0CGiLiyCApqCOsepWidphCUCWi2sapmilsAsEpkiIC9C5pUCRpBCZCqzii8pMCxC8CaCRpEC3iLsfpCpZCzi2swpRCQivsMp1p7zziwCyCypCiTp9iPieCZsyp5irzppcihsZswiZsti9its1p7sGpQs0CHsIp1pepdiNpiC9ini5pNCmsPCfiOpFsXsFiUiksoCdCnswsmslsWi7pLiZsziLCGiyiGpgidCGpes5i5s0Clinp0CPs8iSCZsHCapupHidpjpqs8iHzisJCFCuziCvi1iPiZi9zistizpCs3pbiisnsSimpmp8sNC6ifzzpjiBpvzJski5pgsTpvsestsnptCbCVpYiHsCspssCJpTCfCyCYCmsrseCWiHCGsciHCniRiHsnClp9sms9pBiXzDsiCWpuiNispGCgpQphiMp3CZp8s4pJCpzJp3CVsJpppPirsNCYpgspChpEiapIC4pgiZizstsepyCQCGitCcpfpOCgsmCEiGC1CppMsvpFCgiqCIpiipshiLpFziikCFsoiSsFiIstpxsIsFCUC9sip9pVpGCaCIiAiTinsHCizysICBCgCep1CEimCqp4pvp0igigpdi4CYijpDskptpBCfi5CTpFiZCZsmC0pYiQCjs9ssiEpaC6iyspiYp7pqitpAsusTioCbifCXsVsKiiiLpzs0CSpJpfCGC4psifphsqCIiVsbsfsuiupippzpC4srC3iZsJigsbCipFCpCtinCEp6sJpOiEpuC7iJiLCbCasCswspCBioCKsfpdCzsNs4sPpYsyiIstsBihCdi6pGswi8s0iesVpEsEszC8ipiAzspkpKCHs1iii7CFiAsWzJCns5pnpsiWzDs0sopXiasMC2peCQi5pZiQiiiasniFifs4sgCwiPpLCtsmp9s6C6s9sjiksRpiiMClsVCbCosGibCfC6iICKCis2iWsRzypsCrpdiHs2i5pXinsrsNs3s4i1ixzDilsnCDp4C3sBpziCsspxCpsUzssrsfihszCDCKpyCmphCWCsC1stsypnC4Czi6C6sWsIpfi1CzsfiBsGpcCUstsVCtpepHsls5C3pCsFsepuCZphCHsHikilsQsKpxCpslpsCppJsapmpEpti2C9iBpzCFsvCxCmsyCWiTCWiFpwijzziTihCNCRpoClitCusssUClpdplCOp9zJCVp2imC3pcsXswsDCqp3p4sSs0CZpKCti4Cds9CUiUCGifiIsXi1pMiwClzsC1CviipPp9iBCCszsNsgiKpSpsiEsUsUClpxzCsZslp7sXCIiRsti6pRCOiaCwziCHskptsAsVsWiOzDsyzzpKiMiTsoiKpEiSCWiipxswpPi9p1pTiPirslCrsQsCihClCHiPp0CusXCWpNsdsZpbifsBpAikzCpsiGiMsTCOsvshiWpgiWCCpypSifsdibCMCps0s5iLpasUCOpeiLs3CQpJiAsppPpqs0CtpliFigsxihpLiECbCmsjimsKp2pdsCpAiSsWiop1ispMpUCqimsGC7pkisiEsmpqCppSspC1iusJsSCtCMC0sgsoihi9C8ioCLs0sjpXpxCdixiTpcCkieiQCXpuiVsopFiuiuC8iFpWCQioCjsepcC6iFpBiNiYsusppZscsapSCPphpvCrsDiACZsoCiCmpszzC7s6CwCrCZiPs9ippSCustCxp9iZCapqCpppp9sxslpozziss3pkp1CHpuCPCUiziiiSihCXi9sdsXp6CdCcCRCLpdCEsZptzDiipgCNsgpPzJsDi6pLpWpnstiIpGsmiriNiPsfpqi2pRp3CDC9sesapCigsqCMpxsKpVi2CgsqCRC2CQp0s5irsKsoiMs4i2s6iRpqswp7slCsp3Cxs7iWpfsOp2syiopIsgsoC5plCczJi4seCMCDCviICGpPp2CyCCCeCgpmsIpDs9pMshpTpSCCiksus8sAiFphpDpoiDCHC0supviSiJCwiWsgpOi4poCIpmiesOppsfsbsvpgC6CMCKpsiKCMCisUpepkizpjp5iupPCyp4CPpvpIitpjC6CeCDsRpZpPiBsEiZsxs4pepysUiOi9ptplpgpNsUiVphCbpPCzssCvs7iGCXCKsLieCbC6pspxsYiji0sLi2snCKsCseiRpDigiKCVspCcpwC9imCmCcsiihsQC7zzs6iQpui7i9ivCUpGpXCLsnCzpwsRCGCLpjsAixsXsNiAici1sVClp3ieiAippWC4pDsMi3iDpOCeiJp1sAsnCZCliVCCswCYsui5pTsti5CkCks1pRiKCTpeiAsysrp3i5prphsJs2iEigi3CQsQsAsApNpiswCKp8sbpSifiTp1CtCeiTsDsNpnCziOCSCQsbi5ixCLpYs6iqCQCBp0s7psimiMpFCZiVCJiFsQpHCspYipsysvpqphi6CziJpPsHpxCYpXpsCNCrCYpDi8sxiypIsWpkiMCQzDi7ifpKCaCniTphibi0CPp1CuCOCCCosJsciui9sbC4s2pvpTsapazsiFibiHCfsrsuptimpVinpHssCqpgiNpbp3iEs5CZi0pmiLi3ijsJCAs4sDCys7CXC1iWsEpcsrszCkCFsCCYiOpCCwCqChsCiFCHCkCviSigsFsgzCiuCIigsQC9pdsUszpwzsilpcpFpfp0sIpFs6p6CEpfpopGCWpxinsAi3CrsUsMsgC6sWpzsUCniSC9pVzpshpipdshi7prCnC9p8CGCaCOsvioiGCKsPscifpjsypTiWCAsrCxiepgCHpYCtp8CQzsCUihiTiiihieCopUphi9CRp0iPsEsvprzsiEpxiMskibi3i6CzsZpeCiiFiWpqstiAsYCfCqssskp0ClCGilC6pbi3C6swiGCZCri3pJCxs3zCpksxsFCapOsiCmsRpJilsbCECZpIsFCWiWpWswCrp0sLp8CKi3pIsVpwCHiPi8ifsQpLpHsRCip2pHzzzys4pLi9CXivpmpOpNi3sopnpAiSiMpdszpjsnCviJCjCNsmCRCZsfspCligsWCDphpms5C6iJiCioiFpHspi8spiki1pwpMirCSpspzi7p7pECTCaiHpbiwi2pWzsChpJikiXsQpwpIsRCQsOphpcsoCApistirCrpmiyzDpNCyssiXCxpzpWiFiUCKsHCypRC4sSCBpmsesRCJihsJpgp4CTCtsPiGCxinppiHitslCYiqpEstsii3i7pTszs8skispvilCNieiXiyp2pGihCzpqszs5CepashChiJpEpdi3p3iqCmsWCjCKp9C0pviFpLCIC7s4pjzzpRpssOpvpDp6ieCPCssmiLsssNCvsRpLiqiTsOsKi2sbCrpBp4smsKiTp3s2C8ikpSCoCBC4iQpxiSsVibpwpupgiYs8pdpSp8pTsyioppC5i5ziCLiqsVpTC4pFpYzJiosqpOzppmsysMsOiAius6s2sBi7iWs9iSpGCii2pAzsCasAp6sFsgCSp9CHCHCvsMCJpCipp6iJids5CosKpLiNpYCiibCHpApfzCClpwiKiVsmsdpPiQixsBClpxC9zCCNC7pWicsvsIiWsmiUCipXpKijC2CzitiypJC2s5C0p3ihiCC0szp3iiijiEs8sdiEpPphCFChiJs5iUCtsGpupDpZp1sLposNiGsKiqCvs6CticiHCupzisiWCMiQCmpLCzCSiRs8p3sZsrpUsFssiZsRCJpRCJimpAi7CeiiCRiRsniVCci1sosapTzJCciECusosBsyiypMphiWCAsriRsfifiuCji0shp6smpHC0susNCNCJsMpxpeigsBpPpvCasKsKiksaiwijiGCVs7pTCcpCpdpCC6pqs0p3iistCfsvCdChiWsSClCVCmirsjibimpFpqiTCwpSp8sCsNiQiTCJs4Cap9i7sXpyCVsECsiniNCfCQsWihCWpWCuCKi8sppnCXpgsfpHi8iVinsYCdpesfsGsICAs7ilsXpXpvCTCLposcp9sfC0i3CBiDiUplpXpys9sYiWiyCiiuiaCXCrsWpOixpbi1CbiqCdiDsWscsmpNpasoCApyiistpNCrsbiVp8C6CIpvizCviwi9ppzipqplCEClpOpzCEpeCvCtiEiesqs8iEsriFiqpLpICciRCqptiyiZsssHp5CYiuius3iZpmsCsIiEp4CnzpCTiGzyCHiBCZCpCBidpjsrCwpVp1ieCcCiCHizirppCeifprpGs0sEpQpApRClCPiJiQCEijiLsXpkp6sssQsysWpBpgCHsppip8sHsUpyptpjsjpUiDCyC4pzifpIpNsEiAs4pyiVCUp6sCp5CIp7CAiCsvCTzzirslsSiNspC7pkiBihCrppi9C5p4pOCrimpJiCCMCCsfCpzCpBpgslpHCSsSs6CqCFCEpKitzzCHpfpkCVpwpEsssUpqi6CJirCjsEC1sGstCdpKspsKzsCYiVCnCUCdi1CEpOp5sxpuiVsusxsLCeiiiCiWsFp4pNijipsbsbposdsgpMsksriLCjiupAi4its2i1s7CVisilCvpzsziaiZC1pOCwpTCipMC5sMi8phCLpaitpwCNivi2iMiLpACnpViyCGC5CfCIi9p5sHivCVpDCoiEpgswsNCHsxsViwpCposLiRsVikpbpKCqp4iRCriTsnpDpzCciniDCnCms7C4snpjiQpHpBCQs2iFpoifCppmiUpMipssC8iJC6soCViXCNsOiNpyCipZsGsvCWiMiCsKiHszC5i1sCsHCOpop6iFpXsep1pbCbiZCQpAsQCAC4iEiHpQsppaspiHsDCSs3sgi6sAsIi9iJpDCNs2ptsEs9C5CjCQiysjpVi2isi8CMsOzyieCoCXCLpEpBCrsBi5snCyCszzC3igpZsHChCdC8p3sFiep1izpdsTplsiCnissiC9idpnigpKp7isp7pXpoCEsPp6swzJCRiVCwpFCtiqiWCUCcsfp7pbiXCBC2s7CmpOphi1iIpIiYiTifsbipsqpRiysosHCACRp7sPpDijCiiFioshpKiTC9CIsCi5sVCwiJsJiWpAiJpipjiwCsCPs7CfsEi1C0p2ptsXpBp7sbiRiOiZiwpPCIiviEibpLsqCgi1pGiCsaisijiri2srisCes0irsOCdCICusOpipgius1sXstCpszpWsICLiAsvp4C7sIsdpepYsqisCkpOiNzJs3zzpasHi9CfsCpbiopHs8CZpSpliQs0CSs0iBpZsLziijC6Cip5sGp2CWilsFsiiDsKpusGpGieixCui2pZpcszsepDpfpBCyptpDsYpHifp8C1pmzzCcCUsdihipC6Cfp8skCIpJi2CgsLp2C7p0s0CUCaiGiXsKsEiisJpbsrCQiYCeilsUpmsLsKs1CksysYsOsGCNsBpipCpkpypvivsei8iPsEiuCXCMCOsdsVsgiupYp8sxp7sTsCs0pspfsWp6pYp4pAsnpKijs7sUigCwissSp4pnihi1pIp5ppigC4iLiAi1pps3ssCYpqC3sniMs0pfpss1pip6isCfi5CAsHi4CMsHsmsbCSsdppslCzpOpYCpCSClixiesRs3pliGsGpNCnC1i5pWs6CViqCcCQpTiMsRCNChixsviKp4CSpQpDseptptssi0CJCcpyiTi5zCsrC2pOiLsBpRiBs5ivCKiYsPiPiwixzCs9sns4pHpLiRp8pszysAixpxiziUCTiBpeirC2iOCNzCpesMiXCjpGCmpLpBChsciRpFpxzsihpbiMC0CbiCs3i0siscprp8i4pds0p2pJsKsmp5pbiyCcCLsEsgifpfsKphpPpds7CtCECapfCsiipsiFpKiUp9stCDi0CjsgiBCXp2svC1pTiuCVC7zsCWCGs6sbiksyiYpssZCVsDCMiLpyscp9p8C6C0sCCNsxiWs5COCGpJprCasbips4p6i0zsswiIsyC7pJpdsOi7C7sOC5puCXCwsJpziPzziUs8p1skpIidCJpTCdsophpBppizCWCTs6C3pPiHiBsXsOzssysCicsOCnsBCLiTC4sNpXsyipslp2sripiTC7sHs6sDigC1i7sYs4skCJCjCLsmpriziBsnpIiUprCzs1CMCFCKCQC0pkpsCjp9sZiviIp9igCdCCCmC0s4soCNCUpusVpFsLivs1pypUiWC9iJp5iSssiiC6iIpRsup7pSs5pHs3pPi7sBp9sypni9CBpEsus2pip3ieCMCfp3sviXigp6pdpls0ini4CksVp9p9inCaC7pqiBCci7CciFCQsCpOpps2Cjp5i1pbCTiqpts8sUsnsUpXsFCOpSCRCzsbpCpjijslsAsXiOsCswirCFpaCbids0scpJi9CNCNplCcp9CysmiIiEpwpfCniiCcppiUCapppLi4p7CWiaCYCIsGiep1iCiuiMi6CPpZCFi8s8psi0CTsUzipmCMiqC9C2i2sliFCsCrp7pviQpiCopIsksoCsippYifCtsXCfp0s9iqCrC9s3CfpriepWpxC4puiJpBCEClpbpGpiiwsyCYsBpmCesYpPi1pBskpHsrspp6ivzCs9iSpipEi7CriDiXCcsqs5sts8iVsZCZpciUswpfCCpfCNp6pNsPsQipsEibpyCRCcCtpVsUiBpTiGppsxsFitsHpUzziJzipEiEsQpYiXCAscCwi2CzCCpKpqsUCBpVCRzzsdCosfsjCQstp3s2sxCoC7pwC2p6iZC3pwC5stCksOC8idsQpxsGslC2plpZpliIsECJp5CPCdC1pWpFpbiBiRs0pqp0CPzppdCHpbsdiOi6i3posfpmC1p0CCpesIC2iPpkC4CgCopgCQs7i7pOsfCbCsCeCUsRs5CeCQiOpFpBpasnsqzssMpECksssUpWpgilpBpZCoCdCLC9s4pBCzCliMCwCwi0CrpwCUCuCxizp5CMiap8pqpEiGpQCHCViqinCHC3igsyicpTpViJiNCUpJijCozzsyC4ptshi5pkpdCLp0ikpFpRCfpUCqCbsfp4i0CgzCpEiZpspfp3CtpGCAsgpjC0iVCRinCopZiDCksNzCC3i3pmpkpZsWCKCOiWpWp7iLs5CDsjsgiDi3CQpAstCXp9sIphsks5ijCFivsHpjsas4iGiziiirp4iVCtpjC0p1pqCDCRprsLsEsqi9pDCAp4sUiOpiC9CDiLpfiQsWCGsNCesHsUspCVsysQs9Cqs7CbiYCjCcpEswipp5sgCxi1iWCBs0sYsTiwstsDsZphsRiisks6s6CzpxCypFiJsyCesJiIi5pqsRinCnippOp6sFp1s2CzCaCgsop1pDsWiUCQzDsZptCzpfpjzypPCDswzyigi0C8idioiHpup6skizsGCTCapCpOpbifstpCieslChsfs2sjCYCAzssICuC6CqiXCLzpi1sczyCJsDsTCNihiSi5pCpIp7pMslpks5sUCpsSp6CZCGsyCSsbpUi0iApVszCLpypGsCsiCRsbi0pBisswpEsRpsC2sRp7s7p7iRCWsFslppC8inpwCZCBCBCEpkzsibiesIsrpTCqilpAsLpWplC1iqCSsvsAsSCii5pipbsaCRpJCTp6pnipzyp1s2i9C5CnpUi7idiVCepWCjiRpWiKCtsspfsSCoCsp9CWsdCsiMCGCwzzitiTsEibiFCwpvCyihpBzCpeCkpDiQiksWpmpypTpms8prp4suCriqi4ifpmi4zysezziBshpnsIihshiIp0ippRCHCmshCFC9sDs3sTsaiXpbividpGiRinCBp2CHiJCis7pHski4sSCCsKzipxpQpuCnC0pcsSp8CzsSCWCvsSiSi0pVispcsYiFpEC8sMpHsZpmpyimpyCKi3ibsLCHCMCKsKCEi0ptpypAs7iECrirpwpZixpDsnCVpKCRifzDi8CZiupECIic",16152));
}
export const _AIChat = {
    get AI_ROOT() { return AI_ROOT; },
    get WORKSPACE_ROOT() { return WORKSPACE_ROOT; },
    ensureDir, safeSessionId, sessionDir, historyPath,
    loadHistory, saveHistory, listSessions, deleteSession, safeAttachmentName,
};
