import { ShieldOff } from "lucide-react";

/**
 * PermissionDenied — drop-in banner for pages/sections the current user cannot access.
 * Usage: <PermissionDenied message="Only admins can manage members." />
 */
export default function PermissionDenied({ message }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mb-4">
        <ShieldOff className="w-7 h-7 text-red-400" />
      </div>
      <h2 className="font-semibold text-slate-700 mb-1">Access Restricted</h2>
      <p className="text-sm text-slate-400 max-w-xs">
        {message || "You don't have permission to view this section."}
      </p>
    </div>
  );
}