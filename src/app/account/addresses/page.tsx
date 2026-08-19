"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Loader2, X, MapPin } from "lucide-react";
import toast from "react-hot-toast";

type Address = {
  id: string;
  label: string | null;
  fullName: string;
  phone: string;
  line1: string;
  line2: string | null;
  landmark: string | null;
  city: string;
  state: string;
  pincode: string;
};

export default function AddressesPage() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/account/addresses");
    const data = await res.json();
    setAddresses(data.addresses ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDelete(id: string) {
    if (!confirm("Delete this address?")) return;
    await fetch(`/api/account/addresses/${id}`, { method: "DELETE" });
    toast.success("Address deleted");
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold text-navy">Saved Addresses</h1>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-gold text-navy-dark font-semibold text-sm px-4 py-2.5 rounded-lg hover:brightness-110"
        >
          <Plus size={16} /> Add Address
        </button>
      </div>

      {loading ? (
        <Loader2 className="animate-spin text-navy/40" size={20} />
      ) : addresses.length === 0 ? (
        <div className="bg-offwhite border border-border rounded-2xl p-10 text-center">
          <MapPin size={24} className="mx-auto text-navy/30 mb-3" />
          <p className="text-navy/60 text-sm">No saved addresses yet.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {addresses.map((a) => (
            <div key={a.id} className="bg-white border border-border rounded-2xl p-5 relative">
              <button
                onClick={() => handleDelete(a.id)}
                className="absolute top-4 right-4 text-navy/30 hover:text-red"
              >
                <Trash2 size={15} />
              </button>
              <p className="text-xs font-semibold text-gold uppercase tracking-wide mb-1">{a.label}</p>
              <p className="font-semibold text-navy text-sm mb-1">{a.fullName}</p>
              <p className="text-sm text-navy/70">
                {a.line1}{a.line2 ? `, ${a.line2}` : ""}{a.landmark ? `, ${a.landmark}` : ""}, {a.city}, {a.state} {a.pincode}
              </p>
              <p className="text-sm text-navy/70 mt-1">{a.phone}</p>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <AddressModal
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function AddressModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    label: "Home",
    fullName: "",
    phone: "",
    line1: "",
    line2: "",
    landmark: "",
    city: "",
    state: "",
    pincode: "",
  });
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    const res = await fetch("/api/account/addresses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      toast.error(data.error);
      return;
    }
    toast.success("Address saved");
    onSaved();
  }

  return (
    <div className="fixed inset-0 bg-navy/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-navy">Add Address</h2>
          <button onClick={onClose} className="text-navy/40 hover:text-navy">
            <X size={18} />
          </button>
        </div>
        <div className="space-y-3">
          {[
            { key: "label", label: "Label (e.g. Home, Office)" },
            { key: "fullName", label: "Full Name" },
            { key: "phone", label: "Phone" },
            { key: "line1", label: "House / Flat, Street, Area" },
            { key: "line2", label: "Apartment, suite, etc. (optional)" },
            { key: "landmark", label: "Landmark (optional)" },
            { key: "city", label: "City" },
            { key: "state", label: "State" },
            { key: "pincode", label: "PIN Code" },
          ].map((f) => (
            <input
              key={f.key}
              placeholder={f.label}
              value={form[f.key as keyof typeof form]}
              onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
              className="w-full text-sm border border-border rounded-lg px-3 py-2.5 outline-none focus:border-gold"
            />
          ))}
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full mt-5 bg-navy text-white font-semibold py-2.5 rounded-lg hover:bg-navy-dark transition flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {saving && <Loader2 size={15} className="animate-spin" />}
          Save Address
        </button>
      </div>
    </div>
  );
}
