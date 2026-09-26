import { prisma } from "@/lib/prisma";
import type { UIMessage } from "ai";

export async function loadChatHistory(chatId: string, userId: string) {
  const messages = await prisma.chatMessage.findMany({
    where: { chatId, userId },
    orderBy: { createdAt: "asc" },
    select: { id: true, role: true, parts: true, createdAt: true },
  });
  return messages.map((m) => ({
    id: m.id,
    role: m.role,
    parts: m.parts,
    createdAt: m.createdAt,
  })) as unknown as UIMessage[];
}

export async function saveChatMessages(
  chatId: string,
  userId: string,
  messages: UIMessage[]
): Promise<void> {
  if (messages.length === 0) return;
  await prisma.$transaction(async (tx) => {
    await tx.chatMessage.deleteMany({ where: { chatId, userId } });
    await tx.chatMessage.createMany({
      data: messages.map((m) => ({
        chatId,
        userId,
        role: m.role,
        parts: m.parts as unknown as object,
      })),
    });
    await tx.chatThread.update({
      where: { id: chatId },
      data: { updatedAt: new Date() },
    });
  });
}

export async function createChatThread(userId: string, title?: string): Promise<string> {
  const thread = await prisma.chatThread.create({
    data: { userId, title: title ?? "New chat" },
  });
  return thread.id;
}

export async function ensureThreadAccess(
  chatId: string,
  userId: string
): Promise<boolean> {
  const thread = await prisma.chatThread.findUnique({ where: { id: chatId } });
  return thread?.userId === userId;
}
