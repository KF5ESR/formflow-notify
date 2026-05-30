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
  'allergic reaction':                    'MEDICAL||ILLNESS||ALLERGIC_REACTION',
  'allergic reaction stings':             'MEDICAL||ILLNESS||ALLERGIC_REACTION',
  'medical alarm':                        'MEDICAL||OTHER||MEDICAL_ALARM',
  'medical illness':                      'MEDICAL||ILLNESS',
  'illness':                              'MEDICAL||ILLNESS',
  // Medical - Injury/Trauma
  'fall':                                 'MEDICAL||INJURY||FALL',
  'medical injury':                       'MEDICAL||INJURY',
  'injury':                               'MEDICAL||INJURY',
  'trauma':                               'MEDICAL||INJURY',
  'mvc injury':                           'MEDICAL||INJURY||MVC_INJURY',
  // Medical - Obstetrics
  'pregnancy':                            'MEDICAL||OBSTETRICS||PREGNANCY_CHILDBIRTH',
  'childbirth':                           'MEDICAL||OBSTETRICS||PREGNANCY_CHILDBIRTH',
  'labor':                                'MEDICAL||OBSTETRICS||PREGNANCY_CHILDBIRTH',
  'delivery':                             'MEDICAL||OBSTETRICS||PREGNANCY_CHILDBIRTH',
  // Fire - Structure
  'structure fire':                       'FIRE||STRUCTURE_FIRE||STRUCTURAL_INVOLVEMENT',
  'structural involvement':               'FIRE||STRUCTURE_FIRE||STRUCTURAL_INVOLVEMENT',
  'room and contents':                    'FIRE||STRUCTURE_FIRE||ROOM_AND_CONTENTS_FIRE',
  'room contents fire':                   'FIRE||STRUCTURE_FIRE||ROOM_AND_CONTENTS_FIRE',
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
  // Hazardous Situation
  'motor vehicle collision':              'HAZSIT||HAZARD_NONCHEM||MOTOR_VEHICLE_COLLISION',
  'mvc':                                  'HAZSIT||HAZARD_NONCHEM||MOTOR_VEHICLE_COLLISION',
  'mva':                                  'HAZSIT||HAZARD_NONCHEM||MOTOR_VEHICLE_COLLISION',
  'carbon monoxide':                      'HAZSIT||HAZARDOUS_MATERIALS||CARBON_MONOXIDE_RELEASE',
  'carbon monoxide release':              'HAZSIT||HAZARDOUS_MATERIALS||CARBON_MONOXIDE_RELEASE',
  'smoke investigation':                  'HAZSIT||INVESTIGATION||SMOKE_INVESTIGATION',
  // Rescue
  'motor vehicle collision extrication':  'RESCUE||TRANSPORTATION||MOTOR_VEHICLE_EXTRICATION_ENTRAPPED',
  'extrication':                          'RESCUE||TRANSPORTATION||MOTOR_VEHICLE_EXTRICATION_ENTRAPPED',
  'search and rescue':                    'RESCUE||SAR',
  'sar':                                  'RESCUE||SAR',
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
  'controlled burning':                   'NOEMERG||GOOD_INTENT||CONTROLLED_BURNING_AUTHORIZED',
  'controlled burn':                      'NOEMERG||GOOD_INTENT||CONTROLLED_BURNING_AUTHORIZED',
  'standby':                              'NOEMERG||GOOD_INTENT||CONTROLLED_BURNING_AUTHORIZED',
};

