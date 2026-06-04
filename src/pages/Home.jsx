import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDepartment } from "@/lib/DepartmentContext";
import { useAuth } from "@/lib/AuthContext";

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isSuperAdmin, departmentId, loading } = useDepartment();

  useEffect(() => {
    if (loading) return;
    if (isSuperAdmin) {
      navigate("/select-dept", { replace: true });
    } else if (departmentId) {
      navigate(`/dept/${departmentId}`, { replace: true });
    }
  }, [loading, isSuperAdmin, departmentId]);

  return (
    <div className="fixed inset-0 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-red-600 rounded-full animate-spin" />
    </div>
  );
}