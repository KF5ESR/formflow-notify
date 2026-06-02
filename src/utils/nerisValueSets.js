/**
 * NERIS Value Sets — Live GitHub Reference
 * =========================================
 * Fetches and caches canonical NERIS value set CSVs directly from the
 * ulfsri/neris-framework GitHub repository.
 *
 * Source: https://github.com/ulfsri/neris-framework
 *
 * Usage:
 *   import { getIncidentTypes, getActionTactics, buildLiveIncidentTypeMap } from '@/utils/nerisValueSets';
 *
 *   const types = await getIncidentTypes();   // [{value_1, value_2, value_3, description_1, ...}]
 *   const map   = await buildLiveIncidentTypeMap(); // { "chest pain non trauma": "MEDICAL||ILLNESS||CHEST_PAIN_NON_TRAUMA", ... }
 */

const GITHUB_RAW = 'https://raw.githubusercontent.com/ulfsri/neris-framework/main/core_schemas/value_sets/csv';

export const GITHUB_REFS = {
  repo:          'https://github.com/ulfsri/neris-framework',
  incident_types: `${GITHUB_RAW}/type_incident.csv`,
  action_tactics: `${GITHUB_RAW}/type_action_tactic.csv`,
  commit_api:    'https://api.github.com/repos/ulfsri/neris-framework/commits?path=core_schemas/value_sets/csv&per_page=1',
};

// ── In-memory cache ────────────────────────────────────────────────────────
const _cache = {};
const _time  = {};
const TTL_MS = 60 * 60 * 1000; // 1 hour

// ── CSV parser ──────────────────────────────────────────────────────────────
function parseCSV(text) {
  const lines = text.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());

  return lines.slice(1).map(line => {
    const values = [];
    let inQuote = false, cur = '';
    for (const ch of line) {
      if (ch === '"') { inQuote = !inQuote; }
      else if (ch === ',' && !inQuote) { values.push(cur); cur = ''; }
      else cur += ch;
    }
    values.push(cur);
    const row = {};
    headers.forEach((h, i) => { row[h] = (values[i] || '').trim(); });
    return row;
  }).filter(r => r.active !== 'FALSE' && r.active !== '');
}

// ── Fetcher with cache ──────────────────────────────────────────────────────
async function fetchValueSet(key, url) {
  const now = Date.now();
  if (_cache[key] && (now - _time[key]) < TTL_MS) return _cache[key];
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch NERIS value set "${key}" from GitHub (${res.status})`);
  const text = await res.text();
  _cache[key] = parseCSV(text);
  _time[key]  = now;
  return _cache[key];
}

export function clearCache() {
  Object.keys(_cache).forEach(k => delete _cache[k]);
  Object.keys(_time).forEach(k => delete _time[k]);
}

export function getCacheAge(key) {
  if (!_time[key]) return null;
  return Date.now() - _time[key]; // ms
}

// ── Public API ──────────────────────────────────────────────────────────────

/** Returns parsed rows from type_incident.csv */
export async function getIncidentTypes() {
  return fetchValueSet('incident_types', GITHUB_REFS.incident_types);
}

/** Returns parsed rows from type_action_tactic.csv */
export async function getActionTactics() {
  return fetchValueSet('action_tactics', GITHUB_REFS.action_tactics);
}

/**
 * Builds a label → "V1||V2||V3" lookup map from live GitHub data.
 * Keys are simplified (lowercase, punctuation → space).
 * Can be used to augment / replace the static DIRECT_CODE_MAP in nerisTranslator.js.
 */
export async function buildLiveIncidentTypeMap() {
  const rows = await getIncidentTypes();
  const map = {};

  rows.forEach(r => {
    if (!r.value_1) return;
    const code  = [r.value_1, r.value_2, r.value_3].filter(Boolean).join('||');
    const parts = [r.description_1, r.description_2, r.description_3].filter(Boolean);

    // Index each level: "Fire", "Fire Outside Fire", "Fire Outside Fire Trash Rubbish Fire"
    for (let i = 1; i <= parts.length; i++) {
      const label = parts.slice(0, i).join(' ').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
      if (label) map[label] = code;
    }

    // Also index just the leaf description
    const leaf = parts[parts.length - 1].toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    if (leaf) map[leaf] = code;
  });

  return map;
}

/**
 * Resolves a human label to a NERIS incident type code hierarchy
 * using live GitHub data, with graceful fallback to empty string.
 */
export async function resolveIncidentTypeLive(label) {
  if (!label) return '';
  const s = String(label).trim();
  if (/^[A-Z]+(\|\|[A-Z_]+)+$/.test(s)) return s; // already canonical

  const map = await buildLiveIncidentTypeMap();
  const key = s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  return map[key] || '';
}

/**
 * Returns a flat list of all incident type options for UI dropdowns.
 * Format: { code: "FIRE||STRUCTURE_FIRE||ROOM_AND_CONTENTS_FIRE", label: "Fire > Structure Fire > Room and Contents Fire" }
 */
export async function getIncidentTypeOptions() {
  const rows = await getIncidentTypes();
  return rows.map(r => ({
    code:  [r.value_1, r.value_2, r.value_3].filter(Boolean).join('||'),
    label: [r.description_1, r.description_2, r.description_3].filter(Boolean).join(' > '),
    v1: r.value_1, v2: r.value_2, v3: r.value_3,
  }));
}

/**
 * Returns a flat list of all action/tactic options for UI dropdowns.
 * Format: { code: "SUPPRESSION||STRUCTURAL_FIRE_SUPPRESSION||INTERIOR", label: "Suppression > Structural Fire Suppression > Interior" }
 */
export async function getActionTacticOptions() {
  const rows = await getActionTactics();
  return rows.map(r => ({
    code:  [r.value_1, r.value_2, r.value_3].filter(Boolean).join('||'),
    label: [r.description_1, r.description_2, r.description_3].filter(Boolean).join(' > '),
    v1: r.value_1, v2: r.value_2, v3: r.value_3,
  }));
}