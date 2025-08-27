import { CAlert } from "../basic/CAlert.js";
import { CClass } from "../basic/CClass.js";
import { CDomFactory } from "../basic/CDOMFactory.js";
import { CEvent } from "../basic/CEvent.js";
import { CModalFlex } from "../util/CModalUtil.js";
import { CPointer } from "../basic/CObject.js";
import { CUniqueID } from "../basic/CUniqueID.js";
import { CUtil } from "../basic/CUtil.js";
import { CUtilObj } from "../basic/CUtilObj.js";
import { CAtelier } from "../canvas/CAtelier.js";
import { CColor } from "../canvas/component/CColor.js";
import { CPaintHTML } from "../canvas/component/paint/CPaint2D.js";
import { CPaintTrail } from "../canvas/component/paint/CPaintTrail.js";
import { CRPAuto, CRPMgr } from "../canvas/CRPMgr.js";
import { CSubject } from "../canvas/subject/CSubject.js";
import { CSurface } from "../canvas/subject/CSurface.js";
import { CMath } from "../geometry/CMath.js";
import { CVec2 } from "../geometry/CVec2.js";
import { CVec3 } from "../geometry/CVec3.js";
import { CRenderPass } from "../render/CRenderPass.js";


import { CShader, CShaderList } from "../render/CShader.js";
import { CShaderAttr } from "../render/CShaderAttr.js";
import { CTexture } from "../render/CTexture.js";
import { CCamCon2DFreeMove } from "../util/CCamCon.js";
import { CChecker } from "../util/CChecker.js";

var gModal: CModalFlex;
var gAtl: CAtelier;
var gRPMgr : CRPMgr;
var gShaderListArr=[];
var gShaderArr=[];
var gTexArr=[];
export function RPMgrTool(_rpMgr : CRPMgr) 
{
    gRPMgr=_rpMgr;
    gModal = new CModalFlex([0.7, 0.3], "RPModal");
    gModal.SetHeader("RPMgrTool");
    gModal.SetSize(1000, 800);
    gModal.Open();
    const maxHeight = "calc(100vh - 10px)"; // 필요 시 조정
    const leftPanel = gModal.FindFlex(0) as HTMLElement;
    const rightPanel = gModal.FindFlex(1) as HTMLElement;
    [leftPanel, rightPanel].forEach(panel => {
        panel.style.maxHeight = maxHeight;
        panel.style.overflowY = "auto";
    });
    let canvas = CDomFactory.DataToDom(`
        <div style="position: relative; width: 100%; height: 100%;">
        <canvas id="RPLeft_can"
                style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: block; z-index: 0;">
        </canvas>
        <div id="RPLeft_div"
             style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 1; pointer-events:none;">
        </div>
      </div>
    `);
    leftPanel.append(canvas);

    gModal.On(CEvent.eType.Close,()=>{
        if(gRPMgr.GetCanvas()!=null)
        {
            gRPMgr.GetCanvas().SetRPMgr(gRPMgr);
        }
    });
    gAtl = new CAtelier();
    gAtl.mPF.mIAuto = true;
    gAtl.Init([], "RPLeft_can", false).then(()=>{
        
        gAtl.Brush().GetCam2D().SetCamCon(new CCamCon2DFreeMove(gAtl.Frame().Input()));
        RPToolInit();
    });
    gAtl.NewCanvas("RPTool");
    gAtl.Canvas("RPTool").SetCameraKey("2D");
    
}
function RPToolResChk()
{
    gShaderListArr=[];
    gShaderArr=[];
    gTexArr=[""];
    if(gRPMgr.GetCanvas()!=null)
    {
        for(let key of gRPMgr.GetCanvas().GetFrame().Res().Keys())
        {
            let value=gRPMgr.GetCanvas().GetFrame().Res().Find(key);
            if(value instanceof CShaderList)
            {
                gShaderListArr.push(key);
            }
            else if(value instanceof CShader)
            {
                gShaderArr.push(key);
            }
            else if(value instanceof CTexture && value.IsFrameBuf())
            {
                gTexArr.push(key);
            }
        }
    }
    else
    {
        for(let [key,value] of gRPMgr.mTexMap)
        {
            gTexArr.push(key);
        }
        for(let value of gRPMgr.mSufArr)
        {
            gTexArr.push(value.GetTexKey());
        }
        //기본 쉐이더만 사용 된다.
        for(let key of gAtl.Frame().Res().Keys())
        {
            let value=gRPMgr.GetCanvas().GetFrame().Res().Find(key);
            if(value instanceof CShaderList)
            {
                gShaderListArr.push(key);
            }
            else if(value instanceof CShader)
            {
                gShaderArr.push(key);
            }
        }
    }
    
 
}
function RPToolRPEx(_rp : CRenderPass)
{
    _rp.EditFormEx=(_pointer : CPointer,_body : HTMLDivElement,_input : HTMLElement)=>{
        if(_pointer.member=="mShader")
        {
            let sList=[];
            sList.push(...gShaderListArr);
            sList.push(...gShaderArr);
            _body.append(CUtilObj.Select(_pointer,_input,sList,sList,true));
        }
        // else if(_pointer.member=="mRenderTarget")
        // {
        //     let sList=[];
        //     sList.push(...gTexArr);
        //     _body.append(CUtilObj.Select(_pointer,_input,sList,sList,false));
        // }
        // else if(_pointer.member=="mShaderAttr")
        // {
        //     for(let sa of _rp.mShaderAttr)
        //     {
        //         if(sa.mType==-2)
        //         {
                    
        //             sa.EditFormEx=(_pointer2 : CPointer,_body2 : HTMLDivElement,_input2 : HTMLElement)=>{
        //                 if(_pointer2.member=="mKey")
        //                 {
        //                     let sList=[];
        //                     sList.push(...gTexArr);
        //                     _body2.append(CUtilObj.Select(_pointer2,_input2,sList,sList,false));
        //                 }
                        
        //             };
        //         }
        //     }

        // }
    };
    _rp.EditChangeEx=(_pointer : CPointer,_child : boolean)=>{
        
        RPToolLeftInit();
    };
}


