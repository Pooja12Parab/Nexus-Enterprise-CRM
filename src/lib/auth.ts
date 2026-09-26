/**
 * Test-only auth bypass.
 *
 * When E2E_BYPASS_AUTH=1, returns a synthetic SUPER_ADMIN session.
 * Otherwise delegates to Clerk's real auth().
 */
import { auth as realAuth } from "@clerk/nextjs/server";

const BYPASS_SESSION = {
  userId: "user_e2e_bypass",
  sessionClaims: {
    role: "SUPER_ADMIN",
    email: "e2e@nexus.local",
    firstName: "E2E",
    lastName: "Bypass",
    createdAt: new Date(0).toISOString(),
  },
};

export async function auth() {
  if (process.env.E2E_BYPASS_AUTH === "1") {
    return BYPASS_SESSION;
  }
  return realAuth();
}
