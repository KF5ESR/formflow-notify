export function generateIncidentCSV(form, units, responders, department) {
  const rows = [];
  
  // Header
  rows.push([`Incident Report - ${department?.department_name || "Fire Department"}`]);
  rows.push([`Generated: ${new Date().toLocaleString()}`]);
  rows.push([]);
  
  // Incident Identifiers
  rows.push(["INCIDENT IDENTIFIERS"]);
  rows.push(["NFIRS ID", form.nfirs_id || ""]);
  rows.push(["PSRID", form.psrid || ""]);
  rows.push([]);
  
  // Incident Details
  rows.push(["INCIDENT DETAILS"]);
  rows.push(["Date", form.date || ""]);
  rows.push(["Location", form.incident_location || ""]);
  rows.push(["Nature of Call", form.nature_of_call || ""]);
  rows.push(["Action Taken", form.action_taken || ""]);
  rows.push(["Type Response (Primary)", form.type_response || ""]);
  if (form.type_response_2) rows.push(["Type Response (Secondary)", form.type_response_2]);
  if (form.type_response_3) rows.push(["Type Response (Tertiary)", form.type_response_3]);
  rows.push([]);
  
  // Operational Times
  rows.push(["OPERATIONAL TIMES"]);
  rows.push(["Dispatch", form.dispatch_time || ""]);
  rows.push(["First on Scene", form.first_on_scene_time || ""]);
  rows.push(["Control", form.control_time || ""]);
  rows.push(["FD Clear", form.fd_clear_time || ""]);
  rows.push([]);
  
  // Units
  if (units.length > 0) {
    rows.push(["UNITS RESPONDED"]);
    rows.push(["Unit ID", "Personnel", "Dispatch", "Enroute", "On Scene", "Clear"]);
    units.forEach((unit) => {
      rows.push([
        unit.unit_id || "",
        unit.staffing || 0,
        unit.dispatch_time || "",
        unit.enroute_time || "",
        unit.on_scene_time || "",
        unit.clear_time || ""
      ]);
    });
    rows.push([]);
  }
  
  // Responders
  if (responders.length > 0) {
    rows.push(["PERSONNEL RESPONDED"]);
    rows.push(["Name", "Role", "Unit", "Response Type"]);
    responders.forEach((resp) => {
      rows.push([
        resp.name || "",
        resp.role || "",
        resp.assigned_unit || "",
        resp.response_type || ""
      ]);
    });
    rows.push([]);
  }
  
  // Narrative
  if (form.notes) {
    rows.push(["NARRATIVE"]);
    rows.push([form.notes]);
    rows.push([]);
  }
  
  // Convert to CSV
  const csv = rows.map((row) =>
    row.map((cell) => {
      const escaped = String(cell).replace(/"/g, '""');
      return escaped.includes(",") || escaped.includes('"') || escaped.includes("\n") ? `"${escaped}"` : escaped;
    }).join(",")
  ).join("\n");
  
  return csv;
}