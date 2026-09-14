"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export default function CustomerSignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: `${window.location.origin}/` })}
      className="flex items-center gap-2 text-xs sm:text-sm font-medium px-3 py-2 md:px-3.5 md:py-2.5 rounded-xl transition text-red/80 hover:bg-red/5 hover:text-red w-full shrink-0"
    >
      <LogOut size={16} />
      <span className="whitespace-nowrap">Sign Out</span>
    </button>
  );
}
