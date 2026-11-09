/**
 * Pre-RMS Pilot demo store — browser-local only.
 * Fictional fixtures. Never reads or writes Incident, Department or any live entity,
 * and never calls CAD, ESO, NERIS, email or any external service.
 */
const STORAGE_KEY = "fastattack.pilot.prerms.v1";

export const PILOT_DEPARTMENT = {
  key: "DEMO-DEPT-FASTATTACK",
  name: "Fast Attack Demo Department (fictional)",
};

export const PILOT_AGENCY = {
  key: "DEMO-AGENCY-ARKVALLEY",
  name: "Ark Valley Demo Dispatch (fictional)",
};

const CAD_BASE = {
  agencyKey: PILOT_AGENCY.key,
  agencyName: PILOT_AGENCY.name,
  departmentKey: PILOT_DEPARTMENT.key,
  cfsNumber: "DEMO-CFS-001",
  departmentRunNumber: "DEMO-RUN-001",
  incidentDate: "2026-11-07",
  dispatchedAddress: "701 Sample Road, Demo City, AR 72000",
  dispatchReason: "Structure fire - reported smoke from attic",
  callStatus: "Closed",
};

/** Fixture: the original CAD sample call (revision 1). */
export const SAMPLE_CAD_CALL = {
  ...CAD_BASE,
  revision: 1,
  sourceLabel: "CAD sample call",
  receivedAt: "2026-11-07T14:05:00-06:00",
  units: [{ unit: "Engine 1", dispatched: "14:02", arrived: "14:11", cleared: "15:38" }],
};

/** Fixture: a newer CAD revision for the same call with a corrected clear time. */
export const SAMPLE_CAD_UPDATE = {
  ...CAD_BASE,
  revision: 2,
  sourceLabel: "CAD sample update",
  receivedAt: "2026-11-07T15:55:00-06:00",
  revisionNote: "Clear time corrected from radio log (15:38 to 15:42)",
  units: [{ unit: "Engine 1", dispatched: "14:02", arrived: "14:11", cleared: "15:42" }],
};

export const DEMO_QUEUE_KEY = queueKeyFor(SAMPLE_CAD_CALL);

export function queueKeyFor(cad) {
  return `${cad.agencyKey}|${cad.cfsNumber}|${cad.incidentDate}`;
}

export function formatPilotDate(isoDate) {
  if (!isoDate) return "—";
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return isoDate;
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatStamp(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * In-memory source of truth. Storage is optional persistence only: in a framed
 * preview localStorage can throw on access, and the demo must still work.
 */
let memoryItems = null;

function readStorage() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && Array.isArray(parsed.items) ? parsed.items : null;
  } catch (_) {
    return null;
  }
}

export function isStorageAvailable() {
  try {
    const probe = `${STORAGE_KEY}.probe`;
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    return true;
  } catch (_) {
    return false;
  }
}

export function readPilotState() {
  if (memoryItems === null) {
    memoryItems = readStorage() || [];
  }
  return { version: 1, items: memoryItems };
}

/** Updates memory first, then tries to persist. Returns whether it persisted. */
function commit(items) {
  memoryItems = items;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, items }));
    return true;
  } catch (_) {
    return false;
  }
}

/**
 * Loads a CAD revision. One queue item per agency + CFS + incident date.
 * Same or older revision never duplicates the item, never rolls back the CAD,
 * and never touches responder-entered data.
 */
