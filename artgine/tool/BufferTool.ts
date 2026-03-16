import { CAtelier } from "../app/CAtelier.js";
import { CPaint } from "../app/component/paint/CPaint.js";
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
import { CMouse } from "../system/CMouse.js";
import { CCamCon2DFreeMove, CCamCon3DFirstPerson } from "../util/CCamCon.js";
import { CFrame } from "../util/CFrame.js";
import { CLoaderOption } from "../util/CLoader.js";
import { CModalFlex } from "../util/CModalUtil.js";
import { SDF } from "../z_file/SDF.js";

var gModal: CModalFlex;
var gAtl: CAtelier;

var gTexSub : CSubject;
var gTarTex : CTexture;
var gTarPaint : CPaint;

// 원본 버퍼 참조 (Close 시 역복사용)
var gOrgBuf : Uint32Array | Uint8Array;
var gOrgWidth : number;
var gOrgHeight : number;
var gOrgDepth : number;
var gOrgAlphaUse : boolean;

// 브러시 사이즈 / 강도
var gBrushSize : number;
var gBrushOpacity : number;
var gBrushDrawType : number;
var gBrushColor : CVec4;
var gBrushColorChannel : CVec4;
var gBrushInvert : number;

// 브러시 텍스쳐 선택기
var gPRESETS : Array<CTexture>;
var gSelectedTexIndex : number;



export function BufferTool(_buffer : Uint32Array | Uint8Array, _size : CVec3, _alphaUse = false) : Promise<void>
{
    gOrgBuf       = _buffer;
    gOrgWidth     = _size.x;
    gOrgHeight    = _size.y;
    gOrgDepth     = _size.z;
    gOrgAlphaUse  = _alphaUse;

    return new Promise<void>(resolve => {
        gModal = new CModalFlex([0.7, 0.3], "BufferTool");
        gModal.SetHeader("BufferTool");
        gModal.SetSize(1000, 800);
        gModal.Open();
        gModal.On(CEvent.eType.Close, () => { BufferClose(); resolve(); });

    const maxHeight = "calc(100vh - 10px)";
    const leftPanel  = gModal.FindFlex(0) as HTMLElement;
    const rightPanel = gModal.FindFlex(1) as HTMLElement;
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


    let rightHTML=CDOM.DataToDom(`
        <div class="card border-secondary p-2 w-100 brush-panel">

            <!-- Draw Type 선택 -->
            <div class="mb-3">
                <label for="brushDrawTypeSelect" class="form-label">그리기 타입</label>
                <select id="brushDrawTypeSelect" class="form-select form-select-sm mb-2">
                    <option value="0">Set</option>
                    <option value="1">Add</option>
                </select>
            </div>

            <!-- ── Texture 탭 ── -->
            <div class="mb-3">
                <label for="tabTexture" class="form-label">브러시 텍스쳐</label>
                <div id="tabTexture">
                    <div class="d-flex gap-2">

                        <!-- 왼쪽: 프리뷰 -->
                        <div class="preview-box bg-black border border-secondary rounded overflow-hidden flex-shrink-0">
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
                <div id="tabColor">
                    <div class="d-flex gap-2">

                        <!-- 왼쪽: 컬러 프리뷰 -->
                        <div class="preview-box border border-secondary rounded overflow-hidden flex-shrink-0">
                            <input type="color" id="nativeColorPicker" style="width:100%;height:100%;display:block;" title="클릭하여 색상 선택" disabled />
                        </div>

                        <!-- 오른쪽: RGBA 슬라이더 -->
                        <div class="d-flex flex-column flex-fill justify-content-center gap-1">

                            <!-- R -->
                            <div class="row g-1 align-items-center">
                                <div class="col-1 text-danger" style="font-size:0.72rem;">R</div>
                                <div class="col-1 d-flex align-items-center"><input class="form-check-input mt-0" type="checkbox" id="rCheck" checked></div>
                                <div class="col-8"><input type="range" id="rRange" class="form-range" min="0" max="255" value="255"></div>
                                <div class="col-2"><input type="number" id="rNum" class="form-control form-control-sm text-center p-0" min="0" max="255" value="255"></div>
                            </div>
                            <!-- G -->
                            <div class="row g-1 align-items-center">
                                <div class="col-1 text-success" style="font-size:0.72rem;">G</div>
                                <div class="col-1 d-flex align-items-center"><input class="form-check-input mt-0" type="checkbox" id="gCheck" checked></div>
                                <div class="col-8"><input type="range" id="gRange" class="form-range" min="0" max="255" value="255"></div>
                                <div class="col-2"><input type="number" id="gNum" class="form-control form-control-sm text-center p-0" min="0" max="255" value="255"></div>
                            </div>
                            <!-- B -->
                            <div class="row g-1 align-items-center">
                                <div class="col-1 text-info" style="font-size:0.72rem;">B</div>
                                <div class="col-1 d-flex align-items-center"><input class="form-check-input mt-0" type="checkbox" id="bCheck" checked></div>
                                <div class="col-8"><input type="range" id="bRange" class="form-range" min="0" max="255" value="255"></div>
                                <div class="col-2"><input type="number" id="bNum" class="form-control form-control-sm text-center p-0" min="0" max="255" value="255"></div>
                            </div>
                            <!-- A -->
                            <div class="row g-1 align-items-center">
                                <div class="col-1 text-secondary" style="font-size:0.72rem;">A</div>
                                <div class="col-1 d-flex align-items-center"><input class="form-check-input mt-0" type="checkbox" id="aCheck" checked></div>
                                <div class="col-8"><input type="range" id="aRange" class="form-range" min="0" max="255" value="255"></div>
                                <div class="col-2"><input type="number" id="aNum" class="form-control form-control-sm text-center p-0" min="0" max="255" value="255"></div>
                            </div>

                        </div>
                    </div>
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
        </style>
    `);
    rightPanel.append(rightHTML);

    
    gAtl = new CAtelier();
    gAtl.mPF.mIAuto = true;
    gAtl.Init([], "BufLeft_can", false);
    gAtl.Frame().PushEvent(CEvent.eType.Init,   BufferInit);
    gAtl.Frame().PushEvent(CEvent.eType.Update, BufferUpdate);
    }); // end Promise
}

