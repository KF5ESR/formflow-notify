import { jsPDF } from "jspdf";

export function generateIncidentPDF(form, units, responders, department) {
  const doc = new jsPDF();
  let y = 15;
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  // Helper: add section title
  const addTitle = (text) => {
    doc.setFontSize(13);
    doc.setFont(undefined, "bold");
    doc.text(text, margin, y);
    y += 8;
  };

  // Helper: add field
  const addField = (label, value) => {
    doc.setFontSize(9);
    doc.setFont(undefined, "bold");
    doc.text(label + ":", margin, y);
    doc.setFont(undefined, "normal");
    doc.text(String(value || "—"), margin + 50, y);
    y += 5;
  };

  // Helper: new page check
  const checkPage = () => {
    if (y > 270) {
      doc.addPage();
      y = 15;
    }
  };

  // Header
  doc.setFontSize(16);
  doc.setFont(undefined, "bold");
  doc.text("Incident Report", margin, y);
  y += 8;
  doc.setFontSize(10);
  doc.setFont(undefined, "normal");
  doc.text(department?.department_name || "Fire Department", margin, y);
  y += 10;

  // Identifiers
  checkPage();
  addTitle("Incident Identifiers");
  addField("NFIRS ID", form.nfirs_id);
  addField("PSRID", form.psrid);
  y += 3;

  // Incident Details
  checkPage();
  addTitle("Incident Details");
  addField("Date", form.date);
  addField("Location", form.incident_location);
  addField("Nature of Call", form.nature_of_call);
  addField("Action Taken", form.action_taken);
  addField("Type Response (Primary)", form.type_response);
  if (form.type_response_2) addField("Type Response (Secondary)", form.type_response_2);
  if (form.type_response_3) addField("Type Response (Tertiary)", form.type_response_3);
  y += 3;

  // Times
  checkPage();
  addTitle("Operational Times");
  addField("Dispatch", form.dispatch_time);
  addField("First on Scene", form.first_on_scene_time);
  addField("Control", form.control_time);
  addField("FD Clear", form.fd_clear_time);
  y += 3;

  // Units
  if (units.length > 0) {
    checkPage();
    addTitle("Units Responded");
    units.forEach((unit) => {
      doc.setFontSize(9);
      doc.setFont(undefined, "bold");
      doc.text(`${unit.unit_id} (${unit.staffing} personnel)`, margin, y);
      y += 4;
      doc.setFont(undefined, "normal");
      if (unit.dispatch_time) {
        doc.text(`  Dispatch: ${unit.dispatch_time}`, margin + 5, y);
        y += 3;
      }
      if (unit.enroute_time) {
        doc.text(`  Enroute: ${unit.enroute_time}`, margin + 5, y);
        y += 3;
      }
      if (unit.on_scene_time) {
        doc.text(`  On Scene: ${unit.on_scene_time}`, margin + 5, y);
        y += 3;
      }
      if (unit.clear_time) {
        doc.text(`  Clear: ${unit.clear_time}`, margin + 5, y);
        y += 3;
      }
      y += 2;
      checkPage();
    });
    y += 3;
  }

  // Responders
  if (responders.length > 0) {
    checkPage();
    addTitle("Personnel Responded");
    responders.forEach((resp) => {
      doc.setFontSize(9);
      doc.setFont(undefined, "normal");
      const line = `${resp.name} (${resp.role}) — ${resp.assigned_unit} [${resp.response_type}]`;
      doc.text(line, margin, y);
      y += 4;
      checkPage();
    });
    y += 3;
  }

  // Narrative
  if (form.notes) {
    checkPage();
    addTitle("Narrative");
    doc.setFontSize(9);
    doc.setFont(undefined, "normal");
    const narrativeLines = doc.splitTextToSize(form.notes, contentWidth);
    narrativeLines.forEach((line) => {
      if (y > 270) {
        doc.addPage();
        y = 15;
      }
      doc.text(line, margin, y);
      y += 4;
    });
  }

  // Footer
  doc.setFontSize(8);
  doc.setFont(undefined, "normal");
  doc.text(`Generated: ${new Date().toLocaleString()}`, margin, doc.internal.pageSize.getHeight() - 8);

  return doc;
}