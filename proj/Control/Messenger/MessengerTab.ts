import { CDOM } from '../../../artgine/basic/CDOM.js';
import { CFecth } from '../../../artgine/network/CFecth.js';
import { CAlert } from '../../../artgine/basic/CAlert.js';
import { CModal } from '../../../artgine/basic/CModal.js';
import { marked } from '../../../artgine/external/esnext/md/marked.esm.js';

// ── 타입 ────────────────────────────────────────────────────────────────────
type MsgSession = {
    id: number;
    platform: string;
    botName: string;
    chatKey: string;
    state: string;
    link: string;
    termToken: string | null;
    termKey: string | null;
};

type LogEntry = {
    dir: string;   // 'in' | 'out'
    who: string;
    date: number;
    text: string;
};

// 아코디언 항목마다 붙는 부가 상태(펼침 여부와 무관하게 DOM 요소에 매달아 둔다 — 로그 탭과 동일 패턴).
type MsgItemEl = HTMLDivElement & { _pollTimer?: ReturnType<typeof setInterval> | null };

// ── 상태 ────────────────────────────────────────────────────────────────────
let gSessions: MsgSession[] = [];
let gListEl: HTMLDivElement;
// Control 페이지의 공용 인증 처리 함수(ctrlRequireAuthed) — 토큰이 없으면 로그인 모달을 띄우고
// 경고 토스트를 보여준다. 이 탭은 Control.ts가 이미 임포트하고 있어 역참조(순환 import)를 피하려고
// MountMessengerTab 호출 시 콜백으로 주입받는다.
let gOnAuthFail: () => boolean = () => false;

// API 호출 실패를 한곳에서 처리한다. CFecth.Exe는 HTTP 상태가 not-ok면 'HTTP error! status: 401'
// 형태의 Error로 reject하므로(응답 JSON을 보지 못한다), 메시지에서 401을 찾아 인증 실패만 공용
// 함수로 분기하고 나머지는 일반 에러 토스트로 보여준다.
function handleErr(e: any): void {
    const msg = String(e?.message ?? e);
    if (/\b401\b/.test(msg)) { gOnAuthFail(); return; }
    CAlert.E(msg);
}

// ── UI 마운트 ────────────────────────────────────────────────────────────────
export function MountMessengerTab(rootId: string, onAuthFail: () => boolean) {
    gOnAuthFail = onAuthFail;
    const root = CDOM.ID(rootId);
    if (!root) return;

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

    gListEl = CDOM.ID('msg-accordion-list') as HTMLDivElement;

    CDOM.ID('msg-refresh-btn').addEventListener('click', () => refresh());
    CDOM.ID('msg-new-btn').addEventListener('click', () => registerBot());
    CDOM.ID('msg-new-email-btn').addEventListener('click', () => showEmailModal());
    (CDOM.ID('msg-new-bot') as HTMLInputElement).addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Enter') registerBot();
    });

    refresh();
}

// ── 신규 등록(터미널 무관) ───────────────────────────────────────────────────
// /messenger/create는 CMessenger.Create만 호출한다 — 등록해두면 SQLite에 영구 저장되므로,
// 이후 아무 터미널에나(재시작 후에도) 이 목록에서 Link만 누르면 된다. 봇 토큰을 다시 넣거나
// 유저가 다시 접속할 필요가 없다.
async function registerBot() {
    const input = CDOM.ID('msg-new-bot') as HTMLInputElement;
    const errEl = CDOM.ID('msg-new-err');
    const btn   = CDOM.ID('msg-new-btn') as HTMLButtonElement;
    const bot   = input.value.trim();
    errEl.textContent = '';
    if (!bot) { errEl.textContent = 'Enter a bot token'; return; }

    btn.disabled = true;
    btn.textContent = 'Registering…';
    try {
        const res: any = await CFecth.Exe(`messenger/create?bot=${encodeURIComponent(bot)}`, {}, 'json');
        if (!res.ok) { errEl.textContent = res.msg || 'Failed'; return; }
        input.value = '';
        await refresh();
        setExpanded(res.session, true);
    } catch (e: any) {
        const msg = String(e?.message ?? e);
        if (/\b401\b/.test(msg)) { gOnAuthFail(); } else { errEl.textContent = msg; }
    } finally {
        btn.disabled = false;
        btn.textContent = 'Register';
    }
}