function RPInOutTexForm(_rp: CRenderPass,_reFun) : HTMLElement
{
    const hash = _rp.ObjHash(); 

    const texContainer = document.createElement('div');
    texContainer.className = 'mb-3';
    texContainer.innerHTML = `
        <div class="card mb-2">
            <div class="card-header">
                <h6 class="mb-0">InTex</h6>
            </div>
            <div class="card-body p-1">
                <button class="btn btn-primary btn-sm" id="add_intex_${hash}">[add]</button>
                <div id="intex_inputs_${hash}"></div>
            </div>
        </div>
        <div class="card mb-2">
            <div class="card-header">
                <h6 class="mb-0">OutTex</h6>
            </div>
            <div class="card-body p-1">
                <div class="mb-2">
                    <div class="d-flex gap-2 mb-2 align-items-center">
                        <input type="text" class="form-control form-control-sm" placeholder="datalist" list="outtex_datalist_${hash}" id="outtex_target_${hash}">
                        <datalist id="outtex_datalist_${hash}">
                            ${gTexArr.map(tex => `<option value="${tex}">`).join('')}
                        </datalist>
                    </div>
                    <div class="d-flex gap-2 align-items-center">
                        <input type="number" class="form-control form-control-sm" placeholder="number" style="width: 80px;" id="outtex_level_${hash}">
                        <input type="text" class="form-control form-control-sm" placeholder="0,1,2" id="outtex_use_${hash}">
                    </div>
                </div>
            </div>
        </div>
    `;
    
 
    // InTex 정보를 기반으로 초기 input 필드 생성
    for(let attr of _rp.mShaderAttr)
    {
        if(attr.mType==-2)
        {
            const inputsContainer = texContainer.querySelector(`#intex_inputs_${hash}`) as HTMLElement;
            const inputGroup = document.createElement('div');
            inputGroup.className = 'mb-2';
            
            // datalist ID 생성
            const datalistId = `intex_datalist_${hash}_${Date.now()}`;
            
            inputGroup.innerHTML = `
                <div class="d-flex gap-2 mb-2 align-items-center">
                    <input type="text" class="form-control form-control-sm" placeholder="datalist" list="${datalistId}" value="${attr.mKey || ''}">
                    <datalist id="${datalistId}">
                        ${gTexArr.map(tex => `<option value="${tex}">`).join('')}
                    </datalist>
                    <input type="number" class="form-control form-control-sm" placeholder="number" style="width: 80px;" value="${attr.mEach || 0}">
                    <button class="btn btn-danger btn-sm" style="min-width: 24px;">×</button>
                </div>
                <div class="d-flex gap-2 align-items-center">
                    <input type="text" class="form-control form-control-sm" placeholder="true,false" value="${attr.mData && attr.mData.length > 0 ? attr.mData.map(b => b.toString()).join(',') : ''}">
                </div>
            `;
            
            // 입력값 변경 시 mShaderAttr에 반영
            const textInput = inputGroup.querySelector('input[type="text"]') as HTMLInputElement;
            const numberInput = inputGroup.querySelector('input[type="number"]') as HTMLInputElement;
            const dataInput = inputGroup.querySelectorAll('input[type="text"]')[1] as HTMLInputElement; // 두 번째 text input
            
            textInput.addEventListener('input', () => {
                attr.mKey = textInput.value;
            });
            
            numberInput.addEventListener('input', () => {
                attr.mEach = parseFloat(numberInput.value) || 0;
            });
            
            dataInput.addEventListener('input', () => {
                const inputValue = dataInput.value.trim();
                if (inputValue) {
                    // 쉼표로 구분된 boolean 값들을 파싱
                    const boolValues = inputValue.split(',').map(s => s.trim().toLowerCase()).filter(s => s !== '');
                    attr.mData = boolValues.map(s => s === 'true');
                } else {
                    attr.mData = [];
                }
            });
            
            
            // 제거 버튼 이벤트
            const removeBtn = inputGroup.querySelector('.btn-danger') as HTMLButtonElement;
            removeBtn.addEventListener('click', () => {
                // mShaderAttr에서 해당 항목 제거
                const index = _rp.mShaderAttr.indexOf(attr);
                if (index > -1) {
                    _rp.mShaderAttr.splice(index, 1);
                }
                
                // UI 갱신
                _reFun();
            });
            
            inputsContainer.appendChild(inputGroup);
        }
    }
    
    // InTex add 버튼 이벤트
    const addInTexBtn = texContainer.querySelector(`#add_intex_${hash}`) as HTMLButtonElement;
            if (addInTexBtn) {
            addInTexBtn.addEventListener('click', () => {
                // mShaderAttr에 새로운 InTex 속성 추가
                const newAttr = new CShaderAttr(-2, ""); // InTex 타입은 -2
                newAttr.mData = []; // mData 초기화
                _rp.mShaderAttr.push(newAttr);
                
                _reFun();
            });
        }
    
    // 아웃 텍스처 정보 초기화
    const renderTargetInput = texContainer.querySelector(`#outtex_target_${hash}`) as HTMLInputElement;
    const renderTargetLevelInput = texContainer.querySelector(`#outtex_level_${hash}`) as HTMLInputElement;
    const renderTargetUseInput = texContainer.querySelector(`#outtex_use_${hash}`) as HTMLInputElement;
    
    if (renderTargetInput && renderTargetLevelInput && renderTargetUseInput) {
        // 기존 값으로 초기화
        renderTargetInput.value = _rp.mRenderTarget || '';
        renderTargetLevelInput.value = _rp.mRenderTargetLevel?.toString() || '0';
        // Set의 모든 값을 쉼표로 구분하여 표시
        const useValues = _rp.mRenderTargetUse && _rp.mRenderTargetUse.size > 0 ? 
            Array.from(_rp.mRenderTargetUse).join(',') : '';
        renderTargetUseInput.value = useValues;
        
        // 값 변경 이벤트 리스너 추가
        renderTargetInput.addEventListener('input', () => {
            _rp.mRenderTarget = renderTargetInput.value;
        });
        
        renderTargetLevelInput.addEventListener('input', () => {
            _rp.mRenderTargetLevel = parseInt(renderTargetLevelInput.value) || 0;
        });
        
        renderTargetUseInput.addEventListener('input', () => {
            const inputValue = renderTargetUseInput.value.trim();
            _rp.mRenderTargetUse.clear();
            
            if (inputValue) {
                // 쉼표로 구분된 숫자들을 파싱
                const numbers = inputValue.split(',').map(s => s.trim()).filter(s => s !== '');
                for (const numStr of numbers) {
                    const num = parseInt(numStr);
                    if (!isNaN(num)) {
                        _rp.mRenderTargetUse.add(num);
                    }
                }
            }
        });
    }
    return texContainer;
}
function RPToolRPAutoInit(_rp: CRPAuto) {
    const hash = _rp.ObjHash(); 
    const collapseId = `collapse_${hash}`;

    const html = CDomFactory.DataToDom(`
        <div class="card mb-2" id="cardRight_${hash}">
            <div class="card-header d-flex justify-content-between align-items-center"
                 style="cursor: pointer;"
                 data-bs-toggle="collapse"
                 data-bs-target="#${collapseId}"
                 aria-expanded="false"
                 aria-controls="${collapseId}">
                <div class="flex-grow-1" style="min-width: 0; overflow: hidden;">
                    <div class="fw-bold text-primary text-truncate">${hash}</div>
                    <div class="text-truncate">${_rp.mPriority}-${_rp.mShader}</div>
                </div>
                <button class="btn btn-sm btn-close ms-auto" style="pointer-events:auto; flex-shrink: 0; min-width: 24px;"></button>
            </div>
            <div class="collapse" id="${collapseId}">
                <div class="card-body p-1" id="${collapseId}_body"></div>
            </div>
        </div>
    `);

    // 바디 UI 구성
    const body = html.querySelector(`#${collapseId}_body`);
    if (body) {
        
        body.append(RPInOutTexForm(_rp,()=>{
            // UI 갱신을 위해 RPToolRPAutoInit 다시 호출
            const parent = gModal.FindFlex(1)?.querySelector("#tab-content") as HTMLElement;
            if (parent) {
                parent.innerHTML = ""; 
                RPToolRightRPTabInit(parent);
            }
        }));
        
        // 기존 _rp.EditInit(null) 추가
        body.append(_rp.EditInit(null));
    }

    // X 버튼 이벤트
    const closeBtn = html.querySelector(".btn-close") as HTMLElement;
    closeBtn.addEventListener("click", (e) => {
        e.stopPropagation(); // 트리거와 이벤트 충돌 방지
        // RP 제거 후 UI 갱신
        gRPMgr.RemoveRP(_rp); 
        const parent = gModal.FindFlex(1)?.querySelector("#tab-content") as HTMLElement;
        parent.innerHTML = ""; 
        RPToolRightRPTabInit(parent); // RPTab UI 갱신
    });

    RPToolRPEx(_rp);
    

    return html;
}

