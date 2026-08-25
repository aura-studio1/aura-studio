"use client";

import { useLanguage } from "@/components/LanguageProvider";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, AlertTriangle, XCircle, Activity, Clock } from "lucide-react";
import { useEffect, useState } from "react";

type StatusItem = {
  id: string;
  name: string;
  status: 'online' | 'maintenance' | 'offline';
  updated_at: string;
};

export default function StatusPage() {
  const { t, lang, setLang } = useLanguage();
  const [statuses, setStatuses] = useState<StatusItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/status')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setStatuses(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const getStatusConfig = (status: string) => {
    switch(status) {
      case 'online':
        return { icon: <CheckCircle2 className="w-5 h-5" />, color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/30', label: lang === 'th' ? 'ใช้งานปกติ' : 'Operational' };
      case 'maintenance':
        return { icon: <AlertTriangle className="w-5 h-5" />, color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', label: lang === 'th' ? 'กำลังปรับปรุง' : 'Maintenance' };
      case 'offline':
        return { icon: <XCircle className="w-5 h-5" />, color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/30', label: lang === 'th' ? 'ระบบล่ม' : 'Offline' };
      default:
        return { icon: <Activity className="w-5 h-5" />, color: 'text-gray-500', bg: 'bg-gray-500/10', border: 'border-gray-500/30', label: 'Unknown' };
    }
  };

  const isAllOnline = statuses.every(s => s.status === 'online');

  return (
    <div className="min-h-screen bg-[#06040A] text-white font-sans overflow-x-hidden selection:bg-[#7e22ce] selection:text-white relative">
      {/* Ambient Orbs */}
      <div className="orb orb-purple w-[500px] h-[500px] top-[-15%] left-[-10%] animate-pulse-glow" />
      <div className="orb orb-blue w-[400px] h-[400px] bottom-[-10%] right-[-10%] animate-pulse-glow" style={{ animationDelay: "2s" }} />

      {/* NAVBAR */}
      <nav className="fixed top-0 left-0 w-full z-50 border-b border-white/5 bg-[#06040A]/60 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between relative z-10">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition font-semibold text-sm group">
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> {lang === 'th' ? 'กลับหน้าแรก' : 'Back Home'}
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex glass rounded-full p-1">
              <button onClick={() => setLang("th")} className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${lang === 'th' ? 'btn-primary shadow-lg' : 'text-gray-400 hover:text-white'}`}>TH</button>
              <button onClick={() => setLang("en")} className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${lang === 'en' ? 'btn-primary shadow-lg' : 'text-gray-400 hover:text-white'}`}>EN</button>
            </div>
          </div>
        </div>
      </nav>

      <main className="relative z-10 pt-40 pb-32 px-6 max-w-4xl mx-auto flex flex-col items-center">
        
        {/* Header */}
        <div className="text-center mb-16 animate-fade-in-up">
           <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/5 border border-white/10 text-white text-xs font-bold tracking-widest uppercase mb-6">
             <Activity className="w-3 h-3 text-blue-400" /> SYSTEM STATUS
           </div>
           <h1 className="text-4xl md:text-5xl font-black mb-6 tracking-tight">
             {lang === 'th' ? 'สถานะการทำงานของระบบ' : 'System Status'}
           </h1>
           <p className="text-gray-400 text-lg">
             {lang === 'th' ? 'ตรวจสอบสถานะโปรแกรมและบริการต่างๆ ของ AURA ได้ที่นี่' : 'Check the operational status of all AURA services here.'}
           </p>
        </div>

        {/* Global Status Banner */}
        {loading ? (
           <div className="w-full h-24 rounded-2xl bg-white/5 animate-pulse mb-12" />
        ) : (
           <div className={`w-full p-6 md:p-8 rounded-[24px] mb-12 flex items-center justify-between border ${isAllOnline ? 'bg-green-500/10 border-green-500/30' : 'bg-yellow-500/10 border-yellow-500/30'} animate-fade-in-up stagger-1`}>
              <div>
                 <h2 className={`text-2xl font-black mb-2 ${isAllOnline ? 'text-green-400' : 'text-yellow-400'}`}>
                   {isAllOnline 
                     ? (lang === 'th' ? 'ระบบทั้งหมดทำงานปกติ' : 'All Systems Operational')
                     : (lang === 'th' ? 'มีบางระบบกำลังปรับปรุง' : 'Some Systems are under Maintenance')}
                 </h2>
                 <p className="text-sm text-gray-300">
                   {lang === 'th' ? 'อัปเดตสถานะล่าสุดแบบเรียลไทม์' : 'Status updated in real-time'}
                 </p>
              </div>
              {isAllOnline ? <CheckCircle2 className="w-12 h-12 text-green-400" /> : <AlertTriangle className="w-12 h-12 text-yellow-400" />}
           </div>
        )}

        {/* Status List */}
        <div className="w-full space-y-4 animate-fade-in-up stagger-2">
           {statuses.map(item => {
              const config = getStatusConfig(item.status);
              const date = new Date(item.updated_at);
              const timeString = date.toLocaleTimeString(lang === 'th' ? 'th-TH' : 'en-US', { hour: '2-digit', minute: '2-digit' });
              
              return (
                 <div key={item.id} className="p-6 rounded-2xl bg-[#0A0710]/80 backdrop-blur-md border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg hover:border-white/10 transition-colors">
                    <div>
                       <h3 className="text-lg font-bold text-white mb-1">{item.name}</h3>
                       <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                          <Clock className="w-3 h-3" />
                          {lang === 'th' ? 'อัปเดตล่าสุด:' : 'Last updated:'} {timeString}
                       </div>
                    </div>
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${config.bg} ${config.border} ${config.color} font-bold text-sm shrink-0`}>
                       {config.icon}
                       {config.label}
                    </div>
                 </div>
              );
           })}
           {!loading && statuses.length === 0 && (
              <div className="p-8 text-center text-gray-500 bg-white/5 rounded-2xl border border-white/5 border-dashed">
                 No status data found.
              </div>
           )}
        </div>

      </main>
    </div>
  );
}
