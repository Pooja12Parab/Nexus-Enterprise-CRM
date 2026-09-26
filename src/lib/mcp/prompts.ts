import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { onboardingPromptInput } from "./schemas";

export function registerPrompts(server: McpServer) {
  server.registerPrompt(
    "onboarding_checklist",
    {
      title: "Onboarding Checklist",
      description: "Generate a 7-day onboarding checklist for a new hire in a given role.",
      argsSchema: onboardingPromptInput.shape,
    },
    (args: { department: string; role: string }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Generate a structured 7-day onboarding checklist for a new ${args.role} joining the ${args.department} department. Include day-by-day tasks for: setup, team intros, tooling access, first deliverable, and 1:1s with key stakeholders. Format as a numbered list.`,
          },
        },
      ],
    })
  );

  server.registerPrompt(
    "performance_review",
    {
      title: "Performance Review Template",
      description: "Generate a performance review template for an employee.",
      argsSchema: onboardingPromptInput.shape,
    },
    (args: { department: string; role: string }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Create a performance review template for a ${args.role} in ${args.department}. Include sections for: accomplishments, areas of growth, peer feedback, goals for next quarter, and rating rubric. Use markdown with clear headers.`,
          },
        },
      ],
    })
  );
}
