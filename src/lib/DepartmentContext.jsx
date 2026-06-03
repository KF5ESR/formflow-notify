/**
 * DepartmentContext — loads the current user's department + nerisConfig on login.
 * Super admins get no automatic department scope (they can see all).
 */
import { createContext, useContext, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";

const DepartmentContext = createContext(null);

export function DepartmentProvider({ children }) {
  const { currentUser } = useAuth();
  const [department, setDepartment] = useState(null);
  const [nerisConfig, setNerisConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  const isSuperAdmin = currentUser?.role === "super_admin" || currentUser?.role === "admin";

  useEffect(() => {
    if (!currentUser) { setLoading(false); return; }

    const load = async () => {
      setLoading(true);
      try {
        const deptId = currentUser.department_id;
        if (deptId) {
          const [dept, configs] = await Promise.all([
            base44.entities.Department.get(deptId),
            base44.entities.NerisConfig.filter({ department_id: deptId }),
          ]);
          setDepartment(dept);
          setNerisConfig(configs[0] || null);
        } else if (isSuperAdmin) {
          // Super admin — no scoping, load nothing automatically
          setDepartment(null);
          setNerisConfig(null);
        }
      } catch (_) {}
      setLoading(false);
    };

    load();
  }, [currentUser?.id, currentUser?.department_id]);

  const refresh = async () => {
    if (!currentUser?.department_id) return;
    const [dept, configs] = await Promise.all([
      base44.entities.Department.get(currentUser.department_id),
      base44.entities.NerisConfig.filter({ department_id: currentUser.department_id }),
    ]);
    setDepartment(dept);
    setNerisConfig(configs[0] || null);
  };

  /** Returns the department_id filter object to use in entity queries.
   *  Super admins pass {} to see all records. Others pass { department_id: ... }.
   */
  const scopeFilter = (extra = {}) => {
    if (isSuperAdmin) return extra;
    const deptId = currentUser?.department_id;
    return deptId ? { department_id: deptId, ...extra } : extra;
  };

  return (
    <DepartmentContext.Provider value={{
      department, nerisConfig, loading, isSuperAdmin,
      departmentId: currentUser?.department_id || null,
      scopeFilter, refresh,
    }}>
      {children}
    </DepartmentContext.Provider>
  );
}

export function useDepartment() {
  return useContext(DepartmentContext);
}