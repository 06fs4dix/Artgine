# 웹브라우저 디버깅 (Web Browser Debugging - curl HTTP API)

> 라이브 페이지 콘솔 로그·JS 실행·DOM 조회용. 코드로 해결 불가능한 작업에만 사용한다.

## 사용 제한 (Usage Restrictions)
- **정적 분석(파일 읽기, grep, glob)을 먼저 한다. `ai/tool/browser.js`는 정적 분석으로 절대 알 수 없는 런타임 정보가 필요할 때만 쓴다.**
- **코드 확인, 클래스/함수 찾기, 파일 구조 파악에 browser.js를 쓰지 않는다.**
- **⚠️ 작업이 끝나면 반드시 `remove <sid>`로 세션을 종료한다.** 세션마다 서버에 브라우저 페이지가 떠 있어 메모리를 계속 차지한다. TTL 만료를 기다리지 말고, 확인이 끝난 즉시(성공·실패 무관, 작업 보고 전) 자기가 만든 세션을 모두 `remove`한다. 중간에 `push`를 다시 했다면 이전 세션도 함께 지운다. 남은 세션은 `list`로 확인한다.

`ai/tool/browser.js`를 사용한다. 비밀번호는 스크립트가 자동으로 읽는다. 인증은 모든 도구가 공유하는 `ai/tool/cookie.json`에 서버(base)별로 자동 저장/로드된다. 세션이 끊기면 알아서 재인증하므로 보통 `login`을 따로 칠 필요가 없다.  
**규칙**: Bash 툴만 사용 (PowerShell 금지)

> ⚠️ **첫 번째 인자(BASE_URL)는 지금 이 세션에 적용된 지침 파일의 "접속 정보" 섹션에 적힌 `주소`+`포트`+`기본경로` 값을 직접 읽어서 조합한다. settings.json을 열거나 포트를 임의로 추측하지 말 것.**

```bash
node ai/tool/browser.js $BASE_URL login                                   # 인증 (최초 1회) → "ok" 출력
node ai/tool/browser.js $BASE_URL push <url> [ttl=600] [logSize=100] [width=1280] [height=720] [captureConsole=1] # 세션 생성 → sessionId 문자열 출력
node ai/tool/browser.js $BASE_URL reset <sid> [ttl] [logSize] [width] [height]    # 세션 재설정(페이지 새로 로드)
node ai/tool/browser.js $BASE_URL screenshot <sid> [options_json] [name] # 스크린샷 → temp/<name>.png|jpg 저장 + 결과 JSON (avg/diff 분석 옵션 포함, 아래 공통 옵션 참고)
node ai/tool/browser.js $BASE_URL record <sid> [options_json] [name]     # 연속 캡처 + 입력 타임라인 → temp/<name>_NNN.png|jpg + 결과 JSON (아래 "record" 참고)
node ai/tool/browser.js $BASE_URL input <sid> <key|mouseButton> <time_ms> <focus> [x y [x2 y2]] # 시간 기반 입력(hold/drag), focus = canvas | page | none | -
node ai/tool/browser.js $BASE_URL exec <sid> <fn> [args_json]             # Playwright Page API dot-notation 직접 호출 → result 출력
node ai/tool/browser.js $BASE_URL eval <sid> <js_expression>              # JS 표현식 직접 실행 → result 출력
node ai/tool/browser.js $BASE_URL eval_stdin <sid>                        # stdin으로 JS 표현식 전달 (긴 코드/이스케이핑 문제 회피)
node ai/tool/browser.js $BASE_URL eval_base64 <sid> <base64_js_expression> # base64로 인코딩된 JS 표현식 실행
node ai/tool/browser.js $BASE_URL logs <sid> [fromOffset=0]               # 콘솔 로그 조회 → logs, nextOffset 출력
node ai/tool/browser.js $BASE_URL list                                     # 세션 목록
node ai/tool/browser.js $BASE_URL remove <sid>                             # 세션 제거 (TTL 만료 시 자동 제거)
```

### remote.js와 공통 규격 (Common Spec with remote.js)

`screenshot`/`input`/`exec`는 원격 데스크탑 도구 `ai/tool/remote.js`(`ai/RemoteGuide.md`)와 이름·인자 순서·출력이 같다. browser.js는 앞에 `<sid>`가 하나 더 붙는 것만 다르다.

