# 다운로드 · 영상 참조 가이드 (Download Guide - ai/tool/download.js)

> 백엔드: `artgine/server/CDownloadServer.ts` (`/Download/Status|Info|Start|Poll|SaveEdit`). UI는 `plugin/ControlMedia/ControlMediaClient.ts`(Control의 Media 탭 → Download 버튼).
> 바이너리: `artgine/external/bin/yt-dlp.exe`, `ffmpeg.exe` (서버 시작 시 없으면 GitHub에서 자동 설치, yt-dlp는 자동 업데이트).

용도 두 가지.
1. **다운로드**: YouTube 영상/음악, 일반 파일 URL을 서버 PC에 저장.
2. **영상 참조**: 받은 영상(또는 로컬 영상)에서 스크린샷을 뽑아 `Read`로 열어 본다 (UI 레퍼런스, 연출 참고 등).

## 명령어 일람

서버 경유(서버가 켜져 있어야 함. `<BASE_URL>`은 지침 파일의 "접속 정보"로 조합):
```bash
node ai/tool/download.js <BASE_URL> status                      # yt-dlp/ffmpeg 설치 여부, 오늘 폴더·용량
node ai/tool/download.js <BASE_URL> info <url>                  # 유튜브 제목/길이/채널 (일반 URL은 파일명만)
node ai/tool/download.js <BASE_URL> get <url> [mp4|mp3|direct]  # 다운로드 후 저장된 절대경로 출력 (기본 mp4)
```

로컬 ffmpeg(서버 불필요, 결과는 항상 `<도구 실행 cwd>/temp/`(작업 디렉토리에 `ai/tool/`이 있으면 작업 디렉토리)):
```bash
node ai/tool/download.js probe <영상>                             # {"seconds","width","height"}
node ai/tool/download.js frame <영상> <시각> [--width=W]          # 특정 시점 1장. 시각은 83 또는 00:01:23
node ai/tool/download.js frames <영상> [--every=N | --count=N] [--max=30] [--width=W]
node ai/tool/download.js scenes <영상> [--threshold=0.3] [--max=30] [--width=W]
```

- `get`은 완료까지 대기하며 진행률은 stderr, **최종 저장 경로만 stdout**에 출력한다. 일반 파일 URL이면 형식 인자는 무시되고 직접 다운로드된다(`direct`).
- `frames`: 옵션이 없으면 영상 전체를 `--max`장(기본 30)으로 균등 분할. `--every=5`는 5초마다, `--count=12`는 12장 균등.
- `scenes`: 장면이 크게 바뀌는 지점만 추출. 값이 작을수록 많이 뽑힌다(0.2~0.4 권장).
- 출력은 JPG이고 경로가 한 줄씩 stdout에 나온다 → 그대로 `Read`로 열면 된다. 같은 영상·옵션으로 다시 실행하면 이전 결과 폴더를 지우고 덮어쓴다.

## 처음 실행 시 exe가 없을 때

`yt-dlp.exe`/`ffmpeg.exe`는 저장소에 들어 있지 않고, **서버가 시작될 때 백그라운드로 내려받는다**(수 초~수십 초). 그래서 새 환경에서는 서버를 켠 직후 아직 없을 수 있다.
- `get`(유튜브): 설치가 끝날 때까지 최대 3분 기다린다. 그래도 없으면 실패 메시지를 낸다. 일반 파일 URL은 exe가 필요 없어 바로 된다.
- 로컬 명령(`probe`/`frame`/...): `ffmpeg.exe`가 없으면 PATH의 `ffmpeg`로 대체하고, 그것도 없으면 "ffmpeg 없음" 메시지를 낸다. 서버를 한 번 켜서 설치되게 하거나 `<BASE_URL> status`로 `ytdlp`/`ffmpeg`가 true인지 확인한다.
- 계속 false면 GitHub 접근(네트워크/방화벽)이 막힌 것이다. 서버 콘솔의 `[Download]` 로그를 확인하고, 해결한 뒤 서버를 재시작해야 재시도된다(재시작은 사용자 승인 필요). 수동 설치 시 `artgine/external/bin/`에 두 파일을 직접 넣어도 된다.

## 영상 참조 작업 흐름

```bash
node ai/tool/download.js <BASE_URL> get "https://youtu.be/xxxx"   # → .../Downloads/2026-10-18/제목.mp4
node ai/tool/download.js probe "<위 경로>"                          # 길이 확인
node ai/tool/download.js frames "<위 경로>" --count=12 --width=960  # 훑어보기
node ai/tool/download.js frame "<위 경로>" 01:23 --width=1280       # 눈여겨본 시점만 고해상도로
```

처음엔 `--count`로 넓게 훑고, 필요한 시점만 `frame`으로 다시 뽑는 순서가 이미지 수를 줄인다.

## 주의

- **하루 1GB 상한**(`Downloads/YYYY-MM-DD/` 폴더 합계). 넘으면 서버가 거절/중단한다. 긴 영상은 `mp3`로 받거나 참조만 필요하면 짧은 영상을 고른다.
- 저장 위치는 첫 번째 루트 아래 `Downloads/날짜/`다. 영상 참조용으로 받은 파일은 작업이 끝나면 지워도 된다.
- 스크린샷은 한 번에 너무 많이 뽑지 않는다(기본 상한 30장). 이미지를 Read할 때마다 컨텍스트가 크게 소모된다. `--width`로 줄이면 도움이 된다.
- YouTube는 정책/변경으로 간헐적으로 실패할 수 있다. 서버가 시작 시 yt-dlp를 자동 업데이트하므로, 계속 실패하면 서버를 재시작해 업데이트되게 한다(재시작은 사용자 승인 필요).
- 서버 쪽 `Download/*` 엔드포인트에는 인증이 없다. 외부 노출 서버에서는 주의.
- Windows 전용(`.exe` 고정). 서버가 Linux/Mac이면 `get`은 동작하지 않지만, 로컬 명령은 PATH의 `ffmpeg`로 대체 실행된다.
- 서버를 거치지 않고 yt-dlp를 직접 쓰려면 `artgine/external/bin/yt-dlp.exe -f "bestvideo+bestaudio/best" --merge-output-format mp4 --ffmpeg-location artgine/external/bin --js-runtimes node -o "<저장경로>/%(title)s.%(ext)s" --no-playlist <url>` 형태로 실행하되, 용량 상한이 적용되지 않으니 저장 위치는 `temp/`로 한다.
