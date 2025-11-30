import { CModal } from "../basic/CModal.js";
import { CPath } from "../basic/CPath.js";
import { CFecth } from "../network/CFecth.js";
export class CScore {
    static async Read(_project, _count = 10, _desc = false) {
        const list = await CFecth.Exe(CPath.PHPC() + "CScore/Read", { project: _project, count: _count, order: _desc ? "desc" : "" }, "json");
        let modal = new CModal("RankModal");
        modal.SetHeader("Rank");
        modal.SetTitle(CModal.eTitle.Text);
        modal.SetSize(480, 640);
        const esc = (s) => {
            if (s == null)
                return "";
            return String(s)
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#39;");
        };
        let rows = null;
        if (_desc == false) {
            rows = (list && list.length > 0)
                ? list.slice().reverse().map((it, idx, arr) => `
                <tr>
                    <th scope="row">${idx + 1}</th>
                    <td>${esc(it._nick)}</td>
                    <td>${esc(it._data)}</td>
                </tr>
            `).join("")
                : `<tr><td colspan="3" class="text-center py-3">기록이 없습니다</td></tr>`;
        }
        else {
            rows = (list && list.length > 0)
                ? list.map((it, idx) => `
                <tr>
                    <th scope="row">${idx + 1}</th>
                    <td>${esc(it._nick)}</td>
                    <td>${esc(it._data)}</td>
                </tr>
            `).join("")
                : `<tr><td colspan="3" class="text-center py-3">기록이 없습니다</td></tr>`;
        }
        modal.SetBody(`
            <div class="table-responsive">
                <table class="table table-striped table-hover align-middle mb-0">
                    <thead class="table-light">
                        <tr>
                            <th scope="col" style="width: 8%;">순위</th>
                            <th scope="col">닉네임</th>
                            <th scope="col">점수</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows}
                    </tbody>
                </table>
            </div>
        `);
        modal.SetZIndex(CModal.eSort.Top);
        modal.SetBodyClose(true);
        modal.Open(CModal.ePos.Center);
    }
    static async Write(_project, _nick, _data) {
        await CFecth.Exe(CPath.PHPC() + "CScore/Write", { project: _project, nick: _nick, data: _data });
    }
}
