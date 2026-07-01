import { google } from "googleapis";
import { config } from "../config.js";
import { getGoogleAuth } from "../lib/google-auth.js";
import type { Lead, Qualification } from "../types.js";

/** Column order written to the sheet. Keep the header row in the Sheet in sync. */
export const SHEET_HEADERS = [
  "Timestamp",
  "Name",
  "Email",
  "Company",
  "Phone",
  "Message",
  "Score",
  "Tier",
  "Routing",
  "Reasoning",
  "Extra",
] as const;

/** Append one fully-qualified lead as a row. */
export async function logLeadToSheet(lead: Lead, q: Qualification): Promise<void> {
  const auth = await getGoogleAuth();
  const sheets = google.sheets({ version: "v4", auth });

  const row = [
    new Date().toISOString(),
    lead.name,
    lead.email,
    lead.company,
    lead.phone,
    lead.message,
    q.score,
    q.tier,
    q.routing,
    q.reasoning,
    Object.keys(lead.extra).length ? JSON.stringify(lead.extra) : "",
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: config.google.sheetId,
    range: config.google.sheetRange,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [row] },
  });
}
