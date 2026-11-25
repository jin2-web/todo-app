'use client';

import { useEffect } from 'react';
import { logger } from '@/lib/logger';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(
    function reportError() {
      logger.error('Page render failed', { error, digest: error.digest });
    },
    [error],
  );

  return (
    <section className="panel">
      <h1>데이터를 불러오지 못했습니다</h1>
      <p className="muted">MongoDB가 실행 중이고 MONGODB_URI가 설정되어 있는지 확인하세요.</p>
      <button type="button" onClick={reset}>
        다시 시도
      </button>
    </section>
  );
}