| 명령 | 형식 | browser.js 옵션 | remote.js 옵션 |
|---|---|---|---|
| screenshot | `screenshot [<sid>] [options_json] [name]` | 공통 옵션 + `fullPage` (그 밖의 Playwright `page.screenshot` 옵션도 그대로 전달) | 공통 옵션 + `monitor`(0~) |
| record | `record [<sid>] [options_json] [name]` | 공통 옵션 + `mode` | 공통 옵션 + `monitor` |
| input | `input [<sid>] <key\|mouseButton> <time_ms> <focus> [x y [x2 y2]]` | focus = `canvas` \| `page` \| `none` \| `-`(=canvas) | focus = 창 제목(부분 일치) \| `-`(미지정) |
| exec | `exec [<sid>] <fn> [args_json]` | Playwright `Page` | nut-js `mouse`/`keyboard`/`screen`/`clipboard` |

- **screenshot 공통 옵션** (양쪽 동일): `{"format":"png"|"jpeg", "quality":1~100, "clip":{"x","y","width","height"}}`
  - `format` 기본 `png`(무손실). `jpeg`는 손실 압축이고 `quality`(기본 75)는 jpeg일 때만 적용된다.
  - `clip` 생략 시 전체 화면(browser는 뷰포트, remote는 대상 모니터 전체). remote의 clip 좌표는 대상 모니터 기준.
  - 결과는 `temp/<name>.png|jpg`. 확장자는 실제 형식에 맞춰 자동으로 붙는다. 전후 비교용이면 `before`/`after`처럼 이름을 나눠 저장한다(이름을 생략하면 `screenshot`으로 매번 덮어쓴다).
  - 예: `screenshot <sid> '{"clip":{"x":0,"y":0,"width":400,"height":300}}' before`
- **screenshot 분석 옵션** (양쪽 동일, 캡처를 메모리에서 바로 계산 — 분석 옵션이 있으면 `format`과 무관하게 무손실 png로 캡처):
  - `"avg": true | {"model":"rgba|hsva|luminance"}` — 캡처 영역(clip, 없으면 전체)의 평균값. "이 영역이 정말 검정인가", "틴트가 꼈나" 같은 걸 수치로 확정할 때. `hsva`는 색조·채도·명도 분리(틴트 진단), `luminance`는 밝기 단일 채널.
  - `"diff": "<ref>" | {"ref","threshold":0,"gap":4,"min":1,"top":10,"model"}` — `temp/<ref>.png|jpg`(이전 screenshot 결과)와 지금 화면을 비교해 **바뀐 위치를 영역 목록**으로 돌려준다. 기준 이미지와 **같은 clip**으로 찍어야 한다(크기가 다르면 오류).
    - `threshold`: 이 값보다 차이가 큰 픽셀만 변경으로 봄 / `gap`: 대략 이 px 이내로 떨어진 변경은 한 영역으로 합침 / `min`: 이 픽셀 수 미만 영역은 노이즈로 버림 / `top`: 변경량 큰 순 상위 N개만
    - `"heatmap": true` — 저장 파일이 원본 대신 **변화량 지도**가 된다. 변화 픽셀은 보라(작음) → 파랑 → 하늘 → 초록 → 노랑 → 빨강(큼), 변화 없는 곳은 현재 화면을 어두운 흑백으로 깐다. 색 기준은 이번 비교의 최대 변화량(`diff.heatMax`)이 빨강. 응답에 `"saved":"heatmap"`이 붙는다. 어느 위치에 변화가 몰려 있는지 추적할 때 이미지로 연다.
      - 히트맵으로 저장한 파일은 원본이 아니므로 이후 `diff`의 기준(ref)으로 쓰지 않는다 → 이름을 `after_heat`처럼 따로 준다.
  - 출력: `{ ok, file, width, height, avg?, diff?: { ref, diffRatio(%), avgDelta, regionCount, regions:[{x,y,w,h,pixels,avgDelta,maxDelta}] } }`. `regions` 좌표는 화면 기준(clip 오프셋 포함)이라 그대로 다음 `clip`에 넣어 확대 캡처할 수 있다.
  - **역할 분담**: 숫자(avg/diff)로 "어디가 얼마나 바뀌었나"를 잡고, 실제 내용은 저장된 `file` 이미지를 열어 확인한다. 전체 스크린샷을 눈으로 훑어 비교하지 말 것.
  - **언제 쓰나**: 색·밝기 판정, 수정 전후 비교(의도한 곳만 바뀌었나 / 아무것도 안 바뀌었나), 육안으로 애매한 문제(미세한 틴트, 1px 줄, 어두운 영역, 깜빡임).
  - 흐름: `screenshot <sid> '{"clip":C}' before` → (수정/재렌더) → `screenshot <sid> '{"clip":C,"diff":"before"}' after` → `regions` 확인 → 필요하면 그 영역을 `clip`으로 다시 캡처해 이미지 확인
