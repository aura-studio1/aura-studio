import { NextAuthOptions } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import { SupabaseAdapter } from "@auth/supabase-adapter";
import { createClient } from "@supabase/supabase-js";

// Initialize a Supabase client just for custom queries if needed
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseSecret = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseSecret);

export const authOptions: NextAuthOptions = {
  adapter: SupabaseAdapter({
    url: supabaseUrl,
    secret: supabaseSecret,
  }),
  session: {
    strategy: "jwt", // Keep using JWT to not break existing callbacks
  },
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID || "",
      clientSecret: process.env.DISCORD_CLIENT_SECRET || "",
      authorization: "https://discord.com/api/oauth2/authorize?scope=identify",
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile, user }) {
      if (account && profile) {
        token.accessToken = account.access_token;
        // @ts-ignore
        token.id = profile.id;
      }
      
      // Fetch Supabase user data every time a token is created/refreshed
      if (token.email) {
          try {
              const { data, error } = await supabase
                .from('users')
                .select('role, vip_expires_at')
                .eq('email', token.email)
                .single();
                
              if (data && !error) {
                  token.supabaseRole = data.role;
                  token.vip_expires_at = data.vip_expires_at;
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
      let vipExpiresAt = null;

      // 1. ตรวจสอบจากฐานข้อมูล Supabase ก่อน (VIP ที่จ่ายเงินผ่านเว็บ)
      if (token.vip_expires_at) {
          const expiresAt = new Date(token.vip_expires_at as string);
          if (expiresAt > new Date()) {
              hasAccess = true;
              userRole = "premium";
              vipExpiresAt = token.vip_expires_at;
          }
      }

      // 2. ถ้ายังไม่ได้เป็น VIP จากเว็บ ลองตรวจสอบยศฟรี/พรีเมียมจาก Discord Server
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
      session.user.id = token.id; // Discord ID
      // @ts-ignore
      session.user.vipExpiresAt = vipExpiresAt;
      
      return session;
    },
  },
  pages: {
    signIn: '/',
  },
};
