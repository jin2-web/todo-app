/** Weekly progress in percent: Math.round(done / total * 100), 0 when total is 0. */
export function calculateProgress(done: number, total: number): number {
  if (total <= 0) {
    return 0;
  }
  return Math.round((done / total) * 100);
}
