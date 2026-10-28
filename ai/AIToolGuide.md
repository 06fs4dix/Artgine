# AITool 가이드 (AITool Guide)

> AI가 라이브 페이지의 엔진 상태를 확인/제어하는 도구. `artgine/tool/AITool.ts`. 엔진 코드를 고치지 않고 `ai/tool/browser.js`의 `eval_stdin`으로 호출한다.
> 브라우저 세션 생성/종료 규칙은 `ai/BrowserDebugGuide.md`를 따른다(작업 끝나면 `remove <sid>` 필수).
> **화면 스크린샷·픽셀 비교·입력은 `browser.js`가 한다.** AITool은 브라우저 툴이 모르는 엔진 내부 정보를 주고, 그 결과를 `browser.js`에 넘길 좌표로 바꿔 준다.

## 실행 위치와 URL (먼저 확인)
아티젠 엔진 위치는 프로젝트마다 다르다. 작업 디렉토리(워킹)와 아티젠 디렉토리가 같을 수도, 엔진이 워킹의 하위 `Artgine/` 폴더일 수도 있다. 두 가지가 서로 다르게 작동한다.

| 구분 | 워킹 = 아티젠 | 워킹 ≠ 아티젠 (엔진이 하위 `Artgine/`) |
|---|---|---|
| `browser.js` 실행 위치 | 워킹에서 그대로 실행 | 워킹에서 그대로 실행(워킹 `ai/tool/common.js`가 하위 `Artgine/`에서 엔진을 찾는다). **엔진 탐색이 없는 옛 복사본**은 `Cannot find module '.../artgine/basic/CHash.js'`로 죽는다(스크립트 위치 기준 `../../artgine/`를 import) → 이때는 `node Artgine/ai/tool/...`로 실행 |
| 서버 루트 | 아티젠 디렉토리 | 워킹 디렉토리 |
| 엔진 URL | `<BASE>/artgine/...` (미검증, 구조상 추정) | `<BASE>/Artgine/artgine/...` (실측) |
| 사용자 프로젝트 | `<BASE>/proj/...` | `<BASE>/proj/...` (워킹의 `proj/`) |
| 엔진 자체 페이지(`plugin/`, `desktop/`) | `<BASE>/plugin/...` | `<BASE>/Artgine/plugin/...` (접두 `Artgine/` 필요) |

- `<BASE>`는 지침 파일 "접속 정보"의 `주소:포트/기본경로`다. 예: `http://124.59.82.199:8050/Artgine`.
- **cwd 기준 상대경로를 쓰는 도구는 서버와 같은 cwd에서 실행한다.** `work.js`/`log.js`는 cwd의 `./db`를, `browser.js`는 cwd의 `settings.json`을 읽는다. 워킹 ≠ 아티젠일 때 아티젠 디렉토리로 `cd`해서 `work.js`/`log.js`를 돌리면 서버가 안 쓰는 **빈 `db/artgine.sqlite`가 새로 생긴다**(실사례). 이 경우 서버 cwd(워킹)에서 스크립트 경로만 지정한다: `cd <워킹> && node Artgine/ai/tool/work.js ...`. `browser.js`도 이 방식(`node Artgine/ai/tool/browser.js`)으로 동작함을 확인했다. AITool은 브라우저만 쓰므로 `cd Artgine`과 이 방식 둘 다 된다.
- 워킹의 `ai/tool/common.js`가 엔진 탐색(`findEngineRoot`)을 지원하면 CLAUDE.md 일반 규칙("워킹에 `ai/tool/`이 있으면 그대로 실행")대로 워킹에서 `node ai/tool/...`를 실행한다. 탐색이 없는 옛 복사본이면 위 표처럼 실패하므로 `node Artgine/ai/tool/...`를 쓴다. 이 프로젝트의 워킹 `common.js`는 탐색을 지원하도록 수정했고 `browser.js`/`log.js`/`work.js`를 워킹에서 `cd` 없이 실행해 확인했다.
- `push` 후 `logs`에 `favicon.ico` 같은 무관한 404가 있어도 `AITool`이 import되면 무시한다.
- **페이지가 안 뜨거나 `CFrame.js`를 못 찾으면 먼저 경로를 의심한다.** 증상: `eval_stdin`이 `Cannot read properties of undefined (reading 'replace')`로 실패, `logs`에 404 한 건, `performance.getEntriesByType("resource")`가 1개뿐. `push` 후 `logs`로 404 여부를 보고 `Artgine/` 접두를 붙이거나 뗀다.
- 아래 "불러오기" 코드는 로드된 `CFrame.js` 주소에서 경로를 뽑으므로 두 구조 모두에서 그대로 쓴다. `AITool.js` URL을 직접 쓰지 않는다.
- 임시 스크립트·결과는 도구를 실행하는 cwd(작업 디렉토리에 `ai/tool/`이 있으면 작업 디렉토리, 없으면 아티젠 디렉토리)의 `temp/`에 두고, `<` 리다이렉트와 대상 파일은 절대경로로 지정한다.

