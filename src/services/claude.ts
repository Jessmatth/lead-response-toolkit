import Anthropic from "@anthropic-ai/sdk";
import { config } from "../config.js";
import type { Lead, Qualification, LeadTier } from "../types.js";

const client = new Anthropic({ apiKey: config.anthropic.apiKey });

const TIERS: LeadTier[] = ["hot", "warm", "cold", "spam"];

/**
 * One Claude call qualifies and routes the lead. Output is forced into a JSON
 * tool call so we get a validated, structured result. The delivery email copy
 * is a fixed template (see pipeline.ts) — the model doesn't write it.
 */
const QUALIFY_TOOL: Anthropic.Tool = {
  name: "record_qualification",
  description: "Record the lead qualification and routing.",
  input_schema: {
    type: "object",
    properties: {
      score: {
        type: "number",
        description: "Fit + intent score from 0 (no fit/spam) to 100 (ideal, high intent).",
      },
      tier: { type: "string", enum: TIERS },
      reasoning: {
        type: "string",
        description: "1-2 sentence rationale for follow-up prioritization.",
      },
      routing: {
        type: "string",
        description:
          'Who should follow up and how fast, e.g. "Founder — personal DM within 24h (hot)" or "No active follow-up — newsletter nurture".',
      },
    },
    required: ["score", "tier", "reasoning", "routing"],
  },
};

export async function qualifyLead(lead: Lead): Promise<Qualification> {
  const system = [
    `You qualify inbound leads for ${config.company.name}.`,
    config.company.description && `About the business: ${config.company.description}`,
    "These leads opted in to download a free lead-response automation toolkit. Score on fit — do they look like a real potential customer/buyer, judging from their name, company, and email domain (a business domain is a stronger signal than a free personal inbox). Mark obvious junk/bots as tier 'spam' with a low score.",
  ]
    .filter(Boolean)
    .join("\n\n");

  const userPayload = {
    name: lead.name,
    email: lead.email,
    company: lead.company,
    challenge: lead.message,
    extra: lead.extra,
  };

  const response = await client.messages.create({
    model: config.anthropic.model,
    max_tokens: 1024,
    system,
    tools: [QUALIFY_TOOL],
    tool_choice: { type: "tool", name: QUALIFY_TOOL.name },
    messages: [
      {
        role: "user",
        content: `New lead-magnet signup:\n\n${JSON.stringify(userPayload, null, 2)}`,
      },
    ],
  });

  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
  );
  if (!toolUse) {
    throw new Error("Claude did not return a qualification tool call");
  }

  const out = toolUse.input as Qualification;
  // Clamp score defensively so a bad model response can't poison downstream logic.
  out.score = Math.max(0, Math.min(100, Math.round(out.score)));
  return out;
}
