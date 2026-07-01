# Lead Response Automater

A lead-magnet capture page + automation that responds to every signup end to end:

1. **Capture** — a clean hosted form (`public/index.html`) collects name, email,
   company, and their biggest lead-gen challenge.
2. **AI qualify & route** — Claude scores the lead (fit + intent), tiers it
   `hot / warm / cold / spam`, and decides who should follow up.
3. **Deliver** — emails the lead your download link (a fixed template, so the
   link is always correct) with a personalized opening line from Claude.
4. **Log to Google Sheets** — every lead is appended as a row.
5. **Notify you** — an internal email tagged by tier so you chase the best leads.

```
Visitor ──▶ GET /  (form) ──POST /lead──▶  Express
                                              │
                                              ├─▶ Claude  (qualify + route + intro line)
                                              ├─▶ Gmail   (deliver download link to lead)
                                              ├─▶ Google Sheets  (append row)
                                              └─▶ Gmail   (notify you)
```

## Stack

- Node.js + TypeScript, Express (serves both the form page and the API)
- `@anthropic-ai/sdk` (Claude) — qualification + intro line in one structured call
- `googleapis` — Sheets append + Gmail send (personal-Gmail OAuth)
- `express-rate-limit` + a honeypot field — basic abuse protection on the public form

## Setup

### 1. Install

```bash
npm install
cp .env.example .env   # then fill it in
```

### 2. Google OAuth (Sheets + Gmail, personal Gmail)

One-time browser consent flow — no Workspace/admin needed.

1. In [Google Cloud Console](https://console.cloud.google.com), create (or pick)
   a project and **enable the Google Sheets API and Gmail API**
   (*APIs & Services → Library*).
2. Configure the **OAuth consent screen**: User Type **External**. Then
   **Publish the app** (*Publishing status → Publish app*) so tokens don't expire
   after 7 days — you'll click through an "unverified app" notice, which is
   expected for your own app.
3. Create an **OAuth client ID** (*Credentials → Create credentials → OAuth
   client ID*), application type **Desktop app**. Download the JSON and save it
   as `./oauth-client.json` (git-ignored).
4. Run the consent flow — opens your browser, you approve, a refresh token is
   saved to `./token.json`:
   ```bash
   npm run auth:google
   ```
5. Set `GMAIL_SENDER` to that same Gmail address (the From on outgoing mail).
6. Create the leads Sheet (signed in as that Gmail account). **Rename the tab to
   `Leads`** and put this header in row 1:
   ```
   Timestamp  Name  Email  Company  Phone  Message  Score  Tier  Routing  Reasoning  Extra
   ```
   Put the Sheet ID (from its URL) in `LEADS_SHEET_ID`.

### 3. Anthropic

Set `ANTHROPIC_API_KEY`. Model defaults to `claude-opus-4-8` (override with
`CLAUDE_MODEL`).

### 4. Magnet + business context

- `GITHUB_REPO_URL` — the link every lead receives.
- `COMPANY_NAME` / `COMPANY_DESCRIPTION` — feed the qualification prompt so
  scoring matches *your* ideal customer.

## Run locally

```bash
npm run dev        # watch mode, serves http://localhost:3000
```

Open `http://localhost:3000` to see the form, or fire a test submission
(server must be running) — pass your own email so the delivery email comes to
you:

```bash
npm run test:lead you@email.com
```

Test just the AI step (no Google needed):

```bash
npm run test:qualify
```

## Deploy to Replit

The whole thing (form + API) runs as one Replit Autoscale deployment.

1. **Import** this GitHub repo into Replit (*Create → Import from GitHub*).
2. In the **Secrets** tab, add your env vars. Because `oauth-client.json` and
   `token.json` are git-ignored (not in the repo), paste their **contents** as
   secrets instead of uploading files:
   - `GOOGLE_OAUTH_CLIENT_JSON` = the full contents of `oauth-client.json`
   - `GOOGLE_TOKEN_JSON` = the full contents of `token.json`
   - plus `ANTHROPIC_API_KEY`, `GITHUB_REPO_URL`, `LEADS_SHEET_ID`,
     `GMAIL_SENDER`, `REPLY_FROM_NAME`, `TEAM_NOTIFY_TO`, `COMPANY_NAME`,
     `COMPANY_DESCRIPTION`
3. Click **Deploy** → **Autoscale**. Replit runs `npm run build` then
   `npm start`, and gives you a public HTTPS URL.
4. That URL **is** your landing page. Point your X/social link straight at it.

> `.replit` already declares the build/run commands and the port, so the
> deployment picks them up automatically.

## Project layout

| Path | Purpose |
| --- | --- |
| [public/index.html](public/index.html) | The hosted capture form |
| [src/index.ts](src/index.ts) | Express server: serves the form + `POST /lead` |
| [src/pipeline.ts](src/pipeline.ts) | Orchestrates qualify → deliver → log → notify |
| [src/services/claude.ts](src/services/claude.ts) | AI qualify + intro line |
| [src/services/sheets.ts](src/services/sheets.ts) | Append lead row |
| [src/services/gmail.ts](src/services/gmail.ts) | Send email (delivery + notice) |
| [src/lib/google-auth.ts](src/lib/google-auth.ts) | Shared Google OAuth |
| [src/config.ts](src/config.ts) | Env loading + validation |

## Notes

- The public form is protected by a honeypot field + rate limiting (5/min/IP).
  The delivery link is gated behind a valid email, not secret — the repo is
  public anyway.
- Steps run concurrently; if one fails the others still complete and the failure
  is logged per-lead.
- **Deliverability:** free Gmail caps around ~500 sends/day and can flag bulk
  identical mail as spam. Fine to launch; if volume grows, switch the sender in
  [src/services/gmail.ts](src/services/gmail.ts) to a transactional provider
  (Resend, SendGrid).
