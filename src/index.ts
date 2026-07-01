import path from "node:path";
import express, { type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import { config } from "./config.js";
import { FormSubmissionSchema, type Lead } from "./types.js";
import { processLead } from "./pipeline.js";

const app = express();
app.set("trust proxy", 1); // behind Replit/host proxy, so req.ip is real
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve the landing/form page and any static assets from /public.
// npm scripts always run from the project root, so cwd is stable.
app.use(express.static(path.join(process.cwd(), "public")));

app.get("/health", (_req: Request, res: Response) => {
  res.json({ ok: true });
});

// Throttle the public endpoint: max 5 submissions/minute per IP.
const limiter = rateLimit({
  windowMs: 60_000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: "Too many requests — please try again in a minute." },
});

app.post("/lead", limiter, async (req: Request, res: Response) => {
  // Honeypot: real users never fill the hidden `website` field. If it's set,
  // quietly pretend success so bots don't learn they were filtered.
  if (typeof req.body?.website === "string" && req.body.website.trim() !== "") {
    return res.status(200).json({ ok: true });
  }

  const parsed = FormSubmissionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ ok: false, error: "Please check your details and try again." });
  }
  const sub = parsed.data;

  const lead: Lead = {
    name: sub.name,
    email: sub.email,
    company: sub.company,
    phone: "",
    message: sub.challenge,
    extra: {
      source: "lead-magnet-form",
      ...(typeof req.body.utm_source === "string" ? { utm_source: req.body.utm_source } : {}),
      ...(typeof req.body.utm_campaign === "string"
        ? { utm_campaign: req.body.utm_campaign }
        : {}),
    },
  };

  // Acknowledge fast; deliver the magnet + log + notify in the background.
  res.status(202).json({ ok: true });

  processLead(lead)
    .then((q) => console.log(`[lead] ${lead.email} → ${q.tier} (${q.score}) · ${q.routing}`))
    .catch((err) => console.error(`[lead] FAILED for ${lead.email}:`, err.message));
});

app.listen(config.port, () => {
  console.log(`Lead Response Automater listening on :${config.port}`);
  console.log(`  GET  /            landing + form`);
  console.log(`  POST /lead        public form submissions`);
  console.log(`  GET  /health`);
});
