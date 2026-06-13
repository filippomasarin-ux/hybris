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
    <div className="min-h-screen bg-background pb-20 md:pb-0 md:pl-60">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 border-r border-border bg-surface md:flex md:flex-col">
        <div className="flex h-16 items-center px-6">
          <Link to="/home"><Logo /></Link>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3 py-2">
          {tabs.map((t) => {
            const active = path === t.to || path.startsWith(t.to + "/");
            const Icon = t.icon;
            return (
              <Link
                key={t.to} to={t.to}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
                style={
                  active
                    ? { backgroundColor: "color-mix(in oklab, var(--color-accent) 18%, transparent)", color: "var(--color-foreground)" }
                    : { color: "var(--color-muted-foreground)" }
                }
              >
                <Icon className="h-5 w-5" />
                {t.label}
              </Link>
            );
          })}
        </nav>
      </aside>


      <main className="mx-auto max-w-2xl">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface/95 backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-md items-stretch justify-around">
          {tabs.map((t) => {
            const active = path === t.to || path.startsWith(t.to + "/");
            const Icon = t.icon;
            return (
              <Link
                key={t.to} to={t.to}
                className="flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors"
                style={{ color: active ? "var(--color-foreground)" : "var(--color-muted-foreground)" }}
              >
                <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 1.8} />
                {t.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
