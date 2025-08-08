import { CDomFactory } from "../basic/CDOMFactory.js";
import { CEvent } from "../basic/CEvent.js";
import { CUtil } from "../basic/CUtil.js";
import { CAtelier } from "../canvas/CAtelier.js";
import { CSubject } from "../canvas/subject/CSubject.js";
import { CPaint2D, CPaintHTML } from "../canvas/component/paint/CPaint2D.js";
import { CPaintTrail } from "../canvas/component/paint/CPaintTrail.js";
import { CCamCon2DFreeMove } from "../util/CCamCon.js";
import { CModalFlex } from "../util/CModalUtil.js";
import { CScript } from "../util/CScript.js";
import { CUtilWeb } from "../util/CUtilWeb.js";
import { CChecker } from "../util/CChecker.js";
import { CVec2 } from "../geometry/CVec2.js";
import { CVec3 } from "../geometry/CVec3.js";
import { CColor } from "../canvas/component/CColor.js";

var gModal: CModalFlex;
var gAtl: CAtelier;
var gSC : CScript;
var gUpdateEvent: CEvent;
var gEditer;
var gActiveBorder: CSubject | null = null; // 활성 함수 테두리
var gFunctionCards: { sub: CSubject, pt: CPaintHTML, el: HTMLElement, func: any }[] = []; // 함수 카드들 저장
export function ScriptTool(_sc: CScript) 
{
    gSC = _sc;
    
    gModal = new CModalFlex([0.6, 0.4], "ScriptToolModal");
    gModal.mResize=true;
    gModal.SetHeader("ScriptTool");
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
    <canvas id="ScriptToolLeft_can"
            style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: block; z-index: 0;">
    </canvas>
    <div id="ScriptToolLeft_div"
         style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 1; pointer-events:none;">
    </div>
  </div>
    `);
    leftPanel.append(canvas);
    gAtl = new CAtelier();
    gAtl.mPF.mIAuto = true;
    gAtl.Init([], "ScriptToolLeft_can", false).then(()=>{
        ScriptToolInit();    
        gAtl.Brush().GetCam2D().SetCamCon(new CCamCon2DFreeMove(gAtl.Frame().Input()));
    });
    gAtl.NewCanvas("ScriptTool");
    gAtl.Canvas("ScriptTool").SetCameraKey("2D");
    
    gUpdateEvent = new CEvent(ScriptToolUpdate);
    gAtl.Frame().PushEvent(CEvent.eType.Update, gUpdateEvent);
    
    CUtilWeb.MonacoEditer(rightPanel,gSC.mSource,"typescript","vs-dark",(_editer)=>{
        gEditer=_editer;
        
        // 블러 이벤트 추가 (포커스가 사라질 때)
        gEditer.onDidBlurEditorWidget(() => {
            // 에디팅이 끝났을 때 처리
            gSC.mSource = gEditer.getModel().getValue();
            CScript.Remove(gSC.mKey);
            CUtilWeb.TSImport(gSC.mSource,true);
            
            // 왼쪽 탭도 갱신
            ScriptToolInit();
        });
    });
    gModal.On(CEvent.eType.Close,()=>{
        gSC.mSource=gEditer.getModel().getValue();
        CScript.Remove(gSC.mKey);
    });
    
}
var gLastActive="";
var gActiveElement: HTMLElement | null = null; // 현재 활성 요소

function ScriptToolUpdate(_delay) {
    // 활성 함수가 변경되었는지 확인
    if (gSC && gAtl && gLastActive != gSC.mActiveFun) {
        // 이전 활성 요소의 테두리 제거
        if (gActiveElement) {
            gActiveElement.classList.remove('border-danger', 'border-3');
            gActiveElement.style.border = '';
            gActiveElement = null;
        }
        
        // 현재 활성 함수 찾기
        let acSub = gAtl.Canvas("ScriptTool").Find(gSC.mActiveFun);
        if (acSub) {
            let pt = acSub.FindComp(CPaintHTML);
            if (pt) {
                const element = pt.GetElement();
                if (element) {
                    // 빨간색 테두리 클래스 추가
                    element.classList.add('border-danger', 'border-3');
                    
                    gActiveElement = element;
                }
            }
        }
        
        gLastActive = gSC.mActiveFun;
    }
}
function ScriptToolInit() {
    gLastActive="";
    // 스크립트 구조 추출
    const scriptStructure = ExtractScriptStructure(gSC.mSource);    

    
    // 왼쪽 탭에 함수 구조 시각화
    ScriptToolLeftInit(scriptStructure);
}

function ScriptToolLeftInit(scriptStructure: any[]) {
    const leftPanel = CUtil.ID("ScriptToolLeft_div");
    leftPanel.innerHTML = "";
    

    gAtl.Canvas("ScriptTool").Clear();
    
    // 배경 생성
    let bgSub = gAtl.Canvas("ScriptTool").Push(new CSubject());
    bgSub.PushComp(new CPaint2D(gAtl.Frame().Pal().GetNoneTex()));

    const functionCards: { sub: CSubject, pt: CPaintHTML, el: HTMLElement, func: any }[] = [];
    const centerX = gAtl.PF().mWidth / 2;
    const centerY = gAtl.PF().mHeight / 2;

    // 각 함수별로 카드 생성
    for (let func of scriptStructure) {
        const sub = gAtl.Canvas("ScriptTool").Push(new CSubject());
        sub.SetKey(func.function);
        const html = CreateFunctionCard(func);
        const pt = sub.PushComp(new CPaintHTML(html, null, leftPanel));
        const el = pt.GetElement();
        functionCards.push({ sub, pt, el, func });
    }

    // 사이즈 측정 및 위치 배치 (WorkTool.ts 방식 참고)
    setTimeout(async () => {
        for (let i = 0; i < functionCards.length; i++) {
            const card = functionCards[i];
            
            // CChecker를 사용해서 HTML이 완전히 렌더링될 때까지 대기
            await CChecker.Exe(async () => {
                if (card.pt.mAttach) return false;
                return true;
            }, 1);
            
            const w = card.el.clientWidth || 280;
            const h = card.el.clientHeight || 200;
            card.pt.SetSize(new CVec2(w, h));

            // 원형 배치 - 겹치지 않는 최소 거리로 계산
            const angleStep = (2 * Math.PI) / functionCards.length;
            const angle = angleStep * i;
            
            // 카드 크기와 여백을 고려한 최소 반지름 계산
            const cardDiagonal = Math.sqrt(w * w + h * h);
            const minSpacing = cardDiagonal + 20; // 카드 대각선 + 여백
            const minRadius = minSpacing / (2 * Math.sin(angleStep / 2));
            
            // 최소 반지름과 기본 반지름 중 큰 값 사용
            const radius = Math.max(minRadius, 200);
            
            const x = centerX + radius * Math.cos(angle) - w / 2;
            const y = centerY + radius * Math.sin(angle) - h / 2;
            card.sub.SetPos(new CVec3(x, y, 0));
        }

        // 카메라 중앙 조정
        if (functionCards.length > 0) {
            let sumX = 0;
            let sumY = 0;
            for (let card of functionCards) {
                const pos = card.sub.GetPos();
                sumX += pos.x;
                sumY += pos.y;
            }
            const avgX = sumX / functionCards.length;
            const avgY = sumY / functionCards.length;
            const center = new CVec3(avgX, avgY, 0);
            gAtl.Brush().GetCam2D().EyeMoveAndViewCac(center);
        }

        // 함수 간 연결선 그리기
        DrawFunctionConnections(functionCards);
    }, 0);
}

function CreateFunctionCard(func: any): HTMLElement {
    // 조건문과 반환값을 매핑
    const conditionReturnPairs: string[] = [];
    
    // if 조건문과 해당하는 반환값 매핑
    for (let i = 0; i < func.if.length; i++) {
        const condition = func.if[i];
        const returnValue = func.return[i] || "null";
        conditionReturnPairs.push(`${condition} → ${returnValue}`);
    }
    
    // if 조건문에 포함되지 않은 반환값들 추가
    for (let i = func.if.length; i < func.return.length; i++) {
        const returnValue = func.return[i];
        if (returnValue !== "null") {
            conditionReturnPairs.push(`→ ${returnValue}`);
        }
    }
    
    const html = CDomFactory.DataToDom(`
        <div class="card shadow-sm" style="width: 280px;">
            <div class="card-header text-center py-3">
                <h6 class="mb-0 fw-bold">${func.function}</h6>
            </div>
            <div class="card-body p-3">
                <div>
                    <div class="mt-2">
                        ${conditionReturnPairs.length > 0 ? 
                            conditionReturnPairs.map((pair: string) => 
                                `<div class="badge bg-info text-white me-1 mb-1 fs-6">${pair}</div>`
                            ).join('') : 
                            '<span class="text-muted opacity-50">null</span>'
                        }
                    </div>
                </div>
            </div>
        </div>
    `);
    
    return html as HTMLElement;
}

function DrawFunctionConnections(functionCards: { sub: CSubject, pt: CPaintHTML, el: HTMLElement, func: any }[]) {
    // 함수 간 연결선 그리기
    for (let card of functionCards) {
        const fromPos = card.sub.GetPos();
        const fromSize = card.pt.GetSize();
        
        // 모든 반환값에 대해 연결선 그리기 (if 조건문과 관계없이)
        for (let i = 0; i < card.func.return.length; i++) {
            const returnValue = card.func.return[i];
            
            // null이 아닌 경우에만 연결선 그리기
            if (returnValue !== "null") {
                const targetCard = functionCards.find(c => c.func.function === returnValue);
                
                if (targetCard) {
                    const toPos = targetCard.sub.GetPos();
                    const toSize = targetCard.pt.GetSize();
                    
                    // 시작점과 끝점 계산 (선이 겹치지 않도록)
                    let startPos: CVec3;
                    let endPos: CVec3;
                    
                    // 같은 함수끼리 연결되는 경우 (순환)
                    if (card.func.function === returnValue) {
                        // 자기 자신으로의 연결은 상단에서 시작해서 하단으로
                        startPos = new CVec3(fromPos.x, fromPos.y + fromSize.y * 0.5, fromPos.z);
                        endPos = new CVec3(toPos.x, toPos.y - toSize.y * 0.3, toPos.z);
                    } else {
                        // 다른 함수로의 연결
                        // 시작점: 상단에서 시작
                        startPos = new CVec3(fromPos.x, fromPos.y + fromSize.y * 0.5, fromPos.z);
                        // 끝점: 하단으로 끝 (살짝 위로 조정)
                        endPos = new CVec3(toPos.x, toPos.y - toSize.y * 0.3, toPos.z);
                    }
                    
                    // 연결선 생성
                    const line = gAtl.Canvas("ScriptTool").Push(new CSubject());
                    const trail = line.PushComp(new CPaintTrail(gAtl.Frame().Pal().GetBlackTex()));
                    trail.SetLen(10);
                    trail.SetStaticPosList([startPos, endPos]);
                    trail.SetColorModel(new CColor(1, 0.5, 0, CColor.eModel.RGBAdd)); // 주황색
                }
            }
        }
    }
}

// if-return 구조 추출 (함수명 포함)
function ExtractIfReturnStructure(source: string): any[] {
    const results: any[] = [];
    const functionRegex = /export\s+function\s+(\w+)\s*\([^)]*\)\s*\{([^}]+(?:\{[^}]*\}[^}]*)*)\}/g;
    let match;
    
    while ((match = functionRegex.exec(source)) !== null) {
        const functionName = match[1];
        const functionBody = match[2];
        
        const ifConditions: string[] = [];
        const returnValues: string[] = [];
        
        // if 문과 return 문 추출
        const ifRegex = /if\s*\(([^)]+)\)\s*\{?\s*return\s+["']([^"']+)["']\s*;?\s*\}?/g;
        let ifMatch;
        
        while ((ifMatch = ifRegex.exec(functionBody)) !== null) {
            ifConditions.push(ifMatch[1].trim());
            returnValues.push(ifMatch[2]);
        }
        
        // 단순 return 문도 추출 (if가 없는 경우)
        const simpleReturnRegex = /return\s+["']([^"']+)["']\s*;?/g;
        let returnMatch;
        
        while ((returnMatch = simpleReturnRegex.exec(functionBody)) !== null) {
            // if 문에 포함되지 않은 return만 추가
            const returnValue = returnMatch[1];
            if (!returnValues.includes(returnValue)) {
                returnValues.push(returnValue);
            }
        }
        
        // null 반환도 추출
        const nullReturnRegex = /return\s+null\s*;?/g;
        if (nullReturnRegex.test(functionBody) && !returnValues.includes("null")) {
            returnValues.push("null");
        }
        
        results.push({
            "function": functionName,
            "if": ifConditions,
            "return": returnValues
        });
    }
    
    return results;
}

// 전체 추출 함수
function ExtractScriptStructure(source: string) {
    const ifReturnStructure = ExtractIfReturnStructure(source);
    
    // 함수명만 따로 추출
    const functionNames = ifReturnStructure.map(item => item.function);
    
    return ifReturnStructure;
}