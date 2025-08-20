//Version
const version='2025-08-21 06:36:55';
import "https://06fs4dix.github.io/Artgine/artgine/artgine.js"

//Class
import {CClass} from "https://06fs4dix.github.io/Artgine/artgine/basic/CClass.js";

//Atelier
import {CPreferences} from "https://06fs4dix.github.io/Artgine/artgine/basic/CPreferences.js";
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
gPF.mCanvas = "canvas";
gPF.mServer = 'local';
gPF.mGitHub = true;

import {CAtelier} from "https://06fs4dix.github.io/Artgine/artgine/canvas/CAtelier.js";

import {CPlugin} from "https://06fs4dix.github.io/Artgine/artgine/util/CPlugin.js";
var gAtl = new CAtelier();
gAtl.mPF = gPF;
await gAtl.Init([],"canvas");
//The content above this line is automatically set by the program. Do not modify.⬆✋🚫⬆☠️💥🔥

//EntryPoint

import {CObject} from "https://06fs4dix.github.io/Artgine/artgine/basic/CObject.js"
import { CVec2 } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CVec2.js";
import { CMeshCreateInfo } from "https://06fs4dix.github.io/Artgine/artgine/render/CMeshCreateInfo.js";
import { CVertexFormat } from "https://06fs4dix.github.io/Artgine/artgine/render/CShader.js";
import { CVec3 } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CVec3.js";
import { CUtilRender } from "https://06fs4dix.github.io/Artgine/artgine/render/CUtilRender.js";
import { CPaint3D } from "https://06fs4dix.github.io/Artgine/artgine/canvas/component/paint/CPaint3D.js";
import { CSubject } from "https://06fs4dix.github.io/Artgine/artgine/canvas/subject/CSubject.js";
import { CVec4 } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CVec4.js";
import { CMath } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CMath.js";
import { CCamCon3DFirstPerson } from "https://06fs4dix.github.io/Artgine/artgine/util/CCamCon.js";
import { CModalFrameView } from "https://06fs4dix.github.io/Artgine/artgine/util/CModalUtil.js";
import { CRenderPass } from "https://06fs4dix.github.io/Artgine/artgine/render/CRenderPass.js";
import { CConsol } from "https://06fs4dix.github.io/Artgine/artgine/basic/CConsol.js";
import { CFont, CFontOption } from "https://06fs4dix.github.io/Artgine/artgine/util/CFont.js";
import { CUIText } from "https://06fs4dix.github.io/Artgine/artgine/canvas/subject/CUI.js";


declare global {
    const maplibregl: any;
}
var Can3D = gAtl.NewCanvas('Can3D');
Can3D.SetCameraKey("3D");
Can3D.GetCam().SetCamCon(new CCamCon3DFirstPerson(gAtl.Frame().Input()));

gAtl.Frame().Dev().SetClearColor(true,new CVec4(1,1,1,0));


let sub=Can3D.Push(new CSubject());
sub.SetSca(new CVec3(0.1,0.1,0.1));
sub.PushComp(new CPaint3D(gAtl.Frame().Pal().GetBoxMesh()));
sub.SetEnable(false);
let ui=sub.PushChilde(new CUIText());
ui.SetPos(new CVec3(0,0,200));
ui.SetSca(new CVec3(5,5,5))
ui.Init("Korea! Zoom in/out!",new CFontOption(64,"white","black",5));
ui.GetPt().SetBillBoard(true);

//CFont.TextToTexName(gAtl.Frame().Ren(),"Korea! Zoom in/out!",new CFontOption());

function BoxRefresh()
{
    sub.SetEnable(true);
    let r=CacLatLng(37.5665, 126.9780);
    let pos=gAtl.Brush().GetCam3D().ScreenToWorld3DPoint(r.x,gAtl.PF().mHeight-r.y,1000);
    sub.SetPos(pos);
}
// 전역 변수로 지도 객체 참조를 저장할 변수
let mapInstance: any = null;

// HTML에서 지도 객체를 가져오는 함수
function getMapInstance() {
    if (typeof maplibregl !== 'undefined') {
        // maplibregl이 로드된 후 지도 인스턴스를 가져옴
        const mapElement = document.getElementById('map') as any;
        if (mapElement && mapElement._maplibregl) {
            mapInstance = mapElement._maplibregl;
            
            // 지도 이벤트 리스너 설정
            setupMapEventListeners();
            BoxRefresh();
        }
    }
}

