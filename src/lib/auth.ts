import { NextAuthOptions } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseSecret = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseSecret);

export const authOptions: NextAuthOptions = {
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID || "",
      clientSecret: process.env.DISCORD_CLIENT_SECRET || "",
      authorization: "https://discord.com/api/oauth2/authorize?scope=identify",
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account && profile) {
        token.accessToken = account.access_token;
        // @ts-ignore
        token.id = profile.id;
      }
      
      // Fetch user data from your custom aura_web_usage table
      if (token.id) {
          try {
              const { data, error } = await supabase
                .from('aura_web_usage')
                .select('role')
                .eq('discord_id', token.id)
                .single();
                
              if (data && !error) {
                  token.supabaseRole = data.role;
              } else if (error && error.code === 'PGRST116') {
                  // User doesn't exist in the table yet, we can optionally auto-insert them here
                  // But for now, we just skip it
              }
          } catch(e) { console.error("Supabase fetch error:", e); }
      }
      
      return token;
    },
    async session({ session, token }) {
      // @ts-ignore
      session.accessToken = token.accessToken;
      
      let userRole = "member";
      let hasAccess = false;

      // 1. ตรวจสอบยศจากฐานข้อมูล Supabase ก่อน (aura_web_usage)
      if (token.supabaseRole === 'premium') {
          hasAccess = true;
          userRole = "premium";
      } else if (token.supabaseRole === 'free') {
          hasAccess = true;
          userRole = "free";
      }

      // 2. ถ้าไม่ได้สิทธิ์จาก Database ค่อยไปเช็คจาก Discord (ระบบเก่า)
      const guildId = process.env.DISCORD_GUILD_ID;
      const botToken = process.env.DISCORD_BOT_TOKEN;
      const partnerRoleId = process.env.DISCORD_PARTNER_ROLE_ID;
      const premiumRoleId = process.env.DISCORD_PREMIUM_ROLE_ID;
      const freeRoleId = process.env.DISCORD_FREE_ROLE_ID;

      // @ts-ignore
      if (!hasAccess && guildId && botToken && token.id) {
        try {
          const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${token.id}`, {
            headers: {
              Authorization: `Bot ${botToken}`,
            },
          });

          if (res.ok) {
            const memberData = await res.json();
            const roles: string[] = memberData.roles || [];
            
            // เช็คว่า User มียศ Partner, Premium หรือ Free
            if (partnerRoleId && roles.includes(partnerRoleId)) {
              hasAccess = true;
              userRole = "partner";
            } else if (premiumRoleId && roles.includes(premiumRoleId)) {
              hasAccess = true;
              userRole = "premium";
            } else if (freeRoleId && roles.includes(freeRoleId)) {
              hasAccess = true;
              userRole = "free";
            }
          }
        } catch (error) {
          console.error("Failed to fetch Discord roles:", error);
        }
      }

      // @ts-ignore
      session.user.role = userRole;
      // @ts-ignore
      session.user.hasAccess = hasAccess;
      // @ts-ignore
      session.user.id = token.id;
      
      return session;
    },
  },
  pages: {
    signIn: '/',
  },
};
