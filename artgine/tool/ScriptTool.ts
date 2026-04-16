import { CDOM } from "../basic/CDOM.js";
import { CEvent } from "../basic/CEvent.js";
import { CModalFlex } from "../util/CModalUtil.js";
import { CScript } from "../util/CScript.js";
import { CUtilWeb } from "../util/CUtilWeb.js";

// ── 타입 정의 ────────────────────────────────────────────────
interface ReturnEdge {
    to:   string | null;   // 다음 함수명, null이면 대기
    cond: string | null;   // if 조건 원문, 없으면 null
}
interface FuncNode {
    name:  string;
    edges: ReturnEdge[];
}

// ── 전역 변수 ────────────────────────────────────────────────
var gModal:          CModalFlex;
var gSC:             CScript;
var gEditer:         any;
var gLastActive      = "";
var gUpdateInterval: number | null = null;

// SVG 팬/줌 상태
var gVP:       SVGGElement | null = null;
var gTx        = 0;
var gTy        = 0;
var gScale     = 1;
var gDragging  = false;
var gOx        = 0;
var gOy        = 0;

// ── 진입점 ───────────────────────────────────────────────────
export function ScriptTool(_sc: CScript)
{
    gSC = _sc;

    gModal = new CModalFlex([0.6, 0.4], "ScriptToolModal");
    gModal.mResize = true;
    gModal.SetHeader("ScriptTool");
    gModal.SetSize(1000, 800);
    gModal.Open();

    const leftPanel  = gModal.FindFlex(0) as HTMLElement;
    const rightPanel = gModal.FindFlex(1) as HTMLElement;

    // 오른쪽: 기존과 동일 (maxHeight + overflowY)
    rightPanel.style.maxHeight = "calc(100vh - 10px)";
    rightPanel.style.overflowY = "auto";

    // 왼쪽: SVG 컨테이너만. Canvas/CAtelier 불필요
    leftPanel.style.overflow  = "hidden";
    leftPanel.style.padding   = "0";
    leftPanel.style.maxHeight = "calc(100vh - 10px)";

    const container = document.createElement("div");
    container.id = "ScriptToolLeft_div";
    container.style.cssText = "width:100%;height:100%;min-height:400px;overflow:hidden;cursor:grab;user-select:none;position:relative;";
    leftPanel.appendChild(container);

    // Monaco 에디터 (기존과 동일)
    CUtilWeb.MonacoEditer(rightPanel, gSC.mSource, "typescript", "vs-dark", (_editer) => {
        gEditer = _editer;
        gEditer.onDidBlurEditorWidget(() => {
            gSC.mSource = gEditer.getModel().getValue();
            CScript.Remove(gSC.mKey);
            CUtilWeb.TSImport(gSC.mSource, true);
            ScriptToolInit();
        });
    });

    gModal.On(CEvent.eType.Close, () => {
        gSC.mSource = gEditer.getModel().getValue();
        CScript.Remove(gSC.mKey);
        // update 루프 정리
        if (gUpdateInterval !== null) {
            clearInterval(gUpdateInterval);
            gUpdateInterval = null;
        }
    });

    // mActiveFun 변경 감지 루프 (CAtelier.Frame 대신 setInterval)
    if (gUpdateInterval !== null) clearInterval(gUpdateInterval);
    gUpdateInterval = setInterval(ScriptToolUpdate, 100) as any;

    ScriptToolInit();
}

// ── 활성 함수 하이라이트 업데이트 ────────────────────────────
function ScriptToolUpdate()
{
    if (!gSC || gLastActive === gSC.mActiveFun) return;

    // 이전 노드 원복
    document.querySelectorAll<SVGGElement>(".st-fn-node").forEach(g => {
        const rect = g.querySelector("rect");
        const text = g.querySelector("text");
        if (rect) { rect.style.fill = "#E6F1FB"; rect.style.stroke = "#185FA5"; rect.style.strokeWidth = "0.5"; }
        if (text) text.style.fill = "#0C447C";
    });

    // 현재 활성 노드 빨간 테두리
    const activeG = document.getElementById(`st-fn-${gSC.mActiveFun}`);
    if (activeG) {
        const rect = activeG.querySelector("rect");
        const text = activeG.querySelector("text");
        if (rect) { rect.style.fill = "#FCEBEB"; rect.style.stroke = "#E24B4A"; rect.style.strokeWidth = "3"; }
        if (text) text.style.fill = "#A32D2D";
    }

    gLastActive = gSC.mActiveFun;
}

// ── 초기화 ───────────────────────────────────────────────────
function ScriptToolInit()
{
    gLastActive = "";
    const fns = ExtractScriptStructureAST(gSC.mSource);
    ScriptToolLeftInit(fns);
}

