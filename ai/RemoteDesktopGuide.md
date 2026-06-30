# 원격 데스크탑 제어 (Remote Desktop Control - curl HTTP API)

> 원격 PC의 실제 마우스/키보드/화면을 직접 제어한다. 브라우저 페이지가 아니라 **OS 전체**가 대상이다.

## 사용 제한 (Usage Restrictions)
- `ai/tool/remotedesktop.js`는 원격 PC의 실제 입력 장치·화면을 건드린다. 꼭 필요할 때만, 그리고 영향 범위를 인지한 상태에서 쓴다.
- 용도: 원격 화면 캡처, 원격 마우스/키보드 입력, nut-js(`mouse`/`keyboard`/`screen`) API 직접 호출.
- 웹페이지 내부 DOM/콘솔만 다룰 때는 이 도구 대신 `ai/tool/browser.js`를 쓴다.

`ai/tool/remotedesktop.js`를 사용한다. 비밀번호는 스크립트가 자동으로 읽는다. 쿠키는 `ai/tool/remotedesktop_cookie.txt`에 자동 저장/로드.
**규칙**: Bash 툴만 사용 (PowerShell 금지)

> ⚠️ **첫 번째 인자(BASE_URL)는 CLAUDE.md "접속 정보" 섹션의 `주소`+`포트`+`기본경로` 값을 직접 읽어서 조합한다. Main.json을 열거나 포트를 임의로 추측하지 말 것.**

```bash
node ai/tool/remotedesktop.js $BASE_URL login                                              # 인증 (최초 1회) → "ok" 출력
node ai/tool/remotedesktop.js $BASE_URL exec <fn> [args_json]                              # nut-js API 호출(RemoteDesktop/exec) → result 출력
node ai/tool/remotedesktop.js $BASE_URL screenshot [quality=75] [monitor=0]                # 화면 캡처 → screenshot.png 저장 (monitor: 0=주모니터(기본값), 1=두번째...)
node ai/tool/remotedesktop.js $BASE_URL input <key|mouseButton> <time_ms> <windowTitle|-> [x y [x2 y2]] # 입력 실행
```

- `fn`: nut-js `mouse`/`keyboard`/`screen` 객체의 메서드, dot-notation 지원 (`mouse.setPosition`, `keyboard.type` 등). 패스스루 호출이라 nut-js 시그니처 그대로 적용된다.
  - `exec`는 nut-js(`@nut-tree-fork/nut-js`)를 그대로 가져와 쓴 것이라, `mouse.move`/`drag`/`scrollDown` 등 복잡한 동작은 nut-js 공식 문서나 `node_modules/@nut-tree-fork/nut-js/dist/lib/{mouse,keyboard,screen}.class.d.ts` 타입 정의를 참고해서 메서드/인자를 확인한다.
  - `args_json`은 그 메서드의 인자에 **위치 순서대로** 대응하는 배열이다. nut-js의 `Point`는 `{"x":N,"y":N}`, `Button`은 숫자(`LEFT=0`/`MIDDLE=1`/`RIGHT=2`)로 표현한다.
    - 예: `mouse.setPosition(target: Point)` → `exec mouse.setPosition '[{"x":100,"y":100}]'`
    - 예: `mouse.click(btn: Button)` → `exec mouse.click [2]` (우클릭)
- `args_json`: JSON 배열 문자열 (기본 `[]`)
- `screenshot`: `quality`(1~100, 기본 75)로 JPEG 압축률 지정.
- `input`: 키/마우스를 시간 기반(hold/drag)으로 실행한다. 좌표가 없으면 키보드, `x y`가 있으면 마우스 press, `x y x2 y2`가 있으면 드래그로 처리한다. 마우스 버튼은 `left|right|middle`. `windowTitle`을 지정하면(`-`는 미지정) 해당 창을 포그라운드로 올린 뒤 입력한다.
  - 키 유지: `node ai/tool/remotedesktop.js $BASE_URL input w 1000 -`
  - 마우스 클릭/프레스: `node ai/tool/remotedesktop.js $BASE_URL input left 80 - 400 300`
  - 마우스 드래그: `node ai/tool/remotedesktop.js $BASE_URL input left 800 - 400 300 520 300`

**흐름 예시**:
```
BASE_URL=<접속정보.주소>:<접속정보.포트>/<접속정보.기본경로>
node ai/tool/remotedesktop.js $BASE_URL login
→ ok

node ai/tool/remotedesktop.js $BASE_URL screenshot
→ Screenshot saved to screenshot.png

node ai/tool/remotedesktop.js $BASE_URL exec mouse.setPosition '[{"x":400,"y":300}]'
```