## 기능 한눈에 보기

| 섹션 | 호출 | 용도 |
|---|---|---|
| Frame | `Frame.Pause/Resume/Step/SetFPS/Status/Release` | 엔진 루프 정지·스텝·FPS 제한. 정지 상태에서 상태를 읽으면 값이 일관된다 |
| Report | `Report({info:[...]})` | 렌더/씬/리소스/에러를 **측정 한 번 = JSON 하나**로 받는다 (성능·렌더 상태·이상 징후) |
| 객체 추적 | `Find`, `Inspect`, `Track`, `Until` | 특정 객체(서브젝트·컴포넌트·카메라·RP·리소스)의 상태/위치를 읽고 시간에 따라 추적 |
| 브라우저 연계 | `View.Show/Hide`, `Screen` | 내부 텍스처를 화면에 띄우고, 서브젝트 화면 좌표를 `browser.js`에 넘긴다 |
| 도움말 | `Help()` | 기능과 옵션 목록 |

## 불러오기
`eval_stdin`으로 실행한다. 엔진이 서빙되는 URL이 서버 배치마다 다르므로(`/Artgine/artgine/...` 또는 `/Artgine/Artgine/artgine/...`) **페이지가 실제로 로드한 CFrame.js 주소에서 경로를 뽑아 쓴다.** 페이지가 쓰는 모듈과 같은 URL이어야 같은 인스턴스(`CFrame.Main()`)를 잡는다.

```js
(async()=>{
const u=performance.getEntriesByType("resource").map(r=>r.name).find(n=>/\/artgine\/util\/CFrame\.js/.test(n)).replace(/util\/CFrame\.js.*$/,"tool/AITool.js");
const {AITool}=await import(u);          // import하면 globalThis.AITool도 설정된다
const A=AITool.Frame;
A.Pause();
await A.Step(30);                        // 정확히 30프레임 진행 후 정지
const st=A.Status();
A.Release();                             // 반드시 복구
return JSON.stringify(st);
})()
```
```bash
node ai/tool/browser.js $BASE_URL login
node ai/tool/browser.js $BASE_URL push $BASE_URL/proj/2D/Shooting/Shooting.html 600 100 1280 720   # → <sid> 출력
node ai/tool/browser.js $BASE_URL eval_stdin <sid> < temp/test.js
node ai/tool/browser.js $BASE_URL screenshot <sid> '{"clip":{"x":0,"y":0,"width":256,"height":256}}' name
node ai/tool/browser.js $BASE_URL remove <sid>       # 끝나면 반드시
```
- **`push` 직후에는 페이지가 아직 안 떠 있다.** 바로 `eval_stdin`을 돌리면 `reading 'replace'`(CFrame.js 없음)나 `Find` 결과가 `undefined`라는 오류(`reading 'path'` 등)로 실패한다. 몇 초 기다리거나 `Frame.Status().frame`이 증가하는지 확인한 뒤 호출한다.
- 같은 세션의 이후 호출은 매번 import하지 말고 아래 한 줄 헤더를 쓴다(`globalThis.AITool`이 있으면 그대로, 없으면 import).
  `const A=globalThis.AITool??(await import(performance.getEntriesByType("resource").map(r=>r.name).find(n=>/\/artgine\/util\/CFrame\.js/.test(n)).replace(/util\/CFrame\.js.*$/,"tool/AITool.js"))).AITool;`
- 반환이 Promise인 `Report`, `Frame.Step`, `Track`, `Until`은 `await`가 필요하다. `Find`/`Inspect`/`Screen`/`View.Show`는 동기지만 헷갈리면 모두 `await`를 붙여도 안전하다.
- `CFrame.js`를 못 찾으면(`find`가 `undefined` → `reading 'replace'`) 로딩 전이거나, 브라우저 resource timing 버퍼(기본 250개)가 이미 가득 찬 상태에서 페이지를 다시 로드한 경우다. 리소스가 많은 페이지는 Shooting도 250개로 꽉 찬다. 엔진은 보통 맨 앞에 로드되어 잡히지만, 안 잡히면 위 표의 엔진 URL(`<BASE>/artgine/tool/AITool.js` 또는 `<BASE>/Artgine/artgine/tool/AITool.js`)을 직접 import한다. 페이지가 로드한 `CFrame.js`와 같은 경로여야 같은 인스턴스를 잡는다.
- `eval` 한 번이 끝나도 페이지는 유지된다. `Pause` 상태로 여러 번 나눠 호출할 수 있다. 같은 세션에서는 `globalThis.AITool`을 바로 쓴다.
- 정지한 채로 작업을 끝내지 않는다. 끝나기 전에 `Resume()` 또는 `Release()`.
- 결과 저장이 필요하면 `... eval_stdin <sid> < in.js > temp/xxx.json`처럼 리다이렉트한다.
- 임시 스크립트와 결과는 `temp/`에만 둔다.

## 상황별로 무엇을 쓰나

