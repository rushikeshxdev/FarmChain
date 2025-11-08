const jwt = require('jsonwebtoken');
const logger = require('../config/logger');

// Verify JWT Token
const authenticate = (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        status: 'error',
        message: 'No token provided. Authorization denied.'
      });
    }

    // Extract token
    const token = authHeader.split(' ')[1];

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user info to request
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      name: decoded.name
    };

    next();
  } catch (error) {
    logger.error('Authentication error:', error.message);

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        status: 'error',
        message: 'Token expired. Please login again.'
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid token. Authorization denied.'
      });
    }

    return res.status(500).json({
      status: 'error',
      message: 'Authentication failed.'
    });
  }
};

// Role-based Authorization Middleware
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'User not authenticated'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: `Access denied. Required role: ${allowedRoles.join(' or ')}`
      });
    }

    next();
  };
};

// Optional Authentication (for public routes that can benefit from auth)
const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      req.user = {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role,
        name: decoded.name
      };
    }

    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

// Middleware to restrict access to owner or admin
const restrictToOwnerOrAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      status: 'error',
      message: 'User not authenticated'
    });
  }
  
  const requestedUserId = parseInt(req.params.id);
  if (req.user.role === 'admin' || req.user.userId === requestedUserId) {
    return next();
  }
  
  return res.status(403).json({
    status: 'error',
    message: 'Access denied. You can only access your own resources.'
  });
};

module.exports = {
  authenticate,
  authorize,
  optionalAuth,
  // Aliases for route compatibility
  protect: authenticate,
  restrictTo: authorize,
  restrictToOwnerOrAdmin
};
