# Artgine 프로젝트 셋업 가이드 (Artgine Project Setup Guide)
> 2D · 3D 통합 / 최종 업데이트: 2026-06-22

---

## 핵심 규칙 (Core Rules)

### 자동 생성 vs 수동 생성 (Auto vs Manual)
| 파일 | 데스크탑 앱 | 웹 서버만 사용 | 비고 |
|------|------------|---------------|------|
| `[Name].ts` | 수동 작성 | 수동 작성 | 메인 로직 |
| `[Name].json` | 수동 작성 | 수동 작성 | 프로젝트 설정 |
| `[Name].js` | 자동 컴파일 | 자동 컴파일 | .ts 저장 시 생성 |
| `[Name].html` | 앱 실행 시 자동 생성 | **수동 생성 필요** | 기존 프로젝트 복사 후 경로 수정 |
| `[Name].webmanifest` | 앱 실행 시 자동 생성 | **수동 생성 필요** | 프로젝트명만 변경 |
| `ServiceWorker.js` | 앱 실행 시 자동 생성 | **수동 생성 필요** | 기존 프로젝트에서 복사 |
| `Canvas/*.json` | 씬 저장 시 자동 생성 | — | 코드에서 없는 파일 참조 금지 |

> **중요**: 데스크탑 앱(Electron)을 실행하지 않고 웹 서버만 사용하는 경우, **HTML·webmanifest·ServiceWorker.js** 3개 파일을 AI가 수동 생성해야 한다. 기존 프로젝트(예: `proj/3D/BoxShow/`)의 파일을 복사해 프로젝트명과 경로만 수정한다.

---

## 폴더 구조 (Folder Structure)
```
proj/
├── 2D/[Name]/
│   ├── [Name].ts          ← 메인 로직 (직접 작성)
│   ├── [Name].js          ← .ts 저장 시 자동 컴파일
│   ├── [Name].html        ← 앱 실행 시 생성 / 웹서버 전용은 수동 생성
│   ├── [Name].json        ← 프로젝트 설정 (직접 작성)
│   ├── [Name].webmanifest ← 앱 실행 시 생성 / 웹서버 전용은 수동 생성
│   ├── ServiceWorker.js   ← 앱 실행 시 생성 / 웹서버 전용은 수동 생성
│   ├── Canvas/            ← 씬 파일 (앱에서 저장 시 생성)
│   └── Res/               ← 스프라이트 등 리소스
└── 3D/[Name]/             ← 동일 구조
```

---

## 신규 프로젝트 생성 절차 (New Project Creation Procedure)

### 웹 서버 전용 (데스크탑 앱 미사용)
1. `proj/[2D or 3D]/[Name]/` 폴더 생성
2. `[Name].ts` 작성 (아래 TS 템플릿 참조)
3. `[Name].json` 작성 (아래 JSON 템플릿 참조)
4. **HTML·webmanifest·ServiceWorker.js** 3개 파일을 기존 프로젝트에서 복사:
   - HTML: `SERVER_BASE` URL의 프로젝트 경로를 새 프로젝트에 맞게 수정
   - webmanifest: `short_name`, `name`, `start_url` 수정
   - ServiceWorker.js: 그대로 복사 (CACHE_NAME은 자동 갱신됨)

### 데스크탑 앱 사용
1. `proj/[2D or 3D]/[Name]/` 폴더 생성
2. `[Name].ts` + `[Name].json` 작성
3. 앱에서 프로젝트 열기 → HTML·webmanifest·ServiceWorker.js 자동 생성

---

## TS 파일 구조 (TS File Structure)
Artgine 앱이 헤더(버전~gAtl.Init)를 자동 관리. **EntryPoint 이후만 작성**.

### 2D 기본 - 로컬 서버, 새 씬 (2D Basic - Local Server, New Scene)
```typescript
const version='[proj]_v1';
import "../../../artgine/artgine.js"
import {CClass} from "../../../artgine/basic/CClass.js";
// import { MyClass } from "./MyClass.js"; CClass.Push(MyClass);
import {CPreferences} from "../../../artgine/basic/CPreferences.js";
var gPF = new CPreferences();
gPF.mTargetWidth=0; gPF.mTargetHeight=0; gPF.mRenderer="GL";
gPF.m32fDepth=false; gPF.mTexture16f=false; gPF.mAnti=true;
gPF.mBatchPool=true; gPF.mXR=false; gPF.mDeveloper=true;
gPF.mIAuto=true; gPF.mWASM=false; gPF.mCanvas="";
gPF.mServer='local'; gPF.mGitHub=false;
import {CAtelier} from "../../../artgine/app/CAtelier.js";
import {CPlugin} from "../../../artgine/util/CPlugin.js";
var gAtl = new CAtelier();
gAtl.mPF = gPF;
await gAtl.Init([], "");
//The content above this line is automatically set by the program. Do not modify.⬆✋🚫⬆☠️💥🔥
//EntryPoint
import { CVec3 } from "../../../artgine/geometry/CVec3.js";
let Main = gAtl.NewCanvas("Main");
Main.SetCameraKey("2D");
```

