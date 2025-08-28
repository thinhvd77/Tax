const { ServiceError, login: loginService, getCurrentUserFromHeader, verifyTokenFromHeader } = require('../services/auth.service');

// Simple authentication for demo purposes (delegates to service)
const login = async (req, res) => {
  try {
    const { userId, password } = req.body;
    const result = await loginService(userId, password);
    res.json({
      message: 'Login successful',
      ...result,
    });
  } catch (error) {
    console.error('Login error:', error);
    const status = error instanceof ServiceError && error.status ? error.status : 500;
    res.status(status).json({
      message: error.message || 'Internal server error'
    });
  }
};

// Get current user info (delegates to service)
const getCurrentUser = async (req, res) => {
  try {
    const user = await getCurrentUserFromHeader(req.headers.authorization);
    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    const status = error instanceof ServiceError && error.status ? error.status : 500;
    res.status(status).json({
      message: error.message || 'Internal server error'
    });
  }
};

// Simple auth middleware (delegates to service)
const authenticateToken = async (req, res, next) => {
  try {
    const user = await verifyTokenFromHeader(req.headers.authorization);
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    const status = error instanceof ServiceError && error.status ? error.status : 401;
    res.status(status).json({
      message: error.message || 'Invalid token'
    });
  }
};

// Role-based access control middleware
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        message: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: 'Insufficient permissions'
      });
    }

    next();
  };
};

module.exports = {
  login,
  getCurrentUser,
  authenticateToken,
  requireRole
};
