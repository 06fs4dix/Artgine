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
    return authToken ? isValidToken(authToken) : isAuthedReq(req);
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
    CAIChatRouter.prototype["onGetSessions"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CAIChatRouter.js","Cri5CeC3iUp4p6ims5CUCSpHiRpOCoCXsMiQsZpGsNC6sbpVCFphsxpHi4iHCviYCri2sPzzCGs0pfiliNCFsnprCUiZsvs1p5Cfixplsds6CgsozJsyCTpDpOC6C8pNpWCWC3CasKpApDpViAiFpvpUsupSsGCoziCdpwphpBCDsXstsjCap8p5i0C3pbsezDCgizCpCaCtiXziiUpECHiJpFp1pOCsCaCDC8iHpbsXsNiasHClsapTi6C3iyCriXCSCDpPiDpaiJiqiECKixCOCtCUCQplpvCApGCHpmC3zDiFCrCopSsMiXpVilsTCip3CpCVsGiRiWpss3impqCXsqs7iSCPsJinpEiOC5CRCNszsmsCiWszCoiTpGi9CwCezismsViVpoCPpziNiFpXsxpfsip0sQCysNC9i6ijiSigpnzyCICcpACmpcipCbCNp2pSC9p0phsaCDCSpip8sCsTpMp8spCmpfzyCbCRiopdpypKp2pRsdsppNsZs2sLi3pFCPibieiGCwslzJiyiSs2pciLCWszCspUsppMpmsZC4inplsesHC2i7C9pXinpaiUCfibCvslzDidpdiBpXslihpqpZsJCkissHChC0iupjpPiezipcpXp6CdpKCUiDposWsHCupysCCbCYsLpxpIpGsji6iHppifCVifCqCUiSpbCCiCiniJCoizpHp4pHseiriQs3CFs8sjsnp0iBiGCVi9pfsDC2CPsxCfp6CessiLihsOC8p8sBCvzCpdpjCQpIpyCisRpVi7i3i2pcCnpNC1i4scsis6CysOi4pqs8i5pasKp2sFiVs5pbpYiPiBpoi6CLi9pUiBsWpgias0CBpKpaiOpzpCprpXi1p9shiTsXsPCEC9p0sNCeCypEi7Cws4CkiCpyirCyirsTsDpApdiMp7CKsnC3saC7iqi7CHpSplpmsZp1iZCZzDs6s3pmi8pciTiCpHiaCxs0CdsSstpkCBsyiAplpusgs6CnsiCDsoiUs1i3sXi2CLCVsMzypvCdiACnpupHpWpusbCjzJCFixpTiGiHiEiWpHsXs5zzs0sUCDCQsnCssGsdC7CUCiidpVC3pDCACEiisxiAiHpPCCCHpVC0iZs6CXs8zDpRi2pWCfpfi5i8p4snsTpBiqirpRppC3sHsqs1CYsgi1CUC1ppzzpsiZCkCbipp6CYpqCVs5iHpEiOiMsrpRCFCkivsgsfsMigsXiaibiOsUipCspcs4pJieCQpLsLC3prpusgCQC7pJCSCPzssxssifs1sWswixszs0iECGs1siiziUCJC5igs5igiwC6iysiispIpnsxpvCRsos9ziiEsozyspsUCiiiioC1CEippEiNCwp5C0CgCapVsnCjitiHCpsWszsCzys2iECIirp9sNCDp0pQzJCapWpSziijsWinptppsqs3iTpKi5ChpspOpszJiBsipjCasUsHC8ilpes3CvpGsXpCCoC8iuCcsBp9ipiHpZiLpopKiUiSCoi6plCpCfs8s5iPsMCnstimiqphCbCqsyCvpCiRpppHsPsWpnihCtpGCRsppfimssCWiGzipdsapai9sriiiLpcCqs7pCp8p0iqiDiypxi3skCnCdsEsNsQpRp9sFpuiashsuCTCGi6CLpgCmiMiHp9svshi4pPClp1CSi1ikCoC8iQieipsZpHicsLpKi2CRCbszpBCQpJCGpBpepKiLiWisCBi5zDp2pnsCs4sTiesfs8sGCniusupmi3pHsDCLs8CxsIpBCMC6pQCsCMC9pusdpnCailisCuCLpIzJiBCuCxpICGpRpMpMspsisriLCli7CmsmpDCTp0iIspCLs7iupJiyCHpcCOipiFsas4iVpdp6C9ClsnslphppiIpXizzzi0pGiRi4CeswibiUsnp1CcCzCKCwCNi2sXpRpsiJsXC8sKC9pGC5s8pZp8sCsmCks3CKi3pmpBsgpbsasXiJCnieC1pUiOzssfilpnpWsGsUCFiui8puiLstpRCBisCipxi6C3pziPpCCXi7zyswiEposjpdpai1iWpwpnpIsbpYsECXsXC7iwsNs6p9iDi5pZp1iishCcpNswp4ppswCIp0phCgpcp2pBpZioiyCypCp6sgs2pdpiC4s3prsRics1s5p9sLCEsvp1CspWCRiystp3ChszifCiCdpzzzCssZsYp6swpLiiiJiJpAC1C8CPiApQiRsYp1inpuCsC6pvprC5pgsxiiiypUsIijiBpUslsypDpls1slCcsbCspQsIiIsei6pJC2sMiUpkp0i2iqiFihpYpyCpCciDpRp6C1s1iUCSiuzJpiCLsJCipjsjiWpssuCoioCKp1iBp0svC9inCEscswsUiusapasBiciRscpHCppMpVCKsICopGspsapDs9scsMiyCuC0CsiRzCi0sizCpviXsgzpC3inptpxzppGpyiJppiUsGpvi6CKCXpup6CeshCjpxCXi5CRCnsfCoCBCeCjpVp0pWs4pnpxsRiypMstsMpViKiPCGi6CmsHClCFpMpvsZi2pxsyCpiwsQsJsBpgC3iYsfioCSpmptpfCciRC5idptsypYicp0CJCMimpQsRCKsbissSsCCzCApoCGCmpkCsCnpcpfsMCls3pzppsEzysziaCrzzsxp8sMsLsipOCMiup0sas2pFCMicCECXCdCsC9pLsnCcCFsHiYsIs1syCcpbphiyzssWiWCgpPiOsUpXsEihiRiqshpzCKCVi3CFCuzDCWCMC7iQCdC2ipCxCLsBCssfsrCDsLsUiQiJCWiosbCcsXshCJpsprCliTpGsfiViUiLCMsGiYsWplziCKCfCoCapdsJiFsfpdpSpLptC3iDzJpZsusCCIiqprCvstCzszsqzDiVsvCRpuCosypuimpmscCCsDicsJpdi1pGCnCxilCkp4sDC9ihCRCGCQiCzCihi6CyiGC8CzChiEiKp2CFC1sIiEpIpHsECis0CKCgCUppzJiwpiivCuzypDiJsRsQsbi6C1sTsWiVi0sJsCCusSCEp2sistCkCnsRiaiEpIp2ivicCVCFp7CkpviPs3CxiFiEC4CLicshp8p1CrsBCEs8iPsEibspiDp7CcsOi6iyixsTsXi8pBpvirCtCxCLiyCFiSp8iACiCfpeshprpPi0pIswCishpHpSi6sUsNsKppCGpTCqsIpGCnsnsOsBC8sEsSiZsPs2iPiwp3CDscpECfiIssCtsji3itCLCICksuCSiiCOC8sesap9sms1sTpypbpAiqigp7iViXsjshi4iWsjsApaiMiXzCpIsdCBpLsqpRivsvsIC5iliEzJCAi6pzi5ppi8pWiQzCsgC5pFpIsMpbCKsXipiJCfC0CTiIinCzCYCGpaikptiupui5pjpcs3iKsjsKCDiqCdieiLiaswsIp7iCsiivs1slpUCcsriZCWpri6i8swp7ixziCXpcsLCipJpIp8paCssJC3pRizppCJs5i2p7pysrCvpkCGpPCvC7iUiUili3zJsOsZCXpziRi5CnsciZpssWpqCgpdssiSCCpoieibicp9CtCDiMsri5CVCQpWiHCei8",0));
    CAIChatRouter.prototype["onSession"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CAIChatRouter.js","ijs1CAitsAiPitiPpiigpIp8CVCipGCTCesDCUpmsqsnCBpBCrsBpvsEsyCiiapeChp6ziCnidCLCmCYCWsbCTs4iLpsCLiIpgiTCJCSsqC9i1iMiwCfCps0zCCcpgCcC2spCZiCsip9sEsOp8ibiFpwiKibCcCdsdpkiviDCmCfpgsAiCzysvsPC5CesSCUzisYp6sVsSppiZCJCTsviKs4s2CQp8iFixsNsZibplCAiHsepxsACIi4CRiTiLCCpkiasOplsfCjiwsMpbpqCrs3s9CuCUzzsVsyCYpniWimi9ikCoCepOiZCgi0iKiEpNCcibpBpqCos6pFiSsepqshiJi0CaCiC3COCLsvsNiliUsLsAiTCyCRiEs6pKCJiziIiws6CYs5iDCri6syidpIsMpAiwpbCTiHpppSCqC9sXpJihCTiICqiECvzzsZigsWC2sDCbpCpgshpWiMiKCPseCcpssjiNivC8sdC8pOpNp9ioi3CCiEscCPpLpoiiivsziwinCzp2C3p7CQiaslsFiXsrpLs2i8pPC5i5iRCxsQC9sgsnsrC9sdpzCjzipEpXpwCWCapei0iJi0iwiPiosbpHCCCaseCupcCii4CVC5paCQCECRpasaCWimiKseCwCkiMCdp0sNC6C2pZpczDs0pvs1pACdslCFCpsMiOpkCgpNiFsMp0sHs4pLpjzsi1C1C3pMplCcp2sviMpLiKCfs2s5pciAibp3CGCFs8i7pKiPp8iVijiJsDiUsgipidC8pXC5s0s5pFCXCzCrsxivsns5swpcpBiqzDiUzDp0sOCJp7pPsHi5ijzDpSCcCOsfi3pLpLi1sXClCyiJCKiaiYCjphC7shsvicpfsmp0C8i5pGCEsMpoCRpmsNppCVChszCqpNCJzpsPpIsRsqC1sUiJpYCSzpsMiYiqsHpPisCbCZiPCAiUiJiVshiai0pqpds3CrsdsUiHpMCTsjiZiQC8pni6s8CfCPsciDscpHiCi0sssNpTzspSsMzisMC3C3p7s3CesUp6plinsiiAiFCgCJpupYscidp7i9sYCZzsp5p1CJsRpRi6C4iRCvshiJpwsisnCfsdpsibiOzsC0iuC7i2sPi2sPC6s5sPiHpUpysJszioCGClCns8i3iksqsWiEzppWiypepTpbsLpOp6pwp5sopcsNCupIsCiViNpeszsPi5CmC6sBCUzpiVpjsHpQs7iniGsfpIpdiXphC9iopAsWCrpIpwpSpHCEp2CRpiitpapQCts7sKp4plClpTCupzCyi3pQsOCTsfp4CECVC7skpRpJpcprsliQsrphCEpNCopQpps1pBsdszpMiJiFsopqiEsjsFsapqsvp0sMiapSitifC1iiiQsLi7zCsLpmCOshsxseC6sdsuCzsrC5iOCxpGsqC2CbC5pYsUpEsAi4Cap0pkirsoiViks0ppi3pzCvsDpnCMpxp0pDp2sTpSsxs8CkivpQpezCsGsbp1piCds9iLitpesaCHpepcswpkpFi2svChi0slpHsCpdiOsuitpSpICJsKszCOiFCapLsBprp7pcCxCGCSshsupCpEsqpzCXC6pFCpCCCHsgsNs6CMpbzsifpgzzshsgiTstCZivpkiuiUp1CzsXpYiupRsaszsbCmCnC8iBiVCEpnscCvp4imshCRiYsTsLiiiTpOCBiJsLiAiZC8iJibiSiNCOCus8pYiXs0sKClsOpbilCspPpesgpwCDCYpLp1stC3pbzJsDpFijsop7pfpdpApssLiqs6Cyigi1iKipsTsks7iSiLCDCpiCzzsPiOC5C3sYpZCppLCssBCnCpCLswCriSpYi7sZpGiFimpCs8ppCdCailpbpAiqshpnzCp8Cpposyils9CpC4pOpspTsbikpDpTzpi7zppbCUp2p8pizzCuCuCRiPshsUs0sjszpzpcshprsRiyCQs0iYCDp5popOp4pRiiCAp9ijiRpwigsdC1iXpkp1sVpNpksDswCqCliKsrpDibC9ikCSi6izi3iNpIpJigiUsKiFiUs5pNp5CbptsaiPsLp8plCDsIsIpRs8supUsKicCXCAC9pLCEs2pACypMpXCqiECMCXpwpvimCDpmiDiXCWsDCZiNpaCgs6pQiRijCLsTssCIpvzDscilpgptsmCjpNC3sPpusMCczisMpHpui9ssCGiys2imiupos5iuCKp1ilsqsViRCLppiCsCiJs7supXiIsACjsApiiCpBsGpepkiDijpipuilpvijsBi6i9CcicpWCGiUs5pVsuCSCYCWCss9ppihCmCyp2CKCcpwslCsihChCiiBiniEpVC8pTswsppapjiJilp5smpdpgzJsICtsdixp5iRpEsRsuiKstCApPsUiWCcpopTsZsWswiICPsrCtssiSCBpsCYixpMsosQzzptCBsws2s4pvCspBsysDprsRiuCBiLiKpQpBsupasSs6s8sFsGCbiCsMiRsbp1CMiisApEifpxC7CCpYCMsksPp3poiviqirCDiriLCQscsIioisp8imiNpHCiCRs9p6priJsyp6sQiliWiEp5iapbpOCvpFsXpjCSpVsip4pDirp4CTC4Cgszp7sMiqsupOi6CHiDsACspopSCnCui7CoiciCsRpyi1iNsDi6CApNCos3isCRiaiTCDi6p0pVC9C4ikiep9sAi7pDpFiDp9pTCiCqzJpqCui9iesqC3CpCECws5igCii2p2sZpriJpUsTCGsCzDpCCozyCCiACdzipCpfijpKpNsLpOCjCksYpDp6sapiCliBisC7sXsCpGskpWsqpvpwibC9pTiEplsPsgs8sHs4s5ieicCKppsVpEsdpDsqCSC6i9CpsEpgCjC6ifCdCeszpFppsniIsGijsgCVixCozDiIijprpzzDsZiiCvplp5zypVsJCxC0CSscC3poCvsGsIp2pZCeipCOsTC9C2Copoi9sECaiTsYpuiJs9itiWC2pPClpMp0i8pWisCMisiiiosnsOCeszsyiVpkCws1sgCkCzChicCKC1CcC9CKpYirCpi4sECXi9C6pVsWspsvCisKCFCOsVigigCvsTipi7sDChCGChCVsUsIC5sqCgi6i8iFpUsjsQiUswpgiMsPiGs0s2peihsksJsViQCWCssrsspIs7ptsssDCQisCvp2CEiDzspwsyiQiYidi1CuCxi6p7srzCCTixicp5iLsXCRiSpwsuCPiJias0pGswpBswpRsDCXstsgCCzypopmpiCHzJCOi7CGiNiliIiDCkiqpACMiKilpUsmzsizCwpICPCai6CssDsRirpbszCEsapqibpeCzsDiZsSzzzysts0sipFsGC5pPCPClpfpDi3CQp1s5pPpNpEilsds6igstCsiipVs0CYsFiap5iQpUCdifpAC3s4zJCkpeiVphzyiTsaCwpVsLp5i8iSCQpusSsViVsHCspkCBsIpWCYppsmi5zJp5pkslpis9CcpGplpiiCitCPCVsTCppwCiC9p2pYCkiKp2CPC4CtpoCVzJsBsyiAscCssQpasvCIsNCPsmpbCpzspNCmpGCsCkCcili0sfiYiop8pUiVCqpnCBCECZs0Cdp6pNs8swiRCmChi0pQzppfpYzJC4CRioiuigiesbCBshiJp2irC0s0pVpFpyC1CopUsricswCbChsBCCpXCZihs6sRswsniusPsypPpssys6pmsWCAstpXiviDigCKC7CMsmpzCTijpkiiC4pTs8pRisiXCwiQiWs5sqiziqC7CapgpcCrpdsnCopYp6piivsipECxpopmpICbCXsJpxsosdsICapgsgsECssAimimCHpRiaprC6i6ivsss8pxpMi3pIprszp6smimiQshC4CmCNsRpppaiVpqCpsssbpziHiGpAscpACLs5iTiliXpopkp3CHpTs8zssniUsYCQiXCMi8CpsZitp3sriRC4pOpdpSpPp1iDpVs0pJClirs8ijiNCcCIpfp8CBiriIplstpOpBils8skirpYisi1CJiqp9iBp4ici9sZpXCnsEC1papHCLpxiZpKCgpkpMsNs8CEpQCXiTi7sPimsqi6CTsrC1pBsKp2pzCeC5swsZC7iYieCzpmCFi7spsBpMsAsjpxiMzJCezyiliHzDpdsWiCCHiApJsysrCSscCWCRippCs9sgpSzsCnspsPiTscCcp7ibC1p6ikzislChpAs9CrCkpjiii3sLp9suCOphpWCwsdpfssCgiupeioCoCcCwpgiApvCRpsibzDieiWsvscpSC7CnCBp5sCs3sNCbzss3iQiHCribpFCEi8iipCptpzstChsezsC1pkpFptsMspiypniMiIpQCEiQsHpFsesZsGsYCxsiCUifsuiQpZposJsCzppMiSpXp4sUsGpnpmiIsiCrpNsipgCRsxCEC7iysWsgstpopyiwCgzJpppAspsBp8CZiFCsinsrCTiJCui9i1p5sNiaCYp6zCCEpqixpUiXCoi0sAsXCIimsJiesYzipXC5iAiUigpZiFzDsEpZi2iissiOiMsosQpAsMiepNCPCqpYpVp0C8s9pnpcpesWp8syp6C9s1CMp9pTCMCOsxzCiFixiWiRC1CTC3sOCfCWpEidi7CLiKp7iYiSCvslCSCdpOpjiUpQspsFsGp4izpVsxCKizpAi6sbsQiPsqpyCZzJpwsVppsPCus0Ctiop3iOCgCOpZi6sTsbptpGpTCzpSpWitp4pmi8iiCfseijiMpTs0phicsxpuC7sXsGzspNiMpICApZCms7CXsFzJiHsziPpqCkCtsDiXi6pYpMsyCiijpnCxCozypNsjscsMpDCupPskiUsOiUCpsTCOslpCscseCusmpNs7ihCKzziWpSpCCQCKsiC0sLCdiKi1pRC3CO",1812));
    CAIChatRouter.prototype["onSessionUpload"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CAIChatRouter.js","p7CMpniLpCprinCTsoCPsbp9siCMphiSiBCsiKsCC6sSiWifCasmsfsSCaCJp2iVsdpsiiCjCKzppGCYsqpczJCHiNCPiyiusxpksXsKi0iAs4i5CpCgsjpssysksrpYpgCzsrCzp4ipCcpop6p9pJsjCgCVCSprCMC5i5p9sai7s7pqihpTiisBCui9Cdp9sWiipzsUsAsbiCpriNsrpHifs7iNpusSsPpmsOifC1sLpDCpiiCwCxs0iQsqiPp4sjsfsLiVsEpzpuCtCWsrpsiaCACms4s4iAibCNsFCNpYilpVpCsVsuCspeixi5iNpnpPiZpLsKiiCtsMpSCZiRs3ssiIpczsiqp7iUzDpcs7p7CzCSC9szi0sXC5C6iGpsCLsYshiZC5sXCXCaixi9i3pBzspXpbi4pxi4i1sGpxikiHCIiwCVidCoppsOpNCCibCjp8i6svs0CIskC2pBpIC7pkivCMilp2ClsVi5C9sAsmpdiBC0pki3seCrp0sQC3CGpls7CNseCCsdiHsDs0CZClC6sepKp4i9CnsasTixiEC7i9CcCdsSiApxC8pDsnCQCgpWC8pTiisysKpYpKsYsHshCIsJi3iWi5C4popzixCRpHs5iJsrCCiJiEpApgC7saszszCbiPiBsviRshsVC7iJsgCzCHiEscpYipCSCMs2CwC0papSiBiSpRzssEzJpppisSCUCzpppQC1shp2p4sxpPCwswpOsBCMC7p4pqshstCspCiHiIsKCBpLpzpgC6sSsQCDCRpHCJiCsCsBpkCHC2iHC9sFpECGsTCWixiupGpyiRs9p3s3iTpRiMzJiepsp8CFias8p7iTCrpziQpxiHi3sei5pmswimpVpnCBp8pMCCC1iBpPCzpUp7zssfC8COpTsepup6sXsmpwsziPpaC7i9CCsxzJCdpmpsiBprpRiJs8ipsEC0sTsRizpSiwpspap0pHsaiUidsCp5pDpriDCkC6sYCSiDiXscp1sisSiei7pCirzspHpbshCqsUCbptsTsbCFpDsRs0p0CJpYCki0iOsiCJi2sBiJpfsLCnsPixiEiApXChpKiXscpIsyCysjsjscCBpTCGpXiHpPpXikCppVCrCUitC9pNpFiZzypYifziCniKszpBsMCLsaigsvCxCUi3pFCFi9iSCwp4iSpzpApEpKCEp8CksBp8CUs3izpashpNpuibCWCZCbsApppqCrCAsJiei2izp5pTiApRpNsrsusFi7pmpKpjsKCwzpsUsps7CVprpjp7iUpVCLp3p4pZCEs3sUpbiAChpusLp1pipNpKsWCwpEihitscszsMC7smpxiJCIpCpdptpgCmsdizp4zzsopGpDpFiMsjsFpRsasJiIpJiZs1CRiZpDsBpwCdsPzzpIpmp8pdshpNiOpLCeCWs9i2iFpxiIi3CAsnpcpYijsqsNCvpRpCiICgi8pJswiHszCQieiZsACeCXpYppiiiziFpzsZCapZCXC1CTiXsmiNijiPiLswC3zzpbidCFsGiAsLpaCcshCLi9p3sAiPzJs1pVp1sUCsplpbiKCJC3p6i7pyCPsLiBCJCrs0iepuziiriqpZCDC3pEp5p3ivC2C9pespidsOpXsxpApdi9i5pYpopnp7CbpnirpQCgpJzJCrCiidCcpqpWpgCfp0p9CrCWsqsFiJiIzpCYsOCSsjikCXCNsesJsnpHCIpgiiCNpRCFsfpvpRi4CQiwiRimiMsQiDiLp5CYCoCyiNifsxibsipsiWCWCFpypfsszDpACkCLCCiqppsgiMiwpisECapoCMpxiJsbiEiJpSimpYi0CHCiieCYpKCMpaCrCMpriviusBzps7pxiJpasXidpNCHijCkpaiEi5i2ChCBpvieiQiiini7pyCeCdpQCtsDibpwCyCNpysQsZCDCdsPi6pmpNiCiBCRpgC5CWCXzDsTCnpUsxixiap2pKCAilpXivs7inpjijiKi2iMsQiJsfCIsQsEiVCcpgs6p3sisKCOp9sysFigpaiqsiieiLifCAs8pFCXiKiBiqCSiaphCVpcpKsBsWCUpWsHCbsEiVpYpusapoizpPptC4C4irsFCQi1iVCVpHpCiTpdpLp0CFigpBCxsoimi2iEshsKpCsUidCcpaCmp8i4sZp4pOChCTCZCyC4CQpiiICssfibiEpaCSChCNzzivpSsdifsFpeCcirpoCKCNispjCZiVshpdsBsLsxppi8prsfiIsEp3C1iupipEp0CmpJCQpDsHpXp0CkC7CWziiZiGi5s1igp2iDs3iLsrswpbzJsAC6CJpSioiHpdCNpksRCjs3zyicsoitiQzisVpSsaiCiQClCQiFpis9pIsgigi9CgCVs2CQCYpHsVpTCcsNiUiMsrpBpOzCiiCksxCfspClCysVpcC0irilC2iUpJCfCMpbs0pbsCi5ssiNCMiapapJCVsNCjiXpiCTpCiSids6CnCYCisIpPCSiEC8CJsDziiysysaiBpiiYplpeCVCep7sssosiCasqsNiaizpTsesusjsyi1sJCXsvipCqiPiLsqscs5iQC2i9sgzDCNippMCLpoCniqp2pOsystCcpvCQp3iAsdpoiZsNCLpos0ifpNinpjpxCEpwzJsEpDpLsKsUsSpBs2Cwp3poivCdCSiMCUpkCkivCDCdpkCUCYpAsxC0pGC2ziissjiasasbilsXsaCZpFCNinpWirpJCcsLsRsbpnissniFCvsfpFCsiTsZC3CLsuCjiliiiSigpSiIp4sasKilpgpviGiainpmp7CfsviApVCtiiilsSCcioiRCSChCfs4pzs0CQiZp2shiti3CZsjsbpapwslCnCWscpxCRCCslsVili9i3p6sTC7sksjiViFsMCVpyi3CXsoimzssOzDiUC3iPp4sgptCCC0sMsLCCposzClCxiNpeizsPi6sppbCAixsisXs6iriDpTs7ixsQCcpZsVi4sosppBpgiliQCcpJzypPiFCLiHCHiKsxsoCsiPibsqCrippLpTiZCSiyzCiJpxCFi2C7sxC0pdsupsCBsRCap4CtsdsdsVpgCYpjitsspOsNi5CMsxsYptpDsYiGs6sip3pVp6pnCYsECesvCysJCMsyC0swCDppilprskiRsACMpHCXi3s5sypGClpiiisJi0sesPzCsoCgs5ptpAsGsSCWs5pvCyi4CcCKiGziiYi7CwiRptCDs5pHsUs0CJCbpuCisYiesJsACtiqiPCazDigCUsvizpcsyifiFiEpusrszsrswC9pasmszCgzzCJsws7sNiGCsiki3ijsvivils9sqCtisiJCPsXsuCBsJCYCrClieiLs3CesVpss0CrippVpCsBsTijChpoibpPseCOsZCsCkCLCfCQi6CoiKCmCApmzCpEs5iVsgCUi9szigsMpRphiLCJzppeiIsaChpFiBpiikpupup9scpNCXCCiIsViti5spsDsMC0swpIiFpUp2sVi8iJp8C3sJCwsXivi5pSsiCHsQs9p1CJsBswiapvCBiDsei5ioCcispkiuCQCBiGprpms2iDizi1s4i3p8pCiZC7srsrsqpwC8CypjzCifzpCfs5CxplCNsrpZpICjC6sfssCistCpCbpgigi3s2pniOs1CFpOsQCPsGphi9pxpaiZpxpfpDCcpGzJsWpvpNsSiICQptsEiSCXC4i8CJpcsGsCs3sCpNpICoCUpBpqiTzCsisxiNCkicpUsDCjpQsnCoC4swplpgsopWpkiVCmivsmsLiXpasLpQiVCSC1pozpC9pNCviOswp4iJpNClsrigC4CLsVzsCqCYibiXiAiTsbsIpIi6pHsPsfp6CLiZiSsLsjpvi1iepvp6ijCfzssZp6CrptCdiPpIpICPCKp6CYsis3CMzpCmsSzDCYiWsAsHiBieCdiAiuigiviQsNC4sECuiDCyiEiIp3sEpPskiKsssxi4p7pwCLpYpupns7pApRpMsiiUp4s6sniBpeCeiYCsp7pXinp6s2sgs2sVpVsJsRsXCDzziKiQsGCXpVi9sLsGCYpTpVi4CJpZzDCtCIissfiisrC3CtsMiaiWCxshC8s3i6iACKCVCuibpfioshzsCDsMptpsiOCSpDigiGsjsWswiPiYp2spscpUsMC9C6irpNivCupTCEsYiFCTCFiYiECussiICBpoidibp4iFpfp8s9C1zpzizyCKCJpoiaiJCti4pSCTivCZiUiVsSzCCqpQiCCNpbp6sLCZp3iGCYpMC9i7pOp0Cbs3pnCJissmpwsEpapbiXs8pECvCRpOpepeiDp3iAiHp2pPp2CfpXpDpzzziKpwCiCQiisXiTCQsnsiC2zzi6pEiBCriRC2s0pri2zJC0sPpNimixCBpCpApdsMsOpoi2CdsGioiwCZsbzzCrpACkCuplsmpmsmC1zJC3sLCLicipsLiDsTsdsFslsMiRCmsXi9iBCjC7CSzJCOpJCbirCIs0zppPsbsszpsZs1iXsEsCiwp6sys4s3COCAsaszpbiqsKCnissysri4s9soiWpFpmiOsjiCspCICLzDsxsii2CssECezzpYiRsZsFpEi7pCppiWpfsqpfC7pkiWsopxCusaiSCfC3CypJpvs5poC4CopeCGzssBsgpCs2ptC3ivpJCziEiepWitsrsMCXiKixphCni4p8piCJpfiKCDCxCDptiFiksFicsKCii2i1iIpXs4CjsqpcCrC2iFsEpZs8pHpksspOCNprsIiIi0ziCcsJs6sususVC0sHClp5pFikp3sWzCzCpwpoissCCmCqpGsVChCjCvCkimsSC6sKs6iziQp6CKCnplCus2iKslCWiJCJpkiWpZsupGiWspCeizpFCQzCsislCAp4irCMzps5iXpZCosKpyskpfCHp1pSpUpdsZsxszihpLs8CzsFivCcCrzsifsViMCEinChifssCEpYi2pbi3CfCLpqpwCsiHCpibiopHCApqpfpzpOiziLiHCHCap7stCIp6pZpFpxipCOpPpvp2ipC5popDCVzppcsHCMCWsqipi4pmihCyiti4CZsAsvCvCHslsHijidCZCdifpNiyiasgs1pgi0Cii1pkpzCuCfCnpwiLCfCrpHC7ibC9sYCFs9CNidiSpGC0sdiHphpSs9iLp0pLiGCApyClzyCki4pQsqCspipxpqiiiICmpYCGpGsspmpgpCskCYpcpuivi0CxCOCbsfpmCNpxsepPiwChsUzsiQCcpwi2sHpOs8ieiEiwCjpfCmsPsLsVCxCMCLspiZC6CnzDsxs3Cas8pHiIpgCYCFC6sLCrpGpECiiCsqCninsMphsAiwCEpYC1s1pIskihimCGibCGpqCECyscCWpbsXpFCTp3CqpGszp2iqsqpfC2sNzDphCosWiuiTsuiZpfs7s7srC8iJpUppC0CECciXChi9iXp4CrsispsqCWChCMpOiFs9sEiqiXClCyp1iHC3ixscsWsEiwprp6CoiKpXpEiCsWp1pbi9CHirpApFsuCjpOpYigpVCrspiTpGpDCAsIsrpWiwC1p9C4s6ptsZsJisCxpficprprCLsXCkiLiYiis3iJpiCbpps4s3CbsPpUpXijsciXsBpesHpBiTCpiNpeCjsHzDslsgCdisiMpSsCs3pMpWs7pGssiRpDiBp9CRC9s6CWClpzirsUpHCYptpwirigpdiniYsvissRiACwC8i5sopIiXpXCfiasQsPCwsHiwprifC6i2p5CbCqiepns1CQitszpDikiJpnCQCECbifiZsAiJs7iwCXpvp8Cki8slCvi7CBCCCAiji7pFptCYiUzJiwizpLsjiYpzCSpHi0i8sdpcp6s0iQi6CasQCBiap8pZiECXpBspsasUCJCHpWsrsQinpDswpBpTi4scpVCDs1inp5pHpspnsisvpapFsppoCxiys8pUCYCppqi5CjsbC6iCiqC9sLzziWiWpFppipsJiCpQCHCNpPsepupzpqCMi0sgCwsZpHiYC4CHp1zszziQC5pdpFC4i8CKpns5sns3sriHCfiiCnsQsiCFs6i4pdsXsCCIpCppsapcpOzyibpMsdsosZpaCvCcpssppcs5ivpysrinpYiQpKCepap4CyiUsQsoseCXixCniiC8scitipCxiBpQpvCksMsms2zzitpJsksos8CssDpHpJsCpmi9CUifC6iZpXsApjsVCSCisEsVC5sOClsmilC3i3C8p0CmC9CFiupbCdsAsXs0pTsdC4C9pfpZziCMikihsasysfC3saCkiQitCbszp0i6zJiDsLsQsMs0swpFCpizCrs2sGs7sXCYi2CEsQCRsyphCkiBzpiksupPpMitiYizirp1CYiGigiSibsSCACqizptsqClpFCws4sIiSCUiWiJsqpgpApUsciFCSsRpri0sHiIC0CGstC1ipiIsUCJiliaiPpXipscpECop1ilpBs0CVsBp4iRCupJsgsvsUi0sQpfifCNsxCopHCNCgiYCdChCZpUpIpECdptzDCcCWp6iICIiNsZsUs9iSsRiLsQidCrpNi5iypiCbpdscsEpRsqsBi0iIsmpCpRi6i8pSsQpJsyigCOijCqCPiaCPiOCEpji2sAsOippbs6izpyikiICsCnpcsppIiv",4290));
    CAIChatRouter.prototype["onWorkspace"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CAIChatRouter.js","C7sapnixi3CciZpWiusEivixiTCJCyiBCwspCNstiMsypUsjCOijpGpkpqpICwsbsmiHplsHCnCciXi2iAiKs0p5piCAidCFibslsaCfCki3swsqpLCyihiqC1sJidC6iOslpapUpaCdCnCWi4iHpsC7CBsXs9s3sOpcigsppeCZi1CPCzCts4C0pzsfippepIsqpPC9pdi0iqscpwzCpzpoCgzDiNshsCpyiqCkCzCfikiYsPpwsosbsrpvposNC1pqsap4sfCgCqibzpCpptiLpNshsaiMCuigpKCeCSsAiHpxiaC8soppC6s0prC1i2iXiMsvCYzDpRsksyiUpxsVi2ijCasmCJiWiuCHiDiSiBzyidC1C6sECLpeCdiiiYsviviBsriIiICdsNCSCEiIpfsPsYCtC9CUsZs0sAzspppWsFiDi0s8iIsusipZiusiCGCZsXszCJCepKCcifpSpmi3sLsGs4iJsxibCVpspqpGi5pzpsicCopECRC3C4prpLicpXi7zipmsSiZC6CqCLirpKsTsHzyiFCDCdsvptpgzisXpliQCvCMptCVpOiTiKsoiIilCuC8CLiKCfplsuCxiazysoCjiYijCAzsiqCpsEC7sepepWszpkCciUCUCQiWiMilijpqsZissriMpHsUCRiNihsGpwsZsNpSpIsBCVzCiIs6C7sQpJipCbpwiYC8pwsOpYsliRp8s1s0COinC2iCpZpKp0CQslpwCLiZpIiyCniVi8iGirsgCfC2i5iCsPixCapIp9suzDimi3CKpksNCfpoidsGsqi7iasNCMCxiysUixi7pYiIiksEissSsbsLCdzJsUpesniKiBCJspCspNsIiqpksPiwiJCypMiIs6zipTp6i9sAilpMpkpJiviMC1sUiNsHpKihp1sGp7pXiQsIsUzypessCbpxCuCLips0pWiaC0sopvsUpFpVC9s2s0i9CnpdiWi4p3CSi5pwi9impDpJpwCviZCuitzsCOinC2ifpIsxzDsWirCQizsbCnsDpwp0ppCxsFs0plpysmihs6pCsFCws9s7pgsQCRC9Coiri2pXCGCGCzCgzipVCAsap4pDpWpDpPsQp1sBiriupKCts8s2ibpZCCiCC2pYCkCCpGsFiKpcCFsypqposDCFpWCPifsjp1sWp5puCzC3imi6ioiNs7ptpXiaCGC9shC5swpXpRilpOCFpMpyptp5snsQi6sPiLC2iri8sjCLpTpWptisp4C4pCs1iIpTpSp1ppCqp3sDswsnpBsYpasnsMsAsspCsei5pBsLsDswsVpdCpCBC4iTpqsSiQpZs0CNsSsOiwCii3pnzyiis2sECypXsIiqigpxC3iOsQC9s3iSCIs0s7CBpYiKpGCcswCcsfs3srCnCyCViliEs3sXsUsiseiqifCqiwCwpmCesKpUCgiSs8CZiqsFsWpopUpLifi4C3CeioCBzysiCcCSsZswpFpFiRChCzi0pVCyiesai7iIsvC3sviysIpVCfCssCCpsipzimsVpaCnCBsdp7CIi3ziCWsXiazCpsihpfsnCbp2ipiyp9posEpaprptCdiyphpgsRCisYsSCViri8pvpkC1pSCOiFCMCmpvssCNCLiViOifs9pqsns9i5sJiKi4pbC8pssazCChCDC1i9iHCdzpiippiTi2pPidi1iushpPsSsgptiAiwispkswpjsnC3pTCppesECgihiFsYs6CYC0pTsoCBiWplssizpOpECRiZiMpKCcCjpaC6pzpEi2CXsciYpkCRCyCFCFiGpii6ibpZCXiYC0iDipsMp4pGC2iLiNikzDp2p7C4pnioClpBpZsXCezDsbCsClsHCmsuiisNCasgiapqsNi6i9iAiOCrCHpmpqCRs5iOCfsQi8CoiUs7CvCFs4CfsFCFiriKCDpasOp2pfpQCYCrCEiBsiiXCBifCTpAp3CUpjC6CnifCSptpHsdpUCPpuCYswCJspiBsVzspupepEscpYpas6CUCEsgCEsDsvimp1CgiIp1slsCCVs9zppGitsVp9sHprCLi8pnsGsUsopNsviLi7CDp2CxpgipsfsYsUCJsKsjs2zJiXiCiAiJpWsosfiMicpWCnixspCFi4CYp6sridpep6pmCpstiCiei7s8snCgzCiEiQCRsDpcpRsTCHC9pGpzpDsbpBCOsKi5pOibppscpzCSp5sXi8phiWiRCfCCCisasNsJswiqsFsVigsuiisWiCisCSCisoslsFi0zisQpvs0s6p1pxiJCSzipVpVsWiVprsusepCpgiYp1sBCyi6sBimpjpVsLC9iviDsrp6iRpRC0pLsEigiZpBC2zJpEsgs3C9iAC6sUiUCjpyidpFsyCKiJpesGCZpUp6p6ssi3spCVi3pJs5CLsLpsCYsLCCpWippaiepHi8CKpJiSi3CTpuinpVzpsRCcCQsliJCCCssCC5zyiPiECICkCnp8iFpLi3pQsfsIzJiHiKptsziLpKsbsus9pzCGp0iwiHiqCSsUCqpqiRp3pWC3iSCMpridiHsaiupwCPsqC6pJsni1iViKsHiECcCKixsCCDiliZsMCQi2CqCXiMiVphCqsdswiGpvCOCvCaCRzpiCphCzzyzDCJskCrimicsiiHpnCQsGssCLCbpWzys1sjigCIptpECGsnigChCvCMsCi4CzChs7stihp6CZCSsKpbims5zypMsos0sspXpzsHinCgCvC1iKCUsLibCTiEpQsLp6sjixCOslCXpnsOsQiusoCjiKsZpMiIsNiYC8CCpuskp9i2psC8C4iAzpCPp5CziqptihCDCAi2iHCeilCyCECApRpEiSsWpPi3CGsgiPp7CZCbsLsmiKCIpCiDsxsxCliHCIigpMsFivioCNzzCepviViFCViLs5CvicpfsciMsPC0iDpFswpQC4pspwC3sGi3pyiupyCuslCis9iDCnixiks0sii7iNC6p6CVp8pziksFCoszpKpjsFpDCtpDCQp4CfiXsEsUC1iJpApSC3sDCBsZidpyzpC2zDCcsDsIsGzsiOsRiFiaCUpzpQC3CxpupbsSiGiasRiNp9CnsjCipxi8pWp9pMp3CpCUisp5itsrCEs9sdiKCwpCpWCRpYi1iQp0pEitpZsdiIiqzyCMiIzzsjCqs0sbCppepRsXCPC9iFCisMCXCazizypqskpMifiosYCCsUiWi8suCPpAi4CSCYCrpEi8C9sos9pjpGCQsAijinC6s9stpupTpRseCqC8sPiMsJsGiszpirCesupSsrpIpMC3i8pECBCgsoscpppks9pcirC9CgCSzCszs7sjp6ipC2pmC5puCKiuiiiWs2ptprCDCLCxswiOigCRCksJssp1p6iPpgpUsAimC6CqiUsoCyCtpOsgCfs6ibsICDsHCVsMC5sLs8sQsWibCniviap1i0C0p0sepXiaijs8pdiYimpzpnsEiRpjpDiMpypKzDp4iRikpfiLpyCWi3Crixzipui6p9zDCLpxiqC4iGiwp8izC8iXCSsmsSzJpYsnpQsPiRi2sLCKsWCnC8ijCFipCpsxsDpPziCJihp4sIsNCkiKpzpxsmpViNCIpUpJp8iLpnsUsAswsDsYC0CNpNCJpCs9iys5ilCmsWsDCfsNp7pEptCoiGCbiniMzJC1CWsrsUp7sHCbpvsmCVp9iWimpGsEpwszpqCbCupgibs6iMCIsgsCCOi7s4iIsqCXp8CXikiapCs5pLi0sIici5sUigCliXiEshsTiupPibsYsVCPptCSCkCri2sDicsUpnsHpMCrCaidpuCuiniFCBC3pZCHzppRs8izCUCCsPCGpjiQC2zDpHpmp9ihCDC2pTpppMpupZs6CRibCkssCRC7iXsypVCrCKsACxCkioChCnCHCMp9igscitplpuiXi5CjsOpGiHCMizsqpkiBiaiGiCiGsEi9C0s2sjzCptsyCipXCYirikspiKiEp9iZiRpKsApzCupoCNC8iKsgCZCyiNsWsXskCYiVitpbzCCpCoi1pSiEpmsyiViqsUCvp6CoC5CdpWpPpls0pACHiHiQiTiYs6itpXi2sZCdippgiFpGpdszi7Cjifpys0sDpIikibi5pziEpGi2sEpjCLCeCAiBCxCgshCvi7CozzsFCWC7CHiXpuiHsHihszinixp4ClCIC3iss9zpp5iWivCJCoCfsRsFidi1suizCiCBpQi5i5pfssCMsziipNsVCOsxiTiiimCVCqpEC4sYpNsdCdprsOp1zss9s6sBC4CEChs6C1iosmCMi9CQi3stsiCqCoCAiEi4iiCWi0pQiAscphpGi5iMsZCKimCIijpnieiMsEipCppDsvpbCWs1pKsApzp0pppBCppls6sapUpFiapqCbCgpLpGskphpjpSiOpZsZpspLscp5ihpKi0pCCsCRpbCriviziUCqpiswimplsYCdpHiXsUiapwsgCHihzJsLCvsls1CICapfsBprCpzip9sTiosvCBCjpppipaCWCtilpJCOsosqiHsJi4C9pts0sTsbpWCRiHC9p4CMzpslCDiQstCGseiysRCAi3iKszpDCaCTsysSibCoCKpNpDijiZsisTpkChC6pSixC9iHCbslsAi4izCAiLsopVpSiSikptpQzppMifplCci4iuC3sSsIslslpes2s3iriZC1zJsHslp6ixzJiBCUsdibCzzzsDp8CPsuigiOCOpvs7sFi6s0pxCdC0sMsCihpjiSids4sNCcpVpZCMCVpMsQsvi1p7CopOpCsxilp8CLs1CwsLCuCFs6pLiksliQsGsrCsp7pgClCIpQiBsWCgC0pWpZsnsTplpRp9sdscCVsnp6pysbCBiFsJidCPp1stsHCRi8sTChCezzzJC0iYCZiRsssbsGsniTCPigsnpQsdpyC2paCaifpYsUC7iGCFsyCasmioiasTstCQiYpnpgCypACXzJiZpJCopnp5ptpbClikpppBiMCTpxpEsTsjCczCslsIpysJscsWCos2zpC2sgsZiCirirpCCIixiqpssws6itsQpNzCpbsmCni8iRsJpkChpmpWiaCJsTsECsiriwiApup8ippJsuic",7651));
    CAIChatRouter.prototype["onChat"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CAIChatRouter.js","insmiGiliLpNpFCep4Cci2C1CGiNiopizzpDiQC6CZsfp4C5shC0suCIzJi5C0CGsMzyCgposQiLihpBp8iApHCvCQsSCysmp9ilphpqCritifieiVssCeiTs0pGplpUsjspC0pUi9iUidiFsMpliPsmstC8pCC1C1p3CMCZi7sSpMpGiNC9C2iRiYiGCZCapiibp2sppOCPpYsVCciRiNC5p0iqsJp3insvC2CzpypgCpC0CVC9CVpLs7sUCgpazCpCsDsFpipzzJCLiwivChCvi4p4CGiJsviGpTCyCMs7iKpYp8pfsypNCgsCpgioifCGCRsIpVppsmCQi4sLicCnpAiOpnibp5CJihiopiChiUsYCUixiBpKCUp7sDCPC3pEiZiVCDprp4sCC8sMsmCopLCqpoidpusYpgCdphi7sMiOiqpnCliVs6papBiginpLzsp6sNCksRsxpnposHpRiXpRsjsSsMCRCQswpfiupRsJibCOpPs5CasGimCPpTsqClpUzyCfi0C5itziCPilsZi5iHpusvpsiiiCzCpYspiEsPpNpMC4CrCrihCqiIswirCQsnp1iopYprC8sRpJinCsCSCLiJiEC2CxifCIiKsgCQCqpdsdpliviEpzsypmpJpHpqsUCLC9iFCrCmCGpJsqitiUiEs4CAC6CppGiqiXCrCAsJpoCZCfiFsoiMpepli9C3s0Cwsvi2spCaiQidC8C5s5CksQsfiPpbiei3s8sSCsp7iWiDiECypOils4sAsLCpC0iyiRsCsepdi0ijiXi3izp1sOsaCDiXsRiXsBpAiBpSsnCzitsTsrC8i6swicpXiAs3zysWCUzzp4sHC6CuiUiDiQp1swp6pziSi2iaC1stiIpBCmpVp8pgibpMCrpjCjCACjsVCICxi7pnpqiMp3sQpCsiieC0i9COiFipC3sDpVsrCBCjini7sVinsACuCRChpypGitiqpXiKiqptCBijCosmsPC0zJCcCMsopys8s3sdC5supqCUseCQpVpJpEsCs0iSsyihCLsuCNiMi4CKpJCRpSCXidpoijiSCfiUsIiYikshCHsPCaiMCOClseCfs2CsihCjpWiEpyCHssCSCrspsACninsepVCQzzCNinpDiXijiPCQpXsHinCIpNsVCbsspFphpaigpRsYptsmiqCdiUC5pBidsniasWsVp7zDCvp5pYstCwsyCsCDsbiCigC2iHsqpuiKiOCrpSCesrs4CzpziRzJpYsApxsOiaiqiRiKC1susNsissCtiXiWzzpKpSpBiiidCrCZsLibsdsNsip2i7pGpDprCCiBiNsyCEC5pcpNs7iSiPsBpipwpCC6sjpSp2CAsOiLs6CqsHp2scpRCICjpOiLp6icC2CmCksCiCC8CkpXixsEC5iWs6iMikC6pesmsvpxslp3swp7pGp0iCCgCVCriAC7s4s8CGs2sPi7iqpzsDzDilp5p7piCSsXsoiECOpHCepezyCQi6iqCQpKCiCDpUC0stseCKiNCvCAips8s2CesXCxCjCMi0snCMsfpYsbCti3CmiysniBCNpdshCDCrsAsesKiwsZCEpFpJsApkinClsdsRpxCSsqiMC3Cps9s1sapqCXsvstsgsPCysEplCJCBiisvC8iniUCIpbpbCZpriwpgpjsQs0CRsfCOiiiJpICGpfzypMpWzCszsnpDsfpWiyCIiZiXiBsAsjs7iwCuCFsCigpHsuCfpipPC2C8p1iaC3pYCfCUsGpRiDzyCwiVi8CYsbsXs6CoicCyidp1iJsoCbiPiJpQsUsMCYCvCbpZiIsapUCssciECGCOsnsnzysXpWC9iqCHpnCTC9smiKsfs8pFiHiHpgC8CSCasMivCKsECjplsiCTpepOigCriGpSpGsziOCEitC9iRpUCfCCpTp1puCoigsHpesliXinihCozCsSCxCGsMCbpNizsBsHs3pciQs3iQsmCPCisDs6spiosYpLsyp1C8pAsyC4s6p0ssiyCozzCtC3pwzyiginCSzis6sPswiriWCiicC8pAi2iSpapKs9pJpoCwCrpIprpZCxCJCTCWiHC8C1iQi8s2sHiJixpxieCrsUi9s9CmitpBicpJCnpNpIC7smCAshzDsSsAzyiPsXC0pGicC0p9CzitCIiizsCRzDCkCnstCSsipKC7CYptCdsfCDCzs7iHibigpZpCpyClsMpbCTCLs9sEsdiGiIsLi4sBibiSzis8CRp9CTsbiXCQsVp0pzCvpjiWihskC1CyiMieCIiNpBCdzysRzyCJCksoCfiUsTsciviEpszzsviys2p0pUidzyswidCZiqp3C0s7C5snCSs0CJsTiAp1stsrpQsXiJzyiGiFsQp9s5p7pKs1sNiZinsICSsVpNipzpCri0CRsApqipsmikCYsOpjsCsmC7pnCbp8pXp2i5s4svCIsSsVsYstifpvp5pTpus9CrpRpJCApQiSi5CtCWsgihsSpqsipvphCuCusWi6iWs0CRiis9puCisRCJpLpXpqpNCXiAi7sKzpsDs9isCoitiCsTi6Cwi6pdiDpuCus6ijiKi7syCmCUpKiViwpPizpDCAsSitpKsbCsCypGzys1pVswiji4susaC5phi1stpXptp5posMsBp7iMpJpvCGi5CuipsWCEikCkzyslpPihicCPCniFpvpbCTs1sIiyCBpii6pRiLCHihippRCvCVCtiCsXsJsYCipBpwCyifCYCwCssGzzs5CCpdCVC1sMp3sDpIsFC3C3iHpHzppVsksdipiOCiC2iWivCbies5iUiVpCs4zCioiDzDsRiwpTzsi4pECspspoCcs0iSCksdsTszpiihsupiCmpzsSpJiWpUpzpVpLpdi3CcCpsfiICXsFsbpPi1CZivsFsuCGpFi7C0ijCopriWiWpisKi3iTCxpypXsJC3pWsXiyp4iFCQC0iipvCBiLp3C0zCpoCosZCXppCNCfCMi5sLi2CNsFCxCIiqixisiBs8CginpNp8CqCFpis9C7C6pzpYzCstpGCdpzixCli0poC6pjsMsliXswpbiuCNiOijibCPpMpTpHCrsxpuCKpJiNpjziCWiLCwirC2ibs1CciSCOiBiTsJC1iIsUi0s9ifi3sNCyigpbCui6iksei5zzzyCZCCsLs2sKsTi3s2C9p5plsjpViOsgiyC1ixp3pesUCipzplsbpjsCpwpAiCsupVCppVC5C2pSiaiyCjpFsGidsUCKpwpTs3pDs1iBsWsTChsIpVC4sniWiTs4iXiqisCysHivsrsdp5CzsXsapyiGC6sgp2iosDs4CniditpOpvCdsliWpOpKCPsGCRsGi5pxsSCQiiiJChCQi0p5CmCIpbCbihpdsHiYpozyiniwpDpGCiijsBsLsnixsDsoCmC5sFsIsismiFpCs2iii4pbs3C4pjC7sriZivpnp8sSpRsvpWilCsptsFzCphstsiiFCXsFsOiuzsiEi9Css2iipLpPsrCBCSiOsBsJs1p9igidpJCCpZpziUi5pDiKivzJi9sjsUiCCKpxC9ixsvi7pQsmipizisCrCAzysDsIpFpts9CEsvsZihiHp6CCC9sWC7C4sTpsiyCUCviis3iSCizDCGsupwsVCnpwiGp3zsiVpApLCNixCFCusQstplCDsvCDs6pZplC9iwsxCvzysDsXCIpPiMzJCNp0pCpVsws3p4iRCHihC4sKCPiuiCiLsWsusvp4p0CjCpCPiAiPirCCiRsJpECRpYziCup0CipNiwCuiZsxiwiuC7sRidsPsvi1sVpFpvirs4iCpOpspqiwsoCDi7sACviaiPCWCfC5srCXCHi6i6pCs3CRikiMpozCCGiwpAsQpUisi1sJCQscCJi4iKiDiRCeiJsKpisksqiRpGiPpBidC1pzsOp6CDiOs8CviSp6pEi2CwpcsyCzpap2CGsniCsppWCWp7CmsypEp4CNsxsLCmCjsnpzCDCTicpYCiigiIiiCyp9szs7CECqzJpQivCZCmCZCoCXCesNsSijiksxCuiACvCyCui2CusGiMpXCpCMCOiOirpDzsiSpbspzDs1zyC8pVpWCUpEC5prpzppsms8sSp0sKsICLCpihpNsDiQsRC6iuCSsbCoiCsFpsipCNCupLsHiUCPpNiCsushiMili5CFpRinsZsOCdCxsppiCfzCpXpVikiepNs3sdsZsGC1C4sDilsizspIp4CxieilpspVC2ChiCscsKCTiDiPzzsECkspi7pLiJinCSp6pHpAsHsmiQpHsKpQzCChp2sjCQp1pozisbCRzCsJiXpRp4CHiwC4CJziCZC8zJCoCup3pYCtiRpjsKpvposysKi6CgCwCvpzpHsgs5p7pGCoCLCbCHpkpIidsACyiVibsVCECViEsSiyCnsEp8s9i2iFsbCsCxixCMsYzipCCwihC1sniyihiDsfpGszCBpmsCCoCKigsjCDiRCyiVi3sspnsDp4CYsli4CTpjCbpRi5sis6sKsrpoCKCcpjCWCMsjpuiDicC5pPzppdihpIp1sBiBsrsKpWpgC9p1i1iQpbCZCXsQC3pJijChCJitiysWpsCzi8i0pBi9iGC5pjpyCQCQiJCHCWi5iuiQiOiisppepCpup8iRsKirsmCTpAsWCOibiozzCUCxpYpsCkCpClicptCaiKpasqzJpHpiCziqilpRpxiVsIsLi4iOipixpDCxiWs5sapgzDiMikp8CIsypCCTsqplibsNCBslCrCkippGsTCQpasMCXs8skpaCOiYzzsdsIpnCasesHpGp3prCAilCpCmiRiZpEsYsBivsKiTCICGiEsxsfs1sXs9CniUsUiFCBC4ppi9CZCDCBimC7sQCtstisCCiIiEiWC5s5C5zzzDiMpTigCHinpsCYi2idstiNsoigsxpOC6pcihzyi6pkCzC8pZssC5pLiXiNpcpSpwzizyiWs9s6isphi2ihCCpTsQpMpbCPC8Csscs8s5sjpBC6iJsnibsmCBpxs1iUC4iGCSCmCEs3siphpppypGCssas7i7sNidsYixsksQi4sjCSpssuivsRi4s0ppses1sLCVzCCMiKCeslCHpVCRswsSpWChscirzCiFs5CqzzsfpmsxsJp3pksciJswCasMCiiOCviDiGsUphCOimspC2CuiepyCAsgivs8C1sNivpSC4pqC7sGsqiYCBp1pziUiAC7ios8pWCIswCZCqppCWibCfpsi9pDp2spsGCgCziksSsxiJsXCBChs1pkCosmsSCZpCiHCPsiiRpNCoCDCWiIitpqC5CYpYpjiusGCNpWsHC6iAChiypbi6pqsZCHiLstCpsQsqifsXpNCssEpGssCQi6izzzsFpLsPs6C3iUijiiiOiSCyCLCNs9slpdiSpICBsOpPCZskiNsFCBiHCvzCCQChCgpJs4C8sPirp5sTi3CgiupViwpTp4s6s0ifClCppTili3pECupVsLCOpLswiUshpvili5iSCCibCPswpQCbp2ppiRsjsQsesTpysipEi0CRClChilCHiYs7spCXs6iMCpimpkpdszCHpLpHsHswsWsds8pZpGpFsNzDCECTpoi0p0sziwpniksrpRpECcpICAiBCoiCsgidpdsPi8sWimiZp7C7CppsCcizCAiIsnpbiMiiioiOCBCjpcs1pwChpZp8sbiLsbiCscpWCdCECIsdsni0p9i0ids6pisBCyiBCBp6s2sxswsGiGCFCmiZCeClC8CmpWpMpns9s5CiiuCxieC5CZsSiisNiNsti7sECdsnsRC3Cks7sesWCLsjpUsmCEsDCjsGi6pLsDCpiqpXsLs5ibsissChiisuCVCtsfCNs9ipi9skC6CYCHCUpki5itseibsmicsCipCyCXCBpAsDCSiOsACVCZiSsQscpZs9CuCGp7i7iCilCxiCiVC2sHC7C2pap4Cbifsmi4spCji6s1plpgpYpFscsozppUCYitiipTzJs2pPzCzCCopiCTsDsvzpCDpFCwiei0sRs2CAips4svpKi0C6ilClCPCzpbpXCeiZC8sbCts5pzCjsxibCGp7ibCLC2sWsJCVsViqiLC1s4sBiMirpSsXprsHpPiXC8ifieiKsMCHiCsNs7i2sKiaisiDCyCxiOiVCxsdibzppnpSskiipCsIsOsTpps7CwpwpbpACazziDi9sUptCLs1pAp5prsgsKCMsHC9C4CMp3pVixsYChiCiIi7ioiBsIsuspCNi8sep9iXpLinpcsusspHpjiLCdiHzCpvpds4inpzsNiepkiPpjiIiBswp4iHp6sHCcicCVslpKpoiqsiCZsNC0iQiBseCNCBpJsHicshpMs2iopiCIi0CeCmCuCypICesFp8pri7iZiviNsKp4sBs8pNspzsidzss1i3p8zCiHicsxsWimpCsYsViOpTsJCLplixCupbiis7iJptpYzppRCxpOCPsICEiopBs7iEsSpOp2iKsmsOiJC7snpUprs0pipypBsHpJpFi7Czs2Cvp1iNsfsMCHi6iYpesUszC0pesisbpeiTCWiLpgpCsoibsCiOixzziezziQptiWiypisksEs3iQphi1pSinCFpRC6puCYsAiLpks4srpcCqCGppiEprimCHslirC9iAiEp9iFCJpNCSpQijCriCCjsCsLCXshidiZCCCfCHi8i8pKpNCyigiss7CYCmswsVixsisPi5CJitias4pYiRpPsaspsGsNCQzip7iIiqsTsYzCpFpECcs1sOiRiSsIpwsaC8COsyiHsJCfzDi8p4iwpRpQCRiSsECkp2iUitC9C5CqCwiQpQiRpwCtskseiMCICBs6pspTp0sLsxihigsPseCesQsEzisVp6pspbi0pbs1p9CppPiMiHpesdpJprilp2C9iFpTpBpnpgplsIpTiXpQptpki7CwiXiOCasACPspsgpFCkC7iis3sii1zssop1CKCIpxioCpCxCjswpTCgsIpWpsidzysyCriepCCXscsYp9pMCRs4sEpWi2p7zCCRsmshp7iTpUCeClsMi5CLpRiDpSCVpGCIpOpSs3plsNpIsxCEsniOieziskiXCAivszp5CBpkzpCxsPsDstiksBCJCRits2sZiQswCWpbC2ijC0ibstsQp7iVszpHCLCbsqpSimC2CBCqzJpzCgpNCACaiCC9CWiqiepiilCYpDCzixsgsSpdiWpVCAphziiZCnzzzDsCCfsYiPCsp6sAiACfisplsdpDCkC1CZCIiTiUpApEChClCgpipNicCKppswiysgp3C6CqsHiWilC2CpifpusTplsWCXClpFCSidizixpYC1i4CXsQsqsJC6pIs1iBCnpyihsjsmzyCqpHiRCjsUCgCDi9pwCQi8s6p3iKsQs6CVCfp8iDpTigirpCCgsHzpsQpVsri9COpoCkC2izpuphp3siiiClCapOiUi8pbpOCUsOpGCVi3iJsUpCiPpesTpNiNCnCKsoziCUpdpDzpi9CFi2pszspVsusGCkpeC7saikiaCsilpWpxsQpbiUpdCTiPCNixpIsQs8CZC9CsCKifsjCsC7poieiKiophi2pWskCjpJC0iQCJCoCvsrijsTsIispqpYCKCusCsSCji3CXsViQC0igsBi4stp4CmikC1CDsFCgCqsss6iIsOiEimiOipCJCIC9pgidszsPCosKzisZpfpnCvigC3p3seshiEC8zpsZsypRikibChsos7plias6i3iHCTipCasJsdpkiusTpii3p5i0pMCbsop5zCC1sqiYiLC5seibpgpJpzzisfszpBpbCVipsNiPpPiui8pFpMCppgsFisiRpDsWsrsMitpApXpNirCapQiyiOslipiEpCzCsKp4irpSsSsmssCEpHsts5sWspCOpii2pACMs5pFCLCYCcCRCUC5sCiHpjsGp4suCizJCmsLCOiGzziRCCCOCaChzJpwsHCGski9spCuCrpoCGsCCwCzsEiCCZiuikCBiJzCCRshCbpriDpHpfsMizCnsziSC3iGpYp5igCmpFsjsBsfCkiwpDipp7iZs2s2iTifiKCIpoi8puiniSpvzyieipCWpspKs8sPsfsHs2sliHCsCxitpLzsCACPCpsCiUiksIiMpZslCwpvpGsVpIs5C6sop3stpdpEpyCsCppFCDi5pwp7s5pqp7CoC3ijiYC6pSCKCKsZpYCnCGiaiszDCdsCC9p4CxCfs5Cws2sasXibiUi2C2iKstiEpwCsiVsHsmiNsZszCKCxifpzsmpRpxsji9C6CeifzJs9CjCiCCp6sqi7sNpPsBCTpKpspFiViwCOpXpksks2iBsSChCtp3CIieiGsxi8iRCesdsPslizi2sdsIpSptCtpUiSpppUiUsRi4ilCKsiskpQpziXsICbCCsJpOp9scibCsp7sPsxp3iti8i0pxCXCMpxpspbpSiGi9CAiYCeCWs0poicp2pCslCUspsVp9sWiGskCys0pmCOCnpdijpKigCjCai9ChpQC0CfsUstiYiisFpGzDiRsFs9zysjphsJiqpTpTCXCapHpXimsxCkCui7iXsAsWirixsrsssfi2CPsKsfCcpNpRsSsrCmiSifseCyCRsMCiCip2CyCCivsLpwioCIiwiSiusozCsWsuCwCDpvpzsJpWpLsZi1iLpqsdzziIpziDsViTCai2zsp7Cyi8sZsvsUC1zyCkpxsWC4pJsaiwpjitCwpdi7i5Cup2iLsSsvsisJpECMsms9CTpjCJijplpNCuCbiiC4sFiVsqiQpypHsPisi5ppsaC6snsHi5CwiYiEsainiUsTijp4CXCuiBzzCZCdpjsDp6iailCss7slsRC8p8iCibi3pmsiCwCVCJCBigCqiMpYsEiWsKs8iniciypxiQslpTCjzssgpSijzDCTpQCYs0iVpLiviqp9pKs4CdskpmCKi8iZp4CXpLpPCLiOsHpKiys0iJpJzJs9slsRCHs8C6iqiHiDpos8CNp1skpjCspeCWimpnpeCPzyiGpUs7pYpcpEihs9CXpIsKCGC4CTsepei2p6pdigsIpgpsC8sXChsUp1p2CBCPzsi8pKpwioChsDCwpSCBims5CUi1i4itp2CVsxCHsxigp0pVpPs6C1snsbs1CCi5CKirsliSiHszp5i2pqsQiLivpRszCPpepPiBicpoijCIpYzszysgpsCHsQsYCos5ihiriksNCBi5iGpsidpri8p6iispplC3s2ioiaibieCkiMCzi8igC4iviOC1pus7CEiyCDs6iYsWCEzzs4pLs0CQC0iKC4C1Cis1priUspswsQioststpRzyCRpfCGpSpaCWCCCMC4pzCFplpbsNsbpns9p6igCECTsUCjC7ioCPsKiXCVCVCzsesMpppWi0siCDpCp8i8stpEp2pJp8iypYpkC2pkskiMCwi6i3pPCVpminpBp2CbsdCNi8pNCtixpAiVieCViTCpiOsdC0s0CXivpMzyCAshCEsPC6irirCSCoplC7CgssCjiwCksWpJsSCai2i6s8pHsICQCAphiHs8CCC3p8pnsOpvCPC6sTphCgsCCfpEidpEiIp2iRiUsYC8phscCopJiTshCfimiWs2CEsjCrCQCjCMiOidCXsqifpIivsjpqssixpepGCWpSCnigCSsdpjicivpJpcphsrCkCqifsmpKiMs7CeC4C5zDpYC9phCAzpiWsasQpMCAiEpIixpPClpmCDiypeiKizpJp0pfsBi3pNitpqpop7sbs6iyiDsDpXCws1iYCusFpypKpzi9sDC0php9pJilCHp2s3iosIsECLpriUs1igpdzyCcp5priTi4ClCApVs0sosApYC8iKp3i2sgC7p7igphpfiKi5iOsQpJp8sspmsJCWsUC1pPpCpisvCqiOi5s6pliwsQpcpNp3zypGipCdidCmpysasJiZCopJCjiUzzi3pmpnCZsCpvCuCDC5p2p9CUsQCMiEibCFpKiTiYiYCZsZijp4pkpdppiYiYCUi7C0CfseCZpcsxsbs6iRCMsDCzCxCyCeCXsppCsBsYpBiZiHsNpQCEpMCZsWsUpcCNinsQsYpip6Cmihpwi4pdsKCNi4pKs2CMpSs6pUiTsFiCp1iusoiQC8sQsvieCVpFimCEC3CjiPiFC8CBsbi1zssaifsRiipFibCDsuptstCGippLs0iSiZinzzpsiqshiQiVsZiECOizsQCfstp9CnC4CwzJiUspirCwsEChCBsHsgsGC7CescsuiHszpusAi4i1sYsdC4ibs1pfpqC1sUpdCUiNippMCZpqCuirCXsWpNpls7p2pyi4CXposRCvChCAs4pesuiOi6s7Ckins0pfiui0p7pbCRsMpoCbicsriliBili4iYsosisniwzizCsksRsGpNsrpgCHpNiyiziAC6pspVp3ibigsei8i9sPCYi3i7paCriqCJCMifpaCksxCHscpnCeiuCuCXpJs0sps8pHsqCFiCpgpCCwi9pHsep9sVsFspsosMpWixpcpTiKCZpSCaivCDC0pBpUCop7pNsrChsqCACLCKC5sqs2CdC9pNCyipsjCWikskpvCopji7sdC2iOsNC1plCdzsziziCipgiHp1imiXCxsBCniIzps0pSCWCOCVpHp4sGC9pJsjpHs5ipsWCKsmssixC8s2pqp1pSs5zss6CQphsViMiDsLCVpxs9sKsyCtici9sjsvsDiGsisXCXshitCziCpUsVpaCCixiNiFCvC4phpUi7sJCLiJCaiPC3CLCmp5pcsuirpwpFChCLCmiSsGiCsrizscpViziDpMipibsuifiGixpACSs8pupzi2iTiAplp3iGCiiGCiiupTCFpKCfpQs8ptCSpys1iNpyszCPCKsyC6CLs6soCysIi4p3s4sbpQihCfC5CYiaCeCwi1CgidCMpKp1CYsfpPCxiUzCsLimpfCMicpNzysCzyCCiiCACozCC2CMCKpcsnsRzyClC3sesai8szi8iTi3pFp6C7shiiCdi2pspnphi7pzpKididCoiRCHpgiksMpJCHpvpgCipiCMsVpQiTsQpIsdiCifpTpfpRsBiOpEs8sRsLiqzDCwiQpfC1zpiRsCCvp1CeiiC4sbiwsbCCsPzyC0pVCKiiswpZp2iypysgsyp9iGClsWitsApypZpUCUC8sfi7pop8iIpBi8ppCfs9sRpQCfispyiRsEphC2sUpIiyibC3CpiLifiNCsiPiOCzi6sniqsepKCVCYCezzi1pupQCpiEC8CapMi6CdijpEpysnpcsBpXsYpQCCp8srCDsvC9sepkiLspiDs2ipiOs1zsC6scpYCxp4i2C3s4zJpWsrCzi3s0ipsep7iliJC4ibpeC1i5p0p8pPifp6pGsvCtsvCzsKsfCuzCshpCs2pDCxsgC6iRpJsRpFiWioCgsYiLC7iJpVpzCFCKiWihssC7iis2C5",10230));
    CAIChatRouter.prototype["_connectImpl"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CAIChatRouter.js","s5iZi2zJsTpdpXsCpEzpCpiPC1zssdCBpkC7sdsZimChpVCtsupVpxsMiQs4s3s4pziOCpCaiis5CEiEpYposLswCEC6sSsvCWsCibpAsBCeiwihses8iHCgsNsCCepIClp1s9pjsBCHpyigp1iLCapNixi6Cvpfi6iripiMsQsBs9i2pUsqsfCXiJC9pfzyi3zCsqs5shpFCvCUCusRsSihsrsnsjCtpUCKiXiri7sKCwiisCpcpqsUCApFpFC9insaiPsTsBs8C6puiHsvpPpmC4pSpApwCzs8pnipCtiMCuimpwiFpop8iipbCKCWCPiGi6iIzssNpUiliTzpCUiNpNCUCkC8C1s4pXsAi1iPpbpypUs9CSp4iHCriVi0sgCbCfizzzCViSp6pci4zsC7iJsciRzzixpcCmiiiyi5pDs5ijifiZCWCEpcCUiKigiTi7iEsdpbiXi0iMpSiMzisgsViiiYC2i0CYsnsNpuiZsosOsYCwiSiLikCJzDiMsMp4pwsjCOsyCvsYp5slCYslCuC8sDptsJsRCUsGCHp7CopLsMs9iPsVp3zszyp6sMsTCvihiYsDpxpqCYiYspiOiYsAppsKCxp7pgsFpbCXzzszCephsIsHsmpWioCopCCKiWC8i1iNCqpmCgicsIiss1i8pviri1skCsCoC2pRCCpvs9sGpRCGCZi2plsMsTpupliDiMiJC3ispIsVidpusGpIpuCNiriTsrpusLi0iDs6pIpbpoiDpGsdC4CEiwiMpKpBCGi9s0sQpNCpCbs1CKs0s2zys4C1pDi4CziWC4iciiicsXCFpuCMiIsvidslswiQCgzpCppDplpWCririwCBCVpYsjsspPp9i6CBshpMi1ioCNCusWsgCACVCnsupepIs0pzp9pgpmCmsFC0CQiCC6smpwChpBpNi6svpTskCWCOCszyiZC2poCfCdsZCNsusACjiKCLsUCcpFiBphi5pBCUiBsrCECcC3ijsGpzpoilifCWppC6sXCDppCxpLsnCVi9susLC1pQsBiMsvCMClizs5iZs1s6s0s5iSs6svidpiCds6icplpwCoiGCSiasWizClCwsTpWCbitCfCwsisHikCnCEpXCiizsCiKpliXiop8pFicp0iECGpQCriUCZC5scipiMiGi2isipCTpapWpAiRiTppzDiBpcsiiLpesTsViKCoiDiksXsrilpYpkpls5imCbsWC7pisCs8pnpmi8iEiPi6CvCyp7sTiqinzCpYilivp0pOpBiopSiwp1iDpjioizpbiXims2s3ikpvsapUiGp6pSCTCbsciwCcsZsCpkC0sfC4impOsKC5pOzyCCpCCQCWCKpnibiDiCCKp3sysbs0COiypDitpAsmpXsYCtC7sKi9Csp2CwpkziiOpiiqCzsBpHiVpSChpmpFp1CKCqCcpAiLCBCOp6zJCbCfsosDsKiDiWCoili2CuC3sJipCIpdCDs8piC5pdiIsxiApdp8s7iDiFCsCaijChsppzpesoscirpGpqs0p4s8sKpMpAsJCTiwpwiKidsMpAzysPC6iapFijsSpSpHscpmsIicszpVCop4phpGiUpupuiWCksoCLplisscihikpoifiIinpKsiCFsBCPCGs7C7stiDi3pZp4shprCep1Ccp4CPsUpozCiksPscCqi3soCmzDsdiNiEsCi3iZswsLs0swiOsVs6CDzyCvzipAiSs2CMC5iYiysBCIprC2pZshi6iMigC0CwspicsZC7pDsuilzJsaC0CPieCuCJCtp1pBs8CXCrCns5iysjCSsIpiCRp2ilCpC3s5C8C6s5iJzipesrsLsmsRpei9plp0pHikpAziCUsPp9i9szsZpBsdpkpwsaiTCAsbpTiIsei4ihCIs9ixslzCpuiMphiipcpFiBphiysEsIC1C2prpJC6sYpOi3CppHCgp1ilzyCrswsms7C9iYCHpAsZsSC5CNiCpGCaC5sBCdpHChpCCqsDsnsgseptCMsrCSpjpNpoClCNiOs2CssesYpWpppasTiYsupMCDpqCOihsfCDC6zDsXC5ptiipECXsoCcsDsspopHsjieCQprp3sBibCgpji3s9CAiyiwsrpcslCNi6zJpBs2CLzysMpKi1CesTzDpFsVCIzCCJieCzCAiMp3i9sTsHsaCXiLsIieCSpCpUCVpDC3pHCapVsgpXpFpmpqCLCLpZpXifpZiTsCCopji7p8zpiYsaC2iBsPiMp2sVp3sbi7CzsLsIpDiTiKpMp6CNiPpGp5sbC9sZiRzJCuCAi1pLsLCDsSCnsusfsYi5i8ivsYpnsLiUi2pwpOsuiAs6iqCtsjiJpOsQCNpfsYCcCSpepdiOiwiEspp1izsOCbsqp5sdi1ihp1pHiICKieieCupCCFsGsHpvzziHsnsFi2iQpfpSp1i8sxiQijs6zisOCzsMpTC2s6pDpusCspCMsfpTCfCDCtCmsrsYCJpesSsopZC0pminCiCFpsstCkzCpPzyCnCci7ivCxpEipiNpKiepyCjiLsWixski6pRsVChi7pazssGChp1smsOpdiYzJCriNiniBsWCeiSCAC5pZCWiWi1CKCwCapysZsHirCTivsti9sJpMCZs0p7i5ikpbsECGpPsgpzsdiZCBCoCSCKCJpcpki9s9sGiwiRpDCgCcpSCqCnCpCliRC0iTCjpfifpnpniIi7iWsxilicCdpfpUCfi5CTpFiZCZsYCspYiQClCcssiEpasWiyspiti8pqitpAsrC3ibCVilCZsRsqsuiUp8CDs2izpUs8sxpap1p6CkC7iBsmCgCrzCiKpbzpCvscCVpDstiTskChp3CzCap7sLiLCKpSiLpzCFi6iYCbCtsaCKszCrpdsssaiEsKs7CVCRiQsYpDCRCLpOsnp4iEsSiHsZieCXidCKsXseCqp9iGiwiHsjCiCZpusepRCcpvszCcidpQiPpuCgsmiPioCGsXiVsmpIiwiqCkzisapqpzC7sNsvzsiWCEsJpRCVCzCAsGiVCtpyiBCyCuszslsCpAsVC4i3CIsrCPi9CMiLpPstilpRCHp7peimCvsaCPCbiViAikirCwCyiFCfCIi8CZsBpECksUzssrsYpICCsXCIpOCmptCJCGsEsisPpnC4CyihsBCxisivivsjsfp9CwpFshCICUsxpmpwsfs9s8pZCAsfiNCrpBsvsQi5pZCSCvzCCtsfprCipjC8iwibpBpksliUp7sBsjCUsMCYCoiBChpvibiEpniDiIsgiCpzC5ifsQsNCasZixzps1ibpvCaiMi6CnpHs0CACkCZpvixswCXsHi4supIsViCCKiRCBpcplC6idpviwClzyCLCviiptzCiBCCsWC8sgiKp9pzpwCtCisdpMirCWCiiysXCnpJs5p0pJCbpRCMpNsFCdplipC2ChiUi9sGpnp9igi3Cwp5i0pyCtsApLCGpZpGzCiEzypNsRCJC0spiOsjslp6igsBCFCkposZCnp9pJs5iGiGioiGilieCps0CCsqpjpgp7seiwp2ifsdibsgCps0snixi0suCJiZzysfsopVpMsviXpwshsIiOpepuCopHiqp6CJCtCFpzCepFiqCRibpCskp0imChppivipp3sNs6pOChpPsTi5sopPCTsRiAsACFsUskCnCXs9zsp2CapyiiCiCypep3CkiZpVihsJiZzCCOpIp0CopBpNpqsupQpdsaiSCDCDpyC1iui0zJiXissXpxsjsCi4sjiwpLC7CxiZsACGC9sJp9pusQCLC4s3C6pfsosciFs5sksjiFiYsnigs6i7i4CjsxplpNCXC3pmpRChiKCPsNp6CEijirCCixsZCYiUC6CFCmCxpisNCCpZiosUp5susMplpCCviDpQiLiQsypHi8Ctp9p2pVs6pqpsijimsHs3CdiipvzyCKCrpds3pLiKipC9sEsnCupRs8iHsUsrp3sdziCNijizswiSs1s3i4CLCSpIpfsbpSshibpGC7CjsApPsviapCClCGsOCPpvCBpHiVCysbCvCWids7idsDzyCliXpwChpPs3Cls8pqizihpsimCFsVsNzypcpFsMiBC9pMp2pQiiiopksUpCCTsYsGiyCsCXCqiApcCSCisGiUpPiXpczspciZCSpFsipoieiwpRCPCyCtsEiziupTsDpLCUCwpmpssWiApwpDidi3pCCTpUimsRi0sWscipCnzDs4s5smimsGsVzzizsXiEp1sap9sqsfscsPpep2pSzsC1sHsjiNCoiWslCrsEpVs5s6pwCYp1iMzJiopQCTp2pACkC0CJiasjCEsypTC7iFCTsQifpmixClskp4izp5CHikCQivCTzipfiDs1pPpeiCCfsiCbpksNCnCpCBpkpTCWpsCmCVChpsprCLiPpFC1C4i4iAi9pZs6snpPiHp2s3sNCOsKpSppsXCgpSChpriUpEitsiswizsps8pzsYpxsusgCWpOpkCfiZCxigCFsqpLCEpgpvpYiksgpSspiFC8pdszpUCICAsPiFiJposqpjieCqpMslpLigsXs9CPi0pBsUiWpNsdpLigCczpiGixzCs7Cgp4p0pupDsPiRslsfCmCXCqsCpvpvCCs2svizi6sMpKiViIiUiwsRsSsMiJpUpWiwiJCECApRpCpxiNpiCwCVpAi1pnzCpUCqscCcsVsACMs8sppaCLi4sIs2CYsnsDCcitinsRCMCLsKziC2CpsQzDpwsrsFpwzsCuiqCns8iwstCEp7i3pYp5iqp6iWCBi4sZiDCyixiwiGsliOzyCgiPs4iCsTsyCJsJpasSsTpICNpZiRCfpppmCziqzJCrC4iECXsNs8sCzCi7soCYsCi1pUC7pbpRCuCDCPiTpRslimsQpQCniGCBiTpZsNphidiCpOphpWs0pdifCTispwi8pLiXpcs1p4p2pXsDski4sZpziDpGCxpDsdsfsqCnCipEsjsMpPshpOp5syC3pzsOCnpjiLsVsAiyiXs1CoCBptCVCJsXpDpfsRCTsopQs4CxphpVC5CvpLCGpMCipmiwsRpKsaiOirizs2i2p4sPsvzsixpvpbC5pkpzC2pGili6pAiICXpviAzypwitCJpkslsvi0CJC3sEslCSsRstsGpNsxCOitpgszsqpSCapLpwpxC0i2CjpApBi5iDpgsgp2pcilzpiACms4pvpxiZpNiDpbsrpUphp1sciNiKs4C3CApmpvCGCwpKCWphCKikpUpSpNCZs8p4CZpviYpGiXsrCesZiVC8CwC3pAshCJCbiJCyibiACmszCRzzCXi4iGi8ilsyCZp2ibstCfi2iIzzsdCIszsUp7iMsQpMiDp0zzicpxCliLsuisCGi5CEsLpQpQpdpjiHi7CzspsYsDpQsnitigpZCnCwiszDifiypPs3i5igiVpSsMCkC0izsGsPsnsWzzpep4CzCFiWsRsNpXpOsJCrpEp4CSCwzDijCmsICBpepIpSsWpMpdi2p8pGsOidpQpEiRCni2pTsaicpQsLieCtpbsMp5i8pBp2CMiMiUpQscsWsuigikCSsuCTimpQsDpMpas4pviDp8sMs3i6CMsgsQiHCbipsUs0CmpgsviBpZzssHCgsBiyzDidCwpjsJpBpGpOs1iMiYitCYCrikiXpbses0p6CGpFCks9pBp5smCapHCxp7CYiJi2iGCcsQpMi1iZCwC2sApKpLs4CdCfiIClpSpiCSsliliGidCBs9iDsAiPCksop0pbi2pvCDinsxikCXzyCQsRsTiSp1CTp3sop8COzysji4stsOpeshi7CasaivsCsbpBC7sVpzsUpQiOpLsICksOi1sviDisiysnCRi0iKsAibCXC0sNs6iUiDiOilscsbiyCVplpoC1iBspiKCYiLC1CXCdipCmCNiOpxpvC8imiqC6isCAiOC9irpYp5sECwpesrpGp6p8Cfi3ChpSC2C6susMCdsxpbsisRsECFi2ChpuiOiAinpLCniziusqCSiTpVCRCNsbp9irsXp6s1sVCyizpKCZCFCBpWCDiZCPC5poCsiBCYp5Cri2p5i0zis5CspxCVCbsksjC8ijCtiAi9smCBzis9pGCRCmiPCVp4pRpbplpFsssKijp5CjpniICQs4s7ieiXi2iACip1skppsEsGCaikinCxCcpYsBCVioChCbiBpasBsqzipACfpsiKpRiYicp1C8s5iYp9s1i9sGCDp3zzCICEpRCyzspJiliLswzssMiSpkzJsaC0zysGpKpUCSzpp1sfsqpGiRsWiQs5zsibCap9s6s2sciEpUsbsCimphiasQsVCuiupMptsBpNiuitsZCgiMpfpeCkCtifpgC4iyiRsji7pWsSsos8CziEiJsesvpGpysRsNpQiVpGClivpZCZsQiSpWphi7sJizs3ziijsppKCwiSsvp1sMsCsCCYpypGslskzDCpsupriPpYswikpGsEpypDCRpMiWiCCMCsCDCpzCpApIslpHCMiss6CqC7sdpKitzisqi9pgClpfpbsBCXp9i1CYpOC8CkstCOipsip8sMs0ioCtppC0spCWpzCGiep8CGpJplCosCs2sgiisgiVCBiep9pvipCJsOiyCRsqicCVC4pDCapiiLpgiasjpDsgs5ispBiCpjswiqpqCzpNshiwCNiuC4CQi0iECli6p7p5sCpZifpSi1iaC0ijilsxCisYCupYpLCri4CPiNC3iVpCsys8CBsisTiqpJphCDpJCuiGiBpKsXzppmCnitCCpfiwC4iziBCwCUsfs3iCp1iepWiXC5sziNzspdC3p0iPiGsoC7CwiLsssHsEpOCuCfi7iGsxpjsAspCkpisnC6ivChisiaC8CeC1prikp9iDsvpmiGCbpzCSiDCcCjCkpli8pBsHi8sepfsDsgCrsAprsgCLiNpOilsOsEpjCjsbCysZC2p7sjiRzzCViPCAC4idzDsZCvCDpUpYCVisiNiCCzsxi8saigpZs4spCdC8pQCciep1izp1C3iBsxspCBsTCIidpnigiMp7ispqpepoCEsOiWswzJCRptCwpFCtiriWCUCcsfp7pOiYCBC2sqsdpOphi1iIpIijpmziCtCKCvpsphC7iisPs6icsPp2izsVpKi2Cyini8scs2CrpmsdsCiTCHiQpWpBiWpPpNsfChsns0CypaCspGpJCuiAi7sxzJiOpBiRpWsai6iIiVies2CApOioC3ClsopApSiWsaCKCrC1iKCsCLCACFsZiEpQpSs6seCmCWsjiSs1sDies7i7s2CJCDiFibCRsBiiiBpfiQs5pupRs8pcs6sypBiciPsVC1p2ijpdCisFC6ifplskiYpUsRCRilsGpCCTzsCAC0p0supCCEi3pSpLspi9iwi2CnChi2pbioCOppilsUioiyidippjplsJsdsspXCFsdiipzCSCKprp9sXCziJipicCLsvsopepPCyCfCjCdpsCvC5iRCWpBsdiksaCvsPCTCGs9COs9CfsDpGpyi4iYi7insjpCidsFpMCAsaCXCJsmCBpPi0pcC6pRspsoCdidixCWi0pIpRiTs3p0pUCcC4iWs9s9Copri7ijpziepTpbiSsxpkpPptpYC4shsbpLsnsApaCWiViaCSp7pesACvpiCSCgi7CNCGCpsJCuCtpvs1stpsp1CfCvsciIpOstsUpFzps3pSCwstp5pYCrC1pIsJCYitpyCjCZC0ikCTpmp7s6iTicCniVivsapdsPsppFp5i3p4C8sDiBp7CrpziJs3iosdpyCOi6pUiIioipsoCypPp4iRpji4iKsqiqiXimiVCeiJiXpFCCiJCBiGpQs2pDsUifCUibi1C2ippdiWpop8pDpjiksRsxswstpYslsaini7p9zDs1iQpJCRsfzzphiwC3Cds0Cfpjp1CwinimidCNsFsTC5iLCFsBinpgiAivp8sEsGirCTs4pyCMiQC4s1p1p3CTsspcC1CEszCspXszpjp0C8C6sFsfpdiFsai2pEsZCfsPsXskiPsYCMsapWpmCtCRsqsEpQpdzJsYixCdCgpbi4sti8sns8CMprCas6CRp6pmiRiRCPiVCai5pnsjivszsup4ixiMi6CcCksXCvpapQiDsYsGzzCVCHpYsesWCACLiTCvsNi4CbsKsai9CCsHp3CbCcstCuidsJi7sHsWCOCWsfsSCpijpjpMCciJpdpSCPCMs2CMscClCtieiHCGinCLp9p7i7p8CpCbsDCpCbsQCqsTikCyiusfpLsUpFiei2C5pfiFiTCwC9sOptpcsHiAiDski3C0iNpcCciviiiQpBsIi8soCMi4ijiqCAsYp7sVijpLpQi0pkCHizp8CkiipbpspasbCbi5iBCaiqiszDCLC2iJpss7CniriEpIsMigp0CRsNCwsliasPsPzCsFCXCRiSi7icCCsnsii0sXsNpLCFiuCxzzCmsMi7ibs5sop9sFpFCjsmiIitpNi9srCzCFpbiUsrpii8inpaCxpPCZiCCQpZiYC8pDpipxsjpsCDinswi7pbCssVp7ids0pwsCsSp4sOptC2CApWiZieiuspitsRs4sesXpBiPCbCRsxixsPi5CGCQCZCwiJpfp7pWs3inihp1spCYpEpWiHpMCEsxCHigCzszpTizp7sUpeslsYizpFzsCwiupvpwpQCMp4iYsFCRCwCgsIpqCRipziiYCUiSseiNsnpzicCMssCkCfzspGsqsHsGidCvpRi5zJiKsUCWppCrpliEiuiGpRiTCypDpmsKs6CqiasDsqzypaiCsOi1Chpvs3CcC0sECYCpiuCqsDsKsHiSCEpUphC4pKC0CeCdsMChiEs0pICasTs0pFizpkiZiis1iGC0C0sepOiLifiVids0pqpdCOzppdCHptsdiOi6iFposfpAC0p0CCpHCasbpDpeCYCZs3p8CVsbp5phsrC7slCHsAiCCuC2Cepui8iop2CUs2ibC9ppstsbski2i2pci6iNCAsnsVCwsopDspsxpxC3sDpHsRiIsisSs9pbiUCni7zDigi4igpKCeCri3pGsusyiuCjpgp5pUpezDCgpEptsopRC6sLpesgiyiYpACtihpRpbiWiCi5CTsWsZiOi9s7pniQpui5ptp3CapIsGs3pzCVpjCWp4s9iOpOsBCgpusYpbpTiTzysSCHsDiWpjzipeCKCFCYCCiApRC2iXsRsKigsrpus6ChpjCEiQCFimiiscp5pDsyiGidieCgimChpRpjCjsFpSsLsEs3iopDCApBsWiOpiCaCUiLpfiQspCGsNCBsvCQs5ChsmsQs9C7iss2pZCpsJpGCuC2i0sdsYiJpICDCzsPsaiyCZCfsJiHCJClsjCgszsciVsKpMp7C1s0CypLpFiLCkpjsBCkiepJsgpzsLslsCs6smi0pWisiqs9iqCSpas0plivpYieCzCWpYpniUsfigzCiqpBpQCEphCtsfCBi7pOpbiTsfpCiesTsVsfs2sjCPCAzssKCNC6CqiECLzpi1s2icCJsDsjCupIpqiQizpxi4pSsapKCNsjCosXimCbsxsws7sfiuiKpbpDCNC2p3pSsts5sbsbi3zCC7s5p8iCpoCICmieC2iJpHs4sgCHpSsepCidCUs1sKsGphi6pepSC5CCphsRpJi9sPi7pEsAp8sfiCC1swsKpzpEiXC6CpphCfpHi4CppDiOsuzsCPsNptiRzyp6CriLCnimiJp7CIiCi1CjsVCLifCcCyCLiVCEswzDini7Ckp1pAsGzpChihpBzsixCkpDi3i6sWpmpip1pms8prpesuCriqivp9ili8ibsMi9iYCap0C5iRCSixi0sMppsMs3sTCPsgCtsKsiCApeiUpJiUiwpZiRCwiICgp0CxCQiMsopfCes3C5iGplpTiGszCfiXsXi4CpCZCcsuCIiDiKilsFpHs9zDpRC0seiPsbi8iYp6pCseiRpAs0sUCOipscs9iKiEpCpcsbpECAiZpip6imiFsKCbiGC9p4pQp9sBpNieCqiasTiaifCwitzzpWpDs3ppC5iWpVphplpiiliBsMpQpri0iNsICLCri0CvpMCnsepwpSigsHCFi9COp4CJs5iysQs2iriXCBCPsVinzJpqpaC5sICLC3ziCxp7zss8pqslCSirC1sBCt",16021));
}
export const _AIChat = {
    get AI_ROOT() { return AI_ROOT; },
    get WORKSPACE_ROOT() { return WORKSPACE_ROOT; },
    ensureDir, safeSessionId, sessionDir, historyPath,
    loadHistory, saveHistory, listSessions, deleteSession, safeAttachmentName,
};
