import { calculateProgress } from '@/lib/progress';

describe('calculateProgress', () => {
  it('is 0 when there are no todos', () => {
    expect(calculateProgress(0, 0)).toBe(0);
  });

  it('rounds with Math.round', () => {
    expect(calculateProgress(1, 3)).toBe(33);
    expect(calculateProgress(2, 3)).toBe(67);
  });

  it('is 25 for 1 of 4 and 100 when all are done', () => {
    expect(calculateProgress(1, 4)).toBe(25);
    expect(calculateProgress(3, 3)).toBe(100);
  });
});
