import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { proxyUrl, requestPayload } = await req.json();

    if (!proxyUrl) {
      return Response.json({ error: 'proxyUrl is required' }, { status: 400 });
    }

    // Make the request server-side — no CORS issues
    const resp = await fetch(proxyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(requestPayload),
      redirect: 'follow',
    });

    const text = await resp.text();
    let respBody;
    try { respBody = JSON.parse(text); } catch (_) { respBody = text; }

    return Response.json({
      http_status: resp.status,
      response_body: respBody,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});