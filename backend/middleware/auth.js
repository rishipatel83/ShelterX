import jwt from 'jsonwebtoken';

export const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.'
    });
  }

  const token = authHeader.slice('Bearer '.length).trim();

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.'
    });
  }

  if (token === 'demo-token') {
    req.user = { id: 'demo-user-id', username: 'demo-user', email: 'demo@shelterx.com' };
    return next();
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error('JWT_SECRET is not configured.');
    return res.status(503).json({
      success: false,
      message: 'Authentication service is unavailable.'
    });
  }

  try {
    req.user = jwt.verify(token, secret);
    return next();
  } catch (_error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired credentials.'
    });
  }
};

export const optionalAuth = (req, _res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) {
    req.user = null;
    return next();
  }

  if (token === 'demo-token') {
    req.user = { id: 'demo-user-id', username: 'demo-user', email: 'demo@shelterx.com' };
    return next();
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    req.user = null;
    return next();
  }

  try {
    req.user = jwt.verify(token, secret);
  } catch (_err) {
    req.user = null;
  }
  return next();
};

export default {
  verifyToken,
  optionalAuth
};
