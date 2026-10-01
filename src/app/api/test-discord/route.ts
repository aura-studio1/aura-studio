import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const guildId = process.env.DISCORD_GUILD_ID;
  const botToken = process.env.DISCORD_BOT_TOKEN;
  const premiumRoleId = process.env.DISCORD_PREMIUM_ROLE_ID;

  // @ts-ignore
  const userId = session.user.id;

  if (!guildId || !botToken) {
    return NextResponse.json({ 
      error: "Missing environment variables", 
      guildId: !!guildId, 
      botToken: !!botToken,
      premiumRoleId 
    });
  }

  try {
    const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${userId}`, {
      headers: { Authorization: `Bot ${botToken}` },
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      return NextResponse.json({ 
        status: "Error fetching from Discord", 
        statusCode: res.status, 
        errorText,
        userId,
        guildId
      });
    }

    const memberData = await res.json();
    const roles: string[] = memberData.roles || [];
    const hasPremium = premiumRoleId ? roles.includes(premiumRoleId) : false;

    return NextResponse.json({
      status: "Success",
      userId,
      guildId,
      premiumRoleId,
      userRoles: roles,
      hasPremiumRoleMatched: hasPremium,
      memberData
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message });
  }
}
