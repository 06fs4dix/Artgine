import { CModal } from "../basic/CModal.js";
import { CEvent } from "../basic/CEvent.js";
import { CModalFlex } from "../util/CModalUtil.js";
let gModal = null;
let gBrush = null;
let gSelectedKey = null;
let gFilter = "";
let gUsersCache = new Map();
let gSnapshotTime = "";
export function RenderQueTool(_brush) {
    gBrush = _brush;
    gSelectedKey = null;
    gFilter = "";
    gUsersCache = new Map();
    gModal = new CModalFlex([0.3, 0.7], "RenderOrderModal");
    gModal.mResize = true;
    gModal.SetSize(1400, 800);
    gModal.SetTitle(CModal.eTitle.TextMinFullClose);
    gModal.SetHeader("Render Queue");
    gModal.SetZIndex(CModal.eSort.Manual, CModal.eSort.ZIndexTool);
    gModal.On(CEvent.eType.Close, () => { Close(); });
    gModal.Open();
    const leftPanel = gModal.FindFlex(0);
    const rightPanel = gModal.FindFlex(1);
    leftPanel.style.display = "flex";
    leftPanel.style.flexDirection = "column";
    leftPanel.style.overflow = "hidden";
    rightPanel.style.display = "flex";
    rightPanel.style.flexDirection = "column";
    rightPanel.style.overflow = "hidden";
    leftPanel.innerHTML =
        `<div style="padding:6px; border-bottom:1px solid #ddd; display:flex; flex-direction:column; gap:4px;">` +
            `<button id="rq_refresh" class="btn btn-sm btn-primary">새로고침 (현재 프레임 스냅샷)</button>` +
            `<div id="rq_time" class="text-muted" style="font-size:11px;"></div>` +
            `<input type="search" id="rq_search" class="form-control form-control-sm" placeholder="Search render pass / tag...">` +
            `</div>` +
            `<div id="rq_list" style="flex:1 1 auto; overflow-y:auto;"></div>`;
    rightPanel.innerHTML =
        `<div id="rq_detail" style="flex:0 0 42%; overflow-y:auto; border-bottom:3px solid #999; padding:8px;"></div>` +
            `<div id="rq_frame" style="flex:1 1 auto; overflow-y:auto; padding:8px;"></div>`;
    const search = leftPanel.querySelector("#rq_search");
    search.oninput = () => {
        gFilter = search.value.toLowerCase();
        RefreshList();
    };
    const refreshBtn = leftPanel.querySelector("#rq_refresh");
    refreshBtn.onclick = () => { TakeSnapshot(); };
    TakeSnapshot();
}
function Close() {
    gBrush = null;
    gModal = null;
    gSelectedKey = null;
    gUsersCache = new Map();
}
function Esc(_s) {
    return String(_s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]));
}
function CollectUsers() {
    const map = new Map();
    if (gBrush == null)
        return map;
    for (let [priority, renPri] of gBrush.mRenPriMap) {
        CollectList(map, renPri.mAlphaList, priority, "Alpha");
        CollectList(map, renPri.mDistanceList, priority, "Distance");
        CollectList(map, renPri.mRAlphaList, priority, "RAlpha");
    }
    return map;
}
function CollectList(_map, _list, _priority, _listType) {
    const size = _list.Size();
    for (let i = 0; i < size; ++i) {
        const cur = _list.Find(i);
        if (cur == null || cur.mRenInfoKey == null)
            continue;
        let arr = _map.get(cur.mRenInfoKey);
        if (arr == null) {
            arr = [];
            _map.set(cur.mRenInfoKey, arr);
        }
        arr.push({
            mOwnerKey: cur.mPaint?.GetOwner()?.Key() ?? "-",
            mType: cur.mPaint?.constructor?.name ?? "-",
            mShow: cur.mShow,
            mPriority: _priority,
            mListType: _listType,
        });
    }
}
function TakeSnapshot() {
    if (gBrush == null || gModal == null)
        return;
    gUsersCache = CollectUsers();
    const now = new Date();
    gSnapshotTime = now.toLocaleTimeString();
    const timeDiv = document.getElementById("rq_time");
    if (timeDiv != null)
        timeDiv.textContent = `스냅샷: ${gSnapshotTime}`;
    RefreshList();
    RefreshDetail();
    RefreshFrame();
}
function RefreshList() {
    const listDiv = document.getElementById("rq_list");
    if (listDiv == null || gBrush == null)
        return;
    const scrollTop = listDiv.scrollTop;
    let entries = Array.from(gBrush.mRenInfoMap.entries())
        .filter(([, info]) => info.mRP != null && info.mShader != null);
    if (gFilter) {
        entries = entries.filter(([key, info]) => {
            if (key.toLowerCase().includes(gFilter))
                return true;
            for (let t of info.mTag)
                if (t.toLowerCase().includes(gFilter))
                    return true;
            return false;
        });
    }
    entries.sort((a, b) => {
        const pa = a[1].mRP?.mPriority ?? 0;
        const pb = b[1].mRP?.mPriority ?? 0;
        if (pa !== pb)
            return pa - pb;
        return a[0].localeCompare(b[0]);
    });
    let html = "";
    for (let [key, info] of entries) {
        const users = gUsersCache.get(key) ?? [];
        const active = key === gSelectedKey ? "list-group-item-primary" : "";
        const dot = info.mShow ? "#28a745" : "#adb5bd";
        html += `
        <div class="list-group-item list-group-item-action py-1 px-2 ${active}" style="cursor:pointer; font-size:12px;" data-key="${Esc(key)}">
            <div style="display:flex; align-items:center; gap:6px;">
                <span style="width:8px; height:8px; border-radius:50%; background:${dot}; flex:none;"></span>
                <span style="flex:1 1 auto; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${Esc(key)}">${Esc(key)}</span>
                <span class="badge bg-secondary">P${info.mRP.mPriority ?? "-"}</span>
                <span class="badge bg-info text-dark" title="사용 중인 오브젝트 수">${users.length}</span>
            </div>
        </div>`;
    }
    listDiv.innerHTML = html || `<div class="text-muted p-2" style="font-size:12px;">렌더패스 없음</div>`;
    listDiv.scrollTop = scrollTop;
    listDiv.querySelectorAll("[data-key]").forEach((el) => {
        el.onclick = () => {
            gSelectedKey = el.dataset.key;
            RefreshList();
            RefreshDetail();
        };
    });
}
function RefreshDetail() {
    const div = document.getElementById("rq_detail");
    if (div == null || gBrush == null)
        return;
    if (gSelectedKey == null || !gBrush.mRenInfoMap.has(gSelectedKey)) {
        div.innerHTML = `<div class="text-muted">좌측에서 렌더패스를 선택하세요.</div>`;
        return;
    }
    const scrollTop = div.scrollTop;
    const info = gBrush.mRenInfoMap.get(gSelectedKey);
    const rp = info.mRP;
    const fields = [];
    fields.push(`show: ${info.mShow}`);
    fields.push(`tag: ${info.mTag && info.mTag.size > 0 ? Array.from(info.mTag).join(", ") : "-"}`);
    if (rp.mDepthTest != null)
        fields.push(`depthTest: ${rp.mDepthTest}`);
    if (rp.mDepthWrite != null)
        fields.push(`depthWrite: ${rp.mDepthWrite}`);
    if (rp.mAlpha != null)
        fields.push(`alpha: ${rp.mAlpha}`);
    if (rp.mCullFace != null)
        fields.push(`cullFace: ${rp.mCullFace}`);
    if (rp.mCamera)
        fields.push(`camera: ${rp.mCamera}`);
    if (rp.mPriority != null)
        fields.push(`priority: ${rp.mPriority}`);
    if (rp.mRenderTarget)
        fields.push(`renderTarget: ${rp.mRenderTarget}`);
    if (rp.mRenderTargetUse != null)
        fields.push(`renderTargetUse: ${Array.from(rp.mRenderTargetUse).join(", ")}`);
    if (rp.mShaderAttr && rp.mShaderAttr.length > 0)
        for (let sa of rp.mShaderAttr)
            fields.push(`shaderAttr: ${sa.ToLog()}`);
    if (info.mShader.mDefault.length > 0)
        for (let sa of info.mShader.mDefault)
            fields.push(`default: ${sa.ToLog()}`);
    fields.push(`shader: ${info.mShader.mKey}`);
    if (rp.mShader)
        fields.push(`shaderKey: ${rp.mShader}`);
    if (rp.mClearDepth != null)
        fields.push(`clearDepth: ${rp.mClearDepth}`);
    if (rp.mClearColor != null)
        fields.push(`clearColor: ${rp.mClearColor}`);
    if (rp.mCycle != null)
        fields.push(`cycle: ${rp.mCycle}`);
    const users = gUsersCache.get(gSelectedKey) ?? [];
    const grouped = new Map();
    for (let u of users) {
        const k = u.mOwnerKey + "" + u.mType;
        const g = grouped.get(k);
        if (g)
            g.mCount++;
        else
            grouped.set(k, { mType: u.mType, mCount: 1 });
    }
    let usersHtml;
    if (grouped.size === 0) {
        usersHtml = `<div class="text-muted" style="font-size:12px;">현재 프레임에 이 렌더패스를 사용하는 오브젝트가 없습니다.</div>`;
    }
    else {
        usersHtml = `<ul class="list-group">`;
        for (let [k, g] of grouped) {
            const ownerKey = k.substring(0, k.length - g.mType.length - 1);
            usersHtml += `
            <li class="list-group-item p-1" style="font-size:12px;">
                ${Esc(ownerKey)} <span class="text-muted">(${Esc(g.mType)})</span>
                ${g.mCount > 1 ? `<span class="badge bg-secondary">x${g.mCount}</span>` : ""}
            </li>`;
        }
        usersHtml += `</ul>`;
    }
    div.innerHTML = `
        <h6 class="text-danger mb-2">RenderPass: ${Esc(gSelectedKey)}</h6>
        <ul class="list-group mb-3">
            ${fields.map((f) => `<li class="list-group-item p-1" style="font-size:12px;">${Esc(f)}</li>`).join("")}
        </ul>
        <h6 class="text-primary mb-1">Used By (${users.length})</h6>
        ${usersHtml}
    `;
    div.scrollTop = scrollTop;
}
function RenderCompressedList(_label, _list) {
    const size = _list.Size();
    if (size === 0)
        return `<div class="text-muted" style="font-size:11px;">${_label}: -</div>`;
    let rows = "";
    let prev = null;
    let count = 0;
    const flush = () => {
        if (prev == null)
            return;
        const ownerKey = prev.mPaint?.GetOwner()?.Key() ?? "-";
        const type = prev.mPaint?.constructor?.name ?? "-";
        const warn = prev.mShow !== 0 ? "text-warning" : "";
        rows += `
        <li class="list-group-item p-1 ${warn}" style="font-size:11px;">
            <span style="cursor:pointer; color:#0d6efd; text-decoration:underline;" data-jump="${Esc(prev.mRenInfoKey)}">${Esc(prev.mRenInfoKey ?? "-")}</span>
            &rarr; ${Esc(ownerKey)} <span class="text-muted">(${Esc(type)})</span>
            ${count > 1 ? `<span class="badge bg-secondary">x${count}</span>` : ""}
        </li>`;
    };
    for (let i = 0; i < size; ++i) {
        const cur = _list.Find(i);
        const sameAsPrev = prev != null &&
            prev.mRenInfoKey === cur.mRenInfoKey &&
            prev.mShow === cur.mShow &&
            (prev.mPaint?.constructor?.name ?? "-") === (cur.mPaint?.constructor?.name ?? "-");
        if (sameAsPrev) {
            count++;
            continue;
        }
        flush();
        prev = cur;
        count = 1;
    }
    flush();
    return `<div class="fw-bold" style="font-size:11px;">${_label} (${size})</div><ul class="list-group mb-1">${rows}</ul>`;
}
function RefreshFrame() {
    const div = document.getElementById("rq_frame");
    if (div == null || gBrush == null)
        return;
    const scrollTop = div.scrollTop;
    const sorted = Array.from(gBrush.mRenPriMap.entries()).sort((a, b) => a[0] - b[0]);
    let html = `<h6 class="text-primary">현재 프레임 렌더 큐 (Priority 순)</h6>`;
    if (sorted.length === 0) {
        html += `<div class="text-muted">비어 있음</div>`;
    }
    else {
        for (let [priority, renPri] of sorted) {
            html += `
            <div class="border rounded p-2 mb-2">
                <div class="fw-bold mb-1">Priority ${priority}</div>
                ${RenderCompressedList("Alpha", renPri.mAlphaList)}
                ${RenderCompressedList("Distance", renPri.mDistanceList)}
                ${RenderCompressedList("Reverse Alpha", renPri.mRAlphaList)}
            </div>`;
        }
    }
    div.innerHTML = html;
    div.scrollTop = scrollTop;
    div.querySelectorAll("[data-jump]").forEach((el) => {
        el.onclick = () => {
            gSelectedKey = el.dataset.jump;
            RefreshList();
            RefreshDetail();
        };
    });
}
