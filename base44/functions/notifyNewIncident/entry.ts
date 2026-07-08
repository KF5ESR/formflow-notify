import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    // Entity automation payload: { event, data, old_data, changed_fields, payload_too_large }
    const entityId = body.event?.entity_id;
    let incident = body.data;

    // If payload was too large, fetch the full incident record
    if (!incident && entityId) {
      incident = await base44.asServiceRole.entities.Incident.get(entityId);
    }

    if (!incident) {
      return Response.json({ error: 'No incident data in payload' }, { status: 400 });
    }

    const departmentId = incident.department_id;
    if (!departmentId) {
      return Response.json({ message: 'No department_id on incident', sent: 0 });
    }

    // Find members who opted in to new-incident alerts and are Active
    const members = await base44.asServiceRole.entities.Member.filter({
      department_id: departmentId,
      notify_new_incidents: true,
      status: 'Active',
    });

    const recipients = members.filter((m) => m.email);
    if (recipients.length === 0) {
      return Response.json({ message: 'No opted-in members with email on file', sent: 0 });
    }

    // Build email content
    const subject = `New Incident Report — ${incident.nature_of_call || 'Review Required'}`;
    const emailBody = [
      'A new incident report has been submitted and is ready for review.',
      '',
      '--- Incident Details ---',
      `NFIRS ID:           ${incident.nfirs_id || 'N/A'}`,
      `Date:               ${incident.date || 'N/A'}`,
      `Nature of Call:     ${incident.nature_of_call || 'N/A'}`,
      `Location:           ${incident.incident_location || 'N/A'}`,
      `Action Taken:       ${incident.action_taken || 'N/A'}`,
      `Incident Commander: ${incident.incident_commander || 'N/A'}`,
      '',
      'Please log in to review and process this incident.',
    ].join('\n');

    // Get Gmail OAuth token (shared connector — builder's account)
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('gmail');

    let sent = 0;
    const errors = [];

    for (const member of recipients) {
      try {
        // Build RFC 2822 MIME message
        const mimeMessage = [
          `To: ${member.email}`,
          `Subject: ${subject}`,
          'Content-Type: text/plain; charset=UTF-8',
          'MIME-Version: 1.0',
          '',
          emailBody,
        ].join('\r\n');

        // Base64url encode for Gmail API
        const encodedMessage = btoa(unescape(encodeURIComponent(mimeMessage)))
          .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

        const res = await fetch(
          'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ raw: encodedMessage }),
          }
        );

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`Gmail API ${res.status}: ${errText}`);
        }
        sent++;
      } catch (err) {
        errors.push({ email: member.email, error: err.message });
      }
    }

    // Update the incident's email_status field
    if (entityId) {
      try {
        await base44.asServiceRole.entities.Incident.update(entityId, {
          email_status: sent > 0 ? `${sent} alert(s) sent` : 'No alerts sent (errors)',
        });
      } catch (_) {
        // non-critical — don't fail the whole function
      }
    }

    return Response.json({ sent, total: recipients.length, errors });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});