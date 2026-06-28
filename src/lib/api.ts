import axios, { AxiosError } from 'axios';
import { getToken, clearToken } from './token';
import type { Priority, Project, Task, TaskStatus, User } from './types';
import type { TaskFilters } from './queryKeys';

/** Normalized error thrown by every API call (shape: { error: { message, code } }). */
export class ApiError extends Error {
  code: string;
  status: number;
  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

/**
 * Single shared Axios client for the whole app (same-origin /api).
 * - Request interceptor attaches `Authorization: Bearer <token>` from localStorage.
 * - Response interceptor unwraps the `{ error }` envelope into an ApiError and, on
 *   401, clears the token and redirects to /login.
 */
const client = axios.create({ baseURL: '/api' });

client.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ error?: { message?: string; code?: string } }>) => {
    const status = error.response?.status ?? 0;

    if (status === 401 && typeof window !== 'undefined') {
      clearToken();
      if (window.location.pathname !== '/login') window.location.assign('/login');
    }

    const envelope = error.response?.data?.error;
    return Promise.reject(
      new ApiError(
        envelope?.message ?? error.message ?? 'Request failed',
        envelope?.code ?? 'UNKNOWN',
        status
      )
    );
  }
);

interface RequestOptions {
  method?: string;
  body?: unknown;
  /** Retained for call-site compatibility; the request interceptor handles auth. */
  auth?: boolean;
}

/**
 * Thin typed wrapper over the shared Axios client. Unwraps the `{ data }` envelope;
 * errors arrive as ApiError via the response interceptor above.
 */
async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body } = options;
  const response = await client.request<{ data: T }>({
    url: path,
    method,
    data: body,
  });
  return response.data.data;
}

function buildTaskQuery(filters: TaskFilters): string {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.priority) params.set('priority', filters.priority);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

// ---- Auth ----

export interface AuthResult {
  token: string;
  user: User;
}

export const authApi = {
  register: (body: { name: string; email: string; password: string }) =>
    request<AuthResult>('/auth/register', { method: 'POST', body, auth: false }),
  login: (body: { email: string; password: string }) =>
    request<AuthResult>('/auth/login', { method: 'POST', body, auth: false }),
  me: () => request<{ user: User }>('/auth/me'),
};

// ---- Projects ----

export const projectsApi = {
  list: () => request<{ projects: Project[] }>('/projects'),
  get: (id: string) => request<{ project: Project }>(`/projects/${id}`),
  create: (body: { name: string; description?: string; color?: string }) =>
    request<{ project: Project }>('/projects', { method: 'POST', body }),
};

// ---- Tasks ----

export const tasksApi = {
  list: (projectId: string, filters: TaskFilters = {}) =>
    request<{ tasks: Task[] }>(`/projects/${projectId}/tasks${buildTaskQuery(filters)}`),
  create: (
    projectId: string,
    body: {
      title: string;
      description?: string;
      status?: TaskStatus;
      priority?: Priority;
      dueDate?: string;
    }
  ) => request<{ task: Task }>(`/projects/${projectId}/tasks`, { method: 'POST', body }),
  update: (
    id: string,
    body: Partial<{
      title: string;
      description: string | null;
      status: TaskStatus;
      priority: Priority;
      dueDate: string | null;
    }>
  ) => request<{ task: Task }>(`/tasks/${id}`, { method: 'PATCH', body }),
  remove: (id: string) => request<{ id: string }>(`/tasks/${id}`, { method: 'DELETE' }),
};
