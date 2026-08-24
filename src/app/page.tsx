"use client";

import { useSession, signOut } from "next-auth/react";
import Dashboard from "@/components/Dashboard";
import LandingPage from "@/components/LandingPage";
import MaintenancePage from "@/components/MaintenancePage";
import { Loader2 } from "lucide-react";

const ADMIN_ID = process.env.NEXT_PUBLIC_ADMIN_DISCORD_ID;

export default function Home() {
  const { data: session, status } = useSession();

  // Maintenance Mode Check
  const isMaintenance = process.env.NEXT_PUBLIC_MAINTENANCE === "true";
  
  if (isMaintenance) {
    // Admin can still bypass maintenance mode
    // @ts-ignore
    const userId = session?.user?.id;
    if (status === "loading") {
      // Show maintenance while checking if user is admin
      return <MaintenancePage />;
    }
    if (!userId || userId !== ADMIN_ID) {
      return <MaintenancePage />;
    }
    // Admin bypasses maintenance - fall through to normal flow
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#06040A]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-[#ddbc76] to-[#aa8323] rounded-2xl flex items-center justify-center glow-gold animate-pulse">
            <span className="text-2xl font-black text-black">A</span>
          </div>
          <Loader2 className="w-6 h-6 text-[#ddbc76] animate-spin" />
        </div>
      </div>
    );
  }

  return <LandingPage />;
}
