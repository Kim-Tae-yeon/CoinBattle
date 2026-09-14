# 검증 보고서 — AFTER DARK UX VOL.03

## 요약

2026-09-14 작업 컨테이너에서 점검했습니다. 브라우저 UX 확인 45항목을 통과했고, 별도 Node 테스트에서 실제 HTTP/SSE 클라이언트 4개로 9개 프로토콜 시나리오를 통과했습니다. Node 러너는 상위 테스트를 포함해 `tests 10, pass 10, fail 0`으로 보고했습니다. 공개 인터넷 배포를 수행했다는 의미는 아닙니다.

## 실행 환경과 방법

- Node.js 22.16.0. 서버·게임 규칙은 기존 After Dark 코드와 동일합니다.
- Python Playwright + `/usr/bin/chromium`, headless.
- 이 환경의 Chromium은 URL 탐색을 정책으로 차단해 로컬 웹 주소나 file URL로 직접 탐색하지 못했습니다. 따라서 브라우저 테스트는 생성한 HTML을 `page.set_content`로 로드했습니다. 코드의 UI·튜토리얼·로컬 게임을 실행했고, 가상 시계로 타이머 시나리오를 검증했습니다.
- about:blank의 저장소 제한 때문에 브라우저 테스트에만 메모리 저장소 fixture를 사용했습니다. 실제 사용자 브라우저의 영구 저장 및 파일 더블클릭 로드는 별도 검증 대상입니다.
- 네트워크 기능은 모의 응답이 아닌 별도 실제 Node HTTP/SSE 클라이언트 테스트로 점검했습니다. 이것은 두 실제 브라우저를 공개 서버에 연결한 종단간 테스트와는 다릅니다.

## 브라우저 UX 점검

1. PASS — Home discloses only start, learn and menu; no name field or settings
2. PASS — Lesson 1 has no deadline and only target 1 is enabled
3. PASS — Lesson 1 awards exactly 2 coins on a unique cloud
4. PASS — Lesson 2 selects only center, with all other controls disabled
5. PASS — Lesson 2 guarantees a collision but keeps previously earned coins
6. PASS — Lesson 3 requires trying a different selection before lock
7. PASS — First provisional selection does not move the character or reveal rivals
8. PASS — Changing selection enables confirm
9. PASS — Lesson 3 preserves the changed and locked destination
10. PASS — Lesson 4 waits for the player to start the timer
11. PASS — Tutorial menu pauses time and does not resolve the lesson
12. PASS — On timeout, the last unconfirmed choice is applied
13. PASS — No selection gives zero, with retry offered
14. PASS — Tutorial completion screen offers practice or friends, and marks completion
15. PASS — Friends setup explains missing server rather than failing on click
16. PASS — Rules are configured in a secondary dialog, not on the home screen
17. PASS — Practice begins at 0 without tutorial scores
18. PASS — In-game room settings and history do not clutter the main screen
19. PASS — Reduced motion can be toggled
20. PASS — Sound can be muted
21. PASS — Practice menu pauses the local game
22. PASS — Keyboard 1 + Enter selects and confirms the legal cloud
23. PASS — Practice completes to a separate result screen with a replay CTA
24. PASS — Replay resets the game to round 1 and zero scores
25. PASS — Home fits viewport width 320
26. PASS — Tutorial controls fit viewport width 320
27. PASS — Play screen fits viewport width 320
28. PASS — Core selection targets are >=44px at 320
29. PASS — Home fits viewport width 390
30. PASS — Tutorial controls fit viewport width 390
31. PASS — Play screen fits viewport width 390
32. PASS — Core selection targets are >=44px at 390
33. PASS — Home fits viewport width 768
34. PASS — Tutorial controls fit viewport width 768
35. PASS — Play screen fits viewport width 768
36. PASS — Core selection targets are >=44px at 768
37. PASS — Home fits viewport width 1024
38. PASS — Tutorial controls fit viewport width 1024
39. PASS — Play screen fits viewport width 1024
40. PASS — Core selection targets are >=44px at 1024
41. PASS — Home fits viewport width 1440
42. PASS — Tutorial controls fit viewport width 1440
43. PASS — Play screen fits viewport width 1440
44. PASS — Core selection targets are >=44px at 1440
45. PASS — No unhandled browser JavaScript errors

## 실제 4인 프로토콜 점검

1. 같은 방에 인간 클라이언트 4개 참가, 모두 SSE 수신.
2. 공개 전 다른 사람의 임시 선택은 전달되지 않음.
3. 4명 모두 가운데를 선택하면 모두 0코인.
4. 서로 다른 구름은 표시된 코인을 정확히 지급, 전원 총점 일치.
5. 참가 토큰을 사용한 상태 조회와 재접속으로 같은 자리 유지.
6. 도달할 수 없는 구름 선택 거부.
7. 미선택으로 제한 시간이 끝나면 모두 0코인.
8. 경기 완료 후 누적 점수와 라운드 기록 일치.
9. 방장 연결 해제 시 권한 이전, 새 방장이 재대결 시작 가능.

## 점검 중 수정한 사항

메뉴 닫힘 이벤트와 바로 뒤따르는 키보드 입력 사이의 짧은 경쟁 상태를 수정했습니다. Escape로 닫을 때도 로컬 타이머를 즉시 재개하고, 정지된 메뉴 뒤에서 결과 표시가 먼저 끝나지 않도록 착지 후 표시를 별도로 처리했습니다.

## 아직 확인하지 않은 것

공개 Render 배포, 실제 서로 다른 네트워크의 기기 연결, Safari/iOS 실기기, 실제 화면 읽기 프로그램, 실사용자의 학습 성공률, 대규모 접속 및 장시간 부하, OS 수준 오디오 재생 품질, 모든 브라우저의 저장소 정책은 검증하지 않았습니다.

## 재현

```sh
node build.mjs
npm test
# 선택 사항: Python playwright와 Chromium이 준비된 테스트 환경에서
python tests/ux_browser_test.py
# 시스템 Chromium 위치를 지정해야 한다면 CHROMIUM_PATH 환경 변수 사용
```

스크린샷 및 JSON은 `tests/artifacts/`에 생성됩니다. npm 의존성은 필요 없지만 브라우저 검증용 Python 패키지와 브라우저는 별도 테스트 도구입니다.
