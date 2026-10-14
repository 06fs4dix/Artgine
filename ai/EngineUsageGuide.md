# 엔진 사용 가이드 (Engine Usage Guide)

> 이 문서는 **"엔진이 의도한 사용 흐름"** 과 **탐색 위치**를 알려준다. 시그니처/세부 옵션은 여전히 코드에서 직접 확인한다.
> 경로는 아티젠 디렉토리 기준. 라인 번호는 조사 시점(2026-09) 기준이라 어긋나면 키워드로 재검색.

## 0. 사용 규칙 (필독)
1. 구현 전, 아래 표/섹션에서 해당 패턴을 찾아 **흐름 → 탐색 위치 → 샘플** 순으로 확인한다. 동일/유사 기능이 있으면 조합해서 쓰고, 없을 때만 직접 구현한다.
2. **`*_imple` / `*_impl` 폴더도 반드시 검색한다.** 선언부(`app/…`)는 빈 스텁이고 실제 구현은 `app_imple/`, `basic_impl/`, `geometry_imple/`, `system_imple/`, `render_imple/`, `network_imple/`, `util_imple/`, `server_imple/`에서 `prototype`으로 주입된다(`CWASM.JSMode()` 분기). `RouteMsg`, `CCollider.Fixed`, `CAniFlow.Update`, `CCanvas.Update`, `CFecth.Exe` 등은 imple 쪽을 봐야 동작을 알 수 있다.
3. **참고 코드 우선순위: 엔진(`artgine/`) → `proj/Tutorial/` → 그 외 `proj/`·`plugin/`.** 기존 프로젝트 코드는 다른 목적이거나 우회 코드일 수 있다. 패턴만 보고 복사하지 말고, 사용한 API가 엔진 흐름과 맞는지 엔진 코드로 확인한다. (과거 사례: 트리거 감지를 `mColTarget` 폴링 코드에서 베껴 씀 → 정답은 `CBehavior.Trigger()` override)
4. **엔진 내부 필드(`m*`)를 직접 읽거나 폴링하지 않는다.** 엔진은 대부분 이벤트를 **메시지 → 같은 이름 메서드 호출**로 전달한다(1장). "매 프레임 필드 확인" 코드가 떠오르면 먼저 수신 메서드가 있는지 찾는다.
5. 수학/변환/충돌/렌더링/리소스 로딩 류는 표에 없어도 artgine 안에 이미 있다고 가정하고 먼저 찾는다.

---

## 빠른 색인

