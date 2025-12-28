import { CObject } from "../basic/CObject.js";
import { CUniqueID } from "../basic/CUniqueID.js";
import { CMat } from "../geometry/CMat.js";
import { SDF } from "../z_file/SDF.js";

class Description
{
    Name="";
    Text=new Array<string>();
    Min=new Array<number>();
    Max=new Array<number>();
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
    _min: Array<number> = [],
    _max: Array<number> = [],
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
    [0, 0], [10, 10],
    [1, 1],
    [2, 2]
);
gDesc[SDF.eColorVFX.Noise] = MakeDesc(
    ["Speed", "Strength", "Size"],
    [0, 0, 0], [10, 0.5, 10],
    [0.1, 0.05, 0.1],
    [4, 0.25, 1]
);
gDesc[SDF.eColorVFX.Scanline] = MakeDesc(
    ["NumOfLines", "Speed"],
    [0, 0], [50, 10],
    [5, 1],
    [25, 5]
);
gDesc[SDF.eColorVFX.ColorPalette] = MakeDesc(
    ["Index", "Dither"],
    [0, 0], [10, 1],
    [1, 0.05],
    [1, 0]
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
                    controls.appendChild(makeRange(
                        slot,
                        i,
                        label,
                        d.Min?.[i] ?? 0,
                        d.Max?.[i] ?? 1,
                        d.Step?.[i] ?? 0.01,
                        getParam(slot, i)
                    ));
                }
            }
        }
    }
}