import { CDOM } from "../../../artgine/basic/CDOM.js";
import { CPath } from "../../../artgine/basic/CPath.js";
import { CModal, CConfirm } from "../../../artgine/basic/CModal.js";
import { CAlert } from "../../../artgine/basic/CAlert.js";
import { CLan } from "../../../artgine/basic/CLan.js";
function L(key, en) {
    return CLan.Get(key, en);
}
function LF(key, en, ...args) {
    let s = CLan.Get(key, en);
    for (let i = 0; i < args.length; i++)
        s = s.split(`{${i}}`).join(String(args[i]));
    return s;
}
function aiEscapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
}
function authedFetch(url, init) {
    return fetch(url, init);
}
const MODAL_DOM_DELAY = 100;
const schedSessionList = CDOM.ID("schedSessionList");
function schedIntervalStr(s) {
    if (s.mode === 'time') {
        const hh = String(s.option.hour ?? 0).padStart(2, '0');
        const mm = String(s.option.minute ?? 0).padStart(2, '0');
        return `${hh}:${mm}`;
    }
    const parts = [`${s.option.delay ?? 0}s`];
    if ((s.option.count ?? 0) > 0)
        parts.push(`×${s.option.count}`);
    if ((s.option.start ?? 0) > 0)
        parts.push(`+${s.option.start}s`);
    if ((s.option.end ?? 0) > 0)
        parts.push(`~${s.option.end}s`);
    return parts.join(' ');
}
async function schedRefresh() {
    try {
        const r = await authedFetch(CPath.WebRootUrl() + 'cmd/schedules');
        const j = await r.json();
        if (!j.ok)
            return;
        schedSessionList.innerHTML = '';
        const schedules = j.schedules;
        if (schedules.length === 0)
            return;
        for (const s of schedules) {
            const item = document.createElement('div');
            item.className = 'ai-session-item d-flex align-items-center gap-2 px-2 py-1 rounded';
            item.style.cursor = 'pointer';
            item.innerHTML = `
                <span class="d-flex flex-column align-items-center flex-shrink-0" style="min-width:2rem;">
                    <span class="badge rounded-pill ${s.mode === 'time' ? 'bg-primary' : 'bg-info'}" style="font-size:0.65rem;">${s.mode}</span>
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
            item.querySelector('.sched-del-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                const dlg = new CConfirm();
                dlg.SetBody(LF('ctrl.msg.deleteSchedule', 'Delete schedule "{0}"?', aiEscapeHtml(s.name)));
                dlg.SetConfirm(CConfirm.eConfirm.YesNo, [
                    async () => {
                        await authedFetch(`${CPath.WebRootUrl()}cmd/schedule-del?name=${encodeURIComponent(s.name)}`);
                        schedRefresh();
                    },
                    () => { },
                ], [L('ctrl.delete', 'Delete'), L('ctrl.cancel', 'Cancel')]);
                dlg.Open();
            });
            item.addEventListener('mouseenter', () => item.classList.add('bg-body-secondary'));
            item.addEventListener('mouseleave', () => item.classList.remove('bg-body-secondary'));
            schedSessionList.appendChild(item);
        }
    }
    catch (e) {
        console.error('schedRefresh error:', e);
    }
}
async function schedOpenModal(existing) {
    const isEdit = !!existing;
    let agents = [];
    try {
        const r = await authedFetch(CPath.WebRootUrl() + 'cmd/agents');
        const j = await r.json();
        if (j.ok)
            agents = j.agents;
    }
    catch (e) {
        console.error('schedOpenModal agents fetch error:', e);
    }
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
                <button id="sched-tab-interval" type="button" class="btn btn-sm flex-fill ${existing?.mode !== 'time' ? 'btn-primary' : 'btn-outline-secondary'}">${L('ctrl.lbl.interval', 'Interval')}</button>
                <button id="sched-tab-time"     type="button" class="btn btn-sm flex-fill ${existing?.mode === 'time' ? 'btn-primary' : 'btn-outline-secondary'}">${L('ctrl.lbl.time', 'Time')}</button>
            </div>
            <div id="sched-panel-interval" style="display:${existing?.mode !== 'time' ? '' : 'none'}">
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
            <div id="sched-panel-time" style="display:${existing?.mode === 'time' ? '' : 'none'}">
                <div class="mb-2">
                    <label class="form-label small text-secondary mb-1">${L('ctrl.lbl.daysOfWeek', 'Days of Week')}</label>
                    <div class="d-flex gap-1 flex-wrap">
                        ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((lbl, i) => `<button type="button" class="sched-day-btn btn btn-sm ${(existing?.option.days ?? []).includes(i) ? 'btn-primary' : 'btn-outline-secondary'}" data-day="${i}">${lbl}</button>`).join('')}
                    </div>
                </div>
                <div class="d-flex gap-2 align-items-end">
                    <div class="flex-fill">
                        <label class="form-label small text-secondary mb-1">${L('ctrl.lbl.hour', 'Hour (0–23)')}</label>
                        <select id="sched-hour" class="form-select form-select-sm">
                            ${Array.from({ length: 24 }, (_, h) => `<option value="${h}" ${(existing?.option.hour ?? 9) === h ? 'selected' : ''}>${String(h).padStart(2, '0')}</option>`).join('')}
                        </select>
                    </div>
                    <div class="flex-fill">
                        <label class="form-label small text-secondary mb-1">${L('ctrl.lbl.minute', 'Minute')}</label>
                        <select id="sched-minute" class="form-select form-select-sm">
                            ${Array.from({ length: 12 }, (_, i) => i * 5).map(m => `<option value="${m}" ${(existing?.option.minute ?? 0) === m ? 'selected' : ''}>${String(m).padStart(2, '0')}</option>`).join('')}
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
        let isTimeMode = existing?.mode === 'time';
        const tabInterval = container.querySelector('#sched-tab-interval');
        const tabTime = container.querySelector('#sched-tab-time');
        const panelInterval = container.querySelector('#sched-panel-interval');
        const panelTime = container.querySelector('#sched-panel-time');
        const switchTab = (toTime) => {
            isTimeMode = toTime;
            tabInterval.className = `btn btn-sm flex-fill ${!toTime ? 'btn-primary' : 'btn-outline-secondary'}`;
            tabTime.className = `btn btn-sm flex-fill ${toTime ? 'btn-primary' : 'btn-outline-secondary'}`;
            panelInterval.style.display = toTime ? 'none' : '';
            panelTime.style.display = toTime ? '' : 'none';
        };
        tabInterval.addEventListener('click', () => switchTab(false));
        tabTime.addEventListener('click', () => switchTab(true));
        const dayBtns = container.querySelectorAll('.sched-day-btn');
        dayBtns.forEach(b => b.addEventListener('click', () => {
            const active = b.classList.contains('btn-primary');
            b.classList.toggle('btn-primary', !active);
            b.classList.toggle('btn-outline-secondary', active);
        }));
        const doSave = async () => {
            const name = (container.querySelector('#sched-name')).value.trim();
            const subAgentKey = (container.querySelector('#sched-agent')).value.trim();
            const command = (container.querySelector('#sched-cmd')).value.trim();
            if (!name || !subAgentKey || !command) {
                CAlert.E(L('ctrl.msg.nameAgentCmdRequired', 'Name, sub agent, and command are required'));
                return;
            }
            const option = {};
            if (isTimeMode) {
                const selectedDays = Array.from(dayBtns).filter(b => b.classList.contains('btn-primary')).map(b => Number(b.dataset.day));
                if (selectedDays.length === 0) {
                    CAlert.E(L('ctrl.msg.selectOneDay', 'Select at least one day'));
                    return;
                }
                option.days = selectedDays;
                option.hour = parseInt((container.querySelector('#sched-hour')).value) || 0;
                option.minute = parseInt((container.querySelector('#sched-minute')).value) || 0;
                option.autoEnd = (container.querySelector('#sched-autoend-time')).checked;
            }
            else {
                const delay = Math.max(0, parseInt((container.querySelector('#sched-delay')).value) || 0);
                if (delay === 0) {
                    CAlert.E(L('ctrl.msg.delayMin1', 'Delay must be at least 1 second'));
                    return;
                }
                option.delay = delay;
                option.count = Math.max(0, parseInt((container.querySelector('#sched-count')).value) || 0);
                option.start = Math.max(0, parseInt((container.querySelector('#sched-start')).value) || 0);
                option.end = Math.max(0, parseInt((container.querySelector('#sched-end')).value) || 0);
                option.autoEnd = (container.querySelector('#sched-autoend-interval')).checked;
            }
            const params = new URLSearchParams({ name, subAgentKey, mode: isTimeMode ? 'time' : 'interval', command, option: JSON.stringify(option) });
            const r = await authedFetch(`${CPath.WebRootUrl()}cmd/schedule-set?${params.toString()}`);
            const j = await r.json();
            if (!j.ok) {
                CAlert.E(j.msg || 'Failed');
                return;
            }
            modal.Close();
            schedRefresh();
        };
        container.querySelector('#sched-modal-save').addEventListener('click', doSave);
        container.querySelector('#sched-modal-cancel').addEventListener('click', () => modal.Close());
    }, MODAL_DOM_DELAY);
}
export function MountScheduleTab() {
    CDOM.ID('sched-new-btn').addEventListener('click', () => schedOpenModal());
    schedRefresh();
    setInterval(schedRefresh, 5000);
}
