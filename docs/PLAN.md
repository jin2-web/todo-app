# 할 일 관리 앱 — 프로젝트 계획

- 상태: **Phase 0~6 구현 완료** (2026-11-25) — lint·typecheck·test(44개)·build 통과, 메모리 MongoDB로 HTTP 점검 완료. 실제 MongoDB에서 하는 브라우저 수동 시나리오(§7-4)는 아직 하지 않음. Phase 7(P1)은 하지 않음
- 근거 문서: `docs/PRD.md`
- 작성일: 2026-11-25
- 개정: 리뷰 피드백 3건 반영 (할 일 날짜–주 일치 검증, 주간 계획 수정 시 5개 제한, 클라이언트 라우터 캐시 갱신)

---

## 1. 요구 사항 요약

| 구분 | 결정 |
|---|---|
| 범위 | PRD P0 전체 (P1은 Phase 7로 분리, 이번 범위 밖) |
| 스택 | Next.js 14 (App Router) + TypeScript + MongoDB + Next.js API Routes (Route Handlers) |
| ODM | Mongoose (기본값 — 스키마 검증·`ObjectId` 참조·`updateMany` 연결 해제에 적합) |
| 사용자 | 단일 사용자, 인증 없음 (확장 시 `userId` 필드 추가) |
| 테스트 | Jest + Testing Library + `mongodb-memory-server` |
| 컨벤션 (`../CLAUDE.md`) | named function, 커스텀 에러 클래스, `any` 금지, `console.log` 대신 logger, Conventional Commits, `.env` 커밋 금지 |

### PRD 모호점 → 해석 (가정)

| PRD 항목 | 해석 |
|---|---|
| "이번 주" | 월요일 시작 주, `Asia/Seoul` 기준. 주간 계획은 `weekStart`(해당 주 월요일 00:00) 필드로 식별 |
| 주당 최대 5개 | 같은 `weekStart`의 주간 계획이 5개면 생성 시, 그리고 `weekStart`를 다른 주로 바꾸는 수정 시 `409 Conflict` (자기 자신은 count에서 제외) |
| 요일별 할 일 배치 | 할 일의 `date` 필드로 요일 결정. 주간 계획 화면에서 월~일 7칸으로 그룹핑. `date` 없는 연결 할 일은 그리드 아래 **미배치** 영역에 표시 |
| 할 일 날짜–주간 계획 일치 | 주간 계획에 연결된 할 일의 `date`는 해당 계획의 주(`weekStart` ~ +6일, KST) 안이어야 함. 벗어나면 `400 Validation`. 생성·수정(날짜 변경, 연결 변경) 모두 검사 |
| 주간 계획 주 변경 시 기존 할 일 | `weekStart` 수정으로 연결된 할 일의 `date`가 새 주를 벗어나면 `409 Conflict` (할 일을 먼저 옮기거나 연결 해제하도록 안내) |
| 진행률 자동 반영 | **저장하지 않고 조회 시 계산** (aggregation). 갱신 시점 4가지(생성/삭제/상태/연결 변경)를 구조적으로 자동 충족 |
| 상위 삭제 시 연결 해제 | 하위 문서의 참조 필드 `$unset` 후 상위 삭제 (해제 → 삭제 순서, 재시도해도 안전) |
| 1년 목표 | `year`(number) 필드 보유 |

---

## 2. 데이터 모델

```
Goal        { _id, title*, description?, year*, createdAt, updatedAt }
WeeklyPlan  { _id, title*, weekStart* (Date, 월요일), goalId? -> Goal, createdAt, updatedAt }
Todo        { _id, title*, description?, date?, status* ('todo'|'doing'|'done', 기본 'todo'),
              weeklyPlanId? -> WeeklyPlan, createdAt, updatedAt }
```
- 인덱스: `WeeklyPlan.weekStart`, `Todo.weeklyPlanId`, `Todo.status`
- 관계: Todo N:1 WeeklyPlan, WeeklyPlan N:1 Goal, 미연결 허용

---

## 3. 디렉터리 구조

