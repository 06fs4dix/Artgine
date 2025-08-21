const version = '2025-08-21 22:26:26';
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
gPF.mCanvas = "";
gPF.mServer = 'local';
gPF.mGitHub = true;
import { CAtelier } from "https://06fs4dix.github.io/Artgine/artgine/canvas/CAtelier.js";
var gAtl = new CAtelier();
gAtl.mPF = gPF;
await gAtl.Init([], "");
import { CVec2 } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CVec2.js";
import { CMeshCreateInfo } from "https://06fs4dix.github.io/Artgine/artgine/render/CMeshCreateInfo.js";
import { CVertexFormat } from "https://06fs4dix.github.io/Artgine/artgine/render/CShader.js";
import { CVec3 } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CVec3.js";
import { CFecth } from "https://06fs4dix.github.io/Artgine/artgine/network/CFecth.js";
import { CUtilRender } from "https://06fs4dix.github.io/Artgine/artgine/render/CUtilRender.js";
import { CPaint3D } from "https://06fs4dix.github.io/Artgine/artgine/canvas/component/paint/CPaint3D.js";
import { CSubject } from "https://06fs4dix.github.io/Artgine/artgine/canvas/subject/CSubject.js";
import { CCamCon3DFirstPerson } from "https://06fs4dix.github.io/Artgine/artgine/util/CCamCon.js";
import { CModalFrameView } from "https://06fs4dix.github.io/Artgine/artgine/util/CModalUtil.js";
import { CPath } from "https://06fs4dix.github.io/Artgine/artgine/basic/CPath.js";
import { CRenderPass } from "https://06fs4dix.github.io/Artgine/artgine/render/CRenderPass.js";
import { CConfirm } from "https://06fs4dix.github.io/Artgine/artgine/basic/CModal.js";
var Can3D = gAtl.NewCanvas('Can3D');
Can3D.SetCameraKey("3D");
await gAtl.Frame().Load().Load("Shader.ts");
Can3D.GetCam().SetCamCon(new CCamCon3DFirstPerson(gAtl.Frame().Input()));
Can3D.GetCam().Init(new CVec3(250, 10000, -150), new CVec3(-600, 750, 350));
let newCenter;
function LonLatToWebMercator(_lon, _lat) {
    const R = 6378137;
    let x = R * _lon * Math.PI / 180;
    let y = R * Math.log(Math.tan(Math.PI / 4 + _lat * Math.PI / 360));
    if (newCenter == null) {
        newCenter = new CVec2(x, y);
        x = 0;
        y = 0;
    }
    else {
        x -= newCenter.x;
        y -= newCenter.y;
    }
    return new CVec2(x, y);
}
async function getNaturalEarthData(category, scale = "110m") {
    const dataUrls = {
        "countries": "https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson",
        "cities": "https://raw.githubusercontent.com/lutangar/cities.json/master/cities.json",
        "us_states": "https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json",
        "world_cities": "https://raw.githubusercontent.com/eesur/country-codes-lat-long/master/country-codes-lat-long-alpha3.json"
    };
    try {
        const url = dataUrls[category] || dataUrls["countries"];
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    }
    catch (error) {
        console.error(`Natural Earth 데이터 로드 실패 (${category}):`, error);
        return null;
    }
}
async function getGADMData(countryCode, level = 0) {
    const dataUrls = {
        "KOR": "https://raw.githubusercontent.com/southkorea/southkorea-maps/master/kostat/2018/json/skorea-municipalities-2018-geo.json",
        "USA": "https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json",
        "JPN": "https://raw.githubusercontent.com/dataofjapan/landarea/master/data/japan.geojson"
    };
    try {
        const url = dataUrls[countryCode] || dataUrls["KOR"];
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    }
    catch (error) {
        console.error(`GADM 데이터 로드 실패 (${countryCode}):`, error);
        return null;
    }
}
async function getOpenStreetMapData(query) {
    const overpassUrl = "https://overpass-api.de/api/interpreter";
    const simpleQuery = "way[building](37.5665,126.9780,37.5865,126.9980);out geom;";
    try {
        const response = await fetch(overpassUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `data=${encodeURIComponent(simpleQuery)}`
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    }
    catch (error) {
        console.error(`OpenStreetMap 데이터 로드 실패:`, error);
        return null;
    }
}
async function loadGeoJSONData() {
    console.log("GeoJSON data loading started...");
    return new Promise((resolve) => {
        CConfirm.List("Select Data Source!", [
            async () => {
                console.log("Web data loading selected");
                const webData = await loadWebData();
                resolve(webData);
            },
            async () => {
                console.log("Local file loading selected");
                const localData = await loadLocalGeoJSONFile();
                resolve(localData);
            }
        ], ["🌐 Web Load(Korea)", "💾 Local File"]);
    });
}
async function loadWebData() {
    console.log("Web data loading started...");
    console.log("1. Loading Korea administrative districts data...");
    let gadmData = await getGADMData("KOR", 1);
    if (gadmData) {
        console.log("✅ Korea administrative districts data loaded successfully");
        return gadmData;
    }
    console.log("2. Loading US states data...");
    gadmData = await getGADMData("USA", 0);
    if (gadmData) {
        console.log("✅ US states data loaded successfully");
        return gadmData;
    }
    console.log("3. Loading country boundaries data...");
    let naturalEarthData = await getNaturalEarthData("countries");
    if (naturalEarthData) {
        console.log("✅ Country boundaries data loaded successfully");
        return naturalEarthData;
    }
    console.log("4. Loading cities data...");
    naturalEarthData = await getNaturalEarthData("cities");
    if (naturalEarthData) {
        console.log("✅ Cities data loaded successfully");
        return naturalEarthData;
    }
    console.log("Web data loading failed, falling back to local file...");
    const localData = await loadLocalGeoJSONFile();
    if (localData) {
        return localData;
    }
    console.log("Final fallback: Using built-in sample data");
    return createSampleData();
}
async function loadLocalGeoJSONFile() {
    try {
        console.log("Attempting to load local test.geojson file...");
        const localData = await CFecth.Exe(CPath.PHPCR() + "test.geojson", null, "json");
        if (localData) {
            console.log("✅ Local test.geojson file loaded successfully");
            return localData;
        }
    }
    catch (error) {
        console.error("Local file loading failed:", error);
    }
    try {
        console.log("Attempting to load local test.json file...");
        const localData = await CFecth.Exe(CPath.PHPCR() + "test.json", null, "json");
        if (localData) {
            console.log("✅ Local test.json file loaded successfully");
            return localData;
        }
    }
    catch (error) {
        console.error("Local test.json file loading failed:", error);
    }
    return null;
}
function createSampleData() {
    return {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[
                            [-123.0249569, 49.2407190],
                            [-123.0241582, 49.2407165],
                            [-123.0240445, 49.2406847],
                            [-123.0239311, 49.2407159],
                            [-123.0238530, 49.2407157],
                            [-123.0238536, 49.2404548],
                            [-123.0249568, 49.2404582],
                            [-123.0249569, 49.2407190]
                        ]]
                },
                "properties": {
                    "valuePerSqm": 4563,
                    "growth": 0.3592
                }
            },
            {
                "type": "Feature",
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[
                            [-123.0713722, 49.2720583],
                            [-123.0697150, 49.2720458],
                            [-123.0697259, 49.2715034],
                            [-123.0713824, 49.2715159],
                            [-123.0713722, 49.2720583]
                        ]]
                },
                "properties": {
                    "valuePerSqm": 2270,
                    "growth": 0.2653
                }
            }
        ]
    };
}
function CreateMeshCreateInfo(_feature) {
    const rVal = new CMeshCreateInfo();
    const posb = rVal.Create(CVertexFormat.eIdentifier.Position);
    const uvb = rVal.Create(CVertexFormat.eIdentifier.UV);
    const norb = rVal.Create(CVertexFormat.eIdentifier.Normal);
    const outerRing = _feature.geometry.coordinates[0];
    const n = outerRing.length;
    const maxHeight = 1000;
    const topStartIndex = posb.bufF.Size(3);
    for (let i = 0; i < n; i++) {
        const [lon, lat] = outerRing[i];
        const pos = LonLatToWebMercator(lon, lat);
        posb.bufF.Push(new CVec3(pos.x, _feature.properties.growth * maxHeight, pos.y));
        uvb.bufF.Push(new CVec2(i / (n - 1), 1));
        norb.bufF.Push(new CVec3(0, 1, 0));
    }
    for (let i = 1; i < n - 1; i++) {
        rVal.index.push(topStartIndex, topStartIndex + i, topStartIndex + i + 1);
    }
    const sideStartIndex = posb.bufF.Size(3);
    for (let i = 0; i < n; i++) {
        const [lon, lat] = outerRing[i];
        const pos = LonLatToWebMercator(lon, lat);
        posb.bufF.Push(new CVec3(pos.x, 0, pos.y));
        uvb.bufF.Push(new CVec2(0, 0));
        norb.bufF.Push(new CVec3(0, 0, 0));
        posb.bufF.Push(new CVec3(pos.x, _feature.properties.growth * maxHeight, pos.y));
        uvb.bufF.Push(new CVec2(1, 1));
        norb.bufF.Push(new CVec3(0, 0, 0));
    }
    for (let i = 0; i < n - 1; i++) {
        const h0 = sideStartIndex + i * 2;
        const h1 = h0 + 1;
        const h2 = h0 + 2;
        const h3 = h2 + 1;
        rVal.index.push(h0, h2, h1);
        rVal.index.push(h1, h2, h3);
        const ax = posb.bufF.X1(h2 * 3) - posb.bufF.X1(h0 * 3);
        const ay = posb.bufF.X1(h2 * 3 + 1) - posb.bufF.X1(h0 * 3 + 1);
        const az = posb.bufF.X1(h2 * 3 + 2) - posb.bufF.X1(h0 * 3 + 2);
        const bx = posb.bufF.X1(h1 * 3) - posb.bufF.X1(h0 * 3);
        const by = posb.bufF.X1(h1 * 3 + 1) - posb.bufF.X1(h0 * 3 + 1);
        const bz = posb.bufF.X1(h1 * 3 + 2) - posb.bufF.X1(h0 * 3 + 2);
        const nx = ay * bz - az * by;
        const ny = az * bx - ax * bz;
        const nz = ax * by - ay * bx;
        norb.bufF.V3(h0, new CVec3(nx, ny, nz));
        norb.bufF.V3(h1, new CVec3(nx, ny, nz));
        norb.bufF.V3(h2, new CVec3(nx, ny, nz));
        norb.bufF.V3(h3, new CVec3(nx, ny, nz));
    }
    rVal.vertexCount = posb.bufF.Size(3);
    rVal.indexCount = rVal.index.length;
    return rVal;
}
function AddMeshCreateInfo(_feature, _originalMesh) {
    const rVal = _originalMesh;
    const posb = rVal.GetVFType(CVertexFormat.eIdentifier.Position)[0];
    const uvb = rVal.GetVFType(CVertexFormat.eIdentifier.UV)[0];
    const norb = rVal.GetVFType(CVertexFormat.eIdentifier.Normal)[0];
    const colb = rVal.GetVFType(CVertexFormat.eIdentifier.Color)[0];
    const outerRing = _feature.geometry.coordinates[0];
    const n = outerRing.length;
    const growth = _feature.properties?.growth || Math.random() * 0.5;
    const col = GrowthToColor(growth);
    const maxHeight = 1000;
    const topStartIndex = posb.bufF.Size(3);
    for (let i = 0; i < n; i++) {
        const [lon, lat] = outerRing[i];
        const pos = LonLatToWebMercator(lon, lat);
        posb.bufF.Push(new CVec3(pos.x, growth * maxHeight, pos.y));
        uvb.bufF.Push(new CVec2(i / (n - 1), 1));
        norb.bufF.Push(new CVec3(0, 1, 0));
        colb.bufF.Push(col);
    }
    for (let i = 1; i < n - 1; i++) {
        rVal.index.push(topStartIndex, topStartIndex + i, topStartIndex + i + 1);
    }
    const sideStartIndex = posb.bufF.Size(3);
    for (let i = 0; i < n; i++) {
        const [lon, lat] = outerRing[i];
        const pos = LonLatToWebMercator(lon, lat);
        posb.bufF.Push(new CVec3(pos.x, 0, pos.y));
        uvb.bufF.Push(new CVec2(0, 0));
        norb.bufF.Push(new CVec3(0, 0, 0));
        colb.bufF.Push(col);
        posb.bufF.Push(new CVec3(pos.x, growth * maxHeight, pos.y));
        uvb.bufF.Push(new CVec2(1, 1));
        norb.bufF.Push(new CVec3(0, 0, 0));
        colb.bufF.Push(col);
    }
    for (let i = 0; i < n - 1; i++) {
        const h0 = sideStartIndex + i * 2;
        const h1 = h0 + 1;
        const h2 = h0 + 2;
        const h3 = h2 + 1;
        rVal.index.push(h0, h2, h1);
        rVal.index.push(h1, h2, h3);
        const ax = posb.bufF.X1(h2 * 3) - posb.bufF.X1(h0 * 3);
        const ay = posb.bufF.X1(h2 * 3 + 1) - posb.bufF.X1(h0 * 3 + 1);
        const az = posb.bufF.X1(h2 * 3 + 2) - posb.bufF.X1(h0 * 3 + 2);
        const bx = posb.bufF.X1(h1 * 3) - posb.bufF.X1(h0 * 3);
        const by = posb.bufF.X1(h1 * 3 + 1) - posb.bufF.X1(h0 * 3 + 1);
        const bz = posb.bufF.X1(h1 * 3 + 2) - posb.bufF.X1(h0 * 3 + 2);
        const nx = ay * bz - az * by;
        const ny = az * bx - ax * bz;
        const nz = ax * by - ay * bx;
        norb.bufF.V3(h0, new CVec3(nx, ny, nz));
        norb.bufF.V3(h1, new CVec3(nx, ny, nz));
        norb.bufF.V3(h2, new CVec3(nx, ny, nz));
        norb.bufF.V3(h3, new CVec3(nx, ny, nz));
    }
    rVal.vertexCount = posb.bufF.Size(3);
    rVal.indexCount = rVal.index.length;
    return rVal;
}
function extractPolygonsFromGeoJSON(geoJson) {
    const polygons = [];
    if (geoJson.type === "Feature") {
        polygons.push(...splitFeatureToPolygons(geoJson));
    }
    else if (geoJson.type === "FeatureCollection" && Array.isArray(geoJson.features)) {
        geoJson.features.forEach((f) => {
            polygons.push(...splitFeatureToPolygons(f));
        });
    }
    else {
        console.warn("Unsupported GeoJSON type:", geoJson.type);
    }
    return polygons;
}
function splitFeatureToPolygons(feature) {
    const result = [];
    if (feature.geometry.type === "Polygon") {
        result.push(feature);
    }
    else if (feature.geometry.type === "MultiPolygon") {
        const coordsArray = feature.geometry.coordinates;
        coordsArray.forEach((coords) => {
            result.push({
                type: "Feature",
                properties: { ...feature.properties },
                geometry: {
                    type: "Polygon",
                    coordinates: coords,
                },
            });
        });
    }
    return result;
}
function GrowthToColor(_value) {
    const v = Math.max(0, Math.min(1, _value));
    const r = v;
    const g = 0;
    const b = 1 - v;
    return new CVec3(r, g, b);
}
let geoJsonData, polygonArr;
try {
    geoJsonData = await loadGeoJSONData();
    polygonArr = extractPolygonsFromGeoJSON(geoJsonData);
    console.log(`✅ Total ${polygonArr.length} polygons loaded successfully`);
}
catch (error) {
    console.error("GeoJSON data loading failed:", error);
    polygonArr = [];
}
if (polygonArr.length === 0) {
    console.warn("No polygons to process.");
}
else {
    const obj = new CSubject();
    Can3D.Push(obj);
    const createInfo = new CMeshCreateInfo();
    createInfo.Create(CVertexFormat.eIdentifier.Position);
    createInfo.Create(CVertexFormat.eIdentifier.UV);
    createInfo.Create(CVertexFormat.eIdentifier.Normal);
    createInfo.Create(CVertexFormat.eIdentifier.Color);
    for (const polygon of polygonArr) {
        AddMeshCreateInfo(polygon, createInfo);
    }
    const mesh = CUtilRender.CMeshCreateInfoToCMesh(createInfo, gAtl.Frame().Pal().GetBlackTex());
    gAtl.Frame().Res().Push("polygon", mesh);
    const pt = new CPaint3D("polygon");
    pt.PushRenderPass(new CRenderPass("Pre3Test"));
    obj.PushComp(pt);
}
new CModalFrameView();
