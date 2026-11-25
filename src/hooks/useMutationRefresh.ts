'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { getErrorMessage } from '@/lib/errors';

export interface MutationRunner {
  /** Runs the mutation; on success refreshes server data and returns true, on failure stores the error. */
  run: (mutation: () => Promise<unknown>) => Promise<boolean>;
  error: string | null;
  pending: boolean;
  setError: (message: string | null) => void;
}

/**
 * Every client mutation goes through here so that `router.refresh()` runs after success.
 * That re-renders server components and invalidates the client router cache, so the
 * dashboard shows fresh progress when reached through an in-app link.
 */
export function useMutationRefresh(): MutationRunner {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function run(mutation: () => Promise<unknown>): Promise<boolean> {
    setPending(true);
    setError(null);
    try {
      await mutation();
      router.refresh();
      return true;
    } catch (caught) {
      setError(getErrorMessage(caught));
      return false;
    } finally {
      setPending(false);
    }
  }

  return { run, error, pending, setError };
}
