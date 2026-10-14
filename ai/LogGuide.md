# 로그 조회 가이드 (Log Guide - ai/tool/log.js)

> 백엔드: `artgine/server/CProviderLog.ts` (`provider_log` 테이블).

로컬 조회는 서버 HTTP/로그인 **불필요**(CLI가 `CProviderLog`를 직접 import 해 `./db/artgine.sqlite`를 읽음 — `work.js`와 동일 패턴). 원격 조회(`<sessionId>@<baseUrl>`, 아래 참조)는 `browser.js`와 같은 인증 저장소를 통해 HTTP로 간다. **조회 전용** — 삭제 명령은 없다(세션 삭제는 Control 로그 탭에서 한다).

## 쓰는 흐름

Control 로그 탭(또는 Terminal.html 로그 패널)에서 보고 있는 세션의 **세션키 입력박스**(클릭하면 전체 선택됨)를 복사해, 여기에 그대로 붙여넣는다.

```
node ai/tool/log.js session <복사한 세션키>
```

"이 로그 정보 분석해줘"처럼 세션키 하나만 던지고 분석을 맡기는 용도로 쓴다 — 별도 구독·자동 중계 장치 없이, 필요할 때 사람이 키를 골라 넘기는 것으로 충분하다.

### 원격 서버 로그를 복사한 경우

`provider_log`는 서버마다 자기 로컬 DB에만 쌓인다(로컬/원격이 한 데이터베이스로 합쳐지지 않는다 — Control 로그 탭 상단 셀렉트로 서버를 바꿔가며 본다). 그래서 **Control에서 원격 서버를 선택해 보고 있는 로그**의 세션키 입력박스는 평문 `sessionId`가 아니라 `<sessionId>@<baseUrl>` 형태로 복사된다. `@` 뒤는 그 세션이 실제로 있는 서버의 주소다 — 이 꼬리를 빼고 `sessionId`만 넘기면 지금 실행 중인 머신의 로컬 DB에서 찾게 되어 **"로그를 찾지 못했다"로 조용히 실패한다**(다른 서버 로그이므로 애초에 여기 없다). 복사한 값을 그대로, 자르지 말고 붙여넣는다.

`session` 명령은 `@baseUrl`이 있으면 자동으로 그 서버에 인증 조회한다(`ai/tool/browser.js`와 같은 인증 저장소 `ai/tool/cookie.json` 공유 — 그 서버에 `browser.js`로 로그인해본 적이 있으면 토큰이 이미 있어 바로 된다).

**토큰이 없어서 조회가 실패하면, 비밀번호를 사용자에게 묻기 전에 반드시 `Env.json`의 `rdpRemotes`부터 확인한다.**
Control에 등록된 원격 서버는 비밀번호가 이미 거기 저장돼 있다(`RemoteGuide.md` 참조 — 평문 또는 SHA256, 64자 미만이면 평문).
비밀번호 없이(또는 사용자에게 먼저 물어서) `login`을 실행하면 **로컬 `settings.json` 비밀번호가 자동으로 들어가** 원격 서버의
실제 비밀번호와 달라 `Wrong password`로 실패한다(실사례: 2026-10-02, `dev.rowplayon.com:7000` 조회 시도 — 사용자에게
비밀번호를 물어보고서야 해결됨. `Env.json`을 먼저 봤으면 바로 됐을 일).
```bash
node -e "
const j = JSON.parse(require('fs').readFileSync('Env.json','utf8'));
const remotes = typeof j.rdpRemotes === 'string' ? JSON.parse(j.rdpRemotes) : j.rdpRemotes;
const r = remotes.find(x => x.entryUrl.includes('<baseUrl에서 호스트 부분>'));
console.log(r ? r.password : '(등록 안 됨)');
"
node ai/tool/browser.js <baseUrl> login <위에서 찾은 password>
```
찾은 비밀번호는 로그/채팅에 그대로 노출하지 않는다(변수에 담아 바로 명령에 넘기거나, 위처럼 별도 실행으로 분리). `Env.json`에 그 원격 항목 자체가 없을 때만 사용자에게 직접 물어본다.

`key` 명령은 원격을 지원하지 않는다(서버에 key 기준 조회 API가 없다 — `onLogTerm`은 살아있는 세션 토큰이 있어야 동작해서, 과거에 떠 있었던 세션을 임의 key 문자열로 찾는 용도로는 못 쓴다). 원격 조회는 `session`만 쓴다.

