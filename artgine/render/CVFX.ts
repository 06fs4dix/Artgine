import { CObject } from "../basic/CObject.js";
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
}

// 기존 CDescription(_xDesc/_xMin/_xDefault...) 형태를
// Description(Name/Text/Min/Max/Step/Value 배열) 형태로 변경.
// 예) _xDesc  -> Text[0]
//     _xMin   -> Min[0]
//     _xMax   -> Max[0]
//     _xStep  -> Step[0]
//     _xDefault -> Value[0]
function MakeDesc(
    _text: Array<string> = [],
    _min: Array<number|Array<string>> = [],
    _max: Array<number|Array<number>> = [],
    _step: Array<number> = [],
    _value: Array<number> = []
): Description {
    const d = new Description();
    d.Text = _text;
    d.Min = _min;
    d.Max = _max;
    d.Step = _step;
    d.Value = _value;
    return d;
}

var gDesc: Array<Description> = [];
gDesc[SDF.eColorVFX.Distort] = MakeDesc(
    ["Strength_X", "Strength_Y"],
    [0, 0], [0.5, 0.5],
    [0.02, 0.02],
    [0.05, 0.05]
);
gDesc[SDF.eColorVFX.Aberrate] = MakeDesc(
    ["Base_Strength", "Added_Strength"],
    [0, 0], [0.1, 0.1],
    [0.01, 0.01],
    [0.1, 0.05]
);
gDesc[SDF.eColorVFX.Outline] = MakeDesc(
    ["R", "G", "B"],
    [0, 0, 0], [1, 1, 1],
    [0.1, 0.1, 0.1],
    [1, 0, 0]
);
gDesc[SDF.eColorVFX.Pixel] = MakeDesc(
    ["Size_X", "Size_Y"],
    [0, 0], [32, 32],
    [1, 1],
    [2, 2]
);
gDesc[SDF.eColorVFX.Noise] = MakeDesc(
    ["Speed", "Blend Ratio", "Size","Blend Mode","Type"],
    [0, 0, 0,["Gray","Red","Green","Blue","Alpha","Color","Color+Alpha"],["Gaussian","Perlin","Voronoi","Billow","Ridged","DomainWarp","FBM"]], 
    [8, 1, 4,[0,1,2,3,4,5,6],[SDF.eNoise.Gaussian,SDF.eNoise.Perlin,SDF.eNoise.Voronoi,SDF.eNoise.Billow,SDF.eNoise.Ridged,SDF.eNoise.DomainWarp,SDF.eNoise.FBM]],
    [0.1, 0.05, 0.05,1,1],
    [4, 1, 1,0,SDF.eNoise.Gaussian]
);
gDesc[SDF.eColorVFX.Scanline] = MakeDesc(
    ["NumOfLines", "Speed"],
    [0, 0], [50, 10],
    [5, 1],
    [25, 5]
);
gDesc[SDF.eColorVFX.LookUpTable] = MakeDesc(
    ["Index", "Dither"],
    [SDF.eLookUpTable.LUT0, 0], [SDF.eLookUpTable.LUT5, 1],
    [1, 0.05],
    [SDF.eLookUpTable.LUT0, 0]
);
gDesc[SDF.eColorVFX.Blur] = MakeDesc(
    ["Type", "Count"],
    [1, 1], [4, 4],
    [1, 1],
    [2, 2]
);

// enum은 (숫자->문자, 문자->숫자) 역매핑이 섞여서 들어오니 숫자 항목만 처리
for(const [text, val] of Object.entries(SDF.eColorVFX)) {
    if(typeof val !== "number") continue;
    if(gDesc[val] == null) gDesc[val] = new Description();
    gDesc[val].Name = text;
}

