import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useDepartment } from "@/lib/DepartmentContext";
import { usePermissions } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Flame, Plus, LayoutDashboard, Clock, CheckCircle2,
  AlertCircle, FileText, TrendingUp,
} from "lucide-react";

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isSuperAdmin, department, departmentId, loading } = useDepartment();
  const { canCreate } = usePermissions();

  // Fetch recent incidents for this department
  const { data: incidents = [], isLoading } = useQuery({
    queryKey: ["welcome-incidents", departmentId],
    queryFn: () => base44.entities.Incident.filter({ department_id: departmentId }, "-created_date", 50),
    enabled: !!departmentId,
  });

  // Super admins still go to department select
  if (!loading && isSuperAdmin) {
    navigate("/select-dept", { replace: true });
    return null;
  }

  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);

  const stats = {
    today: incidents.filter((i) => i.date === today).length,
    thisWeek: incidents.filter((i) => i.date >= weekAgo).length,
    pending: incidents.filter((i) => !i.neris_logged).length,
    total: incidents.length,
  };

  const recent = incidents.slice(0, 4);

  const firstName = (user?.full_name || "").split(" ")[0] || "there";

  const statCards = [
    { label: "Today", value: stats.today, icon: Clock, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "This Week", value: stats.thisWeek, icon: TrendingUp, color: "text-green-600", bg: "bg-green-50" },
    { label: "Pending NERIS", value: stats.pending, icon: AlertCircle, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Total Runs", value: stats.total, icon: FileText, color: "text-slate-700", bg: "bg-slate-50" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-red-950">
      {/* Top bar */}
      <div className="max-w-4xl mx-auto px-6 pt-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-red-900/50">
            <Flame className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-white font-bold text-lg leading-tight">Fast Attack</h1>
            <p className="text-slate-400 text-xs">Incident Reporting System</p>
          </div>
        </div>
        {department && (
          <Badge className="bg-white/10 text-white border-white/20 backdrop-blur">
            {department.short_name || department.department_name}
          </Badge>
        )}
      </div>

      {/* Hero */}
      <div className="max-w-4xl mx-auto px-6 pt-14 pb-8 text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">
          Welcome back, {firstName}
        </h2>
        <p className="text-slate-400 text-sm md:text-base">
          {department?.department_name || "Fire Department"}
        </p>
      </div>

      {/* Stats */}
      <div className="max-w-4xl mx-auto px-6 mb-8">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-4 border-slate-600 border-t-red-500 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {statCards.map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-4">
                <div className={`w-8 h-8 ${bg} rounded-lg flex items-center justify-center mb-2`}>
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
                <div className="text-2xl font-bold text-white">{value}</div>
                <div className="text-xs text-slate-400 mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Primary actions */}
      <div className="max-w-4xl mx-auto px-6 mb-10">
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {canCreate("runs") && (
            <Button
              onClick={() => navigate("/incident/new")}
              className="bg-red-600 hover:bg-red-700 text-white px-8 py-6 text-base shadow-lg shadow-red-900/30"
            >
              <Plus className="w-5 h-5 mr-2" /> New Incident Report
            </Button>
          )}
          <Button
            onClick={() => navigate(`/dept/${departmentId}`)}
            variant="outline"
            className="bg-white/10 text-white border-white/20 hover:bg-white/20 px-8 py-6 text-base backdrop-blur"
          >
            <LayoutDashboard className="w-5 h-5 mr-2" /> View Dashboard
          </Button>
        </div>
      </div>

      {/* Recent incidents */}
      {recent.length > 0 && (
        <div className="max-w-4xl mx-auto px-6 pb-12">
          <h3 className="text-sm font-semibold text-slate-300 mb-3 px-1">Recent Activity</h3>
          <div className="space-y-2">
            {recent.map((inc) => (
              <button
                key={inc.id}
                onClick={() => navigate(`/incident/${inc.id}`)}
                className="w-full flex items-center gap-3 bg-white/5 hover:bg-white/10 backdrop-blur border border-white/10 rounded-xl px-4 py-3 transition-colors text-left"
              >
                <div className="w-9 h-9 bg-white/10 rounded-lg flex items-center justify-center shrink-0">
                  <Flame className="w-4 h-4 text-red-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {inc.nature_of_call || inc.incident_location || "Incident"}
                  </p>
                  <p className="text-xs text-slate-400 truncate">
                    {inc.date && new Date(inc.date).toLocaleDateString()}
                    {inc.incident_commander && ` • IC: ${inc.incident_commander}`}
                  </p>
                </div>
                {inc.neris_logged ? (
                  <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                ) : (
                  <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}