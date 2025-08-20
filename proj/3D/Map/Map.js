const version = '2025-08-20 13:50:13';
import "../../../artgine/artgine.js";
import { CPreferences } from "../../../artgine/basic/CPreferences.js";
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
gPF.mGitHub = false;
import { CAtelier } from "../../../artgine/canvas/CAtelier.js";
var gAtl = new CAtelier();
gAtl.mPF = gPF;
await gAtl.Init([], "canvas");
import { CVec2 } from "../../../artgine/geometry/CVec2.js";
import { CVec3 } from "../../../artgine/geometry/CVec3.js";
import { CPaint3D } from "../../../artgine/canvas/component/paint/CPaint3D.js";
import { CSubject } from "../../../artgine/canvas/subject/CSubject.js";
import { CVec4 } from "../../../artgine/geometry/CVec4.js";
import { CCamCon3DFirstPerson } from "../../../artgine/util/CCamCon.js";
import { CFontOption } from "../../../artgine/util/CFont.js";
import { CUIText } from "../../../artgine/canvas/subject/CUI.js";
var Can3D = gAtl.NewCanvas('Can3D');
Can3D.SetCameraKey("3D");
Can3D.GetCam().SetCamCon(new CCamCon3DFirstPerson(gAtl.Frame().Input()));
gAtl.Frame().Dev().SetClearColor(true, new CVec4(1, 1, 1, 0));
let sub = Can3D.Push(new CSubject());
sub.SetSca(new CVec3(0.1, 0.1, 0.1));
sub.PushComp(new CPaint3D(gAtl.Frame().Pal().GetBoxMesh()));
sub.SetEnable(false);
let ui = sub.PushChilde(new CUIText());
ui.SetPos(new CVec3(0, 0, 200));
ui.SetSca(new CVec3(5, 5, 5));
ui.Init("Korea! Zoom in/out!", new CFontOption(64, "white", "black", 5));
ui.GetPt().SetBillBoard(true);
function BoxRefresh() {
    sub.SetEnable(true);
    let r = CacLatLng(37.5665, 126.9780);
    let pos = gAtl.Brush().GetCam3D().ScreenToWorld3DPoint(r.x, gAtl.PF().mHeight - r.y, 1000);
    sub.SetPos(pos);
}
let mapInstance = null;
function getMapInstance() {
    if (typeof maplibregl !== 'undefined') {
        const mapElement = document.getElementById('map');
        if (mapElement && mapElement._maplibregl) {
            mapInstance = mapElement._maplibregl;
            setupMapEventListeners();
            BoxRefresh();
        }
    }
}
function setupMapEventListeners() {
    if (!mapInstance)
        return;
    mapInstance.on('dragstart', () => {
        BoxRefresh();
    });
    mapInstance.on('drag', () => {
        BoxRefresh();
    });
    mapInstance.on('dragend', () => {
        setTimeout(() => {
            BoxRefresh();
        }, 100);
    });
    mapInstance.on('zoomstart', () => {
        BoxRefresh();
    });
    mapInstance.on('zoom', () => {
        BoxRefresh();
    });
    mapInstance.on('zoomend', () => {
        BoxRefresh();
    });
    mapInstance.on('rotatestart', () => {
        BoxRefresh();
    });
    mapInstance.on('rotate', () => {
        BoxRefresh();
    });
    mapInstance.on('rotateend', () => {
        BoxRefresh();
    });
    mapInstance.on('pitchstart', () => {
        console.log('📐 지도 기울기 시작');
    });
    mapInstance.on('pitch', () => {
        const pitch = mapInstance.getPitch();
        console.log(`📐 지도 기울기 중 - 기울기: ${pitch.toFixed(2)}°`);
    });
    mapInstance.on('pitchend', () => {
        const pitch = mapInstance.getPitch();
        console.log(`✅ 지도 기울기 종료 - 최종 기울기: ${pitch.toFixed(2)}°`);
    });
    mapInstance.on('moveend', () => {
        BoxRefresh();
    });
    mapInstance.on('transitionend', () => {
        BoxRefresh();
    });
    mapInstance.on('movestart', () => {
    });
    mapInstance.on('move', () => {
        if (!mapInstance._moveThrottle) {
            mapInstance._moveThrottle = setTimeout(() => {
                BoxRefresh();
                mapInstance._moveThrottle = null;
            }, 16);
        }
    });
    console.log('🗺️ 지도 이벤트 리스너가 설정되었습니다.');
}
function waitForMap() {
    if (typeof maplibregl !== 'undefined') {
        setTimeout(() => {
            getMapInstance();
        }, 1000);
    }
    else {
        setTimeout(waitForMap, 100);
    }
}
waitForMap();
document.addEventListener('mapClick', function (e) {
    const lat = e.detail.lat;
    const lng = e.detail.lng;
    CacLatLng(lat, lng);
});
function CacLatLng(_lat, _lng, baseLat = 0, baseLng = 0) {
    if (!mapInstance) {
        console.error("지도 인스턴스가 없습니다. 맵이 로드되지 않았습니다.");
        return null;
    }
    const latDiff = _lat - baseLat;
    const lngDiff = _lng - baseLng;
    const latDistance = latDiff * 111;
    const lngDistance = lngDiff * 88.9;
    const canvas = mapInstance.getCanvas();
    const screenPoint = mapInstance.project([_lng, _lat]);
    return new CVec2(screenPoint.x, screenPoint.y);
}