| 작업 패턴 | ❌ 직접 구현 금지 | ✅ 엔진 방식 (섹션) | 🔍 키워드 |
|---|---|---|---|
| 컴포넌트 간 통신/엔진 이벤트 수신 | 서로 참조 잡고 필드 폴링 | `ProductMsg`/`NewInMsg` + 같은 이름 메서드 (§1) | ProductMsg, RouteMsg, CClass.Call |
| 충돌/트리거 이벤트 | `mColTarget` 폴링, 직접 교차 계산 | `CBehavior` 상속 → `Collision()`/`Trigger()` override (§2) | CBehavior, Trigger, eEvent |
| 밀어내기/중력/힘 | 속도·가속도 적분, SetPos로 밀기 | `CRigidBody` + `CCollider.SetPushRate` (§2) | CRigidBody, CForce, SetPushRate |
| 마우스 피킹 | Ray-AABB 직접 계산 | `SetPickMouse(true)` → `PickMouse()` override (§2) | PickMouse, GetRay, Pick( |
| 카메라 밖 판정 | 화면 좌표 직접 비교 | `SetCameraOut(true)` → `CameraOut()` (§2) | CameraOut |
| 수동 교차/공간 질의 | 전체 순회 O(n) | `CBound`, GJK, `COctreeMgr.InsideBox/InsideRay` (§2) | Bound, GJK, Octree |
| 길찾기 | A* 직접 구현 | `GetGI().mOctree.Find` (§9) | COctree Find |
| 트랜스폼/부모-자식 | 부모 체인 Mat4 직접 곱 | `SetPos/Rot/Sca`, `PushChild`, `GetMat()` (§1) | MatUpdate, PushChild |
| 객체 풀링 | 매번 new | `CPool.On` + `CPool.Product`, Destroy시 자동 Recycle (§1) | CPool, Recycle |
| 2D 스프라이트/3D 메시 표시 | 픽셀 버퍼/DOM 조작 | `CPaint2D` / `CPaint3D` (§3) | CPaint2D, CPaint3D |
| Voxel / Terrain | 버퍼 직접 조작, `new CPaintVoxel/Terrain` | `CVoxelMap` / `CTerrainMap` subject (§3) | CVoxelMap, CTerrainMap |
| 리소스 로딩 | fetch/new Image/직접 파싱 | `Frame().Load().Exe` + `Res().Find` (§3) | CLoader, CLoaderOption |
| 렌더패스 | 기본 RP 수동 재정의 | 기본 RP 자동(`EnsureDefaultRP`), 필요시 `CRPMgr` (§3, §7) | CRPAuto, CRPMgr |
| 애니메이션(3D/2D/트윈) | keyframe 보간 직접 구현 | `CAnimation` + `CClip*` + `CAniFlow` (§4) | CAniFlow, CClipMesh, CClipCoodi |
| 애니 전환/종료 감지 | 시간 직접 계산 | `SetAni`+`SetInter`, `AniEnd()` 메시지 (§4) | SetInter, AniEnd, IsEnd |
| IK/본에 부착 | 본 행렬 직접 계산 | `CAimIK`/`CLookAtIK`/`CAttacher` (§4) | CResolverComp |
| 상태 전환(FSM) | if/switch 상태 분기 | `CRoleComp`+`CRole`+`CCondition`+`CAction` (§5) ※ CStateMachine 없음 | CRoleComp, PushRole |
| 지연/주기 실행, 순차 흐름 | setTimeout, 콜백 중첩 | `CAction`+`CSchedule`, `CCoroutine` (§5) | CSchedule, CCoroutine |
| 카메라 컨트롤/흔들림 | view/proj 행렬 조작 | `SetCamCon(CCamCon*)`, `SetCamShake` (§6) | CCamCon, CCamShake |
| 입력(키/마우스/패드) | addEventListener | `Frame().Input()` (§6) | KeyDown, eKey, CPad |
| 게임 캔버스 HUD | DOM 오버레이 | `CUIText/CUIPicture/CUIButtonImg/CUIProgressBar/CUIHTML` (§6) | CUI, SetAnchor |
| 월드 좌표 추적 HTML(네임태그) | 좌표 변환해 DOM 이동 | `CPaintHTML` (§3, §6) | CPaintHTML |
| 팝업/메뉴/대화상자/알림 | **document.body 삽입, z-index 지정** | `CModal`, `CConfirm`, `CAlert` (§6) | CModal, CAlert |
| 사운드 | new Audio/AudioContext | `CAudioBuf` / `CAudioTag` (§6) | CAudioBuf, SetRemove |
| 조명/그림자 | 셰이더 슬롯 하드코딩 | `CLight` + 페인트 태그 (§7) | SetShadow3D, eTag |
| 파티클/VFX/데칼 | 입자 직접 관리 | `CParticle`, `SetVFX`, `ResetDecal` (§7) | CParticle, eVFX |
| 커스텀 셰이더/포스트 | raw GL, UseShader 직접 | `z_file` Build + `CRenderPass`, `CRPMgr`+`CSurface` (§8) | BranchBegin, CSurfaceBloom |
| 물/바람/스카이박스 | 직접 셰이더 | `CWater3D/2D`, `CWind`+`pt.Wind()`, `CPaintCube.Sky` (§7) | CWater3D, CWind |
| 네트워크/DB | fetch/소켓 직접 | `CFecth.Exe`, `CSocketIO`, ORM (§9) | CFecth, CSocketIO, CSQLite |
| 벡터/행렬/색상 | 배열로 직접 연산 | `CMath`, `CVec*`, `CMat`, `CColor` | V3AddV3, CColor |
| 자료구조/이벤트/압축 | 직접 구현 | `CArray`, `CTree`, `CQueue`, `CEvent`, LZ/Zlib | basic/ |

---

## 1. 앱 구조 · 생명주기 · 메시지

**구성 흐름**
- `CAtelier.Init([...json])` → `gAtl.Canvas('Main.json')` (코드 생성은 `gAtl.NewCanvas`). `can.PushSub(sub)` → `sub.PushComp(comp)` / `sub.PushChild(child)`.
- `PushSub`는 대기열(`mPushSub`)에 들어갔다 다음 캔버스 Update에서 `Start()` 후 등록 → 직후 `mSubMap` 직접 조회 금지, `can.Find(key)` 사용.
- 컴포넌트는 `mSysc` 순으로 실행(AniFlow=800 → IK=801 → Paint=900). 첫 프레임 `Start()` → 매 프레임 `Update`. 풀 재사용 시 `Start()`가 다시 불리므로 **상태 초기화는 `Start()`에**.
- `Destroy()`는 표시만 하고 다음 프레임 제거 → 같은 프레임에 아직 Update 전이면 **한 번 더 Update됨**(Update 첫 줄에서 `IsDestroy()` 확인). 풀에서 나온 객체는 Destroy시 자동 Recycle.
- `CSubject.mSpeed`는 시간 배율(`SetSpeed`) → 상속 클래스에서 같은 이름 금지.
- ⚠️ 상속 클래스에서 쓰면 안 되는 이름(같은 이름이면 TS 오류 또는 엔진 동작이 조용히 깨짐): `CSubject`의 `mPos/mRot/mSca/mSpeed/mKey/mChild/mComArr/mPTArr/mWMat/mDestroy/mEnable/mFrame/mSleep/mSave`, `CObject`의 `Set/Get/Call/Key/Icon`, `CComponent`의 `mOwner/mSysc/mStartChk/mEnable/SubUpdate`.
- `Start()` 안에서 `canvas.PushSub()`로 넣은 서브젝트도 같은 프레임 대기열 처리에 포함된다(2026-10 WASM `ASMCanvas.ts`가 크기를 미리 고정해 사라지던 버그 수정).
- 풀 객체: `Destroy()` 후 서브젝트 `IsDestroy()`는 true지만 **그 컴포넌트의 `IsDestroy()`는 false**(회수 표시가 서브젝트에만 붙음) → 컴포넌트에서 생존 확인은 `GetOwner().IsDestroy()`.
- 성능: 캔버스 Update는 살아 있는 서브젝트마다 JS를 호출하므로 **오브젝트 수가 곧 비용**이다(그리는 수보다 큼). 바닥 아이템처럼 쌓이는 것은 개수 상한을 둔다. 멀리 있는 오브젝트는 `SetSleep(cycle)`로 업데이트 주기를 늦출 수 있다.
- **주기 값은 전부 초 단위(밀리초 아님)**: `SetSleep`, `CSleep`, `CRenderPass.mCycle`, `CLight.SetShadow3D` 주기 인자. 엔진이 프레임 간격(초, 예: 0.016)을 누적해 비교한다. `33`을 넣으면 33ms가 아니라 33초다. 0=매 프레임.
- 검색: `FindComp(Type|key)`, `FindComps`, `FindChild`, `can.Find`. `Start()`에서 캐시.

**메시지 규칙 (핵심)**
- **메시지 이름 = 받는 쪽 메서드 이름.** `CRouteMsg.Call` → `CClass.Call(target, name, mMsgData)` → `target[name](...data)`. 메서드가 없으면 **조용히 무시**(오타 주의).
- 보내기: 컴포넌트 `this.ProductMsg("Foo").mMsgData[0]=…`, 서브젝트 `NewInMsg`/`NewOutMsg`, 외부 `sub.Call(name, para)`(큐잉됨).
- `RouteMsg`는 **서브젝트 자신 + 그 서브젝트의 모든 컴포넌트**에 호출. `mIntra=클래스`로 대상 제한, `mChild=true`일 때만 자식 서브젝트로 전파 → **콜라이더가 자식 서브젝트에 있으면 부모의 컴포넌트는 못 받는다.**
- `mInter`: `null`/`"@"`=같은 서브젝트, `"canvas"`=캔버스 메서드, `""`=캔버스 전체 브로드캐스트(다음 프레임), 키=해당 서브젝트.
- 엔진이 보내는 메시지: `Collision`, `Trigger`, `PickMouse`, `CameraOut`(CCollider), `AniEnd`(CAniFlow), `RemoveCComponent`.

**트랜스폼**: `SetPos/SetRot/SetSca` → 자동 `MatUpdate`. 월드행렬 `GetMat()`. `PushChild`하면 부모 행렬 자동 누적(자식 좌표는 로컬). `GetPos()` 반환 참조를 직접 수정하면 MatUpdate 안 됨.
- ⚠️ `CMat`의 `mF32A`를 직접 고친 뒤엔 **`UnitCheck()` 호출 필수**. 안 하면 단위행렬 표시(`mUnit`)가 남아 `MatMul` 등이 그 행렬을 무시한다(오류 없이 결과만 틀림). `Set*` 메서드는 자동 처리.

**풀링**: `CPool.On("Box", ()=>{조립; return sub}, CPool.ePool.Product)` → `CPool.Product<CSubject>("Box")` → `PushSub`.

**플러그인**: 패키지형 `plugin/<Name>/<Name>.ts+json` (`CPlugin.PushPath`, `CClass.Push`, `CPlugin.PushEvent`) / 캔버스형 `CCanvasPlugin` 상속 `Exe()` + `can.PushPlugin`.

**피할 것**: `sub.Update=()=>{}` 인스턴스 함수 덮어쓰기(상속/컴포넌트로), 대량 객체 매번 new.

- 위치: `app/subject/CSubject.ts`, `app_imple/subject/CSubject.ts`, `app/component/CComponent.ts`, `CBehavior.ts`, `app/CRouteMsg.ts`, `basic/CClass.ts`, `app/canvas/CCanvas.ts`, `app_imple/canvas/CCanvas.ts`, `basic/CPool.ts`, `util/CPlugin.ts`
- 샘플: `proj/Tutorial/Canvas/Canvas.ts:71-84`, `proj/Tutorial/Collusion/Collusion.ts:127-141`(풀), `proj/2D/Shooting/Shooting.ts:221-247`, `proj/Tutorial/Plugin/Plugin.ts:28-57`, `plugin/test/test.ts`

---

## 2. 충돌 · 트리거 · 물리 · 피킹

**충돌/트리거 이벤트 (정답 흐름)**
1. `new CCollider(paint 또는 CBound[, rb])` → `SetLayer("a")` → `PushCollisionLayer("b"|[...])` → `SetEvent(CCollider.eEvent.Trigger | Collision | Static | None)` (기본 Collision).
2. 엔진: `CCollider.Fixed`(app_imple)가 옥트리 후보 → `CollisionChk` → 겹치면 `ProductMsg("Trigger"|"Collision")` (Collision은 `PushExe`로 밀어내기까지).
3. 받기: 같은 서브젝트의 컴포넌트가 **`CBehavior` 상속 후 `Trigger(_org,_size,_tar)` / `Collision(_org,_size,_tar,_push)` override.**
4. 진입/이탈이 필요하면 `TriggerEnter/Exit`, `CollisionEnter/Exit(_org,_tar)` override — 이건 `CBehavior` 기본 `Trigger()/Collision()/Update()`가 만들어주므로 **override한 `Trigger/Collision/Update`에서 `super.…` 호출 필수**.
5. 밀어내기 본체와 감지 영역을 분리하려면 **콜라이더 2개**(본체: `SetPushRate`, 감지: `SetEvent(Trigger)`).

**주의**
- `_org`는 **자기** 콜라이더, 상대는 `_tar[i]`.
- `_tar`는 재사용 배열(`CArray.Clear()`는 길이만 0) → **반드시 `for(i<_size)`**, `for..of` 금지.
- `SetLayer` 안 하면(`""`) 옥트리에 안 들어가 상대가 감지 못함.
- `mColTarget`/`mColPush`/`mColPair` 폴링 금지 (내부 필드).
- ⚠️ **2D여도 충돌은 z까지 보는 3D 박스 검사**다(`CPaint2D` 바운드 z는 ±0.5, `m2D`는 초기화에만 쓰임). 그리는 층(z)이 다른 오브젝트끼리(예: 이펙트 z=150, 캐릭터 z=0) 충돌시키려면 `CBound`를 직접 만들어 z를 넉넉히(±수백) 잡는다.
- `CForce`의 방향은 생성자·`SetDirVel` 모두 **복사**된다(2026-10 수정: 예전엔 `SetDirVel(vec,…)`이 참조를 잡아 보간 중 넘긴 벡터와 전역 `CPhysics.GravityDir`를 덮어썼고, 숫자 버전 `SetDirVel(x,y,z,vel)`은 효과가 없었다). 실행 중 `CPhysics.GravityDir`를 바꿔도 이미 만들어진 강체의 중력 힘은 만들 때 방향을 유지한다.

**물리**: `CRigidBody` (`SetGravity`, `mMass`, `Push(new CForce(key,dir,vel))`, `IsGround()`), 콜라이더 `SetPushRate`(기본 0=안 밀어냄), `mFriction`, `mBounce`, `SetOneWay`, `SetStairs`, 지형은 `eEvent.Static`. 전역 상수 `CPhysics`. 외부 물리 `plugin/Rapier`도 같은 `Collision` 메시지 규약.

**마우스 피킹**: `cl.SetPickMouse(true)` → 캔버스가 `CRayMouse` 생성 → `PickMouse(_rayMouse)` override(CBehavior/CSubject). 클릭 판정은 그 안에서 `Input().KeyUp(eKey.LButton)`. 수동: `cam.GetRay(x,y)` → `canvas.Pick(ray)` → `CCollider[]`. 옥트리 질의 `COctreeMgr.InsideRay/InsideBox`.

**카메라 밖**: `cl.SetCameraOut(true)` → `CameraOut(_pArr: CPlaneInside[])` (복귀 시 빈 배열로 1회).

- ⚠️ `SetPickMouse(_val)` / `SetCameraOut(_val)`은 **인자를 무시하고 항상 켠다**(`app/component/CCollider.ts:418-419`). `false`로 끌 수 없음.
- ⚠️ 옥트리는 직전 스텝 끝 위치로 만들어지고, Trigger/Collision 메시지는 한 프레임 늦게 도착한다. 그래서 `SetPos`로 순간이동한 직후 1~2 스텝은 옛 자리 상대가 올 수 있고, 죽기 직전에 만들어진 메시지는 죽은 뒤에 온다 → 받는 쪽에서 상대 생존(`IsDestroy()` 등)을 확인한다. 풀(`CPool`) 회수 때는 `CSubject.Recycle`이 콜라이더를 옥트리에서 빼므로 죽은 오브젝트·재사용 직후 유령 충돌은 엔진이 막는다.
- 위치: `app/component/CCollider.ts`, `app_imple/component/CCollider.ts`, `app/component/CBehavior.ts`, `CRigidBody.ts`, `app_imple/component/CRigidBody.ts`, `CPhysics.ts`, `CForce.ts`, `app/CRayMouse.ts`, `geometry/`(CBound, GJK, CRay, CUtilMath), `geometry_imple/COctree.ts`
- 샘플: `proj/Tutorial/Terrain/Terrain.ts:179-193`(super+Enter/Exit), `proj/2D/Maze/CUser.ts:66-74`(콜라이더 2개), `proj/2D/Maze/CMonster.ts:62-83`, `proj/AI/PhysicsLab/PhysicsLab.ts:89-127`, `proj/2D/SideScroll/SideScroll.ts:70-126`(물리+CameraOut), `proj/2D/Village/CNPC.ts:146,174-185`(PickMouse), `proj/2D/Maze/Maze.ts:89-114`(canvas.Pick)

---

## 3. 페인트 · 리소스 · 렌더패스

**공통**: `sub.PushComp(new CPaintXX(...))`. 색 `SetColorModel(new CColor(r,g,b,CColor.eModel.RGBAdd|RGBMul))` — **모델 인자 생략 시 None이라 색이 안 먹을 수 있음**. 알파 `SetAlphaModel(new CAlpha(v))`. UV `SetTexCodi(new CVec4(반복X,반복Y,오프X,오프Y))` 또는 픽셀 오버로드.
- 텍스처 없는 기본 메시(`GetBoxMesh` 등)는 **검은 텍스처**가 기본 → 단색은 `RGBAdd`(`RGBMul`이면 검정).
- `light` 태그 없는 페인트는 조명 무시(원색 그대로). 포워드에선 emissive가 출력에 더해지지 않음.
- 박스 UV: 윗/아랫면 u=x v=z, ±X면 u=z v=y, ±Z면 u=x v=y. `SetTexCodi`는 모든 면에 동일 적용.
- 픽셀 오버로드 `SetTexCodi(x0,y0,x1,y1,w,h,margin)`은 기본 여백(`gMargin`)이 있음 → 정확히 크롭하려면 `margin=0`. y 뒤집힘은 내부 처리.
- 반복 타일용 이미지는 이음새 없이 반복되고 조명이 균일해야 함. AI 생성 이미지는 그라데이션이 구워져 있어 반복 시 체커 무늬가 생김.
- 코드 생성 텍스처: `CH5Canvas.Init(w,h)` → `GetContext()`로 그림 → `GetNewTex()` → `Ren().BuildTexture` → `Res().Push(key)`. 키를 `.tex`로 끝내면 로더가 파일로 받지 않음. `CH5Canvas.Draw()`는 async(이미지 경로 인자일 때 대기)라 결과를 바로 읽으려면 `await`.

- **2D**: `new CPaint2D(tex, new CVec2(w,h))` + `SetPivot/SetReverse/SetYSort/SetBillBoard(true)`(빌보드 클래스 없음). 샘플 `proj/2D/SideScroll/SideScroll.ts:88-120`, `proj/Tutorial/ULPC/ULPCChar.ts:38-41`
  - ⚠️ **같은 이름인데 저장 방식이 다르다**: `CSubject.SetPos`는 복사, **`CPaint2D.SetPos`는 참조 저장**(넘긴 벡터를 나중에 고치면 그대로 반영). `SetSize`·`SetColorModel`·`SetAlphaModel`·`SetTexCodi`는 복사 → 값을 바꾼 뒤 다시 호출해야 반영. `SetSize(0,0)`은 크기를 null(자동)로 되돌린다. `SetTexCodi` 첫 호출은 태그를 붙이며 배치를 다시 만든다.
  - ⚠️ `CAlpha(값, 컷)`의 **컷 기본값 0.1** → 알파가 0.1 미만인 옅은 그라데이션(비네트 등)은 잘려 경계가 생긴다. 옅은 부분까지 보이려면 `new CAlpha(v, 0.002)`처럼 컷을 낮춘다.
  - ⚠️ `SetYSort`의 기준 범위 `CPaint2D.YSortRange`는 **고정 static(-10000~10000)**. y가 범위를 벗어나면 z 보정(0~100)이 넘쳐 그리기 순서가 깨지거나 사라진다 → 큰/무한 맵은 매 프레임 카메라 y 기준으로 범위를 옮긴다.
  - `SetReverse`는 스케일을 음수로 만든다. 기본 `Forward_2D`는 컬링이 꺼져 있어 괜찮지만, **직접 만든 RP는 `mCullFace=CRenderPass.eCull.None`** 이 필요(기본값이면 뒤집힌 스프라이트가 잘림).
- **3D**: `new CPaint3D(meshKey | "a.glb")` (기본 메시 `Pal().GetBoxMesh()` 등), 교체는 `SetMesh`/`SetTexture`. 코드 메시: `CMeshCreateInfo` → `CUtilRender.CMeshCreateInfoToCMesh` → `Res().Push(key)` → `new CPaint3D(key)`. 샘플 `proj/Tutorial/Viewer/Viewer.ts:120-128`, `proj/3D/GeometryViewer/GeometryViewer.ts:567-583`
  - ⚠️ **모델 단위**: GLB/GLTF는 파서가 미터→인치 변환(×39.37)을 하므로 1m 모델이 약 39 단위로 들어온다(`util_imple/parser/CParserGLTF.ts:411`). FBX/OBJ는 변환 없이 파일 값 그대로(FBX `UnitScaleFactor` 무시). 변환을 끄려면 `CLoaderOption.mInch=true`.
- **Voxel**: `CPaintVoxel` 직접 생성 금지 → `new CVoxelMap()` + `mAtlas.PushSizeCut` + `PushTile(new CVTile…)` + `ResetInfo`. 샘플 `proj/Tutorial/Voxel/Voxel.ts:59-111`
- **Terrain**: `CPaintTerrain` 직접 생성 금지 → `new CTerrainMap()` + `SetLevel` + `SetSplat` + `mHeightBuf` + `ClearAll()`, 조회 `GetHeight/GetNormal`. 샘플 `proj/Tutorial/Terrain/Terrain.ts:152-230`
- **DensityMap**(`app/subject/CDensityMap.ts`): 배치 회전은 `mRot` 샘플러 그대로(보통 Y축만), **지형 경사 정렬 없음**(높이만 `GetHeight`). LOD 단계별 `mRes`가 메시면 `CPaint3DMerge`, 텍스처면 빌보드 `CPaint2DMerge`(회전 제거됨) → 원거리 단계용 impostor 이미지를 따로 준비해야 한다. 청크마다 머지 버퍼를 만들어 **메모리를 많이 쓴다**(대량 배치 시 LOD `mAmount`로 줄일 것).
- **월드 추적 HTML**: `new CPaintHTML(CDOM.DataToDom(html))` → `sub.PushComp`. 샘플 `proj/2D/Village/CNPC.ts:200-205`

**리소스 로딩**: `await gAtl.Frame().Load().Exe(file|[files], new CLoaderOption().Set(...))` → `Res().Find(key)`. 코드 생성 리소스 `Res().Push`. 버퍼 로딩 `Load().LoadSwitch`. 페인트는 `mAutoLoad`로 자동 로딩되므로 보통 선로딩 불필요(옵션은 `SetAutoLoad(new CLoaderOption()…)`). 파서 `util/parser/CParser*`.
- ⚠️ 리소스 키는 프레임 전역 공유이고 `Res().Push`는 **같은 키를 경고 없이 덮어쓴다**. 코드 생성 메시/텍스처를 만드는 클래스를 여러 인스턴스로 쓰면 키에 인스턴스별 접두어를 붙인다.

**렌더패스**: **기본 RP 자동 부착** — `CBrush.EnsureDefaultRP()`가 RP 없는 페인트에 Forward_2D/3D/Voxel/Terrain/Cube/Shadow를 붙인다. 보통 지정 불필요. 커스텀: `new CRPMgr()` → `PushRP(new CRPAuto(shader))` + `PushAnd(CCondition)` → `canvas.PushPlugin(new CCanvasPluginRPMgr(mgr))`, 개별 `pt.PushRenderPass`. `EmptyRPChk` override는 엔진에서 제거됨(호출 안 됨).
- 기본 RP 조정: `Brush().EnsureDefaultRP()` 호출 후 `FindAutoRP("ShadowRead_3D")` 등으로 조회(호출 전엔 없음). 그림자 `bias/normalBias/PCF`는 페인트가 아니라 **이 RP의 `mShaderAttr`에** 넣어야 적용됨. 샘플 `proj/AI/CrossyRoad/CrossyRoad.ts`

- 위치: `app/component/paint/*`, `app/subject/CVoxelMap.ts`, `app_imple/subject/CVoxelMap.ts`, `app/subject/CTerrainMap.ts`, `render/`(CMesh, CTexture, CRenderPass, CColor), `util/CLoader.ts`, `util/CPalette.ts`, `app/canvas/CBrush.ts`, `CRPMgr.ts`
- 샘플(RP): `proj/Tutorial/Viewer/Viewer.ts:89-109`(그림자), `proj/AI/Box3D/Box3D.ts:116-120`(알파), `proj/2D/Village/Village.ts:200-284`(다중)

---

## 4. 애니메이션

**단일 구조**: `new CAnimation()` → `ani.Push(new CClipXxx(time, delay, …))` → `sub.PushComp(new CAniFlow(ani))` → 교체 `af.SetAni(ani)`. 대상 페인트가 여럿이면 `mPaintOff`. 실제 구현은 `app_imple/component/CAniFlow.ts`.
- ⚠️ `CAnimation.mLoop` **기본값 true** → 1회용(점프·사망 등)은 `ani.mLoop=false`.

- **3D 스켈레탈**: `CClipMesh(0, 초, st|"aniKey", ed)`, GPU 스킨 `mBake=true`. 샘플 `proj/3D/ModularVillage/ModularVillage.ts:156-164,227-233`(인스턴스 미리 생성 + `GetAni()!=` 체크)
- **2D 스프라이트/트윈**: `CClipImg`, `CClipCoodi(t,d,sx,sy,ex,ey)`, `CClipPRS`, `CClipColor`, `CClipAlpha`, 곡선 `mCurve`. 일회성 이펙트 삭제는 **`CClipDestroy(t)`**(setTimeout 금지). 샘플 `proj/Tutorial/Animation/Animation.ts:63-116`, `proj/Tutorial/ULPC/ULPCChar.ts:44-73`
- **전환 보간**: `af.SetAni(new); af.SetInter(초)` (Bone 경로만, `mBake`에선 무시). 가중치 동시 블렌딩 API는 없음. 속도 `SetSpeed`, 정지 `mPlay`.
- **종료 감지**: 메시지 `AniEnd(_key)` 메서드 선언(§1 규칙), 또는 `af.IsEnd()`, 또는 CCondition `"/aniFlow/<키>Stop"`.
- **IK/부착**: `plugin/CResolverComp`의 `CAimIK`, `CLookAtIK`, `CAttacher`를 같은 서브젝트에 `PushComp`. 샘플 `proj/Tutorial/IKSample/IKSample.ts:102-114`

**⚠️ `SetAni` 함정**: 같은 **인스턴스**면 무시하지만, **문자열 키/새 인스턴스는 매번 `ResetTime`** → 매 프레임 `SetAni("키")`/`new CAnimation` 하면 애니가 계속 처음으로 돌아간다. 인스턴스를 캐시하고 바뀔 때만 호출.

- 위치: `app/component/CAniFlow.ts`, `app_imple/component/CAniFlow.ts`, `app/component/CAnimation.ts`, `render/CMeshTreeUpdate.ts`, `util/parser/CParserULPC.ts`, `plugin/CResolverComp/`

---

## 5. 흐름 제어 (상태 · 지연 · 코루틴)

- **상태머신**: `CStateMachine` 클래스는 **없다**. `sub.PushComp(new CRoleComp()).GetRoleMgr().PushRole(new CRole([new CCondition("/rigidBody/force/move")], new CAction("MaryWalk",[],CAction.eType.Message)))` → 같은 서브젝트에 `MaryWalk()` 메서드로 수신. 샘플 `proj/2D/SideScroll/SideScroll.ts:128-172`
- **지연/주기 실행**: `CAction` + `CSchedule(delay,count,start)` / `CAction.Excute(this, fn, count, delay)`, 끝나면 `IsEndReset()`. 프레임 시간 기반이라 일시정지/배속을 따른다. 샘플 `proj/2D/Dire/Content/Skill.ts:229-237,500-503`, `proj/2D/Dire/Content/CDirePlayer.ts:233`
- **코루틴**: `new CCoroutine(this.Gen, this).Start()`, `yield CCoroutine.Wait(ms)` — **인자명은 seconds지만 실제 ms(setTimeout)**, 일시정지/배속/파괴 무시 → 게임 타이밍엔 CSchedule 우선. Loop 코루틴은 Destroy 시 직접 정지 처리.
- 위치: `util/CAction.ts`, `util/CSchedule.ts`, `util/CCoroutine.ts`, `util/CRole.ts`, `util/CCondition.ts`, `app/component/CRoleComp.ts`

---

## 6. 카메라 · 입력 · UI · 모달 · 사운드

**카메라**: `gAtl.Brush().GetCam3D()/GetCam2D()`, `canvas.SetCameraKey`. 컨트롤 `cam.SetCamCon(new CCamCon3DFirstPerson|3DThirdPerson|2DFreeMove|2DFollow(Frame().Input()))`, 따라가기 `camCon.SetPos(target.GetPos())`. 흔들림 `cam.SetCamShake(new CCamShakeNoise())` → `Shake(ms)`. CamCon 내부 멤버 직접 수정 금지.
- 원근 FOV는 기본 **가로 기준**(세로 화면에선 멀어 보임). `SetScreenWidthBase(true)`가 세로 기준(이름과 반대).
- 샘플 `proj/3D/ModularVillage/ModularVillage.ts:165-179`, `proj/3D/GameWorld/GameWorld.ts:64-73`, `proj/2D/SideScroll/SideScroll.ts:64,205`, `proj/2D/Maze/CUser.ts:86-99`

**입력**: 스크립트 `gAtl.Frame().Input()`, 서브젝트 `this.GetFrame().Input()`, **컴포넌트 `this.GetOwner().GetFrame().Input()`**(CComponent엔 GetFrame 없음). `KeyDown(eKey.W)`(누르는 중), `KeyDown(k,true)`(첫 프레임), `KeyUp(k)`, `Mouse()`, `MouseVec()`, `Wheel()`, 패드 `GetAxes`, 가상패드 `CPad`, UI 가림 `GetUI()`. static `CInput.Key()`는 DevTool 전용.
- 마우스/터치 **y는 아래가 0, 위가 +**. 터치가 100px 넘게 튀면 `MouseVec()`에 항목이 추가되므로 스와이프는 마지막 항목을 추적.
- ⚠️ 터치는 손가락 식별자가 아니라 **100px 안의 가장 가까운 칸**으로 이어 붙인다(`system_imple/CInput.ts` `TouchRefrash`). 그래서 ① 손 뗀 직후(약 2프레임) 같은 자리를 다시 누르면 눌림이 켜지지 않고 그 칸이 지워져 손가락을 잃는다 ② 두 손가락이 100px 안이면 한 칸으로 합쳐져 한쪽을 떼면 남은 쪽도 잃는다 ③ 마우스 칸(0번) 근처 터치는 눌림이 안 켜진다. 다음 `touchmove`에서 새 칸이 생기며 회복된다(2026-10 확인, 엔진 미수정).
- HTML 요소 클릭 후 캔버스 포커스를 잃어 키 입력이 끊김 → `Frame().Win().Handle().focus()`.
- `CPad`에 스틱 전용 모드가 없음(`Basic`은 버튼 2개 포함). 버튼 제거는 생성 후 `mButton`의 각 버튼을 `Destroy()`하고 배열을 비움.
- 샘플 `proj/Tutorial/DecalSample/DecalSample.ts:71-96`, `proj/2D/Maze/CUser.ts:104-167`, `proj/2D/Dire/Content/CPlayerControl.ts:63,108-126`

**UI(HUD)**: `CUIText`, `CUIPicture`, `CUIButtonImg`/`CUIButtonRGBA`(**`CUIButton` 클래스는 없음**), `CUIProgressBar`, `CUIHTML`. 배치 `SetAnchorX/Y`, 클릭 `SetClickEvent(fn)`/`SetPressEvent`(콜라이더 자동). `canvas.PushSub(ui)`.
- `CUIHTML` 루트는 `pointer-events:none` → 안의 HTML 버튼은 클릭 안 됨. `SetClickEvent` 사용, 불가피하면 내부 요소에 `pointer-events:auto`.
- 일시정지 `canvas.SetPause(true)`: 업데이트만 멈추고 렌더는 계속.
- 샘플 `proj/AI/Shooting/CGameMgr.ts:63-72`, `proj/3D/Map/Map.ts:69-73`

**화면 패널**: `new CModal(key)` → `SetTitle/SetBody/SetSize/SetZIndex(CModal.eSort.Top)` → `Open(CModal.ePos.Center)`/`Close()`, `On(CEvent.eType.Close, fn)`. 확인창 `CConfirm.SetConfirm(...)`. 알림 `CAlert.Info/Warning/E`. 상속 가능(`plugin/Inventory`). **document.body 삽입·z-index 직접 지정 금지.**
- 위치 `basic/CModal.ts`, `basic_impl/CModal.ts`, `basic/CAlert.ts`, `util/CModalUtil.ts`. 샘플 `proj/2D/Village/CNPC.ts:176-184`, `proj/2D/Dire/Content/Item.ts:173-190`, `plugin/Inventory/Inventory.ts`

**사운드**: 효과음 `new CAudioBuf(path|[paths]).SetRemove(true)` → `Volume` → `Play()` (**`SetRemove(true)` 빠뜨리면 재생 후 해제 안 됨**). BGM `new CAudioTag(path)`. 자동재생 권한 `await CSysAuth.Confirm(true)`.
- 위치 `system/audio/CAudio.ts`, `system/CSoundMgr.ts`, `system/CSysAuth.ts`. 샘플 `proj/2D/Maze/CUser.ts:177-179`, `proj/2D/Maze/Maze.ts:425-430`

위치(카메라/입력/UI): `render/CCamera.ts`, `util/CCamCon.ts`, `util/CCamShake.ts`, `system/CInput.ts`, `system_imple/CInput.ts`, `app/subject/CUI.ts`, `app/subject/CPad.ts`

---

## 7. 조명 · 그림자 · VFX · 환경

- **조명**: `sub.PushComp(new CLight())` → `SetDirect()` | `SetPoint(outer,inner)` → `SetColor`, `SetMask`. 그림자 `SetShadow3D(key, 캐스케이드별 주기(초)...)` / `SetShadow2D(key)`. 주기는 초 단위(0=매 프레임, -1=캐스케이드 안 씀). 카메라가 가만히 있으면 이 주기로만 다시 그리므로 길면 바람에 흔들리는 그림자가 끊긴다(예: 0.03, 0.05, 0.2, 0.5). 받는 페인트 `pt.PushTag(CPaint.eTag.Light/Shadow/ShadowReadOnly)`. 낮밤 `CLightPlanet` + `CDayCycle`. 기본 RP가 자동 처리하므로 셰이더 슬롯 하드코딩 금지.
  - 방향광은 **서브젝트 위치 = 빛이 오는 방향**.
  - ⚠️ **포인트 라이트는 항상 `CLight`**. `CLightPlanet`은 태양 전용 — `CDayCycle`이 있으면 `Update`가 매 프레임 방향광(`w=-1`)으로 덮어써 `SetPoint`가 무시됨. 시간대별 밝기는 태양 `CLightPlanet`에 `PushLight(CLight들)` + `PushPoint(CDayCycle)` 등록 후 `SetTime`. 샘플 `proj/2D/VillageRPG/VillageRPG.ts:338-370`
  - 환경광(`ambientColor`)은 셰이더 상수 0.2로 고정(조절 API 없음) → 필요하면 그림자 없는 약한 보조 방향광으로 채움.
  - ⚠️ 그림자맵도 `Dev().SetClearColor` 색으로 지워진다. **알파 1이면 빈 칸이 그림자로 판정**(ShadowReadOnly 바닥이 전부 어두워짐) → 1 미만(예: 0.99). 0이면 캔버스가 투명해짐.
  - bias/normalBias/PCF는 기본 RP에 설정(§3). 타일 10 기준 예: 0.15 / 0.4 / 2.
  - 모바일은 16F 그림자맵이라 정밀도가 낮다. 캐스터 여유 거리 `lig.SetShadowCasterMargin(dist)`(기본 20000)로 조정.
  샘플 `proj/3D/GameWorld/GameWorld.ts:83-98`, `proj/2D/Maze/CUser.ts:58-61`
- **파티클**: `new CParticle()` + `mSample=new CSampList([...])`(또는 CPool 키) + `mShape=new CParticleShapeOut()` → `PushSub`. 입자 수명은 `CAniFlow`+`CClipDestroy`. 샘플 `proj/Tutorial/Particle/Particle.ts:86-151`
- **페인트 VFX**: `pt.SetVFX(slot0~2, SDF.eVFX.X, [params])` (파라미터 설명 `render/CVFX.ts`). 데칼 `pt.ResetDecal(slot:number, pos, size, dir, rot)` + `SetVFX(slot, eVFX.Decal…)`, 메시 데칼 `plugin/DecalMesh`.
- **물**: `new CWater3D()`(`NormalFlow`, `AddReflector`, `AddCaustics`, `GetPT()`), `new CWater2D().NormalFlow(...)`. 샘플 `proj/3D/GameWorld/GameWorld.ts:134-145`, `proj/Tutorial/Water2D/Water2D.ts:50-52`
- **바람**: `sub.PushComp(new CWind())` + 받는 페인트 **`pt.Wind(influence)`** (태그 `"wind"` + `mWindInfluence` 설정까지 함). `PushTag(CPaint.eTag.Wind)`만 하면 influence가 설정되지 않으니 `Wind()`를 쓸 것. 샘플 `proj/Tutorial/Wind/Wind.ts`
- **스카이박스**: `new CPaintCube(cubeTex|"").Sky(...)`, 큐브맵 `Ren().BuildCubeMap`. 샘플 `proj/Tutorial/Skybox/Skybox.ts:100-110`
- 위치: `app/component/CLight.ts`, `CLightPlanet.ts`, `app/subject/CParticle.ts`, `app/subject/CTrail.ts`, `render/CVFX.ts`, `app/component/paint/CPaint.ts`(SetVFX, ResetDecal, Wind), `plugin/Water`, `plugin/ShadowPlane`, `z_file/Light.ts`, `z_file/Shadow.ts`

---

## 8. 셰이더 · 포스트이펙트

- **커스텀 셰이더**: `.ts` 셰이더 파일에서 `z_file/Shader`의 `Build(key,[tags],vs,[uniforms],[varyings],ps,[out])`, 분기 `BranchBegin(tag)` → `await Frame().Load().Exe("X.ts")` → `pt.PushRenderPass(new CRenderPass("X.ts"))`. 태그 조합으로 변형 선택. raw `UseShader/SendGPU`는 배치 최적화를 못 받음(RawRender 샘플은 저수준 예제일 뿐).
  샘플 `proj/Tutorial/ShaderEditer/ShaderEditer.ts:47-85`, `plugin/Water/Water.ts:32-65`
- **포스트**: `new CRPMgr()` → `PushTex`(RT) → `PushRP(new CRPAuto())` + `mRenderTarget` → `PushSuf(new CSurfaceBloom())`(프리셋 `Natural()` 등) → 마지막 Surface 화면 출력 → `canvas.PushPlugin(new CCanvasPluginRPMgr(mgr))`. 블렌드는 `BlendColor0..15(CVec4(SDF.eBlend.X,…))`.
  샘플 `proj/2D/VillageRPG/VillageRPG.ts:486-508`, `proj/Tutorial/3DLight/3DLight.ts:245-260`
- **블룸 플러그인 `CRPMgrBloom`**(`plugin/Bloom/Bloom.ts`) 두 가지 쓰임:
  - 단독 `new CRPMgrBloom(opt)` → `PushPlugin(new CCanvasPluginRPMgr(...))`: 자체 일반 패스를 넣는데 **`opt.classes`(기본 `["CPaint2D"]`)에 든 페인트만 그린다** → 3D 등은 `classes`에 추가. 샘플 `proj/AI/Shooting/Shooting.ts:78`
  - 직접 만든 `CRPMgr`에 붙이기 `CRPMgrBloom.Append(rpm, opt)`: 내 패스 구성은 그대로 두고 블룸만 합성. 합성 결과를 기본 프레임버퍼로 내보내므로 **그 뒤 UI 우선순위 패스는 안 보인다**. 샘플 `proj/2D/Village/Village.ts:284`
  - 발광 대상은 `CRPMgrBloom.Tag(pt, mask)`로 태그. 파라미터는 플러그인 부착 전에 확정(부착 시 복사됨).
- 위치: `z_file/*.ts`(Shader, SDF, 2D, 3D, Post, Light), `render/CShaderInterpret.ts`, `render_imple/CShaderInterpret.ts`, `app/canvas/CRPMgr.ts`, `app/subject/CSurface.ts`, `plugin/Bloom`

---

## 9. 길찾기 · 네트워크

- **길찾기**: NavMgr 클래스는 없음. `canvas.GetGI().mOctree.Find(st, ed, CBound, layerPassFn, pathArr, size)` (A*, `geometry_imple/COctree.ts:780`). ⚠️ **반환값 true = 실패**(탐색 한도 초과). 샘플 `proj/2D/VillageRPG/Content/CProtozoa.ts:579-597`
- **HTTP**: `await CFecth.Exe(url, data|null, "json")` (null=GET, 상대 URL은 WebRoot 기준). 구현은 `network_imple/CFecth.ts`.
- **소켓**: `new CSocketIO(local,path)` → `await Connect()` → `On(header, stream=>…)` / `Send(stream)`, 캔버스 연동 `PushPlugin(new CCanvasPluginSocket(sock))`. 샘플 `proj/2D/Dire/Main.ts:100-116`
- **ORM(서버)**: `new CSQLite()`(Mysql 등) → `Init()` → `CreateCollection/Insert/Select(col,[CORMCondition],…)`. 샘플 `proj/2D/Dire/Server/CDireRoom.ts:56-72`

---

## 10. 따라 하면 안 되는 샘플 코드 (패턴 복사 금지)

| 위치 | 문제 | 올바른 방식 |
|---|---|---|
| `proj/2D/VillageRPG/Content/CProtozoa.ts:853-870`, `CIntelligence.ts:418` | `mColTarget` 폴링. 주석의 "메시지 유실"은 엔진에서 원인 미확인 | `Collision()`/`CollisionEnter()` override (§2) |
| `proj/2D/VillageRPG/Content/CProtozoaVisible.ts:84` | `_targets`를 `for..of` (이전 프레임 대상 섞임) | `for(i<_count)` |
| `proj/2D/Dire/Content/CPlayerControl.ts:252` | `_org.GetLayer()` 검사 (자기 콜라이더) | `_tar[i]` 검사 |
| `proj/Tutorial/Collusion/Collusion.ts:68-76`, `proj/2D/Maze/CUser.ts:209,219` | `super.Trigger/Collision` 미호출 → Enter/Exit 안 뜸 | Enter/Exit 쓸 거면 super 호출 |
| `proj/3D/ColBench/ColBench.ts:296` | `mColTarget` 사용 (벤치 계측용) | 게임 로직에 쓰지 말 것 |
| `app/subject/CUI.ts:747` 등, `proj/AI/Shooting/CEnemyComp.ts:73` | `SetPickMouse(false)`/`SetCameraOut(false)` — 실제로 안 꺼짐 | 인자 무시됨을 인지 |
| `proj/2D/VillageRPG/Content/CSkill.ts:1463,1547-1562` | `CCoroutine.Wait`로 게임 타이밍 | `CAction`+`CSchedule` |
| `proj/2D/Village/CNPC.ts:151,207` | Loop 코루틴 파괴 시 정지 없음 | Destroy에서 정지 |
| `proj/AI/Shooting/CGameMgr.ts:348-395` | CUIHTML에 `position:fixed; z-index:9999` 전체창 | `CModal`/`CConfirm` |
| `proj/AI/CrossyRoad/CGameMgr.ts` BuildHUD | CUIHTML 안 `<button onclick>` (+`pointer-events:auto` 우회) | `SetClickEvent` |
| `proj/Test/AnimalTown/AnimalTown.ts:92-97` | `CShape3D.sDefaultRPRegistered=true` 우회 (플러그인 수정으로 불필요) | 제거 가능 |
| `proj/Tutorial/Viewer/Viewer.ts:196-252`, `proj/Viewer/Viewer.ts:210-227`, `proj/3D/ColBench/ColBench.ts:251`, `proj/Tutorial/ULPC/ULPC.ts:90`, `proj/Effect/Effect.ts:181` | document.body 직접 삽입 / z-index 지정 | `CModal` |
| `proj/Media/MediaTab.ts:175,214` | `new Audio`, `addEventListener` 직접 (툴 페이지) | `CAudioBuf`, `Input()` |
| `proj/2D/Dire/Content/CDirePlayer.ts:234`, `proj/2D/Village/CUser.ts:160` | `new CAudioBuf` 매번 + `SetRemove(true)` 없음 | `SetRemove(true)` |
| `proj/AI/ArtGallery/ArtGallery.ts:474` | `new CColor(r,g,b)` 모델 생략 | `eModel.RGBAdd/RGBMul` 지정 |
| `proj/AI/ArtGallery/ArtGallery.ts:61-75` | 기본 RP를 수동 재정의(그림자 속성 누락) | 기본 RP에 맡김 |
| `proj/AI/ArtGallery/ArtGallery.ts:546,554,593,609` | `CLightPlanet`+`CDayCycle`+`SetPoint`로 포인트 라이트 → 실제론 방향광 | `CLight` + `SetPoint` (§7) |
| `plugin/DecalMesh/DecalMesh.ts:42`, `plugin/ShadowPlane/ShadowPlane.ts:264` | 제거된 `EmptyRPChk` override (호출 안 됨) | `PushRenderPass` 등 |
| `proj/3D/Voxel/Voxel.ts:160,196` | `(mAtlas as any).mGBuffer` 내부 강제 접근 | `CVoxelMap` API (§3) |
| `proj/Tutorial/Particle/Particle.ts:314,368` | `(trail as any).mTrailPaint` private 접근 | 공개 API 확인 |
| `proj/3D/GameWorld/GameWorld.ts:216-221` | CamCon 내부 멤버 직접 수정 | CamCon Set* 메서드 |
| `proj/Tutorial/Water/Water.ts:108-111` | 그림자 텍스처 슬롯 7 하드코딩 (셰이더는 10) | `SDF.eTexSlot.SingleShadowRead` |
| `proj/Tutorial/3DLight/3DLight.ts:165,179` | `gBufNorTex`에 중복 PushInfo (복붙) | 각 버퍼 키 확인 |
| `proj/Tutorial/DecalSample/DecalSample.ts:77,80` | `ResetDecal` 첫 인자에 텍스처 키 전달 | `_slot:number` |
| `proj/2D/Shooting/Shooting.ts:362` | 존재하지 않는 `TexOffBlendFactor` 속성 | `BlendColorN` |
