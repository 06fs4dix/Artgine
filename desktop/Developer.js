import { CAlert } from "../artgine/basic/CAlert.js";
import { CDOM } from "../artgine/basic/CDOM.js";
import { CModal } from "../artgine/basic/CModal.js";
import { CString } from "../artgine/basic/CString.js";
import { CWebView } from "../artgine/system/CWebView.js";
var gProjJSON = null;
var gAppJSON = null;
var gManifest = null;
var gPlugin;
var gServiceWorker = null;
function WatchInputChanges() {
    const updatePreference = () => {
        const pref = gProjJSON.preference ??= {};
        const prefInputs = document.querySelectorAll("#preference input");
        prefInputs.forEach((el, i) => {
            const input = el;
            const id = input.id;
            if (input.type === "checkbox") {
                pref[idToField(id)] = input.checked;
            }
            else if (input.type === "number") {
                if (id === "targetWidth")
                    pref.mTargetWidth = input.valueAsNumber;
                else if (id === "targetHeight")
                    pref.mTargetHeight = input.valueAsNumber;
            }
            else if (input.type === "text") {
                pref.mCanvas = input.value;
            }
        });
        const select = document.querySelector("#preference select");
        if (select) {
            pref.mRenderer = select.value;
        }
    };
    const updateIncludes = () => {
        const inc = gProjJSON.includes ??= {};
        const includeInputs = document.querySelectorAll("#include input[type='checkbox']");
        includeInputs.forEach(el => {
            const input = el;
            const id = input.id.replace(/_chk$/, "");
            inc[id] = input.checked;
        });
    };
    const updateAppJSON = () => {
        gAppJSON.url = document.getElementById("url_txt").value;
        gAppJSON.projectPath = document.getElementById("projectPath_txt").value;
        gAppJSON.server = document.getElementById("server_sel").value;
        gAppJSON.width = parseInt(document.getElementById("width_num").value);
        gAppJSON.height = parseInt(document.getElementById("height_num").value);
        gAppJSON.program = document.getElementById("program_sel").value;
        gAppJSON.fullScreen = document.getElementById("fullScreen_chk").checked;
        gAppJSON.github = document.getElementById("github_chk").checked;
        gAppJSON.password = document.getElementById("auth_password_txt").value;
        gAppJSON.rootPath = document.getElementById("auth_rootpath_txt").value.split("\n").map(s => s.trim()).filter(Boolean);
    };
    const updateManifest = () => {
        gManifest.short_name = CDOM.IDValue("short_name_txt");
        gManifest.name = CDOM.IDValue("name_txt");
        gManifest.start_url = CDOM.IDValue("start_url_txt");
        gManifest.scope = CDOM.IDValue("scope_txt");
        gManifest.id = CDOM.IDValue("id_txt");
        gManifest.description = CDOM.IDValue("description_txt");
        gManifest.orientation = CDOM.IDValue("orientation_sel");
        gManifest.display = CDOM.IDValue("display_sel");
        gManifest.background_color = CDOM.IDValue("background_color_pick");
        gManifest.theme_color = CDOM.IDValue("theme_color_pick");
        const catStr = CDOM.IDValue("categories_txt");
        gManifest.categories = catStr.split(",").map(s => s.trim()).filter(s => s.length > 0);
        try {
            gManifest.screenshots = JSON.parse(CDOM.IDValue("screenshots_txt"));
        }
        catch {
            gManifest.screenshots = [];
        }
        try {
            gManifest.shortcuts = JSON.parse(CDOM.IDValue("shortcuts_txt"));
        }
        catch {
            gManifest.shortcuts = [];
        }
    };
    const updateServiceWorker = () => {
        gServiceWorker.CACHE_NAME = CDOM.IDValue("cache_name_txt");
        const maxMB = parseInt(CDOM.IDValue("max_cache_size_num"), 10);
        gServiceWorker.MAX_CACHE_SIZE = (isNaN(maxMB) ? 50 : maxMB) * 1024 * 1024;
        gServiceWorker.LOG = CDOM.IDChecked("log_chk");
        gServiceWorker.API_CACHE = CDOM.IDChecked("api_cache_chk");
    };
    const updatePlugins = () => {
        const pluginListDiv = document.getElementById("plugin_list");
        if (!pluginListDiv)
            return;
        const inputs = pluginListDiv.querySelectorAll("input[type='checkbox']");
        const newDeps = {};
        inputs.forEach((input) => {
            const pluginName = input.id.replace(/^plugin_/, "");
            const plugin = gPlugin.find(p => p.name === pluginName);
            if (input.checked && plugin) {
                if (typeof plugin.version === "number")
                    newDeps[pluginName] = plugin.version;
                else
                    CAlert.E("?�러그인 버전 문제");
            }
        });
        gProjJSON.dependencies = newDeps;
    };
    const idToField = (id) => {
        const map = {
            depth: "m32fDepth",
            anti: "mAnti",
            xr: "mXR",
            devTool: "mDeveloper",
            IAuto: "mIAuto",
            wasm: "mWASM",
        };
        return map[id] ?? id;
    };
    document.querySelectorAll("#preference input, #preference select").forEach(el => el.addEventListener("change", updatePreference));
    document.querySelectorAll("#include input[type='checkbox']").forEach(el => el.addEventListener("change", updateIncludes));
    document.querySelectorAll("#app input, #app select, #app textarea").forEach(el => el.addEventListener("change", updateAppJSON));
    document.querySelectorAll("#authRoot_collapse input, #authRoot_collapse textarea").forEach(el => el.addEventListener("change", () => CWebView.Call("UpdateExtraSettings", {
        password: document.getElementById("auth_password_txt").value,
        rootPath: document.getElementById("auth_rootpath_txt").value.split("\n").map(s => s.trim()).filter(Boolean),
    })));
    document.querySelectorAll("#manifest input, #manifest select, #manifest textarea").forEach(el => el.addEventListener("change", updateManifest));
    document.querySelectorAll("#serviceworker input").forEach(el => el.addEventListener("change", updateServiceWorker));
    document.querySelectorAll("#plugin_list input[type='checkbox']").forEach(el => el.addEventListener("change", updatePlugins));
}
async function Init() {
    gAppJSON = JSON.parse(await CWebView.Call("LoadAppJSON"));
    CDOM.IDValue("url_txt", gAppJSON.url);
    CDOM.IDValue("projectPath_txt", gAppJSON.projectPath);
    CDOM.IDValue("width_num", gAppJSON.width);
    CDOM.IDValue("height_num", gAppJSON.height);
    CDOM.IDInput("server_sel").value = gAppJSON.server;
    CDOM.IDInput("fullScreen_chk").checked = gAppJSON.fullScreen;
    CDOM.IDInput("github_chk").checked = gAppJSON.github;
    CDOM.IDValue("auth_password_txt", gAppJSON.password ?? "");
    CDOM.IDValue("auth_rootpath_txt", (Array.isArray(gAppJSON.rootPath) ? gAppJSON.rootPath : [gAppJSON.rootPath ?? "./"]).join("\n"));
    CDOM.IDInput("program_sel").value = gAppJSON.program;
    gProjJSON = JSON.parse(await CWebView.Call("LoadProjJSON", {
        projectPath: gAppJSON.projectPath,
    }));
    gPlugin = JSON.parse(await CWebView.Call("LoadPlugin"));
    const pluginListDiv = document.getElementById("plugin_list");
    if (pluginListDiv && Array.isArray(gPlugin)) {
        pluginListDiv.innerHTML = "";
        const deps = gProjJSON.dependencies ?? {};
        gPlugin.forEach((plugin) => {
            const id = `plugin_${plugin.name}`;
            const wrapper = document.createElement("div");
            wrapper.className = "col-6 col-md-4 mb-2";
            const inner = document.createElement("div");
            inner.className = "form-check d-flex align-items-center gap-2";
            const checkbox = document.createElement("input");
            checkbox.className = "form-check-input";
            checkbox.type = "checkbox";
            checkbox.id = id;
            if (deps[plugin.name] === 1) {
                checkbox.checked = true;
            }
            const label = document.createElement("label");
            label.className = "form-check-label";
            label.htmlFor = id;
            label.textContent = plugin.name;
            label.setAttribute("data-bs-toggle", "tooltip");
            label.setAttribute("data-bs-placement", "top");
            label.setAttribute("title", plugin.html);
            label.setAttribute("data-bs-html", "true");
            inner.appendChild(checkbox);
            inner.appendChild(label);
            wrapper.appendChild(inner);
            pluginListDiv.appendChild(wrapper);
        });
    }
    let pref = gProjJSON.preference;
    if (pref) {
        CDOM.IDInput("depth").checked = !!pref.m32fDepth;
        CDOM.IDInput("anti").checked = !!pref.mAnti;
        CDOM.IDInput("xr").checked = !!pref.mXR;
        CDOM.IDInput("devTool").checked = !!pref.mDeveloper;
        CDOM.IDInput("IAuto").checked = !!pref.mIAuto;
        CDOM.IDInput("wasm").checked = !!pref.mWASM;
        CDOM.IDInput("targetWidth").value = pref.mTargetWidth ?? 0;
        CDOM.IDInput("targetHeight").value = pref.mTargetHeight ?? 0;
        CDOM.IDInput("canvas_txt").value = pref.mCanvas ?? "";
        if (pref.mCanvas == null)
            pref.mCanvas = "";
        const rendererSelect = document.querySelector("#preference select");
        if (rendererSelect && pref.mRenderer) {
            for (let i = 0; i < rendererSelect.options.length; i++) {
                if (rendererSelect.options[i].value === pref.mRenderer) {
                    rendererSelect.selectedIndex = i;
                    break;
                }
            }
        }
    }
    let inc = gProjJSON.includes;
    if (inc) {
        for (const [key, val] of Object.entries(inc)) {
            const el = document.getElementById(key + "_chk");
            if (el)
                el.checked = !!val;
        }
    }
    gManifest = JSON.parse(await CWebView.Call("LoadManifest", {
        projectPath: gAppJSON.projectPath,
    }));
    CDOM.IDValue("short_name_txt", gManifest.short_name ?? "");
    CDOM.IDValue("name_txt", gManifest.name ?? "");
    CDOM.IDValue("start_url_txt", gManifest.start_url ?? "");
    CDOM.IDValue("scope_txt", gManifest.scope ?? ".");
    CDOM.IDValue("id_txt", gManifest.id ?? "");
    CDOM.IDValue("description_txt", gManifest.description ?? "");
    CDOM.IDValue("orientation_sel", gManifest.orientation ?? "any");
    CDOM.IDValue("display_sel", gManifest.display ?? "fullscreen");
    CDOM.IDValue("background_color_pick", gManifest.background_color ?? "#ffffff");
    CDOM.IDValue("theme_color_pick", gManifest.theme_color ?? "#000000");
    if (Array.isArray(gManifest.icons)) {
        CreateArrayItemInput("icons", gManifest.icons, "icons");
    }
    gServiceWorker = JSON.parse(await CWebView.Call("LoadServiceWorker", {
        projectPath: gAppJSON.projectPath,
    }));
    CDOM.IDValue("cache_name_txt", gServiceWorker.CACHE_NAME);
    CDOM.IDValue("max_cache_size_num", Math.floor(gServiceWorker.MAX_CACHE_SIZE / (1024 * 1024)));
    CDOM.IDInput("log_chk").checked = gServiceWorker.LOG;
    CDOM.IDInput("api_cache_chk").checked = gServiceWorker.API_CACHE;
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.forEach(function (tooltipTriggerEl) {
        new bootstrap.Tooltip(tooltipTriggerEl);
    });
}
await Init();
WatchInputChanges();
document.getElementById("VSCode_btn").addEventListener("click", async function () {
    if (await CWebView.Call("VSCodeRun")) {
        let modal = new CModal();
        modal.SetHeader("Info");
        modal.SetTitle(CModal.eTitle.Text);
        modal.SetBody("<div>VS Code Not Install.</div><button type='button' class='btn btn-primary' id='VSInstall_btn'>Install</button>");
        modal.SetZIndex(CModal.eSort.Top);
        modal.Open(CModal.ePos.Center);
        document.getElementById("VSInstall_btn").addEventListener("click", () => {
            CWebView.Call("URLRun", "https://code.visualstudio.com/download");
        });
        modal.Close(10);
    }
});
function GetAISelected() {
    const ids = ["claude", "antigravity", "manus", "gpt", "codex", "opencode"];
    return ids.filter(id => document.getElementById(`ai_${id}_chk`).checked);
}
document.getElementById("aiCreate_btn").addEventListener("click", async function () {
    const selected = GetAISelected();
    if (selected.length === 0)
        return;
    await CWebView.Call("AICreate", selected);
});
document.getElementById("aiDelete_btn").addEventListener("click", async function () {
    const selected = GetAISelected();
    if (selected.length === 0)
        return;
    await CWebView.Call("AIDelete", selected);
});
function GetTTYDConfig() {
    const port = parseInt(document.getElementById("ttyd_port").value) || 7681;
    const password = document.getElementById("ttyd_password").value;
    return { port, password };
}
document.getElementById("ttydRun_btn").addEventListener("click", async function () {
    await CWebView.Call("TTYDRun", GetTTYDConfig());
});
document.getElementById("ttydBrowser_btn").addEventListener("click", async function () {
    const { port } = GetTTYDConfig();
    await CWebView.Call("URLRun", `http://localhost:${port}`);
});
document.getElementById("selectProjectPath_btn").addEventListener("click", async function () {
    CDOM.ID("Run_btn").disabled = true;
    let list = await CWebView.Call("FolderSelectModal", { name: "", ext: ["folder"], mode: "load", absolute: false });
    CDOM.ID("Run_btn").disabled = false;
    if (list == "")
        return;
    CDOM.IDInput("projectPath_txt").value = list;
    gAppJSON.projectPath = list;
    gProjJSON = JSON.parse(await CWebView.Call("LoadProjJSON", {
        projectPath: list,
    }));
    gManifest = JSON.parse(await CWebView.Call("LoadManifest", {
        projectPath: gAppJSON.projectPath,
    }));
    gServiceWorker = JSON.parse(await CWebView.Call("LoadServiceWorker", {
        projectPath: gAppJSON.projectPath,
    }));
    await CWebView.Call("NewPage", {
        appJSON: gAppJSON,
        projetJSON: gProjJSON,
        projectPath: list,
        manifast: gManifest,
        serviceWorker: gServiceWorker
    });
    Init();
});
async function Run_btn() {
    CDOM.ID("Run_btn").disabled = true;
    let projectPath_txt = CDOM.IDValue("projectPath_txt");
    let url_txt = CDOM.IDValue("url_txt");
    let server_sel = CDOM.IDValue("server_sel");
    if (server_sel == "local")
        url_txt = "";
    if (await CWebView.Call("NewPage", {
        appJSON: gAppJSON,
        projetJSON: gProjJSON,
        projectPath: projectPath_txt,
        manifast: gManifest,
        serviceWorker: gServiceWorker
    }) != "") {
        CDOM.ID("Run_btn").disabled = false;
        return;
    }
    CDOM.ID("Run_btn").disabled = false;
    if (await CWebView.Call("PageRun")) {
    }
}
document.getElementById("Run_btn").addEventListener("click", async function () {
    await Run_btn();
});
function CreateArrayItemInput(fieldId, dataList, label) {
    const listEl = document.getElementById(`${fieldId}_list`);
    if (!listEl)
        return;
    listEl.innerHTML = '';
    dataList.forEach((value, index) => {
        const item = document.createElement("div");
        item.className = "list-group-item d-flex justify-content-between align-items-center";
        const text = document.createElement("span");
        text.textContent = value.src;
        text.className = "text-truncate";
        const delBtn = document.createElement("button");
        delBtn.type = "button";
        delBtn.className = "btn-close ms-2";
        delBtn.ariaLabel = "Remove";
        delBtn.onclick = () => {
            dataList.splice(index, 1);
            CreateArrayItemInput(fieldId, dataList, label);
        };
        item.appendChild(text);
        item.appendChild(delBtn);
        listEl.appendChild(item);
    });
}
document.getElementById("iconsAdd_btn").addEventListener("click", async function () {
    let list = await CWebView.Call("FolderSelectModal", { name: "", ext: ["png", "jpg"], mode: "load", absolute: false });
    if (list == "")
        return;
    list = CString.ReplaceAll(list, gAppJSON.projectPath + "/", "");
    if (gManifest.icons.includes(list))
        return;
    let ext = CString.ExtCut(list);
    let iconSize = await CWebView.Call("ICONSize", list);
    gManifest.icons.push({ "src": list, "type": "image/" + ext.ext, "sizes": iconSize });
    CreateArrayItemInput("icons", gManifest.icons, "icons");
});
window.addEventListener("keyup", async (e) => {
    let key = e.key;
    if (e.keyCode == 120)
        await await Run_btn();
});