- 마우스 버튼은 양쪽 모두 `mouseLeft` / `mouseRight` / `mouseMiddle`.

### record (연속 캡처 + 입력 동시 진행, 양쪽 동일)

`screenshot`/`input`을 따로 여러 번 부르면 호출마다 수백 ms의 기동·왕복 지연이 끼어 빠른 화면 변화를 놓치고, 캡처하는 동안 입력을 정확한 시점에 넣을 수 없다. `record`는 **요청 하나 안에서 서버가 같은 기준 시각(t0)으로 캡처와 입력을 동시에** 돌린다.

- 종료/간격 옵션
  - `duration`(ms, 기본 1000, 최대 30000) / `frames`(최대 300) — 먼저 닿는 쪽에서 끝
  - `interval`(ms, 기본 0 = 가능한 최대 속도) — 목표 시각은 `t0 + k*interval` 격자에 고정. 캡처가 늦으면 지난 칸은 건너뛴다(뒤 프레임이 밀리지 않음)
  - `times`: `[0,50,100,500,...]` — 지정한 시각에만 캡처(간격 대신). 입력 직후만 촘촘히 볼 때
- `inputs`: `[{"at":ms, "key", "time", "focus", "points"}]` — `at`은 t0 기준, 나머지는 `input` 명령과 같은 의미(`points` = `[]`|`[x,y]`|`[x,y,x2,y2]`). 캡처와 병렬 실행되고, 녹화 종료 후 진행 중인 입력이 끝날 때까지 기다렸다 응답한다.
- `clip`/`format`/`quality`/`avg`는 `screenshot`과 같다(분석 옵션이 있으면 png 강제). `diff`는 `"prev"`(직전 프레임 대비 = 움직임 추적) 또는 `"<ref>"`(기준 이미지 대비).
- browser.js `mode`: `auto`(기본, Chromium이면 screencast, 아니면 shot) | `screencast`(CDP 푸시 프레임, 빠름) | `shot`(`page.screenshot` 반복)
  - screencast는 화면이 안 바뀌면 새 프레임이 오지 않는다. `interval`/`times` 모드에서는 그 시점의 최신 프레임을 쓰고 `repeat:true`로 표시한다. `frameT`는 그 프레임이 실제 도착한 시각.
- remote.js: 루프에서는 raw만 쌓고 인코딩은 끝나고 한다. nut-js 캡처가 동기 호출이라 입력이 최대 한 프레임만큼 늦을 수 있다(실제 시각은 `tStart`). raw 합계 1GB 초과 시 조기 종료(`truncated:true`) — 전체 화면 대신 `clip`을 쓴다.
- 출력: `{ ok, mode, format, duration, fps, count, diffRef?, changed?:[프레임 번호], inputs:[{at,tStart,tEnd,ok,result|msg}], frames:[{i,t,frameT?,repeat?,avg?,diff?,file}] }`
  - `frames[].t`와 `inputs[].tStart/tEnd`는 같은 t0 기준(ms) → "입력 후 몇 번째 프레임에서 바뀌었나"를 바로 대응시킨다.
  - 파일: `temp/<name>_000.png ...`(name 기본 `record`). 같은 이름의 이전 프레임 파일은 먼저 지워진다.
  - **프레임 이미지를 전부 열지 말 것.** `changed`/`diff`로 관심 프레임만 골라 `file`을 연다.
- 예:
  ```
  # 0.3초에 w를 0.8초 누르며 2초간 100ms 간격 캡처, 직전 프레임 대비 변화 추적
  record <sid> '{"duration":2000,"interval":100,"inputs":[{"at":300,"key":"w","time":800}],"diff":{"ref":"prev","top":3}}' walk
  # 클릭 직후만 촘촘히
  record <sid> '{"times":[0,30,60,100,200,500],"inputs":[{"at":0,"key":"mouseLeft","time":80,"points":[400,300]}]}' click
  ```

- `push`: width/height로 Playwright viewport size를 지정한다. 0 이하, 미입력, 알 수 없는 값은 서버 기본값 1280x720을 사용한다.
  - `captureConsole=0`으로 콘솔/에러 로그 수집을 끌 수 있다. 콘솔 캡처(`page.on('console')`, `page.on('pageerror')`)는 CDP `Runtime.enable`을 활성화시키는데, 이는 일부 안티봇 스크립트가 자동화(Playwright/CDP) 여부를 판별하는 데 쓰는 알려진 탐지 신호("Runtime.enable leak")다. 대상 사이트가 봇으로 계속 인식되면 `captureConsole=0`으로 세션을 만들어 이 신호를 제거해본다(단, 이 경우 `logs` 명령으로 콘솔/에러 로그를 볼 수 없다 — network 4xx/5xx 로그는 계속 남는다).