```
05/
├─ docs/ (PRD.md, PLAN.md)
├─ .env.example            # MONGODB_URI (실제 .env는 .gitignore)
├─ jest.config.ts
└─ src/
   ├─ lib/
   │  ├─ db.ts             # Mongoose 연결 캐시 (dev HMR 대응)
   │  ├─ logger.ts         # 프로젝트 logger
   │  ├─ errors.ts         # AppError, ValidationError(400), NotFoundError(404), ConflictError(409)
   │  ├─ http.ts           # 에러 → NextResponse 변환 (handleRouteError)
   │  ├─ week.ts           # getWeekStart(date), isSameWeek
   │  └─ progress.ts       # calculateProgress(done, total) 순수 함수
   ├─ models/              # Goal.ts, WeeklyPlan.ts, Todo.ts
   ├─ schemas/             # zod 입력 검증 스키마
   ├─ services/            # goalService.ts, weeklyPlanService.ts, todoService.ts, dashboardService.ts
   ├─ app/
   │  ├─ api/
   │  │  ├─ goals/route.ts, goals/[id]/route.ts
   │  │  ├─ weekly-plans/route.ts, weekly-plans/[id]/route.ts
   │  │  ├─ todos/route.ts, todos/[id]/route.ts
   │  │  └─ dashboard/route.ts
   │  ├─ page.tsx          # 대시보드
   │  ├─ board/page.tsx    # 칸반
   │  ├─ plans/page.tsx    # 주간 계획 (요일별)
   │  └─ goals/page.tsx    # 1년 목표
   └─ components/          # KanbanBoard, KanbanColumn, TodoCard, TodoForm,
                           # WeeklyPlanCard, WeekdayGrid, ProgressBar, GoalForm
```

### API 명세

| Method | Path | 설명 |
|---|---|---|
| GET/POST | `/api/goals` | 목록 / 생성 |
| GET/PATCH/DELETE | `/api/goals/:id` | 단건 / 수정 / 삭제(하위 WeeklyPlan `goalId` 해제) |
| GET/POST | `/api/weekly-plans?week=YYYY-MM-DD` | 주 단위 목록(진행률 포함) / 생성(주당 5개 제한) |
| GET/PATCH/DELETE | `/api/weekly-plans/:id` | 단건(진행률 포함) / 수정(`weekStart` 변경 시 5개 제한·하위 할 일 날짜 검사, 위반 시 409) / 삭제(하위 Todo `weeklyPlanId` 해제) |
| GET/POST | `/api/todos?weeklyPlanId=&status=` | 목록 / 생성(기본 `todo`) |
| GET/PATCH/DELETE | `/api/todos/:id` | 단건 / 수정(상태·연결 포함, 날짜–주 불일치 시 400) / 삭제 |
| GET | `/api/dashboard` | 이번 주 계획 + 계획별 진행률 |

에러 응답 형식: `{ error: { code: string, message: string } }`

---

## 4. 구현 단계

### Phase 0 — 프로젝트 셋업
- `create-next-app` (TS, App Router, ESLint), `mongoose`, `zod`, `@dnd-kit/core`, `@dnd-kit/sortable`
- 개발 의존성: `jest`, `ts-jest` 또는 `next/jest`, `@testing-library/react`, `@testing-library/jest-dom`, `mongodb-memory-server`
- ESLint: `@typescript-eslint/no-explicit-any: error`, `no-console: error`, `prefer-arrow-callback` 대신 `func-style: ['error', 'declaration']`
- `.gitignore`에 `.env*` (단 `.env.example` 제외)
- **완료 조건**: `npm run build`, `npm run lint`, `npm test` 모두 통과 (빈 테스트 1개)

### Phase 1 — 도메인 기반 (lib + models)
- `errors.ts`, `logger.ts`, `http.ts`, `week.ts`, `progress.ts`, `db.ts`, 3개 모델
- **단위 테스트**
  - `calculateProgress(0, 0) === 0`, `(1, 3) === 33`(반올림 규칙 명시: `Math.round`), `(3, 3) === 100`
  - `getWeekStart`: 일요일 23:59 KST → 직전 월요일, 월요일 00:00 KST → 당일

