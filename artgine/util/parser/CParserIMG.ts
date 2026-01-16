import { CPath } from "../../basic/CPath.js";
import { CH5Canvas } from "../../render/CH5Canvas.js";
import { CTexture } from "../../render/CTexture.js";
import { CWebView } from "../../system/CWebView.js";
import { CParser } from "./CParser.js";

export class CParserIMG extends CParser {
    mAlphaCut = 0;
    //mTest=true;
    constructor() 
    {
        super();
    }
    GetResult(): CTexture {
        return this.mResult;
    }
    Load(pa_fileName: string): Promise<any> {
        return new Promise(async (resolve, reject) => {
            const pos = pa_fileName.lastIndexOf(".") + 1;
            const ext = pa_fileName.substr(pos).toLowerCase();

            let url: string | null = null;
            if (this.mBuffer == null) {
                // if (CWebView.IsWebView() == CWebView.eType.Electron) 
                // {
                //     try {
                //         const response = await fetch(pa_fileName);
                //         const blob = await response.blob();
                //         url = URL.createObjectURL(blob);
                //     } catch (e) {
                //         reject(new Error("Electron fetch failed: " + e));
                //         return;
                //     }
                // } 
                // else 
                {
                    url = pa_fileName;
                }
            } else {
                const blob = new Blob([this.mBuffer], { type: "image/" + ext });
                url = window.URL.createObjectURL(blob);
            }

            const img = new Image();
            img.crossOrigin = "Anonymous";

            img.onload = (_event) => {
                const tex = new CTexture();
                const image = _event.currentTarget as HTMLImageElement;

                tex.SetSize(image.width, image.height);
                tex.SetBuf(image);
                this.mResult = tex;

                CH5Canvas.Init(image.width, image.height);
                CH5Canvas.Draw(CH5Canvas.DrawImage(image, 0, 0, image.width, image.height));
                const imgData = CH5Canvas.GetContext().getImageData(0, 0, image.width, image.height);
                const w = image.width;
                const h = image.height;

                const src = imgData.data; // Uint8ClampedArray
                const buf = new Uint8Array(src.length);
                buf.set(src);

                // ✅ 알파=0이 실제로 존재할 때만 블리드(완전 불투명 텍스처는 스킵)
                let hasOpaque = false;
                let hasZeroAlpha = false;
                for (let i = 3; i < buf.length; i += 4) {
                    const a = buf[i];
                    if (a === 0) hasZeroAlpha = true;
                    else hasOpaque = true;
                    if (hasOpaque && hasZeroAlpha) break;
                }

                // (기존 동작 보존) AlphaCut 적용 전 상태에서만 블리드 수행
                if (hasOpaque && hasZeroAlpha) {
                    alphaBleedRGBA(buf, w, h, /*iters=*/2);
                }

                // AlphaCut + 알파 플래그(기존 로직 유지)
                for (let i = 3; i < buf.length; i += 4) {
                    const a = buf[i];
                    if (a !== 0 && a !== 255) {
                        if (a <= this.mAlphaCut) {
                            buf[i] = 0;
                        } else {
                            tex.SetAlpha(true);
                        }
                    }
                }
                tex.GetBuf()[0] = buf;
                //tex.GetBuf()[0]=img;
                resolve(""); // ✅ 처리 끝나면 반환
            };

            img.onerror = (e) => {
                resolve("");
            };

            img.src = url;
        });
    }


}

const _alphaBleedNeighbors8Dx = [-1, 1, 0, 0, -1, 1, -1, 1];
const _alphaBleedNeighbors8Dy = [ 0, 0,-1, 1, -1,-1,  1, 1];

