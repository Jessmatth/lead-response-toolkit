import { google } from "googleapis";
import { config } from "../config.js";
import { getGoogleAuth } from "../lib/google-auth.js";

export interface SendArgs {
  to: string[];
  subject: string;
  body: string;
  replyTo?: string;
}

/** Strip CR/LF so a value can't smuggle extra headers (header injection). */
function sanitizeHeader(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

/**
 * RFC 2047 encoded-word for any header value with non-ASCII characters
 * (emoji, accented letters). Pure-ASCII values pass through unchanged.
 * Without this, emoji in a Subject render as garbled bytes (Ã°ÂŸÂ'Â‡).
 */
function encodeHeaderWord(value: string): string {
  const clean = sanitizeHeader(value);
  if (/^[\x00-\x7F]*$/.test(clean)) return clean;
  return `=?UTF-8?B?${Buffer.from(clean, "utf8").toString("base64")}?=`;
}

/** Encode an RFC 2822 message as base64url for the Gmail API. */
function buildRawMessage({ to, subject, body, replyTo }: SendArgs): string {
  const from = `${encodeHeaderWord(config.reply.fromName)} <${config.google.gmailSender}>`;

  const headers = [
    `From: ${from}`,
    `To: ${to.map(sanitizeHeader).join(", ")}`,
    `Subject: ${encodeHeaderWord(subject)}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
  ];
  if (replyTo) headers.push(`Reply-To: ${sanitizeHeader(replyTo)}`);

  // Base64-encode the body (wrapped at 76 chars per RFC 2045) so non-ASCII in
  // the body — accented names, emoji greetings — also renders correctly.
  const encodedBody = Buffer.from(body, "utf8")
    .toString("base64")
    .replace(/(.{76})/g, "$1\r\n");

  const message = `${headers.join("\r\n")}\r\n\r\n${encodedBody}`;
  return Buffer.from(message)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** Send a plain-text email via the Gmail API as the authorized sender. */
export async function sendEmail(args: SendArgs): Promise<void> {
  const auth = await getGoogleAuth();
  const gmail = google.gmail({ version: "v1", auth });
  await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw: buildRawMessage(args) },
  });
}
