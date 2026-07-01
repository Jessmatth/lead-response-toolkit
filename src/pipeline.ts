import { config } from "./config.js";
import { qualifyLead } from "./services/claude.js";
import { logLeadToSheet } from "./services/sheets.js";
import { sendEmail } from "./services/gmail.js";
import type { Lead, Qualification } from "./types.js";

/** Possessive form of the company, handling names that already end in "s". */
function possessive(company: string): string {
  if (!company) return "your";
  return company.endsWith("s") ? `${company}'` : `${company}'s`;
}

/** The delivery email: a fixed value-led template with a guaranteed repo link. */
function deliveryEmailBody(lead: Lead): string {
  const intro =
    "Leads that get a response in 5 minutes or less are 10x more likely to close " +
    `than those contacted after an hour. Increase ${possessive(lead.company)} ` +
    "conversion rate with this toolkit that closes the response gap.";

  return [
    `Hi ${lead.name.split(" ")[0] || lead.name},`,
    "",
    intro,
    "",
    `Here's the complete lead-response automation toolkit:`,
    config.magnet.repoUrl,
    "",
    "The README walks you through setup end to end — plug in your own API keys and you'll have leads qualified, logged, and answered automatically.",
    "",
    "Reply to this email if you get stuck — happy to help.",
    "",
    `— ${config.reply.fromName}`,
  ].join("\n");
}

/** Internal heads-up so you can prioritize follow-up on the best leads. */
function teamEmailBody(lead: Lead, q: Qualification): string {
  const lines: Array<string | null> = [
    `New ${q.tier.toUpperCase()} signup — score ${q.score}/100`,
    "",
    `Name:    ${lead.name}`,
    `Email:   ${lead.email}`,
    lead.company ? `Company: ${lead.company}` : null,
    "",
    `Routing:   ${q.routing}`,
    `Reasoning: ${q.reasoning}`,
    "",
    "Their biggest lead-gen challenge:",
    lead.message || "(none provided)",
  ];
  return lines.filter((line): line is string => line !== null).join("\n");
}

/**
 * Lead-magnet pipeline:
 *   1. AI qualify + route + personalized intro
 *   2. Deliver the repo link to the lead (always — the magnet is the point)
 *   3. Log to Google Sheet
 *   4. Notify you, tagged by tier so you know who's worth chasing
 *
 * Steps 2–4 run concurrently; one failing doesn't block the others.
 */
export async function processLead(lead: Lead): Promise<Qualification> {
  const q = await qualifyLead(lead);

  const tasks: Array<Promise<unknown>> = [
    sendEmail({
      to: [lead.email],
      subject: config.magnet.emailSubject,
      body: deliveryEmailBody(lead),
      replyTo: config.google.gmailSender,
    }).catch((e) => {
      throw new Error(`delivery-email: ${e.message}`);
    }),
    logLeadToSheet(lead, q).catch((e) => {
      throw new Error(`sheets: ${e.message}`);
    }),
    sendEmail({
      to: config.team.notifyTo,
      subject: `[${q.tier}/${q.score}] New signup: ${lead.name}${lead.company ? ` (${lead.company})` : ""}`,
      body: teamEmailBody(lead, q),
    }).catch((e) => {
      throw new Error(`team-notify: ${e.message}`);
    }),
  ];

  const results = await Promise.allSettled(tasks);
  const failures = results.filter((r) => r.status === "rejected") as PromiseRejectedResult[];
  if (failures.length) {
    throw new Error(
      `lead ${lead.email} partially failed: ${failures.map((f) => f.reason.message).join("; ")}`,
    );
  }

  return q;
}