/** Normalize text for lookup: lowercase + strip punctuation to spaces */
function simplify(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
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

  // 2. Strip the "Description > Category > Leaf" chain separator, take deepest part
  const chainSep = s.includes(' > ') ? ' > ' : s.includes(' | ') ? ' | ' : null;
  let leaf = s;
  if (chainSep) {
    const parts = s.split(chainSep).map(p => p.trim()).filter(Boolean);
    leaf = parts[parts.length - 1];
  }

  // 3. Direct map on full input
  const fullSimple = simplify(s);
  if (DIRECT_CODE_MAP[fullSimple]) return DIRECT_CODE_MAP[fullSimple];

  // 4. Direct map on leaf
  const leafSimple = simplify(leaf);
  if (DIRECT_CODE_MAP[leafSimple]) return DIRECT_CODE_MAP[leafSimple];

  // 5. Regex patterns (mirrors FANerisTools.gs patterns array)
  const patterns = [
    [/chest\s*pain/i,                           'MEDICAL||ILLNESS||CHEST_PAIN_NON_TRAUMA'],
    [/back\s*pain/i,                            'MEDICAL||ILLNESS||BACK_PAIN_NON_TRAUMA'],
    [/(nausea|vomit)/i,                         'MEDICAL||ILLNESS||NAUSEA_VOMITING'],
    [/allerg/i,                                 'MEDICAL||ILLNESS||ALLERGIC_REACTION'],
    [/pregnan|childbirth|obstet/i,              'MEDICAL||OBSTETRICS||PREGNANCY_CHILDBIRTH'],
    [/medical.*illnes/i,                        'MEDICAL||ILLNESS'],
    [/medical.*injur/i,                         'MEDICAL||INJURY'],
    [/\bfall\b/i,                               'MEDICAL||INJURY||FALL'],
    [/extrication|entrapped/i,                  'RESCUE||TRANSPORTATION||MOTOR_VEHICLE_EXTRICATION_ENTRAPPED'],
    [/motor.vehicle.collision|mvc|mva/i,        'HAZSIT||HAZARD_NONCHEM||MOTOR_VEHICLE_COLLISION'],
    [/lift.assist/i,                            'PUBSERV||CITIZEN_ASSIST||LIFT_ASSIST'],
    [/carbon.monoxide/i,                        'HAZSIT||HAZARDOUS_MATERIALS||CARBON_MONOXIDE_RELEASE'],
    [/co\s+alarm/i,                             'PUBSERV||ALARMS_NONMED||CO_ALARM'],
    [/(fire|smoke)\s+alarm/i,                   'PUBSERV||ALARMS_NONMED||FIRE_ALARM'],
    [/smoke.investig/i,                         'HAZSIT||INVESTIGATION||SMOKE_INVESTIGATION'],
    [/wildfire.*interface/i,                    'FIRE||OUTSIDE_FIRE||WILDFIRE_URBAN_INTERFACE'],
    [/wildfire|wildland/i,                      'FIRE||OUTSIDE_FIRE||WILDFIRE_WILDLAND'],
    [/vegetation|grass.*fire/i,                 'FIRE||OUTSIDE_FIRE||VEGETATION_GRASS_FIRE'],
    [/dumpster/i,                               'FIRE||OUTSIDE_FIRE||DUMPSTER_OUTDOOR_CONTAINER_FIRE'],
    [/trash|rubbish/i,                          'FIRE||OUTSIDE_FIRE||TRASH_RUBBISH_FIRE'],
    [/vehicle.fire.*commercial/i,               'FIRE||TRANSPORTATION_FIRE||VEHICLE_FIRE_COMMERCIAL'],
    [/vehicle.fire/i,                           'FIRE||TRANSPORTATION_FIRE||VEHICLE_FIRE_PASSENGER'],
    [/structural.involvem/i,                    'FIRE||STRUCTURE_FIRE||STRUCTURAL_INVOLVEMENT'],
    [/room.and.contents/i,                      'FIRE||STRUCTURE_FIRE||ROOM_AND_CONTENTS_FIRE'],
    [/structure.fire/i,                         'FIRE||STRUCTURE_FIRE||STRUCTURAL_INVOLVEMENT'],
    [/controlled.burn/i,                        'NOEMERG||GOOD_INTENT||CONTROLLED_BURNING_AUTHORIZED'],
    [/cancel/i,                                 'NOEMERG||CANCELLED'],
    [/search.and.rescue|sar\b/i,                'RESCUE||SAR'],
  ];
  for (const [rx, code] of patterns) {
    if (rx.test(leaf)) return code;
  }

  // 6. Fallback: return empty (caller will handle)
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

  const incidentTypes = [
    codeHierarchy1 && {
      code: leafCode(codeHierarchy1),
      type: codeHierarchy1,
      original: rawLabel1 || rawType1,
    },
    codeHierarchy2 && {
      code: leafCode(codeHierarchy2),
      type: codeHierarchy2,
      original: rawLabel2 || rawType2,
    },
  ].filter(Boolean);

  const primaryCode = codeHierarchy1 || '';

  // ── Address ───────────────────────────────────────────────────────────────
  const address = parseAddress(dispatch.location?.additional_info || '', defaults);

  // ── Narrative ─────────────────────────────────────────────────────────────
  const narrative = base.narrative || '';

  // ── Dispatch times ────────────────────────────────────────────────────────
  // Per Apps Script conventions:
  //   call_create / call_answered / dispatched_time → alarm_time
  //   call_arrival → first_on_scene_time (unit arrival at scene, PSAP fallback)
  //   incident_clear → fd_clear_time
  const alarmISO = dispatch.alarm_time || '';
  const onSceneISO = dispatch.first_on_scene_time || '';
  const clearISO = dispatch.incident_clear || '';

  // ── Unit responses ────────────────────────────────────────────────────────
  const unitResponses = apparatus.map(u => {
    const raw = {
      // Use reported_id_unit for non-NERIS labels (e.g. "POV", "E555")
      // Will swap to neris_id_unit if/when unit catalog is available
      reported_id_unit: u.unit_id || '',
      staffing: u.staffing != null && u.staffing !== '' ? Number(u.staffing) : undefined,
      // Map FA time keys → canonical NERIS keys
      dispatch: u.dispatch_time || '',
      enroute_to_scene: u.enroute_time || '',
      on_scene: u.on_scene_time || '',
      unit_clear: u.clear_time || '',
    };
    // Remove empty strings to avoid sending null-like values
    Object.keys(raw).forEach(k => {
      if (raw[k] === '' || raw[k] == null) delete raw[k];
    });
    return canonicalizeUnitTimes(raw);
  }).filter(u => u.reported_id_unit || u.unit_neris_id);

  // ── NERIS API Payload (final shape) ───────────────────────────────────────
  const payload = {
    incident_id: meta.nfirs_id || dispatch.incident_number || '',

    // Top-level fields (some NERIS API versions expect these flat)
    narrative,
    address: address.additional_info || '',
    call_type: primaryCode,

    // base object
    base: {
      incident_number: meta.nfirs_id || dispatch.incident_number || '',
      narrative,
      address: address.additional_info || '',
      investigation: base.investigation === true,
      action_taken: base.action_taken || '',
      property_type: base.property_type || undefined,
      fatalities: base.fatalities || 0,
      patients_injured: base.patients_injured || 0,
    },

    // dispatch object
    dispatch: {
      primary_type: primaryCode,

      // Time chain (Apps Script fills call_create from alarm if no earlier PSAP time)
      call_create:    alarmISO || undefined,
      call_answered:  alarmISO || undefined,
      dispatched_time: alarmISO || undefined,
      call_arrival:   onSceneISO || undefined,   // first unit on scene
      incident_clear: clearISO || undefined,

      unit_responses: unitResponses.length ? unitResponses : undefined,
    },

    // Incident types array (canonical hierarchy objects)
    incident_types: incidentTypes,
  };

  // Strip undefined keys at top level
  Object.keys(payload).forEach(k => { if (payload[k] === undefined) delete payload[k]; });
  Object.keys(payload.base).forEach(k => { if (payload.base[k] === undefined) delete payload.base[k]; });
  Object.keys(payload.dispatch).forEach(k => { if (payload.dispatch[k] === undefined) delete payload.dispatch[k]; });

  return payload;
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
  if (!payload.incident_id) errors.push('incident_id is missing — NFIRS ID required');
  if (!payload.narrative) warnings.push('narrative is empty');
  if (!payload.call_type) errors.push('call_type is missing — incident type not resolved');
  if (!payload.incident_types || payload.incident_types.length === 0) errors.push('incident_types array is empty');

  // Incident type code format
  (payload.incident_types || []).forEach((t, i) => {
    if (!t.type || !/\|\|/.test(t.type)) {
      errors.push(`incident_types[${i}].type "${t.type || ''}" is not a valid NERIS hierarchy (expected X||Y||Z format)`);
    }
    if (!t.code) {
      errors.push(`incident_types[${i}].code is missing`);
    }
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
      if (!u.reported_id_unit && !u.unit_neris_id && !u.neris_id_unit) {
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