// ── 이메일 계정 등록(발신 SMTP / 수신 IMAP) ─────────────────────────────────────
// SetBody가 innerHTML을 통째로 넣은 직후에는 DOM이 아직 붙지 않은 프레임이 있어(Control.ts의
// showAddOllamaModal과 동일한 이유), 살짝 지연을 두고서야 입력 요소를 안전하게 잡을 수 있다.
const MODAL_DOM_DELAY = 100;

function authFields(prefix: string, title: string): string {
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

function setAuthStatus(prefix: string, result: { ok: boolean; msg?: string } | null) {
    const status = CDOM.ID(`${prefix}_status`);
    const msgEl  = CDOM.ID(`${prefix}_msg`);
    if (!result) { status.innerHTML = ''; msgEl.textContent = ''; return; }
    status.innerHTML = result.ok
        ? '<i class="bi bi-check-circle-fill text-success"></i>'
        : '<i class="bi bi-x-circle-fill text-danger"></i>';
    msgEl.textContent = result.ok ? '' : (result.msg || 'Verification failed');
}

// 서버는 비밀번호를 절대 돌려주지 않는다(hasPw로 저장 여부만 알려줌) — 비밀번호 칸은 항상 비워두고
// placeholder로만 "저장돼 있음"을 표시한다. 그대로 제출(빈 값)하면 서버가 기존 비밀번호를 유지한다.
function fillAuthFields(prefix: string, auth: { address: string; port: string; id: string; hasPw?: boolean }) {
    (CDOM.ID(`${prefix}_address`) as HTMLInputElement).value = auth?.address ?? '';
    (CDOM.ID(`${prefix}_port`)    as HTMLInputElement).value = auth?.port    ?? '';
    (CDOM.ID(`${prefix}_id`)      as HTMLInputElement).value = auth?.id      ?? '';
    const pwInput = CDOM.ID(`${prefix}_pw`) as HTMLInputElement;
    pwInput.value = '';
    pwInput.placeholder = auth?.hasPw ? 'Saved — leave blank to keep' : 'Password';
}

function readAuthFields(prefix: string) {
    return {
        address: (CDOM.ID(`${prefix}_address`) as HTMLInputElement).value.trim(),
        port:    (CDOM.ID(`${prefix}_port`)    as HTMLInputElement).value.trim(),
        id:      (CDOM.ID(`${prefix}_id`)      as HTMLInputElement).value.trim(),
        pw:      (CDOM.ID(`${prefix}_pw`)      as HTMLInputElement).value,
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
            const res: any = await CFecth.Exe('messenger/email/get', {}, 'json');
            if (res.ok && res.account) {
                fillAuthFields('msgEmailSmtp', res.account.smtp);
                fillAuthFields('msgEmailImap', res.account.imap);
            }
        } catch (e: any) {
            if (!/\b401\b/.test(String(e?.message ?? e))) CAlert.E(String(e?.message ?? e));
        }

        const errEl = CDOM.ID('msgEmailErr');
        const saveBtn = CDOM.ID('msgEmailSaveBtn') as HTMLButtonElement;
        saveBtn.addEventListener('click', async () => {
            errEl.textContent = '';
            setAuthStatus('msgEmailSmtp', null);
            setAuthStatus('msgEmailImap', null);
            const smtp = readAuthFields('msgEmailSmtp');
            const imap = readAuthFields('msgEmailImap');
            saveBtn.disabled = true;
            saveBtn.textContent = 'Verifying…';
            try {
                const res: any = await CFecth.Exe('messenger/email/set', { smtp, imap }, 'json');
                if (res.smtp) setAuthStatus('msgEmailSmtp', res.smtp);
                if (res.imap) setAuthStatus('msgEmailImap', res.imap);
                if (!res.ok) { errEl.textContent = res.msg || 'Verification failed — nothing saved'; return; }
                modal.Close();
            } catch (e: any) {
                const msg = String(e?.message ?? e);
                if (/\b401\b/.test(msg)) { gOnAuthFail(); } else { errEl.textContent = msg; }
            } finally {
                saveBtn.disabled = false;
                saveBtn.textContent = 'Verify & Save';
            }
        });
    }, MODAL_DOM_DELAY);
}

