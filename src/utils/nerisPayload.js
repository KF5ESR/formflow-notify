/**
 * NERIS Payload Builder
 * Produces a payload shape compatible with the Apps Script engine:
 *   nerisUpsertIncidentByIdPatchFirst() / nerisValidateIncidentById_()
 *
 * Human label  →  NERIS code (TYPE_RESPONSE_MAP)
 * The Apps Script engine maps these codes to the OpenAPI-spec enum values.
 */

export const TYPE_RESPONSE_MAP = {
  // Medical
  "Medical > Illness > Chest Pain (Non-Trauma)":          { code: "MEDICAL||ILLNESS||CHEST_PAIN_NON_TRAUMA",        label: "Medical - Illness - Chest Pain (Non-Trauma)" },
  "Medical > Illness > Allergic Reaction / Stings":       { code: "MEDICAL||ILLNESS||ALLERGIC_REACTION",            label: "Medical - Illness - Allergic Reaction / Stings" },
  "Medical > Illness > Nausea / Vomiting":                { code: "MEDICAL||ILLNESS||NAUSEA_VOMITING",              label: "Medical - Illness - Nausea / Vomiting" },
  "Medical > Trauma > Fall":                              { code: "MEDICAL||TRAUMA||FALL",                          label: "Medical - Injury/Trauma - Fall" },
  "Medical > Trauma > MVC Injury":                        { code: "MEDICAL||TRAUMA||MVC_INJURY",                    label: "Medical - Injury/Trauma - MVC Injury" },
  // Fire
  "Fire > Structure Fire > Structural Involvement":       { code: "FIRE||STRUCTURE_FIRE||STRUCTURAL_INVOLVEMENT",   label: "Fire - Structure Fire - Structural Involvement" },
  "Fire > Structure Fire > Room and Contents Fire":       { code: "FIRE||STRUCTURE_FIRE||ROOM_AND_CONTENTS",        label: "Fire - Structure Fire - Room and Contents" },
  "Fire > Outside Fire > Vegetation / Grass Fire":        { code: "FIRE||OUTSIDE_FIRE||VEGETATION_GRASS",           label: "Fire - Outside Fire - Vegetation/Grass" },
  "Fire > Outside Fire > Dumpster / Other Outdoor Container Fire": { code: "FIRE||OUTSIDE_FIRE||DUMPSTER_CONTAINER", label: "Fire - Outside Fire - Dumpster/Container" },
  // Other
  "Motor Vehicle Collision (MVC)":                        { code: "RESCUE||VEHICLE||MVC",                          label: "Rescue - Vehicle - MVC" },
  "Search and Rescue (SAR)":                              { code: "RESCUE||SAR",                                   label: "Rescue - Search and Rescue" },
  "No Emergency > Cancelled":                             { code: "NO_EMERGENCY||CANCELLED",                       label: "No Emergency - Cancelled" },
  "No Emergency > Controlled Burn / Standby":             { code: "NO_EMERGENCY||CONTROLLED_BURN",                 label: "No Emergency - Controlled Burn / Standby" },
  "Natural Disaster":                                     { code: "NATURAL_DISASTER",                              label: "Natural Disaster" },
  "Hazmat":                                               { code: "HAZMAT",                                        label: "Hazmat" },
  "Other":                                                { code: "OTHER",                                         label: "Other" },
};

/** Convert "HH:MM" + date string to ISO datetime string */
function toISO(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null;
  try {
    const [h, m] = timeStr.split(":").map(Number);
    const d = new Date(dateStr);
    d.setHours(h, m, 0, 0);
    return d.toISOString();
  } catch (_) { return null; }
}

/** Parse address string into NERIS location object (best-effort) */
function parseAddress(raw) {
  if (!raw) return { additional_info: "" };
  const s = String(raw).trim();
  // Try "123 Street Name, City, ST 72110"
  const m = s.match(/^(\d+[A-Za-z]?)[\s,]+([^,]+?),\s*([^,]+?),?\s*([A-Z]{2})\s*(\d{5}(?:-\d{4})?)?$/);
  if (m) {
    return {
      complete_number: m[1],
      street: m[2].trim(),
      postal_community: m[3].trim(),
      state: m[4],
      postal_code: m[5] || "",
      additional_info: s,
      additional_attributes: { full_address: s },
    };
  }
  // Intersection / partial
  return {
    additional_info: s,
    additional_attributes: { full_address: s },
  };
}

