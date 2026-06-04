/**
 * NERIS Payload Builder
 * Produces a payload shape compatible with the Apps Script engine:
 *   nerisUpsertIncidentByIdPatchFirst() / nerisValidateIncidentById_()
 *
 * Human label  →  NERIS code (TYPE_RESPONSE_MAP)
 * The Apps Script engine maps these codes to the OpenAPI-spec enum values.
 */
import { resolveIncidentTypeCode } from './nerisTranslator.js';

// TYPE_RESPONSE_MAP: Human label → { code: NERIS hierarchy, label: display }
// Source: https://github.com/ulfsri/neris-framework/blob/main/core_schemas/value_sets/csv/type_incident.csv
export const TYPE_RESPONSE_MAP = {
  // ── FIRE > Structure Fire ────────────────────────────────────────────────────
  "Fire - Structure Fire - Structural Involvement":           { code: "FIRE||STRUCTURE_FIRE||STRUCTURAL_INVOLVEMENT_FIRE",              label: "Fire - Structure Fire - Structural Involvement" },
  "Fire - Structure Fire - Room and Contents Fire":           { code: "FIRE||STRUCTURE_FIRE||ROOM_AND_CONTENTS_FIRE",                   label: "Fire - Structure Fire - Room and Contents Fire" },
  "Fire - Structure Fire - Confined Cooking / Appliance Fire":{ code: "FIRE||STRUCTURE_FIRE||CONFINED_COOKING_APPLIANCE_FIRE",          label: "Fire - Structure Fire - Confined Cooking / Appliance Fire" },
  "Fire - Structure Fire - Chimney Fire":                     { code: "FIRE||STRUCTURE_FIRE||CHIMNEY_FIRE",                             label: "Fire - Structure Fire - Chimney Fire" },
  // ── FIRE > Outside Fire ──────────────────────────────────────────────────────
  "Fire - Outside Fire - Vegetation / Grass Fire":            { code: "FIRE||OUTSIDE_FIRE||VEGETATION_GRASS_FIRE",                      label: "Fire - Outside Fire - Vegetation / Grass Fire" },
  "Fire - Outside Fire - Wildfire - Wildland":                { code: "FIRE||OUTSIDE_FIRE||WILDFIRE_WILDLAND",                          label: "Fire - Outside Fire - Wildfire - Wildland" },
  "Fire - Outside Fire - Wildfire - Urban Interface":         { code: "FIRE||OUTSIDE_FIRE||WILDFIRE_URBAN_INTERFACE",                   label: "Fire - Outside Fire - Wildfire - Urban Interface" },
  "Fire - Outside Fire - Trash / Rubbish Fire":               { code: "FIRE||OUTSIDE_FIRE||TRASH_RUBBISH_FIRE",                         label: "Fire - Outside Fire - Trash / Rubbish Fire" },
  "Fire - Outside Fire - Dumpster / Outdoor Container Fire":  { code: "FIRE||OUTSIDE_FIRE||DUMPSTER_OUTDOOR_CONTAINER_FIRE",            label: "Fire - Outside Fire - Dumpster / Outdoor Container Fire" },
  "Fire - Outside Fire - Construction Waste":                 { code: "FIRE||OUTSIDE_FIRE||CONSTRUCTION_WASTE",                         label: "Fire - Outside Fire - Construction Waste" },
  "Fire - Outside Fire - Outside Tank Fire":                  { code: "FIRE||OUTSIDE_FIRE||OUTSIDE_TANK_FIRE",                          label: "Fire - Outside Fire - Outside Tank Fire" },
  "Fire - Outside Fire - Utility Infrastructure Fire":        { code: "FIRE||OUTSIDE_FIRE||UTILITY_INFRASTRUCTURE_FIRE",                label: "Fire - Outside Fire - Utility Infrastructure Fire" },
  "Fire - Outside Fire - Other Outside Fire":                 { code: "FIRE||OUTSIDE_FIRE||OTHER_OUTSIDE_FIRE",                         label: "Fire - Outside Fire - Other Outside Fire" },
  // ── FIRE > Transportation Fire ───────────────────────────────────────────────
  "Fire - Transportation - Vehicle Fire - Passenger":         { code: "FIRE||TRANSPORTATION_FIRE||VEHICLE_FIRE_PASSENGER",              label: "Fire - Transportation Fire - Vehicle Fire - Passenger" },
  "Fire - Transportation - Vehicle Fire - Commercial":        { code: "FIRE||TRANSPORTATION_FIRE||VEHICLE_FIRE_COMMERCIAL",             label: "Fire - Transportation Fire - Vehicle Fire - Commercial" },
  "Fire - Transportation - Vehicle Fire - RV":                { code: "FIRE||TRANSPORTATION_FIRE||VEHICLE_FIRE_RV",                     label: "Fire - Transportation Fire - Vehicle Fire - RV" },
  "Fire - Transportation - Vehicle Fire - Food Truck":        { code: "FIRE||TRANSPORTATION_FIRE||VEHICLE_FIRE_FOOD_TRUCK",             label: "Fire - Transportation Fire - Vehicle Fire - Food Truck" },
  "Fire - Transportation - Boat / Watercraft / Barge Fire":   { code: "FIRE||TRANSPORTATION_FIRE||BOAT_PERSONAL_WATERCRAFT_BARGE_FIRE",label: "Fire - Transportation Fire - Boat / Watercraft / Barge Fire" },
  "Fire - Transportation - Powered Mobility Device Fire":     { code: "FIRE||TRANSPORTATION_FIRE||POWERED_MOBILITY_DEVICE_FIRE",        label: "Fire - Transportation Fire - Powered Mobility Device Fire" },
  "Fire - Transportation - Train / Rail Fire":                { code: "FIRE||TRANSPORTATION_FIRE||TRAIN_RAIL_FIRE",                     label: "Fire - Transportation Fire - Train / Rail Fire" },
  "Fire - Transportation - Aircraft Emergency":               { code: "FIRE||TRANSPORTATION_FIRE||AIRCRAFT_FIRE",                       label: "Fire - Transportation Fire - Aircraft Emergency" },
  // ── FIRE > Special Fire ──────────────────────────────────────────────────────
  "Fire - Special - ESS Fire":                               { code: "FIRE||SPECIAL_FIRE||ESS_FIRE",                                   label: "Fire - Special Fire - ESS Fire" },
  "Fire - Special - Explosion":                              { code: "FIRE||SPECIAL_FIRE||EXPLOSION",                                  label: "Fire - Special Fire - Explosion" },
  "Fire - Special - Infrastructure Fire":                    { code: "FIRE||SPECIAL_FIRE||INFRASTRUCTURE_FIRE",                        label: "Fire - Special Fire - Infrastructure Fire" },
  // ── MEDICAL > Illness ────────────────────────────────────────────────────────
  "Medical - Illness - Abdominal Pain / Problems":            { code: "MEDICAL||ILLNESS||ABDOMINAL_PAIN",                               label: "Medical - Illness - Abdominal Pain / Problems" },
  "Medical - Illness - Allergic Reaction / Stings":           { code: "MEDICAL||ILLNESS||ALLERGIC_REACTION_STINGS",                     label: "Medical - Illness - Allergic Reaction / Stings" },
  "Medical - Illness - Altered Mental Status":                { code: "MEDICAL||ILLNESS||ALTERED_MENTAL_STATUS",                        label: "Medical - Illness - Altered Mental Status" },
  "Medical - Illness - Back Pain (Non-Trauma)":               { code: "MEDICAL||ILLNESS||BACK_PAIN_NON_TRAUMA",                         label: "Medical - Illness - Back Pain (Non-Trauma)" },
  "Medical - Illness - Breathing Problems":                   { code: "MEDICAL||ILLNESS||BREATHING_PROBLEMS",                           label: "Medical - Illness - Breathing Problems" },
  "Medical - Illness - Cardiac Arrest":                       { code: "MEDICAL||ILLNESS||CARDIAC_ARREST",                               label: "Medical - Illness - Cardiac Arrest" },
  "Medical - Illness - Chest Pain (Non-Trauma)":              { code: "MEDICAL||ILLNESS||CHEST_PAIN_NON_TRAUMA",                        label: "Medical - Illness - Chest Pain (Non-Trauma)" },
  "Medical - Illness - Convulsions / Seizures":               { code: "MEDICAL||ILLNESS||CONVULSIONS_SEIZURES",                         label: "Medical - Illness - Convulsions / Seizures" },
  "Medical - Illness - Diabetic Problems":                    { code: "MEDICAL||ILLNESS||DIABETIC_PROBLEMS",                            label: "Medical - Illness - Diabetic Problems" },
  "Medical - Illness - Headache":                             { code: "MEDICAL||ILLNESS||HEADACHE",                                     label: "Medical - Illness - Headache" },
  "Medical - Illness - Heart Problems":                       { code: "MEDICAL||ILLNESS||HEART_PROBLEMS",                               label: "Medical - Illness - Heart Problems" },
  "Medical - Illness - Nausea / Vomiting":                    { code: "MEDICAL||ILLNESS||NAUSEA_VOMITING",                              label: "Medical - Illness - Nausea / Vomiting" },
  "Medical - Illness - No Appropriate Choice":                { code: "MEDICAL||ILLNESS||NO_APPROPRIATE_CHOICE",                        label: "Medical - Illness - No Appropriate Choice" },
  "Medical - Illness - Overdose / Poisoning":                 { code: "MEDICAL||ILLNESS||OVERDOSE",                                     label: "Medical - Illness - Overdose / Poisoning" },
  "Medical - Illness - Pandemic / Epidemic / Outbreak":       { code: "MEDICAL||ILLNESS||PANDEMIC_EPIDEMIC_OUTBREAK",                   label: "Medical - Illness - Pandemic / Epidemic / Outbreak" },
  "Medical - Illness - Pregnancy / Childbirth":               { code: "MEDICAL||ILLNESS||PREGNANCY_CHILDBIRTH",                         label: "Medical - Illness - Pregnancy / Childbirth" },
  "Medical - Illness - Psychological / Behavior Issues":      { code: "MEDICAL||ILLNESS||PSYCHOLOGICAL_BEHAVIOR_ISSUES",                label: "Medical - Illness - Psychological / Behavior Issues" },
  "Medical - Illness - Sick Case":                            { code: "MEDICAL||ILLNESS||SICK_CASE",                                    label: "Medical - Illness - Sick Case" },
  "Medical - Illness - Stroke / CVA":                         { code: "MEDICAL||ILLNESS||STROKE_CVA",                                   label: "Medical - Illness - Stroke / CVA" },
  "Medical - Illness - Unconscious Victim":                   { code: "MEDICAL||ILLNESS||UNCONSCIOUS_VICTIM",                           label: "Medical - Illness - Unconscious Victim" },
  "Medical - Illness - Unknown Problem":                      { code: "MEDICAL||ILLNESS||UNKNOWN_PROBLEM",                              label: "Medical - Illness - Unknown Problem" },
  "Medical - Illness - Well Person Check":                    { code: "MEDICAL||ILLNESS||WELL_PERSON_CHECK",                            label: "Medical - Illness - Well Person Check" },
  // ── MEDICAL > Injury / Trauma ────────────────────────────────────────────────
  "Medical - Injury - Animal Bites":                          { code: "MEDICAL||INJURY||ANIMAL_BITES",                                  label: "Medical - Injury - Animal Bites" },
  "Medical - Injury - Assault":                               { code: "MEDICAL||INJURY||ASSAULT",                                       label: "Medical - Injury - Assault" },
  "Medical - Injury - Burns / Explosion":                     { code: "MEDICAL||INJURY||BURNS_EXPLOSION",                               label: "Medical - Injury - Burns / Explosion" },
  "Medical - Injury - Carbon Monoxide / Inhalation Injury":   { code: "MEDICAL||INJURY||CARBON_MONOXIDE_OTHER_INHALATION_INJURY",       label: "Medical - Injury - Carbon Monoxide / Inhalation Injury" },
  "Medical - Injury - Choking":                               { code: "MEDICAL||INJURY||CHOKING",                                       label: "Medical - Injury - Choking" },
  "Medical - Injury - Drowning / Near Drowning":              { code: "MEDICAL||INJURY||DROWNING_NEAR_DROWNING",                        label: "Medical - Injury - Drowning / Near Drowning" },
  "Medical - Injury - Electrocution / Lightning":             { code: "MEDICAL||INJURY||ELECTROCUTION_LIGHTNING",                       label: "Medical - Injury - Electrocution / Lightning" },
  "Medical - Injury - Eye Problems / Injuries":               { code: "MEDICAL||INJURY||EYE_PROBLEMS_INJURIES",                         label: "Medical - Injury - Eye Problems / Injuries" },
  "Medical - Injury - Fall":                                  { code: "MEDICAL||INJURY||FALL",                                          label: "Medical - Injury - Fall" },
  "Medical - Injury - MVC Injury":                            { code: "MEDICAL||INJURY||MVC_INJURY",                                    label: "Medical - Injury - MVC Injury" },
  "Medical - Injury - No Appropriate Choice":                 { code: "MEDICAL||INJURY||NO_APPROPRIATE_CHOICE",                         label: "Medical - Injury - No Appropriate Choice" },
  "Medical - Injury - Penetrating Trauma":                    { code: "MEDICAL||INJURY||PENETRATING_TRAUMA",                            label: "Medical - Injury - Penetrating Trauma" },
  "Medical - Injury - Sports / Recreational Injury":          { code: "MEDICAL||INJURY||SPORTS_RECREATIONAL_INJURY",                    label: "Medical - Injury - Sports / Recreational Injury" },
  "Medical - Injury - Traumatic Injury (General)":            { code: "MEDICAL||INJURY||TRAUMATIC_INJURY",                              label: "Medical - Injury - Traumatic Injury (General)" },
  // ── MEDICAL > Other ──────────────────────────────────────────────────────────
  "Medical - Other - Medical Alarm":                          { code: "MEDICAL||OTHER||MEDICAL_ALARM",                                  label: "Medical - Other - Medical Alarm" },
  "Medical - Other - No Appropriate Choice":                  { code: "MEDICAL||OTHER||NO_APPROPRIATE_CHOICE",                          label: "Medical - Other - No Appropriate Choice" },
  // ── HAZARDOUS SITUATION ──────────────────────────────────────────────────────
  "HazSit - Hazard Non-Chemical - Motor Vehicle Collision":   { code: "HAZSIT||HAZARD_NONCHEM||MOTOR_VEHICLE_COLLISION",                label: "HazSit - Motor Vehicle Collision" },
  "HazSit - Hazard Non-Chemical - Bomb Threat / Suspicious Package": { code: "HAZSIT||HAZARD_NONCHEM||BOMB_THREAT_RESPONSE_SUSPICIOUS_PACKAGE", label: "HazSit - Bomb Threat / Suspicious Package" },
  "HazSit - Hazard Non-Chemical - Electrical Power Line Down":{ code: "HAZSIT||HAZARD_NONCHEM||ELEC_POWER_LINE_DOWN_ARCHING_MALFUNC",   label: "HazSit - Electrical Power Line Down" },
  "HazSit - Hazard Non-Chemical - Electrical Hazard / Short": { code: "HAZSIT||HAZARD_NONCHEM||ELEC_HAZARD_SHORT_CIRCUIT",              label: "HazSit - Electrical Hazard / Short Circuit" },
  "HazSit - HazMat - Fuel Spill / Fuel Odor":                 { code: "HAZSIT||HAZARDOUS_MATERIALS||FUEL_SPILL_ODOR",                   label: "HazSit - HazMat - Fuel Spill / Fuel Odor" },
  "HazSit - HazMat - Gas Leak / Gas Odor":                    { code: "HAZSIT||HAZARDOUS_MATERIALS||GAS_LEAK_ODOR",                     label: "HazSit - HazMat - Gas Leak / Gas Odor" },
  "HazSit - HazMat - Carbon Monoxide Release":                { code: "HAZSIT||HAZARDOUS_MATERIALS||CARBON_MONOXIDE_RELEASE",            label: "HazSit - HazMat - Carbon Monoxide Release" },
  "HazSit - HazMat - Biological Release / Incident":          { code: "HAZSIT||HAZARDOUS_MATERIALS||BIOLOGICAL_RELEASE_INCIDENT",        label: "HazSit - HazMat - Biological Release / Incident" },
  "HazSit - HazMat - Radioactive Release / Incident":         { code: "HAZSIT||HAZARDOUS_MATERIALS||RADIOACTIVE_RELEASE_INCIDENT",       label: "HazSit - HazMat - Radioactive Release / Incident" },
  "HazSit - HazMat - HazMat Release (Chemical Transport)":    { code: "HAZSIT||HAZARDOUS_MATERIALS||HAZMAT_RELEASE_TRANSPORT",           label: "HazSit - HazMat - HazMat Release (Chemical Transport)" },
  "HazSit - HazMat - HazMat Release (Fixed Facility)":        { code: "HAZSIT||HAZARDOUS_MATERIALS||HAZMAT_RELEASE_FACILITY",            label: "HazSit - HazMat - HazMat Release (Fixed Facility)" },
  "HazSit - Overpressure - Rupture Without Fire":              { code: "HAZSIT||OVERPRESSURE||RUPTURE_WITHOUT_FIRE",                     label: "HazSit - Overpressure - Rupture Without Fire" },
  "HazSit - Overpressure - No Rupture":                        { code: "HAZSIT||OVERPRESSURE||NO_RUPTURE",                               label: "HazSit - Overpressure - No Rupture" },
  "HazSit - Investigation - Odor":                             { code: "HAZSIT||INVESTIGATION||ODOR",                                    label: "HazSit - Investigation - Odor" },
  "HazSit - Investigation - Smoke Investigation":              { code: "HAZSIT||INVESTIGATION||SMOKE_INVESTIGATION",                     label: "HazSit - Investigation - Smoke Investigation" },
  // ── RESCUE ───────────────────────────────────────────────────────────────────
  "Rescue - Transportation - MVC Extrication / Entrapped":    { code: "RESCUE||TRANSPORTATION||MOTOR_VEHICLE_EXTRICATION_ENTRAPPED",    label: "Rescue - MVC Extrication / Entrapped" },
  "Rescue - Transportation - Water Vehicle Rescue":            { code: "RESCUE||TRANSPORTATION||WATER_VEHICLE_RESCUE",                   label: "Rescue - Water Vehicle Rescue" },
  "Rescue - Transportation - Aircraft Rescue":                 { code: "RESCUE||TRANSPORTATION||AIRCRAFT_RESCUE",                        label: "Rescue - Aircraft Rescue" },
  "Rescue - SAR - Search and Rescue":                          { code: "RESCUE||SAR",                                                    label: "Rescue - Search and Rescue" },
  "Rescue - Water / Ice Rescue":                               { code: "RESCUE||WATER_ICE_RESCUE",                                       label: "Rescue - Water / Ice Rescue" },
  "Rescue - Confined Space Rescue":                            { code: "RESCUE||CONFINED_SPACE",                                         label: "Rescue - Confined Space Rescue" },
  "Rescue - High / Low Angle Rope Rescue":                     { code: "RESCUE||HIGH_LOW_ANGLE_ROPE_RESCUE",                             label: "Rescue - High / Low Angle Rope Rescue" },
  "Rescue - Trench / Excavation Rescue":                       { code: "RESCUE||TRENCH_EXCAVATION_RESCUE",                               label: "Rescue - Trench / Excavation Rescue" },
  "Rescue - Structural Collapse Rescue":                       { code: "RESCUE||STRUCTURAL_COLLAPSE",                                    label: "Rescue - Structural Collapse Rescue" },
  // ── PUBLIC SERVICE ───────────────────────────────────────────────────────────
  "Public Service - Alarms - Fire Alarm":                      { code: "PUBSERV||ALARMS_NONMED||FIRE_ALARM",                             label: "Public Service - Alarms - Fire Alarm" },
  "Public Service - Alarms - CO Alarm":                        { code: "PUBSERV||ALARMS_NONMED||CO_ALARM",                               label: "Public Service - Alarms - CO Alarm" },
  "Public Service - Alarms - Other Alarm":                     { code: "PUBSERV||ALARMS_NONMED||OTHER_ALARM",                            label: "Public Service - Alarms - Other Alarm" },
  "Public Service - Citizen Assist - Lift Assist":             { code: "PUBSERV||CITIZEN_ASSIST||LIFT_ASSIST",                           label: "Public Service - Citizen Assist - Lift Assist" },
  "Public Service - Citizen Assist - Lock In / Lock Out":      { code: "PUBSERV||CITIZEN_ASSIST||LOCK_IN_LOCK_OUT",                      label: "Public Service - Citizen Assist - Lock In / Lock Out" },
  "Public Service - Citizen Assist - Animal Rescue / Control": { code: "PUBSERV||CITIZEN_ASSIST||ANIMAL_RESCUE_CONTROL",                 label: "Public Service - Citizen Assist - Animal Rescue / Control" },
  "Public Service - Other Public Service":                     { code: "PUBSERV||OTHER_PUBSERV",                                         label: "Public Service - Other Public Service" },
  // ── NO EMERGENCY ─────────────────────────────────────────────────────────────
  "No Emergency - Cancelled":                                  { code: "NOEMERG||CANCELLED",                                             label: "No Emergency - Cancelled" },
  "No Emergency - Good Intent - Controlled Burning":           { code: "NOEMERG||GOOD_INTENT||CONTROLLED_BURNING_AUTHORIZED",            label: "No Emergency - Good Intent - Controlled Burning" },
  "No Emergency - Good Intent - Authorized Prescribed Burn":   { code: "NOEMERG||GOOD_INTENT||AUTHORIZED_PRESCRIBED_BURN",               label: "No Emergency - Good Intent - Authorized Prescribed Burn" },
  "No Emergency - Good Intent - Other Good Intent":            { code: "NOEMERG||GOOD_INTENT||OTHER_GOOD_INTENT",                         label: "No Emergency - Good Intent - Other Good Intent" },
  // ── NATURAL DISASTER ─────────────────────────────────────────────────────────
  "Natural Disaster - Flood":                                  { code: "NATURAL_DISASTER||FLOOD",                                        label: "Natural Disaster - Flood" },
  "Natural Disaster - Tornado / Severe Wind":                  { code: "NATURAL_DISASTER||TORNADO_SEVERE_WIND",                          label: "Natural Disaster - Tornado / Severe Wind" },
  "Natural Disaster - Earthquake":                             { code: "NATURAL_DISASTER||EARTHQUAKE",                                   label: "Natural Disaster - Earthquake" },
  "Natural Disaster - Other Natural Disaster":                 { code: "NATURAL_DISASTER||OTHER_NATURAL_DISASTER",                       label: "Natural Disaster - Other Natural Disaster" },
  // ── OTHER ────────────────────────────────────────────────────────────────────
  "Other":                                                     { code: "OTHER",                                                          label: "Other" },
};

