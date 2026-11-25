/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TodoForm } from '@/components/TodoForm';
import type { WeeklyPlanDto } from '@/types/domain';

const PLAN: WeeklyPlanDto = {
  id: 'plan-1',
  title: '계획',
  weekStart: new Date('2026-11-23T00:00:00+09:00').toISOString(),
  goalId: null,
  totalTodos: 0,
  doneTodos: 0,
  progress: 0,
  createdAt: '2026-11-23T00:00:00.000Z',
  updatedAt: '2026-11-23T00:00:00.000Z',
};

describe('TodoForm', () => {
  it('shows an error and does not submit when the title is empty', async () => {
    const onSubmit = jest.fn().mockResolvedValue(true);
    render(<TodoForm plans={[PLAN]} submitLabel="추가" onSubmit={onSubmit} />);

    await userEvent.click(screen.getByRole('button', { name: '추가' }));

    expect(screen.getByRole('alert')).toHaveTextContent('제목을 입력하세요.');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits trimmed values and clears the form', async () => {
    const onSubmit = jest.fn().mockResolvedValue(true);
    render(<TodoForm plans={[PLAN]} submitLabel="추가" onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText('제목'), '  책 읽기  ');
    await userEvent.selectOptions(screen.getByLabelText('주간 계획'), 'plan-1');
    await userEvent.click(screen.getByRole('button', { name: '추가' }));

    expect(onSubmit).toHaveBeenCalledWith({ title: '책 읽기', description: '', date: null, weeklyPlanId: 'plan-1' });
    expect(screen.getByLabelText('제목')).toHaveValue('');
  });

  it('limits the date picker to the selected plan week', async () => {
    render(<TodoForm plans={[PLAN]} defaultPlanId="plan-1" submitLabel="추가" onSubmit={jest.fn()} />);
    const dateInput = screen.getByLabelText('날짜');
    expect(dateInput).toHaveAttribute('min', '2026-11-23');
    expect(dateInput).toHaveAttribute('max', '2026-11-29');
  });
});
