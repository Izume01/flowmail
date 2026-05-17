import { NextResponse } from 'next/server';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = await params;
  const apiUrl = process.env.FLOWMAIL_API_URL || 'http://localhost:3001';
  const apiKey = process.env.DASHBOARD_API_KEY || 'your-internal-api-key';

  try {
    const res = await fetch(`${apiUrl}/domains/${id}/verify`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
