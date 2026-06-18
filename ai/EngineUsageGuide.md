# 엔진 사용 가이드 (Engine Usage Guide)

> 실제 사용법(클래스/메서드명)은 항상 직접 검색해서 확인한다. 이 문서에는 적지 않는다.

## 사용 규칙
- 아래 작업 패턴에 해당하는 구현을 시작하기 전, **먼저 탐색 위치/키워드로 코드를 검색**한다.
- 동일/유사 기능이 있으면 그걸 조합해서 쓴다. 없을 때만 직접 구현한다.
- 표에 없는 패턴이라도 "수학/변환/충돌/렌더링/리소스 로딩"류면 artgine 안에 이미 있을 가능성이 높다고 가정하고 먼저 찾는다.

## 작업 패턴 → 탐색 위치

| 작업 패턴 | ❌ 직접 구현 금지 | 🔍 탐색 위치 | 🔍 탐색 키워드 |
|---|---|---|---|
| 피킹(마우스→오브젝트 선택) | Ray-AABB 직접 계산, 매트릭스 누적 직접 계산 | app, app/component, geometry | Ray, Pick, Bound, Collider |
| 월드 트랜스폼/매트릭스 누적 | 부모 체인 순회하며 Mat4 직접 곱 | geometry, render, basic | WorldMatrix, Mat, Tree |
| 충돌/겹침 판정 | 직접 AABB/구/다각형 교차 계산 | geometry, app/component | Bound, GJK, Collider, Overlap |
| 공간 분할/대량 오브젝트 탐색 | 전체 순회(O(n)) 직접 구현 | geometry | Octree |
| 벡터/행렬 연산 | 직접 배열로 연산 구현 | geometry | Vec, Mat, Math |
| 색상 연산/팔레트 | 직접 RGB 변환 구현 | geometry, render, util | Color, Palette |
| 애니메이션 블렌딩/흐름 | 직접 keyframe 보간 구현 | app/component, util | AniFlow, Animation, Curve |
| 물리/힘/중력 | 직접 속도·가속도 적분 구현 | app/component | Physics, RigidBody, Force |
| 2D/3D/Voxel/Terrain 페인팅 | 직접 픽셀/복셀 버퍼 조작 | app/component, app/subject | Paint, Voxel, Terrain |
| 카메라 컨트롤 | 직접 view/projection 행렬 조작 | render, util | Camera, CamCon, CamShake |
| 비동기 흐름/순차 처리 | 콜백 중첩 직접 구현 | util | Coroutine, Schedule, Action |
| 상태 전환(FSM) | if/switch 상태값 직접 분기 | util | StateMachine |
| 리소스 로딩(모델/이미지) | 직접 파일 파싱 구현 | util | Loader, Parser, GLTF, FBX, OBJ |
| 객체 풀링/재사용 | 직접 new/delete 반복 | basic, geometry | Pool, Product, Recycle |
| 이벤트/콜백 등록 | 직접 배열에 함수 푸시해서 관리 | basic | Event, On, Call |
| 자료구조(트리/큐) | 직접 트리/큐 구현 | basic | Tree, Queue |
| 게임 캔버스 내 HUD(텍스트/이미지/버튼/진행바) | 직접 DOM 텍스트/이미지 오버레이 구현 | app/subject | CUI, CUIText, CUIPicture, CUIButton, CUIProgressBar |
| 3D/2D 공간에 고정된 HTML(네임태그 등 좌표 추적 필요시) | 직접 좌표 변환해서 DOM 위치 갱신 | app/subject, app/component/paint | CUIHTML, CPaintHTML |
| 팝업/메뉴/설정창/대화상자/알림 등 화면 UI 패널 | **document.body에 직접 div/HTML 삽입, z-index 직접 지정 — z-index 꼬임 발생** | basic | CModal, CAlert |
| 입력 처리(키/마우스) | 직접 addEventListener로 전역 관리 | system | Input, Mouse |
| 사운드 재생 | 직접 Audio 객체 관리 | system | SoundMgr |
| 네트워크/DB 통신 | 직접 fetch/소켓 관리 | network | Fetch, Socket, ORM |
| 압축/직렬화 | 직접 압축 알고리즘 구현 | basic, util | LZ, Zlib |
