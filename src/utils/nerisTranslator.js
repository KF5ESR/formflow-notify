/**
 * NERIS Translation Engine
 * ========================
 * Layer 3 in the pipeline:
 *   Base44 Incident Record
 *       ↓  (buildNerisPayload)
 *   FAST ATTACK Export JSON      ← responder-facing, human labels
 *       ↓  (translateToNeris)    ← THIS MODULE
 *   NERIS API Payload            ← canonical NERIS schema keys
 *       ↓
 *   Validate → Submit
 *
 * Ported from FANerisTools.gs:
 *   - coerceIncidentTypeHierarchy_()  → resolveIncidentTypeCode()
 *   - canonicalizeUnitResponseForNeris_()  → canonicalizeUnitTimes()
 *   - buildIncidentPayloadFromActiveRow_() → translateToNeris()
 *
 * IMPORTANT: This file knows NOTHING about Base44 entities or the form.
 * It only converts FA Export JSON → NERIS API Payload.
 */

// =============================================================================
// Incident Type Resolution
// =============================================================================

/**
 * Port of coerceIncidentTypeHierarchy_() from FANerisTools.gs
 * Maps human-readable call type text to canonical NERIS code hierarchy.
 * Format: DOMAIN||CATEGORY||SPECIFIC
 *
 * Source: https://github.com/ulfsri/neris-framework/blob/main/core_schemas/value_sets/csv/type_incident.csv
 */
