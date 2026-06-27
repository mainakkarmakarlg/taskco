import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';

export async function GET() {
  try {
    await db.execute(sql`SELECT 1`);
    return Response.json({ data: { status: 'ok', database: 'connected' } }, { status: 200 });
  } catch {
    return Response.json(
      { error: { message: 'Database connection failed', code: 'DB_UNAVAILABLE' } },
      { status: 503 }
    );
  }
}