/** Convert "HH:MM" + date string to ISO datetime string.
 *  Treats dateStr as a LOCAL calendar date (YYYY-MM-DD) — not UTC —
 *  so "2026-05-29" + "13:00" on CDT (UTC-5) → "2026-05-29T18:00:00.000Z".
 */
function toISO(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null;
  try {
    const [year, month, day] = dateStr.split("-").map(Number);
    const [h, m] = timeStr.split(":").map(Number);
    // Construct using local year/month/day to avoid UTC-midnight shift
    const d = new Date(year, month - 1, day, h, m, 0, 0);
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
  const resolveType = (raw) => {
    if (!raw) return null;
    if (TYPE_RESPONSE_MAP[raw]) return TYPE_RESPONSE_MAP[raw];
    // Fallback: attempt pattern-based resolution for freetext / legacy values
    const resolved = resolveIncidentTypeCode(raw);
    return { code: resolved || "OTHER", label: raw };
  };
  const incidentType = resolveType(form.type_response) || { code: "OTHER", label: "Other" };
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
    assigned_unit: r.assigned_unit || "",
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
      incident_type_secondary: resolveType(form.type_response_2),
      incident_type_tertiary: resolveType(form.type_response_3),
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
    // Fire modules (structure fire only — parsed from JSON)
    fire_modules: (() => { try { return form.fire_modules_json ? JSON.parse(form.fire_modules_json) : null; } catch(_) { return null; } })(),

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