import { CEvent } from "../basic/CEvent.js";
import { CModal } from "../basic/CModal.js";
import { CPreferences } from "../basic/CPreferences.js";
import { CUtilObj } from "../basic/CUtilObj.js";
import { CInput } from "../system/CInput.js";
import { DevTool } from "../tool/DevTool.js";
import { CFrame } from "../util/CFrame.js";
import { CBrush } from "./CBrush.js";
import { CCanvas } from "./CCanvas.js";
var gMain = null;
export class CAtelier {
    static Main() { return gMain; }
    mPF = new CPreferences();
    mFrame = null;
    mBrush = null;
    mCanvasMap = new Map();
    async Init(_canvas, _canvasHTMLKey = "", _devTool = true) {
        if (gMain == null)
            gMain = this;
        if (this.mPF.mRenderer == CPreferences.eRenderer.Null)
            return;
        this.mFrame = new CFrame(this.mPF, _canvasHTMLKey);
        this.mBrush = new CBrush(this.mFrame);
        this.mBrush.InitCamera(false);
        this.mBrush.mPause = true;
        this.mFrame.PushEvent(CEvent.eType.Load, async () => {
            if (_canvas.length > 0)
                await this.mBrush.LoadJSON("Canvas/Brush.json");
            for (let key of _canvas) {
                if (key == null || key == "")
                    continue;
                let can = new CCanvas(this.mFrame, this.mBrush);
                this.mCanvasMap.set(key, can);
                await can.LoadJSON("Canvas/" + key);
            }
            this.mBrush.mPause = false;
            if (_devTool) {
                this.mFrame.PushEvent(CEvent.eType.Update, () => {
                    if (this.mFrame.Input().KeyUp(CInput.eKey.F3) && this.mFrame.PF().mDebugMode == false)
                        DevTool(this);
                    if (this.mFrame.Input().KeyUp(CInput.eKey.F2)) {
                        let modal = CUtilObj.ShowModal(this.mFrame.Res());
                        modal.SetZIndex(CModal.eSort.Manual, 2000);
                    }
                    if (this.mFrame.Input().KeyUp(CInput.eKey.F1)) {
                        let modal = new CModal("HelpModal");
                        modal.SetHeader("Help");
                        modal.SetTitle(CModal.eTitle.Text);
                        modal.SetBody(`
							<div class="table-responsive">
							<table class="table table-sm table-bordered align-middle mb-2">
								<thead class="table-light">
								<tr>
									<th class="text-center">Shortcut Key</th>
									<th>Function Description</th>
								</tr>
								</thead>
								<tbody>
								<tr><td class="text-center fw-bold">F2</td><td>Resource / BlackBoard / Language</td></tr>
								<tr><td class="text-center fw-bold">F3</td><td>DevTool</td></tr>
								<tr><td class="text-center fw-bold">F4</td><td>VSCode Project Open <small class="text-muted">(Only Electron)</small></td></tr>
								<tr><td class="text-center fw-bold">F5</td><td>Refresh. Ctrl+F5(Chach Clear)</td></tr>
								<tr><td class="text-center fw-bold">F6</td><td>Stop <small class="text-muted">(Only DevTool Mode)</small></td></tr>
								<tr><td class="text-center fw-bold">F7</td><td>Windows Project Folder Open <small class="text-muted">(Only Electron)</small></td></tr>
								<tr><td class="text-center fw-bold">F8</td><td>Browser Open <small class="text-muted">(Only Electron)</small></td></tr>
								<tr><td class="text-center fw-bold">F9</td><td>Setting <small class="text-muted">(Only Electron)</small></td></tr>
								<tr><td class="text-center fw-bold">Ctrl + C</td><td>Copy after selecting Subject</td></tr>
								<tr><td class="text-center fw-bold">Ctrl + V</td><td>Paste after selecting Canvas</td></tr>
								</tbody>
							</table>
							</div>
							<div class="mb-2">
							<p class="mb-1"><strong>Call</strong> : You can manually execute function names</p>
							<p class="mb-0">You can <strong>Import</strong> by entering copied JSON strings</p>
							</div>
						`);
                        modal.SetZIndex(CModal.eSort.Top);
                        modal.SetBodyClose(true);
                        modal.Open(CModal.ePos.Center);
                    }
                });
            }
        });
        await this.mFrame.Process();
    }
    NewCanvas(_key) {
        if (this.mCanvasMap.has(_key))
            return;
        let can = new CCanvas(this.mFrame, this.mBrush);
        can.SetKey(_key);
        this.mCanvasMap.set(_key, can);
        return can;
    }
    Canvas(_key) {
        return this.mCanvasMap.get(_key);
    }
    Frame() {
        return this.mFrame;
    }
    PF() { return this.mPF; }
    Brush() { return this.mBrush; }
}
window["CAtelier"] = CAtelier;
