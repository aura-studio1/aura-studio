"use client";

import { signIn, useSession } from "next-auth/react";
import { ArrowRight, Sparkles, Zap, ShieldCheck, Globe, ChevronDown, Star, Users, Timer } from "lucide-react";
import { useLanguage } from "./LanguageProvider";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";

// Particle component
function Particles() {
  return (
    <div className="fixed inset-0 pointer-events-none z-[1] overflow-hidden">
      {Array.from({ length: 20 }).map((_, i) => (
        <div
          key={i}
          className="particle"
          style={{
            left: `${Math.random() * 100}%`,
            bottom: `-5%`,
            animationDuration: `${8 + Math.random() * 12}s`,
            animationDelay: `${Math.random() * 10}s`,
            width: `${1 + Math.random() * 3}px`,
            height: `${1 + Math.random() * 3}px`,
            opacity: 0.3 + Math.random() * 0.5,
          }}
        />
      ))}
    </div>
  );
}

export default function LandingPage() {
  const { data: session } = useSession();
  const { t, lang, setLang } = useLanguage();
  const [scrollY, setScrollY] = useState(0);
  const [visibleSections, setVisibleSections] = useState<Set<string>>(new Set());
  const sectionRefs = useRef<{ [key: string]: HTMLElement | null }>({});
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleMouse = (e: MouseEvent) => {
      setMousePos({ x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight });
    };
    window.addEventListener("mousemove", handleMouse, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouse);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisibleSections((prev) => new Set([...prev, entry.target.id]));
          }
        });
      },
      { threshold: 0.1 }
    );
    Object.values(sectionRefs.current).forEach((ref) => {
      if (ref) observer.observe(ref);
    });
    return () => observer.disconnect();
  }, []);

  const isVisible = (id: string) => visibleSections.has(id);

  return (
    <div className="min-h-screen bg-[#06040A] text-white font-sans overflow-x-hidden selection:bg-[#7e22ce] selection:text-white relative mesh-bg noise">
      {/* Particles */}
      <Particles />

      {/* Grid Background */}
      <div className="fixed inset-0 grid-bg pointer-events-none z-0 opacity-50" />

      {/* Morphing Blobs - Interactive with mouse */}
      <div 
        className="blob w-[500px] h-[500px] top-[10%] left-[5%] bg-[#7e22ce] opacity-20"
        style={{ transform: `translate(${mousePos.x * 30}px, ${mousePos.y * 20}px)` }}
      />
      <div 
        className="blob w-[400px] h-[400px] top-[50%] right-[5%] bg-[#3b82f6] opacity-15"
        style={{ transform: `translate(${-mousePos.x * 20}px, ${mousePos.y * 15}px)`, animationDelay: '3s' }}
      />
      <div 
        className="blob w-[300px] h-[300px] bottom-[10%] left-[30%] bg-[#ddbc76] opacity-10"
        style={{ transform: `translate(${mousePos.x * 15}px, ${-mousePos.y * 10}px)`, animationDelay: '5s' }}
      />

      {/* Floating Glass Spheres */}
      <div className="fixed top-[18%] left-[6%] w-24 h-24 rounded-full glass opacity-40 animate-float z-[2] pointer-events-none shadow-[inset_0_0_20px_rgba(126,34,206,0.2)]" />
      <div className="fixed top-[55%] right-[8%] w-16 h-16 rounded-full glass opacity-30 animate-float-delay z-[2] pointer-events-none shadow-[inset_0_0_15px_rgba(59,130,246,0.2)]" />
      <div className="fixed bottom-[20%] left-[12%] w-10 h-10 rounded-full glass opacity-25 animate-float-slow z-[2] pointer-events-none shadow-[inset_0_0_10px_rgba(221,188,118,0.2)]" />
      <div className="fixed top-[35%] right-[25%] w-6 h-6 rounded-full bg-[#ddbc76]/20 animate-float z-[2] pointer-events-none blur-[1px]" />
      <div className="fixed bottom-[40%] left-[35%] w-4 h-4 rounded-full bg-[#7e22ce]/30 animate-float-delay z-[2] pointer-events-none blur-[1px]" />

      {/* NAVBAR */}
      <nav className={`fixed top-0 left-0 w-full z-50 transition-all duration-500 ${
        scrollY > 50 
          ? 'bg-[#06040A]/70 backdrop-blur-2xl border-b border-white/5 shadow-[0_4px_30px_rgba(0,0,0,0.5)]' 
          : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#ddbc76] via-[#d4af37] to-[#aa8323] flex items-center justify-center shadow-[0_0_25px_rgba(221,188,118,0.4)] group-hover:shadow-[0_0_40px_rgba(221,188,118,0.6)] transition-all duration-500 group-hover:scale-110">
              <span className="font-black text-black text-xl">A</span>
            </div>
            <span className="font-bold tracking-widest text-lg text-gradient-gold">AURA</span>
          </div>
          
          <div className="flex items-center gap-3">
            <Link href="/creators" className="hidden md:flex items-center gap-2 px-4 py-2 rounded-full glass text-xs font-bold text-[#ddbc76] hover:border-[#ddbc76]/40 hover:bg-[#ddbc76]/10 transition-all duration-300 tracking-widest uppercase group">
              <Sparkles className="w-3 h-3 text-[#ddbc76] group-hover:animate-pulse" />
              {lang === 'th' ? 'ครีเอเตอร์' : 'Creators'}
            </Link>
            
            <div className="w-px h-6 bg-white/10 hidden md:block" />

            <div className="flex glass rounded-full p-1">
              <button onClick={() => setLang("th")}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-300 ${lang === 'th' ? 'btn-primary shadow-lg' : 'text-gray-400 hover:text-white'}`}
              >TH</button>
              <button onClick={() => setLang("en")}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-300 ${lang === 'en' ? 'btn-primary shadow-lg' : 'text-gray-400 hover:text-white'}`}
              >EN</button>
            </div>

            {session ? (
              <Link href="/workspace" className="flex items-center gap-2 px-6 py-2.5 rounded-full btn-gold text-black text-sm font-bold group">
                เข้าสู่ระบบบีบอัด <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            ) : (
              <button onClick={() => signIn("discord")}
                className="flex items-center gap-2 px-6 py-2.5 rounded-full btn-glass text-sm group"
              >
                {t("nav.login")} <ArrowRight className="w-4 h-4 text-[#ddbc76] group-hover:translate-x-1 transition-transform" />
              </button>
            )}
          </div>
        </div>
      </nav>

      <main className="relative z-10">
        {/* ====== HERO SECTION ====== */}
        <section className="min-h-screen pt-32 pb-20 px-6 max-w-7xl mx-auto flex flex-col items-center justify-center text-center relative">
          {/* Rotating ring decoration */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] md:w-[800px] md:h-[800px] rounded-full border border-white/[0.03] animate-rotate-slow pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] md:w-[600px] md:h-[600px] rounded-full border border-[#ddbc76]/[0.05] animate-rotate-slow pointer-events-none" style={{ animationDirection: 'reverse', animationDuration: '25s' }} />

          {/* Sweep line */}
          <div className="absolute top-1/2 left-0 right-0 hero-line" />

          {/* Badge */}
          <div className="animate-fade-in-up glass-purple px-5 py-2.5 rounded-full text-[#ddbc76] text-xs font-bold tracking-widest uppercase inline-flex items-center gap-2">
            <Sparkles className="w-3 h-3 text-[#3b82f6]" /> {t("hero.badge")}
          </div>
          
          {/* Title */}
          <h1 className="mt-10 text-6xl md:text-8xl lg:text-9xl font-black tracking-tighter leading-[0.9] animate-fade-in-up stagger-1" style={{ opacity: 0 }}>
            <span className="text-gradient-white">{t("hero.title")}</span><br/>
            <span className="text-gradient-gold drop-shadow-[0_0_40px_rgba(221,188,118,0.5)]">
              {t("hero.subtitle")}
            </span>
          </h1>

          {/* Subtitle / Discord CTA */}
          <div className="mt-8 flex flex-col items-center gap-4 animate-fade-in-up stagger-2" style={{ opacity: 0 }}>
            <p className="text-gray-400 max-w-2xl mx-auto text-lg md:text-xl leading-relaxed">
              {lang === 'th' 
                ? 'เข้าร่วมคอมมูนิตี้ Discord ของเรา เพื่อรับยศและเข้าใช้งานระบบฟรี!' 
                : 'Join our Discord community to get your role and access the system for free!'}
            </p>
            <a 
              href="https://discord.gg/k4Z9yA7D9t" 
              target="_blank" 
              rel="noreferrer"
              className="text-[#3b82f6] hover:text-[#60a5fa] font-bold text-lg flex items-center gap-2 underline underline-offset-4 decoration-[#3b82f6]/30 hover:decoration-[#3b82f6] transition-all"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"/>
              </svg>
              {lang === 'th' ? 'คลิกเพื่อเข้าสู่ AURA STUDIO' : 'Click to join AURA STUDIO'}
            </a>
          </div>
          
          {/* CTA Buttons */}
          <div className="mt-12 flex flex-col sm:flex-row items-center gap-4 animate-fade-in-up stagger-3" style={{ opacity: 0 }}>
            {session ? (
              <Link href="/workspace"
                className="px-12 py-5 rounded-full bg-gradient-to-r from-[#ddbc76] to-[#aa8323] text-black font-black text-lg shadow-[0_0_60px_rgba(221,188,118,0.4)] hover:shadow-[0_0_80px_rgba(221,188,118,0.6)] flex items-center gap-3 group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:animate-shimmer" />
                <span className="relative z-10 flex items-center gap-2">เข้าสู่พื้นที่ทำงาน AURA <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></span>
              </Link>
            ) : (
              <button onClick={() => signIn("discord")}
                className="px-12 py-5 rounded-full btn-primary text-lg shadow-[0_0_60px_rgba(99,102,241,0.4)] hover:shadow-[0_0_80px_rgba(99,102,241,0.6)] flex items-center gap-3 group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer" />
                <span className="relative z-10 flex items-center gap-2">{t("hero.button")} <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></span>
              </button>
            )}
            <span className="text-[11px] text-gray-500 uppercase tracking-widest font-bold">{t("hero.buttonSub")}</span>
          </div>


          {/* Scroll indicator */}
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-gray-600 animate-fade-in stagger-5" style={{ opacity: 0 }}>
            <span className="text-[10px] uppercase tracking-widest font-bold">{lang === 'th' ? 'เลื่อนลง' : 'Scroll'}</span>
            <ChevronDown className="w-4 h-4 animate-bounce" />
          </div>
        </section>

        {/* ====== COMPARISON SECTION ====== */}
        <section 
          id="compare" 
          ref={(el) => { sectionRefs.current['compare'] = el; }}
          className={`py-32 px-6 max-w-7xl mx-auto transition-all duration-1000 ease-out ${isVisible('compare') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-16'}`}
        >
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-6xl font-black mb-4 tracking-tight">
              {t("compare.title")} <span className="text-gradient-purple">{t("compare.titleSub")}</span>
            </h2>
            <p className="text-gray-400 text-base max-w-2xl mx-auto">{t("compare.desc")}</p>
          </div>

          <div className="flex flex-col md:flex-row gap-6 md:gap-12 items-center justify-center relative">
            {/* VS Badge */}
            <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full glass-card items-center justify-center z-20 font-black text-[#ddbc76] text-base glow-gold animate-border-glow">
              VS
            </div>

            {/* TikTok Standard */}
            <div className="flex-1 w-full max-w-[420px] h-[550px] md:h-[680px] glass-card rounded-[32px] relative overflow-hidden flex flex-col group card-hover spotlight">
              <div className="relative flex-1 w-full h-full min-h-[300px] overflow-hidden">
                <video src="/demo_compressed.mp4" autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0A0710] via-transparent to-transparent" />
                <div className="absolute top-5 left-5 z-10">
                  <div className="inline-flex px-3 py-1.5 glass rounded-xl text-xs font-bold text-gray-400 mb-1.5">
                    {t("compare.standard")}
                  </div>
                  <div className="text-[10px] text-gray-500 font-bold ml-1">540-720p • 30 fps</div>
                </div>
                <div className="absolute bottom-5 right-5 inline-flex items-center gap-1.5 px-3 py-1 glass rounded-full text-[10px] font-bold text-gray-400">
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-pulse" /> LIVE
                </div>
              </div>
              <div className="h-[110px] w-full bg-[#0A0710]/80 backdrop-blur-xl flex justify-between items-center px-6 border-t border-white/5">
                <div className="flex-1 text-center"><div className="text-base md:text-lg font-black text-gray-400">~720p</div><div className="text-[9px] font-bold text-gray-600 uppercase tracking-[0.2em] mt-1">{t("compare.resolution")}</div></div>
                <div className="flex-1 text-center"><div className="text-base md:text-lg font-black text-gray-400">30fps</div><div className="text-[9px] font-bold text-gray-600 uppercase tracking-[0.2em] mt-1">{t("compare.framerate")}</div></div>
                <div className="flex-1 text-center"><div className="text-base md:text-lg font-black text-gray-500">{t("compare.compressed")}</div><div className="text-[9px] font-bold text-gray-600 uppercase tracking-[0.2em] mt-1">{t("compare.quality")}</div></div>
              </div>
            </div>

            {/* AURA Enhanced */}
            <div className="flex-1 w-full max-w-[420px] h-[550px] md:h-[680px] glass-gold rounded-[32px] relative overflow-hidden flex flex-col group card-hover spotlight">
              <div className="absolute inset-0 bg-gradient-to-tr from-[#7e22ce]/15 via-transparent to-[#3b82f6]/15 pointer-events-none" />
              <div className="relative flex-1 w-full h-full min-h-[300px] overflow-hidden z-10">
                <video src="/demo_enhanced.mp4" autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0A0710] via-transparent to-transparent" />
                <div className="absolute top-5 left-5 z-10">
                  <div className="inline-flex px-3 py-1.5 bg-gradient-to-r from-[#ddbc76] to-[#aa8323] rounded-xl text-xs font-black text-black shadow-[0_4px_20px_rgba(221,188,118,0.4)] mb-1.5">
                    {t("compare.enhanced")}
                  </div>
                  <div className="text-[10px] text-[#ddbc76] font-black ml-1">Up to 1080p • 60 fps</div>
                </div>
                <div className="absolute bottom-5 right-5 inline-flex items-center gap-1.5 px-3 py-1 glass-gold rounded-full text-[10px] font-bold text-[#ddbc76]">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#ddbc76] animate-pulse" /> LIVE
                </div>
              </div>
              <div className="h-[110px] w-full bg-[#0A0710]/80 backdrop-blur-xl flex justify-between items-center px-6 border-t border-[#ddbc76]/20 relative z-10">
                <div className="flex-1 text-center"><div className="text-base md:text-lg font-black text-gradient-gold">1080p</div><div className="text-[9px] font-bold text-[#ddbc76]/50 uppercase tracking-[0.2em] mt-1">{t("compare.resolution")}</div></div>
                <div className="flex-1 text-center"><div className="text-base md:text-lg font-black text-gradient-gold">60fps</div><div className="text-[9px] font-bold text-[#ddbc76]/50 uppercase tracking-[0.2em] mt-1">{t("compare.framerate")}</div></div>
                <div className="flex-1 text-center"><div className="text-base md:text-lg font-black text-gradient-gold">{t("compare.lossless")}</div><div className="text-[9px] font-bold text-[#ddbc76]/50 uppercase tracking-[0.2em] mt-1">{t("compare.quality")}</div></div>
              </div>
            </div>
          </div>
        </section>

        {/* ====== FEATURES ====== */}
        <section
          id="features"
          ref={(el) => { sectionRefs.current['features'] = el; }}
          className={`py-32 px-6 max-w-7xl mx-auto transition-all duration-1000 ease-out ${isVisible('features') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-16'}`}
        >
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-6xl font-black mb-4 tracking-tight">
              {lang === 'th' ? 'ทำไมต้อง' : 'Why'} <span className="text-gradient-gold">AURA?</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: <Zap className="w-6 h-6" />, color: "#3b82f6", title: t("feat1.title"), tag: "INSTANT PATCHING", desc: t("feat1.desc") },
              { icon: <ShieldCheck className="w-6 h-6" />, color: "#7e22ce", title: t("feat2.title"), tag: "100% SECURE", desc: t("feat2.desc") },
              { icon: <span className="font-black text-lg">A</span>, color: "#ddbc76", title: t("feat3.title"), tag: "ROLE BASED ACCESS", desc: t("feat3.desc") },
            ].map((feat, i) => (
              <div key={i} className="glass-card p-8 rounded-[28px] card-hover spotlight group" style={{ transitionDelay: `${i * 100}ms` }}>
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300"
                  style={{ background: `${feat.color}15`, color: feat.color, boxShadow: `0 0 30px ${feat.color}20` }}
                >{feat.icon}</div>
                <h3 className="text-xl font-bold mb-1">{feat.title}</h3>
                <h4 className="text-[10px] font-bold tracking-widest mb-4 uppercase" style={{ color: feat.color }}>{feat.tag}</h4>
                <p className="text-gray-400 text-sm leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ====== PRICING ====== */}
        <section
          id="pricing"
          ref={(el) => { sectionRefs.current['pricing'] = el; }}
          className={`py-32 px-6 max-w-7xl mx-auto text-center transition-all duration-1000 ease-out ${isVisible('pricing') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-16'}`}
        >
          <h2 className="text-4xl md:text-6xl font-black mb-4 tracking-tight">
            <span className="text-gradient-white">{t("pricing.title")}</span>
          </h2>
          <p className="text-gray-400 mb-20 max-w-xl mx-auto">{t("pricing.desc")}</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto text-left">
            {/* Free */}
            <div className="glass-card p-8 rounded-[28px] flex flex-col card-hover spotlight group">
              <h3 className="text-2xl font-bold mb-2">{t("pricing.free")}</h3>
              <div className="text-5xl font-black mb-1 text-gray-200">0฿ <span className="text-sm font-bold text-gray-500 uppercase tracking-widest">/{t("pricing.trial")}</span></div>
              <p className="text-gray-400 text-sm mb-8 mt-2 h-10">{t("pricing.freeDesc")}</p>
              <ul className="space-y-4 mb-10 flex-1">
                <li className="flex items-center gap-3 text-sm text-gray-300"><div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-white text-xs font-bold">✓</div>{t("pricing.freeFeat1")}</li>
                <li className="flex items-center gap-3 text-sm text-gray-300"><div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-white text-xs font-bold">✓</div>{t("pricing.freeFeat2")}</li>
                <li className="flex items-center gap-3 text-sm text-gray-600"><div className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center text-gray-600 text-[10px] font-bold">✕</div>{t("pricing.premiumFeat2")}</li>
              </ul>
              <a href="https://discord.gg/k4Z9yA7D9t" target="_blank" rel="noreferrer" className="w-full py-4 rounded-2xl btn-glass group-hover:border-white/20 flex justify-center">{t("pricing.freeBtn")}</a>
            </div>

            {/* Premium */}
            <div className="p-[2px] rounded-[30px] bg-gradient-to-br from-[#7e22ce] via-[#3b82f6] to-[#ddbc76] relative flex flex-col shadow-[0_0_80px_rgba(126,34,206,0.3)] transform md:-translate-y-4 hover:scale-[1.02] transition-all duration-500 group animate-border-glow">
              <div className="absolute top-6 right-6 z-20 px-3 py-1 bg-[#ddbc76] text-black text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg glow-gold">Recommended</div>
              <div className="bg-[#0A0710] rounded-[28px] p-8 h-full flex flex-col relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[250px] h-[250px] bg-[#7e22ce]/20 blur-[80px] rounded-full pointer-events-none" />
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#ddbc76]/60 to-transparent" />
                <h3 className="text-2xl font-black mb-2 text-gradient-gold relative z-10">{t("pricing.premium")}</h3>
                <div className="text-5xl font-black mb-1 text-white relative z-10">599฿ <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">/{t("pricing.month")}</span></div>
                <p className="text-gray-300 text-sm mb-8 mt-2 h-10 relative z-10">{t("pricing.premiumDesc")}</p>
                <ul className="space-y-4 mb-10 flex-1 relative z-10">
                  {[t("pricing.premiumFeat1"), t("pricing.premiumFeat2"), t("pricing.premiumFeat3")].map((feat, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm text-white font-medium">
                      <div className="w-5 h-5 rounded-full bg-gradient-to-r from-[#7e22ce] to-[#3b82f6] flex items-center justify-center text-white text-xs font-bold shadow-lg glow-purple">✓</div>
                      {feat}
                    </li>
                  ))}
                </ul>
                <a href="https://discord.gg/k4Z9yA7D9t" target="_blank" rel="noreferrer" className="w-full py-4 rounded-2xl btn-gold relative z-10 flex justify-center">{t("pricing.premiumBtn")}</a>
              </div>
            </div>
          </div>
        </section>

        {/* ====== FOOTER ====== */}
        <footer className="py-16 px-6 border-t border-white/5 relative">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#ddbc76] to-[#aa8323] flex items-center justify-center"><span className="font-black text-black text-sm">A</span></div>
              <span className="font-bold tracking-widest text-sm text-gradient-gold">AURA STUDIO</span>
            </div>
            <p className="text-gray-500 text-xs">© 2026 AURA Studio. {lang === 'th' ? 'สงวนลิขสิทธิ์ทุกประการ' : 'All rights reserved.'}</p>
            <div className="flex items-center gap-6 text-gray-500 text-xs">
              <Link href="/creators" className="hover:text-white transition">{lang === 'th' ? 'ครีเอเตอร์' : 'Creators'}</Link>
              <a href="https://discord.gg" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">Discord</a>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