const DIRECT_CODE_MAP = {
  // Medical - Illness
  'chest pain':                           'MEDICAL||ILLNESS||CHEST_PAIN_NON_TRAUMA',
  'chest pain non trauma':                'MEDICAL||ILLNESS||CHEST_PAIN_NON_TRAUMA',
  'back pain':                            'MEDICAL||ILLNESS||BACK_PAIN_NON_TRAUMA',
  'back pain non trauma':                 'MEDICAL||ILLNESS||BACK_PAIN_NON_TRAUMA',
  'nausea':                               'MEDICAL||ILLNESS||NAUSEA_VOMITING',
  'nausea vomiting':                      'MEDICAL||ILLNESS||NAUSEA_VOMITING',
  'allergic reaction':                    'MEDICAL||ILLNESS||ALLERGIC_REACTION_STINGS',
  'allergic reaction stings':             'MEDICAL||ILLNESS||ALLERGIC_REACTION_STINGS',
  'medical alarm':                        'MEDICAL||OTHER||MEDICAL_ALARM',
  'medical illness':                      'MEDICAL||ILLNESS',
  'illness':                              'MEDICAL||ILLNESS',
  // Medical - Injury/Trauma
  'fall':                                 'MEDICAL||INJURY||FALL',
  'medical injury':                       'MEDICAL||INJURY',
  'injury':                               'MEDICAL||INJURY',
  'trauma':                               'MEDICAL||INJURY',
  'traumatic injury':                     'MEDICAL||INJURY||OTHER_TRAUMATIC_INJURY',
  'mvc injury':                           'MEDICAL||INJURY||MOTOR_VEHICLE_COLLISION',
  'mvc':                                  'HAZSIT||HAZARD_NONCHEM||MOTOR_VEHICLE_COLLISION',
  'motor vehicle collision':              'HAZSIT||HAZARD_NONCHEM||MOTOR_VEHICLE_COLLISION',
  'drowning':                             'MEDICAL||INJURY||DROWNING_DIVING_SCUBA_ACCIDENT',
  'near drowning':                        'MEDICAL||INJURY||DROWNING_DIVING_SCUBA_ACCIDENT',
  'electrocution':                        'MEDICAL||INJURY||ELECTROCUTION',
  'gunshot':                              'MEDICAL||INJURY||GUNSHOT_WOUND',
  'hemorrhage':                           'MEDICAL||INJURY||HEMORRHAGE_LACERATION',
  'laceration':                           'MEDICAL||INJURY||HEMORRHAGE_LACERATION',
  'stab':                                 'MEDICAL||INJURY||STAB_PENETRATING_TRAUMA',
  'penetrating trauma':                   'MEDICAL||INJURY||STAB_PENETRATING_TRAUMA',
  'poisoning':                            'MEDICAL||INJURY||POISONING',
  // Medical - Obstetrics (NERIS uses MEDICAL||ILLNESS for pregnancy, no OBSTETRICS domain)
  'pregnancy':                            'MEDICAL||ILLNESS||PREGNANCY_CHILDBIRTH',
  'childbirth':                           'MEDICAL||ILLNESS||PREGNANCY_CHILDBIRTH',
  'labor':                                'MEDICAL||ILLNESS||PREGNANCY_CHILDBIRTH',
  'delivery':                             'MEDICAL||ILLNESS||PREGNANCY_CHILDBIRTH',
  // Fire - Structure
  'structure fire':                       'FIRE||STRUCTURE_FIRE||STRUCTURAL_INVOLVEMENT_FIRE',
  'structural involvement':               'FIRE||STRUCTURE_FIRE||STRUCTURAL_INVOLVEMENT_FIRE',
  'structural involvement fire':          'FIRE||STRUCTURE_FIRE||STRUCTURAL_INVOLVEMENT_FIRE',
  'room and contents':                    'FIRE||STRUCTURE_FIRE||ROOM_AND_CONTENTS_FIRE',
  'room and contents fire':               'FIRE||STRUCTURE_FIRE||ROOM_AND_CONTENTS_FIRE',
  'room contents fire':                   'FIRE||STRUCTURE_FIRE||ROOM_AND_CONTENTS_FIRE',
  'chimney fire':                         'FIRE||STRUCTURE_FIRE||CHIMNEY_FIRE',
  'confined cooking appliance fire':      'FIRE||STRUCTURE_FIRE||CONFINED_COOKING_APPLIANCE_FIRE',
  // Fire - Outside
  'vegetation fire':                      'FIRE||OUTSIDE_FIRE||VEGETATION_GRASS_FIRE',
  'grass fire':                           'FIRE||OUTSIDE_FIRE||VEGETATION_GRASS_FIRE',
  'vegetation grass fire':                'FIRE||OUTSIDE_FIRE||VEGETATION_GRASS_FIRE',
  'dumpster fire':                        'FIRE||OUTSIDE_FIRE||DUMPSTER_OUTDOOR_CONTAINER_FIRE',
  'dumpster outdoor container fire':      'FIRE||OUTSIDE_FIRE||DUMPSTER_OUTDOOR_CONTAINER_FIRE',
  'trash fire':                           'FIRE||OUTSIDE_FIRE||TRASH_RUBBISH_FIRE',
  'rubbish fire':                         'FIRE||OUTSIDE_FIRE||TRASH_RUBBISH_FIRE',
  'wildfire':                             'FIRE||OUTSIDE_FIRE||WILDFIRE_WILDLAND',
  'wildfire wildland':                    'FIRE||OUTSIDE_FIRE||WILDFIRE_WILDLAND',
  'wildfire urban interface':             'FIRE||OUTSIDE_FIRE||WILDFIRE_URBAN_INTERFACE',
  // Fire - Transportation
  'vehicle fire':                         'FIRE||TRANSPORTATION_FIRE||VEHICLE_FIRE_PASSENGER',
  'vehicle fire passenger':               'FIRE||TRANSPORTATION_FIRE||VEHICLE_FIRE_PASSENGER',
  'passenger vehicle fire':               'FIRE||TRANSPORTATION_FIRE||VEHICLE_FIRE_PASSENGER',
  'vehicle fire commercial':              'FIRE||TRANSPORTATION_FIRE||VEHICLE_FIRE_COMMERCIAL',
  'commercial vehicle fire':              'FIRE||TRANSPORTATION_FIRE||VEHICLE_FIRE_COMMERCIAL',
  // Hazardous Situation — MVC as scene hazard (no injury); for MVC with injury use MEDICAL||INJURY||MOTOR_VEHICLE_COLLISION
  'hazsit mvc':                           'HAZSIT||HAZARD_NONCHEM||MOTOR_VEHICLE_COLLISION',
  'mva':                                  'HAZSIT||HAZARD_NONCHEM||MOTOR_VEHICLE_COLLISION',
  'carbon monoxide':                      'HAZSIT||HAZARDOUS_MATERIALS||CARBON_MONOXIDE_RELEASE',
  'carbon monoxide release':              'HAZSIT||HAZARDOUS_MATERIALS||CARBON_MONOXIDE_RELEASE',
  'smoke investigation':                  'HAZSIT||INVESTIGATION||SMOKE_INVESTIGATION',
  // Rescue
  'motor vehicle collision extrication':  'RESCUE||TRANSPORTATION||MOTOR_VEHICLE_EXTRICATION_ENTRAPPED',
  'extrication':                          'RESCUE||TRANSPORTATION||MOTOR_VEHICLE_EXTRICATION_ENTRAPPED',
  'search and rescue':                    'RESCUE||OUTSIDE||BACKCOUNTRY_RESCUE',
  'sar':                                  'RESCUE||OUTSIDE||BACKCOUNTRY_RESCUE',
  'water rescue':                         'RESCUE||WATER||PERSON_IN_WATER_STANDING',
  'swiftwater':                           'RESCUE||WATER||PERSON_IN_WATER_SWIFTWATER',
  'confined space':                       'RESCUE||OUTSIDE||CONFINED_SPACE_RESCUE',
  'structural collapse':                  'RESCUE||STRUCTURE||BUILDING_STRUCTURE_COLLAPSE',
  'lift assist':                          'PUBSERV||CITIZEN_ASSIST||LIFT_ASSIST',
  // Public Service / Alarms
  'fire alarm':                           'PUBSERV||ALARMS_NONMED||FIRE_ALARM',
  'smoke alarm':                          'PUBSERV||ALARMS_NONMED||FIRE_ALARM',
  'fire smoke alarm':                     'PUBSERV||ALARMS_NONMED||FIRE_ALARM',
  'co alarm':                             'PUBSERV||ALARMS_NONMED||CO_ALARM',
  // No Emergency
  'cancelled':                            'NOEMERG||CANCELLED',
  'canceled':                             'NOEMERG||CANCELLED',
  'no emergency cancelled':               'NOEMERG||CANCELLED',
  'false alarm':                          'NOEMERG||FALSE_ALARM||ACCIDENTAL_ALARM',
  'accidental alarm':                     'NOEMERG||FALSE_ALARM||ACCIDENTAL_ALARM',
  'malfunctioning alarm':                 'NOEMERG||FALSE_ALARM||MALFUNCTIONING_ALARM',
  'controlled burning':                   'NOEMERG||GOOD_INTENT||CONTROLLED_BURNING_AUTHORIZED',
  'controlled burn':                      'NOEMERG||GOOD_INTENT||CONTROLLED_BURNING_AUTHORIZED',
  'no incident found':                    'NOEMERG||GOOD_INTENT||NO_INCIDENT_FOUND_LOCATION_ERROR',
  'standby':                              'PUBSERV||OTHER||STANDBY',
  'gas alarm':                            'PUBSERV||ALARMS_NONMED||GAS_ALARM',
};

