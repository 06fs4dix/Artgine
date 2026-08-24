import { CUniqueID } from "../basic/CUniqueID.js";
import { CMat } from "../geometry/CMat.js";
import { SDF } from "../z_file/SDF.js";
class Description {
    Name = "";
    Text = new Array();
    Min = new Array();
    Max = new Array();
    Step = new Array();
    Value = new Array();
    Use = new Array();
}
function MakeDesc(_text = [], _min = [], _max = [], _step = [], _value = [], _use = []) {
    const d = new Description();
    d.Text = _text;
    d.Min = _min;
    d.Max = _max;
    d.Step = _step;
    d.Value = _value;
    d.Use = _use;
    return d;
}
const SLOT_SIZE = 5;
const MAX_PARAMS = 4;
const USED_SLOTS = [0, 1, 2];
export class CVFX extends CMat {
    static lDesc = new Array();
    static eVFX = SDF.eVFX;
    constructor(_F32A = null) {
        super([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    }
    IsShould(_member, _type) {
        if (_member == "m_description") {
            return false;
        }
        return super.IsShould(_member, _type);
    }
    EditHTMLInit(_div, _pointer = null) {
        super.EditHTMLInit(_div);
        _div.innerHTML = "";
        const vfxList = [];
        for (const [k, v] of Object.entries(SDF.eVFX)) {
            if (typeof v === "number")
                vfxList.push({ name: k, val: v });
        }
        vfxList.sort((a, b) => a.val - b.val);
        const uid = CUniqueID.GetHash();
        const prettyNumber = (v, maxDecimals = 6) => {
            if (!isFinite(v))
                return String(v);
            const n = Number(v.toFixed(maxDecimals));
            return (Object.is(n, -0) ? 0 : n).toString();
        };
        const stepDecimals = (step) => {
            if (!isFinite(step) || step <= 0)
                return 0;
            const s = step.toString();
            const ePos = s.indexOf("e-");
            if (ePos >= 0) {
                const p = parseInt(s.slice(ePos + 2), 10);
                return isFinite(p) ? Math.min(12, Math.max(0, p)) : 0;
            }
            const dot = s.indexOf(".");
            if (dot >= 0)
                return Math.min(12, s.length - dot - 1);
            return 0;
        };
        const snapToStep = (v, step) => {
            if (!isFinite(v) || !isFinite(step) || step <= 0)
                return v;
            const snapped = Math.round(v / step) * step;
            const dec = stepDecimals(step);
            const n = Number(snapped.toFixed(dec));
            return (Object.is(n, -0) ? 0 : n);
        };
        const formatByStep = (v, step) => {
            return prettyNumber(snapToStep(v, step), stepDecimals(step));
        };
        const getEffectVal = (slot) => Number(this.mF32A[slot * SLOT_SIZE] || 0);
        const paramToIndex = (slot, paramIndex) => slot * SLOT_SIZE + 1 + paramIndex;
        const getParam = (slot, paramIndex) => Number(this.mF32A[paramToIndex(slot, paramIndex)] || 0);
        const setParam = (slot, paramIndex, v) => {
            this.mF32A[paramToIndex(slot, paramIndex)] = v;
        };
        const resetEffect = (slot) => {
            const base = slot * SLOT_SIZE;
            for (let i = 0; i < SLOT_SIZE; i++)
                this.mF32A[base + i] = 0;
        };
        const isAllowedInSlot = (val, slot) => {
            if (val === 0)
                return true;
            const use = CVFX.lDesc[val]?.Use;
            if (!use || use.length === 0)
                return true;
            return use[slot] === true;
        };
        const root = document.createElement("div");
        root.className = "d-flex flex-column gap-2";
        _div.appendChild(root);
        const makeRange = (slot, paramIndex, descKey, min, max, step, value) => {
            const wrap = document.createElement("div");
            wrap.className = "mb-2";
            const lab = document.createElement("label");
            lab.className = "form-label";
            lab.id = `${uid}_s${slot}_p${paramIndex}_lab`;
            lab.textContent = `${descKey} : ${formatByStep(value, step)}`;
            wrap.appendChild(lab);
            const input = document.createElement("input");
            input.type = "range";
            input.className = "form-range";
            input.id = `${uid}_s${slot}_p${paramIndex}`;
            input.min = String(min);
            input.max = String(max);
            input.step = String(step);
            input.value = String(snapToStep(value, step));
            input.addEventListener("input", () => {
                const vRaw = Number(input.value);
                const v = snapToStep(vRaw, step);
                if (v !== vRaw)
                    input.value = String(v);
                setParam(slot, paramIndex, v);
                lab.textContent = `${descKey} : ${formatByStep(v, step)}`;
            });
            input.addEventListener("change", () => {
                this.EditRefresh(_pointer);
                this.EditChange(_pointer, false);
            });
            wrap.appendChild(input);
            return wrap;
        };
        const makeSelectParam = (slot, paramIndex, descKey, names, values, value) => {
            const wrap = document.createElement("div");
            wrap.className = "mb-2";
            const lab = document.createElement("label");
            lab.className = "form-label";
            lab.id = `${uid}_s${slot}_p${paramIndex}_lab`;
            const getTextByValue = (v) => {
                const idx = values.findIndex(it => it === v);
                return idx >= 0 ? (names[idx] ?? String(v)) : `Custom (${prettyNumber(v)})`;
            };
            lab.textContent = `${descKey} : ${getTextByValue(value)}`;
            wrap.appendChild(lab);
            const sel = document.createElement("select");
            sel.className = "form-select form-select-sm";
            sel.id = `${uid}_s${slot}_p${paramIndex}`;
            if (values.findIndex(it => it === value) < 0) {
                const opt = document.createElement("option");
                opt.value = String(value);
                opt.textContent = `Custom (${prettyNumber(value)})`;
                sel.appendChild(opt);
            }
            const n = Math.min(names.length, values.length);
            for (let i = 0; i < n; i++) {
                const opt = document.createElement("option");
                opt.value = String(values[i]);
                opt.textContent = names[i];
                sel.appendChild(opt);
            }
            sel.value = String(value);
            sel.addEventListener("change", () => {
                const v = Number(sel.value);
                setParam(slot, paramIndex, v);
                lab.textContent = `${descKey} : ${getTextByValue(v)}`;
                this.EditRefresh(_pointer);
                this.EditChange(_pointer, false);
            });
            wrap.appendChild(sel);
            return wrap;
        };
        for (const slot of USED_SLOTS) {
            const curVal = getEffectVal(slot);
            const block = document.createElement("div");
            block.className = "border rounded p-2";
            root.appendChild(block);
            const header = document.createElement("div");
            header.className = "d-flex align-items-center gap-2";
            block.appendChild(header);
            const badge = document.createElement("span");
            badge.className = "badge text-bg-secondary";
            badge.textContent = String(slot);
            header.appendChild(badge);
            const select = document.createElement("select");
            select.className = "form-select form-select-sm";
            select.style.maxWidth = "260px";
            const noneOpt = document.createElement("option");
            noneOpt.value = "0";
            noneOpt.textContent = "None";
            select.appendChild(noneOpt);
            for (const it of vfxList) {
                if (it.val === 0)
                    continue;
                const opt = document.createElement("option");
                opt.value = String(it.val);
                opt.textContent = it.name;
                if (!isAllowedInSlot(it.val, slot))
                    opt.disabled = true;
                select.appendChild(opt);
            }
            select.value = String(curVal);
            select.onchange = () => {
                const nv = Number(select.value) || 0;
                this.mF32A[slot * SLOT_SIZE] = nv;
                if (nv === 0) {
                    resetEffect(slot);
                }
                else {
                    const d = CVFX.lDesc[nv];
                    for (let pi = 0; pi < MAX_PARAMS; pi++) {
                        const dv = d?.Value?.[pi];
                        setParam(slot, pi, (typeof dv === "number") ? dv : 0);
                    }
                }
                this.EditRefresh(_pointer);
                this.EditChange(_pointer, false);
            };
            header.appendChild(select);
            if (curVal !== 0) {
                const d = CVFX.lDesc[curVal];
                const controls = document.createElement("div");
                controls.className = "mt-2";
                block.appendChild(controls);
                const textCount = Math.min(d?.Text?.length ?? 0, MAX_PARAMS);
                for (let i = 0; i < textCount; i++) {
                    const label = d.Text[i];
                    if (!label)
                        continue;
                    const minItem = d?.Min?.[i];
                    const maxItem = d?.Max?.[i];
                    if (Array.isArray(minItem) && Array.isArray(maxItem)) {
                        controls.appendChild(makeSelectParam(slot, i, label, minItem, maxItem, getParam(slot, i)));
                    }
                    else {
                        controls.appendChild(makeRange(slot, i, label, (typeof minItem === "number") ? minItem : 0, (typeof maxItem === "number") ? maxItem : 1, (typeof d?.Step?.[i] === "number") ? d.Step[i] : 0.01, getParam(slot, i)));
                    }
                }
            }
        }
    }
}
CVFX.lDesc[SDF.eVFX.Distort] = MakeDesc(["Strength_X", "Strength_Y"], [0, 0], [0.5, 0.5], [0.02, 0.02], [0.05, 0.05]);
CVFX.lDesc[SDF.eVFX.Aberrate] = MakeDesc(["Base_Strength", "Added_Strength"], [0, 0], [0.1, 0.1], [0.01, 0.01], [0.1, 0.05], [true, false, false]);
CVFX.lDesc[SDF.eVFX.Outline] = MakeDesc(["R", "G", "B"], [0, 0, 0], [1, 1, 1], [0.1, 0.1, 0.1], [1, 0, 0], [true, false, false]);
CVFX.lDesc[SDF.eVFX.Pixel] = MakeDesc(["Size_X", "Size_Y"], [0, 0], [32, 32], [1, 1], [2, 2]);
CVFX.lDesc[SDF.eVFX.Noise] = MakeDesc(["Type", "Speed", "Mix Ratio", "Repeat"], [["Perlin", "Perlin Normal", "PerlinFBM_Cloud", "Blue", "Gaussian"], 0, 0, 0.2], [[SDF.eNoise.Perlin, SDF.eNoise.PerlinNormal, SDF.eNoise.PerlinFBM3, SDF.eNoise.Blue, SDF.eNoise.Gaussian], 16, 1, 32], [1, 0.1, 0.05, 0.1], [1, 8, 0.5, 1], [true, false, false]);
CVFX.lDesc[SDF.eVFX.Scanline] = MakeDesc(["NumOfLines", "Speed"], [0, 0], [100, 50], [5, 1], [25, 5]);
CVFX.lDesc[SDF.eVFX.LookUpTable] = MakeDesc(["Index", "Dither"], [SDF.eUni.V4LookUpTable0, 0], [SDF.eUni.V4LookUpTable5, 1], [1, 0.05], [SDF.eUni.V4LookUpTable0, 0]);
CVFX.lDesc[SDF.eVFX.Blur] = MakeDesc(["Type", "Count"], [1, 1], [4, 4], [1, 1], [2, 2], [true, false, false]);
CVFX.lDesc[SDF.eVFX.Decal] = MakeDesc(["R", "G", "B", "A"], [0, 0, 0, 0], [1, 1, 1, 1], [0.1, 0.1, 0.1, 0.1], [1, 1, 1, 1]);
CVFX.lDesc[SDF.eVFX.DecalTexture] = MakeDesc(["TexOff", "Blend"], [0, 0], [9, 1], [1, 0.1], [0, 1]);
for (const [text, val] of Object.entries(SDF.eVFX)) {
    if (typeof val !== "number")
        continue;
    if (CVFX.lDesc[val] == null)
        CVFX.lDesc[val] = new Description();
    CVFX.lDesc[val].Name = text;
}
