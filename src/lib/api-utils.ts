import { NextResponse } from "next/server";
import { ZodError } from "zod";

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
