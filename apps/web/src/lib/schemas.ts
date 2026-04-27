import { z } from "zod";

// ─── Auth ──────────────────────────────────────────────────────────────────
export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  companyName: z.string().optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export const resetPasswordSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

// ─── Contacts ─────────────────────────────────────────────────────────────
export const workAuthValues = [
  "us_citizen", "green_card", "h1b", "h4_ead", "opt", "cpt", "tn", "l1", "e3", "gc_ead", "other"
] as const;

export const companyTypeValues = ["c2c", "direct", "staffing", "other"] as const;

export const candidateContactSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  phone: z.string().optional(),
  title: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  workAuthorization: z.enum(workAuthValues).optional(),
  profileSummary: z.string().max(500).optional(),
  coverLetter: z.string().max(1000).optional(),
  skills: z.array(z.string()).optional(),
});

export const employerContactSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  companyName: z.string().optional(),
  phone: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  companyType: z.enum(companyTypeValues).optional(),
  industry: z.string().optional(),
});

// ─── Campaigns ─────────────────────────────────────────────────────────────
export const campaignSchema = z.object({
  name: z.string().min(1, "Campaign name is required"),
  subject: z.string().min(1, "Subject line is required"),
  bodyHtml: z.string().min(1, "Email body is required"),
  bodyText: z.string().min(1, "Plain text body is required"),
  targetType: z.enum(["employer", "candidate", "hotlist"]),
  hotlistId: z.string().uuid().optional(),
  targetFilters: z.record(z.unknown()).optional(),
  includeEmployerContacts: z.boolean().default(true),
});

// ─── Hotlists ──────────────────────────────────────────────────────────────
export const hotlistSchema = z.object({
  name: z.string().min(1, "Hotlist name is required"),
  visibleColumns: z.array(z.string()).min(1),
  emailSubject: z.string().optional(),
});

export const hotlistEntrySchema = z.object({
  rawName: z.string().min(1, "Name is required"),
  title: z.string().optional(),
  skills: z.array(z.string()).optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  workAuthorization: z.string().optional(),
  availability: z.string().optional(),
  rateSalary: z.string().optional(),
  profileSummary: z.string().max(300).optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
});

// ─── Public Landing Pages ──────────────────────────────────────────────────
export const employerLeadSchema = z.object({
  email: z.string().email("Valid email required"),
  name: z.string().min(1, "Contact name is required"),
  companyName: z.string().min(1, "Company name is required"),
  phone: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  companyType: z.enum(companyTypeValues).optional(),
  industry: z.string().optional(),
  interestedIn: z.enum(["hotlists", "campaigns", "both"]).optional(),
  consentGiven: z.literal(true, { errorMap: () => ({ message: "You must consent to proceed" }) }),
});

export const candidateLeadSchema = z.object({
  email: z.string().email("Valid email required"),
  name: z.string().min(1, "Full name is required"),
  phone: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  workAuthorization: z.enum(workAuthValues).optional(),
  title: z.string().optional(),
  skillsRaw: z.string().optional(),
  profileSummary: z.string().max(500).optional(),
  coverLetter: z.string().max(1000).optional(),
  consentGiven: z.literal(true, { errorMap: () => ({ message: "You must consent to proceed" }) }),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CampaignInput = z.infer<typeof campaignSchema>;
export type HotlistInput = z.infer<typeof hotlistSchema>;
export type HotlistEntryInput = z.infer<typeof hotlistEntrySchema>;
export type EmployerLeadInput = z.infer<typeof employerLeadSchema>;
export type CandidateLeadInput = z.infer<typeof candidateLeadSchema>;
