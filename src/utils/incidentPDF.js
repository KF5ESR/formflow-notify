import { jsPDF } from "jspdf";

export function generateIncidentPDF(form, units, responders, department) {
  const doc = new jsPDF();
  let y = 15;
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  const labelWidth = 58;

  const checkPage = () => {
    if (y > 270) { doc.addPage(); y = 15; }
  };

  const addTitle = (text) => {
    checkPage();
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y + 2, pageWidth - margin, y + 2);
    doc.setFontSize(12);
    doc.setFont(undefined, "bold");
    doc.text(text, margin, y);
    y += 8;
  };

  const addField = (label, value) => {
    if (!value && value !== 0) return;
    checkPage();
    doc.setFontSize(9);
    doc.setFont(undefined, "bold");
    doc.text(label + ":", margin, y);
    doc.setFont(undefined, "normal");
    const lines = doc.splitTextToSize(String(value), contentWidth - labelWidth);
    doc.text(lines, margin + labelWidth, y);
    y += Math.max(5, lines.length * 4.5);
  };

  // ── Header ────────────────────────────────────────────────────────────────
  doc.setFontSize(18);
  doc.setFont(undefined, "bold");
  doc.text("Incident Report", margin, y);
  y += 7;
  doc.setFontSize(10);
  doc.setFont(undefined, "normal");
  doc.text(department?.department_name || "Fire Department", margin, y);
  y += 10;

  // ── Incident Identifiers ─────────────────────────────────────────────────
  addTitle("Incident Identifiers");
  addField("NFIRS ID", form.nfirs_id);
  addField("PSRID", form.psrid);
  y += 3;

  // ── Incident Details ──────────────────────────────────────────────────────
  addTitle("Incident Details");
  addField("Date", form.date);
  addField("Location", form.incident_location);
  addField("Nature of Call", form.nature_of_call);
  addField("Investigation", form.investigation);
  addField("Action Taken", form.action_taken);
  addField("Property Type", form.property_type);
  addField("Type Response (Primary)", form.type_response);
  if (form.type_response_2) addField("Type Response (Secondary)", form.type_response_2);
  if (form.type_response_3) addField("Type Response (Tertiary)", form.type_response_3);
  addField("Conditions / Temp", form.conditions_temp);
  y += 3;

  // ── Operational Times ─────────────────────────────────────────────────────
  addTitle("Operational Times");
  addField("Dispatch", form.dispatch_time);
  addField("First on Scene", form.first_on_scene_time);
  addField("Control", form.control_time);
  addField("FD Clear", form.fd_clear_time);
  y += 3;

  // ── IC & Mutual Aid ───────────────────────────────────────────────────────
  const icName = form.incident_commander || (responders.find(r => r.role === "IC") || {}).name || "";
  if (icName || form.mutual_aid || form.hydrant_location) {
    addTitle("Command & Logistics");
    addField("Incident Commander", icName);
    addField("Mutual Aid", form.mutual_aid);
    addField("Hydrant Location", form.hydrant_location);
    y += 3;
  }

  // ── Units Responded ───────────────────────────────────────────────────────
  if (units.length > 0) {
    addTitle("Units Responded");
    units.forEach((unit) => {
      checkPage();
      doc.setFontSize(9);
      doc.setFont(undefined, "bold");
      doc.text(`${unit.unit_id}  (${unit.staffing || 0} personnel)`, margin, y);
      y += 4.5;
      doc.setFont(undefined, "normal");

      // Show times in a compact row
      const times = [
        unit.dispatch_time  && `Dispatch: ${unit.dispatch_time}`,
        unit.enroute_time   && `Enroute: ${unit.enroute_time}`,
        unit.on_scene_time  && `On Scene: ${unit.on_scene_time}`,
        unit.clear_time     && `Clear: ${unit.clear_time}`,
      ].filter(Boolean);

      if (times.length > 0) {
        doc.setFontSize(8);
        doc.setTextColor(80, 80, 80);
        doc.text(times.join("   "), margin + 4, y);
        doc.setTextColor(0, 0, 0);
        y += 4;
      }
      y += 1;
      checkPage();
    });
    y += 3;
  }

  // ── Personnel Responded ───────────────────────────────────────────────────
  if (responders.length > 0) {
    addTitle("Personnel Responded");
    responders.forEach((resp) => {
      checkPage();
      doc.setFontSize(9);
      doc.setFont(undefined, "normal");
      const line = `${resp.name || "—"} (${resp.role || "—"}) — ${resp.assigned_unit || "—"} [${resp.response_type || "—"}]`;
      doc.text(line, margin, y);
      y += 4.5;
    });
    y += 3;
  }

  // ── Casualties ───────────────────────────────────────────────────────────
  if (form.patients_injured || form.fatalities) {
    addTitle("Casualties");
    addField("Patients Injured", form.patients_injured);
    addField("Fatalities", form.fatalities);
    y += 3;
  }

  // ── Narrative ─────────────────────────────────────────────────────────────
  const narrativeText = form.notes || [
    form.narrative_reported && `Reported: ${form.narrative_reported}`,
    form.narrative_found    && `Found: ${form.narrative_found}`,
    form.narrative_condition && `Condition: ${form.narrative_condition}`,
    form.narrative_actions  && `Actions: ${form.narrative_actions}`,
    form.narrative_disposition && `Disposition: ${form.narrative_disposition}`,
  ].filter(Boolean).join("\n");

  if (narrativeText) {
    addTitle("Narrative");
    doc.setFontSize(9);
    doc.setFont(undefined, "normal");
    const lines = doc.splitTextToSize(narrativeText, contentWidth);
    lines.forEach((line) => {
      if (y > 270) { doc.addPage(); y = 15; }
      doc.text(line, margin, y);
      y += 4.5;
    });
  }

  // ── Footer ─────────────────────────────────────────────────────────────────
  doc.setFontSize(8);
  doc.setFont(undefined, "normal");
  doc.setTextColor(150, 150, 150);
  doc.text(`Generated: ${new Date().toLocaleString()}`, margin, doc.internal.pageSize.getHeight() - 8);

  return doc;
}