import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ShieldCheck, Save } from "lucide-react";

const ROLE_LABELS = {
  dept_admin: "Department Admin",
  reviewer: "Reviewer",
  user: "Responder",
  viewer: "Viewer",
};

function assignmentsFromUser(user) {
  return (user?.department_ids || []).map((departmentId) => ({
    department_id: departmentId,
    role: (user.department_admin_ids || []).includes(departmentId) ? "dept_admin"
      : (user.department_reviewer_ids || []).includes(departmentId) ? "reviewer"
      : (user.department_responder_ids || []).includes(departmentId) ? "user"
      : "viewer",
  }));
}

export default function AdminUserAccess() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user: actor } = useAuth();
  const [selectedUserId, setSelectedUserId] = useState("");
  const [assignments, setAssignments] = useState([]);
  const [defaultDepartmentId, setDefaultDepartmentId] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["department-access-admin"],
    queryFn: async () => {
      const response = await base44.functions.invoke("manageDepartmentAccess", { action: "list" });
      return response.data || response;
    },
    enabled: actor?.role === "admin",
  });
  const users = data?.users || [];
  const departments = data?.departments || [];
  const selectedUser = users.find((user) => user.id === selectedUserId);
  const assignmentMap = useMemo(() => new Map(assignments.map((item) => [item.department_id, item.role])), [assignments]);

  useEffect(() => {
    if (!selectedUser) return;
    setAssignments(assignmentsFromUser(selectedUser));
    setDefaultDepartmentId(selectedUser.default_department_id || "");
  }, [selectedUserId, selectedUser]);

  const save = useMutation({
    mutationFn: async () => base44.functions.invoke("manageDepartmentAccess", {
      action: "assign",
      user_id: selectedUserId,
      app_role: selectedUser?.role === "admin" ? "super_admin" : "user",
      assignments,
      default_department_id: defaultDepartmentId,
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["department-access-admin"] }),
  });

  const setRole = (departmentId, role) => {
    setAssignments((current) => {
      const without = current.filter((item) => item.department_id !== departmentId);
      if (role === "none") {
        if (defaultDepartmentId === departmentId) setDefaultDepartmentId("");
        return without;
      }
      return [...without, { department_id: departmentId, role }];
    });
  };

  if (actor?.role !== "admin") return <div className="p-8 text-center text-red-700">Base44 administrator access is required.</div>;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/departments")}><ArrowLeft className="w-4 h-4" /></Button>
          <ShieldCheck className="w-7 h-7 text-blue-600" />
          <div><h1 className="text-2xl font-bold">User Department Access</h1><p className="text-sm text-slate-500">Assign each person’s role independently for each department.</p></div>
        </div>

        {isLoading && <p>Loading users and departments…</p>}
        {error && <p className="text-red-700">{error.message}</p>}
        {!isLoading && <div className="bg-white border rounded-xl p-5 space-y-5">
          <div>
            <label className="text-sm font-medium">User</label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select a user" /></SelectTrigger>
              <SelectContent>{users.map((user) => <SelectItem key={user.id} value={user.id}>{user.full_name || user.email} — {user.email}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          {selectedUser && <>
            <div className="flex gap-2"><Badge>{selectedUser.role === "admin" ? "Base44 Admin" : "Base44 User"}</Badge><Badge variant="outline">{assignments.length} department(s)</Badge></div>
            <div className="divide-y border rounded-lg">
              {departments.map((department) => (
                <div key={department.id} className="p-3 flex items-center justify-between gap-3">
                  <div><div className="font-medium">{department.department_name}</div><div className="text-xs text-slate-500">{department.short_name || department.id}</div></div>
                  <Select value={assignmentMap.get(department.id) || "none"} onValueChange={(role) => setRole(department.id, role)}>
                    <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="none">No access</SelectItem>{Object.entries(ROLE_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            <div>
              <label className="text-sm font-medium">Default department</label>
              <Select value={defaultDepartmentId} onValueChange={setDefaultDepartmentId} disabled={!assignments.length}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Choose default" /></SelectTrigger>
                <SelectContent>{assignments.map((item) => { const department = departments.find((d) => d.id === item.department_id); return <SelectItem key={item.department_id} value={item.department_id}>{department?.department_name || item.department_id}</SelectItem>; })}</SelectContent>
              </Select>
            </div>
            <Button onClick={() => save.mutate()} disabled={save.isPending} className="bg-blue-600 hover:bg-blue-700"><Save className="w-4 h-4 mr-2" />{save.isPending ? "Saving…" : "Save Access"}</Button>
            {save.isSuccess && <span className="ml-3 text-sm text-green-700">Access saved.</span>}
            {save.error && <p className="text-sm text-red-700">{save.error.message}</p>}
          </>}
        </div>}
      </div>
    </div>
  );
}
