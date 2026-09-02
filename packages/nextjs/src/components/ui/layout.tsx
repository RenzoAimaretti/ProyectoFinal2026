"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ROLES, modulosPorRol, useRol } from "./rol";

export interface NavItem {
  label: string;
  href: string;
  active?: boolean;
}

const SidebarIcons: Record<string, React.ReactNode> = {
  "Mi Campo": (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
    </svg>
  ),
  "Producción": (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 3.75h12A2.25 2.25 0 0120.25 6v12A2.25 2.25 0 0118 20.25H6A2.25 2.25 0 013.75 18V6A2.25 2.25 0 016 3.75z" />
    </svg>
  ),
  "Insumos": (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M8.25 3.75h7.5l1.5 3.75h-10.5l1.5-3.75z" />
    </svg>
  ),
  "Finanzas": (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
    </svg>
  ),
  "Ganadería": (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0-1.795.5-3 1.5-3.5M3.75 13.5h16.5M12 7.5l-1.5 3m-5.25-1.5c0 4.739 2.844 8.25 6.75 8.25s6.75-3.511 6.75-8.25" />
    </svg>
  ),
  "Personal": (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  ),
  "Maquinaria": (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
    </svg>
  ),
};

const BrandMark = ({ size = 40 }: { size?: number }) => (
  <div
    style={{ width: size, height: size }}
    className="flex shrink-0 items-center justify-center rounded-xl bg-agro-green text-[#fff] font-bold shadow-card"
  >
    AG
  </div>
);

export const Sidebar = ({
  title,
  items,
  activePath,
  rolLabel,
}: {
  title: string;
  items: NavItem[];
  activePath?: string;
  rolLabel: string;
}) => {
  return (
    <aside className="sticky top-0 hidden h-screen w-64 flex-col bg-agro-sidebar text-white lg:flex">
      <div className="flex h-16 items-center gap-3 border-b border-white/10 px-5">
        <BrandMark size={36} />
        <span className="font-semibold tracking-tight text-white">{title}</span>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        <p className="px-3 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-wider text-white/40">
          Módulos
        </p>
        {items.map((item) => {
          const isActive = item.href === activePath;
          return (
            <Link
              key={item.label}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                isActive
                  ? "bg-agro-green/20 text-white ring-1 ring-inset ring-agro-green/40"
                  : "text-white/60 hover:bg-white/5 hover:text-white"
              }`}
            >
              <span className={isActive ? "text-agro-olive [&>svg]:text-agro-olive" : "text-white/45"}>
                {SidebarIcons[item.label] ?? null}
              </span>
              {item.label}
              {isActive && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-agro-olive" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-3">
        <div className="flex items-center gap-3 rounded-lg bg-white/5 px-3 py-2 ring-1 ring-inset ring-white/10">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-agro-olive/35 text-xs font-semibold text-emerald-100">
            EL
          </div>
          <div className="min-w-0 text-sm">
            <p className="truncate font-medium text-white">Eliggi</p>
            <p className="truncate text-xs text-white/50">{rolLabel}</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

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
  const { rol, setRol } = useRol();
  const items = modulosPorRol(sidebarItems, rol);
  const rolLabel = ROLES.find((r) => r.id === rol)?.label ?? "Usuario";

  return (
    <div className="flex min-h-screen">
      <Sidebar title={title} items={items} activePath={pathname} rolLabel={rolLabel} />

      <div className="flex min-w-0 flex-1 flex-col app-canvas">
        {/* Topbar */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-agro-border bg-card/85 px-6 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="hidden h-9 w-9 items-center justify-center rounded-lg bg-agro-green/10 lg:hidden">
              <svg className="h-5 w-5 text-agro-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </div>
            <div>
              <h1 className="text-base font-semibold text-ink sm:text-lg">{title}</h1>
              {breadcrumb && (
                <p className="hidden text-xs text-ink-soft sm:block">{breadcrumb}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Selector de rol (simulador de vistas) */}
            <div className="hidden items-center gap-1.5 rounded-lg bg-base-subtle p-1 sm:flex">
              {ROLES.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setRol(r.id)}
                  title={r.desc}
                  className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                    rol === r.id
                      ? "bg-agro-green/10 text-agro-green-deep ring-1 ring-agro-green/30"
                      : "text-ink-soft hover:bg-base-subtle hover:text-ink"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <div className="hidden items-center gap-2.5 rounded-lg border border-agro-border bg-base-subtle/60 py-1.5 pl-1.5 pr-3 sm:flex">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-agro-green/15 text-xs font-bold text-agro-green-deep">
              EL
            </div>
            <span className="text-xs font-medium text-ink-soft">{rolLabel}</span>
          </div>
          </div>
        </header>

        <main key={rol} className="animate-fade-in-up flex-1 p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};