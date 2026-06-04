/**
 * DepartmentDashboard — Per-department hub: module tiles + incident run list.
 */
import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
// ArrowLeft removed — handled by DeptContextHeader
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useDepartment } from "@/lib/DepartmentContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Flame, Users, Truck, FileText, Plus, Search,
  Edit2, Trash2, CheckCircle, Clock, AlertCircle, List,
  Table, GraduationCap, Settings,
} from "lucide-react";
import DeptContextHeader from "@/components/DeptContextHeader";

const TYPE_COLORS = {
  "Fire": "bg-red-100 text-red-700",
  "Medical": "bg-blue-100 text-blue-700",
  "Motor Vehicle": "bg-orange-100 text-orange-700",
  "No Emergency": "bg-slate-100 text-slate-600",
  "Search": "bg-purple-100 text-purple-700",
  "Natural": "bg-green-100 text-green-700",
};

function getTypeColor(type) {
  for (const [key, cls] of Object.entries(TYPE_COLORS)) {
    if (type && type.includes(key)) return cls;
  }
  return "bg-slate-100 text-slate-600";
}

function NerisStatus({ incident }) {
  if (incident.neris_logged) return (
    <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
      <CheckCircle className="w-3 h-3" /> NERIS Logged
    </span>
  );
  if (incident.neris_post_status) return (
    <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
      <Clock className="w-3 h-3" /> {incident.neris_post_status}
    </span>
  );
  return (
    <span className="flex items-center gap-1 text-xs text-slate-400">
      <AlertCircle className="w-3 h-3" /> Not Posted
    </span>
  );
}

const STATUS_COLOR = {
  ACTIVE: "bg-green-100 text-green-700",
  INACTIVE: "bg-slate-100 text-slate-500",
  SUSPENDED: "bg-red-100 text-red-600",
};