export function loadCadRevision(cad) {
  const state = readPilotState();
  const key = queueKeyFor(cad);
  const index = state.items.findIndex((i) => i.key === key);
  const now = new Date().toISOString();

  if (index === -1) {
    const item = {
      key,
      departmentKey: cad.departmentKey,
      agencyKey: cad.agencyKey,
      cfsNumber: cad.cfsNumber,
      departmentRunNumber: cad.departmentRunNumber,
      incidentDate: cad.incidentDate,
      initialCad: { ...cad },
      latestCad: { ...cad },
      responder: { actualAddress: "", staffing: "", narrative: "", submittedAt: null },
      status: "draft",
      approval: null,
      reopenedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    const created = [...state.items, item];
    return { items: created, result: "created", item, persisted: commit(created) };
  }

  const existing = state.items[index];
  if (cad.revision <= (existing.latestCad?.revision || 0)) {
    return { items: state.items, result: "ignored", item: existing };
  }

  const wasApproved = existing.status === "approved";
  const updated = {
    ...existing,
    latestCad: { ...cad },
    status: wasApproved ? "awaiting_review" : existing.status,
    approval: wasApproved ? null : existing.approval,
    reopenedAt: wasApproved ? now : existing.reopenedAt,
    updatedAt: now,
  };
  const items = state.items.map((i, idx) => (idx === index ? updated : i));
  return {
    items,
    result: wasApproved ? "reopened" : "updated",
    item: updated,
    persisted: commit(items),
  };
}

/** Saves responder entry and puts the call in the reviewer queue. */
export function submitResponderReport(key, data) {
  const state = readPilotState();
  const index = state.items.findIndex((i) => i.key === key);
  if (index === -1) return { items: state.items, result: "missing" };
  const now = new Date().toISOString();
  const updated = {
    ...state.items[index],
    responder: {
      actualAddress: (data.actualAddress || "").trim(),
      staffing: data.staffing === "" || data.staffing == null ? "" : Number(data.staffing),
      narrative: (data.narrative || "").trim(),
      submittedAt: now,
    },
    status: "awaiting_review",
    approval: null,
    updatedAt: now,
  };
  const items = state.items.map((i, idx) => (idx === index ? updated : i));
  return { items, result: "submitted", item: updated, persisted: commit(items) };
}

/** Simulated reviewer approval. Only valid for a submitted, unapproved report. */
export function approveHandoff(key) {
  const state = readPilotState();
  const index = state.items.findIndex((i) => i.key === key);
  if (index === -1) return { items: state.items, result: "missing" };
  const item = state.items[index];
  if (item.status !== "awaiting_review" || !item.responder?.submittedAt) {
    return { items: state.items, result: "not_allowed", item };
  }
  const now = new Date().toISOString();
  const approved = { ...item, status: "approved", approval: { approvedAt: now }, updatedAt: now };
  approved.approval.handoffText = buildHandoffText(approved);
  const items = state.items.map((i, idx) => (idx === index ? approved : i));
  return { items, result: "approved", item: approved, persisted: commit(items) };
}

export function resetPilotData() {
  const items = [];
  return { version: 1, items, persisted: commit(items) };
}

/** Plain-text handoff built only from stored pilot data. */
export function buildHandoffText(item) {
  const cad = item.latestCad || {};
  const crewAddress = (item.responder?.actualAddress || "").trim();
  const approvedLocation = crewAddress
    ? crewAddress
    : `${cad.dispatchedAddress} (dispatched address; crew left actual address blank)`;
  const staffing =
    item.responder?.staffing === "" || item.responder?.staffing == null
      ? "(not entered)"
      : `${item.responder.staffing}`;
  const narrative = (item.responder?.narrative || "").trim() || "(no narrative entered)";
  const unitLines = (cad.units || [])
    .map(
      (u) =>
        `  - ${u.unit}: dispatched ${u.dispatched || "--"}, arrived ${u.arrived || "--"}, cleared ${u.cleared || "--"}`
    )
    .join("\n");

  return [
    "MANUAL HANDOFF TO EXISTING RMS INCIDENT",
    "Handoff type: Manual handoff to existing RMS incident",
    "Demo notice: FICTIONAL DATA - Pre-RMS pilot. Not transmitted anywhere.",
    "",
    `CAD agency: ${cad.agencyName}`,
    `CAD / CFS number: ${cad.cfsNumber}`,
    `Department run number: ${cad.departmentRunNumber}`,
    `Incident date: ${formatPilotDate(cad.incidentDate)}`,
    "",
    `Dispatched location (CAD): ${cad.dispatchedAddress}`,
    `Approved actual location: ${approvedLocation}`,
    "",
    `Latest unit timestamps (CAD revision ${cad.revision}, received ${formatStamp(cad.receivedAt)}):`,
    unitLines || "  - none",
    "",
    `Crew staffing: ${staffing}`,
    "Crew narrative:",
    narrative,
    "",
    `Dispatched reason (CAD): ${cad.dispatchReason}`,
    `Approved at: ${item.approval?.approvedAt ? formatStamp(item.approval.approvedAt) : "(pending)"}`,
  ].join("\n");
}