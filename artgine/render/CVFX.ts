import { CObject, CPointer } from "../basic/CObject.js";
import { CUniqueID } from "../basic/CUniqueID.js";
import { CMat } from "../geometry/CMat.js";
import { SDF } from "../z_file/SDF.js";

class Description
{
    Name="";
    Text=new Array<string>();
    Min=new Array<number|Array<string>>();
    Max=new Array<number|Array<number>>();
    Step=new Array<number>();
    Value=new Array<number>();
    Use=new Array<boolean>();  // 슬롯별 사용 가능 여부 [slot0, slot1, slot2] / 비어있으면 모든 슬롯 허용
}

// 기존 CDescription(_xDesc/_xMin/_xDefault...) 형태를
// Description(Name/Text/Min/Max/Step/Value 배열) 형태로 변경.
function MakeDesc(
    _text: Array<string> = [],
    _min: Array<number|Array<string>> = [],
    _max: Array<number|Array<number>> = [],
    _step: Array<number> = [],
    _value: Array<number> = [],
    _use: Array<boolean> = []   // 비어있으면 모든 슬롯 허용
): Description {
    const d = new Description();
    d.Text = _text;
    d.Min = _min;
    d.Max = _max;
    d.Step = _step;
    d.Value = _value;
    d.Use = _use;
    return d;
}

//var gDesc: Array<Description> = [];


// ─── 슬롯 레이아웃 ────────────────────────────────────────────────
// Float32Array[16] 를 5 floats × 3 슬롯으로 사용 (마지막 1개는 여분)
//
//  슬롯 0: index  0..4  → [effectID, param0, param1, param2, param3]
//  슬롯 1: index  5..9  → [effectID, param0, param1, param2, param3]
//  슬롯 2: index 10..14 → [effectID, param0, param1, param2, param3]
//
// effectID 위치: slot * 5        (= 0, 5, 10)
// paramN 위치:   slot * 5 + 1 + N
// 슬롯당 최대 파라미터 수: 4
// ─────────────────────────────────────────────────────────────────

const SLOT_SIZE    = 5;
const MAX_PARAMS   = 4;  // param0..3
const USED_SLOTS   = [0, 1, 2] as const;

export class CVFX extends CMat
{
    static lDesc=new Array<Description>();
    static eVFX=SDF.eVFX;
    constructor(_F32A : Float32Array|Array<number>|number=null)
    {
        super([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]);
    }

    override IsShould(_member: string, _type: CObject.eShould) 
    {
        if(_member == "m_description") {
            return false;
        }
        return super.IsShould(_member,_type);
    }

