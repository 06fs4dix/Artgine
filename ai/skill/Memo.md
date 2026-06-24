지금까지 이 터미널 세션에서 수행한 작업을 요약해서 메모로 저장한다.

1. 이번 세션에서 한 작업(수정한 파일, 해결한 문제, 결정한 내용 등)을 핵심만 간단히 요약한다. 요약 텍스트는 `[Log]` 접두사로 시작하고, `#Log` 해시태그를 본문 어딘가에 포함해 키워드로 강제 저장되게 한다.
2. 자세한 사용법은 **`ai/MemoGuide.md`** 참고. 저장에는 `ai/tool/memo.js`를 쓴다.
3. 프로젝트 가이드(CLAUDE.md)의 "접속 정보" 섹션에서 주소/포트/기본경로를 읽어 BASE_URL을 구성한다.
4. `/Memo/Chat`은 인증이 필요하다(`401`). 먼저 로그인해서 세션 쿠키를 확보한다 (비밀번호는 스크립트가 `Main.json` → `desktop/Main.json` 순으로 자동으로 읽는다. 쿠키는 `ai/tool/memo_cookie.txt`에 자동 저장/로드).

```bash
node ai/tool/memo.js $BASE_URL login
```

5. 받은 쿠키로 메모를 저장한다.

```bash
node ai/tool/memo.js $BASE_URL w "<요약 내용>"
```

저장 후 결과(`saved` 여부)를 사용자에게 알린다.
