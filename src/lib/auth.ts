import { NextAuthOptions } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";

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
      return token;
    },
    async session({ session, token }) {
      // @ts-ignore
      session.accessToken = token.accessToken;
      
      let userRole = "member";
      let hasAccess = false;

      // ตรวจสอบยศใน Discord Server (Guild)
      const guildId = process.env.DISCORD_GUILD_ID;
      const botToken = process.env.DISCORD_BOT_TOKEN;
      const partnerRoleId = process.env.DISCORD_PARTNER_ROLE_ID;
      const premiumRoleId = process.env.DISCORD_PREMIUM_ROLE_ID;
      const freeRoleId = process.env.DISCORD_FREE_ROLE_ID;

      if (guildId && botToken && token.id) {
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
