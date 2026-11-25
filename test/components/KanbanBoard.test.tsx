/** @jest-environment jsdom */
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { KanbanBoard } from '@/components/KanbanBoard';
import type { TodoDto } from '@/types/domain';

const refresh = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh }),
}));

const TODO: TodoDto = {
  id: 'todo-1',
  title: '보고서 작성',
  description: '',
  date: null,
  status: 'todo',
  weeklyPlanId: null,
  createdAt: '2026-11-23T00:00:00.000Z',
  updatedAt: '2026-11-23T00:00:00.000Z',
};

function mockFetchResponse(status: number, body: unknown) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  }) as unknown as typeof fetch;
}

function columnOf(title: string): string | null {
  const card = screen.getByText(title).closest('[data-testid^="todo-"]');
  return card?.parentElement?.closest('[data-testid^="column-"]')?.getAttribute('data-testid') ?? null;
}

beforeEach(() => {
  refresh.mockClear();
});

describe('KanbanBoard', () => {
  it('renders todo / doing / done columns', () => {
    render(<KanbanBoard todos={[TODO]} plans={[]} />);
    expect(screen.getByRole('region', { name: 'Todo 컬럼' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Doing 컬럼' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Done 컬럼' })).toBeInTheDocument();
    expect(columnOf('보고서 작성')).toBe('column-todo');
  });

  it('moves the card, saves the status and refreshes once on success', async () => {
    mockFetchResponse(200, { ...TODO, status: 'done' });
    render(<KanbanBoard todos={[TODO]} plans={[]} />);

    await userEvent.selectOptions(screen.getByLabelText('보고서 작성 상태'), 'done');

    expect(columnOf('보고서 작성')).toBe('column-done');
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/todos/todo-1',
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ status: 'done' }) }),
    );
  });

  it('returns the card to its original column and shows an error when saving fails', async () => {
    mockFetchResponse(500, { error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다.' } });
    render(<KanbanBoard todos={[TODO]} plans={[]} />);

    await userEvent.selectOptions(screen.getByLabelText('보고서 작성 상태'), 'doing');

    await waitFor(() => expect(columnOf('보고서 작성')).toBe('column-todo'));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('원래 컬럼으로 되돌렸습니다');
    expect(within(screen.getByTestId('column-doing')).queryByText('보고서 작성')).not.toBeInTheDocument();
    expect(refresh).not.toHaveBeenCalled();
  });

  it('rolls back on network failure too', async () => {
    global.fetch = jest.fn().mockRejectedValue(new TypeError('Failed to fetch')) as unknown as typeof fetch;
    render(<KanbanBoard todos={[{ ...TODO, status: 'done' }]} plans={[]} />);

    await userEvent.selectOptions(screen.getByLabelText('보고서 작성 상태'), 'todo');

    await waitFor(() => expect(columnOf('보고서 작성')).toBe('column-done'));
    expect(await screen.findByRole('alert')).toHaveTextContent('서버에 연결할 수 없습니다');
  });
});
