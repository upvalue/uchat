import { createRootRoute, Outlet, useNavigate, useMatchRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Sidebar } from "../components/Sidebar";
import { ChannelSwitcher } from "../components/ChannelSwitcher";
import { MobileHeader } from "../components/MobileHeader";
import { getConfig } from "../lib/config";
import { useUnread } from "../lib/useUnread";

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  const navigate = useNavigate();
  const config = getConfig();
  const { totalUnread } = useUnread();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const matchRoute = useMatchRoute();

  useEffect(() => {
    if (!config?.username) {
      navigate({ to: "/config" });
    }
  }, [config, navigate]);

  // Update document title with unread count
  useEffect(() => {
    const base = document.title.replace(/^\(\d+\+?\)\s*/, "");
    document.title = totalUnread > 0 ? `(${totalUnread}) ${base}` : base;
  }, [totalUnread]);

  // Close mobile sidebar on route change
  const roomMatch = matchRoute({ to: "/rooms/$room", params: {} as any });
  const configMatch = matchRoute({ to: "/config" });
  const routeKey = roomMatch ? JSON.stringify(roomMatch) : configMatch ? "config" : "index";

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [routeKey]);

  const toggleMobileSidebar = useCallback(() => {
    setMobileSidebarOpen((prev) => !prev);
  }, []);

  const closeMobileSidebar = useCallback(() => {
    setMobileSidebarOpen(false);
  }, []);

  return (
    <div className="flex h-screen flex-col bg-background text-foreground font-mono">
      {/* Mobile header - visible only on small screens */}
      {config?.username && (
        <MobileHeader
          sidebarOpen={mobileSidebarOpen}
          onToggleSidebar={toggleMobileSidebar}
        />
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop sidebar - always visible on md+ */}
        {config?.username && (
          <div className="hidden md:flex">
            <Sidebar />
          </div>
        )}

        {/* Mobile sidebar overlay */}
        {config?.username && mobileSidebarOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/60 md:hidden animate-in fade-in-0"
              onClick={closeMobileSidebar}
            />
            <div className="fixed inset-y-0 left-0 z-50 w-64 md:hidden animate-in slide-in-from-left-2 duration-200">
              <Sidebar onNavigate={closeMobileSidebar} />
            </div>
          </>
        )}

        {config?.username && <ChannelSwitcher />}

        <main className="flex flex-1 flex-col overflow-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
