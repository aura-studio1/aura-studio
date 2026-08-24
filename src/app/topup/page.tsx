"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, UploadCloud, X, Loader2, ArrowRight, ShieldCheck, Zap, Crown } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";

export default function TopupPage() {
  const { data: session } = useSession();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      if (selected.size > 5 * 1024 * 1024) {
        setErrorMessage("ไฟล์ใหญ่เกินไป (สูงสุด 5MB)");
        return;
      }
      setFile(selected);
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(selected);
      setErrorMessage("");
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setStatus("uploading");
    
    // Create FormData
    const formData = new FormData();
    formData.append("slip", file);
    
    try {
      const res = await fetch("/api/payment/verify", {
        method: "POST",
        body: formData,
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setStatus("success");
      } else {
        setStatus("error");
        setErrorMessage(data.message || "เกิดข้อผิดพลาดในการตรวจสอบสลิป");
      }
    } catch (err) {
      setStatus("error");
      setErrorMessage("ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้");
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-white selection:bg-purple-500/30 flex flex-col relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none" />
      
      {/* Navbar */}
      <nav className="w-full border-b border-white/5 bg-black/20 backdrop-blur-xl z-50 sticky top-0">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center shadow-lg shadow-purple-500/20 group-hover:shadow-purple-500/40 transition-all">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold tracking-tight text-lg">FALA BYPASS</span>
          </Link>
          
          <div className="flex items-center gap-4">
             {/* @ts-ignore */}
            {session?.user?.role === 'premium' && (
              <span className="px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-amber-400 text-xs font-semibold flex items-center gap-1.5 shadow-[0_0_15px_rgba(245,158,11,0.15)]">
                <Crown className="w-3.5 h-3.5" /> VIP MEMBER
              </span>
            )}
          </div>
        </div>
      </nav>

      <main className="flex-1 flex items-center justify-center p-6 relative z-10 py-12">
        <div className="max-w-5xl w-full grid md:grid-cols-2 gap-8 lg:gap-16 items-start">
          
          {/* Left Column: Pricing Info */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col gap-6"
          >
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-sm font-medium mb-6">
                <Crown className="w-4 h-4" /> ปลดล็อคขีดจำกัด
              </div>
              <h1 className="text-4xl lg:text-5xl font-bold tracking-tight mb-4 bg-gradient-to-br from-white to-white/60 bg-clip-text text-transparent">
                อัปเกรดเป็น VIP
              </h1>
              <p className="text-zinc-400 text-lg leading-relaxed">
                เข้าถึงการบีบอัดระดับสูงสุดที่ใช้ในแอปพลิเคชัน FALA BYPASS ต้นฉบับ บีบอัดวิดีโอคุณภาพสูงสุดแบบไม่จำกัด
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-zinc-900/50 border border-white/10 backdrop-blur-sm relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-end gap-2 mb-6">
                <span className="text-5xl font-bold">฿500</span>
                <span className="text-zinc-400 font-medium mb-1">/ เดือน</span>
              </div>
              
              <ul className="space-y-4 mb-8">
                {[
                  "ปลดล็อคการบีบอัดไฟล์ 4K ไม่จำกัดไซส์",
                  "อัลกอริทึมพรีเมียมจาก FALA BYPASS",
                  "ไม่มีลายน้ำหรือโฆษณาคั่น",
                  "ความเร็วประมวลผลสูงสุด (Priority Queue)"
                ].map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-purple-500 shrink-0" />
                    <span className="text-zinc-300">{feature}</span>
                  </li>
                ))}
              </ul>
              
              <div className="flex items-center gap-3 p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                <ShieldCheck className="w-6 h-6 text-purple-400" />
                <div className="text-sm">
                  <p className="text-purple-200 font-medium">ระบบอนุมัติสลิปอัตโนมัติ 24 ชม.</p>
                  <p className="text-purple-400/80">สแกนปุ๊บ ได้ยศ VIP ทันที ไม่ต้องรอแอดมิน</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right Column: Payment & Upload */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-col gap-6"
          >
            {status === "success" ? (
              <div className="h-full min-h-[500px] flex flex-col items-center justify-center p-8 text-center rounded-3xl bg-zinc-900/80 border border-green-500/30 backdrop-blur-xl relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-green-500/10 to-transparent" />
                <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mb-6">
                  <CheckCircle2 className="w-12 h-12 text-green-500" />
                </div>
                <h2 className="text-2xl font-bold mb-2">ทำรายการสำเร็จ!</h2>
                <p className="text-zinc-400 mb-8">ขอบคุณที่สนับสนุน ระบบได้อัปเกรดบัญชีของคุณเป็นระดับ VIP เรียบร้อยแล้ว</p>
                <Link href="/" className="px-8 py-3 rounded-xl bg-green-500 hover:bg-green-600 text-white font-medium transition-colors flex items-center gap-2">
                  กลับสู่หน้าหลัก <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ) : (
              <div className="p-8 rounded-3xl bg-zinc-900/80 border border-white/10 backdrop-blur-xl shadow-2xl flex flex-col items-center">
                
                <h3 className="text-xl font-semibold mb-6">สแกนเพื่อชำระเงิน</h3>
                
                {/* QR Code Placeholder */}
                <div className="w-56 h-56 bg-white p-2 rounded-2xl mb-8 relative group">
                  {/* TODO: Replace with real PromptPay QR */}
                  <div className="w-full h-full border-4 border-dashed border-zinc-200 rounded-xl flex items-center justify-center flex-col gap-2">
                    <span className="text-zinc-400 font-bold text-lg">PROMPTPAY</span>
                    <span className="text-zinc-400 text-sm text-center px-4">ใส่รูป QR 500 บ. ที่นี่</span>
                  </div>
                </div>
                
                <div className="w-full border-t border-white/10 pt-8">
                  <h4 className="text-sm font-medium text-zinc-400 mb-4 uppercase tracking-wider text-center">แนบสลิปโอนเงิน (ยอด 500.00 บาท)</h4>
                  
                  {!file ? (
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-zinc-700 hover:border-purple-500 hover:bg-purple-500/5 rounded-2xl cursor-pointer transition-all group">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <UploadCloud className="w-8 h-8 text-zinc-400 group-hover:text-purple-500 mb-3 transition-colors" />
                        <p className="text-sm text-zinc-400 group-hover:text-purple-400 transition-colors">
                          <span className="font-semibold">คลิกเพื่ออัปโหลด</span> หรือลากไฟล์มาวาง
                        </p>
                      </div>
                      <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                    </label>
                  ) : (
                    <div className="relative w-full rounded-2xl border border-white/10 overflow-hidden bg-black">
                      <img src={preview!} alt="Slip Preview" className="w-full h-48 object-cover opacity-60" />
                      <button 
                        onClick={() => { setFile(null); setPreview(null); setErrorMessage(""); }}
                        className="absolute top-2 right-2 w-8 h-8 bg-black/50 hover:bg-red-500 rounded-full flex items-center justify-center backdrop-blur-md transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black to-transparent">
                        <p className="text-sm font-medium truncate">{file.name}</p>
                      </div>
                    </div>
                  )}
                  
                  {errorMessage && (
                    <p className="text-red-400 text-sm mt-3 text-center flex items-center justify-center gap-1">
                      <X className="w-4 h-4" /> {errorMessage}
                    </p>
                  )}
                  
                  <button 
                    onClick={handleUpload}
                    disabled={!file || status === "uploading"}
                    className="w-full mt-6 py-4 rounded-xl bg-white text-black font-semibold hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                  >
                    {status === "uploading" ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" /> กำลังตรวจสอบสลิป...
                      </>
                    ) : (
                      "ยืนยันการชำระเงิน"
                    )}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