### Phase 2 — 서비스 + API Routes
- 서비스 계층에 비즈니스 규칙 집중 (Route Handler는 파싱·검증·응답만)
- 규칙: 주당 5개 제한(생성·`weekStart` 수정 모두), 연결 대상 존재 확인(없는 `weeklyPlanId`/`goalId` → 404), 할 일 `date`–주간 계획 주 일치 검증, 삭제 시 하위 연결 해제, 진행률 aggregation
- **통합 테스트** (`mongodb-memory-server`)
  - 할 일 CRUD, 제목 누락 시 400
  - 같은 주 6번째 주간 계획 생성 → 409
  - 다른 주 계획의 `weekStart`를 5개 찬 주로 수정 → 409, 자기 주 안에서 제목만 수정 → 200
  - 주간 계획 주 밖의 `date`로 할 일 생성 / 날짜 수정 / 연결 변경 → 각각 400
  - 경계값: 계획 주의 월요일 00:00 KST·일요일 23:59 KST 날짜 → 허용
  - 연결된 할 일의 날짜를 벗어나게 하는 `weekStart` 수정 → 409
  - 주간 계획 삭제 → 연결된 할 일 남아 있고 `weeklyPlanId` 없음
  - 1년 목표 삭제 → 주간 계획 남아 있고 `goalId` 없음
  - 진행률: 할 일 0개 → 0, done 1/4 → 25, 상태 변경·삭제·연결 변경 직후 조회 값 반영

### Phase 3 — CRUD 화면 (목표 / 주간 계획 / 할 일)
- `/goals`: 목표 목록·생성·수정·삭제
- `/plans`: 주 선택(이전/다음 주), 계획 카드 + 진행률, 월~일 7칸 요일 그리드에 할 일 배치, `date` 없는 연결 할 일은 미배치 영역에 표시, 목표 연결 선택
- `TodoForm`의 날짜 선택 범위를 선택된 주간 계획의 주로 제한 (서버 400은 최종 방어선)
- `TodoForm`: 제목(필수), 설명, 날짜, 주간 계획 선택(미연결 가능)
- **컴포넌트 테스트**: TodoForm 제목 비우고 제출 시 오류 표시·API 미호출

### Phase 4 — 칸반 드래그 앤 드롭
- `/board`: todo/doing/done 3컬럼, `@dnd-kit` 사용, 모든 방향 이동 허용
- 낙관적 업데이트 → `PATCH /api/todos/:id {status}` → 성공 시 `router.refresh()` 호출 / 실패 시 원래 컬럼 복귀 + 토스트 오류
- 할 일 생성·수정·삭제·연결 변경 등 모든 클라이언트 변경 성공 후에도 `router.refresh()` 호출 (공통 훅 `useMutationRefresh`로 통일)
- 키보드 센서 활성화 (접근성)
- **컴포넌트 테스트**: fetch 실패 mock 시 카드가 원래 컬럼으로 돌아오고 오류 메시지 노출

### Phase 5 — 대시보드
- `/`: 이번 주 계획 목록 + 계획별 `ProgressBar` (0~100%)
- 대시보드는 서버 컴포넌트 + `export const dynamic = 'force-dynamic'`으로 서버 캐시 배제
- 클라이언트 라우터 캐시(App Router, 동적 페이지 약 30초 유지)는 서버 측 `revalidatePath`만으로 무효화되지 않으므로, 변경 성공 시 `router.refresh()`로 갱신 (Phase 4 공통 훅)
- **컴포넌트 테스트**: 상태 변경 성공 시 `router.refresh` 1회 호출, 실패 시 미호출 (`next/navigation` mock)

### Phase 6 — 검증 및 정리
- 전체 테스트·린트·빌드, 수동 시나리오(아래 §7) 실행
- `docs/PLAN.md` 진행 상황 갱신

### Phase 7 — P1 (이번 범위 밖, 별도 승인)
- 우선순위(High/Medium/Low), 마감일, 1년 목표 진행률(연결된 주간 계획 진행률 평균), 주간 메모, 주간 회고

---

## 5. 인수 조건 (Acceptance Criteria)

