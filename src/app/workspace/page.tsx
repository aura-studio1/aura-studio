import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Dashboard from "@/components/Dashboard";

export default async function WorkspacePage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/");
  }

  // @ts-ignore
  const hasAccess = session?.user?.hasAccess === true;

  if (!hasAccess) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#06040A] text-white text-center p-6">
        <div className="glass-card rounded-[28px] p-12 max-w-lg">
          <h1 className="text-3xl font-bold text-red-400 mb-4">ACCESS DENIED</h1>
          <p className="text-gray-400 mb-8">คุณไม่มียศที่กำหนดใน Discord กรุณาติดต่อแอดมินหรือซื้อ VIP</p>
          
          <div className="flex flex-col gap-3">
            <a href="/" className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 transition text-white font-bold">
              กลับหน้าหลัก (Back to Home)
            </a>
            <a href="/api/auth/signout" className="px-6 py-3 rounded-xl bg-red-500/20 hover:bg-red-500/40 border border-red-500/30 transition text-red-400 font-bold">
              ออกจากระบบ (Log Out)
            </a>
          </div>
        </div>
      </div>
    );
  }

  return <Dashboard session={session} />;
}
