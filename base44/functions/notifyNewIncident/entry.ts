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

    // Field definitions grouped by section: header + fields (label + key + required flag)
    const SECTIONS = [
      {
        header: 'Incident Identifiers',
        fields: [
          { label: 'NFIRS ID', key: 'nfirs_id' },
          { label: 'PSRID', key: 'psrid' },
        ],
      },
      {
        header: 'Date & Times',
        fields: [
          { label: 'Date', key: 'date', required: true },
          { label: 'Dispatch Time', key: 'dispatch_time' },
          { label: 'First On Scene Time', key: 'first_on_scene_time' },
          { label: 'Control Time', key: 'control_time' },
          { label: 'FD Clear Time', key: 'fd_clear_time' },
          { label: 'Conditions/Temp', key: 'conditions_temp' },
        ],
      },
      {
        header: 'Location & Contact',
        fields: [
          { label: 'Incident Location', key: 'incident_location', required: true },
          { label: 'Owner/Occupant/Patient', key: 'owner_occupant' },
          { label: 'Contact Number', key: 'contact_number' },
          { label: 'Hydrant Number/Location', key: 'hydrant_location' },
        ],
      },
      {
        header: 'Incident Type & Actions',
        fields: [
          { label: 'Nature of Call', key: 'nature_of_call', required: true },
          { label: 'Investigation', key: 'investigation' },
          { label: 'Action Taken', key: 'action_taken', required: true },
          { label: 'Type Response (Primary)', key: 'type_response' },
          { label: 'Type Response (Secondary)', key: 'type_response_2' },
          { label: 'Type Response (Tertiary)', key: 'type_response_3' },
          { label: 'Property Type', key: 'property_type' },
        ],
      },
      {
        header: 'Loss & Values',
        fields: [
          { label: 'Property Value ($)', key: 'value_dollar' },
          { label: 'Loss ($)', key: 'loss_dollar' },
          { label: 'Crop Value ($)', key: 'value_crop' },
          { label: 'Vehicle Value ($)', key: 'value_vehicle' },
          { label: 'Total Amount ($)', key: 'total_amount' },
          { label: 'Area', key: 'area' },
          { label: 'VIN/LIC', key: 'vin_lic' },
          { label: 'Products Involved', key: 'products' },
          { label: 'Patients Injured', key: 'patients_injured' },
          { label: 'Fatalities', key: 'fatalities' },
        ],
      },
      {
        header: 'Mutual Aid & Department',
        fields: [
          { label: 'Mutual Aid Given/Received', key: 'mutual_aid' },
          { label: 'FDID Number Received', key: 'fdid_received' },
          { label: 'Select FD', key: 'select_fd' },
          { label: 'Incident Commander (IC)', key: 'incident_commander' },
        ],
      },
      {
        header: 'Narrative',
        fields: [
          { label: 'What was reported?', key: 'narrative_reported' },
          { label: 'What was found on arrival?', key: 'narrative_found' },
          { label: 'Patient/Scene condition', key: 'narrative_condition' },
          { label: 'Actions taken', key: 'narrative_actions' },
          { label: 'Disposition / Who took over', key: 'narrative_disposition' },
          { label: 'Narrative (full)', key: 'notes' },
        ],
      },
    ];

    // Build email body — include required fields + any filled field, grouped by section
    const isResend = !!body.incident_id;
    const intro = isResend
      ? 'This is a RESEND of the incident notification.'
      : 'A new incident report has been submitted and is ready for review.';

    const lines = [intro, ''];

    const maxLabel = Math.max(...SECTIONS.flatMap((s) => s.fields.map((f) => f.label.length)));

    for (const section of SECTIONS) {
      // Check if any field in this section has a value or is required
      const hasContent = section.fields.some((f) => {
        const val = incident[f.key];
        return (val !== null && val !== undefined && String(val).trim() !== '') || f.required;
      });
      if (!hasContent) continue;

      lines.push(`--- ${section.header} ---`);

      for (const f of section.fields) {
        const val = incident[f.key];
        const hasVal = val !== null && val !== undefined && String(val).trim() !== '';
        if (hasVal || f.required) {
          const display = hasVal ? String(val) : 'N/A';
          const padding = ' '.repeat(Math.max(1, maxLabel - f.label.length + 2));
          const marker = f.required && !hasVal ? ' (required - missing)' : '';
          lines.push(`${f.label}:${padding}${display}${marker}`);
        }
      }
      lines.push('');
    }

    lines.push('', 'Please log in to review and process this incident.');

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