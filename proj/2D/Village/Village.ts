//Version
const version='2025-07-27 02:41:42';
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
gPF.mServer = 'local';

import {CAtelier} from "../../../artgine/canvas/CAtelier.js";

import {CPluging} from "../../../artgine/util/CPluging.js";
CPluging.PushPath('ShadowPlane','../../../plugin/ShadowPlane/');
import "../../../plugin/ShadowPlane/ShadowPlane.js"
var gAtl = new CAtelier();
gAtl.mPF = gPF;
await gAtl.Init(['Main.json','Real.json']);
var Main = gAtl.Canvas('Main.json');
var Real = gAtl.Canvas('Real.json');

//EntryPoint
import {CObject} from "../../../artgine/basic/CObject.js"

// === vinfo==3 위치에 랜덤 조형물 배치 (Village) ===
import { CCIndex } from "../../../artgine/canvas/CCIndex.js";
import { CVec3 } from "../../../artgine/geometry/CVec3.js";
import { CSubject } from "../../../artgine/canvas/subject/CSubject.js";
import { CBlackBoard } from "../../../artgine/basic/CBlackBoard.js";
import { CPaint } from "../../../artgine/canvas/component/paint/CPaint.js";

// === Maze 방식: vinfo==3 위치에 CSubject + 랜덤 조형물 배치 (블랙보드에서 직접 가져오기) ===
{
    const backVoxel = Main.Find("BackGround") as any;
    if (backVoxel) {
        const decoNames = ["LTree", "MTree", "Flower1", "Flower2"];
        // 블랙보드에서 직접 가져오기
        const decoObjs = decoNames.map(name => CBlackBoard.Get(name)).filter(obj => obj && obj.Export);

        const width = backVoxel.mCount?.x || 0;
        const height = backVoxel.mCount?.y || 0;
        const tileSize = backVoxel.mSize || 200;

        const placed = new Set<string>();
        const minDist = 2; // 최소 거리(칸 단위)
        const placeProb = 0.1; // 10% 확률

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = new CCIndex(x, y, 0);
                const vinfo = backVoxel.GetVInfo ? backVoxel.GetVInfo(idx) : 0;
                if (vinfo === 3 && Math.random() < placeProb) {
                    // 주변에 이미 배치된 조형물이 있는지 체크
                    let overlap = false;
                    for (let dy = -minDist; dy <= minDist; dy++) {
                        for (let dx = -minDist; dx <= minDist; dx++) {
                            if (dx === 0 && dy === 0) continue;
                            const key = (x + dx) + ',' + (y + dy);
                            if (placed.has(key)) {
                                overlap = true;
                                break;
                            }
                        }
                        if (overlap) break;
                    }
                    if (overlap) continue;

                    // 배치
                    const deco = decoObjs[Math.floor(Math.random() * decoObjs.length)];
                    if (deco) {
                        const obj = deco.Export() as CSubject;
                        obj.SetPos(new CVec3(x * tileSize, y * tileSize, 0));
                        
                        Real.Push(obj);
                        placed.add(x + ',' + y);
                    }
                }
            }
        }
    }
}
// // === 길(vinfo==2) 근처에 House/Shop 랜덤 배치 (실제 바운딩 박스 기반, 겹침 완전 방지, 길 침범 방지) ===
// {
//     const backVoxel = Main.Find("BackGround") as any;
//     if (backVoxel) {
//         const decoNames = ["House1", "House2", "Shop1", "Shop2"];
//         const decoObjs = decoNames.map(name => CBlackBoard.Get(name)).filter(obj => obj && obj.Export);
//         console.log("decoObjs", decoObjs, "길 근처 집 배치 시작");

//         const width = backVoxel.mCount?.x || 0;
//         const height = backVoxel.mCount?.y || 0;
//         const tileSize = backVoxel.mSize || 200;

//         const placedAABBs = [];
//         const placeProb = 0.2; // 듬성듬성 (20%)
//         const tryCount = 2000; // 충분히 시도
//         let placedCount = 0;