/** Normalize text for lookup: lowercase + strip punctuation to spaces */
function simplify(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

/** Normalize Google Forms " > " separator to " - " to match TYPE_RESPONSE_MAP keys */
function normalizeFormsSeparator(s) {
  return String(s || '').replace(/ > /g, ' - ');
}

/**
 * Resolve a human label or FA type_response value to a canonical NERIS code hierarchy.
 * Priority:
 *   1. Already looks like a code hierarchy (e.g. FIRE||OUTSIDE_FIRE||...)
 *   2. Direct map lookup (simplified)
 *   3. Regex pattern fallback
 *   4. Return simplified label as-is (better than silent failure)
 */
export function resolveIncidentTypeCode(raw) {
  if (!raw) return '';
  const s = String(raw).trim();

  // 1. Already canonical
  if (/^[A-Z]+(\|\|[A-Z_]+)+$/.test(s)) return s;

  // 2. Normalize Google Forms " > " separator → " - " and try TYPE_RESPONSE_MAP
  const normalized = normalizeFormsSeparator(s);
  // Inline import to avoid circular dependency — pull code from the map if it matches
  // (TYPE_RESPONSE_MAP is defined in nerisPayload.js which imports this file,
  //  so we cannot import it back. Instead, replicate the normalization pattern here
  //  and rely on pattern matching below for the actual resolution.)

  // 3. Strip the "Description > Category > Leaf" chain separator, take deepest part
  const chainSep = normalized.includes(' - ') ? ' - ' : null;
  let leaf = normalized;
  if (chainSep) {
    const parts = normalized.split(chainSep).map(p => p.trim()).filter(Boolean);
    leaf = parts[parts.length - 1];
  }

  // 4. Direct map on full normalized input
  const fullSimple = simplify(normalized);
  if (DIRECT_CODE_MAP[fullSimple]) return DIRECT_CODE_MAP[fullSimple];

  // 5. Direct map on leaf
  const leafSimple = simplify(leaf);
  if (DIRECT_CODE_MAP[leafSimple]) return DIRECT_CODE_MAP[leafSimple];

  // 6. Regex patterns (mirrors FANerisTools.gs patterns array)
  const patterns = [
    [/chest\s*pain/i,                           'MEDICAL||ILLNESS||CHEST_PAIN_NON_TRAUMA'],
    [/back\s*pain/i,                            'MEDICAL||ILLNESS||BACK_PAIN_NON_TRAUMA'],
    [/(nausea|vomit)/i,                         'MEDICAL||ILLNESS||NAUSEA_VOMITING'],
    [/allerg/i,                                 'MEDICAL||ILLNESS||ALLERGIC_REACTION_STINGS'],
    [/pregnan|childbirth|obstet/i,              'MEDICAL||ILLNESS||PREGNANCY_CHILDBIRTH'],
    [/medical.*illnes/i,                        'MEDICAL||ILLNESS'],
    [/medical.*injur/i,                         'MEDICAL||INJURY'],
    [/\bfall\b/i,                               'MEDICAL||INJURY||FALL'],
    [/extrication|entrapped/i,                  'RESCUE||TRANSPORTATION||MOTOR_VEHICLE_EXTRICATION_ENTRAPPED'],
    [/motor.vehicle.collision.*injur|mvc.*injur|mva.*injur|injur.*motor.vehicle.collision/i, 'MEDICAL||INJURY||MOTOR_VEHICLE_COLLISION'],
    [/medical.*motor.vehicle|motor.vehicle.*medical/i, 'MEDICAL||INJURY||MOTOR_VEHICLE_COLLISION'],
    [/motor.vehicle.collision|mvc|mva/i,        'HAZSIT||HAZARD_NONCHEM||MOTOR_VEHICLE_COLLISION'],
    [/lift.assist/i,                            'PUBSERV||CITIZEN_ASSIST||LIFT_ASSIST'],
    [/carbon.monoxide/i,                        'HAZSIT||HAZARDOUS_MATERIALS||CARBON_MONOXIDE_RELEASE'],
    [/co\s+alarm/i,                             'PUBSERV||ALARMS_NONMED||CO_ALARM'],
    [/gas\s+alarm/i,                            'PUBSERV||ALARMS_NONMED||GAS_ALARM'],
    [/(fire|smoke)\s+alarm/i,                   'PUBSERV||ALARMS_NONMED||FIRE_ALARM'],
    [/smoke.investig/i,                         'HAZSIT||INVESTIGATION||SMOKE_INVESTIGATION'],
    [/wildfire.*interface/i,                    'FIRE||OUTSIDE_FIRE||WILDFIRE_URBAN_INTERFACE'],
    [/wildfire|wildland/i,                      'FIRE||OUTSIDE_FIRE||WILDFIRE_WILDLAND'],
    [/vegetation|grass.*fire/i,                 'FIRE||OUTSIDE_FIRE||VEGETATION_GRASS_FIRE'],
    [/dumpster/i,                               'FIRE||OUTSIDE_FIRE||DUMPSTER_OUTDOOR_CONTAINER_FIRE'],
    [/trash|rubbish/i,                          'FIRE||OUTSIDE_FIRE||TRASH_RUBBISH_FIRE'],
    [/vehicle.fire.*commercial/i,               'FIRE||TRANSPORTATION_FIRE||VEHICLE_FIRE_COMMERCIAL'],
    [/vehicle.fire/i,                           'FIRE||TRANSPORTATION_FIRE||VEHICLE_FIRE_PASSENGER'],
    [/structural.involvem/i,                    'FIRE||STRUCTURE_FIRE||STRUCTURAL_INVOLVEMENT_FIRE'],
    [/room.and.contents/i,                      'FIRE||STRUCTURE_FIRE||ROOM_AND_CONTENTS_FIRE'],
    [/structure.fire/i,                         'FIRE||STRUCTURE_FIRE||STRUCTURAL_INVOLVEMENT_FIRE'],
    [/controlled.burn/i,                        'NOEMERG||GOOD_INTENT||CONTROLLED_BURNING_AUTHORIZED'],
    [/cancel/i,                                 'NOEMERG||CANCELLED'],
    [/swiftwater/i,                             'RESCUE||WATER||PERSON_IN_WATER_SWIFTWATER'],
    [/water.rescue|person.in.water/i,           'RESCUE||WATER||PERSON_IN_WATER_STANDING'],
    [/search.and.rescue|sar\b/i,                'RESCUE||OUTSIDE||BACKCOUNTRY_RESCUE'],
    [/traumatic.injur|general.trauma/i,         'MEDICAL||INJURY||OTHER_TRAUMATIC_INJURY'],
    [/drowning|near.drown/i,                    'MEDICAL||INJURY||DROWNING_DIVING_SCUBA_ACCIDENT'],
    [/electrocution/i,                          'MEDICAL||INJURY||ELECTROCUTION'],
    [/gunshot/i,                                'MEDICAL||INJURY||GUNSHOT_WOUND'],
    [/hemorrhage|laceration/i,                  'MEDICAL||INJURY||HEMORRHAGE_LACERATION'],
    [/stab|penetrating.trauma/i,                'MEDICAL||INJURY||STAB_PENETRATING_TRAUMA'],
  ];
  for (const [rx, code] of patterns) {
    if (rx.test(leaf)) return code;
  }

  // 7. Fallback: return empty (caller will handle)
  return '';
}

/** Derive the deepest code segment from a hierarchy */
function leafCode(hierarchy) {
  if (!hierarchy) return '';
  const parts = hierarchy.split('||').filter(Boolean);
  return parts[parts.length - 1] || '';
}

// =============================================================================
// Unit Response Canonicalization
// =============================================================================

/**
 * Port of canonicalizeUnitResponseForNeris_() from FANerisTools.gs
 *
 * Canonical NERIS keys:
 *   dispatch        (NOT dispatch_time, dispatched_time)
 *   enroute_to_scene (NOT enroute_time, en_route_time)
 *   on_scene        (NOT arrival_time, on_scene_time)
 *   unit_clear      (NOT clear_time, unit_clear_time, closed_time)
 *
 * Legacy keys are STRIPPED — the /validate endpoint rejects them as extra_forbidden.
 */
const UNIT_TIME_LEGACY_KEYS = [
  'arrival_time', 'on_scene_time', 'onscene_time',
  'enroute_time', 'en_route_time', 'responding_time',
  'dispatched_time', 'dispatch_time', 'control_time',
  'unit_clear_time', 'clear_time', 'closed_time', 'cleared_time', 'time',
];

export function canonicalizeUnitTimes(unit) {
  const u = { ...unit };

  // Map → canonical keys (first non-empty wins)
  const d = u.dispatch || u.dispatched_time || u.dispatch_time || '';
  const e = u.enroute_to_scene || u.enroute_time || u.en_route_time || u.responding_time || '';
  const o = u.on_scene || u.arrival_time || u.on_scene_time || u.onscene_time || '';
  const c = u.unit_clear || u.unit_clear_time || u.clear_time || u.closed_time || u.cleared_time || '';

  if (d) u.dispatch = d;
  if (e) u.enroute_to_scene = e;
  if (o) u.on_scene = o;
  if (c) u.unit_clear = c;

  // Strip all legacy alias keys
  UNIT_TIME_LEGACY_KEYS.forEach(k => delete u[k]);

  return u;
}

// =============================================================================
// Address Parser
// =============================================================================

function parseAddress(raw, defaults = {}) {
  if (!raw) return { additional_info: '', ...defaults };
  const s = String(raw).trim();
  const m = s.match(/^(\d+[A-Za-z]?)[\s,]+([^,]+?),\s*([^,]+?),?\s*([A-Z]{2})\s*(\d{5}(?:-\d{4})?)?$/);
  if (m) {
    return {
      complete_number: m[1],
      street: m[2].trim(),
      postal_community: m[3].trim(),
      state: m[4],
      postal_code: m[5] || defaults.postal_code || '',
      additional_info: s,
    };
  }
  return {
    additional_info: s,
    postal_community: defaults.city || '',
    state: defaults.state || 'AR',
    postal_code: defaults.postal_code || '',
  };
}

// =============================================================================
// Main Translator
// =============================================================================

/**
 * Translate a FAST ATTACK Export JSON into a NERIS API Payload.
 *
 * @param {object} faJson - Output of buildNerisPayload() from utils/nerisPayload.js
 * @param {object} config - NerisConfig record { env, entity_id, default_state, default_city, default_postal }
 * @returns {object} NERIS API payload ready for /validate or POST
 */
export function translateToNeris(faJson, config = {}) {
  const defaults = {
    state: config.default_state || 'AR',
    city: config.default_city || '',
    postal_code: config.default_postal || '',
  };

  const dispatch = faJson.dispatch || {};
  const base = faJson.base || {};
  const apparatus = faJson.apparatus || [];
  const meta = faJson.meta || {};
  const narrativeRaw = faJson.narrative_raw || {};

  // ── Incident type resolution ──────────────────────────────────────────────
  const rawType1 = base.incident_type?.code || '';  // May already be a hierarchy
  const rawLabel1 = base.incident_type?.label || rawType1;
  const codeHierarchy1 = resolveIncidentTypeCode(rawLabel1) || resolveIncidentTypeCode(rawType1) || rawType1;

  const rawType2 = base.incident_type_secondary?.code || '';
  const rawLabel2 = base.incident_type_secondary?.label || rawType2;
  const codeHierarchy2 = rawLabel2 ? (resolveIncidentTypeCode(rawLabel2) || resolveIncidentTypeCode(rawType2) || rawType2) : '';

  const rawType3 = base.incident_type_tertiary?.code || '';
  const rawLabel3 = base.incident_type_tertiary?.label || rawType3;
  const codeHierarchy3 = rawLabel3 ? (resolveIncidentTypeCode(rawLabel3) || resolveIncidentTypeCode(rawType3) || rawType3) : '';

  const incidentTypes = [
    codeHierarchy1 && { type: codeHierarchy1 },
    codeHierarchy2 && { type: codeHierarchy2 },
    codeHierarchy3 && { type: codeHierarchy3 },
  ].filter(Boolean);

  const primaryCode = codeHierarchy1 || '';

  // ── Address ───────────────────────────────────────────────────────────────
  const address = parseAddress(dispatch.location?.additional_info || '', defaults);

  // ── Narrative ─────────────────────────────────────────────────────────────
  const narrative = base.narrative || '';

  // ── Dispatch times ─────────────────────────────────────────────────────────
  //
  // FAST ATTACK has NO CAD/PSAP connection.
  // All dispatch times are user-entered approximations, NOT CAD truth.
  //
  // NERIS field semantics:
  //   dispatch.call_arrival   → time the call arrived at PSAP/dispatch center
  //   dispatch.call_answered  → time PSAP answered the call
  //   dispatch.call_create    → time the incident was created in CAD
  //
  // Because we have no CAD feed, DISPATCH_TIME (entered by the department)
  // is our best-available approximation for all three PSAP time fields.
  //
  // FIRST_ON_SCENE_TIME is NOT dispatch.call_arrival.
  // It maps to unit_responses[].on_scene for each unit.
  //
  const dispatchISO = dispatch.alarm_time || '';          // DISPATCH_TIME → PSAP fallback
  const clearISO    = dispatch.incident_clear || '';       // FD_CLEAR_TIME

  // ── Unit responses ────────────────────────────────────────────────────────
  //
  // FIRST_ON_SCENE_TIME maps to unit_responses[].on_scene.
  // It is NOT dispatch.call_arrival.
  //
  // For per-unit times: use unit-specific times if available,
  // falling back to the incident-level FIRST_ON_SCENE_TIME for on_scene.
  //
  const incidentOnSceneISO = dispatch.first_on_scene_time || '';

  // Auto-staffing: count responders assigned to each unit
  const personnel = faJson.personnel || [];
  const autoStaffingMap = {};
  personnel.forEach(p => {
    if (p.assigned_unit) autoStaffingMap[p.assigned_unit] = (autoStaffingMap[p.assigned_unit] || 0) + 1;
  });

  const unitResponses = apparatus.map(u => {
    // Time fallbacks: per-unit time → incident-level time → empty
    const unitDispatch = u.dispatch_time  || dispatchISO        || '';
    const unitOnScene  = u.on_scene_time  || incidentOnSceneISO || '';
    const unitClear    = u.clear_time     || clearISO           || '';
    // Staffing: manual override wins; fall back to auto-count from assigned responders
    const overrideStaffing = (u.staffing != null && u.staffing !== '') ? Number(u.staffing) : null;
    const autoStaffing = autoStaffingMap[u.unit_id] || 0;
    const resolvedStaffing = overrideStaffing !== null ? overrideStaffing : (autoStaffing > 0 ? autoStaffing : undefined);
    const raw = {
      reported_unit_id: u.unit_id || '',
      staffing: resolvedStaffing,
      // Canonical NERIS time keys:
      dispatch:          unitDispatch,
      enroute_to_scene:  u.enroute_time || '',
      on_scene:          unitOnScene,
      unit_clear:        unitClear,
    };
    Object.keys(raw).forEach(k => {
      // Keep staffing even if 0; strip only empty strings and null/undefined
      if (k === 'staffing') { if (raw[k] == null) delete raw[k]; }
      else if (raw[k] === '' || raw[k] == null) delete raw[k];
    });
    return canonicalizeUnitTimes(raw);
  }).filter(u => u.reported_unit_id || u.unit_neris_id);

  // ── Fire modules (required for FIRE incidents) ───────────────────────────────
  //
  // The NERIS payload has TWO separate top-level keys:
  //
  //   fire_detail  — location, water, suppression appliances, investigation
  //   smoke_alarm / fire_alarm / other_alarm / fire_suppression  — risk reduction
  //
  // Both are built here from faJson.fire_modules (the shape stored in the record).
  //
  const fireModules = faJson.fire_modules || null;
  const isStructureFire = primaryCode.startsWith('FIRE||STRUCTURE_FIRE');

  // Build fire_detail node.
  //
  // Required fields per NERIS 422 response:
  //   location_detail: arrival_condition, damage_type, room_of_origin_type, cause
  //   fire_detail: water_supply, investigation_needed, investigation_types
  //
  // These must always be present (not stripped as undefined) or the API returns 422 missing.
  //
  const buildFireDetail = (m) => {
    const fd = m?.fire_detail || {};
    const ld = fd.location_detail || {};
    return {
      location_detail: {
        type: ld.type || 'STRUCTURE',
        arrival_condition: ld.arrival_condition || 'FIRE_OUT_UPON_ARRIVAL',
        progression_evident: ld.progression_evident === true,
        damage_type: ld.damage_type || 'NO_DAMAGE',
        floor_of_origin: ld.floor_of_origin != null ? Number(ld.floor_of_origin) : 1,
        room_of_origin_type: ld.room_of_origin_type || 'UNKNOWN',
        cause: ld.cause || 'UNABLE_TO_BE_DETERMINED',
      },
      water_supply: fd.water_supply || 'TANK_WATER',
      ...(Array.isArray(fd.suppression_appliances) && fd.suppression_appliances.length
        ? { suppression_appliances: fd.suppression_appliances } : {}),
      investigation_needed: fd.investigation_needed || 'NOT_EVALUATED',
      investigation_types: Array.isArray(fd.investigation_types) ? fd.investigation_types : [],
    };
  };

  // Build risk reduction fields.
  //
  // NERIS schema (mod_risk_reduction.csv) uses FLAT top-level field names:
  //   smoke_alarm_presence, fire_alarm_presence, other_alarm_presence, fire_suppression_presence
  //   (NOT nested objects like smoke_alarm: { presence: "..." })
  //
  // Sub-fields (smoke_alarm_type, smoke_alarm_working, etc.) are only valid when presence = "PRESENT".
  //
  // Build risk reduction modules as NERIS-schema objects.
  // Each is: { presence: { type: "PRESENT" | "NOT_PRESENT" | "NOT_APPLICABLE" } }
  // The presence.type discriminator is REQUIRED by the NERIS API.
  const buildRiskReduction = (m) => {
    const smokeType    = m?.smoke_alarm?.presence?.type      || 'NOT_APPLICABLE';
    const fireAlType   = m?.fire_alarm?.presence?.type       || 'NOT_APPLICABLE';
    const otherType    = m?.other_alarm?.presence?.type      || 'NOT_APPLICABLE';
    const suppressType = m?.fire_suppression?.presence?.type || 'NOT_APPLICABLE';

    return {
      smoke_alarm:      { presence: { type: smokeType } },
      fire_alarm:       { presence: { type: fireAlType } },
      other_alarm:      { presence: { type: otherType } },
      fire_suppression: { presence: { type: suppressType } },
    };
  };

  // ── NERIS API Payload (final shape — NERIS schema-safe fields only) ────────
  const incidentNumber = meta.nfirs_id || dispatch.incident_number || '';
  const payload = {
    // base object
    base: {
      department_neris_id: config.entity_id || '',
      incident_number: incidentNumber,
      location: address,
      investigation: base.investigation === true,
      action_taken: base.action_taken || '',
      property_type: base.property_type || undefined,
      fatalities: base.fatalities || 0,
      patients_injured: base.patients_injured || 0,
    },

    // dispatch object
    dispatch: {
      incident_number: incidentNumber,
      location: address,

      // PSAP call time fields — all sourced from user-entered DISPATCH_TIME
      // because FAST ATTACK has no CAD connection.
      // call_arrival = when call arrived at dispatch/PSAP (NOT unit on-scene).
      call_arrival:    dispatchISO || undefined,
      call_answered:   dispatchISO || undefined,
      call_create:     dispatchISO || undefined,

      incident_clear: clearISO || undefined,

      unit_responses: unitResponses.length ? unitResponses : undefined,
    },

    // Provenance: document that this is not CAD truth
    _dispatch_provenance: {
      cad_connected:             false,
      dispatch_time_source:      'USER_ENTERED_NON_CAD',
      dispatch_time_confidence:  'MEDIUM',
      note: 'No PSAP/CAD feed. DISPATCH_TIME entered by department personnel as best-available approximation.',
    },

    // Incident types array (canonical hierarchy objects)
    incident_types: incidentTypes,

    // fire_detail — required when at least one FIRE incident type is present.
    // Risk reduction: top-level objects with presence: { type: "..." } discriminator.
    ...(isStructureFire ? { fire_detail: buildFireDetail(fireModules) } : {}),
    ...(isStructureFire ? buildRiskReduction(fireModules) : {}),
  };

  // Strip undefined keys at top level
  Object.keys(payload).forEach(k => { if (payload[k] === undefined) delete payload[k]; });
  Object.keys(payload.base).forEach(k => { if (payload.base[k] === undefined) delete payload.base[k]; });
  Object.keys(payload.dispatch).forEach(k => { if (payload.dispatch[k] === undefined) delete payload.dispatch[k]; });

  return payload;
}

// =============================================================================
// API Payload Builder — strips internal/provenance fields before submission
// =============================================================================

/**
 * Returns a clean payload safe to POST to the NERIS API.
 * All _underscore-prefixed internal fields (e.g. _dispatch_provenance)
 * are metadata for internal auditing only — they MUST NOT be sent
 * in the request body or they will cause extra_forbidden errors.
 *
 * Usage:
 *   const full     = translateToNeris(faJson, config);   // includes provenance
 *   const apiBody  = buildApiPayload(full);              // clean — safe to POST
 */
export function buildApiPayload(payload) {
  const clean = {};
  for (const [k, v] of Object.entries(payload)) {
    if (k.startsWith('_')) continue;  // strip internal fields
    clean[k] = v;
  }
  return clean;
}

// =============================================================================
// Client-side Payload Validation
// =============================================================================

/**
 * Validates a NERIS payload for obvious format/required-field issues.
 * Does NOT call the NERIS API — use a backend function for that.
 * Returns { valid: boolean, errors: string[], warnings: string[] }
 */
export function validateNerisPayload(payload) {
  const errors = [];
  const warnings = [];

  if (!payload) { errors.push('Payload is empty'); return { valid: false, errors, warnings }; }

  // Required
  if (!payload.base?.incident_number) errors.push('base.incident_number is missing — NFIRS ID required');
  if (!payload.base?.department_neris_id) warnings.push('base.department_neris_id is empty — set entity_id in NerisConfig');
  if (!payload.incident_types || payload.incident_types.length === 0) errors.push('incident_types array is empty');

  // Incident type code format
  (payload.incident_types || []).forEach((t, i) => {
    if (!t.type || !/\|\|/.test(t.type)) {
      errors.push(`incident_types[${i}].type "${t.type || ''}" is not a valid NERIS hierarchy (expected X||Y||Z format)`);
    }
    // no .code field expected in clean payload — type hierarchy is sufficient
  });

  // Dispatch
  if (!payload.dispatch) {
    errors.push('dispatch object is missing');
  } else {
    if (!payload.dispatch.call_create) warnings.push('dispatch.call_create (alarm time) is missing');
    if (!payload.dispatch.incident_clear) warnings.push('dispatch.incident_clear (FD clear time) is missing');

    // Check for legacy unit time keys
    const legacyKeys = ['arrival_time','on_scene_time','enroute_time','clear_time','dispatched_time','dispatch_time'];
    (payload.dispatch.unit_responses || []).forEach((u, i) => {
      legacyKeys.forEach(k => {
        if (u[k]) errors.push(`unit_responses[${i}] contains legacy key "${k}" — will be rejected by NERIS /validate (use canonical keys)`);
      });
      if (!u.reported_unit_id && !u.unit_neris_id && !u.neris_id_unit) {
        warnings.push(`unit_responses[${i}] has no unit ID`);
      }
    });

    // Time ordering
    if (payload.dispatch.call_create && payload.dispatch.incident_clear) {
      const start = new Date(payload.dispatch.call_create);
      const end = new Date(payload.dispatch.incident_clear);
      if (!isNaN(start) && !isNaN(end) && end < start) {
        errors.push('dispatch.incident_clear is before dispatch.call_create — time conflict');
      }
    }
  }

  // Base
  if (!payload.base || !payload.base.incident_number) {
    warnings.push('base.incident_number is missing');
  }

  return { valid: errors.length === 0, errors, warnings };
}

// =============================================================================
// Diff utility: compare FA JSON vs NERIS payload keys for audit
// =============================================================================

export function diffLayers(faJson, nerisPayload) {
  const fa = JSON.stringify(faJson, null, 2);
  const neris = JSON.stringify(nerisPayload, null, 2);
  const changes = [];

  // Check key structural differences
  const faTypes = faJson?.base?.incident_type;
  const nerisTypes = nerisPayload?.incident_types;
  if (faTypes && nerisTypes?.length) {
    const faLabel = faTypes.label || '';
    const nerisCode = nerisTypes[0]?.type || '';
    if (faLabel !== nerisCode) {
      changes.push({ field: 'incident_type', fa: faLabel, neris: nerisCode });
    }
  }

  // Unit time key changes
  const faUnits = faJson?.apparatus || [];
  const nerisUnits = nerisPayload?.dispatch?.unit_responses || [];
  faUnits.forEach((faU, i) => {
    const nerisU = nerisUnits[i];
    if (!nerisU) return;
    [
      ['dispatch_time', 'dispatch'],
      ['enroute_time', 'enroute_to_scene'],
      ['on_scene_time', 'on_scene'],
      ['clear_time', 'unit_clear'],
    ].forEach(([faKey, nerisKey]) => {
      if (faU[faKey] && !nerisU[nerisKey]) {
        changes.push({ field: `unit[${i}]`, fa: `${faKey}: ${faU[faKey]}`, neris: `${nerisKey}: (empty?)` });
      }
    });
  });

  return changes;
}