import { CAtelier } from "../app/CAtelier.js";
import { CPaint2D } from "../app/component/paint/CPaint2D.js";
import { CSubject } from "../app/subject/CSubject.js";
import { CDOM } from "../basic/CDOM.js";
import { CEvent } from "../basic/CEvent.js";
import { CVec2 } from "../geometry/CVec2.js";
import { CVec3 } from "../geometry/CVec3.js";
import { CVec4 } from "../geometry/CVec4.js";
import { CH5Canvas } from "../render/CH5Canvas.js";
import { CImgPro } from "../render/CImgPro.js";
import { CTexture, CTextureInfo } from "../render/CTexture.js";
import { CFile } from "../system/CFile.js";
import { CInput } from "../system/CInput.js";
import { CCamCon2DFreeMove, CCamCon3DFirstPerson } from "../util/CCamCon.js";
import { CChecker } from "../util/CChecker.js";
import { CLoaderOption } from "../util/CLoader.js";
import { CModalFlex } from "../util/CModalUtil.js";
import { SDF } from "../z_file/SDF.js";
import { CRollBack, CRollBackInfo } from "../util/CRollBack.js";
import { CMath } from "../geometry/CMath.js";
import { CColor } from "../render/CColor.js";
var gRoll = null;
var gModal;
var gAtl;
var gTexSub;
var gTarTex;
var gTarPaint;
var gOrgBuf;
var gOrgWidth;
var gOrgHeight;
var gOrgDepth;
var gOrgAlphaUse;
var gOrgYFlip;
var gBrushSize;
var gBrushOpacity;
var gBrushDrawType;
var gBrushColor;
var gBrushColorChannel;
var gBrushInvert;
var gBrushAddIndex;
var gBrushColorStrength;
var gEyedropperMode;
var gBgImg;
var gBgTexBlendRatio;
var curPresets;
var gSetPresets;
var gAddPresets;
var gDelPresets;
var gPresetIndex;
var gMapLabels;
var gCellSize;
export function BufferTool(_buffer, _count, _labels = null, _cellSize = null, _alphaUse = false, _yFlip = false) {
    gOrgBuf = _buffer;
    gOrgWidth = _count.x;
    gOrgHeight = _count.y;
    gOrgDepth = _count.z;
    gOrgAlphaUse = _alphaUse;
    gOrgYFlip = _yFlip;
    gMapLabels = _labels;
    gCellSize = _cellSize;
    gBgImg = "check.tex";
    return new Promise(resolve => {
        gModal = new CModalFlex([0.7, 0.3], "BufferTool");
        gModal.SetHeader("BufferTool");
        gModal.SetSize(1000, 800);
        gModal.Open();
        gModal.On(CEvent.eType.Close, () => { BufferClose(); resolve(); });
        const maxHeight = "calc(100vh - 10px)";
        const leftPanel = gModal.FindFlex(0);
        const rightPanel = gModal.FindFlex(1);
        [leftPanel, rightPanel].forEach(panel => {
            panel.style.maxHeight = maxHeight;
            panel.style.overflowY = "auto";
        });
        let canvas = CDOM.DataToDom(`
        <div style="position: relative; width: 100%; height: 100%;">
            <canvas id="BufLeft_can" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: block; z-index: 0;"/>
        </div>
    `);
        leftPanel.append(canvas);
        let rightHTML = CDOM.DataToDom(`
        <div class="card border-secondary p-2 w-100 brush-panel">

            <!-- 스포이드 -->
            <div class="mb-3 d-flex align-items-center gap-2">
                <button id="eyedropperBtn" class="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1">
                    <span>💧</span><span>스포이드</span>
                </button>
                <span id="eyedropperStatus" class="text-secondary" style="font-size:0.72rem;"></span>
            </div>

            <hr class="border-secondary my-2">
            <br>

            <!-- 배경 이미지 -->
            <div class="mb-3 d-flex align-items-center gap-2">
                <button id="bgImgBtn" class="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1">
                    <span>배경 이미지 변경</span>
                </button>
                <span id="bgImgStatus" class="text-secondary" style="font-size:0.72rem;"></span>
            </div>

            <div class="row g-1 align-items-center mb-2">
                <div class="col-4 text-secondary">배경 블렌드 비율</div>
                <div class="col-6">
                    <input type="range" id="blendRange" class="form-range" min="0" max="1" value="1" step="0.1">
                </div>
                <div class="col-2">
                    <input type="number" id="blendNum" class="form-control form-control-sm text-center p-0" min="0" max="1" value="1" step="0.1">
                </div>
            </div>

            <hr class="border-secondary my-2">
            <br>

            <!-- Draw Type 선택 -->
            <div class="mb-3">
                <label for="brushDrawTypeSelect" class="form-label">그리기 타입</label>
                <select id="brushDrawTypeSelect" class="form-select form-select-sm mb-2">
                    <option value="0">Set</option>
                    <option value="1">Add</option>
                    <option value="2">Del</option>
                </select>
            </div>

            <!-- ── Texture 탭 ── -->
            <div class="mb-3">
                <label for="tabTexture" class="form-label">브러시 텍스쳐</label>
                <div id="tabTexture">
                    <div class="d-flex gap-2">

                        <!-- 왼쪽: 프리뷰 -->
                        <div class="preview-box checker-bg border border-secondary rounded overflow-hidden flex-shrink-0">
                            <canvas id="previewCanvas" style="width:100%;height:100%;display:block;"></canvas>
                        </div>

                        <!-- 오른쪽: 그리드 + 버튼 -->
                        <div class="d-flex flex-column flex-fill gap-1">
                            <div id="brushGridWrap" class="brush-grid-wrap bg-secondary bg-opacity-25 border border-secondary rounded p-1">
                                <div id="brushSelector"></div>
                            </div>
                            <div class="form-check form-check-inline m-0">
                                <input class="form-check-input" type="checkbox" id="invertCheck">
                                <label class="form-check-label text-secondary" for="invertCheck" style="font-size:0.72rem;">Invert Texture</label>
                            </div>
                            <div class="d-flex justify-content-end">
                                <button id="addBrushBtn" class="btn btn-sm btn-outline-secondary">새 브러시(구현 없음)</button>
                            </div>
                        </div>

                    </div>

                </div>
            </div>

            <hr class="border-secondary my-2">
            <br>

            <!-- ── Color 탭 ── -->
            <div class="mb-3">
                <label for="tabTexture" class="form-label">브러시 색상</label>

                <div id="tabColorSet">

                    <!-- MapLabel 선택 -->
                    <div id="mapLabelWrap" class="mb-2" style="display:none;">
                        <select id="mapLabelSelect" class="form-select form-select-sm"></select>
                    </div>

                    <div class="d-flex gap-2">

                        <!-- 왼쪽: 컬러 프리뷰 -->
                        <div class="preview-box border border-secondary rounded overflow-hidden flex-shrink-0">
                            <input type="color" id="nativeColorPicker" style="width:100%;height:100%;display:block;" title="클릭하여 색상 선택" disabled />
                        </div>

                        <!-- 오른쪽: RGBA 슬라이더 -->
                        <div class="d-flex flex-column flex-fill justify-content-center gap-1">

                            <!-- HEX 표시 -->
                            <div class="d-flex align-items-center gap-1 mt-1">
                            <span class="text-secondary" style="font-size:0.72rem;">HEX</span>
                            <input type="text" id="hexInput" class="form-control form-control-sm p-0 px-1 text-center"
                                    maxlength="9" value="#FFFFFFFF" style="font-size:0.72rem; font-family:monospace;">
                            </div>

                        </div>
                    </div>
                </div>

                <div id="tabColorAdd" style="display:none;">

                    <div class="d-flex flex-column flex-fill justify-content-center gap-1">

                        <div class="row g-1 align-items-center mb-2">
                            <div class="col-4 text-secondary">색상</div>
                            <div class="col-8">
                                <select id="AddColorSelect" class="form-select form-select-sm mb-2">
                                    <option value="0">R</option>
                                    <option value="1">G</option>
                                    <option value="2">B</option>
                                    <option value="3">PackedRG(16bit)</option>
                                </select>
                            </div>
                        </div>

                        <!-- 강도 -->
                        <div class="row g-1 align-items-center mb-2">
                            <div class="col-4 text-secondary">강도</div>
                            <div class="col-6">
                                <input type="range" id="strengthRange" class="form-range" min="-1" max="1" value="1" step="0.1">
                            </div>
                            <div class="col-2">
                                <input type="number" id="strengthNum" class="form-control form-control-sm text-center p-0" min="-1" max="1" value="1" step="0.1">
                            </div>
                        </div>

                    </div>
                    
                </div>

                <div id="tabColorDel" style="display:none;">

                </div>
            </div>

            <hr class="border-secondary my-2">
            <br>

            <!-- Brush Size -->
            <div class="row g-1 align-items-center mb-2">
                <div class="col-4 text-secondary">브러시 크기</div>
                <div class="col-6">
                    <input type="range" id="sizeRange" class="form-range" min="1" max="200" value="25">
                </div>
                <div class="col-2">
                    <input type="number" id="sizeNum" class="form-control form-control-sm text-center p-0" min="1" max="100" value="25">
                </div>
            </div>

        </div>

        <style>
            .brush-panel { font-size: 0.78rem; }
            .preview-box { width: 100px; height: 100px; flex-shrink: 0; }
            .brush-grid-wrap {
                height: 100px;
                overflow-y: auto;
                overflow-x: hidden;
            }
            #brushSelector {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(28px, 1fr));
                gap: 2px;
            }
            .brush-sel-thumb { aspect-ratio: 1; cursor: pointer; overflow: hidden; }
            .brush-sel-thumb canvas { width: 100%; height: 100%; display: block; }
            .brush-sel-thumb.selected { border-color: #3a7bd5 !important; box-shadow: 0 0 0 1px #3a7bd5; }

            input[type=number]::-webkit-inner-spin-button { display: none; }
            input[type=number] { -moz-appearance: textfield; }

            .checker-bg {
                background-image:
                    linear-gradient(45deg, #555 25%, transparent 25%),
                    linear-gradient(-45deg, #555 25%, transparent 25%),
                    linear-gradient(45deg, transparent 75%, #555 75%),
                    linear-gradient(-45deg, transparent 75%, #555 75%);
                background-size: 10px 10px;
                background-position: 0 0, 0 5px, 5px -5px, -5px 0;
                background-color: #333;
            }

            #colorPreviewBox {
                background-image:
                    linear-gradient(45deg, #555 25%, transparent 25%),
                    linear-gradient(-45deg, #555 25%, transparent 25%),
                    linear-gradient(45deg, transparent 75%, #555 75%),
                    linear-gradient(-45deg, transparent 75%, #555 75%);
                background-size: 10px 10px;
                background-position: 0 0, 0 5px, 5px -5px, -5px 0;
                background-color: #333;
            }
        </style>
    `);
        rightPanel.append(rightHTML);
        gAtl = new CAtelier();
        gAtl.mPF.mIAuto = true;
        gAtl.Init([], "BufLeft_can", false);
        gAtl.Frame().PushEvent(CEvent.eType.Init, BufferInit);
        gAtl.Frame().PushEvent(CEvent.eType.Update, BufferUpdate);
    });
}
function BufferInit() {
    gAtl.Brush().GetCam2D().SetCamCon(new CCamCon2DFreeMove(gAtl.Frame().Input()));
    gAtl.Brush().GetCam3D().SetCamCon(new CCamCon3DFirstPerson(gAtl.Frame().Input()));
    gAtl.NewCanvas("Buf");
    const texHeight = gOrgDepth > 1 ? gOrgHeight * gOrgDepth : gOrgHeight;
    gTarTex = new CTexture();
    gTarTex.SetSize(gOrgWidth, texHeight);
    gTarTex.PushInfo([new CTextureInfo(CTexture.eTarget.Sigle, CTexture.eFormat.RGBA32F)]);
    gTarTex.CreateBuf();
    const dst = gTarTex.GetBuf()[0];
    var size = 4 * gOrgWidth * texHeight;
    for (var i = 0; i < size; i += 4) {
        dst[i + 0] = 1;
        dst[i + 1] = 1;
        dst[i + 2] = 1;
        dst[i + 3] = 1;
    }
    const inv255 = 1.0 / 255.0;
    if (gOrgBuf instanceof Uint32Array) {
        if (gOrgDepth > 1) {
            for (let z = 0; z < gOrgDepth; z++) {
                for (let y = 0; y < gOrgHeight; y++) {
                    for (let x = 0; x < gOrgWidth; x++) {
                        const v = gOrgBuf[x + y * gOrgWidth + z * gOrgWidth * gOrgHeight];
                        const di = ((y * gOrgDepth + z) * gOrgWidth + x) * 4;
                        dst[di + 0] = ((v >>> 24) & 0xFF) * inv255;
                        dst[di + 1] = ((v >>> 16) & 0xFF) * inv255;
                        dst[di + 2] = ((v >>> 8) & 0xFF) * inv255;
                        dst[di + 3] = gOrgAlphaUse ? ((v >>> 0) & 0xFF) * inv255 : 1.0;
                    }
                }
            }
        }
        else {
            for (let y = 0; y < gOrgHeight; y++) {
                for (let x = 0; x < gOrgWidth; x++) {
                    const v = gOrgBuf[x + y * gOrgWidth];
                    const dstY = gOrgYFlip ? (gOrgHeight - 1 - y) : y;
                    const di = (x + dstY * gOrgWidth) * 4;
                    dst[di + 0] = ((v >>> 24) & 0xFF) * inv255;
                    dst[di + 1] = ((v >>> 16) & 0xFF) * inv255;
                    dst[di + 2] = ((v >>> 8) & 0xFF) * inv255;
                    dst[di + 3] = gOrgAlphaUse ? ((v >>> 0) & 0xFF) * inv255 : 1.0;
                }
            }
        }
    }
    else {
        for (let y = 0; y < gOrgHeight; y++) {
            for (let x = 0; x < gOrgWidth; x++) {
                const dstY = gOrgYFlip ? (gOrgHeight - 1 - y) : y;
                const si = (x + y * gOrgWidth) * 4;
                const di = (x + dstY * gOrgWidth) * 4;
                dst[di + 0] = gOrgBuf[si + 0] * inv255;
                dst[di + 1] = gOrgBuf[si + 1] * inv255;
                dst[di + 2] = gOrgBuf[si + 2] * inv255;
                dst[di + 3] = gOrgBuf[si + 3] * inv255;
            }
        }
    }
    gAtl.Frame().Ren().BuildTexture(gTarTex);
    gAtl.Frame().Res().Push("tile.tex", gTarTex);
    CH5Canvas.Init(gOrgWidth, texHeight, false, false);
    for (let y = 0; y < texHeight; y += 4) {
        for (let x = 0; x < gOrgWidth; x += 4) {
            let cx = Math.floor(x / 4);
            let cy = Math.floor(y / 4);
            if ((cx + cy) % 2 == 0)
                CH5Canvas.FillStyle("#cccccc");
            else
                CH5Canvas.FillStyle("#888888");
            CH5Canvas.FillRect(x, y, 4, 4);
        }
    }
    CH5Canvas.Draw();
    const checkTex = CH5Canvas.GetNewTex();
    gAtl.Frame().Ren().BuildTexture(checkTex);
    gAtl.Frame().Res().Push("check.tex", checkTex);
    gTexSub = new CSubject();
    gTarPaint = gTexSub.PushComp(new CPaint2D(gAtl.Frame().Pal().GetNoneTex(), new CVec2(gOrgWidth, texHeight)));
    gTarPaint.SetTexture([gBgImg, "tile.tex", ""]);
    gTarPaint.ResetDecal(0);
    gTarPaint.SetColorModel(new CColor(0.0, 0.0, 0.0, CColor.eModel.None));
    gAtl.Canvas("Buf").PushSub(gTexSub);
    gAtl.Frame().Dev().SetClearColor(true, new CVec4(0.5, 0.5, 0.5, 1));
    PanelInit();
    CRollBack.On("Buffer", (snapshot) => {
        const buf = gTarTex.GetBuf()[0];
        buf.set(snapshot);
        gAtl.Frame().Ren().BuildTexture(gTarTex);
    });
}
function BufferClose() {
    if (gTarTex != null && gTarTex.GetBuf()[0] != null) {
        const src = gTarTex.GetBuf()[0];
        if (gBrushAddIndex == 3) {
            const src = gTarTex.GetBuf()[0];
            for (let y = 0; y < gOrgHeight; y++) {
                for (let x = 0; x < gOrgWidth; x++) {
                    const si = (x + y * gOrgWidth) * 4;
                    const r = CMath.Clamp(src[si + 0], 0.0, 1.0);
                    const ri = r * 256.0;
                    const rf = Math.floor(ri);
                    const g = ri - rf;
                    src[si + 0] = rf / 255.0;
                    src[si + 1] = g;
                }
            }
        }
        const clamp255 = (_v) => {
            _v = _v * 255.0;
            return CMath.Clamp(_v + 0.5, 0, 255);
        };
        if (gOrgBuf instanceof Uint32Array) {
            if (gOrgDepth > 1) {
                for (let z = 0; z < gOrgDepth; z++) {
                    for (let y = 0; y < gOrgHeight; y++) {
                        for (let x = 0; x < gOrgWidth; x++) {
                            const si = ((y * gOrgDepth + z) * gOrgWidth + x) * 4;
                            const bi = x + y * gOrgWidth + z * gOrgWidth * gOrgHeight;
                            const r = clamp255(src[si + 0]);
                            const g = clamp255(src[si + 1]);
                            const b = clamp255(src[si + 2]);
                            const a = gOrgAlphaUse
                                ? clamp255(src[si + 3])
                                : (gOrgBuf[bi] & 0xFF);
                            gOrgBuf[bi] =
                                (r << 24) |
                                    (g << 16) |
                                    (b << 8) |
                                    a;
                        }
                    }
                }
            }
            else {
                for (let y = 0; y < gOrgHeight; y++) {
                    for (let x = 0; x < gOrgWidth; x++) {
                        const srcY = gOrgYFlip ? (gOrgHeight - 1 - y) : y;
                        const si = (x + srcY * gOrgWidth) * 4;
                        const bi = x + y * gOrgWidth;
                        const r = clamp255(src[si + 0]);
                        const g = clamp255(src[si + 1]);
                        const b = clamp255(src[si + 2]);
                        const a = gOrgAlphaUse
                            ? clamp255(src[si + 3])
                            : (gOrgBuf[bi] & 0xFF);
                        gOrgBuf[bi] =
                            (r << 24) |
                                (g << 16) |
                                (b << 8) |
                                a;
                    }
                }
            }
        }
        else {
            for (let y = 0; y < gOrgHeight; y++) {
                for (let x = 0; x < gOrgWidth; x++) {
                    const srcY = gOrgYFlip ? (gOrgHeight - 1 - y) : y;
                    const si = (x + srcY * gOrgWidth) * 4;
                    const di = (x + y * gOrgWidth) * 4;
                    gOrgBuf[di + 0] = clamp255(src[si + 0]);
                    gOrgBuf[di + 1] = clamp255(src[si + 1]);
                    gOrgBuf[di + 2] = clamp255(src[si + 2]);
                    gOrgBuf[di + 3] = clamp255(src[si + 3]);
                }
            }
        }
    }
    gAtl.Frame().Destroy();
    gAtl = null;
    gTexSub = null;
    gTarTex = null;
    gTarPaint = null;
    gOrgBuf = null;
    gOrgDepth = null;
    gOrgAlphaUse = null;
    gOrgYFlip = null;
    CRollBack.Off("Buffer");
    CRollBack.Claear();
}
var prevMouse;
var carryDist = 0;
var prevSnapPos = null;
var gRoll = null;
function BufferUpdate() {
    let mouse = gAtl.Frame().Input().Mouse();
    let pos = gAtl.Brush().GetCam2D().ScreenToWorld2DPoint(mouse.x, mouse.y);
    const shiftHeld = gAtl.Frame().Input().KeyDown(CInput.eKey.Shift);
    if (shiftHeld) {
        const step = gBrushSize;
        const texH = gOrgDepth > 1 ? gOrgHeight * gOrgDepth : gOrgHeight;
        const ox = -gOrgWidth / 2;
        const oy = -texH / 2;
        const half = step / 2;
        pos.x = ox + half + Math.round((pos.x - ox - half) / step) * step;
        pos.y = oy + half + Math.round((pos.y - oy - half) / step) * step;
    }
    if (gEyedropperMode) {
        gTarPaint.SetVFX(1, SDF.eVFX.None, [0, 0, 0, 0]);
    }
    else if (gBrushDrawType == 1 && gBrushAddIndex == 3) {
        if (gTarPaint.GetTexture()[0] != "tile.tex" ||
            gTarPaint.GetTexture()[1] != gBgImg ||
            gTarPaint.GetTexture()[2] != curPresets[gPresetIndex].Key()) {
            if (gAtl.Frame().Res().Find(curPresets[gPresetIndex].Key()) == null) {
                gAtl.Frame().Ren().BuildTexture(curPresets[gPresetIndex]);
                gAtl.Frame().Res().Push(curPresets[gPresetIndex].Key(), curPresets[gPresetIndex]);
            }
            gTarPaint.SetTexture(["tile.tex", gBgImg, curPresets[gPresetIndex].Key()]);
        }
        gTarPaint.SetVFX(0, SDF.eVFX.DecalTexture, [1, 0, 0]);
        gTarPaint.SetVFX(1, SDF.eVFX.DecalTexture, [2, 1 - 0.5 * gBrushInvert, gBrushInvert]);
        gTarPaint.ResetDecal(1, pos, new CVec3(gBrushSize, gBrushSize, 1000));
    }
    else {
        if (gTarPaint.GetTexture()[0] != gBgImg ||
            gTarPaint.GetTexture()[1] != "tile.tex" ||
            gTarPaint.GetTexture()[gTarPaint.GetTexture().length - 1] != curPresets[gPresetIndex].Key()) {
            if (gAtl.Frame().Res().Find(curPresets[gPresetIndex].Key()) == null) {
                gAtl.Frame().Ren().BuildTexture(curPresets[gPresetIndex]);
                gAtl.Frame().Res().Push(curPresets[gPresetIndex].Key(), curPresets[gPresetIndex]);
            }
            gTarPaint.SetTexture([gBgImg, "tile.tex", curPresets[gPresetIndex].Key()]);
        }
        gTarPaint.SetVFX(0, SDF.eVFX.DecalTexture, [1, gBgTexBlendRatio, 0]);
        gTarPaint.SetVFX(1, SDF.eVFX.DecalTexture, [2, 1 - 0.5 * gBrushInvert, gBrushInvert]);
        gTarPaint.ResetDecal(1, pos, new CVec3(gBrushSize, gBrushSize, 1000));
    }
    if (gAtl.Frame().Input().KeyDown(CInput.eKey.LButton, true)) {
        prevMouse = null;
        prevSnapPos = null;
        carryDist = 0;
        if (!gEyedropperMode) {
            const buf = gTarTex.GetBuf()[0];
            gRoll = new CRollBackInfo("Buffer", buf.slice());
        }
    }
    if (gAtl.Frame().Input().KeyDown(CInput.eKey.LButton)) {
        if (gEyedropperMode) {
            const buf = gTarTex.GetBuf()[0];
            if (buf != null) {
                const fmat = gTarPaint.GetBoundFMat();
                const texW = gTarTex.GetWidth();
                const texH = gTarTex.GetHeight();
                const u = pos.x / fmat.GetSize().x + 0.5;
                const v = pos.y / fmat.GetSize().y + 0.5;
                const px = Math.floor(u * texW);
                const py = Math.floor(v * texH);
                if (px >= 0 && px < texW && py >= 0 && py < texH) {
                    const idx = (py * texW + px) * 4;
                    gBrushColor.x = buf[idx + 0];
                    gBrushColor.y = buf[idx + 1];
                    gBrushColor.z = buf[idx + 2];
                    gBrushColor.w = buf[idx + 3];
                    UpdateColorPreview();
                }
            }
        }
        else if (shiftHeld) {
            if (prevSnapPos == null || prevSnapPos.x !== pos.x || prevSnapPos.y !== pos.y) {
                prevSnapPos = new CVec2(pos.x, pos.y);
                prevMouse = null;
                carryDist = 0;
                Draw(pos);
            }
        }
        else {
            prevSnapPos = null;
            if (prevMouse == null) {
                Draw(pos);
                prevMouse = pos;
            }
            else {
                const dx = pos.x - prevMouse.x;
                const dy = pos.y - prevMouse.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const step = Math.max(1, gBrushSize * 0.25);
                if (dist > 0.0001) {
                    let t = (step - carryDist) / dist;
                    while (t <= 1.0) {
                        Draw(new CVec3(prevMouse.x + dx * t, prevMouse.y + dy * t, pos.z));
                        t += step / dist;
                    }
                    carryDist = (1.0 - (t - step / dist)) * dist % step;
                    prevMouse = pos;
                }
            }
        }
    }
    else {
        if (gRoll != null) {
            CRollBack.Push(gRoll);
            gRoll = null;
        }
        prevMouse = null;
        prevSnapPos = null;
        carryDist = 0;
    }
    if (gTexDirty) {
        gAtl.Frame().Ren().BuildTexture(gTarTex);
        gTexDirty = false;
    }
}
var gTexDirty = false;
function Draw(pos) {
    if (gBrushDrawType == 0) {
        CImgPro.DrawBrush(gTarTex, gTarPaint.GetBoundFMat(), pos, new CVec2(gBrushSize, gBrushSize), 0, gBrushColor.x, gBrushDrawType, curPresets[gPresetIndex]);
        CImgPro.DrawBrush(gTarTex, gTarPaint.GetBoundFMat(), pos, new CVec2(gBrushSize, gBrushSize), 1, gBrushColor.y, gBrushDrawType, curPresets[gPresetIndex]);
        CImgPro.DrawBrush(gTarTex, gTarPaint.GetBoundFMat(), pos, new CVec2(gBrushSize, gBrushSize), 2, gBrushColor.z, gBrushDrawType, curPresets[gPresetIndex]);
        CImgPro.DrawBrush(gTarTex, gTarPaint.GetBoundFMat(), pos, new CVec2(gBrushSize, gBrushSize), 3, gBrushColor.w, gBrushDrawType, curPresets[gPresetIndex]);
    }
    else if (gBrushDrawType == 1) {
        if (gBrushAddIndex == 3) {
            var strength = (8 * 256 + 64) / (256 * 256);
            CImgPro.DrawBrush(gTarTex, gTarPaint.GetBoundFMat(), pos, new CVec2(gBrushSize, gBrushSize), 0, gBrushColorStrength * strength, 3, curPresets[gPresetIndex]);
        }
        else {
            if (gBrushColorChannel.x > 0.5)
                CImgPro.DrawBrush(gTarTex, gTarPaint.GetBoundFMat(), pos, new CVec2(gBrushSize, gBrushSize), 0, gBrushColorStrength, gBrushDrawType, curPresets[gPresetIndex]);
            if (gBrushColorChannel.y > 0.5)
                CImgPro.DrawBrush(gTarTex, gTarPaint.GetBoundFMat(), pos, new CVec2(gBrushSize, gBrushSize), 1, gBrushColorStrength, gBrushDrawType, curPresets[gPresetIndex]);
            if (gBrushColorChannel.z > 0.5)
                CImgPro.DrawBrush(gTarTex, gTarPaint.GetBoundFMat(), pos, new CVec2(gBrushSize, gBrushSize), 2, gBrushColorStrength, gBrushDrawType, curPresets[gPresetIndex]);
            if (gBrushColorChannel.w > 0.5)
                CImgPro.DrawBrush(gTarTex, gTarPaint.GetBoundFMat(), pos, new CVec2(gBrushSize, gBrushSize), 3, gBrushColorStrength, gBrushDrawType, curPresets[gPresetIndex]);
        }
    }
    else if (gBrushDrawType == 2) {
        CImgPro.DrawBrush(gTarTex, gTarPaint.GetBoundFMat(), pos, new CVec2(gBrushSize, gBrushSize), 0, 0, 0, curPresets[gPresetIndex]);
        CImgPro.DrawBrush(gTarTex, gTarPaint.GetBoundFMat(), pos, new CVec2(gBrushSize, gBrushSize), 1, 0, 0, curPresets[gPresetIndex]);
        CImgPro.DrawBrush(gTarTex, gTarPaint.GetBoundFMat(), pos, new CVec2(gBrushSize, gBrushSize), 2, 0, 0, curPresets[gPresetIndex]);
        CImgPro.DrawBrush(gTarTex, gTarPaint.GetBoundFMat(), pos, new CVec2(gBrushSize, gBrushSize), 3, 1, 0, curPresets[gPresetIndex]);
    }
    gTexDirty = true;
}
function PanelInit() {
    const BAKE_SIZE = 1024;
    gBrushSize = 25;
    gBrushOpacity = 100;
    gBrushDrawType = 0;
    gPresetIndex = 0;
    gBrushColor = new CVec4(255, 255, 255, 255);
    gBrushColorChannel = new CVec4(1, 0, 0, 0);
    gBrushInvert = 1;
    gEyedropperMode = false;
    gBgTexBlendRatio = 1;
    gBrushAddIndex = 0;
    gBrushColorStrength = 1;
    const Set_DRAW_FNS = [
        { label: 'Hard', hard: true, fn: (s) => { CH5Canvas.FillStyle('#fff'); CH5Canvas.FillCircle(s / 2, s / 2, s / 2); } },
        { label: 'Ring', hard: true, fn: (s) => { CH5Canvas.FillStyle('#fff'); CH5Canvas.StrokeCircle(s / 2, s / 2, s / 2, Math.max(2, s / 10)); } },
        { label: 'Cross', hard: true, fn: (s) => { CH5Canvas.FillStyle('#fff'); CH5Canvas.LineWidth(Math.max(1.5, s / 14)); CH5Canvas.AddCmd([CH5Canvas.Cmd("beginPath", []), CH5Canvas.Cmd("moveTo", [s / 2, 3]), CH5Canvas.Cmd("lineTo", [s / 2, s - 3]), CH5Canvas.Cmd("moveTo", [3, s / 2]), CH5Canvas.Cmd("lineTo", [s - 3, s / 2]), CH5Canvas.Cmd("stroke", [])]); } },
    ];
    gSetPresets = Set_DRAW_FNS.map(({ label, hard, fn }) => {
        CH5Canvas.Init(BAKE_SIZE, BAKE_SIZE, false, false);
        fn(BAKE_SIZE);
        CH5Canvas.Draw();
        const tex = CH5Canvas.GetNewTex();
        if (hard) {
            const buf = tex.GetBuf()[0];
            for (let i = 3; i < buf.length; i += 4) {
                buf[i] = buf[i] >= 128 ? 255 : 0;
            }
        }
        tex.SetKey(label);
        return tex;
    });
    const blackTex = gAtl.Frame().Res().Find(gAtl.Frame().Pal().GetBlackTex());
    blackTex.SetKey(gAtl.Frame().Pal().GetBlackTex());
    gSetPresets.unshift(blackTex);
    const Add_DRAW_FNS = [
        { label: 'Soft', hard: false, fn: (s) => { CH5Canvas.FillRadialGradient(s / 2, s / 2, s / 2, s / 2, 0, s / 2, [{ per: 0, color: 'rgba(255,255,255,1)' }, { per: 1, color: 'rgba(255,255,255,0)' }]); CH5Canvas.FillCircle(s / 2, s / 2, s / 2); } },
        { label: 'SoftSq', hard: false, fn: (s) => { CH5Canvas.FillRadialGradient(s / 2, s / 2, s / 2, s / 2, 0, s / 2, [{ per: 0, color: 'rgba(255,255,255,1)' }, { per: 0.5, color: 'rgba(255,255,255,0.7)' }, { per: 1, color: 'rgba(255,255,255,0)' }]); CH5Canvas.FillRect(2, 2, s - 4, s - 4); } },
        { label: 'Grain', hard: false, fn: (s) => { const cx = s / 2, cy = s / 2, r = s / 2 - 2; for (let i = 0; i < s * s * 0.4; i++) {
                const a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * r;
                CH5Canvas.FillStyle(`rgba(255,255,255,${Math.random() * 0.9})`);
                CH5Canvas.FillRect(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 1.2, 1.2);
            } } },
        { label: 'Scatter', hard: false, fn: (s) => { for (let i = 0; i < 12; i++) {
                const x = s * 0.15 + Math.random() * s * 0.7, y = s * 0.15 + Math.random() * s * 0.7, r = s * 0.06 + Math.random() * s * 0.06;
                CH5Canvas.FillStyle(`rgba(255,255,255,${0.4 + Math.random() * 0.5})`);
                CH5Canvas.FillCircle(x, y, r);
            } } },
        { label: 'Spray', hard: false, fn: (s) => { const r = s / 2 - 2; for (let i = 0; i < 300; i++) {
                const a = Math.random() * Math.PI * 2, d = Math.random() * r, x = s / 2 + Math.cos(a) * d, y = s / 2 + Math.sin(a) * d;
                CH5Canvas.FillStyle(`rgba(255,255,255,${Math.random() * 0.6 * (1 - d / r)})`);
                CH5Canvas.FillRect(x, y, 1, 1);
            } } },
        { label: 'Glow', hard: false, fn: (s) => { for (let i = 3; i > 0; i--) {
                const r = s / 2 * i / 3;
                CH5Canvas.FillRadialGradient(s / 2, s / 2, r, s / 2, s / 2, 0, [{ per: 0, color: `rgba(255,255,255,${0.6 / i})` }, { per: 1, color: 'rgba(255,255,255,0)' }]);
                CH5Canvas.FillCircle(s / 2, s / 2, r);
            } } },
        { label: 'Dots', hard: true, fn: (s) => { const cols = 4, dr = s / (cols * 2 + 1); for (let row = 0; row < cols; row++)
                for (let col = 0; col < cols; col++) {
                    const x = dr + (dr * 2) * col + dr * 0.5 * (row % 2), y = dr + (dr * 1.7) * row, d = Math.hypot(x + dr / 2 - s / 2, y + dr / 2 - s / 2) / (s / 2), op = Math.max(0, 1 - d * 1.2);
                    CH5Canvas.FillStyle(`rgba(255,255,255,${op * 0.9})`);
                    CH5Canvas.FillCircle(x + dr / 2, y + dr / 2, dr * 0.45);
                } } },
        { label: 'Hatch', hard: true, fn: (s) => { CH5Canvas.AddCmd([CH5Canvas.Cmd("save", []), CH5Canvas.Cmd("beginPath", []), CH5Canvas.Cmd("arc", [s / 2, s / 2, s / 2 - 2, 0, Math.PI * 2]), CH5Canvas.Cmd("clip", [])]); const step = s / 10; for (let i = -s; i < s * 2; i += step) {
                const d = Math.abs(i - s / 2) / (s / 2);
                CH5Canvas.StrokeStyle(`rgba(255,255,255,${Math.max(0, 1 - d) * 0.8})`);
                CH5Canvas.LineWidth(1);
                CH5Canvas.AddCmd([CH5Canvas.Cmd("beginPath", []), CH5Canvas.Cmd("moveTo", [i, 0]), CH5Canvas.Cmd("lineTo", [i, s]), CH5Canvas.Cmd("stroke", []), CH5Canvas.Cmd("beginPath", []), CH5Canvas.Cmd("moveTo", [0, i]), CH5Canvas.Cmd("lineTo", [s, i]), CH5Canvas.Cmd("stroke", [])]);
            } CH5Canvas.AddCmd([CH5Canvas.Cmd("restore", [])]); } },
    ];
    gAddPresets = Add_DRAW_FNS.map(({ label, hard, fn }) => {
        CH5Canvas.Init(BAKE_SIZE, BAKE_SIZE, false, false);
        fn(BAKE_SIZE);
        CH5Canvas.Draw();
        const tex = CH5Canvas.GetNewTex();
        if (hard) {
            const buf = tex.GetBuf()[0];
            for (let i = 3; i < buf.length; i += 4) {
                buf[i] = buf[i] >= 128 ? 255 : 0;
            }
        }
        tex.SetKey(label);
        return tex;
    });
    gDelPresets = [blackTex];
    const previewCanvas = document.getElementById('previewCanvas');
    const brushSelector = document.getElementById('brushSelector');
    const addBrushBtn = document.getElementById('addBrushBtn');
    function DrawPreview(_ctx, _tex, dstW, dstH, opacity) {
        let buf = _tex.GetBuf()[0];
        if (buf == null) {
            _tex.CreateBuf();
            buf = _tex.GetBuf()[0];
        }
        const off = document.createElement('canvas');
        off.width = _tex.GetWidth();
        off.height = _tex.GetHeight();
        const imgData = new ImageData(new Uint8ClampedArray(buf.buffer), _tex.GetWidth(), _tex.GetHeight());
        off.getContext('2d').putImageData(imgData, 0, 0);
        _ctx.save();
        _ctx.globalAlpha = opacity;
        _ctx.drawImage(off, 0, 0, _tex.GetWidth(), _tex.GetHeight(), 0, 0, dstW, dstH);
        _ctx.restore();
    }
    function UpdatePreview() {
        const cw = previewCanvas.width, ch = previewCanvas.height;
        if (!cw || !ch)
            return;
        const preset = curPresets[gPresetIndex];
        const opacity = gBrushOpacity / 100;
        const clipSize = Math.max(2, Math.min(cw, ch) / 2 - 2);
        const cx = cw / 2, cy = ch / 2;
        const ctx = previewCanvas.getContext('2d');
        ctx.clearRect(0, 0, cw, ch);
        ctx.save();
        ctx.translate(cx - clipSize, cy - clipSize);
        DrawPreview(ctx, preset, clipSize * 2, clipSize * 2, opacity);
        ctx.restore();
    }
    function MakeThumbnail(_tex, _idx) {
        const thumb = document.createElement('div');
        thumb.className = 'brush-sel-thumb border border-secondary rounded';
        thumb.title = _tex.Key();
        if (_idx === gPresetIndex)
            thumb.classList.add('selected');
        const c = document.createElement('canvas');
        thumb.appendChild(c);
        requestAnimationFrame(() => {
            const sz = thumb.clientWidth || 28;
            c.width = c.height = sz;
            DrawPreview(c.getContext('2d'), _tex, sz, sz, 1);
        });
        thumb.addEventListener('click', () => {
            brushSelector.querySelectorAll('.brush-sel-thumb').forEach(t => t.classList.remove('selected'));
            thumb.classList.add('selected');
            gPresetIndex = _idx;
            UpdatePreview();
        });
        return thumb;
    }
    let brushNum = 0;
    addBrushBtn.addEventListener('click', async () => {
        const file = await CFile.Load();
        if (file == null)
            return;
        const key = "NewBrush" + brushNum++;
        await gAtl.Frame().Load().TextureLoad(key, file, new CLoaderOption());
        const newTexture = gAtl.Frame().Res().Find(key);
        newTexture.SetKey(key);
        curPresets.push(newTexture);
        brushSelector.appendChild(MakeThumbnail(curPresets[curPresets.length - 1], curPresets.length - 1));
    });
    function RefreshThumbnailBox(_preset) {
        curPresets = _preset;
        gPresetIndex = 0;
        brushSelector.innerHTML = '';
        for (let i = 0; i < _preset.length; i++) {
            brushSelector.appendChild(MakeThumbnail(_preset[i], i));
        }
        const box = previewCanvas.parentElement;
        previewCanvas.width = box.clientWidth;
        previewCanvas.height = box.clientHeight;
        UpdatePreview();
    }
    RefreshThumbnailBox(gSetPresets);
    {
        const invertCheck = document.getElementById('invertCheck');
        invertCheck.addEventListener('change', () => {
            gBrushInvert = invertCheck.checked ? 1 : 0;
        });
        invertCheck.checked = gBrushInvert == 0 ? false : true;
    }
    {
        const sizeRange = document.getElementById('sizeRange');
        const sizeNum = document.getElementById('sizeNum');
        const SetBrushSize = val => {
            val = Math.min(+sizeRange.max, Math.max(+sizeRange.min, +val));
            gBrushSize = val;
            sizeRange.value = val;
            sizeNum.value = val;
        };
        sizeRange.addEventListener('input', () => SetBrushSize(sizeRange.value));
        sizeNum.addEventListener('input', () => SetBrushSize(sizeNum.value));
        sizeNum.addEventListener('keydown', e => {
            if (e.key === 'ArrowUp')
                SetBrushSize(gBrushSize + 1);
            if (e.key === 'ArrowDown')
                SetBrushSize(gBrushSize - 1);
        });
        SetBrushSize(gBrushSize);
    }
    {
        const hexInput = document.getElementById('hexInput');
        hexInput.addEventListener('change', () => {
            const hex = hexInput.value.trim().replace(/^#/, '');
            if (!/^[0-9a-fA-F]{6,8}$/.test(hex)) {
                UpdateColorPreview();
                return;
            }
            const r = parseInt(hex.slice(0, 2), 16);
            const g = parseInt(hex.slice(2, 4), 16);
            const b = parseInt(hex.slice(4, 6), 16);
            const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) : 255;
            gBrushColor.x = r;
            gBrushColor.y = g;
            gBrushColor.z = b;
            gBrushColor.w = a;
            UpdateColorPreview();
        });
        const strengthRange = document.getElementById('strengthRange');
        const strengthNum = document.getElementById('strengthNum');
        const SetStrength = val => {
            val = Math.min(+strengthRange.max, Math.max(+strengthRange.min, +val));
            gBrushColorStrength = val;
            strengthRange.value = val;
            strengthNum.value = val;
        };
        strengthRange.addEventListener('input', () => SetStrength(strengthRange.value));
        strengthNum.addEventListener('input', () => SetStrength(strengthNum.value));
        strengthNum.addEventListener('keydown', e => {
            if (e.key === 'ArrowUp')
                SetStrength(gBrushColorStrength + 1);
            if (e.key === 'ArrowDown')
                SetStrength(gBrushColorStrength - 1);
        });
        SetStrength(gBrushColorStrength);
        const addColorSelect = document.getElementById('AddColorSelect');
        addColorSelect.addEventListener('change', () => {
            if (gBrushAddIndex == 3) {
                const src = gTarTex.GetBuf()[0];
                for (let y = 0; y < gOrgHeight; y++) {
                    for (let x = 0; x < gOrgWidth; x++) {
                        const si = (x + y * gOrgWidth) * 4;
                        const r = src[si + 0];
                        const ri = r * 256.0;
                        const rf = Math.floor(ri);
                        const g = ri - rf;
                        src[si + 0] = rf / 255.0;
                        src[si + 1] = g;
                    }
                }
            }
            gBrushAddIndex = +addColorSelect.value;
            gTarPaint.SetColorModel(new CColor(0.0, 0.0, 0.0, CColor.eModel.None));
            if (gBrushAddIndex == 0) {
                gBrushColorChannel.x = 1;
                gBrushColorChannel.y = 0;
                gBrushColorChannel.z = 0;
                gBrushColorChannel.w = 0;
            }
            else if (gBrushAddIndex == 1) {
                gBrushColorChannel.x = 0;
                gBrushColorChannel.y = 1;
                gBrushColorChannel.z = 0;
                gBrushColorChannel.w = 0;
            }
            else if (gBrushAddIndex == 2) {
                gBrushColorChannel.x = 0;
                gBrushColorChannel.y = 0;
                gBrushColorChannel.z = 1;
                gBrushColorChannel.w = 0;
            }
            else if (gBrushAddIndex == 3) {
                gBrushColorChannel.x = 0;
                gBrushColorChannel.y = 0;
                gBrushColorChannel.z = 0;
                gBrushColorChannel.w = 0;
                gTarPaint.SetColorModel(new CColor(1.0, 1.0, 0.0, CColor.eModel.Unpack));
                const src = gTarTex.GetBuf()[0];
                for (let y = 0; y < gOrgHeight; y++) {
                    for (let x = 0; x < gOrgWidth; x++) {
                        const si = (x + y * gOrgWidth) * 4;
                        const r = src[si + 0];
                        const g = src[si + 1];
                        src[si + 0] = r * 255.0 / 256.0 + g * 1.0 / 256.0;
                    }
                }
            }
        });
    }
    {
        const tabColorSet = document.getElementById('tabColorSet');
        const tabColorAdd = document.getElementById('tabColorAdd');
        const tabColorDel = document.getElementById('tabColorDel');
        const addColorSelect = document.getElementById('AddColorSelect');
        const brushDrawTypeSelect = document.getElementById('brushDrawTypeSelect');
        brushDrawTypeSelect.addEventListener('change', () => {
            gBrushDrawType = +brushDrawTypeSelect.value;
            tabColorSet.style.display = "none";
            tabColorAdd.style.display = "none";
            tabColorDel.style.display = "none";
            addColorSelect.selectedIndex = 0;
            addColorSelect.dispatchEvent(new Event('change'));
            if (gBrushDrawType == 0) {
                RefreshThumbnailBox(gSetPresets);
                tabColorSet.style.display = "";
            }
            else if (gBrushDrawType == 1) {
                RefreshThumbnailBox(gAddPresets);
                tabColorAdd.style.display = "";
            }
            else if (gBrushDrawType == 2) {
                RefreshThumbnailBox(gDelPresets);
                tabColorDel.style.display = "";
            }
        });
    }
    {
        const eyedropperBtn = document.getElementById('eyedropperBtn');
        const eyedropperStatus = document.getElementById('eyedropperStatus');
        function SetEyedropperMode(active) {
            gEyedropperMode = active;
            if (active) {
                eyedropperBtn.classList.replace('btn-outline-secondary', 'btn-warning');
                eyedropperStatus.textContent = '활성 — 캔버스 클릭으로 색상 추출';
            }
            else {
                eyedropperBtn.classList.replace('btn-warning', 'btn-outline-secondary');
                eyedropperStatus.textContent = '';
            }
        }
        eyedropperBtn.addEventListener('click', () => {
            SetEyedropperMode(!gEyedropperMode);
        });
    }
    {
        function SetBgImg(_buffer) {
            let index = 0, file = "";
            while (true) {
                file = `bgImg${index++}`;
                if (gAtl.Frame().Res().Find(file) == null)
                    break;
            }
            gAtl.Frame().Load().TextureLoad(file, _buffer, null).then(() => {
                gBgImg = file;
            });
        }
        const bgImgBtn = document.getElementById('bgImgBtn');
        bgImgBtn.addEventListener('click', () => {
            CFile.Load().then(buffer => {
                if (gAtl.Frame().IsInit() == false) {
                    CChecker.Exe(async () => {
                        if (gAtl.Frame().IsInit())
                            return false;
                        return true;
                    }).then(() => SetBgImg(buffer));
                    return;
                }
                SetBgImg(buffer);
            });
        });
        const blendRange = document.getElementById('blendRange');
        const blendNum = document.getElementById('blendNum');
        const SetBlend = val => {
            val = Math.min(+blendRange.max, Math.max(+blendRange.min, +val));
            gBgTexBlendRatio = val;
            blendRange.value = val;
            blendNum.value = val;
            UpdateColorPreview();
        };
        blendRange.addEventListener('input', () => SetBlend(blendRange.value));
        blendNum.addEventListener('input', () => SetBlend(blendNum.value));
        blendNum.addEventListener('keydown', e => {
            if (e.key === 'ArrowUp')
                SetBlend(gBgTexBlendRatio + 0.1);
            if (e.key === 'ArrowDown')
                SetBlend(gBgTexBlendRatio - 0.1);
        });
        SetBlend(gBgTexBlendRatio);
    }
    {
        const mapLabelWrap = document.getElementById('mapLabelWrap');
        const mapLabelSelect = document.getElementById('mapLabelSelect');
        if (gMapLabels != null && gMapLabels.length > 0) {
            mapLabelWrap.style.display = '';
            gMapLabels.forEach((label, i) => {
                const col = label.Color();
                const r = (col >>> 24) & 0xFF;
                const g = (col >>> 16) & 0xFF;
                const b = (col >>> 8) & 0xFF;
                const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
                const opt = document.createElement('option');
                opt.value = String(i);
                opt.textContent = label.Label();
                opt.style.backgroundColor = hex;
                opt.style.color = (r * 0.299 + g * 0.587 + b * 0.114) > 128 ? '#000' : '#fff';
                mapLabelSelect.appendChild(opt);
            });
            function ApplyMapLabel(idx) {
                const label = gMapLabels[idx];
                const col = label.Color();
                const r = (col >>> 24) & 0xFF;
                const g = (col >>> 16) & 0xFF;
                const b = (col >>> 8) & 0xFF;
                const a = 0xFF;
                const size = label.Size();
                gBrushColor.x = r;
                gBrushColor.y = g;
                gBrushColor.z = b;
                gBrushColor.w = a;
                if (size != null) {
                    const sizeRange = document.getElementById('sizeRange');
                    const sizeNum = document.getElementById('sizeNum');
                    const pixelSize = (gCellSize != null && gCellSize > 0)
                        ? Math.ceil(size.x / gCellSize) * 1
                        : size.x;
                    const clampedSz = Math.min(+sizeRange.max, Math.max(+sizeRange.min, pixelSize));
                    gBrushSize = clampedSz;
                    sizeRange.value = String(clampedSz);
                    sizeNum.value = String(clampedSz);
                }
                UpdateColorPreview();
            }
            mapLabelSelect.addEventListener('change', () => ApplyMapLabel(+mapLabelSelect.value));
            ApplyMapLabel(0);
        }
    }
}
function UpdateColorPreview() {
    const hexInput = document.getElementById('hexInput');
    const nativeColorPicker = document.getElementById('nativeColorPicker');
    function ToHex2(n) {
        return n.toString(16).toUpperCase().padStart(2, '0');
    }
    const r = gBrushColor.x;
    const g = gBrushColor.y;
    const b = gBrushColor.z;
    const a = gBrushColor.w;
    hexInput.value = `#${ToHex2(r)}${ToHex2(g)}${ToHex2(b)}${ToHex2(a)}`;
    nativeColorPicker.value = `#${ToHex2(r)}${ToHex2(g)}${ToHex2(b)}`;
}
