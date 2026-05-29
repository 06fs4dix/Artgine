# Artgine 프로젝트 셋업 가이드
> 2D · 3D 통합 / 최종 업데이트: 2026-04-19

---

## 핵심 규칙
- **HTML · ServiceWorker.js · webmanifest** 는 Artgine 앱이 자동 생성 → AI이용 수동작업 제외
- **`Canvas/*.json`** 은 Artgine 앱에서 씬 저장 시 자동 생성 → 코드에서 없는 파일 참조 금지

---

## 폴더 구조
```
proj/
├── 2D/[Name]/
│   ├── [Name].ts          ← 메인 로직 (수정 대상)
│   ├── [Name].js          ← 자동 생성 (수정 금지)
│   ├── [Name].html        ← 자동 생성
│   ├── [Name].json        ← 프로젝트 설정
│   ├── [Name].webmanifest ← 자동 생성
│   ├── ServiceWorker.js   ← 자동 생성
│   ├── Canvas/            ← 씬 파일 (앱에서 저장 시 생성)
│   └── Res/               ← 스프라이트 등 리소스
└── 3D/[Name]/             ← 동일 구조
```

---

## TS 파일 구조
Artgine 앱이 헤더(버전~gAtl.Init)를 자동 관리. **EntryPoint 이후만 작성**.

### 2D 기본 (로컬 서버, 새 씬)
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

### 3D 기본 (로컬 서버, 새 씬)
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

## 2D vs 3D 핵심 차이

| 항목 | 2D | 3D |
|------|----|----|
| 카메라 | `Main.SetCameraKey("2D")` | `Main.SetCameraKey("3D")` |
| 카메라 컨트롤 | `CCamCon2DFollow` | `CCamCon3DFirstPerson` |

---

## JSON 설정 파일

```json
{"preference":{"mTargetWidth":0,"mTargetHeight":0,"mRenderer":"GL","m32fDepth":false,"mTexture16f":false,"mAnti":true,"mBatchPool":true,"mXR":false,"mDeveloper":true,"mIAuto":true,"mWASM":true,"mCanvas":""},"pluging":[],"includes":{"pakozlib":true,"jszip":true,"screenfull":true,"popper":true,"bootstrap":true,"MonacoEditor":true}}
```

---

## ⚠️ Canvas 404 에러 (자주 발생)

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

## 추가 클래스 등록 (헤더 영역)
```typescript
import { MyClass } from "./MyClass.js";
CClass.Push(MyClass);
```

## 플러그인 등록 (헤더 영역)
```typescript
CPlugin.PushPath('ShadowPlane','../../../plugin/ShadowPlane/');
import "../../../plugin/ShadowPlane/ShadowPlane.js"
// 사용 가능: ShadowPlane, Inventory, Water, Bloom
```

---

## 참고 예제 프로젝트

| 경로 | 특징 |
|------|------|
| `proj/Tutorial/Animation/` | 가장 단순한 2D, NewCanvas 방식 |
| `proj/2D/Village/` | 캐릭터·FSM·NPC·플러그인 완성 예제 |
| `proj/2D/CharGen/` | LPC 다중 레이어 캐릭터, 커스터마이징 시스템 |
| `proj/3D/BoxShow/` | 가장 단순한 3D, 1인칭 카메라 |
| `proj/3D/ModularVillage/` | 3D 모듈러 씬 |

---

## 2D 캐릭터 컴포넌트 구성
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

## FSM (CSMComp) 패턴
```typescript
sm.GetSM().PushPattern([
  {"and":[{"s":CVec3.eDir.Null,"o":"==","v":1}],"exe":[{"t":"Message","a":"StandDown"}]},
  {"and":[{"s":"move"+CVec3.eDir.Left,"o":"==","v":1}],"exe":[{"t":"Message","a":"MoveLeft"}]},
  {"and":[{"s":CVec3.eDir.Left,"o":"==","v":1},{"s":"move","o":"!=","v":1}],"exe":[{"t":"Message","a":"StandLeft"}]},
]);
// "a" 값 = 클래스 메서드 이름과 일치해야 함
```

## 이동 처리
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