## 명령어 일람

```
node ai/tool/log.js sessions [before] [limit]
node ai/tool/log.js session <sessionId> [--role=...] [--grep=...] [--range=...]
node ai/tool/log.js key <key> [afterId] [--role=...] [--grep=...] [--range=...]
```

### 옵션 (session/key 공용 — 토큰 절약용)

필터 없이 부르면 **전체를 그대로** 내보낸다. 긴 세션(답변이 길거나 도구 호출이 많은 세션)을 통째로 분석시키면 토큰이 많이 든다 — 아래 옵션으로 필요한 구간만 추린다. **옵션은 모두 AND**다(각자 전체 레코드에 독립 적용, 전부 만족하는 행만).

- `--role=user,assistant` (쉼표 구분): 역할만 추린다. `tool` 행이 전체의 상당수를 차지하는 경우가 많아, **`--role=assistant`로 최종 답변만 보는 게 가장 효과적인 절약**이다.
- `--grep=<키워드>`: `text`/`tool`/`file`에 그 키워드가 있는 행만(대소문자 무관 부분일치). 특정 파일/함수/에러 메시지로 좁힐 때.
- `--range=<구간>`: 번호(`no`) 구간. 양 끝 포함.
  - `10~30`: 10번~30번
  - `10+5`: 10번부터 뒤로 5개(10~15)
  - `10-5`: 10번부터 앞으로 5개(5~10)

각 레코드에는 `no`(필터 전 전체 목록 기준 1부터의 순번)가 붙는다. `session` 명령의 `no`는 Control 로그 탭 말풍선의 `#번호`와 같다 — 사용자가 "#40 근처 봐줘"라고 하면 `--range=40-5`/`--range=40+5`로 짚는다. `key` 명령은 조회 결과(여러 세션 혼합, afterId 이후) 안에서의 순번이라 로그 탭 번호와 다를 수 있다.

```bash
node ai/tool/log.js session <세션키> --range=10~30 --role=assistant        # 10~30번 중 답변만
node ai/tool/log.js session <세션키> --grep=CTerminalRouter               # 그 파일 언급된 행만
```

- `sessions`: 최근 세션 아코디언 목록(최신 대화순). Control 로그 탭 첫 화면과 같다.
  - `before`: 그 id보다 오래된 세션부터("더 보기" 페이징용 커서). 생략 시 최신부터.
  - `limit`: 가져올 개수(기본 30).
  - 각 항목: `{name, offset, model, firstText, cwd, time}` — `name`이 그 세션의 `sessionId`(= 로그 탭 입력박스에 보이는 값).
- `session <sessionId>`: 그 세션(= CLI 한 번의 대화 전체) 전체 로그를 시간순으로. Control 로그 탭에서 아코디언을 펼쳤을 때와 같다.
  - `sessionId`는 CLI 자체 세션 ID다(라우터의 터미널 key와 다르다 — 터미널 key로 찾으려면 `key` 명령을 쓴다).
- `key <key> [afterId]`: 터미널 key(예: `team:xxxx-claude1`, 수동 사원 key) 기준 조회. 그 key가 한 번이라도 등장한 CLI 세션 전체를 포함한다(key 매칭 실패로 `key=''`인 같은 세션 행도 함께 나옴 — Terminal.html 로그 패널과 동일 로직).
  - `afterId`: 그 id 이후(증분)만. 생략/`-1`이면 전체.

출력은 한 줄 JSON이다(`work.js`와 동일 — `printResult`).

## 레코드 필드

```
{ id, key, provider, sessionId, cwd, model, role, text, tool, file, createdAt }
```

- `role`: `user`(질문) | `assistant`(최종 답변) | `tool`(도구 호출 — 이름·대상 경로만, 결과 본문 없음)
- `createdAt`: `YYYYMMDDHHmmss`

## 참고

- 워크오더 의뢰 하나의 결과만 보려면 이 도구가 아니라 `node ai/tool/work.js get <id>`를 쓴다(그쪽이 의뢰 구간만 잘라서 `answer`로 보여준다 — [WorkGuide.md](WorkGuide.md) 참조).
- `key=''`(미상)으로 저장된 행은 `key` 조회로는 못 찾을 수 있다 — `sessions`로 목록을 보고 `session <sessionId>`로 직접 짚는다.
