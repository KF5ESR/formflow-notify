/**
 * DepartmentSelect — pick an authorized department to enter.
 */
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Flame, Building2, ArrowRight, Settings } from "lucide-react";
import { usePermissions } from "@/lib/permissions";
import PermissionDenied from "@/components/PermissionDenied";
import { useDepartment } from "@/lib/DepartmentContext";

const STATUS_COLOR = {
  ACTIVE: "bg-green-100 text-green-700",
  INACTIVE: "bg-slate-100 text-slate-500",
  SUSPENDED: "bg-red-100 text-red-600",
};

export default function DepartmentSelect() {
  const navigate = useNavigate();
  const { canSwitchDepartments } = usePermissions();
  const { isSuperAdmin, accessibleDepartmentIds, selectDepartment } = useDepartment();

  const { data: departments = [], isLoading } = useQuery({
    queryKey: ["departments"],
    queryFn: () => base44.entities.Department.list("department_name"),
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {!canSwitchDepartments() && (
        <div className="max-w-2xl mx-auto px-4 py-16">
          <PermissionDenied message="Your account has only one department assignment." />
        </div>
      )}
      {canSwitchDepartments() && <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Flame className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Departments</h1>
              <p className="text-sm text-slate-500">Select your working department</p>
            </div>
          </div>
          {isSuperAdmin && <Button variant="outline" size="sm" onClick={() => navigate("/admin/departments")}>
            <Settings className="w-3.5 h-3.5 mr-1.5" /> Manage
          </Button>}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-red-600 rounded-full animate-spin" />
          </div>
        ) : departments.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No departments yet</p>
            <Button className="mt-4 bg-red-600 hover:bg-red-700 text-white" onClick={() => navigate("/admin/departments")}>
              Create Department
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {departments.filter((dept) => isSuperAdmin || accessibleDepartmentIds.includes(dept.id)).map((dept) => (
              <button
                key={dept.id}
                onClick={() => {
                  if (selectDepartment(dept.id)) navigate(`/dept/${dept.id}`);
                }}
                className="w-full bg-white border border-slate-200 rounded-xl p-5 flex items-center justify-between gap-4 hover:border-red-300 hover:shadow-md transition-all text-left group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center group-hover:bg-red-50 transition-colors">
                    <Building2 className="w-6 h-6 text-slate-500 group-hover:text-red-500 transition-colors" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold text-slate-900">{dept.department_name}</span>
                      {dept.short_name && (
                        <span className="text-xs text-slate-400 font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                          {dept.short_name}
                        </span>
                      )}
                      <Badge className={STATUS_COLOR[dept.status] || STATUS_COLOR.ACTIVE}>{dept.status}</Badge>
                      {dept.neris_enabled && <Badge className="bg-blue-100 text-blue-700">NERIS</Badge>}
                      {dept.production_enabled && <Badge className="bg-purple-100 text-purple-700">PROD</Badge>}
                    </div>
                    <div className="text-xs text-slate-500">
                      {dept.fdid && <span className="mr-3">FDID: {dept.fdid}</span>}
                      {dept.county && <span>{dept.county}, {dept.state}</span>}
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-red-500 transition-colors shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>}
    </div>
  );
}
