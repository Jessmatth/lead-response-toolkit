# Lead Response Toolkit

**Stop letting your leads go cold.** This is the automation that qualifies and responds to every inbound lead in seconds, so no one sits waiting while a competitor gets there first.

> Leads that get a response within 5 minutes are **10x more likely to close** than those contacted an hour later. This toolkit closes that response gap for you, automatically.

You just downloaded the whole thing. Set it up once (about 20 minutes, all on free tiers), point your signup form or ad at it, and every new lead gets an instant, personalized reply while you get a qualified, scored record in your inbox and a spreadsheet.

---

## What it does

The moment someone submits your form, four things happen at once:

1. **Qualifies the lead** — Claude scores it on fit and intent, tiers it `hot / warm / cold / spam`, and recommends how fast to follow up.
2. **Responds instantly** — emails the lead back with a personalized, on-brand message (no more "sorry for the late reply").
3. **Logs it** — appends a row to a Google Sheet so you have a running record.
4. **Alerts you** — sends you an internal note tagged by tier, so you chase the hot ones first.

```
Visitor ──▶ your form ──POST /lead──▶  Express
                                          │
                                          ├─▶ Claude  (qualify + route)
                                          ├─▶ Gmail   (instant reply to the lead)
                                          ├─▶ Google Sheets  (log the lead)
                                          └─▶ Gmail   (alert you, tagged by tier)
```

It ships with a clean, hosted signup page ([public/index.html](public/index.html)), so you don't even need a separate form tool. The whole thing runs as one small app.

## Who this is for

Founders, marketers, and small sales teams who get inbound leads from a form, an ad, or a link and want them handled instantly without paying for a heavy CRM or marketing suite. If you can copy and paste API keys, you can run this.

## What you'll need

All have free tiers:

- An **[Anthropic API key](https://console.anthropic.com)** (powers the AI qualification and reply).
- A **Google account** (Gmail sends the emails, Google Sheets stores the leads).
- **[Node.js 20+](https://nodejs.org)** to run it locally, and a **[Replit](https://replit.com)** account (or any host) to put it online.

---

## Setup

### 1. Install

```bash
npm install
cp .env.example .env   # then fill it in as you go through the steps below
```

### 2. Connect Google (Sheets + Gmail)

A one-time browser sign-in. No Workspace or admin account needed — a normal Gmail works.

1. In [Google Cloud Console](https://console.cloud.google.com), create (or pick) a project and **enable the Google Sheets API and Gmail API** (*APIs & Services → Library*).
2. Open the **OAuth consent screen**, set User Type to **External**, then **Publish the app** (*Publishing status → Publish app*). Publishing keeps your login from expiring after 7 days. You'll click through an "unverified app" notice, which is normal for your own app.
3. Create an **OAuth client ID** (*Credentials → Create credentials → OAuth client ID*), application type **Desktop app**. Download the JSON and save it as `oauth-client.json` in this folder.
4. Run the sign-in. It opens your browser, you approve, and a `token.json` is saved automatically:
   ```bash
   npm run auth:google
   ```
5. Set `GMAIL_SENDER` in `.env` to that same Gmail address (it's the "from" on your emails).
6. Create a Google Sheet (signed in as that account). **Rename the tab to `Leads`** and paste this into row 1:
   ```
   Timestamp  Name  Email  Company  Phone  Message  Score  Tier  Routing  Reasoning  Extra
   ```
   Copy the Sheet ID from its URL (`docs.google.com/spreadsheets/d/`**`THIS_PART`**`/edit`) into `LEADS_SHEET_ID`.

### 3. Add your Anthropic key

Set `ANTHROPIC_API_KEY` in `.env`. The model defaults to `claude-opus-4-8` (override with `CLAUDE_MODEL` if you like).

### 4. Make it yours

- `GITHUB_REPO_URL` — the link every lead receives (point it wherever your offer lives).
- `REPLY_FROM_NAME` — the name your emails are signed with.
- `COMPANY_NAME` / `COMPANY_DESCRIPTION` — a line about what you sell and who your ideal customer is. This tunes the AI's scoring to *your* business.

## Try it locally

```bash
npm run dev        # serves http://localhost:3000
```

Open `http://localhost:3000` to see your form. To send a test lead through the whole pipeline (use your own email so the reply comes to you):

```bash
npm run test:lead you@email.com
```

Want to test just the AI scoring without touching Google? `npm run test:qualify`.

## Put it online (Replit)

The form and the automation run as one Replit deployment.

1. **Import** this repo into Replit (*Create → Import from GitHub*).
2. Open the **Secrets** tab and add your settings. Since `oauth-client.json` and `token.json` stay on your machine (they're never committed), paste their **contents** as secrets instead:
   - `GOOGLE_OAUTH_CLIENT_JSON` = the full contents of `oauth-client.json`
   - `GOOGLE_TOKEN_JSON` = the full contents of `token.json`
   - plus `ANTHROPIC_API_KEY`, `GITHUB_REPO_URL`, `LEADS_SHEET_ID`, `GMAIL_SENDER`, `REPLY_FROM_NAME`, `TEAM_NOTIFY_TO`, `COMPANY_NAME`, `COMPANY_DESCRIPTION`
3. Click **Deploy → Autoscale**. Replit builds and starts it, then hands you a public HTTPS URL.
4. That URL **is** your landing page. Point your ad, post, or link straight at it.

The included `.replit` file already sets the build and run commands, so the deploy just works.

---

## How it's built

Node.js + TypeScript, one small Express app that serves the form and the API.

| Path | What it does |
| --- | --- |
| [public/index.html](public/index.html) | The hosted signup form |
| [src/index.ts](src/index.ts) | Web server: serves the form + handles `POST /lead` |
| [src/pipeline.ts](src/pipeline.ts) | Runs qualify → reply → log → alert |
| [src/services/claude.ts](src/services/claude.ts) | AI qualification + routing |
| [src/services/sheets.ts](src/services/sheets.ts) | Appends the lead row |
| [src/services/gmail.ts](src/services/gmail.ts) | Sends the emails |
| [src/lib/google-auth.ts](src/lib/google-auth.ts) | Google sign-in |
| [src/config.ts](src/config.ts) | Loads and checks your settings |

## Good to know

- **Spam protection:** the public form uses a hidden honeypot field plus rate limiting (5 submissions/minute per IP) to keep bots out.
- **Nothing blocks:** the reply, the log, and the alert run in parallel. If one hiccups, the others still go through, and the error is logged.
- **Email volume:** a free Gmail account sends about 500 emails/day and can flag high-volume identical mail as spam. That's plenty to start. If you scale up, swap the sender in [src/services/gmail.ts](src/services/gmail.ts) to a service like [Resend](https://resend.com) or SendGrid.
- **Your keys stay yours:** `.env`, `token.json`, and `oauth-client.json` are never committed to git.

## License

MIT — use it, change it, ship it.