//         for (let i = 0; i < tryCount; i++) {
//             // 랜덤 위치, 랜덤 프리팹
//             const x = Math.floor(Math.random() * width);
//             const y = Math.floor(Math.random() * height);
//             const decoIdx = Math.floor(Math.random() * decoObjs.length);
//             const deco = decoObjs[decoIdx];
//             const name = decoNames[decoIdx];
//             if (!deco) continue;
//             if (Math.random() >= placeProb) continue;

//             // 중심 좌표가 땅(vinfo==3)이고, 8방향 중 하나라도 길(vinfo==2)이면 길 근처로 간주
//             const idx = new CCIndex(x, y, 0);
//             const vinfo = backVoxel.GetVInfo ? backVoxel.GetVInfo(idx) : 0;
//             if (vinfo !== 3) continue;
//             let nearRoad = false;
//             for (let dy = -1; dy <= 1; dy++) {
//                 for (let dx = -1; dx <= 1; dx++) {
//                     if (dx === 0 && dy === 0) continue;
//                     const nx = x + dx;
//                     const ny = y + dy;
//                     if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
//                     const nidx = new CCIndex(nx, ny, 0);
//                     const nvinfo = backVoxel.GetVInfo ? backVoxel.GetVInfo(nidx) : 0;
//                     if (nvinfo === 2) {
//                         nearRoad = true;
//                         break;
//                     }
//                 }
//                 if (nearRoad) break;
//             }
//             if (!nearRoad) continue;

//             // 프리팹 Export 후, 실제 바운딩 박스(min, max) 구하기
//             const obj = deco.Export() as CSubject;
//             (obj as any).name = name;
//             // SetPos 이전 바운딩 박스
//             const paint = obj.FindComp && obj.FindComp(CPaint);
//             if (!paint || !paint.GetBoundFMat) continue;
//             const boundBefore = paint.GetBoundFMat();
//             // SetPos
//             obj.SetPos(new CVec3(x * tileSize, y * tileSize, 0));
//             // SetPos 이후 바운딩 박스
//             const bound = paint.GetBoundFMat(); // {mMin: {x,y}, mMax: {x,y}}
//             if (!bound || !bound.mMin || !bound.mMax) continue;

//             // 바운딩 박스를 타일 인덱스 범위로 변환
//             const minTileX = Math.floor(bound.mMin.x / tileSize);
//             const minTileY = Math.floor(bound.mMin.y / tileSize);
//             const maxTileX = Math.floor(bound.mMax.x / tileSize);
//             const maxTileY = Math.floor(bound.mMax.y / tileSize);

//             // 진단 로그
//             console.log('배치 후보:', name, 'x,y:', x, y, 'SetPos:', x * tileSize, y * tileSize, '\nboundBefore:', boundBefore?.mMin, boundBefore?.mMax, '\nboundAfter:', bound.mMin, bound.mMax, '\ntileIdx:', minTileX, minTileY, maxTileX, maxTileY);

//             // 바운딩 박스가 이미 배치된 집/상점과 겹치면 배치 금지 (AABB 충돌 체크)
//             let overlap = false;
//             for (const aabb of placedAABBs) {
//                 if (!(maxTileX < aabb.minX || minTileX > aabb.maxX || maxTileY < aabb.minY || minTileY > aabb.maxY)) {
//                     overlap = true;
//                     break;
//                 }
//             }
//             if (overlap) continue;

//             // 배치
//             Real.Push(obj);
//             placedAABBs.push({ minX: minTileX, minY: minTileY, maxX: maxTileX, maxY: maxTileY });
//             placedCount++;
//             // console.log("배치됨", x, y, name, minTileX, minTileY, maxTileX, maxTileY);
//         }
//         console.log("최종 배치된 집/상점 수:", placedCount);
//     }
// }
// /*
// 복셀에서 vinfo 2번이 길정보야.
// 길  근처에 House1,House2,Shop1,Shop2 를 배치해주는데, 
// 랜덤하게 듬성듬성 배치해줘. 
// 길을 막으면 안돼.
// 서로 겹쳐도 안돼.

// obj.FindComp(CPaint).GetBoundFMat() 이걸로 페인트에 크기를 구할수 있어.
// 월드 포지션 min,max값이야. 

// 다시 작업해줘

// */