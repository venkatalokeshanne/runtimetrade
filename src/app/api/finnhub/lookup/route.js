export const runtime = 'nodejs';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get('query') || '').trim();

  if (!query) {
    return new Response(JSON.stringify({ result: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Missing FINNHUB_API_KEY' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const url = `https://finnhub.io/api/v1/search?q=${encodeURIComponent(query)}&token=${apiKey}`;
  const response = await fetch(url, { cache: 'no-store' });
  const data = await response.json();

  return new Response(JSON.stringify(data), {
    status: response.ok ? 200 : response.status,
    headers: { 'Content-Type': 'application/json' },
  });
}