| 상황 | 쓸 것 |
|---|---|
| "느리다/프레임이 떨어진다" | `Report()` → `anomaly` 확인 → `Report({info:["rp","paint"], key:[...]})` |
| "오브젝트가 안 보인다" | `Inspect("이름")` → `anomaly`가 이유(꺼짐/컬링/RP 미등록/텍스처 누락/화면 밖)를 알려줌 |
| "위치가 이상하다/순간이동/떨린다" | `Track("이름")` → 바뀐 프레임과 old/new 값. `stack:["SetPos"]`는 그 메서드로 바뀔 때만 호출 스택이 남는다(물리·행동 컴포넌트가 다른 경로로 바꾸면 `calls`가 빈다) |
| "어떤 조건에서만 버그" | `Until("이름", "o.GetPos().y < 0")` → 그 시점에서 정지 → `Inspect`/`Screen`/`browser.js screenshot` |
| "그림자/렌더타겟이 이상하다" | `View.Show(텍스처키)`의 `stat`과 이미지, `Screen({camera:"shadow0"})`로 그림자 카메라 기준 위치 |
| "이 리소스를 누가 쓰나" | `Report({info:["resource"], key:["이름"]})`의 `usedByRP`/`usedByPaint` |
| "화면 어디에 있나/클릭해야 하나" | `Screen({key:["이름"]})` → `clip`/`center`를 `browser.js`에 |
| "수정 효과가 있나" | 같은 옵션으로 `Report`를 전후로 두 번 비교 |

## Frame

| 호출 | 설명 |
|---|---|
| `Frame.Pause()` | 엔진 루프 정지(Update/Render 건너뜀). `Status().frame` 카운터는 Pause 직후 1 늘 수 있다(실측) |
| `Frame.Resume()` | 정지/스텝 해제 |
| `Frame.Step(count=1, timeout=10000)` | count 프레임 진행 후 정지. `Promise<boolean>` (시간 초과면 false). 실제 진행 수는 Step 전후 `Status().runFrame`의 **증가량**(정확히 count)으로 본다. `runFrame`은 누적값이고 `Release`해도 0으로 돌아가지 않는다. `frame` 카운터는 ±1 차이가 날 수 있다 |
| `Frame.SetFPS(fps)` | FPS 상한. 0이면 해제. 낮추는 것만 가능 |
| `Frame.Status()` | `hook, pause, stepLeft, fpsLimit, frame, runFrame, deltaTime, fps, visible` |
| `Frame.Release()` | 래퍼를 풀고 원래 루프로 복구 |

## Report
`await AITool.Report({info:[...], ...})` — `info`로 담을 항목을 고른다. 기본은 `["summary","anomaly"]`(작고 먼저 볼 것).

| info | 내용 | 측정 |
|---|---|---|
| `summary` | frame/fps/dt/캔버스·브러시 수/화면 크기/측정 합계(cpu,gpu,draw,tri) | O |
| `anomaly` | 자동 판정한 이상 징후 `[{level,code,target,msg}]` | O |
| `rp` | 렌더패스별 cpu/gpu/draw/tri/렌더 횟수/렌더타겟/카메라/셰이더/태그 | O |
| `paint` | 페인트별 cpu/gpu 추정/draw/tri/vert/지오메트리·텍스처 바이트/누락 텍스처 | O |
| `frame` | 우선순위→리스트(Distance/RAlpha/Alpha)별 렌더 순서 | X |
| `scene` | 캔버스별 서브젝트 트리(key/type/enable/pos/comp). `key`를 주면 이름·타입·컴포넌트 검색 | X |
| `resource` | 리소스 종류별 개수, 텍스처 총 바이트(추정), 큰 텍스처 순위(텍스처만). `key`를 주면 상세(`detail`). 자세한 주의는 "리소스 확인" 참조 | X |
| `error` | `gl.getError`(AITool이 `View.Show` 전에 비워 둔 엔진 GL 에러 포함), 컨텍스트 손실, 캡처된 window 에러/미처리 reject (**AITool을 import한 뒤 발생한 것만**, 최근 20건) | X |

옵션: `frame`(측정 프레임, 기본 30) / `gpu`(기본 true, 타이머 쿼리 확장이 없으면 자동 off) / `key`(문자열 배열, 이름 부분 일치 필터. rp·paint·frame·scene·resource) / `top`(rp·paint·resource 상위 N, 기본 10) / `sort`(`cpu|gpu|draw|tri`) / `depth`·`maxNode`(scene 깊이·노드 수) / `timeout`(ms).