function RPToolTexInit(_tex: CTexture) {
    const hash = _tex.ObjHash();
    const collapseId = `collapse_${hash}`;

    const html = CDomFactory.DataToDom(`
        <div class="card mb-2" id="cardRight_${hash}">
            <div class="card-header d-flex justify-content-between align-items-center"
                 style="cursor: pointer;"
                 data-bs-toggle="collapse"
                 data-bs-target="#${collapseId}"
                 aria-expanded="false"
                 aria-controls="${collapseId}">
                <div class="flex-grow-1" style="min-width: 0; overflow: hidden;">
                    <input type="text" class="form-control form-control-sm mb-1" id="${collapseId}_key_input" value="${_tex.Key() || ""}" style="width:100%; max-width: 200px;" />
                </div>
                <button class="btn btn-sm btn-close ms-auto" style="pointer-events:auto; flex-shrink: 0; min-width: 24px;"></button>
            </div>
            <div class="collapse" id="${collapseId}">
                <div class="card-body" id="${collapseId}_body"></div>
            </div>
        </div>
    `);

    // 바디 구성
    const body = html.querySelector(`#${collapseId}_body`);
    if (body) {
        body.append(_tex.EditInit(null));
    }

    // Key 변경 이벤트
    const keyInput = html.querySelector(`#${collapseId}_key_input`) as HTMLInputElement;
    if (keyInput) {
        keyInput.addEventListener('change', () => {
            const newKey = keyInput.value.trim();
            if (newKey) {
                gRPMgr.RemoveTex(_tex.Key());
                _tex.SetKey(newKey);
                gRPMgr.PushTex(newKey, _tex);
            }
        });
    }

    // X 버튼 이벤트
    const closeBtn = html.querySelector(".btn-close") as HTMLElement;
    closeBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // 트리거와 충돌 방지
        gRPMgr.RemoveTex(_tex.Key());
        const parent = gModal.FindFlex(1)?.querySelector("#tab-content") as HTMLElement;
        parent.innerHTML = "";
        RPToolRightTexTabInit(parent); // Tex 탭 갱신
    });

    return html;
}
function RPToolSufInit(_suf: CSurface) {
    const hash = _suf.ObjHash();
    const collapseId = `collapse_${hash}`;

    const html = CDomFactory.DataToDom(`
        <div class="card mb-2" id="cardRight_${hash}">
            <div class="card-header d-flex justify-content-between align-items-center"
                 style="cursor: pointer;"
                 data-bs-toggle="collapse"
                 data-bs-target="#${collapseId}"
                 aria-expanded="false"
                 aria-controls="${collapseId}">
                <div class="flex-grow-1 fw-bold text-primary" style="min-width: 0; overflow: hidden; text-truncate;">${_suf.ObjHash()}</div>
                <button class="btn btn-sm btn-close ms-auto" style="pointer-events:auto; flex-shrink: 0; min-width: 24px;"></button>
            </div>
            <div class="collapse" id="${collapseId}">
                <div class="card-body p-1" id="${collapseId}_body"></div>
            </div>
        </div>
    `);

    // 바디 구성
    const body = html.querySelector(`#${collapseId}_body`);
    if (body) {
        // 서페이스에 인아웃텍스 추가
        body.append(RPInOutTexForm(_suf.mRenderPass, () => {
            // UI 갱신을 위해 RPToolRightSufTabInit 다시 호출
            const parent = gModal.FindFlex(1)?.querySelector("#tab-content") as HTMLElement;
            if (parent) {
                parent.innerHTML = ""; 
                RPToolRightSufTabInit(parent);
            }
        }));
        
        body.append(_suf.EditInit(null));
    }

    // X 버튼 이벤트
    const closeBtn = html.querySelector(".btn-close") as HTMLElement;
    closeBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // 트리거와 충돌 방지
        gRPMgr.RemoveSuf(_suf); // Suf 제거
        const parent = gModal.FindFlex(1)?.querySelector("#tab-content") as HTMLElement;
        parent.innerHTML = "";
        RPToolRightSufTabInit(parent); // Suf 탭 갱신
    });

    RPToolRPEx(_suf.GetRP());
    _suf.EditChangeEx=()=>{
        const parent = gModal.FindFlex(1)?.querySelector("#tab-content") as HTMLElement;
        parent.innerHTML = "";
        RPToolRightSufTabInit(parent); // Suf 탭 갱신
    };

    return html;
}

