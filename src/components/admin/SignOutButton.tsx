"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export default function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/admin/login" })}
      className="flex items-center gap-2 text-xs font-semibold text-white/70 hover:text-white transition"
    >
      <LogOut size={14} /> Sign Out
    </button>
  );
}
