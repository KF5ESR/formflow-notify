import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Restrict to authorized roles
    if (user.role !== 'super_admin' && user.role !== 'dept_admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { proxyUrl, requestPayload } = await req.json();

    if (!proxyUrl) {
      return Response.json({ error: 'proxyUrl is required' }, { status: 400 });
    }

    // SSRF protection: restrict proxy targets to an allowlist of known-safe Google hosts.
    let parsedUrl;
    try {
      parsedUrl = new URL(proxyUrl);
    } catch (_) {
      return Response.json({ error: 'Invalid proxyUrl' }, { status: 400 });
    }
    const ALLOWED_HOSTS = ['script.google.com', 'script.googleusercontent.com'];
    if (!ALLOWED_HOSTS.includes(parsedUrl.hostname)) {
      return Response.json({ error: 'Forbidden: proxyUrl host is not allowed' }, { status: 403 });
    }

    // Make the request server-side — no CORS issues
    // 55s timeout: Apps Script has a 60s execution limit; we abort just before that.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 55000);

    let resp;
    try {
      resp = await fetch(proxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload),
        redirect: 'follow',
        signal: controller.signal,
      });
    } catch (fetchErr) {
      clearTimeout(timeout);
      const isAbort = fetchErr.name === 'AbortError';
      return Response.json({
        error: isAbort
          ? 'Apps Script request timed out after 55s — the WebApp may be cold-starting or experiencing high load. Try again in 30 seconds.'
          : `Apps Script gateway error: ${fetchErr.message}. This is likely a Google Apps Script cold-start or 502 issue, not a NERIS API error. Try again in a moment.`,
        http_status: isAbort ? 504 : 502,
      }, { status: isAbort ? 504 : 502 });
    }
    clearTimeout(timeout);

    // If Apps Script itself returned a 5xx, provide a clear message
    if (resp.status >= 500) {
      const errText = await resp.text().catch(() => '');
      return Response.json({
        error: `Apps Script gateway returned HTTP ${resp.status}. This is a Google Apps Script issue (cold-start, quota, or unhandled exception in doPost), not a NERIS API error. Try again in 30 seconds. Raw: ${errText.substring(0, 200)}`,
        http_status: resp.status,
      }, { status: 200 }); // return 200 so the caller can read the body
    }

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