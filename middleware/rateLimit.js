const buckets = new Map();

const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [key, value] of buckets.entries()) {
    if (value.resetAt <= now) buckets.delete(key);
  }
}, 10 * 60 * 1000);

cleanupInterval.unref?.();

export const createRateLimit = ({
  windowMs,
  max,
  keyPrefix = 'global'
}) => {
  return (req, res, next) => {
    const now = Date.now();
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    const key = `${keyPrefix}:${ip}`;

    const existing = buckets.get(key);
    if (!existing || existing.resetAt <= now) {
      buckets.set(key, {
        count: 1,
        resetAt: now + windowMs
      });
      return next();
    }

    existing.count += 1;

    if (existing.count > max) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((existing.resetAt - now) / 1000)
      );

      res.setHeader('Retry-After', String(retryAfterSeconds));
      return res.status(429).json({
        success: false,
        message: 'Too many requests. Please try again later.'
      });
    }

    return next();
  };
};