/**
 * Build the NERIS-compatible payload from the form state.
 * @param {object} form  - flat form fields
 * @param {Array}  units - parsed units array
 * @param {Array}  responders - parsed responders array
 * @returns {object} payload shape expected by the Apps Script engine
 */
export function buildNerisPayload(form, units, responders) {
  const incidentType = TYPE_RESPONSE_MAP[form.type_response] || { code: "OTHER", label: form.type_response || "Other" };
  const location = parseAddress(form.incident_location);

  const alarmISO    = toISO(form.date, form.dispatch_time);
  const onSceneISO  = toISO(form.date, form.first_on_scene_time);
  const clearISO    = toISO(form.date, form.fd_clear_time);
  const controlISO  = toISO(form.date, form.control_time);

  // IC name
  const ic = form.incident_commander || (responders.find(r => r.role === "IC") || {}).name || "";

  // Apparatus list from units
  const apparatusStr = units.map(u => u.unit_id).filter(Boolean).join(", ");

  // Responder names for narrative
  const responderNames = responders.map(r => r.name).filter(Boolean).join(", ");

  // Per-unit NERIS apparatus entries
  const nerisApparatus = units.map(u => ({
    unit_id: u.unit_id || "",
    unit_type: u.unit_type || "",
    staffing: u.staffing ? Number(u.staffing) : null,
    dispatch_time: toISO(form.date, u.dispatch_time),
    enroute_time: toISO(form.date, u.enroute_time),
    on_scene_time: toISO(form.date, u.on_scene_time),
    clear_time: toISO(form.date, u.clear_time),
  }));

  // Personnel entries
  const nerisPersonnel = responders.map(r => ({
    name: r.name || "",
    role: r.role || "Primary",
    response_type: r.response_type || "POV",
  }));

  return {
    // Dispatch block (mirrors Apps Script dispatch object)
    dispatch: {
      incident_number: String(form.nfirs_id || ""),
      psrid: form.psrid || "",
      alarm_time: alarmISO,
      first_on_scene_time: onSceneISO,
      controlled_time: controlISO,
      incident_clear: clearISO,
      location: location,
      incident_commander: ic,
      apparatus: apparatusStr,
      responders: responderNames,
    },
    // Base block (mirrors Apps Script base object)
    base: {
      incident_type: incidentType,
      incident_type_secondary: form.type_response_2 ? (TYPE_RESPONSE_MAP[form.type_response_2] || { code: "OTHER", label: form.type_response_2 }) : null,
      narrative: form.notes || "",
      location: location,
      property_type: form.property_type || "",
      value_dollar: form.value_dollar ? Number(form.value_dollar) : null,
      loss_dollar: form.loss_dollar ? Number(form.loss_dollar) : null,
      fatalities: form.fatalities ? Number(form.fatalities) : 0,
      patients_injured: form.patients_injured ? Number(form.patients_injured) : 0,
      investigation: form.investigation === "Yes",
      action_taken: form.action_taken || "",
      conditions: form.conditions_temp || "",
      mutual_aid: form.mutual_aid || "N/A",
      fdid_received: form.fdid_received || "",
      hydrant_location: form.hydrant_location || "",
      products: form.products || "",
      area: form.area || "",
      vin_lic: form.vin_lic || "",
    },
    // Apparatus & personnel arrays
    apparatus: nerisApparatus,
    personnel: nerisPersonnel,
    // Raw guided narrative (human-authored, pre-merge)
    narrative_raw: {
      reported:    form.narrative_reported || "",
      found:       form.narrative_found || "",
      condition:   form.narrative_condition || "",
      actions:     form.narrative_actions || "",
      disposition: form.narrative_disposition || "",
    },
    // NERIS posting metadata
    meta: {
      nfirs_id:              form.nfirs_id || "",
      select_fd:             form.select_fd || "",
      owner_occupant:        form.owner_occupant || "",
      contact_number:        form.contact_number || "",
      neris_env:             form.neris_env || "TEST",
      neris_logged:          !!form.neris_logged,
      neris_post_status:     form.neris_post_status || "",
      neris_incident_composite: form.neris_incident_composite || "",
      form_url:              form.form_url || "",
      generated_at:          new Date().toISOString(),
    },
  };
}