- `reset`: 기존 세션을 재사용하면서 ttl/logSize/width/height를 다시 지정해 페이지를 새로 로드한다.
  - ⚠️ `reset`은 브라우저 캐시를 그대로 써서 수정 전 JS가 실행될 수 있다. 코드 수정 후 확인은 `remove` → 새 `push` + URL에 `?nc=<랜덤>`를 붙여 연다.
- `fn`: Playwright Page API 메서드, dot-notation 지원 (`mouse.click`, `keyboard.type` 등). `fn`이 `screenshot`이면 결과를 자동으로 `temp/screenshot.png|jpg`에 저장한다(이름 지정·공통 옵션이 필요하면 `screenshot` 명령을 쓴다).
  - `exec`는 Playwright(`playwright`)의 `Page` API를 그대로 가져와 쓴 것이라, 복잡한 동작은 Playwright 공식 문서나 `node_modules/playwright-core/types/types.d.ts`의 `Page`/`Mouse`/`Keyboard` 정의를 참고해서 메서드/인자를 확인한다.
  - `args_json`은 그 메서드의 인자에 **위치 순서대로** 대응하는 배열이다.
    - 예: `mouse.click(x, y, options?)` → `exec <sid> mouse.click [400, 300]`
    - 예: `keyboard.press(key)` → `exec <sid> keyboard.press '["Enter"]'`
- `args_json`: JSON 배열 문자열 (기본 `[]`)
- `input`: 키보드/마우스 입력을 한 요청 안에서 실행한다. 좌표가 없으면 키보드, `x y`가 있으면 마우스 press, `x y x2 y2`가 있으면 드래그로 처리한다. 마우스 버튼은 `mouseLeft|mouseRight|mouseMiddle`, `focus`는 `canvas|page|none`(`-`는 기본값 canvas).
  - 키 유지: `node ai/tool/browser.js $BASE_URL input <sid> w 1000 canvas`
  - 마우스 클릭/프레스: `node ai/tool/browser.js $BASE_URL input <sid> mouseLeft 80 canvas 400 300`
  - 마우스 드래그: `node ai/tool/browser.js $BASE_URL input <sid> mouseLeft 800 canvas 400 300 520 300`
- `eval` / `eval_stdin` / `eval_base64`: DOM 조회·JS 변수 읽기 등 브라우저 메모리 접근 시 사용. 따옴표·줄바꿈 이스케이핑 문제가 있으면 `eval_stdin`(stdin 입력) 또는 `eval_base64`(base64 인코딩)를 사용한다. `exec evaluate`는 args_json 따옴표 이스케이핑 문제로 사용 금지.
- `logs` 응답: `{ logs: [{"type":"log"|"error"|"network","text":"...","ts":0,"offset":N}], nextOffset: N }`
  - 로그는 조회해도 삭제되지 않음. `logSize` 초과 시 오래된 것부터 자동 삭제
  - `fromOffset` 미입력 시 전체 조회. 이전 `nextOffset`을 넘기면 새 로그만 조회 가능
  - `favicon.ico` 404는 무시해도 된다.
- 모듈 스코프 변수/클래스(`import`된 것, 최상위 `const`)는 `eval`에서 접근 불가 → 확인할 객체는 코드에서 `window["이름"]=값`으로 노출한다.
- 3D 장면 스크린샷: 카메라 위치는 지형 높이(`GetHeight`)를 먼저 조회해 그 위로 잡는다(땅속·나무 가림 방지). GLB 단위 변환(×39.37) 때문에 미터/엔진 단위를 혼동하지 않는다.

**흐름 예시** (페이지 콘솔 확인):
```
# BASE_URL = 지금 이 세션에 적용된 지침 파일의 "접속 정보" 섹션의 주소+포트+기본경로 (직접 읽을 것, settings.json 금지)
BASE_URL=<접속정보.주소>:<접속정보.포트>/<접속정보.기본경로>
node ai/tool/browser.js $BASE_URL login
→ ok

node ai/tool/browser.js $BASE_URL push $BASE_URL/proj/Control/Control.html 600 100 1280 720
→ 3he4wj8iy6vmqf86ham   (이 값이 sessionId)

node ai/tool/browser.js $BASE_URL exec 3he4wj8iy6vmqf86ham title
node ai/tool/browser.js $BASE_URL logs 3he4wj8iy6vmqf86ham

# 작업 종료 시 반드시 세션 제거 (메모리 해제)
node ai/tool/browser.js $BASE_URL remove 3he4wj8iy6vmqf86ham
```
