import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { getPageUser } from '@/lib/auth/current';
import './globals.css';

export const metadata: Metadata = {
  title: '할 일 관리',
  description: '1년 목표 → 주간 계획 → 할 일을 연결해 관리합니다.',
};

const NAV_ITEMS = [
  { href: '/', label: '대시보드' },
  { href: '/board', label: '칸반' },
  { href: '/plans', label: '주간 계획' },
  { href: '/goals', label: '1년 목표' },
];

export default async function RootLayout({ children }: { children: ReactNode }) {
  const user = await getPageUser();
  return (
    <html lang="ko">
      <body>
        <header className="site-header">
          <span className="brand">할 일 관리</span>
          {user && (
            <nav aria-label="주 메뉴">
              {NAV_ITEMS.map((item) => (
                <Link key={item.href} href={item.href}>
                  {item.label}
                </Link>
              ))}
            </nav>
          )}
          {user && (
            <div className="user-menu">
              {user.avatarUrl && (
                // eslint-disable-next-line @next/next/no-img-element -- avatar from GitHub; no next/image remote config needed
                <img src={user.avatarUrl} alt="" width={28} height={28} className="avatar" />
              )}
              <span>{user.username}</span>
              <form action="/auth/logout" method="post">
                <button type="submit" className="secondary">
                  로그아웃
                </button>
              </form>
            </div>
          )}
        </header>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
