"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { cn } from "@/lib/utils/cn";
import {
  Sun,
  Dumbbell,
  CalendarDays,
  BarChart3,
  MessageSquare,
  Brain,
  Settings,
  UtensilsCrossed,
  ArrowUpRight,
} from "lucide-react";

const navItems = [
  { label: "Today", href: "/dashboard", icon: Sun },
  { label: "Train", href: "/train", icon: Dumbbell },
  { label: "Plan", href: "/plan", icon: CalendarDays },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Feed", href: "/feed", icon: MessageSquare },
  { label: "Insights", href: "/insights", icon: Brain },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useUser();
  const displayName = user?.fullName ?? user?.firstName ?? "Athlete";
  const initials = (displayName || "A").trim().charAt(0).toUpperCase();

  return (
    <aside className="fixed left-0 top-0 h-screen w-60 z-40 flex flex-col border-r border-border bg-[#0e0e12]/90 backdrop-blur-xl">
      {/* Logo */}
      <div className="px-5 pt-6 pb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-b from-accent-hover to-accent flex items-center justify-center text-[#17130b] font-display font-bold text-sm shadow-[0_6px_18px_-6px_rgba(216,172,99,0.7)]">
            G
          </div>
          <div>
            <h1 className="text-[15px] font-display font-bold tracking-tight text-ink leading-none">GRIT</h1>
            <p className="text-[10px] text-ink-faint tracking-widest uppercase mt-1">Performance OS</p>
          </div>
        </div>
      </div>

      <div className="divider mx-4" />

      {/* Nav */}
      <nav className="flex-1 py-3 px-2.5 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname?.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all",
                active
                  ? "bg-accent-subtle text-accent font-medium"
                  : "text-ink-muted hover:text-ink hover:bg-white/[0.03]"
              )}
            >
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-full bg-accent shadow-[0_0_12px_rgba(216,172,99,0.8)]" />
              )}
              <Icon className="w-[17px] h-[17px]" />
              {item.label}
            </Link>
          );
        })}

        <div className="divider mx-2 my-2" />

        {/* External: Nutrition → Calorified */}
        <a
          href="https://calorified.attridevv.com"
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-ink-muted hover:text-ink hover:bg-white/[0.03] transition-all"
        >
          <UtensilsCrossed className="w-[17px] h-[17px]" />
          Nutrition
          <ArrowUpRight className="w-3.5 h-3.5 ml-auto text-ink-faint group-hover:text-accent transition-colors" />
        </a>

        <Link
          href="/settings"
          className={cn(
            "group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all",
            pathname === "/settings"
              ? "bg-accent-subtle text-accent font-medium"
              : "text-ink-muted hover:text-ink hover:bg-white/[0.03]"
          )}
        >
          <Settings className="w-[17px] h-[17px]" />
          Settings
        </Link>
      </nav>

      {/* User */}
      <div className="p-3">
        <div className="panel p-2.5 flex items-center gap-3">
          {user?.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.imageUrl} alt={displayName} className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-accent-subtle flex items-center justify-center text-accent font-bold text-sm">
              {initials}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-ink truncate">{displayName}</p>
            <p className="text-[10px] text-ink-faint truncate">Free plan</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
