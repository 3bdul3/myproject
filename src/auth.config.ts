import type { NextAuthConfig } from "next-auth";
import { NextResponse } from "next/server";

export const authConfig: NextAuthConfig = {
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const isLoginPage = request.nextUrl.pathname.startsWith("/login");

      if (!isLoggedIn && !isLoginPage) {
        return NextResponse.redirect(new URL("/login", request.nextUrl));
      }
      if (isLoggedIn && isLoginPage) {
        return NextResponse.redirect(new URL("/dashboard", request.nextUrl));
      }
      return true;
    },
  },
};
