"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  groupNavItems,
  modulesForRole,
  navIcon,
  navLabel,
  roleLabel,
  type NavItem,
} from "./nav";
import { useAuth, useRequireAuth } from "./auth";
import { DashboardIcon, LogoutIcon } from "./icons";
import { LogoMark } from "./logo";
import { WorldProvider } from "./world";

export type { NavItem } from "./nav";

/**
 * Shared legend-rail body. Rendered once for the desktop rail and once inside
 * the mobile off-canvas panel, so both stay in sync automatically. The rail
 * reads as the survey plate's legend bar: small-caps category labels over
 * standard navigation links.
 */
function SidebarBody({
  items,
  activePath,
  userEmail,
  role,
  onNavigate,
}: {
  items: NavItem[];
  activePath?: string;
  userEmail: string;
  role: string;
  onNavigate?: () => void;
}) {
  const groups = groupNavItems(items);

  return (
    <>
      <div className="flex h-16 items-center gap-3 border-b border-white/10 px-5">
        <LogoMark size={34} />
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="truncate text-sm font-semibold tracking-tight text-white">
            Agro Trazabilidad
          </span>
          <span className="op-label">Carta de suelos</span>
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Módulos">
        {/* Always-available link back to the main dashboard console. */}
        <ul className="mb-3 space-y-0.5">
          <li>
            <Link
              href="/dashboard"
              onClick={onNavigate}
              aria-current={activePath === "/dashboard" ? "page" : undefined}
              className="op-nav-link"
            >
              <span className="opacity-80">
                <DashboardIcon className="h-4 w-4" />
              </span>
              <span className="truncate">Panel principal</span>
              {activePath === "/dashboard" && (
                <span className="op-nav-dot ml-auto" aria-hidden="true" />
              )}
            </Link>
          </li>
        </ul>
        {groups.map((group, gi) => (
          <div key={group.key} className={gi > 0 ? "mt-5" : undefined}>
            <p className="op-label px-2 pb-1.5">{group.label}</p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = item.href === activePath;
                const Icon = navIcon(item.icon);
                return (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={isActive ? "page" : undefined}
                      className="op-nav-link"
                    >
                      <span className="opacity-80">{Icon ? <Icon className="h-4 w-4" /> : null}</span>
                      <span className="truncate">{item.label}</span>
                      {isActive && <span className="op-nav-dot ml-auto" aria-hidden="true" />}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 p-3">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/20 text-xs font-semibold text-white/90">
            {userEmail.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 text-sm">
            <p className="truncate font-medium text-white">{userEmail}</p>
            <p className="op-rail-sub truncate">{role}</p>
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

  // Filter by role, then relabel per role (e.g. "Campos de clientes" for staff).
  const items = modulesForRole(sidebarItems, user?.role).map((item) => ({
    ...item,
    label: navLabel(item, user?.role),
  }));
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

  // Guard: do not render the dashboard (nor fire its data fetches) until the
  // session has been read from localStorage and validated.
  if (!ready) {
    return (
      <div className="operate-world op-canvas flex min-h-screen items-center justify-center">
        <div className="flex items-center gap-2.5 text-sm text-ink-soft">
          <span className="op-nav-dot animate-pulse-soft" aria-hidden="true" />
          Cargando sesión…
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <WorldProvider value="operate-world">
      <div className="operate-world flex min-h-screen">
        <a href="#main-content" className="op-skip">
          Saltar al contenido principal
        </a>

        {/* Desktop legend rail */}
        <aside className="op-rail sticky top-0 hidden h-screen w-64 flex-col lg:flex">
          <SidebarBody
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
              className="animate-fade-in absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            <aside className="op-rail animate-sidebar-in absolute left-0 top-0 flex h-full w-72 max-w-[85%] flex-col shadow-float">
              <SidebarBody
                items={items}
                activePath={pathname}
                userEmail={userEmail}
                role={role}
                onNavigate={() => setMobileOpen(false)}
              />
            </aside>
          </div>
        )}

        <div className="op-canvas flex min-w-0 flex-1 flex-col">
          {/* Topbar */}
          <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-agro-border bg-card/90 px-4 backdrop-blur sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                aria-label="Abrir menú"
                aria-expanded={mobileOpen}
                className="op-btn op-btn--quiet h-11 w-11 shrink-0 p-0 lg:hidden"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
              </button>
              <div className="min-w-0">
                <h1 className="truncate text-base font-semibold tracking-tight text-ink sm:text-lg">
                  {title}
                </h1>
                {breadcrumb && (
                  <p className="hidden truncate text-xs text-ink-soft sm:block">{breadcrumb}</p>
                )}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <div className="hidden items-center gap-2.5 border border-agro-border bg-base-subtle/60 py-1.5 pl-1.5 pr-3 sm:flex">
                <div className="flex h-7 w-7 items-center justify-center text-xs font-bold text-ink">
                  {userEmail.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="max-w-[12rem] truncate text-xs font-medium text-ink">{userEmail}</p>
                  <p className="text-xs text-ink-soft">{role}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={logout}
                title="Cerrar sesión"
                className="op-btn op-btn--quiet"
              >
                <LogoutIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Salir</span>
              </button>
            </div>
          </header>

          <main id="main-content" key={pathname} className="animate-fade-in-up flex-1 p-4 sm:p-6 lg:p-8">
            {children}
          </main>
        </div>
      </div>
    </WorldProvider>
  );
};
