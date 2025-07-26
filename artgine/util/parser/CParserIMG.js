import { CH5Canvas } from "../../render/CH5Canvas.js";
import { CTexture } from "../../render/CTexture.js";
import { CParser } from "./CParser.js";
export class CParserIMG extends CParser {
    mAlphaCut = 0;
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
                {
                    url = pa_fileName;
                }
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
                const buf = new Uint8Array(image.width * image.height * 4);
                const w = image.width;
                const h = image.height;
                for (let x = w - 1; x >= 0; --x) {
                    for (let y = h - 1; y >= 0; --y) {
                        const i = x * 4 + y * w * 4;
                        buf[i + 0] = imgData.data[i + 0];
                        buf[i + 1] = imgData.data[i + 1];
                        buf[i + 2] = imgData.data[i + 2];
                        buf[i + 3] = imgData.data[i + 3];
                        if (imgData.data[i + 3] !== 0 && imgData.data[i + 3] !== 255) {
                            if (buf[i + 3] <= this.mAlphaCut) {
                                buf[i + 3] = 0;
                            }
                            else {
                                tex.SetAlpha(true);
                            }
                        }
                    }
                }
                tex.GetBuf()[0] = buf;
                resolve("");
            };
            img.onerror = (e) => {
                resolve("");
            };
            img.src = url;
        });
    }
}
