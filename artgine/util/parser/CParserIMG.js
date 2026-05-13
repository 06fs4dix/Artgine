import { CH5Canvas } from "../../render/CH5Canvas.js";
import { CTexture } from "../../render/CTexture.js";
import { CParser } from "./CParser.js";
export class CParserIMG extends CParser {
    mAlphaCut = 0;
    mAlphaBleed = true;
    constructor() {
        super();
    }
    GetResult() {
        return this.mResult;
    }
    Load(pa_fileName) {
        return new Promise(async (resolve, reject) => {
            const pos = pa_fileName.lastIndexOf(".") + 1;
            const ext = pa_fileName.substr(pos).toLowerCase();
            let url = null;
            if (this.mBuffer == null) {
                url = pa_fileName;
            }
            else {
                const blob = new Blob([this.mBuffer], { type: "image/" + ext });
                url = window.URL.createObjectURL(blob);
            }
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.onload = (_event) => {
                const tex = new CTexture();
                const image = _event.currentTarget;
                tex.SetSize(image.width, image.height);
                tex.SetBuf(image);
                this.mResult = tex;
                CH5Canvas.Init(image.width, image.height);
                CH5Canvas.Draw(CH5Canvas.DrawImage(image, 0, 0, image.width, image.height));
                const imgData = CH5Canvas.GetContext().getImageData(0, 0, image.width, image.height);
                const w = image.width;
                const h = image.height;
                const src = imgData.data;
                const buf = new Uint8Array(src.length);
                buf.set(src);
                let hasOpaque = false;
                let hasZeroAlpha = false;
                for (let i = 3; i < buf.length; i += 4) {
                    const a = buf[i];
                    if (a === 0)
                        hasZeroAlpha = true;
                    else
                        hasOpaque = true;
                    if (hasOpaque && hasZeroAlpha)
                        break;
                }
                if (hasOpaque && hasZeroAlpha && this.mAlphaBleed) {
                    alphaBleedRGBA(buf, w, h, 2);
                }
                const flipped = new Uint8Array(buf.length);
                for (let y = 0; y < h; y++) {
                    const row = y * w * 4;
                    for (let x = 0; x < w; x++) {
                        const si = row + x * 4;
                        const di = row + x * 4;
                        flipped[di] = buf[si];
                        flipped[di + 1] = buf[si + 1];
                        flipped[di + 2] = buf[si + 2];
                        const a = buf[si + 3];
                        if (a !== 0 && a !== 255) {
                            if (a <= this.mAlphaCut) {
                                flipped[di + 3] = 0;
                            }
                            else {
                                tex.SetAlpha(true);
                                flipped[di + 3] = a;
                            }
                        }
                        else {
                            flipped[di + 3] = a;
                        }
                    }
                }
                tex.GetBuf()[0] = flipped;
                resolve("");
            };
            img.onerror = (e) => {
                resolve("");
            };
            img.src = url;
        });
    }
}
const _alphaBleedNeighbors8Dx = [-1, 1, 0, 0, -1, 1, -1, 1];
const _alphaBleedNeighbors8Dy = [0, 0, -1, 1, -1, -1, 1, 1];
function alphaBleedRGBA(data, w, h, iters = 2) {
    for (let y = 0; y < h; y++) {
        let found = false, r = 0, g = 0, b = 0;
        for (let x = 0; x < w; x++) {
            const i = ((y * w + x) << 2);
            const a = data[i + 3];
            if (!found) {
                if (a > 0) {
                    found = true;
                    r = data[i];
                    g = data[i + 1];
                    b = data[i + 2];
                    for (let xx = 0; xx < x; xx++) {
                        const ii = ((y * w + xx) << 2);
                        if (data[ii + 3] === 0) {
                            data[ii] = r;
                            data[ii + 1] = g;
                            data[ii + 2] = b;
                        }
                    }
                }
            }
            else {
                if (a > 0) {
                    r = data[i];
                    g = data[i + 1];
                    b = data[i + 2];
                }
            }
        }
        found = false;
        for (let x = w - 1; x >= 0; x--) {
            const i = ((y * w + x) << 2);
            const a = data[i + 3];
            if (!found) {
                if (a > 0) {
                    found = true;
                    r = data[i];
                    g = data[i + 1];
                    b = data[i + 2];
                    for (let xx = w - 1; xx > x; xx--) {
                        const ii = ((y * w + xx) << 2);
                        if (data[ii + 3] === 0) {
                            data[ii] = r;
                            data[ii + 1] = g;
                            data[ii + 2] = b;
                        }
                    }
                }
            }
            else {
                if (a > 0) {
                    r = data[i];
                    g = data[i + 1];
                    b = data[i + 2];
                }
            }
        }
    }
    for (let x = 0; x < w; x++) {
        let found = false, r = 0, g = 0, b = 0;
        for (let y = 0; y < h; y++) {
            const i = ((y * w + x) << 2);
            const a = data[i + 3];
            if (!found) {
                if (a > 0) {
                    found = true;
                    r = data[i];
                    g = data[i + 1];
                    b = data[i + 2];
                    for (let yy = 0; yy < y; yy++) {
                        const ii = ((yy * w + x) << 2);
                        if (data[ii + 3] === 0) {
                            data[ii] = r;
                            data[ii + 1] = g;
                            data[ii + 2] = b;
                        }
                    }
                }
            }
            else {
                if (a > 0) {
                    r = data[i];
                    g = data[i + 1];
                    b = data[i + 2];
                }
            }
        }
        found = false;
        for (let y = h - 1; y >= 0; y--) {
            const i = ((y * w + x) << 2);
            const a = data[i + 3];
            if (!found) {
                if (a > 0) {
                    found = true;
                    r = data[i];
                    g = data[i + 1];
                    b = data[i + 2];
                    for (let yy = h - 1; yy > y; yy--) {
                        const ii = ((yy * w + x) << 2);
                        if (data[ii + 3] === 0) {
                            data[ii] = r;
                            data[ii + 1] = g;
                            data[ii + 2] = b;
                        }
                    }
                }
            }
            else {
                if (a > 0) {
                    r = data[i];
                    g = data[i + 1];
                    b = data[i + 2];
                }
            }
        }
    }
    if (iters <= 0)
        return;
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const i = ((y * w + x) << 2);
            if (data[i + 3] !== 0)
                continue;
            let rr = 0, gg = 0, bb = 0, cc = 0;
            for (let n = 0; n < 8; n++) {
                const nx = x + _alphaBleedNeighbors8Dx[n];
                const ny = y + _alphaBleedNeighbors8Dy[n];
                if (nx < 0 || nx >= w || ny < 0 || ny >= h)
                    continue;
                const j = ((ny * w + nx) << 2);
                if (data[j + 3] > 0) {
                    rr += data[j];
                    gg += data[j + 1];
                    bb += data[j + 2];
                    cc++;
                }
            }
            if (cc > 0) {
                data[i] = (rr / cc) | 0;
                data[i + 1] = (gg / cc) | 0;
                data[i + 2] = (bb / cc) | 0;
            }
        }
    }
}
