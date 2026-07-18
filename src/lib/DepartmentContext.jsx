/**
 * DepartmentContext — loads the current user's department + nerisConfig on login.
 * Super admins get no automatic department scope (they can see all).
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";

const DepartmentContext = createContext(null);

export function DepartmentProvider({ children }) {
  const { user: currentUser } = useAuth();
  const [department, setDepartment] = useState(null);
  const [nerisConfig, setNerisConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  const isSuperAdmin = currentUser?.role === "super_admin" || currentUser?.role === "admin";

  const [memberRecord, setMemberRecord] = useState(null);
  const accessibleDepartmentIds = useMemo(() => {
    const ids = new Set(currentUser?.department_ids || []);
    if (currentUser?.department_id) ids.add(currentUser.department_id);
    return [...ids];
  }, [currentUser?.department_id, currentUser?.department_ids]);
  const initialDepartmentId = currentUser?.default_department_id
    || currentUser?.department_id
    || accessibleDepartmentIds[0]
    || null;
  const [selectedDepartmentId, setSelectedDepartmentId] = useState(null);

  useEffect(() => {
    if (!currentUser) return;
    const stored = window.localStorage.getItem(`fast-attack-department:${currentUser.id}`);
    const permittedStored = isSuperAdmin || accessibleDepartmentIds.includes(stored);
    setSelectedDepartmentId(permittedStored && stored ? stored : initialDepartmentId);
  }, [currentUser?.id, initialDepartmentId, isSuperAdmin, accessibleDepartmentIds]);

  const selectDepartment = useCallback((departmentId) => {
    if (!departmentId || (!isSuperAdmin && !accessibleDepartmentIds.includes(departmentId))) return false;
    setSelectedDepartmentId(departmentId);
    window.localStorage.setItem(`fast-attack-department:${currentUser.id}`, departmentId);
    return true;
  }, [accessibleDepartmentIds, currentUser?.id, isSuperAdmin]);
  const canAccessDepartment = useCallback(
    (departmentId) => isSuperAdmin || accessibleDepartmentIds.includes(departmentId),
    [accessibleDepartmentIds, isSuperAdmin]
  );

  // department_role comes from the Member record (app-level), not from Base44 user role
  const departmentRole = memberRecord?.department_role || null;

  useEffect(() => {
    if (!currentUser) { setLoading(false); return; }

    const load = async () => {
      setLoading(true);
      try {
        const deptId = selectedDepartmentId;
        if (deptId) {
          const [dept, configs, members] = await Promise.all([
            base44.entities.Department.get(deptId),
            base44.entities.NerisConfig.filter({ department_id: deptId }),
            base44.entities.Member.filter({ department_id: deptId }),
          ]);
          setDepartment(dept);
          setNerisConfig(configs[0] || null);
          // Find this user's member record by email
          const myMember = members.find(
            (m) => m.email && currentUser.email && m.email.toLowerCase() === currentUser.email.toLowerCase()
          );
          setMemberRecord(myMember || null);
        } else {
          setDepartment(null);
          setNerisConfig(null);
          setMemberRecord(null);
        }
      } catch (err) {
        console.error("Failed to load department:", err);
      }
      setLoading(false);
    };

    load();
  }, [currentUser?.id, selectedDepartmentId, isSuperAdmin]);

  const refresh = async () => {
    if (!selectedDepartmentId) return;
    const [dept, configs] = await Promise.all([
      base44.entities.Department.get(selectedDepartmentId),
      base44.entities.NerisConfig.filter({ department_id: selectedDepartmentId }),
    ]);
    setDepartment(dept);
    setNerisConfig(configs[0] || null);
  };

  /** Returns the department_id filter object to use in entity queries.
   *  Super admins pass {} to see all records. Others pass { department_id: ... }.
   */
  const scopeFilter = (extra = {}) => {
    if (isSuperAdmin) return extra;
    const deptId = selectedDepartmentId;
    return deptId ? { department_id: deptId, ...extra } : extra;
  };

  return (
    <DepartmentContext.Provider value={{
      department, nerisConfig, loading, isSuperAdmin,
      departmentId: selectedDepartmentId,
      accessibleDepartmentIds,
      hasMultipleDepartments: isSuperAdmin || accessibleDepartmentIds.length > 1,
      canAccessDepartment,
      selectDepartment,
      memberRecord, departmentRole,
      scopeFilter, refresh,
    }}>
      {children}
    </DepartmentContext.Provider>
  );
}

export function useDepartment() {
  return useContext(DepartmentContext);
}
