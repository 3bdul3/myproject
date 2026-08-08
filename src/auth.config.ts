import type { NextAuthConfig } from "next-auth";
import { NextResponse } from "next/server";

export const authConfig: NextAuthConfig = {
  // Required behind any reverse proxy that isn't auto-detected (Railway, Render, Fly.io, Docker,
  // ...) — without this, Auth.js refuses requests because it can't verify the `host` header itself.
  trustHost: true,
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = request.nextUrl;
      const isPublicAuthPage =
        pathname.startsWith("/login") || pathname.startsWith("/forgot-password") || pathname.startsWith("/reset-password");

      if (!isLoggedIn && !isPublicAuthPage) {
        return NextResponse.redirect(new URL("/login", request.nextUrl));
      }
      if (isLoggedIn && isPublicAuthPage) {
        return NextResponse.redirect(new URL("/dashboard", request.nextUrl));
      }
      return true;
    },
  },
};
