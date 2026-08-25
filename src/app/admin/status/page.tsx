"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { ArrowLeft, Activity, CheckCircle2, AlertTriangle, XCircle, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type StatusItem = {
  id: string;
  name: string;
  status: 'online' | 'maintenance' | 'offline';
  updated_at: string;
};

export default function StatusAdmin() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const [statuses, setStatuses] = useState<StatusItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    // @ts-ignore
    if (authStatus === "unauthenticated" || (authStatus === "authenticated" && session?.user?.role !== "partner")) {
      router.push("/");
    } else if (authStatus === "authenticated") {
      fetchStatuses();
    }
  }, [authStatus, session]);

  const fetchStatuses = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/status");
      const data = await res.json();
      if (Array.isArray(data)) setStatuses(data);
    } catch (error) {
      console.error("Failed to fetch", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    setUpdating(id);
    try {
      const res = await fetch("/api/status", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });
      if (res.ok) {
        const updated = await res.json();
        setStatuses(statuses.map(s => s.id === id ? updated : s));
      } else {
         alert("Failed to update status");
      }
    } catch (error) {
      console.error("Update failed", error);
    } finally {
      setUpdating(null);
    }
  };

  if (loading || authStatus === "loading") {
    return <div className="min-h-screen bg-[#06040A] flex items-center justify-center text-white"><RefreshCw className="w-8 h-8 animate-spin text-[#ddbc76]" /></div>;
  }

  return (
    <div className="min-h-screen bg-[#06040A] text-white p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-12">
          <div>
            <Link href="/" className="text-gray-400 hover:text-white flex items-center gap-2 mb-2 text-sm transition-colors">
              <ArrowLeft className="w-4 h-4" /> กลับหน้าแรก
            </Link>
            <h1 className="text-3xl md:text-4xl font-black flex items-center gap-3">
               <Activity className="w-8 h-8 text-blue-400" /> ระบบจัดการสถานะเซิร์ฟเวอร์
            </h1>
            <p className="text-gray-400 mt-2">เปิด-ปิด โหมดปรับปรุง (Maintenance) ได้จากที่นี่</p>
          </div>
          
          <Link href="/status" target="_blank" className="px-6 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors font-bold text-sm">
             ดูหน้าเว็บจริง
          </Link>
        </div>

        <div className="space-y-6">
          {statuses.map((s) => (
            <div key={s.id} className="p-6 md:p-8 rounded-2xl bg-[#0A0710] border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
               <div>
                  <h3 className="text-xl font-bold text-white mb-1">{s.name}</h3>
                  <p className="text-sm text-gray-500 font-mono">ID: {s.id}</p>
               </div>
               
               <div className="flex flex-wrap items-center gap-3 bg-black/50 p-2 rounded-xl border border-white/5">
                  <button 
                     disabled={updating === s.id}
                     onClick={() => handleUpdateStatus(s.id, 'online')}
                     className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${s.status === 'online' ? 'bg-green-500/20 text-green-400 border border-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.2)]' : 'text-gray-500 hover:bg-white/5 hover:text-white border border-transparent'}`}
                  >
                     <CheckCircle2 className="w-4 h-4" /> Online
                  </button>
                  
                  <button 
                     disabled={updating === s.id}
                     onClick={() => handleUpdateStatus(s.id, 'maintenance')}
                     className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${s.status === 'maintenance' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.2)]' : 'text-gray-500 hover:bg-white/5 hover:text-white border border-transparent'}`}
                  >
                     <AlertTriangle className="w-4 h-4" /> Maintenance
                  </button>
                  
                  <button 
                     disabled={updating === s.id}
                     onClick={() => handleUpdateStatus(s.id, 'offline')}
                     className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${s.status === 'offline' ? 'bg-red-500/20 text-red-400 border border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'text-gray-500 hover:bg-white/5 hover:text-white border border-transparent'}`}
                  >
                     <XCircle className="w-4 h-4" /> Offline
                  </button>
               </div>
            </div>
          ))}
          {statuses.length === 0 && (
             <div className="p-12 text-center border border-white/5 border-dashed rounded-2xl text-gray-500">
                ยังไม่มีข้อมูลสถานะ หรือสร้างตารางใน Supabase ไม่สำเร็จ
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
