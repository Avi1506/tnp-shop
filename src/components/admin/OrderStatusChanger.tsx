"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Loader2 } from "lucide-react";
import { ORDER_STATUS_OPTIONS } from "@/components/admin/StatusBadge";

export default function OrderStatusChanger({ orderId, currentStatus }: { orderId: string; currentStatus: string }) {
  const [status, setStatus] = useState(currentStatus);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function handleChange(newStatus: string) {
    setStatus(newStatus);
    setSaving(true);
    const res = await fetch(`/api/admin/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    setSaving(false);
    if (!res.ok) {
      toast.error("Failed to update status");
      setStatus(currentStatus);
      return;
    }
    toast.success("Status updated — customer notified by email");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={status}
        onChange={(e) => handleChange(e.target.value)}
        disabled={saving}
        className="text-sm border border-border rounded-lg px-3 py-2 outline-none focus:border-gold capitalize"
      >
        {ORDER_STATUS_OPTIONS.map((s) => (
          <option key={s} value={s}>
            {s.replace(/_/g, " ")}
          </option>
        ))}
      </select>
      {saving && <Loader2 size={15} className="animate-spin text-navy/40" />}
    </div>
  );
}
