import Link from 'next/link';

/** App header bar: TaskCo brand on the left, optional actions on the right. */
export function Topbar({ right }: { right?: React.ReactNode }) {
  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3 md:px-6">
        <Link href="/" className="text-lg font-semibold text-gray-900">
          Task<span className="text-blue-600">Co</span>
        </Link>
        {right ? <div className="flex items-center gap-3">{right}</div> : null}
      </div>
    </header>
  );
}