    override EditHTMLInit(_div: HTMLDivElement, _pointer: CPointer = null): void {
        super.EditHTMLInit(_div);

        _div.innerHTML = "";

        // enum에서 숫자 항목만 추출·정렬
        const vfxList : {name:string, val:number}[] = [];
        for(const [k, v] of Object.entries(SDF.eVFX)) {
            if(typeof v === "number") vfxList.push({name:k, val:v});
        }
        vfxList.sort((a,b)=>a.val-b.val);

        const uid = CUniqueID.GetHash();

        // ── 헬퍼 ──────────────────────────────────────────────────
        const prettyNumber = (v:number, maxDecimals:number = 6) => {
            if(!isFinite(v)) return String(v);
            const n = Number(v.toFixed(maxDecimals));
            return (Object.is(n, -0) ? 0 : n).toString();
        };

        const stepDecimals = (step:number) => {
            if(!isFinite(step) || step <= 0) return 0;
            const s = step.toString();
            const ePos = s.indexOf("e-");
            if(ePos >= 0) {
                const p = parseInt(s.slice(ePos + 2), 10);
                return isFinite(p) ? Math.min(12, Math.max(0, p)) : 0;
            }
            const dot = s.indexOf(".");
            if(dot >= 0) return Math.min(12, s.length - dot - 1);
            return 0;
        };

        const snapToStep = (v:number, step:number) => {
            if(!isFinite(v) || !isFinite(step) || step <= 0) return v;
            const snapped = Math.round(v / step) * step;
            const dec = stepDecimals(step);
            const n = Number(snapped.toFixed(dec));
            return (Object.is(n, -0) ? 0 : n);
        };

        const formatByStep = (v:number, step:number) => {
            return prettyNumber(snapToStep(v, step), stepDecimals(step));
        };

        // ── 슬롯 접근자 ───────────────────────────────────────────
        // effectID: slot * SLOT_SIZE
        const getEffectVal  = (slot:number) =>
            Number(this.mF32A[slot * SLOT_SIZE] || 0);

        // paramIndex 0..3: slot * SLOT_SIZE + 1 + paramIndex
        const paramToIndex  = (slot:number, paramIndex:number) =>
            slot * SLOT_SIZE + 1 + paramIndex;

        const getParam = (slot:number, paramIndex:number) =>
            Number(this.mF32A[paramToIndex(slot, paramIndex)] || 0);

        const setParam = (slot:number, paramIndex:number, v:number) => {
            this.mF32A[paramToIndex(slot, paramIndex)] = v;
        };

        const resetEffect = (slot:number) => {
            const base = slot * SLOT_SIZE;
            for(let i = 0; i < SLOT_SIZE; i++) this.mF32A[base + i] = 0;
        };

        /*
        const isUsedInOtherSlot = (val:number, selfSlot:number) => {
            if(val === 0) return false;
            for(const s of USED_SLOTS) {
                if(s === selfSlot) continue;
                if(getEffectVal(s) === val) return true;
            }
            return false;
        };
        */

        // Use 배열이 비어있으면 모든 슬롯 허용, 아니면 해당 슬롯 인덱스 확인
        const isAllowedInSlot = (val:number, slot:number) => {
            if(val === 0) return true;
            const use = CVFX.lDesc[val]?.Use;
            if(!use || use.length === 0) return true;
            return use[slot] === true;
        };

        // ── UI 빌더 ───────────────────────────────────────────────
        const root = document.createElement("div");
        root.className = "d-flex flex-column gap-2";
        _div.appendChild(root);

        const makeRange = (
            slot:number, paramIndex:number,
            descKey:string,
            min:number, max:number, step:number, value:number
        ) => {
            const wrap = document.createElement("div");
            wrap.className = "mb-2";

            const lab = document.createElement("label");
            lab.className = "form-label";
            lab.id = `${uid}_s${slot}_p${paramIndex}_lab`;
            lab.textContent = `${descKey} : ${formatByStep(value, step)}`;
            wrap.appendChild(lab);

            const input = document.createElement("input");
            input.type  = "range";
            input.className = "form-range";
            input.id    = `${uid}_s${slot}_p${paramIndex}`;
            input.min   = String(min);
            input.max   = String(max);
            input.step  = String(step);
            input.value = String(snapToStep(value, step));
            input.addEventListener("input", () => {
                const vRaw = Number(input.value);
                const v = snapToStep(vRaw, step);
                if(v !== vRaw) input.value = String(v);
                setParam(slot, paramIndex, v);
                lab.textContent = `${descKey} : ${formatByStep(v, step)}`;
            });
            input.addEventListener("change", () => {
                this.EditRefresh(_pointer);
                this.EditChange(_pointer,false);
            });
            wrap.appendChild(input);
            return wrap;
        };

        const makeSelectParam = (
            slot:number, paramIndex:number,
            descKey:string,
            names:string[], values:number[], value:number
        ) => {
            const wrap = document.createElement("div");
            wrap.className = "mb-2";

            const lab = document.createElement("label");
            lab.className = "form-label";
            lab.id = `${uid}_s${slot}_p${paramIndex}_lab`;

            const getTextByValue = (v:number) => {
                const idx = values.findIndex(it => it === v);
                return idx >= 0 ? (names[idx] ?? String(v)) : `Custom (${prettyNumber(v)})`;
            };

            lab.textContent = `${descKey} : ${getTextByValue(value)}`;
            wrap.appendChild(lab);

            const sel = document.createElement("select");
            sel.className = "form-select form-select-sm";
            sel.id = `${uid}_s${slot}_p${paramIndex}`;

            if(values.findIndex(it => it === value) < 0) {
                const opt = document.createElement("option");
                opt.value = String(value);
                opt.textContent = `Custom (${prettyNumber(value)})`;
                sel.appendChild(opt);
            }

            const n = Math.min(names.length, values.length);
            for(let i = 0; i < n; i++) {
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
                this.EditChange(_pointer,false);
            });
            wrap.appendChild(sel);
            return wrap;
        };