function BufferInit()
{
    gAtl.Brush().GetCam2D().SetCamCon(new CCamCon2DFreeMove(gAtl.Frame().Input()));
    gAtl.Brush().GetCam3D().SetCamCon(new CCamCon3DFirstPerson(gAtl.Frame().Input()));

    gAtl.NewCanvas("Buf");

    // Uint32Array / Uint8Array(RGBA) → CTexture Uint8Array (Y 반전)
    // texHeight: 2D=Y, 3D=Y*Z
    const texHeight = gOrgDepth > 1 ? gOrgHeight * gOrgDepth : gOrgHeight;

    gTarTex = CImgPro.Square(gOrgWidth, texHeight, new CVec4(1, 1, 1, 1));
    const dst = gTarTex.GetBuf()[0];
    if(gOrgBuf instanceof Uint32Array) {
        if(gOrgDepth > 1) {
            // 3D: buf[x + y*X + z*X*Y] → dst[((y*Z + z)*X + x)*4]
            for(let z = 0; z < gOrgDepth; z++) {
                for(let y = 0; y < gOrgHeight; y++) {
                    for(let x = 0; x < gOrgWidth; x++) {
                        const v  = gOrgBuf[x + y * gOrgWidth + z * gOrgWidth * gOrgHeight];
                        const di = ((y * gOrgDepth + z) * gOrgWidth + x) * 4;
                        dst[di + 0] = (v >>> 24) & 0xFF; // R
                        dst[di + 1] = (v >>> 16) & 0xFF; // G
                        dst[di + 2] = (v >>>  8) & 0xFF; // B
                        dst[di + 3] = gOrgAlphaUse ? ((v >>> 0) & 0xFF) : 0xFF; // A
                    }
                }
            }
        } else {
            // 2D: Y 반전
            for(let y = 0; y < gOrgHeight; y++) {
                const sy = (gOrgHeight - 1 - y);
                for(let x = 0; x < gOrgWidth; x++) {
                    const v  = gOrgBuf[x + sy * gOrgWidth];
                    const di = (x + y * gOrgWidth) * 4;
                    dst[di + 0] = (v >>> 24) & 0xFF;
                    dst[di + 1] = (v >>> 16) & 0xFF;
                    dst[di + 2] = (v >>>  8) & 0xFF;
                    dst[di + 3] = gOrgAlphaUse ? ((v >>> 0) & 0xFF) : 0xFF; // A
                }
            }
        }
    } else {
        dst.set(gOrgBuf); // Uint8Array - Y 반전 없이 그대로 복사
    }

    gAtl.Frame().Ren().BuildTexture(gTarTex);
    gAtl.Frame().Res().Push("tile.tex", gTarTex);

    // 체커보드 배경 텍스쳐
    CH5Canvas.Init(gOrgWidth, texHeight, false, false);
    for(let y = 0; y < texHeight; y += 4)
    {
        for(let x = 0; x < gOrgWidth; x += 4)
        {
            let cx = Math.floor(x / 4);
            let cy = Math.floor(y / 4);
            if((cx + cy) % 2 == 0)
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

    // gOrgPaint 없으므로 항상 기본 CPaint2D 사용
    gTarPaint = gTexSub.PushComp(new CPaint2D(gAtl.Frame().Pal().GetNoneTex(), new CVec2(gOrgWidth, texHeight)));
    gTarPaint.SetTexture(["check.tex", "tile.tex", ""]);
    gTarPaint.ResetDecal(0);
    gTarPaint.SetVFX(0, SDF.eVFX.DecalTexture, [gTarPaint.GetTexture().length - 2, 1, 0]);

    gAtl.Canvas("Buf").PushSub(gTexSub);
    gAtl.Frame().Dev().SetClearColor(true, new CVec4(0, 0, 0, 1));

    PanelInit();
}

function BufferClose()
{
    if(gTarTex != null && gTarTex.GetBuf()[0] != null) {
        const src = gTarTex.GetBuf()[0];
        if(gOrgBuf instanceof Uint32Array) {
            if(gOrgDepth > 1) {
                // 3D: dst[((y*Z + z)*X + x)*4] → buf[x + y*X + z*X*Y]
                for(let z = 0; z < gOrgDepth; z++) {
                    for(let y = 0; y < gOrgHeight; y++) {
                        for(let x = 0; x < gOrgWidth; x++) {
                            const si = ((y * gOrgDepth + z) * gOrgWidth + x) * 4;
                            const bi = x + y * gOrgWidth + z * gOrgWidth * gOrgHeight;
                            const a = gOrgAlphaUse ? src[si + 3] : (gOrgBuf[bi] & 0xFF);
                            gOrgBuf[bi] = (
                                (src[si + 0] << 24) |
                                (src[si + 1] << 16) |
                                (src[si + 2] <<  8) |
                                a
                            ) >>> 0;
                        }
                    }
                }
            } else {
                // 2D: Y 반전
                for(let y = 0; y < gOrgHeight; y++) {
                    const dy = (gOrgHeight - 1 - y);
                    for(let x = 0; x < gOrgWidth; x++) {
                        const si = (x + y  * gOrgWidth) * 4;
                        const bi = x + dy * gOrgWidth;
                        const a = gOrgAlphaUse ? src[si + 3] : (gOrgBuf[bi] & 0xFF);
                        gOrgBuf[bi] = (
                            (src[si + 0] << 24) |
                            (src[si + 1] << 16) |
                            (src[si + 2] <<  8) |
                            a
                        ) >>> 0;
                    }
                }
            }
        } else {
            gOrgBuf.set(src); // Uint8Array - Y 반전 없이 그대로 복사
        }
    }

    // 글로벌 변수 삭제
    gAtl.Frame().Destroy();
    gAtl      = null;
    gTexSub   = null;
    gTarTex   = null;
    gTarPaint = null;
    gOrgBuf      = null;
    gOrgDepth    = null;
    gOrgAlphaUse = null;
}

var prevMouse : CMouse;
function BufferUpdate()
{
    let mouse = gAtl.Frame().Input().Mouse();
    let pos   = gAtl.Brush().GetCam2D().ScreenToWorld2DPoint(mouse.x, mouse.y);

    // 브러시 데칼
    if(gTarPaint.GetTexture()[gTarPaint.GetTexture().length - 1] != gPRESETS[gSelectedTexIndex].Key())
    {
        if(gAtl.Frame().Res().Find(gPRESETS[gSelectedTexIndex].Key()) == null) {
            gAtl.Frame().Ren().BuildTexture(gPRESETS[gSelectedTexIndex]);
            gAtl.Frame().Res().Push(gPRESETS[gSelectedTexIndex].Key(), gPRESETS[gSelectedTexIndex]);
        }
        gTarPaint.SetTexture(["check.tex", "tile.tex", gPRESETS[gSelectedTexIndex].Key()]);
    }
    gTarPaint.SetVFX(1, SDF.eVFX.DecalTexture, [gTarPaint.GetTexture().length - 1, 1 - 0.5 * gBrushInvert, gBrushInvert]);
    gTarPaint.ResetDecal(1, pos, new CVec3(gBrushSize, gBrushSize, 1000));

    if(gAtl.Frame().Input().KeyDown(CInput.eKey.LButton))
    {
        let strength = 0;

        if(prevMouse == null) {
            strength = 1;
        }
        else {
            const dx = prevMouse.x - mouse.x;
            const dy = prevMouse.y - mouse.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if(distance > 10) {
                strength = 1;
            }
        }

        // 마우스 움직이고 있을 때만 그리기
        if(strength > 0) {
            prevMouse = mouse.Export();

            // 텍스쳐 찍기( 각각 RGBA )
            if(gBrushColorChannel.x > 0.5) {
                CImgPro.DrawBrush(gTarTex, gTarPaint.GetBoundFMat(), pos, new CVec2(gBrushSize, gBrushSize), 0, gBrushColor.x * strength, gBrushDrawType, gPRESETS[gSelectedTexIndex]);
            }
            if(gBrushColorChannel.y > 0.5) {
                CImgPro.DrawBrush(gTarTex, gTarPaint.GetBoundFMat(), pos, new CVec2(gBrushSize, gBrushSize), 1, gBrushColor.y * strength, gBrushDrawType, gPRESETS[gSelectedTexIndex]);
            }
            if(gBrushColorChannel.z > 0.5) {
                CImgPro.DrawBrush(gTarTex, gTarPaint.GetBoundFMat(), pos, new CVec2(gBrushSize, gBrushSize), 2, gBrushColor.z * strength, gBrushDrawType, gPRESETS[gSelectedTexIndex]);
            }
            if(gBrushColorChannel.w > 0.5) {
                CImgPro.DrawBrush(gTarTex, gTarPaint.GetBoundFMat(), pos, new CVec2(gBrushSize, gBrushSize), 3, gBrushColor.w * strength, gBrushDrawType, gPRESETS[gSelectedTexIndex]);
            }

            // 업데이트
            gAtl.Frame().Ren().BuildTexture(gTarTex);
        }
    }
    else {
        prevMouse = null;
    }
}

// --------------------------------------------------------------------- //
// 이 아래는 UI 이벤트 설정
// --------------------------------------------------------------------- //

function PanelInit()
{
    if(gPRESETS == null) {
        // 기본 브러시 크기(곡선 있어서 클수록 정확해짐)
        const BAKE_SIZE = 128;

        // 기본값
        gBrushSize      = 25;
        gBrushOpacity   = 100;
        gBrushDrawType  = 0;
        gSelectedTexIndex = 0;
        gBrushColor        = new CVec4(255, 255, 255, 255);
        gBrushColorChannel = new CVec4(1, 1, 1, 1);
        gBrushInvert = 1;

        // 테스트용 기본 브러시
        const DRAW_FNS = [
            { label:'Soft',      fn:(s)=>{ CH5Canvas.FillRadialGradient(s/2,s/2,s/2,s/2,0,s/2,[{per:0,color:'rgba(255,255,255,1)'},{per:1,color:'rgba(255,255,255,0)'}]); CH5Canvas.FillCircle(s/2,s/2,s/2); }},
            { label:'Hard',      fn:(s)=>{ CH5Canvas.FillStyle('#fff'); CH5Canvas.FillCircle(s/2,s/2,s/2); }},
            { label:'Ring',      fn:(s)=>{ CH5Canvas.FillStyle('#fff'); CH5Canvas.StrokeCircle(s/2,s/2,s/2,Math.max(2,s/10)); }},
            { label:'SoftSq',    fn:(s)=>{ CH5Canvas.FillRadialGradient(s/2,s/2,s/2,s/2,0,s/2,[{per:0,color:'rgba(255,255,255,1)'},{per:0.6,color:'rgba(255,255,255,0.4)'},{per:1,color:'rgba(255,255,255,0)'}]); CH5Canvas.FillRect(2,2,s-4,s-4); }},
            { label:'Cross',     fn:(s)=>{ CH5Canvas.FillStyle('#fff'); CH5Canvas.LineWidth(Math.max(1.5,s/14)); CH5Canvas.AddCmd([CH5Canvas.Cmd("beginPath",[]),CH5Canvas.Cmd("moveTo",[s/2,3]),CH5Canvas.Cmd("lineTo",[s/2,s-3]),CH5Canvas.Cmd("moveTo",[3,s/2]),CH5Canvas.Cmd("lineTo",[s-3,s/2]),CH5Canvas.Cmd("stroke",[])]); }},
            { label:'Grain',     fn:(s)=>{ const cx=s/2,cy=s/2,r=s/2-2; for(let i=0;i<s*s*0.4;i++){const a=Math.random()*Math.PI*2,d=Math.sqrt(Math.random())*r; CH5Canvas.FillStyle(`rgba(255,255,255,${Math.random()*0.9})`); CH5Canvas.FillRect(cx+Math.cos(a)*d,cy+Math.sin(a)*d,1.2,1.2);} }},
            { label:'Diamond',   fn:(s)=>{ CH5Canvas.FillRadialGradient(s/2,s/2,s/2,s/2,0,s/2,[{per:0,color:'rgba(255,255,255,1)'},{per:1,color:'rgba(255,255,255,0)'}]); CH5Canvas.AddCmd([CH5Canvas.Cmd("save",[]),CH5Canvas.Cmd("translate",[s/2,s/2]),CH5Canvas.Cmd("rotate",[Math.PI/4]),CH5Canvas.Cmd("fillRect",[-s/3,-s/3,s*2/3,s*2/3]),CH5Canvas.Cmd("restore",[])]); }},
            { label:'Scatter',   fn:(s)=>{ for(let i=0;i<12;i++){const x=s*0.15+Math.random()*s*0.7,y=s*0.15+Math.random()*s*0.7,r=s*0.06+Math.random()*s*0.06; CH5Canvas.FillStyle(`rgba(255,255,255,${0.4+Math.random()*0.5})`); CH5Canvas.FillCircle(x,y,r);} }},
            { label:'Spray',     fn:(s)=>{ const r=s/2-2; for(let i=0;i<300;i++){const a=Math.random()*Math.PI*2,d=Math.random()*r,x=s/2+Math.cos(a)*d,y=s/2+Math.sin(a)*d; CH5Canvas.FillStyle(`rgba(255,255,255,${Math.random()*0.6*(1-d/r)})`); CH5Canvas.FillRect(x,y,1,1);} }},
            { label:'Glow',      fn:(s)=>{ for(let i=3;i>0;i--){const r=s/2*i/3; CH5Canvas.FillRadialGradient(s/2,s/2,r,s/2,s/2,0,[{per:0,color:`rgba(255,255,255,${0.6/i})`},{per:1,color:'rgba(255,255,255,0)'}]); CH5Canvas.FillCircle(s/2,s/2,r);} }},
            { label:'Dots',      fn:(s)=>{ const cols=4,dr=s/(cols*2+1); for(let row=0;row<cols;row++)for(let col=0;col<cols;col++){const x=dr+(dr*2)*col+dr*0.5*(row%2),y=dr+(dr*1.7)*row,d=Math.hypot(x+dr/2-s/2,y+dr/2-s/2)/(s/2),op=Math.max(0,1-d*1.2); CH5Canvas.FillStyle(`rgba(255,255,255,${op*0.9})`); CH5Canvas.FillCircle(x+dr/2,y+dr/2,dr*0.45);} }},
            { label:'Hatch',     fn:(s)=>{ CH5Canvas.AddCmd([CH5Canvas.Cmd("save",[]),CH5Canvas.Cmd("beginPath",[]),CH5Canvas.Cmd("arc",[s/2,s/2,s/2-2,0,Math.PI*2]),CH5Canvas.Cmd("clip",[])]); const step=s/10; for(let i=-s;i<s*2;i+=step){const d=Math.abs(i-s/2)/(s/2); CH5Canvas.StrokeStyle(`rgba(255,255,255,${Math.max(0,1-d)*0.8})`); CH5Canvas.LineWidth(1); CH5Canvas.AddCmd([CH5Canvas.Cmd("beginPath",[]),CH5Canvas.Cmd("moveTo",[i,0]),CH5Canvas.Cmd("lineTo",[i,s]),CH5Canvas.Cmd("stroke",[]),CH5Canvas.Cmd("beginPath",[]),CH5Canvas.Cmd("moveTo",[0,i]),CH5Canvas.Cmd("lineTo",[s,i]),CH5Canvas.Cmd("stroke",[])]);} CH5Canvas.AddCmd([CH5Canvas.Cmd("restore",[])]); }},
        ];

        // 마스크로만 사용할거여서 BuildTexture는 하지 않음
        gPRESETS = DRAW_FNS.map(({ label, fn }) => {
            CH5Canvas.Init(BAKE_SIZE, BAKE_SIZE);
            fn(BAKE_SIZE);
            CH5Canvas.Draw();
            const tex = CH5Canvas.GetNewTex();
            tex.SetKey(label);
            return tex;
        });

        // Black.tex 추가
        const blackTex = gAtl.Frame().Res().Find(gAtl.Frame().Pal().GetBlackTex()) as CTexture;
        blackTex.SetKey(gAtl.Frame().Pal().GetBlackTex());
        gPRESETS.unshift(blackTex);
    }

    // 브러시 텍스쳐 이벤트
    {
        const previewCanvas = document.getElementById('previewCanvas') as HTMLCanvasElement;
        const brushSelector = document.getElementById('brushSelector') as HTMLDivElement;
        const addBrushBtn   = document.getElementById('addBrushBtn') as HTMLButtonElement;

        function DrawPreview(_ctx : CanvasRenderingContext2D, _tex : CTexture, dstW : number, dstH : number, opacity : number) {
            let buf = _tex.GetBuf()[0];
            if(buf == null) {
                _tex.CreateBuf();
                buf = _tex.GetBuf()[0];
            }

            const off = document.createElement('canvas');
            off.width = _tex.GetWidth(); off.height = _tex.GetHeight();
            const imgData = new ImageData(new Uint8ClampedArray(buf.buffer), _tex.GetWidth(), _tex.GetHeight());
            off.getContext('2d').putImageData(imgData, 0, 0);

            _ctx.save();
            _ctx.globalAlpha = opacity;
            _ctx.drawImage(off, 0, 0, _tex.GetWidth(), _tex.GetHeight(), 0, 0, dstW, dstH);
            _ctx.restore();
        }

        // 큰 프리뷰 그리기
        function UpdatePreview() {
            const cw = previewCanvas.width, ch = previewCanvas.height;
            if(!cw || !ch) return;

            const preset   = gPRESETS[gSelectedTexIndex];
            const opacity  = gBrushOpacity / 100;
            const clipSize = Math.max(2, Math.min(cw, ch) / 2 - 2);
            const cx = cw / 2, cy = ch / 2;
            const ctx = previewCanvas.getContext('2d');

            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, cw, ch);

            ctx.save();
            ctx.beginPath();
            ctx.arc(cx, cy, clipSize, 0, Math.PI * 2);
            ctx.clip();
            ctx.translate(cx - clipSize, cy - clipSize);
            DrawPreview(ctx, preset, clipSize * 2, clipSize * 2, opacity);
            ctx.restore();
        }

        // 작은 프리뷰 그리기
        function MakeThumbnail(_tex : CTexture, _idx : number) {
            const thumb = document.createElement('div');
            thumb.className = 'brush-sel-thumb border border-secondary rounded';
            thumb.title = _tex.Key();
            if(_idx === gSelectedTexIndex) thumb.classList.add('selected');

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
                gSelectedTexIndex = _idx;
                UpdatePreview();
            });
            return thumb;
        }

        let brushNum = 0;
        addBrushBtn.addEventListener('click', async () => {
            const file = await CFile.Load();
            if(file == null) return;

            const key = "NewBrush" + brushNum++;
            await gAtl.Frame().Load().TextureLoad(key, file, new CLoaderOption());
            const newTexture = gAtl.Frame().Res().Find(key) as CTexture;
            newTexture.SetKey(key);
            gPRESETS.push(newTexture);

            brushSelector.appendChild(MakeThumbnail(gPRESETS[gPRESETS.length - 1], gPRESETS.length - 1));
        });

        // 작은 프리뷰 전체 리셋
        brushSelector.innerHTML = '';
        for(let i = 0; i < gPRESETS.length; i++) {
            brushSelector.appendChild(MakeThumbnail(gPRESETS[i], i));
        }

        // 큰 프리뷰 리셋
        {
            const box = previewCanvas.parentElement;
            previewCanvas.width  = box.clientWidth;
            previewCanvas.height = box.clientHeight;
            UpdatePreview();
        }
    }

    // 반전 인풋
    {
        const invertCheck = document.getElementById('invertCheck') as HTMLInputElement;
        invertCheck.addEventListener('change', () => {
            gBrushInvert = invertCheck.checked ? 1 : 0;
        });
        invertCheck.checked = gBrushInvert == 0 ? false : true;
    }

    // 사이즈 조절 이벤트
    {
        const sizeRange = document.getElementById('sizeRange') as HTMLInputElement;
        const sizeNum   = document.getElementById('sizeNum') as HTMLInputElement;
        const SetBrushSize = val => {
            val = Math.min(+sizeRange.max, Math.max(+sizeRange.min, +val));
            gBrushSize = val; sizeRange.value = val; sizeNum.value = val;
        };
        sizeRange.addEventListener('input', () => SetBrushSize(sizeRange.value));
        sizeNum.addEventListener('input',   () => SetBrushSize(sizeNum.value));
        sizeNum.addEventListener('keydown', e => {
            if(e.key === 'ArrowUp')   SetBrushSize(gBrushSize + 1);
            if(e.key === 'ArrowDown') SetBrushSize(gBrushSize - 1);
        });
        SetBrushSize(gBrushSize);
    }

    // 컬러 인풋 업데이트
    {
        const nativeColorPicker = document.getElementById('nativeColorPicker') as HTMLInputElement;
        function ToHex2(n) {
            return n.toString(16).toUpperCase().padStart(2, '0');
        }
        function UpdateColorPreview() {
            const r = gBrushColor.x * gBrushColorChannel.x;
            const g = gBrushColor.y * gBrushColorChannel.y;
            const b = gBrushColor.z * gBrushColorChannel.z;
            nativeColorPicker.value = `#${ToHex2(r)}${ToHex2(g)}${ToHex2(b)}`;
        }

        // R 채널 이벤트
        {
            const rCheck      = document.getElementById('rCheck') as HTMLInputElement;
            const rColorRange = document.getElementById('rRange') as HTMLInputElement;
            const rColorNum   = document.getElementById('rNum') as HTMLInputElement;
            const SetBrushColorR = val => {
                val = Math.min(+rColorRange.max, Math.max(+rColorRange.min, +val));
                gBrushColor.x = val; rColorRange.value = val; rColorNum.value = val;
                UpdateColorPreview();
            };
            rColorRange.addEventListener('input', () => SetBrushColorR(rColorRange.value));
            rColorNum.addEventListener('input',   () => SetBrushColorR(rColorNum.value));
            rColorNum.addEventListener('keydown', e => {
                if(e.key === 'ArrowUp')   SetBrushColorR(gBrushColor.x + 1);
                if(e.key === 'ArrowDown') SetBrushColorR(gBrushColor.x - 1);
            });
            rCheck.addEventListener('change', () => {
                gBrushColorChannel.x = rCheck.checked ? 1 : 0;
                rColorRange.disabled = !rCheck.checked;
                rColorNum.disabled   = !rCheck.checked;
                UpdateColorPreview();
            });
            SetBrushColorR(gBrushColor.x);
        }

        // G 채널 이벤트
        {
            const gCheck      = document.getElementById('gCheck') as HTMLInputElement;
            const gColorRange = document.getElementById('gRange') as HTMLInputElement;
            const gColorNum   = document.getElementById('gNum') as HTMLInputElement;
            const SetBrushColorG = val => {
                val = Math.min(+gColorRange.max, Math.max(+gColorRange.min, +val));
                gBrushColor.y = val; gColorRange.value = val; gColorNum.value = val;
                UpdateColorPreview();
            };
            gColorRange.addEventListener('input', () => SetBrushColorG(gColorRange.value));
            gColorNum.addEventListener('input',   () => SetBrushColorG(gColorNum.value));
            gColorNum.addEventListener('keydown', e => {
                if(e.key === 'ArrowUp')   SetBrushColorG(gBrushColor.y + 1);
                if(e.key === 'ArrowDown') SetBrushColorG(gBrushColor.y - 1);
            });
            gCheck.addEventListener('change', () => {
                gBrushColorChannel.y = gCheck.checked ? 1 : 0;
                gColorRange.disabled = !gCheck.checked;
                gColorNum.disabled   = !gCheck.checked;
                UpdateColorPreview();
            });
            SetBrushColorG(gBrushColor.y);
        }

        // B 채널 이벤트
        {
            const bCheck      = document.getElementById('bCheck') as HTMLInputElement;
            const bColorRange = document.getElementById('bRange') as HTMLInputElement;
            const bColorNum   = document.getElementById('bNum') as HTMLInputElement;
            const SetBrushColorB = val => {
                val = Math.min(+bColorRange.max, Math.max(+bColorRange.min, +val));
                gBrushColor.z = val; bColorRange.value = val; bColorNum.value = val;
                UpdateColorPreview();
            };
            bColorRange.addEventListener('input', () => SetBrushColorB(bColorRange.value));
            bColorNum.addEventListener('input',   () => SetBrushColorB(bColorNum.value));
            bColorNum.addEventListener('keydown', e => {
                if(e.key === 'ArrowUp')   SetBrushColorB(gBrushColor.z + 1);
                if(e.key === 'ArrowDown') SetBrushColorB(gBrushColor.z - 1);
            });
            bCheck.addEventListener('change', () => {
                gBrushColorChannel.z = bCheck.checked ? 1 : 0;
                bColorRange.disabled = !bCheck.checked;
                bColorNum.disabled   = !bCheck.checked;
                UpdateColorPreview();
            });
            SetBrushColorB(gBrushColor.z);
        }

        // A 채널 이벤트
        {
            const aCheck      = document.getElementById('aCheck') as HTMLInputElement;
            const aColorRange = document.getElementById('aRange') as HTMLInputElement;
            const aColorNum   = document.getElementById('aNum') as HTMLInputElement;
            const SetBrushColorA = val => {
                val = Math.min(+aColorRange.max, Math.max(+aColorRange.min, +val));
                gBrushColor.w = val; aColorRange.value = val; aColorNum.value = val;
                UpdateColorPreview();
            };
            aColorRange.addEventListener('input', () => SetBrushColorA(aColorRange.value));
            aColorNum.addEventListener('input',   () => SetBrushColorA(aColorNum.value));
            aColorNum.addEventListener('keydown', e => {
                if(e.key === 'ArrowUp')   SetBrushColorA(gBrushColor.w + 1);
                if(e.key === 'ArrowDown') SetBrushColorA(gBrushColor.w - 1);
            });
            aCheck.addEventListener('change', () => {
                gBrushColorChannel.w = aCheck.checked ? 1 : 0;
                aColorRange.disabled = !aCheck.checked;
                aColorNum.disabled   = !aCheck.checked;
                UpdateColorPreview();
            });
            SetBrushColorA(gBrushColor.w);
        }
    }

    // 그리기 타입 셀렉트 업데이트
    {
        const brushDrawTypeSelect = document.getElementById('brushDrawTypeSelect') as HTMLSelectElement;
        brushDrawTypeSelect.addEventListener('change', () => {
            gBrushDrawType = +brushDrawTypeSelect.value;
        });
    }
}