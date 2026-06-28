import { cn } from '@/lib/cn';
import { Priority, TaskStatus, STATUS_LABELS, PRIORITY_LABELS } from '@/lib/types';

const PRIORITY_STYLES: Record<Priority, string> = {
  HIGH: 'bg-red-100 text-red-700',
  MEDIUM: 'bg-yellow-100 text-yellow-700',
  LOW: 'bg-green-100 text-green-700',
};

const STATUS_STYLES: Record<TaskStatus, string> = {
  TODO: 'bg-gray-100 text-gray-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  DONE: 'bg-green-100 text-green-700',
};

const BASE = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium';

type BadgeProps =
  | { kind: 'priority'; value: Priority; className?: string }
  | { kind: 'status'; value: TaskStatus; className?: string };

/** One Badge driven by value — renders priority or status with the agreed palette. */
export function Badge(props: BadgeProps) {
  if (props.kind === 'priority') {
    return (
      <span className={cn(BASE, PRIORITY_STYLES[props.value], props.className)}>
        {PRIORITY_LABELS[props.value]}
      </span>
    );
  }
  return (
    <span className={cn(BASE, STATUS_STYLES[props.value], props.className)}>
      {STATUS_LABELS[props.value]}
    </span>
  );
}
