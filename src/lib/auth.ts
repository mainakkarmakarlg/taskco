import { jwtVerify } from 'jose';
import { getJwtSecret } from './jwt';

export interface AuthPayload {
  sub: string;
  email: string;
}

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export async function requireAuth(request: Request): Promise<AuthPayload> {
  const authHeader = request.headers.get('Authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    throw new AuthError('Missing or invalid authorization header', 'MISSING_TOKEN', 401);
  }

  const token = authHeader.slice(7);

  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    if (!payload.sub || typeof payload.email !== 'string') {
      throw new Error('Malformed token payload');
    }
    return { sub: payload.sub, email: payload.email };
  } catch (error) {
    if (error instanceof AuthError) throw error;
    throw new AuthError('Invalid or expired token', 'INVALID_TOKEN', 401);
  }
}

export function authErrorResponse(error: unknown): Response | null {
  if (error instanceof AuthError) {
    return Response.json(
      { error: { message: error.message, code: error.code } },
      { status: error.status }
    );
  }
  return null;
}
