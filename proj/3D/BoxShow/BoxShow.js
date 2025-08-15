const version = '2025-08-16 02:14:53';
import "https://06fs4dix.github.io/Artgine/artgine/artgine.js";
import { CPreferences } from "https://06fs4dix.github.io/Artgine/artgine/basic/CPreferences.js";
var gPF = new CPreferences();
gPF.mTargetWidth = 0;
gPF.mTargetHeight = 0;
gPF.mRenderer = "GL";
gPF.m32fDepth = false;
gPF.mTexture16f = false;
gPF.mAnti = true;
gPF.mBatchPool = true;
gPF.mXR = false;
gPF.mDeveloper = true;
gPF.mIAuto = true;
gPF.mWASM = false;
gPF.mServer = 'local';
gPF.mGitHub = true;
import { CAtelier } from "https://06fs4dix.github.io/Artgine/artgine/canvas/CAtelier.js";
var gAtl = new CAtelier();
gAtl.mPF = gPF;
await gAtl.Init([]);
import { CSubject } from "https://06fs4dix.github.io/Artgine/artgine/canvas/subject/CSubject.js";
import { CVec3 } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CVec3.js";
import { CVec4 } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CVec4.js";
import { CPaint3D } from "https://06fs4dix.github.io/Artgine/artgine/canvas/component/paint/CPaint3D.js";
import { CColor } from "https://06fs4dix.github.io/Artgine/artgine/canvas/component/CColor.js";
var Main = gAtl.NewCanvas("Main");
console.log("Main 캔버스가 성공적으로 생성되었습니다.");
import { CCamCon3DFirstPerson } from "https://06fs4dix.github.io/Artgine/artgine/util/CCamCon.js";
Main.SetCameraKey("3D");
var firstPersonCamCon = new CCamCon3DFirstPerson(gAtl.Frame().Input());
Main.GetCam().SetCamCon(firstPersonCamCon);
import { CMath } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CMath.js";
import { CEvent } from "https://06fs4dix.github.io/Artgine/artgine/basic/CEvent.js";
import { CBGAttachButton } from "https://06fs4dix.github.io/Artgine/artgine/util/CModalUtil.js";
import { CVec2 } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CVec2.js";
var WAVE_GRID_SIZE = 50;
var WAVE_SPACING = 40;
var WAVE_AMPLITUDE = 10.0;
var WAVE_SPEED = 0.1;
var COLOR_HEIGHT_ENABLED = true;
var COLOR_HEIGHT_INTENSITY = 0.5;
var COLOR_HEIGHT_MODE = 'red_blue';
function hueToRgb(hue) {
    hue = hue % 360;
    if (hue < 0)
        hue += 360;
    let c = 1;
    let x = c * (1 - Math.abs((hue / 60) % 2 - 1));
    let m = 0;
    let r, g, b;
    if (hue < 60) {
        r = c;
        g = x;
        b = 0;
    }
    else if (hue < 120) {
        r = x;
        g = c;
        b = 0;
    }
    else if (hue < 180) {
        r = 0;
        g = c;
        b = x;
    }
    else if (hue < 240) {
        r = 0;
        g = x;
        b = c;
    }
    else if (hue < 300) {
        r = x;
        g = 0;
        b = c;
    }
    else {
        r = c;
        g = 0;
        b = x;
    }
    return {
        r: r + m,
        g: g + m,
        b: b + m
    };
}
var waveBoxes = [];
var initialPositions = [];
var time = 0;
function createWave() {
    console.log('createWave 함수 호출됨');
    console.log('현재 웨이브 설정:', {
        WAVE_GRID_SIZE,
        WAVE_SPACING,
        WAVE_AMPLITUDE,
        WAVE_SPEED
    });
    console.log('기존 박스 제거 중...', waveBoxes.length, '개');
    Main.Clear();
    waveBoxes = [];
    initialPositions = [];
    for (let x = 0; x < WAVE_GRID_SIZE; x++) {
        for (let z = 0; z < WAVE_GRID_SIZE; z++) {
            var boxSubject = new CSubject();
            let posX = (x - WAVE_GRID_SIZE / 2) * WAVE_SPACING;
            let posZ = (z - WAVE_GRID_SIZE / 2) * WAVE_SPACING;
            let posY = 0;
            initialPositions.push(new CVec3(posX, posY, posZ));
            boxSubject.SetPos(new CVec3(posX, posY, posZ));
            boxSubject.SetRot(new CVec3(0, 0, 0));
            boxSubject.SetSca(new CVec3(0.1, 0.1, 0.1));
            var paint3D = new CPaint3D(gAtl.Frame().Pal().GetBoxMesh());
            let colorR = 0.3 + (x / WAVE_GRID_SIZE) * 0.7;
            let colorG = 0.3 + (z / WAVE_GRID_SIZE) * 0.7;
            let colorB = 0.5 + Math.sin((x + z) * 0.3) * 0.5;
            paint3D.SetRGBA(new CVec4(colorR, colorG, colorB, 1.0));
            boxSubject.mHeightColorData = {
                paint3D: paint3D,
                baseColor: new CVec4(colorR, colorG, colorB, 1.0)
            };
            boxSubject.PushComp(paint3D);
            Main.Push(boxSubject);
            waveBoxes.push(boxSubject);
        }
    }
}
createWave();
var mousePos = new CVec3(0, 0, 0);
gAtl.Frame().PushEvent(CEvent.eType.Update, () => {
    time += WAVE_SPEED;
    for (let i = 0; i < waveBoxes.length; i++) {
        let box = waveBoxes[i];
        let initialPos = initialPositions[i];
        let distanceToMouse = CMath.V3Len(CMath.V3SubV3(initialPos, mousePos));
        let waveOffset = Math.sin(time + distanceToMouse * 0.5) * WAVE_AMPLITUDE;
        let newY = initialPos.y + waveOffset;
        box.SetPos(new CVec3(initialPos.x, newY, initialPos.z));
        let rotationX = Math.sin(time + distanceToMouse * 0.3) * 0.1;
        let rotationZ = Math.cos(time + distanceToMouse * 0.4) * 0.1;
        box.SetRot(new CVec3(rotationX, 0, rotationZ));
        let scaleFactor = 0.1 + Math.sin(time + distanceToMouse * 0.4) * 0.02;
        box.SetSca(new CVec3(scaleFactor, scaleFactor, scaleFactor));
        if (box.mHeightColorData && COLOR_HEIGHT_ENABLED) {
            let heightData = box.mHeightColorData;
            let baseColor = heightData.baseColor;
            let currentHeight = newY;
            let heightRatio = Math.max(0, Math.min(1, (currentHeight + WAVE_AMPLITUDE) / (WAVE_AMPLITUDE * 2)));
            let heightColorR, heightColorG, heightColorB;
            switch (COLOR_HEIGHT_MODE) {
                case 'red_blue':
                    let lowColor = { r: 0.2, g: 0.3, b: 0.8 };
                    let highColor = { r: 0.9, g: 0.2, b: 0.1 };
                    heightColorR = lowColor.r + (highColor.r - lowColor.r) * heightRatio;
                    heightColorG = lowColor.g + (highColor.g - lowColor.g) * heightRatio;
                    heightColorB = lowColor.b + (highColor.b - lowColor.b) * heightRatio;
                    break;
                case 'rainbow':
                    let hue = (heightRatio * 360 + time * 50) % 360;
                    let rgb = hueToRgb(hue);
                    heightColorR = rgb.r;
                    heightColorG = rgb.g;
                    heightColorB = rgb.b;
                    break;
                case 'gradient':
                    let greenColor = { r: 0.1, g: 0.8, b: 0.2 };
                    let yellowColor = { r: 0.9, g: 0.9, b: 0.1 };
                    heightColorR = greenColor.r + (yellowColor.r - greenColor.r) * heightRatio;
                    heightColorG = greenColor.g + (yellowColor.g - greenColor.g) * heightRatio;
                    heightColorB = greenColor.b + (yellowColor.b - greenColor.b) * heightRatio;
                    break;
                case 'fire':
                    if (heightRatio < 0.5) {
                        let blackColor = { r: 0.0, g: 0.0, b: 0.0 };
                        let redColor = { r: 0.9, g: 0.1, b: 0.1 };
                        let fireRatio = heightRatio * 2;
                        heightColorR = blackColor.r + (redColor.r - blackColor.r) * fireRatio;
                        heightColorG = blackColor.g + (redColor.g - blackColor.g) * fireRatio;
                        heightColorB = blackColor.b + (redColor.b - blackColor.b) * fireRatio;
                    }
                    else {
                        let redColor = { r: 0.9, g: 0.1, b: 0.1 };
                        let yellowColor = { r: 1.0, g: 1.0, b: 0.0 };
                        let fireRatio = (heightRatio - 0.5) * 2;
                        heightColorR = redColor.r + (yellowColor.r - redColor.r) * fireRatio;
                        heightColorG = redColor.g + (yellowColor.g - redColor.g) * fireRatio;
                        heightColorB = redColor.b + (yellowColor.b - redColor.b) * fireRatio;
                    }
                    break;
                default:
                    heightColorR = baseColor.x;
                    heightColorG = baseColor.y;
                    heightColorB = baseColor.z;
            }
            heightColorR = Math.max(0, Math.min(1, heightColorR));
            heightColorG = Math.max(0, Math.min(1, heightColorG));
            heightColorB = Math.max(0, Math.min(1, heightColorB));
            let heightColor = new CColor(heightColorR, heightColorG, heightColorB, CColor.eModel.RGBAdd);
            heightData.paint3D.SetColorModel(heightColor);
        }
    }
});
let Option_btn = new CBGAttachButton("DevToolModal", 101, new CVec2(240, 320));
Option_btn.SetTitleText("Wave Settings");
Option_btn.SetContent(`
<div style="padding: 20px; font-family: Arial, sans-serif;">
    <h3 style="margin-top: 0; color: #333;">웨이브 설정</h3>
    
    <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; font-weight: bold;">격자 크기 (${WAVE_GRID_SIZE})</label>
        <input type="range" id="gridSize" min="10" max="100" value="${WAVE_GRID_SIZE}" 
               style="width: 100%; height: 20px;">
        <span id="gridSizeValue">${WAVE_GRID_SIZE}</span>
        <div style="margin-top: 5px; font-size: 12px; color: #666;">
            총 박스 개수: <span id="totalBoxesCount">${WAVE_GRID_SIZE * WAVE_GRID_SIZE}</span>개
        </div>
    </div>
    
    <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; font-weight: bold;">박스 간격 (${WAVE_SPACING})</label>
        <input type="range" id="spacing" min="20" max="80" value="${WAVE_SPACING}" 
               style="width: 100%; height: 20px;">
        <span id="spacingValue">${WAVE_SPACING}</span>
    </div>
    
    <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; font-weight: bold;">파도 높이 (${WAVE_AMPLITUDE})</label>
        <input type="range" id="amplitude" min="1" max="30" step="0.5" value="${WAVE_AMPLITUDE}" 
               style="width: 100%; height: 20px;">
        <span id="amplitudeValue">${WAVE_AMPLITUDE}</span>
    </div>
    
    <div style="margin-bottom: 20px;">
        <label style="display: block; margin-bottom: 5px; font-weight: bold;">파도 속도 (${WAVE_SPEED})</label>
        <input type="range" id="speed" min="0.01" max="0.5" step="0.01" value="${WAVE_SPEED}" 
               style="width: 100%; height: 20px;">
        <span id="speedValue">${WAVE_SPEED}</span>
    </div>
    
    <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
    
    <h4 style="margin: 15px 0 10px 0; color: #333;">색상 설정</h4>
    
    <div style="margin-bottom: 15px;">
        <label style="display: flex; align-items: center; margin-bottom: 10px;">
            <input type="checkbox" id="colorHeightEnabled" ${COLOR_HEIGHT_ENABLED ? 'checked' : ''} 
                   style="margin-right: 8px;">
            <span style="font-weight: bold;">높이에 따른 색상 변경</span>
        </label>
    </div>
    
    <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; font-weight: bold;">색상 변화 강도 (${COLOR_HEIGHT_INTENSITY})</label>
        <input type="range" id="colorIntensity" min="0.1" max="1.0" step="0.1" value="${COLOR_HEIGHT_INTENSITY}" 
               style="width: 100%; height: 20px;">
        <span id="colorIntensityValue">${COLOR_HEIGHT_INTENSITY}</span>
    </div>
    
    <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; font-weight: bold;">색상 모드</label>
        <select id="colorMode" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
            <option value="red_blue" ${COLOR_HEIGHT_MODE === 'red_blue' ? 'selected' : ''}>빨강-파랑</option>
            <option value="rainbow" ${COLOR_HEIGHT_MODE === 'rainbow' ? 'selected' : ''}>무지개</option>
            <option value="gradient" ${COLOR_HEIGHT_MODE === 'gradient' ? 'selected' : ''}>초록-노랑 그라데이션</option>
            <option value="fire" ${COLOR_HEIGHT_MODE === 'fire' ? 'selected' : ''}>불꽃 효과</option>
        </select>
    </div>
    

    <div style="margin-top: 15px; padding: 10px; background: #f8f9fa; border-radius: 5px; font-size: 12px; color: #666;">
        설정을 변경하면 웨이브가 자동으로 재생성됩니다.
    </div>
</div>
`);
function setupWaveControls() {
    try {
        const CUtil = window.CUtil;
        if (!CUtil) {
            console.error('CUtil을 찾을 수 없습니다.');
            return;
        }
        const modalDiv = CUtil.ID(Option_btn.Key() + "_div");
        if (!modalDiv) {
            console.error('모달 div를 찾을 수 없습니다.');
            return;
        }
        const gridSizeSlider = modalDiv.querySelector('#gridSize');
        const gridSizeValue = modalDiv.querySelector('#gridSizeValue');
        if (gridSizeSlider && gridSizeValue) {
            gridSizeSlider.removeEventListener('input', gridSizeSlider.oninput);
            gridSizeSlider.removeEventListener('change', gridSizeSlider.onchange);
            gridSizeSlider.addEventListener('input', function () {
                gridSizeValue.textContent = this.value;
                const totalBoxesCount = modalDiv.querySelector('#totalBoxesCount');
                if (totalBoxesCount) {
                    const currentGridSize = parseInt(this.value);
                    const totalBoxes = currentGridSize * currentGridSize;
                    totalBoxesCount.textContent = totalBoxes;
                }
            });
            gridSizeSlider.addEventListener('change', function () {
                WAVE_GRID_SIZE = parseInt(this.value);
                console.log('격자 크기 변경됨:', WAVE_GRID_SIZE);
                const totalBoxesCount = modalDiv.querySelector('#totalBoxesCount');
                if (totalBoxesCount) {
                    const totalBoxes = WAVE_GRID_SIZE * WAVE_GRID_SIZE;
                    totalBoxesCount.textContent = totalBoxes;
                    console.log('총 박스 개수:', totalBoxes);
                }
                createWave();
            });
        }
        const spacingSlider = modalDiv.querySelector('#spacing');
        const spacingValue = modalDiv.querySelector('#spacingValue');
        if (spacingSlider && spacingValue) {
            spacingSlider.removeEventListener('input', spacingSlider.oninput);
            spacingSlider.removeEventListener('change', spacingSlider.onchange);
            spacingSlider.addEventListener('input', function () {
                spacingValue.textContent = this.value;
            });
            spacingSlider.addEventListener('change', function () {
                WAVE_SPACING = parseInt(this.value);
                console.log('박스 간격 변경됨:', WAVE_SPACING);
                createWave();
            });
        }
        const amplitudeSlider = modalDiv.querySelector('#amplitude');
        const amplitudeValue = modalDiv.querySelector('#amplitudeValue');
        if (amplitudeSlider && amplitudeValue) {
            amplitudeSlider.removeEventListener('input', amplitudeSlider.oninput);
            amplitudeSlider.removeEventListener('change', amplitudeSlider.onchange);
            amplitudeSlider.addEventListener('input', function () {
                amplitudeValue.textContent = this.value;
            });
            amplitudeSlider.addEventListener('change', function () {
                WAVE_AMPLITUDE = parseFloat(this.value);
                console.log('파도 높이 변경됨:', WAVE_AMPLITUDE);
                createWave();
            });
        }
        const speedSlider = modalDiv.querySelector('#speed');
        const speedValue = modalDiv.querySelector('#speedValue');
        if (speedSlider && speedValue) {
            speedSlider.removeEventListener('input', speedSlider.oninput);
            speedSlider.removeEventListener('change', speedSlider.onchange);
            speedSlider.addEventListener('input', function () {
                speedValue.textContent = this.value;
            });
            speedSlider.addEventListener('change', function () {
                WAVE_SPEED = parseFloat(this.value);
                console.log('파도 속도 변경됨:', WAVE_SPEED);
                createWave();
            });
        }
        const colorHeightEnabled = modalDiv.querySelector('#colorHeightEnabled');
        if (colorHeightEnabled) {
            colorHeightEnabled.removeEventListener('change', colorHeightEnabled.onchange);
            colorHeightEnabled.addEventListener('change', function () {
                COLOR_HEIGHT_ENABLED = this.checked;
                console.log('높이에 따른 색상 변경:', COLOR_HEIGHT_ENABLED);
            });
        }
        const colorIntensitySlider = modalDiv.querySelector('#colorIntensity');
        const colorIntensityValue = modalDiv.querySelector('#colorIntensityValue');
        if (colorIntensitySlider && colorIntensityValue) {
            colorIntensitySlider.removeEventListener('input', colorIntensitySlider.oninput);
            colorIntensitySlider.addEventListener('input', function () {
                colorIntensityValue.textContent = this.value;
                COLOR_HEIGHT_INTENSITY = parseFloat(this.value);
            });
        }
        const colorModeSelect = modalDiv.querySelector('#colorMode');
        if (colorModeSelect) {
            colorModeSelect.removeEventListener('change', colorModeSelect.onchange);
            colorModeSelect.addEventListener('change', function () {
                COLOR_HEIGHT_MODE = this.value;
                console.log('색상 모드 변경됨:', COLOR_HEIGHT_MODE);
            });
        }
        const applyButton = modalDiv.querySelector('#applySettings');
        if (applyButton) {
            applyButton.removeEventListener('click', applyButton.onclick);
            applyButton.addEventListener('click', function () {
                console.log('설정 적용 버튼 클릭됨');
                console.log('새로운 값들:', {
                    gridSize: gridSizeSlider?.value,
                    spacing: spacingSlider?.value,
                    amplitude: amplitudeSlider?.value,
                    speed: speedSlider?.value
                });
                WAVE_GRID_SIZE = parseInt(gridSizeSlider?.value || '50');
                WAVE_SPACING = parseInt(spacingSlider?.value || '40');
                WAVE_AMPLITUDE = parseFloat(amplitudeSlider?.value || '10.0');
                WAVE_SPEED = parseFloat(speedSlider?.value || '0.1');
                COLOR_HEIGHT_ENABLED = colorHeightEnabled?.checked || false;
                COLOR_HEIGHT_INTENSITY = parseFloat(colorIntensitySlider?.value || '0.5');
                COLOR_HEIGHT_MODE = colorModeSelect?.value || 'red_blue';
                console.log('업데이트된 웨이브 설정:', {
                    WAVE_GRID_SIZE,
                    WAVE_SPACING,
                    WAVE_AMPLITUDE,
                    WAVE_SPEED,
                    COLOR_HEIGHT_ENABLED,
                    COLOR_HEIGHT_INTENSITY,
                    COLOR_HEIGHT_MODE
                });
                createWave();
                this.textContent = '적용됨!';
                this.style.background = '#28a745';
                setTimeout(() => {
                    this.textContent = '설정 적용';
                    this.style.background = '#007bff';
                }, 1000);
            });
        }
        console.log('웨이브 컨트롤 설정 완료');
    }
    catch (error) {
        console.error('웨이브 컨트롤 설정 중 오류:', error);
    }
}
const originalShow = Option_btn.mModal.Show;
Option_btn.mModal.Show = function () {
    originalShow.call(this);
    setTimeout(setupWaveControls, 300);
};
Option_btn.mModal.GetBody().addEventListener('DOMContentLoaded', function () {
    setTimeout(setupWaveControls, 500);
});