function RPToolRightRPTabInit(container: HTMLElement) 
{
    RPToolResChk();
    RPToolLeftInit();
    // RPAuto 추가 버튼
    const addHTML = CDomFactory.DataToDom(`
        <div class="mb-3">
            <button id="btn_add_rp" class="btn btn-primary">RPAuto Add</button>
        </div>
    `);
    container.appendChild(addHTML);

    const addBtn = addHTML.querySelector("#btn_add_rp") as HTMLButtonElement;
    addBtn.onclick = () => {
        container.innerHTML = "";
        const newRP = new CRPAuto();
        gRPMgr.PushRP(newRP);
        RPToolRightRPTabInit(container); // 갱신
    };

    gRPMgr.mRPArr.forEach((rp) => {
        
        container.appendChild(RPToolRPAutoInit(rp));
    });
}
function RPToolRightTexTabInit(container: HTMLElement)
{
    RPToolResChk();
    // RPAuto 추가 버튼
    const addHTML = CDomFactory.DataToDom(`
        <div class="mb-3">
            <button id="btn_add_tex" class="btn btn-primary">RenderTarget Add</button>
        </div>
    `);
    container.appendChild(addHTML);

    const addBtn = addHTML.querySelector("#btn_add_tex") as HTMLButtonElement;
    addBtn.onclick = () => {
        container.innerHTML = "";
        const newTex = new CTexture();
        newTex.SetKey(CUniqueID.Get());
        gRPMgr.PushTex(newTex.Key(),newTex);
        
        RPToolRightTexTabInit(container); // 갱신
    };

    gRPMgr.mTexMap.forEach((tex) => {
        container.appendChild(RPToolTexInit(tex));
    });
}
function RPToolRightSufTabInit(container: HTMLElement) 
{
    RPToolLeftInit();
    // Surface 추가 UI
    const addHTML = CDomFactory.DataToDom(`
        <div class="mb-3 d-flex align-items-center gap-2">
            <select id="suf_select" class="form-select form-select-sm"></select>
            <button id="btn_add_suf" class="btn btn-primary btn-sm">Add Surface</button>
        </div>
    `);
    container.appendChild(addHTML);

    // 상속 클래스 목록 가져오기
    let ext = CClass.ExtendsList(CSurface); // ["MySurfaceClass1", "MySurfaceClass2"...]
    const select = addHTML.querySelector("#suf_select") as HTMLSelectElement;
    ext.forEach(cls => {
        const option = document.createElement("option");
        option.value = cls.constructor.name;
        option.textContent = cls.constructor.name;
        select.appendChild(option);
    });

    // Add 버튼 이벤트
    const addBtn = addHTML.querySelector("#btn_add_suf") as HTMLButtonElement;
    addBtn.onclick = () => {
        container.innerHTML = "";
        const selectedClass = select.value;
        if (selectedClass) {
            const newSuf = CClass.New(selectedClass); // 새로운 인스턴스 생성
            gRPMgr.PushSuf(newSuf); // RPMgr에 추가
        }
        RPToolRightSufTabInit(container); // 갱신
    };

    // 현재 등록된 Suf들 표시
    gRPMgr.mSufArr.forEach((suf) => {
        // 필요하다면 개별 Suf의 UI 생성
         container.appendChild(RPToolSufInit(suf)); 
    });
}
function RPToolInit()
{
    RPToolLeftInit();
    RPToolRightInit();
}
function RPToolRightInit() {
    const rightPanel = gModal.FindFlex(1) as HTMLElement;
    rightPanel.innerHTML = "";

    const tabs = CDomFactory.DataToDom(`
        <ul class="nav nav-tabs mb-2" id="rpTabMenu">
            <li class="nav-item"><a class="nav-link active" id="tab-rp" href="#">RP</a></li>
            <li class="nav-item"><a class="nav-link" id="tab-suf" href="#">Suf</a></li>
            <li class="nav-item"><a class="nav-link" id="tab-tex" href="#">Tex</a></li>
        </ul>
        <div id="tab-content" class="tab-content"></div>
    `);

    rightPanel.appendChild(tabs);
    const contentDiv = rightPanel.querySelector("#tab-content") as HTMLDivElement;

    const switchTab = (target: "rp" | "suf" | "tex") => {
        ["rp", "suf", "tex"].forEach(id => {
            const tab = document.getElementById(`tab-${id}`);
            if (tab) tab.classList.toggle("active", id === target);
        });


        

        contentDiv.innerHTML = "";
        if (target === "rp") RPToolRightRPTabInit(contentDiv);
        if (target === "suf") RPToolRightSufTabInit(contentDiv);
        if (target === "tex") RPToolRightTexTabInit(contentDiv);
    };

    ["rp", "suf", "tex"].forEach(id => {
        const tab = document.getElementById(`tab-${id}`);
        if (tab) tab.addEventListener("click", e => {
            e.preventDefault();
            switchTab(id as any);
        });
    });

    switchTab("rp"); // 기본 RP 탭 활성화
}
//두번 들어오는 경우때문. 위에서 처리해야하는데 여기서 임시 처리
var gLeftInit=false;
async function RPToolLeftInit() 
{
    if(gLeftInit==true) return;
    gLeftInit=true;
    gAtl.Canvas("RPTool").Clear();
    const leftPanel = CUtil.ID("RPLeft_div");
    const marginX = 50;
    const marginY = 50;
    let rpArr: Array<{ key: string; value: CRenderPass }> = [];



    // for (let i=0;i<gTexArr.length;++i) 
    // {
    //     let texKey=gTexArr[i];
    //     const simpleHtml = `
    //         <div class="card mb-2" id="cardLeft_tex_${texKey}">
    //             <div class="card-header fw-bold" style="pointer-events:auto; cursor:pointer;">
    //                 <span style="color: green;">CTexture</span> : 
    //             </div>
    //             <div class="card-body p-2 small text-muted">
    //                 ${texKey}
    //             </div>
    //         </div>
    //     `;
        

    //     let sub = gAtl.Canvas("RPTool").Push(new CSubject());
    //     let html = CDomFactory.DataToDom(simpleHtml);
    //     html.style.pointerEvents = "auto"; // 클릭 가능하게 설정
    //     html.style.cursor = "pointer";     // 마우스 커서 변경
    //     let pt=sub.PushComp(new CPaintHTML(html, null, leftPanel));
    //     pt.SetSize(new CVec2(200,100));
        
    //     sub.SetPos(new CVec3(-100-marginX, -i*(100+marginY), 0));

    //     html.setAttribute('draggable', 'true');
    //     html.addEventListener('dragstart', (ev) => {
    //         ev.dataTransfer?.setData('sourceKey', texKey); // 오른쪽 카드의 key/hash
    //     });
    // }
    for (let rp of gRPMgr.mRPArr) {
        rpArr.push({ key: rp.ObjHash(), value: rp });
    }
    for (let suf of gRPMgr.mSufArr) {
        rpArr.push({ key: suf.ObjHash(), value: suf.GetRP() });
    }

    // ✅ 우선순위 오름차순 정렬
    rpArr.sort((a, b) => a.value.mPriority - b.value.mPriority);

    let rp2Arr: Array<Array<{ key: string; value: CRenderPass }>> = [];
    
    // rp2Arr 구성 - 의존성에 따른 계층적 배열 생성
    for (let { key, value } of rpArr) {
        // in 데이터 추출 (cardBodyTop에서)
        let inDependencies: string[] = [];
        for (let sa of value.mShaderAttr) {
            if (sa.mType == -2) {
                // sa.mKey가 in 데이터 (참조하는 대상)
                inDependencies.push(sa.mKey);
            }
        }
        
        // out 데이터 추출 (cardBodyBottom에서)
        let outData = value.mRenderTarget;
        
        // 의존성이 있는지 확인
        if (inDependencies.length > 0) {
            // 의존성이 있는 경우, 참조하는 배열 다음에 배치
            let maxLevel = -1;
            for (let inDep of inDependencies) {
                // 참조하는 대상이 이미 rp2Arr에 있는지 확인
                // inDep은 텍스처 이름, item.value.mRenderTarget과 비교해야 함
                for (let level = 0; level < rp2Arr.length; level++) {
                    if (rp2Arr[level].some(item => item.value.mRenderTarget === inDep)) {
                        maxLevel = Math.max(maxLevel, level);
                    }
                }
            }
            
            // 참조하는 배열 다음 레벨에 배치
            let targetLevel = maxLevel + 1;
            if (!rp2Arr[targetLevel]) {
                rp2Arr[targetLevel] = [];
            }
            rp2Arr[targetLevel].push({ key, value });
        } else {
            // 의존성이 없는 경우 0번 배열에 배치
            if (!rp2Arr[0]) {
                rp2Arr[0] = [];
            }
            rp2Arr[0].push({ key, value });
        }
    }
    
    // 카드 생성
    for (let { key, value } of rpArr) 
    {
        let cardBodyTop = 'In : ';
        let cardBodyCenter = '';
        let cardBodyBottom = 'Out : ';
        if (value.mDepthTest != null) cardBodyCenter += `<div>DepthTest: ${value.mDepthTest}</div>`;
        if (value.mDepthWrite != null) cardBodyCenter += `<div>DepthWrite: ${value.mDepthWrite}</div>`;
        if (value.mAlpha != null) cardBodyCenter += `<div>Alpha: ${value.mAlpha}</div>`;
        if (value.mCullFace != null) cardBodyCenter += `<div>CullFace: ${value.mCullFace}</div>`;
        if (value.mCamera != null) cardBodyCenter += `<div>Camera: ${value.mCamera}</div>`;
        if (value.mCullFrustum != true) cardBodyCenter += `<div>CullFrustum: ${value.mCullFrustum}</div>`;
        if (value.mClearDepth != null) cardBodyCenter += `<div>ClearDepth: ${value.mClearDepth}</div>`;
        if (value.mClearColor != null) cardBodyCenter += `<div>ClearColor: ${value.mClearColor}</div>`;
        if (value.mBlitType != 0) cardBodyCenter += `<div>BlitType: ${value.mBlitType}</div>`;
        if (value.mLine != null) cardBodyCenter += `<div>Line: ${value.mLine}</div>`;
        if (value.mTag !== '') cardBodyCenter += `<div>Tag: ${value.mTag}</div>`;
        for (let sa of value.mShaderAttr) 
        {
            if(sa.mType==-2)
            {
                cardBodyTop+=sa.mKey+" Off-"+sa.mEach+"<br>";
            }
            else
                cardBodyCenter += `<div>${sa.ToLog()}</div>`;
        }

        

        if(value.mRenderTarget!="")
        {
            cardBodyBottom+=value.mRenderTarget+" ";
            for(let use of value.mRenderTargetUse)
            {
                cardBodyBottom+=use+" ";
            }
            cardBodyBottom+="Levle-"+value.mRenderTargetLevel;
        }
        
        
        let header = "";
        if (gRPMgr.mRPArr.some(rp => rp.ObjHash() === value.ObjHash())) {
            header = `
               
                    <span style="color: blue;">CAutoRP</span> : ${value.mPriority}<br>${key}
              
            `;
        } else {
            header = `
                
                    <span style="color: red;">CSurface</span> : ${value.mPriority}<br>${key}
                
            `;
        }
        

        let cardHtml = `
            <div class="card mb-2" id="cardLeft_${key}">
                <div class="card-header fw-bold"
                    data-key="${key}"
                    data-type="${gRPMgr.mRPArr.some(rp => rp.ObjHash() === value.ObjHash()) ? "rp" : "suf"}"
                
                >${header}</div>
                <div class="card-body p-2">
                    <div class="card-body-top">
                        ${cardBodyTop || ""}
                    </div>
                    <div class="card-body-center border-top pt-2 mt-2">
                        ${cardBodyCenter || ""}
                    </div>
                    <div class="card-body-bottom border-top pt-2 mt-2 text-muted small">
                        ${cardBodyBottom || ""}
                    </div>
                </div>
            </div>
        `;
        let sub = gAtl.Canvas("RPTool").Push(new CSubject());
        sub.SetKey(key);
        let html = CDomFactory.DataToDom(cardHtml);
        html.style.pointerEvents = "auto"; // 클릭 가능하게 설정
        html.style.cursor = "pointer";     // 마우스 커서 변경
        sub.PushComp(new CPaintHTML(html, null, leftPanel));
        sub.SetPos(new CVec3(0, 0, 0));


        
    }
    
    // 레이아웃 계산 - rp2Arr를 사용한 2차원 배열 레이아웃
    let currentX = 0;
    let columnMaxWidth = 0;
    
    for (let level = 0; level < rp2Arr.length; level++) {
        let currentY = 0;
        let levelMaxWidth = 0;
        
        for (let { key, value } of rp2Arr[level]) {
            let sub = gAtl.Canvas("RPTool").Find(key);
            let pt = sub.FindComp(CPaintHTML);
            if(pt==null)
                {
                    CAlert.E(key+"error");
                    gAtl.Canvas("RPTool").Find(key);
                }    
            await CChecker.Exe(
                async () => (pt.mAttach ? false : true),1
            );

            let size = new CVec2();
            let html = pt.GetElement();
            size.x = html.clientWidth+10 || 150;
            size.y = html.clientHeight+10 || 100;
            pt.SetSize(size);
            pt.SetPivot(new CVec3(1,-1,1));
            
            // 같은 레벨 내에서는 세로로 정렬
            sub.SetPos(new CVec3(currentX, -currentY, 0));
            currentY += size.y + marginY;
            levelMaxWidth = Math.max(levelMaxWidth, size.x);

            // 카드 헤더 클릭 이벤트
            let headerDiv = html.querySelector(".card-header") as HTMLElement;
            headerDiv.addEventListener("click", () => {
                let type = headerDiv.getAttribute("data-type"); // "rp" or "suf"
                let id = headerDiv.getAttribute("data-key");    // key

                // 현재 활성화된 탭 검사
                let activeTab = document.querySelector(".nav-tabs .nav-link.active") as HTMLElement;
                let targetTab = document.getElementById(type === "rp" ? "tab-rp" : "tab-suf") as HTMLElement;

                if (targetTab && targetTab !== activeTab) {
                    targetTab.click();
                }

                setTimeout(() => {
                    let cardElem = document.getElementById(`cardRight_${id}`) as HTMLElement;

                    if (cardElem) {
                        // 트리거 찾기
                        const trigger = cardElem.querySelector('[data-bs-toggle="collapse"]') as HTMLElement;
                        // 트리거가 있는 경우
                        if (trigger) {
                            let isExpanded = trigger.getAttribute('aria-expanded') === 'true';
                            if (!isExpanded) {
                                trigger.click();
                            }
                        }
                        cardElem.scrollIntoView({ behavior: "smooth", block: "center" });
                    }
                }, 100);
            });
        }
        
        // 다음 레벨로 넘어갈 때는 가로로 이동
        currentX += levelMaxWidth + marginX;
        columnMaxWidth = Math.max(columnMaxWidth, levelMaxWidth);
    }
    gLeftInit=false;
    RPToolLeftLine();
   
}
// function InOutExport(_rp : CRenderPass)
// {
//     let inout={in:[],out:""};

