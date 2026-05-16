import { NextResponse } from 'next/server';

export async function GET() {
  const apiUrl = process.env.FLOWMAIL_API_URL || 'http://localhost:3001';
  const apiKey = process.env.DASHBOARD_API_KEY || 'your-internal-api-key';

  try {
    const res = await fetch(`${apiUrl}/emails`, {
      headers: {
        'X-API-Key': apiKey,
      },
    });

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
  }
}
