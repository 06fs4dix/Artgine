# Artgine UI 시스템 가이드

> 소스 기준: `artgine/app/subject/CUI.ts`, `artgine/app/component/paint/CPaint2D.ts`, `artgine/util/CFont.ts`

---

## 1. UI 렌더링 공통 설정

모든 CUI 클래스는 내부적으로 `gUIRP` 렌더패스를 공유한다.

```typescript
// CUI.ts 내부 (수정 불가)
var gUIRP = new CRenderPass();
gUIRP.mPriority  = CRenderPass.ePriority.Ui; // UI 우선순위 레이어
gUIRP.mDepthTest  = false;  // 깊이 테스트 없음 → 항상 위에 그려짐
gUIRP.mDepthWrite = false;  // 깊이 버퍼 기록 안 함
```

**Z-order 결정 방식 (CUI 끼리):**
- 우선순위 계산: `RenderPass.mPriority + GetFMat().z`
- 같은 우선순위면 `pos.z` 값이 높을수록 위에 표시
- SetPos의 z값으로 조정: `new CVec3(x, y, 0.9)` → 더 위에

---

## 2. CUI 클래스 전체 목록

| 클래스 | 용도 | 렌더링 방식 |
|--------|------|------------|
| **CUIText** | 텍스트 표시 | 텍스처 베이킹 (WebGL) |
| **CUIPicture** | 이미지 표시 | WebGL 스프라이트 |
| **CUIButtonImg** | 이미지 버튼 (Normal/Over/Press) | WebGL 스프라이트 |
| **CUIButtonRGBA** | 색상 버튼 (RGBA 변화) | WebGL 스프라이트 |
| **CUIProgressBar** | 진행 바 (HP/경험치 등) | WebGL 스프라이트 x2 |
| **CUIHTML** | HTML DOM 요소 | DOM 오버레이 |

---

## 3. 방식별 상세

---

### 3-1. CUIText — 텍스처 베이킹 방식

**렌더링 원리:**
1. `CFontOption` 설정으로 HTML5 Canvas 2D API에서 텍스트를 그림
2. 그 Canvas를 WebGL 텍스처로 변환 (캐싱됨)
3. CPaint2D가 해당 텍스처를 WebGL로 출력

**흐림 원인:** 텍스처 해상도(폰트 크기 기준)와 실제 화면 출력 크기가 불일치하면 흐릿하게 보임

**사용법:**
```typescript
import { CUIText } from "../../../artgine/app/subject/CUI.js";
import { CFontOption } from "../../../artgine/util/CFont.js";
import { CVec3 } from "../../../artgine/geometry/CVec3.js";

let txt = new CUIText();
let font = new CFontOption(
    32,        // mSize: 폰트 크기 (클수록 선명, 권장 최소 24)
    'white',   // mFillStyle: 글자 색
    'black',   // mStrokeStyle: 테두리 색
    2          // mLineWidth: 테두리 굵기 (0이면 테두리 없음)
);
// font.mExp = true;  // 기본값 true — 텍스처 확장, 선명도에 영향
txt.SetPos(new CVec3(0, 300, 0.5));
txt.Init("SCORE: 0", font);
canvas.PushSub(txt);

// 텍스트 갱신
txt.mText   = "SCORE: 100";
txt.mUpdate = true;  // 반드시 true로 — 다음 프레임에 텍스처 재생성
```

**CFontOption 전체 프로퍼티:**
```typescript
mSize      : number   // 폰트 크기 (px 기준 Canvas 2D)
mExp       : boolean  // true = 텍스처 확장 (기본값 true)
mMaxX      : number   // 텍스처 최대 너비 (기본 100000)
mMaxY      : number   // 텍스처 최대 높이 (기본 100000)
mFillStyle : string   // 글자 색 ('white', '#fff', 'rgba(...)' 등)
mStrokeStyle: string  // 테두리 색
mLineWidth : number   // 테두리 굵기 (0 = 테두리 없음)
mLineCap   : string   // 선 끝 모양 ('round' 기본)
mLineJoin  : string   // 선 연결 모양 ('round' 기본)
```