- **권장 순서**: ① `Report()`로 summary+anomaly 확인 → ② 의심 가는 곳만 `{info:["rp","paint"], key:["Shadow"]}`처럼 좁혀서 재조회. 처음부터 전체를 받으면 토큰만 낭비된다(전체 info는 소규모 페이지에서 약 3.4KB).
- **anomaly 코드** (level: error > warn > info 순으로 정렬됨)
  - error: `missing-camera`, `missing-rt`(RP의 카메라/렌더타겟 키가 없음), `missing-texture`(페인트 텍스처가 리소스에 없음), `gl-error`, `context-lost`
  - warn: `not-rendered`(켜져 있고 페인트도 있는데 측정 구간에 한 번도 렌더 안 됨), `many-small-draws`(배칭/인스턴싱 확인), `gpu-dominant`(GPU 시간 있는 RP가 2개 이상이고 GPU 합계가 1ms 이상일 때 한 RP가 50% 이상), `paint-hot`(페인트 CPU 합계가 1ms 이상이고, 그 페인트가 1ms 이상이면서 합계의 30% 이상), `high-draw`(프레임당 드로우 1000 초과). `many-small-draws`는 RP의 프레임당 드로우가 200 이상이고 드로우당 삼각형이 50 미만일 때다
  - info: `rp-disabled`(페인트가 있는데 RP가 꺼져 mShow=false), `rp-sleeping`(cycle/sleep 주기 실행 RP라 측정 구간에 안 그려짐. `frame`을 늘려 다시 재면 잡힘), `no-draw`(렌더 구간은 돌았지만 드로우 0)
- `key` 필터는 rp/frame에서는 RP 키, paint에서는 `owner 타입`, scene에서는 서브젝트 키/타입/컴포넌트 이름, resource에서는 리소스 키에 부분 일치한다.
- **정지 상태에서 측정하면** 내부에서 `Step(frame+1)`로 프레임을 몰아주고 정지 상태를 유지한다. 장면이 움직이지 않는 상태에서 정확히 N프레임을 재고 싶을 때 쓴다.
- 측정 중에만 `ChangeRenderPass`, GL draw 함수, 페인트 `Render`를 감싸고 끝나면 모두 푼다. 측정 비용 때문에 프레임이 떨어질 수 있다.
- **페인트 GPU 시간은 추정값**이다(RP GPU 시간을 그 RP 안 삼각형 비율로 나눔). 풀스크린 같은 픽셀 비용이 큰 페인트는 과소평가된다. RP에 페인트가 하나면 정확하다.
- **mBrush가 둘 이상이면** RP 키 앞에 `b0:`, `b1:`이 붙는다.

## 객체 추적: Find / Inspect / Track / Until
엔진 객체 하나의 상태·위치를 읽고 추적한다. 대상은 **query 문자열**로 지정한다(객체를 직접 넘겨도 된다).

| query | 대상 |
|---|---|
| `"Player"` | 서브젝트 (경로/키/타입 부분 일치, 정확히 같은 키 우선). 키가 해시인 서브젝트는 타입(`BackGround` 등)이나 경로로 찾는다 |
| `"Player@CPaint3D"` | 그 서브젝트의 컴포넌트. `"@CPaint3D"`만 쓰면 모든 서브젝트의 해당 컴포넌트 |
| `"canvas:Main"`, `"cam:shadow0"`, `"rp:Forward"`, `"res:Artgine/MainFrame.tex"` | 캔버스, 카메라, RP(RenInfo), 리소스. 별칭 `subject:`, `camera:`, `resource:`도 된다. 부분 일치는 대소문자를 무시한다 |

| 호출 | 설명 |
|---|---|
| `Find(query, {top:10})` | 후보 목록 `{count, item:[{kind,path,type,comp?}]}`. 못 찾으면 `count:0`. **`count`는 총 일치 수가 아니라 `top`으로 잘린 개수**다(실측: 같은 검색을 `top` 5/50/1000으로 하면 5/50/52). 전부 보려면 `top`을 크게 준다. 단 서브젝트 검색은 일치 300개에서 탐색을 멈추므로 300개를 넘는 장면(BoxIndividual 등)은 query를 좁힌다 |
| `Inspect(target, {fields, call, depth:2, maxArray:8, facts:true})` | 상태 읽기. `facts:false`면 `facts`/`anomaly`를 생략한다(`fields`만 읽을 때 약 700B 줄어든다). 옵션 없으면 `m*` 필드를 `depth`까지 펼친 `state`. `fields:["mPos","mComArr[0].mKey"]`로 골라 읽고, `call:["GetPos","IsEnable"]`은 **인자 없는 Get/Is/Has/Key 메서드만** 호출한다(`SetPos` 등은 거부) |
| `Track(target, {fields, call, frame:60, stack:["SetPos"], maxChange:200})` | frame 프레임 동안 필드를 샘플링해 **바뀐 프레임만** `changes:[{frame,field,old,new}]`로 반환. 서브젝트는 `fields`를 생략하면 `mPos/mRot/mSca`. `call`은 `Inspect`와 같이 인자 없는 Get/Is/Has/Key 메서드만 매 프레임 호출하고, 거부한 이름은 `denied`로 돌려준다(허용된 것이 하나도 없으면 오류). 정지 상태에서 부르면 정확히 `frame` 프레임만 진행한다. `stack`에 메서드명을 주면 그 호출의 인자와 호출 스택을 `calls`에 남긴다 |
| `Until(target, 조건, {max:300, fields, call})` | 조건이 참이 될 때까지 프레임을 진행하고 **그 프레임에서 정지**한 뒤 `{hit, frame, steps, paused, state}` 반환. 조건은 식 문자열(`"o.GetPos().y < 0"`, `o`=대상 객체) 또는 함수. 맞지 않거나, 조건 평가 오류·조건식 문법 오류·대상 없음이어도 **항상 정지 상태로 끝난다**(`paused`는 실제 정지 상태). 예외는 프레임 루프에 연결하지 못한 경우뿐이다(`paused:false`) |

