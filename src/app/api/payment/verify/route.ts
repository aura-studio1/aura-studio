import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseSecret = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseSecret);

export async function POST(req: Request) {
  try {
    // 1. เช็คว่าลูกค้า Login หรือยัง
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ message: "กรุณาเข้าสู่ระบบก่อนทำรายการ" }, { status: 401 });
    }

    const discordId = session.user.id;

    // 2. ดึงรูปสลิปที่อัปโหลดมา
    const formData = await req.formData();
    const file = formData.get("slip") as File | null;

    if (!file) {
      return NextResponse.json({ message: "ไม่พบรูปภาพสลิปโอนเงิน" }, { status: 400 });
    }

    // --- ส่วนจำลองการตรวจสลิป (Mock SlipOK) ---
    // ในอนาคตเราจะเอา API Key ของ SlipOK มาเสียบตรงนี้ เพื่อให้ AI ตรวจของจริง
    // ตอนนี้เราจะหน่วงเวลา 2.5 วินาที เพื่อจำลองว่า AI กำลังทำงาน
    await new Promise(resolve => setTimeout(resolve, 2500));

    // สมมติว่า AI ตรวจผ่าน (ยอดเงิน 500 บาทเป๊ะ)
    const mockIsSlipValid = true; 

    if (!mockIsSlipValid) {
      return NextResponse.json({ message: "สลิปไม่ถูกต้อง หรือยอดเงินไม่ครบ 500 บาท" }, { status: 400 });
    }
    // ----------------------------------------

    // 3. ถ้าสลิปผ่าน ให้ปรับยศในฐานข้อมูล Supabase เป็น Premium ทันที
    
    // ลองเช็คก่อนว่ามีชื่อในตารางไหม
    const { data: existingUser } = await supabase
      .from('aura_web_usage')
      .select('id')
      .eq('discord_id', discordId)
      .single();

    if (existingUser) {
      // อัปเดตข้อมูลเดิม
      await supabase
        .from('aura_web_usage')
        .update({ 
          role: 'premium',
          premium_since: new Date().toISOString(),
          bonus_days: 30 // แถมให้ 30 วัน (ตัวอย่าง)
        })
        .eq('discord_id', discordId);
    } else {
      // สร้างข้อมูลใหม่
      await supabase
        .from('aura_web_usage')
        .insert({ 
          discord_id: discordId,
          role: 'premium',
          usage_count: 0,
          premium_since: new Date().toISOString(),
          bonus_days: 30
        });
    }

    return NextResponse.json({ 
      success: true, 
      message: "อัปเกรดเป็น VIP สำเร็จ!" 
    });

  } catch (error) {
    console.error("Payment Error:", error);
    return NextResponse.json({ message: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" }, { status: 500 });
  }
}
