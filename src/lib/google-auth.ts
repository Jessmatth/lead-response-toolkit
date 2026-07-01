import { readFile } from "node:fs/promises";
import { google } from "googleapis";
import { config } from "../config.js";

/**
 * Auth for a personal Gmail account via OAuth2.
 *
 * Setup is two one-time steps (see README):
 *   1. Download an OAuth "Desktop app" client JSON to oauth-client.json.
 *   2. Run `npm run auth:google` to grant consent — it saves a refresh token
 *      to token.json. From then on the refresh token mints access tokens
 *      automatically; no further browser interaction is needed.
 *
 * The same identity is used for both Sheets (append rows) and Gmail (send).
 */
export const SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/gmail.send",
];

/** Read a JSON blob from an env var if set, otherwise from a file path. */
async function readJson(envValue: string, filePath: string): Promise<any> {
  const raw = envValue || (await readFile(filePath, "utf8"));
  return JSON.parse(raw);
}

/** Build an OAuth2 client from the downloaded client JSON (no token set yet). */
export async function loadOAuthClient(redirectUri?: string) {
  const raw = await readJson(config.google.clientJson, config.google.clientFile);
  // Console downloads nest the creds under "installed" (Desktop) or "web".
  const creds = raw.installed ?? raw.web ?? raw;
  return new google.auth.OAuth2(
    creds.client_id,
    creds.client_secret,
    redirectUri ?? creds.redirect_uris?.[0],
  );
}

let cachedClient: Awaited<ReturnType<typeof loadOAuthClient>> | null = null;

/** Authenticated client ready to make Sheets/Gmail calls. */
export async function getGoogleAuth() {
  if (cachedClient) return cachedClient;

  const client = await loadOAuthClient();
  let token: Record<string, unknown>;
  try {
    token = await readJson(config.google.tokenJson, config.google.tokenFile);
  } catch {
    throw new Error(
      `No Google token found (set GOOGLE_TOKEN_JSON or create ${config.google.tokenFile}). Run \`npm run auth:google\` first.`,
    );
  }
  client.setCredentials(token);
  cachedClient = client;
  return client;
}
