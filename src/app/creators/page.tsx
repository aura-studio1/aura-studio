"use client";

import { useLanguage } from "@/components/LanguageProvider";
import Link from "next/link";
import { ArrowLeft, Sparkles, Share2, Link as LinkIcon, ExternalLink, Star } from "lucide-react";
import { useEffect, useState, useRef } from "react";

export default function CreatorsPage() {
  const { t, lang, setLang } = useLanguage();
  const [creators, setCreators] = useState<any[]>([]);
  const [visibleCards, setVisibleCards] = useState<Set<number>>(new Set());
  const cardRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    fetch('/api/creators')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setCreators(data);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = cardRefs.current.indexOf(entry.target as HTMLElement);
            if (index !== -1) {
              setVisibleCards((prev) => new Set([...prev, index]));
            }
          }
        });
      },
      { threshold: 0.1 }
    );

    cardRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, [creators]);

  return (
    <div className="min-h-screen bg-[#06040A] text-white font-sans overflow-x-hidden selection:bg-[#7e22ce] selection:text-white relative">
      {/* Ambient Orbs */}
      <div className="orb orb-purple w-[500px] h-[500px] top-[-15%] left-[-10%] animate-pulse-glow" />
      <div className="orb orb-blue w-[400px] h-[400px] bottom-[-10%] right-[-10%] animate-pulse-glow" style={{ animationDelay: "2s" }} />
      <div className="orb orb-gold w-[300px] h-[300px] top-[50%] left-[30%] animate-pulse-glow" style={{ animationDelay: "3s" }} />

      {/* Floating Glass Orbs */}
      <div className="fixed top-[30%] right-[8%] w-16 h-16 rounded-full glass opacity-20 animate-float z-0 pointer-events-none" />
      <div className="fixed bottom-[20%] left-[10%] w-12 h-12 rounded-full glass opacity-15 animate-float-delay z-0 pointer-events-none" />

      {/* NAVBAR */}
      <nav className="fixed top-0 left-0 w-full z-50 border-b border-white/5 bg-[#06040A]/60 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between relative z-10">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition font-semibold text-sm group">
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> {lang === 'th' ? 'กลับหน้าแรก' : 'Back Home'}
            </Link>
            <div className="w-px h-6 bg-white/10 hidden md:block" />
            <div className="hidden md:flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#ddbc76] to-[#aa8323] flex items-center justify-center">
                <span className="font-black text-black text-sm">A</span>
              </div>
              <span className="font-bold tracking-widest text-sm text-gradient-gold">AURA</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex glass rounded-full p-1">
              <button 
                onClick={() => setLang("th")}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${lang === 'th' ? 'btn-primary shadow-lg' : 'text-gray-400 hover:text-white'}`}
              >
                TH
              </button>
              <button 
                onClick={() => setLang("en")}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${lang === 'en' ? 'btn-primary shadow-lg' : 'text-gray-400 hover:text-white'}`}
              >
                EN
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="relative z-10 pt-40 pb-32 px-6 max-w-7xl mx-auto flex flex-col items-center text-center">
        
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full glass-gold text-[#ddbc76] text-xs font-bold tracking-widest uppercase animate-fade-in-up">
          <Sparkles className="w-3 h-3" /> WALL OF LOVE
        </div>

        {/* Title */}
        <div className="relative animate-fade-in-up stagger-1" style={{ opacity: 0 }}>
           <div className="absolute inset-0 blur-[100px] opacity-40 bg-gradient-to-r from-transparent via-[#ddbc76] to-transparent pointer-events-none" />
           <h1 className="mt-8 text-5xl md:text-7xl font-black mb-6 tracking-tight relative z-10">
             <span className="text-transparent bg-clip-text bg-gradient-to-br from-[#f3d99f] via-[#ddbc76] to-[#8a681c] drop-shadow-[0_0_30px_rgba(221,188,118,0.3)]">
               {t("creators.title")}
             </span>
           </h1>
        </div>
        <p className="text-gray-400 max-w-2xl mx-auto text-lg md:text-xl mb-24 animate-fade-in-up stagger-2 leading-relaxed" style={{ opacity: 0 }}>
          {t("creators.desc")}
        </p>

        {/* Creator Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-12 max-w-5xl mx-auto w-full relative z-10 pb-20">
          {creators.map((creator, i) => {
            const isEven = i % 2 === 0;
            return (
              <a
                href={creator.tiktok_url}
                target="_blank"
                rel="noopener noreferrer"
                key={creator.id}
                ref={(el) => { cardRefs.current[i] = el; }}
                className={`p-4 md:p-6 rounded-[32px] ${creator.glow_class} 
                  transition-all duration-700 group relative overflow-hidden block
                  ${visibleCards.has(i) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-16'}
                  hover:-translate-y-3 hover:scale-[1.02]
                  ${!isEven ? 'md:mt-16' : ''}
                `}
                style={{ 
                  transitionDelay: `${(i % 2) * 150}ms`,
                  boxShadow: `0 20px 40px -20px ${creator.color}40`,
                  border: `1px solid ${creator.color}20`
                }}
              >
                {/* Ambient background glow inside the card */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
                  style={{ background: `radial-gradient(circle at 50% 0%, ${creator.color}20, transparent 70%)` }}
                />
                
                {/* Image Container */}
                <div className="w-full relative rounded-[20px] overflow-hidden border border-white/5 group-hover:border-white/20 transition-all duration-500 bg-[#0A0710] shadow-2xl">
                   
                   {/* Gradient overlay at bottom to blend image into card */}
                   <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#0A0710] to-transparent z-10 pointer-events-none opacity-80 group-hover:opacity-30 transition-opacity duration-700" />

                   <img 
                      src={creator.image_url} 
                      alt="TikTok Profile" 
                      className="w-full h-auto object-cover group-hover:scale-110 transition-transform duration-[1.5s] ease-out brightness-90 group-hover:brightness-110"
                   />
                   
                   {/* Floating Button on hover */}
                   <div className="absolute inset-0 z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 pointer-events-none">
                      <div className="flex items-center gap-2 px-6 py-3 rounded-full bg-black/60 backdrop-blur-md border border-white/20 shadow-[0_0_40px_rgba(255,255,255,0.2)] text-white scale-75 group-hover:scale-100 transition-transform duration-500 ease-out delay-75">
                         <span className="font-bold tracking-widest text-sm uppercase text-shadow">Visit Channel</span>
                         <ExternalLink className="w-4 h-4" />
                      </div>
                   </div>
                   
                   {/* Corner Accent */}
                   <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 z-10 pointer-events-none mix-blend-overlay" />
                </div>
              </a>
            );
          })}
        </div>

        {/* CTA */}
        <div className="mt-32 p-12 rounded-[32px] glass-card max-w-4xl w-full relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#ddbc76]/30 to-transparent" />
          <h2 className="text-3xl font-black mb-4">พร้อมเข้าร่วมกับครีเอเตอร์ระดับท็อปหรือยัง?</h2>
          <p className="text-gray-400 mb-8">สัมผัสความต่างของวิดีโอ 60fps ด้วยตัวคุณเองตั้งแต่วันนี้</p>
          <Link href="/">
            <button className="px-10 py-4 rounded-full btn-gold text-lg">
              กลับไปหน้าแรกเพื่อทดลองใช้งาน
            </button>
          </Link>
        </div>

      </main>

      {/* Footer */}
      <footer className="py-16 px-6 border-t border-white/5 relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#ddbc76] to-[#aa8323] flex items-center justify-center">
              <span className="font-black text-black text-sm">A</span>
            </div>
            <span className="font-bold tracking-widest text-sm text-gradient-gold">AURA STUDIO</span>
          </div>
          <p className="text-gray-500 text-xs">© 2026 AURA Studio. {lang === 'th' ? 'สงวนลิขสิทธิ์ทุกประการ' : 'All rights reserved.'}</p>
        </div>
      </footer>
    </div>
  );
}
