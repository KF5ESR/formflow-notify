import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    // Entity automation payload: { event, data, old_data, changed_fields, payload_too_large }
    // Manual resend payload: { incident_id: "..." }
    const entityId = body.event?.entity_id || body.incident_id;
    let incident = body.data;

    // If payload was too large or manual resend, fetch the full incident record
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

    // Build email body — structured to match the PDF export layout
    const isResend = !!body.incident_id;
    const lines = [];

    // Parse units and responders from JSON
    let units = [];
    let responders = [];
    try { units = JSON.parse(incident.units_json || '[]'); } catch (_) { units = []; }
    try { responders = JSON.parse(incident.responders_json || '[]'); } catch (_) { responders = []; }

    const val = (v) => (v !== null && v !== undefined && String(v).trim() !== '') ? String(v) : null;
    const pad = (label, targetLen) => label + ': ' + ' '.repeat(Math.max(0, targetLen - label.length));

    // ── Header ──────────────────────────────────────────────────────────────
    lines.push('Incident Report');
    lines.push(incident.select_fd || 'Fire Department');
    lines.push('');

    // ── Incident Identifiers ─────────────────────────────────────────────────
    lines.push('=== Incident Identifiers ===');
    if (val(incident.nfirs_id)) lines.push(`NFIRS ID: ${val(incident.nfirs_id)}`);
    if (val(incident.psrid))     lines.push(`PSRID: ${val(incident.psrid)}`);
    lines.push('');

    // ── Incident Details ────────────────────────────────────────────────────
    lines.push('=== Incident Details ===');
    if (val(incident.date))              lines.push(`Date: ${val(incident.date)}`);
    if (val(incident.incident_location)) lines.push(`Location: ${val(incident.incident_location)}`);
    if (val(incident.nature_of_call))    lines.push(`Nature of Call: ${val(incident.nature_of_call)}`);
    if (val(incident.investigation))     lines.push(`Investigation: ${val(incident.investigation)}`);
    if (val(incident.action_taken))      lines.push(`Action Taken: ${val(incident.action_taken)}`);
    if (val(incident.property_type))     lines.push(`Property Type: ${val(incident.property_type)}`);
    if (val(incident.type_response))     lines.push(`Type Response (Primary): ${val(incident.type_response)}`);
    if (val(incident.type_response_2))   lines.push(`Type Response (Secondary): ${val(incident.type_response_2)}`);
    if (val(incident.type_response_3))   lines.push(`Type Response (Tertiary): ${val(incident.type_response_3)}`);
    if (val(incident.conditions_temp))   lines.push(`Conditions / Temp: ${val(incident.conditions_temp)}`);
    lines.push('');

    // ── Operational Times ─────────────────────────────────────────────────
    lines.push('=== Operational Times ===');
    if (val(incident.dispatch_time))       lines.push(`Dispatch: ${val(incident.dispatch_time)}`);
    if (val(incident.first_on_scene_time)) lines.push(`First on Scene: ${val(incident.first_on_scene_time)}`);
    if (val(incident.control_time))        lines.push(`Control: ${val(incident.control_time)}`);
    if (val(incident.fd_clear_time))      lines.push(`FD Clear: ${val(incident.fd_clear_time)}`);
    lines.push('');

    // ── Command & Logistics ────────────────────────────────────────────────
    const icName = val(incident.incident_commander) || (responders.find(r => r.role === 'IC') || {}).name || null;
    if (icName || val(incident.mutual_aid) || val(incident.hydrant_location)) {
      lines.push('=== Command & Logistics ===');
      if (icName)                       lines.push(`Incident Commander: ${icName}`);
      if (val(incident.mutual_aid))     lines.push(`Mutual Aid: ${val(incident.mutual_aid)}`);
      if (val(incident.hydrant_location)) lines.push(`Hydrant Location: ${val(incident.hydrant_location)}`);
      lines.push('');
    }

    // ── Units Responded ────────────────────────────────────────────────────
    if (units.length > 0) {
      lines.push('=== Units Responded ===');
      units.forEach((unit) => {
        const staffing = unit.staffing || 0;
        lines.push(`${unit.unit_id}  (${staffing} personnel)`);
        const times = [
          unit.dispatch_time && `Dispatch: ${unit.dispatch_time}`,
          unit.enroute_time   && `Enroute: ${unit.enroute_time}`,
          unit.on_scene_time  && `On Scene: ${unit.on_scene_time}`,
          unit.clear_time     && `Clear: ${unit.clear_time}`,
        ].filter(Boolean);
        if (times.length > 0) {
          lines.push('  ' + times.join('   '));
        }
      });
      lines.push('');
    }

    // ── Personnel Responded ────────────────────────────────────────────────
    if (responders.length > 0) {
      lines.push('=== Personnel Responded ===');
      responders.forEach((resp) => {
        const line = `${resp.name || '—'} (${resp.role || '—'}) — ${resp.assigned_unit || '—'} [${resp.response_type || '—'}]`;
        lines.push(line);
      });
      lines.push('');
    }

    // ── Casualties ─────────────────────────────────────────────────────────
    if (val(incident.patients_injured) || val(incident.fatalities)) {
      lines.push('=== Casualties ===');
      if (val(incident.patients_injured)) lines.push(`Patients Injured: ${val(incident.patients_injured)}`);
      if (val(incident.fatalities))       lines.push(`Fatalities: ${val(incident.fatalities)}`);
      lines.push('');
    }

    // ── Narrative ──────────────────────────────────────────────────────────
    const narrativeText = val(incident.notes) || [
      val(incident.narrative_reported)   && `Reported: ${val(incident.narrative_reported)}`,
      val(incident.narrative_found)      && `Found: ${val(incident.narrative_found)}`,
      val(incident.narrative_condition)  && `Condition: ${val(incident.narrative_condition)}`,
      val(incident.narrative_actions)    && `Actions: ${val(incident.narrative_actions)}`,
      val(incident.narrative_disposition) && `Disposition: ${val(incident.narrative_disposition)}`,
    ].filter(Boolean).join('\n');

    if (narrativeText) {
      lines.push('=== Narrative ===');
      lines.push(narrativeText);
      lines.push('');
    }

    lines.push(isResend ? 'This is a RESEND of the incident notification.' : 'A new incident report has been submitted and is ready for review.');
    lines.push('Please log in to review and process this incident.');

    const subject = isResend
      ? `[RESEND] Incident Report - ${incident.nature_of_call || 'Review Required'}`
      : `New Incident Report - ${incident.nature_of_call || 'Review Required'}`;
    const emailBody = lines.join('\n');

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