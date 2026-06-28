'use client';

import { useEffect } from 'react';

/** Lightweight centered modal with backdrop + Escape-to-close. */
export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-md rounded-lg border border-gray-200 bg-white p-6 shadow-lg"
      >
        {title && <h2 className="text-lg font-semibold text-gray-900">{title}</h2>}
        <div className={title ? 'mt-4' : ''}>{children}</div>
      </div>
    </div>
  );
}
