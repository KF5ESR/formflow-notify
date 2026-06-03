/**
 * nerisReadiness — compute NERIS readiness gates from a department + nerisConfig pair.
 * Returns { canValidate, canSubmitProd, missingForValidation, missingForSubmit }
 */

export const NERIS_ROLES = ["super_admin", "admin", "dept_admin", "reviewer"];

export function canUseNerisValidation(department, nerisConfig, incident, userRole) {
  const missing = [];

  if (!department?.id) missing.push("Department not linked");
  if (!nerisConfig?.entity_id) missing.push("NERIS entity_id not set");
  if (!nerisConfig?.env) missing.push("NERIS environment not set");
  if (!nerisConfig?.incident_id_source) missing.push("Incident ID source not configured");
  if (!nerisConfig?.apps_script_validate_url) missing.push("Apps Script Validate URL not configured");

  // Incident-level checks
  const incidentNumber = incident?.nfirs_id || incident?.psrid;
  if (!incidentNumber) missing.push("Incident number (NFIRS ID or PSRID) is blank");

  const canValidate = missing.length === 0;
  return { canValidate, missing };
}

export function canUseNerisSubmit(department, nerisConfig, incident, userRole) {
  const { canValidate, missing: valMissing } = canUseNerisValidation(department, nerisConfig, incident, userRole);
  const missing = [...valMissing];

  if (!canValidate) return { canSubmit: false, missing };

  if (incident?.neris_validation_status !== "VALID") missing.push("Incident must be validated (VALID status required)");
  if (!incident?.neris_incident_number_used) missing.push("Incident number used in validation is missing");
  if (!incident?.neris_validation_request_snapshot_json) missing.push("Validation request snapshot is missing");
  if (!NERIS_ROLES.includes(userRole)) missing.push("Role must be Reviewer, Dept Admin, or Super Admin");

  // PROD-specific
  if (nerisConfig?.env === "PROD" && !department?.production_enabled) {
    missing.push("Production posting not yet enabled for this department");
  }

  return { canSubmit: missing.length === 0, missing };
}

export const ONBOARDING_STEPS = [
  { key: "DEPARTMENT_CREATED",      label: "Department Created",            description: "Base department record exists." },
  { key: "PROFILE_COMPLETE",        label: "Profile Complete",              description: "Name, FDID, county, state filled in." },
  { key: "USERS_ASSIGNED",          label: "Users Assigned",                description: "At least one user linked to department." },
  { key: "UNITS_CONFIGURED",        label: "Units / Responders Configured", description: "Default units and responders added." },
  { key: "NERIS_CONFIG_ADDED",      label: "NERIS Config Added",            description: "Entity ID and environment configured." },
  { key: "APPS_SCRIPT_ADDED",       label: "Apps Script URL Added",         description: "Validate proxy endpoint configured." },
  { key: "TEST_VALIDATION_PASSED",  label: "Test Validation Passed",        description: "At least one successful TEST validation." },
  { key: "PRODUCTION_READY",        label: "Ready for Production",          description: "Approved for PROD posting." },
];

export function getOnboardingStepIndex(status) {
  return ONBOARDING_STEPS.findIndex(s => s.key === status);
}