import { NextResponse } from 'next/server';

export async function GET() {
  const apiUrl = process.env.FLOWMAIL_API_URL || 'http://localhost:3001';
  const apiKey = process.env.DASHBOARD_API_KEY || 'your-internal-api-key';

  try {
    const res = await fetch(`${apiUrl}/domains`, {
      headers: { 'X-API-Key': apiKey },
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch domains' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const apiUrl = process.env.FLOWMAIL_API_URL || 'http://localhost:3001';
  const apiKey = process.env.DASHBOARD_API_KEY || 'your-internal-api-key';
  const body = await request.json();

  try {
    const res = await fetch(`${apiUrl}/domains`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-API-Key': apiKey 
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to add domain' }, { status: 500 });
  }
}
