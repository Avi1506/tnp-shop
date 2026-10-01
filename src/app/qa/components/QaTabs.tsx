"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, MessagesSquare, Mic2 } from "lucide-react";

const tabs = [
  { href: "/qa", label: "Questions", icon: BookOpen },
  { href: "/qa/interview", label: "Interview Prep", icon: MessagesSquare },
  { href: "/qa/speaking", label: "English Speaking", icon: Mic2 },
];

export function QaTabs() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-40 border-b border-white/8 bg-slate-950/95 px-3 py-2 backdrop-blur-xl">
      <div className="mx-auto grid max-w-3xl grid-cols-3 gap-2">
        {tabs.map((tab) => {
          const active =
            tab.href === "/qa"
              ? pathname === "/qa"
              : pathname === tab.href || pathname.startsWith(tab.href + "/");
          const Icon = tab.icon;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex min-h-12 min-w-0 items-center justify-center gap-1.5 rounded-2xl px-2 text-center text-[11px] font-black transition sm:text-sm ${
                active
                  ? "bg-gradient-to-r from-cyan-400 to-violet-500 text-slate-950"
                  : "border border-white/8 bg-white/[0.04] text-white/55 hover:bg-white/[0.07] hover:text-white"
              }`}
            >
              <Icon size={16} className="shrink-0" />
              <span className="min-w-0 truncate">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
