import { NextResponse } from 'next/server';

export async function GET() {
  const apiUrl = process.env.FLOWMAIL_API_URL || 'http://localhost:3001';
  const apiKey = process.env.DASHBOARD_API_KEY || 'test-api-key';

  try {
    const response = await fetch(`${apiUrl}/billing/plan`, {
      method: 'GET',
      headers: {
        'X-API-Key': apiKey,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(error, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json({ error: 'Failed to connect to API' }, { status: 500 });
  }
}
