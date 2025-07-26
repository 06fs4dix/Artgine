
import { CAlert } from "../artgine/basic/CAlert.js";
import { CConsol } from "../artgine/basic/CConsol.js";
import {CModal} from "../artgine/basic/CModal.js";
import {CString} from "../artgine/basic/CString.js";
import {CUtil} from "../artgine/basic/CUtil.js";
import {CWebView} from "../artgine/system/CWebView.js";



var gProjJSON = null;
var gAppJSON: { url, projectPath, program, server, width, height, fullScreen } = null;
var gManifest=null;
var gPlugin;
var gServiceWorker=null;
// document.addEventListener("keyup", function (e) {
//     if (e.key === "F12") {
//         CWebView.JToWKeyUp("F12");
//         e.preventDefault();
//     }
//     if (e.key === "F7") {
//         CWebView.JToWKeyUp("F7");
//         e.preventDefault();
//     }
// });
function WatchInputChanges() {
    // Preference - checkbox + number
    const updatePreference = () => {
        const pref: any = gProjJSON.preference ??= {};
        const prefInputs = document.querySelectorAll("#preference input");
        prefInputs.forEach((el, i) => {
            const input = el as HTMLInputElement;
            const id = input.id;
            if (input.type === "checkbox") {
                pref[idToField(id)] = input.checked;
            } else if (input.type === "number") {
                if (id === "targetWidth") pref.mTargetWidth = input.valueAsNumber;
                else if (id === "targetHeight") pref.mTargetHeight = input.valueAsNumber;
            }
        });

        const select = document.querySelector("#preference select") as HTMLSelectElement;
        if (select) {
            pref.mRenderer = select.value;
        }
    };

    // Include - checkbox만
    const updateIncludes = () => {
        const inc: any = gProjJSON.includes ??= {};
        const includeInputs = document.querySelectorAll("#include input[type='checkbox']");
        includeInputs.forEach(el => {
            const input = el as HTMLInputElement;
            const id = input.id.replace(/_chk$/, "");
            inc[id] = input.checked;
        });
    };

    // AppJSON 정보 실시간 반영
    const updateAppJSON = () => {
        gAppJSON.url = (document.getElementById("url_txt") as HTMLInputElement).value;
        gAppJSON.projectPath = (document.getElementById("projectPath_txt") as HTMLInputElement).value;
        //gAppJSON.projectName = (document.getElementById("projectName_txt") as HTMLInputElement).value;
        gAppJSON.server = (document.getElementById("server_sel") as HTMLSelectElement).value;
        gAppJSON.width = parseInt((document.getElementById("width_num") as HTMLInputElement).value);
        gAppJSON.height = parseInt((document.getElementById("height_num") as HTMLInputElement).value);
        gAppJSON.program = (document.getElementById("program_sel") as HTMLSelectElement).value;
        gAppJSON.fullScreen = (document.getElementById("fullScreen_chk") as HTMLInputElement).checked;

    };
    const updateManifest = () => {
        
    
        gManifest.short_name = CUtil.IDValue("short_name_txt");
        gManifest.name = CUtil.IDValue("name_txt");
        gManifest.start_url = CUtil.IDValue("start_url_txt");
        gManifest.scope = CUtil.IDValue("scope_txt");
        gManifest.id = CUtil.IDValue("id_txt");
        gManifest.description = CUtil.IDValue("description_txt");
    
        gManifest.orientation = CUtil.IDValue("orientation_sel");
        gManifest.display = CUtil.IDValue("display_sel");
    
        gManifest.background_color = CUtil.IDValue("background_color_pick");
        gManifest.theme_color = CUtil.IDValue("theme_color_pick");
    
        // categories : comma로 구분된 문자열 → 배열
        const catStr = CUtil.IDValue("categories_txt");
        gManifest.categories = catStr.split(",").map(s => s.trim()).filter(s => s.length > 0);
    
        // screenshots, shortcuts : JSON 문자열 → 배열 파싱
        try {
            gManifest.screenshots = JSON.parse(CUtil.IDValue("screenshots_txt"));
        } catch { gManifest.screenshots = []; }
    
        try {
            gManifest.shortcuts = JSON.parse(CUtil.IDValue("shortcuts_txt"));
        } catch { gManifest.shortcuts = []; }
    
        // icons는 CreateArrayItemInput()에서 직접 수정되므로 여기선 제외
    };
    const updateServiceWorker = () => {
     
        
            // 버전 텍스트 → CACHE_NAME 재구성
            
            gServiceWorker.CACHE_NAME = CUtil.IDValue("cache_name_txt");
        
            // MB → Bytes로 변환
            const maxMB = parseInt(CUtil.IDValue("max_cache_size_num"), 10);
            gServiceWorker.MAX_CACHE_SIZE = (isNaN(maxMB) ? 50 : maxMB) * 1024 * 1024;
        
            gServiceWorker.LOG = CUtil.IDChecked("log_chk");
            gServiceWorker.API_CACHE = CUtil.IDChecked("api_cache_chk");
        };

        const updatePlugins = () => {
        const pluginListDiv = document.getElementById("plugin_list");
        if (!pluginListDiv) return;

        const inputs = pluginListDiv.querySelectorAll("input[type='checkbox']");
        const newDeps: Record<string, number> = {};

        inputs.forEach((input: HTMLInputElement) => {
            const pluginName = input.id.replace(/^plugin_/, "");

            const plugin = gPlugin.find(p => p.name === pluginName);
            //console.log("플러그인 찾기:", pluginName, plugin); // ← 확인용

            if (input.checked && plugin) 
            {
                if(typeof plugin.version === "number")
                    newDeps[pluginName] = plugin.version;
                else
                    CAlert.E("플러그인 버전 문제");
            }
        });

        gProjJSON.dependencies = newDeps;
        //CConsol.Log("새 dependencies:", gProjJSON.dependencies); // ← 확인용
    };

    // 공통 함수 - id를 mXXX 필드로 매핑
    const idToField = (id: string) => {
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

    // 이벤트 바인딩
    document.querySelectorAll("#preference input, #preference select").forEach(el =>
        el.addEventListener("change", updatePreference)
    );
    document.querySelectorAll("#include input[type='checkbox']").forEach(el =>
        el.addEventListener("change", updateIncludes)
    );
    document.querySelectorAll("#app input, #app select").forEach(el =>
        el.addEventListener("change", updateAppJSON)
    );
    document.querySelectorAll("#manifest input, #manifest select, #manifest textarea").forEach(el =>
        el.addEventListener("change", updateManifest)
    );
    document.querySelectorAll("#serviceworker input").forEach(el =>
        el.addEventListener("change", updateServiceWorker)
    );
    document.querySelectorAll("#plugin_list input[type='checkbox']").forEach(el =>
        el.addEventListener("change", updatePlugins)
    );
}


async function Init() {

    gAppJSON = JSON.parse(await CWebView.Call("LoadAppJSON"));
    CUtil.IDValue("url_txt", gAppJSON.url);
    CUtil.IDValue("projectPath_txt", gAppJSON.projectPath);
    //CWebUtil.IDValue("projectName_txt", gAppJSON.projectName);
    CUtil.IDValue("width_num", gAppJSON.width);
    CUtil.IDValue("height_num", gAppJSON.height);
    CUtil.IDInput("server_sel").value = gAppJSON.server;
    CUtil.IDInput("fullScreen_chk").checked = gAppJSON.fullScreen;
    CUtil.IDInput("program_sel").value = gAppJSON.program;

    gProjJSON = JSON.parse(await CWebView.Call("LoadProjJSON", {
        projectPath: gAppJSON.projectPath,
        //projectName: gAppJSON.projectName,
    }));


    gPlugin=JSON.parse(await CWebView.Call("LoadPlugin"));
   const pluginListDiv = document.getElementById("plugin_list");
    if (pluginListDiv && Array.isArray(gPlugin)) {
        pluginListDiv.innerHTML = "";

        const deps = gProjJSON.dependencies ?? {};

        gPlugin.forEach((plugin: any) => {
            const id = `plugin_${plugin.name}`;
            

            const wrapper = document.createElement("div");
            wrapper.className = "col-6 col-md-4 mb-2";

            const inner = document.createElement("div");
            inner.className = "form-check d-flex align-items-center gap-2";

            const checkbox = document.createElement("input");
            checkbox.className = "form-check-input";
            checkbox.type = "checkbox";
            checkbox.id = id;

            // ✅ dependencies에 존재하면 체크
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
            label.setAttribute("data-bs-html", "true"); // html 사용 허용

            inner.appendChild(checkbox);
            inner.appendChild(label);
            wrapper.appendChild(inner);
            pluginListDiv.appendChild(wrapper);
        });
    }



    let pref = gProjJSON.preference;
    if (pref) {
        CUtil.IDInput("depth").checked = !!pref.m32fDepth;
        CUtil.IDInput("anti").checked = !!pref.mAnti;
        CUtil.IDInput("xr").checked = !!pref.mXR;
        CUtil.IDInput("devTool").checked = !!pref.mDeveloper;
        CUtil.IDInput("IAuto").checked = !!pref.mIAuto;
        CUtil.IDInput("wasm").checked = !!pref.mWASM;

        CUtil.IDInput("targetWidth").value = pref.mTargetWidth ?? 0;
        CUtil.IDInput("targetHeight").value = pref.mTargetHeight ?? 0;

        // const prefInputs = document.querySelectorAll("#preference input[type='number']") as NodeListOf<HTMLInputElement>;;
        // if (prefInputs.length >= 2) {
        //     prefInputs[0].value = pref.mTargetWidth ?? 0;
        //     prefInputs[1].value = pref.mTargetHeight ?? 0;
        // }

        const rendererSelect = document.querySelector("#preference select") as HTMLSelectElement;
        if (rendererSelect && pref.mRenderer) {
            for (let i = 0; i < rendererSelect.options.length; i++) {
                if (rendererSelect.options[i].value === pref.mRenderer) {
                    rendererSelect.selectedIndex = i;
                    break;
                }
            }
        }
    }

    // Include 항목 체크 상태 세팅
    let inc = gProjJSON.includes;
    if (inc) {
        for (const [key, val] of Object.entries(inc)) {
            const el = document.getElementById(key + "_chk") as HTMLInputElement;
            if (el) el.checked = !!val;
        }
    }


    gManifest = JSON.parse(await CWebView.Call("LoadManifest", {
        projectPath: gAppJSON.projectPath,
        //projectName: gAppJSON.projectName,
    }));

    //CAlert.Info(JSON.stringify(gManifest));
    
	CUtil.IDValue("short_name_txt", gManifest.short_name ?? "");
	CUtil.IDValue("name_txt", gManifest.name ?? "");
	CUtil.IDValue("start_url_txt", gManifest.start_url ?? "");
	CUtil.IDValue("scope_txt", gManifest.scope ?? ".");
	CUtil.IDValue("id_txt", gManifest.id ?? "");
	CUtil.IDValue("description_txt", gManifest.description ?? "");

	CUtil.IDValue("orientation_sel", gManifest.orientation ?? "any");
	CUtil.IDValue("display_sel", gManifest.display ?? "fullscreen");

	CUtil.IDValue("background_color_pick", gManifest.background_color ?? "#ffffff");
	CUtil.IDValue("theme_color_pick", gManifest.theme_color ?? "#000000");

	// 배열 처리
	if (Array.isArray(gManifest.icons)) {
		CreateArrayItemInput("icons", gManifest.icons, "icons");
	}

    gServiceWorker = JSON.parse(await CWebView.Call("LoadServiceWorker", {
        projectPath: gAppJSON.projectPath,
    }));
    
    //CAlert.Info(JSON.stringify(gServiceWorker));
    CUtil.IDValue("cache_name_txt", gServiceWorker.CACHE_NAME);
    // MAX_CACHE_SIZE는 MB 단위로 변환해서 입력
    CUtil.IDValue("max_cache_size_num", Math.floor(gServiceWorker.MAX_CACHE_SIZE / (1024 * 1024)));

    // 체크박스는 boolean 값을 직접 반영
    CUtil.IDInput("log_chk").checked=gServiceWorker.LOG;
    CUtil.IDInput("api_cache_chk").checked=gServiceWorker.API_CACHE;
    
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
        modal.SetHeader("Info")
        modal.SetTitle(CModal.eTitle.Text);
        modal.SetBody("<div>VS Code Not Install.</div><button type='button' class='btn btn-primary' id='VSInstall_btn'>Install</button>");
        modal.SetZIndex(CModal.eSort.Top);
        //modal.SetSize(1024, 768);
        modal.Open(CModal.ePos.Center);
        document.getElementById("VSInstall_btn").addEventListener("click",()=>{
            CWebView.Call("URLRun","https://code.visualstudio.com/download");
        });

        modal.Close(1000 * 10);
    }
});



