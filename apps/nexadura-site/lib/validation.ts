import { z } from "zod";

export const leadSchema = z.object({
  formType: z.enum(["contact", "audit"]),
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(180),
  company: z.string().trim().min(2).max(160),
  website: z.string().trim().max(220).optional().or(z.literal("")),
  role: z.string().trim().max(120).optional().or(z.literal("")),
  teamSize: z.enum(["1-5", "6-20", "21-50", "51-200", "200+"]),
  monthlyLeadVolume: z.enum(["0-25", "26-100", "101-500", "500+"]),
  currentStack: z.string().trim().min(2).max(300),
  biggestConstraint: z.string().trim().min(10).max(1200),
  timeline: z.enum(["now", "30-days", "quarter", "exploring"]),
  budget: z.enum(["under-2k", "2k-5k", "5k-15k", "15k+", "unknown"]),
  consent: z.literal(true),
});

export type LeadPayload = z.infer<typeof leadSchema>;