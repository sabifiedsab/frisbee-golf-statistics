import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      isAdmin: boolean;
      language: string;
    };
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { username: credentials.username },
        });

        if (!user) {
          return null;
        }

        const isValid = await bcrypt.compare(credentials.password, user.password);

        if (!isValid) {
          return null;
        }

        // Bootstrap admin: if ADMIN_USERNAME is set and matches, promote on login
        const adminUsername = process.env.ADMIN_USERNAME;
        if (adminUsername && user.username === adminUsername && !user.isAdmin) {
          await prisma.user.update({
            where: { id: user.id },
            data: { isAdmin: true },
          });
          user.isAdmin = true;
        }

        return {
          id: user.id,
          name: user.username,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      // On first sign-in, user is populated; persist admin + language into the token
      if (user && token.sub) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { isAdmin: true, language: true },
        });
        if (dbUser) {
          token.isAdmin = dbUser.isAdmin;
          token.language = dbUser.language;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.sub ?? session.user.id;
        session.user.isAdmin = (token.isAdmin as boolean) ?? false;
        session.user.language = (token.language as string) ?? "en";
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};