document.getElementById("selectProjectPath_btn").addEventListener("click", async function () {
    (CUtil.ID("Run_btn") as HTMLButtonElement).disabled =true;
    let list = await CWebView.Call("FolderSelectModal", { name: "", ext: ["folder"], mode: "load", absolute: false });
    (CUtil.ID("Run_btn") as HTMLButtonElement).disabled =false;
    //CAlert.Info(list);
    if (list == "") return;

    CUtil.IDInput("projectPath_txt").value = list;
    gAppJSON.projectPath = list;
    gProjJSON = JSON.parse(await CWebView.Call("LoadProjJSON", {
        projectPath: list,
        //projectName: gAppJSON.projectName,
    }));

    gManifest = JSON.parse(await CWebView.Call("LoadManifest", {
        projectPath: gAppJSON.projectPath,
        //projectName: gAppJSON.projectName,
    }));
    gServiceWorker = JSON.parse(await CWebView.Call("LoadServiceWorker", {
        projectPath: gAppJSON.projectPath,
    }));



    
     await CWebView.Call("NewPage", {
        appJSON: gAppJSON,
        projetJSON: gProjJSON,
        projectPath: list,
        manifast:gManifest,
        serviceWorker:gServiceWorker
    });


    Init();

});
document.getElementById("Run_btn").addEventListener("click", async function () {
    //let libPath_txt=CWebUtil.IDValue("libPath_txt");
    (CUtil.ID("Run_btn") as HTMLButtonElement).disabled =true;
    let projectPath_txt = CUtil.IDValue("projectPath_txt");
    let url_txt = CUtil.IDValue("url_txt");
    //let projectName_txt = CWebUtil.IDValue("projectName_txt");

    let server_sel = CUtil.IDValue("server_sel")

    if (server_sel == "local") url_txt = "";

    //CAlert.Info(JSON.stringify(gServiceWorker));
    if(await CWebView.Call("NewPage", {
        appJSON: gAppJSON,
        projetJSON: gProjJSON,
        projectPath: projectPath_txt,
        manifast:gManifest,
        serviceWorker:gServiceWorker
    })!="") 
    {
        (CUtil.ID("Run_btn") as HTMLButtonElement).disabled =false;
        return;
    }
    (CUtil.ID("Run_btn") as HTMLButtonElement).disabled =false;
    






    if (await CWebView.Call("PageRun")) {

    }
});




function CreateArrayItemInput(fieldId: string, dataList: Array<any>, label: string) {
	const listEl = document.getElementById(`${fieldId}_list`);
	if (!listEl) return;
	listEl.innerHTML = ''; // 초기화

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
			dataList.splice(index, 1);              // 배열에서 제거
			CreateArrayItemInput(fieldId, dataList, label); // 재렌더링
			//if (fieldId === "icons") updateManifest();       // 반영 필요시 갱신
		};

		item.appendChild(text);
		item.appendChild(delBtn);
		listEl.appendChild(item);
	});
}

document.getElementById("iconsAdd_btn").addEventListener("click", async function () {
    let list = await CWebView.Call("FolderSelectModal", { name: "", ext: ["png","jpg"], mode: "load", absolute: false });
    if(list=="")    return;

    list=CString.ReplaceAll(list,gAppJSON.projectPath+"/","");
    //CAlert.Info(list);
    if(gManifest.icons.includes(list))  return;

    let ext=CString.ExtCut(list);
    let iconSize=await CWebView.Call("ICONSize",list);
    gManifest.icons.push({"src":list,"type":"image/"+ext.ext,"sizes":iconSize});
    CreateArrayItemInput("icons", gManifest.icons, "icons");
});