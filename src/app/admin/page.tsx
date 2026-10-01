"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Minus, RefreshCcw, Users, Crown, Shield, BarChart3, Search, Edit2, Lock, Save, Trash2, Calendar } from "lucide-react";
import Link from "next/link";

type UserUsage = {
  discord_id: string;
  role: string;
  usage_count: number;
  last_reset_date: string;
  premium_since: string | null;
  bonus_days: number;
};

export default function AdminDashboard() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  const [users, setUsers] = useState<UserUsage[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState("");
  const [editUsage, setEditUsage] = useState(0);
  const [editPremiumSince, setEditPremiumSince] = useState("");
  const [editBonusDays, setEditBonusDays] = useState(0);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/admin", {
        headers: { "Authorization": `Bearer ${password}` }
      });
      if (res.ok) {
        setIsAuthenticated(true);
        const data = await res.json();
        setUsers(data.users || []);
      } else {
        setErrorMsg("รหัสผ่านไม่ถูกต้อง (Incorrect Password)");
      }
    } catch (err) {
      setErrorMsg("Error connecting to server");
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin", {
        headers: { "Authorization": `Bearer ${password}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const apiAction = async (action: string, discord_id: string, payload: any = {}) => {
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${password}` 
        },
        body: JSON.stringify({ action, discord_id, ...payload }),
      });
      if (res.ok) {
        fetchUsers();
      } else {
        alert("Failed to perform action");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleResetQuota = (discord_id: string) => apiAction("reset_quota", discord_id);
  const handleUpdateBonus = (discord_id: string, current_bonus: number, add: number) => apiAction("update_bonus", discord_id, { bonus_days: current_bonus + add });
  const handleSaveEdit = async () => {
    if (!editingUserId) return;
    await apiAction("update_role", editingUserId, { role: editRole });
    await apiAction("update_usage", editingUserId, { usage_count: editUsage });
    await apiAction("update_bonus", editingUserId, { bonus_days: editBonusDays });
    if (editRole === 'premium' && editPremiumSince) {
      await apiAction("update_premium_since", editingUserId, { premium_since: editPremiumSince });
    }
    setEditingUserId(null);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#06040A] text-white p-4 relative overflow-hidden">
        <div className="orb orb-purple w-[400px] h-[400px] top-[-10%] left-[-5%] animate-pulse-glow" />
        <div className="glass-card rounded-[28px] p-8 md:p-12 w-full max-w-md text-center relative z-10 border border-white/10 shadow-2xl">
          <div className="w-16 h-16 bg-[#ddbc76]/10 text-[#ddbc76] rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Lock className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-black mb-2">ADMIN LOGIN</h1>
          <p className="text-gray-400 mb-8 text-sm">กรุณาใส่รหัสผ่านเพื่อเข้าสู่ระบบจัดการ</p>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter Password" 
              className="w-full px-5 py-4 bg-black/50 border border-white/10 rounded-xl text-center text-xl tracking-widest focus:outline-none focus:border-[#ddbc76] transition-colors"
              required
            />
            {errorMsg && <p className="text-red-400 text-sm font-bold">{errorMsg}</p>}
            <button type="submit" disabled={loading} className="w-full btn-gold py-4 rounded-xl font-bold text-black text-lg">
              {loading ? "กำลังตรวจสอบ..." : "เข้าสู่ระบบ"}
            </button>
          </form>
          <Link href="/" className="inline-block mt-6 text-gray-500 hover:text-white text-sm transition">
            กลับหน้าหลัก (Back to Home)
          </Link>
        </div>
      </div>
    );
  }

  const totalUsers = users.length;
  const premiumUsers = users.filter(u => u.role === 'premium').length;
  const freeUsers = users.filter(u => u.role === 'free').length;
  const totalUsage = users.reduce((sum, u) => sum + u.usage_count, 0);
  const filteredUsers = users.filter(u => u.discord_id.includes(searchQuery));

  return (
    <div className="min-h-screen bg-[#06040A] text-white p-4 md:p-8 font-sans relative">
      <div className="orb orb-purple w-[400px] h-[400px] top-[-10%] right-[-5%] animate-pulse-glow" />
      <div className="orb orb-blue w-[300px] h-[300px] bottom-[-10%] left-[-5%] animate-pulse-glow" style={{ animationDelay: "2s" }} />

      <div className="max-w-7xl mx-auto relative z-10">
        <header className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 gap-4">
          <div className="animate-fade-in">
            <h1 className="text-3xl md:text-4xl font-black tracking-tighter mb-1">
              ADMIN <span className="text-red-500">PANEL</span>
            </h1>
            <p className="text-gray-400 text-sm">Manage user quotas and premium expiration</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <input 
                type="text" 
                placeholder="Search Discord ID..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-4 py-3 pl-10 glass rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#ddbc76]/50 transition w-full sm:w-64 text-sm"
              />
              <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-gray-500" />
            </div>
            <button onClick={fetchUsers} className="px-5 py-3 glass-purple text-[#a78bfa] rounded-xl hover:shadow-[0_0_20px_rgba(126,34,206,0.2)] flex items-center gap-2 font-bold text-sm">
              <RefreshCcw className="w-4 h-4" /> Refresh
            </button>
            <Link href="/" className="px-5 py-3 btn-glass rounded-xl flex items-center gap-2 font-bold text-sm">
              <ArrowLeft className="w-4 h-4" /> Dashboard
            </Link>
          </div>
        </header>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 animate-fade-in-up">
          {[
            { icon: <Users className="w-5 h-5" />, label: "Total Users", value: totalUsers, color: "#3b82f6" },
            { icon: <Crown className="w-5 h-5" />, label: "Premium", value: premiumUsers, color: "#ddbc76" },
            { icon: <Shield className="w-5 h-5" />, label: "Free", value: freeUsers, color: "#a1a1aa" },
            { icon: <BarChart3 className="w-5 h-5" />, label: "Total Usage", value: totalUsage, color: "#7e22ce" },
          ].map((stat, i) => (
            <div key={i} className="glass-card rounded-2xl p-5 group hover:border-white/15 transition-all">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110" style={{ background: `${stat.color}15`, color: stat.color }}>
                  {stat.icon}
                </div>
                <span className="text-xs uppercase tracking-widest text-gray-500 font-bold">{stat.label}</span>
              </div>
              <p className="text-3xl font-black" style={{ color: stat.color }}>{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="glass-card rounded-[24px] overflow-x-auto animate-fade-in-up">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-black/30 text-xs uppercase tracking-widest text-gray-400 border-b border-white/5">
                <th className="p-5 font-bold">Discord ID</th>
                <th className="p-5 font-bold">Role & Status</th>
                <th className="p-5 font-bold">Usage Quota</th>
                <th className="p-5 font-bold">Bonus Days</th>
                <th className="p-5 font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredUsers.map((u) => (
                <tr key={u.discord_id} className="hover:bg-white/[0.03] transition-all duration-200">
                  <td className="p-5 font-mono text-sm text-gray-300">{u.discord_id}</td>
                  
                  {/* Role Column */}
                  <td className="p-5">
                    {editingUserId === u.discord_id ? (
                      <div className="flex flex-col gap-2">
                        <select 
                          value={editRole} 
                          onChange={(e) => setEditRole(e.target.value)}
                          className="bg-black border border-[#ddbc76] text-[#ddbc76] font-bold px-3 py-1.5 rounded-lg focus:outline-none w-max"
                        >
                          <option value="free">FREE</option>
                          <option value="premium">PREMIUM</option>
                          <option value="partner">PARTNER</option>
                        </select>
                        {editRole === 'premium' && (
                          <div className="mt-1 flex flex-col gap-1">
                            <span className="text-xs text-gray-400 font-bold">เลือกวันเริ่มนับ 30 วัน:</span>
                            <input type="datetime-local" value={editPremiumSince ? new Date(editPremiumSince).toISOString().slice(0, 16) : ''} onChange={(e) => setEditPremiumSince(new Date(e.target.value).toISOString())} className="bg-black border border-[#ddbc76] rounded-lg px-2 py-1.5 text-white w-max text-xs"/>
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className={`px-3 py-1.5 text-[10px] font-black rounded-full tracking-wider uppercase inline-flex items-center gap-1.5 ${
                        u.role === 'premium' ? 'glass-gold text-[#ddbc76]' : u.role === 'partner' ? 'glass-blue text-blue-400' : 'glass text-gray-400'
                      }`}>
                        {u.role === 'premium' ? <Crown className="w-3 h-3"/> : null}
                        {u.role}
                      </span>
                    )}
                    {u.role === 'premium' && editingUserId !== u.discord_id && (
                      <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" /> 
                        หมดอายุ: {u.premium_since ? new Date(new Date(u.premium_since).getTime() + (30 + u.bonus_days) * 24 * 60 * 60 * 1000).toLocaleDateString('th-TH') : 'N/A'}
                      </div>
                    )}
                  </td>

                  {/* Usage Column */}
                  <td className="p-5">
                    {editingUserId === u.discord_id ? (
                      <div className="flex items-center gap-2">
                        <input type="number" value={editUsage} onChange={(e) => setEditUsage(parseInt(e.target.value))} className="w-16 bg-black border border-[#ddbc76] rounded-lg px-2 py-1 text-center font-bold text-white"/>
                        <span className="text-gray-500">/ {u.role === 'premium' ? 5 : u.role === 'partner' ? '∞' : 3}</span>
                      </div>
                    ) : (
                      <div className="w-32">
                        <div className="flex justify-between text-xs mb-1">
                          <span className={u.usage_count >= (u.role === 'premium' ? 5 : 3) ? "text-red-400 font-bold" : "text-gray-300"}>
                            {u.usage_count} / {u.role === 'premium' ? 5 : u.role === 'partner' ? '∞' : 3}
                          </span>
                        </div>
                        <div className="w-full h-1.5 glass rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${Math.min((u.usage_count / (u.role === 'premium' ? 5 : 3)) * 100, 100)}%`, background: u.usage_count >= (u.role === 'premium' ? 5 : 3) ? '#ef4444' : '#ddbc76' }} />
                        </div>
                      </div>
                    )}
                  </td>

                  {/* Bonus Days Column */}
                  <td className="p-5">
                    <div className="flex items-center gap-3">
                      {editingUserId === u.discord_id ? (
                        <div className="flex items-center gap-2">
                          <input type="number" value={editBonusDays} onChange={(e) => setEditBonusDays(parseInt(e.target.value))} className="w-16 bg-black border border-[#ddbc76] rounded-lg px-2 py-1 text-center font-bold text-white"/>
                          <span className="text-xs text-gray-500">วันแถม</span>
                        </div>
                      ) : (
                        <span className={`font-mono text-lg font-black ${u.bonus_days > 0 ? 'text-green-400' : u.bonus_days < 0 ? 'text-red-400' : 'text-gray-500'}`}>
                          {u.bonus_days > 0 ? '+' : ''}{u.bonus_days}
                        </span>
                      )}
                      
                      {u.role === 'premium' && editingUserId !== u.discord_id && (
                        <div className="flex flex-wrap gap-1.5 max-w-[120px]">
                          <button onClick={() => handleUpdateBonus(u.discord_id, u.bonus_days, -1)} className="px-2 py-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white text-[10px] font-bold border border-red-500/20">-1 วัน</button>
                          <button onClick={() => handleUpdateBonus(u.discord_id, u.bonus_days, 1)} className="px-2 py-1 rounded bg-green-500/10 text-green-400 hover:bg-green-500 hover:text-white text-[10px] font-bold border border-green-500/20">+1 วัน</button>
                          <button onClick={() => handleUpdateBonus(u.discord_id, u.bonus_days, 7)} className="px-2 py-1 rounded bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white text-[10px] font-bold border border-blue-500/20">+7 วัน</button>
                          <button onClick={() => handleUpdateBonus(u.discord_id, u.bonus_days, 30)} className="px-2 py-1 rounded bg-purple-500/10 text-purple-400 hover:bg-purple-500 hover:text-white text-[10px] font-bold border border-purple-500/20">+30 วัน</button>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Actions Column */}
                  <td className="p-5">
                    <div className="flex items-center gap-2">
                      {editingUserId === u.discord_id ? (
                        <button onClick={handleSaveEdit} className="px-3 py-2 bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg hover:bg-green-500 hover:text-white transition flex items-center gap-1 text-xs font-bold">
                          <Save className="w-4 h-4"/> Save
                        </button>
                      ) : (
                        <button onClick={() => { setEditingUserId(u.discord_id); setEditRole(u.role); setEditUsage(u.usage_count); setEditPremiumSince(u.premium_since || ''); setEditBonusDays(u.bonus_days || 0); }} className="p-2 bg-white/5 text-gray-400 border border-white/10 rounded-lg hover:bg-white/20 hover:text-white transition">
                          <Edit2 className="w-4 h-4"/>
                        </button>
                      )}
                      
                      <button onClick={() => handleResetQuota(u.discord_id)} className="px-3 py-2 btn-glass text-xs font-bold rounded-lg flex items-center gap-1.5 hover:text-white transition">
                        <RefreshCcw className="w-3.5 h-3.5" /> Reset
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
