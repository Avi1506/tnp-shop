"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import toast from "react-hot-toast";

export default function ProfilePage() {
  const { data: session, update } = useSession();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (session?.user?.name) setName(session.user.name);
  }, [session]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/account/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone, currentPassword: currentPassword || undefined, newPassword: newPassword || undefined }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      toast.error(data.error);
      return;
    }
    toast.success("Profile updated");
    setCurrentPassword("");
    setNewPassword("");
    update();
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-navy mb-8">Profile</h1>
      <form onSubmit={handleSave} className="max-w-md space-y-5">
        <div>
          <label className="text-xs font-semibold text-navy/60 uppercase tracking-wide">Email</label>
          <input
            disabled
            value={session?.user?.email ?? ""}
            className="w-full mt-1.5 text-sm border border-border rounded-lg px-3 py-2.5 bg-offwhite text-navy/50"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-navy/60 uppercase tracking-wide">Full Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full mt-1.5 text-sm border border-border rounded-lg px-3 py-2.5 outline-none focus:border-gold"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-navy/60 uppercase tracking-wide">Phone</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full mt-1.5 text-sm border border-border rounded-lg px-3 py-2.5 outline-none focus:border-gold"
          />
        </div>

        <div className="border-t border-border pt-5">
          <p className="text-sm font-semibold text-navy mb-3">Change Password</p>
          <div className="space-y-3">
            <input
              type="password"
              placeholder="Current password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full text-sm border border-border rounded-lg px-3 py-2.5 outline-none focus:border-gold"
            />
            <input
              type="password"
              placeholder="New password (min. 8 characters)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full text-sm border border-border rounded-lg px-3 py-2.5 outline-none focus:border-gold"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="bg-navy text-white font-semibold px-6 py-3 rounded-full hover:bg-navy-dark transition flex items-center gap-2 disabled:opacity-60"
        >
          {saving && <Loader2 size={15} className="animate-spin" />}
          Save Changes
        </button>
      </form>
    </div>
  );
}
