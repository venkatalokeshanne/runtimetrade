import WebSocket from 'ws';

export const runtime = 'nodejs';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const symbolsParam = searchParams.get('symbols') || '';
  const symbols = symbolsParam
    .split(',')
    .map((symbol) => symbol.trim().toUpperCase())
    .filter(Boolean);

  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) {
    return new Response('Missing FINNHUB_API_KEY', { status: 500 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let isClosed = false;
      const safeEnqueue = (data) => {
        if (isClosed) {
          return;
        }
        try {
          controller.enqueue(data);
        } catch (error) {
          isClosed = true;
        }
      };

      const safeClose = () => {
        if (isClosed) {
          return;
        }
        isClosed = true;
        try {
          controller.close();
        } catch (error) {
          // Stream already closed
        }
      };
      const ws = new WebSocket(`wss://ws.finnhub.io?token=${apiKey}`);

      ws.on('open', () => {
        symbols.forEach((symbol) => {
          ws.send(JSON.stringify({ type: 'subscribe', symbol }));
        });
      });

      ws.on('message', (data) => {
        try {
          const payload = JSON.parse(data.toString());
          safeEnqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
        } catch (error) {
          safeEnqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', message: 'Invalid payload' })}\n\n`));
        }
      });

      ws.on('close', () => {
        safeClose();
      });

      ws.on('error', (error) => {
        safeEnqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`));
        safeClose();
      });

      request.signal.addEventListener('abort', () => {
        ws.close();
        safeClose();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
