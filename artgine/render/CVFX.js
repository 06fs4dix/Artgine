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
}
function MakeDesc(_text = [], _min = [], _max = [], _step = [], _value = []) {
    const d = new Description();
    d.Text = _text;
    d.Min = _min;
    d.Max = _max;
    d.Step = _step;
    d.Value = _value;
    return d;
}
var gDesc = [];
gDesc[SDF.eColorVFX.Distort] = MakeDesc(["Strength_X", "Strength_Y"], [0, 0], [0.5, 0.5], [0.02, 0.02], [0.05, 0.05]);
gDesc[SDF.eColorVFX.Aberrate] = MakeDesc(["Base_Strength", "Added_Strength"], [0, 0], [0.1, 0.1], [0.01, 0.01], [0.1, 0.05]);
gDesc[SDF.eColorVFX.Outline] = MakeDesc(["R", "G", "B"], [0, 0, 0], [1, 1, 1], [0.1, 0.1, 0.1], [1, 0, 0]);
gDesc[SDF.eColorVFX.Pixel] = MakeDesc(["Size_X", "Size_Y"], [0, 0], [10, 10], [1, 1], [2, 2]);
gDesc[SDF.eColorVFX.Noise] = MakeDesc(["Speed", "Strength", "Size"], [0, 0, 0], [10, 0.5, 10], [0.1, 0.05, 0.1], [4, 0.25, 1]);
gDesc[SDF.eColorVFX.Scanline] = MakeDesc(["NumOfLines", "Speed"], [0, 0], [50, 10], [5, 1], [25, 5]);
gDesc[SDF.eColorVFX.ColorPalette] = MakeDesc(["Index", "Dither"], [0, 0], [10, 1], [1, 0.05], [1, 0]);
gDesc[SDF.eColorVFX.Blur] = MakeDesc(["Type", "Count"], [1, 1], [4, 4], [1, 1], [2, 2]);
for (const [text, val] of Object.entries(SDF.eColorVFX)) {
    if (typeof val !== "number")
        continue;
    if (gDesc[val] == null)
        gDesc[val] = new Description();
    gDesc[val].Name = text;
}
export class CVFX extends CMat {
    constructor(_F32A = null) {
        super([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    }
    IsShould(_member, _type) {
        if (_member == "m_description") {
            return false;
        }
        return super.IsShould(_member, _type);
    }
    EditHTMLInit(_div) {
        super.EditHTMLInit(_div);
        _div.innerHTML = "";
        const vfxList = [];
        for (const [k, v] of Object.entries(SDF.eColorVFX)) {
            if (typeof v === "number")
                vfxList.push({ name: k, val: v });
        }
        vfxList.sort((a, b) => a.val - b.val);
        const USED_SLOTS = [0, 2];
        const uid = CUniqueID.GetHash();
        const getEffectVal = (slot) => Number(this.mF32A[(slot + 1) * 4 + 3] || 0);
        const paramToIndex = (slot, paramIndex) => {
            if (paramIndex <= 3)
                return slot * 4 + paramIndex;
            return (slot + 1) * 4 + (paramIndex - 4);
        };
        const getParam = (slot, paramIndex) => Number(this.mF32A[paramToIndex(slot, paramIndex)] || 0);
        const setParam = (slot, paramIndex, v) => {
            this.mF32A[paramToIndex(slot, paramIndex)] = v;
        };
        const resetEffect = (slot) => {
            const base = slot * 4;
            for (let i = 0; i < 8; i++)
                this.mF32A[base + i] = 0;
        };
        const isUsedInOtherSlot = (val, selfSlot) => {
            if (val === 0)
                return false;
            for (const s of USED_SLOTS) {
                if (s === selfSlot)
                    continue;
                if (getEffectVal(s) === val)
                    return true;
            }
            return false;
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
            lab.textContent = `${descKey} : ${value}`;
            wrap.appendChild(lab);
            const input = document.createElement("input");
            input.type = "range";
            input.className = "form-range";
            input.id = `${uid}_s${slot}_p${paramIndex}`;
            input.min = String(min);
            input.max = String(max);
            input.step = String(step);
            input.value = String(value);
            input.addEventListener("input", () => {
                const v = Number(input.value);
                setParam(slot, paramIndex, v);
                lab.textContent = `${descKey} : ${v}`;
                this.EditRefresh();
            });
            wrap.appendChild(input);
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
                if (isUsedInOtherSlot(it.val, slot))
                    opt.disabled = true;
                select.appendChild(opt);
            }
            select.value = String(curVal);
            select.onchange = () => {
                const nv = Number(select.value) || 0;
                this.mF32A[(slot + 1) * 4 + 3] = nv;
                if (nv === 0) {
                    resetEffect(slot);
                }
                else {
                    const d = gDesc[nv];
                    for (let pi = 0; pi <= 6; pi++) {
                        const dv = d?.Value?.[pi];
                        setParam(slot, pi, (typeof dv === "number") ? dv : 0);
                    }
                }
                this.EditRefresh();
            };
            header.appendChild(select);
            if (curVal !== 0) {
                const d = gDesc[curVal];
                const controls = document.createElement("div");
                controls.className = "mt-2";
                block.appendChild(controls);
                const textCount = Math.min(d?.Text?.length ?? 0, 7);
                for (let i = 0; i < textCount; i++) {
                    const label = d.Text[i];
                    if (!label)
                        continue;
                    controls.appendChild(makeRange(slot, i, label, d.Min?.[i] ?? 0, d.Max?.[i] ?? 1, d.Step?.[i] ?? 0.01, getParam(slot, i)));
                }
            }
        }
    }
}
