/**
 * FAST ATTACK — Central Permission Engine
 *
 * Role hierarchy (highest → lowest):
 *   super_admin → dept_admin → reviewer → user → viewer
 *
 * Two sources of truth:
 *   1. isSuperAdmin   — from Base44 user.role (global bypass)
 *   2. departmentRole — from Member entity record (dept-scoped)
 *
 * Rules of thumb:
 *   - super_admin  : full access to everything, all departments
 *   - dept_admin   : full access within their department
 *   - reviewer     : read + approve runs; cannot create/edit members, apparatus, settings
 *   - user         : create runs + own training; nothing structural
 *   - viewer       : read-only dashboards/reports only
 */

import { useDepartment } from "./DepartmentContext";
import { useAuth } from "./AuthContext";
import { toast } from "sonner";

const ROLE_LEVEL = {
  super_admin: 5,
  dept_admin:  4,
  reviewer:    3,
  user:        2,
  viewer:      1,
};

function getLevel(role) {
  return ROLE_LEVEL[role] || 0;
}

export function usePermissions() {
  const { user } = useAuth();
  const { isSuperAdmin, departmentRole, hasMultipleDepartments } = useDepartment();

  // Effective role: super_admin bypasses everything.
  // Otherwise use Member.department_role, falling back to Base44 user.role.
  const effectiveRole = isSuperAdmin
    ? "super_admin"
    : departmentRole || user?.role || "viewer";

  const level = getLevel(effectiveRole);
  const atLeast = (role) => level >= getLevel(role);

  // ── View ──────────────────────────────────────────────────────────────────
  const canView = (module) => {
    if (atLeast("dept_admin")) return true;
    switch (module) {
      case "runs":      return atLeast("viewer");
      case "members":   return atLeast("reviewer");
      case "apparatus": return atLeast("reviewer");
      case "training":  return atLeast("viewer");
      case "reports":   return atLeast("viewer");
      case "settings":  return false; // dept_admin+ only, checked above
      default:          return atLeast("viewer");
    }
  };

  // ── Create ────────────────────────────────────────────────────────────────
  const canCreate = (module) => {
    if (atLeast("dept_admin")) return true;
    switch (module) {
      case "runs":      return atLeast("user");
      case "training":  return atLeast("user"); // own records
      case "members":   return false;
      case "apparatus": return false;
      default:          return false;
    }
  };

  // ── Edit ──────────────────────────────────────────────────────────────────
  const canEdit = (module, record = null) => {
    if (atLeast("dept_admin")) return true;
    switch (module) {
      case "runs":
        if (atLeast("reviewer")) return true;
        // user can only edit their own runs
        if (atLeast("user") && record) return record.created_by_id === user?.id;
        return false;
      case "training":
        // user can edit their own training records
        if (atLeast("user") && record) return record.created_by_id === user?.id;
        return false;
      case "members":   return false;
      case "apparatus": return false;
      default:          return false;
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const canDelete = (module) => {
    if (isSuperAdmin) return true;
    switch (module) {
      case "runs":      return atLeast("dept_admin");
      case "members":   return atLeast("dept_admin");
      case "apparatus": return atLeast("dept_admin");
      default:          return false;
    }
  };

  // ── Special actions ───────────────────────────────────────────────────────
  const canApproveRun               = () => atLeast("reviewer");
  const canSubmitNeris              = () => atLeast("dept_admin");
  const canManageMembers            = () => atLeast("dept_admin");
  const canManageRoles              = () => atLeast("dept_admin");
  const canManageDepartmentSettings = () => isSuperAdmin;
  const canSwitchDepartments        = () => hasMultipleDepartments;

  /**
   * guard(allowed, message?)
   * Call this inside action handlers before any mutation.
   * Returns true if allowed, otherwise shows a toast and returns false.
   *
   * Usage:
   *   if (!guard(canCreate("runs"))) return;
   */
  const guard = (allowed, message) => {
    if (!allowed) {
      toast.error(message || "You don't have permission to perform this action.");
      return false;
    }
    return true;
  };

  return {
    // State
    effectiveRole,
    isSuperAdmin,
    // Functions
    canView,
    canCreate,
    canEdit,
    canDelete,
    canApproveRun,
    canSubmitNeris,
    canManageMembers,
    canManageRoles,
    canManageDepartmentSettings,
    canSwitchDepartments,
    guard,
  };
}
