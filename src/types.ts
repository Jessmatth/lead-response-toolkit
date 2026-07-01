import { z } from "zod";

/**
 * Public lead-magnet form submission. `website` is a honeypot: it's hidden
 * from real users via CSS, so if it's filled in, the submission is a bot.
 */
export const FormSubmissionSchema = z.object({
  name: z.string().trim().min(1, "name is required").max(120),
  email: z.string().trim().email("a valid email is required").max(200),
  company: z.string().trim().max(160).optional().default(""),
  // "What's your biggest lead-generation challenge?" — free text we qualify on.
  challenge: z.string().trim().max(2000).optional().default(""),
  // Honeypot — must be empty.
  website: z.string().max(0).optional().default(""),
});

export type FormSubmission = z.infer<typeof FormSubmissionSchema>;

/** Normalized lead used internally by the pipeline. */
export interface Lead {
  name: string;
  email: string;
  company: string;
  phone: string;
  message: string;
  extra: Record<string, unknown>;
}

export type LeadTier = "hot" | "warm" | "cold" | "spam";

/** Structured result the AI returns for each lead. */
export interface Qualification {
  /** 0–100 fit/intent score. */
  score: number;
  tier: LeadTier;
  /** Short rationale a salesperson can skim. */
  reasoning: string;
  /** Where this lead should go, e.g. "Founder — DM within 24h". */
  routing: string;
}
