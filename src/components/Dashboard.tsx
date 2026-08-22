"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import { Loader2, Zap, Settings, Shield, Music, LogOut, Globe, UserCog, Upload, FileVideo, CheckCircle, Clock, ChevronDown } from "lucide-react";
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
  const [usageInfo, setUsageInfo] = useState<{ usage: number, limit: number, role: string, isAllowed: boolean, last_reset_date?: string, premium_since?: string, bonus_days?: number } | null>(null);
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
    if (!usageInfo?.last_reset_date) return;
    
    const interval = setInterval(() => {
      const lastReset = new Date(usageInfo.last_reset_date!);
      const now = new Date();
      // calculate quota reset
      let resetTime = new Date(lastReset);
      if (usageInfo.role === 'premium') {
        resetTime.setHours(resetTime.getHours() + 24);
      } else {
        resetTime.setDate(resetTime.getDate() + 7);
      }
      
      const diff = resetTime.getTime() - now.getTime();
      if (diff <= 0) {
        setTimeLeft(t("dash.refreshing") || "Refreshing...");
        if (usageInfo.usage > 0) {
           fetchUsageInfo();
        }
      } else {
        const h = Math.floor(diff / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);
        if (usageInfo.role === 'free') {
          const d = Math.floor(h / 24);
          const remainingH = h % 24;
          setTimeLeft(`${d}d ${remainingH}h ${m}m`);
        } else {
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
    
    // Check usage limits for AURA Quality
    if (activeTab === 'quality') {
      try {
        const res = await fetch('/api/usage', { method: 'POST' });
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

  const quotaPercent = usageInfo ? Math.round((usageInfo.usage / usageInfo.limit) * 100) : 0;

  return (
    <div className="flex flex-col md:flex-row min-h-screen md:h-screen bg-[#06040A] text-white p-3 md:p-4 font-sans overflow-x-hidden md:overflow-hidden relative mesh-bg noise">
      {/* Ambient Orbs */}
      <div className="orb orb-purple w-[400px] h-[400px] top-[-10%] left-[-5%] animate-pulse-glow" />
      <div className="orb orb-blue w-[350px] h-[350px] bottom-[-10%] right-[-5%] animate-pulse-glow" style={{ animationDelay: "2s" }} />

      {/* SIDEBAR */}
      <div className="w-full md:w-[260px] glass-card rounded-[28px] flex flex-col p-5 mb-4 md:mb-0 mr-0 md:mr-4 z-10 relative shrink-0">
        {/* Logo + Member Badge */}
        <div className="flex flex-col items-center mb-6 mt-2">
          <div className="w-16 h-16 bg-gradient-to-br from-[#ddbc76] to-[#aa8323] rounded-2xl flex items-center justify-center mb-3 glow-gold">
             <span className="text-2xl font-black text-black">A</span>
          </div>
          <h2 className="text-lg font-bold tracking-widest text-gradient-gold">AURA</h2>
          <div className={`mt-2 px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase ${session?.user?.role === 'partner' ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.5)] border border-blue-400' : 'glass-gold text-[#ddbc76]'}`}>
            {session?.user?.role === 'partner' ? 'PARTNER' : (session?.user?.role === "premium" ? t("dash.premium") : "MEMBER")}
          </div>
          {session?.user?.role === "premium" && premiumExpiry && (
            <span className="text-[10px] text-gray-400 mt-2 flex items-center gap-1">
              <Clock className="w-3 h-3" /> {premiumExpiry}
            </span>
          )}
        </div>

        {/* Quota Ring */}
        {usageInfo && usageInfo.role !== 'partner' && (
          <div className="glass-card rounded-2xl p-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="relative w-12 h-12 shrink-0">
                <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
                  <circle
                    cx="18" cy="18" r="15" fill="none"
                    stroke={quotaPercent >= 100 ? '#ef4444' : '#ddbc76'}
                    strokeWidth="3"
                    strokeDasharray={`${quotaPercent} 100`}
                    strokeLinecap="round"
                    className="transition-all duration-500"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black">
                  {usageInfo.usage}/{usageInfo.limit}
                </span>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Quota</p>
                {timeLeft && (
                  <p className="text-[10px] text-[#ddbc76] font-bold flex items-center gap-1 mt-0.5">
                    <Zap className="w-3 h-3" /> {timeLeft}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex flex-col gap-2 flex-1">
          <button 
            onClick={() => { setActiveTab('quality'); setFile(null); setErrorMsg(''); setIsComplete(false); }}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 text-sm font-medium ${
              activeTab === 'quality' 
                ? 'glass-gold text-[#ddbc76] shadow-[0_0_15px_rgba(221,188,118,0.1)]' 
                : 'hover:bg-white/5 text-gray-400 hover:text-white'
            }`}
          >
             <Music className="w-4 h-4" /> <span>{t("dash.quality")}</span>
          </button>
          <button 
            onClick={() => { setActiveTab('smooth'); setFile(null); setErrorMsg(''); setIsComplete(false); }}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 text-sm font-medium ${
              activeTab === 'smooth' 
                ? 'glass-gold text-[#ddbc76] shadow-[0_0_15px_rgba(221,188,118,0.1)]' 
                : 'hover:bg-white/5 text-gray-400 hover:text-white'
            }`}
          >
             <Zap className="w-4 h-4" /> <span>{t("dash.smooth")}</span>
          </button>
          
          <div className="flex-1" />
          
          <button className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 rounded-xl transition text-gray-400 hover:text-white text-sm font-medium">
             <Settings className="w-4 h-4" /> <span>{t("dash.settings")}</span>
          </button>
        </nav>
        
        {/* Language + Logout */}
        <div className="mt-4 space-y-2">
          <button 
            onClick={() => setLang(lang === 'th' ? 'en' : 'th')}
            className="w-full flex items-center justify-center gap-2 py-2.5 btn-glass rounded-xl text-sm"
          >
            <Globe className="w-4 h-4 text-gray-400" /> {lang === 'th' ? 'EN' : 'TH'}
          </button>
          <button onClick={() => signOut()} className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 rounded-xl transition text-sm font-bold">
             <LogOut className="w-4 h-4" /> {t("dash.logout")}
          </button>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col relative z-10 min-w-0">
        {/* Video Background Blur */}
        {videoUrl && (
          <>
            <video 
              src={videoUrl} 
              className="absolute inset-0 w-full h-full object-cover opacity-40 blur-lg z-0 mix-blend-screen"
              autoPlay loop muted playsInline
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#06040A] via-[#06040A]/60 to-transparent z-0" />
          </>
        )}
        
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 relative z-10">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <header className="animate-fade-in">
              <h2 className="text-3xl md:text-4xl font-black tracking-tighter mb-1">
                AURA <span className="text-gradient-gold">WORKSPACE</span>
              </h2>
              <p className="text-gray-400 text-sm font-medium">
                {activeTab === 'quality' 
                  ? (lang === 'th' ? 'ปรับแต่งและบีบอัดไฟล์วิดีโอของคุณ' : 'Optimize and compress your video files.')
                  : (lang === 'th' ? 'แปลงวิดีโอของคุณเป็น 60FPS สุดลื่นไหล' : 'Convert your videos to ultra smooth 60FPS')
                }
              </p>
            </header>

            {/* Main Card */}
            <div className="glass-card rounded-[28px] p-6 md:p-8 animate-scale-in">
              {/* Tab Title */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#ddbc76]/20 to-[#aa8323]/10 flex items-center justify-center border border-[#ddbc76]/20">
                  {activeTab === 'quality' ? <Music className="w-5 h-5 text-[#ddbc76]" /> : <Zap className="w-5 h-5 text-[#ddbc76]" />}
                </div>
                <div>
                  <h3 className="text-xl font-black text-white">
                    {activeTab === 'quality' ? 'AURA QUALITY' : 'AURA SMOOTH FPS'}
                  </h3>
                  <p className="text-xs text-gray-500">{activeTab === 'quality' ? 'Binary-Level MP4 Patcher' : '60FPS Conversion'}</p>
                </div>
              </div>

              {/* Drag & Drop Zone */}
              <div 
                ref={dropRef}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`dropzone rounded-2xl p-8 md:p-12 flex flex-col items-center justify-center text-center transition-all duration-300 ${
                  isDragOver ? 'drag-over' : ''
                } ${file ? 'border-[#ddbc76]/30 bg-[#ddbc76]/5' : ''}`}
              >
                {!file ? (
                  <>
                    <div className="w-16 h-16 rounded-2xl glass-card flex items-center justify-center mb-4">
                      <Upload className="w-7 h-7 text-gray-400" />
                    </div>
                    <p className="text-lg font-bold text-white mb-1">
                      {lang === 'th' ? 'ลากไฟล์มาวางตรงนี้' : 'Drag & Drop your video here'}
                    </p>
                    <p className="text-sm text-gray-500 mb-4">
                      {lang === 'th' ? 'หรือกดปุ่มด้านล่างเพื่อเลือกไฟล์' : 'or click the button below to browse'}
                    </p>
                    <label className="cursor-pointer">
                      <div className="px-6 py-3 btn-glass rounded-xl text-sm flex items-center gap-2 hover:border-[#ddbc76]/30 hover:text-[#ddbc76] transition-all">
                        <FileVideo className="w-4 h-4" /> {t("dash.browse")}
                      </div>
                      <input type="file" accept="video/mp4" className="hidden" onChange={handleFileChange} />
                    </label>
                    <p className="text-[10px] text-gray-600 mt-3">
                      {lang === 'th' 
                        ? `รองรับ MP4 • สูงสุด ${usageInfo?.role === 'partner' ? 500 : (usageInfo?.role === 'premium' ? 100 : 30)}MB (${(!usageInfo || usageInfo.role === 'free') ? '1080p' : '4K'})` 
                        : `MP4 supported • Max ${usageInfo?.role === 'partner' ? 500 : (usageInfo?.role === 'premium' ? 100 : 30)}MB (${(!usageInfo || usageInfo.role === 'free') ? '1080p' : '4K'})`
                      }
                    </p>
                  </>
                ) : (
                  <div className="flex items-center gap-4 w-full">
                    <div className="w-14 h-14 rounded-xl glass-card flex items-center justify-center shrink-0">
                      {isComplete ? (
                        <CheckCircle className="w-6 h-6 text-green-400" />
                      ) : (
                        <FileVideo className="w-6 h-6 text-[#ddbc76]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">{file.name}</p>
                      <p className="text-xs text-gray-400">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                      {isComplete && (
                        <p className="text-xs text-green-400 font-bold mt-1 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> {lang === 'th' ? 'สำเร็จ! ไฟล์ถูกดาวน์โหลดแล้ว' : 'Done! File downloaded'}
                        </p>
                      )}
                    </div>
                    <label className="cursor-pointer shrink-0">
                      <div className="px-4 py-2 btn-glass rounded-lg text-xs">
                        {lang === 'th' ? 'เปลี่ยนไฟล์' : 'Change'}
                      </div>
                      <input type="file" accept="video/mp4" className="hidden" onChange={handleFileChange} />
                    </label>
                  </div>
                )}
              </div>

              {/* Mode Selector (for Smooth tab) */}
              {activeTab === 'smooth' && (
                <div className="mt-6 grid grid-cols-2 gap-4">
                  <div className="glass-gold rounded-xl p-5 flex flex-col items-center cursor-pointer relative overflow-hidden">
                    <Zap className="w-5 h-5 text-[#ddbc76] mb-2" />
                    <h3 className="text-lg font-black text-white">60 FPS</h3>
                    <p className="text-xs font-bold text-gray-300">Smooth Balanced</p>
                  </div>
                  <div className="glass-card rounded-xl p-5 flex flex-col items-center opacity-40 cursor-not-allowed">
                    <Music className="w-5 h-5 text-gray-400 mb-2" />
                    <h3 className="text-lg font-black text-gray-400">120 FPS</h3>
                    <p className="text-xs font-bold text-gray-500">Not available on web</p>
                  </div>
                </div>
              )}

              {/* File Info (for Quality tab) */}
              {activeTab === 'quality' && file && (
                <div className="mt-6 space-y-6">
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { label: t("dash.size"), value: `${(file.size / (1024 * 1024)).toFixed(2)} MB` },
                      { label: t("dash.format"), value: file.type || 'video/mp4' },
                      { label: t("compare.quality"), value: t("dash.max") },
                    ].map((item, i) => (
                      <div key={i} className="glass-card rounded-xl p-4 text-center">
                        <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-1">{item.label}</p>
                        <p className="text-sm font-bold text-white">{item.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Partner Compression Slider */}
                  <div className={`glass-card rounded-[24px] p-6 relative overflow-hidden ${usageInfo?.role !== 'partner' ? 'opacity-50 pointer-events-none' : 'border-blue-500/30'}`}>
                     {usageInfo?.role !== 'partner' && (
                       <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/60 backdrop-blur-[2px]">
                          <Shield className="w-8 h-8 text-blue-400 mb-2" />
                          <p className="text-sm font-bold text-white">Partner Only Feature</p>
                       </div>
                     )}
                     <div className="flex items-center justify-between mb-4">
                        <div>
                          <h4 className="text-white font-bold flex items-center gap-2">
                             <Settings className="w-4 h-4 text-blue-400" />
                             {lang === 'th' ? 'บีบอัดขนาดไฟล์' : 'Compress File Size'}
                          </h4>
                          <p className="text-[10px] text-gray-400 mt-1">
                             {lang === 'th' ? 'เลื่อนเพื่อกำหนดขนาดไฟล์ MB ที่ต้องการ' : 'Adjust slider to set target MB'}
                          </p>
                        </div>
                        <div className="text-xl font-black text-blue-400">
                           {targetSizeMB} <span className="text-sm text-gray-400">MB</span>
                        </div>
                     </div>
                     <input 
                       type="range" 
                       min="1" 
                       max={Math.ceil(file.size / (1024 * 1024))} 
                       step="0.1"
                       value={targetSizeMB}
                       onChange={(e) => setTargetSizeMB(parseFloat(e.target.value))}
                       className="w-full accent-blue-500 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer"
                     />
                  </div>
                </div>
              )}

              {/* Error */}
              {errorMsg && (
                <p className="mt-4 text-red-400 text-sm font-bold bg-red-500/10 px-4 py-3 rounded-xl border border-red-500/20">
                  {errorMsg}
                </p>
              )}

              {/* Progress Bar */}
              {isProcessing && (
                <div className="mt-6">
                  <div className="flex justify-between text-xs mb-2">
                    <span className="text-gray-400 font-bold">{t("dash.patching")}</span>
                    <span className="text-[#ddbc76] font-black">{progress}%</span>
                  </div>
                  <div className="w-full h-2 glass-card rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full bg-gradient-to-r from-[#7e22ce] via-[#6366f1] to-[#ddbc76] transition-all duration-300 relative"
                      style={{ width: `${progress}%` }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                    </div>
                  </div>
                </div>
              )}

              {/* Action Button */}
              <button 
                onClick={processVideo}
                disabled={isProcessing || !file || (activeTab !== 'smooth' && !isReady)}
                className="mt-6 w-full py-5 rounded-2xl font-black text-lg transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed relative overflow-hidden group
                  bg-gradient-to-r from-[#ddbc76] to-[#aa8323] text-black hover:shadow-[0_0_40px_rgba(221,188,118,0.4)] hover:-translate-y-0.5"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer" />
                {isProcessing ? (
                  <span className="flex items-center justify-center gap-2 relative z-10">
                    <Loader2 className="animate-spin w-5 h-5"/> {t("dash.patching")} {progress}%
                  </span>
                ) : (!isReady && activeTab !== 'smooth') ? (
                  <span className="relative z-10">{t("dash.loading")}</span>
                ) : (
                  <span className="relative z-10">{activeTab === 'quality' ? t("dash.init") : "START CONVERSION"}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