1. 할 일을 제목만으로 생성하면 상태가 `todo`로 저장된다; 제목 없으면 400
2. 할 일 수정·삭제가 API와 UI 모두에서 동작한다
3. 칸반에서 임의의 컬럼 → 다른 컬럼 이동이 6가지 방향 모두 저장된다 (새로고침 후 유지)
4. 상태 저장 API 실패 시 카드가 원래 컬럼으로 돌아가고 오류가 표시된다
5. 같은 주에 주간 계획 6번째 생성 시, 또는 `weekStart` 수정으로 5개 찬 주로 옮길 시 409와 UI 오류 메시지
6. 할 일에 `date`가 있으면 주간 계획 화면의 해당 요일 칸에, 없으면 미배치 영역에 표시된다
7. 1년 목표 삭제 후 연결됐던 주간 계획이 남아 있고 미연결 상태다
8. 주간 계획 삭제 후 연결됐던 할 일이 남아 있고 미연결 상태다
9. 진행률 = `Math.round(done / total × 100)`, total 0이면 0%
10. 할 일 생성/삭제/상태 변경/연결 변경 직후, 앱 내 링크로 대시보드에 이동하면(새로고침 없이) 진행률이 바뀌어 있다
11. 대시보드에 이번 주(월요일 시작, KST) 계획만 표시된다
12. 주간 계획에 연결된 할 일의 `date`가 그 계획의 주(월~일, KST) 밖이면 생성·수정이 400으로 거부된다
13. `grep -r "console.log" src` 결과 0건, `any` 사용 0건 (ESLint 통과)

---

## 6. 리스크와 대응

| 리스크 | 영향 | 대응 |
|---|---|---|
| 주 경계 시간대 오류 (UTC vs KST) | 일요일 밤 할 일이 다른 주로 집계 | `week.ts`에 시간대 고정, 경계 단위 테스트 |
| MongoDB 단일 노드는 트랜잭션 불가 | 연결 해제 후 삭제 중간 실패 | 해제 → 삭제 순서 (재실행해도 안전), 실패 시 logger 기록 |
| 주당 5개 제한 경쟁 조건 | 동시 요청 시 6개 | 단일 사용자라 허용 가능; 서비스에서 count 후 생성 |
| 할 일 날짜와 주간 계획 주 불일치 | 요일 그리드 누락, 다른 주 할 일이 진행률에 집계 | 서비스 계층 검증(400/409) + 폼 날짜 범위 제한 + 경계 테스트 |
| 클라이언트 라우터 캐시 | 대시보드에 이전 진행률 표시 | 변경 성공 후 `router.refresh()` 공통 훅, 컴포넌트 테스트 |
| 드래그 연속 이동 시 응답 순서 꼬임 | UI와 DB 상태 불일치 | 카드별 요청 진행 중이면 최신 요청만 반영 (요청 id 비교) |
| `mongodb-memory-server` Windows 바이너리 다운로드 실패 | 통합 테스트 불가 | 최초 실행 시 다운로드 확인, 실패 시 로컬/Docker MongoDB URI로 대체 |
| Next.js dev HMR로 Mongoose 연결·모델 중복 | `OverwriteModelError` | `global` 연결 캐시, `models.X ?? model(...)` 패턴 |

---

## 7. 검증 단계

1. `npm run lint` — 에러 0
2. `npm test` — 단위·통합·컴포넌트 테스트 전부 통과
3. `npm run build` — 성공
4. 수동 시나리오 (`npm run dev` + 로컬 MongoDB):
   1. 목표 생성 → 이번 주 계획 2개 생성(목표 연결) → 각 계획에 할 일 2개씩
   2. 대시보드 진행률 0% 확인 → 칸반에서 1개 done → **상단 링크로** 대시보드 이동(새로고침 없이) → 해당 계획 50%
   3. done → todo로 되돌리기 → 0%
   4. 네트워크 차단(DevTools offline) 후 드래그 → 원래 컬럼 복귀 + 오류
   5. 주간 계획 삭제 → 할 일이 칸반에 남고 미연결 표시
   6. 이번 주 계획 5개 상태에서 추가 → 오류 / 다음 주 계획의 주를 이번 주로 변경 → 오류
   7. 주간 계획에 연결된 할 일의 날짜를 다음 주로 변경 → 오류, 날짜 비우기 → 미배치 영역에 표시

---

## 8. 커밋 단위 (Conventional Commits)

- `chore: scaffold Next.js project with lint and test setup`
- `feat: add domain models, errors, logger, week and progress utils`
- `feat: add goals, weekly plans, todos API routes`
- `feat: add goals and weekly plan pages`
- `feat: add kanban board with drag and drop`
- `feat: add dashboard with weekly progress`
- `test: ...` (각 단계 테스트는 해당 feat 커밋에 포함하거나 별도)
