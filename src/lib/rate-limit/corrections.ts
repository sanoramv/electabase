import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, "1 h"),
  analytics: false,
  prefix: "electabase:corrections",
});

export async function checkCorrectionRateLimit(
  ip: string
): Promise<{ allowed: boolean; remaining: number; reset: Date }> {
  const { success, remaining, reset } = await ratelimit.limit(ip);
  return { allowed: success, remaining, reset: new Date(reset) };
}
