import { CDOM } from "../basic/CDOM.js";
import { CEvent } from "../basic/CEvent.js";
import { CModalFlex } from "../util/CModalUtil.js";
import { CScript } from "../util/CScript.js";
import { CUtilWeb } from "../util/CUtilWeb.js";
var gModal;
var gSC;
var gEditer;
var gLastActive = "";
var gUpdateInterval = null;
var gVP = null;
var gTx = 0;
var gTy = 0;
var gScale = 1;
var gDragging = false;
var gOx = 0;
var gOy = 0;
export function ScriptTool(_sc) {
    gSC = _sc;
    gModal = new CModalFlex([0.6, 0.4], "ScriptToolModal");
    gModal.mResize = true;
    gModal.SetHeader("ScriptTool");
    gModal.SetSize(1000, 800);
    gModal.Open();
    const leftPanel = gModal.FindFlex(0);
    const rightPanel = gModal.FindFlex(1);
    rightPanel.style.maxHeight = "calc(100vh - 10px)";
    rightPanel.style.overflowY = "auto";
    leftPanel.style.overflow = "hidden";
    leftPanel.style.padding = "0";
    leftPanel.style.maxHeight = "calc(100vh - 10px)";
    const container = document.createElement("div");
    container.id = "ScriptToolLeft_div";
    container.style.cssText = "width:100%;height:100%;min-height:400px;overflow:hidden;cursor:grab;user-select:none;position:relative;";
    leftPanel.appendChild(container);
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
        if (gUpdateInterval !== null) {
            clearInterval(gUpdateInterval);
            gUpdateInterval = null;
        }
    });
    if (gUpdateInterval !== null)
        clearInterval(gUpdateInterval);
    gUpdateInterval = setInterval(ScriptToolUpdate, 100);
    ScriptToolInit();
}
function ScriptToolUpdate() {
    if (!gSC || gLastActive === gSC.mActiveFun)
        return;
    document.querySelectorAll(".st-fn-node").forEach(g => {
        const rect = g.querySelector("rect");
        const text = g.querySelector("text");
        if (rect) {
            rect.style.fill = "#E6F1FB";
            rect.style.stroke = "#185FA5";
            rect.style.strokeWidth = "0.5";
        }
        if (text)
            text.style.fill = "#0C447C";
    });
    const activeG = document.getElementById(`st-fn-${gSC.mActiveFun}`);
    if (activeG) {
        const rect = activeG.querySelector("rect");
        const text = activeG.querySelector("text");
        if (rect) {
            rect.style.fill = "#FCEBEB";
            rect.style.stroke = "#E24B4A";
            rect.style.strokeWidth = "3";
        }
        if (text)
            text.style.fill = "#A32D2D";
    }
    gLastActive = gSC.mActiveFun;
}
function ScriptToolInit() {
    gLastActive = "";
    const fns = ExtractScriptStructureAST(gSC.mSource);
    ScriptToolLeftInit(fns);
}
function ScriptToolLeftInit(fns) {
    const container = CDOM.ID("ScriptToolLeft_div");
    container.innerHTML = "";
    if (fns.length === 0)
        return;
    const NW = 240;
    const HDR_H = 36;
    const ROW_H = 26;
    const MIN_H = 52;
    const nodeH = {};
    for (const fn of fns)
        nodeH[fn.name] = Math.max(HDR_H + fn.edges.length * ROW_H, MIN_H);
    const n = fns.length;
    const maxH = Math.max(...Object.values(nodeH));
    const diag = Math.sqrt(NW * NW + maxH * maxH);
    const minR = n <= 1 ? 0 : (diag + 60) / (2 * Math.sin(Math.PI / n));
    const radius = Math.max(minR, 180);
    const pos = {};
    fns.forEach((f, i) => {
        const angle = -Math.PI / 2 + (2 * Math.PI / n) * i;
        pos[f.name] = { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
    });
    const W = container.clientWidth || 600;
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
    for (const fn of fns) {
        const sp = pos[fn.name];
        const nh = nodeH[fn.name];
        fn.edges.forEach((e, rowIdx) => {
            if (!e.to)
                return;
            const isSelf = e.to === fn.name;
            const tp = pos[e.to];
            const tnh = nodeH[e.to];
            const isCond = !!e.cond;
            const color = isCond ? "#BA7517" : "#185FA5";
            const marker = isCond ? "url(#st-arrc)" : "url(#st-arr)";
            const rowY = sp.y - nh / 2 + HDR_H + rowIdx * ROW_H + ROW_H / 2;
            if (isSelf) {
                const outLen = Math.sqrt(sp.x * sp.x + sp.y * sp.y) || 1;
                const odx = sp.x / outLen, ody = sp.y / outLen;
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
                if (isCond)
                    path.setAttribute("stroke-dasharray", "6 3");
                vp.appendChild(path);
                return;
            }
            const goRight = tp.x > sp.x;
            const srcX = goRight ? sp.x + NW / 2 : sp.x - NW / 2;
            const srcY = rowY;
            const tgtX = goRight ? tp.x - NW / 2 : tp.x + NW / 2;
            const tgtY = tp.y;
            const dist = Math.abs(tgtX - srcX);
            const cpOff = Math.max(dist * 0.5, 80);
            const cp1x = srcX + (goRight ? cpOff : -cpOff);
            const cp2x = tgtX + (goRight ? -cpOff : cpOff);
            const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
            path.setAttribute("d", `M${srcX.toFixed(1)},${srcY.toFixed(1)} C${cp1x.toFixed(1)},${srcY.toFixed(1)} ${cp2x.toFixed(1)},${tgtY.toFixed(1)} ${tgtX.toFixed(1)},${tgtY.toFixed(1)}`);
            path.setAttribute("fill", "none");
            path.setAttribute("stroke", color);
            path.setAttribute("stroke-width", "1.5");
            path.setAttribute("marker-end", marker);
            if (isCond)
                path.setAttribute("stroke-dasharray", "6 3");
            vp.appendChild(path);
        });
    }
    for (const fn of fns) {
        const p = pos[fn.name];
        const nh = nodeH[fn.name];
        const isActive = fn.name === gSC?.mActiveFun;
        const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        g.setAttribute("id", `st-fn-${fn.name}`);
        g.setAttribute("class", "st-fn-node");
        g.style.cursor = "pointer";
        const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        bg.setAttribute("x", String(p.x - NW / 2));
        bg.setAttribute("y", String(p.y - nh / 2));
        bg.setAttribute("width", String(NW));
        bg.setAttribute("height", String(nh));
        bg.setAttribute("rx", "8");
        bg.style.fill = isActive ? "#FCEBEB" : "#E6F1FB";
        bg.style.stroke = isActive ? "#E24B4A" : "#185FA5";
        bg.style.strokeWidth = isActive ? "3" : "0.5";
        g.appendChild(bg);
        const hdrLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
        hdrLine.setAttribute("x1", String(p.x - NW / 2));
        hdrLine.setAttribute("y1", String(p.y - nh / 2 + HDR_H));
        hdrLine.setAttribute("x2", String(p.x + NW / 2));
        hdrLine.setAttribute("y2", String(p.y - nh / 2 + HDR_H));
        hdrLine.style.stroke = isActive ? "#E24B4A" : "#185FA5";
        hdrLine.style.strokeWidth = "0.5";
        hdrLine.style.opacity = "0.4";
        g.appendChild(hdrLine);
        const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
        label.setAttribute("x", String(p.x));
        label.setAttribute("y", String(p.y - nh / 2 + HDR_H / 2));
        label.setAttribute("text-anchor", "middle");
        label.setAttribute("dominant-baseline", "central");
        label.style.cssText = `font-size:13px;font-weight:500;pointer-events:none;fill:${isActive ? "#A32D2D" : "#0C447C"};`;
        label.textContent = fn.name;
        g.appendChild(label);
        fn.edges.forEach((e, rowIdx) => {
            const rowTop = p.y - nh / 2 + HDR_H + rowIdx * ROW_H;
            const rowCY = rowTop + ROW_H / 2;
            const rowBg = e.cond ? "#FFF3DC" : (e.to ? "#EAF3FB" : "#F5F5F5");
            const rowBgEl = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            rowBgEl.setAttribute("x", String(p.x - NW / 2 + 1));
            rowBgEl.setAttribute("y", String(rowTop));
            rowBgEl.setAttribute("width", String(NW - 2));
            rowBgEl.setAttribute("height", String(ROW_H));
            rowBgEl.setAttribute("fill", rowBg);
            g.appendChild(rowBgEl);
            const accentColor = e.cond ? "#BA7517" : (e.to ? "#185FA5" : "#AAAAAA");
            const accent = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            accent.setAttribute("x", String(p.x - NW / 2 + 1));
            accent.setAttribute("y", String(rowTop));
            accent.setAttribute("width", "3");
            accent.setAttribute("height", String(ROW_H));
            accent.setAttribute("fill", accentColor);
            g.appendChild(accent);
            const toLabel = e.to ?? "null";
            let rowText;
            if (e.cond) {
                const shortCond = e.cond.length > 20 ? e.cond.slice(0, 18) + "…" : e.cond;
                rowText = `if(${shortCond}) → ${toLabel}`;
            }
            else {
                rowText = `→ ${toLabel}`;
            }
            const rowColor = e.cond ? "#7A3C00" : (e.to ? "#0C447C" : "#666666");
            const rt = document.createElementNS("http://www.w3.org/2000/svg", "text");
            rt.setAttribute("x", String(p.x + 4));
            rt.setAttribute("y", String(rowCY));
            rt.setAttribute("text-anchor", "middle");
            rt.setAttribute("dominant-baseline", "central");
            rt.style.cssText = `font-size:10px;font-family:monospace;pointer-events:none;fill:${rowColor};`;
            if (e.cond) {
                const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
                title.textContent = e.cond;
                rt.appendChild(title);
            }
            rt.appendChild(document.createTextNode(rowText));
            g.appendChild(rt);
            if (e.to && e.to !== fn.name) {
                const tp = pos[e.to];
                const goRight = tp.x > p.x;
                const portX = goRight ? p.x + NW / 2 : p.x - NW / 2;
                const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                dot.setAttribute("cx", String(portX));
                dot.setAttribute("cy", String(rowCY));
                dot.setAttribute("r", "3");
                dot.setAttribute("fill", e.cond ? "#BA7517" : "#185FA5");
                g.appendChild(dot);
            }
        });
        vp.appendChild(g);
    }
    const margin = radius + NW / 2 + 80;
    gScale = Math.min(W / (margin * 2), H / (margin * 2), 1.2);
    gTx = W / 2;
    gTy = H / 2;
    vp.setAttribute("transform", `translate(${gTx},${gTy}) scale(${gScale})`);
    container.onmousedown = (e) => { gDragging = true; gOx = e.clientX - gTx; gOy = e.clientY - gTy; };
    container.onmousemove = (e) => {
        if (!gDragging || !gVP)
            return;
        gTx = e.clientX - gOx;
        gTy = e.clientY - gOy;
        gVP.setAttribute("transform", `translate(${gTx},${gTy}) scale(${gScale})`);
    };
    container.onmouseup = container.onmouseleave = () => { gDragging = false; };
    container.onwheel = (e) => {
        e.preventDefault();
        gScale = Math.max(0.15, Math.min(5, gScale * (e.deltaY < 0 ? 1.12 : 0.9)));
        if (gVP)
            gVP.setAttribute("transform", `translate(${gTx},${gTy}) scale(${gScale})`);
    };
    container.appendChild(svg);
}
function ExtractScriptStructureAST(source) {
    const ts = window["ts"];
    if (!ts?.createSourceFile) {
        setTimeout(() => ScriptToolInit(), 500);
        return [];
    }
    const sf = ts.createSourceFile("s.ts", source, ts.ScriptTarget.ES2020, true);
    const fns = [];
    function getEdges(node, edges, cond) {
        if (!node)
            return;
        const k = ts.SyntaxKind[node.kind];
        if (k === "ReturnStatement") {
            const a = node.expression;
            edges.push({
                to: a?.kind === ts.SyntaxKind.StringLiteral ? a.text : null,
                cond: cond
            });
            return;
        }
        if (k === "Block") {
            node.statements.forEach((s) => getEdges(s, edges, cond));
            return;
        }
        if (k === "IfStatement") {
            const start = typeof node.expression.getStart === "function"
                ? node.expression.getStart(sf)
                : node.expression.pos;
            const condText = source.slice(start, node.expression.end).trim();
            getEdges(node.thenStatement, edges, condText);
            if (node.elseStatement) {
                const elseK = ts.SyntaxKind[node.elseStatement.kind];
                const elseCond = elseK === "IfStatement" ? null : null;
                getEdges(node.elseStatement, edges, elseCond);
            }
            return;
        }
        if (node.statements)
            node.statements.forEach((s) => getEdges(s, edges, cond));
    }
    for (const stmt of sf.statements) {
        if (ts.SyntaxKind[stmt.kind] !== "FunctionDeclaration")
            continue;
        const fn = stmt;
        const edges = [];
        getEdges(fn.body, edges, null);
        fns.push({ name: fn.name.escapedText, edges });
    }
    return fns;
}
