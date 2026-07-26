"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/dashboard/Sidebar";
import TopBar from "@/components/dashboard/TopBar";
import StatsCard from "@/components/dashboard/StatsCard";
import CaseCard from "@/components/dashboard/CaseCard";
import Timeline from "@/components/dashboard/TimeLine";
import QuickActions from "@/components/dashboard/QuickActions";
import { AnimatedGradient } from "@/components/animations/AnimatedGradient";
import AuthModal from "@/components/security/AuthModal";

export interface CaseData {
  id: string;
  title: string;
  service_type: string;
  status: "submitted" | "active" | "completed" | "archived" | "cancelled";
  progress: number;
  description?: string;
  estimated_price?: number;
  final_price?: number;
  assigned_to?: string;
  created_at: string;
}

const initialCases: CaseData[] = [
  {
    id: "case-001",
    title: "External threat assessment",
    service_type: "osint",
    status: "active",
    progress: 68,
    created_at: "2026-07-24T10:00:00.000Z",
  },
  {
    id: "case-002",
    title: "Evidence preservation review",
    service_type: "forensics",
    status: "completed",
    progress: 100,
    created_at: "2026-07-20T09:30:00.000Z",
  },
];

export default function Dashboard() {
  const [cases, setCases] = useState<CaseData[]>(initialCases);
  const [user, setUser] = useState<{ username?: string; email?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");

  useEffect(() => {
    async function loadDashboard() {
      try {
        const auth = await fetch("/api/auth/me", { credentials: "include" });

        if (!auth.ok) {
          setUser(null);
          setAuthOpen(true);
          setAuthMode("login");
          return;
        }

        const authData = await auth.json();
        setUser(authData.user ?? null);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center font-mono">
        INITIALIZING SECURE CLIENT PORTAL...
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050505] text-white">
      <div className="fixed inset-0 pointer-events-none">
        <AnimatedGradient />
        <div className="absolute inset-0 bg-black/40" />
      </div>

      <div className="relative z-10 flex min-h-screen">
        <Sidebar />

        <div className="flex-1 lg:ml-64">
          <TopBar />

          <main className="p-6 space-y-8">
            <div>
              <h1 className="text-3xl font-bold">
                Welcome {user?.username || "Guest"}
              </h1>
              <p className="text-white/50 mt-2">
                ShadowNode secure intelligence operations portal
              </p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatsCard title="Total Cases" value={cases.length.toString()} />
              <StatsCard
                title="Active"
                value={cases.filter((c) => c.status === "active").length.toString()}
              />
              <StatsCard
                title="Completed"
                value={cases.filter((c) => c.status === "completed").length.toString()}
              />
              <StatsCard title="Messages" value="0" />
            </div>

            <section>
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-xl font-semibold">Investigations</h2>

                <button className="bg-primary px-4 py-2 rounded-lg text-black">
                  New Request
                </button>
              </div>

              {cases.length === 0 ? (
                <p className="text-white/40">No investigations found.</p>
              ) : (
                <div className="space-y-4">
                  {cases.map((item) => (
                    <CaseCard key={item.id} caseData={item} />
                  ))}
                </div>
              )}
            </section>

            <div className="grid lg:grid-cols-2 gap-6">
              <Timeline />
              <QuickActions />
            </div>
          </main>
        </div>
      </div>

      <AuthModal
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
        initialMode={authMode}
      />
    </div>
  );
}