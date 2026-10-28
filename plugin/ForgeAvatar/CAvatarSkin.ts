import { CTexture } from "../../artgine/render/CTexture.js";
import { CMesh } from "../../artgine/render/CMesh.js";
import { CVertexFormat } from "../../artgine/render/CShader.js";
import { CFrame } from "../../artgine/util/CFrame.js";
import { CAvatarCloth } from "./CAvatarCloth.js";

//로블록스 피부색 방식(피부 영역에만 피부색). 베이스 텍스처에 피부 마스크가 없어 색조·채도로 피부 픽셀을 골라 그 부분만 곱한다.
//살찐 체형(체중)일 때는 베이스 몸에 그려진 복근 음영을 배 영역에서만 흐리게 한다(색은 흐린 이미지와, 노말은 평평한 값과 섞는다)
export class CAvatarSkin
{
    //피부로 보는 색조 범위(도)와 경계 폭
    static sHue = [6, 42];
    static sHueSoft = 8;
    static sSat = [0.12, 0.85];
    //복근 흐리기: 체중 1에서 흐림 반경(텍스처 너비 대비)과 체중 단계(실시간 체중을 이 단위로 묶어 텍스처를 만든다)
    static sSoftBlur = 0.012;
    static sSoftStep = 0.25;
    //체중 0.5만 돼도 복근 윤곽은 거의 안 보이므로 체중보다 빨리 흐린다
    static sSoftRate = 1.5;
    static sSoftBone = /^(pelvis|spine_01|spine_02)$/;

    private static sWait = new Map<string, Promise<string>>();
    private static sMask = new WeakMap<CMesh, Float32Array>();

    //몸 노드(눈·눈썹 제외)가 쓰는 기본색·노말 텍스처 키
    static BaseKey(_mesh : CMesh, _slot = 0) : string
    {
        const n = CAvatarCloth.BodyNodes(_mesh)[0];
        const off = n?.mData.textureOff[_slot];
        return off == null ? null : _mesh.texture[off];
    }
    static SoftLevel(_fat : number) : number
    {
        return _fat <= 0.1 ? 0 : Math.min(1, Math.round(_fat * CAvatarSkin.sSoftRate / CAvatarSkin.sSoftStep) * CAvatarSkin.sSoftStep);
    }

    //배 영역 UV 삼각형(정점 6개씩). 골반·아래 척추 본이 주인인 앞쪽 정점들로 된 삼각형
    static AbsMask(_mesh : CMesh) : Float32Array
    {
        let m = CAvatarSkin.sMask.get(_mesh);
        if(m != null) return m;
        const out : number[] = [];
        const bone = _mesh.skin.map(s => CAvatarSkin.sSoftBone.test(s.key.substring(s.key.lastIndexOf(" ") + 1)));
        for(const n of CAvatarCloth.BodyNodes(_mesh))
        {
            const ci = n.mData.ci;
            const P = ci.GetVFType(CVertexFormat.eIdentifier.Position)[0]?.bufF.GetArray(), U = ci.GetVFType(CVertexFormat.eIdentifier.UV)[0]?.bufF.GetArray();
            const W = ci.GetVFType(CVertexFormat.eIdentifier.Weight)[0]?.bufF.GetArray(), J = ci.GetVFType(CVertexFormat.eIdentifier.WeightIndex)[0]?.bufF.GetArray();
            const I = ci.vertex.find(b => b.bufI.length > 0)?.bufI;
            if(P == null || U == null || W == null || J == null || I == null) continue;
            const In = (_v : number) =>
            {
                if(P[_v * 3 + 2] <= 0) return false;
                let w = 0;
                for(let k = 0; k < 4; k++) if(bone[J[_v * 4 + k]]) w += W[_v * 4 + k];
                return w >= 0.5;
            };
            for(let t = 0; t + 2 < I.length; t += 3)
                if(In(I[t]) && In(I[t + 1]) && In(I[t + 2]))
                    for(let k = 0; k < 3; k++) out.push(U[I[t + k] * 2], U[I[t + k] * 2 + 1]);
        }
        m = new Float32Array(out);
        CAvatarSkin.sMask.set(_mesh, m);
        return m;
    }

