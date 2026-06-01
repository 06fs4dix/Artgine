import { CAlert } from "../basic/CAlert.js";
import { CBound } from "../geometry/CBound.js";
import { CMath } from "../geometry/CMath.js";
import { CPoolGeo } from "../geometry/CPoolGeo.js";
import { CVec2 } from "../geometry/CVec2.js";
import { CVec3 } from "../geometry/CVec3.js";
import { CVec4 } from "../geometry/CVec4.js";
import { CTexture, CTextureInfo } from "../render/CTexture.js";
import { SDF } from "../z_file/SDF.js";
import { CH5Canvas } from "./CH5Canvas.js";
import { CUtilRender } from "./CUtilRender.js";
export class CImgPro {
    static Square(_w, _h, _color) {
        var tex = new CTexture();
        tex.SetSize(_w, _h);
        tex.CreateBuf();
        var buf = tex.GetBuf()[0];
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
    static SphericalGaussianBlur(_tex, _infoIndex = 0, _maxSamples = 128) {
        const v3 = CPoolGeo.ProductV3();
        const LOD_MAX = Math.floor(Math.log2(_tex.GetWidth()));
        const LOD_MIN = 4;
        const PHI = (1 + Math.sqrt(5)) / 2;
        const INV_PHI = 1 / PHI;
        const AxisDirections = [
            new CVec3(-PHI, INV_PHI, 0),
            new CVec3(PHI, INV_PHI, 0),
            new CVec3(-INV_PHI, 0, PHI),
            new CVec3(INV_PHI, 0, PHI),
            new CVec3(0, PHI, -INV_PHI),
            new CVec3(0, PHI, INV_PHI),
            new CVec3(-1, 1, -1),
            new CVec3(1, 1, -1),
            new CVec3(-1, 1, 1),
            new CVec3(1, 1, 1)
        ];
        const rawBuf = _tex.GetBuf();
        const buf = [];
        let bufIndex = 0;
        let bufInfo;
        for (let i = 0; i < _tex.GetInfo().length; i++) {
            let info = _tex.GetInfo()[i];
            let count = info.mTarget === CTexture.eTarget.Cube ? 6 : (info.mTarget === CTexture.eTarget.Array ? info.mCount : 1);
            for (let j = 0; j < count; j++, bufIndex++) {
                if (bufIndex >= _tex.GetBuf().length) {
                    continue;
                }
                if (i != _infoIndex) {
                    continue;
                }
                bufInfo = info;
                buf.push(rawBuf[bufIndex]);
            }
        }
        const isBufferFloat = buf[0] instanceof Float32Array;
        const isFloatType = bufInfo.mFormat == CTexture.eFormat.RGBA32F;
        const ArrayBufferType = isFloatType ? Float32Array : Uint8Array;
        const sigmas = [];
        const sizeLods = [];
        let currentLod = LOD_MAX;
        const totalLods = LOD_MAX - LOD_MIN + 1;
        for (let i = 0; i < totalLods; i++) {
            const sizeLod = Math.pow(2, currentLod);
            sizeLods.push(sizeLod);
            const t = i / (totalLods - 1);
            const sigmaExt = i == 0 ? 0 : 1 / sizeLod;
            const roughness = t * 0.582;
            const sigma = CMath.FloatInterpolate(sigmaExt, roughness, t);
            sigmas.push(sigma);
            if (currentLod > LOD_MIN) {
                currentLod--;
            }
        }
        const cubeUVOutputs = [];
        const pingpongBuffer = [];
        for (let mip = 0; mip < totalLods; mip++) {
            const size = sizeLods[mip];
            for (let face = 0; face < 6; face++) {
                const floatK = isBufferFloat ? 1 : 255;
                const outData = new ArrayBufferType(size * size * 4);
                if (mip == 0) {
                    if (_tex.GetYFlip()) {
                        for (let y = 0; y < size; y++)
                            for (let x = 0; x < size; x++) {
                                const flippexIdx = 4 * ((size - 1 - y) * size + x);
                                const idx = 4 * (y * size + x);
                                outData[idx + 0] = buf[face][flippexIdx + 0] / floatK;
                                outData[idx + 1] = buf[face][flippexIdx + 1] / floatK;
                                outData[idx + 2] = buf[face][flippexIdx + 2] / floatK;
                                outData[idx + 3] = buf[face][flippexIdx + 3] / floatK;
                            }
                    }
                    else
                        outData.set(buf[face]);
                }
                cubeUVOutputs.push(outData);
                pingpongBuffer.push(new ArrayBufferType(size * size * 4));
            }
        }
        for (let i = 1; i < totalLods; i++) {
            const lodIn = i - 1;
            const lodOut = i;
            const sigma = Math.sqrt(sigmas[i] * sigmas[i] - sigmas[i - 1] * sigmas[i - 1]);
            const axisDir = AxisDirections[(totalLods - i - 1) % AxisDirections.length];
            HalfBlur(cubeUVOutputs, pingpongBuffer, lodIn, lodOut, sigma, true, axisDir);
            HalfBlur(pingpongBuffer, cubeUVOutputs, lodOut, lodOut, sigma, false, axisDir);
        }
        const mipmaps = [];
        for (let mip = 0; mip < totalLods; mip++) {
            const tex = new CTexture();
            mipmaps.push(tex);
            tex.PushInfo([new CTextureInfo(CTexture.eTarget.Sigle, isFloatType ? CTexture.eFormat.RGBA32F : CTexture.eFormat.RGBA8, 1)]);
            tex.SetSize(sizeLods[mip], sizeLods[mip]);
            tex.GetBuf().push(cubeUVOutputs[mip * 6 + 0], cubeUVOutputs[mip * 6 + 1], cubeUVOutputs[mip * 6 + 2], cubeUVOutputs[mip * 6 + 3], cubeUVOutputs[mip * 6 + 4], cubeUVOutputs[mip * 6 + 5]);
        }
        CPoolGeo.RecycleV3(v3);
        return mipmaps;
        function HalfBlur(_bufIn, _bufOut, _lodIn, _lodOut, _sigmaRadians, _isLatitudinal, _poleAxis) {
            const STANDARD_DEVIATIONS = 3;
            const sizeIn = sizeLods[_lodIn];
            const sizeOut = sizeLods[_lodOut];
            const invSizeOut = 1 / sizeOut;
            const pixels = sizeIn - 1;
            const isSigmaFinite = isFinite(_sigmaRadians);
            const radiansPerPixel = isSigmaFinite ? Math.PI / (2 * pixels) : (2 * Math.PI) / (2 * _maxSamples - 1);
            const sigmaPixels = _sigmaRadians / radiansPerPixel;
            const samples = isSigmaFinite ? 1 + Math.floor(STANDARD_DEVIATIONS * sigmaPixels) : _maxSamples;
            const sampleCount = Math.min(samples, _maxSamples);
            const weights = new Float32Array(_maxSamples);
            const cosTable = new Float32Array(_maxSamples);
            const sinTable = new Float32Array(_maxSamples);
            let sum = 0;
            for (let s = 0; s < _maxSamples; ++s) {
                const x = s / sigmaPixels;
                const w = Math.exp(-x * x / 2);
                weights[s] = w;
                const theta = radiansPerPixel * s;
                cosTable[s] = Math.cos(theta);
                sinTable[s] = Math.sin(theta);
                if (s === 0)
                    sum += w;
                else if (s < sampleCount)
                    sum += 2 * w;
            }
            for (let s = 0; s < weights.length; s++) {
                weights[s] /= sum;
            }
            for (let face = 0; face < 6; face++) {
                const outFaceIndex = _lodOut * 6 + face;
                const outBuf = _bufOut[outFaceIndex];
                let outIdx = 0;
                for (let y = 0; y < sizeOut; y++) {
                    const v = 1.0 - (y + 0.5) * invSizeOut * 2.0;
                    for (let x = 0; x < sizeOut; x++) {
                        const u = (x + 0.5) * invSizeOut * 2.0 - 1.0;
                        let dvX = 0, dvY = 0, dvZ = 0;
                        switch (face) {
                            case 0:
                                dvX = 1.0;
                                dvY = v;
                                dvZ = -u;
                                break;
                            case 1:
                                dvX = -1.0;
                                dvY = v;
                                dvZ = u;
                                break;
                            case 2:
                                dvX = u;
                                dvY = 1.0;
                                dvZ = -v;
                                break;
                            case 3:
                                dvX = u;
                                dvY = -1.0;
                                dvZ = v;
                                break;
                            case 4:
                                dvX = u;
                                dvY = v;
                                dvZ = 1.0;
                                break;
                            case 5:
                                dvX = -u;
                                dvY = v;
                                dvZ = -1.0;
                                break;
                        }
                        const dvLen = Math.sqrt(dvX * dvX + dvY * dvY + dvZ * dvZ);
                        const outDirX = dvX / dvLen;
                        const outDirY = dvY / dvLen;
                        const outDirZ = dvZ / dvLen;
                        let axX = 0, axY = 0, axZ = 0;
                        if (_isLatitudinal) {
                            axX = _poleAxis.x;
                            axY = _poleAxis.y;
                            axZ = _poleAxis.z;
                        }
                        else {
                            axX = _poleAxis.y * outDirZ - _poleAxis.z * outDirY;
                            axY = _poleAxis.z * outDirX - _poleAxis.x * outDirZ;
                            axZ = _poleAxis.x * outDirY - _poleAxis.y * outDirX;
                        }
                        const axLenSq = axX * axX + axY * axY + axZ * axZ;
                        let axisX = axX, axisY = axY, axisZ = axZ;
                        if (axLenSq < 0.000001) {
                            axisX = outDirZ;
                            axisY = 0.0;
                            axisZ = -outDirX;
                        }
                        const axLen = Math.sqrt(axisX * axisX + axisY * axisY + axisZ * axisZ);
                        axisX /= axLen;
                        axisY /= axLen;
                        axisZ /= axLen;
                        const dotProd = axisX * outDirX + axisY * outDirY + axisZ * outDirZ;
                        const cxX = axisY * outDirZ - axisZ * outDirY;
                        const cxY = axisZ * outDirX - axisX * outDirZ;
                        const cxZ = axisX * outDirY - axisY * outDirX;
                        let totalR = 0, totalG = 0, totalB = 0;
                        for (let s = 0; s < sampleCount; s++) {
                            const w = weights[s];
                            const cosTheta = cosTable[s];
                            const sinTheta = sinTable[s];
                            const oneMinusCos = 1.0 - cosTheta;
                            const odCos_X = outDirX * cosTheta;
                            const odCos_Y = outDirY * cosTheta;
                            const odCos_Z = outDirZ * cosTheta;
                            const axDot = axisX * dotProd * oneMinusCos;
                            const ayDot = axisX * dotProd * oneMinusCos;
                            const azDot = axisX * dotProd * oneMinusCos;
                            if (s === 0) {
                                const sDirX = odCos_X + cxX * sinTheta + axDot;
                                const sDirY = odCos_Y + cxY * sinTheta + ayDot;
                                const sDirZ = odCos_Z + cxZ * sinTheta + azDot;
                                const rgb = SampleCubeMip(_bufIn, _lodIn, sDirX, sDirY, sDirZ);
                                totalR += w * rgb.x;
                                totalG += w * rgb.y;
                                totalB += w * rgb.z;
                            }
                            else {
                                const sDirX_p = odCos_X + cxX * sinTheta + axDot;
                                const sDirY_p = odCos_Y + cxY * sinTheta + ayDot;
                                const sDirZ_p = odCos_Z + cxZ * sinTheta + azDot;
                                let rgb = SampleCubeMip(_bufIn, _lodIn, sDirX_p, sDirY_p, sDirZ_p);
                                totalR += w * rgb.x;
                                totalG += w * rgb.y;
                                totalB += w * rgb.z;
                                const sDirX_n = odCos_X - cxX * sinTheta + axDot;
                                const sDirY_n = odCos_Y - cxY * sinTheta + ayDot;
                                const sDirZ_n = odCos_Z - cxZ * sinTheta + azDot;
                                rgb = SampleCubeMip(_bufIn, _lodIn, sDirX_n, sDirY_n, sDirZ_n);
                                totalR += w * rgb.x;
                                totalG += w * rgb.y;
                                totalB += w * rgb.z;
                            }
                        }
                        outBuf[outIdx++] = totalR;
                        outBuf[outIdx++] = totalG;
                        outBuf[outIdx++] = totalB;
                        outBuf[outIdx++] = isFloatType ? 1 : 255;
                    }
                }
            }
        }
        function SampleCubeMip(_buf, _lod, _rx, _ry, _rz) {
            const absX = Math.abs(_rx);
            const absY = Math.abs(_ry);
            const absZ = Math.abs(_rz);
            let face = 0;
            let uc = 0, vc = 0, ma = 0;
            if (absX >= absY && absX >= absZ) {
                if (_rx > 0) {
                    face = 0;
                    uc = -_rz;
                    vc = _ry;
                    ma = _rx;
                }
                else {
                    face = 1;
                    uc = _rz;
                    vc = _ry;
                    ma = absX;
                }
            }
            else if (absY >= absX && absY >= absZ) {
                if (_ry > 0) {
                    face = 2;
                    uc = _rx;
                    vc = -_rz;
                    ma = _ry;
                }
                else {
                    face = 3;
                    uc = _rx;
                    vc = _rz;
                    ma = absY;
                }
            }
            else {
                if (_rz > 0) {
                    face = 4;
                    uc = _rx;
                    vc = _ry;
                    ma = _rz;
                }
                else {
                    face = 5;
                    uc = -_rx;
                    vc = _ry;
                    ma = absZ;
                }
            }
            const u = 0.5 * (uc / ma + 1.0);
            const v = 0.5 * (1.0 - vc / ma);
            const src = _buf[_lod * 6 + face];
            const w = sizeLods[_lod];
            const h = sizeLods[_lod];
            const texX = u * w - 0.5;
            const texY = v * h - 0.5;
            const x0 = Math.max(0, Math.min(w - 1, Math.floor(texX)));
            const y0 = Math.max(0, Math.min(h - 1, Math.floor(texY)));
            const x1 = Math.max(0, Math.min(w - 1, x0 + 1));
            const y1 = Math.max(0, Math.min(h - 1, y0 + 1));
            const fX = texX - Math.floor(texX);
            const fY = texY - Math.floor(texY);
            const idx00 = (y0 * w + x0) * 4;
            const idx10 = (y0 * w + x1) * 4;
            const idx01 = (y1 * w + x0) * 4;
            const idx11 = (y1 * w + x1) * 4;
            const w00 = (1.0 - fX) * (1.0 - fY);
            const w10 = fX * (1.0 - fY);
            const w01 = (1.0 - fX) * fY;
            const w11 = fX * fY;
            v3.x = (src[idx00 + 0] * w00 + src[idx10 + 0] * w10 + src[idx01 + 0] * w01 + src[idx11 + 0] * w11);
            v3.y = (src[idx00 + 1] * w00 + src[idx10 + 1] * w10 + src[idx01 + 1] * w01 + src[idx11 + 1] * w11);
            v3.z = (src[idx00 + 2] * w00 + src[idx10 + 2] * w10 + src[idx01 + 2] * w01 + src[idx11 + 2] * w11);
            return v3;
        }
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
    static CreateNoiseTexture(_type, _zVal = 0, _size = new CVec2(128, 128), _normalMap = false) {
        var blendInc = 0.2;
        var skirtWidth = Math.max(1, Math.floor(_size.x * blendInc));
        var skirtHeight = Math.max(1, Math.floor(_size.y * blendInc));
        var srcWidth = _size.x + skirtWidth;
        var srcHeight = _size.y + skirtHeight;
        function Remap(_val, _min1, _max1, _min2, _max2) {
            return _min2 + (_val - _min1) / (_max1 - _min1) * (_max2 - _min2);
        }
        var NoiseFunc = null;
        switch (_type) {
            case SDF.eNoise.Perlin:
                NoiseFunc = CUtilRender.NoisePerlin.bind(CUtilRender);
                break;
            case SDF.eNoise.PerlinNormal:
                NoiseFunc = CUtilRender.NoiseCellular.bind(CUtilRender);
                break;
        }
        if (NoiseFunc == null) {
            return null;
        }
        var prevBuffer = new Uint8Array(srcWidth * srcHeight * 4);
        var idx = 0;
        for (var y = 0; y < srcHeight; y++) {
            for (var x = 0; x < srcWidth; x++) {
                prevBuffer[idx * 4 + 0] = Math.round(Remap(NoiseFunc(x, y, _zVal), -1, 1, 0, 1) * 255.0);
                prevBuffer[idx * 4 + 3] = 255;
                idx++;
            }
        }
        if (_normalMap) {
            for (var ty = 0; ty < _size.y; ty++) {
                let py = ty + 1;
                if (py >= _size.y) {
                    py -= _size.y;
                }
                for (let tx = 0; tx < _size.x; tx++) {
                    let px = tx + 1;
                    if (px >= _size.x) {
                        px -= _size.x;
                    }
                    var here = buffer[(ty * _size.x + tx) * 4 + 0];
                    var to_right = buffer[(ty * _size.x + px) * 4 + 0];
                    var above = buffer[(py * _size.x + tx) * 4 + 0];
                    var up = new CVec3(0, (here - above) * 8.0, 1);
                    var across = new CVec3(1, (to_right - here) * 8.0, 0);
                    var normal = CMath.V3Cross(across, up);
                    CMath.V3Nor(normal, normal);
                    buffer[(ty * _size.x + tx) * 4 + 0] = Math.round(127.5 + normal.x * 127.5);
                    buffer[(ty * _size.x + tx) * 4 + 1] = Math.round(127.5 + normal.y * 127.5);
                    buffer[(ty * _size.x + tx) * 4 + 2] = Math.round(127.5 + normal.z * 127.5);
                    buffer[(ty * _size.x + tx) * 4 + 3] = 255;
                }
            }
        }
        var buffer = new Uint8Array(_size.x * _size.y * 4);
        var halfWidth = Math.floor(_size.x * 0.5);
        var halfHeight = Math.floor(_size.y * 0.5);
        var skirtEdgeX = halfWidth + skirtWidth;
        var skirtEdgeY = halfHeight + skirtHeight;
        let AltModulo;
        (function (AltModulo) {
            AltModulo[AltModulo["DEFAULT"] = 0] = "DEFAULT";
            AltModulo[AltModulo["ALT_X"] = 1] = "ALT_X";
            AltModulo[AltModulo["ALT_Y"] = 2] = "ALT_Y";
            AltModulo[AltModulo["ALT_XY"] = 3] = "ALT_XY";
        })(AltModulo || (AltModulo = {}));
        ;
        class ImgBuf {
            mBuf;
            mWidth;
            mHeight;
            mOffsetX;
            mOffsetY;
            mAltWidth;
            mAltHeight;
            constructor(_buf, _width, _height, _offsetX, _offsetY, _altWidth, _altHeight) {
                this.mBuf = _buf;
                this.mWidth = _width;
                this.mHeight = _height;
                this.mOffsetX = _offsetX;
                this.mOffsetY = _offsetY;
                this.mAltWidth = _altWidth;
                this.mAltHeight = _altHeight;
            }
            Get(_x, _y, _mode, _rVal = new CVec4()) {
                const index = this.CalcIndex(_x, _y, _mode);
                _rVal.mF32A[0] = this.mBuf[index * 4 + 0];
                _rVal.mF32A[1] = this.mBuf[index * 4 + 1];
                _rVal.mF32A[2] = this.mBuf[index * 4 + 2];
                _rVal.mF32A[3] = this.mBuf[index * 4 + 3];
                return _rVal;
            }
            Set(_x, _y, _mode, _val) {
                const index = this.CalcIndex(_x, _y, _mode);
                if (typeof _val == "number") {
                    this.mBuf[index * 4 + 0] = _val;
                }
                else if (_val instanceof CVec2) {
                    this.mBuf[index * 4 + 0] = _val.x;
                    this.mBuf[index * 4 + 1] = _val.y;
                }
                else if (_val instanceof CVec3) {
                    this.mBuf[index * 4 + 0] = _val.x;
                    this.mBuf[index * 4 + 1] = _val.y;
                    this.mBuf[index * 4 + 2] = _val.z;
                }
                else {
                    this.mBuf[index * 4 + 0] = _val.x;
                    this.mBuf[index * 4 + 1] = _val.y;
                    this.mBuf[index * 4 + 2] = _val.z;
                    this.mBuf[index * 4 + 3] = _val.w;
                }
            }
            CalcIndex(_x, _y, _mode) {
                let x, y;
                switch (_mode) {
                    case AltModulo.ALT_XY:
                        x = ((_x + this.mOffsetX) % this.mAltWidth + this.mAltWidth) % this.mAltWidth;
                        y = ((_y + this.mOffsetY) % this.mAltHeight + this.mAltHeight) % this.mAltHeight;
                        break;
                    case AltModulo.ALT_X:
                        x = ((_x + this.mOffsetX) % this.mAltWidth + this.mAltWidth) % this.mAltWidth;
                        y = ((_y + this.mOffsetY) % this.mHeight + this.mHeight) % this.mHeight;
                        break;
                    case AltModulo.ALT_Y:
                        x = ((_x + this.mOffsetX) % this.mWidth + this.mWidth) % this.mWidth;
                        y = ((_y + this.mOffsetY) % this.mAltHeight + this.mAltHeight) % this.mAltHeight;
                        break;
                    default:
                        x = ((_x + this.mOffsetX) % this.mWidth + this.mWidth) % this.mWidth;
                        y = ((_y + this.mOffsetY) % this.mHeight + this.mHeight) % this.mHeight;
                        break;
                }
                return x + y * this.mWidth;
            }
        }
        function Smoothstep(_from, _to, _s) {
            var s = CMath.Clamp((_s - _from) / (_to - _from), 0.0, 1.0);
            return s * s * (3 - 2 * s);
        }
        function AlphaBlend(_bg, _fg, _alpha, out = new CVec4()) {
            var alpha = _alpha;
            var invAlpha = 255 - _alpha;
            out.x = (alpha * _fg.x + invAlpha * _bg.x) / 255;
            out.y = (alpha * _fg.y + invAlpha * _bg.y) / 255;
            out.z = (alpha * _fg.z + invAlpha * _bg.z) / 255;
            out.w = (alpha * _fg.w + invAlpha * _bg.w) / 255;
            return out;
        }
        var rd_src = new ImgBuf(prevBuffer, srcWidth, srcHeight, halfWidth, halfHeight, _size.x, _size.y);
        var rd_dest = new ImgBuf(buffer, _size.x, _size.y, 0, 0, 0, 0);
        var v4d0 = new CVec4();
        var v4d1 = new CVec4();
        var v4d2 = new CVec4();
        var v4d3 = new CVec4();
        for (var y = 0; y < _size.y; y++) {
            for (var x = 0; x < _size.x; x++) {
                rd_dest.Set(x, y, AltModulo.DEFAULT, rd_src.Get(x, y, AltModulo.ALT_XY, v4d0));
            }
        }
        for (var x = halfWidth; x < skirtEdgeX; x++) {
            var alpha = Math.floor(255 * (1 - Smoothstep(0.1, 0.9, (x - halfWidth) / skirtWidth)));
            for (var y = 0; y < _size.y; y++) {
                if (y == halfHeight) {
                    y = skirtEdgeY - 1;
                }
                else {
                    rd_dest.Set(x, y, AltModulo.DEFAULT, AlphaBlend(rd_dest.Get(x, y, AltModulo.DEFAULT, v4d0), rd_src.Get(x, y, AltModulo.ALT_Y, v4d1), alpha, v4d2));
                }
            }
        }
        for (var y = halfHeight; y < skirtEdgeY; y++) {
            var alpha = Math.floor(255 * (1 - Smoothstep(0.1, 0.9, (y - halfHeight) / skirtHeight)));
            for (var x = 0; x < _size.x; x++) {
                if (x == halfWidth) {
                    x = skirtEdgeX - 1;
                }
                else {
                    rd_dest.Set(x, y, AltModulo.DEFAULT, AlphaBlend(rd_dest.Get(x, y, AltModulo.DEFAULT, v4d0), rd_src.Get(x, y, AltModulo.ALT_X, v4d1), alpha, v4d2));
                }
            }
        }
        for (var y = halfHeight; y < skirtEdgeY; y++) {
            for (var x = halfWidth; x < skirtEdgeX; x++) {
                var xpos = Math.floor(255 * (1 - Smoothstep(0.1, 0.9, (x - halfWidth) / skirtWidth)));
                var ypos = Math.floor(255 * (1 - Smoothstep(0.1, 0.9, (y - halfHeight) / skirtHeight)));
                var topBlend = AlphaBlend(rd_src.Get(x, y, AltModulo.ALT_X, v4d0), rd_src.Get(x, y, AltModulo.DEFAULT, v4d1), xpos, v4d2);
                var botBlend = AlphaBlend(rd_src.Get(x, y, AltModulo.ALT_XY, v4d0), rd_src.Get(x, y, AltModulo.ALT_Y, v4d1), xpos, v4d3);
                rd_dest.Set(x, y, AltModulo.DEFAULT, AlphaBlend(botBlend, topBlend, ypos));
            }
        }
        const out = new CTexture();
        out.PushInfo([new CTextureInfo(CTexture.eTarget.Sigle, CTexture.eFormat.RGBA8)]);
        out.SetFilter(CTexture.eFilter.Neaest);
        out.SetWrap(CTexture.eWrap.Repeat);
        out.SetMipMap(CTexture.eMipmap.GL);
        out.SetSize(_size.x, _size.y);
        out.SetBuf(buffer);
        return out;
    }
    static Create3DNoiseTexture(_type, _size = new CVec3(128, 128, 128), _normalMap = false) {
        var blendInc = 0.2;
        var skirtDepth = Math.max(1, Math.floor(_size.z * blendInc));
        var srcDepth = _size.z + skirtDepth;
        const src = [];
        for (let z = 0; z < srcDepth; z++) {
            const tex = this.CreateNoiseTexture(_type, z, new CVec2(_size.x, _size.y), _normalMap);
            src.push(tex);
        }
        const out = new Array(_size.z);
        var halfDepth = Math.floor(_size.z * 0.5);
        var skirtEdgeZ = halfDepth + skirtDepth;
        function Smoothstep(_from, _to, _s) {
            var s = CMath.Clamp((_s - _from) / (_to - _from), 0.0, 1.0);
            return s * s * (3 - 2 * s);
        }
        for (var i = 0; i < halfDepth; i++) {
            const tex = src[i];
            src[i] = src[i + halfDepth];
            src[i + halfDepth] = tex;
            out[i] = src[i];
            out[i + halfDepth] = src[i + halfDepth];
        }
        for (var z = halfDepth; z < skirtEdgeZ; z++) {
            var alpha = Math.floor(255 * (1 - Smoothstep(0.1, 0.9, (z - halfDepth) / skirtDepth)));
            var a = alpha + 1;
            var invA = 256 - alpha;
            var img = src[z % _size.z];
            var skirt = src[(z - halfDepth) + _size.z];
            var buffer = new Uint8Array(img.GetWidth() * img.GetHeight() * 4);
            for (var i = 0; i < img.GetWidth() * img.GetHeight() * 4; i++) {
                var fg = skirt.GetBuf()[0][i];
                var bg = img.GetBuf()[0][i];
                buffer[i] = (a * fg + invA * bg) >> 8;
            }
            const tex = new CTexture();
            tex.PushInfo([new CTextureInfo(CTexture.eTarget.Sigle, CTexture.eFormat.RGBA8)]);
            tex.SetFilter(CTexture.eFilter.Neaest);
            tex.SetWrap(CTexture.eWrap.Repeat);
            tex.SetMipMap(CTexture.eMipmap.GL);
            tex.SetSize(_size.x, _size.y);
            tex.SetBuf(buffer);
            out[z % _size.z] = tex;
        }
        var minValX = 10000;
        var maxValX = -10000;
        for (var z = 0; z < _size.z; z++) {
            var idx = 0;
            for (var y = 0; y < _size.y; y++) {
                for (var x = 0; x < _size.x; x++) {
                    if (minValX > out[z].GetBuf()[0][idx * 4 + 0])
                        minValX = out[z].GetBuf()[0][idx * 4 + 0];
                    if (maxValX < out[z].GetBuf()[0][idx * 4 + 0])
                        maxValX = out[z].GetBuf()[0][idx * 4 + 0];
                    idx++;
                }
            }
        }
        for (var z = 0; z < _size.z; z++) {
            var idx = 0;
            for (var y = 0; y < _size.y; y++) {
                for (var x = 0; x < _size.x; x++) {
                    if (maxValX == minValX)
                        out[z].GetBuf()[0][idx * 4 + 0] = 0;
                    else
                        out[z].GetBuf()[0][idx * 4 + 0] = CMath.Clamp((out[z].GetBuf()[0][idx * 4 + 0] - minValX) / (maxValX - minValX) * 255, 0, 255);
                    idx++;
                }
            }
        }
        return out;
    }
    static DrawBrush(_targetTex, _boundary, _center, _brushSize, _channel, _brushStrength, _type, _brushTex) {
        if (_targetTex.GetBuf().length == 0)
            _targetTex.CreateBuf();
        const targetBuf = _targetTex.GetBuf()[0];
        const bound = _boundary.GetSize();
        const invBoundX = 1.0 / bound.x;
        const invBoundY = 1.0 / bound.y;
        const center = new CVec2(Math.floor((_center.x - _boundary.mMin.x) * invBoundX * _targetTex.GetWidth()), Math.floor((_center.y - _boundary.mMin.y) * invBoundY * _targetTex.GetHeight()));
        const brushSize = new CVec2(Math.floor(_brushSize.x * 0.5 * invBoundX * _targetTex.GetWidth()), Math.floor(_brushSize.y * 0.5 * invBoundY * _targetTex.GetHeight()));
        const minX = CMath.Clamp(center.x - brushSize.x, 0, _targetTex.GetWidth() - 1);
        const minY = CMath.Clamp(center.y - brushSize.y, 0, _targetTex.GetHeight() - 1);
        const maxX = CMath.Clamp(center.x + brushSize.x, 0, _targetTex.GetWidth() - 1);
        const maxY = CMath.Clamp(center.y + brushSize.y, 0, _targetTex.GetHeight() - 1);
        const color = new CVec4();
        const activeChannels = [];
        if (_channel == 4) {
            activeChannels.push(0, 1, 2, 3);
            color.mF32A[0] = (_brushStrength >>> 24) & 0xFF;
            color.mF32A[1] = (_brushStrength >>> 16) & 0xFF;
            color.mF32A[2] = (_brushStrength >>> 8) & 0xFF;
            color.mF32A[3] = _brushStrength & 0xFF;
        }
        else {
            activeChannels.push(_channel);
            color.mF32A[_channel] = _brushStrength;
        }
        if (_brushTex.GetBuf().length == 0)
            _brushTex.CreateBuf();
        const brushBuf = _brushTex.GetBuf()[0];
        const GetPixelConst = (_x, _y) => {
            _x = CMath.Clamp(_x, 0, _brushTex.GetWidth() - 1);
            _y = CMath.Clamp(_y, 0, _brushTex.GetHeight() - 1);
            return brushBuf[(_y * _brushTex.GetWidth() + _x) * 4 + 3];
        };
        var SampleBrushTex = (_uv) => {
            const texXY = new CVec2(_uv.x * _brushTex.GetWidth() - 0.5, _uv.y * _brushTex.GetHeight() - 0.5);
            const x0 = Math.floor(texXY.x);
            const y0 = Math.floor(texXY.y);
            const x1 = x0 + 1;
            const y1 = y0 + 1;
            const fx = texXY.x - x0;
            const fy = texXY.y - y0;
            const c00 = GetPixelConst(x0, y0);
            const c10 = GetPixelConst(x1, y0);
            const c01 = GetPixelConst(x0, y1);
            const c11 = GetPixelConst(x1, y1);
            const tx0 = c00 + fx * (c10 - c00);
            const tx1 = c01 + fx * (c11 - c01);
            return tx0 + fy * (tx1 - tx0);
        };
        for (let ty = minY; ty <= maxY; ty++)
            for (let tx = minX; tx <= maxX; tx++) {
                const dx = tx - center.x;
                const dy = ty - center.y;
                const brushUV = new CVec2(dx / brushSize.x * 0.5 + 0.5, dy / brushSize.y * 0.5 + 0.5);
                if (brushUV.x < 0 || brushUV.x >= 1 || brushUV.y < 0 || brushUV.y >= 1)
                    continue;
                let falloff = 1.0;
                if (_type === 2) {
                    const dx = (brushUV.x - 0.5) * 2.0;
                    const dy = (brushUV.y - 0.5) * 2.0;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist >= 1.0)
                        continue;
                    falloff = 1.0 - dist;
                }
                const targetIdx = ((_targetTex.GetHeight() - 1 - ty) * _targetTex.GetWidth() + tx) * 4;
                const mask = SampleBrushTex(brushUV) / 255;
                if (mask <= 0)
                    continue;
                for (const ch of activeChannels) {
                    const srcVal = color.mF32A[ch] * falloff;
                    if (_type === 0 || _type === 2) {
                        if (mask > 0)
                            targetBuf[targetIdx + ch] = CMath.FloatInterpolate(0, srcVal, mask);
                    }
                    else {
                        targetBuf[targetIdx + ch] = CMath.FloatInterpolate(targetBuf[targetIdx + ch], CMath.Clamp(targetBuf[targetIdx + ch] + srcVal, 0, 255), mask);
                    }
                }
            }
    }
}
