import { FlaskConical } from "lucide-react";

export default function PilotBanner() {
  return (
    <div className="rounded-xl border-2 border-amber-400 bg-amber-50 overflow-hidden">
      <div className="bg-amber-400 text-amber-950 text-[11px] font-bold tracking-[0.18em] uppercase px-4 py-1.5">
        Test environment · fictional data
      </div>
      <div className="flex items-start gap-3 px-4 py-3">
        <FlaskConical className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
        <p className="text-xs text-amber-900 leading-relaxed">
          Pre-RMS Pilot demo. Nothing on this page reads or writes a live incident or department
          record, and no CAD, ESO, NERIS or email system is contacted. All data stays in this
          browser under a pilot-only key.
        </p>
      </div>
    </div>
  );
}