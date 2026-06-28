import type { TaskStatus } from './types';

/** Human-readable due date, e.g. "Jul 3, 2026". */
export function formatDueDate(iso: string | null): string {
  if (!iso) return 'No due date';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'No due date';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

/** A task is overdue when it has a past due date and is not yet DONE. */
export function isOverdue(iso: string | null, status: TaskStatus): boolean {
  if (!iso || status === 'DONE') return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  return d.getTime() < Date.now();
}

/** Value for an <input type="date"> (YYYY-MM-DD) from an ISO string, or ''. */
export function toDateInputValue(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}