export default function DepartmentDashboard() {
  const { deptId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isSuperAdmin } = useDepartment();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [view, setView] = useState("list");

  const { data: dept } = useQuery({
    queryKey: ["department", deptId],
    queryFn: () => base44.entities.Department.get(deptId),
    enabled: !!deptId,
  });

  const { data: incidents = [], isLoading } = useQuery({
    queryKey: ["incidents", deptId],
    queryFn: () => base44.entities.Incident.filter({ department_id: deptId }, "-created_date", 200),
    enabled: !!deptId,
  });

  const deleteIncident = useMutation({
    mutationFn: (id) => base44.entities.Incident.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["incidents", deptId] }),
  });

  const filtered = incidents.filter((i) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      (i.incident_location || "").toLowerCase().includes(s) ||
      (i.nfirs_id || "").toLowerCase().includes(s) ||
      (i.nature_of_call || "").toLowerCase().includes(s) ||
      (i.incident_commander || "").toLowerCase().includes(s)
    );
  });

  const stats = {
    total: incidents.length,
    logged: incidents.filter((i) => i.neris_logged).length,
    fire: incidents.filter((i) => (i.type_response || "").includes("Fire")).length,
    medical: incidents.filter((i) => (i.type_response || "").includes("Medical")).length,
  };

  const canAdmin = ["super_admin", "admin", "dept_admin"].includes(user?.role);

  const MODULES = [
    { label: "Runs", icon: FileText, color: "bg-red-50 border-red-200 text-red-700", active: true },
    { label: "Members", icon: Users, color: "bg-blue-50 border-blue-200 text-blue-700", path: `/dept/${deptId}/members` },
    { label: "Apparatus", icon: Truck, color: "bg-green-50 border-green-200 text-green-700", path: `/dept/${deptId}/apparatus` },
    { label: "Training", icon: GraduationCap, color: "bg-purple-50 border-purple-200 text-purple-500", soon: true },
  ];

  const RAW_COLS = ["nfirs_id","psrid","date","dispatch_time","first_on_scene_time","control_time","fd_clear_time","incident_location","nature_of_call","action_taken","type_response","incident_commander","patients_injured","fatalities","neris_env","neris_post_status","neris_logged","neris_validation_status","email_status"];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <DeptContextHeader module="Runs" />
      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* Top action bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            {dept?.neris_enabled && <Badge className="bg-blue-100 text-blue-700">NERIS</Badge>}
            {dept?.production_enabled && <Badge className="bg-purple-100 text-purple-700">PROD</Badge>}
          </div>
          <div className="flex items-center gap-2">
            {canAdmin && (
              <Button variant="outline" size="sm" onClick={() => navigate("/admin/departments")} className="hidden md:flex">
                <Settings className="w-3.5 h-3.5 mr-1.5" /> Settings
              </Button>
            )}
            <Link to={`/incident/new`}>
              <Button className="bg-red-600 hover:bg-red-700 text-white shadow-sm">
                <Plus className="w-4 h-4 mr-1" /> New Run
              </Button>
            </Link>
          </div>
        </div>

        {/* Module Tiles */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {MODULES.map(({ label, icon: Icon, color, path, active, soon }) => (
            <button
              key={label}
              onClick={() => path && navigate(path)}
              disabled={soon || active}
              className={`flex flex-col items-center justify-center py-4 px-2 rounded-xl border-2 gap-2 transition-all
                ${active ? `${color} ring-2 ring-offset-1 ring-red-400 cursor-default` :
                  soon ? `${color} opacity-40 cursor-not-allowed` :
                  `${color} hover:shadow-md cursor-pointer hover:scale-[1.02]`}`}
            >
              <Icon className="w-6 h-6" />
              <span className="text-sm font-semibold">{label}</span>
              {soon && <span className="text-[10px] opacity-70 -mt-1">Coming soon</span>}
            </button>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Total Runs", value: stats.total, color: "text-slate-700" },
            { label: "NERIS Logged", value: stats.logged, color: "text-green-600" },
            { label: "Fire", value: stats.fire, color: "text-red-600" },
            { label: "Medical", value: stats.medical, color: "text-blue-600" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-slate-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Search + View toggle */}
        <div className="flex items-center gap-3 mb-5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by location, NFIRS ID, nature of call…"
              className="pl-9 bg-white border-slate-200"
            />
          </div>
          <div className="flex rounded-lg border border-slate-200 overflow-hidden bg-white">
            <button onClick={() => setView("list")} className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-colors ${view === "list" ? "bg-slate-800 text-white" : "text-slate-500 hover:bg-slate-50"}`}>
              <List className="w-3.5 h-3.5" /> List
            </button>
            <button onClick={() => setView("raw")} className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-colors ${view === "raw" ? "bg-slate-800 text-white" : "text-slate-500 hover:bg-slate-50"}`}>
              <Table className="w-3.5 h-3.5" /> Raw
            </button>
          </div>
        </div>

        {/* Raw Data View */}
        {view === "raw" && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {isLoading ? (
              <div className="flex justify-center py-16">
                <div className="w-8 h-8 border-4 border-slate-200 border-t-red-600 rounded-full animate-spin" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="text-xs w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-800 text-white">
                      {RAW_COLS.map(col => (
                        <th key={col} className="px-2 py-2 text-left font-semibold whitespace-nowrap border-r border-slate-700 last:border-r-0">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((inc, i) => (
                      <tr key={inc.id} className={`border-b border-slate-100 hover:bg-blue-50 cursor-pointer ${i % 2 === 0 ? "bg-white" : "bg-slate-50"}`}
                        onClick={() => navigate(`/incident/${inc.id}`)}>
                        {RAW_COLS.map(col => (
                          <td key={col} className="px-2 py-1.5 border-r border-slate-100 last:border-r-0 max-w-[200px] truncate whitespace-nowrap">
                            {inc[col] === true ? "✓" : inc[col] === false ? "✗" : (inc[col] ?? "")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filtered.length === 0 && <div className="text-center py-10 text-slate-400">No runs found</div>}
              </div>
            )}
          </div>
        )}

        {/* List View */}
        {view === "list" && (
          isLoading ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-4 border-slate-200 border-t-red-600 rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Flame className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">{search ? "No matches found" : "No runs yet"}</p>
              {!search && (
                <Link to="/incident/new">
                  <Button className="mt-4 bg-red-600 hover:bg-red-700 text-white">
                    <Plus className="w-4 h-4 mr-1" /> Add First Run
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((inc) => (
                <div key={inc.id} className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        {inc.nfirs_id && <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{inc.nfirs_id}</span>}
                        {inc.date && <span className="text-xs text-slate-500">{new Date(inc.date).toLocaleDateString()}</span>}
                        {inc.type_response && (
                          <Badge className={`text-xs px-2 py-0.5 rounded-full font-medium border-0 ${getTypeColor(inc.type_response)}`}>
                            {inc.type_response.split(" > ")[0]}
                          </Badge>
                        )}
                        <NerisStatus incident={inc} />
                      </div>
                      <p className="font-semibold text-slate-800 truncate">{inc.incident_location || "No location"}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 flex-wrap">
                        {inc.nature_of_call && <span>{inc.nature_of_call}</span>}
                        {inc.incident_commander && <span>IC: {inc.incident_commander}</span>}
                        {inc.action_taken && <span>• {inc.action_taken}</span>}
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Link to={`/incident/${inc.id}`}>
                        <Button variant="ghost" size="icon" className="w-8 h-8 text-slate-400 hover:text-blue-600">
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost" size="icon"
                        className="w-8 h-8 text-slate-400 hover:text-red-600"
                        onClick={() => window.confirm("Delete this run?") && deleteIncident.mutate(inc.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}