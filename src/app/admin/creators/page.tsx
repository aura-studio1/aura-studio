"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { ArrowLeft, Plus, Trash2, Save, X, ExternalLink, Image as ImageIcon, Edit2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Creator = {
  id: string;
  image_url: string;
  tiktok_url: string;
  color: string;
  glow_class: string;
  order_index: number;
};

export default function CreatorsAdmin() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [imageUrl, setImageUrl] = useState("");
  const [tiktokUrl, setTiktokUrl] = useState("");
  const [color, setColor] = useState("#ddbc76");
  const [glowClass, setGlowClass] = useState("glass-gold");

  useEffect(() => {
    // @ts-ignore
    if (status === "unauthenticated" || (status === "authenticated" && session?.user?.role !== "partner")) {
      router.push("/");
    } else if (status === "authenticated") {
      fetchCreators();
    }
  }, [status, session]);

  const fetchCreators = async () => {
    try {
      const res = await fetch("/api/creators");
      const data = await res.json();
      if (Array.isArray(data)) setCreators(data);
    } catch (error) {
      console.error("Failed to fetch", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("ลบครีเอเตอร์นี้ใช่หรือไม่?")) return;
    try {
      await fetch(`/api/creators?id=${id}`, { method: "DELETE" });
      setCreators(creators.filter(c => c.id !== id));
    } catch (error) {
      console.error("Delete failed", error);
    }
  };
  
  const openEditModal = (c: Creator) => {
    setEditingId(c.id);
    setImageUrl(c.image_url);
    setTiktokUrl(c.tiktok_url);
    setColor(c.color);
    setGlowClass(c.glow_class);
    setIsModalOpen(true);
  };
  
  const openAddModal = () => {
    setEditingId(null);
    setImageUrl("");
    setTiktokUrl("");
    setColor("#ddbc76");
    setGlowClass("glass-gold");
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        // Edit Mode
        const res = await fetch("/api/creators", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingId,
            image_url: imageUrl,
            tiktok_url: tiktokUrl,
            color,
            glow_class: glowClass,
            order_index: creators.find(c => c.id === editingId)?.order_index || 0
          }),
        });
        if (res.ok) {
          const updatedCreator = await res.json();
          setCreators(creators.map(c => c.id === editingId ? updatedCreator : c));
          setIsModalOpen(false);
        } else {
           alert("เกิดข้อผิดพลาดในการอัปเดต กรุณาลองใหม่");
        }
      } else {
        // Add Mode
        const res = await fetch("/api/creators", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image_url: imageUrl,
            tiktok_url: tiktokUrl,
            color,
            glow_class: glowClass,
            order_index: creators.length
          }),
        });
        if (res.ok) {
          const newCreator = await res.json();
          setCreators([newCreator, ...creators]);
          setIsModalOpen(false);
        } else {
           alert("เกิดข้อผิดพลาดในการบันทึก กรุณาลองใหม่");
        }
      }
    } catch (error) {
      console.error("Save failed", error);
    } finally {
      setSaving(false);
    }
  };

  if (loading || status === "loading") {
    return <div className="min-h-screen bg-[#06040A] flex items-center justify-center text-white">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-[#06040A] text-white p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/" className="text-gray-400 hover:text-white flex items-center gap-2 mb-2 text-sm">
              <ArrowLeft className="w-4 h-4" /> กลับหน้าแรก
            </Link>
            <h1 className="text-3xl font-black text-gradient-gold">ระบบจัดการ Creators</h1>
          </div>
          <button 
            onClick={openAddModal}
            className="btn-gold px-6 py-2.5 rounded-xl flex items-center gap-2 font-bold text-black"
          >
            <Plus className="w-5 h-5" /> เพิ่มช่องใหม่
          </button>
        </div>

        {/* Grid List */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {creators.map((c) => (
            <div key={c.id} className={`p-4 rounded-2xl ${c.glow_class} relative overflow-hidden group border border-white/5 flex flex-col`}>
               <div className="w-full aspect-square rounded-xl overflow-hidden bg-black mb-4 border border-white/10 relative">
                  <img src={c.image_url} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                     <button onClick={() => openEditModal(c)} className="bg-white/20 hover:bg-white/40 p-3 rounded-full text-white backdrop-blur">
                        <Edit2 className="w-5 h-5" />
                     </button>
                  </div>
               </div>
               <div className="flex items-center justify-between mt-auto">
                  <a href={c.tiktok_url} target="_blank" className="text-sm font-bold text-gray-300 hover:text-white flex items-center gap-1 truncate w-2/3">
                     <ExternalLink className="w-4 h-4" /> ดูช่อง
                  </a>
                  <div className="flex items-center gap-2">
                     <button onClick={() => openEditModal(c)} className="p-2 bg-white/5 text-gray-400 hover:text-white hover:bg-white/20 rounded-lg transition">
                        <Edit2 className="w-4 h-4" />
                     </button>
                     <button onClick={() => handleDelete(c.id)} className="p-2 bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition">
                        <Trash2 className="w-4 h-4" />
                     </button>
                  </div>
               </div>
            </div>
          ))}
          {creators.length === 0 && (
            <div className="col-span-full py-12 text-center text-gray-500 border border-white/5 border-dashed rounded-2xl">
               ยังไม่มีครีเอเตอร์ กดปุ่ม "เพิ่มช่องใหม่"
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#0A0710] border border-white/10 rounded-2xl p-6 shadow-2xl relative">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white">
               <X className="w-6 h-6" />
            </button>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
               {editingId ? <><Edit2 className="w-6 h-6 text-[#ddbc76]" /> แก้ไขข้อมูล</> : <><ImageIcon className="w-6 h-6 text-[#ddbc76]" /> เพิ่มรูป TikTok ใหม่</>}
            </h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-400 mb-1">ลิงก์รูปภาพ (Image URL)</label>
                <input 
                  type="url" required
                  value={imageUrl} onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://cdn.discordapp.com/attachments/.../image.png"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#ddbc76]"
                />
                <p className="text-[10px] text-gray-500 mt-1">แนะนำ: เอาไฟล์รูปไปอัปโหลดใส่ Discord แล้วคลิกขวาคัดลอกลิงก์มาวาง</p>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-400 mb-1">ลิงก์หน้า TikTok (TikTok URL)</label>
                <input 
                  type="url" required
                  value={tiktokUrl} onChange={(e) => setTiktokUrl(e.target.value)}
                  placeholder="https://www.tiktok.com/@username"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#ddbc76]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-sm font-bold text-gray-400 mb-1">โทนสี (Color)</label>
                    <select value={color} onChange={(e) => setColor(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#ddbc76]">
                       <option value="#ddbc76">ทอง (#ddbc76)</option>
                       <option value="#3b82f6">น้ำเงิน (#3b82f6)</option>
                       <option value="#7e22ce">ม่วง (#7e22ce)</option>
                    </select>
                 </div>
                 <div>
                    <label className="block text-sm font-bold text-gray-400 mb-1">เอฟเฟกต์ (Glow)</label>
                    <select value={glowClass} onChange={(e) => setGlowClass(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#ddbc76]">
                       <option value="glass-gold">สีทอง (glass-gold)</option>
                       <option value="glass-card">สีเงิน/น้ำเงิน (glass-card)</option>
                       <option value="glass-purple">สีม่วง (glass-purple)</option>
                    </select>
                 </div>
              </div>
              
              <button disabled={saving} type="submit" className="w-full btn-gold py-3 rounded-xl font-bold text-black mt-4 flex items-center justify-center gap-2">
                {saving ? "กำลังบันทึก..." : <><Save className="w-5 h-5"/> บันทึก</>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
