import "dotenv/config";

/** Read an env var, throwing a clear error if it's required and missing. */
function env(name: string, required = true, fallback = ""): string {
  const value = process.env[name] ?? fallback;
  if (required && !value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  port: Number(env("PORT", false, "3000")),

  anthropic: {
    apiKey: env("ANTHROPIC_API_KEY"),
    model: env("CLAUDE_MODEL", false, "claude-opus-4-8"),
  },

  google: {
    // OAuth client JSON: either a file path, or the raw JSON in GOOGLE_OAUTH_CLIENT_JSON
    // (handy on hosts like Replit where you store config in Secrets, not files).
    clientFile: env("GOOGLE_OAUTH_CLIENT_FILE", false, "./oauth-client.json"),
    clientJson: env("GOOGLE_OAUTH_CLIENT_JSON", false),
    // Token from `npm run auth:google`: file path, or raw JSON in GOOGLE_TOKEN_JSON.
    tokenFile: env("GOOGLE_TOKEN_FILE", false, "./token.json"),
    tokenJson: env("GOOGLE_TOKEN_JSON", false),
    sheetId: env("LEADS_SHEET_ID"),
    sheetRange: env("LEADS_SHEET_RANGE", false, "Leads!A:Z"),
    // The Gmail address you authorize — used as the From on outgoing mail.
    gmailSender: env("GMAIL_SENDER"),
  },

  reply: {
    fromName: env("REPLY_FROM_NAME", false, "Sales"),
  },

  team: {
    notifyTo: env("TEAM_NOTIFY_TO")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  },

  company: {
    name: env("COMPANY_NAME", false, "our company"),
    description: env("COMPANY_DESCRIPTION", false, ""),
  },

  // Lead-magnet delivery: the URL emailed to every lead.
  magnet: {
    repoUrl: env("GITHUB_REPO_URL"),
    // Subject line of the delivery email.
    emailSubject: env(
      "MAGNET_EMAIL_SUBJECT",
      false,
      "Your lead-response automation files are inside 👇",
    ),
  },
} as const;
