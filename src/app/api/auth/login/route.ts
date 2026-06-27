import { z } from 'zod';
import bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { users } from '@/db/schema';
import { signToken } from '@/lib/jwt';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  let body: z.infer<typeof loginSchema>;

  try {
    body = loginSchema.parse(await request.json());
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

  const { email, password } = body;

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

  const passwordMatch = user ? await bcrypt.compare(password, user.passwordHash) : false;

  if (!user || !passwordMatch) {
    return Response.json(
      { error: { message: 'Invalid email or password', code: 'INVALID_CREDENTIALS' } },
      { status: 401 }
    );
  }

  const token = await signToken({ sub: user.id, email: user.email });

  return Response.json({
    data: {
      token,
      user: { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt },
    },
  });
}
