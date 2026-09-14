# 배포 인계 — 실행 완료가 아닌 준비 상태

## 현재 상태

UI 및 튜토리얼 구현과 로컬 테스트는 완료했습니다. 공개 URL, Render 서비스, GitHub 저장소는 이 작업에서 생성하지 않았습니다. Render 연결 여부를 조회했지만 현재 대화에 Render의 서비스 조회·배포 도구가 노출되지 않아 원격 배포를 실행하지 못했습니다. API 키나 비밀번호는 채팅에 적을 필요가 없습니다.

## 다음 작업자가 사용할 설정

- 프로젝트 루트: 이 문서와 `server.mjs`가 있는 폴더.
- 런타임: Node.js 22 이상. 현재 로컬 검증은 22.16.0.
- 서비스: 정적 사이트가 아닌 Node 웹 서비스.
- 빌드: `node build.mjs`
- 시작: `node server.mjs`
- 상태 확인: `GET /api/health`, JSON의 `ok: true`, `app: cloud-pick` 확인.
- HTML: 같은 서비스의 `/`에서 `public/index.html` 제공.
- 네트워크: `HOST=0.0.0.0`, 플랫폼 제공 `PORT` 사용.
- 방과 세션은 메모리 저장. 인스턴스는 하나만 운영. DB, Redis, 디스크, 유료 리소스는 생성하지 않음.

`render.yaml`에 `runtime: node`, `plan: free`, `region: singapore`, 상태 확인 경로를 명시했습니다. 적용 전에 같은 이름의 기존 서비스가 없는지 확인하세요. 무료 플랜의 사용 가능 여부와 계정 사용량은 실제 계정 화면에서 확인해야 하며, 비용이 발생하는 변경은 사용자 승인을 받으세요.

## 연결 문제를 넘겨서 이어가기

OpenAI 공식 안내는 앱이 연결됨으로 보여도 현재 대화·모델·제품 화면에서는 사용할 수 없는 경우가 있다고 설명합니다. 이런 경우 새 대화에서 해당 앱을 선택해 지원되는 작업을 시도하고, 문제가 계속되면 재연결을 반복하지 않도록 안내합니다.

새 대화에서 이 ZIP을 첨부하고 Render 앱을 선택한 다음 아래처럼 요청하면 필요한 맥락을 전달할 수 있습니다.

> 첨부한 Cloud Pick After Dark UX 버전을 Render 무료 플랜으로 배포해줘. 공개 전 코드를 확인하고, 기존 동명 서비스를 덮어쓰지 마. 유료 자원은 만들기 전에 물어봐. 배포 후 상태 확인 경로와 4인 멀티플레이를 점검해서 접속 주소를 알려줘. HTML만 올리는 정적 호스팅이 아니라 동봉된 Node 서버가 필요해.

## 배포 후 확인

첫 화면에서 시작하기/배우기, 4단계 튜토리얼, 친구 방 만들기/코드 참가, 다른 두 브라우저 또는 기기 사이의 실시간 결과, 재접속을 확인해야 합니다. 로컬 테스트 통과는 공개 네트워크 검증을 대신하지 않습니다.

## 공식 문서 (2026-09-14 확인)

- Render Blueprint 사양: https://render.com/docs/blueprint-spec
- Render 웹 서비스: https://render.com/docs/web-services
- Render 무료 서비스 범위와 한계: https://render.com/docs/free
- OpenAI 앱 문제 해결: https://help.openai.com/en/articles/20001497-troubleshooting-apps-in-chatgpt
- OpenAI 연결된 앱 사용: https://help.openai.com/en/articles/20001494
