import { CDOM } from "../../../artgine/basic/CDOM.js";
import { CPath } from "../../../artgine/basic/CPath.js";
import { CModal, CConfirm } from "../../../artgine/basic/CModal.js";
import { CAlert } from "../../../artgine/basic/CAlert.js";
import { CLan } from "../../../artgine/basic/CLan.js";

// 번역 키는 Control.ts registerControlLan() 한곳에 등록. 여기서는 CLan.Get만 사용.
function L(key: string, en: string): string {
    return CLan.Get(key, en);
}
function LF(key: string, en: string, ...args: Array<string | number>): string {
    let s = CLan.Get(key, en);
    for (let i = 0; i < args.length; i++) s = s.split(`{${i}}`).join(String(args[i]));
    return s;
}
function aiEscapeHtml(s: string): string {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
}
// 같은 출처(same-origin) 요청이라 세션 쿠키가 자동 전송된다 → 토큰 별도 첨부 불필요(Control.ts와 동일 정의).
function authedFetch(url: string, init?: RequestInit): Promise<Response> {
    return fetch(url, init);
}
// SetBody가 innerHTML을 통째로 넣은 직후에는 DOM이 아직 붙지 않은 프레임이 있어, 살짝 지연을 두고서야
// 입력 요소를 안전하게 잡을 수 있다(Control.ts의 다른 모달들과 동일 이유·동일 값).
const MODAL_DOM_DELAY = 100;

// ---- Schedule management (Home.ts의 스케줄러를 이식. 옵션 패널의 Schedule 제목 옆
// New 버튼(#sched-new-btn) → schedOpenModal()로 생성/편집한다) ----
// 이 파일은 Control.html의 옵션 패널에 이미 존재하는 #schedSessionList / #sched-new-btn DOM에
// 붙기만 한다(Download/Messenger 탭과 달리 패널 자체를 새로 만들지 않음). import되는 즉시 초기화된다.
const schedSessionList = CDOM.ID("schedSessionList");

type SchedulerOption = { delay?: number; count?: number; start?: number; end?: number; days?: number[]; hour?: number; minute?: number; autoEnd?: boolean };
type ScheduleData = { name: string; subAgentKey: string; mode: string; option: SchedulerOption; command: string };

function schedIntervalStr(s: ScheduleData): string {
    if (s.mode === 'time') {
        const hh = String(s.option.hour ?? 0).padStart(2, '0');
        const mm = String(s.option.minute ?? 0).padStart(2, '0');
        return `${hh}:${mm}`;
    }
    const parts: string[] = [`${s.option.delay ?? 0}s`];
    if ((s.option.count ?? 0) > 0) parts.push(`×${s.option.count}`);
    if ((s.option.start ?? 0) > 0) parts.push(`+${s.option.start}s`);
    if ((s.option.end ?? 0) > 0)   parts.push(`~${s.option.end}s`);
    return parts.join(' ');
}

async function schedRefresh() {
    try {
        const r = await authedFetch(CPath.WebRootUrl() + 'cmd/schedules');
        const j = await r.json();
        if (!j.ok) return;
        schedSessionList.innerHTML = '';
        const schedules = j.schedules as ScheduleData[];
        if (schedules.length === 0) return;
        for (const s of schedules) {
            const item = document.createElement('div');
            item.className = 'ai-session-item d-flex align-items-center gap-2 px-2 py-1 rounded';
            item.style.cursor = 'pointer';
            item.innerHTML = `
                <span class="d-flex flex-column align-items-center flex-shrink-0" style="min-width:2rem;">
                    <span class="badge rounded-pill ${s.mode==='time'?'bg-primary':'bg-info'}" style="font-size:0.65rem;">${s.mode}</span>
                    <span class="text-secondary" style="font-size:0.68rem;white-space:nowrap;">${schedIntervalStr(s)}</span>
                </span>
                <span class="flex-grow-1 min-w-0 d-flex flex-column" style="min-width:0;">
                    <span class="text-truncate fw-semibold" style="font-size:0.75rem;">${aiEscapeHtml(s.name)}</span>
                    <span class="text-truncate text-secondary" style="font-size:0.7rem;">${aiEscapeHtml(s.subAgentKey)}</span>
                    <span class="text-truncate small text-body-secondary">${aiEscapeHtml(s.command)}</span>
                </span>
                <button class="sched-del-btn btn btn-sm btn-link text-danger p-0" title="${L('ctrl.delete', 'Delete')}"><i class="bi bi-trash"></i></button>
            `;
            item.addEventListener('click', () => schedOpenModal(s));
            item.querySelector('.sched-del-btn')!.addEventListener('click', (e: Event) => {
                e.stopPropagation();
                const dlg = new CConfirm();
                dlg.SetBody(LF('ctrl.msg.deleteSchedule', 'Delete schedule "{0}"?', aiEscapeHtml(s.name)));
                dlg.SetConfirm(CConfirm.eConfirm.YesNo, [
                    async () => {
                        await authedFetch(`${CPath.WebRootUrl()}cmd/schedule-del?name=${encodeURIComponent(s.name)}`);
                        schedRefresh();
                    },
                    () => {},
                ], [L('ctrl.delete', 'Delete'), L('ctrl.cancel', 'Cancel')]);
                dlg.Open();
            });
            item.addEventListener('mouseenter', () => item.classList.add('bg-body-secondary'));
            item.addEventListener('mouseleave', () => item.classList.remove('bg-body-secondary'));
            schedSessionList.appendChild(item);
        }
    } catch (e) { console.error('schedRefresh error:', e); }
}

