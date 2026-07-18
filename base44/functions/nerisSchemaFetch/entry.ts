import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { search, startOffset = 0, length = 6000 } = body;

    const resp = await fetch('https://api-test.neris.fsri.org/v1/openapi.yaml');
    const text = await resp.text();

    // Find the section around the search term
    const idx = text.indexOf(search);
    if (idx === -1) return Response.json({ found: false, search });

    // Return surrounding context
    // startOffset and length from body
    const start = Math.max(0, idx - 200 + (startOffset || 0));
    const end = Math.min(text.length, start + (length || 6000));
    return Response.json({ found: true, search, excerpt: text.slice(start, end) });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