// 유틸: 알파-블리딩(경계 복원)
// 좌우/상하 가장자리의 α=0 구간을 "가장 가까운 유효 색"으로 먼저 채우고,
// 이후 8-이웃 블리딩으로 경계 주변의 투명 픽셀 RGB를 정리한다.
// ⚠️ 현재 로직(소스는 alpha>0만)에서는 iters>1이 결과에 영향을 주지 않으므로(전파가 안 됨)
//     성능을 위해 iters는 0/1로만 처리한다.
function alphaBleedRGBA(data: Uint8Array | Uint8ClampedArray, w: number, h: number, iters = 2) {
    // ── 1) 수평 패스: 각 줄에서 좌/우 가장자리 α=0 구간 색 채우기 ──
    for (let y = 0; y < h; y++) {
        // 왼쪽 → 오른쪽
        let found = false, r = 0, g = 0, b = 0;
        for (let x = 0; x < w; x++) {
            const i = ((y * w + x) << 2);
            const a = data[i + 3];
            if (!found) {
                if (a > 0) { // 첫 유효 픽셀 발견
                    found = true;
                    r = data[i]; g = data[i + 1]; b = data[i + 2];
                    // 앞쪽(0..x-1)의 α==0 구간을 이 색으로 채움
                    for (let xx = 0; xx < x; xx++) {
                        const ii = ((y * w + xx) << 2);
                        if (data[ii + 3] === 0) {
                            data[ii] = r; data[ii + 1] = g; data[ii + 2] = b; // α는 0 유지
                        }
                    }
                }
            } else {
                // 진행 중: 유효 색을 업데이트(알파>0 만나면 최신 색으로 유지)
                if (a > 0) { r = data[i]; g = data[i + 1]; b = data[i + 2]; }
            }
        }

        // 오른쪽 → 왼쪽
        found = false;
        for (let x = w - 1; x >= 0; x--) {
            const i = ((y * w + x) << 2);
            const a = data[i + 3];
            if (!found) {
                if (a > 0) {
                    found = true;
                    r = data[i]; g = data[i + 1]; b = data[i + 2];
                    for (let xx = w - 1; xx > x; xx--) {
                        const ii = ((y * w + xx) << 2);
                        if (data[ii + 3] === 0) {
                            data[ii] = r; data[ii + 1] = g; data[ii + 2] = b;
                        }
                    }
                }
            } else {
                if (a > 0) { r = data[i]; g = data[i + 1]; b = data[i + 2]; }
            }
        }
    }

    // ── 2) 수직 패스: 각 컬럼에서 위/아래 가장자리 α=0 구간 색 채우기 ──
    for (let x = 0; x < w; x++) {
        // 위 → 아래
        let found = false, r = 0, g = 0, b = 0;
        for (let y = 0; y < h; y++) {
            const i = ((y * w + x) << 2);
            const a = data[i + 3];
            if (!found) {
                if (a > 0) {
                    found = true;
                    r = data[i]; g = data[i + 1]; b = data[i + 2];
                    for (let yy = 0; yy < y; yy++) {
                        const ii = ((yy * w + x) << 2);
                        if (data[ii + 3] === 0) {
                            data[ii] = r; data[ii + 1] = g; data[ii + 2] = b;
                        }
                    }
                }
            } else {
                if (a > 0) { r = data[i]; g = data[i + 1]; b = data[i + 2]; }
            }
        }

        // 아래 → 위
        found = false;
        for (let y = h - 1; y >= 0; y--) {
            const i = ((y * w + x) << 2);
            const a = data[i + 3];
            if (!found) {
                if (a > 0) {
                    found = true;
                    r = data[i]; g = data[i + 1]; b = data[i + 2];
                    for (let yy = h - 1; yy > y; yy--) {
                        const ii = ((yy * w + x) << 2);
                        if (data[ii + 3] === 0) {
                            data[ii] = r; data[ii + 1] = g; data[ii + 2] = b;
                        }
                    }
                }
            } else {
                if (a > 0) { r = data[i]; g = data[i + 1]; b = data[i + 2]; }
            }
        }
    }

    // ── 3) 8-이웃 블리딩: iters>0이면 1회만 수행(기존 iters=2와 출력 동일) ──
    if (iters <= 0) return;

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const i = ((y * w + x) << 2);
            if (data[i + 3] !== 0) continue; // 완전 투명만

            let rr = 0, gg = 0, bb = 0, cc = 0;

            // 이웃 8개만 검사 (destructuring/배열 생성 최소화)
            for (let n = 0; n < 8; n++) {
                const nx = x + _alphaBleedNeighbors8Dx[n];
                const ny = y + _alphaBleedNeighbors8Dy[n];
                if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;

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