        // ── 슬롯 블록 렌더링 ──────────────────────────────────────
        for(const slot of USED_SLOTS) {
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

            for(const it of vfxList) {
                if(it.val === 0) continue;
                const opt = document.createElement("option");
                opt.value = String(it.val);
                opt.textContent = it.name;
                if(/*isUsedInOtherSlot(it.val, slot) ||*/ !isAllowedInSlot(it.val, slot)) opt.disabled = true;
                select.appendChild(opt);
            }

            select.value = String(curVal);

            select.onchange = () => {
                const nv = Number(select.value) || 0;

                // effectID는 슬롯의 첫 번째 float에 저장
                this.mF32A[slot * SLOT_SIZE] = nv;

                if(nv === 0) {
                    resetEffect(slot);
                } else {
                    const d = CVFX.lDesc[nv];
                    // 기본값 세팅 (최대 MAX_PARAMS개)
                    for(let pi = 0; pi < MAX_PARAMS; pi++) {
                        const dv = d?.Value?.[pi];
                        setParam(slot, pi, (typeof dv === "number") ? dv : 0);
                    }
                }

                this.EditRefresh(_pointer);
                this.EditChange(_pointer,false);
            };

            header.appendChild(select);

            // 선택된 효과의 파라미터 슬라이더 노출
            if(curVal !== 0) {
                const d = CVFX.lDesc[curVal];
                const controls = document.createElement("div");
                controls.className = "mt-2";
                block.appendChild(controls);

                // 슬롯당 최대 MAX_PARAMS(4)개까지만 노출
                const textCount = Math.min(d?.Text?.length ?? 0, MAX_PARAMS);

                for(let i = 0; i < textCount; i++) {
                    const label = d.Text[i];
                    if(!label) continue;

                    const minItem = d?.Min?.[i];
                    const maxItem = d?.Max?.[i];

                    if(Array.isArray(minItem) && Array.isArray(maxItem)) {
                        controls.appendChild(makeSelectParam(
                            slot, i, label,
                            minItem as string[],
                            maxItem as number[],
                            getParam(slot, i)
                        ));
                    } else {
                        controls.appendChild(makeRange(
                            slot, i, label,
                            (typeof minItem === "number") ? minItem : 0,
                            (typeof maxItem === "number") ? maxItem : 1,
                            (typeof d?.Step?.[i] === "number") ? d.Step[i] : 0.01,
                            getParam(slot, i)
                        ));
                    }
                }
            }
        }
    }
}

CVFX.lDesc[SDF.eVFX.Distort] = MakeDesc(
    ["Strength_X", "Strength_Y"],
    [0, 0], [0.5, 0.5],
    [0.02, 0.02],
    [0.05, 0.05]
    // Use 미지정 → 모든 슬롯 허용
);
CVFX.lDesc[SDF.eVFX.Aberrate] = MakeDesc(
    ["Base_Strength", "Added_Strength"],
    [0, 0], [0.1, 0.1],
    [0.01, 0.01],
    [0.1, 0.05],
    [true, false, false]
);
CVFX.lDesc[SDF.eVFX.Outline] = MakeDesc(
    ["R", "G", "B"],
    [0, 0, 0], [1, 1, 1],
    [0.1, 0.1, 0.1],
    [1, 0, 0],
    [true, false, false]  // 슬롯 0만 허용 (이웃 픽셀 접근 필요)
);
CVFX.lDesc[SDF.eVFX.Pixel] = MakeDesc(
    ["Size_X", "Size_Y"],
    [0, 0], [32, 32],
    [1, 1],
    [2, 2]
    // Use 미지정 → 모든 슬롯 허용
);
CVFX.lDesc[SDF.eVFX.Noise] = MakeDesc(
    ["Type", "Speed", "Mix Ratio", "Repeat"],
    [["Perlin", "Perlin Normal", "PerlinFBM_Cloud", "Blue", "Gaussian"], 0, 0, 0.2], 
    [[SDF.eNoise.Perlin, SDF.eNoise.PerlinNormal, SDF.eNoise.PerlinFBM3, SDF.eNoise.Blue, SDF.eNoise.Gaussian], 16, 1, 32],
    [1, 0.1, 0.05, 0.1],
    [1, 8, 0.5, 1],
    [true, false, false]
);
CVFX.lDesc[SDF.eVFX.Scanline] = MakeDesc(
    ["NumOfLines", "Speed"],
    [0, 0], [100, 50],
    [5, 1],
    [25, 5]
    // Use 미지정 → 모든 슬롯 허용
);
CVFX.lDesc[SDF.eVFX.LookUpTable] = MakeDesc(
    ["Index", "Dither"],
    [SDF.eUni.V4LookUpTable0, 0], [SDF.eUni.V4LookUpTable5, 1],
    [1, 0.05],
    [SDF.eUni.V4LookUpTable0, 0]
    // Use 미지정 → 모든 슬롯 허용
);
CVFX.lDesc[SDF.eVFX.Blur] = MakeDesc(
    ["Type", "Count"],
    [1, 1], [4, 4],
    [1, 1],
    [2, 2],
    [true, false, false]
);
CVFX.lDesc[SDF.eVFX.Decal] = MakeDesc(
    ["R", "G", "B", "A"],
    [0, 0, 0, 0], [1, 1, 1, 1],
    [0.1, 0.1, 0.1, 0.1],
    [1, 1, 1, 1],
    // Use 미지정 → 모든 슬롯 허용
);
CVFX.lDesc[SDF.eVFX.DecalTexture] = MakeDesc(
    ["TexOff", "Blend"],
    [0, 0], [9, 1],
    [1, 0.1],
    [0, 1],
    // Use 미지정 → 모든 슬롯 허용
);

// enum은 (숫자->문자, 문자->숫자) 역매핑이 섞여서 들어오니 숫자 항목만 처리
for(const [text, val] of Object.entries(SDF.eVFX)) {
    if(typeof val !== "number") continue;
    if(CVFX.lDesc[val] == null) CVFX.lDesc[val] = new Description();
    CVFX.lDesc[val].Name = text;
}