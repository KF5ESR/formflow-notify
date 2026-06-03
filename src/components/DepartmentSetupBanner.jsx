/**
 * DepartmentSetupBanner — shown when the user's department is missing or incomplete.
 * Guides them to complete setup before full features are available.
 */
import { useDepartment } from "@/lib/DepartmentContext";
import { useAuth } from "@/lib/AuthContext";
import { ONBOARDING_STEPS, getOnboardingStepIndex } from "@/lib/nerisReadiness";
import { AlertTriangle, Building2, ArrowRight, CheckCircle, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function DepartmentSetupBanner() {
  const { department, nerisConfig, loading, isSuperAdmin, departmentId } = useDepartment();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  if (loading) return null;

  // Super admin with no department assigned — show link to dept management
  if (isSuperAdmin && !departmentId) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center gap-3 text-sm">
        <Building2 className="w-4 h-4 text-blue-500 shrink-0" />
        <span className="text-blue-700 flex-1">
          <strong>Super Admin:</strong> You have access to all departments.
        </span>
        <Button size="sm" variant="outline" onClick={() => navigate("/admin/departments")} className="text-blue-700 border-blue-300">
          Manage Departments <ArrowRight className="w-3 h-3 ml-1" />
        </Button>
      </div>
    );
  }

  // No department linked to user (regular users only)
  if (!isSuperAdmin && !departmentId) {
    return (
      <div className="bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 flex items-center gap-3 text-sm">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
        <span className="text-amber-800 flex-1">
          Your account is not linked to a department. Contact your Super Admin to be assigned.
        </span>
      </div>
    );
  }

  // Super admin with department assigned but not loaded yet — no banner
  if (isSuperAdmin && !department) {
    return null;
  }

  // Department exists — show onboarding progress if incomplete
  const stepIdx = getOnboardingStepIndex(department.onboarding_status);
  const totalSteps = ONBOARDING_STEPS.length;
  const isComplete = department.onboarding_status === "PRODUCTION_READY";

  if (isComplete) return null;

  const nextStep = ONBOARDING_STEPS[stepIdx + 1];
  const canManage = ["super_admin", "admin", "dept_admin"].includes(currentUser?.role);

  return (
    <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 space-y-2">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-sm">
          <Building2 className="w-4 h-4 text-slate-500 shrink-0" />
          <span className="font-medium text-slate-700">{department.department_name}</span>
          <span className="text-slate-400">—</span>
          <span className="text-slate-500">Onboarding step {stepIdx + 1}/{totalSteps}</span>
        </div>
        {canManage && (
          <Button size="sm" variant="outline" onClick={() => navigate(`/admin/departments/${department.id}/config`)}>
            <Settings className="w-3 h-3 mr-1" /> Configure
          </Button>
        )}
      </div>

      {/* Progress bar */}
      <div className="w-full bg-slate-100 rounded-full h-1.5">
        <div
          className="bg-blue-500 h-1.5 rounded-full transition-all"
          style={{ width: `${((stepIdx + 1) / totalSteps) * 100}%` }}
        />
      </div>

      {nextStep && (
        <p className="text-xs text-slate-500">
          Next: <strong className="text-slate-700">{nextStep.label}</strong> — {nextStep.description}
        </p>
      )}
    </div>
  );
}