**앵커(화면 고정) 사용법:**
```typescript
import { CUI } from "../../../artgine/app/subject/CUI.js";

txt.SetAnchorX(CUI.eAnchor.Min, 20);   // 왼쪽에서 20px
txt.SetAnchorX(CUI.eAnchor.Max, 20);   // 오른쪽에서 20px
txt.SetAnchorX(CUI.eAnchor.Center, 0); // 가운데
txt.SetAnchorY(CUI.eAnchor.Max, 20);   // 위쪽에서 20px
txt.SetAnchorY(CUI.eAnchor.Min, 20);   // 아래쪽에서 20px
// eAnchor.Null = 앵커 없음 (기본값, 수동 SetPos 사용)
```

---

### 3-2. CUIHTML + CPaintHTML — DOM 오버레이 방식

**렌더링 원리:**
1. 주어진 HTML 문자열/DOM을 `CDOM.DataToDom()`으로 파싱
2. CPaintHTML이 WebGL Canvas 위 `position: absolute` div에 붙임
3. 매 프레임 World 좌표 → ViewMat × ProjMat → 화면 pixel 좌표로 변환
4. `element.style.left`, `element.style.top`, `element.style.transform`으로 배치

**Z-index:** WebGL Canvas 위에 DOM으로 올라가므로 WebGL 오브젝트보다 **항상 위**에 표시됨  
CSS `z-index`는 코드상 별도 설정 없음 (필요시 Init 후 element에 직접 설정)

**장점:** 브라우저 네이티브 텍스트 렌더링 → **항상 선명**, CSS 자유롭게 사용 가능

**단점:** DOM 조작이므로 `mText + mUpdate` 패턴 사용 불가 → DOM element 직접 수정 필요

**사용법:**
```typescript
import { CUIHTML } from "../../../artgine/app/subject/CUI.js";
import { CVec2 } from "../../../artgine/geometry/CVec2.js";
import { CVec3 } from "../../../artgine/geometry/CVec3.js";

// HTML 문자열로 생성
let ui = new CUIHTML();
ui.Init(
    `<div style="color:white; font-size:28px; font-weight:bold;
                 text-shadow: 2px 2px 0 black; white-space:nowrap">
        SCORE: 0
     </div>`,
    null   // size: null이면 element 자체 크기, CVec2로 지정 가능
);
ui.SetPos(new CVec3(-280, 365, 0));
canvas.PushSub(ui);

// 텍스트 갱신 — DOM element 직접 접근
let el = (ui.mUIPT as CPaintHTML).GetElement();
el.textContent = "SCORE: 100";
// 또는
el.querySelector("div").textContent = "SCORE: 100";
```

**CPaintHTML GetElement()로 DOM 직접 접근:**
```typescript
import { CPaintHTML } from "../../../artgine/app/component/paint/CPaint2D.js";

let el = (ui.mUIPT as CPaintHTML).GetElement();
el.style.color = "red";
el.innerHTML   = "<b>GAME OVER</b>";
el.hidden      = true;   // SetEnable(false)와 동일 효과
```

**주의사항:**
- Init 호출 시 mAttach=false → Start() 이후 첫 Update에서 DOM에 붙음
- Destroy() 호출 시 DOM element도 자동 remove()됨
- 좌표 변환이 카메라 행렬 기반 → 카메라가 움직이면 같이 따라감

---

### 3-3. CUIProgressBar — 2개 스프라이트 방식

**렌더링 원리:**
- 전면(mUIPT): 현재 값 비율에 따라 크기 변경
- 배경(mPTBack): z=-0.1 오프셋으로 항상 뒤에
- 텍스처 지정 없으면 palette의 black texture 사용

