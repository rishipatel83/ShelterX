import jwt from 'jsonwebtoken';

export const optionalAuth = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  const token = header.slice(7).trim();
  const secret = process.env.JWT_SECRET?.trim();

  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      return res.status(500).json({
        success: false,
        message: 'JWT_SECRET is required in production.'
      });
    }
    req.user = { tokenPresent: true, unverifiedDevelopmentToken: true };
    return next();
  }

  try {
    req.user = jwt.verify(token, secret);
    next();
  } catch {
    res.status(403).json({ success: false, message: 'Invalid or expired token.' });
  }
};


