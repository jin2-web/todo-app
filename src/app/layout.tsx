import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import type { ReactNode } from 'react';
import { MainNav } from '@/components/MainNav';
import { getPageUser } from '@/lib/auth/current';
import './globals.css';

// DESIGN.md: Inter is the open-source substitute for the brand variable font.
const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-inter' });

export const metadata: Metadata = {
  title: '할 일 관리',
  description: '1년 목표 → 주간 계획 → 할 일을 연결해 관리합니다.',
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const user = await getPageUser();
  return (
    <html lang="ko" className={inter.variable}>
      <body>
        <header className="site-header">
          <div className="site-header-inner">
            <span className="brand">할 일 관리</span>
            {user && <MainNav />}
            {user && (
              <div className="user-menu">
                {user.avatarUrl && (
                  // eslint-disable-next-line @next/next/no-img-element -- avatar from GitHub; no next/image remote config needed
                  <img src={user.avatarUrl} alt="" width={32} height={32} className="avatar" />
                )}
                <span className="username">{user.username}</span>
                <form action="/auth/logout" method="post">
                  <button type="submit" className="secondary">
                    로그아웃
                  </button>
                </form>
              </div>
            )}
          </div>
        </header>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