### 3D 기본 - 로컬 서버, 새 씬 (3D Basic - Local Server, New Scene)
```typescript
// ...
await gAtl.Init([], "");
//The content above this line is automatically set by the program. Do not modify.⬆✋🚫⬆☠️💥🔥
//EntryPoint
import { CVec3 } from "../../../artgine/geometry/CVec3.js";
import { CCamCon3DFirstPerson } from "../../../artgine/util/CCamCon.js";
let Main = gAtl.NewCanvas("Main");
Main.SetCameraKey("3D");
Main.GetCam().SetCamCon(new CCamCon3DFirstPerson(gAtl.Frame().Input()));
```

---

## 2D vs 3D 핵심 차이 (Key Differences between 2D and 3D)

| 항목 | 2D | 3D |
|------|----|----|
| 카메라 | `Main.SetCameraKey("2D")` | `Main.SetCameraKey("3D")` |
| 카메라 컨트롤 | `CCamCon2DFollow` | `CCamCon3DFirstPerson` |

---

## JSON 설정 파일 (JSON Configuration File)

```json
{"preference":{"mTargetWidth":0,"mTargetHeight":0,"mRenderer":"GL","m32fDepth":false,"mTexture16f":false,"mAnti":true,"mBatchPool":true,"mXR":false,"mDeveloper":true,"mIAuto":true,"mWASM":true,"mCanvas":""},"pluging":[],"includes":{"pakozlib":true,"jszip":true,"screenfull":true,"popper":true,"bootstrap":true,"MonacoEditor":true}}
```

---

## ⚠️ Canvas 404 에러 (자주 발생) (Canvas 404 Error - Frequently Occurs)

```typescript
// ❌ 없는 씬 파일 참조 → 404
await gAtl.Init(['Main.json','Real.json'], "");
var Main = gAtl.Canvas('Main.json');

// ✅ 코드로 직접 생성 (새 프로젝트 시작 시)
await gAtl.Init([], "");
let Main = gAtl.NewCanvas("Main");
Main.SetCameraKey("2D"); // 또는 "3D"
```

---

## 추가 클래스 등록 - 헤더 영역 (Register Additional Classes - Header Area)
```typescript
import { MyClass } from "./MyClass.js";
CClass.Push(MyClass);
```

## 플러그인 등록 - 헤더 영역 (Register Plugins - Header Area)
```typescript
CPlugin.PushPath('ShadowPlane','../../../plugin/ShadowPlane/');
import "../../../plugin/ShadowPlane/ShadowPlane.js"
// 사용 가능: ShadowPlane, Inventory, Water, Bloom
```

---

## 참고 예제 프로젝트 (Reference Example Projects)

| 경로 | 특징 |
|------|------|
| `proj/Tutorial/Animation/` | 가장 단순한 2D, NewCanvas 방식 |
| `proj/2D/Village/` | 캐릭터·FSM·NPC·플러그인 완성 예제 |
| `proj/2D/CharGen/` | LPC 다중 레이어 캐릭터, 커스터마이징 시스템 |
| `proj/3D/BoxShow/` | 가장 단순한 3D, 1인칭 카메라 |
| `proj/AI/Box3D/` | 최소 3D (박스 하나), 웹서버 전용 생성 예시 |
| `proj/3D/ModularVillage/` | 3D 모듈러 씬 |

---

## 2D 캐릭터 컴포넌트 구성 (2D Character Component Configuration)
```typescript
// CSubject 상속 후 Start()에서 조립
this.mPT = this.PushComp(new CPaint2D("Res/sprite.png", new CVec2(100,100)));
this.mPT.mAutoLoad.mFilter = CTexture.eFilter.Neaest; // 픽셀아트
this.mPT.SetYSort(true);
this.mRB = this.PushComp(new CRigidBody());
this.mCL = this.PushComp(new CCollider(this.mPT));
this.mCL.SetLayer("player");
this.PushComp(new CShadowPlane());
this.mAF = this.PushComp(new CAniFlow(ani));
```

## FSM (CSMComp) 패턴 (FSM - CSMComp Pattern)
```typescript
sm.GetSM().PushPattern([
  {"and":[{"s":CVec3.eDir.Null,"o":"==","v":1}],"exe":[{"t":"Message","a":"StandDown"}]},
  {"and":[{"s":"move"+CVec3.eDir.Left,"o":"==","v":1}],"exe":[{"t":"Message","a":"MoveLeft"}]},
  {"and":[{"s":CVec3.eDir.Left,"o":"==","v":1},{"s":"move","o":"!=","v":1}],"exe":[{"t":"Message","a":"StandLeft"}]},
]);
// "a" 값 = 클래스 메서드 이름과 일치해야 함
```

## 이동 처리 (Movement Handling)
```typescript
override Update(_update: CUpdate): void {
  super.Update(_update);
  if (!this.FindChild(CPad)) return;
  const dir = this.FindChild(CPad).GetDir();
  if (!dir.IsZero()) { this.mRB.Push(new CForce("move", dir, 400)); }
  else { this.mRB.Remove("move"); this.mBDir.Zero(); }
}
// 사용: character.PushChild(new CPad()).mSave = false;
```
