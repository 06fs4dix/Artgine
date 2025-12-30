import { CAlert } from "../basic/CAlert.js";
import { CBound } from "../geometry/CBound.js";
import { CPoolGeo } from "../geometry/CPoolGeo.js";
import { CVec2 } from "../geometry/CVec2.js";
import { CVec3 } from "../geometry/CVec3.js";
import { CVec4 } from "../geometry/CVec4.js";
import { CTexture } from "../render/CTexture.js";
import { CH5Canvas } from "./CH5Canvas.js";
export class CImgPro {
    static Square(_w, _h, _color) {
        var tex = new CTexture();
        tex.SetSize(_w, _h);
        tex.CreateBuf();
        var buf = tex.GetBuf();
        var size = 4 * _w * _h;
        for (var i = 0; i < size; i += 4) {
            buf[i + 0] = 0xff * _color.x;
            buf[i + 1] = 0xff * _color.y;
            buf[i + 2] = 0xff * _color.z;
            buf[i + 3] = 0xff * _color.w;
        }
        return tex;
    }
    static AutoCut(_img, _RGBPass, _rect, _smallCut = 2) {
        var imgBuf = _img.GetBuf()[0];
        var iBuf;
        if (imgBuf instanceof HTMLImageElement) {
            var canvas = document.createElement("canvas");
            canvas.width = imgBuf.width;
            canvas.height = imgBuf.height;
            var ctx = canvas.getContext('2d');
            ctx.drawImage(imgBuf, 0, 0, imgBuf.width, imgBuf.height);
            iBuf = ctx.getImageData(0, 0, imgBuf.width, imgBuf.height);
        }
        else if (imgBuf instanceof Uint8Array) {
            iBuf = new ImageData(_img.GetWidth(), _img.GetHeight());
            iBuf.data.set(imgBuf);
        }
        else {
            CAlert.E("CImgPro::AutoCut() : Invalid texture type");
            return;
        }
        var boundList = new Array();
        var step = new Set();
        function FD(_iBuf, _st) {
            var bound = new CBound();
            var que = new Array();
            que.push(_st);
            while (que.length > 0) {
                var fpos = que.splice(0, 1)[0];
                var off = fpos.x * 4 + fpos.y * _img.GetWidth() * 4;
                if (step.has(off) || fpos.x < 0 || fpos.y < 0 || fpos.x >= _img.GetWidth() || fpos.y >= _img.GetHeight())
                    continue;
                if (iBuf.data[off + 3] == 0 || (_RGBPass != null && iBuf.data[off + 0] == _RGBPass.x && iBuf.data[off + 1] == _RGBPass.y && iBuf.data[off + 2] == _RGBPass.z))
                    continue;
                step.add(off);
                bound.InitBound(new CVec3(fpos.x, fpos.y));
                que.push(new CVec3(fpos.x - 1, fpos.y));
                que.push(new CVec3(fpos.x, fpos.y - 1));
                que.push(new CVec3(fpos.x, fpos.y + 1));
                que.push(new CVec3(fpos.x + 1, fpos.y));
            }
            return bound;
        }
        for (var y = _rect.y; y < _rect.w; ++y) {
            for (var x = _rect.x; x < _rect.z; ++x) {
                var off = x * 4 + y * _img.GetWidth() * 4;
                if (step.has(off))
                    continue;
                if (iBuf.data[off + 3] == 0 || (_RGBPass != null && iBuf.data[off + 0] == _RGBPass.x && iBuf.data[off + 1] == _RGBPass.y && iBuf.data[off + 2] == _RGBPass.z)) {
                    step.add(off);
                    continue;
                }
                let bound = FD(iBuf, new CVec3(x, y));
                if (_smallCut < bound.GetInRadius())
                    boundList.push(bound);
            }
        }
        return boundList;
    }
    static SqurEnlargedReduced(_w, _h, _buf, pa_xScale, pa_yScale, pa_sampleRate) {
        var L_tex = new CTexture();
        var L_orgX = 0, L_orgY = 0;
        var L_add = 0;
        var L_pos = 0, L_dPos = 0;
        var L_texSizeX = Math.trunc((_w * pa_xScale) + 0.99);
        var L_texSizeY = Math.trunc((_h * pa_yScale) + 0.99);
        L_tex.SetSize(L_texSizeX, L_texSizeY);
        L_tex.CreateBuf();
        var L_arr = new Array();
        for (var i = 0; i < 9; ++i) {
            L_arr.push(new CVec4(0, 0, 0, 0));
        }
        var outSizeX = _w;
        var outSizeY = _h;
        var texBuf = L_tex.GetBuf()[0];
        var outBuf = _buf;
        var v4 = CPoolGeo.ProductV4();
        for (var y = 0; y < L_texSizeY; ++y) {
            for (var x = 0; x < L_texSizeX; ++x) {
                L_orgX = Math.trunc(x / pa_xScale);
                L_orgY = Math.trunc(y / pa_yScale);
                L_add = 0;
                if (x + 1 != outSizeX && pa_sampleRate >= 1) {
                    L_pos = L_orgY * outSizeX * 4 + (L_orgX + 1) * 4;
                    L_arr[L_add].x = outBuf[L_pos + 0];
                    L_arr[L_add].y = outBuf[L_pos + 1];
                    L_arr[L_add].z = outBuf[L_pos + 2];
                    L_arr[L_add].w = outBuf[L_pos + 3];
                    L_add++;
                }
                if (L_orgY + 1 != outSizeY && pa_sampleRate >= 2) {
                    L_pos = (L_orgY + 1) * outSizeX * 4 + L_orgX * 4;
                    L_arr[L_add].x = outBuf[L_pos + 0];
                    L_arr[L_add].y = outBuf[L_pos + 1];
                    L_arr[L_add].z = outBuf[L_pos + 2];
                    L_arr[L_add].w = outBuf[L_pos + 3];
                    L_add++;
                }
                if (L_orgX - 1 != -1 && pa_sampleRate >= 3) {
                    L_pos = L_orgY * outSizeX * 4 + (L_orgX - 1) * 4;
                    L_arr[L_add].x = outBuf[L_pos + 0];
                    L_arr[L_add].y = outBuf[L_pos + 1];
                    L_arr[L_add].z = outBuf[L_pos + 2];
                    L_arr[L_add].w = outBuf[L_pos + 3];
                    L_add++;
                }
                if (L_orgY - 1 != -1 && pa_sampleRate >= 4) {
                    L_pos = (L_orgY - 1) * outSizeX * 4 + L_orgX * 4;
                    L_arr[L_add].x = outBuf[L_pos + 0];
                    L_arr[L_add].y = outBuf[L_pos + 1];
                    L_arr[L_add].z = outBuf[L_pos + 2];
                    L_arr[L_add].w = outBuf[L_pos + 3];
                    L_add++;
                }
                {
                    L_pos = L_orgY * outSizeX * 4 + L_orgX * 4;
                    L_arr[L_add].x = outBuf[L_pos + 0];
                    L_arr[L_add].y = outBuf[L_pos + 1];
                    L_arr[L_add].z = outBuf[L_pos + 2];
                    L_arr[L_add].w = outBuf[L_pos + 3];
                    L_add++;
                }
                L_pos = y * L_texSizeX * 4 + x * 4;
                texBuf[L_pos + 0] = 0;
                texBuf[L_pos + 1] = 0;
                texBuf[L_pos + 2] = 0;
                texBuf[L_pos + 3] = 0;
                var all = v4;
                all.Zero();
                for (var i = 0; i < L_add; ++i) {
                    all.x += L_arr[i].x;
                    all.y += L_arr[i].y;
                    all.z += L_arr[i].z;
                    all.w += L_arr[i].w;
                }
                texBuf[L_pos + 0] = Math.trunc(all.x / L_add);
                texBuf[L_pos + 1] = Math.trunc(all.y / L_add);
                texBuf[L_pos + 2] = Math.trunc(all.z / L_add);
                texBuf[L_pos + 3] = Math.trunc(all.w / L_add);
                var add = texBuf[L_pos + 3] + 26;
                if (add > 0xff && all.w != 0)
                    texBuf[L_pos + 3] = 0xff;
                else
                    texBuf[L_pos + 3] = add;
            }
        }
        CPoolGeo.RecycleV4(v4);
        return L_tex;
    }
    static ExtractColorPalette(_img, _size = new CVec2(64, 64), _diffType = "LightWeight") {
        if (_img.GetBuf().length == 0 && _img.mReadPixelEvent != null) {
            _img.mReadPixelEvent.Call(_img);
        }
        const buf = _img.GetBuf()[0];
        if (!buf) {
            CAlert.E("CImgPro::ExtractColorPalette() : No texture buffer");
            return null;
        }
        let pixels;
        if (buf instanceof Image) {
            CH5Canvas.Init(_img.GetWidth(), _img.GetHeight());
            CH5Canvas.DrawImage(buf, 0, 0);
            pixels = CH5Canvas.GetNewTex().GetBuf()[0];
        }
        else {
            pixels = buf;
        }
        function RGBToR(_rgb) {
            return (_rgb & 0x0000FF) >> 0;
        }
        function RGBToG(_rgb) {
            return (_rgb & 0x00FF00) >> 8;
        }
        function RGBToB(_rgb) {
            return (_rgb & 0xFF0000) >> 16;
        }
        function rgbToRGB(_r, _g, _b) {
            return (_r << 0) | (_g << 8) | (_b << 16);
        }
        function Linearize(_val) {
            _val /= 255.0;
            if (_val <= 0.04045) {
                return _val / 12.92;
            }
            else {
                return Math.pow((_val + 0.055) / 1.055, 2.4);
            }
        }
        function F(_t) {
            if (_t > 0.008856) {
                return Math.pow(_t, 1 / 3);
            }
            else {
                return (7.787 * _t) + (16 / 116);
            }
        }
        function RGBToLab(_r, _g, _b) {
            const R = Linearize(_r);
            const G = Linearize(_g);
            const B = Linearize(_b);
            let X = R * 0.4124564 + G * 0.3575761 + B * 0.1804375;
            let Y = R * 0.2126729 + G * 0.7151522 + B * 0.0721750;
            let Z = R * 0.0193339 + G * 0.1191920 + B * 0.9503041;
            const Xn = 0.95047;
            const Yn = 1.00000;
            const Zn = 1.08883;
            X /= Xn;
            Y /= Yn;
            Z /= Zn;
            const fx = F(X);
            const fy = F(Y);
            const fz = F(Z);
            const L = (116 * fy) - 16;
            const a = 500 * (fx - fy);
            const b = 200 * (fy - fz);
            return [L, a, b];
        }
        const colorSet = new Set();
        for (let i = 0; i < pixels.length; i += 4) {
            const r = pixels[i + 0];
            const g = pixels[i + 1];
            const b = pixels[i + 2];
            const rgb = rgbToRGB(r, g, b);
            colorSet.add(rgb);
        }
        const colorArr = Array.from(colorSet);
        let cellSize = 0;
        const outPixelNum = _size.x * _size.y;
        let low = 1, high = Math.ceil(Math.cbrt(outPixelNum));
        while (low <= high) {
            const mid = Math.floor((low + high) / 2);
            const midCubed = mid * mid * mid;
            if (midCubed <= outPixelNum) {
                cellSize = mid;
                low = mid + 1;
            }
            else {
                high = mid - 1;
            }
        }
        function CellToColor(_cellIndex) {
            return Math.round(255 / (cellSize - 1) * _cellIndex);
        }
        function Diff(_rgb, _r, _g, _b) {
            const r = RGBToR(_rgb);
            const g = RGBToG(_rgb);
            const b = RGBToB(_rgb);
            if (_diffType == "RGB") {
                const deltaR = r - _r;
                const deltaG = g - _g;
                const deltaB = b - _b;
                return deltaR * deltaR + deltaG * deltaG + deltaB * deltaB;
            }
            if (_diffType == "LightWeight") {
                const lumaR = 0.299, lumaG = 0.587, lumaB = 0.114;
                const lumaWeight = 0.75;
                const luma1 = r * lumaR + g * lumaG + b * lumaB;
                const luma2 = _r * lumaR + _g * lumaG + _b * lumaB;
                const lumaDelta = luma1 - luma2;
                const deltaR = RGBToR(_rgb) - _r;
                const deltaG = RGBToG(_rgb) - _g;
                const deltaB = RGBToB(_rgb) - _b;
                return (deltaR * deltaR * lumaR + deltaG * deltaG * lumaG + deltaB * deltaB * lumaB) * lumaWeight + lumaDelta * lumaDelta;
            }
            if (_diffType == "CIE76") {
                const [l1, a1, b1] = RGBToLab(r, g, b);
                const [l2, a2, b2] = RGBToLab(_r, _g, _b);
                const deltaL = l1 - l2;
                const deltaA = a1 - a2;
                const deltaB = b1 - b2;
                return deltaL * deltaL + deltaA * deltaA + deltaB * deltaB;
            }
        }
        function Mapping(_r, _g, _b) {
            const index = _r + _g * cellSize + _b * cellSize * cellSize;
            return new CVec2(Math.floor(index / _size.x), (index % _size.x));
        }
        const outColors = new Uint8Array(_size.x * _size.y * 4);
        for (let bCell = 0; bCell < cellSize; bCell++) {
            for (let gCell = 0; gCell < cellSize; gCell++) {
                for (let rCell = 0; rCell < cellSize; rCell++) {
                    let closestIndex = 0;
                    let closest = Diff(colorArr[0], CellToColor(rCell), CellToColor(gCell), CellToColor(bCell));
                    for (let i = 1; i < colorArr.length; i++) {
                        const diff = Diff(colorArr[i], CellToColor(rCell), CellToColor(gCell), CellToColor(bCell));
                        if (diff < closest) {
                            closest = diff;
                            closestIndex = i;
                        }
                    }
                    const uv = Mapping(rCell, gCell, bCell);
                    const index = uv.x + uv.y * _size.x;
                    outColors[index * 4 + 0] = RGBToR(colorArr[closestIndex]);
                    outColors[index * 4 + 1] = RGBToG(colorArr[closestIndex]);
                    outColors[index * 4 + 2] = RGBToB(colorArr[closestIndex]);
                    outColors[index * 4 + 3] = 255.0;
                }
            }
        }
        const out = new CTexture();
        out.SetFilter(CTexture.eFilter.Neaest);
        out.SetWrap(CTexture.eWrap.Clamp);
        out.SetMipMap(CTexture.eMipmap.None);
        out.SetSize(_size.x, _size.y);
        out.SetBuf(outColors);
        return out;
    }
}
