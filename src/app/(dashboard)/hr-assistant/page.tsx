import { redirect } from "next/navigation";
import { createChatThread } from "@/lib/ai/chat-store";
import { auth } from "@/lib/auth";

export default async function HrAssistantPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  const id = await createChatThread(userId, "HR Assistant");
  redirect(`/hr-assistant/${id}`);
}