- **Inspect의 `facts`/`anomaly` (서브젝트일 때)**: 활성(`enable`/`selfEnable`/`parentEnable`)·삭제 여부, 로컬/월드 위치, 스케일, 컴포넌트, 페인트별 RP 등록과 `shown`, 텍스처 누락, 카메라 기준 `ndc`/`screen`(페이지 px)과 `onScreen`.
  - error: `disabled`, `parent-disabled`, `destroyed`(삭제 또는 풀 반환), `paint-disabled`, `texture-missing`
  - warn: `scale-zero`, `paint-not-registered`(RP 리스트에 아직 없음 — 꺼졌거나 갱신 전이거나 맞는 RP 태그 없음), `culled`(모든 RP에서 `mShow!=0`)
  - info: `no-paint`, `off-screen`, `out-of-depth`
- **Track 한계**: 프레임 종료 시점에 값을 비교하므로 한 프레임 안에서 값이 왔다 갔다 하면 안 보인다. `stack`은 지정한 메서드를 인스턴스에서 잠시 감싸는 방식이라, 벡터 내부 배열을 직접 쓰는 경로나 다른 메서드를 거친 변경은 못 잡는다(스택은 6줄까지).
- **핸들 수명**: `Find`가 돌려주는 항목의 실제 객체(`ref`, `owner`)는 직렬화되지 않는다. 한 `eval` 안에서는 `Find(...).item[0].ref`로 객체를 꺼내 쓸 수 있지만, 다음 `eval`에서는 query 문자열을 다시 쓴다.
- **직렬화 규칙**: 벡터는 `[x,y,z]`, 행렬은 `{mat:[16], pos:[x,y,z]}`, `Map/Set/배열`은 길이와 앞부분만. `mFrame/mCanvas/mBrush` 같은 큰 참조는 `<타입 키>`로만 표시하고 순환 참조는 끊는다.
- **움직이는 대상(물리·AI)은 먼저 `Frame.Pause()`** 한 뒤 `Inspect`/`Screen`을 부른다. 안 세우면 읽는 사이에 화면 밖으로 날아가 회수되어 `Screen`이 오류를 내거나 값이 어긋난다(Shooting의 서브젝트는 시간이 지나면 화면 밖으로 사라진다).
- **출력 크기(실측)**: 서브젝트 `Inspect` 기본 약 2.3KB(`mComArr`/`mComEnableArr` 중복, 16원소 행렬 포함), 컴포넌트 `Inspect` 기본 약 1.7KB(`mOwner`가 펼쳐짐), `Track` 30프레임 약 3.4KB(직전 `new`가 다음 `old`로 반복). 값 몇 개만 볼 때는 `fields`(+`facts:false`)로 좁히면 200B~1KB로 줄고, `Track`은 `frame`을 짧게 준다.
- 풀링되는 오브젝트(총알 등)는 끄거나 화면 밖으로 보내면 게임 로직이 회수(`destroyed`)할 수 있다. 이런 오브젝트를 일부러 건드려 테스트하면 결과가 오염된다.

```js
// 예: "Player"(실제로 움직이는 서브젝트 이름으로 교체)의 x가 100을 넘는 순간 정지해서 상태 확인
// 고정 배경처럼 안 움직이는 대상은 조건이 안 맞아 hit:false로 끝난다. 먼저 Track으로 움직이는지 확인한다
(async()=>{
const u=performance.getEntriesByType("resource").map(r=>r.name).find(n=>/\/artgine\/util\/CFrame\.js/.test(n)).replace(/util\/CFrame\.js.*$/,"tool/AITool.js");
const {AITool}=await import(u);
const r=await AITool.Until("Player","o.GetPos().x > 100",{max:300,fields:["mPos"]});
return JSON.stringify(r);          // paused:true — 이어서 Screen/browser.js screenshot, 끝나면 Frame.Resume()
})()
```

## 브라우저 툴과 연계 (View / Screen / 리소스 상세)

