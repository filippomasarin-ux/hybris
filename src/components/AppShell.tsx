import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Users, MessageCircle, BarChart3, User } from "lucide-react";
import type { ReactNode } from "react";
import { Logo } from "./Logo";

type Tab = {
  to: "/home" | "/club" | "/coach" | "/stats" | "/profilo";
  label: string;
  icon: typeof Home;
};

const tabs: Tab[] = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/coach", label: "Coach", icon: MessageCircle },
  { to: "/stats", label: "Stats", icon: BarChart3 },
  { to: "/club", label: "Club", icon: Users },
  { to: "/profilo", label: "Profilo", icon: User },
];

export function AppShell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0 md:pl-56">
      {/* Desktop sidebar */}
      <aside
        className="fixed inset-y-0 left-0 z-20 hidden w-56 flex-col md:flex"
        style={{ background: "#0A0A0A", borderRight: "1px solid #1A1A1A" }}
      >
        <div className="flex h-16 items-center px-5" style={{ borderBottom: "1px solid #1A1A1A" }}>
          <Link to="/home"><Logo /></Link>
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-3 py-5">
          {tabs.map((t) => {
            const active = path === t.to || path.startsWith(t.to + "/");
            const Icon = t.icon;
            return (
              <Link
                key={t.to}
                to={t.to}
                className="group relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-150"
                style={
                  active
                    ? { background: "#1A1A1A", color: "#FFFFFF" }
                    : { color: "#8E8E93" }
                }
              >
                {active && (
                  <span
                    className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r"
                    style={{ background: "var(--color-accent)" }}
                  />
                )}
                <Icon
                  size={17}
                  strokeWidth={active ? 2.5 : 2}
                  style={{ color: active ? "var(--color-accent)" : "inherit", flexShrink: 0 }}
                />
                <span
                  className="font-display text-base tracking-widest uppercase"
                  style={{ color: active ? "#FFFFFF" : "#8E8E93" }}
                >
                  {t.label}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="px-5 py-4" style={{ borderTop: "1px solid #1A1A1A" }}>
          <p className="label-caps" style={{ color: "#5A5A60" }}>v1.0 · Dark Performance</p>
        </div>
      </aside>

      {/* Main */}
      <main className="w-full px-4 md:px-8 lg:px-10">{children}</main>

      {/* Mobile bottom nav */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 md:hidden"
        style={{
          background: "rgba(10, 10, 10, 0.92)",
          backdropFilter: "blur(24px)",
          borderTop: "1px solid #1A1A1A",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        <div className="mx-auto flex max-w-md items-stretch justify-around px-2 pt-2 pb-2">
          {tabs.map((t) => {
            const active = path === t.to || path.startsWith(t.to + "/");
            const Icon = t.icon;
            return (
              <Link
                key={t.to}
                to={t.to}
                className="flex flex-1 flex-col items-center gap-1 py-1"
              >
                <Icon
                  size={20}
                  strokeWidth={active ? 2.5 : 2}
                  style={{ color: active ? "var(--color-accent)" : "#5A5A60" }}
                />
                <span
                  className="font-display text-[10px] tracking-[0.18em]"
                  style={{ color: active ? "#FFFFFF" : "#5A5A60" }}
                >
                  {t.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