export class CVFX extends CMat
{
    constructor(_F32A : Float32Array|Array<number>=null)
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
    EditHTMLInit(_div: HTMLDivElement): void {
        super.EditHTMLInit(_div);

        _div.innerHTML = "";

        // enum은 (숫자->문자, 문자->숫자) 역매핑이 섞여서 들어오니 숫자 항목만 뽑음
        const vfxList : {name:string, val:number}[] = [];
        for(const [k, v] of Object.entries(SDF.eColorVFX)) {
            if(typeof v === "number") vfxList.push({name:k, val:v});
        }
        vfxList.sort((a,b)=>a.val-b.val);

        // 슬롯은 0,2만 사용하고(0,1) / (2,3)을 한 묶음(=8 floats)으로 사용
        const USED_SLOTS = [0, 2] as const;

        const uid = CUniqueID.GetHash();

        // ---- 숫자 표시(부동소수 오차 제거) ----
        const prettyNumber = (v:number, maxDecimals:number = 6) => {
            if(!isFinite(v)) return String(v);
            const n = Number(v.toFixed(maxDecimals));
            return (Object.is(n, -0) ? 0 : n).toString();
        };

        const stepDecimals = (step:number) => {
            if(!isFinite(step) || step <= 0) return 0;
            // 0.01, 0.05 같은 일반 케이스는 문자열 기반이 가장 안정적
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
            const dec = stepDecimals(step);
            return prettyNumber(snapToStep(v, step), dec);
        };

        const getEffectVal = (slot:number) => Number(this.mF32A[(slot + 1) * 4 + 3] || 0);

        // paramIndex: 0..6 (총 7개). slot vec4(xyzw) + 다음 vec4(xyz)를 사용. (type은 다음 vec4.w)
        const paramToIndex = (slot:number, paramIndex:number) => {
            // param0..3 -> slot.xyzw
            if(paramIndex <= 3) return slot * 4 + paramIndex;
            // param4..6 -> (slot+1).xyz  (type은 (slot+1).w)
            return (slot + 1) * 4 + (paramIndex - 4);
        };
        const getParam = (slot:number, paramIndex:number) => Number(this.mF32A[paramToIndex(slot, paramIndex)] || 0);
        const setParam = (slot:number, paramIndex:number, v:number) => {
            this.mF32A[paramToIndex(slot, paramIndex)] = v;
        };

        const resetEffect = (slot:number) => {
            const base = slot * 4;
            // 8 floats(두 vec4) 모두 초기화
            for(let i=0;i<8;i++) this.mF32A[base + i] = 0;
        };

        const isUsedInOtherSlot = (val:number, selfSlot:number) => {
            if(val === 0) return false;
            for(const s of USED_SLOTS) {
                if(s === selfSlot) continue;
                if(getEffectVal(s) === val) return true;
            }
            return false;
        };

        const root = document.createElement("div");
        root.className = "d-flex flex-column gap-2";
        _div.appendChild(root);

        const makeRange = (
            slot:number,
            paramIndex:number,
            descKey:string,
            min:number,
            max:number,
            step:number,
            value:number
        ) => {
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
                if(v !== vRaw) input.value = String(v);
                setParam(slot, paramIndex, v);
                lab.textContent = `${descKey} : ${formatByStep(v, step)}`;
                this.EditRefresh();
            });
            wrap.appendChild(input);
            return wrap;
        };

        const makeSelectParam = (
            slot:number,
            paramIndex:number,
            descKey:string,
            names:string[],
            values:number[],
            value:number
        ) => {
            const wrap = document.createElement("div");
            wrap.className = "mb-2";

            const lab = document.createElement("label");
            lab.className = "form-label";
            lab.id = `${uid}_s${slot}_p${paramIndex}_lab`;

            const getTextByValue = (v:number) => {
                const idx = values.findIndex(it => it === v);
                if(idx >= 0) return names[idx] ?? String(v);
                return `Custom (${prettyNumber(v)})`;
            };

            lab.textContent = `${descKey} : ${getTextByValue(value)}`;
            wrap.appendChild(lab);

            const sel = document.createElement("select");
            sel.className = "form-select form-select-sm";
            sel.id = `${uid}_s${slot}_p${paramIndex}`;

            const n = Math.min(names.length, values.length);

            // 현재 값이 옵션에 없으면 "Custom" 옵션을 추가해서 값이 바뀌지 않게 유지
            if(values.findIndex(it => it === value) < 0) {
                const opt = document.createElement("option");
                opt.value = String(value);
                opt.textContent = `Custom (${prettyNumber(value)})`;
                sel.appendChild(opt);
            }

            for(let i=0;i<n;i++) {
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
                this.EditRefresh();
            });
            wrap.appendChild(sel);
            return wrap;
        };

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
                if(isUsedInOtherSlot(it.val, slot)) opt.disabled = true;
                select.appendChild(opt);
            }

            select.value = String(curVal);

            select.onchange = () => {
                const nv = Number(select.value) || 0;

                // effect id는 (slot+1).w(두번째 vec4)에 저장
                this.mF32A[(slot + 1) * 4 + 3] = nv;

                if(nv === 0) {
                    resetEffect(slot);
                } else {
                    const d = gDesc[nv];

                    // 기본값 세팅(최대 7개 파라메터)
                    for(let pi=0; pi<=6; pi++) {
                        const dv = d?.Value?.[pi];
                        setParam(slot, pi, (typeof dv === "number") ? dv : 0);
                    }

                    // 두 번째 vec4의 w(=paramIndex 6)은 setParam에서 처리됨.
                }

                this.EditRefresh();
            };

            header.appendChild(select);

            // 선택된 효과의 현재값을 슬라이더로 노출
            if(curVal !== 0) {
                const d = gDesc[curVal];
                const controls = document.createElement("div");
                controls.className = "mt-2";
                block.appendChild(controls);

                // Text 길이만큼만 노출(최대 7개)
                const textCount = Math.min(d?.Text?.length ?? 0, 7);
                
                for(let i=0; i<textCount; i++) {
                    const label = d.Text[i];
                    if(!label) continue;

                    const minItem = d?.Min?.[i];
                    const maxItem = d?.Max?.[i];

                    // select 모드: Min[i] = string[] (표시 이름), Max[i] = number[] (실제 값)
                    if(Array.isArray(minItem) && Array.isArray(maxItem)) {
                        controls.appendChild(makeSelectParam(
                            slot,
                            i,
                            label,
                            minItem as string[],
                            maxItem as number[],
                            getParam(slot, i)
                        ));
                    } else {
                        controls.appendChild(makeRange(
                            slot,
                            i,
                            label,
                            (typeof minItem === "number") ? minItem : 0,
                            (typeof maxItem === "number") ? maxItem : 1,
                            (typeof (d as any).Step?.[i] === "number") ? (d as any).Step[i] : 0.01,
                            getParam(slot, i)
                        ));
                    }
                }
            }
        }
    }
}