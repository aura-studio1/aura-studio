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
      let hasAccess = false;

      // 1. Check Discord Role (Highest Priority for Partner)
      if (token.discordRole === 'partner') {
          hasAccess = true;
          userRole = "partner";
      } 
      // 2. Check Supabase (Priority for Premium)
      else if (token.supabaseRole === 'premium') {
          hasAccess = true;
          userRole = "premium";
      }
      else if (token.discordRole === 'premium') {
          hasAccess = true;
          userRole = "premium";
      }
      // 3. Check Free
      else if (token.supabaseRole === 'free') {
          hasAccess = true;
          userRole = "free";
      }
      else if (token.discordRole === 'free') {
          hasAccess = true;
          userRole = "free";
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
