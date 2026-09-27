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