// ── 새로고침: 목록 diff 갱신 ─────────────────────────────────────────────────
// 아코디언 전체를 지우고 새로 그리면 펼쳐둔 항목이 접히고 로그 폴링도 끊긴다. 그래서 기존 DOM은
// 살려둔 채 헤더 내용만 갱신하고, 새 세션만 추가/사라진 세션만 제거한다.
async function refresh() {
    try {
        const res: any = await CFecth.Exe('messenger/list', {}, 'json');
        if (!res.ok) { CAlert.E(res.msg || 'Failed'); return; }
        gSessions = res.sessions ?? [];
        renderAccordion();
    } catch (e: any) {
        handleErr(e);
    }
}

function renderAccordion() {
    if (gSessions.length === 0) {
        gListEl.innerHTML = '<div class="text-secondary small p-2">No messenger sessions registered</div>';
        return;
    }
    // placeholder 텍스트가 남아있으면 지운다.
    if (gListEl.children.length === 1 && (gListEl.children[0] as HTMLElement).dataset.sessionId == null) {
        gListEl.innerHTML = '';
    }

    const seen = new Set<number>();
    for (const s of gSessions) {
        seen.add(s.id);
        let item = gListEl.querySelector<MsgItemEl>(`[data-session-id="${s.id}"]`);
        if (!item) {
            item = createAccordionItem(s);
            gListEl.appendChild(item);
        } else {
            updateAccordionHeader(item, s);
        }
    }
    // 더 이상 없는 세션의 항목 제거(폴링도 함께 정리).
    for (const el of Array.from(gListEl.querySelectorAll<MsgItemEl>('[data-session-id]'))) {
        const id = Number(el.dataset.sessionId);
        if (!seen.has(id)) {
            if (el._pollTimer) clearInterval(el._pollTimer);
            el.remove();
        }
    }
}

// ── 아코디언 항목 생성 ───────────────────────────────────────────────────────
function createAccordionItem(s: MsgSession): MsgItemEl {
    const item = document.createElement('div') as MsgItemEl;
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

    const toggleHeader = item.querySelector<HTMLElement>('[data-act="toggle"]')!;
    const collapseEl   = item.querySelector<HTMLElement>(`#${bodyId}`)!;
    const chevron      = item.querySelector<HTMLElement>('.msg-chevron')!;
    const bsCollapse = new (window as any).bootstrap.Collapse(collapseEl, { toggle: false });
    collapseEl.addEventListener('show.bs.collapse', () => {
        chevron.className = 'bi bi-chevron-down msg-chevron';
        onExpand(item);
    });
    collapseEl.addEventListener('hide.bs.collapse', () => {
        chevron.className = 'bi bi-chevron-right msg-chevron';
        if (item._pollTimer) { clearInterval(item._pollTimer); item._pollTimer = null; }
    });
    toggleHeader.addEventListener('click', () => bsCollapse.toggle());

    const linkBtn   = item.querySelector<HTMLButtonElement>('.msg-link-btn')!;
    const unlinkBtn = item.querySelector<HTMLButtonElement>('.msg-unlink-btn')!;
    const termSel   = item.querySelector<HTMLSelectElement>('.msg-term-select')!;
    const sendInput = item.querySelector<HTMLInputElement>('.msg-send-input')!;
    const sendBtn   = item.querySelector<HTMLButtonElement>('.msg-send-btn')!;

    linkBtn.addEventListener('click', () => linkTerminal(item, termSel.value));
    unlinkBtn.addEventListener('click', () => unlinkTerminal(item));
    sendBtn.addEventListener('click', () => sendDirect(item, sendInput));
    sendInput.addEventListener('keydown', (e: KeyboardEvent) => { if (e.key === 'Enter') sendDirect(item, sendInput); });

    return item;
}

