import { cn } from '@/lib/cn';
import { DEFAULT_PROJECT_COLOR } from '@/lib/types';

/** Small round swatch rendered in the project's stored color. */
export function ProjectColorDot({
  color,
  className,
}: {
  color?: string | null;
  className?: string;
}) {
  return (
    <span
      className={cn('inline-block h-3 w-3 shrink-0 rounded-full', className)}
      style={{ backgroundColor: color || DEFAULT_PROJECT_COLOR }}
      aria-hidden="true"
    />
  );
}
