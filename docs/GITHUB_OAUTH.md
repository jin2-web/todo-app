# GitHub OAuth 로그인 설정

## 1. GitHub OAuth App 만들기

1. GitHub → **Settings → Developer settings → OAuth Apps → New OAuth App**
2. 입력값

| 항목 | 값 (로컬 개발) |
|---|---|
| Application name | 아무 이름 (예: `todo-app-local`) |
| Homepage URL | `http://localhost:3000` |
| Authorization callback URL | `http://localhost:3000/auth/github/callback` |

3. **Register application** → **Client ID** 복사 → **Generate a new client secret** → 시크릿 복사 (한 번만 보임)

배포 환경은 도메인마다 OAuth App을 따로 만들거나 callback URL을 그 도메인으로 바꿉니다.

## 2. 환경 변수

`.env`(또는 `.env.local`)에 추가합니다. 이 파일은 `.gitignore`에 있어 커밋되지 않습니다. 코드에는 시크릿이 없습니다.

```dotenv
GITHUB_CLIENT_ID=<Client ID>
GITHUB_CLIENT_SECRET=<Client secret>
GITHUB_CALLBACK_URL=http://localhost:3000/auth/github/callback
```

`GITHUB_CALLBACK_URL`은 OAuth App의 callback URL과 글자 하나까지 같아야 합니다. 비우면 요청 주소 기준 `<origin>/auth/github/callback`을 씁니다.

환경 변수를 바꾼 뒤에는 `npm run dev`를 다시 시작합니다.

## 3. 동작 방식

| 경로 | 역할 |
|---|---|
| `GET /auth/github` | 무작위 `state`를 쿠키(10분)에 저장하고 GitHub 인증 화면으로 이동 |
| `GET /auth/github/callback` | `state` 확인 → `code`를 access token으로 교환 → `GET https://api.github.com/user` → `users` 컬렉션에 `username`(login), `avatarUrl`(avatar_url) 저장/갱신 → 세션 생성 후 `/`로 이동 |
| `POST /auth/logout` | `sessions` 컬렉션에서 세션 문서 삭제 + 세션 쿠키 만료 → `/login` |

- 요청 권한(scope): `read:user` (공개 프로필만). GitHub access token은 저장하지 않습니다.
- 세션: 쿠키 `todo_session`(httpOnly, SameSite=Lax, 운영 환경에서 Secure, 30일). DB에는 토큰의 SHA-256 해시만 저장하고, 만료되면 TTL 인덱스가 문서를 지웁니다.
- 로그인하지 않으면 화면은 `/login`으로 이동하고, `/api/*`는 `401 UNAUTHORIZED`를 돌려줍니다.
- 할 일은 사용자별입니다. 다른 사람의 할 일 ID로 조회·수정·삭제하면 `404`입니다. 주간 계획과 1년 목표는 모든 사용자가 공유합니다.

## 4. 기존 할 일 마이그레이션

로그인 기능 이전에 만든 할 일에는 주인(`userId`)이 없어서 아무에게도 보이지 않습니다. 주인을 정해 주려면:

```bash
# 1) 앱에 GitHub로 한 번 로그인해 사용자 문서를 만든 뒤
npm run migrate:todo-owner -- --username <github-login> --dry-run   # 대상 개수만 확인
npm run migrate:todo-owner -- --username <github-login>             # 적용
```

여러 번 실행해도 안전합니다. 이미 주인이 있는 할 일은 바꾸지 않습니다.
