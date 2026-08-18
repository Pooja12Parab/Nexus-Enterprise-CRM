import { clerkMiddleware, createRouteMatcher, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/**
 * Edge middleware (Next.js 16 proxy convention — `middleware` was renamed).
 * Handles Clerk authentication + role-based access control.
 */
const isPublicRoute = createRouteMatcher(["/", "/sign-in(.*)", "/sign-up(.*)", "/api/webhooks(.*)", "/403"]);

const PROTECTED_ROUTES: Record<string, string[]> = {
  "/directory": ["HR_MANAGER", "SUPER_ADMIN"],
  "/onboarding": ["HR_MANAGER", "SUPER_ADMIN"],
  "/settings": ["SUPER_ADMIN"],
  "/org-chart": ["HR_MANAGER", "SUPER_ADMIN"],
  "/dashboard": ["HR_MANAGER", "SUPER_ADMIN", "DEPT_HEAD", "EMPLOYEE"],
  "/my-profile": ["HR_MANAGER", "SUPER_ADMIN", "DEPT_HEAD", "EMPLOYEE"],
};

function getRoutePrefix(pathname: string): string | undefined {
  return Object.keys(PROTECTED_ROUTES).find((route) => pathname.startsWith(route));
}

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }

  const { userId, sessionClaims, redirectToSignIn } = await auth();

  if (!userId) {
    return redirectToSignIn({ returnBackUrl: req.url });
  }

  const routePrefix = getRoutePrefix(req.nextUrl.pathname);
  if (routePrefix) {
    const allowedRoles = PROTECTED_ROUTES[routePrefix];
    let userRole = sessionClaims?.role as string | undefined;

    if (!userRole) {
      try {
        const client = await clerkClient();
        const clerkUser = await client.users.getUser(userId);
        userRole = clerkUser.publicMetadata?.role as string | undefined;
      } catch (error) {
        console.error("[Proxy] Failed to fetch user from Clerk API:", error);
      }
    }

    if (!userRole) {
      userRole = "EMPLOYEE";
    }

    if (!allowedRoles.includes(userRole)) {
      return NextResponse.redirect(new URL("/403", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