// ── SVG 그래프 렌더링 ─────────────────────────────────────────
function ScriptToolLeftInit(fns: FuncNode[])
{
    const container = CDOM.ID("ScriptToolLeft_div") as HTMLElement;
    container.innerHTML = "";
    if (fns.length === 0) return;

    // ── 노드 크기 계산 ────────────────────────────────────────
    const NW      = 240;   // 노드 너비
    const HDR_H   = 36;    // 헤더(함수명) 높이
    const ROW_H   = 26;    // 조건/반환 행 높이
    const MIN_H   = 52;    // 최소 높이

    // 각 함수의 노드 높이 (엣지 수에 따라 가변)
    const nodeH: Record<string, number> = {};
    for (const fn of fns)
        nodeH[fn.name] = Math.max(HDR_H + fn.edges.length * ROW_H, MIN_H);

    // ── 원형 레이아웃 ─────────────────────────────────────────
    const n       = fns.length;
    const maxH    = Math.max(...Object.values(nodeH));
    const diag    = Math.sqrt(NW * NW + maxH * maxH);
    const minR    = n <= 1 ? 0 : (diag + 60) / (2 * Math.sin(Math.PI / n));
    const radius  = Math.max(minR, 180);

    const pos: Record<string, { x: number; y: number }> = {};
    fns.forEach((f, i) => {
        const angle = -Math.PI / 2 + (2 * Math.PI / n) * i;
        pos[f.name] = { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
    });

    // ── SVG 생성 ─────────────────────────────────────────────
    const W = container.clientWidth  || 600;
    const H = container.clientHeight || 400;

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.style.cssText = "display:block;width:100%;height:100%;";
    svg.innerHTML = `<defs>
        <marker id="st-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M2 1L8 5L2 9" fill="none" stroke="#185FA5" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </marker>
        <marker id="st-arrc" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M2 1L8 5L2 9" fill="none" stroke="#BA7517" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </marker>
    </defs>`;

    const vp = document.createElementNS("http://www.w3.org/2000/svg", "g");
    vp.id = "st-vp";
    svg.appendChild(vp);
    gVP = vp;

    // ── 엣지 렌더 (노드보다 먼저 그려야 뒤에 깔림) ───────────
    for (const fn of fns) {
        const sp  = pos[fn.name];
        const nh  = nodeH[fn.name];

        fn.edges.forEach((e, rowIdx) => {
            if (!e.to) return;  // null 반환은 노드 안에 표시, 선 없음

            const isSelf = e.to === fn.name;
            const tp     = pos[e.to];
            const tnh    = nodeH[e.to];
            const isCond = !!e.cond;
            const color  = isCond ? "#BA7517" : "#185FA5";
            const marker = isCond ? "url(#st-arrc)" : "url(#st-arr)";

            // 출발 행의 y (노드 상단에서 헤더 + 행 중심)
            const rowY = sp.y - nh / 2 + HDR_H + rowIdx * ROW_H + ROW_H / 2;

            if (isSelf) {
                // 자기 루프: 바깥 방향으로 돌아오는 호
                const outLen = Math.sqrt(sp.x * sp.x + sp.y * sp.y) || 1;
                const odx = sp.x / outLen, ody = sp.y / outLen;
                // 노드 바깥 면 두 점 (좌/우)
                const lx = sp.x - NW / 2, rx = sp.x + NW / 2;
                const loopH = nh * 0.7;
                const cp1x = lx - 60, cp1y = rowY - loopH;
                const cp2x = rx + 60, cp2y = rowY - loopH;
                const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
                path.setAttribute("d", `M${lx},${rowY} C${cp1x},${cp1y} ${cp2x},${cp2y} ${rx},${rowY}`);
                path.setAttribute("fill", "none");
                path.setAttribute("stroke", color);
                path.setAttribute("stroke-width", "1.5");
                path.setAttribute("marker-end", marker);
                if (isCond) path.setAttribute("stroke-dasharray", "6 3");
                vp.appendChild(path);
                return;
            }

            // 출발 노드에서 target이 오른쪽이면 right side, 왼쪽이면 left side
            const goRight = tp.x > sp.x;
            const srcX    = goRight ? sp.x + NW / 2 : sp.x - NW / 2;
            const srcY    = rowY;
            // 도착 노드는 반대쪽 면 중앙
            const tgtX    = goRight ? tp.x - NW / 2 : tp.x + NW / 2;
            const tgtY    = tp.y;  // 도착 노드 중앙

            // S자 cubic bezier - 제어점을 수평으로
            const dist  = Math.abs(tgtX - srcX);
            const cpOff = Math.max(dist * 0.5, 80);
            const cp1x  = srcX + (goRight ?  cpOff : -cpOff);
            const cp2x  = tgtX + (goRight ? -cpOff :  cpOff);

            const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
            path.setAttribute("d",
                `M${srcX.toFixed(1)},${srcY.toFixed(1)} C${cp1x.toFixed(1)},${srcY.toFixed(1)} ${cp2x.toFixed(1)},${tgtY.toFixed(1)} ${tgtX.toFixed(1)},${tgtY.toFixed(1)}`
            );
            path.setAttribute("fill", "none");
            path.setAttribute("stroke", color);
            path.setAttribute("stroke-width", "1.5");
            path.setAttribute("marker-end", marker);
            if (isCond) path.setAttribute("stroke-dasharray", "6 3");
            vp.appendChild(path);
        });
    }

    // ── 노드 렌더 ─────────────────────────────────────────────
    for (const fn of fns) {
        const p       = pos[fn.name];
        const nh      = nodeH[fn.name];
        const isActive = fn.name === gSC?.mActiveFun;

        const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        g.setAttribute("id",    `st-fn-${fn.name}`);
        g.setAttribute("class", "st-fn-node");
        g.style.cursor = "pointer";

        // 노드 배경
        const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        bg.setAttribute("x",      String(p.x - NW / 2));
        bg.setAttribute("y",      String(p.y - nh / 2));
        bg.setAttribute("width",  String(NW));
        bg.setAttribute("height", String(nh));
        bg.setAttribute("rx",     "8");
        bg.style.fill        = isActive ? "#FCEBEB" : "#E6F1FB";
        bg.style.stroke      = isActive ? "#E24B4A" : "#185FA5";
        bg.style.strokeWidth = isActive ? "3" : "0.5";
        g.appendChild(bg);

        // 헤더(함수명)
        const hdrLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
        hdrLine.setAttribute("x1", String(p.x - NW / 2));
        hdrLine.setAttribute("y1", String(p.y - nh / 2 + HDR_H));
        hdrLine.setAttribute("x2", String(p.x + NW / 2));
        hdrLine.setAttribute("y2", String(p.y - nh / 2 + HDR_H));
        hdrLine.style.stroke      = isActive ? "#E24B4A" : "#185FA5";
        hdrLine.style.strokeWidth = "0.5";
        hdrLine.style.opacity     = "0.4";
        g.appendChild(hdrLine);

        const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
        label.setAttribute("x",                String(p.x));
        label.setAttribute("y",                String(p.y - nh / 2 + HDR_H / 2));
        label.setAttribute("text-anchor",       "middle");
        label.setAttribute("dominant-baseline", "central");
        label.style.cssText = `font-size:13px;font-weight:500;pointer-events:none;fill:${isActive ? "#A32D2D" : "#0C447C"};`;
        label.textContent = fn.name;
        g.appendChild(label);

        // 엣지 행 목록
        fn.edges.forEach((e, rowIdx) => {
            const rowTop = p.y - nh / 2 + HDR_H + rowIdx * ROW_H;
            const rowCY  = rowTop + ROW_H / 2;

            // 행 배경 (타입별 색상)
            // 조건부(if): 주황 계열 / 일반 전이: 파랑 계열 / null: 회색 계열
            const rowBg   = e.cond ? "#FFF3DC" : (e.to ? "#EAF3FB" : "#F5F5F5");
            const rowBgEl = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            rowBgEl.setAttribute("x",      String(p.x - NW / 2 + 1));
            rowBgEl.setAttribute("y",      String(rowTop));
            rowBgEl.setAttribute("width",  String(NW - 2));
            rowBgEl.setAttribute("height", String(ROW_H));
            rowBgEl.setAttribute("fill",   rowBg);
            // 마지막 행이면 하단 모서리 둥글게 (rx는 SVG에서 행 단위로 안 되므로 clip 대신 살짝만)
            g.appendChild(rowBgEl);

            // 행 왼쪽 액센트 바 (타입 식별용)
            const accentColor = e.cond ? "#BA7517" : (e.to ? "#185FA5" : "#AAAAAA");
            const accent = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            accent.setAttribute("x",      String(p.x - NW / 2 + 1));
            accent.setAttribute("y",      String(rowTop));
            accent.setAttribute("width",  "3");
            accent.setAttribute("height", String(ROW_H));
            accent.setAttribute("fill",   accentColor);
            g.appendChild(accent);

            // 행 텍스트
            const toLabel = e.to ?? "null";
            let rowText: string;
            if (e.cond) {
                const shortCond = e.cond.length > 20 ? e.cond.slice(0, 18) + "…" : e.cond;
                rowText = `if(${shortCond}) → ${toLabel}`;
            } else {
                rowText = `→ ${toLabel}`;
            }

            const rowColor = e.cond ? "#7A3C00" : (e.to ? "#0C447C" : "#666666");
            const rt = document.createElementNS("http://www.w3.org/2000/svg", "text");
            rt.setAttribute("x",                String(p.x + 4));  // 액센트 바 너비만큼 살짝 우측
            rt.setAttribute("y",                String(rowCY));
            rt.setAttribute("text-anchor",       "middle");
            rt.setAttribute("dominant-baseline", "central");
            rt.style.cssText = `font-size:10px;font-family:monospace;pointer-events:none;fill:${rowColor};`;
            if (e.cond) {
                const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
                title.textContent = e.cond;
                rt.appendChild(title);
            }
            rt.appendChild(document.createTextNode(rowText));
            g.appendChild(rt);

            // 출발 포트 점 (null 아닌 엣지만)
            if (e.to && e.to !== fn.name) {
                const tp = pos[e.to];
                const goRight = tp.x > p.x;
                const portX   = goRight ? p.x + NW / 2 : p.x - NW / 2;
                const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                dot.setAttribute("cx",   String(portX));
                dot.setAttribute("cy",   String(rowCY));
                dot.setAttribute("r",    "3");
                dot.setAttribute("fill", e.cond ? "#BA7517" : "#185FA5");
                g.appendChild(dot);
            }
        });

        vp.appendChild(g);
    }

    // ── 카메라 초기화 ─────────────────────────────────────────
    const margin = radius + NW / 2 + 80;
    gScale = Math.min(W / (margin * 2), H / (margin * 2), 1.2);
    gTx    = W / 2;
    gTy    = H / 2;
    vp.setAttribute("transform", `translate(${gTx},${gTy}) scale(${gScale})`);

    // ── 팬/줌 이벤트 ─────────────────────────────────────────
    container.onmousedown = (e) => { gDragging = true; gOx = e.clientX - gTx; gOy = e.clientY - gTy; };
    container.onmousemove = (e) => {
        if (!gDragging || !gVP) return;
        gTx = e.clientX - gOx; gTy = e.clientY - gOy;
        gVP.setAttribute("transform", `translate(${gTx},${gTy}) scale(${gScale})`);
    };
    container.onmouseup = container.onmouseleave = () => { gDragging = false; };
    container.onwheel = (e) => {
        e.preventDefault();
        gScale = Math.max(0.15, Math.min(5, gScale * (e.deltaY < 0 ? 1.12 : 0.9)));
        if (gVP) gVP.setAttribute("transform", `translate(${gTx},${gTy}) scale(${gScale})`);
    };

    container.appendChild(svg);
}

// ── AST 파싱 (ExtractIfReturnStructure 대체) ──────────────────
function ExtractScriptStructureAST(source: string): FuncNode[]
{
    const ts = window["ts"];

    // typescript.js가 아직 로드 안 된 경우 빈 배열 반환 후 재시도
    if (!ts?.createSourceFile) {
        setTimeout(() => ScriptToolInit(), 500);
        return [];
    }

    const sf  = ts.createSourceFile("s.ts", source, ts.ScriptTarget.ES2020, true);
    const fns: FuncNode[] = [];

    function getEdges(node: any, edges: ReturnEdge[], cond: string | null)
    {
        if (!node) return;
        const k = ts.SyntaxKind[node.kind];

        if (k === "ReturnStatement") {
            const a = node.expression;
            edges.push({
                to:   a?.kind === ts.SyntaxKind.StringLiteral ? a.text : null,
                cond: cond
            });
            return;
        }
        if (k === "Block") {
            node.statements.forEach((s: any) => getEdges(s, edges, cond));
            return;
        }
        if (k === "IfStatement") {
            // getStart(sf) : trivia(공백/줄바꿈) 제외한 실제 조건 시작 위치
            const start    = typeof node.expression.getStart === "function"
                           ? node.expression.getStart(sf)
                           : node.expression.pos;
            const condText = source.slice(start, node.expression.end).trim();

            // then 분기: 현재 조건 전달
            getEdges(node.thenStatement, edges, condText);

            // else / else-if 분기
            // - else if  → elseStatement 가 또 IfStatement → 재귀에서 자체 조건을 뽑음
            // - else     → elseStatement 가 Block/ReturnStatement → cond=null (무조건 실행)
            if (node.elseStatement) {
                const elseK = ts.SyntaxKind[node.elseStatement.kind];
                const elseCond = elseK === "IfStatement" ? null : null; // else-if 는 안에서 처리
                getEdges(node.elseStatement, edges, elseCond);
            }
            return;
        }
        // 그 외 노드는 children 순회
        if (node.statements) node.statements.forEach((s: any) => getEdges(s, edges, cond));
    }

    for (const stmt of sf.statements) {
        if (ts.SyntaxKind[stmt.kind] !== "FunctionDeclaration") continue;
        const fn    = stmt as any;
        const edges: ReturnEdge[] = [];
        getEdges(fn.body, edges, null);
        fns.push({ name: fn.name.escapedText, edges });
    }

    return fns;
}