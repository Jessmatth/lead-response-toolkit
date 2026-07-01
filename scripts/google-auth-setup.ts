/**
 * One-time Google OAuth consent flow for a personal Gmail account.
 *
 *   npm run auth:google
 *
 * Opens your browser, you approve Sheets + Gmail access, and the resulting
 * refresh token is saved to GOOGLE_TOKEN_FILE (default ./token.json).
 * Run this once; the app reuses the token afterward.
 */
import "dotenv/config";
import http from "node:http";
import { exec } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { config } from "../src/config.js";
import { loadOAuthClient, SCOPES } from "../src/lib/google-auth.js";

const PORT = 5555;
const REDIRECT_URI = `http://localhost:${PORT}`;

const oauth2 = await loadOAuthClient(REDIRECT_URI);

const authUrl = oauth2.generateAuthUrl({
  access_type: "offline", // ask for a refresh token
  prompt: "consent", // force the consent screen so a refresh token is returned
  scope: SCOPES,
});

console.log("\nOpening your browser to authorize Google access...");
console.log("If it doesn't open, paste this URL manually:\n");
console.log(authUrl, "\n");
exec(`open "${authUrl}"`); // macOS

// Catch the redirect from Google on the loopback address.
const code = await new Promise<string>((resolve, reject) => {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? "/", REDIRECT_URI);
    const c = url.searchParams.get("code");
    if (c) {
      res.end("✅ Authorization complete. You can close this tab and return to the terminal.");
      server.close();
      resolve(c);
    } else if (url.searchParams.get("error")) {
      res.end("Authorization failed.");
      server.close();
      reject(new Error(url.searchParams.get("error") ?? "unknown error"));
    } else {
      res.end("Waiting for authorization code...");
    }
  });
  server.listen(PORT, () => console.log(`Listening for the redirect on ${REDIRECT_URI} ...`));
});

const { tokens } = await oauth2.getToken(code);

if (!tokens.refresh_token) {
  console.warn(
    "\n⚠️  No refresh token returned. Revoke prior access at",
    "https://myaccount.google.com/permissions and run this again.",
  );
}

await writeFile(config.google.tokenFile, JSON.stringify(tokens, null, 2));
console.log(`\n✅ Saved Google token to ${config.google.tokenFile}`);
console.log("You're all set — the app can now use Sheets and Gmail.\n");
process.exit(0);