// 지도 이벤트 리스너 설정 함수
function setupMapEventListeners() {
    if (!mapInstance) return;
    
    // 드래그 시작 이벤트
    mapInstance.on('dragstart', () => {
        //console.log('🗺️ 지도 드래그 시작');
        BoxRefresh();
    });
    
    // 드래그 중 이벤트
    mapInstance.on('drag', () => {
        //const center = mapInstance.getCenter();
        //console.log(`🔄 지도 드래그 중 - 중심: 위도 ${center.lat.toFixed(6)}, 경도 ${center.lng.toFixed(6)}`);
        BoxRefresh();

    });
    
    // 드래그 종료 이벤트
    mapInstance.on('dragend', () => {
        //const center = mapInstance.getCenter();
        //console.log(`✅ 지도 드래그 종료 - 최종 중심: 위도 ${center.lat.toFixed(6)}, 경도 ${center.lng.toFixed(6)}`);
        // 관성 움직임이 끝날 때까지 약간의 지연 후 박스 위치 업데이트
        setTimeout(() => {
            BoxRefresh();
        }, 100); // 100ms 지연
    });
    
    // 줌 시작 이벤트
    mapInstance.on('zoomstart', () => {
        //console.log('🔍 지도 줌 시작');
        BoxRefresh();
    });
    
    // 줌 중 이벤트
    mapInstance.on('zoom', () => {
        // const zoom = mapInstance.getZoom();
        // const center = mapInstance.getCenter();
        // console.log(`🔍 지도 줌 중 - 줌 레벨: ${zoom.toFixed(2)}, 중심: 위도 ${center.lat.toFixed(6)}, 경도 ${center.lng.toFixed(6)}`);
        BoxRefresh();
    });
    
    // 줌 종료 이벤트
    mapInstance.on('zoomend', () => {
        // const zoom = mapInstance.getZoom();
        // const center = mapInstance.getCenter();
        // console.log(`✅ 지도 줌 종료 - 최종 줌 레벨: ${zoom.toFixed(2)}, 중심: 위도 ${center.lat.toFixed(6)}, 경도 ${center.lng.toFixed(6)}`);
        BoxRefresh();
    });
    
    // 회전 시작 이벤트
    mapInstance.on('rotatestart', () => {
        //console.log('🔄 지도 회전 시작');
        BoxRefresh();
    });
    
    // 회전 중 이벤트
    mapInstance.on('rotate', () => {
        // const bearing = mapInstance.getBearing();
        // console.log(`🔄 지도 회전 중 - 회전각: ${bearing.toFixed(2)}°`);
        BoxRefresh();
    });
    
    // 회전 종료 이벤트
    mapInstance.on('rotateend', () => {
        // const bearing = mapInstance.getBearing();
        // console.log(`✅ 지도 회전 종료 - 최종 회전각: ${bearing.toFixed(2)}°`);
        BoxRefresh();
    });
    
    // 기울기 시작 이벤트
    mapInstance.on('pitchstart', () => {
        console.log('📐 지도 기울기 시작');
    });
    
    // 기울기 중 이벤트
    mapInstance.on('pitch', () => {
        const pitch = mapInstance.getPitch();
        console.log(`📐 지도 기울기 중 - 기울기: ${pitch.toFixed(2)}°`);
    });
    
    // 기울기 종료 이벤트
    mapInstance.on('pitchend', () => {
        const pitch = mapInstance.getPitch();
        console.log(`✅ 지도 기울기 종료 - 최종 기울기: ${pitch.toFixed(2)}°`);
    });
    
    // 지도 이동 완료 이벤트 (드래그, 줌, 회전, 기울기 모두 포함)
    mapInstance.on('moveend', () => {
        // const center = mapInstance.getCenter();
        // const zoom = mapInstance.getZoom();
        // const bearing = mapInstance.getBearing();
        // const pitch = mapInstance.getPitch();
        // console.log(`🎯 지도 이동 완료:`);
        // console.log(`   📍 중심: 위도 ${center.lat.toFixed(6)}, 경도 ${center.lng.toFixed(6)}`);
        // console.log(`   🔍 줌 레벨: ${zoom.toFixed(2)}`);
        // console.log(`   🔄 회전각: ${bearing.toFixed(2)}°`);
        // console.log(`   📐 기울기: ${pitch.toFixed(2)}°`);
        // console.log(`   ──────────────────────────────────`);
        BoxRefresh();
    });
    
    // 관성 움직임 완료 이벤트 (빠른 드래그 후 자동 움직임이 끝날 때)
    mapInstance.on('transitionend', () => {
        BoxRefresh();
    });
    
    // 지도 움직임 상태 변경 이벤트
    mapInstance.on('movestart', () => {
        // 지도 움직임이 시작될 때
    });
    
    // 지도 움직임 중 이벤트 (실시간)
    mapInstance.on('move', () => {
        // 실시간으로 박스 위치 업데이트 (성능 고려하여 throttle 적용)
        if (!mapInstance._moveThrottle) {
            mapInstance._moveThrottle = setTimeout(() => {
                BoxRefresh();
                mapInstance._moveThrottle = null;
            }, 16); // 약 60fps로 제한
        }
    });
    
    console.log('🗺️ 지도 이벤트 리스너가 설정되었습니다.');
}

// 지도가 로드될 때까지 대기
function waitForMap() {
    if (typeof maplibregl !== 'undefined') {
        // 지도가 로드된 후 이벤트 설정
        setTimeout(() => {
            getMapInstance();
        }, 1000); // 1초 후 시도
    } else {
        setTimeout(waitForMap, 100); // 100ms 후 다시 시도
    }
}
waitForMap();

// HTML에서 발생하는 지도 클릭 이벤트 리스너
document.addEventListener('mapClick', function(e: any) {
    const lat = e.detail.lat;
    const lng = e.detail.lng;
    
    CacLatLng(lat,lng);

});

function CacLatLng(_lat: number, _lng: number, baseLat=0, baseLng=0)
{
    // 맵 인스턴스가 있는지 확인
    if (!mapInstance) {
        console.error("지도 인스턴스가 없습니다. 맵이 로드되지 않았습니다.");
        return null;
    }
    
    // 클릭한 위치를 기준점 대비 상대적 거리로 계산
    // 위도 1도 ≈ 111km, 경도 1도 ≈ 88.9km (한반도 위도 기준)
    const latDiff = _lat - baseLat;
    const lngDiff = _lng - baseLng;
    
    // 실제 거리를 km 단위로 계산
    const latDistance = latDiff * 111; // km
    const lngDistance = lngDiff * 88.9; // km
    

    // 화면 크기 정보
    const canvas = mapInstance.getCanvas();

    // 입력된 위도/경도를 현재 화면 좌표로 변환
    const screenPoint = mapInstance.project([_lng, _lat]);
    
 
    return new CVec2(screenPoint.x,screenPoint.y);
}























