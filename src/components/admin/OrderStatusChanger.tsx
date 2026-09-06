"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Loader2 } from "lucide-react";
import { ORDER_STATUS_OPTIONS } from "@/components/admin/StatusBadge";

export default function OrderStatusChanger({
  orderId,
  currentStatus,
  initialTrackingId,
  initialTrackingUrl,
}: {
  orderId: string;
  currentStatus: string;
  initialTrackingId?: string | null;
  initialTrackingUrl?: string | null;
}) {
  const [status, setStatus] = useState(currentStatus);
  const [trackingId, setTrackingId] = useState(initialTrackingId || "");
  const [trackingUrl, setTrackingUrl] = useState(initialTrackingUrl || "");
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function updateStatus(newStatus: string, tId?: string, tUrl?: string) {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          trackingId: tId !== undefined ? tId : trackingId,
          trackingUrl: tUrl !== undefined ? tUrl : trackingUrl,
        }),
      });
      if (!res.ok) {
        throw new Error("Failed to update status");
      }
      setStatus(newStatus);
      toast.success(`Status updated to ${newStatus.replace(/_/g, " ")} — customer notified by email`);
      setShowTrackingModal(false);
      router.refresh();
    } catch {
      toast.error("Failed to update status");
      setStatus(currentStatus);
    } finally {
      setSaving(false);
    }
  }

  function handleSelect(newStatus: string) {
    if (newStatus === "shipped") {
      setPendingStatus("shipped");
      setShowTrackingModal(true);
    } else {
      updateStatus(newStatus);
    }
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <select
          value={status}
          onChange={(e) => handleSelect(e.target.value)}
          disabled={saving}
          className="text-sm border border-border rounded-lg px-3 py-2 outline-none focus:border-gold capitalize bg-white font-medium"
        >
          {ORDER_STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, " ")}
            </option>
          ))}
        </select>
        {status === "shipped" && (
          <button
            type="button"
            onClick={() => {
              setPendingStatus("shipped");
              setShowTrackingModal(true);
            }}
            className="text-xs text-gold hover:underline font-medium"
          >
            Edit Tracking
          </button>
        )}
        {saving && <Loader2 size={15} className="animate-spin text-navy/40" />}
      </div>

      {showTrackingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4 border border-border">
            <h3 className="font-semibold text-navy text-base">Shipment &amp; Tracking Details</h3>
            <p className="text-xs text-navy/60">
              Enter the courier tracking details. An automated shipping email with these details will be sent to the customer.
            </p>

            <div>
              <label className="text-xs font-semibold text-navy/60 uppercase tracking-wide">
                Tracking Number / AWB Code
              </label>
              <input
                type="text"
                placeholder="e.g. DELHIVERY12345678, BLUEDART98765"
                value={trackingId}
                onChange={(e) => setTrackingId(e.target.value)}
                className="w-full mt-1 text-sm border border-border rounded-lg px-3 py-2 outline-none focus:border-gold"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-navy/60 uppercase tracking-wide">
                Tracking Link / Courier URL (Optional)
              </label>
              <input
                type="url"
                placeholder="e.g. https://www.delhivery.com/track/package/..."
                value={trackingUrl}
                onChange={(e) => setTrackingUrl(e.target.value)}
                className="w-full mt-1 text-sm border border-border rounded-lg px-3 py-2 outline-none focus:border-gold"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowTrackingModal(false);
                  setPendingStatus(null);
                }}
                disabled={saving}
                className="px-4 py-2 text-xs font-semibold text-navy/70 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => updateStatus(pendingStatus || "shipped", trackingId, trackingUrl)}
                disabled={saving}
                className="px-5 py-2 text-xs font-semibold bg-gold text-navy rounded-lg hover:brightness-110 flex items-center gap-1.5"
              >
                {saving && <Loader2 size={13} className="animate-spin" />}
                Confirm &amp; Send Shipping Email
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
