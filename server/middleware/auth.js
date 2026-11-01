import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'retail-khata-production-jwt-secret-key-2026';

export const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      shop_name: user.shop_name,
      role: user.role || 'owner'
    },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
};

export const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. Please sign in.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Session expired or invalid token. Please log in again.' });
  }
};

export const requireRole = (allowedRoles = ['owner']) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied: Insufficient privileges.' });
    }
    next();
  };
};
