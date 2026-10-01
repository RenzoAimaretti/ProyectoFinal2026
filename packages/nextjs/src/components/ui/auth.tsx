"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { clearAuth, getStoredUser, getToken, type AuthUser } from "@/api/client";

/**
 * Reads the session persisted in localStorage (client-side only).
 * `ready` is false until the browser storage has been read, so guards do not
 * redirect during hydration.
 */
export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- one-time client hydration of the session persisted in localStorage; server render has no access to it */
    setUser(getStoredUser());
    setReady(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const logout = useCallback(() => {
    clearAuth();
    setUser(null);
    if (typeof window !== "undefined") window.location.href = "/login";
  }, []);

  return {
    user,
    ready,
    isAuthenticated: ready && Boolean(user && getToken()),
    logout,
  };
}

/**
 * Guard for protected areas. Redirects unauthenticated users to /login and
 * preserves the intended path in ?next=.
 */
export function useRequireAuth(): { user: AuthUser | null; ready: boolean } {
  const { user, ready, isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!ready || isAuthenticated) return;
    const next = pathname ? `?next=${encodeURIComponent(pathname)}` : "";
    router.replace(`/login${next}`);
  }, [ready, isAuthenticated, pathname, router]);

  return { user, ready };
}
