//Version
const version='2025-08-20 17:20:44';
import "../../../artgine/artgine.js"

//Class
import {CClass} from "../../../artgine/basic/CClass.js";

//Atelier
import {CPreferences} from "../../../artgine/basic/CPreferences.js";
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
gPF.mCanvas = "";
gPF.mServer = 'local';
gPF.mGitHub = false;

import {CAtelier} from "../../../artgine/canvas/CAtelier.js";

import {CPlugin} from "../../../artgine/util/CPlugin.js";
var gAtl = new CAtelier();
gAtl.mPF = gPF;
await gAtl.Init([],"");
//The content above this line is automatically set by the program. Do not modify.⬆✋🚫⬆☠️💥🔥

//EntryPoint

import {CObject} from "../../../artgine/basic/CObject.js"

// Main 캔버스 새로 생성
import {CCanvas} from "../../../artgine/canvas/CCanvas.js";
import {CSubject} from "../../../artgine/canvas/subject/CSubject.js";
import {CVec3} from "../../../artgine/geometry/CVec3.js";
import {CVec4} from "../../../artgine/geometry/CVec4.js";
import {CPaint3D} from "../../../artgine/canvas/component/paint/CPaint3D.js";
import {CColor} from "../../../artgine/canvas/component/CColor.js";

// Main 캔버스 새로 생성
var Main = gAtl.NewCanvas("Main");

console.log("Main 캔버스가 성공적으로 생성되었습니다.");

// 카메라 설정 (3D 박스를 잘 볼 수 있도록)
import {CCamera} from "../../../artgine/render/CCamera.js";
import {CCamCon3DFirstPerson} from "../../../artgine/util/CCamCon.js";

// Main 캔버스에 3D 카메라 설정
Main.SetCameraKey("3D");

// 1인칭 카메라 컨트롤 설정
var firstPersonCamCon = new CCamCon3DFirstPerson(gAtl.Frame().Input());
Main.GetCam().SetCamCon(firstPersonCamCon);

// 박스 파도 효과 구현
import {CMath} from "../../../artgine/geometry/CMath.js";
import {CInput} from "../../../artgine/system/CInput.js";
import {CEvent} from "../../../artgine/basic/CEvent.js";
import { CBGAttachButton } from "../../../artgine/util/CModalUtil.js";
import { CVec2 } from "../../../artgine/geometry/CVec2.js";

// 박스 파도 설정 (변수로 변경하여 수정 가능하게)
var WAVE_GRID_SIZE = 50; // 25x25 격자 (더 많은 박스)
var WAVE_SPACING = 40;  // 박스 간격 (더 넓게 분산)
var WAVE_AMPLITUDE = 10.0; // 파도 높이 (박스 크기에 맞게 조정)
var WAVE_SPEED = 0.1;   // 파도 속도

// 색상 설정 변수
var COLOR_HEIGHT_ENABLED = true; // 높이에 따른 색상 변경 활성화
var COLOR_HEIGHT_INTENSITY = 0.5; // 높이에 따른 색상 변화 강도
var COLOR_HEIGHT_MODE = 'red_blue'; // 색상 모드: 'red_blue', 'rainbow', 'gradient', 'fire'

// HSV를 RGB로 변환하는 함수
function hueToRgb(hue: number): {r: number, g: number, b: number} {
    hue = hue % 360;
    if (hue < 0) hue += 360;
    
    let c = 1;
    let x = c * (1 - Math.abs((hue / 60) % 2 - 1));
    let m = 0;
    
    let r, g, b;
    if (hue < 60) {
        r = c; g = x; b = 0;
    } else if (hue < 120) {
        r = x; g = c; b = 0;
    } else if (hue < 180) {
        r = 0; g = c; b = x;
    } else if (hue < 240) {
        r = 0; g = x; b = c;
    } else if (hue < 300) {
        r = x; g = 0; b = c;
    } else {
        r = c; g = 0; b = x;
    }
    
    return {
        r: r + m,
        g: g + m,
        b: b + m
    };
}

// 박스 배열과 초기 위치 저장
var waveBoxes = [];
var initialPositions = [];
var time = 0;

