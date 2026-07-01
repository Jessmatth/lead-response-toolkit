/**
 * Tests ONLY the Claude qualification step (no Google/Gmail calls), so it runs
 * with just ANTHROPIC_API_KEY set.
 *   npm run test:qualify
 */
import "dotenv/config";
import { qualifyLead } from "../src/services/claude.js";
import type { Lead } from "../src/types.js";

const sampleLead: Lead = {
  name: "Dana Reyes",
  email: "dana@acme-robotics.com",
  company: "Acme Robotics",
  phone: "",
  message:
    "Our leads sit for hours before anyone follows up and we're losing deals to faster competitors — need to automate the first response.",
  extra: { source: "lead-magnet-form", utm_campaign: "x-launch" },
};

console.log("Sending sample lead to Claude...\n");
const q = await qualifyLead(sampleLead);

console.log("── Qualification ──────────────────────────────");
console.log(`Score:    ${q.score}/100`);
console.log(`Tier:     ${q.tier}`);
console.log(`Routing:  ${q.routing}`);
console.log(`Reasoning: ${q.reasoning}`);
