import { CTexture } from "../../artgine/render/CTexture.js";
import { CVertexFormat } from "../../artgine/render/CShader.js";
import { CAvatarCloth } from "./CAvatarCloth.js";
export class CAvatarSkin {
    static sHue = [6, 42];
    static sHueSoft = 8;
    static sSat = [0.12, 0.85];
    static sSoftBlur = 0.012;
    static sSoftStep = 0.25;
    static sSoftRate = 1.5;
    static sSoftBone = /^(pelvis|spine_01|spine_02)$/;
    static sWait = new Map();
    static sMask = new WeakMap();
    static BaseKey(_mesh, _slot = 0) {
        const n = CAvatarCloth.BodyNodes(_mesh)[0];
        const off = n?.mData.textureOff[_slot];
        return off == null ? null : _mesh.texture[off];
    }
    static SoftLevel(_fat) {
        return _fat <= 0.1 ? 0 : Math.min(1, Math.round(_fat * CAvatarSkin.sSoftRate / CAvatarSkin.sSoftStep) * CAvatarSkin.sSoftStep);
    }
    static AbsMask(_mesh) {
        let m = CAvatarSkin.sMask.get(_mesh);
        if (m != null)
            return m;
        const out = [];
        const bone = _mesh.skin.map(s => CAvatarSkin.sSoftBone.test(s.key.substring(s.key.lastIndexOf(" ") + 1)));
        for (const n of CAvatarCloth.BodyNodes(_mesh)) {
            const ci = n.mData.ci;
            const P = ci.GetVFType(CVertexFormat.eIdentifier.Position)[0]?.bufF.GetArray(), U = ci.GetVFType(CVertexFormat.eIdentifier.UV)[0]?.bufF.GetArray();
            const W = ci.GetVFType(CVertexFormat.eIdentifier.Weight)[0]?.bufF.GetArray(), J = ci.GetVFType(CVertexFormat.eIdentifier.WeightIndex)[0]?.bufF.GetArray();
            const I = ci.vertex.find(b => b.bufI.length > 0)?.bufI;
            if (P == null || U == null || W == null || J == null || I == null)
                continue;
            const In = (_v) => {
                if (P[_v * 3 + 2] <= 0)
                    return false;
                let w = 0;
                for (let k = 0; k < 4; k++)
                    if (bone[J[_v * 4 + k]])
                        w += W[_v * 4 + k];
                return w >= 0.5;
            };
            for (let t = 0; t + 2 < I.length; t += 3)
                if (In(I[t]) && In(I[t + 1]) && In(I[t + 2]))
                    for (let k = 0; k < 3; k++)
                        out.push(U[I[t + k] * 2], U[I[t + k] * 2 + 1]);
        }
        m = new Float32Array(out);
        CAvatarSkin.sMask.set(_mesh, m);
        return m;
    }
    static Body(_frame, _src, _rgb, _mask = null, _level = 0) {
        const tint = _rgb[0] != 1 || _rgb[1] != 1 || _rgb[2] != 1;
        if (!tint && (_mask == null || _level <= 0))
            return Promise.resolve(_src);
        const key = _src + "#body" + _rgb.map(v => Math.round(v * 100)).join("_") + "_" + Math.round(_level * 100) + ".tex";
        return CAvatarSkin.Once(key, () => CAvatarSkin.Build(_frame, _src, key, async (_px, _w, _h, _img) => {
            if (_mask != null && _level > 0)
                await CAvatarSkin.Soften(_px, _w, _h, _img, _mask, _level, null);
            if (tint)
                CAvatarSkin.SkinTint(_px, _rgb);
        }));
    }
    static Normal(_frame, _src, _mask, _level) {
        if (_src == null || _mask == null || _level <= 0)
            return Promise.resolve(_src);
        const key = _src + "#flat" + Math.round(_level * 100) + ".tex";
        return CAvatarSkin.Once(key, () => CAvatarSkin.Build(_frame, _src, key, (_px, _w, _h, _img) => CAvatarSkin.Soften(_px, _w, _h, _img, _mask, _level, [128, 128, 255])));
    }
    static Tint(_frame, _src, _rgb, _all = false) {
        const key = _src + (_all ? "#tint" : "#skin") + _rgb.map(v => Math.round(v * 100)).join("_") + ".tex";
        return CAvatarSkin.Once(key, () => CAvatarSkin.Build(_frame, _src, key, (_px) => {
            if (!_all) {
                CAvatarSkin.SkinTint(_px, _rgb);
                return;
            }
            for (let i = 0; i < _px.length; i += 4) {
                _px[i] = Math.min(255, _px[i] * _rgb[0]);
                _px[i + 1] = Math.min(255, _px[i + 1] * _rgb[1]);
                _px[i + 2] = Math.min(255, _px[i + 2] * _rgb[2]);
            }
        }));
    }
    static Once(_key, _fn) {
        let p = CAvatarSkin.sWait.get(_key);
        if (p == null)
            CAvatarSkin.sWait.set(_key, p = _fn());
        return p;
    }
    static SkinTint(_px, _rgb) {
        const [h0, h1] = CAvatarSkin.sHue, soft = CAvatarSkin.sHueSoft, [s0, s1] = CAvatarSkin.sSat;
        for (let i = 0; i < _px.length; i += 4) {
            const r = _px[i] / 255, g = _px[i + 1] / 255, b = _px[i + 2] / 255;
            const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
            if (mx < 0.12 || d < 1e-4)
                continue;
            const s = d / mx;
            if (s < s0 || s > s1)
                continue;
            let hue = mx == r ? 60 * (((g - b) / d) % 6) : mx == g ? 60 * ((b - r) / d + 2) : 60 * ((r - g) / d + 4);
            if (hue < 0)
                hue += 360;
            const k = Math.min(1, Math.max(0, (hue - (h0 - soft)) / soft), Math.max(0, ((h1 + soft) - hue) / soft))
                * Math.min(1, (s - s0) / 0.06);
            if (k <= 0)
                continue;
            _px[i] = Math.min(255, _px[i] * (1 - k + k * _rgb[0]));
            _px[i + 1] = Math.min(255, _px[i + 1] * (1 - k + k * _rgb[1]));
            _px[i + 2] = Math.min(255, _px[i + 2] * (1 - k + k * _rgb[2]));
        }
    }
    static async Soften(_px, _w, _h, _img, _mask, _level, _flat) {
        const blur = Math.max(1, Math.round(_w * CAvatarSkin.sSoftBlur * _level));
        const mc = new OffscreenCanvas(_w, _h), mx = mc.getContext("2d");
        mx.fillStyle = "#000";
        mx.fillRect(0, 0, _w, _h);
        mx.fillStyle = "#fff";
        for (let i = 0; i + 5 < _mask.length; i += 6) {
            const ou = Math.floor(Math.min(_mask[i], _mask[i + 2], _mask[i + 4])), ov = Math.floor(Math.min(_mask[i + 1], _mask[i + 3], _mask[i + 5]));
            mx.beginPath();
            for (let k = 0; k < 3; k++) {
                const x = (_mask[i + k * 2] - ou) * _w, y = (_mask[i + k * 2 + 1] - ov) * _h;
                if (k == 0)
                    mx.moveTo(x, y);
                else
                    mx.lineTo(x, y);
            }
            mx.closePath();
            mx.fill();
        }
        const fc = new OffscreenCanvas(_w, _h), fx = fc.getContext("2d");
        fx.filter = "blur(" + Math.round(_w * 0.01) + "px)";
        fx.drawImage(mc, 0, 0);
        const m = fx.getImageData(0, 0, _w, _h).data;
        let src = null;
        if (_flat == null) {
            const bc = new OffscreenCanvas(_w, _h), bx = bc.getContext("2d");
            bx.filter = "blur(" + blur + "px)";
            bx.drawImage(_img, 0, 0);
            src = bx.getImageData(0, 0, _w, _h).data;
        }
        for (let i = 0; i < _px.length; i += 4) {
            const k = m[i] / 255 * _level;
            if (k <= 0)
                continue;
            for (let c = 0; c < 3; c++)
                _px[i + c] = _px[i + c] * (1 - k) + (_flat != null ? _flat[c] : src[i + c]) * k;
        }
    }
    static async Build(_frame, _src, _key, _edit) {
        const res = await fetch(_src);
        if (!res.ok)
            return _src;
        const bmp = await createImageBitmap(await res.blob());
        const w = bmp.width, h = bmp.height;
        const cv = new OffscreenCanvas(w, h), ctx = cv.getContext("2d");
        ctx.drawImage(bmp, 0, 0);
        const px = ctx.getImageData(0, 0, w, h).data;
        await _edit(px, w, h, bmp);
        const tex = new CTexture();
        tex.SetSize(w, h);
        tex.CreateBuf();
        tex.GetBuf()[0].set(px);
        const org = _frame.Res().Find(_src);
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
