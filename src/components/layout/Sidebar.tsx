"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import QrUpload from "@/components/ui/QrUpload";

const navItems = [
  { href: "/", label: "首页", icon: "🏠" },
  { href: "/timeline", label: "时间线", icon: "📅" },
  { href: "/anniversaries", label: "纪念日", icon: "💕" },
  { href: "/travels", label: "旅行", icon: "✈️" },
  { href: "/map", label: "足迹地图", icon: "🗺️" },
];

interface SidebarProps {
  coupleNames: { me: string; partner: string } | null;
}

export default function Sidebar({ coupleNames }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-60 border-r border-[var(--color-border)] bg-[var(--color-bg-card)] h-screen sticky top-0">
      {/* Logo */}
      <div className="p-6 border-b border-[var(--color-border)]">
        <Link href="/" className="flex items-center gap-1.5">
          {coupleNames ? (
            <span className="font-bold text-[15px] text-[var(--color-primary)] truncate leading-snug">
              {coupleNames.me}
              <span className="inline-block mx-0.5 align-middle">💝</span>
              {coupleNames.partner}
              的小屋
            </span>
          ) : (
            <>
              <span className="text-2xl">💝</span>
              <span className="font-bold text-lg text-[var(--color-primary)]">
                Our Love Journal
              </span>
            </>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-sm)] text-sm font-medium transition-colors duration-200",
                isActive
                  ? "bg-[var(--color-bg-soft)] text-[var(--color-primary)]"
                  : "text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-soft)]"
              )}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="border-t border-[var(--color-border)] px-7 py-3">
        <QrUpload />
      </div>
      <div className="p-4 border-t border-[var(--color-border)]">
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-sm)] text-sm font-medium transition-colors duration-200",
            pathname.startsWith("/settings")
              ? "bg-[var(--color-bg-soft)] text-[var(--color-primary)]"
              : "text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-soft)]"
          )}
        >
          <span className="text-lg">⚙️</span>
          设置
        </Link>
      </div>
    </aside>
  );
}
