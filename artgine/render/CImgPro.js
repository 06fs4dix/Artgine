import { CAlert } from "../basic/CAlert.js";
import { CBound } from "../geometry/CBound.js";
import { CPoolGeo } from "../geometry/CPoolGeo.js";
import { CVec3 } from "../geometry/CVec3.js";
import { CVec4 } from "../geometry/CVec4.js";
import { CTexture } from "../render/CTexture.js";
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
}