// 펼칠 때마다: 터미널 목록 최신화 + 로그 로드/폴링 시작(로그 탭과 달리 매번 새로 채운다 — 그 사이
// 새 터미널이 열렸을 수 있고, 세션당 항목 수가 적어 비용도 작다).
function onExpand(item: MsgItemEl) {
    const id = Number(item.dataset.sessionId);
    const s = gSessions.find(x => x.id === id);
    if (s) populateTermSelect(item, s);

    if (item._pollTimer) clearInterval(item._pollTimer);
    fetchAndRenderLog(item, id);
    item._pollTimer = setInterval(() => fetchAndRenderLog(item, id), 3000);
}

// ── 헤더 렌더링 ──────────────────────────────────────────────────────────────
// 헤더 행은 클릭하면 펼침/접힘이 토글되는 영역이라, 그 안에 링크 텍스트를 두면 선택(드래그/복사)이
// 안 된다. 그래서 헤더에는 플랫폼/이름/상태만 요약해서 보여주고, 링크·연결정보는 본문(펼침 영역)의
// info 줄로 내린다 — 거기서는 자유롭게 클릭/선택/복사할 수 있다.
function updateAccordionHeader(item: MsgItemEl, s: MsgSession) {
    const header = item.querySelector<HTMLElement>('[data-role="header"]')!;
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
    const info = item.querySelector<HTMLElement>('[data-role="info"]')!;
    info.innerHTML = `${s.link ? `<a href="${escHtml(s.link)}" target="_blank" rel="noopener">${escHtml(s.link)}</a> &middot; ` : ''}${chatInfo}${termInfo}`;

    // 펼쳐진 상태에서도 Unlink 버튼 노출 여부는 최신 데이터로 맞춘다.
    const unlinkBtn = item.querySelector<HTMLButtonElement>('.msg-unlink-btn');
    if (unlinkBtn) unlinkBtn.classList.toggle('d-none', !s.termToken);
}

function setExpanded(sessionId: number, expand: boolean) {
    const item = gListEl.querySelector<MsgItemEl>(`[data-session-id="${sessionId}"]`);
    if (!item) return;
    const collapseEl = item.querySelector<HTMLElement>('.collapse');
    if (!collapseEl) return;
    new (window as any).bootstrap.Collapse(collapseEl, { toggle: false })[expand ? 'show' : 'hide']();
}

// ── 터미널 선택 박스 ─────────────────────────────────────────────────────────
async function populateTermSelect(item: MsgItemEl, s: MsgSession) {
    const sel = item.querySelector<HTMLSelectElement>('.msg-term-select')!;
    sel.innerHTML = '<option value="">— None —</option>';
    try {
        const res: any = await CFecth.Exe('cmd/sessions', {}, 'json');
        const sessions: { token: string; key?: string }[] = res?.sessions ?? [];
        for (const t of sessions) {
            const opt = document.createElement('option');
            opt.value = t.token;
            opt.textContent = t.key || t.token.slice(0, 12) + '…';
            if (t.token === s.termToken) opt.selected = true;
            sel.appendChild(opt);
        }
    } catch { /* 목록 실패는 무시 */ }
}

