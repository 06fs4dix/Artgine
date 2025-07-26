import { CVec4 } from "../geometry/CVec4.js";
import { CTexture } from "../render/CTexture.js";
import { CH5Canvas } from "../render/CH5Canvas.js";
import { CBase64File } from "./CBase64File.js";
import { CString } from "../basic/CString.js";
import { CParserTGA, CTARGA } from "./parser/CParserTGA.js";
import { CUniqueID } from "../basic/CUniqueID.js";
import { CModal } from "../basic/CModal.js";
import { CVec2 } from "../geometry/CVec2.js";
import { CDomFactory } from "../basic/CDOMFactory.js";
import { CObject } from "../basic/CObject.js";
import { CClass } from "../basic/CClass.js";
import { CUtilObj } from "../basic/CUtilObj.js";
import { CUtil } from "../basic/CUtil.js";
import { CUtilRender } from "../render/CUtilRender.js";
let g_atlJBox;
export class CAtlas extends CObject {
    mTexCodi = new Array();
    mWidth = 0;
    mHeight = 0;
    mPadding = 1;
    mBase64 = new CBase64File();
    mTex = null;
    mTexFilter = CTexture.eFilter.Neaest;
    mTexMipMap = CTexture.eMipmap.GL;
    mCreate = false;
    mBase64Map = new Map();
    constructor() {
        super();
        this.SetKey(CUniqueID.GetHash() + ".atl");
    }
    IsShould(_member, _type) {
        if (_member == "mTex" && _type != CObject.eShould.Editer)
            return false;
        if (_member == "mCreate" || _member == "mBase64Map")
            return false;
        return super.IsShould(_member, _type);
    }
    async CreateTex() {
        if (this.mCreate) {
            while (this.mTex == null) {
                await setTimeout(() => { }, 100);
            }
            return;
        }
        if (this.mBase64.mData == null)
            return;
        this.mCreate = true;
        var par = new CParserTGA();
        par.SetBuffer(new Uint8Array(this.mBase64.mData), this.mBase64.mData.byteLength);
        await par.Load("test");
        this.mTex = par.GetResult();
        this.mTex.SetFilter(this.mTexFilter);
        this.mTex.SetMipMap(this.mTexMipMap);
        this.mCreate = false;
    }
    GetTex() {
        return this.mTex;
    }
    async GetImgURL(_index = -1) {
        await this.CreateTex();
        let tex = this.GetTex();
        if (!tex)
            return "";
        let url = this.mBase64Map.get(_index);
        if (url != null)
            return url;
        let codi = this.mTexCodi[_index];
        if (_index == -1) {
            CH5Canvas.Init(tex.GetWidth(), tex.GetHeight());
            CH5Canvas.PushImgData(tex.GetBuf()[0], 0, 0);
        }
        else if (codi == null) {
            CH5Canvas.Init(1, 1);
            CH5Canvas.Draw([
                CH5Canvas.Cmd("fillStyle", "black"),
                ...CH5Canvas.FillRect(0, 0, 1, 1)
            ]);
        }
        else {
            let w = codi.z - codi.x;
            let h = codi.w - codi.y;
            CH5Canvas.Init(w, h);
            CH5Canvas.PushSlicedImgData(tex.GetBuf()[0], tex.GetWidth(), codi.x, codi.y, w, h);
        }
        url = CH5Canvas.GetDataURL();
        this.mBase64Map.set(_index, url);
        return url;
    }
    async GetImgTexture(_index = -1) {
        await this.CreateTex();
        let tex = this.GetTex();
        if (!tex)
            return null;
        let codi = this.mTexCodi[_index];
        if (_index == -1) {
            CH5Canvas.Init(tex.GetWidth(), tex.GetHeight());
            CH5Canvas.PushImgData(tex.GetBuf()[0], 0, 0);
        }
        else if (codi == null) {
            CH5Canvas.Init(1, 1);
            CH5Canvas.Draw([
                CH5Canvas.Cmd("fillStyle", "black"),
                ...CH5Canvas.FillRect(0, 0, 1, 1)
            ]);
        }
        else {
            let w = codi.z - codi.x;
            let h = codi.w - codi.y;
            CH5Canvas.Init(w, h);
            CH5Canvas.PushSlicedImgData(tex.GetBuf()[0], tex.GetWidth(), codi.x, codi.y, w, h);
        }
        return CH5Canvas.GetNewTex();
    }
    EditHTMLInit(_div) {
        super.EditHTMLInit(_div);
        _div.append(CDomFactory.DataToDom({ "<>": "button", "text": "Modify", "onclick": () => {
                this.ModifyModal();
            } }));
        _div.append(CDomFactory.DataToDom({ "<>": "button", "text": "Reload Texture", "onclick": () => {
                this.mTex = null;
                this.CreateTex();
            } }));
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
    async ModifyModal(_clickEvent = null, _remove = false) {
        let AtlasPush = (e) => {
            if (e.target.files && e.target.files.length > 0) {
                for (var file of e.target.files) {
                    var reader = new FileReader();
                    reader.onload = async (evt) => {
                        if (evt.target.readyState == FileReader.DONE) {
                            await this.Push("file", evt.target.result);
                            this.ModifyModal(_clickEvent, clickToRemove);
                        }
                    };
                    reader.readAsArrayBuffer(file);
                }
            }
        };
        let mainOnClick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            for (let i = 0; i < this.mTexCodi.length; ++i) {
                let codi = this.mTexCodi[i];
                if (codi == null) {
                    continue;
                }
                if (codi.x <= e.offsetX && codi.z >= e.offsetX && codi.y <= e.offsetY && codi.w >= e.offsetY) {
                    if (_clickEvent != null) {
                        _clickEvent(i);
                        if (g_atlJBox)
                            g_atlJBox.Close();
                        return;
                    }
                    if (clickToRemove) {
                        this.RemoveTexCodi(i);
                        this.ModifyModal(_clickEvent, clickToRemove);
                        return;
                    }
                }
            }
            if (_clickEvent != null) {
                _clickEvent(-1);
                if (g_atlJBox)
                    g_atlJBox.Close();
            }
        };
        let curIndex = -1;
        let mainOnMouseMove = (e) => {
            e.preventDefault();
            e.stopPropagation();
            let index = curIndex;
            let notInside = true;
            for (let i = 0; i < this.mTexCodi.length; ++i) {
                let codi = this.mTexCodi[i];
                if (codi == null) {
                    continue;
                }
                if (codi.x <= e.offsetX && codi.z >= e.offsetX && codi.y <= e.offsetY && codi.w >= e.offsetY) {
                    notInside = false;
                    index = i;
                    break;
                }
            }
            if (notInside == false && index != curIndex) {
                drawImgOnCanvas(index);
                curIndex = index;
            }
            else if (notInside == true && curIndex != -1) {
                drawImgOnCanvas();
                curIndex = -1;
            }
        };
        let cardMain = { "<>": "div", "html": [
                { "<>": "div", "id": "atlCan_card", "style": "width:100%;" }
            ] };
        let drawImgOnCard = (_index = -1) => {
            let AtlCan_Div = CUtil.ID("atlCan_card");
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
            imgDiv.onmouseenter = (e) => {
                imgDiv.style.backgroundColor = "#8888FF";
            };
            imgDiv.onmouseleave = (e) => {
                imgDiv.style.backgroundColor = "white";
            };
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
            for (let i = 0; i < this.mTexCodi.length; i++) {
                let codi = this.mTexCodi[i];
                if (codi == null) {
                    continue;
                }
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
                        if (clickToRemove) {
                            this.RemoveTexCodi(i);
                            this.ModifyModal(_clickEvent, clickToRemove);
                        }
                    };
                    imgDiv.onmouseenter = (e) => {
                        imgDiv.style.backgroundColor = "#8888FF";
                    };
                    imgDiv.onmouseleave = (e) => {
                        imgDiv.style.backgroundColor = "";
                    };
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
        let canvMain = { "<>": "div", "html": [
                { "<>": "canvas", "id": "atlCan_can", "width": this.mWidth, "height": this.mHeight, "style": "border: 1px solid red;", "onclick": mainOnClick, "onmousemove": mainOnMouseMove },
            ] };
        let drawImgOnCanvas = async (_index = -1) => {
            let fontSize = 16;
            let canvas = CUtil.ID("atlCan_can");
            let ctx = canvas.getContext("2d");
            let adjustFontSize = (_text, _maxWidth, _maxHeight) => {
                let textWidth, textHeight;
                do {
                    ctx.font = "bold " + fontSize + "px arial";
                    textWidth = ctx.measureText(_text).width;
                    textHeight = fontSize;
                    if (textWidth > _maxWidth || textHeight > _maxHeight) {
                        fontSize--;
                    }
                } while (textWidth > _maxWidth || textHeight > _maxHeight);
                return fontSize;
            };
            let img = new Image();
            img.onload = () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);
                for (let i = 0; i < this.mTexCodi.length; ++i) {
                    let codi = this.mTexCodi[i];
                    if (codi == null) {
                        continue;
                    }
                    let text = i + "";
                    fontSize = 20;
                    adjustFontSize(text, codi.z - codi.x, codi.w - codi.y);
                    ctx.fillStyle = "#FF0000";
                    ctx.font = "bold " + fontSize + "px arial";
                    let width = ctx.measureText(text).width;
                    ctx.fillText(text, codi.x + (codi.z - codi.x) * 0.5 - width * 0.5, codi.y + (codi.w - codi.y) * 0.5 + fontSize * 0.5);
                    if (i == _index) {
                        ctx.fillStyle = "#0000FF44";
                        ctx.fillRect(codi.x, codi.y, codi.z - codi.x, codi.w - codi.y);
                    }
                }
            };
            let base64Img = await this.GetImgURL();
            img.src = base64Img;
        };
        let clickToRemove = _remove;
        let prevCanvTab = CUtil.ID("vCanvStyle_tab");
        let prevActiveTabIndex = (prevCanvTab != null && prevCanvTab.classList.contains("active")) ? 1 : 0;
        let prevDiv = CUtil.ID("CAtlas_Div");
        let st = prevDiv == null ? 0 : prevDiv.scrollTop;
        let tabs = { "<>": "div", "html": [
                { "<>": "div", "style": "display:flex;", "html": [
                        { "<>": "div", "id": "CAtlas_Div", "style": "width:100%;overflow:auto;", "html": [
                                { "<>": "ul", "class": "nav nav-tabs", "html": [
                                        { "<>": "li", "class": "nav-item", "html": [
                                                { "<>": "a", "class": "nav-link" + (prevActiveTabIndex == 0 ? " active" : ""), "data-bs-toggle": "tab", "href": "#vCardStyle_tab", "text": "Card", "onclick": () => { drawImgOnCard(); } },
                                            ] },
                                        { "<>": "li", "class": "nav-item", "html": [
                                                { "<>": "a", "class": "nav-link" + (prevActiveTabIndex == 1 ? " active" : ""), "data-bs-toggle": "tab", "href": "#vCanvStyle_tab", "text": "Canv", "onclick": () => { drawImgOnCanvas(); } }
                                            ] }
                                    ] },
                                { "<>": "div", "class": "tab-content", "html": [
                                        { "<>": "div", "class": "tab-pane fade" + (prevActiveTabIndex == 0 ? " show active" : ""), "id": "vCardStyle_tab", "html": [cardMain] },
                                        { "<>": "div", "class": "tab-pane fade" + (prevActiveTabIndex == 1 ? " show active" : ""), "id": "vCanvStyle_tab", "html": [canvMain] }
                                    ] }
                            ] },
                    ] },
                { "<>": "input", "type": "file", "multiple": "multiple", "onchange": AtlasPush },
                { "<>": "button", "type": "button", "class": "btn btn-primary float-right", "text": "AniEditer", "onclick": () => {
                        let ani = CClass.New("CAnimation");
                        window["AniTool"](ani, null);
                        window["AniToolAtlasEvent"](this, () => {
                            this.ModifyModal(_clickEvent, clickToRemove);
                        });
                    }
                },
            ] };
        if (_clickEvent == null) {
            tabs.html.push({ "<>": "button", "type": "button", "class": "btn float-right " + (_remove ? "btn-danger" : "btn-primary"), "text": "Delete",
                "onclick": (e) => {
                    if (e.target.classList.contains("btn-primary")) {
                        e.target.classList.remove("btn-primary");
                        e.target.classList.add("btn-danger");
                        clickToRemove = true;
                    }
                    else {
                        e.target.classList.remove("btn-danger");
                        e.target.classList.add("btn-primary");
                        clickToRemove = false;
                    }
                }
            });
        }
        if (g_atlJBox)
            g_atlJBox.Close();
        g_atlJBox = new CModal();
        g_atlJBox.SetTitle(CModal.eTitle.TextClose);
        g_atlJBox.SetSize(640, 480);
        g_atlJBox.SetBody("<div id='atl_div'></div>");
        g_atlJBox.SetResize(true);
        g_atlJBox.Open();
        CUtil.ID("atl_div").append(CDomFactory.DataToDom(tabs));
        if (prevActiveTabIndex == 0) {
            drawImgOnCard();
        }
        else if (prevActiveTabIndex == 1) {
            drawImgOnCanvas();
        }
        CUtil.ID("CAtlas_Div").scrollTop = st;
    }
    async RemoveTexCodi(_off) {
        if (this.mBase64.mData == null)
            return;
        this.mTexCodi[_off] = null;
        let tex = await this.RebuildRect(this.mWidth, this.mHeight);
        var targa = new CTARGA(tex.GetBuf()[0]);
        this.mWidth = targa.imageWidth = tex.GetWidth();
        this.mHeight = targa.imageHeight = tex.GetHeight();
        this.mBase64.mData = targa.GetResult();
        this.mBase64.mExt = "tga";
        this.mBase64.RefreshHash();
        this.mTex = null;
        this.EditRefresh();
    }
    GetTexCodi(_off, _texCodi) {
        if (this.mTexCodi[_off] == null) {
            _texCodi.x = 0;
            _texCodi.y = 0;
            _texCodi.z = 1 / this.mWidth;
            _texCodi.w = 1 / this.mHeight;
            return;
        }
        _texCodi.x = this.mTexCodi[_off].x / this.mWidth;
        _texCodi.y = (this.mHeight - this.mTexCodi[_off].y) / this.mHeight;
        _texCodi.z = this.mTexCodi[_off].z / this.mWidth;
        _texCodi.w = (this.mHeight - this.mTexCodi[_off].w) / this.mHeight;
    }
    static s_atlasLoadMap = new Map();
    ImportCJSON(_json) {
        let base64 = null;
        {
            if (CAtlas.s_atlasLoadMap.has(_json.GetStr("m_key"))) {
                base64 = CAtlas.s_atlasLoadMap.get(_json.GetStr("m_key"));
                _json.Set("m_base64", null);
            }
        }
        let result = super.ImportCJSON(_json);
        if (base64 == null) {
            CAtlas.s_atlasLoadMap.set(result.Key(), this.mBase64);
        }
        else {
            result.mBase64 = base64;
            this.mBase64 = base64;
        }
        return result;
    }
    m_rect;
    Push(_texName, _buf = null, _codi = new Array()) {
        return new Promise((resolve, reject) => {
            if (_buf != null) {
                let blob = new Blob([_buf], { type: "image/" + CString.ExtCut(_texName).ext });
                _texName = window.URL.createObjectURL(blob);
            }
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.addEventListener('load', async (_event) => {
                if (this.m_rect == null) {
                    this.m_rect = new AtlasMaxRects(this.mWidth == 0 ? 128 : this.mWidth, this.mHeight == 0 ? 128 : this.mHeight);
                    for (let codi of this.mTexCodi) {
                        const w = codi.z - codi.x + 1;
                        const h = codi.w - codi.y + 1;
                        this.m_rect.Insert(w, h);
                    }
                    this.mWidth = this.m_rect.mWidth;
                    this.mHeight = this.m_rect.mHeight;
                }
                const img = _event.currentTarget;
                CH5Canvas.Init(img.width, img.height);
                CH5Canvas.Draw(CH5Canvas.DrawImage(img, 0, 0, img.width, img.height));
                const imgTex = CH5Canvas.GetNewTex();
                const imgTexBuf = imgTex.GetBuf()[0];
                if (_codi.length == 0)
                    _codi.push(new CVec4(0, 0, img.width, img.height));
                let atlTex = null;
                if (this.mBase64.mData != null) {
                    await this.CreateTex();
                    atlTex = this.GetTex();
                }
                else {
                    atlTex = new CTexture();
                    atlTex.SetSize(128, 128);
                    atlTex.CreateBuf();
                }
                let atlTexBuf = atlTex.GetBuf()[0];
                for (let k = 0; k < _codi.length; ++k) {
                    const codi = _codi[k];
                    const w = codi.z - codi.x;
                    const h = codi.w - codi.y;
                    if (w == 0 || h == 0)
                        continue;
                    const paddedW = w + this.mPadding * 2;
                    const paddedH = h + this.mPadding * 2;
                    let insertRect = this.m_rect.Insert(paddedW, paddedH);
                    if (insertRect == null) {
                        const newW = CUtilRender.CloseToExp(this.mWidth + paddedW);
                        const newH = CUtilRender.CloseToExp(this.mHeight + paddedH);
                        const higherOne = Math.max(newW, newH);
                        let newTex = await this.RebuildRect(higherOne, higherOne, atlTex);
                        atlTex = newTex;
                        atlTexBuf = newTex.GetBuf()[0];
                        insertRect = this.m_rect.Insert(paddedW, paddedH);
                    }
                    let texCodiIdx = this.mTexCodi.indexOf(null);
                    if (texCodiIdx != -1) {
                        this.mTexCodi[texCodiIdx] =
                            new CVec4(insertRect.x + this.mPadding, insertRect.y + this.mPadding, insertRect.x + w + this.mPadding, insertRect.y + h + this.mPadding);
                    }
                    else {
                        this.mTexCodi.push(new CVec4(insertRect.x + this.mPadding, insertRect.y + this.mPadding, insertRect.x + w + this.mPadding, insertRect.y + h + this.mPadding));
                    }
                    const srcX = codi.x;
                    const srcY = codi.y;
                    const dstX = insertRect.x + this.mPadding;
                    const dstY = insertRect.y + this.mPadding;
                    for (let y = 0; y < h; y++) {
                        const src = (srcX + (srcY + y) * imgTex.GetWidth()) * 4;
                        const dst = (dstX + (dstY + y) * atlTex.GetWidth()) * 4;
                        atlTexBuf.set(imgTexBuf.subarray(src, src + 4 * w), dst);
                    }
                    for (let x = 0; x < w; x++) {
                        const from = ((dstX + x) + (dstY) * atlTex.GetWidth()) * 4;
                        for (let pc = 0; pc < this.mPadding; ++pc) {
                            const to = ((dstX + x) + (dstY - pc - 1) * atlTex.GetWidth()) * 4;
                            atlTexBuf.set(atlTexBuf.subarray(from, from + 4), to);
                        }
                        const fromB = ((dstX + x) + (dstY + h - 1) * atlTex.GetWidth()) * 4;
                        for (let pc = 0; pc < this.mPadding; ++pc) {
                            const toB = ((dstX + x) + (dstY + h + pc) * atlTex.GetWidth()) * 4;
                            atlTexBuf.set(atlTexBuf.subarray(fromB, fromB + 4), toB);
                        }
                    }
                    for (let y = -this.mPadding; y < h + this.mPadding; y++) {
                        const from = ((dstX) + (dstY + y) * atlTex.GetWidth()) * 4;
                        for (let pc = 0; pc < this.mPadding; ++pc) {
                            const to = ((dstX - pc - 1) + (dstY + y) * atlTex.GetWidth()) * 4;
                            atlTexBuf.set(atlTexBuf.subarray(from, from + 4), to);
                        }
                        const fromB = ((dstX + w - 1) + (dstY + y) * atlTex.GetWidth()) * 4;
                        for (let pc = 0; pc < this.mPadding; ++pc) {
                            const toB = ((dstX + w + pc) + (dstY + y) * atlTex.GetWidth()) * 4;
                            atlTexBuf.set(atlTexBuf.subarray(fromB, fromB + 4), toB);
                        }
                    }
                }
                var targa = new CTARGA(atlTexBuf);
                this.mWidth = targa.imageWidth = atlTex.GetWidth();
                this.mHeight = targa.imageHeight = atlTex.GetHeight();
                this.mBase64.mData = targa.GetResult();
                this.mBase64.mExt = "tga";
                this.mBase64.RefreshHash();
                this.mTex = null;
                resolve(true);
            });
            img.src = _texName;
        });
    }
    async RebuildRect(_w, _h, _beforeTex = null) {
        this.m_rect = new AtlasMaxRects(_w, _h);
        let newTexCodi = [];
        for (let oldTexCodi of this.mTexCodi) {
            if (oldTexCodi == null) {
                newTexCodi.push(null);
                continue;
            }
            const w = oldTexCodi.z - oldTexCodi.x;
            const h = oldTexCodi.w - oldTexCodi.y;
            let rect = this.m_rect.Insert(w + this.mPadding * 2, h + this.mPadding * 2);
            newTexCodi.push(new CVec4(rect.x + this.mPadding, rect.y + this.mPadding, rect.x + w + this.mPadding, rect.y + h + this.mPadding));
        }
        const newTex = new CTexture();
        newTex.SetSize(_w, _h);
        newTex.CreateBuf();
        const newBuf = newTex.GetBuf()[0];
        let oldTex = null;
        if (_beforeTex != null) {
            let oldWidth = _beforeTex.GetWidth();
            let oldHeight = _beforeTex.GetHeight();
            let oldTexBuf = _beforeTex.GetBuf()[0];
            for (let y = 0; y < oldHeight; y++) {
                const srcStart = y * oldWidth * 4;
                const dstStart = y * _w * 4;
                const rowLength = oldWidth * 4;
                newBuf.set(oldTexBuf.subarray(srcStart, srcStart + rowLength), dstStart);
            }
        }
        else if (this.mBase64.mData != null) {
            await this.CreateTex();
            oldTex = this.GetTex();
            let oldTexBuf = oldTex.GetBuf()[0];
            for (let codiIdx = 0; codiIdx < this.mTexCodi.length; codiIdx++) {
                let oldCodi = this.mTexCodi[codiIdx];
                let newCodi = newTexCodi[codiIdx];
                if (oldCodi == null)
                    continue;
                if (newCodi == null)
                    continue;
                const oldCodiW = oldCodi.z - oldCodi.x;
                const oldCodiH = oldCodi.w - oldCodi.y;
                for (let y = -this.mPadding; y < oldCodiH + this.mPadding; y++) {
                    let src = ((oldCodi.y + y) * this.mWidth + (oldCodi.x - this.mPadding)) * 4;
                    let dst = ((newCodi.y + y) * _w + (newCodi.x - this.mPadding)) * 4;
                    newBuf.set(oldTexBuf.subarray(src, src + (oldCodiW + this.mPadding * 2) * 4), dst);
                }
            }
        }
        this.mTexCodi = newTexCodi;
        this.mWidth = _w;
        this.mHeight = _h;
        return newTex;
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