    //몸 기본색: 복근 흐리기(_level 0~1) + 피부색(_rgb). _mask가 없으면 피부색만
    static Body(_frame : CFrame, _src : string, _rgb : number[], _mask : Float32Array = null, _level = 0) : Promise<string>
    {
        const tint = _rgb[0] != 1 || _rgb[1] != 1 || _rgb[2] != 1;
        if(!tint && (_mask == null || _level <= 0)) return Promise.resolve(_src);
        const key = _src + "#body" + _rgb.map(v => Math.round(v * 100)).join("_") + "_" + Math.round(_level * 100) + ".tex";
        return CAvatarSkin.Once(key, () => CAvatarSkin.Build(_frame, _src, key, async (_px, _w, _h, _img) =>
        {
            if(_mask != null && _level > 0) await CAvatarSkin.Soften(_px, _w, _h, _img, _mask, _level, null);
            if(tint) CAvatarSkin.SkinTint(_px, _rgb);
        }));
    }
    //몸 노말: 배 영역을 평평한 노말(128,128,255) 쪽으로
    static Normal(_frame : CFrame, _src : string, _mask : Float32Array, _level : number) : Promise<string>
    {
        if(_src == null || _mask == null || _level <= 0) return Promise.resolve(_src);
        const key = _src + "#flat" + Math.round(_level * 100) + ".tex";
        return CAvatarSkin.Once(key, () => CAvatarSkin.Build(_frame, _src, key, (_px, _w, _h, _img) => CAvatarSkin.Soften(_px, _w, _h, _img, _mask, _level, [128, 128, 255])));
    }
    //_all이면 피부 판정 없이 전체에 곱한다(머리카락)
    static Tint(_frame : CFrame, _src : string, _rgb : number[], _all = false) : Promise<string>
    {
        const key = _src + (_all ? "#tint" : "#skin") + _rgb.map(v => Math.round(v * 100)).join("_") + ".tex";
        return CAvatarSkin.Once(key, () => CAvatarSkin.Build(_frame, _src, key, (_px) =>
        {
            if(!_all) { CAvatarSkin.SkinTint(_px, _rgb); return; }
            for(let i = 0; i < _px.length; i += 4)
            {
                _px[i] = Math.min(255, _px[i] * _rgb[0]);
                _px[i + 1] = Math.min(255, _px[i + 1] * _rgb[1]);
                _px[i + 2] = Math.min(255, _px[i + 2] * _rgb[2]);
            }
        }));
    }

    private static Once(_key : string, _fn : () => Promise<string>) : Promise<string>
    {
        let p = CAvatarSkin.sWait.get(_key);
        if(p == null) CAvatarSkin.sWait.set(_key, p = _fn());
        return p;
    }

    private static SkinTint(_px : Uint8ClampedArray, _rgb : number[])
    {
        const [h0, h1] = CAvatarSkin.sHue, soft = CAvatarSkin.sHueSoft, [s0, s1] = CAvatarSkin.sSat;
        for(let i = 0; i < _px.length; i += 4)
        {
            const r = _px[i] / 255, g = _px[i + 1] / 255, b = _px[i + 2] / 255;
            const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
            if(mx < 0.12 || d < 1e-4) continue;
            const s = d / mx;
            if(s < s0 || s > s1) continue;
            let hue = mx == r ? 60 * (((g - b) / d) % 6) : mx == g ? 60 * ((b - r) / d + 2) : 60 * ((r - g) / d + 4);
            if(hue < 0) hue += 360;
            const k = Math.min(1, Math.max(0, (hue - (h0 - soft)) / soft), Math.max(0, ((h1 + soft) - hue) / soft))
                * Math.min(1, (s - s0) / 0.06);
            if(k <= 0) continue;
            _px[i] = Math.min(255, _px[i] * (1 - k + k * _rgb[0]));
            _px[i + 1] = Math.min(255, _px[i + 1] * (1 - k + k * _rgb[1]));
            _px[i + 2] = Math.min(255, _px[i + 2] * (1 - k + k * _rgb[2]));
        }
    }

