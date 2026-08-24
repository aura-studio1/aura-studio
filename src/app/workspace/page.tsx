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
          <p className="text-gray-400 mb-6">คุณไม่มียศที่กำหนดใน Discord กรุณาติดต่อแอดมินหรือซื้อ VIP</p>
        </div>
      </div>
    );
  }

  return <Dashboard session={session} />;
}
