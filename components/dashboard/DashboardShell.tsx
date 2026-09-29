"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import type { AppUser } from "@/lib/auth";
import { ClientNotificationProvider } from "@/components/notifications/ClientNotificationProvider";

import Header from "./Header";
import Sidebar from "./Sidebar";

export default function DashboardShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: AppUser;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const contentRef = useRef<HTMLElement>(null);

  const pathname = usePathname();

  function handleSidebarClose() {
    setSidebarOpen(false);
  }

  useEffect(() => {
    setSidebarOpen(false);
    contentRef.current?.scrollTo({ top: 0, left: 0 });
  }, [pathname]);

  return (
    <ClientNotificationProvider>
      <div
        data-dashboard-shell
        className="fixed inset-0 z-10 h-dvh w-full overflow-hidden bg-transparent text-white"
      >
        <div className="relative flex h-full overflow-hidden">
          <Sidebar
            user={user}
            open={sidebarOpen}
            onClose={handleSidebarClose}
          />

          <div className="flex min-h-0 min-w-0 flex-1 flex-col lg:pl-72">
            <Header
              user={user}
              sidebarOpen={sidebarOpen}
              onMenuClick={() => setSidebarOpen(true)}
            />

            <main
              ref={contentRef}
              data-dashboard-content
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
            >
              <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                {children}
              </div>
            </main>
          </div>
        </div>
      </div>
    </ClientNotificationProvider>
  );
}
