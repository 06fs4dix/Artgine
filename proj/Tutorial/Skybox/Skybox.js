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
gPF.mCanvas = "";
gPF.mServer = 'local';
gPF.mGitHub = false;
gPF.mVersion = "mpuhzq22_70";
import { CAtelier } from "../../../artgine/app/CAtelier.js";
var gAtl = new CAtelier();
gAtl.mPF = gPF;
await gAtl.Init([], "");
import { CCamCon3DFirstPerson } from "../../../artgine/util/CCamCon.js";
import { CVec3 } from "../../../artgine/geometry/CVec3.js";
import { CSubject } from "../../../artgine/app/subject/CSubject.js";
import { CPaintCube } from "../../../artgine/app/component/paint/CPaint3D.js";
import { CDayCycle, CLightPlanet } from "../../../artgine/app/component/CLightPlanet.js";
import { CColor } from "../../../artgine/render/CColor.js";
import { CBGAttachButton, CModalFrameView } from "../../../artgine/util/CModalUtil.js";
import { CVec2 } from "../../../artgine/geometry/CVec2.js";
import { CDOM } from "../../../artgine/basic/CDOM.js";
import { CMath } from "../../../artgine/geometry/CMath.js";
import { CShaderAttr } from "../../../artgine/render/CShaderAttr.js";
import { CVec1 } from "../../../artgine/geometry/CVec1.js";
var Main = gAtl.NewCanvas("Main");
Main.SetCameraKey(gAtl.Brush().GetCam3D().Key());
gAtl.Brush().GetCam3D().SetCamCon(new CCamCon3DFirstPerson(gAtl.Frame().Input()));
gAtl.Brush().GetCam3D().Init(new CVec3(1000, 500, 0), new CVec3());
let ligSub = Main.PushSub(new CSubject());
let ligComp = ligSub.PushComp(new CLightPlanet());
ligComp.Push(new CDayCycle(new CVec3(0, 1, 0), new CColor(1, 1, 1)));
ligComp.Push(new CDayCycle(new CVec3(2, 0.5, 0), new CColor(1, 0.8, 0.8)));
ligComp.Push(new CDayCycle(new CVec3(-2, 0.5, 0), new CColor(1, 0.8, 0.8)));
ligComp.Push(new CDayCycle(new CVec3(-1, 0, 0), new CColor(1, 0.5, 0.5)));
ligComp.Push(new CDayCycle(new CVec3(1, 0, 0), new CColor(1, 0.5, 0.5)));
ligComp.Push(new CDayCycle(new CVec3(0, -1, 0), new CColor(0, 0, 0)));
ligComp.SetDirect();
ligComp.SetColor(new CVec3(1, 0.5, 0.5));
ligSub.SetPos(new CVec3(1, 0, 0));
let sub = Main.PushSub(new CSubject());
sub.SetSca(new CVec3(100, 100, 100));
let ptcube = sub.PushComp(new CPaintCube(""));
ptcube.Sky(true, true, true, true, true);
let cloudCoverageSA = new CShaderAttr("cloudCoverage", new CVec1(0.5));
ptcube.PushCShaderAttr(cloudCoverageSA);
let cloudStartSA = new CShaderAttr("cloudStart", new CVec1(15000.0));
ptcube.PushCShaderAttr(cloudStartSA);
let cloudHeightSA = new CShaderAttr("cloudHeight", new CVec1(10000.0));
ptcube.PushCShaderAttr(cloudHeightSA);
let cloudLightDistanceSA = new CShaderAttr("cloudLightDistance", new CVec1(10000.0));
ptcube.PushCShaderAttr(cloudLightDistanceSA);
let cloudPlanetRadiusSA = new CShaderAttr("cloudPlanetRadius", new CVec1(6300000.0));
ptcube.PushCShaderAttr(cloudPlanetRadiusSA);
let cloudSpeedSA = new CShaderAttr("cloudSpeed", new CVec3(1.0, 0.0, 0.0));
ptcube.PushCShaderAttr(cloudSpeedSA);
let cloudStepSA = new CShaderAttr("cloudStep", new CVec1(32.0));
ptcube.PushCShaderAttr(cloudStepSA);
let cloudDitherSA = new CShaderAttr("cloudDither", new CVec1(0.0));
ptcube.PushCShaderAttr(cloudDitherSA);
let cloudLightStepSA = new CShaderAttr("cloudLightStep", new CVec1(4.0));
ptcube.PushCShaderAttr(cloudLightStepSA);
let cloudScaleSA = new CShaderAttr("cloudScale", new CVec1(100000.0));
ptcube.PushCShaderAttr(cloudScaleSA);
let cloudExtinctionSA = new CShaderAttr("cloudExtinction", new CVec1(3.5));
ptcube.PushCShaderAttr(cloudExtinctionSA);
let cloudScatterSA = new CShaderAttr("cloudScatter", new CVec1(10.0));
ptcube.PushCShaderAttr(cloudScatterSA);
let cloudAmbientSA = new CShaderAttr("cloudAmbient", new CVec1(0.1));
ptcube.PushCShaderAttr(cloudAmbientSA);
let auroraSpeedSA = new CShaderAttr("auroraSpeed", new CVec1(0.1));
ptcube.PushCShaderAttr(auroraSpeedSA);
let auroraColorBotSA = new CShaderAttr("auroraColorBot", new CVec3(1.0, 0.0, 0.0));
ptcube.PushCShaderAttr(auroraColorBotSA);
let auroraColorMidSA = new CShaderAttr("auroraColorMid", new CVec3(0.0, 1.0, 0.0));
ptcube.PushCShaderAttr(auroraColorMidSA);
let auroraColorTopSA = new CShaderAttr("auroraColorTop", new CVec3(0.0, 0.0, 1.0));
ptcube.PushCShaderAttr(auroraColorTopSA);
let auroraOffsetSA = new CShaderAttr("auroraOffset", new CVec1(0.1));
ptcube.PushCShaderAttr(auroraOffsetSA);
let auroraDistortSA = new CShaderAttr("auroraDistort", new CVec1(1.0));
ptcube.PushCShaderAttr(auroraDistortSA);
let auroraSmoothnessSA = new CShaderAttr("auroraSmoothness", new CVec1(0.3));
ptcube.PushCShaderAttr(auroraSmoothnessSA);
let auroraMinSA = new CShaderAttr("auroraMin", new CVec3(-10000.0, 10000.0, -10000.0));
ptcube.PushCShaderAttr(auroraMinSA);
let auroraMaxSA = new CShaderAttr("auroraMax", new CVec3(10000.0, 15000.0, 10000.0));
ptcube.PushCShaderAttr(auroraMaxSA);
let auroraStepSA = new CShaderAttr("auroraStep", new CVec1(20.0));
ptcube.PushCShaderAttr(auroraStepSA);
let auroraSA = new CShaderAttr("aurora", new CVec1(1.0));
ptcube.PushCShaderAttr(auroraSA);
let Option_btn = new CBGAttachButton("Option", 101, new CVec2(320, 320));
Option_btn.SetTitleText("Option");
Option_btn.SetContent(`
<div class="p-2">
    
    <!-- Light Settings -->
    <div class="mb-4">
        <h6 class="text-muted border-bottom pb-1">Light Settings</h6>
        <div class="mb-3">
            <label for="light_dir" class="form-label">
                Direction: <span id="light_dir_value">0</span>°
            </label>
            <input type="range" class="form-range" id="light_dir" 
                   min="0" max="360" value="0" step="1"
                   oninput="updateCloudParams()">
        </div>
    </div>

    <!-- Cloud Coverage & Altitude -->
    <div class="mb-4">
        <h6 class="text-muted border-bottom pb-1">Cloud Coverage</h6>
        <div class="mb-3">
            <label for="cloudCoverage" class="form-label">
                Coverage: <span id="cloudCoverage_value">0.50</span>
            </label>
            <input type="range" class="form-range" id="cloudCoverage" 
                   min="0" max="1" value="0.5" step="0.01"
                   oninput="updateCloudParams()">
        </div>
        <div class="mb-3">
            <label for="cloudStart" class="form-label">
                Start Altitude: <span id="cloudStart_value">15000</span>m
            </label>
            <input type="range" class="form-range" id="cloudStart" 
                   min="0" max="50000" value="15000" step="100"
                   oninput="updateCloudParams()">
        </div>
        <div class="mb-3">
            <label for="cloudHeight" class="form-label">
                Height: <span id="cloudHeight_value">10000</span>m
            </label>
            <input type="range" class="form-range" id="cloudHeight" 
                   min="1000" max="30000" value="10000" step="100"
                   oninput="updateCloudParams()">
        </div>
    </div>

    <!-- Cloud Movement -->
    <div class="mb-4">
        <h6 class="text-muted border-bottom pb-1">Cloud Movement</h6>
        <div class="mb-3">
            <label for="cloudSpeed_x" class="form-label">
                Speed X: <span id="cloudSpeed_x_value">1.0</span>
            </label>
            <input type="range" class="form-range" id="cloudSpeed_x" 
                   min="-10" max="10" value="1" step="0.1"
                   oninput="updateCloudParams()">
        </div>
        <div class="mb-3">
            <label for="cloudSpeed_y" class="form-label">
                Speed Y: <span id="cloudSpeed_y_value">0.0</span>
            </label>
            <input type="range" class="form-range" id="cloudSpeed_y" 
                   min="-10" max="10" value="0" step="0.1"
                   oninput="updateCloudParams()">
        </div>
        <div class="mb-3">
            <label for="cloudSpeed_z" class="form-label">
                Speed Z: <span id="cloudSpeed_z_value">0.0</span>
            </label>
            <input type="range" class="form-range" id="cloudSpeed_z" 
                   min="-10" max="10" value="0" step="0.1"
                   oninput="updateCloudParams()">
        </div>
    </div>

    <!-- Rendering Quality -->
    <div class="mb-4">
        <h6 class="text-muted border-bottom pb-1">Rendering Quality</h6>
        <div class="mb-3">
            <label for="cloudStep" class="form-label">
                Ray Steps: <span id="cloudStep_value">32</span>
            </label>
            <input type="range" class="form-range" id="cloudStep" 
                   min="8" max="128" value="32" step="1"
                   oninput="updateCloudParams()">
        </div>
        <div class="mb-3">
            <label for="cloudLightStep" class="form-label">
                Light Steps: <span id="cloudLightStep_value">4</span>
            </label>
            <input type="range" class="form-range" id="cloudLightStep" 
                   min="1" max="16" value="4" step="1"
                   oninput="updateCloudParams()">
        </div>
        <div class="mb-3">
            <label for="cloudScale" class="form-label">
                Scale: <span id="cloudScale_value">100000</span>
            </label>
            <input type="range" class="form-range" id="cloudScale" 
                   min="10000" max="500000" value="100000" step="1000"
                   oninput="updateCloudParams()">
        </div>
        <div class="mb-3">
            <label for="cloudDither" class="form-label">
                Dither: <span id="cloudDither_value">0</span>
            </label>
            <input type="range" class="form-range" id="cloudDither" 
                   min="0" max="1" value="0" step="1"
                   oninput="updateCloudParams()">
        </div>
    </div>

    <!-- Lighting Properties -->
    <div class="mb-4">
        <h6 class="text-muted border-bottom pb-1">Lighting Properties</h6>
        <div class="mb-3">
            <label for="cloudLightDistance" class="form-label">
                Light Distance: <span id="cloudLightDistance_value">10000</span>m
            </label>
            <input type="range" class="form-range" id="cloudLightDistance" 
                   min="1000" max="50000" value="10000" step="100"
                   oninput="updateCloudParams()">
        </div>
        <div class="mb-3">
            <label for="cloudExtinction" class="form-label">
                Extinction: <span id="cloudExtinction_value">3.5</span>
            </label>
            <input type="range" class="form-range" id="cloudExtinction" 
                   min="0" max="10" value="3.5" step="0.1"
                   oninput="updateCloudParams()">
        </div>
        <div class="mb-3">
            <label for="cloudScatter" class="form-label">
                Scatter: <span id="cloudScatter_value">10.0</span>
            </label>
            <input type="range" class="form-range" id="cloudScatter" 
                   min="0" max="20" value="10" step="0.1"
                   oninput="updateCloudParams()">
        </div>
        <div class="mb-3">
            <label for="cloudAmbient" class="form-label">
                Ambient: <span id="cloudAmbient_value">0.10</span>
            </label>
            <input type="range" class="form-range" id="cloudAmbient" 
                   min="0" max="1" value="0.1" step="0.01"
                   oninput="updateCloudParams()">
        </div>
    </div>

    <!-- Advanced (Planet) -->
    <div class="mb-3">
        <h6 class="text-muted border-bottom pb-1">Advanced</h6>
        <div class="mb-3">
            <label for="cloudPlanetRadius" class="form-label">
                Planet Radius: <span id="cloudPlanetRadius_value">6300000</span>m
            </label>
            <input type="range" class="form-range" id="cloudPlanetRadius" 
                   min="1000000" max="10000000" value="6300000" step="10000"
                   oninput="updateCloudParams()">
        </div>
    </div>

    <div class="mb-4">
        <h6 class="text-muted border-bottom pb-1">Aurora Settings</h6>
        <div class="mb-3">
            <label for="auroraAlpha" class="form-label">
                Aurora Alpha: <span id="aurora_value">1.0</span>
            </label>
            <input type="range" class="form-range" id="auroraAlpha" 
                   min="0" max="1" value="1.0" step="0.1"
                   oninput="updateCloudParams()">
        </div>
        <div class="mb-3">
            <label for="auroraSpeed" class="form-label">
                Aurora Speed: <span id="auroraSpeed_value">0.10</span>
            </label>
            <input type="range" class="form-range" id="auroraSpeed" 
                   min="0" max="2" value="0.1" step="0.01"
                   oninput="updateCloudParams()">
        </div>
        <div class="mb-3">
            <label for="auroraStep" class="form-label">
                Aurora Steps: <span id="auroraStep_value">20</span>
            </label>
            <input type="range" class="form-range" id="auroraStep" 
                   min="5" max="64" value="20" step="1"
                   oninput="updateCloudParams()">
        </div>
        <div class="mb-3">
            <label for="auroraDistort" class="form-label">
                Distort: <span id="auroraDistort_value">1.0</span>
            </label>
            <input type="range" class="form-range" id="auroraDistort" 
                   min="0" max="5" value="1.0" step="0.1"
                   oninput="updateCloudParams()">
        </div>
        <div class="mb-3">
            <label class="form-label">Smoothness: <span id="auroraSmoothness_value">0.3</span></label>
            <input type="range" class="form-range" id="auroraSmoothness" min="0" max="1" value="0.3" step="0.05" oninput="updateCloudParams()">
        </div>
        <div class="mb-3">
            <label class="form-label">Offset: <span id="auroraOffset_value">0.1</span></label>
            <input type="range" class="form-range" id="auroraOffset" min="0" max="1" value="0.1" step="0.01" oninput="updateCloudParams()">
        </div>

        <div class="row mb-3">
            <div class="col">
                <label class="form-label">Bottom Color</label>
                <input type="color" class="form-control form-control-color w-100" id="auroraColorBot" value="#ff0000" oninput="updateCloudParams()">
            </div>
            <div class="col">
                <label class="form-label">Middle Color</label>
                <input type="color" class="form-control form-control-color w-100" id="auroraColorMid" value="#00ff00" oninput="updateCloudParams()">
            </div>
            <div class="col">
                <label class="form-label">Top Color</label>
                <input type="color" class="form-control form-control-color w-100" id="auroraColorTop" value="#0000ff" oninput="updateCloudParams()">
            </div>
        </div>

        <div class="mb-3">
            <label class="form-label">Min Boundary X: <span id="auroraMinX_value">-10000</span></label>
            <input type="range" class="form-range" id="auroraMinX" min="-200000" max="0" value="-10000" step="500" oninput="updateCloudParams()">
        </div>
        <div class="mb-3">
            <label class="form-label">Min Boundary Y: <span id="auroraMinY_value">10000</span></label>
            <input type="range" class="form-range" id="auroraMinY" min="1000" max="20000" value="10000" step="100" oninput="updateCloudParams()">
        </div>
        <div class="mb-3">
            <label class="form-label">Min Boundary Z: <span id="auroraMinZ_value">-10000</span></label>
            <input type="range" class="form-range" id="auroraMinZ" min="-200000" max="0" value="-10000" step="500" oninput="updateCloudParams()">
        </div>

        <div class="mb-3">
            <label class="form-label">Max Boundary X: <span id="auroraMaxX_value">10000</span></label>
            <input type="range" class="form-range" id="auroraMaxX" min="0" max="200000" value="10000" step="500" oninput="updateCloudParams()">
        </div>
        <div class="mb-3">
            <label class="form-label">Max Boundary Y: <span id="auroraMaxY_value">15000</span></label>
            <input type="range" class="form-range" id="auroraMaxY" min="2000" max="30000" value="15000" step="100" oninput="updateCloudParams()">
        </div>
        <div class="mb-3">
            <label class="form-label">Max Boundary Z: <span id="auroraMaxZ_value">10000</span></label>
            <input type="range" class="form-range" id="auroraMaxZ" min="0" max="200000" value="10000" step="500" oninput="updateCloudParams()">
        </div>
    </div>

</div>
`);
function HexToRGB(_hex) {
    _hex = _hex.replace(/^#/, '');
    if (_hex.length === 3) {
        _hex = _hex.split('').map(char => char + char).join('');
    }
    const r = parseInt(_hex.substring(0, 2), 16);
    const g = parseInt(_hex.substring(2, 4), 16);
    const b = parseInt(_hex.substring(4, 6), 16);
    return new CVec3(r, g, b);
}
function updateCloudParams() {
    document.getElementById("cloudCoverage_value").textContent =
        Number(CDOM.IDValue("cloudCoverage")).toFixed(2);
    document.getElementById("cloudStart_value").textContent =
        CDOM.IDValue("cloudStart");
    document.getElementById("cloudHeight_value").textContent =
        CDOM.IDValue("cloudHeight");
    document.getElementById("cloudSpeed_x_value").textContent =
        Number(CDOM.IDValue("cloudSpeed_x")).toFixed(1);
    document.getElementById("cloudSpeed_y_value").textContent =
        Number(CDOM.IDValue("cloudSpeed_y")).toFixed(1);
    document.getElementById("cloudSpeed_z_value").textContent =
        Number(CDOM.IDValue("cloudSpeed_z")).toFixed(1);
    document.getElementById("cloudStep_value").textContent =
        CDOM.IDValue("cloudStep");
    document.getElementById("cloudLightStep_value").textContent =
        CDOM.IDValue("cloudLightStep");
    document.getElementById("cloudScale_value").textContent =
        CDOM.IDValue("cloudScale");
    document.getElementById("cloudDither_value").textContent =
        CDOM.IDValue("cloudDither");
    document.getElementById("cloudLightDistance_value").textContent =
        CDOM.IDValue("cloudLightDistance");
    document.getElementById("cloudExtinction_value").textContent =
        Number(CDOM.IDValue("cloudExtinction")).toFixed(1);
    document.getElementById("cloudScatter_value").textContent =
        Number(CDOM.IDValue("cloudScatter")).toFixed(1);
    document.getElementById("cloudAmbient_value").textContent =
        Number(CDOM.IDValue("cloudAmbient")).toFixed(2);
    document.getElementById("cloudPlanetRadius_value").textContent =
        CDOM.IDValue("cloudPlanetRadius");
    document.getElementById("aurora_value").textContent =
        Number(CDOM.IDValue("auroraAlpha")).toFixed(2);
    document.getElementById("auroraSpeed_value").textContent =
        Number(CDOM.IDValue("auroraSpeed")).toFixed(2);
    document.getElementById("auroraStep_value").textContent =
        CDOM.IDValue("auroraStep");
    document.getElementById("auroraDistort_value").textContent =
        Number(CDOM.IDValue("auroraDistort")).toFixed(1);
    document.getElementById("auroraSmoothness_value").textContent =
        Number(CDOM.IDValue("auroraSmoothness")).toFixed(2);
    document.getElementById("auroraOffset_value").textContent =
        Number(CDOM.IDValue("auroraOffset")).toFixed(2);
    document.getElementById("auroraMinX_value").textContent =
        Number(CDOM.IDValue("auroraMinX")).toFixed(2);
    document.getElementById("auroraMinY_value").textContent =
        Number(CDOM.IDValue("auroraMinY")).toFixed(2);
    document.getElementById("auroraMinZ_value").textContent =
        Number(CDOM.IDValue("auroraMinZ")).toFixed(2);
    document.getElementById("auroraMaxX_value").textContent =
        Number(CDOM.IDValue("auroraMaxX")).toFixed(2);
    document.getElementById("auroraMaxY_value").textContent =
        Number(CDOM.IDValue("auroraMaxY")).toFixed(2);
    document.getElementById("auroraMaxZ_value").textContent =
        Number(CDOM.IDValue("auroraMaxZ")).toFixed(2);
    let light_dir = Number(CDOM.IDValue("light_dir"));
    document.getElementById("light_dir_value").textContent = light_dir + "";
    let angle_rad = (light_dir * CMath.PI()) / 180.0;
    let dir_vec = new CVec3(0, Math.sin(angle_rad), Math.cos(angle_rad));
    ligSub.SetPos(dir_vec);
    cloudCoverageSA.mData.x = Number(CDOM.IDValue("cloudCoverage"));
    cloudStartSA.mData.x = Number(CDOM.IDValue("cloudStart"));
    cloudHeightSA.mData.x = Number(CDOM.IDValue("cloudHeight"));
    cloudSpeedSA.mData.x = Number(CDOM.IDValue("cloudSpeed_x"));
    cloudSpeedSA.mData.y = Number(CDOM.IDValue("cloudSpeed_y"));
    cloudSpeedSA.mData.z = Number(CDOM.IDValue("cloudSpeed_z"));
    cloudStepSA.mData.x = Number(CDOM.IDValue("cloudStep"));
    cloudLightStepSA.mData.x = Number(CDOM.IDValue("cloudLightStep"));
    cloudScaleSA.mData.x = Number(CDOM.IDValue("cloudScale"));
    cloudDitherSA.mData.x = Number(CDOM.IDValue("cloudDither"));
    cloudLightDistanceSA.mData.x = Number(CDOM.IDValue("cloudLightDistance"));
    cloudExtinctionSA.mData.x = Number(CDOM.IDValue("cloudExtinction"));
    cloudScatterSA.mData.x = Number(CDOM.IDValue("cloudScatter"));
    cloudAmbientSA.mData.x = Number(CDOM.IDValue("cloudAmbient"));
    cloudPlanetRadiusSA.mData.x = Number(CDOM.IDValue("cloudPlanetRadius"));
    auroraSA.mData.x = Number(CDOM.IDValue("auroraAlpha"));
    auroraSpeedSA.mData.x = Number(CDOM.IDValue("auroraSpeed"));
    auroraStepSA.mData.x = Number(CDOM.IDValue("auroraStep"));
    auroraDistortSA.mData.x = Number(CDOM.IDValue("auroraDistort"));
    let auroraColorBot = HexToRGB(CDOM.IDValue("auroraColorBot"));
    auroraColorBotSA.mData.x = auroraColorBot.x;
    auroraColorBotSA.mData.y = auroraColorBot.y;
    auroraColorBotSA.mData.z = auroraColorBot.z;
    let auroraColorMid = HexToRGB(CDOM.IDValue("auroraColorMid"));
    auroraColorMidSA.mData.x = auroraColorMid.x;
    auroraColorMidSA.mData.y = auroraColorMid.y;
    auroraColorMidSA.mData.z = auroraColorMid.z;
    let auroraColorTop = HexToRGB(CDOM.IDValue("auroraColorTop"));
    auroraColorTopSA.mData.x = auroraColorTop.x;
    auroraColorTopSA.mData.y = auroraColorTop.y;
    auroraColorTopSA.mData.z = auroraColorTop.z;
    auroraSmoothnessSA.mData.x = Number(CDOM.IDValue("auroraSmoothness"));
    auroraOffsetSA.mData.x = Number(CDOM.IDValue("auroraOffset"));
    auroraMinSA.mData.x = Number(CDOM.IDValue("auroraMinX"));
    auroraMinSA.mData.y = Number(CDOM.IDValue("auroraMinY"));
    auroraMinSA.mData.z = Number(CDOM.IDValue("auroraMinZ"));
    auroraMaxSA.mData.x = Number(CDOM.IDValue("auroraMaxX"));
    auroraMaxSA.mData.y = Number(CDOM.IDValue("auroraMaxY"));
    auroraMaxSA.mData.z = Number(CDOM.IDValue("auroraMaxZ"));
}
window["updateCloudParams"] = updateCloudParams;
new CModalFrameView();
