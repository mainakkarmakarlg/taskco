'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui';
import { PageContainer } from '@/components/PageContainer';
import { Topbar } from '@/components/Topbar';

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  /** Footer prompt text, e.g. "Already have an account?" */
  footerText: string;
  /** Footer link target, e.g. "/login". */
  footerHref: string;
  /** Footer link label, e.g. "Sign in". */
  footerLinkLabel: string;
}

/** Shared chrome for the login + register pages: Topbar, centered card, heading, footer link. */
export function AuthShell({
  title,
  subtitle,
  children,
  footerText,
  footerHref,
  footerLinkLabel,
}: AuthShellProps) {
  return (
    <>
      <Topbar />
      <PageContainer>
        <Card className="mx-auto max-w-md">
          <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
          <p className="mt-1 text-gray-500">{subtitle}</p>
          <div className="mt-6">{children}</div>
          <p className="mt-6 text-sm text-gray-500">
            {footerText}{' '}
            <Link href={footerHref} className="text-blue-600 hover:underline">
              {footerLinkLabel}
            </Link>
          </p>
        </Card>
      </PageContainer>
    </>
  );
}
