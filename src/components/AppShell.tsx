import { Link, useRouterState } from "@tanstack/react-router";
import { Home, MessageCircle, Users, User } from "lucide-react";
import type { ReactNode } from "react";
import { Logo } from "./Logo";

const tabs = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/coach", label: "Coach", icon: MessageCircle },
  { to: "/club", label: "Club", icon: Users },
  { to: "/profilo", label: "Profilo", icon: User },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0 md:pl-52">
      {/* Desktop sidebar */}
      <aside
        className="fixed inset-y-0 left-0 z-20 hidden w-52 flex-col md:flex"
        style={{ background: "oklch(0.08 0.018 295)", borderRight: "1px solid oklch(1 0 0 / 5%)" }}
      >
        <div className="flex h-14 items-center px-5" style={{ borderBottom: "1px solid oklch(1 0 0 / 5%)" }}>
          <Link to="/home"><Logo /></Link>
        </div>

        <nav className="flex flex-1 flex-col gap-px px-2 py-4">
          {tabs.map((t) => {
            const active = path === t.to || path.startsWith(t.to + "/");
            const Icon = t.icon;
            return (
              <Link
                key={t.to}
                to={t.to}
                className="group relative flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors duration-100"
                style={
                  active
                    ? { background: "oklch(0.66 0.28 295 / 10%)", color: "var(--color-foreground)" }
                    : { color: "oklch(0.48 0.02 290)" }
                }
              >
                {active && (
                  <span
                    className="absolute left-0 top-1/2 h-[18px] w-[3px] -translate-y-1/2 rounded-r"
                    style={{ background: "var(--color-accent)" }}
                  />
                )}
                <Icon
                  size={15}
                  strokeWidth={active ? 2.5 : 1.8}
                  style={{ color: active ? "var(--color-accent)" : "inherit", flexShrink: 0 }}
                />
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: active ? 600 : 400,
                    letterSpacing: "0.01em",
                  }}
                >
                  {t.label}
                </span>
                {!active && (
                  <span
                    className="absolute inset-0 rounded-lg opacity-0 transition-opacity duration-100 group-hover:opacity-100"
                    style={{ background: "oklch(1 0 0 / 3%)" }}
                  />
                )}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Centered single-column main */}
      <main className="mx-auto max-w-xl px-4 md:px-6">{children}</main>

      {/* Mobile bottom nav */}
      <nav
        className="fixed inset-x-0 bottom-0 z-20 md:hidden"
        style={{
          background: "oklch(0.08 0.018 295 / 95%)",
          backdropFilter: "blur(20px)",
          borderTop: "1px solid oklch(1 0 0 / 6%)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        <div className="mx-auto flex max-w-md items-stretch justify-around px-2 pt-1.5 pb-1.5">
          {tabs.map((t) => {
            const active = path === t.to || path.startsWith(t.to + "/");
            const Icon = t.icon;
            return (
              <Link
                key={t.to}
                to={t.to}
                className="flex flex-1 flex-col items-center gap-1 py-1"
                style={{ color: active ? "var(--color-foreground)" : "oklch(0.42 0.02 290)" }}
              >
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-150"
                  style={active ? { background: "oklch(0.66 0.28 295 / 14%)" } : {}}
                >
                  <Icon
                    size={17}
                    strokeWidth={active ? 2.5 : 1.8}
                    style={{ color: active ? "var(--color-accent)" : "inherit" }}
                  />
                </span>
                <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase" }}>
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
