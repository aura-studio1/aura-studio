import { NextAuthOptions } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import CredentialsProvider from "next-auth/providers/credentials";
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
    }),
    CredentialsProvider({
      name: "Discord ID (Secure)",
      credentials: {
        discordId: { label: "ใส่ Discord ID ของคุณ", type: "text", placeholder: "เช่น 1234567890" },
        pin: { label: "รหัส PIN (พิมพ์ /login ในเซิร์ฟเวอร์ดิสคอร์ด)", type: "password", placeholder: "รับรหัสจากบอท AURA" }
      },
      async authorize(credentials) {
        if (!credentials?.discordId || !credentials?.pin) return null;
        
        const crypto = require('crypto');
        const secret = process.env.NEXTAUTH_SECRET || "fala_secret";
        const discordId = credentials.discordId;
        const inputPin = credentials.pin;

        // Check current time window and previous time window (valid for up to 10 mins)
        let isValidPin = false;
        for (let offset of [0, -1]) {
            const timeWindow = Math.floor(Date.now() / (5 * 60 * 1000)) + offset;
            const hash = crypto.createHmac('sha256', secret).update(`${discordId}-${timeWindow}`).digest('hex');
            const num = parseInt(hash.substring(0, 8), 16);
            const validPin = (num % 1000000).toString().padStart(6, '0');
            if (inputPin === validPin) {
                isValidPin = true;
                break;
            }
        }

        if (!isValidPin) {
            throw new Error("รหัส PIN ไม่ถูกต้อง หรือหมดอายุแล้ว กรุณาพิมพ์ /login ใหม่ในดิสคอร์ด");
        }
        
        // เช็คว่ามี ID นี้ในระบบไหม
        const { data } = await supabase
          .from('aura_web_usage')
          .select('*')
          .eq('discord_id', discordId)
          .single();
          
        if (data) {
          return { id: discordId, name: "User", image: "" };
        } else {
          throw new Error("ไม่พบ Discord ID ของคุณในระบบ (คุณยังไม่ได้ซื้อแพ็คเกจ)");
        }
        
        return null;
      }
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile, user }) {
      if (user) {
        // @ts-ignore
        token.id = user.id;
      }
      
      if (account && profile) {
        token.accessToken = account.access_token;
        // @ts-ignore
        token.id = profile.id;

        // Fetch Discord Roles on Sign-In
        const guildId = process.env.DISCORD_GUILD_ID;
        const botToken = process.env.DISCORD_BOT_TOKEN;
        const partnerRoleId = process.env.DISCORD_PARTNER_ROLE_ID;
        const premiumRoleId = process.env.DISCORD_PREMIUM_ROLE_ID;
        const freeRoleId = process.env.DISCORD_FREE_ROLE_ID;

        // @ts-ignore
        if (guildId && botToken && token.id) {
          try {
            const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${token.id}`, {
              headers: { Authorization: `Bot ${botToken}` },
            });
            if (res.ok) {
              const memberData = await res.json();
              const roles: string[] = memberData.roles || [];
              if (partnerRoleId && roles.includes(partnerRoleId)) {
                token.discordRole = "partner";
              } else if (premiumRoleId && roles.includes(premiumRoleId)) {
                token.discordRole = "premium";
              } else if (freeRoleId && roles.includes(freeRoleId)) {
                token.discordRole = "free";
              }
            }
          } catch (error) {
            console.error("Failed to fetch Discord roles during sign-in:", error);
          }
        }
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
                  // User doesn't exist in the table yet
              }
          } catch(e) { console.error("Supabase fetch error:", e); }
      }
      
      return token;
    },
    async session({ session, token }) {
      // @ts-ignore
      session.accessToken = token.accessToken;
      
      let userRole = "member";
      let hasAccess = true; // Allow everyone to enter workspace

      // 1. Supabase Role has Highest Priority (Fresh from DB)
      if (token.supabaseRole && token.supabaseRole !== 'member') {
          hasAccess = true;
          userRole = token.supabaseRole as string;
      } 
      // 2. Fallback to Discord Role (Cached in JWT)
      else if (token.discordRole) {
          hasAccess = true;
          userRole = token.discordRole as string;
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
};