| 호출 | 설명 |
|---|---|
| `Report({info:["resource"], key:["shadow"]})` | `key`와 일치하는 리소스 상세(`detail`): 텍스처 크기/포맷/레이어(2D·Array·Cube)/렌더타겟 여부/바이트(추정), `CMeshDrawNode`의 정점·삼각형 수(`CMesh`에는 없음), 렌더타겟으로 쓰는 RP(`usedByRP`)와 페인트가 참조하는 텍스처(`usedByPaint`, **부분 정보**). `matched`는 일치 개수, `detail`은 `top`개까지 |
| `View.Show(textureKey, {layer:0, maxSize:512, alpha:false, range, x:0, y:0})` | 화면에 안 보이는 내부 텍스처(그림자맵/렌더타겟/리소스)를 GPU에서 읽어 **통계**(`min/max/avg/nonZeroRatio/nan`)를 돌려주고 페이지 왼쪽 위에 오버레이로 띄운다. 반환된 `rect`를 `browser.js screenshot`의 `clip`으로 쓰면 이미지를 볼 수 있다 |
| `View.Hide()` | 오버레이 제거(끝나면 반드시 호출) |
| `Screen({key:[], top:10, canvas, camera})` | 서브젝트(키·타입·컴포넌트 이름 부분 일치)의 화면 좌표: `center`, `rect`(바운드 8코너 투영), `clip`(캔버스 안으로 자른 값), `ndc`, `uv`, `onScreen`. 모두 **페이지 CSS px**(캔버스 오프셋 반영, `centerCanvas`는 캔버스 기준). **`key`에는 `Find`가 준 `path`(`a/b`)를 넣지 않는다**(경로는 일치 대상이 아니라 `count:0`). 키(경로의 마지막 세그먼트)·타입·컴포넌트 이름을 쓴다. 카메라는 페인트가 등록된 RP의 카메라를 쓰고, 없으면(페인트 없음/RP 미등록) 캔버스 카메라(`GetCam()`)로 대신한다. 둘 다 없거나 월드 행렬이 없으면 `error`("카메라 또는 월드 행렬 없음")가 나는데, 이 오류가 나면 `Inspect`의 `anomaly`(`destroyed`/`paint-disabled`/`off-screen`)로 원인을 확인한다. **`camera`를 주면**(예: `"shadow0"`) 그 카메라 기준 `ndc`/`uv`/`onScreen`만 준다(`center/rect/clip`은 메인 화면 전용이라 없음). 없는 카메라는 후보 목록과 함께 오류 |

- **`textureKey`는 리소스 전체 키**다(`"Artgine/MainFrame.tex"`, `"Artgine/shadowWrite.tex"`). `"MainFrame.tex"`처럼 줄이면 `텍스처 없음`과 `candidate` 목록이 돌아온다. 키는 `Find("res:이름")`이나 `Report({info:["resource"]})`로 확인한다.
- **View 읽기 방식**: 임시 프레임버퍼로 읽고 원래 바인딩을 복구한다. 엔진 `ReadPixel`처럼 `GetBuf()`를 덮어쓰지 않는다. 깊이/압축 포맷은 `error`로 돌려준다.
- `range:[lo,hi]`로 값을 0~255에 매핑해서 본다. 기본은 **float(RGBA32F) [0,1], RGBA8 [0,255]**다. RGBA8은 읽은 값이 0~255 원본이라 `stat`도 0~255로 나오고, `range:[0,1]`을 주면 0이 아닌 값이 전부 255로 포화된다(RGBA8에는 `range`를 주지 않는다).
- 읽기 전에 엔진이 남긴 GL 에러를 비우고 결과의 `priorGlError`에 담는다. 그 에러는 다음 `Report`의 `gl-error`/`error.glError`에도 그대로 나온다(그 에러 때문에 읽기가 실패하지 않는다). 숫자 확인이 목적이면 이미지 없이 `stat`만 봐도 된다("그림자맵이 비었나" = `nonZeroRatio`, "렌더타겟이 전부 검정인가" = `max`).
- `alpha:true`면 알파를 체커보드 위에 합성해서 보여준다(기본은 알파 무시).
- **흐름 예**: `Pause()` → `Step(2)` → `View.Show(key)` → `browser.js screenshot <sid> '{"clip":<rect>}' name` → 이미지 확인 → `View.Hide()` → `Resume()`.
  서브젝트는 `Screen({key:["Player"]})` → `clip`을 `screenshot`에, `center`를 `input` 좌표나 `mouse.click`에 넘긴다. 서브젝트가 움직이거나 애니메이션 중이면 먼저 `Pause()`로 세워야 좌표가 어긋나지 않는다.
- `Screen`의 `rect`는 페인트 바운드 8코너 투영이라 실제 그려진 영역보다 약간 클 수 있다(스프라이트 주변 여백). 페인트 바운드가 없거나 코너 하나라도 깊이 범위 밖(`|ndc.z|>1`)이면 `rect`/`clip`이 빠지고, 캔버스와 겹치는 부분이 2px 미만이면 `clip`만 빠진다. 이때는 `center`를 쓴다.

## 리소스 확인 (등록된 리소스)
레지스트리(`Res().mResMap`)를 `Report({info:["resource"]})`, `Find("res:...")`, `Inspect("res:...")`로 본다. ArtMuseum에서 실제 레지스트리와 비교해 총 개수·타입별 개수가 일치하고 텍스처 바이트 합계는 반올림 오차(3B) 범위로 맞음을 확인했다.

