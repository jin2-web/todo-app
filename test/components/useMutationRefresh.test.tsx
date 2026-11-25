/** @jest-environment jsdom */
import { act, renderHook } from '@testing-library/react';
import { useMutationRefresh } from '@/hooks/useMutationRefresh';
import { ApiRequestError } from '@/lib/errors';

const refresh = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh }),
}));

beforeEach(() => {
  refresh.mockClear();
});

describe('useMutationRefresh', () => {
  it('calls router.refresh exactly once after a successful mutation', async () => {
    const { result } = renderHook(() => useMutationRefresh());
    let ok = false;
    await act(async () => {
      ok = await result.current.run(() => Promise.resolve('saved'));
    });
    expect(ok).toBe(true);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(result.current.error).toBeNull();
  });

  it('does not refresh and exposes the error when the mutation fails', async () => {
    const { result } = renderHook(() => useMutationRefresh());
    let ok = true;
    await act(async () => {
      ok = await result.current.run(() => Promise.reject(new ApiRequestError('주간 계획은 한 주에 최대 5개', 409, 'CONFLICT')));
    });
    expect(ok).toBe(false);
    expect(refresh).not.toHaveBeenCalled();
    expect(result.current.error).toBe('주간 계획은 한 주에 최대 5개');
  });
});
