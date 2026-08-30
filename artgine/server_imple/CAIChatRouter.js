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
    CAIChatRouter.prototype["onGetSessions"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CAIChatRouter.js","sHi8CoC9iepVpOiYCNs3sTiWpTivsNCGs4p5sOiIsBseCliuispNsVi9pQpsCQpBCSiusti7CosVpAi7plC3CcpKslpmCFCJpyCzpUi6sfsIs4snp7sJsmpniuCMsupuilsTs4C8ipiWpLiKp7p2iPpWs4p9C3iCi5slpap1pEsfstCdszs5pipzpfsupdszp8C3poCRCosUpjpMphi0CrpNivpSijC8sACGs8zypVsYCnpqsGsDsrphiAsDpaCcplsoC0imiAiuifpgpeCSiBsJCkCRiCiOi5sCiUsAiyC2pfiICrCeiNC7pOpepAsZCppoCPCCC4phpBpaCdiliqsCCIsup3sksJiciVi6sssTC8CWCVs2iXsRsFp1p2igs5sSiIsPCzpOpYsyp5ivpliUsZiAsppBCBCtCHCeiRiTiwiwi8iws2CKiuCZiHiCslCqiHpisNiOpUsKsOCepyp8sCCPi4psstCEptp9szsEp8ixp0zzi2plCNsDpNsZs2CCpCpyCCiUiLiFCqC6pFiJziCFi7zJCYCJCjpACTpqikCRCBiHpRsDs5CcpGsrphpNivposOplssiCpNijiPiApDsLiJp9pTsVCkCMsMsbs1i4i9i6pYi2i5pmpUsJivCLpPp2sJissMpzs8syCYsbiWiHiNCCp4iviHiLsmpLs8sppBixC0svp1iYsFplpXiUijsmi8pNsICKsNsWC3phpHzps2pIpDsYsgC6sxCfp6CHsgpxiZsLsvpFC7CGzpiTimiipFpyCiCzi6iKiIzsinsoppsbposECYC6s1CQiMinsCpCpsipi8CopYssitiHiDp4iSpTCfzJiypxs6pGiKC6CSpQpapAiniHiQpeiXiHCCihsJCmsbCApAsFsMs1iPiniiCRsxC4iuimsLzDCYsRixixi5pQC3swCcips4pqpyscixpBiBsdimidsYi9C1sqifiQpwiPCrpAicC6ChChsSsyiYs5CWpDidzCsJCzCMsyiCCniTCziGCZpGs0sWiCiDpqsLiRs2prilpTiSCzsxpIsAiYijzpigzDiNpfC6CXinCTstCACuCVC9CQCjsFsUCkiXi6CPijsystCgCziopIiRC6isi0sUiZC1s6CCpoiPiuiDs1ifiYi3inCdCfiBiwiwiLpnCesWs2sfsbC8pOsRstpupEpupZspC5CHpdCtiRsRswiMpEp0pas8iWCNChivsgsfs8iKCZi2iRp0sfsSsizDs9iPiXsopDslsMzyi9s7CcCwiPsosLiKsts9pDsxCkCap0sFC0iPsHsQCdiEieCFs4iwsHpnilC7pPClsUiupmsTp6shCbCpiGiEsxpvsZsfsisWpbsfsACupDiHC5piCEsqCGpeCNCmiIids0CbsAChi3CbppCKpBpGCQszimpLpvsMp6pMi2ibsEpWpPpMCGCCpspQpiCsiBiApMpMpfsziWCMsPs9isp0idCvCMziCdpzsuCwppsvCuiuC4pgpjp7iIixiZiusai2pJsTsjsUCSpLsNCRsipmi5iECHCqsjCrpypVpfiZs7smpsiBs1piC6s1iKpNCACSi2pNiDszzCpJCrsPiRiGsACOpGzJiyp9iApHphpXskiCsPCxsFsQplpMsupWitCfsmCpCIpJCGp5smzJitpACqCjiOpYCTpmstiXpUsACRpyiUC6s1pap5Cbici9sAsLCEpYs3pnsTpLpXiMimiys4Cop6i0zJp0iisAC6pKCysQCQsVp2C9idpdzyCeC6CYCxsciUCnsgiWCfCFs9pxsViNCgp3sZsVCrprp9pdspsMpaC3p6iupCCisisri1sJi7CmsmiOCTp0pYsLsAshpCiVpFsQigCpCTiNCFCoiGiViJipCcsaCdpWiVppiApfpPiOiPiZidCgCBpHzJC4iZs7sTs9Cgs4iGCbpMpyiDsXCasLC9p9C5sypcpGsaCBsDCfsMpCiVp8sfpcCaCJiOiCiYCyiopvigszpPpIpVsgsksAzip4iWpdsFpVsasNCQpXpkC4iFpLp6sriziKCNinpFsdpViHiki4i2pqpsCGiUsmCosLC9prs7CniWiBzyi5iRs5sOCWirsHi0pUCHsMimpnCoinzppEiUpjiksqzsixs2sDiApAisiip1C3pdsbCrzzsbCRs4zCsDpcskiOskpgC1CWibCPCri8ihsHChsYiZs7p1s3iOiZiPCbsICviDpDpdCxpApRpasWsDpbiwsNpMC3sBpdiOskiypLiRiCC6pspbCSsTisCLC7ziCciSsqpPiKCosMiUplpVi2iqiaiXpYpyCDiCiDpRpPCiCqpHCnpTpepMC0CwC5izsTiSiACBCSpBCkifiYivspsqiusosjCNszpUCnp2iiiciRsgpmCppMp0CosICopSsVsapDiCsuCCp6sssvC4pAzypcs5iQpNi4sdi9CGpJpaiJzsiEiYpfiQpuskigi6sbCzici1s1C1CWi0stpSCUsJs3s7CBsJC8idp1iIsWicpUCKiwpisfCYprpciZsZiQsbsHsoClpipvCaifizChsuiyCasyCUpZsSiYC8ihsFiTpyp2s4imC6pEpksOi5zyptCoCOp6pMCQCkCRiisiCRs0CXpxswCypeCsCnpNpLCCsDs5ptitCjzCCNiZswzsC8pjCKsLCwpMsGiuzJsZCvpFsbijsOC2sNC4sqp0CWCWipsIpSs1CzsisJp9iBiJiXs4pUsnp2i8CCids4iopXiwCGimisCTiusDs3iPsDsbsSpmsDsJCqsosWC1sTCoCus2CVCvzspIsDpBCPsWsysCsdiIzDsci7pisepsiqpUCGCxpyCWpxpVCksYCGsmpwC1pzCGiEpqiWptC3i1irpZsussCriqprCAseCzszsqiriVsvCPpwCosypritpmscCis0icsJpdizpGCnCxijsgiTsbsZpxCyCNCQiCzCiZi6CyiGC9CzChiEiIp2CFCdsBiEpIpYCWCis0C8ssCUppzpiHpiivCuzDpDiJs6s9C2pWC6sqs4pjifCeCRs5sMs7pfCUsRs9sasyiHiEpIpqivpPsmCXizCKi2iZCPCQzpimsTC2pnsOi1pvswscs7sOp4sYzJsvpTp7CZs8pXiJpusuClpuiQp1prs1C2C2pfC3pOiFiWCtCfpesZp8icpBzsCWC5CYpeiAiQCJsICpits8pxsEs1iMC5CVs8CuC8C7C4ifsVs2iPiwpoCDscphCxiIssCOs0i3itCdCICksuC9iiCOC8sRCBp9smsUC6pLiWpkiZidiNiWp9scCYivp5scCNp3pOiSiQpus3CDixsFi8zzsSisC5ilieiqCAi6pip3ppi8pVpwzCsgCHp8ihsXpAs0sssApDsjC7CppSzysTC6C3pRimiypNpfiriZivsEp8CzsICniQsjijirivsFCfitCcsUpK",0));
    CAIChatRouter.prototype["onSession"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CAIChatRouter.js","s8syibCICapRsppRpZphsSp2pepCsspDsuCLi2iEpypMsUsMCnpUiBpbCJCKiaiXpMCvCHiSsqiBs8Cri8izp8pypvClCTsFzDpEpSC4CrpEiQspicCxixCDzDCWpipliTpriuCIsjimsyiOsQsDitpqsKiMitsksIigC2izpHiXpIiTi5i3CRCUpas1C1CEsYidC3sXsrpFCvCApGsjCDswigpbsZpCpwsYpls0szCNCtCJCfCmp4pts5iwpipmCwCMCSsuiGi7pvsZipsvpaC8pdCFscCCCrsTCOiSsbCqp5zJiFioi2priCCZsZpypgpkCPiCiMs9sSpYCICyC8sfCqszziC8pUstsBi2p1Cjs9CKirCNCssnpGigzDsBCyp6pusCp4CWpuCgsfpisGiTiysbi4pNs1pbCHs6pgsapyi4CgsrCZCuCWzDipCLCppri4pRpciJsPCeptp1sDpYi8ijpYCvpPidzsCrCRpoigCTpKCOiMpWCvCRsJs1ClsBsUp1iWClC0pmCYCPpiszpuCJpSpwpgseCxsopAsypACxpeiXCnpWp7pqCyp5pgpwCHiCsppRpVC0p5CVpmCMpqCXzysis5CusYiwiuCGpWppiqsgCLCNpQCBpspoCqCSsBpRzypwiFiSs2iEsrCPzspis5pyC3igpSsDpdCui6suieCmCVilCDpLCapziusapsp4sHCMsGsICLsGCHsyimsRpcptzDi2CbCKzJpJp6pHi8ibpiCapHCiCBC7CupuCCiAspCSpnsis1s6iHs6CipfptsIC4CTp0s9ifCAsdsWiBzppvsCiGsUiPCKCJC8s1CbiOpTsHi0zpsnp4CUs4plpPpFpOCtC0pgpEssiXCKzJiPiDCOCSCEp6ibilijsUiCssiKiriZpvpMpAiEsTiqC5s4pBCjpWCnsJCxiNsKCDsWCpiwisCWsMzipUpVzDidp5i9CYsTiSpyC7ppiApPp8susXCfptijpqptCHCLsuiJsvi3pFsipfCuC4CcpuiXCNifsSzJiRsZs5p2sGpmsIpCiisysJsFpXslprCmzDC0snswsPimpWsfzpsqiDpYsriWCaCGCVpgsMi5pOzssDpYi0pyp0CsissZsPpfpMCVs0iWzpCGifi6s7CVsuCApTsIpcCFiUCeCzpTzppNCbziCNs4CUpiscsNsBpfifi8s9iqp2sas8pRpdCGigini3sOsBirzppYClC0pVzys5ifCBsqpWpwsVCjsWsLzppSpRziCkpDCBzJsTi4CxCZsus9pQiBzsiCstp2sHCwCSCFprpqsXCwiTptpkp0iyi3poshppicp2iGsUpSCGsCihC6iYpiiqCsCtiuCACbC8CppopYp1sJp4COiFiEsYiciBpcp9CXpEpXCPs2i8pEp2itCUpIs0iNiziPposZC9CRpqpOCZp7sAi5sOiRpps6CUsup1CiCtseskpPpUi0zJskpvC8pksYibsFpCpps7ikCtsJiDptprsspTifCRCgsTpvsCi6sZiniqp0ziCNswpaCGiypuCiiXsECtiisZCVCLCVC2sHiii7syp5CrCsC2sBimsopjC3pmCbpKihzispihiTCVpUpwpQCNiii3CIivpnixp7C4pPCms3soi1pppmiXskCRpJpEsksAikpniDiiCcpMi9s4iViJpnsHCLzysDijiCpFiACgiUi1p8C6sSCJsLpSC1p4CApspHpQCdCXC6sXC9zizJsSpcC8ssigs1CVs7sOCFCsippdp2pqpaigsXCXiTsUsfp7iUiopRiesJsrpXp5izCECWCtC1CSCOpWiVCsi2sQsqpBpKsUCOijsFCVs9p0i5srpxs1ihiLCHiHzyiwpnsKiisQp1poCiCosiCBihpYs6iYihscpgs7sEpKp4stsqiPiosXpsilCwiZpGpBpapuCRiXsGCCpMpYpos3ClCDCzpSi0sjCSsqivseiusGsaCxi8Clpks0sMsgCdsOiCCspNzzpnispspcptzyC9pyCbC8iFp6iypcCDiZilzyC6p8seiLsGsiCtizpspBCxiEiqiyzCppp5pxCyp2pup5iuCXs8CipBCtC6CPsjC3plp2C4iqChidsYCCimCPpMpbiBi0iHCZiCiYp4ijpKidsbC0plpVirCbp7ijCTipscs8iaCIilpfs4ihC7p1iwiliAi7iWzypiCvici7ispuirC1pZsNi6sLp8plsfCas2pRsKCeidsrzJscsksMiPCtssiTC6pKigCNiYCwsjiczDptsaphp6ilsYC6isibpXC8C2iWpHpWseCeipCgzpijC9i6pqi0sOCpiqsvCyiFsnCqigsHiUiMp3CKipiUisitp7iFChzzsNiPiLsvCRpSCaposusZilCtsup4i7stsiiCiNCViPCoiypapWihinidilpuixCLpAirC8pzihsaphs5pDCFCHsOszCOs4iwpjsXs0iNC4sUppszsjpoCbC6iFpkpYpHCriEC2CTpMiNpOp0pGsAi0pSiGCsCtsLp4iNi1iDsJCFirsdsqirCCpAs8p7pdsjCEsbpjC1CQCUCLzzsAiNCUpxpQC4Cwi4iZCqs2CyCXzCCyixCZsYi2swpiCHiYpNiSilCSiNsAsyC9C9s2CxsnCupRCzifCrCgCyi0iDpRsLCPiZsas1sdpSiwpsiFpvCYiTibspCACAiGsypGiLiSi3CiCmCIpyiIiBC1pVsfiOpfi1iRp5ptpxsTpyspiDscitCxpMzCpxiRCvsQsOCUiysMirsriSp0C9imsKC1zzprCns9zssqi3s4sEpzpYiICOpTCNiKs3C8sCCJzyptsZiRiXpVC5CciPidi7C4peibpKiDiOitshCnpcposvzypeCgsIsWsDsvsgpgsYiQpzCNinpDpLsWsFs8zypDCApzsRiAsVpKpcpfpRi5p5smpOC0sxszp9pbsapBsipUs5CuCqC4pgCppHsFpvpwibCSpkptpbCmC4s7issvs9p6iFCai5sipEsdpDs7sQCEpNCisVpps6soizsMs7s6zJizs2p8CXiEs9s0pJC3iqigikp3pOiQCssqshimprpwigCLCTsyCuCwCHpTsxsrCqiyieCoCuCMCzCoCnsTi4i8CZCIiWCZicitCrpZiBC3iLClp5pJi5i1iCC9ChCPiAswCyCuspsDp0irs5sXC9CcsmswiPsdCpsKCNippLpRCLppsmCupwCIpOCbCdCmCvsqCHs2CypczyCRspCupaCKCyCvC1Cxsgiss5s6CopUi7plpXsnspp4s9pnpis6pCCVs9impUCTCjs1i9smsYC1sKp3Cqpks2sds3CIsGiNsyiPpspisZixiAiXplsYC0i1iGs3i3CtzyiMiwplCDCUiMpoCvCuzCivCbiKiCpksgihsaCXCss8CepIp6pepMssi5slpMiCzDpBp9puCypKiTsIpipkiTsvppiOsQpisbCciOisC6sdiIpYsyCPsGpzp0pnCVCJiWsLinilsHC0skzJsbs0pksXsvpIpHzpstp1CqpRifiWi6sUCDp9CRCOsvi6CECzsrzDi7irilsbpPpTCSC2zJCypeiVphi2pAscsYi9C6pipliXs9iasisHplC3sDpOCasIpWCYppsmi5zJp5ihslpisoCvpGplppsopnsEsXsxsgpwCysIphi0sXi9iECUswsLpyCWpPsssnp4sHCVCup5scCnipCWs9pVCOi8zssyi9sPsUsspjpDszpkiai8pZilC9pIsxCqslClCYpYpushsqplswCGpRiDpqp2ikzzs3sgibpZpziesbCvsYiJp2igCTCgpci4p9CXCOpXCsijCwCPsFsDslpYCLibCVsOCSsmpMsps0iui8CfCYiUCOsrCvpupkiDpYsoiCssCKiuCliopCC3scieCgimC9pgsAzyijCfC4iViasXs3p8icsYixCwsgi7iepaiHCspfCtpapJpMsDCzC0pTipsCsLCHiwCkiisTsniHpzscpXp3p7CDpKizsxsKiopOzspqpHsniBskp9i6CYCBsQsQsxpNi1pfiuCLskCYinpIpJidC3iECosqiVi1iNini4iAsep7CMzysXiqCjCqp9COzzsbC9ppppsvidsbiligp2ppilp2ifsXi7s7p7isieiNCcCnpfp8CBirziplstpPilils8skzJpYisiWCyiqp9iepepPprCXiFsKsXCEpti6C0pJpNpZCIphilsUCSCEpjCzp1irsNp1iCikC3iisRiZsOpWp7snCWsGCUsIp8i0C6iXsppqCfCGivCnCxzCiupvC5idpLp8ziiICDs4CgzDiVCksMsfscCTCmsupysasLp7iwsFsKsEiECPsUzspZsYp7iHiusesCplssC7sBpHsBpzispgsQCTp0ihsIsdpNCqsazppBpAsVCls9p2pOilskpIiUzJpxiLCnCDpqCKCNsbiaCMssCyseiIsQpLp2swiZiEs1i9ssptiYpsszCjsVpuCppKiupOsaCFinzzp3php6sxi8CAiBCCCas2slCPCMCcpNsqpUpgpssWCDp4iMi9iazpCisQidi1iuCiCrpNsppCCRsxCEs2iysWsKsmpopyi4CKzJpppBsysBp8CZp8CsinscsmiJCui9i1p5sNi8C6iqzyCipGppp1p0s4p8sXCqippFCdpPs6iRi6CazpzDiqp4pHpXCkiApWsEs7pJi2svsopeiCiSzpCUCqpYpdpfC8s9pcpFpesWpgsJp6C9sTCSp9pTCGsVsxzCiGi0iWiRCWCssTCZsdsezCiXzpskitp8pUp0CfsJiCsxzypliPifsjCAsoiSiWiPC1CYiepkpts2s9pPC3ijsTiOiysMp7sbsrCvsbpNpgiPsACYiDziCYsUpHpEpPsfpoiGpbikifp4CqC0sticpGpZCmpHpHCbiZsMCZsFiOiciviDsOpfCLCOCzCSiKpfsnpXpCCLsMCtpaiIicirCuslpczDsMCXiRi7C5CHsrpeCuiGsdiOseiqs0s0sLC9pysGCjCOsxpzCnp9C8iMpPiwpwsHCiCPsxC0CMiSixiAsysEpSsKpjikpFiviZCPCeCyiii4CcCApMivp0sXiJCqC0COpNinCXCns0CeC3sFiIpDCfifsrsWC2iLiIsaCZihzzsvpnCMiDp3CLzzsbC2pliqC5pcsZCYsDp2CqsBsnpdpXC1sGsti3C7iiiMiHi5p4sOsYCVsrpNsksQiniaCRp5s8iHpwiyCKC8CviIskiECJCrpFCaCqsjCGpeiKCIiUiYswpuzssFCDp4CRpwsWCOpXCdisC5ips0iasrzCp4sTsxC4ptsepGpXCzCTs8ptiasFCssuippDzDCKCesni7pBiVppsNsHsZiNppiqpiiLiNpYiUsuCbsxs5iMsnp0s8sFiPi2pSpviyiUzszCsniMCfsxCBClihCIsKshiFpEsRstCOzzCMsYC9sUpBigzpimpEihzJp6p1iHpJspiZpTi9sqiSsipesApMC1pisziWCCiFiXsBsisNsksCiDiIC4pBpesaifzDsY",1734));
    CAIChatRouter.prototype["onSessionUpload"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CAIChatRouter.js","sRpripCICPpEpDsxilpEsXsepVsGiiCgp5CwCoCEsmslpLCksds6sDsdszpFp0p5CgC4sxpYiyCQi2C7CbCqp6p1sMpeips3C7i1sGiUsFsxCViDpdsmsHsDsKsfiuptiLispgiTi5sgi8sCpEsnsDpLp1pRiOCvCBCWCJCsp0pXsgiYCjsPCCimiisjsFpBCnims8CusesvstCsi1zDpTiIzppNCHi5iOpqCPsisNpppSsEs0p7pbCBiDCqCFpMC2CMCriqinCRCLs5pIpsiKs0s4ikiMiXsliCC8ClCypxCGCcCXs9pnCMsNiaCisyixCcCaC4iZi4pEpSiOsozDs7iJiHpqzCp6pEppC7zCCtini0CcpTzpiJici5Cji7icCIpbplixs7pQzJCHCjpZpXsFiepFiGCas5CCpYC2p7i1CPs8zDCSpkpes4pEC6CMzJCVijpOpZzspTpMC5s9ClsACYspiDiciSziiAiUpWs8iqpWCopri7iaiECbssCjCoiViwCopes6C1iOzCiqi1pNiHiLCJC3sss4iACpCysmpYsWCyiasOp4sbpupACbshiNiCpBi4CCsMsPzCpxiEpWsoivikCoiXClszCEsAsBs7pNs7iDi7pXiUiOCRi7sBC1i1sliQpGifiZpYpBp9CfzDsVp1sICdispJsvCjCTi0iNCriGiXsBidppiJilpZp9CKpSsbCXpEssCwpLi1sozJpvi9siCkCjCkpqp9CSskCdpOi7p8igp0iyiSpNs2sqCppci6pgpXs8srilCOsWsssviIptzsprpVCUpQpciBCpsSCiiYikCviHsypJiMiapzsfClpZpkiPsksPsCswCXpGpFsciRplihpCsvsKiBiKzpCviQiEpeiuCds2p6CvsEiopApDCdCvieiksCi6CmsUpypGzpzpizisp8pkpPCXs6CdpDpjp0p3pgCOsrpSi8zsCesGCup9pypwCeiwiOiCpQsns9iBpWCzsKsCpYpns4iOifpashCHivCXCUChp3smiuijzsp0C8CuilpUpfsosDiVsmivCzszsezip1sGpfiGsHiRi2sbCRiYiAzzCFCXiZpnpWCgsyicsBCMCRiLpwpyzziQpVspsgp8zzilpNC5CriJClpsCJiFspirpxpvpcp3zDpyzzC0pJplp7sYpJzCCIsgpmsWpMi7pgCkpYiVs5sWsqsTpUzyi8sKCYs7sJiysussCnClsBiOsWiuCwCwi5sAsPzziMp3sEi8iRimiMC4iDiLp5CPspsxi9iGsQpmsyiDpXsBC4iEibsOi3i9CLsAslpLiuisiQpmiAC7CcixCOizizChp2pBiepbiopJslsTidCfpcsIp3sIsfi2iwpyspi2sKiPi2pcCsiLpYCupXsJpepDpaiwCaCIinplpyswpupSiks7CfzpCBsZpTivsPC5p9CksRsxsXsgpiiTpGsZixsyi8sLspCIp6sKCGiHsQpJpCpPpksIifiYi5CXigihi9zzppi9CCidCpsrsmsfpAssp3sSpvCus0sPp3CNCciop5iqsiiepOifCAsFp8CXiKiBirCSiaphCViXpZiisVCNids5sVs4ptpVp5CnpIiZp8iYCMC9pLsFCSpAiMs6iopezJixixpksmi8p0saC0itpzp9sqCXp8CBigs4iNCVidzCCMi3ivs1svs6sgCasXiwpDs0CGixpGpiCrsTCNilzziXCLpNsCi8CKpVppsts5Chi1ippxsCifs7CJCNitzJpqC9ixCkpMs4iJpSp6icCoixCMiIsViPpJCzCfsRpupxieioCxi7ptiOCriPszssijp3s0CGsApKpXiHpViiiwCWsSCgiNi5CpppzyziCBpPCas8pXCFs9pupbsYius2pzpdCpCpCNCLCsilC8pvCesCpXijipilifphsLsyCWCuCjsTs1C3pfCDp8pks7pHpoCys5iNippeCezps0pusKpKpBpfsTCaCWijzsCfiRi4plCishsvsvsXpYC9i8CAsksPpZiRC6snpgpyp4pli0CXsMphC7sosZs3C7CupupJiOCzC2shscpDCisNs2saCvpBiEsFscsvi1swpWslpNCGCLposezyCRiwi2plsuCms1irsVikpFCKpQzpCQskpuCbpHzsiKp0pBsNpQpSsdp0pUswspC8pBsSCNp3papqsjCei8CTpms6ixsbsWieC6sRiJsEsliGs7pFCpsmpIsrClimsMipCUiNsBp3iepcpLiiCDsyCCpwC3isi2sFskiqsZi6s1sIsVCuCRpesZpFpqpupziECwsvpki2iWiHpJpbpOpfs7CXziiZCDCnirC7CnzsiyCOCTsPiCiwCYC3pBpcsDiDzzCyspsPi5iwC1CuCECaplszssC6s8ixzzzDpzspCcsbCmiXi2svC0pPpQsosoiUilsziBzpChzsiSsXzDs5issWCAsqiBCAiCsczJpJiaiip6shpdsBiPsrCUsXpNpIiVsKi6CDisp6sziWCqsViUiVp4icC2iBiZpji9Cbp2sgi7sZsoCEpBpXCACNipixpTilCFpbpyp0plshiAC7sxs0i6sNpMsqCksTpHs1sDCvsVpqslpSpOCBiyCQigCcs2CNpjiAC8pcsesmieikpZpvC9Cls3s4C6sPs4sysUiisJzipbiLsppjsvCfigs5pns4CVpKC0i4ipCnpmsWs0zJC3s3CepWiVsns7sfCriwCVpnsQssp3iBpIp3s7pdpAsDCFi7C1s4CJCypNCWsRiDCLCjsgiNp5s7iFziC7s9ixicshiIzzpLzyCBC1srsosNi5sps6CqpqCWs5CACKp8stpZpniHCNiNpPs6sospCfiqiCsVCesICbCiswChp2iDssCSsepcCUsrCAibi3CaCypTC6i9pZpYspsVCjCCsmsYsfsVizCmpwCCCIp7prpTCspuCNCyzyCQi9sCiWp7iOCLiIpgiHC5CCpNppigpYpfpFiICIpusqsBp1CMihzJC6iisaCECpiepvptioswi2pRirsFsqCwsmiNiYp6issvsBiip7sLC6sziIiVC4pACRiKiJC7ssiliNswCMiqiypACvpkpoiGsoiIzCiAiyC6s8CeCaixsys9iYiciPpGCYCNCLp8C9CopmpxsRCJCDC6sdstsOCCpcpKpCC6pHplCbCDpUs4sjsep0pwijp0iLiPphp1s9i9pnsTiFicCNiECeihChpLCaC2i1sBpSC5CACWCIi4pxCxCiiJpppUijs1CBiOCJzipWCKCRpFiiCkCGC4pep1sKp6igzCsJp5siCbpMpisPiXp3s3sJpSp0supwsczJiipViTpssUswpBsIsJszp0sMCpibiSpRpYsbCPplpDikCosfpRCppNiesPCCimivpPpNp8icsRicChpYsmiTCup5zDiQCvCwi6CPs3CHsKpvCasJibs5iUscCMpaphCVi1iNzyiMiosUs2sEC5prsPiJivpRCkpEsTpAsaCYp9pOiFCdiOp4ics7pxpOirCNpJiasiC0ptiFsrp3sTi1pLpkiPCDsFisisiosVs1swCBi3zCp4sksKi6i5C2CIsFi4i3zDs2iLiPCssDCKC9C8CCsasaCFiwijCusasjsuzpiACQCVC9pdiSpcCxi9CbsFpLiGi6Cgp1p3i7sOCCCGiSi3i2sTsFiUsQCksdi9pCpcCOixsLsQp2sKCSiGiysSsNinssiFpUiNpUp2pwptCwsvihziijCrC0paihiEsDzpi5C5i2smpHiPsuiFCpp3CICVzDpPCfsdirpOsqpoCopViDiosMCIi6CYC8CZpcCVpzp7iAs8pEsaCPpUpDibpfpKiWp2iuiJppsYiZpepgzCzyiUCksesvspi8sUszCTCupJiQiEpZsyi3sBCOiuiIi7spCkiApyiZsspJzsidCIChihpasBs1ppiSsNsGi6s5iNCKs5pZs5zzCfC1pgsfsxCkiqCXsDp4sssDs8sksIpPsVCyiwiHCps3s3pFCjpHseieCPsDiXpts0sApXCisDphCIisp9pLs7soC3sJscsDCmzJpcCgCFsmsmCwzJsNsMiOiaidiTC6s6sfs7stpuCVCDzJCbCYC0iKiypmsPC7i1i3iepnpdizCGpBC8pZiEsLiVCmsHiuCxCHstpWpMsviNCcsyp9CjiNsTC8pisAzCCBzsiAsmpWihi6i5CQsxsgzJpCpds7iGzppqCOi1ibCjsdChzJp2ptCwiqCgsNpwp7priFCIsMsIilswssigshpmCQp7pmsSp0sPpqswp2iapSs8sos5CasgstCtsSCmpvpzpcp8CSpBiQpvies6sQCEsXpECdCPC2CpseiYsissC4smp7i6itCQsipFsvsrpWCjCxibsFijpDitspzJpJCtsYiRpis8zJCSC6ClplpGsopVCFpjp1sRsIp8CyzDCIiWpvpBiDCysRsFixiLsBCkCQiws4Cki9pAsbpUshpKsyiYsGCWi7pnimi8svsziupcsvp7CDitidpTiiirpNpriFiTiyiWCrsopKCzsiitiwp3iNCqs8pZpaiJC1ChpIpVCriGpusSsTCVsoCXiLpWpUsXpxzsCfsuCXsRCrsXCgi1pLCfCeikpuiwzisAshpKpjsmpRpCiUCBs2sli6zDC6CzinsLifCJCFsyiCCDzppmi1CTCNpZiIpPC3iJicp5zisFptCFi3C6i9iyCIsrp3i5iwCZprs7iZsZiMCui8iAp8sxsPpYiwpSiZipCOChsliGCNpxCLiwp7sRs1iZzJCqpHi5CqptsKpSpmiMsMiSCtsDsQCOCWiCCLspiPsLsZpisyCECGCvplpJpZsxs4sQs2s4p9iSC5CqsFCopVsOpksniysZp4CZsNiSs1p6ieCkixsIiQCJsVCmCrpksziBCxp8s2pesPi3pNCbp0issSptpXsHsTiLivCzpQiSCasCsKsqiLi3pTCdCpsQppsWigpXpms8CNsmCRCbiCsFiMigsuC7pXiKCUCdimpsCezisss6ChpLiHiEsNiApfibs2C9zJpXplCGp7iXimsZCUpOzypwpWCKCSpkzCi8sOC4CHpxi9CUzpCisLi1sjsjsXswp6p1prprCVCuCgitpbCMsqpliOCppnsoCxCtCCidpai1C3iOspptCAiXiKCapppBC8CciKsbCUsLs3ieiDsGC9p9zDCXziC5iKpjpQixsKs8CbsXC2p8pJCiiTCYi3pliozCikiUiSCksACFiACws5ptsYpMzDi7syiqCjsxsGCLp8ili6sqpgiTsmsRizpaCpsUppC0iRiViDi3ipC1CbifiPsCiJs7iHsMimigCDics1CiiFCSCCCAi0iNpFptCYijzJiwiyp1sjiYpyC9pHi0iFsppcp6s0p7i6CasGCvpkpspHpQCzi6slslsNs1CHiIC8s9pppssyihpTiEsjijCsCHiziqiUiJp0CUC3pvpusmpYsWihCmpqsfCziWiLsesZs8sRpvCaCrpmpjiTzzpeCXCIsAimsuspiBCFigpRigsOibCysHCapDpQs2slilihiFpYsrigi7slzisEzzCLsosvCHi0CbCgCgCCCisbCKpyi6sRs8sDp9ivC6ibiLzipHpZCOs4sEpts2sMi5CcpcsniwpRCapypApqpaC8imifsIiAsQsosEs3ixCnips4scitipsziBpQpns1CCs9sFpnpnpuCmCIs1C4C1pAiVC8p1plCcpusZpKzDCIpUiiCPsTsXCwCiCPCZCQpOCopRCqzzCCCSClp2p6CjC6CTsDiqsls7sKpNpRins8iWpWCos8sOsuCOsmpmpPiss6igpeiOpjCBCSClCCC0i5supZsWCeCECSslCCi2CtC4CzsDposepTpNzzsupEivpFpkiLpwi2sXpNpcpRibiiCeCTpTpTC6CliBsGCWs3ptsppFpUCYiwi9pECzp3sPsJpGpvChirCPshipsJC2pWsNs1pXpMpGiJCjCsiNsvi7iRiosPsBCNiGpAsyiliiiisUpFsDi4posXCOs3pBsDsBp3sps4sPiJiMi5C6iPiuCtsRpYpNChi3CbCRsXicC1ieCVizsppSi5iypis0pdscstp6C1sJiWpPCMini6pxifziCNiYs7zyCJpLCECypSsXpsCLpHp2CDsksFiRsBilzzi1its6sOzpsjixpMCes6iIiFpzs8pxpQzJsspyinp4sNCtiMC5sdsuCNpIsDiWC4skifpKpYpTp3CMCCszpCpxsHCnCciYzsiBiqsmiQiIippTs8iWCBsSCBCyi8s2s5iRsypOpKsIsizismiFsziMiVpXsfCesipAiaioCnsPsiCosoCxicpusQp2CjptsNC4CiiCC7icCWsspai8CJpmslpbiTpUsXpwpvzyiGscpzi6sUssiwzyswCQsli1iJCdi4iisdCrivposWC0pACqitsOCYCapDpts0zDiLiDCXsspMCIpVpassCvCfp3plzJstCKpKs0CMiQC0p5iUiHiiC6pgiDCsshiWpesPiHp2iCC4CZpdi8sIpbieiHpvpZsjsdCrCkpVCnsnzsCDigpgCMiGirCwCesgCjpkiBsfCksqsNCWCYs8CIiKivi3CopxiUsHp0sqsWpZiusysaCTClCOsPCuirsHpMp5pUzzsIsQiipjCPiRCbpyp9iwpsiHpCpnsQiMipC8CGiqiTivp0pjpuidsqzyC6C8sWpYi5CpCgpqpyCxipCfpOpipdshixi3CqCuiPCxpkpei2CQppiWC3sWsGiICLiAsKs6zip1CQCfikiZCopipSseslCnshpLpPskiJiCiDsyCvpe",4533));
    CAIChatRouter.prototype["onWorkspace"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CAIChatRouter.js","pSphpUi5sOsQsainiYslsmzppJshinCds4iQzisGCEiUivCcsMCopVCWseigiXs6zssbpJCBiRp2CyC9sxpKiCsJpbpNpesVCDigCUpRpGixsXpRi2pGiOsvsOCci9srCZiOCHiMpaCAibpEpuCXpsssC0p7pusGC4i8pLCXs8CbpgsxihpcpkzJiys5C2sBsPs2sDpws1zJCIi2its2ClCmzpCEiNiYCfiUiBsSiHiJCWijiDiMi9snijpwpjpZphpICTCppUCIpyiRi3CApKiRiTssshzDzJipCxpPsEszCKs0i1i7CRCdi3sOiIzJCgCws0i5sCiWitpiiHC9pIifzpiYpHiGiGCaiECTphi7CEpJisi0icsWp5sRihs5iBsPC0CUi9iOpbszsICUpMiaC6iOsUiKCKC7s5Cep8sCsasqsKiSinpYCQshCzCoiuzpsqs3iBigiZpWiECPiUsHicphpyCmCaCsijitCpCWsIiWsWs3pcsoi5iLCZsmi9pXs6sBiAipibChiziiiSi6srC3p0p1itiosBpyiqiUshCHsMC3CGiWzzpOiMCIiDpFpeics6s2pRCDi3iipSiIsNC8iwpAzpsqimCnpJs2iappiUpkpICDpvCjCBCtzssVp2CxCGCIs8iYCTpYpDCHsDsBsJzysLCnsspcpqiCzDivs0Cvs3sKp8sPzpifzyCIs8CusTiRsci6pcpfs9iBCGsgsxiqipstsdCIiVzipXCSC9sQCHsMsQsDsQCQiRphsds1CjCJsapSpoCQiIsriVsFCRiZsIzJsKCPp7Cuiip2i8pRiLioscCezJC5iJC8iCsoCpsjpwi2iesrC9pupbiipTswpDixCNCqCdiwCBpDipC4sqCyCnimp6sJimC0sIs1iDsqpmpvCpszpKiOp3iOiECjseivsSpgpFzDsiiAprp6Cbp3iEiHsYsgsisqCZi7pFifixsApss7zisOCpi0iisisViPzpzisUpasKsYpgsJzipRizCciGC4iSsYsACfpap3CGpMsIp2iMi4ibplpzixCiiAsls5plifpVsni6sspNsrCeiOsHphCdCFphpZCYsGCksPihs0CxpPphCkivirplsGiZpzppszsiiEskp1pGprs8CUpyiJCZsIscCniKiHpPpPpss9p1CjiKsHCSihpBCGiOpbi6pjpapgCsiIi8CmicpKsJCoihsbCssiCksPC5sQsPsrsNpoiyCHpDiop2pAsBCIpiiHCJCdzJChsHiOs8iUsaskCjsosICDiCpwiwsKpssTzspipcs6s9CrpAClpWCliWsLpUpdsdiTslCJiWsHi0pqsaiOC0iZCLsMs0sOpeCJpdpoiTphsGiGiSsXCfsnscsGCKCcpbp1sXprp4sks6COCrpcixiIsmiFstpKsUp3phC2CGCRp9C8iDiascinCjzpiiCCsRC0srs8sls2i0pRCqpZp8ifiisziQiaiXsWpJszCIpxCYpOsIzzzCi7pLsgstsMiRpLCBCdCrpIpUiaCJCwiKpesfsxsgi2pGp3sppbs1sYiGiRpEpJsiiGsopAskp8i3iPp0CkCmsgCSC9CWsnzDCusEpsCGsvCDCtsKsxsSC0CDCMi0ihCSzJCBCcpximpkCVpYiSpmCuiVpvsgCQpgiziLpACvCPiHC7pHiApKsRsOiGiDsrp6ikpRC0p1s6igiZpBipzJius8spC4iys7CgpZC6pcpaiFsPsbiVpFsNCEpqiXptsvpds5ChpopZClsysnpGC0sjCCizsUpJpyiEicsAiTzDp5skpxzDiXivCtsQiCsepJCtsisBs5pgiJpKCFChsCi5iqiJpFpSspCcpjiJiniaCfpFp9CjsusepZsLi9iSp3i3CGCisSp8iUpriDC9zJC3pMiUpssnpKiHC9CzCyp1CFiYi1iosSpqsCCCpTCrCWpYptsXsxiKCqCazipYiLsqszsIi4pNscC4syispQCIieCcpMiuCks6sgpOi9sSigpCsIsXC2sZCRi9pBsZCWivCWiXikipswpiszCisFCiigCZsqsvstiTiRsZsBCKiPi5s5pqiqCfCesQpDpvCMp7CqsQslp8sTsDiTscihpMCZiVsJpTCPCciipFs0CkiNCxslpJsliHi9CtpfCusbpJCEiwigiosJCMi2pnCpiaCypupOiZCisspipvC2iDCZsysGpmihzJs0i6p9sGC8pLpBCZC1siiCi8sCpCi9sDseCxpGC5poigCIiKziCoiysHi6p2i3CLiLs5CXi8p1CopbsTsCiWpSC3zJsopqpnsFCuiqi3zzpusQsSsJC3ptsxiXp0sWCYi2pvstibs1pcpei0CAsqChpipWCNiVsJi4sgiQCdpgCfCpsRp9i0p3sMs9CSsTibpUpas9pKCis6CfsMpbp1ssiqpYCUiMi5C4Chpgi5CNi9p9sBp2poC9sCs0iLiQiGpppiposKsDsBpnppCuCiipsgpciipqiosLp1pjiAp4ihifpSsSpQpipGspiniksjC8CZscskpLiBCNsfs3iQswCKCMC4iRzyp7CpplpBiFCEsKCYiJzyCdCppYiSs1sUCQiAilCgCMCniwiFs5CZiwpCCmsYCfioiPi4CUCuCwCoiMsiCeCliciFC5sTi9sazyiYC3i9pUslCgipsci7i1sQiTirCSCgCipNsmsgs4pfCosupvCbppiCpOsPiYsupai7sPC0snC3iji8scsmC1C7iIpki0p2pqCni1CJsXiUisCysaplsFCDC8ibsgsZCksYisC9CcsIsKsYpcCXp9p9pKiOs8iesaiUpPiPCYpdiepTpRiQsJizpyiOpzp9i1iapei6pcitizpaCYigCepwziiQi6iDiosppfp0sgpupzimpOCupeCssPCoiqpfsqiosWimzisUsqCNC3sHibspCnCYs0CnpPzyCCzJp0sFsrCKprpzitsTp1iKsypUplpNpIiQshCesEslCtsYsspGsii5sQpbswpJs8sEslCpCtpCpxpksPiGCliSpUi9sDCWsOCpp3C2sMpvs6s6iBpli1p7C3pwsWpSCtCQiGzDCkpsCBCRissJzsCbiVs9iCifCuixpriPs9ibpRCLiGzisXiPsLzDzishCjp9zyiJsUCcs2zssxsbCppCCRzys5ppCWp7s6sNiVi4CkpppGsQCiiAs4prpasYp7CECrstisp0iQsepQpRzppupPCqssiEzyilpDpbspsgphsXsGC9s4p5sEiQs5ips5CdCTpsswsBsgCMiEi9s8itpFiKiWiSissOp9zpsxiYsFpbp8zyzJsMp4sDi3ChCtCJi9phC2sZpWsji1iZC6pMpNpgpPpxp6sIp5iCp0sSsRiQC9CZs3pOsDCLCUCcixpXp1pAsVsXijpWiLpdsfi8iwCosnzyCNs3sEphpmiICfpKCazCi5inplsWpEp8iGsTsUsqpMp8iApXCfpzs2pji8CzCKi4peihiYiwi1p8i4s9iWCZsTCAitsUsYCyslpvCbirs2sDsksHpqzDpIC9pYsFp9ikiyCwC9s8iiCypQi3p1iUCdsnCisksxp0itCyizCyCBiPpapUpbslsQC0soifC0CysLiXCNilipswpPsrCKicCmCsiZCYiUiqCTCjCcs8CesWC8CPiosmCSiFsUprs0s9ChsQC5p3zDCZCkigi4iECAp0pspcpfCiCupLCDitiSi6iEsysssPp9supdshCCiaC7ikpepXifCupXCtscppigp5i3C4Coi1prs6iOijini7pPCQpcpgsBpyiEpmiMp2CRs5iNsFptpUpLC3iLC2iWpGCwskiGphsYiHiEsdsrikpiCMsGsyCOCZsupXCzibCWiri3s5piCMC9C6iBpapzsvCtiTikiCCwCYiSCFpIs3pECSCyC6i6sappCvp0sxzps1CLiusmCqC7iysXCXi0pusXpmsbCTsDC3iPsvsEiri2pDzsCUCvpOiCsEiXpWCNiBs4CjC1pqiZC3zysmiliHpbiGiEpoiOpOpDpUsWiWpIsnCks1CCsDiGsLCoiriqCIiasws8pQpJpap9CNCyikChidCli9sms6iMiEszicC7C5pyCfiUCyCAsnsSpYzDi7pbCmsYCvpAiIsLsmiGiCsBinivCepypCsbpYiDstCACGC7CTsSC1iriGCCiosBCRsXiLiuipsBiYpHsZCIscpPimisCKp0pkpysFswslCHpcpcCKs1iOCZiUskirsJsgsOiFCtC0CwpmpzCfphs9iRCaCTsLC8ihsTidCcp3CziaCqiKskikpJsfseiGC8s0sxspi7pisuCfCcpapdpsCDiRsTpvimpHC9i3poiQp9sXpJpOzCpMCsiHpGCisdsWpBCsscpOsAC4s0sOsLiaisCJC0CbinpizJsMpliXiHCHCCi2s4zip5pSsPsSpQpysjiRCUi7pbpNsks0sZCOpriGiBiIpRCApUChpIi3sLiqi1icpoicipi1slpcCOCMi5i9ioiuidp7CRsjsYpECYs1CUs3swiozzCZCesXpvsciws9pAp3phiJiAp4CcsRCuCVCLp0imiPirCuiJimpKpACrscpfsepciBpxCwCeC1pdpAiDiuigCaiUpCs0sUsNiNCusPpqC8sXiACqiwi4pMsbCXiBinilsYC1i9phzpsaiRs3plsVCcibiwC5p0i2syp3ins5CwCzpyp2CiC0CVCGC1pLs7sUsIpazCpCspsFpippp3CLpRiKCGsGpsiACsixCApQzpsYsRCfptzyinpxCrpDsSssiJihp1CMsas1idiSCFCxpKsTpDC0iZiOijpfids1pwzDpaCbprClCCihp8i5szpcCes0CgiYiDiACLiUp4CaC8CxsVC4zss1phpdpcCFpZsypOiRsepezppQC6zDCcpGpViqiziji2iTCtsJszCUpjp5CapeicplsbscspCjsECniSp8imsJicshpxCCsTs0iWCJpICwsiifzisTpnsridpus4irCEi5pxpJCuppCbsRi9pXCwpiC6pvibCss4CAzpChpuCFiZCxCnpJiwpmiosWsLp0iwCYssC2plpjsMsniICKi8CRCMsAiUsHpDzppHiGsBi6ili3pqsjsmsXpvsVCzs1idsCiepupbsvCasaCppMi2paiiC4CzitsmCUi7CkiMi0p0ifswCvs5srioCmshigi1CuCvCFCyCEs3pXiJp9p7suC9Csp7iVpPiECyptpXs4sAsLCsC0iyiRsIsepdidpeiXi3iViksOsaCJimCApxsSiLi9pnCMCUi9sfCwsQiMs7pyijiNsMpKC4CXpgiVsCCFC3iPziicptC9pKicpupviesZCeiuzssYiuiyzDpWpos2iNCTCXCssWips5pCiRppi3zpsvpKCPpYCSivCziKCPC7stpUsds8CE",7975));
    CAIChatRouter.prototype["onChat"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CAIChatRouter.js","iGiOsdzzs5sosesXiji5pMiFp9zypwiyCjiYiiCPCNCgpoCEsTsPiGC6CCCRCuCcpmCYCyswpxpfphCasgiusmpCCCC5s5iLiosuiLCqiqspiliWiWp8CDiwsqpNplCJCXCFsTpQsPCfCKs6sFCEpvsppLpPpbsGCaisChCLsnsnpUsepdCNpSC3zpicpApmifsVihCwiws6iKCdClsbiuplpgpYpBCTibs8iQsapOCUilzCippYsWsypFibsGzzpZCIiCsDsps2sUsMiasep2CSpuiHids8iYs8s7CQCXiupWi7iqCFpjCPiwiriyi0spsrsuC8sKCspmiSpSi7i5pTsNplCKC0CPiPCDCyCdpKiazzpWpIs2iBirsJC5s3pvigCYpgifs5iEi2iNCxClp2zDsTs1imsDsXsHpcsri5sSCbpxpgpki9C7CqCdsSC3C0C4iDpZC2C6iYsmiepYCOpHCwCFphsPiyCIi5pQiKC2CQsJCfpHCIipCYCGsrs1pWiqpzsLpLp4pciupbsFsms3p7s0iEs3ifi5sQiDiSs3p3C6sPpkspC3CksCpgsks3sACGCCCesxCmiCsKifCusZs0p4sls7i3CtiBCbpEs5pdsIs0CqsoC2snpGCkC7papyCSprposHsfsjitCNCYzCCrsdCLCOsuppCzC4sEsustCzsTpFslsCs9spCwpSpBsRitiACRikp3pqi1CRsZsLsUCZippRpRCqi0iIpnp6pCCWipiksPiDpqsHiRiLpgC3sxsui3ipCBsLzCpmsQispMiDCKs6p1iFCFpwspCksQp3pjpvCniHzzCEsbCuCLiCzysfpEi1iRsKsPilimi4sLsvsFsrsWp6pHCXp6CPiCpfCnsgC2CwzJCFiDCviKCCiICUsGCKiKsPsQpEp2pyzCspCFsKCMilCcC4s0pnClispJpLzsCopepsp2sEprsUims7zpiLsysbpziji7sKpLCNphsbp3iniZC9ifCIClsqChsOpNpfCZCeC2iFpiCTicCMsYsWC0swsdpNCTpaCCiRsspGsXC7srpCCFpECxpMsiCepnigpZitsWpQCzC0sYini6scpAs5p0i4itp2ppsczDpNCQCGiXpui7CuiCCJsdpKsSCCpTp1szCTpDiHpApViis5p2ClCypqijinpXCWpvpSsLCrsGsZpys2swpKiFCxCUpai6sTp2sjp9CICwiqCvi9sysACNs3CUpcsPsOiLCLsYCJCxsbpgili3pGi8pQs1sDidsesdCKCZCPiypiCZpisvpdzCpns9sdpps6sniUsaCppCilCwi2pniJCJCZsoirpAsXixphsxiHsBplspCBsdCspYszCYiriWpSpPsopWCnp2pHieiBC6p8CRpVp3CVsGs1CQsPsPsGCypOpWCQsapSsTpGiazCiQCgpKsNiypKslC8zDpKsFCiCMpDCKzpCjiKshswiJstCfp1C4s8iWCgsvs2idC1pUiWiLpKCWsMsDCgCrsWs0iyiXpWivziCiCViYpLC6p6pSiKsFCcCepVCjiQsUpkp4CQs3CNpeiVsbC9CIsnpyCusUsRpkp8pGzJswiEp3CsioC2svCfsSpaCgCBpeszpeiKplixscC7pLp0i8CNsZs5iNiOpfi7p1pjseCUpbiwCyCfsdzzi0syiPCNiniICFs4CrpazDsyioptpnzCCkCgiJiNigpvCGiSsECQC0sTzzsEpvsEpzihiKshsDiFpnpbCgCRsrpjs1zypWpjpKCHiks4irspCJs7iCsRsyCasZi9zDCBpbs3sHscsNi6CIsrpACOCVCDpOCIivCWCfsopaprp4ifsmCHstpeCCsCifpzCspxs4p0pIpQC3i9i6pOpcCyilpAi5iqpgCUp7i7CyCfpgsys5siCDpiiBsqzDsppKiipZpnpOpriEpgpjiwsLsHsMpIscsWsyiJpjscpRsFsuCGpKiqC0ijsCpNiWiWiMCoi3iTCxiMpXsJC3pfsXiypHpiCQC0iCi3CBiLp3CTiJpbCqstCXioCHCZsHpTCppJsnCPsXsDpNpusBpoCqstp2p9iuCqC8pqsnsMC3zppiiMsQpwshpKzpCgpNp5C6pjsMC6iXswpbpSCNiOijihCPpMpUpmsOCypoCTiBpfpditsPi6C8i7s7zCCisVposFp6p5CTsApKC5pTCxikpms3CkiOiwsSidpRsCidpzppCXChCPs7scsKpZsasOp5pfsJi1ikCZpnsUpviEpxCECzpaiuCOpTCHpnims3isiMski7sbsEpzzppEsopMsui8syC8zJzzsrpesYiOChC0sJsJpZs5CSzsiwC1iDiqisCssvivsrsjpuCzsXsFiMiGC6s2p2iosDsHCHiditphpcsGsciEpUiLCPsSCmCYpQpjsnC4scp0sBipp0pvsusSptC1pSifispopoijzppZpYimCOprCuCXCvpusECjsesUsgiiC4CniQicsZCeplilsBsBiYCHCApUpSphpACGpeClpDpUCCzJipppijCvskppsrsKCYpupbiOpGseClslpepTCdCvCBiOs1sZCti9iEiBitCjpNpKpupypci9ziiniEsystCcsxpcC4zCCziHpFsWCPixCAsqCxp5stisibpoCxCCszsepEp5pGC6s4C6CECwstpwp5CDsqCGCXiHsHpiCBCFpqCiCApGpwpCpFpYpAitswpEs7CeCNs0iaCPiislClimpUCAi7smsHiWsYsRiipTinp7sHiTpvpQsQsfiJifssiTCXC4CCiYC3iAChs3isiUifCVC6CYpxiRziCpp1sXptsOpWp5CwiPCsioinsHilsOp8pys6CNpdsjCFiesXiNici1CGsHppidp5psissFpcCIs3paiRCssBshsKCQCCpHi6p7s1s1i6pGimi2CAi5iDiii8sApbChC3CvsfiSpciXibs5pesFi8CWCapepUi4pnidsRpFsPiECziWsUC5pipliLi8CciIsYCii3pQsCsniCChilsppSsdszitptC2sfsLCmsVsvpUCjCup5pBsxiPzisHC6pYstC8CWC1pkici3CRCXCZs7ipsUCwCNpVpuCDC8pxsoCdCapDszs7iQioCpsNCYpwp5ixzCiLiDsEzsChi4s1pWpmsti6s3pMpNiwCSCgsBiYsACwCxsiplpwsepxsfCWi3stsTsFC8supzCQCgCSptsSphCEi7sIsICOikixi5CFptp9sXCECOCzshpes0icphizpDp7ivCwCjsbCNslCIC6pkCHiTiUpmC1pUijpSiksssSipscsKCTiJiPi5sECWCWprpVpmivsCpfijiRCvC1p2pSspikiNCRpQCOCvpBpbpwCbsRijCkiWimiqs2pgsGszp9sOsJihsKCGi1iZsZplppC5iqpoCwsQi0CciiiCpgpQsFC6pcpXsrses6sLpkpFpBsXshiYidCqshsVpZszieCKsWiJs9iKicCaCsCkiksUCZiaiMsDp4sEsop7ihiDsRiVCLsIpBsOscCMpQsQsPpxC0iBpGsjpcsLpmChsypQsxpVCVpVpcCQsJipsviGCMsgiRChs1CoiUi5icCWpVinpdpCioiqCNiks9s3iApOCJiepWi1iys1CoskCWiKiACoCLpApXCSiBC6p1ixiJpGpuCxp6zysGC3pOC9sJpzp5pyiQCECepdpGiKp8pDC4pDszCpi8sWCRpJpPiosXC0iapsChC6sApviEs2pDpzs3pSiIp2sZpKicpViEiZsOsJzCp1CrpBpeC5pcC9scplpwpliyppCjsxzysWs9idi3C9CpCssvC3srizsfC3pesBC7C7sKpfCEpJiEsmCQiGCqsXsnpNprpLCjpxsaCnidihpGCkCQpMC6pPC4C3iUCssOCiC7sBipimCaiDsjs5ppi9CksfCBimCKsoCtstisCyphppijCcCYs9pniki7iti2sgi3pOsPiQiKsJpKsupqCzp4CppzitpqpUpbsGCQitsnCGpHpri9zypzi2zzp5pMChsUsqpniQiYslpbCEpgiJChC6CECwsBs0s6plCLzJChimCQCJphstpus3p4sqsFCEsSsiiNp2iMppCkiiCWi9s4pOsWpqsXCOi4slsKpEC9iwCZpfC6pbC5CMCCsWzishpqsCCBsfpJC1C0sXijsVCipMibiqsssIposfpjsbskpRi1s5pECfCEs5CEzsCviDpCsppXCuphsEsnsHiBi8CXsspCCvshCIpNi9C2pQCMsAC5pls2imirpUpdCAi5ipims4CgCVsZpIs0phsfzspIpQpyCLCiCqCTiyCHskixCis8seCjiAC5sxC1sYpMiusICkiLilCms1CTpDppi5C4CXzyiViHC6sQp6s2sSigCVi0p9pHpFCDsxptCOCMCPsHzJstzzCTC0i9CjsSi1iUirCriXCksjCviIiFCJiRiwsTsys9CXsbiIpsposrCEizChC6i5COCliMC5i3CcCxs7pbCVCrCDi5ilsTi3ispjpViupTpTs0CKpGCjsOpmi8iRiEsoigs2sPpJsYiqCRp5pkpyi4CCimCCCZpPsciNpbiRsLCAsTsXpWswpMpDCkCbCHihsqpyCGszsqCriXCtieiZpfC5CSilihswCFCLsjsCiBp8pNCHiNstCzpQphiUsEiVi0pcsapEiDCrpaC5ifsfsNs9itiMCDiFCWiXikp9CNskiKCNpAsSzDshidpTChinp1CHsmiUsZpqC0pkpysjiWs7CQscpTsSshsACEsep1iupdiBC6pJC3CsiOssi0C5CisFCciUswCQiYs9sxssCMpOiEp0C3sACGiJsmiACYs0CjswsjzsCKpwCKCxCdCZsmCUsAsPspC0CopRCps7C0sps8p5iZsysLpWp0s1swiAs0CWstiisqClipsiseiCsBzisBChsDsMsuptpwiBsriAs0icsasxsRCwsBpbsYiiiYslsRCLpvCgsCizsxCiCFiupksOpkCys1ihiis9CPCdiTpDCCpfCviFsJsizpsypJpuiJpFCEsRiNiPC1ibsHidpgsYpJiKicCFp7CIsbCQp5sbzpsBiVi9s9CwsVsFC9sBiNi0ispXs1CbsDi2pFCCpRs1szsjsKptsFCHiTsup3pKCyshsKCYCxCsp5p6CYsOCwiRinp5CNi1sGiTiYCdpzpVpCsZC7CaC4CyiHs7pssZiAsWCppsihCzCwp8pqp9zssYCkpJsGslsNinsvCui3pppPs4pyifiqsgpJs4CzpYzDi6CvCesCCZsKCAiCiBijpACCC6C0iQzDpipHsfC1sLsap5CEiwphiEiTi4CqsepYzyiEstiVi8iaiesIpWi9Cmp3imiWiNiaiDC2iQiHphsSsmpvsVsTzipSpZsJCZsNsti2plCUCKs5iGspphsjiYs2i8iFsJpYsdCyC0sEiDsrCPpQilpFzpiMi9Cqi5syCPigspiAiJpwCLi3p8zspMicsxsWiEpJCYssifiwsJC0iYi3sSimsnCsiOiPiDpji6sUizs2CFsAiKidC2iICKixpAiIsWs3zpipCLpUpvCtpmpFios9igpFiqsksZsQpHius3CqCaijpMpesjsYsBpespshp1zyCDpJiDphCgiJC9iHiGiSpJpyzJijpBp0ihCUCsCQpPpQpKpXphiCimsLpSCxsuiziKsqCkp5sIski4pGigpQsgC4pcsxphidzpiFCDivC8iYiUCmsHsWCRCsCBsfzziGC6srsJppzDi7pACfzyCGs1sECksKCMiICLsxpxCApEiFC1zypmphCOsvCasgskpHi5iri6suCxpMiWidCSsYsgiapLsqixsaCqCPCypoCgChiMzpptihiwiFsUp2CDCCiGiBiUC9sssqsIpiiKpXivskCtsxpos7CbClp8imizCgsTiJpjslCbsNsas6pgCqi9iKiwpwifCXpFshiXp6iHpBshigpridp7CDi2p6i6ifpgpfsGiSpRpzp4pYpjCNiepBiCCWCvCBCEzsCKsSiCs7C8i5pasGinCMsapZixCtsUCRC4p3svsrpppipspwCZCVpRiSC5svCopIiZsSCeCVpapzpNppswipsCpNpSiZsliCChiFs3iViJpCsYiMsypEpVsBpdCvp1snCosQp0iUiwCkilCNigsZpWsciPpvC5sMsDCEiQCYCRCPpUCCCdi2CZCmp0CeiDsnpIsys2pUpTsepTCzs4CkiJiOCas8sRiWpaCnpJCos7sQiiCgpGiPpGpACLp8sKpRs5scikiEpGCApSi8pbCPiaiFsoCtCDiysEiXCnpgsfCviDsdpTskCQsUCopupIpkixCVCWCHpqpNpGCXposRpeCgirsIsYC6iVi1C8sYiDiqCli9CCCKsti8skpWpPpmiqsXiNsAsLsrChCCiWs1imsMiIiZCrCIpKChi6ibChCasvChpmpdsoi9s4pRpws7sBsOs9i4iwiRp0prphCICVpCCYpmsMiMs5ptipCQzppJiApoCpCPssCBpdiUi8pbizsQCZiUsVpHiJsdi9iKiUCDzCpEsCs8sai8CTp1pbiaphCgzspNpEp4ips4sQpbs5iCiri5stp7pKpBCvpfzJiVsfi6sXikilC2C9szCpszs3iMs2soCIiEieiIp7pizpicslsCikCxiICqCHCaCjiDsWsACbiAihCwsFCqs8CSiQsTChi3sTzpsopICpiUCfpPsksRCNCWs6sLstioCYpbpTiLsMsripCvpniksWCmCXC5pCsRpEzssFi7s5pGCjCipkCwp5CDsziLpWpHCECFCFpPpECNpfp3CUCFsssbsxpDiNCtpQpQp5i0pMsJsop5zCsEC1pYiZC6sXpdzpigimiGCpCviJpBscCTCQzDiei9pizziuCzi4CYCSpLphsnC9sBpWpopkpziNsMiuiTpBCfsiixpnp8sVi1pXzCs0sdsusLi8CVsXCYCWCQppiaitsLCvi2CWCQCXsesksECspxifsGp4sNCVzJCms1sLiGzziRCDCOCaCZzJpwsHCasXi9spCuCcposesEC8stCKC2CTi5iGsgptigChsys3pKiZp6pLCQiECACuziCWzip0iJpECoiHsUsYs3sEivi7stivibsPsLp1ijiOsqiBiIpVzppOi2pqiNsoC9iwiSCrsYszCdCPsszpCesUi0idzDiCs8sLsbpJziCBiriRsms9pciQCup3s5CsCVi7CgiUp0pbsQsdiHCiieirp3swpUiNC5CnpviYCOzDsWsvsbpdsisriQsBp2CpipC9pUCQC1sBsnCtssCli6pFiosoiaCQiEpuCOp2sHstiqCaCUCIs6pIi3CPiEpKshp8sVsQpDiYCZCiCGCaiXCwivs9peCFsLpOp2iGilieCLi6plslC8ieCosPsWpbCFpLpwiippiysfsxC6sBpXp4CVCWimiKCaiLp2i1pqp1smiApOstCtsRpPpVijCsCbCJCZi9inCCilC5i3sCCtimi1pepTiuCoCcp1ppigihpEpqseids7CUCsitp2pyiNsjs1s1CipGs7iIsxCeCpilCOsYpni6pJpfCtsGi5shinCasuCNCopHs3CTiLiopmsGsWiFsxp1ssi6iwpACXCap4ptimsxCZipi7iXsAC6pOi2sqiCCuixCDCAC7Ckidi7CUCBsxpCiQCZC6s3CTsZCUiKCQCEp3COpEiHiCpopUpssFpKspsMCdCDpvpzsJpWpLsZi1iLp7sdzzi2pziDsViUs2i2zspqCzi8sZs5szsqpmCtpds2CDiSs2i3pFp6Cap1phinC4iEiqsqCesWs8pTCasoCKCCplsFirpDp7s0CRCvs3sdimC2pFzypcCiCgigptCdskiCCNpgCviziXCRpviLsJpTi1iCssiOpSCOsnpFs1pVi5pPCssQslsRC8p8sqiYi3pmsDC7CfsSsMpqCTpVzyCkpbCcCZzypLp8pppqC4iyCCpDCYpSi1puCLpPswsbibiLpJpfpgiAsVCzCPp4CDiqihzpsuiki1CziOsHpKiyCgpPiKiDCdCDChCcslski8pfpSiwipsFzzsXpYsLpCCWpMimi7sfiQiGpSCop0iJi5p1Cjs9ixsqsNsGC8CtpVi3p6pfivCLzipKC2sMsZsWpxzisFCYi3pBi2i3iKs4sJCBiysPpPCNs6pnpqiLiosUCzCOs9ibpki8i6CxCYseCzCACPpYCkpcspiziVCdprpWpUC9iVi9i3s3CJpmpSptzDpQzCsMpUihpYCXppsTsxCfssC1pxiniwsgClppi3iApDpNiFiHstCLptsxsupwpvpsiLsdivsHi5pssep4iJstpwsIs7pfCpChimCbCJzCsWiTsPCqCnpusasyCVsyp9iBsUC1sQi8CUCKi1zpCzi4sFpMi4iCCACcsTimsSieiSsUCRpcsipQpwsTswCxCtCEppsHCRiACPsBCXCjCupmpcp0CZCZpBiopBsviNi9iIi5iki1pmCdi9s1p6CwikpipLC6pEzCiBzsspCOCwpApgsdpuiHiLieCVi0sxiTskCwCysCpEpGiRiCsrsfs6CppLirC9sgiNiiCrC3C8p8CxsVzpCnCBi7pUCYp4CSsMiCpzpgsQCCspiui7sPpesbCEsei4s9s3CjpIiPpliaiViRijs1sDiEC4CairpVs1Chp1pZsBsqsjCusrs3sGi0ijCzs2idpFpEC6zyCyiIiPpSsvpPsni7s6Ckp0zDpOiBiliYCsstsRpZCQiHpOsgsds5sUpwpTC8zDC5pNiTCcCMpVsMplpditpLCRpQCfpepOijpbpxikiBCFiFpiptp4pnziCKCciHiEsxi7CNCviPC2Cvi4iwpPi9siCsiMpzpBpLsLp2sMiFC6CTCUi2pNshiFpkpYCQp5pwiWiHsCsBiTsvs3sGpCshiApFi3s8svpeigiDpGzJibprsQpdpaCjp1CJsDsHCtpLpmpesBsHpbikszi0zCsVpQpGifidivC7smpCCVzpCKsziGsmppsriqiQiFi9p0sEC9pHCTsLC4ijpbsps7skpipYsniJpRiyijCZsZilp4pkpdpiiXiYCUi7sfCfseCZpcCNsqCxp4CMsjCLCkC7sCCHsvpasgCLiciGppscp6sbpKCjs4CypwCriBC5sViapQsOpVioiBiPsNsvpNinCIsTivseiJpNCXswibiJCGi3CqCiCcpPCziDiLCsC2isiPi8sSslsbiVposlp4CbsQp0itsLCXp2sUsBCapqCfpIieitpap7pGiCpgpXC1i2CypeCBCtsVigs9sxCBpuzys0zJCwsEChCBsNsgsGCqsQClCup8C1pgsGp5izCiCHsvzssOiviusAsPpOsnp1siiAsNiEs4pwCBCBi2phCRiXpiias0phChs3ipCJCcixsGpapksviiiwCmpHpZiKi5pRs8sepCChpfC8i6iUili4iYsosisniwiwzCsksRCApNsrpgCAiApWphpQCWpgp1piiWp5sjpLihsTC1i3i7pGiCiqCJCMiUpaCksxCAscpnCei4CuCXpDsLCoCvpZC6ClCqpNpOCdzsilCKi2sdCBsVCvCjiUpuzpivi9ippssZpnsIsWioiVsxiNiUCBiCCasLspsEsuCRCeswsGixslCkCzCOzDs8iFC3iairCksDiTCpsiiHClpIpniyC5iwi5iIpzpOCkCdC0pNzyCIpPsVCOCmp4ixsQsFicsZp4sMCxsWCqCTsZp0CNCXizp1pGC8pJsWCNiQshpIiLsZsvils9CHszsTpui4CFCgsbifs5ClsFsrp0CVC9pZs4pICxixiNiFsGC4phpTzJsJCLi1sCp8s3stsapGi9sgpuifpoChCfCYpiCMCJCmpUC4plppiApIsAp2sTpDiop5zssFs7pMpkp9p5pRiwiMp4s1pesdpxi0stiHsop8CEiAsPi5sYiriWsAsvCXCIC6CVCCCxshCypqiTsWCRpoi2C3srsjpBCyswidsXigsFpIi2C9CtpBCyziiuCBp6iNCHpWiciRsQiRsdsgipCCpesPsqCviQsqsviFCTCViiC5pismifihpQpppvs4C3sHCNiOpRitp4iQpvi1ibiLCvi6s3pqpXChpes3pqiXsOpCCesfpspxsdpCsjCMpcphiEiAC0iOpOscseiiiQziCdzipWstp9pcCgCCims0CFsjsdpZCPsrsUp7CDpyCxCZCniGpfpZiSsOswpsiFips4ptsHi7pLp6CsCaCki5p0p3iapCpPpgiiCJsOp7sTClzDi6sppbCNCpilpoiFsdCfpKifinCCzspLsriUCLiqsepriisOsrzpp7iopICspisoC4iwiQspi0pYpUC2i2C8i9sWpICZiJsrCWsoCrC1pmpzCdiAsGCxiOsli2CHsFpLCLpUzDCXCki2pDCeCozzCRsACIi3puimslpmiFsppUiTi1pUpuiBimiCsGC2sgCvspsCiJsqpoCMicCQCes1iDiusZiwitpbCFCPpbC6ifiDiGsLC5p0pZCTsqC8sFspCFpJpKpxsPiWpECdpDpNsiiAiipMs2Caihsvs5seidsqivCQs7ioiKs3iKiCCxs2p5pxC7CHsAissApsiQpisgscststC5CNspC0iEiAsFClp5i0Cmsli2s3sgCuCQiICTpkCwpkCNCqpQpziFptCBzypwi6CApji7pusAigCOsBsSi8insqsxsGp2suptp9iRi8sIsoCGpFCHC1C5s6sIioC4CgsbsrpDsHp4i1i3CksasPsKiJp9CXCApqiMsep9sIijCaC8sqsZiTpGiipEzzC9pSpmiPsUsCpNCjCpiNCgpSpwiGpFiBC3iBCaCOsPinpnzspnsFpNiOpliSCQi6iMszsBCRClsczDCnp6iZinpFpRsvsfp4i5isiMpTsqCTiiiziIsVpTieiciwikCwiBiizizzilpwsNC3pZi4iVsAiJzspLsjCOpTCyzJphiMiviLCIiwpRp0pFpjp9pNsGC8C2iXsgieCDsQC0ioi6C7CoCTCIiNpqilCRiop6sMpYzyCACOsWCvs4icsxsxsHCqsqCpiOCXCjC5C5sVp9sPpLiiiiziCbpqpuidieC3sLslp4iksepiinsxiACwp6iLCwpbsKsDpzpRCApfCgpSCmswzDsnCKC5pQpCCHpmsDpxsSiWitsMp0CupXCMsnsiiOzCiriDC4s1s3CIi5sbpwCgsLitC4CbifiJipCOiUiYiXi4pGsCCui5CfpDiTsDpuzislpBpWCHpvsapDiXsyimiypapTiACyCBCEpPpqpqpVsbzCsls8p2CYsLCHs9CEsGiUscsmi1ifCOziC2iyC2pUszCAi8CuiRsoi6sbCkpwCQiosriziAilsYp5pgsGiiiZCCsrpgpIiUCvsqpziJi3sisSsts8CTCjs2C2pnpmCxzCiypLp0C6sPsJCaipsKCdzpCdpjiFiyCdizCJCksQCszipWsziuCjsDCMsosasuC8i9CUsWsRpyiLiRiApEs1ieipCLsgisiLC5pCiSpviPCUiHsKCWCRiuippLsuCTiwsKszswpQC3ppCCsKCbpxCWpXCYsbssCvpcCJCjiXi9CyCGi0p6pNCkicsrpKCXies0s4s3iYsnpQsuCeCpCXinsasGp0COivCIprzDijprzyiOilpmpRsTi3s4pYCnCNssC4pxiuiaC7s5CrpwiDpoiepRi7zJpkiRCBzyphCfCtiRC3ibzCCNC9ibpEiPiYsCpFCvsXC3iEs3sKzpiGi8imikzJC9sfiwCeiqpSirp0iRi7i2pOpmiQpfpyiZpbpzpnpPp0iqiyCrCwivpMsNpRp2impzCMCECwpvCmChsEpDCxscispdzzs9ispspksfpiiis5CNp7ijiJCrsup7shCssmiCpkpHiDpVswiJsbCqCHC8pHCqiSCIpRi6ixpppzCysyi1pTimChp4p5iIsAstCKigiYsSsZzzp9sJsqsCCECeigp6CXpritsMC8CTCfsgihCPsFpqCSiTplCbpTitpDiCpViFCOCnpfCUs0idpssPs5iziziBCniKCDispDpyCVsSpriopSpssqiBpFissXpSiaiSs7iYizCYikCAi7iCilC4i9iHpOiziSiupHCxs8CbiYsjsRidpUp3iNizpGicCjisC8s2C9sAseippfpvi5zpCRi9s1pvsBpXiCCxpFpKiksPsuCKi3soCtiqsdiNiYCGi3iZsvsls0CCixCrssCMp9sBi5p3iUCHCTsGiViXslCqinsCimswiAiqpzspsrCiiqCZsgiBCIpJiECFC0CmpH",10709));
    CAIChatRouter.prototype["_connectImpl"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CAIChatRouter.js","soCiCJp1pfs8suCVsMCApoCwsFs2iKsViciMC9srs3CNCbshi6iWpsC0slC2CniVp8peiYiDpep6iLCwsazppgCYsSpFCPiepoCnitsBsmpWpzstpKiACGiiplshiIpeplzziipcpFiBiLpOsECOC0Cwi0iJClCWpRiaslpRsnpepkpwCIs7CysgC5pwCFphChCyCHCNiCpGsNsFsBCUiwstiksNCJsMCbCVpVCSC3saiPpGiosOCqpZsosbsfCriTpazpCwiDCop7C0prCqpHsisECDp2C6sFpDCXpeiissC5sxsbzsi7CJpOsHiUpzCqp4ssppi9szsrpWiqsCiRsJsaibpYpTsHCWi7CXiGpAiCszpCpwsQC4iwskpWCkChiFiopFCOCwsnsQieC7iBCepGiyCpp0sSiyCcpRs8ibiKpOiSsSskihpeinpXpQCZsDiFpfi2ziiVCvCIp4smpCiEsXpTCQpaCZsZC4idpei2pypgCwp6pKirCYC7siifprsSCapHi0CUsYCqCAsAsDCDiKpbi1CsitCppbiQiHiACXiACjpasxCTpUp0sTCBiDsVsvsQi0ihpYpOizs8inpuCFiCs5zJs0pjiUifpDpGC0pdiOsui7CBC8iipXiKiuCvCYpriop6iJihi7s1inpZsxiosXsPswpDC7sppdp8skspCoCmiSsEs1sLC5CesiCtpfCGsKpMCZpmpys3s5zyC1CopaiyizCRCeiaposwiBCgpSiJiJi4C1p9CbidsUziplszszivivp5CvsUpOCLCViApYpIC5pypcpUCbCUphsnCvpRCsp6i6CvsvCcpqCRsap2sMpgCZpcCrpKCLCyiBpGiTpmiis7pAssi2s1pds7CcsvsGsVp7iqpGssCSpFpWpgCQsri7sGsaCZs2pWCdpqsHp0i5zpiupgiRiGCWpxpACfpOpjC3pgCLiSpNsDsDClirzpsXsSs1pxp9sEpqsYiApIiYpfpeC5CXzyCZpbsOCxsNCKpwi5sjCrpZpjCqCWi5pZi6s1CmpYCZCHsGpiiGiti3C4C7sypDsYpNCHs0iHCys7p7CCplCwpOpxzCseiJiDCmsPs3s9sEC8pnC4CailCDCXCZCDpVsbiRsxC4pkCPiyiFCNpQsliUsHiAs6sJsiC2iLpNpyi5scsdChi3sni1CuzJCrsviLiuiEpNC5sopXi2s2sSpxCUpyphzJCWppCgini4iiCjs8piiPsLsDits6CECNs7pJsWp9pxsJsisPsOsriRsps2zDC3sjCiiAsEpniKsopPpECHp7iliBsqsasgCbixpYpzivsMsoiDCmCKp8sACnitCZC4iFsQsppvCfCYCQiYshpfCxsIC1sEspp4sGCpifCdsYs8iupRCJCmp3CHzsCVipCTCPpApNCYs9C8ixs2syiJs3iOCcs3puiRC7ssp3ClsyprsLiBC8inzCpCiMCbibzpsuCmC3CsC5CUpRsTpqpEibpyiBibsSCypssaiXipswCYsei0pzClpKioCipjiTC4pksbCGsPC7iHpyCks0s0iwCnpys0srCTpXCBibpfstpTpspbCAprCWCpCFpmpcpGCCsJsHCDzJpapGpQsOsZCfpIi3sksdimChsAi6sCpXplCRiZswposcs6ieC7s3smptiwsqpKp9iwiKs4poiTi6CysuihisiKiIpXpGpZi5sAC9CIshirsiCBp6iIswCLsJiBsjCfiwp0C2pYzsiGinzziNsGsiCqsMihiFpKsppspvi2CiiRs2sGsgCLphi1CzsOpepICMCwirpKCZiypCCmsDiAidiWCJpPp3ibCVCUsLiVs7p2pwsapHp8s1pdplCWiNpVCaivsBsGpHsZiWC2pcCciNCXCeicsGCYCuCXCQCtCliXizsUi1ipC6sVidzDC6pjpjiYC8i6zDCkpopDCxiOiJpIC3paiQsNp4s6C8i2s7zsi9pqp3C4CNiWCsCQpcCAiHpKC5CPpAsss4CysVpypXCqs6C3CXCUicCFCHzpCSsUsjzppLC1iGs6pwpRCfCLpMpRsqC7ibiMC0zpCzsuiWsApqpsC3pwCWscpVsbCKCXsXi5CJCTifiFCgpWCpCqpyzss4p5iUi5zzsJpNiOsZpSi2p4sNpqiKicpOsICesosMzDi3sOC5iPsvp7iNCvsvsMsMs7ihs0ivCMCiiTsgiaCwpninCwi9CXsfp8sECypxiDCDpusepriIsFsCCHpdsciop2Cts4CdCgpIC7pLpzsxC5C2isiWs9iBsyp8CTiXpdseptsoCmCkpyiLzsiciJCMstsqpnp3iYsXpRCAili9p8ChpxpKCipCCEC9CwpgCYs0sopSiKsPsdCtp0iSphiliQidpYsPi7CNp7pMiSpysZsgsksdpspOiEs1pxsUCXpbp5spicpApHpRp3iKCyiziJCJpCCDCXCssSiwscsnsPitCYC0pzpWsxpRpPsZpyCuC1sIChiJpFigiKCVCkCXpGC9iXsDCXskiTisiCzisizizzpqpuprsfzsiXCtC8CfiasjCEsypUsCiFCTsQi1ivpxsbCYiSiPiQsvi6spiMCMpMiRpeC2pei9suCfsiChimsNCnCpCeiapqChpwCjCks1pEigC1pYiBCACIiKiSiKiRCCCqiXpqifs9sSCxs4p9p5CpsApNs6priRpYiWshCep9CksCivCCiTCSsnsJiaiACtzyCxicsgsTiOsQiHpMpGpICkpQsbigCQpwC1iBCrCcCBpvp1itipzzpNsYpuCmpWpqC7CFCPiZpACEpwiUsdi5iMCqzJikp0pMsFsDiTpRiUpNCPp1C5s3sxCHsmCRi7p5CmCLs7iBpVseiviTi7iViWs6CtsNpkpxpepCiTsKCci4zsiBiKibCFsJpFzppQzCp4ChCBCwCxCkCPsIsQpoCSpyC9sLsPsHsJsRpipCChCMsSsCpNCvsAsGiHpiCmsgzyiwCfi9sNCAphCUCMiri2pLzyp3iBi6s8i7CFi1CRphimivCbp6p6supusuCPCHsNsYCppFCaC8pssrpBpNshiqimCOpgpgscsHzDsQCSsdCKinzzsNsbC2pup0CqiyplCACtsViYiNs1p1CYpqszi2sLpdpHsfp4iBCJpaioiriCpHpBsWsvzzpniBiSi4sxphpYifCPs0i9CiiGiWp6CViECZipiCsCsTpfCRCUibCiiJiIsRs5p8s0sKiuptsxCGp5iBsPCaCDiBseCCsfpOp8sTshstpCs9siiyifC3CQpECbpCCSpSigCmpvsFpxi7iACSiKphCcspioili0p9supDpECLppiUzyzspuC5zDpupIpMiACriUCdsopVsfsICtCkC7Cjsls4igsNChixpBsUsDpKsvpWpvpOsXifsRphpAptiupas8pcpKpTpMp2sksSiFpdpjpNiJiTs0peiBpAsHpzpCCcstskiTp9sCCAinCYiTsvibimiHpssjC2ijCCiriepviPCFC6sfp4swCeC2pPs3CbCYibCciXpVsEsksliKsUzCifpKpEslChp2p4CiCfi2i8zzChstCLCpp8iVsup2pKi3zDi9iECFpZCMsoC3pECPsuzspLi4iHiRiosPstsJCNpgsnzJpMpbsMCCsaiuiyiHpaCPpiigiVpMs8CkC0izsFCcCHssi8i9p4CpC7psCWsFiBpOsJCri1p4CSCuzCijCms2C4iHiIpcCrpOidiniypECOpXiXpGpYCnpVp7CaiqiECbpSsPp5CIppinplpisKiFp2pGCoCPstiNpOCIsgs0pEzJs7pIpqCLiOpliHs9s1ijCBscCkpusMCgCXs0COp8stpZpPitsvsKCLpxp8pJsmimsLplpjp4CLpGicpXsbs7pbpIiaCAsDicsApnsdC9pBiHsms3p1seiVCZiziGzsCRCmpApoiDsbscCXinpZC4CashiPCHpzijs2CWibitpmC2CKiviCpZsbspp1ifp9iOCJpTsSpNsNiQCgCQCsiui4sKias8zDCOzysjiICXsFp1CRpRCtCapQsPs7ihCKsRpjsji7pWiFCFsKsdpeC2iJC6itC2sZizzpC2iRsEsosECSi4ikiop9sqCaiyCTpkpvCPitsppcsipgCfsGClsXsjCFi6pwzzsGp4izCdsqscpZCnpAiligC1CAiOCep5iAppCXicshzpCtCdiiCRs9sXpjC2sPC6CdpysxiFili1igiOsniJpzC7CIiUi1sDsQC1iopNsxiWsRCLswi6i8s1sls3idsPicCasBi9Cdixs2p2sTp4pvzJpyCnCUiXsCs5CMCHCopvCkiTzpsQippVsDieCaiipkCqpPijiypnzJswCFpQphCUzsilCrCoC5i3ikpiiqs4prsypEiiCoCQp9izsXCIiQsDsJias8sLpSpgsWCIiPpWs9pMpWiep3p2iICnCTpOimCCpAC9CxzipFipCYiEsNiaibiOiuC3pws7iRpOiMCqCBpgsoi5pnCuinpLCrsBiwpTipiuC3iAi2CIiNsJiCssptpBsIsgi6pjilsACiiCpezDpCCbikp8pECpseiupOiQsBCIpgikCQi5p2CppWpWsMCNCtsbpQiEsoCoiEi4C7CHiYititsxpTpPiiCMpPifpCpnshidsni2iUCdi1sHpqsQiaCHshCXsQiviEsZCaias2sqilpepfsIiDi5smpoigsxpMpZsYs2CmstCBzypWpSs4zyCrCkisiCsvs8pkpti7C3iopss0izppsBCei4iRCRpmspsJsfCksRstios8svpCC1i8sIsZCzi3CipxiFC4igplCMCasPsCsNsnpuC7iJzzp1C3CysOposdCMims3sBpZsbpiiVpqpYCmiqs7sxCcp4CMiNCwiKpGs7iFCKpTsxiJsKC8p5pistiEiVpLsQpUpvpPplios5icpDsZs2s9swpAzDCVpFCPpWsup7paC3CKswCtCmpMiPpnsJixipiViOpiCZpkp0C7p5sQpmpaiCi2iJsLsRs4sAswpip7pliys9s4ivprpUCbi6itpusdC4sKpdsysUsZpSCHCTpIpoCxiOC1iCCypuCUCepaCjCgpmiisQClpcpDpKp5sei0i3CLpOs7p6C7ClsDp6iQpIiCi7ssiMsWCgs8sKp7CkC2pgp6iGs8Chimiss7s0sYsypTCii6iPCrpYCcCoibp8s1CtsPpkiPsvCgivsns7ippBC3igpZs4sDCdC8pQC2prp5iAiZCaiDCUCrsKsUC8zszpp2iNp4snpGitiVClsTivCfpCCfitChzssDp8pECisJCgpapjiUsyCGCAsEi7zypwphprphinpIsTCQs2pEiXC3sHsOCdphC6iVizsppgiSCCi2pEsSCSCKpSsNsWiRsLiQp1pBppiJifsJsaCACHCEp5sxpop4sVpOzzsppQpjiBpzpkC7iApfiOpZsqsXplp9CFC4s3pUigi2sls8CSsDpuszCpCus5CZiwp7insLsFsjCbCziksrsbpoC2iGiCCJCDiFibCRsBiiihpfiQs5pvpRs8pcCTCGzsi9pKCqsyiNixigsdsICJiWihC2i0iEseskpvC9pzCbzCs8CfpTsWiusXzJpmpPsUi7iUidCasMifiAiSCeitpVsdp4pHibCMpjplsislsspXCgCtiipzCaCqprp9sRCyiJipigCisvsopHpOCyCfCZCTpsCvC5ikCWpBs0iPsaCvsPCdsysmCJCgsHsLp2pTpbi1iniICxp9pJsizzs5svCLszCXCwpciRzzsbiHCWC7CWpvihCxiZi0iZiACRpni1C5sdi4CFissXpVpniliLiMiVphiWsQiziLpLiKC5CFs2pFC3sniMCYimpos1pUp0sOCXi3CAC8iTs4sCCpCKCUCCigCqippMiRCssOCFpDihCgsfiWiQCmpssyChp3phCDstpFCUsFp6p2CWCFsYixCppSp3C6pjzzsriEiDsriXCjsoioiwpbinCjCLieiVCVp3phCQp0Ckp6sRzCiypDziscCEs7pBpLiRp8p2iKsMpepUpxieC0pPiPiHsQpDs2iKiRs7itCDi9CdpfpRsEC5iUiPpOpAigpHiksRsxs4stpYsTCAp4zppNpdsIzsiZsFCTiOpTiyCZsestiipjpDCwplpjpnCosbCfsUpZseCrpZiupopniysDCtp5s5Crp6sqivCrCVpJpcCusGpnstsuChClpusniWiOsmssCMsbiqp8sIpCigCjsysdCqskibCdsRC5i0ibsNs6CFsEpYplpssbp2CVsgizp6sPpBsvCJsQiKCGCgsOpji8pniyCDiPCmiHifCOptCLCvpeimpaitCrsDCgsDpTi4i1CtC6i9C0sCpmCTCVsBCLiTCHCopXsyiiCfibsjsBiXC7sHs6szpEs1zJChCTskCCsyCQCdiKimpgC4igpXiasYCxsSCqs8CoCLpJpMsDiYCbiOprpVpNCRsVs0CEC3sqCIsJi2CVzyCipqsYiaplpEC0phpXzpCBCHCkpPi5CdiJpSCJiasipjiaCnpICxzpifsIp0CcCopqp5i3CXC1iYCUpWpDiLpDiyCHp2iNC1CNp9pGposUsqiMp1s5iys7p2CosjiFiwCMsjpipjzCCJiDpxs9sgCVC4ppsosdpsC7CUC0i2pDpkCyCqC0pJCjC9pQCAzDCDpgslsvpriKs8CXpuCepnsOCMi0idi0ibC4CCs6p9pLsNpPiOpgpoiCpSstCwsXikiyCApDpipUsTpsCDi4sBpRiWCZCcpTpVs1pXCRCgpAC9pasvCHziiapEinCcppCxsHsnsSi6iksSsJsliBsPi5Cas5CZCwiDpxp7pWs3paihp1sisUpEpWi4i5swCyC3pLsts6pBizp7s1pBslsYiWpizsCwi5i9pwpQCapmiYsFCYCuCgsIpgCOipziiYCTiSseiws5pzicCMsCCkCfziposqsHsap4CvpRivpoiKsUCWppCrpji6iuiGpRijCypDpYs4s6CqiasisqzypSCnCrpOCppesfsACDsBC9sliwCdsBCAsBiDCGiWpEs0pksVs7sBsesYiAsQpxs8CmC2plpjpTiIsECpiQs4CnCkphpFpbiYiBs0pqpVCtzppdCep6sdiOiOi9posfpACTp0CCp4CoC2iPpjsGCgCopKsBs7i7pOCUCbCsCestsRs5CXCFiOpFpBicsnsqzCCBpECkssCYpWpgijpepZCoCLsEsiCqptC0CNpIsSspiaiCpuClCxsYiApmsip3pNp8i4igp8CeCri3p3sCsyiuCjpIp5pUpeinCgpEp6CIpRC6sdixsgiyiXifsnp0pJppi4CQiwsBs4CPiZi0sbicppp4iLiXpMsPpxCMsqptCrizCdpcsYpHpRsYCZirsXpIp7p1icsWsMsmp0pjzipHCKCFCYCzitpRC2iBsRCZzssMpeissYpfs8i6ipiEChsjiIp0CNikpViEsRp1CWpjpjCjsapasLsEs7i8pDCApHs0iOpissCTiLpfi3CfCGsNCXs5CQs5ChCisQs9CKCrs2pZCpsJpGCrsMi0sdsRizpICDCssRsaiyCjCfsCpoCxiCscisCxskiHCeiwiyCICyCTzyplpUCxiNssCTilpCC9i2Ccsrs7sECgiKijCciRsYpwC9pfsKiWiviGiMsdCUpNp0pLseiPiuiGiBpQCEpbCOCusGpzpCp9pDshiJiMCsspCGC7sbCdCAzss2CcC6Cqimstzpi1sIzCCJsDsjipihiSivp2pIp7pMCmpks5slsOsSp6CZCasyCSsbpZi0iApVsDCLpypGCqsiCRshpApBissnizCAp8CosvpTssp7ziCcCSC6pPCjpgp5CNCDs2CYixidpfpSC5CsiDsRpJioCzi7pEsBpNsfiCC1C9sKpzpEpfC6CpphCjiwp9Cfiwi8CHzssFsUitp1iEiUC3iRCnimizp7CIiCi1slCMsXiACkCesppOC4syiapap0CKifpXsHiTs1zsikihpDiiiypYpACcp0pEiVi3sKpSpWCfCVp5i4przzpFzCCopmphskifs1pBsPpVitsvp0seC9s0s7sdsZs2CICJi6pXzpiqpIpZicCdpNCqi1s4sNpPCqpACFCTCiziiEiHikCdCfiwsSp8CzCuCWCvsSpsi0pVispNsYiFptswsMpHsZi0pyimpsC7i3ibsLCHCMCKsgCEi0ptpziTs7iECrzCpwpZpeiFsKCbiaC9p4pazssBpNiXC8pkCOiwpvCdpEzJiqpNC9pssTi4ilpbivpwi6iTsMpQpwiUiNsICTCXi0CvpSCNCHp0zCpBCpCNpMsip5C1Cap4sWCSiGpbC0CyCyiFi2iqpoC2C2sisCpRCUi7pKsYzisRsWpBsEsICisWsbCUs0pAiJsYiBizsspcsHCdicCoi4sCpgsxsmCFiasxsYigCFp5CosVpip4CxzsCsiVCoszsVptsDi7s5ibsFirCVC3p4CuC6s0pJpdpcsipYiVCrCnsci0zDiMibCEpPs6sHCzCjCxpKCuCssGiqi7sQixs9ihCcpNCIsisqiysqCwCGppC8Cpivses2pNsgibCFpNCri4pCpCiZiliepQiapiCYpJCzCqsjpSCyifpOCBzCi3iSC4ilsLilsLsBshsfCyszs9ptsaiqsTirpWzCifpuCqijiYCrifp1ziiwCIivsNp7sHC0pPiXs4ivihsmCFCkC4pJiMC5CRiJp4pUpOiUifCXpTs3swpMsRp4CRzJpkCYpUpYiRspsssjC6s7iHCBCFpopJsiCQpgifs0sipfCgs9Crphpizys2pCirpgiQsYC3ptsFiwpNpks0swCMsnsWimCWpupmi8CyiBskisipChpIi8s5sQsPi0CPpbsGpyCAslsbs4C3p4sPsbppCfiuiasei5pgsLpBiop7sNiZsUilCysIsCiRi5CbiDi5iwpHpWiFCJp1pNsHizCwCVCVptitpOpMicpnpBCtCYsopZC9sds9CnisijziC5CfCmsos2sGCmCLiiCgiqCZitChC4sGCfsdsRiSi8pWicC8pjiNCMCasqsXp9iRpDsisip4puski8sIi1sIsVCSiRpPifC0sIicipstC7iBphpqs7phpesvpssBikp6i4iiCSsWCSC1iBCCs7CaC6idp1iVitiesHilsMCtiWiwpXp9pLs6sqpNCJplCIpli1CXiliJposOCyCXpLshiNp7CZCVitpICxsTCYivsKsNski0Cai3iOiMpqsxphswsIpysnpUiBCkpbCCsACgp3peCxpaiss3pQCApWCDCIpTsiClsTi0CLCKCTpziHCTsos9p4CkiHpWsnsuiRiUpvCIiJpIi6CosXC2CXpPsRpcpwpxziC7sspyiYpjpmCviPpNCYCJpssAslpliQpDpkC5pvsFi7sqCWCOpQsys2pfCfiKpRsGCjsepXC5p3iuippMCeCICisapnp2iXs7ippspGpszpCrClsEihpKpuiAsCpfCpzzpXi8sipBCICxCBsVifsZsBCMpOi1swiOCPinids7CBpdscips0slpDCCiXs8sACTCusssvppsgptpCi6sasuCIpeigs9zJC6syCCCdscChiIsxpJCBCVp6pwp4sTibihiVpupYiUiNpdpys9CZsUsJposnpxiHs3pCpfipsopFppi5CXC4pgiWitiCiWp1pgpusEiMpkzsC4pbsoC3C2pCsLCJsCCrpjsBihCRCHiWsIC3pTC8zzCesPCQsnzJiXiMiZs4shiwpDiBpsC3zzC4iKiApciICOiAsGCXiEi2s6iGiXprixpTswsKCciFpbp0iFsJCGifsLi5sRi9pKsMsMplCNsEsjC9ptCvpbiJpHpECICrpfpzswpSC1pFCXshp3sWsECEs0snChiDCEiXCSpsioCeisCBsHsQiwiop3i5CRixpTstseiLCQCFC7zpiypUzzi5CwptC5Cap1pFsmpQpwC5phCsiEiOsRpWpwCviOpyCFzsiCCvCMstCcpmCOijzJpysuCwzCp8s7phpjCapNpOifC0iBCJCNs1shixCIs5ClsLCPikCmCGp4siCPiKpFioscCGidCtpBiMpAC4srssCeizi2pbCusxpeiHsECMC6ptp9Ctibp5p8CcpAsMCTpysbzzCFsipCpWCZpEpxiSpxiACxs4iAi3C5pvidi0pEsssLCii6ipCVCBsLp2smszC8sgCRpKpcihpzsOsNsVpep8i3iBpis6CSi0ihzDCPpXsNp5ijioi6pJpUCkidsgpRzpCmCjsQiui3sECysfpjCMp6ixplsLpmiziEs8C2pNCBCoCmpPCpCppnsaiHs9irsDsvidiJC6sECbsPsPsXs7ptsqpupRiLC5CuiDssiriwpsiwCesYCGpIsXCjCTpKpTizsvsppgissDzyiupiCeC2sSs1ipCLpuiusRpYiJsRpLi8p4sVpHibC4CAswsbpyC7s3CTs7CLivipsLiQCdi5pypfpEseiiCeCKCJzsiLims6iZsOpJiXsxCICIpNC7susbsQpkCLphswp6iAslpUsGC2iKszpPCqs6CeCSCBimiDpcskiqiQClCmsbCYp1C4CKiYpriXCHC7swpusGsOppC5sWzzCMp9iaCOiZCvCupgiDirCdi0pTCgsgslsvCfs0p0C8sMiLCCCQifiOiGsisSCysMiDCFpliOpDifpVpxCwp7iosMpPCUziCTigpqCcp0imp4iGCgirC2CWpIidCsppsjiViSiDCRsnpYiHispPi3CTCop8ifzDi9CRzJiHzJpJsGiJsgs6ptiqsbi5inpqstsJpvippDCbC6iyppifsRiHpzCjpIiSsVsBims0",16920));
}
export const _AIChat = {
    get AI_ROOT() { return AI_ROOT; },
    get WORKSPACE_ROOT() { return WORKSPACE_ROOT; },
    ensureDir, safeSessionId, sessionDir, historyPath,
    loadHistory, saveHistory, listSessions, deleteSession, safeAttachmentName,
};
