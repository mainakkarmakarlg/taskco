'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { Button, Input } from '@/components/ui';
import { AuthShell } from '@/components/auth/AuthShell';
import { authApi, ApiError } from '@/lib/api';
import { setToken, getToken } from '@/lib/token';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface FieldErrors {
  email?: string;
  password?: string;
}

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  // If already authenticated, skip the auth pages.
  useEffect(() => {
    if (getToken()) router.replace('/dashboard');
  }, [router]);

  const mutation = useMutation({
    mutationFn: () => authApi.login({ email: email.trim(), password }),
    onSuccess: (result) => {
      setToken(result.token);
      router.push('/dashboard');
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setFormError(err.message);
        return;
      }
      setFormError('Something went wrong. Please try again.');
    },
  });

  function validate(): FieldErrors {
    const next: FieldErrors = {};
    if (!email.trim()) next.email = 'Email is required';
    else if (!EMAIL_RE.test(email.trim())) next.email = 'Enter a valid email address';
    if (!password) next.password = 'Password is required';
    else if (password.length < 8) next.password = 'Password must be at least 8 characters';
    return next;
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    mutation.mutate();
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to your TaskCo account."
      footerText="Don't have an account?"
      footerHref="/register"
      footerLinkLabel="Create one"
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          error={errors.email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
          }}
        />
        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          error={errors.password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
          }}
        />
        <Button
          type="submit"
          className="w-full"
          loading={mutation.isPending}
          disabled={mutation.isPending}
        >
          Sign in
        </Button>
        {formError && <p className="text-sm text-red-600">{formError}</p>}
      </form>
    </AuthShell>
  );
}
