"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowLeft, Plus, Minus, RefreshCcw, Users, Crown, Shield, BarChart3, Search } from "lucide-react";
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
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<UserUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const fetchUsers = async () => {
    console.log("Fetching users...");
    try {
      const res = await fetch("/api/admin");
      console.log("Fetch users res ok?", res.ok);
      if (res.ok) {
        const data = await res.json();
        console.log("Users fetched:", data.users?.length);
        setUsers(data.users || []);
      } else {
        const errData = await res.json();
        // @ts-ignore
        setErrorMsg(`Access Denied: ${errData.error} | Your ID: ${session?.user?.id} | Expected: ${process.env.NEXT_PUBLIC_ADMIN_DISCORD_ID}`);
      }
    } catch (err) {
      console.error("Fetch users error:", err);
      setErrorMsg(`Fetch error: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log("Admin page status:", status, "session:", session);
    
    if (status === "unauthenticated") {
      console.log("Redirecting to /");
      setErrorMsg("Status is unauthenticated. You are not logged in according to NextAuth.");
      setLoading(false);
    } else if (status === "authenticated") {
      fetchUsers();
    }
  }, [status, session]);

  const handleResetQuota = async (discord_id: string) => {
    // Optimistic update
    setUsers(users.map(u => u.discord_id === discord_id ? { ...u, usage_count: 0, last_reset_date: new Date().toISOString() } : u));
    
    try {
      await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset_quota", discord_id }),
      });
    } catch (err) {
      console.error(err);
      fetchUsers(); // revert on error
    }
  };

  const handleUpdateBonus = async (discord_id: string, current_bonus: number, add: number) => {
    const newBonus = current_bonus + add;
    // Optimistic update
    setUsers(users.map(u => u.discord_id === discord_id ? { ...u, bonus_days: newBonus } : u));

    try {
      await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_bonus", discord_id, bonus_days: newBonus }),
      });
    } catch (err) {
      console.error(err);
      fetchUsers(); // revert on error
    }
  };

  // Stats
  const totalUsers = users.length;
  const premiumUsers = users.filter(u => u.role === 'premium').length;
  const freeUsers = users.filter(u => u.role === 'free').length;
  const totalUsage = users.reduce((sum, u) => sum + u.usage_count, 0);
  const filteredUsers = users.filter(u => u.discord_id.includes(searchQuery));

  if (errorMsg) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#06040A] text-white">
        <div className="glass-card rounded-[28px] p-12 max-w-lg text-center">
          <h1 className="text-3xl font-bold text-red-400 mb-4">DEBUG INFO</h1>
          <p className="text-gray-400 mb-6 font-mono text-sm bg-white/5 p-4 rounded-xl">{errorMsg}</p>
          <Link href="/" className="px-6 py-3 btn-glass rounded-xl inline-flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#06040A] text-white p-4 md:p-8 font-sans relative">
      {/* Ambient Orbs */}
      <div className="orb orb-purple w-[400px] h-[400px] top-[-10%] right-[-5%] animate-pulse-glow" />
      <div className="orb orb-blue w-[300px] h-[300px] bottom-[-10%] left-[-5%] animate-pulse-glow" style={{ animationDelay: "2s" }} />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
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
                className="px-4 py-3 pl-10 glass rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#ddbc76]/50 focus:ring-1 focus:ring-[#ddbc76]/30 transition w-full sm:w-64 text-sm"
              />
              <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-gray-500" />
            </div>
            <button onClick={fetchUsers} className="px-5 py-3 glass-purple text-[#a78bfa] rounded-xl transition-all hover:shadow-[0_0_20px_rgba(126,34,206,0.2)] flex items-center gap-2 font-bold whitespace-nowrap text-sm">
              <RefreshCcw className="w-4 h-4" /> Refresh
            </button>
            <Link href="/" className="px-5 py-3 btn-glass rounded-xl flex items-center gap-2 font-bold whitespace-nowrap text-sm">
              <ArrowLeft className="w-4 h-4" /> Dashboard
            </Link>
          </div>
        </header>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 animate-fade-in-up">
          {[
            { icon: <Users className="w-5 h-5" />, label: "Total Users", value: totalUsers, color: "#3b82f6" },
            { icon: <Crown className="w-5 h-5" />, label: "Premium", value: premiumUsers, color: "#ddbc76" },
            { icon: <Shield className="w-5 h-5" />, label: "Free", value: freeUsers, color: "#a1a1aa" },
            { icon: <BarChart3 className="w-5 h-5" />, label: "Total Usage", value: totalUsage, color: "#7e22ce" },
          ].map((stat, i) => (
            <div key={i} className="glass-card rounded-2xl p-5 group hover:border-white/15 transition-all duration-300">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
                  style={{ background: `${stat.color}15`, color: stat.color }}
                >
                  {stat.icon}
                </div>
                <span className="text-xs uppercase tracking-widest text-gray-500 font-bold">{stat.label}</span>
              </div>
              <p className="text-3xl font-black" style={{ color: stat.color }}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Users Table */}
        <div className="glass-card rounded-[24px] overflow-hidden animate-fade-in-up stagger-2" style={{ opacity: 0 }}>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black/30 text-xs uppercase tracking-widest text-gray-400 border-b border-white/5">
                <th className="p-5 font-bold">Discord ID</th>
                <th className="p-5 font-bold">Role</th>
                <th className="p-5 font-bold">Usage</th>
                <th className="p-5 font-bold">Bonus Days</th>
                <th className="p-5 font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredUsers.map((u) => (
                <tr key={u.discord_id} className="hover:bg-white/[0.03] transition-all duration-200 group">
                  <td className="p-5 font-mono text-sm text-gray-300">{u.discord_id}</td>
                  <td className="p-5">
                    <span className={`px-3 py-1.5 text-[10px] font-black rounded-full tracking-wider uppercase ${
                      u.role === 'premium' 
                        ? 'glass-gold text-[#ddbc76]' 
                        : 'glass text-gray-400'
                    }`}>
                      {u.role === 'premium' ? '★ PREMIUM' : 'FREE'}
                    </span>
                  </td>
                  <td className="p-5">
                    <div className="flex items-center gap-3">
                      <div className="w-20">
                        <div className="flex justify-between text-xs mb-1">
                          <span className={u.usage_count >= (u.role === 'premium' ? 5 : 3) ? "text-red-400 font-bold" : "text-gray-300"}>
                            {u.usage_count} / {u.role === 'premium' ? 5 : 3}
                          </span>
                        </div>
                        <div className="w-full h-1.5 glass rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all duration-500"
                            style={{ 
                              width: `${Math.min((u.usage_count / (u.role === 'premium' ? 5 : 3)) * 100, 100)}%`,
                              background: u.usage_count >= (u.role === 'premium' ? 5 : 3) ? '#ef4444' : 'linear-gradient(90deg, #7e22ce, #ddbc76)'
                            }}
                          />
                        </div>
                      </div>
                    </div>
                    <p className="text-[10px] text-gray-600 mt-1 truncate max-w-[200px]">
                      Last: {new Date(u.last_reset_date).toLocaleString()}
                    </p>
                  </td>
                  <td className="p-5">
                    <div className="flex items-center gap-3">
                      <span className={`font-mono text-lg font-black ${u.bonus_days > 0 ? 'text-green-400' : u.bonus_days < 0 ? 'text-red-400' : 'text-gray-500'}`}>
                        {u.bonus_days > 0 ? '+' : ''}{u.bonus_days}
                      </span>
                      {u.role === 'premium' && (
                        <div className="flex gap-1.5">
                          <button onClick={() => handleUpdateBonus(u.discord_id, u.bonus_days, -1)} 
                            className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all duration-200 border border-red-500/20 hover:border-red-500 hover:scale-110"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleUpdateBonus(u.discord_id, u.bonus_days, 1)} 
                            className="w-8 h-8 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500 hover:text-white flex items-center justify-center transition-all duration-200 border border-green-500/20 hover:border-green-500 hover:scale-110"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="p-5">
                    <button 
                      onClick={() => handleResetQuota(u.discord_id)}
                      className="px-4 py-2 btn-glass text-xs font-bold rounded-xl flex items-center gap-2 hover:border-[#ddbc76]/30 hover:text-[#ddbc76] transition-all"
                    >
                      <RefreshCcw className="w-3.5 h-3.5" /> Reset
                    </button>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-16 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-3">
                      <Search className="w-8 h-8 text-gray-600" />
                      <p className="font-bold">{users.length === 0 ? "No users found in the database." : "No matching Discord ID found."}</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
