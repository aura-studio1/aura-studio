"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Language = "th" | "en";

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  th: {
    "nav.login": "เข้าสู่ระบบ",
    "hero.badge": "ระบบปรับแต่งวิดีโอระดับไบนารี",
    "hero.title": "อัพโหลดคลิปคุณภาพ",
    "hero.subtitle": "1080p 60fps Max quality",
    "hero.button": "ล็อคอินเพื่อใช้งาน",
    "hero.buttonSub": "LOGIN TO START",
    "creators.title": "ครีเอเตอร์ที่เข้าร่วมใช้งาน",
    "creators.desc": "สตรีมเมอร์และช่อง TikTok ชั้นนำเลือกใช้ AURA เพื่อรักษาคุณภาพวิดีโอ 60fps ให้คมชัดที่สุด",
    "creators.c1": "ตั้งแต่ใช้ AURA คลิปไฮไลท์เกมผมชัดทะลุจอ ยอดวิวพุ่งเพราะภาพไม่แตกเลยครับ",
    "creators.c2": "หมดปัญหาอัปโหลดคลิปเต้นแล้วเบลอ 60fps สมูทมากเหมือนดูสดๆ เลย",
    "creators.c3": "เป็นเครื่องมือที่สตรีมเมอร์ทุกคนต้องมี ตัดต่อมาคมแค่ไหน ลงคลิปก็ยังคมกริบ 100%",
    "compare.title": "เห็นความต่างชัดเจน",
    "compare.titleSub": "แบบช็อตต่อช็อต",
    "compare.desc": "วิดีโอปกติที่โดน TikTok บีบอัด vs วิดีโอที่ผ่าน AURA Enhanced",
    "compare.standard": "วิดีโอปกติ",
    "compare.enhanced": "AURA ปรับแต่ง",
    "compare.resolution": "ความละเอียด",
    "compare.framerate": "เฟรมเรต",
    "compare.quality": "คุณภาพ",
    "compare.compressed": "ถูกบีบอัด",
    "compare.lossless": "คมชัดสูงสุด",
    "compare.note": "ปรับแต่งระดับไบนารี • ไม่ Re-encode • ประมวลผลรวดเร็ว",
    "feat1.title": "แปลงไฟล์ทันที",
    "feat1.desc": "เนื่องจากเราไม่มีการ Re-encode วิดีโอ การแปลงไฟล์จึงใช้เวลาเพียงไม่กี่วินาทีบนหน้าเบราว์เซอร์ของคุณ",
    "feat2.title": "ปลอดภัย 100%",
    "feat2.desc": "ทุกอย่างประมวลผลในเครื่องของคุณ (Local) ไม่มีการอัปโหลดวิดีโอส่วนตัวของคุณขึ้นเซิร์ฟเวอร์ของเรา",
    "feat3.title": "ระบบจัดการสิทธิ์",
    "feat3.desc": "สงวนสิทธิ์เฉพาะสมาชิกเท่านั้น เข้าใช้งานผ่าน Discord ระบบจะตรวจสอบยศ (Role) ของคุณโดยอัตโนมัติ",
    "pricing.title": "เลือกแพ็กเกจที่เหมาะกับคุณ",
    "pricing.desc": "ทดลองประสิทธิภาพการต้มไฟล์ระดับไบนารีก่อนตัดสินใจ อัปเกรดเพื่อปลดล็อกขีดจำกัดทั้งหมด",
    "pricing.free": "ทดลองใช้งาน (Free Trial)",
    "pricing.trial": "สัปดาห์",
    "pricing.freeDesc": "สำหรับผู้เริ่มต้นที่ต้องการทดสอบความคมชัดของ AURA",
    "pricing.freeFeat1": "ระยะเวลาใช้งาน 7 วัน",
    "pricing.freeFeat2": "โควต้าแปลงไฟล์สูงสุด 3 คลิป",
    "pricing.freeBtn": "ล็อกอินและทดลองใช้ฟรี",
    "pricing.premium": "AURA Premium",
    "pricing.month": "เดือน",
    "pricing.premiumDesc": "ปลดล็อกขีดจำกัดทั้งหมด สำหรับครีเอเตอร์ที่ต้องการความสมบูรณ์แบบ",
    "pricing.premiumFeat1": "แปลงไฟล์ได้ไม่จำกัดจำนวนคลิป",
    "pricing.premiumFeat2": "รับสิทธิ์ใช้งาน AURA Chrome Extension",
    "pricing.premiumFeat3": "ใส่แผ่นเสียงบน TikTok Web (ไม่โดนบีบอัด)",
    "pricing.premiumBtn": "สมัครสมาชิก Premium",
    "dash.premium": "สมาชิกพรีเมียม",
    "dash.exp": "หมดอายุ",
    "dash.smooth": "เร่งเฟรมเรต (Smooth FPS)",
    "dash.quality": "AURA Quality (แปลงไฟล์)",
    "dash.vpn": "VPN Helper",
    "dash.settings": "ตั้งค่า",
    "dash.logout": "ออกจากระบบ",
    "dash.select": "เลือกวิดีโอ",
    "dash.browse": "ค้นหาไฟล์วิดีโอ",
    "dash.info": "ข้อมูลวิดีโอ",
    "dash.size": "ขนาดไฟล์",
    "dash.format": "รูปแบบไฟล์",
    "dash.max": "สูงสุด (ต้นฉบับ)",
    "dash.est": "ขนาดโดยประมาณ",
    "dash.init": "เริ่มต้นแปลงไฟล์",
    "dash.loading": "กำลังโหลดเอนจิน...",
    "dash.patching": "กำลังปรับแต่ง",
    "dash.limit": "ไฟล์เกินขนาดที่กำหนด (100MB)",
    "dash.error": "เกิดข้อผิดพลาดในการแปลงไฟล์"
  },
  en: {
    "nav.login": "Login with Discord",
    "hero.badge": "Binary-Level MP4 Patcher",
    "hero.title": "Upload Videos at",
    "hero.subtitle": "1080p 60fps Max quality",
    "hero.button": "LOGIN TO START",
    "hero.buttonSub": "AUTHORIZE WITH DISCORD",
    "creators.title": "Participating Creators",
    "creators.desc": "Leading streamers and TikTok channels choose AURA to maintain the sharpest 60fps video quality.",
    "creators.c1": "Since using AURA, my gaming highlights are crystal clear. Views are up because there's no pixelation!",
    "creators.c2": "No more blurry dance videos. 60fps is incredibly smooth, it feels like watching a live stream.",
    "creators.c3": "A must-have tool for streamers. No matter how sharp you edit, uploads stay 100% crisp.",
    "compare.title": "See the difference.",
    "compare.titleSub": "Side by side.",
    "compare.desc": "TikTok's compressed output vs AURA's enhanced version",
    "compare.standard": "TikTok Standard",
    "compare.enhanced": "AURA Enhanced",
    "compare.resolution": "Resolution",
    "compare.framerate": "Frame Rate",
    "compare.quality": "Quality",
    "compare.compressed": "Compressed",
    "compare.lossless": "Lossless",
    "compare.note": "Binary-level patch • No re-encode • Fast processing",
    "feat1.title": "Instant Patching",
    "feat1.desc": "Because we don't re-encode your video, the patching process takes only seconds right in your browser.",
    "feat2.title": "100% Secure",
    "feat2.desc": "Everything happens locally on your device via WebAssembly. We never upload your videos to our servers.",
    "feat3.title": "Role Based Access",
    "feat3.desc": "Exclusive tool reserved for our community. Log in with Discord to verify your premium access automatically.",
    "pricing.title": "Choose your plan",
    "pricing.desc": "Experience the binary-level patching power before you commit. Upgrade to unlock all features.",
    "pricing.free": "Free Trial",
    "pricing.trial": "week",
    "pricing.freeDesc": "For creators who want to test AURA's capability.",
    "pricing.freeFeat1": "7 days access",
    "pricing.freeFeat2": "Maximum 3 video patches",
    "pricing.freeBtn": "Login and start free trial",
    "pricing.premium": "AURA Premium",
    "pricing.month": "month",
    "pricing.premiumDesc": "Unlock all limits. For professional creators who demand perfection.",
    "pricing.premiumFeat1": "Unlimited video patching",
    "pricing.premiumFeat2": "Access to AURA Chrome Extension",
    "pricing.premiumFeat3": "Add TikTok trending music via Web without compression",
    "pricing.premiumBtn": "Subscribe to Premium",
    "dash.premium": "PREMIUM MEMBER",
    "dash.exp": "EXP",
    "dash.smooth": "Smooth FPS",
    "dash.quality": "AURA Quality",
    "dash.vpn": "VPN Helper",
    "dash.settings": "Settings",
    "dash.logout": "Logout",
    "dash.select": "Select Media",
    "dash.browse": "BROWSE FILES",
    "dash.info": "Stream Info",
    "dash.size": "File Size",
    "dash.format": "Format",
    "dash.max": "Max (Original)",
    "dash.est": "Estimated Size",
    "dash.init": "INITIALIZE",
    "dash.loading": "LOADING ENGINE...",
    "dash.patching": "PATCHING",
    "dash.limit": "File exceeds 100MB limit",
    "dash.error": "Error processing video"
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Language>("th");

  useEffect(() => {
    const saved = localStorage.getItem("fala_lang") as Language;
    if (saved && (saved === "th" || saved === "en")) {
      setLang(saved);
    }
  }, []);

  const handleSetLang = (newLang: Language) => {
    setLang(newLang);
    localStorage.setItem("fala_lang", newLang);
  };

  const t = (key: string) => {
    return translations[lang]?.[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang: handleSetLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
