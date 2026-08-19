const COLORS: Record<string, string> = {
  pending_payment: "bg-yellow-100 text-yellow-700",
  payment_received: "bg-teal/10 text-teal",
  design_review: "bg-blue-100 text-blue-700",
  in_production: "bg-purple-100 text-purple-700",
  quality_check: "bg-indigo-100 text-indigo-700",
  packed: "bg-orange-100 text-orange-700",
  shipped: "bg-sky-100 text-sky-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
  refunded: "bg-gray-200 text-gray-700",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${COLORS[status] ?? "bg-gray-100 text-gray-600"}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

export const ORDER_STATUS_OPTIONS = [
  "pending_payment",
  "payment_received",
  "design_review",
  "in_production",
  "quality_check",
  "packed",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
];
