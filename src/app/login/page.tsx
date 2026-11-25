import { redirect } from 'next/navigation';
import { getPageUser } from '@/lib/auth/current';

export const dynamic = 'force-dynamic';

const ERROR_MESSAGES: Record<string, string> = {
  access_denied: 'GitHub 로그인이 취소되었습니다.',
  invalid_state: '로그인 요청이 만료되었거나 올바르지 않습니다. 다시 시도하세요.',
  oauth_token_failed: 'GitHub 인증 코드 교환에 실패했습니다.',
  oauth_profile_failed: 'GitHub 사용자 정보를 가져오지 못했습니다.',
  configuration_error: '서버에 GitHub OAuth 설정이 없습니다. 관리자에게 문의하세요.',
};

interface LoginPageProps {
  searchParams: { error?: string };
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  if (await getPageUser()) {
    redirect('/');
  }
  const message = searchParams.error ? (ERROR_MESSAGES[searchParams.error] ?? '로그인에 실패했습니다.') : null;

  return (
    <section className="panel login">
      <h1>로그인</h1>
      <p className="muted">할 일을 보려면 GitHub 계정으로 로그인하세요.</p>
      {message && (
        <p role="alert" className="error">
          {message}
        </p>
      )}
      {/* Plain anchor: /auth/github is a Route Handler that redirects to GitHub. */}
      <a className="button" href="/auth/github">
        GitHub로 로그인
      </a>
    </section>
  );
}
