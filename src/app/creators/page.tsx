"use client";

import { useLanguage } from "@/components/LanguageProvider";
import Link from "next/link";
import { ArrowLeft, Sparkles, Share2, Link as LinkIcon, ExternalLink, Star } from "lucide-react";
import { useEffect, useState, useRef } from "react";

const creators = [
  {
    name: "ฟาราฟลุ๊คกี้",
    handle: "falafloukgie",
    initial: "F",
    color: "#ddbc76",
    glowClass: "glass-gold",
    following: "81",
    followers: "39.6K",
    likes: "3.2M",
    tiktok: "https://www.tiktok.com/@falafloukgie",
    bio: <><span>@เอม ✨ 🧸</span><br/><span>ตัดคลิป ~~ Dm</span></>,
    link: { text: "e-z.bio/falafloukgie", href: "#" },
  },
  {
    name: "SUPER-PIGGG",
    handle: "teentuner",
    initial: "T",
    color: "#3b82f6",
    glowClass: "glass-card",
    following: "270",
    followers: "2035",
    likes: "51.9K",
    tiktok: "https://www.tiktok.com/@teentuner",
    bio: <><span>120 FPS</span><br/><span>D M</span><br/><span>⬇️โดเนทขึ้นจอ⬇️</span></>,
    link: { text: "ezdn.app/teentuner", href: "#" },
  },
  {
    name: "LEX.JANACK.",
    handle: "saran14323",
    initial: "S",
    color: "#7e22ce",
    glowClass: "glass-purple",
    following: "122",
    followers: "1650",
    likes: "117.8K",
    tiktok: "https://www.tiktok.com/@saran14323",
    bio: <span>LEX DIWA 🔥🔥</span>,
    link: null,
  },
];

export default function CreatorsPage() {
  const { t, lang, setLang } = useLanguage();
  const [visibleCards, setVisibleCards] = useState<Set<number>>(new Set());
  const cardRefs = useRef<(HTMLElement | null)[]>([]);

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
      { threshold: 0.2 }
    );

    cardRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, []);

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
        <h1 className="mt-8 text-4xl md:text-6xl font-black mb-6 animate-fade-in-up stagger-1" style={{ opacity: 0 }}>
          <span className="text-gradient-gold">{t("creators.title")}</span>
        </h1>
        <p className="text-gray-400 max-w-2xl mx-auto text-base md:text-lg mb-20 animate-fade-in-up stagger-2" style={{ opacity: 0 }}>
          {t("creators.desc")}
        </p>

        {/* Creator Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-7xl mx-auto w-full">
          {creators.map((creator, i) => (
            <div
              key={creator.handle}
              ref={(el) => { cardRefs.current[i] = el; }}
              className={`flex flex-col md:flex-row items-center md:items-start gap-6 lg:gap-8 p-8 rounded-[28px] ${creator.glowClass} 
                hover:shadow-[0_0_50px_${creator.color}20] transition-all duration-500 group relative overflow-hidden
                ${visibleCards.has(i) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}
                ${i === creators.length - 1 && creators.length % 2 !== 0 ? 'lg:col-span-2 xl:col-span-1' : ''}
              `}
              style={{ transitionDuration: '700ms', transitionDelay: `${i * 150}ms` }}
            >
              {/* Hover Glow */}
              <div className="absolute top-0 right-0 w-[300px] h-[300px] rounded-full opacity-0 group-hover:opacity-100 blur-[80px] pointer-events-none transition-opacity duration-500"
                style={{ background: `radial-gradient(circle, ${creator.color}15, transparent)` }}
              />
              
              {/* Avatar */}
              <div className="w-24 h-24 md:w-32 md:h-32 shrink-0 relative group-hover:scale-105 transition-transform duration-500">
                <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500"
                  style={{ background: `radial-gradient(circle, ${creator.color}40, transparent)` }}
                />
                <div className="w-full h-full rounded-full border-[3px] border-white/10 group-hover:border-white/20 relative z-10 flex items-center justify-center bg-gradient-to-br from-[#1A1525] to-[#0A0710] overflow-hidden shadow-lg transition-all duration-300">
                  <div className="absolute inset-0 blur-xl rounded-full" style={{ background: `${creator.color}15` }} />
                  <span className="text-4xl md:text-5xl font-black drop-shadow-lg relative z-10"
                    style={{ color: creator.color }}
                  >
                    {creator.initial}
                  </span>
                </div>
              </div>
              
              {/* Info */}
              <div className="flex-1 text-center md:text-left relative z-10 w-full">
                 <div className="flex flex-col xl:flex-row items-center gap-2 xl:gap-3 mb-3">
                    <h2 className="text-2xl md:text-3xl font-bold text-white whitespace-nowrap">{creator.name}</h2>
                    <span className="hidden xl:inline text-white/20">|</span>
                    <span className="text-sm md:text-base text-white/80 font-semibold transition-colors"
                      style={{ color: undefined }}
                    >
                      {creator.handle}
                    </span>
                 </div>
                 
                 <div className="flex items-center justify-center md:justify-start gap-4 mb-5 text-white/80 text-sm whitespace-nowrap">
                    <div><strong className="text-white text-base">{creator.following}</strong> กำลังติดตาม</div>
                    <div><strong className="text-white text-base">{creator.followers}</strong> ผู้ติดตาม</div>
                    <div><strong className="text-white text-base">{creator.likes}</strong> ถูกใจ</div>
                 </div>

                 <div className="flex items-center justify-center md:justify-start gap-3 mb-5">
                    <a href={creator.tiktok} target="_blank" rel="noopener noreferrer" 
                      className="px-6 py-2.5 font-bold rounded-xl transition-all duration-300 flex items-center gap-2 text-sm whitespace-nowrap hover:-translate-y-0.5"
                      style={{ 
                        background: i === 0 ? '#ddbc76' : 'rgba(255,255,255,0.08)',
                        color: i === 0 ? 'black' : 'white',
                        border: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.1)',
                        boxShadow: i === 0 ? '0 0 20px rgba(221,188,118,0.3)' : 'none',
                      }}
                    >
                       เข้าสู่หน้า TikTok <ExternalLink className="w-4 h-4" />
                    </a>
                    <button className="w-10 h-10 rounded-xl btn-glass flex items-center justify-center shrink-0">
                      <Share2 className="w-4 h-4 text-white" />
                    </button>
                 </div>

                 <div className="text-sm text-gray-300 leading-relaxed text-left max-w-lg mx-auto md:mx-0">
                    {creator.bio}
                    {creator.link && (
                      <a href={creator.link.href} className="font-bold flex items-center gap-1.5 mt-2 hover:text-[#ddbc76] transition w-fit text-white">
                        <LinkIcon className="w-3 h-3"/> {creator.link.text}
                      </a>
                    )}
                 </div>
              </div>
            </div>
          ))}
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
