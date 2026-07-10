import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { clerkClient } from "@clerk/nextjs/server";

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export function handleApiError(error: unknown): NextResponse<ApiErrorResponse> {
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Validation failed",
          details: error.flatten().fieldErrors,
        },
      },
      { status: 400 }
    );
  }

  if (error instanceof Error && error.message === "UNAUTHORIZED") {
    return NextResponse.json(
      {
        error: {
          code: "UNAUTHORIZED",
          message: "Insufficient permissions",
        },
      },
      { status: 403 }
    );
  }

  console.error("[API Error]", error);

  return NextResponse.json(
    {
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
      },
    },
    { status: 500 }
  );
}

export function unauthorizedResponse(): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      error: {
        code: "UNAUTHORIZED",
        message: "You must be signed in to access this resource",
      },
    },
    { status: 401 }
  );
}

export function forbiddenResponse(): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      error: {
        code: "FORBIDDEN",
        message: "You do not have permission to access this resource",
      },
    },
    { status: 403 }
  );
}

/**
 * Resolves the user's role with a fallback chain:
 * 1. sessionClaims?.role (from Clerk JWT custom claim — fastest)
 * 2. Clerk API publicMetadata.role (fetched via clerkClient)
 * 3. Defaults to "EMPLOYEE" if both of the above fail
 */
export async function resolveRole(
  userId: string,
  sessionClaims?: Record<string, unknown> | null
): Promise<string> {
  // Step 1: Try session claims (from the Clerk JWT token)
  let role = sessionClaims?.role as string | undefined;

  // Step 2: Fall back to Clerk API (public metadata)
  if (!role) {
    try {
      const client = await clerkClient();
      const clerkUser = await client.users.getUser(userId);
      role = clerkUser.publicMetadata?.role as string | undefined;
    } catch (error) {
      console.error("[resolveRole] Failed to fetch user from Clerk API:", error);
    }
  }

  // Step 3: Default to EMPLOYEE
  return role ?? "EMPLOYEE";
}
