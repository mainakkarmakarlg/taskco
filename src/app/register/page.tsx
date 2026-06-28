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
  name?: string;
  email?: string;
  password?: string;
}

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  // If already authenticated, skip the auth pages.
  useEffect(() => {
    if (getToken()) router.replace('/dashboard');
  }, [router]);

  const mutation = useMutation({
    mutationFn: () => authApi.register({ name: name.trim(), email: email.trim(), password }),
    onSuccess: (result) => {
      setToken(result.token);
      router.push('/dashboard');
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        if (err.status === 409 || err.code === 'EMAIL_CONFLICT') {
          setErrors((prev) => ({ ...prev, email: 'Email already in use' }));
          return;
        }
        setFormError(err.message);
        return;
      }
      setFormError('Something went wrong. Please try again.');
    },
  });

  function validate(): FieldErrors {
    const next: FieldErrors = {};
    if (!name.trim()) next.name = 'Name is required';
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
      title="Create your account"
      subtitle="Start organizing your work with TaskCo."
      footerText="Already have an account?"
      footerHref="/login"
      footerLinkLabel="Sign in"
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Input
          label="Name"
          type="text"
          autoComplete="name"
          value={name}
          error={errors.name}
          onChange={(e) => {
            setName(e.target.value);
            if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
          }}
        />
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
          autoComplete="new-password"
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
          Create account
        </Button>
        {formError && <p className="text-sm text-red-600">{formError}</p>}
      </form>
    </AuthShell>
  );
}
