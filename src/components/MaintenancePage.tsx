"use client";

import { Sparkles, Clock, Wrench } from "lucide-react";

export default function MaintenancePage() {
  return (
    <div className="min-h-screen bg-[#06040A] text-white font-sans flex items-center justify-center relative overflow-hidden">
      {/* Ambient Orbs */}
      <div className="orb orb-purple w-[500px] h-[500px] top-[-20%] left-[-10%] animate-pulse-glow" />
      <div className="orb orb-blue w-[400px] h-[400px] bottom-[-20%] right-[-10%] animate-pulse-glow" style={{ animationDelay: "2s" }} />

      {/* Floating Glass Orbs */}
      <div className="absolute top-[25%] left-[15%] w-16 h-16 rounded-full glass opacity-20 animate-float pointer-events-none" />
      <div className="absolute bottom-[30%] right-[12%] w-12 h-12 rounded-full glass opacity-15 animate-float-delay pointer-events-none" />

      <div className="relative z-10 text-center px-6 max-w-2xl mx-auto">
        {/* Icon */}
        <div className="w-24 h-24 glass-gold rounded-3xl flex items-center justify-center mx-auto mb-8 glow-gold animate-float">
          <Wrench className="w-10 h-10 text-[#ddbc76]" />
        </div>

        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-purple text-[#a78bfa] text-xs font-bold tracking-widest uppercase mb-6">
          <Clock className="w-3 h-3" /> MAINTENANCE MODE
        </div>

        {/* Title */}
        <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tight">
          <span className="text-gradient-gold">ระบบกำลังอัปเกรด</span>
        </h1>
        
        <p className="text-gray-400 text-base md:text-lg mb-8 leading-relaxed">
          เรากำลังปรับปรุงระบบเพื่อมอบประสบการณ์ที่ดีขึ้นให้กับคุณ<br/>
          กรุณากลับมาใหม่ในอีกสักครู่ ขออภัยในความไม่สะดวกครับ
        </p>

        <div className="glass-card rounded-2xl p-6 inline-flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-[#ddbc76]" />
          <span className="text-sm text-gray-300 font-medium">We'll be back soon — ขอบคุณที่รอครับ 🙏</span>
        </div>
      </div>
    </div>
  );
}