    //마스크(UV 삼각형을 그리고 흐린 것) 안에서 흐린 이미지(또는 고정색 _flat)와 섞는다
    private static async Soften(_px : Uint8ClampedArray, _w : number, _h : number, _img : ImageBitmap, _mask : Float32Array, _level : number, _flat : number[])
    {
        const blur = Math.max(1, Math.round(_w * CAvatarSkin.sSoftBlur * _level));
        const mc = new OffscreenCanvas(_w, _h), mx = mc.getContext("2d");
        mx.fillStyle = "#000";
        mx.fillRect(0, 0, _w, _h);
        mx.fillStyle = "#fff";
        //UV는 0~1 밖으로 나갈 수 있어(Repeat) 삼각형마다 한 칸 안으로 옮겨 그린다
        for(let i = 0; i + 5 < _mask.length; i += 6)
        {
            const ou = Math.floor(Math.min(_mask[i], _mask[i + 2], _mask[i + 4])), ov = Math.floor(Math.min(_mask[i + 1], _mask[i + 3], _mask[i + 5]));
            mx.beginPath();
            for(let k = 0; k < 3; k++)
            {
                const x = (_mask[i + k * 2] - ou) * _w, y = (_mask[i + k * 2 + 1] - ov) * _h;
                if(k == 0) mx.moveTo(x, y); else mx.lineTo(x, y);
            }
            mx.closePath();
            mx.fill();
        }
        const fc = new OffscreenCanvas(_w, _h), fx = fc.getContext("2d");
        fx.filter = "blur(" + Math.round(_w * 0.01) + "px)";
        fx.drawImage(mc, 0, 0);
        const m = fx.getImageData(0, 0, _w, _h).data;
        let src : Uint8ClampedArray = null;
        if(_flat == null)
        {
            const bc = new OffscreenCanvas(_w, _h), bx = bc.getContext("2d");
            bx.filter = "blur(" + blur + "px)";
            bx.drawImage(_img, 0, 0);
            src = bx.getImageData(0, 0, _w, _h).data;
        }
        for(let i = 0; i < _px.length; i += 4)
        {
            const k = m[i] / 255 * _level;
            if(k <= 0) continue;
            for(let c = 0; c < 3; c++) _px[i + c] = _px[i + c] * (1 - k) + (_flat != null ? _flat[c] : src[i + c]) * k;
        }
    }

    private static async Build(_frame : CFrame, _src : string, _key : string, _edit : (_px : Uint8ClampedArray, _w : number, _h : number, _img : ImageBitmap) => void | Promise<void>) : Promise<string>
    {
        const res = await fetch(_src);
        if(!res.ok) return _src;
        const bmp = await createImageBitmap(await res.blob());
        const w = bmp.width, h = bmp.height;
        const cv = new OffscreenCanvas(w, h), ctx = cv.getContext("2d");
        ctx.drawImage(bmp, 0, 0);
        const px = ctx.getImageData(0, 0, w, h).data;
        await _edit(px, w, h, bmp);
        const tex = new CTexture();
        tex.SetSize(w, h);
        tex.CreateBuf();
        (tex.GetBuf()[0] as Uint8Array).set(px);
        //원본과 같은 샘플링이어야 한다. 이 메시들은 UV가 0~1 밖으로 나가 Repeat이 필요하다
        const org = _frame.Res().Find(_src) as CTexture;
        tex.Set("mFilter", org?.GetFilter() ?? CTexture.eFilter.Linear);
        tex.Set("mMipMap", org?.GetMipMap() ?? CTexture.eMipmap.GL);
        tex.Set("mWrap", org?.GetWrap() ?? CTexture.eWrap.Repeat);
        _frame.Res().Push(_key, tex);
        await Promise.resolve(_frame.Ren().BuildTexture(tex));
        tex.mKeepBuf = false;
        tex.ReleaseBuf();
        return _key;
    }
}
