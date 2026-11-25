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

## 배포

배포하려면 MongoDB(예: Atlas)와 운영용 GitHub OAuth App, 그리고 **HTTPS**가 필요합니다. 운영 환경(`NODE_ENV=production`)에서는 세션 쿠키에 `Secure`가 붙기 때문에 HTTP 주소로 접속하면 로그인이 유지되지 않습니다.

### 공통 준비

1. **MongoDB Atlas**
   - 운영용 DB 사용자를 만들고 연결 문자열을 `MONGODB_URI`에 넣습니다. 예: `mongodb+srv://<user>:<password>@<cluster>/todoapp`.
   - *Network Access*에 서버의 IP를 허용합니다. Vercel처럼 IP가 바뀌는 플랫폼에서는 `0.0.0.0/0`을 허용해야 합니다. 이때 DB 비밀번호를 길고 무작위한 값으로 정하세요.
2. **GitHub OAuth App** (로컬용과 따로 하나 더 만드는 것을 권장)
   - Homepage URL: `https://<도메인>`
   - Authorization callback URL: `https://<도메인>/auth/github/callback`
3. **환경 변수** — 값은 배포 플랫폼의 설정 화면에만 넣고, 저장소에는 절대 커밋하지 않습니다.

| 변수 | 값 |
|---|---|
| `MONGODB_URI` | 운영 DB 연결 문자열 |
| `GITHUB_CLIENT_ID` | 운영 OAuth App의 Client ID |
| `GITHUB_CLIENT_SECRET` | 운영 OAuth App의 Client secret |
| `GITHUB_CALLBACK_URL` | `https://<도메인>/auth/github/callback` — OAuth App에 적은 값과 글자 하나까지 같아야 합니다 |

### Vercel (권장)

1. [vercel.com/new](https://vercel.com/new)에서 이 GitHub 저장소를 가져옵니다. 프레임워크는 Next.js로 자동 인식되므로 빌드 설정은 기본값 그대로 둡니다.
2. *Settings → Environment Variables*에 위 4개 변수를 **Production** 환경으로 넣습니다.
3. 배포가 끝나면 Vercel이 준 도메인(`https://<프로젝트>.vercel.app`)을 확인합니다. 그 주소로 OAuth App의 URL과 `GITHUB_CALLBACK_URL`을 맞추고 **Redeploy**합니다. 환경 변수는 다시 배포해야 적용됩니다.
4. 이후에는 `main`에 푸시할 때마다 자동으로 다시 배포됩니다.

### 직접 운영하는 서버 (Node.js 18.17 이상)

```bash
git clone https://github.com/jin2-web/todo-app.git && cd todo-app
npm ci
# 위 4개 변수를 .env.production.local 또는 서버 환경 변수로 설정
npm run build
npm start -- -p 3000          # pm2, systemd 등으로 프로세스를 상시 실행
```

- Nginx나 Caddy 같은 리버스 프록시로 HTTPS를 붙이고 `localhost:3000`으로 넘깁니다.
- 프록시가 원래의 `Host` 헤더를 그대로 전달하게 설정합니다. 그래야 로그인 후 이동하는 주소가 올바르게 만들어집니다.

### 배포 후 확인

1. `https://<도메인>/` → `/login`으로 이동하는지
2. `https://<도메인>/api/todos` → `401`인지
3. "GitHub로 로그인" → 로그인 후 대시보드로 돌아오고 헤더에 아바타와 이름이 보이는지
4. 로그아웃 후 다시 `/login`으로 가는지

로그인 기능 이전의 할 일이 운영 DB에 있으면 [기존 할 일 마이그레이션](docs/GITHUB_OAUTH.md#4-기존-할-일-마이그레이션)을 한 번 실행합니다. 스크립트는 셸 환경 변수나 `.env`·`.env.production.local` 등에서 `MONGODB_URI`를 읽습니다. 운영 DB 주소로 실행하려면 예를 들어 `MONGODB_URI="<운영 연결 문자열>" npm run migrate:todo-owner -- --username <login> --dry-run`처럼 실행하세요.

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
