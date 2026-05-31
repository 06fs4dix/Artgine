# AI Chat 구현 계획

## 전체 진행 방식
1. `proj/Home/AI/` 폴더에 독립 채팅 페이지(`AI.html`) 구현
2. `Home.html`에서는 iframe으로 임베드 (별도 작업)
3. 서버는 `artgine/server/CAIChatRouter.ts` 신규 라우터 추가 (기존 `CTerminalRouter`와 완전 분리)
4. CLI 세션은 `claude --session-id/--resume`, `gemini` 동등 기능으로 위임 → prompt cache 활용
5. 모델 전환 시 history.json 전체를 새 세션 첫 프롬프트로 seed
6. 이미지는 base64 대신 업로드 후 `@경로` 문법으로 CLI 전달

## 핵심 설계
- **인증**: 없음 (localhost 전용, 추후 토큰 추가 여지)
- **작업폴더**: `proj/Home/AI/workspace/<sessionId>/` 고정, 폴더 외 접근 차단
- **세션 기록**: `history.json` 별도 보관 (UI 표시 + 모델 전환 seed용)
- **모델 선택**: provider(Claude/Gemini) + 세부모델 2단 드롭다운
- **이미지**: `workspace/<sid>/uploads/`에 저장 → 프롬프트에 `@uploads/xxx.png`

---

## 작업 목록

### [완료] 1. plan.md 작성 및 폴더 생성
- `proj/Home/AI/` 생성
- `plan.md` 작성

### [완료] 2. CAIChatRouter.ts 골격
- HTTP 라우터: GET/POST/DELETE 엔드포인트 정의
  - `GET /ai/chat` → AI.html 서빙
  - `GET /ai/chat/sessions` → 세션 목록
  - `GET /ai/chat/sessions/:id` → 기록 조회
  - `DELETE /ai/chat/sessions/:id` → 세션 삭제
  - `POST /ai/chat/sessions/:id/upload` → 파일 업로드
- workspace 폴더 생성/삭제 유틸
- path traversal 차단 (basename only)

### [완료] 3. WebSocket 메시지 처리 + CLI spawn
- `/ai/chat/ws` 연결 핸들러
- 메시지 프로토콜: `{type: 'send', sessionId, provider, model, content, attachments}`
- CLI spawn:
  - Claude: `claude --session-id <uuid> -p "..." --model <model>` (첫 메시지) / `--resume <uuid>` (이어쓰기)
  - Gemini: 동등 명령
- stdout 스트리밍 → WS로 chunk 전송
- 완료 시 history.json append

### [완료] 4. 모델 전환 시 history seed
(3번에서 함께 구현됨: `handleSend`의 `needNewCliSession` 분기 + `serializeHistoryForPrompt`)
- provider 또는 model 변경 감지
- 새 CLI session-id 발급
- history.json 전체를 텍스트로 직렬화 → 첫 프롬프트로 전달
- 첨부 이미지는 `@경로` 형태 그대로 포함

### [완료] 5. AI.html + AIChat.ts 클라이언트
- 레이아웃: 좌측 세션 사이드바 + 우측 채팅 영역
- 상단: provider 토글 + 모델 드롭다운
- 하단: 파일 첨부 버튼 + 입력창 + 전송
- 메시지 버블 렌더링 (마크다운, 코드블럭, 이미지 썸네일)
- 스트리밍 표시 (타이핑 효과)
- sessionId localStorage 보관

### [완료] 6. 파일 업로드 + 첨부 UI
(5번에서 함께 구현됨: `📎` 버튼 → raw-body 업로드 → `attachPreview` 칩 → 전송 시 `attachments[]` 포함)
- `<input type=file multiple>` + 드래그앤드롭
- 업로드 진행률 표시
- 첨부 미리보기 (이미지 썸네일, 파일명)
- 전송 시 attachments 배열에 포함

### [완료] 7. 라우터 서버 등록
(2번에서 함께 처리됨: `proj/Home/Server.ts`에 `new CAIChatRouter().SetServerMain(...)` 추가)
- `Server.ts` 또는 진입점에서 `CAIChatRouter` mount
- TS 타입 체크 통과 확인

### [준비] 8. 통합 테스트
- 새 세션 생성 → Claude 메시지 → 응답 확인
- 이어 대화 → `--resume` 확인
- 이미지 업로드 → vision 응답 확인
- 모델 전환 → seed 동작 확인
- 세션 삭제 → workspace 정리 확인

### [완료] 9. Home.html에 iframe 통합
- AI 탭 추가 (`<i class="bi bi-robot"></i> AI`)
- iframe src=`./AI/AI.html` (lazy-load: 탭 처음 열릴 때만 로드)
- savedTab 복원 시에도 lazy-load 동작

---

## 상태 표기 규칙
- `[준비]` 미착수
- `[진행중]` 작업 중
- `[완료]` 완료
- 각 항목 완료 시 즉시 갱신
