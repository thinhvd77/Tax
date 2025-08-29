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
      console.log(user)
    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    const status = error instanceof ServiceError && error.status ? error.status : 500;
    res.status(status).json({
      message: error.message || 'Internal server error'
    });
  }
};


module.exports = { login, getCurrentUser };
