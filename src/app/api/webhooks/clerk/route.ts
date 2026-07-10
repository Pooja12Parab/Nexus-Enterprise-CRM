import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { clerkClient } from "@clerk/nextjs/server";
import { Webhook } from "svix";

const webhookSecret = process.env.CLERK_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  try {
    const svixId = request.headers.get("svix-id");
    const svixTimestamp = request.headers.get("svix-timestamp");
    const svixSignature = request.headers.get("svix-signature");

    if (!svixId || !svixTimestamp || !svixSignature) {
      return NextResponse.json(
        { error: { code: "MISSING_SVIX_HEADERS", message: "Missing Svix headers" } },
        { status: 400 }
      );
    }

    if (!webhookSecret) {
      console.warn("[Webhook] CLERK_WEBHOOK_SECRET not configured – skipping verification");
      return NextResponse.json(
        { error: { code: "NOT_CONFIGURED", message: "Webhook secret not configured" } },
        { status: 500 }
      );
    }

    const body = await request.text();
    const wh = new Webhook(webhookSecret);
    let payload: Record<string, unknown>;

    try {
      payload = wh.verify(body, {
        "svix-id": svixId,
        "svix-timestamp": svixTimestamp,
        "svix-signature": svixSignature,
      }) as Record<string, unknown>;
    } catch {
      return NextResponse.json(
        { error: { code: "INVALID_SIGNATURE", message: "Invalid webhook signature" } },
        { status: 401 }
      );
    }

    const eventType = payload.type as string;
    const data = payload.data as Record<string, unknown> | undefined;

    if (!data) {
      return NextResponse.json(
        { error: { code: "INVALID_PAYLOAD", message: "No data in webhook payload" } },
        { status: 400 }
      );
    }

    switch (eventType) {
      case "user.created": {
        const id = data.id as string;
        const email = ((data.email_addresses as Array<{ email_address: string }>)?.[0]?.email_address) ?? "";
        if (!email) {
          return NextResponse.json(
            { error: { code: "MISSING_EMAIL", message: "No email in webhook payload" } },
            { status: 400 }
          );
        }

        // Create user in local DB with default EMPLOYEE role
        await prisma.user.upsert({
          where: { id },
          create: { id, email },
          update: { email },
        });

        // Sync the default role to Clerk's public metadata so the middleware
        // can read it from the session token or via clerkClient API
        try {
          const client = await clerkClient();
          await client.users.updateUser(id, {
            publicMetadata: { role: "EMPLOYEE" },
          });
          console.log(`[Webhook] Set publicMetadata.role=EMPLOYEE for user: ${id}`);
        } catch (metaError) {
          console.error(`[Webhook] Failed to set public metadata for user ${id}:`, metaError);
        }

        console.log(`[Webhook] User created/updated: ${id} (${email})`);
        break;
      }

      case "user.deleted": {
        const id = data.id as string;
        await prisma.user.delete({ where: { id } }).catch(() => {
          // User may not exist locally — that's fine
        });
        console.log(`[Webhook] User deleted: ${id}`);
        break;
      }

      case "session.created":
      case "session.ended":
        // Session events can be used for audit logging
        break;

      default:
        console.log(`[Webhook] Unhandled event type: ${eventType}`);
    }

    return NextResponse.json({ success: true, event: eventType });
  } catch (error) {
    console.error("[Webhook Error]", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to process webhook" } },
      { status: 500 }
    );
  }
}