// ── 터미널 연결/해제 ─────────────────────────────────────────────────────────
async function linkTerminal(item: MsgItemEl, termToken: string) {
    if (!termToken) { CAlert.E('Select a terminal session first'); return; }
    const id = Number(item.dataset.sessionId);
    try {
        const res: any = await CFecth.Exe(
            `messenger/link?termToken=${encodeURIComponent(termToken)}&sessionId=${id}`, {}, 'json');
        if (!res.ok) { CAlert.E(res.msg || 'Failed'); return; }
        await refresh();
    } catch (e: any) {
        handleErr(e);
    }
}

async function unlinkTerminal(item: MsgItemEl) {
    const id = Number(item.dataset.sessionId);
    const s = gSessions.find(x => x.id === id);
    if (!s?.termToken) return;
    try {
        const res: any = await CFecth.Exe(
            `messenger/unlink?termToken=${encodeURIComponent(s.termToken)}`, {}, 'json');
        if (!res.ok) { CAlert.E(res.msg || 'Failed'); return; }
        await refresh();
    } catch (e: any) {
        handleErr(e);
    }
}

// ── 직접 발송 ────────────────────────────────────────────────────────────────
async function sendDirect(item: MsgItemEl, input: HTMLInputElement) {
    const id = Number(item.dataset.sessionId);
    const message = input.value.trim();
    if (!message) return;
    const btn = item.querySelector<HTMLButtonElement>('.msg-send-btn')!;
    btn.disabled = true;
    try {
        const res: any = await CFecth.Exe('messenger/send', {
            sessionId: String(id), from: 'control', message,
        }, 'json');
        if (!res.ok) { CAlert.E(res.msg || 'Failed'); return; }
        input.value = '';
        await fetchAndRenderLog(item, id);
    } catch (e: any) {
        handleErr(e);
    } finally {
        btn.disabled = false;
    }
}

// ── 로그 로드/렌더링 ─────────────────────────────────────────────────────────
async function fetchAndRenderLog(item: MsgItemEl, sessionId: number) {
    try {
        const res: any = await CFecth.Exe(`messenger/log?sessionId=${sessionId}&limit=100`, {}, 'json');
        if (!res.ok) return;
        renderLog(item, res.log ?? []);
    } catch { /* 무시 */ }
}

// in(유저→봇)은 왼쪽, out(서버→유저)은 오른쪽 — 일반적인 메신저 대화창과 같은 배치.
// 본문은 마크다운 원문이라 그대로 이스케이프한 뒤 marked로 파싱한다(Control.ts logRenderMarkdown과
// 동일 패턴 — raw HTML이 섞여 있어도 먼저 escape하므로 실행되지 않는다).
function renderLog(item: MsgItemEl, log: LogEntry[]) {
    const wrap = item.querySelector<HTMLElement>('.msg-log-wrap');
    if (!wrap) return;
    const atBottom = wrap.scrollHeight - wrap.scrollTop - wrap.clientHeight < 40;

    wrap.innerHTML = log.map(e => {
        const isIn = e.dir === 'in';
        const time = new Date(e.date * 1000).toLocaleTimeString();
        const align  = isIn ? 'justify-content-start' : 'justify-content-end';
        const bubble = isIn ? 'bg-body-secondary' : 'bg-primary text-white';
        const meta   = isIn ? 'text-secondary' : 'text-white-50';
        const html   = renderMd(e.text);
        return `<div class="d-flex ${align} mb-2">
  <div class="rounded p-2 ${bubble}" style="max-width:80%;min-width:0;">
    <div class="small ${meta} mb-1">${escHtml(e.who)} &middot; ${time}</div>
    <div class="log-body-text">${html}</div>
  </div>
</div>`;
    }).join('');

    if (atBottom) wrap.scrollTop = wrap.scrollHeight;
}

function renderMd(raw: string): string {
    return marked.parse(escHtml(raw), { xhtml: false }) as string;
}

// ── 유틸 ────────────────────────────────────────────────────────────────────
function escHtml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