// 웨이브 생성 함수
function createWave() {
    console.log('createWave 함수 호출됨');
    console.log('현재 웨이브 설정:', {
        WAVE_GRID_SIZE,
        WAVE_SPACING,
        WAVE_AMPLITUDE,
        WAVE_SPEED
    });
    
    // 기존 박스들 제거
    console.log('기존 박스 제거 중...', waveBoxes.length, '개');
    Main.Clear();
    waveBoxes = [];
    initialPositions = [];
    
    // 격자 형태로 박스들 생성
    for (let x = 0; x < WAVE_GRID_SIZE; x++) {
        for (let z = 0; z < WAVE_GRID_SIZE; z++) {
            // 박스 주체 생성
            var boxSubject = new CSubject();
            
            // 격자 위치 계산 (중앙을 0,0으로)
            let posX = (x - WAVE_GRID_SIZE/2) * WAVE_SPACING;
            let posZ = (z - WAVE_GRID_SIZE/2) * WAVE_SPACING;
            let posY = 0;
            
            // 초기 위치 저장
            initialPositions.push(new CVec3(posX, posY, posZ));
            
            // 박스 위치 설정
            boxSubject.SetPos(new CVec3(posX, posY, posZ));
            boxSubject.SetRot(new CVec3(0, 0, 0));
            boxSubject.SetSca(new CVec3(0.1, 0.1, 0.1)); // 박스 크기를 더 작게 조정
            
            // 3D 페인트 컴포넌트 추가
            var paint3D = new CPaint3D(gAtl.Frame().Pal().GetBoxMesh());
            //paint3D.SetTexture(gAtl.Frame().Pal().GetNoneTex());
            
                    // 각 박스마다 다른 색상 적용 (그라데이션 효과)
        let colorR = 0.3 + (x / WAVE_GRID_SIZE) * 0.7;
        let colorG = 0.3 + (z / WAVE_GRID_SIZE) * 0.7;
        let colorB = 0.5 + Math.sin((x + z) * 0.3) * 0.5;
        paint3D.SetRGBA(new CVec4(colorR, colorG, colorB, 1.0));
        
        // 박스의 높이에 따른 색상 정보를 저장 (나중에 동적으로 변경하기 위해)
        (boxSubject as any).mHeightColorData = {
            paint3D: paint3D,
            baseColor: new CVec4(colorR, colorG, colorB, 1.0)
        };
            
            // 주체에 페인트 컴포넌트 추가
            boxSubject.PushComp(paint3D);
            
            // Main 캔버스에 박스 추가
            Main.Push(boxSubject);
            
            // 박스 참조 저장
            waveBoxes.push(boxSubject);
        }
    }
}

// 초기 웨이브 생성
createWave();

// 마우스 위치 추적
var mousePos = new CVec3(0, 0, 0);

