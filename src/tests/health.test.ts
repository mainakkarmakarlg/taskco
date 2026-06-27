import { GET } from '@/app/api/health/route';

describe('GET /api/health', () => {
  it('returns 200 with connected status when DB is reachable', async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ data: { status: 'ok', database: 'connected' } });
  });
});
