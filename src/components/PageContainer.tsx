import { cn } from '@/lib/cn';

/** Centered, max-width page body with consistent horizontal + vertical padding. */
export function PageContainer({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mx-auto w-full max-w-5xl px-4 py-8 md:px-6', className)}>{children}</div>
  );
}