async function schedOpenModal(existing?: ScheduleData) {
    const isEdit = !!existing;
    // 여기서는 Sub Agent 셀렉트박스 채우기용으로 key만 필요하다(Provider/Model 등은 Agent 탭 소관).
    let agents: { key: string }[] = [];
    try {
        const r = await authedFetch(CPath.WebRootUrl() + 'cmd/agents');
        const j = await r.json();
        if (j.ok) agents = j.agents as { key: string }[];
    } catch (e) { console.error('schedOpenModal agents fetch error:', e); }

    const container = document.createElement('div');
    container.innerHTML = `
        <div class="mb-2">
            <label class="form-label small text-secondary mb-1">${L('ctrl.lbl.schedName', 'Name (schedule key)')}</label>
            <input id="sched-name" type="text" class="form-control form-control-sm" placeholder="e.g. daily-backup" autocomplete="off" value="${aiEscapeHtml(existing?.name || '')}">
        </div>
        <div class="mb-2">
            <label class="form-label small text-secondary mb-1">${L('ctrl.lbl.subAgent', 'Sub Agent')}</label>
            <select id="sched-agent" class="form-select form-select-sm">
                ${agents.map(a => `<option value="${aiEscapeHtml(a.key)}" ${existing?.subAgentKey === a.key ? 'selected' : ''}>${aiEscapeHtml(a.key)}</option>`).join('') || `<option value="">${L('ctrl.msg.noSubAgents', '(No sub agents registered)')}</option>`}
            </select>
        </div>
        <div class="mb-2">
            <div class="d-flex gap-1 mb-2">
                <button id="sched-tab-interval" type="button" class="btn btn-sm flex-fill ${existing?.mode!=='time' ? 'btn-primary' : 'btn-outline-secondary'}">${L('ctrl.lbl.interval', 'Interval')}</button>
                <button id="sched-tab-time"     type="button" class="btn btn-sm flex-fill ${existing?.mode==='time'  ? 'btn-primary' : 'btn-outline-secondary'}">${L('ctrl.lbl.time', 'Time')}</button>
            </div>
            <div id="sched-panel-interval" style="display:${existing?.mode!=='time' ? '' : 'none'}">
                <div class="d-flex gap-2 mb-2">
                    <div class="flex-fill">
                        <label class="form-label small text-secondary mb-1">${L('ctrl.lbl.delaySec', 'Delay (sec)')}</label>
                        <input id="sched-delay" type="number" min="1" class="form-control form-control-sm" placeholder="e.g. 60" value="${existing?.option.delay ?? 60}">
                    </div>
                    <div class="flex-fill">
                        <label class="form-label small text-secondary mb-1">${L('ctrl.lbl.countInf', 'Count (0=infinite)')}</label>
                        <input id="sched-count" type="number" min="0" class="form-control form-control-sm" placeholder="0" value="${existing?.option.count ?? 0}">
                    </div>
                </div>
                <div class="d-flex gap-2">
                    <div class="flex-fill">
                        <label class="form-label small text-secondary mb-1">${L('ctrl.lbl.startOffset', 'Start offset (sec, 0=now)')}</label>
                        <input id="sched-start" type="number" min="0" class="form-control form-control-sm" placeholder="0" value="${existing?.option.start ?? 0}">
                    </div>
                    <div class="flex-fill">
                        <label class="form-label small text-secondary mb-1">${L('ctrl.lbl.endOffset', 'End offset (sec, 0=never)')}</label>
                        <input id="sched-end" type="number" min="0" class="form-control form-control-sm" placeholder="0" value="${existing?.option.end ?? 0}">
                    </div>
                </div>
                <div class="form-check mt-2">
                    <input id="sched-autoend-interval" type="checkbox" class="form-check-input" ${(existing?.option.autoEnd ?? true) ? 'checked' : ''}>
                    <label for="sched-autoend-interval" class="form-check-label small text-secondary">${L('ctrl.lbl.autoEndInterval', 'Auto-delete when count is exhausted')}</label>
                </div>
            </div>
            <div id="sched-panel-time" style="display:${existing?.mode==='time' ? '' : 'none'}">
                <div class="mb-2">
                    <label class="form-label small text-secondary mb-1">${L('ctrl.lbl.daysOfWeek', 'Days of Week')}</label>
                    <div class="d-flex gap-1 flex-wrap">
                        ${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((lbl,i) => `<button type="button" class="sched-day-btn btn btn-sm ${(existing?.option.days ?? []).includes(i) ? 'btn-primary' : 'btn-outline-secondary'}" data-day="${i}">${lbl}</button>`).join('')}
                    </div>
                </div>
                <div class="d-flex gap-2 align-items-end">
                    <div class="flex-fill">
                        <label class="form-label small text-secondary mb-1">${L('ctrl.lbl.hour', 'Hour (0–23)')}</label>
                        <select id="sched-hour" class="form-select form-select-sm">
                            ${Array.from({length:24},(_,h)=>`<option value="${h}" ${(existing?.option.hour??9)===h?'selected':''}>${String(h).padStart(2,'0')}</option>`).join('')}
                        </select>
                    </div>
                    <div class="flex-fill">
                        <label class="form-label small text-secondary mb-1">${L('ctrl.lbl.minute', 'Minute')}</label>
                        <select id="sched-minute" class="form-select form-select-sm">
                            ${Array.from({length:12},(_,i)=>i*5).map(m=>`<option value="${m}" ${(existing?.option.minute??0)===m?'selected':''}>${String(m).padStart(2,'0')}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div class="form-check mt-2">
                    <input id="sched-autoend-time" type="checkbox" class="form-check-input" ${(existing?.option.autoEnd ?? false) ? 'checked' : ''}>
                    <label for="sched-autoend-time" class="form-check-label small text-secondary">${L('ctrl.lbl.autoEndTime', 'Run once then delete')}</label>
                </div>
            </div>
        </div>
        <div class="mb-2">
            <label class="form-label small text-secondary mb-1">${L('ctrl.lbl.command', 'Command')}</label>
            <textarea id="sched-cmd" class="form-control form-control-sm" rows="3" placeholder="e.g. node backup.js">${aiEscapeHtml(existing?.command || '')}</textarea>
        </div>
        <div class="d-flex justify-content-between">
            <button id="sched-modal-save" class="btn btn-primary">${isEdit ? L('ctrl.save', 'Save') : L('ctrl.create', 'Create')}</button>
            <button id="sched-modal-cancel" class="btn btn-danger ms-2">${L('ctrl.cancel', 'Cancel')}</button>
        </div>`;

    const modal = new CModal();
    modal.SetTitle(CModal.eTitle.TextClose);
    modal.SetHeader(isEdit ? L('ctrl.hdr.editSchedule', 'Edit Schedule') : L('ctrl.hdr.newSchedule', 'New Schedule'));
    modal.SetBody(container);
    modal.SetZIndex(CModal.eSort.Top);
    modal.Open(CModal.ePos.Center);

    setTimeout(() => {
        // 탭 전환
        let isTimeMode = existing?.mode === 'time';
        const tabInterval = container.querySelector<HTMLButtonElement>('#sched-tab-interval')!;
        const tabTime     = container.querySelector<HTMLButtonElement>('#sched-tab-time')!;
        const panelInterval = container.querySelector<HTMLElement>('#sched-panel-interval')!;
        const panelTime     = container.querySelector<HTMLElement>('#sched-panel-time')!;
        const switchTab = (toTime: boolean) => {
            isTimeMode = toTime;
            tabInterval.className = `btn btn-sm flex-fill ${!toTime ? 'btn-primary' : 'btn-outline-secondary'}`;
            tabTime.className     = `btn btn-sm flex-fill ${ toTime ? 'btn-primary' : 'btn-outline-secondary'}`;
            panelInterval.style.display = toTime ? 'none' : '';
            panelTime.style.display     = toTime ? '' : 'none';
        };
        tabInterval.addEventListener('click', () => switchTab(false));
        tabTime.addEventListener('click', () => switchTab(true));

        // 요일 토글
        const dayBtns = container.querySelectorAll<HTMLButtonElement>('.sched-day-btn');
        dayBtns.forEach(b => b.addEventListener('click', () => {
            const active = b.classList.contains('btn-primary');
            b.classList.toggle('btn-primary', !active);
            b.classList.toggle('btn-outline-secondary', active);
        }));

        const doSave = async () => {
            const name        = (container.querySelector<HTMLInputElement>('#sched-name')!).value.trim();
            const subAgentKey = (container.querySelector<HTMLSelectElement>('#sched-agent')!).value.trim();
            const command     = (container.querySelector<HTMLTextAreaElement>('#sched-cmd')!).value.trim();
            if (!name || !subAgentKey || !command) { CAlert.E(L('ctrl.msg.nameAgentCmdRequired', 'Name, sub agent, and command are required')); return; }

            const option: SchedulerOption = {};
            if (isTimeMode) {
                const selectedDays = Array.from(dayBtns).filter(b => b.classList.contains('btn-primary')).map(b => Number(b.dataset.day));
                if (selectedDays.length === 0) { CAlert.E(L('ctrl.msg.selectOneDay', 'Select at least one day')); return; }
                option.days = selectedDays;
                option.hour = parseInt((container.querySelector<HTMLSelectElement>('#sched-hour')!).value) || 0;
                option.minute = parseInt((container.querySelector<HTMLSelectElement>('#sched-minute')!).value) || 0;
                option.autoEnd = (container.querySelector<HTMLInputElement>('#sched-autoend-time')!).checked;
            } else {
                const delay = Math.max(0, parseInt((container.querySelector<HTMLInputElement>('#sched-delay')!).value) || 0);
                if (delay === 0) { CAlert.E(L('ctrl.msg.delayMin1', 'Delay must be at least 1 second')); return; }
                option.delay = delay;
                option.count = Math.max(0, parseInt((container.querySelector<HTMLInputElement>('#sched-count')!).value) || 0);
                option.start = Math.max(0, parseInt((container.querySelector<HTMLInputElement>('#sched-start')!).value) || 0);
                option.end   = Math.max(0, parseInt((container.querySelector<HTMLInputElement>('#sched-end')!).value) || 0);
                option.autoEnd = (container.querySelector<HTMLInputElement>('#sched-autoend-interval')!).checked;
            }

            const params = new URLSearchParams({ name, subAgentKey, mode: isTimeMode ? 'time' : 'interval', command, option: JSON.stringify(option) });
            const r = await authedFetch(`${CPath.WebRootUrl()}cmd/schedule-set?${params.toString()}`);
            const j = await r.json();
            if (!j.ok) { CAlert.E(j.msg || 'Failed'); return; }
            modal.Close();
            schedRefresh();
        };

        container.querySelector<HTMLButtonElement>('#sched-modal-save')!.addEventListener('click', doSave);
        container.querySelector<HTMLButtonElement>('#sched-modal-cancel')!.addEventListener('click', () => modal.Close());
    }, MODAL_DOM_DELAY);
}

// ── 초기화 ──────────────────────────────────────────────────────────────────
// ES 모듈은 import된 모듈의 최상위 코드를 import하는 쪽(Control.ts)의 최상위 코드보다 먼저 실행한다.
// gAtl.Init() 이전에 서버로 fetch가 나가면 안 되므로, 자동 실행 대신 Control.ts가 원래 위치(Tmux 섹션
// 이후)에서 명시적으로 호출하는 함수로 내보낸다(Messenger 탭과 동일한 방식).
export function MountScheduleTab(): void {
    CDOM.ID('sched-new-btn').addEventListener('click', () => schedOpenModal());
    // 옵션 패널이 항상 열려있지 않아도 최신 목록을 유지하도록 첫 로딩 시 + 5초 주기로 갱신한다.
    schedRefresh();
    setInterval(schedRefresh, 5000);
}