// }
function RPToolLeftLine()
{
    let rpArr: Array<{ key: string; value: CRenderPass }> = [];
    for (let rp of gRPMgr.mRPArr) 
    {
        rpArr.push({ key: rp.ObjHash(), value: rp });
    }
    for (let suf of gRPMgr.mSufArr) {
        rpArr.push({ key: suf.ObjHash(), value: suf.GetRP() });
    }   
    let FindTex=(_find : string)=>{
        for (let { key, value } of rpArr) 
        {
            if(value.mRenderTarget==_find)
                return key;
        }
        return null;
    };


    for (let { key, value } of rpArr) 
    {
        let color=new CColor(Math.random(),Math.random(),Math.random(),CColor.eModel.RGBAdd); 
        for (let sa of value.mShaderAttr) 
        {
            if(sa.mType==-2)
            {
                let texObj=FindTex(sa.mKey);
                let org=gAtl.Canvas("RPTool").Find(key);
                let tar=gAtl.Canvas("RPTool").Find(texObj);
                if(org!=null && tar!=null)
                {
                
                    const line = gAtl.Canvas("RPTool").Push(new CSubject());
                    let trail=line.PushComp(new CPaintTrail(gAtl.Frame().Pal().GetBlackTex()));
                    trail.SetLen(5);
                    
                    trail.SetLastHide(false);
                    let orgSize=org.FindComp(CPaintHTML).mOrgSize;
                    let tarSize=tar.FindComp(CPaintHTML).mOrgSize;
                    
                    trail.SetStaticPosList([CMath.V3AddV3(org.GetPos(),new CVec3(orgSize.x*0.5,-orgSize.y*0.5)),
                        CMath.V3AddV3(tar.GetPos(),new CVec3(tarSize.x*0.5,-tarSize.y*0.5))]);
                    trail.SetColorModel(color);
                }
            }
            
        }
    }
}