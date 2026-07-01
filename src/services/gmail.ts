import { google } from "googleapis";
import { config } from "../config.js";
import { getGoogleAuth } from "../lib/google-auth.js";

export interface SendArgs {
  to: string[];
  subject: string;
  body: string;
  replyTo?: string;
}

/** Encode an RFC 2822 message as base64url for the Gmail API. */
function buildRawMessage({ to, subject, body, replyTo }: SendArgs): string {
  const fromName = config.reply.fromName;
  const from = `${fromName} <${config.google.gmailSender}>`;

  const headers = [
    `From: ${from}`,
    `To: ${to.join(", ")}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
  ];
  if (replyTo) headers.push(`Reply-To: ${replyTo}`);

  const message = `${headers.join("\r\n")}\r\n\r\n${body}`;
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
