const STYLES = {
  draft: "bg-slate-100 text-slate-600 border-slate-200",
  awaiting_review: "bg-amber-100 text-amber-800 border-amber-200",
  approved: "bg-green-100 text-green-700 border-green-200",
};

const LABELS = {
  draft: "CAD loaded · not submitted",
  awaiting_review: "Awaiting Review",
  approved: "Approved",
};

export default function PilotStatusBadge({ status, className = "" }) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold ${STYLES[status] || STYLES.draft} ${className}`}
    >
      {LABELS[status] || status}
    </span>
  );
}