| 하려는 것 | 호출 |
|---|---|
| 개수·타입별 개수·큰 텍스처 | `Report({info:["resource"], top:20})` → `count`, `type`, `texByte`, `texTop` |
| 특정 리소스 상세 | `Report({info:["resource"], key:["이름"], top:N})` → `matched`, `detail` |
| 등록된 키 전체 목록 | `Find("res:", {top:1000})` → `item[].path/type`. `View.Show`/`Inspect`에 넣을 **전체 키**를 여기서 얻는다 |
| 리소스 하나의 내부 상태 | `Inspect("res:전체키")` (텍스처 약 0.7KB, 셰이더 목록 약 1.1KB) |
| 누락 확인 | `Report`의 `anomaly`(`missing-texture`), 서브젝트 `Inspect`의 `texture-missing` |

주의(실측):
- `key`와 `Find`는 **리소스 키에만** 부분 일치한다. 타입 이름(`CShaderList`)으로는 못 찾는다(0건). `CMeshDrawNode`가 `Artgine/DM/Artgine/box.mesh<해시>` 키로 여러 개 섞여 있어 `mesh`로 검색하면 함께 나온다.
- `texTop`은 텍스처만 보여주고 메시·셰이더 메모리는 없다. `detail`은 `top`(기본 10)까지라 `matched`가 더 크면 `top`을 올린다.
- **`usedByRP`/`usedByPaint`는 부분 정보다.** `usedByRP`는 그 텍스처를 **렌더타겟으로 쓰는 RP**만(예: `shadowWrite.tex`는 RP 6개가 채워짐), `usedByPaint`는 **페인트가 참조하는 텍스처 키**만 추적한다. 셰이더 입력으로 쓰는 텍스처(`MainFrame.tex`, `envmap.tex`, `uniToSam2dArrKey` 등)와 메시·셰이더 목록은 실제로 쓰여도 둘 다 `[]`다. **`[]`를 "미사용"으로 판단하지 않는다.**
- `usedByPaint`는 10개까지만 담고 잘렸는지 알려주는 필드는 없다. 정확히 10개면 더 있을 수 있다(`marble.tex`가 10개).
- `CMesh` 상세에는 정점·삼각형 수가 없다(`CMeshDrawNode`에만 `vertex/index/triangle`).
- `byte`/`texByte`는 추정이다. 레이어×포맷(RGBA8=4B, RGBA32F=16B, 그 외 포맷은 4B로 가정)의 합에, mipmap이 있으면 ×4/3, 깊이 버퍼가 있으면 **텍스처 전체에 한 번만**(레이어 수와 무관) 픽셀당 4B를 더한다. `MainFrame.tex` 1280x720이 7.37MB(= 3.69MB + 깊이 3.69MB)인 것은 mipmap이 아니라 깊이 버퍼 때문이다. `texTop` 합과 `texByte`는 반올림 때문에 몇 바이트 차이가 날 수 있다(ArtMuseum 3B).
- **누락 감지**: 페인트가 쓰는 텍스처를 레지스트리에서 빼면 `Report`의 `missing-texture`(error, 대상 페인트별), 그 서브젝트 `Inspect`의 `texture-missing`, `View.Show`의 "텍스처 없음"이 모두 나온다(ArtMuseum에서 확인).

## 수정 전후 비교
- **성능/렌더 상태 비교**: 같은 옵션·같은 `key`로 `Report`를 수정 전후 두 번 받아 직접 비교한다(기본 리포트는 수 KB). 전용 diff 함수는 두지 않는다. `Pause()` → `Step(n)`으로 같은 조건에서 재고, 첫 측정 결과를 `temp/`에 리다이렉트로 저장해 둔다.
- **화면 비교**: AITool이 아니라 `browser.js screenshot`의 `diff`/`avg`/`heatmap`을 쓴다. 화면 스크린샷·픽셀 비교 기능은 AITool에 만들지 않는다.

## 주의/한계 (실측 기준)
- 페이지에 `CFrame` 메인 루프가 돌고 있어야 한다(`Status().frame`이 증가). 로딩이 끝나지 않은 페이지(`mLoadChk=false`)에서는 `Step`이 `false`로 끝난다.
- 탭이 백그라운드(`visible != "visible"`)면 rAF가 멈춰 `Step`이 끝나지 않는다.
- `SetFPS`는 rAF 주기(보통 vsync, 헤드리스는 약 30fps) 단위로 끊긴다. 10fps를 걸면 실측 약 8~13fps 정도로 나온다.
- 재개 직후 dt가 한 번 커질 수 있다(0.5초 넘게 정지했다면 엔진이 보정).
- `SubUpdate`(`requestIdleCallback`)와 `setInterval` 같은 타이머는 정지와 상관없이 계속 돈다. 정지 중에도 타이머가 값을 바꿀 수 있다.
- 래퍼는 `CFrame.mMainProcess`를 바꿔 끼우는 방식이다. 같은 필드를 건드리는 다른 코드와 겹치면 안 된다.
- **메인 루프가 죽은 페이지**(페이지 오류로 rAF가 끊김)에서는 `frame`이 오르지 않는데도 `Report`가 `measuredFrames:0`에 `anomaly:[]`를 돌려주고 `Step`은 `false`만 준다(정상으로 오해하기 쉽다). **판정 기준은 `measuredFrames:0`(또는 `Status().frame`이 안 오름)이다.** `fps:-1`은 정상 구동 중에도 `Report`를 한 번 돌리기 전에는 `Status().fps`가 -1일 수 있어 신호로 쓰지 않는다. `measuredFrames:0`이 보이면 `browser.js logs <sid>`로 페이지 오류부터 확인한다(실사례: Shooting에서 `Cannot read properties of null (reading 'Destroy')`).
- `Report`의 `error` 정보는 AITool을 import한 뒤 발생한 오류만 담는다. 그 전에 난 오류는 `browser.js logs`로 본다.
- 측정 중에는 프레임이 떨어진다(ArtMuseum 20프레임 측정 시 약 2초, 13fps).
- 컴포넌트를 `SetEnable(false)→(true)`로 직접 껐다 켜면 RP에 다시 등록되지 않을 수 있다(`paint-not-registered`). 상태 점검 테스트 시 원복되지 않으니 새로 로드해서 쓴다.

