"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import Link from "next/link";
import { Loader2, Zap, Settings, Shield, Music, LogOut, Globe, UserCog, Upload, FileVideo, CheckCircle, Clock, ChevronDown, Crown } from "lucide-react";
import { useLanguage } from "./LanguageProvider";
import { applyBinaryPatch, applySmoothFpsPatch } from "@/lib/patcher.obfuscated";

export default function Dashboard({ session }: { session: any }) {
  const { t, lang, setLang } = useLanguage();
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [targetSizeMB, setTargetSizeMB] = useState<number>(0);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [activeTab, setActiveTab] = useState<'quality' | 'smooth'>('quality');
  const [usageInfo, setUsageInfo] = useState<{ usage: number, limit: number, smooth_usage: number, smooth_limit: number, role: string, isAllowed: boolean, last_reset_date?: string, smooth_last_reset_date?: string, premium_since?: string, bonus_days?: number } | null>(null);
  const [timeLeft, setTimeLeft] = useState("");
  const [premiumExpiry, setPremiumExpiry] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  
  const ffmpegRef = useRef(new FFmpeg());
  const [isReady, setIsReady] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  const loadFFmpeg = async () => {
    const ffmpeg = ffmpegRef.current;
    ffmpeg.on('log', ({ message }) => {
      console.log(message);
    });
    ffmpeg.on('progress', ({ progress, time }) => {
      setProgress(Math.round(progress * 100));
    });
    
    await ffmpeg.load({
      coreURL: await toBlobURL(`https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.wasm`, 'application/wasm'),
    });
    setIsReady(true);
  };

  const fetchUsageInfo = async () => {
    try {
      const res = await fetch('/api/usage');
      if (res.ok) {
        const data = await res.json();
        setUsageInfo(data);
      }
    } catch (err) {
      console.error("Failed to fetch usage:", err);
    }
  };

  useEffect(() => {
    loadFFmpeg();
    fetchUsageInfo();
  }, []);

  useEffect(() => {
    if (!usageInfo) return;
    
    const interval = setInterval(() => {
      const isSmooth = activeTab === 'smooth';
      const lastResetDateStr = isSmooth ? usageInfo.smooth_last_reset_date : usageInfo.last_reset_date;
      
      if (!lastResetDateStr) return;
      
      const lastReset = new Date(lastResetDateStr);
      const now = new Date();
      let resetTime = new Date(lastReset);
      
      if (isSmooth) {
        // Smooth FPS resets daily for both free and premium
        resetTime.setHours(resetTime.getHours() + 24);
      } else {
        // AURA Quality resets daily for premium, weekly for free
        if (usageInfo.role === 'premium') {
          resetTime.setHours(resetTime.getHours() + 24);
        } else {
          resetTime.setDate(resetTime.getDate() + 7);
        }
      }
      
      const diff = resetTime.getTime() - now.getTime();
      if (diff <= 0) {
        setTimeLeft(t("dash.refreshing") || "Refreshing...");
        const currentUsage = isSmooth ? usageInfo.smooth_usage : usageInfo.usage;
        if (currentUsage > 0) {
           fetchUsageInfo();
        }
      } else {
        const h = Math.floor(diff / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);
        
        if (!isSmooth && usageInfo.role === 'free') {
          const d = Math.floor(h / 24);
          const remainingH = h % 24;
          setTimeLeft(`${d}d ${remainingH}h ${m}m`);
        } else {
          // Daily resets for smooth (all) and quality (premium)
          setTimeLeft(`${h}h ${m}m ${s}s`);
        }
      }

      // calculate premium expiry
      if (usageInfo.role === 'premium' && usageInfo.premium_since) {
        const premiumSince = new Date(usageInfo.premium_since);
        const expiry = new Date(premiumSince);
        expiry.setDate(expiry.getDate() + 30 + (usageInfo.bonus_days || 0));
        
        const pDiff = expiry.getTime() - now.getTime();
        if (pDiff <= 0) {
          setPremiumExpiry("Expired");
        } else {
          const pd = Math.floor(pDiff / (1000 * 60 * 60 * 24));
          const ph = Math.floor((pDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          setPremiumExpiry(`${pd} days ${ph} hours`);
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [usageInfo]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      selectFile(e.target.files[0]);
    }
  };

  const selectFile = (selected: File) => {
    let maxMB = 30; // Free
    if (usageInfo?.role === 'partner') maxMB = 500;
    else if (usageInfo?.role === 'premium') maxMB = 100;
    if (activeTab === 'quality' && selected.size > maxMB * 1024 * 1024) {
      setErrorMsg(lang === 'th' ? `ไฟล์เกินขนาดที่กำหนด (${maxMB}MB)` : `File exceeds ${maxMB}MB limit`);
      setFile(null);
      return;
    }
    setFile(selected);
    setErrorMsg("");
    setIsComplete(false);
    const url = URL.createObjectURL(selected);
    setVideoUrl(url);
    
    // Get video duration for compression bitrate calculation
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      const w = video.videoWidth;
      const h = video.videoHeight;
      const maxDim = Math.max(w, h);
      const minDim = Math.min(w, h);
      
      const role = usageInfo?.role || 'free';
      if (role === 'free') {
        if (maxDim > 1920 || minDim > 1080) {
          setErrorMsg(lang === 'th' ? 'สายฟรีรองรับความละเอียดสูงสุดที่ 1080p เท่านั้น (อัพเกรดเพื่อปลดล็อค 2K/4K)' : 'Free tier supports up to 1080p. Upgrade for 2K/4K.');
          setFile(null);
          setVideoUrl(null);
          return;
        }
      }
      
      setVideoDuration(video.duration);
    };
    video.src = url;
    
    setTargetSizeMB(parseFloat((selected.size / (1024 * 1024)).toFixed(2)));
  };

  // Drag & Drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      selectFile(files[0]);
    }
  }, [activeTab]);

  const processVideo = async () => {
    if (!file || (activeTab === 'quality' && !isReady)) return;
    
    let maxMB = 30; // Free
    if (usageInfo?.role === 'partner') maxMB = 500;
    else if (usageInfo?.role === 'premium') maxMB = 100;
    if (activeTab === 'quality' && file.size > maxMB * 1024 * 1024) {
      setErrorMsg(lang === 'th' ? `ไฟล์เกินขนาดที่กำหนด (${maxMB}MB)` : `File exceeds ${maxMB}MB limit`);
      return;
    }
    
    // Check usage limits
    try {
      const res = await fetch('/api/usage', { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ type: activeTab })
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "You have reached your conversion limit.");
        return;
      }
      setUsageInfo(data);
    } catch (err) {
      setErrorMsg("Failed to verify usage limits.");
      return;
    }

    setIsProcessing(true);
    setErrorMsg("");
    
    try {
      if (activeTab === 'smooth') {
        const buffer = await file.arrayBuffer();
        const patchedData = applySmoothFpsPatch(new Uint8Array(buffer));
        // @ts-expect-error
        const url = URL.createObjectURL(new Blob([patchedData], { type: 'video/mp4' }));
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `[SMOOTH_60FPS]_${file.name}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      } else {
        const ffmpeg = ffmpegRef.current;
        await ffmpeg.writeFile('input.mp4', await fetchFile(file));
        
        const originalMB = file.size / (1024 * 1024);
        if (usageInfo?.role === 'partner' && targetSizeMB < originalMB) {
          // Re-encode required to reduce size
          const targetBitrate = Math.floor((targetSizeMB * 8388608) / (videoDuration || 1));
          await ffmpeg.exec([
            '-i', 'input.mp4',
            '-c:v', 'libx264',
            '-preset', 'ultrafast',
            '-b:v', `${targetBitrate}`,
            '-c:a', 'copy',
            '-movflags', 'faststart+use_metadata_tags',
            '-color_primaries', 'bt709',
            '-color_trc', 'bt709',
            '-colorspace', 'bt709',
            '-color_range', 'tv',
            '-metadata', 'creation_time=now',
            '-metadata:s:v:0', 'handler_name=Core Media Video',
            'output.mp4'
          ]);
        } else {
          // Binary level patch (No re-encoding)
          await ffmpeg.exec([
            '-i', 'input.mp4',
            '-c:v', 'copy',
            '-c:a', 'copy',
            '-movflags', 'faststart+use_metadata_tags',
            '-color_primaries', 'bt709',
            '-color_trc', 'bt709',
            '-colorspace', 'bt709',
            '-color_range', 'tv',
            '-metadata', 'creation_time=now',
            '-metadata:s:v:0', 'handler_name=Core Media Video',
            'output.mp4'
          ]);
        }
        
        const data = await ffmpeg.readFile('output.mp4');
        const patchedData = applyBinaryPatch(data as Uint8Array);
        
        // @ts-expect-error
        const url = URL.createObjectURL(new Blob([patchedData], { type: 'video/mp4' }));
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `[AURA_PATCHED]_${file.name}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
      
      setIsProcessing(false);
      setProgress(0);
      setIsComplete(true);
      fetchUsageInfo();
    } catch (err) {
      console.error(err);
      setErrorMsg(t("dash.error"));
      setIsProcessing(false);
    }
  };

  const currentUsage = usageInfo ? (activeTab === 'smooth' ? usageInfo.smooth_usage : usageInfo.usage) : 0;
  const currentLimit = usageInfo ? (activeTab === 'smooth' ? usageInfo.smooth_limit : usageInfo.limit) : 1;
  const quotaPercent = usageInfo ? Math.round((currentUsage / currentLimit) * 100) : 0;

  return (
    <div className="flex flex-col md:flex-row min-h-screen md:h-screen bg-[#06040A] text-white p-3 md:p-6 font-sans overflow-x-hidden md:overflow-hidden relative mesh-bg noise">
      {/* Ambient Orbs */}
      <div className="orb orb-purple w-[400px] h-[400px] top-[-10%] left-[-5%] animate-pulse-glow" />
      <div className="orb orb-blue w-[350px] h-[350px] bottom-[-10%] right-[-5%] animate-pulse-glow" style={{ animationDelay: "2s" }} />

      {/* ====== SIDEBAR ====== */}
      <div className="w-full md:w-[280px] bg-[#0A0710]/80 backdrop-blur-3xl border border-white/5 rounded-[32px] flex flex-col p-5 mb-4 md:mb-0 mr-0 md:mr-6 z-10 relative shrink-0 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8 px-2 mt-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#ddbc76] via-[#d4af37] to-[#aa8323] flex items-center justify-center shadow-[0_0_20px_rgba(221,188,118,0.3)]">
            <span className="font-black text-black text-xl">A</span>
          </div>
          <div>
            <span className="font-bold tracking-widest text-lg text-gradient-gold leading-none">AURA</span>
            <div className="text-[9px] text-gray-500 font-bold tracking-[0.2em] uppercase mt-0.5">Workspace</div>
          </div>
        </div>

        {/* Premium Plan Card */}
        <div className="relative rounded-2xl overflow-hidden mb-6 p-[1px] group">
          <div className={`absolute inset-0 bg-gradient-to-br ${session?.user?.role === 'partner' ? 'from-blue-500 to-cyan-500' : 'from-[#7e22ce] via-[#3b82f6] to-[#ddbc76]'} opacity-50 group-hover:opacity-100 transition-opacity duration-500`} />
          <div className="bg-[#0A0710] rounded-[15px] p-4 relative z-10 h-full flex flex-col">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 blur-2xl rounded-full" />
            
            <div className="flex items-center gap-3 mb-4">
               {session?.user?.image ? (
                 <img src={session.user.image} alt="Profile" className="w-10 h-10 rounded-full border border-white/10" />
               ) : (
                 <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                   <UserCog className="w-5 h-5 text-gray-400" />
                 </div>
               )}
               <div>
                 <div className="text-sm font-bold text-white truncate w-24">{session?.user?.name || 'User'}</div>
                 <div className={`text-[9px] font-black tracking-widest uppercase mt-0.5 ${session?.user?.role === 'partner' ? 'text-blue-400' : (session?.user?.role === 'premium' ? 'text-[#ddbc76]' : 'text-gray-400')}`}>
                   {session?.user?.role === 'partner' ? 'PARTNER' : (session?.user?.role === "premium" ? t("dash.premium") : "MEMBER")}
                 </div>
               </div>
            </div>

            {usageInfo && usageInfo.role !== 'partner' && (
              <>
                <div className="flex justify-between items-end mb-1.5">
                  <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Quota Usage</span>
                  <span className="text-xs font-black text-white">{currentUsage}<span className="text-gray-500">/{currentLimit > 999 ? '∞' : currentLimit}</span></span>
                </div>
                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden mb-3">
                  <div 
                    className="h-full rounded-full transition-all duration-500 relative"
                    style={{ 
                      width: `${quotaPercent}%`,
                      background: quotaPercent >= 100 ? '#ef4444' : (session?.user?.role === 'premium' ? 'linear-gradient(90deg, #7e22ce, #ddbc76)' : '#3b82f6')
                    }}
                  >
                    <div className="absolute inset-0 bg-white/20 animate-shimmer" />
                  </div>
                </div>
              </>
            )}

            {(session?.user?.role === "premium" && premiumExpiry) ? (
              <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-bold mt-auto pt-2 border-t border-white/5">
                <Clock className="w-3 h-3 text-[#ddbc76]" /> {premiumExpiry} left
              </div>
            ) : (timeLeft && usageInfo?.role !== 'partner' && (
              <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-bold mt-auto pt-2 border-t border-white/5">
                <Zap className="w-3 h-3 text-blue-400" /> Resets in {timeLeft}
              </div>
            ))}
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex flex-col gap-2 flex-1">
          <p className="text-[10px] text-gray-600 font-bold tracking-widest uppercase mb-1 px-2">Tools</p>
          <button 
            onClick={() => { setActiveTab('quality'); setFile(null); setErrorMsg(''); setIsComplete(false); }}
            className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-300 text-sm font-medium group relative overflow-hidden ${
              activeTab === 'quality' 
                ? 'bg-gradient-to-r from-white/10 to-transparent border border-white/10 text-white' 
                : 'hover:bg-white/5 text-gray-400 hover:text-white border border-transparent'
            }`}
          >
            <div className="flex items-center gap-3 relative z-10">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${activeTab === 'quality' ? 'bg-[#ddbc76]/20 text-[#ddbc76]' : 'bg-white/5 text-gray-400 group-hover:text-white'}`}>
                <Music className="w-4 h-4" />
              </div>
              <span className="font-bold">{t("dash.quality")}</span>
            </div>
            {activeTab === 'quality' && <div className="w-1.5 h-1.5 rounded-full bg-[#ddbc76] shadow-[0_0_10px_#ddbc76] animate-pulse relative z-10" />}
            {activeTab === 'quality' && <div className="absolute inset-0 bg-gradient-to-r from-[#ddbc76]/10 to-transparent pointer-events-none" />}
          </button>

          <button 
            onClick={() => { setActiveTab('smooth'); setFile(null); setErrorMsg(''); setIsComplete(false); }}
            className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-300 text-sm font-medium group relative overflow-hidden ${
              activeTab === 'smooth' 
                ? 'bg-gradient-to-r from-white/10 to-transparent border border-white/10 text-white' 
                : 'hover:bg-white/5 text-gray-400 hover:text-white border border-transparent'
            }`}
          >
            <div className="flex items-center gap-3 relative z-10">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${activeTab === 'smooth' ? 'bg-[#3b82f6]/20 text-[#3b82f6]' : 'bg-white/5 text-gray-400 group-hover:text-white'}`}>
                <Zap className="w-4 h-4" />
              </div>
              <span className="font-bold">{t("dash.smooth")}</span>
            </div>
            {activeTab === 'smooth' && <div className="w-1.5 h-1.5 rounded-full bg-[#3b82f6] shadow-[0_0_10px_#3b82f6] animate-pulse relative z-10" />}
            {activeTab === 'smooth' && <div className="absolute inset-0 bg-gradient-to-r from-[#3b82f6]/10 to-transparent pointer-events-none" />}
          </button>
          
          <div className="flex-1" />
          
          {session?.user?.role !== 'partner' && session?.user?.role !== 'premium' && (
            <Link href="/topup" className="flex items-center justify-center gap-2 py-4 mb-2 rounded-xl transition-all duration-300 text-sm font-black bg-gradient-to-r from-[#7e22ce] to-[#3b82f6] text-white hover:shadow-[0_0_30px_rgba(126,34,206,0.4)] group relative overflow-hidden hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:animate-shimmer" />
              <Crown className="w-5 h-5 group-hover:scale-110 transition-transform" /> 
              <span>UPGRADE TO VIP</span>
            </Link>
          )}

          <button className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 rounded-xl transition text-gray-500 hover:text-white text-sm font-medium group">
             <Settings className="w-4 h-4 group-hover:rotate-90 transition-transform duration-500" /> <span>{t("dash.settings")}</span>
          </button>
        </nav>
        
        {/* Footer Actions */}
        <div className="mt-2 pt-4 border-t border-white/5 flex gap-2">
          <button 
            onClick={() => setLang(lang === 'th' ? 'en' : 'th')}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold text-gray-400 hover:text-white transition-all"
          >
            <Globe className="w-3 h-3" /> {lang === 'th' ? 'EN' : 'TH'}
          </button>
          <button 
            onClick={() => signOut()} 
            className="flex items-center justify-center w-10 h-10 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 rounded-xl transition-all"
            title={t("dash.logout")}
          >
             <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ====== MAIN CONTENT AREA ====== */}
      <div className="flex-1 flex flex-col relative z-10 min-w-0 bg-[#0A0710]/40 backdrop-blur-xl border border-white/5 rounded-[32px] overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.3)]">
        {/* Video Background Blur */}
        {videoUrl && (
          <>
            <video 
              src={videoUrl} 
              className="absolute inset-0 w-full h-full object-cover opacity-40 blur-[24px] z-0 transition-opacity duration-1000"
              autoPlay loop muted playsInline
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#06040A]/20 to-[#06040A]/90 z-0 pointer-events-none" />
          </>
        )}
        
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-12 relative z-10">
          <div className="max-w-3xl mx-auto">
            {/* Header */}
            <header className="mb-10 animate-fade-in-up">
              <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-2">
                {activeTab === 'quality' ? (
                  <>AURA <span className="text-gradient-gold">QUALITY</span></>
                ) : (
                  <>AURA <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6]">SMOOTH FPS</span></>
                )}
              </h2>
            </header>

            {/* Drag & Drop Zone */}
            <div 
              ref={dropRef}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative rounded-[32px] p-1 overflow-hidden transition-all duration-500 animate-scale-in mb-8 ${isDragOver ? 'scale-[1.02]' : ''}`}
            >
               {/* Animated Border */}
               <div className={`absolute inset-0 border-2 border-dashed rounded-[32px] transition-colors duration-500 z-10 pointer-events-none ${isDragOver ? (activeTab === 'quality' ? 'border-[#ddbc76]' : 'border-[#3b82f6]') : 'border-white/10'}`} />
               
               {isDragOver && (
                 <div className={`absolute inset-0 opacity-20 blur-2xl z-0 ${activeTab === 'quality' ? 'bg-[#ddbc76]' : 'bg-[#3b82f6]'}`} />
               )}

               <div className="bg-[#0A0710]/90 backdrop-blur-md rounded-[30px] p-8 md:p-16 flex flex-col items-center justify-center text-center relative z-20 min-h-[300px]">
                  {!file ? (
                    <>
                      <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6 shadow-2xl transition-transform duration-500 ${isDragOver ? 'scale-110' : ''} ${activeTab === 'quality' ? 'bg-[#ddbc76]/10 text-[#ddbc76] shadow-[#ddbc76]/20' : 'bg-[#3b82f6]/10 text-[#3b82f6] shadow-[#3b82f6]/20'}`}>
                        <Upload className="w-10 h-10" />
                      </div>
                      <h3 className="text-2xl font-black text-white mb-2">
                        {lang === 'th' ? 'ลากไฟล์มาวางตรงนี้' : 'Drag & Drop your video'}
                      </h3>
                      <p className="text-gray-400 mb-8 max-w-sm">
                        {lang === 'th' ? 'หรือกดปุ่มด้านล่างเพื่อเลือกไฟล์จากคอมพิวเตอร์ของคุณ' : 'or click the button below to browse files from your computer'}
                      </p>
                      <label className="cursor-pointer group relative">
                        <div className={`absolute inset-0 blur-xl opacity-50 group-hover:opacity-100 transition-opacity ${activeTab === 'quality' ? 'bg-[#ddbc76]' : 'bg-[#3b82f6]'}`} />
                        <div className="relative px-8 py-4 bg-white text-black font-black rounded-xl text-sm flex items-center gap-3 hover:scale-105 transition-transform">
                          <FileVideo className="w-5 h-5" /> {t("dash.browse")}
                        </div>
                        <input type="file" accept="video/mp4" className="hidden" onChange={handleFileChange} />
                      </label>
                      <div className="mt-8 px-4 py-2 rounded-lg bg-white/5 border border-white/5 inline-flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-xs text-gray-400 font-bold tracking-widest uppercase">
                          {lang === 'th' 
                            ? `MP4 • MAX ${usageInfo?.role === 'partner' ? 500 : (usageInfo?.role === 'premium' ? 100 : 30)}MB • ${(!usageInfo || usageInfo.role === 'free') ? '1080p' : '4K'}` 
                            : `MP4 • MAX ${usageInfo?.role === 'partner' ? 500 : (usageInfo?.role === 'premium' ? 100 : 30)}MB • ${(!usageInfo || usageInfo.role === 'free') ? '1080p' : '4K'}`
                          }
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="w-full">
                      <div className="flex flex-col md:flex-row items-center gap-6 text-left">
                        <div className="relative">
                           <div className={`w-24 h-24 rounded-2xl flex items-center justify-center shadow-2xl z-10 relative ${isComplete ? 'bg-green-500/10 text-green-400 border border-green-500/30' : 'bg-white/5 text-white border border-white/10'}`}>
                             {isComplete ? <CheckCircle className="w-10 h-10" /> : <FileVideo className="w-10 h-10" />}
                           </div>
                           {isComplete && <div className="absolute inset-0 bg-green-500 blur-2xl opacity-20 z-0" />}
                        </div>
                        
                        <div className="flex-1 text-center md:text-left min-w-0">
                          <h4 className="text-xl font-bold text-white truncate mb-2">{file.name}</h4>
                          
                          {/* File Metrics Grid */}
                          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-4">
                            <div className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 text-xs font-bold text-gray-300">
                              <span className="text-gray-500 mr-2 uppercase tracking-widest text-[10px]">Size</span> 
                              {(file.size / (1024 * 1024)).toFixed(2)} MB
                            </div>
                            <div className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 text-xs font-bold text-gray-300">
                              <span className="text-gray-500 mr-2 uppercase tracking-widest text-[10px]">Type</span> 
                              MP4
                            </div>
                            <div className={`px-3 py-1.5 rounded-lg border text-xs font-bold ${activeTab === 'quality' ? 'bg-[#ddbc76]/10 border-[#ddbc76]/30 text-[#ddbc76]' : 'bg-[#3b82f6]/10 border-[#3b82f6]/30 text-[#3b82f6]'}`}>
                              <span className="mr-2 uppercase tracking-widest text-[10px] opacity-70">Target</span> 
                              {activeTab === 'quality' ? 'AURA MAX' : '60 FPS'}
                            </div>
                          </div>

                          {isComplete && (
                            <p className="text-sm text-green-400 font-bold mt-4 flex items-center justify-center md:justify-start gap-2">
                              <CheckCircle className="w-4 h-4" /> {lang === 'th' ? 'ดำเนินการสำเร็จ ไฟล์ถูกดาวน์โหลดแล้ว' : 'Success! File has been downloaded'}
                            </p>
                          )}
                        </div>

                        <label className="cursor-pointer shrink-0 mt-6 md:mt-0">
                          <div className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-bold transition-colors">
                            {lang === 'th' ? 'เปลี่ยนไฟล์' : 'Change File'}
                          </div>
                          <input type="file" accept="video/mp4" className="hidden" onChange={handleFileChange} />
                        </label>
                      </div>
                    </div>
                  )}
               </div>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="mb-8 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-3 animate-fade-in">
                <Shield className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <p className="text-red-400 text-sm font-bold">{errorMsg}</p>
              </div>
            )}

            {/* File Selected Controls */}
            {file && !errorMsg && (
              <div className="animate-fade-in-up stagger-1">
                
                {/* Partner Compression Slider */}
                {activeTab === 'quality' && (
                  <div className={`mb-8 p-6 rounded-[24px] bg-white/[0.02] border border-white/5 relative overflow-hidden transition-opacity ${usageInfo?.role !== 'partner' ? 'opacity-50' : 'hover:bg-white/[0.04]'}`}>
                    {usageInfo?.role !== 'partner' && (
                       <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#0A0710]/80 backdrop-blur-sm rounded-[24px]">
                          <Shield className="w-8 h-8 text-blue-400 mb-2" />
                          <p className="text-sm font-bold text-white uppercase tracking-widest">Partner Only Feature</p>
                       </div>
                    )}
                    <div className="flex items-center justify-between mb-6 relative z-10">
                      <div>
                        <h4 className="text-white font-bold text-lg flex items-center gap-2">
                           <Settings className="w-5 h-5 text-blue-400" />
                           {lang === 'th' ? 'บีบอัดขนาดไฟล์' : 'Compress File Size'}
                        </h4>
                        <p className="text-xs text-gray-400 mt-1">
                           {lang === 'th' ? 'ปรับสไลเดอร์เพื่อกำหนดขนาดไฟล์ที่ต้องการ' : 'Adjust slider to set target MB'}
                        </p>
                      </div>
                      <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
                         {targetSizeMB} <span className="text-sm text-gray-500 font-bold">MB</span>
                      </div>
                    </div>
                    <input 
                      type="range" 
                      min="1" 
                      max={Math.ceil(file.size / (1024 * 1024))} 
                      step="0.1"
                      value={targetSizeMB}
                      onChange={(e) => setTargetSizeMB(parseFloat(e.target.value))}
                      className="w-full accent-blue-500 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer relative z-10"
                    />
                  </div>
                )}

                {/* Progress Bar UI */}
                {isProcessing && (
                  <div className="mb-8 p-6 rounded-[24px] bg-[#0A0710]/50 border border-white/5 shadow-inner">
                    <div className="flex justify-between items-end mb-3">
                      <div className="flex items-center gap-3">
                        <Loader2 className={`w-5 h-5 animate-spin ${activeTab === 'quality' ? 'text-[#ddbc76]' : 'text-[#3b82f6]'}`}/> 
                        <span className="text-white font-bold">{t("dash.patching")}</span>
                      </div>
                      <span className={`text-2xl font-black ${activeTab === 'quality' ? 'text-gradient-gold' : 'text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400'}`}>{progress}%</span>
                    </div>
                    <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden relative border border-white/10">
                      <div 
                        className={`h-full rounded-full transition-all duration-300 relative overflow-hidden ${activeTab === 'quality' ? 'bg-gradient-to-r from-[#7e22ce] via-[#aa8323] to-[#ddbc76]' : 'bg-gradient-to-r from-[#3b82f6] via-[#6366f1] to-[#8b5cf6]'}`}
                        style={{ width: `${progress}%` }}
                      >
                        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMSI+PC9yZWN0Pgo8cGF0aCBkPSJNMCA4TDggMCBaIiBzdHJva2U9IiNmZmYiIHN0cm9rZS1vcGFjaXR5PSIwLjMiIHN0cm9rZS13aWR0aD0iMSI+PC9wYXRoPjwvc3ZnPg==')] opacity-50 animate-slide" />
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Execute Button */}
                <button 
                  onClick={processVideo}
                  disabled={isProcessing || (!isReady && activeTab !== 'smooth')}
                  className={`w-full py-6 rounded-[24px] font-black text-xl transition-all duration-500 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group shadow-2xl hover:-translate-y-1 ${
                    activeTab === 'quality' 
                      ? 'bg-gradient-to-r from-[#ddbc76] to-[#aa8323] text-black hover:shadow-[0_0_50px_rgba(221,188,118,0.5)]' 
                      : 'bg-gradient-to-r from-[#3b82f6] to-[#7e22ce] text-white hover:shadow-[0_0_50px_rgba(59,130,246,0.5)]'
                  }`}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:animate-shimmer" />
                  <div className="relative z-10 flex items-center justify-center gap-3">
                    {isProcessing ? (
                      <>Processing File...</>
                    ) : (!isReady && activeTab !== 'smooth') ? (
                      <>{t("dash.loading")}</>
                    ) : (
                      <>
                        {activeTab === 'quality' ? <Zap className="w-6 h-6" /> : <Zap className="w-6 h-6" />}
                        {activeTab === 'quality' ? 'INITIALIZE PATCH' : 'INITIALIZE SMOOTH 60FPS'}
                      </>
                    )}
                  </div>
                </button>

              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
