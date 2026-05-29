import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Plus, Flame, Search, Edit2, Trash2, CheckCircle, Clock, AlertCircle } from "lucide-react";

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

export default function Home() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: incidents = [], isLoading } = useQuery({
    queryKey: ["incidents"],
    queryFn: () => base44.entities.Incident.list("-created_date", 200),
  });

  const deleteIncident = useMutation({
    mutationFn: (id) => base44.entities.Incident.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["incidents"] }),
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Flame className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Petit Jean FD</h1>
              <p className="text-sm text-slate-500">Incident Run Sheet</p>
            </div>
          </div>
          <Link to="/incident/new">
            <Button className="bg-red-600 hover:bg-red-700 text-white shadow-sm">
              <Plus className="w-4 h-4 mr-2" /> New Incident
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Total Incidents", value: stats.total, color: "text-slate-700" },
            { label: "NERIS Logged", value: stats.logged, color: "text-green-600" },
            { label: "Fire Incidents", value: stats.fire, color: "text-red-600" },
            { label: "Medical Calls", value: stats.medical, color: "text-blue-600" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-slate-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by location, NFIRS ID, nature of call..."
            className="pl-9 bg-white border-slate-200"
          />
        </div>

        {/* List */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-red-600 rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Flame className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">{search ? "No matches found" : "No incidents yet"}</p>
            {!search && <Link to="/incident/new"><Button className="mt-4 bg-red-600 hover:bg-red-700 text-white"><Plus className="w-4 h-4 mr-1" /> Add First Incident</Button></Link>}
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
                    {inc.notes && <p className="text-xs text-slate-400 mt-1 line-clamp-1">{inc.notes}</p>}
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
                      onClick={() => window.confirm("Delete this incident?") && deleteIncident.mutate(inc.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}