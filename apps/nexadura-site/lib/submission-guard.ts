import "server-only";

import { createHash } from "node:crypto";

const rateLimitWindowMs = 10 * 60 * 1000;
const rateLimitMaxAttempts = 5;
const attempts = new Map<string, number[]>();

export type SubmissionMetadata = {
  endpoint: string;
  referrer: string | null;
  userAgent: string | null;
  ipHash: string | null;
};

const getClientIp = (request: Request) => {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return request.headers.get("cf-connecting-ip") || request.headers.get("x-real-ip") || forwardedFor || null;
};

const hashIp = (ip: string | null) => {
  const salt = process.env.LEAD_IP_HASH_SECRET;
  if (!ip || !salt) return null;
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
};

const getClientKey = (request: Request) => {
  const ip = getClientIp(request);
  if (ip) return `ip:${ip}`;

  const userAgent = request.headers.get("user-agent") || "unknown";
  return `ua:${userAgent.slice(0, 160)}`;
};

export const checkSubmissionRateLimit = (request: Request) => {
  const now = Date.now();
  const cutoff = now - rateLimitWindowMs;
  const key = getClientKey(request);
  const recentAttempts = (attempts.get(key) || []).filter((timestamp) => timestamp > cutoff);

  recentAttempts.push(now);
  attempts.set(key, recentAttempts);

  if (attempts.size > 500) {
    for (const [candidateKey, timestamps] of attempts) {
      const active = timestamps.filter((timestamp) => timestamp > cutoff);
      if (active.length === 0) attempts.delete(candidateKey);
      else attempts.set(candidateKey, active);
    }
  }

  if (recentAttempts.length <= rateLimitMaxAttempts) {
    return { limited: false as const };
  }

  const retryAfterMs = recentAttempts[0] + rateLimitWindowMs - now;
  return {
    limited: true as const,
    retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)),
  };
};

export const getSubmissionMetadata = (request: Request, endpoint: string): SubmissionMetadata => ({
  endpoint,
  referrer: request.headers.get("referer"),
  userAgent: request.headers.get("user-agent"),
  ipHash: hashIp(getClientIp(request)),
});