**사용법:**
```typescript
import { CUIProgressBar } from "../../../artgine/app/subject/CUI.js";
import { CVec2 } from "../../../artgine/geometry/CVec2.js";
import { CVec3 } from "../../../artgine/geometry/CVec3.js";
import { CVec4 } from "../../../artgine/geometry/CVec4.js";

let bar = new CUIProgressBar();
bar.Init(
    5,              // max
    5,              // 초기값
    new CVec2(120, 12),  // 크기 (width, height)
    null,           // 전면 텍스처 경로 (null=검정)
    null            // 배경 텍스처 경로 (null=검정)
);
// 색상 변경: SetRGBA로 전면 색 지정
bar.SetRGBA(new CVec4(1, 0, 0, 0));  // (R,G,B 가산, Alpha)
bar.SetPos(new CVec3(-250, 342, 0.5));
canvas.PushSub(bar);

// 값 업데이트 (0 ~ max 사이)
bar.SetBarVal(3);

// 최대값 변경
bar.SetBarMax(10);
```

---

### 3-4. CUIPicture — 이미지 표시

```typescript
import { CUIPicture } from "../../../artgine/app/subject/CUI.js";

let pic = new CUIPicture();
pic.Init("Res/icon.png");
pic.SetSize(100, 100);  // CUI.SetSize(w, h)
pic.SetPos(new CVec3(0, 0, 0.5));
canvas.PushSub(pic);
```

---

### 3-5. CUIButtonImg / CUIButtonRGBA — 버튼

```typescript
import { CUIButtonImg, CUIButtonRGBA } from "../../../artgine/app/subject/CUI.js";
import { CEvent } from "../../../artgine/basic/CEvent.js";

// 이미지 버튼
let btn = new CUIButtonImg();
btn.Init("Res/btn_normal.png", "Res/btn_over.png", "Res/btn_press.png");
btn.SetClickEvent(() => { console.log("clicked"); });

// RGBA 버튼 (같은 이미지, 색상만 변화)
let btn2 = new CUIButtonRGBA();
btn2.Init("Res/btn.png"); // over/press 색상은 기본값 사용

// 이벤트 감지 (직접 체크)
if (btn.GetLastEvent() === CEvent.eType.Click) { /* 클릭 */ }
```

---

## 4. 방식 선택 기준

| 상황 | 추천 방식 | 이유 |
|------|----------|------|
| 게임 HUD 텍스트 (점수, 웨이브) — **선명도 중요** | **CUIHTML** | 브라우저 네이티브 렌더링, 항상 선명 |
| 게임 HUD 텍스트 — 단순, 성능 우선 | **CUIText** (폰트 크기 ≥32) | 간단하지만 흐릴 수 있음 |
| HP/스태미나/진행 바 | **CUIProgressBar** | SetBarVal 하나로 동적 업데이트 |
| 아이콘/이미지 표시 | **CUIPicture** | 텍스처 직접 표시 |
| 버튼 (클릭 이벤트) | **CUIButtonImg** / **CUIButtonRGBA** | 마우스 이벤트 내장 |
| 메뉴/설정/팝업 UI | **CUIHTML** | HTML+CSS로 복잡한 레이아웃 |
| 3D 공간에 고정된 UI (네임태그 등) | **CUIHTML** | 카메라 행렬로 3D 위치 추적 |

---

## 5. CUIText 선명도 개선 팁

CUIText를 써야 하는 상황에서 흐림을 줄이려면:

```typescript
// 1. 폰트 크기 크게 (최소 32, 권장 48 이상)
let font = new CFontOption(48, 'white', 'black', 2);

// 2. mExp는 기본 true — 건드리지 않아도 됨

// 3. SetPos z값 정수로 — 소수점 렌더링 방지
txt.SetPos(new CVec3(-280, 365, 1));

// 4. 카메라 사이즈와 캔버스 해상도 일치시키기
gAtl.Brush().GetCam2D().SetSize(600, 800); // mTargetWidth/Height와 같게
```

---

## 6. import 경로 참고

```typescript
// UI 클래스들
import { CUI, CUIText, CUIPicture, CUIButtonImg, CUIButtonRGBA, CUIProgressBar, CUIHTML }
    from "../../../artgine/app/subject/CUI.js";

// CPaintHTML (CUIHTML 내부 element 접근 시)
import { CPaintHTML } from "../../../artgine/app/component/paint/CPaint2D.js";

// 폰트 옵션
import { CFontOption } from "../../../artgine/util/CFont.js";
```
