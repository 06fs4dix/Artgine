import { CDOM } from '../../../artgine/basic/CDOM.js';
import { CFecth } from '../../../artgine/network/CFecth.js';
import { CAlert } from '../../../artgine/basic/CAlert.js';
import { CModal } from '../../../artgine/basic/CModal.js';
import { marked } from '../../../artgine/external/esnext/md/marked.esm.js';
let gSessions = [];
let gListEl;
let gOnAuthFail = () => false;
function handleErr(e) {
    const msg = String(e?.message ?? e);
    if (/\b401\b/.test(msg)) {
        gOnAuthFail();
        return;
    }
    CAlert.E(msg);
}
export function MountMessengerTab(rootId, onAuthFail) {
    gOnAuthFail = onAuthFail;
    const root = CDOM.ID(rootId);
    if (!root)
        return;
    root.innerHTML = `
<div class="d-flex flex-column h-100" style="min-height:0;">

  <!-- 최상단: 등록 UI(터미널과 무관 — 봇 하나 등록만 한다) -->
  <div class="p-2 border-bottom flex-shrink-0">
    <div class="d-flex align-items-center gap-2">
      <span class="fw-semibold small text-nowrap"><i class="bi bi-chat-dots-fill"></i> Messenger</span>
      <input id="msg-new-bot" type="text" class="form-control form-control-sm"
        placeholder="Paste bot token or peer email to register (Telegram / Discord / Email)" autocomplete="off">
      <button id="msg-new-btn" class="btn btn-sm btn-primary text-nowrap">Register</button>
      <button id="msg-new-email-btn" class="btn btn-sm btn-outline-primary text-nowrap"><i class="bi bi-envelope-plus"></i> Email</button>
      <button id="msg-refresh-btn" class="btn btn-sm btn-outline-secondary flex-shrink-0" title="Refresh"><i class="bi bi-arrow-clockwise"></i></button>
    </div>
    <div id="msg-new-err" class="small text-danger mt-1"></div>
  </div>

  <!-- 아래: 등록된 메신저들(아코디언) -->
  <div id="msg-accordion-list" class="flex-grow-1 overflow-auto p-2 d-flex flex-column gap-2"></div>
</div>`;
    gListEl = CDOM.ID('msg-accordion-list');
    CDOM.ID('msg-refresh-btn').addEventListener('click', () => refresh());
    CDOM.ID('msg-new-btn').addEventListener('click', () => registerBot());
    CDOM.ID('msg-new-email-btn').addEventListener('click', () => showEmailModal());
    CDOM.ID('msg-new-bot').addEventListener('keydown', (e) => {
        if (e.key === 'Enter')
            registerBot();
    });
    refresh();
}
async function registerBot() {
    const input = CDOM.ID('msg-new-bot');
    const errEl = CDOM.ID('msg-new-err');
    const btn = CDOM.ID('msg-new-btn');
    const bot = input.value.trim();
    errEl.textContent = '';
    if (!bot) {
        errEl.textContent = 'Enter a bot token';
        return;
    }
    btn.disabled = true;
    btn.textContent = 'Registering…';
    try {
        const res = await CFecth.Exe(`messenger/create?bot=${encodeURIComponent(bot)}`, {}, 'json');
        if (!res.ok) {
            errEl.textContent = res.msg || 'Failed';
            return;
        }
        input.value = '';
        await refresh();
        setExpanded(res.session, true);
    }
    catch (e) {
        const msg = String(e?.message ?? e);
        if (/\b401\b/.test(msg)) {
            gOnAuthFail();
        }
        else {
            errEl.textContent = msg;
        }
    }
    finally {
        btn.disabled = false;
        btn.textContent = 'Register';
    }
}
const MODAL_DOM_DELAY = 100;
function authFields(prefix, title) {
    return `
        <div class="small fw-semibold mb-1 d-flex align-items-center gap-2">
            <span>${title}</span>
            <span id="${prefix}_status"></span>
        </div>
        <div class="row g-1 mb-1">
            <div class="col-8"><input id="${prefix}_address" type="text" class="form-control form-control-sm" placeholder="Address (e.g. smtp.example.com)"></div>
            <div class="col-4"><input id="${prefix}_port" type="text" class="form-control form-control-sm" placeholder="Port"></div>
            <div class="col-6"><input id="${prefix}_id" type="text" class="form-control form-control-sm" placeholder="ID"></div>
            <div class="col-6"><input id="${prefix}_pw" type="password" class="form-control form-control-sm" placeholder="Password"></div>
        </div>
        <div id="${prefix}_msg" class="small text-danger mb-2"></div>`;
}
function setAuthStatus(prefix, result) {
    const status = CDOM.ID(`${prefix}_status`);
    const msgEl = CDOM.ID(`${prefix}_msg`);
    if (!result) {
        status.innerHTML = '';
        msgEl.textContent = '';
        return;
    }
    status.innerHTML = result.ok
        ? '<i class="bi bi-check-circle-fill text-success"></i>'
        : '<i class="bi bi-x-circle-fill text-danger"></i>';
    msgEl.textContent = result.ok ? '' : (result.msg || 'Verification failed');
}
function fillAuthFields(prefix, auth) {
    CDOM.ID(`${prefix}_address`).value = auth?.address ?? '';
    CDOM.ID(`${prefix}_port`).value = auth?.port ?? '';
    CDOM.ID(`${prefix}_id`).value = auth?.id ?? '';
    const pwInput = CDOM.ID(`${prefix}_pw`);
    pwInput.value = '';
    pwInput.placeholder = auth?.hasPw ? 'Saved — leave blank to keep' : 'Password';
}
function readAuthFields(prefix) {
    return {
        address: CDOM.ID(`${prefix}_address`).value.trim(),
        port: CDOM.ID(`${prefix}_port`).value.trim(),
        id: CDOM.ID(`${prefix}_id`).value.trim(),
        pw: CDOM.ID(`${prefix}_pw`).value,
    };
}
async function showEmailModal() {
    const modal = new CModal();
    modal.SetHeader('Add Email Messenger');
    modal.SetBody(`
        <div class="small text-secondary mb-3">
            Send account (SMTP) and receive account (IMAP) can be different credentials.
        </div>
        ${authFields('msgEmailSmtp', 'Send (SMTP)')}
        ${authFields('msgEmailImap', 'Receive (IMAP)')}
        <div class="d-flex justify-content-end gap-2">
            <div id="msgEmailErr" class="small text-danger flex-grow-1 align-self-center"></div>
            <button id="msgEmailSaveBtn" class="btn btn-sm btn-primary">Verify & Save</button>
        </div>
    `);
    modal.SetTitle(CModal.eTitle.TextClose);
    modal.SetSize(480, 460);
    modal.Open(CModal.ePos.Center);
    setTimeout(async () => {
        try {
            const res = await CFecth.Exe('messenger/email/get', {}, 'json');
            if (res.ok && res.account) {
                fillAuthFields('msgEmailSmtp', res.account.smtp);
                fillAuthFields('msgEmailImap', res.account.imap);
            }
        }
        catch (e) {
            if (!/\b401\b/.test(String(e?.message ?? e)))
                CAlert.E(String(e?.message ?? e));
        }
        const errEl = CDOM.ID('msgEmailErr');
        const saveBtn = CDOM.ID('msgEmailSaveBtn');
        saveBtn.addEventListener('click', async () => {
            errEl.textContent = '';
            setAuthStatus('msgEmailSmtp', null);
            setAuthStatus('msgEmailImap', null);
            const smtp = readAuthFields('msgEmailSmtp');
            const imap = readAuthFields('msgEmailImap');
            saveBtn.disabled = true;
            saveBtn.textContent = 'Verifying…';
            try {
                const res = await CFecth.Exe('messenger/email/set', { smtp, imap }, 'json');
                if (res.smtp)
                    setAuthStatus('msgEmailSmtp', res.smtp);
                if (res.imap)
                    setAuthStatus('msgEmailImap', res.imap);
                if (!res.ok) {
                    errEl.textContent = res.msg || 'Verification failed — nothing saved';
                    return;
                }
                modal.Close();
            }
            catch (e) {
                const msg = String(e?.message ?? e);
                if (/\b401\b/.test(msg)) {
                    gOnAuthFail();
                }
                else {
                    errEl.textContent = msg;
                }
            }
            finally {
                saveBtn.disabled = false;
                saveBtn.textContent = 'Verify & Save';
            }
        });
    }, MODAL_DOM_DELAY);
}
async function refresh() {
    try {
        const res = await CFecth.Exe('messenger/list', {}, 'json');
        if (!res.ok) {
            CAlert.E(res.msg || 'Failed');
            return;
        }
        gSessions = res.sessions ?? [];
        renderAccordion();
    }
    catch (e) {
        handleErr(e);
    }
}
function renderAccordion() {
    if (gSessions.length === 0) {
        gListEl.innerHTML = '<div class="text-secondary small p-2">No messenger sessions registered</div>';
        return;
    }
    if (gListEl.children.length === 1 && gListEl.children[0].dataset.sessionId == null) {
        gListEl.innerHTML = '';
    }
    const seen = new Set();
    for (const s of gSessions) {
        seen.add(s.id);
        let item = gListEl.querySelector(`[data-session-id="${s.id}"]`);
        if (!item) {
            item = createAccordionItem(s);
            gListEl.appendChild(item);
        }
        else {
            updateAccordionHeader(item, s);
        }
    }
    for (const el of Array.from(gListEl.querySelectorAll('[data-session-id]'))) {
        const id = Number(el.dataset.sessionId);
        if (!seen.has(id)) {
            if (el._pollTimer)
                clearInterval(el._pollTimer);
            el.remove();
        }
    }
}
function createAccordionItem(s) {
    const item = document.createElement('div');
    item.className = 'border rounded';
    item.dataset.sessionId = String(s.id);
    const bodyId = `msgBody_${s.id}`;
    item.innerHTML = `
        <div class="d-flex align-items-center gap-2 p-2 bg-body-tertiary rounded" style="cursor:pointer;" data-act="toggle">
            <i class="bi bi-chevron-right msg-chevron flex-shrink-0"></i>
            <div class="flex-grow-1 overflow-hidden" data-role="header"></div>
        </div>
        <div class="collapse" id="${bodyId}">
            <div class="p-2 border-top d-flex flex-column gap-2" data-role="body">
                <div class="text-secondary user-select-all" data-role="info" style="font-size:0.75em;word-break:break-all;"></div>
                <div class="d-flex align-items-center gap-1">
                    <span class="small text-secondary text-nowrap">Terminal:</span>
                    <select class="form-select form-select-sm msg-term-select" style="max-width:220px;"></select>
                    <button class="btn btn-sm btn-outline-primary msg-link-btn">Link</button>
                    <button class="btn btn-sm btn-outline-danger msg-unlink-btn d-none">Unlink</button>
                </div>
                <div class="d-flex align-items-center gap-1">
                    <input type="text" class="form-control form-control-sm msg-send-input" placeholder="Direct message...">
                    <button class="btn btn-sm btn-primary text-nowrap msg-send-btn">Send</button>
                </div>
                <div class="msg-log-wrap" style="font-size:0.85rem;max-height:600px;overflow-y:auto;"></div>
            </div>
        </div>
    `;
    updateAccordionHeader(item, s);
    const toggleHeader = item.querySelector('[data-act="toggle"]');
    const collapseEl = item.querySelector(`#${bodyId}`);
    const chevron = item.querySelector('.msg-chevron');
    const bsCollapse = new window.bootstrap.Collapse(collapseEl, { toggle: false });
    collapseEl.addEventListener('show.bs.collapse', () => {
        chevron.className = 'bi bi-chevron-down msg-chevron';
        onExpand(item);
    });
    collapseEl.addEventListener('hide.bs.collapse', () => {
        chevron.className = 'bi bi-chevron-right msg-chevron';
        if (item._pollTimer) {
            clearInterval(item._pollTimer);
            item._pollTimer = null;
        }
    });
    toggleHeader.addEventListener('click', () => bsCollapse.toggle());
    const linkBtn = item.querySelector('.msg-link-btn');
    const unlinkBtn = item.querySelector('.msg-unlink-btn');
    const termSel = item.querySelector('.msg-term-select');
    const sendInput = item.querySelector('.msg-send-input');
    const sendBtn = item.querySelector('.msg-send-btn');
    linkBtn.addEventListener('click', () => linkTerminal(item, termSel.value));
    unlinkBtn.addEventListener('click', () => unlinkTerminal(item));
    sendBtn.addEventListener('click', () => sendDirect(item, sendInput));
    sendInput.addEventListener('keydown', (e) => { if (e.key === 'Enter')
        sendDirect(item, sendInput); });
    return item;
}
function onExpand(item) {
    const id = Number(item.dataset.sessionId);
    const s = gSessions.find(x => x.id === id);
    if (s)
        populateTermSelect(item, s);
    if (item._pollTimer)
        clearInterval(item._pollTimer);
    fetchAndRenderLog(item, id);
    item._pollTimer = setInterval(() => fetchAndRenderLog(item, id), 3000);
}
function updateAccordionHeader(item, s) {
    const header = item.querySelector('[data-role="header"]');
    const platLabel = s.platform === 'discord' ? 'Discord' : s.platform === 'email' ? 'Email' : 'Telegram';
    const platBadge = s.platform === 'discord' ? 'bg-primary' : s.platform === 'email' ? 'bg-warning text-dark' : 'bg-info text-dark';
    const stateColor = s.state === 'active' ? 'bg-success' : s.state === 'pending' ? 'bg-warning text-dark' : 'bg-danger';
    header.innerHTML = `
        <div class="d-flex align-items-center gap-2">
            <span class="badge ${platBadge} flex-shrink-0">${platLabel}</span>
            <span class="fw-semibold text-truncate">${escHtml(s.botName)}</span>
            <span class="badge ${stateColor} ms-auto flex-shrink-0">${escHtml(s.state)}</span>
        </div>`;
    const chatInfo = s.chatKey ? `linked: ${escHtml(s.chatKey)}` : 'waiting for user';
    const termInfo = s.termKey ? ` &middot; → ${escHtml(s.termKey)}` : '';
    const info = item.querySelector('[data-role="info"]');
    info.innerHTML = `${s.link ? `<a href="${escHtml(s.link)}" target="_blank" rel="noopener">${escHtml(s.link)}</a> &middot; ` : ''}${chatInfo}${termInfo}`;
    const unlinkBtn = item.querySelector('.msg-unlink-btn');
    if (unlinkBtn)
        unlinkBtn.classList.toggle('d-none', !s.termToken);
}
function setExpanded(sessionId, expand) {
    const item = gListEl.querySelector(`[data-session-id="${sessionId}"]`);
    if (!item)
        return;
    const collapseEl = item.querySelector('.collapse');
    if (!collapseEl)
        return;
    new window.bootstrap.Collapse(collapseEl, { toggle: false })[expand ? 'show' : 'hide']();
}
async function populateTermSelect(item, s) {
    const sel = item.querySelector('.msg-term-select');
    sel.innerHTML = '<option value="">— None —</option>';
    try {
        const res = await CFecth.Exe('cmd/sessions', {}, 'json');
        const sessions = res?.sessions ?? [];
        for (const t of sessions) {
            const opt = document.createElement('option');
            opt.value = t.token;
            opt.textContent = t.key || t.token.slice(0, 12) + '…';
            if (t.token === s.termToken)
                opt.selected = true;
            sel.appendChild(opt);
        }
    }
    catch { }
}
async function linkTerminal(item, termToken) {
    if (!termToken) {
        CAlert.E('Select a terminal session first');
        return;
    }
    const id = Number(item.dataset.sessionId);
    try {
        const res = await CFecth.Exe(`messenger/link?termToken=${encodeURIComponent(termToken)}&sessionId=${id}`, {}, 'json');
        if (!res.ok) {
            CAlert.E(res.msg || 'Failed');
            return;
        }
        await refresh();
    }
    catch (e) {
        handleErr(e);
    }
}
async function unlinkTerminal(item) {
    const id = Number(item.dataset.sessionId);
    const s = gSessions.find(x => x.id === id);
    if (!s?.termToken)
        return;
    try {
        const res = await CFecth.Exe(`messenger/unlink?termToken=${encodeURIComponent(s.termToken)}`, {}, 'json');
        if (!res.ok) {
            CAlert.E(res.msg || 'Failed');
            return;
        }
        await refresh();
    }
    catch (e) {
        handleErr(e);
    }
}
async function sendDirect(item, input) {
    const id = Number(item.dataset.sessionId);
    const message = input.value.trim();
    if (!message)
        return;
    const btn = item.querySelector('.msg-send-btn');
    btn.disabled = true;
    try {
        const res = await CFecth.Exe('messenger/send', {
            sessionId: String(id), from: 'control', message,
        }, 'json');
        if (!res.ok) {
            CAlert.E(res.msg || 'Failed');
            return;
        }
        input.value = '';
        await fetchAndRenderLog(item, id);
    }
    catch (e) {
        handleErr(e);
    }
    finally {
        btn.disabled = false;
    }
}
async function fetchAndRenderLog(item, sessionId) {
    try {
        const res = await CFecth.Exe(`messenger/log?sessionId=${sessionId}&limit=100`, {}, 'json');
        if (!res.ok)
            return;
        renderLog(item, res.log ?? []);
    }
    catch { }
}
function renderLog(item, log) {
    const wrap = item.querySelector('.msg-log-wrap');
    if (!wrap)
        return;
    const atBottom = wrap.scrollHeight - wrap.scrollTop - wrap.clientHeight < 40;
    wrap.innerHTML = log.map(e => {
        const isIn = e.dir === 'in';
        const time = new Date(e.date * 1000).toLocaleTimeString();
        const align = isIn ? 'justify-content-start' : 'justify-content-end';
        const bubble = isIn ? 'bg-body-secondary' : 'bg-primary text-white';
        const meta = isIn ? 'text-secondary' : 'text-white-50';
        const html = renderMd(e.text);
        return `<div class="d-flex ${align} mb-2">
  <div class="rounded p-2 ${bubble}" style="max-width:80%;min-width:0;">
    <div class="small ${meta} mb-1">${escHtml(e.who)} &middot; ${time}</div>
    <div class="log-body-text">${html}</div>
  </div>
</div>`;
    }).join('');
    if (atBottom)
        wrap.scrollTop = wrap.scrollHeight;
}
function renderMd(raw) {
    return marked.parse(escHtml(raw), { xhtml: false });
}
function escHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