## 검증 이력
- **Frame**: Shooting 페이지에서 Pause 중 `frame` 증가 0~1, `Step(5)`=5, `Step(30)`=30, `Release` 후 루프 정상 재개. `Step` 타임아웃은 false 반환 후 정지 유지, 이후 `Step` 정상.
- **Report**: Shooting(2D)·BoxIndividual(3D, 2000개 서브젝트)·Effect·ArtMuseum(RP 16개)·CrossyRoad(RP 7개)·ForgeBuild(RP 51개)에서 동작. 정지 상태 측정 시 Step으로 정확히 n+1프레임 진행·정지 유지. 라이브 페이지 값을 바꿔 `missing-camera`, `missing-rt`, `missing-texture`, `rp-disabled`, `paint-hot`(페인트 Render에 3ms 지연 삽입), `gl-error`(`gl.enable(0)`), `context-lost`(`WEBGL_lose_context`), window 에러·reject 캡처, `gpu:false`, `key` 필터 확인. `gpu-dominant`/`many-small-draws`는 CrossyRoad에서 실제로 잡힘. **`not-rendered`(주기 실행이 아닌 RP)와 mBrush 둘 이상은 검증하지 못했다.**
- **View/Screen**: `MainFrame.tex`(RGBA8)와 `shadowWrite.tex`(RGBA32F Array, `range:[-130,130]`)를 읽어 오버레이 `rect`를 `browser.js screenshot clip`으로 찍어 이미지 확인. `Screen`의 `rect`를 빨간 테두리로 그려 Shooting 스프라이트를 감싸는 것 확인(캔버스 x 오프셋 포함). `Cube` 텍스처와 `layer>0` 읽기는 검증하지 못했다. 화면이 배경과 같은 색이면(BoxIndividual의 파란 큐브) 육안 확인이 안 된다.
- **객체 추적(Shooting의 BackGround, CrossyRoad)**: `Find`(subject/comp/canvas/cam/rp/res, 없는 대상), `Inspect`(`fields`/`call`(허용·거부)/카메라·리소스 대상/없는 대상), 상태 점검 `disabled`/`off-screen`+`culled`/`scale-zero`/`texture-missing`/`paint-disabled`/`paint-not-registered`, `Track`(실행 중·정지 중 구동, 호출 스택 기록, 필드 생략 시 서브젝트 기본값, 비서브젝트는 fields 필수), `Until`(문자열 조건 적중 후 정지, 함수 조건 미적중, 잘못된 식/평가 오류), `Screen({camera:"shadow0"})`의 ndc/uv와 없는 카메라 오류 확인. `no-paint`(WorkFlow), `parent-disabled`(부모를 끄고 자식 Inspect), 이상 징후 중복 제거(페인트 6개 서브젝트가 `off-screen` 1건)도 확인. **`out-of-depth`는 라이브로 재현하지 못했다.**
- **2026-10-26 수정 재검증(Shooting)**: 수정 전 재현 → 수정 후 확인. ① import 후·첫 `Report` 전 오류 캡처(전: 누락) ② 페인트 없는 `WorkFlow`의 `Screen`이 캔버스 카메라로 좌표 반환(전: `GetCamera` 오타로 오류) ③ `Until` 첫 조건 평가 오류/대상 없음 시 실제 정지(전: `paused:true`라고 돌려주면서 계속 진행) ④ `Track`의 `call`에 부작용 메서드를 넣으면 거부(전: 매 프레임 실행) ⑤ 정지 상태 `Track(frame:5)`이 정확히 5프레임 진행(전: 6) ⑥ 다른 곳의 GL 에러가 남아 있어도 `View.Show` 성공 후 그 에러가 `Report`에 전달(전: 읽기 실패 + 에러 소실). 회귀: Report(실행/정지), Find, Inspect(call/facts), Track 기본 필드, Until 적중/미적중, Screen, View, Release 정상. 검증 스크립트: `temp/aitool_verify1.js`, `temp/aitool_verify2.js`.
