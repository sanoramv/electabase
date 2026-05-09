import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

let ratelimit: Ratelimit | null = null;

function getRatelimit(): Ratelimit {
  if (!ratelimit) {
    ratelimit = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(5, "1 h"),
      analytics: false,
      prefix: "electabase:corrections",
    });
  }
  return ratelimit;
}

export async function checkCorrectionRateLimit(
  ip: string
): Promise<{ allowed: boolean; remaining: number; reset: Date }> {
  const { success, remaining, reset } = await getRatelimit().limit(ip);
  return { allowed: success, remaining, reset: new Date(reset) };
}
