import { CVec4 } from "../geometry/CVec4.js";
import { CTexture, CTextureInfo } from "../render/CTexture.js";
import { CH5Canvas } from "../render/CH5Canvas.js";
import { CBase64File } from "./CBase64File.js";
import { CString } from "../basic/CString.js";
import { CUniqueID } from "../basic/CUniqueID.js";
import { CJSON } from "../basic/CJSON.js";
import { CModal } from "../basic/CModal.js";
import { CVec2 } from "../geometry/CVec2.js";
import { CDOM } from "../basic/CDOM.js";
import { CObject } from "../basic/CObject.js";
import { CClass } from "../basic/CClass.js";
import { CUtilObj } from "../basic/CUtilObj.js";
import { CUtilRender } from "../render/CUtilRender.js";
import { CFile } from "../system/CFile.js";
import { CClipBase64, CClipCoodi, CClipImg } from "../app/component/CAnimation.js";
import { CTarga } from "../render/CTarga.js";
let g_atlJBox;
export class CAtlas extends CTexture {
    mTexel = new Array();
    mPadding = 1;
    mCreate = false;
    mUrlMap = new Map();
    constructor(_path = "") {
        super();
        this.SetKey(_path + CUniqueID.GetHash() + ".atl");
    }
    async LoadJSON(_file = null) {
        let buf = await CFile.Load(_file);
        if (buf == null)
            return true;
        this.ImportCJSON(new CJSON(buf));
        return false;
    }
    async SaveJSON(_file = null) {
        CFile.Save(this, _file + ".json");
    }
    IsShould(_member, _type) {
        if (_member == "mTex" && _type != CObject.eShould.Editer)
            return false;
        if (_member == "mCreate" || _member == "mUrlMap" || _member == "mRect")
            return false;
        return super.IsShould(_member, _type);
    }
    async GetImgURL(_index = -1) {
        let url = this.mUrlMap.get(_index);
        if (url != null)
            return url;
        const buf = this.GetBuf()[0];
        const texW = this.mWidth;
        const texH = this.mHeight;
        let codi = this.mTexel[_index];
        if (_index == -1) {
            CH5Canvas.Init(texW, texH);
            CH5Canvas.PushImgData(buf, 0, 0);
        }
        else if (codi == null) {
            CH5Canvas.Init(1, 1);
            CH5Canvas.Draw([CH5Canvas.Cmd("fillStyle", "black"), ...CH5Canvas.FillRect(0, 0, 1, 1)]);
        }
        else {
            let w = codi.z - codi.x;
            let h = codi.w - codi.y;
            CH5Canvas.Init(w, h);
            const sliced = new Uint8Array(w * h * 4);
            for (let y = 0; y < h; y++) {
                const srcOff = (codi.x + (codi.y + y) * texW) * 4;
                sliced.set(buf.subarray(srcOff, srcOff + w * 4), y * w * 4);
            }
            CH5Canvas.PushImgData(sliced, 0, 0);
        }
        url = CH5Canvas.GetDataURL();
        this.mUrlMap.set(_index, url);
        return url;
    }
    EditHTMLInit(_div) {
        super.EditHTMLInit(_div);
        _div.append(CDOM.DataToDom({
            "<>": "button", "text": "Modify", "onclick": () => {
                this.ModifyModal();
            }
        }));
        _div.append(CDOM.DataToDom({
            "<>": "button", "text": "Reload Texture", "onclick": () => {
                this.mGBuffer = new Array();
            }
        }));
    }
    WTForm(_pointer, _div, _input) {
        if (_pointer.member == "mTexFilter") {
            let textArr = [], valArr = [];
            for (let [text, val] of Object.entries(CTexture.eFilter)) {
                textArr.push(text);
                valArr.push(val);
            }
            _div.append(CUtilObj.Select(_pointer, _input, textArr, valArr));
        }
        if (_pointer.member == "mTexMipMap") {
            let textArr = [], valArr = [];
            for (let [text, val] of Object.entries(CTexture.eMipmap)) {
                textArr.push(text);
                valArr.push(val);
            }
            _div.append(CUtilObj.Select(_pointer, _input, textArr, valArr));
        }
    }
    async ModifyModal(_clickEvent = null) {
        let AtlasPush = (e) => {
            if (e.target.files && e.target.files.length > 0) {
                for (var file of e.target.files) {
                    var reader = new FileReader();
                    reader.onload = async (evt) => {
                        if (evt.target.readyState == FileReader.DONE) {
                            await this.Push("file", evt.target.result);
                            this.ModifyModal(_clickEvent);
                        }
                    };
                    reader.readAsArrayBuffer(file);
                }
            }
        };
        let cardMain = {
            "<>": "div", "html": [
                { "<>": "div", "id": "atlCan_card", "style": "width:100%;" }
            ]
        };
        let drawImgOnCard = (_index = -1) => {
            let AtlCan_Div = CDOM.ID("atlCan_card");
            AtlCan_Div.innerHTML = "";
            let height100Container = document.createElement("div");
            AtlCan_Div.appendChild(height100Container);
            let height200Container = document.createElement("div");
            AtlCan_Div.appendChild(height200Container);
            let create100Div = () => {
                let div = document.createElement("div");
                div.style.display = "flex";
                height100Container.append(div);
                return div;
            };
            let create200Div = () => {
                let div = document.createElement("div");
                div.style.display = "flex";
                height200Container.append(div);
                return div;
            };
            let maxWidth = 6;
            let height100_childNum = 0;
            let height100_oneRemainDiv = null;
            let height100_Div = create100Div();
            let height200_childNum = 0;
            let height200_Div = create200Div();
            let imgDiv = document.createElement("div");
            imgDiv.style.overflow = "hidden";
            imgDiv.style.backgroundSize = "contain";
            imgDiv.style.backgroundPosition = "center";
            imgDiv.style.backgroundRepeat = "no-repeat";
            imgDiv.style.imageRendering = "pixelated";
            imgDiv.style.backgroundColor = "white";
            imgDiv.style.backgroundBlendMode = "multiply";
            imgDiv.style.border = "1px solid red";
            imgDiv.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (_clickEvent != null) {
                    _clickEvent(-1);
                    if (g_atlJBox)
                        g_atlJBox.Close();
                }
            };
            imgDiv.onmouseenter = () => { imgDiv.style.backgroundColor = "#8888FF"; };
            imgDiv.onmouseleave = () => { imgDiv.style.backgroundColor = "white"; };
            imgDiv.style.width = "calc(100% / 6)";
            imgDiv.style.height = "100px";
            if (height100_oneRemainDiv) {
                height100_oneRemainDiv.appendChild(imgDiv);
                height100_oneRemainDiv = null;
            }
            else {
                height100_childNum++;
                height100_Div.appendChild(imgDiv);
                if (height100_childNum >= maxWidth) {
                    height100_childNum = 0;
                    height100_Div = create100Div();
                }
            }
            for (let i = 0; i < this.mTexel.length; i++) {
                let codi = this.mTexel[i];
                if (codi == null)
                    continue;
                this.GetImgURL(i).then(slicedBase64Img => {
                    let imgDiv = document.createElement("div");
                    imgDiv.style.overflow = "hidden";
                    imgDiv.style.backgroundSize = "contain";
                    imgDiv.style.backgroundPosition = "center";
                    imgDiv.style.backgroundRepeat = "no-repeat";
                    imgDiv.style.imageRendering = "pixelated";
                    imgDiv.style.backgroundImage = "url(" + slicedBase64Img + ")";
                    imgDiv.style.backgroundBlendMode = "multiply";
                    imgDiv.style.border = "1px solid red";
                    imgDiv.style.position = "relative";
                    imgDiv.dataset.atlIdx = String(i);
                    let label = document.createElement("span");
                    label.textContent = String(i);
                    label.style.cssText = `
						position: absolute;
						bottom: 2px;
						right: 3px;
						font-size: 10px;
						font-weight: bold;
						color: white;
						text-shadow: 0 0 3px #000, 0 0 3px #000;
						pointer-events: none;
						line-height: 1;
					`;
                    imgDiv.appendChild(label);
                    let width = codi.z - codi.x;
                    let height = codi.w - codi.y;
                    let aspect = width / height;
                    imgDiv.onclick = (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (_clickEvent != null) {
                            _clickEvent(i);
                            if (g_atlJBox)
                                g_atlJBox.Close();
                        }
                        else {
                            const manualTabLink = document.querySelector('a[href="#vManualStyle_tab"]');
                            if (manualTabLink)
                                manualTabLink.click();
                            drawManual();
                            setTimeout(() => {
                                const select = CDOM.ID("atlCan_manual")?.querySelector("select");
                                if (select) {
                                    select.value = String(i);
                                    select.dispatchEvent(new Event("change"));
                                }
                            }, 0);
                        }
                    };
                    imgDiv.onmouseenter = () => { imgDiv.style.backgroundColor = "#8888FF"; };
                    imgDiv.onmouseleave = () => { imgDiv.style.backgroundColor = ""; };
                    if (aspect > 1) {
                        imgDiv.style.width = "calc(100% / 6)";
                        imgDiv.style.height = "100px";
                        if (height100_childNum > maxWidth - 2) {
                            height100_oneRemainDiv = height100_Div;
                            height100_Div = create100Div();
                            height100_childNum = 0;
                        }
                        height100_childNum += 2;
                        height100_Div.appendChild(imgDiv);
                        if (height100_childNum >= maxWidth) {
                            height100_childNum = 0;
                            height100_Div = create100Div();
                        }
                    }
                    else if (aspect < 1) {
                        imgDiv.style.width = "calc(100% / 6)";
                        imgDiv.style.height = "200px";
                        height200_childNum++;
                        height200_Div.appendChild(imgDiv);
                        if (height200_childNum >= maxWidth) {
                            height200_childNum = 0;
                            height200_Div = create200Div();
                        }
                    }
                    else {
                        imgDiv.style.width = "calc(100% / 6)";
                        imgDiv.style.height = "100px";
                        if (height100_oneRemainDiv) {
                            height100_oneRemainDiv.appendChild(imgDiv);
                            height100_oneRemainDiv = null;
                        }
                        else {
                            height100_childNum++;
                            height100_Div.appendChild(imgDiv);
                            if (height100_childNum >= maxWidth) {
                                height100_childNum = 0;
                                height100_Div = create100Div();
                            }
                        }
                    }
                });
            }
        };
        let manualMain = { "<>": "div", "html": [{ "<>": "div", "id": "atlCan_manual", "style": "width:100%;padding:8px;" }] };
        let drawManual = () => {
            let div = CDOM.ID("atlCan_manual");
            if (!div)
                return;
            div.innerHTML = "";
            let select = document.createElement("select");
            select.className = "form-select";
            select.style.marginBottom = "8px";
            for (let i = 0; i < this.mTexel.length; i++) {
                if (this.mTexel[i] == null)
                    continue;
                let opt = document.createElement("option");
                opt.value = String(i);
                opt.textContent = String(i);
                select.appendChild(opt);
            }
            div.appendChild(select);
            let inputs = [];
            let keys = ["X", "Y", "Z", "W"];
            let refreshInputs = (i) => {
                let codi = this.mTexel[i];
                if (!codi)
                    return;
                inputs[0].value = String(codi.x);
                inputs[1].value = String(codi.y);
                inputs[2].value = String(codi.z);
                inputs[3].value = String(codi.w);
            };
            let getCurIdx = () => Number(select.value);
            let setters = [
                (v) => { if (this.mTexel[getCurIdx()])
                    this.mTexel[getCurIdx()].x = v; },
                (v) => { if (this.mTexel[getCurIdx()])
                    this.mTexel[getCurIdx()].y = v; },
                (v) => { if (this.mTexel[getCurIdx()])
                    this.mTexel[getCurIdx()].z = v; },
                (v) => { if (this.mTexel[getCurIdx()])
                    this.mTexel[getCurIdx()].w = v; },
            ];
            for (let k = 0; k < 4; k++) {
                let row = document.createElement("div");
                row.style.cssText = "display:flex;align-items:center;margin-bottom:4px;gap:6px;";
                let lbl = document.createElement("span");
                lbl.textContent = keys[k];
                lbl.style.cssText = "width:24px;font-weight:bold;";
                let inp = document.createElement("input");
                inp.type = "number";
                inp.className = "form-control form-control-sm";
                inp.style.width = "80px";
                const ki = k;
                inp.onchange = () => { setters[ki](Number(inp.value)); this.mUrlMap?.clear(); };
                inputs.push(inp);
                row.appendChild(lbl);
                row.appendChild(inp);
                div.appendChild(row);
            }
            select.onchange = () => refreshInputs(getCurIdx());
            if (select.options.length > 0)
                refreshInputs(getCurIdx());
            let delBtn = document.createElement("button");
            delBtn.className = "btn btn-sm btn-danger";
            delBtn.textContent = "Delete";
            delBtn.style.marginTop = "8px";
            delBtn.onclick = () => {
                const idx = getCurIdx();
                this.RemoveTexCodi(idx);
                this.ModifyModal(_clickEvent);
            };
            div.appendChild(delBtn);
            let gotoBtn = document.createElement("button");
            gotoBtn.className = "btn btn-sm btn-secondary";
            gotoBtn.textContent = "Go to Card";
            gotoBtn.style.cssText = "margin-top:8px;margin-left:6px;";
            gotoBtn.onclick = () => {
                const idx = getCurIdx();
                const cardTabLink = document.querySelector('a[href="#vCardStyle_tab"]');
                if (cardTabLink)
                    cardTabLink.click();
                drawImgOnCard();
                setTimeout(() => {
                    const target = CDOM.ID("atlCan_card")?.querySelector(`[data-atl-idx="${idx}"]`);
                    if (target)
                        target.scrollIntoView({ behavior: "smooth", block: "center" });
                }, 50);
            };
            div.appendChild(gotoBtn);
        };
        let infoMain = { "<>": "div", "html": [{ "<>": "div", "id": "atlCan_info", "style": "width:100%;padding:8px;" }] };
        let drawInfo = async () => {
            let div = CDOM.ID("atlCan_info");
            if (!div)
                return;
            div.innerHTML = "";
            let url = await this.GetImgURL(-1);
            let img = document.createElement("img");
            img.src = url;
            img.style.cssText = "max-width:100%;image-rendering:pixelated;border:1px solid #ccc;margin-bottom:8px;display:block;";
            div.appendChild(img);
            let arr = this.mTexel
                .map((c, i) => c == null ? null : { index: i, x: c.x, y: c.y, z: c.z, w: c.w, width: c.z - c.x, height: c.w - c.y })
                .filter(v => v != null);
            let textarea = document.createElement("textarea");
            textarea.value = JSON.stringify(arr, null, 2);
            textarea.style.cssText = "width:100%;height:200px;font-size:11px;font-family:monospace;resize:vertical;";
            div.appendChild(textarea);
            let btn = document.createElement("button");
            btn.className = "btn btn-sm btn-secondary";
            btn.textContent = "Copy";
            btn.style.marginTop = "4px";
            btn.onclick = () => {
                textarea.select();
                document.execCommand("copy");
                btn.textContent = "Copied!";
                setTimeout(() => btn.textContent = "Copy", 1500);
            };
            div.appendChild(btn);
        };
        let prevDiv = CDOM.ID("CAtlas_Div");
        let st = prevDiv == null ? 0 : prevDiv.scrollTop;
        let cardTabHtml = [
            cardMain,
            { "<>": "input", "type": "file", "multiple": "multiple", "onchange": AtlasPush },
            {
                "<>": "button", "type": "button", "class": "btn btn-primary float-right", "text": "PushMode", "onclick": () => {
                    let ani = CClass.New("CAnimation");
                    window["AniTool"](ani, null);
                    window["AniToolAtlasEvent"](this, false, () => {
                        this.ModifyModal(_clickEvent);
                    });
                }
            },
            {
                "<>": "button", "type": "button", "class": "btn btn-primary float-right", "text": "CodiMode", "onclick": () => {
                    let ani = CClass.New("CAnimation");
                    const srcBuf = this.GetBuf()[0];
                    const texW = this.mWidth;
                    const texH = this.mHeight;
                    const cleanBuf = srcBuf.buffer.slice(srcBuf.byteOffset, srcBuf.byteOffset + srcBuf.byteLength);
                    const tga = new CTarga(cleanBuf, texW, texH, false);
                    const tgaBuf = tga.GetResult();
                    const b64File = new CBase64File();
                    b64File.mExt = "tga";
                    b64File.mData = tgaBuf;
                    b64File.mOption.mFilter = CTexture.eFilter.Neaest;
                    b64File.RefreshHash();
                    ani.Push(new CClipBase64(0, b64File));
                    ani.Push(new CClipImg(0, 0, b64File.FileName()));
                    for (let i = 0; i < this.mTexel.length; i++) {
                        const codi = this.mTexel[i];
                        if (codi == null)
                            continue;
                        ani.Push(new CClipCoodi(i, 1, codi.x, codi.y, codi.z, codi.w));
                    }
                    window["AniTool"](ani, null);
                    window["AniToolAtlasEvent"](this, true, () => {
                        this.mUrlMap.clear();
                        this.ModifyModal(_clickEvent);
                    });
                }
            },
        ];
        let tabs = {
            "<>": "div", "html": [
                {
                    "<>": "div", "style": "display:flex;", "html": [
                        {
                            "<>": "div", "id": "CAtlas_Div", "style": "width:100%;overflow:auto;", "html": [
                                {
                                    "<>": "ul", "class": "nav nav-tabs", "html": [
                                        {
                                            "<>": "li", "class": "nav-item", "html": [
                                                { "<>": "a", "class": "nav-link active", "data-bs-toggle": "tab", "href": "#vCardStyle_tab", "text": "Card", "onclick": () => { drawImgOnCard(); } },
                                            ]
                                        },
                                        {
                                            "<>": "li", "class": "nav-item", "html": [
                                                { "<>": "a", "class": "nav-link", "data-bs-toggle": "tab", "href": "#vManualStyle_tab", "text": "Manual", "onclick": () => { drawManual(); } }
                                            ]
                                        },
                                        {
                                            "<>": "li", "class": "nav-item", "html": [
                                                { "<>": "a", "class": "nav-link", "data-bs-toggle": "tab", "href": "#vInfoStyle_tab", "text": "Info", "onclick": () => { drawInfo(); } }
                                            ]
                                        },
                                    ]
                                },
                                {
                                    "<>": "div", "class": "tab-content", "html": [
                                        { "<>": "div", "class": "tab-pane fade show active", "id": "vCardStyle_tab", "html": cardTabHtml },
                                        { "<>": "div", "class": "tab-pane fade", "id": "vManualStyle_tab", "html": [manualMain] },
                                        { "<>": "div", "class": "tab-pane fade", "id": "vInfoStyle_tab", "html": [infoMain] },
                                    ]
                                }
                            ]
                        },
                    ]
                },
            ]
        };
        if (g_atlJBox)
            g_atlJBox.Close();
        g_atlJBox = new CModal();
        g_atlJBox.SetTitle(CModal.eTitle.TextClose);
        g_atlJBox.SetSize(640, 480);
        g_atlJBox.SetBody("<div id='atl_div'></div>");
        g_atlJBox.SetResize(true);
        g_atlJBox.Open();
        CDOM.ID("atl_div").append(CDOM.DataToDom(tabs));
        drawImgOnCard();
        CDOM.ID("CAtlas_Div").scrollTop = st;
    }
    async RemoveTexCodi(_off) {
        this.mTexel[_off] = null;
        this.RebuildRect(this.mWidth, this.mHeight);
        this.EditRefresh();
    }
    GetUV(_off, _texCodi = new CVec4()) {
        if (this.mTexel[_off] == null) {
            _texCodi.x = 0;
            _texCodi.y = 0;
            _texCodi.z = 1 / this.mWidth;
            _texCodi.w = 1 / this.mHeight;
            return _texCodi;
        }
        _texCodi.x = this.mTexel[_off].x / this.mWidth;
        _texCodi.y = 1 - this.mTexel[_off].y / this.mHeight;
        _texCodi.z = this.mTexel[_off].z / this.mWidth;
        _texCodi.w = 1 - this.mTexel[_off].w / this.mHeight;
        return _texCodi;
    }
    GetTexel(_off, _texCodi = new CVec4()) {
        _texCodi.x = this.mTexel[_off].x;
        _texCodi.y = this.mTexel[_off].y;
        _texCodi.z = this.mTexel[_off].z;
        _texCodi.w = this.mTexel[_off].w;
        return _texCodi;
    }
    mRect = null;
    async PushTexTiles(_imgTex, _codi) {
        const imgTexBuf = _imgTex.GetBuf()[0];
        if (this.mRect == null) {
            this.mRect = new AtlasMaxRects(this.mWidth == 0 ? 128 : this.mWidth, this.mHeight == 0 ? 128 : this.mHeight);
            for (let codi of this.mTexel) {
                if (codi == null)
                    continue;
                const w = codi.z - codi.x;
                const h = codi.w - codi.y;
                this.mRect.MarkUsed(codi.x - this.mPadding, codi.y - this.mPadding, w + this.mPadding * 2, h + this.mPadding * 2);
            }
            this.mWidth = this.mRect.mWidth;
            this.mHeight = this.mRect.mHeight;
        }
        if (this.mBuffer.length == 0) {
            this.mWidth = this.mRect.mWidth;
            this.mHeight = this.mRect.mHeight;
            this.PushInfo([new CTextureInfo(CTexture.eTarget.Sigle, CTexture.eFormat.RGBA8)]);
            this.CreateBuf();
        }
        let atlTexBuf = this.GetBuf()[0];
        for (let k = 0; k < _codi.length; ++k) {
            const codi = _codi[k];
            const w = codi.z - codi.x;
            const h = codi.w - codi.y;
            if (w == 0 || h == 0)
                continue;
            const paddedW = w + this.mPadding * 2;
            const paddedH = h + this.mPadding * 2;
            let insertRect = this.mRect.Insert(paddedW, paddedH);
            if (insertRect == null) {
                const newW = CUtilRender.CloseToExp(this.mWidth + paddedW);
                const newH = CUtilRender.CloseToExp(this.mHeight + paddedH);
                const higherOne = Math.max(newW, newH);
                this.RebuildRect(higherOne, higherOne);
                atlTexBuf = this.GetBuf()[0];
                insertRect = this.mRect.Insert(paddedW, paddedH);
            }
            let texCodiIdx = this.mTexel.indexOf(null);
            if (texCodiIdx != -1) {
                this.mTexel[texCodiIdx] =
                    new CVec4(insertRect.x + this.mPadding, insertRect.y + this.mPadding, insertRect.x + w + this.mPadding, insertRect.y + h + this.mPadding);
            }
            else {
                this.mTexel.push(new CVec4(insertRect.x + this.mPadding, insertRect.y + this.mPadding, insertRect.x + w + this.mPadding, insertRect.y + h + this.mPadding));
            }
            const srcX = codi.x;
            const srcY = codi.y;
            const dstX = insertRect.x + this.mPadding;
            const dstY = insertRect.y + this.mPadding;
            for (let y = 0; y < h; y++) {
                const src = (srcX + (srcY + y) * _imgTex.GetWidth()) * 4;
                const dst = (dstX + (dstY + y) * this.mWidth) * 4;
                atlTexBuf.set(imgTexBuf.subarray(src, src + 4 * w), dst);
            }
            for (let x = 0; x < w; x++) {
                const from = ((dstX + x) + (dstY) * this.mWidth) * 4;
                const fromB = ((dstX + x) + (dstY + h - 1) * this.mWidth) * 4;
                for (let pc = 0; pc < this.mPadding; ++pc) {
                    atlTexBuf.set(atlTexBuf.subarray(from, from + 4), ((dstX + x) + (dstY - pc - 1) * this.mWidth) * 4);
                    atlTexBuf.set(atlTexBuf.subarray(fromB, fromB + 4), ((dstX + x) + (dstY + h + pc) * this.mWidth) * 4);
                }
            }
            for (let y = -this.mPadding; y < h + this.mPadding; y++) {
                const from = ((dstX) + (dstY + y) * this.mWidth) * 4;
                const fromB = ((dstX + w - 1) + (dstY + y) * this.mWidth) * 4;
                for (let pc = 0; pc < this.mPadding; ++pc) {
                    atlTexBuf.set(atlTexBuf.subarray(from, from + 4), ((dstX - pc - 1) + (dstY + y) * this.mWidth) * 4);
                    atlTexBuf.set(atlTexBuf.subarray(fromB, fromB + 4), ((dstX + w + pc) + (dstY + y) * this.mWidth) * 4);
                }
            }
        }
        return this.mTexel.length - 1;
    }
    Push(_texName, _buf = null, _codi = new Array()) {
        return new Promise((resolve, reject) => {
            if (_buf != null) {
                let blob = new Blob([_buf], { type: "image/" + CString.ExtCut(_texName).ext });
                _texName = window.URL.createObjectURL(blob);
            }
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.addEventListener('load', async (_event) => {
                const img = _event.currentTarget;
                CH5Canvas.Init(img.width, img.height);
                CH5Canvas.Draw(CH5Canvas.DrawImage(img, 0, 0, img.width, img.height));
                const imgTex = CH5Canvas.GetNewTex();
                if (_codi.length == 0)
                    _codi.push(new CVec4(0, 0, img.width, img.height));
                resolve(await this.PushTexTiles(imgTex, _codi));
            });
            img.src = _texName;
        });
    }
    PushAutoCut(_texName, _alphaMin = 1, _minSize = 4, _seamGrad = 20, _seamAlpha = 0.65) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.addEventListener('load', async (_event) => {
                const img = _event.currentTarget;
                CH5Canvas.Init(img.width, img.height);
                CH5Canvas.Draw(CH5Canvas.DrawImage(img, 0, 0, img.width, img.height));
                const imgTex = CH5Canvas.GetNewTex();
                const imgBuf = imgTex.GetBuf()[0];
                const W = imgTex.GetWidth();
                const H = imgTex.GetHeight();
                const step = new Int32Array(W * H);
                let count = 0;
                const stk = [];
                for (let sy = 0; sy < H; sy++) {
                    for (let sx = 0; sx < W; sx++) {
                        if (step[sy * W + sx] !== 0)
                            continue;
                        if (imgBuf[(sy * W + sx) * 4 + 3] < _alphaMin)
                            continue;
                        count++;
                        stk.push(sx, sy);
                        while (stk.length > 0) {
                            const y = stk.pop(), x = stk.pop();
                            if (x < 0 || x >= W || y < 0 || y >= H)
                                continue;
                            if (step[y * W + x] !== 0)
                                continue;
                            if (imgBuf[(y * W + x) * 4 + 3] < _alphaMin)
                                continue;
                            step[y * W + x] = count;
                            stk.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1);
                        }
                    }
                }
                const bboxes = new Array(count + 1);
                for (let i = 1; i <= count; i++)
                    bboxes[i] = [W, H, 0, 0];
                for (let y = 0; y < H; y++) {
                    for (let x = 0; x < W; x++) {
                        const s = step[y * W + x];
                        if (s === 0)
                            continue;
                        const b = bboxes[s];
                        if (x < b[0])
                            b[0] = x;
                        if (y < b[1])
                            b[1] = y;
                        if (x + 1 > b[2])
                            b[2] = x + 1;
                        if (y + 1 > b[3])
                            b[3] = y + 1;
                    }
                }
                const makeProfile = (s, x0, y0, x1, y1, axis) => {
                    const n = axis === 'r' ? y1 - y0 : x1 - x0;
                    const gray = new Float32Array(n).fill(-1);
                    const cnt = new Uint32Array(n);
                    for (let i = 0; i < n; i++) {
                        let sum = 0, c = 0;
                        const lo = axis === 'r' ? x0 : y0;
                        const hi = axis === 'r' ? x1 : y1;
                        for (let j = lo; j < hi; j++) {
                            const px = axis === 'r' ? j : i + x0;
                            const py = axis === 'r' ? i + y0 : j;
                            if (step[py * W + px] !== s)
                                continue;
                            const b = (py * W + px) * 4;
                            sum += imgBuf[b] * 0.299 + imgBuf[b + 1] * 0.587 + imgBuf[b + 2] * 0.114;
                            c++;
                        }
                        cnt[i] = c;
                        if (c > 0)
                            gray[i] = sum / c;
                    }
                    return { gray, cnt };
                };
                const findSeams = (gray, cnt, offset, winR = 4) => {
                    const res = [];
                    for (let i = 1; i < gray.length - 1; i++) {
                        if ((gray[i] < 0) !== (gray[i - 1] < 0)) {
                            res.push(offset + i);
                            continue;
                        }
                        if (gray[i] < 0)
                            continue;
                        if (Math.abs(gray[i] - gray[i - 1]) < _seamGrad)
                            continue;
                        let sm = 0, n = 0;
                        for (let d = -winR; d <= winR; d++) {
                            if (d === 0 || i + d < 0 || i + d >= cnt.length)
                                continue;
                            sm += cnt[i + d];
                            n++;
                        }
                        const avg = n > 0 ? sm / n : 0;
                        if (avg > 0 && cnt[i] < avg * _seamAlpha)
                            res.push(offset + i);
                    }
                    return res;
                };
                const splitPts = (pts, lo, hi) => {
                    const sorted = [...new Set(pts)].sort((a, b) => a - b);
                    const res = [];
                    let prev = lo;
                    for (const p of sorted) {
                        if (p > prev && p < hi) {
                            res.push([prev, p]);
                            prev = p;
                        }
                    }
                    res.push([prev, hi]);
                    return res;
                };
                const alphaEdge = (s, x0, y0, x1, y1) => {
                    let lx = x1, rx = x0, ty = y1, by = y0;
                    for (let y = y0; y < y1; y++) {
                        for (let x = x0; x < x1; x++) {
                            if (step[y * W + x] !== s)
                                continue;
                            if (x < lx)
                                lx = x;
                            if (x + 1 > rx)
                                rx = x + 1;
                            if (y < ty)
                                ty = y;
                            if (y + 1 > by)
                                by = y + 1;
                        }
                    }
                    if (rx - lx < _minSize || by - ty < _minSize)
                        return null;
                    return new CVec4(lx, ty, rx, by);
                };
                const maskedTex = new CTexture();
                maskedTex.SetSize(W, H);
                maskedTex.CreateBuf();
                const maskedBuf = maskedTex.GetBuf()[0];
                let lastIndex = -1;
                for (let s = 1; s <= count; s++) {
                    const [bx0, by0, bx1, by1] = bboxes[s];
                    if (bx1 - bx0 < _minSize || by1 - by0 < _minSize)
                        continue;
                    const { gray: rg, cnt: rc } = makeProfile(s, bx0, by0, bx1, by1, 'r');
                    const rowSeamList = findSeams(rg, rc, by0);
                    const { gray: cg, cnt: cc } = makeProfile(s, bx0, by0, bx1, by1, 'c');
                    const colSeamList = findSeams(cg, cc, bx0);
                    const rowSeams = new Set(rowSeamList);
                    const colSeams = new Set(colSeamList);
                    for (let y = by0; y < by1; y++) {
                        const nearRow = rowSeams.has(y) || rowSeams.has(y + 1);
                        for (let x = bx0; x < bx1; x++) {
                            const idx = (y * W + x) * 4;
                            if (imgBuf[idx + 3] < _alphaMin)
                                continue;
                            const nearCol = colSeams.has(x) || colSeams.has(x + 1);
                            if (nearRow || nearCol || step[y * W + x] === s) {
                                maskedBuf[idx] = imgBuf[idx];
                                maskedBuf[idx + 1] = imgBuf[idx + 1];
                                maskedBuf[idx + 2] = imgBuf[idx + 2];
                                maskedBuf[idx + 3] = imgBuf[idx + 3];
                            }
                        }
                    }
                    const boxes = [];
                    for (const [ry0, ry1] of splitPts(rowSeamList, by0, by1)) {
                        for (const [cx0, cx1] of splitPts(colSeamList, bx0, bx1)) {
                            const box = alphaEdge(s, cx0, ry0, cx1, ry1);
                            if (!box)
                                continue;
                            if (cx0 !== bx0)
                                box.x = Math.max(bx0, box.x - 1);
                            if (cx1 !== bx1)
                                box.z = Math.min(bx1, box.z + 1);
                            if (ry0 !== by0)
                                box.y = Math.max(by0, box.y - 1);
                            if (ry1 !== by1)
                                box.w = Math.min(by1, box.w + 1);
                            boxes.push(box);
                        }
                    }
                    if (boxes.length > 0)
                        lastIndex = await this.PushTexTiles(maskedTex, boxes);
                    for (let y = by0; y < by1; y++)
                        for (let x = bx0; x < bx1; x++)
                            maskedBuf[(y * W + x) * 4 + 3] = 0;
                }
                resolve(lastIndex);
            });
            img.src = _texName;
        });
    }
    PushSizeCut(_texName, _size) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.addEventListener('load', async (_event) => {
                const img = _event.currentTarget;
                CH5Canvas.Init(img.width, img.height);
                CH5Canvas.Draw(CH5Canvas.DrawImage(img, 0, 0, img.width, img.height));
                const imgTex = CH5Canvas.GetNewTex();
                const imgTexBuf = imgTex.GetBuf()[0];
                const cols = Math.floor(img.width / _size.x);
                const rows = Math.floor(img.height / _size.y);
                const codi = [];
                for (let row = 0; row < rows; row++) {
                    for (let col = 0; col < cols; col++) {
                        const sx = col * _size.x;
                        const sy = row * _size.y;
                        const w = _size.x;
                        const h = _size.y;
                        let hasPixel = false;
                        outer: for (let y = 0; y < h; y++) {
                            for (let x = 0; x < w; x++) {
                                if (imgTexBuf[((sy + y) * imgTex.GetWidth() + (sx + x)) * 4 + 3] !== 0) {
                                    hasPixel = true;
                                    break outer;
                                }
                            }
                        }
                        if (!hasPixel)
                            continue;
                        codi.push(new CVec4(sx, sy, sx + w, sy + h));
                    }
                }
                resolve(await this.PushTexTiles(imgTex, codi));
            });
            img.src = _texName;
        });
    }
    async RebuildRect(_w, _h) {
        this.mRect = new AtlasMaxRects(_w, _h);
        const newTexCodi = [];
        for (let oldTexCodi of this.mTexel) {
            if (oldTexCodi == null) {
                newTexCodi.push(null);
                continue;
            }
            const w = oldTexCodi.z - oldTexCodi.x;
            const h = oldTexCodi.w - oldTexCodi.y;
            const r = this.mRect.Insert(w + this.mPadding * 2, h + this.mPadding * 2);
            newTexCodi.push(new CVec4(r.x + this.mPadding, r.y + this.mPadding, r.x + w + this.mPadding, r.y + h + this.mPadding));
        }
        const newBuf = new Uint8Array(_w * _h * 4);
        let srcBuf = this.GetBuf()[0];
        let srcW = this.mWidth, srcH = this.mHeight;
        const blitSafe = (sBuf, sW, sH, dBuf, dW, dH, sx, sy, dx, dy, w, h) => {
            let sx0 = sx, sy0 = sy, dx0 = dx, dy0 = dy, cw = w, ch = h;
            if (sx0 < 0) {
                cw += sx0;
                dx0 -= sx0;
                sx0 = 0;
            }
            if (dx0 < 0) {
                cw += dx0;
                sx0 -= dx0;
                dx0 = 0;
            }
            if (sx0 + cw > sW)
                cw = sW - sx0;
            if (dx0 + cw > dW)
                cw = Math.min(cw, dW - dx0);
            if (sy0 < 0) {
                ch += sy0;
                dy0 -= sy0;
                sy0 = 0;
            }
            if (dy0 < 0) {
                ch += dy0;
                sy0 -= dy0;
                dy0 = 0;
            }
            if (sy0 + ch > sH)
                ch = sH - sy0;
            if (dy0 + ch > dH)
                ch = Math.min(ch, dH - dy0);
            if (cw <= 0 || ch <= 0)
                return;
            const rowBytes = cw * 4;
            for (let y = 0; y < ch; y++) {
                const s = ((sy0 + y) * sW + sx0) * 4;
                const d = ((dy0 + y) * dW + dx0) * 4;
                dBuf.set(sBuf.subarray(s, s + rowBytes), d);
            }
        };
        if (srcBuf) {
            for (let i = 0; i < this.mTexel.length; i++) {
                const oldC = this.mTexel[i];
                const newC = newTexCodi[i];
                if (!oldC || !newC)
                    continue;
                const ow = oldC.z - oldC.x;
                const oh = oldC.w - oldC.y;
                const pad = this.mPadding;
                const srcX = oldC.x - pad;
                const srcY = oldC.y - pad;
                const dstX = newC.x - pad;
                const dstY = newC.y - pad;
                const ww = ow + pad * 2;
                const hh = oh + pad * 2;
                blitSafe(srcBuf, srcW, srcH, newBuf, _w, _h, srcX, srcY, dstX, dstY, ww, hh);
            }
        }
        this.mTexel = newTexCodi;
        this.mWidth = _w;
        this.mHeight = _h;
        this.GetBuf()[0] = newBuf;
        this.mUrlMap.clear();
        this.mGBuffer = new Array();
    }
    ImportCJSON(_target) {
        return super.ImportCJSON(_target);
    }
    ExportCJSON() {
        return super.ExportCJSON();
    }
}
class AtlasMaxRects {
    mWidth;
    mHeight;
    freeRectangles;
    constructor(_width, _height) {
        this.mWidth = _width;
        this.mHeight = _height;
        this.freeRectangles = [new CVec4(0, 0, _width, _height)];
    }
    Insert(w, h) {
        const bestNode = this.FindBestNode(w, h);
        if (!bestNode)
            return null;
        this.SplitFreeRectangles(new CVec4(bestNode.x, bestNode.y, w, h));
        this.PruneFreeRectangles();
        return new CVec2(bestNode.x, bestNode.y);
    }
    MarkUsed(x, y, w, h) {
        this.SplitFreeRectangles(new CVec4(x, y, w, h));
        this.PruneFreeRectangles();
    }
    FindBestNode(w, h) {
        let bestNode = null;
        let bestScore = Infinity;
        for (const rect of this.freeRectangles) {
            if (rect.z >= w && rect.w >= h) {
                const score = this.ScoreRect(rect, w, h);
                if (score < bestScore) {
                    bestScore = score;
                    bestNode = new CVec4(rect.x, rect.y, rect.z, rect.w);
                }
            }
        }
        return bestNode;
    }
    ScoreRect(rect, w, h) {
        return rect.z * rect.w - w * h;
    }
    SplitFreeRectangles(usedRect) {
        const newFreeRectangles = [];
        for (const rect of this.freeRectangles) {
            if (usedRect.x >= rect.x + rect.z ||
                usedRect.x + usedRect.z <= rect.x ||
                usedRect.y >= rect.y + rect.w ||
                usedRect.y + usedRect.w <= rect.y) {
                newFreeRectangles.push(rect);
                continue;
            }
            if (usedRect.x > rect.x) {
                newFreeRectangles.push(new CVec4(rect.x, rect.y, usedRect.x - rect.x, rect.w));
            }
            if (usedRect.x + usedRect.z < rect.x + rect.z) {
                newFreeRectangles.push(new CVec4(usedRect.x + usedRect.z, rect.y, rect.x + rect.z - (usedRect.x + usedRect.z), rect.w));
            }
            if (usedRect.y > rect.y) {
                newFreeRectangles.push(new CVec4(rect.x, rect.y, rect.z, usedRect.y - rect.y));
            }
            if (usedRect.y + usedRect.w < rect.y + rect.w) {
                newFreeRectangles.push(new CVec4(rect.x, usedRect.y + usedRect.w, rect.z, rect.y + rect.w - (usedRect.y + usedRect.w)));
            }
        }
        this.freeRectangles = newFreeRectangles;
    }
    PruneFreeRectangles() {
        const pruned = [];
        for (let i = 0; i < this.freeRectangles.length; i++) {
            let keep = true;
            for (let j = 0; j < this.freeRectangles.length; j++) {
                if (i !== j && this.IsContainedIn(this.freeRectangles[i], this.freeRectangles[j])) {
                    keep = false;
                    break;
                }
            }
            if (keep) {
                pruned.push(this.freeRectangles[i]);
            }
        }
        this.freeRectangles = pruned;
    }
    IsContainedIn(rectA, rectB) {
        return (rectA.x >= rectB.x &&
            rectA.y >= rectB.y &&
            rectA.x + rectA.z <= rectB.x + rectB.z &&
            rectA.y + rectA.w <= rectB.y + rectB.w);
    }
}
