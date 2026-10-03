"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { modulesForRole, navIcon, roleLabel, type NavItem } from "./nav";
import { useAuth, useRequireAuth } from "./auth";
import { LogoutIcon } from "./icons";
import { LogoMark } from "./logo";

export type { NavItem } from "./nav";

/**
 * Shared sidebar body. Rendered once for the desktop rail and once inside the
 * mobile off-canvas panel, so both stay in sync automatically.
 */
function SidebarBody({
  title,
  items,
  activePath,
  userEmail,
  role,
  onNavigate,
}: {
  title: string;
  items: NavItem[];
  activePath?: string;
  userEmail: string;
  role: string;
  onNavigate?: () => void;
}) {
  return (
    <>
      <div className="flex h-16 items-center gap-3 border-b border-white/10 px-5">
        <LogoMark size={36} />
        <span className="truncate font-display font-semibold tracking-tight text-white">
          {title}
        </span>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        <p className="px-3 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-wider text-white/40">
          Módulos
        </p>
        {items.map((item) => {
          const isActive = item.href === activePath;
          const Icon = navIcon(item.icon);
          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={onNavigate}
              aria-current={isActive ? "page" : undefined}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                isActive
                  ? "bg-agro-green/20 text-white ring-1 ring-inset ring-agro-green/40"
                  : "text-white/60 hover:bg-white/5 hover:text-white"
              }`}
            >
              <span
                className={
                  isActive
                    ? "text-agro-olive [&>svg]:text-agro-olive"
                    : "text-white/45"
                }
              >
                {Icon ? <Icon className="h-4 w-4" /> : null}
              </span>
              <span className="truncate">{item.label}</span>
              {isActive && (
                <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-agro-olive" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-3">
        <div className="flex items-center gap-3 rounded-lg bg-white/5 px-3 py-2 ring-1 ring-inset ring-white/10">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-agro-olive/35 text-xs font-semibold text-emerald-100">
            {userEmail.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 text-sm">
            <p className="truncate font-medium text-white">{userEmail}</p>
            <p className="truncate text-xs text-white/50">{role}</p>
          </div>
        </div>
      </div>
    </>
  );
}

export const DashboardLayout = ({
  title,
  sidebarItems,
  breadcrumb,
  children,
}: {
  title: string;
  sidebarItems: NavItem[];
  breadcrumb?: string;
  children: React.ReactNode;
}) => {
  const pathname = usePathname();
  const { user, ready } = useRequireAuth();
  const { logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const items = modulesForRole(sidebarItems, user?.role);
  const role = roleLabel(user?.role);
  const userEmail = user?.email ?? "Usuario";

  // Close the mobile menu with Escape.
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  // Guard: no render the dashboard (nor fire its data fetches) until the
  // session has been read from localStorage and validated.
  if (!ready) {
    return (
      <div className="app-canvas flex min-h-screen items-center justify-center">
        <div className="flex items-center gap-2.5 text-sm text-ink-soft">
          <span className="h-2 w-2 animate-pulse-soft rounded-full bg-agro-green" />
          Cargando sesión…
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex min-h-screen">
      {/* Desktop rail */}
      <aside className="sticky top-0 hidden h-screen w-64 flex-col bg-agro-sidebar text-white lg:flex">
        <SidebarBody
          title={title}
          items={items}
          activePath={pathname}
          userEmail={userEmail}
          role={role}
        />
      </aside>

      {/* Mobile off-canvas */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Menú de navegación"
        >
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={() => setMobileOpen(false)}
            className="animate-fade-in absolute inset-0 bg-agro-green-deep/50 backdrop-blur-sm"
          />
          <aside className="animate-sidebar-in absolute left-0 top-0 flex h-full w-72 max-w-[85%] flex-col bg-agro-sidebar text-white shadow-float">
            <SidebarBody
              title={title}
              items={items}
              activePath={pathname}
              userEmail={userEmail}
              role={role}
              onNavigate={() => setMobileOpen(false)}
            />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col app-canvas">
        {/* Topbar */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-agro-border bg-card/85 px-4 backdrop-blur sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Abrir menú"
              aria-expanded={mobileOpen}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-agro-border bg-card text-ink-soft transition-colors hover:bg-base-subtle hover:text-ink lg:hidden"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold text-ink sm:text-lg">{title}</h1>
              {breadcrumb && (
                <p className="hidden truncate text-xs text-ink-soft sm:block">{breadcrumb}</p>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <div className="hidden items-center gap-2.5 rounded-lg border border-agro-border bg-base-subtle/60 py-1.5 pl-1.5 pr-3 sm:flex">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-agro-green/15 text-xs font-bold text-agro-green-deep">
                {userEmail.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="max-w-[12rem] truncate text-xs font-medium text-ink">
                  {userEmail}
                </p>
                <p className="text-[11px] text-ink-soft">{role}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={logout}
              title="Cerrar sesión"
              className="flex h-9 items-center gap-2 rounded-lg border border-agro-border bg-card px-3 text-sm font-medium text-ink-soft transition-colors hover:bg-base-subtle hover:text-ink"
            >
              <LogoutIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </header>

        <main key={pathname} className="animate-fade-in-up flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};
