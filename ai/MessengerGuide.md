# 메신저 가이드 (Messenger Guide - ai/tool/messenger.js)

> 백엔드: `artgine/server/CMessenger.ts` (텔레그램/디스코드 봇 세션·큐, SQLite), `artgine/server/CMessengerRouter.ts` + `artgine/server_imple/CMessengerRouter.ts` (HTTP 라우터, `/messenger/*`).
> 터미널 연결 상태(`msgSession`)는 `artgine/server_imple/CTerminalRouter.ts`의 `gSessions`(터미널 PTY 세션 맵)에 **메모리로만** 존재한다 — 서버가 내려가면 터미널 자체가 죽으므로 DB에 영구 저장하지 않는다(좀비 링크 방지).

봇 하나 = 메신저 세션 하나(SQLite에 영구 저장). 원하는 터미널(서브 에이전트 세션)에 연결해두면, 그 터미널이 메신저로 온 유저 메시지를 입력으로 받고 응답을 되돌려 보낸다.

## 실행 방식 - HTTP 전용 (memo.js와 동일)

터미널 연결 정보(`termToken`/`termKey`)가 살아있는 서버 프로세스의 메모리에만 있어서, **모든 명령이 HTTP로 그 서버에 물어보는 방식**으로 통일되어 있다(`common.js`의 쿠키 인증 공유 방식). `list`/`log`/`send`도 SQLite를 직접 읽지 않고 서버를 거친다 — 그래야 `list`에서 터미널 연결 여부까지 한 번에 확인할 수 있고, 서버가 항상 최신 상태를 보장한다. 따라서 **서버가 켜져 있어야** 모든 명령이 동작한다.

> ⚠️ `<BASE_URL>`은 지금 이 세션에 적용된 지침 파일의 "접속 정보" 섹션에 적힌 주소+포트+기본경로로 직접 조합한다. settings.json을 열거나 포트를 추측하지 말 것.

## 명령어 일람

```bash
node ai/tool/messenger.js <BASE_URL> login                                          # 인증(auth/login, settings.json password 자동 읽음) → "ok" 출력
node ai/tool/messenger.js <BASE_URL> list                                           # 등록된 메신저 세션 목록 (termToken/termKey 포함)
node ai/tool/messenger.js <BASE_URL> log <sessionId> [limit]                        # 대화 로그, 최신 limit건 시간순 (기본 50)
node ai/tool/messenger.js <BASE_URL> send <sessionId> <from> <message...>           # 메시지 발송
node ai/tool/messenger.js <BASE_URL> link <termToken> <sessionId>                   # 해당 터미널을 메신저 세션에 연결
node ai/tool/messenger.js <BASE_URL> unlink <termToken>                             # 터미널-메신저 연결 해제
node ai/tool/messenger.js <BASE_URL> whoami <key>                                   # 해당 key 세션의 termToken 조회 (자기 자신을 link할 때 사용)
```

- 모든 명령은 세션 쿠키 기반 인증이 필요하다 — 먼저 `login`으로 세션을 인증시켜야 한다. 쿠키는 `ai/tool/messenger_cookie.txt`에 저장/로드된다.
- `list` → `[{id, platform, botName, chatKey, cursor, link, state, createdAt, termToken, termKey}, ...]`
  - `state`: `pending`(등록만 됨) | `active`(대화 중) | `dead`(재등록으로 폐기, 목록에서 제외)
  - `chatKey`: 대화 상대 식별자(텔레그램 chat_id / 디스코드 채널 id). 빈 문자열이면 아직 아무도 말을 안 건 상태
  - `termToken`/`termKey`: 이 메신저에 연결된 터미널 세션 토큰/표시명. 연결 안 됐으면 둘 다 `null`
- `log` → `[{dir, who, date, text}, ...]` (`dir`: `in`(유저→봇) | `out`(서버→유저), 시간 오름차순)
- `send`는 `from`에 발신자 이름(예: `control`, 서브에이전트 key 등)을 넣는다. 아직 유저가 봇에게 말을 걸지 않은 상태(`chatKey` 미바인딩)면 에러 없이 큐에 pending으로 쌓였다가 다음 수신 때 나간다.
- `termToken`은 터미널 세션 토큰이다 (`ai/tool/work.js`나 Control `cmd/sessions`류로 확인, 또는 `whoami <key>`).
- `whoami <key>`는 `/cmd/sessions`(기존 엔드포인트, `CTerminalRouter`)를 읽어 해당 `key`의 세션 중 가장 최근(`createdAt` 최대) 것의 `termToken`을 반환한다. 여러 세션이 같은 key로 떠 있으면 최신 것만 잡히니 주의.

## 서브 에이전트 자동 연결 흐름

`termToken`은 서버가 그 터미널(pty)을 스폰할 때 무작위로 만드는 값이라, 등록 시점(`set-agent`)에는 아직 존재하지 않고 **서브 에이전트 자신도 자기 termToken을 모른다** (환경변수 등으로 전달되지 않음). 그래서 "자기 자신을 link"하려면 자신의 `key`로 `/cmd/sessions`를 역조회하는 과정(`whoami`)이 필요하다.

실제 구현 패턴 (텔레그램 세션 1명을 서브 에이전트 터미널에 자동 연결):

1. `node ai/tool/work.js set-agent <key> claude claude-sonnet-5 ...`로 서브 에이전트 등록 → 서버 틱이 그 key로 터미널을 자동 기동.
2. `node ai/tool/work.js set-sched <name> <key> interval '{"delay":1,"count":1,"autoEnd":false}' <command>`로 스케줄 등록.
   - `delay`를 짧게, `count:1` + `autoEnd:false`로 두면 **레코드는 삭제되지 않고 남아있지만, "이미 발동했다"는 상태는 서버 프로세스 메모리에만 있어서 서버가 재시작될 때마다 다시 1회 발동**한다 (`artgine/server_imple/CTerminalRouter.ts`의 `gSchedulerRuntime`이 메모리 전용이라 재시작 시 초기화되기 때문 — 서버가 켜질 때마다 자동 재연결이 필요한 경우에 맞는 패턴).
   - `command`에는 그 에이전트 자신이 실행할 지시문을 자연어로 적는다. 예:
     ```
     node ai/tool/messenger.js <BASE_URL> login
     node ai/tool/messenger.js <BASE_URL> whoami <key>   (결과가 네 termToken)
     node ai/tool/messenger.js <BASE_URL> link <termToken> <sessionId>
     ```
3. 스케줄이 발동하면 워크오더로 위 지시문이 그 서브 에이전트 터미널에 전달되고, 에이전트가 스스로 `login → whoami → link` 3단계를 실행해 자기 터미널을 지정된 메신저 세션에 연결한다.

이후 그 터미널은 메신저로 온 유저 메시지를 입력으로 받고, 응답이 자동으로 다시 메신저에 전송된다.

**예시** (`telegram` 서브 에이전트를 텔레그램 세션 `sessionId=3`에 서버 시작마다 자동 연결):
```bash
node ai/tool/work.js set-agent telegram claude claude-sonnet-5 0 ./ 1 0 - "[\"텔레그램 메신저에 연결된 상담용 에이전트\"]" -
node ai/tool/work.js set-sched telegram-autolink telegram interval '{"delay":1,"count":1,"autoEnd":false}' '...(위 3단계 지시문)...'
```