// 매프레임 업데이트 이벤트 등록
gAtl.Frame().PushEvent(CEvent.eType.Update, () => {
   
    // 시간 업데이트
    time += WAVE_SPEED;
    
    // 각 박스에 파도 효과 적용
    for (let i = 0; i < waveBoxes.length; i++) {
        let box = waveBoxes[i];
        let initialPos = initialPositions[i];
        
        // 마우스와의 거리 계산
        let distanceToMouse = CMath.V3Len(CMath.V3SubV3(initialPos, mousePos));
        
        // 파도 효과 계산
        let waveOffset = Math.sin(time + distanceToMouse * 0.5) * WAVE_AMPLITUDE;
        
        // // 마우스 근처일수록 파도가 더 강하게 (박스 범위에 맞게 영향 범위 조정)
        // let mouseInfluence = Math.max(0, 1 - distanceToMouse / 500);
        // waveOffset *= (1 + mouseInfluence * 5);
        
        // 새로운 Y 위치 계산
        let newY = initialPos.y + waveOffset;
        
        // 박스 위치 업데이트
        box.SetPos(new CVec3(initialPos.x, newY, initialPos.z));
        
        // 회전 효과 추가 (파도에 따라 살짝 기울어짐)
        let rotationX = Math.sin(time + distanceToMouse * 0.3) * 0.1;
        let rotationZ = Math.cos(time + distanceToMouse * 0.4) * 0.1;
        box.SetRot(new CVec3(rotationX, 0, rotationZ));
        
        // 스케일 효과 (파도 높이에 따라 살짝 커졌다 작아짐)
        let scaleFactor = 0.1 + Math.sin(time + distanceToMouse * 0.4) * 0.02; // 기본 스케일 0.1에 맞게 조정
        box.SetSca(new CVec3(scaleFactor, scaleFactor, scaleFactor));
        
        // 높이에 따른 색상 변경
        if ((box as any).mHeightColorData && COLOR_HEIGHT_ENABLED) {
            let heightData = (box as any).mHeightColorData;
            let baseColor = heightData.baseColor;
            let currentHeight = newY;
            
            // 높이에 따른 색상 변화 계산
            let heightRatio = Math.max(0, Math.min(1, (currentHeight + WAVE_AMPLITUDE) / (WAVE_AMPLITUDE * 2)));
            
            let heightColorR, heightColorG, heightColorB;
            
            // 색상 모드에 따른 계산
            switch (COLOR_HEIGHT_MODE) {
                case 'red_blue':
                    // 높이에 따라 색상 변화 (낮을수록 파란색, 높을수록 빨간색)
                    let lowColor = {r: 0.2, g: 0.3, b: 0.8}; // 낮을 때 파란색
                    let highColor = {r: 0.9, g: 0.2, b: 0.1}; // 높을 때 빨간색
                    
                    heightColorR = lowColor.r + (highColor.r - lowColor.r) * heightRatio;
                    heightColorG = lowColor.g + (highColor.g - lowColor.g) * heightRatio;
                    heightColorB = lowColor.b + (highColor.b - lowColor.b) * heightRatio;
                    break;
                    
                case 'rainbow':
                    // 무지개 색상 효과
                    let hue = (heightRatio * 360 + time * 50) % 360;
                    let rgb = hueToRgb(hue);
                    heightColorR = rgb.r;
                    heightColorG = rgb.g;
                    heightColorB = rgb.b;
                    break;
                    
                case 'gradient':
                    // 그라데이션 색상 효과 (초록색에서 노란색으로)
                    let greenColor = {r: 0.1, g: 0.8, b: 0.2}; // 초록색
                    let yellowColor = {r: 0.9, g: 0.9, b: 0.1}; // 노란색
                    
                    heightColorR = greenColor.r + (yellowColor.r - greenColor.r) * heightRatio;
                    heightColorG = greenColor.g + (yellowColor.g - greenColor.g) * heightRatio;
                    heightColorB = greenColor.b + (yellowColor.b - greenColor.b) * heightRatio;
                    break;
                    
                case 'fire':
                    // 불꽃 색상 효과 (검은색에서 빨간색, 노란색으로)
                    if (heightRatio < 0.5) {
                        // 낮은 부분: 검은색에서 빨간색
                        let blackColor = {r: 0.0, g: 0.0, b: 0.0};
                        let redColor = {r: 0.9, g: 0.1, b: 0.1};
                        let fireRatio = heightRatio * 2; // 0~0.5을 0~1로 변환
                        
                        heightColorR = blackColor.r + (redColor.r - blackColor.r) * fireRatio;
                        heightColorG = blackColor.g + (redColor.g - blackColor.g) * fireRatio;
                        heightColorB = blackColor.b + (redColor.b - blackColor.b) * fireRatio;
                    } else {
                        // 높은 부분: 빨간색에서 노란색
                        let redColor = {r: 0.9, g: 0.1, b: 0.1};
                        let yellowColor = {r: 1.0, g: 1.0, b: 0.0};
                        let fireRatio = (heightRatio - 0.5) * 2; // 0.5~1을 0~1로 변환
                        
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
            
            // 색상 범위 제한 (0~1)
            heightColorR = Math.max(0, Math.min(1, heightColorR));
            heightColorG = Math.max(0, Math.min(1, heightColorG));
            heightColorB = Math.max(0, Math.min(1, heightColorB));
            
            // SetColorModel을 사용하여 덧셈 방식으로 색상 적용
            let heightColor = new CColor(heightColorR, heightColorG, heightColorB, CColor.eModel.RGBAdd);
            heightData.paint3D.SetColorModel(heightColor);
        }
    }
});



// 웨이브 설정 옵션창
let Option_btn=new CBGAttachButton("DevToolModal",101,new CVec2(240,320));
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

// 웨이브 컨트롤 설정 함수
function setupWaveControls() {
    try {
        // CUtil을 사용하여 DOM 요소에 접근
        const CUtil = (window as any).CUtil;
        if (!CUtil) {
            console.error('CUtil을 찾을 수 없습니다.');
            return;
        }
        
        const modalDiv = CUtil.ID(Option_btn.Key() + "_div");
        if (!modalDiv) {
            console.error('모달 div를 찾을 수 없습니다.');
            return;
        }
        
        // 격자 크기 컨트롤
        const gridSizeSlider = modalDiv.querySelector('#gridSize') as HTMLInputElement;
        const gridSizeValue = modalDiv.querySelector('#gridSizeValue');
        if (gridSizeSlider && gridSizeValue) {
            // 기존 이벤트 리스너 제거
            gridSizeSlider.removeEventListener('input', gridSizeSlider.oninput as any);
            gridSizeSlider.removeEventListener('change', gridSizeSlider.onchange as any);
            
            // 실시간 값 표시
            gridSizeSlider.addEventListener('input', function() {
                gridSizeValue.textContent = this.value;
                
                // 실시간으로 총 박스 개수도 업데이트
                const totalBoxesCount = modalDiv.querySelector('#totalBoxesCount');
                if (totalBoxesCount) {
                    const currentGridSize = parseInt(this.value);
                    const totalBoxes = currentGridSize * currentGridSize;
                    totalBoxesCount.textContent = totalBoxes;
                }
            });
            
            // 값 변경 시 웨이브 재생성
            gridSizeSlider.addEventListener('change', function() {
                WAVE_GRID_SIZE = parseInt(this.value);
                console.log('격자 크기 변경됨:', WAVE_GRID_SIZE);
                
                // 총 박스 개수 업데이트
                const totalBoxesCount = modalDiv.querySelector('#totalBoxesCount');
                if (totalBoxesCount) {
                    const totalBoxes = WAVE_GRID_SIZE * WAVE_GRID_SIZE;
                    totalBoxesCount.textContent = totalBoxes;
                    console.log('총 박스 개수:', totalBoxes);
                }
                
                createWave();
            });
        }
        
        // 박스 간격 컨트롤
        const spacingSlider = modalDiv.querySelector('#spacing') as HTMLInputElement;
        const spacingValue = modalDiv.querySelector('#spacingValue');
        if (spacingSlider && spacingValue) {
            // 기존 이벤트 리스너 제거
            spacingSlider.removeEventListener('input', spacingSlider.oninput as any);
            spacingSlider.removeEventListener('change', spacingSlider.onchange as any);
            
            // 실시간 값 표시
            spacingSlider.addEventListener('input', function() {
                spacingValue.textContent = this.value;
            });
            
            // 값 변경 시 웨이브 재생성
            spacingSlider.addEventListener('change', function() {
                WAVE_SPACING = parseInt(this.value);
                console.log('박스 간격 변경됨:', WAVE_SPACING);
                createWave();
            });
        }
        
        // 파도 높이 컨트롤
        const amplitudeSlider = modalDiv.querySelector('#amplitude') as HTMLInputElement;
        const amplitudeValue = modalDiv.querySelector('#amplitudeValue');
        if (amplitudeSlider && amplitudeValue) {
            // 기존 이벤트 리스너 제거
            amplitudeSlider.removeEventListener('input', amplitudeSlider.oninput as any);
            amplitudeSlider.removeEventListener('change', amplitudeSlider.onchange as any);
            
            // 실시간 값 표시
            amplitudeSlider.addEventListener('input', function() {
                amplitudeValue.textContent = this.value;
            });
            
            // 값 변경 시 웨이브 재생성
            amplitudeSlider.addEventListener('change', function() {
                WAVE_AMPLITUDE = parseFloat(this.value);
                console.log('파도 높이 변경됨:', WAVE_AMPLITUDE);
                createWave();
            });
        }
        
        // 파도 속도 컨트롤
        const speedSlider = modalDiv.querySelector('#speed') as HTMLInputElement;
        const speedValue = modalDiv.querySelector('#speedValue');
        if (speedSlider && speedValue) {
            // 기존 이벤트 리스너 제거
            speedSlider.removeEventListener('input', speedSlider.oninput as any);
            speedSlider.removeEventListener('change', speedSlider.onchange as any);
            
            // 실시간 값 표시
            speedSlider.addEventListener('input', function() {
                speedValue.textContent = this.value;
            });
            
            // 값 변경 시 웨이브 재생성
            speedSlider.addEventListener('change', function() {
                WAVE_SPEED = parseFloat(this.value);
                console.log('파도 속도 변경됨:', WAVE_SPEED);
                createWave();
            });
        }
        
        // 색상 높이 활성화 체크박스
        const colorHeightEnabled = modalDiv.querySelector('#colorHeightEnabled') as HTMLInputElement;
        if (colorHeightEnabled) {
            colorHeightEnabled.removeEventListener('change', colorHeightEnabled.onchange as any);
            colorHeightEnabled.addEventListener('change', function() {
                COLOR_HEIGHT_ENABLED = this.checked;
                console.log('높이에 따른 색상 변경:', COLOR_HEIGHT_ENABLED);
            });
        }
        
        // 색상 변화 강도 슬라이더
        const colorIntensitySlider = modalDiv.querySelector('#colorIntensity') as HTMLInputElement;
        const colorIntensityValue = modalDiv.querySelector('#colorIntensityValue');
        if (colorIntensitySlider && colorIntensityValue) {
            colorIntensitySlider.removeEventListener('input', colorIntensitySlider.oninput as any);
            colorIntensitySlider.addEventListener('input', function() {
                colorIntensityValue.textContent = this.value;
                COLOR_HEIGHT_INTENSITY = parseFloat(this.value);
            });
        }
        
        // 색상 모드 선택
        const colorModeSelect = modalDiv.querySelector('#colorMode') as HTMLSelectElement;
        if (colorModeSelect) {
            colorModeSelect.removeEventListener('change', colorModeSelect.onchange as any);
            colorModeSelect.addEventListener('change', function() {
                COLOR_HEIGHT_MODE = this.value;
                console.log('색상 모드 변경됨:', COLOR_HEIGHT_MODE);
            });
        }
        
        // 설정 적용 버튼
        const applyButton = modalDiv.querySelector('#applySettings') as HTMLButtonElement;
        if (applyButton) {
            // 기존 이벤트 리스너 제거
            applyButton.removeEventListener('click', applyButton.onclick as any);
            applyButton.addEventListener('click', function() {
                console.log('설정 적용 버튼 클릭됨');
                console.log('새로운 값들:', {
                    gridSize: gridSizeSlider?.value,
                    spacing: spacingSlider?.value,
                    amplitude: amplitudeSlider?.value,
                    speed: speedSlider?.value
                });
                
                // 새로운 값들 가져오기
                WAVE_GRID_SIZE = parseInt(gridSizeSlider?.value || '50');
                WAVE_SPACING = parseInt(spacingSlider?.value || '40');
                WAVE_AMPLITUDE = parseFloat(amplitudeSlider?.value || '10.0');
                WAVE_SPEED = parseFloat(speedSlider?.value || '0.1');
                
                // 색상 설정도 함께 가져오기
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
                
                // 웨이브 재생성
                createWave();
                
                // 성공 메시지 표시
                this.textContent = '적용됨!';
                this.style.background = '#28a745';
                setTimeout(() => {
                    this.textContent = '설정 적용';
                    this.style.background = '#007bff';
                }, 1000);
            });
        }
        
        console.log('웨이브 컨트롤 설정 완료');
    } catch (error) {
        console.error('웨이브 컨트롤 설정 중 오류:', error);
    }
}

// 옵션창이 열릴 때마다 컨트롤 설정
// 모달이 열릴 때마다 컨트롤 설정을 위해 모달 표시 이벤트에 연결
const originalShow = Option_btn.mModal.Show;
Option_btn.mModal.Show = function() {
    originalShow.call(this);
    // DOM이 완전히 로드된 후 실행 (더 긴 지연)
    setTimeout(setupWaveControls, 300);
};

// 추가로 모달이 열린 후에도 컨트롤 설정을 시도
Option_btn.mModal.GetBody().addEventListener('DOMContentLoaded', function() {
    setTimeout(setupWaveControls, 500);
});



























