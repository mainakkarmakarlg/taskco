'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Topbar } from './Topbar';
import { Button } from './ui';
import { authApi } from '@/lib/api';
import { clearToken } from '@/lib/token';
import { queryKeys } from '@/lib/queryKeys';

/** Top bar for authenticated pages: optional back link, current user, log out. */
export function AuthedTopbar({ backHref }: { backHref?: string }) {
  const router = useRouter();
  const { data } = useQuery({
    queryKey: queryKeys.me,
    queryFn: authApi.me,
    staleTime: 60_000,
  });

  const logout = () => {
    clearToken();
    router.replace('/login');
  };

  return (
    <Topbar
      right={
        <>
          {backHref && (
            <Link
              href={backHref}
              className="text-sm text-gray-600 transition-colors hover:text-gray-900"
            >
              ← Dashboard
            </Link>
          )}
          {data?.user && (
            <span className="hidden text-sm text-gray-600 sm:inline">{data.user.name}</span>
          )}
          <Button variant="secondary" size="sm" onClick={logout}>
            Log out
          </Button>
        </>
      }
    />
  );
}
