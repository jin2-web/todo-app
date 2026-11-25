# 할 일 관리 앱

1년 목표 → 주간 계획 → 할 일을 연결하고, 할 일 상태로 주간 진행률을 자동 계산합니다.
요구 사항은 `docs/PRD.md`, 구현 계획은 `docs/PLAN.md`에 있습니다.

## 스택

Next.js 14 (App Router, Route Handlers) · TypeScript · MongoDB (Mongoose) · zod · @dnd-kit · Jest + Testing Library + mongodb-memory-server

## 실행

```bash
npm install
cp .env.example .env.local   # MONGODB_URI, GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET 설정
npm run dev                  # http://localhost:3000
```

GitHub OAuth App 만드는 법과 로그인 동작은 [`docs/GITHUB_OAUTH.md`](docs/GITHUB_OAUTH.md)에 있습니다.
로그인 기능 전에 만든 할 일은 `npm run migrate:todo-owner -- --username <github-login>`으로 주인을 지정합니다.

## 스크립트

| 명령 | 내용 |
|---|---|
| `npm run dev` | 개발 서버 |
| `npm run build` / `npm start` | 프로덕션 빌드 / 실행 |
| `npm test` | 단위 + API 통합(메모리 MongoDB) + 컴포넌트 테스트 |
| `npm run lint` | ESLint (`any`, `console`, 화살표 함수 변수 금지 포함) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run migrate:todo-owner -- --username <login> [--dry-run]` | 주인 없는 기존 할 일을 한 사용자에게 배정 |

## 화면

| 경로 | 내용 |
|---|---|
| `/` | 이번 주(월요일 시작, KST) 계획과 계획별 진행률 |
| `/board` | 칸반 보드 — 드래그 앤 드롭 또는 상태 선택으로 이동, 저장 실패 시 원래 컬럼으로 복귀 |
| `/plans` | 주 단위 주간 계획 (주당 최대 5개), 요일별 할 일 배치 |
| `/goals` | 1년 목표 |
| `/login` | GitHub 로그인 (로그인하지 않으면 위 화면은 모두 여기로 이동) |

## 인증

| Method | Path | 내용 |
|---|---|---|
| GET | `/auth/github` | GitHub 인증 화면으로 이동 |
| GET | `/auth/github/callback` | 로그인 완료 처리, 세션 쿠키 발급 |
| POST | `/auth/logout` | 세션 삭제 + 쿠키 만료 |

## API

모든 `/api/*`는 로그인이 필요합니다(없으면 401). 할 일은 본인 것만 보이고, 다른 사람의 할 일 ID는 404입니다.

| Method | Path |
|---|---|
| GET / POST | `/api/goals` |
| GET / PATCH / DELETE | `/api/goals/:id` |
| GET / POST | `/api/weekly-plans?week=YYYY-MM-DD` |
| GET / PATCH / DELETE | `/api/weekly-plans/:id` |
| GET / POST | `/api/todos?weeklyPlanId=&status=` |
| GET / PATCH / DELETE | `/api/todos/:id` |
| GET | `/api/dashboard` |

오류 응답: `{ "error": { "code": "...", "message": "..." } }` (400 검증, 401 로그인 필요, 404 없음, 409 충돌)

## 규칙 요약

- 진행률 = `Math.round(done / 연결된 전체 × 100)`, 할 일 0개면 0%. 저장하지 않고 조회 시 계산합니다.
- 주간 계획에 연결된 할 일의 날짜는 그 계획의 주 안이어야 합니다.
- 목표·주간 계획을 삭제하면 하위 항목은 남고 연결만 해제됩니다.
