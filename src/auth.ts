import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authenticateAccount } from "@/features/auth/service";
import { clientIdentity } from "@/server/security/rate-limit";
import { db } from "@/server/db/client";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: (credentials, request) =>
        authenticateAccount(credentials, clientIdentity(request.headers)),
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.sessionVersion = user.sessionVersion;
      }
      if (!token.sub || typeof token.sessionVersion !== "number") return null;
      const valid = await db.user.findFirst({
        where: {
          id: token.sub,
          sessionVersion: token.sessionVersion,
          status: "ACTIVE",
        },
        select: { id: true },
      });
      if (!valid) return null;
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      session.sessionVersion =
        typeof token.sessionVersion === "number"
          ? token.sessionVersion
          : undefined;
      return session;
    },
  },
  logger: {
    error(error) {
      // ponytail: temporary diagnostic, revert once login failure cause confirmed
      console.error("authentication_failed", error.name, error.message, error.cause);
    },
  },
});
