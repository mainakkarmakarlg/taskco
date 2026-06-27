import { z } from 'zod';
import bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { users } from '@/db/schema';
import { signToken } from '@/lib/jwt';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
});

export async function POST(request: Request) {
  let body: z.infer<typeof registerSchema>;

  try {
    body = registerSchema.parse(await request.json());
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: { message: 'Validation failed', code: 'VALIDATION_ERROR', details: error.issues } },
        { status: 400 }
      );
    }
    return Response.json(
      { error: { message: 'Invalid request body', code: 'INVALID_REQUEST' } },
      { status: 400 }
    );
  }

  const { email, password, name } = body;

  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing.length > 0) {
    return Response.json(
      { error: { message: 'Email already in use', code: 'EMAIL_CONFLICT' } },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const [user] = await db.insert(users).values({ email, passwordHash, name }).returning();

  const token = await signToken({ sub: user.id, email: user.email });

  return Response.json(
    {
      data: {
        token,
        user: { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt },
      },
    },
    { status: 201 }
  );
}
