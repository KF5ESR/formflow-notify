/**
 * DeptContextHeader — Persistent context bar shown on all dept-scoped pages.
 * Shows: Department Name | NERIS ID | Status  /  User Name | Role  /  Current Module
 */
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useDepartment } from "@/lib/DepartmentContext";
import { ArrowLeft, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";

const ROLE_LABELS = {
  super_admin: "Super Admin",
  dept_admin: "Department Admin",
  reviewer: "Reviewer",
  responder: "Responder",
  user: "User",
  viewer: "Viewer",
};

const STATUS_COLORS = {
  ACTIVE: "bg-green-100 text-green-700",
  INACTIVE: "bg-slate-100 text-slate-500",
  SUSPENDED: "bg-red-100 text-red-600",
};

export default function DeptContextHeader({ module }) {
  const { deptId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    isSuperAdmin, departmentRole, hasMultipleDepartments,
    canAccessDepartment, selectDepartment,
  } = useDepartment();

  useEffect(() => {
    if (deptId && canAccessDepartment(deptId)) selectDepartment(deptId);
  }, [deptId, canAccessDepartment, selectDepartment]);

  const { data: dept } = useQuery({
    queryKey: ["department", deptId],
    queryFn: () => base44.entities.Department.get(deptId),
    enabled: !!deptId,
    staleTime: 60_000,
  });

  const isOnDashboard = !module || module === "Runs";

  const effectiveRole = isSuperAdmin ? "super_admin" : departmentRole || user?.role;
  const roleLabel = ROLE_LABELS[effectiveRole] || effectiveRole || "—";
  const statusColor = STATUS_COLORS[dept?.status] || "bg-slate-100 text-slate-500";

  return (
    <div className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-30">
      <div className="max-w-5xl mx-auto px-4 py-2.5 flex items-center gap-3">

        {/* Back button */}
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full shrink-0 h-8 w-8"
          onClick={() => isOnDashboard ? navigate(hasMultipleDepartments ? "/select-dept" : "/") : navigate(`/dept/${deptId}`)}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>

        {/* Flame icon */}
        <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center shrink-0">
          <Flame className="w-4 h-4 text-white" />
        </div>

        {/* Context rows */}
        <div className="flex-1 min-w-0">
          {/* Row 1: Dept name | NERIS ID | Status */}
          <div className="flex items-center gap-2 flex-wrap leading-tight">
            <span className="font-bold text-slate-900 text-sm truncate">
              {dept?.department_name || "Loading…"}
            </span>
            {dept?.neris_entity_id && (
              <>
                <span className="text-slate-300 text-xs">|</span>
                <span className="text-xs font-mono text-slate-500">{dept.neris_entity_id}</span>
              </>
            )}
            {dept?.status && (
              <>
                <span className="text-slate-300 text-xs">|</span>
                <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${statusColor}`}>
                  {dept.status}
                </span>
              </>
            )}
          </div>

          {/* Row 2: User | Role | Module */}
          <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap leading-tight mt-0.5">
            <span className="font-medium text-slate-700">{user?.full_name || "—"}</span>
            <span className="text-slate-300">|</span>
            <span>{roleLabel}</span>
            {module && (
              <>
                <span className="text-slate-300">|</span>
                <span className="font-semibold text-red-600">{module}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
